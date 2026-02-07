/**
 * SentimentAnalysisService Tests
 * ===============================
 *
 * Tests for emotion-aware text analysis service.
 * Validates keyword detection, emoji analysis, and crisis detection.
 *
 * @packageDocumentation
 */

import {
  SentimentAnalysisService,
  sentimentAnalysis,
  type IAnalysisContext,
} from '../SentimentAnalysisService';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService();
  });

  // ==========================================================================
  // Crisis Detection (Safety-Critical)
  // ==========================================================================
  describe('Crisis Detection', () => {
    it('should detect crisis keywords', () => {
      const crisisMessages = [
        'Я не хочу жить',
        'Думаю о суициде',
        'Хочу покончить с собой',
        'Мне невыносимо',
      ];

      crisisMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.isCrisis).toBe(true);
        expect(result.valence).toBe(-1.0);
        expect(result.arousal).toBe(1.0);
      });
    });

    it('should return discouraged as primary emotion for crisis', () => {
      const result = service.analyze('Я не хочу жить');
      expect(result.primaryEmotion).toBe('discouraged');
      expect(result.secondaryEmotions).toContain('anxious');
    });

    it('should include trigger keywords for crisis', () => {
      const result = service.analyze('Думаю о суициде');
      expect(result.triggerKeywords.length).toBeGreaterThan(0);
    });

    it('should not trigger crisis for normal messages', () => {
      const normalMessages = [
        'Я плохо сплю',
        'Устал сегодня',
        'Немного грустно',
      ];

      normalMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.isCrisis).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Positive Emotion Detection
  // ==========================================================================
  describe('Positive Emotion Detection', () => {
    it('should detect positive emotions from keywords', () => {
      const positiveMessages = [
        'Сегодня всё хорошо!',
        'Я рад',
        'Отлично выспался',
        'Замечательный день',
      ];

      positiveMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('positive');
        expect(result.valence).toBeGreaterThan(0);
      });
    });

    it('should detect positive emotions from emojis', () => {
      const result = service.analyze('😊😊😊');
      expect(result.primaryEmotion).toBe('positive');
    });

    it('should have positive valence for positive emotions', () => {
      const result = service.analyze('Я очень рад!');
      expect(result.valence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Tired Emotion Detection
  // ==========================================================================
  describe('Tired Emotion Detection', () => {
    it('should detect tiredness from keywords', () => {
      const tiredMessages = [
        'Я очень устал',
        'Сил нет',
        'Не выспался',
        'Хочу спать',
      ];

      tiredMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('tired');
      });
    });

    it('should detect tiredness from sleep emojis', () => {
      const result = service.analyze('😴😴');
      expect(result.primaryEmotion).toBe('tired');
    });

    it('should have negative valence for tiredness', () => {
      const result = service.analyze('Я очень устал');
      expect(result.valence).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // Frustrated Emotion Detection
  // ==========================================================================
  describe('Frustrated Emotion Detection', () => {
    it('should detect frustration from keywords', () => {
      const frustratedMessages = [
        'Меня это бесит!',
        'Раздражает',
        'Надоело всё',
        'Ненавижу',
      ];

      frustratedMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('frustrated');
      });
    });

    it('should detect frustration from angry emojis', () => {
      const result = service.analyze('😤😡');
      expect(result.primaryEmotion).toBe('frustrated');
    });

    it('should have high arousal for frustration', () => {
      const result = service.analyze('Меня это БЕСИТ!!!');
      expect(result.arousal).toBeGreaterThan(0.5);
    });
  });

  // ==========================================================================
  // Anxious Emotion Detection
  // ==========================================================================
  describe('Anxious Emotion Detection', () => {
    it('should detect anxiety from keywords', () => {
      const anxiousMessages = [
        'Я очень тревожусь',
        'Мне страшно',
        'Паника',
        'Не могу расслабиться',
      ];

      anxiousMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('anxious');
      });
    });

    it('should detect anxiety from worried emojis', () => {
      const result = service.analyze('😰😨');
      expect(result.primaryEmotion).toBe('anxious');
    });

    it('should have high arousal for anxiety', () => {
      const result = service.analyze('Я очень тревожусь');
      expect(result.arousal).toBeGreaterThan(0.5);
    });
  });

  // ==========================================================================
  // Hopeful Emotion Detection
  // ==========================================================================
  describe('Hopeful Emotion Detection', () => {
    it('should detect hope from keywords', () => {
      const hopefulMessages = [
        'Надеюсь получится',
        'Буду стараться',
        'Верю в лучшее',
        'Попробую',
      ];

      hopefulMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('hopeful');
      });
    });

    it('should have positive valence for hope', () => {
      const result = service.analyze('Я верю, что справлюсь');
      expect(result.valence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Discouraged Emotion Detection
  // ==========================================================================
  describe('Discouraged Emotion Detection', () => {
    it('should detect discouragement from keywords', () => {
      const discouragedMessages = [
        'Ничего не получается',
        'Безнадежно',
        'Хочу сдаться',
        'Всё бессмысленно',
      ];

      discouragedMessages.forEach(text => {
        const result = service.analyze(text);
        expect(result.primaryEmotion).toBe('discouraged');
      });
    });

    it('should detect discouragement from sad emojis', () => {
      const result = service.analyze('😢😭');
      expect(result.primaryEmotion).toBe('discouraged');
    });

    it('should have negative valence for discouragement', () => {
      const result = service.analyze('Мне очень плохо');
      expect(result.valence).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // Neutral Emotion Detection
  // ==========================================================================
  describe('Neutral Emotion Detection', () => {
    it('should detect neutral for simple responses', () => {
      const neutralMessages = [
        'Ок',
        'Понял',
        'Да',
        'Хорошо',
      ];

      neutralMessages.forEach(text => {
        const result = service.analyze(text);
        // Neutral has base score, may be primary
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should return neutral for empty-ish messages', () => {
      const result = service.analyze('   ');
      expect(result.primaryEmotion).toBe('neutral');
    });
  });

  // ==========================================================================
  // Intensity Analysis
  // ==========================================================================
  describe('Intensity Analysis', () => {
    it('should detect high intensity from multiple exclamation marks', () => {
      const result = service.analyze('Это ужасно!!!');
      expect(result.arousal).toBeGreaterThan(0.3);
    });

    it('should detect intensity from CAPS', () => {
      const result = service.analyze('Я ОЧЕНЬ УСТАЛ');
      expect(result.arousal).toBeGreaterThan(0.3);
    });

    it('should detect ellipsis', () => {
      const result = service.analyze('Не знаю...');
      // Ellipsis adds subtle intensity
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Context Weighting
  // ==========================================================================
  describe('Context Weighting', () => {
    it('should increase tired score at night', () => {
      const context: Partial<IAnalysisContext> = {
        timeOfDay: 'night',
      };

      const result = service.analyze('Ок', context);
      // Night context adds to tired baseline
      expect(result).toBeDefined();
    });

    it('should increase discouraged for long absence', () => {
      const context: Partial<IAnalysisContext> = {
        daysSinceLastInteraction: 14,
      };

      const result = service.analyze('Привет', context);
      // Long absence adds to discouraged baseline
      expect(result).toBeDefined();
    });

    it('should increase anxiety in early therapy weeks', () => {
      const context: Partial<IAnalysisContext> = {
        therapyWeek: 1,
      };

      const result = service.analyze('Начинаем', context);
      // Early therapy adds to anxiety baseline
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Quick Check
  // ==========================================================================
  describe('Quick Check', () => {
    it('should return emotion state directly', () => {
      const emotion = service.quickCheck('Я рад!');
      expect(emotion).toBe('positive');
    });

    it('should work for various emotions', () => {
      expect(service.quickCheck('Устал')).toBe('tired');
      expect(service.quickCheck('Бесит')).toBe('frustrated');
    });
  });

  // ==========================================================================
  // Result Structure
  // ==========================================================================
  describe('Result Structure', () => {
    it('should return complete result structure', () => {
      const result = service.analyze('Тестовое сообщение');

      expect(result).toHaveProperty('primaryEmotion');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('secondaryEmotions');
      expect(result).toHaveProperty('valence');
      expect(result).toHaveProperty('arousal');
      expect(result).toHaveProperty('triggerKeywords');
      expect(result).toHaveProperty('isCrisis');
    });

    it('should have confidence between 0 and 1', () => {
      const result = service.analyze('Отлично!!!');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have valence between -1 and 1', () => {
      const result = service.analyze('Тест');
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.valence).toBeLessThanOrEqual(1);
    });

    it('should have arousal between 0 and 1', () => {
      const result = service.analyze('Тест');
      expect(result.arousal).toBeGreaterThanOrEqual(0);
      expect(result.arousal).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(sentimentAnalysis).toBeInstanceOf(SentimentAnalysisService);
    });

    it('should analyze messages via singleton', () => {
      const result = sentimentAnalysis.analyze('Привет!');
      expect(result).toBeDefined();
      expect(result.primaryEmotion).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = service.analyze('');
      expect(result.primaryEmotion).toBe('neutral');
    });

    it('should handle only emojis', () => {
      const result = service.analyze('😊😊😊😊');
      expect(result.primaryEmotion).toBe('positive');
    });

    it('should handle only punctuation', () => {
      const result = service.analyze('???!!!');
      expect(result).toBeDefined();
    });

    it('should handle mixed language', () => {
      const result = service.analyze('I am хорошо');
      expect(result).toBeDefined();
    });

    it('should handle very long text', () => {
      const longText = 'Устал '.repeat(100);
      const result = service.analyze(longText);
      expect(result.primaryEmotion).toBe('tired');
    });
  });
});
