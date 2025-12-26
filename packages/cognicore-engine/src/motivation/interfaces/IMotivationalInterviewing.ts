/**
 * MOTIVATIONAL INTERVIEWING TECHNIQUES INTERFACE
 * ================================================
 * OARS + MITI 4.2 Behavior Codes for AI-MI System
 *
 * Scientific Foundation:
 * - MITI 4.2 Coding Manual (Moyers et al., 2014)
 * - OARS Framework (Miller & Rollnick, 2013)
 * - AI-MI Best Practices (JMIR 2025 Scoping Review)
 * - LLM Chain-of-Thought for MI (arXiv:2505.17380)
 *
 * Key Innovation:
 * - Computational implementation of MI therapist behaviors
 * - Real-time response generation following MI principles
 * - Fidelity tracking using MITI 4.2 global scores
 *
 * BФ "Другой путь" | CogniCore Phase 4.1
 */

import type {
  IMotivationalState,
  MIStrategy,
  ClientUtterance,
  ChangeTaskSubtype,
  DiscordType
} from './IMotivationalState';

// ============================================================
// MITI 4.2 THERAPIST BEHAVIOR CODES
// ============================================================

/**
 * MITI 4.2 Behavior Codes
 * Based on Moyers et al., 2014
 */
export type MITIBehaviorCode =
  // Questions
  | 'question_open'      // Open-ended questions
  | 'question_closed'    // Closed questions (yes/no, specific info)

  // Reflections
  | 'reflection_simple'  // Repeats/rephrases without adding meaning
  | 'reflection_complex' // Adds meaning, feeling, or emphasis

  // MI-Adherent Behaviors (good)
  | 'affirm'             // Genuine compliment or acknowledgment
  | 'seek_collaboration' // Actively sharing power
  | 'emphasize_autonomy' // Supporting client's right to choose
  | 'support'            // Compassionate understanding

  // MI-Non-Adherent Behaviors (avoid)
  | 'persuade'           // Arguing for change without permission
  | 'persuade_with_permission' // Suggesting with permission
  | 'confront'           // Directly disagreeing or criticizing
  | 'direct'             // Giving orders or commands

  // Neutral
  | 'give_information'   // Providing information without opinion
  | 'structure';         // Procedural statements

/**
 * OARS Techniques (core MI skills)
 */
export type OARSTechnique =
  | 'open_question'      // O - Open-ended questions
  | 'affirmation'        // A - Affirmations
  | 'reflection'         // R - Reflective listening
  | 'summary';           // S - Summaries

/**
 * Reflection types (detailed classification)
 */
export type ReflectionType =
  // Simple reflections (add little/no meaning)
  | 'repeat'           // Echo exact words
  | 'rephrase'         // Slight rephrasing
  | 'paraphrase'       // Restate in own words

  // Complex reflections (add significant meaning)
  | 'feeling'          // Reflect emotional content
  | 'meaning'          // Reflect deeper meaning/values
  | 'amplified'        // Exaggerate slightly (for ambivalence)
  | 'double_sided'     // Reflect both sides of ambivalence
  | 'reframe'          // Offer new perspective
  | 'metaphor'         // Use analogy or metaphor
  | 'continuing'       // Extend/complete the thought
  | 'summary_reflection'; // Mini-summary as reflection

/**
 * Summary types
 */
export type SummaryType =
  | 'collecting'       // Gather several CT utterances
  | 'linking'          // Connect current to past
  | 'transitional';    // Signal moving to next phase

// ============================================================
// THERAPIST RESPONSE TYPES
// ============================================================

/**
 * Structured MI response
 */
export interface MIResponse {
  /** Unique identifier */
  readonly id: string;

  /** Response text */
  readonly text: string;

  /** Russian version if different */
  readonly textRu?: string;

  /** Primary MITI behavior code */
  readonly primaryBehavior: MITIBehaviorCode;

  /** Secondary behaviors if applicable */
  readonly secondaryBehaviors?: MITIBehaviorCode[];

  /** OARS technique if applicable */
  readonly oarsTechnique?: OARSTechnique;

  /** Reflection type if reflection */
  readonly reflectionType?: ReflectionType;

  /** Summary type if summary */
  readonly summaryType?: SummaryType;

