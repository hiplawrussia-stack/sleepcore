/**
 * PHIEncryptionManager Unit Tests
 * =================================
 *
 * Tests for centralized PHI field encryption manager.
 *
 * Test Coverage Requirements (IEC 62304 Class C):
 * - Singleton pattern
 * - Field-level encryption/decryption
 * - Graceful degradation without key
 * - Detection of encrypted vs plaintext
 * - Multi-field encryption
 * - Error handling
 *
 * HIPAA Compliance Testing:
 * - PHI data properly encrypted
 * - Encryption status reporting
 * - Key configuration validation
 *
 * @packageDocumentation
 */

import {
  PHIEncryptionManager,
  getPHIEncryptionManager,
  PHI_FIELD_DEFINITIONS,
  type IPHIEncryptionStatus
} from '../PHIEncryptionManager';

describe('PHIEncryptionManager', () => {
  // Test key (64 hex chars = 256 bits)
  const TEST_KEY = 'd'.repeat(64);
  const TEST_SALT = 'e'.repeat(32);

  beforeEach(() => {
    // Reset singleton and environment
    PHIEncryptionManager.resetInstance();
    delete process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.ENCRYPTION_MASTER_KEY_SALT;
  });

  afterEach(() => {
    PHIEncryptionManager.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const instance1 = PHIEncryptionManager.getInstance();
      const instance2 = PHIEncryptionManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const instance1 = PHIEncryptionManager.getInstance();
      PHIEncryptionManager.resetInstance();

      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const instance2 = PHIEncryptionManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('initialization with key', () => {
    it('should enable encryption when key is set', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const manager = PHIEncryptionManager.getInstance();

      expect(manager.isEncryptionEnabled()).toBe(true);
    });

    it('should report correct status when enabled', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const manager = PHIEncryptionManager.getInstance();
      const status = manager.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.keyConfigured).toBe(true);
      expect(status.keyVersion).toBeDefined();
    });
  });

  describe('initialization without key (graceful degradation)', () => {
    it('should disable encryption when key not set', () => {
      // No key in environment

      const manager = PHIEncryptionManager.getInstance();

      expect(manager.isEncryptionEnabled()).toBe(false);
    });

    it('should report disabled status', () => {
      const manager = PHIEncryptionManager.getInstance();
      const status = manager.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.keyConfigured).toBe(false);
    });

    it('should pass through values when disabled', () => {
      const manager = PHIEncryptionManager.getInstance();

      const original = 'Patient notes: difficulty sleeping';
      const result = manager.encryptField(original);

      expect(result).toBe(original);
    });
  });

  describe('encryptField', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should encrypt string to JSON format', () => {
      const value = 'Sensitive PHI data';

      const encrypted = manager.encryptField(value);

      expect(encrypted).not.toBe(value);
      expect(encrypted).toContain('"ciphertext"');
      expect(encrypted).toContain('"iv"');
      expect(encrypted).toContain('"authTag"');
    });

    it('should pass through null', () => {
      const result = manager.encryptField(null);

      expect(result).toBeNull();
    });

    it('should pass through undefined', () => {
      const result = manager.encryptField(undefined);

      expect(result).toBeUndefined();
    });

    it('should pass through empty string', () => {
      const result = manager.encryptField('');

      expect(result).toBe('');
    });

    it('should produce valid JSON output', () => {
      const encrypted = manager.encryptField('test data');

      expect(() => {
        JSON.parse(encrypted as string);
      }).not.toThrow();
    });
  });

  describe('decryptField', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should decrypt encrypted value', () => {
      const original = 'Patient diagnosis notes';

      const encrypted = manager.encryptField(original);
      const decrypted = manager.decryptField(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should pass through null', () => {
      const result = manager.decryptField(null);

      expect(result).toBeNull();
    });

    it('should pass through undefined', () => {
      const result = manager.decryptField(undefined);

      expect(result).toBeUndefined();
    });

    it('should pass through empty string', () => {
      const result = manager.decryptField('');

      expect(result).toBe('');
    });

    it('should pass through plaintext (migration case)', () => {
      const plaintext = 'Old data not yet encrypted';

      const result = manager.decryptField(plaintext);

      expect(result).toBe(plaintext);
    });

    it('should handle JSON-like but not encrypted values', () => {
      const value = '{"name": "John", "age": 30}';

      const result = manager.decryptField(value);

      // Should pass through as it lacks ciphertext/iv/authTag
      expect(result).toBe(value);
    });

    it('should return error placeholder for corrupted encrypted data', () => {
      const corruptedEncrypted = JSON.stringify({
        ciphertext: 'invalid-base64!!!',
        iv: 'also-invalid',
        authTag: 'broken',
        algorithm: 'aes-256-gcm',
      });

      const result = manager.decryptField(corruptedEncrypted);

      expect(result).toBe('[DECRYPTION FAILED]');
    });
  });

  describe('encryptField/decryptField roundtrip', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should handle Russian text', () => {
      const original = 'Пациент жалуется на бессонницу. Рекомендовано CBT-I.';

      const encrypted = manager.encryptField(original);
      const decrypted = manager.decryptField(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle multiline notes', () => {
      const original = `Diary Entry:
Date: 2026-01-15
Bedtime: 23:30
Wake time: 06:45
Quality: 3/5
Notes: Woke up twice during the night.`;

      const encrypted = manager.encryptField(original);
      const decrypted = manager.decryptField(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle special characters', () => {
      const original = "Patient's notes: <sensitive> & \"private\" data!";

      const encrypted = manager.encryptField(original);
      const decrypted = manager.decryptField(encrypted);

      expect(decrypted).toBe(original);
    });
  });

  describe('encryptFields (batch)', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should encrypt specified fields in object', () => {
      const entity = {
        id: 123,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        notes: 'Sensitive therapy notes',
      };

      const encrypted = manager.encryptFields(entity, ['firstName', 'lastName', 'notes']);

      // PHI fields encrypted
      expect(encrypted.firstName).toContain('"ciphertext"');
      expect(encrypted.lastName).toContain('"ciphertext"');
      expect(encrypted.notes).toContain('"ciphertext"');

      // Non-PHI fields unchanged
      expect(encrypted.id).toBe(123);
      expect(encrypted.email).toBe('jane@example.com');
    });

    it('should skip non-string fields', () => {
      const entity = {
        id: 123,
        score: 18,
        notes: 'Some notes',
      };

      const encrypted = manager.encryptFields(entity, ['id', 'score', 'notes'] as Array<keyof typeof entity>);

      // Non-string fields unchanged
      expect(encrypted.id).toBe(123);
      expect(encrypted.score).toBe(18);

      // String field encrypted
      expect(encrypted.notes).toContain('"ciphertext"');
    });

    it('should preserve object structure', () => {
      const entity = {
        a: 'encrypt this',
        b: 'also this',
        c: 'leave alone',
      };

      const encrypted = manager.encryptFields(entity, ['a', 'b']);

      expect(Object.keys(encrypted)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('decryptFields (batch)', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should decrypt specified fields', () => {
      const entity = {
        id: 456,
        firstName: 'John',
        lastName: 'Smith',
        notes: 'Patient notes',
      };

      const encrypted = manager.encryptFields(entity, ['firstName', 'lastName', 'notes']);
      const decrypted = manager.decryptFields(encrypted, ['firstName', 'lastName', 'notes']);

      expect(decrypted.firstName).toBe('John');
      expect(decrypted.lastName).toBe('Smith');
      expect(decrypted.notes).toBe('Patient notes');
      expect(decrypted.id).toBe(456);
    });

    it('should handle mixed encrypted and plaintext', () => {
      // Simulate migration: some fields encrypted, some not
      const entity = {
        newField: manager.encryptField('encrypted value') as string,
        oldField: 'plaintext value',
      };

      const decrypted = manager.decryptFields(entity, ['newField', 'oldField']);

      expect(decrypted.newField).toBe('encrypted value');
      expect(decrypted.oldField).toBe('plaintext value');
    });
  });

  describe('encryption disabled - decrypt encrypted data', () => {
    it('should return placeholder when key not available', () => {
      // First: encrypt with key
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager1 = PHIEncryptionManager.getInstance();
      const encrypted = manager1.encryptField('secret data');

      // Reset and try to decrypt without key
      PHIEncryptionManager.resetInstance();
      delete process.env.ENCRYPTION_MASTER_KEY;

      const manager2 = PHIEncryptionManager.getInstance();
      const result = manager2.decryptField(encrypted);

      expect(result).toBe('[ENCRYPTED - KEY REQUIRED]');
    });
  });

  describe('status reporting', () => {
    it('should report encryption disabled status', () => {
      const manager = PHIEncryptionManager.getInstance();
      const status = manager.getStatus();

      expect(status).toEqual({
        enabled: false,
        keyConfigured: false,
      });
    });

    it('should report encryption enabled status with details', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const manager = PHIEncryptionManager.getInstance();

      // Encrypt some data to track bytes
      manager.encryptField('test data');

      const status = manager.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.keyConfigured).toBe(true);
      expect(status.keyVersion).toBeDefined();
      expect(status.bytesEncrypted).toBeDefined();
      expect(status.rotationRecommended).toBeDefined();
    });
  });

  describe('PHI field use cases', () => {
    let manager: PHIEncryptionManager;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      manager = PHIEncryptionManager.getInstance();
    });

    it('should encrypt sleep diary notes', () => {
      const diaryEntry = {
        id: 1,
        userId: 'user123',
        date: '2026-01-20',
        bedtime: '23:00',
        wakeTime: '07:00',
        sleepQuality: 4,
        notes: 'Had anxiety before bed. Took 30min to fall asleep.',
      };

      const encrypted = manager.encryptFields(diaryEntry, ['notes']);

      expect(encrypted.notes).not.toContain('anxiety');
      expect(encrypted.notes).toContain('"ciphertext"');
    });

    it('should encrypt therapy session data', () => {
      const session = {
        id: 1,
        userId: 'user123',
        date: '2026-01-20',
        component: 'cognitive_restructuring',
        notes: 'Patient identified catastrophic thinking patterns.',
        recommendations: 'Practice thought challenging with sleep diary.',
      };

      const encrypted = manager.encryptFields(session, ['notes', 'recommendations']);

      expect(encrypted.notes).toContain('"ciphertext"');
      expect(encrypted.recommendations).toContain('"ciphertext"');
      expect(encrypted.component).toBe('cognitive_restructuring');
    });

    it('should encrypt user PII', () => {
      const user = {
        id: 'user123',
        email: 'patient@example.com',  // Keep for lookups
        firstName: 'Maria',
        lastName: 'Ivanova',
        timezone: 'Europe/Moscow',
      };

      const encrypted = manager.encryptFields(user, ['firstName', 'lastName']);

      expect(encrypted.firstName).toContain('"ciphertext"');
      expect(encrypted.lastName).toContain('"ciphertext"');
      expect(encrypted.email).toBe('patient@example.com');
    });

    it('should encrypt ISI assessment free text', () => {
      const assessment = {
        id: 1,
        userId: 'user123',
        instrumentId: 'isi_russian',
        totalScore: 18,
        responses: [3, 2, 3, 2, 3, 2, 3],
        additionalNotes: 'Бессонница связана с тревогой о работе.',
      };

      const encrypted = manager.encryptFields(assessment, ['additionalNotes']);

      expect(encrypted.additionalNotes).toContain('"ciphertext"');
      expect(encrypted.totalScore).toBe(18);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in decrypt gracefully', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager = PHIEncryptionManager.getInstance();

      // Looks like it might be encrypted but isn't valid
      const badValue = '{broken json';

      // Should not throw, should pass through
      const result = manager.decryptField(badValue);
      expect(result).toBe(badValue);
    });

    it('should handle missing encryption service gracefully', () => {
      // Initialization failure simulation would require mocking
      // This tests the graceful degradation path
      const manager = PHIEncryptionManager.getInstance();

      expect(manager.isEncryptionEnabled()).toBe(false);
      expect(manager.encryptField('test')).toBe('test');
    });
  });

  // ==========================================================================
  // hashForLookup() - Lines 257-265
  // ==========================================================================

  describe('hashForLookup', () => {
    it('should hash value when encryption is enabled', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager = PHIEncryptionManager.getInstance();

      const hash = manager.hashForLookup('test@example.com');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      // Hash should be deterministic
      const hash2 = manager.hashForLookup('test@example.com');
      expect(hash).toBe(hash2);
    });

    it('should produce different hashes for different values', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager = PHIEncryptionManager.getInstance();

      const hash1 = manager.hashForLookup('user1@example.com');
      const hash2 = manager.hashForLookup('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize to lowercase before hashing', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager = PHIEncryptionManager.getInstance();

      const hashLower = manager.hashForLookup('test@example.com');
      const hashUpper = manager.hashForLookup('TEST@EXAMPLE.COM');

      expect(hashLower).toBe(hashUpper);
    });

    it('should use simple SHA256 when encryption service not available', () => {
      // No encryption key = graceful degradation
      const manager = PHIEncryptionManager.getInstance();

      expect(manager.isEncryptionEnabled()).toBe(false);

      const hash = manager.hashForLookup('test@example.com');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // SHA256 produces 64 hex characters
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent fallback hash without encryption', () => {
      const manager = PHIEncryptionManager.getInstance();

      const hash1 = manager.hashForLookup('test@example.com');
      const hash2 = manager.hashForLookup('test@example.com');

      expect(hash1).toBe(hash2);
    });
  });

  // ==========================================================================
  // getEncryptionService() - Lines 270-272
  // ==========================================================================

  describe('getEncryptionService', () => {
    it('should return EncryptionService when encryption is enabled', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
      const manager = PHIEncryptionManager.getInstance();

      const service = manager.getEncryptionService();

      expect(service).not.toBeNull();
      expect(service).toBeDefined();
    });

    it('should return null when encryption is disabled', () => {
      const manager = PHIEncryptionManager.getInstance();

      const service = manager.getEncryptionService();

      expect(service).toBeNull();
    });
  });

  // ==========================================================================
  // getPHIEncryptionManager() factory - Line 279
  // ==========================================================================

  describe('getPHIEncryptionManager factory function', () => {
    it('should return singleton instance', () => {
      process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;

      const manager1 = getPHIEncryptionManager();
      const manager2 = getPHIEncryptionManager();

      expect(manager1).toBe(manager2);
      expect(manager1).toBe(PHIEncryptionManager.getInstance());
    });

    it('should work without encryption key', () => {
      const manager = getPHIEncryptionManager();

      expect(manager).toBeDefined();
      expect(manager.isEncryptionEnabled()).toBe(false);
    });
  });

  // ==========================================================================
  // PHI_FIELD_DEFINITIONS export
  // ==========================================================================

  describe('PHI_FIELD_DEFINITIONS', () => {
    it('should define user PHI fields', () => {
      expect(PHI_FIELD_DEFINITIONS.user.encryptedFields).toContain('first_name');
      expect(PHI_FIELD_DEFINITIONS.user.encryptedFields).toContain('last_name');
    });

    it('should define sleepDiary PHI fields', () => {
      expect(PHI_FIELD_DEFINITIONS.sleepDiary.encryptedFields).toContain('notes');
    });

    it('should define therapySession PHI fields', () => {
      expect(PHI_FIELD_DEFINITIONS.therapySession.encryptedFields).toContain('notes');
      expect(PHI_FIELD_DEFINITIONS.therapySession.encryptedFields).toContain('recommendations_json');
    });

    it('should have empty encrypted fields for assessment scores', () => {
      // Assessment numeric scores are not PHI
      expect(PHI_FIELD_DEFINITIONS.assessment.encryptedFields).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Constructor error handling - Lines 65-66
  // ==========================================================================

  describe('constructor error handling', () => {
    it('should disable encryption when EncryptionService throws', () => {
      // Use an invalid key format that will cause EncryptionService to throw
      // EncryptionService expects 64 hex characters for 256-bit key
      process.env.ENCRYPTION_MASTER_KEY = 'invalid-key-too-short';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const manager = PHIEncryptionManager.getInstance();

      expect(manager.isEncryptionEnabled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PHIEncryptionManager] Failed to initialize:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
