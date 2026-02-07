/**
 * UserRepository Unit Tests
 * =========================
 *
 * Tests for user data access with GDPR compliance.
 * Covers:
 *
 * - CRUD operations
 * - GDPR Article 17: Right to Erasure (anonymizeUser)
 * - GDPR Article 15: Right of Access (exportUserData)
 * - Consent management
 * - PHI encryption on read/write
 *
 * Traceability:
 * - REQ-GDPR-001 (Right to erasure)
 * - REQ-PHI-001 (PHI encryption)
 *
 * @packageDocumentation
 */

import { UserRepository } from '../UserRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

// Mock PHIEncryptionManager
jest.mock('../../security/PHIEncryptionManager', () => {
  const mockManager = {
    isEncryptionEnabled: jest.fn().mockReturnValue(true),
    encryptField: jest.fn((value: string | null | undefined) => {
      if (value === null || value === undefined) return null;
      return JSON.stringify({
        ciphertext: Buffer.from(value).toString('base64'),
        iv: 'mock-iv',
        authTag: 'mock-auth-tag',
      });
    }),
    decryptField: jest.fn((value: string | null | undefined) => {
      if (!value) return null;
      try {
        const parsed = JSON.parse(value);
        if (parsed.ciphertext) {
          return Buffer.from(parsed.ciphertext, 'base64').toString();
        }
      } catch {
        return value;
      }
      return value;
    }),
  };

  return {
    getPHIEncryptionManager: jest.fn().mockReturnValue(mockManager),
    PHIEncryptionManager: jest.fn().mockImplementation(() => mockManager),
  };
});

/**
 * Create mock database connection
 */
