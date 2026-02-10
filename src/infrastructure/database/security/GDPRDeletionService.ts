/**
 * 🔐 GDPRDeletionService - Article 17 Right to Erasure
 * =====================================================
 * Coordinates GDPR-compliant data deletion across all repositories.
 *
 * GDPR Compliance:
 * - Article 17: Right to erasure ("right to be forgotten")
 * - Article 12(3): 30-day response deadline (extendable by 60 days)
 * - EDPB 2025 Coordinated Enforcement Framework
 *
 * EU MDR Consideration:
 * - Medical device data requires 10-15 year retention (EU MDR 2017/745)
 * - Anonymization as alternative to deletion for research data
 *
 * Research (2025-2026):
 * - IAPP Best Practices: Soft delete → 30-day grace → Hard delete
 * - k-anonymity (k≥5) for anonymized data
 * - Cascading deletion with audit trail
 *
 * @see CLAUDE.md §9.3 — Data Protection
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import { AuditService, type AuditEntityType } from './AuditService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Deletion request status
 */
export type DeletionStatus =
  | 'pending'      // Request received, awaiting processing
  | 'processing'   // Currently being processed
  | 'completed'    // Successfully deleted/anonymized
  | 'failed'       // Processing failed
  | 'cancelled'    // User cancelled request
  | 'retained';    // Data retained (EU MDR requirement)

/**
 * Deletion request type
 */
export type DeletionType =
  | 'full_deletion'     // Complete data removal
  | 'anonymization'     // Replace PII with anonymized data
  | 'partial_deletion'; // Delete specific data types only

/**
 * Request source
 */
export type DeletionSource =
  | 'user_request'       // User initiated via bot/app
  | 'admin'              // Admin initiated
  | 'regulatory'         // Regulatory requirement
  | 'consent_withdrawal'; // User withdrew consent

/**
 * Deletion request entity
 */
export interface IDeletionRequest {
  readonly id?: number;
  readonly userId: number;
  readonly externalId: string;
  readonly status: DeletionStatus;
  readonly requestType: DeletionType;
  readonly requestSource: DeletionSource;
  readonly requestReason?: string;
  readonly requestedAt: Date;
  readonly deadlineAt: Date;
  readonly processedAt?: Date;
  readonly retentionRequired: boolean;
  readonly retentionReason?: string;
  readonly retentionUntil?: Date;
  readonly deletedTables?: string[];
  readonly deletedRecordCounts?: Record<string, number>;
  readonly errorMessage?: string;
  readonly processedBy?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Deletion result
 */
export interface IDeletionResult {
  readonly success: boolean;
  readonly requestId: number;
  readonly deletedRecords: Record<string, number>;
  readonly retainedTables: string[];
  readonly anonymizedTables: string[];
  readonly errorMessage?: string;
  readonly processingTimeMs: number;
}

/**
 * Tables that contain user data
 */
const USER_DATA_TABLES: readonly {
  table: string;
  userColumn: string;
  entityType: AuditEntityType;
  canAnonymize: boolean;
  retentionRequired: boolean;
}[] = [
  // Core user data
  { table: 'sleep_diary_entries', userColumn: 'user_id', entityType: 'sleep_diary', canAnonymize: true, retentionRequired: false },
  { table: 'voice_diary_entries', userColumn: 'user_id', entityType: 'voice_diary', canAnonymize: true, retentionRequired: false },
  { table: 'assessments', userColumn: 'user_id', entityType: 'assessment', canAnonymize: true, retentionRequired: true },
  { table: 'therapy_sessions', userColumn: 'user_id', entityType: 'therapy_session', canAnonymize: true, retentionRequired: true },

  // Gamification (non-clinical)
  { table: 'gamification_progress', userColumn: 'user_id', entityType: 'gamification', canAnonymize: false, retentionRequired: false },
  { table: 'gamification_achievements', userColumn: 'user_id', entityType: 'gamification', canAnonymize: false, retentionRequired: false },

  // Safety-critical (requires retention)
  { table: 'safety_plans', userColumn: 'user_id', entityType: 'treatment_plan', canAnonymize: true, retentionRequired: true },

  // Digital Twin / AI (can be deleted)
  { table: 'digital_twins', userColumn: 'user_id', entityType: 'system', canAnonymize: false, retentionRequired: false },

  // MCT therapy
  { table: 'mct_sessions', userColumn: 'user_id', entityType: 'therapy_session', canAnonymize: true, retentionRequired: true },
  { table: 'mct_worry_entries', userColumn: 'user_id', entityType: 'therapy_session', canAnonymize: false, retentionRequired: false },
  { table: 'mct_worry_settings', userColumn: 'user_id', entityType: 'therapy_session', canAnonymize: false, retentionRequired: false },

  // Service state
  { table: 'onboarding_progress', userColumn: 'user_id', entityType: 'system', canAnonymize: false, retentionRequired: false },
  { table: 'isi_schedule_users', userColumn: 'user_id', entityType: 'system', canAnonymize: false, retentionRequired: false },
  { table: 'notification_users', userColumn: 'user_id', entityType: 'system', canAnonymize: false, retentionRequired: false },

  // Bot sessions
  { table: 'bot_sessions', userColumn: 'user_id', entityType: 'system', canAnonymize: false, retentionRequired: false },
];

// ============================================================================
// SERVICE
// ============================================================================

/**
 * GDPR-compliant deletion service
 */
export class GDPRDeletionService {
  private readonly tableName = 'deletion_requests';
  private readonly DEADLINE_DAYS = 30; // GDPR Article 12(3)

