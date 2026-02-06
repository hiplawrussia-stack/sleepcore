/**
 * RelaxCommand Tests
 * ==================
 *
 * IEC 62304 Class B - Therapeutic content delivery
 * European Insomnia Guideline 2023 compliance
 *
 * Tests verify:
 * - Relaxation technique menu display
 * - Content Library integration
 * - RelaxationEngine protocol integration
 * - Timer functionality
 * - Completion tracking with XP
 * - Personalized recommendations (JITAI)
 *
 * Research basis: Furukawa 2024 JAMA - Relaxation effective
 * as adjunct to SRT/SCT, not standalone
 *
 * @packageDocumentation
 */

import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock Content Service - use hoisted mocks
const mockContentServiceMethods = {
  getContent: jest.fn(),
  getRelaxationContent: jest.fn(),
  formatForTelegram: jest.fn(),
  formatStepsForTelegram: jest.fn(),
  recordCompletion: jest.fn(),
};

jest.mock('../../../modules/content', () => ({
  getContentService: () => mockContentServiceMethods,
  AgeGroup: {
    CHILD: 'child',
    TEEN: 'teen',
    ADULT: 'adult',
    SENIOR: 'senior',
  },
}));

// Import after mocks are set up
import { RelaxCommand, relaxCommand } from '../RelaxCommand';

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
    tip: (text: string) => `💡 ${text}`,
  },
}));

