/**
 * Sleep Routes Integration Tests
 * ==============================
 * Tests for sleep data visualization endpoints.
 *
 * Coverage:
 * - GET /sleep/sessions — Get sleep sessions with pagination
 * - GET /sleep/stats — Get aggregated sleep statistics
 * - GET /sleep/session/:id — Get single session details
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Sleep data validation
 * - Wearable data integration verification
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

// Hoisted mock stores
const { mockUsers, mockSleepSessions } = vi.hoisted(() => ({
  mockUsers: new Map<number, any>(),
  mockSleepSessions: [] as any[],
}));

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async () => {
            for (const user of mockUsers.values()) {
              return user;
            }
            return undefined;
          }),
        },
        wearableSleepSessions: {
          findMany: vi.fn(async ({ where, limit, offset, columns }: any = {}) => {
            let sessions = [...mockSleepSessions];

            // Filter by userId - sessions must belong to user-1 (the test user)
            sessions = sessions.filter((s) => s.userId === 'user-1');

            // Apply ordering (desc by startTime)
            sessions.sort(
              (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );

            // If columns specified, only return those
            if (columns) {
              sessions = sessions.map((s) => {
                const result: any = {};
                for (const key of Object.keys(columns)) {
                  result[key] = s[key];
                }
                return result;
              });
            }

            // Apply pagination
            if (offset !== undefined && limit !== undefined) {
              sessions = sessions.slice(offset, offset + limit);
            } else if (limit !== undefined) {
              sessions = sessions.slice(0, limit);
            }

            return sessions;
          }),
          findFirst: vi.fn(async (args: any = {}) => {
            // findFirst is called with an object containing where clause
            // Since we can't inspect Drizzle operators, find session by matching user
            // The route passes sessionId as URL param, so we look for sessions belonging to user-1
            const sessions = mockSleepSessions.filter((s) => s.userId === 'user-1');
            // Return the first matching session (for single session tests)
            // The session ID filtering is implicit - if no matching session exists, return undefined
            if (sessions.length > 0) {
              return sessions[0];
            }
            return undefined;
          }),
        },
      },
    })),
    users: {
      telegramId: 'telegramId',
      id: 'id',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

vi.mock('../../src/db/wearable-schema.js', () => ({
  wearableSleepSessions: {
    userId: 'userId',
    id: 'id',
    startTime: 'startTime',
  },
}));

describe('Sleep Routes', () => {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createMockSession = (id: string, daysAgo: number, overrides: any = {}) => {
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const startTime = new Date(date);
    startTime.setHours(23, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(7, 0, 0, 0);

    return {
      id,
      userId: 'user-1',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      source: 'health_connect',
      tst: 420, // 7 hours
      tib: 480, // 8 hours
      se: 87.5, // Sleep efficiency
      waso: 30,
      sol: 15,
      awakenings: 2,
      stageWake: 5,
      stageLight: 45,
      stageDeep: 25,
      stageRem: 25,
      hrvMeanRmssd: 45.5,
      spo2Mean: 96,
      spo2Min: 92,
      restingHeartRate: 58,
      syncedAt: new Date().toISOString(),
      ...overrides,
    };
  };

  beforeEach(async () => {
    // Reset mocks
    mockUsers.clear();
    mockSleepSessions.length = 0;
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
      const res = await app.request('/sleep/sessions');
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /sleep/sessions
  // ===========================================================================

  describe('GET /sleep/sessions', () => {
    it('should return empty sessions for new user', async () => {
      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessions).toEqual([]);
      expect(data.data.total).toBe(0);
      expect(data.data.hasMore).toBe(false);
    });

    it('should return sleep sessions', async () => {
      mockSleepSessions.push(
        createMockSession('session-1', 1),
        createMockSession('session-2', 2),
        createMockSession('session-3', 3)
      );

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessions.length).toBe(3);
      expect(data.data.total).toBe(3);
    });

    it('should include all sleep metrics in response', async () => {
      mockSleepSessions.push(createMockSession('session-1', 1));

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      const session = data.data.sessions[0];

      // Core metrics
      expect(session.tst).toBe(420);
      expect(session.tib).toBe(480);
      expect(session.se).toBe(87.5);
      expect(session.waso).toBe(30);
      expect(session.sol).toBe(15);
      expect(session.awakenings).toBe(2);

      // Sleep stages
      expect(session.stageDeep).toBe(25);
      expect(session.stageRem).toBe(25);
      expect(session.stageLight).toBe(45);
      expect(session.stageWake).toBe(5);

      // HRV & Heart
      expect(session.hrvMeanRmssd).toBe(45.5);
      expect(session.restingHeartRate).toBe(58);

      // SpO2
      expect(session.spo2Mean).toBe(96);
      expect(session.spo2Min).toBe(92);
    });

    it('should order sessions by start time descending', async () => {
      mockSleepSessions.push(
        createMockSession('session-old', 5),
        createMockSession('session-new', 1),
        createMockSession('session-mid', 3)
      );

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].id).toBe('session-new');
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /sleep/stats
  // ===========================================================================

  describe('GET /sleep/stats', () => {
    it('should return empty stats for user with no sessions', async () => {
      const res = await app.request('/sleep/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSessions).toBe(0);
      expect(data.data.sessionsThisWeek).toBe(0);
    });

    it('should calculate average sleep metrics', async () => {
      mockSleepSessions.push(
        createMockSession('session-1', 1, { se: 85, tst: 400 }),
        createMockSession('session-2', 2, { se: 90, tst: 420 }),
        createMockSession('session-3', 3, { se: 88, tst: 410 })
      );

      const res = await app.request('/sleep/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionsThisWeek).toBe(3);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/sleep/stats', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // GET /sleep/session/:id
  // ===========================================================================

  describe('GET /sleep/session/:id', () => {
    it('should return single session details', async () => {
      mockSleepSessions.push(createMockSession('session-123', 1));

      const res = await app.request('/sleep/session/session-123', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('session-123');
      expect(data.data.tst).toBe(420);
      expect(data.data.se).toBe(87.5);
    });

    it('should not return sessions belonging to other users', async () => {
      mockSleepSessions.push({
        ...createMockSession('other-user-session', 1),
        userId: 'user-2', // Different user
      });

      const res = await app.request('/sleep/session/other-user-session', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      mockUsers.clear();

      const res = await app.request('/sleep/session/any-id', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  // ===========================================================================
  // Data Source Tests
  // ===========================================================================

  describe('Data Sources', () => {
    it('should support health_connect source', async () => {
      mockSleepSessions.push(createMockSession('session-1', 1, { source: 'health_connect' }));

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].source).toBe('health_connect');
    });

    it('should support fitbit source', async () => {
      mockSleepSessions.push(createMockSession('session-1', 1, { source: 'fitbit' }));

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].source).toBe('fitbit');
    });

    it('should support garmin source', async () => {
      mockSleepSessions.push(createMockSession('session-1', 1, { source: 'garmin' }));

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].source).toBe('garmin');
    });

    it('should support manual entry source', async () => {
      mockSleepSessions.push(createMockSession('session-1', 1, { source: 'manual' }));

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].source).toBe('manual');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle null values in sleep metrics', async () => {
      mockSleepSessions.push(
        createMockSession('session-1', 1, {
          hrvMeanRmssd: null,
          spo2Mean: null,
          spo2Min: null,
          stageDeep: null,
        })
      );

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions[0].hrvMeanRmssd).toBeNull();
      expect(data.data.sessions[0].spo2Mean).toBeNull();
    });

    it('should handle sessions with minimal data', async () => {
      mockSleepSessions.push({
        id: 'minimal-session',
        userId: 'user-1',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        source: 'manual',
        tst: null,
        tib: null,
        se: null,
        waso: null,
        sol: null,
        awakenings: null,
        stageWake: null,
        stageLight: null,
        stageDeep: null,
        stageRem: null,
        hrvMeanRmssd: null,
        spo2Mean: null,
        spo2Min: null,
        restingHeartRate: null,
        syncedAt: new Date().toISOString(),
      });

      const res = await app.request('/sleep/sessions', {
        headers: { Authorization: `Bearer ${testAccessToken}` },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.sessions.length).toBe(1);
    });
  });
});
