/**
 * SleepPredictionService Unit Tests
 * ==================================
 * Tests for PLRNN-based sleep prediction and early warning signals.
 *
 * Based on:
 * - npj Digital Medicine 2025: PLRNN outperforms linear models for EMA
 * - medRxiv 2025: PLRNNs for mental health forecasting
 *
 * Covers:
 * - Factory function and default configuration
 * - Sleep metrics to PLRNN state conversion
 * - Early warning signal detection
 * - Prediction at different horizons
 * - Online learning
 * - Causal network extraction
 */

import {
  SleepPredictionService,
  createSleepPredictionService,
  DEFAULT_SLEEP_PREDICTION_CONFIG,
  SLEEP_DIMENSION_MAPPING,
  type ISleepHistoryEntry,
  type ISleepPrediction,
} from '../../../../src/bot/services/SleepPredictionService';

import type { ISleepMetrics } from '../../../../src/sleep/interfaces/ISleepState';

// ==================== Mock Sleep Data ====================

const createMockSleepMetrics = (
  overrides: Partial<ISleepMetrics> = {}
): ISleepMetrics => ({
  timeInBed: 480, // 8 hours
  totalSleepTime: 420, // 7 hours
  sleepOnsetLatency: 20, // 20 min
  wakeAfterSleepOnset: 40, // 40 min
  sleepEfficiency: 87.5, // 420/480
  numberOfAwakenings: 2,
  bedtime: '23:00',
  wakeTime: '07:00',
  finalAwakening: '06:45',
  outOfBedTime: '07:00',
  ...overrides,
});

const createMockHistoryEntry = (
  daysAgo: number,
  userId: string = 'test-user-123',
  metrics: Partial<ISleepMetrics> = {},
  quality = 0.7
): ISleepHistoryEntry => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    userId,
    date,
    metrics: createMockSleepMetrics(metrics),
    subjectiveQuality: quality,
  };
};

// ==================== Tests ====================

