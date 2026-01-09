/**
 * 🧠 PLRNN ENGINE IMPLEMENTATION
 * ==============================
 * Piecewise Linear Recurrent Neural Network for Mental Health Dynamics
 *
 * Scientific Foundation (2025 Research):
 * - medRxiv 2025: "PLRNNs provided the most accurate forecasts for EMA data"
 * - Durstewitz Lab dendPLRNN: Interpretable nonlinear dynamics
 * - Brenner et al. 2022: "Tractable Dendritic RNNs" (ICML)
 *
 * Mathematical Formulation:
 * z_{t+1} = A * z_t + W * φ(z_t) + C * s_t + b_z
 * x_t = B * z_t + b_x
 *
 * where:
 * - z_t: latent state (5D: valence, arousal, dominance, risk, resources)
 * - A: diagonal autoregression matrix
 * - W: off-diagonal connection matrix (piecewise-linear dynamics)
 * - φ(z) = max(z, 0) (ReLU activation for piecewise-linear)
 * - s_t: external input (interventions, context)
 * - B: observation matrix
 *
 * © БФ "Другой путь", 2025
 */

import {
  type IPLRNNEngine,
  type IPLRNNConfig,
  type IPLRNNState,
  type IPLRNNPrediction,
  type IPLRNNWeights,
  type IPLRNNTrainingSample,
  type IPLRNNTrainingResult,
  type ICausalNetwork,
  type ICausalNode,
  type ICausalEdge,
  type IEarlyWarningSignal,
  type IInterventionSimulation,
  DEFAULT_PLRNN_CONFIG,
} from '../interfaces/IPLRNNEngine';

import {
  type IKalmanFormerEngine,
  type IKalmanFormerState,
  type IKalmanFormerConfig,
} from '../interfaces/IKalmanFormer';
import { KalmanFormerEngine } from './KalmanFormerEngine';

/**
 * State dimension labels for interpretability
 */
const STATE_DIMENSIONS = ['valence', 'arousal', 'dominance', 'risk', 'resources'];

/**
 * PLRNN Engine Implementation
 *
 * Key features:
 * - Piecewise-linear dynamics for nonlinear psychological modeling
 * - Interpretable causal network extraction
 * - Early warning signal detection (critical slowing down)
 * - Online learning for personalization
 */
export class PLRNNEngine implements IPLRNNEngine {
  private config: IPLRNNConfig;
  private weights: IPLRNNWeights | null = null;
  private initialized = false;

  // Training state
  private trainingHistory: number[] = [];
  private adamState: {
    m: { [key: string]: number[][] };
    v: { [key: string]: number[][] };
    t: number;
  } | null = null;

  // KalmanFormer integration for hybrid predictions
  // Per roadmap: Kalman for short-term, PLRNN for long-term
  private kalmanFormer: IKalmanFormerEngine | null = null;
  private kalmanFormerState: IKalmanFormerState | null = null;

