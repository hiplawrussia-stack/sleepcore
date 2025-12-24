/**
 * BadgeCommand Unit Tests
 * =======================
 * Tests for /badges command - Badge collection viewing.
 * Updated Sprint 8: Uses GamificationEngine mock
 */

import { BadgeCommand, badgeCommand } from '../../../../src/bot/commands/BadgeCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

// Mock the GamificationContext module
jest.mock('../../../../src/bot/services/GamificationContext', () => ({
  getGamificationEngine: jest.fn(() => Promise.resolve({
    getUserBadges: jest.fn(() => Promise.resolve([
      { badgeId: 'badge1', userId: '123', earnedAt: new Date(), displayOrder: 0, isNew: false },
    ])),
    getAllBadges: jest.fn(() => [
      { id: 'badge1', name: 'First Badge', description: 'Your first badge', icon: '🏅', category: 'achievement', rarity: 'common', criteria: { type: 'first' }, reward: { xp: 10 }, hidden: false },
      { id: 'badge2', name: 'Streak Master', description: 'Maintain a streak', icon: '🔥', category: 'streak', rarity: 'rare', criteria: { type: 'streak', metric: 'diary_streak', value: 7 }, reward: { xp: 50 }, hidden: false },
    ]),
    getPlayerProfile: jest.fn(() => Promise.resolve({
      userId: 123,
      totalXp: 100,
      level: 2,
      xpToNextLevel: 150,
      levelProgress: 40,
      engagementLevel: 'active',
      totalDaysActive: 5,
      streaks: [{ type: 'sleep_diary', currentCount: 3, longestCount: 5 }],
      longestStreak: 5,
      activeQuests: [],
      completedQuestCount: 2,
      badges: [],
      badgeCount: 1,
      totalBadgeXp: 10,
      sonyaStage: { id: 'owlet', name: 'Совёнок', emoji: '🦉', description: 'Starting stage', requiredDays: 0, abilities: [] },
      sonyaEmoji: '🦉',
      sonyaName: 'Соня',
      compassionModeEnabled: true,
      softResetEnabled: true,
    })),
    hasBadge: jest.fn(() => Promise.resolve(true)),
  })),
}));

describe('BadgeCommand', () => {
  let command: BadgeCommand;

  beforeEach(() => {
    command = new BadgeCommand();
    jest.clearAllMocks();
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
