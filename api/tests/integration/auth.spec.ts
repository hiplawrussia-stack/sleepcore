/**
 * Auth Routes Integration Tests
 * =============================
 * Tests for authentication endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateMockInitData } from '../../src/utils/telegram.js';
import { generateAccessToken, generateRefreshToken } from '../../src/utils/jwt.js';

const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';

// Mock users storage
let mockUsers = new Map<number, any>();

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async ({ where }: any) => {
            // Find by various conditions
            for (const [telegramId, user] of mockUsers.entries()) {
              if (user.telegramId === telegramId) {
                return user;
              }
            }
            return undefined;
          }),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
          mockUsers.set(data.telegramId, { ...data });
          return { rowsAffected: 1 };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => {
            return { rowsAffected: 1 };
          }),
        })),
      })),
    })),
    users: {
      telegramId: 'telegramId',
      id: 'id',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('Auth Routes', () => {
  const app = createApp({
    botToken: TEST_BOT_TOKEN,
    jwtSecret: TEST_JWT_SECRET,
  });

  beforeEach(() => {
    mockUsers.clear();
    vi.clearAllMocks();
  });

  describe('POST /api/auth/telegram', () => {
    it('should authenticate with valid initData', async () => {
      const initData = generateMockInitData(
        { id: 123456789, first_name: 'Test', username: 'testuser' },
        TEST_BOT_TOKEN
      );

      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresIn).toBe(15 * 60);
      expect(data.data.user.telegramId).toBe(123456789);
      expect(data.data.user.firstName).toBe('Test');
    });

    it('should reject invalid initData', async () => {
      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: 'invalid-data' }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should reject initData signed with wrong token', async () => {
      const initData = generateMockInitData(
        { id: 123456789, first_name: 'Test' },
        'wrong-bot-token'
      );

      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid hash');
    });

    it('should reject request without initData', async () => {
      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty initData', async () => {
      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: '' }),
      });

      expect(res.status).toBe(400);
    });

    it('should create new user on first login', async () => {
      const initData = generateMockInitData(
        { id: 999888777, first_name: 'NewUser', username: 'newuser' },
        TEST_BOT_TOKEN
      );

      expect(mockUsers.has(999888777)).toBe(false);

      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUsers.has(999888777)).toBe(true);
    });

    it('should update existing user on subsequent login', async () => {
      // Create existing user
      mockUsers.set(123456789, {
        id: 'existing-id',
        telegramId: 123456789,
        firstName: 'Old',
        username: 'olduser',
        evolutionStage: 'owlet',
        xp: 100,
        level: 2,
        streak: 5,
      });

      const initData = generateMockInitData(
        { id: 123456789, first_name: 'Updated', username: 'updateduser' },
        TEST_BOT_TOKEN
      );

      const res = await app.request('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe('existing-id');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Create user first
      mockUsers.set(123456789, {
        id: 'user-id',
        telegramId: 123456789,
        firstName: 'Test',
        username: 'testuser',
        languageCode: 'ru',
        isPremium: false,
        evolutionStage: 'owlet',
        xp: 0,
        level: 1,
        streak: 0,
      });

      const refreshToken = await generateRefreshToken(
        {
          telegramId: 123456789,
          firstName: 'Test',
          username: 'testuser',
          languageCode: 'ru',
          isPremium: false,
        },
        TEST_JWT_SECRET
      );

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresIn).toBe(15 * 60);
    });

    it('should reject invalid refresh token', async () => {
      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request without refreshToken', async () => {
      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 if user not found', async () => {
      // Create valid refresh token for non-existent user
      const refreshToken = await generateRefreshToken(
        {
          telegramId: 999999999,
          firstName: 'Ghost',
          username: 'ghost',
          languageCode: 'en',
          isPremium: false,
        },
        TEST_JWT_SECRET
      );

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user with valid access token', async () => {
      // Create user
      mockUsers.set(123456789, {
        id: 'user-id',
        telegramId: 123456789,
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        evolutionStage: 'young_owl',
        xp: 500,
        level: 5,
        streak: 10,
      });

      const accessToken = await generateAccessToken(
        {
          telegramId: 123456789,
          firstName: 'Test',
          username: 'testuser',
          languageCode: 'ru',
          isPremium: false,
        },
        TEST_JWT_SECRET
      );

      const res = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.telegramId).toBe(123456789);
      expect(data.data.firstName).toBe('Test');
      expect(data.data.evolutionStage).toBe('young_owl');
      expect(data.data.xp).toBe(500);
      expect(data.data.level).toBe(5);
      expect(data.data.streak).toBe(10);
    });

    it('should reject request without Authorization header', async () => {
      const res = await app.request('/api/auth/me');

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request with malformed Authorization header', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: 'NotBearer token' },
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 if user not found', async () => {
      const accessToken = await generateAccessToken(
        {
          telegramId: 999999999,
          firstName: 'Ghost',
          username: 'ghost',
          languageCode: 'en',
          isPremium: false,
        },
        TEST_JWT_SECRET
      );

      const res = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });
});
