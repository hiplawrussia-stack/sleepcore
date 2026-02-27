/**
 * useAuth Hook - Secure Authentication for Telegram Mini Apps
 * ============================================================
 * Authentication hook using TanStack Query for Telegram Mini App.
 *
 * Security Architecture:
 * - NO refresh tokens stored in localStorage
 * - Re-authentication via Telegram initData when token expires
 * - Memory-only token storage (XSS safe)
 * - P1-3: Complete storage cleanup on logout (OWASP, HIPAA)
 *
 * @see client.ts for token management details
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 * @module @sleepcore/mini-app/hooks
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, tokenManager, queryKeys } from '@/api';
import type { AuthUser } from '@/api';
import { AuthUserSchema } from '@/api/schemas';
import { useAuthStore } from '@/store/authStore';
import { telegram } from '@/services/telegram';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/services/sentry';
import { clearAllUserStorage } from '@/utils/storageCleanup';
import { env } from '@/env';
import i18n from '@/i18n';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  /** API health status: null = not checked, true = healthy, false = unhealthy */
  apiHealthy: boolean | null;
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
    apiHealthy,
    setUser,
    setAuthenticating,
    setAuthError,
    setApiHealthy,
    logout: storeLogout,
  } = useAuthStore();

  // Query for getting current user (after auth)
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      return apiClient.requestValidated('/auth/me', AuthUserSchema);
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
      const authUser = data.user as AuthUser;
      setUser(authUser);
      // Set Sentry user context (ID only, no PHI)
      setSentryUser(authUser.telegramId);
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
   *
   * Flow:
   * 1. Check API health (production only)
   * 2. Authenticate via Telegram initData
   */
  const authenticate = useCallback(async () => {
    // Check if we're in Telegram
    if (!telegram.isInTelegram() && !env.DEV) {
      setAuthError(i18n.t('errors.notInTelegram'));
      return;
    }

    // Check if already authenticated with valid token
    if (isAuthenticated && !tokenManager.isTokenExpired()) {
      await refetchUser();
      return;
    }

    setAuthenticating(true);

    // Step 1: Check API health before authentication
    // Skip in dev mode to allow offline development
    if (!env.DEV) {
      const health = await apiClient.checkHealth();
      const isHealthy = health?.status === 'healthy';
      setApiHealthy(isHealthy);

      if (!isHealthy) {
        setAuthError(i18n.t('errors.apiUnavailable'));
        return;
      }
    } else {
      // In dev mode, assume API is healthy (or allow offline mode)
      setApiHealthy(true);
    }

    // Clean up any legacy refresh tokens from localStorage
    // (from previous versions that stored them insecurely)
    tokenManager.clearTokens();

    // Step 2: Full authentication with Telegram initData
    // This is the ONLY authentication method - no refresh tokens
    await authMutation.mutateAsync();
  }, [isAuthenticated, authMutation, refetchUser, setAuthenticating, setAuthError, setApiHealthy]);

  // Logout - complete session termination with storage cleanup
  // P1-3: OWASP requires localStorage cleanup, HIPAA requires PHI removal
  const logout = useCallback(() => {
    // 1. Clear memory tokens (XSS-safe, already in memory only)
    tokenManager.clearTokens();

    // 2. Clear Sentry user context
    clearSentryUser();

    // 3. Reset store state
    storeLogout();

    // 4. Clear TanStack Query cache
    queryClient.clear();

    // 5. P1-3: Clear all encrypted localStorage (PHI, session data)
    // OWASP: "Clean the localStorage after logout"
    // HIPAA: PHI must be "rendered unreadable" when session ends
    const result = clearAllUserStorage();
    if (!result.success) {
      console.error('[useAuth] Partial storage cleanup:', result.errors);
    }
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
    apiHealthy,
    authenticate,
    logout,
  };
};

export default useAuth;
