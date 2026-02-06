/**
 * PAT Adapter Tests
 * =================
 * Tests for the Pretrained Actigraphy Transformer adapter.
 *
 * @packageDocumentation
 */

import {
  PATAdapter,
  createPATAdapter,
  PAT_ARCHITECTURES,
  DEFAULT_PAT_CONFIG,
  type IPATConfig,
} from '../../../../src/sleep/services/PATAdapter';

import type {
  IActigraphySession,
  IActivityCount,
  IDailyActigraphySummary,
  IPATPrediction,
} from '../../../../src/sleep/interfaces/IActigraphy';

describe('PATAdapter', () => {
  let adapter: PATAdapter;

  beforeEach(() => {
    adapter = new PATAdapter();
  });

  // ==========================================================================
  // Factory
  // ==========================================================================
  describe('Factory', () => {
    it('should create adapter with default config', () => {
      const created = createPATAdapter();
      expect(created).toBeInstanceOf(PATAdapter);
    });

    it('should create adapter with custom config', () => {
      const created = createPATAdapter({
        variant: 'PAT-L',
        backend: 'simulated',
      });
      expect(created.getConfig().variant).toBe('PAT-L');
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should not be ready before initialization', () => {
      expect(adapter.isReady()).toBe(false);
    });

    it('should be ready after initialization', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });

    it('should initialize only once', async () => {
      await adapter.initialize();
      await adapter.initialize(); // Second call should be no-op
      expect(adapter.isReady()).toBe(true);
    });

    it('should use simulated backend by default', async () => {
      await adapter.initialize();
      const info = adapter.getModelInfo();
      expect(info.backend).toBe('simulated');
      expect(info.version).toContain('simulated');
    });
  });

  // ==========================================================================
  // Model Architecture
  // ==========================================================================
  describe('Model Architecture', () => {
    it('should have correct PAT-S architecture', () => {
      expect(PAT_ARCHITECTURES['PAT-S']).toEqual({
        encoderLayers: 1,
        attentionHeads: 6,
        embeddingDim: 96,
        ffDim: 256,
        patchSize: 18,
        dropout: 0.1,
        parameters: 500000,
      });
    });

    it('should have correct PAT-M architecture', () => {
      expect(PAT_ARCHITECTURES['PAT-M'].encoderLayers).toBe(2);
      expect(PAT_ARCHITECTURES['PAT-M'].attentionHeads).toBe(12);
    });

    it('should have correct PAT-L architecture', () => {
      expect(PAT_ARCHITECTURES['PAT-L'].encoderLayers).toBe(4);
      expect(PAT_ARCHITECTURES['PAT-L'].patchSize).toBe(9);
      expect(PAT_ARCHITECTURES['PAT-L'].parameters).toBeLessThan(2000000);
    });
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should return default config', () => {
      const config = adapter.getConfig();
      expect(config.variant).toBe('PAT-M');
      expect(config.backend).toBe('simulated');
      expect(config.minSequenceLength).toBe(60);
      expect(config.maxSequenceLength).toBe(10080);
    });

    it('should accept custom preprocessing config', () => {
      const customAdapter = new PATAdapter({
        preprocessing: {
          targetEpochSeconds: 60,
          nonWearAlgorithm: 'troiano',
          nonWearThreshold: 60,
          minValidWearHours: 8,
          smoothingWindow: 3,
          normalization: 'minmax',
          missingDataStrategy: 'zero',
          outlierPercentile: 95,
        },
      });

      const config = customAdapter.getConfig();
      expect(config.preprocessing.nonWearAlgorithm).toBe('troiano');
      expect(config.preprocessing.normalization).toBe('minmax');
    });
  });

  // ==========================================================================
  // Model Info
  // ==========================================================================
  describe('Model Info', () => {
    it('should return model information', async () => {
      await adapter.initialize();
      const info = adapter.getModelInfo();

      expect(info.variant).toBe('PAT-M');
      expect(info.backend).toBe('simulated');
      expect(info.version).toBeDefined();
      expect(info.architecture).toBeDefined();
      expect(info.isReady).toBe(true);
    });

    it('should include architecture details', async () => {
      await adapter.initialize();
      const info = adapter.getModelInfo();

      expect(info.architecture.encoderLayers).toBe(2);
      expect(info.architecture.attentionHeads).toBe(12);
      expect(info.architecture.embeddingDim).toBe(96);
    });
  });

  // ==========================================================================
  // Preprocessing
  // ==========================================================================
  describe('Preprocessing', () => {
    const createTestSession = (minuteCount: number): IActigraphySession => {
      const epochs: IActivityCount[] = [];
      const startTime = new Date('2025-01-20T00:00:00Z');

      for (let i = 0; i < minuteCount; i++) {
        const hour = Math.floor(i / 60) % 24;
        // Activity pattern: low at night (0-6), high during day (8-20)
        const isNight = hour < 6 || hour >= 22;
        const baseActivity = isNight ? 20 : 500;
        const count = baseActivity + Math.random() * 100;

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count: Math.round(count),
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }

      return {
        userId: 'test-user',
        sessionId: 'test-session',
        source: 'apple_watch',
        startTime,
        endTime: new Date(startTime.getTime() + minuteCount * 60000),
        epochLength: 60,
        epochs,
        dailySummaries: [],
        dataQuality: 0.95,
      };
    };

    it('should preprocess session to PAT input', () => {
      const session = createTestSession(1440); // 1 day
      const input = adapter.preprocessSession(session);

      expect(input.userId).toBe('test-user');
      expect(input.sequenceLength).toBe(1440);
      expect(input.activitySequence.length).toBe(1440);
      expect(input.validMask.length).toBe(1440);
      expect(input.timeOfDayEncoding.length).toBe(1440);
      expect(input.dayOfWeekEncoding.length).toBe(1440);
    });

    it('should normalize activity values to 0-1 range', () => {
      const session = createTestSession(60);
      const input = adapter.preprocessSession(session);

      for (const val of input.activitySequence) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('should create time of day encoding', () => {
      const session = createTestSession(1440);
      const input = adapter.preprocessSession(session);

      // Time encoding should be 0-1 (minutes 0-1440 normalized)
      for (const tod of input.timeOfDayEncoding) {
        expect(tod).toBeGreaterThanOrEqual(0);
        expect(tod).toBeLessThanOrEqual(1);
      }
    });

    it('should mark non-worn periods in validity mask', () => {
      const session = createTestSession(120);
      // Mark some epochs as non-worn
      for (let i = 30; i < 60; i++) {
        const epoch = session.epochs[i];
        if (epoch) {
          (session.epochs[i] as IActivityCount) = {
            ...epoch,
            isWorn: false,
          };
        }
      }

      const input = adapter.preprocessSession(session);

      // First 30 should be valid
      expect(input.validMask.slice(0, 30).every(v => v === 1)).toBe(true);
      // 30-60 should be invalid
      expect(input.validMask.slice(30, 60).every(v => v === 0)).toBe(true);
    });
  });

  // ==========================================================================
  // Prediction
  // ==========================================================================
  describe('Prediction', () => {
    const createValidSession = (days: number = 7): IActigraphySession => {
      const epochs: IActivityCount[] = [];
      const startTime = new Date('2025-01-20T00:00:00Z');
      const minuteCount = days * 1440;

      for (let i = 0; i < minuteCount; i++) {
        const hour = Math.floor(i / 60) % 24;
        const isNight = hour < 6 || hour >= 22;
        const baseActivity = isNight ? 30 : 400;
        const count = baseActivity + Math.random() * 100;

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count: Math.round(count),
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }

      const dailySummaries: IDailyActigraphySummary[] = [];
      for (let d = 0; d < days; d++) {
        dailySummaries.push({
          date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
          totalActivityCounts: 50000 + Math.random() * 10000,
          totalSteps: 8000 + Math.random() * 2000,
          sedentaryMinutes: 600,
          lightActivityMinutes: 300,
          moderateActivityMinutes: 30,
          vigorousActivityMinutes: 10,
          mvpaMinutes: 40,
          nonWearMinutes: 60,
          validWearHours: 16,
        });
      }

      return {
        userId: 'test-user',
        sessionId: 'test-session',
        source: 'apple_watch',
        startTime,
        endTime: new Date(startTime.getTime() + minuteCount * 60000),
        epochLength: 60,
        epochs,
        dailySummaries,
        dataQuality: 0.95,
      };
    };

    it('should predict from valid session', async () => {
      await adapter.initialize();
      const session = createValidSession(3);
      const prediction = await adapter.predict(session);

      expect(prediction.userId).toBe('test-user');
      expect(prediction.timestamp).toBeInstanceOf(Date);
      expect(prediction.phenotype).toBeDefined();
      expect(prediction.predictedMetrics).toBeDefined();
      expect(prediction.riskScores).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.modelVersion).toContain('simulated');
    });

    it('should classify sleep phenotype', async () => {
      await adapter.initialize();
      const session = createValidSession(7);
      const prediction = await adapter.predict(session);

      expect(prediction.phenotype.primaryPhenotype).toBeDefined();
      expect(prediction.phenotype.probabilities).toBeDefined();
      expect(prediction.phenotype.confidence).toBeGreaterThan(0);
      expect(prediction.phenotype.stability).toBeDefined();

      // All probabilities should sum to ~1
      const probSum = Object.values(prediction.phenotype.probabilities)
        .reduce((a, b) => a + b, 0);
      expect(probSum).toBeCloseTo(1, 1);
    });

    it('should predict sleep metrics', async () => {
      await adapter.initialize();
      const session = createValidSession(7);
      const prediction = await adapter.predict(session);

      expect(prediction.predictedMetrics.sleepDuration).toBeGreaterThan(0);
      expect(prediction.predictedMetrics.sleepEfficiency).toBeGreaterThan(0);
      expect(prediction.predictedMetrics.sleepEfficiency).toBeLessThanOrEqual(100);
      expect(prediction.predictedMetrics.sleepOnset).toMatch(/^\d{2}:\d{2}$/);
      expect(prediction.predictedMetrics.wakeTime).toMatch(/^\d{2}:\d{2}$/);
      expect(prediction.predictedMetrics.fragmentation).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedMetrics.fragmentation).toBeLessThanOrEqual(1);
    });

    it('should calculate risk scores', async () => {
      await adapter.initialize();
      const session = createValidSession(7);
      const prediction = await adapter.predict(session);

      expect(prediction.riskScores.insomniaRisk).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScores.insomniaRisk).toBeLessThanOrEqual(1);
      expect(prediction.riskScores.sleepApneaRisk).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScores.circadianDisruptionRisk).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScores.sleepDeprivationRisk).toBeGreaterThanOrEqual(0);
    });

    it('should include attributions when configured', async () => {
      adapter = new PATAdapter({ returnAttention: true });
      await adapter.initialize();
      const session = createValidSession(3);
      const prediction = await adapter.predict(session);

      expect(prediction.attributions).toBeDefined();
      expect(Array.isArray(prediction.attributions)).toBe(true);

      if (prediction.attributions && prediction.attributions.length > 0) {
        const attr = prediction.attributions[0];
        expect(attr).toBeDefined();
        if (attr) {
          expect(attr.startMinute).toBeDefined();
          expect(attr.endMinute).toBeDefined();
          expect(attr.score).toBeDefined();
          expect(attr.interpretation).toBeDefined();
        }
      }
    });

    it('should reject insufficient data', async () => {
      await adapter.initialize();
      const session = createValidSession(1);
      // Reduce to less than minimum sequence length
      session.epochs.splice(30); // Only 30 minutes

      await expect(adapter.predict(session)).rejects.toThrow('Insufficient data');
    });

    it('should auto-initialize on predict if not initialized', async () => {
      const session = createValidSession(3);
      const prediction = await adapter.predict(session);

      expect(adapter.isReady()).toBe(true);
      expect(prediction).toBeDefined();
    });
  });

  // ==========================================================================
  // Phenotype Classification
  // ==========================================================================
  describe('Phenotype Classification', () => {
    it('should classify healthy sleeper pattern', async () => {
      await adapter.initialize();

      // Create session with regular sleep pattern
      const session = createRegularSleepSession();
      const prediction = await adapter.predict(session);

      // Should lean toward healthy or stable phenotype
      const healthyProb = prediction.phenotype.probabilities['healthy_sleeper'];
      expect(healthyProb).toBeGreaterThan(0);
    });

    it('should classify fragmented sleep pattern', async () => {
      await adapter.initialize();

      // Create session with high nocturnal activity
      const session = createFragmentedSleepSession();
      const prediction = await adapter.predict(session);

      // Fragmented should have higher probability
      const fragmentedProb = prediction.phenotype.probabilities['fragmented'];
      expect(fragmentedProb).toBeGreaterThan(0.1);
    });

    it('should classify delayed phase pattern', async () => {
      await adapter.initialize();

      // Create session with late activity onset
      const session = createDelayedPhaseSession();
      const prediction = await adapter.predict(session);

      // Delayed phase should have higher probability
      const delayedProb = prediction.phenotype.probabilities['delayed_phase'];
      expect(delayedProb).toBeGreaterThan(0);
    });

    it('should classify advanced phase pattern', async () => {
      await adapter.initialize();

      // Create session with early activity onset (waking before 5 AM)
      const session = createAdvancedPhaseSession();
      const prediction = await adapter.predict(session);

      // Advanced phase should have higher probability
      const advancedProb = prediction.phenotype.probabilities['advanced_phase'];
      expect(advancedProb).toBeGreaterThan(0);
    });

    it('should classify irregular pattern with high day-to-day variability', async () => {
      await adapter.initialize();

      // Create session with irregular patterns
      const session = createIrregularSleepSession();
      const prediction = await adapter.predict(session);

      // Irregular or social jetlag should have higher probability
      const irregularProb = prediction.phenotype.probabilities['irregular'];
      const socialJetlagProb = prediction.phenotype.probabilities['social_jetlag'];
      expect(irregularProb + socialJetlagProb).toBeGreaterThan(0.1);
    });

    it('should report variable stability for high variability patterns', async () => {
      await adapter.initialize();

      const session = createHighVariabilitySession();
      const prediction = await adapter.predict(session);

      // High variability should result in 'variable' or 'transitioning' stability
      expect(['variable', 'transitioning']).toContain(prediction.phenotype.stability);
    });

    it('should report stable stability for consistent patterns', async () => {
      await adapter.initialize();

      const session = createRegularSleepSession();
      const prediction = await adapter.predict(session);

      // Regular pattern should result in 'stable'
      expect(prediction.phenotype.stability).toBe('stable');
    });
  });

  // ==========================================================================
  // Different Backends
  // ==========================================================================
  describe('Backend Variants', () => {
    it('should initialize with tfjs backend (falls back to simulated)', async () => {
      const tfjsAdapter = new PATAdapter({ backend: 'tfjs' });
      await tfjsAdapter.initialize();

      expect(tfjsAdapter.isReady()).toBe(true);
      // Falls back to simulated since tfjs not implemented
      expect(tfjsAdapter.getModelInfo().version).toContain('simulated');
    });

    it('should initialize with onnx backend (falls back to simulated)', async () => {
      const onnxAdapter = new PATAdapter({ backend: 'onnx' });
      await onnxAdapter.initialize();

      expect(onnxAdapter.isReady()).toBe(true);
      // Falls back to simulated since onnx not implemented
      expect(onnxAdapter.getModelInfo().version).toContain('simulated');
    });

    it('should initialize with remote backend when URL provided', async () => {
      const remoteAdapter = new PATAdapter({
        backend: 'remote',
        remoteUrl: 'https://api.example.com/pat',
      });
      await remoteAdapter.initialize();

      expect(remoteAdapter.isReady()).toBe(true);
      expect(remoteAdapter.getModelInfo().version).toContain('remote');
    });

    it('should throw error for remote backend without URL', async () => {
      const remoteAdapter = new PATAdapter({ backend: 'remote' });

      await expect(remoteAdapter.initialize()).rejects.toThrow('Remote backend requires remoteUrl');
    });

    it('should predict using tfjs backend', async () => {
      const tfjsAdapter = new PATAdapter({ backend: 'tfjs' });
      await tfjsAdapter.initialize();

      const session = createRegularSleepSession();
      const prediction = await tfjsAdapter.predict(session);

      expect(prediction).toBeDefined();
      expect(prediction.phenotype).toBeDefined();
    });

    it('should predict using onnx backend', async () => {
      const onnxAdapter = new PATAdapter({ backend: 'onnx' });
      await onnxAdapter.initialize();

      const session = createRegularSleepSession();
      const prediction = await onnxAdapter.predict(session);

      expect(prediction).toBeDefined();
      expect(prediction.phenotype).toBeDefined();
    });
  });

  // ==========================================================================
  // Normalization Strategies
  // ==========================================================================
  describe('Normalization Strategies', () => {
    it('should normalize using minmax strategy', () => {
      const minmaxAdapter = new PATAdapter({
        preprocessing: {
          targetEpochSeconds: 60,
          nonWearAlgorithm: 'choi',
          nonWearThreshold: 90,
          minValidWearHours: 10,
          smoothingWindow: 1,
          normalization: 'minmax',
          missingDataStrategy: 'zero',
          outlierPercentile: 100,
        },
      });

      const session = createRegularSleepSession();
      const input = minmaxAdapter.preprocessSession(session);

      // All values should be between 0 and 1
      for (const val of input.activitySequence) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('should normalize using log strategy', () => {
      const logAdapter = new PATAdapter({
        preprocessing: {
          targetEpochSeconds: 60,
          nonWearAlgorithm: 'choi',
          nonWearThreshold: 90,
          minValidWearHours: 10,
          smoothingWindow: 1,
          normalization: 'log',
          missingDataStrategy: 'zero',
          outlierPercentile: 100,
        },
      });

      const session = createRegularSleepSession();
      const input = logAdapter.preprocessSession(session);

      // All values should be between 0 and 1
      for (const val of input.activitySequence) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('should normalize using zscore strategy', () => {
      const zscoreAdapter = new PATAdapter({
        preprocessing: {
          targetEpochSeconds: 60,
          nonWearAlgorithm: 'choi',
          nonWearThreshold: 90,
          minValidWearHours: 10,
          smoothingWindow: 1,
          normalization: 'zscore',
          missingDataStrategy: 'zero',
          outlierPercentile: 100,
        },
      });

      const session = createRegularSleepSession();
      const input = zscoreAdapter.preprocessSession(session);

      // Z-score normalized values should be between 0 and 1 (clipped to -3,3 then rescaled)
      for (const val of input.activitySequence) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // Missing Data Handling
  // ==========================================================================
  describe('Missing Data Handling', () => {
    it('should interpolate missing data when configured', () => {
      const interpolateAdapter = new PATAdapter({
        preprocessing: {
          targetEpochSeconds: 60,
          nonWearAlgorithm: 'choi',
          nonWearThreshold: 90,
          minValidWearHours: 10,
          smoothingWindow: 1,
          normalization: 'none',
          missingDataStrategy: 'interpolate',
          outlierPercentile: 100,
        },
      });

      // Create session with some non-worn periods in the middle
      const session = createSessionWithMissingData();
      const input = interpolateAdapter.preprocessSession(session);

      // Should still produce valid output
      expect(input.activitySequence.length).toBe(session.epochs.length);
    });
  });

  // ==========================================================================
  // Non-wear Detection
  // ==========================================================================
  describe('Non-wear Detection', () => {
    it('should detect non-wear periods from zero count streaks', () => {
      // Create session with a streak of zero counts
      const session = createSessionWithZeroStreak();
      const input = adapter.preprocessSession(session);

      // Check that zero streak region is marked as non-worn
      const zeroStreakStart = 100;
      const zeroStreakEnd = 200;

      for (let i = zeroStreakStart; i < zeroStreakEnd; i++) {
        expect(input.validMask[i]).toBe(0);
      }
    });

    it('should not mark short zero streaks as non-wear', () => {
      // Choi algorithm requires 90+ consecutive zeros by default
      const session = createSessionWithShortZeroStreak();
      const input = adapter.preprocessSession(session);

      // Short streak should remain as worn
      for (let i = 100; i < 130; i++) {
        // 30 minute streak is too short
        expect(input.validMask[i]).toBe(1);
      }
    });
  });
});

// ==========================================================================
// Helper Functions for Test Sessions
// ==========================================================================

function createRegularSleepSession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 5;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        // Regular pattern: very low activity 23:00-07:00
        const isNight = h >= 23 || h < 7;
        const count = isNight ? Math.round(5 + Math.random() * 10) : Math.round(300 + Math.random() * 200);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count,
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'regular-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 50000,
      totalSteps: 8000,
      sedentaryMinutes: 480,
      lightActivityMinutes: 360,
      moderateActivityMinutes: 45,
      vigorousActivityMinutes: 15,
      mvpaMinutes: 60,
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.98,
  };
}

function createFragmentedSleepSession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 5;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        // Fragmented: still activity during night
        const isNight = h >= 23 || h < 7;
        // High nocturnal activity (fragmented sleep)
        const count = isNight
          ? Math.round(50 + Math.random() * 100) // Higher than normal night activity
          : Math.round(300 + Math.random() * 200);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count,
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'fragmented-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 55000,
      totalSteps: 7500,
      sedentaryMinutes: 400,
      lightActivityMinutes: 400,
      moderateActivityMinutes: 40,
      vigorousActivityMinutes: 10,
      mvpaMinutes: 50,
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.95,
  };
}

function createDelayedPhaseSession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 5;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        // Delayed: activity onset at 10:00, offset at 02:00
        const isNight = h >= 2 && h < 10;
        const count = isNight
          ? Math.round(5 + Math.random() * 10)
          : Math.round(300 + Math.random() * 200);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count,
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'delayed-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 48000,
      totalSteps: 7000,
      sedentaryMinutes: 500,
      lightActivityMinutes: 350,
      moderateActivityMinutes: 35,
      vigorousActivityMinutes: 15,
      mvpaMinutes: 50,
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.95,
  };
}

