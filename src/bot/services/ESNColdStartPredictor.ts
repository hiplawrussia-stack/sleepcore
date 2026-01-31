/**
 * ESN Cold-Start Predictor
 * ========================
 * Echo State Network (reservoir computing) for sleep prediction
 * during the cold-start period (3-6 days of data).
 *
 * Scientific Foundation:
 * - Jaeger 2001: Echo State Networks — reservoir computing framework
 * - Lukosevicius 2009: Practical ESN guide, spectral radius < 1
 * - Ridge regression: O(n) training without BPTT
 *
 * IMPORTANT: No published ESN-sleep studies exist (evidence gap).
 * This is an exploratory model used ONLY as a fallback when PLRNN
 * requires more data. Predictions carry wide confidence intervals.
 *
 * Safety:
 * - SE predictions clamped to [40%, 100%]
 * - CI minimum +/-15 percentage points
 * - source='esn_cold_start' flag always set
 * - No early warnings generated (insufficient data)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepHistoryEntry } from './SleepPredictionService';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * ESN configuration for cold-start prediction
 */
export interface IESNConfig {
  /** Reservoir size (number of neurons) */
  readonly reservoirSize: number;
  /** Spectral radius of reservoir weight matrix (must be < 1 for ESP) */
  readonly spectralRadius: number;
  /** Input scaling factor */
  readonly inputScaling: number;
  /** Leak rate for leaky integrator neurons */
  readonly leakRate: number;
  /** Ridge regression regularization parameter */
  readonly ridgeAlpha: number;
  /** State dimension (must match PLRNN 5D) */
  readonly stateDim: number;
  /** Random seed for reproducible reservoir */
  readonly seed: number;
}

/**
 * Default ESN configuration
 * Small reservoir suitable for cold-start (3-6 data points)
 */
export const DEFAULT_ESN_CONFIG: IESNConfig = {
  reservoirSize: 50,
  spectralRadius: 0.9,
  inputScaling: 0.5,
  leakRate: 0.3,
  ridgeAlpha: 1e-4,
  stateDim: 5,      // SE, SOL, WASO, TST, Quality
  seed: 42,
};

/**
 * ESN cold-start prediction result
 */
export interface IESNColdStartPrediction {
  /** Predicted sleep efficiency trajectory */
  readonly trajectory: Array<{
    readonly day: number;
    readonly predictedSE: number;
    readonly lower95: number;
    readonly upper95: number;
  }>;
  /** Final predicted SE */
  readonly predictedSE: number;
  /** Confidence (0-1), scales with data length */
  readonly confidence: number;
  /** Predicted metrics (denormalized) */
  readonly predictedMetrics: {
    readonly sleepOnsetLatency: number;
    readonly wakeAfterSleepOnset: number;
    readonly totalSleepTime: number;
    readonly sleepQuality: number;
  };
  /** Number of training days used */
  readonly trainingDays: number;
  /** Always true for ESN predictions */
  readonly isESN: true;
}

// ============================================================================
// SEEDED PRNG (Mulberry32)
// ============================================================================

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Ensures reproducible reservoir initialization
 */
