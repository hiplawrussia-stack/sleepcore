/**
 * useSleepStats Hook
 * ==================
 * TanStack Query hooks for sleep data visualization.
 * Fetches sleep sessions and aggregated statistics from wearables.
 *
 * @module @sleepcore/mini-app/hooks/useSleepStats
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { SleepStats, SleepSession } from '@/api';
import { SleepStatsSchema, SleepSessionsResponseSchema } from '@/api/schemas';
import { useAuthStore } from '@/store/authStore';

// ========== useSleepStats ==========

interface UseSleepStatsReturn {
  stats: SleepStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const useSleepStats = (): UseSleepStatsReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.sleep.stats(),
    queryFn: async () => {
      return apiClient.requestValidated('/sleep/stats', SleepStatsSchema);
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes - sleep data changes infrequently
  });

  return {
    stats: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== useSleepSessions ==========

interface UseSleepSessionsOptions {
  limit?: number;
  offset?: number;
  days?: number;
}

interface UseSleepSessionsReturn {
  sessions: SleepSession[] | undefined;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const useSleepSessions = (
  options: UseSleepSessionsOptions = {}
): UseSleepSessionsReturn => {
  const { isAuthenticated } = useAuthStore();
  const { limit = 7, offset = 0, days = 7 } = options;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.sleep.sessions({ limit, offset, days }),
    queryFn: async () => {
      return apiClient.requestValidated(
        `/sleep/sessions?limit=${limit}&offset=${offset}&days=${days}`,
        SleepSessionsResponseSchema
      );
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    sessions: data?.sessions,
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== Combined Hook ==========

interface UseSleepReturn {
  stats: SleepStats | undefined;
  sessions: SleepSession[] | undefined;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  refetchStats: () => Promise<unknown>;
  refetchSessions: () => Promise<unknown>;
}

export const useSleep = (options: UseSleepSessionsOptions = {}): UseSleepReturn => {
  const {
    stats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
    refetch: refetchStats,
  } = useSleepStats();

  const {
    sessions,
    isLoading: isLoadingSessions,
    isError: isErrorSessions,
    refetch: refetchSessions,
  } = useSleepSessions(options);

  return {
    stats,
    sessions,
    isLoading: isLoadingStats || isLoadingSessions,
    isError: isErrorStats || isErrorSessions,
    hasData: (stats?.sessionsThisWeek ?? 0) > 0 || (sessions?.length ?? 0) > 0,
    refetchStats,
    refetchSessions,
  };
};

export default useSleep;
