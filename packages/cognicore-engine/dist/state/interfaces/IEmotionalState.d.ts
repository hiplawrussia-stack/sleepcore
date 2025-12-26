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
export type EmotionType = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'trust' | 'anticipation' | 'love' | 'guilt' | 'shame' | 'anxiety' | 'stress' | 'frustration' | 'hope' | 'confusion' | 'loneliness' | 'boredom' | 'excitement' | 'calm' | 'irritation' | 'despair' | 'contentment' | 'pride' | 'gratitude' | 'envy' | 'jealousy' | 'overwhelm' | 'numbness' | 'curiosity' | 'awe' | 'hopelessness' | 'relief' | 'apathy' | 'resentment' | 'neutral';
/**
 * Emotion trend direction
 */
export type EmotionTrend = 'improving' | 'stable' | 'declining' | 'volatile';
/**
 * VAD (Valence-Arousal-Dominance) dimensional representation
 * Each dimension: -1.0 to +1.0
 */
export interface VADDimensions {
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
export interface ScoredEmotion {
    readonly emotion: EmotionType;
    readonly confidence: number;
    readonly intensity: number;
}
/**
 * Temporal emotion pattern
 */
export interface EmotionPattern {
    readonly patternId: string;
    readonly name: string;
    readonly description: string;
    readonly emotions: EmotionType[];
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
export interface RegulationEffectiveness {
    readonly strategyId: string;
    readonly strategyName: string;
    readonly usageCount: number;
    readonly averageEffectiveness: number;
    readonly bestForEmotions: EmotionType[];
    readonly lastUsed?: Date;
}
/**
 * 🎭 Main Emotional State Interface
 * Core component of State Vector S_t
 */
export interface IEmotionalState {
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
export interface IEmotionalStateBuilder {
    setPrimary(emotion: EmotionType, confidence: number, intensity: number): this;
    addSecondary(emotion: EmotionType, confidence: number, intensity: number): this;
    setVAD(valence: number, arousal: number, dominance: number): this;
    setTrend(trend: EmotionTrend): this;
    setVolatility(volatility: number): this;
    addPattern(pattern: EmotionPattern): this;
    addEffectiveStrategy(strategy: RegulationEffectiveness): this;
    setSource(source: IEmotionalState['source']): this;
    setDataQuality(quality: number): this;
    build(): IEmotionalState;
}
/**
 * Emotional State Factory Interface
 */
export interface IEmotionalStateFactory {
    /**
     * Create from text analysis
     */
    fromTextAnalysis(text: string, previousState?: IEmotionalState): Promise<IEmotionalState>;
    /**
     * Create from self-reported emotion
     */
    fromSelfReport(reportedEmotion: EmotionType, intensity: number, previousState?: IEmotionalState): Promise<IEmotionalState>;
    /**
     * Create from legacy system format
     * (compatibility with EnhancedEmotionalRecognitionService)
     */
    fromLegacyAnalysis(legacyResult: {
        primaryEmotion: string;
        emotionIntensity: number;
        riskLevel: string;
        recommendations: unknown[];
    }): IEmotionalState;
    /**
     * Create neutral baseline state
     */
    createNeutral(): IEmotionalState;
    /**
     * Merge multiple emotional states (e.g., from different sources)
     */
    merge(states: IEmotionalState[]): IEmotionalState;
}
/**
 * VAD Mapping utilities
 * Maps discrete emotions to VAD space and vice versa
 */
export interface IVADMapper {
    /**
     * Convert discrete emotion to VAD coordinates
     */
    emotionToVAD(emotion: EmotionType, intensity?: number): VADDimensions;
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
export declare const DEFAULT_EMOTION_VAD: Record<EmotionType, VADDimensions>;
/**
 * Emotion to therapy approach mapping
 * Used for intervention selection
 */
export declare const EMOTION_THERAPY_MAPPING: Record<EmotionType, string[]>;
//# sourceMappingURL=IEmotionalState.d.ts.map