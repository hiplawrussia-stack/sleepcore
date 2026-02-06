/**
 * YearInPixelsService Tests
 * =========================
 *
 * Tests for Daylio-style mood visualization service.
 * Validates grid generation, statistics calculation, and streak tracking.
 *
 * @packageDocumentation
 */

import { YearInPixelsService, yearInPixels } from '../YearInPixelsService';
import type { IMoodHistory, MoodLevel } from '../EmojiSliderService';

describe('YearInPixelsService', () => {
  let service: YearInPixelsService;

  beforeEach(() => {
    service = new YearInPixelsService();
  });

  /**
   * Create test mood history
   */
  function createTestHistory(
    entries: Array<{ daysAgo: number; mood: MoodLevel }>
  ): IMoodHistory {
    const now = Date.now();
    return {
      entries: entries.map(e => ({
        timestamp: now - e.daysAgo * 24 * 60 * 60 * 1000,
        moodLevel: e.mood,
        factors: [],
        context: 'manual' as const,
      })),
      sleepEntries: [],
      lastMoodCheck: now,
      lastSleepCheck: null,
      averageMood7Days: null,
      averageSleep7Days: null,
      moodTrend: 'unknown',
    };
  }

  // ==========================================================================
  // Pixel Style
  // ==========================================================================
  describe('Pixel Style', () => {
    it('should default to circles style', () => {
      const emoji = service.getMoodEmoji(5);
      expect(emoji).toBe('🟢');
    });

    it('should switch to squares style', () => {
      service.setPixelStyle('squares');
      const emoji = service.getMoodEmoji(5);
      expect(emoji).toBe('🟩');
    });

    it('should return empty circle for null mood', () => {
      const emoji = service.getMoodEmoji(null);
      expect(emoji).toBe('⚪');
    });

    it('should handle all mood levels', () => {
      expect(service.getMoodEmoji(1)).toBe('🔴');
      expect(service.getMoodEmoji(2)).toBe('🟠');
      expect(service.getMoodEmoji(3)).toBe('🟡');
      expect(service.getMoodEmoji(4)).toBe('🔵');
      expect(service.getMoodEmoji(5)).toBe('🟢');
    });
  });

  // ==========================================================================
  // Mood Map Building
  // ==========================================================================
  describe('Mood Map Building', () => {
    it('should build mood map from history', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 4 },
      ]);

      const moodMap = service.buildMoodMap(history);
      expect(moodMap.size).toBe(2);
    });

    it('should handle empty history', () => {
      const history = createTestHistory([]);
      const moodMap = service.buildMoodMap(history);
      expect(moodMap.size).toBe(0);
    });

    it('should take latest entry for duplicate dates', () => {
      const now = Date.now();
      const history: IMoodHistory = {
        entries: [
          { timestamp: now - 1000, moodLevel: 3, factors: [], context: 'manual' },
          { timestamp: now, moodLevel: 5, factors: [], context: 'manual' },
        ],
        sleepEntries: [],
        lastMoodCheck: now,
        lastSleepCheck: null,
        averageMood7Days: null,
        averageSleep7Days: null,
        moodTrend: 'unknown',
      };

      const moodMap = service.buildMoodMap(history);
      const todayKey = new Date().toISOString().split('T')[0];
      expect(moodMap.get(todayKey)).toBe(5);
    });
  });

  // ==========================================================================
  // Month View Generation
  // ==========================================================================
  describe('Month View Generation', () => {
    it('should generate month view', () => {
      const history = createTestHistory([{ daysAgo: 0, mood: 4 }]);
      const result = service.generateMonthView(history, 2025, 0);

      expect(result.message).toContain('Январь 2025');
      expect(result.keyboard).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('should include weekday headers', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2025, 0);

      expect(result.message).toContain('Пн');
      expect(result.message).toContain('Вс');
    });

    it('should calculate month statistics', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 3 },
      ]);
      const now = new Date();
      const result = service.generateMonthView(
        history,
        now.getFullYear(),
        now.getMonth()
      );

      expect(result.stats.trackedDays).toBeGreaterThan(0);
      expect(result.stats.averageMood).not.toBeNull();
    });

    it('should find dominant mood', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 5 },
        { daysAgo: 2, mood: 3 },
      ]);
      const now = new Date();
      const result = service.generateMonthView(
        history,
        now.getFullYear(),
        now.getMonth()
      );

      expect(result.stats.dominantMood).toBe(5);
    });

    it('should include legend', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2025, 0);

      expect(result.message).toContain('Легенда');
    });

    it('should build navigation keyboard', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2025, 5);

      expect(result.keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Year Grid Generation
  // ==========================================================================
  describe('Year Grid Generation', () => {
    it('should generate year grid', () => {
      const history = createTestHistory([{ daysAgo: 0, mood: 4 }]);
      const result = service.generateYearGrid(history, 2025);

      expect(result.message).toContain('Год в пикселях 2025');
      expect(result.keyboard).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('should have 31 rows for days', () => {
      const history = createTestHistory([]);
      const result = service.generateYearGrid(history, 2025);

      // Count line numbers in the grid (1-31) - format is `<day> `
      const lines = result.message.split('\n');
      const dayLines = lines.filter(line => /^`\s*\d{1,2}\s/.test(line));
      expect(dayLines.length).toBe(31);
    });

    it('should calculate year statistics', () => {
      // Use entries within current year only
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
      // Only use daysAgo values that stay within current year
      const entries = [
        { daysAgo: 0, mood: 5 as const },
        { daysAgo: Math.min(1, dayOfYear - 1), mood: 3 as const },
        { daysAgo: Math.min(2, dayOfYear - 1), mood: 4 as const },
      ].filter(e => e.daysAgo >= 0 && e.daysAgo < dayOfYear);

      const history = createTestHistory(entries);
      const result = service.generateYearGrid(history, now.getFullYear());

      expect(result.stats.trackedDays).toBeGreaterThan(0);
      expect(result.stats.trackingRate).toBeGreaterThan(0);
    });

    it('should track best and worst months', () => {
      // Create entries spanning multiple months
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 5 },
        { daysAgo: 40, mood: 1 },
        { daysAgo: 41, mood: 1 },
      ]);
      const result = service.generateYearGrid(history, new Date().getFullYear());

      // Stats should identify best/worst months if data spans multiple months
      expect(result.stats).toBeDefined();
    });
  });

  // ==========================================================================
  // Quarter View Generation
  // ==========================================================================
  describe('Quarter View Generation', () => {
    it('should generate Q1 view', () => {
      const history = createTestHistory([]);
      const result = service.generateQuarterView(history, 2025, 0);

      expect(result.message).toContain('Q1');
      expect(result.message).toContain('Янв-Мар');
    });

    it('should generate Q4 view', () => {
      const history = createTestHistory([]);
      const result = service.generateQuarterView(history, 2025, 3);

      expect(result.message).toContain('Q4');
      expect(result.message).toContain('Окт-Дек');
    });

    it('should show 3 months', () => {
      const history = createTestHistory([]);
      const result = service.generateQuarterView(history, 2025, 1);

      expect(result.message).toContain('Апр');
      expect(result.message).toContain('Май');
      expect(result.message).toContain('Июн');
    });

    it('should include navigation keyboard', () => {
      const history = createTestHistory([]);
      const result = service.generateQuarterView(history, 2025, 1);

      expect(result.keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Statistics Summary
  // ==========================================================================
  describe('Statistics Summary', () => {
    it('should generate stats summary', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 4 },
        { daysAgo: 2, mood: 3 },
      ]);

      const summary = service.generateStatsSummary(history);

      expect(summary).toContain('Статистика настроения');
      expect(summary).toContain('30 дней');
    });

    it('should show distribution', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 5 },
        { daysAgo: 2, mood: 3 },
      ]);

      const summary = service.generateStatsSummary(history);

      expect(summary).toContain('Распределение');
    });

    it('should show streak info', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 5 },
        { daysAgo: 1, mood: 4 },
        { daysAgo: 2, mood: 3 },
      ]);

      const summary = service.generateStatsSummary(history);

      expect(summary).toContain('Серии');
      expect(summary).toContain('Текущая');
    });

    it('should handle empty history', () => {
      const history = createTestHistory([]);
      const summary = service.generateStatsSummary(history);

      expect(summary).toContain('Нет данных');
    });
  });

  // ==========================================================================
  // Legend Generation
  // ==========================================================================
  describe('Legend Generation', () => {
    it('should generate legend', () => {
      const legend = service.generateLegend();

      expect(legend).toContain('Легенда');
      expect(legend).toContain('Отлично');
      expect(legend).toContain('Ужасно');
      expect(legend).toContain('Нет данных');
    });

    it('should use current pixel style', () => {
      service.setPixelStyle('squares');
      const legend = service.generateLegend();

      expect(legend).toContain('🟩');
    });
  });

  // ==========================================================================
  // Current Views
  // ==========================================================================
  describe('Current Views', () => {
    it('should generate current month view', () => {
      const history = createTestHistory([{ daysAgo: 0, mood: 4 }]);
      const result = service.generateCurrentMonthView(history);

      expect(result.message).toBeDefined();
      expect(result.keyboard).toBeDefined();
    });

    it('should generate current year view', () => {
      const history = createTestHistory([{ daysAgo: 0, mood: 4 }]);
      const result = service.generateCurrentYearView(history);

      expect(result.message).toBeDefined();
      expect(result.keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(yearInPixels).toBeInstanceOf(YearInPixelsService);
    });

    it('should generate views via singleton', () => {
      const history = createTestHistory([]);
      const result = yearInPixels.generateCurrentMonthView(history);
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle February correctly', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2025, 1);

      expect(result.stats.totalDays).toBe(28); // 2025 is not a leap year
    });

    it('should handle leap year February', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2024, 1);

      expect(result.stats.totalDays).toBe(29); // 2024 is a leap year
    });

    it('should handle year boundary', () => {
      const history = createTestHistory([]);
      const result = service.generateMonthView(history, 2025, 11);

      expect(result.message).toContain('Декабрь');
    });

    it('should handle very old history', () => {
      const history: IMoodHistory = {
        entries: [{
          timestamp: new Date('2020-01-01').getTime(),
          moodLevel: 5,
          factors: [],
          context: 'manual',
        }],
        sleepEntries: [],
        lastMoodCheck: null,
        lastSleepCheck: null,
        averageMood7Days: null,
        averageSleep7Days: null,
        moodTrend: 'unknown',
      };

      const result = service.generateYearGrid(history, 2020);
      expect(result.stats.trackedDays).toBe(1);
    });

    it('should handle all mood levels in distribution', () => {
      const history = createTestHistory([
        { daysAgo: 0, mood: 1 },
        { daysAgo: 1, mood: 2 },
        { daysAgo: 2, mood: 3 },
        { daysAgo: 3, mood: 4 },
        { daysAgo: 4, mood: 5 },
      ]);
      const now = new Date();
      const result = service.generateMonthView(
        history,
        now.getFullYear(),
        now.getMonth()
      );

      expect(result.stats.moodDistribution[1]).toBeGreaterThan(0);
      expect(result.stats.moodDistribution[5]).toBeGreaterThan(0);
    });
  });
});
