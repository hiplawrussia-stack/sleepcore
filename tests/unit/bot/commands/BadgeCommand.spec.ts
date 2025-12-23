/**
 * BadgeCommand Unit Tests
 * =======================
 * Tests for /badges command - Badge collection viewing.
 */

import { BadgeCommand, badgeCommand } from '../../../../src/bot/commands/BadgeCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('BadgeCommand', () => {
  let command: BadgeCommand;

  beforeEach(() => {
    command = new BadgeCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('badges');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('бейджи');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('badge');
      expect(command.aliases).toContain('achievements');
      expect(command.aliases).toContain('достижения');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('list');
      expect(command.steps).toContain('category');
      expect(command.steps).toContain('details');
    });
  });

  describe('execute()', () => {
    it('should show badge collection', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'бейджи');
    });

    it('should have keyboard with navigation', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
      assertCallbackData(result, 'badge:');
    });

    it('should show progress when args is "progress"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'progress');

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle list callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'badge:list', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'бейджи');
    });

    it('should handle progress callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'badge:progress', {});

      assertSuccessWithMessage(result);
    });

    it('should handle category filter callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'badge:category:achievement', {});

      assertSuccessWithMessage(result);
    });

    it('should have back button in sub-views', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'badge:progress', {});

      assertHasKeyboard(result);
    });
  });

  describe('handleStep()', () => {
    it('should handle list step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'list', {});

      assertSuccessWithMessage(result);
    });

    it('should handle category step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'category', {});

      assertSuccessWithMessage(result);
    });
  });
});

describe('badgeCommand singleton', () => {
  it('should be an instance of BadgeCommand', () => {
    expect(badgeCommand).toBeInstanceOf(BadgeCommand);
  });

  it('should have execute method', () => {
    expect(typeof badgeCommand.execute).toBe('function');
  });

  it('should have handleCallback method', () => {
    expect(typeof badgeCommand.handleCallback).toBe('function');
  });
});
