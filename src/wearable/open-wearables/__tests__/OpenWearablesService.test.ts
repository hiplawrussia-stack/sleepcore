/**
 * OpenWearablesService Tests
 *
 * Tests for high-level Open Wearables integration service.
 *
 * @module wearable/open-wearables/__tests__
 */

// Jest provides describe, it, expect, beforeEach, afterEach globally
import { OpenWearablesService } from '../OpenWearablesService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

describe('OpenWearablesService', () => {
  let service: OpenWearablesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenWearablesService({
      baseUrl: 'https://api.openwearables.test',
      apiKey: 'test-api-key',
      timeout: 5000,
      minQualityScore: 0.6,
      enableFusion: true,
      enableCache: false, // Disable cache for testing
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUserData', () => {
    it('should sync user data successfully', async () => {
      const mockResponse = {
        sessions: [
          {
            id: 'session-1',
            provider: 'oura',
            userId: 'user-123',
            startTime: '2026-02-22T23:00:00Z',
            endTime: '2026-02-23T07:00:00Z',
            stages: [
              { type: 'light', startTime: '2026-02-22T23:15:00Z', endTime: '2026-02-23T07:00:00Z' },
            ],
            hrv: [
              { timestamp: '2026-02-23T00:00:00Z', rmssd: 50 },
            ],
          },
        ],
        pagination: { total: 1, page: 1, perPage: 10, hasMore: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.syncUserData('user-123', 7);

      expect(result.sessionsSynced).toBe(1);
      expect(result.providers).toContain('oura');
      expect(result.errors).toHaveLength(0);
      expect(result.qualityStats.avgQualityScore).toBeGreaterThan(0);
    });

    it('should skip low quality sessions', async () => {
      const mockResponse = {
        sessions: [
          {
            id: 'session-1',
            provider: 'custom', // Low quality provider
            userId: 'user-123',
            startTime: '2026-02-22T23:00:00Z',
            endTime: '2026-02-23T07:00:00Z',
          },
        ],
        pagination: { total: 1, page: 1, perPage: 10, hasMore: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      // Create service with high quality threshold
      const strictService = new OpenWearablesService({
        baseUrl: 'https://api.openwearables.test',
        apiKey: 'test-api-key',
        minQualityScore: 0.9, // Very high threshold
        enableCache: false,
      });

      const result = await strictService.syncUserData('user-123', 7);

      expect(result.sessionsSkipped).toBe(1);
      expect(result.sessionsSynced).toBe(0);
      expect(result.qualityStats.lowQualitySessions).toBe(1);
    });

    it('should fuse multiple sessions from same date', async () => {
      const mockResponse = {
        sessions: [
          {
            id: 'session-oura',
            provider: 'oura',
            userId: 'user-123',
            startTime: '2026-02-22T23:00:00Z',
            endTime: '2026-02-23T07:00:00Z',
            hrv: [{ timestamp: '2026-02-23T00:00:00Z', rmssd: 50 }],
          },
          {
            id: 'session-garmin',
            provider: 'garmin',
            userId: 'user-123',
            startTime: '2026-02-22T22:45:00Z',
            endTime: '2026-02-23T06:45:00Z',
            stages: [{ type: 'light', startTime: '2026-02-22T23:00:00Z', endTime: '2026-02-23T06:45:00Z' }],
          },
        ],
        pagination: { total: 2, page: 1, perPage: 10, hasMore: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.syncUserData('user-123', 7);

      // Should fuse and process as single session
      expect(result.sessionsSynced).toBe(1);
      expect(result.warnings.some(w => w.includes('Fused'))).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      // Mock retry also fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const result = await service.syncUserData('user-123', 7);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.sessionsSynced).toBe(0);
    });

    it('should return empty result when no sessions found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sessions: [],
          pagination: { total: 0, page: 1, perPage: 10, hasMore: false },
        }),
      });

      const result = await service.syncUserData('user-123', 7);

      expect(result.sessionsSynced).toBe(0);
      expect(result.sessionsSkipped).toBe(0);
      expect(result.providers).toHaveLength(0);
    });
  });

  describe('getConnectedProviders', () => {
    it('should get connected providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          connections: [
            { provider: 'oura', status: 'connected' },
            { provider: 'garmin', status: 'connected' },
          ],
        }),
      });

      const providers = await service.getConnectedProviders('user-123');

      expect(providers).toHaveLength(2);
      expect(providers[0].provider).toBe('oura');
    });

    it('should use cache for repeated calls', async () => {
      // Enable cache for this test
      const cachedService = new OpenWearablesService({
        baseUrl: 'https://api.openwearables.test',
        apiKey: 'test-api-key',
        enableCache: true,
        cacheTTL: 60000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          connections: [{ provider: 'oura', status: 'connected' }],
        }),
      });

      // First call
      await cachedService.getConnectedProviders('user-123');
      // Second call (should use cache)
      await cachedService.getConnectedProviders('user-123');

      // Should only call API once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectProvider', () => {
    it('should initiate OAuth connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          authUrl: 'https://oauth.oura.com/authorize',
          state: 'random-state',
        }),
      });

      const authUrl = await service.connectProvider(
        'user-123',
        'oura',
        'https://sleepcore.app/callback'
      );

      expect(authUrl).toContain('oauth.oura.com');
    });
  });

  describe('disconnectProvider', () => {
    it('should disconnect a provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        service.disconnectProvider('user-123', 'oura')
      ).resolves.toBeUndefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const available = await service.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await service.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getHighQualityProviders', () => {
    it('should return list of high quality providers', () => {
      const providers = service.getHighQualityProviders();

      expect(providers).toContain('oura');
      expect(providers).toContain('whoop');
      expect(providers).toContain('garmin');
      expect(providers.length).toBeGreaterThan(3);
    });
  });

  describe('isHighQualityProvider', () => {
    it('should identify high quality providers', () => {
      expect(service.isHighQualityProvider('oura')).toBe(true);
      expect(service.isHighQualityProvider('whoop')).toBe(true);
      expect(service.isHighQualityProvider('google_fit')).toBe(false);
    });
  });

  describe('triggerManualSync', () => {
    it('should trigger manual sync for all providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        service.triggerManualSync('user-123')
      ).resolves.toBeUndefined();

      const [_, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });

    it('should trigger manual sync for specific providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await service.triggerManualSync('user-123', ['oura', 'garmin']);

      const [_, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.providers).toEqual(['oura', 'garmin']);
    });
  });

  describe('getSyncStatus', () => {
    it('should get sync status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          userId: 'user-123',
          lastSync: { oura: '2026-02-23T08:00:00Z' },
          syncing: false,
        }),
      });

      const status = await service.getSyncStatus('user-123');

      expect(status.userId).toBe('user-123');
      expect(status.syncing).toBe(false);
    });
  });
});
