/**
 * 🎭 EMOTIONAL STATE INTERFACE
 * ============================
 * World-class emotion representation using VAD (Valence-Arousal-Dominance) model
 * Combined with discrete emotion taxonomy for comprehensive state tracking
 *
 * Scientific Foundation:
 * - Russell's Circumplex Model (1980)
 * - Mehrabian & Russell VAD Model (1974)
 * - Plutchik's Wheel of Emotions (1980)
 * - Barrett's Theory of Constructed Emotion (2017)
 *
 * Integration Points:
 * - Compatible with existing EnhancedEmotionalRecognitionService (40+ emotions)
 * - Crisis detection compatible (CrisisPipeline integration)
 * - Age-adaptive recommendations support
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Discrete emotion taxonomy (aligned with existing system)
 * Extended from Plutchik's 8 basic emotions + compound emotions
 */
type EmotionType$1 = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'trust' | 'anticipation' | 'love' | 'guilt' | 'shame' | 'anxiety' | 'stress' | 'frustration' | 'hope' | 'confusion' | 'loneliness' | 'boredom' | 'excitement' | 'calm' | 'irritation' | 'despair' | 'contentment' | 'pride' | 'gratitude' | 'envy' | 'jealousy' | 'overwhelm' | 'numbness' | 'curiosity' | 'awe' | 'hopelessness' | 'relief' | 'apathy' | 'resentment' | 'neutral';
/**
 * Emotion trend direction
 */
type EmotionTrend = 'improving' | 'stable' | 'declining' | 'volatile';
/**
 * VAD (Valence-Arousal-Dominance) dimensional representation
 * Each dimension: -1.0 to +1.0
 */
interface VADDimensions {
    /**
     * Valence: pleasure-displeasure dimension
     * -1.0 = extreme displeasure (despair)
     * +1.0 = extreme pleasure (ecstasy)
     */
    readonly valence: number;
    /**
     * Arousal: activation-deactivation dimension
     * -1.0 = very calm, sleepy
     * +1.0 = very excited, alert
     */
    readonly arousal: number;
    /**
     * Dominance: control-submission dimension
     * -1.0 = feeling controlled, helpless
     * +1.0 = feeling in control, empowered
     */
    readonly dominance: number;
}
/**
 * Emotion with confidence score
 */
interface ScoredEmotion {
    readonly emotion: EmotionType$1;
    readonly confidence: number;
    readonly intensity: number;
}
/**
 * Temporal emotion pattern
 */
interface EmotionPattern {
    readonly patternId: string;
    readonly name: string;
    readonly description: string;
    readonly emotions: EmotionType$1[];
    readonly typicalDuration: {
        readonly min: number;
        readonly max: number;
    };
    readonly triggers: string[];
    readonly therapeuticImplications: string[];
}
/**
 * Emotion regulation strategy effectiveness
 */
interface RegulationEffectiveness {
    readonly strategyId: string;
    readonly strategyName: string;
    readonly usageCount: number;
    readonly averageEffectiveness: number;
    readonly bestForEmotions: EmotionType$1[];
    readonly lastUsed?: Date;
}
/**
 * 🎭 Main Emotional State Interface
 * Core component of State Vector S_t
 */
interface IEmotionalState$1 {
    /**
     * Primary detected emotion
     */
    readonly primary: ScoredEmotion;
    /**
     * Secondary emotions present (up to 3)
     */
    readonly secondary: ScoredEmotion[];
    /**
     * Overall emotional intensity (0.0 - 1.0)
     * Aggregated from primary + secondary
     */
    readonly intensity: number;
    /**
     * VAD dimensional representation
     * Provides continuous emotion space mapping
     */
    readonly vad: VADDimensions;
    /**
     * Emotional trend over recent period (24h)
     */
    readonly trend: EmotionTrend;
    /**
     * Volatility score (0.0 - 1.0)
     * High = frequent emotional changes
     * Low = stable emotional state
     */
    readonly volatility: number;
    /**
     * Detected emotion patterns
     * E.g., "morning anxiety", "evening stress"
     */
    readonly patterns: EmotionPattern[];
    /**
     * Effective regulation strategies for this user
     */
    readonly effectiveStrategies: RegulationEffectiveness[];
    /**
     * Timestamp of this emotional state
     */
    readonly timestamp: Date;
    /**
     * Confidence in the overall assessment (0.0 - 1.0)
     */
    readonly confidence: number;
    /**
     * Source of the emotion detection
     */
    readonly source: 'text_analysis' | 'self_report' | 'behavioral_inference' | 'combined';
    /**
     * Data quality score (0.0 - 1.0)
     * Based on message length, clarity, context availability
     */
    readonly dataQuality: number;
}
/**
 * Emotional State Builder (for immutable construction)
 */
interface IEmotionalStateBuilder {
    setPrimary(emotion: EmotionType$1, confidence: number, intensity: number): this;
    addSecondary(emotion: EmotionType$1, confidence: number, intensity: number): this;
    setVAD(valence: number, arousal: number, dominance: number): this;
    setTrend(trend: EmotionTrend): this;
    setVolatility(volatility: number): this;
    addPattern(pattern: EmotionPattern): this;
    addEffectiveStrategy(strategy: RegulationEffectiveness): this;
    setSource(source: IEmotionalState$1['source']): this;
    setDataQuality(quality: number): this;
    build(): IEmotionalState$1;
}
/**
 * Emotional State Factory Interface
 */
interface IEmotionalStateFactory {
    /**
     * Create from text analysis
     */
    fromTextAnalysis(text: string, previousState?: IEmotionalState$1): Promise<IEmotionalState$1>;
    /**
     * Create from self-reported emotion
     */
    fromSelfReport(reportedEmotion: EmotionType$1, intensity: number, previousState?: IEmotionalState$1): Promise<IEmotionalState$1>;
    /**
     * Create from legacy system format
     * (compatibility with EnhancedEmotionalRecognitionService)
     */
    fromLegacyAnalysis(legacyResult: {
        primaryEmotion: string;
        emotionIntensity: number;
        riskLevel: string;
        recommendations: unknown[];
    }): IEmotionalState$1;
    /**
     * Create neutral baseline state
     */
    createNeutral(): IEmotionalState$1;
    /**
     * Merge multiple emotional states (e.g., from different sources)
     */
    merge(states: IEmotionalState$1[]): IEmotionalState$1;
}
/**
 * VAD Mapping utilities
 * Maps discrete emotions to VAD space and vice versa
 */
interface IVADMapper {
    /**
     * Convert discrete emotion to VAD coordinates
     */
    emotionToVAD(emotion: EmotionType$1, intensity?: number): VADDimensions;
    /**
     * Find closest discrete emotion from VAD coordinates
     */
    vadToEmotion(vad: VADDimensions): ScoredEmotion;
    /**
     * Calculate emotional distance in VAD space
     */
    calculateDistance(vad1: VADDimensions, vad2: VADDimensions): number;
    /**
     * Interpolate between two VAD states
     */
    interpolate(from: VADDimensions, to: VADDimensions, t: number): VADDimensions;
}
/**
 * Default VAD mappings for common emotions
 * Based on Mehrabian & Russell research + ANEW database
 */
declare const DEFAULT_EMOTION_VAD: Record<EmotionType$1, VADDimensions>;
/**
 * Emotion to therapy approach mapping
 * Used for intervention selection
 */
declare const EMOTION_THERAPY_MAPPING: Record<EmotionType$1, string[]>;

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

/**
 * Beck's Cognitive Triad dimensions
 * Core beliefs about self, world, and future
 * Scale: -1.0 (extremely negative) to +1.0 (extremely positive)
 */
