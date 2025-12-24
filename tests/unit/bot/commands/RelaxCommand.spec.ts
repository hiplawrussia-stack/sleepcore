/**
 * RelaxCommand Unit Tests
 * ========================
 * Tests for /relax command - relaxation techniques.
 */

import { RelaxCommand, relaxCommand } from '../../../../src/bot/commands/RelaxCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('RelaxCommand', () => {
  let command: RelaxCommand;

  beforeEach(() => {
    command = new RelaxCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('relax');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('релаксации');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('relaxation');
      expect(command.aliases).toContain('calm');
      expect(command.aliases).toContain('расслабление');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });
  });

  describe('execute() without args', () => {
    it('should show technique selection menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // Check for relaxation-related content
      expect(result.message).toMatch(/релакс|расслаб|Техник/i);
    });

    it('should offer multiple techniques', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have at least 1 keyboard row (dynamic content from ContentService)
      assertHasKeyboard(result, 1);
    });

    it('should include relaxation content from ContentService', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should show content with duration (X мин)
      expect(result.message).toMatch(/мин/i);
    });

    it('should use relax callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertCallbackData(result, 'relax:');
    });
  });

  describe('execute() with technique args', () => {
    it('should show PMR instructions when given pmr ID', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr-full-001');

      assertSuccessWithMessage(result);
      // PMR content should mention muscle relaxation
      expect(result.message).toMatch(/мышц|напряг|расслаб/i);
    });

    it('should show breathing instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breathing-478-001');

      assertSuccessWithMessage(result);
      // Should contain breathing-related content
      expect(result.message).toMatch(/дыхан|вдох|выдох|4-7-8/i);
    });

    it('should show body scan instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'body-scan-quick-001');

      assertSuccessWithMessage(result);
    });

    it('should show imagery instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'imagery-beach-001');

      assertSuccessWithMessage(result);
    });

    it('should show cognitive shuffle instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'cognitive-shuffle-001');

      assertSuccessWithMessage(result);
    });

    it('should include duration in menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should mention minutes in menu
      expect(result.message).toMatch(/\d+\s*мин/i);
    });

    it('should offer navigation buttons after technique', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr-full-001');

      assertHasKeyboard(result);
    });

    it('should show menu for unknown technique', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'unknown');

      assertSuccessWithMessage(result);
      // Should fall back to menu
      assertHasKeyboard(result);
    });
  });

  describe('technique content', () => {
    it('should have step-by-step instructions for PMR', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr-full-001');

      // Should have steps (Шаг X or numbered content)
      expect(result.message).toMatch(/Шаг\s*\d|напряг|расслаб/i);
    });

    it('should explain breathing pattern', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breathing-478-001');

      // Should have timing numbers
      expect(result.message).toMatch(/\d/);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(relaxCommand).toBeInstanceOf(RelaxCommand);
      expect(relaxCommand.name).toBe('relax');
    });
  });
});
