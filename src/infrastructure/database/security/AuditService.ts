/**
 * AuditService - HIPAA/GDPR Compliance Audit Trail
 * ==================================================
 *
 * Provides comprehensive audit logging for healthcare data operations.
 * Implements HIPAA Security Rule (45 CFR 164.312(b)) requirements.
 *
 * Features:
 * - Immutable audit trail (GDPR Articles 25, 30, 32)
 * - 6-year retention support (HIPAA requirement)
 * - PHI access logging
 * - User action tracking (who, what, when, where)
 * - Old/new value capture for changes
 *
 * References:
 * - https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/
 * - https://blog.chino.io/logs-audit-trails-digital-health-apps/
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

/**
 * Audit action types
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'EXPORT'
  | 'CONSENT_GIVEN'
  | 'CONSENT_REVOKED'
  | 'DATA_ACCESS'
  | 'PHI_ACCESS'
  | 'ANONYMIZE'
  | 'RESTORE';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'user'
  | 'sleep_diary'
  | 'assessment'
  | 'therapy_session'
  | 'treatment_plan'
  | 'consent'
  | 'export_request'
  | 'system';

/**
 * Audit log entry
 */
export interface IAuditEntry {
  readonly id?: number;
  readonly userId?: number;
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId?: number;
  readonly oldValue?: Record<string, unknown>;
  readonly newValue?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt?: Date;
}

/**
 * Audit query filters
 */
export interface IAuditQueryFilters {
  userId?: number;
  action?: AuditAction | AuditAction[];
  entityType?: AuditEntityType | AuditEntityType[];
  entityId?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit statistics
 */
export interface IAuditStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByEntityType: Record<string, number>;
  uniqueUsers: number;
  dateRange: {
    oldest: Date | null;
    newest: Date | null;
  };
}

/**
 * AuditService configuration
 */
export interface IAuditServiceConfig {
  /** Enable audit logging (default: true) */
  enabled?: boolean;

  /** Log PHI access separately (default: true) */
  logPhiAccess?: boolean;

  /** Include old values in update logs (default: true) */
  captureOldValues?: boolean;

  /** Include new values in logs (default: true) */
  captureNewValues?: boolean;

  /** Retention period in days (HIPAA: 2190 = 6 years) */
  retentionDays?: number;

  /** Fields to redact from logs */
  redactedFields?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<IAuditServiceConfig> = {
  enabled: true,
  logPhiAccess: true,
  captureOldValues: true,
  captureNewValues: true,
  retentionDays: 2190, // 6 years (HIPAA requirement)
  redactedFields: ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'],
};

/**
 * HIPAA/GDPR compliant audit service
 */
export class AuditService {
  private readonly config: Required<IAuditServiceConfig>;
  private readonly tableName = 'audit_log';

