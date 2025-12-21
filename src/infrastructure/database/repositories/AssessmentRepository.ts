/**
 * AssessmentRepository - Clinical Assessment Data Access
 * =======================================================
 *
 * Repository for clinical assessments (ISI, MEQ, MCTQ, DBAS, etc.)
 * Implements IAssessmentRepository with SQLite backend.
 *
 * Features:
 * - ISI score tracking and trend analysis
 * - Multi-assessment type support
 * - Baseline vs current comparison
 * - MCID (Minimal Clinically Important Difference) tracking
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type { IAssessmentRepository, IAssessmentEntity } from '../interfaces/IRepository';
import { BaseRepository, type IBaseRow } from './BaseRepository';

/**
 * Database row for assessment entity
 */
interface IAssessmentRow extends IBaseRow {
  user_id: string;
  type: string;
  score: number;
  severity?: string;
  category?: string;
  responses_json: string;
  interpretation?: string;
  assessed_at: string;
}

/**
 * SQLite Assessment Repository implementation
 */
export class AssessmentRepository
  extends BaseRepository<IAssessmentEntity>
  implements IAssessmentRepository
{
  protected readonly tableName = 'assessments';

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  protected rowToEntity(row: IAssessmentRow): IAssessmentEntity {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as IAssessmentEntity['type'],
      score: row.score,
      severity: row.severity,
      category: row.category,
      responsesJson: row.responses_json,
      interpretation: row.interpretation,
      assessedAt: new Date(row.assessed_at),
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  protected entityToParams(entity: Partial<IAssessmentEntity>): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (entity.id !== undefined) params.id = entity.id;
    if (entity.userId !== undefined) params.user_id = entity.userId;
    if (entity.type !== undefined) params.type = entity.type;
    if (entity.score !== undefined) params.score = entity.score;
    if (entity.severity !== undefined) params.severity = entity.severity;
    if (entity.category !== undefined) params.category = entity.category;
    if (entity.responsesJson !== undefined) params.responses_json = entity.responsesJson;
    if (entity.interpretation !== undefined) params.interpretation = entity.interpretation;
    if (entity.assessedAt !== undefined) {
      params.assessed_at = entity.assessedAt instanceof Date
        ? entity.assessedAt.toISOString()
        : entity.assessedAt;
    }

    return params;
  }

  protected getInsertColumns(): string[] {
    return [
      'user_id',
      'type',
      'score',
      'severity',
      'category',
      'responses_json',
      'interpretation',
      'assessed_at',
    ];
  }

  /**
   * Find assessments by user and type
   */
  async findByUserAndType(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<IAssessmentEntity[]> {
    const rows = await this.db.query<IAssessmentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL
       ORDER BY assessed_at DESC`,
      [userId, type]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get latest assessment of type
   */
  async getLatestByType(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<IAssessmentEntity | null> {
    const row = await this.db.queryOne<IAssessmentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL
       ORDER BY assessed_at DESC
       LIMIT 1`,
      [userId, type]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Calculate score change between first and latest assessments
   */
  async getScoreChange(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<{
    baseline: number;
    current: number;
    change: number;
    percentChange: number;
  } | null> {
    // Get baseline (first assessment)
    const baselineRow = await this.db.queryOne<IAssessmentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL
       ORDER BY assessed_at ASC
       LIMIT 1`,
      [userId, type]
    );

    if (!baselineRow) return null;

    // Get latest
    const latestRow = await this.db.queryOne<IAssessmentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL
       ORDER BY assessed_at DESC
       LIMIT 1`,
      [userId, type]
    );

    if (!latestRow || baselineRow.id === latestRow.id) return null;

    const baseline = baselineRow.score;
    const current = latestRow.score;
    const change = current - baseline;
    const percentChange = baseline !== 0 ? (change / baseline) * 100 : 0;

    return {
      baseline,
      current,
      change,
      percentChange: Math.round(percentChange * 10) / 10,
    };
  }

  /**
   * Check if MCID (Minimal Clinically Important Difference) achieved
   * For ISI: typically 6-point reduction
   */
  async isMCIDReached(
    userId: string,
    type: IAssessmentEntity['type'],
    mcidThreshold: number
  ): Promise<boolean> {
    const scoreChange = await this.getScoreChange(userId, type);
    if (!scoreChange) return false;

    // MCID is achieved if score reduction >= threshold (negative change)
    return scoreChange.change <= -mcidThreshold;
  }

  /**
   * Get score trend over time
   */
  async getScoreTrend(
    userId: string,
    type: IAssessmentEntity['type'],
    limit: number = 10
  ): Promise<Array<{ date: string; score: number; severity?: string }>> {
    const rows = await this.db.query<{
      assessed_at: string;
      score: number;
      severity: string;
    }>(
      `SELECT assessed_at, score, severity
       FROM ${this.tableName}
       WHERE user_id = ? AND type = ? AND deleted_at IS NULL
       ORDER BY assessed_at DESC
       LIMIT ?`,
      [userId, type, limit]
    );

    return rows
      .map((row) => ({
        date: row.assessed_at.split('T')[0],
        score: row.score,
        severity: row.severity,
      }))
      .reverse(); // Chronological order
  }

  /**
   * Count assessments by type for user
   */
  async countByType(userId: string): Promise<Record<string, number>> {
    const rows = await this.db.query<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count
       FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL
       GROUP BY type`,
      [userId]
    );

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.type] = row.count;
    }
    return counts;
  }

  /**
   * Get assessments in date range
   */
  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    type?: IAssessmentEntity['type']
  ): Promise<IAssessmentEntity[]> {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = ?
        AND assessed_at >= ?
        AND assessed_at <= ?
        AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId, startDate, endDate];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY assessed_at ASC';

    const rows = await this.db.query<IAssessmentRow>(sql, params);
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get severity distribution (for analytics)
   */
  async getSeverityDistribution(
    type: IAssessmentEntity['type']
  ): Promise<Record<string, number>> {
    const rows = await this.db.query<{ severity: string; count: number }>(
      `SELECT severity, COUNT(DISTINCT user_id) as count
       FROM (
         SELECT user_id, severity,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY assessed_at DESC) as rn
         FROM ${this.tableName}
         WHERE type = ? AND deleted_at IS NULL
       )
       WHERE rn = 1
       GROUP BY severity`,
      [type]
    );

    const distribution: Record<string, number> = {};
    for (const row of rows) {
      distribution[row.severity || 'unknown'] = row.count;
    }
    return distribution;
  }
}
