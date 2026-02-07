/**
 * PHIDataMigration Unit Tests
 * ===========================
 *
 * Tests for PHI plaintext to encrypted data migration.
 * Covers HIPAA compliance requirements:
 *
 * - Batch processing for large datasets
 * - Dry-run mode for testing
 * - Backup creation before migration
 * - Skip already-encrypted data
 * - Progress reporting
 * - Error handling
 *
 * Traceability: REQ-PHI-001 (AES-256-GCM encryption)
 *
 * @packageDocumentation
 */

import {
  PHIDataMigration,
  createPHIDataMigration,
  type IPHIMigrationConfig,
  type IMigrationProgress,
} from '../PHIDataMigration';
import type { IDatabaseConnection, ITransaction } from '../../interfaces/IDatabaseConnection';
import * as PHIEncryptionManagerModule from '../PHIEncryptionManager';

// Mock PHIEncryptionManager
jest.mock('../PHIEncryptionManager', () => {
  const mockManager = {
    isEncryptionEnabled: jest.fn().mockReturnValue(true),
    encryptField: jest.fn((value: string) => JSON.stringify({
      ciphertext: Buffer.from(value).toString('base64'),
      iv: 'mock-iv',
      authTag: 'mock-auth-tag',
    })),
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

// Mock BackupService
jest.mock('../BackupService', () => ({
  BackupService: jest.fn().mockImplementation(() => ({
    backup: jest.fn().mockResolvedValue({
      success: true,
      metadata: { backupPath: '/mock/backup/path.db' },
    }),
  })),
}));

/**
 * PHI fields from PHIDataMigration.ts
 */
const PHI_FIELD_DEFINITIONS = [
  { table: 'users', field: 'first_name' },
  { table: 'users', field: 'last_name' },
  { table: 'sleep_diary_entries', field: 'notes' },
  { table: 'therapy_sessions', field: 'notes_json' },
];

/**
 * Create mock database connection
 * Uses table_field as key to simulate per-field data
 */
function createMockDb(
  data: Record<string, Array<{ id: number; value: string }>> = {},
  options: { onlyTables?: string[] } = {}
): IDatabaseConnection {
  const mockData = { ...data };

  const mockTransaction: ITransaction = {
    execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  // Track which tables/fields exist
  const existingTables = new Set(Object.keys(mockData).map(k => k.split('_')[0]));
  if (options.onlyTables) {
    existingTables.clear();
    options.onlyTables.forEach(t => existingTables.add(t));
  }

  return {
    type: 'sqlite' as const,
    isConnected: true,
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      // Parse table and field from SELECT query
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      const fieldMatch = sql.match(/,\s*(\w+)\s+as\s+value/i);
      if (!tableMatch) return Promise.resolve([]);

      const table = tableMatch[1];
      const field = fieldMatch?.[1] || 'value';

      // Look for table_field key first, then just table
      const key = `${table}_${field}`;
      const tableData = mockData[key] || mockData[table] || [];

      // Handle LIMIT OFFSET
      if (sql.includes('LIMIT') && params) {
        const limit = Number(params[0]) || 100;
        const offset = Number(params[1]) || 0;
        return Promise.resolve(tableData.slice(offset, offset + limit));
      }

      return Promise.resolve(tableData);
    }),
    queryOne: jest.fn().mockImplementation((sql: string, _params?: unknown[]) => {
      // Handle COUNT queries
      if (sql.includes('COUNT(*)')) {
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) return Promise.resolve({ count: 0 });

        const table = tableMatch[1];

        // Find the field being counted
        const fieldMatch = sql.match(/WHERE\s+(\w+)\s+IS NOT NULL/i);
        const field = fieldMatch?.[1] || 'value';

        const key = `${table}_${field}`;
        const tableData = mockData[key] || mockData[table] || [];

        // Count encrypted vs plaintext
        if (sql.includes('LIKE')) {
          const encrypted = tableData.filter(r => r.value.startsWith('{"ciphertext"'));
          return Promise.resolve({ count: encrypted.length });
        }

        return Promise.resolve({ count: tableData.length });
      }
      return Promise.resolve(null);
    }),
    execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
    beginTransaction: jest.fn().mockResolvedValue(mockTransaction),
    transaction: jest.fn().mockImplementation(async (fn: (tx: ITransaction) => Promise<void>) => {
      await fn(mockTransaction);
    }),
    tableExists: jest.fn().mockImplementation((tableName: string) => {
      // Check if any key starts with tableName
      const hasData = Object.keys(mockData).some(k =>
        k === tableName || k.startsWith(tableName + '_')
      );
      return Promise.resolve(hasData || existingTables.has(tableName));
    }),
    healthCheck: jest.fn().mockResolvedValue({
      connected: true,
      latencyMs: 1,
      version: 'SQLite mock',
    }),
  };
}

describe('PHIDataMigration', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create migration instance', () => {
      const db = createMockDb();
      const migration = new PHIDataMigration(db);
      expect(migration).toBeDefined();
    });

    it('should create via factory function', () => {
      const db = createMockDb();
      const migration = createPHIDataMigration(db);
      expect(migration).toBeDefined();
    });
  });

  describe('migrate() - encryption disabled', () => {
    it('should fail when encryption is not enabled', async () => {
      const db = createMockDb();
      const mockManager = PHIEncryptionManagerModule.getPHIEncryptionManager();
      (mockManager.isEncryptionEnabled as jest.Mock).mockReturnValueOnce(false);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate();

      expect(result.success).toBe(false);
      expect(result.totalErrors).toBe(1);
      expect(result.errors[0].error).toBe('Encryption not enabled');
    });
  });

  describe('migrate() - dry run mode', () => {
    it('should not modify data in dry run mode', async () => {
      // Use specific table_field keys
      const testData = {
        users_first_name: [
          { id: 1, value: 'John' },
          { id: 2, value: 'Jane' },
        ],
        // Other fields empty
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.totalEncrypted).toBe(2); // Would encrypt 2 records
      expect(db.transaction).not.toHaveBeenCalled(); // No actual writes
    });

    it('should skip already encrypted records in dry run', async () => {
      const encryptedValue = JSON.stringify({
        ciphertext: 'abc123',
        iv: 'iv123',
        authTag: 'tag123',
      });

      const testData = {
        users_first_name: [
          { id: 1, value: 'Plaintext Name' },
          { id: 2, value: encryptedValue }, // Already encrypted
        ],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.totalEncrypted).toBe(1); // Only 1 plaintext
      expect(result.totalSkipped).toBe(1);  // 1 already encrypted
    });
  });

  describe('migrate() - live mode', () => {
    it('should encrypt plaintext records', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'John Doe' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({
        dryRun: false,
        createBackup: false, // Skip backup for test
      });

      expect(result.success).toBe(true);
      expect(result.totalEncrypted).toBe(1);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should create backup before migration by default', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Test' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: false });

      expect(result.backupPath).toBe('/mock/backup/path.db');
    });

    it('should skip backup when createBackup is false', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Test' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({
        dryRun: false,
        createBackup: false,
      });

      expect(result.backupPath).toBeUndefined();
    });
  });

  describe('migrate() - batch processing', () => {
    it('should process records in batches', async () => {
      // Create 250 records to test batching
      const records = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        value: `User ${i + 1}`,
      }));

      const testData = {
        users_first_name: records,
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({
        dryRun: true,
        batchSize: 100,
      });

      expect(result.success).toBe(true);
      expect(result.totalEncrypted).toBe(250);

      // Should have queried multiple times for batches
      expect(db.query).toHaveBeenCalled();
    });

    it('should use custom batch size', async () => {
      const testData = {
        users_first_name: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          value: `User ${i + 1}`,
        })),
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      await migration.migrate({
        dryRun: true,
        batchSize: 25,
      });

      // Should have been called at least twice with offset for 50 records
      const queryCalls = (db.query as jest.Mock).mock.calls.filter(
        call => call[0].includes('LIMIT')
      );
      expect(queryCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('migrate() - progress reporting', () => {
    it('should report progress via callback', async () => {
      const testData = {
        users_first_name: [
          { id: 1, value: 'User 1' },
          { id: 2, value: 'User 2' },
        ],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const progressUpdates: IMigrationProgress[] = [];
      const onProgress = jest.fn((progress: IMigrationProgress) => {
        progressUpdates.push({ ...progress });
      });

      const migration = new PHIDataMigration(db);
      await migration.migrate({
        dryRun: true,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check progress structure
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      expect(lastProgress).toHaveProperty('table');
      expect(lastProgress).toHaveProperty('field');
      expect(lastProgress).toHaveProperty('processed');
      expect(lastProgress).toHaveProperty('total');
      expect(lastProgress).toHaveProperty('percentComplete');
    });
  });

  describe('migrate() - table handling', () => {
    it('should skip non-existent tables', async () => {
      const db = createMockDb({}); // Empty data = no tables
      (db.tableExists as jest.Mock).mockResolvedValue(false);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.totalEncrypted).toBe(0);
      expect(result.fields.every(f => f.totalRecords === 0)).toBe(true);
    });

    it('should handle empty tables', async () => {
      const testData = {
        users_first_name: [], // Exists but empty
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.totalEncrypted).toBe(0);
    });
  });

  describe('migrate() - error handling', () => {
    it('should handle backup failure gracefully', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Test' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      // Mock backup failure
      const BackupService = require('../BackupService').BackupService;
      BackupService.mockImplementationOnce(() => ({
        backup: jest.fn().mockResolvedValue({
          success: false,
          error: 'Disk full',
        }),
      }));

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: false });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Backup failed');
    });

    it('should continue with errors and report them', async () => {
      const testData = {
        users_first_name: [
          { id: 1, value: 'User 1' },
          { id: 2, value: 'User 2' },
        ],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      // Make transaction throw for specific record
      let callCount = 0;
      (db.transaction as jest.Mock).mockImplementation(async (fn: (tx: ITransaction) => Promise<void>) => {
        const tx: ITransaction = {
          execute: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              throw new Error('Database write error');
            }
            return Promise.resolve({ changes: 1, lastInsertRowid: 1 });
          }),
          query: jest.fn().mockResolvedValue([]),
          queryOne: jest.fn().mockResolvedValue(null),
          commit: jest.fn().mockResolvedValue(undefined),
          rollback: jest.fn().mockResolvedValue(undefined),
        };
        await fn(tx);
      });

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({
        dryRun: false,
        createBackup: false,
      });

      // Should have some errors but also some successes
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus()', () => {
    it('should return encryption status', async () => {
      const testData = {
        users_first_name: [
          { id: 1, value: 'Plaintext' },
          { id: 2, value: JSON.stringify({ ciphertext: 'abc', iv: 'iv', authTag: 'tag' }) },
        ],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const status = await migration.getStatus();

      expect(status.encryptionEnabled).toBe(true);
      expect(status.fields).toBeDefined();
      expect(status.fields.length).toBeGreaterThan(0);
    });

    it('should show 0 for non-existent tables', async () => {
      const db = createMockDb({});
      (db.tableExists as jest.Mock).mockResolvedValue(false);

      const migration = new PHIDataMigration(db);
      const status = await migration.getStatus();

      expect(status.fields.every(f => f.total === 0)).toBe(true);
      expect(status.fields.every(f => f.plaintext === 0)).toBe(true);
      expect(status.fields.every(f => f.encrypted === 0)).toBe(true);
    });

    it('should calculate plaintext vs encrypted correctly', async () => {
      const testData = {
        users_first_name: [
          { id: 1, value: 'plain1' },
          { id: 2, value: 'plain2' },
          { id: 3, value: JSON.stringify({ ciphertext: 'enc', iv: 'iv', authTag: 'tag' }) },
        ],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      // Override queryOne to return specific counts for first_name field
      (db.queryOne as jest.Mock).mockImplementation((sql: string) => {
        if (sql.includes('first_name')) {
          if (sql.includes('LIKE')) {
            return Promise.resolve({ count: 1 }); // 1 encrypted
          }
          return Promise.resolve({ count: 3 }); // 3 total
        }
        // Other fields return 0
        return Promise.resolve({ count: 0 });
      });

      const migration = new PHIDataMigration(db);
      const status = await migration.getStatus();

      const usersField = status.fields.find(f => f.table === 'users' && f.field === 'first_name');
      expect(usersField).toBeDefined();
      expect(usersField!.total).toBe(3);
      expect(usersField!.encrypted).toBe(1);
      expect(usersField!.plaintext).toBe(2);
    });
  });

  describe('isAlreadyEncrypted() (via migrate)', () => {
    it('should detect JSON with ciphertext as encrypted', async () => {
      const encryptedValue = JSON.stringify({
        ciphertext: 'encrypted-data',
        iv: 'initialization-vector',
        authTag: 'authentication-tag',
      });

      const testData = {
        users_first_name: [{ id: 1, value: encryptedValue }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.totalSkipped).toBe(1);
      expect(result.totalEncrypted).toBe(0);
    });

    it('should treat plaintext as not encrypted', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Plain text name' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.totalEncrypted).toBe(1);
      expect(result.totalSkipped).toBe(0);
    });

    it('should treat invalid JSON as not encrypted', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: '{invalid json' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.totalEncrypted).toBe(1);
    });

    it('should treat JSON without ciphertext as not encrypted', async () => {
      const jsonValue = JSON.stringify({ name: 'John', age: 30 });
      const testData = {
        users_first_name: [{ id: 1, value: jsonValue }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.totalEncrypted).toBe(1);
    });
  });

  describe('PHI fields coverage', () => {
    it('should migrate all defined PHI fields', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'First Name' }],
        users_last_name: [{ id: 1, value: 'Last Name' }],
        sleep_diary_entries_notes: [{ id: 1, value: 'Sleep notes' }],
        therapy_sessions_notes_json: [{ id: 1, value: '{"notes": "therapy notes"}' }],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      // Check that multiple tables are processed
      const tables = result.fields.map(f => f.table);
      expect(tables).toContain('users');
      expect(tables).toContain('sleep_diary_entries');
      expect(tables).toContain('therapy_sessions');
    });
  });

  describe('migration result structure', () => {
    it('should return complete result structure', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Test' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      // Verify all required fields
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('dryRun');
      expect(result).toHaveProperty('fields');
      expect(result).toHaveProperty('totalEncrypted');
      expect(result).toHaveProperty('totalSkipped');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('errors');

      // Timestamps should be valid
      expect(result.startTime instanceof Date).toBe(true);
      expect(result.endTime instanceof Date).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should include field-level results', async () => {
      const testData = {
        users_first_name: [{ id: 1, value: 'Test' }],
        users_last_name: [],
        sleep_diary_entries_notes: [],
        therapy_sessions_notes_json: [],
      };
      const db = createMockDb(testData);

      const migration = new PHIDataMigration(db);
      const result = await migration.migrate({ dryRun: true });

      expect(result.fields.length).toBeGreaterThan(0);

      const fieldResult = result.fields[0];
      expect(fieldResult).toHaveProperty('table');
      expect(fieldResult).toHaveProperty('field');
      expect(fieldResult).toHaveProperty('totalRecords');
      expect(fieldResult).toHaveProperty('encryptedRecords');
      expect(fieldResult).toHaveProperty('skippedRecords');
      expect(fieldResult).toHaveProperty('errorRecords');
      expect(fieldResult).toHaveProperty('durationMs');
    });
  });
});