interface CognitiveTriad {
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
type CognitiveDistortionType = 'all_or_nothing' | 'black_and_white' | 'overgeneralization' | 'mental_filter' | 'disqualifying_positive' | 'jumping_to_conclusions' | 'magnification' | 'catastrophizing' | 'minimization' | 'emotional_reasoning' | 'should_statements' | 'labeling' | 'personalization' | 'blame' | 'comparison' | 'fomo' | 'imposter_syndrome' | 'perfectionism' | 'mind_reading' | 'fortune_telling' | 'filtering' | 'splitting' | 'control_fallacy';
/**
 * Detected cognitive distortion
 */
interface CognitiveDistortion {
    readonly type: CognitiveDistortionType;
    readonly confidence: number;
    readonly intensity: number;
    readonly triggeredBy: string;
    readonly associatedEmotion?: EmotionType$1;
    readonly correctionSuggestion?: string;
    readonly detectedAt: Date;
}
/**
 * Attentional bias patterns
 * Where attention is primarily directed
 */
type AttentionalBias = 'threat' | 'reward' | 'neutral' | 'avoidant' | 'rumination' | 'worry';
/**
 * Thinking style assessment
 */
interface ThinkingStyle {
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
interface BeliefUpdate {
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
interface CoreBeliefPattern {
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
interface CognitiveLoad {
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
interface Metacognition {
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
interface ICognitiveState {
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
interface ICognitiveStateBuilder {
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
interface ICognitiveStateFactory {
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
        emotionalContext?: EmotionType$1;
    }): ICognitiveState;
    /**
     * Create neutral/baseline state
     */
    createNeutral(): ICognitiveState;
}
/**
 * Cognitive Distortion Detector Interface
 */
interface ICognitiveDistortionDetector {
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
declare const DISTORTION_PATTERNS: Record<CognitiveDistortionType, {
    keywords: string[];
    phrases: string[];
    description: string;
    correction: string;
}>;
/**
 * Therapeutic interventions for each distortion
 */
declare const DISTORTION_INTERVENTIONS: Record<CognitiveDistortionType, {
    technique: string;
    description: string;
    steps: string[];
    durationMinutes: number;
}>;

/**
 * 📖 NARRATIVE STATE INTERFACE
 * ============================
 * Personal Story Arc Tracking - WORLD-FIRST Innovation
 * Человек как герой собственной истории изменений
 *
 * Scientific Foundation:
 * - Transtheoretical Model of Change (Prochaska & DiClemente, 1983)
 * - Narrative Identity Theory (McAdams, 2001)
 * - Hero's Journey (Campbell, 1949)
 * - Narrative Therapy (White & Epston, 1990)
 *
 * Unique Innovation:
 * - Tracking personal transformation journey
 * - Role evolution (victim → survivor → hero)
 * - Breakthrough/setback momentum
 * - Story arc prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Stages of Change (Transtheoretical Model)
 * Enhanced with therapeutic context
 */
type ChangeStage = 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance' | 'relapse';
/**
 * Narrative role in personal story
 * Based on archetypal journey
 */
type NarrativeRole = 'victim' | 'survivor' | 'explorer' | 'hero' | 'mentor';
/**
 * Significant moment in the narrative
 */
interface NarrativeMoment {
    readonly id: string;
    readonly type: 'breakthrough' | 'setback' | 'insight' | 'challenge' | 'milestone';
    readonly description: string;
    readonly emotionalImpact: number;
    readonly significance: number;
    readonly timestamp: Date;
    readonly triggeredBy?: string;
    readonly lessonsLearned?: string[];
    readonly linkedToStage?: ChangeStage;
}
/**
 * Story chapter (time period)
 */
interface NarrativeChapter {
    readonly id: string;
    readonly title: string;
    readonly startDate: Date;
    readonly endDate?: Date;
    readonly dominantStage: ChangeStage;
    readonly dominantRole: NarrativeRole;
    readonly keyMoments: NarrativeMoment[];
    readonly overallTone: 'dark' | 'struggling' | 'neutral' | 'hopeful' | 'triumphant';
    readonly summary?: string;
}
/**
 * Personal values and meaning
 */
interface PersonalValues {
    readonly identified: Array<{
        readonly value: string;
        readonly importance: number;
        readonly currentAlignment: number;
        readonly examples: string[];
    }>;
    readonly meaningSource: 'relationships' | 'achievement' | 'growth' | 'contribution' | 'experience' | 'mixed';
    readonly purposeClarity: number;
}
/**
 * Narrative themes (recurring patterns)
 */
interface NarrativeTheme {
    readonly theme: string;
    readonly frequency: number;
    readonly valence: number;
    readonly evolution: 'intensifying' | 'stable' | 'resolving' | 'dormant';
    readonly examples: string[];
}
/**
 * Future projection (where story is heading)
 */
interface NarrativeProjection {
    readonly predictedStage: ChangeStage;
    readonly predictedRole: NarrativeRole;
    readonly confidence: number;
    readonly timeframe: 'short' | 'medium' | 'long';
    readonly optimisticScenario: string;
    readonly realisticScenario: string;
    readonly pessimisticScenario: string;
    readonly keyFactors: string[];
}
/**
 * Momentum indicator
 */
interface NarrativeMomentum {
    /**
     * Overall direction of change (-1.0 to +1.0)
     * Negative = moving toward relapse
     * Positive = moving toward growth
     */
    readonly direction: number;
    /**
     * Speed of change (0.0 to 1.0)
     * Low = slow, gradual
     * High = rapid transformation
     */
    readonly velocity: number;
    /**
     * Stability of momentum (0.0 to 1.0)
     * Low = erratic, unpredictable
     * High = consistent trajectory
     */
    readonly stability: number;
    /**
     * Factors accelerating positive change
     */
    readonly accelerators: string[];
    /**
     * Factors slowing or reversing progress
     */
    readonly barriers: string[];
}
/**
 * Stage transition probability
 */
interface StageTransition {
    readonly fromStage: ChangeStage;
    readonly toStage: ChangeStage;
    readonly probability: number;
    readonly estimatedTimeframe: number;
    readonly requiredConditions: string[];
    readonly riskFactors: string[];
}
/**
 * 📖 Main Narrative State Interface
 * Core component of State Vector S_t (n_t)
 */
interface INarrativeState {
    /**
     * Current stage in change process
     */
    readonly stage: ChangeStage;
    /**
     * Days spent in current stage
     */
    readonly daysInCurrentStage: number;
    /**
     * Stage transition history
     */
    readonly stageHistory: Array<{
        readonly stage: ChangeStage;
        readonly enteredAt: Date;
        readonly exitedAt?: Date;
        readonly duration: number;
    }>;
    /**
     * Current narrative role
     */
    readonly role: NarrativeRole;
    /**
     * Role evolution history
     */
    readonly roleHistory: Array<{
        readonly role: NarrativeRole;
        readonly startedAt: Date;
        readonly endedAt?: Date;
        readonly trigger?: string;
    }>;
    /**
     * Overall progress percentage (0-100)
     * Composite of stage progress and role evolution
     */
    readonly progressPercent: number;
    /**
     * Key breakthrough moments
     */
    readonly breakthroughs: NarrativeMoment[];
    /**
     * Setback moments
     */
    readonly setbacks: NarrativeMoment[];
    /**
     * Current narrative momentum
     */
    readonly momentum: NarrativeMomentum;
    /**
     * Story chapters (major periods)
     */
    readonly chapters: NarrativeChapter[];
    /**
     * Current chapter
     */
    readonly currentChapter: NarrativeChapter;
    /**
     * Recurring themes in narrative
     */
    readonly themes: NarrativeTheme[];
    /**
     * Personal values and meaning
     */
    readonly values: PersonalValues;
    /**
     * Future projections
     */
    readonly projections: NarrativeProjection[];
    /**
     * Likely stage transitions
     */
    readonly possibleTransitions: StageTransition[];
    /**
     * Timestamp of this state
     */
    readonly timestamp: Date;
    /**
     * Confidence in assessment
     */
    readonly confidence: number;
    /**
     * Data quality
     */
    readonly dataQuality: number;
}
/**
 * Narrative State Builder
 */
interface INarrativeStateBuilder {
    setStage(stage: ChangeStage, daysIn: number): this;
    setRole(role: NarrativeRole): this;
    addBreakthrough(moment: NarrativeMoment): this;
    addSetback(moment: NarrativeMoment): this;
    setMomentum(momentum: NarrativeMomentum): this;
    addChapter(chapter: NarrativeChapter): this;
    addTheme(theme: NarrativeTheme): this;
    setValues(values: PersonalValues): this;
    addProjection(projection: NarrativeProjection): this;
    build(): INarrativeState;
}

/**
 * 🚨 RISK STATE INTERFACE
 * =======================
 * Comprehensive risk assessment compatible with CrisisPipeline
 * Multi-layer risk tracking with early warning system
 *
 * Scientific Foundation:
 * - Columbia Suicide Severity Rating Scale (C-SSRS)
 * - Risk-Need-Responsivity Model (Andrews & Bonta)
 * - Safety Planning Intervention (Stanley & Brown)
 * - Dynamic Risk Assessment (Douglas & Skeem)
 *
 * Integration:
 * - Compatible with existing CrisisPipeline
 * - Aligned with CrisisRiskLevel from src project
 * - Supports fail-safe design principles
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Risk level (aligned with CrisisPipeline)
 */
type RiskLevel$2 = 'none' | 'low' | 'medium' | 'high' | 'critical';
/**
 * Risk trajectory (direction of change)
 */
type RiskTrajectory = 'improving' | 'stable' | 'declining' | 'volatile';
/**
 * Risk category types
 */
type RiskCategory = 'self_harm' | 'suicidal_ideation' | 'substance_use' | 'behavioral' | 'relational' | 'emotional_crisis' | 'digital_addiction' | 'social_isolation' | 'academic_crisis' | 'family_crisis';
/**
 * Risk factor (contributing to risk)
 */
interface RiskFactor {
    readonly id: string;
    readonly category: RiskCategory;
    readonly description: string;
    readonly severity: number;
    readonly temporality: 'static' | 'stable_dynamic' | 'acute_dynamic';
    readonly modifiable: boolean;
    readonly detectedAt: Date;
    readonly lastUpdated: Date;
    readonly evidence: string[];
}
/**
 * Protective factor (reducing risk)
 */
interface ProtectiveFactor {
    readonly id: string;
    readonly type: 'internal' | 'external';
    readonly description: string;
    readonly strength: number;
    readonly reliability: number;
    readonly category: 'social_support' | 'coping_skills' | 'hope' | 'reasons_for_living' | 'professional_support' | 'values' | 'self_efficacy';
    readonly detectedAt: Date;
    readonly evidence: string[];
}
/**
 * Early warning sign
 */
interface EarlyWarning {
    readonly id: string;
    readonly type: 'behavioral' | 'emotional' | 'cognitive' | 'social' | 'physical';
    readonly description: string;
    readonly severity: number;
    readonly detectedAt: Date;
    readonly trend: 'new' | 'increasing' | 'stable' | 'decreasing';
    readonly requiresAction: boolean;
    readonly suggestedAction?: string;
}
/**
 * Safety plan component
 */
interface SafetyPlanComponent {
    readonly type: 'warning_signs' | 'coping_strategies' | 'distraction_activities' | 'support_contacts' | 'professional_contacts' | 'environment_safety';
    readonly items: string[];
    readonly lastUpdated: Date;
    readonly userDefined: boolean;
}
/**
 * Safety plan status
 */
interface SafetyPlan {
    readonly exists: boolean;
    readonly lastUpdated?: Date;
    readonly completeness: number;
    readonly components: SafetyPlanComponent[];
    readonly primaryContact?: {
        readonly name: string;
        readonly phone?: string;
        readonly relationship: string;
    };
    readonly professionalContact?: {
        readonly name: string;
        readonly phone?: string;
        readonly type: 'therapist' | 'psychiatrist' | 'counselor' | 'hotline';
    };
}
/**
 * Crisis event record
 */
interface CrisisEvent {
    readonly id: string;
    readonly timestamp: Date;
    readonly severity: RiskLevel$2;
    readonly category: RiskCategory;
    readonly triggeredBy: string;
    readonly actionTaken: string;
    readonly outcome: 'resolved' | 'escalated' | 'referred' | 'ongoing';
    readonly responseTime: number;
    readonly userFeedback?: string;
}
/**
 * Lethal means assessment
 */
interface LethalMeansAssessment {
    readonly assessed: boolean;
    readonly lastAssessedAt?: Date;
    readonly accessToMeans: 'unknown' | 'none' | 'limited' | 'easy';
    readonly meansRestrictionDiscussed: boolean;
    readonly safetyStepsCompleted: string[];
}
/**
 * Support network assessment
 */
interface SupportNetwork {
    readonly size: number;
    readonly quality: number;
    readonly accessibility: number;
    readonly diversity: number;
    readonly primarySupports: Array<{
        readonly relationship: string;
        readonly availability: 'always' | 'usually' | 'sometimes' | 'rarely';
        readonly quality: number;
    }>;
    readonly lastContacted?: Date;
}
/**
 * Intervention effectiveness
 */
interface InterventionEffectiveness {
    readonly interventionId: string;
    readonly interventionType: string;
    readonly timesUsed: number;
    readonly averageEffectiveness: number;
    readonly bestForRiskCategories: RiskCategory[];
    readonly contraindicated: RiskCategory[];
}
/**
 * Risk prediction
 */
interface RiskPrediction {
    readonly timeframe: '6h' | '24h' | '72h' | '1w';
    readonly predictedLevel: RiskLevel$2;
    readonly confidence: number;
    readonly keyFactors: string[];
    readonly preventiveActions: string[];
    readonly calculatedAt: Date;
}
/**
 * 🚨 Main Risk State Interface
 * Core component of State Vector S_t (r_t)
 */
interface IRiskState {
    /**
     * Current overall risk level
     */
    readonly level: RiskLevel$2;
    /**
     * Confidence in risk assessment (0.0 - 1.0)
     */
    readonly confidence: number;
    /**
     * Risk trajectory over time
     */
    readonly trajectory: RiskTrajectory;
    /**
     * Active risk factors
     */
    readonly riskFactors: RiskFactor[];
    /**
     * Active protective factors
     */
    readonly protectiveFactors: ProtectiveFactor[];
    /**
     * Early warning signs detected
     */
    readonly earlyWarnings: EarlyWarning[];
    /**
     * Risk by category
     */
    readonly categoryRisks: Record<RiskCategory, {
        readonly level: RiskLevel$2;
        readonly confidence: number;
        readonly lastAssessed: Date;
    }>;
    /**
     * Safety plan status
     */
    readonly safetyPlan: SafetyPlan;
    /**
     * Support network assessment
     */
    readonly supportNetwork: SupportNetwork;
    /**
     * Lethal means assessment
     */
    readonly lethalMeans: LethalMeansAssessment;
    /**
     * Crisis history
     */
    readonly crisisHistory: CrisisEvent[];
    /**
     * Effective interventions for this user
     */
    readonly effectiveInterventions: InterventionEffectiveness[];
    /**
     * Risk predictions
     */
    readonly predictions: RiskPrediction[];
    /**
     * Time since last crisis event
     */
    readonly daysSinceLastCrisis: number | null;
    /**
     * Current stabilization phase
     */
    readonly stabilizationPhase: 'acute' | 'subacute' | 'stable' | 'recovery';
    /**
     * Timestamp of this assessment
     */
    readonly timestamp: Date;
    /**
     * Data quality (0.0 - 1.0)
     */
    readonly dataQuality: number;
    /**
     * Assessment method used
     */
    readonly assessmentMethod: 'automated' | 'combined' | 'self_report' | 'fallback';
}
/**
 * Risk State Builder
 */
interface IRiskStateBuilder {
    setLevel(level: RiskLevel$2, confidence: number): this;
    setTrajectory(trajectory: RiskTrajectory): this;
    addRiskFactor(factor: RiskFactor): this;
    addProtectiveFactor(factor: ProtectiveFactor): this;
    addEarlyWarning(warning: EarlyWarning): this;
    setCategoryRisk(category: RiskCategory, level: RiskLevel$2, confidence: number): this;
    setSafetyPlan(plan: SafetyPlan): this;
    setSupportNetwork(network: SupportNetwork): this;
    addCrisisEvent(event: CrisisEvent): this;
    addPrediction(prediction: RiskPrediction): this;
    build(): IRiskState;
}

/**
 * 💪 RESOURCE STATE INTERFACE
 * ===========================
 * PERMA Model of Wellbeing + Coping Resources
 * Comprehensive assessment of available resources
 *
 * Scientific Foundation:
 * - PERMA Model (Seligman, 2011)
 * - Coping Theory (Lazarus & Folkman, 1984)
 * - Conservation of Resources Theory (Hobfoll, 1989)
 * - Positive Psychology Framework
 *
 * Components:
 * - P: Positive Emotion
 * - E: Engagement
 * - R: Relationships
 * - M: Meaning
 * - A: Accomplishment
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * PERMA dimension scores
 * Each dimension: 0.0 (absent) to 1.0 (optimal)
 */
interface PERMADimensions {
    /**
     * Positive Emotion (P)
     * Frequency and intensity of positive emotions
     */
    readonly positiveEmotion: number;
    /**
     * Engagement (E)
     * Flow states, absorption in activities
     */
    readonly engagement: number;
    /**
     * Relationships (R)
     * Quality of social connections
     */
    readonly relationships: number;
    /**
     * Meaning (M)
     * Sense of purpose and meaning
     */
    readonly meaning: number;
    /**
     * Accomplishment (A)
     * Achievement and competence
     */
    readonly accomplishment: number;
}
/**
 * Coping strategy type
 */
type CopingStrategyType = 'problem_solving' | 'information_seeking' | 'planning' | 'emotional_expression' | 'emotional_support' | 'reappraisal' | 'benefit_finding' | 'values_clarification' | 'acceptance' | 'social_support' | 'venting' | 'humor' | 'distraction' | 'denial' | 'substance_use' | 'behavioral_disengagement' | 'physical_activity' | 'relaxation' | 'creative_expression' | 'spiritual_practice';
/**
 * Coping strategy with effectiveness tracking
 */
interface CopingStrategy {
    readonly id: string;
    readonly type: CopingStrategyType;
    readonly name: string;
    readonly description: string;
    readonly adaptive: boolean;
    readonly usageFrequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
    readonly effectiveness: number;
    readonly lastUsed?: Date;
    readonly contextEffective: string[];
    readonly contraindicated?: string[];
}
/**
 * Energy/vitality assessment
 */
interface EnergyLevel {
    /**
     * Current energy (0.0 - 1.0)
     */
    readonly current: number;
    /**
     * Baseline/typical energy
     */
    readonly baseline: number;
    /**
     * Energy trend
     */
    readonly trend: 'depleting' | 'stable' | 'restoring';
    /**
     * Factors affecting energy
     */
    readonly factors: Array<{
        readonly factor: 'sleep' | 'nutrition' | 'exercise' | 'stress' | 'illness' | 'emotional_drain' | 'positive_interactions';
        readonly impact: number;
    }>;
}
/**
 * Cognitive load/capacity
 */
interface CognitiveCapacity {
    /**
     * Current available capacity (0.0 - 1.0)
     */
    readonly available: number;
    /**
     * Current load (0.0 - 1.0)
     */
    readonly currentLoad: number;
    /**
     * Optimal capacity (when rested)
     */
    readonly optimal: number;
    /**
     * Load sources
     */
    readonly loadSources: Array<{
        readonly source: string;
        readonly load: number;
    }>;
    /**
     * Time until recovery
     */
    readonly estimatedRecoveryHours?: number;
}
/**
 * Self-efficacy assessment
 */
interface SelfEfficacy {
    /**
     * General self-efficacy (0.0 - 1.0)
     */
    readonly general: number;
    /**
     * Domain-specific efficacy
     */
    readonly domains: Record<string, number>;
    /**
     * Recent mastery experiences
     */
    readonly masteryExperiences: Array<{
        readonly description: string;
        readonly domain: string;
        readonly impact: number;
        readonly timestamp: Date;
    }>;
}
/**
 * Resilience assessment
 */
interface Resilience {
    /**
     * Overall resilience score (0.0 - 1.0)
     */
    readonly score: number;
    /**
     * Components
     */
    readonly components: {
        readonly adaptability: number;
        readonly persistence: number;
        readonly optimism: number;
        readonly selfRegulation: number;
        readonly socialSupport: number;
    };
    /**
     * Bounce-back history
     */
    readonly recoveryHistory: Array<{
        readonly challenge: string;
        readonly recoveryTime: number;
        readonly lessonsLearned: string[];
        readonly timestamp: Date;
    }>;
}
/**
 * Social resources
 */
interface SocialResources {
    /**
     * Support network size and quality
     */
    readonly network: {
        readonly size: number;
        readonly qualityScore: number;
        readonly diversityScore: number;
        readonly accessibilityScore: number;
    };
    /**
     * Types of support available
     */
    readonly supportTypes: {
        readonly emotional: number;
        readonly instrumental: number;
        readonly informational: number;
        readonly companionship: number;
    };
    /**
     * Key relationships
     */
    readonly keyRelationships: Array<{
        readonly role: string;
        readonly quality: number;
        readonly frequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
        readonly supportProvided: ('emotional' | 'instrumental' | 'informational' | 'companionship')[];
    }>;
    /**
     * Isolation indicators
     */
    readonly isolationRisk: number;
}
/**
 * Time resources
 */
interface TimeResources {
    /**
     * Perceived time availability (0.0 - 1.0)
     */
    readonly perceived: number;
    /**
     * Time for self-care
     */
    readonly selfCareTime: 'none' | 'minimal' | 'adequate' | 'abundant';
    /**
     * Time pressure level
     */
    readonly pressure: number;
    /**
     * Balance indicators
     */
    readonly balance: {
        readonly work_life: number;
        readonly rest_activity: number;
        readonly solitude_social: number;
    };
}
/**
 * Hope and optimism
 */
interface HopeOptimism {
    /**
     * Hope score (Snyder's Hope Theory)
     */
    readonly hope: {
        readonly agency: number;
        readonly pathways: number;
        readonly overall: number;
    };
    /**
     * Optimism (Carver & Scheier)
     */
    readonly optimism: {
        readonly generalExpectancy: number;
        readonly explanatoryStyle: 'pessimistic' | 'mixed' | 'optimistic';
    };
    /**
     * Future orientation
     */
    readonly futureOrientation: {
        readonly clarity: number;
        readonly motivation: number;
        readonly confidence: number;
    };
}
/**
 * 💪 Main Resource State Interface
 * Core component of State Vector S_t (b_t - resources/buffers)
 */
interface IResourceState {
    /**
     * PERMA wellbeing dimensions
     */
    readonly perma: PERMADimensions;
    /**
     * Overall PERMA score (weighted average)
     */
    readonly permaScore: number;
    /**
     * Available coping strategies
     */
    readonly copingStrategies: CopingStrategy[];
    /**
     * Currently effective strategies (top 3-5)
     */
    readonly effectiveStrategies: CopingStrategy[];
    /**
     * Current energy level
     */
    readonly energy: EnergyLevel;
    /**
     * Cognitive capacity
     */
    readonly cognitiveCapacity: CognitiveCapacity;
    /**
     * Self-efficacy assessment
     */
    readonly selfEfficacy: SelfEfficacy;
    /**
     * Resilience profile
     */
    readonly resilience: Resilience;
    /**
     * Social resources
     */
    readonly socialResources: SocialResources;
    /**
     * Time resources
     */
    readonly timeResources: TimeResources;
    /**
     * Hope and optimism
     */
    readonly hopeOptimism: HopeOptimism;
    /**
     * Resource depletion warnings
     */
    readonly depletionWarnings: Array<{
        readonly resource: string;
        readonly severity: 'low' | 'medium' | 'high';
        readonly trend: 'stable' | 'declining' | 'critical';
        readonly recommendedAction: string;
    }>;
    /**
     * Resource strengths
     */
    readonly strengths: Array<{
        readonly resource: string;
        readonly score: number;
        readonly usable: boolean;
    }>;
    /**
     * Overall resource availability (0.0 - 1.0)
     */
    readonly overallAvailability: number;
    /**
     * Timestamp
     */
    readonly timestamp: Date;
    /**
     * Assessment confidence
     */
    readonly confidence: number;
    /**
     * Data quality
     */
    readonly dataQuality: number;
}
/**
 * Resource State Builder
 */
interface IResourceStateBuilder {
    setPERMA(perma: PERMADimensions): this;
    addCopingStrategy(strategy: CopingStrategy): this;
    setEnergy(energy: EnergyLevel): this;
    setCognitiveCapacity(capacity: CognitiveCapacity): this;
    setSelfEfficacy(efficacy: SelfEfficacy): this;
    setResilience(resilience: Resilience): this;
    setSocialResources(resources: SocialResources): this;
    setTimeResources(resources: TimeResources): this;
    setHopeOptimism(hope: HopeOptimism): this;
    build(): IResourceState;
}

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

/**
 * Observation source
 */
type ObservationSource = 'message' | 'self_report' | 'behavioral' | 'contextual' | 'scheduled' | 'inference';
/**
 * State quality metrics
 */
interface StateQuality {
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
interface BeliefState$1 {
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
interface StateTransition {
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
interface TemporalPrediction {
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
interface StateSummary {
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
interface StateBasedRecommendation {
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
interface IStateVector {
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
    readonly emotional: IEmotionalState$1;
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
    readonly belief: BeliefState$1;
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
interface IStateVectorBuilder {
    setUserId(userId: string | number): this;
    setEmotionalState(state: IEmotionalState$1): this;
    setCognitiveState(state: ICognitiveState): this;
    setNarrativeState(state: INarrativeState): this;
    setRiskState(state: IRiskState): this;
    setResourceState(state: IResourceState): this;
    setBelief(belief: BeliefState$1): this;
    addTransition(transition: StateTransition): this;
    addPrediction(prediction: TemporalPrediction): this;
    addRecommendation(recommendation: StateBasedRecommendation): this;
    build(): IStateVector;
}
/**
 * State Vector Factory
 */
interface IStateVectorFactory {
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
        emotional: Partial<IEmotionalState$1>;
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
interface IStateVectorService {
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
interface IStateVectorRepository {
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
declare const WELLBEING_WEIGHTS: {
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
declare const INDEX_THRESHOLDS: {
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
type ComponentStatus = 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';
/**
 * Calculate component status from score
 */
declare function getComponentStatus(score: number): ComponentStatus;
/**
 * Age group for age-adaptive recommendations
 */
type AgeGroup$1 = 'child' | 'teen' | 'adult';

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

/**
 * Observation types that can update beliefs
 */
type ObservationType = 'text_message' | 'self_report_emotion' | 'self_report_mood' | 'behavioral' | 'contextual' | 'assessment' | 'sensor' | 'interaction';
/**
 * Single observation
 */
interface Observation {
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
interface Prior {
    readonly mean: number;
    readonly variance: number;
    readonly sampleSize: number;
    readonly lastUpdated: Date;
}
/**
 * Posterior belief (after observation)
 */
interface Posterior {
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
interface DimensionBelief {
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
interface BeliefState {
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
            readonly distribution: Map<EmotionType$1, number>;
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
interface BeliefUpdateResult {
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
 * Belief Update Engine Interface
 */
interface IBeliefUpdateEngine {
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
interface IPLRNNConfig {
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
declare const DEFAULT_PLRNN_CONFIG: IPLRNNConfig;
/**
 * PLRNN State
 * Latent state representation with uncertainty
 */
interface IPLRNNState {
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
interface IPLRNNPrediction {
    /** Predicted states over horizon */
    trajectory: IPLRNNState[];
    /** Mean prediction at horizon */
    meanPrediction: number[];
    /** Prediction confidence intervals */
    confidenceInterval: {
        lower: number[];
        upper: number[];
        level: number;
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
interface IEarlyWarningSignal {
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
interface ICausalNetwork {
    /** Nodes represent psychological dimensions */
    nodes: ICausalNode$1[];
    /** Edges represent causal influence strengths */
    edges: ICausalEdge$1[];
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
interface ICausalNode$1 {
    id: string;
    label: string;
    /** Self-connection strength (autoregression) */
    selfWeight: number;
    /** Centrality in the network */
    centrality: number;
    /** Current value */
    value: number;
}
interface ICausalEdge$1 {
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
interface IInterventionSimulation {
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
        sideEffects: Array<{
            dimension: string;
            effect: number;
        }>;
    };
    /** Confidence in simulation */
    confidence: number;
}
/**
 * PLRNN Model Weights
 * Serializable for persistence
 */
interface IPLRNNWeights {
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
interface IPLRNNTrainingSample {
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
interface IPLRNNTrainingResult {
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
interface IPLRNNEngine {
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
    predict(currentState: IPLRNNState, horizon: number, input?: number[][]): IPLRNNPrediction;
    /**
     * Hybrid prediction: PLRNN for long-term, Kalman for short-term
     */
    hybridPredict(currentState: IPLRNNState, horizon: 'short' | 'medium' | 'long'): IPLRNNPrediction;
    /**
     * Extract interpretable causal network from learned weights
     * Key advantage of PLRNN over black-box models
     */
    extractCausalNetwork(): ICausalNetwork;
    /**
     * Simulate intervention on psychological dimension
     */
    simulateIntervention(currentState: IPLRNNState, target: string, intervention: 'increase' | 'decrease' | 'stabilize', magnitude: number): IInterventionSimulation;
    /**
     * Detect early warning signals of critical transition
     * Based on critical slowing down theory
     */
    detectEarlyWarnings(stateHistory: IPLRNNState[], windowSize: number): IEarlyWarningSignal[];
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
    calculateLoss(predicted: number[][], actual: number[][]): number;
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
type PLRNNEngineFactory = (config?: Partial<IPLRNNConfig>) => IPLRNNEngine;

/**
 * Twin state stability classification
 * Extended with 2025 dynamical systems theory
 */
type TwinStability = 'stable' | 'metastable' | 'unstable' | 'critical' | 'transitioning';
/**
 * Attractor type in dynamical systems
 */
type AttractorType = 'point' | 'limit_cycle' | 'strange' | 'none' | 'quasi_periodic';
/**
 * Scenario outcome classification
 */
type ScenarioOutcome = 'improvement' | 'stable' | 'deterioration' | 'crisis' | 'recovery' | 'remission';
/**
 * Bifurcation type from dynamical systems theory
 */
type BifurcationType = 'saddle_node' | 'transcritical' | 'pitchfork' | 'hopf' | 'fold_bifurcation' | 'period_doubling' | 'blue_sky' | 'unknown';
/**
 * Digital phenotyping data source
 * Based on 2025 sensor review (112 papers)
 */
type PhenotypingSource = 'gps_location' | 'accelerometer' | 'screen_time' | 'call_logs' | 'message_logs' | 'social_media' | 'sleep_tracking' | 'heart_rate' | 'ema_survey' | 'keyboard_dynamics' | 'voice_analysis' | 'facial_expression';
/**
 * State estimation method
 * 2025: Multiple methods for ensemble approaches
 */
type StateEstimationMethod = 'kalman_filter' | 'extended_kalman' | 'unscented_kalman' | 'ensemble_kalman' | 'particle_filter' | 'bayesian_inference' | 'variational_bayes' | 'physics_informed_nn';
/**
 * Twin synchronization mode
 * 2025: Bidirectional communication
 */
type SyncMode = 'unidirectional_p2v' | 'unidirectional_v2p' | 'bidirectional' | 'event_driven' | 'scheduled';
/**
 * Single state variable in the cognitive twin
 * Enhanced with 2025 uncertainty quantification
 */
interface ITwinStateVariable {
    id: string;
    name: string;
    nameRu: string;
    value: number;
    variance: number;
    confidence: number;
    velocity: number;
    acceleration: number;
    baselineValue: number;
    historicalMean: number;
    historicalStd: number;
    kalmanState?: {
        estimate: number;
        errorCovariance: number;
        processNoise: number;
        measurementNoise: number;
        gain: number;
    };
    posterior?: {
        mean: number;
        variance: number;
        distribution: 'gaussian' | 'beta' | 'mixture';
        parameters: Record<string, number>;
    };
    lastObserved: Date;
    lastUpdated: Date;
    observationCount: number;
    dataSource: PhenotypingSource[];
}
/**
 * Complete cognitive twin state snapshot
 * Enhanced with 2025 MHDT framework
 */
interface IDigitalTwinState {
    id: string;
    userId: number;
    timestamp: Date;
    version: number;
    variables: Map<string, ITwinStateVariable>;
    overallWellbeing: number;
    stability: TwinStability;
    dominantAttractor: AttractorType;
    resilience: number;
    lyapunovExponent: number;
    autocorrelation: number;
    varianceRatio: number;
    stateUncertainty: number;
    dataQuality: number;
    beliefState?: {
        discreteBeliefs: Map<string, number>;
        continuousBeliefs: Map<string, {
            mean: number;
            variance: number;
        }>;
        entropy: number;
    };
    phenotypeSummary?: {
        activityLevel: number;
        socialEngagement: number;
        sleepRegularity: number;
        moodVariability: number;
        stressIndicators: number;
        lastPhenotypingTimestamp: Date;
    };
    causalGraphId: string;
    syncMetadata: {
        lastSync: Date;
        syncMode: SyncMode;
        pendingUpdates: number;
        syncHealth: number;
    };
}
/**
 * State trajectory over time
 */
interface IStateTrajectory {
    userId: number;
    timepoints: Date[];
    states: IDigitalTwinState[];
    interventionsApplied: IInterventionEvent[];
    trajectoryMetrics?: {
        volatility: number;
        trend: number;
        seasonality: number;
        breakpoints: Date[];
    };
}
/**
 * Intervention event record
 */
interface IInterventionEvent {
    id: string;
    timestamp: Date;
    interventionType: string;
    targetVariable: string;
    predictedEffect: number;
    actualEffect: number;
    effectiveness: number;
    causalConfidence: number;
    confounders: string[];
}
/**
 * Kalman Filter state
 */
interface IKalmanFilterState {
    stateEstimate: number[];
    errorCovariance: number[][];
    predictedState: number[];
    predictedCovariance: number[][];
    innovation: number[];
    innovationCovariance: number[][];
    kalmanGain: number[][];
    normalized_innovation_squared: number;
    isOutlier: boolean;
    adaptedQ: number[][] | null;
    adaptedR: number[][] | null;
    timestep: number;
    timestamp: Date;
}
/**
 * Digital phenotyping observation
 * Based on 2025 systematic review (112 papers)
 */
interface IPhenotypingObservation {
    id: string;
    userId: number;
    timestamp: Date;
    source: PhenotypingSource;
    rawValue: number | string | number[];
    unit: string;
    processedFeatures: Map<string, number>;
    dataQuality: number;
    missingness: number;
    isImputed: boolean;
    isAnonymized: boolean;
    aggregationLevel: 'raw' | 'hourly' | 'daily' | 'weekly';
    contextTags: string[];
}
/**
 * What-if scenario definition
 * Enhanced with 2025 counterfactual reasoning
 */
interface IScenario {
    id: string;
    name: string;
    nameRu: string;
    description: string;
    descriptionRu: string;
    interventionType: string | null;
    targetVariable: string | null;
    interventionStrength: number;
    horizonDays: number;
    startState: IDigitalTwinState;
    externalStressors: IExternalStressor[];
    protectiveFactors: IProtectiveFactor[];
    counterfactual?: {
        interventionQuery: string;
        conditioningSet: Map<string, number>;
        mediatorBlocking: string[];
    };
}
/**
 * External stressor in scenario
 */
interface IExternalStressor {
    type: 'work' | 'relationship' | 'health' | 'financial' | 'loss' | 'trauma' | 'other';
    intensity: number;
    onsetDay: number;
    durationDays: number;
    description: string;
    affectedVariables: string[];
    effectSize: Map<string, number>;
}
/**
 * Protective factor in scenario
 */
interface IProtectiveFactor {
    type: 'social_support' | 'therapy' | 'medication' | 'lifestyle' | 'coping_skills' | 'mindfulness';
    strength: number;
    reliability: number;
    description: string;
    bufferedVariables: string[];
    bufferingEffect: Map<string, number>;
}
/**
 * Scenario simulation result
 * Enhanced with 2025 ensemble predictions
 */
interface IScenarioResult {
    id: string;
    scenario: IScenario;
    simulatedAt: Date;
    trajectories: ISimulatedTrajectory[];
    expectedTrajectory: ISimulatedTrajectory;
    outcome: ScenarioOutcome;
    outcomeDistribution: Map<ScenarioOutcome, number>;
    expectedEndState: Map<string, number>;
    worstCaseEndState: Map<string, number>;
    bestCaseEndState: Map<string, number>;
    crisisProbability: number;
    recoveryProbability: number;
    tippingPointProbability: number;
    expectedTimeToImprovement: number | null;
    expectedTimeToCrisis: number | null;
    predictionUncertainty: number;
    aleatoric: number;
    epistemic: number;
    keyDrivers: Array<{
        variable: string;
        contribution: number;
        direction: 'positive' | 'negative';
    }>;
    confidenceLevel: number;
    simulationCount: number;
    methodUsed: StateEstimationMethod;
}
/**
 * Single simulated trajectory
 */
interface ISimulatedTrajectory {
    id: string;
    timepoints: number[];
    states: Map<string, number[]>;
    events: ITrajectoryEvent[];
    finalOutcome: ScenarioOutcome;
    probability: number;
    confidenceBands?: {
        lower: Map<string, number[]>;
        upper: Map<string, number[]>;
    };
}
/**
 * Event during trajectory simulation
 */
interface ITrajectoryEvent {
    day: number;
    eventType: 'intervention' | 'stressor' | 'tipping_point' | 'recovery' | 'crisis' | 'regime_change';
    description: string;
    impact: Map<string, number>;
    causalMechanism?: string;
    counterfactualImpact?: number;
}
/**
 * Detected tipping point (bifurcation)
 * Enhanced with 2025 early warning signals research
 */
interface ITippingPoint {
    id: string;
    timestamp: Date;
    detectedAt: Date;
    bifurcationType: BifurcationType;
    criticalParameter: string;
    criticalThreshold: number;
    currentDistance: number;
    estimatedTimeToPoint: number;
    confidenceInterval: [number, number];
    preTransitionState: AttractorType;
    postTransitionState: AttractorType;
    expectedOutcome: ScenarioOutcome;
    irreversibility: number;
    earlyWarningStrength: number;
    autocorrelationIncrease: number;
    varianceIncrease: number;
    crossCorrelationIncrease: number;
    flickeringDetected: boolean;
    skewnessChange: number;
    detrended_fluctuation_exponent: number;
    interventionWindowDays: number;
    preventionProbability: number;
    recommendedInterventions: IInterventionRecommendation[];
}
/**
 * Intervention recommendation for preventing tipping point
 */
interface IInterventionRecommendation {
    interventionType: string;
    targetVariable: string;
    expectedEffect: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    feasibility: number;
    description: string;
    descriptionRu: string;
}
/**
 * Personal twin parameters (learned from data)
 * Enhanced with 2025 personalization research
 */
interface ITwinPersonalization {
    userId: number;
    learnedAt: Date;
    lastValidated: Date;
    meanReversionRate: Map<string, number>;
    volatility: Map<string, number>;
    sensitivityMatrix: Map<string, Map<string, number>>;
    interventionResponse: Map<string, IInterventionResponseProfile>;
    stressorVulnerability: Map<string, number>;
    protectiveFactorEfficacy: Map<string, number>;
    circadianPattern: Map<string, number[]>;
    weeklyPattern: Map<string, number[]>;
    seasonalPattern: Map<string, number[]>;
    intraIndividualVariability: Map<string, number>;
    responseLatency: Map<string, number>;
    sustainedEffectRate: Map<string, number>;
    learnedPriors: Map<string, {
        mean: number;
        variance: number;
    }>;
    dataPointsUsed: number;
    fitQuality: number;
    crossValidationScore: number;
}
/**
 * Personalized intervention response profile
 */
interface IInterventionResponseProfile {
    interventionType: string;
    meanEffect: number;
    effectVariability: number;
    timeToOnset: number;
    timeToPeak: number;
    duration: number;
    sustainedEffectRate: number;
    moderators: Map<string, number>;
    conditionalEffects: Map<string, number>;
}
/**
 * Main Digital Twin service interface
 */
interface IDigitalTwinService {
    createTwin(userId: number, initialObservations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;
    getTwin(userId: number): Promise<IDigitalTwinState | null>;
    deleteTwin(userId: number): Promise<boolean>;
    updateWithObservation(userId: number, observation: IPhenotypingObservation): Promise<IDigitalTwinState>;
    batchUpdate(userId: number, observations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;
    estimateState(userId: number, method?: StateEstimationMethod): Promise<IDigitalTwinState>;
    getStateHistory(userId: number, days: number): Promise<IStateTrajectory>;
    getPersonalization(userId: number): Promise<ITwinPersonalization | null>;
    updatePersonalization(userId: number): Promise<ITwinPersonalization>;
    synchronize(userId: number): Promise<IDigitalTwinState>;
}

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

/**
 * KalmanFormer Configuration
 */
interface IKalmanFormerConfig {
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
declare const DEFAULT_KALMANFORMER_CONFIG: IKalmanFormerConfig;
/**
 * Attention Weights for interpretability
 */
interface IAttentionWeights {
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
interface IKalmanFormerState {
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
interface IKalmanFormerPrediction {
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
interface IKalmanFormerWeights {
    /** Kalman matrices */
    kalman: {
        stateTransition: number[][];
        observationMatrix: number[][];
        processNoise: number[][];
        measurementNoise: number[][];
    };
    /** Transformer weights */
    transformer: {
        queryWeights: number[][][];
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
interface IKalmanFormerTrainingSample {
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
        timeOfDay: number;
        dayOfWeek: number;
        eventType?: string;
    }>;
}
/**
 * KalmanFormer Engine Interface
 */
interface IKalmanFormerEngine {
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
    update(state: IKalmanFormerState, observation: number[], timestamp: Date): IKalmanFormerState;
    /**
     * Predict next state(s)
     */
    predict(state: IKalmanFormerState, horizon: number): IKalmanFormerPrediction;
    /**
     * Get attention-based explanation
     * Which historical observations influenced the prediction
     */
    explain(state: IKalmanFormerState): IAttentionWeights;
    /**
     * Adapt blend ratio based on prediction errors
     */
    adaptBlendRatio(predictions: number[][], actuals: number[][]): number;
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
type KalmanFormerEngineFactory = (config?: Partial<IKalmanFormerConfig>) => IKalmanFormerEngine;

/**
 * BELIEF STATE ADAPTER
 * ====================
 * Bridge between BeliefUpdateEngine (linear Bayesian) and Phase 1 engines
 * (PLRNN nonlinear dynamics, KalmanFormer hybrid)
 *
 * Scientific Foundation:
 * - ROADMAP task 1.1.3: "BeliefUpdateEngine.predictHybrid()"
 * - Converts BeliefState <-> IPLRNNState <-> IKalmanFormerState
 * - Enables nonlinear prediction while maintaining Bayesian uncertainty
 *
 * (c) BF "Drugoi Put", 2025
 */

/**
 * Dimension mapping from BeliefState to 5D state vector
 * S_t = (valence, arousal, dominance, risk, resources)
 */
declare const DIMENSION_MAPPING: {
    readonly 0: "valence";
    readonly 1: "arousal";
    readonly 2: "dominance";
    readonly 3: "risk";
    readonly 4: "resources";
};
declare const DIMENSION_INDEX: Record<string, number>;
/**
 * Hybrid prediction result combining Bayesian uncertainty with nonlinear dynamics
 */
interface IHybridPrediction {
    /** PLRNN prediction for nonlinear dynamics */
    plrnnPrediction?: IPLRNNPrediction;
    /** KalmanFormer prediction for short-term accuracy */
    kalmanFormerPrediction?: IKalmanFormerPrediction;
    /** Blended prediction with uncertainty */
    blendedPrediction: {
        /** Mean prediction at each horizon step */
        trajectory: number[][];
        /** Bayesian credible intervals */
        credibleIntervals: Array<{
            lower: number[];
            upper: number[];
            level: number;
        }>;
        /** Final prediction */
        finalPrediction: number[];
    };
    /** Early warning signals from PLRNN */
    earlyWarningSignals: IEarlyWarningSignal[];
    /** Attention explanation from KalmanFormer */
    attention?: IAttentionWeights;
    /** Prediction horizon used */
    horizon: 'short' | 'medium' | 'long';
    /** Hours ahead */
    hoursAhead: number;
    /** Confidence in prediction */
    confidence: number;
    /** Which engine contributed most */
    primaryEngine: 'plrnn' | 'kalmanformer' | 'bayesian';
}
/**
 * Convert BeliefState to 5D observation vector
 * Maps complex belief structure to simple [V, A, D, risk, resources] vector
 */
declare function beliefStateToObservation(belief: BeliefState): number[];
/**
 * Extract uncertainty vector from BeliefState
 */
declare function beliefStateToUncertainty(belief: BeliefState): number[];
/**
 * Convert BeliefState to IPLRNNState
 */
declare function beliefStateToPLRNNState(belief: BeliefState, hiddenUnits?: number): IPLRNNState;
/**
 * Convert IPLRNNState back to partial BeliefState update
 * Returns the dimensions that should be updated
 */
declare function plrnnStateToBeliefUpdate(plrnnState: IPLRNNState): Record<string, {
    mean: number;
    variance: number;
}>;
/**
 * Convert BeliefState to IKalmanFormerState
 */
declare function beliefStateToKalmanFormerState(belief: BeliefState, _contextWindow?: number): IKalmanFormerState;
/**
 * Convert IKalmanFormerState back to partial BeliefState update
 */
declare function kalmanFormerStateToBeliefUpdate(kfState: IKalmanFormerState): Record<string, {
    mean: number;
    variance: number;
}>;
/**
 * Merge prediction results from multiple engines
 */
declare function mergeHybridPredictions(plrnnPred?: IPLRNNPrediction, kfPred?: IKalmanFormerPrediction, horizon?: 'short' | 'medium' | 'long', confidence?: number): IHybridPrediction;
/**
 * BeliefStateAdapter class
 * Bridges BeliefUpdateEngine with Phase 1 nonlinear engines
 */
declare class BeliefStateAdapter {
    private plrnnEngine?;
    private kalmanFormerEngine?;
    constructor(engines?: IBeliefAdapterEngines);
    /**
     * Set PLRNN engine
     */
    setPLRNNEngine(engine: IBeliefAdapterEngines['plrnn']): void;
    /**
     * Set KalmanFormer engine
     */
    setKalmanFormerEngine(engine: IBeliefAdapterEngines['kalmanFormer']): void;
    /**
     * Hybrid prediction using Phase 1 engines
     * ROADMAP task 1.1.3 deliverable
     */
    predictHybrid(belief: BeliefState, horizon?: 'short' | 'medium' | 'long'): IHybridPrediction;
    /**
     * Extract causal network from current belief and PLRNN weights
     */
    extractCausalNetwork(_belief: BeliefState): ICausalNetwork | null;
    /**
     * Simulate intervention effect on belief state
     */
    simulateIntervention(belief: BeliefState, target: string, intervention: 'increase' | 'decrease' | 'stabilize', magnitude: number): IInterventionSimulation | null;
    /**
     * Get attention explanation for current state
     */
    explainPrediction(belief: BeliefState): IAttentionWeights | null;
    /**
     * Convert belief to observation vector
     */
    toObservation(belief: BeliefState): number[];
    /**
     * Convert belief to PLRNN state
     */
    toPLRNNState(belief: BeliefState, hiddenUnits?: number): IPLRNNState;
    /**
     * Convert belief to KalmanFormer state
     */
    toKalmanFormerState(belief: BeliefState, contextWindow?: number): IKalmanFormerState;
}
/**
 * Engine types for factory function
 */
interface IBeliefAdapterEngines {
    plrnn?: {
        forward: (state: IPLRNNState, input?: number[]) => IPLRNNState;
        predict: (state: IPLRNNState, horizon: number) => IPLRNNPrediction;
        extractCausalNetwork: () => ICausalNetwork;
        simulateIntervention: (state: IPLRNNState, target: string, intervention: 'increase' | 'decrease' | 'stabilize', magnitude: number) => IInterventionSimulation;
    };
    kalmanFormer?: {
        update: (state: IKalmanFormerState, observation: number[], timestamp: Date) => IKalmanFormerState;
        predict: (state: IKalmanFormerState, horizon: number) => IKalmanFormerPrediction;
        explain: (state: IKalmanFormerState) => IAttentionWeights;
    };
}
/**
 * Factory function
 */
declare function createBeliefStateAdapter(engines?: IBeliefAdapterEngines): BeliefStateAdapter;

/**
 * ⏰ TEMPORAL PREDICTION INTERFACES
 * ==================================
 * Temporal Echo Engine - State Forecasting System
 *
 * Scientific Foundation (2024-2025 Research):
 * - Kalman Filter for mood dynamics (Applied Comp. Psychiatry Lab, 2024)
 * - JITAI frameworks for vulnerability windows (Frontiers Digital Health, 2025)
 * - Nonlinear state-space models (medRxiv, 2025)
 * - Transformer-based emotion forecasting (JMIR, 2025)
 * - EMA + passive sensing prediction (JMIR, 2025)
 *
 * Prediction Horizons:
 * - 6h: Immediate intervention window
 * - 12h: Short-term planning
 * - 24h: Daily rhythm prediction
 * - 72h: Multi-day trajectory
 * - 1w: Weekly pattern analysis
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

/**
 * Prediction time horizons
 * Based on JITAI research optimal intervention windows
 */
type PredictionHorizon = '6h' | '12h' | '24h' | '72h' | '1w';
/**
 * Trend direction
 */
type TrendDirection = 'improving' | 'stable' | 'declining' | 'volatile' | 'unknown';
/**
 * Phase transition types (nonlinear dynamics)
 * Based on medRxiv 2025 research on psychological phase transitions
 */
type PhaseTransition = 'none' | 'crisis_approaching' | 'recovery_beginning' | 'relapse_warning' | 'breakthrough_imminent' | 'mood_shift' | 'stability_achieved';
/**
 * Vulnerability window (JITAI concept)
 * Optimal time for intervention delivery
 */
interface VulnerabilityWindow {
    readonly id: string;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly type: 'high_risk' | 'receptive' | 'opportunity' | 'critical';
    readonly confidence: number;
    readonly predictedState: {
        readonly riskLevel: RiskLevel$2;
        readonly emotionalValence: number;
        readonly cognitiveLoad: number;
    };
    readonly recommendedInterventionTypes: string[];
    readonly triggerFactors: string[];
}
/**
 * Temporal pattern detected in data
 */
interface TemporalPattern {
    readonly id: string;
    readonly name: string;
    readonly type: 'circadian' | 'weekly' | 'monthly' | 'seasonal' | 'event_triggered' | 'random';
    readonly description: string;
    readonly confidence: number;
    readonly period?: number;
    readonly peakTimes?: string[];
    readonly associatedFactors: string[];
    readonly therapeuticImplications: string[];
}
/**
 * Single prediction point
 */
interface PredictionPoint {
    readonly timestamp: Date;
    readonly horizon: PredictionHorizon;
    /**
     * Predicted values (0.0 - 1.0 normalized)
     */
    readonly predicted: {
        readonly wellbeingIndex: number;
        readonly riskLevel: RiskLevel$2;
        readonly emotionalValence: number;
        readonly emotionalArousal: number;
        readonly cognitiveLoad: number;
        readonly resourceAvailability: number;
    };
    /**
     * Confidence interval (95%)
     */
    readonly confidenceInterval: {
        readonly lower: number;
        readonly upper: number;
    };
    /**
     * Overall prediction confidence
     */
    readonly confidence: number;
    /**
     * Factors contributing to prediction
     */
    readonly contributingFactors: Array<{
        readonly factor: string;
        readonly weight: number;
        readonly direction: 'positive' | 'negative' | 'neutral';
    }>;
}
/**
 * State trajectory (sequence of predictions)
 */
interface StateTrajectory {
    readonly userId: string | number;
    readonly generatedAt: Date;
    readonly basedOnState: string;
    /**
     * Prediction points for each horizon
     */
    readonly predictions: Map<PredictionHorizon, PredictionPoint>;
    /**
     * Overall trend
     */
    readonly overallTrend: TrendDirection;
    /**
     * Detected phase transitions
     */
    readonly phaseTransitions: Array<{
        readonly type: PhaseTransition;
        readonly predictedTime: Date;
        readonly confidence: number;
        readonly preventable: boolean;
        readonly preventionActions: string[];
    }>;
    /**
     * Vulnerability windows
     */
    readonly vulnerabilityWindows: VulnerabilityWindow[];
    /**
     * Detected temporal patterns
     */
    readonly patterns: TemporalPattern[];
    /**
     * Risk trajectory summary
     */
    readonly riskTrajectory: {
        readonly current: RiskLevel$2;
        readonly predicted6h: RiskLevel$2;
        readonly predicted24h: RiskLevel$2;
        readonly predicted72h: RiskLevel$2;
        readonly trend: TrendDirection;
        readonly peakRiskTime?: Date;
        readonly lowestRiskTime?: Date;
    };
}
/**
 * Early warning signal
 * Based on dynamical systems theory
 */
interface EarlyWarningSignal {
    readonly id: string;
    readonly type: 'critical_slowing' | 'increased_variance' | 'increased_autocorrelation' | 'flickering';
    readonly detectedAt: Date;
    readonly strength: number;
    readonly possibleTransition: PhaseTransition;
    readonly timeToTransition?: number;
    readonly confidence: number;
    readonly description: string;
    readonly recommendedActions: string[];
}
/**
 * Circadian rhythm analysis
 */
interface CircadianProfile {
    readonly userId: string | number;
    readonly analyzedFrom: Date;
    readonly analyzedTo: Date;
    /**
     * Hour-by-hour typical state (0-23)
     */
    readonly hourlyProfile: Array<{
        readonly hour: number;
        readonly avgWellbeing: number;
        readonly avgRisk: number;
        readonly avgEnergy: number;
        readonly variability: number;
        readonly sampleCount: number;
    }>;
    /**
     * Peak and trough times
     */
    readonly peaks: {
        readonly bestMoodTime: number;
        readonly worstMoodTime: number;
        readonly highestEnergyTime: number;
        readonly lowestEnergyTime: number;
    };
    /**
     * Optimal intervention times
     */
    readonly optimalInterventionWindows: Array<{
        readonly startHour: number;
        readonly endHour: number;
        readonly interventionType: string;
        readonly rationale: string;
    }>;
}
/**
 * Temporal Echo Engine Interface
 */
interface ITemporalEchoEngine {
    /**
     * Generate state trajectory predictions
     */
    predictTrajectory(currentState: IStateVector, stateHistory: IStateVector[], horizons?: PredictionHorizon[]): Promise<StateTrajectory>;
    /**
     * Predict single time point
     */
    predictAtHorizon(currentState: IStateVector, horizon: PredictionHorizon): Promise<PredictionPoint>;
    /**
     * Detect vulnerability windows
     */
    detectVulnerabilityWindows(trajectory: StateTrajectory, options?: {
        minConfidence?: number;
        windowTypes?: VulnerabilityWindow['type'][];
    }): VulnerabilityWindow[];
    /**
     * Analyze circadian patterns
     */
    analyzeCircadianRhythm(stateHistory: IStateVector[], minDays?: number): Promise<CircadianProfile | null>;
    /**
     * Detect early warning signals
     */
    detectEarlyWarnings(stateHistory: IStateVector[], windowSize?: number): EarlyWarningSignal[];
    /**
     * Detect temporal patterns
     */
    detectPatterns(stateHistory: IStateVector[]): TemporalPattern[];
    /**
     * Estimate time to specific state
     */
    estimateTimeToState(currentState: IStateVector, targetCondition: {
        riskLevel?: RiskLevel$2;
        minWellbeing?: number;
        emotionType?: EmotionType$1;
    }): Promise<{
        estimatedHours: number | null;
        confidence: number;
        pathway: string;
    }>;
    /**
     * Get optimal intervention timing
     */
    getOptimalInterventionTiming(currentState: IStateVector, interventionType: string): Promise<{
        optimalTime: Date;
        confidence: number;
        rationale: string;
        alternativeTimes: Date[];
    }>;
}

/**
 * 🪞 DEEP COGNITIVE MIRROR - INTERFACES
 * ======================================
 * Cognitive Pattern Analysis & Therapeutic Insight System
 *
 * Scientific Foundation (2024-2025 Research):
 * - ABCD Model (Ellis/Beck): Activating event → Belief → Consequence → Disputation
 * - Burns' Cognitive Distortion Taxonomy (15 categories)
 * - nBERT for emotion recognition in psychotherapy (MDPI, 2025)
 * - Cognitive Pathway Extraction from social media (arXiv, 2024)
 * - Socrates 2.0 Multi-agent Socratic dialogue (JMIR, 2024)
 * - Therapeutic reflection generation (npj Digital Medicine, 2025)
 *
 * Core Functions:
 * 1. Cognitive Pattern Recognition - detect thinking patterns
 * 2. Distortion Detection - identify 15+ cognitive distortions
 * 3. Thought-Emotion Linkage - ABCD model analysis
 * 4. Therapeutic Insight Generation - personalized reflections
 * 5. Cognitive Restructuring Support - alternative thought generation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

/**
 * Activating Event - the trigger situation
 * Based on Ellis's REBT and Beck's CT
 */
interface ActivatingEvent {
    readonly id: string;
    readonly description: string;
    readonly category: ActivatingEventCategory;
    readonly context: EventContext;
    readonly timestamp: Date;
    readonly extractedFrom: string;
    readonly confidence: number;
}
type ActivatingEventCategory = 'interpersonal' | 'achievement' | 'loss' | 'threat' | 'self_evaluation' | 'life_transition' | 'daily_hassle' | 'trauma_reminder' | 'undefined';
interface EventContext {
    readonly setting?: string;
    readonly involvedPeople?: string[];
    readonly timeContext?: 'past' | 'present' | 'future' | 'hypothetical';
    readonly intensity: number;
}
/**
 * Belief - the automatic thought or interpretation
 * Core of cognitive distortion detection
 */
interface AutomaticThought {
    readonly id: string;
    readonly content: string;
    readonly type: ThoughtType;
    readonly distortions: DetectedDistortion[];
    readonly cognitiveTriadTarget: 'self' | 'world' | 'future' | 'multiple';
    readonly believability: number;
    readonly timestamp: Date;
    readonly linkedEventId?: string;
    readonly confidence: number;
}
type ThoughtType = 'automatic_negative' | 'automatic_positive' | 'core_belief' | 'intermediate_belief' | 'rational' | 'neutral';
/**
 * Detected Cognitive Distortion
 * Based on Burns' 15-category taxonomy + extensions
 */
interface DetectedDistortion {
    readonly type: CognitiveDistortionType;
    readonly confidence: number;
    readonly evidenceSpan: TextSpan;
    readonly severity: 'mild' | 'moderate' | 'severe';
    readonly frequency?: 'isolated' | 'recurring' | 'pervasive';
}
interface TextSpan {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
/**
 * Consequence - emotional and behavioral response
 */
interface EmotionalConsequence {
    readonly id: string;
    readonly emotions: Array<{
        type: EmotionType$1;
        intensity: number;
        confidence: number;
    }>;
    readonly behavioralUrges: BehavioralUrge[];
    readonly physiologicalSigns?: string[];
    readonly linkedThoughtId?: string;
    readonly timestamp: Date;
}
interface BehavioralUrge {
    readonly action: string;
    readonly category: BehavioralCategory;
    readonly intensity: number;
    readonly isAdaptive: boolean;
}
type BehavioralCategory = 'avoidance' | 'withdrawal' | 'aggression' | 'self_soothing' | 'help_seeking' | 'problem_solving' | 'rumination' | 'substance_use' | 'self_harm' | 'compulsion';
/**
 * Disputation - challenging the thought
 * Socratic questioning approach
 */
interface Disputation {
    readonly id: string;
    readonly targetThoughtId: string;
    readonly type: DisputationType;
    readonly questions: SocraticQuestion[];
    readonly alternativeThoughts: AlternativeThought[];
    readonly evidenceFor: string[];
    readonly evidenceAgainst: string[];
    readonly timestamp: Date;
}
type DisputationType = 'empirical' | 'logical' | 'functional' | 'philosophical' | 'compassionate';
interface SocraticQuestion {
    readonly question: string;
    readonly type: DisputationType;
    readonly targetDistortion?: CognitiveDistortionType;
    readonly difficulty: 'easy' | 'medium' | 'challenging';
}
interface AlternativeThought {
    readonly content: string;
    readonly believability: number;
    readonly isBalanced: boolean;
    readonly preservesValidConcerns: boolean;
}
/**
 * Complete ABCD Chain - full cognitive pathway
 */
interface ABCDChain {
    readonly id: string;
    readonly userId: string | number;
    readonly activatingEvent: ActivatingEvent;
    readonly beliefs: AutomaticThought[];
    readonly consequences: EmotionalConsequence[];
    readonly disputations?: Disputation[];
    readonly timestamp: Date;
    readonly completeness: 'partial' | 'complete';
    readonly confidence: number;
}
/**
 * Cognitive Pattern - recurring theme across chains
 */
interface CognitivePattern {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly type: PatternType;
    readonly frequency: number;
    readonly triggerCategories: ActivatingEventCategory[];
    readonly associatedDistortions: CognitiveDistortionType[];
    readonly typicalEmotions: EmotionType$1[];
    readonly firstObserved: Date;
    readonly lastObserved: Date;
    readonly strength: number;
    readonly isAdaptive: boolean;
}
type PatternType = 'core_belief' | 'conditional_assumption' | 'compensatory_strategy' | 'schema' | 'trigger_response' | 'avoidance_cycle' | 'rumination_loop' | 'safety_behavior';
/**
 * Thinking Style Profile
 * Meta-analysis of cognitive tendencies
 */
interface ThinkingStyleProfile {
    readonly userId: string | number;
    readonly timestamp: Date;
    readonly distortionProfile: Map<CognitiveDistortionType, number>;
    readonly triadBalance: {
        readonly selfFocus: number;
        readonly worldFocus: number;
        readonly futureFocus: number;
    };
    readonly dimensions: {
        readonly abstractVsConcrete: number;
        readonly internalVsExternal: number;
        readonly globalVsSpecific: number;
        readonly stableVsUnstable: number;
    };
    readonly metacognition: {
        readonly thoughtAwareness: number;
        readonly emotionAwareness: number;
        readonly patternRecognition: number;
        readonly flexibilityScore: number;
    };
    readonly resilience: {
        readonly copingFlexibility: number;
        readonly distressTolerance: number;
        readonly optimismBias: number;
        readonly growthMindset: number;
    };
}
/**
 * Therapeutic Insight - generated reflection
 */
interface TherapeuticInsight {
    readonly id: string;
    readonly type: InsightType;
    readonly content: string;
    readonly targetPattern?: CognitivePattern;
    readonly targetDistortion?: CognitiveDistortionType;
    readonly supportingEvidence: string[];
    readonly suggestedExercises: TherapeuticExercise[];
    readonly timing: InsightTiming;
    readonly personalizationFactors: string[];
    readonly confidence: number;
    readonly timestamp: Date;
}
type InsightType = 'pattern_observation' | 'reframe_suggestion' | 'validation' | 'psychoeducation' | 'strength_highlight' | 'progress_reflection' | 'gentle_challenge' | 'future_oriented';
type InsightTiming = 'immediate' | 'session_end' | 'pattern_detected' | 'progress_milestone' | 'check_in';
interface TherapeuticExercise {
    readonly id: string;
    readonly name: string;
    readonly type: ExerciseType;
    readonly duration: number;
    readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
    readonly targetSkill: string;
    readonly instructions: string[];
    readonly expectedBenefit: string;
}
type ExerciseType = 'thought_record' | 'behavioral_experiment' | 'cognitive_restructuring' | 'mindfulness' | 'behavioral_activation' | 'exposure' | 'problem_solving' | 'self_compassion' | 'values_clarification';
/**
 * Text Analysis Result
 * Output of analyzing user message
 */
interface TextAnalysisResult {
    readonly originalText: string;
    readonly timestamp: Date;
    readonly events: ActivatingEvent[];
    readonly thoughts: AutomaticThought[];
    readonly emotions: EmotionalConsequence[];
    readonly chains: ABCDChain[];
    readonly metrics: {
        readonly overallNegativity: number;
        readonly distortionDensity: number;
        readonly emotionalIntensity: number;
        readonly cognitiveComplexity: number;
        readonly insightReadiness: number;
    };
    readonly processingTime: number;
    readonly confidence: number;
}
/**
 * Session Analysis Result
 * Analysis across multiple messages
 */
interface SessionAnalysisResult {
    readonly sessionId: string;
    readonly userId: string | number;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly chains: ABCDChain[];
    readonly emergingPatterns: CognitivePattern[];
    readonly dynamics: {
        readonly emotionalTrajectory: Array<{
            timestamp: Date;
            valence: number;
            arousal: number;
        }>;
        readonly insightMoments: Array<{
            timestamp: Date;
            type: InsightType;
            description: string;
        }>;
        readonly engagementLevel: number;
    };
    readonly insights: TherapeuticInsight[];
    readonly recommendations: {
        readonly nextSessionFocus: string[];
        readonly homeworkSuggestions: TherapeuticExercise[];
        readonly riskFlags: string[];
    };
}
/**
 * Deep Cognitive Mirror Engine Interface
 * Main API for cognitive analysis and insight generation
 */
interface IDeepCognitiveMirror {
    /**
     * Analyze single text message for cognitive content
     */
    analyzeText(text: string, userId: string | number, context?: AnalysisContext): Promise<TextAnalysisResult>;
    /**
     * Analyze multiple messages as a session
     */
    analyzeSession(messages: Array<{
        text: string;
        timestamp: Date;
    }>, userId: string | number): Promise<SessionAnalysisResult>;
    /**
     * Extract ABCD chain from text
     */
    extractABCDChain(text: string, userId: string | number): Promise<ABCDChain | null>;
    /**
     * Link existing components into chain
     */
    linkABCDComponents(event: ActivatingEvent, thoughts: AutomaticThought[], consequences: EmotionalConsequence[]): ABCDChain;
    /**
     * Detect cognitive distortions in text
     */
    detectDistortions(text: string): Promise<DetectedDistortion[]>;
    /**
     * Get distortion profile for user over time
     */
    getDistortionProfile(userId: string | number, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<Map<CognitiveDistortionType, number>>;
    /**
     * Detect cognitive patterns from history
     */
    detectPatterns(userId: string | number, minConfidence?: number): Promise<CognitivePattern[]>;
    /**
     * Get thinking style profile
     */
    getThinkingStyleProfile(userId: string | number): Promise<ThinkingStyleProfile>;
    /**
     * Check if pattern matches current text
     */
    matchPattern(text: string, pattern: CognitivePattern): {
        matches: boolean;
        similarity: number;
    };
    /**
     * Generate therapeutic insight for current state
     */
    generateInsight(context: InsightContext): Promise<TherapeuticInsight>;
    /**
     * Generate Socratic questions for thought
     */
    generateSocraticQuestions(thought: AutomaticThought, count?: number): Promise<SocraticQuestion[]>;
    /**
     * Generate alternative thoughts
     */
    generateAlternativeThoughts(thought: AutomaticThought, count?: number): Promise<AlternativeThought[]>;
    /**
     * Generate disputation for thought
     */
    generateDisputation(thought: AutomaticThought): Promise<Disputation>;
    /**
     * Get recommended exercises for user
     */
    getRecommendedExercises(userId: string | number, focus?: CognitiveDistortionType | PatternType): Promise<TherapeuticExercise[]>;
    /**
     * Store analyzed chain
     */
    storeChain(chain: ABCDChain): Promise<void>;
    /**
     * Get historical chains for user
     */
    getChainHistory(userId: string | number, options?: {
        limit?: number;
        timeRange?: {
            start: Date;
            end: Date;
        };
        distortionFilter?: CognitiveDistortionType;
    }): Promise<ABCDChain[]>;
    /**
     * Get insight history
     */
    getInsightHistory(userId: string | number, limit?: number): Promise<TherapeuticInsight[]>;
}
interface AnalysisContext {
    readonly previousMessages?: string[];
    readonly currentEmotion?: EmotionType$1;
    readonly recentPatterns?: CognitivePattern[];
    readonly sessionGoal?: string;
    readonly urgency?: 'low' | 'medium' | 'high';
}
interface InsightContext {
    readonly userId: string | number;
    readonly currentText?: string;
    readonly currentChain?: ABCDChain;
    readonly currentPattern?: CognitivePattern;
    readonly emotionalState?: EmotionType$1;
    readonly insightType?: InsightType;
    readonly previousInsights?: TherapeuticInsight[];
}

/**
 * 🎯 INTERVENTION OPTIMIZATION ENGINE - INTERFACES
 * =================================================
 * Phase 3.4: Multi-Armed Bandit & Reinforcement Learning
 * for Optimal Intervention Selection
 *
 * Scientific Foundation (2024-2025):
 * - CAREForMe (MOBILESoft 2024) - Contextual MAB for mental health
 * - DIAMANTE Trial (JMIR 2024) - RL for depression, 19% improvement
 * - StayWell Trial (npj 2025) - CBT/DBT with RL, 25% depression reduction
 * - IntelligentPooling - Thompson Sampling for mHealth
 * - MRT Design (HeartSteps) - 210 randomizations per participant
 * - JITAI Framework - Just-In-Time Adaptive Interventions
 *
 * Key Algorithms:
 * - Thompson Sampling with Beta/Normal conjugate priors
 * - Contextual Bandits with state features
 * - Reward Shaping for sparse healthcare outcomes
 * - Exploration/Exploitation via UCB and Thompson
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Intervention categories based on clinical taxonomy
 * Aligned with CAREForMe and StayWell frameworks
 */
type InterventionCategory = 'cognitive_restructuring' | 'behavioral_activation' | 'mindfulness' | 'psychoeducation' | 'social_support' | 'crisis_intervention' | 'distress_tolerance' | 'emotion_regulation' | 'interpersonal_effectiveness' | 'physical_wellness' | 'goal_setting' | 'self_compassion' | 'gratitude' | 'values_clarification' | 'acceptance' | 'exposure' | 'problem_solving';
/**
 * Intervention intensity levels (JITAI framework)
 */
type InterventionIntensity = 'micro' | 'brief' | 'standard' | 'extended' | 'intensive';
/**
 * Delivery modality
 */
type DeliveryModality = 'text_message' | 'interactive_exercise' | 'guided_reflection' | 'audio_guidance' | 'image_prompt' | 'video_content' | 'chatbot_dialogue' | 'peer_connection';
/**
 * Outcome types for reward modeling
 * Based on DIAMANTE and StayWell outcome measures
 */
type OutcomeType = 'engagement' | 'completion' | 'self_reported_mood' | 'mood_improvement' | 'symptom_reduction' | 'behavioral_change' | 'skill_acquisition' | 'crisis_averted' | 'user_rating' | 'return_engagement';
/**
 * Decision point types (MRT framework)
 * HeartSteps: 5 decision points/day, 210 total per 42-day study
 */
type DecisionPointType = 'scheduled' | 'event_triggered' | 'state_triggered' | 'user_initiated' | 'crisis_triggered' | 'random';
/**
 * Exploration strategy
 */
type ExplorationStrategy = 'thompson_sampling' | 'ucb' | 'epsilon_greedy' | 'boltzmann' | 'gradient_bandit';
/**
 * Complete intervention definition
 */
interface IIntervention$1 {
    /** Unique identifier */
    readonly id: string;
    /** Human-readable name */
    readonly name: string;
    /** Detailed description */
    readonly description: string;
    /** Category classification */
    readonly category: InterventionCategory;
    /** Intensity level */
    readonly intensity: InterventionIntensity;
    /** Delivery method */
    readonly modality: DeliveryModality;
    /** Estimated duration in seconds */
    readonly estimatedDurationSeconds: number;
    /** Required user state conditions */
    readonly preconditions: IInterventionPreconditions;
    /** Contraindications - when NOT to use */
    readonly contraindications: IInterventionContraindications;
    /** Content in multiple languages */
    readonly content: IInterventionContent$1;
    /** Therapeutic mechanisms */
    readonly mechanisms: TherapeuticMechanism[];
    /** Target outcomes */
    readonly targetOutcomes: OutcomeType[];
    /** Evidence base strength */
    readonly evidenceLevel: EvidenceLevel;
    /** Creation timestamp */
    readonly createdAt: Date;
    /** Last update timestamp */
    readonly updatedAt: Date;
    /** Active status */
    readonly isActive: boolean;
}
/**
 * Preconditions for intervention eligibility
 */
interface IInterventionPreconditions {
    /** Minimum emotional state (valence) */
    minValence?: number;
    /** Maximum emotional state (valence) */
    maxValence?: number;
    /** Minimum arousal */
    minArousal?: number;
    /** Maximum arousal */
    maxArousal?: number;
    /** Minimum energy level */
    minEnergy?: number;
    /** Maximum risk level allowed */
    maxRiskLevel?: 'none' | 'low' | 'moderate' | 'elevated' | 'high' | 'crisis';
    /** Required time available (seconds) */
    requiredTimeAvailable?: number;
    /** Time of day restrictions */
    allowedTimeOfDay?: TimeOfDay[];
    /** Minimum sessions completed */
    minSessionsCompleted?: number;
    /** Required previous interventions */
    requiredPriorInterventions?: string[];
    /** Cognitive distortions that should be present */
    targetDistortions?: string[];
}
/**
 * When NOT to deliver intervention
 */
interface IInterventionContraindications {
    /** Active crisis state */
    crisisState?: boolean;
    /** Specific emotions to avoid */
    avoidEmotions?: string[];
    /** Maximum number of interventions per day */
    maxDailyInterventions?: number;
    /** Minimum time since last intervention (seconds) */
    minTimeSinceLastIntervention?: number;
    /** Specific distortions where this shouldn't be used */
    avoidWithDistortions?: string[];
    /** User has explicitly declined this type */
    userDeclined?: boolean;
}
/**
 * Time of day categories
 */
type TimeOfDay = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night';
/**
 * Therapeutic mechanism of action
 */
type TherapeuticMechanism = 'cognitive_defusion' | 'behavioral_change' | 'emotional_processing' | 'social_connection' | 'physiological_regulation' | 'insight_generation' | 'skill_building' | 'motivation_enhancement' | 'self_awareness' | 'values_alignment';
/**
 * Evidence level classification
 */
type EvidenceLevel = 'meta_analysis' | 'rct' | 'quasi_experimental' | 'observational' | 'expert_consensus' | 'theoretical';
/**
 * Multilingual content
 */
interface IInterventionContent$1 {
    /** English content */
    en: ILocalizedContent;
    /** Russian content */
    ru: ILocalizedContent;
}
/**
 * Content in single language
 */
interface ILocalizedContent {
    /** Introduction text */
    introduction: string;
    /** Main instruction/exercise */
    mainContent: string;
    /** Step-by-step instructions if applicable */
    steps?: string[];
    /** Reflection prompts */
    reflectionPrompts?: string[];
    /** Closing/summary text */
    closing: string;
    /** Quick version for micro intensity */
    quickVersion?: string;
}
/**
 * Context vector for contextual bandit
 * Features extracted from StateVector and environment
 */
interface IContextualFeatures {
    valence: number;
    arousal: number;
    dominance: number;
    emotionalStability: number;
    moodTrend: 'improving' | 'stable' | 'declining';
    cognitiveDistortionCount: number;
    primaryDistortion?: string;
    cognitiveFlexibility: number;
    insightLevel: number;
    energyLevel: number;
    copingCapacity: number;
    socialSupport: number;
    riskLevel: number;
    crisisProximity: number;
    hourOfDay: number;
    dayOfWeek: number;
    minutesSinceLastInteraction: number;
    sessionsToday: number;
    sessionsTotalLifetime: number;
    daysSinceFirstSession: number;
    averageSessionDuration: number;
    completionRate: number;
    engagementScore: number;
    preferredIntensity: InterventionIntensity;
    preferredCategory?: InterventionCategory;
    lastInterventionCategory?: InterventionCategory;
    lastInterventionOutcome?: number;
    interventionFatigue: number;
    categoryExposureCounts: Record<InterventionCategory, number>;
}
/**
 * Bandit arm representing an intervention option
 */
interface IBanditArm {
    /** Intervention ID */
    interventionId: string;
    /** Number of times pulled */
    pullCount: number;
    /** Total reward accumulated */
    totalReward: number;
    /** Mean reward estimate */
    meanReward: number;
    /** Reward variance */
    rewardVariance: number;
    /** For Thompson Sampling: Beta distribution alpha */
    alphaSuccess: number;
    /** For Thompson Sampling: Beta distribution beta */
    betaFailure: number;
    /** For Normal Thompson: mean estimate */
    normalMean: number;
    /** For Normal Thompson: precision (1/variance) */
    normalPrecision: number;
    /** UCB value for exploration bonus */
    ucbValue: number;
    /** Last update timestamp */
    lastUpdated: Date;
    /** Last pull timestamp */
    lastPulled?: Date;
}
/**
 * Contextual bandit arm with feature weights
 */
interface IContextualBanditArm extends IBanditArm {
    /** Linear model weights for features */
    featureWeights: Record<string, number>;
    /** Covariance matrix for LinUCB (flattened) */
    covarianceMatrix: number[];
    /** Feature vector accumulator */
    featureAccumulator: number[];
    /** Reward-weighted feature accumulator */
    rewardFeatureAccumulator: number[];
}
/**
 * A decision point where intervention may be delivered
 */
interface IDecisionPoint {
    /** Unique identifier */
    id: string;
    /** User identifier */
    userId: string;
    /** Timestamp */
    timestamp: Date;
    /** Type of decision point */
    type: DecisionPointType;
    /** Contextual features at this point */
    context: IContextualFeatures;
    /** Whether intervention was delivered */
    interventionDelivered: boolean;
    /** Selected intervention if delivered */
    selectedIntervention?: string;
    /** Selection probability (for MRT) */
    selectionProbability?: number;
    /** Reason for selection/non-selection */
    selectionReason: string;
    /** Exploration flag */
    wasExploration: boolean;
}
/**
 * Outcome measurement after intervention
 */
interface IInterventionOutcome {
    /** Decision point ID */
    decisionPointId: string;
    /** User identifier */
    userId: string;
    /** Intervention ID */
    interventionId: string;
    /** Timestamp of outcome measurement */
    timestamp: Date;
    /** Time elapsed since intervention (seconds) */
    latencySeconds: number;
    /** Outcome type */
    outcomeType: OutcomeType;
    /** Outcome value (-1 to 1, normalized) */
    value: number;
    /** Raw value before normalization */
    rawValue: number;
    /** Confidence in measurement */
    confidence: number;
    /** Context at outcome time */
    outcomeContext?: Partial<IContextualFeatures>;
}
/**
 * Reward signal for bandit update
 */
interface IRewardSignal {
    /** Primary reward value (0 to 1 for Beta, unbounded for Normal) */
    reward: number;
    /** Immediate engagement reward */
    immediateReward: number;
    /** Delayed outcome reward */
    delayedReward: number;
    /** Shaped reward with auxiliary signals */
    shapedReward: number;
    /** Discount factor applied */
    discountFactor: number;
    /** Contributing outcomes */
    outcomes: IInterventionOutcome[];
    /** Reward shaping components */
    shapingComponents: IRewardShapingComponents;
}
/**
 * Reward shaping for sparse healthcare outcomes
 * Based on potential-based reward shaping (Ng et al.)
 */
interface IRewardShapingComponents {
    /** Engagement bonus for interaction */
    engagementBonus: number;
    /** Completion bonus */
    completionBonus: number;
    /** Progress toward goal */
    progressPotential: number;
    /** Exploration bonus */
    explorationBonus: number;
    /** Novelty bonus */
    noveltyBonus: number;
    /** Diversity bonus (variety in interventions) */
    diversityBonus: number;
    /** Time appropriateness */
    timingBonus: number;
    /** Context match bonus */
    contextMatchBonus: number;
}
/**
 * User's intervention history and preferences
 */
interface IUserInterventionProfile {
    /** User identifier */
    userId: string;
    /** Total interventions received */
    totalInterventions: number;
    /** Interventions by category */
    categoryHistory: Record<InterventionCategory, ICategoryStats>;
    /** Individual intervention stats */
    interventionStats: Record<string, IInterventionStats>;
    /** Preferred categories (learned) */
    preferredCategories: InterventionCategory[];
    /** Avoided categories (explicit or learned) */
    avoidedCategories: InterventionCategory[];
    /** Preferred intensity */
    preferredIntensity: InterventionIntensity;
    /** Preferred time of day */
    preferredTimeOfDay: TimeOfDay[];
    /** Overall engagement rate */
    engagementRate: number;
    /** Overall completion rate */
    completionRate: number;
    /** Average outcome improvement */
    averageOutcomeImprovement: number;
    /** Last intervention timestamp */
    lastInterventionAt?: Date;
    /** Profile creation date */
    createdAt: Date;
    /** Last update */
    updatedAt: Date;
}
/**
 * Statistics for a category
 */
interface ICategoryStats {
    /** Number of interventions */
    count: number;
    /** Average reward */
    averageReward: number;
    /** Reward variance */
    rewardVariance: number;
    /** Engagement rate */
    engagementRate: number;
    /** Completion rate */
    completionRate: number;
    /** Last used */
    lastUsed?: Date;
}
/**
 * Statistics for individual intervention
 */
interface IInterventionStats {
    /** Number of times delivered */
    deliveryCount: number;
    /** Number of engagements */
    engagementCount: number;
    /** Number of completions */
    completionCount: number;
    /** Total reward */
    totalReward: number;
    /** Average reward */
    averageReward: number;
    /** Best outcome achieved */
    bestOutcome: number;
    /** Last delivered */
    lastDelivered?: Date;
    /** User explicit feedback */
    userFeedback?: 'positive' | 'neutral' | 'negative';
}
/**
 * Intervention optimizer configuration
 */
interface IOptimizerConfig {
    /** Exploration strategy */
    explorationStrategy: ExplorationStrategy;
    /** Epsilon for epsilon-greedy (0 to 1) */
    epsilon: number;
    /** Temperature for Boltzmann (softmax) */
    temperature: number;
    /** UCB exploration constant */
    ucbConstant: number;
    /** Thompson Sampling prior strength */
    thompsonPriorStrength: number;
    /** Minimum pulls before exploitation */
    minPullsPerArm: number;
    /** Reward discount factor */
    rewardDiscountFactor: number;
    /** Delayed reward weight */
    delayedRewardWeight: number;
    /** Immediate reward weight */
    immediateRewardWeight: number;
    /** Enable reward shaping */
    enableRewardShaping: boolean;
    /** Reward shaping weights */
    rewardShapingWeights: IRewardShapingWeights;
    /** Maximum interventions per day */
    maxInterventionsPerDay: number;
    /** Minimum time between interventions (seconds) */
    minInterventionIntervalSeconds: number;
    /** Enable contextual features */
    enableContextualBandit: boolean;
    /** Feature regularization (L2) */
    contextualRegularization: number;
    /** Enable MRT-style randomization */
    enableMRTRandomization: boolean;
    /** MRT randomization probability */
    mrtRandomizationProbability: number;
    /** Enable crisis override */
    enableCrisisOverride: boolean;
    /** Learning rate for online updates */
    learningRate: number;
    /** Batch size for batch updates */
    batchSize: number;
}
/**
 * Reward shaping weights
 */
interface IRewardShapingWeights {
    engagementBonus: number;
    completionBonus: number;
    progressPotential: number;
    explorationBonus: number;
    noveltyBonus: number;
    diversityBonus: number;
    timingBonus: number;
    contextMatchBonus: number;
}
/**
 * Result of intervention selection
 */
interface IInterventionSelection {
    /** Selected intervention */
    intervention: IIntervention$1;
    /** Selection confidence */
    confidence: number;
    /** Expected reward */
    expectedReward: number;
    /** Selection probability */
    probability: number;
    /** Whether this was exploration */
    isExploration: boolean;
    /** Exploration strategy used */
    explorationStrategy: ExplorationStrategy;
    /** Alternative interventions considered */
    alternatives: IAlternativeIntervention[];
    /** Selection reasoning */
    reasoning: ISelectionReasoning;
    /** Decision point */
    decisionPoint: IDecisionPoint;
}
/**
 * Alternative intervention considered
 */
interface IAlternativeIntervention {
    interventionId: string;
    expectedReward: number;
    probability: number;
    reasonNotSelected: string;
}
/**
 * Detailed reasoning for selection
 */
interface ISelectionReasoning {
    /** Primary selection factor */
    primaryFactor: string;
    /** Context features that influenced decision */
    influentialFeatures: Array<{
        feature: string;
        value: number;
        influence: 'positive' | 'negative' | 'neutral';
    }>;
    /** Why alternatives were rejected */
    rejectionReasons: Record<string, string>;
    /** Exploration vs exploitation explanation */
    exploitationExplanation: string;
    /** Clinical appropriateness notes */
    clinicalNotes?: string;
}
/**
 * Complete optimizer state (for persistence)
 */
interface IOptimizerState {
    /** Configuration */
    config: IOptimizerConfig;
    /** All bandit arms */
    arms: Record<string, IBanditArm | IContextualBanditArm>;
    /** User profiles */
    userProfiles: Record<string, IUserInterventionProfile>;
    /** Recent decision points */
    recentDecisionPoints: IDecisionPoint[];
    /** Pending outcomes (awaiting measurement) */
    pendingOutcomes: Array<{
        decisionPointId: string;
        expectedOutcomeTime: Date;
    }>;
    /** Global statistics */
    globalStats: IGlobalStats;
    /** Last update timestamp */
    lastUpdated: Date;
    /** Version for migration */
    version: string;
}
/**
 * Global optimizer statistics
 */
interface IGlobalStats {
    /** Total decision points */
    totalDecisionPoints: number;
    /** Total interventions delivered */
    totalInterventionsDelivered: number;
    /** Overall engagement rate */
    overallEngagementRate: number;
    /** Overall outcome improvement */
    overallOutcomeImprovement: number;
    /** Exploration ratio */
    explorationRatio: number;
    /** Category distribution */
    categoryDistribution: Record<InterventionCategory, number>;
    /** Time-of-day distribution */
    timeOfDayDistribution: Record<TimeOfDay, number>;
    /** Reward trend (last 7 days) */
    rewardTrend: number[];
}
/**
 * 🎯 Main Intervention Optimizer Interface
 *
 * Multi-Armed Bandit + Contextual Bandit + Reinforcement Learning
 * for optimal intervention selection in mental health context
 */
interface IInterventionOptimizer {
    /**
     * Select optimal intervention for user
     * @param userId - User identifier
     * @param context - Contextual features
     * @param availableInterventions - Pool of available interventions
     * @returns Selected intervention with reasoning
     */
    selectIntervention(userId: string, context: IContextualFeatures, availableInterventions: IIntervention$1[]): Promise<IInterventionSelection>;
    /**
     * Check if intervention should be delivered at this decision point
     * @param userId - User identifier
     * @param context - Contextual features
     * @param decisionPointType - Type of decision point
     * @returns Whether to deliver intervention
     */
    shouldDeliver(userId: string, context: IContextualFeatures, decisionPointType: DecisionPointType): Promise<boolean>;
    /**
     * Get top-k intervention recommendations
     * @param userId - User identifier
     * @param context - Contextual features
     * @param k - Number of recommendations
     * @param availableInterventions - Pool of available interventions
     * @returns Top-k interventions with scores
     */
    getTopKRecommendations(userId: string, context: IContextualFeatures, k: number, availableInterventions: IIntervention$1[]): Promise<IInterventionSelection[]>;
    /**
     * Record outcome and update bandit
     * @param outcome - Intervention outcome
     */
    recordOutcome(outcome: IInterventionOutcome): Promise<void>;
    /**
     * Compute reward signal from outcomes
     * @param outcomes - Collection of outcomes
     * @param context - Context at intervention time
     * @returns Computed reward signal
     */
    computeReward(outcomes: IInterventionOutcome[], context: IContextualFeatures): IRewardSignal;
    /**
     * Update bandit arm with reward
     * @param interventionId - Intervention identifier
     * @param reward - Reward signal
     * @param context - Context if contextual bandit
     */
    updateArm(interventionId: string, reward: IRewardSignal, context?: IContextualFeatures): Promise<void>;
    /**
     * Batch update from multiple outcomes
     * @param outcomes - Batch of outcomes
     */
    batchUpdate(outcomes: IInterventionOutcome[]): Promise<void>;
    /**
     * Get or create user intervention profile
     * @param userId - User identifier
     * @returns User profile
     */
    getUserProfile(userId: string): Promise<IUserInterventionProfile>;
    /**
     * Update user preferences
     * @param userId - User identifier
     * @param preferences - Preference updates
     */
    updateUserPreferences(userId: string, preferences: Partial<IUserInterventionProfile>): Promise<void>;
    /**
     * Record user explicit feedback
     * @param userId - User identifier
     * @param interventionId - Intervention identifier
     * @param feedback - User feedback
     */
    recordUserFeedback(userId: string, interventionId: string, feedback: 'positive' | 'neutral' | 'negative'): Promise<void>;
    /**
     * Register new intervention
     * @param intervention - Intervention definition
     */
    registerIntervention(intervention: IIntervention$1): Promise<void>;
    /**
     * Update intervention definition
     * @param interventionId - Intervention identifier
     * @param updates - Updates to apply
     */
    updateIntervention(interventionId: string, updates: Partial<IIntervention$1>): Promise<void>;
    /**
     * Deactivate intervention
     * @param interventionId - Intervention identifier
     */
    deactivateIntervention(interventionId: string): Promise<void>;
    /**
     * Get intervention by ID
     * @param interventionId - Intervention identifier
     * @returns Intervention if found
     */
    getIntervention(interventionId: string): Promise<IIntervention$1 | null>;
    /**
     * Filter eligible interventions for context
     * @param interventions - All interventions
     * @param context - Current context
     * @param userProfile - User profile
     * @returns Eligible interventions
     */
    filterEligibleInterventions(interventions: IIntervention$1[], context: IContextualFeatures, userProfile: IUserInterventionProfile): IIntervention$1[];
    /**
     * Get arm statistics
     * @param interventionId - Intervention identifier
     * @returns Arm statistics
     */
    getArmStats(interventionId: string): Promise<IBanditArm | null>;
    /**
     * Get global optimizer statistics
     * @returns Global statistics
     */
    getGlobalStats(): Promise<IGlobalStats>;
    /**
     * Get optimizer state for persistence
     * @returns Complete optimizer state
     */
    getState(): Promise<IOptimizerState>;
    /**
     * Load optimizer state
     * @param state - State to load
     */
    loadState(state: IOptimizerState): Promise<void>;
    /**
     * Sample from Thompson Sampling posterior
     * @param arm - Bandit arm
     * @returns Sampled value
     */
    thompsonSample(arm: IBanditArm): number;
    /**
     * Calculate UCB value for arm
     * @param arm - Bandit arm
     * @param totalPulls - Total pulls across all arms
     * @returns UCB value
     */
    calculateUCB(arm: IBanditArm, totalPulls: number): number;
    /**
     * Get exploration probability
     * @returns Current exploration probability
     */
    getExplorationProbability(): number;
    /**
     * Decay exploration rate
     * @param decayFactor - Factor to decay by
     */
    decayExploration(decayFactor: number): void;
    /**
     * Get crisis intervention (bypasses bandit)
     * @param context - Current context
     * @returns Crisis intervention
     */
    getCrisisIntervention(context: IContextualFeatures): Promise<IIntervention$1>;
    /**
     * Check if context indicates crisis
     * @param context - Current context
     * @returns Whether crisis is detected
     */
    isCrisisContext(context: IContextualFeatures): boolean;
    /**
     * Update optimizer configuration
     * @param config - Configuration updates
     */
    updateConfig(config: Partial<IOptimizerConfig>): void;
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig(): IOptimizerConfig;
}

/**
 * Safety Envelope Interfaces
 *
 * Phase 6.2: Enterprise-Grade Safety Framework for Mental Health AI
 *
 * 2025 Research Integration:
 * - Anthropic Constitutional Classifiers (Feb 2025) - 95% jailbreak prevention
 * - EmoAgent Framework (Apr 2025) - Mental health safety assessment
 * - EU AI Act (Feb 2025) - High-risk AI requirements
 * - LlamaFirewall (May 2025) - Multi-layer guardrails
 * - Human-in-the-Loop patterns - Ethical circuit breakers
 * - Formal Verification approaches - Safety invariants with temporal logic
 *
 * Based on:
 * - Anthropic ASL (AI Safety Levels) Framework
 * - FDA AI-Enabled Device Software Guidance (Jan 2025)
 * - EU AI Act (Regulation 2024/1689) High-Risk AI Requirements
 * - CHAI Model Card Standard
 * - WHO Digital Mental Health Guidelines
 * - APA Mental Health AI Guidelines (Nov 2025)
 */
/**
 * Mental Health Safety Level (inspired by Anthropic's ASL)
 *
 * MHSL-1: Informational only, no interaction
 * MHSL-2: Supportive interaction, wellness tips (CURRENT LEVEL)
 * MHSL-3: Therapeutic guidance with human oversight
 * MHSL-4: Autonomous therapeutic intervention (requires clinical validation)
 */
type SafetyLevel = 'MHSL-1' | 'MHSL-2' | 'MHSL-3' | 'MHSL-4';
/**
 * Safety invariant categories
 * Based on 2025 research on formal verification for AI systems
 */
type SafetyInvariantCategory = 'never_diagnose' | 'never_prescribe' | 'never_discourage_help' | 'never_minimize_crisis' | 'always_escalate_crisis' | 'always_disclose_ai' | 'always_protect_minors' | 'always_protect_privacy' | 'never_manipulate' | 'always_provide_hotline' | 'never_cause_psychological_harm' | 'never_exploit_vulnerability' | 'always_enable_human_oversight' | 'always_provide_explanation';
/**
 * Violation action types
 */
type SafetyViolationAction = 'block' | 'escalate' | 'modify' | 'log_and_alert' | 'emergency' | 'circuit_breaker' | 'quarantine' | 'rollback';
/**
 * Safety invariant with formal verification properties
 */
interface ISafetyInvariant {
    id: string;
    name: string;
    description: string;
    category: SafetyInvariantCategory;
    severity: 'critical' | 'high' | 'medium';
    formalSpec?: {
        temporalLogic: string;
        preconditions: string[];
        postconditions: string[];
        invariantProperty: string;
    };
    validate: (context: ISafetyContext) => ISafetyValidationResult;
    violationAction: SafetyViolationAction;
    verificationMethod: 'pattern_matching' | 'semantic_analysis' | 'formal_proof' | 'hybrid';
    confidenceThreshold: number;
}
/**
 * Risk levels
 */
type RiskLevel$1 = 'none' | 'low' | 'moderate' | 'high' | 'critical';
/**
 * Safety operations
 */
type SafetyOperation = 'chat_response' | 'intervention_selection' | 'crisis_check' | 'content_personalization' | 'daily_insight' | 'weekly_analysis' | 'notification' | 'command_execution' | 'causal_inference' | 'counterfactual_generation' | 'family_pomdp_action' | 'explainability_generation';
/**
 * Emotional context for safety evaluation
 */
interface IEmotionalContext {
    primaryEmotion: string;
    intensity: number;
    valence: number;
    arousal: number;
    phq9Score?: number;
    pdiScore?: number;
    anxietyLevel?: number;
    stressLevel?: number;
    emotionalTrend: 'improving' | 'stable' | 'declining' | 'volatile';
}
/**
 * Recent interaction record
 */
interface IRecentInteraction {
    timestamp: Date;
    type: string;
    content: string;
    riskLevel: RiskLevel$1;
    emotionalState?: IEmotionalContext;
}
/**
 * Safety violation record
 */
interface ISafetyViolation {
    id: string;
    invariantId: string;
    severity: 'critical' | 'high' | 'medium';
    message: string;
    details: string;
    timestamp: Date;
    context: Partial<ISafetyContext>;
    action: SafetyViolationAction;
    resolved: boolean;
    resolution?: string;
    confidence: number;
    verificationMethod: string;
    suggestedRemediation?: string;
}
/**
 * Comprehensive safety context
 */
interface ISafetyContext {
    userId: number;
    ageGroup: 'child' | 'teen' | 'adult';
    isMinor: boolean;
    sessionId: string;
    messageCount: number;
    sessionDuration: number;
    inputText: string;
    outputText?: string;
    operation: SafetyOperation;
    currentRiskLevel: RiskLevel$1;
    crisisIndicators: string[];
    emotionalState?: IEmotionalContext;
    recentInteractions: IRecentInteraction[];
    previousViolations: ISafetyViolation[];
    timestamp: Date;
    source: 'user_message' | 'ai_response' | 'system_action';
    conversationTopic?: string;
    vulnerabilityFactors?: string[];
    confidenceInAgeDetection: number;
    requiresExplanation: boolean;
    parentalConsentStatus?: 'obtained' | 'pending' | 'not_required';
}
/**
 * Safety warning (not a violation, but needs attention)
 */
interface ISafetyWarning {
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium';
    suggestion: string;
    category?: string;
    confidence?: number;
}
/**
 * Safety recommendation
 */
interface ISafetyRecommendation {
    id: string;
    type: string;
    message: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    rationale?: string;
    expectedOutcome?: string;
}
/**
 * Safety action to take
 */
interface ISafetyAction {
    type: 'block' | 'modify' | 'escalate' | 'log' | 'notify' | 'emergency' | 'circuit_breaker' | 'quarantine';
    target: string;
    details: string;
    priority: number;
    deadline?: Date;
    assignedTo?: string;
    automatedResponse?: string;
}
/**
 * Result of safety validation
 */
interface ISafetyValidationResult {
    passed: boolean;
    violations: ISafetyViolation[];
    warnings: ISafetyWarning[];
    recommendations: ISafetyRecommendation[];
    sanitizedContent?: string;
    requiredActions: ISafetyAction[];
    validationTime: number;
    checksPerformed: string[];
    overallConfidence: number;
    riskScore: number;
    requiresHumanReview: boolean;
    explanationGenerated?: string;
}
/**
 * Constitutional principle for AI behavior
 */
interface IConstitutionalPrinciple {
    id: string;
    name: string;
    description: string;
    category: 'safety' | 'ethics' | 'clinical' | 'legal' | 'regulatory';
    mustDo: string[];
    mustNotDo: string[];
    shouldDo: string[];
    shouldNotDo: string[];
    examples: {
        compliant: string[];
        nonCompliant: string[];
    };
    weight: number;
    regulatoryBasis?: string[];
    aiSafetyLevel?: SafetyLevel;
}
/**
 * Escalation reasons
 */
type EscalationReason = 'crisis_detected' | 'safety_concern' | 'ai_uncertainty' | 'user_request' | 'clinical_complexity' | 'minor_protection' | 'repeated_distress' | 'ethical_circuit_breaker' | 'confidence_below_threshold' | 'regulatory_requirement' | 'vulnerability_detected';
/**
 * Escalation status
 */
type EscalationStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated_further' | 'auto_resolved' | 'timed_out' | 'cancelled';
/**
 * Escalation urgency levels
 */
type EscalationUrgency = 'routine' | 'priority' | 'urgent' | 'emergency';
/**
 * Conversation message for escalation context
 */
interface IConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
/**
 * Human escalation request
 */
interface IHumanEscalationRequest {
    id: string;
    userId: number;
    sessionId: string;
    reason: EscalationReason;
    urgency: EscalationUrgency;
    triggerMessage: string;
    conversationHistory: IConversationMessage[];
    safetyContext: ISafetyContext;
    aiAssessment: {
        riskLevel: RiskLevel$1;
        confidence: number;
        reasoning: string;
        recommendedAction: string;
        suggestedResponses?: string[];
        relevantPrinciples?: string[];
        emotionalAnalysis?: IEmotionalContext;
    };
    status: EscalationStatus;
    assignedTo?: string;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
    priorityScore: number;
    estimatedResponseTime?: number;
    autoResponseSent?: boolean;
    followUpScheduled?: Date;
}
/**
 * Escalation decision result
 */
interface IEscalationDecision {
    shouldEscalate: boolean;
    reason?: EscalationReason;
    urgency?: EscalationUrgency;
    confidence: number;
    triggers: string[];
    humanResponseRequired: boolean;
    maxWaitTime?: number;
    fallbackAction?: string;
}
/**
 * Crisis detection result
 */
interface ICrisisDetectionResult {
    isCrisis: boolean;
    riskLevel: RiskLevel$1;
    indicators: string[];
    confidence: number;
    recommendedAction: string;
    immediateActions: ISafetyAction[];
    crisisType?: 'suicidal' | 'self_harm' | 'panic' | 'psychotic' | 'abuse' | 'other';
    assessmentMethod: 'keyword' | 'semantic' | 'behavioral' | 'multi_modal';
    suggestedResponses: string[];
    resourcesProvided: string[];
    followUpRequired: boolean;
}
/**
 * Model metric for model card
 */
interface IModelMetric {
    name: string;
    value: number;
    unit: string;
    description: string;
    dataset: string;
    methodology?: string;
    confidence?: number;
    lastMeasured?: Date;
}
/**
 * Model Card following CHAI (Coalition for Health AI) standard
 */
interface IModelCard {
    modelName: string;
    modelVersion: string;
    organization: string;
    releaseDate: Date;
    lastUpdated: Date;
    intendedUse: {
        primaryUse: string;
        primaryUsers: string[];
        outOfScopeUses: string[];
    };
    trainingData: {
        description: string;
        sources: string[];
        size: string;
        preprocessing: string[];
        biasConsiderations: string[];
    };
    performance: {
        metrics: IModelMetric[];
        evaluationData: string;
        evaluationProcess: string;
        limitations: string[];
    };
    ethicalConsiderations: {
        sensitiveUseCases: string[];
        potentialHarms: string[];
        mitigationStrategies: string[];
    };
    safety: {
        safetyLevel: SafetyLevel;
        testedScenarios: string[];
        knownFailureModes: string[];
        safetyMeasures: string[];
        monitoringProcedures: string[];
        redTeamingResults?: string;
        adversarialTestingResults?: string;
        constitutionalPrinciplesCount?: number;
        safetyInvariantsCount?: number;
    };
    regulatory: {
        fdaStatus: string;
        ceMarking: string;
        euAiActClassification: string;
        clinicalValidation: string;
        fundamentalRightsAssessment?: string;
        dataProtectionCompliance?: string;
    };
    contact: {
        email: string;
        issueTracker: string;
        documentation: string;
    };
}

/**
 * 🔬 CAUSAL GRAPH LAYER - INTERFACES
 * ===================================
 * Phase 5.1: Causal Discovery & Intervention Targeting
 *
 * Scientific Foundation (2024-2025):
 * - Pearl's Causal Hierarchy: Association → Intervention → Counterfactual
 * - PC Algorithm (Spirtes, Glymour, Scheines, 2000)
 * - PyWhy/DoWhy Framework (Microsoft Research, 2024)
 * - Critical Slowing Down for Depression (PNAS, 2019)
 * - BOSS Algorithm (PMC, 2024) - Best Order Score Search
 * - Causal Forest (Wager & Athey, 2018) - Heterogeneous treatment effects
 *
 * Market Context (2025):
 * - Causal AI Market: $63.37M (2025) → $1.62B (2035), 38.35% CAGR
 * - Key drivers: Personalized interventions, XAI requirements, healthcare
 *
 * Integration Points:
 * - StateVector (Phase 3.1) - Provides observation data
 * - InterventionOptimizer (Phase 3.4) - Consumes causal targets
 * - TemporalEchoEngine (Phase 3.2) - Temporal pattern integration
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Domain-specific node types for mental health causal modeling
 * Based on CBT/DBT theoretical frameworks
 */
type CausalNodeType = 'emotion' | 'behavior' | 'cognition' | 'physiological' | 'trigger' | 'protective' | 'intervention';
/**
 * Edge types representing different causal relationships
 * Based on structural causal models (SCM)
 */
type CausalEdgeType = 'direct' | 'mediated' | 'moderated' | 'bidirectional' | 'confounded';
/**
 * Confidence level for causal relationships
 * Based on evidence hierarchy
 */
type CausalConfidence = 'established' | 'probable' | 'hypothesized' | 'learned';
/**
 * Intervention type taxonomy
 * Aligned with InterventionOptimizer categories
 */
type CausalInterventionType = 'challenge' | 'cognitive_reframe' | 'social_prompt' | 'relaxation' | 'activity_schedule' | 'psychoeducation' | 'crisis_support';
/**
 * A node in the causal graph representing a variable
 */
interface ICausalNode {
    /** Unique identifier */
    readonly id: string;
    /** Human-readable name (English) */
    readonly name: string;
    /** Human-readable name (Russian) */
    readonly nameRu: string;
    /** Node type classification */
    readonly type: CausalNodeType;
    /** Current value (normalized 0-1) */
    value: number;
    /** Last observation timestamp */
    observedAt: Date;
    /** Can we measure this directly? */
    readonly isObservable: boolean;
    /** Can we intervene on this? */
    readonly isManipulable: boolean;
    /** User's typical value */
    baselineValue: number;
    /** How much it fluctuates (0-1) */
    volatility: number;
    /** Typical delay before effects propagate (days) */
    readonly lagDays: number;
    /** How long effects last (0-1) */
    readonly persistence: number;
    /** Domain-specific metadata */
    readonly metadata: ICausalNodeMetadata;
}
/**
 * Additional metadata for causal nodes
 */
interface ICausalNodeMetadata {
    /** For emotions: -1 (negative) to 1 (positive) */
    valence?: number;
    /** For emotions: 0 (calm) to 1 (activated) */
    arousal?: number;
    /** For behaviors: frequency pattern */
    frequency?: 'daily' | 'weekly' | 'monthly' | 'episodic';
    /** For behaviors: -1 (harmful) to 1 (beneficial) */
    healthImpact?: number;
    /** For triggers: 0 (uncontrollable) to 1 (controllable) */
    controllability?: number;
    /** For triggers: 0 (random) to 1 (predictable) */
    predictability?: number;
    /** For interventions: type classification */
    interventionType?: CausalInterventionType;
    /** For interventions: expected effect size */
    expectedEffectSize?: number;
}
/**
 * A directed edge representing causal relationship
 */
interface ICausalEdge {
    /** Unique identifier */
    readonly id: string;
    /** Source node (cause) */
    readonly sourceId: string;
    /** Target node (effect) */
    readonly targetId: string;
    /** Edge type classification */
    readonly type: CausalEdgeType;
    /** Causal strength: -1 to 1 (negative/positive effect) */
    strength: number;
    /** Confidence in this edge */
    confidence: CausalConfidence;
    /** P(effect | cause) */
    conditionalProbability: number;
    /** Minimum time for effect (hours) */
    readonly minLagHours: number;
    /** Maximum time for effect (hours) */
    readonly maxLagHours: number;
    /** When effect is strongest (hours) */
    readonly peakLagHours: number;
    /** Number of observations supporting this edge */
    evidenceCount: number;
    /** Last update timestamp */
    lastUpdated: Date;
    /** For moderated edges: moderator node ID */
    moderatorId?: string;
    /** For moderated edges: moderation function */
    moderationFunction?: IModerationFunction;
}
/**
 * Moderation function specification
 */
interface IModerationFunction {
    /** Type of moderation */
    type: 'linear' | 'threshold' | 'nonlinear';
    /** Function parameters */
    parameters: Record<string, number>;
}
/**
 * Complete causal graph (DAG) for a user
 */
interface ICausalGraph {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: number;
    /** Creation timestamp */
    readonly createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** All nodes in the graph */
    nodes: Map<string, ICausalNode>;
    /** All edges in the graph */
    edges: Map<string, ICausalEdge>;
    /** nodeId -> childIds */
    adjacencyList: Map<string, string[]>;
    /** nodeId -> parentIds */
    reverseAdjacency: Map<string, string[]>;
    /** Is the graph acyclic? */
    isAcyclic: boolean;
    /** Nodes in causal order */
    topologicalOrder: string[];
    /** User age group for personalization */
    readonly ageGroup: 'child' | 'teen' | 'adult';
    /** Personalized edge strengths */
    personalizedStrengths: Map<string, number>;
}
/**
 * Intervention target selection result
 */
interface IInterventionTarget {
    /** Node to intervene on */
    nodeId: string;
    /** Type of intervention */
    interventionType: CausalInterventionType;
    /** Desired post-intervention value */
    targetValue: number;
    /** Direct effect on target */
    expectedDirectEffect: number;
    /** Total effect including downstream */
    expectedTotalEffect: number;
    /** All affected nodes */
    affectedNodes: INodeEffect[];
    /** Feasibility score (0-1) */
    feasibilityScore: number;
    /** Hours until effect */
    estimatedTimeToEffect: number;
    /** User effort required (0-1) */
    requiredUserEngagement: number;
    /** Risk of negative outcome (0-1) */
    riskOfBackfire: number;
    /** Reasons not to use this intervention */
    contraindications: string[];
}
/**
 * Effect on a downstream node
 */
interface INodeEffect {
    /** Affected node ID */
    nodeId: string;
    /** Expected change (-1 to 1) */
    expectedChange: number;
    /** Likelihood of effect (0-1) */
    probability: number;
    /** Hours until effect */
    timeToEffect: number;
    /** Hops from intervention */
    pathLength: number;
}

/**
 * Explainability Framework Interfaces
 * ====================================
 * Phase 5.2: Enterprise-Grade Explainable AI (XAI) for Mental Health
 *
 * World-class XAI system based on 2025 research:
 *
 * Research Foundation:
 * - SHAP (Lundberg & Lee, 2017) - Game-theoretic feature attribution
 * - LIME (Ribeiro et al., 2016) - Local interpretable explanations
 * - Wachter et al. (2017) - Counterfactual explanations
 * - RiskPath Toolkit (Utah, 2025) - 85-99% accuracy in healthcare XAI
 * - EU AI Act (Feb 2025) - Transparency obligations for high-risk AI
 * - HCXAI Framework - Human-Centered Explainable AI
 * - TIFU Framework - Transparency and Interpretability For Understandability
 * - Risk-Sensitive Counterfactuals (2024-2025) - Robust explanations
 * - CRAFT (2024) - Concept-based explanations
 *
 * Key Enhancements over Phase 7 (OLD):
 * 1. Risk-Sensitive Counterfactuals - robust explanations
 * 2. HCXAI compliance - human-centered design
 * 3. EU AI Act markers - regulatory compliance
 * 4. TIFU framework - mental health specific
 * 5. Causal integration - with CausalGraph (Phase 5.1)
 * 6. Narrative generation - natural language stories
 * 7. Personalized XAI - cognitive style adaptation
 * 8. Effectiveness tracking - did user understand?
 *
 * Time2Stop Research: +53.8% intervention effectiveness with explanations
 *
 * (c) BF "Drugoy Put", 2025
 */
/**
 * Types of explanations (extended from OLD)
 */
type ExplanationType = 'local' | 'global' | 'counterfactual' | 'contrastive' | 'example-based' | 'causal' | 'narrative' | 'concept-based';
/**
 * Target audience for explanation (extended)
 */
type ExplanationAudience = 'user' | 'parent' | 'clinician' | 'auditor' | 'regulator' | 'developer';
/**
 * Explanation detail level
 */
type ExplanationLevel = 'simple' | 'detailed' | 'technical';
/**
 * Cognitive style for personalized explanations (NEW: HCXAI)
 */
type CognitiveStyle = 'visual' | 'analytical' | 'intuitive' | 'sequential';
/**
 * EU AI Act risk level (NEW: Regulatory compliance)
 */
type EUAIActRiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';
/**
 * Feature category for mental health context
 */
type FeatureCategory = 'emotional' | 'behavioral' | 'temporal' | 'contextual' | 'historical' | 'demographic' | 'engagement' | 'family' | 'causal';
/**
 * Feature contribution to a decision (enhanced)
 */
interface IFeatureAttribution {
    featureId: string;
    featureName: string;
    featureNameRu: string;
    featureValue: string | number | boolean;
    contribution: number;
    absoluteImportance: number;
    shapleyValue?: number;
    baselineValue?: string | number;
    comparisonToBaseline?: string;
    comparisonToBaselineRu?: string;
    isCausallyRelevant?: boolean;
    causalPathway?: string;
    confidenceInterval?: {
        lower: number;
        upper: number;
    };
    direction: 'positive' | 'negative' | 'neutral';
    emoji?: string;
    color?: string;
}
/**
 * SHAP-like explanation for a single prediction (enhanced)
 */
interface ISHAPExplanation {
    predictionId: string;
    prediction: string;
    predictionValue: number;
    baselineValue: number;
    attributions: IFeatureAttribution[];
    topPositiveFeatures: IFeatureAttribution[];
    topNegativeFeatures: IFeatureAttribution[];
    confidence: number;
    uncertaintySource?: string;
    uncertaintyQuantification?: {
        method: 'bootstrap' | 'bayesian' | 'ensemble';
        samples: number;
        standardError: number;
    };
    causalSummary?: {
        primaryCause: string;
        causalChain: string[];
        interventionPoints: string[];
    };
    timestamp: Date;
    computationTime: number;
    explanationVersion: string;
}
/**
 * Counterfactual change
 */
interface ICounterfactualChange {
    featureId: string;
    featureName: string;
    featureNameRu: string;
    currentValue: string | number;
    suggestedValue: string | number;
    changeDescription: string;
    changeDescriptionRu: string;
    changeRisk?: 'low' | 'medium' | 'high';
    riskExplanation?: string;
}
/**
 * Counterfactual feasibility (enhanced)
 */
type CounterfactualFeasibility = 'easy' | 'moderate' | 'difficult' | 'impossible' | 'risky';
/**
 * Counterfactual scenario (enhanced)
 */
interface ICounterfactualScenario {
    id: string;
    description: string;
    descriptionRu: string;
    changes: ICounterfactualChange[];
    alternativeOutcome: string;
    alternativeOutcomeRu: string;
    alternativeValue: number;
    feasibility: CounterfactualFeasibility;
    effort: string;
    effortRu: string;
    robustness: number;
    plausibility: number;
    sparsity: number;
    recourseScore: number;
    confidence: number;
}
/**
 * Counterfactual explanation (enhanced)
 */
interface ICounterfactualExplanation {
    predictionId: string;
    currentOutcome: string;
    currentOutcomeRu: string;
    currentValue: number;
    scenarios: ICounterfactualScenario[];
    closestCounterfactual?: ICounterfactualScenario;
    mostRobustCounterfactual?: ICounterfactualScenario;
    easiestCounterfactual?: ICounterfactualScenario;
    summary: string;
    summaryRu: string;
    userActionableAdvice: string[];
    userActionableAdviceRu: string[];
    overallRobustness: number;
    diversityScore: number;
}
/**
 * Global feature importance (enhanced)
 */
interface IGlobalFeatureImportance {
    featureId: string;
    featureName: string;
    featureNameRu: string;
    description: string;
    descriptionRu: string;
    meanAbsoluteSHAP: number;
    medianAbsoluteSHAP: number;
    maxAbsoluteSHAP: number;
    frequency: number;
    coverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendPeriod: string;
    trendMagnitude?: number;
    category: FeatureCategory;
}
/**
 * Decision rule extracted from model
 */
interface IDecisionRule {
    id: string;
    condition: string;
    conditionRu: string;
    outcome: string;
    outcomeRu: string;
    coverage: number;
    confidence: number;
    priority: number;
    isCausal?: boolean;
    causalStrength?: number;
}
/**
 * Bias analysis result (enhanced for EU AI Act)
 */
interface IBiasAnalysisResult {
    analyzed: boolean;
    demographicParity?: {
        group: string;
        metric: string;
        value: number;
        baseline: number;
        isFair: boolean;
        confidenceInterval?: {
            lower: number;
            upper: number;
        };
    }[];
    identifiedBiases: {
        type: string;
        description: string;
        descriptionRu: string;
        severity: 'low' | 'medium' | 'high';
        mitigation?: string;
        mitigationRu?: string;
    }[];
    fairnessScore?: number;
    euAIActCompliance?: {
        isCompliant: boolean;
        issues: string[];
        recommendations: string[];
    };
}
/**
 * Global model explanation (enhanced)
 */
interface IGlobalExplanation {
    modelName: string;
    modelVersion: string;
    featureImportance: IGlobalFeatureImportance[];
    keyDecisionRules: IDecisionRule[];
    performanceSummary: {
        accuracy?: number;
        precision?: number;
        recall?: number;
        f1?: number;
        customMetrics: Record<string, number>;
    };
    biasAnalysis?: IBiasAnalysisResult;
    regulatoryCompliance?: {
        euAIActRiskLevel: EUAIActRiskLevel;
        transparencyObligations: string[];
        conformityStatus: 'compliant' | 'partial' | 'non-compliant';
        lastAuditDate?: Date;
    };
    computedAt: Date;
    dataPointsAnalyzed: number;
}
/**
 * Causal chain in explanation
 */
interface ICausalChain {
    id: string;
    description: string;
    descriptionRu: string;
    nodes: {
        variable: string;
        variableRu: string;
        value: string | number;
        role: 'cause' | 'mediator' | 'effect';
    }[];
    edges: {
        from: string;
        to: string;
        strength: number;
        mechanism?: string;
        mechanismRu?: string;
    }[];
    interventionPoints: {
        variable: string;
        potentialImpact: number;
        feasibility: CounterfactualFeasibility;
        recommendation: string;
        recommendationRu: string;
    }[];
}
/**
 * Causal explanation
 */
interface ICausalExplanation {
    predictionId: string;
    primaryChain: ICausalChain;
    alternativeChains?: ICausalChain[];
    rootCauses: {
        variable: string;
        variableRu: string;
        contribution: number;
        isModifiable: boolean;
    }[];
    narrativeSummary: string;
    narrativeSummaryRu: string;
    confidence: number;
    methodology: 'do-calculus' | 'pearl' | 'scm' | 'heuristic';
}
/**
 * Narrative structure type
 */
type NarrativeStructure = 'journey' | 'comparison' | 'cause-effect' | 'recommendation';
/**
 * Narrative explanation (NEW: natural language stories)
 */
interface INarrativeExplanation {
    predictionId: string;
    structure: NarrativeStructure;
    title: string;
    titleRu: string;
    opening: string;
    openingRu: string;
    body: string;
    bodyRu: string;
    conclusion: string;
    conclusionRu: string;
    keyPoints: string[];
    keyPointsRu: string[];
    callToAction?: string;
    callToActionRu?: string;
    cognitiveStyleUsed: CognitiveStyle;
    ageGroupUsed: 'child' | 'teen' | 'adult';
    readability: {
        fleschKincaidGrade: number;
        readingTime: number;
        wordCount: number;
    };
}
/**
 * Clinical explanation for healthcare professionals (enhanced)
 */
interface IClinicianExplanation {
    patientId: string;
    sessionId: string;
    clinicalContext: {
        presentingConcern: string;
        presentingConcernRu: string;
        relevantHistory: string[];
        currentSymptoms: string[];
        riskFactors: string[];
        protectiveFactors: string[];
        familyContext?: string;
    };
    aiAssessment: {
        primaryConcern: string;
        severity: 'mild' | 'moderate' | 'severe';
        riskLevel: string;
        confidence: number;
        reasoning: string;
        reasoningRu: string;
        causalFactors?: string[];
        mechanismHypothesis?: string;
    };
    interventionRationale: {
        selectedIntervention: string;
        therapeuticApproach: string;
        evidenceBasis: string[];
        alternativesConsidered: string[];
        contraindications: string[];
        expectedOutcome?: string;
        outcomeTimeframe?: string;
    };
    recommendations: {
        immediateActions: string[];
        followUpRecommendations: string[];
        escalationCriteria: string[];
        referralSuggestions: string[];
        familyInvolvement?: string[];
    };
    uncertaintyDisclosure: {
        confidenceLevel: string;
        knownLimitations: string[];
        suggestedVerification: string[];
        modelBlindSpots?: string[];
        dataQualityNote?: string;
    };
    regulatoryCompliance: {
        euAIActRiskLevel: EUAIActRiskLevel;
        humanOversightRequired: boolean;
        appealProcess?: string;
    };
    timestamp: Date;
    aiModelVersion: string;
    disclaimer: string;
    disclaimerRu: string;
}
/**
 * Simplified factor for user explanation (enhanced)
 */
interface IUserFactor {
    name: string;
    nameRu: string;
    value: string;
    impact: 'helps' | 'hurts' | 'neutral';
    emoji: string;
    explanation: string;
    explanationRu: string;
    layTermDescription?: string;
    actionable?: boolean;
    actionSuggestion?: string;
}
/**
 * User explanation (enhanced HCXAI)
 */
interface IUserExplanation {
    summary: string;
    summaryRu: string;
    reasoning: string;
    reasoningRu: string;
    keyFactors: IUserFactor[];
    confidence: {
        level: 'low' | 'medium' | 'high';
        emoji: string;
        description: string;
        descriptionRu: string;
    };
    actionableAdvice: string[];
    actionableAdviceRu: string[];
    limitations: string[];
    limitationsRu: string[];
    disclaimer: string;
    disclaimerRu: string;
    whyThisMatters?: string;
    whyThisMattersRu?: string;
    whatCanChange?: string[];
    whatCanChangeRu?: string[];
    ageGroup: 'child' | 'teen' | 'adult';
    cognitiveStyle?: CognitiveStyle;
    explanationId: string;
    feedbackPrompt?: string;
}
/**
 * Explanation effectiveness metrics (NEW)
 */
interface IExplanationEffectiveness {
    explanationId: string;
    userId: string;
    userUnderstood?: boolean;
    userFoundHelpful?: boolean;
    userRating?: number;
    userFeedbackText?: string;
    timeSpentReading?: number;
    scrollDepth?: number;
    expandedDetails?: boolean;
    clickedLearnMore?: boolean;
    followedAdvice?: boolean;
    interventionAccepted?: boolean;
    subsequentBehaviorChange?: boolean;
    explanationVariant?: string;
    experimentId?: string;
    recordedAt: Date;
}
/**
 * Request for explanation (enhanced)
 */
interface IExplanationRequest {
    predictionId: string;
    predictionType: string;
    context: Record<string, unknown>;
    inputFeatures: Record<string, unknown>;
    output: unknown;
    audience: ExplanationAudience;
    level: ExplanationLevel;
    types: ExplanationType[];
    includeCounterfactuals: boolean;
    includeGlobalContext: boolean;
    includeCausal: boolean;
    includeNarrative: boolean;
    maxCounterfactuals?: number;
    ageGroup?: 'child' | 'teen' | 'adult';
    cognitiveStyle?: CognitiveStyle;
    language?: 'en' | 'ru';
    preferredNarrativeStructure?: NarrativeStructure;
    requireEUAIActCompliance?: boolean;
}
/**
 * Complete explanation response (enhanced)
 */
interface IExplanationResponse {
    requestId: string;
    predictionId: string;
    localExplanation?: ISHAPExplanation;
    counterfactualExplanation?: ICounterfactualExplanation;
    globalContext?: IGlobalExplanation;
    clinicianExplanation?: IClinicianExplanation;
    causalExplanation?: ICausalExplanation;
    narrativeExplanation?: INarrativeExplanation;
    userExplanation: IUserExplanation;
    regulatoryInfo?: {
        euAIActRiskLevel: EUAIActRiskLevel;
        isCompliant: boolean;
        transparencyMet: boolean;
        humanOversightRequired: boolean;
    };
    generatedAt: Date;
    computationTime: number;
    explanationVersion: string;
    effectivenessTrackingEnabled: boolean;
    feedbackUrl?: string;
}
/**
 * Explainability Service interface (enhanced)
 */
interface IExplainabilityService {
    explain(request: IExplanationRequest): Promise<IExplanationResponse>;
    generateSHAPExplanation(features: Record<string, unknown>, prediction: unknown): Promise<ISHAPExplanation>;
    generateCounterfactuals(features: Record<string, unknown>, currentOutcome: string, desiredOutcome?: string, options?: {
        maxCounterfactuals?: number;
        requireRobust?: boolean;
        feasibilityThreshold?: CounterfactualFeasibility;
    }): Promise<ICounterfactualExplanation>;
    generateGlobalExplanation(predictionType: string): Promise<IGlobalExplanation>;
    generateClinicianExplanation(sessionData: Record<string, unknown>): Promise<IClinicianExplanation>;
    generateCausalExplanation(features: Record<string, unknown>, outcome: string): Promise<ICausalExplanation>;
    generateNarrativeExplanation(explanation: IExplanationResponse, options: {
        structure: NarrativeStructure;
        ageGroup: 'child' | 'teen' | 'adult';
        cognitiveStyle?: CognitiveStyle;
        language: 'en' | 'ru';
    }): Promise<INarrativeExplanation>;
    formatForAudience(explanation: IExplanationResponse, audience: ExplanationAudience, level: ExplanationLevel): string;
    getCachedGlobalExplanation(predictionType: string): IGlobalExplanation | null;
    invalidateCache(predictionType?: string): void;
    recordExplanationFeedback(feedback: Partial<IExplanationEffectiveness>): Promise<void>;
    getExplanationEffectiveness(explanationId: string): Promise<IExplanationEffectiveness | null>;
}

/**
 * METACOGNITIVE STATE INTERFACE
 * ==============================
 * Wells' Metacognitive Therapy (MCT) Model Implementation
 *
 * Scientific Foundation (2024-2025 Research):
 * - S-REF Model (Wells & Matthews, 1994, 1996)
 * - Metacognitive Therapy (Wells, 2009)
 * - MCQ-30 Questionnaire (Wells & Cartwright-Hatton, 2004)
 * - CAS-1R Assessment (Wells, 2009)
 * - MCT Meta-Analysis (Normann & Morina, 2018; December 2024 update)
 *
 * Key Innovation:
 * - Digital implementation of MCQ-30 subscales
 * - Real-time CAS detection
 * - Metacognitive belief tracking
 * - Integration with existing CogniCore State Vector
 *
 * Evidence Base (2024):
 * - MCT effect size d = 1.28 for anxiety/depression (Thingbak et al., 2024)
 * - MCT superior to CBT: Hedges' g = 0.69 at post-treatment
 * - 21 MCT studies + 28 MCTraining studies meta-analyzed
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */
/**
 * MCQ-30 Five Factor Structure
 * Each subscale: 6 items, score range 6-24
 * Total score range: 30-120 (higher = more dysfunctional)
 */
interface MCQ30Subscales {
    /**
     * Factor 1: Positive Beliefs about Worry
     * "Worrying helps me cope" / "Беспокойство помогает мне справляться"
     * Examples: "Worrying helps me to avoid problems in the future"
     */
    readonly positiveWorryBeliefs: MCQ30Subscale;
    /**
     * Factor 2: Negative Beliefs about Uncontrollability and Danger
     * "My worrying is dangerous" / "Моё беспокойство опасно"
     * Examples: "When I start worrying I cannot stop"
     */
    readonly negativeUncontrollabilityDanger: MCQ30Subscale;
    /**
     * Factor 3: Cognitive Confidence
     * "I don't trust my memory" / "Я не доверяю своей памяти"
     * Examples: "I have a poor memory"
     */
    readonly cognitiveConfidence: MCQ30Subscale;
    /**
     * Factor 4: Need to Control Thoughts
     * "I should control my thoughts" / "Я должен контролировать мысли"
     * Examples: "Not being able to control my thoughts is a sign of weakness"
     */
    readonly needToControlThoughts: MCQ30Subscale;
    /**
     * Factor 5: Cognitive Self-Consciousness
     * "I monitor my thinking" / "Я слежу за своим мышлением"
     * Examples: "I pay close attention to the way my mind works"
     */
    readonly cognitiveSelfConsciousness: MCQ30Subscale;
    /**
     * Total MCQ-30 score
     */
    readonly totalScore: number;
    /**
     * Assessment timestamp
     */
    readonly assessedAt: Date;
    /**
     * Data source
     */
    readonly source: 'self_report' | 'inferred' | 'conversation';
}
/**
 * Individual MCQ-30 subscale
 */
interface MCQ30Subscale {
    /** Raw score (6-24) */
    readonly score: number;
    /** Normalized score (0-1) */
    readonly normalized: number;
    /** Clinical significance threshold crossed */
    readonly clinicallySignificant: boolean;
    /** Item-level responses if available */
    readonly itemResponses?: number[];
    /** Confidence in score */
    readonly confidence: number;
}
/**
 * CAS Components (Wells, 2009)
 * The toxic thinking style at the heart of emotional disorders
 */
interface CognitiveAttentionalSyndrome {
    /**
     * Worry/Rumination Component
     * Repetitive negative thinking about past (rumination) or future (worry)
     */
    readonly worryRumination: CASWorryRumination;
    /**
     * Threat Monitoring Component
     * Excessive attention to potential threats
     */
    readonly threatMonitoring: CASThreatMonitoring;
    /**
     * Maladaptive Coping Strategies
     * Behaviors that backfire and maintain distress
     */
    readonly maladaptiveCoping: CASMaladaptiveCoping;
    /**
     * Overall CAS severity (0-1)
     */
    readonly severity: number;
    /**
     * CAS activity detected in current session
     */
    readonly activeNow: boolean;
    /**
     * Duration of current CAS episode (minutes)
     */
    readonly currentEpisodeDuration?: number;
    /**
     * Triggers identified
     */
    readonly triggers: string[];
}
/**
 * Worry and Rumination Assessment
 */
interface CASWorryRumination {
    /**
     * Worry intensity (future-focused) 0-1
     */
    readonly worryIntensity: number;
    /**
     * Rumination intensity (past-focused) 0-1
     */
    readonly ruminationIntensity: number;
    /**
     * Predominant type
     */
    readonly predominantType: 'worry' | 'rumination' | 'mixed' | 'none';
    /**
     * Time spent in repetitive thinking (estimated minutes/day)
     */
    readonly estimatedDailyMinutes: number;
    /**
     * Perceived controllability (0 = uncontrollable, 1 = fully controllable)
     */
    readonly perceivedControllability: number;
    /**
     * Content themes
     */
    readonly themes: WorryRuminationTheme[];
    /**
     * Detected worry/rumination episodes in conversation
     */
    readonly detectedEpisodes: Array<{
        readonly text: string;
        readonly type: 'worry' | 'rumination';
        readonly timestamp: Date;
        readonly intensity: number;
    }>;
}
/**
 * Worry/Rumination themes
 */
type WorryRuminationTheme = 'health' | 'relationships' | 'performance' | 'finances' | 'safety' | 'social_evaluation' | 'future_uncertainty' | 'past_mistakes' | 'digital_usage' | 'self_worth' | 'control' | 'other';
/**
 * Threat Monitoring Assessment
 */
interface CASThreatMonitoring {
    /**
     * Level of hypervigilance (0-1)
     */
    readonly hypervigilance: number;
    /**
     * Self-focused attention (0-1)
     * High = excessive monitoring of internal states
     */
    readonly selfFocusedAttention: number;
    /**
     * External threat scanning (0-1)
     */
    readonly externalThreatScanning: number;
    /**
     * Attention flexibility (0 = rigid, 1 = flexible)
     */
    readonly attentionFlexibility: number;
    /**
     * Threat domains being monitored
     */
    readonly monitoredDomains: ThreatDomain[];
}
/**
 * Threat domains
 */
type ThreatDomain = 'bodily_sensations' | 'thoughts' | 'emotions' | 'social_cues' | 'environment' | 'performance' | 'digital_notifications';
/**
 * Maladaptive Coping Strategies
 */
interface CASMaladaptiveCoping {
    /**
     * Thought suppression attempts (0-1)
     */
    readonly thoughtSuppression: number;
    /**
     * Avoidance behaviors (0-1)
     */
    readonly avoidance: number;
    /**
     * Reassurance seeking (0-1)
     */
    readonly reassuranceSeeking: number;
    /**
     * Safety behaviors (0-1)
     */
    readonly safetyBehaviors: number;
    /**
     * Substance use for coping (0-1)
     */
    readonly substanceUse: number;
    /**
     * Digital escapism (0-1)
     * Using devices to avoid feelings
     */
    readonly digitalEscapism: number;
    /**
     * Checking behaviors (0-1)
     */
    readonly checking: number;
    /**
     * Identified specific strategies
     */
    readonly identifiedStrategies: MaladaptiveStrategy[];
}
/**
 * Specific maladaptive strategies
 */
interface MaladaptiveStrategy {
    readonly type: MaladaptiveStrategyType;
    readonly frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
    readonly effectiveness: number;
    readonly actualEffect: 'maintaining' | 'worsening' | 'neutral';
    readonly description?: string;
}
type MaladaptiveStrategyType = 'thought_suppression' | 'distraction' | 'avoidance' | 'reassurance_seeking' | 'checking' | 'safety_behavior' | 'substance_use' | 'excessive_planning' | 'rumination_as_coping' | 'worry_as_preparation' | 'digital_escape' | 'social_withdrawal' | 'overworking' | 'perfectionism';
/**
 * Detailed Metacognitive Beliefs Assessment
 */
interface MetacognitiveBeliefs {
    /**
     * Positive beliefs about worry
     * "Worry helps me cope/prepare/avoid"
     */
    readonly positiveWorryBeliefs: BeliefCluster;
    /**
     * Positive beliefs about rumination
     * "Rumination helps me understand/learn"
     */
    readonly positiveRuminationBeliefs: BeliefCluster;
    /**
     * Negative beliefs about thoughts (Type 2 worry)
     * "My thoughts are dangerous/uncontrollable"
     */
    readonly negativeThoughtBeliefs: BeliefCluster;
    /**
     * Beliefs about cognitive competence
     * "I can't trust my memory/judgment"
     */
    readonly cognitiveCompetenceBeliefs: BeliefCluster;
    /**
     * Beliefs about thought control
     * "I must control my thoughts or bad things will happen"
     */
    readonly thoughtControlBeliefs: BeliefCluster;
    /**
     * Beliefs about emotional control
     * "I must not feel certain emotions"
     */
    readonly emotionalControlBeliefs: BeliefCluster;
}
/**
 * Cluster of related beliefs
 */
interface BeliefCluster {
    /** Overall strength 0-1 */
    readonly strength: number;
    /** Specific beliefs identified */
    readonly beliefs: SpecificBelief[];
    /** Confidence in assessment */
    readonly confidence: number;
    /** Last updated */
    readonly lastUpdated: Date;
}
/**
 * Specific metacognitive belief
 */
interface SpecificBelief {
    readonly id: string;
    readonly content: string;
    readonly contentRu?: string;
    readonly type: 'positive' | 'negative';
    readonly strength: number;
    readonly evidenceFor: string[];
    readonly evidenceAgainst: string[];
    readonly challengedAt?: Date;
    readonly responseToChallenge?: string;
}
/**
 * Complete Metacognitive State
 * Extends basic Metacognition from ICognitiveState
 */
interface IMetacognitiveState {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: string | number;
    /**
     * MCQ-30 subscale scores
     */
    readonly mcq30: MCQ30Subscales;
    /**
     * Cognitive Attentional Syndrome
     */
    readonly cas: CognitiveAttentionalSyndrome;
    /**
     * Detailed metacognitive beliefs
     */
    readonly beliefs: MetacognitiveBeliefs;
    /**
     * Attentional control capacity (0-1)
     * Ability to shift and sustain attention voluntarily
     */
    readonly attentionalControl: number;
    /**
     * Detached mindfulness capacity (0-1)
     * Ability to observe thoughts without engagement
     */
    readonly detachedMindfulnessCapacity: number;
    /**
     * Meta-awareness level (0-1)
     * Awareness of own mental processes
     */
    readonly metaAwareness: number;
    /**
     * Primary treatment targets (prioritized)
     */
    readonly treatmentTargets: TreatmentTarget[];
    /**
     * Recommended interventions
     */
    readonly recommendedInterventions: MCTIntervention[];
    /** Timestamp */
    readonly timestamp: Date;
    /** Overall confidence in assessment */
    readonly confidence: number;
    /** Data quality indicator */
    readonly dataQuality: number;
}
/**
 * Treatment target from MCT
 */
interface TreatmentTarget {
    readonly type: TreatmentTargetType;
    readonly priority: 'high' | 'medium' | 'low';
    readonly description: string;
    readonly currentSeverity: number;
    readonly linkedBeliefs: string[];
}
type TreatmentTargetType = 'positive_worry_beliefs' | 'negative_worry_beliefs' | 'rumination' | 'threat_monitoring' | 'thought_suppression' | 'attentional_inflexibility' | 'reassurance_seeking' | 'avoidance' | 'low_metacognitive_awareness';
/**
 * MCT Intervention types
 */
type MCTIntervention = 'attention_training_technique' | 'detached_mindfulness' | 'worry_postponement' | 'rumination_postponement' | 'verbal_reattribution' | 'behavioral_experiment' | 'advantages_disadvantages' | 'metacognitive_profiling' | 'situational_attention_refocusing';

/**
 * 🎯 MOTIVATIONAL STATE INTERFACE
 * ================================
 * World-First Integration of MI Theory with Computational Models
 *
 * Scientific Foundation (2024-2025 Research):
 * - Motivational Interviewing (Miller & Rollnick, 2013)
 * - MITI 4.2 Coding System (Moyers et al., 2014)
 * - MISC 2.5 Client Language Coding (CASAA)
 * - DARN-CAT Framework for Change Talk
 * - AI-Augmented MI (arXiv:2505.17380, 2025)
 * - BiMISC Dataset (ACL 2024)
 * - LLM MI Scoping Review (JMIR 2025)
 *
 * Key Innovation:
 * - Real-time Change Talk / Sustain Talk detection
 * - DARN-CAT classification for motivation assessment
 * - Readiness Ruler digital implementation
 * - MI-consistent response selection
 * - Integration with existing INarrativeState.stage
 *
 * БФ "Другой путь" | CogniCore Phase 4.1
 */

/**
 * Client language categories based on MISC coding scheme
 * CT = Change Talk (favors change)
 * ST = Sustain Talk (favors status quo)
 * FN = Follow/Neutral (unrelated to change)
 */
type ClientLanguageCategory = 'change_talk' | 'sustain_talk' | 'follow_neutral';
/**
 * DARN-CAT Framework for Change Talk Classification
 *
 * Preparatory Change Talk (DARN):
 * - Desire: "I want to...", "I wish I could..."
 * - Ability: "I could...", "I can..."
 * - Reasons: "Because...", "It would help me..."
 * - Need: "I have to...", "I must..."
 *
 * Mobilizing Change Talk (CAT):
 * - Commitment: "I will...", "I'm going to..."
 * - Activation: "I'm ready to...", "I'm willing to..."
 * - Taking Steps: "I started...", "I've been..."
 */
type ChangeTaskSubtype = 'desire' | 'ability' | 'reasons' | 'need' | 'commitment' | 'activation' | 'taking_steps';
/**
 * Sustain Talk Subtypes (mirror of DARN-CAT)
 */
type SustainTalkSubtype = 'desire_against' | 'ability_against' | 'reasons_against' | 'need_against' | 'commitment_against' | 'activation_against' | 'taking_steps_against';
/**
 * Detected utterance with language classification
 */
interface ClientUtterance {
    readonly id: string;
    readonly text: string;
    readonly timestamp: Date;
    /** Primary classification */
    readonly category: ClientLanguageCategory;
    /** Subtype for Change Talk */
    readonly changeSubtype?: ChangeTaskSubtype;
    /** Subtype for Sustain Talk */
    readonly sustainSubtype?: SustainTalkSubtype;
    /** Strength score: -5 (strong ST) to +5 (strong CT) */
    readonly strength: number;
    /** Detection confidence (0-1) */
    readonly confidence: number;
    /** Keywords/patterns that triggered detection */
    readonly evidenceSpans: Array<{
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly pattern: string;
    }>;
    /** Link to triggering topic */
    readonly targetBehavior?: string;
}
/**
 * Readiness Ruler Assessment
 * Classic MI tool for measuring importance and confidence
 */
interface ReadinessRuler {
    /**
     * Importance: "How important is it to you to [change]?"
     * Scale: 0 (not at all) to 10 (extremely)
     */
    readonly importance: number;
    /**
     * Confidence: "How confident are you that you could [change]?"
     * Scale: 0 (not at all) to 10 (extremely)
     */
    readonly confidence: number;
    /**
     * Readiness: Computed from importance × confidence
     * Or explicit "How ready are you to [change]?"
     */
    readonly readiness: number;
    /** When last assessed */
    readonly assessedAt: Date;
    /** Source of assessment */
    readonly source: 'self_report' | 'inferred' | 'conversation';
    /** Confidence in assessment accuracy */
    readonly assessmentConfidence: number;
}
/**
 * Change Talk vs Sustain Talk ratio
 * Key predictor of behavior change (Amrhein et al., 2003)
 */
interface LanguageBalance {
    /** Total Change Talk utterances */
    readonly changeTalkCount: number;
    /** Total Sustain Talk utterances */
    readonly sustainTalkCount: number;
    /** CT / (CT + ST) ratio - higher = more change-oriented */
    readonly changeTalkRatio: number;
    /** Average strength of CT (-5 to +5) */
    readonly averageCtStrength: number;
    /** Average strength of ST (-5 to +5) */
    readonly averageStStrength: number;
    /** Net balance: positive = more CT, negative = more ST */
    readonly netBalance: number;
    /** Trend over last N utterances */
    readonly trend: 'increasing' | 'stable' | 'decreasing';
    /** Time window for this calculation */
    readonly windowStart: Date;
    readonly windowEnd: Date;
}
/**
 * DARN-CAT Profile - distribution of change talk types
 */
interface DarnCatProfile {
    readonly desire: number;
    readonly ability: number;
    readonly reasons: number;
    readonly need: number;
    readonly commitment: number;
    readonly activation: number;
    readonly takingSteps: number;
    /** Ratio of mobilizing to preparatory (higher = more action-ready) */
    readonly mobilizingRatio: number;
    /** Dominant preparatory type */
    readonly dominantPreparatory: 'desire' | 'ability' | 'reasons' | 'need' | 'none';
    /** Has mobilizing language started? */
    readonly mobilizingPresent: boolean;
}
/**
 * Ambivalence Assessment
 * Core concept in MI - the "push-pull" of change
 */
interface AmbivalenceState {
    /**
     * Overall ambivalence level (0-1)
     * 0 = No ambivalence (clear direction)
     * 1 = Maximum ambivalence (equal CT and ST)
     */
    readonly level: number;
    /**
     * Type of ambivalence
     */
    readonly type: AmbivalenceType;
    /**
     * Arguments FOR change (pros)
     */
    readonly prosForChange: string[];
    /**
     * Arguments AGAINST change (cons)
     */
    readonly consForChange: string[];
    /**
     * Arguments FOR status quo (pros)
     */
    readonly prosForStatusQuo: string[];
    /**
     * Arguments AGAINST status quo (cons)
     */
    readonly consForStatusQuo: string[];
    /**
     * Is ambivalence normal and healthy?
     * (Important for response strategy)
     */
    readonly isNormative: boolean;
    /**
     * Primary source of ambivalence
     */
    readonly primaryConflict: string;
}
type AmbivalenceType = 'approach_approach' | 'avoidance_avoidance' | 'approach_avoidance' | 'double_approach_avoidance';
/**
 * Discord/Resistance Indicators
 * Signs of strain in therapeutic relationship
 */
interface DiscordIndicators {
    /**
     * Overall discord level (0-1)
     * Higher = more relationship strain
     */
    readonly level: number;
    /**
     * Types of discord observed
     */
    readonly types: DiscordType[];
    /**
     * Recent discord events
     */
    readonly events: DiscordEvent[];
    /**
     * Is discord increasing?
     */
    readonly trend: 'increasing' | 'stable' | 'decreasing';
    /**
     * Recommended response
     */
    readonly recommendedResponse: 'reflect' | 'apologize' | 'shift_focus' | 'emphasize_autonomy';
}
type DiscordType = 'arguing' | 'interrupting' | 'negating' | 'ignoring' | 'defending' | 'squaring_off';
interface DiscordEvent {
    readonly type: DiscordType;
    readonly utterance: string;
    readonly timestamp: Date;
    readonly intensity: number;
    readonly possibleTrigger?: string;
}
/**
 * 🎯 Main Motivational State Interface
 * Integrates with CogniCore State Vector
 */
interface IMotivationalState {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: string | number;
    /**
     * Current readiness ruler scores
     */
    readonly readinessRuler: ReadinessRuler;
    /**
     * Linked stage from INarrativeState
     * (Precontemplation → Contemplation → Preparation → Action → Maintenance)
     */
    readonly linkedStage: ChangeStage;
    /**
     * Days in current motivational state
     */
    readonly daysInState: number;
    /**
     * Recent client utterances (last N)
     */
    readonly recentUtterances: ClientUtterance[];
    /**
     * Current language balance
     */
    readonly languageBalance: LanguageBalance;
    /**
     * DARN-CAT profile
     */
    readonly darnCatProfile: DarnCatProfile;
    /**
     * Session-level CT/ST ratio
     */
    readonly sessionRatio: number;
    /**
     * Historical trend of CT ratio
     */
    readonly ratioTrend: Array<{
        readonly date: Date;
        readonly ratio: number;
    }>;
    /**
     * Current ambivalence state
     */
    readonly ambivalence: AmbivalenceState;
    /**
     * Is ambivalence being explored?
     */
    readonly ambivalenceExplored: boolean;
    /**
     * Discord indicators
     */
    readonly discord: DiscordIndicators;
    /**
     * Is rapport maintained?
     */
    readonly rapportLevel: number;
    /**
     * Recommended MI strategy for current state
     */
    readonly recommendedStrategy: MIStrategy;
    /**
     * Focus areas for this session
     */
    readonly sessionFocus: string[];
    /**
     * Things to avoid (based on user state)
     */
    readonly avoid: string[];
    /** Timestamp */
    readonly timestamp: Date;
    /** Overall confidence in assessment */
    readonly confidence: number;
    /** Data quality indicator */
    readonly dataQuality: number;
}
/**
 * MI Strategy recommendations
 */
type MIStrategy = 'build_rapport' | 'develop_discrepancy' | 'evoke_change_talk' | 'explore_ambivalence' | 'strengthen_commitment' | 'support_self_efficacy' | 'roll_with_resistance' | 'summarize_and_transition' | 'action_planning' | 'relapse_prevention';

/**
 * 🔄 MESSAGE PROCESSING PIPELINE - INTERFACES
 * ============================================
 * Phase 5.2: Message Processing Pipeline Architecture
 *
 * Research Foundation (2025):
 * - JITAI (Just-in-Time Adaptive Interventions) patterns
 * - NLP Pipeline Architecture (Intent → Entity → Sentiment → Response)
 * - Layered Safety Systems for Mental Health Chatbots
 * - Age-Adaptive Response Generation (CHI 2025)
 * - CBT-based Chatbot Clinical Efficacy (JMIR 2025)
 *
 * Architecture Patterns:
 * - Pipeline Pattern with composable stages
 * - Strategy Pattern for response generation
 * - Observer Pattern for event emission
 * - Factory Pattern for intervention creation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Input message for processing
 */
interface IIncomingMessage {
    /** Unique message ID */
    messageId: string;
    /** User ID */
    userId: string;
    /** Chat ID */
    chatId: string;
    /** Session ID */
    sessionId: string;
    /** Message text */
    text: string;
    /** Message timestamp */
    timestamp: Date;
    /** Platform */
    platform: 'telegram' | 'web' | 'api';
    /** Original message metadata */
    metadata?: {
        replyToMessageId?: string;
        hasMedia?: boolean;
        languageCode?: string;
        username?: string;
        firstName?: string;
    };
}
/**
 * Message analysis result from NLP stage
 */
interface IMessageAnalysis {
    /** Detected primary intent */
    intent: MessageIntent;
    /** Intent confidence (0-1) */
    intentConfidence: number;
    /** Extracted entities */
    entities: IExtractedEntity[];
    /** Sentiment analysis */
    sentiment: ISentimentAnalysis;
    /** Detected language */
    language: 'ru' | 'en';
    /** Topic classification */
    topic?: MessageTopic;
    /** Raw analysis data */
    raw?: unknown;
}
/**
 * Message intents
 */
type MessageIntent = 'greeting' | 'help_request' | 'emotional_disclosure' | 'crisis' | 'question' | 'reflection' | 'exercise_response' | 'feedback' | 'small_talk' | 'command' | 'unknown';
/**
 * Message topics for mental health context
 */
type MessageTopic = 'digital_addiction' | 'anxiety' | 'depression' | 'stress' | 'relationships' | 'self_esteem' | 'sleep' | 'motivation' | 'general' | 'unknown';
/**
 * Extracted entity
 */
interface IExtractedEntity {
    /** Entity type */
    type: 'emotion' | 'time' | 'duration' | 'activity' | 'person' | 'device' | 'app';
    /** Entity value */
    value: string;
    /** Confidence */
    confidence: number;
    /** Position in text */
    position: {
        start: number;
        end: number;
    };
}
/**
 * Sentiment analysis result
 */
interface ISentimentAnalysis {
    /** Overall sentiment */
    overall: 'positive' | 'negative' | 'neutral' | 'mixed';
    /** Sentiment score (-1 to 1) */
    score: number;
    /** Emotional intensity (0-1) */
    intensity: number;
    /** Detected emotions */
    emotions: IDetectedEmotion[];
}
/**
 * Detected emotion
 */
interface IDetectedEmotion {
    /** Emotion type */
    type: EmotionType;
    /** Confidence (0-1) */
    confidence: number;
    /** Valence (positive/negative) */
    valence: 'positive' | 'negative' | 'neutral';
}
/**
 * Emotion types
 */
type EmotionType = 'joy' | 'sadness' | 'anger' | 'fear' | 'anxiety' | 'stress' | 'hope' | 'gratitude' | 'loneliness' | 'frustration' | 'shame' | 'guilt' | 'neutral';
/**
 * User state for context-aware processing
 */
interface IUserState {
    /** User ID */
    userId: string;
    /** Detected age group */
    ageGroup: AgeGroup;
    /** Current emotional state */
    emotionalState: IEmotionalState;
    /** Risk assessment */
    risk: IRiskAssessment;
    /** Engagement metrics */
    engagement: IEngagementMetrics;
    /** Session context */
    sessionContext: ISessionContext;
    /** Intervention history */
    interventionHistory: IInterventionRecord[];
    /** Last updated */
    lastUpdated: Date;
}
/**
 * Age groups for adaptive responses
 */
type AgeGroup = 'child' | 'teen' | 'adult';
/**
 * Emotional state tracking
 */
interface IEmotionalState {
    /** Current primary emotion */
    primaryEmotion: EmotionType;
    /** Emotion intensity (0-1) */
    intensity: number;
    /** Trend (improving/stable/declining) */
    trend: 'improving' | 'stable' | 'declining';
    /** Recent emotion history (last 10) */
    recentEmotions: Array<{
        emotion: EmotionType;
        timestamp: Date;
        intensity: number;
    }>;
}
/**
 * Risk assessment
 */
interface IRiskAssessment {
    /** Overall risk level */
    level: RiskLevel;
    /** Risk score (0-1) */
    score: number;
    /** Active risk indicators */
    indicators: RiskIndicator[];
    /** Crisis mode active */
    crisisMode: boolean;
    /** Last assessment time */
    lastAssessment: Date;
}
/**
 * Risk levels
 */
type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
/**
 * Risk indicators
 */
type RiskIndicator = 'self_harm_mention' | 'suicidal_ideation' | 'hopelessness' | 'social_isolation' | 'substance_mention' | 'declining_mood' | 'crisis_keywords' | 'rapid_mood_change';
/**
 * Engagement metrics
 */
interface IEngagementMetrics {
    /** Total messages in session */
    messagesInSession: number;
    /** Session duration (minutes) */
    sessionDuration: number;
    /** Average response length */
    avgResponseLength: number;
    /** Intervention completion rate */
    interventionCompletionRate: number;
    /** Days since last interaction */
    daysSinceLastInteraction: number;
}
/**
 * Session context
 */
interface ISessionContext {
    /** Current conversation topic */
    currentTopic?: MessageTopic;
    /** Active exercise */
    activeExercise?: {
        exerciseId: string;
        exerciseType: string;
        step: number;
        startedAt: Date;
    };
    /** Pending follow-up */
    pendingFollowUp?: {
        type: string;
        scheduledFor: Date;
        context: unknown;
    };
    /** Custom data */
    customData: Record<string, unknown>;
}
/**
 * Intervention record
 */
interface IInterventionRecord {
    /** Intervention ID */
    interventionId: string;
    /** Intervention type */
    type: InterventionType;
    /** Delivered at */
    deliveredAt: Date;
    /** User response */
    userResponse?: 'engaged' | 'skipped' | 'completed' | 'no_response';
    /** Effectiveness rating (0-1) */
    effectiveness?: number;
}
/**
 * Intervention types based on CBT/JITAI research
 */
type InterventionType = 'cognitive_restructuring' | 'thought_challenging' | 'reframing' | 'perspective_taking' | 'behavioral_activation' | 'activity_scheduling' | 'graded_task' | 'mindfulness_breathing' | 'grounding_exercise' | 'body_scan' | 'emotion_labeling' | 'self_compassion' | 'validation' | 'digital_detox_prompt' | 'screen_time_awareness' | 'healthy_alternative' | 'crisis_support' | 'safety_plan' | 'hotline_referral' | 'check_in' | 'reflection_prompt' | 'encouragement';
/**
 * Intervention to deliver
 */
interface IIntervention {
    /** Intervention ID */
    id: string;
    /** Type */
    type: InterventionType;
    /** Content */
    content: IInterventionContent;
    /** Priority (1-10) */
    priority: number;
    /** Target age groups */
    targetAgeGroups: AgeGroup[];
    /** Minimum risk level to trigger */
    minRiskLevel?: RiskLevel;
    /** Maximum risk level to trigger */
    maxRiskLevel?: RiskLevel;
    /** Timing constraints (JITAI) */
    timing: IInterventionTiming;
    /** Metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Intervention content
 */
interface IInterventionContent {
    /** Primary text (template with placeholders) */
    text: string;
    /** Alternative texts for variety */
    alternatives?: string[];
    /** Buttons/actions */
    buttons?: IInterventionButton[];
    /** Follow-up prompts */
    followUpPrompts?: string[];
    /** Media attachments */
    media?: {
        type: 'image' | 'audio' | 'video' | 'gif';
        url: string;
        caption?: string;
    };
}
/**
 * Intervention button
 */
interface IInterventionButton {
    /** Button label */
    label: string;
    /** Callback data */
    callbackData: string;
    /** Next action */
    nextAction?: 'start_exercise' | 'skip' | 'rate' | 'more_info';
}
/**
 * JITAI timing constraints
 */
interface IInterventionTiming {
    /** Cooldown period (minutes) since last intervention of same type */
    cooldownMinutes: number;
    /** Maximum interventions per session */
    maxPerSession: number;
    /** Preferred time windows (hours of day) */
    preferredHours?: number[];
    /** Trigger conditions */
    triggerConditions?: ITriggerCondition[];
}
/**
 * JITAI trigger condition
 */
interface ITriggerCondition {
    /** Condition type */
    type: 'emotion_detected' | 'risk_elevated' | 'topic_match' | 'time_based' | 'engagement_drop';
    /** Condition parameters */
    params: Record<string, unknown>;
}
/**
 * Generated response
 */
interface IGeneratedResponse {
    /** Response ID */
    responseId: string;
    /** Response type */
    type: ResponseType;
    /** Primary text */
    text: string;
    /** Parse mode */
    parseMode: 'HTML' | 'Markdown' | 'plain';
    /** Inline keyboard */
    inlineKeyboard?: IResponseButton[][];
    /** Reply keyboard */
    replyKeyboard?: IResponseButton[][];
    /** Typing delay (ms) for therapeutic effect */
    typingDelay: number;
    /** Split into multiple messages */
    splitMessages?: string[];
    /** Follow-up response scheduled */
    scheduledFollowUp?: {
        delay: number;
        response: Omit<IGeneratedResponse, 'scheduledFollowUp'>;
    };
    /** Metadata */
    metadata: {
        generatedAt: Date;
        ageGroupAdapted: AgeGroup;
        interventionIncluded?: string;
        rationale: string;
    };
}
/**
 * Response types
 */
type ResponseType = 'acknowledgment' | 'empathetic_response' | 'intervention' | 'question' | 'information' | 'encouragement' | 'crisis_response' | 'exercise' | 'check_in';
/**
 * Response button
 */
interface IResponseButton {
    /** Button text */
    text: string;
    /** Callback data */
    callbackData?: string;
    /** URL (for link buttons) */
    url?: string;
}
/**
 * Pipeline stage result
 */
interface IPipelineStageResult<T> {
    /** Stage name */
    stage: string;
    /** Success flag */
    success: boolean;
    /** Result data */
    data?: T;
    /** Error if failed */
    error?: Error;
    /** Processing time (ms) */
    processingTimeMs: number;
    /** Should continue pipeline */
    continueProcessing: boolean;
    /** Early response (skip remaining stages) */
    earlyResponse?: IGeneratedResponse;
}
/**
 * Full pipeline result
 */
interface IPipelineResult {
    /** Pipeline run ID */
    pipelineId: string;
    /** Original message */
    originalMessage: IIncomingMessage;
    /** Message analysis */
    analysis: IMessageAnalysis;
    /** Updated user state */
    userState: IUserState;
    /** Generated response */
    response: IGeneratedResponse;
    /** Intervention delivered (if any) */
    interventionDelivered?: IIntervention;
    /** Events emitted */
    eventsEmitted: string[];
    /** Total processing time (ms) */
    totalProcessingTimeMs: number;
    /** Stage results */
    stageResults: IPipelineStageResult<unknown>[];
}

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

/**
 * PLRNN Engine Implementation
 *
 * Key features:
 * - Piecewise-linear dynamics for nonlinear psychological modeling
 * - Interpretable causal network extraction
 * - Early warning signal detection (critical slowing down)
 * - Online learning for personalization
 */
declare class PLRNNEngine implements IPLRNNEngine {
    private config;
    private weights;
    private initialized;
    private trainingHistory;
    private adamState;
    private kalmanFormer;
    private kalmanFormerState;
    constructor(config?: Partial<IPLRNNConfig>);
    initialize(config?: Partial<IPLRNNConfig>): void;
    loadWeights(weights: IPLRNNWeights): void;
    getWeights(): IPLRNNWeights;
    /**
     * Forward pass: compute next state
     *
     * z_{t+1} = A * z_t + W * φ(z_t) + C * s_t + b_z
     * x_t = B * z_t + b_x
     *
     * where φ(z) = max(z, 0) (ReLU for piecewise-linear dynamics)
     */
    forward(state: IPLRNNState, input?: number[]): IPLRNNState;
    predict(currentState: IPLRNNState, horizon: number, input?: number[][]): IPLRNNPrediction;
    hybridPredict(currentState: IPLRNNState, horizon: 'short' | 'medium' | 'long'): IPLRNNPrediction;
    /**
     * Update KalmanFormer state with new observation
     * Call this after each observation to maintain state synchronization
     */
    updateKalmanFormerState(observation: number[], timestamp: Date): void;
    /**
     * Get the current KalmanFormer state (for debugging/analysis)
     */
    getKalmanFormerState(): IKalmanFormerState | null;
    extractCausalNetwork(): ICausalNetwork;
    simulateIntervention(currentState: IPLRNNState, target: string, intervention: 'increase' | 'decrease' | 'stabilize', magnitude: number): IInterventionSimulation;
    detectEarlyWarnings(stateHistory: IPLRNNState[], windowSize: number): IEarlyWarningSignal[];
    trainOnline(sample: IPLRNNTrainingSample): IPLRNNTrainingResult;
    trainBatch(samples: IPLRNNTrainingSample[]): IPLRNNTrainingResult;
    calculateLoss(predicted: number[][], actual: number[][]): number;
    getComplexityMetrics(): {
        effectiveDimensionality: number;
        sparsity: number;
        lyapunovExponent: number;
    };
    private initializeMatrix;
    private matVec;
    private initializeState;
    private computeUncertainty;
    private calculateCentrality;
    private computeEdgeSignificance;
    private detectFeedbackLoops;
    private calculateAutocorrelation;
    private calculateVariance;
    private detectFlickering;
    private estimateTransitionTime;
    private calculateNetworkConnectivity;
    private calculateCorrelation;
    private updateWeightsOnline;
    private approximateMaxEigenvalue;
    /**
     * Get latent dimension
     */
    getLatentDim(): number;
    /**
     * Get config
     */
    getConfig(): IPLRNNConfig;
    /**
     * Compute gradients for a single timestep (for BPTT)
     * Returns gradients for A, W, B, biasLatent, biasObserved
     */
    computeStepGradients(prevState: IPLRNNState, currentState: IPLRNNState, target: number[], outputError?: number[]): {
        dA: number[];
        dW: number[][];
        dB: number[][];
        dBiasLatent: number[];
        dBiasObserved: number[];
        latentError: number[];
    };
    /**
     * Apply accumulated gradients using Adam optimizer
     */
    applyGradients(gradients: {
        dA: number[];
        dW: number[][];
        dB: number[][];
        dBiasLatent: number[];
        dBiasObserved: number[];
    }, learningRate: number, l1Reg?: number, l2Reg?: number, gradClip?: number): void;
    /**
     * Reset Adam optimizer state (for new training run)
     */
    resetAdamState(): void;
    /**
     * Create a state from observation values
     */
    createState(observation: number[], timestamp?: Date): IPLRNNState;
}
/**
 * Factory function
 */
declare function createPLRNNEngine(config?: Partial<IPLRNNConfig>): IPLRNNEngine;

/**
 * 🔮 KALMANFORMER ENGINE IMPLEMENTATION
 * =====================================
 * Hybrid Kalman Filter + Transformer Architecture
 *
 * Scientific Foundation (2025 Research):
 * - "KalmanFormer: using Transformer to model Kalman Gain in Visual Inertial Odometry"
 * - State Space Models + Attention mechanisms
 *
 * Key Innovation:
 * - Kalman Filter: Optimal for short-term, handles noise
 * - Transformer: Captures long-range dependencies in mood patterns
 * - Learned Kalman Gain: Context-aware trust adaptation
 *
 * Architecture:
 * 1. Encode observation history with positional + time embeddings
 * 2. Apply multi-head self-attention to capture patterns
 * 3. Predict optimal Kalman Gain based on context
 * 4. Blend Kalman prediction with Transformer prediction
 *
 * © БФ "Другой путь", 2025
 */

/**
 * KalmanFormer Engine Implementation
 */
declare class KalmanFormerEngine implements IKalmanFormerEngine {
    private config;
    private weights;
    private initialized;
    constructor(config?: Partial<IKalmanFormerConfig>);
    initialize(config?: Partial<IKalmanFormerConfig>): void;
    loadWeights(weights: IKalmanFormerWeights): void;
    getWeights(): IKalmanFormerWeights;
    update(state: IKalmanFormerState, observation: number[], timestamp: Date): IKalmanFormerState;
    predict(state: IKalmanFormerState, horizon: number): IKalmanFormerPrediction;
    explain(state: IKalmanFormerState): IAttentionWeights;
    adaptBlendRatio(predictions: number[][], actuals: number[][]): number;
    train(samples: IKalmanFormerTrainingSample[]): {
        loss: number;
        kalmanLoss: number;
        transformerLoss: number;
        epochs: number;
    };
    toPLRNNState(state: IKalmanFormerState): IPLRNNState;
    fromPLRNNState(plrnnState: IPLRNNState): IKalmanFormerState;
    getComplexityMetrics(): {
        totalParameters: number;
        kalmanParameters: number;
        transformerParameters: number;
        effectiveContextLength: number;
    };
    private initializeState;
    private kalmanPredict;
    private kalmanUpdate;
    private computeStandardKalmanGain;
    private predictKalmanGain;
    private embedObservation;
    private encodeContext;
    private multiHeadAttention;
    private feedForward;
    private addAndNorm;
    private transformerPredict;
    private computeBlendRatio;
    private blendPredictions;
    private computeConfidence;
    private computeAttentionWeights;
    private findMostInfluentialDimension;
    private detectPatternMatching;
    private initIdentityMatrix;
    private initDiagonalMatrix;
    private initRandomMatrix;
    private initPositionalEmbedding;
    private initTransformerWeights;
    private matVec;
    private matMul;
    private transpose;
    private matAdd;
    private matSub;
    private matInverse;
    private sigmoid;
}
/**
 * Factory function
 */
declare function createKalmanFormerEngine(config?: Partial<IKalmanFormerConfig>): IKalmanFormerEngine;

/**
 * 🎤 VOICE INPUT ADAPTER INTERFACES
 * ==================================
 * Acoustic Feature Extraction & Multimodal Fusion
 *
 * Scientific Foundation (2025 Research):
 * - JMIR Mental Health 2025: "Speech Emotion Recognition in Mental Health: Systematic Review"
 * - Wav2Vec2 + NCDEs: 74% accuracy in emotion recognition
 * - Voice biomarkers: F0, jitter, shimmer for depression detection
 * - Prosody analysis: Pitch contour, speech rate, pauses
 *
 * Key Features:
 * - Acoustic feature extraction (F0, jitter, shimmer, HNR, MFCCs)
 * - Prosody → Emotional state mapping (VAD)
 * - Multimodal fusion (text + voice)
 * - Whisper API integration for transcription
 * - Real-time and offline processing
 *
 * © БФ "Другой путь", 2025
 */
/**
 * Voice Input Configuration
 */
interface IVoiceAdapterConfig {
    /** Sample rate for audio processing (Hz) */
    sampleRate: number;
    /** Frame size for feature extraction (ms) */
    frameSizeMs: number;
    /** Hop size for overlapping frames (ms) */
    hopSizeMs: number;
    /** Number of MFCC coefficients */
    numMfcc: number;
    /** Minimum F0 for pitch detection (Hz) */
    minF0: number;
    /** Maximum F0 for pitch detection (Hz) */
    maxF0: number;
    /** Enable Whisper API for transcription */
    enableWhisper: boolean;
    /** Whisper API endpoint */
    whisperEndpoint?: string;
    /** Whisper API key */
    whisperApiKey?: string;
    /** Text-voice fusion strategy */
    fusionStrategy: 'early' | 'late' | 'hybrid';
    /** Fusion weights [text, voice] */
    fusionWeights: [number, number];
    /** Enable real-time processing */
    realtime: boolean;
    /** Buffer size for real-time (frames) */
    realtimeBufferSize: number;
    /** Language for speech recognition */
    language: string;
}
/**
 * Default Voice Adapter Configuration
 */
declare const DEFAULT_VOICE_CONFIG: IVoiceAdapterConfig;
/**
 * Acoustic Features extracted from voice
 */
interface IAcousticFeatures {
    /** Fundamental frequency (pitch) statistics */
    pitch: {
        /** Mean F0 in Hz */
        meanF0: number;
        /** Standard deviation of F0 */
        stdF0: number;
        /** Minimum F0 */
        minF0: number;
        /** Maximum F0 */
        maxF0: number;
        /** F0 range */
        rangeF0: number;
        /** Pitch contour (F0 values per frame) */
        contour: number[];
        /** Voiced frames ratio */
        voicedRatio: number;
    };
    /** Voice quality measures */
    voiceQuality: {
        /** Jitter (pitch perturbation) - % */
        jitterLocal: number;
        /** Shimmer (amplitude perturbation) - % */
        shimmerLocal: number;
        /** Harmonics-to-Noise Ratio (dB) */
        hnr: number;
        /** Noise-to-Harmonics Ratio */
        nhr: number;
    };
    /** Temporal features */
    temporal: {
        /** Speech rate (syllables per second) */
        speechRate: number;
        /** Articulation rate */
        articulationRate: number;
        /** Total duration (seconds) */
        duration: number;
        /** Speaking time (excluding pauses) */
        speakingTime: number;
        /** Pause duration total */
        pauseDuration: number;
        /** Number of pauses */
        pauseCount: number;
        /** Mean pause duration */
        meanPauseDuration: number;
    };
    /** Spectral features */
    spectral: {
        /** MFCC coefficients (mean per coefficient) */
        mfccMean: number[];
        /** MFCC standard deviation */
        mfccStd: number[];
        /** Spectral centroid mean */
        spectralCentroid: number;
        /** Spectral flux (change rate) */
        spectralFlux: number;
        /** Spectral rolloff frequency */
        spectralRolloff: number;
    };
    /** Energy features */
    energy: {
        /** Mean energy (dB) */
        meanEnergy: number;
        /** Energy standard deviation */
        stdEnergy: number;
        /** Energy range */
        rangeEnergy: number;
        /** Energy contour */
        contour: number[];
    };
    /** Quality metrics */
    quality: {
        /** Overall signal quality (0-1) */
        signalQuality: number;
        /** Background noise level (dB) */
        noiseLevel: number;
        /** Clipping ratio */
        clippingRatio: number;
        /** Silence ratio */
        silenceRatio: number;
    };
}
/**
 * Prosody features (suprasegmental)
 */
interface IProsodyFeatures {
    /** Pitch pattern type */
    pitchPattern: 'monotone' | 'varied' | 'rising' | 'falling' | 'irregular';
    /** Speech rhythm pattern */
    rhythmPattern: 'regular' | 'irregular' | 'hesitant' | 'rushed';
    /** Stress patterns (emphatic words) */
    stressPatterns: Array<{
        word: string;
        position: number;
        strength: number;
    }>;
    /** Intonation contour type */
    intonationType: 'declarative' | 'interrogative' | 'exclamatory' | 'neutral';
    /** Emotional prosody indicators */
    emotionalIndicators: {
        /** Higher pitch = more arousal */
        arousalLevel: number;
        /** Pitch variability = emotional expressiveness */
        expressiveness: number;
        /** Slow/fast rate = depressed/anxious */
        energyLevel: number;
        /** Voice tremor indicator */
        tremorIndicator: number;
    };
    /** Pause patterns */
    pausePatterns: {
        /** Long pauses before words (hesitation) */
        hesitationMarkers: number;
        /** Filled pauses (um, uh) count */
        filledPauses: number;
        /** Pause pattern suggests cognitive load */
        cognitiveLoadIndicator: number;
    };
}
/**
 * Voice-based emotional state estimate
 */
interface IVoiceEmotionEstimate {
    /** Primary emotion detected */
    primaryEmotion: string;
    /** Emotion probabilities */
    emotionProbabilities: Map<string, number>;
    /** VAD (Valence-Arousal-Dominance) estimate */
    vad: {
        valence: number;
        arousal: number;
        dominance: number;
        confidence: number;
    };
    /** Depression indicators */
    depressionIndicators: {
        /** Flat affect (low pitch variation) */
        flatAffect: number;
        /** Psychomotor retardation (slow speech) */
        psychomotorRetardation: number;
        /** Low energy voice */
        lowEnergy: number;
        /** Overall depression score (0-1) */
        score: number;
        /** Confidence in assessment */
        confidence: number;
    };
    /** Anxiety indicators */
    anxietyIndicators: {
        /** High pitch */
        highPitch: number;
        /** Fast speech rate */
        fastSpeech: number;
        /** Voice tremor */
        tremor: number;
        /** Hesitation frequency */
        hesitation: number;
        /** Overall anxiety score (0-1) */
        score: number;
        /** Confidence */
        confidence: number;
    };
    /** Stress indicators */
    stressIndicators: {
        /** Increased jitter/shimmer */
        voiceInstability: number;
        /** Reduced HNR */
        reducedClarity: number;
        /** Irregular breathing patterns */
        breathingIrregularity: number;
        /** Overall stress score (0-1) */
        score: number;
        /** Confidence */
        confidence: number;
    };
}
/**
 * Text analysis result (from transcription)
 */
interface ITextAnalysis {
    /** Transcribed text */
    text: string;
    /** Language detected */
    language: string;
    /** Word count */
    wordCount: number;
    /** Sentiment score (-1 to 1) */
    sentiment: number;
    /** Key phrases extracted */
    keyPhrases: string[];
    /** Detected emotions from text */
    textEmotions: Map<string, number>;
    /** Cognitive distortions detected */
    cognitiveDistortions: Array<{
        type: string;
        phrase: string;
        confidence: number;
    }>;
    /** Risk keywords detected */
    riskKeywords: Array<{
        keyword: string;
        category: string;
        severity: number;
    }>;
    /** Transcription confidence */
    confidence: number;
}
/**
 * Multimodal fusion result
 */
interface IMultimodalFusion {
    /** Fused VAD estimate */
    vad: {
        valence: number;
        arousal: number;
        dominance: number;
        confidence: number;
    };
    /** Fused emotion probabilities */
    emotionProbabilities: Map<string, number>;
    /** Primary emotion after fusion */
    primaryEmotion: string;
    /** Component contributions */
    contributions: {
        text: number;
        voice: number;
    };
    /** Agreement between modalities */
    modalityAgreement: number;
    /** Discrepancy analysis (when text and voice disagree) */
    discrepancy?: {
        type: 'suppression' | 'masking' | 'amplification' | 'none';
        textEmotion: string;
        voiceEmotion: string;
        interpretation: string;
    };
    /** Overall confidence after fusion */
    confidence: number;
    /** Recommendations based on analysis */
    recommendations: string[];
}
/**
 * Voice processing result
 */
interface IVoiceProcessingResult {
    /** Processing ID */
    id: string;
    /** Timestamp */
    timestamp: Date;
    /** Audio duration (seconds) */
    duration: number;
    /** Acoustic features */
    acousticFeatures: IAcousticFeatures;
    /** Prosody features */
    prosodyFeatures: IProsodyFeatures;
    /** Voice-based emotion estimate */
    voiceEmotion: IVoiceEmotionEstimate;
    /** Text analysis (if transcription enabled) */
    textAnalysis?: ITextAnalysis;
    /** Multimodal fusion result */
    fusion?: IMultimodalFusion;
    /** Processing quality metrics */
    quality: {
        audioQuality: number;
        featureReliability: number;
        overallConfidence: number;
    };
}
/**
 * Voice Input Adapter Interface
 */
interface IVoiceInputAdapter {
    /**
     * Initialize adapter
     */
    initialize(config?: Partial<IVoiceAdapterConfig>): Promise<void>;
    /**
     * Process audio buffer
     */
    processAudio(audioBuffer: Float32Array, sampleRate?: number): Promise<IVoiceProcessingResult>;
    /**
     * Process audio file
     */
    processFile(filePath: string): Promise<IVoiceProcessingResult>;
    /**
     * Process with transcription
     */
    processWithTranscription(audioBuffer: Float32Array, existingTranscript?: string): Promise<IVoiceProcessingResult>;
    /**
     * Extract acoustic features only
     */
    extractAcousticFeatures(audioBuffer: Float32Array): IAcousticFeatures;
    /**
     * Extract prosody features
     */
    extractProsodyFeatures(audioBuffer: Float32Array, acousticFeatures?: IAcousticFeatures): IProsodyFeatures;
    /**
     * Map acoustic features to emotional state
     */
    mapToEmotion(acoustic: IAcousticFeatures, prosody: IProsodyFeatures): IVoiceEmotionEstimate;
    /**
     * Fuse text and voice modalities
     */
    fuseModalities(voiceEmotion: IVoiceEmotionEstimate, textAnalysis: ITextAnalysis): IMultimodalFusion;
    /**
     * Transcribe audio using Whisper API
     */
    transcribe(audioBuffer: Float32Array): Promise<ITextAnalysis>;
    /**
     * Analyze text for emotions and risk
     */
    analyzeText(text: string): ITextAnalysis;
    /**
     * Real-time processing: add audio chunk
     */
    addRealtimeChunk(chunk: Float32Array): void;
    /**
     * Real-time processing: get current estimate
     */
    getRealtimeEstimate(): IVoiceEmotionEstimate | null;
    /**
     * Convert to state vector observation
     */
    toStateObservation(result: IVoiceProcessingResult): number[];
    /**
     * Get configuration
     */
    getConfig(): IVoiceAdapterConfig;
    /**
     * Update fusion weights based on historical accuracy
     */
    adaptFusionWeights(predictions: IMultimodalFusion[], actuals: IVoiceEmotionEstimate[]): void;
}
/**
 * Factory type
 */
type VoiceInputAdapterFactory = (config?: Partial<IVoiceAdapterConfig>) => IVoiceInputAdapter;

/**
 * 🎤 VOICE INPUT ADAPTER IMPLEMENTATION
 * =====================================
 * Acoustic Feature Extraction & Multimodal Fusion
 *
 * Scientific Foundation (2025 Research):
 * - Wav2Vec2.0 + NCDEs: 74.18% accuracy (PLOS ONE 2025)
 * - F0, jitter, shimmer: Key biomarkers for depression
 * - Parselmouth/Praat algorithms for voice quality
 * - Late fusion for text + voice (best performance)
 *
 * Features:
 * - Frame-based acoustic analysis
 * - Pitch detection (autocorrelation method)
 * - MFCC extraction (Mel-frequency cepstral coefficients)
 * - Voice quality metrics (jitter, shimmer, HNR)
 * - Prosody-to-emotion mapping
 * - Text-voice multimodal fusion
 *
 * © БФ "Другой путь", 2025
 */

/**
 * Voice Input Adapter Implementation
 */
declare class VoiceInputAdapter implements IVoiceInputAdapter {
    private config;
    private initialized;
    private realtimeBuffer;
    private realtimeEstimate;
    private processingCounter;
    constructor(config?: Partial<IVoiceAdapterConfig>);
    initialize(config?: Partial<IVoiceAdapterConfig>): Promise<void>;
    processAudio(audioBuffer: Float32Array, sampleRate?: number): Promise<IVoiceProcessingResult>;
    processFile(_filePath: string): Promise<IVoiceProcessingResult>;
    processWithTranscription(audioBuffer: Float32Array, existingTranscript?: string): Promise<IVoiceProcessingResult>;
    extractAcousticFeatures(audioBuffer: Float32Array): IAcousticFeatures;
    extractProsodyFeatures(audioBuffer: Float32Array, acousticFeatures?: IAcousticFeatures): IProsodyFeatures;
    mapToEmotion(acoustic: IAcousticFeatures, prosody: IProsodyFeatures): IVoiceEmotionEstimate;
    fuseModalities(voiceEmotion: IVoiceEmotionEstimate, textAnalysis: ITextAnalysis): IMultimodalFusion;
    transcribe(_audioBuffer: Float32Array): Promise<ITextAnalysis>;
    analyzeText(text: string): ITextAnalysis;
    addRealtimeChunk(chunk: Float32Array): void;
    getRealtimeEstimate(): IVoiceEmotionEstimate | null;
    toStateObservation(result: IVoiceProcessingResult): number[];
    getConfig(): IVoiceAdapterConfig;
    adaptFusionWeights(predictions: IMultimodalFusion[], actuals: IVoiceEmotionEstimate[]): void;
    private preEmphasis;
    private frameSignal;
    private hammingWindow;
    private extractPitch;
    private extractMFCCs;
    private simpleFFT;
    private melFilterbank;
    private dct;
    private resample;
    private combineBuffers;
    private calculatePitchStats;
    private calculateStats;
    private calculateVoiceQuality;
    private calculateTemporalFeatures;
    private calculateSpectralFeatures;
    private assessAudioQuality;
    private calculateFeatureReliability;
    private analyzePitchPattern;
    private analyzeRhythmPattern;
    private determineIntonationType;
    private calculateArousalFromProsody;
    private countHesitationMarkers;
    private calculateEmotionProbabilities;
    private estimateValenceFromAcoustic;
    private calculateVAD;
    private calculateDepressionIndicators;
    private calculateAnxietyIndicators;
    private calculateStressIndicators;
    private calculateSimpleSentiment;
    private detectTextEmotions;
    private detectCognitiveDistortions;
    private detectRiskKeywords;
    private textSentimentToVAD;
    private getTextPrimaryEmotion;
    private calculateModalityAgreement;
    private analyzeDiscrepancy;
    private generateRecommendations;
}
/**
 * Factory function
 */
declare function createVoiceInputAdapter(config?: Partial<IVoiceAdapterConfig>): IVoiceInputAdapter;

/**
 * @cognicore/engine
 * =================
 * World's First Universal POMDP-based Cognitive State Engine
 * for Digital Therapeutics (DTx)
 *
 * @packageDocumentation
 * @module @cognicore/engine
 *
 * БФ "Другой путь" | CogniCore Engine v1.0 | 2025
 */
declare const COGNICORE_VERSION: {
    version: string;
    name: string;
    description: string;
    buildDate: string;
    phase: string;
    features: string[];
};

/**
 * Language supported by the engine
 */
type SupportedLanguage = 'en' | 'ru';
/**
 * Domain vertical type (for extension)
 */
type DomainVertical = 'addiction' | 'sleep' | 'pain' | 'anxiety' | 'depression' | 'custom';

export { type ABCDChain, type AgeGroup$1 as AgeGroup, type AttentionalBias, type BeliefState$1 as BeliefState, BeliefStateAdapter, type BeliefUpdate, type BeliefUpdateResult, COGNICORE_VERSION, type ChangeStage, type CognitiveDistortion, type CognitiveDistortionType, type CognitiveLoad, type CognitiveTriad, type ComponentStatus, type CopingStrategy, type CopingStrategyType, type CoreBeliefPattern, DEFAULT_EMOTION_VAD, DEFAULT_KALMANFORMER_CONFIG, DEFAULT_PLRNN_CONFIG, DEFAULT_VOICE_CONFIG, DIMENSION_INDEX, DIMENSION_MAPPING, DISTORTION_INTERVENTIONS, DISTORTION_PATTERNS, type DetectedDistortion, type DomainVertical, EMOTION_THERAPY_MAPPING, type EmotionPattern, type EmotionTrend, type EmotionType$1 as EmotionType, type EnergyLevel, type IAcousticFeatures, type IAttentionWeights, type IBeliefUpdateEngine, type ICausalEdge, type ICausalGraph, type ICausalNetwork, type ICausalNode, type ICognitiveDistortionDetector, type ICognitiveState, type ICognitiveStateBuilder, type ICognitiveStateFactory, type IConstitutionalPrinciple, type IContextualFeatures, type ICounterfactualExplanation, type ICrisisDetectionResult, type IDecisionPoint, type IDeepCognitiveMirror, type IDigitalTwinService, type IDigitalTwinState, type IEarlyWarningSignal, type IEmotionalState$1 as IEmotionalState, type IEmotionalStateBuilder, type IEmotionalStateFactory, type IEscalationDecision, type IExplainabilityService, type IFeatureAttribution, type IGlobalFeatureImportance, type IHumanEscalationRequest, type IHybridPrediction, type IIncomingMessage, type IIntervention$1 as IIntervention, type IInterventionOptimizer, type IInterventionOutcome, type IInterventionSelection, type IInterventionSimulation, type IInterventionTarget, type IKalmanFormerConfig, type IKalmanFormerEngine, type IKalmanFormerPrediction, type IKalmanFormerState, type IKalmanFormerTrainingSample, type IKalmanFormerWeights, type IMessageAnalysis, type IMetacognitiveState, type IModelCard, type IMotivationalState, type IMultimodalFusion, INDEX_THRESHOLDS, type INarrativeExplanation, type INarrativeState, type INarrativeStateBuilder, type ICausalEdge$1 as IPLRNNCausalEdge, type ICausalNode$1 as IPLRNNCausalNode, type IPLRNNConfig, type IPLRNNEngine, type IPLRNNPrediction, type IPLRNNState, type IPLRNNTrainingResult, type IPLRNNTrainingSample, type IPLRNNWeights, type IPipelineResult, type IProsodyFeatures, type IResourceState, type IResourceStateBuilder, type IRiskState, type IRiskStateBuilder, type ISHAPExplanation, type ISafetyContext, type ISafetyInvariant, type ISafetyValidationResult, type IScenario, type IScenarioResult, type IStateTrajectory, type IStateVector, type IStateVectorBuilder, type IStateVectorFactory, type IStateVectorRepository, type IStateVectorService, type ITemporalEchoEngine, type ITextAnalysis, type ITippingPoint, type ITwinStateVariable, type IVADMapper, type IVoiceAdapterConfig, type IVoiceEmotionEstimate, type IVoiceInputAdapter, type IVoiceProcessingResult, KalmanFormerEngine, type KalmanFormerEngineFactory, type MessageIntent, type Metacognition, type NarrativeChapter, type NarrativeMoment, type NarrativeRole, type NarrativeTheme, type Observation, type ObservationSource, type PERMADimensions, PLRNNEngine, type PLRNNEngineFactory, type AgeGroup as PipelineAgeGroup, type ProtectiveFactor, type RegulationEffectiveness, type Resilience, type RiskFactor, type RiskLevel$2 as RiskLevel, type RiskTrajectory, type SafetyLevel, type SafetyPlan, type RiskLevel$1 as SafetyRiskLevel, type ScoredEmotion, type SocialResources, type SocraticQuestion, type StageTransition, type StateBasedRecommendation, type StateQuality, type StateSummary, type StateTransition, type SupportedLanguage, type TemporalPrediction, type TextAnalysisResult, type TherapeuticInsight, type ThinkingStyle, type VADDimensions, VoiceInputAdapter, type VoiceInputAdapterFactory, type VulnerabilityWindow, WELLBEING_WEIGHTS, beliefStateToKalmanFormerState, beliefStateToObservation, beliefStateToPLRNNState, beliefStateToUncertainty, createBeliefStateAdapter, createKalmanFormerEngine, createPLRNNEngine, createVoiceInputAdapter, getComponentStatus, kalmanFormerStateToBeliefUpdate, mergeHybridPredictions, plrnnStateToBeliefUpdate };
