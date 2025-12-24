/**
 * Database Schema
 * ===============
 * Drizzle ORM schema for SQLite database.
 * Designed to work alongside existing bot database.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Users table
 * Stores Telegram user information and gamification state
 */
export const users = sqliteTable('api_users', {
  id: text('id').primaryKey(),
  telegramId: integer('telegram_id').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  username: text('username'),
  languageCode: text('language_code').default('ru'),
  isPremium: integer('is_premium', { mode: 'boolean' }).default(false),

  // Gamification
  evolutionStage: text('evolution_stage').default('owlet'),
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  streak: integer('streak').default(0),
  longestStreak: integer('longest_streak').default(0),

  // Timestamps
  lastActiveAt: text('last_active_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Breathing Sessions table
 * Logs completed breathing exercises from Mini App
 */
export const breathingSessions = sqliteTable('api_breathing_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  patternId: text('pattern_id').notNull(),
  patternName: text('pattern_name').notNull(),
  cycles: integer('cycles').notNull(),
  duration: integer('duration').notNull(), // seconds

  // Metadata
  completedAt: text('completed_at').notNull(),
  syncedAt: text('synced_at'),
});

/**
 * User Badges table
 * Tracks earned badges
 */
export const userBadges = sqliteTable('api_user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  badgeId: text('badge_id').notNull(),
  earnedAt: text('earned_at').notNull(),
});

/**
 * Active Quests table
 * Tracks user's active quests and progress
 */
export const userQuests = sqliteTable('api_user_quests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  questId: text('quest_id').notNull(),
  progress: integer('progress').default(0),
  target: integer('target').notNull(),
  status: text('status').default('active'), // active, completed, expired
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  expiresAt: text('expires_at'),
});

/**
 * Sync Log table
 * Tracks sync operations for offline-first support
 */
export const syncLog = sqliteTable('api_sync_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  entity: text('entity').notNull(), // session, profile, quest, badge
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // create, update, delete
  data: text('data'), // JSON
  timestamp: integer('timestamp').notNull(),
  syncedAt: text('synced_at'),
});

/**
 * Daily Stats table
 * Aggregated daily statistics for faster queries
 */
export const dailyStats = sqliteTable('api_daily_stats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  date: text('date').notNull(), // YYYY-MM-DD
  sessionsCount: integer('sessions_count').default(0),
  totalMinutes: integer('total_minutes').default(0),
  patterns: text('patterns'), // JSON array of pattern IDs
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type BreathingSession = typeof breathingSessions.$inferSelect;
export type NewBreathingSession = typeof breathingSessions.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type UserQuest = typeof userQuests.$inferSelect;
export type SyncLogEntry = typeof syncLog.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
