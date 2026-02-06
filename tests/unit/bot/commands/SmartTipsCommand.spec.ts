/**
 * SmartTipsCommand Unit Tests
 * ===========================
 * Tests for /smart_tips command - JITAI context-aware recommendations.
 */

import { SmartTipsCommand } from '../../../../src/bot/commands/SmartTipsCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
} from './testHelpers';

// Mock content service
jest.mock('../../../../src/modules/content', () => ({
  getContentService: jest.fn().mockReturnValue({
    getContent: jest.fn().mockResolvedValue({
      id: 'test-content',
      title: 'Test Content',
      type: 'article',
      content: 'Test content body',
      tags: ['sleep', 'relaxation'],
      steps: [],
      category: 'sleep',
      reward: { xp: 10 },
    }),
    getRecommendations: jest.fn().mockResolvedValue([
      {
        content: {
          id: 'rec1',
          title: 'Sleep Hygiene Tips',
          type: 'article',
          content: 'Tips for better sleep',
        },
        score: 0.9,
        reason: 'Based on your time of day',
      },
      {
        content: {
          id: 'rec2',
          title: 'Relaxation Techniques',
          type: 'exercise',
          content: 'Breathing exercises',
        },
        score: 0.8,
        reason: 'Based on your preferences',
      },
    ]),
    formatForTelegram: jest.fn().mockReturnValue('Formatted content for Telegram'),
    formatStepsForTelegram: jest.fn().mockReturnValue('Step 1: Do this\nStep 2: Do that'),
  }),
}));

describe('SmartTipsCommand', () => {
  let command: SmartTipsCommand;

  beforeEach(() => {
    command = new SmartTipsCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('smart_tips');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('рекомендации');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('tips');
      expect(command.aliases).toContain('recommend');
      expect(command.aliases).toContain('советы');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('show');
      expect(command.steps).toContain('filter');
    });
  });

  describe('execute()', () => {
    it('should show recommendations without args', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should have keyboard with options', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });

    it('should handle emotion argument', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'тревога');

      assertSuccessWithMessage(result);
    });

    it('should handle specific content request', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'test-content');

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle show callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback!(ctx, 'tips:show:rec1', {});

      expect(result).toBeDefined();
    });

    it('should handle filter callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback!(ctx, 'tips:filter:anxiety', {});

      expect(result).toBeDefined();
    });

    it('should handle menu callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback!(ctx, 'tips:menu', {});

      expect(result).toBeDefined();
    });
  });

  describe('JITAI context awareness', () => {
    it('should consider time of day', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should return recommendations based on current time
      assertSuccessWithMessage(result);
    });

    it('should handle different emotional states', async () => {
      const ctx = createMockContext();

      // Test various emotional states
      const emotions = ['стресс', 'anxiety', 'грусть', 'бессонница'];
      for (const emotion of emotions) {
        const result = await command.execute(ctx, emotion);
        assertSuccessWithMessage(result);
      }
    });
  });
});
