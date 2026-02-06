/**
 * RehearsalCommand Tests
 * ======================
 *
 * IEC 62304 Class B - Memory consolidation preparation
 *
 * Tests verify:
 * - Evening time window enforcement
 * - Session management
 * - Visualization flow
 * - Intention setting
 * - Progress tracking
 * - Bedtime parsing
 *
 * @packageDocumentation
 */

// Mock functions must be declared before jest.mock for hoisting
const mockGetEveningRehearsal = jest.fn();
const mockGetProgress = jest.fn();
const mockGenerateVisualization = jest.fn();
const mockGenerateProgressReport = jest.fn();

import { RehearsalCommand, rehearsalCommand } from '../RehearsalCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock cognitive module
jest.mock('../../../cognitive', () => ({
  createSmartMemoryWindowEngine: () => ({
    getEveningRehearsal: mockGetEveningRehearsal,
    getProgress: mockGetProgress,
    rehearsal: {
      generateVisualization: mockGenerateVisualization,
    },
    analytics: {
      generateProgressReport: mockGenerateProgressReport,
    },
  }),
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    greet: () => ({ text: 'Добрый вечер!' }),
  },
}));

// Mock session
const mockRehearsalSession = {
  sessionId: 'session123',
  userId: '12345',
  bedtime: '23:00',
  minutesBeforeBed: 60,
  rules: [
    {
      ruleId: 'rule1',
      statement: 'Ложитесь спать только когда хотите спать',
      rationale: 'Это помогает ассоциировать кровать со сном',
    },
    {
      ruleId: 'rule2',
      statement: 'Вставайте, если не можете заснуть за 20 минут',
      rationale: 'Не лежите в кровати без сна',
    },
    {
      ruleId: 'rule3',
      statement: 'Кровать только для сна',
      rationale: 'Укрепляет ассоциацию кровать-сон',
    },
  ],
  intentionSet: false,
  visualizationCompleted: false,
};

