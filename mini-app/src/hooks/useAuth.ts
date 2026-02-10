/**
 * useAuth Hook - Secure Authentication for Telegram Mini Apps
 * ============================================================
 * Authentication hook using TanStack Query for Telegram Mini App.
 *
 * Security Architecture:
 * - NO refresh tokens stored in localStorage
 * - Re-authentication via Telegram initData when token expires
 * - Memory-only token storage (XSS safe)
 *
 * @see client.ts for token management details
 * @module @sleepcore/mini-app/hooks
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, tokenManager, queryKeys } from '@/api';
import type { AuthUser } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { telegram } from '@/services/telegram';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  authenticate: () => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    isAuthenticating,
    authError,
    setUser,
    setAuthenticating,
    setAuthError,
    logout: storeLogout,
  } = useAuthStore();

  // Query for getting current user (after auth)
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const response = await apiClient.request<AuthUser>('/auth/me');
      return response;
    },
    enabled: isAuthenticated && !!tokenManager.getAccessToken(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update store when user data changes
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  // Mutation for initial authentication
  const authMutation = useMutation({
    mutationFn: async () => {
      return apiClient.authenticate();
    },
    onSuccess: (data) => {
      setUser(data.user as AuthUser);
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
    onError: (error) => {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    },
  });

  /**
   * Authenticate with Telegram initData
   *
   * Security: NO refresh tokens used. When token expires,
   * re-authentication happens automatically via initData.
   */
  const authenticate = useCallback(async () => {
    // Check if we're in Telegram
    if (!telegram.isInTelegram() && !import.meta.env.DEV) {
      setAuthError('This app must be opened from Telegram');
      return;
    }

    // Check if already authenticated with valid token
    if (isAuthenticated && !tokenManager.isTokenExpired()) {
      await refetchUser();
      return;
    }

    // Clean up any legacy refresh tokens from localStorage
    // (from previous versions that stored them insecurely)
    tokenManager.clearTokens();

    // Full authentication with Telegram initData
    // This is the ONLY authentication method - no refresh tokens
    setAuthenticating(true);
    await authMutation.mutateAsync();
  }, [isAuthenticated, authMutation, refetchUser, setAuthenticating, setAuthError]);

  // Logout
  const logout = useCallback(() => {
    tokenManager.clearTokens();
    storeLogout();
    queryClient.clear();
  }, [storeLogout, queryClient]);

  // Auto-authenticate on mount if in Telegram
  // Intentionally runs once on mount - adding deps would cause re-authentication loops
  useEffect(() => {
    if (!isAuthenticated && !isAuthenticating && telegram.isInTelegram()) {
      authenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    isAuthenticated,
    isAuthenticating: isAuthenticating || authMutation.isPending,
    authError,
    authenticate,
    logout,
  };
};

export default useAuth;
