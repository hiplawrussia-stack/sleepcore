/**
 * EncryptionService - PHI Field-Level Encryption
 * ================================================
 *
 * Provides AES-256-GCM encryption for Protected Health Information (PHI).
 * Implements HIPAA Security Rule encryption requirements.
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV per encryption (critical for GCM security)
 * - Key derivation with PBKDF2 and salt
 * - Key rotation support
 * - AWS KMS integration ready
 *
 * Security Notes:
 * - Never reuse IV with same key (GCM requirement)
 * - Rotate keys after ~4GB of encrypted data
 * - Store keys separately from database
 * - Use HSM/KMS in production
 *
 * References:
 * - https://gist.github.com/AndiDittrich/4629e7db04819244e843
 * - https://dev.to/ruffiano/understanding-and-implementing-advanced-encryption-standard-aes-in-nodejs-with-typescript-57lh
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import crypto from 'crypto';

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // NIST recommended minimum

/**
 * Encrypted data structure
 */
export interface IEncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag: string;
  /** Base64 encoded salt (for key derivation) */
  salt?: string;
  /** Key version for rotation tracking */
  keyVersion?: number;
  /** Algorithm identifier */
  algorithm: string;
}

/**
 * Encryption service configuration
 */
export interface IEncryptionServiceConfig {
  /** Master encryption key (32 bytes for AES-256) */
  masterKey?: string | Buffer;

  /** Environment variable name for master key */
  masterKeyEnvVar?: string;

  /** Current key version (for rotation) */
  keyVersion?: number;

  /** Use key derivation (recommended for password-based keys) */
  useKeyDerivation?: boolean;

  /** PBKDF2 iterations (default: 100000) */
  pbkdf2Iterations?: number;
}

/**
 * Key info for rotation tracking
 */
export interface IKeyInfo {
  version: number;
  createdAt: Date;
  bytesEncrypted: number;
  rotationRecommended: boolean;
}

/**
 * PHI field encryption service using AES-256-GCM
 */
export class EncryptionService {
  private masterKey: Buffer;
  private keyVersion: number;
  private bytesEncrypted: number = 0;
  private readonly useKeyDerivation: boolean;
  private readonly pbkdf2Iterations: number;

  // Rotation threshold: ~4GB (conservative for GCM)
  private static readonly ROTATION_THRESHOLD = 4 * 1024 * 1024 * 1024;

