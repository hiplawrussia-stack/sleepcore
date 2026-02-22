/**
 * Wearable Routes Integration Tests
 * ==================================
 * Tests for Android Companion App wearable endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateDeviceToken, generateTokenPair } from '../../src/utils/wearable-auth.js';

const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';

// Mock storage
let mockUsers = new Map<string, any>();
let mockDevices = new Map<string, any>();
let mockSessions = new Map<string, any>();
let mockSyncLogs = new Map<string, any>();
let mockLinkCodes = new Map<string, any>();

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async ({ where }: any) => {
            for (const user of mockUsers.values()) {
              return user;
            }
            return undefined;
          }),
        },
        wearableDevices: {
          findFirst: vi.fn(async ({ where }: any) => {
            for (const device of mockDevices.values()) {
              // Match by various conditions
              if (device.linkCode && device.linkedAt === '') {
                return device;
              }
              if (device.deviceId && device.isActive) {
                return device;
              }
            }
            return undefined;
          }),
          findMany: vi.fn(async () => Array.from(mockDevices.values())),
        },
        wearableSleepSessions: {
          findFirst: vi.fn(async () => undefined),
          findMany: vi.fn(async () => Array.from(mockSessions.values())),
        },
        wearableSyncLog: {
          findMany: vi.fn(async () => Array.from(mockSyncLogs.values())),
        },
        wearableLinkCodes: {
          findFirst: vi.fn(async ({ where }: any) => {
            // Return undefined for all lookups - simulates invalid/not found codes
            // This triggers proper 400 responses in the route handlers
            return undefined;
          }),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
          if (data.telegramId && data.firstName) {
            mockUsers.set(data.id, { ...data });
          } else if (data.deviceToken !== undefined) {
            mockDevices.set(data.id, { ...data });
          } else if (data.sourceSessionId) {
            mockSessions.set(data.id, { ...data });
          } else if (data.syncType) {
            mockSyncLogs.set(data.id, { ...data });
          }
          return { rowsAffected: 1 };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn((updates: any) => ({
          where: vi.fn(async () => {
            // Apply updates to matching records
            for (const [id, device] of mockDevices.entries()) {
              Object.assign(device, updates);
            }
            return { rowsAffected: 1 };
          }),
        })),
      })),
    })),
    users: {
      telegramId: 'telegramId',
      id: 'id',
    },
    wearableDevices: {
      $inferSelect: {} as any,
      id: 'id',
      deviceId: 'deviceId',
      userId: 'userId',
      linkCode: 'linkCode',
      linkedAt: 'linkedAt',
      isActive: 'isActive',
    },
    wearableSleepSessions: {
      $inferSelect: {} as any,
      userId: 'userId',
      deviceId: 'deviceId',
      sourceSessionId: 'sourceSessionId',
      syncedAt: 'syncedAt',
    },
    wearableSyncLog: {
      $inferSelect: {} as any,
      id: 'id',
      deviceId: 'deviceId',
      syncStartedAt: 'syncStartedAt',
    },
    wearableLinkCodes: {
      $inferSelect: {} as any,
      id: 'id',
      userId: 'userId',
      telegramId: 'telegramId',
      userCode: 'userCode',
      deviceCode: 'deviceCode',
      expiresAt: 'expiresAt',
      usedAt: 'usedAt',
      attempts: 'attempts',
      lastAttemptAt: 'lastAttemptAt',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('Wearable Routes', () => {
  const app = createApp({
    botToken: TEST_BOT_TOKEN,
    jwtSecret: TEST_JWT_SECRET,
  });

  beforeEach(() => {
    mockUsers.clear();
    mockDevices.clear();
    mockSessions.clear();
    mockSyncLogs.clear();
    mockLinkCodes.clear();
    vi.clearAllMocks();
  });

  describe('POST /api/wearable/link/generate', () => {
    it('should generate a link code for new user', async () => {
      const res = await app.request('/api/wearable/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.linkCode).toBeDefined();
      expect(data.data.linkCode).toHaveLength(6);
      expect(data.data.expiresAt).toBeDefined();
      expect(data.data.expiresInSeconds).toBe(900); // 15 minutes
    });

    it('should generate link code with uppercase alphanumeric characters', async () => {
      const res = await app.request('/api/wearable/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: 123456789,
          firstName: 'Test',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      // Link code should be alphanumeric, uppercase
      expect(data.data.linkCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should reject request without telegramId', async () => {
      const res = await app.request('/api/wearable/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject request without firstName', async () => {
      const res = await app.request('/api/wearable/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: 123456789,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid telegramId', async () => {
      const res = await app.request('/api/wearable/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: -1,
          firstName: 'Test',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/wearable/link', () => {
    it('should reject invalid link code', async () => {
      const res = await app.request('/api/wearable/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: 'ABCDEF', // Valid format, but not registered
          device: {
            id: 'device-123',
            name: 'Samsung Galaxy S24',
            manufacturer: 'Samsung',
          },
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or expired link code');
    });

    it('should reject request without device info', async () => {
      const res = await app.request('/api/wearable/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: 'ABC123',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject short link code', async () => {
      const res = await app.request('/api/wearable/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: 'ABC',
          device: { id: 'device-123' },
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject link code longer than 6 characters', async () => {
      const res = await app.request('/api/wearable/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: 'ABCDEFGH',
          device: { id: 'device-123' },
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/wearable/sync', () => {
    it('should reject request without device token', async () => {
      const res = await app.request('/api/wearable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType: 'manual',
          sleepSessions: [],
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid device token', async () => {
      const res = await app.request('/api/wearable/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          syncType: 'manual',
          sleepSessions: [],
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const res = await app.request('/api/wearable/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'NotBearer token',
        },
        body: JSON.stringify({
          syncType: 'manual',
          sleepSessions: [],
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/wearable/status', () => {
    it('should reject request without device token', async () => {
      const res = await app.request('/api/wearable/status');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid device token', async () => {
      const res = await app.request('/api/wearable/status', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/wearable/unlink', () => {
    it('should reject request without device token', async () => {
      const res = await app.request('/api/wearable/unlink', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid device token', async () => {
      const res = await app.request('/api/wearable/unlink', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(401);
    });
  });
});

describe('Wearable Auth Utilities', () => {
  describe('generateDeviceToken', () => {
    it('should generate a valid JWT token', async () => {
      const result = await generateDeviceToken(
        {
          deviceId: 'device-123',
          userId: 'user-456',
          telegramId: 123456789,
        },
        TEST_JWT_SECRET
      );

      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^eyJ/); // JWT prefix
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresInDays).toBe(90);
    });

    it('should use custom expiration days', async () => {
      const result = await generateDeviceToken(
        {
          deviceId: 'device-123',
          userId: 'user-456',
          telegramId: 123456789,
        },
        TEST_JWT_SECRET,
        30
      );

      expect(result.expiresInDays).toBe(30);
    });

    it('should generate unique tokens for different devices', async () => {
      const result1 = await generateDeviceToken(
        {
          deviceId: 'device-1',
          userId: 'user-456',
          telegramId: 123456789,
        },
        TEST_JWT_SECRET
      );

      const result2 = await generateDeviceToken(
        {
          deviceId: 'device-2',
          userId: 'user-456',
          telegramId: 123456789,
        },
        TEST_JWT_SECRET
      );

      expect(result1.token).not.toBe(result2.token);
    });
  });
});

describe('Sleep Metrics Calculation', () => {
  // These tests verify the sync endpoint processes sleep data correctly
  // by checking the validation of incoming data

  beforeEach(() => {
    mockDevices.clear();
    mockSessions.clear();
    vi.clearAllMocks();
  });

  it('should validate sleep session schema', async () => {
    const app = createApp({
      botToken: TEST_BOT_TOKEN,
      jwtSecret: TEST_JWT_SECRET,
    });

    // Generate a valid access token for testing (using new token pair API)
    const tokenResult = await generateTokenPair(
      {
        deviceId: 'test-device',
        userId: 'test-user',
        telegramId: 123456789,
      },
      TEST_JWT_SECRET
    );

    // Add mock device to pass auth (must include accessToken for validation)
    mockDevices.set('test-device', {
      id: 'test-device-id',
      deviceId: 'test-device',
      userId: 'test-user',
      telegramId: 123456789,
      isActive: true,
      linkedAt: new Date().toISOString(),
      accessToken: tokenResult.accessToken,
    });

    const res = await app.request('/api/wearable/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      body: JSON.stringify({
        syncType: 'manual',
        sleepSessions: [
          {
            sessionId: 'session-1',
            source: 'health_connect',
            startTime: '2026-02-06T23:00:00Z',
            endTime: '2026-02-07T07:00:00Z',
            stages: [
              { type: 'light', startTime: '2026-02-06T23:00:00Z', endTime: '2026-02-07T01:00:00Z' },
              { type: 'deep', startTime: '2026-02-07T01:00:00Z', endTime: '2026-02-07T03:00:00Z' },
              { type: 'rem', startTime: '2026-02-07T03:00:00Z', endTime: '2026-02-07T05:00:00Z' },
              { type: 'light', startTime: '2026-02-07T05:00:00Z', endTime: '2026-02-07T07:00:00Z' },
            ],
            hrv: [
              { timestamp: '2026-02-07T02:00:00Z', rmssd: 45.5 },
              { timestamp: '2026-02-07T03:00:00Z', rmssd: 52.3 },
              { timestamp: '2026-02-07T04:00:00Z', rmssd: 48.1 },
            ],
          },
        ],
      }),
    });

    // Should succeed with valid auth and data
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.processed).toBe(1);
    expect(data.data.skipped).toBe(0);
  });

  it('should handle sessions without stages', async () => {
    const app = createApp({
      botToken: TEST_BOT_TOKEN,
      jwtSecret: TEST_JWT_SECRET,
    });

    const tokenResult = await generateTokenPair(
      {
        deviceId: 'test-device-2',
        userId: 'test-user',
        telegramId: 123456789,
      },
      TEST_JWT_SECRET
    );

    mockDevices.set('test-device-2', {
      id: 'test-device-id-2',
      deviceId: 'test-device-2',
      userId: 'test-user',
      telegramId: 123456789,
      isActive: true,
      linkedAt: new Date().toISOString(),
      accessToken: tokenResult.accessToken,
    });

    const res = await app.request('/api/wearable/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      body: JSON.stringify({
        syncType: 'background',
        sleepSessions: [
          {
            sessionId: 'session-2',
            source: 'health_connect',
            startTime: '2026-02-06T23:00:00Z',
            endTime: '2026-02-07T07:00:00Z',
            // No stages - basic session
          },
        ],
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should reject sync with invalid session data', async () => {
    const app = createApp({
      botToken: TEST_BOT_TOKEN,
      jwtSecret: TEST_JWT_SECRET,
    });

    const tokenResult = await generateTokenPair(
      {
        deviceId: 'test-device-3',
        userId: 'test-user',
        telegramId: 123456789,
      },
      TEST_JWT_SECRET
    );

    mockDevices.set('test-device-3', {
      id: 'test-device-id-3',
      deviceId: 'test-device-3',
      userId: 'test-user',
      telegramId: 123456789,
      isActive: true,
      linkedAt: new Date().toISOString(),
      accessToken: tokenResult.accessToken,
    });

    const res = await app.request('/api/wearable/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      body: JSON.stringify({
        syncType: 'manual',
        sleepSessions: [
          {
            // Missing required fields
            source: 'health_connect',
          },
        ],
      }),
    });

    expect(res.status).toBe(400);
  });

  it('should handle empty sessions array', async () => {
    const app = createApp({
      botToken: TEST_BOT_TOKEN,
      jwtSecret: TEST_JWT_SECRET,
    });

    const tokenResult = await generateTokenPair(
      {
        deviceId: 'test-device-4',
        userId: 'test-user',
        telegramId: 123456789,
      },
      TEST_JWT_SECRET
    );

    mockDevices.set('test-device-4', {
      id: 'test-device-id-4',
      deviceId: 'test-device-4',
      userId: 'test-user',
      telegramId: 123456789,
      isActive: true,
      linkedAt: new Date().toISOString(),
      accessToken: tokenResult.accessToken,
    });

    const res = await app.request('/api/wearable/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      body: JSON.stringify({
        syncType: 'manual',
        sleepSessions: [],
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.processed).toBe(0);
    expect(data.data.skipped).toBe(0);
  });
});
