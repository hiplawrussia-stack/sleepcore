/**
 * WearablePATIntegration Unit Tests
 *
 * Tests for HRV feature extraction, sleep feature extraction,
 * and Blanken phenotype estimation from wearable data.
 */

import {
  WearablePATIntegration,
  createWearablePATIntegration,
} from '../../../src/wearable/WearablePATIntegration';
import type {
  IWearableSleepData,
  IWearableSleepMetrics,
} from '../../../src/wearable/types';

describe('WearablePATIntegration', () => {
  let integration: WearablePATIntegration;

  beforeEach(() => {
    integration = createWearablePATIntegration();
  });

  // ===========================================================================
  // HRV FEATURE EXTRACTION
  // ===========================================================================

  describe('extractHRVFeatures', () => {
    it('should return null when no HRV data available', () => {
      const sessions = [createSessionWithoutHRV()];
      const result = integration.extractHRVFeatures(sessions);

      expect(result).toBeNull();
    });

    it('should calculate mean RMSSD across nights', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 40 },
        { meanRMSSD: 45 },
        { meanRMSSD: 50 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      // Allow ±3 tolerance due to random variation in test data
      expect(result!.meanRMSSD).toBeGreaterThan(42);
      expect(result!.meanRMSSD).toBeLessThan(48);
    });

    it('should calculate RMSSD standard deviation', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 40 },
        { meanRMSSD: 50 },
        { meanRMSSD: 60 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.sdRMSSD).toBeGreaterThan(5);
    });

    it('should classify low autonomic status', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 15 },
        { meanRMSSD: 18 },
        { meanRMSSD: 20 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.autonomicStatus).toBe('low');
    });

    it('should classify normal autonomic status', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 35 },
        { meanRMSSD: 40 },
        { meanRMSSD: 45 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.autonomicStatus).toBe('normal');
    });

    it('should classify high autonomic status', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 65 },
        { meanRMSSD: 70 },
        { meanRMSSD: 75 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.autonomicStatus).toBe('high');
    });

    it('should calculate positive trend', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 30, daysAgo: 6 },
        { meanRMSSD: 35, daysAgo: 4 },
        { meanRMSSD: 40, daysAgo: 2 },
        { meanRMSSD: 45, daysAgo: 0 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.trend).toBeGreaterThan(0);
    });

    it('should calculate negative trend', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 50, daysAgo: 6 },
        { meanRMSSD: 45, daysAgo: 4 },
        { meanRMSSD: 40, daysAgo: 2 },
        { meanRMSSD: 35, daysAgo: 0 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.trend).toBeLessThan(0);
    });

    it('should filter out invalid HRV values', () => {
      const session = createSessionWithHRVValues([5, 250, 45, 48, 42, 300, 46, 2]);
      const result = integration.extractHRVFeatures([session]);

      expect(result).not.toBeNull();
      // Only 45, 48, 42, 46 should be counted
      expect(result!.nightsWithData).toBe(1);
      expect(result!.meanRMSSD).toBeGreaterThan(40);
      expect(result!.meanRMSSD).toBeLessThan(50);
    });

    it('should count nights with data', () => {
      const sessions = createSessionsWithHRV([
        { meanRMSSD: 40 },
        { meanRMSSD: 45 },
        { meanRMSSD: 50 },
        { meanRMSSD: 42 },
        { meanRMSSD: 48 },
      ]);

      const result = integration.extractHRVFeatures(sessions);

      expect(result).not.toBeNull();
      expect(result!.nightsWithData).toBe(5);
    });
  });

  // ===========================================================================
  // SLEEP FEATURE EXTRACTION
  // ===========================================================================

  describe('extractSleepFeatures', () => {
    it('should return null when no metrics available', () => {
      const result = integration.extractSleepFeatures([], []);

      expect(result).toBeNull();
    });

    it('should calculate average sleep efficiency', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ se: 85 }),
        createMetrics({ se: 90 }),
        createMetrics({ se: 80 }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.averageSE).toBeCloseTo(85, 0);
    });

    it('should calculate average TST', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ tst: 420 }),
        createMetrics({ tst: 450 }),
        createMetrics({ tst: 390 }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.averageTST).toBeCloseTo(420, 0);
    });

    it('should calculate average WASO', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ waso: 30 }),
        createMetrics({ waso: 45 }),
        createMetrics({ waso: 20 }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.averageWASO).toBeCloseTo(31.67, 0);
    });

    it('should calculate average SOL', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ sol: 15 }),
        createMetrics({ sol: 25 }),
        createMetrics({ sol: 20 }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.averageSOL).toBe(20);
    });

    it('should calculate SE variability', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ se: 70 }),
        createMetrics({ se: 80 }),
        createMetrics({ se: 90 }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.seVariability).toBeGreaterThan(0);
    });

    it('should aggregate stage distribution', () => {
      const metrics: IWearableSleepMetrics[] = [
        createMetrics({ stageDistribution: { wake: 10, light: 50, deep: 20, rem: 20 } }),
        createMetrics({ stageDistribution: { wake: 15, light: 45, deep: 25, rem: 15 } }),
      ];

      const result = integration.extractSleepFeatures([], metrics);

      expect(result).not.toBeNull();
      expect(result!.stageDistribution).not.toBeNull();
      expect(result!.stageDistribution!.wake).toBeCloseTo(12.5, 0);
      expect(result!.stageDistribution!.light).toBeCloseTo(47.5, 0);
      expect(result!.stageDistribution!.deep).toBeCloseTo(22.5, 0);
      expect(result!.stageDistribution!.rem).toBeCloseTo(17.5, 0);
    });
  });

  // ===========================================================================
  // BLANKEN PHENOTYPE ESTIMATION
  // ===========================================================================

  describe('estimateBlankenPhenotype', () => {
    it('should return null type when no data available', () => {
      const result = integration.estimateBlankenPhenotype(null, null);

      expect(result.estimatedType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should estimate Type 4 (High-Reactive) for low HRV with high variability', () => {
      const hrvFeatures = {
        meanRMSSD: 20,
        sdRMSSD: 25,
        trend: -0.3,
        nightsWithData: 7,
        autonomicStatus: 'low' as const,
      };

      // Provide sleep features to avoid confidence reduction
      const sleepFeatures = {
        averageSE: 80,
        averageTST: 360,
        averageWASO: 40,
        averageSOL: 20,
        seVariability: 5,
        stageDistribution: null,
      };

      const result = integration.estimateBlankenPhenotype(hrvFeatures, sleepFeatures);

      expect(result.estimatedType).toBe(4);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.evidence.some(e => e.includes('Type 4'))).toBe(true);
    });

    it('should estimate Type 1 (Highly Distressed) for low HRV + poor sleep', () => {
      const hrvFeatures = {
        meanRMSSD: 18,
        sdRMSSD: 10,
        trend: -0.5,
        nightsWithData: 7,
        autonomicStatus: 'low' as const,
      };

      const sleepFeatures = {
        averageSE: 75,
        averageTST: 360,
        averageWASO: 50,
        averageSOL: 40,
        seVariability: 10,
        stageDistribution: null,
      };

      const result = integration.estimateBlankenPhenotype(hrvFeatures, sleepFeatures);

      expect(result.estimatedType).toBe(1);
      expect(result.evidence.some(e => e.includes('Type 1'))).toBe(true);
    });

    it('should estimate Type 5 (Low-Reactive) for good HRV and stable sleep', () => {
      const hrvFeatures = {
        meanRMSSD: 45,
        sdRMSSD: 8,
        trend: 0.2,
        nightsWithData: 7,
        autonomicStatus: 'normal' as const,
      };

      const sleepFeatures = {
        averageSE: 88,
        averageTST: 420,
        averageWASO: 20,
        averageSOL: 15,
        seVariability: 5,
        stageDistribution: null,
      };

      const result = integration.estimateBlankenPhenotype(hrvFeatures, sleepFeatures);

      expect(result.estimatedType).toBe(5);
      expect(result.evidence.some(e => e.includes('Type 5'))).toBe(true);
    });

    it('should identify HRV indicators', () => {
      const hrvFeatures = {
        meanRMSSD: 18,
        sdRMSSD: 25,
        trend: -1.0,
        nightsWithData: 7,
        autonomicStatus: 'low' as const,
      };

      const result = integration.estimateBlankenPhenotype(hrvFeatures, null);

      expect(result.hrvIndicators.lowParasympathetic).toBe(true);
      expect(result.hrvIndicators.highVariability).toBe(true);
      expect(result.hrvIndicators.negativeTrend).toBe(true);
    });

    it('should identify sleep indicators', () => {
      const sleepFeatures = {
        averageSE: 70,
        averageTST: 360,
        averageWASO: 60,
        averageSOL: 45,
        seVariability: 12,
        stageDistribution: { wake: 20, light: 50, deep: 15, rem: 15 },
      };

      const result = integration.estimateBlankenPhenotype(null, sleepFeatures);

      expect(result.sleepIndicators.poorEfficiency).toBe(true);
      expect(result.sleepIndicators.longSOL).toBe(true);
      expect(result.sleepIndicators.highWASO).toBe(true);
      expect(result.sleepIndicators.fragmentedSleep).toBe(true);
    });

    it('should reduce confidence for limited data', () => {
      const hrvFeatures = {
        meanRMSSD: 45,
        sdRMSSD: 8,
        trend: 0.2,
        nightsWithData: 3, // Limited data
        autonomicStatus: 'normal' as const,
      };

      const result = integration.estimateBlankenPhenotype(hrvFeatures, null);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.evidence.some(e => e.includes('Limited data'))).toBe(true);
    });
  });

  // ===========================================================================
  // ACTIGRAPHY CONVERSION
  // ===========================================================================

  describe('convertToActigraphySession', () => {
    it('should convert wearable session to actigraphy format', () => {
      const session = createValidSleepSession();
      const result = integration.convertToActigraphySession('user-123', session);

      expect(result.userId).toBe('user-123');
      expect(result.sessionId).toBe(session.sessionId);
      expect(result.deviceId).toBe(session.deviceId);
      expect(result.epochs.length).toBeGreaterThan(0);
    });

    it('should create epochs based on sleep stages', () => {
      const session = createValidSleepSession();
      session.stages = [
        { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:30:00Z') },
        { type: 'deep', startTime: new Date('2026-02-07T22:30:00Z'), endTime: new Date('2026-02-07T23:30:00Z') },
      ];

      const result = integration.convertToActigraphySession('user-123', session);

      // 30 + 60 = 90 minutes total
      expect(result.epochs.length).toBe(90);

      // Wake epochs should have higher activity
      const wakeEpochs = result.epochs.slice(0, 30);
      const deepEpochs = result.epochs.slice(30, 90);

      const avgWakeActivity = wakeEpochs.reduce((s, e) => s + e.count, 0) / wakeEpochs.length;
      const avgDeepActivity = deepEpochs.reduce((s, e) => s + e.count, 0) / deepEpochs.length;

      expect(avgWakeActivity).toBeGreaterThan(avgDeepActivity);
    });

    it('should create uniform epochs when no stages available', () => {
      const session = createValidSleepSession();
      session.stages = undefined;
      session.startTime = new Date('2026-02-07T22:00:00Z');
      session.endTime = new Date('2026-02-08T06:00:00Z'); // 8 hours

      const result = integration.convertToActigraphySession('user-123', session);

      expect(result.epochs.length).toBe(480); // 8 hours = 480 minutes
      expect(result.epochs.every(e => e.isWorn)).toBe(true);
    });

    it('should include metadata about data source', () => {
      const session = createValidSleepSession();
      const result = integration.convertToActigraphySession('user-123', session);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('health_connect');
      expect(result.metadata.hasHRV).toBe(true);
      expect(result.metadata.hasStages).toBe(true);
    });
  });
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function createSessionWithoutHRV(): IWearableSleepData {
  return {
    source: 'health_connect',
    deviceId: 'device-123',
    sessionId: 'session-' + Date.now(),
    startTime: new Date('2026-02-07T22:00:00Z'),
    endTime: new Date('2026-02-08T06:00:00Z'),
  };
}

function createSessionsWithHRV(
  configs: Array<{ meanRMSSD: number; daysAgo?: number }>
): IWearableSleepData[] {
  return configs.map((config, index) => {
    const daysAgo = config.daysAgo ?? index;
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - daysAgo);
    startTime.setHours(22, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 8);

    // Generate HRV values around the mean
    const hrvValues = Array.from({ length: 10 }, () => ({
      timestamp: new Date(startTime.getTime() + Math.random() * 8 * 60 * 60 * 1000),
      rmssd: config.meanRMSSD + (Math.random() - 0.5) * 10,
    }));

    return {
      source: 'health_connect',
      deviceId: 'device-123',
      sessionId: `session-${daysAgo}`,
      startTime,
      endTime,
      hrv: hrvValues,
    };
  });
}