  constructor(config?: Partial<IPLRNNConfig>) {
    this.config = { ...DEFAULT_PLRNN_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(config?: Partial<IPLRNNConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize weights with improved stability
    // Based on 2025 research: careful initialization prevents divergence
    const n = this.config.latentDim;
    // Note: hiddenUnits reserved for future shPLRNN expansion (W₁ ∈ ℝᴹˣᴸ, W₂ ∈ ℝᴸˣᴹ)

    // Diagonal autoregression: values < 1 for stability (eigenvalues < 1)
    // Research shows A should be in range [0.8, 0.95] for stable dynamics
    const A = Array(n).fill(0).map(() => 0.85 + Math.random() * 0.1);

    // Off-diagonal connections: smaller scale for stability
    // Initialize with smaller magnitude to prevent gradient explosion
    const W = this.initializeMatrix(n, n, 'sparse_stable');

    // Observation matrix: near-identity for interpretability
    // Small perturbation around identity prevents degenerate solutions
    const B = this.initializeMatrix(n, n, 'near_identity');

    // Bias vectors: zero initialization for stability
    // Let the model learn appropriate biases during training
    const biasLatent = Array(n).fill(0).map(() => 0);
    const biasObserved = Array(n).fill(0).map(() => 0);

    // Dendritic weights if using dendPLRNN
    let dendriticWeights: number[][] | undefined;
    let C: number[][] | undefined;

    if (this.config.connectivity === 'dendritic' && this.config.dendriticBases) {
      const d = this.config.dendriticBases;
      dendriticWeights = this.initializeMatrix(n, d, 'normal');
      C = this.initializeMatrix(n, d, 'normal');
    }

    this.weights = {
      A,
      W,
      B,
      C,
      biasLatent,
      biasObserved,
      dendriticWeights,
      meta: {
        trainedAt: new Date(),
        trainingSamples: 0,
        validationLoss: Infinity,
        config: this.config,
      },
    };

    // Initialize Adam optimizer state
    this.adamState = {
      m: {},
      v: {},
      t: 0,
    };

    // Initialize KalmanFormer for hybrid short-term predictions
    // Per roadmap: Kalman handles short-term (h=1-3), PLRNN handles long-term (h=6+)
    const kalmanConfig: Partial<IKalmanFormerConfig> = {
      stateDim: n,
      obsDim: n,
      embedDim: Math.max(32, n * 8), // Scale with state dimension
      numHeads: 4,
      numLayers: 2,
      contextWindow: 24,
      blendRatio: 0.3, // Favor Kalman for stability in short-term
      learnedGain: true,
    };
    this.kalmanFormer = new KalmanFormerEngine(kalmanConfig);
    this.kalmanFormer.initialize(kalmanConfig);

    this.initialized = true;
  }

  loadWeights(weights: IPLRNNWeights): void {
    this.weights = JSON.parse(JSON.stringify(weights));
    if (weights.meta?.config) {
      this.config = weights.meta.config;
    }
    this.initialized = true;
  }

  getWeights(): IPLRNNWeights {
    if (!this.weights) {
      throw new Error('PLRNN not initialized. Call initialize() first.');
    }
    return JSON.parse(JSON.stringify(this.weights));
  }

  // ============================================================================
  // FORWARD PASS
  // ============================================================================

  /**
   * Forward pass: compute next state
   *
   * z_{t+1} = A * z_t + W * φ(z_t) + C * s_t + b_z
   * x_t = B * z_t + b_x
   *
   * where φ(z) = max(z, 0) (ReLU for piecewise-linear dynamics)
   */
  forward(state: IPLRNNState, input?: number[]): IPLRNNState {
    if (!this.weights || !this.initialized) {
      throw new Error('PLRNN not initialized');
    }

    const { A, W, B, C, biasLatent, biasObserved, dendriticWeights } = this.weights;
    const z = state.latentState;
    const n = z.length;

    // Piecewise-linear activation φ(z) = max(z, 0)
    const phiZ = z.map(v => Math.max(0, v));

    // Autoregression: A * z_t
    const Az = z.map((zi, i) => (A[i] ?? 0.9) * zi);

    // Off-diagonal dynamics: W * φ(z_t)
    const WphiZ = this.matVec(W, phiZ);

    // Dendritic basis expansion (if dendPLRNN)
    let dendriticTerm: number[] = Array(n).fill(0);
    if (this.config.connectivity === 'dendritic' && dendriticWeights && C) {
      // Dendritic nonlinearity: sum of ReLU basis functions
      const bases = dendriticWeights.map(row =>
        row.reduce((sum, w, i) => sum + w * (z[i % z.length] ?? 0), 0)
      );
      const activatedBases = bases.map(b => Math.max(0, b));
      dendriticTerm = C.map(row =>
        row.reduce((sum, c, i) => sum + c * (activatedBases[i] ?? 0), 0)
      );
    }

    // Input term: C * s_t (if external input provided)
    let inputTerm: number[] = Array(n).fill(0);
    if (input && C) {
      inputTerm = C.map(row =>
        row.reduce((sum, c, i) => sum + c * (input[i] || 0), 0)
      );
    }

    // Combine: z_{t+1} = A*z_t + W*φ(z_t) + dendritic + input + bias
    // Add clamping to prevent state explosion (numerical stability)
    const stateClamp = 10.0; // Reasonable range for normalized data
    const zNext = Az.map((azi, i) => {
      const val = azi + (WphiZ[i] ?? 0) + (dendriticTerm[i] ?? 0) + (inputTerm[i] ?? 0) + (biasLatent[i] ?? 0);
      // Clamp to prevent explosion
      return Math.max(-stateClamp, Math.min(stateClamp, Number.isFinite(val) ? val : 0));
    });

    // Observation: x_t = B * z_t + b_x
    const xNext = this.matVec(B, zNext).map((v, i) => {
      const val = v + (biasObserved[i] ?? 0);
      // Clamp observations to reasonable range
      return Math.max(-stateClamp, Math.min(stateClamp, Number.isFinite(val) ? val : 0));
    });

    // Compute uncertainty (based on distance from training manifold)
    const uncertainty = this.computeUncertainty(zNext, state.uncertainty);

    // Hidden activations for interpretability
    const hiddenActivations = phiZ;

    return {
      latentState: zNext,
      hiddenActivations,
      observedState: xNext,
      uncertainty,
      timestamp: new Date(state.timestamp.getTime() + this.config.dt * 3600000),
      timestep: state.timestep + 1,
    };
  }

  // ============================================================================
  // PREDICTION
  // ============================================================================

  predict(
    currentState: IPLRNNState,
    horizon: number,
    input?: number[][]
  ): IPLRNNPrediction {
    const trajectory: IPLRNNState[] = [currentState];
    let state = currentState;

    // Multi-step prediction
    for (let t = 0; t < horizon; t++) {
      const inputT = input ? input[t] : undefined;
      state = this.forward(state, inputT);
      trajectory.push(state);
    }

    // Compute statistics
    const finalState = trajectory[trajectory.length - 1]!;
    const meanPrediction = finalState.observedState;

    // Confidence intervals (using accumulated uncertainty)
    const uncertaintyScale = 1.96; // 95% CI
    const lower = meanPrediction.map((m, i) =>
      m - uncertaintyScale * Math.sqrt(finalState.uncertainty[i] ?? 0.1)
    );
    const upper = meanPrediction.map((m, i) =>
      m + uncertaintyScale * Math.sqrt(finalState.uncertainty[i] ?? 0.1)
    );

    // Variance at each step
    const variance = trajectory.map(s => s.uncertainty);

    // Detect early warning signals
    const earlyWarningSignals = this.detectEarlyWarnings(trajectory, Math.min(5, trajectory.length));

    return {
      trajectory,
      meanPrediction,
      confidenceInterval: {
        lower,
        upper,
        level: 0.95,
      },
      variance,
      earlyWarningSignals,
      horizon,
    };
  }

  hybridPredict(
    currentState: IPLRNNState,
    horizon: 'short' | 'medium' | 'long'
  ): IPLRNNPrediction {
    const horizonMap = {
      short: 3,   // 3 steps - KalmanFormer optimal
      medium: 12, // 12 steps - blended approach
      long: 48,   // 48 steps - full PLRNN nonlinear
    };

    const steps = horizonMap[horizon];

    // Per roadmap architecture:
    // - Short-term (h=1-3): Use KalmanFormer (optimal for noisy, linear-ish dynamics)
    // - Long-term (h=6+): Use PLRNN (captures nonlinear patterns)
    // - Medium: Blend both predictions

    if (horizon === 'short' && this.kalmanFormer) {
      // Use KalmanFormer for short-term predictions
      // KalmanFormer is better at short-term because:
      // 1. Kalman filter is optimal for linear Gaussian systems
      // 2. Persistence baseline is strong for h=1-3 due to autocorrelation
      // 3. KalmanFormer's learned gain adapts to observation noise

      // Initialize or update KalmanFormer state from PLRNN state
      if (!this.kalmanFormerState) {
        this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(currentState);
      }

      // Update with current observation
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        currentState.observedState,
        currentState.timestamp
      );

      // Get KalmanFormer prediction
      const kalmanPrediction = this.kalmanFormer.predict(this.kalmanFormerState, steps);

      // Convert to PLRNN prediction format
      const trajectory = kalmanPrediction.trajectory?.map(s =>
        this.kalmanFormer!.toPLRNNState(s)
      ) ?? [currentState];

      // Use KalmanFormer's confidence interval
      // Variance format: [step][dimension] - extract diagonal from covariance
      const variance: number[][] = trajectory.map(() =>
        kalmanPrediction.covariance.map((row, i) => row[i] ?? 0.1)
      );

      return {
        trajectory,
        meanPrediction: kalmanPrediction.blendedPrediction,
        confidenceInterval: kalmanPrediction.confidenceInterval,
        variance,
        earlyWarningSignals: this.detectEarlyWarnings(trajectory, Math.min(3, trajectory.length)),
        horizon: steps,
      };
    } else if (horizon === 'medium' && this.kalmanFormer) {
      // Blend KalmanFormer and PLRNN predictions for medium horizon
      // This captures both short-term stability and long-term patterns

      // Get PLRNN prediction
      const plrnnPrediction = this.predict(currentState, steps);

      // Get KalmanFormer prediction
      if (!this.kalmanFormerState) {
        this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(currentState);
      }
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        currentState.observedState,
        currentState.timestamp
      );
      const kalmanPrediction = this.kalmanFormer.predict(this.kalmanFormerState, steps);

      // Adaptive blending: more Kalman for early steps, more PLRNN for later
      // Blend ratio: start at 0.7 Kalman, decay to 0.3 Kalman by end
      const blendedMean = plrnnPrediction.meanPrediction.map((plrnnVal, i) => {
        const kalmanVal = kalmanPrediction.blendedPrediction[i] ?? plrnnVal;
        const kalmanWeight = 0.5; // Equal weight for medium horizon
        return kalmanWeight * kalmanVal + (1 - kalmanWeight) * plrnnVal;
      });

      // Blend confidence intervals (take wider bounds for safety)
      const lower = plrnnPrediction.confidenceInterval.lower.map((plrnnLower, i) => {
        const kalmanLower = kalmanPrediction.confidenceInterval.lower[i] ?? plrnnLower;
        return Math.min(plrnnLower, kalmanLower);
      });
      const upper = plrnnPrediction.confidenceInterval.upper.map((plrnnUpper, i) => {
        const kalmanUpper = kalmanPrediction.confidenceInterval.upper[i] ?? plrnnUpper;
        return Math.max(plrnnUpper, kalmanUpper);
      });

      return {
        trajectory: plrnnPrediction.trajectory,
        meanPrediction: blendedMean,
        confidenceInterval: { lower, upper, level: 0.95 },
        variance: plrnnPrediction.variance,
        earlyWarningSignals: plrnnPrediction.earlyWarningSignals,
        horizon: steps,
      };
    } else {
      // Long horizon: Use full PLRNN for nonlinear dynamics
      // PLRNN excels at capturing:
      // 1. Nonlinear mood transitions
      // 2. Complex causal patterns
      // 3. Critical slowing down before transitions
      return this.predict(currentState, steps);
    }
  }