describe('RelaxCommand', () => {
  let command: RelaxCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetRelaxationRecommendation: jest.Mock;
  let mockGetRelaxationProtocol: jest.Mock;
  let mockGetRelaxationTechniqueInstructions: jest.Mock;

  // Sample content items
  const sampleContent = [
    {
      id: 'pmr-progressive',
      title: 'Прогрессивная мышечная релаксация',
      icon: '💪',
      durationMinutes: 15,
      category: 'relaxation',
      steps: ['Напрягите мышцы', 'Расслабьте мышцы'],
      reward: { xp: 20 },
    },
    {
      id: 'breathing-478',
      title: 'Дыхание 4-7-8',
      icon: '🌬️',
      durationMinutes: 5,
      category: 'relaxation',
      steps: ['Вдох 4 сек', 'Задержка 7 сек', 'Выдох 8 сек'],
      reward: { xp: 15 },
    },
    {
      id: 'autogenic-training',
      title: 'Аутогенная тренировка',
      icon: '🧘',
      durationMinutes: 20,
      category: 'relaxation',
      steps: ['Тяжесть', 'Тепло', 'Сердце'],
      reward: { xp: 25 },
    },
    {
      id: 'visualization-beach',
      title: 'Визуализация',
      icon: '🏖️',
      durationMinutes: 10,
      category: 'relaxation',
      steps: [],
      reward: { xp: 15 },
    },
    {
      id: 'body-scan',
      title: 'Сканирование тела',
      icon: '🔍',
      durationMinutes: 12,
      category: 'relaxation',
      steps: ['Голова', 'Шея', 'Плечи'],
      reward: { xp: 18 },
    },
    {
      id: 'mindfulness-basic',
      title: 'Осознанность',
      icon: '🧠',
      durationMinutes: 8,
      category: 'relaxation',
      steps: [],
      reward: { xp: 15 },
    },
  ];

  beforeEach(() => {
    command = new RelaxCommand();

    // Reset mocks
    mockGetSession = jest.fn().mockReturnValue({});
    mockGetRelaxationRecommendation = jest.fn();
    mockGetRelaxationProtocol = jest.fn();
    mockGetRelaxationTechniqueInstructions = jest.fn();

    mockContext = {
      userId: '12345', // Numeric string for parseInt compatibility
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getRelaxationRecommendation: mockGetRelaxationRecommendation,
        getRelaxationProtocol: mockGetRelaxationProtocol,
        getRelaxationTechniqueInstructions: mockGetRelaxationTechniqueInstructions,
      },
    } as unknown as ISleepCoreContext;

    // Default content mock
    mockContentServiceMethods.getRelaxationContent.mockResolvedValue(sampleContent);
    mockContentServiceMethods.getContent.mockImplementation((id: string) =>
      Promise.resolve(sampleContent.find(c => c.id === id))
    );
    mockContentServiceMethods.formatForTelegram.mockImplementation((content) =>
      `${content.icon} ${content.title}\n${content.steps?.join('\n') || ''}`
    );
    mockContentServiceMethods.formatStepsForTelegram.mockImplementation((content) =>
      content.steps?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || ''
    );
    mockContentServiceMethods.recordCompletion.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('relax');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Техники релаксации');
    });

    it('should have relaxation-related aliases', () => {
      expect(command.aliases).toContain('relaxation');
      expect(command.aliases).toContain('calm');
      expect(command.aliases).toContain('расслабление');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all steps defined', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('show');
      expect(command.steps).toContain('more');
      expect(command.steps).toContain('done');
      expect(command.steps).toContain('timer');
    });
  });

  // ==========================================================================
  // MENU DISPLAY
  // ==========================================================================
  describe('Menu Display', () => {
    it('should show relaxation menu on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Техники релаксации');
    });

    it('should list available techniques', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Прогрессивная мышечная релаксация');
      expect(result.message).toContain('Дыхание 4-7-8');
      expect(result.message).toContain('Аутогенная тренировка');
    });

    it('should show duration for each technique', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('15 мин');
      expect(result.message).toContain('5 мин');
    });

    it('should include Sonya persona', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Соня');
      expect(result.message).toContain('🦉');
    });

    it('should include clinical warning about standalone use', async () => {
      const result = await command.execute(mockContext);

      // Furukawa 2024 JAMA citation
      expect(result.message).toContain('Furukawa 2024');
      expect(result.message).toContain('SRT/SCT');
    });

    it('should have keyboard buttons for techniques', async () => {
      const result = await command.execute(mockContext);

      expect(result.keyboard).toBeDefined();
      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should limit initial display to 5 techniques', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const showButtons = buttons.filter(b => b.callbackData?.includes('relax:show:'));
      expect(showButtons.length).toBeLessThanOrEqual(6); // 5 + maybe recommended
    });

    it('should show "More" button when content exceeds 5', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const moreButton = buttons.find(b => b.callbackData === 'relax:more');
      expect(moreButton).toBeDefined();
      expect(moreButton?.text).toContain('Больше техник');
    });
  });

  // ==========================================================================
  // PERSONALIZED RECOMMENDATIONS
  // ==========================================================================
  describe('Personalized Recommendations', () => {
    it('should show recommendation when available', async () => {
      mockGetRelaxationRecommendation.mockReturnValue({
        technique: 'progressive_muscle_relaxation',
        rationale: 'Подходит для вас',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Персональная рекомендация');
      expect(result.message).toContain('Прогрессивная мышечная релаксация');
    });

    it('should mark recommended technique with star', async () => {
      // Use 'pmr' which maps to 'pmr-progressive' in mapTechniqueToContentId
      mockGetRelaxationRecommendation.mockReturnValue({
        technique: 'pmr',
      });

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const starButton = buttons.find(b => b.text.includes('⭐'));
      expect(starButton).toBeDefined();
    });

    it('should handle missing recommendation gracefully', async () => {
      mockGetRelaxationRecommendation.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Персональная рекомендация');
    });

    it('should handle recommendation error gracefully', async () => {
      mockGetRelaxationRecommendation.mockImplementation(() => {
        throw new Error('No session');
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should still show menu without recommendation
      expect(result.message).toContain('Техники релаксации');
    });
  });

  // ==========================================================================
  // SHOW SPECIFIC TECHNIQUE
  // ==========================================================================
  describe('Show Specific Technique', () => {
    it('should show technique by ID from args', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Начинаем практику');
    });

    it('should use formatted content from ContentService', async () => {
      await command.execute(mockContext, 'breathing-478');

      expect(mockContentServiceMethods.formatStepsForTelegram).toHaveBeenCalled();
    });

    it('should include timer button', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      const buttons = result.keyboard?.flat() ?? [];
      const timerButton = buttons.find(b => b.callbackData?.includes('relax:timer:'));
      expect(timerButton).toBeDefined();
      expect(timerButton?.text).toContain('Запустить таймер');
    });

    it('should include completion button', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      const buttons = result.keyboard?.flat() ?? [];
      const doneButton = buttons.find(b => b.callbackData?.includes('relax:done:'));
      expect(doneButton).toBeDefined();
      expect(doneButton?.text).toContain('Выполнено');
    });

    it('should include back to menu button', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'relax:menu');
      expect(backButton).toBeDefined();
    });

    it('should include clinical warning on technique view', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      expect(result.message).toContain('Furukawa 2024');
    });

    it('should return menu if technique not found', async () => {
      mockContentServiceMethods.getContent.mockResolvedValue(null);

      const result = await command.execute(mockContext, 'unknown-technique');

      // Falls through to menu when content not found
      expect(result.success).toBe(true);
    });

    it('should include metadata with content info', async () => {
      const result = await command.execute(mockContext, 'pmr-progressive');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.contentId).toBe('pmr-progressive');
      expect(result.metadata?.xpReward).toBe(20);
    });
  });

  // ==========================================================================
  // DETAILED PROTOCOL (RelaxationEngine)
  // ==========================================================================
  describe('Detailed Protocol', () => {
    beforeEach(() => {
      mockGetRelaxationProtocol.mockReturnValue({
        totalDuration: 15,
        techniques: ['pmr'],
      });
      mockGetRelaxationTechniqueInstructions.mockReturnValue([
        'Закройте глаза',
        'Напрягите мышцы рук на 5 секунд',
        'Расслабьте и почувствуйте разницу',
        'Повторите для каждой группы мышц',
      ]);
    });

    it('should show detailed protocol from engine', async () => {
      const result = await command.execute(
        mockContext,
        'protocol:progressive_muscle_relaxation'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Протокол');
    });

    it('should include step-by-step instructions', async () => {
      const result = await command.execute(
        mockContext,
        'protocol:progressive_muscle_relaxation'
      );

      expect(result.message).toContain('Пошаговая инструкция');
      expect(result.message).toContain('Закройте глаза');
    });

    it('should show user level', async () => {
      mockGetSession.mockReturnValue({ relaxationLevel: 'intermediate' });

      const result = await command.execute(
        mockContext,
        'protocol:progressive_muscle_relaxation'
      );

      expect(result.message).toContain('Средний');
    });

    it('should show duration from protocol', async () => {
      const result = await command.execute(
        mockContext,
        'protocol:progressive_muscle_relaxation'
      );

      expect(result.message).toContain('15 минут');
    });

    it('should have timer and done buttons', async () => {
      const result = await command.execute(
        mockContext,
        'protocol:progressive_muscle_relaxation'
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.text.includes('Запустить практику'))).toBeDefined();
      expect(buttons.find(b => b.text.includes('Выполнено'))).toBeDefined();
    });

    it('should handle missing protocol', async () => {
      mockGetRelaxationProtocol.mockReturnValue(null);

      const result = await command.execute(
        mockContext,
        'protocol:unknown_technique'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Протокол не найден');
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    it('should handle menu callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:menu',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Техники релаксации');
    });

    it('should handle show callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:show:pmr-progressive',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Начинаем практику');
    });

    it('should handle show callback for non-existent content', async () => {
      mockContentServiceMethods.getContent.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'relax:show:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Техника не найдена');
    });

    it('should handle more callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:more',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все техники');
    });

    it('should handle done callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:done:pmr-progressive',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практика завершена');
    });

    it('should handle timer callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:15',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Таймер запущен');
      expect(result.message).toContain('15 минут');
    });

    it('should handle protocol callback', async () => {
      mockGetRelaxationProtocol.mockReturnValue({ totalDuration: 15 });
      mockGetRelaxationTechniqueInstructions.mockReturnValue(['Шаг 1', 'Шаг 2']);

      const result = await command.handleCallback(
        mockContext,
        'relax:protocol:pmr',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Протокол');
    });

    it('should handle unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное действие');
    });
  });

  // ==========================================================================
  // COMPLETION TRACKING
  // ==========================================================================
  describe('Completion Tracking', () => {
    it('should record completion with ContentService', async () => {
      await command.handleCallback(
        mockContext,
        'relax:done:pmr-progressive',
        {}
      );

      expect(mockContentServiceMethods.recordCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'pmr-progressive',
          userId: 12345, // parseInt(ctx.userId)
          xpEarned: 20,
        })
      );
    });

    it('should show XP reward on completion', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:done:pmr-progressive',
        {}
      );

      expect(result.message).toContain('+20 XP');
    });

    it('should include motivational message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:done:pmr-progressive',
        {}
      );

      expect(result.message).toContain('Регулярная практика');
    });

    it('should offer to try another technique', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:done:pmr-progressive',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const anotherButton = buttons.find(b => b.callbackData === 'relax:menu');
      expect(anotherButton).toBeDefined();
      expect(anotherButton?.text).toContain('Другая техника');
    });

    it('should use default XP when content not found', async () => {
      mockContentServiceMethods.getContent.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'relax:done:unknown-content',
        {}
      );

      expect(result.message).toContain('+15 XP'); // Default XP
    });
  });

  // ==========================================================================
  // TIMER FUNCTIONALITY
  // ==========================================================================
  describe('Timer Functionality', () => {
    it('should start timer with correct duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:20',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('20 минут');
    });

    it('should use default duration if not provided', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('5 минут'); // Default
    });

    it('should include early finish button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:15',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const finishButton = buttons.find(b => b.text.includes('Завершить раньше'));
      expect(finishButton).toBeDefined();
    });

    it('should include cancel button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:15',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const cancelButton = buttons.find(b => b.text.includes('Отменить'));
      expect(cancelButton).toBeDefined();
    });

    it('should show content title in timer', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:15',
        {}
      );

      expect(result.message).toContain('Прогрессивная мышечная релаксация');
    });

    it('should include timer metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:timer:pmr-progressive:15',
        {}
      );

      expect(result.metadata?.timer).toBe(15);
      expect(result.metadata?.contentId).toBe('pmr-progressive');
    });
  });

  // ==========================================================================
  // MORE CONTENT VIEW
  // ==========================================================================
  describe('More Content View', () => {
    it('should show all techniques', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:more',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все техники релаксации');
    });

    it('should list all 6 sample techniques', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:more',
        {}
      );

      expect(result.message).toContain('Прогрессивная мышечная релаксация');
      expect(result.message).toContain('Дыхание 4-7-8');
      expect(result.message).toContain('Осознанность');
    });

    it('should have buttons for all techniques', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:more',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const showButtons = buttons.filter(b => b.callbackData?.includes('relax:show:'));
      expect(showButtons.length).toBe(6);
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'relax:more',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'relax:menu');
      expect(backButton).toBeDefined();
    });
  });

  // ==========================================================================
  // AGE GROUP HANDLING
  // ==========================================================================
  describe('Age Group Handling', () => {
    it('should use default adult age group', async () => {
      await command.execute(mockContext);

      expect(mockContentServiceMethods.getRelaxationContent).toHaveBeenCalledWith('adult');
    });

    it('should use age group from session', async () => {
      mockGetSession.mockReturnValue({ ageGroup: 'senior' });

      await command.execute(mockContext);

      expect(mockContentServiceMethods.getRelaxationContent).toHaveBeenCalledWith('senior');
    });

    it('should handle missing session gracefully', async () => {
      mockGetSession.mockImplementation(() => {
        throw new Error('No session');
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockContentServiceMethods.getRelaxationContent).toHaveBeenCalledWith('adult');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(relaxCommand).toBeInstanceOf(RelaxCommand);
    });

    it('should have correct name', () => {
      expect(relaxCommand.name).toBe('relax');
    });
  });
});
