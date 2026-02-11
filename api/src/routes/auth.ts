/**
 * Auth Routes
 * ===========
 * Authentication endpoints for Telegram Mini App.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { validateInitData } from '../utils/telegram.js';
import { validateVKLaunchParams } from '../utils/vk.js';
import { generateTokenPair, generateTokenPairForVK, verifyToken } from '../utils/jwt.js';
import { revokeToken, revokeAllUserTokens } from '../utils/tokenBlacklist.js';
import { findUserByAuthPayload } from '../utils/user-lookup.js';
import { getDatabase, users } from '../db/index.js';
import type { ApiResponse } from '../types/index.js';

const auth = new Hono();

// Validation schemas
const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

/**
 * POST /api/auth/telegram
 * Authenticate using Telegram initData
 */
auth.post(
  '/telegram',
  zValidator('json', telegramAuthSchema),
  async (c) => {
    const { initData } = c.req.valid('json');
    const botToken = c.get('botToken');
    const jwtSecret = c.get('jwtSecret');

    if (!botToken || !jwtSecret) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Server configuration error',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Validate Telegram initData
    const validation = validateInitData(initData, botToken);

    if (!validation.valid || !validation.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: validation.error || 'Invalid initData',
        timestamp: Date.now(),
      };
      return c.json(response, 401);
    }

    const { user: telegramUser } = validation;
    const db = getDatabase();
    const now = new Date().toISOString();

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramUser.telegramId),
    });

    if (!user) {
      // Create new user
      const newUserId = nanoid();
      await db.insert(users).values({
        id: newUserId,
        telegramId: telegramUser.telegramId,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName ?? null,
        username: telegramUser.username ?? null,
        languageCode: telegramUser.languageCode ?? 'ru',
        isPremium: telegramUser.isPremium,
        evolutionStage: 'owlet',
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, newUserId),
      });
    } else {
      // Update last active
      await db
        .update(users)
        .set({
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName ?? null,
          username: telegramUser.username ?? null,
          isPremium: telegramUser.isPremium,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    }

    // Should never happen but TypeScript needs this check
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create user',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Generate tokens
    const tokens = await generateTokenPair(telegramUser, jwtSecret);

    const response: ApiResponse<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: {
        id: string;
        telegramId: number;
        firstName: string;
        lastName?: string;
        username?: string;
        evolutionStage: string;
        xp: number;
        level: number;
      };
    }> = {
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          telegramId: user.telegramId!, // Always present for TG auth
          firstName: user.firstName,
          lastName: user.lastName ?? undefined,
          username: user.username ?? undefined,
          evolutionStage: user.evolutionStage ?? 'owlet',
          xp: user.xp ?? 0,
          level: user.level ?? 1,
        },
      },
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

// Validation schema for VK auth
const vkAuthSchema = z.object({
  launchParams: z.string().min(1, 'launchParams is required'),
});

/**
 * POST /api/auth/vk
 * Authenticate using VK Mini App launch params
 */
