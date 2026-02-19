/**
 * Anomaly Detection Engine
 * ========================
 * Engine for detecting unusual sleep patterns using Z-score statistical analysis.
 *
 * Clinical basis:
 * - Z-score measures how many standard deviations a value is from the mean
 * - |Z| > 2 indicates statistically unusual (95% confidence)
 * - |Z| > 2.5 indicates moderate anomaly
 * - |Z| > 3 indicates severe anomaly (99.7% confidence)
 *
 * Algorithm:
 * 1. Calculate baseline from 7+ days of user's sleep data
 * 2. For each new session, calculate Z-scores for TST, SE, SOL, WASO
 * 3. Flag sessions where any metric exceeds threshold
 * 4. Provide human-readable explanations
 *
 * Note: This is a simple but effective first implementation.
 * Future: IsolationForest for multivariate anomaly detection.
 *
 * @packageDocumentation
 * @module @sleepcore/anomaly
 */

import type {
  IAnomalyDetector,
  BaselineStats,
  AnomalyResult,
  AnomalyDetails,
  AnomalyConfig,
  AnomalyMetric,
  AnomalySeverity,
  AnomalyDirection,
  SleepSessionForAnomaly,
} from './types';

/**
 * Default configuration for anomaly detection
 */
const DEFAULT_CONFIG: AnomalyConfig = {
  anomalyThreshold: 2.0, // |Z| > 2 = anomaly (conservative start)
  minBaselineSessions: 7, // Minimum for reliable baseline
  maxBaselineSessions: 30, // Rolling window
  metricWeights: {
    tst: 0.3,
    se: 0.3,
    sol: 0.2,
    waso: 0.2,
  },
};

/**
 * Z-score thresholds for severity levels
 */
const SEVERITY_THRESHOLDS = {
  MILD: 2.0,
  MODERATE: 2.5,
  SEVERE: 3.0,
} as const;

/**
 * Minimum standard deviation to prevent division by zero
 */
const MIN_STD = 0.001;

/**
 * AnomalyDetector - Detects unusual sleep patterns using Z-score analysis
 */
export class AnomalyDetector implements IAnomalyDetector {
  private readonly config: AnomalyConfig;

