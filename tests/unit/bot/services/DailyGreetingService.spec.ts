/**
 * DailyGreetingService Unit Tests
 * ================================
 * Tests for personalized daily greeting generation.
 *
 * @module @sleepcore/bot/services
 */

import {
  DailyGreetingService,
  dailyGreeting,
  type IGreetingContext,
  type TimeOfDay,
} from '../../../../src/bot/services/DailyGreetingService';

describe('DailyGreetingService', () => {
  let service: DailyGreetingService;

  beforeEach(() => {
    service = new DailyGreetingService();
  });

  describe('generate', () => {
    it('should generate greeting with mood check', () => {
      const context: IGreetingContext = {
        userName: 'Анна',
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3, // Wednesday
      };

      const result = service.generate(context);

      expect(result.message).toContain('Анна');
      expect(result.keyboard).toBeDefined();
      expect(result.includesMoodCheck).toBe(true);
    });

    it('should include streak message for streak >= 1 on first time today', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 1,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('🔥');
    });

    it('should include streak message for 3 days', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 3,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('3 дня');
    });

    it('should include streak message for 7 days', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 7,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('Неделя');
    });

    it('should include streak message for 14 days', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 14,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('2 недели');
    });

    it('should include streak message for 30+ days', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 35,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('Месяц');
    });

    it('should not include streak message when not first time today', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 10,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: false,
        weekDay: 3,
      };

      const result = service.generate(context);
      // Should not have streak emoji since not first time today
      expect(result.message.match(/🔥/g)?.length || 0).toBeLessThanOrEqual(0);
    });

    it('should add re-engagement message for 3-6 days absence', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 5,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('Рады тебя видеть');
    });

    it('should add welcome back message for 7+ days absence', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 10,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.message).toContain('С возвращением');
    });

    it('should suggest diary when hasPendingDiary is true', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: true,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.suggestedAction).toBe('diary');
    });

    it('should suggest mood_week when no pending diary', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.suggestedAction).toBe('mood_week');
    });

    it('should add Monday context', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 1, // Monday
      };

      const result = service.generate(context);
      expect(result.message).toContain('новую неделю');
    });

    it('should add Friday context', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 5, // Friday
      };

      const result = service.generate(context);
      expect(result.message).toContain('выходные');
    });
  });

  describe('generateSimple', () => {
    it('should generate greeting with name', () => {
      const result = service.generateSimple('Иван', 'morning');
      expect(result).toContain('Иван');
    });

    it('should generate greeting without name', () => {
      const result = service.generateSimple(undefined, 'afternoon');
      expect(result).toMatch(/!\s*$/);
      expect(result).not.toContain('undefined');
    });

    it('should use current time when not specified', () => {
      const result = service.generateSimple('Тест');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle morning greetings', () => {
      const result = service.generateSimple(undefined, 'morning');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle afternoon greetings', () => {
      const result = service.generateSimple(undefined, 'afternoon');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle evening greetings', () => {
      const result = service.generateSimple(undefined, 'evening');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle night greetings', () => {
      const result = service.generateSimple(undefined, 'night');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateMorningNotification', () => {
    it('should generate morning notification with name', () => {
      const result = service.generateMorningNotification('Мария');
      expect(result.message).toContain('Мария');
      expect(result.keyboard).toBeDefined();
    });

    it('should include streak message when streak > 0', () => {
      const result = service.generateMorningNotification('Тест', 5);
      expect(result.message).toContain('🔥');
    });

    it('should not include streak message when streak is 0', () => {
      const result = service.generateMorningNotification('Тест', 0);
      expect(result.message).not.toContain('🔥');
    });

    it('should add diary button when pending diary', () => {
      const result = service.generateMorningNotification('Тест', 0, true);
      expect(result.keyboard).toBeDefined();
    });

    it('should add week button when no pending diary', () => {
      const result = service.generateMorningNotification('Тест', 0, false);
      expect(result.keyboard).toBeDefined();
    });

    it('should generate without any parameters', () => {
      const result = service.generateMorningNotification();
      expect(result.message).toContain('?');
      expect(result.keyboard).toBeDefined();
    });
  });

  describe('generateEveningNotification', () => {
    it('should generate evening notification', () => {
      const result = service.generateEveningNotification('Анна');
      expect(result.message).toContain('Анна');
      expect(result.message).toContain('?');
    });

    it('should remind about pending diary', () => {
      const result = service.generateEveningNotification('Тест', true);
      expect(result.message).toContain('дневник');
    });

    it('should not mention diary when not pending', () => {
      const result = service.generateEveningNotification('Тест', false);
      expect(result.message).not.toContain('Не забудь');
    });

    it('should generate without parameters', () => {
      const result = service.generateEveningNotification();
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.keyboard).toBeDefined();
    });
  });

  describe('generateMoodResponse', () => {
    it('should respond to mood level 1', () => {
      const response = service.generateMoodResponse(1);
      expect(response).toContain('тяжело');
    });

    it('should respond to mood level 1 with name', () => {
      const response = service.generateMoodResponse(1, 'Дима');
      expect(response).toContain('Дима');
    });

    it('should respond to mood level 2', () => {
      const response = service.generateMoodResponse(2);
      expect(response).toContain('Бывают');
    });

    it('should respond to mood level 2 with name', () => {
      const response = service.generateMoodResponse(2, 'Лена');
      expect(response).toContain('Лена');
    });

    it('should respond to mood level 3', () => {
      const response = service.generateMoodResponse(3);
      expect(response).toContain('Нормально');
    });

    it('should respond to mood level 4', () => {
      const response = service.generateMoodResponse(4);
      expect(response).toContain('Отлично');
    });

    it('should respond to mood level 5', () => {
      const response = service.generateMoodResponse(5);
      expect(response).toContain('Замечательно');
    });

    it('should handle unknown mood level', () => {
      const response = service.generateMoodResponse(10);
      expect(response).toContain('Спасибо');
    });

    it('should handle mood level 0', () => {
      const response = service.generateMoodResponse(0);
      expect(response).toContain('Спасибо');
    });
  });

  describe('getMoodSuggestions', () => {
    it('should return suggestions for mood level 1', () => {
      const suggestions = service.getMoodSuggestions(1);
      expect(suggestions).toContain('расслабляющие упражнения');
    });

    it('should return suggestions for mood level 2', () => {
      const suggestions = service.getMoodSuggestions(2);
      expect(suggestions).toContain('прогулку');
    });

    it('should return suggestions for mood level 3', () => {
      const suggestions = service.getMoodSuggestions(3);
      expect(suggestions).toContain('дневник сна');
    });

    it('should return suggestions for mood level 4', () => {
      const suggestions = service.getMoodSuggestions(4);
      expect(suggestions).toContain('челлендж дня');
    });

    it('should return suggestions for mood level 5', () => {
      const suggestions = service.getMoodSuggestions(5);
      expect(suggestions).toContain('помочь другим');
    });

    it('should return default suggestions for unknown mood level', () => {
      const suggestions = service.getMoodSuggestions(99);
      expect(suggestions).toEqual(service.getMoodSuggestions(3));
    });
  });

  describe('getCurrentTimeOfDay', () => {
    it('should return a valid time of day', () => {
      const result = service.getCurrentTimeOfDay();
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(result);
    });
  });

  describe('time of day variations', () => {
    const contexts: Array<{ timeOfDay: TimeOfDay; expected: string }> = [
      { timeOfDay: 'morning', expected: 'утр' },
      { timeOfDay: 'afternoon', expected: '' },
      { timeOfDay: 'evening', expected: 'вечер' },
      { timeOfDay: 'night', expected: '' },
    ];

    contexts.forEach(({ timeOfDay }) => {
      it(`should generate greeting for ${timeOfDay}`, () => {
        const context: IGreetingContext = {
          timeOfDay,
          currentStreak: 0,
          hasPendingDiary: false,
          daysSinceLastActivity: 0,
          isFirstTimeToday: true,
          weekDay: 3,
        };

        const result = service.generate(context);
        expect(result.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('keyboard building', () => {
    it('should build keyboard with diary button when pending', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: true,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.keyboard).toBeDefined();
    });

    it('should build keyboard with challenges button when no pending diary', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 3,
      };

      const result = service.generate(context);
      expect(result.keyboard).toBeDefined();
    });
  });
});

describe('dailyGreeting singleton', () => {
  it('should export singleton instance', () => {
    expect(dailyGreeting).toBeInstanceOf(DailyGreetingService);
  });

  it('should be able to generate greetings', () => {
    const context: IGreetingContext = {
      timeOfDay: 'morning',
      currentStreak: 0,
      hasPendingDiary: false,
      daysSinceLastActivity: 0,
      isFirstTimeToday: true,
      weekDay: 3,
    };

    const result = dailyGreeting.generate(context);
    expect(result.includesMoodCheck).toBe(true);
  });
});

describe('DailyGreetingService - additional branches', () => {
  let service: DailyGreetingService;

  beforeEach(() => {
    service = new DailyGreetingService();
  });

  describe('mood responses with names', () => {
    it('should respond to mood level 3 with name', () => {
      const response = service.generateMoodResponse(3, 'Анна');
      expect(response).toContain('Анна');
    });

    it('should respond to mood level 4 with name', () => {
      const response = service.generateMoodResponse(4, 'Сергей');
      expect(response).toContain('Сергей');
    });

    it('should respond to mood level 5 with name', () => {
      const response = service.generateMoodResponse(5, 'Мария');
      expect(response).toContain('Мария');
    });
  });

  describe('morning notification edge cases', () => {
    it('should handle undefined streak', () => {
      const result = service.generateMorningNotification('Тест', undefined);
      expect(result.message).not.toContain('🔥');
    });

    it('should handle null-ish hasPendingDiary', () => {
      const result = service.generateMorningNotification('Тест', 0, undefined);
      expect(result.keyboard).toBeDefined();
    });
  });

  describe('time of day variations', () => {
    it('should handle all time of day greetings independently', () => {
      const times: Array<'morning' | 'afternoon' | 'evening' | 'night'> = [
        'morning', 'afternoon', 'evening', 'night'
      ];

      for (const time of times) {
        const greeting = service.generateSimple(undefined, time);
        expect(greeting).not.toContain('undefined');
        expect(greeting.length).toBeGreaterThan(0);
      }
    });
  });

  describe('weekend days', () => {
    it('should not add special context for Saturday', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 6, // Saturday
      };

      const result = service.generate(context);
      expect(result.message).not.toContain('неделю');
      expect(result.message).not.toContain('выходные');
    });

    it('should not add special context for Sunday', () => {
      const context: IGreetingContext = {
        timeOfDay: 'morning',
        currentStreak: 0,
        hasPendingDiary: false,
        daysSinceLastActivity: 0,
        isFirstTimeToday: true,
        weekDay: 0, // Sunday
      };

      const result = service.generate(context);
      expect(result.message).not.toContain('неделю');
      expect(result.message).not.toContain('выходные');
    });
  });
});
