/**
 * API Types for VK Mini App
 * =========================
 * Type definitions for API responses.
 * Matches the Telegram mini-app types for code reuse.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/api
 */

/**
 * Authenticated user from VK
 */
export interface AuthUser {
  id: string;
  vkId: number;
  firstName: string;
  lastName?: string;
  evolutionStage: 'owlet' | 'young_owl' | 'wise_owl' | 'master';
  xp: number;
  level: number;
  streak?: number;
}

/**
 * User profile with full data
 */
export interface UserProfile {
  id: string;
  vkId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: string;
  evolutionStage: 'owlet' | 'young_owl' | 'wise_owl' | 'master';
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveAt?: string;
  createdAt: string;
}

/**
 * Breathing session record
 */
export interface BreathingSession {
  id: string;
  patternId: string;
  patternName: string;
  cycles: number;
  duration: number; // seconds
  completedAt: string;
}

/**
 * Breathing statistics
 */
export interface BreathingStats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  favoritePattern?: string;
  thisWeek: {
    sessions: number;
    minutes: number;
  };
}

/**
 * Quest (daily/weekly challenge)
 */
export interface Quest {
  id: string;
  type: 'daily' | 'weekly' | 'milestone';
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number; // XP
  status: 'active' | 'completed' | 'expired';
  expiresAt?: string;
}

/**
 * Badge (achievement)
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

/**
 * Evolution stage details
 */
export interface Evolution {
  stage: 'owlet' | 'young_owl' | 'wise_owl' | 'master';
  xp: number;
  level: number;
  xpToNextLevel: number;
  progressPercent: number;
  stageProgress: {
    current: number;
    next?: string;
    xpRequired: number;
  };
}

/**
 * Leaderboard entry
 * Matches API response from /leaderboard/weekly
 */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  isAnonymous: boolean;
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  evolutionStage: string;
  isCurrentUser: boolean;
}

/**
 * Leaderboard settings
 */
export interface LeaderboardSettings {
  isOptedIn: boolean;
  showAnonymously: boolean;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userSettings: LeaderboardSettings;
  period: 'weekly' | 'monthly' | 'allTime';
  updatedAt: string;
}

/**
 * Sync action types
 */
export type SyncAction = 'create' | 'update' | 'delete';

/**
 * Sync change for offline-first
 */
export interface SyncChange {
  entity: 'session' | 'profile' | 'quest' | 'badge';
  action: SyncAction;
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Sync response
 */
export interface SyncResponse {
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
