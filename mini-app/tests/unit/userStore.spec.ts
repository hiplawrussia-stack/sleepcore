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

// Use vi.hoisted() to create mock functions before vi.mock()
const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

// Mock the apiClient - uses @/api after C-1 migration
vi.mock('@/api', () => ({
  apiClient: {
    request: mockRequest,
  },
}));

import { useUserStore } from '../../src/store/userStore';

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
      // apiClient.request returns data directly
      mockRequest.mockResolvedValueOnce(mockProfile);

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.profile).toEqual(mockProfile);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call apiClient.request with correct path', async () => {
      mockRequest.mockResolvedValueOnce(mockProfile);

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      expect(mockRequest).toHaveBeenCalledWith('/user/profile');
    });

    it('should set isLoading while loading', async () => {
      mockRequest.mockImplementation(() => {
        // Check isLoading is true during the call
        expect(useUserStore.getState().isLoading).toBe(true);
        return Promise.resolve(mockProfile);
      });

      const { loadProfile } = useUserStore.getState();
      await loadProfile();
    });

    it('should handle error when loading profile fails', async () => {
      // apiClient throws errors for failures
      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should use default error message for non-Error throws', async () => {
      mockRequest.mockRejectedValueOnce('string error');

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      const state = useUserStore.getState();
      expect(state.error).toBe('Failed to load profile');
    });

    it('should clear previous error when loading', async () => {
      // Set an initial error
      useUserStore.setState({ error: 'Previous error' });

      mockRequest.mockResolvedValueOnce(mockProfile);

      const { loadProfile } = useUserStore.getState();
      await loadProfile();

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('loadStats', () => {
    it('should load stats successfully', async () => {
      mockRequest.mockResolvedValueOnce(mockStats);

      const { loadStats } = useUserStore.getState();
      await loadStats();

      const state = useUserStore.getState();
      expect(state.stats).toEqual(mockStats);
    });

    it('should call apiClient.request with correct path', async () => {
      mockRequest.mockResolvedValueOnce(mockStats);

      const { loadStats } = useUserStore.getState();
      await loadStats();

      expect(mockRequest).toHaveBeenCalledWith('/breathing/stats');
    });

    it('should not update stats on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequest.mockRejectedValueOnce(new Error('Failed to load stats'));

      const { loadStats } = useUserStore.getState();
      await loadStats();

      const state = useUserStore.getState();
      expect(state.stats).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, firstName: 'Updated' };

      mockRequest.mockResolvedValueOnce(updatedProfile);

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      const state = useUserStore.getState();
      expect(state.profile).toEqual(updatedProfile);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call apiClient.request with correct params', async () => {
      mockRequest.mockResolvedValueOnce(mockProfile);

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      expect(mockRequest).toHaveBeenCalledWith('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Updated' }),
      });
    });

    it('should set isLoading while updating', async () => {
      mockRequest.mockImplementation(() => {
        expect(useUserStore.getState().isLoading).toBe(true);
        return Promise.resolve(mockProfile);
      });

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });
    });

    it('should handle error when updating profile fails', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Update failed'));

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Update failed');
    });

    it('should use default error message for non-Error throws', async () => {
      mockRequest.mockRejectedValueOnce('string error');

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      expect(useUserStore.getState().error).toBe('Failed to update profile');
    });

    it('should clear previous error when updating', async () => {
      useUserStore.setState({ error: 'Previous error' });

      mockRequest.mockResolvedValueOnce(mockProfile);

      const { updateProfile } = useUserStore.getState();
      await updateProfile({ firstName: 'Updated' });

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('logSession', () => {
    it('should log session successfully', async () => {
      // First call: POST /breathing/session
      // Second call: GET /breathing/stats (loadStats)
      mockRequest
        .mockResolvedValueOnce({ id: 'session-1', xpGain: 30 })
        .mockResolvedValueOnce(mockStats);

      useUserStore.setState({ profile: mockProfile });

      const { logSession } = useUserStore.getState();
      await logSession('478', '4-7-8 Breathing', 3, 60);

      expect(mockRequest).toHaveBeenCalledWith('/breathing/session', {
        method: 'POST',
        body: JSON.stringify({ patternId: '478', patternName: '4-7-8 Breathing', cycles: 3, duration: 60 }),
      });
    });

    it('should refresh stats after logging session', async () => {
      mockRequest
        .mockResolvedValueOnce({ id: 'session-1', xpGain: 30 })
        .mockResolvedValueOnce(mockStats);

      useUserStore.setState({ profile: mockProfile });

      const { logSession } = useUserStore.getState();
      await logSession('478', '4-7-8 Breathing', 3, 60);

      // Should have called stats endpoint after session
      expect(mockRequest).toHaveBeenCalledWith('/breathing/stats');
      expect(useUserStore.getState().stats).toEqual(mockStats);
    });

    it('should update XP optimistically', async () => {
      mockRequest
        .mockResolvedValueOnce({ id: 'session-1', xpGain: 30 })
        .mockResolvedValueOnce(mockStats);

      useUserStore.setState({ profile: mockProfile }); // xp: 100

      const { logSession } = useUserStore.getState();
      await logSession('478', '4-7-8 Breathing', 3, 60); // 3 cycles * 10 XP = 30 XP

      const state = useUserStore.getState();
      expect(state.profile?.xp).toBe(130); // 100 + 30
    });

    it('should not crash if profile is null', async () => {
      mockRequest
        .mockResolvedValueOnce({ id: 'session-1', xpGain: 30 })
        .mockResolvedValueOnce(mockStats);

      useUserStore.setState({ profile: null });

      const { logSession } = useUserStore.getState();
      await logSession('478', '4-7-8 Breathing', 3, 60);

      // Should complete without error
      expect(mockRequest).toHaveBeenCalled();
    });

    it('should handle error when logging session fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      const { logSession } = useUserStore.getState();
      await logSession('478', '4-7-8 Breathing', 3, 60);

      // Should log error but not throw
      expect(consoleSpy).toHaveBeenCalledWith(
        '[userStore] Failed to log session:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      useUserStore.setState({ error: 'Some error' });

      const { clearError } = useUserStore.getState();
      clearError();

      expect(useUserStore.getState().error).toBeNull();
    });
  });
});