  /** Target: which CT subtype this aims to evoke */
  readonly targetChangeTalk?: ChangeTaskSubtype;

  /** Strategic intent */
  readonly strategicIntent: MIStrategy;

  /** Expected impact on CT/ST balance */
  readonly expectedImpact: 'increase_ct' | 'decrease_st' | 'explore' | 'neutral';

  /** MI-spirit alignment score (0-1) */
  readonly spiritAlignment: number;

  /** Timestamp */
  readonly timestamp: Date;
}

/**
 * Response generation context
 */
export interface MIResponseContext {
  /** Current motivational state */
  readonly motivationalState: IMotivationalState;

  /** Last client utterance */
  readonly lastUtterance: ClientUtterance;

  /** Conversation history (last N exchanges) */
  readonly recentExchanges: Array<{
    readonly clientText: string;
    readonly therapistResponse: string;
    readonly timestamp: Date;
  }>;

  /** Current therapeutic strategy */
  readonly currentStrategy: MIStrategy;

  /** Session goal */
  readonly sessionGoal?: string;

  /** Target behavior for change */
  readonly targetBehavior: string;

  /** User's values (for discrepancy development) */
  readonly userValues?: string[];

  /** User's expressed goals */
  readonly userGoals?: string[];

  /** Cultural/age context */
  readonly ageGroup: 'child' | 'teen' | 'adult';
  readonly language: 'ru' | 'en';
}

// ============================================================
// MI TECHNIQUE TEMPLATES
// ============================================================

/**
 * Open question template
 */
export interface OpenQuestionTemplate {
  readonly id: string;
  readonly category: 'values' | 'goals' | 'obstacles' | 'resources' | 'importance' | 'confidence' | 'next_steps';
  readonly template: string;
  readonly templateRu: string;
  readonly placeholders: string[];
  readonly targetChangeTalk: ChangeTaskSubtype[];
  readonly appropriateStages: MIStrategy[];
  readonly examples: string[];
  readonly examplesRu: string[];
}

/**
 * Affirmation template
 */
export interface AffirmationTemplate {
  readonly id: string;
  readonly type: 'strength' | 'effort' | 'progress' | 'value' | 'intention';
  readonly template: string;
  readonly templateRu: string;
  readonly placeholders: string[];
  readonly appropriateFor: {
    readonly minChangeTalkRatio?: number;
    readonly stages: MIStrategy[];
    readonly afterDiscord?: boolean;
  };
}

/**
 * Reflection template
 */
export interface ReflectionTemplate {
  readonly id: string;
  readonly type: ReflectionType;
  readonly pattern: string;
  readonly patternRu: string;
  readonly complexity: 'simple' | 'complex';
  readonly target: 'change_talk' | 'sustain_talk' | 'ambivalence' | 'feeling' | 'meaning';
  readonly examples: Array<{
    readonly input: string;
    readonly output: string;
    readonly outputRu: string;
  }>;
}

/**
 * Summary template
 */
export interface SummaryTemplate {
  readonly id: string;
  readonly type: SummaryType;
  readonly structure: string;
  readonly structureRu: string;
  readonly includeSections: Array<'change_talk' | 'sustain_talk' | 'values' | 'goals' | 'strengths' | 'next_steps'>;
  readonly transitionPhrase?: string;
  readonly transitionPhraseRu?: string;
}

// ============================================================
// MI FIDELITY METRICS (MITI 4.2)
// ============================================================

/**
 * MITI 4.2 Global Scores (1-5 scale)
 */
export interface MITIGlobalScores {
  /**
   * Technical Global: Cultivating Change Talk
   * How well therapist recognizes, reinforces, and evokes CT
   */
  readonly cultivatingChangeTalk: number;

  /**
   * Technical Global: Softening Sustain Talk
   * How well therapist avoids reinforcing ST
   */
  readonly softeningSustainTalk: number;

  /**
   * Relational Global: Partnership
   * Power sharing, collaboration, respect for expertise
   */
  readonly partnership: number;

  /**
   * Relational Global: Empathy
   * Understanding client's perspective
   */
  readonly empathy: number;
}

/**
 * MITI 4.2 Behavior Counts (per session/segment)
 */
export interface MITIBehaviorCounts {
  // Questions
  readonly openQuestions: number;
  readonly closedQuestions: number;

