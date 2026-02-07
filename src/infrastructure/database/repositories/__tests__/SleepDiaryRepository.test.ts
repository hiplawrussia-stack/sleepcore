/**
 * SleepDiaryRepository Unit Tests
 * ================================
 *
 * Tests for sleep diary data access with PHI encryption.
 * Covers:
 *
 * - CRUD operations
 * - Date range queries
 * - Weekly summaries
 * - Sleep efficiency trends
 * - Baseline metrics calculation
 * - PHI encryption for notes field
 *
 * Traceability:
 * - REQ-DIARY-001 (Sleep diary recording)
 * - REQ-PHI-001 (PHI encryption)
 * - REQ-CBTI-001 (Baseline calculation)
 *
 * @packageDocumentation
 */

import { SleepDiaryRepository } from '../SleepDiaryRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';
import type { ISleepDiaryEntryEntity } from '../../interfaces/IRepository';

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
 * Create mock diary row (database format)
 */
function createMockDiaryRow(overrides: Partial<Record<string, unknown>> = {}) {
  const encryptedNotes = JSON.stringify({
    ciphertext: Buffer.from('Test notes').toString('base64'),
    iv: 'mock-iv',
    authTag: 'mock-auth-tag',
  });

  return {
    id: 1,
    user_id: '123',
    date: '2026-02-01',
    bedtime: '23:00',
    lights_off_time: '23:15',
    sleep_onset_latency: 20,
    wake_time: '07:00',
    out_of_bed_time: '07:15',
    night_awakenings: 2,
    wake_after_sleep_onset: 30,
    total_sleep_time: 420,
    time_in_bed: 480,
    sleep_efficiency: 87.5,
    sleep_quality: 3,
    morning_mood: 3,
    notes: encryptedNotes,
    created_at: '2026-02-01T08:00:00.000Z',
    updated_at: '2026-02-01T08:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('SleepDiaryRepository', () => {
  let db: IDatabaseConnection;
  let repository: SleepDiaryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new SleepDiaryRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeInstanceOf(SleepDiaryRepository);
    });
  });

  describe('findByUserAndDateRange()', () => {
    it('should find entries within date range', async () => {
      const rows = [
        createMockDiaryRow({ date: '2026-02-01' }),
        createMockDiaryRow({ id: 2, date: '2026-02-02' }),
        createMockDiaryRow({ id: 3, date: '2026-02-03' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-03');

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2026-02-01');
      expect(result[2].date).toBe('2026-02-03');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND date >= ? AND date <= ?'),
        ['123', '2026-02-01', '2026-02-03']
      );
    });

    it('should return empty array when no entries found', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-03');

      expect(result).toEqual([]);
    });

    it('should decrypt PHI notes field', async () => {
      const rows = [createMockDiaryRow()];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-01');

      expect(result[0].notes).toBe('Test notes');
    });
  });

  describe('getWeeklySummary()', () => {
    it('should return weekly summary statistics', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        avg_efficiency: 85.5,
        avg_tst: 420,
        avg_sol: 15,
        avg_waso: 25,
        avg_quality: 3.5,
        entry_count: 7,
      });

      const result = await repository.getWeeklySummary('123', '2026-02-01');

      expect(result.avgSleepEfficiency).toBe(85.5);
      expect(result.avgTotalSleepTime).toBe(420);
      expect(result.avgSleepOnsetLatency).toBe(15);
      expect(result.avgWakeAfterSleepOnset).toBe(25);
      expect(result.avgSleepQuality).toBe(3.5);
      expect(result.entryCount).toBe(7);
    });

    it('should calculate correct week end date', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        avg_efficiency: 0,
        avg_tst: 0,
        avg_sol: 0,
        avg_waso: 0,
        avg_quality: 0,
        entry_count: 0,
      });

      await repository.getWeeklySummary('123', '2026-02-01');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND date >= ? AND date <= ?'),
        ['123', '2026-02-01', '2026-02-07']
      );
    });

    it('should return zeros when no data', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getWeeklySummary('123', '2026-02-01');

      expect(result.avgSleepEfficiency).toBe(0);
      expect(result.entryCount).toBe(0);
    });
  });

  describe('getSleepEfficiencyTrend()', () => {
    it('should return efficiency trend in chronological order', async () => {
      const rows = [
        { date: '2026-02-03', sleep_efficiency: 90 },
        { date: '2026-02-02', sleep_efficiency: 85 },
        { date: '2026-02-01', sleep_efficiency: 80 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getSleepEfficiencyTrend('123', 3);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2026-02-01'); // Reversed to chronological
      expect(result[0].sleepEfficiency).toBe(80);
      expect(result[2].date).toBe('2026-02-03');
      expect(result[2].sleepEfficiency).toBe(90);
    });

    it('should respect days limit', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getSleepEfficiencyTrend('123', 7);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['123', 7]
      );
    });
  });

  describe('getLatestEntry()', () => {
    it('should return latest entry for user', async () => {
      const row = createMockDiaryRow({ date: '2026-02-07' });
      (db.queryOne as jest.Mock).mockResolvedValue(row);

      const result = await repository.getLatestEntry('123');

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2026-02-07');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC'),
        ['123']
      );
    });

    it('should return null when no entries', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getLatestEntry('123');

      expect(result).toBeNull();
    });
  });

  describe('countEntriesInRange()', () => {
    it('should count entries in date range', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await repository.countEntriesInRange('123', '2026-02-01', '2026-02-07');

      expect(result).toBe(5);
    });

    it('should return 0 when no entries', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.countEntriesInRange('123', '2026-02-01', '2026-02-07');

      expect(result).toBe(0);
    });
  });

  describe('upsert()', () => {
    it('should insert new entry', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:00',
        lightsOffTime: '23:15',
        sleepOnsetLatency: 20,
        wakeTime: '07:00',
        outOfBedTime: '07:15',
        nightAwakenings: 2,
        wakeAfterSleepOnset: 30,
        totalSleepTime: 420,
        timeInBed: 480,
        sleepEfficiency: 87.5,
        sleepQuality: 3,
        morningMood: 3,
        notes: 'Good sleep',
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow({ notes: entry.notes });
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });

    it('should encrypt notes PHI field on upsert', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:00',
        lightsOffTime: '23:15',
        sleepOnsetLatency: 20,
        wakeTime: '07:00',
        outOfBedTime: '07:15',
        nightAwakenings: 2,
        wakeAfterSleepOnset: 30,
        totalSleepTime: 420,
        timeInBed: 480,
        sleepEfficiency: 87.5,
        sleepQuality: 3,
        morningMood: 3,
        notes: 'Sensitive patient notes',
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      // Verify PHI encryption was called
      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      const mockManager = getPHIEncryptionManager();
      expect(mockManager.encryptField).toHaveBeenCalledWith('Sensitive patient notes');
    });

    it('should update existing entry on conflict', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:30', // Updated
        lightsOffTime: '23:45',
        sleepOnsetLatency: 15,
        wakeTime: '07:30',
        outOfBedTime: '07:45',
        nightAwakenings: 1,
        wakeAfterSleepOnset: 20,
        totalSleepTime: 450,
        timeInBed: 480,
        sleepEfficiency: 93.75,
        sleepQuality: 4,
        morningMood: 4,
        deletedAt: null,
      };

      const updatedRow = createMockDiaryRow({
        bedtime: '23:30',
        sleep_efficiency: 93.75,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(updatedRow);

      await repository.upsert(entry);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(user_id, date) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('getBaselineMetrics()', () => {
    it('should return baseline from first 7 days', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        avg_efficiency: 75.5,
        avg_tst: 380,
        avg_sol: 25,
        avg_waso: 40,
        entry_count: 7,
      });

      const result = await repository.getBaselineMetrics('123');

      expect(result).not.toBeNull();
      expect(result?.avgSleepEfficiency).toBe(75.5);
      expect(result?.avgTotalSleepTime).toBe(380);
      expect(result?.avgSleepOnsetLatency).toBe(25);
      expect(result?.avgWakeAfterSleepOnset).toBe(40);
      expect(result?.entryCount).toBe(7);
    });

    it('should query first 7 entries ordered by date ASC', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        avg_efficiency: 75,
        avg_tst: 380,
        avg_sol: 25,
        avg_waso: 40,
        entry_count: 7,
      });

      await repository.getBaselineMetrics('123');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date ASC'),
        ['123']
      );
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 7'),
        expect.any(Array)
      );
    });

    it('should return null when less than 7 entries (REQ-CBTI-001)', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        avg_efficiency: 75.5,
        avg_tst: 380,
        avg_sol: 25,
        avg_waso: 40,
        entry_count: 5, // Less than 7
      });

      const result = await repository.getBaselineMetrics('123');

      expect(result).toBeNull();
    });

    it('should return null when no data', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getBaselineMetrics('123');

      expect(result).toBeNull();
    });
  });

  describe('rowToEntity conversion', () => {
    it('should correctly map database row to entity', async () => {
      const row = createMockDiaryRow();
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-01');
      const entity = result[0];

      expect(entity.id).toBe(1);
      expect(entity.userId).toBe('123');
      expect(entity.date).toBe('2026-02-01');
      expect(entity.bedtime).toBe('23:00');
      expect(entity.lightsOffTime).toBe('23:15');
      expect(entity.sleepOnsetLatency).toBe(20);
      expect(entity.wakeTime).toBe('07:00');
      expect(entity.outOfBedTime).toBe('07:15');
      expect(entity.nightAwakenings).toBe(2);
      expect(entity.wakeAfterSleepOnset).toBe(30);
      expect(entity.totalSleepTime).toBe(420);
      expect(entity.timeInBed).toBe(480);
      expect(entity.sleepEfficiency).toBe(87.5);
      expect(entity.sleepQuality).toBe(3);
      expect(entity.morningMood).toBe(3);
      expect(entity.notes).toBe('Test notes');
    });

    it('should handle null notes', async () => {
      const row = createMockDiaryRow({ notes: null });
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-01');

      expect(result[0].notes).toBeUndefined();
    });

    it('should parse dates correctly', async () => {
      const row = createMockDiaryRow({
        created_at: '2026-02-01T08:00:00.000Z',
        updated_at: '2026-02-01T09:00:00.000Z',
      });
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndDateRange('123', '2026-02-01', '2026-02-01');
      const entity = result[0];

      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.deletedAt).toBeNull();
    });
  });

  describe('entityToParams conversion', () => {
    it('should correctly map entity fields to database columns', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '456',
        date: '2026-02-15',
        bedtime: '22:00',
        lightsOffTime: '22:15',
        sleepOnsetLatency: 10,
        wakeTime: '06:00',
        outOfBedTime: '06:15',
        nightAwakenings: 0,
        wakeAfterSleepOnset: 5,
        totalSleepTime: 465,
        timeInBed: 480,
        sleepEfficiency: 96.87,
        sleepQuality: 5,
        morningMood: 5,
        notes: 'Excellent sleep!',
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow({
        user_id: '456',
        date: '2026-02-15',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      const executeCall = (db.execute as jest.Mock).mock.calls[0];
      const sql = executeCall[0];
      const params = executeCall[1];

      expect(sql).toContain('user_id');
      expect(sql).toContain('sleep_onset_latency');
      expect(sql).toContain('wake_after_sleep_onset');
      expect(params).toContain('456');
    });
  });

  describe('getInsertColumns()', () => {
    it('should include all required columns', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:00',
        lightsOffTime: '23:15',
        sleepOnsetLatency: 20,
        wakeTime: '07:00',
        outOfBedTime: '07:15',
        nightAwakenings: 2,
        wakeAfterSleepOnset: 30,
        totalSleepTime: 420,
        timeInBed: 480,
        sleepEfficiency: 87.5,
        sleepQuality: 3,
        morningMood: 3,
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      const sql = (db.execute as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('user_id');
      expect(sql).toContain('date');
      expect(sql).toContain('bedtime');
      expect(sql).toContain('lights_off_time');
      expect(sql).toContain('sleep_onset_latency');
      expect(sql).toContain('wake_time');
      expect(sql).toContain('out_of_bed_time');
      expect(sql).toContain('night_awakenings');
      expect(sql).toContain('wake_after_sleep_onset');
      expect(sql).toContain('total_sleep_time');
      expect(sql).toContain('time_in_bed');
      expect(sql).toContain('sleep_efficiency');
      expect(sql).toContain('sleep_quality');
      expect(sql).toContain('morning_mood');
      expect(sql).toContain('notes');
    });
  });

  describe('PHI encryption compliance (REQ-PHI-001)', () => {
    it('should encrypt notes on write', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:00',
        lightsOffTime: '23:15',
        sleepOnsetLatency: 20,
        wakeTime: '07:00',
        outOfBedTime: '07:15',
        nightAwakenings: 2,
        wakeAfterSleepOnset: 30,
        totalSleepTime: 420,
        timeInBed: 480,
        sleepEfficiency: 87.5,
        sleepQuality: 3,
        morningMood: 3,
        notes: 'Patient mentioned anxiety about work',
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().encryptField).toHaveBeenCalledWith(
        'Patient mentioned anxiety about work'
      );
    });

    it('should decrypt notes on read', async () => {
      const row = createMockDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(row);

      const result = await repository.getLatestEntry('123');

      const { getPHIEncryptionManager } = require('../../security/PHIEncryptionManager');
      expect(getPHIEncryptionManager().decryptField).toHaveBeenCalled();
      expect(result?.notes).toBe('Test notes');
    });

    it('should handle null notes without encryption', async () => {
      const entry: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '123',
        date: '2026-02-01',
        bedtime: '23:00',
        lightsOffTime: '23:15',
        sleepOnsetLatency: 20,
        wakeTime: '07:00',
        outOfBedTime: '07:15',
        nightAwakenings: 2,
        wakeAfterSleepOnset: 30,
        totalSleepTime: 420,
        timeInBed: 480,
        sleepEfficiency: 87.5,
        sleepQuality: 3,
        morningMood: 3,
        notes: undefined,
        deletedAt: null,
      };

      const insertedRow = createMockDiaryRow({ notes: null });
      (db.queryOne as jest.Mock).mockResolvedValue(insertedRow);

      await repository.upsert(entry);

      // Should not throw
      expect(db.execute).toHaveBeenCalled();
    });
  });
});
