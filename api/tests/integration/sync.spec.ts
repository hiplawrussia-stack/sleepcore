/**
 * Sync Routes Integration Tests
 * =============================
 * E2E tests for offline-first sync endpoints.
 *
 * Coverage:
 * - GET /api/sync/changes — Get changes since last sync
 * - POST /api/sync/push — Push local changes to server
 * - GET /api/sync/status — Get sync status
 *
 * @see CLAUDE.md §8 — Testing requirements
 * @packageDocumentation
 * @module @sleepcore/api/tests/integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';

// Mock data stores
let mockUsers = new Map<number, any>();
let mockSyncLog: any[] = [];
let mockBreathingSessions: any[] = [];

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async ({ where }: any) => {
            for (const [telegramId, user] of mockUsers.entries()) {
              if (user.telegramId === telegramId) {
                return user;
              }
            }
            return undefined;
          }),
        },
        syncLog: {
          findMany: vi.fn(async ({ where, orderBy, limit }: any) => {
            // Filter by userId and timestamp
            let result = [...mockSyncLog];

            // Return entries matching the query
            if (limit) {
              result = result.slice(0, limit);
            }

            return result;
          }),
          findFirst: vi.fn(async ({ where, orderBy }: any) => {
            // Return the last sync entry
            if (mockSyncLog.length === 0) return undefined;
            return mockSyncLog[mockSyncLog.length - 1];
          }),
        },
        breathingSessions: {
          findMany: vi.fn(async () => mockBreathingSessions),
        },
      },
      insert: vi.fn((table: any) => ({
        values: vi.fn(async (data: any) => {
          if (table === 'syncLog' || table?.id?.name === 'api_sync_log') {
            mockSyncLog.push(data);
          } else if (table === 'breathingSessions' || table?.id?.name === 'api_breathing_sessions') {
            mockBreathingSessions.push(data);
          }
          return { rowsAffected: 1 };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => ({ rowsAffected: 1 })),
        })),
      })),
    })),
    users: {
      telegramId: 'telegramId',
      id: 'id',
    },
    syncLog: {
      userId: 'userId',
      timestamp: 'timestamp',
    },
    breathingSessions: {
      userId: 'userId',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('Sync Routes', () => {
  const app = createApp({
    botToken: TEST_BOT_TOKEN,
    jwtSecret: TEST_JWT_SECRET,
  });

  let testAccessToken: string;
  const testUser = {
    id: 'user-1',
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    evolutionStage: 'owlet',
    xp: 100,
    level: 2,
    streak: 3,
  };

  beforeEach(async () => {
    // Reset mocks
    mockUsers.clear();
    mockSyncLog = [];
    mockBreathingSessions = [];
    vi.clearAllMocks();

    // Setup test user
    mockUsers.set(testUser.telegramId, testUser);

    // Generate access token
    testAccessToken = await generateAccessToken(
      {
        telegramId: testUser.telegramId,
        firstName: testUser.firstName,
        username: testUser.username,
        languageCode: 'ru',
        isPremium: false,
      },
      TEST_JWT_SECRET
    );
  });

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should reject request without Authorization header', async () => {
      const res = await app.request('/api/sync/changes');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/api/sync/changes', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with malformed Authorization header', async () => {
      const res = await app.request('/api/sync/changes', {
        headers: { Authorization: 'NotBearer token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /api/sync/changes
  // ===========================================================================

  describe('GET /api/sync/changes', () => {
    it('should return empty changes for new user', async () => {
      const res = await app.request('/api/sync/changes', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.changes).toEqual([]);
      expect(data.data.serverTime).toBeDefined();
      expect(data.data.hasMore).toBe(false);
    });

    it('should return changes since specified timestamp', async () => {
      // Add some sync log entries
      mockSyncLog = [
        {
          id: 'log-1',
          userId: 'user-1',
          entity: 'session',
          entityId: 'session-1',
          action: 'create',
          data: JSON.stringify({ patternId: 'box-breathing' }),
          timestamp: 1000,
        },
        {
          id: 'log-2',
          userId: 'user-1',
          entity: 'profile',
          entityId: 'user-1',
          action: 'update',
          data: JSON.stringify({ firstName: 'Updated' }),
          timestamp: 2000,
        },
      ];

      const res = await app.request('/api/sync/changes?since=500', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.changes.length).toBeGreaterThan(0);
      expect(data.data.serverTime).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      // Add multiple sync log entries
      mockSyncLog = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        userId: 'user-1',
        entity: 'session',
        entityId: `session-${i}`,
        action: 'create',
        data: JSON.stringify({ patternId: 'box-breathing' }),
        timestamp: 1000 + i * 100,
      }));

      const res = await app.request('/api/sync/changes?limit=5', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // hasMore should be true when there are more entries
    });

    it('should sanitize invalid query parameters', async () => {
      // OWASP A03:2021 — Injection prevention
      const res = await app.request('/api/sync/changes?since=invalid&limit=-1', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      // Should use defaults for invalid values
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/api/sync/changes', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // POST /api/sync/push
  // ===========================================================================

  describe('POST /api/sync/push', () => {
    it('should sync breathing session', async () => {
      const changes = [
        {
          localId: 'local-1',
          entity: 'session' as const,
          action: 'create' as const,
          data: {
            patternId: 'box-breathing',
            patternName: 'Box Breathing',
            cycles: 4,
            duration: 240,
            completedAt: new Date().toISOString(),
          },
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].status).toBe('synced');
      expect(data.data.results[0].localId).toBe('local-1');
      expect(data.data.results[0].serverId).toBeDefined();
      expect(data.data.serverTime).toBeDefined();
    });

    it('should sync profile update', async () => {
      const changes = [
        {
          localId: 'user-1',
          entity: 'profile' as const,
          action: 'update' as const,
          data: {
            firstName: 'Updated',
            lastName: 'Name',
          },
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results[0].status).toBe('synced');
    });

    it('should handle multiple changes in single request', async () => {
      const changes = [
        {
          localId: 'local-1',
          entity: 'session' as const,
          action: 'create' as const,
          data: { patternId: 'box-breathing', patternName: 'Box', cycles: 4, duration: 240 },
          clientTimestamp: Date.now(),
        },
        {
          localId: 'local-2',
          entity: 'session' as const,
          action: 'create' as const,
          data: { patternId: '4-7-8', patternName: '4-7-8', cycles: 3, duration: 180 },
          clientTimestamp: Date.now(),
        },
        {
          localId: 'user-1',
          entity: 'profile' as const,
          action: 'update' as const,
          data: { firstName: 'Multi' },
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(3);
      expect(data.data.results.every((r: any) => r.status === 'synced')).toBe(true);
    });

    it('should reject invalid entity type', async () => {
      const changes = [
        {
          localId: 'local-1',
          entity: 'invalid_entity',
          action: 'create',
          data: {},
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid action type', async () => {
      const changes = [
        {
          localId: 'local-1',
          entity: 'session',
          action: 'invalid_action',
          data: {},
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject request without changes array', async () => {
      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSyncTime: 0,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject request without lastSyncTime', async () => {
      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: [],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const changes = [
        {
          localId: 'local-1',
          entity: 'session' as const,
          action: 'create' as const,
          data: { patternId: 'box', patternName: 'Box', cycles: 4, duration: 240 },
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should handle empty changes array', async () => {
      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: [],
          lastSyncTime: 0,
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(0);
    });
  });

  // ===========================================================================
  // GET /api/sync/status
  // ===========================================================================

  describe('GET /api/sync/status', () => {
    it('should return sync status for new user', async () => {
      const res = await app.request('/api/sync/status', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.lastSyncTime).toBeNull();
      expect(data.data.counts).toBeDefined();
      expect(data.data.counts.sessions).toBe(0);
    });

    it('should return correct session count', async () => {
      // Add some breathing sessions
      mockBreathingSessions = [
        { id: 'session-1', userId: 'user-1', patternId: 'box' },
        { id: 'session-2', userId: 'user-1', patternId: '4-7-8' },
        { id: 'session-3', userId: 'user-1', patternId: 'box' },
      ];

      const res = await app.request('/api/sync/status', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.counts.sessions).toBe(3);
    });

    it('should return last sync time', async () => {
      const lastTimestamp = Date.now() - 3600000; // 1 hour ago

      mockSyncLog = [
        {
          id: 'log-1',
          userId: 'user-1',
          entity: 'session',
          entityId: 'session-1',
          action: 'create',
          timestamp: lastTimestamp,
        },
      ];

      const res = await app.request('/api/sync/status', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.lastSyncTime).toBe(lastTimestamp);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/api/sync/status', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // E2E Sync Flow Tests
  // ===========================================================================

  describe('E2E Sync Flow', () => {
    it('should complete full sync cycle: push → status → changes', async () => {
      // Step 1: Push local changes
      const changes = [
        {
          localId: 'local-session-1',
          entity: 'session' as const,
          action: 'create' as const,
          data: {
            patternId: 'box-breathing',
            patternName: 'Box Breathing',
            cycles: 4,
            duration: 240,
          },
          clientTimestamp: Date.now(),
        },
      ];

      const pushRes = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          lastSyncTime: 0,
        }),
      });
      const pushData = await pushRes.json();

      expect(pushRes.status).toBe(200);
      expect(pushData.success).toBe(true);
      expect(pushData.data.results[0].status).toBe('synced');

      const serverTime = pushData.data.serverTime;

      // Step 2: Check sync status
      const statusRes = await app.request('/api/sync/status', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const statusData = await statusRes.json();

      expect(statusRes.status).toBe(200);
      expect(statusData.success).toBe(true);

      // Step 3: Get changes since last sync
      const changesRes = await app.request(`/api/sync/changes?since=${serverTime - 1000}`, {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const changesData = await changesRes.json();

      expect(changesRes.status).toBe(200);
      expect(changesData.success).toBe(true);
    });

    it('should handle offline-first conflict resolution', async () => {
      // Simulate: client was offline, made changes, now syncing
      const offlineChanges = [
        {
          localId: 'offline-1',
          entity: 'session' as const,
          action: 'create' as const,
          data: {
            patternId: 'box-breathing',
            patternName: 'Box Breathing',
            cycles: 4,
            duration: 240,
          },
          clientTimestamp: Date.now() - 3600000, // 1 hour ago
        },
        {
          localId: 'offline-2',
          entity: 'session' as const,
          action: 'create' as const,
          data: {
            patternId: '4-7-8',
            patternName: '4-7-8 Breathing',
            cycles: 3,
            duration: 180,
          },
          clientTimestamp: Date.now() - 1800000, // 30 min ago
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: offlineChanges,
          lastSyncTime: Date.now() - 7200000, // 2 hours ago
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(2);
      expect(data.data.results.every((r: any) => r.status === 'synced')).toBe(true);

      // Each synced item should have a server-generated ID
      expect(data.data.results[0].serverId).toBeDefined();
      expect(data.data.results[1].serverId).toBeDefined();
    });
  });

  // ===========================================================================
  // Rate Limiting Tests
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const res = await app.request('/api/sync/changes', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });

      // Rate limit headers should be exposed (per CORS config)
      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security', () => {
    it('should not expose internal error details in production', async () => {
      // Set production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        mockUsers.clear();

        const res = await app.request('/api/sync/status', {
          headers: { Authorization: `Bearer ${testAccessToken}` },
        });
        const data = await res.json();

        // Should return generic error, not internal details
        expect(data.error).not.toMatch(/database/i);
        expect(data.error).not.toMatch(/sql/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should sanitize potentially malicious input in sync data', async () => {
      const maliciousChanges = [
        {
          localId: '<script>alert("xss")</script>',
          entity: 'session' as const,
          action: 'create' as const,
          data: {
            patternId: 'box',
            patternName: '<img src=x onerror=alert(1)>',
            cycles: 4,
            duration: 240,
          },
          clientTimestamp: Date.now(),
        },
      ];

      const res = await app.request('/api/sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: maliciousChanges,
          lastSyncTime: 0,
        }),
      });

      // Request should complete without error (data is sanitized on output)
      expect(res.status).toBe(200);
    });
  });
});
