/**
 * Database Client
 * ===============
 * SQLite database connection using better-sqlite3 and Drizzle ORM.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import * as wearableSchema from './wearable-schema.js';

// Combined schema for Drizzle query builder
const combinedSchema = { ...schema, ...wearableSchema };

let db: ReturnType<typeof drizzle<typeof combinedSchema>> | null = null;
let sqlite: Database.Database | null = null;

/**
 * Initialize database connection
 */
export function initDatabase(dbPath: string): ReturnType<typeof drizzle<typeof combinedSchema>> {
  if (db) return db;

  sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 10000');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema: combinedSchema });

  // Run migrations
  runMigrations(sqlite);

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): ReturnType<typeof drizzle<typeof combinedSchema>> {
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

    -- Wearable Devices table
    CREATE TABLE IF NOT EXISTS api_wearable_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      device_id TEXT NOT NULL UNIQUE,
      device_name TEXT,
      manufacturer TEXT,
      model TEXT,
      os_version TEXT,
      app_version TEXT,
      device_token TEXT NOT NULL UNIQUE,
      token_expires_at TEXT,
      link_code TEXT UNIQUE,
      link_code_expires_at TEXT,
      linked_at TEXT,
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Wearable Sleep Sessions table
    CREATE TABLE IF NOT EXISTS api_wearable_sleep_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      device_id TEXT NOT NULL REFERENCES api_wearable_devices(id),
      source_session_id TEXT NOT NULL,
      source TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      tst INTEGER,
      tib INTEGER,
      se REAL,
      waso INTEGER,
      sol INTEGER,
      awakenings INTEGER,
      stage_wake REAL,
      stage_light REAL,
      stage_deep REAL,
      stage_rem REAL,
      hrv_mean_rmssd REAL,
      hrv_sd_rmssd REAL,
      hrv_sample_count INTEGER,
      resting_heart_rate INTEGER,
      stages_json TEXT,
      hrv_json TEXT,
      heart_rate_json TEXT,
      notes TEXT,
      processed_at TEXT,
      synced_at TEXT NOT NULL
    );

    -- Wearable Sync Log table
    CREATE TABLE IF NOT EXISTS api_wearable_sync_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      device_id TEXT NOT NULL REFERENCES api_wearable_devices(id),
      sync_type TEXT NOT NULL,
      sessions_received INTEGER DEFAULT 0,
      sessions_processed INTEGER DEFAULT 0,
      sessions_skipped INTEGER DEFAULT 0,
      sync_started_at TEXT NOT NULL,
      sync_completed_at TEXT,
      duration_ms INTEGER,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      errors_json TEXT,
      data_from_time TEXT,
      data_to_time TEXT
    );

    -- Wearable indexes
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_link_code ON api_wearable_devices(link_code);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_user_id ON api_wearable_sleep_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_device_id ON api_wearable_sleep_sessions(device_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_start_time ON api_wearable_sleep_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_device_id ON api_wearable_sync_log(device_id);
  `);
}

export { schema, wearableSchema };
