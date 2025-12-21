/**
 * SQLiteMigration - Schema Migration Runner for SQLite
 * =====================================================
 *
 * Version-controlled schema migrations with rollback support.
 * Based on byte-bot DatabaseMigration pattern.
 *
 * Features:
 * - Atomic migrations within transactions
 * - Version tracking in migrations table
 * - Up/down migration support
 * - Migration history logging
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration, IMigrationRunner } from '../interfaces/IDatabaseConnection';
import type { SQLiteConnection } from './SQLiteConnection';

/**
 * Migration record in database
 */
interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

/**
 * SQLite migration runner implementation
 */
export class SQLiteMigration implements IMigrationRunner {
  private readonly MIGRATIONS_TABLE = 'migrations';

  constructor(private readonly db: SQLiteConnection) {}

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    const exists = await this.db.tableExists(this.MIGRATIONS_TABLE);

    if (!exists) {
      this.db.exec(`
        CREATE TABLE ${this.MIGRATIONS_TABLE} (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      console.log('[Migration] Created migrations table');
    }
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<number> {
    const result = await this.db.queryOne<{ version: number }>(
      `SELECT MAX(version) as version FROM ${this.MIGRATIONS_TABLE}`
    );
    return result?.version || 0;
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    return this.db.query<MigrationRecord>(
      `SELECT version, name, applied_at FROM ${this.MIGRATIONS_TABLE} ORDER BY version ASC`
    );
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(migrations: IMigration[]): Promise<IMigration[]> {
    const currentVersion = await this.getCurrentVersion();
    return migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Apply all pending migrations
   */
  async migrate(migrations: IMigration[]): Promise<void> {
    const pending = await this.getPendingMigrations(migrations);

    if (pending.length === 0) {
      console.log('[Migration] No pending migrations');
      return;
    }

    console.log(`[Migration] Applying ${pending.length} migration(s)...`);

    for (const migration of pending) {
      await this.applyMigration(migration);
    }

    console.log('[Migration] All migrations applied successfully');
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: IMigration): Promise<void> {
    console.log(`[Migration] Applying v${migration.version}: ${migration.name}`);

    await this.db.transaction(async (tx) => {
      // Execute migration SQL
      // Split by semicolons for multiple statements
      const statements = migration.up
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await tx.execute(statement);
      }

      // Record migration
      await tx.execute(
        `INSERT INTO ${this.MIGRATIONS_TABLE} (version, name) VALUES (?, ?)`,
        [migration.version, migration.name]
      );
    });

    console.log(`[Migration] Applied v${migration.version}: ${migration.name}`);
  }

  /**
   * Rollback to specific version
   */
  async rollbackTo(targetVersion: number, migrations: IMigration[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      console.log('[Migration] No rollback needed');
      return;
    }

    // Get migrations to rollback (in reverse order)
    const toRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    console.log(`[Migration] Rolling back ${toRollback.length} migration(s)...`);

    for (const migration of toRollback) {
      await this.rollbackMigration(migration);
    }

    console.log(`[Migration] Rolled back to version ${targetVersion}`);
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: IMigration): Promise<void> {
    console.log(`[Migration] Rolling back v${migration.version}: ${migration.name}`);

    await this.db.transaction(async (tx) => {
      // Execute rollback SQL
      const statements = migration.down
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await tx.execute(statement);
      }

      // Remove migration record
      await tx.execute(
        `DELETE FROM ${this.MIGRATIONS_TABLE} WHERE version = ?`,
        [migration.version]
      );
    });

    console.log(`[Migration] Rolled back v${migration.version}: ${migration.name}`);
  }

  /**
   * Get migration status
   */
  async getStatus(migrations: IMigration[]): Promise<{
    currentVersion: number;
    applied: MigrationRecord[];
    pending: IMigration[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations(migrations);

    return { currentVersion, applied, pending };
  }
}
