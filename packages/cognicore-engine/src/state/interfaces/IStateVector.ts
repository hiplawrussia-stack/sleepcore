/**
 * 🧬 STATE VECTOR INTERFACE
 * =========================
 * Master Interface - POMDP State Vector S_t
 * World-First Complete Human Wellbeing State Representation
 *
 * Mathematical Foundation:
 * S_t = (e_t, c_t, n_t, r_t, b_t)
 *
 * Where:
 * - e_t: Emotional State (VAD + discrete emotions)
 * - c_t: Cognitive State (Beck's triad + distortions)
 * - n_t: Narrative State (Story arc + change stage)
 * - r_t: Risk State (Multi-layer risk assessment)
 * - b_t: Resource State (PERMA + coping resources)
 *
 * Scientific Foundation:
 * - POMDP Framework (Kaelbling et al., 1998)
 * - Integrated Theory of Wellbeing
 * - Dynamic Systems Theory of Change
 * - Computational Psychiatry (Huys et al., 2016)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import type { IEmotionalState } from './IEmotionalState';
import type { ICognitiveState } from './ICognitiveState';
import type { INarrativeState } from './INarrativeState';
import type { IRiskState } from './IRiskState';
import type { IResourceState } from './IResourceState';

/**
 * Observation source
 */
export type ObservationSource =
  | 'message'           // Direct text message
  | 'self_report'       // User-provided assessment
  | 'behavioral'        // Behavioral inference
  | 'contextual'        // Time, pattern-based
  | 'scheduled'         // Proactive check-in
  | 'inference';        // AI-derived

/**
 * State quality metrics
 */
export interface StateQuality {
  /**
   * Overall data quality (0.0 - 1.0)
   */
  readonly overall: number;

  /**
   * Per-component quality
   */
  readonly components: {
    readonly emotional: number;
    readonly cognitive: number;
    readonly narrative: number;
    readonly risk: number;
    readonly resources: number;
  };

  /**
   * Time since last reliable update
   */
  readonly staleness: {
    readonly emotional: number;   // seconds
    readonly cognitive: number;
    readonly narrative: number;
    readonly risk: number;
    readonly resources: number;
  };

  /**
   * Sufficient data for reliable inference
   */
  readonly sufficient: boolean;
}

/**
 * POMDP Belief state (uncertainty representation)
 */
export interface BeliefState {
  /**
   * Probability distribution over possible states
   * (simplified as confidence intervals)
   */
  readonly confidence: number;       // 0.0 - 1.0

  /**
   * Entropy of belief (uncertainty measure)
   */
  readonly entropy: number;          // 0.0 - 1.0 (0 = certain, 1 = max uncertainty)

  /**
   * Last observation that updated belief
   */
  readonly lastObservation: {
    readonly source: ObservationSource;
    readonly timestamp: Date;
    readonly informationGain: number;  // How much this observation helped
  };

  /**
   * Observation history (for Bayesian updates)
   */
  readonly observationCount: number;
}

/**
 * State transition tracking
 */
export interface StateTransition {
  readonly from: Partial<IStateVector>;
  readonly to: Partial<IStateVector>;
  readonly timestamp: Date;
  readonly trigger: ObservationSource;
  readonly significance: 'minor' | 'moderate' | 'major';
  readonly components: ('emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources')[];
}

/**
 * Temporal prediction
 */
export interface TemporalPrediction {
  readonly timeframe: '6h' | '12h' | '24h' | '72h' | '1w';
  readonly predictedState: Partial<IStateVector>;
  readonly confidence: number;
  readonly keyFactors: string[];
  readonly preventiveActions: string[];
  readonly calculatedAt: Date;
}

/**
 * State summary (human-readable)
 */
export interface StateSummary {
  /**
   * One-line summary
   */
  readonly brief: string;

  /**
   * Key insights
   */
  readonly insights: string[];

  /**
   * Immediate concerns (if any)
   */
  readonly concerns: string[];

  /**
   * Positive aspects
   */
  readonly positives: string[];

  /**
   * Recommended focus areas
   */
  readonly focusAreas: string[];