  // Reflections
  readonly simpleReflections: number;
  readonly complexReflections: number;

  // MI-Adherent
  readonly affirm: number;
  readonly seekCollaboration: number;
  readonly emphasizeAutonomy: number;

  // MI-Non-Adherent
  readonly persuade: number;
  readonly confront: number;
  readonly direct: number;

  // Neutral
  readonly giveInformation: number;
}

/**
 * MITI 4.2 Summary Scores (derived)
 */
export interface MITISummaryScores {
  /**
   * Reflection to Question Ratio (R:Q)
   * Competent: >= 1:1, Proficient: >= 2:1
   */
  readonly reflectionToQuestionRatio: number;

  /**
   * Percent Complex Reflections (%CR)
   * Competent: >= 40%, Proficient: >= 50%
   */
  readonly percentComplexReflections: number;

  /**
   * Percent Open Questions (%OQ)
   * Competent: >= 50%, Proficient: >= 70%
   */
  readonly percentOpenQuestions: number;

  /**
   * MI-Adherent / MI-Non-Adherent Ratio
   * Higher = better fidelity
   */
  readonly adherentNonAdherentRatio: number;

  /**
   * Overall fidelity assessment
   */
  readonly fidelityLevel: 'below_threshold' | 'competent' | 'proficient';
}

/**
 * Complete MI Fidelity Report
 */
export interface MIFidelityReport {
  readonly sessionId: string;
  readonly timestamp: Date;
  readonly duration: number; // minutes

  readonly globalScores: MITIGlobalScores;
  readonly behaviorCounts: MITIBehaviorCounts;
  readonly summaryScores: MITISummaryScores;

  /** Specific recommendations for improvement */
  readonly recommendations: string[];

  /** Highlights (good moments) */
  readonly highlights: string[];

  /** Areas for growth */
  readonly growthAreas: string[];
}

// ============================================================
// MI ENGINE INTERFACE
// ============================================================

/**
 * Main MI Engine Interface
 */
export interface IMotivationalInterviewingEngine {
  /**
   * Analyze client utterance and classify CT/ST
   */
  analyzeUtterance(text: string): Promise<ClientUtterance>;

  /**
   * Generate MI-consistent response
   */
  generateResponse(context: MIResponseContext): Promise<MIResponse>;

  /**
   * Generate open-ended question to evoke specific CT
   */
  generateOpenQuestion(
    targetChangeTalk: ChangeTaskSubtype,
    context: MIResponseContext
  ): Promise<MIResponse>;

  /**
   * Generate affirmation
   */
  generateAffirmation(context: MIResponseContext): Promise<MIResponse>;

  /**
   * Generate reflection of client statement
   */
  generateReflection(
    utterance: ClientUtterance,
    type: ReflectionType,
    context: MIResponseContext
  ): Promise<MIResponse>;

  /**
   * Generate summary
   */
  generateSummary(
    type: SummaryType,
    context: MIResponseContext
  ): Promise<MIResponse>;

  /**
   * Respond to discord/resistance
   */
  respondToDiscord(
    discordType: DiscordType,
    context: MIResponseContext
  ): Promise<MIResponse>;

  /**
   * Calculate MI fidelity for session
   */
  calculateFidelity(
    sessionResponses: MIResponse[],
    clientUtterances: ClientUtterance[]
  ): MIFidelityReport;

  /**
   * Get strategy recommendation based on state
   */
  recommendStrategy(state: IMotivationalState): MIStrategy;

  /**
   * Determine if ready for action planning
   */
  assessReadinessForAction(state: IMotivationalState): {
    readonly ready: boolean;
    readonly reasons: string[];
    readonly nextSteps: string[];
  };
}

// ============================================================
// RESPONSE GENERATOR INTERFACE
// ============================================================

/**
 * MI Response Generator (AI-powered)
 */
export interface IMIResponseGenerator {
  /**
   * Generate response using templates
   */
  generateFromTemplate(
    template: OpenQuestionTemplate | AffirmationTemplate | ReflectionTemplate | SummaryTemplate,
    context: MIResponseContext
  ): Promise<string>;

  /**
   * Generate response using LLM with MI constraints
   */
  generateWithLLM(
    prompt: string,
    context: MIResponseContext,
    constraints: MIGenerationConstraints
  ): Promise<string>;

