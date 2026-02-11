/**
 * Quests Page Tests
 * =================
 * Tests for VK Mini App Quests page.
 *
 * Test Coverage:
 * - Loading state
 * - Error state with retry
 * - Quest list rendering
 * - Tab filtering (all/active/completed)
 * - Quest statistics
 * - Share functionality for completed quests
 * - Empty state messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import Quests from '@/pages/Quests';
import type { Quest } from '@/api';

// Mock useQuests hook
const mockRefetch = vi.fn();
const mockUseQuests = vi.fn();

vi.mock('@/hooks/useEvolution', () => ({
  useQuests: () => mockUseQuests(),
}));

// Mock VK service
vi.mock('@/services/vk', () => ({
  vk: {
    hapticFeedback: vi.fn(),
    showStoryBox: vi.fn().mockResolvedValue({ result: true }),
    share: vi.fn().mockResolvedValue({ result: true }),
  },
}));

// Sample quest data
const mockQuests: Quest[] = [
  {
    id: 'quest-1',
    type: 'daily',
    title: 'Утренняя практика',
    description: 'Выполни дыхательную практику утром',
    progress: 1,
    target: 1,
    reward: 20,
    status: 'completed',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'quest-2',
    type: 'weekly',
    title: '7 дней подряд',
    description: 'Заполняй дневник сна 7 дней подряд',
    progress: 3,
    target: 7,
    reward: 100,
    status: 'active',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'quest-3',
    type: 'milestone',
    title: '10 сессий дыхания',
    description: 'Выполни 10 сессий дыхания',
    progress: 5,
    target: 10,
    reward: 50,
    status: 'active',
  },
];

// Wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Quests Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  describe('loading state', () => {
    it('should show spinner while loading', () => {
      mockUseQuests.mockReturnValue({
        quests: [],
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Задания')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner
    });
  });

  describe('error state', () => {
    it('should show error message and retry button', () => {
      mockUseQuests.mockReturnValue({
        quests: [],
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Не удалось загрузить задания')).toBeInTheDocument();
      expect(screen.getByText('Повторить')).toBeInTheDocument();
    });

    it('should call refetch on retry button click', async () => {
      mockUseQuests.mockReturnValue({
        quests: [],
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Повторить'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('quest list rendering', () => {
    it('should render all quests', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Утренняя практика')).toBeInTheDocument();
      expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
      expect(screen.getByText('10 сессий дыхания')).toBeInTheDocument();
    });

    it('should show quest descriptions', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Выполни дыхательную практику утром')).toBeInTheDocument();
      expect(screen.getByText('Заполняй дневник сна 7 дней подряд')).toBeInTheDocument();
    });

    it('should show progress for each quest', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('1/1 (100%)')).toBeInTheDocument();
      expect(screen.getByText('3/7 (43%)')).toBeInTheDocument();
      expect(screen.getByText('5/10 (50%)')).toBeInTheDocument();
    });

    it('should show XP badge for active quests', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('+100 XP')).toBeInTheDocument();
      expect(screen.getByText('+50 XP')).toBeInTheDocument();
    });

    it('should show quest type labels', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getAllByText('Ежедневное').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Недельное').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Достижение').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('tab filtering', () => {
    it('should show all quests count in tab', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Все (3)')).toBeInTheDocument();
    });

    it('should show active quests count in tab', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Активные (2)')).toBeInTheDocument();
    });

    it('should show completed quests count in tab', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Выполненные (1)')).toBeInTheDocument();
    });

    it('should filter to show only active quests when Active tab clicked', async () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Активные (2)'));

      await waitFor(() => {
        expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
        expect(screen.getByText('10 сессий дыхания')).toBeInTheDocument();
        // Completed quest should not be visible in filtered view
        expect(screen.queryByText('Утренняя практика')).not.toBeInTheDocument();
      });
    });

    it('should filter to show only completed quests when Completed tab clicked', async () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Выполненные (1)'));

      await waitFor(() => {
        expect(screen.getByText('Утренняя практика')).toBeInTheDocument();
        // Active quests should not be visible
        expect(screen.queryByText('7 дней подряд')).not.toBeInTheDocument();
        expect(screen.queryByText('10 сессий дыхания')).not.toBeInTheDocument();
      });
    });

    it('should show all quests when All tab clicked', async () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      // Click Active first
      fireEvent.click(screen.getByText('Активные (2)'));

      // Then click All
      fireEvent.click(screen.getByText('Все (3)'));

      await waitFor(() => {
        expect(screen.getByText('Утренняя практика')).toBeInTheDocument();
        expect(screen.getByText('7 дней подряд')).toBeInTheDocument();
        expect(screen.getByText('10 сессий дыхания')).toBeInTheDocument();
      });
    });
  });

  describe('quest statistics', () => {
    it('should show active quests count in stats', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      // Stats card should show "2" active
      expect(screen.getByText('Активных')).toBeInTheDocument();
    });

    it('should show completed quests count in stats', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Выполнено')).toBeInTheDocument();
    });

    it('should show total XP earned from completed quests', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('XP получено')).toBeInTheDocument();
      // Total XP from completed quests: 20
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('share functionality', () => {
    it('should show share button for completed quests', () => {
      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Поделиться в истории')).toBeInTheDocument();
    });

    it('should not show share button for active quests', async () => {
      const activeOnlyQuests = mockQuests.filter(q => q.status === 'active');
      mockUseQuests.mockReturnValue({
        quests: activeOnlyQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.queryByText('Поделиться в истории')).not.toBeInTheDocument();
    });

    it('should call vk.showStoryBox on share click', async () => {
      const { vk } = await import('@/services/vk');

      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Поделиться в истории'));

      await waitFor(() => {
        expect(vk.hapticFeedback).toHaveBeenCalledWith('impact', 'medium');
        expect(vk.showStoryBox).toHaveBeenCalled();
      });
    });

    it('should fallback to share when story fails', async () => {
      const { vk } = await import('@/services/vk');
      (vk.showStoryBox as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Story failed')
      );

      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Поделиться в истории'));

      await waitFor(() => {
        expect(vk.share).toHaveBeenCalled();
      });
    });
  });

  describe('empty states', () => {
    it('should show empty state when no quests', () => {
      mockUseQuests.mockReturnValue({
        quests: [],
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      expect(screen.getByText('Нет активных заданий')).toBeInTheDocument();
      expect(screen.getByText('Скоро появятся новые задания!')).toBeInTheDocument();
    });

    it('should show empty state when no completed quests in completed tab', async () => {
      const activeOnlyQuests = mockQuests.filter(q => q.status === 'active');
      mockUseQuests.mockReturnValue({
        quests: activeOnlyQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Выполненные (0)'));

      await waitFor(() => {
        expect(screen.getByText('Нет выполненных заданий')).toBeInTheDocument();
        expect(screen.getByText('Выполняй задания, чтобы получать XP!')).toBeInTheDocument();
      });
    });

    it('should show empty state when no active quests in active tab', async () => {
      const completedOnlyQuests = mockQuests.filter(q => q.status === 'completed');
      mockUseQuests.mockReturnValue({
        quests: completedOnlyQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Активные (0)'));

      await waitFor(() => {
        expect(screen.getByText('Нет активных заданий')).toBeInTheDocument();
      });
    });
  });

  describe('haptic feedback', () => {
    it('should trigger haptic on tab change', async () => {
      const { vk } = await import('@/services/vk');

      mockUseQuests.mockReturnValue({
        quests: mockQuests,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<Quests />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Активные (2)'));

      expect(vk.hapticFeedback).toHaveBeenCalledWith('selection_change');
    });
  });
});
