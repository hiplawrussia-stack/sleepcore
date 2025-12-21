/**
 * SleepRestrictionEngine Unit Tests
 * Tests Spielman's Sleep Restriction Therapy implementation
 */

import { SleepRestrictionEngine } from '../../../src/cbt-i/engines/SleepRestrictionEngine';
import {
  createSleepMetrics,
  createSleepMetricsFromPattern,
  createWeeklySleepMetrics,
  createBaselinePeriod,
} from '../../helpers';

describe('SleepRestrictionEngine', () => {
  let engine: SleepRestrictionEngine;

  beforeEach(() => {
    engine = new SleepRestrictionEngine();
  });

  describe('calculateInitialWindow', () => {
    it('should throw error if less than 5 days of data', () => {
      const shortHistory = [
        createSleepMetrics(),
        createSleepMetrics(),
        createSleepMetrics(),
      ];

      expect(() =>
        engine.calculateInitialWindow(shortHistory, '07:00')
      ).toThrow('Need at least 5 days of sleep data');
    });

    it('should calculate initial TIB from average TST', () => {
      // 5 days with TST of 360 min (6 hours)
      const history = Array(5).fill(null).map(() =>
        createSleepMetrics({ totalSleepTime: 360 })
      );

      const prescription = engine.calculateInitialWindow(history, '07:00');

      // Initial TIB should equal average TST
      expect(prescription.prescribedTIB).toBe(360);
    });

    it('should enforce minimum TIB of 5 hours (300 min)', () => {
      // Very short sleepers - TST 4 hours
      const history = Array(5).fill(null).map(() =>
        createSleepMetrics({ totalSleepTime: 240 })
      );

      const prescription = engine.calculateInitialWindow(history, '07:00');

      // Should be clamped to minimum 300 min
      expect(prescription.prescribedTIB).toBe(300);
    });

    it('should calculate correct bedtime from wake time and TIB', () => {
      const history = Array(5).fill(null).map(() =>
        createSleepMetrics({ totalSleepTime: 360 }) // 6 hours
      );

      const prescription = engine.calculateInitialWindow(history, '07:00');

      // 07:00 wake - 6 hours TIB = 01:00 bedtime
      expect(prescription.prescribedBedtime).toBe('01:00');
    });

    it('should handle bedtime crossing midnight', () => {
      const history = Array(5).fill(null).map(() =>
        createSleepMetrics({ totalSleepTime: 420 }) // 7 hours
      );

      const prescription = engine.calculateInitialWindow(history, '06:00');

      // 06:00 wake - 7 hours TIB = 23:00 bedtime (previous day)
      expect(prescription.prescribedBedtime).toBe('23:00');
    });

    it('should set prescription properties correctly', () => {
      const history = createBaselinePeriod('insomnia', 7);
      const prescription = engine.calculateInitialWindow(history, '07:00');

      expect(prescription).toMatchObject({
        prescribedWakeTime: '07:00',
        efficiencyThreshold: 85,
        minimumTIB: 300,
        adjustmentIncrement: 15,
        evaluationPeriod: 7,
        isActive: true,
        currentWeek: 1,
      });
    });
  });

  describe('evaluateAndAdjust', () => {
    let basePrescription: ReturnType<typeof engine.calculateInitialWindow>;

    beforeEach(() => {
      const history = createBaselinePeriod('insomnia', 7);
      basePrescription = engine.calculateInitialWindow(history, '07:00');
    });

    it('should increase TIB when SE >= 90%', () => {
      // High efficiency metrics
      const highEfficiencyMetrics = createWeeklySleepMetrics('healthy').map(m => ({
        ...m,
        sleepEfficiency: 92,
      }));

      const adjusted = engine.evaluateAndAdjust(basePrescription, highEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(basePrescription.prescribedTIB + 15);
      expect(adjusted.currentWeek).toBe(basePrescription.currentWeek + 1);
    });

    it('should maintain TIB when SE is 85-89%', () => {
      const moderateMetrics = Array(5).fill(null).map(() =>
        createSleepMetrics({ sleepEfficiency: 87 })
      );

      const adjusted = engine.evaluateAndAdjust(basePrescription, moderateMetrics);

      expect(adjusted.prescribedTIB).toBe(basePrescription.prescribedTIB);
    });

    it('should decrease TIB when SE < 85%', () => {
      const lowEfficiencyMetrics = Array(5).fill(null).map(() =>
        createSleepMetrics({ sleepEfficiency: 75 })
      );

      // Need TIB > 300 to allow decrease
      const prescriptionWithHigherTIB = {
        ...basePrescription,
        prescribedTIB: 400,
      };

      const adjusted = engine.evaluateAndAdjust(prescriptionWithHigherTIB, lowEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(385); // 400 - 15
    });

    it('should not decrease TIB below minimum (300 min)', () => {
      const lowEfficiencyMetrics = Array(5).fill(null).map(() =>
        createSleepMetrics({ sleepEfficiency: 70 })
      );

      const prescriptionAtMinimum = {
        ...basePrescription,
        prescribedTIB: 300,
      };

      const adjusted = engine.evaluateAndAdjust(prescriptionAtMinimum, lowEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(300); // Should stay at minimum
    });

    it('should not increase TIB above maximum (540 min)', () => {
      const highEfficiencyMetrics = Array(5).fill(null).map(() =>
        createSleepMetrics({ sleepEfficiency: 95 })
      );

      const prescriptionAtMaximum = {
        ...basePrescription,
        prescribedTIB: 540,
      };

      const adjusted = engine.evaluateAndAdjust(prescriptionAtMaximum, highEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBe(540); // Should stay at maximum
    });

    it('should maintain prescription if less than 5 days of data', () => {
      const shortData = [createSleepMetrics(), createSleepMetrics()];

      const adjusted = engine.evaluateAndAdjust(basePrescription, shortData);

      expect(adjusted).toEqual(basePrescription);
    });

    it('should update bedtime when TIB changes', () => {
      const highEfficiencyMetrics = Array(5).fill(null).map(() =>
        createSleepMetrics({ sleepEfficiency: 92 })
      );

      const adjusted = engine.evaluateAndAdjust(basePrescription, highEfficiencyMetrics);

      // Bedtime should move earlier when TIB increases
      expect(adjusted.prescribedBedtime).not.toBe(basePrescription.prescribedBedtime);
    });
  });

  describe('checkGraduation', () => {
    let prescription: ReturnType<typeof engine.calculateInitialWindow>;

    beforeEach(() => {
      const history = createBaselinePeriod('insomnia', 7);
      prescription = engine.calculateInitialWindow(history, '07:00');
    });

    it('should require minimum 4 weeks before graduation', () => {
      const goodMetrics = createWeeklySleepMetrics('healthy');
      const prescriptionWeek3 = { ...prescription, currentWeek: 3 };

      const result = engine.checkGraduation(goodMetrics, prescriptionWeek3);

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('week 3');
    });

    it('should require sufficient recent data (at least 10 days)', () => {
      const shortHistory = createWeeklySleepMetrics('healthy').slice(0, 5);
      const prescriptionWeek4 = { ...prescription, currentWeek: 4 };

      const result = engine.checkGraduation(shortHistory, prescriptionWeek4);

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should graduate when SE >= 85% and TIB >= 7h', () => {
      const twoWeeks = [
        ...createWeeklySleepMetrics('healthy'),
        ...createWeeklySleepMetrics('healthy'),
      ].map(m => ({ ...m, sleepEfficiency: 88 }));

      const prescriptionWeek4 = {
        ...prescription,
        currentWeek: 4,
        prescribedTIB: 420, // 7 hours
      };

      const result = engine.checkGraduation(twoWeeks, prescriptionWeek4);

      expect(result.ready).toBe(true);
      expect(result.reason).toContain('maintenance');
    });

    it('should graduate early when SE >= 90% and TIB >= 6.5h', () => {
      const twoWeeks = [
        ...createWeeklySleepMetrics('healthy'),
        ...createWeeklySleepMetrics('healthy'),
      ].map(m => ({ ...m, sleepEfficiency: 92 }));

      const prescriptionWeek4 = {
        ...prescription,
        currentWeek: 4,
        prescribedTIB: 390, // 6.5 hours
      };

      const result = engine.checkGraduation(twoWeeks, prescriptionWeek4);

      expect(result.ready).toBe(true);
      expect(result.reason).toContain('Excellent');
    });

    it('should not graduate when SE is low', () => {
      const twoWeeks = [
        ...createWeeklySleepMetrics('insomnia'),
        ...createWeeklySleepMetrics('insomnia'),
      ];

      const prescriptionWeek4 = {
        ...prescription,
        currentWeek: 4,
        prescribedTIB: 420,
      };

      const result = engine.checkGraduation(twoWeeks, prescriptionWeek4);

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('Continue restriction');
    });
  });

  describe('calculateAdherence', () => {
    let prescription: ReturnType<typeof engine.calculateInitialWindow>;

    beforeEach(() => {
      const history = createBaselinePeriod('insomnia', 7);
      prescription = engine.calculateInitialWindow(history, '07:00');
    });

    it('should return 0 for empty behavior array', () => {
      const adherence = engine.calculateAdherence(prescription, []);

      expect(adherence).toBe(0);
    });

    it('should return perfect adherence (1.0) for exact match', () => {
      const perfectBehavior = [
        createSleepMetrics({
          timeInBed: prescription.prescribedTIB,
          bedtime: prescription.prescribedBedtime,
          wakeTime: prescription.prescribedWakeTime,
        }),
      ];

      const adherence = engine.calculateAdherence(prescription, perfectBehavior);

      expect(adherence).toBeCloseTo(1.0, 1);
    });

    it('should reduce adherence for TIB deviation', () => {
      const deviatedBehavior = [
        createSleepMetrics({
          timeInBed: prescription.prescribedTIB + 60, // 1 hour longer
          bedtime: prescription.prescribedBedtime,
          wakeTime: prescription.prescribedWakeTime,
        }),
      ];

      const adherence = engine.calculateAdherence(prescription, deviatedBehavior);

      expect(adherence).toBeLessThan(1.0);
      expect(adherence).toBeGreaterThan(0);
    });

    it('should reduce adherence for bedtime deviation', () => {
      const deviatedBehavior = [
        createSleepMetrics({
          timeInBed: prescription.prescribedTIB,
          bedtime: '22:00', // Earlier than prescribed
          wakeTime: prescription.prescribedWakeTime,
        }),
      ];

      const adherence = engine.calculateAdherence(prescription, deviatedBehavior);

      expect(adherence).toBeLessThan(1.0);
    });

    it('should calculate average adherence across multiple nights', () => {
      const mixedBehavior = [
        createSleepMetrics({
          timeInBed: prescription.prescribedTIB,
          bedtime: prescription.prescribedBedtime,
          wakeTime: prescription.prescribedWakeTime,
        }),
        createSleepMetrics({
          timeInBed: prescription.prescribedTIB + 60,
          bedtime: '22:00',
          wakeTime: '08:00',
        }),
      ];

      const adherence = engine.calculateAdherence(prescription, mixedBehavior);

      // Should be average of good and poor nights
      expect(adherence).toBeGreaterThan(0.3);
      expect(adherence).toBeLessThan(0.9);
    });
  });

  describe('edge cases', () => {
    it('should handle custom rules', () => {
      const customEngine = new SleepRestrictionEngine({
        increaseThreshold: 95,
        maintainRange: { min: 85, max: 94.9 },
        decreaseThreshold: 85,
        increaseAmount: 30,
        decreaseAmount: 30,
      });

      const history = createBaselinePeriod('insomnia', 7);
      const prescription = customEngine.calculateInitialWindow(history, '07:00');

      expect(prescription.adjustmentIncrement).toBe(30);
    });

    it('should handle midnight-crossing wake times', () => {
      const history = createBaselinePeriod('insomnia', 7);
      const prescription = engine.calculateInitialWindow(history, '00:30');

      expect(prescription.prescribedBedtime).toBeDefined();
      expect(prescription.prescribedWakeTime).toBe('00:30');
    });
  });
});
