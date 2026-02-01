/**
 * Digital Twin Repository
 * =======================
 * Persistence for patient digital twin state.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface IDigitalTwinRow {
  id: number;
  user_id: string;
  observation_count: number;
  state_quality: number;
  is_ready: number;
  current_metrics_json: string | null;
  trend: string;
  risk_level: string;
  twin_created_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IDigitalTwinEntity {
  id?: number;
  userId: string;
  observationCount: number;
  stateQuality: number;
  isReady: boolean;
  currentMetricsJson: string | null;
  trend: string;
  riskLevel: string;
  twinCreatedAt: Date;
  lastUpdatedAt: Date;
}

export class DigitalTwinRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async findByUserId(userId: string): Promise<IDigitalTwinEntity | null> {
    const row = await this.db.queryOne<IDigitalTwinRow>(
      `SELECT * FROM digital_twins WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(): Promise<IDigitalTwinEntity[]> {
    const rows = await this.db.query<IDigitalTwinRow>(
      `SELECT * FROM digital_twins WHERE deleted_at IS NULL`
    );
    return rows.map(r => this.rowToEntity(r));
  }

  async upsert(userId: string, data: Partial<IDigitalTwinEntity>): Promise<void> {
    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT id FROM digital_twins WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      await this.db.execute(
        `UPDATE digital_twins SET
          observation_count = ?, state_quality = ?, is_ready = ?,
          current_metrics_json = ?, trend = ?, risk_level = ?,
          last_updated_at = ?, updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL`,
        [
          data.observationCount ?? 0,
          data.stateQuality ?? 0,
          data.isReady ? 1 : 0,
          data.currentMetricsJson ?? null,
          data.trend ?? 'stable',
          data.riskLevel ?? 'low',
          data.lastUpdatedAt?.toISOString() ?? now,
          now,
          userId,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO digital_twins (user_id, observation_count, state_quality, is_ready, current_metrics_json, trend, risk_level, twin_created_at, last_updated_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.observationCount ?? 0,
          data.stateQuality ?? 0,
          data.isReady ? 1 : 0,
          data.currentMetricsJson ?? null,
          data.trend ?? 'stable',
          data.riskLevel ?? 'low',
          data.twinCreatedAt?.toISOString() ?? now,
          data.lastUpdatedAt?.toISOString() ?? now,
          now,
          now,
        ]
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE digital_twins SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  private rowToEntity(row: IDigitalTwinRow): IDigitalTwinEntity {
    return {
      id: row.id,
      userId: row.user_id,
      observationCount: row.observation_count,
      stateQuality: row.state_quality,
      isReady: row.is_ready === 1,
      currentMetricsJson: row.current_metrics_json,
      trend: row.trend,
      riskLevel: row.risk_level,
      twinCreatedAt: new Date(row.twin_created_at),
      lastUpdatedAt: new Date(row.last_updated_at),
    };
  }
}
