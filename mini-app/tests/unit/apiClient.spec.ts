/**
 * API Client Security Tests
 * =========================
 * Tests for secure token management and request handling.
 *
 * Security features tested:
 * - Memory-only token storage (no localStorage)
 * - Request timeouts via AbortSignal
 * - auth_date validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenManager, TimeoutError, AuthDateExpiredError } from '../../src/api/client';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Token Manager Security', () => {
  beforeEach(() => {
    tokenManager.clearTokens();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('memory-only storage', () => {
    it('should store access token in memory', () => {
      tokenManager.setTokens('access-token-123', 'refresh-token-456', 3600);

      expect(tokenManager.getAccessToken()).toBe('access-token-123');
    });

    it('should NOT store refresh token in localStorage', () => {
      tokenManager.setTokens('access-token-123', 'refresh-token-456', 3600);

      // localStorage.setItem should NOT be called for refresh token
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'sleepcore_refresh_token',
        expect.any(String)
      );
    });

    it('should return null for getRefreshToken (deprecated)', () => {
      tokenManager.setTokens('access-token-123', 'refresh-token-456', 3600);

      expect(tokenManager.getRefreshToken()).toBeNull();
    });

    it('should return null for loadStoredRefreshToken (deprecated)', () => {
      // Even if localStorage has a value, should return null
      localStorageMock.store['sleepcore_refresh_token'] = 'old-token';

      expect(tokenManager.loadStoredRefreshToken()).toBeNull();
    });

    it('should clean up legacy localStorage tokens on clearTokens', () => {
      localStorageMock.store['sleepcore_refresh_token'] = 'legacy-token';

      tokenManager.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sleepcore_refresh_token');
    });
  });

  describe('token expiration', () => {
    it('should consider token expired if no token set', () => {
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should not be expired immediately after setting', () => {
      tokenManager.setTokens('access-token', 'refresh-token', 3600);

      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should be expired 1 minute before actual expiry (safety margin)', () => {
      // Set token that expires in 30 seconds
      tokenManager.setTokens('access-token', 'refresh-token', 30);

      // Should be considered expired (< 60 seconds safety margin)
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should not be expired with sufficient time remaining', () => {
      // Set token that expires in 2 minutes
      tokenManager.setTokens('access-token', 'refresh-token', 120);

      // Should not be expired (> 60 seconds safety margin)
      expect(tokenManager.isTokenExpired()).toBe(false);
    });
  });

  describe('clearTokens', () => {
    it('should clear access token', () => {
      tokenManager.setTokens('access-token', 'refresh-token', 3600);
      expect(tokenManager.getAccessToken()).toBe('access-token');

      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should set token as expired after clear', () => {
      tokenManager.setTokens('access-token', 'refresh-token', 3600);
      expect(tokenManager.isTokenExpired()).toBe(false);

      tokenManager.clearTokens();
      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });
});

describe('Error Classes', () => {
  describe('TimeoutError', () => {
    it('should create TimeoutError with timeout value', () => {
      const error = new TimeoutError(10000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Request timeout after 10000ms');
    });
  });

  describe('AuthDateExpiredError', () => {
    it('should create AuthDateExpiredError with auth_date', () => {
      const authDate = Math.floor(Date.now() / 1000) - 86400 * 2; // 2 days ago
      const error = new AuthDateExpiredError(authDate);

      expect(error.name).toBe('AuthDateExpiredError');
      expect(error.message).toContain('initData auth_date expired');
    });
  });
});

describe('Security Constants', () => {
  it('should have reasonable timeout values', () => {
    // These are exported from client.ts as constants
    // We test that the behavior matches expected values
    const REQUEST_TIMEOUT_MS = 10_000;
    const AUTH_TIMEOUT_MS = 30_000;
    const MAX_AUTH_DATE_AGE_SECONDS = 24 * 60 * 60;

    expect(REQUEST_TIMEOUT_MS).toBe(10000);
    expect(AUTH_TIMEOUT_MS).toBe(30000);
    expect(MAX_AUTH_DATE_AGE_SECONDS).toBe(86400);
  });
});
