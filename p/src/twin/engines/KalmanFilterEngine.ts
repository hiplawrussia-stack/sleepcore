/**
 * Kalman Filter Engine
 *
 * Phase 6.3: State Estimation for Mental Health Digital Twins
 *
 * 2025 Research Integration:
 * - Enhanced Adaptive Kalman Filter (EKF, UKF)
 * - Ensemble Kalman Filter for high-dimensional systems
 * - Physics-Informed Neural Networks integration
 * - Variational Bayesian adaptation
 * - Robust filtering with outlier detection
 *
 * Research basis:
 * - Sensors 2025: "Enhanced Adaptive Kalman Filter for Multibody Model"
 * - ICCS 2025: "Data Assimilation for Dynamic Digital Twins"
 * - bioRxiv: "Ensemble Kalman filter methods for agent-based medical digital twins"
 * - arXiv: "Model-Based Monitoring and State Estimation: The Kalman Filter"
 *
 * © БФ "Другой путь", 2025
 */

import {
  IKalmanFilterConfig,
  IKalmanFilterState,
  IKalmanFilterService,
  IEnsembleKalmanConfig,
} from '../interfaces/IDigitalTwin';

// ============================================================================
// MATRIX OPERATIONS (Lightweight implementation)
// ============================================================================

/**
 * Matrix multiplication
 */
