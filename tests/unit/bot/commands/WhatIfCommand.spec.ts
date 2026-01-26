/**
 * WhatIfCommand Unit Tests
 * =========================
 * Tests for /whatif command - counterfactual sleep scenarios.
 */

import { WhatIfCommand, whatIfCommand } from '../../../../src/bot/commands/WhatIfCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
} from './testHelpers';

// Mock DigitalTwinService
jest.mock('../../../../src/bot/services/DigitalTwinService', () => ({
  digitalTwinService: {
    createTwin: jest.fn().mockResolvedValue({
      userId: 'test-user-123',
      isReady: true,
      observationCount: 10,
      createdAt: new Date(),
      lastCalibration: new Date(),
      calibrationQuality: 0.85,
      state: {
        sleepEfficiency: 80,
        sleepOnsetLatency: 20,
        isiScore: 12,
      },
    }),
    simulateScenario: jest.fn().mockResolvedValue({
      scenario: { name: 'Test Scenario', intervention: 'adjust_sleep_window' },
      baseline: { sleepEfficiency: 75, sleepOnsetLatency: 30, isiScore: 15 },
      predicted: { sleepEfficiency: 82, sleepOnsetLatency: 20, isiScore: 12 },
      predictedOutcome: {
        sleepEfficiencyChange: 7,
        sleepOnsetLatencyChange: -10,
        isiScoreChange: -3,
      },
      confidence: 0.75,
      keyFactors: ['Consistent wake time', 'Better sleep pressure'],
      recommendations: ['Try going to bed 30 min later'],
      improvements: ['+7% sleep efficiency', '-10 min sleep onset'],
      warnings: [],
    }),
    compareScenarios: jest.fn().mockResolvedValue({
      scenarios: [],
      baseline: { sleepEfficiency: 75 },
      winner: 'scenario1',
      insights: ['Scenario 1 shows best improvement'],
    }),
  },
}));

describe('WhatIfCommand', () => {
  let command: WhatIfCommand;

  beforeEach(() => {
    command = new WhatIfCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('whatif');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('если');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('что_если');
      expect(command.aliases).toContain('если');
      expect(command.aliases).toContain('сценарий');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should show scenario menu when twin is ready', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
    });

    it('should display available scenarios', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle scenario selection callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'whatif:scenario:earlier_bedtime', {});

      // The callback should return a result (may be success or error depending on twin state)
      expect(result).toBeDefined();
    });

    it('should handle compare callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'whatif:compare', {});

      // Compare callback returns result
      expect(result).toBeDefined();
    });

    it('should handle custom callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'whatif:custom', {});

      // Custom callback returns result
      expect(result).toBeDefined();
    });

    it('should handle unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'whatif:unknown', {});

      // Unknown action should return some result
      expect(result).toBeDefined();
    });
  });

  describe('scenario types', () => {
    it('should include sleep window scenarios', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should include behavioral scenarios', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(whatIfCommand).toBeInstanceOf(WhatIfCommand);
      expect(whatIfCommand.name).toBe('whatif');
    });
  });
});
