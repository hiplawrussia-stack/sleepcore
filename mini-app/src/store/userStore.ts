/**
 * User Store
 * ==========
 * Global state management for user data using Zustand.
 *
 * @see CLAUDE.md §6 - Mini-App Architecture
 */

import { create } from 'zustand';
import { apiClient } from '@/api';
import type { UserProfile, BreathingStats, LogSessionResponse } from '@/api';

interface UserState {
  // User data
  profile: UserProfile | null;
  stats: BreathingStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProfile: () => Promise<void>;
  loadStats: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logSession: (patternId: string, cycles: number, duration: number) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  profile: null,
  stats: null,
  isLoading: false,
  error: null,

  // Load user profile
  loadProfile: async () => {
    set({ isLoading: true, error: null });

    try {
      const profile = await apiClient.request<UserProfile>('/user/profile');
      set({ profile, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load profile';
      set({ error: message, isLoading: false });
    }
  },

  // Load breathing stats
  loadStats: async () => {
    try {
      const stats = await apiClient.request<BreathingStats>('/breathing/stats');
      set({ stats });
    } catch (error) {
      console.error('[userStore] Failed to load stats:', error);
    }
  },

  // Update profile
  updateProfile: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const profile = await apiClient.request<UserProfile>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      set({ profile, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      set({ error: message, isLoading: false });
    }
  },

  // Log completed breathing session
  logSession: async (patternId, cycles, duration) => {
    try {
      await apiClient.request<LogSessionResponse>('/breathing/sessions', {
        method: 'POST',
        body: JSON.stringify({ patternId, cycles, duration }),
      });

      // Refresh stats after logging session
      const { loadStats, profile } = get();
      await loadStats();

      // Update XP locally (optimistic update)
      if (profile) {
        set({
          profile: {
            ...profile,
            xp: profile.xp + (cycles * 10), // 10 XP per cycle
          },
        });
      }
    } catch (error) {
      console.error('[userStore] Failed to log session:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useUserStore;
