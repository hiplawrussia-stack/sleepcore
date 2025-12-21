/**
 * StartCommand Unit Tests
 * ========================
 * Tests for /start command - onboarding flow with ISI-7 assessment.
 */

import { StartCommand, startCommand } from '../../../../src/bot/commands/StartCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('StartCommand', () => {
  let command: StartCommand;

  beforeEach(() => {
    command = new StartCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('start');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Начать');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('begin');
      expect(command.aliases).toContain('начать');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('welcome');
      expect(command.steps).toContain('isi_intro');
      expect(command.steps).toContain('isi_q1');
      expect(command.steps).toContain('isi_result');
      expect(command.steps).toContain('complete');
    });
  });

  describe('execute()', () => {
    it('should return welcome message', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'SleepCore');
    });

    it('should show welcome with user name', async () => {
      const ctx = createMockContext({ displayName: 'Иван' });
      const result = await command.execute(ctx);

      assertContainsText(result, 'Иван');
    });

    it('should have start assessment button in keyboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
      assertCallbackData(result, 'start:');
    });

    it('should include metadata with step info', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.step).toBe('welcome');
    });

    it('should call startSession on API', async () => {
      const ctx = createMockContext();
      await command.execute(ctx);

      expect(ctx.sleepCore.startSession).toHaveBeenCalledWith(ctx.userId);
    });
  });

  describe('handleStep()', () => {
    it('should handle welcome step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'welcome', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'SleepCore');
    });

    it('should handle isi_intro step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_intro', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'ISI');
    });

    it('should handle ISI question steps (q1-q7)', async () => {
      const ctx = createMockContext();

      for (let i = 1; i <= 7; i++) {
        const result = await command.handleStep(ctx, `isi_q${i}`, {});
        assertSuccessWithMessage(result);
        assertHasKeyboard(result);
        // Should show question number
        assertContainsText(result, `${i}/7`);
      }
    });

    it('should handle isi_result step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_result', { isiAnswers: [] });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Результаты');
    });

    it('should handle complete step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'complete', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'завершена');
    });

    it('should return error for unknown step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'unknown_step', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });
  });

  describe('handleCallback()', () => {
    it('should process begin_assessment callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:begin_assessment', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'ISI');
    });

    it('should process skip_assessment callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:skip_assessment', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'завершена');
    });

    it('should process isi_answer callback to start', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:isi_answer:-1', { isiAnswers: [] });

      assertSuccessWithMessage(result);
      // Should show first question
      assertContainsText(result, '1/7');
    });

    it('should process isi_answer callback to next question', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:isi_answer:1:2', { isiAnswers: [] });

      assertSuccessWithMessage(result);
      // Should show next question (2/7)
      assertContainsText(result, '2/7');
    });

    it('should process view_tips callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:view_tips', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'правил');
    });

    it('should process start_diary callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:start_diary', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'diary');
    });

    it('should reject invalid callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'other:action', {});

      expect(result.success).toBe(false);
    });

    it('should reject unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'start:unknown_action', {});

      expect(result.success).toBe(false);
    });
  });

  describe('ISI questions', () => {
    it('should have 7 questions', async () => {
      const ctx = createMockContext();

      // Verify all 7 questions can be shown
      for (let i = 1; i <= 7; i++) {
        const result = await command.handleStep(ctx, `isi_q${i}`, {});
        expect(result.success).toBe(true);
      }
    });

    it('should show 5 answer options per question', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_q1', {});

      // 5 options = 5 keyboard rows
      expect(result.keyboard!.length).toBe(5);
    });

    it('should show progress bar', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_q4', {});

      // Should have progress bar characters
      expect(result.message).toMatch(/█|░/);
    });
  });

  describe('ISI result display', () => {
    it('should show ISI score', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_result', { isiAnswers: [] });

      // Demo score is 14
      expect(result.message).toMatch(/\d+/);
    });

    it('should show color indicators', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_result', { isiAnswers: [] });

      // Should have traffic light colors
      expect(result.message).toMatch(/🟢|🟡|🟠|🔴/);
    });

    it('should show recommendation', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_result', { isiAnswers: [] });

      assertContainsText(result, 'Рекомендация');
    });

    it('should store severity in metadata', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'isi_result', { isiAnswers: [] });

      expect(result.metadata?.severity).toBeDefined();
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(startCommand).toBeInstanceOf(StartCommand);
      expect(startCommand.name).toBe('start');
    });
  });
});
