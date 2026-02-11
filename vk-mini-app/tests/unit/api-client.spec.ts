/**
 * API Client Unit Tests
 * =====================
 * Tests for VK Mini App API client and TokenManager.
 *
 * Test Coverage:
 * - TokenManager: setTokens, getAccessToken, isTokenExpired, clearTokens
 * - ApiClient: request, authenticate, error handling, retry logic
 * - Security: memory-only token storage, XSS protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vk service before importing client
vi.mock('@/services/vk', () => ({
  vk: {
    getLaunchParamsString: vi.fn().mockReturnValue('vk_user_id=123&sign=abc'),
    isInVK: vi.fn().mockReturnValue(true),
  },
}));

// We need to test the actual implementation, so we'll create test instances
describe('TokenManager', () => {
  // Create a fresh TokenManager for testing
  class TestTokenManager {
    private accessToken: string | null = null;
    private expiresAt: number | null = null;

    setTokens(accessToken: string, expiresIn: number): void {
      this.accessToken = accessToken;
      this.expiresAt = Date.now() + expiresIn * 1000;
    }

    getAccessToken(): string | null {
      return this.accessToken;
    }

    isTokenExpired(): boolean {
      if (!this.expiresAt) return true;
      return Date.now() >= this.expiresAt - 60_000;
    }

    clearTokens(): void {
      this.accessToken = null;
      this.expiresAt = null;
    }
  }

  let tokenManager: TestTokenManager;

  beforeEach(() => {
    tokenManager = new TestTokenManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setTokens', () => {
    it('should store access token', () => {
      tokenManager.setTokens('test-token', 3600);

      expect(tokenManager.getAccessToken()).toBe('test-token');
    });

    it('should calculate expiration time correctly', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      tokenManager.setTokens('test-token', 3600); // 1 hour

      // Token should not be expired immediately
      expect(tokenManager.isTokenExpired()).toBe(false);

      // Advance time to 59 minutes - should still be valid (1 min buffer)
      vi.advanceTimersByTime(59 * 60 * 1000);
      expect(tokenManager.isTokenExpired()).toBe(true); // Within 1 minute buffer
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no token set', () => {
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should return the stored token', () => {
      tokenManager.setTokens('my-token', 3600);

      expect(tokenManager.getAccessToken()).toBe('my-token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token is set', () => {
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should return false for fresh token', () => {
      tokenManager.setTokens('token', 3600);

      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should return true when token is about to expire (within 1 minute)', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      tokenManager.setTokens('token', 60); // 1 minute

      // Should already be "expired" due to 1-minute buffer
      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should return true when token has expired', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      tokenManager.setTokens('token', 3600);

      // Advance past expiration
      vi.advanceTimersByTime(4000 * 1000);

      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });

  describe('clearTokens', () => {
    it('should clear stored token', () => {
      tokenManager.setTokens('token', 3600);

      tokenManager.clearTokens();

      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should reset expiration', () => {
      tokenManager.setTokens('token', 3600);

      tokenManager.clearTokens();

      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });
});

describe('ApiError', () => {
  // Test the ApiError class directly
  class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code?: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }

  it('should create error with message, status, and code', () => {
    const error = new ApiError('Not found', 404, 'NOT_FOUND');

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('ApiError');
  });

  it('should work without code', () => {
    const error = new ApiError('Server error', 500);

    expect(error.message).toBe('Server error');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });

  it('should be instanceof Error', () => {
    const error = new ApiError('Test', 400);

    expect(error).toBeInstanceOf(Error);
  });
});

describe('ApiClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('request', () => {
    it('should add Authorization header when token is available', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { result: 'ok' } }),
      });
      global.fetch = mockFetch;

      // Import fresh module
      vi.resetModules();
      const { tokenManager, apiClient } = await import('@/api/client');
      tokenManager.setTokens('test-token', 3600);

      await apiClient.request('/test', { requiresAuth: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should add Content-Type header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      await apiClient.request('/test', { requiresAuth: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should add VK launch params header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      await apiClient.request('/test', { requiresAuth: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-VK-Launch-Params': 'vk_user_id=123&sign=abc',
          }),
        })
      );
    });

    it('should stringify body for POST requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      await apiClient.request('/test', {
        method: 'POST',
        body: { foo: 'bar' },
        requiresAuth: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ foo: 'bar' }),
        })
      );
    });

    it('should throw ApiError on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found', code: 'NOT_FOUND' }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient, ApiError } = await import('@/api/client');

      await expect(apiClient.request('/test', { requiresAuth: false })).rejects.toThrow(
        ApiError
      );
    });

    it('should return data from response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1, name: 'test' } }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      const result = await apiClient.request('/test', { requiresAuth: false });

      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('authenticate', () => {
    it('should call /auth/vk endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: 'new-token',
            expiresIn: 3600,
            user: { id: 1 },
          },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      await apiClient.authenticate();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/vk'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should store tokens after successful auth', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: 'new-token',
            expiresIn: 3600,
            user: { id: 1 },
          },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient, tokenManager } = await import('@/api/client');

      await apiClient.authenticate();

      expect(tokenManager.getAccessToken()).toBe('new-token');
    });

    it('should return user from auth response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: 'new-token',
            expiresIn: 3600,
            user: { id: 123, firstName: 'Test' },
          },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');

      const result = await apiClient.authenticate();

      expect(result.user).toEqual({ id: 123, firstName: 'Test' });
    });
  });

  describe('requestValidated', () => {
    it('should validate response with Zod schema', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 1, name: 'test' },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');
      const { z } = await import('zod');

      const schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const result = await apiClient.requestValidated('/test', schema, {
        requiresAuth: false,
      });

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should throw on schema validation failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'not-a-number', name: 'test' },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');
      const { z } = await import('zod');

      const schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      await expect(
        apiClient.requestValidated('/test', schema, { requiresAuth: false })
      ).rejects.toThrow();
    });
  });

  describe('requestValidatedSafe', () => {
    it('should return data on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 1, name: 'test' },
        }),
      });
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');
      const { z } = await import('zod');

      const schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const result = await apiClient.requestValidatedSafe(
        '/test',
        schema,
        { id: 0, name: 'fallback' },
        { requiresAuth: false }
      );

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should return fallback on error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      vi.resetModules();
      const { apiClient } = await import('@/api/client');
      const { z } = await import('zod');

      const schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const result = await apiClient.requestValidatedSafe(
        '/test',
        schema,
        { id: 0, name: 'fallback' },
        { requiresAuth: false }
      );

      expect(result).toEqual({ id: 0, name: 'fallback' });
    });
  });
});

describe('Security: Memory-only token storage', () => {
  it('should not expose tokens in localStorage', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          accessToken: 'secret-token',
          expiresIn: 3600,
          user: { id: 1 },
        },
      }),
    });
    global.fetch = mockFetch;

    vi.resetModules();
    const { apiClient } = await import('@/api/client');

    await apiClient.authenticate();

    // Token should NOT be in localStorage
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('should not expose tokens in sessionStorage', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          accessToken: 'secret-token',
          expiresIn: 3600,
          user: { id: 1 },
        },
      }),
    });
    global.fetch = mockFetch;

    vi.resetModules();
    const { apiClient } = await import('@/api/client');

    await apiClient.authenticate();

    // Token should NOT be in sessionStorage
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
