/**
 * SmartTipsCommand Tests
 * ======================
 *
 * JITAI (Just-In-Time Adaptive Interventions) compliance tests
 *
 * Tests verify:
 * - Context-aware recommendations (time-of-day, emotion)
 * - Age-adaptive content selection
 * - Emotional state parsing (Russian/English)
 * - Content filtering (quick, sleep)
 * - Completion tracking with XP rewards
 * - Timer functionality
 *
 * Research basis:
 * - Nahum-Shani et al. (2018): JITAI in mental health
 * - Woebot/Wysa patterns: 34-42% symptom reduction
 *
 * @packageDocumentation
 */

import type { ISleepCoreContext } from '../interfaces/ICommand';

// Create mock functions for content service
const mockContentService = {
  getRecommendations: jest.fn(),
  getContent: jest.fn(),
  getQuickRelief: jest.fn(),
  getSleepContent: jest.fn(),
  formatForTelegram: jest.fn(),
  formatStepsForTelegram: jest.fn(),
  recordCompletion: jest.fn(),
};

// Mock content module before imports
jest.mock('../../../modules/content', () => ({
  getContentService: () => mockContentService,
  AgeGroup: {},
  EmotionalState: {},
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    success: (text: string) => `✅ ${text}`,
  },
}));

// Import after mocks
import { SmartTipsCommand, smartTipsCommand } from '../SmartTipsCommand';

