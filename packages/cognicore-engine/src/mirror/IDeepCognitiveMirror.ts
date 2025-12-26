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

// ============================================================
// ABCD MODEL TYPES (Ellis/Beck Framework)
// ============================================================

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
  readonly extractedFrom: string; // Original text source
  readonly confidence: number;
}

export type ActivatingEventCategory =
  | 'interpersonal' // Conflicts, rejections, social situations
  | 'achievement' // Work, school, performance
  | 'loss' // Grief, endings, separations
  | 'threat' // Danger, uncertainty, health concerns
  | 'self_evaluation' // Self-criticism, comparison
  | 'life_transition' // Changes, milestones
  | 'daily_hassle' // Minor frustrations
  | 'trauma_reminder' // Triggers of past trauma
  | 'undefined';

export interface EventContext {
  readonly setting?: string;
  readonly involvedPeople?: string[];
  readonly timeContext?: 'past' | 'present' | 'future' | 'hypothetical';
  readonly intensity: number; // 0-1 scale
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
  readonly believability: number; // 0-1, how strongly held
  readonly timestamp: Date;
  readonly linkedEventId?: string;
  readonly confidence: number;
}

export type ThoughtType =
  | 'automatic_negative' // ANT - Automatic Negative Thought
  | 'automatic_positive'
  | 'core_belief'
  | 'intermediate_belief' // Rules, attitudes, assumptions
  | 'rational'
  | 'neutral';

/**
 * Detected Cognitive Distortion
 * Based on Burns' 15-category taxonomy + extensions
 */
export interface DetectedDistortion {
  readonly type: CognitiveDistortionType;
  readonly confidence: number;
  readonly evidenceSpan: TextSpan; // Where in text
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

export type BehavioralCategory =
  | 'avoidance'
  | 'withdrawal'
  | 'aggression'
  | 'self_soothing'
  | 'help_seeking'
  | 'problem_solving'
  | 'rumination'
  | 'substance_use'
  | 'self_harm'
  | 'compulsion';

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

export type DisputationType =
  | 'empirical' // What's the evidence?
  | 'logical' // Does this make sense?
  | 'functional' // Is this helpful?
  | 'philosophical' // What's the worst that could happen?
  | 'compassionate'; // What would I tell a friend?

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

// ============================================================
// COGNITIVE PATTERN TYPES
// ============================================================

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
  readonly frequency: number; // Times observed
  readonly triggerCategories: ActivatingEventCategory[];
  readonly associatedDistortions: CognitiveDistortionType[];
  readonly typicalEmotions: EmotionType[];
  readonly firstObserved: Date;
  readonly lastObserved: Date;
  readonly strength: number; // 0-1, how entrenched
  readonly isAdaptive: boolean;
}

export type PatternType =
  | 'core_belief' // Deep-seated belief about self/world/future
  | 'conditional_assumption' // "If X, then Y" rules
  | 'compensatory_strategy' // Behaviors to cope with beliefs
  | 'schema' // Broader life pattern
  | 'trigger_response' // Specific stimulus-response
  | 'avoidance_cycle' // Avoiding feared situations
  | 'rumination_loop' // Repetitive negative thinking
  | 'safety_behavior'; // Actions to prevent feared outcomes

/**
 * Thinking Style Profile
 * Meta-analysis of cognitive tendencies
 */
export interface ThinkingStyleProfile {
  readonly userId: string | number;
  readonly timestamp: Date;

  // Distortion tendencies
  readonly distortionProfile: Map<CognitiveDistortionType, number>; // Frequency 0-1

  // Cognitive triad balance
  readonly triadBalance: {
    readonly selfFocus: number; // -1 to 1 (negative to positive)
    readonly worldFocus: number;
    readonly futureFocus: number;
  };

  // Thinking dimensions
  readonly dimensions: {
    readonly abstractVsConcrete: number; // -1 abstract, +1 concrete
    readonly internalVsExternal: number; // -1 internal locus, +1 external
    readonly globalVsSpecific: number; // -1 global, +1 specific
    readonly stableVsUnstable: number; // -1 stable attributions, +1 unstable
  };

  // Metacognitive awareness
  readonly metacognition: {
    readonly thoughtAwareness: number; // 0-1
    readonly emotionAwareness: number;
    readonly patternRecognition: number;
    readonly flexibilityScore: number;
  };

