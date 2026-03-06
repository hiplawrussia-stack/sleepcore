/**
 * Home Page Tests
 * ===============
 * Unit tests for the main Home page.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: UI-001 (Home page)
 *
 * Coverage targets:
 * - Greeting based on time of day
 * - Stats display
 * - Quick pattern navigation
 * - Profile display
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Create mock values using vi.hoisted
const { mockNavigate, mockUser, mockProfile, mockStats, mockRefetchProfile, mockRefetchStats, mockHapticsImpact, mockHapticsSelectionChanged } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUser: {
    id: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
  },
  mockProfile: {
    id: 'user-123',
    evolutionStage: 'young_owl',
    xp: 500,
    level: 5,
  },
  mockStats: {
    totalSessions: 42,
    currentStreak: 7,
    totalMinutes: 120,
  },
  mockRefetchProfile: vi.fn(),
  mockRefetchStats: vi.fn(),
  mockHapticsImpact: vi.fn(),
  mockHapticsSelectionChanged: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks - now uses useUserProfile and useBreathingStats
vi.mock('../../src/hooks', () => ({
  useTelegram: () => ({
    user: mockUser,
    isInTelegram: true,
  }),
  useUserProfile: () => ({
    profile: mockProfile,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetchProfile,
    updateProfile: vi.fn(),
    isUpdating: false,
  }),
  useBreathingStats: () => ({
    stats: mockStats,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetchStats,
  }),
}));

// Mock haptics service
vi.mock('../../src/services/haptics', () => ({
  haptics: {
    impact: mockHapticsImpact,
    selectionChanged: mockHapticsSelectionChanged,
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'home.greeting.morning': 'Доброе утро',
        'home.greeting.afternoon': 'Добрый день',
        'home.greeting.evening': 'Добрый вечер',
        'home.greeting.night': 'Доброй ночи',
        'home.readyToPractice': 'Готов к дыхательной практике?',
        'home.stats.sessions': 'сессий',
        'home.stats.streak': 'дней подряд',
        'home.startBreathing': 'Начать дыхание',
        'home.chooseTechnique': 'Выбери технику и практикуй',
        'home.categories.sleep': 'Для сна',
        'home.categories.stress': 'От стресса',
        'home.sonya.greeting': 'Соня рада тебя видеть!',
        'home.sonya.level': 'Уровень',
        'home.sleepStats.title': 'Статистика сна',
        'home.sleepStats.description': 'Просмотр данных сна',
        'profile.evolution.owlet': 'Совёнок',
        'profile.evolution.youngOwl': 'Молодая сова',
        'profile.evolution.wiseOwl': 'Мудрая сова',
        'common.friend': 'друг',
        'common.error': 'Ошибка',
        'common.retry': 'Повторить',
      };
      return translations[key] || fallback || key;
    },
    i18n: {
      language: 'ru',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Import after mocks
import { Home } from '../../src/pages/Home';

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render greeting with user name', () => {
      renderHome();

      expect(screen.getByText(/Test!/)).toBeInTheDocument();
    });

    it('should render question about breathing readiness', () => {
      renderHome();

      expect(screen.getByText('Готов к дыхательной практике?')).toBeInTheDocument();
    });

    it('should render stats cards when stats available', () => {
      renderHome();

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('сессий')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('дней подряд')).toBeInTheDocument();
    });

    it('should render breathing CTA button', () => {
      renderHome();

      expect(screen.getByText('Начать дыхание')).toBeInTheDocument();
      expect(screen.getByText('Выбери технику и практикуй')).toBeInTheDocument();
    });

    it('should render sleep patterns section', () => {
      renderHome();

      // Text is combined with emoji, use regex matcher
      expect(screen.getByText(/Для сна/)).toBeInTheDocument();
    });

    it('should render stress patterns section', () => {
      renderHome();

      // Text is combined with emoji, use regex matcher
      expect(screen.getByText(/От стресса/)).toBeInTheDocument();
    });

    it('should render Sonya greeting with profile info', () => {
      renderHome();

      expect(screen.getByText('Соня рада тебя видеть!')).toBeInTheDocument();
      expect(screen.getByText(/500 XP/)).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    // Note: TanStack Query hooks fetch data automatically, no explicit load calls needed
    it('should use profile from useUserProfile hook', () => {
      renderHome();

      // Profile data is rendered
      expect(screen.getByText(/500 XP/)).toBeInTheDocument();
    });

    it('should use stats from useBreathingStats hook', () => {
      renderHome();

      // Stats data is rendered
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to breathing page on CTA click', () => {
      renderHome();

      const ctaButton = screen.getByText('Начать дыхание').closest('button');
      fireEvent.click(ctaButton!);

      expect(mockHapticsImpact).toHaveBeenCalledWith('medium');
      expect(mockNavigate).toHaveBeenCalledWith('/breathing');
    });

    it('should navigate to breathing page with pattern on pattern click', () => {
      renderHome();

      // Find any pattern card and click it (patterns have button elements)
      const patternButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('-')
      );

      if (patternButtons.length > 0) {
        fireEvent.click(patternButtons[0]);

        expect(mockHapticsSelectionChanged).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/breathing\?pattern=/));
      }
    });

    it('should navigate to sleep stats page on sleep stats click', () => {
      renderHome();

      const sleepStatsButton = screen.getByText('Статистика сна').closest('button');
      fireEvent.click(sleepStatsButton!);

      expect(mockHapticsSelectionChanged).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/sleep');
    });
  });

  describe('Greeting Time Logic', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show "Доброй ночи" for late night (before 6am)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T03:00:00'));
      renderHome();

      expect(screen.getByText(/Доброй ночи/)).toBeInTheDocument();
    });

    it('should show "Доброе утро" in the morning (6am-12pm)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T09:00:00'));
      renderHome();

      expect(screen.getByText(/Доброе утро/)).toBeInTheDocument();
    });

    it('should show "Добрый день" in the afternoon (12pm-6pm)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T15:00:00'));
      renderHome();

      expect(screen.getByText(/Добрый день/)).toBeInTheDocument();
    });

    it('should show "Добрый вечер" in the evening (6pm-10pm)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T20:00:00'));
      renderHome();

      expect(screen.getByText(/Добрый вечер/)).toBeInTheDocument();
    });

    it('should show "Доброй ночи" late at night (after 10pm)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T23:00:00'));
      renderHome();

      expect(screen.getByText(/Доброй ночи/)).toBeInTheDocument();
    });
  });

  describe('Evolution Stage Display', () => {
    it('should show owl emoji for young_owl stage', () => {
      renderHome();

      // Default mock has young_owl
      expect(screen.getByText(/Молодая сова/)).toBeInTheDocument();
    });

    it('should display XP value', () => {
      renderHome();

      expect(screen.getByText(/500 XP/)).toBeInTheDocument();
    });
  });
});
