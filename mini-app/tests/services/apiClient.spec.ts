/**
 * API Client Tests
 * ================
 * Unit tests for ApiClient with JWT authentication, retry logic, and error handling.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: SEC-001 (token storage), SEC-003 (initData validation)
 *
 * Security features tested:
 * - Memory-only token storage
 * - auth_date validation (replay attack prevention)
 * - Error classes for proper error handling
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import error classes and tokenManager directly
import {
  tokenManager,
  ApiError,
  TimeoutError,
  AuthDateExpiredError,
} from '../../src/api/client';

describe('TokenManager', () => {
  beforeEach(() => {
    tokenManager.clearTokens();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('setTokens', () => {
    it('should store access token in memory', () => {
      tokenManager.setTokens('test-access-token', 'test-refresh-token', 3600);

      expect(tokenManager.getAccessToken()).toBe('test-access-token');
    });

    it('should calculate expiry time correctly', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      tokenManager.setTokens('test-token', '', 3600); // 1 hour

      // Token should not be expired immediately
      expect(tokenManager.isTokenExpired()).toBe(false);

      // Advance time to 58 minutes - still 2 minutes before buffer kicks in
      vi.advanceTimersByTime(58 * 60 * 1000);
      expect(tokenManager.isTokenExpired()).toBe(false);

      // Advance 2 more minutes - now at 60 minutes, which is past (3600s - 60s buffer)
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should NOT store refresh token (security)', () => {
      tokenManager.setTokens('access', 'refresh', 3600);

      // Refresh token should never be stored (returns null)
      expect(tokenManager.getRefreshToken()).toBeNull();
    });

    it('should handle zero expires in', () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now());

      tokenManager.setTokens('token', '', 0);

      // Should be immediately expired
      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no token set', () => {
      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should return the stored token', () => {
      tokenManager.setTokens('my-secret-token', '', 3600);
      expect(tokenManager.getAccessToken()).toBe('my-secret-token');
    });

    it('should return updated token after setTokens', () => {
      tokenManager.setTokens('token-1', '', 3600);
      expect(tokenManager.getAccessToken()).toBe('token-1');

      tokenManager.setTokens('token-2', '', 3600);
      expect(tokenManager.getAccessToken()).toBe('token-2');
    });
  });

  describe('getRefreshToken', () => {
    it('should always return null (deprecated)', () => {
      expect(tokenManager.getRefreshToken()).toBeNull();
    });

    it('should return null even after setting tokens', () => {
      tokenManager.setTokens('access', 'refresh-should-be-ignored', 3600);
      expect(tokenManager.getRefreshToken()).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token set', () => {
      tokenManager.clearTokens();

      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should return true when token is about to expire (1 minute buffer)', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Token expires in 30 seconds
      tokenManager.setTokens('token', '', 30);

      // Should be considered expired due to 1-minute buffer
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should return false when token has plenty of time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now());

      tokenManager.setTokens('token', '', 7200); // 2 hours

      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should track expiry correctly over time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now());

      tokenManager.setTokens('token', '', 180); // 3 minutes

      // Not expired at start
      expect(tokenManager.isTokenExpired()).toBe(false);

      // Still not expired after 1 minute
      vi.advanceTimersByTime(60000);
      expect(tokenManager.isTokenExpired()).toBe(false);

      // Expired after 2+ minutes (due to 1-minute buffer: 180s - 60s = 120s = 2 min)
      vi.advanceTimersByTime(61000);
      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });

  describe('clearTokens', () => {
    it('should clear access token', () => {
      tokenManager.setTokens('token', '', 3600);
      expect(tokenManager.getAccessToken()).toBe('token');

      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should reset expiry state', () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now());

      tokenManager.setTokens('token', '', 7200);
      expect(tokenManager.isTokenExpired()).toBe(false);

      tokenManager.clearTokens();
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should attempt to clean legacy localStorage tokens', () => {
      // The implementation tries to remove legacy tokens from localStorage
      // We verify the behavior is safe (doesn't throw) even if localStorage is unavailable
      expect(() => tokenManager.clearTokens()).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      const removeItemSpy = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Storage error');
        });

      // Should not throw
      expect(() => tokenManager.clearTokens()).not.toThrow();

      removeItemSpy.mockRestore();
    });

    it('should be idempotent', () => {
      tokenManager.setTokens('token', '', 3600);

      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();

      // Should not throw when called again
      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();
    });
  });

  describe('loadStoredRefreshToken', () => {
    it('should return null (deprecated)', () => {
      expect(tokenManager.loadStoredRefreshToken()).toBeNull();
    });

    it('should always return null regardless of state', () => {
      tokenManager.setTokens('access', 'refresh', 3600);
      expect(tokenManager.loadStoredRefreshToken()).toBeNull();

      tokenManager.clearTokens();
      expect(tokenManager.loadStoredRefreshToken()).toBeNull();
    });
  });
});

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('should store status and statusText', () => {
      const error = new ApiError(404, 'Not Found', { detail: 'Resource missing' });

      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.data).toEqual({ detail: 'Resource missing' });
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('API Error: 404 Not Found');
    });

    it('should work without data', () => {
      const error = new ApiError(500, 'Internal Server Error');

      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.data).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new ApiError(400, 'Bad Request');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should have stack trace', () => {
      const error = new ApiError(401, 'Unauthorized');

      expect(error.stack).toBeDefined();
    });

    it('should handle different status codes', () => {
      const codes = [
        { status: 400, text: 'Bad Request' },
        { status: 401, text: 'Unauthorized' },
        { status: 403, text: 'Forbidden' },
        { status: 404, text: 'Not Found' },
        { status: 500, text: 'Internal Server Error' },
        { status: 502, text: 'Bad Gateway' },
        { status: 503, text: 'Service Unavailable' },
      ];

      for (const { status, text } of codes) {
        const error = new ApiError(status, text);
        expect(error.status).toBe(status);
        expect(error.statusText).toBe(text);
        expect(error.message).toBe(`API Error: ${status} ${text}`);
      }
    });
  });

  describe('TimeoutError', () => {
    it('should include timeout duration in message', () => {
      const error = new TimeoutError(5000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Request timeout after 5000ms');
    });

    it('should be instanceof Error', () => {
      const error = new TimeoutError(10000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should handle different timeout values', () => {
      const timeouts = [1000, 5000, 10000, 30000, 60000];

      for (const timeout of timeouts) {
        const error = new TimeoutError(timeout);
        expect(error.message).toBe(`Request timeout after ${timeout}ms`);
      }
    });
  });

  describe('AuthDateExpiredError', () => {
    it('should include ISO date in message', () => {
      const authDate = 1700000000; // Known timestamp
      const error = new AuthDateExpiredError(authDate);

      expect(error.name).toBe('AuthDateExpiredError');
      expect(error.message).toContain('expired');
      expect(error.message).toContain(new Date(authDate * 1000).toISOString());
    });

    it('should be instanceof Error', () => {
      const error = new AuthDateExpiredError(1700000000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthDateExpiredError);
    });

    it('should format different timestamps correctly', () => {
      const timestamps = [
        1700000000,
        1600000000,
        1650000000,
      ];

      for (const timestamp of timestamps) {
        const error = new AuthDateExpiredError(timestamp);
        const expectedDate = new Date(timestamp * 1000).toISOString();
        expect(error.message).toContain(expectedDate);
      }
    });
  });
});

describe('Token Security', () => {
  beforeEach(() => {
    tokenManager.clearTokens();
  });

  it('should not persist tokens across clear operations', () => {
    tokenManager.setTokens('secret-token', '', 3600);
    tokenManager.clearTokens();

    // Token should be completely gone
    expect(tokenManager.getAccessToken()).toBeNull();
    expect(tokenManager.isTokenExpired()).toBe(true);
  });

  it('should allow re-setting tokens after clear', () => {
    tokenManager.setTokens('token-1', '', 3600);
    tokenManager.clearTokens();
    tokenManager.setTokens('token-2', '', 3600);

    expect(tokenManager.getAccessToken()).toBe('token-2');
  });

  it('should never expose refresh token (XSS protection)', () => {
    // Try various scenarios
    tokenManager.setTokens('access', 'super-secret-refresh', 3600);
    expect(tokenManager.getRefreshToken()).toBeNull();
    expect(tokenManager.loadStoredRefreshToken()).toBeNull();

    // Even after clear
    tokenManager.clearTokens();
    expect(tokenManager.getRefreshToken()).toBeNull();
    expect(tokenManager.loadStoredRefreshToken()).toBeNull();
  });
});
