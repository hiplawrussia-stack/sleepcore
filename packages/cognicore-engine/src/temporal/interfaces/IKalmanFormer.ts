/**
 * 🔮 KALMANFORMER INTERFACES
 * ==========================
 * Hybrid Kalman Filter + Transformer Architecture
 *
 * Scientific Foundation (2025 Research):
 * - Nature Comm. 2024: "KalmanFormer: using Transformer to model Kalman Gain"
 * - arXiv 2024: "Transformer-Based Approaches for Sensor Fusion in Autonomous Systems"
 * - ICLR 2025: "State Space Models with Attention"
 *
 * Architecture:
 * - Kalman Filter: Short-term dynamics, optimal for noisy observations
 * - Transformer: Long-range dependencies, context modeling
 * - Learned Kalman Gain: Adaptive trust between prediction and observation
 *
 * Key Innovation:
 * Use Transformer attention to learn optimal Kalman Gain matrix
 * based on observation context and historical patterns.
 *
 * © БФ "Другой путь", 2025
 */

import type { IKalmanFilterState } from '../../twin/interfaces/IDigitalTwin';
import type { IPLRNNState } from './IPLRNNEngine';

/**
 * KalmanFormer Configuration
 */
export interface IKalmanFormerConfig {
  /** State dimensionality */
  stateDim: number;

  /** Observation dimensionality */
  obsDim: number;

  /** Transformer embedding dimension */
  embedDim: number;

  /** Number of attention heads */
  numHeads: number;

  /** Number of transformer layers */
  numLayers: number;

  /** Context window size (historical observations) */
  contextWindow: number;

  /** Dropout rate for regularization */
  dropout: number;

  /** Kalman-Transformer blend ratio (0 = pure Kalman, 1 = pure Transformer) */
  blendRatio: number;

  /** Enable learned Kalman Gain */
  learnedGain: boolean;

  /** Temperature for attention softmax */
  temperature: number;

  /** Time embedding type */
  timeEmbedding: 'sinusoidal' | 'learned' | 'none';

  /** Maximum time gap for interpolation (hours) */
  maxTimeGap: number;
}

/**
 * Default KalmanFormer Configuration
 */
export const DEFAULT_KALMANFORMER_CONFIG: IKalmanFormerConfig = {
  stateDim: 5, // VAD + risk + resources
  obsDim: 5,
  embedDim: 64,
  numHeads: 4,
  numLayers: 2,
  contextWindow: 24, // 24 historical observations
  dropout: 0.1,
  blendRatio: 0.5, // Equal weight initially
  learnedGain: true,
  temperature: 1.0,
  timeEmbedding: 'sinusoidal',
  maxTimeGap: 48, // 48 hours max interpolation
};

/**
 * Attention Weights for interpretability
 */
export interface IAttentionWeights {
  /** Self-attention weights [numHeads, seqLen, seqLen] */
  selfAttention: number[][][];

  /** Cross-attention weights (if applicable) */
  crossAttention?: number[][][];

  /** Which historical observations influenced prediction most */
  topInfluentialObservations: Array<{
    index: number;
    timestamp: Date;
    weight: number;
    dimension: string;
  }>;

  /** Temporal attention pattern (recency vs. relevance) */
  temporalPattern: 'recency_bias' | 'pattern_matching' | 'uniform';
}

/**
 * KalmanFormer State
 * Extended Kalman state with Transformer context
 */
export interface IKalmanFormerState {
  /** Standard Kalman state */
  kalmanState: IKalmanFilterState;

  /** Transformer hidden state (context encoding) */
  transformerHidden: number[][];

  /** Historical observation buffer */
  observationHistory: Array<{
    observation: number[];
    timestamp: Date;
    embedding?: number[];
  }>;

  /** Learned Kalman Gain (if enabled) */
  learnedGain?: number[][];

  /** Current blend ratio (may adapt) */
  currentBlendRatio: number;

  /** Confidence in prediction */
  confidence: number;

  /** Timestamp */
  timestamp: Date;
}

/**
 * KalmanFormer Prediction Result
 */
export interface IKalmanFormerPrediction {
  /** State estimate */
  stateEstimate: number[];

  /** Covariance estimate */
  covariance: number[][];