  /**
   * Validate response for MI adherence
   */
  validateMIAdherence(
    response: string,
    context: MIResponseContext
  ): {
    readonly isAdherent: boolean;
    readonly score: number;
    readonly issues: string[];
    readonly suggestions: string[];
  };

  /**
   * Reframe non-adherent response
   */
  reframeToMIAdherent(
    response: string,
    context: MIResponseContext
  ): Promise<string>;
}

/**
 * Constraints for LLM generation
 */
export interface MIGenerationConstraints {
  /** Allowed behavior codes */
  readonly allowedBehaviors: MITIBehaviorCode[];

  /** Forbidden behavior codes */
  readonly forbiddenBehaviors: MITIBehaviorCode[];

  /** Maximum response length */
  readonly maxLength: number;

  /** Must include reflection? */
  readonly mustIncludeReflection: boolean;

  /** Avoid MI-inconsistent phrases */
  readonly avoidPhrases: string[];

  /** Target CT subtype to evoke */
  readonly targetChangeTalk?: ChangeTaskSubtype;

  /** Language */
  readonly language: 'ru' | 'en';
}

// ============================================================
// TEMPLATE LIBRARIES
// ============================================================

/**
 * Open question templates for evoking change talk
 */
export const OPEN_QUESTION_TEMPLATES: OpenQuestionTemplate[] = [
  // Desire (D)
  {
    id: 'oq_desire_1',
    category: 'goals',
    template: 'What would you like to be different about {behavior}?',
    templateRu: 'Что бы вы хотели изменить в {behavior}?',
    placeholders: ['behavior'],
    targetChangeTalk: ['desire'],
    appropriateStages: ['explore_ambivalence', 'evoke_change_talk'],
    examples: ['What would you like to be different about your phone usage?'],
    examplesRu: ['Что бы вы хотели изменить в использовании телефона?']
  },
  {
    id: 'oq_desire_2',
    category: 'values',
    template: 'How would you like things to be?',
    templateRu: 'Как бы вам хотелось, чтобы всё было?',
    placeholders: [],
    targetChangeTalk: ['desire'],
    appropriateStages: ['explore_ambivalence', 'evoke_change_talk'],
    examples: ['How would you like things to be?'],
    examplesRu: ['Как бы вам хотелось, чтобы всё было?']
  },

  // Ability (A)
  {
    id: 'oq_ability_1',
    category: 'resources',
    template: 'What strengths do you have that could help with {goal}?',
    templateRu: 'Какие ваши сильные стороны могли бы помочь с {goal}?',
    placeholders: ['goal'],
    targetChangeTalk: ['ability'],
    appropriateStages: ['support_self_efficacy', 'strengthen_commitment'],
    examples: ['What strengths do you have that could help with reducing screen time?'],
    examplesRu: ['Какие ваши сильные стороны могли бы помочь с уменьшением экранного времени?']
  },
  {
    id: 'oq_ability_2',
    category: 'confidence',
    template: 'When have you successfully made a change like this before?',
    templateRu: 'Когда вам раньше удавалось сделать подобное изменение?',
    placeholders: [],
    targetChangeTalk: ['ability'],
    appropriateStages: ['support_self_efficacy'],
    examples: ['When have you successfully made a change like this before?'],
    examplesRu: ['Когда вам раньше удавалось сделать подобное изменение?']
  },

  // Reasons (R)
  {
    id: 'oq_reasons_1',
    category: 'values',
    template: 'What are the most important reasons you would want to {goal}?',
    templateRu: 'Какие самые важные причины, по которым вы хотели бы {goal}?',
    placeholders: ['goal'],
    targetChangeTalk: ['reasons'],
    appropriateStages: ['develop_discrepancy', 'explore_ambivalence'],
    examples: ['What are the most important reasons you would want to spend less time gaming?'],
    examplesRu: ['Какие самые важные причины, по которым вы хотели бы меньше играть?']
  },
  {
    id: 'oq_reasons_2',
    category: 'values',
    template: 'How does {behavior} connect to what matters most to you?',
    templateRu: 'Как {behavior} связано с тем, что для вас важнее всего?',
    placeholders: ['behavior'],
    targetChangeTalk: ['reasons'],
    appropriateStages: ['develop_discrepancy'],
    examples: ['How does your social media use connect to what matters most to you?'],
    examplesRu: ['Как использование соцсетей связано с тем, что для вас важнее всего?']
  },

  // Need (N)
  {
    id: 'oq_need_1',
    category: 'importance',
    template: 'How urgent is it for you to make this change?',
    templateRu: 'Насколько срочно для вас сделать это изменение?',
    placeholders: [],
    targetChangeTalk: ['need'],
    appropriateStages: ['explore_ambivalence', 'strengthen_commitment'],
    examples: ['How urgent is it for you to make this change?'],
    examplesRu: ['Насколько срочно для вас сделать это изменение?']
  },
  {
    id: 'oq_need_2',
    category: 'importance',
    template: 'What would happen if things stayed the same?',
    templateRu: 'Что произойдёт, если всё останется по-прежнему?',
    placeholders: [],
    targetChangeTalk: ['need'],
    appropriateStages: ['develop_discrepancy'],
    examples: ['What would happen if things stayed the same?'],
    examplesRu: ['Что произойдёт, если всё останется по-прежнему?']
  },

  // Commitment (C)
  {
    id: 'oq_commitment_1',
    category: 'next_steps',
    template: 'What are you willing to try?',
    templateRu: 'Что вы готовы попробовать?',
    placeholders: [],
    targetChangeTalk: ['commitment', 'activation'],
    appropriateStages: ['strengthen_commitment', 'action_planning'],
    examples: ['What are you willing to try?'],
    examplesRu: ['Что вы готовы попробовать?']
  },

  // Activation (A)
  {
    id: 'oq_activation_1',
    category: 'next_steps',
    template: 'What would be a good first step?',
    templateRu: 'Какой был бы хороший первый шаг?',
    placeholders: [],
    targetChangeTalk: ['activation', 'taking_steps'],
    appropriateStages: ['action_planning'],
    examples: ['What would be a good first step?'],
    examplesRu: ['Какой был бы хороший первый шаг?']
  },

  // Taking Steps (T)
  {
    id: 'oq_taking_steps_1',
    category: 'next_steps',
    template: 'What have you already tried that worked, even a little?',
    templateRu: 'Что вы уже пробовали, что сработало хотя бы немного?',
    placeholders: [],
    targetChangeTalk: ['taking_steps'],
    appropriateStages: ['support_self_efficacy', 'action_planning'],
    examples: ['What have you already tried that worked, even a little?'],
    examplesRu: ['Что вы уже пробовали, что сработало хотя бы немного?']
  }
];

