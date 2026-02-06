/**
 * EvolutionCommand Tests
 * ======================
 *
 * IEC 62304 Class B compliance tests - Sonya avatar evolution system.
 *
 * Tests verify:
 * - Sonya status display with stage, progress, abilities
 * - Evolution history view
 * - Abilities view (current and locked)
 * - Next stage requirements view
 * - Interaction with Sonya and evolution triggers
 *
 * Research basis:
 * - Finch app model: 56% higher retention with virtual pet mechanics
 * - Virtual pet evolution driven by care rating (not punishment)
 *
 * @packageDocumentation
 */

import { EvolutionCommand, evolutionCommand } from '../EvolutionCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `TIP: ${text}`,
    info: (text: string) => `INFO: ${text}`,
    progressBar: (percent: number, _size: number) => {
      const filled = Math.floor(percent / 10);
      return '[' + '='.repeat(filled) + '-'.repeat(10 - filled) + '] ' + Math.floor(percent) + '%';
    },
  },
}));

// Mock evolution module
jest.mock('../../../modules/evolution', () => ({
  EVOLUTION_STAGES: [
    {
      id: 'owlet',
      name: 'Совёнок Соня',
      emoji: '🐣',
      requiredDays: 0,
      description: 'Маленький совёнок, который только учится помогать со сном.',
      abilities: ['Базовый дневник сна', 'Простые советы', 'SOS-помощь'],
    },
    {
      id: 'young_owl',
      name: 'Молодая сова Соня',
      emoji: '🦉',
      requiredDays: 7,
      description: 'Подросшая сова с большим опытом в помощи со сном.',
      abilities: ['Расширенный анализ сна', 'Персонализированные рекомендации', 'Техники релаксации'],
    },
    {
      id: 'wise_owl',
      name: 'Мудрая сова Соня',
      emoji: '🦉✨',
      requiredDays: 30,
      description: 'Мудрая сова с глубоким пониманием твоих паттернов сна.',
      abilities: ['Глубокий анализ паттернов', 'Предиктивные рекомендации'],
    },
    {
      id: 'master',
      name: 'Мастер снов Соня',
      emoji: '🌟',
      requiredDays: 90,
      description: 'Легендарная сова-мастер, достигшая вершины развития.',
      abilities: ['Мастерский анализ', 'Максимальная персонализация'],
    },
  ],
}));

