/**
 * RQAMetricsLogger Unit Tests
 * ============================
 * Tests for experimental Recurrence Quantification Analysis metrics.
 *
 * Research basis:
 * - Webber & Zbilut 2005: RQA for physiological signals
 * - Marwan 2007: Cross-recurrence quantification
 *
 * NOTE: RQA is NOT validated for self-report sleep diary data.
 * This module is EXPERIMENTAL (disabled by default, console.debug only).
 *
 * @packageDocumentation
 */

import {
  RQAMetricsLogger,
  createRQAMetricsLogger,
  rqaMetricsLogger,
  DEFAULT_RQA_CONFIG,
  type IRQAMetrics,
} from '../../../../src/bot/services/RQAMetricsLogger';

import type { ISleepHistoryEntry } from '../../../../src/bot/services/SleepPredictionService';
import type { ISleepMetrics } from '../../../../src/sleep/interfaces/ISleepState';

// ==================== Mock Data ====================

const createMockEntry = (
  daysAgo: number,
  se: number,
  userId = 'test-user'
): ISleepHistoryEntry => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    userId,
    date,
    metrics: {
      timeInBed: 480,
      totalSleepTime: (se / 100) * 480,
      sleepOnsetLatency: 20,
      wakeAfterSleepOnset: 30,
      sleepEfficiency: se,
      numberOfAwakenings: 2,
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:45',
      outOfBedTime: '07:00',
    } as ISleepMetrics,
    subjectiveQuality: 0.7,
  };
};

const createHistory = (days: number, seGenerator: (i: number) => number): ISleepHistoryEntry[] => {
  const entries: ISleepHistoryEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    entries.push(createMockEntry(i, seGenerator(i)));
  }
  return entries;
};

// ==================== Tests ====================

describe('RQAMetricsLogger', () => {
  describe('DEFAULT_RQA_CONFIG', () => {
    it('should be disabled by default', () => {
      expect(DEFAULT_RQA_CONFIG.enabled).toBe(false);
    });

    it('should have sensible embedding parameters', () => {
      expect(DEFAULT_RQA_CONFIG.embeddingDimension).toBe(3);
      expect(DEFAULT_RQA_CONFIG.timeDelay).toBe(1);
      expect(DEFAULT_RQA_CONFIG.recurrenceThreshold).toBe(0.1);
      expect(DEFAULT_RQA_CONFIG.minDataPoints).toBe(14);
    });
  });

  describe('singleton instance', () => {
    it('should be disabled by default', () => {
      expect(rqaMetricsLogger.isEnabled()).toBe(false);
    });
  });

  describe('computeAndLog()', () => {
    it('should do nothing when disabled', () => {
      const logger = createRQAMetricsLogger({ enabled: false });
      const spy = jest.spyOn(console, 'debug').mockImplementation();

      const history = createHistory(20, (i) => 80 + Math.sin(i) * 5);
      logger.computeAndLog('user-1', history);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should do nothing with insufficient data', () => {
      const logger = createRQAMetricsLogger({ enabled: true });
      const spy = jest.spyOn(console, 'debug').mockImplementation();

      const history = createHistory(10, (i) => 80 + i); // < 14 days
      logger.computeAndLog('user-1', history);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log to console.debug when enabled with sufficient data', () => {
      const logger = createRQAMetricsLogger({ enabled: true });
      const spy = jest.spyOn(console, 'debug').mockImplementation();

      const history = createHistory(20, (i) => 80 + Math.sin(i) * 5);
      logger.computeAndLog('user-1', history);

      expect(spy).toHaveBeenCalledWith(
        '[RQA-Experimental]',
        expect.objectContaining({
          userId: 'user-1',
          dataPoints: 20,
          metrics: expect.any(Object),
          config: expect.objectContaining({
            embeddingDimension: 3,
            timeDelay: 1,
          }),
        })
      );

      spy.mockRestore();
    });

    it('should handle errors gracefully', () => {
      const logger = createRQAMetricsLogger({ enabled: true, minDataPoints: 0 });
      const spy = jest.spyOn(console, 'debug').mockImplementation();

      // Empty history should not throw
      expect(() => logger.computeAndLog('user-1', [])).not.toThrow();

      spy.mockRestore();
    });
  });

  describe('computeRQA()', () => {
    let logger: RQAMetricsLogger;

    beforeEach(() => {
      logger = createRQAMetricsLogger({ enabled: true });
    });

    it('should return all required metrics', () => {
      const series = Array.from({ length: 20 }, (_, i) => 80 + Math.sin(i * 0.5) * 10);
      const metrics = logger.computeRQA(series);

      expect(metrics.recurrenceRate).toBeDefined();
      expect(metrics.determinism).toBeDefined();
      expect(metrics.laminarity).toBeDefined();
      expect(metrics.maxDiagonalLength).toBeDefined();
      expect(metrics.entropy).toBeDefined();
      expect(metrics.trappingTime).toBeDefined();
    });

    it('should return metrics in valid ranges', () => {
      const series = Array.from({ length: 20 }, (_, i) => 80 + Math.sin(i * 0.5) * 10);
      const metrics = logger.computeRQA(series);

      expect(metrics.recurrenceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.recurrenceRate).toBeLessThanOrEqual(1);
      expect(metrics.determinism).toBeGreaterThanOrEqual(0);
      expect(metrics.determinism).toBeLessThanOrEqual(1);
      expect(metrics.laminarity).toBeGreaterThanOrEqual(0);
      expect(metrics.laminarity).toBeLessThanOrEqual(1);
      expect(metrics.maxDiagonalLength).toBeGreaterThanOrEqual(0);
      expect(metrics.entropy).toBeGreaterThanOrEqual(0);
      expect(metrics.trappingTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect higher determinism in periodic vs random series', () => {
      // Periodic series (sinusoidal)
      const periodic = Array.from({ length: 30 }, (_, i) => 80 + 10 * Math.sin(i * Math.PI / 5));
      const periodicMetrics = logger.computeRQA(periodic);

      // Random series
      const seededRandom = (seed: number) => {
        let s = seed;
        return () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return (s / 0x7fffffff) * 20 + 70;
        };
      };
      const rng = seededRandom(12345);
      const random = Array.from({ length: 30 }, () => rng());
      const randomMetrics = logger.computeRQA(random);

      // Periodic signal should have higher recurrence rate
      expect(periodicMetrics.recurrenceRate).toBeGreaterThan(randomMetrics.recurrenceRate);
    });

    it('should compute correct recurrence rate for constant series', () => {
      // Constant series: every point recurs with every other
      const constant = Array.from({ length: 20 }, () => 80);
      const metrics = logger.computeRQA(constant);

      // For a constant series, every pair is within epsilon → RR ≈ 1
      expect(metrics.recurrenceRate).toBeGreaterThan(0.9);
    });
  });

  describe('isEnabled()', () => {
    it('should return false when disabled', () => {
      const logger = createRQAMetricsLogger({ enabled: false });
      expect(logger.isEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      const logger = createRQAMetricsLogger({ enabled: true });
      expect(logger.isEnabled()).toBe(true);
    });
  });
});