/**
 * Affirmation templates
 */
export const AFFIRMATION_TEMPLATES: AffirmationTemplate[] = [
  {
    id: 'aff_strength_1',
    type: 'strength',
    template: 'You clearly {strength}.',
    templateRu: 'Очевидно, что вы {strength}.',
    placeholders: ['strength'],
    appropriateFor: {
      stages: ['support_self_efficacy', 'strengthen_commitment'],
      afterDiscord: false
    }
  },
  {
    id: 'aff_effort_1',
    type: 'effort',
    template: 'It takes courage to {action}.',
    templateRu: 'Требуется смелость, чтобы {action}.',
    placeholders: ['action'],
    appropriateFor: {
      stages: ['build_rapport', 'support_self_efficacy'],
      afterDiscord: true
    }
  },
  {
    id: 'aff_progress_1',
    type: 'progress',
    template: 'You\'ve made real progress with {progress}.',
    templateRu: 'Вы добились реального прогресса в {progress}.',
    placeholders: ['progress'],
    appropriateFor: {
      minChangeTalkRatio: 0.5,
      stages: ['action_planning', 'relapse_prevention']
    }
  },
  {
    id: 'aff_value_1',
    type: 'value',
    template: 'It\'s clear how much you value {value}.',
    templateRu: 'Видно, как много для вас значит {value}.',
    placeholders: ['value'],
    appropriateFor: {
      stages: ['develop_discrepancy', 'explore_ambivalence']
    }
  },
  {
    id: 'aff_intention_1',
    type: 'intention',
    template: 'Your commitment to {intention} is inspiring.',
    templateRu: 'Ваша приверженность {intention} вдохновляет.',
    placeholders: ['intention'],
    appropriateFor: {
      minChangeTalkRatio: 0.6,
      stages: ['strengthen_commitment', 'action_planning']
    }
  }
];

