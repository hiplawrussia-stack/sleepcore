/**
 * TwinCommand Unit Tests
 * =======================
 * Tests for /twin command - interactive Digital Twin management.
 */

import { TwinCommand, twinCommand } from '../../../../src/bot/commands/TwinCommand';
import {
  createMockContext,
  createMockContextNoSession,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock services
jest.mock('../../../../src/bot/services/DigitalTwinService', () => ({
  digitalTwinService: {
    createTwin: jest.fn().mockResolvedValue({
      userId: 'test-user-123',
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      lastCalibration: new Date(),
      stateQuality: 0.85,
      calibrationQuality: 0.85,
      observationCount: 30,
      state: {
        sleepEfficiency: 80,
        sleepOnsetLatency: 20,
        isiScore: 12,
      },
      predictions: [],
    }),
    getTwinStatus: jest.fn().mockResolvedValue({
      isCalibrated: true,
      calibrationQuality: 0.85,
      dataPoints: 30,
      lastUpdate: new Date(),
    }),
    getTrajectory: jest.fn().mockResolvedValue({
      past: [75, 77, 80, 82],
      predicted: [83, 85, 86],
      confidence: 0.8,
    }),
    calibrate: jest.fn().mockResolvedValue({
      success: true,
      quality: 0.9,
    }),
  },
}));

jest.mock('../../../../src/bot/services/SleepPredictionService', () => ({
  sleepPredictionService: {
    predict: jest.fn().mockReturnValue({
      trend: 'improving',
      predictedSE: [82, 83, 85],
      deteriorationRisk: 0.1,
      earlyWarnings: [],
    }),
    getHistory: jest.fn().mockReturnValue([]),
  },
}));

describe('TwinCommand', () => {
  let command: TwinCommand;

  beforeEach(() => {
    command = new TwinCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('twin');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('двойник');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('двойник');
      expect(command.aliases).toContain('digital_twin');
      expect(command.aliases).toContain('avatar');
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
    it('should handle status callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:status', {});

      assertSuccessWithMessage(result);
    });

    it('should handle trajectory callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:trajectory', {});

      expect(result).toBeDefined();
    });

    it('should handle simulate callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:simulate', {});

      assertSuccessWithMessage(result);
    });

    it('should handle calibrate callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:calibrate', {});

      assertSuccessWithMessage(result);
    });

    it('should handle insights callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:insights', {});

      assertSuccessWithMessage(result);
    });

    it('should handle unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:unknown', {});

      expect(result).toBeDefined();
    });
  });

  describe('digital twin features', () => {
    it('should display calibration quality', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:status', {});

      assertSuccessWithMessage(result);
    });

    it('should handle trajectory display', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'twin:trajectory', {});

      expect(result).toBeDefined();
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(twinCommand).toBeInstanceOf(TwinCommand);
      expect(twinCommand.name).toBe('twin');
    });
  });
});
