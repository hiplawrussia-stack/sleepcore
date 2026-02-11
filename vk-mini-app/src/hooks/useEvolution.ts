/**
 * useEvolution Hook
 * =================
 * Hook for fetching user evolution, quests, and badges.
 * Reuses the same pattern as Telegram mini-app.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/hooks
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import { EvolutionSchema, QuestSchema, BadgeSchema } from '@/api/schemas';
import type { Evolution, Quest, Badge } from '@/api';
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

export default useEvolution;
