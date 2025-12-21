/**
 * DatabaseFactory - Unified Database Creation
 * ============================================
 *
 * Factory for creating database connections based on configuration.
 * Supports seamless switching between SQLite and PostgreSQL.
 *
 * Environment-based selection:
 * - Development: SQLite (zero config, embedded)
 * - Production: PostgreSQL (scalable, HIPAA-ready)
 *
 * @example
 * ```typescript
 * // Auto-detect from environment
 * const db = await DatabaseFactory.create();
 *
 * // Explicit SQLite
 * const sqliteDb = await DatabaseFactory.createSQLite('./data/app.db');
 *
 * // Explicit PostgreSQL
 * const pgDb = await DatabaseFactory.createPostgreSQL('postgresql://...');
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type {
  IDatabaseConnection,
  IDatabaseConfig,
  IMigration,
  IMigrationRunner,
} from './interfaces/IDatabaseConnection';
import { SQLiteConnection, type ISQLiteConfig } from './sqlite/SQLiteConnection';
import { SQLiteMigration } from './sqlite/SQLiteMigration';
import {
  PostgreSQLConnection,
  type IPostgreSQLConfig,
} from './postgres/PostgreSQLConnection';
import { PostgreSQLMigration } from './postgres/PostgreSQLMigration';

/**
 * Database type enumeration
 */
export type DatabaseType = 'sqlite' | 'postgres';

/**
 * Factory configuration options
 */
export interface IDatabaseFactoryOptions {
  /** Database type (auto-detected if not specified) */
  type?: DatabaseType;

  /** SQLite file path (for SQLite) */
  sqlitePath?: string;

  /** PostgreSQL connection string (for PostgreSQL) */
  postgresUrl?: string;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Run migrations on connect */
  runMigrations?: boolean;

  /** Migrations to run */
  migrations?: IMigration[];

  /** SQLite-specific options */
  sqliteOptions?: Partial<ISQLiteConfig>;

  /** PostgreSQL-specific options */
  postgresOptions?: Partial<IPostgreSQLConfig>;
}

/**
 * Environment variable names
 */
const ENV = {
  DATABASE_TYPE: 'DATABASE_TYPE',
  DATABASE_URL: 'DATABASE_URL',
  SQLITE_PATH: 'SQLITE_PATH',
  NODE_ENV: 'NODE_ENV',
} as const;

/**
 * Default configurations
 */
const DEFAULTS = {
  sqlitePath: './data/sleepcore.db',
  verbose: false,
  runMigrations: true,
} as const;

/**
 * Database Factory
 *
 * Creates and configures database connections with automatic
 * type detection and migration support.
 */
export class DatabaseFactory {
  /**
   * Create database connection with auto-detection
   *
   * Detection order:
   * 1. Explicit type in options
   * 2. DATABASE_TYPE environment variable
   * 3. DATABASE_URL presence (PostgreSQL)
   * 4. NODE_ENV (production = PostgreSQL, else SQLite)
   */
  static async create(
    options: IDatabaseFactoryOptions = {}
  ): Promise<IDatabaseConnection> {
    const type = this.detectType(options);

    console.log(`[DatabaseFactory] Creating ${type} connection...`);

    if (type === 'postgres') {
      return this.createPostgreSQL(
        options.postgresUrl || process.env[ENV.DATABASE_URL] || '',
        options
      );
    }

    return this.createSQLite(
      options.sqlitePath || process.env[ENV.SQLITE_PATH] || DEFAULTS.sqlitePath,
      options
    );
  }

  /**
   * Create SQLite connection
   */
  static async createSQLite(
    filePath: string,
    options: IDatabaseFactoryOptions = {}
  ): Promise<SQLiteConnection> {
    const config: ISQLiteConfig = {
      type: 'sqlite',
      connectionString: filePath,
      verbose: options.verbose ?? DEFAULTS.verbose,
      walMode: true,
      ...options.sqliteOptions,
    };

    const db = new SQLiteConnection(config);
    await db.connect();

    // Run migrations if requested
    if (options.runMigrations !== false && options.migrations) {
      const migration = new SQLiteMigration(db);
      await migration.initialize();
      await migration.migrate(options.migrations);
    }

    return db;
  }

