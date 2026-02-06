#!/usr/bin/env ts-node
/**
 * PHI Data Re-encryption Script
 * ==============================
 *
 * Re-encrypts all PHI data when ENCRYPTION_MASTER_KEY_SALT changes.
 *
 * SECURITY CONTEXT:
 * - When ENCRYPTION_MASTER_KEY_SALT changes, the derived master key changes
 * - All previously encrypted data becomes undecryptable with the new key
 * - This script performs a controlled key rotation:
 *   1. Decrypts data using OLD salt (old derived key)
 *   2. Re-encrypts data using NEW salt (new derived key)
 *
 * COMPLIANCE:
 * - NIST SP 800-57 Rev 5: Key management lifecycle
 * - HIPAA Security Rule: Encryption key management
 * - GDPR Article 32: Security of processing
 *
 * USAGE:
 *   # Dry run (no changes)
 *   OLD_SALT=abc123... NEW_SALT=def456... npx ts-node scripts/reencrypt-phi-data.ts --dry-run
 *
 *   # Live migration
 *   OLD_SALT=abc123... NEW_SALT=def456... npx ts-node scripts/reencrypt-phi-data.ts
 *
 * PREREQUISITES:
 * - Backup your database BEFORE running this script
 * - Set ENCRYPTION_MASTER_KEY in environment
 * - Set OLD_SALT and NEW_SALT environment variables
 *
 * @packageDocumentation
 */

import crypto from 'crypto';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 600000;

interface IEncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt?: string;
  keyVersion?: number;
  algorithm: string;
}

interface IPHIFieldDef {
  table: string;
  idColumn: string;
  field: string;
}

const PHI_FIELDS_TO_MIGRATE: IPHIFieldDef[] = [
  { table: 'users', idColumn: 'id', field: 'first_name' },
  { table: 'users', idColumn: 'id', field: 'last_name' },
  { table: 'sleep_diary_entries', idColumn: 'id', field: 'notes' },
  { table: 'therapy_sessions', idColumn: 'id', field: 'notes_json' },
];

// ============================================================================
// Re-encryption Service
// ============================================================================

class KeyDerivationHelper {
  private readonly masterKey: string;
  private derivedKey: Buffer | null = null;

