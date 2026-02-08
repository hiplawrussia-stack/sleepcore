/**
 * OnboardingRepository Unit Tests
 * ================================
 * Tests for user onboarding state persistence.
 *
 * Covers:
 * - Find operations (findByUserId, findAll)
 * - Upsert operations (insert and update paths)
 * - Row to entity conversion
 * - Soft delete handling (deleted_at)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { OnboardingRepository, IOnboardingRow, IOnboardingEntity } from '../OnboardingRepository';
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
 * Create mock onboarding row (database format)
 */
function createMockOnboardingRow(overrides: Partial<IOnboardingRow> = {}): IOnboardingRow {
  return {
    id: 1,
    user_id: 'tg_123456',
    started_at: '2026-01-15T10:00:00.000Z',
    completed_at: null,
    current_step: 'diary_intro',
    completed_steps_json: '["welcome_viewed","consent_given"]',
    is_completed: 0,
    completion_percentage: 40,
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-01-15T12:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('OnboardingRepository', () => {
  let db: IDatabaseConnection;
  let repository: OnboardingRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new OnboardingRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(OnboardingRepository);
    });
  });

  describe('findByUserId()', () => {
    it('should find onboarding by user ID', async () => {
      const mockRow = createMockOnboardingRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('tg_123456');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        ['tg_123456']
      );
    });

    it('should return null for non-existent user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByUserId('unknown_user');

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted records', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId('tg_123456');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should convert row to entity correctly', async () => {
      const mockRow = createMockOnboardingRow({
        id: 42,
        user_id: 'tg_999',
        current_step: 'isi_assessment',
        completed_steps_json: '["step1","step2","step3"]',
        is_completed: 0,
        completion_percentage: 75,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_999');

      expect(result).toMatchObject({
        id: 42,
        userId: 'tg_999',
        currentStep: 'isi_assessment',
        completedStepsJson: '["step1","step2","step3"]',
        isCompleted: false,
        completionPercentage: 75,
      });
    });

    it('should convert startedAt to Date', async () => {
      const mockRow = createMockOnboardingRow({
        started_at: '2026-02-01T08:30:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.startedAt).toBeInstanceOf(Date);
      expect(result!.startedAt.toISOString()).toBe('2026-02-01T08:30:00.000Z');
    });

    it('should handle completedAt when set', async () => {
      const mockRow = createMockOnboardingRow({
        completed_at: '2026-02-05T15:00:00.000Z',
        is_completed: 1,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completedAt).toBeInstanceOf(Date);
      expect(result!.completedAt!.toISOString()).toBe('2026-02-05T15:00:00.000Z');
      expect(result!.isCompleted).toBe(true);
    });

    it('should return undefined for completedAt when not completed', async () => {
      const mockRow = createMockOnboardingRow({
        completed_at: null,
        is_completed: 0,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completedAt).toBeUndefined();
      expect(result!.isCompleted).toBe(false);
    });
  });

  describe('findAll()', () => {
    it('should return all onboarding records', async () => {
      const mockRows = [
        createMockOnboardingRow({ id: 1, user_id: 'user_1' }),
        createMockOnboardingRow({ id: 2, user_id: 'user_2' }),
        createMockOnboardingRow({ id: 3, user_id: 'user_3' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.findAll();

      expect(results).toHaveLength(3);
      expect(results[0].userId).toBe('user_1');
      expect(results[1].userId).toBe('user_2');
      expect(results[2].userId).toBe('user_3');
    });

    it('should return empty array when no records exist', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const results = await repository.findAll();

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });

    it('should exclude soft-deleted records', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL')
      );
    });

    it('should convert all rows to entities', async () => {
      const mockRows = [
        createMockOnboardingRow({
          id: 1,
          is_completed: 0,
          completion_percentage: 25
        }),
        createMockOnboardingRow({
          id: 2,
          is_completed: 1,
          completion_percentage: 100,
          completed_at: '2026-02-01T12:00:00.000Z',
        }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.findAll();

      expect(results[0].isCompleted).toBe(false);
      expect(results[0].completionPercentage).toBe(25);
      expect(results[1].isCompleted).toBe(true);
      expect(results[1].completionPercentage).toBe(100);
      expect(results[1].completedAt).toBeInstanceOf(Date);
    });
  });

  describe('upsert()', () => {
    describe('insert path (new record)', () => {
      it('should insert new onboarding record when not exists', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null); // No existing record

        await repository.upsert('new_user', {
          currentStep: 'welcome_viewed',
          completedStepsJson: '[]',
          isCompleted: false,
          completionPercentage: 0,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO onboarding_progress'),
          expect.any(Array)
        );
      });

      it('should use provided startedAt for new record', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const startedAt = new Date('2026-01-20T09:00:00.000Z');

        await repository.upsert('new_user', {
          startedAt,
          currentStep: 'consent',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain('2026-01-20T09:00:00.000Z');
      });

      it('should use current time when startedAt not provided', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const beforeTest = new Date();

        await repository.upsert('new_user', {
          currentStep: 'welcome_viewed',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const params = executeCall[1] as string[];
        // started_at is second param after user_id
        const startedAtStr = params[1];
        const startedAt = new Date(startedAtStr);

        expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime() - 1000);
      });

      it('should set default values for new record', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {});

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;
        const params = executeCall[1] as unknown[];

        expect(sql).toContain('INSERT INTO onboarding_progress');
        // Check defaults: current_step = 'welcome_viewed', completed_steps_json = '[]'
        expect(params).toContain('welcome_viewed');
        expect(params).toContain('[]');
        expect(params).toContain(0); // is_completed = false → 0
        expect(params).toContain(0); // completion_percentage = 0
      });

      it('should include user_id in insert', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('tg_789', {
          currentStep: 'diary_intro',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain('tg_789');
      });

      it('should handle completedAt for new record', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const completedAt = new Date('2026-02-01T18:00:00.000Z');

        await repository.upsert('new_user', {
          isCompleted: true,
          completedAt,
          completionPercentage: 100,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain('2026-02-01T18:00:00.000Z');
      });

      it('should set completedAt to null when not provided', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('new_user', {
          isCompleted: false,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain(null);
      });
    });

    describe('update path (existing record)', () => {
      it('should update existing onboarding record', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 42 }); // Existing record

        await repository.upsert('existing_user', {
          currentStep: 'isi_assessment',
          completionPercentage: 60,
        });

        expect(db.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE onboarding_progress SET'),
          expect.any(Array)
        );
      });

      it('should update current_step', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          currentStep: 'diary_training',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;

        expect(sql).toContain('current_step = ?');
      });

      it('should update completed_steps_json', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          completedStepsJson: '["step1","step2","step3","step4"]',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain('["step1","step2","step3","step4"]');
      });

      it('should update is_completed flag', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          isCompleted: true,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;

        expect(sql).toContain('is_completed = ?');
        expect(executeCall[1]).toContain(1); // true → 1
      });

      it('should update completion_percentage', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          completionPercentage: 85,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain(85);
      });

      it('should update completed_at when completion happens', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });
        const completedAt = new Date('2026-02-10T16:00:00.000Z');

        await repository.upsert('user_1', {
          isCompleted: true,
          completedAt,
          completionPercentage: 100,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;

        expect(sql).toContain('completed_at = ?');
        expect(executeCall[1]).toContain('2026-02-10T16:00:00.000Z');
      });

      it('should update updated_at timestamp', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          currentStep: 'next_step',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;

        expect(sql).toContain('updated_at = ?');
      });

      it('should filter by user_id and deleted_at IS NULL', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {});

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const sql = executeCall[0] as string;

        expect(sql).toContain('WHERE user_id = ?');
        expect(sql).toContain('deleted_at IS NULL');
      });

      it('should use default values for undefined fields on update', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {});

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        const params = executeCall[1] as unknown[];

        // Defaults: currentStep = 'welcome_viewed', completedStepsJson = '[]'
        expect(params).toContain('welcome_viewed');
        expect(params).toContain('[]');
        expect(params).toContain(0); // isCompleted = false → 0
        expect(params).toContain(0); // completionPercentage = 0
      });
    });

    describe('edge cases', () => {
      it('should handle empty completedStepsJson', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('user_1', {
          completedStepsJson: '[]',
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain('[]');
      });

      it('should handle complex completedStepsJson', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);
        const complexJson = JSON.stringify([
          'welcome_viewed',
          'consent_given',
          'isi_completed',
          'meq_completed',
          'diary_intro',
          'first_diary_entry',
        ]);

        await repository.upsert('user_1', {
          completedStepsJson: complexJson,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain(complexJson);
      });

      it('should handle zero completion percentage', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue(null);

        await repository.upsert('user_1', {
          completionPercentage: 0,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain(0);
      });

      it('should handle 100% completion percentage', async () => {
        (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

        await repository.upsert('user_1', {
          completionPercentage: 100,
          isCompleted: true,
        });

        const executeCall = (db.execute as jest.Mock).mock.calls[0];
        expect(executeCall[1]).toContain(100);
        expect(executeCall[1]).toContain(1); // isCompleted = true
      });
    });
  });

  describe('rowToEntity conversion (via findByUserId)', () => {
    it('should convert is_completed 1 to true', async () => {
      const mockRow = createMockOnboardingRow({ is_completed: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.isCompleted).toBe(true);
    });

    it('should convert is_completed 0 to false', async () => {
      const mockRow = createMockOnboardingRow({ is_completed: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.isCompleted).toBe(false);
    });

    it('should preserve id from row', async () => {
      const mockRow = createMockOnboardingRow({ id: 999 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.id).toBe(999);
    });

    it('should map user_id to userId', async () => {
      const mockRow = createMockOnboardingRow({ user_id: 'tg_custom_id' });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_custom_id');

      expect(result!.userId).toBe('tg_custom_id');
    });

    it('should map current_step to currentStep', async () => {
      const mockRow = createMockOnboardingRow({ current_step: 'therapy_intro' });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.currentStep).toBe('therapy_intro');
    });

    it('should map completed_steps_json to completedStepsJson', async () => {
      const stepsJson = '["a","b","c"]';
      const mockRow = createMockOnboardingRow({ completed_steps_json: stepsJson });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completedStepsJson).toBe(stepsJson);
    });

    it('should map completion_percentage to completionPercentage', async () => {
      const mockRow = createMockOnboardingRow({ completion_percentage: 67 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completionPercentage).toBe(67);
    });

    it('should parse started_at string to Date', async () => {
      const mockRow = createMockOnboardingRow({
        started_at: '2026-03-15T14:30:00.000Z'
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.startedAt).toEqual(new Date('2026-03-15T14:30:00.000Z'));
    });

    it('should parse completed_at string to Date when present', async () => {
      const mockRow = createMockOnboardingRow({
        completed_at: '2026-03-20T18:00:00.000Z',
        is_completed: 1,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completedAt).toEqual(new Date('2026-03-20T18:00:00.000Z'));
    });

    it('should set completedAt to undefined when null', async () => {
      const mockRow = createMockOnboardingRow({ completed_at: null });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByUserId('tg_123456');

      expect(result!.completedAt).toBeUndefined();
    });
  });

  describe('query safety', () => {
    it('should use parameterized queries for findByUserId', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findByUserId("'; DROP TABLE users; --");

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE users; --"]
      );
    });

    it('should use parameterized queries for upsert', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert("malicious'; --", {
        currentStep: "'; DROP TABLE;--",
      });

      const executeCall = (db.execute as jest.Mock).mock.calls[0];
      // Values should be in params array, not SQL string
      expect(executeCall[1]).toContain("malicious'; --");
      expect(executeCall[1]).toContain("'; DROP TABLE;--");
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent findByUserId calls', async () => {
      const mockRow = createMockOnboardingRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const [result1, result2, result3] = await Promise.all([
        repository.findByUserId('user_1'),
        repository.findByUserId('user_2'),
        repository.findByUserId('user_3'),
      ]);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result3).not.toBeNull();
      expect(db.queryOne).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent upsert calls', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await Promise.all([
        repository.upsert('user_1', { completionPercentage: 10 }),
        repository.upsert('user_2', { completionPercentage: 20 }),
        repository.upsert('user_3', { completionPercentage: 30 }),
      ]);

      expect(db.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe('onboarding workflow scenarios', () => {
    it('should track fresh user onboarding start', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.upsert('new_user', {
        startedAt: new Date(),
        currentStep: 'welcome_viewed',
        completedStepsJson: '["welcome_viewed"]',
        isCompleted: false,
        completionPercentage: 10,
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining(['new_user', 'welcome_viewed'])
      );
    });

    it('should track progress through onboarding steps', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });

      await repository.upsert('user_1', {
        currentStep: 'isi_assessment',
        completedStepsJson: '["welcome_viewed","consent_given"]',
        completionPercentage: 40,
      });

      const executeCall = (db.execute as jest.Mock).mock.calls[0];
      expect(executeCall[1]).toContain('isi_assessment');
      expect(executeCall[1]).toContain(40);
    });

    it('should mark onboarding as completed', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ id: 1 });
      const completedAt = new Date();

      await repository.upsert('user_1', {
        currentStep: 'completed',
        completedStepsJson: JSON.stringify([
          'welcome_viewed',
          'consent_given',
          'isi_completed',
          'meq_completed',
          'diary_intro',
          'first_diary_entry',
          'therapy_intro',
        ]),
        isCompleted: true,
        completedAt,
        completionPercentage: 100,
      });

      const executeCall = (db.execute as jest.Mock).mock.calls[0];
      expect(executeCall[1]).toContain(1); // isCompleted = true
      expect(executeCall[1]).toContain(100);
    });
  });
});
