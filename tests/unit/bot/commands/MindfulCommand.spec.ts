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

      // Should have at least 1 keyboard row (dynamic content)
      assertHasKeyboard(result, 1);
    });

    it('should show practice list from ContentService', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should show mindfulness practices from ContentService
      expect(result.message).toMatch(/Практик|мин/i);
    });

    it('should use mindful callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertCallbackData(result, 'mindful:');
    });
  });

  describe('execute() with practice args', () => {
    it('should show grounding practice by ID', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      assertSuccessWithMessage(result);
      // Should show the practice content
      expect(result.message).toMatch(/заземл|5-4-3-2-1|чувств/i);
    });

    it('should show body scan practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'mindful-body-scan-001');

      assertSuccessWithMessage(result);
      // Should show body scan content
      expect(result.message?.length).toBeGreaterThan(50);
    });

    it('should include duration in menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Duration is shown as "X мин" in menu
      expect(result.message).toMatch(/\d+\s*мин/i);
    });

    it('should offer navigation after practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

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
    it('should have step-by-step instructions when showing practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      // Should have numbered steps (Шаг 1, Шаг 2, etc.)
      expect(result.message).toMatch(/Шаг\s*\d|шаг|ВИДИШЬ|ПОТРОГАТЬ/i);
    });

    it('should include mindfulness guidance', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      // Should have helpful guidance (more than 100 chars)
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
