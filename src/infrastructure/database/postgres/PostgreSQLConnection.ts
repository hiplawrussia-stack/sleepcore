/**
 * PostgreSQLConnection - PostgreSQL Database Connection Implementation
 * =====================================================================
 *
 * Production-ready PostgreSQL connection with:
 * - Connection pooling (pg.Pool)
 * - SSL/TLS support for HIPAA compliance
 * - SCRAM-SHA-256 authentication
 * - Transaction support with ACID guarantees
 * - Health monitoring
 * - Placeholder conversion (? -> $1, $2, etc.)
 *
 * Based on research: node-postgres best practices 2024
 * References:
 * - https://node-postgres.com/features/pooling
 * - https://node-postgres.com/features/ssl
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import type {
  IDatabaseConnection,
  IDatabaseConfig,
  ITransaction,
} from '../interfaces/IDatabaseConnection';

/**
 * PostgreSQL-specific configuration
 */
export interface IPostgreSQLConfig extends IDatabaseConfig {
  readonly type: 'postgres';

  /** Connection pool minimum size */
  readonly poolMin?: number;

  /** Connection pool maximum size */
  readonly poolMax?: number;

  /** Idle timeout in milliseconds */
  readonly idleTimeoutMs?: number;

  /** Connection timeout in milliseconds */
  readonly connectionTimeoutMs?: number;

  /** Statement timeout in milliseconds */
  readonly statementTimeoutMs?: number;

  /** Application name for monitoring */
  readonly applicationName?: string;

  /** SSL certificate (for self-signed certs) */
  readonly sslCert?: string;

  /** Reject unauthorized SSL connections */
  readonly sslRejectUnauthorized?: boolean;
}

/**
 * Default PostgreSQL configuration
 * Optimized for healthcare DTx applications
 */
const DEFAULT_CONFIG: Partial<IPostgreSQLConfig> = {
  poolMin: 2,
  poolMax: 10,
  idleTimeoutMs: 30000, // 30 seconds
  connectionTimeoutMs: 10000, // 10 seconds
  statementTimeoutMs: 30000, // 30 seconds
  ssl: true, // HIPAA requires encryption in transit
  sslRejectUnauthorized: true,
  applicationName: 'sleepcore-dtx',
  verbose: false,
};

/**
 * PostgreSQL transaction implementation
 */
class PostgreSQLTransaction implements ITransaction {
  private committed = false;
  private rolledBack = false;

  constructor(private readonly client: PoolClient) {}

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    await this.client.query('COMMIT');
    this.committed = true;
    this.client.release();
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    await this.client.query('ROLLBACK');
    this.rolledBack = true;
    this.client.release();
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const pgSql = convertPlaceholders(sql);
    const result = await this.client.query(pgSql, params);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    const pgSql = convertPlaceholders(sql);

    // Handle INSERT with RETURNING for lastInsertRowid
    let finalSql = pgSql;
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')) {
      finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }

    const result = await this.client.query(finalSql, params);

    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows[0]?.id || 0,
    };
  }
}

/**
 * Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
 */
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * Convert SQLite datetime() to PostgreSQL NOW()
 */
function convertDatetimeFunctions(sql: string): string {
  return sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*'([^']+)'\)/gi, (_, modifier) => {
      // Handle datetime('now', '-7 days') -> NOW() - INTERVAL '7 days'
      const match = modifier.match(/([+-]?\d+)\s+(day|hour|minute|second)s?/i);
      if (match) {
        const [, num, unit] = match;
        return `NOW() + INTERVAL '${num} ${unit}s'`;
      }
      return 'NOW()';
    });
}

/**
 * PostgreSQL database connection implementation
 */
export class PostgreSQLConnection implements IDatabaseConnection {
  readonly type = 'postgres' as const;

  private pool: Pool | null = null;
  private readonly config: IPostgreSQLConfig;

  constructor(config: IPostgreSQLConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as IPostgreSQLConfig;
  }

