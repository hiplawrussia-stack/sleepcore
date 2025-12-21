/**
 * ISleepState - Sleep State Extension for CogniCore State Vector
 * ================================================================
 * Extends the universal IStateVector with sleep-specific dimensions
 * for CBT-I digital therapeutic applications.
 *
 * Scientific Foundation:
 * - Pittsburgh Sleep Quality Index (PSQI)
 * - Insomnia Severity Index (ISI)
 * - Sleep Efficiency Formula (SE = TST/TIB × 100)
 * - Circadian Rhythm Science (Czeisler, 1999)
 * - Two-Process Model of Sleep (Borbély, 1982)
 *
 * @packageDocumentation
 * @module @sleepcore/sleep
 */

import type { IStateVector } from '@cognicore/engine';

/**
 * Sleep stage classification
 * Based on AASM (American Academy of Sleep Medicine) standards
 */
export type SleepStage =
  | 'wake'      // Awake
  | 'N1'        // Light sleep stage 1
  | 'N2'        // Light sleep stage 2
  | 'N3'        // Deep sleep (slow-wave)
  | 'REM';      // Rapid eye movement

/**
 * Chronotype classification
 * Based on Morningness-Eveningness Questionnaire (MEQ)
 */
export type Chronotype =
  | 'definite_morning'   // MEQ 70-86
  | 'moderate_morning'   // MEQ 59-69
  | 'intermediate'       // MEQ 42-58
  | 'moderate_evening'   // MEQ 31-41
  | 'definite_evening';  // MEQ 16-30

/**
 * Insomnia subtype classification
 */
export type InsomniaSubtype =
  | 'sleep_onset'        // Difficulty falling asleep (SOL > 30 min)
  | 'sleep_maintenance'  // Waking during night (WASO > 30 min)
  | 'early_morning'      // Waking too early
  | 'mixed'              // Combination
  | 'none';              // No insomnia

/**
 * Sleep quality rating (subjective)
 */
export type SleepQualityRating =
  | 'very_poor'    // 1
  | 'poor'         // 2
  | 'fair'         // 3
  | 'good'         // 4
  | 'excellent';   // 5

/**
 * Sleep metrics from diary or wearable
 */
export interface ISleepMetrics {
  /**
   * Time In Bed (TIB) in minutes
   * From getting into bed to getting out
   */
  readonly timeInBed: number;

  /**
   * Total Sleep Time (TST) in minutes
   * Actual time spent sleeping
   */
  readonly totalSleepTime: number;

  /**
   * Sleep Onset Latency (SOL) in minutes
   * Time to fall asleep after lights out
   */
  readonly sleepOnsetLatency: number;

  /**
   * Wake After Sleep Onset (WASO) in minutes
   * Time awake during the night after initially falling asleep
   */
  readonly wakeAfterSleepOnset: number;

  /**
   * Number of awakenings during the night
   */
  readonly numberOfAwakenings: number;

  /**
   * Sleep Efficiency (SE) percentage
   * Formula: (TST / TIB) × 100
   * Target: ≥85%
   */
  readonly sleepEfficiency: number;

  /**
   * Bedtime (24h format, e.g., "23:30")
   */
  readonly bedtime: string;

  /**
   * Wake time (24h format, e.g., "07:00")
   */
  readonly wakeTime: string;

  /**
   * Time of final awakening
   */
  readonly finalAwakening: string;

  /**
   * Time got out of bed
   */
  readonly outOfBedTime: string;
}

/**
 * Sleep stage distribution (from wearable or sleep study)
 */
export interface ISleepArchitecture {
  /**
   * Percentage of time in each stage
   */
  readonly stageDistribution: {
    readonly wake: number;
    readonly N1: number;
    readonly N2: number;
    readonly N3: number;  // Deep sleep
    readonly REM: number;
  };

  /**
   * Number of sleep cycles completed
   * Normal: 4-6 cycles per night
   */
  readonly cyclesCompleted: number;

  /**
   * Deep sleep total (N3) in minutes
   * Target: 60-90 min for adults
   */
  readonly deepSleepMinutes: number;

