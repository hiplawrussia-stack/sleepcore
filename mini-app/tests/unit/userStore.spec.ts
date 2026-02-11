/**
 * User Store Tests
 * ================
 * Tests for Zustand user state management.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5
 * - State management testing for user data
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUserStore } from '../../src/store/userStore';

// Mock the API service
vi.mock('@/services/api', () => ({
  api: {
    getProfile: vi.fn(),
    getBreathingStats: vi.fn(),
    updateProfile: vi.fn(),
    logBreathingSession: vi.fn(),
  },
}));

import { api } from '@/services/api';

describe('User Store', () => {
  const mockProfile = {
    id: 'user-123',
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    evolutionStage: 'owlet',
    xp: 100,
    level: 2,
  };

  const mockStats = {
    totalSessions: 15,
    totalMinutes: 180,
    currentStreak: 5,
    longestStreak: 10,
    favoritePattern: '478',
    averageSessionDuration: 12,
    lastSessionDate: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    // Reset store state before each test
    useUserStore.setState({
      profile: null,
      stats: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null profile', () => {
      const { profile } = useUserStore.getState();
      expect(profile).toBeNull();
    });

    it('should have null stats', () => {
      const { stats } = useUserStore.getState();
      expect(stats).toBeNull();
    });

    it('should not be loading', () => {
      const { isLoading } = useUserStore.getState();
      expect(isLoading).toBe(false);
    });

    it('should have null error', () => {
      const { error } = useUserStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('loadProfile', () => {
    it('should load profile successfully', async () => {
      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.profile).toEqual(mockProfile);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoading while loading', async () => {
      vi.mocked(api.getProfile).mockImplementation(() => {
        // Check isLoading is true during the call
        expect(useUserStore.getState().isLoading).toBe(true);
        return Promise.resolve({ success: true, data: mockProfile });
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();
    });

    it('should handle error when loading profile fails', async () => {
      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: false,
        error: 'Failed to load profile',
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to load profile');
    });

    it('should use default error message when no error provided', async () => {
      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: false,
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.error).toBe('Failed to load profile');
    });

    it('should clear previous error when loading', async () => {
      // Set an initial error
      useUserStore.setState({ error: 'Previous error' });

      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('loadStats', () => {
    it('should load stats successfully', async () => {
      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const { loadStats } = useUserStore.getState();
      await loadStats();

      const state = useUserStore.getState();
      expect(state.stats).toEqual(mockStats);
    });

    it('should not update stats on failure', async () => {
      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: false,
        error: 'Failed to load stats',
      });

      const { loadStats } = useUserStore.getState();
      await loadStats();

      const state = useUserStore.getState();
      expect(state.stats).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, firstName: 'Updated' };

      vi.mocked(api.updateProfile).mockResolvedValueOnce({
        success: true,
        data: updatedProfile,
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      const state = useUserStore.getState();
      expect(state.profile).toEqual(updatedProfile);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoading while updating', async () => {
      vi.mocked(api.updateProfile).mockImplementation(() => {
        expect(useUserStore.getState().isLoading).toBe(true);
        return Promise.resolve({ success: true, data: mockProfile });
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });
    });

    it('should handle error when updating profile fails', async () => {
      vi.mocked(api.updateProfile).mockResolvedValueOnce({
        success: false,
        error: 'Update failed',
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Update failed');
    });

    it('should use default error message when no error provided', async () => {
      vi.mocked(api.updateProfile).mockResolvedValueOnce({
        success: false,
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      expect(useUserStore.getState().error).toBe('Failed to update profile');
    });

    it('should clear previous error when updating', async () => {
      useUserStore.setState({ error: 'Previous error' });

      vi.mocked(api.updateProfile).mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('logSession', () => {
    it('should log breathing session and refresh stats', async () => {
      // Set initial profile
      useUserStore.setState({ profile: mockProfile });

      vi.mocked(api.logBreathingSession).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const { logSession } = useUserStore.getState();
      await logSession('478', 5, 300);

      expect(api.logBreathingSession).toHaveBeenCalledWith({
        patternId: '478',
        cycles: 5,
        duration: 300,
      });

      // Stats should be refreshed
      expect(api.getBreathingStats).toHaveBeenCalled();
    });

    it('should apply optimistic XP update', async () => {
      const initialXP = 100;
      useUserStore.setState({ profile: { ...mockProfile, xp: initialXP } });

      vi.mocked(api.logBreathingSession).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const { logSession } = useUserStore.getState();
      const cycles = 5;
      await logSession('478', cycles, 300);

      const state = useUserStore.getState();
      // XP should increase by 10 per cycle
      expect(state.profile?.xp).toBe(initialXP + (cycles * 10));
    });

    it('should not update XP if no profile exists', async () => {
      vi.mocked(api.logBreathingSession).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const { logSession } = useUserStore.getState();
      await logSession('478', 5, 300);

      // Should not throw, profile remains null
      expect(useUserStore.getState().profile).toBeNull();
    });

    it('should not refresh stats if session logging fails', async () => {
      vi.mocked(api.logBreathingSession).mockResolvedValueOnce({
        success: false,
        error: 'Failed to log session',
      });

      const { logSession } = useUserStore.getState();
      await logSession('478', 5, 300);

      expect(api.getBreathingStats).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      useUserStore.setState({ error: 'Some error' });
      expect(useUserStore.getState().error).toBe('Some error');

      const { clearError } = useUserStore.getState();
      clearError();

      expect(useUserStore.getState().error).toBeNull();
    });

    it('should work even if no error exists', () => {
      const { clearError } = useUserStore.getState();
      expect(() => clearError()).not.toThrow();
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('state workflows', () => {
    it('should handle full profile load -> update flow', async () => {
      // 1. Load profile
      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const { loadProfile, updateProfile } = useUserStore.getState();
      await loadProfile();

      expect(useUserStore.getState().profile).toEqual(mockProfile);

      // 2. Update profile
      const updatedProfile = { ...mockProfile, firstName: 'NewName' };
      vi.mocked(api.updateProfile).mockResolvedValueOnce({
        success: true,
        data: updatedProfile,
      });

      await updateProfile({ firstName: 'NewName' });

      expect(useUserStore.getState().profile?.firstName).toBe('NewName');
    });

    it('should handle profile load -> session log -> stats update flow', async () => {
      // 1. Load profile
      vi.mocked(api.getProfile).mockResolvedValueOnce({
        success: true,
        data: { ...mockProfile, xp: 100 },
      });

      const { loadProfile, logSession } = useUserStore.getState();
      await loadProfile();

      // 2. Log session
      vi.mocked(api.logBreathingSession).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      const updatedStats = { ...mockStats, totalSessions: 16 };
      vi.mocked(api.getBreathingStats).mockResolvedValueOnce({
        success: true,
        data: updatedStats,
      });

      await logSession('478', 3, 180);

      const state = useUserStore.getState();
      expect(state.stats).toEqual(updatedStats);
      expect(state.profile?.xp).toBe(130); // 100 + (3 * 10)
    });
  });
});
