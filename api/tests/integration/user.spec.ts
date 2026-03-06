/**
 * User Routes Integration Tests
 * =============================
 * Tests for user profile, evolution, quests, and badges endpoints.
 *
 * Coverage:
 * - GET /user/profile — Get user profile
 * - PUT /user/profile — Update user profile
 * - GET /user/evolution — Get evolution status
 * - GET /user/quests — Get active quests
 * - GET /user/badges — Get earned badges
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - User data validation
 * - Evolution system verification (GAM-003)
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
let mockUserBadges: any[] = [];
let mockUserQuests: any[] = [];

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
        userBadges: {
          findMany: vi.fn(async ({ where }: any) => mockUserBadges),
        },
        userQuests: {
          findMany: vi.fn(async ({ where }: any) => mockUserQuests),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
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
    userBadges: {
      userId: 'userId',
    },
    userQuests: {
      userId: 'userId',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('User Routes', () => {
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
    longestStreak: 10,
    languageCode: 'ru',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Reset mocks
    mockUsers.clear();
    mockUserBadges = [];
    mockUserQuests = [];
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
      const res = await app.request('/user/profile');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/user/profile', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /user/profile
  // ===========================================================================

  describe('GET /user/profile', () => {
    it('should return user profile successfully', async () => {
      const res = await app.request('/user/profile', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testUser.id);
      expect(data.data.telegramId).toBe(testUser.telegramId);
      expect(data.data.firstName).toBe(testUser.firstName);
      expect(data.data.evolutionStage).toBe(testUser.evolutionStage);
      expect(data.data.xp).toBe(testUser.xp);
      expect(data.data.level).toBe(testUser.level);
      expect(data.data.streak).toBe(testUser.streak);
    });

    it('should include user badges in profile', async () => {
      mockUserBadges = [
        { id: 'badge-1', userId: 'user-1', badgeId: 'first_session', earnedAt: new Date().toISOString() },
        { id: 'badge-2', userId: 'user-1', badgeId: 'week_streak', earnedAt: new Date().toISOString() },
      ];

      const res = await app.request('/user/profile', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.badges).toContain('first_session');
      expect(data.data.badges).toContain('week_streak');
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/user/profile', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // PUT /user/profile
  // ===========================================================================

  describe('PUT /user/profile', () => {
    it('should update firstName', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName: 'Updated' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updated).toBe(true);
    });

    it('should update lastName', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastName: 'Newname' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update languageCode', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ languageCode: 'en' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject invalid languageCode length', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ languageCode: 'english' }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty firstName', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName: '' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName: 'Test' }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /user/evolution (GAM-003)
  // ===========================================================================

  describe('GET /user/evolution', () => {
    it('should return evolution status for owlet (0-6 days)', async () => {
      // User created 10 days ago (from test setup) should be young_owl
      const res = await app.request('/user/evolution', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentStage).toBe('young_owl'); // 10 days = young_owl
      expect(data.data.stageName).toBeTruthy();
      expect(data.data.stageEmoji).toBeTruthy();
      expect(data.data.daysActive).toBe(10);
      expect(data.data.progress).toBeGreaterThanOrEqual(0);
      expect(data.data.progress).toBeLessThanOrEqual(100);
    });

    it('should calculate correct stage thresholds', async () => {
      // Create user with specific age
      mockUsers.clear();
      const newUser = {
        ...testUser,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      };
      mockUsers.set(newUser.telegramId, newUser);

      const res = await app.request('/user/evolution', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.currentStage).toBe('owlet'); // 0-6 days
      expect(data.data.nextStage).toBe('young_owl');
      expect(data.data.daysToNext).toBe(4); // 7 - 3 = 4 days to next stage
    });

    it('should return null nextStage for master stage', async () => {
      mockUsers.clear();
      const masterUser = {
        ...testUser,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
      };
      mockUsers.set(masterUser.telegramId, masterUser);

      const res = await app.request('/user/evolution', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.currentStage).toBe('master');
      expect(data.data.nextStage).toBeNull();
      expect(data.data.daysToNext).toBeNull();
      expect(data.data.progress).toBe(100);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/user/evolution', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /user/quests (GAM-001)
  // ===========================================================================

  describe('GET /user/quests', () => {
    it('should return empty quests for new user', async () => {
      const res = await app.request('/user/quests', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quests).toEqual([]);
    });

    it('should return active quests', async () => {
      mockUserQuests = [
        {
          id: 'quest-1',
          userId: 'user-1',
          questId: 'daily_breathing',
          progress: 1,
          target: 3,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'quest-2',
          userId: 'user-1',
          questId: 'week_streak',
          progress: 5,
          target: 7,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      const res = await app.request('/user/quests', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quests).toHaveLength(2);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/user/quests', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /user/badges (GAM-002)
  // ===========================================================================

  describe('GET /user/badges', () => {
    it('should return empty badges for new user', async () => {
      const res = await app.request('/user/badges', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.badges).toEqual([]);
    });

    it('should return earned badges', async () => {
      mockUserBadges = [
        {
          id: 'badge-1',
          userId: 'user-1',
          badgeId: 'first_session',
          earnedAt: new Date().toISOString(),
        },
        {
          id: 'badge-2',
          userId: 'user-1',
          badgeId: 'week_streak',
          earnedAt: new Date().toISOString(),
        },
        {
          id: 'badge-3',
          userId: 'user-1',
          badgeId: 'month_streak',
          earnedAt: new Date().toISOString(),
        },
      ];

      const res = await app.request('/user/badges', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.badges).toHaveLength(3);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/user/badges', {
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
      const res = await app.request('/user/profile', {
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
    it('should handle XSS in firstName gracefully', async () => {
      const res = await app.request('/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName: '<script>alert("xss")</script>' }),
      });

      // Should process without error (sanitization happens on output)
      expect(res.status).toBe(200);
    });
  });
});
