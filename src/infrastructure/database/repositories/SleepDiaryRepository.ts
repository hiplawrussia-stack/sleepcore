/**
 * SleepDiaryRepository - Sleep Diary Data Access
 * ================================================
 *
 * Repository for sleep diary entries with analytics queries.
 * Implements ISleepDiaryRepository with SQLite backend.
 *
 * Features:
 * - Daily sleep diary CRUD
 * - Weekly/monthly summaries
 * - Sleep efficiency trend analysis
 * - ISI correlation support
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type {
  ISleepDiaryRepository,
  ISleepDiaryEntryEntity,
} from '../interfaces/IRepository';
import { BaseRepository, type IBaseRow } from './BaseRepository';
import { getPHIEncryptionManager } from '../security/PHIEncryptionManager';

/**
 * Database row for sleep diary entry
 */
interface ISleepDiaryRow extends IBaseRow {
  user_id: string;
  date: string;
  bedtime: string;
  lights_off_time: string;
  sleep_onset_latency: number;
  wake_time: string;
  out_of_bed_time: string;
  night_awakenings: number;
  wake_after_sleep_onset: number;
  total_sleep_time: number;
  time_in_bed: number;
  sleep_efficiency: number;
  sleep_quality: number;
  morning_mood: number;
  notes?: string;
}

/**
 * SQLite Sleep Diary Repository implementation
 */
