/**
 * Database Client
 * ===============
 * SQLite database connection using better-sqlite3 and Drizzle ORM.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

/**
 * Initialize database connection
 */
export function initDatabase(dbPath: string): ReturnType<typeof drizzle<typeof schema>> {
  if (db) return db;

  sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 10000');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  // Run migrations
  runMigrations(sqlite);

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

/**
 * Check database health
 */
export function isDatabaseHealthy(): boolean {
  try {
    if (!sqlite) return false;
    sqlite.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Run database migrations
 */
function runMigrations(sqlite: Database.Database): void {
  // Create tables if they don't exist
  sqlite.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS api_users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT DEFAULT 'ru',
      is_premium INTEGER DEFAULT 0,
      evolution_stage TEXT DEFAULT 'owlet',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Breathing Sessions table
    CREATE TABLE IF NOT EXISTS api_breathing_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      pattern_id TEXT NOT NULL,
      pattern_name TEXT NOT NULL,
      cycles INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      synced_at TEXT
    );

    -- User Badges table
    CREATE TABLE IF NOT EXISTS api_user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      badge_id TEXT NOT NULL,
      earned_at TEXT NOT NULL
    );

    -- User Quests table
    CREATE TABLE IF NOT EXISTS api_user_quests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      quest_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      expires_at TEXT
    );

    -- Sync Log table
    CREATE TABLE IF NOT EXISTS api_sync_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      data TEXT,
      timestamp INTEGER NOT NULL,
      synced_at TEXT
    );

    -- Daily Stats table
    CREATE TABLE IF NOT EXISTS api_daily_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      date TEXT NOT NULL,
      sessions_count INTEGER DEFAULT 0,
      total_minutes INTEGER DEFAULT 0,
      patterns TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON api_users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON api_breathing_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON api_breathing_sessions(completed_at);
    CREATE INDEX IF NOT EXISTS idx_badges_user_id ON api_user_badges(user_id);
    CREATE INDEX IF NOT EXISTS idx_quests_user_id ON api_user_quests(user_id);
    CREATE INDEX IF NOT EXISTS idx_sync_user_timestamp ON api_sync_log(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON api_daily_stats(user_id, date);
  `);
}

export { schema };
