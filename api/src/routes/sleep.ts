/**
 * Sleep Routes
 * ============
 * API endpoints for sleep data visualization in mini-app.
 * Aggregates data from wearable devices and manual diary entries.
 *
 * @packageDocumentation
 * @module api/routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, gte, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { findUserByAuthPayload } from '../utils/index.js';
import { getDatabase } from '../db/index.js';
import { wearableSleepSessions } from '../db/wearable-schema.js';
import type { ApiResponse } from '../types/index.js';

const sleep = new Hono();

// Apply auth middleware to all routes
sleep.use('*', authMiddleware);

// ============================================================================
// Types
// ============================================================================

interface SleepSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  source: string;
  tst: number | null;        // Total Sleep Time (minutes)
  tib: number | null;        // Time In Bed (minutes)
  se: number | null;         // Sleep Efficiency (%)
  waso: number | null;       // Wake After Sleep Onset (minutes)
  sol: number | null;        // Sleep Onset Latency (minutes)
  awakenings: number | null;
  // Sleep stages (percentages)
  stageWake: number | null;
  stageLight: number | null;
  stageDeep: number | null;
  stageRem: number | null;
  // HRV
  hrvMeanRmssd: number | null;
  // SpO2
  spo2Mean: number | null;
  spo2Min: number | null;
  // Additional
  restingHeartRate: number | null;
}

interface SleepStats {
  // Aggregates (last 7 days)
  avgSleepEfficiency: number | null;
  avgTotalSleepTime: number | null;
  avgTimeInBed: number | null;
  avgSleepOnsetLatency: number | null;
  avgWaso: number | null;
  avgAwakenings: number | null;
  // Sleep stages (averages)
  avgStageDeep: number | null;
  avgStageRem: number | null;
  avgStageLight: number | null;
  // HRV & Heart
  avgHrvRmssd: number | null;
  avgRestingHeartRate: number | null;
  // SpO2
  avgSpo2: number | null;
  minSpo2: number | null;
  // Trends
  setrend: 'improving' | 'stable' | 'declining' | null;
  tstTrend: 'improving' | 'stable' | 'declining' | null;
  // Counts
  totalSessions: number;
  sessionsThisWeek: number;
  lastSyncAt: string | null;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const sessionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(7),
  offset: z.coerce.number().min(0).default(0),
  days: z.coerce.number().min(1).max(90).default(7),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate trend from array of values (newest first)
 */
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | null {
  if (values.length < 3) return null;

  const recent = values.slice(0, Math.ceil(values.length / 2));
  const older = values.slice(Math.ceil(values.length / 2));

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = recentAvg - olderAvg;
  const threshold = olderAvg * 0.05; // 5% change threshold

  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'stable';
}

/**
 * Safe average calculation
 */
function safeAvg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/sleep/sessions
 * Get sleep sessions for visualization
 */
sleep.get('/sessions', zValidator('query', sessionsQuerySchema), async (c) => {
  const { limit, offset, days } = c.req.valid('query');
  const authUser = c.get('user');

  const dbUser = await findUserByAuthPayload(authUser);
  if (!dbUser) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    }, 404);
  }

  const db = getDatabase();
  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const sessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.userId, dbUser.id),
      gte(wearableSleepSessions.startTime, daysAgo)
    ),
    orderBy: [desc(wearableSleepSessions.startTime)],
    limit,
    offset,
  });

  const formattedSessions: SleepSession[] = sessions.map(s => ({
    id: s.id,
    date: s.startTime.split('T')[0],
    startTime: s.startTime,
    endTime: s.endTime,
    source: s.source,
    tst: s.tst,
    tib: s.tib,
    se: s.se,
    waso: s.waso,
    sol: s.sol,
    awakenings: s.awakenings,
    stageWake: s.stageWake,
    stageLight: s.stageLight,
    stageDeep: s.stageDeep,
    stageRem: s.stageRem,
    hrvMeanRmssd: s.hrvMeanRmssd,
    spo2Mean: s.spo2Mean,
    spo2Min: s.spo2Min,
    restingHeartRate: s.restingHeartRate,
  }));

  // Count total for pagination
  const allSessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.userId, dbUser.id),
      gte(wearableSleepSessions.startTime, daysAgo)
    ),
    columns: { id: true },
  });

  return c.json<ApiResponse<{
    sessions: SleepSession[];
    total: number;
    hasMore: boolean;
  }>>({
    success: true,
    data: {
      sessions: formattedSessions,
      total: allSessions.length,
      hasMore: offset + limit < allSessions.length,
    },
    timestamp: Date.now(),
  });
});

