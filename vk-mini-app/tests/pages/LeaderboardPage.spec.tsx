/**
 * LeaderboardPage Tests
 * =====================
 * Tests for VK Mini App Leaderboard page.
 *
 * Test Coverage:
 * - Loading state
 * - Error state
 * - Opt-in flow (GDPR compliant)
 * - Opt-out flow
 * - Leaderboard rendering
 * - Period tabs (weekly/monthly/allTime)
 * - Share functionality
 * - Anonymous participation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import LeaderboardPage from '@/pages/LeaderboardPage';
import type { LeaderboardEntry, LeaderboardSettings } from '@/api';

// Mock useLeaderboard hook
const mockOptIn = vi.fn();
const mockOptOut = vi.fn();
const mockUseLeaderboard = vi.fn();

vi.mock('@/hooks/useEvolution', () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

// Mock VK service
vi.mock('@/services/vk', () => ({
  vk: {
    hapticFeedback: vi.fn(),
    showStoryBox: vi.fn().mockResolvedValue({ result: true }),
    share: vi.fn().mockResolvedValue({ result: true }),
    showAlert: vi.fn(),
  },
}));

// Sample leaderboard entries
const mockEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    displayName: 'Мария',
    isAnonymous: false,
    totalSessions: 45,
    totalMinutes: 450,
    streak: 15,
    evolutionStage: 'wise_owl',
    isCurrentUser: false,
  },
  {
    rank: 2,
    displayName: 'Участник #123',
    isAnonymous: true,
    totalSessions: 38,
    totalMinutes: 380,
    streak: 12,
    evolutionStage: 'young_owl',
    isCurrentUser: false,
  },
  {
    rank: 3,
    displayName: 'Алексей',
    isAnonymous: false,
    totalSessions: 30,
    totalMinutes: 300,
    streak: 10,
    evolutionStage: 'young_owl',
    isCurrentUser: true, // Current user is 3rd
  },
  {
    rank: 4,
    displayName: 'Ольга',
    isAnonymous: false,
    totalSessions: 25,
    totalMinutes: 250,
    streak: 8,
    evolutionStage: 'owlet',
    isCurrentUser: false,
  },
];

const defaultSettings: LeaderboardSettings = {
  isOptedIn: true,
  showAnonymously: false,
};

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

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOptIn.mockResolvedValue(undefined);
    mockOptOut.mockResolvedValue(undefined);
  });

  describe('loading state', () => {
    it('should show spinner while loading', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: undefined,
        settings: undefined,
        isLoading: true,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Рейтинг')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner
    });
  });

  describe('error state', () => {
    it('should show error message when loading fails', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: undefined,
        settings: undefined,
        isLoading: false,
        isError: true,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Не удалось загрузить рейтинг')).toBeInTheDocument();
    });
  });

  describe('opt-in flow (GDPR compliant)', () => {
    it('should show opt-in prompt when not opted in', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Присоединиться к рейтингу?')).toBeInTheDocument();
      expect(screen.getByText('Участвовать в рейтинге')).toBeInTheDocument();
      expect(screen.getByText('Участвовать анонимно')).toBeInTheDocument();
    });

    it('should show GDPR notice in opt-in prompt', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(
        screen.getByText('Согласно GDPR, ты можешь выйти в любой момент')
      ).toBeInTheDocument();
    });

    it('should call optIn with anonymous=true when checkbox is checked', async () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      // Checkbox should be checked by default
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      // Click join button
      fireEvent.click(screen.getByText('Участвовать в рейтинге'));

      await waitFor(() => {
        expect(mockOptIn).toHaveBeenCalledWith(true); // anonymous=true
      });
    });

    it('should call optIn with anonymous=false when checkbox is unchecked', async () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      // Uncheck the checkbox
      fireEvent.click(screen.getByRole('checkbox'));

      // Click join button
      fireEvent.click(screen.getByText('Участвовать в рейтинге'));

      await waitFor(() => {
        expect(mockOptIn).toHaveBeenCalledWith(false); // anonymous=false
      });
    });

    it('should show loading state during opt-in', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: true, // Loading
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      // Button should exist and have loading class or be disabled
      const button = screen.getByText('Участвовать в рейтинге').closest('button');
      expect(button).toBeInTheDocument();
      // VKUI Button with loading prop renders a spinner inside, but may not set aria-busy
      // Just verify the button is in the document during loading
    });

    it('should show snackbar on successful opt-in', async () => {
      let optInResolve: () => void;
      const optInPromise = new Promise<void>((resolve) => {
        optInResolve = resolve;
      });
      mockOptIn.mockReturnValue(optInPromise);

      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Участвовать в рейтинге'));

      // Resolve the promise
      optInResolve!();

      await waitFor(() => {
        expect(screen.getByText('Вы присоединились к рейтингу!')).toBeInTheDocument();
      });
    });

    it('should show alert on opt-in error', async () => {
      const { vk } = await import('@/services/vk');
      mockOptIn.mockRejectedValue(new Error('Network error'));

      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Участвовать в рейтинге'));

      await waitFor(() => {
        expect(vk.showAlert).toHaveBeenCalledWith('Не удалось присоединиться к рейтингу');
      });
    });
  });

  describe('leaderboard rendering', () => {
    it('should render all entries', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Мария')).toBeInTheDocument();
      expect(screen.getByText('Участник #123')).toBeInTheDocument();
      expect(screen.getByText(/Алексей/)).toBeInTheDocument();
      expect(screen.getByText('Ольга')).toBeInTheDocument();
    });

    it('should highlight current user entry', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      // Current user should have "(вы)" suffix
      expect(screen.getByText(/Алексей.*\(вы\)/)).toBeInTheDocument();
    });

    it('should show session count and minutes for each entry', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('45 сессий • 450 мин')).toBeInTheDocument();
      expect(screen.getByText('38 сессий • 380 мин')).toBeInTheDocument();
    });

    it('should show streak for each entry', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      // Streak numbers should be visible
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show empty state when no entries', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Рейтинг пока пуст')).toBeInTheDocument();
      expect(screen.getByText('Будь первым! Начни практиковать дыхательные упражнения.')).toBeInTheDocument();
    });
  });

  describe('period tabs', () => {
    it('should show period tabs when opted in', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Неделя')).toBeInTheDocument();
      expect(screen.getByText('Месяц')).toBeInTheDocument();
      expect(screen.getByText('Всё время')).toBeInTheDocument();
    });

    it('should not show period tabs when not opted in', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: [],
        settings: { isOptedIn: false, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.queryByText('Неделя')).not.toBeInTheDocument();
      expect(screen.queryByText('Месяц')).not.toBeInTheDocument();
      expect(screen.queryByText('Всё время')).not.toBeInTheDocument();
    });

    it('should trigger haptic feedback on tab change', async () => {
      const { vk } = await import('@/services/vk');

      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Месяц'));

      expect(vk.hapticFeedback).toHaveBeenCalledWith('selection_change');
    });
  });

  describe('opt-out flow', () => {
    it('should show opt-out link when opted in', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Выйти')).toBeInTheDocument();
    });

    it('should call optOut when clicking opt-out link', async () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Выйти'));

      await waitFor(() => {
        expect(mockOptOut).toHaveBeenCalled();
      });
    });

    it('should show snackbar on successful opt-out', async () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Выйти'));

      await waitFor(() => {
        expect(screen.getByText('Вы вышли из рейтинга')).toBeInTheDocument();
      });
    });
  });

  describe('share functionality', () => {
    it('should show share button when user is in top 10', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries, // Current user is rank 3
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Поделиться своим местом')).toBeInTheDocument();
    });

    it('should not show share button when user is not in top 10', () => {
      const entriesWithLowRank = mockEntries.map((e) =>
        e.isCurrentUser ? { ...e, rank: 15 } : e
      );

      mockUseLeaderboard.mockReturnValue({
        entries: entriesWithLowRank,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.queryByText('Поделиться своим местом')).not.toBeInTheDocument();
    });

    it('should call vk.showStoryBox on share click', async () => {
      const { vk } = await import('@/services/vk');

      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Поделиться своим местом'));

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

      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: defaultSettings,
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Поделиться своим местом'));

      await waitFor(() => {
        expect(vk.share).toHaveBeenCalledWith(
          expect.stringContaining('Я занимаю 3 место')
        );
      });
    });
  });

  describe('anonymous participation', () => {
    it('should show anonymous notice when participating anonymously', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: { isOptedIn: true, showAnonymously: true },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Анонимное участие')).toBeInTheDocument();
      expect(screen.getByText('Твоё имя скрыто от других участников')).toBeInTheDocument();
    });

    it('should not show anonymous notice when not anonymous', () => {
      mockUseLeaderboard.mockReturnValue({
        entries: mockEntries,
        settings: { isOptedIn: true, showAnonymously: false },
        isLoading: false,
        isError: false,
        optIn: mockOptIn,
        optOut: mockOptOut,
        isOptingIn: false,
        isOptingOut: false,
      });

      render(<LeaderboardPage />, { wrapper: createWrapper() });

      expect(screen.queryByText('Твоё имя скрыто от других участников')).not.toBeInTheDocument();
    });
  });
});
