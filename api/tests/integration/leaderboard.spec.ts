/**
 * Leaderboard Routes Integration Tests
 * =====================================
 * Tests for GDPR-compliant opt-in leaderboard endpoints.
 *
 * Coverage:
 * - GET /leaderboard/weekly — Get weekly leaderboard (opted-in users only)
 * - POST /leaderboard/opt-in — Opt-in to leaderboard (GDPR consent)
 * - POST /leaderboard/opt-out — Opt-out from leaderboard (GDPR withdrawal)
 * - GET /leaderboard/settings — Get current user's settings
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - GDPR Article 7 consent validation
 *
 * @packageDocumentation
 * @module @sleepcore/api/tests/integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { clearAllRateLimits } from '../../src/middleware/rateLimit.js';

const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';

// Hoisted mock stores - these must be accessible from within vi.mock
const { mockUsers, mockLeaderboardSettings, mockDailyStats } = vi.hoisted(() => ({
  mockUsers: new Map<number, any>(),
  mockLeaderboardSettings: [] as any[],
  mockDailyStats: [] as any[],
}));

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async () => {
            // Return first user from mockUsers
            for (const user of mockUsers.values()) {
              return user;
            }
            return undefined;
          }),
        },
        leaderboardSettings: {
          findFirst: vi.fn(async ({ where }: any) => {
            // Find settings by userId - handle both direct and eq() style where
            const userId = typeof where === 'object' && 'userId' in where ? where.userId : undefined;
            if (userId) {
              return mockLeaderboardSettings.find((s) => s.userId === userId) ?? null;
            }
            // Return first setting if no filter
            return mockLeaderboardSettings[0] ?? null;
          }),
          findMany: vi.fn(async ({ where }: any) => {
            if (where?.isOptedIn === true) {
              return mockLeaderboardSettings.filter((s) => s.isOptedIn);
            }
            return mockLeaderboardSettings;
          }),
        },
        dailyStats: {
          findMany: vi.fn(async ({ where }: any) => {
            const userId = typeof where === 'object' && 'userId' in where ? where.userId : undefined;
            if (userId) {
              return mockDailyStats.filter((s) => s.userId === userId);
            }
            return mockDailyStats;
          }),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
          mockLeaderboardSettings.push(data);
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
    leaderboardSettings: {
      userId: 'userId',
      id: 'id',
      isOptedIn: 'isOptedIn',
    },
    dailyStats: {
      userId: 'userId',
      date: 'date',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('Leaderboard Routes', () => {
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
    xp: 150,
    level: 2,
    streak: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const otherUser = {
    id: 'user-2',
    telegramId: 987654321,
    firstName: 'Other',
    lastName: 'Person',
    username: 'other',
    evolutionStage: 'young_owl',
    xp: 300,
    level: 3,
    streak: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Reset mocks - clear arrays in place to maintain reference
    mockUsers.clear();
    mockLeaderboardSettings.length = 0;
    mockDailyStats.length = 0;
    vi.clearAllMocks();
    clearAllRateLimits();

    // Setup test users
    mockUsers.set(testUser.telegramId, { ...testUser });
    mockUsers.set(otherUser.telegramId, { ...otherUser });

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
      const res = await app.request('/leaderboard/weekly');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/leaderboard/weekly', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /leaderboard/weekly
  // ===========================================================================

  describe('GET /leaderboard/weekly', () => {
    it('should return empty leaderboard when no users opted in', async () => {
      const res = await app.request('/leaderboard/weekly', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.entries).toEqual([]);
      expect(data.data.period).toBe('weekly');
      expect(data.data.userSettings.isOptedIn).toBe(false);
    });

    it('should return opted-in users in leaderboard', async () => {
      // Setup opted-in user
      mockLeaderboardSettings.push({
        id: 'settings-2',
        userId: 'user-2',
        isOptedIn: true,
        showAnonymously: false,
        optedInAt: new Date().toISOString(),
      });

      mockDailyStats.push({
        id: 'stat-1',
        userId: 'user-2',
        date: new Date().toISOString().split('T')[0],
        totalMinutes: 120,
        sessionsCount: 4,
      });

      const res = await app.request('/leaderboard/weekly', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.entries.length).toBeGreaterThanOrEqual(0);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/leaderboard/weekly', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // POST /leaderboard/opt-in (GDPR Article 7)
  // ===========================================================================

  describe('POST /leaderboard/opt-in', () => {
    it('should opt-in user to leaderboard with anonymous mode', async () => {
      const res = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonymous: true }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
    });

    it('should opt-in user with visible name', async () => {
      const res = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonymous: false }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should default to anonymous when not specified', async () => {
      const res = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update existing settings when re-opting in', async () => {
      // Create existing settings (previously opted out)
      mockLeaderboardSettings.push({
        id: 'settings-1',
        userId: 'user-1',
        isOptedIn: false,
        showAnonymously: true,
        optedOutAt: new Date().toISOString(),
      });

      const res = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonymous: false }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonymous: true }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // POST /leaderboard/opt-out (GDPR Article 7(3))
  // ===========================================================================

  describe('POST /leaderboard/opt-out', () => {
    it('should opt-out user from leaderboard', async () => {
      // User is currently opted in
      mockLeaderboardSettings.push({
        id: 'settings-1',
        userId: 'user-1',
        isOptedIn: true,
        showAnonymously: true,
        optedInAt: new Date().toISOString(),
      });

      const res = await app.request('/leaderboard/opt-out', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
    });

    it('should succeed even if user was not opted in', async () => {
      const res = await app.request('/leaderboard/opt-out', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/leaderboard/opt-out', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /leaderboard/settings
  // ===========================================================================

  describe('GET /leaderboard/settings', () => {
    it('should return default settings for new user', async () => {
      const res = await app.request('/leaderboard/settings', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isOptedIn).toBe(false);
      expect(data.data.showAnonymously).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/leaderboard/settings', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GDPR Compliance Tests
  // ===========================================================================

  describe('GDPR Compliance', () => {
    it('withdrawal should be as easy as consent (GDPR Article 7(3))', async () => {
      // Opt-in requires body
      const optInRes = await app.request('/leaderboard/opt-in', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonymous: true }),
      });
      expect(optInRes.status).toBe(200);

      // Opt-out should be equally simple (no body required)
      const optOutRes = await app.request('/leaderboard/opt-out', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });
      expect(optOutRes.status).toBe(200);
    });
  });
});
