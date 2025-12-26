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
export type ObservationSource = 'message' | 'self_report' | 'behavioral' | 'contextual' | 'scheduled' | 'inference';
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
        readonly emotional: number;
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
    readonly confidence: number;
    /**
     * Entropy of belief (uncertainty measure)
     */
    readonly entropy: number;
    /**
     * Last observation that updated belief
     */
    readonly lastObservation: {
        readonly source: ObservationSource;
        readonly timestamp: Date;
        readonly informationGain: number;
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
        readonly improvement: number;
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
    fromMessage(userId: string | number, message: string, previousState?: IStateVector): Promise<IStateVector>;
    /**
     * Create from conversation history
     */
    fromConversation(userId: string | number, messages: Array<{
        text: string;
        timestamp: Date;
        isUser: boolean;
    }>, previousState?: IStateVector): Promise<IStateVector>;
    /**
     * Create from self-report assessment
     */
    fromAssessment(userId: string | number, assessment: Record<string, number | string>, previousState?: IStateVector): Promise<IStateVector>;
    /**
     * Create initial state for new user
     */
    createInitial(userId: string | number): IStateVector;
    /**
     * Merge partial updates into existing state
     */
    merge(currentState: IStateVector, updates: Partial<{
        emotional: Partial<IEmotionalState>;
        cognitive: Partial<ICognitiveState>;
        narrative: Partial<INarrativeState>;
        risk: Partial<IRiskState>;
        resources: Partial<IResourceState>;
    }>): IStateVector;
    /**
     * Apply Bayesian update based on new observation
     */
    applyObservation(currentState: IStateVector, observation: {
        source: ObservationSource;
        data: string | Record<string, unknown>;
    }): Promise<IStateVector>;
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
    updateState(userId: string | number, observation: {
        source: ObservationSource;
        data: string | Record<string, unknown>;
    }): Promise<IStateVector>;
    /**
     * Get state history
     */
    getStateHistory(userId: string | number, timeframe: {
        start: Date;
        end: Date;
    }): Promise<IStateVector[]>;
    /**
     * Get state trajectory
     */
    getTrajectory(userId: string | number, component: 'emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources'): Promise<{
        trend: 'improving' | 'stable' | 'declining' | 'volatile';
        dataPoints: Array<{
            timestamp: Date;
            value: number;
        }>;
        prediction: {
            value: number;
            confidence: number;
        };
    }>;
    /**
     * Get intervention recommendations
     */
    getRecommendations(userId: string | number): Promise<StateBasedRecommendation[]>;
    /**
     * Generate state summary
     */
    generateSummary(state: IStateVector): StateSummary;
    /**
     * Predict future state
     */
    predictState(currentState: IStateVector, timeframe: '6h' | '12h' | '24h' | '72h' | '1w'): Promise<TemporalPrediction>;
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
    getByTimeRange(userId: string | number, start: Date, end: Date): Promise<IStateVector[]>;
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
export declare const WELLBEING_WEIGHTS: {
    readonly emotional: {
        readonly valence: 0.25;
        readonly arousal: 0.1;
        readonly dominance: 0.15;
    };
    readonly cognitive: {
        readonly coreBeliefs: 0.15;
        readonly distortionAbsence: 0.1;
    };
    readonly narrative: {
        readonly stageProgress: 0.05;
        readonly roleGrowth: 0.05;
    };
    readonly risk: {
        readonly safetyInverse: 0.05;
    };
    readonly resources: {
        readonly perma: 0.1;
    };
};
/**
 * Index calculation thresholds
 */
export declare const INDEX_THRESHOLDS: {
    readonly wellbeing: {
        readonly critical: 20;
        readonly low: 40;
        readonly moderate: 60;
        readonly good: 80;
        readonly excellent: 95;
    };
    readonly stability: {
        readonly volatile: 20;
        readonly unstable: 40;
        readonly moderate: 60;
        readonly stable: 80;
        readonly veryStable: 95;
    };
    readonly urgency: {
        readonly none: 20;
        readonly low: 40;
        readonly moderate: 60;
        readonly high: 80;
        readonly critical: 95;
    };
};
/**
 * Component status for display
 */
export type ComponentStatus = 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';
/**
 * Calculate component status from score
 */
export declare function getComponentStatus(score: number): ComponentStatus;
/**
 * Age group for age-adaptive recommendations
 */
export type AgeGroup = 'child' | 'teen' | 'adult';
//# sourceMappingURL=IStateVector.d.ts.map