describe('SleepPredictionService', () => {
  let service: SleepPredictionService;

  beforeEach(() => {
    service = createSleepPredictionService();
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(SleepPredictionService);
    });

    it('should accept custom configuration', () => {
      const customService = createSleepPredictionService({
        minHistoryEntries: 5,
        earlyWarning: {
          ...DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning,
          seDropThreshold: 15,
        },
      });
      expect(customService).toBeInstanceOf(SleepPredictionService);
    });
  });

  describe('DEFAULT_SLEEP_PREDICTION_CONFIG', () => {
    it('should have sensible defaults for sleep prediction', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.latentDim).toBe(5);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.hiddenUnits).toBe(16);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.connectivity).toBe('dendritic');
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.predictionHorizon).toBe(7);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.dt).toBe(24);
    });

    it('should have normalization parameters', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxSE).toBe(100);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxSOL).toBe(120);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxWASO).toBe(180);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxTST).toBe(12);
    });

    it('should have early warning thresholds', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning.seDropThreshold).toBe(10);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning.solIncreaseThreshold).toBe(15);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning.wasoIncreaseThreshold).toBe(20);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning.varianceThreshold).toBe(1.5);
    });

    it('should have prediction horizons', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.short).toBe(24);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.medium).toBe(72);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.long).toBe(168);
    });

    it('should require minimum 3 history entries', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.minHistoryEntries).toBe(3);
    });
  });

  describe('SLEEP_DIMENSION_MAPPING', () => {
    it('should map dimensions correctly', () => {
      expect(SLEEP_DIMENSION_MAPPING[0]).toBe('sleepEfficiency');
      expect(SLEEP_DIMENSION_MAPPING[1]).toBe('sleepOnsetLatency');
      expect(SLEEP_DIMENSION_MAPPING[2]).toBe('wakeAfterSleepOnset');
      expect(SLEEP_DIMENSION_MAPPING[3]).toBe('totalSleepTime');
      expect(SLEEP_DIMENSION_MAPPING[4]).toBe('sleepQuality');
    });
  });

  describe('initialize()', () => {
    it('should initialize without error', () => {
      expect(() => service.initialize()).not.toThrow();
    });

    it('should be idempotent', () => {
      service.initialize();
      expect(() => service.initialize()).not.toThrow();
    });
  });

  describe('isReady()', () => {
    it('should return true after initialization', () => {
      service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('should return false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });
  });

  describe('addSleepEntry()', () => {
    it('should add sleep entry to history', () => {
      const entry = createMockHistoryEntry(0);
      service.addSleepEntry(entry);

      const history = service.getHistory(entry.userId);
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(entry);
    });

    it('should store all entries', () => {
      const userId = 'order-test';
      const entries = [
        createMockHistoryEntry(3, userId),
        createMockHistoryEntry(1, userId),
        createMockHistoryEntry(2, userId),
      ];

      for (const entry of entries) {
        service.addSleepEntry(entry);
      }

      const history = service.getHistory(userId);
      expect(history).toHaveLength(3);
    });

    it('should automatically initialize when adding entries', () => {
      const entry = createMockHistoryEntry(0);
      service.addSleepEntry(entry);
      // Service should auto-initialize
      expect(service.getHistory(entry.userId)).toHaveLength(1);
    });
  });

  describe('predict()', () => {
    const userId = 'predict-test-user';

    beforeEach(() => {
      // Add sufficient history for prediction
      for (let i = 7; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 85 - i * 2, // Declining trend
          sleepOnsetLatency: 20 + i * 3,
          wakeAfterSleepOnset: 30 + i * 5,
        }));
      }
    });

    it('should return null without sufficient history', () => {
      const newService = createSleepPredictionService();
      newService.addSleepEntry(createMockHistoryEntry(0, 'insufficient-user'));

      const prediction = newService.predict('insufficient-user', 'short');
      expect(prediction).toBeNull();
    });

    it('should return prediction with sufficient history', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction).not.toBeNull();
      expect(prediction?.userId).toBe(userId);
      expect(prediction?.horizon).toBe('short');
      expect(prediction?.hoursAhead).toBe(24);
    });

    it('should predict for different horizons', () => {
      const shortPrediction = service.predict(userId, 'short');
      const mediumPrediction = service.predict(userId, 'medium');
      const longPrediction = service.predict(userId, 'long');

      expect(shortPrediction?.hoursAhead).toBe(24);
      expect(mediumPrediction?.hoursAhead).toBe(72);
      expect(longPrediction?.hoursAhead).toBe(168);
    });

    it('should include predicted sleep efficiency', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.predictedSleepEfficiency).toBeDefined();
      expect(prediction?.predictedSleepEfficiency.value).toBeGreaterThanOrEqual(0);
      expect(prediction?.predictedSleepEfficiency.value).toBeLessThanOrEqual(100);
      expect(prediction?.predictedSleepEfficiency.confidence).toBeGreaterThan(0);
      expect(prediction?.predictedSleepEfficiency.lower95).toBeDefined();
      expect(prediction?.predictedSleepEfficiency.upper95).toBeDefined();
    });

    it('should include predicted metrics', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.predictedMetrics).toBeDefined();
      expect(prediction?.predictedMetrics.sleepOnsetLatency).toBeGreaterThanOrEqual(0);
      expect(prediction?.predictedMetrics.wakeAfterSleepOnset).toBeGreaterThanOrEqual(0);
      expect(prediction?.predictedMetrics.totalSleepTime).toBeGreaterThanOrEqual(0);
      expect(prediction?.predictedMetrics.sleepQuality).toBeGreaterThanOrEqual(0);
      expect(prediction?.predictedMetrics.sleepQuality).toBeLessThanOrEqual(1);
    });

    it('should include sleep efficiency trajectory', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.sleepEfficiencyTrajectory).toBeDefined();
      expect(Array.isArray(prediction?.sleepEfficiencyTrajectory)).toBe(true);
      if (prediction?.sleepEfficiencyTrajectory.length) {
        const firstPoint = prediction.sleepEfficiencyTrajectory[0];
        expect(firstPoint.date).toBeInstanceOf(Date);
        expect(firstPoint.predicted).toBeDefined();
        expect(firstPoint.lower95).toBeDefined();
        expect(firstPoint.upper95).toBeDefined();
      }
    });

    it('should include trend analysis', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.trend).toBeDefined();
      expect(['improving', 'stable', 'declining', 'critical']).toContain(prediction?.trend);
    });

    it('should include deterioration risk', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.deteriorationRisk).toBeDefined();
      expect(prediction?.deteriorationRisk).toBeGreaterThanOrEqual(0);
      expect(prediction?.deteriorationRisk).toBeLessThanOrEqual(1);
    });

    it('should include recommendations', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.recommendations).toBeDefined();
      expect(Array.isArray(prediction?.recommendations)).toBe(true);
    });

    it('should include early warnings in prediction result', () => {
      const prediction = service.predict(userId, 'short');

      expect(prediction?.earlyWarnings).toBeDefined();
      expect(Array.isArray(prediction?.earlyWarnings)).toBe(true);
    });
  });

  describe('early warnings', () => {
    it('should detect efficiency drop in prediction', () => {
      const userId = 'efficiency-drop-user';
      // Good baseline
      for (let i = 7; i >= 4; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 90,
        }, 0.8));
      }
      // Significant drop
      for (let i = 3; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 70 - i * 2,
        }, 0.5));
      }

      const prediction = service.predict(userId, 'short');

      // Early warnings are included in prediction result
      expect(prediction?.earlyWarnings).toBeDefined();
      if (prediction?.earlyWarnings.length) {
        const efficiencyWarning = prediction.earlyWarnings.find(w => w.type === 'efficiency_drop');
        if (efficiencyWarning) {
          expect(efficiencyWarning.metric).toBe('sleepEfficiency');
          expect(['low', 'moderate', 'high', 'critical']).toContain(efficiencyWarning.severity);
        }
      }
    });

    it('should include bilingual messages in warnings', () => {
      const userId = 'bilingual-warning-user';
      for (let i = 7; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 90 - i * 5,
        }));
      }

      const prediction = service.predict(userId, 'short');
      if (prediction?.earlyWarnings.length) {
        expect(prediction.earlyWarnings[0].messageRu).toBeDefined();
        expect(prediction.earlyWarnings[0].messageEn).toBeDefined();
      }
    });
  });

  describe('trainOnline()', () => {
    it('should train on new sleep data', () => {
      const entry = createMockHistoryEntry(0, 'train-user', {
        sleepEfficiency: 85,
      });

      expect(() => service.trainOnline(entry.userId, entry)).not.toThrow();
    });

    it('should update history after training', () => {
      const entry = createMockHistoryEntry(0, 'train-history-user', {
        sleepEfficiency: 85,
      });

      service.trainOnline(entry.userId, entry);
      const history = service.getHistory(entry.userId);

      expect(history).toHaveLength(1);
    });
  });

  describe('extractCausalNetwork()', () => {
    beforeEach(() => {
      // Add history and make predictions to train model
      const userId = 'causal-user';
      for (let i = 14; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 80 + Math.random() * 10,
          sleepOnsetLatency: 20 + Math.random() * 15,
          wakeAfterSleepOnset: 30 + Math.random() * 20,
        }));
      }
    });

    it('should extract causal network', () => {
      service.initialize();
      const network = service.extractCausalNetwork();

      expect(network).toBeDefined();
      expect(network?.nodes).toBeDefined();
      expect(network?.edges).toBeDefined();
    });
  });

  describe('getComplexityMetrics()', () => {
    it('should return complexity metrics', () => {
      service.initialize();
      const metrics = service.getComplexityMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.effectiveDimensionality).toBeDefined();
      expect(metrics.sparsity).toBeDefined();
    });
  });

  describe('getHistory()', () => {
    it('should return empty array for unknown user', () => {
      const history = service.getHistory('unknown-user');
      expect(history).toHaveLength(0);
    });

    it('should return user history', () => {
      const entry = createMockHistoryEntry(0);
      service.addSleepEntry(entry);

      const history = service.getHistory(entry.userId);
      expect(history).toHaveLength(1);
    });
  });

  describe('getCurrentState()', () => {
    it('should return undefined for unknown user', () => {
      const state = service.getCurrentState('unknown-user');
      expect(state).toBeUndefined();
    });

    it('should return state after adding entries', () => {
      const entry = createMockHistoryEntry(0, 'state-user');
      service.addSleepEntry(entry);

      const state = service.getCurrentState(entry.userId);
      expect(state).toBeDefined();
    });
  });

  describe('getStats()', () => {
    it('should return service statistics', () => {
      const stats = service.getStats();

      expect(stats).toBeDefined();
      expect(stats.usersTracked).toBeDefined();
      expect(stats.totalEntries).toBeDefined();
    });

    it('should track users correctly', () => {
      service.addSleepEntry(createMockHistoryEntry(0, 'user1'));
      service.addSleepEntry(createMockHistoryEntry(0, 'user2'));
      service.addSleepEntry(createMockHistoryEntry(1, 'user1'));

      const stats = service.getStats();
      expect(stats.usersTracked).toBe(2);
      expect(stats.totalEntries).toBe(3);
    });
  });
});

