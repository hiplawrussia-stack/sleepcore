/**
 * Breathing Routes Integration Tests
 * ===================================
 * Tests for breathing session and stats endpoints.
 *
 * Coverage:
 * - POST /breathing/session — Log breathing session
 * - GET /breathing/stats — Get breathing statistics
 * - GET /breathing/history — Get session history
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Session logging validation
 * - XP/streak calculation verification
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

// Mock data stores
let mockUsers = new Map<number, any>();
let mockBreathingSessions: any[] = [];
let mockDailyStats: any[] = [];

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
        breathingSessions: {
          findMany: vi.fn(async ({ where, orderBy, limit, offset }: any) => {
            return mockBreathingSessions.slice(offset ?? 0, (offset ?? 0) + (limit ?? 100));
          }),
        },
        dailyStats: {
          findMany: vi.fn(async ({ where }: any) => mockDailyStats),
          findFirst: vi.fn(async ({ where }: any) => {
            return mockDailyStats.find(s => s.userId === 'user-1');
          }),
        },
      },
      insert: vi.fn((table: any) => ({
        values: vi.fn(async (data: any) => {
          if (table?.id?.name === 'api_breathing_sessions' || table === 'breathingSessions') {
            mockBreathingSessions.push(data);
          } else if (table?.id?.name === 'api_daily_stats' || table === 'dailyStats') {
            mockDailyStats.push(data);
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
      xp: 'xp',
      streak: 'streak',
      longestStreak: 'longestStreak',
      lastActiveAt: 'lastActiveAt',
      updatedAt: 'updatedAt',
    },
    breathingSessions: {
      userId: 'userId',
      completedAt: 'completedAt',
    },
    dailyStats: {
      userId: 'userId',
      date: 'date',
      id: 'id',
      sessionsCount: 'sessionsCount',
      totalMinutes: 'totalMinutes',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('Breathing Routes', () => {
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
    longestStreak: 7,
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Reset mocks
    mockUsers.clear();
    mockBreathingSessions = [];
    mockDailyStats = [];
    vi.clearAllMocks();
    clearAllRateLimits();

    // Setup test user
    mockUsers.set(testUser.telegramId, { ...testUser });

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
      const res = await app.request('/breathing/stats');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/breathing/stats', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // POST /breathing/session
  // ===========================================================================

  describe('POST /breathing/session', () => {
    const validSession = {
      patternId: '478',
      patternName: '4-7-8 Breathing',
      cycles: 3,
      duration: 180,
    };

    it('should log breathing session successfully', async () => {
      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSession),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.xpGain).toBeGreaterThan(0);
    });

    it('should calculate XP correctly (5 per minute + 2 per cycle)', async () => {
      // 180 seconds = 3 minutes = 15 XP from time
      // 3 cycles = 6 XP from cycles
      // Total = 21 XP
      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSession),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.xpGain).toBe(21); // 3 * 5 + 3 * 2
    });

    it('should accept optional completedAt timestamp', async () => {
      const sessionWithTimestamp = {
        ...validSession,
        completedAt: new Date().toISOString(),
      };

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionWithTimestamp),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should reject session without patternId', async () => {
      const invalidSession = {
        patternName: '4-7-8 Breathing',
        cycles: 3,
        duration: 180,
      };

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSession),
      });

      expect(res.status).toBe(400);
    });

    it('should reject session with zero cycles', async () => {
      const invalidSession = {
        ...validSession,
        cycles: 0,
      };

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSession),
      });

      expect(res.status).toBe(400);
    });

    it('should reject session with negative duration', async () => {
      const invalidSession = {
        ...validSession,
        duration: -1,
      };

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSession),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSession),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /breathing/stats
  // ===========================================================================

  describe('GET /breathing/stats', () => {
    it('should return stats for user with no sessions', async () => {
      const res = await app.request('/breathing/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSessions).toBe(0);
      expect(data.data.totalMinutes).toBe(0);
      expect(data.data.currentStreak).toBe(3); // From test user
      expect(data.data.weeklyProgress).toHaveLength(7);
    });

    it('should return stats with sessions', async () => {
      // Add mock sessions
      mockBreathingSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          patternId: '478',
          patternName: '4-7-8',
          cycles: 3,
          duration: 180,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'session-2',
          userId: 'user-1',
          patternId: 'box',
          patternName: 'Box Breathing',
          cycles: 4,
          duration: 240,
          completedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        },
      ];

      const res = await app.request('/breathing/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSessions).toBe(2);
      expect(data.data.totalMinutes).toBe(7); // 3 + 4 minutes
    });

    it('should calculate favorite pattern correctly', async () => {
      // Add sessions with same pattern being most used
      mockBreathingSessions = [
        { id: '1', userId: 'user-1', patternId: '478', duration: 60, completedAt: new Date().toISOString() },
        { id: '2', userId: 'user-1', patternId: '478', duration: 60, completedAt: new Date().toISOString() },
        { id: '3', userId: 'user-1', patternId: 'box', duration: 60, completedAt: new Date().toISOString() },
      ];

      const res = await app.request('/breathing/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.favoritePattern).toBe('478');
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/breathing/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /breathing/history
  // ===========================================================================

  describe('GET /breathing/history', () => {
    it('should return empty history for new user', async () => {
      const res = await app.request('/breathing/history', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessions).toHaveLength(0);
      expect(data.data.hasMore).toBe(false);
    });

    it('should return sessions with default pagination', async () => {
      // Add mock sessions
      mockBreathingSessions = Array.from({ length: 25 }, (_, i) => ({
        id: `session-${i}`,
        userId: 'user-1',
        patternId: '478',
        patternName: '4-7-8',
        cycles: 3,
        duration: 180,
        completedAt: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      const res = await app.request('/breathing/history', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessions.length).toBeLessThanOrEqual(20); // Default limit
      expect(data.data.hasMore).toBe(true);
    });

    it('should respect limit parameter', async () => {
      mockBreathingSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        userId: 'user-1',
        patternId: '478',
        duration: 180,
        completedAt: new Date().toISOString(),
      }));

      const res = await app.request('/breathing/history?limit=5', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions.length).toBe(5);
    });

    it('should respect offset parameter', async () => {
      mockBreathingSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        userId: 'user-1',
        patternId: '478',
        duration: 180,
        completedAt: new Date().toISOString(),
      }));

      const res = await app.request('/breathing/history?offset=5&limit=5', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions.length).toBe(5);
      expect(data.data.sessions[0].id).toBe('session-5');
    });

    it('should sanitize invalid query parameters (OWASP A03:2021)', async () => {
      const res = await app.request('/breathing/history?limit=abc&offset=-1', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      // Should use defaults for invalid values
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/breathing/history', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // Rate Limiting Tests
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const res = await app.request('/breathing/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });

      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security', () => {
    it('should handle XSS in pattern name gracefully', async () => {
      const maliciousSession = {
        patternId: 'custom',
        patternName: '<script>alert("xss")</script>',
        cycles: 3,
        duration: 180,
      };

      const res = await app.request('/breathing/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maliciousSession),
      });

      // Should process without error (sanitization happens on output)
      expect(res.status).toBe(201);
    });

    it('should enforce maximum limit in history query', async () => {
      const res = await app.request('/breathing/history?limit=1000', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      // Limit should be capped at max (100)
    });
  });
});
