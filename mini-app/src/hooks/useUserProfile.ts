/**
 * useUserProfile Hook
 * ===================
 * TanStack Query hook for user profile data.
 * Includes optimistic updates for profile changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { UserProfile } from '@/api';
import { useAuthStore } from '@/store/authStore';

interface UseUserProfileReturn {
  profile: UserProfile | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isUpdating: boolean;
  refetch: () => Promise<unknown>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Fetch profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      return apiClient.request<UserProfile>('/user/profile');
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update profile mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      return apiClient.request<{ updated: boolean }>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.user.profile() });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(
        queryKeys.user.profile()
      );

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKeys.user.profile(), {
          ...previousProfile,
          ...newData,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousProfile };
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.user.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });

  const updateProfile = async (data: Partial<UserProfile>) => {
    await updateMutation.mutateAsync(data);
  };

  return {
    profile,
    isLoading,
    isError,
    error: error as Error | null,
    updateProfile,
    isUpdating: updateMutation.isPending,
    refetch,
  };
};

export default useUserProfile;
