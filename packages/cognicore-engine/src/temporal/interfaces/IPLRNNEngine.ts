/**
 * 🧠 PLRNN ENGINE INTERFACES
 * ==========================
 * Piecewise Linear Recurrent Neural Network for Mental Health Dynamics
 *
 * Scientific Foundation (2025 Research):
 * - PLRNN outperforms Transformers for EMA forecasting (medRxiv 2025)
 * - dendPLRNN for interpretable nonlinear dynamics (Durstewitz Lab)
 * - State-space approach for computational psychiatry
 *
 * Key Advantages over Linear Kalman:
 * - Captures nonlinear psychological dynamics (mood swings, tipping points)
 * - Interpretable latent network structure
 * - Predicts intervention effects through causal network analysis
 *
 * © БФ "Другой путь", 2025
 */

/**
 * PLRNN Configuration
 */
export interface IPLRNNConfig {
  /** Dimensionality of latent state space (default: 5 for VAD + risk + resources) */
  latentDim: number;

  /** Number of hidden units in piecewise-linear layer */
  hiddenUnits: number;

  /** Connectivity pattern */
  connectivity: 'sparse' | 'full' | 'dendritic';

  /** Dendritic basis expansion (for dendPLRNN) */
  dendriticBases?: number;

  /** Learning rate for online adaptation */
  learningRate: number;

  /** Teacher forcing ratio (0-1) for training stability */
  teacherForcingRatio: number;

  /** Regularization strength for sparse connectivity */
  l1Regularization: number;

  /** Gradient clipping threshold */
  gradientClip: number;

  /** Number of steps for multi-step prediction */
  predictionHorizon: number;

  /** Time delta for continuous-time dynamics (hours) */
  dt: number;
}

/**
 * Default PLRNN Configuration
 * Tuned for mental health EMA dynamics based on 2025 research
 */
export const DEFAULT_PLRNN_CONFIG: IPLRNNConfig = {
  latentDim: 5, // VAD (3) + risk (1) + resources (1)
  hiddenUnits: 16,
  connectivity: 'dendritic',
  dendriticBases: 8,
  learningRate: 0.001,
  teacherForcingRatio: 0.5,
  l1Regularization: 0.01,
  gradientClip: 1.0,
  predictionHorizon: 12, // 12 hours ahead
  dt: 1.0, // 1 hour time steps
};

/**
 * PLRNN State
 * Latent state representation with uncertainty
 */
export interface IPLRNNState {
  /** Current latent state vector z_t */
  latentState: number[];

  /** Hidden layer activations h_t */
  hiddenActivations: number[];

  /** Observation-space state estimate x_t */
  observedState: number[];

  /** State uncertainty (variance) */
  uncertainty: number[];

  /** Timestamp of this state */
  timestamp: Date;

  /** Time step index */
  timestep: number;
}

/**
 * PLRNN Prediction Result
 */
export interface IPLRNNPrediction {
  /** Predicted states over horizon */
  trajectory: IPLRNNState[];

  /** Mean prediction at horizon */
  meanPrediction: number[];

  /** Prediction confidence intervals */
  confidenceInterval: {
    lower: number[];
    upper: number[];
    level: number; // e.g., 0.95 for 95% CI
  };

  /** Prediction variance at each step */
  variance: number[][];

  /** Early warning signals detected */
  earlyWarningSignals: IEarlyWarningSignal[];

  /** Prediction horizon (hours) */
  horizon: number;
}

/**
 * Early Warning Signal (Critical Slowing Down)
 * Based on 2025 research on critical transitions in mental health
 */
export interface IEarlyWarningSignal {
  /** Type of EWS */
  type: 'autocorrelation' | 'variance' | 'connectivity' | 'flickering';

  /** Which dimension is affected */
  dimension: string;

  /** Signal strength (0-1) */
  strength: number;

  /** Estimated time to transition (hours, null if unknown) */
  estimatedTimeToTransition: number | null;

  /** Confidence in the signal */
  confidence: number;

  /** Recommended action */
  recommendation: string;
}

/**
 * Causal Network extracted from PLRNN
 * Interpretable psychological dynamics
 */
export interface ICausalNetwork {
  /** Nodes represent psychological dimensions */
  nodes: ICausalNode[];

  /** Edges represent causal influence strengths */
  edges: ICausalEdge[];

  /** Network-level metrics */
  metrics: {
    /** Average connectivity */
    density: number;
    /** Central node (most influential) */
    centralNode: string;
    /** Identified feedback loops */
    feedbackLoops: string[][];
  };
}

export interface ICausalNode {
  id: string;
  label: string;
  /** Self-connection strength (autoregression) */
  selfWeight: number;
  /** Centrality in the network */
  centrality: number;
  /** Current value */
  value: number;
}

