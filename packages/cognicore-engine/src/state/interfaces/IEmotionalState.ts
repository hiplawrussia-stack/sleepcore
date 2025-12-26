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
export type EmotionType =
  // Primary emotions (Plutchik's wheel)
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation'
  // Secondary/compound emotions
  | 'love'           // joy + trust
  | 'guilt'          // fear + sadness
  | 'shame'          // fear + disgust
  | 'anxiety'        // fear + anticipation
  | 'stress'         // anger + fear
  | 'frustration'    // anger + sadness
  | 'hope'           // anticipation + trust
  | 'confusion'      // surprise + fear
  | 'loneliness'     // sadness + trust deficit
  | 'boredom'        // low arousal neutral
  | 'excitement'     // high arousal joy
  | 'calm'           // low arousal trust
  | 'irritation'     // mild anger
  | 'despair'        // intense sadness
  | 'contentment'    // mild joy + calm
  | 'pride'          // joy + trust in self
  | 'gratitude'      // joy + trust in others
  | 'envy'           // sadness + anger at others
  | 'jealousy'       // fear + anger
  | 'overwhelm'      // multiple intense emotions
  | 'numbness'       // emotional suppression
  | 'curiosity'      // anticipation + surprise
  | 'awe'            // surprise + trust
  // Crisis-related emotions
  | 'hopelessness'   // extreme despair, crisis indicator
  | 'relief'         // tension release after stress
  | 'apathy'         // lack of interest/motivation
  | 'resentment'     // bitterness, perceived unfairness
  | 'neutral';       // baseline state

/**
 * Emotion trend direction
 */
export type EmotionTrend =
  | 'improving'    // Moving toward positive valence
  | 'stable'       // Consistent state
  | 'declining'    // Moving toward negative valence
  | 'volatile';    // Rapid fluctuations

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
  readonly confidence: number;  // 0.0 - 1.0
  readonly intensity: number;   // 0.0 - 1.0
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
    readonly min: number;  // minutes
    readonly max: number;  // minutes
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
  readonly averageEffectiveness: number;  // 0.0 - 1.0
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
  fromTextAnalysis(
    text: string,
    previousState?: IEmotionalState
  ): Promise<IEmotionalState>;

  /**
   * Create from self-reported emotion
   */
  fromSelfReport(
    reportedEmotion: EmotionType,
    intensity: number,
    previousState?: IEmotionalState
  ): Promise<IEmotionalState>;

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
export const DEFAULT_EMOTION_VAD: Record<EmotionType, VADDimensions> = {
  // High valence, varied arousal
  joy:          { valence: 0.8, arousal: 0.6, dominance: 0.6 },
  excitement:   { valence: 0.8, arousal: 0.9, dominance: 0.7 },
  contentment:  { valence: 0.7, arousal: 0.2, dominance: 0.6 },
  calm:         { valence: 0.5, arousal: -0.3, dominance: 0.5 },
  hope:         { valence: 0.6, arousal: 0.3, dominance: 0.5 },
  pride:        { valence: 0.7, arousal: 0.4, dominance: 0.8 },
  gratitude:    { valence: 0.8, arousal: 0.3, dominance: 0.5 },
  love:         { valence: 0.9, arousal: 0.5, dominance: 0.5 },
  trust:        { valence: 0.6, arousal: 0.1, dominance: 0.5 },
  curiosity:    { valence: 0.5, arousal: 0.6, dominance: 0.5 },
  awe:          { valence: 0.7, arousal: 0.5, dominance: 0.3 },
  anticipation: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
  surprise:     { valence: 0.3, arousal: 0.8, dominance: 0.3 },

  // Neutral
  neutral:      { valence: 0.0, arousal: 0.0, dominance: 0.5 },
  boredom:      { valence: -0.2, arousal: -0.5, dominance: 0.3 },
  confusion:    { valence: -0.2, arousal: 0.4, dominance: 0.2 },

  // Low valence, varied arousal
  sadness:      { valence: -0.7, arousal: -0.3, dominance: 0.2 },
  loneliness:   { valence: -0.6, arousal: -0.2, dominance: 0.2 },
  despair:      { valence: -0.9, arousal: -0.1, dominance: 0.1 },
  guilt:        { valence: -0.6, arousal: 0.2, dominance: 0.2 },
  shame:        { valence: -0.7, arousal: 0.3, dominance: 0.1 },
  numbness:     { valence: -0.3, arousal: -0.6, dominance: 0.2 },

  // Negative + high arousal
  anger:        { valence: -0.6, arousal: 0.8, dominance: 0.7 },
  irritation:   { valence: -0.4, arousal: 0.5, dominance: 0.5 },
  frustration:  { valence: -0.5, arousal: 0.6, dominance: 0.3 },
  fear:         { valence: -0.7, arousal: 0.7, dominance: 0.1 },
  anxiety:      { valence: -0.5, arousal: 0.6, dominance: 0.2 },
  stress:       { valence: -0.5, arousal: 0.7, dominance: 0.3 },
  overwhelm:    { valence: -0.6, arousal: 0.8, dominance: 0.1 },
  disgust:      { valence: -0.6, arousal: 0.4, dominance: 0.5 },
  envy:         { valence: -0.5, arousal: 0.4, dominance: 0.3 },
  jealousy:     { valence: -0.6, arousal: 0.6, dominance: 0.3 },

  // Crisis-related emotions (Phase 6.2)
  hopelessness: { valence: -0.95, arousal: -0.2, dominance: 0.05 },  // extreme despair, crisis indicator
  relief:       { valence: 0.6, arousal: -0.2, dominance: 0.6 },     // tension release
  apathy:       { valence: -0.2, arousal: -0.7, dominance: 0.2 },    // low energy, low interest
  resentment:   { valence: -0.5, arousal: 0.3, dominance: 0.3 },     // bitterness, unfairness
};

