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
import type { EmotionType } from '../state/interfaces/IEmotionalState';
import type { CognitiveDistortionType } from '../state/interfaces/ICognitiveState';
/**
 * Activating Event - the trigger situation
 * Based on Ellis's REBT and Beck's CT
 */
export interface ActivatingEvent {
    readonly id: string;
    readonly description: string;
    readonly category: ActivatingEventCategory;
    readonly context: EventContext;
    readonly timestamp: Date;
    readonly extractedFrom: string;
    readonly confidence: number;
}
export type ActivatingEventCategory = 'interpersonal' | 'achievement' | 'loss' | 'threat' | 'self_evaluation' | 'life_transition' | 'daily_hassle' | 'trauma_reminder' | 'undefined';
export interface EventContext {
    readonly setting?: string;
    readonly involvedPeople?: string[];
    readonly timeContext?: 'past' | 'present' | 'future' | 'hypothetical';
    readonly intensity: number;
}
/**
 * Belief - the automatic thought or interpretation
 * Core of cognitive distortion detection
 */
export interface AutomaticThought {
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
export type ThoughtType = 'automatic_negative' | 'automatic_positive' | 'core_belief' | 'intermediate_belief' | 'rational' | 'neutral';
/**
 * Detected Cognitive Distortion
 * Based on Burns' 15-category taxonomy + extensions
 */
export interface DetectedDistortion {
    readonly type: CognitiveDistortionType;
    readonly confidence: number;
    readonly evidenceSpan: TextSpan;
    readonly severity: 'mild' | 'moderate' | 'severe';
    readonly frequency?: 'isolated' | 'recurring' | 'pervasive';
}
export interface TextSpan {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
/**
 * Consequence - emotional and behavioral response
 */
export interface EmotionalConsequence {
    readonly id: string;
    readonly emotions: Array<{
        type: EmotionType;
        intensity: number;
        confidence: number;
    }>;
    readonly behavioralUrges: BehavioralUrge[];
    readonly physiologicalSigns?: string[];
    readonly linkedThoughtId?: string;
    readonly timestamp: Date;
}
export interface BehavioralUrge {
    readonly action: string;
    readonly category: BehavioralCategory;
    readonly intensity: number;
    readonly isAdaptive: boolean;
}
export type BehavioralCategory = 'avoidance' | 'withdrawal' | 'aggression' | 'self_soothing' | 'help_seeking' | 'problem_solving' | 'rumination' | 'substance_use' | 'self_harm' | 'compulsion';
/**
 * Disputation - challenging the thought
 * Socratic questioning approach
 */
export interface Disputation {
    readonly id: string;
    readonly targetThoughtId: string;
    readonly type: DisputationType;
    readonly questions: SocraticQuestion[];
    readonly alternativeThoughts: AlternativeThought[];
    readonly evidenceFor: string[];
    readonly evidenceAgainst: string[];
    readonly timestamp: Date;
}
export type DisputationType = 'empirical' | 'logical' | 'functional' | 'philosophical' | 'compassionate';
export interface SocraticQuestion {
    readonly question: string;
    readonly type: DisputationType;
    readonly targetDistortion?: CognitiveDistortionType;
    readonly difficulty: 'easy' | 'medium' | 'challenging';
}
export interface AlternativeThought {
    readonly content: string;
    readonly believability: number;
    readonly isBalanced: boolean;
    readonly preservesValidConcerns: boolean;
}
/**
 * Complete ABCD Chain - full cognitive pathway
 */
export interface ABCDChain {
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
export interface CognitivePattern {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly type: PatternType;
    readonly frequency: number;
    readonly triggerCategories: ActivatingEventCategory[];
    readonly associatedDistortions: CognitiveDistortionType[];
    readonly typicalEmotions: EmotionType[];
    readonly firstObserved: Date;
    readonly lastObserved: Date;
    readonly strength: number;
    readonly isAdaptive: boolean;
}
export type PatternType = 'core_belief' | 'conditional_assumption' | 'compensatory_strategy' | 'schema' | 'trigger_response' | 'avoidance_cycle' | 'rumination_loop' | 'safety_behavior';
/**
 * Thinking Style Profile
 * Meta-analysis of cognitive tendencies
 */
export interface ThinkingStyleProfile {
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
export interface TherapeuticInsight {
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
export type InsightType = 'pattern_observation' | 'reframe_suggestion' | 'validation' | 'psychoeducation' | 'strength_highlight' | 'progress_reflection' | 'gentle_challenge' | 'future_oriented';
export type InsightTiming = 'immediate' | 'session_end' | 'pattern_detected' | 'progress_milestone' | 'check_in';
export interface TherapeuticExercise {
    readonly id: string;
    readonly name: string;
    readonly type: ExerciseType;
    readonly duration: number;
    readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
    readonly targetSkill: string;
    readonly instructions: string[];
    readonly expectedBenefit: string;
}
export type ExerciseType = 'thought_record' | 'behavioral_experiment' | 'cognitive_restructuring' | 'mindfulness' | 'behavioral_activation' | 'exposure' | 'problem_solving' | 'self_compassion' | 'values_clarification';
/**
 * Text Analysis Result
 * Output of analyzing user message
 */
export interface TextAnalysisResult {
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
export interface SessionAnalysisResult {
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
export interface DeepCognitiveMirrorConfig {
    readonly distortionConfidenceThreshold: number;
    readonly patternMinFrequency: number;
    readonly insightConfidenceThreshold: number;
    readonly maxChainsPerSession: number;
    readonly enableRealTimeAnalysis: boolean;
    readonly analysisDepth: 'shallow' | 'moderate' | 'deep';
    readonly adaptToUserStyle: boolean;
    readonly useHistoricalPatterns: boolean;
    readonly languageStyle: 'clinical' | 'conversational' | 'youth_friendly';
    readonly enableCrisisDetection: boolean;
    readonly flagHighRiskThoughts: boolean;
    readonly escalationThreshold: number;
}
export declare const DEFAULT_MIRROR_CONFIG: DeepCognitiveMirrorConfig;
/**
 * Complete taxonomy of cognitive distortions
 * Based on Beck (1979), Burns (1980, 1999), Freeman (1992)
 */
export interface DistortionDefinition {
    readonly type: CognitiveDistortionType;
    readonly name: string;
    readonly nameRu: string;
    readonly description: string;
    readonly descriptionRu: string;
    readonly examples: string[];
    readonly challengingQuestions: string[];
    readonly relatedDistortions: CognitiveDistortionType[];
}
export declare const DISTORTION_DEFINITIONS: Partial<Record<CognitiveDistortionType, DistortionDefinition>>;
/**
 * Deep Cognitive Mirror Engine Interface
 * Main API for cognitive analysis and insight generation
 */
export interface IDeepCognitiveMirror {
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
export interface AnalysisContext {
    readonly previousMessages?: string[];
    readonly currentEmotion?: EmotionType;
    readonly recentPatterns?: CognitivePattern[];
    readonly sessionGoal?: string;
    readonly urgency?: 'low' | 'medium' | 'high';
}
export interface InsightContext {
    readonly userId: string | number;
    readonly currentText?: string;
    readonly currentChain?: ABCDChain;
    readonly currentPattern?: CognitivePattern;
    readonly emotionalState?: EmotionType;
    readonly insightType?: InsightType;
    readonly previousInsights?: TherapeuticInsight[];
}
/**
 * Keywords and patterns for distortion detection
 * Used by rule-based detection layer
 */
export declare const DISTORTION_KEYWORDS: Partial<Record<CognitiveDistortionType, {
    keywords: string[];
    keywordsRu: string[];
    patterns: RegExp[];
}>>;
/**
 * Emotion-related keywords for consequence detection
 */
export declare const EMOTION_KEYWORDS: Partial<Record<EmotionType, {
    keywords: string[];
    keywordsRu: string[];
}>>;
//# sourceMappingURL=IDeepCognitiveMirror.d.ts.map