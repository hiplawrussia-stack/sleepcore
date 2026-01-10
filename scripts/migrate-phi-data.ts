#!/usr/bin/env npx ts-node
/**
 * PHI Data Migration Script
 * =========================
 *
 * Migrates existing plaintext PHI data to encrypted format.
 *
 * Usage:
 *   npx ts-node scripts/migrate-phi-data.ts [options]
 *
 * Options:
 *   --dry-run       Preview changes without applying (default)
 *   --live          Apply changes (requires confirmation)
 *   --no-backup     Skip backup creation (not recommended)
 *   --batch-size=N  Records per batch (default: 100)
 *   --verbose       Show detailed progress
 *   --status        Only show current status
 *
 * Examples:
 *   # Check current status
 *   npx ts-node scripts/migrate-phi-data.ts --status
 *
 *   # Dry run (preview)
 *   npx ts-node scripts/migrate-phi-data.ts --dry-run
 *
 *   # Live migration with backup
 *   npx ts-node scripts/migrate-phi-data.ts --live
 *
 * Environment:
 *   ENCRYPTION_MASTER_KEY - Required for live migration
 *   DATABASE_PATH         - SQLite database path (default: ./data/sleepcore.db)
 *
 * @packageDocumentation
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: !args.includes('--live'),
  noBackup: args.includes('--no-backup'),
  verbose: args.includes('--verbose'),
  statusOnly: args.includes('--status'),
  batchSize: 100,
};

// Parse batch size
const batchArg = args.find((a) => a.startsWith('--batch-size='));
if (batchArg) {
  options.batchSize = parseInt(batchArg.split('=')[1], 10) || 100;
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  SleepCore PHI Data Migration Tool');
  console.log('========================================\n');

  // Check environment
  const dbPath = process.env.DATABASE_PATH || './data/sleepcore.db';
  const hasKey = !!process.env.ENCRYPTION_MASTER_KEY;

  console.log('Configuration:');
  console.log(`  Database: ${dbPath}`);
  console.log(`  Encryption key: ${hasKey ? 'SET' : 'NOT SET'}`);
  console.log(`  Mode: ${options.statusOnly ? 'STATUS' : options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  Create backup: ${!options.noBackup}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log('');

  if (!hasKey && !options.statusOnly) {
    console.error('ERROR: ENCRYPTION_MASTER_KEY is not set in environment.');
    console.error('');
    console.error('To generate a key:');
    console.error('  openssl rand -hex 32');
    console.error('');
    console.error('Add to .env:');
    console.error('  ENCRYPTION_MASTER_KEY=<your-64-char-hex-key>');
    console.error('');
    process.exit(1);
  }

  // Dynamic imports to ensure env is loaded first
  const { initializeDatabase } = await import('../src/infrastructure/database');
  const { PHIDataMigration } = await import('../src/infrastructure/database/security/PHIDataMigration');

  // Initialize database
  console.log('Connecting to database...');
  const db = await initializeDatabase(dbPath, { runMigrations: true });

  try {
    const migration = new PHIDataMigration(db);

    // Show status
    console.log('\n--- Current Status ---\n');
    const status = await migration.getStatus();

    console.log(`Encryption enabled: ${status.encryptionEnabled ? 'YES' : 'NO'}`);
    console.log('');
    console.log('Field Status:');
    console.log('─'.repeat(70));
    console.log(
      '  Table                      Field            Total   Plain   Encrypted'
    );
    console.log('─'.repeat(70));

    for (const field of status.fields) {
      const tablePadded = field.table.padEnd(25);
      const fieldPadded = field.field.padEnd(15);
      const totalPadded = String(field.total).padStart(6);
      const plainPadded = String(field.plaintext).padStart(6);
      const encPadded = String(field.encrypted).padStart(10);
      console.log(`  ${tablePadded} ${fieldPadded} ${totalPadded} ${plainPadded} ${encPadded}`);
    }
    console.log('─'.repeat(70));

    const totalPlaintext = status.fields.reduce((sum, f) => sum + f.plaintext, 0);
    const totalEncrypted = status.fields.reduce((sum, f) => sum + f.encrypted, 0);
    console.log(`  ${'TOTAL'.padEnd(25)} ${''.padEnd(15)} ${String(totalPlaintext + totalEncrypted).padStart(6)} ${String(totalPlaintext).padStart(6)} ${String(totalEncrypted).padStart(10)}`);
    console.log('');

    // Status only mode
    if (options.statusOnly) {
      if (totalPlaintext > 0) {
        console.log(`\nAction required: ${totalPlaintext} plaintext records need encryption.`);
        console.log('Run with --dry-run to preview, or --live to encrypt.\n');
      } else {
        console.log('\nAll PHI data is encrypted. No action required.\n');
      }
      await db.close();
      return;
    }

    // No plaintext data
    if (totalPlaintext === 0) {
      console.log('No plaintext data to migrate. All PHI fields are already encrypted.\n');
      await db.close();
      return;
    }

    // Confirm live migration
    if (!options.dryRun) {
      console.log('\n⚠️  WARNING: LIVE MIGRATION MODE ⚠️\n');
      console.log(`This will encrypt ${totalPlaintext} plaintext records.`);
      console.log('A backup will be created before migration (unless --no-backup is set).');
      console.log('');

      const confirmed = await confirm('Are you sure you want to proceed?');
      if (!confirmed) {
        console.log('\nMigration cancelled.\n');
        await db.close();
        return;
      }
      console.log('');
    }

    // Run migration
    console.log(`\n--- Starting Migration (${options.dryRun ? 'DRY RUN' : 'LIVE'}) ---\n`);

    const result = await migration.migrate({
      dryRun: options.dryRun,
      createBackup: !options.noBackup && !options.dryRun,
      backupDir: path.join(path.dirname(dbPath), 'backups'),
      batchSize: options.batchSize,
      verbose: options.verbose,
      onProgress: (progress) => {
        if (!options.verbose) {
          process.stdout.write(
            `\r  ${progress.table}.${progress.field}: ${progress.percentComplete}% ` +
              `(${progress.processed}/${progress.total})`
          );
        }
      },
    });

    // Print final summary
    console.log('\n\n--- Migration Summary ---\n');
    console.log(`  Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`  Mode: ${result.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`  Duration: ${result.durationMs}ms`);
    console.log(`  Records encrypted: ${result.totalEncrypted}`);
    console.log(`  Records skipped: ${result.totalSkipped}`);
    console.log(`  Errors: ${result.totalErrors}`);
    if (result.backupPath) {
      console.log(`  Backup: ${result.backupPath}`);
    }

    if (result.errors.length > 0) {
      console.log('\n  Errors:');
      for (const err of result.errors.slice(0, 5)) {
        console.log(`    - ${err.table}.${err.field} id=${err.recordId}: ${err.error}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('');

    if (result.dryRun && result.totalEncrypted > 0) {
      console.log('To apply these changes, run with --live flag.\n');
    }

    await db.close();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    await db.close();
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
