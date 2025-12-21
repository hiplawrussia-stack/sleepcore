/**
 * SQLiteConnection - SQLite Database Connection Implementation
 * =============================================================
 *
 * Production-ready SQLite connection with:
 * - WAL mode for concurrent reads
 * - Performance optimizations (cache, mmap)
 * - Transaction support with ACID guarantees
 * - Health monitoring
 *
 * Based on byte-bot DatabaseService with enhancements.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import Database from 'better-sqlite3';
import type {
  IDatabaseConnection,
  IDatabaseConfig,
  ITransaction,
} from '../interfaces/IDatabaseConnection';

/**
 * SQLite-specific configuration
 */
export interface ISQLiteConfig extends IDatabaseConfig {
  readonly type: 'sqlite';
  /** Enable memory-mapped I/O (bytes) */
  readonly mmapSize?: number;
  /** Page size in bytes */
  readonly pageSize?: number;
}

/**
 * Default SQLite configuration
 */
const DEFAULT_CONFIG: Partial<ISQLiteConfig> = {
  walMode: true,
  cacheSize: 64000, // 64MB
  busyTimeout: 5000, // 5 seconds
  synchronous: 'NORMAL',
  mmapSize: 268435456, // 256MB
  pageSize: 4096,
  verbose: false,
};

/**
 * SQLite transaction implementation
 */
class SQLiteTransaction implements ITransaction {
  private committed = false;
  private rolledBack = false;

  constructor(private readonly db: Database.Database) {}

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    this.db.exec('COMMIT');
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    this.db.exec('ROLLBACK');
    this.rolledBack = true;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }
}

/**
 * SQLite database connection implementation
 */
export class SQLiteConnection implements IDatabaseConnection {
  readonly type = 'sqlite' as const;

  private db: Database.Database | null = null;
  private readonly config: ISQLiteConfig;

  constructor(config: ISQLiteConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ISQLiteConfig;
  }

  get isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.db = new Database(this.config.connectionString, {
        verbose: this.config.verbose ? console.log : undefined,
      });

      // Apply performance pragmas
      this.applyPragmas();

      console.log(`[SQLite] Connected to ${this.config.connectionString}`);
    } catch (error) {
      console.error('[SQLite] Connection failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      // Checkpoint WAL before closing
      if (this.config.walMode) {
        try {
          this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch {
          // Ignore checkpoint errors on close
        }
      }

      this.db.close();
      this.db = null;
      console.log('[SQLite] Connection closed');
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  async beginTransaction(): Promise<ITransaction> {
    this.ensureConnected();
    this.db!.exec('BEGIN IMMEDIATE');
    return new SQLiteTransaction(this.db!);
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const tx = await this.beginTransaction();
    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    this.ensureConnected();
    const result = await this.queryOne<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return result !== null;
  }

  async healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    version: string;
  }> {
    const start = Date.now();

    try {
      this.ensureConnected();
      const result = await this.queryOne<{ version: string }>(
        'SELECT sqlite_version() as version'
      );

      return {
        connected: true,
        latencyMs: Date.now() - start,
        version: result?.version || 'unknown',
      };
    } catch {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        version: 'unknown',
      };
    }
  }

  /**
   * Execute raw SQL (for migrations)
   */
  exec(sql: string): void {
    this.ensureConnected();
    this.db!.exec(sql);
  }

  /**
   * Get underlying database instance (use with caution)
   */
  getDatabase(): Database.Database {
    this.ensureConnected();
    return this.db!;
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  private applyPragmas(): void {
    if (!this.db) return;

    const pragmas = [
      // WAL mode for concurrent reads during writes
      this.config.walMode ? 'PRAGMA journal_mode = WAL' : null,

      // Synchronous mode (NORMAL balances safety and performance)
      `PRAGMA synchronous = ${this.config.synchronous}`,

      // Cache size (negative = KB)
      `PRAGMA cache_size = -${this.config.cacheSize}`,

      // Busy timeout
      `PRAGMA busy_timeout = ${this.config.busyTimeout}`,

      // Memory-mapped I/O
      `PRAGMA mmap_size = ${this.config.mmapSize}`,

      // Temp tables in memory
      'PRAGMA temp_store = MEMORY',

      // Page size
      `PRAGMA page_size = ${this.config.pageSize}`,

      // Foreign key enforcement
      'PRAGMA foreign_keys = ON',
    ].filter(Boolean);

    for (const pragma of pragmas) {
      try {
        this.db.exec(pragma!);
      } catch (error) {
        console.warn(`[SQLite] Failed to apply pragma: ${pragma}`, error);
      }
    }

    console.log('[SQLite] Performance pragmas applied');
  }
}

/**
 * Create SQLite connection from file path
 */
export function createSQLiteConnection(
  filePath: string,
  options?: Partial<Omit<ISQLiteConfig, 'type' | 'connectionString'>>
): SQLiteConnection {
  return new SQLiteConnection({
    type: 'sqlite',
    connectionString: filePath,
    ...options,
  });
}
