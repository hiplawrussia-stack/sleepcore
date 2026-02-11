/**
 * VK Auth Routes Integration Tests
 * =================================
 * Tests for VK authentication endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateMockVKLaunchParams } from '../../src/utils/vk.js';
import { clearAllRateLimits } from '../../src/middleware/rateLimit.js';

const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';
const TEST_VK_SECRET = 'test_vk_secret_key_for_testing';

// Mock users storage (supports both telegramId and vkId)
let mockUsers = new Map<string, any>();

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async ({ where }: any) => {
            // Search by various keys
            for (const user of mockUsers.values()) {
              // Check if we're searching by vkId or telegramId
              // The where clause structure depends on drizzle-orm
              if (user) {
                return user;
              }
            }
            return undefined;
          }),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
          const key = data.vkId ? `vk:${data.vkId}` : `tg:${data.telegramId}`;
          mockUsers.set(key, { ...data });
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
      vkId: 'vkId',
      id: 'id',
    },
    isDatabaseHealthy: vi.fn(() => true),
  };
});

describe('VK Auth Routes', () => {
  const app = createApp({
    botToken: TEST_BOT_TOKEN,
    jwtSecret: TEST_JWT_SECRET,
    vkSecretKey: TEST_VK_SECRET,
  });

  beforeEach(() => {
    mockUsers.clear();
    vi.clearAllMocks();
    clearAllRateLimits();
  });

  describe('POST /api/auth/vk', () => {
    it('should authenticate with valid VK launch params', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresIn).toBe(15 * 60);
      expect(data.data.user.vkId).toBe(123456789);
    });

    it('should reject invalid launch params signature', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, 'wrong-secret');

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid signature');
    });

    it('should reject malformed launch params', async () => {
      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams: 'not-valid-params' }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject request without launchParams', async () => {
      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty launchParams', async () => {
      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams: '' }),
      });

      expect(res.status).toBe(400);
    });

    it('should create new VK user on first login', async () => {
      const vkUserId = 999888777;
      const launchParams = generateMockVKLaunchParams(vkUserId, TEST_VK_SECRET);

      expect(mockUsers.has(`vk:${vkUserId}`)).toBe(false);

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUsers.has(`vk:${vkUserId}`)).toBe(true);
    });

    it('should return user data with correct structure', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET, {
        language: 'en',
      });

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.user).toHaveProperty('id');
      expect(data.data.user).toHaveProperty('vkId');
      expect(data.data.user).toHaveProperty('firstName');
      expect(data.data.user).toHaveProperty('evolutionStage');
      expect(data.data.user).toHaveProperty('xp');
      expect(data.data.user).toHaveProperty('level');
    });

    it('should set default evolution stage for new users', async () => {
      const launchParams = generateMockVKLaunchParams(111222333, TEST_VK_SECRET);

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.user.evolutionStage).toBe('owlet');
      expect(data.data.user.xp).toBe(0);
      expect(data.data.user.level).toBe(1);
    });

    it('should reject launch params without vk_user_id', async () => {
      const params = new URLSearchParams();
      params.set('vk_app_id', '12345678');
      params.set('vk_ts', String(Math.floor(Date.now() / 1000)));
      params.set('sign', 'somesign');

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams: params.toString() }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should handle different VK platforms', async () => {
      const platforms = ['mobile_android', 'mobile_iphone', 'desktop_web', 'mobile_web'];

      for (const platform of platforms) {
        const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET, {
          platform,
        });

        const res = await app.request('/api/auth/vk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchParams }),
        });

        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should handle different VK languages', async () => {
      const languages = ['ru', 'en', 'uk', 'be', 'kz'];

      for (const language of languages) {
        const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET, {
          language,
        });

        const res = await app.request('/api/auth/vk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchParams }),
        });

        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });

  describe('VK Auth without VK secret configured', () => {
    const appWithoutVK = createApp({
      botToken: TEST_BOT_TOKEN,
      jwtSecret: TEST_JWT_SECRET,
      // No vkSecretKey
    });

    it('should return 500 when VK secret is not configured', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      const res = await appWithoutVK.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Server configuration error');
    });
  });

  describe('VK JWT Token Integration', () => {
    it('should generate JWT with provider field for VK users', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);

      // Decode JWT to verify provider field
      const accessToken = data.data.accessToken;
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString()
      );

      expect(payload.provider).toBe('vk');
      expect(payload.vkId).toBe(123456789);
      expect(payload.telegramId).toBeUndefined();
    });

    it('should generate refresh token with VK provider', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);

      // Decode refresh token
      const refreshToken = data.data.refreshToken;
      const payload = JSON.parse(
        Buffer.from(refreshToken.split('.')[1], 'base64').toString()
      );

      expect(payload.provider).toBe('vk');
      expect(payload.vkId).toBe(123456789);
      expect(payload.type).toBe('refresh');
    });
  });

  describe('Security', () => {
    it('should reject tampered launch params', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      // Tamper with user ID
      const tampered = launchParams.replace('vk_user_id=123456789', 'vk_user_id=999');

      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams: tampered }),
      });

      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid signature');
    });

    it('should include timestamp in response', async () => {
      const launchParams = generateMockVKLaunchParams(123456789, TEST_VK_SECRET);

      const before = Date.now();
      const res = await app.request('/api/auth/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchParams }),
      });
      const after = Date.now();

      const data = await res.json();

      expect(data.timestamp).toBeGreaterThanOrEqual(before);
      expect(data.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
