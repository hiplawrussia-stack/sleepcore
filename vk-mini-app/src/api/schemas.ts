/**
 * API Response Schemas
 * ====================
 * Zod schemas for API response validation.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/api
 */

import { z } from 'zod';

/**
 * Auth user schema
 */
export const AuthUserSchema = z.object({
  id: z.string(),
  vkId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  evolutionStage: z.enum(['owlet', 'young_owl', 'wise_owl', 'master']),
  xp: z.number(),
  level: z.number(),
  streak: z.number().optional(),
});

/**
 * User profile schema
 */
export const UserProfileSchema = z.object({
  id: z.string(),
  vkId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  languageCode: z.string(),
  evolutionStage: z.enum(['owlet', 'young_owl', 'wise_owl', 'master']),
  xp: z.number(),
  level: z.number(),
  streak: z.number(),
  longestStreak: z.number(),
  lastActiveAt: z.string().optional(),
  createdAt: z.string(),
});

/**
 * Evolution schema
 */
export const EvolutionSchema = z.object({
  stage: z.enum(['owlet', 'young_owl', 'wise_owl', 'master']),
  xp: z.number(),
  level: z.number(),
  xpToNextLevel: z.number(),
  progressPercent: z.number(),
  stageProgress: z.object({
    current: z.number(),
    next: z.string().optional(),
    xpRequired: z.number(),
  }),
});

/**
 * Quest schema
 */
export const QuestSchema = z.object({
  id: z.string(),
  type: z.enum(['daily', 'weekly', 'milestone']),
  title: z.string(),
  description: z.string(),
  progress: z.number(),
  target: z.number(),
  reward: z.number(),
  status: z.enum(['active', 'completed', 'expired']),
  expiresAt: z.string().optional(),
});

/**
 * Badge schema
 */
export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  earnedAt: z.string(),
});

/**
 * Breathing session schema
 */
export const BreathingSessionSchema = z.object({
  id: z.string(),
  patternId: z.string(),
  patternName: z.string(),
  cycles: z.number(),
  duration: z.number(),
  completedAt: z.string(),
});

/**
 * Breathing stats schema
 */
export const BreathingStatsSchema = z.object({
  totalSessions: z.number(),
  totalMinutes: z.number(),
  averageDuration: z.number(),
  favoritePattern: z.string().optional(),
  thisWeek: z.object({
    sessions: z.number(),
    minutes: z.number(),
  }),
});

/**
 * Leaderboard entry schema
 * Matches API response from /leaderboard/weekly
 */
export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  displayName: z.string(),
  isAnonymous: z.boolean(),
  totalSessions: z.number(),
  totalMinutes: z.number(),
  streak: z.number(),
  evolutionStage: z.string(),
  isCurrentUser: z.boolean(),
});

/**
 * Leaderboard settings schema
 */
export const LeaderboardSettingsSchema = z.object({
  isOptedIn: z.boolean(),
  showAnonymously: z.boolean(),
});

/**
 * Leaderboard response schema
 * Matches API response from /leaderboard/weekly
 */
export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
  userSettings: LeaderboardSettingsSchema,
  period: z.enum(['weekly', 'monthly', 'allTime']),
  updatedAt: z.string(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Evolution = z.infer<typeof EvolutionSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
export type BreathingSession = z.infer<typeof BreathingSessionSchema>;
export type BreathingStats = z.infer<typeof BreathingStatsSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardSettings = z.infer<typeof LeaderboardSettingsSchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
