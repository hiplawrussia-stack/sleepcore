/**
 * Test Helper: Create Sleep Diary Entry
 * Factory function for generating ISleepDiaryEntry test data
 */

import type { ISleepDiaryEntry, SleepQualityRating } from '../../src/sleep/interfaces/ISleepState';

/**
 * Preset patterns for diary entries
 */
export type DiaryEntryPattern =
  | 'healthy'          // Good sleep
  | 'insomnia'         // Poor sleep
  | 'sleep_onset'      // High SOL
  | 'maintenance'      // High WASO
  | 'early_waking';    // Short sleep

/**
 * Default healthy diary entry
 */
const DEFAULT_ENTRY: ISleepDiaryEntry = {
  userId: 'test-user',
  date: new Date().toISOString().split('T')[0],
  bedtime: '23:00',
  lightsOffTime: '23:15',
  sleepOnsetLatency: 15,
  numberOfAwakenings: 1,
  wakeAfterSleepOnset: 10,
  finalAwakening: '06:45',
  outOfBedTime: '07:00',
  subjectiveQuality: 'good',
  morningAlertness: 4,
  notes: '',
};

/**
 * Pattern presets
 */
const PATTERN_PRESETS: Record<DiaryEntryPattern, Partial<ISleepDiaryEntry>> = {
  healthy: {
    bedtime: '23:00',
    lightsOffTime: '23:15',
    sleepOnsetLatency: 10,
    numberOfAwakenings: 1,
    wakeAfterSleepOnset: 10,
    finalAwakening: '06:50',
    outOfBedTime: '07:00',
    subjectiveQuality: 'good',
    morningAlertness: 4,
  },
  insomnia: {
    bedtime: '22:30',
    lightsOffTime: '22:45',
    sleepOnsetLatency: 45,
    numberOfAwakenings: 4,
    wakeAfterSleepOnset: 60,
    finalAwakening: '05:30',
    outOfBedTime: '07:30',
    subjectiveQuality: 'poor',
    morningAlertness: 2,
  },
  sleep_onset: {
    bedtime: '23:00',
    lightsOffTime: '23:00',
    sleepOnsetLatency: 60,
    numberOfAwakenings: 1,
    wakeAfterSleepOnset: 10,
    finalAwakening: '06:45',
    outOfBedTime: '07:00',
    subjectiveQuality: 'poor',
    morningAlertness: 3,
  },
  maintenance: {
    bedtime: '23:00',
    lightsOffTime: '23:15',
    sleepOnsetLatency: 15,
    numberOfAwakenings: 5,
    wakeAfterSleepOnset: 75,
    finalAwakening: '06:00',
    outOfBedTime: '07:00',
    subjectiveQuality: 'poor',
    morningAlertness: 2,
  },
  early_waking: {
    bedtime: '23:00',
    lightsOffTime: '23:15',
    sleepOnsetLatency: 15,
    numberOfAwakenings: 1,
    wakeAfterSleepOnset: 15,
    finalAwakening: '04:30',
    outOfBedTime: '05:00',
    subjectiveQuality: 'fair',
    morningAlertness: 3,
  },
};

/**
 * Create diary entry with optional overrides
 */
export function createDiaryEntry(
  overrides?: Partial<ISleepDiaryEntry>
): ISleepDiaryEntry {
  return {
    ...DEFAULT_ENTRY,
    ...overrides,
  };
}

/**
 * Create diary entry from pattern
 */
export function createDiaryEntryFromPattern(
  pattern: DiaryEntryPattern,
  overrides?: Partial<ISleepDiaryEntry>
): ISleepDiaryEntry {
  return {
    ...DEFAULT_ENTRY,
    ...PATTERN_PRESETS[pattern],
    ...overrides,
  };
}

/**
 * Create a series of diary entries for multiple days
 */
export function createDiaryEntrySeries(
  pattern: DiaryEntryPattern = 'healthy',
  days: number = 7,
  userId: string = 'test-user'
): ISleepDiaryEntry[] {
  const entries: ISleepDiaryEntry[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    entries.push(createDiaryEntryFromPattern(pattern, {
      userId,
      date: date.toISOString().split('T')[0],
    }));
  }

  return entries;
}

/**
 * Create diary entries showing improvement over time
 */
export function createImprovementSeries(
  startPattern: DiaryEntryPattern = 'insomnia',
  days: number = 14,
  userId: string = 'test-user'
): ISleepDiaryEntry[] {
  const entries: ISleepDiaryEntry[] = [];
  const qualityProgression: SleepQualityRating[] = [
    'very_poor', 'poor', 'poor', 'fair', 'fair', 'fair', 'good', 'good'
  ];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Gradual improvement
    const progress = i / (days - 1);
    const baseEntry = PATTERN_PRESETS[startPattern];
    const targetEntry = PATTERN_PRESETS.healthy;

    const sleepOnsetLatency = Math.round(
      baseEntry.sleepOnsetLatency! * (1 - progress) + targetEntry.sleepOnsetLatency! * progress
    );
    const wakeAfterSleepOnset = Math.round(
      baseEntry.wakeAfterSleepOnset! * (1 - progress) + targetEntry.wakeAfterSleepOnset! * progress
    );
    const qualityIndex = Math.min(
      Math.floor(progress * qualityProgression.length),
      qualityProgression.length - 1
    );

    entries.push(createDiaryEntry({
      userId,
      date: date.toISOString().split('T')[0],
      sleepOnsetLatency,
      wakeAfterSleepOnset,
      numberOfAwakenings: Math.max(1, Math.round(5 * (1 - progress))),
      subjectiveQuality: qualityProgression[qualityIndex],
      morningAlertness: Math.min(5, Math.round(2 + progress * 3)),
    }));
  }

  return entries;
}