  constructor(config: Partial<AnomalyConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      metricWeights: {
        ...DEFAULT_CONFIG.metricWeights,
        ...config.metricWeights,
      },
    };
  }

  /**
   * Calculate baseline statistics from sleep sessions
   *
   * @param sessions - Array of sleep sessions (minimum 7 for reliable baseline)
   * @returns Baseline statistics
   */
  calculateBaseline(sessions: SleepSessionForAnomaly[]): BaselineStats {
    if (sessions.length === 0) {
      return this.createEmptyBaseline();
    }

    // Sort by date and take most recent sessions within limit
    const sortedSessions = [...sessions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, this.config.maxBaselineSessions);

    const tst = sortedSessions.map((s) => s.tst);
    const se = sortedSessions.map((s) => s.se);
    const sol = sortedSessions.map((s) => s.sol);
    const waso = sortedSessions.map((s) => s.waso);

    const dateRange = {
      start: sortedSessions[sortedSessions.length - 1].date,
      end: sortedSessions[0].date,
    };

    return {
      meanTST: this.mean(tst),
      stdTST: Math.max(this.std(tst), MIN_STD),
      meanSE: this.mean(se),
      stdSE: Math.max(this.std(se), MIN_STD),
      meanSOL: this.mean(sol),
      stdSOL: Math.max(this.std(sol), MIN_STD),
      meanWASO: this.mean(waso),
      stdWASO: Math.max(this.std(waso), MIN_STD),
      sampleCount: sortedSessions.length,
      dateRange,
      isReliable: sortedSessions.length >= this.config.minBaselineSessions,
    };
  }

  /**
   * Detect if a session is anomalous compared to baseline
   *
   * @param session - Sleep session to analyze
   * @param baseline - Baseline statistics to compare against
   * @returns Anomaly detection result
   */
  detectAnomaly(
    session: SleepSessionForAnomaly,
    baseline: BaselineStats
  ): AnomalyResult {
    // Calculate Z-scores for each metric
    const zTST = this.calculateZScore(session.tst, baseline.meanTST, baseline.stdTST);
    const zSE = this.calculateZScore(session.se, baseline.meanSE, baseline.stdSE);
    const zSOL = this.calculateZScore(session.sol, baseline.meanSOL, baseline.stdSOL);
    const zWASO = this.calculateZScore(session.waso, baseline.meanWASO, baseline.stdWASO);

    // Build details
    const details: AnomalyDetails = {
      tst: {
        value: session.tst,
        zScore: zTST,
        isAnomaly: Math.abs(zTST) >= this.config.anomalyThreshold,
      },
      se: {
        value: session.se,
        zScore: zSE,
        isAnomaly: Math.abs(zSE) >= this.config.anomalyThreshold,
      },
      sol: {
        value: session.sol,
        zScore: zSOL,
        isAnomaly: Math.abs(zSOL) >= this.config.anomalyThreshold,
      },
      waso: {
        value: session.waso,
        zScore: zWASO,
        isAnomaly: Math.abs(zWASO) >= this.config.anomalyThreshold,
      },
    };

    // Find the most anomalous metric
    const anomalousMetrics = [
      { metric: 'tst' as AnomalyMetric, z: zTST },
      { metric: 'se' as AnomalyMetric, z: zSE },
      { metric: 'sol' as AnomalyMetric, z: zSOL },
      { metric: 'waso' as AnomalyMetric, z: zWASO },
    ].filter((m) => Math.abs(m.z) >= this.config.anomalyThreshold);

    // Determine if anomaly exists
    const isAnomaly = anomalousMetrics.length > 0;

    // Get the most extreme Z-score
    const mostExtreme = anomalousMetrics.length > 0
      ? anomalousMetrics.reduce((max, m) =>
          Math.abs(m.z) > Math.abs(max.z) ? m : max
        )
      : { metric: 'combined' as AnomalyMetric, z: 0 };

    // Determine metric (combined if multiple)
    const metric: AnomalyMetric =
      anomalousMetrics.length > 1 ? 'combined' : mostExtreme.metric;

    const severity = this.getSeverity(mostExtreme.z);
    const direction = this.getDirection(mostExtreme.z, mostExtreme.metric);
    const explanation = this.generateExplanation(
      session,
      baseline,
      details,
      metric,
      severity,
      direction
    );

    return {
      isAnomaly,
      metric,
      zScore: mostExtreme.z,
      severity,
      direction,
      explanation,
      details,
      date: session.date,
    };
  }

  /**
   * Calculate Z-score for a value
   *
   * @param value - The observed value
   * @param mean - The mean of the baseline
   * @param std - The standard deviation of the baseline
   * @returns Z-score
   */
  calculateZScore(value: number, mean: number, std: number): number {
    const safeStd = Math.max(std, MIN_STD);
    return (value - mean) / safeStd;
  }

  /**
   * Get severity level based on Z-score magnitude
   *
   * @param zScore - Z-score value
   * @returns Severity level
   */
  getSeverity(zScore: number): AnomalySeverity {
    const absZ = Math.abs(zScore);

    if (absZ >= SEVERITY_THRESHOLDS.SEVERE) {
      return 'severe';
    }
    if (absZ >= SEVERITY_THRESHOLDS.MODERATE) {
      return 'moderate';
    }
    return 'mild';
  }

  /**
   * Get direction based on Z-score sign and metric type
   *
   * For sleep metrics:
   * - TST: higher is better (positive z = positive direction)
   * - SE: higher is better (positive z = positive direction)
   * - SOL: lower is better (negative z = positive direction)
   * - WASO: lower is better (negative z = positive direction)
   *
   * @param zScore - Z-score value
   * @param metric - Which metric this Z-score is for
   * @returns Direction (positive = better, negative = worse)
   */
  getDirection(zScore: number, metric: AnomalyMetric): AnomalyDirection {
    if (Math.abs(zScore) < this.config.anomalyThreshold) {
      return 'neutral';
    }

    // For TST and SE, higher is better
    if (metric === 'tst' || metric === 'se') {
      return zScore > 0 ? 'positive' : 'negative';
    }

    // For SOL and WASO, lower is better
    if (metric === 'sol' || metric === 'waso') {
      return zScore < 0 ? 'positive' : 'negative';
    }

    // For combined, look at overall trend
    return 'neutral';
  }

  /**
   * Find all anomalies in a list of sessions
   *
   * @param sessions - Sleep sessions to analyze
   * @param baseline - Optional pre-calculated baseline
   * @returns Array of anomaly results for anomalous sessions
   */
  findAnomalies(
    sessions: SleepSessionForAnomaly[],
    baseline?: BaselineStats
  ): AnomalyResult[] {
    if (sessions.length < this.config.minBaselineSessions) {
      return []; // Not enough data for anomaly detection
    }

    const effectiveBaseline = baseline || this.calculateBaseline(sessions);

    if (!this.isBaselineReliable(effectiveBaseline)) {
      return []; // Baseline not reliable
    }

    return sessions
      .map((session) => this.detectAnomaly(session, effectiveBaseline))
      .filter((result) => result.isAnomaly);
  }

  /**
   * Check if baseline is reliable enough for anomaly detection
   *
   * @param baseline - Baseline statistics
   * @returns Whether baseline is reliable
   */
  isBaselineReliable(baseline: BaselineStats): boolean {
    return baseline.isReliable;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  /**
   * Calculate mean of an array
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation of an array
   */
  private std(values: number[]): number {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) /
      (values.length - 1); // Sample std (n-1)
    return Math.sqrt(variance);
  }

  /**
   * Create empty baseline for when no data is available
   */
  private createEmptyBaseline(): BaselineStats {
    const now = new Date();
    return {
      meanTST: 0,
      stdTST: MIN_STD,
      meanSE: 0,
      stdSE: MIN_STD,
      meanSOL: 0,
      stdSOL: MIN_STD,
      meanWASO: 0,
      stdWASO: MIN_STD,
      sampleCount: 0,
      dateRange: { start: now, end: now },
      isReliable: false,
    };
  }

  /**
   * Generate human-readable explanation for anomaly
   */
  private generateExplanation(
    session: SleepSessionForAnomaly,
    baseline: BaselineStats,
    details: AnomalyDetails,
    metric: AnomalyMetric,
    severity: AnomalySeverity,
    direction: AnomalyDirection
  ): string {
    const severityText =
      severity === 'severe'
        ? 'Значительно'
        : severity === 'moderate'
        ? 'Заметно'
        : 'Немного';

    const directionText =
      direction === 'positive' ? 'лучше' : direction === 'negative' ? 'хуже' : '';

    if (metric === 'combined') {
      const anomalies: string[] = [];
      if (details.tst.isAnomaly) {
        anomalies.push(this.describeTSTAnomaly(session.tst, baseline.meanTST, details.tst.zScore));
      }
      if (details.se.isAnomaly) {
        anomalies.push(this.describeSEAnomaly(session.se, baseline.meanSE, details.se.zScore));
      }
      if (details.sol.isAnomaly) {
        anomalies.push(this.describeSOLAnomaly(session.sol, baseline.meanSOL, details.sol.zScore));
      }
      if (details.waso.isAnomaly) {
        anomalies.push(this.describeWASOAnomaly(session.waso, baseline.meanWASO, details.waso.zScore));
      }
      return `Необычная ночь: ${anomalies.join('; ')}.`;
    }

    switch (metric) {
      case 'tst':
        return `${severityText} ${directionText} обычного: ${this.describeTSTAnomaly(session.tst, baseline.meanTST, details.tst.zScore)}.`;
      case 'se':
        return `${severityText} ${directionText} обычного: ${this.describeSEAnomaly(session.se, baseline.meanSE, details.se.zScore)}.`;
      case 'sol':
        return `${severityText} ${directionText} обычного: ${this.describeSOLAnomaly(session.sol, baseline.meanSOL, details.sol.zScore)}.`;
      case 'waso':
        return `${severityText} ${directionText} обычного: ${this.describeWASOAnomaly(session.waso, baseline.meanWASO, details.waso.zScore)}.`;
      default:
        return 'Обнаружено отклонение от обычного паттерна сна.';
    }
  }

  private describeTSTAnomaly(value: number, mean: number, z: number): string {
    const diff = Math.round(value - mean);
    const hours = Math.floor(value / 60);
    const mins = Math.round(value % 60);
    const direction = z > 0 ? 'больше' : 'меньше';
    return `сон ${hours}ч ${mins}мин (на ${Math.abs(diff)} мин ${direction} обычного)`;
  }

  private describeSEAnomaly(value: number, mean: number, z: number): string {
    const direction = z > 0 ? 'выше' : 'ниже';
    return `эффективность ${Math.round(value)}% (${direction} обычных ${Math.round(mean)}%)`;
  }

  private describeSOLAnomaly(value: number, mean: number, z: number): string {
    const direction = z > 0 ? 'дольше' : 'быстрее';
    return `засыпание ${Math.round(value)} мин (${direction} обычных ${Math.round(mean)} мин)`;
  }

  private describeWASOAnomaly(value: number, mean: number, z: number): string {
    const direction = z > 0 ? 'больше' : 'меньше';
    return `пробуждения ${Math.round(value)} мин (${direction} обычных ${Math.round(mean)} мин)`;
  }
}

/**
 * Singleton instance for convenience
 */
export const anomalyDetector = new AnomalyDetector();
