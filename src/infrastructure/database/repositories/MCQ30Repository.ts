/**
 * MCQ-30 Repository
 * =================
 * Persistence for MCQ-30 (Metacognitions Questionnaire) assessment results.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

export class MCQ30Repository {
  constructor(private readonly db: IDatabaseConnection) {}

  async getResults(userId: string): Promise<unknown[]> {
    const rows = await this.db.query<{ result_json: string }>(
      `SELECT result_json FROM mcq30_results WHERE user_id = ? AND deleted_at IS NULL ORDER BY assessed_at ASC`,
      [userId]
    );
    return rows.map(r => JSON.parse(r.result_json));
  }

  async getAllResults(): Promise<Array<{ userId: string; results: unknown[] }>> {
    const rows = await this.db.query<{ user_id: string; result_json: string }>(
      `SELECT user_id, result_json FROM mcq30_results WHERE deleted_at IS NULL ORDER BY user_id, assessed_at ASC`
    );
    const grouped = new Map<string, unknown[]>();
    for (const row of rows) {
      const arr = grouped.get(row.user_id) ?? [];
      arr.push(JSON.parse(row.result_json));
      grouped.set(row.user_id, arr);
    }
    return Array.from(grouped.entries()).map(([userId, results]) => ({ userId, results }));
  }

  async addResult(userId: string, result: unknown, assessedAt: Date): Promise<void> {
    await this.db.execute(
      `INSERT INTO mcq30_results (user_id, result_json, assessed_at, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [userId, JSON.stringify(result), assessedAt.toISOString()]
    );
  }

  async replaceResults(userId: string, results: Array<{ result: unknown; assessedAt: Date }>): Promise<void> {
    await this.db.execute(
      `UPDATE mcq30_results SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    for (const { result, assessedAt } of results) {
      await this.addResult(userId, result, assessedAt);
    }
  }
}
