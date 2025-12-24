/**
 * useEvolution Hook
 * =================
 * TanStack Query hook for evolution status and gamification data.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { EvolutionStatus, Quest, Badge } from '@/api';
import { useAuthStore } from '@/store/authStore';

// ========== useEvolution ==========

interface UseEvolutionReturn {
  evolution: EvolutionStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const useEvolution = (): UseEvolutionReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.evolution(),
    queryFn: async () => {
      return apiClient.request<EvolutionStatus>('/user/evolution');
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
  refetch: () => Promise<unknown>;
}

export const useQuests = (): UseQuestsReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.quests(),
    queryFn: async () => {
      const response = await apiClient.request<{ quests: Quest[] }>('/user/quests');
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
  refetch: () => Promise<unknown>;
}

export const useBadges = (): UseBadgesReturn => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.user.badges(),
    queryFn: async () => {
      const response = await apiClient.request<{ badges: Badge[] }>('/user/badges');
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

export default useEvolution;
