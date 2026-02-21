/**
 * Database Client
 * ===============
 * Dual-mode database client supporting SQLite (dev) and PostgreSQL (prod).
 * Auto-detects based on DATABASE_URL environment variable.
 *
 * Architecture Decision (2026-02):
 * - PostgreSQL for production: ACID, concurrent writes, pgAudit for HIPAA
 * - SQLite for development: zero-config, fast iteration
 *
 * @see CLAUDE.md Section 5: Architecture
 */

import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import * as wearableSchema from './wearable-schema.js';
import * as ouraSchema from '../integrations/oura/schema.js';

// Combined schema for Drizzle query builder
const combinedSchema = { ...schema, ...wearableSchema, ...ouraSchema };

// Database type
type DatabaseType = 'sqlite' | 'postgres';

// Use SQLite drizzle type as base (API-compatible with PostgreSQL at runtime)
// This allows existing code to work without TypeScript union type issues
type DrizzleDB = ReturnType<typeof drizzleSqlite<typeof combinedSchema>>;

let db: DrizzleDB | null = null;
let sqlite: Database.Database | null = null;
let pgPool: pg.Pool | null = null;
let currentDbType: DatabaseType | null = null;

/**
 * Detect database type from environment
 */
function detectDatabaseType(): DatabaseType {
  // If DATABASE_URL is set and looks like PostgreSQL, use PostgreSQL
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    return 'postgres';
  }

  // Default to SQLite
  return 'sqlite';
}

/**
 * Initialize database connection (auto-detects type)
 */
export async function initDatabase(pathOrUrl?: string): Promise<DrizzleDB> {
  if (db) return db;

  const dbType = detectDatabaseType();
  currentDbType = dbType;

  console.log(`[Database] Initializing ${dbType} connection...`);

  if (dbType === 'postgres') {
    return initPostgreSQL(pathOrUrl || process.env.DATABASE_URL!);
  }

  return initSQLite(pathOrUrl || process.env.DATABASE_PATH || './database/api.db');
}

/**
 * Initialize SQLite connection
 */
function initSQLite(dbPath: string): DrizzleDB {
  sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 10000');
  sqlite.pragma('foreign_keys = ON');

  db = drizzleSqlite(sqlite, { schema: combinedSchema });

  // Run migrations
  runSQLiteMigrations(sqlite);

  console.log('[Database] SQLite connection established');
  return db;
}

/**
 * Initialize PostgreSQL connection
 */
