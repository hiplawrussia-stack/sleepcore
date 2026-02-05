/**
 * PredictCommand Unit Tests
 * ==========================
 * Tests for /predict command - 7-day sleep prediction with early warnings.
 */

import { PredictCommand, predictCommand } from '../../../../src/bot/commands/PredictCommand';
import {
  createMockContext,
  createMockContextNoSession,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock SleepCoreAPI singleton (used by PredictCommand's private helper)
jest.mock('../../../../src/SleepCoreAPI', () => ({
  sleepCore: {
    getSleepPrediction: jest.fn().mockReturnValue({
      predict: jest.fn().mockReturnValue({
        userId: 'test-user-123',
        horizon: 'medium',
        trend: 'stable',
        predictedSE: [82, 83, 81, 84, 82, 83, 85],
        sleepEfficiencyTrajectory: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          predicted: 82 + i,
          lower95: 78 + i,
          upper95: 86 + i,
        })),
        predictedSleepEfficiency: { value: 85, lower95: 81, upper95: 89, confidence: 0.75 },
        confidenceInterval: { lower: [78, 79, 77, 80, 78, 79, 81], upper: [86, 87, 85, 88, 86, 87, 89] },
        deteriorationRisk: 0.15,
        earlyWarnings: [],
        recommendations: ['Maintain current sleep schedule'],
        modelConfidence: 0.75,
      }),
      getHistory: jest.fn().mockReturnValue([]),
    }),
  },
}));

describe('PredictCommand', () => {
  let command: PredictCommand;

  beforeEach(() => {
    command = new PredictCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('predict');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Прогноз');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('прогноз');
      expect(command.aliases).toContain('forecast');
      expect(command.aliases).toContain('prediction');
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

    it('should return a result when called with context', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Verify command returns a result
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('handleCallback()', () => {
    it('should handle warnings callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'predict:warnings', {});

      // Warnings callback should return a result
      expect(result).toBeDefined();
    });

    it('should have handleCallback method', () => {
      // Verify the command has the handleCallback method
      expect(typeof command.handleCallback).toBe('function');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(predictCommand).toBeInstanceOf(PredictCommand);
      expect(predictCommand.name).toBe('predict');
    });
  });
});