function createSessionWithHRVValues(values: number[]): IWearableSleepData {
  const startTime = new Date('2026-02-07T22:00:00Z');
  return {
    source: 'health_connect',
    deviceId: 'device-123',
    sessionId: 'session-test',
    startTime,
    endTime: new Date('2026-02-08T06:00:00Z'),
    hrv: values.map((rmssd, i) => ({
      timestamp: new Date(startTime.getTime() + i * 30 * 60 * 1000),
      rmssd,
    })),
  };
}

function createMetrics(overrides: Partial<IWearableSleepMetrics> = {}): IWearableSleepMetrics {
  return {
    tst: 420,
    tib: 480,
    se: 87.5,
    waso: 30,
    sol: 15,
    awakenings: 2,
    ...overrides,
  };
}

function createValidSleepSession(): IWearableSleepData {
  const startTime = new Date('2026-02-07T22:00:00Z');
  return {
    source: 'health_connect',
    deviceId: 'samsung-watch-123',
    sessionId: 'session-' + Date.now(),
    startTime,
    endTime: new Date('2026-02-08T06:00:00Z'),
    stages: [
      { type: 'light', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-08T00:00:00Z') },
      { type: 'deep', startTime: new Date('2026-02-08T00:00:00Z'), endTime: new Date('2026-02-08T02:00:00Z') },
      { type: 'rem', startTime: new Date('2026-02-08T02:00:00Z'), endTime: new Date('2026-02-08T04:00:00Z') },
      { type: 'light', startTime: new Date('2026-02-08T04:00:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
    ],
    hrv: Array.from({ length: 16 }, (_, i) => ({
      timestamp: new Date(startTime.getTime() + i * 30 * 60 * 1000),
      rmssd: 40 + Math.random() * 20,
    })),
  };
}
