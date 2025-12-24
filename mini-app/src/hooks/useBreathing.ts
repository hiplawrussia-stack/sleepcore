/**
 * useBreathing Hook
 * =================
 * TanStack Query hooks for breathing sessions and stats.
 * Includes optimistic updates for session logging.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type {
  BreathingStats,
  BreathingSession,
  LogSessionRequest,
  LogSessionResponse,
} from '@/api';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

// ========== useBreathingStats ==========

interface UseBreathingStatsReturn {
  stats: BreathingStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const useBreathingStats = (): UseBreathingStatsReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.breathing.stats(),
    queryFn: async () => {
      return apiClient.request<BreathingStats>('/breathing/stats');
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes - stats change more often
  });

  return {
    stats: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== useBreathingHistory ==========

interface UseBreathingHistoryOptions {
  limit?: number;
  offset?: number;
}

interface UseBreathingHistoryReturn {
  sessions: BreathingSession[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const useBreathingHistory = (
  options: UseBreathingHistoryOptions = {}
): UseBreathingHistoryReturn => {
  const { isAuthenticated } = useAuthStore();
  const { limit = 20, offset = 0 } = options;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.breathing.history({ limit, offset }),
    queryFn: async () => {
      return apiClient.request<{ sessions: BreathingSession[]; hasMore: boolean }>(
        `/breathing/history?limit=${limit}&offset=${offset}`
      );
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    sessions: data?.sessions,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== useLogSession ==========

interface UseLogSessionReturn {
  logSession: (session: LogSessionRequest) => Promise<LogSessionResponse>;
  isLogging: boolean;
  lastXpGain: number | null;
}

export const useLogSession = (): UseLogSessionReturn => {
  const queryClient = useQueryClient();
  const { addPendingChange, isOnline } = useSyncStore();

  const mutation = useMutation({
    mutationFn: async (session: LogSessionRequest) => {
      // If offline, queue for later
      if (!isOnline) {
        const localId = `local_${Date.now()}`;
        addPendingChange({
          localId,
          entity: 'session',
          action: 'create',
          data: session as unknown as Record<string, unknown>,
          clientTimestamp: Date.now(),
        });
        return { id: localId, xpGain: 0 } as LogSessionResponse;
      }

      return apiClient.request<LogSessionResponse>('/breathing/session', {
        method: 'POST',
        body: JSON.stringify(session),
      });
    },
    onMutate: async (newSession) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.breathing.stats() });

      // Snapshot previous stats
      const previousStats = queryClient.getQueryData<BreathingStats>(
        queryKeys.breathing.stats()
      );

      // Optimistically update stats
      if (previousStats) {
        const estimatedXpGain = Math.floor(newSession.duration / 60) * 5 + newSession.cycles * 2;

        queryClient.setQueryData<BreathingStats>(queryKeys.breathing.stats(), {
          ...previousStats,
          totalSessions: previousStats.totalSessions + 1,
          totalMinutes: previousStats.totalMinutes + Math.floor(newSession.duration / 60),
          lastSessionAt: new Date().toISOString(),
        });

        return { previousStats, estimatedXpGain };
      }

      return { previousStats };
    },
    onError: (_err, _newSession, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.breathing.stats(), context.previousStats);
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.breathing.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.breathing.history({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.evolution() });
    },
  });

  return {
    logSession: mutation.mutateAsync,
    isLogging: mutation.isPending,
    lastXpGain: mutation.data?.xpGain ?? null,
  };
};

// ========== Combined Hook ==========

interface UseBreathingReturn {
  stats: BreathingStats | undefined;
  isLoadingStats: boolean;
  logSession: (session: LogSessionRequest) => Promise<LogSessionResponse>;
  isLogging: boolean;
  lastXpGain: number | null;
  refetchStats: () => Promise<unknown>;
}

export const useBreathing = (): UseBreathingReturn => {
  const {
    stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useBreathingStats();

  const { logSession, isLogging, lastXpGain } = useLogSession();

  return {
    stats,
    isLoadingStats,
    logSession,
    isLogging,
    lastXpGain,
    refetchStats,
  };
};

export default useBreathing;