/**
 * Emotion to therapy approach mapping
 * Used for intervention selection
 */
export const EMOTION_THERAPY_MAPPING: Record<EmotionType, string[]> = {
  anxiety:      ['breathing', 'grounding', 'cognitive_restructuring'],
  stress:       ['relaxation', 'time_management', 'mindfulness'],
  sadness:      ['behavioral_activation', 'gratitude', 'social_connection'],
  anger:        ['anger_management', 'assertiveness', 'physical_release'],
  fear:         ['exposure_gradual', 'safety_planning', 'cognitive_defusion'],
  frustration:  ['problem_solving', 'acceptance', 'reframing'],
  loneliness:   ['social_skills', 'connection_activities', 'self_compassion'],
  overwhelm:    ['prioritization', 'breaking_down', 'support_seeking'],
  guilt:        ['values_clarification', 'amends', 'self_forgiveness'],
  shame:        ['self_compassion', 'normalization', 'vulnerability_work'],
  despair:      ['crisis_hotline', 'safety_planning', 'hope_building'],
  numbness:     ['sensory_grounding', 'emotion_identification', 'gentle_activation'],
  boredom:      ['engagement_activities', 'value_exploration', 'novelty_seeking'],
  confusion:    ['clarification', 'journaling', 'external_perspective'],
  joy:          ['savoring', 'gratitude', 'sharing'],
  excitement:   ['channeling', 'grounding', 'planning'],
  contentment:  ['mindfulness', 'appreciation', 'maintenance'],
  calm:         ['awareness', 'body_scan', 'present_moment'],
  hope:         ['goal_setting', 'visualization', 'small_steps'],
  pride:        ['celebration', 'sharing', 'building'],
  gratitude:    ['expression', 'journaling', 'paying_forward'],
  love:         ['expression', 'quality_time', 'appreciation'],
  trust:        ['vulnerability', 'reciprocity', 'boundaries'],
  curiosity:    ['exploration', 'learning', 'questioning'],
  awe:          ['nature', 'art', 'reflection'],
  anticipation: ['planning', 'grounding', 'patience'],
  surprise:     ['processing', 'integration', 'adaptation'],
  irritation:   ['pause', 'perspective', 'communication'],
  envy:         ['gratitude', 'self_focus', 'inspiration'],
  jealousy:     ['security_building', 'communication', 'self_worth'],
  disgust:      ['values_clarification', 'boundaries', 'processing'],
  neutral:      ['check_in', 'awareness', 'exploration'],

  // Crisis-related emotions (Phase 6.2)
  hopelessness: ['crisis_hotline', 'safety_planning', 'immediate_support', 'professional_referral'],
  relief:       ['integration', 'gratitude', 'prevention_planning', 'self_care'],
  apathy:       ['behavioral_activation', 'gentle_engagement', 'meaning_exploration', 'professional_assessment'],
  resentment:   ['anger_processing', 'forgiveness_work', 'boundary_setting', 'perspective_taking'],
};