  /**
   * REM sleep total in minutes
   * Target: 90-120 min for adults
   */
  readonly remSleepMinutes: number;

  /**
   * Sleep fragmentation index (0-1)
   * Higher = more fragmented
   */
  readonly fragmentationIndex: number;
}

/**
 * Circadian rhythm state
 */
export interface ICircadianState {
  /**
   * User's chronotype
   */
  readonly chronotype: Chronotype;

  /**
   * Current circadian phase (0-24 hours)
   * 0 = biological midnight
   */
  readonly circadianPhase: number;

  /**
   * Phase deviation from optimal
   * Positive = delayed, Negative = advanced
   */
  readonly phaseDeviation: number;

  /**
   * Light exposure today (lux-hours)
   */
  readonly lightExposure: number;

  /**
   * Melatonin onset estimate (24h format)
   */
  readonly estimatedMelatoninOnset: string;

  /**
   * Social jet lag (hours)
   * Difference between weekday and weekend sleep midpoint
   */
  readonly socialJetLag: number;

  /**
   * Is circadian rhythm stable?
   */
  readonly isStable: boolean;
}

/**
 * Sleep debt and homeostatic pressure
 * Based on Two-Process Model (Borbély)
 */
export interface ISleepHomeostasis {
  /**
   * Accumulated sleep debt (hours)
   * Negative = debt, Positive = surplus
   */
  readonly sleepDebt: number;

  /**
   * Days of accumulated debt
   */
  readonly debtDuration: number;

  /**
   * Current homeostatic sleep pressure (0-1)
   * Higher = more sleep pressure
   */
  readonly homeostaticPressure: number;

  /**
   * Optimal sleep duration for this user (hours)
   */
  readonly optimalSleepDuration: number;

  /**
   * Is sleep debt recoverable with 1 good night?
   */
  readonly isRecoverable: boolean;
}

/**
 * Insomnia severity assessment
 * Based on Insomnia Severity Index (ISI)
 */
export interface IInsomniaSeverity {
  /**
   * ISI total score (0-28)
   * 0-7: No clinical insomnia
   * 8-14: Subthreshold insomnia
   * 15-21: Moderate clinical insomnia
   * 22-28: Severe clinical insomnia
   */
  readonly isiScore: number;

  /**
   * ISI category
   */
  readonly severity: 'none' | 'subthreshold' | 'moderate' | 'severe';

  /**
   * Insomnia subtype
   */
  readonly subtype: InsomniaSubtype;

  /**
   * Duration of insomnia (weeks)
   */
  readonly durationWeeks: number;

  /**
   * Impact on daytime functioning (0-1)
   */
  readonly daytimeImpact: number;

  /**
   * Distress about sleep (0-1)
   */
  readonly sleepDistress: number;
}

/**
 * Sleep-related behaviors and habits
 */
export interface ISleepBehaviors {
  /**
   * Caffeine consumption (mg) and last intake time
   */
  readonly caffeine: {
    readonly dailyMg: number;
    readonly lastIntakeTime: string;
    readonly hoursBeforeBed: number;
  };

  /**
   * Alcohol consumption
   */
  readonly alcohol: {
    readonly drinksToday: number;
    readonly lastDrinkTime: string;
  };

  /**
   * Screen time before bed (minutes)
   */
  readonly screenTimeBeforeBed: number;

  /**
   * Exercise today
   */
  readonly exercise: {
    readonly didExercise: boolean;
    readonly durationMinutes: number;
    readonly hoursBeforeBed: number;
  };

  /**
   * Naps taken today
   */
  readonly naps: {
    readonly count: number;
    readonly totalMinutes: number;
    readonly lastNapTime: string;
  };

  /**
   * Bedroom environment
   */
  readonly environment: {
    readonly temperatureCelsius: number;
    readonly isQuiet: boolean;
    readonly isDark: boolean;
    readonly isComfortable: boolean;
  };
}

/**
 * Sleep-related cognitions and beliefs
 */
