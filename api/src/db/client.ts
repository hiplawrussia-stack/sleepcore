/**
 * Database Client
 * ===============
 * SQLite database connection using better-sqlite3 and Drizzle ORM.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import * as wearableSchema from './wearable-schema.js';
import * as ouraSchema from '../integrations/oura/schema.js';

// Combined schema for Drizzle query builder
const combinedSchema = { ...schema, ...wearableSchema, ...ouraSchema };

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

    -- Wearable Link Codes table (RFC 8628 Device Authorization)
    CREATE TABLE IF NOT EXISTS api_wearable_link_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      user_code TEXT NOT NULL UNIQUE,
      device_code TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      used_by_device_id TEXT,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL
    );

    -- Wearable Devices table (RFC 8628 compliant)
    CREATE TABLE IF NOT EXISTS api_wearable_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT,
      manufacturer TEXT,
      model TEXT,
      os_version TEXT,
      app_version TEXT,
      access_token TEXT NOT NULL UNIQUE,
      access_token_expires_at TEXT NOT NULL,
      refresh_token TEXT NOT NULL UNIQUE,
      refresh_token_expires_at TEXT NOT NULL,
      token_family TEXT NOT NULL,
      linked_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_primary INTEGER DEFAULT 0,
      last_sync_at TEXT,
      deactivated_at TEXT,
      deactivation_reason TEXT,
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

    -- Wearable Link Codes indexes
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_id ON api_wearable_link_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_code ON api_wearable_link_codes(user_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_device_code ON api_wearable_link_codes(device_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_expires_at ON api_wearable_link_codes(expires_at);

    -- Wearable Devices indexes
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_token_family ON api_wearable_devices(token_family);
    CREATE UNIQUE INDEX IF NOT EXISTS device_user_idx ON api_wearable_devices(device_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_user_id ON api_wearable_sleep_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_device_id ON api_wearable_sleep_sessions(device_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_start_time ON api_wearable_sleep_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_device_id ON api_wearable_sync_log(device_id);

    -- Oura Ring Connections table
    CREATE TABLE IF NOT EXISTS api_oura_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      oura_user_id TEXT,
      oura_email TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at TEXT NOT NULL,
      scopes_granted TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      last_sync_status TEXT,
      last_sync_error TEXT,
      sync_enabled INTEGER DEFAULT 1,
      last_synced_date TEXT,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Oura Sync Log table
    CREATE TABLE IF NOT EXISTS api_oura_sync_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      connection_id TEXT NOT NULL REFERENCES api_oura_connections(id),
      sync_type TEXT NOT NULL,
      date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL,
      sessions_received INTEGER DEFAULT 0,
      sessions_processed INTEGER DEFAULT 0,
      sessions_skipped INTEGER DEFAULT 0,
      sync_started_at TEXT NOT NULL,
      sync_completed_at TEXT,
      duration_ms INTEGER,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      errors_json TEXT
    );

    -- Oura OAuth States table (temporary, for CSRF protection)
    CREATE TABLE IF NOT EXISTS api_oura_oauth_states (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    -- Oura indexes
    CREATE INDEX IF NOT EXISTS idx_oura_connections_user_id ON api_oura_connections(user_id);
    CREATE INDEX IF NOT EXISTS idx_oura_sync_log_user_id ON api_oura_sync_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_oura_sync_log_connection_id ON api_oura_sync_log(connection_id);
    CREATE INDEX IF NOT EXISTS idx_oura_oauth_states_expires ON api_oura_oauth_states(expires_at);
  `);

  // Migration: Update wearable_devices table to new RFC 8628 schema
  migrateWearableDevices(sqlite);
}

/**
 * Migrate wearable_devices table to RFC 8628 schema
 */
function migrateWearableDevices(sqlite: Database.Database): void {
  // Check if migration is needed by looking for access_token column
  const tableInfo = sqlite.prepare(`PRAGMA table_info(api_wearable_devices)`).all() as Array<{ name: string }>;
  const hasAccessToken = tableInfo.some(col => col.name === 'access_token');

  if (hasAccessToken) {
    // Already migrated
    return;
  }

  // Check if old table exists
  const hasDeviceToken = tableInfo.some(col => col.name === 'device_token');

  if (!hasDeviceToken) {
    // Table doesn't exist or is empty, nothing to migrate
    return;
  }

  console.log('[Migration] Migrating wearable_devices to RFC 8628 schema...');

  // SQLite doesn't support DROP COLUMN or ALTER COLUMN, so we need to recreate the table
  // Since we're changing to a new auth flow, old devices need to re-link anyway

  sqlite.exec(`
    -- Create new table with RFC 8628 schema
    CREATE TABLE IF NOT EXISTS api_wearable_devices_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT,
      manufacturer TEXT,
      model TEXT,
      os_version TEXT,
      app_version TEXT,
      access_token TEXT NOT NULL UNIQUE,
      access_token_expires_at TEXT NOT NULL,
      refresh_token TEXT NOT NULL UNIQUE,
      refresh_token_expires_at TEXT NOT NULL,
      token_family TEXT NOT NULL,
      linked_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_primary INTEGER DEFAULT 0,
      last_sync_at TEXT,
      deactivated_at TEXT,
      deactivation_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Drop old table (devices will need to re-link with new auth flow)
    DROP TABLE IF EXISTS api_wearable_devices;

    -- Rename new table
    ALTER TABLE api_wearable_devices_new RENAME TO api_wearable_devices;

    -- Remove old unique index if exists
    DROP INDEX IF EXISTS idx_wearable_devices_link_code;

    -- Create new indexes
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_token_family ON api_wearable_devices(token_family);
    CREATE UNIQUE INDEX IF NOT EXISTS device_user_idx ON api_wearable_devices(device_id, user_id);
  `);

  console.log('[Migration] wearable_devices migration complete. Devices need to re-link.');
}

export { schema, wearableSchema };