/**
 * Reflection pattern templates
 */
export const REFLECTION_TEMPLATES: ReflectionTemplate[] = [
  // Simple reflections
  {
    id: 'ref_simple_rephrase',
    type: 'rephrase',
    pattern: 'So you {rephrased_content}.',
    patternRu: 'Итак, вы {rephrased_content}.',
    complexity: 'simple',
    target: 'change_talk',
    examples: [
      {
        input: 'I want to spend more time with my family',
        output: 'So you want to have more quality time with your family.',
        outputRu: 'Итак, вы хотите проводить больше времени с семьёй.'
      }
    ]
  },

  // Complex reflections
  {
    id: 'ref_complex_feeling',
    type: 'feeling',
    pattern: 'It sounds like you\'re feeling {emotion} about {topic}.',
    patternRu: 'Похоже, вы чувствуете {emotion} по поводу {topic}.',
    complexity: 'complex',
    target: 'feeling',
    examples: [
      {
        input: 'I don\'t know what to do anymore',
        output: 'It sounds like you\'re feeling overwhelmed about this situation.',
        outputRu: 'Похоже, вы чувствуете себя подавленным в этой ситуации.'
      }
    ]
  },
  {
    id: 'ref_complex_meaning',
    type: 'meaning',
    pattern: 'What I hear is that {deeper_meaning} is really important to you.',
    patternRu: 'Я слышу, что {deeper_meaning} действительно важно для вас.',
    complexity: 'complex',
    target: 'meaning',
    examples: [
      {
        input: 'I need to be there for my kids',
        output: 'What I hear is that being a present parent is really important to you.',
        outputRu: 'Я слышу, что быть рядом с детьми действительно важно для вас.'
      }
    ]
  },
  {
    id: 'ref_complex_double_sided',
    type: 'double_sided',
    pattern: 'On one hand {pro_change}, and on the other hand {against_change}.',
    patternRu: 'С одной стороны {pro_change}, а с другой стороны {against_change}.',
    complexity: 'complex',
    target: 'ambivalence',
    examples: [
      {
        input: 'I want to change but I also enjoy gaming',
        output: 'On one hand you want to make a change, and on the other hand gaming gives you enjoyment.',
        outputRu: 'С одной стороны вы хотите измениться, а с другой стороны игры приносят удовольствие.'
      }
    ]
  },
  {
    id: 'ref_complex_amplified',
    type: 'amplified',
    pattern: 'So there\'s absolutely no way you could ever {exaggerated}.',
    patternRu: 'То есть совершенно невозможно, чтобы вы когда-либо {exaggerated}.',
    complexity: 'complex',
    target: 'sustain_talk',
    examples: [
      {
        input: 'I can\'t stop using my phone',
        output: 'So there\'s absolutely no way you could ever put your phone down, even for a minute.',
        outputRu: 'То есть совершенно невозможно, чтобы вы когда-либо отложили телефон, даже на минуту.'
      }
    ]
  },
  {
    id: 'ref_complex_reframe',
    type: 'reframe',
    pattern: 'Another way to look at this is {reframed_perspective}.',
    patternRu: 'Другой взгляд на это — {reframed_perspective}.',
    complexity: 'complex',
    target: 'change_talk',
    examples: [
      {
        input: 'I failed at this before',
        output: 'Another way to look at this is that you now have experience about what doesn\'t work.',
        outputRu: 'Другой взгляд на это — теперь у вас есть опыт того, что не работает.'
      }
    ]
  }
];

/**
 * Summary templates
 */
