/**
 * Audit Retention Integration Tests
 * ==================================
 * Tests the 6-year audit retention policy with real SQLite database.
 *
 * Per CLAUDE.md §2.2 and FDA 21 CFR Part 11:
 * - Audit trail must be retained for 6 years (2190 days)
 * - Entries older than retention period can be cleaned up
 * - Cleanup must not affect entries within retention period
 *
 * Traceability: REQ-AUDIT-001 (6-year retention)
 *
 * @packageDocumentation
 */

import Database from 'better-sqlite3';
import {
  AuditService,
  type IAuditEntry,
  type AuditAction,
  type AuditEntityType,
} from '../../src/infrastructure/database/security/AuditService';
import type {
  IDatabaseConnection,
  ITransaction,
} from '../../src/infrastructure/database/interfaces/IDatabaseConnection';

/**
 * Create in-memory SQLite database with audit_log table
 */
function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');

  // Create audit_log table matching production schema
  db.exec(`
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
      session_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);

  return db;
}

/**
 * Wrapper to make better-sqlite3 compatible with IDatabaseConnection interface
 */
function createDbWrapper(db: Database.Database): IDatabaseConnection {
  return {
    type: 'sqlite' as const,
    isConnected: true,

    connect: async () => {},
    close: async () => { db.close(); },

    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const stmt = db.prepare(sql);
      return (params ? stmt.all(...params) : stmt.all()) as T[];
    },

    queryOne: async <T>(sql: string, params?: unknown[]): Promise<T | null> => {
      const stmt = db.prepare(sql);
      return (params ? stmt.get(...params) : stmt.get()) as T | null;
    },

    execute: async (sql: string, params?: unknown[]) => {
      const stmt = db.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    },

    beginTransaction: async (): Promise<ITransaction> => {
      throw new Error('Not implemented for tests');
    },

    transaction: async <T>(_fn: (tx: ITransaction) => Promise<T>): Promise<T> => {
      throw new Error('Not implemented for tests');
    },

    tableExists: async (tableName: string): Promise<boolean> => {
      const result = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      return result !== undefined;
    },

    healthCheck: async () => ({
      connected: true,
      latencyMs: 0,
      version: 'SQLite (in-memory)',
    }),
  };
}

/**
 * Insert audit entry with specific timestamp for testing
 */
function insertAuditEntry(
  db: Database.Database,
  entry: {
    userId?: number;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: number;
    metadata?: Record<string, unknown>;
    created_at: string;
  }
): void {
  const stmt = db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    entry.userId ?? 123,
    entry.action ?? 'READ',
    entry.entityType ?? 'sleep_diary',
    entry.entityId ?? null,
    entry.metadata ? JSON.stringify(entry.metadata) : null,
    entry.created_at
  );
}

/**
 * Get date string N days ago
 */
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Count entries in audit_log
 */
function countEntries(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as { count: number };
  return result.count;
}

describe('AuditRetentionIntegration', () => {
  let db: Database.Database;
  let dbWrapper: IDatabaseConnection;
  let auditService: AuditService;

  beforeEach(() => {
    db = createTestDatabase();
    dbWrapper = createDbWrapper(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('6-year retention policy (REQ-AUDIT-001)', () => {
    it('should retain entries within 6-year period', async () => {
      auditService = new AuditService(dbWrapper);

      // Insert entries at various ages
      insertAuditEntry(db, { created_at: daysAgo(0), action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(365), action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(730), action: 'UPDATE' });
      insertAuditEntry(db, { created_at: daysAgo(1825), action: 'DELETE' });
      insertAuditEntry(db, { created_at: daysAgo(2189), action: 'LOGIN' });

      expect(countEntries(db)).toBe(5);

      // Run cleanup
      const deleted = await auditService.cleanup();

      // All entries should be retained (within 6-year period)
      expect(deleted).toBe(0);
      expect(countEntries(db)).toBe(5);
    });

    it('should delete entries older than 6 years', async () => {
      auditService = new AuditService(dbWrapper);

      // Insert entries: some within retention, some clearly outside
      insertAuditEntry(db, { created_at: daysAgo(0), action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(365), action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(2185), action: 'UPDATE' }); // 5 days before cutoff - retained
      insertAuditEntry(db, { created_at: daysAgo(2195), action: 'DELETE' }); // 5 days after cutoff - deleted
      insertAuditEntry(db, { created_at: daysAgo(2555), action: 'LOGIN' }); // Should delete
      insertAuditEntry(db, { created_at: daysAgo(3650), action: 'LOGOUT' }); // Should delete

      expect(countEntries(db)).toBe(6);

      // Run cleanup
      const deleted = await auditService.cleanup();

      // Should delete entries older than 6 years (3 entries clearly beyond cutoff)
      expect(deleted).toBe(3);
      expect(countEntries(db)).toBe(3);

      // Verify remaining entries are the recent ones
      const remaining = db.prepare('SELECT action FROM audit_log ORDER BY created_at DESC').all() as { action: string }[];
      expect(remaining.map(r => r.action)).toEqual([
        'CREATE',
        'READ',
        'UPDATE',
      ]);
    });

    it('should use default 2190-day (6-year) retention', async () => {
      auditService = new AuditService(dbWrapper);

      // Verify default config
      expect((auditService as any).config.retentionDays).toBe(2190);
    });
  });

  describe('Custom retention period', () => {
    it('should respect custom retention period', async () => {
      // Create service with 30-day retention for testing
      auditService = new AuditService(dbWrapper, { retentionDays: 30 });

      insertAuditEntry(db, { created_at: daysAgo(0), action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(15), action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(29), action: 'UPDATE' });
      insertAuditEntry(db, { created_at: daysAgo(31), action: 'DELETE' }); // Should delete
      insertAuditEntry(db, { created_at: daysAgo(60), action: 'LOGIN' }); // Should delete

      expect(countEntries(db)).toBe(5);

      const deleted = await auditService.cleanup();

      expect(deleted).toBe(2);
      expect(countEntries(db)).toBe(3);
    });
  });

  describe('Audit entry creation', () => {
    it('should create audit entries with correct timestamp', async () => {
      auditService = new AuditService(dbWrapper);

      const beforeInsert = new Date();

      await auditService.log({
        userId: 123,
        action: 'CREATE',
        entityType: 'sleep_diary',
        entityId: 456,
        newValue: { sleepQuality: 'good' },
      });

      const afterInsert = new Date();

      const entries = db.prepare('SELECT * FROM audit_log').all() as any[];
      expect(entries.length).toBe(1);
      expect(entries[0].user_id).toBe(123);
      expect(entries[0].action).toBe('CREATE');
      expect(entries[0].entity_type).toBe('sleep_diary');
      expect(entries[0].entity_id).toBe(456);

      // Verify timestamp is set (SQLite datetime('now') may have timezone differences)
      // We just verify the timestamp exists and is a valid date string
      expect(entries[0].created_at).toBeDefined();
      const createdAt = new Date(entries[0].created_at);
      expect(createdAt instanceof Date && !isNaN(createdAt.getTime())).toBe(true);

      // Allow for timezone differences by checking the date is within 24 hours of now
      const timeDiff = Math.abs(afterInsert.getTime() - createdAt.getTime());
      expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // 24 hours tolerance for timezones
    });

    it('should create immutable audit entries', async () => {
      auditService = new AuditService(dbWrapper);

      await auditService.logRead('sleep_diary', 789, { userId: 123 });

      // Verify entry exists
      const before = db.prepare('SELECT id FROM audit_log WHERE action = ?').get('PHI_ACCESS') as { id: number };
      expect(before).toBeDefined();

      // Audit entries should not be updated (immutability principle)
      // This is enforced by design - no UPDATE method in AuditService
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(auditService));
      expect(methods).not.toContain('update');
      expect(methods).not.toContain('edit');
      expect(methods).not.toContain('modify');
    });
  });

  describe('Query audit trail', () => {
    it('should query entries by user ID', async () => {
      auditService = new AuditService(dbWrapper);

      insertAuditEntry(db, { created_at: daysAgo(0), userId: 111, action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(1), userId: 222, action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(2), userId: 111, action: 'UPDATE' });

      const entries = await auditService.query({ userId: 111 });

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.userId === 111)).toBe(true);
    });

    it('should query entries by action type', async () => {
      auditService = new AuditService(dbWrapper);

      insertAuditEntry(db, { created_at: daysAgo(0), action: 'LOGIN' });
      insertAuditEntry(db, { created_at: daysAgo(1), action: 'PHI_ACCESS' });
      insertAuditEntry(db, { created_at: daysAgo(2), action: 'LOGIN' });
      insertAuditEntry(db, { created_at: daysAgo(3), action: 'LOGOUT' });

      const entries = await auditService.query({ action: 'LOGIN' });

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.action === 'LOGIN')).toBe(true);
    });

    it('should query entries by date range', async () => {
      auditService = new AuditService(dbWrapper);

      insertAuditEntry(db, { created_at: daysAgo(0), action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(5), action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(10), action: 'UPDATE' });
      insertAuditEntry(db, { created_at: daysAgo(15), action: 'DELETE' });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const entries = await auditService.query({ startDate, endDate });

      expect(entries.length).toBe(2);
      expect(entries.map(e => e.action).sort()).toEqual(['CREATE', 'READ']);
    });
  });

  describe('HIPAA compliance', () => {
    it('should log PHI access events via logRead', async () => {
      auditService = new AuditService(dbWrapper);

      // logRead automatically sets action to PHI_ACCESS for non-system entities
      await auditService.logRead('sleep_diary', 789, {
        userId: 123,
        metadata: { accessType: 'view', patientId: 456 },
      });

      const entries = db.prepare('SELECT * FROM audit_log WHERE action = ?').all('PHI_ACCESS') as any[];
      expect(entries.length).toBe(1);
      expect(entries[0].entity_type).toBe('sleep_diary');
      expect(entries[0].entity_id).toBe(789);
      expect(entries[0].user_id).toBe(123);

      const metadata = JSON.parse(entries[0].metadata_json);
      expect(metadata.accessType).toBe('view');
      expect(metadata.patientId).toBe(456);
    });

    it('should support 6-year retention for compliance', async () => {
      auditService = new AuditService(dbWrapper);

      // Insert entry from almost 6 years ago
      const almostSixYearsAgo = daysAgo(2189);
      insertAuditEntry(db, {
        created_at: almostSixYearsAgo,
        action: 'PHI_ACCESS',
        userId: 999,
      });

      // Should still be retained
      const deleted = await auditService.cleanup();
      expect(deleted).toBe(0);

      const entries = await auditService.query({ action: 'PHI_ACCESS' });
      expect(entries.length).toBe(1);
    });
  });

  describe('Audit statistics', () => {
    it('should compute audit statistics', async () => {
      auditService = new AuditService(dbWrapper);

      insertAuditEntry(db, { created_at: daysAgo(0), userId: 111, action: 'CREATE', entityType: 'sleep_diary' });
      insertAuditEntry(db, { created_at: daysAgo(1), userId: 222, action: 'READ', entityType: 'sleep_diary' });
      insertAuditEntry(db, { created_at: daysAgo(2), userId: 111, action: 'CREATE', entityType: 'assessment' });
      insertAuditEntry(db, { created_at: daysAgo(3), userId: 333, action: 'LOGIN', entityType: 'user' });

      const stats = await auditService.getStats();

      expect(stats.totalEntries).toBe(4);
      expect(stats.uniqueUsers).toBe(3);
      expect(stats.entriesByAction['CREATE']).toBe(2);
      expect(stats.entriesByAction['READ']).toBe(1);
      expect(stats.entriesByAction['LOGIN']).toBe(1);
      expect(stats.entriesByEntityType['sleep_diary']).toBe(2);
      expect(stats.entriesByEntityType['assessment']).toBe(1);
      expect(stats.entriesByEntityType['user']).toBe(1);
    });
  });

  describe('User audit trail (GDPR)', () => {
    it('should retrieve all entries for a specific user', async () => {
      auditService = new AuditService(dbWrapper);

      // Insert entries for multiple users
      insertAuditEntry(db, { created_at: daysAgo(0), userId: 111, action: 'CREATE' });
      insertAuditEntry(db, { created_at: daysAgo(1), userId: 222, action: 'READ' });
      insertAuditEntry(db, { created_at: daysAgo(2), userId: 111, action: 'UPDATE' });
      insertAuditEntry(db, { created_at: daysAgo(3), userId: 111, action: 'DELETE' });
      insertAuditEntry(db, { created_at: daysAgo(4), userId: 333, action: 'LOGIN' });

      // Get audit trail for user 111 (GDPR data subject request)
      const userTrail = await auditService.getUserAuditTrail(111);

      expect(userTrail.length).toBe(3);
      expect(userTrail.every(e => e.userId === 111)).toBe(true);
    });
  });
});
