/**
 * NotificationUserRepository Unit Tests
 * ======================================
 * Tests for notification user preferences persistence.
 *
 * Covers:
 * - CRUD operations (findByUserId, findAll, upsert, deleteByUserId)
 * - Soft delete behavior
 * - Row to entity conversion
 * - Date handling for notification timestamps
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import {
  NotificationUserRepository,
  type INotificationUserRow,
  type INotificationUserEntity,
} from '../NotificationUserRepository';
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
 * Create mock notification user row (database format)
 */
function createMockNotificationUserRow(
  overrides: Partial<INotificationUserRow> = {}
): INotificationUserRow {
  return {
    id: 1,
    user_id: 'tg_123456',
    chat_id: 123456789,
    user_name: 'TestUser',
    preferences_json: '{"quiet_hours":{"start":"22:00","end":"08:00"}}',
    context_json: '{"last_topic":"sleep_hygiene"}',
    first_interaction_at: '2026-01-01T12:00:00.000Z',
    last_notification_at: '2026-02-01T10:30:00.000Z',
    last_response_at: '2026-02-01T10:35:00.000Z',
    reengagement_attempts: 2,
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-02-01T10:30:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('NotificationUserRepository', () => {
  let db: IDatabaseConnection;
  let repository: NotificationUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new NotificationUserRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('findByUserId()', () => {
    it('should find user by user ID', async () => {
      const mockRow = createMockNotificationUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByUserId('tg_123456');

      expect(user).not.toBeNull();
      expect(user!.userId).toBe('tg_123456');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['tg_123456']
      );
    });

    it('should return null for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const user = await repository.findByUserId('unknown');

      expect(user).toBeNull();
    });

    it('should exclude deleted users', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId('tg_123456');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should convert row to entity correctly', async () => {
      const mockRow = createMockNotificationUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByUserId('tg_123456');

      expect(user).toMatchObject({
        userId: 'tg_123456',
        chatId: 123456789,
        userName: 'TestUser',
        preferencesJson: '{"quiet_hours":{"start":"22:00","end":"08:00"}}',
        contextJson: '{"last_topic":"sleep_hygiene"}',
        reengagementAttempts: 2,
      });
    });

    it('should parse date fields correctly', async () => {
      const mockRow = createMockNotificationUserRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByUserId('tg_123456');

      expect(user!.firstInteractionAt).toBeInstanceOf(Date);
      expect(user!.lastNotificationAt).toBeInstanceOf(Date);
      expect(user!.lastResponseAt).toBeInstanceOf(Date);
    });

    it('should handle null date fields', async () => {
      const mockRow = createMockNotificationUserRow({
        first_interaction_at: null,
        last_notification_at: null,
        last_response_at: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByUserId('tg_123456');

      expect(user!.firstInteractionAt).toBeUndefined();
      expect(user!.lastNotificationAt).toBeUndefined();
      expect(user!.lastResponseAt).toBeUndefined();
    });

    it('should handle null userName', async () => {
      const mockRow = createMockNotificationUserRow({
        user_name: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const user = await repository.findByUserId('tg_123456');

      expect(user!.userName).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    it('should return all non-deleted users', async () => {
      const mockRows = [
        createMockNotificationUserRow({ user_id: 'tg_1' }),
        createMockNotificationUserRow({ user_id: 'tg_2' }),
        createMockNotificationUserRow({ user_id: 'tg_3' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const users = await repository.findAll();

      expect(users).toHaveLength(3);
      expect(users[0].userId).toBe('tg_1');
      expect(users[1].userId).toBe('tg_2');
      expect(users[2].userId).toBe('tg_3');
    });

    it('should return empty array when no users exist', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const users = await repository.findAll();

      expect(users).toHaveLength(0);
    });

    it('should exclude deleted users', async () => {
      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL')
      );
    });

    it('should convert all rows to entities', async () => {
      const mockRows = [
        createMockNotificationUserRow({ user_id: 'tg_1', reengagement_attempts: 1 }),
        createMockNotificationUserRow({ user_id: 'tg_2', reengagement_attempts: 5 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const users = await repository.findAll();

      expect(users[0].reengagementAttempts).toBe(1);
      expect(users[1].reengagementAttempts).toBe(5);
    });
  });

  describe('upsert()', () => {
    describe('insert (new user)', () => {
      beforeEach(() => {
        // User does not exist
        (db.queryOne as jest.Mock).mockResolvedValue(null);
      });

      it('should insert new user when not exists', async () => {
        const data: Partial<INotificationUserEntity> = {
          chatId: 123456,
          userName: 'NewUser',
          preferencesJson: '{}',
          contextJson: '{}',
          reengagementAttempts: 0,
        };

        await repository.upsert('tg_new', data);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO notification_users'),
          expect.any(Array)
        );
      });

      it('should include all fields in insert', async () => {
        const data: Partial<INotificationUserEntity> = {
          chatId: 123456,
          userName: 'NewUser',
          preferencesJson: '{"enabled":true}',
          contextJson: '{"topic":"intro"}',
          firstInteractionAt: new Date('2026-01-15T10:00:00.000Z'),
          lastNotificationAt: new Date('2026-01-15T11:00:00.000Z'),
          lastResponseAt: new Date('2026-01-15T11:05:00.000Z'),
          reengagementAttempts: 0,
        };

        await repository.upsert('tg_new', data);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[0]).toBe('tg_new'); // user_id
        expect(params[1]).toBe(123456); // chat_id
        expect(params[2]).toBe('NewUser'); // user_name
        expect(params[3]).toBe('{"enabled":true}'); // preferences_json
        expect(params[4]).toBe('{"topic":"intro"}'); // context_json
        expect(params[5]).toBe('2026-01-15T10:00:00.000Z'); // first_interaction_at
        expect(params[6]).toBe('2026-01-15T11:00:00.000Z'); // last_notification_at
        expect(params[7]).toBe('2026-01-15T11:05:00.000Z'); // last_response_at
        expect(params[8]).toBe(0); // reengagement_attempts
      });

      it('should use default values when not provided', async () => {
        await repository.upsert('tg_new', {});

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[1]).toBe(0); // default chat_id
        expect(params[2]).toBeNull(); // default user_name
        expect(params[3]).toBe('{}'); // default preferences_json
        expect(params[4]).toBe('{}'); // default context_json
        expect(params[5]).toBeNull(); // default first_interaction_at
        expect(params[6]).toBeNull(); // default last_notification_at
        expect(params[7]).toBeNull(); // default last_response_at
        expect(params[8]).toBe(0); // default reengagement_attempts
      });

      it('should set created_at and updated_at timestamps', async () => {
        await repository.upsert('tg_new', {});

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        // Last two params should be created_at and updated_at (ISO strings)
        expect(typeof params[9]).toBe('string'); // created_at
        expect(typeof params[10]).toBe('string'); // updated_at
        expect(params[9]).toBe(params[10]); // Same timestamp for new records
      });
    });

    describe('update (existing user)', () => {
      beforeEach(() => {
        // User exists
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });
      });

      it('should update existing user', async () => {
        const data: Partial<INotificationUserEntity> = {
          chatId: 123456,
          userName: 'UpdatedUser',
        };

        await repository.upsert('tg_existing', data);

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE notification_users SET'),
          expect.any(Array)
        );
      });

      it('should include WHERE clause for user_id and deleted_at', async () => {
        await repository.upsert('tg_existing', { chatId: 999 });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('WHERE user_id = ? AND deleted_at IS NULL'),
          expect.any(Array)
        );
      });

      it('should pass user_id as last parameter', async () => {
        await repository.upsert('tg_existing', { chatId: 999 });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[params.length - 1]).toBe('tg_existing');
      });

      it('should update only updated_at timestamp (not created_at)', async () => {
        await repository.upsert('tg_existing', { chatId: 999 });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];

        expect(sql).toContain('updated_at = ?');
        expect(sql).not.toContain('created_at');
      });

      it('should update all provided fields', async () => {
        const data: Partial<INotificationUserEntity> = {
          chatId: 555555,
          userName: 'ChangedName',
          preferencesJson: '{"updated":true}',
          contextJson: '{"new":"context"}',
          firstInteractionAt: new Date('2026-02-01T00:00:00.000Z'),
          lastNotificationAt: new Date('2026-02-02T00:00:00.000Z'),
          lastResponseAt: new Date('2026-02-02T00:05:00.000Z'),
          reengagementAttempts: 3,
        };

        await repository.upsert('tg_existing', data);

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];

        expect(params[0]).toBe(555555); // chat_id
        expect(params[1]).toBe('ChangedName'); // user_name
        expect(params[2]).toBe('{"updated":true}'); // preferences_json
        expect(params[3]).toBe('{"new":"context"}'); // context_json
        expect(params[4]).toBe('2026-02-01T00:00:00.000Z'); // first_interaction_at
        expect(params[5]).toBe('2026-02-02T00:00:00.000Z'); // last_notification_at
        expect(params[6]).toBe('2026-02-02T00:05:00.000Z'); // last_response_at
        expect(params[7]).toBe(3); // reengagement_attempts
      });
    });

    describe('check for existence', () => {
      it('should query for existing user before deciding insert/update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('tg_test', { chatId: 123 });

        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('SELECT id FROM notification_users WHERE user_id = ?'),
          ['tg_test']
        );
      });

      it('should check deleted_at when looking for existing user', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('tg_test', { chatId: 123 });

        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.any(Array)
        );
      });
    });
  });

  describe('deleteByUserId()', () => {
    it('should soft delete user by setting deleted_at', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        ['tg_123456']
      );
    });

    it('should use UPDATE not DELETE', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_users SET'),
        expect.any(Array)
      );
    });

    it('should only affect non-deleted users', async () => {
      await repository.deleteByUserId('tg_123456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should pass correct user_id parameter', async () => {
      await repository.deleteByUserId('tg_specific');

      expect(db.execute).toHaveBeenCalledWith(expect.any(String), ['tg_specific']);
    });
  });

  describe('rowToEntity() - internal conversion', () => {
    it('should convert all row fields to entity fields', async () => {
      const mockRow = createMockNotificationUserRow({
        user_id: 'tg_convert',
        chat_id: 987654321,
        user_name: 'ConvertTest',
        preferences_json: '{"test":"prefs"}',
        context_json: '{"test":"ctx"}',
        reengagement_attempts: 5,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('tg_convert');

      expect(entity!.userId).toBe('tg_convert');
      expect(entity!.chatId).toBe(987654321);
      expect(entity!.userName).toBe('ConvertTest');
      expect(entity!.preferencesJson).toBe('{"test":"prefs"}');
      expect(entity!.contextJson).toBe('{"test":"ctx"}');
      expect(entity!.reengagementAttempts).toBe(5);
    });

    it('should convert date strings to Date objects', async () => {
      const mockRow = createMockNotificationUserRow({
        first_interaction_at: '2026-01-10T08:00:00.000Z',
        last_notification_at: '2026-01-11T09:00:00.000Z',
        last_response_at: '2026-01-11T09:05:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.firstInteractionAt).toEqual(new Date('2026-01-10T08:00:00.000Z'));
      expect(entity!.lastNotificationAt).toEqual(new Date('2026-01-11T09:00:00.000Z'));
      expect(entity!.lastResponseAt).toEqual(new Date('2026-01-11T09:05:00.000Z'));
    });

    it('should handle null values for optional string fields', async () => {
      const mockRow = createMockNotificationUserRow({
        user_name: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.userName).toBeUndefined();
    });

    it('should handle null values for optional date fields', async () => {
      const mockRow = createMockNotificationUserRow({
        first_interaction_at: null,
        last_notification_at: null,
        last_response_at: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.firstInteractionAt).toBeUndefined();
      expect(entity!.lastNotificationAt).toBeUndefined();
      expect(entity!.lastResponseAt).toBeUndefined();
    });

    it('should preserve numeric fields correctly', async () => {
      const mockRow = createMockNotificationUserRow({
        chat_id: 0,
        reengagement_attempts: 0,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.chatId).toBe(0);
      expect(entity!.reengagementAttempts).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty preferences_json', async () => {
      const mockRow = createMockNotificationUserRow({
        preferences_json: '{}',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.preferencesJson).toBe('{}');
    });

    it('should handle empty context_json', async () => {
      const mockRow = createMockNotificationUserRow({
        context_json: '{}',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.contextJson).toBe('{}');
    });

    it('should handle large chat_id values', async () => {
      const largeChatId = 9007199254740991; // Max safe integer
      const mockRow = createMockNotificationUserRow({
        chat_id: largeChatId,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.chatId).toBe(largeChatId);
    });

    it('should handle negative chat_id (group chats)', async () => {
      const groupChatId = -1001234567890;
      const mockRow = createMockNotificationUserRow({
        chat_id: groupChatId,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.chatId).toBe(groupChatId);
    });

    it('should handle special characters in userName', async () => {
      const mockRow = createMockNotificationUserRow({
        user_name: "User's Name with 'quotes' and \"double quotes\"",
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.userName).toBe("User's Name with 'quotes' and \"double quotes\"");
    });

    it('should handle unicode in preferences_json', async () => {
      const mockRow = createMockNotificationUserRow({
        preferences_json: '{"language":"Русский","emoji":"🌙"}',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entity = await repository.findByUserId('test');

      expect(entity!.preferencesJson).toBe('{"language":"Русский","emoji":"🌙"}');
    });
  });

  describe('database query structure', () => {
    it('findByUserId should select all columns', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId('test');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        expect.any(Array)
      );
    });

    it('findAll should select all columns', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT *'));
    });

    it('upsert insert should include all required columns', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('test', { chatId: 123 });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const sql = call[0];

      expect(sql).toContain('user_id');
      expect(sql).toContain('chat_id');
      expect(sql).toContain('user_name');
      expect(sql).toContain('preferences_json');
      expect(sql).toContain('context_json');
      expect(sql).toContain('first_interaction_at');
      expect(sql).toContain('last_notification_at');
      expect(sql).toContain('last_response_at');
      expect(sql).toContain('reengagement_attempts');
      expect(sql).toContain('created_at');
      expect(sql).toContain('updated_at');
    });

    it('upsert update should include all updatable columns', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

      await repository.upsert('test', { chatId: 123 });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const sql = call[0];

      expect(sql).toContain('chat_id = ?');
      expect(sql).toContain('user_name = ?');
      expect(sql).toContain('preferences_json = ?');
      expect(sql).toContain('context_json = ?');
      expect(sql).toContain('first_interaction_at = ?');
      expect(sql).toContain('last_notification_at = ?');
      expect(sql).toContain('last_response_at = ?');
      expect(sql).toContain('reengagement_attempts = ?');
      expect(sql).toContain('updated_at = ?');
    });
  });
});
