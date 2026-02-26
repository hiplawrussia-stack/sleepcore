/**
 * Crypto Utilities Tests
 * ======================
 * Tests for AES-256-GCM localStorage encryption with fail-closed behavior.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Security-critical: PHI encryption at rest
 * - HIPAA §164.312(a)(2)(iv): Encryption standard verification
 * - GDPR Art. 32: Security of processing
 *
 * P1-2 Update:
 * - Tests for fail-closed behavior (no plaintext fallback)
 * - Custom error classes
 * - Legacy data migration support
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Web Crypto API
const mockSubtle = {
  importKey: vi.fn(),
  deriveKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
};

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: vi.fn((arr: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    return arr;
  }),
};

// Setup global crypto mock before importing module
Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Import after mocking
import {
  encrypt,
  decrypt,
  createEncryptedStorage,
  createEncryptedStorageWithResult,
  isCryptoAvailable,
  CryptoError,
  CryptoUnavailableError,
  EncryptionError,
  DecryptionError,
} from '../../src/utils/crypto';

describe('Crypto Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock key
    const mockKey = { type: 'secret' };
    mockSubtle.importKey.mockResolvedValue(mockKey);
    mockSubtle.deriveKey.mockResolvedValue(mockKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========== Error Classes ==========

  describe('Custom Error Classes', () => {
    it('CryptoError should be instance of Error', () => {
      const error = new CryptoError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('CryptoError');
    });

    it('CryptoUnavailableError should extend CryptoError', () => {
      const error = new CryptoUnavailableError();
      expect(error).toBeInstanceOf(CryptoError);
      expect(error.name).toBe('CryptoUnavailableError');
      expect(error.message).toContain('Web Crypto API');
    });

    it('EncryptionError should extend CryptoError', () => {
      const error = new EncryptionError('test message');
      expect(error).toBeInstanceOf(CryptoError);
      expect(error.name).toBe('EncryptionError');
      expect(error.message).toBe('test message');
    });

    it('DecryptionError should extend CryptoError', () => {
      const error = new DecryptionError();
      expect(error).toBeInstanceOf(CryptoError);
      expect(error.name).toBe('DecryptionError');
    });
  });

  // ========== isCryptoAvailable ==========

  describe('isCryptoAvailable', () => {
    it('should return true when Web Crypto API is available', () => {
      expect(isCryptoAvailable()).toBe(true);
    });

    it('should return false when crypto.subtle is undefined', () => {
      const originalSubtle = mockCrypto.subtle;
      (mockCrypto as { subtle: unknown }).subtle = undefined;

      expect(isCryptoAvailable()).toBe(false);

      mockCrypto.subtle = originalSubtle;
    });

    it('should return false when crypto is undefined', () => {
      const originalCrypto = globalThis.crypto;
      // @ts-expect-error - testing runtime behavior
      delete globalThis.crypto;

      expect(isCryptoAvailable()).toBe(false);

      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
      });
    });
  });

  // ========== encrypt ==========

  describe('encrypt', () => {
    it('should encrypt plaintext and return base64 string', async () => {
      const plaintext = 'test data';
      const encryptedBuffer = new Uint8Array([1, 2, 3, 4, 5]);

      mockSubtle.encrypt.mockResolvedValue(encryptedBuffer.buffer);

      const result = await encrypt(plaintext);

      expect(mockSubtle.importKey).toHaveBeenCalled();
      expect(mockSubtle.deriveKey).toHaveBeenCalled();
      expect(mockSubtle.encrypt).toHaveBeenCalled();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use AES-GCM algorithm', async () => {
      const plaintext = 'test';
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      await encrypt(plaintext);

      expect(mockSubtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should generate unique IV for each encryption', async () => {
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      await encrypt('test1');
      await encrypt('test2');

      // IV should be generated (getRandomValues called twice, once per encrypt)
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    // P1-2: Fail-closed tests
    it('should throw EncryptionError if encryption fails (NOT return plaintext)', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      const plaintext = 'sensitive data';

      await expect(encrypt(plaintext)).rejects.toThrow(EncryptionError);
      await expect(encrypt(plaintext)).rejects.toThrow('Encryption failed');
    });

    it('should throw CryptoUnavailableError if crypto not available', async () => {
      const originalSubtle = mockCrypto.subtle;
      (mockCrypto as { subtle: unknown }).subtle = undefined;

      await expect(encrypt('test')).rejects.toThrow(CryptoUnavailableError);

      mockCrypto.subtle = originalSubtle;
    });

    it('should never return plaintext on error', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Any error'));

      const plaintext = 'secret';

      try {
        const result = await encrypt(plaintext);
        // If we get here without throwing, the result should NOT be plaintext
        expect(result).not.toBe(plaintext);
      } catch (error) {
        // Expected - encryption should throw
        expect(error).toBeInstanceOf(EncryptionError);
      }
    });
  });

  // ========== decrypt ==========

  describe('decrypt', () => {
    it('should decrypt ciphertext and return plaintext', async () => {
      const expectedText = 'decrypted text';
      const encoder = new TextEncoder();
      mockSubtle.decrypt.mockResolvedValue(encoder.encode(expectedText).buffer);

      // Create valid base64 with IV (12 bytes) + ciphertext + auth tag (16 bytes min)
      const iv = new Uint8Array(12);
      const ciphertext = new Uint8Array(20); // Enough for auth tag
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv);
      combined.set(ciphertext, iv.length);
      const base64Input = btoa(String.fromCharCode(...combined));

      const result = await decrypt(base64Input);

      expect(result).toBe(expectedText);
    });

    it('should use AES-GCM algorithm', async () => {
      const encoder = new TextEncoder();
      mockSubtle.decrypt.mockResolvedValue(encoder.encode('test').buffer);

      // Create valid input (IV + ciphertext + auth tag)
      const combined = new Uint8Array(30);
      const base64Input = btoa(String.fromCharCode(...combined));

      await decrypt(base64Input);

      expect(mockSubtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should throw CryptoUnavailableError if crypto not available', async () => {
      const originalSubtle = mockCrypto.subtle;
      (mockCrypto as { subtle: unknown }).subtle = undefined;

      await expect(decrypt('test')).rejects.toThrow(CryptoUnavailableError);

      mockCrypto.subtle = originalSubtle;
    });

    it('should throw DecryptionError for empty input', async () => {
      await expect(decrypt('')).rejects.toThrow(DecryptionError);
      await expect(decrypt('   ')).rejects.toThrow(DecryptionError);
    });

    // P1-2: Legacy data support
    it('should return unencrypted JSON data as legacy (migration support)', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const legacyJson = '{"state":{"user":null},"version":1}';
      const result = await decrypt(legacyJson);

      // Should return as-is for migration
      expect(result).toBe(legacyJson);
    });

    it('should return non-base64 data as legacy', async () => {
      const nonBase64 = 'not-valid-base64!!!';
      const result = await decrypt(nonBase64);

      expect(result).toBe(nonBase64);
    });

    it('should return short data as legacy (too short for encrypted format)', async () => {
      // Less than MIN_CIPHERTEXT_LENGTH (12 + 1 + 16 = 29)
      const shortData = btoa('short');
      const result = await decrypt(shortData);

      expect(result).toBe(shortData);
    });

    it('should throw DecryptionError for corrupted encrypted data', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Invalid auth tag'));

      // Valid base64, valid length, but NOT JSON (so not legacy)
      const corruptedData = btoa('x'.repeat(50)); // Long enough, not JSON

      await expect(decrypt(corruptedData)).rejects.toThrow(DecryptionError);
    });
  });

  // ========== createEncryptedStorage ==========

  describe('createEncryptedStorage', () => {
    let storage: ReturnType<typeof createEncryptedStorage>;

    beforeEach(() => {
      storage = createEncryptedStorage();
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should return storage interface with getItem, setItem, removeItem', () => {
      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
    });

    it('should return null for non-existent items', async () => {
      const result = await storage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should store and retrieve encrypted data', async () => {
      const encoder = new TextEncoder();
      const testData = '{"test": "value"}';

      // Mock encryption - needs to be long enough for MIN_CIPHERTEXT_LENGTH (29 bytes)
      const mockCiphertext = new Uint8Array(50); // Long enough to pass validation
      mockSubtle.encrypt.mockResolvedValue(mockCiphertext.buffer);

      // Mock decryption to return original data
      mockSubtle.decrypt.mockResolvedValue(encoder.encode(testData).buffer);

      await storage.setItem('test-key', testData);

      // Verify something was stored
      const stored = localStorage.getItem('test-key');
      expect(stored).not.toBeNull();

      const result = await storage.getItem('test-key');
      expect(result).toBe(testData);
    });

    it('should remove items', async () => {
      localStorage.setItem('to-remove', 'value');

      await storage.removeItem('to-remove');

      expect(localStorage.getItem('to-remove')).toBeNull();
    });

    // P1-2: Fail-closed tests
    it('should throw if setItem encryption fails (NOT store plaintext)', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      await expect(storage.setItem('key', 'value')).rejects.toThrow();

      // Verify nothing was stored
      expect(localStorage.getItem('key')).toBeNull();
    });

    it('should return null if getItem decryption fails', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      // Store corrupted data (not JSON, so not treated as legacy)
      localStorage.setItem('corrupted', btoa('x'.repeat(50)));

      const result = await storage.getItem('corrupted');

      expect(result).toBeNull();
    });
  });

  // ========== createEncryptedStorageWithResult ==========

  describe('createEncryptedStorageWithResult', () => {
    let storage: ReturnType<typeof createEncryptedStorageWithResult>;

    beforeEach(() => {
      storage = createEncryptedStorageWithResult();
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should return success: true for successful operations', async () => {
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      const result = await storage.setItem('key', 'value');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return success: false with error message on failure', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Test error'));

      const result = await storage.setItem('key', 'value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should return null data for non-existent items', async () => {
      const result = await storage.getItem('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return error for failed getItem', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Decrypt error'));
      localStorage.setItem('key', btoa('x'.repeat(50)));

      const result = await storage.getItem('key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('error');
    });
  });

  // ========== Key Derivation ==========

  describe('key derivation', () => {
    it('should use PBKDF2 for key derivation', async () => {
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      await encrypt('test');

      expect(mockSubtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        expect.anything(),
        expect.objectContaining({
          name: 'AES-GCM',
          length: 256,
        }),
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ========== Security Tests (P1-2) ==========

  describe('Security: Fail-Closed Behavior', () => {
    it('should never expose plaintext on encrypt error', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Simulated failure'));

      const sensitiveData = 'PHI: patient diagnosis';

      try {
        await encrypt(sensitiveData);
        // Should not reach here
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EncryptionError);
        // Error message should NOT contain the sensitive data
        expect((error as Error).message).not.toContain(sensitiveData);
      }
    });

    it('should not store unencrypted data on crypto failure', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Crypto failure'));

      const storage = createEncryptedStorage();
      const sensitiveData = '{"ssn": "123-45-6789"}';

      try {
        await storage.setItem('sensitive', sensitiveData);
      } catch {
        // Expected
      }

      // Verify localStorage does NOT contain the sensitive data
      const stored = localStorage.getItem('sensitive');
      expect(stored).toBeNull();
    });

    it('should return null instead of corrupted data on decrypt failure', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Auth tag mismatch'));

      const storage = createEncryptedStorage();
      // Store something that looks encrypted but is corrupted
      // Must be at least MIN_CIPHERTEXT_LENGTH (29 bytes) after base64 decode
      // and NOT look like JSON (to avoid being treated as legacy)
      const corruptedData = 'x'.repeat(50); // Binary-looking data, long enough
      localStorage.setItem('corrupted', btoa(corruptedData));

      const result = await storage.getItem('corrupted');

      // Should return null, NOT the corrupted data
      expect(result).toBeNull();
    });
  });
});