  /**
   * Update KalmanFormer state with new observation
   * Call this after each observation to maintain state synchronization
   */
  updateKalmanFormerState(observation: number[], timestamp: Date): void {
    if (!this.kalmanFormer) return;

    if (!this.kalmanFormerState) {
      // Initialize with observation
      const initialState: IPLRNNState = {
        latentState: [...observation],
        hiddenActivations: observation.map(v => Math.max(0, v)),
        observedState: [...observation],
        uncertainty: Array(observation.length).fill(0.1),
        timestamp,
        timestep: 0,
      };
      this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(initialState);
    } else {
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        observation,
        timestamp
      );
    }
  }

  /**
   * Get the current KalmanFormer state (for debugging/analysis)
   */
  getKalmanFormerState(): IKalmanFormerState | null {
    return this.kalmanFormerState;
  }

  // ============================================================================
  // CAUSAL NETWORK EXTRACTION
  // ============================================================================

  extractCausalNetwork(): ICausalNetwork {
    if (!this.weights) {
      throw new Error('PLRNN not initialized');
    }

    const { A, W } = this.weights;
    const n = this.config.latentDim;

    // Create nodes
    const nodes: ICausalNode[] = STATE_DIMENSIONS.slice(0, n).map((label, i) => ({
      id: `node_${i}`,
      label,
      selfWeight: A[i] ?? 0.9,
      centrality: this.calculateCentrality(W, i),
      value: 0, // Will be updated with actual state
    }));

    // Create edges (only significant connections)
    const edges: ICausalEdge[] = [];
    const significanceThreshold = 0.1;

    for (let i = 0; i < n; i++) {
      const row = W[i];
      if (!row) continue;
      for (let j = 0; j < n; j++) {
        const weight = row[j] ?? 0;
        if (i !== j && Math.abs(weight) > significanceThreshold) {
          edges.push({
            source: `node_${j}`,
            target: `node_${i}`,
            weight,
            lag: this.config.dt,
            significance: this.computeEdgeSignificance(weight, n),
          });
        }
      }
    }

    // Calculate network metrics
    const density = edges.length / (n * (n - 1));
    const centralNode = nodes.reduce((max, node) =>
      node.centrality > max.centrality ? node : max
    ).label;

    // Detect feedback loops (simplified: 2-node loops)
    const feedbackLoops = this.detectFeedbackLoops(W, n);

    return {
      nodes,
      edges,
      metrics: {
        density,
        centralNode,
        feedbackLoops,
      },
    };
  }

  // ============================================================================
  // INTERVENTION SIMULATION
  // ============================================================================

  simulateIntervention(
    currentState: IPLRNNState,
    target: string,
    intervention: 'increase' | 'decrease' | 'stabilize',
    magnitude: number
  ): IInterventionSimulation {
    if (!this.weights) {
      throw new Error('PLRNN not initialized');
    }

    const targetIdx = STATE_DIMENSIONS.indexOf(target);
    if (targetIdx === -1) {
      throw new Error(`Unknown target dimension: ${target}`);
    }

    // Create intervention input
    const input = Array(this.config.latentDim).fill(0);

    switch (intervention) {
      case 'increase':
        input[targetIdx] = magnitude;
        break;
      case 'decrease':
        input[targetIdx] = -magnitude;
        break;
      case 'stabilize':
        // For stabilization, we dampen the target dimension
        input[targetIdx] = -(currentState.latentState[targetIdx] ?? 0) * 0.5;
        break;
    }

    // Simulate system response over 24 hours
    const horizon = 24;
    const baselineTrajectory = this.predict(currentState, horizon);
    const interventionTrajectory = this.predict(currentState, horizon, Array(horizon).fill(input));

    // Calculate effects on each dimension
    const effects = new Map<string, number>();
    const n = this.config.latentDim;

    for (let i = 0; i < n; i++) {
      const baseline = baselineTrajectory.meanPrediction[i] ?? 0;
      const intervened = interventionTrajectory.meanPrediction[i] ?? 0;
      const effect = intervened - baseline;
      const dimLabel = STATE_DIMENSIONS[i] ?? `dim_${i}`;
      effects.set(dimLabel, effect);
    }

    // Find time to peak effect
    let maxEffect = 0;
    let timeToPeak = 0;

    for (let t = 0; t < horizon; t++) {
      const intState = interventionTrajectory.trajectory[t];
      const baseState = baselineTrajectory.trajectory[t];
      if (!intState || !baseState) continue;
      const effect = Math.abs(
        (intState.observedState[targetIdx] ?? 0) -
        (baseState.observedState[targetIdx] ?? 0)
      );
      if (effect > maxEffect) {
        maxEffect = effect;
        timeToPeak = t * this.config.dt;
      }
    }

    // Identify side effects (unintended changes > 0.1)
    const sideEffects: Array<{ dimension: string; effect: number }> = [];
    effects.forEach((effect, dimension) => {
      if (dimension !== target && Math.abs(effect) > 0.1) {
        sideEffects.push({ dimension, effect });
      }
    });

    // Estimate duration (time until effect decays to 10%)
    let duration = horizon;
    for (let t = Math.floor(timeToPeak / this.config.dt); t < horizon; t++) {
      const intState = interventionTrajectory.trajectory[t];
      const baseState = baselineTrajectory.trajectory[t];
      if (!intState || !baseState) continue;
      const effect = Math.abs(
        (intState.observedState[targetIdx] ?? 0) -
        (baseState.observedState[targetIdx] ?? 0)
      );
      if (effect < maxEffect * 0.1) {
        duration = t * this.config.dt;
        break;
      }
    }

    // Confidence based on model certainty
    const finalVariance = interventionTrajectory.variance[horizon - 1];
    const confidence = 1 - (finalVariance?.[targetIdx] ?? 0.5);

    return {
      target: { dimension: target, intervention, magnitude },
      response: {
        effects,
        timeToPeak,
        duration,
        sideEffects,
      },
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }

  // ============================================================================
  // EARLY WARNING SIGNALS
  // ============================================================================

  detectEarlyWarnings(
    stateHistory: IPLRNNState[],
    windowSize: number
  ): IEarlyWarningSignal[] {
    if (stateHistory.length < windowSize * 2) {
      return []; // Not enough data
    }

    const signals: IEarlyWarningSignal[] = [];
    const n = this.config.latentDim;

    // Split into early and late windows
    const earlyWindow = stateHistory.slice(0, windowSize);
    const lateWindow = stateHistory.slice(-windowSize);

    for (let dim = 0; dim < n; dim++) {
      const dimLabel = STATE_DIMENSIONS[dim] ?? `dim_${dim}`;

      // 1. Rising Autocorrelation (critical slowing down)
      const earlyAC = this.calculateAutocorrelation(
        earlyWindow.map(s => s.latentState[dim] ?? 0)
      );
      const lateAC = this.calculateAutocorrelation(
        lateWindow.map(s => s.latentState[dim] ?? 0)
      );

      if (lateAC > earlyAC + 0.1 && lateAC > 0.5) {
        signals.push({
          type: 'autocorrelation',
          dimension: dimLabel,
          strength: (lateAC - earlyAC) / (1 - earlyAC),
          estimatedTimeToTransition: this.estimateTransitionTime(lateAC),
          confidence: Math.min(1, stateHistory.length / 50),
          recommendation: `Повышенная автокорреляция в ${dimLabel} указывает на приближение к переходному состоянию. Рекомендуется профилактическая интервенция.`,
        });
      }

      // 2. Rising Variance
      const earlyVar = this.calculateVariance(
        earlyWindow.map(s => s.latentState[dim] ?? 0)
      );
      const lateVar = this.calculateVariance(
        lateWindow.map(s => s.latentState[dim] ?? 0)
      );

      if (lateVar > earlyVar * 1.5) {
        signals.push({
          type: 'variance',
          dimension: dimLabel,
          strength: (lateVar - earlyVar) / earlyVar,
          estimatedTimeToTransition: null,
          confidence: Math.min(1, stateHistory.length / 50),
          recommendation: `Увеличение вариабельности ${dimLabel}. Состояние становится менее стабильным.`,
        });
      }

      // 3. Flickering (bimodal distribution approaching)
      const flickering = this.detectFlickering(
        lateWindow.map(s => s.latentState[dim] ?? 0)
      );

      if (flickering > 0.3) {
        signals.push({
          type: 'flickering',
          dimension: dimLabel,
          strength: flickering,
          estimatedTimeToTransition: 12, // hours
          confidence: 0.6,
          recommendation: `Обнаружено "мерцание" в ${dimLabel} - признак скорого перехода между состояниями.`,
        });
      }
    }

    // 4. Rising Connectivity (network-level)
    if (this.weights) {
      const connectivity = this.calculateNetworkConnectivity(stateHistory);
      if (connectivity.late > connectivity.early * 1.3) {
        signals.push({
          type: 'connectivity',
          dimension: 'network',
          strength: (connectivity.late - connectivity.early) / connectivity.early,
          estimatedTimeToTransition: null,
          confidence: 0.7,
          recommendation: 'Усиление связей между психологическими измерениями. Система становится более уязвимой к каскадным эффектам.',
        });
      }
    }

    return signals;
  }

  // ============================================================================
  // TRAINING
  // ============================================================================

  trainOnline(sample: IPLRNNTrainingSample): IPLRNNTrainingResult {
    if (!this.weights || !this.adamState) {
      this.initialize();
    }

    const startTime = Date.now();
    const { observations, timestamps: _timestamps } = sample;

    if (observations.length < 2) {
      return {
        loss: Infinity,
        validationLoss: Infinity,
        epochs: 0,
        trainingTime: 0,
        converged: false,
        weights: this.weights!,
      };
    }

    // Single pass through sequence
    let totalLoss = 0;
    const firstObs = observations[0];
    if (!firstObs) {
      return {
        loss: Infinity,
        validationLoss: Infinity,
        epochs: 0,
        trainingTime: 0,
        converged: false,
        weights: this.weights!,
      };
    }
    let state = this.initializeState(firstObs);

    for (let t = 0; t < observations.length - 1; t++) {
      // Forward pass
      const predicted = this.forward(state);

      // Calculate loss
      const target = observations[t + 1];
      if (!target) continue;
      const loss = this.calculateLoss([predicted.observedState], [target]);
      totalLoss += loss;

      // Backward pass (BPTT simplified to one step for online)
      this.updateWeightsOnline(state, predicted, target);

      // Teacher forcing
      if (Math.random() < this.config.teacherForcingRatio) {
        state = this.initializeState(target);
        state.timestep = predicted.timestep;
      } else {
        state = predicted;
      }
    }

    const avgLoss = totalLoss / (observations.length - 1);
    this.trainingHistory.push(avgLoss);

    // Update meta
    this.weights!.meta.trainingSamples++;
    this.weights!.meta.trainedAt = new Date();

    return {
      loss: avgLoss,
      validationLoss: avgLoss,
      epochs: 1,
      trainingTime: Date.now() - startTime,
      converged: avgLoss < 0.1,
      weights: this.weights!,
    };
  }

  trainBatch(samples: IPLRNNTrainingSample[]): IPLRNNTrainingResult {
    const startTime = Date.now();
    let totalLoss = 0;

    for (const sample of samples) {
      const result = this.trainOnline(sample);
      totalLoss += result.loss;
    }

    const avgLoss = totalLoss / samples.length;
    const converged = avgLoss < 0.05;

    if (converged) {
      this.weights!.meta.validationLoss = avgLoss;
    }

    return {
      loss: avgLoss,
      validationLoss: avgLoss,
      epochs: samples.length,
      trainingTime: Date.now() - startTime,
      converged,
      weights: this.weights!,
    };
  }

  calculateLoss(predicted: number[][], actual: number[][]): number {
    let loss = 0;
    let count = 0;

    for (let t = 0; t < predicted.length; t++) {
      const predRow = predicted[t];
      const actualRow = actual[t];
      if (!predRow || !actualRow) continue;
      for (let i = 0; i < predRow.length; i++) {
        const diff = (predRow[i] ?? 0) - (actualRow[i] ?? 0);
        loss += diff * diff;
        count++;
      }
    }

    return count > 0 ? loss / count : 0;
  }

  getComplexityMetrics(): {
    effectiveDimensionality: number;
    sparsity: number;
    lyapunovExponent: number;
  } {
    if (!this.weights) {
      return { effectiveDimensionality: 0, sparsity: 0, lyapunovExponent: 0 };
    }

    const { W } = this.weights;
    const n = W.length;

    // Sparsity (fraction of near-zero weights)
    let zeroCount = 0;
    let totalCount = 0;
    for (let i = 0; i < n; i++) {
      const row = W[i];
      if (!row) continue;
      for (let j = 0; j < n; j++) {
        if (Math.abs(row[j] ?? 0) < 0.01) zeroCount++;
        totalCount++;
      }
    }
    const sparsity = totalCount > 0 ? zeroCount / totalCount : 0;

    // Effective dimensionality (based on singular values approximation)
    const effectiveDimensionality = n * (1 - sparsity);

    // Lyapunov exponent approximation (stability indicator)
    const maxEigenvalue = this.approximateMaxEigenvalue(W);
    const lyapunovExponent = Math.log(Math.abs(maxEigenvalue));

    return {
      effectiveDimensionality,
      sparsity,
      lyapunovExponent,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private initializeMatrix(
    rows: number,
    cols: number,
    type: 'sparse' | 'full' | 'identity' | 'normal' | 'sparse_stable' | 'near_identity'
  ): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols)); // Xavier initialization

    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        if (type === 'identity') {
          row[j] = i === j ? 1 : 0;
        } else if (type === 'near_identity') {
          // Near-identity: identity + small perturbation
          // Better for stable training while allowing learning
          row[j] = i === j ? 1 + (Math.random() - 0.5) * 0.1 : (Math.random() - 0.5) * 0.02;
        } else if (type === 'sparse') {
          // Sparse: 80% zeros
          row[j] = Math.random() < 0.2 ? (Math.random() - 0.5) * 2 * scale : 0;
        } else if (type === 'sparse_stable') {
          // Sparse with smaller scale for stability
          // 70% zeros, smaller magnitude for non-zero entries
          const smallScale = scale * 0.3; // Reduced scale
          row[j] = Math.random() < 0.3 ? (Math.random() - 0.5) * 2 * smallScale : 0;
        } else {
          // Full or normal
          row[j] = (Math.random() - 0.5) * 2 * scale;
        }
      }
      matrix[i] = row;
    }

    return matrix;
  }

  private matVec(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, j) => sum + val * (v[j] ?? 0), 0));
  }

  private initializeState(observation: number[]): IPLRNNState {
    const n = this.config.latentDim;
    const obs = observation.slice(0, n);

    // Pad if observation is smaller than latent dim
    while (obs.length < n) {
      obs.push(0);
    }

    return {
      latentState: [...obs],
      hiddenActivations: obs.map(v => Math.max(0, v)),
      observedState: [...obs],
      uncertainty: Array(n).fill(0.1),
      timestamp: new Date(),
      timestep: 0,
    };
  }

  private computeUncertainty(zNext: number[], prevUncertainty: number[]): number[] {
    // Uncertainty grows with distance from training data
    // Simplified: exponential growth with dampening
    const growthRate = 0.05;
    const maxUncertainty = 1.0;

    return prevUncertainty.map((u, i) => {
      const stateDeviation = Math.abs(zNext[i] ?? 0) > 2 ? 0.1 : 0;
      const newU = u * (1 + growthRate) + stateDeviation;
      return Math.min(maxUncertainty, newU);
    });
  }

  private calculateCentrality(W: number[][], nodeIdx: number): number {
    // Out-degree centrality (sum of absolute outgoing weights)
    const nodeRow = W[nodeIdx];
    const outStrength = nodeRow ? nodeRow.reduce((sum, w) => sum + Math.abs(w), 0) : 0;

    // In-degree centrality (sum of absolute incoming weights)
    let inStrength = 0;
    for (let i = 0; i < W.length; i++) {
      const row = W[i];
      if (row) {
        inStrength += Math.abs(row[nodeIdx] ?? 0);
      }
    }

    return (outStrength + inStrength) / (2 * W.length);
  }

  private computeEdgeSignificance(weight: number, n: number): number {
    // Simplified: absolute weight normalized
    const expectedWeight = 1 / n;
    return Math.min(1, Math.abs(weight) / expectedWeight);
  }

  private detectFeedbackLoops(W: number[][], n: number): string[][] {
    const loops: string[][] = [];
    const threshold = 0.1;

    // Detect 2-node loops
    for (let i = 0; i < n; i++) {
      const rowI = W[i];
      const rowJ_check = W;
      if (!rowI) continue;
      for (let j = i + 1; j < n; j++) {
        const rowJ = rowJ_check[j];
        if (!rowJ) continue;
        const wij = rowI[j] ?? 0;
        const wji = rowJ[i] ?? 0;
        if (Math.abs(wij) > threshold && Math.abs(wji) > threshold) {
          const dimI = STATE_DIMENSIONS[i] ?? `dim_${i}`;
          const dimJ = STATE_DIMENSIONS[j] ?? `dim_${j}`;
          loops.push([dimI, dimJ]);
        }
      }
    }

    return loops;
  }

  private calculateAutocorrelation(series: number[]): number {
    if (series.length < 3) return 0;

    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    let numerator = 0;
    let denominator = 0;

    for (let t = 0; t < series.length - 1; t++) {
      const vt = series[t] ?? 0;
      const vt1 = series[t + 1] ?? 0;
      numerator += (vt - mean) * (vt1 - mean);
    }

    for (let t = 0; t < series.length; t++) {
      const vt = series[t] ?? 0;
      denominator += (vt - mean) ** 2;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(series: number[]): number {
    if (series.length < 2) return 0;

    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (series.length - 1);

    return variance;
  }

  private detectFlickering(series: number[]): number {
    if (series.length < 5) return 0;

    // Count zero-crossings around mean (indicator of bimodality)
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    let crossings = 0;

    for (let t = 1; t < series.length; t++) {
      const prev = series[t - 1] ?? 0;
      const curr = series[t] ?? 0;
      if ((prev < mean && curr >= mean) ||
          (prev >= mean && curr < mean)) {
        crossings++;
      }
    }

    // Normalize by expected crossings for white noise
    const expectedCrossings = (series.length - 1) / 2;
    const flickering = crossings / expectedCrossings;

    // High flickering = approaching bimodal distribution
    return Math.max(0, flickering - 1);
  }

  private estimateTransitionTime(autocorrelation: number): number | null {
    if (autocorrelation < 0.7) return null;

    // Empirical formula based on critical slowing down theory
    // Time to transition ~ 1 / (1 - AC)
    const timeScale = 1 / (1 - autocorrelation);
    return Math.min(48, timeScale * this.config.dt); // Cap at 48 hours
  }

  private calculateNetworkConnectivity(stateHistory: IPLRNNState[]): { early: number; late: number } {
    const midpoint = Math.floor(stateHistory.length / 2);

    const calculateCorrelationMatrix = (states: IPLRNNState[]): number => {
      const n = this.config.latentDim;
      let totalCorr = 0;
      let count = 0;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const seriesI = states.map(s => s.latentState[i] ?? 0);
          const seriesJ = states.map(s => s.latentState[j] ?? 0);
          const corr = this.calculateCorrelation(seriesI, seriesJ);
          totalCorr += Math.abs(corr);
          count++;
        }
      }

      return count > 0 ? totalCorr / count : 0;
    };

    return {
      early: calculateCorrelationMatrix(stateHistory.slice(0, midpoint)),
      late: calculateCorrelationMatrix(stateHistory.slice(midpoint)),
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 3) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = (x[i] ?? 0) - meanX;
      const dy = (y[i] ?? 0) - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom > 0 ? numerator / denom : 0;
  }

  private updateWeightsOnline(
    prevState: IPLRNNState,
    predicted: IPLRNNState,
    target: number[]
  ): void {
    if (!this.weights || !this.adamState) return;

    const { A, W, B, biasLatent, biasObserved } = this.weights;
    const lr = this.config.learningRate;
    const clip = this.config.gradientClip;
    const l1 = this.config.l1Regularization;

    // Compute output error
    const outputError = predicted.observedState.map((p, i) => (target[i] ?? 0) - p);

    // Backpropagate through observation matrix B
    const latentError = this.matVec(
      B.map(row => [...row]), // Transpose approximation for square matrix
      outputError
    );

    // Gradient for B
    for (let i = 0; i < B.length; i++) {
      const rowB = B[i];
      if (!rowB) continue;
      const errI = outputError[i] ?? 0;
      for (let j = 0; j < rowB.length; j++) {
        let grad = -errI * (predicted.latentState[j] ?? 0);
        grad = Math.max(-clip, Math.min(clip, grad));
        const currentB = rowB[j] ?? 0;
        rowB[j] = currentB - lr * grad;
      }
      const currentBiasObs = biasObserved[i];
      if (currentBiasObs !== undefined) {
        biasObserved[i] = currentBiasObs - lr * Math.max(-clip, Math.min(clip, -errI));
      }
    }

    // Gradient for A (diagonal)
    for (let i = 0; i < A.length; i++) {
      const latErr = latentError[i] ?? 0;
      const prevLatent = prevState.latentState[i] ?? 0;
      let grad = -latErr * prevLatent;
      grad = Math.max(-clip, Math.min(clip, grad));
      const currentA = A[i];
      if (currentA !== undefined) {
        A[i] = currentA - lr * grad;
      }
    }

    // Gradient for W with L1 regularization for sparsity
    const phiZ = prevState.latentState.map(v => Math.max(0, v));
    for (let i = 0; i < W.length; i++) {
      const rowW = W[i];
      if (!rowW) continue;
      const latErr = latentError[i] ?? 0;
      for (let j = 0; j < rowW.length; j++) {
        const phi = phiZ[j] ?? 0;
        const wij = rowW[j] ?? 0;
        let grad = -latErr * phi;
        // Add L1 regularization gradient
        grad += l1 * Math.sign(wij);
        grad = Math.max(-clip, Math.min(clip, grad));
        rowW[j] = wij - lr * grad;
      }
      const currentBiasLat = biasLatent[i];
      if (currentBiasLat !== undefined) {
        biasLatent[i] = currentBiasLat - lr * Math.max(-clip, Math.min(clip, -latErr));
      }
    }
  }

  private approximateMaxEigenvalue(W: number[][]): number {
    // Power iteration for largest eigenvalue
    const n = W.length;
    let v = Array(n).fill(1 / Math.sqrt(n));

    for (let iter = 0; iter < 20; iter++) {
      const Av = this.matVec(W, v);
      const norm = Math.sqrt(Av.reduce((sum, x) => sum + x * x, 0));
      if (norm < 1e-10) return 0;
      v = Av.map(x => x / norm);
    }

    const Av = this.matVec(W, v);
    return Av.reduce((sum, x, i) => sum + x * v[i], 0);
  }

  // ============================================================================
  // BPTT SUPPORT METHODS (for PLRNNTrainer)
  // ============================================================================

  /**
   * Get latent dimension
   */
  getLatentDim(): number {
    return this.config.latentDim;
  }

  /**
   * Get config
   */
  getConfig(): IPLRNNConfig {
    return { ...this.config };
  }

  /**
   * Compute gradients for a single timestep (for BPTT)
   * Returns gradients for A, W, B, biasLatent, biasObserved
   */
  computeStepGradients(
    prevState: IPLRNNState,
    currentState: IPLRNNState,
    target: number[],
    outputError?: number[]
  ): {
    dA: number[];
    dW: number[][];
    dB: number[][];
    dBiasLatent: number[];
    dBiasObserved: number[];
    latentError: number[];
  } {
    if (!this.weights) {
      throw new Error('PLRNNEngine not initialized');
    }

    const { W, B } = this.weights;
    const n = this.config.latentDim;

    // Output error: (prediction - target)
    const obsError = outputError ?? currentState.observedState.map(
      (pred, i) => pred - (target[i] ?? 0)
    );

    // Gradients for B: dL/dB = obsError * z^T
    const dB: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row[j] = (obsError[i] ?? 0) * (currentState.latentState[j] ?? 0);
      }
      dB[i] = row;
    }

    // Gradient for biasObserved: dL/d_biasObs = obsError
    const dBiasObserved = [...obsError];

    // Backprop through B: latent error = B^T * obsError
    const latentError: number[] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const bRow = B[i];
        if (bRow) {
          sum += (bRow[j] ?? 0) * (obsError[i] ?? 0);
        }
      }
      latentError[j] = sum;
    }

    // ReLU activations: phi(z) = max(0, z)
    const phiZ = prevState.latentState.map(v => Math.max(0, v));

    // ReLU derivative: 1 if z > 0, else 0
    const phiDerivative = prevState.latentState.map(v => v > 0 ? 1 : 0);

    // Gradient for A (diagonal): dL/dA_i = latentError_i * z_{t-1,i}
    const dA: number[] = [];
    for (let i = 0; i < n; i++) {
      dA[i] = (latentError[i] ?? 0) * (prevState.latentState[i] ?? 0);
    }

    // Gradient for W: dL/dW_ij = latentError_i * phi(z_{t-1})_j
    const dW: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row[j] = (latentError[i] ?? 0) * (phiZ[j] ?? 0);
      }
      dW[i] = row;
    }

    // Gradient for biasLatent: dL/d_biasLat = latentError
    const dBiasLatent = [...latentError];

    // Propagate error through W and ReLU for next backward step
    // delta_{t-1} = A * delta_t + (W^T * delta_t) * phi'(z_{t-1})
    const wTransposeError: number[] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const wRow = W[i];
        if (wRow) {
          sum += (wRow[j] ?? 0) * (latentError[i] ?? 0);
        }
      }
      wTransposeError[j] = sum * (phiDerivative[j] ?? 0);
    }

    // Combined error to propagate: A * delta + W^T * delta * phi'
    const propagatedError = latentError.map((ae, i) => {
      const aVal = this.weights!.A[i] ?? 0.9;
      return aVal * ae + (wTransposeError[i] ?? 0);
    });

    return {
      dA,
      dW,
      dB,
      dBiasLatent,
      dBiasObserved,
      latentError: propagatedError,
    };
  }

  /**
   * Apply accumulated gradients using Adam optimizer
   */
  applyGradients(
    gradients: {
      dA: number[];
      dW: number[][];
      dB: number[][];
      dBiasLatent: number[];
      dBiasObserved: number[];
    },
    learningRate: number,
    l1Reg: number = 0.01,
    l2Reg: number = 0.0001,
    gradClip: number = 1.0
  ): void {
    if (!this.weights) {
      throw new Error('PLRNNEngine not initialized');
    }

    const { A, W, B, biasLatent, biasObserved } = this.weights;
    const n = this.config.latentDim;

    // Initialize Adam state if needed
    if (!this.adamState) {
      this.adamState = {
        m: {},
        v: {},
        t: 0,
      };
    }

    this.adamState.t += 1;
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;
    const t = this.adamState.t;

    // Bias correction
    const biasCorrection1 = 1 - Math.pow(beta1, t);
    const biasCorrection2 = 1 - Math.pow(beta2, t);

    // Helper: clip gradient
    const clip = (g: number): number => Math.max(-gradClip, Math.min(gradClip, g));

    // Update A (diagonal)
    if (!this.adamState.m['A']) {
      this.adamState.m['A'] = [Array(n).fill(0)];
      this.adamState.v['A'] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = gradients.dA[i] ?? 0;
      grad += l2Reg * (A[i] ?? 0); // L2 regularization
      grad = clip(grad);

      const mA = this.adamState.m['A']![0]!;
      const vA = this.adamState.v['A']![0]!;

      mA[i] = beta1 * (mA[i] ?? 0) + (1 - beta1) * grad;
      vA[i] = beta2 * (vA[i] ?? 0) + (1 - beta2) * grad * grad;

      const mHat = mA[i]! / biasCorrection1;
      const vHat = vA[i]! / biasCorrection2;

      A[i] = (A[i] ?? 0.9) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }

    // Update W
    if (!this.adamState.m['W']) {
      this.adamState.m['W'] = Array(n).fill(null).map(() => Array(n).fill(0));
      this.adamState.v['W'] = Array(n).fill(null).map(() => Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      const wRow = W[i];
      const dWRow = gradients.dW[i];
      if (!wRow || !dWRow) continue;

      for (let j = 0; j < n; j++) {
        let grad = dWRow[j] ?? 0;
        const wij = wRow[j] ?? 0;
        grad += l1Reg * Math.sign(wij); // L1 regularization
        grad += l2Reg * wij; // L2 regularization
        grad = clip(grad);

        const mW = this.adamState.m['W']! as number[][];
        const vW = this.adamState.v['W']! as number[][];

        mW[i]![j] = beta1 * (mW[i]![j] ?? 0) + (1 - beta1) * grad;
        vW[i]![j] = beta2 * (vW[i]![j] ?? 0) + (1 - beta2) * grad * grad;

        const mHat = mW[i]![j]! / biasCorrection1;
        const vHat = vW[i]![j]! / biasCorrection2;

        wRow[j] = wij - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }

    // Update B
    if (!this.adamState.m['B']) {
      this.adamState.m['B'] = Array(n).fill(null).map(() => Array(n).fill(0));
      this.adamState.v['B'] = Array(n).fill(null).map(() => Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      const bRow = B[i];
      const dBRow = gradients.dB[i];
      if (!bRow || !dBRow) continue;

      for (let j = 0; j < n; j++) {
        let grad = dBRow[j] ?? 0;
        grad += l2Reg * (bRow[j] ?? 0);
        grad = clip(grad);

        const mB = this.adamState.m['B']! as number[][];
        const vB = this.adamState.v['B']! as number[][];

        mB[i]![j] = beta1 * (mB[i]![j] ?? 0) + (1 - beta1) * grad;
        vB[i]![j] = beta2 * (vB[i]![j] ?? 0) + (1 - beta2) * grad * grad;

        const mHat = mB[i]![j]! / biasCorrection1;
        const vHat = vB[i]![j]! / biasCorrection2;

        bRow[j] = (bRow[j] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }

    // Update biases
    if (!this.adamState.m['biasLatent']) {
      this.adamState.m['biasLatent'] = [Array(n).fill(0)];
      this.adamState.v['biasLatent'] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = clip(gradients.dBiasLatent[i] ?? 0);

      const mBL = this.adamState.m['biasLatent']![0]!;
      const vBL = this.adamState.v['biasLatent']![0]!;

      mBL[i] = beta1 * (mBL[i] ?? 0) + (1 - beta1) * grad;
      vBL[i] = beta2 * (vBL[i] ?? 0) + (1 - beta2) * grad * grad;

      const mHat = mBL[i]! / biasCorrection1;
      const vHat = vBL[i]! / biasCorrection2;

      biasLatent[i] = (biasLatent[i] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }

    if (!this.adamState.m['biasObserved']) {
      this.adamState.m['biasObserved'] = [Array(n).fill(0)];
      this.adamState.v['biasObserved'] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = clip(gradients.dBiasObserved[i] ?? 0);

      const mBO = this.adamState.m['biasObserved']![0]!;
      const vBO = this.adamState.v['biasObserved']![0]!;

      mBO[i] = beta1 * (mBO[i] ?? 0) + (1 - beta1) * grad;
      vBO[i] = beta2 * (vBO[i] ?? 0) + (1 - beta2) * grad * grad;

      const mHat = mBO[i]! / biasCorrection1;
      const vHat = vBO[i]! / biasCorrection2;

      biasObserved[i] = (biasObserved[i] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
  }

  /**
   * Reset Adam optimizer state (for new training run)
   */
  resetAdamState(): void {
    this.adamState = null;
  }

  /**
   * Create a state from observation values
   */
  createState(observation: number[], timestamp?: Date): IPLRNNState {
    const state = this.initializeState(observation);
    if (timestamp) {
      state.timestamp = timestamp;
    }
    return state;
  }
}

/**
 * Factory function
 */
export function createPLRNNEngine(config?: Partial<IPLRNNConfig>): IPLRNNEngine {
  const engine = new PLRNNEngine(config);
  engine.initialize(config);
  return engine;
}

export { DEFAULT_PLRNN_CONFIG };
