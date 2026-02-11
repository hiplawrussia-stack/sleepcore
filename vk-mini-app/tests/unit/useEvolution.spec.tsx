/**
 * useEvolution Hooks Unit Tests
 * =============================
 * Tests for VK Mini App gamification hooks interface and structure.
 *
 * Note: These tests focus on the hook interface rather than full integration
 * with React Query, as the page-level tests provide better coverage for
 * actual data fetching behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks (will use real implementations)
import {
  useEvolution,
  useQuests,
  useBadges,
  useGamification,
  useLeaderboard,
} from '@/hooks/useEvolution';

// Mock the API client module
vi.mock('@/api/client', () => ({
  apiClient: {
    requestValidated: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
  },
  tokenManager: {
    getAccessToken: vi.fn().mockReturnValue('mock-token'),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code?: string
    ) {
      super(message);
    }
  },
}));

// Wrapper for hooks with fresh QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useEvolution Hook Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose evolution, isLoading, isError, and refetch', async () => {
    const { result } = renderHook(() => useEvolution(), { wrapper: createWrapper() });

    // Check interface
    expect(result.current).toHaveProperty('evolution');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useEvolution(), { wrapper: createWrapper() });

    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useQuests Hook Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose quests array, isLoading, isError, and refetch', async () => {
    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    // Check interface
    expect(result.current).toHaveProperty('quests');
    expect(Array.isArray(result.current.quests)).toBe(true);
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should return empty array when loading', () => {
    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    // Should return empty array (fallback) during loading
    expect(result.current.quests).toEqual([]);
  });
});

describe('useBadges Hook Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose badges array, isLoading, isError, and refetch', async () => {
    const { result } = renderHook(() => useBadges(), { wrapper: createWrapper() });

    // Check interface
    expect(result.current).toHaveProperty('badges');
    expect(Array.isArray(result.current.badges)).toBe(true);
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('refetch');
  });

  it('should return empty array when loading', () => {
    const { result } = renderHook(() => useBadges(), { wrapper: createWrapper() });

    expect(result.current.badges).toEqual([]);
  });
});

describe('useGamification Hook Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose combined gamification data', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper: createWrapper() });

    // Check combined interface
    expect(result.current).toHaveProperty('evolution');
    expect(result.current).toHaveProperty('quests');
    expect(result.current).toHaveProperty('badges');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('refetchAll');
    expect(typeof result.current.refetchAll).toBe('function');
  });

  it('should provide refetchAll function that returns a promise', () => {
    const { result } = renderHook(() => useGamification(), { wrapper: createWrapper() });

    // refetchAll should return a promise
    const promise = result.current.refetchAll();
    expect(promise).toBeInstanceOf(Promise);
  });
});

describe('useLeaderboard Hook Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose leaderboard data and settings', async () => {
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() });

    // Check interface
    expect(result.current).toHaveProperty('entries');
    expect(result.current).toHaveProperty('settings');
    expect(result.current).toHaveProperty('period');
    expect(result.current).toHaveProperty('updatedAt');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('should expose opt-in and opt-out functions', async () => {
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() });

    expect(result.current).toHaveProperty('optIn');
    expect(result.current).toHaveProperty('optOut');
    expect(typeof result.current.optIn).toBe('function');
    expect(typeof result.current.optOut).toBe('function');
  });

  it('should expose loading states for opt-in and opt-out', async () => {
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() });

    expect(result.current).toHaveProperty('isOptingIn');
    expect(result.current).toHaveProperty('isOptingOut');
    expect(result.current.isOptingIn).toBe(false);
    expect(result.current.isOptingOut).toBe(false);
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('Gamification Hooks Return Types', () => {
  it('useEvolution returns correct shape', () => {
    const { result } = renderHook(() => useEvolution(), { wrapper: createWrapper() });

    // Type assertions via runtime checks
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isError).toBe('boolean');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useQuests returns correct shape', () => {
    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    expect(Array.isArray(result.current.quests)).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isError).toBe('boolean');
  });

  it('useBadges returns correct shape', () => {
    const { result } = renderHook(() => useBadges(), { wrapper: createWrapper() });

    expect(Array.isArray(result.current.badges)).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isError).toBe('boolean');
  });

  it('useLeaderboard returns correct shape', () => {
    const { result } = renderHook(() => useLeaderboard(), { wrapper: createWrapper() });

    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isError).toBe('boolean');
    expect(typeof result.current.isOptingIn).toBe('boolean');
    expect(typeof result.current.isOptingOut).toBe('boolean');
    expect(typeof result.current.optIn).toBe('function');
    expect(typeof result.current.optOut).toBe('function');
  });
});
