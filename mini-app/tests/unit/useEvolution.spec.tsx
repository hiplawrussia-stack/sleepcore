/**
 * useEvolution Hook Tests
 * =======================
 * Tests for evolution, quests, badges, and leaderboard hooks.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5
 * - Traceable test cases
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the modules
vi.mock('@/api', () => ({
  apiClient: {
    request: vi.fn(),
    requestValidated: vi.fn(),
  },
  queryKeys: {
    user: {
      all: ['user'],
      evolution: () => ['user', 'evolution'],
      quests: () => ['user', 'quests'],
      badges: () => ['user', 'badges'],
    },
    leaderboard: {
      all: ['leaderboard'],
      weekly: () => ['leaderboard', 'weekly'],
    },
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
  })),
}));

import { apiClient } from '@/api';
import { useAuthStore } from '@/store/authStore';
import {
  useEvolution,
  useQuests,
  useBadges,
  useGamification,
  useLeaderboard,
} from '@/hooks/useEvolution';

// Create wrapper for React Query
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
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useEvolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  describe('when authenticated', () => {
    it('should fetch evolution data successfully', async () => {
      const mockEvolution = {
        currentStage: 'young_owl',
        stageName: 'Молодая сова',
        stageEmoji: '🦉',
        daysActive: 15,
        progress: 45,
        nextStage: 'wise_owl',
        daysToNext: 15,
      };

      vi.mocked(apiClient.requestValidated).mockResolvedValueOnce(mockEvolution);

      const { result } = renderHook(() => useEvolution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.evolution).toEqual(mockEvolution);
      expect(result.current.isError).toBe(false);
    });

    it('should handle API errors', async () => {
      vi.mocked(apiClient.requestValidated).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEvolution(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('when not authenticated', () => {
    it('should not fetch data', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
      } as ReturnType<typeof useAuthStore>);

      const { result } = renderHook(() => useEvolution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.evolution).toBeUndefined();
      expect(apiClient.requestValidated).not.toHaveBeenCalled();
    });
  });
});

describe('useQuests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  it('should fetch quests data successfully', async () => {
    const mockQuests = [
      {
        id: '1',
        questId: 'streak_7',
        title: '7 дней подряд',
        description: 'Практикуй дыхание 7 дней подряд',
        progress: 3,
        target: 7,
        status: 'active' as const,
        reward: 100,
        startedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        questId: 'sessions_10',
        title: '10 сессий',
        description: 'Выполни 10 сессий дыхания',
        progress: 10,
        target: 10,
        status: 'completed' as const,
        reward: 50,
        startedAt: '2025-01-01T00:00:00Z',
        completedAt: '2025-01-05T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.requestValidated).mockResolvedValueOnce({ quests: mockQuests });

    const { result } = renderHook(() => useQuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.quests).toEqual(mockQuests);
    expect(result.current.quests).toHaveLength(2);
  });

  it('should return empty array when no quests', async () => {
    vi.mocked(apiClient.requestValidated).mockResolvedValueOnce({ quests: [] });

    const { result } = renderHook(() => useQuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.quests).toEqual([]);
  });
});

describe('useBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  it('should fetch badges data successfully', async () => {
    const mockBadges = [
      { badgeId: 'first_session', earnedAt: '2025-01-01T00:00:00Z' },
      { badgeId: 'week_streak', earnedAt: '2025-01-07T00:00:00Z' },
    ];

    vi.mocked(apiClient.requestValidated).mockResolvedValueOnce({ badges: mockBadges });

    const { result } = renderHook(() => useBadges(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.badges).toEqual(mockBadges);
    expect(result.current.badges).toHaveLength(2);
  });
});

describe('useGamification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  it('should combine evolution, quests, and badges data', async () => {
    const mockEvolution = {
      currentStage: 'owlet',
      stageName: 'Совёнок',
      stageEmoji: '🐣',
      daysActive: 3,
      progress: 10,
      nextStage: 'young_owl',
      daysToNext: 27,
    };

    const mockQuests = [
      {
        id: '1',
        questId: 'daily_session',
        title: 'Ежедневная практика',
        description: 'Выполни сессию сегодня',
        progress: 0,
        target: 1,
        status: 'active' as const,
        reward: 20,
        startedAt: '2025-01-01T00:00:00Z',
      },
    ];

    const mockBadges = [
      { badgeId: 'first_session', earnedAt: '2025-01-01T00:00:00Z' },
    ];

    vi.mocked(apiClient.requestValidated)
      .mockResolvedValueOnce(mockEvolution)
      .mockResolvedValueOnce({ quests: mockQuests })
      .mockResolvedValueOnce({ badges: mockBadges });

    const { result } = renderHook(() => useGamification(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.evolution).toEqual(mockEvolution);
    expect(result.current.quests).toEqual(mockQuests);
    expect(result.current.badges).toEqual(mockBadges);
  });

  it('should have refetchAll function', async () => {
    vi.mocked(apiClient.requestValidated).mockResolvedValue({});

    const { result } = renderHook(() => useGamification(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetchAll).toBe('function');
  });
});

describe('useLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  it('should fetch leaderboard data successfully', async () => {
    const mockLeaderboard = {
      entries: [
        {
          rank: 1,
          displayName: 'User 1',
          isAnonymous: false,
          totalSessions: 50,
          totalMinutes: 500,
          streak: 15,
          evolutionStage: 'wise_owl',
          isCurrentUser: false,
        },
        {
          rank: 2,
          displayName: 'Вы',
          isAnonymous: false,
          totalSessions: 30,
          totalMinutes: 300,
          streak: 10,
          evolutionStage: 'young_owl',
          isCurrentUser: true,
        },
      ],
      userSettings: {
        isOptedIn: true,
        showAnonymously: false,
      },
      period: 'weekly',
      updatedAt: '2026-02-10T00:00:00Z',
    };

    vi.mocked(apiClient.requestValidated).mockResolvedValueOnce(mockLeaderboard);

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entries).toEqual(mockLeaderboard.entries);
    expect(result.current.settings).toEqual(mockLeaderboard.userSettings);
  });

  it('should provide optIn function', async () => {
    vi.mocked(apiClient.requestValidated).mockResolvedValue({
      entries: [],
      userSettings: { isOptedIn: false, showAnonymously: false },
      period: 'weekly',
      updatedAt: '2026-02-10T00:00:00Z',
    });

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.optIn).toBe('function');
  });

  it('should provide optOut function', async () => {
    vi.mocked(apiClient.requestValidated).mockResolvedValue({
      entries: [],
      settings: { isOptedIn: true, showAnonymously: false },
    });

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.optOut).toBe('function');
  });
});
