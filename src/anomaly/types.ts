/**
 * Anomaly Detection Types
 * =======================
 * Type definitions for detecting unusual sleep patterns using Z-score analysis.
 *
 * Clinical basis: Anomaly detection helps identify nights that deviate
 * significantly from a user's baseline, which may indicate:
 * - External factors (stress, illness, travel)
 * - Treatment effects (positive or negative)
 * - Need for intervention adjustment
 *
 * @packageDocumentation
 * @module @sleepcore/anomaly
 */

/**
 * Sleep metrics that can be analyzed for anomalies
 */
export type AnomalyMetric = 'tst' | 'se' | 'sol' | 'waso' | 'combined';

/**
 * Severity of detected anomaly based on Z-score magnitude
 */
export type AnomalySeverity = 'mild' | 'moderate' | 'severe';

/**
 * Direction of anomaly (better or worse than baseline)
 */
export type AnomalyDirection = 'positive' | 'negative' | 'neutral';

/**
 * Baseline statistics calculated from user's sleep history
 */
export interface BaselineStats {
  /** Mean Total Sleep Time in minutes */
  readonly meanTST: number;
  /** Standard deviation of TST */
  readonly stdTST: number;
  /** Mean Sleep Efficiency (0-100%) */
  readonly meanSE: number;
  /** Standard deviation of SE */
  readonly stdSE: number;
  /** Mean Sleep Onset Latency in minutes */
  readonly meanSOL: number;
  /** Standard deviation of SOL */
  readonly stdSOL: number;
  /** Mean Wake After Sleep Onset in minutes */
  readonly meanWASO: number;
  /** Standard deviation of WASO */
  readonly stdWASO: number;
  /** Number of sessions used to calculate baseline */
  readonly sampleCount: number;
  /** Date range of baseline data */
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  /** Whether baseline is reliable (sampleCount >= 7) */
  readonly isReliable: boolean;
}

/**
 * Result of anomaly detection for a single session
 */
export interface AnomalyResult {
  /** Whether this session is considered anomalous */
  readonly isAnomaly: boolean;
  /** Which metric triggered the anomaly (or 'combined' if multiple) */
  readonly metric: AnomalyMetric;
  /** Z-score of the most anomalous metric */
  readonly zScore: number;
  /** Severity based on Z-score magnitude */
  readonly severity: AnomalySeverity;
  /** Direction: positive (better) or negative (worse) */
  readonly direction: AnomalyDirection;
  /** Human-readable explanation in Russian */
  readonly explanation: string;
  /** Detailed breakdown by metric */
  readonly details: AnomalyDetails;
  /** Date of the anomalous session */
  readonly date: Date;
}

/**
 * Detailed Z-scores for each metric
 */
export interface AnomalyDetails {
  readonly tst: {
    readonly value: number;
    readonly zScore: number;
    readonly isAnomaly: boolean;
  };
  readonly se: {
    readonly value: number;
    readonly zScore: number;
    readonly isAnomaly: boolean;
  };
  readonly sol: {
    readonly value: number;
    readonly zScore: number;
    readonly isAnomaly: boolean;
  };
  readonly waso: {
    readonly value: number;
    readonly zScore: number;
    readonly isAnomaly: boolean;
  };
}

/**
 * Sleep session data for anomaly analysis
 * Simplified subset of ISleepSession/ISleepMetrics
 */
export interface SleepSessionForAnomaly {
  readonly date: Date;
  /** Total Sleep Time in minutes */
  readonly tst: number;
  /** Sleep Efficiency (0-100%) */
  readonly se: number;
  /** Sleep Onset Latency in minutes */
  readonly sol: number;
  /** Wake After Sleep Onset in minutes */
  readonly waso: number;
}

/**
 * Configuration for anomaly detection
 */
export interface AnomalyConfig {
  /** Z-score threshold for anomaly detection (default: 2.0) */
  readonly anomalyThreshold: number;
  /** Minimum sessions required for reliable baseline (default: 7) */
  readonly minBaselineSessions: number;
  /** Maximum sessions to include in baseline (rolling window) */
  readonly maxBaselineSessions: number;
  /** Weight for each metric in combined score */
  readonly metricWeights: {
    readonly tst: number;
    readonly se: number;
    readonly sol: number;
    readonly waso: number;
  };
}

/**
 * Interface for AnomalyDetector
 */
export interface IAnomalyDetector {
  /**
   * Calculate baseline statistics from sleep sessions
   */
  calculateBaseline(sessions: SleepSessionForAnomaly[]): BaselineStats;

  /**
   * Detect if a session is anomalous compared to baseline
   */
  detectAnomaly(
    session: SleepSessionForAnomaly,
    baseline: BaselineStats
  ): AnomalyResult;

  /**
   * Calculate Z-score for a value given mean and standard deviation
   */
  calculateZScore(value: number, mean: number, std: number): number;

  /**
   * Get severity level based on Z-score magnitude
   */
  getSeverity(zScore: number): AnomalySeverity;

  /**
   * Get direction based on Z-score sign and metric type
   */
  getDirection(zScore: number, metric: AnomalyMetric): AnomalyDirection;

  /**
   * Find all anomalies in a list of sessions
   */
  findAnomalies(
    sessions: SleepSessionForAnomaly[],
    baseline?: BaselineStats
  ): AnomalyResult[];

  /**
   * Check if baseline is reliable enough for anomaly detection
   */
  isBaselineReliable(baseline: BaselineStats): boolean;
}

/**
 * Summary of anomalies over a time period
 */
export interface AnomalySummary {
  readonly totalSessions: number;
  readonly anomalyCount: number;
  readonly anomalyRate: number;
  readonly mostCommonMetric: AnomalyMetric | null;
  readonly averageSeverity: AnomalySeverity | null;
  readonly trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}