export const SUMMARY_TEMPLATES: SummaryTemplate[] = [
  {
    id: 'sum_collecting',
    type: 'collecting',
    structure: 'Let me see if I\'ve got this right. You\'ve mentioned {change_talk_summary}. {values_connection}',
    structureRu: 'Позвольте уточнить, правильно ли я понял. Вы упоминали {change_talk_summary}. {values_connection}',
    includeSections: ['change_talk', 'values']
  },
  {
    id: 'sum_linking',
    type: 'linking',
    structure: 'Earlier you said {past_statement}. Now you\'re saying {current_statement}. {connection}',
    structureRu: 'Раньше вы говорили {past_statement}. Сейчас вы говорите {current_statement}. {connection}',
    includeSections: ['change_talk', 'goals']
  },
  {
    id: 'sum_transitional',
    type: 'transitional',
    structure: 'So far we\'ve talked about {summary_points}. {transition_to_next}',
    structureRu: 'До сих пор мы говорили о {summary_points}. {transition_to_next}',
    includeSections: ['change_talk', 'strengths', 'next_steps'],
    transitionPhrase: 'Where would you like to go from here?',
    transitionPhraseRu: 'Куда бы вы хотели двигаться дальше?'
  }
];

/**
 * Discord response strategies
 */
export const DISCORD_RESPONSE_STRATEGIES: Record<DiscordType, {
  readonly primaryResponse: MITIBehaviorCode;
  readonly templates: string[];
  readonly templatesRu: string[];
  readonly avoid: string[];
}> = {
  arguing: {
    primaryResponse: 'reflection_complex',
    templates: [
      'You\'re not convinced that this is an issue.',
      'It sounds like you see things differently.'
    ],
    templatesRu: [
      'Вы не убеждены, что это проблема.',
      'Похоже, вы видите это иначе.'
    ],
    avoid: ['arguing back', 'presenting evidence', 'proving point']
  },
  interrupting: {
    primaryResponse: 'emphasize_autonomy',
    templates: [
      'I apologize, please continue.',
      'I want to make sure I hear what you\'re saying.'
    ],
    templatesRu: [
      'Извините, пожалуйста, продолжайте.',
      'Я хочу убедиться, что слышу, что вы говорите.'
    ],
    avoid: ['talking over', 'continuing anyway']
  },
  negating: {
    primaryResponse: 'reflection_simple',
    templates: [
      'You don\'t agree with that.',
      'That doesn\'t fit with your experience.'
    ],
    templatesRu: [
      'Вы с этим не согласны.',
      'Это не соответствует вашему опыту.'
    ],
    avoid: ['insisting', 'repeating same point']
  },
  ignoring: {
    primaryResponse: 'seek_collaboration',
    templates: [
      'What would be more helpful to talk about?',
      'I sense this isn\'t quite what you need right now.'
    ],
    templatesRu: [
      'О чём было бы полезнее поговорить?',
      'Чувствую, сейчас вам нужно что-то другое.'
    ],
    avoid: ['forcing topic', 'continuing same direction']
  },
  defending: {
    primaryResponse: 'affirm',
    templates: [
      'You had your reasons for doing what you did.',
      'You were dealing with a difficult situation.'
    ],
    templatesRu: [
      'У вас были причины поступить так, как вы поступили.',
      'Вы справлялись с трудной ситуацией.'
    ],
    avoid: ['challenging', 'questioning motives']
  },
  squaring_off: {
    primaryResponse: 'emphasize_autonomy',
    templates: [
      'You\'re the expert on your own life.',
      'Only you can decide what\'s right for you.'
    ],
    templatesRu: [
      'Вы эксперт в своей собственной жизни.',
      'Только вы можете решить, что для вас правильно.'
    ],
    avoid: ['competing', 'asserting authority']
  }
};

// ============================================================
// MITI 4.2 THRESHOLDS
// ============================================================

/**
 * MITI 4.2 competency thresholds
 */
export const MITI_THRESHOLDS = {
  // Global scores (1-5 scale)
  global: {
    belowThreshold: { cultivatingChangeTalk: 2.5, softeningSustainTalk: 2.5, partnership: 3.0, empathy: 3.0 },
    competent: { cultivatingChangeTalk: 3.0, softeningSustainTalk: 3.0, partnership: 3.5, empathy: 3.5 },
    proficient: { cultivatingChangeTalk: 4.0, softeningSustainTalk: 4.0, partnership: 4.0, empathy: 4.0 }
  },

  // Summary scores
  summary: {
    competent: {
      reflectionToQuestionRatio: 1.0,
      percentComplexReflections: 40,
      percentOpenQuestions: 50
    },
    proficient: {
      reflectionToQuestionRatio: 2.0,
      percentComplexReflections: 50,
      percentOpenQuestions: 70
    }
  }
} as const;
