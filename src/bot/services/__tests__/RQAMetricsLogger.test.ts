/**
 * RQAMetricsLogger Tests
 * ======================
 *
 * Tests for experimental Recurrence Quantification Analysis metrics logger.
 * Validates RQA computation, feature flag behavior, and metric ranges.
 *
 * Scientific basis: Webber & Zbilut 2005, Marwan 2007
 *
 * @packageDocumentation
 */

import {
  RQAMetricsLogger,
  createRQAMetricsLogger,
  rqaMetricsLogger,
  DEFAULT_RQA_CONFIG,
  type IRQAConfig,
  type IRQAMetrics,
} from '../RQAMetricsLogger';
import type { ISleepHistoryEntry } from '../SleepPredictionService';

// Helper to create a mock ISleepHistoryEntry with a given sleep efficiency
function createMockHistoryEntry(
  sleepEfficiency: number,
  dayOffset: number = 0
): ISleepHistoryEntry {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);

  return {
    userId: 'test-user',
    date,
    metrics: {
      timeInBed: 480,
      totalSleepTime: Math.round(480 * (sleepEfficiency / 100)),
      sleepOnsetLatency: 15,
      wakeAfterSleepOnset: 20,
      numberOfAwakenings: 2,
      sleepEfficiency,
      bedtime: '23:00',
      wakeTime: '07:00',
    } as ISleepHistoryEntry['metrics'],
    subjectiveQuality: 0.5,
  };
}

// Helper to create a history array from a SE time series
function createHistoryFromSE(values: number[]): ISleepHistoryEntry[] {
  return values.map((se, i) => createMockHistoryEntry(se, values.length - 1 - i));
}

