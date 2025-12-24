/**
 * Breathing Routes
 * ================
 * Endpoints for breathing sessions and statistics.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { getDatabase, breathingSessions, users, dailyStats } from '../db/index.js';
import type { ApiResponse, BreathingStats } from '../types/index.js';

const breathing = new Hono();

// Apply auth middleware to all routes
breathing.use('*', authMiddleware);

// Validation schemas
const sessionSchema = z.object({
  patternId: z.string().min(1),
  patternName: z.string().min(1),
  cycles: z.number().int().min(1),
  duration: z.number().int().min(1), // seconds
  completedAt: z.string().datetime().optional(),
});

/**
 * POST /api/breathing/session
 * Log a completed breathing session
 */
breathing.post(
  '/session',
  zValidator('json', sessionSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const db = getDatabase();

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.telegramId, user.telegramId),
    });

    if (!dbUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
        timestamp: Date.now(),
      };
      return c.json(response, 404);
    }

    const now = new Date();
    const completedAt = data.completedAt || now.toISOString();
    const today = now.toISOString().split('T')[0];

    // Create session
    const session = {
      id: nanoid(),
      userId: dbUser.id,
      patternId: data.patternId,
      patternName: data.patternName,
      cycles: data.cycles,
      duration: data.duration,
      completedAt,
      syncedAt: now.toISOString(),
    };

    await db.insert(breathingSessions).values(session);

    // Update user XP and streak
    const xpGain = Math.floor(data.duration / 60) * 5 + data.cycles * 2; // 5 XP per minute + 2 per cycle

    await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${xpGain}`,
        lastActiveAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .where(eq(users.id, dbUser.id));

    // Update or create daily stats
    const existingStat = await db.query.dailyStats.findFirst({
      where: and(
        eq(dailyStats.userId, dbUser.id),
        eq(dailyStats.date, today)
      ),
    });

    if (existingStat) {
      const patterns = existingStat.patterns
        ? JSON.parse(existingStat.patterns)
        : [];
      if (!patterns.includes(data.patternId)) {
        patterns.push(data.patternId);
      }

      await db
        .update(dailyStats)
        .set({
          sessionsCount: sql`${dailyStats.sessionsCount} + 1`,
          totalMinutes: sql`${dailyStats.totalMinutes} + ${Math.floor(data.duration / 60)}`,
          patterns: JSON.stringify(patterns),
        })
        .where(eq(dailyStats.id, existingStat.id));
    } else {
      await db.insert(dailyStats).values({
        id: nanoid(),
        userId: dbUser.id,
        date: today,
        sessionsCount: 1,
        totalMinutes: Math.floor(data.duration / 60),
        patterns: JSON.stringify([data.patternId]),
      });
    }

    const response: ApiResponse<{
      id: string;
      xpGain: number;
    }> = {
      success: true,
      data: {
        id: session.id,
        xpGain,
      },
      timestamp: Date.now(),
    };

    return c.json(response, 201);
  }
);

/**
 * GET /api/breathing/stats
 * Get breathing statistics for current user
 */
breathing.get('/stats', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, user.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Get all sessions for stats
  const sessions = await db.query.breathingSessions.findMany({
    where: eq(breathingSessions.userId, dbUser.id),
    orderBy: [desc(breathingSessions.completedAt)],
  });

  // Calculate stats
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);

  // Find favorite pattern
  const patternCounts: Record<string, number> = {};
  for (const session of sessions) {
    patternCounts[session.patternId] = (patternCounts[session.patternId] || 0) + 1;
  }
  const favoritePattern = Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  // Calculate weekly progress (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentStats = await db.query.dailyStats.findMany({
    where: and(
      eq(dailyStats.userId, dbUser.id),
      gte(dailyStats.date, weekAgo.toISOString().split('T')[0])
    ),
    orderBy: [dailyStats.date],
  });

  // Fill in missing days with 0
  const weeklyProgress: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const stat = recentStats.find(s => s.date === dateStr);
    weeklyProgress.push(stat?.totalMinutes ?? 0);
  }

  const lastSession = sessions[0];

  const stats: BreathingStats = {
    totalSessions,
    totalMinutes,
    currentStreak: dbUser.streak ?? 0,
    longestStreak: dbUser.longestStreak ?? 0,
    favoritePattern,
    weeklyProgress,
    lastSessionAt: lastSession?.completedAt || null,
  };

  const response: ApiResponse<BreathingStats> = {
    success: true,
    data: stats,
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * GET /api/breathing/history
 * Get breathing session history
 */
breathing.get('/history', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const db = getDatabase();

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, user.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const sessions = await db.query.breathingSessions.findMany({
    where: eq(breathingSessions.userId, dbUser.id),
    orderBy: [desc(breathingSessions.completedAt)],
    limit,
    offset,
  });

  const response: ApiResponse<{
    sessions: typeof sessions;
    hasMore: boolean;
  }> = {
    success: true,
    data: {
      sessions,
      hasMore: sessions.length === limit,
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default breathing;