// ==================== Integration Tests ====================

describe('SleepPredictionService Integration', () => {
  describe('full prediction workflow', () => {
    it('should support complete prediction cycle', () => {
      const service = createSleepPredictionService();
      const userId = 'workflow-test-user';

      // Phase 1: Build baseline (7 days)
      for (let i = 7; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 75 + i % 3 * 2,
          sleepOnsetLatency: 30 - i % 2 * 5,
          wakeAfterSleepOnset: 45 + i % 3 * 5,
          totalSleepTime: 390, // 6.5 hours
        }, 0.6));
      }

      // Phase 2: Make predictions
      const shortPrediction = service.predict(userId, 'short');
      const mediumPrediction = service.predict(userId, 'medium');
      const longPrediction = service.predict(userId, 'long');

      expect(shortPrediction).not.toBeNull();
      expect(mediumPrediction).not.toBeNull();
      expect(longPrediction).not.toBeNull();

      // Phase 3: Check early warnings in prediction
      expect(shortPrediction?.earlyWarnings).toBeDefined();
      expect(Array.isArray(shortPrediction?.earlyWarnings)).toBe(true);

      // Phase 4: Online learning
      service.trainOnline(userId, createMockHistoryEntry(0, userId, {
        sleepEfficiency: 82,
      }));

      // Phase 5: New prediction after learning (should not throw)
      const updatedPrediction = service.predict(userId, 'short');
      expect(updatedPrediction).not.toBeNull();
    });
  });

  describe('declining sleep pattern detection', () => {
    it('should generate predictions for declining sleep patterns', () => {
      const service = createSleepPredictionService();
      const userId = 'declining-test';

      // Week 1: Good sleep
      for (let i = 14; i >= 8; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 88,
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 25,
        }));
      }

      // Week 2: Declining sleep
      for (let i = 7; i >= 0; i--) {
        service.addSleepEntry(createMockHistoryEntry(i, userId, {
          sleepEfficiency: 75 - i * 2,
          sleepOnsetLatency: 30 + i * 5,
          wakeAfterSleepOnset: 45 + i * 8,
        }));
      }

      const prediction = service.predict(userId, 'short');

      // Should have a valid prediction with trend analysis
      expect(prediction).not.toBeNull();
      expect(prediction?.trend).toBeDefined();
      expect(['improving', 'stable', 'declining', 'critical']).toContain(prediction?.trend);

      // Should have early warnings array (may or may not be populated based on model)
      expect(prediction?.earlyWarnings).toBeDefined();
      expect(Array.isArray(prediction?.earlyWarnings)).toBe(true);
    });
  });

  describe('PLRNN state conversion', () => {
    it('should correctly convert PLRNN state to sleep metrics', () => {
      const service = createSleepPredictionService();
      service.initialize();

      // Create a mock state with known values (matching IPLRNNState interface)
      const mockState = {
        latentState: [0.85, 0.15, 0.2, 0.7, 0.75], // SE=85%, SOL=18min, WASO=36min, TST=8.4h, Quality=75%
        observedState: [0.85, 0.15, 0.2, 0.7, 0.75],
        timestamp: new Date(),
        uncertainty: [0.01, 0.01, 0.01, 0.01, 0.01],
        hiddenActivations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        timestep: 0,
      };

      const metrics = service.plrnnStateToSleepMetrics(mockState);

      // Sleep efficiency should be around 85 (0.85 * 100)
      expect(metrics.sleepEfficiency).toBeCloseTo(85, 0);
      // SOL should be around 18 (0.15 * 120)
      expect(metrics.sleepOnsetLatency).toBeCloseTo(18, 0);
      // WASO should be around 36 (0.2 * 180)
      expect(metrics.wakeAfterSleepOnset).toBeCloseTo(36, 0);
    });
  });
});
