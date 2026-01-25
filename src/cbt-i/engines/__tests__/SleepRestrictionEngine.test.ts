/**
 * SleepRestrictionEngine Tests - Safety-Critical Module
 * ======================================================
 *
 * IEC 62304 Class C - Maximum verification required
 *
 * Tests verify:
 * - Spielman (1987) protocol compliance
 * - Safety constants (MIN_TIB = 300 minutes)
 * - SE thresholds (85%/90% per CLAUDE.md)
 * - Adjustment increments (±15 minutes)
 *
 * References:
 * - Spielman, A.J. et al. (1987). Sleep, 10(1), 45-56
 * - Stanford Sleep Medicine: sleep restriction guidelines
 */

import { SleepRestrictionEngine } from '../SleepRestrictionEngine';
import type { ISleepMetrics } from '../../../sleep/interfaces/ISleepState';

describe('SleepRestrictionEngine', () => {
  let engine: SleepRestrictionEngine;

  beforeEach(() => {
    engine = new SleepRestrictionEngine();
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Minimum TIB (5 hours = 300 minutes)
  // ==========================================================================
  describe('SAFETY: Minimum Time In Bed', () => {
    it('should never prescribe TIB below 300 minutes (5 hours)', () => {
      // Patient with very low TST (180 min = 3 hours)
      const lowTSTHistory = createSleepHistory(7, {
        totalSleepTime: 180,
        timeInBed: 480,
        sleepEfficiency: 37.5,
      });

      const prescription = engine.calculateInitialWindow(lowTSTHistory, '07:00');

      // SAFETY CHECK: Must be >= 300 minutes
      expect(prescription.prescribedTIB).toBeGreaterThanOrEqual(300);
      expect(prescription.prescribedTIB).toBe(300); // Should be exactly 300 (min)
    });

    it('should not decrease TIB below 300 minutes during adjustment', () => {
      const currentPrescription = {
        prescribedTIB: 315, // Just above minimum
        prescribedBedtime: '23:45',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 2,
      };

      // Very low efficiency should trigger decrease
      const lowEfficiencyMetrics = createSleepHistory(7, {
        totalSleepTime: 200,
        timeInBed: 315,
        sleepEfficiency: 63.5, // Very low
      });

      const adjusted = engine.evaluateAndAdjust(currentPrescription, lowEfficiencyMetrics);

      // SAFETY CHECK: Must not go below 300
      expect(adjusted.prescribedTIB).toBeGreaterThanOrEqual(300);
      expect(adjusted.prescribedTIB).toBe(300); // Clamped to minimum
    });

    it('should set minimumTIB to 300 in prescription', () => {
      const history = createSleepHistory(7, {
        totalSleepTime: 360,
        timeInBed: 480,
        sleepEfficiency: 75,
      });

      const prescription = engine.calculateInitialWindow(history, '07:00');

      expect(prescription.minimumTIB).toBe(300);
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Sleep Efficiency Thresholds
  // ==========================================================================
  describe('SAFETY: Sleep Efficiency Thresholds', () => {
    const basePrescription = {
      prescribedTIB: 360,
      prescribedBedtime: '01:00',
      prescribedWakeTime: '07:00',
      efficiencyThreshold: 85,
      minimumTIB: 300,
      adjustmentIncrement: 15,
      evaluationPeriod: 7,
      isActive: true,
      startDate: '2025-01-01',
      currentWeek: 1,
    };

    it('should increase TIB when SE >= 90%', () => {
      const highEfficiencyMetrics = createSleepHistory(7, {
        totalSleepTime: 330,
        timeInBed: 360,
        sleepEfficiency: 91.7, // >= 90%
      });

      const adjusted = engine.evaluateAndAdjust(basePrescription, highEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(375); // 360 + 15
    });

    it('should maintain TIB when SE is 85-89%', () => {
      const midEfficiencyMetrics = createSleepHistory(7, {
        totalSleepTime: 310,
        timeInBed: 360,
        sleepEfficiency: 86.1, // 85-89%
      });

      const adjusted = engine.evaluateAndAdjust(basePrescription, midEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(360); // Unchanged
    });

    it('should decrease TIB when SE < 85%', () => {
      const lowEfficiencyMetrics = createSleepHistory(7, {
        totalSleepTime: 280,
        timeInBed: 360,
        sleepEfficiency: 77.8, // < 85%
      });

      const adjusted = engine.evaluateAndAdjust(basePrescription, lowEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(345); // 360 - 15
    });

    it('should handle exactly 85% efficiency (maintain)', () => {
      const exactThresholdMetrics = createSleepHistory(7, {
        totalSleepTime: 306,
        timeInBed: 360,
        sleepEfficiency: 85.0, // Exactly 85%
      });

      const adjusted = engine.evaluateAndAdjust(basePrescription, exactThresholdMetrics);

      // At 85%, should maintain (not decrease)
      expect(adjusted.prescribedTIB).toBe(360);
    });

    it('should handle exactly 90% efficiency (increase)', () => {
      const exactThresholdMetrics = createSleepHistory(7, {
        totalSleepTime: 324,
        timeInBed: 360,
        sleepEfficiency: 90.0, // Exactly 90%
      });

      const adjusted = engine.evaluateAndAdjust(basePrescription, exactThresholdMetrics);

      // At 90%, should increase
      expect(adjusted.prescribedTIB).toBe(375);
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Adjustment Increments
  // ==========================================================================
  describe('SAFETY: Adjustment Increments', () => {
    it('should use 15-minute increments for increases', () => {
      const prescription = {
        prescribedTIB: 360,
        prescribedBedtime: '01:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 1,
      };

      const highEfficiency = createSleepHistory(7, {
        sleepEfficiency: 92,
        totalSleepTime: 331,
        timeInBed: 360,
      });

      const adjusted = engine.evaluateAndAdjust(prescription, highEfficiency);
      const change = adjusted.prescribedTIB - prescription.prescribedTIB;

      expect(change).toBe(15);
    });

    it('should use 15-minute decrements for reductions', () => {
      const prescription = {
        prescribedTIB: 360,
        prescribedBedtime: '01:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 1,
      };

      const lowEfficiency = createSleepHistory(7, {
        sleepEfficiency: 75,
        totalSleepTime: 270,
        timeInBed: 360,
      });

      const adjusted = engine.evaluateAndAdjust(prescription, lowEfficiency);
      const change = prescription.prescribedTIB - adjusted.prescribedTIB;

      expect(change).toBe(15);
    });
  });

  // ==========================================================================
  // Initial Window Calculation
  // ==========================================================================
  describe('Initial Window Calculation', () => {
    it('should require at least 5 days of sleep data', () => {
      const insufficientHistory = createSleepHistory(4, {
        totalSleepTime: 360,
        timeInBed: 480,
        sleepEfficiency: 75,
      });

      expect(() => {
        engine.calculateInitialWindow(insufficientHistory, '07:00');
      }).toThrow('Need at least 5 days of sleep data');
    });

    it('should set initial TIB to average TST (when >= 300)', () => {
      const history = createSleepHistory(7, {
        totalSleepTime: 360, // 6 hours average
        timeInBed: 480,
        sleepEfficiency: 75,
      });

      const prescription = engine.calculateInitialWindow(history, '07:00');

      expect(prescription.prescribedTIB).toBe(360);
    });

    it('should calculate correct bedtime from wake time', () => {
      const history = createSleepHistory(7, {
        totalSleepTime: 360,
        timeInBed: 480,
        sleepEfficiency: 75,
      });

      const prescription = engine.calculateInitialWindow(history, '07:00');

      // TIB = 360 min = 6 hours, wake at 07:00 → bed at 01:00
      expect(prescription.prescribedBedtime).toBe('01:00');
      expect(prescription.prescribedWakeTime).toBe('07:00');
    });

    it('should handle bedtime crossing midnight', () => {
      const history = createSleepHistory(7, {
        totalSleepTime: 420, // 7 hours
        timeInBed: 480,
        sleepEfficiency: 87.5,
      });

      const prescription = engine.calculateInitialWindow(history, '06:00');

      // TIB = 420 min = 7 hours, wake at 06:00 → bed at 23:00
      expect(prescription.prescribedBedtime).toBe('23:00');
    });
  });

  // ==========================================================================
  // Maximum TIB Limit
  // ==========================================================================
  describe('Maximum TIB Limit', () => {
    it('should not exceed 540 minutes (9 hours)', () => {
      const prescription = {
        prescribedTIB: 535, // Near maximum
        prescribedBedtime: '22:05',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 8,
      };

      const highEfficiency = createSleepHistory(7, {
        sleepEfficiency: 95,
        totalSleepTime: 510,
        timeInBed: 535,
      });

      const adjusted = engine.evaluateAndAdjust(prescription, highEfficiency);

      // Should cap at 540
      expect(adjusted.prescribedTIB).toBeLessThanOrEqual(540);
    });
  });

  // ==========================================================================
  // Graduation Criteria
  // ==========================================================================
  describe('Graduation Criteria', () => {
    it('should require minimum 4 weeks before graduation', () => {
      const history = createSleepHistory(21, {
        sleepEfficiency: 90,
        totalSleepTime: 420,
        timeInBed: 467,
      });

      const prescription = {
        prescribedTIB: 420,
        prescribedBedtime: '00:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 3, // Only 3 weeks
      };

      const graduation = engine.checkGraduation(history, prescription);

      expect(graduation.ready).toBe(false);
      expect(graduation.reason).toContain('Minimum 4 weeks');
    });

    it('should allow graduation with SE >= 85% and TIB >= 420 min', () => {
      const history = createSleepHistory(28, {
        sleepEfficiency: 88,
        totalSleepTime: 400,
        timeInBed: 455,
      });

      const prescription = {
        prescribedTIB: 420, // 7 hours
        prescribedBedtime: '00:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 4,
      };

      const graduation = engine.checkGraduation(history, prescription);

      expect(graduation.ready).toBe(true);
    });
  });

  // ==========================================================================
  // Adherence Calculation
  // ==========================================================================
  describe('Adherence Calculation', () => {
    it('should calculate perfect adherence as 1.0', () => {
      const prescription = {
        prescribedTIB: 360,
        prescribedBedtime: '01:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 1,
      };

      const perfectAdherence = createSleepHistory(7, {
        timeInBed: 360,
        bedtime: '01:00',
        wakeTime: '07:00',
        totalSleepTime: 340,
        sleepEfficiency: 94.4,
      });

      const adherence = engine.calculateAdherence(prescription, perfectAdherence);

      expect(adherence).toBeCloseTo(1.0, 1);
    });

    it('should return 0 for empty behavior data', () => {
      const prescription = {
        prescribedTIB: 360,
        prescribedBedtime: '01:00',
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        startDate: '2025-01-01',
        currentWeek: 1,
      };

      const adherence = engine.calculateAdherence(prescription, []);

      expect(adherence).toBe(0);
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create mock sleep history for testing
 * ISleepMetrics interface from src/sleep/interfaces/ISleepState.ts
 */
function createSleepHistory(
  days: number,
  defaults: Partial<ISleepMetrics>
): ISleepMetrics[] {
  const history: ISleepMetrics[] = [];

  for (let i = 0; i < days; i++) {
    history.push({
      bedtime: defaults.bedtime ?? '23:00',
      wakeTime: defaults.wakeTime ?? '07:00',
      timeInBed: defaults.timeInBed ?? 480,
      totalSleepTime: defaults.totalSleepTime ?? 420,
      sleepOnsetLatency: defaults.sleepOnsetLatency ?? 15,
      wakeAfterSleepOnset: defaults.wakeAfterSleepOnset ?? 30,
      numberOfAwakenings: defaults.numberOfAwakenings ?? 2,
      sleepEfficiency: defaults.sleepEfficiency ?? 87.5,
      finalAwakening: defaults.finalAwakening ?? '06:45',
      outOfBedTime: defaults.outOfBedTime ?? '07:00',
    });
  }

  return history;
}
