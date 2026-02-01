/**
 * Onboarding Repository
 * =====================
 * Persistence for user onboarding funnel progress.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface IOnboardingRow {
  id: number;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  current_step: string;
  completed_steps_json: string;
  is_completed: number;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IOnboardingEntity {
  id?: number;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  currentStep: string;
  completedStepsJson: string;
  isCompleted: boolean;
  completionPercentage: number;
}

export class OnboardingRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async findByUserId(userId: string): Promise<IOnboardingEntity | null> {
    const row = await this.db.queryOne<IOnboardingRow>(
      `SELECT * FROM onboarding_progress WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(): Promise<IOnboardingEntity[]> {
    const rows = await this.db.query<IOnboardingRow>(
      `SELECT * FROM onboarding_progress WHERE deleted_at IS NULL`
    );
    return rows.map(r => this.rowToEntity(r));
  }

  async upsert(userId: string, data: Partial<IOnboardingEntity>): Promise<void> {
    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT id FROM onboarding_progress WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      await this.db.execute(
        `UPDATE onboarding_progress SET
          current_step = ?, completed_steps_json = ?, is_completed = ?,
          completion_percentage = ?, completed_at = ?, updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL`,
        [
          data.currentStep ?? 'welcome_viewed',
          data.completedStepsJson ?? '[]',
          data.isCompleted ? 1 : 0,
          data.completionPercentage ?? 0,
          data.completedAt?.toISOString() ?? null,
          now,
          userId,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO onboarding_progress (user_id, started_at, completed_at, current_step, completed_steps_json, is_completed, completion_percentage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.startedAt?.toISOString() ?? now,
          data.completedAt?.toISOString() ?? null,
          data.currentStep ?? 'welcome_viewed',
          data.completedStepsJson ?? '[]',
          data.isCompleted ? 1 : 0,
          data.completionPercentage ?? 0,
          now,
          now,
        ]
      );
    }
  }

  private rowToEntity(row: IOnboardingRow): IOnboardingEntity {
    return {
      id: row.id,
      userId: row.user_id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      currentStep: row.current_step,
      completedStepsJson: row.completed_steps_json,
      isCompleted: row.is_completed === 1,
      completionPercentage: row.completion_percentage,
    };
  }
}
