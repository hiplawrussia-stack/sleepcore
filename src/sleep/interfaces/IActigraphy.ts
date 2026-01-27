/**
 * IActigraphy - Actigraphy Data Interfaces
 * =========================================
 * Interfaces for raw accelerometer/actigraphy data from wearables.
 * Used for PAT (Pretrained Actigraphy Transformer) integration.
 *
 * Scientific Foundation:
 * - NHANES Accelerometer Protocol
 * - ActiGraph GT3X+ standard format
 * - PAT-M input specifications (Ruan et al., 2024)
 *
 * Reference:
 * - Ruan et al. "Foundation Models for Wearable Movement Data" (2024)
 * - https://github.com/njacobsonlab/Pretrained-Actigraphy-Transformer
 *
 * @packageDocumentation
 * @module @sleepcore/sleep/interfaces
 */

/**
 * Actigraphy data source devices
 */
export type ActigraphySource =
  | 'apple_watch'
  | 'fitbit'
  | 'garmin'
  | 'oura'
  | 'whoop'
  | 'actigraph'  // Research-grade ActiGraph device
  | 'geneactiv'  // Research-grade GENEActiv
  | 'axivity'    // Research-grade Axivity AX3
  | 'generic';

/**
 * Raw accelerometer sample
 * Typically 30-100 Hz sampling rate
 */
export interface IAccelerometerSample {
  /** Timestamp (milliseconds since epoch) */
  readonly timestamp: number;
  /** X-axis acceleration (g-force) */
  readonly x: number;
  /** Y-axis acceleration (g-force) */
  readonly y: number;
  /** Z-axis acceleration (g-force) */
  readonly z: number;
}

/**
 * Activity count (epoch-level aggregation)
 * Standard 1-minute epoch format
 */
export interface IActivityCount {
  /** Epoch start timestamp */
  readonly timestamp: number;
  /** Epoch duration in seconds (typically 60) */
  readonly epochSeconds: number;
  /** Activity count (device-specific units) */
  readonly count: number;
  /** Vector magnitude count (√(x² + y² + z²)) */
  readonly vectorMagnitude: number;
  /** Steps detected in epoch */
  readonly steps: number;
  /** Heart rate if available */
  readonly heartRate?: number;
  /** Is device worn? (wear detection) */
  readonly isWorn: boolean;
}

/**
 * Daily actigraphy summary
 */
export interface IDailyActigraphySummary {
  /** Date (YYYY-MM-DD) */
  readonly date: string;
  /** Total activity counts */
  readonly totalActivityCounts: number;
  /** Steps */
  readonly totalSteps: number;
  /** Minutes of sedentary behavior */
  readonly sedentaryMinutes: number;
  /** Minutes of light activity */
  readonly lightActivityMinutes: number;
  /** Minutes of moderate activity */
  readonly moderateActivityMinutes: number;
  /** Minutes of vigorous activity */
  readonly vigorousActivityMinutes: number;
  /** MVPA (Moderate-Vigorous Physical Activity) minutes */
  readonly mvpaMinutes: number;
  /** Non-wear time in minutes */
  readonly nonWearMinutes: number;
  /** Valid wear hours */
  readonly validWearHours: number;
  /** Sleep period start */
  readonly sleepStart?: string;
  /** Sleep period end */
  readonly sleepEnd?: string;
  /** Activity during designated sleep period */
  readonly sleepPeriodActivity?: number;
}

/**
 * Actigraphy recording session
 * Contains raw or aggregated data for a time period
 */
export interface IActigraphySession {
  /** User ID */
  readonly userId: string;
  /** Session ID */
  readonly sessionId: string;
  /** Device/source */
  readonly source: ActigraphySource;
  /** Recording start timestamp */
  readonly startTime: Date;
  /** Recording end timestamp */
  readonly endTime: Date;
  /** Sampling rate (Hz) for raw data */
  readonly samplingRate?: number;
  /** Epoch length (seconds) for aggregated data */
  readonly epochLength: number;
  /** Activity counts (epoch-level data) */
  readonly epochs: IActivityCount[];
  /** Daily summaries */
  readonly dailySummaries: IDailyActigraphySummary[];
  /** Data quality score (0-1) */
  readonly dataQuality: number;
  /** Firmware version of device */
  readonly firmwareVersion?: string;
  /** Device serial number */
  readonly deviceId?: string;
}

/**
 * PAT model input format
 * Based on Pretrained Actigraphy Transformer specifications
 */
