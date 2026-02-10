/**
 * Crypto Utilities Tests
 * ======================
 * Tests for AES-256-GCM localStorage encryption.
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
import { encrypt, decrypt, createEncryptedStorage, isCryptoAvailable } from '../../src/utils/crypto';

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
  });

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

    it('should fallback to plaintext if encryption fails', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      const plaintext = 'fallback test';
      const result = await encrypt(plaintext);

      expect(result).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext and return plaintext', async () => {
      const expectedText = 'decrypted text';
      const encoder = new TextEncoder();
      mockSubtle.decrypt.mockResolvedValue(encoder.encode(expectedText).buffer);

      // Create valid base64 with IV (12 bytes) + ciphertext
      const iv = new Uint8Array(12);
      const ciphertext = new Uint8Array([1, 2, 3, 4]);
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

      // Create valid input
      const combined = new Uint8Array(16);
      const base64Input = btoa(String.fromCharCode(...combined));

      await decrypt(base64Input);

      expect(mockSubtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should fallback to input if decryption fails', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const ciphertext = 'unencrypted data';
      const result = await decrypt(ciphertext);

      expect(result).toBe(ciphertext);
    });
  });

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

      // Mock encryption
      mockSubtle.encrypt.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

      // Mock decryption to return original data
      mockSubtle.decrypt.mockResolvedValue(encoder.encode(testData).buffer);

      await storage.setItem('test-key', testData);

      // Verify something was stored
      const stored = localStorage.getItem('test-key');
      expect(stored).not.toBeNull();

      const result = await storage.getItem('test-key');
      expect(result).toBe(testData);
    });

    it('should remove items', () => {
      localStorage.setItem('to-remove', 'value');

      storage.removeItem('to-remove');

      expect(localStorage.getItem('to-remove')).toBeNull();
    });
  });

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
});
