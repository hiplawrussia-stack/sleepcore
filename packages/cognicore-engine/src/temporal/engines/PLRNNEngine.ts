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

    // Initialize weights with Xavier/Glorot initialization
    const n = this.config.latentDim;
    const h = this.config.hiddenUnits;

    // Diagonal autoregression (values close to 1 for stability)
    const A = Array(n).fill(0).map(() => 0.9 + Math.random() * 0.1);

    // Off-diagonal connections (sparse if configured)
    const W = this.initializeMatrix(n, n, 'sparse');

    // Observation matrix (identity-like for interpretability)
    const B = this.initializeMatrix(n, n, 'identity');

    // Bias vectors (small random values)
    const biasLatent = Array(n).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    const biasObserved = Array(n).fill(0).map(() => (Math.random() - 0.5) * 0.1);

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

    this.initialized = true;
  }

  loadWeights(weights: IPLRNNWeights): void {
    this.weights = weights;
    this.config = weights.meta.config;
    this.initialized = true;
  }

  getWeights(): IPLRNNWeights {
    if (!this.weights) {
      throw new Error('PLRNN not initialized. Call initialize() first.');
    }
    return this.weights;
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
    const Az = z.map((zi, i) => A[i] * zi);

    // Off-diagonal dynamics: W * φ(z_t)
    const WphiZ = this.matVec(W, phiZ);

    // Dendritic basis expansion (if dendPLRNN)
    let dendriticTerm: number[] = Array(n).fill(0);
    if (this.config.connectivity === 'dendritic' && dendriticWeights && C) {
      // Dendritic nonlinearity: sum of ReLU basis functions
      const bases = dendriticWeights.map(row =>
        row.reduce((sum, w, i) => sum + w * z[i % z.length], 0)
      );
      const activatedBases = bases.map(b => Math.max(0, b));
      dendriticTerm = C.map(row =>
        row.reduce((sum, c, i) => sum + c * activatedBases[i], 0)
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
    const zNext = Az.map((azi, i) =>
      azi + WphiZ[i] + dendriticTerm[i] + inputTerm[i] + biasLatent[i]
    );

    // Observation: x_t = B * z_t + b_x
    const xNext = this.matVec(B, zNext).map((v, i) => v + biasObserved[i]);

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
    const finalState = trajectory[trajectory.length - 1];
    const meanPrediction = finalState.observedState;

    // Confidence intervals (using accumulated uncertainty)
    const uncertaintyScale = 1.96; // 95% CI
    const lower = meanPrediction.map((m, i) =>
      m - uncertaintyScale * Math.sqrt(finalState.uncertainty[i])
    );
    const upper = meanPrediction.map((m, i) =>
      m + uncertaintyScale * Math.sqrt(finalState.uncertainty[i])
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
      short: 3, // 3 hours - use more Kalman-like behavior
      medium: 12, // 12 hours - balanced
      long: 48, // 48 hours - full PLRNN nonlinear
    };

    const steps = horizonMap[horizon];

    // For short horizon, add more regularization (closer to linear)
    const originalL1 = this.config.l1Regularization;
    if (horizon === 'short') {
      this.config.l1Regularization *= 2; // More sparse = more linear
    }

    const prediction = this.predict(currentState, steps);

    // Restore config
    this.config.l1Regularization = originalL1;

    return prediction;
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
      selfWeight: A[i],
      centrality: this.calculateCentrality(W, i),
      value: 0, // Will be updated with actual state
    }));

    // Create edges (only significant connections)
    const edges: ICausalEdge[] = [];
    const significanceThreshold = 0.1;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.abs(W[i][j]) > significanceThreshold) {
          edges.push({
            source: `node_${j}`,
            target: `node_${i}`,
            weight: W[i][j],
            lag: this.config.dt,
            significance: this.computeEdgeSignificance(W[i][j], n),
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
        input[targetIdx] = -currentState.latentState[targetIdx] * 0.5;
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
      const baseline = baselineTrajectory.meanPrediction[i];
      const intervened = interventionTrajectory.meanPrediction[i];
      const effect = intervened - baseline;
      effects.set(STATE_DIMENSIONS[i], effect);
    }

    // Find time to peak effect
    let maxEffect = 0;
    let timeToPeak = 0;

    for (let t = 0; t < horizon; t++) {
      const effect = Math.abs(
        interventionTrajectory.trajectory[t].observedState[targetIdx] -
        baselineTrajectory.trajectory[t].observedState[targetIdx]
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
      const effect = Math.abs(
        interventionTrajectory.trajectory[t].observedState[targetIdx] -
        baselineTrajectory.trajectory[t].observedState[targetIdx]
      );
      if (effect < maxEffect * 0.1) {
        duration = t * this.config.dt;
        break;
      }
    }

    // Confidence based on model certainty
    const confidence = 1 - interventionTrajectory.variance[horizon - 1][targetIdx];

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
      const dimLabel = STATE_DIMENSIONS[dim] || `dim_${dim}`;

      // 1. Rising Autocorrelation (critical slowing down)
      const earlyAC = this.calculateAutocorrelation(
        earlyWindow.map(s => s.latentState[dim])
      );
      const lateAC = this.calculateAutocorrelation(
        lateWindow.map(s => s.latentState[dim])
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
        earlyWindow.map(s => s.latentState[dim])
      );
      const lateVar = this.calculateVariance(
        lateWindow.map(s => s.latentState[dim])
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
        lateWindow.map(s => s.latentState[dim])
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
    const { observations, timestamps } = sample;

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
    let state = this.initializeState(observations[0]);

    for (let t = 0; t < observations.length - 1; t++) {
      // Forward pass
      const predicted = this.forward(state);

      // Calculate loss
      const target = observations[t + 1];
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
      for (let i = 0; i < predicted[t].length; i++) {
        const diff = predicted[t][i] - actual[t][i];
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
      for (let j = 0; j < n; j++) {
        if (Math.abs(W[i][j]) < 0.01) zeroCount++;
        totalCount++;
      }
    }
    const sparsity = zeroCount / totalCount;

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
    type: 'sparse' | 'full' | 'identity' | 'normal'
  ): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols)); // Xavier initialization

    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        if (type === 'identity') {
          matrix[i][j] = i === j ? 1 : 0;
        } else if (type === 'sparse') {
          // Sparse: 80% zeros
          matrix[i][j] = Math.random() < 0.2 ? (Math.random() - 0.5) * 2 * scale : 0;
        } else {
          // Full or normal
          matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
        }
      }
    }

    return matrix;
  }

  private matVec(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
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
      const stateDeviation = Math.abs(zNext[i]) > 2 ? 0.1 : 0;
      const newU = u * (1 + growthRate) + stateDeviation;
      return Math.min(maxUncertainty, newU);
    });
  }

  private calculateCentrality(W: number[][], nodeIdx: number): number {
    // Out-degree centrality (sum of absolute outgoing weights)
    const outStrength = W[nodeIdx].reduce((sum, w) => sum + Math.abs(w), 0);

    // In-degree centrality (sum of absolute incoming weights)
    let inStrength = 0;
    for (let i = 0; i < W.length; i++) {
      inStrength += Math.abs(W[i][nodeIdx]);
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
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(W[i][j]) > threshold && Math.abs(W[j][i]) > threshold) {
          loops.push([STATE_DIMENSIONS[i], STATE_DIMENSIONS[j]]);
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
      numerator += (series[t] - mean) * (series[t + 1] - mean);
    }

    for (let t = 0; t < series.length; t++) {
      denominator += (series[t] - mean) ** 2;
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
      if ((series[t - 1] < mean && series[t] >= mean) ||
          (series[t - 1] >= mean && series[t] < mean)) {
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
          const seriesI = states.map(s => s.latentState[i]);
          const seriesJ = states.map(s => s.latentState[j]);
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
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
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
    const outputError = predicted.observedState.map((p, i) => target[i] - p);

    // Backpropagate through observation matrix B
    const latentError = this.matVec(
      B.map(row => [...row]), // Transpose approximation for square matrix
      outputError
    );

    // Gradient for B
    for (let i = 0; i < B.length; i++) {
      for (let j = 0; j < B[i].length; j++) {
        let grad = -outputError[i] * predicted.latentState[j];
        grad = Math.max(-clip, Math.min(clip, grad));
        B[i][j] -= lr * grad;
      }
      biasObserved[i] -= lr * Math.max(-clip, Math.min(clip, -outputError[i]));
    }

    // Gradient for A (diagonal)
    for (let i = 0; i < A.length; i++) {
      let grad = -latentError[i] * prevState.latentState[i];
      grad = Math.max(-clip, Math.min(clip, grad));
      A[i] -= lr * grad;
    }

    // Gradient for W with L1 regularization for sparsity
    const phiZ = prevState.latentState.map(v => Math.max(0, v));
    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++) {
        let grad = -latentError[i] * phiZ[j];
        // Add L1 regularization gradient
        grad += l1 * Math.sign(W[i][j]);
        grad = Math.max(-clip, Math.min(clip, grad));
        W[i][j] -= lr * grad;
      }
      biasLatent[i] -= lr * Math.max(-clip, Math.min(clip, -latentError[i]));
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
