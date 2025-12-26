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
export type ObservationType = 'text_message' | 'self_report_emotion' | 'self_report_mood' | 'behavioral' | 'contextual' | 'assessment' | 'sensor' | 'interaction';
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
    readonly sampleSize: number;
    readonly lastUpdated: Date;
}
/**
 * Posterior belief (after observation)
 */
export interface Posterior {
    readonly mean: number;
    readonly variance: number;
    readonly credibleInterval: {
        readonly lower: number;
        readonly upper: number;
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
            readonly distribution: Map<EmotionType, number>;
            readonly entropy: number;
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
        readonly beliefConsistency: number;
        readonly predictionAccuracy: number;
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
    calculateLikelihood(observation: Observation, hypothesizedState: Partial<IStateVector>): number;
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
    transitionProbability(fromState: Partial<IStateVector>, toState: Partial<IStateVector>, timeDelta: number): number;
    /**
     * Sample next state given current state
     */
    sampleNextState(currentState: Partial<IStateVector>, timeDelta: number): Partial<IStateVector>;
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
    updateBelief(currentBelief: BeliefState, observation: Observation): BeliefUpdateResult;
    /**
     * Batch update with multiple observations
     */
    batchUpdateBelief(currentBelief: BeliefState, observations: Observation[]): BeliefUpdateResult;
    /**
     * Convert belief state to point estimate (StateVector)
     */
    beliefToStateVector(belief: BeliefState): IStateVector;
    /**
     * Get uncertainty for specific dimension
     */
    getDimensionUncertainty(belief: BeliefState, dimension: string): {
        uncertainty: number;
        sampleSizeNeeded: number;
        suggestedObservationType: ObservationType;
    };
    /**
     * Calculate expected information gain from potential observation
     */
    calculateExpectedInfoGain(currentBelief: BeliefState, potentialObservationType: ObservationType): number;
    /**
     * Get most informative next observation type
     */
    getMostInformativeObservation(currentBelief: BeliefState): {
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
    applyBeliefDecay(belief: BeliefState, hoursSinceLastUpdate: number): BeliefState;
    /**
     * Get belief history for dimension
     */
    getBeliefHistory(userId: string | number, dimension: string, timeRange: {
        start: Date;
        end: Date;
    }): Promise<Array<{
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
export declare const DEFAULT_BELIEF_CONFIG: BeliefEngineConfig;
/**
 * Emotion priors based on population data
 * Used for initializing beliefs for new users
 */
export declare const POPULATION_EMOTION_PRIORS: Record<EmotionType, number>;
//# sourceMappingURL=IBeliefUpdate.d.ts.map