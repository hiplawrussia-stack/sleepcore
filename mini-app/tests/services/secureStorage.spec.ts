/**
 * Secure Storage Service Tests
 * ============================
 * Unit tests for encrypted secure storage service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: SEC-003 (secure storage)
 *
 * Coverage targets:
 * - Storage availability detection (iOS/Android only)
 * - Authentication token management
 * - Encryption key storage
 * - Health consent tracking
 * - Biometric auth preference
 * - Memory-only fallback on desktop
 * - Fail-closed behavior
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store mocks for callback-based API
let mockSecureStorageData: Record<string, string> = {};
let mockSecureStorage: {
  setItem: ReturnType<typeof vi.fn>;
  getItem: ReturnType<typeof vi.fn>;
  restoreItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} | null = null;

// Setup mock before tests
function setupMobileMock(platform: 'ios' | 'android' = 'ios') {
  mockSecureStorageData = {};
  mockSecureStorage = {
    setItem: vi.fn(
      (key: string, value: string, callback?: (error: string | null, success?: boolean) => void) => {
        mockSecureStorageData[key] = value;
        callback?.(null, true);
        return mockSecureStorage;
      }
    ),
    getItem: vi.fn((key: string, callback: (error: string | null, value?: string) => void) => {
      callback(null, mockSecureStorageData[key]);
      return mockSecureStorage;
    }),
    restoreItem: vi.fn((key: string, callback?: (error: string | null, value?: string) => void) => {
      callback?.(null, mockSecureStorageData[key]);
      return mockSecureStorage;
    }),
    removeItem: vi.fn((key: string, callback?: (error: string | null) => void) => {
      delete mockSecureStorageData[key];
      callback?.(null);
      return mockSecureStorage;
    }),
    clear: vi.fn((callback?: (error: string | null) => void) => {
      mockSecureStorageData = {};
      callback?.(null);
      return mockSecureStorage;
    }),
  };

  (
    globalThis as unknown as {
      Telegram: { WebApp: { SecureStorage: typeof mockSecureStorage; platform: string } };
    }
  ).Telegram = {
    WebApp: {
      SecureStorage: mockSecureStorage,
      platform,
    },
  };
}

function setupDesktopMock() {
  (globalThis as unknown as { Telegram: { WebApp: { platform: string } } }).Telegram = {
    WebApp: {
      platform: 'macos',
    },
  };
}

afterEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
});

// Helper to create fresh service instance
async function createService() {
  vi.resetModules();
  const module = await import('../../src/services/secureStorage');
  return module.secureStorage;
}

describe('SecureStorageService', () => {
  describe('Availability Detection', () => {
    it('should detect native SecureStorage on iOS', async () => {
      setupMobileMock('ios');
      const service = await createService();

      expect(service.isAvailable()).toBe(true);
      expect(service.getStorageType()).toBe('native');
    });

    it('should detect native SecureStorage on Android', async () => {
      setupMobileMock('android');
      const service = await createService();

      expect(service.isAvailable()).toBe(true);
      expect(service.getStorageType()).toBe('native');
    });

    it('should use memory-only mode on desktop', async () => {
      setupDesktopMock();
      const service = await createService();

      expect(service.isAvailable()).toBe(false);
      expect(service.getStorageType()).toBe('memory');
    });

    it('should use memory-only mode when Telegram unavailable', async () => {
      const service = await createService();

      expect(service.isAvailable()).toBe(false);
      expect(service.getStorageType()).toBe('memory');
    });
  });

  describe('Authentication Tokens', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should store auth token', async () => {
      const service = await createService();
      const result = await service.setAuthToken('test-jwt-token');

      expect(result).toBe(true);
    });

    it('should retrieve auth token', async () => {
      const service = await createService();
      await service.setAuthToken('test-jwt-token');

      const token = await service.getAuthToken();
      expect(token).toBe('test-jwt-token');
    });

    it('should store refresh token', async () => {
      const service = await createService();
      const result = await service.setRefreshToken('refresh-token-123');

      expect(result).toBe(true);
    });

    it('should retrieve refresh token', async () => {
      const service = await createService();
      await service.setRefreshToken('refresh-token-123');

      const token = await service.getRefreshToken();
      expect(token).toBe('refresh-token-123');
    });

    it('should check if auth token exists', async () => {
      const service = await createService();

      expect(await service.hasAuthToken()).toBe(false);

      await service.setAuthToken('token');
      expect(await service.hasAuthToken()).toBe(true);
    });

    it('should clear auth tokens', async () => {
      const service = await createService();
      await service.setAuthToken('auth-token');
      await service.setRefreshToken('refresh-token');

      const result = await service.clearAuth();
      expect(result).toBe(true);

      expect(await service.getAuthToken()).toBeNull();
      expect(await service.getRefreshToken()).toBeNull();
    });
  });

  describe('Encryption Key', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should store encryption key', async () => {
      const service = await createService();
      const key = 'aes-256-gcm-key-base64-encoded';

      const result = await service.setEncryptionKey(key);
      expect(result).toBe(true);
    });

    it('should retrieve encryption key', async () => {
      const service = await createService();
      const key = 'aes-256-gcm-key-base64-encoded';

      await service.setEncryptionKey(key);
      const retrieved = await service.getEncryptionKey();

      expect(retrieved).toBe(key);
    });
  });

  describe('Health Consent', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should store consent as true', async () => {
      const service = await createService();
      await service.setHealthConsent(true);

      const consent = await service.getHealthConsent();
      expect(consent).toBe(true);
    });

    it('should store consent as false', async () => {
      const service = await createService();
      await service.setHealthConsent(false);

      const consent = await service.getHealthConsent();
      expect(consent).toBe(false);
    });

    it('should return null when consent not set', async () => {
      const service = await createService();
      const consent = await service.getHealthConsent();

      expect(consent).toBeNull();
    });
  });

  describe('Biometric Auth', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should store biometric preference enabled', async () => {
      const service = await createService();
      await service.setBiometricAuth(true);

      const enabled = await service.getBiometricAuth();
      expect(enabled).toBe(true);
    });

    it('should store biometric preference disabled', async () => {
      const service = await createService();
      await service.setBiometricAuth(false);

      const enabled = await service.getBiometricAuth();
      expect(enabled).toBe(false);
    });

    it('should default to false when not set', async () => {
      const service = await createService();
      const enabled = await service.getBiometricAuth();

      expect(enabled).toBe(false);
    });
  });

  describe('Restore Item', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should restore previously stored item', async () => {
      const service = await createService();
      await service.setAuthToken('restorable-token');

      // Simulate app restart by clearing memory cache
      vi.resetModules();
      const freshService = await createService();

      const restored = await freshService.restoreItem('auth_token');
      expect(restored).toBe('restorable-token');
    });
  });

  describe('Clear All', () => {
    beforeEach(() => {
      setupMobileMock();
    });

    it('should clear all secure storage', async () => {
      const service = await createService();
      await service.setAuthToken('token');
      await service.setRefreshToken('refresh');
      await service.setEncryptionKey('key');

      const result = await service.clear();
      expect(result).toBe(true);

      expect(await service.getAuthToken()).toBeNull();
      expect(await service.getRefreshToken()).toBeNull();
      expect(await service.getEncryptionKey()).toBeNull();
    });
  });

  describe('Memory-Only Mode (Desktop)', () => {
    beforeEach(() => {
      setupDesktopMock();
    });

    it('should store values in memory only', async () => {
      const service = await createService();

      // Should still work, just in memory
      const result = await service.setAuthToken('memory-token');
      expect(result).toBe(true);

      const token = await service.getAuthToken();
      expect(token).toBe('memory-token');
    });

    it('should lose data on service reset (simulating app restart)', async () => {
      const service = await createService();
      await service.setAuthToken('memory-token');

      // Simulate app restart
      vi.resetModules();
      const freshService = await createService();

      // Token should be gone (memory-only)
      const token = await freshService.getAuthToken();
      expect(token).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle native storage errors gracefully', async () => {
      setupMobileMock();

      // Make setItem return error
      mockSecureStorage!.setItem = vi.fn(
        (_key: string, _value: string, callback?: (error: string | null) => void) => {
          callback?.('Storage full');
          return mockSecureStorage;
        }
      );

      const service = await createService();
      const result = await service.setAuthToken('token');

      // Should fail gracefully
      expect(result).toBe(false);
    });

    it('should handle getItem errors gracefully', async () => {
      setupMobileMock();

      mockSecureStorage!.getItem = vi.fn(
        (_key: string, callback: (error: string | null, value?: string) => void) => {
          callback('Read error');
          return mockSecureStorage;
        }
      );

      const service = await createService();
      const result = await service.getAuthToken();

      expect(result).toBeNull();
    });
  });
});