  /** Kalman contribution to prediction */
  kalmanContribution: number[];

  /** Transformer contribution to prediction */
  transformerContribution: number[];

  /** Final blended prediction */
  blendedPrediction: number[];

  /** Confidence intervals */
  confidenceInterval: {
    lower: number[];
    upper: number[];
    level: number;
  };

  /** Attention weights for interpretability */
  attention: IAttentionWeights;

  /** Prediction horizon */
  horizon: number;

  /** Trajectory for multi-step prediction */
  trajectory?: IKalmanFormerState[];
}

/**
 * KalmanFormer Model Weights
 */
export interface IKalmanFormerWeights {
  /** Kalman matrices */
  kalman: {
    stateTransition: number[][];
    observationMatrix: number[][];
    processNoise: number[][];
    measurementNoise: number[][];
  };

  /** Transformer weights */
  transformer: {
    queryWeights: number[][][]; // [layer, head, dim]
    keyWeights: number[][][];
    valueWeights: number[][][];
    outputProjection: number[][];
    feedforward: {
      linear1: number[][];
      linear2: number[][];
      bias1: number[];
      bias2: number[];
    }[];
    layerNorm: {
      gamma: number[];
      beta: number[];
    }[];
  };

  /** Gain predictor (if learned gain enabled) */
  gainPredictor?: {
    weights: number[][];
    bias: number[];
  };

  /** Embedding layers */
  embedding: {
    observation: number[][];
    time?: number[][];
    position?: number[][];
  };

  /** Output projection */
  outputProjection: number[][];

  /** Blend ratio predictor */
  blendPredictor?: {
    weights: number[];
    bias: number;
  };

  /** Metadata */
  meta: {
    trainedAt: Date;
    trainingSamples: number;
    validationLoss: number;
    config: IKalmanFormerConfig;
  };
}

/**
 * Training sample for KalmanFormer
 */
export interface IKalmanFormerTrainingSample {
  /** Observation sequence */
  observations: number[][];

  /** Timestamps */
  timestamps: Date[];

  /** Optional ground truth states */
  groundTruth?: number[][];

  /** User ID for personalization */
  userId: string | number;

  /** Context information (external factors) */
  context?: Array<{
    timeOfDay: number; // 0-23
    dayOfWeek: number; // 0-6
    eventType?: string;
  }>;
}

/**
 * KalmanFormer Engine Interface
 */
export interface IKalmanFormerEngine {
  /**
   * Initialize engine
   */
  initialize(config?: Partial<IKalmanFormerConfig>): void;

  /**
   * Load pretrained weights
   */
  loadWeights(weights: IKalmanFormerWeights): void;

  /**
   * Get current weights
   */
  getWeights(): IKalmanFormerWeights;

  /**
   * Process single observation
   * Updates state using hybrid Kalman-Transformer approach
   */
  update(
    state: IKalmanFormerState,
    observation: number[],
    timestamp: Date
  ): IKalmanFormerState;

  /**
   * Predict next state(s)
   */
  predict(
    state: IKalmanFormerState,
    horizon: number
  ): IKalmanFormerPrediction;

  /**
   * Get attention-based explanation
   * Which historical observations influenced the prediction
   */
  explain(state: IKalmanFormerState): IAttentionWeights;

  /**
   * Adapt blend ratio based on prediction errors
   */
  adaptBlendRatio(
    predictions: number[][],
    actuals: number[][]
  ): number;

  /**
   * Train on batch of samples
   */
  train(samples: IKalmanFormerTrainingSample[]): {
    loss: number;
    kalmanLoss: number;
    transformerLoss: number;
    epochs: number;
  };

  /**
   * Convert to/from PLRNN state for interoperability
   */
  toPLRNNState(state: IKalmanFormerState): IPLRNNState;
  fromPLRNNState(plrnnState: IPLRNNState): IKalmanFormerState;

  /**
   * Get model complexity metrics
   */
  getComplexityMetrics(): {
    totalParameters: number;
    kalmanParameters: number;
    transformerParameters: number;
    effectiveContextLength: number;
  };
}

/**
 * Factory type
 */
export type KalmanFormerEngineFactory = (
  config?: Partial<IKalmanFormerConfig>
) => IKalmanFormerEngine;