export interface ISleepCognitions {
  /**
   * Dysfunctional Beliefs About Sleep (DBAS) score
   * Higher = more dysfunctional beliefs
   */
  readonly dbasScore: number;

  /**
   * Common dysfunctional beliefs present
   */
  readonly beliefs: {
    /** "I need 8 hours or I can't function" */
    readonly unrealisticExpectations: boolean;
    /** "If I don't sleep, something terrible will happen" */
    readonly catastrophizing: boolean;
    /** "I have no control over my sleep" */
    readonly helplessness: boolean;
    /** "I must stay in bed to get more sleep" */
    readonly effortfulSleep: boolean;
    /** "Insomnia is ruining my health" */
    readonly healthWorries: boolean;
  };

  /**
   * Sleep-related anxiety level (0-1)
   */
  readonly sleepAnxiety: number;

  /**
   * Pre-sleep arousal level (0-1)
   * Cognitive + Somatic
   */
  readonly preSleepArousal: number;

  /**
   * Sleep self-efficacy (0-1)
   * Belief in ability to sleep well
   */
  readonly sleepSelfEfficacy: number;
}

/**
 * 🌙 Main Sleep State Interface
 * Extension of CogniCore State Vector for sleep domain
 */
export interface ISleepState {
  /**
   * User ID
   */
  readonly userId: string;

  /**
   * Timestamp of this sleep state
   */
  readonly timestamp: Date;

  /**
   * Date this state refers to (YYYY-MM-DD)
   */
  readonly date: string;

  /**
   * Last night's sleep metrics
   */
  readonly metrics: ISleepMetrics;

  /**
   * Sleep architecture (if available from wearable)
   */
  readonly architecture?: ISleepArchitecture;

  /**
   * Circadian rhythm state
   */
  readonly circadian: ICircadianState;

  /**
   * Sleep homeostasis (debt, pressure)
   */
  readonly homeostasis: ISleepHomeostasis;

  /**
   * Insomnia severity assessment
   */
  readonly insomnia: IInsomniaSeverity;

  /**
   * Sleep-related behaviors
   */
  readonly behaviors: ISleepBehaviors;

  /**
   * Sleep-related cognitions
   */
  readonly cognitions: ISleepCognitions;

  /**
   * Subjective sleep quality rating
   */
  readonly subjectiveQuality: SleepQualityRating;

  /**
   * Morning alertness level (0-1)
   */
  readonly morningAlertness: number;

  /**
   * Daytime sleepiness level (0-1)
   * Based on Epworth-like scale
   */
  readonly daytimeSleepiness: number;

  /**
   * Overall sleep health score (0-100)
   */
  readonly sleepHealthScore: number;

  /**
   * Trend compared to last 7 days
   */
  readonly trend: 'improving' | 'stable' | 'declining';

  /**
   * Data quality indicator (0-1)
   */
  readonly dataQuality: number;

  /**
   * Data source
   */
  readonly source: 'diary' | 'wearable' | 'hybrid';
}

/**
 * Extended State Vector with Sleep
 * Combines CogniCore IStateVector with ISleepState
 */
export interface ISleepStateVector extends IStateVector {
  /**
   * Sleep-specific state extension
   */
  readonly sleep: ISleepState;
}

/**
 * Sleep state builder interface
 */
export interface ISleepStateBuilder {
  setUserId(userId: string): this;
  setDate(date: string): this;
  setMetrics(metrics: ISleepMetrics): this;
  setArchitecture(architecture: ISleepArchitecture): this;
  setCircadian(circadian: ICircadianState): this;
  setHomeostasis(homeostasis: ISleepHomeostasis): this;
  setInsomnia(insomnia: IInsomniaSeverity): this;
  setBehaviors(behaviors: ISleepBehaviors): this;
  setCognitions(cognitions: ISleepCognitions): this;
  setSubjectiveQuality(quality: SleepQualityRating): this;
  build(): ISleepState;
}

/**
 * Sleep state factory interface
 */
export interface ISleepStateFactory {
  /**
   * Create from sleep diary entry
   */
  fromDiary(diaryEntry: ISleepDiaryEntry): ISleepState;

