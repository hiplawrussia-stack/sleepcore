/**
 * Storage Cleanup Tests
 * =====================
 * Tests for P1-3: Logout encrypted storage cleanup.
 *
 * Security requirements tested:
 * - OWASP: localStorage cleanup on logout
 * - HIPAA: PHI rendered unreadable when session ends
 * - CWE-922: No sensitive data in unprotected storage
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearAllUserStorage,
  verifyStorageCleared,
  getActiveStorageKeys,
  ALL_STORAGE_KEYS,
} from '@/utils/storageCleanup';
import { AUTH_STORAGE_KEY } from '@/store/authStore';
import { SYNC_STORAGE_KEY } from '@/store/syncStore';

// Mock the store cleanup functions
vi.mock('@/store/authStore', async () => {
  const actual = await vi.importActual<typeof import('@/store/authStore')>('@/store/authStore');
  return {
    ...actual,
    AUTH_STORAGE_KEY: 'sleepcore-auth-v2',
    clearAuthStorage: vi.fn(() => {
      localStorage.removeItem('sleepcore-auth-v2');
    }),
  };
});

vi.mock('@/store/syncStore', async () => {
  const actual = await vi.importActual<typeof import('@/store/syncStore')>('@/store/syncStore');
  return {
    ...actual,
    SYNC_STORAGE_KEY: 'sleepcore-sync-v2',
    clearSyncStorage: vi.fn(() => {
      localStorage.removeItem('sleepcore-sync-v2');
    }),
  };
});

describe('Storage Cleanup (P1-3)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ========== Constants ==========

  describe('ALL_STORAGE_KEYS', () => {
    it('should include all known storage keys', () => {
      expect(ALL_STORAGE_KEYS).toContain(AUTH_STORAGE_KEY);
      expect(ALL_STORAGE_KEYS).toContain(SYNC_STORAGE_KEY);
      expect(ALL_STORAGE_KEYS).toContain('sleepcore_refresh_token');
    });

    it('should be a readonly tuple (TypeScript enforced)', () => {
      // `as const` makes this readonly at compile time
      // Runtime check: verify it's an array with expected length
      expect(Array.isArray(ALL_STORAGE_KEYS)).toBe(true);
      expect(ALL_STORAGE_KEYS.length).toBe(3);
    });
  });

  // ========== clearAllUserStorage ==========

  describe('clearAllUserStorage', () => {
    it('should return success when all storage is cleared', () => {
      // Setup some data
      localStorage.setItem(AUTH_STORAGE_KEY, 'encrypted-auth-data');
      localStorage.setItem(SYNC_STORAGE_KEY, 'encrypted-sync-data');

      const result = clearAllUserStorage();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should clear auth storage', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'encrypted-auth-data');

      clearAllUserStorage();

      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('should clear sync storage', () => {
      localStorage.setItem(SYNC_STORAGE_KEY, 'encrypted-sync-data');

      clearAllUserStorage();

      expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
    });

    it('should clear legacy refresh token', () => {
      localStorage.setItem('sleepcore_refresh_token', 'legacy-token');

      clearAllUserStorage();

      expect(localStorage.getItem('sleepcore_refresh_token')).toBeNull();
    });

    it('should report all cleared keys', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');
      localStorage.setItem(SYNC_STORAGE_KEY, 'data');

      const result = clearAllUserStorage();

      expect(result.clearedKeys).toContain(AUTH_STORAGE_KEY);
      expect(result.clearedKeys).toContain(SYNC_STORAGE_KEY);
      expect(result.clearedKeys).toContain('sleepcore_refresh_token');
    });

    it('should work when storage is already empty', () => {
      const result = clearAllUserStorage();

      expect(result.success).toBe(true);
    });

    it('should not affect unrelated localStorage keys', () => {
      localStorage.setItem('unrelated-key', 'should-remain');
      localStorage.setItem(AUTH_STORAGE_KEY, 'should-be-cleared');

      clearAllUserStorage();

      expect(localStorage.getItem('unrelated-key')).toBe('should-remain');
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  // ========== verifyStorageCleared ==========

  describe('verifyStorageCleared', () => {
    it('should return true when all storage is empty', () => {
      expect(verifyStorageCleared()).toBe(true);
    });

    it('should return false when auth storage exists', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');

      expect(verifyStorageCleared()).toBe(false);
    });

    it('should return false when sync storage exists', () => {
      localStorage.setItem(SYNC_STORAGE_KEY, 'data');

      expect(verifyStorageCleared()).toBe(false);
    });

    it('should return false when legacy token exists', () => {
      localStorage.setItem('sleepcore_refresh_token', 'token');

      expect(verifyStorageCleared()).toBe(false);
    });

    it('should return true after clearAllUserStorage', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');
      localStorage.setItem(SYNC_STORAGE_KEY, 'data');
      localStorage.setItem('sleepcore_refresh_token', 'token');

      clearAllUserStorage();

      expect(verifyStorageCleared()).toBe(true);
    });
  });

  // ========== getActiveStorageKeys ==========

  describe('getActiveStorageKeys', () => {
    it('should return empty array when no storage exists', () => {
      expect(getActiveStorageKeys()).toEqual([]);
    });

    it('should return keys that have data', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');

      const keys = getActiveStorageKeys();

      expect(keys).toContain(AUTH_STORAGE_KEY);
      expect(keys).not.toContain(SYNC_STORAGE_KEY);
    });

    it('should return all keys when all have data', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');
      localStorage.setItem(SYNC_STORAGE_KEY, 'data');
      localStorage.setItem('sleepcore_refresh_token', 'data');

      const keys = getActiveStorageKeys();

      expect(keys).toHaveLength(3);
    });

    it('should return empty array after clearAllUserStorage', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'data');
      localStorage.setItem(SYNC_STORAGE_KEY, 'data');

      clearAllUserStorage();

      expect(getActiveStorageKeys()).toEqual([]);
    });
  });

  // ========== Security Tests ==========

  describe('Security: OWASP Session Termination', () => {
    it('should clear all PHI on logout (OWASP requirement)', () => {
      // Simulate PHI stored in auth and sync stores
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: { telegramId: 123, firstName: 'John', lastName: 'Doe' },
      }));
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({
        pendingChanges: [{ data: { patternId: 'box' } }],
      }));

      clearAllUserStorage();

      // Verify PHI is gone
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
    });

    it('should render PHI unreadable (HIPAA requirement)', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'encrypted-phi');

      clearAllUserStorage();

      // The key should be completely removed, not just cleared
      expect(AUTH_STORAGE_KEY in localStorage).toBe(false);
    });
  });

  // ========== Error Handling ==========

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => clearAllUserStorage()).not.toThrow();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });
});