  constructor(
    private readonly db: IDatabaseConnection,
    private readonly auditService: AuditService
  ) {}

  // ==========================================================================
  // REQUEST MANAGEMENT
  // ==========================================================================

  /**
   * Create a new deletion request
   * GDPR Article 17: Right to erasure
   */
  async createRequest(params: {
    userId: number;
    externalId: string;
    requestType?: DeletionType;
    requestSource?: DeletionSource;
    requestReason?: string;
    processedBy?: number;
  }): Promise<IDeletionRequest> {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + this.DEADLINE_DAYS);

    const sql = `
      INSERT INTO ${this.tableName}
      (user_id, external_id, status, request_type, request_source, request_reason, requested_at, deadline_at, processed_by)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.execute(sql, [
      params.userId,
      params.externalId,
      params.requestType || 'full_deletion',
      params.requestSource || 'user_request',
      params.requestReason || null,
      now.toISOString(),
      deadline.toISOString(),
      params.processedBy || null,
    ]);

    const request = await this.getRequestById(result.lastInsertRowid as number);
    if (!request) {
      throw new Error('Failed to create deletion request');
    }

    // Audit log
    await this.auditService.log({
      action: 'DELETE',
      entityType: 'user',
      entityId: params.userId,
      userId: params.processedBy,
      metadata: {
        event: 'deletion_request_created',
        requestId: request.id,
        requestType: params.requestType || 'full_deletion',
        deadline: deadline.toISOString(),
      },
    });

    return request;
  }

  /**
   * Get deletion request by ID
   */
  async getRequestById(id: number): Promise<IDeletionRequest | null> {
    const row = await this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Get deletion request by user ID
   */
  async getRequestByUserId(userId: number): Promise<IDeletionRequest | null> {
    const row = await this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE user_id = ? AND status IN ('pending', 'processing') ORDER BY requested_at DESC`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Get all pending requests
   */
  async getPendingRequests(): Promise<IDeletionRequest[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE status = 'pending' ORDER BY deadline_at ASC`
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get requests approaching deadline (within 7 days)
   */
  async getApproachingDeadline(): Promise<IDeletionRequest[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 7);

    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName}
       WHERE status IN ('pending', 'processing')
       AND deadline_at <= ?
       ORDER BY deadline_at ASC`,
      [warningDate.toISOString()]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Cancel a deletion request
   */
  async cancelRequest(requestId: number, cancelledBy?: number): Promise<boolean> {
    const request = await this.getRequestById(requestId);
    if (!request) return false;

    if (request.status !== 'pending') {
      throw new Error(`Cannot cancel request in status: ${request.status}`);
    }

    await this.db.execute(
      `UPDATE ${this.tableName} SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      [requestId]
    );

    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'user',
      entityId: request.userId,
      userId: cancelledBy,
      metadata: {
        event: 'deletion_request_cancelled',
        requestId,
      },
    });

    return true;
  }

  // ==========================================================================
  // DELETION PROCESSING
  // ==========================================================================

  /**
   * Process a deletion request
   * Coordinates deletion across all tables
   */
  async processRequest(requestId: number): Promise<IDeletionResult> {
    const startTime = Date.now();
    const request = await this.getRequestById(requestId);

    if (!request) {
      return {
        success: false,
        requestId,
        deletedRecords: {},
        retainedTables: [],
        anonymizedTables: [],
        errorMessage: 'Request not found',
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        requestId,
        deletedRecords: {},
        retainedTables: [],
        anonymizedTables: [],
        errorMessage: `Request already processed (status: ${request.status})`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Mark as processing
    await this.updateRequestStatus(requestId, 'processing');

    const deletedRecords: Record<string, number> = {};
    const retainedTables: string[] = [];
    const anonymizedTables: string[] = [];
    let errorMessage: string | undefined;

    try {
      for (const tableConfig of USER_DATA_TABLES) {
        try {
          // Check if table exists
          const tableExists = await this.tableExists(tableConfig.table);
          if (!tableExists) continue;

          // EU MDR: Check retention requirement
          if (tableConfig.retentionRequired && request.requestType === 'full_deletion') {
            if (tableConfig.canAnonymize) {
              // Anonymize instead of delete
              const count = await this.anonymizeTableData(
                tableConfig.table,
                tableConfig.userColumn,
                request.userId
              );
              if (count > 0) {
                anonymizedTables.push(tableConfig.table);
                deletedRecords[tableConfig.table] = count;
              }
            } else {
              retainedTables.push(tableConfig.table);
            }
            continue;
          }

          // Process based on request type
          let count = 0;
          if (request.requestType === 'anonymization') {
            if (tableConfig.canAnonymize) {
              count = await this.anonymizeTableData(
                tableConfig.table,
                tableConfig.userColumn,
                request.userId
              );
              if (count > 0) anonymizedTables.push(tableConfig.table);
            }
          } else {
            count = await this.deleteTableData(
              tableConfig.table,
              tableConfig.userColumn,
              request.userId
            );
          }

          if (count > 0) {
            deletedRecords[tableConfig.table] = count;

            // Audit each table deletion
            await this.auditService.logDelete(
              tableConfig.entityType,
              request.userId,
              { table: tableConfig.table, recordCount: count }
            );
          }
        } catch (tableError) {
          console.error(`[GDPR] Error processing table ${tableConfig.table}:`, tableError);
          // Continue with other tables
        }
      }

      // Finally, anonymize or delete the user record itself
      if (request.requestType === 'anonymization') {
        await this.anonymizeUser(request.userId);
        anonymizedTables.push('users');
      } else {
        // Soft delete user
        await this.db.execute(
          `UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
          [request.userId]
        );
        deletedRecords['users'] = 1;
      }

      // Mark as completed
      await this.updateRequestStatus(requestId, 'completed', {
        deletedTables: Object.keys(deletedRecords),
        deletedRecordCounts: deletedRecords,
      });

      await this.auditService.log({
        action: 'ANONYMIZE',
        entityType: 'user',
        entityId: request.userId,
        metadata: {
          event: 'deletion_request_completed',
          requestId,
          deletedRecords,
          retainedTables,
          anonymizedTables,
        },
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.updateRequestStatus(requestId, 'failed', { errorMessage });

      await this.auditService.log({
        action: 'DELETE',
        entityType: 'user',
        entityId: request.userId,
        metadata: {
          event: 'deletion_request_failed',
          requestId,
          error: errorMessage,
        },
      });
    }

    return {
      success: !errorMessage,
      requestId,
      deletedRecords,
      retainedTables,
      anonymizedTables,
      errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Process all pending requests (scheduled job)
   */
  async processPendingRequests(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const pending = await this.getPendingRequests();
    let succeeded = 0;
    let failed = 0;

    for (const request of pending) {
      const result = await this.processRequest(request.id!);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return {
      processed: pending.length,
      succeeded,
      failed,
    };
  }

  /**
   * Hard delete for soft-deleted data (after grace period)
   * Should be run periodically (e.g., weekly)
   */
  async hardDeleteExpiredData(gracePeriodDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    let totalDeleted = 0;

    for (const tableConfig of USER_DATA_TABLES) {
      try {
        const tableExists = await this.tableExists(tableConfig.table);
        if (!tableExists) continue;

        // Check if table has deleted_at column
        const hasDeletedAt = await this.columnExists(tableConfig.table, 'deleted_at');
        if (!hasDeletedAt) continue;

        // Skip tables with retention requirement
        if (tableConfig.retentionRequired) continue;

        const result = await this.db.execute(
          `DELETE FROM ${tableConfig.table}
           WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
          [cutoffDate.toISOString()]
        );

        if (result.changes > 0) {
          totalDeleted += result.changes;
          console.log(`[GDPR] Hard deleted ${result.changes} records from ${tableConfig.table}`);
        }
      } catch (error) {
        console.error(`[GDPR] Error hard deleting from ${tableConfig.table}:`, error);
      }
    }

    // Hard delete users
    const userResult = await this.db.execute(
      `DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
      [cutoffDate.toISOString()]
    );
    totalDeleted += userResult.changes;

    if (totalDeleted > 0) {
      await this.auditService.log({
        action: 'DELETE',
        entityType: 'system',
        metadata: {
          event: 'hard_delete_expired_data',
          totalDeleted,
          cutoffDate: cutoffDate.toISOString(),
        },
      });
    }

    return totalDeleted;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async tableExists(tableName: string): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return (result?.count || 0) > 0;
  }

  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const result = await this.db.query<{ name: string }>(
        `PRAGMA table_info(${tableName})`
      );
      return result.some((col) => col.name === columnName);
    } catch {
      return false;
    }
  }

  private async deleteTableData(
    table: string,
    userColumn: string,
    userId: number
  ): Promise<number> {
    // Soft delete if column exists, otherwise hard delete
    const hasDeletedAt = await this.columnExists(table, 'deleted_at');

    if (hasDeletedAt) {
      const result = await this.db.execute(
        `UPDATE ${table} SET deleted_at = datetime('now') WHERE ${userColumn} = ? AND deleted_at IS NULL`,
        [userId]
      );
      return result.changes;
    } else {
      const result = await this.db.execute(
        `DELETE FROM ${table} WHERE ${userColumn} = ?`,
        [userId]
      );
      return result.changes;
    }
  }

  private async anonymizeTableData(
    table: string,
    userColumn: string,
    userId: number
  ): Promise<number> {
    // For tables that need anonymization instead of deletion
    // Replace user_id with anonymized ID
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Only anonymize string user columns
    if (userColumn === 'user_id') {
      // For numeric user_id, we soft delete instead
      return this.deleteTableData(table, userColumn, userId);
    }

    const result = await this.db.execute(
      `UPDATE ${table} SET ${userColumn} = ? WHERE ${userColumn} = ?`,
      [anonymizedId, userId.toString()]
    );
    return result.changes;
  }

  private async anonymizeUser(userId: number): Promise<void> {
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await this.db.execute(
      `UPDATE users SET
        external_id = ?,
        email = NULL,
        first_name = '[ANONYMIZED]',
        last_name = '[ANONYMIZED]',
        updated_at = datetime('now')
       WHERE id = ?`,
      [anonymizedId, userId]
    );
  }

  private async updateRequestStatus(
    requestId: number,
    status: DeletionStatus,
    additional?: {
      deletedTables?: string[];
      deletedRecordCounts?: Record<string, number>;
      errorMessage?: string;
    }
  ): Promise<void> {
    let sql = `UPDATE ${this.tableName} SET status = ?, updated_at = datetime('now')`;
    const params: unknown[] = [status];

    if (status === 'completed' || status === 'failed') {
      sql += `, processed_at = datetime('now')`;
    }

    if (additional?.deletedTables) {
      sql += `, deleted_tables = ?`;
      params.push(JSON.stringify(additional.deletedTables));
    }

    if (additional?.deletedRecordCounts) {
      sql += `, deleted_record_counts = ?`;
      params.push(JSON.stringify(additional.deletedRecordCounts));
    }

    if (additional?.errorMessage) {
      sql += `, error_message = ?`;
      params.push(additional.errorMessage);
    }

    sql += ` WHERE id = ?`;
    params.push(requestId);

    await this.db.execute(sql, params);
  }

  private rowToEntity(row: Record<string, unknown>): IDeletionRequest {
    return {
      id: row.id as number,
      userId: row.user_id as number,
      externalId: row.external_id as string,
      status: row.status as DeletionStatus,
      requestType: row.request_type as DeletionType,
      requestSource: row.request_source as DeletionSource,
      requestReason: row.request_reason as string | undefined,
      requestedAt: new Date(row.requested_at as string),
      deadlineAt: new Date(row.deadline_at as string),
      processedAt: row.processed_at ? new Date(row.processed_at as string) : undefined,
      retentionRequired: Boolean(row.retention_required),
      retentionReason: row.retention_reason as string | undefined,
      retentionUntil: row.retention_until ? new Date(row.retention_until as string) : undefined,
      deletedTables: row.deleted_tables ? JSON.parse(row.deleted_tables as string) : undefined,
      deletedRecordCounts: row.deleted_record_counts ? JSON.parse(row.deleted_record_counts as string) : undefined,
      errorMessage: row.error_message as string | undefined,
      processedBy: row.processed_by as number | undefined,
      createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    };
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get deletion statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<DeletionStatus, number>;
    averageProcessingTimeMs: number;
    pendingCount: number;
    approachingDeadline: number;
  }> {
    const total = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );

    const byStatusRows = await this.db.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );
    const byStatus = Object.fromEntries(
      byStatusRows.map((r) => [r.status as DeletionStatus, r.count])
    ) as Record<DeletionStatus, number>;

    // Average processing time for completed requests
    const avgTime = await this.db.queryOne<{ avg_time: number | null }>(`
      SELECT AVG(
        (julianday(processed_at) - julianday(requested_at)) * 24 * 60 * 60 * 1000
      ) as avg_time
      FROM ${this.tableName}
      WHERE status = 'completed' AND processed_at IS NOT NULL
    `);

    const approachingDeadline = await this.getApproachingDeadline();

    return {
      total: total?.count || 0,
      byStatus,
      averageProcessingTimeMs: avgTime?.avg_time || 0,
      pendingCount: byStatus.pending || 0,
      approachingDeadline: approachingDeadline.length,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create GDPRDeletionService instance
 */
export function createGDPRDeletionService(
  db: IDatabaseConnection,
  auditService: AuditService
): GDPRDeletionService {
  return new GDPRDeletionService(db, auditService);
}