export interface IPATInput {
  /** User ID */
  readonly userId: string;
  /** Normalized activity counts (minute-level) */
  readonly activitySequence: number[];
  /** Sequence length in minutes */
  readonly sequenceLength: number;
  /** Start timestamp */
  readonly startTime: Date;
  /** End timestamp */
  readonly endTime: Date;
  /** Mask for missing data (1 = valid, 0 = missing) */
  readonly validMask: number[];
  /** Time of day encoding (0-1440 normalized to 0-1) */
  readonly timeOfDayEncoding: number[];
  /** Day of week encoding (0-6 normalized to 0-1) */
  readonly dayOfWeekEncoding: number[];
}

/**
 * PAT model output: Sleep phenotype classification
 */
export interface ISleepPhenotype {
  /** Primary phenotype */
  readonly primaryPhenotype: SleepPhenotypeClass;
  /** Phenotype probabilities */
  readonly probabilities: Record<SleepPhenotypeClass, number>;
  /** Confidence in classification */
  readonly confidence: number;
  /** Stability of phenotype (based on longitudinal data) */
  readonly stability: 'stable' | 'transitioning' | 'variable';
}

/**
 * Sleep phenotype classes
 * Based on actigraphy-derived sleep patterns
 */
export type SleepPhenotypeClass =
  | 'healthy_sleeper'           // Regular patterns, adequate duration
  | 'short_sleeper'             // Consistently <6h, may be natural or pathological
  | 'long_sleeper'              // Consistently >9h
  | 'delayed_phase'             // Late bedtime, late wake time
  | 'advanced_phase'            // Early bedtime, early wake time
  | 'irregular'                 // High variability in timing
  | 'fragmented'                // High nocturnal activity, poor continuity
  | 'social_jetlag'             // Weekday/weekend mismatch
  | 'shift_worker';             // Non-standard sleep patterns

/**
 * PAT prediction result
 */
export interface IPATPrediction {
  /** User ID */
  readonly userId: string;
  /** Prediction timestamp */
  readonly timestamp: Date;
  /** Sleep phenotype classification */
  readonly phenotype: ISleepPhenotype;
  /** Predicted sleep metrics for next period */
  readonly predictedMetrics: {
    readonly sleepDuration: number;      // minutes
    readonly sleepEfficiency: number;    // percentage
    readonly sleepOnset: string;         // HH:MM
    readonly wakeTime: string;           // HH:MM
    readonly fragmentation: number;      // 0-1
  };
  /** Risk scores */
  readonly riskScores: {
    readonly insomniaRisk: number;       // 0-1
    readonly sleepApneaRisk: number;     // 0-1
    readonly circadianDisruptionRisk: number; // 0-1
    readonly sleepDeprivationRisk: number;    // 0-1
  };
  /** Feature attributions (explainability) */
  readonly attributions?: IActigraphyAttribution[];
  /** Model confidence */
  readonly confidence: number;
  /** Model version */
  readonly modelVersion: string;
}

/**
 * Feature attribution for explainability
 * Based on PAT attention weights
 */
export interface IActigraphyAttribution {
  /** Time window start (minutes from sequence start) */
  readonly startMinute: number;
  /** Time window end */
  readonly endMinute: number;
  /** Attribution score (-1 to 1) */
  readonly score: number;
  /** Interpretation */
  readonly interpretation: string;
  /** Day of week */
  readonly dayOfWeek: number;
  /** Time of day (HH:MM) */
  readonly timeOfDay: string;
}

/**
 * Actigraphy preprocessing configuration
 */
export interface IActigraphyPreprocessingConfig {
  /** Target epoch length in seconds (default: 60) */
  readonly targetEpochSeconds: number;
  /** Non-wear detection algorithm */
  readonly nonWearAlgorithm: 'troiano' | 'choi' | 'hees' | 'none';
  /** Non-wear threshold (consecutive zero-count minutes) */
  readonly nonWearThreshold: number;
  /** Minimum valid wear hours per day */
  readonly minValidWearHours: number;
  /** Smoothing window (minutes) */
  readonly smoothingWindow: number;
  /** Normalization method */
  readonly normalization: 'minmax' | 'zscore' | 'log' | 'none';
  /** Handle missing data */
  readonly missingDataStrategy: 'interpolate' | 'zero' | 'mask';
  /** Outlier removal (percentile threshold) */
  readonly outlierPercentile: number;
}

/**
 * Default preprocessing configuration
 */
export const DEFAULT_ACTIGRAPHY_PREPROCESSING: IActigraphyPreprocessingConfig = {
  targetEpochSeconds: 60,
  nonWearAlgorithm: 'choi',
  nonWearThreshold: 90,
  minValidWearHours: 10,
  smoothingWindow: 5,
  normalization: 'zscore',
  missingDataStrategy: 'mask',
  outlierPercentile: 99,
};

/**
 * Activity intensity thresholds (counts per minute)
 * Based on Freedson et al. (1998) for adults
 */
