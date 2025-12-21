/**
 * IDatabaseConnection - Abstract Database Connection Interface
 * =============================================================
 *
 * Provides abstraction layer for SQLite/PostgreSQL implementations.
 * Based on byte-bot DatabaseService pattern with enhancements for
 * production health data compliance.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

/**
 * Database configuration options
 */
export interface IDatabaseConfig {
  /** Database type */
  readonly type: 'sqlite' | 'postgres';

  /** Connection string or file path */
  readonly connectionString: string;

  /** Enable verbose logging */
  readonly verbose?: boolean;

  /** Enable WAL mode (SQLite only) */
  readonly walMode?: boolean;

  /** Cache size in KB (SQLite: negative = KB, PostgreSQL: statements) */
  readonly cacheSize?: number;

  /** Busy timeout in ms */
  readonly busyTimeout?: number;

  /** Synchronous mode (SQLite only) */
  readonly synchronous?: 'OFF' | 'NORMAL' | 'FULL';

  /** Connection pool size (PostgreSQL only) */
  readonly poolSize?: number;

  /** Enable SSL (PostgreSQL only) */
  readonly ssl?: boolean;
}

/**
 * Query options for pagination and filtering
 */
export interface IQueryOptions {
  /** Maximum number of results */
  readonly limit?: number;

  /** Number of results to skip */
  readonly offset?: number;

  /** Order by column */
  readonly orderBy?: string;

  /** Order direction */
  readonly orderDirection?: 'ASC' | 'DESC';

  /** Include soft-deleted records */
  readonly includeDeleted?: boolean;
}

/**
 * Transaction interface for ACID operations
 */
export interface ITransaction {
  /** Commit the transaction */
  commit(): Promise<void>;

  /** Rollback the transaction */
  rollback(): Promise<void>;

  /** Execute query within transaction */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /** Execute single result query within transaction */
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;

  /** Execute statement within transaction */
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
}

/**
 * Abstract database connection interface
 * Supports both SQLite and PostgreSQL implementations
 */
export interface IDatabaseConnection {
  /** Database type identifier */
  readonly type: 'sqlite' | 'postgres';

  /** Check if connection is open */
  readonly isConnected: boolean;

  /**
   * Open database connection
   */
  connect(): Promise<void>;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Execute a query and return all results
   * @param sql SQL query string with placeholders
   * @param params Query parameters
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a query and return first result
   * @param sql SQL query string with placeholders
   * @param params Query parameters
   */
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   * @param sql SQL statement with placeholders
   * @param params Statement parameters
   */
  execute(sql: string, params?: unknown[]): Promise<{
    changes: number;
    lastInsertRowid: number;
  }>;

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<ITransaction>;

  /**
   * Execute multiple statements in a transaction
   * @param fn Function containing transaction operations
   */
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;

  /**
   * Check if a table exists
   * @param tableName Name of the table
   */
  tableExists(tableName: string): Promise<boolean>;

  /**
   * Get database health status
   */
  healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    version: string;
  }>;
}

/**
 * Migration interface for schema versioning
 */
export interface IMigration {
  /** Migration version number */
  readonly version: number;

  /** Migration name */
  readonly name: string;

  /** SQL to apply migration */
  readonly up: string;

  /** SQL to rollback migration */
  readonly down: string;
}

/**
 * Migration runner interface
 */
export interface IMigrationRunner {
  /**
   * Initialize migrations table
   */
  initialize(): Promise<void>;

  /**
   * Get current schema version
   */
  getCurrentVersion(): Promise<number>;

  /**
   * Get list of pending migrations
   */
  getPendingMigrations(migrations: IMigration[]): Promise<IMigration[]>;

  /**
   * Apply all pending migrations
   */
  migrate(migrations: IMigration[]): Promise<void>;

  /**
   * Rollback to specific version
   */
  rollbackTo(version: number, migrations: IMigration[]): Promise<void>;
}
