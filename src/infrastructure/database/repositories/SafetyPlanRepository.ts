/**
 * Safety Plan Repository
 * ======================
 * Persistence for patient safety plans (CRITICAL — crisis escalation).
 *
 * Safety plans are Stanley-Brown based documents created during crisis flow.
 * Loss of a safety plan is a direct patient safety risk.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export interface ISafetyPlanRow {
  id: number;
  user_id: string;
  warning_signs_json: string;
  coping_strategies_json: string;
  reasons_to_live_json: string;
  support_contacts_json: string;
  safe_places_json: string;
  professional_contacts_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ISafetyPlanEntity {
  id?: number;
  userId: string;
  warningSigns: string[];
  copingStrategies: string[];
  reasonsToLive: string[];
  supportContacts: Array<{ name: string; phone?: string; relation?: string }>;
  safePlaces: string[];
  professionalContacts: Array<{ name: string; phone: string; type: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export class SafetyPlanRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async findByUserId(userId: string): Promise<ISafetyPlanEntity | null> {
    const row = await this.db.queryOne<ISafetyPlanRow>(
      `SELECT * FROM safety_plans WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(): Promise<ISafetyPlanEntity[]> {
    const rows = await this.db.query<ISafetyPlanRow>(
      `SELECT * FROM safety_plans WHERE deleted_at IS NULL`
    );
    return rows.map(r => this.rowToEntity(r));
  }

  async upsert(userId: string, data: Partial<ISafetyPlanEntity>): Promise<void> {
    const existing = await this.findByUserId(userId);
    const now = new Date().toISOString();

    if (existing) {
      await this.db.execute(
        `UPDATE safety_plans SET
          warning_signs_json = ?,
          coping_strategies_json = ?,
          reasons_to_live_json = ?,
          support_contacts_json = ?,
          safe_places_json = ?,
          professional_contacts_json = ?,
          updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL`,
        [
          JSON.stringify(data.warningSigns ?? existing.warningSigns),
          JSON.stringify(data.copingStrategies ?? existing.copingStrategies),
          JSON.stringify(data.reasonsToLive ?? existing.reasonsToLive),
          JSON.stringify(data.supportContacts ?? existing.supportContacts),
          JSON.stringify(data.safePlaces ?? existing.safePlaces),
          JSON.stringify(data.professionalContacts ?? existing.professionalContacts),
          now,
          userId,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO safety_plans (user_id, warning_signs_json, coping_strategies_json, reasons_to_live_json, support_contacts_json, safe_places_json, professional_contacts_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          JSON.stringify(data.warningSigns ?? []),
          JSON.stringify(data.copingStrategies ?? []),
          JSON.stringify(data.reasonsToLive ?? []),
          JSON.stringify(data.supportContacts ?? []),
          JSON.stringify(data.safePlaces ?? []),
          JSON.stringify(data.professionalContacts ?? []),
          now,
          now,
        ]
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE safety_plans SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  private rowToEntity(row: ISafetyPlanRow): ISafetyPlanEntity {
    return {
      id: row.id,
      userId: row.user_id,
      warningSigns: JSON.parse(row.warning_signs_json),
      copingStrategies: JSON.parse(row.coping_strategies_json),
      reasonsToLive: JSON.parse(row.reasons_to_live_json),
      supportContacts: JSON.parse(row.support_contacts_json),
      safePlaces: JSON.parse(row.safe_places_json),
      professionalContacts: JSON.parse(row.professional_contacts_json),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