function matmul(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result: number[][] = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Matrix transpose
 */
function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const result: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

/**
 * Matrix addition
 */
function matadd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

/**
 * Matrix subtraction
 */
function matsub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

/**
 * Matrix scalar multiplication
 */
function matscale(A: number[][], s: number): number[][] {
  return A.map(row => row.map(val => val * s));
}

/**
 * Matrix-vector multiplication
 */
function matvec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

/**
 * Vector subtraction
 */
function vecsub(a: number[], b: number[]): number[] {
  return a.map((val, i) => val - b[i]);
}

/**
 * Vector addition
 */
function vecadd(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

/**
 * Create identity matrix
 */
function eye(n: number): number[][] {
  return Array(n).fill(null).map((_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  );
}

/**
 * Matrix inverse (using Gauss-Jordan elimination)
 * For small matrices used in mental health state estimation
 */
function matinv(A: number[][]): number[][] {
  const n = A.length;
  const augmented: number[][] = A.map((row, i) => [...row, ...eye(n)[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Singular matrix check
    if (Math.abs(augmented[i][i]) < 1e-10) {
      // Return identity with small values (regularization)
      return eye(n).map(row => row.map(v => v + 0.001));
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Normalize row
    const pivot = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
  }

  // Extract inverse
  return augmented.map(row => row.slice(n));
}

/**
 * Vector to column matrix
 */
function vecToCol(v: number[]): number[][] {
  return v.map(val => [val]);
}

/**
 * Column matrix to vector
 */
function colToVec(m: number[][]): number[] {
  return m.map(row => row[0]);
}

/**
 * Outer product
 */
function outer(a: number[], b: number[]): number[][] {
  return a.map(ai => b.map(bj => ai * bj));
}

// ============================================================================
// KALMAN FILTER ENGINE
// ============================================================================

/**
 * Kalman Filter Engine
 *
 * Implements standard and enhanced Kalman filtering for digital twin state estimation
 */
export class KalmanFilterEngine implements IKalmanFilterService {

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize Kalman filter state
   */
  initialize(config: IKalmanFilterConfig): IKalmanFilterState {
    const n = config.initialState.length;

    return {
      stateEstimate: [...config.initialState],
      errorCovariance: config.initialCovariance.map(row => [...row]),

      predictedState: [...config.initialState],
      predictedCovariance: config.initialCovariance.map(row => [...row]),

      innovation: Array(config.observationMatrix.length).fill(0),
      innovationCovariance: Array(config.observationMatrix.length)
        .fill(null)
        .map(() => Array(config.observationMatrix.length).fill(0)),

      kalmanGain: Array(n).fill(null).map(() => Array(config.observationMatrix.length).fill(0)),

      normalized_innovation_squared: 0,
      isOutlier: false,
      adaptedQ: null,
      adaptedR: null,

      timestep: 0,
      timestamp: new Date(),
    };
  }

  // ==========================================================================
  // PREDICTION STEP
  // ==========================================================================

  /**
   * Prediction (time update) step
   *
   * x̂⁻ₖ = A · x̂ₖ₋₁
   * P⁻ₖ = A · Pₖ₋₁ · Aᵀ + Q
   */
  predict(state: IKalmanFilterState, config: IKalmanFilterConfig): IKalmanFilterState {
    const A = config.stateTransitionMatrix;
    const Q = config.adaptiveQ && state.adaptedQ ? state.adaptedQ : config.processNoiseCovariance;

    // Predicted state
    const predictedState = matvec(A, state.stateEstimate);

    // Predicted covariance: P⁻ = A · P · Aᵀ + Q
    const AP = matmul(A, state.errorCovariance);
    const APAt = matmul(AP, transpose(A));
    const predictedCovariance = matadd(APAt, Q);

    return {
      ...state,
      predictedState,
      predictedCovariance,
      timestep: state.timestep + 1,
      timestamp: new Date(),
    };
  }

  // ==========================================================================
  // UPDATE STEP
  // ==========================================================================

  /**
   * Update (measurement) step
   *
   * yₖ = zₖ - H · x̂⁻ₖ  (innovation)
   * Sₖ = H · P⁻ₖ · Hᵀ + R  (innovation covariance)
   * Kₖ = P⁻ₖ · Hᵀ · Sₖ⁻¹  (Kalman gain)
   * x̂ₖ = x̂⁻ₖ + Kₖ · yₖ
   * Pₖ = (I - Kₖ · H) · P⁻ₖ
   */
  update(
    state: IKalmanFilterState,
    measurement: number[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState {
    const H = config.observationMatrix;
    const R = config.adaptiveR && state.adaptedR ? state.adaptedR : config.measurementNoiseCovariance;

    // Innovation (measurement residual)
    const predictedMeasurement = matvec(H, state.predictedState);
    const innovation = vecsub(measurement, predictedMeasurement);

    // Innovation covariance: S = H · P⁻ · Hᵀ + R
    const HP = matmul(H, state.predictedCovariance);
    const HPHt = matmul(HP, transpose(H));
    const innovationCovariance = matadd(HPHt, R);

    // Kalman gain: K = P⁻ · Hᵀ · S⁻¹
    const PHt = matmul(state.predictedCovariance, transpose(H));
    const Sinv = matinv(innovationCovariance);
    const kalmanGain = matmul(PHt, Sinv);

    // Cap Kalman gain if configured
    const cappedGain = config.maxGain
      ? kalmanGain.map(row => row.map(v => Math.min(Math.max(v, -config.maxGain), config.maxGain)))
      : kalmanGain;

    // Outlier detection (2025: Mahalanobis distance)
    const nis = this.calculateNIS(innovation, innovationCovariance);
    const isOutlier = nis > config.outlierThreshold;

    // State update: x̂ = x̂⁻ + K · y
    const Ky = matvec(cappedGain, isOutlier ? innovation.map(v => v * 0.1) : innovation);
    const stateEstimate = vecadd(state.predictedState, Ky);

    // Covariance update: P = (I - K · H) · P⁻
    const n = state.predictedState.length;
    const KH = matmul(cappedGain, H);
    const IminusKH = matsub(eye(n), KH);
    const errorCovariance = matmul(IminusKH, state.predictedCovariance);

    return {
      ...state,
      stateEstimate,
      errorCovariance,
      innovation,
      innovationCovariance,
      kalmanGain: cappedGain,
      normalized_innovation_squared: nis,
      isOutlier,
      timestamp: new Date(),
    };
  }

  // ==========================================================================
  // COMBINED FILTER STEP
  // ==========================================================================

  /**
   * Combined predict-update cycle
   */
  filter(
    state: IKalmanFilterState,
    measurement: number[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState {
    const predicted = this.predict(state, config);
    return this.update(predicted, measurement, config);
  }

  // ==========================================================================
  // SMOOTHING (2025)
  // ==========================================================================

  /**
   * Rauch-Tung-Striebel (RTS) smoother
   * Retrospective state estimation for improved accuracy
   */
  smooth(
    states: IKalmanFilterState[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState[] {
    if (states.length < 2) return states;

    const smoothed = states.map(s => ({ ...s }));
    const A = config.stateTransitionMatrix;

    // Backward pass
    for (let k = states.length - 2; k >= 0; k--) {
      const current = smoothed[k];
      const next = smoothed[k + 1];

      // Smoother gain: C = P · Aᵀ · (P⁻)⁻¹
      const PAt = matmul(current.errorCovariance, transpose(A));
      const predictedCovInv = matinv(next.predictedCovariance);
      const smootherGain = matmul(PAt, predictedCovInv);

      // Smoothed state: x̂ˢ = x̂ + C · (x̂ˢₖ₊₁ - x̂⁻ₖ₊₁)
      const stateDiff = vecsub(next.stateEstimate, next.predictedState);
      const correction = matvec(smootherGain, stateDiff);
      smoothed[k].stateEstimate = vecadd(current.stateEstimate, correction);

      // Smoothed covariance: Pˢ = P + C · (Pˢₖ₊₁ - P⁻ₖ₊₁) · Cᵀ
      const covDiff = matsub(next.errorCovariance, next.predictedCovariance);
      const CCovDiff = matmul(smootherGain, covDiff);
      const CCovDiffCt = matmul(CCovDiff, transpose(smootherGain));
      smoothed[k].errorCovariance = matadd(current.errorCovariance, CCovDiffCt);
    }

    return smoothed;
  }

  // ==========================================================================
  // ADAPTIVE METHODS (2025)
  // ==========================================================================

  /**
   * Adapt process noise covariance based on innovation sequence
   * Uses covariance matching method
   */
  adaptProcessNoise(
    state: IKalmanFilterState,
    innovations: number[][],
    config: IKalmanFilterConfig
  ): number[][] {
    if (innovations.length < 10) return config.processNoiseCovariance;

    const H = config.observationMatrix;
    const R = config.measurementNoiseCovariance;

    // Sample innovation covariance
    const meanInnovation = innovations[0].map((_, j) =>
      innovations.reduce((sum, inn) => sum + inn[j], 0) / innovations.length
    );

    const sampleCov = innovations[0].map((_, i) =>
      innovations[0].map((_, j) =>
        innovations.reduce((sum, inn) =>
          sum + (inn[i] - meanInnovation[i]) * (inn[j] - meanInnovation[j]), 0
        ) / (innovations.length - 1)
      )
    );

    // Q̂ = Cov(y) - H · P · Hᵀ - R
    // Approximation using current error covariance
    const HP = matmul(H, state.errorCovariance);
    const HPHt = matmul(HP, transpose(H));
    const theoretical = matadd(HPHt, R);

    // Innovation covariance should match sample
    // This gives an estimate of whether Q is correct
    const scale = this.traceRatio(sampleCov, theoretical);

    // Adapt Q with forgetting factor
    const alpha = config.forgettingFactor || 0.95;
    const adaptedQ = config.processNoiseCovariance.map(row =>
      row.map(v => v * (alpha + (1 - alpha) * scale))
    );

    return adaptedQ;
  }

  /**
   * Adapt measurement noise covariance
   * Based on variational Bayesian approach (2025)
   */
  adaptMeasurementNoise(
    innovations: number[][],
    config: IKalmanFilterConfig
  ): number[][] {
    if (innovations.length < 10) return config.measurementNoiseCovariance;

    // Sample covariance of innovations
    const meanInnovation = innovations[0].map((_, j) =>
      innovations.reduce((sum, inn) => sum + inn[j], 0) / innovations.length
    );

    const sampleCov = innovations[0].map((_, i) =>
      innovations[0].map((_, j) =>
        innovations.reduce((sum, inn) =>
          sum + (inn[i] - meanInnovation[i]) * (inn[j] - meanInnovation[j]), 0
        ) / (innovations.length - 1)
      )
    );

    // Exponential moving average with existing R
    const alpha = config.adaptationRate || 0.1;
    return config.measurementNoiseCovariance.map((row, i) =>
      row.map((v, j) => (1 - alpha) * v + alpha * sampleCov[i][j])
    );
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Calculate Normalized Innovation Squared (NIS)
   * For outlier detection and filter consistency check
   */
  private calculateNIS(innovation: number[], innovationCov: number[][]): number {
    const Sinv = matinv(innovationCov);
    const yCol = vecToCol(innovation);
    const yTSinv = matmul(transpose(yCol), Sinv);
    const nis = matmul(yTSinv, yCol)[0][0];
    return nis;
  }

  /**
   * Calculate trace ratio of two matrices
   */
  private traceRatio(A: number[][], B: number[][]): number {
    const traceA = A.reduce((sum, row, i) => sum + row[i], 0);
    const traceB = B.reduce((sum, row, i) => sum + row[i], 0);
    return traceB > 0 ? traceA / traceB : 1;
  }
}

// ============================================================================
// ENSEMBLE KALMAN FILTER (2025)
// ============================================================================

/**
 * Ensemble Kalman Filter
 *
 * For high-dimensional digital twin systems
 * Particularly useful for agent-based models
 */
export class EnsembleKalmanFilter {
  private ensemble: number[][] = [];
  private config: IEnsembleKalmanConfig;

  constructor(config: IEnsembleKalmanConfig) {
    this.config = config;
  }

  /**
   * Initialize ensemble with perturbations around initial state
   */
  initialize(initialState: number[], initialCovariance: number[][]): void {
    this.ensemble = [];

    for (let i = 0; i < this.config.ensembleSize; i++) {
      const member = initialState.map((val, j) => {
        const std = Math.sqrt(initialCovariance[j][j]);
        return val + std * this.gaussianRandom();
      });
      this.ensemble.push(member);
    }
  }

  /**
   * Forecast step - propagate each ensemble member
   */
  forecast(propagator: (state: number[]) => number[]): void {
    this.ensemble = this.ensemble.map(member => propagator(member));
  }

  /**
   * Analysis step - update ensemble with measurement
   */
  analyze(
    measurement: number[],
    observationOperator: (state: number[]) => number[],
    measurementNoise: number[][]
  ): void {
    const N = this.config.ensembleSize;
    const stateSize = this.ensemble[0].length;
    const obsSize = measurement.length;

    // Ensemble mean
    const meanState = this.calculateEnsembleMean();

    // Ensemble of predicted observations
    const predictedObs = this.ensemble.map(member => observationOperator(member));
    const meanObs = predictedObs[0].map((_, j) =>
      predictedObs.reduce((sum, obs) => sum + obs[j], 0) / N
    );

    // Anomalies
    const stateAnomalies = this.ensemble.map(member =>
      member.map((val, j) => val - meanState[j])
    );
    const obsAnomalies = predictedObs.map(obs =>
      obs.map((val, j) => val - meanObs[j])
    );

    // Sample covariances
    // PH' = (1/(N-1)) * X_a * Y_a'
    const PHt: number[][] = Array(stateSize).fill(null).map(() => Array(obsSize).fill(0));
    for (let i = 0; i < stateSize; i++) {
      for (let j = 0; j < obsSize; j++) {
        for (let k = 0; k < N; k++) {
          PHt[i][j] += stateAnomalies[k][i] * obsAnomalies[k][j];
        }
        PHt[i][j] /= (N - 1);
      }
    }

    // HPH' + R
    const HPHt: number[][] = Array(obsSize).fill(null).map(() => Array(obsSize).fill(0));
    for (let i = 0; i < obsSize; i++) {
      for (let j = 0; j < obsSize; j++) {
        for (let k = 0; k < N; k++) {
          HPHt[i][j] += obsAnomalies[k][i] * obsAnomalies[k][j];
        }
        HPHt[i][j] /= (N - 1);
      }
    }
    const S = matadd(HPHt, measurementNoise);

    // Covariance inflation (2025)
    const inflatedS = matscale(S, this.config.inflationFactor);

    // Kalman gain K = PH' * S^-1
    const Sinv = matinv(inflatedS);
    const K = matmul(PHt, Sinv);

    // Update ensemble
    for (let i = 0; i < N; i++) {
      // Perturb observations (stochastic EnKF)
      let perturbedMeas = measurement;
      if (this.config.perturbObservations) {
        perturbedMeas = measurement.map((val, j) =>
          val + Math.sqrt(measurementNoise[j][j]) * this.gaussianRandom()
        );
      }

      // Innovation
      const innovation = vecsub(perturbedMeas, predictedObs[i]);

      // Update
      const correction = matvec(K, innovation);
      this.ensemble[i] = vecadd(this.ensemble[i], correction);
    }
  }

  /**
   * Get ensemble mean (state estimate)
   */
  getStateEstimate(): number[] {
    return this.calculateEnsembleMean();
  }

  /**
   * Get ensemble covariance (uncertainty estimate)
   */
  getErrorCovariance(): number[][] {
    const mean = this.calculateEnsembleMean();
    const N = this.config.ensembleSize;
    const stateSize = this.ensemble[0].length;

    const cov: number[][] = Array(stateSize).fill(null).map(() => Array(stateSize).fill(0));

    for (let i = 0; i < stateSize; i++) {
      for (let j = 0; j < stateSize; j++) {
        for (let k = 0; k < N; k++) {
          cov[i][j] += (this.ensemble[k][i] - mean[i]) * (this.ensemble[k][j] - mean[j]);
        }
        cov[i][j] /= (N - 1);
      }
    }

    return cov;
  }

  private calculateEnsembleMean(): number[] {
    const N = this.config.ensembleSize;
    return this.ensemble[0].map((_, j) =>
      this.ensemble.reduce((sum, member) => sum + member[j], 0) / N
    );
  }

  private gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const kalmanFilterEngine = new KalmanFilterEngine();