function createAdvancedPhaseSession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 5;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        // Advanced: activity onset at 04:00, offset at 19:00
        const isNight = h >= 19 || h < 4;
        const count = isNight
          ? Math.round(5 + Math.random() * 10)
          : Math.round(300 + Math.random() * 200);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count,
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'advanced-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 45000,
      totalSteps: 6500,
      sedentaryMinutes: 520,
      lightActivityMinutes: 340,
      moderateActivityMinutes: 30,
      vigorousActivityMinutes: 10,
      mvpaMinutes: 40,
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.95,
  };
}

function createIrregularSleepSession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 7;

  for (let d = 0; d < days; d++) {
    // Vary sleep timing by day - simulate social jetlag
    const sleepStartHour = d < 5 ? 23 : (d % 2 === 0 ? 1 : 2); // Later on weekends
    const wakeHour = d < 5 ? 7 : (d % 2 === 0 ? 10 : 11); // Later wake on weekends

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        const isNight = (h >= sleepStartHour && sleepStartHour < 12) ||
                       (h < wakeHour && wakeHour <= 12) ||
                       (sleepStartHour >= 12 && (h >= sleepStartHour || h < wakeHour));
        const count = isNight
          ? Math.round(5 + Math.random() * 15)
          : Math.round(250 + Math.random() * 250);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count,
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'irregular-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 40000 + Math.random() * 20000, // Variable
      totalSteps: 6000 + Math.random() * 4000,
      sedentaryMinutes: 480 + Math.round(Math.random() * 120),
      lightActivityMinutes: 300 + Math.round(Math.random() * 100),
      moderateActivityMinutes: 20 + Math.round(Math.random() * 40),
      vigorousActivityMinutes: 5 + Math.round(Math.random() * 20),
      mvpaMinutes: 30 + Math.round(Math.random() * 40),
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.92,
  };
}

