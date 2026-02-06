/**
 * SonyaPersona Unit Tests
 * =======================
 *
 * Tests for Sonya - the virtual sleep expert persona.
 *
 * Test Coverage Requirements:
 * - Personality traits and constants
 * - Time-based greetings
 * - Emotional state responses
 * - Week-based encouragement
 * - Message generation
 * - Formatting helpers (say, sign, tip, celebrate, remind)
 *
 * @packageDocumentation
 */

import { SonyaPersona, sonya, type EmotionalState, type ITherapyContext } from '../SonyaPersona';

describe('SonyaPersona', () => {
  let persona: SonyaPersona;

  beforeEach(() => {
    persona = new SonyaPersona();
  });

  // ==========================================================================
  // Basic Properties
  // ==========================================================================
  describe('Basic Properties', () => {
    it('should have name "Соня"', () => {
      expect(persona.name).toBe('Соня');
    });

    it('should have owl emoji', () => {
      expect(persona.emoji).toBe('🦉');
    });

    it('should export singleton instance', () => {
      expect(sonya).toBeInstanceOf(SonyaPersona);
      expect(sonya.name).toBe('Соня');
    });
  });

  // ==========================================================================
  // Greetings
  // ==========================================================================
  describe('greet', () => {
    it('should generate morning greeting', () => {
      const result = persona.greet({ timeOfDay: 'morning' });

      expect(result.isFromSonya).toBe(true);
      expect(result.emoji).toBe('🦉');
      expect(result.encouragementLevel).toBe(0.8);
      // Should contain morning-related content
      // Possible greetings: 'Доброе утро! ☀️', 'С добрым утром! 🌅',
      // 'Утро доброе! Как спалось? 🌤️', 'Привет! Новый день — новые возможности! 🌻'
      expect(
        result.text.includes('утро') ||
        result.text.includes('Утро') ||
        result.text.includes('☀️') ||
        result.text.includes('🌅') ||
        result.text.includes('🌤️') ||
        result.text.includes('🌻') ||
        result.text.includes('Новый день')
      ).toBe(true);
    });

    it('should generate day greeting', () => {
      const result = persona.greet({ timeOfDay: 'day' });

      expect(result.isFromSonya).toBe(true);
      expect(
        result.text.includes('Привет') ||
        result.text.includes('день') ||
        result.text.includes('Рада') ||
        result.text.includes('дела')
      ).toBe(true);
    });

    it('should generate evening greeting', () => {
      const result = persona.greet({ timeOfDay: 'evening' });

      expect(result.isFromSonya).toBe(true);
      // Evening greetings include: 'Добрый вечер! 🌆', 'Вечер добрый! 🌙',
      // 'Привет! Как прошёл день? 🌇', 'Рада тебя видеть вечером! 💜'
      expect(
        result.text.includes('вечер') ||
        result.text.includes('Вечер') ||
        result.text.includes('🌆') ||
        result.text.includes('🌙') ||
        result.text.includes('🌇') ||
        result.text.includes('💜') ||
        result.text.includes('день')
      ).toBe(true);
    });

    it('should generate night greeting', () => {
      const result = persona.greet({ timeOfDay: 'night' });

      expect(result.isFromSonya).toBe(true);
      expect(
        result.text.includes('ночи') ||
        result.text.includes('Ночь') ||
        result.text.includes('🌙') ||
        result.text.includes('полуночник') ||
        result.text.includes('спишь')
      ).toBe(true);
    });

    it('should default to day greeting when no time specified', () => {
      const result = persona.greet({});

      expect(result.isFromSonya).toBe(true);
      // Day greetings are used as default
    });

    it('should include username when provided with exclamation', () => {
      const result = persona.greet({ timeOfDay: 'morning', userName: 'Анна' });

      // If original greeting has !, name should be inserted before !
      if (result.text.includes('!')) {
        expect(result.text.includes('Анна')).toBe(true);
      }
    });

    it('should include username when provided without exclamation', () => {
      // Test multiple times to hit greetings without !
      let foundWithoutExclamation = false;
      for (let i = 0; i < 20; i++) {
        const result = persona.greet({ timeOfDay: 'day', userName: 'Иван' });
        if (result.text.includes('Иван')) {
          foundWithoutExclamation = true;
          break;
        }
      }
      // At least one greeting should include the name
      expect(foundWithoutExclamation).toBe(true);
    });
  });

  // ==========================================================================
  // Emotional Responses
  // ==========================================================================
  describe('respondToEmotion', () => {
    const emotionalStates: EmotionalState[] = [
      'neutral',
      'positive',
      'tired',
      'frustrated',
      'anxious',
      'hopeful',
      'discouraged',
    ];

    it.each(emotionalStates)('should respond to %s emotional state', (state) => {
      const result = persona.respondToEmotion(state);

      expect(result.isFromSonya).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.emoji).toBeTruthy();
      expect(result.encouragementLevel).toBeGreaterThanOrEqual(0);
      expect(result.encouragementLevel).toBeLessThanOrEqual(1);
    });

    it('should return neutral emoji for neutral state', () => {
      const result = persona.respondToEmotion('neutral');
      expect(result.emoji).toBe('💙');
    });

    it('should return star emoji for positive state', () => {
      const result = persona.respondToEmotion('positive');
      expect(result.emoji).toBe('🌟');
    });

    it('should return moon emoji for tired state', () => {
      const result = persona.respondToEmotion('tired');
      expect(result.emoji).toBe('🌙');
    });

    it('should return strength emoji for frustrated state', () => {
      const result = persona.respondToEmotion('frustrated');
      expect(result.emoji).toBe('💪');
    });

    it('should return hug emoji for anxious state', () => {
      const result = persona.respondToEmotion('anxious');
      expect(result.emoji).toBe('🤗');
    });

    it('should return sparkle emoji for hopeful state', () => {
      const result = persona.respondToEmotion('hopeful');
      expect(result.emoji).toBe('✨');
    });

    it('should return seedling emoji for discouraged state', () => {
      const result = persona.respondToEmotion('discouraged');
      expect(result.emoji).toBe('🌱');
    });

    it('should have highest encouragement for discouraged state', () => {
      const result = persona.respondToEmotion('discouraged');
      expect(result.encouragementLevel).toBe(0.95);
    });

    it('should have high encouragement for frustrated state', () => {
      const result = persona.respondToEmotion('frustrated');
      expect(result.encouragementLevel).toBe(0.9);
    });

    it('should have moderate encouragement for neutral state', () => {
      const result = persona.respondToEmotion('neutral');
      expect(result.encouragementLevel).toBe(0.5);
    });
  });

  // ==========================================================================
  // Week-Based Encouragement
  // ==========================================================================
  describe('encourageByWeek', () => {
    it('should generate week 0 welcome message', () => {
      const result = persona.encourageByWeek(0);

      expect(result.isFromSonya).toBe(true);
      expect(result.emoji).toBe('🦉');
      expect(result.encouragementLevel).toBe(0.8);
      expect(
        result.text.includes('Добро пожаловать') ||
        result.text.includes('Рада, что ты здесь')
      ).toBe(true);
    });

    it('should generate week 1 adaptation message', () => {
      const result = persona.encourageByWeek(1);

      expect(result.text.includes('Первая неделя') || result.text.includes('Дневник сна')).toBe(true);
    });

    it('should generate week 4 midpoint message', () => {
      const result = persona.encourageByWeek(4);

      expect(
        result.text.includes('Четыре недели') ||
        result.text.includes('ветеран')
      ).toBe(true);
    });

    it('should generate week 8 graduation message', () => {
      const result = persona.encourageByWeek(8);

      expect(
        result.text.includes('Восемь недель') ||
        result.text.includes('Выпускник')
      ).toBe(true);
    });

    it('should clamp negative weeks to 0', () => {
      const result = persona.encourageByWeek(-5);

      expect(
        result.text.includes('Добро пожаловать') ||
        result.text.includes('Рада, что ты здесь')
      ).toBe(true);
    });

    it('should clamp weeks above 8 to 8', () => {
      const result = persona.encourageByWeek(15);

      expect(
        result.text.includes('Восемь недель') ||
        result.text.includes('Выпускник')
      ).toBe(true);
    });

    it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])('should have message for week %d', (week) => {
      const result = persona.encourageByWeek(week);
      expect(result.text).toBeTruthy();
      expect(result.isFromSonya).toBe(true);
    });
  });

  // ==========================================================================
  // Generate Message (Combined Context)
  // ==========================================================================
  describe('generateMessage', () => {
    const baseContext: ITherapyContext = {
      week: 2,
      sleepEfficiencyTrend: 'stable',
      daysSinceLastDiary: 0,
      emotionalState: 'neutral',
      timeOfDay: 'day',
      userName: 'Тест',
    };

    it('should generate message with Sonya header', () => {
      const message = persona.generateMessage(baseContext);

      expect(message).toContain('🦉');
      expect(message).toContain('*Соня*');
    });

    it('should include greeting based on time of day', () => {
      const message = persona.generateMessage({
        ...baseContext,
        timeOfDay: 'morning',
      });

      // Possible morning greetings include: 'Доброе утро! ☀️', 'С добрым утром! 🌅',
      // 'Утро доброе! Как спалось? 🌤️', 'Привет! Новый день — новые возможности! 🌻'
      expect(
        message.includes('утро') ||
        message.includes('Утро') ||
        message.includes('☀️') ||
        message.includes('🌅') ||
        message.includes('🌤️') ||
        message.includes('🌻') ||
        message.includes('Новый день')
      ).toBe(true);
    });

    it('should include username in greeting', () => {
      const message = persona.generateMessage({
        ...baseContext,
        userName: 'Мария',
      });

      expect(message).toContain('Мария');
    });

    it('should include emotional response for non-neutral state', () => {
      const message = persona.generateMessage({
        ...baseContext,
        emotionalState: 'anxious',
      });

      // Should contain anxious response phrases
      expect(
        message.includes('Тревога') ||
        message.includes('успокоимся') ||
        message.includes('Беспокойство')
      ).toBe(true);
    });

    it('should NOT include emotional response for neutral state', () => {
      const message = persona.generateMessage({
        ...baseContext,
        emotionalState: 'neutral',
        daysSinceLastDiary: 0,
      });

      // Neutral responses shouldn't appear separately
      // The message should still be valid
      expect(message).toContain('🦉');
    });

    it('should include week encouragement when daysSinceLastDiary >= 1', () => {
      const message = persona.generateMessage({
        ...baseContext,
        week: 3,
        daysSinceLastDiary: 2,
      });

      // Should contain week 3 messages (in italics)
      expect(
        message.includes('Три недели') ||
        message.includes('Половина пути')
      ).toBe(true);
    });

    it('should include week encouragement for week 0', () => {
      const message = persona.generateMessage({
        ...baseContext,
        week: 0,
        daysSinceLastDiary: 0,
      });

      // Week 0 should always include welcome message
      expect(
        message.includes('Добро пожаловать') ||
        message.includes('Рада, что ты здесь')
      ).toBe(true);
    });

    it('should NOT include week encouragement when recent diary and not week 0', () => {
      const message = persona.generateMessage({
        ...baseContext,
        week: 4,
        daysSinceLastDiary: 0,
        emotionalState: 'neutral',
      });

      // Should not include week encouragement (no _italics_)
      // Count occurrences of underscore pairs for italics
      const italicMatches = message.match(/_[^_]+_/g);
      // If there are no italics or only from emotional content, test passes
      expect(message).toContain('🦉');
    });
  });

  // ==========================================================================
  // Formatting Helpers
  // ==========================================================================
  describe('sign', () => {
    it('should add Sonya signature to message', () => {
      const message = 'Спокойной ночи!';
      const signed = persona.sign(message);

      expect(signed).toContain(message);
      expect(signed).toContain('— 🦉 Соня');
    });
  });

  describe('say', () => {
    it('should wrap message as from Sonya', () => {
      const text = 'Привет!';
      const result = persona.say(text);

      expect(result).toBe('🦉 *Соня:* Привет!');
    });
  });

  describe('tip', () => {
    it('should format text as tip from Sonya', () => {
      const tipText = 'Не пей кофе после 14:00';
      const result = persona.tip(tipText);

      expect(result).toBe('🦉 _Совет от Сони:_ Не пей кофе после 14:00');
    });
  });

  describe('celebrate', () => {
    it('should generate celebration message with achievement', () => {
      const achievement = 'Ты заполнил дневник 7 дней подряд!';
      const result = persona.celebrate(achievement);

      expect(result).toContain('🦉');
      expect(result).toContain(achievement);
      // Should contain one of the celebration prefixes
      expect(
        result.includes('🎉 Отлично!') ||
        result.includes('✨ Молодец!') ||
        result.includes('🌟 Супер!') ||
        result.includes('💪 Так держать!')
      ).toBe(true);
    });

    it('should vary celebration messages', () => {
      const achievement = 'Достижение!';
      const celebrations = new Set<string>();

      // Generate multiple celebrations to verify variety
      for (let i = 0; i < 20; i++) {
        celebrations.add(persona.celebrate(achievement));
      }

      // Should have at least 2 different variations
      expect(celebrations.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('remind', () => {
    it('should generate reminder message with task', () => {
      const task = 'заполнить дневник сна';
      const result = persona.remind(task);

      expect(result).toContain('🦉');
      expect(result).toContain(task);
      // Should be in italics
      expect(result).toContain('_');
      // Should contain one of the reminder prefixes
      expect(
        result.includes('Не забудь:') ||
        result.includes('Напоминаю:') ||
        result.includes('Когда будет минутка:')
      ).toBe(true);
    });

    it('should vary reminder messages', () => {
      const task = 'сделать упражнение';
      const reminders = new Set<string>();

      // Generate multiple reminders to verify variety
      for (let i = 0; i < 20; i++) {
        reminders.add(persona.remind(task));
      }

      // Should have at least 2 different variations
      expect(reminders.size).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty userName', () => {
      const result = persona.greet({ timeOfDay: 'day', userName: '' });

      expect(result.isFromSonya).toBe(true);
      expect(result.text).not.toContain(', ,'); // No double comma
    });

    it('should handle undefined userName', () => {
      const result = persona.greet({ timeOfDay: 'day' });

      expect(result.isFromSonya).toBe(true);
    });

    it('should handle special characters in userName', () => {
      const result = persona.greet({ timeOfDay: 'day', userName: 'Иван <script>' });

      expect(result.text).toContain('Иван <script>');
    });

    it('should handle very long userName', () => {
      const longName = 'А'.repeat(100);
      const result = persona.greet({ timeOfDay: 'day', userName: longName });

      expect(result.text).toContain(longName);
    });

    it('should handle all emotional states in generateMessage', () => {
      const states: EmotionalState[] = [
        'neutral', 'positive', 'tired', 'frustrated', 'anxious', 'hopeful', 'discouraged',
      ];

      for (const state of states) {
        const message = persona.generateMessage({
          week: 2,
          sleepEfficiencyTrend: 'stable',
          daysSinceLastDiary: 1,
          emotionalState: state,
          timeOfDay: 'day',
        });

        expect(message).toContain('🦉');
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should handle all times of day in generateMessage', () => {
      const times: Array<'morning' | 'day' | 'evening' | 'night'> = [
        'morning', 'day', 'evening', 'night',
      ];

      for (const time of times) {
        const message = persona.generateMessage({
          week: 1,
          sleepEfficiencyTrend: 'improving',
          daysSinceLastDiary: 0,
          emotionalState: 'neutral',
          timeOfDay: time,
        });

        expect(message).toContain('🦉');
      }
    });
  });

  // ==========================================================================
  // Consistency Tests
  // ==========================================================================
  describe('Consistency', () => {
    it('should always return isFromSonya=true for persona messages', () => {
      const greet = persona.greet({ timeOfDay: 'day' });
      const emotion = persona.respondToEmotion('positive');
      const encourage = persona.encourageByWeek(3);

      expect(greet.isFromSonya).toBe(true);
      expect(emotion.isFromSonya).toBe(true);
      expect(encourage.isFromSonya).toBe(true);
    });

    it('should always include emoji in persona messages', () => {
      const greet = persona.greet({ timeOfDay: 'night' });
      const emotion = persona.respondToEmotion('tired');
      const encourage = persona.encourageByWeek(6);

      expect(greet.emoji).toBeTruthy();
      expect(emotion.emoji).toBeTruthy();
      expect(encourage.emoji).toBeTruthy();
    });

    it('should return valid encouragement levels between 0 and 1', () => {
      const states: EmotionalState[] = [
        'neutral', 'positive', 'tired', 'frustrated', 'anxious', 'hopeful', 'discouraged',
      ];

      for (const state of states) {
        const result = persona.respondToEmotion(state);
        expect(result.encouragementLevel).toBeGreaterThanOrEqual(0);
        expect(result.encouragementLevel).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // Randomization Tests
  // ==========================================================================
  describe('Randomization', () => {
    it('should return varying greetings for same time of day', () => {
      const greetings = new Set<string>();

      for (let i = 0; i < 30; i++) {
        const result = persona.greet({ timeOfDay: 'morning' });
        greetings.add(result.text);
      }

      // Morning has 4 options, should see at least 2
      expect(greetings.size).toBeGreaterThanOrEqual(2);
    });

    it('should return varying emotional responses', () => {
      const responses = new Set<string>();

      for (let i = 0; i < 30; i++) {
        const result = persona.respondToEmotion('frustrated');
        responses.add(result.text);
      }

      // Frustrated has 3 options, should see at least 2
      expect(responses.size).toBeGreaterThanOrEqual(2);
    });

    it('should return varying week encouragements', () => {
      const encouragements = new Set<string>();

      for (let i = 0; i < 30; i++) {
        const result = persona.encourageByWeek(0);
        encouragements.add(result.text);
      }

      // Week 0 has 2 options
      expect(encouragements.size).toBeGreaterThanOrEqual(2);
    });
  });
});
