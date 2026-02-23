/**
 * OpenWearablesClient Tests
 *
 * Tests for HTTP client communication with Open Wearables API.
 *
 * @module wearable/open-wearables/__tests__
 */

// Jest provides describe, it, expect, beforeEach, afterEach globally
import { OpenWearablesClient, OpenWearablesAPIError } from '../OpenWearablesClient';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

describe('OpenWearablesClient', () => {
  let client: OpenWearablesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new OpenWearablesClient({
      baseUrl: 'https://api.openwearables.test',
      apiKey: 'test-api-key',
      timeout: 5000,
      retry: {
        maxAttempts: 2,
        baseDelay: 100,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if baseUrl is missing', () => {
      expect(() => new OpenWearablesClient({
        baseUrl: '',
        apiKey: 'test-key',
      })).toThrow('baseUrl is required');
    });

    it('should throw if apiKey is missing', () => {
      expect(() => new OpenWearablesClient({
        baseUrl: 'https://api.test.com',
        apiKey: '',
      })).toThrow('apiKey is required');
    });
  });

  describe('getSleepSessions', () => {
    it('should fetch sleep sessions with correct parameters', async () => {
      const mockResponse = {
        sessions: [
          {
            id: 'session-1',
            provider: 'oura',
            userId: 'user-123',
            startTime: '2026-02-22T23:00:00Z',
            endTime: '2026-02-23T07:00:00Z',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          perPage: 10,
          hasMore: false,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getSleepSessions({
        userId: 'user-123',
        startDate: '2026-02-01',
        endDate: '2026-02-07',
        includeHrv: true,
        includeSpo2: true,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toContain('/v1/sleep');
      expect(url).toContain('user_id=user-123');
      expect(url).toContain('start_date=2026-02-01');
      expect(url).toContain('end_date=2026-02-07');
      expect(url).toContain('include_hrv=true');
      expect(url).toContain('include_spo2=true');

      expect(options.headers['Authorization']).toBe('Bearer test-api-key');
      expect(options.method).toBe('GET');

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].id).toBe('session-1');
    });

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
        }),
      });

      let caughtError: Error | undefined;
      try {
        await client.getSleepSessions({
          userId: 'user-123',
          startDate: '2026-02-01',
          endDate: '2026-02-07',
        });
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(OpenWearablesAPIError);
      expect((caughtError as OpenWearablesAPIError).statusCode).toBe(401);
      expect((caughtError as OpenWearablesAPIError).code).toBe('UNAUTHORIZED');
    });

    it('should retry on server errors', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal error' }),
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sessions: [],
          pagination: { total: 0, page: 1, perPage: 10, hasMore: false },
        }),
      });

      const result = await client.getSleepSessions({
        userId: 'user-123',
        startDate: '2026-02-01',
        endDate: '2026-02-07',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.sessions).toHaveLength(0);
    });

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await expect(client.getSleepSessions({
        userId: 'user-123',
        startDate: 'invalid-date',
        endDate: '2026-02-07',
      })).rejects.toThrow();

      // Should only be called once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConnectedProviders', () => {
    it('should fetch connected providers', async () => {
      const mockResponse = {
        connections: [
          { provider: 'oura', status: 'connected', lastSync: '2026-02-23T08:00:00Z' },
          { provider: 'garmin', status: 'connected', lastSync: '2026-02-23T07:30:00Z' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getConnectedProviders('user-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.connections).toHaveLength(2);
      expect(result.connections[0].provider).toBe('oura');
    });
  });

  describe('initiateConnection', () => {
    it('should initiate OAuth connection', async () => {
      const mockResponse = {
        authUrl: 'https://oauth.provider.com/authorize?client_id=xxx',
        state: 'random-state-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.initiateConnection({
        userId: 'user-123',
        provider: 'oura',
        redirectUrl: 'https://sleepcore.app/oauth/callback',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');

      expect(result.authUrl).toContain('oauth.provider.com');
      expect(result.state).toBe('random-state-token');
    });
  });

  describe('disconnectProvider', () => {
    it('should disconnect a provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        client.disconnectProvider('user-123', 'oura')
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/connections/oura');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('triggerSync', () => {
    it('should trigger manual sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        client.triggerSync('user-123', ['oura', 'garmin'])
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ providers: ['oura', 'garmin'] });
    });
  });

  describe('getSyncStatus', () => {
    it('should get sync status', async () => {
      const mockResponse = {
        userId: 'user-123',
        lastSync: {
          oura: '2026-02-23T08:00:00Z',
          garmin: null,
        },
        syncing: false,
        nextSync: '2026-02-23T09:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getSyncStatus('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.syncing).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('timeout handling', () => {
    it('should handle AbortError as timeout', async () => {
      // Mock fetch that simulates abort
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      let caughtError: Error | undefined;
      try {
        await client.getSleepSessions({
          userId: 'user-123',
          startDate: '2026-02-01',
          endDate: '2026-02-07',
        });
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(OpenWearablesAPIError);
      expect((caughtError as OpenWearablesAPIError).code).toBe('TIMEOUT');
    });
  });
});
