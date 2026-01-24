/**
 * EmojiSliderService Unit Tests
 * ==============================
 * Tests for emoji-based mood and sleep tracking.
 *
 * @module @sleepcore/bot/services
 */

import {
  EmojiSliderService,
  emojiSlider,
  type IMoodHistory,
  type MoodLevel,
  type SleepQualityLevel,
} from '../../../../src/bot/services/EmojiSliderService';

describe('EmojiSliderService', () => {
  let service: EmojiSliderService;

  beforeEach(() => {
    service = new EmojiSliderService();
  });

  describe('getMoodScale', () => {
    it('should return 5 mood levels', () => {
      const scale = service.getMoodScale();
      expect(scale).toHaveLength(5);
    });

    it('should have levels 1-5', () => {
      const scale = service.getMoodScale();
      expect(scale.map(s => s.level)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have emoji for each level', () => {
      const scale = service.getMoodScale();
      scale.forEach(item => {
        expect(item.emoji).toBeDefined();
        expect(item.emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSleepScale', () => {
    it('should return 5 sleep quality levels', () => {
      const scale = service.getSleepScale();
      expect(scale).toHaveLength(5);
    });

    it('should have levels 1-5', () => {
      const scale = service.getSleepScale();
      expect(scale.map(s => s.level)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getMoodFactors', () => {
    it('should return mood factors', () => {
      const factors = service.getMoodFactors();
      expect(factors.length).toBeGreaterThan(0);
    });

    it('should have sleep factor', () => {
      const factors = service.getMoodFactors();
      const sleepFactor = factors.find(f => f.id === 'sleep');
      expect(sleepFactor).toBeDefined();
    });
  });

  describe('getSleepFactors', () => {
    it('should return sleep factors', () => {
      const factors = service.getSleepFactors();
      expect(factors.length).toBeGreaterThan(0);
    });

    it('should have caffeine factor', () => {
      const factors = service.getSleepFactors();
      const caffeineFactor = factors.find(f => f.id === 'caffeine');
      expect(caffeineFactor).toBeDefined();
    });
  });

  describe('createMoodKeyboard', () => {
    it('should create keyboard with default prefix', () => {
      const keyboard = service.createMoodKeyboard();
      expect(keyboard).toBeDefined();
    });

    it('should create keyboard with custom prefix', () => {
      const keyboard = service.createMoodKeyboard('custom_mood');
      expect(keyboard).toBeDefined();
    });
  });

  describe('createSleepKeyboard', () => {
    it('should create keyboard with default prefix', () => {
      const keyboard = service.createSleepKeyboard();
      expect(keyboard).toBeDefined();
    });

    it('should create keyboard with custom prefix', () => {
      const keyboard = service.createSleepKeyboard('custom_sleep');
      expect(keyboard).toBeDefined();
    });
  });

  describe('createFactorKeyboard', () => {
    it('should create mood factor keyboard', () => {
      const keyboard = service.createFactorKeyboard('mood');
      expect(keyboard).toBeDefined();
    });

    it('should create sleep factor keyboard', () => {
      const keyboard = service.createFactorKeyboard('sleep');
      expect(keyboard).toBeDefined();
    });

    it('should mark selected factors', () => {
      const keyboard = service.createFactorKeyboard('mood', ['sleep', 'work']);
      expect(keyboard).toBeDefined();
    });

    it('should use custom prefix', () => {
      const keyboard = service.createFactorKeyboard('mood', [], 'custom_factor');
      expect(keyboard).toBeDefined();
    });
  });

  describe('createCompactFactorKeyboard', () => {
    it('should create compact mood factor keyboard', () => {
      const keyboard = service.createCompactFactorKeyboard('mood');
      expect(keyboard).toBeDefined();
    });

    it('should create compact sleep factor keyboard', () => {
      const keyboard = service.createCompactFactorKeyboard('sleep');
      expect(keyboard).toBeDefined();
    });

    it('should mark selected factors in compact keyboard', () => {
      const keyboard = service.createCompactFactorKeyboard('mood', ['sleep']);
      expect(keyboard).toBeDefined();
    });
  });

  describe('getMoodItem', () => {
    it('should return item for level 1', () => {
      const item = service.getMoodItem(1);
      expect(item.level).toBe(1);
      expect(item.label).toBe('Ужасно');
    });

    it('should return item for level 5', () => {
      const item = service.getMoodItem(5);
      expect(item.level).toBe(5);
      expect(item.label).toBe('Отлично');
    });

    it('should return fallback for unknown level', () => {
      const item = service.getMoodItem(99 as MoodLevel);
      expect(item).toBeDefined();
      expect(item.level).toBe(3); // Fallback to neutral
    });
  });

  describe('getSleepItem', () => {
    it('should return item for level 1', () => {
      const item = service.getSleepItem(1);
      expect(item.level).toBe(1);
      expect(item.label).toBe('Не спал(а)');
    });

    it('should return item for level 5', () => {
      const item = service.getSleepItem(5);
      expect(item.level).toBe(5);
      expect(item.label).toBe('Отлично');
    });

    it('should return fallback for unknown level', () => {
      const item = service.getSleepItem(99 as SleepQualityLevel);
      expect(item).toBeDefined();
      expect(item.level).toBe(3); // Fallback
    });
  });

  describe('getFactor', () => {
    it('should return mood factor by id', () => {
      const factor = service.getFactor('sleep', 'mood');
      expect(factor).toBeDefined();
      expect(factor?.id).toBe('sleep');
    });

    it('should return sleep factor by id', () => {
      const factor = service.getFactor('caffeine', 'sleep');
      expect(factor).toBeDefined();
      expect(factor?.id).toBe('caffeine');
    });

    it('should default to mood factors', () => {
      const factor = service.getFactor('work');
      expect(factor).toBeDefined();
      expect(factor?.id).toBe('work');
    });

    it('should return undefined for unknown factor', () => {
      const factor = service.getFactor('unknown_factor');
      expect(factor).toBeUndefined();
    });
  });

  describe('createInitialHistory', () => {
    it('should create empty history', () => {
      const history = service.createInitialHistory();

      expect(history.entries).toHaveLength(0);
      expect(history.sleepEntries).toHaveLength(0);
      expect(history.lastMoodCheck).toBeNull();
      expect(history.lastSleepCheck).toBeNull();
      expect(history.averageMood7Days).toBeNull();
      expect(history.averageSleep7Days).toBeNull();
      expect(history.moodTrend).toBe('unknown');
    });
  });

  describe('recordMood', () => {
    it('should record mood entry', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 4, ['sleep', 'work']);

      expect(entry.moodLevel).toBe(4);
      expect(entry.factors).toEqual(['sleep', 'work']);
      expect(history.entries).toHaveLength(1);
      expect(history.lastMoodCheck).not.toBeNull();
    });

    it('should record mood with context', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 3, [], 'morning');

      expect(entry.context).toBe('morning');
    });

    it('should record mood with note', () => {
      const history = service.createInitialHistory();
      const entry = service.recordMood(history, 5, [], 'manual', 'Great day!');

      expect(entry.note).toBe('Great day!');
    });

    it('should trim history when exceeds max', () => {
      const history = service.createInitialHistory();

      // Add 105 entries (exceeds 100)
      for (let i = 0; i < 105; i++) {
        service.recordMood(history, 3, []);
      }

      expect(history.entries.length).toBeLessThanOrEqual(100);
    });

    it('should update averages after recording', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 4, []);
      service.recordMood(history, 5, []);

      expect(history.averageMood7Days).not.toBeNull();
    });
  });

  describe('recordSleep', () => {
    it('should record sleep entry', () => {
      const history = service.createInitialHistory();
      const entry = service.recordSleep(history, 4, ['caffeine']);

      expect(entry.qualityLevel).toBe(4);
      expect(entry.factors).toEqual(['caffeine']);
      expect(history.sleepEntries).toHaveLength(1);
      expect(history.lastSleepCheck).not.toBeNull();
    });

    it('should record sleep with hours', () => {
      const history = service.createInitialHistory();
      const entry = service.recordSleep(history, 5, [], 8);

      expect(entry.hoursSlept).toBe(8);
    });

    it('should set date to previous day', () => {
      const history = service.createInitialHistory();
      const entry = service.recordSleep(history, 4, []);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedDate = yesterday.toISOString().split('T')[0];

      expect(entry.date).toBe(expectedDate);
    });

    it('should trim history when exceeds max', () => {
      const history = service.createInitialHistory();

      for (let i = 0; i < 105; i++) {
        service.recordSleep(history, 3, []);
      }

      expect(history.sleepEntries.length).toBeLessThanOrEqual(100);
    });
  });

  describe('updateAverages (via recordMood/recordSleep)', () => {
    it('should calculate mood trend as improving', () => {
      const history = service.createInitialHistory();

      // Record low moods first, then high moods
      service.recordMood(history, 2, []);
      service.recordMood(history, 2, []);
      service.recordMood(history, 4, []);
      service.recordMood(history, 5, []);

      expect(history.moodTrend).toBe('improving');
    });

    it('should calculate mood trend as declining', () => {
      const history = service.createInitialHistory();

      // Record high moods first, then low moods
      service.recordMood(history, 5, []);
      service.recordMood(history, 4, []);
      service.recordMood(history, 2, []);
      service.recordMood(history, 1, []);

      expect(history.moodTrend).toBe('declining');
    });

    it('should calculate mood trend as stable', () => {
      const history = service.createInitialHistory();

      // Record similar moods
      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);
      service.recordMood(history, 3, []);

      expect(history.moodTrend).toBe('stable');
    });

    it('should calculate sleep average', () => {
      const history = service.createInitialHistory();

      service.recordSleep(history, 4, []);
      service.recordSleep(history, 5, []);

      expect(history.averageSleep7Days).not.toBeNull();
    });
  });

  describe('analyzeMoodHistory', () => {
    it('should return default values for empty history', () => {
      const history = service.createInitialHistory();
      const analysis = service.analyzeMoodHistory(history);

      expect(analysis.averageMood).toBe(3);
      expect(analysis.averageSleep).toBe(3);
      expect(analysis.dominantFactors).toHaveLength(0);
    });

    it('should calculate average mood', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 4, []);
      service.recordMood(history, 5, []);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.averageMood).toBe(4.5);
    });

    it('should find dominant factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 4, ['sleep']);
      service.recordMood(history, 5, ['sleep', 'exercise']);
      service.recordMood(history, 4, ['sleep']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.dominantFactors).toContain('sleep');
    });

    it('should find positive factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 4, ['exercise']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.correlations.topPositiveFactors).toContain('exercise');
    });

    it('should find negative factors', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 1, ['stress']);
      service.recordMood(history, 2, ['stress']);
      service.recordMood(history, 1, ['stress']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.correlations.topNegativeFactors).toContain('stress');
    });

    it('should calculate sleep-mood correlation', () => {
      const history = service.createInitialHistory();

      // Good sleep days
      service.recordSleep(history, 5, []);
      service.recordMood(history, 5, []);

      // More entries for correlation
      service.recordSleep(history, 4, []);
      service.recordMood(history, 4, []);

      service.recordSleep(history, 2, []);
      service.recordMood(history, 2, []);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.correlations.sleepMoodCorrelation).toBeDefined();
    });

    it('should generate insights', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 4, ['exercise']);
      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 4, ['exercise']);

      const analysis = service.analyzeMoodHistory(history);
      expect(analysis.insights.length).toBeLessThanOrEqual(3);
    });

    it('should accept custom days parameter', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 4, []);

      const analysis = service.analyzeMoodHistory(history, 30);
      expect(analysis).toBeDefined();
    });
  });

  describe('formatMoodResponse', () => {
    it('should format response for low mood', () => {
      const response = service.formatMoodResponse(1, []);
      expect(response).toContain('Ужасно');
      expect(response).toContain('тяжёлые дни');
    });

    it('should format response for level 2 mood', () => {
      const response = service.formatMoodResponse(2, []);
      expect(response).toContain('Плохо');
      expect(response).toContain('тяжёлые дни');
    });

    it('should format response for neutral mood', () => {
      const response = service.formatMoodResponse(3, []);
      expect(response).toContain('Нормально');
      expect(response).toContain('Нормальный день');
    });

    it('should format response for good mood', () => {
      const response = service.formatMoodResponse(4, []);
      expect(response).toContain('Хорошо');
      expect(response).toContain('хорошее настроение');
    });

    it('should format response for level 5 mood', () => {
      const response = service.formatMoodResponse(5, []);
      expect(response).toContain('Отлично');
      expect(response).toContain('хорошее настроение');
    });

    it('should include factors in response', () => {
      const response = service.formatMoodResponse(4, ['sleep', 'exercise']);
      expect(response).toContain('Факторы');
      expect(response).toContain('Сон');
      expect(response).toContain('Спорт');
    });
  });

  describe('formatSleepResponse', () => {
    it('should format response for bad sleep', () => {
      const response = service.formatSleepResponse(1, []);
      expect(response).toContain('Не спал(а)');
      expect(response).toContain('Плохой сон');
    });

    it('should format response for level 2 sleep', () => {
      const response = service.formatSleepResponse(2, []);
      expect(response).toContain('Плохо');
      expect(response).toContain('Плохой сон');
    });

    it('should format response for neutral sleep', () => {
      const response = service.formatSleepResponse(3, []);
      expect(response).toContain('Так себе');
      expect(response).toContain('так себе');
    });

    it('should format response for good sleep', () => {
      const response = service.formatSleepResponse(4, []);
      expect(response).toContain('Нормально');
      expect(response).toContain('Отличный сон');
    });

    it('should format response for level 5 sleep', () => {
      const response = service.formatSleepResponse(5, []);
      expect(response).toContain('Отлично');
      expect(response).toContain('Отличный сон');
    });

    it('should include factors in response', () => {
      const response = service.formatSleepResponse(2, ['caffeine', 'screen']);
      expect(response).toContain('Что повлияло');
      expect(response).toContain('Кофеин');
      expect(response).toContain('Экраны');
    });
  });

  describe('getMoodCheckPrompt', () => {
    it('should return morning prompt', () => {
      const prompt = service.getMoodCheckPrompt('morning');
      expect(prompt).toContain('Доброе утро');
    });

    it('should return evening prompt', () => {
      const prompt = service.getMoodCheckPrompt('evening');
      expect(prompt).toContain('Добрый вечер');
    });

    it('should return check-in prompt', () => {
      const prompt = service.getMoodCheckPrompt('check-in');
      expect(prompt).toContain('чувствуешь сейчас');
    });

    it('should default to check-in prompt', () => {
      const prompt = service.getMoodCheckPrompt();
      expect(prompt).toContain('чувствуешь сейчас');
    });
  });

  describe('getSleepCheckPrompt', () => {
    it('should return sleep check prompt', () => {
      const prompt = service.getSleepCheckPrompt();
      expect(prompt).toContain('Как ты спал');
    });
  });

  describe('getFactorPrompt', () => {
    it('should return mood factor prompt', () => {
      const prompt = service.getFactorPrompt('mood');
      expect(prompt).toContain('настроение');
    });

    it('should return sleep factor prompt', () => {
      const prompt = service.getFactorPrompt('sleep');
      expect(prompt).toContain('сон');
    });
  });

  describe('getMoodWeekVisualization', () => {
    it('should return 7-day visualization', () => {
      const history = service.createInitialHistory();
      const viz = service.getMoodWeekVisualization(history);

      // Should have 7 items separated by spaces
      const items = viz.split(' ');
      expect(items).toHaveLength(7);
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

  describe('isMoodCheckDue', () => {
    it('should return true for new history', () => {
      const history = service.createInitialHistory();
      expect(service.isMoodCheckDue(history)).toBe(true);
    });

    it('should return false after recent check', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 3, []);

      expect(service.isMoodCheckDue(history)).toBe(false);
    });

    it('should accept custom threshold', () => {
      const history = service.createInitialHistory();
      service.recordMood(history, 3, []);

      // With 0 threshold, should be due immediately
      expect(service.isMoodCheckDue(history, 0)).toBe(true);
    });
  });

  describe('isSleepCheckDue', () => {
    it('should return false for new history at wrong time', () => {
      const history = service.createInitialHistory();
      const now = new Date();
      const hour = now.getHours();

      // Test depends on current time
      if (hour < 6 || hour > 12) {
        expect(service.isSleepCheckDue(history)).toBe(false);
      } else {
        expect(service.isSleepCheckDue(history)).toBe(true);
      }
    });

    it('should return false after check today', () => {
      const history = service.createInitialHistory();
      service.recordSleep(history, 4, []);

      const now = new Date();
      const hour = now.getHours();

      // If in valid time window, should still be false after check today
      if (hour >= 6 && hour <= 12) {
        expect(service.isSleepCheckDue(history)).toBe(false);
      }
    });
  });

  describe('generateInsights', () => {
    it('should generate improving trend insight', () => {
      const history = service.createInitialHistory();

      // Create improving trend
      service.recordMood(history, 2, []);
      service.recordMood(history, 3, []);
      service.recordMood(history, 4, []);
      service.recordMood(history, 5, []);

      const analysis = service.analyzeMoodHistory(history);
      const hasImprovingInsight = analysis.insights.some(i => i.includes('улучшается'));
      expect(hasImprovingInsight).toBe(true);
    });

    it('should generate declining trend insight', () => {
      const history = service.createInitialHistory();

      // Create declining trend
      service.recordMood(history, 5, []);
      service.recordMood(history, 4, []);
      service.recordMood(history, 2, []);
      service.recordMood(history, 1, []);

      const analysis = service.analyzeMoodHistory(history);
      const hasDecliningInsight = analysis.insights.some(i => i.includes('спад'));
      expect(hasDecliningInsight).toBe(true);
    });

    it('should generate sleep quality insight for poor sleep', () => {
      const history = service.createInitialHistory();

      service.recordSleep(history, 1, []);
      service.recordSleep(history, 2, []);
      service.recordSleep(history, 2, []);

      const analysis = service.analyzeMoodHistory(history);
      const hasSleepInsight = analysis.insights.some(i => i.includes('Качество сна ниже'));
      expect(hasSleepInsight).toBe(true);
    });

    it('should generate positive sleep quality insight', () => {
      const history = service.createInitialHistory();

      service.recordSleep(history, 5, []);
      service.recordSleep(history, 4, []);
      service.recordSleep(history, 5, []);

      const analysis = service.analyzeMoodHistory(history);
      const hasGoodSleepInsight = analysis.insights.some(i => i.includes('Отличное качество сна'));
      expect(hasGoodSleepInsight).toBe(true);
    });

    it('should generate positive factor insight', () => {
      const history = service.createInitialHistory();

      service.recordMood(history, 5, ['exercise']);
      service.recordMood(history, 4, ['exercise']);
      service.recordMood(history, 5, ['exercise']);

      const analysis = service.analyzeMoodHistory(history);
      const hasFactorInsight = analysis.insights.some(i => i.includes('улучшает настроение'));
      expect(hasFactorInsight).toBe(true);
    });

    it('should generate negative factor insight', () => {
      const history = service.createInitialHistory();

      service.recordMood(history, 1, ['stress']);
      service.recordMood(history, 2, ['stress']);
      service.recordMood(history, 1, ['stress']);

      const analysis = service.analyzeMoodHistory(history);
      const hasNegativeInsight = analysis.insights.some(i => i.includes('негативно'));
      expect(hasNegativeInsight).toBe(true);
    });
  });
});

describe('emojiSlider singleton', () => {
  it('should export singleton instance', () => {
    expect(emojiSlider).toBeInstanceOf(EmojiSliderService);
  });

  it('should be able to get mood scale', () => {
    const scale = emojiSlider.getMoodScale();
    expect(scale.length).toBe(5);
  });

  it('should be able to create history', () => {
    const history = emojiSlider.createInitialHistory();
    expect(history.entries).toHaveLength(0);
  });
});
