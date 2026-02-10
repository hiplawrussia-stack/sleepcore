/**
 * Leaderboard Component Tests
 * ===========================
 * Tests for privacy-first leaderboard UI.
 *
 * IEC 62304 Compliance:
 * - Component verification per §5.5
 * - GDPR consent flow validation
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the modules
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: vi.fn(() => ({
    showConfirm: vi.fn(() => Promise.resolve(true)),
  })),
}));

vi.mock('@/services/haptics', () => ({
  haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
  },
}));

import { useTelegram } from '@/hooks/useTelegram';
import { haptics } from '@/services/haptics';
import { Leaderboard, LeaderboardEntry, LeaderboardSettings } from '@/components/gamification/Leaderboard';

const mockEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    displayName: 'Мастер сна',
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
  {
    rank: 3,
    displayName: 'Участник #123',
    isAnonymous: true,
    totalSessions: 25,
    totalMinutes: 250,
    streak: 7,
    evolutionStage: 'owlet',
    isCurrentUser: false,
  },
];

const mockSettings: LeaderboardSettings = {
  isOptedIn: true,
  showAnonymously: false,
};

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading skeleton when loading', () => {
      render(<Leaderboard isLoading settings={mockSettings} />);

      // Should show animated skeleton
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show 5 skeleton items', () => {
      render(<Leaderboard isLoading settings={mockSettings} />);

      const skeletonItems = document.querySelectorAll('.animate-pulse');
      expect(skeletonItems.length).toBe(5);
    });
  });

  describe('opt-in prompt', () => {
    it('should show opt-in prompt when not opted in', () => {
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
        />
      );

      expect(screen.getByText('Присоединиться к рейтингу?')).toBeInTheDocument();
      expect(screen.getByText('Участвовать в рейтинге')).toBeInTheDocument();
    });

    it('should show opt-in prompt when no settings', () => {
      render(<Leaderboard />);

      expect(screen.getByText('Присоединиться к рейтингу?')).toBeInTheDocument();
    });

    it('should show privacy note', () => {
      render(<Leaderboard settings={{ isOptedIn: false, showAnonymously: false }} />);

      expect(screen.getByText(/GDPR/)).toBeInTheDocument();
    });

    it('should toggle anonymous mode', () => {
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={vi.fn()}
        />
      );

      const toggleButton = screen.getByText('👤 С именем');
      fireEvent.click(toggleButton);

      expect(screen.getByText('🔒 Анонимно')).toBeInTheDocument();
      expect(screen.getByText(/Участник #XXX/)).toBeInTheDocument();
    });

    it('should call onOptIn with anonymous=false by default', async () => {
      const onOptIn = vi.fn(() => Promise.resolve());
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={onOptIn}
        />
      );

      const optInButton = screen.getByText('Участвовать в рейтинге');
      fireEvent.click(optInButton);

      await waitFor(() => {
        expect(onOptIn).toHaveBeenCalledWith(false);
      });
    });

    it('should call onOptIn with anonymous=true when toggled', async () => {
      const onOptIn = vi.fn(() => Promise.resolve());
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={onOptIn}
        />
      );

      // Toggle to anonymous
      const toggleButton = screen.getByText('👤 С именем');
      fireEvent.click(toggleButton);

      // Click opt-in
      const optInButton = screen.getByText('Участвовать в рейтинге');
      fireEvent.click(optInButton);

      await waitFor(() => {
        expect(onOptIn).toHaveBeenCalledWith(true);
      });
    });

    it('should show loading state while opting in', async () => {
      const onOptIn = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={onOptIn}
        />
      );

      const optInButton = screen.getByText('Участвовать в рейтинге');
      fireEvent.click(optInButton);

      expect(screen.getByText('Подключаем...')).toBeInTheDocument();
    });

    it('should trigger haptics on opt-in', async () => {
      const onOptIn = vi.fn(() => Promise.resolve());
      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={onOptIn}
        />
      );

      const optInButton = screen.getByText('Участвовать в рейтинге');
      fireEvent.click(optInButton);

      await waitFor(() => {
        expect(haptics.impact).toHaveBeenCalledWith('medium');
        expect(haptics.notification).toHaveBeenCalledWith('success');
      });
    });
  });

  describe('leaderboard display', () => {
    it('should display entries when opted in', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('Рейтинг недели')).toBeInTheDocument();
      expect(screen.getByText('Мастер сна')).toBeInTheDocument();
    });

    it('should display rank badges for top 3', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('🥇')).toBeInTheDocument();
      expect(screen.getByText('🥈')).toBeInTheDocument();
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });

    it('should highlight current user entry', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      // Current user should have "(вы)" suffix
      expect(screen.getByText(/Вы \(вы\)/)).toBeInTheDocument();
    });

    it('should display session and minutes stats', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('50 сессий • 500 мин')).toBeInTheDocument();
    });

    it('should display streak with fire emoji', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('🔥 15')).toBeInTheDocument();
    });

    it('should show evolution stage icons', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('🦉✨')).toBeInTheDocument(); // wise_owl
    });

    it('should show anonymous notice when participating anonymously', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={{ isOptedIn: true, showAnonymously: true }}
        />
      );

      expect(screen.getByText('🔒 Ты участвуешь анонимно')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no entries', () => {
      render(
        <Leaderboard
          entries={[]}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('Рейтинг пока пуст. Будь первым!')).toBeInTheDocument();
    });
  });

  describe('opt-out', () => {
    it('should show opt-out button when opted in', () => {
      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('Выйти')).toBeInTheDocument();
    });

    it('should call onOptOut when confirmed', async () => {
      const onOptOut = vi.fn(() => Promise.resolve());
      vi.mocked(useTelegram).mockReturnValue({
        showConfirm: vi.fn(() => Promise.resolve(true)),
      } as ReturnType<typeof useTelegram>);

      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
          onOptOut={onOptOut}
        />
      );

      const optOutButton = screen.getByText('Выйти');
      fireEvent.click(optOutButton);

      await waitFor(() => {
        expect(onOptOut).toHaveBeenCalled();
      });
    });

    it('should not call onOptOut when not confirmed', async () => {
      const onOptOut = vi.fn(() => Promise.resolve());
      vi.mocked(useTelegram).mockReturnValue({
        showConfirm: vi.fn(() => Promise.resolve(false)),
      } as ReturnType<typeof useTelegram>);

      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
          onOptOut={onOptOut}
        />
      );

      const optOutButton = screen.getByText('Выйти');
      fireEvent.click(optOutButton);

      await waitFor(() => {
        expect(onOptOut).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle opt-in error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onOptIn = vi.fn(() => Promise.reject(new Error('Network error')));

      render(
        <Leaderboard
          settings={{ isOptedIn: false, showAnonymously: false }}
          onOptIn={onOptIn}
        />
      );

      const optInButton = screen.getByText('Участвовать в рейтинге');
      fireEvent.click(optInButton);

      await waitFor(() => {
        expect(haptics.notification).toHaveBeenCalledWith('error');
      });

      consoleSpy.mockRestore();
    });

    it('should handle opt-out error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onOptOut = vi.fn(() => Promise.reject(new Error('Network error')));
      vi.mocked(useTelegram).mockReturnValue({
        showConfirm: vi.fn(() => Promise.resolve(true)),
      } as ReturnType<typeof useTelegram>);

      render(
        <Leaderboard
          entries={mockEntries}
          settings={mockSettings}
          onOptOut={onOptOut}
        />
      );

      const optOutButton = screen.getByText('Выйти');
      fireEvent.click(optOutButton);

      await waitFor(() => {
        expect(haptics.notification).toHaveBeenCalledWith('error');
      });

      consoleSpy.mockRestore();
    });
  });
});
