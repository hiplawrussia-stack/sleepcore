/**
 * Database Infrastructure Module
 * ===============================
 *
 * Production-ready database persistence layer for SleepCore.
 *
 * Features:
 * - SQLite support (development/edge deployment)
 * - PostgreSQL support (production with connection pooling)
 * - Unified DatabaseFactory for environment-based switching
 * - Version-controlled migrations
 * - Repository pattern with Data Mapper
 * - GDPR/HIPAA compliant (soft delete, audit log, encryption-ready)
 *
 * Usage:
 * ```typescript
 * // Auto-detect database from environment
 * import { DatabaseFactory, MIGRATIONS, SleepDiaryRepository } from './infrastructure/database';
 *
 * const db = await DatabaseFactory.create({ migrations: MIGRATIONS });
 * const diaryRepo = new SleepDiaryRepository(db);
 *
 * // Or explicit SQLite
 * const sqliteDb = await DatabaseFactory.createSQLite('./data/sleepcore.db', { migrations: MIGRATIONS });
 *
 * // Or explicit PostgreSQL
 * const pgDb = await DatabaseFactory.createPostgreSQL('postgresql://...', { migrations: MIGRATIONS });
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

// ============================================================================
// Interfaces
// ============================================================================

export type {
  IDatabaseConnection,
  IDatabaseConfig,
  IQueryOptions,
  ITransaction,
  IMigration,
  IMigrationRunner,
} from './interfaces/IDatabaseConnection';

export type {
  IEntity,
  IRepository,
  ISleepDiaryEntryEntity,
  ISleepDiaryRepository,
  IAssessmentEntity,
  IAssessmentRepository,
  ITherapySessionEntity,
  ITherapySessionRepository,
  IUserEntity,
  IUserRepository,
} from './interfaces/IRepository';

// ============================================================================
// SQLite Implementation
// ============================================================================

export {
  SQLiteConnection,
  createSQLiteConnection,
  type ISQLiteConfig,
} from './sqlite/SQLiteConnection';

export { SQLiteMigration } from './sqlite/SQLiteMigration';

// ============================================================================
// PostgreSQL Implementation
// ============================================================================

export {
  PostgreSQLConnection,
  createPostgreSQLConnection,
  createPostgreSQLConnectionFromEnv,
  type IPostgreSQLConfig,
} from './postgres/PostgreSQLConnection';

export { PostgreSQLMigration } from './postgres/PostgreSQLMigration';

// ============================================================================
// Database Factory (Unified Creation)
// ============================================================================

export {
  DatabaseFactory,
  initializeDatabaseWithFactory,
  getDatabaseConfigSummary,
  type DatabaseType,
  type IDatabaseFactoryOptions,
} from './DatabaseFactory';

// ============================================================================
// Repositories
// ============================================================================

export { BaseRepository } from './repositories/BaseRepository';
export { SleepDiaryRepository } from './repositories/SleepDiaryRepository';
export { UserRepository } from './repositories/UserRepository';
export { AssessmentRepository } from './repositories/AssessmentRepository';
export { TherapySessionRepository } from './repositories/TherapySessionRepository';

// ============================================================================
// Migrations
// ============================================================================

export { MIGRATIONS, getMigration, getLatestVersion } from './migrations';

// ============================================================================
// Adapters (Grammy Session Storage)
// ============================================================================

export {
  GrammySessionAdapter,
  createGrammySessionAdapter,
  type StorageAdapter,
  type IGrammySessionAdapterConfig,
} from './adapters';

// ============================================================================
// Security (Encryption, Audit, Backup)
// ============================================================================

export {
  // Encryption
  EncryptionService,
  createEncryptionService,
  PHI_FIELDS,
  type IEncryptedData,
  type IEncryptionServiceConfig,
  type IKeyInfo,
  type PHIField,

  // Audit
  AuditService,
  type AuditAction,
  type AuditEntityType,
  type IAuditEntry,
  type IAuditQueryFilters,
  type IAuditStats,
  type IAuditServiceConfig,

  // Backup
  BackupService,
  createBackupService,
  type IBackupMetadata,
  type ICloudStorageConfig,
  type IBackupServiceConfig,
  type IBackupResult,
  type IRestoreResult,
} from './security';

// ============================================================================
// Convenience Functions
// ============================================================================

import type { IDatabaseConnection } from './interfaces/IDatabaseConnection';
import type { SQLiteConnection } from './sqlite/SQLiteConnection';
import type { PostgreSQLConnection } from './postgres/PostgreSQLConnection';

/**
 * Initialize SQLite database with migrations (legacy function)
 *
 * @deprecated Use DatabaseFactory.createSQLite() instead
 *
 * @param dbPath Path to SQLite database file
 * @param options Optional configuration
 * @returns Initialized database connection
 *
 * @example
 * ```typescript
 * const db = await initializeDatabase('./data/sleepcore.db');
 * ```
 */
