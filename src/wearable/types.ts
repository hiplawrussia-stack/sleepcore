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
  };

  /** Any connection errors */
  error?: string;
}
