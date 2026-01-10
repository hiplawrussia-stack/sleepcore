/**
 * PHIDataMigration - Plaintext to Encrypted Data Migration
 * =========================================================
 *
 * Migrates existing plaintext PHI data to encrypted format.
 * Implements HIPAA-compliant migration with:
 *
 * - Batch processing for large datasets
 * - Transaction safety with rollback capability
 * - Dry-run mode for testing
 * - Progress reporting and audit logging
 * - Automatic skip of already-encrypted data
 *
 * 2025 Best Practices:
 * - AES-256-GCM encryption (NIST SP 800-111)
 * - Backup before migration (HIPAA requirement)
 * - Audit trail for compliance
 * - Batch processing to minimize downtime
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import { getPHIEncryptionManager, PHIEncryptionManager } from './PHIEncryptionManager';
import { BackupService } from './BackupService';

/**
 * Migration configuration
 */
export interface IPHIMigrationConfig {
  /** Batch size for processing records (default: 100) */
  batchSize?: number;
  /** Dry run mode - don't actually update data (default: false) */
  dryRun?: boolean;
  /** Create backup before migration (default: true) */
  createBackup?: boolean;
  /** Backup directory path */
  backupDir?: string;
  /** Progress callback */
  onProgress?: (progress: IMigrationProgress) => void;
  /** Verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Migration progress information
 */
export interface IMigrationProgress {
  table: string;
  field: string;
  processed: number;
  total: number;
  encrypted: number;
  skipped: number;
  errors: number;
  percentComplete: number;
}

/**
 * Migration result for a single table/field
 */
export interface IFieldMigrationResult {
  table: string;
  field: string;
  totalRecords: number;
  encryptedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  durationMs: number;
}

/**
 * Overall migration result
 */
export interface IPHIMigrationResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  dryRun: boolean;
  backupPath?: string;
  fields: IFieldMigrationResult[];
  totalEncrypted: number;
  totalSkipped: number;
  totalErrors: number;
  errors: Array<{ table: string; field: string; recordId: number; error: string }>;
}

/**
 * PHI field definition for migration
 */
interface IPHIFieldDef {
  table: string;
  idColumn: string;
  field: string;
}

/**
 * PHI fields that need encryption
 */
const PHI_FIELDS_TO_MIGRATE: IPHIFieldDef[] = [
  // User entity
  { table: 'users', idColumn: 'id', field: 'first_name' },
  { table: 'users', idColumn: 'id', field: 'last_name' },
  // Sleep diary
  { table: 'sleep_diary_entries', idColumn: 'id', field: 'notes' },
  // Therapy sessions
  { table: 'therapy_sessions', idColumn: 'id', field: 'notes_json' },
];

/**
 * PHI Data Migration Service
 *
 * Encrypts existing plaintext PHI data in the database.
 *
 * @example
 * ```typescript
 * const migration = new PHIDataMigration(db);
 *
 * // Dry run first
 * const dryResult = await migration.migrate({ dryRun: true });
 * console.log('Would encrypt:', dryResult.totalEncrypted);
 *
 * // Actual migration
 * const result = await migration.migrate({
 *   createBackup: true,
 *   backupDir: './backups',
 *   onProgress: (p) => console.log(`${p.table}.${p.field}: ${p.percentComplete}%`),
 * });
 * ```
 */
export class PHIDataMigration {
  private readonly db: IDatabaseConnection;
  private readonly phiManager: PHIEncryptionManager;

  constructor(db: IDatabaseConnection) {
    this.db = db;
    this.phiManager = getPHIEncryptionManager();
  }