export interface ICausalEdge {
  source: string;
  target: string;
  /** Influence weight (positive = excitatory, negative = inhibitory) */
  weight: number;
  /** Time lag of influence (hours) */
  lag: number;
  /** Statistical significance */
  significance: number;
}

/**
 * Intervention Simulation Result
 * Simulates effect of changing a node in the causal network
 */
export interface IInterventionSimulation {
  /** Intervention target */
  target: {
    dimension: string;
    intervention: 'increase' | 'decrease' | 'stabilize';
    magnitude: number;
  };

  /** Predicted system response */
  response: {
    /** Affected dimensions with effect sizes */
    effects: Map<string, number>;
    /** Time to peak effect (hours) */
    timeToPeak: number;
    /** Duration of effect (hours) */
    duration: number;
    /** Side effects (unintended changes) */
    sideEffects: Array<{ dimension: string; effect: number }>;
  };

  /** Confidence in simulation */
  confidence: number;
}

/**
 * PLRNN Model Weights
 * Serializable for persistence
 */
export interface IPLRNNWeights {
  /** Diagonal autoregression matrix A */
  A: number[];

  /** Off-diagonal connection matrix W */
  W: number[][];

  /** Input matrix C (for dendritic bases) */
  C?: number[][];

  /** Observation matrix B */
  B: number[][];

  /** Bias vectors */
  biasLatent: number[];
  biasObserved: number[];

  /** Dendritic weights (if dendPLRNN) */
  dendriticWeights?: number[][];

  /** Metadata */
  meta: {
    trainedAt: Date;
    trainingSamples: number;
    validationLoss: number;
    config: IPLRNNConfig;
  };
}

/**
 * PLRNN Training Sample
 */
export interface IPLRNNTrainingSample {
  /** Observation sequence */
  observations: number[][];

  /** Timestamps */
  timestamps: Date[];

  /** User ID for personalization */
  userId: string | number;

  /** Optional ground truth latent states (for supervised training) */
  groundTruth?: number[][];
}

/**
 * PLRNN Training Result
 */
export interface IPLRNNTrainingResult {
  /** Final training loss */
  loss: number;

  /** Validation loss */
  validationLoss: number;

  /** Number of epochs */
  epochs: number;

  /** Training time (ms) */
  trainingTime: number;

  /** Convergence achieved */
  converged: boolean;

  /** Updated weights */
  weights: IPLRNNWeights;
}

/**
 * PLRNN Engine Interface
 * Core nonlinear dynamics engine for cognitive state modeling
 */
export interface IPLRNNEngine {
  /**
   * Initialize engine with configuration
   */
  initialize(config: Partial<IPLRNNConfig>): void;

  /**
   * Load pretrained weights
   */
  loadWeights(weights: IPLRNNWeights): void;

  /**
   * Get current weights
   */
  getWeights(): IPLRNNWeights;

  /**
   * Forward pass: compute next state
   * z_{t+1} = A * z_t + W * φ(z_t) + C * s_t + bias
   * where φ is ReLU (piecewise-linear)
   */
  forward(state: IPLRNNState, input?: number[]): IPLRNNState;

  /**
   * Multi-step prediction
   */
  predict(
    currentState: IPLRNNState,
    horizon: number,
    input?: number[][]
  ): IPLRNNPrediction;

  /**
   * Hybrid prediction: PLRNN for long-term, Kalman for short-term
   */
  hybridPredict(
    currentState: IPLRNNState,
    horizon: 'short' | 'medium' | 'long'
  ): IPLRNNPrediction;

  /**
   * Extract interpretable causal network from learned weights
   * Key advantage of PLRNN over black-box models
   */
  extractCausalNetwork(): ICausalNetwork;

  /**
   * Simulate intervention on psychological dimension
   */
  simulateIntervention(
    currentState: IPLRNNState,
    target: string,
    intervention: 'increase' | 'decrease' | 'stabilize',
    magnitude: number
  ): IInterventionSimulation;

  /**
   * Detect early warning signals of critical transition
   * Based on critical slowing down theory
   */
  detectEarlyWarnings(
    stateHistory: IPLRNNState[],
    windowSize: number
  ): IEarlyWarningSignal[];

  /**
   * Online training update
   */
  trainOnline(sample: IPLRNNTrainingSample): IPLRNNTrainingResult;

  /**
   * Batch training
   */
  trainBatch(samples: IPLRNNTrainingSample[]): IPLRNNTrainingResult;

  /**
   * Calculate reconstruction loss
   */
  calculateLoss(
    predicted: number[][],
    actual: number[][]
  ): number;

  /**
   * Get model complexity metrics
   */
  getComplexityMetrics(): {
    effectiveDimensionality: number;
    sparsity: number;
    lyapunovExponent: number;
  };
}

/**
 * Factory function type for PLRNN Engine
 */
export type PLRNNEngineFactory = (config?: Partial<IPLRNNConfig>) => IPLRNNEngine;
