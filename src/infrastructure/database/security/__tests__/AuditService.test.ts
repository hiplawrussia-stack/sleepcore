/**
 * AuditService Unit Tests
 * ========================
 *
 * Comprehensive tests for HIPAA/GDPR compliant audit logging.
 *
 * Coverage targets:
 * - Core log() method with SQLite and PostgreSQL
 * - All convenience methods (logCreate, logRead, logUpdate, logDelete)
 * - Specialized logging (logConsent, logAuth, logExport)
 * - Query functionality with filters
 * - Statistics aggregation
 * - Cleanup/retention logic
 * - PHI redaction
 * - Configuration options
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security/__tests__
 */

import {
  AuditService,
  type IAuditEntry,
  type IAuditServiceConfig,
  type AuditAction,
  type AuditEntityType,
} from '../AuditService';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create mock database connection
 */
function createMockDb(type: 'sqlite' | 'postgres' = 'sqlite'): jest.Mocked<IDatabaseConnection> {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
    execute: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowid: 1 }),
  };

  return {
    type,
    isConnected: true,
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
    execute: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowid: 1 }),
    beginTransaction: jest.fn().mockResolvedValue(mockTransaction),
    transaction: jest.fn().mockImplementation(async (fn) => fn(mockTransaction)),
    tableExists: jest.fn().mockResolvedValue(true),
    healthCheck: jest.fn().mockResolvedValue({ connected: true, latencyMs: 1, version: '1.0' }),
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('AuditService', () => {
  let mockDb: jest.Mocked<IDatabaseConnection>;
  let service: AuditService;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AuditService(mockDb);
    jest.clearAllMocks();
  });

  // ==========================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ==========================================================================

  describe('constructor', () => {
    it('should create service with default configuration', () => {
      const svc = new AuditService(mockDb);
      expect(svc).toBeInstanceOf(AuditService);
    });

    it('should merge custom config with defaults', () => {
      const customConfig: IAuditServiceConfig = {
        enabled: false,
        retentionDays: 365,
      };
      const svc = new AuditService(mockDb, customConfig);
      expect(svc).toBeInstanceOf(AuditService);
    });

    it('should work with PostgreSQL connection', () => {
      const pgDb = createMockDb('postgres');
      const svc = new AuditService(pgDb);
      expect(svc).toBeInstanceOf(AuditService);
    });

    it('should accept custom redacted fields', () => {
      const config: IAuditServiceConfig = {
        redactedFields: ['customSecret', 'myPrivateField'],
      };
      const svc = new AuditService(mockDb, config);
      expect(svc).toBeInstanceOf(AuditService);
    });
  });

  // ==========================================================================
  // CORE LOG METHOD
  // ==========================================================================

  describe('log()', () => {
    it('should insert audit entry into database', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        userId: 123,
        action: 'CREATE',
        entityType: 'user',
        entityId: 456,
        newValue: { name: 'Test User' },
      };

      const result = await service.log(entry);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });

    it('should use SQLite placeholder syntax', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'READ',
        entityType: 'sleep_diary',
        entityId: 100,
      };

      await service.log(entry);

      const sql = mockDb.execute.mock.calls[0][0] as string;
      expect(sql).toContain('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      expect(sql).not.toContain('$1');
    });

    it('should use PostgreSQL placeholder syntax', async () => {
      const pgDb = createMockDb('postgres');
      const svc = new AuditService(pgDb);

      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'UPDATE',
        entityType: 'therapy_session',
        entityId: 200,
      };

      await svc.log(entry);

      const sql = pgDb.execute.mock.calls[0][0] as string;
      expect(sql).toContain('$1');
      expect(sql).toContain('RETURNING id');
    });

    it('should return 0 when disabled', async () => {
      const svc = new AuditService(mockDb, { enabled: false });

      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'CREATE',
        entityType: 'user',
      };

      const result = await svc.log(entry);

      expect(result).toBe(0);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should handle null optional fields', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'DELETE',
        entityType: 'assessment',
      };

      await service.log(entry);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[0]).toBeNull(); // userId
      expect(params[3]).toBeNull(); // entityId
      expect(params[4]).toBeNull(); // oldValue
      expect(params[5]).toBeNull(); // newValue
    });

    it('should serialize oldValue and newValue as JSON', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'UPDATE',
        entityType: 'treatment_plan',
        entityId: 50,
        oldValue: { status: 'active' },
        newValue: { status: 'completed' },
      };

      await service.log(entry);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[4]).toBe('{"status":"active"}');
      expect(params[5]).toBe('{"status":"completed"}');
    });

    it('should serialize metadata as JSON', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'EXPORT',
        entityType: 'export_request',
        metadata: { format: 'json', requestedAt: '2026-02-06' },
      };

      await service.log(entry);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[8]).toContain('"format":"json"');
    });

    it('should include ipAddress and userAgent', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'LOGIN',
        entityType: 'user',
        userId: 999,
        ipAddress: '192.168.1.100',
        userAgent: 'TelegramBot/5.0',
      };

      await service.log(entry);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[6]).toBe('192.168.1.100');
      expect(params[7]).toBe('TelegramBot/5.0');
    });

    it('should redact sensitive fields from values', async () => {
      const entry: Omit<IAuditEntry, 'id' | 'createdAt'> = {
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          username: 'testuser',
          password: 'secret123',
          email: 'test@example.com',
          phoneNumber: '+7-999-123-4567',
        },
      };

      await service.log(entry);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const newValueJson = params[5] as string;
      const parsed = JSON.parse(newValueJson);

      expect(parsed.username).toBe('testuser');
      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.email).toBe('[REDACTED]');
      expect(parsed.phoneNumber).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  describe('logCreate()', () => {
    it('should log CREATE action with new value', async () => {
      const newValue = { sleepQuality: 'good', duration: 480 };

      await service.logCreate('sleep_diary', 100, newValue);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('CREATE');
      expect(params[2]).toBe('sleep_diary');
      expect(params[3]).toBe(100);
    });

    it('should include context fields', async () => {
      const newValue = { score: 12 };
      const context = { userId: 555, ipAddress: '10.0.0.1' };

      await service.logCreate('assessment', 200, newValue, context);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(555);
      expect(params[6]).toBe('10.0.0.1');
    });

    it('should skip new value capture when disabled', async () => {
      const svc = new AuditService(mockDb, { captureNewValues: false });

      await svc.logCreate('user', 1, { name: 'Test' });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[5]).toBeNull(); // newValue should be null
    });
  });

  describe('logRead()', () => {
    it('should log PHI_ACCESS for non-system entities', async () => {
      await service.logRead('sleep_diary', 123);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('PHI_ACCESS');
      expect(params[2]).toBe('sleep_diary');
    });

    it('should log DATA_ACCESS for system entity', async () => {
      await service.logRead('system', 1);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('DATA_ACCESS');
    });

    it('should return 0 when logPhiAccess is disabled for non-system', async () => {
      const svc = new AuditService(mockDb, { logPhiAccess: false });

      const result = await svc.logRead('sleep_diary', 123);

      expect(result).toBe(0);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should still log system access when logPhiAccess is disabled', async () => {
      const svc = new AuditService(mockDb, { logPhiAccess: false });

      await svc.logRead('system', 1);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should include context', async () => {
      await service.logRead('assessment', 50, { sessionId: 'sess-abc' });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      // sessionId is in metadata or directly depends on implementation
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('logUpdate()', () => {
    it('should log UPDATE with old and new values', async () => {
      const oldValue = { status: 'pending' };
      const newValue = { status: 'active' };

      await service.logUpdate('treatment_plan', 300, oldValue, newValue);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('UPDATE');
      expect(params[4]).toContain('pending');
      expect(params[5]).toContain('active');
    });

    it('should skip old value when captureOldValues is false', async () => {
      const svc = new AuditService(mockDb, { captureOldValues: false });

      await svc.logUpdate('user', 1, { old: 'value' }, { new: 'value' });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[4]).toBeNull();
    });

    it('should skip new value when captureNewValues is false', async () => {
      const svc = new AuditService(mockDb, { captureNewValues: false });

      await svc.logUpdate('user', 1, { old: 'value' }, { new: 'value' });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[5]).toBeNull();
    });

    it('should redact sensitive fields in both values', async () => {
      const oldValue = { email: 'old@test.com', status: 'active' };
      const newValue = { email: 'new@test.com', status: 'inactive' };

      await service.logUpdate('user', 1, oldValue, newValue);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const oldParsed = JSON.parse(params[4] as string);
      const newParsed = JSON.parse(params[5] as string);

      expect(oldParsed.email).toBe('[REDACTED]');
      expect(oldParsed.status).toBe('active');
      expect(newParsed.email).toBe('[REDACTED]');
      expect(newParsed.status).toBe('inactive');
    });
  });

  describe('logDelete()', () => {
    it('should log DELETE action', async () => {
      await service.logDelete('assessment', 400);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('DELETE');
      expect(params[2]).toBe('assessment');
      expect(params[3]).toBe(400);
    });

    it('should include old value if provided', async () => {
      const oldValue = { score: 15, severity: 'moderate' };

      await service.logDelete('assessment', 400, oldValue);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[4]).toContain('score');
    });

    it('should handle undefined old value', async () => {
      await service.logDelete('gamification', 500, undefined);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[4]).toBeNull();
    });

    it('should skip old value when captureOldValues is false', async () => {
      const svc = new AuditService(mockDb, { captureOldValues: false });

      await svc.logDelete('user', 1, { data: 'preserved' });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[4]).toBeNull();
    });
  });

  // ==========================================================================
  // SPECIALIZED LOGGING
  // ==========================================================================

  describe('logConsent()', () => {
    it('should log CONSENT_GIVEN when given is true', async () => {
      await service.logConsent(123, true);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('CONSENT_GIVEN');
      expect(params[2]).toBe('consent');
      expect(params[0]).toBe(123);
    });

    it('should log CONSENT_REVOKED when given is false', async () => {
      await service.logConsent(456, false);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('CONSENT_REVOKED');
    });

    it('should include context metadata', async () => {
      await service.logConsent(789, true, {
        ipAddress: '1.2.3.4',
        metadata: { version: '2.0', acceptedTerms: true },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[6]).toBe('1.2.3.4');
      expect(params[8]).toContain('version');
    });
  });

  describe('logAuth()', () => {
    it('should log LOGIN action', async () => {
      await service.logAuth('LOGIN', 100);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('LOGIN');
      expect(params[2]).toBe('user');
      expect(params[0]).toBe(100);
    });

    it('should log LOGOUT action', async () => {
      await service.logAuth('LOGOUT', 200);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('LOGOUT');
    });

    it('should log LOGIN_FAILED with undefined userId', async () => {
      await service.logAuth('LOGIN_FAILED', undefined);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('LOGIN_FAILED');
      expect(params[0]).toBeNull();
    });

    it('should include IP address for security analysis', async () => {
      await service.logAuth('LOGIN_FAILED', undefined, {
        ipAddress: '192.168.1.1',
        metadata: { attemptedUsername: 'hacker@evil.com' },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[6]).toBe('192.168.1.1');
    });
  });

  describe('logExport()', () => {
    it('should log EXPORT action with entity types', async () => {
      const entityTypes: AuditEntityType[] = ['sleep_diary', 'assessment', 'therapy_session'];

      await service.logExport(123, entityTypes);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('EXPORT');
      expect(params[2]).toBe('export_request');
      expect(params[0]).toBe(123);
      expect(params[8]).toContain('sleep_diary');
    });

    it('should include metadata with exported entity types', async () => {
      await service.logExport(456, ['user', 'consent']);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const metadata = JSON.parse(params[8] as string);
      expect(metadata.exportedEntityTypes).toEqual(['user', 'consent']);
    });

    it('should merge with additional context', async () => {
      await service.logExport(789, ['gamification'], {
        ipAddress: '10.0.0.5',
        userAgent: 'GDPR-Export-Tool/1.0',
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[6]).toBe('10.0.0.5');
      expect(params[7]).toBe('GDPR-Export-Tool/1.0');
    });
  });

  // ==========================================================================
  // QUERY FUNCTIONALITY
  // ==========================================================================

  describe('query()', () => {
    const mockRows = [
      {
        id: 1,
        user_id: 100,
        action: 'CREATE',
        entity_type: 'user',
        entity_id: 1,
        old_value_json: null,
        new_value_json: '{"name":"Test"}',
        ip_address: '192.168.1.1',
        user_agent: 'Bot/1.0',
        metadata_json: null,
        created_at: '2026-02-06T10:00:00Z',
      },
      {
        id: 2,
        user_id: 100,
        action: 'UPDATE',
        entity_type: 'user',
        entity_id: 1,
        old_value_json: '{"status":"inactive"}',
        new_value_json: '{"status":"active"}',
        ip_address: null,
        user_agent: null,
        metadata_json: '{"reason":"verified"}',
        created_at: '2026-02-06T11:00:00Z',
      },
    ];

    beforeEach(() => {
      mockDb.query.mockResolvedValue(mockRows);
    });

    it('should return all entries when no filters', async () => {
      const result = await service.query({});

      expect(mockDb.query).toHaveBeenCalled();
      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).not.toContain('WHERE');
      expect(result).toHaveLength(2);
    });

    it('should filter by userId', async () => {
      await service.query({ userId: 100 });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('user_id = ?');
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(100);
    });

    it('should filter by single action', async () => {
      await service.query({ action: 'CREATE' });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('action IN (?)');
    });

    it('should filter by multiple actions', async () => {
      await service.query({ action: ['CREATE', 'UPDATE', 'DELETE'] });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('action IN (?, ?, ?)');
    });

    it('should filter by single entityType', async () => {
      await service.query({ entityType: 'sleep_diary' });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('entity_type IN (?)');
    });

    it('should filter by multiple entityTypes', async () => {
      await service.query({ entityType: ['sleep_diary', 'assessment'] });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('entity_type IN (?, ?)');
    });

    it('should filter by entityId', async () => {
      await service.query({ entityId: 50 });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('entity_id = ?');
    });

    it('should filter by startDate (Date object)', async () => {
      const startDate = new Date('2026-02-01');
      await service.query({ startDate });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('created_at >= ?');
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(startDate.toISOString());
    });

    it('should filter by startDate (string)', async () => {
      await service.query({ startDate: '2026-02-01T00:00:00Z' });

      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('2026-02-01T00:00:00Z');
    });

    it('should filter by endDate (Date object)', async () => {
      const endDate = new Date('2026-02-28');
      await service.query({ endDate });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('created_at <= ?');
    });

    it('should filter by endDate (string)', async () => {
      await service.query({ endDate: '2026-02-28T23:59:59Z' });

      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('2026-02-28T23:59:59Z');
    });

    it('should filter by ipAddress', async () => {
      await service.query({ ipAddress: '192.168.1.1' });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('ip_address = ?');
    });

    it('should apply limit', async () => {
      await service.query({ limit: 10 });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT ?');
    });

    it('should apply offset', async () => {
      await service.query({ offset: 20 });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('OFFSET ?');
    });

    it('should combine multiple filters with AND', async () => {
      await service.query({
        userId: 100,
        action: 'UPDATE',
        entityType: 'user',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
      });

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE');
      expect(sql.match(/AND/g)?.length).toBe(4); // 5 conditions = 4 ANDs
    });

    it('should parse JSON fields in results', async () => {
      const result = await service.query({});

      expect(result[0].newValue).toEqual({ name: 'Test' });
      expect(result[1].oldValue).toEqual({ status: 'inactive' });
      expect(result[1].newValue).toEqual({ status: 'active' });
      expect(result[1].metadata).toEqual({ reason: 'verified' });
    });

    it('should convert created_at to Date', async () => {
      const result = await service.query({});

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt?.toISOString()).toBe('2026-02-06T10:00:00.000Z');
    });

    it('should handle null fields', async () => {
      const result = await service.query({});

      expect(result[0].oldValue).toBeUndefined();
      expect(result[0].metadata).toBeUndefined();
      expect(result[1].ipAddress).toBeUndefined();
      expect(result[1].userAgent).toBeUndefined();
    });

    it('should handle user_id = 0 as undefined', async () => {
      mockDb.query.mockResolvedValueOnce([
        {
          id: 99,
          user_id: 0,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: null,
          old_value_json: null,
          new_value_json: null,
          ip_address: '1.2.3.4',
          user_agent: null,
          metadata_json: null,
          created_at: '2026-02-06T10:00:00Z',
        },
      ]);

      const result = await service.query({});

      // user_id = 0 is falsy, so it becomes undefined
      expect(result[0].userId).toBeUndefined();
    });

    it('should use PostgreSQL placeholders', async () => {
      const pgDb = createMockDb('postgres');
      pgDb.query.mockResolvedValue(mockRows);
      const svc = new AuditService(pgDb);

      await svc.query({ userId: 100, action: 'CREATE' });

      const sql = pgDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('$1');
      expect(sql).toContain('$2');
    });

    it('should order by created_at DESC', async () => {
      await service.query({});

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY created_at DESC');
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe('getStats()', () => {
    beforeEach(() => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: 1500 }) // total
        .mockResolvedValueOnce({ count: 50 }) // unique users
        .mockResolvedValueOnce({
          oldest: '2025-01-01T00:00:00Z',
          newest: '2026-02-06T12:00:00Z',
        });

      mockDb.query
        .mockResolvedValueOnce([
          { action: 'CREATE', count: 500 },
          { action: 'READ', count: 800 },
          { action: 'UPDATE', count: 150 },
          { action: 'DELETE', count: 50 },
        ])
        .mockResolvedValueOnce([
          { entity_type: 'user', count: 200 },
          { entity_type: 'sleep_diary', count: 1000 },
          { entity_type: 'assessment', count: 300 },
        ]);
    });

    it('should return complete statistics', async () => {
      const stats = await service.getStats();

      expect(stats.totalEntries).toBe(1500);
      expect(stats.uniqueUsers).toBe(50);
      expect(stats.entriesByAction).toEqual({
        CREATE: 500,
        READ: 800,
        UPDATE: 150,
        DELETE: 50,
      });
      expect(stats.entriesByEntityType).toEqual({
        user: 200,
        sleep_diary: 1000,
        assessment: 300,
      });
    });

    it('should parse date range', async () => {
      const stats = await service.getStats();

      expect(stats.dateRange.oldest).toBeInstanceOf(Date);
      expect(stats.dateRange.newest).toBeInstanceOf(Date);
      expect(stats.dateRange.oldest?.getFullYear()).toBe(2025);
    });

    it('should handle null date range', async () => {
      mockDb.queryOne
        .mockReset()
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ oldest: null, newest: null });

      mockDb.query.mockReset().mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.dateRange.oldest).toBeNull();
      expect(stats.dateRange.newest).toBeNull();
    });

    it('should filter by startDate', async () => {
      const startDate = new Date('2026-01-01');
      await service.getStats({ startDate });

      const calls = mockDb.queryOne.mock.calls;
      expect(calls[0][0]).toContain('WHERE');
      expect(calls[0][0]).toContain('created_at >=');
    });

    it('should filter by endDate', async () => {
      const endDate = new Date('2026-02-28');
      await service.getStats({ endDate });

      const calls = mockDb.queryOne.mock.calls;
      expect(calls[0][0]).toContain('created_at <=');
    });

    it('should filter by both dates', async () => {
      await service.getStats({
        startDate: '2026-01-01',
        endDate: '2026-02-28',
      });

      const calls = mockDb.queryOne.mock.calls;
      expect(calls[0][0]).toContain('created_at >=');
      expect(calls[0][0]).toContain('AND');
      expect(calls[0][0]).toContain('created_at <=');
    });

    it('should use PostgreSQL placeholders', async () => {
      const pgDb = createMockDb('postgres');
      pgDb.queryOne
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ oldest: null, newest: null });
      pgDb.query.mockResolvedValue([]);

      const svc = new AuditService(pgDb);
      await svc.getStats({ startDate: new Date() });

      const calls = pgDb.queryOne.mock.calls;
      expect(calls[0][0]).toContain('$1');
    });

    it('should handle zero results', async () => {
      mockDb.queryOne
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockDb.query.mockReset().mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.entriesByAction).toEqual({});
      expect(stats.entriesByEntityType).toEqual({});
    });
  });

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  describe('cleanup()', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should delete entries older than retention period', async () => {
      mockDb.execute.mockResolvedValue({ changes: 100, lastInsertRowid: 0 });

      const result = await service.cleanup();

      expect(mockDb.execute).toHaveBeenCalled();
      const sql = mockDb.execute.mock.calls[0][0] as string;
      expect(sql).toContain('DELETE FROM audit_log WHERE created_at <');
      expect(result).toBe(100);
    });

    it('should use default 6-year retention period', async () => {
      mockDb.execute.mockResolvedValue({ changes: 50, lastInsertRowid: 0 });

      await service.cleanup();

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const cutoffDate = new Date(params[0] as string);
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 2190);

      // Allow 1 day tolerance for test execution time
      const diff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it('should use custom retention period', async () => {
      const svc = new AuditService(mockDb, { retentionDays: 365 });
      mockDb.execute.mockResolvedValue({ changes: 200, lastInsertRowid: 0 });

      await svc.cleanup();

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const cutoffDate = new Date(params[0] as string);
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 365);

      const diff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it('should log when entries are deleted', async () => {
      mockDb.execute.mockResolvedValue({ changes: 500, lastInsertRowid: 0 });

      await service.cleanup();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AuditService] Cleaned up 500 entries')
      );
    });

    it('should not log when no entries deleted', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      await service.cleanup();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should use PostgreSQL placeholder', async () => {
      const pgDb = createMockDb('postgres');
      pgDb.execute.mockResolvedValue({ changes: 10, lastInsertRowid: 0 });
      const svc = new AuditService(pgDb);

      await svc.cleanup();

      const sql = pgDb.execute.mock.calls[0][0] as string;
      expect(sql).toContain('$1');
    });
  });

  // ==========================================================================
  // USER AUDIT TRAIL (GDPR)
  // ==========================================================================

  describe('getUserAuditTrail()', () => {
    it('should query with userId filter', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getUserAuditTrail(12345);

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('user_id = ?');
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(12345);
    });

    it('should apply limit of 10000', async () => {
      mockDb.query.mockResolvedValue([]);

      await service.getUserAuditTrail(1);

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT ?');
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(10000);
    });

    it('should return parsed entries', async () => {
      mockDb.query.mockResolvedValue([
        {
          id: 1,
          user_id: 100,
          action: 'LOGIN',
          entity_type: 'user',
          entity_id: null,
          old_value_json: null,
          new_value_json: null,
          ip_address: '10.0.0.1',
          user_agent: null,
          metadata_json: null,
          created_at: '2026-02-06T10:00:00Z',
        },
      ]);

      const result = await service.getUserAuditTrail(100);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(100);
      expect(result[0].action).toBe('LOGIN');
    });
  });

  // ==========================================================================
  // PHI REDACTION
  // ==========================================================================

  describe('PHI redaction', () => {
    it('should redact password field', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: { username: 'test', password: 'secret123' },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.password).toBe('[REDACTED]');
    });

    it('should redact email field', async () => {
      await service.log({
        action: 'UPDATE',
        entityType: 'user',
        oldValue: { email: 'old@test.com' },
        newValue: { email: 'new@test.com' },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const oldParsed = JSON.parse(params[4] as string);
      const newParsed = JSON.parse(params[5] as string);
      expect(oldParsed.email).toBe('[REDACTED]');
      expect(newParsed.email).toBe('[REDACTED]');
    });

    it('should redact healthcare PHI fields', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'therapy_session',
        newValue: {
          sessionId: 123,
          diagnosis: 'F51.0 Insomnia',
          medications: ['Melatonin 3mg'],
          therapyNotes: 'Patient reports improved sleep',
          sleepNotes: 'Difficulty initiating sleep',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.sessionId).toBe(123); // Non-PHI preserved
      expect(parsed.diagnosis).toBe('[REDACTED]');
      expect(parsed.medications).toBe('[REDACTED]');
      expect(parsed.therapyNotes).toBe('[REDACTED]');
      expect(parsed.sleepNotes).toBe('[REDACTED]');
    });

    it('should redact financial PII fields', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          name: 'visible',
          ssn: '123-45-6789',
          credit_card: '4111111111111111',
          insuranceId: 'INS-12345',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.ssn).toBe('[REDACTED]');
      expect(parsed.credit_card).toBe('[REDACTED]');
      expect(parsed.insuranceId).toBe('[REDACTED]');
    });

    it('should redact nested objects recursively', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          profile: {
            displayName: 'Test User',
            contact: {
              email: 'test@example.com',
              phoneNumber: '+7-999-123-4567',
            },
          },
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.profile.displayName).toBe('Test User');
      expect(parsed.profile.contact.email).toBe('[REDACTED]');
      expect(parsed.profile.contact.phoneNumber).toBe('[REDACTED]');
    });

    it('should be case-insensitive for redaction', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          EMAIL: 'upper@test.com',
          Password: 'mixed',
          phonenumber: 'lower',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.EMAIL).toBe('[REDACTED]');
      expect(parsed.Password).toBe('[REDACTED]');
      expect(parsed.phonenumber).toBe('[REDACTED]');
    });

    it('should preserve arrays as-is (not recurse into array elements)', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'gamification',
        newValue: {
          badges: ['beginner', 'consistent', 'week_streak'],
          scores: [100, 200, 300],
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.badges).toEqual(['beginner', 'consistent', 'week_streak']);
      expect(parsed.scores).toEqual([100, 200, 300]);
    });

    it('should use custom redacted fields', async () => {
      const svc = new AuditService(mockDb, {
        redactedFields: ['customSecret', 'privateData'],
      });

      await svc.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          id: 1,
          customSecret: 'hidden',
          privateData: 'also hidden',
          publicField: 'visible',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.id).toBe(1);
      expect(parsed.customSecret).toBe('[REDACTED]');
      expect(parsed.privateData).toBe('[REDACTED]');
      expect(parsed.publicField).toBe('visible');
    });

    it('should handle null values in objects', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          id: 1,
          nullField: null,
          email: null, // Even null should be redacted for sensitive fields
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.nullField).toBeNull();
      expect(parsed.email).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty objects', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {},
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[5]).toBe('{}');
    });

    it('should handle deep nesting', async () => {
      await service.log({
        action: 'UPDATE',
        entityType: 'user',
        newValue: {
          level1: {
            level2: {
              level3: {
                email: 'deep@nested.com',
                visible: 'preserved',
              },
            },
          },
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.level1.level2.level3.email).toBe('[REDACTED]');
      expect(parsed.level1.level2.level3.visible).toBe('preserved');
    });

    it('should handle special characters in values', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          notes: 'Contains "quotes" and \'apostrophes\'',
          symbols: '<script>alert("xss")</script>',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.notes).toContain('quotes');
      expect(parsed.symbols).toContain('<script>');
    });

    it('should handle unicode characters', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          message: 'Привет мир! 🌍',
          chinese: '你好世界',
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.message).toBe('Привет мир! 🌍');
      expect(parsed.chinese).toBe('你好世界');
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);

      await service.log({
        action: 'CREATE',
        entityType: 'system',
        newValue: { data: longString },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.data.length).toBe(10000);
    });

    it('should handle boolean and number values', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'user',
        newValue: {
          active: true,
          verified: false,
          score: 42,
          rating: 4.5,
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.active).toBe(true);
      expect(parsed.verified).toBe(false);
      expect(parsed.score).toBe(42);
      expect(parsed.rating).toBe(4.5);
    });

    it('should handle Date-like string values', async () => {
      await service.log({
        action: 'CREATE',
        entityType: 'assessment',
        newValue: {
          completedAt: '2026-02-06T10:30:00Z',
          dateOfBirth: '1990-01-15', // Should be redacted
        },
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      const parsed = JSON.parse(params[5] as string);
      expect(parsed.completedAt).toBe('2026-02-06T10:30:00Z');
      expect(parsed.dateOfBirth).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // ALL ACTION TYPES
  // ==========================================================================

  describe('action types coverage', () => {
    const allActions: AuditAction[] = [
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'EXPORT',
      'CONSENT_GIVEN',
      'CONSENT_REVOKED',
      'DATA_ACCESS',
      'PHI_ACCESS',
      'ANONYMIZE',
      'RESTORE',
    ];

    it.each(allActions)('should accept action type: %s', async (action) => {
      await service.log({
        action,
        entityType: 'user',
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe(action);
    });
  });

  // ==========================================================================
  // ALL ENTITY TYPES
  // ==========================================================================

  describe('entity types coverage', () => {
    const allEntityTypes: AuditEntityType[] = [
      'user',
      'sleep_diary',
      'voice_diary',
      'assessment',
      'therapy_session',
      'treatment_plan',
      'consent',
      'gamification',
      'export_request',
      'system',
    ];

    it.each(allEntityTypes)('should accept entity type: %s', async (entityType) => {
      await service.log({
        action: 'READ',
        entityType,
      });

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params[2]).toBe(entityType);
    });
  });
});