  // Resilience indicators
  readonly resilience: {
    readonly copingFlexibility: number;
    readonly distressTolerance: number;
    readonly optimismBias: number; // Negative = pessimism bias
    readonly growthMindset: number;
  };
}

// ============================================================
// THERAPEUTIC INSIGHT TYPES
// ============================================================

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

export type InsightType =
  | 'pattern_observation' // "I notice you often..."
  | 'reframe_suggestion' // "Another way to look at this..."
  | 'validation' // "It makes sense you feel..."
  | 'psychoeducation' // "This is called... and it works like..."
  | 'strength_highlight' // "You showed resilience when..."
  | 'progress_reflection' // "Compared to before, you..."
  | 'gentle_challenge' // "I wonder if..."
  | 'future_oriented'; // "What might happen if..."

export type InsightTiming =
  | 'immediate' // Right after event
  | 'session_end' // Summary reflection
  | 'pattern_detected' // When pattern emerges
  | 'progress_milestone' // Achievement moment
  | 'check_in'; // Proactive outreach

export interface TherapeuticExercise {
  readonly id: string;
  readonly name: string;
  readonly type: ExerciseType;
  readonly duration: number; // Minutes
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly targetSkill: string;
  readonly instructions: string[];
  readonly expectedBenefit: string;
}

export type ExerciseType =
  | 'thought_record' // ABCD journaling
  | 'behavioral_experiment' // Testing predictions
  | 'cognitive_restructuring' // Challenging thoughts
  | 'mindfulness' // Present moment awareness
  | 'behavioral_activation' // Increasing positive activities
  | 'exposure' // Gradual facing of fears
  | 'problem_solving' // Structured problem approach
  | 'self_compassion' // Kindness to self
  | 'values_clarification'; // What matters most

// ============================================================
// ANALYSIS RESULTS
// ============================================================

/**
 * Text Analysis Result
 * Output of analyzing user message
 */
export interface TextAnalysisResult {
  readonly originalText: string;
  readonly timestamp: Date;

  // Extracted components
  readonly events: ActivatingEvent[];
  readonly thoughts: AutomaticThought[];
  readonly emotions: EmotionalConsequence[];

  // ABCD chains
  readonly chains: ABCDChain[];

  // Aggregate metrics
  readonly metrics: {
    readonly overallNegativity: number; // 0-1
    readonly distortionDensity: number; // Distortions per sentence
    readonly emotionalIntensity: number;
    readonly cognitiveComplexity: number;
    readonly insightReadiness: number; // Receptiveness to reflection
  };

  // Processing metadata
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

  // Aggregated chains
  readonly chains: ABCDChain[];

  // Detected patterns
  readonly emergingPatterns: CognitivePattern[];

  // Session dynamics
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

  // Generated insights
  readonly insights: TherapeuticInsight[];

  // Recommendations
  readonly recommendations: {
    readonly nextSessionFocus: string[];
    readonly homeworkSuggestions: TherapeuticExercise[];
    readonly riskFlags: string[];
  };
}

// ============================================================
// CONFIGURATION
// ============================================================

export interface DeepCognitiveMirrorConfig {
  // Detection thresholds
  readonly distortionConfidenceThreshold: number;
  readonly patternMinFrequency: number;
  readonly insightConfidenceThreshold: number;

  // Analysis settings
  readonly maxChainsPerSession: number;
  readonly enableRealTimeAnalysis: boolean;
  readonly analysisDepth: 'shallow' | 'moderate' | 'deep';

  // Personalization
  readonly adaptToUserStyle: boolean;
  readonly useHistoricalPatterns: boolean;
  readonly languageStyle: 'clinical' | 'conversational' | 'youth_friendly';

  // Safety
  readonly enableCrisisDetection: boolean;
  readonly flagHighRiskThoughts: boolean;
  readonly escalationThreshold: number;
}

export const DEFAULT_MIRROR_CONFIG: DeepCognitiveMirrorConfig = {
  distortionConfidenceThreshold: 0.6,
  patternMinFrequency: 3,
  insightConfidenceThreshold: 0.7,
  maxChainsPerSession: 50,
  enableRealTimeAnalysis: true,
  analysisDepth: 'moderate',
  adaptToUserStyle: true,
  useHistoricalPatterns: true,
  languageStyle: 'conversational',
  enableCrisisDetection: true,
  flagHighRiskThoughts: true,
  escalationThreshold: 0.8,
};

