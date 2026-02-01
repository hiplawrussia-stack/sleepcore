/**
 * ISI Schedule Repository
 * =======================
 * Persistence for ISI assessment scheduling data.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface IISIScheduleRow {
  id: number;
  user_id: string;
  chat_id: number;
  user_name: string | null;
  enrollment_date: string;
  last_assessment_date: string | null;
  last_assessment_week: number | null;
  next_assessment_week: number;
  reminder_sent: number;
  isi_history_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IISIScheduleEntity {
  id?: number;
  userId: string;
  chatId: number;
  userName?: string;
  enrollmentDate: Date;
  lastAssessmentDate?: Date;
  lastAssessmentWeek?: number;
  nextAssessmentWeek: number;
  reminderSent: boolean;
  isiHistory: Array<{ week: number; score: number; date: Date }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ISIScheduleRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async findByUserId(userId: string): Promise<IISIScheduleEntity | null> {
    const row = await this.db.queryOne<IISIScheduleRow>(
      `SELECT * FROM isi_schedule_users WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(): Promise<IISIScheduleEntity[]> {
    const rows = await this.db.query<IISIScheduleRow>(
      `SELECT * FROM isi_schedule_users WHERE deleted_at IS NULL`
    );
    return rows.map(r => this.rowToEntity(r));
  }

  async upsert(userId: string, data: Partial<IISIScheduleEntity>): Promise<void> {
    const existing = await this.db.queryOne<IISIScheduleRow>(
      `SELECT id FROM isi_schedule_users WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (data.chatId !== undefined) { sets.push('chat_id = ?'); params.push(data.chatId); }
      if (data.userName !== undefined) { sets.push('user_name = ?'); params.push(data.userName); }
      if (data.enrollmentDate !== undefined) { sets.push('enrollment_date = ?'); params.push(data.enrollmentDate.toISOString()); }
      if (data.lastAssessmentDate !== undefined) { sets.push('last_assessment_date = ?'); params.push(data.lastAssessmentDate?.toISOString() ?? null); }
      if (data.lastAssessmentWeek !== undefined) { sets.push('last_assessment_week = ?'); params.push(data.lastAssessmentWeek); }
      if (data.nextAssessmentWeek !== undefined) { sets.push('next_assessment_week = ?'); params.push(data.nextAssessmentWeek); }
      if (data.reminderSent !== undefined) { sets.push('reminder_sent = ?'); params.push(data.reminderSent ? 1 : 0); }
      if (data.isiHistory !== undefined) {
        sets.push('isi_history_json = ?');
        params.push(JSON.stringify(data.isiHistory.map(h => ({
          ...h,
          date: h.date instanceof Date ? h.date.toISOString() : h.date,
        }))));
      }

      sets.push('updated_at = ?');
      params.push(now);
      params.push(userId);

      await this.db.execute(
        `UPDATE isi_schedule_users SET ${sets.join(', ')} WHERE user_id = ? AND deleted_at IS NULL`,
        params
      );
    } else {
      await this.db.execute(
        `INSERT INTO isi_schedule_users (user_id, chat_id, user_name, enrollment_date, last_assessment_date, last_assessment_week, next_assessment_week, reminder_sent, isi_history_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.chatId ?? 0,
          data.userName ?? null,
          data.enrollmentDate?.toISOString() ?? now,
          data.lastAssessmentDate?.toISOString() ?? null,
          data.lastAssessmentWeek ?? null,
          data.nextAssessmentWeek ?? 0,
          data.reminderSent ? 1 : 0,
          JSON.stringify((data.isiHistory ?? []).map(h => ({
            ...h,
            date: h.date instanceof Date ? h.date.toISOString() : h.date,
          }))),
          now,
          now,
        ]
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE isi_schedule_users SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  private rowToEntity(row: IISIScheduleRow): IISIScheduleEntity {
    const history = JSON.parse(row.isi_history_json) as Array<{ week: number; score: number; date: string }>;
    return {
      id: row.id,
      userId: row.user_id,
      chatId: row.chat_id,
      userName: row.user_name ?? undefined,
      enrollmentDate: new Date(row.enrollment_date),
      lastAssessmentDate: row.last_assessment_date ? new Date(row.last_assessment_date) : undefined,
      lastAssessmentWeek: row.last_assessment_week ?? undefined,
      nextAssessmentWeek: row.next_assessment_week,
      reminderSent: row.reminder_sent === 1,
      isiHistory: history.map(h => ({ ...h, date: new Date(h.date) })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
