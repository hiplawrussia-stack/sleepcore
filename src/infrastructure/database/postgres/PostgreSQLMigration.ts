/**
 * PostgreSQLMigration - PostgreSQL Migration Runner
 * ==================================================
 *
 * Version-controlled schema migrations for PostgreSQL.
 * Converts SQLite-specific syntax to PostgreSQL.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type {
  IMigration,
  IMigrationRunner,
} from '../interfaces/IDatabaseConnection';
import type { PostgreSQLConnection } from './PostgreSQLConnection';

/**
 * SQL syntax converter: SQLite -> PostgreSQL
 */
function convertMigrationSQL(sql: string): string {
  return sql
    // AUTOINCREMENT -> SERIAL
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')

    // datetime('now') -> NOW()
    .replace(/datetime\('now'\)/gi, 'NOW()')

    // datetime('now', 'modifier') -> NOW() + INTERVAL
    .replace(/datetime\('now',\s*'([^']+)'\)/gi, (_, modifier) => {
      const match = modifier.match(/([+-]?\d+)\s+(day|hour|minute|second)s?/i);
      if (match) {
        const [, num, unit] = match;
        return `NOW() + INTERVAL '${num} ${unit}s'`;
      }
      return 'NOW()';
    })

    // TEXT DEFAULT (datetime('now')) -> TIMESTAMP DEFAULT NOW()
    .replace(/TEXT\s+NOT NULL\s+DEFAULT\s+\(datetime\('now'\)\)/gi,
             'TIMESTAMP NOT NULL DEFAULT NOW()')
    .replace(/TEXT\s+DEFAULT\s+\(datetime\('now'\)\)/gi,
             'TIMESTAMP DEFAULT NOW()')

    // INTEGER -> INTEGER (no change needed, but ensure consistency)
    // REAL -> REAL or DOUBLE PRECISION
    .replace(/\bREAL\b/gi, 'DOUBLE PRECISION')

    // CHECK constraints - PostgreSQL uses same syntax
    // FOREIGN KEY - PostgreSQL uses same syntax

    // sqlite_master -> pg_catalog
    .replace(/sqlite_master/gi, 'pg_catalog.pg_tables')
    .replace(/type='table'/gi, "schemaname = 'public'")

    // SQLite-specific pragmas (remove)
    .replace(/PRAGMA\s+[^;]+;?/gi, '')

    // Remove IF NOT EXISTS for indexes (PostgreSQL handles differently)
    // Keep IF NOT EXISTS for tables

    // TEXT NOT NULL without default - keep as is
    // but ensure TIMESTAMP where needed
    .replace(/\bTEXT\b\s+(NOT NULL\s+)?CHECK/gi, (match, notNull) => {
      return `VARCHAR(255) ${notNull || ''}CHECK`;
    });
}

/**
 * PostgreSQL migration runner implementation
 */
export class PostgreSQLMigration implements IMigrationRunner {
  private readonly MIGRATIONS_TABLE = '_migrations';

  constructor(private readonly db: PostgreSQLConnection) {}

  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('[PostgreSQLMigration] Migrations table initialized');
  }

  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.db.queryOne<{ max_version: number }>(
        `SELECT COALESCE(MAX(version), 0) as max_version FROM ${this.MIGRATIONS_TABLE}`
      );
      return result?.max_version || 0;
    } catch {
      return 0;
    }
  }

  async getPendingMigrations(migrations: IMigration[]): Promise<IMigration[]> {
    const currentVersion = await this.getCurrentVersion();
    return migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);
  }

  async migrate(migrations: IMigration[]): Promise<void> {
    const pending = await this.getPendingMigrations(migrations);

    if (pending.length === 0) {
      console.log('[PostgreSQLMigration] No pending migrations');
      return;
    }

    console.log(`[PostgreSQLMigration] Applying ${pending.length} migrations...`);

    for (const migration of pending) {
      await this.applyMigration(migration);
    }

    console.log('[PostgreSQLMigration] All migrations applied successfully');
  }

  async rollbackTo(version: number, migrations: IMigration[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (version >= currentVersion) {
      console.log('[PostgreSQLMigration] Nothing to rollback');
      return;
    }

    // Get migrations to rollback in reverse order
    const toRollback = migrations
      .filter((m) => m.version > version && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    console.log(`[PostgreSQLMigration] Rolling back ${toRollback.length} migrations...`);

    for (const migration of toRollback) {
      await this.rollbackMigration(migration);
    }

    console.log(`[PostgreSQLMigration] Rolled back to version ${version}`);
  }

  private async applyMigration(migration: IMigration): Promise<void> {
    console.log(`[PostgreSQLMigration] Applying: ${migration.version} - ${migration.name}`);

    try {
      // Convert SQLite syntax to PostgreSQL
      const pgSQL = convertMigrationSQL(migration.up);

      // Execute migration within transaction
      await this.db.transaction(async (tx) => {
        // Split by semicolons and execute each statement
        const statements = this.splitStatements(pgSQL);

        for (const stmt of statements) {
          if (stmt.trim()) {
            await tx.execute(stmt, []);
          }
        }

        // Record migration
        await tx.execute(
          `INSERT INTO ${this.MIGRATIONS_TABLE} (version, name) VALUES ($1, $2)`,
          [migration.version, migration.name]
        );
      });

      console.log(`[PostgreSQLMigration] Applied: ${migration.version} - ${migration.name}`);
    } catch (error) {
      console.error(`[PostgreSQLMigration] Failed: ${migration.version} - ${migration.name}`, error);
      throw error;
    }
  }

  private async rollbackMigration(migration: IMigration): Promise<void> {
    console.log(`[PostgreSQLMigration] Rolling back: ${migration.version} - ${migration.name}`);

    try {
      // Convert SQLite syntax to PostgreSQL
      const pgSQL = convertMigrationSQL(migration.down);

      // Execute rollback within transaction
      await this.db.transaction(async (tx) => {
        const statements = this.splitStatements(pgSQL);

        for (const stmt of statements) {
          if (stmt.trim()) {
            await tx.execute(stmt, []);
          }
        }

        // Remove migration record
        await tx.execute(
          `DELETE FROM ${this.MIGRATIONS_TABLE} WHERE version = $1`,
          [migration.version]
        );
      });

      console.log(`[PostgreSQLMigration] Rolled back: ${migration.version} - ${migration.name}`);
    } catch (error) {
      console.error(`[PostgreSQLMigration] Rollback failed: ${migration.version}`, error);
      throw error;
    }
  }

  /**
   * Split SQL into individual statements
   * Handles complex statements with semicolons inside strings
   */
  private splitStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prevChar = i > 0 ? sql[i - 1] : '';

      // Toggle string state
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Check for statement end
      if (char === ';' && !inString) {
        const stmt = current.trim();
        if (stmt) {
          statements.push(stmt);
        }
        current = '';
      } else {
        current += char;
      }
    }

    // Add final statement if exists
    const finalStmt = current.trim();
    if (finalStmt) {
      statements.push(finalStmt);
    }

    return statements;
  }
}