  /**
   * Create from wearable data
   */
  fromWearable(wearableData: IWearableSleepData): ISleepState;

  /**
   * Create hybrid state (diary + wearable)
   */
  fromHybrid(diary: ISleepDiaryEntry, wearable: IWearableSleepData): ISleepState;

  /**
   * Create baseline/initial state
   */
  createBaseline(userId: string): ISleepState;
}

/**
 * Sleep diary entry (user input)
 */
export interface ISleepDiaryEntry {
  readonly userId: string;
  readonly date: string;
  readonly bedtime: string;
  readonly lightsOffTime: string;
  readonly sleepOnsetLatency: number;  // estimated minutes to fall asleep
  readonly numberOfAwakenings: number;
  readonly wakeAfterSleepOnset: number;  // estimated total WASO
  readonly finalAwakening: string;
  readonly outOfBedTime: string;
  readonly subjectiveQuality: SleepQualityRating;
  readonly morningAlertness: number;  // 1-5 scale
  readonly notes?: string;
}

/**
 * Wearable sleep data (device input)
 */
export interface IWearableSleepData {
  readonly userId: string;
  readonly date: string;
  readonly source: 'apple_health' | 'google_fit' | 'oura' | 'fitbit' | 'whoop' | 'garmin';
  readonly bedtime: string;
  readonly wakeTime: string;
  readonly totalSleepTime: number;
  readonly sleepEfficiency: number;
  readonly stages?: ISleepArchitecture;
  readonly heartRateAvg?: number;
  readonly hrvAvg?: number;
  readonly respiratoryRate?: number;
  readonly skinTemperature?: number;
}

/**
 * Sleep efficiency calculation utility
 */
export function calculateSleepEfficiency(
  totalSleepTime: number,
  timeInBed: number
): number {
  if (timeInBed <= 0) return 0;
  return Math.round((totalSleepTime / timeInBed) * 100);
}

/**
 * ISI severity category from score
 */
export function getInsomniaSeverity(
  isiScore: number
): 'none' | 'subthreshold' | 'moderate' | 'severe' {
  if (isiScore <= 7) return 'none';
  if (isiScore <= 14) return 'subthreshold';
  if (isiScore <= 21) return 'moderate';
  return 'severe';
}

/**
 * Sleep health score calculation
 * Weighted composite of multiple factors
 */
export function calculateSleepHealthScore(state: ISleepState): number {
  const weights = {
    efficiency: 0.25,
    duration: 0.20,
    timing: 0.15,
    insomnia: 0.20,
    daytime: 0.10,
    subjective: 0.10,
  };

  // Efficiency score (target: 85%+)
  const efficiencyScore = Math.min(100, (state.metrics.sleepEfficiency / 85) * 100);

  // Duration score (target: 7-9 hours)
  const hours = state.metrics.totalSleepTime / 60;
  const durationScore = hours >= 7 && hours <= 9 ? 100 : Math.max(0, 100 - Math.abs(hours - 8) * 20);

  // Timing consistency (low deviation = good)
  const timingScore = Math.max(0, 100 - Math.abs(state.circadian.phaseDeviation) * 10);

  // Insomnia score (inverse of ISI)
  const insomniaScore = Math.max(0, 100 - (state.insomnia.isiScore / 28) * 100);

  // Daytime functioning (inverse of sleepiness)
  const daytimeScore = (1 - state.daytimeSleepiness) * 100;

  // Subjective quality
  const qualityMap: Record<SleepQualityRating, number> = {
    'very_poor': 20,
    'poor': 40,
    'fair': 60,
    'good': 80,
    'excellent': 100,
  };
  const subjectiveScore = qualityMap[state.subjectiveQuality];

  return Math.round(
    efficiencyScore * weights.efficiency +
    durationScore * weights.duration +
    timingScore * weights.timing +
    insomniaScore * weights.insomnia +
    daytimeScore * weights.daytime +
    subjectiveScore * weights.subjective
  );
}
