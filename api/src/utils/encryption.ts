/**
 * PHI Encryption Service for API
 * ===============================
 * AES-256-GCM encryption for Protected Health Information (PHI).
 *
 * Security Controls:
 * - HIPAA Security Rule compliance (Dec 2025 deadline)
 * - OWASP A02:2021 — Cryptographic Failures
 * - NIST SP 800-132 — Key derivation
 *
 * PHI Fields (wearable data):
 * - hrvJson — Heart rate variability data
 * - heartRateJson — Heart rate measurements
 * - stagesJson — Sleep stage data
 *
 * @see CLAUDE.md §2.2 — PHI encryption requirements
 * @packageDocumentation
 * @module api/utils
 */

import crypto from 'crypto';

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits

/**
 * PBKDF2 iterations per OWASP 2023/2025 recommendations
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const PBKDF2_ITERATIONS = 600000;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Encrypted data structure for database storage
 */
export interface IEncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag: string;
  /** Base64 encoded salt (for key derivation) */
  salt: string;
  /** Key version for rotation tracking */
  keyVersion: number;
  /** Algorithm identifier */
  algorithm: string;
}

/**
 * PHI Encryption Service configuration
 */
export interface IEncryptionConfig {
  /** Master key (64 hex chars = 256 bits) or passphrase */
  masterKey: string;
  /** Salt for key derivation (32 hex chars = 128 bits) */
  masterKeySalt: string;
  /** Current key version (for rotation) */
  keyVersion?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * PHI Encryption Service using AES-256-GCM
 */
export class PHIEncryptionService {
  private readonly masterKey: Buffer;
  private readonly keyVersion: number;
  private bytesEncrypted: number = 0;

  // Rotation threshold: ~4GB (conservative for GCM)
  private static readonly ROTATION_THRESHOLD = 4 * 1024 * 1024 * 1024;

  constructor(config: IEncryptionConfig) {
    this.keyVersion = config.keyVersion ?? 1;

    // Derive master key from passphrase + salt
    let salt: Buffer;
    if (/^[0-9a-fA-F]{32}$/.test(config.masterKeySalt)) {
      salt = Buffer.from(config.masterKeySalt, 'hex');
    } else {
      throw new Error(
        'Master key salt must be a 32-character hex string (128 bits). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"'
      );
    }

    // If master key is already 64 hex chars, use directly
    if (/^[0-9a-fA-F]{64}$/.test(config.masterKey)) {
      this.masterKey = Buffer.from(config.masterKey, 'hex');
    } else {
      // Derive key from passphrase
      this.masterKey = crypto.pbkdf2Sync(
        config.masterKey,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256'
      );
    }

    if (this.masterKey.length !== KEY_LENGTH) {
      throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`);
    }
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const plaintextBuffer = Buffer.from(plaintext, 'utf8');

    // Generate unique IV (critical for GCM!)
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive encryption key from master key + per-encryption salt
    const encryptionKey = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Track for rotation
    this.bytesEncrypted += plaintextBuffer.length;

    // Create encrypted data structure
    const encryptedData: IEncryptedData = {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyVersion: this.keyVersion,
      algorithm: ALGORITHM,
    };

    return JSON.stringify(encryptedData);
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encryptedString: string): string {
    if (!encryptedString) return encryptedString;

    // Try to parse as encrypted data
    let encrypted: IEncryptedData;
    try {
      encrypted = JSON.parse(encryptedString);
    } catch {
      // Not encrypted (legacy data), return as-is
      return encryptedString;
    }

    // Validate structure
    if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag || !encrypted.salt) {
      // Not our encrypted format, return as-is
      return encryptedString;
    }

    // Decode from base64
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const salt = Buffer.from(encrypted.salt, 'base64');

    // Derive decryption key
    const decryptionKey = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, decryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt
    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('PHI decryption failed: authentication tag mismatch or corrupted data');
    }
  }

  /**
   * Check if key rotation is recommended
   */
  isRotationRecommended(): boolean {
    return this.bytesEncrypted >= PHIEncryptionService.ROTATION_THRESHOLD;
  }

  /**
   * Validate key integrity with encrypt/decrypt round-trip test
   */
  validateKeyIntegrity(): void {
    const testPlaintext = 'sleepcore-api-key-integrity-check';
    const encrypted = this.encrypt(testPlaintext);
    const decrypted = this.decrypt(encrypted);
    if (decrypted !== testPlaintext) {
      throw new Error(
        'Encryption key integrity check failed: round-trip mismatch. ' +
        'This indicates a corrupted or incompatible encryption key.'
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let encryptionService: PHIEncryptionService | null = null;

/**
 * Get or create PHI encryption service from environment
 *
 * Required environment variables:
 * - ENCRYPTION_MASTER_KEY: Master key or passphrase
 * - ENCRYPTION_MASTER_KEY_SALT: 32 hex chars (128 bits)
 */
export function getEncryptionService(): PHIEncryptionService {
  if (encryptionService) {
    return encryptionService;
  }

  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  const masterKeySalt = process.env.ENCRYPTION_MASTER_KEY_SALT;

  if (!masterKey) {
    throw new Error(
      '[SECURITY] ENCRYPTION_MASTER_KEY environment variable is required for PHI encryption. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!masterKeySalt) {
    throw new Error(
      '[SECURITY] ENCRYPTION_MASTER_KEY_SALT environment variable is required. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"'
    );
  }

  encryptionService = new PHIEncryptionService({
    masterKey,
    masterKeySalt,
  });

  // Validate key on startup
  encryptionService.validateKeyIntegrity();

  return encryptionService;
}

/**
 * Check if PHI encryption is available (env vars configured)
 */
export function isEncryptionAvailable(): boolean {
  return Boolean(
    process.env.ENCRYPTION_MASTER_KEY &&
    process.env.ENCRYPTION_MASTER_KEY_SALT
  );
}

/**
 * PHI fields in wearable data that require encryption
 */
export const WEARABLE_PHI_FIELDS = [
  'hrvJson',
  'heartRateJson',
  'stagesJson',
] as const;

export type WearablePHIField = typeof WEARABLE_PHI_FIELDS[number];
