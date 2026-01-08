/**
 * SleepRestrictionEngine - Sleep Restriction Therapy Implementation
 * ==================================================================
 * Implements Spielman's Sleep Restriction Therapy (1987).
 *
 * Core principle: Restrict Time In Bed (TIB) to match actual Total Sleep Time (TST),
 * creating mild sleep deprivation to consolidate sleep and increase sleep drive.
 *
 * Algorithm:
 * 1. Calculate average TST from 1-2 week sleep diary
 * 2. Set initial TIB = max(TST, 5 hours) for safety
 * 3. Fix wake time as anchor
 * 4. Adjust TIB weekly based on Sleep Efficiency:
 *    - SE ≥ 90%: Increase TIB by 15-30 min
 *    - SE 85-89%: Maintain current TIB
 *    - SE < 85%: Decrease TIB (min 5 hours)
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  ISleepRestrictionEngine,
  ISleepRestrictionPrescription,
  ISleepRestrictionRules,
} from '../interfaces/ICBTIComponents';
import type { ISleepMetrics } from '../../sleep/interfaces/ISleepState';

/**
 * Default adjustment rules based on clinical guidelines
 */
const DEFAULT_RULES: ISleepRestrictionRules = {
  increaseThreshold: 90,      // SE ≥ 90% → increase TIB
  maintainRange: { min: 85, max: 89.9 },
  decreaseThreshold: 85,      // SE < 85% → decrease TIB
  increaseAmount: 15,         // Add 15 minutes
  decreaseAmount: 15,         // Remove 15 minutes
};

/**
 * Minimum allowed Time In Bed (5 hours = 300 minutes)
 * Safety limit per clinical guidelines
 */
const MINIMUM_TIB = 300;

/**
 * Maximum Time In Bed (9 hours = 540 minutes)
 */
const MAXIMUM_TIB = 540;

/**
 * Days in evaluation period
 */
const EVALUATION_PERIOD = 7;

/**
 * Sleep Restriction Therapy Engine
 */
export class SleepRestrictionEngine implements ISleepRestrictionEngine {
  private readonly rules: ISleepRestrictionRules;

  constructor(rules: ISleepRestrictionRules = DEFAULT_RULES) {
    this.rules = rules;
  }

  /**
   * Calculate initial sleep window based on sleep diary data
   */
  calculateInitialWindow(
    sleepHistory: ISleepMetrics[],
    preferredWakeTime: string
  ): ISleepRestrictionPrescription {
    if (sleepHistory.length < 5) {
      throw new Error('Need at least 5 days of sleep data for initial window calculation');
    }

    // Calculate average Total Sleep Time
    const avgTST = this.calculateAverageTST(sleepHistory);

    // Initial TIB = average TST (minimum 5 hours for safety)
    const prescribedTIB = Math.max(avgTST, MINIMUM_TIB);

    // Calculate bedtime based on fixed wake time
    const prescribedBedtime = this.calculateBedtime(preferredWakeTime, prescribedTIB);

    // Calculate baseline efficiency
    const _avgEfficiency = this.calculateAverageEfficiency(sleepHistory);

    return {
      prescribedTIB,
      prescribedBedtime,
      prescribedWakeTime: preferredWakeTime,
      efficiencyThreshold: 85,
      minimumTIB: MINIMUM_TIB,
      adjustmentIncrement: this.rules.increaseAmount,
      evaluationPeriod: EVALUATION_PERIOD,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      currentWeek: 1,
    };
  }

  /**
   * Evaluate recent sleep efficiency and adjust window
   */
  evaluateAndAdjust(
    currentPrescription: ISleepRestrictionPrescription,
    recentMetrics: ISleepMetrics[]
  ): ISleepRestrictionPrescription {
    if (recentMetrics.length < 5) {
      // Not enough data, maintain current prescription
      return currentPrescription;
    }

    const avgEfficiency = this.calculateAverageEfficiency(recentMetrics);
    let newTIB = currentPrescription.prescribedTIB;

    // Apply adjustment rules
    if (avgEfficiency >= this.rules.increaseThreshold) {
      // SE ≥ 90%: Increase TIB
      newTIB = Math.min(
        currentPrescription.prescribedTIB + this.rules.increaseAmount,
        MAXIMUM_TIB
      );
    } else if (avgEfficiency < this.rules.decreaseThreshold) {
      // SE < 85%: Decrease TIB (but not below minimum)
      newTIB = Math.max(
        currentPrescription.prescribedTIB - this.rules.decreaseAmount,
        MINIMUM_TIB
      );
    }
    // else: 85-89% → maintain current TIB

    // Recalculate bedtime if TIB changed
    const newBedtime = this.calculateBedtime(
      currentPrescription.prescribedWakeTime,
      newTIB
    );

    return {
      ...currentPrescription,
      prescribedTIB: newTIB,
      prescribedBedtime: newBedtime,
      currentWeek: currentPrescription.currentWeek + 1,
    };
  }