  constructor(
    private readonly db: IDatabaseConnection,
    config: IAuditServiceConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log an audit entry
   */
  async log(entry: Omit<IAuditEntry, 'id' | 'createdAt'>): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    const sanitizedEntry = this.sanitizeEntry(entry);

    const sql = this.db.type === 'postgres'
      ? `INSERT INTO ${this.tableName}
         (user_id, action, entity_type, entity_id, old_value_json, new_value_json, ip_address, user_agent, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`
      : `INSERT INTO ${this.tableName}
         (user_id, action, entity_type, entity_id, old_value_json, new_value_json, ip_address, user_agent, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      sanitizedEntry.userId || null,
      sanitizedEntry.action,
      sanitizedEntry.entityType,
      sanitizedEntry.entityId || null,
      sanitizedEntry.oldValue ? JSON.stringify(sanitizedEntry.oldValue) : null,
      sanitizedEntry.newValue ? JSON.stringify(sanitizedEntry.newValue) : null,
      sanitizedEntry.ipAddress || null,
      sanitizedEntry.userAgent || null,
      sanitizedEntry.metadata ? JSON.stringify(sanitizedEntry.metadata) : null,
    ];

    const result = await this.db.execute(sql, params);
    return result.lastInsertRowid;
  }

  /**
   * Log a CREATE action
   */
  async logCreate(
    entityType: AuditEntityType,
    entityId: number,
    newValue: Record<string, unknown>,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action: 'CREATE',
      entityType,
      entityId,
      newValue: this.config.captureNewValues ? newValue : undefined,
      ...context,
    });
  }

  /**
   * Log a READ action (PHI access)
   */
  async logRead(
    entityType: AuditEntityType,
    entityId: number,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    if (!this.config.logPhiAccess && entityType !== 'system') {
      return 0;
    }

    return this.log({
      action: entityType === 'system' ? 'DATA_ACCESS' : 'PHI_ACCESS',
      entityType,
      entityId,
      ...context,
    });
  }

  /**
   * Log an UPDATE action
   */
  async logUpdate(
    entityType: AuditEntityType,
    entityId: number,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action: 'UPDATE',
      entityType,
      entityId,
      oldValue: this.config.captureOldValues ? oldValue : undefined,
      newValue: this.config.captureNewValues ? newValue : undefined,
      ...context,
    });
  }

  /**
   * Log a DELETE action
   */
  async logDelete(
    entityType: AuditEntityType,
    entityId: number,
    oldValue?: Record<string, unknown>,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action: 'DELETE',
      entityType,
      entityId,
      oldValue: this.config.captureOldValues ? oldValue : undefined,
      ...context,
    });
  }

  /**
   * Log consent action
   */
  async logConsent(
    userId: number,
    given: boolean,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action: given ? 'CONSENT_GIVEN' : 'CONSENT_REVOKED',
      entityType: 'consent',
      userId,
      ...context,
    });
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    userId: number | undefined,
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action,
      entityType: 'user',
      userId,
      ...context,
    });
  }

  /**
   * Log data export (GDPR)
   */
  async logExport(
    userId: number,
    entityTypes: AuditEntityType[],
    context?: Partial<IAuditEntry>
  ): Promise<number> {
    return this.log({
      action: 'EXPORT',
      entityType: 'export_request',
      userId,
      metadata: { exportedEntityTypes: entityTypes },
      ...context,
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: IAuditQueryFilters): Promise<IAuditEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const placeholder = () => this.db.type === 'postgres' ? `$${paramIndex++}` : '?';

    if (filters.userId !== undefined) {
      conditions.push(`user_id = ${placeholder()}`);
      params.push(filters.userId);
    }

    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      const placeholders = actions.map(() => placeholder()).join(', ');
      conditions.push(`action IN (${placeholders})`);
      params.push(...actions);
    }

    if (filters.entityType) {
      const types = Array.isArray(filters.entityType) ? filters.entityType : [filters.entityType];
      const placeholders = types.map(() => placeholder()).join(', ');
      conditions.push(`entity_type IN (${placeholders})`);
      params.push(...types);
    }

    if (filters.entityId !== undefined) {
      conditions.push(`entity_id = ${placeholder()}`);
      params.push(filters.entityId);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= ${placeholder()}`);
      params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= ${placeholder()}`);
      params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
    }

    if (filters.ipAddress) {
      conditions.push(`ip_address = ${placeholder()}`);
      params.push(filters.ipAddress);
    }

    let sql = `SELECT * FROM ${this.tableName}`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT ${placeholder()}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ` OFFSET ${placeholder()}`;
      params.push(filters.offset);
    }

    const rows = await this.db.query<{
      id: number;
      user_id: number | null;
      action: string;
      entity_type: string;
      entity_id: number | null;
      old_value_json: string | null;
      new_value_json: string | null;
      ip_address: string | null;
      user_agent: string | null;
      metadata_json: string | null;
      created_at: string;
    }>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id || undefined,
      action: row.action as AuditAction,
      entityType: row.entity_type as AuditEntityType,
      entityId: row.entity_id || undefined,
      oldValue: row.old_value_json ? JSON.parse(row.old_value_json) : undefined,
      newValue: row.new_value_json ? JSON.parse(row.new_value_json) : undefined,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get audit statistics
   */
  async getStats(filters?: Pick<IAuditQueryFilters, 'startDate' | 'endDate'>): Promise<IAuditStats> {
    let dateCondition = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    const placeholder = () => this.db.type === 'postgres' ? `$${paramIndex++}` : '?';

    if (filters?.startDate || filters?.endDate) {
      const conditions: string[] = [];
      if (filters.startDate) {
        conditions.push(`created_at >= ${placeholder()}`);
        params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
      }
      if (filters.endDate) {
        conditions.push(`created_at <= ${placeholder()}`);
        params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
      }
      dateCondition = ` WHERE ${conditions.join(' AND ')}`;
    }

    // Total count
    const totalResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}${dateCondition}`,
      params
    );

    // By action
    const actionRows = await this.db.query<{ action: string; count: number }>(
      `SELECT action, COUNT(*) as count FROM ${this.tableName}${dateCondition} GROUP BY action`,
      params
    );

    // By entity type
    const entityRows = await this.db.query<{ entity_type: string; count: number }>(
      `SELECT entity_type, COUNT(*) as count FROM ${this.tableName}${dateCondition} GROUP BY entity_type`,
      params
    );

    // Unique users
    const usersResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT user_id) as count FROM ${this.tableName}${dateCondition}`,
      params
    );

    // Date range
    const dateRangeResult = await this.db.queryOne<{ oldest: string | null; newest: string | null }>(
      `SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM ${this.tableName}${dateCondition}`,
      params
    );

    return {
      totalEntries: totalResult?.count || 0,
      entriesByAction: Object.fromEntries(actionRows.map((r) => [r.action, r.count])),
      entriesByEntityType: Object.fromEntries(entityRows.map((r) => [r.entity_type, r.count])),
      uniqueUsers: usersResult?.count || 0,
      dateRange: {
        oldest: dateRangeResult?.oldest ? new Date(dateRangeResult.oldest) : null,
        newest: dateRangeResult?.newest ? new Date(dateRangeResult.newest) : null,
      },
    };
  }

  /**
   * Cleanup old audit entries (beyond retention period)
   *
   * Note: Be careful with this in HIPAA environments!
   * Default retention is 6 years.
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const sql = this.db.type === 'postgres'
      ? `DELETE FROM ${this.tableName} WHERE created_at < $1`
      : `DELETE FROM ${this.tableName} WHERE created_at < ?`;

    const result = await this.db.execute(sql, [cutoffDate.toISOString()]);

    if (result.changes > 0) {
      console.log(`[AuditService] Cleaned up ${result.changes} entries older than ${this.config.retentionDays} days`);
    }

    return result.changes;
  }

  /**
   * Get entries for a specific user (GDPR data subject request)
   */
  async getUserAuditTrail(userId: number): Promise<IAuditEntry[]> {
    return this.query({ userId, limit: 10000 });
  }

  /**
   * Sanitize entry by redacting sensitive fields
   */
  private sanitizeEntry(entry: Omit<IAuditEntry, 'id' | 'createdAt'>): Omit<IAuditEntry, 'id' | 'createdAt'> {
    return {
      ...entry,
      oldValue: entry.oldValue ? this.redactSensitiveFields(entry.oldValue) : undefined,
      newValue: entry.newValue ? this.redactSensitiveFields(entry.newValue) : undefined,
    };
  }

  /**
   * Redact sensitive fields from object
   */
  private redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isRedacted = this.config.redactedFields.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isRedacted) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.redactSensitiveFields(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
