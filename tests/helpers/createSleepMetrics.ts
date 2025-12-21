/**
 * Test Helper: Create Sleep Metrics
 * Factory function for generating ISleepMetrics test data
 */

import type { ISleepMetrics } from '../../src/sleep/interfaces/ISleepState';

/**
 * Preset patterns for common test scenarios
 */
export type SleepMetricsPattern =
  | 'healthy'          // SE >= 90%, good sleep
  | 'insomnia'         // SE < 75%, poor sleep
  | 'borderline'       // SE 80-85%, needs improvement
  | 'sleep_onset'      // High SOL (>30 min)
  | 'maintenance'      // High WASO (>30 min)
  | 'early_waking'     // Short TST, early final awakening
  | 'short_sleep'      // TST < 5h
  | 'oversleep';       // TST > 9h

/**
 * Default healthy sleep metrics
 */
const DEFAULT_METRICS: ISleepMetrics = {
  timeInBed: 480,         // 8 hours
  totalSleepTime: 450,    // 7.5 hours
  sleepOnsetLatency: 15,  // 15 min
  wakeAfterSleepOnset: 15,// 15 min
  numberOfAwakenings: 1,
  sleepEfficiency: 94,    // 450/480 * 100
  bedtime: '23:00',
  wakeTime: '07:00',
  finalAwakening: '06:45',
  outOfBedTime: '07:00',
};

/**
 * Pattern-based metrics presets
 */
const PATTERN_PRESETS: Record<SleepMetricsPattern, Partial<ISleepMetrics>> = {
  healthy: {
    timeInBed: 480,
    totalSleepTime: 450,
    sleepOnsetLatency: 10,
    wakeAfterSleepOnset: 10,
    numberOfAwakenings: 1,
    sleepEfficiency: 94,
  },
  insomnia: {
    timeInBed: 540,
    totalSleepTime: 360,
    sleepOnsetLatency: 60,
    wakeAfterSleepOnset: 90,
    numberOfAwakenings: 4,
    sleepEfficiency: 67,
  },
  borderline: {
    timeInBed: 480,
    totalSleepTime: 400,
    sleepOnsetLatency: 25,
    wakeAfterSleepOnset: 30,
    numberOfAwakenings: 2,
    sleepEfficiency: 83,
  },
  sleep_onset: {
    timeInBed: 510,
    totalSleepTime: 420,
    sleepOnsetLatency: 45,
    wakeAfterSleepOnset: 15,
    numberOfAwakenings: 1,
    sleepEfficiency: 82,
  },
  maintenance: {
    timeInBed: 510,
    totalSleepTime: 400,
    sleepOnsetLatency: 15,
    wakeAfterSleepOnset: 60,
    numberOfAwakenings: 4,
    sleepEfficiency: 78,
  },
  early_waking: {
    timeInBed: 420,
    totalSleepTime: 330,
    sleepOnsetLatency: 15,
    wakeAfterSleepOnset: 15,
    numberOfAwakenings: 1,
    sleepEfficiency: 79,
    finalAwakening: '04:30',
    wakeTime: '05:00',
  },
  short_sleep: {
    timeInBed: 360,
    totalSleepTime: 270,
    sleepOnsetLatency: 20,
    wakeAfterSleepOnset: 30,
    numberOfAwakenings: 2,
    sleepEfficiency: 75,
  },
  oversleep: {
    timeInBed: 660,
    totalSleepTime: 600,
    sleepOnsetLatency: 20,
    wakeAfterSleepOnset: 20,
    numberOfAwakenings: 2,
    sleepEfficiency: 91,
    bedtime: '21:00',
    wakeTime: '08:00',
  },
};

/**
 * Create test sleep metrics with optional overrides
 */
export function createSleepMetrics(
  overrides?: Partial<ISleepMetrics>
): ISleepMetrics {
  return {
    ...DEFAULT_METRICS,
    ...overrides,
  };
}

/**
 * Create sleep metrics from a pattern preset
 */
export function createSleepMetricsFromPattern(
  pattern: SleepMetricsPattern,
  overrides?: Partial<ISleepMetrics>
): ISleepMetrics {
  return {
    ...DEFAULT_METRICS,
    ...PATTERN_PRESETS[pattern],
    ...overrides,
  };
}

/**
 * Create a week of sleep metrics (7 days)
 */
export function createWeeklySleepMetrics(
  pattern: SleepMetricsPattern = 'healthy',
  variability: number = 0.1
): ISleepMetrics[] {
  const base = createSleepMetricsFromPattern(pattern);
  const week: ISleepMetrics[] = [];

  for (let i = 0; i < 7; i++) {
    // Add some natural variability
    const variance = 1 + (Math.random() - 0.5) * variability * 2;

    week.push({
      ...base,
      totalSleepTime: Math.round(base.totalSleepTime * variance),
      sleepOnsetLatency: Math.round(base.sleepOnsetLatency * variance),
      wakeAfterSleepOnset: Math.round(base.wakeAfterSleepOnset * variance),
      sleepEfficiency: Math.round(
        ((base.totalSleepTime * variance) / base.timeInBed) * 100
      ),
    });
  }

  return week;
}

/**
 * Create baseline period (7-14 days) for treatment initialization
 */
export function createBaselinePeriod(
  pattern: SleepMetricsPattern = 'insomnia',
  days: number = 7
): ISleepMetrics[] {
  const metrics: ISleepMetrics[] = [];

  for (let i = 0; i < days; i++) {
    metrics.push(createSleepMetricsFromPattern(pattern, {
      // Add realistic day-to-day variation
      sleepOnsetLatency: Math.round(
        PATTERN_PRESETS[pattern].sleepOnsetLatency! * (0.8 + Math.random() * 0.4)
      ),
    }));
  }

  return metrics;
}
