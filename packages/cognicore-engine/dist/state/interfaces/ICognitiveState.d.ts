/**
 * 🧠 COGNITIVE STATE INTERFACE
 * ============================
 * Beck's Cognitive Model + Bayesian Belief Tracking
 * Deep Cognitive Mirror - первый в мире когнитивный трекер
 *
 * Scientific Foundation:
 * - Beck's Cognitive Triad (1967, 1979)
 * - Cognitive Distortion Theory (Burns, 1980)
 * - Bayesian Cognitive Modeling (Tenenbaum, 2011)
 * - Predictive Processing Framework (Clark, 2013)
 *
 * Unique Innovation:
 * - Real-time cognitive distortion detection
 * - Bayesian belief update tracking
 * - Core belief trajectory prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
import type { EmotionType } from './IEmotionalState';
/**
 * Beck's Cognitive Triad dimensions
 * Core beliefs about self, world, and future
 * Scale: -1.0 (extremely negative) to +1.0 (extremely positive)
 */
export interface CognitiveTriad {
    /**
     * Self-view: How the person perceives themselves
     * -1.0 = "I am worthless, incompetent, unlovable"
     * +1.0 = "I am valuable, capable, lovable"
     */
    readonly selfView: number;
    /**
     * World-view: How the person perceives the world/others
     * -1.0 = "The world is hostile, unfair, dangerous"
     * +1.0 = "The world is supportive, fair, safe"
     */
    readonly worldView: number;
    /**
     * Future-view: How the person perceives the future
     * -1.0 = "The future is hopeless, nothing will change"
     * +1.0 = "The future is hopeful, things will improve"
     */
    readonly futureView: number;
    /**
     * Confidence in each belief (0.0 - 1.0)
     */
    readonly confidence: {
        readonly self: number;
        readonly world: number;
        readonly future: number;
    };
}
/**
 * Cognitive distortion types (Burns, 1980 + extensions)
 */
export type CognitiveDistortionType = 'all_or_nothing' | 'black_and_white' | 'overgeneralization' | 'mental_filter' | 'disqualifying_positive' | 'jumping_to_conclusions' | 'magnification' | 'catastrophizing' | 'minimization' | 'emotional_reasoning' | 'should_statements' | 'labeling' | 'personalization' | 'blame' | 'comparison' | 'fomo' | 'imposter_syndrome' | 'perfectionism' | 'mind_reading' | 'fortune_telling' | 'filtering' | 'splitting' | 'control_fallacy';
/**
 * Detected cognitive distortion
 */
export interface CognitiveDistortion {
    readonly type: CognitiveDistortionType;
    readonly confidence: number;
    readonly intensity: number;
    readonly triggeredBy: string;
    readonly associatedEmotion?: EmotionType;
    readonly correctionSuggestion?: string;
    readonly detectedAt: Date;
}
/**
 * Attentional bias patterns
 * Where attention is primarily directed
 */
export type AttentionalBias = 'threat' | 'reward' | 'neutral' | 'avoidant' | 'rumination' | 'worry';
/**
 * Thinking style assessment
 */
export interface ThinkingStyle {
    /**
     * Analytical vs Intuitive (0 = intuitive, 1 = analytical)
     */
    readonly analyticalVsIntuitive: number;
    /**
     * Abstract vs Concrete (0 = concrete, 1 = abstract)
     */
    readonly abstractVsConcrete: number;
    /**
     * Internal vs External locus of control
     */
    readonly locusOfControl: 'internal' | 'external' | 'balanced';
    /**
     * Flexibility of thinking (0 = rigid, 1 = flexible)
     */
    readonly flexibility: number;
}
/**
 * Bayesian belief update record
 * Tracks how beliefs change over time
 */
export interface BeliefUpdate {
    readonly beliefType: 'self' | 'world' | 'future';
    readonly priorValue: number;
    readonly posteriorValue: number;
    readonly evidenceStrength: number;
    readonly evidenceType: 'message' | 'behavior' | 'self_report' | 'inference';
    readonly updatedAt: Date;
}
/**
 * Core belief pattern (intermediate beliefs)
 */
export interface CoreBeliefPattern {
    readonly id: string;
    readonly category: 'unlovability' | 'worthlessness' | 'helplessness' | 'defectiveness' | 'vulnerability' | 'incompetence';
    readonly strength: number;
    readonly evidence: string[];
    readonly counterEvidence: string[];
    readonly associatedRules: string[];
    readonly formationContext?: string;
}
/**
 * Cognitive load indicator
 */
export interface CognitiveLoad {
    /**
     * Current mental load (0.0 - 1.0)
     * High = reduced capacity for processing
     */
    readonly current: number;
    /**
     * Factors contributing to load
     */
    readonly factors: Array<{
        readonly factor: 'stress' | 'fatigue' | 'multitasking' | 'emotional' | 'decision_fatigue' | 'information_overload';
        readonly contribution: number;
    }>;
    /**
     * Available cognitive resources (0.0 - 1.0)
     */
    readonly availableResources: number;
}
/**
 * Metacognition assessment
 * Thinking about thinking
 */
