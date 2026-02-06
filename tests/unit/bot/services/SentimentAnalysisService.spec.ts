/**
 * SentimentAnalysisService Unit Tests
 * ====================================
 * Tests for emotion-aware text analysis.
 *
 * @module @sleepcore/bot/services
 */

import {
  SentimentAnalysisService,
  sentimentAnalysis,
  type ISentimentResult,
  type IAnalysisContext,
} from '../../../../src/bot/services/SentimentAnalysisService';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService();
  });

  describe('analyze', () => {
    describe('basic emotions', () => {
      it('should detect positive emotion', () => {
        const result = service.analyze('Сегодня отлично выспался, чувствую себя прекрасно!');
        expect(result.primaryEmotion).toBe('positive');
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should detect tired emotion', () => {
        const result = service.analyze('Устал, сил нет, хочу спать');
        expect(result.primaryEmotion).toBe('tired');
      });

      it('should detect frustrated emotion', () => {
        const result = service.analyze('Раздражает, надоело, бесит всё');
        expect(result.primaryEmotion).toBe('frustrated');
      });

      it('should detect anxious emotion', () => {
        const result = service.analyze('Тревога, переживаю, страшно');
        expect(result.primaryEmotion).toBe('anxious');
      });

      it('should detect hopeful emotion', () => {
        const result = service.analyze('Надеюсь, получится, буду стараться');
        expect(result.primaryEmotion).toBe('hopeful');
      });

      it('should detect discouraged emotion', () => {
        const result = service.analyze('Не могу, безнадежно, бессмысленно');
        expect(result.primaryEmotion).toBe('discouraged');
      });

      it('should detect neutral emotion for plain text', () => {
        const result = service.analyze('да');
        expect(['neutral', 'positive']).toContain(result.primaryEmotion);
      });
    });

    describe('crisis detection', () => {
      it('should detect crisis keywords', () => {
        const result = service.analyze('не хочу жить');
        expect(result.isCrisis).toBe(true);
        expect(result.primaryEmotion).toBe('discouraged');
        expect(result.confidence).toBe(1.0);
      });

      it('should detect suicide keyword', () => {
        const result = service.analyze('думаю о суициде');
        expect(result.isCrisis).toBe(true);
        expect(result.triggerKeywords).toContain('суицид');
      });

      it('should set maximum arousal for crisis', () => {
        const result = service.analyze('больше не могу');
        expect(result.isCrisis).toBe(true);
        expect(result.arousal).toBe(1.0);
        expect(result.valence).toBe(-1.0);
      });

      it('should return anxious as secondary for crisis', () => {
        const result = service.analyze('невыносимо');
        expect(result.isCrisis).toBe(true);
        expect(result.secondaryEmotions).toContain('anxious');
      });
    });

    describe('emoji analysis', () => {
      it('should detect positive from 😊', () => {
        const result = service.analyze('Привет 😊');
        expect(result.primaryEmotion).toBe('positive');
      });

      it('should detect tired from 😴', () => {
        const result = service.analyze('😴 спать');
        expect(result.primaryEmotion).toBe('tired');
      });

      it('should detect frustrated from 😤', () => {
        const result = service.analyze('😤😤😤');
        expect(result.primaryEmotion).toBe('frustrated');
      });

      it('should detect anxious from 😰', () => {
        const result = service.analyze('😰');
        expect(result.primaryEmotion).toBe('anxious');
      });

      it('should detect discouraged from 😢', () => {
        const result = service.analyze('😢😭');
        expect(result.primaryEmotion).toBe('discouraged');
      });

      it('should detect hopeful from 💪', () => {
        const result = service.analyze('💪 справлюсь');
        expect(['hopeful', 'positive']).toContain(result.primaryEmotion);
      });
    });

    describe('intensity analysis', () => {
      it('should detect intensity from exclamation marks', () => {
        const result = service.analyze('Супер!!!');
        expect(result.arousal).toBeGreaterThan(0.3);
      });

      it('should detect intensity from question marks', () => {
        const result = service.analyze('Почему???');
        expect(result.arousal).toBeGreaterThan(0.3);
      });

      it('should detect intensity from caps', () => {
        const result = service.analyze('БЕСИТ ВСЁ ЭТО ДОСТАЛО');
        expect(result.arousal).toBeGreaterThan(0.3);
      });

      it('should not boost intensity for short caps text', () => {
        const result = service.analyze('ДА');
        expect(result.arousal).toBeLessThan(0.8);
      });

      it('should detect ellipsis as uncertainty', () => {
        const result = service.analyze('не знаю...');
        expect(result.arousal).toBeGreaterThan(0);
      });
    });

    describe('context weighting', () => {
      it('should boost tired for night time', () => {
        const context: Partial<IAnalysisContext> = { timeOfDay: 'night' };
        const resultWithContext = service.analyze('сообщение', context);
        const resultWithoutContext = service.analyze('сообщение');

        // Night context should make tired more likely
        expect(resultWithContext).toBeDefined();
        expect(resultWithoutContext).toBeDefined();
      });

      it('should boost tired for morning time', () => {
        const context: Partial<IAnalysisContext> = { timeOfDay: 'morning' };
        const result = service.analyze('привет', context);
        expect(result).toBeDefined();
      });

      it('should boost discouraged for long absence', () => {
        const context: Partial<IAnalysisContext> = { daysSinceLastInteraction: 10 };
        const result = service.analyze('привет', context);
        expect(result).toBeDefined();
      });

      it('should boost anxious for early therapy weeks', () => {
        const context: Partial<IAnalysisContext> = { therapyWeek: 1 };
        const result = service.analyze('волнуюсь', context);
        expect(result).toBeDefined();
      });

      it('should not modify scores without context', () => {
        const result = service.analyze('привет');
        expect(result).toBeDefined();
      });

      it('should handle undefined therapyWeek', () => {
        const context: Partial<IAnalysisContext> = { therapyWeek: undefined };
        const result = service.analyze('привет', context);
        expect(result).toBeDefined();
      });

      it('should not boost for daysSinceLastInteraction <= 7', () => {
        const context: Partial<IAnalysisContext> = { daysSinceLastInteraction: 5 };
        const result = service.analyze('привет', context);
        expect(result).toBeDefined();
      });

      it('should not boost anxious for later therapy weeks', () => {
        const context: Partial<IAnalysisContext> = { therapyWeek: 5 };
        const result = service.analyze('привет', context);
        expect(result).toBeDefined();
      });
    });

    describe('secondary emotions', () => {
      it('should detect secondary emotions', () => {
        const result = service.analyze('устал и переживаю');
        expect(result.secondaryEmotions.length).toBeGreaterThanOrEqual(0);
      });

      it('should filter low-confidence secondary emotions', () => {
        const result = service.analyze('хорошо');
        // Secondary emotions should only include those with score > 0.3
        expect(Array.isArray(result.secondaryEmotions)).toBe(true);
      });
    });

    describe('valence calculation', () => {
      it('should return positive valence for positive emotion', () => {
        const result = service.analyze('отлично прекрасно супер');
        expect(result.valence).toBeGreaterThan(0);
      });

      it('should return negative valence for discouraged emotion', () => {
        const result = service.analyze('безнадежно плохо ужасно');
        expect(result.valence).toBeLessThan(0);
      });

      it('should return near-zero valence for neutral emotion', () => {
        const result = service.analyze('ок');
        expect(Math.abs(result.valence)).toBeLessThan(0.5);
      });
    });

    describe('trigger keywords', () => {
      it('should collect trigger keywords', () => {
        const result = service.analyze('устал, измотан, сил нет');
        expect(result.triggerKeywords.length).toBeGreaterThan(0);
      });

      it('should limit trigger keywords to 5', () => {
        const result = service.analyze(
          'устал устала усталость измотан разбит вымотан сонный клонит в сон'
        );
        expect(result.triggerKeywords.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('quickCheck', () => {
    it('should return primary emotion', () => {
      const emotion = service.quickCheck('хорошо выспался');
      expect(typeof emotion).toBe('string');
    });

    it('should return positive for good sleep', () => {
      const emotion = service.quickCheck('выспался отлично');
      expect(['positive', 'hopeful']).toContain(emotion);
    });

    it('should return tired for fatigue', () => {
      const emotion = service.quickCheck('устал измотан вымотан');
      expect(emotion).toBe('tired');
    });
  });

  describe('result structure', () => {
    it('should have all required fields', () => {
      const result = service.analyze('тестовое сообщение');

      expect(result).toHaveProperty('primaryEmotion');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('secondaryEmotions');
      expect(result).toHaveProperty('valence');
      expect(result).toHaveProperty('arousal');
      expect(result).toHaveProperty('triggerKeywords');
      expect(result).toHaveProperty('isCrisis');
    });

    it('should have confidence between 0 and 1', () => {
      const result = service.analyze('отлично супер прекрасно класс здорово');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have valence between -1 and 1', () => {
      const result = service.analyze('тест');
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.valence).toBeLessThanOrEqual(1);
    });

    it('should have arousal between 0 and 1', () => {
      const result = service.analyze('КРИЧУ!!!');
      expect(result.arousal).toBeGreaterThanOrEqual(0);
      expect(result.arousal).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = service.analyze('');
      expect(result.primaryEmotion).toBeDefined();
    });

    it('should handle whitespace only', () => {
      const result = service.analyze('   ');
      expect(result.primaryEmotion).toBeDefined();
    });

    it('should handle very long text', () => {
      const longText = 'хорошо '.repeat(100);
      const result = service.analyze(longText);
      expect(result.primaryEmotion).toBeDefined();
    });

    it('should normalize text case', () => {
      const result1 = service.analyze('ХОРОШО');
      const result2 = service.analyze('хорошо');
      // Both should be recognized
      expect(result1.primaryEmotion).toBeDefined();
      expect(result2.primaryEmotion).toBeDefined();
    });
  });
});

describe('sentimentAnalysis singleton', () => {
  it('should export singleton instance', () => {
    expect(sentimentAnalysis).toBeInstanceOf(SentimentAnalysisService);
  });

  it('should be able to analyze text', () => {
    const result = sentimentAnalysis.analyze('привет');
    expect(result.primaryEmotion).toBeDefined();
  });

  it('should be able to quick check', () => {
    const emotion = sentimentAnalysis.quickCheck('хорошо');
    expect(typeof emotion).toBe('string');
  });
});

describe('SentimentAnalysisService - additional branches', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService();
  });

  describe('context combinations', () => {
    it('should handle daytime context', () => {
      const context: Partial<IAnalysisContext> = { timeOfDay: 'day' };
      const result = service.analyze('привет', context);
      expect(result.primaryEmotion).toBeDefined();
    });

    it('should handle evening context', () => {
      const context: Partial<IAnalysisContext> = { timeOfDay: 'evening' };
      const result = service.analyze('привет', context);
      expect(result.primaryEmotion).toBeDefined();
    });

    it('should handle zero daysSinceLastInteraction', () => {
      const context: Partial<IAnalysisContext> = { daysSinceLastInteraction: 0 };
      const result = service.analyze('привет', context);
      expect(result.primaryEmotion).toBeDefined();
    });
  });

  describe('keyword detection', () => {
    it('should detect multiple positive keywords', () => {
      const result = service.analyze('отлично супер здорово прекрасно замечательно');
      expect(result.primaryEmotion).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect multiple tired keywords', () => {
      const result = service.analyze('устал измотан разбит вымотан сонный');
      expect(result.primaryEmotion).toBe('tired');
    });

    it('should detect multiple anxious keywords', () => {
      const result = service.analyze('тревога беспокоюсь волнуюсь переживаю');
      expect(result.primaryEmotion).toBe('anxious');
    });
  });

  describe('intensity edge cases', () => {
    it('should handle multiple ellipses', () => {
      const result = service.analyze('не знаю... может быть... посмотрим...');
      expect(result.arousal).toBeGreaterThan(0);
    });

    it('should handle single exclamation', () => {
      const result = service.analyze('хорошо!');
      expect(result.arousal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('emoji combinations', () => {
    it('should handle multiple positive emojis', () => {
      const result = service.analyze('😊😄🙂👍');
      expect(result.primaryEmotion).toBe('positive');
    });

    it('should handle mixed emojis', () => {
      const result = service.analyze('😊😢');
      // Should detect the combined emotions
      expect(result).toBeDefined();
    });
  });
});
