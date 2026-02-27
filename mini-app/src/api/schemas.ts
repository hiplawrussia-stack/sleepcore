/**
 * API Response Schemas (Zod)
 * ==========================
 * Runtime validation schemas for API responses.
 * Provides type safety at runtime, not just compile time.
 *
 * IEC 62304 Compliance:
 * - Input validation per §5.5.3
 * - Defense against malformed data
 *
 * @module @sleepcore/mini-app/api/schemas
 */

import { z } from 'zod';

// ========== Common Schemas ==========

/** Sanitized string that rejects potentially dangerous content */
const SafeStringSchema = z.string().max(1000).transform((val) => {
  // Basic sanitization - remove HTML tags
  return val.replace(/<[^>]*>/g, '');
});

/** ISO date string */
const DateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date string' }
);

// ========== User Schemas ==========

export const EvolutionStageSchema = z.enum([
  'owlet',
  'young_owl',
  'wise_owl',
  'master',
]);

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.number().int().positive(),
  firstName: SafeStringSchema,
  lastName: SafeStringSchema.optional(),
  username: SafeStringSchema.optional(),
  evolutionStage: EvolutionStageSchema,
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  streak: z.number().int().min(0),
  badges: z.array(z.string()).max(100),
  createdAt: DateStringSchema,
  updatedAt: DateStringSchema,
});

export const EvolutionStatusSchema = z.object({
  currentStage: z.string(),
  stageName: SafeStringSchema,
  stageEmoji: z.string().max(10),
  daysActive: z.number().int().min(0),
  progress: z.number().min(0).max(100),
  nextStage: z.string().nullable(),
  daysToNext: z.number().int().min(0).nullable(),
});

export const UserSettingsSchema = z.object({
  hapticsEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  reminderTime: z.string().optional(),
  preferredPatterns: z.array(z.string()).max(50),
});

// ========== Breathing Schemas ==========

export const BreathingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  patternId: z.string().max(100),
  patternName: SafeStringSchema,
  cycles: z.number().int().min(1).max(100),
  duration: z.number().int().min(0).max(3600), // Max 1 hour
  completedAt: DateStringSchema,
  syncedAt: DateStringSchema.optional(),
});

export const BreathingStatsSchema = z.object({
  totalSessions: z.number().int().min(0),
  totalMinutes: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  favoritePattern: z.string().nullable(),
  weeklyProgress: z.array(z.number().int().min(0)).max(7),
  lastSessionAt: DateStringSchema.nullable(),
});

export const LogSessionResponseSchema = z.object({
  id: z.string().uuid(),
  xpGain: z.number().int().min(0),
});

// ========== Gamification Schemas ==========

export const QuestStatusSchema = z.enum(['active', 'completed', 'expired']);

export const QuestSchema = z.object({
  id: z.string(),
  questId: z.string(),
  title: SafeStringSchema,
  description: SafeStringSchema,
  progress: z.number().int().min(0),
  target: z.number().int().min(1),
  status: QuestStatusSchema,
  reward: z.number().int().min(0),
  startedAt: DateStringSchema,
  completedAt: DateStringSchema.optional(),
});

export const QuestsResponseSchema = z.object({
  quests: z.array(QuestSchema).max(100),
});

export const BadgeSchema = z.object({
  badgeId: z.string(),
  earnedAt: DateStringSchema,
});

export const BadgesResponseSchema = z.object({
  badges: z.array(BadgeSchema).max(100),
});

// ========== Leaderboard Schemas ==========

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  displayName: SafeStringSchema.transform((val) => val.slice(0, 50)), // Limit display name
  isAnonymous: z.boolean(),
  totalSessions: z.number().int().min(0),
  totalMinutes: z.number().int().min(0),
  streak: z.number().int().min(0),
  evolutionStage: z.string(),
  isCurrentUser: z.boolean(),
});

export const LeaderboardSettingsSchema = z.object({
  isOptedIn: z.boolean(),
  showAnonymously: z.boolean(),
});

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema).max(100),
  userSettings: LeaderboardSettingsSchema,
  period: z.enum(['weekly', 'monthly', 'allTime']),
  updatedAt: DateStringSchema,
});