async function initPostgreSQL(connectionString: string): Promise<DrizzleDB> {
  pgPool = new pg.Pool({
    connectionString,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  const client = await pgPool.connect();
  client.release();

  // Cast to DrizzleDB type for TypeScript compatibility
  // At runtime, Drizzle SQLite and PostgreSQL APIs are compatible
  db = drizzlePg(pgPool, { schema: combinedSchema }) as unknown as DrizzleDB;

  // Run migrations
  await runPostgreSQLMigrations(pgPool);

  console.log('[Database] PostgreSQL connection established');
  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): DrizzleDB {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

/**
 * Get current database type
 */
export function getDatabaseType(): DatabaseType | null {
  return currentDbType;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  db = null;
  currentDbType = null;
}

/**
 * Check database health
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    if (currentDbType === 'sqlite' && sqlite) {
      sqlite.prepare('SELECT 1').get();
      return true;
    }
    if (currentDbType === 'postgres' && pgPool) {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Run SQLite migrations
 */
function runSQLiteMigrations(sqlite: Database.Database): void {
  // Run schema migrations BEFORE CREATE TABLE statements
  migrateWearableDevicesSQLite(sqlite);
  migrateUsersAddVkIdSQLite(sqlite);
  migrateWearableSleepSessionsAddSpO2SQLite(sqlite);

  // Create tables if they don't exist
  sqlite.exec(getSQLiteSchema());
}

/**
 * Run PostgreSQL migrations
 */
async function runPostgreSQLMigrations(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(getPostgreSQLSchema());

    // Run incremental migrations
    await migrateUsersAddVkIdPostgreSQL(client);
    await migrateWearableSleepSessionsAddSpO2PostgreSQL(client);

    console.log('[Database] PostgreSQL migrations complete');
  } finally {
    client.release();
  }
}

/**
 * SQLite Schema (existing)
 */
function getSQLiteSchema(): string {
  return `
    -- Users table
    CREATE TABLE IF NOT EXISTS api_users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE,
      vk_id INTEGER UNIQUE,
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
      spo2_mean REAL,
      spo2_min REAL,
      spo2_time_below_90 INTEGER,
      spo2_desaturation_events INTEGER,
      breathing_disturbances REAL,
      respiration_rate REAL,
      skin_temperature REAL,
      stages_json TEXT,
      hrv_json TEXT,
      heart_rate_json TEXT,
      spo2_json TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_id ON api_wearable_link_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_code ON api_wearable_link_codes(user_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_device_code ON api_wearable_link_codes(device_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_expires_at ON api_wearable_link_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_token_family ON api_wearable_devices(token_family);
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

    -- Oura OAuth States table
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
  `;
}

/**
 * PostgreSQL Schema
 */
function getPostgreSQLSchema(): string {
  return `
    -- Users table
    CREATE TABLE IF NOT EXISTS api_users (
      id TEXT PRIMARY KEY,
      telegram_id BIGINT UNIQUE,
      vk_id BIGINT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT DEFAULT 'ru',
      is_premium SMALLINT DEFAULT 0,
      evolution_stage TEXT DEFAULT 'owlet',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    -- Breathing Sessions table
    CREATE TABLE IF NOT EXISTS api_breathing_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      pattern_id TEXT NOT NULL,
      pattern_name TEXT NOT NULL,
      cycles INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      completed_at TIMESTAMP NOT NULL,
      synced_at TIMESTAMP
    );

    -- User Badges table
    CREATE TABLE IF NOT EXISTS api_user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      badge_id TEXT NOT NULL,
      earned_at TIMESTAMP NOT NULL
    );

    -- User Quests table
    CREATE TABLE IF NOT EXISTS api_user_quests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      quest_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      started_at TIMESTAMP NOT NULL,
      completed_at TIMESTAMP,
      expires_at TIMESTAMP
    );

    -- Sync Log table
    CREATE TABLE IF NOT EXISTS api_sync_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      data TEXT,
      timestamp BIGINT NOT NULL,
      synced_at TIMESTAMP
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

    -- Wearable Link Codes table (RFC 8628 Device Authorization)
    CREATE TABLE IF NOT EXISTS api_wearable_link_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id BIGINT NOT NULL,
      user_code TEXT NOT NULL UNIQUE,
      device_code TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      used_by_device_id TEXT,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL
    );

    -- Wearable Devices table (RFC 8628 compliant)
    CREATE TABLE IF NOT EXISTS api_wearable_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id BIGINT NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT,
      manufacturer TEXT,
      model TEXT,
      os_version TEXT,
      app_version TEXT,
      access_token TEXT NOT NULL UNIQUE,
      access_token_expires_at TIMESTAMP NOT NULL,
      refresh_token TEXT NOT NULL UNIQUE,
      refresh_token_expires_at TIMESTAMP NOT NULL,
      token_family TEXT NOT NULL,
      linked_at TIMESTAMP NOT NULL,
      is_active SMALLINT DEFAULT 1,
      is_primary SMALLINT DEFAULT 0,
      last_sync_at TIMESTAMP,
      deactivated_at TIMESTAMP,
      deactivation_reason TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      UNIQUE (device_id, user_id)
    );

    -- Wearable Sleep Sessions table
    CREATE TABLE IF NOT EXISTS api_wearable_sleep_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      device_id TEXT NOT NULL REFERENCES api_wearable_devices(id),
      source_session_id TEXT NOT NULL,
      source TEXT NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
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
      spo2_mean REAL,
      spo2_min REAL,
      spo2_time_below_90 INTEGER,
      spo2_desaturation_events INTEGER,
      breathing_disturbances REAL,
      respiration_rate REAL,
      skin_temperature REAL,
      stages_json TEXT,
      hrv_json TEXT,
      heart_rate_json TEXT,
      spo2_json TEXT,
      notes TEXT,
      processed_at TIMESTAMP,
      synced_at TIMESTAMP NOT NULL
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
      sync_started_at TIMESTAMP NOT NULL,
      sync_completed_at TIMESTAMP,
      duration_ms INTEGER,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      errors_json TEXT,
      data_from_time TIMESTAMP,
      data_to_time TIMESTAMP
    );

    -- Oura Ring Connections table
    CREATE TABLE IF NOT EXISTS api_oura_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES api_users(id),
      telegram_id BIGINT NOT NULL,
      oura_user_id TEXT,
      oura_email TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMP NOT NULL,
      scopes_granted TEXT NOT NULL,
      is_active SMALLINT DEFAULT 1,
      last_sync_at TIMESTAMP,
      last_sync_status TEXT,
      last_sync_error TEXT,
      sync_enabled SMALLINT DEFAULT 1,
      last_synced_date TEXT,
      connected_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
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
      sync_started_at TIMESTAMP NOT NULL,
      sync_completed_at TIMESTAMP,
      duration_ms INTEGER,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      errors_json TEXT
    );

    -- Oura OAuth States table
    CREATE TABLE IF NOT EXISTS api_oura_oauth_states (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES api_users(id),
      telegram_id BIGINT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL
    );

    -- Indexes (PostgreSQL uses CREATE INDEX IF NOT EXISTS)
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON api_users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON api_breathing_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON api_breathing_sessions(completed_at);
    CREATE INDEX IF NOT EXISTS idx_badges_user_id ON api_user_badges(user_id);
    CREATE INDEX IF NOT EXISTS idx_quests_user_id ON api_user_quests(user_id);
    CREATE INDEX IF NOT EXISTS idx_sync_user_timestamp ON api_sync_log(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON api_daily_stats(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_id ON api_wearable_link_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_link_codes_user_code ON api_wearable_link_codes(user_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_device_code ON api_wearable_link_codes(device_code);
    CREATE INDEX IF NOT EXISTS idx_link_codes_expires_at ON api_wearable_link_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_token_family ON api_wearable_devices(token_family);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_user_id ON api_wearable_sleep_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_device_id ON api_wearable_sleep_sessions(device_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_start_time ON api_wearable_sleep_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_device_id ON api_wearable_sync_log(device_id);
    CREATE INDEX IF NOT EXISTS idx_oura_connections_user_id ON api_oura_connections(user_id);
    CREATE INDEX IF NOT EXISTS idx_oura_sync_log_user_id ON api_oura_sync_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_oura_sync_log_connection_id ON api_oura_sync_log(connection_id);
    CREATE INDEX IF NOT EXISTS idx_oura_oauth_states_expires ON api_oura_oauth_states(expires_at);
  `;
}

// ============================================
// SQLite Migrations
// ============================================

function migrateWearableDevicesSQLite(sqlite: Database.Database): void {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(api_wearable_devices)`).all() as Array<{ name: string }>;
  const hasAccessToken = tableInfo.some(col => col.name === 'access_token');

  if (hasAccessToken || tableInfo.length === 0) {
    return;
  }

  const hasDeviceToken = tableInfo.some(col => col.name === 'device_token');
  if (!hasDeviceToken) {
    return;
  }

  console.log('[Migration] Migrating wearable_devices to RFC 8628 schema...');

  sqlite.exec(`
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

    DROP TABLE IF EXISTS api_wearable_devices;
    ALTER TABLE api_wearable_devices_new RENAME TO api_wearable_devices;
    DROP INDEX IF EXISTS idx_wearable_devices_link_code;
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON api_wearable_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_telegram_id ON api_wearable_devices(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_wearable_devices_token_family ON api_wearable_devices(token_family);
    CREATE UNIQUE INDEX IF NOT EXISTS device_user_idx ON api_wearable_devices(device_id, user_id);
  `);

  console.log('[Migration] wearable_devices migration complete.');
}

function migrateUsersAddVkIdSQLite(sqlite: Database.Database): void {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(api_users)`).all() as Array<{ name: string }>;
  const hasVkId = tableInfo.some(col => col.name === 'vk_id');

  if (hasVkId || tableInfo.length === 0) {
    return;
  }

  console.log('[Migration] Adding vk_id column to api_users...');
  sqlite.exec(`ALTER TABLE api_users ADD COLUMN vk_id INTEGER`);
  sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_vk_id ON api_users(vk_id)`);
  console.log('[Migration] vk_id column added.');
}

function migrateWearableSleepSessionsAddSpO2SQLite(sqlite: Database.Database): void {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(api_wearable_sleep_sessions)`).all() as Array<{ name: string }>;
  const hasSpo2Mean = tableInfo.some(col => col.name === 'spo2_mean');

  if (hasSpo2Mean || tableInfo.length === 0) {
    return;
  }

  console.log('[Migration] Adding SpO2/breathing/temperature columns...');

  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN spo2_mean REAL`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN spo2_min REAL`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN spo2_time_below_90 INTEGER`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN spo2_desaturation_events INTEGER`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN breathing_disturbances REAL`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN respiration_rate REAL`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN skin_temperature REAL`);
  sqlite.exec(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN spo2_json TEXT`);

  console.log('[Migration] SpO2/breathing/temperature columns added.');
}

