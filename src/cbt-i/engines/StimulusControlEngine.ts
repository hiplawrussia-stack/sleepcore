/**
 * StimulusControlEngine - Stimulus Control Therapy Implementation
 * ================================================================
 * Implements Bootzin's Stimulus Control Therapy (1972).
 *
 * Core principle: Re-associate the bed/bedroom with sleep rather than
 * wakefulness by following a set of behavioral rules.
 *
 * The Six Rules:
 * 1. Go to bed only when sleepy
 * 2. Use the bed only for sleep and sex
 * 3. If unable to sleep within ~15-20 min, leave the bedroom
 * 4. Return to bed only when sleepy again
 * 5. Maintain a fixed wake time regardless of sleep obtained
 * 6. Avoid daytime napping
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  IStimulusControlEngine,
  IStimulusControlRules,
  IStimulusControlAdherence,
} from '../interfaces/ICBTIComponents';
import type { ISleepState, ISleepMetrics } from '../../sleep/interfaces/ISleepState';

/**
 * Default threshold for "can't sleep" (minutes)
 */
const DEFAULT_LEAVE_THRESHOLD = 20;

/**
 * Messages for leaving bed reminder
 */
const LEAVE_REMINDERS = {
  gentle: [
    'Если вы не можете уснуть, попробуйте встать и заняться чем-то спокойным.',
    'Не волнуйтесь — кровать должна ассоциироваться только со сном.',
    'Прислушайтесь к себе: если сонливость ушла, лучше встать.',
  ],
  moderate: [
    'Вы лежите без сна уже {minutes} минут. Рекомендуется встать и вернуться, когда почувствуете сонливость.',
    'Помните правило: кровать = сон. Если не спится — время встать.',
    'Попробуйте выйти в другую комнату и почитать что-нибудь спокойное.',
  ],
  urgent: [
    'Лежание без сна усиливает бессонницу. Пожалуйста, встаньте и вернитесь позже.',
    'Важно: каждая минута бодрствования в постели укрепляет связь "кровать = бодрствование".',
    'Встаньте, сделайте что-нибудь скучное при тусклом свете, и вернитесь, когда веки станут тяжёлыми.',
  ],
};

/**
 * Stimulus Control Therapy Engine
 */
export class StimulusControlEngine implements IStimulusControlEngine {
  /**
   * Get personalized stimulus control rules based on sleep state
   */
  getRules(sleepState: ISleepState): IStimulusControlRules {
    // Adjust leave threshold based on insomnia severity
    let leaveThreshold = DEFAULT_LEAVE_THRESHOLD;

    if (sleepState.insomnia.severity === 'severe') {
      leaveThreshold = 15; // Stricter for severe insomnia
    } else if (sleepState.insomnia.severity === 'moderate') {
      leaveThreshold = 20;
    } else {
      leaveThreshold = 25; // More lenient for mild/subthreshold
    }

    // Determine if napping should be strictly prohibited
    const strictNoNapping =
      sleepState.insomnia.severity !== 'none' ||
      sleepState.metrics.sleepEfficiency < 85;

    return {
      goToBedWhenSleepy: true,
      bedOnlyForSleep: true,
      leaveIfAwake: true,
      leaveThresholdMinutes: leaveThreshold,
      returnWhenSleepy: true,
      fixedWakeTime: true,
      wakeTime: sleepState.metrics.wakeTime,
      noNapping: strictNoNapping,
    };
  }

