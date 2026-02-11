/**
 * Query Keys Factory
 * ==================
 * Centralized, type-safe query keys for TanStack Query.
 * Same pattern as Telegram mini-app for consistency.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/api
 */

/**
 * Query keys factory
 * Hierarchical structure for easy cache invalidation
 */
export const queryKeys = {
  /**
   * Auth-related queries
   */
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  /**
   * User-related queries
   */
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    evolution: () => [...queryKeys.user.all, 'evolution'] as const,
    quests: () => [...queryKeys.user.all, 'quests'] as const,
    badges: () => [...queryKeys.user.all, 'badges'] as const,
  },

  /**
   * Breathing-related queries
   */
  breathing: {
    all: ['breathing'] as const,
    sessions: (page?: number) =>
      [...queryKeys.breathing.all, 'sessions', page] as const,
    stats: () => [...queryKeys.breathing.all, 'stats'] as const,
    history: (days?: number) =>
      [...queryKeys.breathing.all, 'history', days] as const,
  },

  /**
   * Sync-related queries
   */
  sync: {
    all: ['sync'] as const,
    status: () => [...queryKeys.sync.all, 'status'] as const,
    pending: () => [...queryKeys.sync.all, 'pending'] as const,
  },

  /**
   * Leaderboard-related queries
   */
  leaderboard: {
    all: ['leaderboard'] as const,
    weekly: () => [...queryKeys.leaderboard.all, 'weekly'] as const,
    monthly: () => [...queryKeys.leaderboard.all, 'monthly'] as const,
    settings: () => [...queryKeys.leaderboard.all, 'settings'] as const,
  },
} as const;

export default queryKeys;