/**
 * GET /api/sleep/stats
 * Get aggregated sleep statistics
 */
sleep.get('/stats', async (c) => {
  const authUser = c.get('user');

  const dbUser = await findUserByAuthPayload(authUser);
  if (!dbUser) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    }, 404);
  }

  const db = getDatabase();

  // Get sessions from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const recentSessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.userId, dbUser.id),
      gte(wearableSleepSessions.startTime, weekAgo)
    ),
    orderBy: [desc(wearableSleepSessions.startTime)],
  });

  // Get older sessions for trend calculation
  const olderSessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.userId, dbUser.id),
      gte(wearableSleepSessions.startTime, twoWeeksAgo)
    ),
    orderBy: [desc(wearableSleepSessions.startTime)],
  });

  // Total sessions count
  const allSessions = await db.query.wearableSleepSessions.findMany({
    where: eq(wearableSleepSessions.userId, dbUser.id),
    columns: { id: true, syncedAt: true },
    orderBy: [desc(wearableSleepSessions.syncedAt)],
    limit: 1,
  });

  // Calculate aggregates
  const seValues = olderSessions.map(s => s.se).filter((v): v is number => v !== null);
  const tstValues = olderSessions.map(s => s.tst).filter((v): v is number => v !== null);

  const stats: SleepStats = {
    avgSleepEfficiency: safeAvg(recentSessions.map(s => s.se)),
    avgTotalSleepTime: safeAvg(recentSessions.map(s => s.tst)),
    avgTimeInBed: safeAvg(recentSessions.map(s => s.tib)),
    avgSleepOnsetLatency: safeAvg(recentSessions.map(s => s.sol)),
    avgWaso: safeAvg(recentSessions.map(s => s.waso)),
    avgAwakenings: safeAvg(recentSessions.map(s => s.awakenings)),
    avgStageDeep: safeAvg(recentSessions.map(s => s.stageDeep)),
    avgStageRem: safeAvg(recentSessions.map(s => s.stageRem)),
    avgStageLight: safeAvg(recentSessions.map(s => s.stageLight)),
    avgHrvRmssd: safeAvg(recentSessions.map(s => s.hrvMeanRmssd)),
    avgRestingHeartRate: safeAvg(recentSessions.map(s => s.restingHeartRate)),
    avgSpo2: safeAvg(recentSessions.map(s => s.spo2Mean)),
    minSpo2: recentSessions.length > 0
      ? Math.min(...recentSessions.map(s => s.spo2Min).filter((v): v is number => v !== null))
      : null,
    setrend: calculateTrend(seValues),
    tstTrend: calculateTrend(tstValues),
    totalSessions: allSessions.length,
    sessionsThisWeek: recentSessions.length,
    lastSyncAt: allSessions[0]?.syncedAt ?? null,
  };

  // Fix minSpo2 if no valid values
  if (stats.minSpo2 === Infinity) stats.minSpo2 = null;

  return c.json<ApiResponse<SleepStats>>({
    success: true,
    data: stats,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/sleep/session/:id
 * Get single sleep session details
 */
sleep.get('/session/:id', async (c) => {
  const sessionId = c.req.param('id');
  const authUser = c.get('user');

  const dbUser = await findUserByAuthPayload(authUser);
  if (!dbUser) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    }, 404);
  }

  const db = getDatabase();

  const session = await db.query.wearableSleepSessions.findFirst({
    where: and(
      eq(wearableSleepSessions.id, sessionId),
      eq(wearableSleepSessions.userId, dbUser.id)
    ),
  });

  if (!session) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Session not found',
      timestamp: Date.now(),
    }, 404);
  }

  const formattedSession: SleepSession = {
    id: session.id,
    date: session.startTime.split('T')[0],
    startTime: session.startTime,
    endTime: session.endTime,
    source: session.source,
    tst: session.tst,
    tib: session.tib,
    se: session.se,
    waso: session.waso,
    sol: session.sol,
    awakenings: session.awakenings,
    stageWake: session.stageWake,
    stageLight: session.stageLight,
    stageDeep: session.stageDeep,
    stageRem: session.stageRem,
    hrvMeanRmssd: session.hrvMeanRmssd,
    spo2Mean: session.spo2Mean,
    spo2Min: session.spo2Min,
    restingHeartRate: session.restingHeartRate,
  };

  return c.json<ApiResponse<SleepSession>>({
    success: true,
    data: formattedSession,
    timestamp: Date.now(),
  });
});

export default sleep;
