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

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(sosCommand).toBeInstanceOf(SosCommand);
      expect(sosCommand.name).toBe('sos');
    });
  });
});
