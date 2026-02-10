/**
 * QuestsPanel Component Tests
 * ===========================
 * Tests for quest display, progress, and interactions.
 *
 * IEC 62304 Compliance:
 * - Component verification per §5.5
 * - UI behavior validation
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the modules
vi.mock('@/hooks/useEvolution', () => ({
  useQuests: vi.fn(),
}));

vi.mock('@/services/haptics', () => ({
  haptics: {
    selectionChanged: vi.fn(),
  },
}));

import { useQuests } from '@/hooks/useEvolution';
import { QuestsPanel } from '@/components/gamification/QuestsPanel';

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

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
  {
    id: '3',
    questId: 'daily_expired',
    title: 'Ежедневное задание',
    description: 'Истекшее задание',
    progress: 0,
    target: 1,
    status: 'expired' as const,
    reward: 20,
    startedAt: '2025-01-01T00:00:00Z',
  },
];

describe('QuestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading skeleton when loading', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      // Should show animated skeleton
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should show error message when fetch fails', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('Не удалось загрузить задания')).toBeInTheDocument();
      expect(screen.getByText('Попробовать снова')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no quests', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('Задания пока недоступны')).toBeInTheDocument();
    });

    it('should show active-specific message when activeOnly and no active quests', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel activeOnly />, { wrapper: createWrapper() });

      expect(screen.getByText('Нет активных заданий')).toBeInTheDocument();
    });
  });

  describe('with quests data', () => {
    it('should display quest titles', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
      expect(screen.getByText('10 сессий')).toBeInTheDocument();
    });

    it('should display progress for active quests', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('3 / 7')).toBeInTheDocument();
      expect(screen.getByText('43%')).toBeInTheDocument(); // Math.round(3/7 * 100)
    });

    it('should display rewards', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('+100 XP')).toBeInTheDocument();
      expect(screen.getByText('+50 XP')).toBeInTheDocument();
    });

    it('should show header when not compact', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('Задания')).toBeInTheDocument();
      expect(screen.getByText('Обновить')).toBeInTheDocument();
    });

    it('should hide header when compact', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel compact />, { wrapper: createWrapper() });

      expect(screen.queryByText('Задания')).not.toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter to only active quests when activeOnly is true', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel activeOnly />, { wrapper: createWrapper() });

      expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
      expect(screen.queryByText('10 сессий')).not.toBeInTheDocument();
      expect(screen.queryByText('Ежедневное задание')).not.toBeInTheDocument();
    });

    it('should limit displayed quests when limit is set', () => {
      vi.mocked(useQuests).mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel limit={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
      expect(screen.queryByText('10 сессий')).not.toBeInTheDocument();
      expect(screen.getByText('+2 ещё')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort quests: active first, then completed, then expired', () => {
      const unsortedQuests = [
        { ...mockQuests[2] }, // expired
        { ...mockQuests[1] }, // completed
        { ...mockQuests[0] }, // active
      ];

      vi.mocked(useQuests).mockReturnValue({
        quests: unsortedQuests,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<QuestsPanel />, { wrapper: createWrapper() });

      const questTitles = screen.getAllByRole('heading', { level: 4 });
      expect(questTitles[0]).toHaveTextContent('7 дней подряд'); // active first
    });
  });
});