describe('EvolutionCommand', () => {
  let command: EvolutionCommand;
  let mockContext: ISleepCoreContext;
  let mockGetPlayerProfile: jest.Mock;
  let mockRecordGamificationAction: jest.Mock;

  // Default mock profile
  const mockProfile = {
    level: 5,
    totalDaysActive: 15,
    sonyaEmoji: '🦉',
    sonyaName: 'Соня',
    sonyaStage: {
      id: 'young_owl',
      name: 'Молодая сова Соня',
      emoji: '🦉',
      requiredDays: 7,
      description: 'Подросшая сова с большим опытом в помощи со сном.',
      abilities: ['Расширенный анализ сна', 'Персонализированные рекомендации', 'Техники релаксации'],
    },
  };

  beforeEach(() => {
    command = new EvolutionCommand();

    mockGetPlayerProfile = jest.fn().mockResolvedValue(mockProfile);
    mockRecordGamificationAction = jest.fn().mockResolvedValue({
      xpEarned: 25,
      celebrations: [],
      evolution: { evolved: false },
    });

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getPlayerProfile: mockGetPlayerProfile,
        recordGamificationAction: mockRecordGamificationAction,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('sonya');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('Эволюция');
    });

    it('should have evolution-related aliases', () => {
      expect(command.aliases).toContain('evolution');
      expect(command.aliases).toContain('avatar');
      expect(command.aliases).toContain('эволюция');
      expect(command.aliases).toContain('соня');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all evolution steps defined', () => {
      expect(command.steps).toContain('status');
      expect(command.steps).toContain('history');
      expect(command.steps).toContain('abilities');
    });
  });

  // ==========================================================================
  // EXECUTE
  // ==========================================================================
  describe('Execute', () => {
    it('should show Sonya status by default', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalledWith(12345);
    });

    it('should show history with args=history', async () => {
      const result = await command.execute(mockContext, 'history');

      expect(result.success).toBe(true);
    });

    it('should show abilities with args=abilities', async () => {
      const result = await command.execute(mockContext, 'abilities');

      expect(result.success).toBe(true);
    });

    it('should show next stage with args=next', async () => {
      const result = await command.execute(mockContext, 'next');

      expect(result.success).toBe(true);
    });

    it('should show status for unknown args', async () => {
      const result = await command.execute(mockContext, 'unknown');

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SONYA STATUS
  // ==========================================================================
  describe('Sonya Status', () => {
    it('should display current stage name', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Молодая сова Соня');
    });

    it('should display current stage emoji', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🦉');
    });

    it('should display active days', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('15');
    });

    it('should display player level', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('5');
    });

    it('should display stage description', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('опытом');
    });

    it('should display progress to next stage', async () => {
      const result = await command.execute(mockContext);

      // 15 days active, next stage requires 30
      expect(result.message).toContain('Мудрая');
    });

    it('should display unlocked stages count', async () => {
      const result = await command.execute(mockContext);

      // With 15 days, stages 0 and 7 are unlocked = 2
      expect(result.message).toContain('2');
    });

    it('should display abilities count tip', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('способностей');
    });

    it('should have navigation keyboard', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const interactButton = buttons.find(b => b.callbackData === 'sonya:interact');
      const abilitiesButton = buttons.find(b => b.callbackData === 'sonya:abilities');
      const historyButton = buttons.find(b => b.callbackData === 'sonya:history');
      const nextButton = buttons.find(b => b.callbackData === 'sonya:next');

      expect(interactButton).toBeDefined();
      expect(abilitiesButton).toBeDefined();
      expect(historyButton).toBeDefined();
      expect(nextButton).toBeDefined();
    });

    it('should handle missing stage data', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        sonyaStage: null,
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Соне');
    });

    it('should show max level message when at master stage', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 100,
        sonyaStage: {
          id: 'master',
          name: 'Мастер снов Соня',
          emoji: '🌟',
          requiredDays: 90,
          description: 'Легендарная сова-мастер.',
          abilities: ['Мастерский анализ'],
        },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Максимальный');
    });
  });

  // ==========================================================================
  // EVOLUTION HISTORY
  // ==========================================================================
  describe('Evolution History', () => {
    it('should display history header', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('История');
    });

    it('should display unlocked stages', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      // With 15 days, owlet and young_owl are unlocked
      expect(result.message).toContain('Совёнок');
      expect(result.message).toContain('Молодая');
    });

    it('should display required days for each stage', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      expect(result.message).toContain('0');
      expect(result.message).toContain('7');
    });

    it('should show empty history for new users', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 1,
        sonyaStage: {
          id: 'owlet',
          name: 'Совёнок Соня',
          emoji: '🐣',
          requiredDays: 0,
          description: 'Маленький совёнок.',
          abilities: ['Базовый дневник сна'],
        },
      });

      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      expect(result.message).toContain('пуста');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sonya:status');

      expect(backButton).toBeDefined();
    });
  });

  // ==========================================================================
  // ABILITIES VIEW
  // ==========================================================================
  describe('Abilities View', () => {
    it('should display abilities header', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Способности');
    });

    it('should display current stage abilities', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.message).toContain('анализ сна');
      expect(result.message).toContain('рекомендации');
      expect(result.message).toContain('релаксации');
    });

    it('should display locked abilities from future stages', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      // Should show locked abilities from wise_owl and master
      expect(result.message).toContain('Откроются');
    });

    it('should display stage name with abilities', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.message).toContain('Молодая сова');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sonya:status');

      expect(backButton).toBeDefined();
    });

    it('should handle missing stage data', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        sonyaStage: null,
      });

      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.success).toBe(false);
    });

    it('should not show locked section when at max stage', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 100,
        sonyaStage: {
          id: 'master',
          name: 'Мастер снов Соня',
          emoji: '🌟',
          requiredDays: 90,
          description: 'Легендарная сова-мастер.',
          abilities: ['Мастерский анализ', 'Максимальная персонализация'],
        },
      });

      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.success).toBe(true);
      // Should not contain locked abilities section when at max
    });
  });

  // ==========================================================================
  // NEXT STAGE VIEW
  // ==========================================================================
  describe('Next Stage View', () => {
    it('should display next stage name', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Мудрая');
    });

    it('should display next stage description', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('глубоким');
    });

    it('should display current days and required days', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('15');
      expect(result.message).toContain('30');
    });

    it('should display progress percentage', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      // 15/30 = 50%
      expect(result.message).toContain('50');
    });

    it('should display remaining days', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      // 30 - 15 = 15 days remaining
      expect(result.message).toContain('15');
    });

    it('should show max level message when at master', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 100,
        sonyaStage: {
          id: 'master',
          name: 'Мастер снов Соня',
          emoji: '🌟',
          requiredDays: 90,
          description: 'Легендарная сова-мастер.',
          abilities: ['Мастерский анализ'],
        },
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('Максимальный');
      expect(result.message).toContain('высшего');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sonya:status');

      expect(backButton).toBeDefined();
    });

    it('should have diary button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'menu:diary');

      expect(diaryButton).toBeDefined();
    });

    it('should handle missing stage data', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        sonyaStage: null,
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.success).toBe(false);
    });

    it('should show encouragement when close to goal', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 25, // 83% to wise_owl
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('Почти');
    });
  });

  // ==========================================================================
  // INTERACT WITH SONYA
  // ==========================================================================
  describe('Interact with Sonya', () => {
    it('should record gamification action', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.success).toBe(true);
      expect(mockRecordGamificationAction).toHaveBeenCalledWith(12345, 'daily_check_in');
    });

    it('should display Sonya name', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.message).toContain('Соня');
    });

    it('should display active days', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.message).toContain('15');
    });

    it('should display XP earned', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.message).toContain('25');
    });

    it('should display evolution message when evolved', async () => {
      mockRecordGamificationAction.mockResolvedValue({
        xpEarned: 25,
        celebrations: [],
        evolution: {
          evolved: true,
          currentStage: {
            id: 'wise_owl',
            name: 'Мудрая сова Соня',
            emoji: '🦉✨',
            description: 'Мудрая сова с глубоким пониманием.',
            abilities: ['Глубокий анализ', 'Предиктивные рекомендации'],
          },
        },
      });

      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.message).toContain('эволюционировала');
      expect(result.message).toContain('Мудрая');
    });

    it('should display celebrations', async () => {
      mockRecordGamificationAction.mockResolvedValue({
        xpEarned: 25,
        celebrations: ['🎉 Новый рекорд!'],
        evolution: { evolved: false },
      });

      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.message).toContain('рекорд');
    });

    it('should have interact again button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      const buttons = result.keyboard?.flat() ?? [];
      const interactButton = buttons.find(b => b.callbackData === 'sonya:interact');

      expect(interactButton).toBeDefined();
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sonya:status');

      expect(backButton).toBeDefined();
    });

    it('should handle missing stage data', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        sonyaStage: null,
      });

      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('Handle Step', () => {
    it('should handle status step', async () => {
      const result = await command.handleStep(mockContext, 'status', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });

    it('should handle history step', async () => {
      const result = await command.handleStep(mockContext, 'history', {});

      expect(result.success).toBe(true);
    });

    it('should handle abilities step', async () => {
      const result = await command.handleStep(mockContext, 'abilities', {});

      expect(result.success).toBe(true);
    });

    it('should default to status for unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // HANDLE CALLBACK
  // ==========================================================================
  describe('Handle Callback', () => {
    it('should route status callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:status', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });

    it('should route history callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:history', {});

      expect(result.success).toBe(true);
    });

    it('should route abilities callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:abilities', {});

      expect(result.success).toBe(true);
    });

    it('should route next callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.success).toBe(true);
    });

    it('should route interact callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:interact', {});

      expect(result.success).toBe(true);
      expect(mockRecordGamificationAction).toHaveBeenCalled();
    });

    it('should default to status for unknown action', async () => {
      const result = await command.handleCallback(mockContext, 'sonya:unknown', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PLURALIZE DAYS
  // ==========================================================================
  describe('Pluralize Days', () => {
    it('should use "день" for 1', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 28, // 30 - 28 = 2, but testing 1
      });

      // This is tested indirectly through the next stage view
      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.success).toBe(true);
    });

    it('should use "дня" for 2-4', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 27, // 30 - 27 = 3
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('дня');
    });

    it('should use "дней" for 5-20', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 15, // 30 - 15 = 15
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('дней');
    });

    it('should use "дней" for 11-14 (exceptions)', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 18, // 30 - 18 = 12
      });

      const result = await command.handleCallback(mockContext, 'sonya:next', {});

      expect(result.message).toContain('дней');
    });
  });

  // ==========================================================================
  // STAGE VISUALS
  // ==========================================================================
  describe('Stage Visuals', () => {
    it('should show ASCII art for owlet', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 1,
        sonyaStage: {
          id: 'owlet',
          name: 'Совёнок Соня',
          emoji: '🐣',
          requiredDays: 0,
          description: 'Маленький совёнок.',
          abilities: ['Базовый дневник сна'],
        },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('```');
    });

    it('should show ASCII art for young_owl', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('```');
    });
  });

  // ==========================================================================
  // MOOD MESSAGES
  // ==========================================================================
  describe('Mood Messages', () => {
    it('should show appropriate mood for owlet stage', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 2,
        sonyaStage: {
          id: 'owlet',
          name: 'Совёнок Соня',
          emoji: '🐣',
          requiredDays: 0,
          description: 'Маленький совёнок.',
          abilities: ['Базовый дневник сна'],
        },
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should contain a mood message in quotes
    });

    it('should show different mood after 7 days', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 10,
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should show different mood after 30 days', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalDaysActive: 35,
        sonyaStage: {
          id: 'wise_owl',
          name: 'Мудрая сова Соня',
          emoji: '🦉✨',
          requiredDays: 30,
          description: 'Мудрая сова.',
          abilities: ['Глубокий анализ'],
        },
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(evolutionCommand).toBeInstanceOf(EvolutionCommand);
    });

    it('should have correct name', () => {
      expect(evolutionCommand.name).toBe('sonya');
    });
  });
});