export class SleepDiaryRepository
  extends BaseRepository<ISleepDiaryEntryEntity>
  implements ISleepDiaryRepository
{
  protected readonly tableName = 'sleep_diary_entries';

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  protected rowToEntity(row: ISleepDiaryRow): ISleepDiaryEntryEntity {
    const phiManager = getPHIEncryptionManager();

    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      bedtime: row.bedtime,
      lightsOffTime: row.lights_off_time,
      sleepOnsetLatency: row.sleep_onset_latency,
      wakeTime: row.wake_time,
      outOfBedTime: row.out_of_bed_time,
      nightAwakenings: row.night_awakenings,
      wakeAfterSleepOnset: row.wake_after_sleep_onset,
      totalSleepTime: row.total_sleep_time,
      timeInBed: row.time_in_bed,
      sleepEfficiency: row.sleep_efficiency,
      sleepQuality: row.sleep_quality,
      morningMood: row.morning_mood,
      // PHI field - decrypt on read
      notes: phiManager.decryptField(row.notes) ?? undefined,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  protected entityToParams(
    entity: Partial<ISleepDiaryEntryEntity>
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const phiManager = getPHIEncryptionManager();

    if (entity.id !== undefined) params.id = entity.id;
    if (entity.userId !== undefined) params.user_id = entity.userId;
    if (entity.date !== undefined) params.date = entity.date;
    if (entity.bedtime !== undefined) params.bedtime = entity.bedtime;
    if (entity.lightsOffTime !== undefined) params.lights_off_time = entity.lightsOffTime;
    if (entity.sleepOnsetLatency !== undefined) params.sleep_onset_latency = entity.sleepOnsetLatency;
    if (entity.wakeTime !== undefined) params.wake_time = entity.wakeTime;
    if (entity.outOfBedTime !== undefined) params.out_of_bed_time = entity.outOfBedTime;
    if (entity.nightAwakenings !== undefined) params.night_awakenings = entity.nightAwakenings;
    if (entity.wakeAfterSleepOnset !== undefined) params.wake_after_sleep_onset = entity.wakeAfterSleepOnset;
    if (entity.totalSleepTime !== undefined) params.total_sleep_time = entity.totalSleepTime;
    if (entity.timeInBed !== undefined) params.time_in_bed = entity.timeInBed;
    if (entity.sleepEfficiency !== undefined) params.sleep_efficiency = entity.sleepEfficiency;
    if (entity.sleepQuality !== undefined) params.sleep_quality = entity.sleepQuality;
    if (entity.morningMood !== undefined) params.morning_mood = entity.morningMood;
    // PHI field - encrypt on write
    if (entity.notes !== undefined) params.notes = phiManager.encryptField(entity.notes);

    return params;
  }

  protected getInsertColumns(): string[] {
    return [
      'user_id',
      'date',
      'bedtime',
      'lights_off_time',
      'sleep_onset_latency',
      'wake_time',
      'out_of_bed_time',
      'night_awakenings',
      'wake_after_sleep_onset',
      'total_sleep_time',
      'time_in_bed',
      'sleep_efficiency',
      'sleep_quality',
      'morning_mood',
      'notes',
    ];
  }

  /**
   * Find entries by user and date range
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ISleepDiaryEntryEntity[]> {
    const rows = await this.db.query<ISleepDiaryRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL
       ORDER BY date ASC`,
      [userId, startDate, endDate]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get weekly summary statistics
   */
  async getWeeklySummary(
    userId: string,
    weekStartDate: string
  ): Promise<{
    avgSleepEfficiency: number;
    avgTotalSleepTime: number;
    avgSleepOnsetLatency: number;
    avgWakeAfterSleepOnset: number;
    avgSleepQuality: number;
    entryCount: number;
  }> {
    // Calculate week end (7 days from start)
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndDate = endDate.toISOString().split('T')[0];

    const result = await this.db.queryOne<{
      avg_efficiency: number;
      avg_tst: number;
      avg_sol: number;
      avg_waso: number;
      avg_quality: number;
      entry_count: number;
    }>(
      `SELECT
         AVG(sleep_efficiency) as avg_efficiency,
         AVG(total_sleep_time) as avg_tst,
         AVG(sleep_onset_latency) as avg_sol,
         AVG(wake_after_sleep_onset) as avg_waso,
         AVG(sleep_quality) as avg_quality,
         COUNT(*) as entry_count
       FROM ${this.tableName}
       WHERE user_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [userId, weekStartDate, weekEndDate]
    );

    return {
      avgSleepEfficiency: result?.avg_efficiency || 0,
      avgTotalSleepTime: result?.avg_tst || 0,
      avgSleepOnsetLatency: result?.avg_sol || 0,
      avgWakeAfterSleepOnset: result?.avg_waso || 0,
      avgSleepQuality: result?.avg_quality || 0,
      entryCount: result?.entry_count || 0,
    };
  }

  /**
   * Get sleep efficiency trend
   */
  async getSleepEfficiencyTrend(
    userId: string,
    days: number
  ): Promise<Array<{ date: string; sleepEfficiency: number }>> {
    const rows = await this.db.query<{ date: string; sleep_efficiency: number }>(
      `SELECT date, sleep_efficiency
       FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY date DESC
       LIMIT ?`,
      [userId, days]
    );

    return rows
      .map((row) => ({
        date: row.date,
        sleepEfficiency: row.sleep_efficiency,
      }))
      .reverse(); // Return in chronological order
  }

  /**
   * Get latest entry for user
   */
  async getLatestEntry(userId: string): Promise<ISleepDiaryEntryEntity | null> {
    const row = await this.db.queryOne<ISleepDiaryRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY date DESC
       LIMIT 1`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Count entries in date range
   */
  async countEntriesInRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}
       WHERE user_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [userId, startDate, endDate]
    );
    return result?.count || 0;
  }

  /**
   * Upsert entry (insert or update by user+date)
   */
  async upsert(entity: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISleepDiaryEntryEntity> {
    const params = this.entityToParams(entity);
    const columns = this.getInsertColumns();
    const values = columns.map((col) => params[col]);
    const placeholders = columns.map(() => '?').join(', ');

    // SQLite UPSERT syntax
    const updateClause = columns
      .filter((col) => col !== 'user_id' && col !== 'date')
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(user_id, date) DO UPDATE SET
        ${updateClause},
        updated_at = datetime('now')
    `;

    await this.db.execute(sql, values);

    // Return the upserted entry
    const entry = await this.findOneBy({
      userId: entity.userId,
      date: entity.date,
    } as Partial<ISleepDiaryEntryEntity>);

    return entry!;
  }

  /**
   * Calculate baseline metrics (first 7 days)
   */
  async getBaselineMetrics(
    userId: string
  ): Promise<{
    avgSleepEfficiency: number;
    avgTotalSleepTime: number;
    avgSleepOnsetLatency: number;
    avgWakeAfterSleepOnset: number;
    entryCount: number;
  } | null> {
    const result = await this.db.queryOne<{
      avg_efficiency: number;
      avg_tst: number;
      avg_sol: number;
      avg_waso: number;
      entry_count: number;
    }>(
      `SELECT
         AVG(sleep_efficiency) as avg_efficiency,
         AVG(total_sleep_time) as avg_tst,
         AVG(sleep_onset_latency) as avg_sol,
         AVG(wake_after_sleep_onset) as avg_waso,
         COUNT(*) as entry_count
       FROM (
         SELECT * FROM ${this.tableName}
         WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY date ASC
         LIMIT 7
       )`,
      [userId]
    );

    if (!result || result.entry_count < 7) {
      return null; // Not enough baseline data
    }

    return {
      avgSleepEfficiency: result.avg_efficiency,
      avgTotalSleepTime: result.avg_tst,
      avgSleepOnsetLatency: result.avg_sol,
      avgWakeAfterSleepOnset: result.avg_waso,
      entryCount: result.entry_count,
    };
  }
}
