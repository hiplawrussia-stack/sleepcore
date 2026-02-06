/**
 * HelpCommand Tests
 * =================
 *
 * IEC 62366-1 compliance tests - Safety command discoverability
 * ISO 14971: Undiscoverable safety features = unacceptable risk
 *
 * Tests verify:
 * - All safety commands are in primary disclosure tier
 * - Command categories are properly organized
 * - Quick action buttons are present
 * - Recommended workflow is shown
 *
 * @packageDocumentation
 */

import { HelpCommand, helpCommand } from '../HelpCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
  },
}));

describe('HelpCommand', () => {
  let command: HelpCommand;
  let mockContext: ISleepCoreContext;

  beforeEach(() => {
    command = new HelpCommand();

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {},
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('help');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Справка по командам');
    });

    it('should have help-related aliases', () => {
      expect(command.aliases).toContain('помощь');
      expect(command.aliases).toContain('commands');
      expect(command.aliases).toContain('menu');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // HELP DISPLAY
  // ==========================================================================
  describe('Help Display', () => {
    it('should show help on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should include Sonya persona', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Соня');
    });

    it('should include SleepCore title', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('SleepCore');
      expect(result.message).toContain('Справка');
    });
  });

  // ==========================================================================
  // SAFETY COMMANDS - IEC 62366-1 COMPLIANCE
  // ==========================================================================
  describe('SAFETY: Command Discoverability (IEC 62366-1)', () => {
    it('should show emergency section first', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toBeDefined();
      // Emergency section should appear early in the message
      const sosIndex = result.message!.indexOf('/sos');
      const diaryIndex = result.message!.indexOf('/diary');

      // SOS should appear before diary (emergency before routine)
      expect(sosIndex).toBeLessThan(diaryIndex);
    });

    it('should include /sos command prominently', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/sos');
      expect(result.message).toContain('Экстренная');
    });

    it('should include /safety command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/safety');
      expect(result.message).toContain('безопасности'); // Статус безопасности
    });

    it('should include /aereport command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/aereport');
      expect(result.message).toContain('проблем');
    });

    it('should have emergency section clearly marked', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🚨');
      expect(result.message).toContain('Экстренная помощь');
    });

    it('should have SOS button in keyboard', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const sosButton = buttons.find(b => b.callbackData === 'sos:show');

      expect(sosButton).toBeDefined();
      expect(sosButton?.text).toContain('Экстренная');
    });
  });

  // ==========================================================================
  // MAIN PROGRAM COMMANDS
  // ==========================================================================
  describe('Main Program Commands', () => {
    it('should include /start command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/start');
      expect(result.message).toContain('Начать программу');
    });

    it('should include /diary command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/diary');
      expect(result.message).toContain('дневник');
    });

    it('should include /today command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/today');
      expect(result.message).toContain('Задание');
    });

    it('should include /therapy command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/therapy');
      expect(result.message).toContain('КПТ-И');
    });

    it('should include /progress command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/progress');
      expect(result.message).toContain('прогресс');
    });
  });

  // ==========================================================================
  // TECHNIQUE COMMANDS
  // ==========================================================================
  describe('Technique Commands', () => {
    it('should include /relax command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/relax');
      expect(result.message).toContain('релаксации');
    });

    it('should include /mindful command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/mindful');
      expect(result.message).toContain('осознанности');
    });

    it('should include /rehearsal command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/rehearsal');
      expect(result.message).toContain('репетиция');
    });

    it('should include /recall command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/recall');
      expect(result.message).toContain('тест памяти');
    });
  });

  // ==========================================================================
  // AI COMMANDS
  // ==========================================================================
  describe('AI Commands', () => {
    it('should include /insights command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/insights');
      expect(result.message).toContain('анализ');
    });

    it('should include /predict command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/predict');
      expect(result.message).toContain('Прогноз');
    });

    it('should include /explain command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/explain');
      expect(result.message).toContain('Объяснение');
    });

    it('should include /whatif command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/whatif');
      expect(result.message).toContain('Моделирование');
    });

    it('should include /twin command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/twin');
      expect(result.message).toContain('двойник');
    });

    it('should include /chronotype command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/chronotype');
      expect(result.message).toContain('хронотип');
    });

    it('should include /smart_tips command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/smart_tips');
      expect(result.message).toContain('рекомендации');
    });
  });

  // ==========================================================================
  // GAMIFICATION COMMANDS
  // ==========================================================================
  describe('Gamification Commands', () => {
    it('should include /quest command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/quest');
      expect(result.message).toContain('Квесты');
    });

    it('should include /badges command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/badges');
      expect(result.message).toContain('Бейджи');
    });

    it('should include /profile command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/profile');
      expect(result.message).toContain('Профиль');
    });

    it('should include /sonya command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/sonya');
      expect(result.message).toContain('Эволюция');
    });
  });

  // ==========================================================================
  // RECOMMENDED WORKFLOW
  // ==========================================================================
  describe('Recommended Workflow', () => {
    it('should show recommended order', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Рекомендуемый порядок');
    });

    it('should mention start first', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('1️⃣ /start');
    });

    it('should mention diary second', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('2️⃣ /diary');
    });

    it('should mention today third', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('3️⃣ /today');
    });

    it('should mention progress fourth', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('4️⃣ /progress');
    });

    it('should include tip about diary importance', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('дневник');
      expect(result.message).toContain('КПТ-И');
    });
  });

  // ==========================================================================
  // KEYBOARD BUTTONS
  // ==========================================================================
  describe('Keyboard Buttons', () => {
    it('should have quick action keyboard', async () => {
      const result = await command.execute(mockContext);

      expect(result.keyboard).toBeDefined();
      expect(result.keyboard?.length).toBeGreaterThan(0);
    });

    it('should have Start button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'start:begin');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать');
    });

    it('should have Diary button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(diaryButton).toBeDefined();
      expect(diaryButton?.text).toContain('Дневник');
    });

    it('should have Today button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const todayButton = buttons.find(b => b.callbackData === 'today:show');

      expect(todayButton).toBeDefined();
      expect(todayButton?.text).toContain('Сегодня');
    });

    it('should have Progress button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const progressButton = buttons.find(b => b.callbackData === 'progress:show');

      expect(progressButton).toBeDefined();
      expect(progressButton?.text).toContain('Прогресс');
    });
  });

  // ==========================================================================
  // CATEGORY ORGANIZATION
  // ==========================================================================
  describe('Category Organization', () => {
    it('should have Emergency section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🚨');
      expect(result.message).toContain('Экстренная помощь');
    });

    it('should have Main Program section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('📋');
      expect(result.message).toContain('Основная программа');
    });

    it('should have Techniques section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🧘');
      expect(result.message).toContain('Техники и практики');
    });

    it('should have AI section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🤖');
      expect(result.message).toContain('Аналитика и AI');
    });

    it('should have Gamification section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🎮');
      expect(result.message).toContain('Игровые элементы');
    });

    it('should have Service section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('⚙️');
      expect(result.message).toContain('Сервис');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(helpCommand).toBeInstanceOf(HelpCommand);
    });

    it('should have correct name', () => {
      expect(helpCommand.name).toBe('help');
    });
  });
});
