/**
 * GrammySessionAdapter - SQLite Storage Adapter for grammY Sessions
 * ==================================================================
 *
 * Custom storage adapter implementing grammY StorageAdapter interface
 * for persistent session storage in SQLite.
 *
 * Based on 2025 research:
 * - Per-user session persistence (session_key = telegram user_id)
 * - JSON serialization for flexible session schema
 * - TTL support for GDPR compliance (auto-expire inactive sessions)
 * - WAL mode for concurrent reads (via SQLiteConnection)
 *
 * Features:
 * - Read/Write/Delete operations
 * - Optional TTL (time-to-live) for sessions
 * - Automatic cleanup of expired sessions
 * - Integration with users table (optional linking)
 *
 * Usage:
 * ```typescript
 * import { GrammySessionAdapter } from './infrastructure/database';
 *
 * const sessionAdapter = new GrammySessionAdapter(db);
 * bot.use(session({ storage: sessionAdapter }));
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

/**
 * Session row in database
 */
interface SessionRow {
  session_key: string;
  session_data: string;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

/**
 * Grammy StorageAdapter interface
 * (Simplified version matching grammY's expectations)
 */
export interface StorageAdapter<T> {
  read(key: string): Promise<T | undefined>;
  write(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Configuration for GrammySessionAdapter
 */
export interface IGrammySessionAdapterConfig {
  /** Session TTL in seconds (0 = never expires) */
  readonly ttlSeconds?: number;

  /** Table name for sessions (default: 'bot_sessions') */
  readonly tableName?: string;

  /** Enable automatic cleanup of expired sessions */
  readonly autoCleanup?: boolean;

  /** Cleanup interval in seconds (default: 3600 = 1 hour) */
  readonly cleanupIntervalSeconds?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<IGrammySessionAdapterConfig> = {
  ttlSeconds: 0, // No expiration by default
  tableName: 'bot_sessions',
  autoCleanup: true,
  cleanupIntervalSeconds: 3600, // 1 hour
};

/**
 * SQLite storage adapter for grammY sessions
 */
export class GrammySessionAdapter<T> implements StorageAdapter<T> {
  private readonly config: Required<IGrammySessionAdapterConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: IDatabaseConnection,
    config?: IGrammySessionAdapterConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start cleanup timer if enabled
    if (this.config.autoCleanup && this.config.ttlSeconds > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Read session data by key
   * @param key Session key (typically telegram user_id)
   * @returns Session data or undefined if not found/expired
   */
  async read(key: string): Promise<T | undefined> {
    const row = await this.db.queryOne<SessionRow>(
      `SELECT session_data, expires_at FROM ${this.config.tableName}
       WHERE session_key = ?`,
      [key]
    );

    if (!row) {
      return undefined;
    }

    // Check if expired
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (expiresAt < new Date()) {
        // Session expired, delete it
        await this.delete(key);
        return undefined;
      }
    }

    try {
      return JSON.parse(row.session_data) as T;
    } catch {
      console.warn(`[SessionAdapter] Failed to parse session data for key: ${key}`);
      return undefined;
    }
  }

  /**
   * Write session data
   * @param key Session key
   * @param value Session data
   */
  async write(key: string, value: T): Promise<void> {
    const sessionData = JSON.stringify(value);
    const expiresAt = this.config.ttlSeconds > 0
      ? this.calculateExpiresAt(this.config.ttlSeconds)
      : null;

    // Upsert session
    await this.db.execute(
      `INSERT INTO ${this.config.tableName} (session_key, session_data, expires_at, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(session_key) DO UPDATE SET
         session_data = excluded.session_data,
         expires_at = excluded.expires_at,
         updated_at = datetime('now')`,
      [key, sessionData, expiresAt]
    );
  }

  /**
   * Delete session
   * @param key Session key
   */
  async delete(key: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM ${this.config.tableName} WHERE session_key = ?`,
      [key]
    );
  }

  /**
   * Link session to user ID (for cross-referencing)
   * @param sessionKey Session key
   * @param userId User ID from users table
   */
  async linkToUser(sessionKey: string, userId: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.config.tableName} SET user_id = ? WHERE session_key = ?`,
      [userId, sessionKey]
    );
  }

  /**
   * Get all sessions for a user
   * @param userId User ID
   * @returns Array of session data
   */
  async getSessionsByUser(userId: number): Promise<T[]> {
    const rows = await this.db.query<SessionRow>(
      `SELECT session_data FROM ${this.config.tableName}
       WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [userId]
    );

    return rows.map(row => {
      try {
        return JSON.parse(row.session_data) as T;
      } catch {
        return null;
      }
    }).filter((s): s is T => s !== null);
  }

  /**
   * Count active sessions
   * @returns Number of active (non-expired) sessions
   */
  async countActiveSessions(): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.config.tableName}
       WHERE expires_at IS NULL OR expires_at > datetime('now')`
    );
    return result?.count ?? 0;
  }

  /**
   * Cleanup expired sessions
   * @returns Number of deleted sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.db.execute(
      `DELETE FROM ${this.config.tableName}
       WHERE expires_at IS NOT NULL AND expires_at < datetime('now')`
    );
    return result.changes;
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Calculate expiration timestamp
   */
  private calculateExpiresAt(ttlSeconds: number): string {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
    return expiresAt.toISOString();
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const deleted = await this.cleanupExpired();
        if (deleted > 0) {
          console.log(`[SessionAdapter] Cleaned up ${deleted} expired sessions`);
        }
      } catch (error) {
        console.error('[SessionAdapter] Cleanup error:', error);
      }
    }, this.config.cleanupIntervalSeconds * 1000);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

/**
 * Create Grammy session adapter with default configuration
 */
export function createGrammySessionAdapter<T>(
  db: IDatabaseConnection,
  config?: IGrammySessionAdapterConfig
): GrammySessionAdapter<T> {
  return new GrammySessionAdapter<T>(db, config);
}