  /**
   * Run PHI data migration
   */
  async migrate(config: IPHIMigrationConfig = {}): Promise<IPHIMigrationResult> {
    const {
      batchSize = 100,
      dryRun = false,
      createBackup = true,
      backupDir = './backups',
      onProgress,
      verbose = false,
    } = config;

    const startTime = new Date();
    const errors: IPHIMigrationResult['errors'] = [];
    const fieldResults: IFieldMigrationResult[] = [];
    let backupPath: string | undefined;

    // Check if encryption is enabled
    if (!this.phiManager.isEncryptionEnabled()) {
      console.error('[PHIDataMigration] ERROR: Encryption is not enabled.');
      console.error('[PHIDataMigration] Set ENCRYPTION_MASTER_KEY in .env before running migration.');
      return {
        success: false,
        startTime,
        endTime: new Date(),
        durationMs: 0,
        dryRun,
        fields: [],
        totalEncrypted: 0,
        totalSkipped: 0,
        totalErrors: 1,
        errors: [{ table: '', field: '', recordId: 0, error: 'Encryption not enabled' }],
      };
    }

    console.log('[PHIDataMigration] Starting PHI data migration...');
    console.log(`[PHIDataMigration] Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`[PHIDataMigration] Batch size: ${batchSize}`);

    // Create backup if requested
    if (createBackup && !dryRun) {
      try {
        console.log('[PHIDataMigration] Creating backup before migration...');
        const backupService = new BackupService({ backupDir });
        const backupResult = await backupService.backup(this.db);
        if (backupResult.success && backupResult.metadata) {
          backupPath = backupResult.metadata.backupPath;
          console.log(`[PHIDataMigration] Backup created: ${backupPath}`);
        } else {
          throw new Error(backupResult.error || 'Backup failed');
        }
      } catch (error) {
        console.error('[PHIDataMigration] Backup failed:', error);
        console.error('[PHIDataMigration] Aborting migration for safety.');
        return {
          success: false,
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          dryRun,
          fields: [],
          totalEncrypted: 0,
          totalSkipped: 0,
          totalErrors: 1,
          errors: [{ table: '', field: '', recordId: 0, error: `Backup failed: ${error}` }],
        };
      }
    }

    // Process each PHI field
    for (const fieldDef of PHI_FIELDS_TO_MIGRATE) {
      const result = await this.migrateField(fieldDef, {
        batchSize,
        dryRun,
        verbose,
        onProgress,
        errors,
      });
      fieldResults.push(result);
    }

    const endTime = new Date();
    const totalEncrypted = fieldResults.reduce((sum, r) => sum + r.encryptedRecords, 0);
    const totalSkipped = fieldResults.reduce((sum, r) => sum + r.skippedRecords, 0);
    const totalErrors = fieldResults.reduce((sum, r) => sum + r.errorRecords, 0);

    console.log('[PHIDataMigration] Migration complete!');
    console.log(`[PHIDataMigration] Total encrypted: ${totalEncrypted}`);
    console.log(`[PHIDataMigration] Total skipped (already encrypted): ${totalSkipped}`);
    console.log(`[PHIDataMigration] Total errors: ${totalErrors}`);

    return {
      success: totalErrors === 0,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      dryRun,
      backupPath,
      fields: fieldResults,
      totalEncrypted,
      totalSkipped,
      totalErrors,
      errors,
    };
  }

  /**
   * Migrate a single field
   */
  private async migrateField(
    fieldDef: IPHIFieldDef,
    options: {
      batchSize: number;
      dryRun: boolean;
      verbose: boolean;
      onProgress?: (progress: IMigrationProgress) => void;
      errors: IPHIMigrationResult['errors'];
    }
  ): Promise<IFieldMigrationResult> {
    const { table, idColumn, field } = fieldDef;
    const { batchSize, dryRun, verbose, onProgress, errors } = options;
    const fieldStart = Date.now();

    console.log(`[PHIDataMigration] Processing ${table}.${field}...`);

    // Check if table exists
    const tableExists = await this.db.tableExists(table);
    if (!tableExists) {
      console.log(`[PHIDataMigration] Table ${table} does not exist, skipping.`);
      return {
        table,
        field,
        totalRecords: 0,
        encryptedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0,
        durationMs: Date.now() - fieldStart,
      };
    }

    // Count total records with non-null values
    const countResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${field} IS NOT NULL AND ${field} != ''`
    );
    const totalRecords = countResult?.count || 0;

    if (totalRecords === 0) {
      console.log(`[PHIDataMigration] No records to process in ${table}.${field}`);
      return {
        table,
        field,
        totalRecords: 0,
        encryptedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0,
        durationMs: Date.now() - fieldStart,
      };
    }

    console.log(`[PHIDataMigration] Found ${totalRecords} records in ${table}.${field}`);

    let processed = 0;
    let encrypted = 0;
    let skipped = 0;
    let errorCount = 0;
    let offset = 0;

    // Process in batches
    while (offset < totalRecords) {
      // Fetch batch
      const records = await this.db.query<{ id: number; value: string }>(
        `SELECT ${idColumn} as id, ${field} as value
         FROM ${table}
         WHERE ${field} IS NOT NULL AND ${field} != ''
         ORDER BY ${idColumn}
         LIMIT ? OFFSET ?`,
        [batchSize, offset]
      );

      if (records.length === 0) break;

      // Process batch in transaction
      if (!dryRun) {
        await this.db.transaction(async (tx) => {
          for (const record of records) {
            try {
              // Check if already encrypted
              if (this.isAlreadyEncrypted(record.value)) {
                skipped++;
                if (verbose) {
                  console.log(`[PHIDataMigration] Skipping ${table}.${field} id=${record.id} (already encrypted)`);
                }
                continue;
              }

              // Encrypt the value
              const encryptedValue = this.phiManager.encryptField(record.value);

              // Update record
              await tx.execute(
                `UPDATE ${table} SET ${field} = ?, updated_at = datetime('now') WHERE ${idColumn} = ?`,
                [encryptedValue, record.id]
              );

              encrypted++;
              if (verbose) {
                console.log(`[PHIDataMigration] Encrypted ${table}.${field} id=${record.id}`);
              }
            } catch (error) {
              errorCount++;
              errors.push({
                table,
                field,
                recordId: record.id,
                error: String(error),
              });
              console.error(`[PHIDataMigration] Error encrypting ${table}.${field} id=${record.id}:`, error);
            }
          }
        });
      } else {
        // Dry run - just count
        for (const record of records) {
          if (this.isAlreadyEncrypted(record.value)) {
            skipped++;
          } else {
            encrypted++;
          }
        }
      }

      processed += records.length;
      offset += batchSize;

      // Report progress
      const progress: IMigrationProgress = {
        table,
        field,
        processed,
        total: totalRecords,
        encrypted,
        skipped,
        errors: errorCount,
        percentComplete: Math.round((processed / totalRecords) * 100),
      };

      if (onProgress) {
        onProgress(progress);
      }

      if (verbose || processed % (batchSize * 10) === 0) {
        console.log(
          `[PHIDataMigration] ${table}.${field}: ${progress.percentComplete}% ` +
            `(${processed}/${totalRecords}, encrypted=${encrypted}, skipped=${skipped})`
        );
      }
    }

    const result: IFieldMigrationResult = {
      table,
      field,
      totalRecords,
      encryptedRecords: encrypted,
      skippedRecords: skipped,
      errorRecords: errorCount,
      durationMs: Date.now() - fieldStart,
    };

    console.log(
      `[PHIDataMigration] Completed ${table}.${field}: ` +
        `encrypted=${encrypted}, skipped=${skipped}, errors=${errorCount}, ` +
        `duration=${result.durationMs}ms`
    );

    return result;
  }

