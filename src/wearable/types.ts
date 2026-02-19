/**
 * Wearable Data Types for Health Connect Integration
 *
 * @packageDocumentation
 * @module wearable
 *
 * Scientific foundation:
 * - Health Connect API (Android 14+)
 * - Samsung Health SDK migration path
 * - Consumer wearable HRV validation (2024-2025 studies)
 */

/**
 * Data source identifier
 */
export type WearableSource =
  | 'health_connect'
  | 'samsung_health'
  | 'google_fit'  // Deprecated, but may still have legacy data
  | 'oura'
  | 'fitbit'
  | 'garmin'
  | 'apple_health'  // Via 3rd party sync
  | 'polar'
  | 'whoop'
  | 'manual';

/**
 * Sleep stage types matching Health Connect enum
 *
 * Reference: SleepSessionRecord.Stage from Health Connect API
 */
export type WearableSleepStage =
  | 'unknown'     // Cannot determine
  | 'awake'       // Fully awake
  | 'sleeping'    // Generic sleep (no staging available)
  | 'out_of_bed'  // Left bed during night
  | 'awake_in_bed'// Awake but in bed (counts toward WASO)
  | 'light'       // N1 + N2 combined
  | 'deep'        // N3 / SWS
  | 'rem';        // REM sleep

/**
 * SleepCore internal sleep stage (simplified)
 */
export type SleepCoreStage = 'wake' | 'light' | 'deep' | 'rem' | null;

/**
 * Mapping from wearable stages to SleepCore stages
 */
export const STAGE_MAPPING: Record<WearableSleepStage, SleepCoreStage> = {
  unknown: null,
  awake: 'wake',
  sleeping: 'light',      // Conservative: assume light sleep
  out_of_bed: 'wake',     // Counts toward WASO
  awake_in_bed: 'wake',   // Counts toward WASO
  light: 'light',
  deep: 'deep',
  rem: 'rem'
};

/**
 * Sleep stage record from wearable
 */
export interface IWearableSleepStage {
  /** Stage type */
  type: WearableSleepStage;

  /** Stage start time (ISO 8601) */
  startTime: Date;

  /** Stage end time (ISO 8601) */
  endTime: Date;
}

/**
 * HRV record from wearable
 *
 * Note: Consumer wearables typically provide RMSSD only.
 * SDNN, LF/HF require longer recordings or are estimated.
 *
 * Validation studies (2024):
 * - Oura Gen 4: CCC = 0.99 vs ECG
 * - Samsung Galaxy Watch: r = 0.85-0.92
 * - WHOOP 4.0: CCC = 0.94
 */
export interface IWearableHRVRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: Date;

  /**
   * RMSSD in milliseconds
   *
   * Valid range: 10-200 ms (physiologically plausible)
   * Higher = better parasympathetic tone
   */
  rmssd: number;

  /**
   * SDNN in milliseconds (optional)
   *
   * Not all wearables provide this
   */
  sdnn?: number;

  /**
   * Measurement quality indicator (0-1)
   *
   * Some wearables provide confidence scores
   */
  quality?: number;
}

/**
 * Heart rate record from wearable
 */
export interface IWearableHeartRateRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: Date;

  /** Heart rate in beats per minute */
  bpm: number;
}

/**
 * Complete sleep session data from wearable
 */
export interface IWearableSleepData {
  /** Data source identifier */
  source: WearableSource;

  /** Device identifier (anonymized) */
  deviceId: string;

  /** Unique session identifier from source */
  sessionId: string;

  /** Session start time (lights off / bedtime) */
  startTime: Date;

  /** Session end time (final wake) */
  endTime: Date;

  /**
   * Optional: User-provided notes
   */
  notes?: string;

  /**
   * Sleep stages (optional)
   *
   * Not all wearables provide staging.
   * Samsung Galaxy Watch 4+ provides stages.
   */
  stages?: IWearableSleepStage[];

  /**
   * HRV data during sleep (optional)
   *
   * Typically sampled every 5 minutes during night
   */
  hrv?: IWearableHRVRecord[];

  /**
   * Heart rate data during sleep (optional)
   */
  heartRate?: IWearableHeartRateRecord[];

  /**
   * Resting heart rate (optional)
   *
   * Daily RHR computed by wearable
   */
  restingHeartRate?: number;

  // ============================================================================
  // NEW METRICS (2025-2026 Trends)
  // ============================================================================

  /**
   * Blood Oxygen Saturation (SpO2) average (optional)
   *
   * Valid range: 70-100%
   * Used for sleep apnea screening (FDA-cleared Apple Watch/Samsung 2024)
   *
   * Reference: FDA 510(k) K240929 (Apple Sleep Apnea Notification)
   * Sensitivity: 66.3%, Specificity: 98.5% for moderate-to-severe OSA
   *
   * @since 2025-02
   */
  spo2?: number;

