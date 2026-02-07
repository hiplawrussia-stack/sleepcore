/**
 * WearableIngestionService Unit Tests
 *
 * Tests for wearable data validation, metric calculation, and quality checks.
 */

import {
  WearableIngestionService,
} from '../../../src/wearable/WearableIngestionService';
import type {
  IWearableSleepData,
  IWearableSyncPayload,
} from '../../../src/wearable/types';

describe('WearableIngestionService', () => {
  let service: WearableIngestionService;

  beforeEach(() => {
    service = new WearableIngestionService();
  });

  // ===========================================================================
  // DATA QUALITY VALIDATION
  // ===========================================================================

  describe('validateDataQuality', () => {
    it('should pass validation for valid sleep session', () => {
      const data = createValidSleepSession();
      const result = service.validateDataQuality(data);

      expect(result.overallScore).toBeGreaterThan(0.5);
      expect(result.errors).toHaveLength(0);
      expect(result.checks.durationValid).toBe(true);
    });

    it('should fail validation for session too short', () => {
      const data = createValidSleepSession();
      data.endTime = new Date(data.startTime.getTime() + 30 * 60 * 1000); // 30 min

      const result = service.validateDataQuality(data);

      expect(result.errors.some(e => e.includes('too short'))).toBe(true);
      expect(result.checks.durationValid).toBe(false);
    });

    it('should fail validation for session too long', () => {
      const data = createValidSleepSession();
      data.endTime = new Date(data.startTime.getTime() + 15 * 60 * 60 * 1000); // 15 hours

      const result = service.validateDataQuality(data);

      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
      expect(result.checks.durationValid).toBe(false);
    });

    it('should fail validation for invalid HRV values', () => {
      const data = createValidSleepSession();
      data.hrv = [
        { timestamp: new Date(), rmssd: 5 },    // Too low
        { timestamp: new Date(), rmssd: 250 },  // Too high
        { timestamp: new Date(), rmssd: 3 },    // Too low
        { timestamp: new Date(), rmssd: 300 },  // Too high
      ];

      const result = service.validateDataQuality(data);

      expect(result.errors.some(e => e.includes('invalid HRV'))).toBe(true);
      expect(result.checks.hrvValid).toBe(false);
    });

    it('should warn for insufficient HRV samples', () => {
      const data = createValidSleepSession();
      data.hrv = [
        { timestamp: new Date(), rmssd: 45 },
        { timestamp: new Date(), rmssd: 48 },
        { timestamp: new Date(), rmssd: 42 },
      ]; // Only 3 samples

      const result = service.validateDataQuality(data);

      expect(result.warnings.some(w => w.includes('Low HRV sample count'))).toBe(true);
      expect(result.checks.sufficientSamples).toBe(false);
    });

    it('should calculate overall quality score', () => {
      const data = createValidSleepSession();
      const result = service.validateDataQuality(data);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================================================
  // METRICS CALCULATION
  // ===========================================================================

  describe('calculateMetrics', () => {
    it('should calculate TIB from session times', () => {
      const data = createValidSleepSession();
      // 8 hours
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');

      const metrics = service.calculateMetrics(data);

      expect(metrics.tib).toBe(480); // 8 hours = 480 min
    });

    it('should calculate TST from sleep stages', () => {
      const data = createValidSleepSession();
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');
      data.stages = [
        { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:15:00Z') },
        { type: 'light', startTime: new Date('2026-02-07T22:15:00Z'), endTime: new Date('2026-02-07T23:30:00Z') },
        { type: 'deep', startTime: new Date('2026-02-07T23:30:00Z'), endTime: new Date('2026-02-08T01:00:00Z') },
        { type: 'rem', startTime: new Date('2026-02-08T01:00:00Z'), endTime: new Date('2026-02-08T02:00:00Z') },
        { type: 'light', startTime: new Date('2026-02-08T02:00:00Z'), endTime: new Date('2026-02-08T05:45:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T05:45:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
      ];

      const metrics = service.calculateMetrics(data);

      // TST = 75 (light) + 90 (deep) + 60 (rem) + 225 (light) = 450 min
      expect(metrics.tst).toBe(450);
    });

    it('should calculate sleep efficiency correctly', () => {
      const data = createValidSleepSession();
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');
      data.stages = [
        { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:30:00Z') },
        { type: 'light', startTime: new Date('2026-02-07T22:30:00Z'), endTime: new Date('2026-02-08T05:30:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T05:30:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
      ];

      const metrics = service.calculateMetrics(data);

      // TST = 420 min, TIB = 480 min, SE = 87.5%
      expect(metrics.se).toBeCloseTo(87.5, 1);
    });

    it('should calculate WASO correctly', () => {
      const data = createValidSleepSession();
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');
      data.stages = [
        { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:20:00Z') }, // SOL
        { type: 'light', startTime: new Date('2026-02-07T22:20:00Z'), endTime: new Date('2026-02-08T02:00:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T02:00:00Z'), endTime: new Date('2026-02-08T02:30:00Z') }, // WASO
        { type: 'light', startTime: new Date('2026-02-08T02:30:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
      ];

      const metrics = service.calculateMetrics(data);

      expect(metrics.sol).toBe(20); // 20 min SOL
      expect(metrics.waso).toBe(30); // 30 min WASO
    });

    it('should calculate HRV metrics', () => {
      const data = createValidSleepSession();
      data.hrv = [
        { timestamp: new Date(), rmssd: 40 },
        { timestamp: new Date(), rmssd: 45 },
        { timestamp: new Date(), rmssd: 50 },
        { timestamp: new Date(), rmssd: 42 },
        { timestamp: new Date(), rmssd: 48 },
        { timestamp: new Date(), rmssd: 46 },
        { timestamp: new Date(), rmssd: 44 },
        { timestamp: new Date(), rmssd: 47 },
        { timestamp: new Date(), rmssd: 43 },
        { timestamp: new Date(), rmssd: 49 },
      ];

      const metrics = service.calculateMetrics(data);

      expect(metrics.hrvMetrics).toBeDefined();
      expect(metrics.hrvMetrics!.meanRMSSD).toBeCloseTo(45.4, 1);
      expect(metrics.hrvMetrics!.sampleCount).toBe(10);
      expect(metrics.hrvMetrics!.minRMSSD).toBe(40);
      expect(metrics.hrvMetrics!.maxRMSSD).toBe(50);
    });

    it('should calculate stage distribution', () => {
      const data = createValidSleepSession();
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');
      data.stages = [
        { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:30:00Z') },
        { type: 'light', startTime: new Date('2026-02-07T22:30:00Z'), endTime: new Date('2026-02-08T01:00:00Z') },
        { type: 'deep', startTime: new Date('2026-02-08T01:00:00Z'), endTime: new Date('2026-02-08T03:00:00Z') },
        { type: 'rem', startTime: new Date('2026-02-08T03:00:00Z'), endTime: new Date('2026-02-08T05:00:00Z') },
        { type: 'light', startTime: new Date('2026-02-08T05:00:00Z'), endTime: new Date('2026-02-08T05:30:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T05:30:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
      ];

      const metrics = service.calculateMetrics(data);

      expect(metrics.stageDistribution).toBeDefined();
      // Total: 480 min, Wake: 60 min (12.5%), Light: 180 min (37.5%), Deep: 120 min (25%), REM: 120 min (25%)
      expect(metrics.stageDistribution!.wake).toBeCloseTo(12.5, 1);
      expect(metrics.stageDistribution!.light).toBeCloseTo(37.5, 1);
      expect(metrics.stageDistribution!.deep).toBeCloseTo(25, 1);
      expect(metrics.stageDistribution!.rem).toBeCloseTo(25, 1);
    });

    it('should estimate metrics when no stages available', () => {
      const data = createValidSleepSession();
      data.stages = undefined;
      data.startTime = new Date('2026-02-07T22:00:00Z');
      data.endTime = new Date('2026-02-08T06:00:00Z');

      const metrics = service.calculateMetrics(data);

      // Should use 85% efficiency estimate
      expect(metrics.tib).toBe(480);
      expect(metrics.tst).toBeCloseTo(480 * 0.85, 0);
      expect(metrics.se).toBeCloseTo(85, 0);
    });

    it('should count awakenings correctly', () => {
      const data = createValidSleepSession();
      data.stages = [
        { type: 'light', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-08T01:00:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T01:00:00Z'), endTime: new Date('2026-02-08T01:10:00Z') }, // Awakening 1
        { type: 'deep', startTime: new Date('2026-02-08T01:10:00Z'), endTime: new Date('2026-02-08T03:00:00Z') },
        { type: 'awake', startTime: new Date('2026-02-08T03:00:00Z'), endTime: new Date('2026-02-08T03:05:00Z') }, // Awakening 2
        { type: 'rem', startTime: new Date('2026-02-08T03:05:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
      ];

      const metrics = service.calculateMetrics(data);

      expect(metrics.awakenings).toBe(2);
    });
  });

  // ===========================================================================
  // SYNC PAYLOAD PROCESSING
  // ===========================================================================

  describe('processSyncPayload', () => {
    it('should process valid sync payload', async () => {
      const payload: IWearableSyncPayload = {
        userId: 'test-user',
        device: {
          id: 'device-123',
          manufacturer: 'Samsung',
          model: 'Galaxy Watch 5',
          osVersion: 'Wear OS 4',
        },
        syncInfo: {
          timestamp: new Date(),
          lastSyncTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          appVersion: '1.0.0',
        },
        sleepSessions: [createValidSleepSession()],
      };

      const result = await service.processSyncPayload(payload);

      expect(result.success).toBe(true);
      expect(result.sessionsProcessed).toBe(1);
      expect(result.errors).toBeUndefined();
    });

    it('should report errors for invalid sessions', async () => {
      const invalidSession = createValidSleepSession();
      invalidSession.endTime = new Date(invalidSession.startTime.getTime() + 10 * 60 * 1000); // Too short

      const payload: IWearableSyncPayload = {
        userId: 'test-user',
        device: {
          id: 'device-123',
          manufacturer: 'Samsung',
          model: 'Galaxy Watch 5',
          osVersion: 'Wear OS 4',
        },
        syncInfo: {
          timestamp: new Date(),
          lastSyncTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          appVersion: '1.0.0',
        },
        sleepSessions: [invalidSession],
      };

      const result = await service.processSyncPayload(payload);

      expect(result.success).toBe(false);
      expect(result.sessionsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should return next sync recommendation', async () => {
      const payload: IWearableSyncPayload = {
        userId: 'test-user',
        device: {
          id: 'device-123',
          manufacturer: 'Samsung',
          model: 'Galaxy Watch 5',
          osVersion: 'Wear OS 4',
        },
        syncInfo: {
          timestamp: new Date(),
          lastSyncTime: new Date(),
          appVersion: '1.0.0',
        },
        sleepSessions: [],
      };

      const result = await service.processSyncPayload(payload);

      expect(result.nextSyncIn).toBe('PT15M'); // 15 minutes per Health Connect limits
    });
  });

  // ===========================================================================
  // OUTLIER FILTERING
  // ===========================================================================

  describe('HRV outlier filtering', () => {
    it('should filter extreme HRV outliers', () => {
      const service = new WearableIngestionService({ filterOutliers: true });

      const data = createValidSleepSession();
      data.hrv = [
        { timestamp: new Date(), rmssd: 45 },
        { timestamp: new Date(), rmssd: 48 },
        { timestamp: new Date(), rmssd: 42 },
        { timestamp: new Date(), rmssd: 150 }, // Outlier
        { timestamp: new Date(), rmssd: 46 },
        { timestamp: new Date(), rmssd: 44 },
        { timestamp: new Date(), rmssd: 47 },
        { timestamp: new Date(), rmssd: 5 }, // Outlier (filtered by range)
        { timestamp: new Date(), rmssd: 43 },
        { timestamp: new Date(), rmssd: 49 },
      ];

      const metrics = service.calculateMetrics(data);

      // Should filter outliers, mean should be around 45
      expect(metrics.hrvMetrics).toBeDefined();
      expect(metrics.hrvMetrics!.meanRMSSD).toBeGreaterThan(40);
      expect(metrics.hrvMetrics!.meanRMSSD).toBeLessThan(55);
    });
  });
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function createValidSleepSession(): IWearableSleepData {
  const startTime = new Date('2026-02-07T22:00:00Z');
  const endTime = new Date('2026-02-08T06:00:00Z');

  return {
    source: 'health_connect',
    deviceId: 'samsung-watch-123',
    sessionId: 'session-' + Date.now(),
    startTime,
    endTime,
    stages: [
      { type: 'awake', startTime: new Date('2026-02-07T22:00:00Z'), endTime: new Date('2026-02-07T22:15:00Z') },
      { type: 'light', startTime: new Date('2026-02-07T22:15:00Z'), endTime: new Date('2026-02-08T00:00:00Z') },
      { type: 'deep', startTime: new Date('2026-02-08T00:00:00Z'), endTime: new Date('2026-02-08T02:00:00Z') },
      { type: 'rem', startTime: new Date('2026-02-08T02:00:00Z'), endTime: new Date('2026-02-08T03:30:00Z') },
      { type: 'light', startTime: new Date('2026-02-08T03:30:00Z'), endTime: new Date('2026-02-08T05:45:00Z') },
      { type: 'awake', startTime: new Date('2026-02-08T05:45:00Z'), endTime: new Date('2026-02-08T06:00:00Z') },
    ],
    hrv: Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(startTime.getTime() + i * 15 * 60 * 1000),
      rmssd: 40 + Math.random() * 20,
    })),
  };
}