function createMockDb(): IDatabaseConnection {
  return {
    type: 'sqlite' as const,
    isConnected: true,
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
    execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
    beginTransaction: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
      query: jest.fn().mockResolvedValue([]),
      queryOne: jest.fn().mockResolvedValue(null),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
    transaction: jest.fn().mockImplementation(async (fn) => {
      const tx = {
        execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
        query: jest.fn().mockResolvedValue([]),
        queryOne: jest.fn().mockResolvedValue(null),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    }),
    tableExists: jest.fn().mockResolvedValue(true),
    healthCheck: jest.fn().mockResolvedValue({
      connected: true,
      latencyMs: 1,
      version: 'SQLite mock',
    }),
  };
}

/**
 * Create mock user row (database format)
 */
function createMockUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  const encryptedFirstName = JSON.stringify({
    ciphertext: Buffer.from('John').toString('base64'),
    iv: 'mock-iv',
    authTag: 'mock-auth-tag',
  });
  const encryptedLastName = JSON.stringify({
    ciphertext: Buffer.from('Doe').toString('base64'),
    iv: 'mock-iv',
    authTag: 'mock-auth-tag',
  });

  return {
    id: 1,
    external_id: 'tg_123456',
    email: 'john@example.com',
    first_name: encryptedFirstName,
    last_name: encryptedLastName,
    chronotype: 'moderate_evening',
    prakriti: null,
    tcm_constitution: null,
    timezone: 'Europe/Moscow',
    locale: 'ru',
    settings_json: null,
    consent_given: 1,
    consent_date: '2026-01-01T12:00:00.000Z',
    last_activity_at: '2026-02-01T10:30:00.000Z',
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-02-01T10:30:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('UserRepository', () => {
  let db: IDatabaseConnection;
  let repository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new UserRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('findByExternalId()', () => {
    it('should find user by external ID', async () => {
      const mockRow = createMockUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user).not.toBeNull();
      expect(user!.externalId).toBe('tg_123456');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('external_id = ?'),
        ['tg_123456']
      );
    });

    it('should return null for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const user = await repository.findByExternalId('unknown');

      expect(user).toBeNull();
    });

    it('should decrypt PHI fields on read', async () => {
      const mockRow = createMockUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.firstName).toBe('John');
      expect(user!.lastName).toBe('Doe');
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email', async () => {
      const mockRow = createMockUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByEmail('john@example.com');

      expect(user).not.toBeNull();
      expect(user!.email).toBe('john@example.com');
    });

    it('should exclude deleted users', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByEmail('deleted@example.com');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });
  });

  describe('updateLastActivity()', () => {
    it('should update last activity timestamp', async () => {
      await repository.updateLastActivity(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("last_activity_at = datetime('now')"),
        [123]
      );
    });

    it('should also update updated_at', async () => {
      await repository.updateLastActivity(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("updated_at = datetime('now')"),
        expect.anything()
      );
    });
  });

  describe('hasConsent()', () => {
    it('should return true when consent is given', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ consent_given: 1 });

      const hasConsent = await repository.hasConsent(123);

      expect(hasConsent).toBe(true);
    });

    it('should return false when consent is not given', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ consent_given: 0 });

      const hasConsent = await repository.hasConsent(123);

      expect(hasConsent).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const hasConsent = await repository.hasConsent(999);

      expect(hasConsent).toBe(false);
    });
  });

  describe('recordConsent()', () => {
    it('should record user consent', async () => {
      await repository.recordConsent(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('consent_given = 1'),
        [123]
      );
    });

    it('should set consent_date', async () => {
      await repository.recordConsent(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("consent_date = datetime('now')"),
        expect.anything()
      );
    });
  });

  describe('getInactiveUsers()', () => {
    it('should find users inactive for N days', async () => {
      const mockRows = [createMockUserRow(), createMockUserRow({ id: 2 })];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const users = await repository.getInactiveUsers(30);

      expect(users).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('days'),
        [30]
      );
    });

    it('should return empty array when no inactive users', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const users = await repository.getInactiveUsers(7);

      expect(users).toHaveLength(0);
    });
  });

  describe('exportUserData() - GDPR Article 15', () => {
    it('should export all user data', async () => {
      const mockRow = createMockUserRow();
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(mockRow) // findById
        .mockResolvedValueOnce({ count: 30 }) // diary count
        .mockResolvedValueOnce({ count: 5 }) // assessment count
        .mockResolvedValueOnce({ count: 8 }); // session count

      const exportData = await repository.exportUserData(123);

      expect(exportData.user).not.toBeNull();
      expect(exportData.sleepDiaries).toBe(30);
      expect(exportData.assessments).toBe(5);
      expect(exportData.therapySessions).toBe(8);
    });

    it('should return zeros for user with no data', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockUserRow())
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });

      const exportData = await repository.exportUserData(123);

      expect(exportData.sleepDiaries).toBe(0);
      expect(exportData.assessments).toBe(0);
      expect(exportData.therapySessions).toBe(0);
    });

    it('should return null user for non-existent user', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(null) // findById returns null
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });

      const exportData = await repository.exportUserData(999);

      expect(exportData.user).toBeNull();
    });
  });

  describe('anonymizeUser() - GDPR Article 17 Right to Erasure', () => {
    it('should anonymize user data', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const result = await repository.anonymizeUser(123);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalled();
    });

    it('should set email to NULL', async () => {
      await repository.anonymizeUser(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('email = NULL'),
        expect.anything()
      );
    });

    it('should replace first_name with encrypted "Anonymized"', async () => {
      await repository.anonymizeUser(123);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const sql = call[0];
      const params = call[1];

      expect(sql).toContain('first_name = ?');
      // Verify the encrypted value is passed (contains ciphertext)
      expect(params[1]).toContain('ciphertext');
    });

    it('should replace last_name with encrypted "User"', async () => {
      await repository.anonymizeUser(123);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      // params[2] should be the encrypted "User"
      expect(params[2]).toContain('ciphertext');
    });

    it('should generate unique anonymized external_id', async () => {
      await repository.anonymizeUser(123);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      // params[0] should be the anonymized ID
      expect(params[0]).toMatch(/^anon_\d+_/);
    });

    it('should set deleted_at timestamp', async () => {
      await repository.anonymizeUser(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        expect.anything()
      );
    });

    it('should update updated_at timestamp', async () => {
      await repository.anonymizeUser(123);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("updated_at = datetime('now')"),
        expect.anything()
      );
    });

    it('should return false when user not found', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.anonymizeUser(999);

      expect(result).toBe(false);
    });

    it('should pass correct user ID', async () => {
      await repository.anonymizeUser(456);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      // Last param should be the userId
      expect(params[params.length - 1]).toBe(456);
    });

    it('should use unique identifier for each anonymization', async () => {
      // Anonymize two users
      await repository.anonymizeUser(1);
      await repository.anonymizeUser(2);

      const call1 = (db.execute as jest.Mock).mock.calls[0];
      const call2 = (db.execute as jest.Mock).mock.calls[1];

      const anonId1 = call1[1][0];
      const anonId2 = call2[1][0];

      // IDs should be different (includes timestamp and random component)
      expect(anonId1).not.toBe(anonId2);
    });
  });

  describe('PHI encryption integration', () => {
    it('should encrypt firstName on write', async () => {
      const db = createMockDb();
      const repository = new UserRepository(db);

      // Access internal method via prototype
      const params = (repository as any).entityToParams({
        firstName: 'John',
      });

      expect(params.first_name).toContain('ciphertext');
    });

    it('should encrypt lastName on write', async () => {
      const db = createMockDb();
      const repository = new UserRepository(db);

      const params = (repository as any).entityToParams({
        lastName: 'Doe',
      });

      expect(params.last_name).toContain('ciphertext');
    });

    it('should handle null PHI fields', async () => {
      const mockRow = createMockUserRow({
        first_name: null,
        last_name: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.firstName).toBeUndefined();
      expect(user!.lastName).toBeUndefined();
    });
  });

  describe('rowToEntity conversion', () => {
    it('should convert database row to entity', async () => {
      const mockRow = createMockUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user).toMatchObject({
        id: 1,
        externalId: 'tg_123456',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        chronotype: 'moderate_evening',
        timezone: 'Europe/Moscow',
        locale: 'ru',
        consentGiven: true,
      });
    });

    it('should convert consent_given 0 to false', async () => {
      const mockRow = createMockUserRow({ consent_given: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.consentGiven).toBe(false);
    });

    it('should parse date fields correctly', async () => {
      const mockRow = createMockUserRow({
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-02-01T15:30:00.000Z',
        consent_date: '2026-01-15T10:00:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.createdAt).toBeInstanceOf(Date);
      expect(user!.updatedAt).toBeInstanceOf(Date);
      expect(user!.consentDate).toBeInstanceOf(Date);
    });

    it('should use default timezone and locale', async () => {
      const mockRow = createMockUserRow({
        timezone: null,
        locale: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.timezone).toBe('UTC');
      expect(user!.locale).toBe('en');
    });

    it('should handle deleted_at correctly', async () => {
      const mockRow = createMockUserRow({
        deleted_at: '2026-02-01T12:00:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.deletedAt).toBeInstanceOf(Date);
    });

    it('should set deletedAt to null when not deleted', async () => {
      const mockRow = createMockUserRow({ deleted_at: null });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByExternalId('tg_123456');

      expect(user!.deletedAt).toBeNull();
    });
  });

  describe('entityToParams conversion', () => {
    it('should convert entity fields to database params', () => {
      const params = (repository as any).entityToParams({
        id: 1,
        externalId: 'tg_123',
        email: 'test@example.com',
        chronotype: 'morning',
        timezone: 'UTC',
        locale: 'en',
        consentGiven: true,
      });

      expect(params.id).toBe(1);
      expect(params.external_id).toBe('tg_123');
      expect(params.email).toBe('test@example.com');
      expect(params.chronotype).toBe('morning');
      expect(params.timezone).toBe('UTC');
      expect(params.locale).toBe('en');
      expect(params.consent_given).toBe(1);
    });

    it('should convert consentGiven false to 0', () => {
      const params = (repository as any).entityToParams({
        consentGiven: false,
      });

      expect(params.consent_given).toBe(0);
    });

    it('should handle Date objects for consentDate', () => {
      const date = new Date('2026-01-15T10:00:00.000Z');
      const params = (repository as any).entityToParams({
        consentDate: date,
      });

      expect(params.consent_date).toBe(date.toISOString());
    });

    it('should handle string dates for lastActivityAt', () => {
      const params = (repository as any).entityToParams({
        lastActivityAt: '2026-01-15T10:00:00.000Z',
      });

      expect(params.last_activity_at).toBe('2026-01-15T10:00:00.000Z');
    });
  });
});