export interface Metacognition {
    /**
     * Awareness of own cognitive patterns
     */
    readonly selfAwareness: number;
    /**
     * Ability to step back and observe thoughts
     */
    readonly defusion: number;
    /**
     * Belief in ability to change thought patterns
     */
    readonly changeBeliefs: number;
    /**
     * Worry about worry (meta-worry)
     */
    readonly metaWorry: number;
}
/**
 * 🧠 Main Cognitive State Interface
 * Core component of State Vector S_t (c_t)
 */
export interface ICognitiveState {
    /**
     * Beck's Cognitive Triad assessment
     */
    readonly coreBeliefs: CognitiveTriad;
    /**
     * Active cognitive distortions
     * Sorted by intensity (highest first)
     */
    readonly activeDistortions: CognitiveDistortion[];
    /**
     * Overall distortion intensity (0.0 - 1.0)
     * Aggregate of all active distortions
     */
    readonly distortionIntensity: number;
    /**
     * Uncertainty in belief assessments
     * High = beliefs may not be accurate
     */
    readonly beliefUncertainty: number;
    /**
     * Current attentional bias
     */
    readonly attentionalBias: AttentionalBias;
    /**
     * Thinking style characteristics
     */
    readonly thinkingStyle: ThinkingStyle;
    /**
     * Identified core belief patterns
     */
    readonly coreBeliefPatterns: CoreBeliefPattern[];
    /**
     * Current cognitive load
     */
    readonly cognitiveLoad: CognitiveLoad;
    /**
     * Metacognitive abilities
     */
    readonly metacognition: Metacognition;
    /**
     * Recent belief updates (for trajectory tracking)
     */
    readonly recentUpdates: BeliefUpdate[];
    /**
     * Timestamp of this cognitive state
     */
    readonly timestamp: Date;
    /**
     * Confidence in overall assessment
     */
    readonly confidence: number;
    /**
     * Data quality (0.0 - 1.0)
     */
    readonly dataQuality: number;
}
/**
 * Cognitive State Builder
 */
export interface ICognitiveStateBuilder {
    setCoreBeliefs(selfView: number, worldView: number, futureView: number): this;
    setBeliefConfidence(self: number, world: number, future: number): this;
    addDistortion(distortion: CognitiveDistortion): this;
    setAttentionalBias(bias: AttentionalBias): this;
    setThinkingStyle(style: ThinkingStyle): this;
    addCoreBeliefPattern(pattern: CoreBeliefPattern): this;
    setCognitiveLoad(load: CognitiveLoad): this;
    setMetacognition(meta: Metacognition): this;
    addBeliefUpdate(update: BeliefUpdate): this;
    build(): ICognitiveState;
}
/**
 * Cognitive State Factory
 */
export interface ICognitiveStateFactory {
    /**
     * Analyze text for cognitive patterns
     */
    fromTextAnalysis(text: string, previousState?: ICognitiveState): Promise<ICognitiveState>;
    /**
     * Create from structured assessment
     */
    fromAssessment(triad: Partial<CognitiveTriad>, distortions: CognitiveDistortionType[]): ICognitiveState;
    /**
     * Apply Bayesian update to existing state
     */
    applyBayesianUpdate(currentState: ICognitiveState, newEvidence: {
        text: string;
        emotionalContext?: EmotionType;
    }): ICognitiveState;
    /**
     * Create neutral/baseline state
     */
    createNeutral(): ICognitiveState;
}
/**
 * Cognitive Distortion Detector Interface
 */
export interface ICognitiveDistortionDetector {
    /**
     * Detect distortions in text
     */
    detect(text: string): Promise<CognitiveDistortion[]>;
    /**
     * Get correction suggestion for distortion
     */
    suggestCorrection(distortion: CognitiveDistortion, context: string): string;
    /**
     * Get therapeutic intervention for distortion pattern
     */
    getIntervention(distortionType: CognitiveDistortionType): {
        name: string;
        technique: string;
        steps: string[];
        duration: number;
    };
}
/**
 * Distortion patterns for detection (Russian language)
 */
export declare const DISTORTION_PATTERNS: Record<CognitiveDistortionType, {
    keywords: string[];
    phrases: string[];
    description: string;
    correction: string;
}>;
/**
 * Therapeutic interventions for each distortion
 */
export declare const DISTORTION_INTERVENTIONS: Record<CognitiveDistortionType, {
    technique: string;
    description: string;
    steps: string[];
    durationMinutes: number;
}>;
//# sourceMappingURL=ICognitiveState.d.ts.map