// ============================================================
// DISTORTION DEFINITIONS
// ============================================================

/**
 * Complete taxonomy of cognitive distortions
 * Based on Beck (1979), Burns (1980, 1999), Freeman (1992)
 */
export interface DistortionDefinition {
  readonly type: CognitiveDistortionType;
  readonly name: string;
  readonly nameRu: string; // Russian name
  readonly description: string;
  readonly descriptionRu: string;
  readonly examples: string[];
  readonly challengingQuestions: string[];
  readonly relatedDistortions: CognitiveDistortionType[];
}

export const DISTORTION_DEFINITIONS: Partial<Record<CognitiveDistortionType, DistortionDefinition>> = {
  'all_or_nothing': {
    type: 'all_or_nothing',
    name: 'All-or-Nothing Thinking',
    nameRu: 'Чёрно-белое мышление',
    description: 'Viewing situations in only two categories instead of on a continuum',
    descriptionRu: 'Восприятие ситуаций только в двух крайних категориях',
    examples: [
      'If I\'m not perfect, I\'m a failure',
      'Either they love me completely or hate me',
    ],
    challengingQuestions: [
      'Is there any middle ground here?',
      'Can something be partially true?',
    ],
    relatedDistortions: ['catastrophizing', 'labeling'],
  },
  'catastrophizing': {
    type: 'catastrophizing',
    name: 'Catastrophizing',
    nameRu: 'Катастрофизация',
    description: 'Predicting the worst possible outcome without considering more likely scenarios',
    descriptionRu: 'Предсказание наихудшего исхода без учёта более вероятных сценариев',
    examples: [
      'If I fail this test, my life is ruined',
      'This headache must be a brain tumor',
    ],
    challengingQuestions: [
      'What is the most likely outcome?',
      'Have I survived similar situations before?',
    ],
    relatedDistortions: ['fortune_telling', 'magnification'],
  },
  'mind_reading': {
    type: 'mind_reading',
    name: 'Mind Reading',
    nameRu: 'Чтение мыслей',
    description: 'Assuming you know what others are thinking without evidence',
    descriptionRu: 'Уверенность в знании мыслей других без доказательств',
    examples: [
      'They think I\'m stupid',
      'She\'s judging me right now',
    ],
    challengingQuestions: [
      'What evidence do I have for this?',
      'Could there be other explanations?',
    ],
    relatedDistortions: ['personalization', 'fortune_telling'],
  },
  'fortune_telling': {
    type: 'fortune_telling',
    name: 'Fortune Telling',
    nameRu: 'Предсказание будущего',
    description: 'Predicting the future negatively without evidence',
    descriptionRu: 'Негативное предсказание будущего без доказательств',
    examples: [
      'I know I\'ll fail the interview',
      'This relationship will definitely end badly',
    ],
    challengingQuestions: [
      'Can I really predict the future?',
      'What would I tell a friend in this situation?',
    ],
    relatedDistortions: ['catastrophizing', 'mind_reading'],
  },
  'emotional_reasoning': {
    type: 'emotional_reasoning',
    name: 'Emotional Reasoning',
    nameRu: 'Эмоциональное обоснование',
    description: 'Believing something is true because you feel it strongly',
    descriptionRu: 'Вера в истинность чего-то из-за сильных чувств',
    examples: [
      'I feel anxious, so something bad must be about to happen',
      'I feel guilty, so I must have done something wrong',
    ],
    challengingQuestions: [
      'Are feelings always accurate reflections of reality?',
      'What are the facts vs. my feelings?',
    ],
    relatedDistortions: ['catastrophizing', 'mind_reading'],
  },
  'should_statements': {
    type: 'should_statements',
    name: 'Should Statements',
    nameRu: 'Долженствования',
    description: 'Using "should," "must," or "ought" as rigid rules',
    descriptionRu: 'Использование "должен", "обязан" как жёстких правил',
    examples: [
      'I should always be productive',
      'They should have known better',
    ],
    challengingQuestions: [
      'Is this a preference or an absolute rule?',
      'What happens if I change "should" to "I would prefer"?',
    ],
    relatedDistortions: ['all_or_nothing', 'personalization'],
  },
  'labeling': {
    type: 'labeling',
    name: 'Labeling',
    nameRu: 'Навешивание ярлыков',
    description: 'Attaching a global negative label to yourself or others',
    descriptionRu: 'Присваивание глобального негативного ярлыка себе или другим',
    examples: [
      'I\'m such a loser',
      'He\'s a complete jerk',
    ],
    challengingQuestions: [
      'Does one action define the whole person?',
      'What evidence contradicts this label?',
    ],
    relatedDistortions: ['all_or_nothing', 'overgeneralization'],
  },
  'personalization': {
    type: 'personalization',
    name: 'Personalization',
    nameRu: 'Персонализация',
    description: 'Blaming yourself for events outside your control',
    descriptionRu: 'Обвинение себя за события вне вашего контроля',
    examples: [
      'My child failed because I\'m a bad parent',
      'If I had been there, this wouldn\'t have happened',
    ],
    challengingQuestions: [
      'What other factors contributed?',
      'Would I blame someone else in the same situation?',
    ],
    relatedDistortions: ['should_statements', 'emotional_reasoning'],
  },
  'magnification': {
    type: 'magnification',
    name: 'Magnification',
    nameRu: 'Преувеличение',
    description: 'Exaggerating the importance of negative events',
    descriptionRu: 'Преувеличение важности негативных событий',
    examples: [
      'This mistake will ruin everything',
      'Everyone noticed my error',
    ],
    challengingQuestions: [
      'How important will this be in a year?',
      'Am I blowing this out of proportion?',
    ],
    relatedDistortions: ['catastrophizing', 'all_or_nothing'],
  },
  'minimization': {
    type: 'minimization',
    name: 'Minimization',
    nameRu: 'Преуменьшение',
    description: 'Downplaying positive events or qualities',
    descriptionRu: 'Преуменьшение позитивных событий или качеств',
    examples: [
      'Anyone could have done that',
      'It was just luck, not my ability',
    ],
    challengingQuestions: [
      'Would I minimize someone else\'s achievement?',
      'What does this accomplishment actually show?',
    ],
    relatedDistortions: ['disqualifying_positive', 'mental_filter'],
  },
  'mental_filter': {
    type: 'mental_filter',
    name: 'Mental Filter',
    nameRu: 'Ментальный фильтр',
    description: 'Focusing exclusively on negative details while ignoring positives',
    descriptionRu: 'Концентрация только на негативных деталях, игнорируя позитивные',
    examples: [
      'The presentation was terrible because I stumbled once',
      'My day was ruined by that one comment',
    ],
    challengingQuestions: [
      'What positive aspects am I overlooking?',
      'Would others see it the same way?',
    ],
    relatedDistortions: ['disqualifying_positive', 'all_or_nothing'],
  },
  'disqualifying_positive': {
    type: 'disqualifying_positive',
    name: 'Disqualifying the Positive',
    nameRu: 'Обесценивание позитива',
    description: 'Rejecting positive experiences as if they don\'t count',
    descriptionRu: 'Отвержение позитивного опыта, как будто он не имеет значения',
    examples: [
      'They\'re just being nice, they don\'t really mean it',
      'That compliment doesn\'t count',
    ],
    challengingQuestions: [
      'Why would this positive not count?',
      'What if I accepted this as genuine?',
    ],
    relatedDistortions: ['mental_filter', 'minimization'],
  },
  'overgeneralization': {
    type: 'overgeneralization',
    name: 'Overgeneralization',
    nameRu: 'Сверхобобщение',
    description: 'Drawing broad conclusions from a single event',
    descriptionRu: 'Делать широкие выводы из единичного события',
    examples: [
      'I always fail at everything',
      'Nobody ever listens to me',
    ],
    challengingQuestions: [
      'Is "always" or "never" really accurate?',
      'Can I think of exceptions?',
    ],
    relatedDistortions: ['all_or_nothing', 'labeling'],
  },
  'black_and_white': {
    type: 'black_and_white',
    name: 'Black and White Thinking',
    nameRu: 'Дихотомическое мышление',
    description: 'Seeing things in absolute terms with no middle ground',
    descriptionRu: 'Восприятие в абсолютных терминах без средней позиции',
    examples: [
      'You\'re either with me or against me',
      'If it\'s not perfect, it\'s worthless',
    ],
    challengingQuestions: [
      'Where might the middle ground be?',
      'Can both things be partially true?',
    ],
    relatedDistortions: ['all_or_nothing', 'catastrophizing'],
  },
};

