/**
 * 🧠 BAYESIAN BELIEF UPDATE INTERFACES
 * =====================================
 * POMDP-based Belief State Management
 *
 * Scientific Foundation (2024-2025 Research):
 * - Active Inference / POMDP (Computational Psychiatry, 2025)
 * - Bayesian Cognitive Modeling (Griffiths et al., 2024)
 * - Kalman Filter for EMA mood dynamics (Applied Comp. Psychiatry, 2024)
 * - Belief space planning (ANPL, 2025)
 *
 * Core Concept:
 * In POMDP, the agent maintains a "belief" - a probability distribution
 * over possible hidden states. Each observation updates this belief
 * using Bayes' rule: P(state|observation) ∝ P(observation|state) × P(state)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import type { IStateVector } from '../state/interfaces/IStateVector';
import type { EmotionType } from '../state/interfaces/IEmotionalState';
import type { CognitiveDistortionType } from '../state/interfaces/ICognitiveState';

/**
 * Observation types that can update beliefs
 */
export type ObservationType =
  | 'text_message'         // User message content
  | 'self_report_emotion'  // Direct emotion report
  | 'self_report_mood'     // Mood scale rating
  | 'behavioral'           // Behavioral pattern (time, activity)
  | 'contextual'           // Context (time of day, etc.)
  | 'assessment'           // Formal assessment
  | 'sensor'               // Passive sensing data
  | 'interaction';         // Interaction patterns

/**
 * Single observation
 */
export interface Observation {
  readonly id: string;
  readonly type: ObservationType;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;

  /**
   * Reliability of this observation (0-1)
   * Self-reports typically higher, inferences lower
   */
  readonly reliability: number;

  /**
   * Which state components this observation informs
   */
  readonly informsComponents: ('emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources')[];
}

/**
 * Prior belief about a parameter
 */
export interface Prior {
  readonly mean: number;
  readonly variance: number;
  readonly sampleSize: number;    // Effective observations
  readonly lastUpdated: Date;
}

/**
 * Posterior belief (after observation)
 */
export interface Posterior {
  readonly mean: number;
  readonly variance: number;
  readonly credibleInterval: {
    readonly lower: number;       // 2.5% quantile
    readonly upper: number;       // 97.5% quantile
  };
  readonly updatedAt: Date;
  readonly basedOnObservations: number;
}

/**
 * Belief about a specific dimension
 */
export interface DimensionBelief {
  readonly dimension: string;
  readonly prior: Prior;
  readonly posterior: Posterior;

  /**
   * How much the belief changed with last observation
   */
  readonly beliefShift: number;

  /**
   * Uncertainty reduction from last observation
   */
  readonly informationGain: number;

  /**
   * Stability of belief over time
   */
  readonly stability: number;
}

/**
 * Full belief state over all dimensions
 */
export interface BeliefState {
  readonly userId: string | number;
  readonly timestamp: Date;

  /**
   * Beliefs about emotional state
   */
  readonly emotional: {
    readonly valence: DimensionBelief;
    readonly arousal: DimensionBelief;
    readonly dominance: DimensionBelief;
    readonly primaryEmotion: {
      readonly distribution: Map<EmotionType, number>;  // Probability per emotion
      readonly entropy: number;                         // Uncertainty
    };
  };

  /**
   * Beliefs about cognitive state
   */
  readonly cognitive: {
    readonly selfView: DimensionBelief;
    readonly worldView: DimensionBelief;
    readonly futureView: DimensionBelief;
    readonly distortionPresence: Map<CognitiveDistortionType, number>;
  };

  /**
   * Beliefs about risk
   */
  readonly risk: {
    readonly overallRisk: DimensionBelief;
    readonly categoryRisks: Map<string, DimensionBelief>;
  };

  /**
   * Beliefs about resources
   */
  readonly resources: {
    readonly energy: DimensionBelief;
    readonly copingCapacity: DimensionBelief;
    readonly socialSupport: DimensionBelief;
    readonly perma: {
      readonly positive: DimensionBelief;
      readonly engagement: DimensionBelief;
      readonly relationships: DimensionBelief;
      readonly meaning: DimensionBelief;
      readonly accomplishment: DimensionBelief;
    };
  };

  /**
   * Meta-beliefs (beliefs about our beliefs)
   */
  readonly meta: {
    readonly overallConfidence: number;
    readonly totalObservations: number;
    readonly averageInformationGain: number;
    readonly beliefConsistency: number;       // How consistent beliefs are
    readonly predictionAccuracy: number;      // How accurate past predictions were
  };
}

/**
 * Update result
 */
export interface BeliefUpdateResult {
  readonly previousBelief: BeliefState;
  readonly newBelief: BeliefState;
  readonly observation: Observation;

  /**
   * Which dimensions were updated
   */
  readonly updatedDimensions: string[];

  /**
   * Total information gain
   */
  readonly totalInformationGain: number;

  /**
   * Surprise level (how unexpected was this observation)
   */
  readonly surprise: number;

  /**
   * Significant changes detected
   */
  readonly significantChanges: Array<{
    readonly dimension: string;
    readonly changeType: 'improvement' | 'decline' | 'volatility' | 'stabilization';
    readonly magnitude: number;
    readonly clinicalSignificance: boolean;
  }>;
}

/**
 * Likelihood model - P(observation | state)
 */
export interface LikelihoodModel {
  readonly name: string;

