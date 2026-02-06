/**
 * ProfileCommand Unit Tests
 * ==========================
 * Tests for /profile command - unified player profile with gamification.
 */

import { ProfileCommand, profileCommand } from '../../../../src/bot/commands/ProfileCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Note: GamificationContext mock removed - command now uses ctx.sleepCore.* facade methods
// which are mocked through testHelpers.createMockSleepCoreAPI()

describe('ProfileCommand', () => {
  let command: ProfileCommand;

  beforeEach(() => {
    command = new ProfileCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('profile');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('профиль');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('me');
      expect(command.aliases).toContain('профиль');
      expect(command.aliases).toContain('stats');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('overview');
      expect(command.steps).toContain('xp');
      expect(command.steps).toContain('streaks');
      expect(command.steps).toContain('settings');
    });
  });

  describe('execute()', () => {
    it('should show profile overview', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Профиль игрока');
    });

    it('should display user level', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Уровень');
    });

    it('should display XP information', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'XP');
    });

    it('should display statistics', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Статистика');
    });

    it('should have navigation keyboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 3);
    });

    it('should handle xp argument', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'xp');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Опыт');
    });

    it('should handle streaks argument', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'streaks');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'стрик');
    });

    it('should handle settings argument', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'settings');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Настройки');
    });
  });

  describe('handleStep()', () => {
    it('should handle overview step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'overview', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Профиль');
    });

    it('should handle xp step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'xp', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'XP');
    });

    it('should handle streaks step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'streaks', {});

      assertSuccessWithMessage(result);
    });

    it('should handle settings step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'settings', {});

      assertSuccessWithMessage(result);
    });

    it('should default to overview for unknown step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'unknown', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Профиль');
    });
  });

  describe('handleCallback()', () => {
    it('should handle overview callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:overview', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Профиль');
    });

    it('should handle xp callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:xp', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'XP');
    });

    it('should handle streaks callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:streaks', {});

      assertSuccessWithMessage(result);
    });

    it('should handle settings callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:settings', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Настройки');
    });

    it('should handle check_in callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:check_in', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'чек-ин');
    });

    it('should handle toggle_compassion callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:toggle_compassion', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'сострадания');
    });

    it('should handle toggle_soft_reset callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'profile:toggle_soft_reset', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'сброс');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(profileCommand).toBeInstanceOf(ProfileCommand);
      expect(profileCommand.name).toBe('profile');
    });
  });
});
