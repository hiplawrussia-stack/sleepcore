/**
 * Service State Repository
 * ========================
 * Generic key-value persistence for service state.
 * Used by services that store JSON-serializable state per user.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface IServiceStateRow {
  id: number;
  user_id: string;
  service_name: string;
  state_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ServiceStateRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async get(userId: string, serviceName: string): Promise<unknown | null> {
    const row = await this.db.queryOne<IServiceStateRow>(
      `SELECT * FROM service_state WHERE user_id = ? AND service_name = ? AND deleted_at IS NULL`,
      [userId, serviceName]
    );
    return row ? JSON.parse(row.state_json) : null;
  }

  async getAllForService(serviceName: string): Promise<Array<{ userId: string; state: unknown }>> {
    const rows = await this.db.query<IServiceStateRow>(
      `SELECT * FROM service_state WHERE service_name = ? AND deleted_at IS NULL`,
      [serviceName]
    );
    return rows.map(r => ({ userId: r.user_id, state: JSON.parse(r.state_json) }));
  }

  async set(userId: string, serviceName: string, state: unknown): Promise<void> {
    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT id FROM service_state WHERE user_id = ? AND service_name = ? AND deleted_at IS NULL`,
      [userId, serviceName]
    );
    const now = new Date().toISOString();
    const stateJson = JSON.stringify(state);

    if (existing) {
      await this.db.execute(
        `UPDATE service_state SET state_json = ?, updated_at = ? WHERE user_id = ? AND service_name = ? AND deleted_at IS NULL`,
        [stateJson, now, userId, serviceName]
      );
    } else {
      await this.db.execute(
        `INSERT INTO service_state (user_id, service_name, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [userId, serviceName, stateJson, now, now]
      );
    }
  }

  async delete(userId: string, serviceName: string): Promise<void> {
    await this.db.execute(
      `UPDATE service_state SET deleted_at = datetime('now') WHERE user_id = ? AND service_name = ? AND deleted_at IS NULL`,
      [userId, serviceName]
    );
  }
}
