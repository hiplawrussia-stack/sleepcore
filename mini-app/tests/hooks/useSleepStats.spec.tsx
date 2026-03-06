/**
 * useSleepStats Hook Tests
 * ========================
 * Tests for sleep data hooks with TanStack Query.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Data fetching validation
 *
 * @module @sleepcore/mini-app/tests/hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create hoisted mocks
const { mockApiClient, mockAuthStore } = vi.hoisted(() => ({
  mockApiClient: {
    requestValidated: vi.fn(),
  },
  mockAuthStore: {
    isAuthenticated: true,
    isAuthenticating: false,
  },
}));

vi.mock('@/api', () => ({
  apiClient: mockApiClient,
  queryKeys: {
    sleep: {
      stats: () => ['sleep', 'stats'],
      sessions: (params: object) => ['sleep', 'sessions', params],
    },
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Import after mocks
import { useSleepStats, useSleepSessions, useSleep } from '@/hooks/useSleepStats';
import type { SleepStats, SleepSession } from '@/api';

// Test data
const mockSleepStats: SleepStats = {
  averageDuration: 420, // 7 hours
  averageQuality: 85,
  sessionsThisWeek: 5,
  totalMinutes: 2100,
  trend: 'improving',
  lastSessionDate: '2024-01-15',
};

const mockSessions: SleepSession[] = [
  {
    id: 'session-1',
    date: '2024-01-15',
    startTime: '23:00',
    endTime: '07:00',
    durationMinutes: 480,
    quality: 90,
    source: 'health_connect',
    stages: {
      awake: 30,
      light: 200,
      deep: 120,
      rem: 130,
    },
  },
  {
    id: 'session-2',
    date: '2024-01-14',
    startTime: '23:30',
    endTime: '06:30',
    durationMinutes: 420,
    quality: 80,
    source: 'manual',
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
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSleepStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.isAuthenticating = false;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('when authenticated', () => {
    it('should fetch sleep stats successfully', async () => {
      mockApiClient.requestValidated.mockResolvedValue(mockSleepStats);

      const { result } = renderHook(() => useSleepStats(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockSleepStats);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call API with correct endpoint', async () => {
      mockApiClient.requestValidated.mockResolvedValue(mockSleepStats);

      renderHook(() => useSleepStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiClient.requestValidated).toHaveBeenCalledWith(
          '/sleep/stats',
          expect.any(Object) // Schema
        );
      });
    });

    it('should handle API error', async () => {
      const error = new Error('Network error');
      mockApiClient.requestValidated.mockRejectedValue(error);

      const { result } = renderHook(() => useSleepStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.stats).toBeUndefined();
    });

    it('should provide refetch function', async () => {
      mockApiClient.requestValidated.mockResolvedValue(mockSleepStats);

      const { result } = renderHook(() => useSleepStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Refetch should trigger new request
      await result.current.refetch();

      expect(mockApiClient.requestValidated).toHaveBeenCalledTimes(2);
    });
  });

  describe('when not authenticated', () => {
    it('should not fetch data', async () => {
      mockAuthStore.isAuthenticated = false;

      const { result } = renderHook(() => useSleepStats(), {
        wrapper: createWrapper(),
      });

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApiClient.requestValidated).not.toHaveBeenCalled();
      expect(result.current.stats).toBeUndefined();
    });
  });
});

describe('useSleepSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.isAuthenticating = false;
  });

  it('should fetch sessions with default options', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      total: 2,
      hasMore: false,
    });

    const { result } = renderHook(() => useSleepSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.total).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('should pass options to API call', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      total: 10,
      hasMore: true,
    });

    renderHook(() => useSleepSessions({ limit: 5, offset: 10, days: 14 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient.requestValidated).toHaveBeenCalledWith(
        '/sleep/sessions?limit=5&offset=10&days=14',
        expect.any(Object)
      );
    });
  });

  it('should handle empty sessions', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: [],
      total: 0,
      hasMore: false,
    });

    const { result } = renderHook(() => useSleepSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('should handle pagination', async () => {
    mockApiClient.requestValidated.mockResolvedValue({
      sessions: mockSessions,
      total: 20,
      hasMore: true,
    });

    const { result } = renderHook(() => useSleepSessions({ limit: 10, offset: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.total).toBe(20);
  });
});

describe('useSleep (combined hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.isAuthenticating = false;
  });

  it('should fetch both stats and sessions', async () => {
    // Mock both calls - first call is stats, second is sessions
    mockApiClient.requestValidated
      .mockResolvedValueOnce(mockSleepStats)
      .mockResolvedValueOnce({
        sessions: mockSessions,
        total: 2,
        hasMore: false,
      });

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockSleepStats);
    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.hasData).toBe(true);
  });

  it('should set isLoading while authenticating', async () => {
    mockAuthStore.isAuthenticating = true;

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should set isLoading when not authenticated', async () => {
    mockAuthStore.isAuthenticated = false;

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should report hasData=false when no sessions', async () => {
    mockApiClient.requestValidated
      .mockResolvedValueOnce({ ...mockSleepStats, sessionsThisWeek: 0 })
      .mockResolvedValueOnce({
        sessions: [],
        total: 0,
        hasMore: false,
      });

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasData).toBe(false);
  });

  it('should report isError when stats fetch fails', async () => {
    mockApiClient.requestValidated
      .mockRejectedValueOnce(new Error('Stats error'))
      .mockResolvedValueOnce({
        sessions: mockSessions,
        total: 2,
        hasMore: false,
      });

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should report isError when sessions fetch fails', async () => {
    mockApiClient.requestValidated
      .mockResolvedValueOnce(mockSleepStats)
      .mockRejectedValueOnce(new Error('Sessions error'));

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should provide separate refetch functions', async () => {
    mockApiClient.requestValidated
      .mockResolvedValueOnce(mockSleepStats)
      .mockResolvedValueOnce({
        sessions: mockSessions,
        total: 2,
        hasMore: false,
      });

    const { result } = renderHook(() => useSleep(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetchStats).toBe('function');
    expect(typeof result.current.refetchSessions).toBe('function');
  });
});
