/**
 * useBreathing Hook Tests
 * =======================
 * Tests for breathing session hooks with TanStack Query.
 * Critical for session logging and XP tracking.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Session logging validation
 * - Offline-first behavior verification
 *
 * @module @sleepcore/mini-app/tests/hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create hoisted mocks
const { mockApiClient, mockAuthStore, mockSyncStore } = vi.hoisted(() => ({
  mockApiClient: {
    requestValidated: vi.fn(),
  },
  mockAuthStore: {
    isAuthenticated: true,
    isAuthenticating: false,
  },
  mockSyncStore: {
    isOnline: true,
    addPendingChange: vi.fn(),
  },
}));

vi.mock('@/api', () => ({
  apiClient: mockApiClient,
  queryKeys: {
    breathing: {
      stats: () => ['breathing', 'stats'],
      history: (params: object) => ['breathing', 'history', params],
    },
    user: {
      profile: () => ['user', 'profile'],
      evolution: () => ['user', 'evolution'],
    },
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/store/syncStore', () => ({
  useSyncStore: () => mockSyncStore,
}));

// Import after mocks
import {
  useBreathingStats,
  useBreathingHistory,
  useLogSession,
  useBreathing,
} from '@/hooks/useBreathing';
import type { BreathingStats, BreathingSession, LogSessionRequest } from '@/api';

// Test data
const mockBreathingStats: BreathingStats = {
  totalSessions: 25,
  totalMinutes: 450,
  currentStreak: 5,
  longestStreak: 10,
  weeklyGoal: 7,
  weeklyProgress: 3,
  favoritePattern: '478',
  lastSessionAt: '2024-01-15T22:00:00Z',
};

const mockSessions: BreathingSession[] = [
  {
    id: 'session-1',
    patternId: '478',
    patternName: '4-7-8 Дыхание',
    cycles: 3,
    duration: 180,
    completedAt: '2024-01-15T22:00:00Z',
    xpGained: 15,
  },
  {
    id: 'session-2',
    patternId: 'box',
    patternName: 'Квадратное дыхание',
    cycles: 4,
    duration: 240,
    completedAt: '2024-01-14T21:30:00Z',
    xpGained: 20,
  },
];

// Wrapper for React Query
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBreathingStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.isAuthenticating = false;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch breathing stats successfully', async () => {
    mockApiClient.requestValidated.mockResolvedValue(mockBreathingStats);

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockBreathingStats);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call API with correct endpoint', async () => {
    mockApiClient.requestValidated.mockResolvedValue(mockBreathingStats);

    renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient.requestValidated).toHaveBeenCalledWith(
        '/breathing/stats',
        expect.any(Object)
      );
    });
  });

  it('should handle API error', async () => {
    mockApiClient.requestValidated.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.stats).toBeUndefined();
  });

  it('should not fetch when not authenticated', async () => {
    mockAuthStore.isAuthenticated = false;

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockApiClient.requestValidated).not.toHaveBeenCalled();
    expect(result.current.stats).toBeUndefined();
  });
});

describe('useBreathingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = true;
  });

  it('should fetch sessions with default pagination', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      hasMore: false,
    });

    const { result } = renderHook(() => useBreathingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.hasMore).toBe(false);
  });

  it('should pass custom pagination options', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      hasMore: true,
    });

    renderHook(() => useBreathingHistory({ limit: 10, offset: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient.requestValidated).toHaveBeenCalledWith(
        '/breathing/history?limit=10&offset=20',
        expect.any(Object)
      );
    });
  });

  it('should handle pagination with more pages', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      hasMore: true,
    });

    const { result } = renderHook(() => useBreathingHistory({ limit: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });

  it('should handle empty history', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: [],
      hasMore: false,
    });

    const { result } = renderHook(() => useBreathingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });
});

describe('useLogSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncStore.isOnline = true;
    mockSyncStore.addPendingChange = vi.fn();
  });

  const testSession: LogSessionRequest = {
    patternId: '478',
    patternName: '4-7-8 Breathing',
    cycles: 3,
    duration: 180,
  };

  it('should log session successfully when online', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      id: 'new-session-123',
      xpGain: 15,
    });

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    let response;
    await act(async () => {
      response = await result.current.logSession(testSession);
    });

    expect(response).toEqual({ id: 'new-session-123', xpGain: 15 });
    expect(mockApiClient.requestValidated).toHaveBeenCalledWith(
      '/breathing/session',
      expect.any(Object),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(testSession),
      })
    );
  });

  it('should queue session when offline', async () => {
    mockSyncStore.isOnline = false;

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    let response;
    await act(async () => {
      response = await result.current.logSession(testSession);
    });

    // Should return local ID, not call API
    expect(response?.id).toMatch(/^local_\d+$/);
    expect(response?.xpGain).toBe(0);
    expect(mockApiClient.requestValidated).not.toHaveBeenCalled();
    expect(mockSyncStore.addPendingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'session',
        action: 'create',
        data: testSession,
      })
    );
  });

  it('should track logging state', async () => {
    // Use a promise we can control
    let resolveRequest: (value: { id: string; xpGain: number }) => void;
    const pendingRequest = new Promise<{ id: string; xpGain: number }>(resolve => {
      resolveRequest = resolve;
    });
    mockApiClient.requestValidated.mockReturnValue(pendingRequest);

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLogging).toBe(false);

    // Start the mutation
    let mutationPromise: Promise<unknown>;
    act(() => {
      mutationPromise = result.current.logSession(testSession);
    });

    // Should be logging now
    await waitFor(() => {
      expect(result.current.isLogging).toBe(true);
    });

    // Resolve the request
    await act(async () => {
      resolveRequest!({ id: 'session-123', xpGain: 15 });
      await mutationPromise;
    });

    // Should stop logging
    await waitFor(() => {
      expect(result.current.isLogging).toBe(false);
    });
  });

  it('should track last XP gain', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      id: 'session-123',
      xpGain: 25,
    });

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.lastXpGain).toBeNull();

    await act(async () => {
      await result.current.logSession(testSession);
    });

    // Wait for React Query mutation state to update
    await waitFor(() => {
      expect(result.current.lastXpGain).toBe(25);
    });
  });

  it('should handle logging error', async () => {
    mockApiClient.requestValidated.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.logSession(testSession);
      })
    ).rejects.toThrow('Server error');
  });
});

describe('useBreathing (combined hook)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuthStore.isAuthenticated = true;
    mockSyncStore.isOnline = true;
  });

  it('should provide stats and log function', async () => {
    mockApiClient.requestValidated.mockResolvedValue(mockBreathingStats);

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.stats).toEqual(mockBreathingStats);
    expect(typeof result.current.logSession).toBe('function');
    expect(typeof result.current.refetchStats).toBe('function');
  });

  it('should track logging state from mutation', async () => {
    // First call is for stats, second would be for session log
    mockApiClient.requestValidated
      .mockResolvedValueOnce(mockBreathingStats)
      .mockResolvedValueOnce({ id: 'session-123', xpGain: 15 });

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.isLogging).toBe(false);
    expect(result.current.lastXpGain).toBeNull();
  });

  it('should refetch stats after logging session', async () => {
    mockApiClient.requestValidated
      .mockResolvedValueOnce(mockBreathingStats)
      .mockResolvedValueOnce({ id: 'session-123', xpGain: 15 })
      .mockResolvedValueOnce({ ...mockBreathingStats, totalSessions: 26 });

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockBreathingStats);
    });

    // Log a session
    await act(async () => {
      await result.current.logSession({
        patternId: '478',
        patternName: '4-7-8',
        cycles: 3,
        duration: 180,
      });
    });

    // Stats should be invalidated and refetched
    await waitFor(() => {
      expect(mockApiClient.requestValidated).toHaveBeenCalledTimes(3);
    });
  });
});
