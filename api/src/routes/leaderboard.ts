/**
 * Leaderboard Routes
 * ==================
 * GDPR-compliant opt-in leaderboard endpoints.
 *
 * Research basis:
 * - GDPR Article 7: Explicit consent required for data processing
 * - University of Oregon: Cooperative/opt-in reduces anxiety
 * - Syrenis: Pseudonymous avatars preserve privacy + engagement
 *
 * Privacy design:
 * - Opt-in only (no participation by default)
 * - Anonymous mode available ("Participant #XXX")
 * - Easy withdrawal at any time
 * - Audit trail for compliance
 *
 * @see https://www.mdpi.com/1999-5899/11/3/67
 * @see https://business.uoregon.edu/news/competitive-vs-cooperative-health-apps
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { findUserByAuthPayload } from '../utils/index.js';
import {
  getDatabase,
  users,
  leaderboardSettings,
  dailyStats,
} from '../db/index.js';
import type { ApiResponse } from '../types/index.js';

const leaderboard = new Hono();

// Apply auth middleware to all routes
leaderboard.use('*', authMiddleware);

// Validation schemas
const optInSchema = z.object({
  anonymous: z.boolean().default(true),
});

// Types
interface LeaderboardEntry {
  rank: number;
  displayName: string;
  isAnonymous: boolean;
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  evolutionStage: string;
  isCurrentUser: boolean;
}

interface LeaderboardSettings {
  isOptedIn: boolean;
  showAnonymously: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userSettings: LeaderboardSettings;
  period: 'weekly' | 'monthly' | 'allTime';
  updatedAt: string;
}

/**
 * Helper: Get user's leaderboard settings
 */
async function getUserSettings(
  db: ReturnType<typeof getDatabase>,
  userId: string
): Promise<LeaderboardSettings> {
  const settings = await db.query.leaderboardSettings.findFirst({
    where: eq(leaderboardSettings.userId, userId),
  });

  return {
    isOptedIn: settings?.isOptedIn ?? false,
    showAnonymously: settings?.showAnonymously ?? true,
  };
}

/**
 * Helper: Generate anonymous display name
 * Uses last 4 chars of user ID for consistent pseudonym
 */
function generateAnonymousName(userId: string): string {
  const hash = userId.slice(-4).toUpperCase();
  return `Participant #${hash}`;
}

/**
 * GET /api/leaderboard/weekly
 * Get weekly leaderboard (only opted-in users)
 *
 * Returns:
 * - Top 20 users by total minutes this week
 * - Current user's position (if opted in)
 * - User's settings
 */
