/**
 * SosCommand Unit Tests
 * ======================
 * Tests for /sos command - crisis intervention.
 */

import { SosCommand, sosCommand } from '../../../../src/bot/commands/SosCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

import { createMockSleepCoreAPI } from './testHelpers';

describe('SosCommand', () => {
  let command: SosCommand;

  beforeEach(() => {
    command = new SosCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('sos');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('помощь');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('emergency');
      expect(command.aliases).toContain('help911');
      expect(command.aliases).toContain('crisis');
      expect(command.aliases).toContain('помощь');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });
  });

  describe('execute()', () => {
    it('should show crisis help message', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'помощь');
    });

    it('should display Russian emergency hotline', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Russian emergency psychological hotline
      assertContainsText(result, '8-800');
    });

    it('should be free to call', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'бесплатн');
    });

    it('should be available 24/7', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, '24');
    });

    it('should offer immediate support options', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });

    it('should include empathetic message', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have supportive language
      expect(result.message?.length).toBeGreaterThan(100);
    });

    it('should have comprehensive crisis information', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have detailed crisis help
      expect(result.message!.length).toBeGreaterThan(200);
    });
  });

  describe('emergency contacts', () => {
    it('should include psychological help phone', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have phone number format
      expect(result.message).toMatch(/8-800-\d{3}-\d{2}-\d{2}/);
    });

    it('should include multiple resources', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have multiple lines of resources
      expect(result.message!.split('\n').length).toBeGreaterThan(5);
    });
  });

  describe('quick actions', () => {
    it('should offer call button or phone link', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
      const buttons = result.keyboard!.flat();
      // Should have some actionable buttons
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should offer action buttons', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      const buttons = result.keyboard!.flat();
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('safety', () => {
    it('should not require authentication', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should work immediately without session check
      assertSuccessWithMessage(result);
    });

    it('should be accessible via multiple aliases', () => {
      // Check it has at least 3 aliases
      expect(command.aliases!.length).toBeGreaterThanOrEqual(3);
      // Should include emergency-related aliases
      expect(command.aliases).toContain('emergency');
      expect(command.aliases).toContain('crisis');
    });
  });

  describe('crisis escalation', () => {
    it('should record SOS event via CrisisDetectionService', async () => {
      const ctx = createMockContext();
      await command.execute(ctx);

      // Allow async escalation to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockRecordSosEvent = (ctx.sleepCore.getCrisisDetection() as any).recordSosEvent as jest.Mock;
      expect(mockRecordSosEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: ctx.userId,
          chatId: String(ctx.chatId),
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

    it('should escalate to admins via CrisisEscalationService', async () => {
      const ctx = createMockContext();
      await command.execute(ctx);

      await new Promise(resolve => setTimeout(resolve, 10));

      const mockEscalate = (ctx.sleepCore.getCrisisEscalation() as any).escalate as jest.Mock;
      expect(mockEscalate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: ctx.userId,
          severity: 'high',
          crisisType: 'acute_distress',
        })
      );
    });

    it('should still show resources even if escalation fails', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getCrisisEscalation: jest.fn().mockReturnValue({
          escalate: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });
      const result = await command.execute(ctx);

      // Resources are shown regardless of escalation outcome
      assertSuccessWithMessage(result);
      assertContainsText(result, '8-800');
    });
  });

  describe('conversation interface', () => {
    it('should have steps array with initial', () => {
      expect(command.steps).toEqual(['initial']);
    });

    it('should implement handleStep for initial step', async () => {
      const ctx = createMockContext();

      // Allow async escalation to complete
      const result = await command.handleStep(ctx, 'initial', {});
      await new Promise(resolve => setTimeout(resolve, 10));

      assertSuccessWithMessage(result);
    });

    it('should return error for unknown step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'unknown', {});

      expect(result.success).toBe(false);
    });
  });

  describe('handleCallback()', () => {

    describe('sos:breathing', () => {
      it('should show 4-7-8 breathing exercise', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:breathing', {});

        assertSuccessWithMessage(result);
        assertContainsText(result, '4-7-8');
      });

      it('should include technique attribution (A. Weil)', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:breathing', {});

        assertContainsText(result, 'Вейл');
      });

      it('should include inhale-hold-exhale steps', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:breathing', {});

        assertContainsText(result, 'Вдох');
        assertContainsText(result, 'Задержка');
        assertContainsText(result, 'Выдох');
      });

      it('should include safety note about dizziness', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:breathing', {});

        assertContainsText(result, 'головокружени');
      });

      it('should have back button', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:breathing', {});

        assertHasKeyboard(result);
        const buttons = result.keyboard!.flat();
        expect(buttons.some(b => b.callbackData === 'sos:back')).toBe(true);
      });
    });

    describe('sos:grounding', () => {
      it('should show 5-4-3-2-1 grounding exercise', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:grounding', {});

        assertSuccessWithMessage(result);
        assertContainsText(result, '5-4-3-2-1');
      });

      it('should include all five senses', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:grounding', {});

        assertContainsText(result, 'ЗРЕНИЕ');
        assertContainsText(result, 'ОСЯЗАНИЕ');
        assertContainsText(result, 'СЛУХ');
        assertContainsText(result, 'ОБОНЯНИЕ');
        assertContainsText(result, 'ВКУС');
      });

      it('should include nighttime adaptation (eyes closed)', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:grounding', {});

        assertContainsText(result, 'глаза закрыты');
      });

      it('should have back button', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:grounding', {});

        assertHasKeyboard(result);
        const buttons = result.keyboard!.flat();
        expect(buttons.some(b => b.callbackData === 'sos:back')).toBe(true);
      });
    });

    describe('sos:talk', () => {
      it('should show talk resources with hotlines', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertSuccessWithMessage(result);
        assertContainsText(result, 'Поговорить');
      });

      it('should include trust hotline (8-800-2000-122)', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertContainsText(result, '8-800-2000-122');
      });

      it('should include psychological help hotline (8-800-100-49-94)', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertContainsText(result, '8-800-100-49-94');
      });

      it('should include MChS emergency psychology', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertContainsText(result, 'МЧС');
      });

      it('should include online resource', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertContainsText(result, 'psi.mchs.gov.ru');
      });

      it('should have back button', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:talk', {});

        assertHasKeyboard(result);
        const buttons = result.keyboard!.flat();
        expect(buttons.some(b => b.callbackData === 'sos:back')).toBe(true);
      });
    });

    describe('sos:back', () => {
      it('should return to main crisis resources', async () => {
        const ctx = createMockContext();
        const result = await command.handleCallback(ctx, 'sos:back', {});

        assertSuccessWithMessage(result);
        assertContainsText(result, 'помощь');
        assertContainsText(result, '8-800');
      });
    });

    it('should return error for invalid callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'other:action', {});

      expect(result.success).toBe(false);
    });

    it('should return error for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sos:unknown', {});

      expect(result.success).toBe(false);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(sosCommand).toBeInstanceOf(SosCommand);
      expect(sosCommand.name).toBe('sos');
    });
  });
});
