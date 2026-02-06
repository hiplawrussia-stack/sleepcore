/**
 * ProgressVisualizationService Tests
 * ===================================
 *
 * Tests for text-based progress visualization service.
 * Validates progress bars, streak display, and therapy progress visualization.
 *
 * @packageDocumentation
 */

import {
  ProgressVisualizationService,
  progressVisualization,
  type ITherapyProgress,
} from '../ProgressVisualizationService';
import type { IStreakData, IStreakMilestone } from '../StreakService';

describe('ProgressVisualizationService', () => {
  let service: ProgressVisualizationService;

  beforeEach(() => {
    service = new ProgressVisualizationService();
  });

  /**
   * Create test streak data
   */
  function createStreakData(overrides: Partial<IStreakData> = {}): IStreakData {
    return {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: new Date().toISOString().split('T')[0],
      freezesAvailable: 1,
      freezesUsedThisWeek: 0,
      totalActiveDays: 20,
      lastFreezeGrantDate: null,
      weeklyActivity: [],
      milestoneReached: [],
      ...overrides,
    };
  }

  // ==========================================================================
  // Progress Bar Creation
  // ==========================================================================
  describe('Progress Bar Creation', () => {
    it('should create progress bar with default settings', () => {
      const bar = service.createProgressBar(50);

      expect(bar).toContain('█');
      expect(bar).toContain('░');
      expect(bar).toContain('50%');
    });

    it('should create progress bar at 0%', () => {
      const bar = service.createProgressBar(0);

      expect(bar).toContain('░░░░░░░░░░');
      expect(bar).toContain('0%');
    });

    it('should create progress bar at 100%', () => {
      const bar = service.createProgressBar(100);

      expect(bar).toContain('██████████');
      expect(bar).toContain('100%');
    });

    it('should clamp progress to 0-100', () => {
      const barNegative = service.createProgressBar(-10);
      expect(barNegative).toContain('0%');

      const barOver = service.createProgressBar(150);
      expect(barOver).toContain('100%');
    });

    it('should create bar with blocks style', () => {
      const bar = service.createProgressBar(50, { style: 'blocks' });

      expect(bar).toContain('█');
      expect(bar).toContain('░');
    });

    it('should create bar with circles style', () => {
      const bar = service.createProgressBar(50, { style: 'circles' });

      expect(bar).toContain('●');
      expect(bar).toContain('○');
    });

    it('should create bar with squares style', () => {
      const bar = service.createProgressBar(50, { style: 'squares' });

      expect(bar).toContain('■');
      expect(bar).toContain('□');
    });

    it('should create bar with minimal style', () => {
      const bar = service.createProgressBar(50, { style: 'minimal' });

      expect(bar).toContain('▓');
      expect(bar).toContain('░');
    });

    it('should respect custom width', () => {
      const bar = service.createProgressBar(100, { width: 5, showPercentage: false });

      expect(bar).toBe('█████');
      expect(bar.length).toBe(5);
    });

    it('should hide percentage when configured', () => {
      const bar = service.createProgressBar(50, { showPercentage: false });

      expect(bar).not.toContain('%');
    });
  });

  // ==========================================================================
  // Streak Line Display
  // ==========================================================================
  describe('Streak Line Display', () => {
    it('should show zero streak message', () => {
      const streakData = createStreakData({ currentStreak: 0 });
      const line = service.createStreakLine(streakData);

      expect(line).toContain('🔥');
      expect(line).toContain('начни сегодня');
    });

    it('should show streak count with correct pluralization', () => {
      // 1 день
      let line = service.createStreakLine(createStreakData({ currentStreak: 1 }));
      expect(line).toContain('*1*');
      expect(line).toContain('день');

      // 3 дня
      line = service.createStreakLine(createStreakData({ currentStreak: 3 }));
      expect(line).toContain('*3*');
      expect(line).toContain('дня');

      // 5 дней
      line = service.createStreakLine(createStreakData({ currentStreak: 5 }));
      expect(line).toContain('*5*');
      expect(line).toContain('дней');

      // 21 день
      line = service.createStreakLine(createStreakData({ currentStreak: 21 }));
      expect(line).toContain('*21*');
      expect(line).toContain('день');

      // 11 дней (exception)
      line = service.createStreakLine(createStreakData({ currentStreak: 11 }));
      expect(line).toContain('дней');
    });

    it('should show single flame for short streaks', () => {
      const line = service.createStreakLine(createStreakData({ currentStreak: 5 }));

      expect(line).toContain('🔥');
      expect(line).not.toContain('🔥🔥');
    });

    it('should show double flame for 14+ day streaks', () => {
      const line = service.createStreakLine(createStreakData({ currentStreak: 14 }));

      expect(line).toContain('🔥🔥');
    });

    it('should show triple flame for 30+ day streaks', () => {
      const line = service.createStreakLine(createStreakData({ currentStreak: 30 }));

      expect(line).toContain('🔥🔥🔥');
    });

    it('should show personal best for relevant streaks', () => {
      const line = service.createStreakLine(
        createStreakData({ currentStreak: 5, longestStreak: 20 })
      );

      expect(line).toContain('рекорд: 20');
    });

    it('should not show personal best if current equals longest', () => {
      const line = service.createStreakLine(
        createStreakData({ currentStreak: 10, longestStreak: 10 })
      );

      expect(line).not.toContain('рекорд');
    });
  });

  // ==========================================================================
  // Weekly Calendar
  // ==========================================================================
  describe('Weekly Calendar', () => {
    it('should create weekly calendar view', () => {
      const calendar = service.createWeeklyCalendar(createStreakData());

      expect(calendar).toContain('📅');
      expect(calendar).toContain('Последние 7 дней');
      expect(calendar).toContain('Пн');
      expect(calendar).toContain('Вс');
    });

    it('should create weekly dots view (compact)', () => {
      const dots = service.createWeeklyDots(createStreakData());

      expect(dots).toContain('📓');
      expect(dots).toContain('Неделя');
    });
  });

  // ==========================================================================
  // Therapy Progress
  // ==========================================================================
  describe('Therapy Progress', () => {
    it('should create therapy progress display', () => {
      const therapyProgress: ITherapyProgress = {
        currentWeek: 3,
        totalWeeks: 8,
        completedModules: ['module1', 'module2'],
        currentModule: 'module3',
      };

      const display = service.createTherapyProgress(therapyProgress);

      expect(display).toContain('📚');
      expect(display).toContain('Неделя 3 из 8');
      expect(display).toContain('█');
    });

    it('should show correct percentage for therapy progress', () => {
      const therapyProgress: ITherapyProgress = {
        currentWeek: 4,
        totalWeeks: 8,
        completedModules: [],
      };

      const display = service.createTherapyProgress(therapyProgress);

      expect(display).toContain('50%');
    });
  });

  // ==========================================================================
  // Milestone Preview
  // ==========================================================================
  describe('Milestone Preview', () => {
    it('should create next milestone preview', () => {
      const preview = service.createNextMilestonePreview(
        createStreakData({ currentStreak: 5 })
      );

      expect(preview).toContain('До');
      expect(preview).toContain('●');
      expect(preview).toContain('○');
    });

    it('should show all milestones achieved for high streaks', () => {
      const preview = service.createNextMilestonePreview(
        createStreakData({ currentStreak: 100 })
      );

      expect(preview).toContain('Все milestones достигнуты');
    });
  });

  // ==========================================================================
  // Freeze Status
  // ==========================================================================
  describe('Freeze Status', () => {
    it('should show no freezes available message', () => {
      const status = service.createFreezeStatus(
        createStreakData({ freezesAvailable: 0 })
      );

      expect(status).toContain('❄️');
      expect(status).toContain('нет');
      expect(status).toContain('понедельник');
    });

    it('should show available freezes count', () => {
      const status = service.createFreezeStatus(
        createStreakData({ freezesAvailable: 2 })
      );

      expect(status).toContain('❄️❄️');
      expect(status).toContain('2 шт.');
    });
  });

  // ==========================================================================
  // Full Progress Summary
  // ==========================================================================
  describe('Full Progress Summary', () => {
    it('should create full progress summary', () => {
      const summary = service.createFullProgressSummary(
        createStreakData(),
        undefined,
        'Анна'
      );

      expect(summary).toContain('📊');
      expect(summary).toContain('Прогресс: Анна');
      expect(summary).toContain('🔥');
      expect(summary).toContain('📓');
      expect(summary).toContain('❄️');
    });

    it('should create summary without user name', () => {
      const summary = service.createFullProgressSummary(createStreakData());

      expect(summary).toContain('Твой прогресс');
    });

    it('should include therapy progress when provided', () => {
      const therapyProgress: ITherapyProgress = {
        currentWeek: 2,
        totalWeeks: 8,
        completedModules: [],
      };

      const summary = service.createFullProgressSummary(
        createStreakData(),
        therapyProgress
      );

      expect(summary).toContain('📚');
      expect(summary).toContain('Неделя 2 из 8');
    });

    it('should include motivational footer', () => {
      const summary = service.createFullProgressSummary(createStreakData());

      expect(summary).toContain('💡');
    });
  });

  // ==========================================================================
  // Compact Progress
  // ==========================================================================
  describe('Compact Progress', () => {
    it('should create compact progress display', () => {
      const compact = service.createCompactProgress(createStreakData());

      expect(compact).toContain('🔥');
      expect(compact).toContain('📓');
    });
  });

  // ==========================================================================
  // Greeting with Progress
  // ==========================================================================
  describe('Greeting with Progress', () => {
    it('should create morning greeting', () => {
      const greeting = service.createGreetingWithProgress(
        'Иван',
        createStreakData(),
        'morning'
      );

      expect(greeting).toContain('🌅');
      expect(greeting).toContain('Доброе утро');
      expect(greeting).toContain('*Иван*');
    });

    it('should create day greeting', () => {
      const greeting = service.createGreetingWithProgress(
        'Мария',
        createStreakData(),
        'day'
      );

      expect(greeting).toContain('☀️');
      expect(greeting).toContain('Добрый день');
    });

    it('should create evening greeting', () => {
      const greeting = service.createGreetingWithProgress(
        'Петр',
        createStreakData(),
        'evening'
      );

      expect(greeting).toContain('🌆');
      expect(greeting).toContain('Добрый вечер');
    });

    it('should create night greeting', () => {
      const greeting = service.createGreetingWithProgress(
        'Ольга',
        createStreakData(),
        'night'
      );

      expect(greeting).toContain('🌙');
      expect(greeting).toContain('Доброй ночи');
    });

    it('should include compact progress', () => {
      const greeting = service.createGreetingWithProgress(
        'Тест',
        createStreakData(),
        'morning'
      );

      expect(greeting).toContain('🔥');
      expect(greeting).toContain('📓');
    });
  });

  // ==========================================================================
  // Milestone Celebration
  // ==========================================================================
  describe('Milestone Celebration', () => {
    it('should create milestone celebration message', () => {
      const milestone: IStreakMilestone = {
        days: 7,
        title: 'Неделя стойкости',
        badge: '🌟',
        message: 'Ты прошёл первую неделю!',
        isHabitFormed: false,
      };

      const celebration = service.createMilestoneCelebration(milestone);

      expect(celebration).toContain('🎉');
      expect(celebration).toContain('MILESTONE ДОСТИГНУТ');
      expect(celebration).toContain('🌟');
      expect(celebration).toContain('Неделя стойкости');
      expect(celebration).toContain('Ты прошёл первую неделю');
    });

    it('should show habit formed message for 66+ days', () => {
      const milestone: IStreakMilestone = {
        days: 66,
        title: 'Мастер привычки',
        badge: '🏆',
        message: 'Привычка сформирована!',
        isHabitFormed: true,
      };

      const celebration = service.createMilestoneCelebration(milestone);

      expect(celebration).toContain('UCL Study');
      expect(celebration).toContain('66 дней');
      expect(celebration).toContain('часть тебя');
    });
  });

  // ==========================================================================
  // Recovery Message
  // ==========================================================================
  describe('Recovery Message', () => {
    it('should create recovery message after broken streak', () => {
      const message = service.createRecoveryMessage(10);

      expect(message).toContain('🌱');
      expect(message).toContain('Новое начало');
      expect(message).toContain('10');
      expect(message).toContain('НЕ разрушает привычку');
    });

    it('should not mention previous streak if short', () => {
      const message = service.createRecoveryMessage(3);

      expect(message).toContain('Новое начало');
      expect(message).not.toContain('Ты достигал 3');
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(progressVisualization).toBeInstanceOf(ProgressVisualizationService);
    });

    it('should create progress bar via singleton', () => {
      const bar = progressVisualization.createProgressBar(75);

      expect(bar).toContain('75%');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle very long streaks', () => {
      const line = service.createStreakLine(
        createStreakData({ currentStreak: 365, longestStreak: 500 })
      );

      expect(line).toContain('365');
      expect(line).toContain('🔥🔥🔥');
    });

    it('should handle all Russian plural forms', () => {
      // Edge cases for Russian pluralization
      const testCases = [
        { n: 1, expected: 'день' },
        { n: 2, expected: 'дня' },
        { n: 5, expected: 'дней' },
        { n: 11, expected: 'дней' },
        { n: 12, expected: 'дней' },
        { n: 21, expected: 'день' },
        { n: 22, expected: 'дня' },
        { n: 25, expected: 'дней' },
        { n: 100, expected: 'дней' },
        { n: 101, expected: 'день' },
        { n: 111, expected: 'дней' },
      ];

      for (const { n, expected } of testCases) {
        const line = service.createStreakLine(createStreakData({ currentStreak: n }));
        expect(line).toContain(expected);
      }
    });

    it('should handle therapy at last week', () => {
      const therapyProgress: ITherapyProgress = {
        currentWeek: 8,
        totalWeeks: 8,
        completedModules: [],
      };

      const display = service.createTherapyProgress(therapyProgress);

      expect(display).toContain('100%');
    });

    it('should handle empty activity history', () => {
      const streakData = createStreakData({ weeklyActivity: [] });
      const calendar = service.createWeeklyCalendar(streakData);

      expect(calendar).toBeDefined();
      expect(calendar.length).toBeGreaterThan(0);
    });

    it('should generate motivational footers for all streak ranges', () => {
      const ranges = [0, 3, 7, 10, 14, 20, 30, 50, 66, 100];

      for (const streak of ranges) {
        const summary = service.createFullProgressSummary(
          createStreakData({ currentStreak: streak })
        );
        expect(summary).toContain('💡');
      }
    });
  });
});