// ============================================================
// MAIN INTERFACE
// ============================================================

/**
 * Deep Cognitive Mirror Engine Interface
 * Main API for cognitive analysis and insight generation
 */
export interface IDeepCognitiveMirror {
  // ========== Text Analysis ==========

  /**
   * Analyze single text message for cognitive content
   */
  analyzeText(
    text: string,
    userId: string | number,
    context?: AnalysisContext
  ): Promise<TextAnalysisResult>;

  /**
   * Analyze multiple messages as a session
   */
  analyzeSession(
    messages: Array<{ text: string; timestamp: Date }>,
    userId: string | number
  ): Promise<SessionAnalysisResult>;

  // ========== ABCD Extraction ==========

  /**
   * Extract ABCD chain from text
   */
  extractABCDChain(
    text: string,
    userId: string | number
  ): Promise<ABCDChain | null>;

  /**
   * Link existing components into chain
   */
  linkABCDComponents(
    event: ActivatingEvent,
    thoughts: AutomaticThought[],
    consequences: EmotionalConsequence[]
  ): ABCDChain;

  // ========== Distortion Detection ==========

  /**
   * Detect cognitive distortions in text
   */
  detectDistortions(
    text: string
  ): Promise<DetectedDistortion[]>;

  /**
   * Get distortion profile for user over time
   */
  getDistortionProfile(
    userId: string | number,
    timeRange?: { start: Date; end: Date }
  ): Promise<Map<CognitiveDistortionType, number>>;

