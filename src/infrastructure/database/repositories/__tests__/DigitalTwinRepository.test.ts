/**
 * DigitalTwinRepository Unit Tests
 * =================================
 * Tests for Digital Twin state persistence.
 *
 * Covers:
 * - CRUD operations (findByUserId, findAll, upsert, delete)
 * - Upsert logic (insert vs update paths)
 * - Row-to-entity conversion
 * - Soft delete behavior
 * - Edge cases (null values, boolean conversion)
 *
 * Traceability:
 * - REQ-TWIN-001 (Digital Twin persistence)
 * - REQ-PLRNN-001 (PLRNN state storage)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { DigitalTwinRepository, IDigitalTwinRow, IDigitalTwinEntity } from '../DigitalTwinRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

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
 * Create mock digital twin row (database format)
 */
function createMockDigitalTwinRow(overrides: Partial<IDigitalTwinRow> = {}): IDigitalTwinRow {
  return {
    id: 1,
    user_id: 'tg_123456',
    observation_count: 14,
    state_quality: 0.85,
    is_ready: 1,
    current_metrics_json: JSON.stringify({
      sleepEfficiency: 0.82,
      avgSleepLatency: 25,
      avgWASO: 35,
    }),
    trend: 'improving',
    risk_level: 'low',
    twin_created_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-02-01T15:30:00.000Z',
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-02-01T15:30:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Create mock digital twin entity (application format)
 */
function createMockDigitalTwinEntity(overrides: Partial<IDigitalTwinEntity> = {}): IDigitalTwinEntity {
  return {
    id: 1,
    userId: 'tg_123456',
    observationCount: 14,
    stateQuality: 0.85,
    isReady: true,
    currentMetricsJson: JSON.stringify({
      sleepEfficiency: 0.82,
      avgSleepLatency: 25,
      avgWASO: 35,
    }),
    trend: 'improving',
    riskLevel: 'low',
    twinCreatedAt: new Date('2026-01-15T10:00:00.000Z'),
    lastUpdatedAt: new Date('2026-02-01T15:30:00.000Z'),
    ...overrides,
  };
}

describe('DigitalTwinRepository', () => {
  let db: IDatabaseConnection;
  let repository: DigitalTwinRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new DigitalTwinRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });

    it('should store database connection', () => {
      expect(repository).toBeInstanceOf(DigitalTwinRepository);
    });
  });

  describe('findByUserId()', () => {
    it('should find digital twin by user ID', async () => {
      const mockRow = createMockDigitalTwinRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin).not.toBeNull();
      expect(twin!.userId).toBe('tg_123456');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['tg_123456']
      );
    });

    it('should return null for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const twin = await repository.findByUserId('unknown_user');

      expect(twin).toBeNull();
    });

    it('should exclude soft-deleted twins', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId('tg_123456');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should convert is_ready 1 to true', async () => {
      const mockRow = createMockDigitalTwinRow({ is_ready: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.isReady).toBe(true);
    });

    it('should convert is_ready 0 to false', async () => {
      const mockRow = createMockDigitalTwinRow({ is_ready: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.isReady).toBe(false);
    });

    it('should parse date fields correctly', async () => {
      const mockRow = createMockDigitalTwinRow({
        twin_created_at: '2026-01-15T10:00:00.000Z',
        last_updated_at: '2026-02-01T15:30:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.twinCreatedAt).toBeInstanceOf(Date);
      expect(twin!.lastUpdatedAt).toBeInstanceOf(Date);
      expect(twin!.twinCreatedAt.toISOString()).toBe('2026-01-15T10:00:00.000Z');
      expect(twin!.lastUpdatedAt.toISOString()).toBe('2026-02-01T15:30:00.000Z');
    });

    it('should handle null currentMetricsJson', async () => {
      const mockRow = createMockDigitalTwinRow({ current_metrics_json: null });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.currentMetricsJson).toBeNull();
    });

    it('should preserve all numeric fields', async () => {
      const mockRow = createMockDigitalTwinRow({
        observation_count: 42,
        state_quality: 0.95,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.observationCount).toBe(42);
      expect(twin!.stateQuality).toBe(0.95);
    });

    it('should preserve trend and risk level strings', async () => {
      const mockRow = createMockDigitalTwinRow({
        trend: 'declining',
        risk_level: 'moderate',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.trend).toBe('declining');
      expect(twin!.riskLevel).toBe('moderate');
    });
  });

  describe('findAll()', () => {
    it('should return all non-deleted twins', async () => {
      const mockRows = [
        createMockDigitalTwinRow({ id: 1, user_id: 'user_1' }),
        createMockDigitalTwinRow({ id: 2, user_id: 'user_2' }),
        createMockDigitalTwinRow({ id: 3, user_id: 'user_3' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const twins = await repository.findAll();

      expect(twins).toHaveLength(3);
      expect(twins[0].userId).toBe('user_1');
      expect(twins[1].userId).toBe('user_2');
      expect(twins[2].userId).toBe('user_3');
    });

    it('should return empty array when no twins exist', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const twins = await repository.findAll();

      expect(twins).toHaveLength(0);
      expect(twins).toEqual([]);
    });

    it('should exclude soft-deleted twins', async () => {
      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL')
      );
    });

    it('should convert all rows to entities', async () => {
      const mockRows = [
        createMockDigitalTwinRow({ is_ready: 1 }),
        createMockDigitalTwinRow({ is_ready: 0, id: 2 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const twins = await repository.findAll();

      expect(twins[0].isReady).toBe(true);
      expect(twins[1].isReady).toBe(false);
      expect(twins[0].twinCreatedAt).toBeInstanceOf(Date);
      expect(twins[1].twinCreatedAt).toBeInstanceOf(Date);
    });
  });

  describe('upsert()', () => {
    describe('insert path (new twin)', () => {
      it('should insert new twin when not exists', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null); // No existing twin

        await repository.upsert('new_user', {
          observationCount: 7,
          stateQuality: 0.5,
          isReady: false,
          trend: 'stable',
          riskLevel: 'low',
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO digital_twins'),
          expect.any(Array)
        );
      });

      it('should set default values for optional fields on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {});

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO digital_twins'),
          expect.arrayContaining([
            'new_user',
            0, // observationCount default
            0, // stateQuality default
            0, // isReady false -> 0
            null, // currentMetricsJson default
            'stable', // trend default
            'low', // riskLevel default
          ])
        );
      });

      it('should set is_ready to 1 when isReady is true', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', { isReady: true });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        // is_ready should be 1 (4th parameter after user_id, observation_count, state_quality)
        expect(params[3]).toBe(1);
      });

      it('should set is_ready to 0 when isReady is false', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', { isReady: false });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[3]).toBe(0);
      });

      it('should set timestamps on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const beforeInsert = new Date();

        await repository.upsert('new_user', {});

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        // Last parameters should be timestamps (created_at, updated_at)
        const createdAt = new Date(params[9]);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      });

      it('should store currentMetricsJson as provided', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const metricsJson = JSON.stringify({ sleepEfficiency: 0.9 });

        await repository.upsert('new_user', { currentMetricsJson: metricsJson });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[4]).toBe(metricsJson);
      });

      it('should use provided twinCreatedAt date', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const customDate = new Date('2025-12-01T00:00:00.000Z');

        await repository.upsert('new_user', { twinCreatedAt: customDate });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[7]).toBe(customDate.toISOString());
      });
    });

    describe('update path (existing twin)', () => {
      it('should update existing twin when exists', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 }); // Existing twin

        await repository.upsert('existing_user', {
          observationCount: 21,
          stateQuality: 0.9,
          isReady: true,
          trend: 'improving',
          riskLevel: 'low',
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE digital_twins SET'),
          expect.any(Array)
        );
      });

      it('should update only specified fields', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });

        await repository.upsert('existing_user', {
          observationCount: 21,
          stateQuality: 0.9,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('observation_count = ?'),
          expect.any(Array)
        );
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('state_quality = ?'),
          expect.any(Array)
        );
      });

      it('should use default values for omitted fields on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });

        await repository.upsert('existing_user', {});

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[0]).toBe(0); // observationCount default
        expect(params[1]).toBe(0); // stateQuality default
        expect(params[2]).toBe(0); // isReady false -> 0
        expect(params[4]).toBe('stable'); // trend default
        expect(params[5]).toBe('low'); // riskLevel default
      });

      it('should update last_updated_at and updated_at', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });

        await repository.upsert('existing_user', { observationCount: 15 });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('last_updated_at = ?'),
          expect.any(Array)
        );
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('updated_at = ?'),
          expect.any(Array)
        );
      });

      it('should filter by user_id and deleted_at IS NULL', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });

        await repository.upsert('existing_user', { observationCount: 15 });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('WHERE user_id = ? AND deleted_at IS NULL'),
          expect.arrayContaining(['existing_user'])
        );
      });

      it('should use provided lastUpdatedAt date', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });
        const customDate = new Date('2026-02-15T12:00:00.000Z');

        await repository.upsert('existing_user', { lastUpdatedAt: customDate });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[6]).toBe(customDate.toISOString());
      });
    });

    describe('upsert edge cases', () => {
      it('should handle empty partial data', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await expect(repository.upsert('new_user', {})).resolves.not.toThrow();

        expect(db.execute).toHaveBeenCalled();
      });

      it('should handle undefined optional fields', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          observationCount: undefined,
          stateQuality: undefined,
          isReady: undefined,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        // Should use defaults
        expect(params[1]).toBe(0); // observationCount
        expect(params[2]).toBe(0); // stateQuality
        expect(params[3]).toBe(0); // isReady
      });

      it('should handle zero values correctly', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          observationCount: 0,
          stateQuality: 0,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[1]).toBe(0);
        expect(params[2]).toBe(0);
      });

      it('should handle high observation counts', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          observationCount: 10000,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[1]).toBe(10000);
      });

      it('should handle state quality at boundaries', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          stateQuality: 1.0,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[2]).toBe(1.0);
      });
    });
  });

  describe('deleteByUserId()', () => {
    it('should soft-delete by setting deleted_at', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        ['tg_123456']
      );
    });

    it('should only delete non-deleted twins', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should filter by correct user_id', async () => {
      await repository.deleteByUserId('specific_user_id');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['specific_user_id']
      );
    });

    it('should not throw if user not found', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0 });

      await expect(repository.deleteByUserId('non_existent')).resolves.not.toThrow();
    });

    it('should use UPDATE not DELETE', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE digital_twins SET'),
        expect.anything()
      );
    });
  });

  describe('rowToEntity() conversion', () => {
    it('should convert all fields correctly', async () => {
      const mockRow = createMockDigitalTwinRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin).toMatchObject({
        id: 1,
        userId: 'tg_123456',
        observationCount: 14,
        stateQuality: 0.85,
        isReady: true,
        trend: 'improving',
        riskLevel: 'low',
      });
    });

    it('should parse JSON metrics string', async () => {
      const metricsJson = JSON.stringify({ sleepEfficiency: 0.82 });
      const mockRow = createMockDigitalTwinRow({ current_metrics_json: metricsJson });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.currentMetricsJson).toBe(metricsJson);
      expect(JSON.parse(twin!.currentMetricsJson!)).toEqual({ sleepEfficiency: 0.82 });
    });

    it('should handle different trend values', async () => {
      const trends = ['stable', 'improving', 'declining', 'volatile'];

      for (const trend of trends) {
        const mockRow = createMockDigitalTwinRow({ trend });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const twin = await repository.findByUserId('tg_123456');

        expect(twin!.trend).toBe(trend);
      }
    });

    it('should handle different risk levels', async () => {
      const riskLevels = ['low', 'moderate', 'high', 'critical'];

      for (const riskLevel of riskLevels) {
        const mockRow = createMockDigitalTwinRow({ risk_level: riskLevel });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const twin = await repository.findByUserId('tg_123456');

        expect(twin!.riskLevel).toBe(riskLevel);
      }
    });

    it('should handle minimum observation count', async () => {
      const mockRow = createMockDigitalTwinRow({ observation_count: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.observationCount).toBe(0);
    });

    it('should handle state quality at edge values', async () => {
      const mockRow = createMockDigitalTwinRow({ state_quality: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.stateQuality).toBe(0);
    });

    it('should preserve ID from database row', async () => {
      const mockRow = createMockDigitalTwinRow({ id: 999 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const twin = await repository.findByUserId('tg_123456');

      expect(twin!.id).toBe(999);
    });
  });

  describe('integration scenarios', () => {
    it('should support create-read-update-delete cycle', async () => {
      // Create
      (db.queryOne as jest.Mock).mockResolvedValueOnce(null);
      await repository.upsert('new_user', { observationCount: 1, isReady: false });
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.any(Array)
      );

      // Read
      const mockRow = createMockDigitalTwinRow({ user_id: 'new_user', observation_count: 1 });
      (db.queryOne as jest.Mock).mockResolvedValueOnce(mockRow);
      const twin = await repository.findByUserId('new_user');
      expect(twin!.observationCount).toBe(1);

      // Update
      (db.queryOne as jest.Mock).mockResolvedValueOnce({ id: 1 });
      await repository.upsert('new_user', { observationCount: 7, isReady: true });
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );

      // Delete
      await repository.deleteByUserId('new_user');
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        expect.any(Array)
      );
    });

    it('should handle concurrent updates to different users', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce({ id: 1 })  // User 1 exists
        .mockResolvedValueOnce({ id: 2 }); // User 2 exists

      await Promise.all([
        repository.upsert('user_1', { observationCount: 10 }),
        repository.upsert('user_2', { observationCount: 20 }),
      ]);

      expect(db.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle twin ready state progression', async () => {
      // Start not ready
      (db.queryOne as jest.Mock).mockResolvedValueOnce(null);
      await repository.upsert('user', {
        observationCount: 5,
        isReady: false,
        stateQuality: 0.3,
      });

      // Become ready after sufficient observations
      (db.queryOne as jest.Mock).mockResolvedValueOnce({ id: 1 });
      await repository.upsert('user', {
        observationCount: 14,
        isReady: true,
        stateQuality: 0.85,
      });

      const lastCall = (db.execute as jest.Mock).mock.calls[1];
      const params = lastCall[1];

      expect(params[0]).toBe(14);  // observationCount
      expect(params[2]).toBe(1);   // isReady
      expect(params[1]).toBe(0.85); // stateQuality
    });
  });

  describe('error handling', () => {
    it('should propagate database errors on findByUserId', async () => {
      const dbError = new Error('Database connection failed');
      (db.queryOne as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findByUserId('tg_123456')).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors on findAll', async () => {
      const dbError = new Error('Query timeout');
      (db.query as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toThrow('Query timeout');
    });

    it('should propagate database errors on upsert', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      const dbError = new Error('Constraint violation');
      (db.execute as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.upsert('user', {})).rejects.toThrow('Constraint violation');
    });

    it('should propagate database errors on delete', async () => {
      const dbError = new Error('Write lock timeout');
      (db.execute as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.deleteByUserId('tg_123456')).rejects.toThrow('Write lock timeout');
    });
  });

  describe('SQL injection prevention', () => {
    it('should use parameterized queries for findByUserId', async () => {
      await repository.findByUserId("'; DROP TABLE digital_twins; --");

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE digital_twins; --"]
      );
    });

    it('should use parameterized queries for upsert', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert("malicious'; DELETE FROM users; --", {
        trend: "'; UPDATE digital_twins SET risk_level='critical'; --",
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["malicious'; DELETE FROM users; --"])
      );
    });

    it('should use parameterized queries for delete', async () => {
      await repository.deleteByUserId("'; DROP TABLE digital_twins; --");

      expect(db.execute).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE digital_twins; --"]
      );
    });
  });
});