export async function initializeDatabase(
  dbPath: string,
  options?: {
    verbose?: boolean;
    runMigrations?: boolean;
  }
): Promise<SQLiteConnection> {
  const { SQLiteConnection } = await import('./sqlite/SQLiteConnection');
  const { SQLiteMigration } = await import('./sqlite/SQLiteMigration');
  const { MIGRATIONS } = await import('./migrations');

  // Create connection
  const db = new SQLiteConnection({
    type: 'sqlite',
    connectionString: dbPath,
    verbose: options?.verbose,
    walMode: true,
    cacheSize: 64000,
    busyTimeout: 5000,
    synchronous: 'NORMAL',
  });

  // Connect
  await db.connect();

  // Run migrations (default: true)
  if (options?.runMigrations !== false) {
    const migration = new SQLiteMigration(db);
    await migration.initialize();
    await migration.migrate([...MIGRATIONS]);
  }

  console.log('[Database] SQLite initialized successfully');

  return db;
}

/**
 * Initialize PostgreSQL database with migrations
 *
 * @param connectionString PostgreSQL connection string
 * @param options Optional configuration
 * @returns Initialized database connection
 *
 * @example
 * ```typescript
 * const db = await initializePostgres('postgresql://user:pass@localhost:5432/sleepcore');
 * ```
 */
export async function initializePostgres(
  connectionString: string,
  options?: {
    verbose?: boolean;
    runMigrations?: boolean;
    poolMax?: number;
    ssl?: boolean;
  }
): Promise<PostgreSQLConnection> {
  const { PostgreSQLConnection } = await import('./postgres/PostgreSQLConnection');
  const { PostgreSQLMigration } = await import('./postgres/PostgreSQLMigration');
  const { MIGRATIONS } = await import('./migrations');

  // Create connection
  const db = new PostgreSQLConnection({
    type: 'postgres',
    connectionString,
    verbose: options?.verbose,
    poolMax: options?.poolMax ?? 10,
    ssl: options?.ssl ?? true,
  });

  // Connect
  await db.connect();

  // Run migrations (default: true)
  if (options?.runMigrations !== false) {
    const migration = new PostgreSQLMigration(db);
    await migration.initialize();
    await migration.migrate([...MIGRATIONS]);
  }

  console.log('[Database] PostgreSQL initialized successfully');

  return db;
}

/**
 * Database health check (works with both SQLite and PostgreSQL)
 */
export async function checkDatabaseHealth(
  db: IDatabaseConnection
): Promise<{
  connected: boolean;
  latencyMs: number;
  version: string;
  tablesCount: number;
  type: 'sqlite' | 'postgres';
}> {
  const health = await db.healthCheck();

  // Count tables (database-specific query)
  let tablesCount = 0;

  try {
    if (db.type === 'sqlite') {
      const tables = await db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%'`
      );
      tablesCount = tables.length;
    } else {
      const tables = await db.query<{ tablename: string }>(
        `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`
      );
      tablesCount = tables.length;
    }
  } catch {
    // Ignore table count errors
  }

  return {
    ...health,
    tablesCount,
    type: db.type,
  };
}

/**
 * Get pool statistics (PostgreSQL only)
 */
export function getPoolStats(db: IDatabaseConnection): {
  total: number;
  idle: number;
  waiting: number;
} | null {
  if (db.type === 'postgres') {
    return (db as PostgreSQLConnection).getPoolStats();
  }
  return null;
}
