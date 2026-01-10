/**
 * PHIEncryptionManager - Centralized PHI Field Encryption
 * ========================================================
 *
 * Provides a centralized manager for encrypting/decrypting PHI fields
 * in repository entities. Implements graceful degradation when
 * encryption key is not configured.
 *
 * Features:
 * - Singleton pattern for consistent encryption state
 * - Graceful degradation (works without key for development)
 * - Field-level encryption using EncryptionService
 * - Automatic detection of encrypted vs plaintext data
 *
 * PHI Fields (HIPAA/GDPR):
 * - User: firstName, lastName (email kept for lookups)
 * - SleepDiary: notes
 * - Assessment: responses (if contains free text)
 * - TherapySession: notes, recommendations
 *
 * Security Notes:
 * - Encrypted data is stored as JSON string with format:
 *   {"ciphertext":"...","iv":"...","authTag":"...","salt":"...","algorithm":"aes-256-gcm"}
 * - Plaintext is stored as regular string
 * - Detection: try JSON.parse, check for 'ciphertext' field
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import crypto from 'crypto';
import { EncryptionService, type IEncryptedData } from './EncryptionService';

/**
 * PHI field encryption status
 */
export interface IPHIEncryptionStatus {
  enabled: boolean;
  keyConfigured: boolean;
  keyVersion?: number;
  bytesEncrypted?: number;
  rotationRecommended?: boolean;
}

/**
 * Singleton manager for PHI field encryption
 */
export class PHIEncryptionManager {
  private static instance: PHIEncryptionManager | null = null;
  private encryptionService: EncryptionService | null = null;
  private readonly isEnabled: boolean;

  private constructor() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;

    if (masterKey) {
      try {
        this.encryptionService = new EncryptionService({
          masterKey,
          useKeyDerivation: true,
        });
        this.isEnabled = true;
        console.log('[PHIEncryptionManager] Initialized: PHI encryption ENABLED');
      } catch (error) {
        console.error('[PHIEncryptionManager] Failed to initialize:', error);
        this.isEnabled = false;
      }
    } else {
      this.isEnabled = false;
      console.warn(
        '[PHIEncryptionManager] WARNING: ENCRYPTION_MASTER_KEY not set. ' +
        'PHI data will be stored in PLAINTEXT. ' +
        'Set ENCRYPTION_MASTER_KEY in .env for production.'
      );
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PHIEncryptionManager {
    if (!PHIEncryptionManager.instance) {
      PHIEncryptionManager.instance = new PHIEncryptionManager();
    }
    return PHIEncryptionManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    PHIEncryptionManager.instance = null;
  }

  /**
   * Check if PHI encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get encryption status
   */
  getStatus(): IPHIEncryptionStatus {
    if (!this.isEnabled || !this.encryptionService) {
      return {
        enabled: false,
        keyConfigured: false,
      };
    }

    const keyInfo = this.encryptionService.getKeyInfo();
    return {
      enabled: true,
      keyConfigured: true,
      keyVersion: keyInfo.version,
      bytesEncrypted: keyInfo.bytesEncrypted,
      rotationRecommended: keyInfo.rotationRecommended,
    };
  }

  /**
   * Encrypt a PHI field value
   * Returns encrypted JSON string or original value if encryption disabled
   */
  encryptField(value: string | null | undefined): string | null | undefined {
    // Pass through null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Pass through empty strings
    if (value === '') {
      return value;
    }

    // If encryption not enabled, return as-is
    if (!this.isEnabled || !this.encryptionService) {
      return value;
    }

    // Encrypt and serialize to JSON string
    const encrypted = this.encryptionService.encrypt(value);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt a PHI field value
   * Handles both encrypted JSON and plaintext values
   */
  decryptField(value: string | null | undefined): string | null | undefined {
    // Pass through null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Pass through empty strings
    if (value === '') {
      return value;
    }

    // Try to detect if value is encrypted
    if (!this.isEncryptedValue(value)) {
      // Not encrypted, return as-is (migration case or encryption disabled)
      return value;
    }

    // If encryption not enabled but data is encrypted, we have a problem
    if (!this.isEnabled || !this.encryptionService) {
      console.error(
        '[PHIEncryptionManager] ERROR: Encrypted data found but encryption is not enabled. ' +
        'Set ENCRYPTION_MASTER_KEY to decrypt existing data.'
      );
      return '[ENCRYPTED - KEY REQUIRED]';
    }

    // Decrypt
    try {
      const encrypted = JSON.parse(value) as IEncryptedData;
      return this.encryptionService.decrypt(encrypted);
    } catch (error) {
      console.error('[PHIEncryptionManager] Decryption failed:', error);
      return '[DECRYPTION FAILED]';
    }
  }

  /**
   * Encrypt multiple PHI fields in an object
   */
  encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fieldNames: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const fieldName of fieldNames) {
      const value = obj[fieldName];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[fieldName as string] =
          this.encryptField(value);
      }
    }

    return result;
  }

  /**
   * Decrypt multiple PHI fields in an object
   */
  decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fieldNames: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const fieldName of fieldNames) {
      const value = obj[fieldName];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[fieldName as string] =
          this.decryptField(value);
      }
    }

    return result;
  }

  /**
   * Check if a value appears to be encrypted
   * Encrypted values are JSON objects with 'ciphertext' field
   */
  private isEncryptedValue(value: string): boolean {
    // Must start with { to potentially be JSON
    if (!value.startsWith('{')) {
      return false;
    }

    try {
      const parsed = JSON.parse(value);
      // Check for encrypted data structure
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
   * Create a hash of a value for searchable encrypted fields
   * Use this for fields that need to be looked up (e.g., email)
   */
  hashForLookup(value: string): string {
    if (!this.encryptionService) {
      // Without encryption service, use simple hash
      // This is NOT secure for production without proper key
      return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
    }

    return this.encryptionService.hash(value.toLowerCase());
  }

  /**
   * Get the underlying EncryptionService (for advanced use)
   */
  getEncryptionService(): EncryptionService | null {
    return this.encryptionService;
  }
}

/**
 * Get PHI encryption manager singleton
 */
export function getPHIEncryptionManager(): PHIEncryptionManager {
  return PHIEncryptionManager.getInstance();
}

/**
 * PHI field definitions for each entity type
 */
export const PHI_FIELD_DEFINITIONS = {
  user: {
    // Fields to encrypt (not searchable)
    encryptedFields: ['first_name', 'last_name'] as const,
    // Fields that need hash for lookup (email, phone)
    // Note: These would need additional hash columns in schema
    hashableFields: [] as const, // ['email'] - future enhancement
  },
  sleepDiary: {
    encryptedFields: ['notes'] as const,
    hashableFields: [] as const,
  },
  assessment: {
    // Assessment scores are not PHI by themselves
    // Only free-text responses would be PHI
    encryptedFields: [] as const,
    hashableFields: [] as const,
  },
  therapySession: {
    encryptedFields: ['notes', 'recommendations_json'] as const,
    hashableFields: [] as const,
  },
} as const;

export type PHIFieldDefinitions = typeof PHI_FIELD_DEFINITIONS;