// ========== Sync Schemas ==========

export const SyncEntitySchema = z.enum(['session', 'profile', 'quest', 'badge']);

export const SyncChangeSchema = z.object({
  entity: SyncEntitySchema,
  action: z.enum(['create', 'update', 'delete']),
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.number().int().positive(),
});

export const SyncPushResultSchema = z.object({
  localId: z.string(),
  serverId: z.string(),
  status: z.enum(['synced', 'error']),
});

export const SyncPushResponseSchema = z.object({
  results: z.array(SyncPushResultSchema),
  serverTime: z.number().int().positive(),
});

export const SyncChangesResponseSchema = z.object({
  changes: z.array(SyncChangeSchema).max(1000),
  serverTime: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const SyncStatusSchema = z.object({
  lastSyncTime: z.number().int().positive().nullable(),
  counts: z.object({
    sessions: z.number().int().min(0),
  }),
});

// ========== Auth Schemas ==========

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.number().int().positive(),
  firstName: SafeStringSchema,
  lastName: SafeStringSchema.optional(),
  username: SafeStringSchema.optional(),
  evolutionStage: z.string(),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  streak: z.number().int().min(0).optional(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: AuthUserSchema,
});

// ========== Sleep Schemas ==========

export const SleepTrendSchema = z.enum(['improving', 'stable', 'declining']);

export const SleepSessionSchema = z.object({
  id: z.string(),
  date: z.string(),
  startTime: DateStringSchema,
  endTime: DateStringSchema,
  source: z.string(),
  tst: z.number().nullable(),
  tib: z.number().nullable(),
  se: z.number().nullable(),
  waso: z.number().nullable(),
  sol: z.number().nullable(),
  awakenings: z.number().nullable(),
  stageWake: z.number().nullable(),
  stageLight: z.number().nullable(),
  stageDeep: z.number().nullable(),
  stageRem: z.number().nullable(),
  hrvMeanRmssd: z.number().nullable(),
  spo2Mean: z.number().nullable(),
  spo2Min: z.number().nullable(),
  restingHeartRate: z.number().nullable(),
});

export const SleepSessionsResponseSchema = z.object({
  sessions: z.array(SleepSessionSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const SleepStatsSchema = z.object({
  avgSleepEfficiency: z.number().nullable(),
  avgTotalSleepTime: z.number().nullable(),
  avgTimeInBed: z.number().nullable(),
  avgSleepOnsetLatency: z.number().nullable(),
  avgWaso: z.number().nullable(),
  avgAwakenings: z.number().nullable(),
  avgStageDeep: z.number().nullable(),
  avgStageRem: z.number().nullable(),
  avgStageLight: z.number().nullable(),
  avgHrvRmssd: z.number().nullable(),
  avgRestingHeartRate: z.number().nullable(),
  avgSpo2: z.number().nullable(),
  minSpo2: z.number().nullable(),
  seTrend: SleepTrendSchema.nullable(),
  tstTrend: SleepTrendSchema.nullable(),
  totalSessions: z.number().int().min(0),
  sessionsThisWeek: z.number().int().min(0),
  lastSyncAt: DateStringSchema.nullable(),
});

// ========== Type Exports ==========

export type ValidatedUserProfile = z.infer<typeof UserProfileSchema>;
export type ValidatedEvolutionStatus = z.infer<typeof EvolutionStatusSchema>;
export type ValidatedBreathingStats = z.infer<typeof BreathingStatsSchema>;
export type ValidatedQuest = z.infer<typeof QuestSchema>;
export type ValidatedLeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type ValidatedAuthResponse = z.infer<typeof AuthResponseSchema>;

// ========== Validation Helpers ==========

/**
 * Safely validate API response with fallback
 * Logs validation errors for debugging but doesn't crash
 */
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('[API Schema] Validation failed:', error.issues);
    }
    return fallback;
  }
}

/**
 * Strict validation that throws on failure
 * Use for critical data that must be valid
 */
export function validateResponseStrict<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}
