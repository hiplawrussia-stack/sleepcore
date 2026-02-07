/**
 * TherapySessionRepository Unit Tests
 * =====================================
 *
 * Tests for CBT-I therapy session data access with PHI encryption.
 * Covers:
 *
 * - Session lifecycle (scheduled → in_progress → completed/skipped)
 * - Adherence calculation
 * - Completion rate tracking
 * - Homework completion tracking
 * - Weekly progress summaries
 * - PHI encryption for therapy notes
 *
 * Traceability:
 * - REQ-CBTI-003 (Therapy session tracking)
 * - REQ-ADHERENCE-001 (Treatment adherence)
 * - REQ-PHI-001 (PHI encryption)
 *
 * @packageDocumentation
 */

import { TherapySessionRepository } from '../TherapySessionRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';
import type { ITherapySessionEntity } from '../../interfaces/IRepository';

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
 * Create mock therapy session row (database format)
 */
function createMockSessionRow(overrides: Partial<Record<string, unknown>> = {}) {
  const encryptedNotes = JSON.stringify({
    ciphertext: Buffer.from('Session notes').toString('base64'),
    iv: 'mock-iv',
    authTag: 'mock-auth-tag',
  });

  return {
    id: 1,
    user_id: '123',
    session_type: 'cbti',
    week: 1,
    component: 'sleep_restriction',
    status: 'scheduled',
    adherence: 0,
    homework_completed: 0,
    notes_json: encryptedNotes,
    scheduled_at: '2026-02-01T10:00:00.000Z',
    completed_at: null,
    created_at: '2026-02-01T08:00:00.000Z',
    updated_at: '2026-02-01T08:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('TherapySessionRepository', () => {
  let db: IDatabaseConnection;
  let repository: TherapySessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new TherapySessionRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeInstanceOf(TherapySessionRepository);
    });
  });

  describe('findByUserAndType()', () => {
    it('should find sessions by user and session type', async () => {
      const rows = [
        createMockSessionRow({ week: 1 }),
        createMockSessionRow({ id: 2, week: 2 }),
        createMockSessionRow({ id: 3, week: 3 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByUserAndType('123', 'cbti');

      expect(result).toHaveLength(3);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND session_type = ?'),
        ['123', 'cbti']
      );
    });

    it('should order by week and scheduled_at', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserAndType('123', 'cbti');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY week ASC, scheduled_at ASC'),
        expect.any(Array)
      );
    });
  });

  describe('getCurrentWeekSessions()', () => {
    it('should return sessions for current week', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ max_week: 3 });
      const rows = [
        createMockSessionRow({ week: 3, component: 'sleep_restriction' }),
        createMockSessionRow({ id: 2, week: 3, component: 'stimulus_control' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getCurrentWeekSessions('123');

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND week = ?'),
        ['123', 3]
      );
    });

    it('should default to week 1 when no sessions exist', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getCurrentWeekSessions('123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND week = ?'),
        ['123', 1]
      );
    });
  });

  describe('calculateAdherence() - REQ-ADHERENCE-001', () => {
    it('should calculate average adherence for completed sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ avg_adherence: 85 });

      const result = await repository.calculateAdherence('123');

      expect(result).toBe(85);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        ['123']
      );
    });

    it('should filter by session type when specified', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ avg_adherence: 90 });

      await repository.calculateAdherence('123', 'cbti');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND session_type = ?'),
        ['123', 'cbti']
      );
    });

    it('should return 0 when no completed sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ avg_adherence: null });

      const result = await repository.calculateAdherence('123');

      expect(result).toBe(0);
    });

    it('should round adherence to whole number', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ avg_adherence: 87.6 });

      const result = await repository.calculateAdherence('123');

      expect(result).toBe(88);
    });
  });

  describe('getCompletionRate()', () => {
    it('should return completion statistics', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ total: 10, completed: 7 });

      const result = await repository.getCompletionRate('123');

      expect(result.total).toBe(10);
      expect(result.completed).toBe(7);
      expect(result.rate).toBe(70);
    });

    it('should return 0 rate when no sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ total: 0, completed: 0 });

      const result = await repository.getCompletionRate('123');

      expect(result.rate).toBe(0);
    });

    it('should filter by session type', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ total: 5, completed: 4 });

      await repository.getCompletionRate('123', 'mbti');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND session_type = ?'),
        ['123', 'mbti']
      );
    });
  });

  describe('findByWeek()', () => {
    it('should find sessions for specific week', async () => {
      const rows = [
        createMockSessionRow({ week: 2 }),
        createMockSessionRow({ id: 2, week: 2 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByWeek('123', 2);

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND week = ?'),
        ['123', 2]
      );
    });
  });

  describe('getNextSession()', () => {
    it('should return next scheduled session', async () => {
      const row = createMockSessionRow({ status: 'scheduled' });
      (db.queryOne as jest.Mock).mockResolvedValue(row);

      const result = await repository.getNextSession('123');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('scheduled');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'scheduled'"),
        ['123']
      );
    });

    it('should return null when no scheduled sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getNextSession('123');

      expect(result).toBeNull();
    });
  });

  describe('startSession()', () => {
    it('should update session status to in_progress', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const result = await repository.startSession(1);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'in_progress'"),
        [1]
      );
    });

    it('should only start scheduled sessions', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.startSession(1);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("status = 'scheduled'"),
        expect.any(Array)
      );
    });

    it('should return false when session not found or not scheduled', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.startSession(999);

      expect(result).toBe(false);
    });
  });

  describe('completeSession()', () => {
    it('should complete session with adherence and homework status', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const result = await repository.completeSession(1, 90, true, 'Great progress today');

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'completed'"),
        expect.any(Array)
      );
    });

    it('should encrypt therapy notes (PHI)', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.completeSession(1, 90, true, 'Patient reported anxiety reduction');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().encryptField).toHaveBeenCalledWith(
        'Patient reported anxiety reduction'
      );
    });

    it('should set completed_at timestamp', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.completeSession(1, 85, false);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = datetime('now')"),
        expect.any(Array)
      );
    });

    it('should only complete in_progress sessions', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.completeSession(1, 85, true);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("status = 'in_progress'"),
        expect.any(Array)
      );
    });

    it('should handle null notes', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.completeSession(1, 80, false);

      // Should not throw
      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe('skipSession()', () => {
    it('should skip session with reason', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const result = await repository.skipSession(1, 'Feeling unwell');

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'skipped'"),
        expect.any(Array)
      );
    });

    it('should encrypt skip reason (PHI)', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.skipSession(1, 'Anxiety episode prevented participation');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().encryptField).toHaveBeenCalledWith(
        expect.stringContaining('skipReason')
      );
    });

    it('should allow skipping scheduled or in_progress sessions', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.skipSession(1);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('scheduled', 'in_progress')"),
        expect.any(Array)
      );
    });

    it('should handle no reason provided', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const result = await repository.skipSession(1);

      expect(result).toBe(true);
    });
  });

  describe('getHomeworkCompletionRate()', () => {
    it('should calculate homework completion rate', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ total: 10, completed: 8 });

      const result = await repository.getHomeworkCompletionRate('123');

      expect(result.total).toBe(10);
      expect(result.completed).toBe(8);
      expect(result.rate).toBe(80);
    });

    it('should only count completed sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ total: 5, completed: 5 });

      await repository.getHomeworkCompletionRate('123');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        ['123']
      );
    });

    it('should return 0 rate when no completed sessions', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getHomeworkCompletionRate('123');

      expect(result.rate).toBe(0);
    });
  });

  describe('getWeeklyProgress()', () => {
    it('should return progress summary per week', async () => {
      const rows = [
        { week: 1, planned: 3, completed: 3, avg_adherence: 85, homework: 2 },
        { week: 2, planned: 3, completed: 2, avg_adherence: 80, homework: 2 },
        { week: 3, planned: 3, completed: 1, avg_adherence: 75, homework: 1 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getWeeklyProgress('123');

      expect(result).toHaveLength(3);
      expect(result[0].week).toBe(1);
      expect(result[0].sessionsPlanned).toBe(3);
      expect(result[0].sessionsCompleted).toBe(3);
      expect(result[0].avgAdherence).toBe(85);
      expect(result[0].homeworkCompleted).toBe(2);
    });

    it('should order by week ascending', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getWeeklyProgress('123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY week ASC'),
        ['123']
      );
    });

    it('should round average adherence', async () => {
      const rows = [
        { week: 1, planned: 3, completed: 2, avg_adherence: 87.5, homework: 1 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getWeeklyProgress('123');

      expect(result[0].avgAdherence).toBe(88);
    });

    it('should handle null adherence', async () => {
      const rows = [
        { week: 1, planned: 3, completed: 0, avg_adherence: null, homework: 0 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getWeeklyProgress('123');

      expect(result[0].avgAdherence).toBe(0);
    });
  });

  describe('findByComponent()', () => {
    it('should find sessions by therapy component', async () => {
      const rows = [
        createMockSessionRow({ component: 'cognitive_restructuring' }),
        createMockSessionRow({ id: 2, week: 2, component: 'cognitive_restructuring' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByComponent('123', 'cognitive_restructuring');

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND component = ?'),
        ['123', 'cognitive_restructuring']
      );
    });
  });

  describe('rowToEntity conversion', () => {
    it('should correctly map database row to entity', async () => {
      const row = createMockSessionRow({
        status: 'completed',
        adherence: 90,
        homework_completed: 1,
        completed_at: '2026-02-01T11:00:00.000Z',
      });
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndType('123', 'cbti');
      const entity = result[0];

      expect(entity.id).toBe(1);
      expect(entity.userId).toBe('123');
      expect(entity.sessionType).toBe('cbti');
      expect(entity.week).toBe(1);
      expect(entity.component).toBe('sleep_restriction');
      expect(entity.status).toBe('completed');
      expect(entity.adherence).toBe(90);
      expect(entity.homeworkCompleted).toBe(true);
      expect(entity.notesJson).toBe('Session notes');
      expect(entity.scheduledAt).toBeInstanceOf(Date);
      expect(entity.completedAt).toBeInstanceOf(Date);
    });

    it('should convert homework_completed to boolean', async () => {
      const row0 = createMockSessionRow({ homework_completed: 0 });
      const row1 = createMockSessionRow({ id: 2, homework_completed: 1 });
      (db.query as jest.Mock).mockResolvedValue([row0, row1]);

      const result = await repository.findByUserAndType('123', 'cbti');

      expect(result[0].homeworkCompleted).toBe(false);
      expect(result[1].homeworkCompleted).toBe(true);
    });

    it('should handle null completed_at', async () => {
      const row = createMockSessionRow({ completed_at: null });
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndType('123', 'cbti');

      expect(result[0].completedAt).toBeUndefined();
    });

    it('should decrypt PHI notes', async () => {
      const row = createMockSessionRow();
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndType('123', 'cbti');

      expect(result[0].notesJson).toBe('Session notes');
    });
  });

  describe('entityToParams conversion', () => {
    it('should correctly map entity fields to database columns', async () => {
      const entity: Partial<ITherapySessionEntity> = {
        id: 1,
        userId: '123',
        sessionType: 'cbti',
        week: 2,
        component: 'sleep_restriction',
        status: 'scheduled',
        adherence: 85,
        homeworkCompleted: true,
        notesJson: 'Session notes',
        scheduledAt: new Date('2026-02-01T10:00:00.000Z'),
        completedAt: new Date('2026-02-01T11:00:00.000Z'),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockSessionRow());

      await repository.insert(entity as Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });

    it('should convert dates to ISO strings', async () => {
      const entity: Partial<ITherapySessionEntity> = {
        userId: '456',
        sessionType: 'mbti',
        week: 1,
        component: 'mindfulness',
        status: 'completed',
        adherence: 90,
        homeworkCompleted: false,
        scheduledAt: new Date('2026-03-15T09:00:00.000Z'),
        completedAt: new Date('2026-03-15T10:00:00.000Z'),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 2 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockSessionRow({ id: 2 }));

      await repository.insert(entity as Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });

    it('should convert homeworkCompleted boolean to number', async () => {
      const entity: Partial<ITherapySessionEntity> = {
        userId: '789',
        sessionType: 'acti',
        week: 3,
        component: 'acceptance',
        status: 'scheduled',
        adherence: 0,
        homeworkCompleted: false,
        scheduledAt: new Date(),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 3 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockSessionRow({ id: 3, homework_completed: 0 }));

      await repository.insert(entity as Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });

    it('should handle optional notesJson', async () => {
      const entity: Partial<ITherapySessionEntity> = {
        userId: '999',
        sessionType: 'cbti',
        week: 1,
        component: 'stimulus_control',
        status: 'scheduled',
        adherence: 0,
        homeworkCompleted: false,
        scheduledAt: new Date(),
        // No notesJson
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 4 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockSessionRow({ id: 4, notes_json: null }));

      await repository.insert(entity as Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe('getInsertColumns()', () => {
    it('should include all required columns', async () => {
      const entity: Partial<ITherapySessionEntity> = {
        userId: '123',
        sessionType: 'cbti',
        week: 1,
        component: 'sleep_restriction',
        status: 'scheduled',
        adherence: 0,
        homeworkCompleted: false,
        scheduledAt: new Date(),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockSessionRow());

      await repository.insert(entity as Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>);

      const sqlCall = (db.execute as jest.Mock).mock.calls[0][0];
      expect(sqlCall).toContain('user_id');
      expect(sqlCall).toContain('session_type');
      expect(sqlCall).toContain('week');
      expect(sqlCall).toContain('component');
      expect(sqlCall).toContain('status');
    });
  });

  describe('Session lifecycle (REQ-CBTI-003)', () => {
    it('should support full lifecycle: scheduled → in_progress → completed', async () => {
      // 1. Session starts as scheduled
      const scheduledRow = createMockSessionRow({ status: 'scheduled' });
      (db.queryOne as jest.Mock).mockResolvedValue(scheduledRow);

      const scheduled = await repository.getNextSession('123');
      expect(scheduled?.status).toBe('scheduled');

      // 2. Start session
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      const started = await repository.startSession(1);
      expect(started).toBe(true);

      // 3. Complete session
      const completed = await repository.completeSession(1, 95, true, 'Excellent session');
      expect(completed).toBe(true);
    });

    it('should support skip flow: scheduled → skipped', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      const skipped = await repository.skipSession(1, 'Illness');

      expect(skipped).toBe(true);
    });
  });

  describe('PHI encryption compliance (REQ-PHI-001)', () => {
    it('should encrypt notes on complete', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.completeSession(1, 85, true, 'Sensitive therapy content');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().encryptField).toHaveBeenCalledWith(
        'Sensitive therapy content'
      );
    });

    it('should encrypt skip reason', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

      await repository.skipSession(1, 'Mental health crisis');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().encryptField).toHaveBeenCalled();
    });

    it('should decrypt notes on read', async () => {
      const row = createMockSessionRow();
      (db.queryOne as jest.Mock).mockResolvedValue(row);

      const result = await repository.getNextSession('123');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().decryptField).toHaveBeenCalled();
      expect(result?.notesJson).toBe('Session notes');
    });
  });
});