auth.post(
  '/vk',
  zValidator('json', vkAuthSchema),
  async (c) => {
    const { launchParams } = c.req.valid('json');
    const vkSecretKey = c.get('vkSecretKey');
    const jwtSecret = c.get('jwtSecret');

    if (!vkSecretKey || !jwtSecret) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Server configuration error',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Validate VK launch params (vkSecretKey is guaranteed to be string after check above)
    const validation = validateVKLaunchParams(launchParams, vkSecretKey as string);

    if (!validation.valid || !validation.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: validation.error || 'Invalid launch params',
        timestamp: Date.now(),
      };
      return c.json(response, 401);
    }

    const { user: vkUser } = validation;
    const db = getDatabase();
    const now = new Date().toISOString();

    // Find or create user by vkId
    let user = await db.query.users.findFirst({
      where: eq(users.vkId, vkUser.vkId),
    });

    if (!user) {
      // Create new user
      const newUserId = nanoid();
      await db.insert(users).values({
        id: newUserId,
        vkId: vkUser.vkId,
        telegramId: null, // VK users don't have telegramId
        firstName: vkUser.firstName,
        lastName: vkUser.lastName ?? null,
        username: null,
        languageCode: vkUser.languageCode ?? 'ru',
        isPremium: false,
        evolutionStage: 'owlet',
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, newUserId),
      });
    } else {
      // Update last active
      await db
        .update(users)
        .set({
          firstName: vkUser.firstName,
          lastName: vkUser.lastName ?? null,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    }

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create user',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Generate tokens for VK user
    const tokens = await generateTokenPairForVK(vkUser, jwtSecret);

    const response: ApiResponse<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: {
        id: string;
        vkId: number;
        firstName: string;
        lastName?: string;
        evolutionStage: string;
        xp: number;
        level: number;
      };
    }> = {
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          vkId: user.vkId!,
          firstName: user.firstName,
          lastName: user.lastName ?? undefined,
          evolutionStage: user.evolutionStage ?? 'owlet',
          xp: user.xp ?? 0,
          level: user.level ?? 1,
        },
      },
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
auth.post(
  '/refresh',
  zValidator('json', refreshSchema),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    const jwtSecret = c.get('jwtSecret');

    if (!jwtSecret) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Server configuration error',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Verify refresh token
    const result = await verifyToken(refreshToken, jwtSecret);

    if (!result.valid || !result.payload) {
      const response: ApiResponse<null> = {
        success: false,
        error: result.error || 'Invalid refresh token',
        timestamp: Date.now(),
      };
      return c.json(response, 401);
    }

    // Get user from database (supports both TG and VK)
    const user = await findUserByAuthPayload(result.payload);

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
        timestamp: Date.now(),
      };
      return c.json(response, 404);
    }

    // Generate new tokens based on auth provider
    const tokens = user.telegramId
      ? await generateTokenPair(
          {
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName ?? undefined,
            username: user.username ?? undefined,
            languageCode: user.languageCode ?? 'ru',
            isPremium: user.isPremium ?? false,
          },
          jwtSecret
        )
      : await generateTokenPairForVK(
          {
            vkId: user.vkId!,
            firstName: user.firstName,
            lastName: user.lastName ?? undefined,
            languageCode: user.languageCode ?? 'ru',
          },
          jwtSecret
        );

    const response: ApiResponse<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }> = {
      success: true,
      data: tokens,
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

/**
 * GET /api/auth/me
 * Get current user from token (requires auth)
 */
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Unauthorized',
      timestamp: Date.now(),
    };
    return c.json(response, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.get('jwtSecret');

  const result = await verifyToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    const response: ApiResponse<null> = {
      success: false,
      error: result.error || 'Invalid token',
      timestamp: Date.now(),
    };
    return c.json(response, 401);
  }

  // Get user from database (supports both TG and VK)
  const user = await findUserByAuthPayload(result.payload);

  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const response: ApiResponse<{
    id: string;
    telegramId?: number;
    vkId?: number;
    firstName: string;
    lastName?: string;
    username?: string;
    evolutionStage: string;
    xp: number;
    level: number;
    streak: number;
  }> = {
    success: true,
    data: {
      id: user.id,
      telegramId: user.telegramId ?? undefined,
      vkId: user.vkId ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      username: user.username ?? undefined,
      evolutionStage: user.evolutionStage ?? 'owlet',
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      streak: user.streak ?? 0,
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/auth/logout
 * Revoke current access token
 *
 * Security: OWASP API2:2023 — Proper session termination
 */
auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Unauthorized',
      timestamp: Date.now(),
    };
    return c.json(response, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.get('jwtSecret');

  const result = await verifyToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    // Token already invalid, consider logout successful
    const response: ApiResponse<{ loggedOut: boolean }> = {
      success: true,
      data: { loggedOut: true },
      timestamp: Date.now(),
    };
    return c.json(response, 200);
  }

  const { jti, telegramId, vkId, exp } = result.payload;
  const userId = telegramId ?? vkId;

  if (jti && userId && exp) {
    // Convert exp from seconds to milliseconds
    const expiresAtMs = exp * 1000;
    revokeToken(jti, userId, expiresAtMs, 'logout');
  }

  const response: ApiResponse<{ loggedOut: boolean }> = {
    success: true,
    data: { loggedOut: true },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/auth/logout-all
 * Revoke all tokens for current user (logout from all devices)
 *
 * Security: OWASP API2:2023 — Emergency session termination
 */
auth.post('/logout-all', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Unauthorized',
      timestamp: Date.now(),
    };
    return c.json(response, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.get('jwtSecret');

  const result = await verifyToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid token',
      timestamp: Date.now(),
    };
    return c.json(response, 401);
  }

  const { telegramId, vkId } = result.payload;
  const userId = telegramId ?? vkId;

  if (userId) {
    revokeAllUserTokens(userId, 'logout_all');
  }

  const response: ApiResponse<{ loggedOutAll: boolean }> = {
    success: true,
    data: { loggedOutAll: true },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default auth;