describe('RQAMetricsLogger', () => {
  // ==========================================================================
  // Constructor & Configuration
  // ==========================================================================
  describe('Constructor', () => {
    it('should create instance with default config (disabled by default)', () => {
      const logger = new RQAMetricsLogger();

      expect(logger.isEnabled()).toBe(false);
    });

    it('should create instance with custom config', () => {
      const logger = new RQAMetricsLogger({ enabled: true, embeddingDimension: 5 });

      expect(logger.isEnabled()).toBe(true);
    });

    it('should merge partial config with defaults', () => {
      const logger = new RQAMetricsLogger({ enabled: true });

      // enabled is overridden, but other defaults remain
      expect(logger.isEnabled()).toBe(true);
    });

    it('should have correct default config values', () => {
      expect(DEFAULT_RQA_CONFIG.enabled).toBe(false);
      expect(DEFAULT_RQA_CONFIG.embeddingDimension).toBe(3);
      expect(DEFAULT_RQA_CONFIG.timeDelay).toBe(1);
      expect(DEFAULT_RQA_CONFIG.recurrenceThreshold).toBe(0.1);
      expect(DEFAULT_RQA_CONFIG.minDataPoints).toBe(14);
    });
  });

  // ==========================================================================
  // isEnabled()
  // ==========================================================================
  describe('isEnabled()', () => {
    it('should return false when disabled', () => {
      const logger = new RQAMetricsLogger({ enabled: false });
      expect(logger.isEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      const logger = new RQAMetricsLogger({ enabled: true });
      expect(logger.isEnabled()).toBe(true);
    });

    it('should return false for singleton instance', () => {
      expect(rqaMetricsLogger.isEnabled()).toBe(false);
    });
  });

  // ==========================================================================
  // computeRQA() — simple time series
  // ==========================================================================
  describe('computeRQA() with simple time series', () => {
    let logger: RQAMetricsLogger;

    beforeEach(() => {
      logger = new RQAMetricsLogger({ enabled: true });
    });

    it('should return 6 RQA metrics for a varying time series', () => {
      // A time series with some recurrence pattern
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics).toHaveProperty('recurrenceRate');
      expect(metrics).toHaveProperty('determinism');
      expect(metrics).toHaveProperty('laminarity');
      expect(metrics).toHaveProperty('maxDiagonalLength');
      expect(metrics).toHaveProperty('entropy');
      expect(metrics).toHaveProperty('trappingTime');
    });

    it('should compute non-zero recurrenceRate for periodic data', () => {
      // Periodic pattern: repeating values should produce recurrence
      const timeSeries = [70, 80, 90, 70, 80, 90, 70, 80, 90, 70, 80, 90, 70, 80];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBeGreaterThan(0);
    });

    it('should produce valid metric types (all numbers)', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];

      const metrics = logger.computeRQA(timeSeries);

      expect(typeof metrics.recurrenceRate).toBe('number');
      expect(typeof metrics.determinism).toBe('number');
      expect(typeof metrics.laminarity).toBe('number');
      expect(typeof metrics.maxDiagonalLength).toBe('number');
      expect(typeof metrics.entropy).toBe('number');
      expect(typeof metrics.trappingTime).toBe('number');
    });
  });

  // ==========================================================================
  // computeRQA() — constant series
  // ==========================================================================
  describe('computeRQA() with constant series', () => {
    let logger: RQAMetricsLogger;

    beforeEach(() => {
      logger = new RQAMetricsLogger({ enabled: true });
    });

    it('should handle constant series (all same values)', () => {
      // All values the same => range = 0 => epsilon = 0 => distance 0 <= 0 => all recurrent
      const timeSeries = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80];

      const metrics = logger.computeRQA(timeSeries);

      // With constant data: all embedded vectors are identical, distance = 0,
      // epsilon = 0 (range=0 * threshold), so dist <= epsilon => all recurrent
      expect(metrics.recurrenceRate).toBe(1);
    });

    it('should return determinism for constant series', () => {
      const timeSeries = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80];

      const metrics = logger.computeRQA(timeSeries);

      // Constant series has perfect recurrence and diagonal lines
      expect(metrics.determinism).toBeGreaterThanOrEqual(0);
    });

    it('should return non-negative entropy for constant series', () => {
      const timeSeries = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.entropy).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // computeRQA() — short series
  // ==========================================================================
  describe('computeRQA() with short series', () => {
    let logger: RQAMetricsLogger;

    beforeEach(() => {
      logger = new RQAMetricsLogger({ enabled: true });
    });

    it('should handle a very short series (embedding produces few vectors)', () => {
      // With embeddingDimension=3 and timeDelay=1, a 4-element series
      // produces n = 4 - (3-1)*1 = 2 embedded vectors
      const timeSeries = [70, 80, 90, 75];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics).toBeDefined();
      expect(metrics.recurrenceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.recurrenceRate).toBeLessThanOrEqual(1);
    });

    it('should handle minimal series (3 elements with default config)', () => {
      // With embeddingDimension=3, timeDelay=1: n = 3 - 2 = 1 vector
      // Only 1 vector => 0 pairs => recurrenceRate = 0
      const timeSeries = [70, 80, 90];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBe(0);
      expect(metrics.determinism).toBe(0);
      expect(metrics.laminarity).toBe(0);
      expect(metrics.maxDiagonalLength).toBe(0);
      expect(metrics.entropy).toBe(0);
      expect(metrics.trappingTime).toBe(0);
    });

    it('should handle series with length equal to embedding dimension', () => {
      // Exactly embeddingDimension=3 elements => 1 embedded vector
      const timeSeries = [75, 82, 88];

      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBe(0);
    });
  });

  // ==========================================================================
  // computeAndLog()
  // ==========================================================================
  describe('computeAndLog()', () => {
    it('should not log when disabled', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const logger = new RQAMetricsLogger({ enabled: false });

      const history = createHistoryFromSE([
        75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82,
      ]);

      logger.computeAndLog('user-1', history);

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it('should not log when history is less than minDataPoints (14)', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const logger = new RQAMetricsLogger({ enabled: true });

      // Only 10 entries, less than default minDataPoints=14
      const history = createHistoryFromSE([75, 80, 72, 85, 78, 80, 73, 86, 79, 81]);

      logger.computeAndLog('user-1', history);

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it('should log when enabled AND history >= 14 days', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const logger = new RQAMetricsLogger({ enabled: true });

      const history = createHistoryFromSE([
        75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82,
      ]);

      logger.computeAndLog('user-1', history);

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledWith(
        '[RQA-Experimental]',
        expect.objectContaining({
          userId: 'user-1',
          dataPoints: 14,
          metrics: expect.any(Object),
          config: expect.objectContaining({
            embeddingDimension: 3,
            timeDelay: 1,
            threshold: 0.1,
          }),
        })
      );
      debugSpy.mockRestore();
    });

    it('should log with custom minDataPoints threshold', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const logger = new RQAMetricsLogger({ enabled: true, minDataPoints: 7 });

      const history = createHistoryFromSE([75, 80, 72, 85, 78, 80, 73]);

      logger.computeAndLog('user-1', history);

      expect(debugSpy).toHaveBeenCalledTimes(1);
      debugSpy.mockRestore();
    });

    it('should handle errors gracefully in computeAndLog', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const logger = new RQAMetricsLogger({ enabled: true, minDataPoints: 1 });

      // Create history with entries that would cause issues — empty metrics
      const brokenHistory: ISleepHistoryEntry[] = [
        {
          userId: 'test',
          date: new Date(),
          metrics: {} as ISleepHistoryEntry['metrics'],
          subjectiveQuality: 0.5,
        },
      ];

      // Should not throw, should log error to console.debug
      expect(() => logger.computeAndLog('user-1', brokenHistory)).not.toThrow();

      debugSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Metrics range validation
  // ==========================================================================
  describe('Metrics are in valid ranges', () => {
    let logger: RQAMetricsLogger;

    beforeEach(() => {
      logger = new RQAMetricsLogger({ enabled: true });
    });

    it('should have recurrenceRate in [0, 1]', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.recurrenceRate).toBeLessThanOrEqual(1);
    });

    it('should have determinism in [0, 1]', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.determinism).toBeGreaterThanOrEqual(0);
      expect(metrics.determinism).toBeLessThanOrEqual(1);
    });

    it('should have laminarity in [0, 1]', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.laminarity).toBeGreaterThanOrEqual(0);
      expect(metrics.laminarity).toBeLessThanOrEqual(1);
    });

    it('should have non-negative maxDiagonalLength', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.maxDiagonalLength).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative entropy', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.entropy).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative trappingTime', () => {
      const timeSeries = [75, 80, 72, 85, 78, 80, 73, 86, 79, 81, 74, 87, 78, 82];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.trappingTime).toBeGreaterThanOrEqual(0);
    });

    it('should clamp metrics to valid ranges for highly recurrent data', () => {
      // Large uniform dataset
      const timeSeries = Array.from({ length: 20 }, () => 80);
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBeLessThanOrEqual(1);
      expect(metrics.determinism).toBeLessThanOrEqual(1);
      expect(metrics.laminarity).toBeLessThanOrEqual(1);
    });

    it('should produce valid ranges for random-like data', () => {
      // Pseudorandom spread
      const timeSeries = [60, 95, 55, 88, 62, 91, 58, 84, 67, 93, 54, 89, 61, 90];
      const metrics = logger.computeRQA(timeSeries);

      expect(metrics.recurrenceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.recurrenceRate).toBeLessThanOrEqual(1);
      expect(metrics.determinism).toBeGreaterThanOrEqual(0);
      expect(metrics.determinism).toBeLessThanOrEqual(1);
      expect(metrics.laminarity).toBeGreaterThanOrEqual(0);
      expect(metrics.laminarity).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Factory & Singleton
  // ==========================================================================
  describe('Factory & Singleton', () => {
    it('should create instance via factory function', () => {
      const logger = createRQAMetricsLogger({ enabled: true });

      expect(logger).toBeInstanceOf(RQAMetricsLogger);
      expect(logger.isEnabled()).toBe(true);
    });

    it('should create instance via factory with no args', () => {
      const logger = createRQAMetricsLogger();

      expect(logger).toBeInstanceOf(RQAMetricsLogger);
      expect(logger.isEnabled()).toBe(false);
    });

    it('should export singleton instance', () => {
      expect(rqaMetricsLogger).toBeInstanceOf(RQAMetricsLogger);
    });
  });
});
