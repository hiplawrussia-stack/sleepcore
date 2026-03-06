/**
 * useEvolution Hook
 * =================
 * TanStack Query hook for evolution status and gamification data.
 */

import { useQuery, useMutation, useQueryClient, type QueryObserverResult } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { EvolutionStatus, Quest, Badge, LeaderboardEntry, LeaderboardSettings } from '@/api';
import {
  EvolutionStatusSchema,
  QuestsResponseSchema,
  BadgesResponseSchema,
  LeaderboardResponseSchema,
} from '@/api/schemas';
import { useAuthStore } from '@/store/authStore';

// ========== useEvolution ==========

interface UseEvolutionReturn {
  evolution: EvolutionStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<EvolutionStatus, Error>>;
}

export const useEvolution = (): UseEvolutionReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.evolution(),
    queryFn: async () => {
      return apiClient.requestValidated('/user/evolution', EvolutionStatusSchema);
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    evolution: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== useQuests ==========

interface UseQuestsReturn {
  quests: Quest[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<Quest[], Error>>;
}

export const useQuests = (): UseQuestsReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.quests(),
    queryFn: async () => {
      const response = await apiClient.requestValidated('/user/quests', QuestsResponseSchema);
      return response.quests;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    quests: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== useBadges ==========

interface UseBadgesReturn {
  badges: Badge[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<Badge[], Error>>;
}

export const useBadges = (): UseBadgesReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.badges(),
    queryFn: async () => {
      const response = await apiClient.requestValidated('/user/badges', BadgesResponseSchema);
      return response.badges;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    badges: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};

// ========== Combined Hook ==========

interface UseGamificationReturn {
  evolution: EvolutionStatus | undefined;
  quests: Quest[] | undefined;
  badges: Badge[] | undefined;
  isLoading: boolean;
  refetchAll: () => Promise<void>;
}

export const useGamification = (): UseGamificationReturn => {
  const {
    evolution,
    isLoading: isLoadingEvolution,
    refetch: refetchEvolution,
  } = useEvolution();

  const {
    quests,
    isLoading: isLoadingQuests,
    refetch: refetchQuests,
  } = useQuests();

  const {
    badges,
    isLoading: isLoadingBadges,
    refetch: refetchBadges,
  } = useBadges();

  const refetchAll = async () => {
    await Promise.all([refetchEvolution(), refetchQuests(), refetchBadges()]);
  };

  return {
    evolution,
    quests,
    badges,
    isLoading: isLoadingEvolution || isLoadingQuests || isLoadingBadges,
    refetchAll,
  };
};

// ========== useLeaderboard ==========

interface LeaderboardData {
  entries: LeaderboardEntry[];
  settings: LeaderboardSettings;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[] | undefined;
  settings: LeaderboardSettings | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<LeaderboardData, Error>>;
  optIn: (anonymous: boolean) => Promise<void>;
  optOut: () => Promise<void>;
}

export const useLeaderboard = (): UseLeaderboardReturn => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch leaderboard data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.leaderboard.weekly(),
    queryFn: async () => {
      const response = await apiClient.requestValidated('/leaderboard/weekly', LeaderboardResponseSchema);
      return {
        entries: response.entries,
        settings: response.userSettings,
      };
    },
    enabled: isAuthenticated,
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

  // Opt-out mutation
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
    settings: data?.settings,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    optIn: optInMutation.mutateAsync,
    optOut: optOutMutation.mutateAsync,
  };
};

export default useEvolution;