  /**
   * Overall wellbeing score (0-100)
   */
  readonly wellbeingScore: number;
}

/**
 * Intervention recommendation based on state
 */
export interface StateBasedRecommendation {
  readonly id: string;
  readonly type: 'intervention' | 'resource' | 'activity' | 'connection' | 'check_in';
  readonly title: string;
  readonly description: string;
  readonly priority: 'immediate' | 'high' | 'medium' | 'low';
  readonly confidence: number;
  readonly targetedComponents: ('emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources')[];
  readonly expectedImpact: {
    readonly component: string;
    readonly improvement: number;  // 0.0 - 1.0
  }[];
  readonly contraindications?: string[];
}

/**
 * 🧬 MAIN STATE VECTOR INTERFACE
 * Complete representation of human psychological state
 */
export interface IStateVector {
  /**
   * Unique identifier for this state snapshot
   */
  readonly id: string;

  /**
   * User this state belongs to
   */
  readonly userId: string | number;

  /**
   * Timestamp of this state
   */
  readonly timestamp: Date;

  // ===== CORE COMPONENTS (S_t = e_t, c_t, n_t, r_t, b_t) =====

  /**
   * Emotional State (e_t)
   * VAD dimensions + discrete emotions
   */
  readonly emotional: IEmotionalState;

  /**
   * Cognitive State (c_t)
   * Beck's triad + cognitive distortions
   */
  readonly cognitive: ICognitiveState;

  /**
   * Narrative State (n_t)
   * Story arc + change stage + role
   */
  readonly narrative: INarrativeState;

  /**
   * Risk State (r_t)
   * Multi-layer risk assessment
   */
  readonly risk: IRiskState;

  /**
   * Resource State (b_t)
   * PERMA + coping + support
   */
  readonly resources: IResourceState;

  // ===== META INFORMATION =====

  /**
   * Belief state (POMDP uncertainty)
   */
  readonly belief: BeliefState;

  /**
   * Data quality metrics
   */
  readonly quality: StateQuality;

  /**
   * Recent transitions
   */
  readonly recentTransitions: StateTransition[];

  /**
   * Temporal predictions
   */
  readonly predictions: TemporalPrediction[];

  /**
   * Human-readable summary
   */
  readonly summary: StateSummary;

  /**
   * Recommended interventions based on state
   */
  readonly recommendations: StateBasedRecommendation[];

  // ===== COMPUTED AGGREGATES =====

  /**
   * Overall wellbeing index (0-100)
   * Weighted combination of all components
   */
  readonly wellbeingIndex: number;

  /**
   * Stability index (0-100)
   * How stable is the overall state
   */
  readonly stabilityIndex: number;

  /**
   * Resilience index (0-100)
   * Capacity to recover from challenges
   */
  readonly resilienceIndex: number;

  /**
   * Intervention urgency (0-100)
   * How urgently intervention is needed
   */
  readonly interventionUrgency: number;
}

/**
 * State Vector Builder
 */
export interface IStateVectorBuilder {
  setUserId(userId: string | number): this;
  setEmotionalState(state: IEmotionalState): this;
  setCognitiveState(state: ICognitiveState): this;
  setNarrativeState(state: INarrativeState): this;
  setRiskState(state: IRiskState): this;
  setResourceState(state: IResourceState): this;
  setBelief(belief: BeliefState): this;
  addTransition(transition: StateTransition): this;
  addPrediction(prediction: TemporalPrediction): this;
  addRecommendation(recommendation: StateBasedRecommendation): this;
  build(): IStateVector;
}

/**
 * State Vector Factory
 */
export interface IStateVectorFactory {
  /**
   * Create from single message
   */
  fromMessage(
    userId: string | number,
    message: string,
    previousState?: IStateVector
  ): Promise<IStateVector>;

  /**
   * Create from conversation history
   */
  fromConversation(
    userId: string | number,
    messages: Array<{ text: string; timestamp: Date; isUser: boolean }>,
    previousState?: IStateVector
  ): Promise<IStateVector>;

  /**
   * Create from self-report assessment
   */
  fromAssessment(
    userId: string | number,
    assessment: Record<string, number | string>,
    previousState?: IStateVector
  ): Promise<IStateVector>;

