/**
 * User Routes
 * ===========
 * User profile and settings endpoints.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { getDatabase, users, userBadges, userQuests } from '../db/index.js';
import type { ApiResponse, UserProfile, EvolutionStatus } from '../types/index.js';

const user = new Hono();

// Apply auth middleware to all routes
user.use('*', authMiddleware);

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  languageCode: z.string().length(2).optional(),
});

/**
 * GET /api/user/profile
 * Get current user profile
 */
user.get('/profile', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Get badges
  const badges = await db.query.userBadges.findMany({
    where: eq(userBadges.userId, dbUser.id),
  });

  const profile: UserProfile = {
    id: dbUser.id,
    telegramId: dbUser.telegramId,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName ?? undefined,
    username: dbUser.username ?? undefined,
    evolutionStage: (dbUser.evolutionStage as UserProfile['evolutionStage']) ?? 'owlet',
    xp: dbUser.xp ?? 0,
    level: dbUser.level ?? 1,
    streak: dbUser.streak ?? 0,
    badges: badges.map(b => b.badgeId),
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };

  const response: ApiResponse<UserProfile> = {
    success: true,
    data: profile,
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * PUT /api/user/profile
 * Update user profile
 */
user.put(
  '/profile',
  zValidator('json', updateProfileSchema),
  async (c) => {
    const data = c.req.valid('json');
    const authUser = c.get('user');
    const db = getDatabase();

    const dbUser = await db.query.users.findFirst({
      where: eq(users.telegramId, authUser.telegramId),
    });

    if (!dbUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
        timestamp: Date.now(),
      };
      return c.json(response, 404);
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.languageCode) updateData.languageCode = data.languageCode;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id));

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

/**
 * GET /api/user/evolution
 * Get evolution status
 */
user.get('/evolution', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Calculate days active
  const createdAt = new Date(dbUser.createdAt);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Evolution stages based on days active
  const stages = [
    { name: 'owlet', emoji: '🐣', label: 'Совёнок Соня', threshold: 0 },
    { name: 'young_owl', emoji: '🦉', label: 'Молодая сова Соня', threshold: 7 },
    { name: 'wise_owl', emoji: '🦉✨', label: 'Мудрая сова Соня', threshold: 30 },
    { name: 'master', emoji: '🏆🦉', label: 'Мастер сна Соня', threshold: 66 },
  ];

  let currentStageIndex = 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (daysActive >= stages[i].threshold) {
      currentStageIndex = i;
      break;
    }
  }

  const currentStage = stages[currentStageIndex];
  const nextStage = stages[currentStageIndex + 1];

  let progress = 100;
  let daysToNext = null;

  if (nextStage) {
    const daysInCurrentStage = daysActive - currentStage.threshold;
    const daysNeeded = nextStage.threshold - currentStage.threshold;
    progress = Math.min(100, Math.floor((daysInCurrentStage / daysNeeded) * 100));
    daysToNext = nextStage.threshold - daysActive;
  }

  const status: EvolutionStatus = {
    currentStage: currentStage.name,
    stageName: currentStage.label,
    stageEmoji: currentStage.emoji,
    daysActive,
    progress,
    nextStage: nextStage?.name || null,
    daysToNext,
  };

  const response: ApiResponse<EvolutionStatus> = {
    success: true,
    data: status,
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * GET /api/user/quests
 * Get active quests
 */
user.get('/quests', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const quests = await db.query.userQuests.findMany({
    where: eq(userQuests.userId, dbUser.id),
  });

  const response: ApiResponse<{ quests: typeof quests }> = {
    success: true,
    data: { quests },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * GET /api/user/badges
 * Get earned badges
 */
user.get('/badges', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const badges = await db.query.userBadges.findMany({
    where: eq(userBadges.userId, dbUser.id),
  });

  const response: ApiResponse<{ badges: typeof badges }> = {
    success: true,
    data: { badges },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default user;
