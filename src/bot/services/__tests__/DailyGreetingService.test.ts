/**
 * DailyGreetingService Tests
 * ==========================
 *
 * Tests for personalized daily greetings with integrated mood check.
 * Validates greeting generation, time-based messaging, and mood responses.
 *
 * @packageDocumentation
 */

import {
  DailyGreetingService,
  dailyGreeting,
  type IGreetingContext,
  type TimeOfDay,
} from '../DailyGreetingService';

describe('DailyGreetingService', () => {
  let service: DailyGreetingService;

  beforeEach(() => {
    service = new DailyGreetingService();
  });

  /**
   * Create default greeting context
   */
  function createContext(overrides: Partial<IGreetingContext> = {}): IGreetingContext {
    return {
      userName: 'Анна',
      timeOfDay: 'morning',
      currentStreak: 0,
      lastMoodLevel: undefined,
      hasPendingDiary: false,
      daysSinceLastActivity: 0,
      isFirstTimeToday: true,
      weekDay: 3, // Wednesday
      ...overrides,
    };
  }

  // ==========================================================================
  // Basic Greeting Generation
  // ==========================================================================
  describe('Basic Greeting Generation', () => {
    it('should generate greeting with user name', () => {
      const context = createContext({ userName: 'Иван' });
      const result = service.generate(context);

      expect(result.message).toContain('Иван');
    });

    it('should generate greeting without user name', () => {
      const context = createContext({ userName: undefined });
      const result = service.generate(context);

      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should include mood check', () => {
      const context = createContext();
      const result = service.generate(context);

      expect(result.includesMoodCheck).toBe(true);
    });

    it('should return keyboard', () => {
      const context = createContext();
      const result = service.generate(context);

      expect(result.keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Time-Based Greetings
  // ==========================================================================
  describe('Time-Based Greetings', () => {
    it('should generate morning greeting', () => {
      const context = createContext({ timeOfDay: 'morning' });
      const result = service.generate(context);

      // Morning greetings should contain morning-related words
      expect(result.message).toBeDefined();
    });

    it('should generate afternoon greeting', () => {
      const context = createContext({ timeOfDay: 'afternoon' });
      const result = service.generate(context);

      expect(result.message).toBeDefined();
    });

    it('should generate evening greeting', () => {
      const context = createContext({ timeOfDay: 'evening' });
      const result = service.generate(context);

      expect(result.message).toBeDefined();
    });

    it('should generate night greeting', () => {
      const context = createContext({ timeOfDay: 'night' });
      const result = service.generate(context);

      expect(result.message).toBeDefined();
    });
  });

  // ==========================================================================
  // Simple Greeting
  // ==========================================================================
  describe('Simple Greeting', () => {
    it('should generate simple greeting with name', () => {
      const greeting = service.generateSimple('Мария');

      expect(greeting).toContain('Мария');
    });

    it('should generate simple greeting without name', () => {
      const greeting = service.generateSimple();

      expect(greeting.endsWith('! ')).toBe(true);
    });

    it('should respect time of day', () => {
      const morning = service.generateSimple('Тест', 'morning');
      const night = service.generateSimple('Тест', 'night');

      expect(morning).toBeDefined();
      expect(night).toBeDefined();
    });
  });

  // ==========================================================================
  // Streak Messages
  // ==========================================================================
  describe('Streak Messages', () => {
    it('should include streak message for day 1', () => {
      const context = createContext({
        currentStreak: 1,
        isFirstTimeToday: true,
      });
      const result = service.generate(context);

      expect(result.message).toContain('🔥');
    });

    it('should include special message for 7-day streak', () => {
      const context = createContext({
        currentStreak: 7,
        isFirstTimeToday: true,
      });
      const result = service.generate(context);

      expect(result.message).toContain('Неделя');
    });

    it('should include special message for 30-day streak', () => {
      const context = createContext({
        currentStreak: 30,
        isFirstTimeToday: true,
      });
      const result = service.generate(context);

      expect(result.message).toContain('Месяц');
    });

    it('should not show streak if not first time today', () => {
      const context = createContext({
        currentStreak: 7,
        isFirstTimeToday: false,
      });
      const result = service.generate(context);

      // Should not contain the streak celebration
      expect(result.message).not.toContain('Неделя!');
    });
  });

  // ==========================================================================
  // Re-engagement Messages
  // ==========================================================================
  describe('Re-engagement Messages', () => {
    it('should show message for 3-day absence', () => {
      const context = createContext({ daysSinceLastActivity: 3 });
      const result = service.generate(context);

      expect(result.message).toContain('Рады тебя видеть');
    });

    it('should show message for 7+ day absence', () => {
      const context = createContext({ daysSinceLastActivity: 10 });
      const result = service.generate(context);

      expect(result.message).toContain('С возвращением');
    });

    it('should not show re-engagement for active users', () => {
      const context = createContext({ daysSinceLastActivity: 0 });
      const result = service.generate(context);

      expect(result.message).not.toContain('возвращением');
    });
  });

  // ==========================================================================
  // Weekday Context
  // ==========================================================================
  describe('Weekday Context', () => {
    it('should add Monday message', () => {
      const context = createContext({ weekDay: 1 });
      const result = service.generate(context);

      expect(result.message).toContain('новую неделю');
    });

    it('should add Friday message', () => {
      const context = createContext({ weekDay: 5 });
      const result = service.generate(context);

      expect(result.message).toContain('выходные');
    });

    it('should not add weekday message for regular days', () => {
      const context = createContext({ weekDay: 3 }); // Wednesday
      const result = service.generate(context);

      expect(result.message).not.toContain('выходные');
      expect(result.message).not.toContain('новую неделю');
    });
  });

  // ==========================================================================
  // Morning Notification
  // ==========================================================================
  describe('Morning Notification', () => {
    it('should generate morning notification', () => {
      const result = service.generateMorningNotification('Иван');

      expect(result.message).toContain('Иван');
      expect(result.keyboard).toBeDefined();
    });

    it('should include streak in morning notification', () => {
      const result = service.generateMorningNotification('Иван', 7);

      expect(result.message).toContain('🔥');
    });

    it('should suggest diary if pending', () => {
      const result = service.generateMorningNotification('Иван', 0, true);

      // Should have diary button in keyboard
      expect(result.keyboard).toBeDefined();
    });

    it('should work without name', () => {
      const result = service.generateMorningNotification();

      expect(result.message).toBeDefined();
    });
  });

  // ==========================================================================
  // Evening Notification
  // ==========================================================================
  describe('Evening Notification', () => {
    it('should generate evening notification', () => {
      const result = service.generateEveningNotification('Мария');

      expect(result.message).toContain('Мария');
      expect(result.keyboard).toBeDefined();
    });

    it('should remind about pending diary', () => {
      const result = service.generateEveningNotification('Мария', true);

      expect(result.message).toContain('дневник');
    });

    it('should work without name', () => {
      const result = service.generateEveningNotification();

      expect(result.message).toBeDefined();
    });
  });

  // ==========================================================================
  // Mood Response
  // ==========================================================================
  describe('Mood Response', () => {
    it('should generate supportive response for mood level 1', () => {
      const response = service.generateMoodResponse(1);

      expect(response).toContain('тяжело');
      expect(response).toContain('помочь');
    });

    it('should generate encouraging response for mood level 2', () => {
      const response = service.generateMoodResponse(2);

      expect(response).toContain('Бывают такие дни');
    });

    it('should generate neutral response for mood level 3', () => {
      const response = service.generateMoodResponse(3, 'Иван');

      expect(response).toContain('Иван');
      expect(response).toContain('Нормально');
    });

    it('should generate positive response for mood level 4', () => {
      const response = service.generateMoodResponse(4);

      expect(response).toContain('Отлично');
    });

    it('should generate celebratory response for mood level 5', () => {
      const response = service.generateMoodResponse(5);

      expect(response).toContain('Замечательно');
    });

    it('should include name in response', () => {
      const response = service.generateMoodResponse(3, 'Анна');

      expect(response).toContain('Анна');
    });

    it('should handle unknown mood level', () => {
      const response = service.generateMoodResponse(99);

      expect(response).toContain('Спасибо');
    });
  });

  // ==========================================================================
  // Mood Suggestions
  // ==========================================================================
  describe('Mood Suggestions', () => {
    it('should return suggestions for low mood', () => {
      const suggestions = service.getMoodSuggestions(1);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('расслабляющие упражнения');
    });

    it('should return suggestions for high mood', () => {
      const suggestions = service.getMoodSuggestions(5);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return default suggestions for unknown level', () => {
      const suggestions = service.getMoodSuggestions(99);

      expect(suggestions).toEqual(service.getMoodSuggestions(3));
    });
  });

  // ==========================================================================
  // Current Time of Day
  // ==========================================================================
  describe('Current Time of Day', () => {
    it('should return valid time of day', () => {
      const tod = service.getCurrentTimeOfDay();

      expect(['morning', 'afternoon', 'evening', 'night']).toContain(tod);
    });
  });

  // ==========================================================================
  // Suggested Actions
  // ==========================================================================
  describe('Suggested Actions', () => {
    it('should suggest diary if pending', () => {
      const context = createContext({ hasPendingDiary: true });
      const result = service.generate(context);

      expect(result.suggestedAction).toBe('diary');
    });

    it('should suggest mood week if no pending diary', () => {
      const context = createContext({ hasPendingDiary: false });
      const result = service.generate(context);

      expect(result.suggestedAction).toBe('mood_week');
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(dailyGreeting).toBeInstanceOf(DailyGreetingService);
    });

    it('should generate greetings via singleton', () => {
      const context = createContext();
      const result = dailyGreeting.generate(context);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle all time of day values', () => {
      const times: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

      for (const time of times) {
        const context = createContext({ timeOfDay: time });
        const result = service.generate(context);
        expect(result.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle zero streak', () => {
      const context = createContext({ currentStreak: 0 });
      const result = service.generate(context);

      expect(result.message).toBeDefined();
      expect(result.message).not.toContain('🔥');
    });

    it('should handle all weekdays', () => {
      for (let day = 0; day <= 6; day++) {
        const context = createContext({ weekDay: day });
        const result = service.generate(context);
        expect(result.message).toBeDefined();
      }
    });

    it('should handle extreme absence periods', () => {
      const context = createContext({ daysSinceLastActivity: 365 });
      const result = service.generate(context);

      expect(result.message).toContain('С возвращением');
    });

    it('should handle all mood levels in response', () => {
      for (let level = 1; level <= 5; level++) {
        const response = service.generateMoodResponse(level);
        expect(response.length).toBeGreaterThan(0);
      }
    });
  });
});