  // ========== Pattern Recognition ==========

  /**
   * Detect cognitive patterns from history
   */
  detectPatterns(
    userId: string | number,
    minConfidence?: number
  ): Promise<CognitivePattern[]>;

  /**
   * Get thinking style profile
   */
  getThinkingStyleProfile(
    userId: string | number
  ): Promise<ThinkingStyleProfile>;

  /**
   * Check if pattern matches current text
   */
  matchPattern(
    text: string,
    pattern: CognitivePattern
  ): { matches: boolean; similarity: number };

  // ========== Insight Generation ==========

  /**
   * Generate therapeutic insight for current state
   */
  generateInsight(
    context: InsightContext
  ): Promise<TherapeuticInsight>;

  /**
   * Generate Socratic questions for thought
   */
  generateSocraticQuestions(
    thought: AutomaticThought,
    count?: number
  ): Promise<SocraticQuestion[]>;

  /**
   * Generate alternative thoughts
   */
  generateAlternativeThoughts(
    thought: AutomaticThought,
    count?: number
  ): Promise<AlternativeThought[]>;

  /**
   * Generate disputation for thought
   */
  generateDisputation(
    thought: AutomaticThought
  ): Promise<Disputation>;

  // ========== Exercises ==========

  /**
   * Get recommended exercises for user
   */
  getRecommendedExercises(
    userId: string | number,
    focus?: CognitiveDistortionType | PatternType
  ): Promise<TherapeuticExercise[]>;

  // ========== History & Storage ==========

  /**
   * Store analyzed chain
   */
  storeChain(chain: ABCDChain): Promise<void>;

  /**
   * Get historical chains for user
   */
  getChainHistory(
    userId: string | number,
    options?: {
      limit?: number;
      timeRange?: { start: Date; end: Date };
      distortionFilter?: CognitiveDistortionType;
    }
  ): Promise<ABCDChain[]>;

  /**
   * Get insight history
   */
  getInsightHistory(
    userId: string | number,
    limit?: number
  ): Promise<TherapeuticInsight[]>;
}

// ============================================================
// CONTEXT TYPES
// ============================================================

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

// ============================================================
// KEYWORD DICTIONARIES FOR DETECTION
// ============================================================

/**
 * Keywords and patterns for distortion detection
 * Used by rule-based detection layer
 */