  constructor(config: IEncryptionServiceConfig = {}) {
    this.keyVersion = config.keyVersion ?? 1;
    this.useKeyDerivation = config.useKeyDerivation ?? true;
    this.pbkdf2Iterations = config.pbkdf2Iterations ?? PBKDF2_ITERATIONS;

    // Get master key from config or environment
    const keySource = config.masterKey ??
      process.env[config.masterKeyEnvVar ?? 'ENCRYPTION_MASTER_KEY'];

    if (!keySource) {
      throw new Error(
        'Encryption master key required. Set ENCRYPTION_MASTER_KEY environment variable ' +
        'or provide masterKey in config.'
      );
    }

    // Convert to buffer
    if (typeof keySource === 'string') {
      // If hex string (64 chars for 256 bits)
      if (/^[0-9a-fA-F]{64}$/.test(keySource)) {
        this.masterKey = Buffer.from(keySource, 'hex');
      } else {
        // Derive key from passphrase using PBKDF2
        const salt = crypto.createHash('sha256').update('sleepcore-static-salt').digest();
        this.masterKey = crypto.pbkdf2Sync(
          keySource,
          salt,
          this.pbkdf2Iterations,
          KEY_LENGTH,
          'sha256'
        );
      }
    } else {
      this.masterKey = keySource;
    }

    if (this.masterKey.length !== KEY_LENGTH) {
      throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`);
    }

    console.log('[EncryptionService] Initialized with AES-256-GCM');
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): IEncryptedData {
    const plaintextBuffer = Buffer.from(plaintext, 'utf8');
    return this.encryptBuffer(plaintextBuffer);
  }

  /**
   * Encrypt a buffer
   */
  encryptBuffer(plaintext: Buffer): IEncryptedData {
    // Generate unique IV for each encryption (critical for GCM!)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Generate salt for key derivation
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive encryption key from master key + salt
    const encryptionKey = this.useKeyDerivation
      ? crypto.pbkdf2Sync(this.masterKey, salt, this.pbkdf2Iterations, KEY_LENGTH, 'sha256')
      : this.masterKey;

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Track bytes encrypted for rotation recommendation
    this.bytesEncrypted += plaintext.length;

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: this.useKeyDerivation ? salt.toString('base64') : undefined,
      keyVersion: this.keyVersion,
      algorithm: ALGORITHM,
    };
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encrypted: IEncryptedData): string {
    const decrypted = this.decryptToBuffer(encrypted);
    return decrypted.toString('utf8');
  }

  /**
   * Decrypt to buffer
   */
  decryptToBuffer(encrypted: IEncryptedData): Buffer {
    // Decode from base64
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    // Derive decryption key
    let decryptionKey: Buffer;
    if (encrypted.salt && this.useKeyDerivation) {
      const salt = Buffer.from(encrypted.salt, 'base64');
      decryptionKey = crypto.pbkdf2Sync(this.masterKey, salt, this.pbkdf2Iterations, KEY_LENGTH, 'sha256');
    } else {
      decryptionKey = this.masterKey;
    }

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
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: authentication tag mismatch or corrupted data');
    }
  }

  /**
   * Encrypt a JSON object
   */
  encryptObject<T extends Record<string, unknown>>(obj: T): IEncryptedData {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt to JSON object
   */
  decryptObject<T extends Record<string, unknown>>(encrypted: IEncryptedData): T {
    const json = this.decrypt(encrypted);
    return JSON.parse(json) as T;
  }

  /**
   * Encrypt specific fields in an object
   */
  encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T & { _encrypted: Record<string, IEncryptedData> } {
    const result = { ...obj } as T & { _encrypted: Record<string, IEncryptedData> };
    result._encrypted = {};

    for (const field of fieldsToEncrypt) {
      const value = obj[field];
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        result._encrypted[field as string] = this.encrypt(stringValue);
        // Replace original field with placeholder
        (result as Record<string, unknown>)[field as string] = '[ENCRYPTED]';
      }
    }

    return result;
  }

  /**
   * Decrypt specific fields in an object
   */
  decryptFields<T extends Record<string, unknown>>(
    obj: T & { _encrypted?: Record<string, IEncryptedData> },
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const result = { ...obj };
    const encrypted = obj._encrypted;

    if (!encrypted) {
      return result;
    }

    for (const field of fieldsToDecrypt) {
      const encryptedData = encrypted[field as string];
      if (encryptedData) {
        const decrypted = this.decrypt(encryptedData);
        // Try to parse as JSON, fallback to string
        try {
          (result as Record<string, unknown>)[field as string] = JSON.parse(decrypted);
        } catch {
          (result as Record<string, unknown>)[field as string] = decrypted;
        }
      }
    }

    // Remove _encrypted field
    delete (result as Record<string, unknown>)._encrypted;

    return result;
  }

  /**
   * Serialize encrypted data to string for database storage
   */
  serializeEncrypted(encrypted: IEncryptedData): string {
    return JSON.stringify(encrypted);
  }

  /**
   * Deserialize encrypted data from database storage
   */
  deserializeEncrypted(serialized: string): IEncryptedData {
    return JSON.parse(serialized) as IEncryptedData;
  }

  /**
   * Encrypt and serialize to single string
   */
  encryptToString(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return this.serializeEncrypted(encrypted);
  }

  /**
   * Decrypt from serialized string
   */
  decryptFromString(serialized: string): string {
    const encrypted = this.deserializeEncrypted(serialized);
    return this.decrypt(encrypted);
  }

  /**
   * Get key info for rotation tracking
   */
  getKeyInfo(): IKeyInfo {
    return {
      version: this.keyVersion,
      createdAt: new Date(), // Would track actual creation in production
      bytesEncrypted: this.bytesEncrypted,
      rotationRecommended: this.bytesEncrypted >= EncryptionService.ROTATION_THRESHOLD,
    };
  }

  /**
   * Check if key rotation is recommended
   */
  isRotationRecommended(): boolean {
    return this.bytesEncrypted >= EncryptionService.ROTATION_THRESHOLD;
  }

  /**
   * Rotate to new key (re-encrypt with new key)
   */
  rotateKey(newKey: Buffer, data: IEncryptedData): IEncryptedData {
    // Decrypt with current key
    const plaintext = this.decryptToBuffer(data);

    // Update to new key
    const oldKey = this.masterKey;
    this.masterKey = newKey;
    this.keyVersion++;
    this.bytesEncrypted = 0;

    // Re-encrypt with new key
    const reencrypted = this.encryptBuffer(plaintext);

    // Restore old key (caller should switch all data then update permanently)
    this.masterKey = oldKey;
    this.keyVersion--;

    return reencrypted;
  }

  /**
   * Generate a new random encryption key
   */
  static generateKey(): Buffer {
    return crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * Generate key as hex string
   */
  static generateKeyHex(): string {
    return EncryptionService.generateKey().toString('hex');
  }

  /**
   * Hash a value (for indexable encrypted fields)
   * Uses HMAC-SHA256 for deterministic but secure hashing
   */
  hash(value: string): string {
    const hmac = crypto.createHmac('sha256', this.masterKey);
    hmac.update(value);
    return hmac.digest('hex');
  }

  /**
   * Generate secure random string
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * Create encryption service from environment
 */
export function createEncryptionService(
  config?: Partial<IEncryptionServiceConfig>
): EncryptionService {
  return new EncryptionService({
    masterKeyEnvVar: 'ENCRYPTION_MASTER_KEY',
    ...config,
  });
}

/**
 * PHI fields that should be encrypted
 */
export const PHI_FIELDS = [
  // User identifiers
  'email',
  'firstName',
  'lastName',
  'phoneNumber',
  'address',
  'dateOfBirth',
  'ssn',
  'insuranceId',

  // Health data
  'diagnosis',
  'medications',
  'symptoms',
  'notes',
  'therapyNotes',

  // Sleep-specific PHI
  'sleepNotes',
  'dreamContent',
  'stressFactors',
] as const;

export type PHIField = typeof PHI_FIELDS[number];
