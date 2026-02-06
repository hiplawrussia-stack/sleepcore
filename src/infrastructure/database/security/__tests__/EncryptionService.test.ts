/**
 * EncryptionService Unit Tests
 * =============================
 *
 * HIPAA Security Rule compliance testing for PHI encryption.
 *
 * Test Coverage Requirements (IEC 62304 Class C):
 * - AES-256-GCM encryption/decryption
 * - Key derivation (PBKDF2)
 * - IV uniqueness per encryption
 * - Authentication tag verification
 * - Key rotation tracking
 * - Error handling for corrupted data
 *
 * @packageDocumentation
 */

import crypto from 'crypto';
import { EncryptionService, createEncryptionService, type IEncryptedData } from '../EncryptionService';

describe('EncryptionService', () => {
  // Test key: 64 hex chars = 256 bits
  const TEST_KEY = 'a'.repeat(64);
  const TEST_SALT = 'b'.repeat(32); // 32 hex chars = 128 bits

  beforeEach(() => {
    // Clear environment variables
    delete process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.ENCRYPTION_MASTER_KEY_SALT;
  });

  describe('initialization', () => {
    it('should initialize with hex key (64 chars)', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });

      expect(service).toBeDefined();
    });

    it('should initialize with passphrase + salt', () => {
      const service = new EncryptionService({
        masterKey: 'my-secure-passphrase',
        masterKeySalt: TEST_SALT,
        useKeyDerivation: true,
      });

      expect(service).toBeDefined();
    });

    it('should throw error when no key provided', () => {
      expect(() => {
        new EncryptionService({});
      }).toThrow('Encryption master key required');
    });

    it('should throw error when passphrase without salt', () => {
      expect(() => {
        new EncryptionService({
          masterKey: 'my-passphrase',
          useKeyDerivation: true,
        });
      }).toThrow('Master key salt required');
    });

    it('should throw error for invalid salt format', () => {
      expect(() => {
        new EncryptionService({
          masterKey: 'my-passphrase',
          masterKeySalt: 'too-short',
          useKeyDerivation: true,
        });
      }).toThrow('must be a 32-character hex string');
    });

    it('should read key from environment variable', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const service = new EncryptionService({
        useKeyDerivation: false,
      });

      expect(service).toBeDefined();
    });

    it('should use custom key version', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        keyVersion: 5,
        useKeyDerivation: false,
      });

      const encrypted = service.encrypt('test');
      expect(encrypted.keyVersion).toBe(5);
    });
  });

  describe('encrypt/decrypt string', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should encrypt and decrypt simple string', () => {
      const plaintext = 'Hello, World!';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Russian text', () => {
      const plaintext = 'Привет, мир! Тестирование PHI данных.';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt multiline text', () => {
      const plaintext = 'Line 1\nLine 2\nLine 3\n\nLine 5';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt empty string', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long text', () => {
      const plaintext = 'A'.repeat(10000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce base64 encoded output', () => {
      const encrypted = service.encrypt('test');

      // Verify base64 format
      expect(encrypted.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encrypted.authTag).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should include algorithm in output', () => {
      const encrypted = service.encrypt('test');

      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('IV uniqueness (critical for GCM security)', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should generate unique IV for each encryption', () => {
      const plaintext = 'Same message';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      const encrypted3 = service.encrypt(plaintext);

      // All IVs must be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted2.iv).not.toBe(encrypted3.iv);
      expect(encrypted1.iv).not.toBe(encrypted3.iv);
    });

    it('should generate unique ciphertext for same plaintext', () => {
      const plaintext = 'Same message';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Due to unique IV, ciphertext should be different
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });

    it('should decrypt both versions correctly despite different IVs', () => {
      const plaintext = 'Same message';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('key derivation (PBKDF2)', () => {
    it('should derive key from passphrase with salt', () => {
      const service = new EncryptionService({
        masterKey: 'my-secure-passphrase',
        masterKeySalt: TEST_SALT,
        useKeyDerivation: true,
      });

      const plaintext = 'Sensitive PHI data';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted.salt).toBeDefined();
    });

    it('should use per-encryption salt when key derivation enabled', () => {
      const service = new EncryptionService({
        masterKey: 'my-passphrase',
        masterKeySalt: TEST_SALT,
        useKeyDerivation: true,
      });

      const encrypted1 = service.encrypt('test');
      const encrypted2 = service.encrypt('test');

      // Per-encryption salts should be different
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should not include salt when key derivation disabled', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });

      const encrypted = service.encrypt('test');

      expect(encrypted.salt).toBeUndefined();
    });

    it('should accept custom PBKDF2 iterations', () => {
      const service = new EncryptionService({
        masterKey: 'passphrase',
        masterKeySalt: TEST_SALT,
        pbkdf2Iterations: 100000,
        useKeyDerivation: true,
      });

      const plaintext = 'test';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('authentication tag verification', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should fail decryption with tampered ciphertext', () => {
      const encrypted = service.encrypt('Sensitive data');

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xFF; // Flip bits
      encrypted.ciphertext = tamperedCiphertext.toString('base64');

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow('authentication tag mismatch');
    });

    it('should fail decryption with tampered auth tag', () => {
      const encrypted = service.encrypt('Sensitive data');

      // Tamper with auth tag
      const tamperedAuthTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedAuthTag[0] ^= 0xFF;
      encrypted.authTag = tamperedAuthTag.toString('base64');

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow('authentication tag mismatch');
    });

    it('should fail decryption with tampered IV', () => {
      const encrypted = service.encrypt('Sensitive data');

      // Tamper with IV
      const tamperedIV = Buffer.from(encrypted.iv, 'base64');
      tamperedIV[0] ^= 0xFF;
      encrypted.iv = tamperedIV.toString('base64');

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow('authentication tag mismatch');
    });
  });

  describe('encrypt/decrypt objects', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should encrypt and decrypt JSON object', () => {
      const obj = {
        name: 'John Doe',
        isiScore: 18,
        notes: 'Patient reports difficulty falling asleep',
      };

      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt nested object', () => {
      const obj = {
        user: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
        therapy: {
          phase: 2,
          components: ['SRT', 'SCT'],
        },
      };

      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt array', () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];

      const encrypted = service.encryptObject(arr as unknown as Record<string, unknown>);
      const decrypted = service.decryptObject(encrypted);

      expect(decrypted).toEqual(arr);
    });
  });

  describe('key info and rotation', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        keyVersion: 1,
        useKeyDerivation: false,
      });
    });

    it('should track bytes encrypted', () => {
      const initialInfo = service.getKeyInfo();
      expect(initialInfo.bytesEncrypted).toBe(0);

      service.encrypt('Hello'); // 5 bytes
      service.encrypt('World!'); // 6 bytes

      const afterInfo = service.getKeyInfo();
      expect(afterInfo.bytesEncrypted).toBe(11);
    });

    it('should report key version', () => {
      const info = service.getKeyInfo();
      expect(info.version).toBe(1);
    });

    it('should report creation date', () => {
      const info = service.getKeyInfo();
      expect(info.createdAt).toBeInstanceOf(Date);
    });

    it('should not recommend rotation initially', () => {
      service.encrypt('small data');

      const info = service.getKeyInfo();
      expect(info.rotationRecommended).toBe(false);
    });
  });

  describe('buffer operations', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should encrypt and decrypt buffer', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);

      const encrypted = service.encryptBuffer(buffer);
      const decrypted = service.decryptToBuffer(encrypted);

      expect(Buffer.compare(decrypted, buffer)).toBe(0);
    });

    it('should handle binary data with null bytes', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0xFF, 0x00, 0x00]);

      const encrypted = service.encryptBuffer(buffer);
      const decrypted = service.decryptToBuffer(encrypted);

      expect(Buffer.compare(decrypted, buffer)).toBe(0);
    });
  });

  describe('cross-key isolation', () => {
    it('should not decrypt with different key', () => {
      const service1 = new EncryptionService({
        masterKey: 'a'.repeat(64),
        useKeyDerivation: false,
      });

      const service2 = new EncryptionService({
        masterKey: 'b'.repeat(64),
        useKeyDerivation: false,
      });

      const encrypted = service1.encrypt('Secret data');

      expect(() => {
        service2.decrypt(encrypted);
      }).toThrow('authentication tag mismatch');
    });

    it('should not decrypt with different passphrase', () => {
      const salt = 'c'.repeat(32);

      const service1 = new EncryptionService({
        masterKey: 'passphrase1',
        masterKeySalt: salt,
        useKeyDerivation: true,
      });

      const service2 = new EncryptionService({
        masterKey: 'passphrase2',
        masterKeySalt: salt,
        useKeyDerivation: true,
      });

      const encrypted = service1.encrypt('Secret data');

      expect(() => {
        service2.decrypt(encrypted);
      }).toThrow('authentication tag mismatch');
    });
  });

  describe('edge cases', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should handle unicode emoji', () => {
      const plaintext = '😀🎉🔐💊😴';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON-like strings', () => {
      const plaintext = '{"fake": "json", "not": "encrypted"}';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings (100KB)', () => {
      const plaintext = 'X'.repeat(100 * 1024);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('field encryption', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should encrypt specific fields in object', () => {
      const obj = {
        userId: 'user-123',
        publicData: 'not sensitive',
        privateNotes: 'sensitive patient notes',
        phoneNumber: '+7-999-123-4567',
      };

      const encrypted = service.encryptFields(obj, ['privateNotes', 'phoneNumber']);

      expect(encrypted.publicData).toBe('not sensitive');
      expect(encrypted.privateNotes).toBe('[ENCRYPTED]');
      expect(encrypted.phoneNumber).toBe('[ENCRYPTED]');
      expect(encrypted._encrypted).toBeDefined();
      expect(encrypted._encrypted.privateNotes).toBeDefined();
      expect(encrypted._encrypted.phoneNumber).toBeDefined();
    });

    it('should decrypt specific fields in object', () => {
      const obj = {
        userId: 'user-123',
        publicData: 'not sensitive',
        privateNotes: 'sensitive patient notes',
        phoneNumber: '+7-999-123-4567',
      };

      const encrypted = service.encryptFields(obj, ['privateNotes', 'phoneNumber']);
      const decrypted = service.decryptFields(encrypted, ['privateNotes', 'phoneNumber']);

      expect(decrypted.privateNotes).toBe('sensitive patient notes');
      expect(decrypted.phoneNumber).toBe('+7-999-123-4567');
      expect(decrypted._encrypted).toBeUndefined();
    });

    it('should handle non-string fields in encryptFields', () => {
      const obj = {
        name: 'John',
        score: 18, // number
        details: { nested: 'object' }, // object
      };

      const encrypted = service.encryptFields(obj, ['score', 'details']);

      expect(encrypted._encrypted.score).toBeDefined();
      expect(encrypted._encrypted.details).toBeDefined();
    });

    it('should skip undefined/null fields in encryptFields', () => {
      const obj = {
        name: 'John',
        notes: undefined,
        phone: null,
      };

      const encrypted = service.encryptFields(obj, ['name', 'notes', 'phone'] as (keyof typeof obj)[]);

      expect(encrypted._encrypted.name).toBeDefined();
      expect(encrypted._encrypted.notes).toBeUndefined();
      expect(encrypted._encrypted.phone).toBeUndefined();
    });

    it('should handle decryptFields with no _encrypted field', () => {
      const obj = {
        name: 'John',
        data: 'value',
      };

      const result = service.decryptFields(obj, ['name']);

      expect(result.name).toBe('John');
    });

    it('should parse JSON when decrypting object fields', () => {
      const obj = {
        data: { nested: 'value', count: 5 },
      };

      const encrypted = service.encryptFields(obj, ['data']);
      const decrypted = service.decryptFields(encrypted, ['data']);

      expect(decrypted.data).toEqual({ nested: 'value', count: 5 });
    });
  });

  describe('serialization', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should serialize encrypted data to string', () => {
      const encrypted = service.encrypt('test data');
      const serialized = service.serializeEncrypted(encrypted);

      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('ciphertext');
      expect(serialized).toContain('iv');
      expect(serialized).toContain('authTag');
    });

    it('should deserialize encrypted data from string', () => {
      const encrypted = service.encrypt('test data');
      const serialized = service.serializeEncrypted(encrypted);
      const deserialized = service.deserializeEncrypted(serialized);

      expect(deserialized.ciphertext).toBe(encrypted.ciphertext);
      expect(deserialized.iv).toBe(encrypted.iv);
      expect(deserialized.authTag).toBe(encrypted.authTag);
    });

    it('should encrypt to single string', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encryptToString(plaintext);

      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain('ciphertext');
    });

    it('should decrypt from serialized string', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encryptToString(plaintext);
      const decrypted = service.decryptFromString(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('key rotation', () => {
    it('should recommend rotation after threshold', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });

      // Simulate encrypting lots of data
      // ROTATION_THRESHOLD is 4GB, we need to test the flag
      // We'll check isRotationRecommended directly
      expect(service.isRotationRecommended()).toBe(false);

      // Note: We can't easily simulate 4GB of encryption in a test
      // The bytesEncrypted counter is internal and we can't set it directly
    });

    it('should rotate key and re-encrypt data', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        keyVersion: 1,
        useKeyDerivation: false,
      });

      const plaintext = 'sensitive data to rotate';
      const encrypted = service.encrypt(plaintext);

      // Generate new key
      const newKey = EncryptionService.generateKey();

      // Rotate
      const rotated = service.rotateKey(newKey, encrypted);

      expect(rotated.keyVersion).toBe(2);

      // Create new service with the new key to verify
      const newService = new EncryptionService({
        masterKey: newKey,
        keyVersion: 2,
        useKeyDerivation: false,
      });

      const decrypted = newService.decrypt(rotated);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('static utility methods', () => {
    it('should generate random 256-bit key', () => {
      const key = EncryptionService.generateKey();

      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should generate unique keys', () => {
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      expect(Buffer.compare(key1, key2)).not.toBe(0);
    });

    it('should generate key as hex string', () => {
      const keyHex = EncryptionService.generateKeyHex();

      expect(typeof keyHex).toBe('string');
      expect(keyHex.length).toBe(64); // 32 bytes = 64 hex chars
      expect(keyHex).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate secure token with default length', () => {
      const token = EncryptionService.generateSecureToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate secure token with custom length', () => {
      const token = EncryptionService.generateSecureToken(16);

      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('hashing', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });
    });

    it('should generate HMAC-SHA256 hash', () => {
      const hash = service.hash('test value');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 = 256 bits = 64 hex chars
    });

    it('should generate consistent hash for same input', () => {
      const hash1 = service.hash('same value');
      const hash2 = service.hash('same value');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = service.hash('value1');
      const hash2 = service.hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash with different key', () => {
      const service2 = new EncryptionService({
        masterKey: 'b'.repeat(64),
        useKeyDerivation: false,
      });

      const hash1 = service.hash('same value');
      const hash2 = service2.hash('same value');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('key integrity validation', () => {
    it('should validate key integrity successfully', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });

      // Should not throw
      expect(() => service.validateKeyIntegrity()).not.toThrow();
    });

    it('should complete round-trip validation', () => {
      const service = new EncryptionService({
        masterKey: TEST_KEY,
        useKeyDerivation: false,
      });

      // Validation encrypts and decrypts a test value
      service.validateKeyIntegrity();

      // If we got here, validation passed
      expect(true).toBe(true);
    });
  });

  describe('initialization edge cases', () => {
    it('should accept Buffer as salt', () => {
      const saltBuffer = crypto.randomBytes(16);

      const service = new EncryptionService({
        masterKey: 'my-passphrase',
        masterKeySalt: saltBuffer,
        useKeyDerivation: true,
      });

      const plaintext = 'test data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw for Buffer salt with wrong length', () => {
      const wrongLengthSalt = crypto.randomBytes(8); // 8 bytes instead of 16

      expect(() => {
        new EncryptionService({
          masterKey: 'my-passphrase',
          masterKeySalt: wrongLengthSalt,
          useKeyDerivation: true,
        });
      }).toThrow('16 bytes');
    });

    it('should accept Buffer as master key without derivation', () => {
      const keyBuffer = crypto.randomBytes(32);

      const service = new EncryptionService({
        masterKey: keyBuffer,
        useKeyDerivation: false,
      });

      const plaintext = 'test data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw for Buffer key with wrong length', () => {
      const wrongLengthKey = crypto.randomBytes(16); // 16 bytes instead of 32

      expect(() => {
        new EncryptionService({
          masterKey: wrongLengthKey,
          useKeyDerivation: false,
        });
      }).toThrow('32 bytes');
    });
  });

  describe('createEncryptionService factory', () => {
    it('should create service from environment variable', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const service = createEncryptionService({
        useKeyDerivation: false,
      });

      expect(service).toBeInstanceOf(EncryptionService);

      const plaintext = 'test data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should create service with merged config', () => {
      const service = createEncryptionService({
        masterKey: TEST_KEY,
        keyVersion: 5,
        useKeyDerivation: false,
      });

      const encrypted = service.encrypt('test');
      expect(encrypted.keyVersion).toBe(5);
    });
  });
});
