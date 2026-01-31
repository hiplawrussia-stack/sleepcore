/**
 * RQA Metrics Logger (Experimental)
 * ==================================
 * Recurrence Quantification Analysis for sleep diary time series.
 *
 * Scientific Foundation:
 * - Webber & Zbilut 2005: RQA for physiological signals
 * - Marwan 2007: Cross-recurrence quantification
 *
 * IMPORTANT: RQA is validated for EEG and HRV but NOT for self-report
 * sleep diary data (evidence gap). This module is EXPERIMENTAL:
 * - Disabled by default (feature flag)
 * - Only logs to console.debug (never to DB)
 * - Never shown to patients
 * - No clinical decisions based on these metrics
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepHistoryEntry } from './SleepPredictionService';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * RQA configuration
 */
export interface IRQAConfig {
  /** Feature flag — disabled by default */
  readonly enabled: boolean;
  /** Embedding dimension (Takens embedding) */
  readonly embeddingDimension: number;
  /** Time delay for embedding (1 = consecutive days) */
  readonly timeDelay: number;
  /** Recurrence threshold as fraction of data range */
  readonly recurrenceThreshold: number;
  /** Minimum data points required */
  readonly minDataPoints: number;
}

/**
 * Default RQA configuration
 */
export const DEFAULT_RQA_CONFIG: IRQAConfig = {
  enabled: false,    // DISABLED by default — experimental
  embeddingDimension: 3,
  timeDelay: 1,
  recurrenceThreshold: 0.1,  // 10% of data range
  minDataPoints: 14,
};

/**
 * RQA metrics result
 */
export interface IRQAMetrics {
  /** Recurrence Rate (%REC) — proportion of recurrent points */
  readonly recurrenceRate: number;
  /** Determinism (%DET) — proportion of recurrent points forming diagonal lines */
  readonly determinism: number;
  /** Laminarity (%LAM) — proportion of recurrent points forming vertical lines */
  readonly laminarity: number;
  /** Maximum diagonal line length (Lmax) */
  readonly maxDiagonalLength: number;
  /** Shannon entropy of diagonal line length distribution */
  readonly entropy: number;
  /** Average vertical line length (trapping time) */
  readonly trappingTime: number;
}

// ============================================================================
// RQA METRICS LOGGER
// ============================================================================

/**
 * Experimental RQA metrics logger for sleep time series
 *
 * Computes recurrence quantification analysis metrics on sleep
 * efficiency time series. Results are ONLY logged to console.debug
 * for research purposes. Never affects patient-facing output.
 */
export class RQAMetricsLogger {
  private config: IRQAConfig;

