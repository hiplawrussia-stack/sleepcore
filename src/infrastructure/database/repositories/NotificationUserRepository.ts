/**
 * Notification User Repository
 * ============================
 * Persistence for proactive notification user registry.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface INotificationUserRow {
  id: number;
  user_id: string;
  chat_id: number;
  user_name: string | null;
  preferences_json: string;
  context_json: string;
  first_interaction_at: string | null;
  last_notification_at: string | null;
  last_response_at: string | null;
  reengagement_attempts: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface INotificationUserEntity {
  userId: string;
  chatId: number;
  userName?: string;
  preferencesJson: string;
  contextJson: string;
  firstInteractionAt?: Date;
  lastNotificationAt?: Date;
  lastResponseAt?: Date;
  reengagementAttempts: number;
}

export class NotificationUserRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async findByUserId(userId: string): Promise<INotificationUserEntity | null> {
    const row = await this.db.queryOne<INotificationUserRow>(
      `SELECT * FROM notification_users WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(): Promise<INotificationUserEntity[]> {
    const rows = await this.db.query<INotificationUserRow>(
      `SELECT * FROM notification_users WHERE deleted_at IS NULL`
    );
    return rows.map(r => this.rowToEntity(r));
  }

  async upsert(userId: string, data: Partial<INotificationUserEntity>): Promise<void> {
    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT id FROM notification_users WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      await this.db.execute(
        `UPDATE notification_users SET
          chat_id = ?, user_name = ?, preferences_json = ?, context_json = ?,
          first_interaction_at = ?, last_notification_at = ?, last_response_at = ?,
          reengagement_attempts = ?, updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL`,
        [
          data.chatId ?? 0,
          data.userName ?? null,
          data.preferencesJson ?? '{}',
          data.contextJson ?? '{}',
          data.firstInteractionAt?.toISOString() ?? null,
          data.lastNotificationAt?.toISOString() ?? null,
          data.lastResponseAt?.toISOString() ?? null,
          data.reengagementAttempts ?? 0,
          now,
          userId,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO notification_users (user_id, chat_id, user_name, preferences_json, context_json, first_interaction_at, last_notification_at, last_response_at, reengagement_attempts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.chatId ?? 0,
          data.userName ?? null,
          data.preferencesJson ?? '{}',
          data.contextJson ?? '{}',
          data.firstInteractionAt?.toISOString() ?? null,
          data.lastNotificationAt?.toISOString() ?? null,
          data.lastResponseAt?.toISOString() ?? null,
          data.reengagementAttempts ?? 0,
          now,
          now,
        ]
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE notification_users SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  private rowToEntity(row: INotificationUserRow): INotificationUserEntity {
    return {
      userId: row.user_id,
      chatId: row.chat_id,
      userName: row.user_name ?? undefined,
      preferencesJson: row.preferences_json,
      contextJson: row.context_json,
      firstInteractionAt: row.first_interaction_at ? new Date(row.first_interaction_at) : undefined,
      lastNotificationAt: row.last_notification_at ? new Date(row.last_notification_at) : undefined,
      lastResponseAt: row.last_response_at ? new Date(row.last_response_at) : undefined,
      reengagementAttempts: row.reengagement_attempts,
    };
  }
}
