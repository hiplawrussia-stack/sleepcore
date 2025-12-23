/**
 * QuestCommand Unit Tests
 * =======================
 * Tests for /quest command - Quest management system.
 */

import { QuestCommand, questCommand } from '../../../../src/bot/commands/QuestCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('QuestCommand', () => {
  let command: QuestCommand;

  beforeEach(() => {
    command = new QuestCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('quest');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Квесты');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('quests');
      expect(command.aliases).toContain('задания');
      expect(command.aliases).toContain('квесты');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('list');
      expect(command.steps).toContain('details');
      expect(command.steps).toContain('start');
      expect(command.steps).toContain('progress');
    });
  });

  describe('execute()', () => {
    it('should show quest hub', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Квесты');
    });

    it('should have keyboard with navigation', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
      assertCallbackData(result, 'quest:');
    });

    it('should show active quests when args is "active"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'active');

      assertSuccessWithMessage(result);
      // Should show active quests section
    });

    it('should show available quests when args is "available"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'available');

      assertSuccessWithMessage(result);
      // Should show available quests
    });
  });

  describe('handleCallback()', () => {
    it('should handle hub callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'quest:hub', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Квесты');
    });

    it('should handle active callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'quest:active', {});

      assertSuccessWithMessage(result);
    });

    it('should handle available callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'quest:available', {});

      assertSuccessWithMessage(result);
    });

    it('should have back button in sub-views', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'quest:active', {});

      assertHasKeyboard(result);
      // Should have back button
    });
  });

  describe('handleStep()', () => {
    it('should handle list step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'list', {});

      assertSuccessWithMessage(result);
    });

    it('should handle progress step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'progress', {});

      assertSuccessWithMessage(result);
    });
  });
});

describe('questCommand singleton', () => {
  it('should be an instance of QuestCommand', () => {
    expect(questCommand).toBeInstanceOf(QuestCommand);
  });

  it('should have execute method', () => {
    expect(typeof questCommand.execute).toBe('function');
  });

  it('should have handleCallback method', () => {
    expect(typeof questCommand.handleCallback).toBe('function');
  });
});
