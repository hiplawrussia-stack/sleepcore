/**
 * InsightsCommand Unit Tests
 * ===========================
 * Tests for /insights command - personalized causal insights.
 */

import { InsightsCommand, insightsCommand } from '../../../../src/bot/commands/InsightsCommand';
import {
  createMockContext,
  createMockContextNoSession,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock services
jest.mock('../../../../src/bot/services/SleepPredictionService', () => ({
  sleepPredictionService: {
    getHistory: jest.fn().mockReturnValue(
      Array.from({ length: 20 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        metrics: {
          sleepEfficiency: 80 + Math.random() * 10,
          totalSleepTime: 420,
          sleepOnsetLatency: 20,
          wakeAfterSleepOnset: 30,
        },
      }))
    ),
    predict: jest.fn().mockReturnValue(null),
  },
}));

jest.mock('../../../../src/bot/services/CausalInsightsService', () => ({
  causalInsightsService: {
    buildCausalGraph: jest.fn().mockReturnValue({
      nodes: [
        { id: 'SE', name: 'Sleep Efficiency', type: 'outcome', value: 0.75 },
        { id: 'anxiety', name: 'Anxiety', type: 'factor', value: 0.6 },
      ],
      edges: [
        { from: 'anxiety', to: 'SE', strength: 0.7, direction: 'negative' },
      ],
    }),
    getPersonalizedInsights: jest.fn().mockReturnValue([
      {
        factor: 'anxiety',
        strength: 0.7,
        direction: 'negative',
        narrative: 'Тревога влияет на ваш сон',
        actionable: true,
        interventions: ['relaxation'],
      },
    ]),
    getTopInterventionTargets: jest.fn().mockReturnValue([
      {
        factor: 'anxiety',
        expectedImpact: 0.15,
        interventions: [
          { name: 'PMR', description: 'Прогрессивная мышечная релаксация' },
        ],
      },
    ]),
  },
}));

describe('InsightsCommand', () => {
  let command: InsightsCommand;

  beforeEach(() => {
    command = new InsightsCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('insights');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Почему');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('why');
      expect(command.aliases).toContain('почему');
      expect(command.aliases).toContain('причины');
      expect(command.aliases).toContain('анализ');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });
  });

  describe('execute()', () => {
    it('should show no session message when session is missing', async () => {
      const ctx = createMockContextNoSession();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Сессия');
    });

    it('should show insights dashboard when session and data available', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should have navigation keyboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle causes callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'insights:causes', {});

      assertSuccessWithMessage(result);
    });

    it('should handle graph callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'insights:graph', {});

      assertSuccessWithMessage(result);
    });

    it('should default to dashboard for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'insights:unknown', {});

      assertSuccessWithMessage(result);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(insightsCommand).toBeInstanceOf(InsightsCommand);
      expect(insightsCommand.name).toBe('insights');
    });
  });
});