  /**
   * Create PostgreSQL connection
   */
  static async createPostgreSQL(
    connectionString: string,
    options: IDatabaseFactoryOptions = {}
  ): Promise<PostgreSQLConnection> {
    if (!connectionString) {
      throw new Error(
        'PostgreSQL connection string required. Set DATABASE_URL or provide postgresUrl option.'
      );
    }

    const config: IPostgreSQLConfig = {
      type: 'postgres',
      connectionString,
      verbose: options.verbose ?? DEFAULTS.verbose,
      ssl: process.env[ENV.NODE_ENV] === 'production',
      ...options.postgresOptions,
    };

    const db = new PostgreSQLConnection(config);
    await db.connect();

    // Run migrations if requested
    if (options.runMigrations !== false && options.migrations) {
      const migration = new PostgreSQLMigration(db);
      await migration.initialize();
      await migration.migrate(options.migrations);
    }

    return db;
  }

  /**
   * Create migration runner for given connection
   */
  static createMigrationRunner(db: IDatabaseConnection): IMigrationRunner {
    if (db.type === 'postgres') {
      return new PostgreSQLMigration(db as PostgreSQLConnection);
    }
    return new SQLiteMigration(db as SQLiteConnection);
  }

  /**
   * Detect database type from options and environment
   */
  private static detectType(options: IDatabaseFactoryOptions): DatabaseType {
    // 1. Explicit type in options
    if (options.type) {
      return options.type;
    }

    // 2. DATABASE_TYPE environment variable
    const envType = process.env[ENV.DATABASE_TYPE]?.toLowerCase();
    if (envType === 'postgres' || envType === 'postgresql') {
      return 'postgres';
    }
    if (envType === 'sqlite') {
      return 'sqlite';
    }

    // 3. DATABASE_URL presence indicates PostgreSQL
    if (process.env[ENV.DATABASE_URL]) {
      return 'postgres';
    }

    // 4. Production environment defaults to PostgreSQL
    if (process.env[ENV.NODE_ENV] === 'production') {
      console.warn(
        '[DatabaseFactory] Production mode detected but no DATABASE_URL. ' +
        'Falling back to SQLite. Set DATABASE_URL for PostgreSQL.'
      );
    }

    // Default to SQLite
    return 'sqlite';
  }
}

/**
 * Initialize database with all migrations
 *
 * Convenience function for common use case.
 *
 * @example
 * ```typescript
 * import { initializeDatabase } from './infrastructure/database';
 * import { MIGRATIONS } from './infrastructure/database/migrations';
 *
 * const db = await initializeDatabaseWithFactory({
 *   migrations: MIGRATIONS,
 *   verbose: process.env.NODE_ENV !== 'production',
 * });
 * ```
 */
export async function initializeDatabaseWithFactory(
  options: IDatabaseFactoryOptions = {}
): Promise<IDatabaseConnection> {
  return DatabaseFactory.create(options);
}

/**
 * Get database configuration summary
 *
 * Useful for logging/debugging without exposing secrets.
 */
export function getDatabaseConfigSummary(): {
  type: DatabaseType;
  source: string;
  path?: string;
} {
  const envType = process.env[ENV.DATABASE_TYPE]?.toLowerCase();
  const hasPostgresUrl = !!process.env[ENV.DATABASE_URL];
  const isProduction = process.env[ENV.NODE_ENV] === 'production';

  let type: DatabaseType = 'sqlite';
  let source = 'default';

  if (envType === 'postgres' || envType === 'postgresql') {
    type = 'postgres';
    source = 'DATABASE_TYPE env';
  } else if (envType === 'sqlite') {
    type = 'sqlite';
    source = 'DATABASE_TYPE env';
  } else if (hasPostgresUrl) {
    type = 'postgres';
    source = 'DATABASE_URL env';
  } else if (isProduction) {
    type = 'sqlite'; // Fallback with warning
    source = 'production fallback (no DATABASE_URL)';
  }

  return {
    type,
    source,
    path: type === 'sqlite'
      ? process.env[ENV.SQLITE_PATH] || DEFAULTS.sqlitePath
      : undefined,
  };
}