leaderboard.get('/weekly', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  // Find current user in database (support both TG and VK)
  const dbUser = await findUserByAuthPayload(authUser);

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Get user's settings
  const userSettings = await getUserSettings(db, dbUser.id);

  // Calculate week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Get all opted-in users with their weekly stats
  const optedInSettings = await db.query.leaderboardSettings.findMany({
    where: eq(leaderboardSettings.isOptedIn, true),
  });

  const optedInUserIds = optedInSettings.map((s) => s.userId);

  if (optedInUserIds.length === 0) {
    const response: ApiResponse<LeaderboardResponse> = {
      success: true,
      data: {
        entries: [],
        userSettings,
        period: 'weekly',
        updatedAt: now.toISOString(),
      },
      timestamp: Date.now(),
    };
    return c.json(response, 200);
  }

  // Aggregate stats for opted-in users
  const userStats: Map<
    string,
    { totalMinutes: number; totalSessions: number }
  > = new Map();

  for (const userId of optedInUserIds) {
    const stats = await db.query.dailyStats.findMany({
      where: and(
        eq(dailyStats.userId, userId),
        sql`${dailyStats.date} >= ${weekStartStr}`
      ),
    });

    const totalMinutes = stats.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0);
    const totalSessions = stats.reduce(
      (sum, s) => sum + (s.sessionsCount ?? 0),
      0
    );

    userStats.set(userId, { totalMinutes, totalSessions });
  }

  // Get user details and settings for opted-in users
  const entries: LeaderboardEntry[] = [];

  for (const userId of optedInUserIds) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const settings = optedInSettings.find((s) => s.userId === userId);
    const stats = userStats.get(userId);

    if (user && settings && stats) {
      const isAnonymous = settings.showAnonymously ?? true;
      const displayName = isAnonymous
        ? generateAnonymousName(userId)
        : user.firstName + (user.lastName ? ` ${user.lastName.charAt(0)}.` : '');

      entries.push({
        rank: 0, // Will be assigned after sorting
        displayName,
        isAnonymous,
        totalSessions: stats.totalSessions,
        totalMinutes: stats.totalMinutes,
        streak: user.streak ?? 0,
        evolutionStage: user.evolutionStage ?? 'owlet',
        isCurrentUser: userId === dbUser.id,
      });
    }
  }

  // Sort by total minutes (primary) and streak (secondary)
  entries.sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) {
      return b.totalMinutes - a.totalMinutes;
    }
    return b.streak - a.streak;
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Limit to top 20
  const topEntries = entries.slice(0, 20);

  // If current user is opted in but not in top 20, add them
  if (
    userSettings.isOptedIn &&
    !topEntries.some((e) => e.isCurrentUser) &&
    entries.some((e) => e.isCurrentUser)
  ) {
    const currentUserEntry = entries.find((e) => e.isCurrentUser);
    if (currentUserEntry) {
      topEntries.push(currentUserEntry);
    }
  }

  const response: ApiResponse<LeaderboardResponse> = {
    success: true,
    data: {
      entries: topEntries,
      userSettings,
      period: 'weekly',
      updatedAt: now.toISOString(),
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/leaderboard/opt-in
 * Opt-in to leaderboard (GDPR consent)
 *
 * Request body:
 * - anonymous: boolean (default true) - show as "Participant #XXX"
 */
leaderboard.post('/opt-in', zValidator('json', optInSchema), async (c) => {
  const data = c.req.valid('json');
  const authUser = c.get('user');
  const db = getDatabase();

  // Find current user (support both TG and VK)
  const dbUser = await findUserByAuthPayload(authUser);

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const now = new Date().toISOString();

  // Check if settings exist
  const existing = await db.query.leaderboardSettings.findFirst({
    where: eq(leaderboardSettings.userId, dbUser.id),
  });

  if (existing) {
    // Update existing settings
    await db
      .update(leaderboardSettings)
      .set({
        isOptedIn: true,
        showAnonymously: data.anonymous,
        optedInAt: now,
        optedOutAt: null,
        updatedAt: now,
      })
      .where(eq(leaderboardSettings.id, existing.id));
  } else {
    // Create new settings
    await db.insert(leaderboardSettings).values({
      id: nanoid(),
      userId: dbUser.id,
      isOptedIn: true,
      showAnonymously: data.anonymous,
      optedInAt: now,
      updatedAt: now,
    });
  }

  console.log(
    `[Leaderboard] User ${dbUser.id} opted in (anonymous: ${data.anonymous})`
  );

  const response: ApiResponse<{ success: boolean }> = {
    success: true,
    data: { success: true },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/leaderboard/opt-out
 * Opt-out from leaderboard (GDPR withdrawal)
 *
 * GDPR Article 7(3): Withdrawal must be as easy as giving consent
 */
leaderboard.post('/opt-out', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  // Find current user (support both TG and VK)
  const dbUser = await findUserByAuthPayload(authUser);

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const now = new Date().toISOString();

  // Update settings (don't delete for audit trail)
  const existing = await db.query.leaderboardSettings.findFirst({
    where: eq(leaderboardSettings.userId, dbUser.id),
  });

  if (existing) {
    await db
      .update(leaderboardSettings)
      .set({
        isOptedIn: false,
        optedOutAt: now,
        updatedAt: now,
      })
      .where(eq(leaderboardSettings.id, existing.id));
  }

  console.log(`[Leaderboard] User ${dbUser.id} opted out`);

  const response: ApiResponse<{ success: boolean }> = {
    success: true,
    data: { success: true },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * GET /api/leaderboard/settings
 * Get current user's leaderboard settings
 */
leaderboard.get('/settings', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  // Find current user (support both TG and VK)
  const dbUser = await findUserByAuthPayload(authUser);

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  const settings = await getUserSettings(db, dbUser.id);

  const response: ApiResponse<LeaderboardSettings> = {
    success: true,
    data: settings,
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default leaderboard;
