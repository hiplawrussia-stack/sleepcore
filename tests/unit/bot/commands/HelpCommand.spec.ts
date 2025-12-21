/**
 * HelpCommand Unit Tests
 * =======================
 * Tests for /help command - command reference.
 */

import { HelpCommand, helpCommand } from '../../../../src/bot/commands/HelpCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertContainsText,
} from './testHelpers';

describe('HelpCommand', () => {
  let command: HelpCommand;

  beforeEach(() => {
    command = new HelpCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('help');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Справка');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('помощь');
      expect(command.aliases).toContain('commands');
      expect(command.aliases).toContain('menu');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });
  });

  describe('execute()', () => {
    it('should show help message', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should list all available commands', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, '/start');
      assertContainsText(result, '/diary');
      assertContainsText(result, '/today');
      assertContainsText(result, '/relax');
      assertContainsText(result, '/mindful');
      assertContainsText(result, '/progress');
      assertContainsText(result, '/sos');
      assertContainsText(result, '/help');
    });

    it('should include command descriptions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have explanatory text for commands
      assertContainsText(result, 'дневник');
      assertContainsText(result, 'релаксац');
    });

    it('should be well formatted', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have line breaks for readability
      expect(result.message!.split('\n').length).toBeGreaterThan(5);
    });

    it('should include SleepCore branding', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'SleepCore');
    });
  });

  describe('command categories', () => {
    it('should organize commands logically', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Commands should be grouped or organized
      expect(result.message?.length).toBeGreaterThan(200);
    });
  });

  describe('accessibility', () => {
    it('should work without session', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should execute successfully', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.success).toBe(true);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(helpCommand).toBeInstanceOf(HelpCommand);
      expect(helpCommand.name).toBe('help');
    });
  });
});