  /**
   * Create initial state for new user
   */
  createInitial(userId: string | number): IStateVector;

  /**
   * Merge partial updates into existing state
   */
  merge(
    currentState: IStateVector,
    updates: Partial<{
      emotional: Partial<IEmotionalState>;
      cognitive: Partial<ICognitiveState>;
      narrative: Partial<INarrativeState>;
      risk: Partial<IRiskState>;
      resources: Partial<IResourceState>;
    }>
  ): IStateVector;

  /**
   * Apply Bayesian update based on new observation
   */
  applyObservation(
    currentState: IStateVector,
    observation: {
      source: ObservationSource;
      data: string | Record<string, unknown>;
    }
  ): Promise<IStateVector>;
}

/**
 * State Vector Service
 */
export interface IStateVectorService {
  /**
   * Get current state for user
   */
  getCurrentState(userId: string | number): Promise<IStateVector | null>;

  /**
   * Update state with new observation
   */
  updateState(
    userId: string | number,
    observation: {
      source: ObservationSource;
      data: string | Record<string, unknown>;
    }
  ): Promise<IStateVector>;

  /**
   * Get state history
   */
  getStateHistory(
    userId: string | number,
    timeframe: { start: Date; end: Date }
  ): Promise<IStateVector[]>;

  /**
   * Get state trajectory
   */
  getTrajectory(
    userId: string | number,
    component: 'emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources'
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining' | 'volatile';
    dataPoints: Array<{ timestamp: Date; value: number }>;
    prediction: { value: number; confidence: number };
  }>;

  /**
   * Get intervention recommendations
   */
  getRecommendations(
    userId: string | number
  ): Promise<StateBasedRecommendation[]>;

  /**
   * Generate state summary
   */
  generateSummary(state: IStateVector): StateSummary;

  /**
   * Predict future state
   */
  predictState(
    currentState: IStateVector,
    timeframe: '6h' | '12h' | '24h' | '72h' | '1w'
  ): Promise<TemporalPrediction>;
}

/**
 * State Vector Repository (persistence)
 */
export interface IStateVectorRepository {
  /**
   * Save state snapshot
   */
  save(state: IStateVector): Promise<void>;

  /**
   * Get latest state
   */
  getLatest(userId: string | number): Promise<IStateVector | null>;

  /**
   * Get states in time range
   */
  getByTimeRange(
    userId: string | number,
    start: Date,
    end: Date
  ): Promise<IStateVector[]>;

  /**
   * Get state count for user
   */
  getCount(userId: string | number): Promise<number>;

  /**
   * Delete old states (retention policy)
   */
  deleteOlderThan(userId: string | number, date: Date): Promise<number>;
}

/**
 * Wellbeing index calculation weights
 */
export const WELLBEING_WEIGHTS = {
  emotional: {
    valence: 0.25,
    arousal: 0.1,
    dominance: 0.15
  },
  cognitive: {
    coreBeliefs: 0.15,
    distortionAbsence: 0.1
  },
  narrative: {
    stageProgress: 0.05,
    roleGrowth: 0.05
  },
  risk: {
    safetyInverse: 0.05  // Higher safety = higher wellbeing
  },
  resources: {
    perma: 0.1
  }
} as const;

/**
 * Index calculation thresholds
 */
export const INDEX_THRESHOLDS = {
  wellbeing: {
    critical: 20,
    low: 40,
    moderate: 60,
    good: 80,
    excellent: 95
  },
  stability: {
    volatile: 20,
    unstable: 40,
    moderate: 60,
    stable: 80,
    veryStable: 95
  },
  urgency: {
    none: 20,
    low: 40,
    moderate: 60,
    high: 80,
    critical: 95
  }
} as const;

/**
 * Component status for display
 */
export type ComponentStatus = 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';

/**
 * Calculate component status from score
 */
export function getComponentStatus(score: number): ComponentStatus {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'moderate';
  if (score >= 0.2) return 'concerning';
  return 'critical';
}

/**
 * Age group for age-adaptive recommendations
 */
export type AgeGroup = 'child' | 'teen' | 'adult';