export const DISTORTION_KEYWORDS: Partial<Record<CognitiveDistortionType, {
  keywords: string[];
  keywordsRu: string[];
  patterns: RegExp[];
}>> = {
  'all_or_nothing': {
    keywords: ['always', 'never', 'completely', 'totally', 'perfect', 'ruined', 'failure'],
    keywordsRu: ['всегда', 'никогда', 'полностью', 'абсолютно', 'идеально', 'провал'],
    patterns: [/nothing .* right/i, /everything .* wrong/i, /either .* or/i],
  },
  'catastrophizing': {
    keywords: ['terrible', 'horrible', 'disaster', 'worst', 'end of the world', 'unbearable'],
    keywordsRu: ['ужасно', 'кошмар', 'катастрофа', 'конец света', 'невыносимо'],
    patterns: [/what if .* worst/i, /going to .* terrible/i],
  },
  'mind_reading': {
    keywords: ['they think', 'she thinks', 'he thinks', 'everyone thinks', 'judging me'],
    keywordsRu: ['они думают', 'она думает', 'он думает', 'все думают', 'осуждают'],
    patterns: [/I know (they|she|he) (thinks?|feels?)/i],
  },
  'fortune_telling': {
    keywords: ['will definitely', 'going to fail', 'will never', 'bound to', 'doomed'],
    keywordsRu: ['точно будет', 'провалюсь', 'никогда не', 'обречён'],
    patterns: [/I (will|am going to) (fail|lose|mess up)/i],
  },
  'emotional_reasoning': {
    keywords: ['feel like', 'feels like', 'I feel therefore', 'because I feel'],
    keywordsRu: ['чувствую что', 'ощущаю что', 'раз я чувствую'],
    patterns: [/I feel .* so .* must be/i],
  },
  'should_statements': {
    keywords: ['should', 'must', 'ought to', 'have to', 'supposed to'],
    keywordsRu: ['должен', 'обязан', 'надо', 'следует'],
    patterns: [/I (should|must|have to)/i, /(they|she|he) (should|shouldn't)/i],
  },
  'labeling': {
    keywords: ['I am a', 'he is a', 'she is a', 'loser', 'idiot', 'stupid', 'worthless'],
    keywordsRu: ['я - ', 'он - ', 'она - ', 'неудачник', 'идиот', 'тупой', 'никчёмный'],
    patterns: [/I('m| am) (such )?a (loser|failure|idiot)/i],
  },
  'personalization': {
    keywords: ['my fault', 'because of me', 'I caused', 'I made them'],
    keywordsRu: ['моя вина', 'из-за меня', 'я виноват', 'я заставил'],
    patterns: [/it('s| is) (all )?(my|your) fault/i],
  },
  'magnification': {
    keywords: ['huge', 'enormous', 'devastating', 'ruined', 'destroyed'],
    keywordsRu: ['огромный', 'разрушительный', 'уничтожено', 'всё пропало'],
    patterns: [/this (changes|ruins|destroys) everything/i],
  },
  'minimization': {
    keywords: ['just luck', 'anyone could', 'doesn\'t count', 'no big deal', 'just'],
    keywordsRu: ['просто повезло', 'любой мог бы', 'не считается', 'ерунда'],
    patterns: [/it('s| is) (just|only|nothing)/i],
  },
  'mental_filter': {
    keywords: ['only negative', 'only bad', 'ruined by', 'all I see'],
    keywordsRu: ['только плохое', 'всё испортил', 'вижу только'],
    patterns: [/the (one|only) (thing|part) (that|which)/i],
  },
  'disqualifying_positive': {
    keywords: ['doesn\'t count', 'but', 'yeah but', 'only saying that', 'just being nice'],
    keywordsRu: ['не считается', 'но', 'да но', 'просто из вежливости'],
    patterns: [/(they'?re|she's|he's) just (being nice|saying that)/i],
  },
  'overgeneralization': {
    keywords: ['always', 'never', 'everyone', 'no one', 'all', 'nothing'],
    keywordsRu: ['всегда', 'никогда', 'все', 'никто', 'ничего'],
    patterns: [/(I|you) (always|never)/i, /(everyone|nobody|nothing) (ever|always)/i],
  },
  'black_and_white': {
    keywords: ['either', 'or', 'completely', 'totally', 'all or nothing'],
    keywordsRu: ['либо', 'или', 'полностью', 'совершенно', 'всё или ничего'],
    patterns: [/either .* or/i, /(you're|it's) (either|all)/i],
  },
};

/**
 * Emotion-related keywords for consequence detection
 */
export const EMOTION_KEYWORDS: Partial<Record<EmotionType, {
  keywords: string[];
  keywordsRu: string[];
}>> = {
  'joy': { keywords: ['happy', 'glad', 'delighted', 'thrilled'], keywordsRu: ['счастлив', 'рад', 'доволен'] },
  'sadness': { keywords: ['sad', 'down', 'depressed', 'blue', 'unhappy'], keywordsRu: ['грустно', 'печально', 'тоска'] },
  'anger': { keywords: ['angry', 'furious', 'mad', 'annoyed', 'frustrated'], keywordsRu: ['злой', 'разозлён', 'раздражён'] },
  'fear': { keywords: ['scared', 'afraid', 'terrified', 'anxious', 'worried'], keywordsRu: ['страшно', 'боюсь', 'тревожно'] },
  'disgust': { keywords: ['disgusted', 'repulsed', 'grossed out'], keywordsRu: ['отвратительно', 'противно'] },
  'surprise': { keywords: ['surprised', 'shocked', 'amazed', 'astonished'], keywordsRu: ['удивлён', 'шокирован'] },
  'trust': { keywords: ['trust', 'believe', 'faith', 'confident'], keywordsRu: ['доверяю', 'верю', 'уверен'] },
  'anticipation': { keywords: ['expecting', 'looking forward', 'excited about'], keywordsRu: ['жду', 'предвкушаю'] },
  'anxiety': { keywords: ['anxious', 'worried', 'nervous', 'stressed', 'panicked'], keywordsRu: ['тревога', 'волнуюсь', 'нервничаю'] },
  'shame': { keywords: ['ashamed', 'embarrassed', 'humiliated'], keywordsRu: ['стыдно', 'позор'] },
  'guilt': { keywords: ['guilty', 'regret', 'remorse'], keywordsRu: ['виноват', 'сожалею'] },
  'loneliness': { keywords: ['lonely', 'alone', 'isolated', 'abandoned'], keywordsRu: ['одиноко', 'один', 'покинут'] },
  'hopelessness': { keywords: ['hopeless', 'pointless', 'no hope', 'give up'], keywordsRu: ['безнадёжно', 'бессмысленно'] },
  'confusion': { keywords: ['confused', 'lost', 'don\'t understand'], keywordsRu: ['растерян', 'не понимаю'] },
  'frustration': { keywords: ['frustrated', 'stuck', 'can\'t', 'impossible'], keywordsRu: ['разочарован', 'застрял'] },
  'overwhelm': { keywords: ['overwhelmed', 'too much', 'can\'t cope'], keywordsRu: ['перегружен', 'слишком много'] },
  'resentment': { keywords: ['resent', 'bitter', 'unfair'], keywordsRu: ['обижен', 'несправедливо'] },
  'jealousy': { keywords: ['jealous', 'envious'], keywordsRu: ['завидую', 'ревную'] },
  'love': { keywords: ['love', 'adore', 'care deeply'], keywordsRu: ['люблю', 'обожаю'] },
  'gratitude': { keywords: ['grateful', 'thankful', 'appreciate'], keywordsRu: ['благодарен', 'признателен'] },
  'pride': { keywords: ['proud', 'accomplished'], keywordsRu: ['горжусь', 'достижение'] },
  'contentment': { keywords: ['content', 'satisfied', 'at peace'], keywordsRu: ['доволен', 'умиротворён'] },
  'hope': { keywords: ['hope', 'hopeful', 'optimistic'], keywordsRu: ['надеюсь', 'оптимистичен'] },
  'relief': { keywords: ['relieved', 'phew', 'weight off'], keywordsRu: ['облегчение', 'отпустило'] },
  'curiosity': { keywords: ['curious', 'interested', 'wonder'], keywordsRu: ['интересно', 'любопытно'] },
  'excitement': { keywords: ['excited', 'thrilled', 'can\'t wait'], keywordsRu: ['взволнован', 'восторг'] },
  'boredom': { keywords: ['bored', 'dull', 'nothing to do'], keywordsRu: ['скучно', 'нечего делать'] },
  'apathy': { keywords: ['don\'t care', 'whatever', 'numb'], keywordsRu: ['всё равно', 'безразлично'] },
  // 'determination' and 'vulnerability' removed - not in EmotionType (Phase 6)
  'neutral': { keywords: ['okay', 'fine', 'alright'], keywordsRu: ['нормально', 'ок'] },
};
