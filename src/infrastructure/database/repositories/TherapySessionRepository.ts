/**
 * TherapySessionRepository - Therapy Session Data Access
 * =======================================================
 *
 * Repository for CBT-I therapy sessions and treatment tracking.
 * Implements ITherapySessionRepository with SQLite backend.
 *
 * Features:
 * - Session completion tracking
 * - Multi-modality support (CBTI, MBTI, ACTI, TCM, Ayurveda)
 * - Adherence calculation
 * - Homework completion tracking
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type {
  ITherapySessionRepository,
  ITherapySessionEntity,
} from '../interfaces/IRepository';
import { BaseRepository, type IBaseRow } from './BaseRepository';

/**
 * Database row for therapy session entity
 */
interface ITherapySessionRow extends IBaseRow {
  user_id: string;
  session_type: string;
  week: number;
  component: string;
  status: string;
  adherence: number;
  homework_completed: number;
  notes_json?: string;
  scheduled_at: string;
  completed_at?: string;
}

/**
 * SQLite Therapy Session Repository implementation
 */
export class TherapySessionRepository
  extends BaseRepository<ITherapySessionEntity>
  implements ITherapySessionRepository
{
  protected readonly tableName = 'therapy_sessions';

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  protected rowToEntity(row: ITherapySessionRow): ITherapySessionEntity {
    return {
      id: row.id,
      userId: row.user_id,
      sessionType: row.session_type as ITherapySessionEntity['sessionType'],
      week: row.week,
      component: row.component,
      status: row.status as ITherapySessionEntity['status'],
      adherence: row.adherence,
      homeworkCompleted: row.homework_completed === 1,
      notesJson: row.notes_json,
      scheduledAt: new Date(row.scheduled_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  protected entityToParams(
    entity: Partial<ITherapySessionEntity>
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (entity.id !== undefined) params.id = entity.id;
    if (entity.userId !== undefined) params.user_id = entity.userId;
    if (entity.sessionType !== undefined) params.session_type = entity.sessionType;
    if (entity.week !== undefined) params.week = entity.week;
    if (entity.component !== undefined) params.component = entity.component;
    if (entity.status !== undefined) params.status = entity.status;
    if (entity.adherence !== undefined) params.adherence = entity.adherence;
    if (entity.homeworkCompleted !== undefined) {
      params.homework_completed = entity.homeworkCompleted ? 1 : 0;
    }
    if (entity.notesJson !== undefined) params.notes_json = entity.notesJson;
    if (entity.scheduledAt !== undefined) {
      params.scheduled_at = entity.scheduledAt instanceof Date
        ? entity.scheduledAt.toISOString()
        : entity.scheduledAt;
    }
    if (entity.completedAt !== undefined) {
      params.completed_at = entity.completedAt instanceof Date
        ? entity.completedAt.toISOString()
        : entity.completedAt;
    }

    return params;
  }

  protected getInsertColumns(): string[] {
    return [
      'user_id',
      'session_type',
      'week',
      'component',
      'status',
      'adherence',
      'homework_completed',
      'notes_json',
      'scheduled_at',
      'completed_at',
    ];
  }

  /**
   * Find sessions by user and type
   */
  async findByUserAndType(
    userId: string,
    sessionType: ITherapySessionEntity['sessionType']
  ): Promise<ITherapySessionEntity[]> {
    const rows = await this.db.query<ITherapySessionRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND session_type = ? AND deleted_at IS NULL
       ORDER BY week ASC, scheduled_at ASC`,
      [userId, sessionType]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get current week sessions
   */
  async getCurrentWeekSessions(userId: string): Promise<ITherapySessionEntity[]> {
    // Get the current week number for the user (based on max week in sessions)
    const weekResult = await this.db.queryOne<{ max_week: number }>(
      `SELECT MAX(week) as max_week FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    const currentWeek = weekResult?.max_week || 1;

    const rows = await this.db.query<ITherapySessionRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND week = ? AND deleted_at IS NULL
       ORDER BY scheduled_at ASC`,
      [userId, currentWeek]
    );

    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Calculate overall adherence
   */
  async calculateAdherence(
    userId: string,
    sessionType?: ITherapySessionEntity['sessionType']
  ): Promise<number> {
    let sql = `
      SELECT AVG(adherence) as avg_adherence
      FROM ${this.tableName}
      WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (sessionType) {
      sql += ' AND session_type = ?';
      params.push(sessionType);
    }

    const result = await this.db.queryOne<{ avg_adherence: number }>(sql, params);
    return Math.round(result?.avg_adherence || 0);
  }

  /**
   * Get session completion rate
   */
  async getCompletionRate(
    userId: string,
    sessionType?: ITherapySessionEntity['sessionType']
  ): Promise<{
    completed: number;
    total: number;
    rate: number;
  }> {
    let sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM ${this.tableName}
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (sessionType) {
      sql += ' AND session_type = ?';
      params.push(sessionType);
    }

    const result = await this.db.queryOne<{ total: number; completed: number }>(
      sql,
      params
    );

    const total = result?.total || 0;
    const completed = result?.completed || 0;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, rate };
  }

  /**
   * Find sessions by week
   */
  async findByWeek(
    userId: string,
    week: number
  ): Promise<ITherapySessionEntity[]> {
    const rows = await this.db.query<ITherapySessionRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND week = ? AND deleted_at IS NULL
       ORDER BY scheduled_at ASC`,
      [userId, week]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get next scheduled session
   */
  async getNextSession(userId: string): Promise<ITherapySessionEntity | null> {
    const row = await this.db.queryOne<ITherapySessionRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND status = 'scheduled' AND deleted_at IS NULL
       ORDER BY scheduled_at ASC
       LIMIT 1`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Start a session (change status to in_progress)
   */
  async startSession(sessionId: number): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET status = 'in_progress', updated_at = datetime('now')
       WHERE id = ? AND status = 'scheduled' AND deleted_at IS NULL`,
      [sessionId]
    );
    return result.changes > 0;
  }

  /**
   * Complete a session
   */
  async completeSession(
    sessionId: number,
    adherence: number,
    homeworkCompleted: boolean,
    notes?: string
  ): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET status = 'completed',
           completed_at = datetime('now'),
           adherence = ?,
           homework_completed = ?,
           notes_json = COALESCE(?, notes_json),
           updated_at = datetime('now')
       WHERE id = ? AND status = 'in_progress' AND deleted_at IS NULL`,
      [adherence, homeworkCompleted ? 1 : 0, notes, sessionId]
    );
    return result.changes > 0;
  }

  /**
   * Skip a session
   */
  async skipSession(sessionId: number, reason?: string): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET status = 'skipped',
           notes_json = COALESCE(?, notes_json),
           updated_at = datetime('now')
       WHERE id = ? AND status IN ('scheduled', 'in_progress') AND deleted_at IS NULL`,
      [reason ? JSON.stringify({ skipReason: reason }) : null, sessionId]
    );
    return result.changes > 0;
  }

  /**
   * Get homework completion rate
   */
  async getHomeworkCompletionRate(userId: string): Promise<{
    completed: number;
    total: number;
    rate: number;
  }> {
    const result = await this.db.queryOne<{
      total: number;
      completed: number;
    }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN homework_completed = 1 THEN 1 ELSE 0 END) as completed
       FROM ${this.tableName}
       WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL`,
      [userId]
    );

    const total = result?.total || 0;
    const completed = result?.completed || 0;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, rate };
  }

  /**
   * Get weekly progress summary
   */
  async getWeeklyProgress(userId: string): Promise<
    Array<{
      week: number;
      sessionsPlanned: number;
      sessionsCompleted: number;
      avgAdherence: number;
      homeworkCompleted: number;
    }>
  > {
    const rows = await this.db.query<{
      week: number;
      planned: number;
      completed: number;
      avg_adherence: number;
      homework: number;
    }>(
      `SELECT
         week,
         COUNT(*) as planned,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         AVG(CASE WHEN status = 'completed' THEN adherence ELSE NULL END) as avg_adherence,
         SUM(CASE WHEN homework_completed = 1 THEN 1 ELSE 0 END) as homework
       FROM ${this.tableName}
       WHERE user_id = ? AND deleted_at IS NULL
       GROUP BY week
       ORDER BY week ASC`,
      [userId]
    );

    return rows.map((row) => ({
      week: row.week,
      sessionsPlanned: row.planned,
      sessionsCompleted: row.completed,
      avgAdherence: Math.round(row.avg_adherence || 0),
      homeworkCompleted: row.homework,
    }));
  }

  /**
   * Find sessions by component
   */
  async findByComponent(
    userId: string,
    component: string
  ): Promise<ITherapySessionEntity[]> {
    const rows = await this.db.query<ITherapySessionRow>(
      `SELECT * FROM ${this.tableName}
       WHERE user_id = ? AND component = ? AND deleted_at IS NULL
       ORDER BY week ASC, scheduled_at ASC`,
      [userId, component]
    );
    return rows.map((row) => this.rowToEntity(row));
  }
}