function createHighVariabilitySession(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 7;

  // Create dramatic day-to-day variability by making some days very active
  // and others very sedentary. This produces high coefficient of variation.
  // Pattern: Low, High, Very Low, Very High, Low, High, Very Low
  const dailyActivityMultipliers = [0.3, 1.5, 0.15, 2.0, 0.25, 1.8, 0.2];

  for (let d = 0; d < days; d++) {
    const multiplier = dailyActivityMultipliers[d];
    const sleepStartHour = 22;
    const wakeHour = 7;

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        const isNight = h >= sleepStartHour || h < wakeHour;

        // Apply daily multiplier to create dramatic differences
        // Low multiplier days: ~30-50 average activity
        // High multiplier days: ~600-800 average activity
        const baseActivity = isNight ? 10 : 400;
        const count = Math.round((baseActivity * multiplier) + Math.random() * 20);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count: Math.max(0, count),
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'high-variability-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: Math.round(100000 * dailyActivityMultipliers[d]),
      totalSteps: Math.round(8000 * dailyActivityMultipliers[d]),
      sedentaryMinutes: Math.round(600 / dailyActivityMultipliers[d]),
      lightActivityMinutes: Math.round(300 * dailyActivityMultipliers[d]),
      moderateActivityMinutes: Math.round(40 * dailyActivityMultipliers[d]),
      vigorousActivityMinutes: Math.round(20 * dailyActivityMultipliers[d]),
      mvpaMinutes: Math.round(60 * dailyActivityMultipliers[d]),
      nonWearMinutes: 0,
      validWearHours: 24,
    })),
    dataQuality: 0.88,
  };
}

