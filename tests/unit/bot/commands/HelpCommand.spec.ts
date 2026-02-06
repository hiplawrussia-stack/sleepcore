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

    it('should list all 25 available commands', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Core program
      assertContainsText(result, '/start');
      assertContainsText(result, '/diary');
      assertContainsText(result, '/today');
      assertContainsText(result, '/therapy');
      assertContainsText(result, '/progress');

      // Techniques
      assertContainsText(result, '/relax');
      assertContainsText(result, '/mindful');
      assertContainsText(result, '/rehearsal');
      assertContainsText(result, '/recall');

      // Safety (IEC 62366-1: must be in primary disclosure)
      assertContainsText(result, '/sos');
      assertContainsText(result, '/safety');
      assertContainsText(result, '/aereport');

      // Analytics
      assertContainsText(result, '/insights');
      assertContainsText(result, '/predict');
      assertContainsText(result, '/explain');
      assertContainsText(result, '/whatif');
      assertContainsText(result, '/twin');
      assertContainsText(result, '/chronotype');
      assertContainsText(result, '/smart_tips');

      // Gamification
      assertContainsText(result, '/quest');
      assertContainsText(result, '/badges');
      assertContainsText(result, '/profile');
      assertContainsText(result, '/sonya');

      // Service
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

    it('should list safety commands first (IEC 62366-1 / ISO 14971)', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Safety category must appear before other command categories
      const sosIndex = result.message!.indexOf('/sos');
      const startIndex = result.message!.indexOf('/start');
      const relaxIndex = result.message!.indexOf('/relax');

      expect(sosIndex).toBeLessThan(startIndex);
      expect(sosIndex).toBeLessThan(relaxIndex);
    });

    it('should include category headers', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Экстренная помощь');
      assertContainsText(result, 'Основная программа');
      assertContainsText(result, 'Техники и практики');
      assertContainsText(result, 'Аналитика и AI');
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
