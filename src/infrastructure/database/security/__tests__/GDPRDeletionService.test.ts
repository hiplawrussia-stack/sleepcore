/**
 * GDPRDeletionService Tests
 * ==========================
 * Unit tests for GDPR Article 17 deletion service.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security/__tests__
 */

import { GDPRDeletionService, createGDPRDeletionService } from '../GDPRDeletionService';
import { AuditService } from '../AuditService';
import { createSQLiteConnection } from '../../sqlite/SQLiteConnection';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

describe('GDPRDeletionService', () => {
  let db: IDatabaseConnection;
  let auditService: AuditService;
  let deletionService: GDPRDeletionService;

  beforeAll(async () => {
    // Create in-memory database
    db = createSQLiteConnection(':memory:');
    await db.connect();

    // Create required tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        consent_given INTEGER DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sleep_diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        score INTEGER NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        old_value_json TEXT,
        new_value_json TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata_json TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        external_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        request_type TEXT NOT NULL DEFAULT 'full_deletion',
        request_source TEXT NOT NULL DEFAULT 'user_request',
        request_reason TEXT,
        requested_at TEXT NOT NULL DEFAULT (datetime('now')),
        deadline_at TEXT NOT NULL,
        processed_at TEXT,
        retention_required INTEGER DEFAULT 0,
        retention_reason TEXT,
        retention_until TEXT,
        deleted_tables TEXT,
        deleted_record_counts TEXT,
        error_message TEXT,
        processed_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    auditService = new AuditService(db);
    deletionService = createGDPRDeletionService(db, auditService);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clear data before each test
    await db.execute('DELETE FROM deletion_requests');
    await db.execute('DELETE FROM sleep_diary_entries');
    await db.execute('DELETE FROM assessments');
    await db.execute('DELETE FROM users');
    await db.execute('DELETE FROM audit_log');
  });

  describe('createRequest', () => {
    it('should create a deletion request with 30-day deadline', async () => {
      // Create test user
      await db.execute(
        `INSERT INTO users (external_id, email) VALUES ('tg_123456', 'test@example.com')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_123456'`);

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_123456',
        requestType: 'full_deletion',
        requestSource: 'user_request',
        requestReason: 'User requested account deletion',
      });

      expect(request.id).toBeDefined();
      expect(request.userId).toBe(user!.id);
      expect(request.status).toBe('pending');
      expect(request.requestType).toBe('full_deletion');

      // Check 30-day deadline
      const daysDiff = Math.round(
        (request.deadlineAt.getTime() - request.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30);
    });

    it('should log to audit trail', async () => {
      await db.execute(
        `INSERT INTO users (external_id) VALUES ('tg_audit_test')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_audit_test'`);

      await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_audit_test',
      });

      const auditLogs = await auditService.query({
        entityId: user!.id,
        action: 'DELETE',
      });

      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].metadata?.event).toBe('deletion_request_created');
    });
  });

  describe('getRequestById', () => {
    it('should return null for non-existent request', async () => {
      const result = await deletionService.getRequestById(99999);
      expect(result).toBeNull();
    });

    it('should return request with all fields', async () => {
      await db.execute(
        `INSERT INTO users (external_id) VALUES ('tg_get_test')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_get_test'`);

      const created = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_get_test',
        requestReason: 'Test reason',
      });

      const fetched = await deletionService.getRequestById(created.id!);

      expect(fetched).not.toBeNull();
      expect(fetched!.userId).toBe(user!.id);
      expect(fetched!.externalId).toBe('tg_get_test');
      expect(fetched!.requestReason).toBe('Test reason');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel pending request', async () => {
      await db.execute(
        `INSERT INTO users (external_id) VALUES ('tg_cancel_test')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_cancel_test'`);

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_cancel_test',
      });

      const result = await deletionService.cancelRequest(request.id!);
      expect(result).toBe(true);

      const cancelled = await deletionService.getRequestById(request.id!);
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should not cancel already processed request', async () => {
      await db.execute(
        `INSERT INTO users (external_id) VALUES ('tg_no_cancel')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_no_cancel'`);

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_no_cancel',
      });

      // Manually set to completed
      await db.execute(
        `UPDATE deletion_requests SET status = 'completed' WHERE id = ?`,
        [request.id]
      );

      await expect(deletionService.cancelRequest(request.id!))
        .rejects.toThrow('Cannot cancel request in status: completed');
    });
  });

  describe('processRequest', () => {
    it('should delete user data across tables', async () => {
      // Create user with data
      await db.execute(
        `INSERT INTO users (external_id, email) VALUES ('tg_process', 'delete@me.com')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_process'`);

      await db.execute(
        `INSERT INTO sleep_diary_entries (user_id, date) VALUES (?, '2026-01-01')`,
        [user!.id]
      );
      await db.execute(
        `INSERT INTO sleep_diary_entries (user_id, date) VALUES (?, '2026-01-02')`,
        [user!.id]
      );
      await db.execute(
        `INSERT INTO assessments (user_id, type, score) VALUES (?, 'isi', 15)`,
        [user!.id]
      );

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_process',
      });

      const result = await deletionService.processRequest(request.id!);

      expect(result.success).toBe(true);
      expect(result.deletedRecords['sleep_diary_entries']).toBe(2);
      expect(result.deletedRecords['users']).toBe(1);

      // Verify user is soft-deleted
      const deletedUser = await db.queryOne<{ deleted_at: string | null }>(
        `SELECT deleted_at FROM users WHERE id = ?`,
        [user!.id]
      );
      expect(deletedUser!.deleted_at).not.toBeNull();
    });

    it('should handle anonymization request', async () => {
      await db.execute(
        `INSERT INTO users (external_id, email, first_name, last_name)
         VALUES ('tg_anon', 'anon@test.com', 'John', 'Doe')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_anon'`);

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_anon',
        requestType: 'anonymization',
      });

      const result = await deletionService.processRequest(request.id!);

      expect(result.success).toBe(true);
      expect(result.anonymizedTables).toContain('users');

      // Verify user is anonymized
      const anonUser = await db.queryOne<{
        external_id: string;
        email: string | null;
        first_name: string;
      }>(`SELECT external_id, email, first_name FROM users WHERE id = ?`, [user!.id]);

      expect(anonUser!.external_id).toMatch(/^anon_/);
      expect(anonUser!.email).toBeNull();
      expect(anonUser!.first_name).toBe('[ANONYMIZED]');
    });

    it('should not process already completed request', async () => {
      await db.execute(
        `INSERT INTO users (external_id) VALUES ('tg_already')`
      );
      const user = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_already'`);

      const request = await deletionService.createRequest({
        userId: user!.id,
        externalId: 'tg_already',
      });

      // Process first time
      await deletionService.processRequest(request.id!);

      // Try to process again
      const result = await deletionService.processRequest(request.id!);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('already processed');
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending requests ordered by deadline', async () => {
      await db.execute(`INSERT INTO users (external_id) VALUES ('tg_1')`);
      await db.execute(`INSERT INTO users (external_id) VALUES ('tg_2')`);
      const user1 = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_1'`);
      const user2 = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_2'`);

      await deletionService.createRequest({ userId: user1!.id, externalId: 'tg_1' });
      await deletionService.createRequest({ userId: user2!.id, externalId: 'tg_2' });

      const pending = await deletionService.getPendingRequests();

      expect(pending.length).toBe(2);
      expect(pending[0].deadlineAt.getTime()).toBeLessThanOrEqual(pending[1].deadlineAt.getTime());
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      await db.execute(`INSERT INTO users (external_id) VALUES ('tg_stats1')`);
      await db.execute(`INSERT INTO users (external_id) VALUES ('tg_stats2')`);
      const user1 = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_stats1'`);
      const user2 = await db.queryOne<{ id: number }>(`SELECT id FROM users WHERE external_id = 'tg_stats2'`);

      await deletionService.createRequest({ userId: user1!.id, externalId: 'tg_stats1' });
      const request2 = await deletionService.createRequest({ userId: user2!.id, externalId: 'tg_stats2' });

      // Process one request
      await deletionService.processRequest(request2.id!);

      const stats = await deletionService.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.pending).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.pendingCount).toBe(1);
    });
  });

  describe('hardDeleteExpiredData', () => {
    it('should hard delete soft-deleted data after grace period', async () => {
      // Create user and soft-delete
      await db.execute(
        `INSERT INTO users (external_id, deleted_at) VALUES ('tg_expired', datetime('now', '-60 days'))`
      );

      const count = await deletionService.hardDeleteExpiredData(30);

      expect(count).toBeGreaterThan(0);

      // Verify user is gone
      const user = await db.queryOne<{ id: number }>(
        `SELECT id FROM users WHERE external_id = 'tg_expired'`
      );
      expect(user).toBeNull();
    });

    it('should not delete data within grace period', async () => {
      await db.execute(
        `INSERT INTO users (external_id, deleted_at) VALUES ('tg_recent', datetime('now', '-5 days'))`
      );

      const count = await deletionService.hardDeleteExpiredData(30);

      // Should not delete recently deleted data
      const user = await db.queryOne<{ id: number }>(
        `SELECT id FROM users WHERE external_id = 'tg_recent'`
      );
      expect(user).not.toBeNull();
    });
  });
});
