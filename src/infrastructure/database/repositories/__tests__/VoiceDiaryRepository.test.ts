/**
 * VoiceDiaryRepository Unit Tests
 * ================================
 * Tests for voice diary recordings persistence.
 *
 * Covers:
 * - CRUD operations (inherited from BaseRepository)
 * - Custom queries: findByUserId, findByDateRange
 * - Statistics aggregation: getStatistics
 * - HIPAA compliant audit timestamps
 * - Emotion analysis storage
 * - Soft delete support
 *
 * Traceability:
 * - REQ-VOICE-001 (Voice diary persistence)
 * - REQ-HIPAA-001 (Audit timestamps)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { VoiceDiaryRepository } from '../VoiceDiaryRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';
import type { IVoiceDiaryEntryEntity } from '../../interfaces/IRepository';

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
 * Create mock voice diary row (database format)
 */
function createMockVoiceDiaryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    user_id: 123,
    transcription_text: 'Test voice diary entry transcription',
    transcription_confidence: 0.95,
    transcription_language: 'ru',
    voice_duration: 45,
    emotion: 'calm',
    emotion_intensity: 0.7,
    telegram_file_id: 'AgACAgIAAxkBAAI',
    file_size: 12345,
    recorded_at: '2026-02-01T22:30:00.000Z',
    transcribed_at: '2026-02-01T22:30:05.000Z',
    created_at: '2026-02-01T22:30:05.000Z',
    updated_at: '2026-02-01T22:30:05.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('VoiceDiaryRepository', () => {
  let db: IDatabaseConnection;
  let repository: VoiceDiaryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new VoiceDiaryRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });

    it('should set correct table name', () => {
      // Access protected property via any
      expect((repository as any).tableName).toBe('voice_diary_entries');
    });
  });

  // ============================================
  // BaseRepository CRUD operations (inherited)
  // ============================================

  describe('findById()', () => {
    it('should find voice entry by ID', async () => {
      const mockRow = createMockVoiceDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(1);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        [1]
      );
    });

    it('should return null for non-existent entry', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const entry = await repository.findById(999);

      expect(entry).toBeNull();
    });

    it('should exclude soft-deleted entries', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.findById(1);

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });
  });

  describe('findAll()', () => {
    it('should return all voice entries', async () => {
      const mockRows = [
        createMockVoiceDiaryRow({ id: 1 }),
        createMockVoiceDiaryRow({ id: 2 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const entries = await repository.findAll();

      expect(entries).toHaveLength(2);
    });

    it('should support pagination with limit', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findAll({ limit: 10 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10')
      );
    });

    it('should support pagination with offset', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findAll({ limit: 10, offset: 20 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 20')
      );
    });

    it('should exclude deleted entries by default', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL')
      );
    });
  });

  describe('insert()', () => {
    it('should insert new voice entry', async () => {
      const mockRow = createMockVoiceDiaryRow();
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const newEntry = {
        userId: 123,
        transcriptionText: 'New transcription',
        transcriptionConfidence: 0.92,
        transcriptionLanguage: 'ru',
        voiceDuration: 30,
        recordedAt: new Date('2026-02-01T23:00:00.000Z'),
        transcribedAt: new Date('2026-02-01T23:00:05.000Z'),
      } as Omit<IVoiceDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'>;

      const result = await repository.insert(newEntry);

      expect(result).not.toBeNull();
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO voice_diary_entries'),
        expect.any(Array)
      );
    });

    it('should include all required columns in insert', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockVoiceDiaryRow());

      await repository.insert({
        userId: 123,
        transcriptionText: 'Test',
        transcriptionConfidence: 0.9,
        transcriptionLanguage: 'ru',
        voiceDuration: 20,
        recordedAt: new Date(),
        transcribedAt: new Date(),
      } as Omit<IVoiceDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'>);

      const sql = (db.execute as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('user_id');
      expect(sql).toContain('transcription_text');
      expect(sql).toContain('transcription_confidence');
      expect(sql).toContain('transcription_language');
      expect(sql).toContain('voice_duration');
      expect(sql).toContain('recorded_at');
      expect(sql).toContain('transcribed_at');
    });
  });

  describe('update()', () => {
    it('should update voice entry', async () => {
      const mockRow = createMockVoiceDiaryRow({ transcription_text: 'Updated text' });
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.update(1, { transcriptionText: 'Updated text' });

      expect(result).not.toBeNull();
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE voice_diary_entries SET'),
        expect.any(Array)
      );
    });

    it('should not update soft-deleted entries', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0, lastInsertRowid: 0 });
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await repository.update(1, { transcriptionText: 'Test' });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });
  });

  describe('delete() - Soft Delete', () => {
    it('should soft delete voice entry', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("deleted_at = datetime('now')"),
        [1]
      );
    });

    it('should return false when entry not found', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });

    it('should also update updated_at timestamp', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      await repository.delete(1);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("updated_at = datetime('now')"),
        expect.anything()
      );
    });
  });

  describe('hardDelete()', () => {
    it('should permanently delete voice entry', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.hardDelete(1);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM voice_diary_entries WHERE id = ?'),
        [1]
      );
    });
  });

  describe('restore()', () => {
    it('should restore soft-deleted entry', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.restore(1);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NULL'),
        [1]
      );
    });
  });

  describe('exists()', () => {
    it('should return true when entry exists', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ count: 1 });

      const exists = await repository.exists(1);

      expect(exists).toBe(true);
    });

    it('should return false when entry does not exist', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ count: 0 });

      const exists = await repository.exists(999);

      expect(exists).toBe(false);
    });
  });

  describe('count()', () => {
    it('should count all entries', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ count: 42 });

      const count = await repository.count();

      expect(count).toBe(42);
    });

    it('should count entries matching criteria', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ count: 5 });

      const count = await repository.count({ userId: 123 } as Partial<IVoiceDiaryEntryEntity>);

      expect(count).toBe(5);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [123]
      );
    });

    it('should handle null result', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  // ============================================
  // Custom VoiceDiaryRepository methods
  // ============================================

  describe('findByUserId()', () => {
    it('should find voice entries by user ID', async () => {
      const mockRows = [
        createMockVoiceDiaryRow({ id: 1 }),
        createMockVoiceDiaryRow({ id: 2 }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const entries = await repository.findByUserId(123);

      expect(entries).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [123, 100]
      );
    });

    it('should use default limit of 100', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserId(123);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [123, 100]
      );
    });

    it('should respect custom limit', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserId(123, 50);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [123, 50]
      );
    });

    it('should order by recorded_at DESC', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserId(123);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY recorded_at DESC'),
        expect.anything()
      );
    });

    it('should exclude deleted entries', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserId(123);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should return empty array when no entries found', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const entries = await repository.findByUserId(999);

      expect(entries).toHaveLength(0);
    });
  });

  describe('findByDateRange()', () => {
    const startDate = new Date('2026-02-01T00:00:00.000Z');
    const endDate = new Date('2026-02-07T23:59:59.999Z');

    it('should find entries within date range', async () => {
      const mockRows = [
        createMockVoiceDiaryRow({ id: 1, recorded_at: '2026-02-02T10:00:00.000Z' }),
        createMockVoiceDiaryRow({ id: 2, recorded_at: '2026-02-05T15:30:00.000Z' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const entries = await repository.findByDateRange(123, startDate, endDate);

      expect(entries).toHaveLength(2);
    });

    it('should pass correct date parameters', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange(123, startDate, endDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('recorded_at >= ?'),
        [123, startDate.toISOString(), endDate.toISOString()]
      );
    });

    it('should filter by user ID', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange(456, startDate, endDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [456, expect.any(String), expect.any(String)]
      );
    });

    it('should order by recorded_at ASC', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange(123, startDate, endDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY recorded_at ASC'),
        expect.anything()
      );
    });

    it('should exclude deleted entries', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange(123, startDate, endDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should return empty array for date range with no entries', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const entries = await repository.findByDateRange(
        123,
        new Date('2020-01-01'),
        new Date('2020-01-02')
      );

      expect(entries).toHaveLength(0);
    });

    it('should handle single-day range', async () => {
      const sameDay = new Date('2026-02-01T00:00:00.000Z');
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange(123, sameDay, sameDay);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('recorded_at <= ?'),
        expect.anything()
      );
    });
  });

  describe('getStatistics()', () => {
    it('should return statistics for user', async () => {
      // First query: aggregate stats
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 10,
        total_seconds: 600,
        avg_duration: 60,
      });
      // Second query: emotion breakdown
      (db.query as jest.Mock).mockResolvedValue([
        { emotion: 'calm', count: 5 },
        { emotion: 'anxious', count: 3 },
        { emotion: 'happy', count: 2 },
      ]);

      const stats = await repository.getStatistics(123);

      expect(stats).toEqual({
        totalEntries: 10,
        totalMinutes: 10,
        avgDuration: 60,
        emotionBreakdown: {
          calm: 5,
          anxious: 3,
          happy: 2,
        },
      });
    });

    it('should calculate totalMinutes from seconds', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 5,
        total_seconds: 180, // 3 minutes
        avg_duration: 36,
      });
      (db.query as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics(123);

      expect(stats.totalMinutes).toBe(3);
    });

    it('should round avgDuration', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 5,
        total_seconds: 180,
        avg_duration: 36.7,
      });
      (db.query as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics(123);

      expect(stats.avgDuration).toBe(37);
    });

    it('should handle zero entries', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 0,
        total_seconds: 0,
        avg_duration: 0,
      });
      (db.query as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics(123);

      expect(stats).toEqual({
        totalEntries: 0,
        totalMinutes: 0,
        avgDuration: 0,
        emotionBreakdown: {},
      });
    });

    it('should handle null aggregate values', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics(123);

      expect(stats).toEqual({
        totalEntries: 0,
        totalMinutes: 0,
        avgDuration: 0,
        emotionBreakdown: {},
      });
    });

    it('should ignore null emotions in breakdown', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 3,
        total_seconds: 90,
        avg_duration: 30,
      });
      (db.query as jest.Mock).mockResolvedValue([
        { emotion: 'calm', count: 2 },
        { emotion: null, count: 1 }, // Should be ignored
      ]);

      const stats = await repository.getStatistics(123);

      expect(stats.emotionBreakdown).toEqual({ calm: 2 });
      expect(stats.emotionBreakdown).not.toHaveProperty('null');
    });

    it('should exclude deleted entries from statistics', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 5,
        total_seconds: 300,
        avg_duration: 60,
      });
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getStatistics(123);

      // Both queries should filter out deleted entries
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        [123]
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        [123]
      );
    });

    it('should query correct user ID', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({
        total_entries: 0,
        total_seconds: 0,
        avg_duration: 0,
      });
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getStatistics(456);

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.anything(),
        [456]
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.anything(),
        [456]
      );
    });
  });

  // ============================================
  // Row to Entity conversion
  // ============================================

  describe('rowToEntity conversion', () => {
    it('should convert database row to entity', async () => {
      const mockRow = createMockVoiceDiaryRow();
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry).toMatchObject({
        id: 1,
        userId: 123,
        transcriptionText: 'Test voice diary entry transcription',
        transcriptionConfidence: 0.95,
        transcriptionLanguage: 'ru',
        voiceDuration: 45,
        emotion: 'calm',
        emotionIntensity: 0.7,
        telegramFileId: 'AgACAgIAAxkBAAI',
        fileSize: 12345,
      });
    });

    it('should parse recordedAt as Date', async () => {
      const mockRow = createMockVoiceDiaryRow({
        recorded_at: '2026-02-01T22:30:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.recordedAt).toBeInstanceOf(Date);
      expect(entry!.recordedAt.toISOString()).toBe('2026-02-01T22:30:00.000Z');
    });

    it('should parse transcribedAt as Date', async () => {
      const mockRow = createMockVoiceDiaryRow({
        transcribed_at: '2026-02-01T22:30:05.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcribedAt).toBeInstanceOf(Date);
      expect(entry!.transcribedAt.toISOString()).toBe('2026-02-01T22:30:05.000Z');
    });

    it('should parse createdAt and updatedAt as Date', async () => {
      const mockRow = createMockVoiceDiaryRow({
        created_at: '2026-02-01T22:30:05.000Z',
        updated_at: '2026-02-02T10:00:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.createdAt).toBeInstanceOf(Date);
      expect(entry!.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle null optional fields', async () => {
      const mockRow = createMockVoiceDiaryRow({
        emotion: null,
        emotion_intensity: null,
        telegram_file_id: null,
        file_size: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.emotion).toBeUndefined();
      expect(entry!.emotionIntensity).toBeUndefined();
      expect(entry!.telegramFileId).toBeUndefined();
      expect(entry!.fileSize).toBeUndefined();
    });

    it('should handle empty string emotion as undefined', async () => {
      const mockRow = createMockVoiceDiaryRow({
        emotion: '',
        telegram_file_id: '',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.emotion).toBeUndefined();
      expect(entry!.telegramFileId).toBeUndefined();
    });

    it('should default transcriptionLanguage to "ru"', async () => {
      const mockRow = createMockVoiceDiaryRow({
        transcription_language: null,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcriptionLanguage).toBe('ru');
    });

    it('should handle deleted_at correctly', async () => {
      const mockRow = createMockVoiceDiaryRow({
        deleted_at: '2026-02-05T12:00:00.000Z',
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.deletedAt).toBeInstanceOf(Date);
    });

    it('should set deletedAt to null when not deleted', async () => {
      const mockRow = createMockVoiceDiaryRow({ deleted_at: null });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.deletedAt).toBeNull();
    });

    it('should handle zero values correctly', async () => {
      const mockRow = createMockVoiceDiaryRow({
        transcription_confidence: 0,
        voice_duration: 0,
        emotion_intensity: 0,
        file_size: 0,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcriptionConfidence).toBe(0);
      expect(entry!.voiceDuration).toBe(0);
      // Zero emotion_intensity should still be 0 (not undefined)
      expect(entry!.emotionIntensity).toBe(0);
      expect(entry!.fileSize).toBe(0);
    });
  });

  // ============================================
  // Entity to Params conversion
  // ============================================

  describe('entityToParams conversion', () => {
    it('should convert entity fields to database params', () => {
      const params = (repository as any).entityToParams({
        id: 1,
        userId: 123,
        transcriptionText: 'Test transcription',
        transcriptionConfidence: 0.9,
        transcriptionLanguage: 'ru',
        voiceDuration: 30,
      });

      expect(params.id).toBe(1);
      expect(params.user_id).toBe(123);
      expect(params.transcription_text).toBe('Test transcription');
      expect(params.transcription_confidence).toBe(0.9);
      expect(params.transcription_language).toBe('ru');
      expect(params.voice_duration).toBe(30);
    });

    it('should convert optional fields', () => {
      const params = (repository as any).entityToParams({
        emotion: 'happy',
        emotionIntensity: 0.8,
        telegramFileId: 'ABC123',
        fileSize: 5000,
      });

      expect(params.emotion).toBe('happy');
      expect(params.emotion_intensity).toBe(0.8);
      expect(params.telegram_file_id).toBe('ABC123');
      expect(params.file_size).toBe(5000);
    });

    it('should handle Date objects for recordedAt', () => {
      const date = new Date('2026-02-01T22:30:00.000Z');
      const params = (repository as any).entityToParams({
        recordedAt: date,
      });

      expect(params.recorded_at).toBe(date.toISOString());
    });

    it('should handle Date objects for transcribedAt', () => {
      const date = new Date('2026-02-01T22:30:05.000Z');
      const params = (repository as any).entityToParams({
        transcribedAt: date,
      });

      expect(params.transcribed_at).toBe(date.toISOString());
    });

    it('should handle string dates for recordedAt', () => {
      const params = (repository as any).entityToParams({
        recordedAt: '2026-02-01T22:30:00.000Z',
      });

      expect(params.recorded_at).toBe('2026-02-01T22:30:00.000Z');
    });

    it('should not include undefined fields', () => {
      const params = (repository as any).entityToParams({
        userId: 123,
      });

      expect(params).not.toHaveProperty('transcription_text');
      expect(params).not.toHaveProperty('emotion');
    });
  });

  // ============================================
  // Edge cases and error handling
  // ============================================

  describe('edge cases', () => {
    it('should handle very long transcription text', async () => {
      const longText = 'a'.repeat(10000);
      const mockRow = createMockVoiceDiaryRow({
        transcription_text: longText,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcriptionText).toHaveLength(10000);
    });

    it('should handle unicode transcription text', async () => {
      const unicodeText = 'Тест записи дневника сна. Emoji: 😴💤';
      const mockRow = createMockVoiceDiaryRow({
        transcription_text: unicodeText,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcriptionText).toBe(unicodeText);
    });

    it('should handle extreme confidence values', async () => {
      const mockRow = createMockVoiceDiaryRow({
        transcription_confidence: 1.0,
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcriptionConfidence).toBe(1.0);
    });

    it('should handle very long voice duration', async () => {
      const mockRow = createMockVoiceDiaryRow({
        voice_duration: 3600, // 1 hour in seconds
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.voiceDuration).toBe(3600);
    });

    it('should handle large file sizes', async () => {
      const mockRow = createMockVoiceDiaryRow({
        file_size: 50_000_000, // 50 MB
      });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.fileSize).toBe(50_000_000);
    });

    it('should handle concurrent calls correctly', async () => {
      const mockRow1 = createMockVoiceDiaryRow({ id: 1, user_id: 100 });
      const mockRow2 = createMockVoiceDiaryRow({ id: 2, user_id: 200 });

      (db.query as jest.Mock)
        .mockResolvedValueOnce([mockRow1])
        .mockResolvedValueOnce([mockRow2]);

      const [entries1, entries2] = await Promise.all([
        repository.findByUserId(100),
        repository.findByUserId(200),
      ]);

      expect(entries1[0].userId).toBe(100);
      expect(entries2[0].userId).toBe(200);
    });
  });

  // ============================================
  // HIPAA compliance
  // ============================================

  describe('HIPAA compliance - audit timestamps', () => {
    it('should preserve createdAt timestamp', async () => {
      const createdAt = '2026-01-15T10:00:00.000Z';
      const mockRow = createMockVoiceDiaryRow({ created_at: createdAt });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.createdAt!.toISOString()).toBe(createdAt);
    });

    it('should preserve updatedAt timestamp', async () => {
      const updatedAt = '2026-02-01T15:30:00.000Z';
      const mockRow = createMockVoiceDiaryRow({ updated_at: updatedAt });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.updatedAt!.toISOString()).toBe(updatedAt);
    });

    it('should preserve recordedAt for ePRO compliance', async () => {
      const recordedAt = '2026-02-01T22:30:00.000Z';
      const mockRow = createMockVoiceDiaryRow({ recorded_at: recordedAt });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.recordedAt.toISOString()).toBe(recordedAt);
    });

    it('should preserve transcribedAt for processing audit', async () => {
      const transcribedAt = '2026-02-01T22:30:05.000Z';
      const mockRow = createMockVoiceDiaryRow({ transcribed_at: transcribedAt });
      (db.queryOne as jest.Mock).mockResolvedValue(mockRow);

      const entry = await repository.findById(1);

      expect(entry!.transcribedAt.toISOString()).toBe(transcribedAt);
    });
  });
});
