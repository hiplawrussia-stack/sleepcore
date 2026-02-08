/**
 * MCTRepository Unit Tests
 * ========================
 * Tests for MCT therapy data persistence.
 *
 * Covers:
 * - Worry Entries CRUD operations
 * - Worry Settings CRUD operations
 * - MCT Sessions (worry, dm, att) CRUD operations
 * - Soft-delete behavior
 * - JSON serialization/deserialization
 *
 * Traceability:
 * - REQ-MCT-001 (Worry Postponement persistence)
 * - REQ-MCT-002 (Detached Mindfulness sessions)
 * - REQ-MCT-003 (ATT sessions)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { MCTRepository } from '../MCTRepository';
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

describe('MCTRepository', () => {
  let db: IDatabaseConnection;
  let repository: MCTRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new MCTRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });
  });

  // ==========================================================================
  // Worry Entries Tests
  // ==========================================================================

  describe('Worry Entries', () => {
    describe('getWorryEntries()', () => {
      it('should return empty array when no entries exist', async () => {
        (db.query as jest.Mock).mockResolvedValue([]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries).toEqual([]);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('mct_worry_entries'),
          ['user_123']
        );
      });

      it('should return parsed entries from database', async () => {
        const mockRows = [
          { entry_json: JSON.stringify({ worry: 'Will I sleep tonight?', resolved: false }) },
          { entry_json: JSON.stringify({ worry: 'Work deadline', resolved: true }) },
        ];
        (db.query as jest.Mock).mockResolvedValue(mockRows);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries).toHaveLength(2);
        expect(entries[0]).toEqual({ worry: 'Will I sleep tonight?', resolved: false });
        expect(entries[1]).toEqual({ worry: 'Work deadline', resolved: true });
      });

      it('should exclude soft-deleted entries', async () => {
        await repository.getWorryEntries('user_123');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should order entries by creation time ascending', async () => {
        await repository.getWorryEntries('user_123');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY created_at ASC'),
          expect.anything()
        );
      });

      it('should handle complex entry objects', async () => {
        const complexEntry = {
          worry: 'Complex worry',
          category: 'work',
          intensity: 7,
          metadata: { source: 'diary', timestamp: '2026-02-01' },
        };
        (db.query as jest.Mock).mockResolvedValue([
          { entry_json: JSON.stringify(complexEntry) },
        ]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries[0]).toEqual(complexEntry);
      });
    });

    describe('addWorryEntry()', () => {
      it('should insert new worry entry', async () => {
        const entry = { worry: 'Test worry', resolved: false };

        await repository.addWorryEntry('user_123', entry);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO mct_worry_entries'),
          ['user_123', JSON.stringify(entry)]
        );
      });

      it('should serialize entry to JSON', async () => {
        const entry = { worry: 'Nested worry', data: { level: 5 } };

        await repository.addWorryEntry('user_123', entry);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(JSON.parse(params[1])).toEqual(entry);
      });

      it('should set created_at to current time', async () => {
        await repository.addWorryEntry('user_123', { worry: 'test' });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining("datetime('now')"),
          expect.anything()
        );
      });
    });

    describe('replaceWorryEntries()', () => {
      it('should soft-delete existing entries before adding new ones', async () => {
        const newEntries = [{ worry: 'New worry 1' }, { worry: 'New worry 2' }];

        await repository.replaceWorryEntries('user_123', newEntries);

        // First call should be soft-delete
        expect(db.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining("SET deleted_at = datetime('now')"),
          ['user_123']
        );
      });

      it('should insert all new entries', async () => {
        const newEntries = [{ worry: 'Entry 1' }, { worry: 'Entry 2' }, { worry: 'Entry 3' }];

        await repository.replaceWorryEntries('user_123', newEntries);

        // 1 delete + 3 inserts = 4 calls
        expect(db.execute).toHaveBeenCalledTimes(4);
      });

      it('should handle empty entries array', async () => {
        await repository.replaceWorryEntries('user_123', []);

        // Only soft-delete, no inserts
        expect(db.execute).toHaveBeenCalledTimes(1);
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at'),
          ['user_123']
        );
      });

      it('should preserve entry order when replacing', async () => {
        const entries = [{ order: 1 }, { order: 2 }, { order: 3 }];

        await repository.replaceWorryEntries('user_123', entries);

        // Verify inserts happen in order (calls 2, 3, 4 after delete)
        const insertCalls = (db.execute as jest.Mock).mock.calls.slice(1);
        expect(JSON.parse(insertCalls[0][1][1])).toEqual({ order: 1 });
        expect(JSON.parse(insertCalls[1][1][1])).toEqual({ order: 2 });
        expect(JSON.parse(insertCalls[2][1][1])).toEqual({ order: 3 });
      });
    });

    describe('deleteWorryEntries()', () => {
      it('should soft-delete all entries for user', async () => {
        await repository.deleteWorryEntries('user_123');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining("SET deleted_at = datetime('now')"),
          ['user_123']
        );
      });

      it('should only delete non-deleted entries', async () => {
        await repository.deleteWorryEntries('user_123');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should target correct user', async () => {
        await repository.deleteWorryEntries('specific_user');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('user_id = ?'),
          ['specific_user']
        );
      });
    });
  });

  // ==========================================================================
  // Worry Settings Tests
  // ==========================================================================

  describe('Worry Settings', () => {
    describe('getWorrySettings()', () => {
      it('should return null when no settings exist', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        const settings = await repository.getWorrySettings('user_123');

        expect(settings).toBeNull();
      });

      it('should return parsed settings from database', async () => {
        const mockSettings = {
          worryTime: '18:00',
          duration: 15,
          reminderEnabled: true,
        };
        (db.queryOne as jest.Mock).mockResolvedValue({
          settings_json: JSON.stringify(mockSettings),
        });

        const settings = await repository.getWorrySettings('user_123');

        expect(settings).toEqual(mockSettings);
      });

      it('should exclude soft-deleted settings', async () => {
        await repository.getWorrySettings('user_123');

        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should query correct table', async () => {
        await repository.getWorrySettings('user_123');

        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('mct_worry_settings'),
          ['user_123']
        );
      });

      it('should handle complex settings object', async () => {
        const complexSettings = {
          worryTime: '20:00',
          duration: 20,
          categories: ['work', 'health', 'relationships'],
          notifications: { morning: false, evening: true },
        };
        (db.queryOne as jest.Mock).mockResolvedValue({
          settings_json: JSON.stringify(complexSettings),
        });

        const settings = await repository.getWorrySettings('user_123');

        expect(settings).toEqual(complexSettings);
      });
    });

    describe('upsertWorrySettings()', () => {
      it('should insert new settings when none exist', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null); // No existing settings
        const settings = { worryTime: '19:00', duration: 15 };

        await repository.upsertWorrySettings('user_123', settings);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO mct_worry_settings'),
          expect.arrayContaining(['user_123', JSON.stringify(settings)])
        );
      });

      it('should update existing settings', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 }); // Existing settings
        const settings = { worryTime: '20:00', duration: 20 };

        await repository.upsertWorrySettings('user_123', settings);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE mct_worry_settings'),
          expect.arrayContaining([JSON.stringify(settings), 'user_123'])
        );
      });

      it('should set created_at and updated_at on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsertWorrySettings('user_123', { test: true });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];
        expect(sql).toContain('created_at');
        expect(sql).toContain('updated_at');
      });

      it('should update updated_at on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsertWorrySettings('user_123', { test: true });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];
        expect(sql).toContain('updated_at');
      });

      it('should serialize settings to JSON', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const settings = { nested: { data: [1, 2, 3] } };

        await repository.upsertWorrySettings('user_123', settings);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(params).toContain(JSON.stringify(settings));
      });
    });

    describe('deleteWorrySettings()', () => {
      it('should soft-delete settings for user', async () => {
        await repository.deleteWorrySettings('user_123');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining("SET deleted_at = datetime('now')"),
          ['user_123']
        );
      });

      it('should only delete non-deleted settings', async () => {
        await repository.deleteWorrySettings('user_123');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should target correct table', async () => {
        await repository.deleteWorrySettings('user_123');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('mct_worry_settings'),
          expect.anything()
        );
      });
    });
  });

  // ==========================================================================
  // MCT Sessions Tests
  // ==========================================================================

  describe('MCT Sessions', () => {
    const sessionTypes: Array<'worry' | 'dm' | 'att'> = ['worry', 'dm', 'att'];

    describe('getSessions()', () => {
      it.each(sessionTypes)(
        'should return empty array when no %s sessions exist',
        async (sessionType) => {
          (db.query as jest.Mock).mockResolvedValue([]);

          const sessions = await repository.getSessions('user_123', sessionType);

          expect(sessions).toEqual([]);
          expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('mct_sessions'),
            ['user_123', sessionType]
          );
        }
      );

      it.each(sessionTypes)(
        'should return parsed %s sessions from database',
        async (sessionType) => {
          const mockSessions = [
            { session_json: JSON.stringify({ duration: 10, completed: true }) },
            { session_json: JSON.stringify({ duration: 15, completed: false }) },
          ];
          (db.query as jest.Mock).mockResolvedValue(mockSessions);

          const sessions = await repository.getSessions('user_123', sessionType);

          expect(sessions).toHaveLength(2);
          expect(sessions[0]).toEqual({ duration: 10, completed: true });
          expect(sessions[1]).toEqual({ duration: 15, completed: false });
        }
      );

      it('should filter by session_type', async () => {
        await repository.getSessions('user_123', 'dm');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          ['user_123', 'dm']
        );
      });

      it('should exclude soft-deleted sessions', async () => {
        await repository.getSessions('user_123', 'att');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should order by started_at ascending', async () => {
        await repository.getSessions('user_123', 'worry');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY started_at ASC'),
          expect.anything()
        );
      });

      it('should handle complex session objects', async () => {
        const complexSession = {
          type: 'att',
          duration: 12,
          stages: ['focus', 'expand', 'release'],
          metrics: { attention: 0.85, distractors: 3 },
        };
        (db.query as jest.Mock).mockResolvedValue([
          { session_json: JSON.stringify(complexSession) },
        ]);

        const sessions = await repository.getSessions('user_123', 'att');

        expect(sessions[0]).toEqual(complexSession);
      });
    });

    describe('getAllSessionsForService()', () => {
      it.each(sessionTypes)(
        'should return empty array when no %s sessions exist for any user',
        async (sessionType) => {
          (db.query as jest.Mock).mockResolvedValue([]);

          const result = await repository.getAllSessionsForService(sessionType);

          expect(result).toEqual([]);
        }
      );

      it.each(sessionTypes)(
        'should group %s sessions by user',
        async (sessionType) => {
          const mockRows = [
            { user_id: 'user_1', session_json: JSON.stringify({ id: 1 }) },
            { user_id: 'user_1', session_json: JSON.stringify({ id: 2 }) },
            { user_id: 'user_2', session_json: JSON.stringify({ id: 3 }) },
          ];
          (db.query as jest.Mock).mockResolvedValue(mockRows);

          const result = await repository.getAllSessionsForService(sessionType);

          expect(result).toHaveLength(2);
          expect(result.find((r) => r.userId === 'user_1')?.sessions).toHaveLength(2);
          expect(result.find((r) => r.userId === 'user_2')?.sessions).toHaveLength(1);
        }
      );

      it('should filter by session_type only', async () => {
        await repository.getAllSessionsForService('dm');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          ['dm']
        );
      });

      it('should exclude soft-deleted sessions', async () => {
        await repository.getAllSessionsForService('att');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should order by user_id and started_at', async () => {
        await repository.getAllSessionsForService('worry');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY user_id, started_at ASC'),
          expect.anything()
        );
      });

      it('should parse session JSON correctly for each user', async () => {
        const mockRows = [
          { user_id: 'user_1', session_json: JSON.stringify({ type: 'att', score: 80 }) },
          { user_id: 'user_1', session_json: JSON.stringify({ type: 'att', score: 90 }) },
        ];
        (db.query as jest.Mock).mockResolvedValue(mockRows);

        const result = await repository.getAllSessionsForService('att');

        expect(result[0].sessions[0]).toEqual({ type: 'att', score: 80 });
        expect(result[0].sessions[1]).toEqual({ type: 'att', score: 90 });
      });
    });

    describe('addSession()', () => {
      const startedAt = new Date('2026-02-01T10:00:00.000Z');

      it.each(sessionTypes)(
        'should insert new %s session',
        async (sessionType) => {
          const session = { duration: 10, completed: true };

          await repository.addSession('user_123', sessionType, session, startedAt);

          expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO mct_sessions'),
            ['user_123', sessionType, JSON.stringify(session), startedAt.toISOString()]
          );
        }
      );

      it('should serialize session to JSON', async () => {
        const session = { nested: { data: { value: 42 } } };

        await repository.addSession('user_123', 'dm', session, startedAt);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(JSON.parse(params[2])).toEqual(session);
      });

      it('should convert startedAt to ISO string', async () => {
        const date = new Date('2026-02-08T15:30:00.000Z');

        await repository.addSession('user_123', 'att', { test: true }, date);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(params[3]).toBe('2026-02-08T15:30:00.000Z');
      });

      it('should set created_at to current time', async () => {
        await repository.addSession('user_123', 'worry', {}, startedAt);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining("datetime('now')"),
          expect.anything()
        );
      });
    });

    describe('replaceSessions()', () => {
      const startedAt1 = new Date('2026-02-01T10:00:00.000Z');
      const startedAt2 = new Date('2026-02-02T10:00:00.000Z');

      it.each(sessionTypes)(
        'should soft-delete existing %s sessions before adding new ones',
        async (sessionType) => {
          const newSessions = [
            { session: { id: 1 }, startedAt: startedAt1 },
            { session: { id: 2 }, startedAt: startedAt2 },
          ];

          await repository.replaceSessions('user_123', sessionType, newSessions);

          // First call should be soft-delete
          expect(db.execute).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("SET deleted_at = datetime('now')"),
            ['user_123', sessionType]
          );
        }
      );

      it.each(sessionTypes)(
        'should insert all new %s sessions',
        async (sessionType) => {
          const newSessions = [
            { session: { id: 1 }, startedAt: startedAt1 },
            { session: { id: 2 }, startedAt: startedAt2 },
            { session: { id: 3 }, startedAt: new Date() },
          ];

          await repository.replaceSessions('user_123', sessionType, newSessions);

          // 1 delete + 3 inserts = 4 calls
          expect(db.execute).toHaveBeenCalledTimes(4);
        }
      );

      it('should handle empty sessions array', async () => {
        await repository.replaceSessions('user_123', 'dm', []);

        // Only soft-delete, no inserts
        expect(db.execute).toHaveBeenCalledTimes(1);
      });

      it('should filter soft-delete by session_type', async () => {
        await repository.replaceSessions('user_123', 'att', []);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          ['user_123', 'att']
        );
      });

      it('should preserve session order and dates when replacing', async () => {
        const sessions = [
          { session: { order: 1 }, startedAt: startedAt1 },
          { session: { order: 2 }, startedAt: startedAt2 },
        ];

        await repository.replaceSessions('user_123', 'worry', sessions);

        // Verify inserts happen in order (calls 2, 3 after delete)
        const insertCalls = (db.execute as jest.Mock).mock.calls.slice(1);
        expect(JSON.parse(insertCalls[0][1][2])).toEqual({ order: 1 });
        expect(insertCalls[0][1][3]).toBe(startedAt1.toISOString());
        expect(JSON.parse(insertCalls[1][1][2])).toEqual({ order: 2 });
        expect(insertCalls[1][1][3]).toBe(startedAt2.toISOString());
      });
    });

    describe('deleteSessions()', () => {
      it.each(sessionTypes)(
        'should soft-delete all %s sessions for user',
        async (sessionType) => {
          await repository.deleteSessions('user_123', sessionType);

          expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining("SET deleted_at = datetime('now')"),
            ['user_123', sessionType]
          );
        }
      );

      it('should only delete non-deleted sessions', async () => {
        await repository.deleteSessions('user_123', 'dm');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });

      it('should filter by user_id and session_type', async () => {
        await repository.deleteSessions('specific_user', 'att');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('user_id = ?'),
          expect.arrayContaining(['specific_user', 'att'])
        );
        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          expect.anything()
        );
      });
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('Edge Cases', () => {
    describe('JSON parsing', () => {
      it('should handle entries with special characters', async () => {
        const entryWithSpecialChars = {
          worry: 'Will I sleep? "Maybe" — but maybe not...',
          notes: "Patient's concern: anxiety\nNew line here",
        };
        (db.query as jest.Mock).mockResolvedValue([
          { entry_json: JSON.stringify(entryWithSpecialChars) },
        ]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries[0]).toEqual(entryWithSpecialChars);
      });

      it('should handle entries with unicode', async () => {
        const entryWithUnicode = {
          worry: 'Проблемы со сном 睡眠問題 🌙',
          category: 'здоровье',
        };
        (db.query as jest.Mock).mockResolvedValue([
          { entry_json: JSON.stringify(entryWithUnicode) },
        ]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries[0]).toEqual(entryWithUnicode);
      });

      it('should handle empty objects', async () => {
        (db.query as jest.Mock).mockResolvedValue([{ entry_json: JSON.stringify({}) }]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries[0]).toEqual({});
      });

      it('should handle arrays in entries', async () => {
        const entryWithArrays = {
          worries: ['worry1', 'worry2'],
          scores: [1, 2, 3, 4, 5],
        };
        (db.query as jest.Mock).mockResolvedValue([
          { entry_json: JSON.stringify(entryWithArrays) },
        ]);

        const entries = await repository.getWorryEntries('user_123');

        expect(entries[0]).toEqual(entryWithArrays);
      });
    });

    describe('Multiple users isolation', () => {
      it('should not return entries from other users', async () => {
        await repository.getWorryEntries('user_A');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('user_id = ?'),
          ['user_A']
        );
      });

      it('should not delete entries from other users', async () => {
        await repository.deleteWorryEntries('user_A');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('user_id = ?'),
          ['user_A']
        );
      });
    });

    describe('Session type isolation', () => {
      it('should not return sessions of different type', async () => {
        await repository.getSessions('user_123', 'worry');

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          ['user_123', 'worry']
        );
      });

      it('should not delete sessions of different type', async () => {
        await repository.deleteSessions('user_123', 'dm');

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('session_type = ?'),
          ['user_123', 'dm']
        );
      });
    });

    describe('Null and undefined handling', () => {
      it('should handle null settings gracefully', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        const settings = await repository.getWorrySettings('user_123');

        expect(settings).toBeNull();
      });

      it('should handle empty query results', async () => {
        (db.query as jest.Mock).mockResolvedValue([]);

        const entries = await repository.getWorryEntries('user_123');
        const sessions = await repository.getSessions('user_123', 'att');
        const allSessions = await repository.getAllSessionsForService('dm');

        expect(entries).toEqual([]);
        expect(sessions).toEqual([]);
        expect(allSessions).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // Integration Patterns
  // ==========================================================================

  describe('Integration Patterns', () => {
    describe('Worry Postponement workflow', () => {
      it('should support add-then-replace pattern', async () => {
        // First add individual entries
        await repository.addWorryEntry('user_123', { worry: 'Entry 1' });
        await repository.addWorryEntry('user_123', { worry: 'Entry 2' });

        // Then replace all with processed entries
        await repository.replaceWorryEntries('user_123', [
          { worry: 'Entry 1', resolved: true },
          { worry: 'Entry 2', resolved: true },
        ]);

        // Verify 2 adds + 1 delete + 2 adds = 5 calls
        expect(db.execute).toHaveBeenCalledTimes(5);
      });

      it('should support settings-then-entries workflow', async () => {
        // Set up settings
        (db.queryOne as jest.Mock).mockResolvedValueOnce(null); // No existing settings
        await repository.upsertWorrySettings('user_123', { worryTime: '18:00' });

        // Add entries
        await repository.addWorryEntry('user_123', { worry: 'First worry' });

        expect(db.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('ATT session tracking', () => {
      it('should support multiple sessions over time', async () => {
        const dates = [
          new Date('2026-02-01'),
          new Date('2026-02-02'),
          new Date('2026-02-03'),
        ];

        for (const date of dates) {
          await repository.addSession('user_123', 'att', { duration: 12 }, date);
        }

        expect(db.execute).toHaveBeenCalledTimes(3);
      });
    });

    describe('Cross-user analytics', () => {
      it('should support service-wide session retrieval', async () => {
        const mockRows = [
          { user_id: 'user_1', session_json: JSON.stringify({ completed: true }) },
          { user_id: 'user_2', session_json: JSON.stringify({ completed: false }) },
          { user_id: 'user_3', session_json: JSON.stringify({ completed: true }) },
        ];
        (db.query as jest.Mock).mockResolvedValue(mockRows);

        const result = await repository.getAllSessionsForService('dm');

        expect(result).toHaveLength(3);
        expect(result.map((r) => r.userId)).toEqual(['user_1', 'user_2', 'user_3']);
      });
    });
  });
});