function createSeededRNG(seed: number): () => number {
  let state = seed | 0;
  return (): number => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// ESN COLD-START PREDICTOR
// ============================================================================

/**
 * Echo State Network for cold-start sleep prediction
 *
 * Uses reservoir computing to make preliminary predictions
 * with only 3-6 days of sleep diary data. Falls back to this
 * when PLRNN requires 7+ days.
 *
 * Architecture:
 * - Input: 5D normalized sleep vector (SE, SOL, WASO, TST, Quality)
 * - Reservoir: 50 leaky-integrator neurons
 * - Output: Ridge regression (W_out = YX^T(XX^T + alphaI)^-1)
 * - Prediction: Forward-run reservoir with last state
 */
export class ESNColdStartPredictor {
  private config: IESNConfig;
  private rng: () => number;

  /** Input weight matrix [reservoirSize x stateDim] */
  private W_in: number[][];
  /** Reservoir weight matrix [reservoirSize x reservoirSize] */
  private W_res: number[][];
  /** Output weight matrix [stateDim x reservoirSize] — trained via ridge regression */
  private W_out: number[][] | null = null;
  /** Last reservoir state after training */
  private lastState: number[] | null = null;
  /** Whether the model has been trained */
  private trained = false;

  // Normalization constants (match SleepPredictionService)
  private static readonly MAX_SE = 100;
  private static readonly MAX_SOL = 120;
  private static readonly MAX_WASO = 180;
  private static readonly MAX_TST = 12; // hours

  // Safety bounds
  private static readonly MIN_PREDICTED_SE = 40;
  private static readonly MAX_PREDICTED_SE = 100;
  private static readonly MIN_CI_HALF_WIDTH = 15; // percentage points

  constructor(config: Partial<IESNConfig> = {}) {
    this.config = { ...DEFAULT_ESN_CONFIG, ...config };
    this.rng = createSeededRNG(this.config.seed);
    this.W_in = this.initInputWeights();
    this.W_res = this.initReservoirWeights();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize input weight matrix W_in
   * Uniform random in [-inputScaling, +inputScaling]
   */
  private initInputWeights(): number[][] {
    const { reservoirSize, stateDim, inputScaling } = this.config;
    const W: number[][] = [];

    for (let i = 0; i < reservoirSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < stateDim; j++) {
        row.push((this.rng() * 2 - 1) * inputScaling);
      }
      W.push(row);
    }

    return W;
  }

  /**
   * Initialize reservoir weight matrix W_res and scale to spectral radius
   * Sparse random matrix scaled so max eigenvalue ≈ spectralRadius
   */
  private initReservoirWeights(): number[][] {
    const { reservoirSize, spectralRadius } = this.config;
    const W: number[][] = [];

    // Generate sparse random matrix (density ~20%)
    for (let i = 0; i < reservoirSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < reservoirSize; j++) {
        if (this.rng() < 0.2) {
          row.push(this.rng() * 2 - 1);
        } else {
          row.push(0);
        }
      }
      W.push(row);
    }

    // Estimate spectral radius via power iteration
    const currentRadius = this.estimateSpectralRadius(W);

    // Scale to desired spectral radius
    if (currentRadius > 0) {
      const scale = spectralRadius / currentRadius;
      for (let i = 0; i < reservoirSize; i++) {
        for (let j = 0; j < reservoirSize; j++) {
          W[i][j] *= scale;
        }
      }
    }

    return W;
  }

  /**
   * Estimate spectral radius via power iteration (20 iterations)
   */
  private estimateSpectralRadius(W: number[][]): number {
    const n = W.length;
    let v = Array.from({ length: n }, () => this.rng());

    for (let iter = 0; iter < 20; iter++) {
      // Matrix-vector multiply
      const Wv: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Wv[i] += W[i][j] * v[j];
        }
      }

      // Compute norm
      let norm = 0;
      for (let i = 0; i < n; i++) {
        norm += Wv[i] * Wv[i];
      }
      norm = Math.sqrt(norm);

      if (norm === 0) return 0;

      // Normalize
      v = Wv.map(x => x / norm);
    }

    // Final eigenvalue estimate
    const Wv: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Wv[i] += W[i][j] * v[j];
      }
    }

    let eigenvalue = 0;
    for (let i = 0; i < n; i++) {
      eigenvalue += Wv[i] * v[i];
    }

    return Math.abs(eigenvalue);
  }

  // ==========================================================================
  // RESERVOIR DYNAMICS
  // ==========================================================================

  /**
   * Single reservoir step with leaky integrator
   * x(t) = (1 - leak) * x(t-1) + leak * tanh(W_in * u + W_res * x(t-1))
   */
  private reservoirStep(input: number[], prevState: number[]): number[] {
    const { reservoirSize, leakRate } = this.config;
    const newState: number[] = new Array(reservoirSize);

    for (let i = 0; i < reservoirSize; i++) {
      // W_in * u
      let activation = 0;
      for (let j = 0; j < input.length; j++) {
        activation += this.W_in[i][j] * input[j];
      }

      // W_res * x(t-1)
      for (let j = 0; j < reservoirSize; j++) {
        activation += this.W_res[i][j] * prevState[j];
      }

      // Leaky integrator
      newState[i] = (1 - leakRate) * prevState[i] + leakRate * Math.tanh(activation);
    }

    return newState;
  }

  // ==========================================================================
  // TRAINING
  // ==========================================================================

  /**
   * Normalize sleep history entry to [0, 1] vector
   */
  private normalizeEntry(entry: ISleepHistoryEntry): number[] {
    return [
      entry.metrics.sleepEfficiency / ESNColdStartPredictor.MAX_SE,
      Math.min(entry.metrics.sleepOnsetLatency / ESNColdStartPredictor.MAX_SOL, 1),
      Math.min(entry.metrics.wakeAfterSleepOnset / ESNColdStartPredictor.MAX_WASO, 1),
      Math.min((entry.metrics.totalSleepTime / 60) / ESNColdStartPredictor.MAX_TST, 1),
      entry.subjectiveQuality,
    ];
  }

  /**
   * Train ESN on sleep history using ridge regression
   *
   * Collects reservoir states for each input, then computes:
   * W_out = Y * X^T * (X * X^T + alpha * I)^-1
   *
   * @param history Sleep diary entries (3-6 days)
   */
  train(history: ISleepHistoryEntry[]): void {
    if (history.length < 3) {
      throw new Error('ESN requires at least 3 data points for training');
    }

    const { reservoirSize, stateDim, ridgeAlpha } = this.config;

    // Normalize inputs
    const inputs = history.map(e => this.normalizeEntry(e));

    // Collect reservoir states (drive reservoir with inputs)
    const states: number[][] = [];
    let currentState = new Array(reservoirSize).fill(0);

    for (const input of inputs) {
      currentState = this.reservoirStep(input, currentState);
      states.push([...currentState]);
    }

    this.lastState = [...currentState];

    // We predict next step from current state
    // X = states[0..n-2], Y = inputs[1..n-1]
    const n = states.length - 1;
    if (n < 1) {
      this.trained = false;
      return;
    }

    const X = states.slice(0, n);   // [n x reservoirSize]
    const Y = inputs.slice(1, n + 1); // [n x stateDim]

    // Ridge regression: W_out = Y^T * X * (X^T * X + alpha * I)^-1
    // Compute X^T * X [reservoirSize x reservoirSize]
    const XtX: number[][] = [];
    for (let i = 0; i < reservoirSize; i++) {
      const row: number[] = new Array(reservoirSize).fill(0);
      for (let k = 0; k < n; k++) {
        for (let j = 0; j < reservoirSize; j++) {
          row[j] += X[k][i] * X[k][j];
        }
      }
      // Add ridge regularization
      row[i] += ridgeAlpha;
      XtX.push(row);
    }

    // Compute X^T * Y [reservoirSize x stateDim]
    const XtY: number[][] = [];
    for (let i = 0; i < reservoirSize; i++) {
      const row: number[] = new Array(stateDim).fill(0);
      for (let k = 0; k < n; k++) {
        for (let j = 0; j < stateDim; j++) {
          row[j] += X[k][i] * Y[k][j];
        }
      }
      XtY.push(row);
    }

    // Solve (X^T * X + alpha*I) * W_out^T = X^T * Y using Gauss elimination
    const W_outT = this.solveLinearSystem(XtX, XtY);

    // Transpose to get W_out [stateDim x reservoirSize]
    this.W_out = [];
    for (let j = 0; j < stateDim; j++) {
      const row: number[] = [];
      for (let i = 0; i < reservoirSize; i++) {
        row.push(W_outT[i][j]);
      }
      this.W_out.push(row);
    }

    this.trained = true;
  }

  /**
   * Solve A * X = B via Gaussian elimination with partial pivoting
   * A: [n x n], B: [n x m] => X: [n x m]
   */
  private solveLinearSystem(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;

    // Augmented matrix [A | B]
    const aug: number[][] = A.map((row, i) => [...row, ...B[i]]);

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxVal = Math.abs(aug[col][col]);
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }

      // Swap rows
      if (maxRow !== col) {
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      }

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) continue; // Skip near-zero pivot

      // Eliminate below
      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / pivot;
        for (let j = col; j < n + m; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    // Back substitution
    const X: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));

    for (let col = n - 1; col >= 0; col--) {
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) continue;

      for (let j = 0; j < m; j++) {
        let sum = aug[col][n + j];
        for (let k = col + 1; k < n; k++) {
          sum -= aug[col][k] * X[k][j];
        }
        X[col][j] = sum / pivot;
      }
    }

    return X;
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  /**
   * Generate predictions for the given horizon
   *
   * @param horizon Number of days to predict ahead
   * @returns Cold-start prediction with wide confidence intervals
   */
  predict(horizon: number = 3): IESNColdStartPrediction {
    if (!this.trained || !this.W_out || !this.lastState) {
      throw new Error('ESN must be trained before prediction');
    }

    const { stateDim, reservoirSize } = this.config;
    const trajectory: IESNColdStartPrediction['trajectory'] = [];
    let currentState = [...this.lastState];
    let lastOutput: number[] | null = null;

    for (let day = 1; day <= horizon; day++) {
      // Compute output: y = W_out * x
      const output: number[] = new Array(stateDim).fill(0);
      for (let i = 0; i < stateDim; i++) {
        for (let j = 0; j < reservoirSize; j++) {
          output[i] += this.W_out[i][j] * currentState[j];
        }
        // Clamp to [0, 1]
        output[i] = Math.max(0, Math.min(1, output[i]));
      }

      // Denormalize SE
      let predictedSE = output[0] * ESNColdStartPredictor.MAX_SE;

      // Safety: clamp SE to [40%, 100%]
      predictedSE = Math.max(
        ESNColdStartPredictor.MIN_PREDICTED_SE,
        Math.min(ESNColdStartPredictor.MAX_PREDICTED_SE, predictedSE)
      );

      // CI widens with horizon, minimum +/-15pp
      const baseCIHalfWidth = ESNColdStartPredictor.MIN_CI_HALF_WIDTH;
      const horizonPenalty = (day - 1) * 3; // +3pp per day
      const ciHalfWidth = baseCIHalfWidth + horizonPenalty;

      trajectory.push({
        day,
        predictedSE: Math.round(predictedSE),
        lower95: Math.max(0, Math.round(predictedSE - ciHalfWidth)),
        upper95: Math.min(100, Math.round(predictedSE + ciHalfWidth)),
      });

      lastOutput = output;

      // Drive reservoir with predicted output for next step
      currentState = this.reservoirStep(output, currentState);
    }

    const finalSE = trajectory[trajectory.length - 1]?.predictedSE ?? 0;
    const finalOutput = lastOutput ?? new Array(stateDim).fill(0.5);

    return {
      trajectory,
      predictedSE: finalSE,
      confidence: this.getConfidence(0), // Will be set by caller with actual history length
      predictedMetrics: {
        sleepOnsetLatency: Math.round(finalOutput[1] * ESNColdStartPredictor.MAX_SOL),
        wakeAfterSleepOnset: Math.round(finalOutput[2] * ESNColdStartPredictor.MAX_WASO),
        totalSleepTime: Math.round(finalOutput[3] * ESNColdStartPredictor.MAX_TST * 60),
        sleepQuality: Math.max(0, Math.min(1, finalOutput[4])),
      },
      trainingDays: 0, // Set by caller
      isESN: true,
    };
  }

  /**
   * Get confidence score based on history length
   * Linearly scales: 3 days -> 0.25, 4 -> 0.35, 5 -> 0.45, 6 -> 0.55
   *
   * @param historyLength Number of diary entries available
   */
  getConfidence(historyLength: number): number {
    if (historyLength < 3) return 0.1;
    if (historyLength >= 7) return 0.65;

    // Linear interpolation: 3->0.25, 6->0.55
    return 0.25 + (historyLength - 3) * 0.1;
  }

  /**
   * Check if model has been trained
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Get the current spectral radius of the reservoir
   * (for verification in tests)
   */
  getActualSpectralRadius(): number {
    return this.estimateSpectralRadius(this.W_res);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an ESN cold-start predictor
 */
export function createESNColdStartPredictor(
  config?: Partial<IESNConfig>
): ESNColdStartPredictor {
  return new ESNColdStartPredictor(config);
}
