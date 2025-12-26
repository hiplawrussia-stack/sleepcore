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

import type { ChangeStage } from '../../state/interfaces/INarrativeState';

// ============================================================
// CHANGE TALK / SUSTAIN TALK TYPES (MISC 2.5)
// ============================================================

/**
 * Client language categories based on MISC coding scheme
 * CT = Change Talk (favors change)
 * ST = Sustain Talk (favors status quo)
 * FN = Follow/Neutral (unrelated to change)
 */
export type ClientLanguageCategory =
  | 'change_talk'    // Language favoring behavior change
  | 'sustain_talk'   // Language favoring status quo
  | 'follow_neutral'; // Language unrelated to change target

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
export type ChangeTaskSubtype =
  // Preparatory (DARN) - indicates motivation building
  | 'desire'      // Wanting to change: "I want to spend less time online"
  | 'ability'     // Perceived capability: "I could put my phone away"
  | 'reasons'     // Arguments for change: "It's affecting my sleep"
  | 'need'        // Necessity/urgency: "I have to do something"
  // Mobilizing (CAT) - indicates action readiness
  | 'commitment'  // Statements of intent: "I will limit my usage"
  | 'activation'  // Readiness signals: "I'm ready to try"
  | 'taking_steps'; // Already acting: "I've started tracking my time"

/**
 * Sustain Talk Subtypes (mirror of DARN-CAT)
 */
export type SustainTalkSubtype =
  | 'desire_against'     // "I don't want to give it up"
  | 'ability_against'    // "I can't stop"
  | 'reasons_against'    // "It helps me relax"
  | 'need_against'       // "I need it for work"
  | 'commitment_against' // "I won't change"
  | 'activation_against' // "I'm not ready"
  | 'taking_steps_against'; // "I keep going back to it"

/**
 * Detected utterance with language classification
 */
export interface ClientUtterance {
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

// ============================================================
// READINESS ASSESSMENT
// ============================================================

/**
 * Readiness Ruler Assessment
 * Classic MI tool for measuring importance and confidence
 */
export interface ReadinessRuler {
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
export interface LanguageBalance {
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
export interface DarnCatProfile {
  // Preparatory Change Talk (building motivation)
  readonly desire: number;    // Count
  readonly ability: number;
  readonly reasons: number;
  readonly need: number;

  // Mobilizing Change Talk (moving to action)
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

// ============================================================
// AMBIVALENCE STATE
// ============================================================

/**
 * Ambivalence Assessment
 * Core concept in MI - the "push-pull" of change
 */
export interface AmbivalenceState {
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

export type AmbivalenceType =
  | 'approach_approach'    // Wanting both options (stay AND change)
  | 'avoidance_avoidance'  // Fearing both options
  | 'approach_avoidance'   // Wanting and fearing same option
  | 'double_approach_avoidance'; // Complex mixed feelings

// ============================================================
// RESISTANCE INDICATORS
// ============================================================

/**
 * Discord/Resistance Indicators
 * Signs of strain in therapeutic relationship
 */
export interface DiscordIndicators {
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

export type DiscordType =
  | 'arguing'        // Challenging, disagreeing, hostility
  | 'interrupting'   // Cutting off, talking over
  | 'negating'       // "But...", "However...", discounting
  | 'ignoring'       // Not responding, changing topic
  | 'defending'      // Excusing, justifying, minimizing
  | 'squaring_off';  // Taking oppositional stance

export interface DiscordEvent {
  readonly type: DiscordType;
  readonly utterance: string;
  readonly timestamp: Date;
  readonly intensity: number; // 0-1
  readonly possibleTrigger?: string;
}

// ============================================================
// MAIN MOTIVATIONAL STATE INTERFACE
// ============================================================

/**
 * 🎯 Main Motivational State Interface
 * Integrates with CogniCore State Vector
 */
export interface IMotivationalState {
  /** Unique identifier */
  readonly id: string;

  /** User identifier */
  readonly userId: string | number;

  // ========== Readiness Assessment ==========

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

  // ========== Language Analysis ==========

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

  // ========== Ambivalence ==========

  /**
   * Current ambivalence state
   */
  readonly ambivalence: AmbivalenceState;

  /**
   * Is ambivalence being explored?
   */
  readonly ambivalenceExplored: boolean;

  // ========== Discord/Resistance ==========

  /**
   * Discord indicators
   */
  readonly discord: DiscordIndicators;

  /**
   * Is rapport maintained?
   */
  readonly rapportLevel: number; // 0-1

