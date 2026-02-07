/**
 * SosCommand Tests - Safety-Critical Module
 * ==========================================
 *
 * IEC 62304 Class C - Maximum verification required
 * SAMHSA 2025 Guidelines - Crisis intervention
 *
 * Tests verify:
 * - Crisis escalation is ALWAYS triggered
 * - Resources are displayed correctly
 * - Breathing/grounding exercises work
 * - All callbacks are handled
 *
 * CRITICAL: This command handles acute crisis situations.
 * All code paths must be tested.
 *
 * @packageDocumentation
 */

import { SosCommand, sosCommand } from '../SosCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    respondToEmotion: () => ({ text: 'Я рядом с тобой.' }),
  },
}));

describe('SosCommand', () => {
  let command: SosCommand;
  let mockContext: ISleepCoreContext;
  let mockRecordSosEvent: jest.Mock;
  let mockEscalate: jest.Mock;

  beforeEach(() => {
    command = new SosCommand();

    // Create mocks for crisis services
    mockRecordSosEvent = jest.fn();
    mockEscalate = jest.fn().mockResolvedValue(undefined);

    // Create mock context
    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getCrisisDetection: () => ({
          recordSosEvent: mockRecordSosEvent,
        }),
        getCrisisEscalation: () => ({
          escalate: mockEscalate,
        }),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('sos');
    });

    it('should have correct description in Russian', () => {
      expect(command.description).toBe('Экстренная помощь');
    });

    it('should have crisis-related aliases', () => {
      expect(command.aliases).toContain('emergency');
      expect(command.aliases).toContain('crisis');
      expect(command.aliases).toContain('помощь');
    });

    it('should NOT require session (accessible always)', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Crisis Escalation
  // ==========================================================================
  describe('SAFETY: Crisis Escalation', () => {
    it('should record SOS event with correct data', async () => {
      await command.execute(mockContext);

      // Wait for async escalation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRecordSosEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          chatId: '456789',
          severity: 'high',
          crisisType: 'acute_distress',
          confidence: 1.0,
          action: 'interrupt',
          messageText: '/sos',
          indicators: ['user_initiated_sos'],
          responseProvided: true,
        })
      );
    });

    it('should escalate to admins', async () => {
      await command.execute(mockContext);

      // Wait for async escalation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEscalate).toHaveBeenCalled();
    });

    it('should show resources even if escalation fails', async () => {
      mockEscalate.mockRejectedValue(new Error('Network error'));

      const result = await command.execute(mockContext);

      // Should still succeed with resources
      expect(result.success).toBe(true);
      expect(result.message).toContain('Экстренная помощь');
    });

    it('should set crisis metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata).toEqual({ crisis: true });
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Crisis Resources Display
  // ==========================================================================
  describe('SAFETY: Crisis Resources', () => {
    it('should display Russian crisis hotlines', async () => {
      const result = await command.execute(mockContext);

      // Primary hotline
      expect(result.message).toContain('8-800-2000-122');
      expect(result.message).toContain('Телефон доверия');

      // MChS hotline
      expect(result.message).toContain('8-499-216-50-50');
      expect(result.message).toContain('МЧС');

      // Children's hotline
      expect(result.message).toContain('8-800-250-00-15');
      expect(result.message).toContain('Дети онлайн');
    });

    it('should indicate 24/7 availability', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('24/7');
    });

    it('should indicate free services', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('бесплатно');
    });

    it('should include grounding instructions while waiting', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Дыши медленно');
      expect(result.message).toContain('5 вещей');
    });

    it('should include supportive message', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Ты справишься');
      expect(result.message).toContain('временное');
    });
  });

  // ==========================================================================
  // KEYBOARD: Quick Actions
  // ==========================================================================
  describe('Quick Action Buttons', () => {
    it('should have breathing exercise button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const breathingButton = buttons.find(b => b.callbackData === 'sos:breathing');

      expect(breathingButton).toBeDefined();
      expect(breathingButton?.text).toContain('Дыхательное');
    });

    it('should have grounding exercise button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const groundingButton = buttons.find(b => b.callbackData === 'sos:grounding');

      expect(groundingButton).toBeDefined();
      expect(groundingButton?.text).toContain('заземления');
    });

    it('should have talk option button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const talkButton = buttons.find(b => b.callbackData === 'sos:talk');

      expect(talkButton).toBeDefined();
      expect(talkButton?.text).toContain('выговориться');
    });
  });

  // ==========================================================================
  // CALLBACK: Breathing Exercise
  // ==========================================================================
  describe('Callback: Breathing Exercise', () => {
    it('should show 4-7-8 breathing technique', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:breathing',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('4-7-8');
    });

    it('should explain the technique steps', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:breathing',
        {}
      );

      expect(result.message).toContain('Вдох');
      expect(result.message).toContain('Задержка');
      expect(result.message).toContain('Выдох');
    });

    it('should mention scientific basis', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:breathing',
        {}
      );

      expect(result.message).toContain('парасимпатическую');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:breathing',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sos:back');

      expect(backButton).toBeDefined();
    });

    it('should include safety warning for dizziness', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:breathing',
        {}
      );

      expect(result.message).toContain('головокружении');
    });
  });

  // ==========================================================================
  // CALLBACK: Grounding Exercise
  // ==========================================================================
  describe('Callback: Grounding Exercise', () => {
    it('should show 5-4-3-2-1 grounding technique', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:grounding',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('5-4-3-2-1');
    });

    it('should cover all 5 senses', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:grounding',
        {}
      );

      expect(result.message).toContain('ЗРЕНИЕ');
      expect(result.message).toContain('ОСЯЗАНИЕ');
      expect(result.message).toContain('СЛУХ');
      expect(result.message).toContain('ОБОНЯНИЕ');
      expect(result.message).toContain('ВКУС');
    });

    it('should include night-time adaptation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:grounding',
        {}
      );

      // Should mention eyes closed option
      expect(result.message).toContain('глаза закрыты');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:grounding',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sos:back');

      expect(backButton).toBeDefined();
    });
  });

  // ==========================================================================
  // CALLBACK: Talk Resources
  // ==========================================================================
  describe('Callback: Talk Resources', () => {
    it('should show expanded hotline list', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:talk',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('8-800-2000-122');
      expect(result.message).toContain('8-800-100-49-94');
    });

    it('should include online resources', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:talk',
        {}
      );

      expect(result.message).toContain('psi.mchs.gov.ru');
    });

    it('should indicate anonymous service', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:talk',
        {}
      );

      expect(result.message).toContain('анонимно');
    });

    it('should have supportive message about seeking help', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:talk',
        {}
      );

      expect(result.message).toContain('не один');
      expect(result.message).toContain('правильный шаг');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:talk',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'sos:back');

      expect(backButton).toBeDefined();
    });
  });

  // ==========================================================================
  // CALLBACK: Back Navigation
  // ==========================================================================
  describe('Callback: Back Navigation', () => {
    it('should return to main crisis resources', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:back',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Экстренная помощь');
      expect(result.message).toContain('8-800-2000-122');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle unknown callback action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'sos:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should handle invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should handle unknown step in handleStep', async () => {
      const result = await command.handleStep(
        mockContext,
        'unknown_step',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });

    it('should handle initial step correctly', async () => {
      const result = await command.handleStep(
        mockContext,
        'initial',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Экстренная помощь');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(sosCommand).toBeInstanceOf(SosCommand);
    });

    it('should have same properties as new instance', () => {
      expect(sosCommand.name).toBe('sos');
      expect(sosCommand.description).toBe('Экстренная помощь');
    });
  });
});
