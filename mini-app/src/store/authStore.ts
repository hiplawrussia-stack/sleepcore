/**
 * Auth Store - Encrypted PII Storage
 * ===================================
 * Zustand store for authentication state management.
 * Works alongside TanStack Query for server state.
 *
 * Security:
 * - User PII encrypted in localStorage (defense-in-depth)
 * - Uses AES-256-GCM via Web Crypto API
 * - P1-3: Complete storage cleanup on logout (OWASP, HIPAA)
 *
 * @see CLAUDE.md §2.2 - Encryption requirements
 * @see OWASP Session Management - localStorage cleanup
 * @module @sleepcore/mini-app/store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@/api';
import { createEncryptedStorage } from '@/utils/crypto';

/** Storage key for auth store - exported for cleanup utilities */
export const AUTH_STORAGE_KEY = 'sleepcore-auth-v2';

interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  /** API health status: null = not checked, true = healthy, false = unhealthy */
  apiHealthy: boolean | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setAuthError: (error: string | null) => void;
  setApiHealthy: (healthy: boolean | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      apiHealthy: null,

      // Set user after successful authentication
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isAuthenticating: false,
          authError: null,
        }),

      // Set authenticating state
      setAuthenticating: (isAuthenticating) =>
        set({ isAuthenticating, authError: null }),

      // Set auth error
      setAuthError: (error) =>
        set({
          authError: error,
          isAuthenticating: false,
        }),

      // Set API health status
      setApiHealthy: (healthy) =>
        set({ apiHealthy: healthy }),

      // Logout and clear state
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isAuthenticating: false,
          authError: null,
          apiHealthy: null,
        }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Use encrypted storage for PII protection
      storage: createJSONStorage(() => createEncryptedStorage()),
      // Only persist user data, not loading states
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Clear auth storage completely from localStorage
 *
 * P1-3: OWASP requires localStorage cleanup on logout.
 * HIPAA requires PHI to be "rendered unreadable" when no longer needed.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 */
export function clearAuthStorage(): void {
  try {
    // Remove encrypted storage entry completely
    localStorage.removeItem(AUTH_STORAGE_KEY);
    console.log('[AuthStore] Storage cleared');
  } catch (error) {
    // Log but don't throw - cleanup should be best-effort
    console.error('[AuthStore] Failed to clear storage:', error);
  }
}

export default useAuthStore;
