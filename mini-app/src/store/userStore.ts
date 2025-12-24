/**
 * User Store
 * ==========
 * Global state management for user data using Zustand.
 */

import { create } from 'zustand';
import { api, type UserProfile, type BreathingStats } from '@/services/api';

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

    const response = await api.getProfile();

    if (response.success && response.data) {
      set({ profile: response.data, isLoading: false });
    } else {
      set({ error: response.error || 'Failed to load profile', isLoading: false });
    }
  },

  // Load breathing stats
  loadStats: async () => {
    const response = await api.getBreathingStats();

    if (response.success && response.data) {
      set({ stats: response.data });
    }
  },

  // Update profile
  updateProfile: async (data) => {
    set({ isLoading: true, error: null });

    const response = await api.updateProfile(data);

    if (response.success && response.data) {
      set({ profile: response.data, isLoading: false });
    } else {
      set({ error: response.error || 'Failed to update profile', isLoading: false });
    }
  },

  // Log completed breathing session
  logSession: async (patternId, cycles, duration) => {
    const response = await api.logBreathingSession({
      patternId,
      cycles,
      duration,
    });

    if (response.success) {
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
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useUserStore;
