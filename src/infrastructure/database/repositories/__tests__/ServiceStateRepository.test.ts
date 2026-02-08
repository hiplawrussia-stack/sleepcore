/**
 * ServiceStateRepository Unit Tests
 * ==================================
 * Tests for generic service state persistence.
 *
 * Covers:
 * - get: retrieve state for user+service
 * - getAllForService: retrieve all users' state for a service
 * - set: insert/update state (upsert pattern)
 * - delete: soft delete state
 *
 * Edge cases:
 * - Different serviceName for same userId
 * - JSON serialization/deserialization of complex objects
 * - Null handling and soft delete behavior
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { ServiceStateRepository, IServiceStateRow } from '../ServiceStateRepository';
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
 * Create mock service state row
 */
function createMockStateRow(overrides: Partial<IServiceStateRow> = {}): IServiceStateRow {
  return {
    id: 1,
    user_id: 'user_123',
    service_name: 'test_service',
    state_json: JSON.stringify({ key: 'value', count: 42 }),
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-02-01T10:30:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('ServiceStateRepository', () => {
  let db: IDatabaseConnection;
  let repository: ServiceStateRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new ServiceStateRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('get()', () => {
    it('should return parsed state when found', async () => {
      const mockRow = createMockStateRow({
        state_json: JSON.stringify({ status: 'active', level: 5 }),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user_123', 'test_service');

      expect(state).toEqual({ status: 'active', level: 5 });
    });

    it('should return null when state not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const state = await repository.get('unknown_user', 'test_service');

      expect(state).toBeNull();
    });

    it('should query with correct userId and serviceName', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.get('user_456', 'proactive_service');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['user_456', 'proactive_service']
      );
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('service_name = ?'),
        expect.anything()
      );
    });

    it('should exclude soft-deleted records', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.get('user_123', 'test_service');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should deserialize complex nested objects', async () => {
      const complexState = {
        nested: {
          deep: {
            value: 'test',
          },
        },
        array: [1, 2, { nested: true }],
        nullValue: null,
        boolValue: false,
        numValue: 3.14,
      };
      const mockRow = createMockStateRow({
        state_json: JSON.stringify(complexState),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user_123', 'test_service');

      expect(state).toEqual(complexState);
    });

    it('should deserialize arrays', async () => {
      const arrayState = [1, 2, 3, 'four', { five: 5 }];
      const mockRow = createMockStateRow({
        state_json: JSON.stringify(arrayState),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user_123', 'test_service');

      expect(state).toEqual(arrayState);
    });

    it('should deserialize primitive values', async () => {
      const mockRow = createMockStateRow({
        state_json: JSON.stringify(42),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user_123', 'test_service');

      expect(state).toBe(42);
    });

    it('should deserialize null value', async () => {
      const mockRow = createMockStateRow({
        state_json: 'null',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user_123', 'test_service');

      expect(state).toBeNull();
    });
  });

  describe('getAllForService()', () => {
    it('should return all users state for a service', async () => {
      const mockRows = [
        createMockStateRow({
          user_id: 'user_1',
          state_json: JSON.stringify({ score: 10 }),
        }),
        createMockStateRow({
          id: 2,
          user_id: 'user_2',
          state_json: JSON.stringify({ score: 20 }),
        }),
        createMockStateRow({
          id: 3,
          user_id: 'user_3',
          state_json: JSON.stringify({ score: 30 }),
        }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getAllForService('gamification');

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ userId: 'user_1', state: { score: 10 } });
      expect(results[1]).toEqual({ userId: 'user_2', state: { score: 20 } });
      expect(results[2]).toEqual({ userId: 'user_3', state: { score: 30 } });
    });

    it('should return empty array when no records found', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const results = await repository.getAllForService('empty_service');

      expect(results).toEqual([]);
    });

    it('should query with correct serviceName', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getAllForService('proactive_check');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('service_name = ?'),
        ['proactive_check']
      );
    });

    it('should exclude soft-deleted records', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getAllForService('test_service');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should parse different state structures per user', async () => {
      const mockRows = [
        createMockStateRow({
          user_id: 'user_1',
          state_json: JSON.stringify({ type: 'a', value: 1 }),
        }),
        createMockStateRow({
          id: 2,
          user_id: 'user_2',
          state_json: JSON.stringify({ type: 'b', items: [1, 2, 3] }),
        }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getAllForService('mixed_service');

      expect(results[0].state).toEqual({ type: 'a', value: 1 });
      expect(results[1].state).toEqual({ type: 'b', items: [1, 2, 3] });
    });
  });

  describe('set()', () => {
    describe('insert (new record)', () => {
      it('should insert new state when record does not exist', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null); // No existing record

        await repository.set('new_user', 'new_service', { status: 'initialized' });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO service_state'),
          expect.anything()
        );
      });

      it('should pass correct parameters on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const state = { key: 'value', num: 123 };

        await repository.set('user_abc', 'my_service', state);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];

        expect(params[0]).toBe('user_abc'); // user_id
        expect(params[1]).toBe('my_service'); // service_name
        expect(params[2]).toBe(JSON.stringify(state)); // state_json
        // params[3] and params[4] are timestamps
      });

      it('should serialize complex state on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const complexState = {
          nested: { deep: { value: 'test' } },
          array: [1, 2, 3],
          boolean: true,
        };

        await repository.set('user_123', 'service', complexState);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe(JSON.stringify(complexState));
      });

      it('should include timestamps on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.set('user_123', 'service', { data: 1 });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('created_at'),
          expect.anything()
        );
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('updated_at'),
          expect.anything()
        );
      });
    });

    describe('update (existing record)', () => {
      it('should update existing state when record exists', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 }); // Existing record

        await repository.set('existing_user', 'existing_service', { updated: true });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE service_state'),
          expect.anything()
        );
      });

      it('should pass correct parameters on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 });
        const newState = { level: 5, xp: 1000 };

        await repository.set('user_xyz', 'game_service', newState);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];

        expect(params[0]).toBe(JSON.stringify(newState)); // state_json
        // params[1] is updated_at timestamp
        expect(params[2]).toBe('user_xyz'); // user_id in WHERE
        expect(params[3]).toBe('game_service'); // service_name in WHERE
      });

      it('should only update state_json and updated_at', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.set('user', 'service', { new: 'state' });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('state_json = ?'),
          expect.anything()
        );
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('updated_at = ?'),
          expect.anything()
        );
      });

      it('should include deleted_at IS NULL in update WHERE clause', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.set('user', 'service', { data: 1 });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });
    });

    describe('serialization', () => {
      it('should serialize arrays', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const arrayState = [1, 'two', { three: 3 }];

        await repository.set('user', 'service', arrayState);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe(JSON.stringify(arrayState));
      });

      it('should serialize null', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.set('user', 'service', null);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe('null');
      });

      it('should serialize primitive number', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.set('user', 'service', 42);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe('42');
      });

      it('should serialize primitive string', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.set('user', 'service', 'simple string');

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe('"simple string"');
      });

      it('should serialize boolean', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.set('user', 'service', true);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1] as unknown[];
        expect(params[2]).toBe('true');
      });
    });
  });

  describe('delete()', () => {
    it('should perform soft delete', async () => {
      await repository.delete('user_123', 'service_to_delete');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE service_state'),
        expect.anything()
      );
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at'),
        expect.anything()
      );
    });

    it('should set deleted_at to current timestamp', async () => {
      await repository.delete('user', 'service');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        expect.anything()
      );
    });

    it('should pass correct userId and serviceName', async () => {
      await repository.delete('user_abc', 'my_service');

      expect(db.execute).toHaveBeenCalledWith(expect.anything(), [
        'user_abc',
        'my_service',
      ]);
    });

    it('should only affect non-deleted records', async () => {
      await repository.delete('user', 'service');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should not throw when record does not exist', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      await expect(
        repository.delete('nonexistent_user', 'nonexistent_service')
      ).resolves.not.toThrow();
    });
  });

  describe('edge cases: different serviceName for same userId', () => {
    it('should get different states for same user with different services', async () => {
      const stateA = { service: 'A', data: 1 };
      const stateB = { service: 'B', data: 2 };

      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(
          createMockStateRow({
            user_id: 'user_123',
            service_name: 'service_a',
            state_json: JSON.stringify(stateA),
          })
        )
        .mockResolvedValueOnce(
          createMockStateRow({
            user_id: 'user_123',
            service_name: 'service_b',
            state_json: JSON.stringify(stateB),
          })
        );

      const resultA = await repository.get('user_123', 'service_a');
      const resultB = await repository.get('user_123', 'service_b');

      expect(resultA).toEqual(stateA);
      expect(resultB).toEqual(stateB);
    });

    it('should set states independently for same user with different services', async () => {
      // First set for service_a (no existing)
      (db.queryOne as jest.Mock).mockResolvedValueOnce(null);
      await repository.set('user_123', 'service_a', { a: 1 });

      // Second set for service_b (no existing)
      (db.queryOne as jest.Mock).mockResolvedValueOnce(null);
      await repository.set('user_123', 'service_b', { b: 2 });

      expect(db.execute).toHaveBeenCalledTimes(2);

      // Verify first insert
      const firstCall = (db.execute as jest.Mock).mock.calls[0];
      expect(firstCall[1][0]).toBe('user_123');
      expect(firstCall[1][1]).toBe('service_a');

      // Verify second insert
      const secondCall = (db.execute as jest.Mock).mock.calls[1];
      expect(secondCall[1][0]).toBe('user_123');
      expect(secondCall[1][1]).toBe('service_b');
    });

    it('should delete only specific service state for user', async () => {
      await repository.delete('user_123', 'service_a');
      await repository.delete('user_123', 'service_b');

      expect(db.execute).toHaveBeenCalledTimes(2);

      const firstCall = (db.execute as jest.Mock).mock.calls[0];
      expect(firstCall[1]).toEqual(['user_123', 'service_a']);

      const secondCall = (db.execute as jest.Mock).mock.calls[1];
      expect(secondCall[1]).toEqual(['user_123', 'service_b']);
    });
  });

  describe('edge cases: special characters and unicode', () => {
    it('should handle state with unicode characters', async () => {
      const unicodeState = {
        russian: 'Привет мир',
        chinese: '你好世界',
        emoji: '(sleep emoji) (star emoji)',
        special: 'line1\nline2\ttab',
      };
      const mockRow = createMockStateRow({
        state_json: JSON.stringify(unicodeState),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user', 'service');

      expect(state).toEqual(unicodeState);
    });

    it('should serialize unicode state correctly', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      const unicodeState = { message: 'Bonne nuit' };

      await repository.set('user', 'service', unicodeState);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1] as unknown[];
      expect(JSON.parse(params[2] as string)).toEqual(unicodeState);
    });
  });

  describe('edge cases: empty and special states', () => {
    it('should handle empty object state', async () => {
      const mockRow = createMockStateRow({
        state_json: '{}',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user', 'service');

      expect(state).toEqual({});
    });

    it('should handle empty array state', async () => {
      const mockRow = createMockStateRow({
        state_json: '[]',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user', 'service');

      expect(state).toEqual([]);
    });

    it('should handle state with undefined-like keys', async () => {
      const mockRow = createMockStateRow({
        state_json: JSON.stringify({
          undefinedKey: null,
          emptyString: '',
          zero: 0,
          false: false,
        }),
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const state = await repository.get('user', 'service');

      expect(state).toEqual({
        undefinedKey: null,
        emptyString: '',
        zero: 0,
        false: false,
      });
    });
  });

  describe('query correctness', () => {
    it('get should check existence before returning state', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.get('user', 'service');

      expect(db.queryOne).toHaveBeenCalledTimes(1);
    });

    it('set should first check for existing record', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.set('user', 'service', { data: 1 });

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM service_state'),
        ['user', 'service']
      );
    });

    it('set check should include deleted_at IS NULL', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.set('user', 'service', { data: 1 });

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });
  });
});
