/**
 * OpenWearablesAdapter Tests
 *
 * Tests for data normalization from Open Wearables API to SleepCore format.
 *
 * @module wearable/open-wearables/__tests__
 */

// Jest provides describe, it, expect, beforeEach globally
import { OpenWearablesAdapter } from '../OpenWearablesAdapter';
import { IOpenWearablesSleepSession } from '../types';

describe('OpenWearablesAdapter', () => {
  let adapter: OpenWearablesAdapter;

  beforeEach(() => {
    adapter = new OpenWearablesAdapter();
  });

  describe('adaptSleepSession', () => {
    it('should adapt a basic sleep session', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'oura',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.source).toBe('oura');
      expect(result.data.startTime).toBeInstanceOf(Date);
      expect(result.data.endTime).toBeInstanceOf(Date);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should adapt sleep stages correctly', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'garmin',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        stages: [
          { type: 'awake', startTime: '2026-02-22T23:00:00Z', endTime: '2026-02-22T23:15:00Z' },
          { type: 'light', startTime: '2026-02-22T23:15:00Z', endTime: '2026-02-23T00:30:00Z' },
          { type: 'deep', startTime: '2026-02-23T00:30:00Z', endTime: '2026-02-23T01:30:00Z' },
          { type: 'rem', startTime: '2026-02-23T01:30:00Z', endTime: '2026-02-23T02:30:00Z' },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.stages).toHaveLength(4);
      expect(result.data.stages![0].type).toBe('awake');
      expect(result.data.stages![1].type).toBe('light');
      expect(result.data.stages![2].type).toBe('deep');
      expect(result.data.stages![3].type).toBe('rem');
    });

    it('should adapt HRV records correctly', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'oura',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        hrv: [
          { timestamp: '2026-02-23T00:00:00Z', rmssd: 45.5, quality: 95 },
          { timestamp: '2026-02-23T01:00:00Z', rmssd: 52.3, quality: 98 },
          { timestamp: '2026-02-23T02:00:00Z', rmssd: 48.1, quality: 92 },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.hrv).toHaveLength(3);
      expect(result.data.hrv![0].rmssd).toBe(45.5);
      expect(result.data.hrv![0].quality).toBeCloseTo(0.95);
      expect(result.data.hrv![1].rmssd).toBe(52.3);
    });

    it('should handle Apple SDNN to RMSSD conversion', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'apple_health',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        hrv: [
          { timestamp: '2026-02-23T00:00:00Z', rmssd: 0, sdnn: 60 },
          { timestamp: '2026-02-23T01:00:00Z', rmssd: 0, sdnn: 55 },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      // Apple uses SDNN, adapter should estimate RMSSD as ~0.8 * SDNN
      expect(result.data.hrv![0].rmssd).toBeCloseTo(48, 0); // 60 * 0.8
      expect(result.data.hrv![1].rmssd).toBeCloseTo(44, 0); // 55 * 0.8
    });

    it('should adapt SpO2 data correctly', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'garmin',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        spo2: [
          { timestamp: '2026-02-23T00:00:00Z', value: 97 },
          { timestamp: '2026-02-23T01:00:00Z', value: 96 },
          { timestamp: '2026-02-23T02:00:00Z', value: 95 },
          { timestamp: '2026-02-23T03:00:00Z', value: 88 },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.spo2).toBeDefined();
      expect(result.data.spo2).toBeCloseTo(94, 0); // Mean of 97+96+95+88
      expect(result.data.spo2Min).toBe(88);
    });

    it('should calculate resting heart rate correctly', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'fitbit',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        heartRate: [
          { timestamp: '2026-02-23T00:00:00Z', bpm: 65 },
          { timestamp: '2026-02-23T01:00:00Z', bpm: 58 },
          { timestamp: '2026-02-23T02:00:00Z', bpm: 55 },
          { timestamp: '2026-02-23T03:00:00Z', bpm: 52 },
          { timestamp: '2026-02-23T04:00:00Z', bpm: 60 },
          { timestamp: '2026-02-23T05:00:00Z', bpm: 62 },
          { timestamp: '2026-02-23T06:00:00Z', bpm: 68 },
          { timestamp: '2026-02-23T07:00:00Z', bpm: 72 },
          { timestamp: '2026-02-23T08:00:00Z', bpm: 75 },
          { timestamp: '2026-02-23T09:00:00Z', bpm: 78 },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.restingHeartRate).toBeDefined();
      // 10th percentile of sorted values [52, 55, 58, 60, 62, 65, 68, 72, 75, 78]
      // With 10 items, index = floor(10 * 0.1) = 1, so value is 55
      expect(result.data.restingHeartRate).toBe(55);
    });

    it('should adapt skin temperature deviation', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'oura',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        skinTemperature: [
          { timestamp: '2026-02-23T00:00:00Z', value: -0.5, unit: 'celsius', isDeviation: true },
          { timestamp: '2026-02-23T02:00:00Z', value: -0.3, unit: 'celsius', isDeviation: true },
          { timestamp: '2026-02-23T04:00:00Z', value: 0.1, unit: 'celsius', isDeviation: true },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.skinTemperature).toBeDefined();
      expect(result.data.skinTemperature).toBeCloseTo(-0.233, 2); // Mean of deviations
    });

    it('should add warning for low-quality HRV provider', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'fitbit',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        hrv: [
          { timestamp: '2026-02-23T00:00:00Z', rmssd: 45.5 },
        ],
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.warnings).toContain('HRV from fitbit has lower accuracy');
    });

    it('should add warning if expected stages are missing', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'garmin', // Has stages capability
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        // No stages provided
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.warnings.some(w => w.includes('should have stages'))).toBe(true);
    });

    it('should calculate correct quality score based on provider', () => {
      const ouraSession: IOpenWearablesSleepSession = {
        id: 'session-oura',
        provider: 'oura',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        stages: [{ type: 'light', startTime: '2026-02-22T23:00:00Z', endTime: '2026-02-23T07:00:00Z' }],
        hrv: [{ timestamp: '2026-02-23T00:00:00Z', rmssd: 50 }],
      };

      const fitbitSession: IOpenWearablesSleepSession = {
        id: 'session-fitbit',
        provider: 'fitbit',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
        stages: [{ type: 'light', startTime: '2026-02-22T23:00:00Z', endTime: '2026-02-23T07:00:00Z' }],
        hrv: [{ timestamp: '2026-02-23T00:00:00Z', rmssd: 50 }],
      };

      const ouraResult = adapter.adaptSleepSession(ouraSession);
      const fitbitResult = adapter.adaptSleepSession(fitbitSession);

      // Oura should have higher quality score
      expect(ouraResult.qualityScore).toBeGreaterThan(fitbitResult.qualityScore);
      expect(ouraResult.qualityScore).toBeGreaterThanOrEqual(0.9);
      expect(fitbitResult.qualityScore).toBeLessThan(0.8);
    });

    it('should map unknown provider to manual source', () => {
      const session: IOpenWearablesSleepSession = {
        id: 'session-123',
        provider: 'custom',
        userId: 'user-456',
        startTime: '2026-02-22T23:00:00Z',
        endTime: '2026-02-23T07:00:00Z',
      };

      const result = adapter.adaptSleepSession(session);

      expect(result.data.source).toBe('manual');
    });
  });

  describe('adaptSleepSessions', () => {
    it('should adapt multiple sessions', () => {
      const sessions: IOpenWearablesSleepSession[] = [
        {
          id: 'session-1',
          provider: 'oura',
          userId: 'user-456',
          startTime: '2026-02-21T23:00:00Z',
          endTime: '2026-02-22T07:00:00Z',
        },
        {
          id: 'session-2',
          provider: 'garmin',
          userId: 'user-456',
          startTime: '2026-02-22T23:00:00Z',
          endTime: '2026-02-23T07:00:00Z',
        },
      ];

      const results = adapter.adaptSleepSessions(sessions);

      expect(results).toHaveLength(2);
      expect(results[0].data.sessionId).toBe('session-1');
      expect(results[1].data.sessionId).toBe('session-2');
    });
  });

  describe('getHighQualityProviders', () => {
    it('should return providers with confidence >= 0.8', () => {
      const highQuality = adapter.getHighQualityProviders();

      expect(highQuality).toContain('oura');
      expect(highQuality).toContain('whoop');
      expect(highQuality).toContain('garmin');
      expect(highQuality).toContain('polar');
      expect(highQuality).not.toContain('google_fit');
    });
  });

  describe('isHighQualityProvider', () => {
    it('should return true for high quality providers', () => {
      expect(adapter.isHighQualityProvider('oura')).toBe(true);
      expect(adapter.isHighQualityProvider('whoop')).toBe(true);
      expect(adapter.isHighQualityProvider('garmin')).toBe(true);
    });

    it('should return false for low quality providers', () => {
      expect(adapter.isHighQualityProvider('google_fit')).toBe(false);
      expect(adapter.isHighQualityProvider('custom')).toBe(false);
    });
  });

  describe('getProviderConfig', () => {
    it('should return correct config for known providers', () => {
      const ouraConfig = adapter.getProviderConfig('oura');

      expect(ouraConfig.hasReliableHRV).toBe(true);
      expect(ouraConfig.hasStages).toBe(true);
      expect(ouraConfig.hasSpO2).toBe(true);
      expect(ouraConfig.hasTemperature).toBe(true);
      expect(ouraConfig.confidenceWeight).toBeGreaterThanOrEqual(0.9);
    });

    it('should return default config for unknown providers', () => {
      const unknownConfig = adapter.getProviderConfig('custom');

      expect(unknownConfig.confidenceWeight).toBeLessThan(0.6);
    });
  });
});
