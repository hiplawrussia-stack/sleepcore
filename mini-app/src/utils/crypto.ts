/**
 * Crypto Utilities - Client-Side Encryption for PII Defense-in-Depth
 * ===================================================================
 * Uses Web Crypto API with AES-256-GCM for localStorage encryption.
 *
 * Security Notes:
 * - This is defense-in-depth, NOT a security guarantee
 * - Frontend encryption key is derivable, determined attacker can extract
 * - Primary purpose: prevent casual inspection of PII in DevTools
 * - Sensitive data (tokens) should remain in memory only
 *
 * Algorithm: AES-256-GCM (authenticated encryption)
 * - Provides confidentiality + integrity
 * - Recommended by NIST and CLAUDE.md §2.2
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 * @see CLAUDE.md §2.2 - AES-256-GCM requirement
 * @module @sleepcore/mini-app/utils
 */

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
 * @param plaintext - Data to encrypt
 * @returns Base64-encoded ciphertext with IV prefix
 */
export async function encrypt(plaintext: string): Promise<string> {
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
    console.error('[Crypto] Encryption failed:', error);
    // Fallback to plaintext if crypto fails (e.g., insecure context)
    return plaintext;
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 *
 * @param ciphertext - Base64-encoded ciphertext with IV prefix
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await deriveKey();

    // Decode base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

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
    console.error('[Crypto] Decryption failed:', error);
    // If decryption fails, assume it's unencrypted legacy data
    return ciphertext;
  }
}

// ========== Encrypted Storage Interface ==========

/**
 * Create encrypted storage interface for Zustand persist middleware
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
      } catch {
        // Return as-is if decryption fails (legacy unencrypted data)
        return value;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const encrypted = await encrypt(value);
        localStorage.setItem(name, encrypted);
      } catch {
        // Fallback to unencrypted if crypto fails
        localStorage.setItem(name, value);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      localStorage.removeItem(name);
    },
  };
}

/**
 * Check if Web Crypto API is available
 * Required for encryption to work
 */
export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}
