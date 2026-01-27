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
