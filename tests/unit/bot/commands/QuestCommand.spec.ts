/**
 * QuestCommand Unit Tests
 * =======================
 * Tests for /quest command - Quest management system.
 * Updated Sprint 7-8: Uses GamificationEngine mock
 */

import { QuestCommand, questCommand } from '../../../../src/bot/commands/QuestCommand';
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
    getActiveQuests: jest.fn(() => Promise.resolve([
      {
        quest: { id: 'diary_7', title: 'Дневник сна', description: 'Веди дневник 7 дней', icon: '📝', category: 'diary', difficulty: 'easy', targetMetric: 'diary_entries', targetValue: 7, durationDays: 7, reward: { xp: 50 } },
        progress: 40,
        currentValue: 3,
        targetValue: 7,
        daysRemaining: 4,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
    ])),
    getAvailableQuests: jest.fn(() => Promise.resolve([
      { id: 'relax_5', title: 'Релаксация', description: 'Проведи 5 сеансов релаксации', icon: '🧘', category: 'relaxation', difficulty: 'easy', targetMetric: 'relax_sessions', targetValue: 5, durationDays: 7, reward: { xp: 40 } },
    ])),
    startQuest: jest.fn(() => Promise.resolve({ questId: 'relax_5', userId: 123, startedAt: new Date() })),
    getCompletedQuestCount: jest.fn(() => Promise.resolve(2)),
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
      sonyaStage: { id: 'owlet', name: 'Совёнок', emoji: '🦉', description: '', requiredDays: 0, abilities: [] },
      sonyaEmoji: '🦉',
      sonyaName: 'Соня',
      compassionModeEnabled: true,
      softResetEnabled: true,
    })),
  })),
}));

describe('QuestCommand', () => {
  let command: QuestCommand;

  beforeEach(() => {
    command = new QuestCommand();
    jest.clearAllMocks();
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