  /**
   * Calculate likelihood of observation given hidden state
   */
  calculateLikelihood(
    observation: Observation,
    hypothesizedState: Partial<IStateVector>
  ): number;

  /**
   * Get observation model parameters
   */
  getParameters(): {
    readonly noiseLevel: number;
    readonly biasCorrection: number;
    readonly temporalSmoothing: number;
  };
}

/**
 * Transition model - P(state_t | state_{t-1})
 */
export interface TransitionModel {
  readonly name: string;

  /**
   * Calculate probability of transitioning from one state to another
   */
  transitionProbability(
    fromState: Partial<IStateVector>,
    toState: Partial<IStateVector>,
    timeDelta: number  // Hours between states
  ): number;

  /**
   * Sample next state given current state
   */
  sampleNextState(
    currentState: Partial<IStateVector>,
    timeDelta: number
  ): Partial<IStateVector>;
}

/**
 * Belief Update Engine Interface
 */
export interface IBeliefUpdateEngine {
  /**
   * Initialize belief state for new user
   */
  initializeBelief(userId: string | number): BeliefState;

  /**
   * Update belief with new observation
   */
  updateBelief(
    currentBelief: BeliefState,
    observation: Observation
  ): BeliefUpdateResult;

  /**
   * Batch update with multiple observations
   */
  batchUpdateBelief(
    currentBelief: BeliefState,
    observations: Observation[]
  ): BeliefUpdateResult;

  /**
   * Convert belief state to point estimate (StateVector)
   */
  beliefToStateVector(belief: BeliefState): IStateVector;

  /**
   * Get uncertainty for specific dimension
   */
  getDimensionUncertainty(
    belief: BeliefState,
    dimension: string
  ): {
    uncertainty: number;
    sampleSizeNeeded: number;
    suggestedObservationType: ObservationType;
  };

  /**
   * Calculate expected information gain from potential observation
   */
  calculateExpectedInfoGain(
    currentBelief: BeliefState,
    potentialObservationType: ObservationType
  ): number;

  /**
   * Get most informative next observation type
   */
  getMostInformativeObservation(
    currentBelief: BeliefState
  ): {
    observationType: ObservationType;
    expectedInfoGain: number;
    targetDimension: string;
    rationale: string;
  };

  /**
   * Check for belief inconsistencies
   */
  checkBeliefConsistency(belief: BeliefState): {
    isConsistent: boolean;
    inconsistencies: Array<{
      dimension1: string;
      dimension2: string;
      conflictType: string;
      resolution: string;
    }>;
  };

  /**
   * Decay beliefs over time (increase uncertainty)
   */
  applyBeliefDecay(
    belief: BeliefState,
    hoursSinceLastUpdate: number
  ): BeliefState;

  /**
   * Get belief history for dimension
   */
  getBeliefHistory(
    userId: string | number,
    dimension: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{
    timestamp: Date;
    mean: number;
    variance: number;
  }>>;
}

/**
 * Configuration for Belief Update Engine
 */
export interface BeliefEngineConfig {
  /**
   * Prior variance for new users
   */
  readonly defaultPriorVariance: number;

  /**
   * Minimum variance (prevent overconfidence)
   */
  readonly minVariance: number;

  /**
   * Decay rate per hour (increase in variance)
   */
  readonly beliefDecayRate: number;

  /**
   * Threshold for "significant" belief change
   */
  readonly significanceThreshold: number;

  /**
   * Reliability weights by observation type
   */
  readonly reliabilityWeights: Record<ObservationType, number>;

  /**
   * Enable Active Inference (minimize prediction error)
   */
  readonly useActiveInference: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_BELIEF_CONFIG: BeliefEngineConfig = {
  defaultPriorVariance: 0.25,
  minVariance: 0.01,
  beliefDecayRate: 0.01,  // Variance increases by 1% per hour
  significanceThreshold: 0.2,
  reliabilityWeights: {
    'self_report_emotion': 0.9,
    'self_report_mood': 0.85,
    'assessment': 0.95,
    'text_message': 0.7,
    'behavioral': 0.6,
    'contextual': 0.5,
    'sensor': 0.65,
    'interaction': 0.55,
  },
  useActiveInference: true,
};

/**
 * Emotion priors based on population data
 * Used for initializing beliefs for new users
 */
export const POPULATION_EMOTION_PRIORS: Record<EmotionType, number> = {
  neutral: 0.3,
  calm: 0.1,
  contentment: 0.08,
  joy: 0.05,
  sadness: 0.08,
  anxiety: 0.07,
  stress: 0.1,
  frustration: 0.05,
  boredom: 0.05,
  // ... lower probability for others
  anger: 0.02,
  fear: 0.02,
  surprise: 0.01,
  disgust: 0.01,
  trust: 0.01,
  anticipation: 0.01,
  love: 0.01,
  guilt: 0.01,
  shame: 0.01,
  hope: 0.01,
  confusion: 0.01,
  loneliness: 0.01,
  excitement: 0.01,
  irritation: 0.01,
  despair: 0.005,
  pride: 0.005,
  gratitude: 0.005,
  envy: 0.005,
  jealousy: 0.005,
  overwhelm: 0.005,
  numbness: 0.005,
  curiosity: 0.01,
  awe: 0.005,
  // Crisis-related emotions (Phase 6.2)
  hopelessness: 0.002,  // Very low prior - crisis indicator
  relief: 0.01,
  apathy: 0.01,
  resentment: 0.01,
};
