/**
 * useUserProfile Hook Tests
 * =========================
 * Unit tests for user profile hook with TanStack Query.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: DAT-003
 *
 * Coverage targets:
 * - Profile fetching with auth gating
 * - Optimistic updates on profile mutation
 * - Error handling and rollback
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useAuthStore } from '../../src/store/authStore';
import type { UserProfile } from '../../src/api/types';

// Mock apiClient
vi.mock('../../src/api', () => ({
  apiClient: {
    request: vi.fn(),
    requestValidated: vi.fn(),
  },
  queryKeys: {
    user: {
      profile: () => ['user', 'profile'],
      evolution: () => ['user', 'evolution'],
      badges: () => ['user', 'badges'],
      quests: () => ['user', 'quests'],
      settings: () => ['user', 'settings'],
    },
  },
}));

// Mock auth store
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Import mocked modules
import { apiClient } from '../../src/api';

// Test data
const mockProfile: UserProfile = {
  id: 'user-123',
  telegramId: 123456789,
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  evolutionStage: 'young_owl',
  xp: 250,
  level: 3,
  streak: 7,
  badges: ['first_session', 'week_streak'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-09T12:00:00Z',
};

// QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Profile Fetching', () => {
    it('should fetch profile when authenticated', async () => {
      (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isError).toBe(false);
      expect(apiClient.requestValidated).toHaveBeenCalled();
    });

    it('should not fetch when not authenticated', async () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      // Query should be disabled
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeUndefined();
      expect(apiClient.requestValidated).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.profile).toBeUndefined();
    });

    it('should provide refetch function', async () => {
      (apiClient.requestValidated as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce({ ...mockProfile, xp: 300 });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.profile?.xp).toBe(250);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.profile?.xp).toBe(300);
      });
    });
  });

  describe('Profile Update', () => {
    it('should update profile successfully', async () => {
      // requestValidated for fetching, request for mutation
      (apiClient.requestValidated as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockProfile);
      (apiClient.request as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ updated: true });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.profile).toBeDefined();
      });

      await act(async () => {
        await result.current.updateProfile({ firstName: 'Updated' });
      });

      expect(apiClient.request).toHaveBeenCalledWith('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Updated' }),
      });
    });

    it('should show isUpdating state during mutation', async () => {
      // requestValidated for fetching
      (apiClient.requestValidated as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockProfile);

      // request for mutation - with delayed promise
      let resolvePromise: ((value: { updated: boolean }) => void) | undefined;
      (apiClient.request as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
        );

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isUpdating).toBe(false);

      act(() => {
        result.current.updateProfile({ firstName: 'New Name' });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      await act(async () => {
        resolvePromise?.({ updated: true });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic update immediately', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      // Pre-populate cache
      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      let resolvePromise: ((value: { updated: boolean }) => void) | undefined;
      (apiClient.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      expect(result.current.profile?.firstName).toBe('Test');

      act(() => {
        result.current.updateProfile({ firstName: 'Optimistic' });
      });

      // Optimistic update should be applied immediately
      await waitFor(() => {
        expect(result.current.profile?.firstName).toBe('Optimistic');
      });

      // Complete the mutation
      await act(async () => {
        resolvePromise?.({ updated: true });
      });
    });

    it('should update updatedAt during optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity }, // Keep cache for test
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Use delayed promise to capture optimistic state before onSuccess invalidates
      let resolveRequest: ((value: { updated: boolean }) => void) | undefined;
      (apiClient.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
      );

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      const originalUpdatedAt = result.current.profile?.updatedAt;

      act(() => {
        result.current.updateProfile({ xp: 500 });
      });

      // Wait for mutation to start (optimistic state applied)
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      // Check optimistic state WHILE mutation is pending (before onSuccess)
      expect(result.current.profile?.updatedAt).not.toBe(originalUpdatedAt);
      // Should be a valid ISO date more recent than original
      expect(new Date(result.current.profile?.updatedAt ?? '').getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt ?? '').getTime()
      );

      // Resolve the mutation
      await act(async () => {
        resolveRequest?.({ updated: true });
      });
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Update failed');
      (apiClient.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      expect(result.current.profile?.firstName).toBe('Test');

      try {
        await act(async () => {
          await result.current.updateProfile({ firstName: 'Should Fail' });
        });
      } catch {
        // Expected error
      }

      // Should rollback to original value
      await waitFor(() => {
        expect(result.current.profile?.firstName).toBe('Test');
      });
    });

    it('should preserve other fields during optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ updated: true });

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      await act(async () => {
        await result.current.updateProfile({ firstName: 'Changed' });
      });

      // Other fields should be preserved
      expect(result.current.profile?.id).toBe('user-123');
      expect(result.current.profile?.xp).toBe(250);
      expect(result.current.profile?.level).toBe(3);
      expect(result.current.profile?.badges).toEqual(['first_session', 'week_streak']);
    });

    it('should handle mutation without existing cache', async () => {
      (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ updated: true });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      // Should not throw even without cached profile
      await act(async () => {
        await result.current.updateProfile({ firstName: 'New' });
      });

      expect(apiClient.request).toHaveBeenCalledWith('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName: 'New' }),
      });
    });
  });

  describe('Evolution Stage Updates', () => {
    it('should handle evolution stage change', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Mutation uses request, refetch uses requestValidated
      (apiClient.request as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ updated: true });
      (apiClient.requestValidated as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ...mockProfile, evolutionStage: 'wise_owl' });

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      expect(result.current.profile?.evolutionStage).toBe('young_owl');

      await act(async () => {
        await result.current.updateProfile({ evolutionStage: 'wise_owl' });
      });

      // After mutation settles and refetch, should have wise_owl
      await waitFor(() => {
        expect(result.current.profile?.evolutionStage).toBe('wise_owl');
      });
    });
  });

  describe('Multiple Updates', () => {
    it('should handle multiple fields update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(['user', 'profile'], mockProfile);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Mutation uses request, refetch uses requestValidated
      (apiClient.request as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ updated: true });
      (apiClient.requestValidated as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ...mockProfile, firstName: 'New Name', xp: 500, level: 5 });

      const { result } = renderHook(() => useUserProfile(), { wrapper });

      await act(async () => {
        await result.current.updateProfile({
          firstName: 'New Name',
          xp: 500,
          level: 5,
        });
      });

      await waitFor(() => {
        expect(result.current.profile?.firstName).toBe('New Name');
      });
      expect(result.current.profile?.xp).toBe(500);
      expect(result.current.profile?.level).toBe(5);
    });
  });
});
