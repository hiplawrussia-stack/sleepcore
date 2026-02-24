/**
 * API Client Tests - Request Methods
 * ===================================
 * Tests for ApiClient request methods, retry logic, and authentication flow.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: SEC-001 (token management), SEC-004 (auth_date validation)
 *
 * Coverage targets:
 * - request() with retry logic
 * - authenticate() flow
 * - requestValidated() with Zod
 * - requestValidatedSafe() with fallback
 * - 401 re-authentication
 * - Timeout handling
 * - Error handling (4xx vs 5xx)
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Create mock values using vi.hoisted
const {
  mockGetInitData,
  mockGetInitDataUnsafe,
  mockFetch,
} = vi.hoisted(() => ({
  mockGetInitData: vi.fn(),
  mockGetInitDataUnsafe: vi.fn(),
  mockFetch: vi.fn(),
}));

// Mock telegram service
vi.mock('@/services/telegram', () => ({
  telegram: {
    getInitData: mockGetInitData,
    getInitDataUnsafe: mockGetInitDataUnsafe,
  },
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

// Mock AbortSignal.timeout and AbortSignal.any
vi.stubGlobal('AbortSignal', {
  timeout: vi.fn((ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
    return controller.signal;
  }),
  any: vi.fn((signals: AbortSignal[]) => signals[0]),
});

// Import after mocks
import {
  apiClient,
  tokenManager,
  ApiError,
  TimeoutError,
  AuthDateExpiredError,
} from '@/api/client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenManager.clearTokens();
    mockGetInitData.mockReturnValue('mock-init-data');
    mockGetInitDataUnsafe.mockReturnValue({
      auth_date: Math.floor(Date.now() / 1000), // Current time
      user: { id: 123 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('request()', () => {
    it('should make GET request with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1 } }),
      });

      // Set token to avoid re-auth
      tokenManager.setTokens('test-token', '', 3600);

      await apiClient.request('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include Authorization header when token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      tokenManager.setTokens('my-access-token', '', 3600);

      await apiClient.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-access-token',
          }),
        })
      );
    });

    it('should include X-Telegram-Init-Data header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      tokenManager.setTokens('token', '', 3600);

      await apiClient.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Telegram-Init-Data': 'mock-init-data',
          }),
        })
      );
    });

    it('should skip auth header when skipAuth is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      tokenManager.setTokens('token', '', 3600);

      await apiClient.request('/public', { skipAuth: true });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });

    it('should return data from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { name: 'Test', value: 42 } }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.request<{ name: string; value: number }>('/test');

      expect(result).toEqual({ name: 'Test', value: 42 });
    });

    it('should return raw data if no data wrapper', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'Direct' }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.request<{ name: string }>('/test');

      expect(result).toEqual({ name: 'Direct' });
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid input' }),
      });

      tokenManager.setTokens('token', '', 3600);

      // Capture the error once and make both assertions on it
      const error = await apiClient.request('/test').catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 400,
        statusText: 'Bad Request',
      });
    });

    it('should not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid' }),
      });

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.request('/test', { retries: 3 })).rejects.toThrow();

      // Should only be called once (no retries for 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx server errors', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { success: true } }),
        });

      tokenManager.setTokens('token', '', 3600);

      const requestPromise = apiClient.request('/test', { retries: 3 });

      // Advance through retry delay
      await vi.advanceTimersByTimeAsync(2000);

      const result = await requestPromise;

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      tokenManager.setTokens('token', '', 3600);

      await apiClient.request('/test', { timeout: 5000 });

      expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
    });

    it('should use default timeout of 10000ms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      tokenManager.setTokens('token', '', 3600);

      await apiClient.request('/test');

      expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
    });
  });

  describe('request() - 401 re-authentication', () => {
    it('should re-authenticate on 401 response', async () => {
      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({}),
        })
        // Re-auth call
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-token',
              refreshToken: '',
              expiresIn: 3600,
            }),
        })
        // Retry original request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { success: true } }),
        });

      tokenManager.setTokens('expired-token', '', 3600);

      const result = await apiClient.request('/protected');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw if re-authentication fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ error: 'Invalid initData' }),
        });

      tokenManager.setTokens('expired-token', '', 3600);

      await expect(apiClient.request('/protected')).rejects.toThrow(ApiError);
    });

    it('should skip re-auth when skipAuth is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({}),
      });

      tokenManager.setTokens('token', '', 3600);

      await expect(
        apiClient.request('/test', { skipAuth: true })
      ).rejects.toThrow(ApiError);

      // Should not attempt re-auth
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('request() - token expiry check', () => {
    it('should re-authenticate when token is expired before request', async () => {
      // Set expired token
      tokenManager.setTokens('expired', '', 0);

      // Mock re-auth and request
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'fresh-token',
              refreshToken: '',
              expiresIn: 3600,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });

      await apiClient.request('/test');

      // First call should be auth, second should be the actual request
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/auth/telegram');
    });

    it('should not re-authenticate when skipAuth is true even if token expired', async () => {
      tokenManager.setTokens('expired', '', 0);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await apiClient.request('/public', { skipAuth: true });

      // Should only call once (no re-auth)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).not.toContain('/auth');
    });
  });

  describe('authenticate()', () => {
    it('should send POST to /auth/telegram with initData', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: 'new-access',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
              user: {
                id: 'user-1',
                telegramId: 123,
                firstName: 'Test',
                evolutionStage: 'owlet',
                xp: 0,
                level: 1,
              },
            },
          }),
      });

      const result = await apiClient.authenticate();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/telegram'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ initData: 'mock-init-data' }),
        })
      );
      expect(result.accessToken).toBe('new-access');
      expect(result.user.firstName).toBe('Test');
    });

    it('should store tokens after successful authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: 'stored-token',
              refreshToken: '',
              expiresIn: 7200,
              user: {
                id: 'user-1',
                telegramId: 123,
                firstName: 'Test',
                evolutionStage: 'owlet',
                xp: 0,
                level: 1,
              },
            },
          }),
      });

      await apiClient.authenticate();

      expect(tokenManager.getAccessToken()).toBe('stored-token');
      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should throw error if no initData available', async () => {
      mockGetInitData.mockReturnValue(null);

      await expect(apiClient.authenticate()).rejects.toThrow(
        'No Telegram initData available'
      );
    });

    it('should throw AuthDateExpiredError if auth_date is too old', async () => {
      // Set auth_date to 2 days ago
      mockGetInitDataUnsafe.mockReturnValue({
        auth_date: Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60,
        user: { id: 123 },
      });

      await expect(apiClient.authenticate()).rejects.toThrow(AuthDateExpiredError);
    });

    it('should use longer timeout for auth requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: 'token',
              refreshToken: '',
              expiresIn: 3600,
              user: {
                id: 'user-1',
                telegramId: 123,
                firstName: 'Test',
                evolutionStage: 'owlet',
                xp: 0,
                level: 1,
              },
            },
          }),
      });

      await apiClient.authenticate();

      // Auth should use 30000ms timeout
      expect(AbortSignal.timeout).toHaveBeenCalledWith(30000);
    });
  });

  describe('requestValidated()', () => {
    const UserSchema = z.object({
      id: z.string(),
      name: z.string(),
      age: z.number(),
    });

    it('should return validated data when schema matches', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: '123', name: 'Test User', age: 25 },
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.requestValidated('/user', UserSchema);

      expect(result).toEqual({ id: '123', name: 'Test User', age: 25 });
    });

    it('should throw ZodError when schema does not match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 123, name: 'Test', age: 'twenty-five' }, // Invalid types
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.requestValidated('/user', UserSchema)).rejects.toThrow();
    });

    it('should throw ZodError when required field is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: '123', name: 'Test' }, // Missing age
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.requestValidated('/user', UserSchema)).rejects.toThrow();
    });
  });

  describe('requestValidatedSafe()', () => {
    const StatsSchema = z.object({
      sessions: z.number(),
      minutes: z.number(),
    });

    const fallbackStats = { sessions: 0, minutes: 0 };

    it('should return validated data when schema matches', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { sessions: 10, minutes: 60 },
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.requestValidatedSafe(
        '/stats',
        StatsSchema,
        fallbackStats
      );

      expect(result).toEqual({ sessions: 10, minutes: 60 });
    });

    it('should return fallback when schema does not match', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { sessions: 'ten', minutes: 'sixty' }, // Invalid types
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.requestValidatedSafe(
        '/stats',
        StatsSchema,
        fallbackStats
      );

      expect(result).toEqual(fallbackStats);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
        expect.anything()
      );

      consoleWarn.mockRestore();
    });

    it('should return fallback when required field is missing', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { sessions: 5 }, // Missing minutes
          }),
      });

      tokenManager.setTokens('token', '', 3600);

      const result = await apiClient.requestValidatedSafe(
        '/stats',
        StatsSchema,
        fallbackStats
      );

      expect(result).toEqual(fallbackStats);
    });
  });

  describe('auth_date validation', () => {
    it('should pass validation when auth_date is recent', async () => {
      mockGetInitDataUnsafe.mockReturnValue({
        auth_date: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: 'token',
              refreshToken: '',
              expiresIn: 3600,
              user: {
                id: 'user-1',
                telegramId: 123,
                firstName: 'Test',
                evolutionStage: 'owlet',
                xp: 0,
                level: 1,
              },
            },
          }),
      });

      // Should not throw
      await expect(apiClient.authenticate()).resolves.toBeDefined();
    });

    it('should throw when auth_date is older than 24 hours', async () => {
      mockGetInitDataUnsafe.mockReturnValue({
        auth_date: Math.floor(Date.now() / 1000) - 25 * 60 * 60, // 25 hours ago
      });

      await expect(apiClient.authenticate()).rejects.toThrow(AuthDateExpiredError);
    });

    it('should skip validation when auth_date is not available', async () => {
      mockGetInitDataUnsafe.mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accessToken: 'token',
              refreshToken: '',
              expiresIn: 3600,
              user: {
                id: 'user-1',
                telegramId: 123,
                firstName: 'Test',
                evolutionStage: 'owlet',
                xp: 0,
                level: 1,
              },
            },
          }),
      });

      // Should not throw, validation skipped
      await expect(apiClient.authenticate()).resolves.toBeDefined();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle JSON parse errors in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.request('/test', { retries: 0 })).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.request('/test', { retries: 0 })).rejects.toThrow(
        'Network error'
      );
    });

    it('should propagate AbortError without retry', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);

      tokenManager.setTokens('token', '', 3600);

      await expect(apiClient.request('/test', { retries: 3 })).rejects.toThrow(
        'Aborted'
      );

      // Should only be called once (no retry on abort)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent re-authentication', () => {
    it('should not make multiple simultaneous re-auth requests', async () => {
      // Set expired token
      tokenManager.setTokens('expired', '', 0);

      // Mock re-auth to return slowly
      let resolveAuth: (value: Response) => void;
      const authPromise = new Promise<Response>((resolve) => {
        resolveAuth = resolve;
      });

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/telegram')) {
          return authPromise;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      });

      // Start two concurrent requests
      const request1 = apiClient.request('/endpoint1');
      const request2 = apiClient.request('/endpoint2');

      // Resolve auth
      resolveAuth!({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'new-token',
            refreshToken: '',
            expiresIn: 3600,
          }),
      } as Response);

      await Promise.all([request1, request2]);

      // Auth should only be called once
      const authCalls = mockFetch.mock.calls.filter((call) =>
        call[0].includes('/auth/telegram')
      );
      expect(authCalls.length).toBe(1);
    });
  });
});

describe('POST/PUT/DELETE requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenManager.clearTokens();
    tokenManager.setTokens('test-token', '', 3600);
    mockGetInitData.mockReturnValue('mock-init-data');
    mockGetInitDataUnsafe.mockReturnValue({
      auth_date: Math.floor(Date.now() / 1000),
    });
  });

  it('should send POST request with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-1' } }),
    });

    await apiClient.request('/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New Item' }),
      })
    );
  });

  it('should send PUT request with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: '1', name: 'Updated' } }),
    });

    await apiClient.request('/items/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('should send DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { deleted: true } }),
    });

    await apiClient.request('/items/1', { method: 'DELETE' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});
