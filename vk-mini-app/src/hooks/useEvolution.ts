/**
 * useEvolution Hook
 * =================
 * Hook for fetching user evolution, quests, and badges.
 * Reuses the same pattern as Telegram mini-app.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import {
  EvolutionSchema,
  QuestSchema,
  BadgeSchema,
  LeaderboardResponseSchema,
} from '@/api/schemas';
import type { LeaderboardEntry, LeaderboardSettings } from '@/api';
import { z } from 'zod';

/**
 * useEvolution - Fetch user evolution data
 */
export const useEvolution = () => {
  const query = useQuery({
    queryKey: queryKeys.user.evolution(),
    queryFn: async () => {
      return apiClient.requestValidated('/user/evolution', EvolutionSchema);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    evolution: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/**
 * useQuests - Fetch active quests
 */
export const useQuests = () => {
  const query = useQuery({
    queryKey: queryKeys.user.quests(),
    queryFn: async () => {
      return apiClient.requestValidated(
        '/user/quests',
        z.array(QuestSchema)
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    quests: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/**
 * useBadges - Fetch earned badges
 */
export const useBadges = () => {
  const query = useQuery({
    queryKey: queryKeys.user.badges(),
    queryFn: async () => {
      return apiClient.requestValidated(
        '/user/badges',
        z.array(BadgeSchema)
      );
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    badges: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/**
 * useGamification - Combined hook for all gamification data
 */
export const useGamification = () => {
  const queryClient = useQueryClient();

  const evolutionQuery = useEvolution();
  const questsQuery = useQuests();
  const badgesQuery = useBadges();

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.user.evolution() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.quests() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.badges() }),
    ]);
  };

  return {
    evolution: evolutionQuery.evolution,
    quests: questsQuery.quests,
    badges: badgesQuery.badges,
    isLoading:
      evolutionQuery.isLoading ||
      questsQuery.isLoading ||
      badgesQuery.isLoading,
    refetchAll,
  };
};

// ========== useLeaderboard ==========

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[] | undefined;
  settings: LeaderboardSettings | undefined;
  period: 'weekly' | 'monthly' | 'allTime' | undefined;
  updatedAt: string | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  optIn: (anonymous: boolean) => Promise<void>;
  optOut: () => Promise<void>;
  isOptingIn: boolean;
  isOptingOut: boolean;
}

/**
 * useLeaderboard - GDPR-compliant opt-in leaderboard
 *
 * Research basis:
 * - GDPR Article 7: Explicit consent required for data processing
 * - University of Oregon: Cooperative/opt-in reduces anxiety
 * - Syrenis: Pseudonymous avatars preserve privacy + engagement
 */
export const useLeaderboard = (): UseLeaderboardReturn => {
  const queryClient = useQueryClient();

  // Fetch leaderboard data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.leaderboard.weekly(),
    queryFn: async () => {
      return apiClient.requestValidated('/leaderboard/weekly', LeaderboardResponseSchema);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Opt-in mutation
  const optInMutation = useMutation<void, Error, boolean>({
    mutationFn: async (anonymous: boolean): Promise<void> => {
      await apiClient.request('/leaderboard/opt-in', {
        method: 'POST',
        body: JSON.stringify({ anonymous }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    },
  });

  // Opt-out mutation (GDPR Article 7(3): Withdrawal must be as easy as giving consent)
  const optOutMutation = useMutation<void, Error, void>({
    mutationFn: async (): Promise<void> => {
      await apiClient.request('/leaderboard/opt-out', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    },
  });

  return {
    entries: data?.entries,
    settings: data?.userSettings,
    period: data?.period,
    updatedAt: data?.updatedAt,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    optIn: optInMutation.mutateAsync,
    optOut: optOutMutation.mutateAsync,
    isOptingIn: optInMutation.isPending,
    isOptingOut: optOutMutation.isPending,
  };
};

export default useEvolution;