function createSessionWithMissingData(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const days = 3;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const i = d * 1440 + h * 60 + m;
        const isNight = h >= 23 || h < 7;

        // Mark some epochs as non-worn (missing data)
        const minuteOfDay = h * 60 + m;
        const isNonWorn = (minuteOfDay >= 720 && minuteOfDay < 780); // 12:00-13:00 missing

        const count = isNight
          ? Math.round(5 + Math.random() * 10)
          : Math.round(300 + Math.random() * 200);

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count: isNonWorn ? 0 : count,
          vectorMagnitude: isNonWorn ? 0 : count / 1000,
          steps: isNonWorn ? 0 : Math.round(count / 100),
          isWorn: !isNonWorn,
        });
      }
    }
  }

  return {
    userId: 'test-user',
    sessionId: 'missing-data-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries: Array(days).fill(null).map((_, d) => ({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 48000,
      totalSteps: 7000,
      sedentaryMinutes: 500,
      lightActivityMinutes: 350,
      moderateActivityMinutes: 35,
      vigorousActivityMinutes: 15,
      mvpaMinutes: 50,
      nonWearMinutes: 60,
      validWearHours: 23,
    })),
    dataQuality: 0.90,
  };
}

function createSessionWithZeroStreak(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const totalMinutes = 1440 * 3; // 3 days

  for (let i = 0; i < totalMinutes; i++) {
    const hour = Math.floor(i / 60) % 24;
    const isNight = hour >= 23 || hour < 7;

    // Create a 100-minute zero streak from minute 100 to 200
    const isZeroStreak = (i >= 100 && i < 200);

    const count = isZeroStreak ? 0 : (isNight
      ? Math.round(5 + Math.random() * 10)
      : Math.round(300 + Math.random() * 200));

    epochs.push({
      timestamp: startTime.getTime() + i * 60000,
      epochSeconds: 60,
      count,
      vectorMagnitude: count / 1000,
      steps: Math.round(count / 100),
      isWorn: true, // Originally marked as worn, Choi algorithm will detect
    });
  }

  return {
    userId: 'test-user',
    sessionId: 'zero-streak-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + totalMinutes * 60000),
    epochLength: 60,
    epochs,
    dailySummaries: [],
    dataQuality: 0.85,
  };
}

function createSessionWithShortZeroStreak(): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');
  const totalMinutes = 1440 * 3; // 3 days

  for (let i = 0; i < totalMinutes; i++) {
    const hour = Math.floor(i / 60) % 24;
    const isNight = hour >= 23 || hour < 7;

    // Create a 30-minute zero streak (below 90-minute threshold)
    const isZeroStreak = (i >= 100 && i < 130);

    const count = isZeroStreak ? 0 : (isNight
      ? Math.round(5 + Math.random() * 10)
      : Math.round(300 + Math.random() * 200));

    epochs.push({
      timestamp: startTime.getTime() + i * 60000,
      epochSeconds: 60,
      count,
      vectorMagnitude: count / 1000,
      steps: Math.round(count / 100),
      isWorn: true,
    });
  }

  return {
    userId: 'test-user',
    sessionId: 'short-zero-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + totalMinutes * 60000),
    epochLength: 60,
    epochs,
    dailySummaries: [],
    dataQuality: 0.95,
  };
}
