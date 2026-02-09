/**
 * Auth Store - Encrypted PII Storage
 * ===================================
 * Zustand store for authentication state management.
 * Works alongside TanStack Query for server state.
 *
 * Security:
 * - User PII encrypted in localStorage (defense-in-depth)
 * - Uses AES-256-GCM via Web Crypto API
 *
 * @see CLAUDE.md §2.2 - Encryption requirements
 * @module @sleepcore/mini-app/store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@/api';
import { createEncryptedStorage } from '@/utils/crypto';

interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setAuthError: (error: string | null) => void;
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

      // Logout and clear state
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isAuthenticating: false,
          authError: null,
        }),
    }),
    {
      name: 'sleepcore-auth-v2', // New name to avoid legacy data issues
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

export default useAuthStore;