  // ========== Therapeutic Strategy ==========

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

  // ========== Meta ==========

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
export type MIStrategy =
  | 'build_rapport'           // Early stage, focus on relationship
  | 'develop_discrepancy'     // Help see gap between values and behavior
  | 'evoke_change_talk'       // Actively elicit CT
  | 'explore_ambivalence'     // Work through mixed feelings
  | 'strengthen_commitment'   // Build on existing CT
  | 'support_self_efficacy'   // Build confidence
  | 'roll_with_resistance'    // Respond to discord
  | 'summarize_and_transition' // Ready for action planning
  | 'action_planning'         // In action stage
  | 'relapse_prevention';     // Maintenance stage

// ============================================================
// MOTIVATIONAL STATE BUILDER
// ============================================================

export interface IMotivationalStateBuilder {
  setUserId(userId: string | number): this;
  setReadinessRuler(importance: number, confidence: number): this;
  setLinkedStage(stage: ChangeStage): this;
  addUtterance(utterance: ClientUtterance): this;
  setLanguageBalance(balance: LanguageBalance): this;
  setDarnCatProfile(profile: DarnCatProfile): this;
  setAmbivalence(ambivalence: AmbivalenceState): this;
  setDiscord(discord: DiscordIndicators): this;
  setStrategy(strategy: MIStrategy): this;
  build(): IMotivationalState;
}

// ============================================================
// MOTIVATIONAL STATE FACTORY
// ============================================================

export interface IMotivationalStateFactory {
  /**
   * Create from conversation analysis
   */
  fromConversation(
    messages: Array<{ text: string; timestamp: Date; isUser: boolean }>,
    userId: string | number,
    previousState?: IMotivationalState
  ): Promise<IMotivationalState>;

  /**
   * Create from explicit assessment (readiness ruler)
   */
  fromAssessment(
    userId: string | number,
    importance: number,
    confidence: number
  ): IMotivationalState;

  /**
   * Create initial state for new user
   */
  createInitial(userId: string | number): IMotivationalState;

  /**
   * Update based on new utterance
   */
  updateWithUtterance(
    currentState: IMotivationalState,
    newUtterance: ClientUtterance
  ): IMotivationalState;

