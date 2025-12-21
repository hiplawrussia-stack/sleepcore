/**
 * MindfulCommand Unit Tests
 * ==========================
 * Tests for /mindful command - MBT-I/ACT-I practices.
 */

import { MindfulCommand, mindfulCommand } from '../../../../src/bot/commands/MindfulCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('MindfulCommand', () => {
  let command: MindfulCommand;

  beforeEach(() => {
    command = new MindfulCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('mindful');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('осознанности');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('mindfulness');
      expect(command.aliases).toContain('meditation');
      expect(command.aliases).toContain('осознанность');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });
  });

  describe('execute() without args', () => {
    it('should show practice selection menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'осознанности');
    });

    it('should offer multiple practices', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
    });

    it('should explain MBT-I/ACT-I research basis', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should mention research or evidence
      expect(result.message).toMatch(/ACT|MBT|исследован|терап/i);
    });

    it('should use mindful callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertCallbackData(result, 'mindful:');
    });
  });

  describe('execute() with practice args', () => {
    it('should show breath awareness practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breath_awareness');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'дыхан');
    });

    it('should show leaves on stream practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'leaves_on_stream');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Листья');
    });

    it('should include duration', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breath_awareness');

      // Duration is shown as "5 минут"
      expect(result.message).toMatch(/\d+\s*минут/i);
    });

    it('should offer navigation after practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breath_awareness');

      assertHasKeyboard(result);
    });

    it('should show menu for unknown practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'unknown');

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
    });
  });

  describe('practice content', () => {
    it('should have step-by-step instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breath_awareness');

      // Should have numbered steps
      expect(result.message).toMatch(/\d\./);
    });

    it('should include mindfulness guidance', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'leaves_on_stream');

      // Should have helpful guidance
      expect(result.message?.length).toBeGreaterThan(100);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(mindfulCommand).toBeInstanceOf(MindfulCommand);
      expect(mindfulCommand.name).toBe('mindful');
    });
  });
});