  /**
   * Check if a value is already encrypted
   */
  private isAlreadyEncrypted(value: string): boolean {
    if (!value.startsWith('{')) {
      return false;
    }

    try {
      const parsed = JSON.parse(value);
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'ciphertext' in parsed &&
        'iv' in parsed &&
        'authTag' in parsed
      );
    } catch {
      return false;
    }
  }

  /**
   * Get migration status without making changes
   */
  async getStatus(): Promise<{
    encryptionEnabled: boolean;
    fields: Array<{
      table: string;
      field: string;
      total: number;
      plaintext: number;
      encrypted: number;
    }>;
  }> {
    const encryptionEnabled = this.phiManager.isEncryptionEnabled();
    const fields: Array<{
      table: string;
      field: string;
      total: number;
      plaintext: number;
      encrypted: number;
    }> = [];

    for (const fieldDef of PHI_FIELDS_TO_MIGRATE) {
      const { table, field } = fieldDef;

      // Check if table exists
      const tableExists = await this.db.tableExists(table);
      if (!tableExists) {
        fields.push({ table, field, total: 0, plaintext: 0, encrypted: 0 });
        continue;
      }

      // Count total
      const totalResult = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${field} IS NOT NULL AND ${field} != ''`
      );
      const total = totalResult?.count || 0;

      if (total === 0) {
        fields.push({ table, field, total: 0, plaintext: 0, encrypted: 0 });
        continue;
      }

      // Count encrypted (values starting with { and containing ciphertext)
      // This is an approximation - we check for JSON-like pattern
      const encryptedResult = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table}
         WHERE ${field} IS NOT NULL
         AND ${field} != ''
         AND ${field} LIKE '{"ciphertext"%'`
      );
      const encrypted = encryptedResult?.count || 0;
      const plaintext = total - encrypted;

      fields.push({ table, field, total, plaintext, encrypted });
    }

    return { encryptionEnabled, fields };
  }
}