  /**
   * SpO2 minimum during sleep (optional)
   *
   * Clinically significant if < 90% (desaturation events)
   *
   * @since 2025-02
   */
  spo2Min?: number;

  /**
   * Breathing Disturbance Index (optional)
   *
   * Number of breathing disturbances per hour of sleep.
   * Apple Watch provides this metric via Health Connect.
   *
   * Clinical interpretation:
   * - < 5: Normal
   * - 5-15: Mild sleep apnea indicator
   * - 15-30: Moderate sleep apnea indicator
   * - > 30: Severe sleep apnea indicator
   *
   * Note: NOT a diagnosis. Suggests clinical evaluation if elevated.
   *
   * @since 2025-02
   */
  breathingDisturbances?: number;

  /**
   * Skin Temperature deviation from baseline (optional)
   *
   * Measured in °C (delta from personal baseline)
   * Used for circadian rhythm tracking.
   *
   * - Negative = body cooling (normal during sleep onset)
   * - Positive = elevated (may indicate illness, hormonal changes)
   *
   * Available on: Oura Ring, Galaxy Watch 7, Apple Watch Ultra
   *
   * Reference: Chronobiology in Medicine 2025
   * DOI: 10.33069/cim.2025.0011
   *
   * @since 2025-02
   */
  skinTemperature?: number;

  /**
   * Respiration Rate average (optional)
   *
   * Breaths per minute during sleep.
   * Normal adult range: 12-20 breaths/min
   *
   * Available on: Oura, Apple Watch, Fitbit, Garmin
   *
   * @since 2025-02
   */
  respirationRate?: number;
}

/**
 * Calculated metrics from wearable sleep data
 */
export interface IWearableSleepMetrics {
  /** Total Sleep Time in minutes */
  tst: number;

  /** Time In Bed in minutes */
  tib: number;

  /** Sleep Efficiency (0-100%) */
  se: number;

  /** Wake After Sleep Onset in minutes */
  waso: number;

  /** Sleep Onset Latency in minutes (estimated) */
  sol: number;

  /** Number of awakenings */
  awakenings: number;

  /** HRV metrics (if HRV data available) */
  hrvMetrics?: IWearableHRVMetrics;

  /** Sleep stage distribution (if stages available) */
  stageDistribution?: IWearableStageDistribution;

  // ============================================================================
  // NEW METRICS (2025-2026 Trends)
  // ============================================================================

  /**
   * Blood oxygen metrics (if SpO2 data available)
   * @since 2025-02
   */
  spo2Metrics?: IWearableSpO2Metrics;

  /**
   * Respiratory metrics (if breathing data available)
   * @since 2025-02
   */
  respiratoryMetrics?: IWearableRespiratoryMetrics;

  /**
   * Temperature metrics (if skin temperature available)
   * @since 2025-02
   */
  temperatureMetrics?: IWearableTemperatureMetrics;
}

/**
 * HRV metrics calculated from wearable data
 */
export interface IWearableHRVMetrics {
  /** Mean RMSSD during sleep (ms) */
  meanRMSSD: number;

  /** Standard deviation of RMSSD (ms) */
  sdRMSSD: number;

  /** Minimum RMSSD (ms) */
  minRMSSD: number;

  /** Maximum RMSSD (ms) */
  maxRMSSD: number;

  /** Number of valid samples */
  sampleCount: number;

  /**
   * HRV trend (positive = improving)
   *
   * Calculated over available history
   */
  trend?: number;
}

/**
 * Sleep stage distribution (percentages)
 */
export interface IWearableStageDistribution {
  /** Percentage of time awake */
  wake: number;

  /** Percentage in light sleep (N1+N2) */
  light: number;

  /** Percentage in deep sleep (N3/SWS) */
  deep: number;

  /** Percentage in REM sleep */
  rem: number;
}

// ============================================================================
// NEW METRIC INTERFACES (2025-2026 Trends)
// ============================================================================

/**
 * SpO2 metrics calculated from wearable data
 *
 * Used for sleep apnea screening (NOT diagnosis)
 * FDA-cleared on Apple Watch Series 9/10, Samsung Galaxy Watch (2024)
 *
 * @since 2025-02
 */
export interface IWearableSpO2Metrics {
  /** Mean SpO2 during sleep (%) */
  meanSpO2: number;

  /** Minimum SpO2 during sleep (%) */
  minSpO2: number;

  /** Time below 90% SpO2 (minutes) */
  timeBelow90: number;

  /**
   * Number of desaturation events (SpO2 drops ≥4%)
   *
   * Correlates with Oxygen Desaturation Index (ODI)
   */
  desaturationEvents: number;

  /** Number of valid samples */
  sampleCount: number;
}

/**
 * Respiratory metrics from wearable data
 *
 * @since 2025-02
 */
export interface IWearableRespiratoryMetrics {
  /** Mean respiration rate (breaths/min) */
  meanRespirationRate: number;

  /** Min respiration rate */
  minRespirationRate: number;