describe('SmartTipsCommand', () => {
  let command: SmartTipsCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;

  // Sample content items
  const mockContentItem = {
    id: 'breathing_478',
    title: 'Дыхание 4-7-8',
    category: 'relaxation',
    durationMinutes: 5,
    icon: '🌬️',
    steps: ['Вдох на 4', 'Задержка на 7', 'Выдох на 8'],
    reward: { xp: 20 },
  };

  const mockRecommendations = [
    {
      content: {
        id: 'breathing_478',
        title: 'Дыхание 4-7-8',
        icon: '🌬️',
        durationMinutes: 5,
      },
      reason: 'Подходит для вечернего расслабления',
      score: 0.95,
    },
    {
      content: {
        id: 'body_scan',
        title: 'Сканирование тела',
        icon: '🧘',
        durationMinutes: 10,
      },
      reason: 'Помогает снять напряжение',
      score: 0.85,
    },
    {
      content: {
        id: 'pmr_short',
        title: 'Быстрая релаксация',
        icon: '💆',
        durationMinutes: 3,
      },
      reason: 'Быстрая техника для стресса',
      score: 0.75,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    command = new SmartTipsCommand();

    mockGetSession = jest.fn().mockReturnValue({
      userId: '12345',
      ageGroup: 'adult',
    });

    mockContext = {
      userId: '12345',  // Numeric string for parseInt()
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
      },
    } as unknown as ISleepCoreContext;

    // Default mocks
    mockContentService.getRecommendations.mockResolvedValue(mockRecommendations);
    mockContentService.getContent.mockResolvedValue(mockContentItem);
    mockContentService.formatForTelegram.mockReturnValue('Formatted content');
    mockContentService.formatStepsForTelegram.mockReturnValue('Formatted steps');
    mockContentService.recordCompletion.mockResolvedValue(undefined);
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('smart_tips');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Умные рекомендации');
    });

    it('should have helpful aliases', () => {
      expect(command.aliases).toContain('tips');
      expect(command.aliases).toContain('recommend');
      expect(command.aliases).toContain('советы');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('show');
      expect(command.steps).toContain('filter');
      expect(command.steps).toContain('done');
      expect(command.steps).toContain('timer');
    });
  });

  // ==========================================================================
  // EXECUTE - MAIN ENTRY POINT
  // ==========================================================================
  describe('Execute - Main Entry Point', () => {
    it('should show personalized recommendations', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Соня');
      expect(result.message).toContain('Персональные рекомендации');
    });

    it('should include recommendations in message', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Дыхание 4-7-8');
      expect(result.message).toContain('Сканирование тела');
    });

    it('should show reason for first recommendation', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Подходит для вечернего расслабления');
    });

    it('should have keyboard with recommendations', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.length).toBeGreaterThan(0);

      const firstButton = buttons.find(b => b.callbackData?.includes('tips:show:'));
      expect(firstButton).toBeDefined();
    });

    it('should have filter buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const quickButton = buttons.find(b => b.callbackData === 'tips:filter:quick');
      const sleepButton = buttons.find(b => b.callbackData === 'tips:filter:sleep');

      expect(quickButton).toBeDefined();
      expect(quickButton?.text).toContain('Быстрые');
      expect(sleepButton).toBeDefined();
      expect(sleepButton?.text).toContain('Для сна');
    });

    it('should include metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata?.recommendationCount).toBe(3);
    });
  });

  // ==========================================================================
  // TIME-OF-DAY AWARENESS
  // ==========================================================================
  describe('Time-of-Day Awareness', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should greet "Доброе утро" in morning (5-12)', async () => {
      const mockDate = class extends Date {
        getHours() { return 8; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new SmartTipsCommand();
      const result = await freshCommand.execute(mockContext);

      expect(result.message).toContain('Доброе утро');
      expect(result.metadata?.timeOfDay).toBe('morning');
    });

    it('should greet "Добрый день" in afternoon (12-17)', async () => {
      const mockDate = class extends Date {
        getHours() { return 14; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new SmartTipsCommand();
      const result = await freshCommand.execute(mockContext);

      expect(result.message).toContain('Добрый день');
      expect(result.metadata?.timeOfDay).toBe('afternoon');
    });

    it('should greet "Добрый вечер" in evening (17-21)', async () => {
      const mockDate = class extends Date {
        getHours() { return 19; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new SmartTipsCommand();
      const result = await freshCommand.execute(mockContext);

      expect(result.message).toContain('Добрый вечер');
      expect(result.metadata?.timeOfDay).toBe('evening');
    });

    it('should greet "Доброй ночи" at night (21-5)', async () => {
      const mockDate = class extends Date {
        getHours() { return 23; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new SmartTipsCommand();
      const result = await freshCommand.execute(mockContext);

      expect(result.message).toContain('Доброй ночи');
      expect(result.metadata?.timeOfDay).toBe('night');
    });

    it('should greet "Доброй ночи" at early morning (0-5)', async () => {
      const mockDate = class extends Date {
        getHours() { return 2; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new SmartTipsCommand();
      const result = await freshCommand.execute(mockContext);

      expect(result.message).toContain('Доброй ночи');
      expect(result.metadata?.timeOfDay).toBe('night');
    });
  });

  // ==========================================================================
  // EMOTIONAL STATE PARSING
  // ==========================================================================
  describe('Emotional State Parsing', () => {
    it('should parse Russian "тревога" as anxiety', async () => {
      const result = await command.execute(mockContext, 'тревога');

      expect(result.metadata?.emotion).toBe('anxiety');
    });

    it('should parse Russian "стресс" as stress', async () => {
      const result = await command.execute(mockContext, 'стресс');

      expect(result.metadata?.emotion).toBe('stress');
    });

    it('should parse Russian "грусть" as sadness', async () => {
      const result = await command.execute(mockContext, 'грусть');

      expect(result.metadata?.emotion).toBe('sadness');
    });

    it('should parse Russian "бессонница" as insomnia', async () => {
      const result = await command.execute(mockContext, 'бессонница');

      expect(result.metadata?.emotion).toBe('insomnia');
    });

    it('should parse Russian "паника" as panic', async () => {
      const result = await command.execute(mockContext, 'паника');

      expect(result.metadata?.emotion).toBe('panic');
    });

    it('should parse Russian "кризис" as crisis', async () => {
      const result = await command.execute(mockContext, 'кризис');

      expect(result.metadata?.emotion).toBe('crisis');
    });

    it('should parse English "anxiety"', async () => {
      const result = await command.execute(mockContext, 'anxiety');

      expect(result.metadata?.emotion).toBe('anxiety');
    });

    it('should parse English "stress"', async () => {
      const result = await command.execute(mockContext, 'stress');

      expect(result.metadata?.emotion).toBe('stress');
    });

    it('should be case-insensitive', async () => {
      const result = await command.execute(mockContext, 'ТРЕВОГА');

      expect(result.metadata?.emotion).toBe('anxiety');
    });
  });

  // ==========================================================================
  // CONTEXT-AWARE TIPS
  // ==========================================================================
  describe('Context-Aware Tips', () => {
    it('should show SOS tip for crisis emotion', async () => {
      const result = await command.execute(mockContext, 'кризис');

      expect(result.message).toContain('/sos');
      expect(result.message).toContain('экстренной помощи');
    });

    it('should show SOS tip for panic emotion', async () => {
      const result = await command.execute(mockContext, 'паника');

      expect(result.message).toContain('/sos');
    });

    it('should show breathing tip for anxiety', async () => {
      const result = await command.execute(mockContext, 'тревога');

      expect(result.message).toContain('дыхания');
    });

    it('should show breathing tip for stress', async () => {
      const result = await command.execute(mockContext, 'стресс');

      expect(result.message).toContain('дыхания');
    });
  });

  // ==========================================================================
  // SPECIFIC CONTENT REQUEST
  // ==========================================================================
  describe('Specific Content Request', () => {
    it('should show specific content when requested by ID', async () => {
      const result = await command.execute(mockContext, 'breathing_478');

      expect(mockContentService.getContent).toHaveBeenCalledWith('breathing_478');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Отличный выбор');
    });

    it('should format content with steps if available', async () => {
      await command.execute(mockContext, 'breathing_478');

      expect(mockContentService.formatStepsForTelegram).toHaveBeenCalledWith(mockContentItem);
    });

    it('should format content without steps for simple content', async () => {
      mockContentService.getContent.mockResolvedValue({
        ...mockContentItem,
        steps: [],
      });

      await command.execute(mockContext, 'simple_content');

      expect(mockContentService.formatForTelegram).toHaveBeenCalled();
    });

    it('should have timer button for content', async () => {
      const result = await command.execute(mockContext, 'breathing_478');

      const buttons = result.keyboard?.flat() ?? [];
      const timerButton = buttons.find(b => b.callbackData?.includes('tips:timer:'));

      expect(timerButton).toBeDefined();
      expect(timerButton?.text).toContain('Запустить таймер');
    });

    it('should have done button for content', async () => {
      const result = await command.execute(mockContext, 'breathing_478');

      const buttons = result.keyboard?.flat() ?? [];
      const doneButton = buttons.find(b => b.callbackData?.includes('tips:done:'));

      expect(doneButton).toBeDefined();
      expect(doneButton?.text).toContain('Выполнено');
    });

    it('should have back button for content', async () => {
      const result = await command.execute(mockContext, 'breathing_478');

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'tips:menu');

      expect(backButton).toBeDefined();
      expect(backButton?.text).toContain('К рекомендациям');
    });

    it('should include content metadata', async () => {
      const result = await command.execute(mockContext, 'breathing_478');

      expect(result.metadata?.contentId).toBe('breathing_478');
      expect(result.metadata?.category).toBe('relaxation');
      expect(result.metadata?.xpReward).toBe(20);
    });
  });

  // ==========================================================================
  // NO RECOMMENDATIONS FALLBACK
  // ==========================================================================
  describe('No Recommendations Fallback', () => {
    beforeEach(() => {
      mockContentService.getRecommendations.mockResolvedValue([]);
    });

    it('should show fallback message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Пока у меня нет персональных рекомендаций');
    });

    it('should suggest alternative commands', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/relax');
      expect(result.message).toContain('/mindful');
    });

    it('should have navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const relaxButton = buttons.find(b => b.callbackData === 'relax:menu');
      const mindfulButton = buttons.find(b => b.callbackData === 'mindful:menu');

      expect(relaxButton).toBeDefined();
      expect(mindfulButton).toBeDefined();
    });

    it('should include engagement tip', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Чем больше ты взаимодействуешь');
    });
  });

  // ==========================================================================
  // AGE GROUP DETECTION
  // ==========================================================================
  describe('Age Group Detection', () => {
    it('should get age group from session', async () => {
      mockGetSession.mockReturnValue({ ageGroup: 'teen' });

      await command.execute(mockContext);

      expect(mockContentService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ ageGroup: 'teen' }),
        5
      );
    });

    it('should default to adult if session unavailable', async () => {
      mockGetSession.mockImplementation(() => {
        throw new Error('Session not found');
      });

      await command.execute(mockContext);

      expect(mockContentService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ ageGroup: 'adult' }),
        5
      );
    });

    it('should default to adult if ageGroup not in session', async () => {
      mockGetSession.mockReturnValue({ userId: '12345' });

      await command.execute(mockContext);

      expect(mockContentService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ ageGroup: 'adult' }),
        5
      );
    });
  });

  // ==========================================================================
  // CALLBACK: MENU
  // ==========================================================================
  describe('Callback: Menu', () => {
    it('should return to recommendations menu', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:menu',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Персональные рекомендации');
    });

    it('should show no recommendations fallback from menu', async () => {
      mockContentService.getRecommendations.mockResolvedValue([]);

      const result = await command.handleCallback(
        mockContext,
        'tips:menu',
        {}
      );

      expect(result.message).toContain('Пока у меня нет персональных рекомендаций');
    });
  });

  // ==========================================================================
  // CALLBACK: SHOW CONTENT
  // ==========================================================================
  describe('Callback: Show Content', () => {
    it('should show content by ID', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:show:breathing_478',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockContentService.getContent).toHaveBeenCalledWith('breathing_478');
    });

    it('should return error for missing content', async () => {
      mockContentService.getContent.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'tips:show:unknown_id',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // CALLBACK: FILTER
  // ==========================================================================
  describe('Callback: Filter', () => {
    const mockQuickContent = [
      { id: 'quick1', title: 'Быстрое дыхание', icon: '🌬️', durationMinutes: 3 },
      { id: 'quick2', title: 'Мини-медитация', icon: '🧘', durationMinutes: 5 },
    ];

    const mockSleepContent = [
      { id: 'sleep1', title: 'Аудио для сна', icon: '😴', durationMinutes: 10 },
      { id: 'sleep2', title: 'Расслабление перед сном', icon: '🌙', durationMinutes: 15 },
    ];

    beforeEach(() => {
      mockContentService.getQuickRelief.mockResolvedValue(mockQuickContent);
      mockContentService.getSleepContent.mockResolvedValue(mockSleepContent);
    });

    it('should filter quick content', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:quick',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Быстрые техники');
      expect(result.message).toContain('до 5 минут');
    });

    it('should show quick content items', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:quick',
        {}
      );

      expect(result.message).toContain('Быстрое дыхание');
      expect(result.message).toContain('Мини-медитация');
    });

    it('should filter sleep content', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:sleep',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Техники для сна');
    });

    it('should show sleep content items', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:sleep',
        {}
      );

      expect(result.message).toContain('Аудио для сна');
      expect(result.message).toContain('Расслабление перед сном');
    });

    it('should have content buttons in filter result', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:quick',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const contentButton = buttons.find(b => b.callbackData?.includes('tips:show:quick1'));

      expect(contentButton).toBeDefined();
    });

    it('should have back button in filter result', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:quick',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'tips:menu');

      expect(backButton).toBeDefined();
    });

    it('should handle empty filter result', async () => {
      mockContentService.getQuickRelief.mockResolvedValue([]);

      const result = await command.handleCallback(
        mockContext,
        'tips:filter:quick',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Нет контента');
    });

    it('should return error for unknown filter', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:filter:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестный фильтр');
    });
  });

  // ==========================================================================
  // CALLBACK: COMPLETION
  // ==========================================================================
  describe('Callback: Completion', () => {
    it('should record completion', async () => {
      await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      expect(mockContentService.recordCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'breathing_478',
          userId: 12345,
        })
      );
    });

    it('should show success message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практика завершена');
    });

    it('should show XP earned', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      expect(result.message).toContain('+20 XP');
    });

    it('should include XP in metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      expect(result.metadata?.xpEarned).toBe(20);
      expect(result.metadata?.contentId).toBe('breathing_478');
    });

    it('should have more recommendations button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const moreButton = buttons.find(b => b.callbackData === 'tips:menu');

      expect(moreButton).toBeDefined();
      expect(moreButton?.text).toContain('Ещё рекомендации');
    });

    it('should use default XP if content not found', async () => {
      mockContentService.getContent.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'tips:done:unknown',
        {}
      );

      expect(result.message).toContain('+15 XP');
      expect(result.metadata?.xpEarned).toBe(15);
    });

    it('should include motivation message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:done:breathing_478',
        {}
      );

      expect(result.message).toContain('Каждая практика приближает тебя к цели');
    });
  });

  // ==========================================================================
  // CALLBACK: TIMER
  // ==========================================================================
  describe('Callback: Timer', () => {
    it('should start timer with specified duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:5',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Таймер запущен: 5 минут');
    });

    it('should show content info during timer', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:5',
        {}
      );

      expect(result.message).toContain('🌬️');
      expect(result.message).toContain('Дыхание 4-7-8');
    });

    it('should have early finish button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:5',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const finishButton = buttons.find(b => b.callbackData === 'tips:done:breathing_478');

      expect(finishButton).toBeDefined();
      expect(finishButton?.text).toContain('Завершить раньше');
    });

    it('should have cancel button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:5',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const cancelButton = buttons.find(b => b.callbackData === 'tips:menu');

      expect(cancelButton).toBeDefined();
      expect(cancelButton?.text).toContain('Отменить');
    });

    it('should include timer metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:10',
        {}
      );

      expect(result.metadata?.timer).toBe(10);
      expect(result.metadata?.contentId).toBe('breathing_478');
    });

    it('should default to 5 minutes if duration invalid', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:timer:breathing_478:invalid',
        {}
      );

      expect(result.message).toContain('Таймер запущен: 5 минут');
      expect(result.metadata?.timer).toBe(5);
    });

    it('should handle missing content gracefully', async () => {
      mockContentService.getContent.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'tips:timer:unknown:5',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практика');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should return error for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'tips:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное действие');
    });

    it('should handle content service error gracefully', async () => {
      mockContentService.getRecommendations.mockRejectedValue(new Error('Service error'));

      await expect(command.execute(mockContext)).rejects.toThrow('Service error');
    });
  });

  // ==========================================================================
  // TITLE SHORTENING
  // ==========================================================================
  describe('Title Shortening for Buttons', () => {
    it('should not shorten titles under 12 characters', async () => {
      mockContentService.getRecommendations.mockResolvedValue([{
        content: {
          id: 'short',
          title: 'Короткое',
          icon: '🌬️',
          durationMinutes: 5,
        },
        reason: 'Test',
        score: 0.9,
      }]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const button = buttons.find(b => b.callbackData === 'tips:show:short');

      expect(button?.text).toContain('Короткое');
      expect(button?.text).not.toContain('...');
    });

    it('should shorten long titles with ellipsis', async () => {
      mockContentService.getRecommendations.mockResolvedValue([{
        content: {
          id: 'long',
          title: 'Очень длинное название для кнопки',
          icon: '🌬️',
          durationMinutes: 5,
        },
        reason: 'Test',
        score: 0.9,
      }]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const button = buttons.find(b => b.callbackData === 'tips:show:long');

      expect(button?.text).toContain('...');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(smartTipsCommand).toBeInstanceOf(SmartTipsCommand);
    });

    it('should have correct name', () => {
      expect(smartTipsCommand.name).toBe('smart_tips');
    });
  });
});