  /**
   * Check if user is ready to graduate from restriction therapy
   */
  checkGraduation(
    sleepHistory: ISleepMetrics[],
    prescription: ISleepRestrictionPrescription
  ): { ready: boolean; reason: string } {
    // Need at least 4 weeks of data
    if (prescription.currentWeek < 4) {
      return {
        ready: false,
        reason: `Minimum 4 weeks required. Currently at week ${prescription.currentWeek}.`,
      };
    }

    // Check last 2 weeks
    const recentMetrics = sleepHistory.slice(-14);
    if (recentMetrics.length < 10) {
      return {
        ready: false,
        reason: 'Insufficient recent data for graduation assessment.',
      };
    }

    const avgEfficiency = this.calculateAverageEfficiency(recentMetrics);
    const _avgTST = this.calculateAverageTST(recentMetrics);

    // Graduation criteria:
    // 1. SE consistently ≥ 85% for 2 weeks
    // 2. TIB has reached target (usually 7-8 hours)
    // 3. User reports improved sleep quality

    if (avgEfficiency >= 85 && prescription.prescribedTIB >= 420) {
      return {
        ready: true,
        reason: `Sleep efficiency stable at ${avgEfficiency.toFixed(1)}% with ${(prescription.prescribedTIB / 60).toFixed(1)} hours TIB. Ready for maintenance phase.`,
      };
    }

    if (avgEfficiency >= 90 && prescription.prescribedTIB >= 390) {
      return {
        ready: true,
        reason: `Excellent sleep efficiency (${avgEfficiency.toFixed(1)}%). Can continue expanding TIB in maintenance.`,
      };
    }

    return {
      ready: false,
      reason: `Continue restriction. Current SE: ${avgEfficiency.toFixed(1)}%, TIB: ${(prescription.prescribedTIB / 60).toFixed(1)}h.`,
    };
  }

  /**
   * Calculate adherence to sleep restriction prescription
   */
  calculateAdherence(
    prescription: ISleepRestrictionPrescription,
    actualBehavior: ISleepMetrics[]
  ): number {
    if (actualBehavior.length === 0) return 0;

    let adherenceSum = 0;

    for (const night of actualBehavior) {
      let nightAdherence = 0;
      let factors = 0;

      // Factor 1: TIB adherence (±15 min tolerance)
      const tibDeviation = Math.abs(night.timeInBed - prescription.prescribedTIB);
      const tibAdherence = Math.max(0, 1 - tibDeviation / 30);
      nightAdherence += tibAdherence;
      factors++;

      // Factor 2: Bedtime adherence (±15 min tolerance)
      const bedtimeDeviation = this.getTimeDifferenceMinutes(
        night.bedtime,
        prescription.prescribedBedtime
      );
      const bedtimeAdherence = Math.max(0, 1 - bedtimeDeviation / 30);
      nightAdherence += bedtimeAdherence;
      factors++;

      // Factor 3: Wake time adherence (±15 min tolerance)
      const wakeDeviation = this.getTimeDifferenceMinutes(
        night.wakeTime,
        prescription.prescribedWakeTime
      );
      const wakeAdherence = Math.max(0, 1 - wakeDeviation / 30);
      nightAdherence += wakeAdherence;
      factors++;

      adherenceSum += nightAdherence / factors;
    }

    return adherenceSum / actualBehavior.length;
  }

  /**
   * Get time difference in minutes between two time strings
   */
  private getTimeDifferenceMinutes(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const mins1 = h1 * 60 + m1;
    const mins2 = h2 * 60 + m2;

    const diff = Math.abs(mins1 - mins2);
    // Handle wrap-around (e.g., 23:30 vs 00:30)
    return Math.min(diff, 1440 - diff);
  }

  /**
   * Calculate average Total Sleep Time
   */
  private calculateAverageTST(metrics: ISleepMetrics[]): number {
    const sum = metrics.reduce((acc, m) => acc + m.totalSleepTime, 0);
    return Math.round(sum / metrics.length);
  }

  /**
   * Calculate average Sleep Efficiency
   */
  private calculateAverageEfficiency(metrics: ISleepMetrics[]): number {
    const sum = metrics.reduce((acc, m) => acc + m.sleepEfficiency, 0);
    return sum / metrics.length;
  }

  /**
   * Calculate bedtime given wake time and TIB
   */
  private calculateBedtime(wakeTime: string, tibMinutes: number): string {
    const [hours, minutes] = wakeTime.split(':').map(Number);
    const wakeMins = hours * 60 + minutes;

    let bedMins = wakeMins - tibMinutes;
    if (bedMins < 0) bedMins += 1440; // Wrap to previous day

    const bedHours = Math.floor(bedMins / 60);
    const bedMinutes = bedMins % 60;

    return `${bedHours.toString().padStart(2, '0')}:${bedMinutes.toString().padStart(2, '0')}`;
  }
}