describe('RehearsalCommand', () => {
  let command: RehearsalCommand;
  let mockContext: ISleepCoreContext;

  beforeEach(() => {
    command = new RehearsalCommand();
    jest.clearAllMocks();

    // Setup default mock returns
    mockGetEveningRehearsal.mockResolvedValue(mockRehearsalSession);
    mockGetProgress.mockResolvedValue({
      totalRules: 10,
      masteredRules: 5,
      averageRecall: 0.75,
    });
    mockGenerateVisualization.mockReturnValue(
      '🎬 Визуализация:\n\nПредставьте, как вы ложитесь в кровать...'
    );
    mockGenerateProgressReport.mockReturnValue(
      '📊 Ваш прогресс:\n\n5/10 правил освоено\n75% точность'
    );

    // Create mock context
    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {},
    } as unknown as ISleepCoreContext;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to mock time
  const mockTime = (hour: number) => {
    jest.useFakeTimers();
    const mockDate = new Date('2026-02-06T00:00:00');
    mockDate.setHours(hour);
    jest.setSystemTime(mockDate);
  };

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('rehearsal');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('репетиция');
    });

    it('should have rehearsal-related aliases', () => {
      expect(command.aliases).toContain('репетиция');
      expect(command.aliases).toContain('вечер');
      expect(command.aliases).toContain('memory');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // TIME WINDOW ENFORCEMENT
  // ==========================================================================
  describe('Time Window Enforcement', () => {
    it('should start rehearsal during evening hours (18-23)', async () => {
      mockTime(20); // 8 PM

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockGetEveningRehearsal).toHaveBeenCalled();
    });

    it('should show early message before 18:00', async () => {
      mockTime(14); // 2 PM

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('рано');
      expect(result.message).toContain('/today');
    });

    it('should show early message at midnight (next day)', async () => {
      mockTime(0); // Midnight = hour 0 = next day

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Hour 0 is < 18, so it shows "early" message (next day morning perspective)
      expect(result.message).toContain('рано');
    });

    it('should allow starting rehearsal anyway with button', async () => {
      mockTime(14);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const forceButton = buttons.find(b => b.callbackData === 'rehearsal:force');
      expect(forceButton).toBeDefined();
      expect(forceButton?.text).toContain('начать');
    });

    it('should accept 18:00 as evening', async () => {
      mockTime(18);

      const result = await command.execute(mockContext);

      expect(mockGetEveningRehearsal).toHaveBeenCalled();
    });

    it('should accept 23:00 as evening', async () => {
      mockTime(23);

      const result = await command.execute(mockContext);

      expect(mockGetEveningRehearsal).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // REHEARSAL START
  // ==========================================================================
  describe('Rehearsal Start', () => {
    beforeEach(() => {
      mockTime(20);
    });

    it('should show rehearsal message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Вечерняя репетиция');
    });

    it('should include Sonya greeting', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Соня');
    });

    it('should show time until bed', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('60 мин');
    });

    it('should list rules for today', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Ложитесь спать');
      expect(result.message).toContain('Вставайте');
      expect(result.message).toContain('Кровать только для сна');
    });

    it('should include rule rationales', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('ассоциацию');
    });

    it('should show how it works', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Как это работает');
      expect(result.message).toContain('визуализацию');
      expect(result.message).toContain('намерение');
    });

    it('should mention /recall for morning', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/recall');
    });

    it('should have action buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:visualize:0')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'rehearsal:intention')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'rehearsal:progress')).toBe(true);
    });
  });

  // ==========================================================================
  // BEDTIME PARSING
  // ==========================================================================
  describe('Bedtime Parsing', () => {
    beforeEach(() => {
      mockTime(20);
    });

    it('should parse bedtime from args', async () => {
      await command.execute(mockContext, '22:30');

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '22:30');
    });

    it('should use default bedtime when no args', async () => {
      await command.execute(mockContext);

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '23:00');
    });

    it('should parse single-digit hours', async () => {
      await command.execute(mockContext, '9:30');

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '09:30');
    });

    it('should ignore invalid bedtime format', async () => {
      await command.execute(mockContext, 'invalid');

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '23:00');
    });

    it('should ignore out-of-range hours', async () => {
      await command.execute(mockContext, '25:00');

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '23:00');
    });

    it('should ignore out-of-range minutes', async () => {
      await command.execute(mockContext, '22:70');

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '23:00');
    });
  });

  // ==========================================================================
  // VISUALIZATION FLOW
  // ==========================================================================
  describe('Visualization Flow', () => {
    beforeEach(async () => {
      mockTime(20);
      await command.execute(mockContext);
    });

    it('should show first visualization on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Правило 1/3');
    });

    it('should show rule statement', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.message).toContain(mockRehearsalSession.rules[0].statement);
    });

    it('should include visualization content', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.message).toContain('Визуализация');
    });

    it('should have next button when not last rule', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:next_viz:0')).toBe(true);
    });

    it('should navigate to next visualization', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:next_viz:0',
        {}
      );

      expect(result.message).toContain('Правило 2/3');
    });

    it('should show intention button on last rule', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:2',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:intention')).toBe(true);
    });

    it('should show completion message when out of rules', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:10',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все визуализации пройдены');
    });

    it('should show completion for missing session', async () => {
      const newCommand = new RehearsalCommand();

      const result = await newCommand.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.message).toContain('Все визуализации');
    });
  });

  // ==========================================================================
  // INTENTION SETTING
  // ==========================================================================
  describe('Intention Setting', () => {
    beforeEach(async () => {
      mockTime(20);
      await command.execute(mockContext);
    });

    it('should set intention on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Намерение установлено');
    });

    it('should show affirmation text', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.message).toContain('Я запомню');
    });

    it('should mention NREM sleep', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.message).toContain('NREM');
    });

    it('should wish good night', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.message).toContain('Спокойной ночи');
    });

    it('should mention /recall for morning', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.message).toContain('/recall');
    });

    it('should work without active session', async () => {
      const newCommand = new RehearsalCommand();

      const result = await newCommand.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // PROGRESS VIEW
  // ==========================================================================
  describe('Progress View', () => {
    it('should show progress on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:progress',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockGetProgress).toHaveBeenCalledWith('12345');
    });

    it('should include progress report', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:progress',
        {}
      );

      expect(result.message).toContain('прогресс');
      expect(result.message).toContain('5/10');
    });

    it('should have back to rehearsal button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:progress',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:force')).toBe(true);
    });
  });

  // ==========================================================================
  // FORCE START
  // ==========================================================================
  describe('Force Start', () => {
    it('should start rehearsal via force callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:force',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockGetEveningRehearsal).toHaveBeenCalled();
    });

    it('should use default bedtime on force', async () => {
      await command.handleCallback(mockContext, 'rehearsal:force', {});

      expect(mockGetEveningRehearsal).toHaveBeenCalledWith('12345', '23:00');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should handle force callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:force',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle visualize callback', async () => {
      mockTime(20);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle next_viz callback', async () => {
      mockTime(20);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'rehearsal:next_viz:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle intention callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:intention',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle progress callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:progress',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockTime(20);
    });

    it('should handle engine error on start', async () => {
      mockGetEveningRehearsal.mockRejectedValueOnce(new Error('Engine error'));

      await expect(command.execute(mockContext)).rejects.toThrow('Engine error');
    });

    it('should handle progress error', async () => {
      mockGetProgress.mockRejectedValueOnce(new Error('Progress error'));

      await expect(
        command.handleCallback(mockContext, 'rehearsal:progress', {})
      ).rejects.toThrow('Progress error');
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  describe('Session Management', () => {
    beforeEach(() => {
      mockTime(20);
    });

    it('should track session per user', async () => {
      await command.execute(mockContext);

      // Should have session for visualization
      const result = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );

      expect(result.message).toContain('Правило 1/3');
    });

    it('should handle multiple users independently', async () => {
      await command.execute(mockContext);

      const context2 = { ...mockContext, userId: '67890' } as unknown as ISleepCoreContext;
      await command.execute(context2);

      // Both should work
      const result1 = await command.handleCallback(
        mockContext,
        'rehearsal:visualize:0',
        {}
      );
      expect(result1.success).toBe(true);
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(rehearsalCommand).toBeInstanceOf(RehearsalCommand);
    });

    it('should have correct name', () => {
      expect(rehearsalCommand.name).toBe('rehearsal');
    });
  });
});
