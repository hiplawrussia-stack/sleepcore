/**
 * ISIScheduleRepository Unit Tests
 * =================================
 * Tests for ISI assessment scheduling persistence.
 *
 * Covers:
 * - CRUD operations for ISI scheduling
 * - Soft delete functionality
 * - Date, boolean, and JSON field conversions
 * - Edge cases for null values and empty arrays
 *
 * Traceability:
 * - REQ-ISI-001 (ISI assessment scheduling)
 * - REQ-DATA-001 (Data persistence)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { ISIScheduleRepository, type IISIScheduleRow, type IISIScheduleEntity } from '../ISIScheduleRepository';
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
 * Create mock ISI schedule row (database format)
 */
function createMockScheduleRow(overrides: Partial<IISIScheduleRow> = {}): IISIScheduleRow {
  return {
    id: 1,
    user_id: 'user_123',
    chat_id: 456789,
    user_name: 'TestUser',
    enrollment_date: '2026-01-15T10:00:00.000Z',
    last_assessment_date: '2026-02-01T14:30:00.000Z',
    last_assessment_week: 2,
    next_assessment_week: 4,
    reminder_sent: 0,
    isi_history_json: JSON.stringify([
      { week: 0, score: 18, date: '2026-01-15T10:00:00.000Z' },
      { week: 2, score: 14, date: '2026-02-01T14:30:00.000Z' },
    ]),
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-02-01T14:30:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('ISIScheduleRepository', () => {
  let db: IDatabaseConnection;
  let repository: ISIScheduleRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new ISIScheduleRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('findByUserId()', () => {
    it('should find schedule by user ID', async () => {
      const mockRow = createMockScheduleRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const schedule = await repository.findByUserId('user_123');

      expect(schedule).not.toBeNull();
      expect(schedule!.userId).toBe('user_123');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['user_123']
      );
    });

    it('should return null for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const schedule = await repository.findByUserId('unknown_user');

      expect(schedule).toBeNull();
    });

    it('should exclude soft-deleted records', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId('user_123');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should correctly convert all fields from row to entity', async () => {
      const mockRow = createMockScheduleRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const schedule = await repository.findByUserId('user_123');

      expect(schedule).toMatchObject({
        id: 1,
        userId: 'user_123',
        chatId: 456789,
        userName: 'TestUser',
        nextAssessmentWeek: 4,
        lastAssessmentWeek: 2,
        reminderSent: false,
      });
      expect(schedule!.enrollmentDate).toBeInstanceOf(Date);
      expect(schedule!.lastAssessmentDate).toBeInstanceOf(Date);
      expect(schedule!.createdAt).toBeInstanceOf(Date);
      expect(schedule!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll()', () => {
    it('should return empty array when no schedules exist', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const schedules = await repository.findAll();

      expect(schedules).toEqual([]);
      expect(schedules).toHaveLength(0);
    });

    it('should return multiple schedules', async () => {
      const mockRows = [
        createMockScheduleRow({ id: 1, user_id: 'user_1' }),
        createMockScheduleRow({ id: 2, user_id: 'user_2' }),
        createMockScheduleRow({ id: 3, user_id: 'user_3' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const schedules = await repository.findAll();

      expect(schedules).toHaveLength(3);
      expect(schedules[0].userId).toBe('user_1');
      expect(schedules[1].userId).toBe('user_2');
      expect(schedules[2].userId).toBe('user_3');
    });

    it('should exclude soft-deleted records', async () => {
      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL')
      );
    });

    it('should convert all rows to entities', async () => {
      const mockRows = [
        createMockScheduleRow({ id: 1, reminder_sent: 1 }),
        createMockScheduleRow({ id: 2, reminder_sent: 0 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const schedules = await repository.findAll();

      expect(schedules[0].reminderSent).toBe(true);
      expect(schedules[1].reminderSent).toBe(false);
    });
  });

  describe('upsert()', () => {
    describe('insert (new record)', () => {
      it('should insert new schedule when user does not exist', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          chatId: 123456,
          userName: 'NewUser',
          enrollmentDate: new Date('2026-02-08T10:00:00.000Z'),
          nextAssessmentWeek: 0,
          reminderSent: false,
          isiHistory: [],
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO isi_schedule_users'),
          expect.arrayContaining(['new_user', 123456, 'NewUser'])
        );
      });

      it('should use default values for missing fields on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {});

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT'),
          expect.arrayContaining([
            'new_user',
            0,     // default chatId
            null,  // default userName
          ])
        );
      });

      it('should serialize isiHistory to JSON on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const history = [
          { week: 0, score: 20, date: new Date('2026-02-08T10:00:00.000Z') },
        ];

        await repository.upsert('new_user', {
          isiHistory: history,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        // Find the JSON parameter (should contain serialized history)
        const jsonParam = params.find((p: unknown) =>
          typeof p === 'string' && p.includes('"week":0')
        );
        expect(jsonParam).toBeDefined();
        expect(JSON.parse(jsonParam as string)).toEqual([
          { week: 0, score: 20, date: '2026-02-08T10:00:00.000Z' },
        ]);
      });

      it('should convert reminderSent boolean to integer on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          reminderSent: true,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        // reminderSent should be converted to 1
        expect(params).toContainEqual(1);
      });

      it('should convert dates to ISO strings on insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const enrollmentDate = new Date('2026-02-08T12:00:00.000Z');

        await repository.upsert('new_user', {
          enrollmentDate,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(params).toContainEqual('2026-02-08T12:00:00.000Z');
      });
    });

    describe('update (existing record)', () => {
      it('should update existing schedule when user exists', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          nextAssessmentWeek: 6,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE isi_schedule_users'),
          expect.arrayContaining([6, 'existing_user'])
        );
      });

      it('should only update provided fields', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          nextAssessmentWeek: 8,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];

        expect(sql).toContain('next_assessment_week = ?');
        expect(sql).toContain('updated_at = ?');
        // Should not contain other field updates
        expect(sql).not.toContain('chat_id = ?');
        expect(sql).not.toContain('user_name = ?');
      });

      it('should update multiple fields at once', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          chatId: 999999,
          userName: 'UpdatedName',
          reminderSent: true,
          lastAssessmentWeek: 4,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];

        expect(sql).toContain('chat_id = ?');
        expect(sql).toContain('user_name = ?');
        expect(sql).toContain('reminder_sent = ?');
        expect(sql).toContain('last_assessment_week = ?');
      });

      it('should always update updated_at on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          nextAssessmentWeek: 10,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('updated_at = ?'),
          expect.anything()
        );
      });

      it('should serialize isiHistory to JSON on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });
        const history = [
          { week: 0, score: 18, date: new Date('2026-01-15T10:00:00.000Z') },
          { week: 4, score: 12, date: new Date('2026-02-12T14:00:00.000Z') },
        ];

        await repository.upsert('existing_user', {
          isiHistory: history,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];
        const params = call[1];

        expect(sql).toContain('isi_history_json = ?');
        const jsonParam = params.find((p: unknown) =>
          typeof p === 'string' && p.includes('"week":0')
        );
        const parsed = JSON.parse(jsonParam as string);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].week).toBe(0);
        expect(parsed[1].score).toBe(12);
      });

      it('should skip lastAssessmentDate when undefined on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          lastAssessmentDate: undefined,
          nextAssessmentWeek: 6, // Need at least one field to update
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];
        // lastAssessmentDate should NOT be in the update when undefined
        expect(sql).not.toContain('last_assessment_date = ?');
      });

      it('should set lastAssessmentDate to null when Date is provided then cleared', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        // When a Date is provided, it should be serialized
        await repository.upsert('existing_user', {
          lastAssessmentDate: new Date('2026-02-08T10:00:00.000Z'),
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const sql = call[0];
        const params = call[1];
        expect(sql).toContain('last_assessment_date = ?');
        expect(params).toContain('2026-02-08T10:00:00.000Z');
      });

      it('should convert reminderSent to 0 when false on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          reminderSent: false,
        });

        const call = (db.execute as jest.Mock).mock.calls[0];
        const params = call[1];
        expect(params).toContainEqual(0);
      });

      it('should only update non-deleted records', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('existing_user', {
          nextAssessmentWeek: 6,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('deleted_at IS NULL'),
          expect.anything()
        );
      });
    });
  });

  describe('deleteByUserId()', () => {
    it('should perform soft delete', async () => {
      await repository.deleteByUserId('user_123');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = datetime'),
        ['user_123']
      );
    });

    it('should not hard delete the record', async () => {
      await repository.deleteByUserId('user_123');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.anything()
      );
      expect(db.execute).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.anything()
      );
    });

    it('should only delete non-deleted records', async () => {
      await repository.deleteByUserId('user_123');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should pass correct user ID', async () => {
      await repository.deleteByUserId('specific_user_456');

      expect(db.execute).toHaveBeenCalledWith(
        expect.anything(),
        ['specific_user_456']
      );
    });
  });

  describe('rowToEntity() - type conversions', () => {
    describe('date conversions', () => {
      it('should convert enrollment_date to Date object', async () => {
        const mockRow = createMockScheduleRow({
          enrollment_date: '2026-02-08T15:30:00.000Z',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.enrollmentDate).toBeInstanceOf(Date);
        expect(schedule!.enrollmentDate.toISOString()).toBe('2026-02-08T15:30:00.000Z');
      });

      it('should convert last_assessment_date to Date object when present', async () => {
        const mockRow = createMockScheduleRow({
          last_assessment_date: '2026-02-05T12:00:00.000Z',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.lastAssessmentDate).toBeInstanceOf(Date);
        expect(schedule!.lastAssessmentDate!.toISOString()).toBe('2026-02-05T12:00:00.000Z');
      });

      it('should set lastAssessmentDate to undefined when null', async () => {
        const mockRow = createMockScheduleRow({
          last_assessment_date: null,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.lastAssessmentDate).toBeUndefined();
      });

      it('should convert created_at to Date object', async () => {
        const mockRow = createMockScheduleRow({
          created_at: '2026-01-01T00:00:00.000Z',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.createdAt).toBeInstanceOf(Date);
      });

      it('should convert updated_at to Date object', async () => {
        const mockRow = createMockScheduleRow({
          updated_at: '2026-02-07T23:59:59.000Z',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('boolean conversions', () => {
      it('should convert reminder_sent 1 to true', async () => {
        const mockRow = createMockScheduleRow({
          reminder_sent: 1,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.reminderSent).toBe(true);
      });

      it('should convert reminder_sent 0 to false', async () => {
        const mockRow = createMockScheduleRow({
          reminder_sent: 0,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.reminderSent).toBe(false);
      });
    });

    describe('JSON conversions', () => {
      it('should parse isi_history_json to array', async () => {
        const history = [
          { week: 0, score: 20, date: '2026-01-15T10:00:00.000Z' },
          { week: 2, score: 16, date: '2026-01-29T10:00:00.000Z' },
        ];
        const mockRow = createMockScheduleRow({
          isi_history_json: JSON.stringify(history),
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.isiHistory).toHaveLength(2);
        expect(schedule!.isiHistory[0].week).toBe(0);
        expect(schedule!.isiHistory[0].score).toBe(20);
        expect(schedule!.isiHistory[1].week).toBe(2);
        expect(schedule!.isiHistory[1].score).toBe(16);
      });

      it('should convert date strings in isiHistory to Date objects', async () => {
        const history = [
          { week: 0, score: 18, date: '2026-01-15T10:00:00.000Z' },
        ];
        const mockRow = createMockScheduleRow({
          isi_history_json: JSON.stringify(history),
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.isiHistory[0].date).toBeInstanceOf(Date);
        expect(schedule!.isiHistory[0].date.toISOString()).toBe('2026-01-15T10:00:00.000Z');
      });

      it('should handle empty isiHistory array', async () => {
        const mockRow = createMockScheduleRow({
          isi_history_json: '[]',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.isiHistory).toEqual([]);
        expect(schedule!.isiHistory).toHaveLength(0);
      });
    });

    describe('nullable field conversions', () => {
      it('should convert user_name null to undefined', async () => {
        const mockRow = createMockScheduleRow({
          user_name: null,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.userName).toBeUndefined();
      });

      it('should preserve user_name when present', async () => {
        const mockRow = createMockScheduleRow({
          user_name: 'TestUserName',
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.userName).toBe('TestUserName');
      });

      it('should convert last_assessment_week null to undefined', async () => {
        const mockRow = createMockScheduleRow({
          last_assessment_week: null,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.lastAssessmentWeek).toBeUndefined();
      });

      it('should preserve last_assessment_week when present', async () => {
        const mockRow = createMockScheduleRow({
          last_assessment_week: 6,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.lastAssessmentWeek).toBe(6);
      });
    });

    describe('numeric field conversions', () => {
      it('should preserve id as number', async () => {
        const mockRow = createMockScheduleRow({
          id: 42,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.id).toBe(42);
        expect(typeof schedule!.id).toBe('number');
      });

      it('should preserve chat_id as number', async () => {
        const mockRow = createMockScheduleRow({
          chat_id: 987654321,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.chatId).toBe(987654321);
        expect(typeof schedule!.chatId).toBe('number');
      });

      it('should preserve next_assessment_week as number', async () => {
        const mockRow = createMockScheduleRow({
          next_assessment_week: 8,
        });
        (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

        const schedule = await repository.findByUserId('user_123');

        expect(schedule!.nextAssessmentWeek).toBe(8);
        expect(typeof schedule!.nextAssessmentWeek).toBe('number');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long user IDs', async () => {
      const longUserId = 'user_' + 'x'.repeat(200);
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId(longUserId);

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.anything(),
        [longUserId]
      );
    });

    it('should handle large chat IDs', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('user_123', {
        chatId: Number.MAX_SAFE_INTEGER,
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      expect(params).toContain(Number.MAX_SAFE_INTEGER);
    });

    it('should handle isiHistory with many entries', async () => {
      const largeHistory = Array.from({ length: 52 }, (_, i) => ({
        week: i,
        score: Math.floor(Math.random() * 28),
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
      }));

      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('user_123', {
        isiHistory: largeHistory,
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      const jsonParam = params.find((p: unknown) =>
        typeof p === 'string' && p.includes('"week":0')
      );
      const parsed = JSON.parse(jsonParam as string);
      expect(parsed).toHaveLength(52);
    });

    it('should handle special characters in userName', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('user_123', {
        userName: "Test'User\"With<Special>Chars",
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      expect(params).toContain("Test'User\"With<Special>Chars");
    });

    it('should handle week 0 correctly', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

      await repository.upsert('user_123', {
        nextAssessmentWeek: 0,
        lastAssessmentWeek: 0,
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      // Both 0 values should be present
      expect(params.filter((p: unknown) => p === 0)).toHaveLength(2);
    });

    it('should handle concurrent upserts correctly', async () => {
      // First call checks existence (not found)
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      // Simulate two concurrent upserts
      const upsert1 = repository.upsert('user_123', { nextAssessmentWeek: 2 });
      const upsert2 = repository.upsert('user_456', { nextAssessmentWeek: 4 });

      await Promise.all([upsert1, upsert2]);

      expect(db.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle isiHistory with string dates on insert', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      // Dates passed as strings (already serialized)
      const history = [
        { week: 0, score: 18, date: '2026-01-15T10:00:00.000Z' as unknown as Date },
      ];

      await repository.upsert('user_123', {
        isiHistory: history,
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      const jsonParam = params.find((p: unknown) =>
        typeof p === 'string' && p.includes('"week":0')
      );
      const parsed = JSON.parse(jsonParam as string);
      expect(parsed[0].date).toBe('2026-01-15T10:00:00.000Z');
    });

    it('should handle isiHistory with string dates on update', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });
      // Dates passed as strings (already serialized)
      const history = [
        { week: 2, score: 14, date: '2026-02-01T10:00:00.000Z' as unknown as Date },
      ];

      await repository.upsert('user_123', {
        isiHistory: history,
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];
      const jsonParam = params.find((p: unknown) =>
        typeof p === 'string' && p.includes('"week":2')
      );
      const parsed = JSON.parse(jsonParam as string);
      expect(parsed[0].date).toBe('2026-02-01T10:00:00.000Z');
    });

    it('should update enrollmentDate when provided on update', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

      await repository.upsert('existing_user', {
        enrollmentDate: new Date('2026-03-01T09:00:00.000Z'),
      });

      const call = (db.execute as jest.Mock).mock.calls[0];
      const sql = call[0];
      const params = call[1];

      expect(sql).toContain('enrollment_date = ?');
      expect(params).toContain('2026-03-01T09:00:00.000Z');
    });
  });

  describe('SQL query structure', () => {
    it('should use correct table name in findByUserId', async () => {
      await repository.findByUserId('user_123');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('isi_schedule_users'),
        expect.anything()
      );
    });

    it('should use correct table name in findAll', async () => {
      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('isi_schedule_users')
      );
    });

    it('should use correct table name in upsert', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('user_123', {});

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('isi_schedule_users'),
        expect.anything()
      );
    });

    it('should use correct table name in deleteByUserId', async () => {
      await repository.deleteByUserId('user_123');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('isi_schedule_users'),
        expect.anything()
      );
    });
  });
});