  constructor(config: Partial<IRQAConfig> = {}) {
    this.config = { ...DEFAULT_RQA_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Compute RQA metrics and log them (if enabled and sufficient data)
   *
   * @param userId User identifier for logging context
   * @param history Sleep history entries
   */
  computeAndLog(userId: string, history: ISleepHistoryEntry[]): void {
    if (!this.config.enabled) return;
    if (history.length < this.config.minDataPoints) return;

    try {
      // Extract SE time series
      const timeSeries = history.map(e => e.metrics.sleepEfficiency);

      // Compute RQA
      const metrics = this.computeRQA(timeSeries);

      // Log to console.debug only — never to DB, never to patient
      console.debug('[RQA-Experimental]', {
        userId,
        dataPoints: timeSeries.length,
        metrics,
        config: {
          embeddingDimension: this.config.embeddingDimension,
          timeDelay: this.config.timeDelay,
          threshold: this.config.recurrenceThreshold,
        },
      });
    } catch (error) {
      console.debug('[RQA-Experimental] Error computing metrics:', error);
    }
  }

  /**
   * Compute RQA metrics for a time series (exposed for testing)
   */
  computeRQA(timeSeries: number[]): IRQAMetrics {
    // Step 1: Time-delay embedding
    const embedded = this.embedTimeSeries(timeSeries);

    // Step 2: Compute recurrence plot
    const recurrencePlot = this.computeRecurrencePlot(embedded, timeSeries);

    // Step 3: Extract RQA metrics from plot
    return this.computeRQAFromPlot(recurrencePlot, embedded.length);
  }

  /**
   * Check if RQA is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ==========================================================================
  // EMBEDDING
  // ==========================================================================

  /**
   * Time-delay embedding (Takens theorem)
   * Converts 1D time series to m-dimensional phase space
   *
   * @param timeSeries Raw 1D time series
   * @returns Array of m-dimensional vectors
   */
  private embedTimeSeries(timeSeries: number[]): number[][] {
    const { embeddingDimension: m, timeDelay: tau } = this.config;
    const n = timeSeries.length - (m - 1) * tau;
    const embedded: number[][] = [];

    for (let i = 0; i < n; i++) {
      const vector: number[] = [];
      for (let j = 0; j < m; j++) {
        vector.push(timeSeries[i + j * tau]);
      }
      embedded.push(vector);
    }

    return embedded;
  }

  // ==========================================================================
  // RECURRENCE PLOT
  // ==========================================================================

  /**
   * Compute binary recurrence plot
   *
   * R(i,j) = 1 if ||x_i - x_j|| < epsilon, else 0
   *
   * @param embedded Embedded time series vectors
   * @param originalSeries Original series (for range calculation)
   * @returns Binary recurrence matrix
   */
  private computeRecurrencePlot(embedded: number[][], originalSeries: number[]): boolean[][] {
    const n = embedded.length;

    // Calculate epsilon as fraction of data range
    const min = Math.min(...originalSeries);
    const max = Math.max(...originalSeries);
    const range = max - min;
    const epsilon = range * this.config.recurrenceThreshold;

    const plot: boolean[][] = [];

    for (let i = 0; i < n; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < n; j++) {
        // Euclidean distance
        let dist = 0;
        for (let k = 0; k < embedded[i].length; k++) {
          dist += (embedded[i][k] - embedded[j][k]) ** 2;
        }
        dist = Math.sqrt(dist);

        row.push(dist <= epsilon);
      }
      plot.push(row);
    }

    return plot;
  }

  // ==========================================================================
  // RQA COMPUTATION
  // ==========================================================================

  /**
   * Extract RQA metrics from recurrence plot
   */
  private computeRQAFromPlot(plot: boolean[][], n: number): IRQAMetrics {
    // Count total recurrence points (excluding main diagonal)
    let recurrenceCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && plot[i][j]) {
          recurrenceCount++;
        }
      }
    }

    const totalPairs = n * (n - 1);
    const recurrenceRate = totalPairs > 0 ? recurrenceCount / totalPairs : 0;

    // Diagonal line analysis (for determinism and entropy)
    const diagonalLengths = this.extractDiagonalLines(plot, n);

    // Vertical line analysis (for laminarity and trapping time)
    const verticalLengths = this.extractVerticalLines(plot, n);

    // Determinism: proportion in diagonal lines (length >= 2)
    const diagonalPointsInLines = diagonalLengths
      .filter(l => l >= 2)
      .reduce((sum, l) => sum + l, 0);
    const determinism = recurrenceCount > 0
      ? diagonalPointsInLines / (recurrenceCount / 2) // div by 2 for symmetry
      : 0;

    // Max diagonal length
    const maxDiagonalLength = diagonalLengths.length > 0
      ? Math.max(...diagonalLengths)
      : 0;

    // Shannon entropy of diagonal line lengths
    const entropy = this.shannonEntropy(diagonalLengths.filter(l => l >= 2));

    // Laminarity: proportion in vertical lines (length >= 2)
    const verticalPointsInLines = verticalLengths
      .filter(l => l >= 2)
      .reduce((sum, l) => sum + l, 0);
    const laminarity = recurrenceCount > 0
      ? verticalPointsInLines / (recurrenceCount / 2)
      : 0;

    // Trapping time: average vertical line length
    const verticalLinesGe2 = verticalLengths.filter(l => l >= 2);
    const trappingTime = verticalLinesGe2.length > 0
      ? verticalLinesGe2.reduce((a, b) => a + b, 0) / verticalLinesGe2.length
      : 0;

    return {
      recurrenceRate: Math.min(1, Math.max(0, recurrenceRate)),
      determinism: Math.min(1, Math.max(0, determinism)),
      laminarity: Math.min(1, Math.max(0, laminarity)),
      maxDiagonalLength,
      entropy: Math.max(0, entropy),
      trappingTime: Math.max(0, trappingTime),
    };
  }

  /**
   * Extract diagonal line lengths from recurrence plot
   * (above main diagonal only to avoid double-counting)
   */
  private extractDiagonalLines(plot: boolean[][], n: number): number[] {
    const lengths: number[] = [];

    // Scan all diagonals above main diagonal
    for (let offset = 1; offset < n; offset++) {
      let currentLength = 0;

      for (let i = 0; i + offset < n; i++) {
        if (plot[i][i + offset]) {
          currentLength++;
        } else {
          if (currentLength > 0) {
            lengths.push(currentLength);
            currentLength = 0;
          }
        }
      }

      if (currentLength > 0) {
        lengths.push(currentLength);
      }
    }

    return lengths;
  }

  /**
   * Extract vertical line lengths from recurrence plot
   */
  private extractVerticalLines(plot: boolean[][], n: number): number[] {
    const lengths: number[] = [];

    for (let j = 0; j < n; j++) {
      let currentLength = 0;

      for (let i = 0; i < n; i++) {
        if (i !== j && plot[i][j]) {
          currentLength++;
        } else {
          if (currentLength > 0) {
            lengths.push(currentLength);
            currentLength = 0;
          }
        }
      }

      if (currentLength > 0) {
        lengths.push(currentLength);
      }
    }

    return lengths;
  }

  /**
   * Shannon entropy of line length distribution
   */
  private shannonEntropy(lengths: number[]): number {
    if (lengths.length === 0) return 0;

    const total = lengths.length;
    const counts = new Map<number, number>();

    for (const l of lengths) {
      counts.set(l, (counts.get(l) || 0) + 1);
    }

    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

/**
 * Create RQA metrics logger
 */
export function createRQAMetricsLogger(
  config?: Partial<IRQAConfig>
): RQAMetricsLogger {
  return new RQAMetricsLogger(config);
}

/**
 * Singleton instance (disabled by default)
 */
export const rqaMetricsLogger = createRQAMetricsLogger();
