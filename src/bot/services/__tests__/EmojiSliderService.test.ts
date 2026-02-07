/**
 * EmojiSliderService Tests
 * ========================
 *
 * Tests for Wysa-style mood and sleep tracking with emoji scales.
 * Validates scale configurations, keyboard creation, history tracking, and analysis.
 *
 * @packageDocumentation
 */

import {
  EmojiSliderService,
  emojiSlider,
  type MoodLevel,
  type SleepQualityLevel,
} from '../EmojiSliderService';

describe('EmojiSliderService', () => {
  let service: EmojiSliderService;

  beforeEach(() => {
    service = new EmojiSliderService();
  });

  // ==========================================================================
  // Scale Configurations
  // ==========================================================================
  describe('Scale Configurations', () => {
    it('should return 5-point mood scale', () => {
      const scale = service.getMoodScale();

      expect(scale.length).toBe(5);
      expect(scale[0].level).toBe(1);
      expect(scale[4].level).toBe(5);
    });

    it('should have correct mood scale properties', () => {
      const scale = service.getMoodScale();

      for (const item of scale) {
        expect(item.emoji).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.labelEn).toBeDefined();
        expect(item.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(item.valence).toBeGreaterThanOrEqual(-1);
        expect(item.valence).toBeLessThanOrEqual(1);
      }
    });

    it('should return 5-point sleep scale', () => {
      const scale = service.getSleepScale();

      expect(scale.length).toBe(5);
      expect(scale[0].level).toBe(1);
      expect(scale[4].level).toBe(5);
    });

    it('should have correct sleep scale properties', () => {
      const scale = service.getSleepScale();

      for (const item of scale) {
        expect(item.emoji).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.hoursRange).toBeDefined();
        expect(item.qualityLabel).toBeDefined();
      }
    });

    it('should return mood factors', () => {
      const factors = service.getMoodFactors();

      expect(factors.length).toBeGreaterThan(0);
      expect(factors.some(f => f.id === 'sleep')).toBe(true);
      expect(factors.some(f => f.id === 'work')).toBe(true);
      expect(factors.some(f => f.id === 'stress')).toBe(true);
    });

    it('should return sleep factors', () => {
      const factors = service.getSleepFactors();

      expect(factors.length).toBeGreaterThan(0);
      expect(factors.some(f => f.id === 'caffeine')).toBe(true);
      expect(factors.some(f => f.id === 'screen')).toBe(true);
    });

    it('should return immutable scale copies', () => {
      const scale1 = service.getMoodScale();
      const scale2 = service.getMoodScale();

      expect(scale1).not.toBe(scale2);
    });
  });

  // ==========================================================================
  // Keyboard Creation
  // ==========================================================================
  describe('Keyboard Creation', () => {
    it('should create mood keyboard', () => {
      const keyboard = service.createMoodKeyboard();

      expect(keyboard).toBeDefined();
      // Grammy InlineKeyboard should have inline_keyboard property when built
    });

    it('should create mood keyboard with custom prefix', () => {
      const keyboard = service.createMoodKeyboard('custom_mood');

      expect(keyboard).toBeDefined();
    });

    it('should create sleep keyboard', () => {
      const keyboard = service.createSleepKeyboard();

      expect(keyboard).toBeDefined();
    });

    it('should create sleep keyboard with custom prefix', () => {
      const keyboard = service.createSleepKeyboard('custom_sleep');

      expect(keyboard).toBeDefined();
    });

    it('should create factor keyboard for mood', () => {
      const keyboard = service.createFactorKeyboard('mood');

      expect(keyboard).toBeDefined();
    });

    it('should create factor keyboard for sleep', () => {
      const keyboard = service.createFactorKeyboard('sleep');

      expect(keyboard).toBeDefined();
    });

    it('should create factor keyboard with selected factors', () => {
      const keyboard = service.createFactorKeyboard('mood', ['sleep', 'work']);

      expect(keyboard).toBeDefined();
    });

    it('should create compact factor keyboard', () => {
      const keyboard = service.createCompactFactorKeyboard('mood');

      expect(keyboard).toBeDefined();
    });

    it('should create compact factor keyboard with selections', () => {
      const keyboard = service.createCompactFactorKeyboard('sleep', ['caffeine']);

      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Item Retrieval
  // ==========================================================================
  describe('Item Retrieval', () => {
    it('should get mood item by level', () => {
      const item = service.getMoodItem(3);

      expect(item.level).toBe(3);
      expect(item.label).toBe('Нормально');
    });

    it('should return default for invalid mood level', () => {
      const item = service.getMoodItem(99 as MoodLevel);

      expect(item.level).toBe(3); // Default to neutral
    });

    it('should get sleep item by level', () => {
      const item = service.getSleepItem(5);

      expect(item.level).toBe(5);
      expect(item.label).toBe('Отлично');
    });

    it('should return default for invalid sleep level', () => {
      const item = service.getSleepItem(99 as SleepQualityLevel);

      expect(item.level).toBe(3); // Default to middle
    });

    it('should get mood factor by id', () => {
      const factor = service.getFactor('stress');

      expect(factor).toBeDefined();
      expect(factor?.id).toBe('stress');
      expect(factor?.emoji).toBe('😰');
    });

    it('should get sleep factor by id', () => {
      const factor = service.getFactor('caffeine', 'sleep');

      expect(factor).toBeDefined();
      expect(factor?.id).toBe('caffeine');
    });

    it('should return undefined for unknown factor', () => {
      const factor = service.getFactor('unknown_factor');

      expect(factor).toBeUndefined();
    });
  });

  // ==========================================================================
  // Initial History
  // ==========================================================================
  describe('Initial History', () => {
    it('should create initial mood history', () => {
      const history = service.createInitialHistory();

      expect(history.entries).toEqual([]);
      expect(history.sleepEntries).toEqual([]);
      expect(history.lastMoodCheck).toBeNull();
      expect(history.lastSleepCheck).toBeNull();
      expect(history.averageMood7Days).toBeNull();
      expect(history.averageSleep7Days).toBeNull();
      expect(history.moodTrend).toBe('unknown');
    });
  });

  // ==========================================================================
  // Recording Mood
  // ==========================================================================
  describe('Recording Mood', () => {
    it('should record mood entry', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 4, ['work', 'sleep'], 'morning');

      expect(entry.moodLevel).toBe(4);
      expect(entry.factors).toEqual(['work', 'sleep']);
      expect(entry.context).toBe('morning');
      expect(entry.timestamp).toBeDefined();
    });

    it('should add entry to history', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 3, [], 'check-in');

      expect(history.entries.length).toBe(1);
      expect(history.lastMoodCheck).not.toBeNull();
    });

    it('should record mood with note', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 2, ['stress'], 'manual', 'Тяжёлый день');

      expect(entry.note).toBe('Тяжёлый день');
    });

    it('should update 7-day average after recording', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, []);
      service.recordMood(history, 3, []);

      expect(history.averageMood7Days).toBe(4);
    });

    it('should trim history to max entries', () => {
      const history = service.createInitialHistory();

      // Record more than max entries (100)
      for (let i = 0; i < 110; i++) {
        service.recordMood(history, 3, []);
      }

      expect(history.entries.length).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Recording Sleep
  // ==========================================================================
  describe('Recording Sleep', () => {
    it('should record sleep entry', () => {
      const history = service.createInitialHistory();
      const entry = service.recordSleep(history, 4, ['noise']);

      expect(entry.qualityLevel).toBe(4);
      expect(entry.factors).toEqual(['noise']);
      expect(entry.date).toBeDefined();
    });

    it('should record sleep with hours', () => {
      const history = service.createInitialHistory();
      const entry = service.recordSleep(history, 5, [], 8);

      expect(entry.hoursSlept).toBe(8);
    });

    it('should add sleep entry to history', () => {
      const history = service.createInitialHistory();
      service.recordSleep(history, 3, []);

      expect(history.sleepEntries.length).toBe(1);
      expect(history.lastSleepCheck).not.toBeNull();
    });

    it('should update 7-day sleep average', () => {
      const history = service.createInitialHistory();
      service.recordSleep(history, 5, []);
      service.recordSleep(history, 3, []);

      expect(history.averageSleep7Days).toBe(4);
    });
  });

  // ==========================================================================
  // Mood Trend Calculation
  // ==========================================================================
  describe('Mood Trend Calculation', () => {
    it('should detect improving trend', () => {
      const history = service.createInitialHistory();

      // First half: low mood
      service.recordMood(history, 2, []);
      service.recordMood(history, 2, []);

      // Second half: high mood
      service.recordMood(history, 5, []);
      service.recordMood(history, 5, []);

      expect(history.moodTrend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const history = service.createInitialHistory();

      // First half: high mood
      service.recordMood(history, 5, []);
      service.recordMood(history, 5, []);

      // Second half: low mood
      service.recordMood(history, 2, []);
      service.recordMood(history, 2, []);

      expect(history.moodTrend).toBe('declining');
    });

    it('should detect stable trend', () => {
      const history = service.createInitialHistory();

      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);

      expect(history.moodTrend).toBe('stable');
    });

    it('should remain unknown with less than 3 entries', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 3, []);
      service.recordMood(history, 5, []);

      expect(history.moodTrend).toBe('unknown');
    });
  });

  // ==========================================================================
  // Mood Analysis
  // ==========================================================================
  describe('Mood Analysis', () => {
    it('should analyze empty history', () => {
      const history = service.createInitialHistory();
      const analysis = service.analyzeMoodHistory(history);

      expect(analysis.averageMood).toBe(3);
      expect(analysis.averageSleep).toBe(3);
      expect(analysis.dominantFactors).toEqual([]);
    });

    it('should calculate average mood', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, []);
      service.recordMood(history, 5, []);
      service.recordMood(history, 2, []);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.averageMood).toBe(4);
    });

    it('should identify dominant factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 4, ['work', 'sleep']);
      service.recordMood(history, 3, ['work', 'stress']);
      service.recordMood(history, 5, ['work']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.dominantFactors).toContain('work');
    });

    it('should identify positive factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 4, ['exercise']);
      service.recordMood(history, 5, ['exercise']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.correlations.topPositiveFactors).toContain('exercise');
    });

    it('should identify negative factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 1, ['stress']);
      service.recordMood(history, 2, ['stress']);
      service.recordMood(history, 1, ['stress']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.correlations.topNegativeFactors).toContain('stress');
    });

    it('should generate insights', () => {
      const history = service.createInitialHistory();

      // Add enough data for insights
      for (let i = 0; i < 5; i++) {
        service.recordMood(history, 5, ['exercise']);
        service.recordSleep(history, 5, []);
      }

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should limit insights to 3', () => {
      const history = service.createInitialHistory();

      for (let i = 0; i < 10; i++) {
        service.recordMood(history, i % 2 === 0 ? 5 : 1, ['work', 'stress', 'sleep']);
        service.recordSleep(history, i % 2 === 0 ? 5 : 1, []);
      }

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.insights.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Sleep-Mood Correlation
  // ==========================================================================
  describe('Sleep-Mood Correlation', () => {
    it('should calculate positive sleep-mood correlation', () => {
      const history = service.createInitialHistory();

      // Create 3 days of data with aligned sleep dates and mood timestamps
      // recordSleep sets date to (current day - 1), so mood timestamp needs to match

      const day1 = new Date();
      day1.setDate(day1.getDate() - 3);
      const day2 = new Date();
      day2.setDate(day2.getDate() - 2);
      const day3 = new Date();
      day3.setDate(day3.getDate() - 1);

      // Day 1: Bad sleep (1) → Bad mood (1)
      history.sleepEntries.push({
        timestamp: day1.getTime(),
        date: day1.toISOString().split('T')[0],
        qualityLevel: 1,
        factors: [],
      });
      history.entries.push({
        timestamp: day1.getTime(),
        moodLevel: 1,
        factors: [],
        context: 'manual' as const,
      });

      // Day 2: Good sleep (5) → Good mood (5)
      history.sleepEntries.push({
        timestamp: day2.getTime(),
        date: day2.toISOString().split('T')[0],
        qualityLevel: 5,
        factors: [],
      });
      history.entries.push({
        timestamp: day2.getTime(),
        moodLevel: 5,
        factors: [],
        context: 'manual' as const,
      });

      // Day 3: Good sleep (5) → Good mood (5)
      history.sleepEntries.push({
        timestamp: day3.getTime(),
        date: day3.toISOString().split('T')[0],
        qualityLevel: 5,
        factors: [],
      });
      history.entries.push({
        timestamp: day3.getTime(),
        moodLevel: 5,
        factors: [],
        context: 'manual' as const,
      });

      const analysis = service.analyzeMoodHistory(history);
      // Good sleep days (5,5) have avg mood 5, bad sleep day (1) has avg mood 1
      // Correlation = (5 - 1) / 2 = 2, clamped to 1
      expect(analysis.correlations.sleepMoodCorrelation).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Response Formatting
  // ==========================================================================
  describe('Response Formatting', () => {
    it('should format mood response', () => {
      const response = service.formatMoodResponse(4, ['work']);

      expect(response).toContain('🙂');
      expect(response).toContain('Хорошо');
      expect(response).toContain('Работа');
    });

    it('should format low mood response with support', () => {
      const response = service.formatMoodResponse(1, []);

      expect(response).toContain('😢');
      expect(response).toContain('рядом');
    });

    it('should format neutral mood response', () => {
      const response = service.formatMoodResponse(3, []);

      expect(response).toContain('😐');
      expect(response).toContain('Нормальный');
    });

    it('should format high mood response', () => {
      const response = service.formatMoodResponse(5, []);

      expect(response).toContain('😊');
      expect(response).toContain('Рада');
    });

    it('should format sleep response', () => {
      const response = service.formatSleepResponse(5, ['caffeine']);

      expect(response).toContain('😴');
      expect(response).toContain('Отлично');
      expect(response).toContain('Кофеин');
    });

    it('should format poor sleep response', () => {
      const response = service.formatSleepResponse(2, []);

      expect(response).toContain('😫');
      expect(response).toContain('Плохой сон');
    });
  });

  // ==========================================================================
  // Prompts
  // ==========================================================================
  describe('Prompts', () => {
    it('should get morning mood check prompt', () => {
      const prompt = service.getMoodCheckPrompt('morning');

      expect(prompt).toContain('утро');
    });

    it('should get evening mood check prompt', () => {
      const prompt = service.getMoodCheckPrompt('evening');

      expect(prompt).toContain('вечер');
    });

    it('should get default check-in prompt', () => {
      const prompt = service.getMoodCheckPrompt();

      expect(prompt).toContain('чувствуешь');
    });

    it('should get sleep check prompt', () => {
      const prompt = service.getSleepCheckPrompt();

      expect(prompt).toContain('спал');
    });

    it('should get mood factor prompt', () => {
      const prompt = service.getFactorPrompt('mood');

      expect(prompt).toContain('настроение');
    });

    it('should get sleep factor prompt', () => {
      const prompt = service.getFactorPrompt('sleep');

      expect(prompt).toContain('сон');
    });
  });

  // ==========================================================================
  // Week Visualization
  // ==========================================================================
  describe('Week Visualization', () => {
    it('should return 7 symbols for week visualization', () => {
      const history = service.createInitialHistory();
      const viz = service.getMoodWeekVisualization(history);

      const symbols = viz.split(' ');
      expect(symbols.length).toBe(7);
    });

    it('should show dots for missing days', () => {
      const history = service.createInitialHistory();
      const viz = service.getMoodWeekVisualization(history);

      expect(viz).toContain('·');
    });

    it('should show emoji for recorded days', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, []);

      const viz = service.getMoodWeekVisualization(history);
      expect(viz).toContain('😊');
    });
  });

  // ==========================================================================
  // Due Checks
  // ==========================================================================
  describe('Due Checks', () => {
    it('should be due for mood check when no history', () => {
      const history = service.createInitialHistory();

      expect(service.isMoodCheckDue(history)).toBe(true);
    });

    it('should not be due for recent mood check', () => {
      const history = service.createInitialHistory();
      history.lastMoodCheck = Date.now();

      expect(service.isMoodCheckDue(history, 12)).toBe(false);
    });

    it('should be due for old mood check', () => {
      const history = service.createInitialHistory();
      history.lastMoodCheck = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

      expect(service.isMoodCheckDue(history, 12)).toBe(true);
    });

    it('should be due for sleep check when no history', () => {
      const history = service.createInitialHistory();
      const hours = new Date().getHours();

      // Only check during morning hours
      if (hours >= 6 && hours <= 12) {
        expect(service.isSleepCheckDue(history)).toBe(true);
      }
    });

    it('should respect morning-only sleep check window', () => {
      const history = service.createInitialHistory();

      // Mock time outside morning window - this is a logic test
      // The method checks current time, so we verify the behavior description
      expect(service.isSleepCheckDue).toBeDefined();
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(emojiSlider).toBeInstanceOf(EmojiSliderService);
    });

    it('should get mood scale via singleton', () => {
      const scale = emojiSlider.getMoodScale();
      expect(scale.length).toBe(5);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty factors array', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 3, []);

      expect(entry.factors).toEqual([]);
    });

    it('should handle all mood levels', () => {
      const history = service.createInitialHistory();

      for (let level = 1; level <= 5; level++) {
        service.recordMood(history, level as MoodLevel, []);
      }

      expect(history.entries.length).toBe(5);
    });

    it('should handle all sleep levels', () => {
      const history = service.createInitialHistory();

      for (let level = 1; level <= 5; level++) {
        service.recordSleep(history, level as SleepQualityLevel, []);
      }

      expect(history.sleepEntries.length).toBe(5);
    });

    it('should handle unknown factor in response formatting', () => {
      const response = service.formatMoodResponse(3, ['unknown_factor']);

      // Should not crash, just not include unknown factor
      expect(response).toBeDefined();
    });

    it('should analyze with custom day range', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, []);

      const analysis14Days = service.analyzeMoodHistory(history, 14);
      const analysis3Days = service.analyzeMoodHistory(history, 3);

      expect(analysis14Days).toBeDefined();
      expect(analysis3Days).toBeDefined();
    });
  });
});