/**
 * Create PHI data migration service
 */
export function createPHIDataMigration(db: IDatabaseConnection): PHIDataMigration {
  return new PHIDataMigration(db);
}

/**
 * Run migration from command line
 *
 * Usage:
 * ```bash
 * npx ts-node -e "
 *   import { initializeDatabase } from './src/infrastructure/database';
 *   import { runPHIMigration } from './src/infrastructure/database/security/PHIDataMigration';
 *   const db = await initializeDatabase('./data/sleepcore.db');
 *   await runPHIMigration(db, { dryRun: true });
 * "
 * ```
 */
export async function runPHIMigration(
  db: IDatabaseConnection,
  config: IPHIMigrationConfig = {}
): Promise<IPHIMigrationResult> {
  const migration = new PHIDataMigration(db);

  // Show status first
  console.log('\n=== PHI Data Migration Status ===\n');
  const status = await migration.getStatus();

  console.log(`Encryption enabled: ${status.encryptionEnabled ? 'YES' : 'NO'}`);
  console.log('\nField status:');
  for (const field of status.fields) {
    console.log(
      `  ${field.table}.${field.field}: ` +
        `total=${field.total}, plaintext=${field.plaintext}, encrypted=${field.encrypted}`
    );
  }

  if (!status.encryptionEnabled) {
    console.error('\nERROR: Cannot run migration - encryption is not enabled.');
    console.error('Set ENCRYPTION_MASTER_KEY in .env and restart.');
    return {
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      dryRun: config.dryRun ?? false,
      fields: [],
      totalEncrypted: 0,
      totalSkipped: 0,
      totalErrors: 1,
      errors: [{ table: '', field: '', recordId: 0, error: 'Encryption not enabled' }],
    };
  }

  const plaintextCount = status.fields.reduce((sum, f) => sum + f.plaintext, 0);
  if (plaintextCount === 0) {
    console.log('\nNo plaintext data to migrate. All PHI fields are already encrypted.');
    return {
      success: true,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      dryRun: config.dryRun ?? false,
      fields: [],
      totalEncrypted: 0,
      totalSkipped: status.fields.reduce((sum, f) => sum + f.encrypted, 0),
      totalErrors: 0,
      errors: [],
    };
  }

  console.log(`\nPlaintext records to encrypt: ${plaintextCount}`);
  console.log(`\n=== Starting Migration (${config.dryRun ? 'DRY RUN' : 'LIVE'}) ===\n`);

  // Run migration
  const result = await migration.migrate(config);

  // Summary
  console.log('\n=== Migration Summary ===\n');
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Total encrypted: ${result.totalEncrypted}`);
  console.log(`Total skipped: ${result.totalSkipped}`);
  console.log(`Total errors: ${result.totalErrors}`);
  if (result.backupPath) {
    console.log(`Backup: ${result.backupPath}`);
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  ${err.table}.${err.field} id=${err.recordId}: ${err.error}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
  }

  return result;
}
