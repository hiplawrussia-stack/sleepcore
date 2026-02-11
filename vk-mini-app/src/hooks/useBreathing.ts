/**
 * useBreathing Hook
 * =================
 * Hook for breathing sessions and statistics.
 * Reuses the same pattern as Telegram mini-app.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import { BreathingSessionSchema, BreathingStatsSchema } from '@/api/schemas';
import type { BreathingSession } from '@/api';
import { z } from 'zod';
import { vk } from '@/services/vk';

/**
 * Session log request
 */
interface LogSessionRequest {
  patternId: string;
  patternName: string;
  cycles: number;
  duration: number;
}

/**
 * useBreathing - Main hook for breathing functionality
 */
export const useBreathing = () => {
  const queryClient = useQueryClient();

  // Fetch breathing stats
  const statsQuery = useQuery({
    queryKey: queryKeys.breathing.stats(),
    queryFn: async () => {
      return apiClient.requestValidated('/breathing/stats', BreathingStatsSchema);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch session history
  const historyQuery = useQuery({
    queryKey: queryKeys.breathing.sessions(),
    queryFn: async () => {
      return apiClient.requestValidated(
        '/breathing/sessions',
        z.array(BreathingSessionSchema)
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Mutation for logging sessions
  const logMutation = useMutation({
    mutationFn: async (session: LogSessionRequest) => {
      return apiClient.request<BreathingSession>('/breathing/sessions', {
        method: 'POST',
        body: session,
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.breathing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.evolution() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.quests() });

      // Haptic feedback on success
      vk.hapticFeedback('notification', 'success');
    },
    onError: () => {
      // Haptic feedback on error
      vk.hapticFeedback('notification', 'error');
    },
  });

  /**
   * Log a completed breathing session
   */
  const logSession = async (session: LogSessionRequest) => {
    return logMutation.mutateAsync(session);
  };

  return {
    stats: statsQuery.data,
    history: historyQuery.data || [],
    isLoading: statsQuery.isLoading || historyQuery.isLoading,
    isLogging: logMutation.isPending,
    logSession,
    refetch: () => {
      statsQuery.refetch();
      historyQuery.refetch();
    },
  };
};

export default useBreathing;
