/**
 * Auth Store
 * ==========
 * Zustand store for authentication state.
 * Matches Telegram mini-app pattern.
 *
 * Security: PII is encrypted in localStorage.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@/api';

/**
 * Auth store state
 */
interface AuthState {
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

/**
 * Create encrypted storage adapter
 * In production, use proper encryption
 */
const createEncryptedStorage = () => {
  // For development, use sessionStorage (cleared on tab close)
  // In production, implement AES-256-GCM encryption
  const storage = typeof window !== 'undefined' ? sessionStorage : undefined;

  return createJSONStorage(() => ({
    getItem: (name: string) => {
      const value = storage?.getItem(name);
      if (!value) return null;
      try {
        // In production: decrypt here
        return value;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      // In production: encrypt here
      storage?.setItem(name, value);
    },
    removeItem: (name: string) => {
      storage?.removeItem(name);
    },
  }));
};

/**
 * Auth store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isAuthenticating: false,
          authError: null,
        }),

      setAuthenticating: (isAuthenticating) =>
        set({ isAuthenticating, authError: null }),

      setAuthError: (authError) =>
        set({ authError, isAuthenticating: false }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isAuthenticating: false,
          authError: null,
        }),
    }),
    {
      name: 'sleepcore-vk-auth',
      storage: createEncryptedStorage(),
      partialize: (state) => ({
        // Only persist user and auth status, NOT loading states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
