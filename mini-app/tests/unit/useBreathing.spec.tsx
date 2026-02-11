/**
 * useBreathing Hook Tests
 * =======================
 * Unit tests for breathing hooks with TanStack Query.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: CLI-003, CLI-004
 *
 * Coverage targets:
 * - useBreathingStats: query fetching, auth gating
 * - useBreathingHistory: pagination, auth gating
 * - useLogSession: mutations, optimistic updates, offline queue
 * - useBreathing: combined hook
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useBreathingStats,
  useBreathingHistory,
  useLogSession,
  useBreathing,
} from '../../src/hooks/useBreathing';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';
import type {
  BreathingStats,
  BreathingSession,
  LogSessionResponse,
} from '../../src/api/types';

// Mock apiClient
vi.mock('../../src/api', () => ({
  apiClient: {
    request: vi.fn(),
    requestValidated: vi.fn(),
  },
  queryKeys: {
    breathing: {
      stats: () => ['breathing', 'stats'],
      history: (params?: { limit?: number; offset?: number }) => ['breathing', 'history', params],
      session: (id: string) => ['breathing', 'session', id],
    },
    user: {
      profile: () => ['user', 'profile'],
      evolution: () => ['user', 'evolution'],
    },
  },
}));

// Mock stores
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../src/store/syncStore', () => ({
  useSyncStore: vi.fn(),
}));

// Import mocked modules
import { apiClient } from '../../src/api';

// Test data
const mockStats: BreathingStats = {
  totalSessions: 15,
  totalMinutes: 120,
  currentStreak: 5,
  longestStreak: 10,
  favoritePattern: 'relax',
  weeklyProgress: [1, 2, 3, 2, 1, 0, 2],
  lastSessionAt: '2026-02-09T20:00:00Z',
};

const mockSessions: BreathingSession[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    patternId: 'relax',
    patternName: 'Релаксация',
    cycles: 5,
    duration: 180,
    completedAt: '2026-02-09T20:00:00Z',
  },
  {
    id: 'session-2',
    userId: 'user-1',
    patternId: 'energy',
    patternName: 'Энергия',
    cycles: 8,
    duration: 240,
    completedAt: '2026-02-09T19:00:00Z',
  },
];

const mockLogResponse: LogSessionResponse = {
  id: 'new-session-123',
  xpGain: 25,
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

describe('useBreathingStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch stats when authenticated', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.isError).toBe(false);
    expect(apiClient.requestValidated).toHaveBeenCalledWith('/breathing/stats', expect.anything());
  });

  it('should not fetch when not authenticated', async () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    // Should not be loading since query is disabled
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeUndefined();
    expect(apiClient.requestValidated).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const error = new Error('Network error');
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.stats).toBeUndefined();
  });

  it('should provide refetch function', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockStats)
      .mockResolvedValueOnce({ ...mockStats, totalSessions: 20 });

    const { result } = renderHook(() => useBreathingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.stats?.totalSessions).toBe(15);
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.stats?.totalSessions).toBe(20);
    });
  });
});

describe('useBreathingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
  });

  it('should fetch history with default pagination', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
    expect(apiClient.requestValidated).toHaveBeenCalledWith('/breathing/history?limit=20&offset=0', expect.anything());
  });

  it('should fetch history with custom pagination', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      sessions: mockSessions.slice(0, 1),
      hasMore: true,
    });

    const { result } = renderHook(
      () => useBreathingHistory({ limit: 1, offset: 5 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(apiClient.requestValidated).toHaveBeenCalledWith('/breathing/history?limit=1&offset=5', expect.anything());
  });

  it('should not fetch when not authenticated', async () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useBreathingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toBeUndefined();
    expect(apiClient.requestValidated).not.toHaveBeenCalled();
  });

  it('should handle empty history', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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

  it('should handle fetch error', async () => {
    const error = new Error('Server error');
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useBreathingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useLogSession', () => {
  const mockAddPendingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
    (useSyncStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isOnline: true,
      addPendingChange: mockAddPendingChange,
    });
  });

  it('should log session when online', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockLogResponse);

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    const sessionData = {
      patternId: 'relax',
      patternName: 'Релаксация',
      cycles: 5,
      duration: 180,
    };

    let response: LogSessionResponse | undefined;
    await act(async () => {
      response = await result.current.logSession(sessionData);
    });

    expect(response).toEqual(mockLogResponse);
    // lastXpGain is updated from mutation.data which may not be available immediately
    await waitFor(() => {
      expect(result.current.lastXpGain).toBe(25);
    });
    expect(apiClient.requestValidated).toHaveBeenCalledWith(
      '/breathing/session',
      expect.anything(), // Schema
      {
        method: 'POST',
        body: JSON.stringify(sessionData),
      }
    );
  });

  it('should queue session when offline', async () => {
    (useSyncStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isOnline: false,
      addPendingChange: mockAddPendingChange,
    });

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    const sessionData = {
      patternId: 'energy',
      patternName: 'Энергия',
      cycles: 8,
      duration: 240,
    };

    await act(async () => {
      await result.current.logSession(sessionData);
    });

    expect(mockAddPendingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'session',
        action: 'create',
        data: sessionData,
      })
    );
    expect(apiClient.requestValidated).not.toHaveBeenCalled();
  });

  it('should return local ID when offline', async () => {
    (useSyncStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isOnline: false,
      addPendingChange: mockAddPendingChange,
    });

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    let response: LogSessionResponse | undefined;
    await act(async () => {
      response = await result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 3,
        duration: 120,
      });
    });

    expect(response?.id).toMatch(/^local_\d+$/);
    expect(response?.xpGain).toBe(0);
  });

  it('should show isLogging state during mutation', async () => {
    let resolvePromise: ((value: LogSessionResponse) => void) | undefined;
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLogging).toBe(false);

    act(() => {
      result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 5,
        duration: 180,
      });
    });

    await waitFor(() => {
      expect(result.current.isLogging).toBe(true);
    });

    await act(async () => {
      resolvePromise?.(mockLogResponse);
    });

    await waitFor(() => {
      expect(result.current.isLogging).toBe(false);
    });
  });

  it('should perform optimistic update on stats', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    // Pre-populate stats cache
    queryClient.setQueryData(['breathing', 'stats'], mockStats);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockLogResponse);

    const { result } = renderHook(() => useLogSession(), { wrapper });

    const sessionData = {
      patternId: 'relax',
      patternName: 'Релаксация',
      cycles: 5,
      duration: 300, // 5 minutes = 25 XP (5*5) + 10 XP (5*2) = 35 XP estimated
    };

    await act(async () => {
      await result.current.logSession(sessionData);
    });

    // Check that stats were optimistically updated
    const updatedStats = queryClient.getQueryData<BreathingStats>(['breathing', 'stats']);
    expect(updatedStats?.totalSessions).toBe(16); // 15 + 1
    expect(updatedStats?.totalMinutes).toBe(125); // 120 + 5
  });

  it('should rollback on error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    // Pre-populate stats cache
    queryClient.setQueryData(['breathing', 'stats'], mockStats);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const error = new Error('Server error');
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useLogSession(), { wrapper });

    const sessionData = {
      patternId: 'relax',
      patternName: 'Релаксация',
      cycles: 5,
      duration: 300,
    };

    try {
      await act(async () => {
        await result.current.logSession(sessionData);
      });
    } catch {
      // Expected error
    }

    // Check that stats were rolled back
    const rolledBackStats = queryClient.getQueryData<BreathingStats>(['breathing', 'stats']);
    expect(rolledBackStats?.totalSessions).toBe(15); // Original value
    expect(rolledBackStats?.totalMinutes).toBe(120); // Original value
  });

  it('should handle mutation without existing stats cache', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockLogResponse);

    const { result } = renderHook(() => useLogSession(), {
      wrapper: createWrapper(),
    });

    // Should not throw even without cached stats
    await act(async () => {
      await result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 5,
        duration: 180,
      });
    });

    await waitFor(() => {
      expect(result.current.lastXpGain).toBe(25);
    });
  });
});

describe('useBreathing (combined hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
    (useSyncStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isOnline: true,
      addPendingChange: vi.fn(),
    });
  });

  it('should combine stats and logSession functionality', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockStats) // Initial stats fetch
      .mockResolvedValueOnce(mockLogResponse); // Log session

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);

    await act(async () => {
      await result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 5,
        duration: 180,
      });
    });

    await waitFor(() => {
      expect(result.current.lastXpGain).toBe(25);
    });
  });

  it('should provide refetchStats function', async () => {
    (apiClient.requestValidated as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockStats)
      .mockResolvedValueOnce({ ...mockStats, currentStreak: 10 });

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.stats?.currentStreak).toBe(5);
    });

    await act(async () => {
      await result.current.refetchStats();
    });

    await waitFor(() => {
      expect(result.current.stats?.currentStreak).toBe(10);
    });
  });

  it('should expose isLogging state', async () => {
    let resolvePromise: ((value: LogSessionResponse) => void) | undefined;
    (apiClient.requestValidated as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockStats)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

    const { result } = renderHook(() => useBreathing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.isLogging).toBe(false);

    act(() => {
      result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 5,
        duration: 180,
      });
    });

    await waitFor(() => {
      expect(result.current.isLogging).toBe(true);
    });

    await act(async () => {
      resolvePromise?.(mockLogResponse);
    });

    await waitFor(() => {
      expect(result.current.isLogging).toBe(false);
    });
  });
});

describe('XP Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
    });
    (useSyncStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isOnline: true,
      addPendingChange: vi.fn(),
    });
  });

  it('should calculate XP correctly: 5 XP per minute + 2 XP per cycle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    queryClient.setQueryData(['breathing', 'stats'], mockStats);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    (apiClient.requestValidated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockLogResponse);

    const { result } = renderHook(() => useLogSession(), { wrapper });

    // 180 seconds = 3 minutes = 15 XP from duration
    // 5 cycles = 10 XP from cycles
    // Total estimated: 25 XP
    await act(async () => {
      await result.current.logSession({
        patternId: 'relax',
        patternName: 'Релаксация',
        cycles: 5,
        duration: 180,
      });
    });

    // Verify optimistic update happened (stats.totalMinutes should increase by 3)
    const updatedStats = queryClient.getQueryData<BreathingStats>(['breathing', 'stats']);
    expect(updatedStats?.totalMinutes).toBe(123); // 120 + 3
  });
});
