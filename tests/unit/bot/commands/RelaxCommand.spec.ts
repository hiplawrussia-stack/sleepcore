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
      assertContainsText(result, 'Техники релаксации');
    });

    it('should offer multiple techniques', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
    });

    it('should include breathing option', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('Дыхание') || b.text.includes('дыхание'))).toBe(true);
    });

    it('should use relax callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertCallbackData(result, 'relax:');
    });
  });

  describe('execute() with technique args', () => {
    it('should show PMR instructions when given pmr arg', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'мышечная');
    });

    it('should show breathing instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breathing');

      assertSuccessWithMessage(result);
      // Full name: "Диафрагмальное дыхание"
      assertContainsText(result, 'дыхание');
    });

    it('should show body scan instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'body_scan');

      assertSuccessWithMessage(result);
    });

    it('should show imagery instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'imagery');

      assertSuccessWithMessage(result);
    });

    it('should show shuffle instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'shuffle');

      assertSuccessWithMessage(result);
    });

    it('should include duration for techniques', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr');

      // Should mention minutes
      expect(result.message).toMatch(/\d+\s*(мин|минут)/i);
    });

    it('should offer navigation buttons after technique', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr');

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
    it('should have numbered steps for PMR', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'pmr');

      // Should have numbered list or steps
      expect(result.message).toMatch(/\d\./);
    });

    it('should explain breathing pattern', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'breathing');

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