  /** Max respiration rate */
  maxRespirationRate: number;

  /**
   * Breathing Disturbance Index (events/hour)
   *
   * Proxy for AHI (Apnea-Hypopnea Index)
   */
  breathingDisturbanceIndex?: number;

  /** Number of valid samples */
  sampleCount: number;
}

/**
 * Temperature metrics from wearable data
 *
 * Used for circadian rhythm analysis
 *
 * @since 2025-02
 */
export interface IWearableTemperatureMetrics {
  /**
   * Skin temperature deviation from personal baseline (°C)
   *
   * Negative = cooling (normal during sleep)
   * Positive = elevated (may indicate illness)
   */
  deviation: number;

  /** Average skin temperature during sleep (°C) */
  meanTemperature?: number;

  /** Temperature trend throughout night */
  trend?: 'cooling' | 'stable' | 'warming';
}

// ============================================================================
// COMPOSITE SCORES (2025-02)
// Similar to Oura Readiness, WHOOP Recovery, Garmin Body Battery
// ============================================================================

/**
 * Readiness/Recovery score computed from wearable data
 *
 * Composite metric indicating physical readiness for the day.
 * Based on research from:
 * - Oura Ring validation studies (2024)
 * - WHOOP Recovery Score methodology
 * - Garmin Body Battery algorithm
 *
 * @since 2025-02
 */
export interface IWearableReadinessScore {
  /**
   * Overall readiness score (0-100)
   *
   * Interpretation:
   * - 0-30: Poor recovery, rest recommended
   * - 31-60: Moderate recovery, light activity OK
   * - 61-80: Good recovery, normal activity
   * - 81-100: Excellent recovery, high intensity OK
   */
  overall: number;

  /**
   * Component scores (0-100 each)
   *
   * Each component is normalized to 0-100 and weighted
   */
  components: {
    /** HRV component (based on RMSSD vs personal baseline) */
    hrv: number;

    /** Sleep quality component (SE, stages) */
    sleepQuality: number;

    /** Sleep duration component (TST vs optimal 7-9h) */
    sleepDuration: number;

    /** Recovery component (deep + REM %) */
    recovery: number;

    /** Respiratory component (SpO2, breathing) */
    respiratory?: number;
  };

  /**
   * Confidence level (0-1)
   *
   * Lower if insufficient data or sensor issues
   */
  confidence: number;

  /**
   * Trend vs 7-day average
   *
   * Positive = improving, negative = declining
   */
  trend?: number;

  /**
   * Contributing factors (sorted by impact)
   *
   * Human-readable explanations
   */
  contributingFactors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
}

/**
 * Sync payload from companion app
 */
export interface IWearableSyncPayload {
  /** User ID in SleepCore */
  userId: string;

  /** Device info */
  device: {
    id: string;
    manufacturer: string;
    model: string;
    osVersion: string;
  };

  /** Sync metadata */
  syncInfo: {
    timestamp: Date;
    lastSyncTime: Date;
    appVersion: string;
  };

  /** Sleep sessions to sync */
  sleepSessions: IWearableSleepData[];
}

/**
 * Sync response from backend
 */
export interface IWearableSyncResponse {
  /** Success indicator */
  success: boolean;

  /** Number of sessions processed */
  sessionsProcessed: number;

  /** Any errors encountered */
  errors?: Array<{
    sessionId: string;
    error: string;
  }>;

  /** Next sync recommendation (ISO 8601 duration) */
  nextSyncIn?: string;
}

/**
 * Data quality check result
 */
export interface IWearableDataQuality {
  /** Overall quality score (0-1) */
  overallScore: number;

  /** Individual checks */
  checks: {
    /** RMSSD values in valid range */
    hrvValid: boolean;

    /** Sufficient data points */
    sufficientSamples: boolean;

    /** No large gaps */
    continuousData: boolean;

    /** Session duration plausible */
    durationValid: boolean;
  };

  /** Warnings (non-critical issues) */
  warnings: string[];

  /** Errors (data should be rejected) */
  errors: string[];
}

/**
 * Wearable connection status
 */
export interface IWearableConnectionStatus {
  /** Is wearable connected */
  connected: boolean;

  /** Last successful sync */
  lastSync?: Date;

  /** Device info */
  device?: {
    name: string;
    manufacturer: string;
    batteryLevel?: number;
  };

  /** Permissions status */
  permissions: {
    sleep: boolean;
    heartRate: boolean;
    hrv: boolean;
    /** SpO2 permission (Health Connect: OXYGEN_SATURATION) @since 2025-02 */
    spo2?: boolean;
    /** Respiration permission (Health Connect: RESPIRATORY_RATE) @since 2025-02 */
    respiration?: boolean;
    /** Temperature permission (Health Connect: SKIN_TEMPERATURE) @since 2025-02 */
    skinTemperature?: boolean;
  };

  /** Any connection errors */
  error?: string;
}
