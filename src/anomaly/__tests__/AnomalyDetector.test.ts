/**
 * AnomalyDetector Tests
 * =====================
 * Tests for Z-score based anomaly detection in sleep patterns.
 *
 * @packageDocumentation
 * @module @sleepcore/anomaly
 */

import { AnomalyDetector } from '../AnomalyDetector';
import type { SleepSessionForAnomaly, BaselineStats } from '../types';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('calculateBaseline', () => {
    it('calculates baseline from 7+ sessions', () => {
      const sessions = generateMockSessions(10, {
        tst: 420,
        se: 85,
        sol: 15,
        waso: 20,
      });

      const baseline = detector.calculateBaseline(sessions);

      expect(baseline.sampleCount).toBe(10);
      expect(baseline.isReliable).toBe(true);
      expect(baseline.meanTST).toBeCloseTo(420, 0);
      expect(baseline.meanSE).toBeCloseTo(85, 0);
    });

    it('marks baseline as unreliable with < 7 sessions', () => {
      const sessions = generateMockSessions(5);

      const baseline = detector.calculateBaseline(sessions);

      expect(baseline.sampleCount).toBe(5);
      expect(baseline.isReliable).toBe(false);
    });

    it('handles empty sessions array', () => {
      const baseline = detector.calculateBaseline([]);

      expect(baseline.sampleCount).toBe(0);
      expect(baseline.isReliable).toBe(false);
    });

    it('uses most recent sessions within maxBaselineSessions', () => {
      // Default max is 30
      const sessions = generateMockSessions(50);

      const baseline = detector.calculateBaseline(sessions);

      expect(baseline.sampleCount).toBeLessThanOrEqual(30);
    });

    it('calculates standard deviation correctly', () => {
      // Create sessions with known variability
      const sessions: SleepSessionForAnomaly[] = [
        createSession('2025-01-01', { tst: 400 }),
        createSession('2025-01-02', { tst: 420 }),
        createSession('2025-01-03', { tst: 440 }),
        createSession('2025-01-04', { tst: 400 }),
        createSession('2025-01-05', { tst: 420 }),
        createSession('2025-01-06', { tst: 440 }),
        createSession('2025-01-07', { tst: 420 }),
      ];

      const baseline = detector.calculateBaseline(sessions);

      // Mean should be ~420
      expect(baseline.meanTST).toBeCloseTo(420, 1);
      // Std should be non-zero
      expect(baseline.stdTST).toBeGreaterThan(0);
    });

    it('sets date range from sessions', () => {
      const sessions = generateMockSessions(10);

      const baseline = detector.calculateBaseline(sessions);

      expect(baseline.dateRange.start).toBeInstanceOf(Date);
      expect(baseline.dateRange.end).toBeInstanceOf(Date);
      expect(baseline.dateRange.start.getTime()).toBeLessThanOrEqual(
        baseline.dateRange.end.getTime()
      );
    });
  });

  describe('SAFETY: Anomaly Detection', () => {
    it('detects anomaly when TST z-score > 2', () => {
      const baseline: BaselineStats = createBaseline({
        meanTST: 420,
        stdTST: 30,
      });

      // TST of 300 is 4 std below mean: (300-420)/30 = -4
      const session = createSession('2025-01-15', { tst: 300 });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('severe');
      expect(result.details.tst.isAnomaly).toBe(true);
    });

    it('does not flag normal sessions as anomalies', () => {
      const baseline = createBaseline({
        meanTST: 420,
        stdTST: 30,
        meanSE: 85,
        stdSE: 5,
        meanSOL: 15,
        stdSOL: 5,
        meanWASO: 20,
        stdWASO: 10,
      });

      // All values within 1 std of mean
      const session = createSession('2025-01-15', {
        tst: 410,
        se: 83,
        sol: 18,
        waso: 25,
      });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.isAnomaly).toBe(false);
    });

    it('detects SE anomaly (low efficiency)', () => {
      const baseline = createBaseline({
        meanSE: 85,
        stdSE: 5,
      });

      // SE of 70 is 3 std below mean: (70-85)/5 = -3
      const session = createSession('2025-01-15', { se: 70 });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.details.se.isAnomaly).toBe(true);
    });

    it('detects SOL anomaly (long latency)', () => {
      const baseline = createBaseline({
        meanSOL: 15,
        stdSOL: 5,
      });

      // SOL of 45 is 6 std above mean: (45-15)/5 = 6
      const session = createSession('2025-01-15', { sol: 45 });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.details.sol.isAnomaly).toBe(true);
      expect(result.severity).toBe('severe');
    });

    it('detects combined anomaly when multiple metrics are off', () => {
      const baseline = createBaseline({
        meanTST: 420,
        stdTST: 30,
        meanSE: 85,
        stdSE: 5,
      });

      const session = createSession('2025-01-15', {
        tst: 300, // -4 std
        se: 65, // -4 std
      });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.metric).toBe('combined');
      expect(result.details.tst.isAnomaly).toBe(true);
      expect(result.details.se.isAnomaly).toBe(true);
    });
  });

  describe('calculateZScore', () => {
    it('calculates correct z-score', () => {
      // z = (value - mean) / std
      const z = detector.calculateZScore(100, 80, 10);
      expect(z).toBe(2);
    });

    it('returns 0 for value equal to mean', () => {
      const z = detector.calculateZScore(80, 80, 10);
      expect(z).toBe(0);
    });

    it('returns negative z for value below mean', () => {
      const z = detector.calculateZScore(60, 80, 10);
      expect(z).toBe(-2);
    });

    it('handles very small std (no division by zero)', () => {
      const z = detector.calculateZScore(100, 80, 0.0001);
      expect(Number.isFinite(z)).toBe(true);
    });
  });

  describe('getSeverity', () => {
    it('returns mild for |z| between 2 and 2.5', () => {
      expect(detector.getSeverity(2.1)).toBe('mild');
      expect(detector.getSeverity(-2.1)).toBe('mild');
    });

    it('returns moderate for |z| between 2.5 and 3', () => {
      expect(detector.getSeverity(2.6)).toBe('moderate');
      expect(detector.getSeverity(-2.6)).toBe('moderate');
    });

    it('returns severe for |z| >= 3', () => {
      expect(detector.getSeverity(3.0)).toBe('severe');
      expect(detector.getSeverity(-4.0)).toBe('severe');
    });
  });

  describe('getDirection', () => {
    it('returns positive for high TST', () => {
      expect(detector.getDirection(2.5, 'tst')).toBe('positive');
    });

    it('returns negative for low TST', () => {
      expect(detector.getDirection(-2.5, 'tst')).toBe('negative');
    });

    it('returns positive for high SE', () => {
      expect(detector.getDirection(2.5, 'se')).toBe('positive');
    });

    it('returns positive for low SOL (faster sleep onset)', () => {
      expect(detector.getDirection(-2.5, 'sol')).toBe('positive');
    });

    it('returns negative for high SOL (slow sleep onset)', () => {
      expect(detector.getDirection(2.5, 'sol')).toBe('negative');
    });

    it('returns positive for low WASO', () => {
      expect(detector.getDirection(-2.5, 'waso')).toBe('positive');
    });

    it('returns neutral for sub-threshold z-scores', () => {
      expect(detector.getDirection(1.5, 'tst')).toBe('neutral');
    });
  });

  describe('findAnomalies', () => {
    it('returns empty array for insufficient data', () => {
      const sessions = generateMockSessions(5);
      const anomalies = detector.findAnomalies(sessions);
      expect(anomalies).toEqual([]);
    });

    it('finds anomalies in session list', () => {
      // Normal sessions
      const normalSessions = generateMockSessions(10, {
        tst: 420,
        se: 85,
        sol: 15,
        waso: 20,
      });

      // Add an anomalous session
      const anomalousSession = createSession('2025-01-20', {
        tst: 250, // Very low
        se: 60, // Very low
        sol: 60, // Very high
        waso: 80, // Very high
      });

      const allSessions = [...normalSessions, anomalousSession];

      const anomalies = detector.findAnomalies(allSessions);

      expect(anomalies.length).toBeGreaterThanOrEqual(1);
      expect(anomalies.some((a) => a.date.getTime() === anomalousSession.date.getTime())).toBe(true);
    });

    it('accepts pre-calculated baseline', () => {
      const sessions = generateMockSessions(10);
      const baseline = detector.calculateBaseline(sessions);

      const anomalies = detector.findAnomalies(sessions, baseline);

      // Should work without error
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('isBaselineReliable', () => {
    it('returns true for reliable baseline', () => {
      const baseline = createBaseline({ sampleCount: 10 });
      expect(detector.isBaselineReliable(baseline)).toBe(true);
    });

    it('returns false for unreliable baseline', () => {
      const baseline = createBaseline({ sampleCount: 5, isReliable: false });
      expect(detector.isBaselineReliable(baseline)).toBe(false);
    });
  });

  describe('CALIBRATED UNCERTAINTY: Explanations', () => {
    it('includes severity in explanation', () => {
      const baseline = createBaseline({
        meanTST: 420,
        stdTST: 30,
      });

      const session = createSession('2025-01-15', { tst: 300 });
      const result = detector.detectAnomaly(session, baseline);

      expect(result.explanation).toContain('Значительно');
    });

    it('explains what metric is anomalous', () => {
      const baseline = createBaseline({
        meanTST: 420,
        stdTST: 30,
      });

      const session = createSession('2025-01-15', { tst: 300 });
      const result = detector.detectAnomaly(session, baseline);

      // Should mention sleep time
      expect(
        result.explanation.includes('сон') ||
        result.explanation.includes('мин')
      ).toBe(true);
    });

    it('describes multiple anomalies in combined explanation', () => {
      const baseline = createBaseline({
        meanTST: 420,
        stdTST: 30,
        meanSE: 85,
        stdSE: 5,
      });

      const session = createSession('2025-01-15', {
        tst: 300,
        se: 65,
      });

      const result = detector.detectAnomaly(session, baseline);

      expect(result.metric).toBe('combined');
      expect(result.explanation).toContain('Необычная ночь');
    });
  });

  describe('Edge Cases', () => {
    it('handles session with zero values', () => {
      const baseline = createBaseline();
      const session = createSession('2025-01-15', {
        tst: 0,
        se: 0,
        sol: 0,
        waso: 0,
      });

      const result = detector.detectAnomaly(session, baseline);

      // Should not crash
      expect(result).toBeDefined();
      expect(result.isAnomaly).toBe(true); // 0 values are definitely anomalous
    });

    it('handles session with very high values', () => {
      const baseline = createBaseline();
      const session = createSession('2025-01-15', {
        tst: 1000, // ~16 hours
        se: 100,
        sol: 200,
        waso: 200,
      });

      const result = detector.detectAnomaly(session, baseline);

      expect(result).toBeDefined();
      expect(Number.isFinite(result.zScore)).toBe(true);
    });

    it('handles identical baseline values (zero variance)', () => {
      // All sessions have exact same values
      const sessions: SleepSessionForAnomaly[] = Array.from({ length: 10 }, (_, i) =>
        createSession(`2025-01-${(i + 1).toString().padStart(2, '0')}`, {
          tst: 420,
          se: 85,
          sol: 15,
          waso: 20,
        })
      );

      const baseline = detector.calculateBaseline(sessions);

      // Std should be small but not zero (MIN_STD)
      expect(baseline.stdTST).toBeGreaterThan(0);

      // Should detect even small deviation
      const session = createSession('2025-01-15', { tst: 421 });
      const result = detector.detectAnomaly(session, baseline);

      // Should not crash
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Generate mock sleep sessions with optional default values
 */
function generateMockSessions(
  count: number,
  defaults: Partial<Omit<SleepSessionForAnomaly, 'date'>> = {}
): SleepSessionForAnomaly[] {
  const sessions: SleepSessionForAnomaly[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date('2025-01-01');
    date.setDate(date.getDate() + i);

    sessions.push({
      date,
      tst: defaults.tst ?? 420 + Math.random() * 30 - 15,
      se: defaults.se ?? 85 + Math.random() * 5 - 2.5,
      sol: defaults.sol ?? 15 + Math.random() * 5 - 2.5,
      waso: defaults.waso ?? 20 + Math.random() * 10 - 5,
    });
  }

  return sessions;
}

/**
 * Create a single session with specific values
 */
function createSession(
  dateStr: string,
  overrides: Partial<Omit<SleepSessionForAnomaly, 'date'>> = {}
): SleepSessionForAnomaly {
  return {
    date: new Date(dateStr),
    tst: overrides.tst ?? 420,
    se: overrides.se ?? 85,
    sol: overrides.sol ?? 15,
    waso: overrides.waso ?? 20,
  };
}

/**
 * Create a baseline with specific values
 */
function createBaseline(
  overrides: Partial<BaselineStats> = {}
): BaselineStats {
  return {
    meanTST: overrides.meanTST ?? 420,
    stdTST: overrides.stdTST ?? 30,
    meanSE: overrides.meanSE ?? 85,
    stdSE: overrides.stdSE ?? 5,
    meanSOL: overrides.meanSOL ?? 15,
    stdSOL: overrides.stdSOL ?? 5,
    meanWASO: overrides.meanWASO ?? 20,
    stdWASO: overrides.stdWASO ?? 10,
    sampleCount: overrides.sampleCount ?? 10,
    dateRange: overrides.dateRange ?? {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-10'),
    },
    isReliable: overrides.isReliable ?? true,
  };
}
