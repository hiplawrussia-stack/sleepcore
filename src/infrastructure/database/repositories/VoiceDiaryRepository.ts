/**
 * VoiceDiaryRepository - Voice Diary Data Access
 * ===============================================
 *
 * Repository for voice diary entries with transcription storage.
 * Implements IVoiceDiaryRepository with SQLite backend.
 *
 * Features:
 * - HIPAA compliant audit timestamps
 * - Emotion analysis storage
 * - Statistics aggregation
 * - Soft delete support
 *
 * Research basis (2025-2026):
 * - HIPAA: Immutable audit trails, 6+ year retention
 * - ePRO: Item-level timestamps for compliance
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type { IVoiceDiaryRepository, IVoiceDiaryEntryEntity } from '../interfaces/IRepository';
import { BaseRepository, type IBaseRow } from './BaseRepository';

/**
 * Database row for voice diary entry
 */
interface IVoiceDiaryRow extends IBaseRow {
  user_id: number;
  transcription_text: string;
  transcription_confidence: number;
  transcription_language: string;
  voice_duration: number;
  emotion?: string;
  emotion_intensity?: number;
  telegram_file_id?: string;
  file_size?: number;
  recorded_at: string;
  transcribed_at: string;
}

/**
 * SQLite Voice Diary Repository implementation
 */
export class VoiceDiaryRepository
  extends BaseRepository<IVoiceDiaryEntryEntity>
  implements IVoiceDiaryRepository
{
  protected readonly tableName = 'voice_diary_entries';

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  protected rowToEntity(row: IVoiceDiaryRow): IVoiceDiaryEntryEntity {
    return {
      id: row.id,
      userId: row.user_id,
      transcriptionText: row.transcription_text,
      transcriptionConfidence: row.transcription_confidence,
      transcriptionLanguage: row.transcription_language || 'ru',
      voiceDuration: row.voice_duration,
      emotion: row.emotion || undefined,
      emotionIntensity: row.emotion_intensity ?? undefined,
      telegramFileId: row.telegram_file_id || undefined,
      fileSize: row.file_size ?? undefined,
      recordedAt: this.parseDate(row.recorded_at) ?? new Date(),
      transcribedAt: this.parseDate(row.transcribed_at) ?? new Date(),
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  protected entityToParams(entity: Partial<IVoiceDiaryEntryEntity>): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (entity.id !== undefined) params.id = entity.id;
    if (entity.userId !== undefined) params.user_id = entity.userId;
    if (entity.transcriptionText !== undefined) params.transcription_text = entity.transcriptionText;
    if (entity.transcriptionConfidence !== undefined) params.transcription_confidence = entity.transcriptionConfidence;
    if (entity.transcriptionLanguage !== undefined) params.transcription_language = entity.transcriptionLanguage;
    if (entity.voiceDuration !== undefined) params.voice_duration = entity.voiceDuration;
    if (entity.emotion !== undefined) params.emotion = entity.emotion;
    if (entity.emotionIntensity !== undefined) params.emotion_intensity = entity.emotionIntensity;
    if (entity.telegramFileId !== undefined) params.telegram_file_id = entity.telegramFileId;
    if (entity.fileSize !== undefined) params.file_size = entity.fileSize;
    if (entity.recordedAt !== undefined) {
      params.recorded_at = entity.recordedAt instanceof Date
        ? entity.recordedAt.toISOString()
        : entity.recordedAt;
    }
    if (entity.transcribedAt !== undefined) {
      params.transcribed_at = entity.transcribedAt instanceof Date
        ? entity.transcribedAt.toISOString()
        : entity.transcribedAt;
    }

    return params;
  }

  protected getInsertColumns(): string[] {
    return [
      'user_id',
      'transcription_text',
      'transcription_confidence',
      'transcription_language',
      'voice_duration',
      'emotion',
      'emotion_intensity',
      'telegram_file_id',
      'file_size',
      'recorded_at',
      'transcribed_at',
    ];
  }

  /**
   * Find voice entries by user ID
   */
  async findByUserId(userId: number, limit = 100): Promise<IVoiceDiaryEntryEntity[]> {
    const rows = await this.db.query<IVoiceDiaryRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY recorded_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find voice entries by date range
   */
  async findByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<IVoiceDiaryEntryEntity[]> {
    const rows = await this.db.query<IVoiceDiaryRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ?
         AND recorded_at >= ?
         AND recorded_at <= ?
         AND deleted_at IS NULL
       ORDER BY recorded_at ASC`,
      [userId, startDate.toISOString(), endDate.toISOString()]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get voice diary statistics for user
   */
  async getStatistics(userId: number): Promise<{
    totalEntries: number;
    totalMinutes: number;
    avgDuration: number;
    emotionBreakdown: Record<string, number>;
  }> {
    // Get aggregate stats
    const stats = await this.db.queryOne<{
      total_entries: number;
      total_seconds: number;
      avg_duration: number;
    }>(
      `SELECT
         COUNT(*) as total_entries,
         COALESCE(SUM(voice_duration), 0) as total_seconds,
         COALESCE(AVG(voice_duration), 0) as avg_duration
       FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    // Get emotion breakdown
    const emotions = await this.db.query<{ emotion: string; count: number }>(
      `SELECT emotion, COUNT(*) as count
       FROM ${this.tableName}
       WHERE user_id = ? AND emotion IS NOT NULL AND deleted_at IS NULL
       GROUP BY emotion`,
      [userId]
    );

    const emotionBreakdown: Record<string, number> = {};
    for (const row of emotions) {
      if (row.emotion) {
        emotionBreakdown[row.emotion] = row.count;
      }
    }

    return {
      totalEntries: stats?.total_entries || 0,
      totalMinutes: Math.round((stats?.total_seconds || 0) / 60),
      avgDuration: Math.round(stats?.avg_duration || 0),
      emotionBreakdown,
    };
  }
}