  get isConnected(): boolean {
    return this.pool !== null && this.pool.totalCount > 0;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      const poolConfig: PoolConfig = this.buildPoolConfig();

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      client.release();

      // Log pool events in verbose mode
      if (this.config.verbose) {
        this.setupPoolLogging();
      }

      console.log(
        `[PostgreSQL] Connected to ${this.maskConnectionString(this.config.connectionString)}`
      );
      console.log(
        `[PostgreSQL] Pool size: min=${this.config.poolMin}, max=${this.config.poolMax}`
      );
    } catch (error) {
      console.error('[PostgreSQL] Connection failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('[PostgreSQL] Connection pool closed');
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.ensureConnected();
    const pgSql = this.convertSQL(sql);
    const result = await this.pool!.query(pgSql, params);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    this.ensureConnected();
    let pgSql = this.convertSQL(sql);

    // Handle INSERT with RETURNING for lastInsertRowid
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }

    const result = await this.pool!.query(pgSql, params);

    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows[0]?.id || 0,
    };
  }

  async beginTransaction(): Promise<ITransaction> {
    this.ensureConnected();
    const client = await this.pool!.connect();
    await client.query('BEGIN');
    return new PostgreSQLTransaction(client);
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
    const result = await this.queryOne<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      ) as exists`,
      [tableName]
    );
    return result?.exists || false;
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
        'SELECT version() as version'
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
   * Handles multi-statement execution
   */
  async exec(sql: string): Promise<void> {
    this.ensureConnected();
    const pgSql = this.convertSQL(sql);
    await this.pool!.query(pgSql);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Get underlying pool (use with caution)
   */
  getPool(): Pool {
    this.ensureConnected();
    return this.pool!;
  }

  private ensureConnected(): void {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  private buildPoolConfig(): PoolConfig {
    const config: PoolConfig = {
      connectionString: this.config.connectionString,
      min: this.config.poolMin,
      max: this.config.poolMax,
      idleTimeoutMillis: this.config.idleTimeoutMs,
      connectionTimeoutMillis: this.config.connectionTimeoutMs,
      application_name: this.config.applicationName,
    };

    // SSL configuration for HIPAA compliance
    if (this.config.ssl) {
      config.ssl = {
        rejectUnauthorized: this.config.sslRejectUnauthorized ?? true,
      };

      // Add certificate if provided (for self-signed certs)
      if (this.config.sslCert) {
        config.ssl = {
          ...config.ssl,
          ca: this.config.sslCert,
        };
      }
    }

    // Statement timeout
    if (this.config.statementTimeoutMs) {
      config.statement_timeout = this.config.statementTimeoutMs;
    }

    return config;
  }

  private setupPoolLogging(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      console.log('[PostgreSQL] New client connected to pool');
    });

    this.pool.on('acquire', () => {
      console.log('[PostgreSQL] Client acquired from pool');
    });

    this.pool.on('release', () => {
      console.log('[PostgreSQL] Client released to pool');
    });

    this.pool.on('remove', () => {
      console.log('[PostgreSQL] Client removed from pool');
    });

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL] Pool error:', err);
    });
  }

  private maskConnectionString(connStr: string): string {
    // Mask password in connection string for logging
    return connStr.replace(/:([^:@]+)@/, ':****@');
  }

  private convertSQL(sql: string): string {
    let pgSql = convertPlaceholders(sql);
    pgSql = convertDatetimeFunctions(pgSql);
    return pgSql;
  }
}

/**
 * Create PostgreSQL connection from connection string
 *
 * @example
 * ```typescript
 * const db = createPostgreSQLConnection(
 *   'postgresql://user:pass@localhost:5432/sleepcore',
 *   { poolMax: 20, ssl: true }
 * );
 * await db.connect();
 * ```
 */
export function createPostgreSQLConnection(
  connectionString: string,
  options?: Partial<Omit<IPostgreSQLConfig, 'type' | 'connectionString'>>
): PostgreSQLConnection {
  return new PostgreSQLConnection({
    type: 'postgres',
    connectionString,
    ...options,
  });
}

/**
 * Create PostgreSQL connection from environment variables
 *
 * Reads: DATABASE_URL, PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 *
 * @example
 * ```typescript
 * const db = createPostgreSQLConnectionFromEnv({ poolMax: 20 });
 * await db.connect();
 * ```
 */
export function createPostgreSQLConnectionFromEnv(
  options?: Partial<Omit<IPostgreSQLConfig, 'type' | 'connectionString'>>
): PostgreSQLConnection {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'sleepcore'}`;

  return createPostgreSQLConnection(connectionString, options);
}
