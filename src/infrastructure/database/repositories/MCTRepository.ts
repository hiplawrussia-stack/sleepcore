/**
 * MCT Repository
 * ==============
 * Persistence for MCT therapy data (WorryPostponement, DetachedMindfulness, ATT).
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

// ============================================================================
// Worry Entries
// ============================================================================

export class MCTRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  // --- Worry Entries ---

  async getWorryEntries(userId: string): Promise<unknown[]> {
    const rows = await this.db.query<{ entry_json: string }>(
      `SELECT entry_json FROM mct_worry_entries WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [userId]
    );
    return rows.map(r => JSON.parse(r.entry_json));
  }

  async addWorryEntry(userId: string, entry: unknown): Promise<void> {
    await this.db.execute(
      `INSERT INTO mct_worry_entries (user_id, entry_json, created_at) VALUES (?, ?, datetime('now'))`,
      [userId, JSON.stringify(entry)]
    );
  }

  async replaceWorryEntries(userId: string, entries: unknown[]): Promise<void> {
    // Soft-delete old, insert new
    await this.db.execute(
      `UPDATE mct_worry_entries SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    for (const entry of entries) {
      await this.addWorryEntry(userId, entry);
    }
  }

  async deleteWorryEntries(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE mct_worry_entries SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  // --- Worry Settings ---

  async getWorrySettings(userId: string): Promise<unknown | null> {
    const row = await this.db.queryOne<{ settings_json: string }>(
      `SELECT settings_json FROM mct_worry_settings WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row ? JSON.parse(row.settings_json) : null;
  }

  async upsertWorrySettings(userId: string, settings: unknown): Promise<void> {
    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT id FROM mct_worry_settings WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      await this.db.execute(
        `UPDATE mct_worry_settings SET settings_json = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL`,
        [JSON.stringify(settings), now, userId]
      );
    } else {
      await this.db.execute(
        `INSERT INTO mct_worry_settings (user_id, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [userId, JSON.stringify(settings), now, now]
      );
    }
  }

  async deleteWorrySettings(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE mct_worry_settings SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  // --- MCT Sessions (worry, dm, att) ---

  async getSessions(userId: string, sessionType: 'worry' | 'dm' | 'att'): Promise<unknown[]> {
    const rows = await this.db.query<{ session_json: string }>(
      `SELECT session_json FROM mct_sessions WHERE user_id = ? AND session_type = ? AND deleted_at IS NULL ORDER BY started_at ASC`,
      [userId, sessionType]
    );
    return rows.map(r => JSON.parse(r.session_json));
  }

  async getAllSessionsForService(sessionType: 'worry' | 'dm' | 'att'): Promise<Array<{ userId: string; sessions: unknown[] }>> {
    const rows = await this.db.query<{ user_id: string; session_json: string }>(
      `SELECT user_id, session_json FROM mct_sessions WHERE session_type = ? AND deleted_at IS NULL ORDER BY user_id, started_at ASC`,
      [sessionType]
    );
    const grouped = new Map<string, unknown[]>();
    for (const row of rows) {
      const arr = grouped.get(row.user_id) ?? [];
      arr.push(JSON.parse(row.session_json));
      grouped.set(row.user_id, arr);
    }
    return Array.from(grouped.entries()).map(([userId, sessions]) => ({ userId, sessions }));
  }

  async addSession(userId: string, sessionType: 'worry' | 'dm' | 'att', session: unknown, startedAt: Date): Promise<void> {
    await this.db.execute(
      `INSERT INTO mct_sessions (user_id, session_type, session_json, started_at, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [userId, sessionType, JSON.stringify(session), startedAt.toISOString()]
    );
  }

  async replaceSessions(userId: string, sessionType: 'worry' | 'dm' | 'att', sessions: Array<{ session: unknown; startedAt: Date }>): Promise<void> {
    await this.db.execute(
      `UPDATE mct_sessions SET deleted_at = datetime('now') WHERE user_id = ? AND session_type = ? AND deleted_at IS NULL`,
      [userId, sessionType]
    );
    for (const { session, startedAt } of sessions) {
      await this.addSession(userId, sessionType, session, startedAt);
    }
  }

  async deleteSessions(userId: string, sessionType: 'worry' | 'dm' | 'att'): Promise<void> {
    await this.db.execute(
      `UPDATE mct_sessions SET deleted_at = datetime('now') WHERE user_id = ? AND session_type = ? AND deleted_at IS NULL`,
      [userId, sessionType]
    );
  }

  // --- ATT Start Dates (stored in service_state via ServiceStateRepository) ---
  // ATT start dates use ServiceStateRepository with service_name='att_start_dates'
}
