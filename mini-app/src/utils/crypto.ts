/**
 * Crypto Utilities - Client-Side Encryption for PII Defense-in-Depth
 * ===================================================================
 * Uses Web Crypto API with AES-256-GCM for localStorage encryption.
 *
 * Security Model (P1-2 Update):
 * - FAIL-CLOSED: Encryption errors throw, never fall back to plaintext
 * - Defense-in-depth, NOT a security guarantee
 * - Frontend encryption key is derivable, determined attacker can extract
 * - Primary purpose: prevent casual inspection of PII in DevTools
 * - Sensitive data (tokens) should remain in memory only
 *
 * Algorithm: AES-256-GCM (authenticated encryption)
 * - Provides confidentiality + integrity
 * - Recommended by NIST and CLAUDE.md §2.2
 *
 * References:
 * - OWASP A04:2025 Cryptographic Failures
 * - HIPAA §164.312(a)(2)(iv) - Encryption standard
 * - IEC 62304 - Fail-safe defaults
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 * @see CLAUDE.md §2.2 - AES-256-GCM requirement
 * @module @sleepcore/mini-app/utils
 */

// ========== Custom Errors ==========

/**
 * Base error for crypto operations
 */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Thrown when Web Crypto API is not available
 * (e.g., insecure context, unsupported browser)
 */
export class CryptoUnavailableError extends CryptoError {
  constructor(message = 'Web Crypto API not available. Requires secure context (HTTPS).') {
    super(message);
    this.name = 'CryptoUnavailableError';
  }
}

/**
 * Thrown when encryption fails
 */
export class EncryptionError extends CryptoError {
  constructor(message = 'Encryption failed') {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Thrown when decryption fails
 */
export class DecryptionError extends CryptoError {
  constructor(message = 'Decryption failed') {
    super(message);
    this.name = 'DecryptionError';
  }
}

// ========== Constants ==========

/**
 * Static entropy for key derivation
 * Combined with app identifier for unique key per app
 */
const APP_SALT = 'sleepcore-mini-app-v1';

/** AES-GCM IV length in bytes (96 bits recommended) */
const IV_LENGTH = 12;

/** AES key length in bits */
const KEY_LENGTH = 256;

/** Minimum ciphertext length (IV + at least 1 byte + auth tag) */
const MIN_CIPHERTEXT_LENGTH = IV_LENGTH + 1 + 16;

// ========== Availability Check ==========

/**
 * Check if Web Crypto API is available
 * Required for encryption to work (HTTPS/localhost only)
 */
export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}

/**
 * Assert that Web Crypto API is available
 * @throws {CryptoUnavailableError} if crypto is not available
 */
function assertCryptoAvailable(): void {
  if (!isCryptoAvailable()) {
    throw new CryptoUnavailableError();
  }
}

// ========== Key Derivation ==========

/**
 * Derive encryption key from static entropy
 *
 * Note: This is NOT cryptographically secure against determined attackers.
 * The key material is derivable from public information.
 * Purpose: defense-in-depth against casual inspection.
 */
async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Combine static salt with origin for some uniqueness
  const keyMaterial = encoder.encode(
    `${APP_SALT}:${window.location.origin}`
  );

