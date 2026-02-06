/**
 * ProgressVisualizationService Unit Tests
 * ========================================
 * Tests for text-based progress visualization.
 *
 * @module @sleepcore/bot/services
 */

import {
  ProgressVisualizationService,
  progressVisualization,
  type ITherapyProgress,
} from '../../../../src/bot/services/ProgressVisualizationService';
import type { IStreakData, IStreakMilestone } from '../../../../src/bot/services/StreakService';

describe('ProgressVisualizationService', () => {
  let service: ProgressVisualizationService;

  beforeEach(() => {
    service = new ProgressVisualizationService();
  });

  // Helper to create mock streak data
  function createStreakData(overrides: Partial<IStreakData> = {}): IStreakData {
    return {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: new Date().toISOString().split('T')[0],
      freezesAvailable: 1,
      freezesUsedThisWeek: 0,
      lastFreezeGrantDate: null,
      totalActiveDays: 15,
      weeklyActivity: [],
      milestoneReached: [7],
      ...overrides,
    };
  }

  describe('createProgressBar', () => {
    it('should create progress bar for 0%', () => {
      const bar = service.createProgressBar(0);
      expect(bar).toContain('░░░░░░░░░░');
      expect(bar).toContain('0%');
    });

    it('should create progress bar for 100%', () => {
      const bar = service.createProgressBar(100);
      expect(bar).toContain('██████████');
      expect(bar).toContain('100%');
    });

    it('should create progress bar for 50%', () => {
      const bar = service.createProgressBar(50);
      expect(bar).toContain('█████░░░░░');
      expect(bar).toContain('50%');
    });

    it('should clamp values above 100', () => {
      const bar = service.createProgressBar(150);
      expect(bar).toContain('100%');
    });

    it('should clamp values below 0', () => {
      const bar = service.createProgressBar(-20);
      expect(bar).toContain('0%');
    });

    it('should use blocks style by default', () => {
      const bar = service.createProgressBar(50);
      expect(bar).toContain('█');
      expect(bar).toContain('░');
    });

    it('should use circles style when specified', () => {
      const bar = service.createProgressBar(50, { style: 'circles' });
      expect(bar).toContain('●');
      expect(bar).toContain('○');
    });

    it('should use squares style when specified', () => {
      const bar = service.createProgressBar(50, { style: 'squares' });
      expect(bar).toContain('■');
      expect(bar).toContain('□');
    });

    it('should use minimal style when specified', () => {
      const bar = service.createProgressBar(50, { style: 'minimal' });
      expect(bar).toContain('▓');
    });

    it('should respect custom width', () => {
      const bar = service.createProgressBar(50, { width: 4 });
      expect(bar).toMatch(/^.{4}\s/);
    });

    it('should hide percentage when showPercentage is false', () => {
      const bar = service.createProgressBar(50, { showPercentage: false });
      expect(bar).not.toContain('%');
    });
  });

  describe('createStreakLine', () => {
    it('should show start message for streak 0', () => {
      const data = createStreakData({ currentStreak: 0 });
      const line = service.createStreakLine(data);
      expect(line).toContain('начни сегодня');
    });

    it('should show single flame for streak 1-6', () => {
      const data = createStreakData({ currentStreak: 5 });
      const line = service.createStreakLine(data);
      expect(line).toContain('🔥');
      expect(line).toContain('*5*');
    });

    it('should show single flame for streak 7-13', () => {
      const data = createStreakData({ currentStreak: 10 });
      const line = service.createStreakLine(data);
      expect(line).toContain('🔥');
    });

    it('should show double flame for streak 14-29', () => {
      const data = createStreakData({ currentStreak: 20 });
      const line = service.createStreakLine(data);
      expect(line).toContain('🔥🔥');
    });

    it('should show triple flame for streak 30+', () => {
      const data = createStreakData({ currentStreak: 45 });
      const line = service.createStreakLine(data);
      expect(line).toContain('🔥🔥🔥');
    });

    it('should show personal best when longer than current and > 7', () => {
      const data = createStreakData({ currentStreak: 5, longestStreak: 15 });
      const line = service.createStreakLine(data);
      expect(line).toContain('рекорд: 15');
    });

    it('should not show personal best when equal to current', () => {
      const data = createStreakData({ currentStreak: 10, longestStreak: 10 });
      const line = service.createStreakLine(data);
      expect(line).not.toContain('рекорд');
    });

    it('should not show personal best when <= 7', () => {
      const data = createStreakData({ currentStreak: 3, longestStreak: 7 });
      const line = service.createStreakLine(data);
      expect(line).not.toContain('рекорд');
    });

    it('should pluralize 1 day correctly', () => {
      const data = createStreakData({ currentStreak: 1 });
      const line = service.createStreakLine(data);
      expect(line).toContain('день');
    });

    it('should pluralize 2-4 days correctly', () => {
      const data = createStreakData({ currentStreak: 3 });
      const line = service.createStreakLine(data);
      expect(line).toContain('дня');
    });

    it('should pluralize 5+ days correctly', () => {
      const data = createStreakData({ currentStreak: 7 });
      const line = service.createStreakLine(data);
      expect(line).toContain('дней');
    });

    it('should pluralize 11-19 correctly (special case)', () => {
      const data = createStreakData({ currentStreak: 14 });
      const line = service.createStreakLine(data);
      expect(line).toContain('дней');
    });

    it('should pluralize 21 correctly', () => {
      const data = createStreakData({ currentStreak: 21 });
      const line = service.createStreakLine(data);
      expect(line).toContain('день');
    });

    it('should pluralize 22 correctly', () => {
      const data = createStreakData({ currentStreak: 22 });
      const line = service.createStreakLine(data);
      expect(line).toContain('дня');
    });
  });

  describe('createWeeklyCalendar', () => {
    it('should create weekly calendar', () => {
      const data = createStreakData();
      const calendar = service.createWeeklyCalendar(data);
      expect(calendar).toContain('📅');
      expect(calendar).toContain('Последние 7 дней');
    });
  });

  describe('createWeeklyDots', () => {
    it('should create weekly dots view', () => {
      const data = createStreakData();
      const dots = service.createWeeklyDots(data);
      expect(dots).toContain('📓');
      expect(dots).toContain('Неделя:');
    });
  });

  describe('createTherapyProgress', () => {
    it('should show therapy progress', () => {
      const therapy: ITherapyProgress = {
        currentWeek: 3,
        totalWeeks: 6,
        completedModules: ['module1', 'module2'],
      };

      const result = service.createTherapyProgress(therapy);
      expect(result).toContain('Неделя 3 из 6');
      expect(result).toContain('📚');
    });
  });

  describe('createNextMilestonePreview', () => {
    it('should show next milestone for streak 5', () => {
      const data = createStreakData({ currentStreak: 5 });
      const preview = service.createNextMilestonePreview(data);
      expect(preview).toContain('/');
    });

    it('should show all milestones reached for very high streak', () => {
      const data = createStreakData({ currentStreak: 1000 });
      const preview = service.createNextMilestonePreview(data);
      expect(preview).toContain('🏆');
    });
  });

  describe('createFreezeStatus', () => {
    it('should show no freezes available', () => {
      const data = createStreakData({ freezesAvailable: 0 });
      const status = service.createFreezeStatus(data);
      expect(status).toContain('нет');
      expect(status).toContain('понедельник');
    });

    it('should show 1 freeze available', () => {
      const data = createStreakData({ freezesAvailable: 1 });
      const status = service.createFreezeStatus(data);
      expect(status).toContain('❄️');
      expect(status).toContain('1 шт');
    });

    it('should show 2 freezes available', () => {
      const data = createStreakData({ freezesAvailable: 2 });
      const status = service.createFreezeStatus(data);
      expect(status).toContain('❄️❄️');
      expect(status).toContain('2 шт');
    });
  });

  describe('createFullProgressSummary', () => {
    it('should create full summary with user name', () => {
      const data = createStreakData();
      const summary = service.createFullProgressSummary(data, undefined, 'Анна');
      expect(summary).toContain('Прогресс: Анна');
    });

    it('should create full summary without user name', () => {
      const data = createStreakData();
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('Твой прогресс');
    });

    it('should include therapy progress when provided', () => {
      const data = createStreakData();
      const therapy: ITherapyProgress = {
        currentWeek: 2,
        totalWeeks: 6,
        completedModules: [],
      };

      const summary = service.createFullProgressSummary(data, therapy);
      expect(summary).toContain('Неделя 2 из 6');
    });

    it('should include motivational footer for streak 0', () => {
      const data = createStreakData({ currentStreak: 0 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('Начни сегодня');
    });

    it('should include motivational footer for streak < 7', () => {
      const data = createStreakData({ currentStreak: 5 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('milestone');
    });

    it('should include motivational footer for streak 7-13', () => {
      const data = createStreakData({ currentStreak: 10 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('Отличный ритм');
    });

    it('should include motivational footer for streak 14-29', () => {
      const data = createStreakData({ currentStreak: 20 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('верном пути');
    });

    it('should include motivational footer for streak 30-65', () => {
      const data = createStreakData({ currentStreak: 50 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('стабильность');
    });

    it('should include motivational footer for streak 66+', () => {
      const data = createStreakData({ currentStreak: 70 });
      const summary = service.createFullProgressSummary(data);
      expect(summary).toContain('Мастер сна');
    });
  });

  describe('createCompactProgress', () => {
    it('should create compact progress', () => {
      const data = createStreakData();
      const compact = service.createCompactProgress(data);
      expect(compact).toContain('🔥');
      expect(compact).toContain('📓');
    });
  });

  describe('createGreetingWithProgress', () => {
    it('should create morning greeting', () => {
      const data = createStreakData();
      const greeting = service.createGreetingWithProgress('Иван', data, 'morning');
      expect(greeting).toContain('🌅');
      expect(greeting).toContain('Доброе утро');
      expect(greeting).toContain('Иван');
    });

    it('should create day greeting', () => {
      const data = createStreakData();
      const greeting = service.createGreetingWithProgress('Мария', data, 'day');
      expect(greeting).toContain('☀️');
      expect(greeting).toContain('Добрый день');
    });

    it('should create evening greeting', () => {
      const data = createStreakData();
      const greeting = service.createGreetingWithProgress('Петр', data, 'evening');
      expect(greeting).toContain('🌆');
      expect(greeting).toContain('Добрый вечер');
    });

    it('should create night greeting', () => {
      const data = createStreakData();
      const greeting = service.createGreetingWithProgress('Ольга', data, 'night');
      expect(greeting).toContain('🌙');
      expect(greeting).toContain('Доброй ночи');
    });
  });

  describe('createMilestoneCelebration', () => {
    it('should create celebration message', () => {
      const milestone: IStreakMilestone = {
        days: 7,
        badge: '🏅',
        title: 'Первая неделя',
        message: 'Отличное начало!',
        isHabitFormed: false,
      };

      const celebration = service.createMilestoneCelebration(milestone);
      expect(celebration).toContain('MILESTONE ДОСТИГНУТ');
      expect(celebration).toContain('🏅');
      expect(celebration).toContain('Первая неделя');
      expect(celebration).toContain('Отличное начало');
    });

    it('should include habit formed message for 66+ days', () => {
      const milestone: IStreakMilestone = {
        days: 66,
        badge: '🏆',
        title: 'Мастер привычки',
        message: 'Привычка сформирована!',
        isHabitFormed: true,
      };

      const celebration = service.createMilestoneCelebration(milestone);
      expect(celebration).toContain('UCL Study');
      expect(celebration).toContain('66 дней');
      expect(celebration).toContain('автоматизма');
    });

    it('should not include habit formed message when false', () => {
      const milestone: IStreakMilestone = {
        days: 30,
        badge: '🌟',
        title: 'Месяц',
        message: 'Месяц пройден!',
        isHabitFormed: false,
      };

      const celebration = service.createMilestoneCelebration(milestone);
      expect(celebration).not.toContain('UCL Study');
    });
  });

  describe('createRecoveryMessage', () => {
    it('should create recovery message for short previous streak', () => {
      const recovery = service.createRecoveryMessage(5);
      expect(recovery).toContain('Новое начало');
      expect(recovery).toContain('Пропуски — часть пути');
      expect(recovery).not.toContain('Ты достигал');
    });

    it('should mention previous streak when > 7', () => {
      const recovery = service.createRecoveryMessage(15);
      expect(recovery).toContain('Ты достигал 15');
      expect(recovery).toContain('дней');
    });

    it('should mention previous streak when exactly 8', () => {
      const recovery = service.createRecoveryMessage(8);
      expect(recovery).toContain('Ты достигал 8');
    });
  });
});

describe('progressVisualization singleton', () => {
  it('should export singleton instance', () => {
    expect(progressVisualization).toBeInstanceOf(ProgressVisualizationService);
  });

  it('should be able to create progress bars', () => {
    const bar = progressVisualization.createProgressBar(75);
    expect(bar).toContain('75%');
  });
});

describe('pluralizeDays edge cases', () => {
  let service: ProgressVisualizationService;

  beforeEach(() => {
    service = new ProgressVisualizationService();
  });

  it('should pluralize 11 correctly (дней)', () => {
    const data = createStreakData({ currentStreak: 11 });
    const line = service.createStreakLine(data);
    expect(line).toContain('дней');
  });

  it('should pluralize 12 correctly (дней)', () => {
    const data = createStreakData({ currentStreak: 12 });
    const line = service.createStreakLine(data);
    expect(line).toContain('дней');
  });

  it('should pluralize 101 correctly (день)', () => {
    const data = createStreakData({ currentStreak: 101 });
    const line = service.createStreakLine(data);
    expect(line).toContain('день');
  });

  it('should pluralize 102 correctly (дня)', () => {
    const data = createStreakData({ currentStreak: 102 });
    const line = service.createStreakLine(data);
    expect(line).toContain('дня');
  });

  it('should pluralize 111 correctly (дней)', () => {
    const data = createStreakData({ currentStreak: 111 });
    const line = service.createStreakLine(data);
    expect(line).toContain('дней');
  });

  it('should pluralize 25 correctly (дней)', () => {
    const data = createStreakData({ currentStreak: 25 });
    const line = service.createStreakLine(data);
    expect(line).toContain('дней');
  });

  function createStreakData(overrides: Partial<IStreakData> = {}): IStreakData {
    return {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: new Date().toISOString().split('T')[0],
      freezesAvailable: 1,
      freezesUsedThisWeek: 0,
      lastFreezeGrantDate: null,
      totalActiveDays: 15,
      weeklyActivity: [],
      milestoneReached: [7],
      ...overrides,
    };
  }
});
