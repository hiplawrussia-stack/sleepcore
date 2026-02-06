/**
 * ExplainCommand Unit Tests
 * ==========================
 * Tests for /explain command - XAI explanations for AI recommendations.
 */

import { ExplainCommand, explainCommand } from '../../../../src/bot/commands/ExplainCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

describe('ExplainCommand', () => {
  let command: ExplainCommand;

  beforeEach(() => {
    command = new ExplainCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('explain');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Объяснение');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('почему_так');
      expect(command.aliases).toContain('объясни');
      expect(command.aliases).toContain('explainability');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should show explanation menu without recent context', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
    });

    it('should display available explanation types', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle recommendation callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:recommendation', {});

      assertSuccessWithMessage(result);
    });

    it('should handle prediction callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:prediction', {});

      assertSuccessWithMessage(result);
    });

    it('should handle twin callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:twin', {});

      assertSuccessWithMessage(result);
    });

    it('should handle how_ai_works callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:how_ai_works', {});

      assertSuccessWithMessage(result);
    });

    it('should handle data_usage callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:data_usage', {});

      assertSuccessWithMessage(result);
    });

    it('should default to menu for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:unknown', {});

      assertSuccessWithMessage(result);
    });
  });

  describe('XAI principles', () => {
    it('should explain AI methodology', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:how_ai_works', {});

      assertSuccessWithMessage(result);
      // Should contain explanation of AI approach
      expect(result.message!.length).toBeGreaterThan(100);
    });

    it('should explain data usage transparently', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'explain:data_usage', {});

      assertSuccessWithMessage(result);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(explainCommand).toBeInstanceOf(ExplainCommand);
      expect(explainCommand.name).toBe('explain');
    });
  });
});