  // Import as raw key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(APP_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ========== Encryption/Decryption ==========

/**
 * Encrypt string data using AES-256-GCM
 *
 * SECURITY: Fail-closed - throws on any error, never returns plaintext.
 *
 * @param plaintext - Data to encrypt
 * @returns Base64-encoded ciphertext with IV prefix
 * @throws {CryptoUnavailableError} if Web Crypto API not available
 * @throws {EncryptionError} if encryption fails
 */
export async function encrypt(plaintext: string): Promise<string> {
  // P1-2: Fail-closed - check availability first
  assertCryptoAvailable();

  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt with AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    // P1-2: Fail-closed - throw, never return plaintext
    console.error('[Crypto] Encryption failed:', error);
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Unknown encryption error'
    );
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 *
 * SECURITY: Fail-closed with legacy support.
 * - Throws on crypto errors
 * - Returns input if it appears to be unencrypted legacy data (with warning)
 *
 * @param ciphertext - Base64-encoded ciphertext with IV prefix
 * @returns Decrypted plaintext
 * @throws {CryptoUnavailableError} if Web Crypto API not available
 * @throws {DecryptionError} if decryption fails and data is not legacy
 */
export async function decrypt(ciphertext: string): Promise<string> {
  // P1-2: Fail-closed - check availability first
  assertCryptoAvailable();

  // Check for empty input
  if (!ciphertext || ciphertext.trim() === '') {
    throw new DecryptionError('Empty ciphertext');
  }

  try {
    const key = await deriveKey();

    // Decode base64
    let combined: Uint8Array;
    try {
      combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    } catch {
      // Not valid base64 - likely legacy unencrypted data
      console.warn('[Crypto] Data is not base64 encoded, treating as legacy unencrypted data');
      return ciphertext;
    }

    // Check minimum length (IV + ciphertext + auth tag)
    if (combined.length < MIN_CIPHERTEXT_LENGTH) {
      // Too short to be encrypted - likely legacy unencrypted data
      console.warn('[Crypto] Data too short for encrypted format, treating as legacy unencrypted data');
      return ciphertext;
    }

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(plaintext);
  } catch (error) {
    // Check if this might be legacy unencrypted JSON data
    if (isLikelyUnencryptedJson(ciphertext)) {
      console.warn('[Crypto] Decryption failed, data appears to be legacy unencrypted JSON');
      return ciphertext;
    }

    // P1-2: Fail-closed for encrypted data that fails to decrypt
    console.error('[Crypto] Decryption failed:', error);
    throw new DecryptionError(
      error instanceof Error ? error.message : 'Unknown decryption error'
    );
  }
}

/**
 * Check if string looks like unencrypted JSON (legacy data)
 * Used for migration from unencrypted to encrypted storage
 */
function isLikelyUnencryptedJson(data: string): boolean {
  const trimmed = data.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

// ========== Encrypted Storage Interface ==========

/**
 * Result type for storage operations
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create encrypted storage interface for Zustand persist middleware
 *
 * SECURITY (P1-2): Fail-closed approach
 * - setItem: Rejects if encryption fails (data not stored)
 * - getItem: Returns null if decryption fails (except legacy data)
 *
 * Usage with Zustand:
 * ```typescript
 * import { createEncryptedStorage } from '@/utils/crypto';
 *
 * const useStore = create(
 *   persist(
 *     (set) => ({ ... }),
 *     {
 *       name: 'store-name',
 *       storage: createEncryptedStorage(),
 *     }
 *   )
 * );
 * ```
 */
export function createEncryptedStorage() {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const value = localStorage.getItem(name);
      if (!value) return null;

      try {
        return await decrypt(value);
      } catch (error) {
        // P1-2: Log error but return null (fail-closed)
        // Don't expose potentially corrupted data
        console.error(`[EncryptedStorage] Failed to decrypt '${name}':`, error);
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      // P1-2: Fail-closed - if encryption fails, don't store at all
      try {
        const encrypted = await encrypt(value);
        localStorage.setItem(name, encrypted);
      } catch (error) {
        console.error(`[EncryptedStorage] Failed to encrypt '${name}':`, error);
        // Re-throw to signal failure to caller
        throw error;
      }
    },

    removeItem: async (name: string): Promise<void> => {
      localStorage.removeItem(name);
    },
  };
}

/**
 * Create encrypted storage with explicit error handling
 *
 * Alternative to createEncryptedStorage() that returns results
 * instead of throwing, for more granular error handling.
 */
export function createEncryptedStorageWithResult() {
  return {
    getItem: async (name: string): Promise<StorageResult<string | null>> => {
      const value = localStorage.getItem(name);
      if (!value) {
        return { success: true, data: null };
      }

      try {
        const decrypted = await decrypt(value);
        return { success: true, data: decrypted };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Decryption failed',
        };
      }
    },

    setItem: async (name: string, value: string): Promise<StorageResult<void>> => {
      try {
        const encrypted = await encrypt(value);
        localStorage.setItem(name, encrypted);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Encryption failed',
        };
      }
    },

    removeItem: async (name: string): Promise<StorageResult<void>> => {
      localStorage.removeItem(name);
      return { success: true };
    },
  };
}
