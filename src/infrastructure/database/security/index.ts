/**
 * Security Module - HIPAA/GDPR Compliant Data Protection
 * =======================================================
 *
 * Provides enterprise-grade security features for healthcare data:
 *
 * - **Encryption**: AES-256-GCM field-level encryption for PHI
 * - **Audit**: Immutable audit trail with 6-year retention
 * - **Backup**: Automated backup with cloud upload support
 *
 * @example
 * ```typescript
 * import {
 *   EncryptionService,
 *   AuditService,
 *   BackupService,
 *   PHI_FIELDS,
 * } from './infrastructure/database/security';
 *
 * // Field-level encryption
 * const encryption = new EncryptionService({ masterKey: process.env.ENCRYPTION_KEY });
 * const encrypted = encryption.encrypt('sensitive-data');
 * const decrypted = encryption.decrypt(encrypted);
 *
 * // Audit logging
 * const audit = new AuditService(db);
 * await audit.logCreate('user', 1, { email: 'test@example.com' }, { userId: adminId });
 *
 * // Automated backup
 * const backup = new BackupService({ backupDir: './backups' });
 * const result = await backup.backup(db);
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

// ============================================================================
// Encryption Service
// ============================================================================

export {
  EncryptionService,
  createEncryptionService,
  PHI_FIELDS,
  type IEncryptedData,
  type IEncryptionServiceConfig,
  type IKeyInfo,
  type PHIField,
} from './EncryptionService';

// ============================================================================
// Audit Service
// ============================================================================

export {
  AuditService,
  type AuditAction,
  type AuditEntityType,
  type IAuditEntry,
  type IAuditQueryFilters,
  type IAuditStats,
  type IAuditServiceConfig,
} from './AuditService';

// ============================================================================
// Backup Service
// ============================================================================

export {
  BackupService,
  createBackupService,
  type IBackupMetadata,
  type ICloudStorageConfig,
  type IBackupServiceConfig,
  type IBackupResult,
  type IRestoreResult,
} from './BackupService';