  constructor(masterKey: string, salt: string) {
    this.masterKey = masterKey;

    if (!/^[0-9a-fA-F]{32}$/.test(salt)) {
      throw new Error('Salt must be a 32-character hex string (128 bits)');
    }

    const saltBuffer = Buffer.from(salt, 'hex');
    this.derivedKey = crypto.pbkdf2Sync(
      masterKey,
      saltBuffer,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  getDerivedKey(): Buffer {
    if (!this.derivedKey) {
      throw new Error('Key not derived');
    }
    return this.derivedKey;
  }

  decrypt(encrypted: IEncryptedData): string {
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    let decryptionKey: Buffer;
    if (encrypted.salt) {
      const perRecordSalt = Buffer.from(encrypted.salt, 'base64');
      decryptionKey = crypto.pbkdf2Sync(
        this.derivedKey!,
        perRecordSalt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256'
      );
    } else {
      decryptionKey = this.derivedKey!;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, decryptionKey, iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  encrypt(plaintext: string): IEncryptedData {
    const iv = crypto.randomBytes(12);
    const perRecordSalt = crypto.randomBytes(16);

    const encryptionKey = crypto.pbkdf2Sync(
      this.derivedKey!,
      perRecordSalt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: 16,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      salt: perRecordSalt.toString('base64'),
      keyVersion: 1,
      algorithm: ALGORITHM,
    };
  }
}

// ============================================================================
// Migration Logic
// ============================================================================

interface IMigrationResult {
  success: boolean;
  dryRun: boolean;
  totalProcessed: number;
  totalReencrypted: number;
  totalSkipped: number;
  totalErrors: number;
  errors: Array<{ table: string; field: string; recordId: number; error: string }>;
  durationMs: number;
  backupPath?: string;
}

async function runReencryption(options: {
  dryRun: boolean;
  verbose: boolean;
}): Promise<IMigrationResult> {
  const startTime = Date.now();
  const { dryRun, verbose } = options;

  // Validate environment
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  const oldSalt = process.env.OLD_SALT;
  const newSalt = process.env.NEW_SALT;
  const databasePath = process.env.DATABASE_PATH || './data/sleepcore.db';

  if (!masterKey) {
    console.error('ERROR: ENCRYPTION_MASTER_KEY is required');
    process.exit(1);
  }

  if (!oldSalt) {
    console.error('ERROR: OLD_SALT is required (the salt used to encrypt existing data)');
    process.exit(1);
  }

  if (!newSalt) {
    console.error('ERROR: NEW_SALT is required (the new salt to re-encrypt data with)');
    process.exit(1);
  }

  if (oldSalt === newSalt) {
    console.error('ERROR: OLD_SALT and NEW_SALT are the same. No re-encryption needed.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('PHI Data Re-encryption');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Database: ${databasePath}`);
  console.log(`OLD_SALT: ${oldSalt.substring(0, 8)}...`);
  console.log(`NEW_SALT: ${newSalt.substring(0, 8)}...`);
  console.log('='.repeat(60));

  // Initialize key helpers
  let oldKeyHelper: KeyDerivationHelper;
  let newKeyHelper: KeyDerivationHelper;

  try {
    oldKeyHelper = new KeyDerivationHelper(masterKey, oldSalt);
    newKeyHelper = new KeyDerivationHelper(masterKey, newSalt);
    console.log('[OK] Key derivation successful');
  } catch (error) {
    console.error('[FAIL] Key derivation failed:', error);
    process.exit(1);
  }

  // Dynamic import of database module
  const { initializeDatabase } = await import(
    path.join(process.cwd(), 'src/infrastructure/database')
  );

  const db = await initializeDatabase(databasePath);
  console.log('[OK] Database connected');

  // Create backup if not dry run
  let backupPath: string | undefined;
  if (!dryRun) {
    try {
      const { BackupService } = await import(
        path.join(process.cwd(), 'src/infrastructure/database/security/BackupService')
      );
      const backupService = new BackupService({ backupDir: './backups' });
      const backupResult = await backupService.backup(db);
      if (backupResult.success && backupResult.metadata) {
        backupPath = backupResult.metadata.backupPath;
        console.log(`[OK] Backup created: ${backupPath}`);
      }
    } catch (error) {
      console.error('[WARN] Backup failed, but continuing:', error);
    }
  }

  const result: IMigrationResult = {
    success: true,
    dryRun,
    totalProcessed: 0,
    totalReencrypted: 0,
    totalSkipped: 0,
    totalErrors: 0,
    errors: [],
    durationMs: 0,
    backupPath,
  };

  // Process each PHI field
  for (const fieldDef of PHI_FIELDS_TO_MIGRATE) {
    const { table, idColumn, field } = fieldDef;

    console.log(`\nProcessing ${table}.${field}...`);

    // Check if table exists
    const tableExists = await db.tableExists(table);
    if (!tableExists) {
      console.log(`  [SKIP] Table does not exist`);
      continue;
    }

    // Get all records with non-empty values
    const records = await db.query<{ id: number; value: string }>(
      `SELECT ${idColumn} as id, ${field} as value
       FROM ${table}
       WHERE ${field} IS NOT NULL AND ${field} != ''
       ORDER BY ${idColumn}`
    );

    console.log(`  Found ${records.length} records`);

    let processed = 0;
    let reencrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      processed++;

      // Check if value is encrypted
      if (!isEncrypted(record.value)) {
        skipped++;
        if (verbose) {
          console.log(`    [SKIP] id=${record.id}: plaintext (not encrypted)`);
        }
        continue;
      }

      try {
        // Parse encrypted data
        const encryptedData = JSON.parse(record.value) as IEncryptedData;

        // Decrypt with old key
        const plaintext = oldKeyHelper.decrypt(encryptedData);

        // Re-encrypt with new key
        const newEncryptedData = newKeyHelper.encrypt(plaintext);
        const newValue = JSON.stringify(newEncryptedData);

        // Update record (if not dry run)
        if (!dryRun) {
          await db.execute(
            `UPDATE ${table} SET ${field} = ?, updated_at = datetime('now') WHERE ${idColumn} = ?`,
            [newValue, record.id]
          );
        }

        reencrypted++;
        if (verbose) {
          console.log(`    [OK] id=${record.id}: re-encrypted`);
        }
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          table,
          field,
          recordId: record.id,
          error: errorMessage,
        });
        console.error(`    [ERROR] id=${record.id}: ${errorMessage}`);
      }
    }

    console.log(`  Completed: processed=${processed}, reencrypted=${reencrypted}, skipped=${skipped}, errors=${errors}`);

    result.totalProcessed += processed;
    result.totalReencrypted += reencrypted;
    result.totalSkipped += skipped;
    result.totalErrors += errors;
  }

  result.durationMs = Date.now() - startTime;
  result.success = result.totalErrors === 0;

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Total processed: ${result.totalProcessed}`);
  console.log(`Total re-encrypted: ${result.totalReencrypted}`);
  console.log(`Total skipped (plaintext): ${result.totalSkipped}`);
  console.log(`Total errors: ${result.totalErrors}`);
  if (backupPath) {
    console.log(`Backup: ${backupPath}`);
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

  if (!dryRun && result.success) {
    console.log('\n[IMPORTANT] Update your .env file:');
    console.log(`  ENCRYPTION_MASTER_KEY_SALT=${newSalt}`);
  }

  await db.close();
  return result;
}

function isEncrypted(value: string): boolean {
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

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
PHI Data Re-encryption Script

Re-encrypts all PHI data when changing ENCRYPTION_MASTER_KEY_SALT.

USAGE:
  OLD_SALT=<old> NEW_SALT=<new> npx ts-node scripts/reencrypt-phi-data.ts [OPTIONS]

OPTIONS:
  --dry-run    Preview changes without modifying database
  --verbose    Show detailed progress for each record
  --help       Show this help message

ENVIRONMENT VARIABLES:
  ENCRYPTION_MASTER_KEY  The master encryption key (required)
  OLD_SALT              The salt used to encrypt existing data (required)
  NEW_SALT              The new salt to re-encrypt data with (required)
  DATABASE_PATH         Path to database (default: ./data/sleepcore.db)

EXAMPLE:
  # First, do a dry run
  OLD_SALT=abc123... NEW_SALT=def456... npx ts-node scripts/reencrypt-phi-data.ts --dry-run

  # Then, run the actual migration
  OLD_SALT=abc123... NEW_SALT=def456... npx ts-node scripts/reencrypt-phi-data.ts

SECURITY NOTES:
  - Always backup your database before running this script
  - After successful migration, update ENCRYPTION_MASTER_KEY_SALT in .env
  - Keep OLD_SALT documented securely in case of rollback needs
`);
    process.exit(0);
  }

  try {
    const result = await runReencryption({ dryRun, verbose });
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