  /**
   * Update readiness ruler
   */
  updateReadiness(
    currentState: IMotivationalState,
    importance: number,
    confidence: number
  ): IMotivationalState;
}

// ============================================================
// KEYWORDS AND PATTERNS (RUSSIAN + ENGLISH)
// ============================================================

/**
 * Change Talk detection patterns
 * Based on MISC 2.5 coding manual + Russian adaptations
 */
export const CHANGE_TALK_PATTERNS: Record<ChangeTaskSubtype, {
  readonly keywords: string[];
  readonly keywordsRu: string[];
  readonly patterns: RegExp[];
  readonly patternsRu: RegExp[];
  readonly strength: number; // Base strength score
}> = {
  desire: {
    keywords: ['want to', 'wish', 'would like', 'hope to', 'prefer'],
    keywordsRu: ['хочу', 'хотел бы', 'желаю', 'мечтаю', 'надеюсь'],
    patterns: [/I (want|wish|would like) to/i, /I hope I could/i],
    patternsRu: [/хочу .* меньше/i, /хотел бы .* изменить/i],
    strength: 2
  },
  ability: {
    keywords: ['can', 'could', 'able to', 'possible', 'might be able'],
    keywordsRu: ['могу', 'мог бы', 'способен', 'в состоянии', 'получится'],
    patterns: [/I (can|could|am able to)/i, /it's possible for me/i],
    patternsRu: [/я (могу|мог бы|способен)/i, /у меня получится/i],
    strength: 2
  },
  reasons: {
    keywords: ['because', 'so that', 'would help', 'benefit', 'important because'],
    keywordsRu: ['потому что', 'чтобы', 'поможет', 'важно', 'польза'],
    patterns: [/it would (help|benefit|improve)/i, /important because/i],
    patternsRu: [/это (поможет|улучшит)/i, /важно,? потому что/i],
    strength: 2
  },
  need: {
    keywords: ['need to', 'have to', 'must', 'got to', 'should'],
    keywordsRu: ['надо', 'нужно', 'должен', 'необходимо', 'пора'],
    patterns: [/I (need|have|got) to/i, /I (really )?must/i],
    patternsRu: [/мне (надо|нужно|необходимо)/i, /я должен/i],
    strength: 3
  },
  commitment: {
    keywords: ['will', 'going to', 'intend to', 'plan to', 'promise'],
    keywordsRu: ['буду', 'собираюсь', 'намерен', 'планирую', 'обещаю'],
    patterns: [/I (will|am going to|intend to)/i, /I promise/i],
    patternsRu: [/я (буду|собираюсь|намерен)/i, /я обещаю/i],
    strength: 4
  },
  activation: {
    keywords: ['ready', 'willing', 'prepared', 'want to start'],
    keywordsRu: ['готов', 'согласен', 'хочу начать', 'решил'],
    patterns: [/I('m| am) ready to/i, /I('m| am) willing to/i],
    patternsRu: [/я готов/i, /я решил/i, /хочу начать/i],
    strength: 4
  },
  taking_steps: {
    keywords: ['started', 'have been', 'already', 'trying', 'working on'],
    keywordsRu: ['начал', 'уже', 'пробую', 'работаю над', 'делаю'],
    patterns: [/I('ve| have) (started|been)/i, /I('m| am) (trying|working on)/i],
    patternsRu: [/я (начал|уже|пробую)/i, /работаю над/i],
    strength: 5
  }
};

/**
 * Sustain Talk detection patterns
 */
export const SUSTAIN_TALK_PATTERNS: Record<SustainTalkSubtype, {
  readonly keywords: string[];
  readonly keywordsRu: string[];
  readonly patterns: RegExp[];
  readonly patternsRu: RegExp[];
  readonly strength: number; // Base strength score (negative)
}> = {
  desire_against: {
    keywords: ["don't want", "not interested", "prefer not", "like it"],
    keywordsRu: ['не хочу', 'мне нравится', 'не собираюсь', 'не интересно'],
    patterns: [/I (don't|do not) want to/i, /I like it the way/i],
    patternsRu: [/я не хочу/i, /мне нравится как есть/i],
    strength: -2
  },
  ability_against: {
    keywords: ["can't", "unable", "impossible", "too hard"],
    keywordsRu: ['не могу', 'невозможно', 'слишком сложно', 'не способен'],
    patterns: [/I (can't|cannot|am unable to)/i, /it's (too hard|impossible)/i],
    patternsRu: [/я не могу/i, /это (невозможно|слишком сложно)/i],
    strength: -2
  },
  reasons_against: {
    keywords: ['because I need', 'helps me', 'makes me feel', 'not that bad'],
    keywordsRu: ['потому что мне нужно', 'помогает мне', 'не так уж плохо'],
    patterns: [/it (helps|makes) me/i, /not (that|so) bad/i],
    patternsRu: [/(помогает|нужно) мне/i, /не так уж плохо/i],
    strength: -2
  },
  need_against: {
    keywords: ['need it', 'have to use', 'depend on', 'necessary for'],
    keywordsRu: ['мне это нужно', 'зависим от', 'необходимо для'],
    patterns: [/I need (it|this)/i, /I (depend|rely) on/i],
    patternsRu: [/мне (это )?нужно/i, /я (завишу|полагаюсь)/i],
    strength: -3
  },
  commitment_against: {
    keywords: ["won't", "not going to", "refuse", "never will"],
    keywordsRu: ['не буду', 'не собираюсь', 'отказываюсь', 'никогда'],
    patterns: [/I (won't|will not|am not going to)/i, /I refuse to/i],
    patternsRu: [/я (не буду|не собираюсь)/i, /я отказываюсь/i],
    strength: -4
  },
  activation_against: {
    keywords: ['not ready', 'not willing', 'not prepared', 'not yet'],
    keywordsRu: ['не готов', 'не хочу сейчас', 'ещё не время'],
    patterns: [/I('m| am) not ready/i, /not (yet|now)/i],
    patternsRu: [/я не готов/i, /ещё не (время|готов)/i],
    strength: -4
  },
  taking_steps_against: {
    keywords: ['keep doing', 'went back', 'still', 'continue'],
    keywordsRu: ['продолжаю', 'вернулся к', 'всё ещё', 'опять'],
    patterns: [/I (keep|still|continue)/i, /I went back to/i],
    patternsRu: [/я (продолжаю|вернулся)/i, /всё ещё/i],
    strength: -5
  }
};

/**
 * Discord/Resistance patterns
 */
export const DISCORD_PATTERNS: Record<DiscordType, {
  readonly keywords: string[];
  readonly keywordsRu: string[];
  readonly patterns: RegExp[];
}> = {
  arguing: {
    keywords: ['but', 'however', "that's not true", 'you don\'t understand', 'wrong'],
    keywordsRu: ['но', 'однако', 'это неправда', 'вы не понимаете', 'неправильно'],
    patterns: [/(but|however),? (I|you)/i, /that's (not true|wrong)/i]
  },
  interrupting: {
    keywords: ['wait', 'let me finish', 'hold on'],
    keywordsRu: ['подождите', 'дайте закончить', 'минуту'],
    patterns: [/wait,? (I|let me)/i]
  },
  negating: {
    keywords: ['no', 'nope', 'not really', 'I disagree'],
    keywordsRu: ['нет', 'не совсем', 'не согласен', 'неа'],
    patterns: [/^no[,.]?/i, /not really/i]
  },
  ignoring: {
    keywords: ['anyway', 'whatever', 'moving on', 'different topic'],
    keywordsRu: ['в любом случае', 'неважно', 'давайте о другом'],
    patterns: [/(anyway|whatever|nevermind)/i]
  },
  defending: {
    keywords: ["it's not my fault", "I had to", "what else could I", "anyone would"],
    keywordsRu: ['это не моя вина', 'мне пришлось', 'что мне было делать', 'любой бы'],
    patterns: [/it's not my fault/i, /I had (to|no choice)/i]
  },
  squaring_off: {
    keywords: ['we\'ll see', 'make me', 'try me', 'you can\'t'],
    keywordsRu: ['посмотрим', 'попробуй', 'вы не можете'],
    patterns: [/(we'll see|try me|make me)/i]
  }
};

/**
 * Strategy recommendations based on state
 */
export const STRATEGY_RECOMMENDATIONS: Record<ChangeStage, {
  readonly primaryStrategy: MIStrategy;
  readonly secondaryStrategies: MIStrategy[];
  readonly focus: string[];
  readonly avoid: string[];
}> = {
  precontemplation: {
    primaryStrategy: 'build_rapport',
    secondaryStrategies: ['develop_discrepancy', 'roll_with_resistance'],
    focus: [
      'Establish trust and safety',
      'Understand their perspective',
      'Plant seeds of doubt gently',
      'Avoid direct persuasion'
    ],
    avoid: [
      'Pushing for change',
      'Giving advice',
      'Arguing for change',
      'Labeling behavior as problematic'
    ]
  },
  contemplation: {
    primaryStrategy: 'explore_ambivalence',
    secondaryStrategies: ['evoke_change_talk', 'develop_discrepancy'],
    focus: [
      'Explore both sides of ambivalence',
      'Reflect change talk selectively',
      'Develop discrepancy with values',
      'Build importance of change'
    ],
    avoid: [
      'Decisional balance sheets',
      'Premature action planning',
      'Taking the change side of argument'
    ]
  },
  preparation: {
    primaryStrategy: 'strengthen_commitment',
    secondaryStrategies: ['support_self_efficacy', 'summarize_and_transition'],
    focus: [
      'Strengthen commitment language',
      'Build confidence for change',
      'Explore specific plans',
      'Mobilize support systems'
    ],
    avoid: [
      'Overwhelming with options',
      'Creating dependency',
      'Skipping confidence building'
    ]
  },
  action: {
    primaryStrategy: 'action_planning',
    secondaryStrategies: ['support_self_efficacy', 'relapse_prevention'],
    focus: [
      'Concrete action steps',
      'Celebrate progress',
      'Troubleshoot obstacles',
      'Strengthen new identity'
    ],
    avoid: [
      'Complacency',
      'Ignoring challenges',
      'Taking credit for their change'
    ]
  },
  maintenance: {
    primaryStrategy: 'relapse_prevention',
    secondaryStrategies: ['support_self_efficacy', 'strengthen_commitment'],
    focus: [
      'Identify high-risk situations',
      'Strengthen coping strategies',
      'Celebrate sustained change',
      'Plan for setbacks'
    ],
    avoid: [
      'Assuming work is done',
      'Ignoring warning signs',
      'Reducing support too quickly'
    ]
  },
  relapse: {
    primaryStrategy: 'roll_with_resistance',
    secondaryStrategies: ['support_self_efficacy', 'evoke_change_talk'],
    focus: [
      'Normalize as part of process',
      'Rebuild confidence',
      'Learn from experience',
      'Rekindle motivation'
    ],
    avoid: [
      'Blame or criticism',
      'Catastrophizing',
      'Starting over from scratch'
    ]
  }
};
