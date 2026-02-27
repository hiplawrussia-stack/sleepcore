/**
 * Query Keys
 * ==========
 * Centralized query key factory for TanStack Query.
 * Follows 2025 best practices for type-safe query key management.
 */

export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    evolution: () => [...queryKeys.user.all, 'evolution'] as const,
    badges: () => [...queryKeys.user.all, 'badges'] as const,
    quests: () => [...queryKeys.user.all, 'quests'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },

  // Breathing
  breathing: {
    all: ['breathing'] as const,
    stats: () => [...queryKeys.breathing.all, 'stats'] as const,
    history: (params?: { limit?: number; offset?: number }) =>
      [...queryKeys.breathing.all, 'history', params] as const,
    session: (id: string) => [...queryKeys.breathing.all, 'session', id] as const,
  },

  // Sync
  sync: {
    all: ['sync'] as const,
    status: () => [...queryKeys.sync.all, 'status'] as const,
    changes: (since?: number) => [...queryKeys.sync.all, 'changes', since] as const,
  },

  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    weekly: () => [...queryKeys.leaderboard.all, 'weekly'] as const,
    monthly: () => [...queryKeys.leaderboard.all, 'monthly'] as const,
    settings: () => [...queryKeys.leaderboard.all, 'settings'] as const,
  },

  // Sleep
  sleep: {
    all: ['sleep'] as const,
    stats: () => [...queryKeys.sleep.all, 'stats'] as const,
    sessions: (params?: { limit?: number; offset?: number; days?: number }) =>
      [...queryKeys.sleep.all, 'sessions', params] as const,
    session: (id: string) => [...queryKeys.sleep.all, 'session', id] as const,
  },
} as const;

// Type helpers
export type QueryKeys = typeof queryKeys;