// ============================================
// PostgreSQL Migrations
// ============================================

async function migrateUsersAddVkIdPostgreSQL(client: pg.PoolClient): Promise<void> {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'api_users' AND column_name = 'vk_id'
  `);

  if (result.rows.length > 0) {
    return;
  }

  console.log('[Migration] Adding vk_id column to api_users (PostgreSQL)...');
  await client.query(`ALTER TABLE api_users ADD COLUMN IF NOT EXISTS vk_id BIGINT UNIQUE`);
  console.log('[Migration] vk_id column added.');
}

async function migrateWearableSleepSessionsAddSpO2PostgreSQL(client: pg.PoolClient): Promise<void> {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'api_wearable_sleep_sessions' AND column_name = 'spo2_mean'
  `);

  if (result.rows.length > 0) {
    return;
  }

  console.log('[Migration] Adding SpO2/breathing/temperature columns (PostgreSQL)...');

  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS spo2_mean REAL`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS spo2_min REAL`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS spo2_time_below_90 INTEGER`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS spo2_desaturation_events INTEGER`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS breathing_disturbances REAL`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS respiration_rate REAL`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS skin_temperature REAL`);
  await client.query(`ALTER TABLE api_wearable_sleep_sessions ADD COLUMN IF NOT EXISTS spo2_json TEXT`);

  console.log('[Migration] SpO2/breathing/temperature columns added.');
}

export { schema, wearableSchema };