export const ACTIVITY_INTENSITY_THRESHOLDS = {
  sedentary: { max: 99 },           // <100 CPM
  light: { min: 100, max: 1951 },   // 100-1951 CPM
  moderate: { min: 1952, max: 5724 }, // 1952-5724 CPM
  vigorous: { min: 5725 },          // ≥5725 CPM
} as const;

/**
 * Sleep period detection result
 */
export interface ISleepPeriodDetection {
  /** Sleep onset timestamp */
  readonly sleepOnset: Date;
  /** Wake time timestamp */
  readonly wakeTime: Date;
  /** Total sleep period (minutes) */
  readonly sleepPeriodMinutes: number;
  /** Estimated sleep duration (excluding WASO) */
  readonly estimatedSleepMinutes: number;
  /** Wake after sleep onset (minutes) */
  readonly estimatedWASO: number;
  /** Sleep efficiency estimate */
  readonly estimatedEfficiency: number;
  /** Detection algorithm used */
  readonly algorithm: 'sadeh' | 'cole_kripke' | 'oakley' | 'tudor_locke';
  /** Confidence in detection */
  readonly confidence: number;
}

/**
 * Circadian rhythm metrics from actigraphy
 */
export interface ICircadianMetrics {
  /** Interdaily stability (0-1) - regularity of rhythm */
  readonly interdailyStability: number;
  /** Intradaily variability (0-2) - fragmentation of rhythm */
  readonly intradailyVariability: number;
  /** Relative amplitude (0-1) - strength of rhythm */
  readonly relativeAmplitude: number;
  /** L5 onset (most inactive 5-hour period start) */
  readonly l5Onset: string;
  /** M10 onset (most active 10-hour period start) */
  readonly m10Onset: string;
  /** L5 midpoint (proxy for sleep midpoint) */
  readonly l5Midpoint: string;
  /** Social jet lag estimate (hours) */
  readonly socialJetLag: number;
  /** Cosinor analysis: amplitude */
  readonly cosinorAmplitude: number;
  /** Cosinor analysis: acrophase (peak activity time) */
  readonly cosinorAcrophase: number;
  /** Cosinor analysis: mesor (rhythm-adjusted mean) */
  readonly cosinorMesor: number;
}

/**
 * Utility: Convert raw accelerometer to activity counts
 */
export function rawToActivityCounts(
  samples: IAccelerometerSample[],
  epochSeconds: number = 60
): IActivityCount[] {
  if (samples.length === 0) return [];

  const epochMs = epochSeconds * 1000;
  const epochs: IActivityCount[] = [];

  // Group samples by epoch
  const startTime = samples[0]?.timestamp ?? 0;
  let epochStart = startTime;
  let epochSamples: IAccelerometerSample[] = [];

  for (const sample of samples) {
    if (sample.timestamp >= epochStart + epochMs) {
      // Process completed epoch
      if (epochSamples.length > 0) {
        epochs.push(processEpoch(epochSamples, epochStart, epochSeconds));
      }
      epochStart += epochMs;
      epochSamples = [];
    }
    epochSamples.push(sample);
  }

  // Process final epoch
  if (epochSamples.length > 0) {
    epochs.push(processEpoch(epochSamples, epochStart, epochSeconds));
  }

  return epochs;
}

/**
 * Process single epoch from raw samples
 */
function processEpoch(
  samples: IAccelerometerSample[],
  epochStart: number,
  epochSeconds: number
): IActivityCount {
  // Calculate vector magnitude for each sample
  const vectorMagnitudes = samples.map(s =>
    Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2)
  );

  // Activity count as sum of vector magnitudes above threshold
  const threshold = 0.05; // g-force threshold
  const count = vectorMagnitudes.reduce((sum, vm) =>
    sum + (vm > threshold ? vm * 100 : 0), 0
  );

  const avgVm = vectorMagnitudes.reduce((a, b) => a + b, 0) / vectorMagnitudes.length;

  return {
    timestamp: epochStart,
    epochSeconds,
    count: Math.round(count),
    vectorMagnitude: avgVm,
    steps: 0, // Requires step detection algorithm
    isWorn: avgVm > 0.01, // Simple wear detection
  };
}

/**
 * Utility: Classify activity intensity
 */
export function classifyIntensity(
  countsPerMinute: number
): 'sedentary' | 'light' | 'moderate' | 'vigorous' {
  if (countsPerMinute < ACTIVITY_INTENSITY_THRESHOLDS.sedentary.max) {
    return 'sedentary';
  }
  if (countsPerMinute <= ACTIVITY_INTENSITY_THRESHOLDS.light.max) {
    return 'light';
  }
  if (countsPerMinute <= ACTIVITY_INTENSITY_THRESHOLDS.moderate.max) {
    return 'moderate';
  }
  return 'vigorous';
}
