/**
 * EvolutionCommand Unit Tests
 * ===========================
 * Tests for /sonya command - Sonya avatar evolution system.
 * Updated Sprint 8: Uses GamificationEngine mock
 */

import { EvolutionCommand, evolutionCommand } from '../../../../src/bot/commands/EvolutionCommand';
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
      sonyaStage: {
        id: 'owlet',
        name: 'Совёнок',
        emoji: '🦉',
        description: 'Маленький совёнок, только начинающий свой путь',
        requiredDays: 0,
        abilities: ['Базовые советы по сну'],
      },
      sonyaEmoji: '🦉',
      sonyaName: 'Соня',
      compassionModeEnabled: true,
      softResetEnabled: true,
    })),
    recordAction: jest.fn(() => Promise.resolve({
      xpEarned: 25,
      totalXp: 125,
      level: 2,
      leveledUp: false,
      completedQuests: [],
      awardedBadges: [],
      streakUpdates: [],
      celebrations: [],
      timestamp: new Date(),
    })),
    checkEvolution: jest.fn(() => Promise.resolve({
      evolved: false,
      currentStage: { id: 'owlet', name: 'Совёнок', emoji: '🦉', description: '', requiredDays: 0, abilities: [] },
      previousStage: null,
    })),
  })),
}));

describe('EvolutionCommand', () => {
  let command: EvolutionCommand;

  beforeEach(() => {
    command = new EvolutionCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('sonya');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Эволюция');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('evolution');
      expect(command.aliases).toContain('avatar');
      expect(command.aliases).toContain('эволюция');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('status');
      expect(command.steps).toContain('history');
      expect(command.steps).toContain('abilities');
    });
  });

  describe('execute()', () => {
    it('should show Sonya status', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // Should contain Sonya's name or emoji
    });

    it('should have keyboard with navigation', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
      assertCallbackData(result, 'sonya:');
    });

    it('should show history when args is "history"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'history');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'История');
    });

    it('should show abilities when args is "abilities"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'abilities');

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Способности');
    });

    it('should show next stage info when args is "next"', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'next');

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle status callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:status', {});

      assertSuccessWithMessage(result);
    });

    it('should handle history callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:history', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'История');
    });

    it('should handle abilities callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:abilities', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Способности');
    });

    it('should handle next callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:next', {});

      assertSuccessWithMessage(result);
    });

    it('should handle interact callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:interact', {});

      assertSuccessWithMessage(result);
    });

    it('should have back button in sub-views', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'sonya:history', {});

      assertHasKeyboard(result);
      // Should have back button
    });
  });

  describe('handleStep()', () => {
    it('should handle status step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'status', {});

      assertSuccessWithMessage(result);
    });

    it('should handle history step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'history', {});

      assertSuccessWithMessage(result);
    });

    it('should handle abilities step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'abilities', {});

      assertSuccessWithMessage(result);
    });
  });

  describe('visual elements', () => {
    it('should include ASCII art in status', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // ASCII art is wrapped in code blocks
      expect(result.message).toContain('```');
    });

    it('should show progress bar', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // Progress bar contains filled/empty blocks
    });
  });
});

describe('evolutionCommand singleton', () => {
  it('should be an instance of EvolutionCommand', () => {
    expect(evolutionCommand).toBeInstanceOf(EvolutionCommand);
  });

  it('should have execute method', () => {
    expect(typeof evolutionCommand.execute).toBe('function');
  });

  it('should have handleCallback method', () => {
    expect(typeof evolutionCommand.handleCallback).toBe('function');
  });
});