  /**
   * Track adherence to stimulus control rules for a night
   */
  trackAdherence(
    rules: IStimulusControlRules,
    behavior: ISleepMetrics
  ): IStimulusControlAdherence {
    // Estimate rule adherence from metrics
    // Note: Some rules require user self-report for accurate tracking

    // 1. Went to bed when sleepy (proxy: SOL < 30 min)
    const wentToBedWhenSleepy = behavior.sleepOnsetLatency <= 30;

    // 2. Used bed only for sleep (hard to measure from metrics alone)
    // Assume true if no extended wakefulness
    const usedBedOnlyForSleep = behavior.wakeAfterSleepOnset < 60;

    // 3. Left bed when awake (proxy: multiple short awakenings vs one long)
    // If WASO is high but number of awakenings is also high, they might be
    // getting up and coming back (good adherence)
    const avgAwakeningLength =
      behavior.numberOfAwakenings > 0
        ? behavior.wakeAfterSleepOnset / behavior.numberOfAwakenings
        : 0;
    const leftBedWhenAwake =
      avgAwakeningLength < rules.leaveThresholdMinutes || behavior.wakeAfterSleepOnset < 20;

    // 4. Maintained fixed wake time (±15 min tolerance)
    const maintainedFixedWakeTime = this.isTimeClose(behavior.wakeTime, rules.wakeTime, 15);

    // 5. Avoided naps (proxy: check if nap data available)
    // This would need additional data; assume adherent if not specified
    const avoidedNaps = true; // Placeholder - needs nap tracking data

    // Calculate overall adherence
    const factors = [
      wentToBedWhenSleepy,
      usedBedOnlyForSleep,
      leftBedWhenAwake,
      maintainedFixedWakeTime,
      avoidedNaps,
    ];
    const adherentCount = factors.filter(Boolean).length;
    const overallAdherence = adherentCount / factors.length;

    return {
      date: new Date().toISOString().split('T')[0],
      wentToBedWhenSleepy,
      usedBedOnlyForSleep,
      leftBedWhenAwake,
      maintainedFixedWakeTime,
      avoidedNaps,
      overallAdherence,
    };
  }

  /**
   * Generate reminder to leave bed when unable to sleep
   */
  generateLeaveReminder(minutesAwake: number): string {
    let reminders: string[];

    if (minutesAwake < 20) {
      reminders = LEAVE_REMINDERS.gentle;
    } else if (minutesAwake < 40) {
      reminders = LEAVE_REMINDERS.moderate;
    } else {
      reminders = LEAVE_REMINDERS.urgent;
    }

    const reminder = reminders[Math.floor(Math.random() * reminders.length)];
    return reminder.replace('{minutes}', minutesAwake.toString());
  }

  /**
   * Assess bedroom association strength over time
   */
  assessBedroomAssociation(
    adherenceHistory: IStimulusControlAdherence[]
  ): { score: number; trend: 'improving' | 'stable' | 'declining' } {
    if (adherenceHistory.length === 0) {
      return { score: 0, trend: 'stable' };
    }

    // Calculate current score (last 7 entries)
    const recentEntries = adherenceHistory.slice(-7);
    const currentScore =
      recentEntries.reduce((sum, entry) => sum + entry.overallAdherence, 0) /
      recentEntries.length;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (adherenceHistory.length >= 14) {
      const olderEntries = adherenceHistory.slice(-14, -7);
      const olderScore =
        olderEntries.reduce((sum, entry) => sum + entry.overallAdherence, 0) /
        olderEntries.length;

      const diff = currentScore - olderScore;
      if (diff > 0.1) {
        trend = 'improving';
      } else if (diff < -0.1) {
        trend = 'declining';
      }
    }

    // The bedroom association score is a composite of:
    // 1. Average adherence (70%)
    // 2. Consistency of wake time (15%)
    // 3. Consistency of going to bed when sleepy (15%)

    const wakeTimeAdherence =
      recentEntries.filter((e) => e.maintainedFixedWakeTime).length / recentEntries.length;
    const sleepyBedAdherence =
      recentEntries.filter((e) => e.wentToBedWhenSleepy).length / recentEntries.length;

    const score = currentScore * 0.7 + wakeTimeAdherence * 0.15 + sleepyBedAdherence * 0.15;

    return { score, trend };
  }

  /**
   * Check if two times are within tolerance
   */
  private isTimeClose(time1: string, time2: string, toleranceMinutes: number): boolean {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const mins1 = h1 * 60 + m1;
    const mins2 = h2 * 60 + m2;

    const diff = Math.abs(mins1 - mins2);
    const wrappedDiff = Math.min(diff, 1440 - diff);

    return wrappedDiff <= toleranceMinutes;
  }
}
