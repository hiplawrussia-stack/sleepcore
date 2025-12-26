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

// ============================================================
// MCQ-30 METACOGNITIVE BELIEFS (Wells & Cartwright-Hatton, 2004)
// ============================================================

/**
 * MCQ-30 Five Factor Structure
 * Each subscale: 6 items, score range 6-24
 * Total score range: 30-120 (higher = more dysfunctional)
 */
export interface MCQ30Subscales {
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
export interface MCQ30Subscale {
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
 * MCQ-30 Item definitions (for digital assessment)
 */
export interface MCQ30Item {
  readonly id: number;
  readonly subscale: keyof Omit<MCQ30Subscales, 'totalScore' | 'assessedAt' | 'source'>;
  readonly textEn: string;
  readonly textRu: string;
  readonly reversed: boolean;
}

// ============================================================
// COGNITIVE ATTENTIONAL SYNDROME (CAS)
// ============================================================

/**
 * CAS Components (Wells, 2009)
 * The toxic thinking style at the heart of emotional disorders
 */
export interface CognitiveAttentionalSyndrome {
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
export interface CASWorryRumination {
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
export type WorryRuminationTheme =
  | 'health'           // Health anxiety
  | 'relationships'    // Interpersonal concerns
  | 'performance'      // Work/school performance
  | 'finances'         // Money worries
  | 'safety'           // Personal/family safety
  | 'social_evaluation' // What others think
  | 'future_uncertainty' // General future anxiety
  | 'past_mistakes'    // Regret about past
  | 'digital_usage'    // Screen time/addiction
  | 'self_worth'       // Self-esteem issues
  | 'control'          // Loss of control
  | 'other';

/**
 * Threat Monitoring Assessment
 */
export interface CASThreatMonitoring {
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
export type ThreatDomain =
  | 'bodily_sensations'  // Physical symptoms
  | 'thoughts'           // Mental events
  | 'emotions'           // Emotional states
  | 'social_cues'        // Others' reactions
  | 'environment'        // External dangers
  | 'performance'        // Own behavior/output
  | 'digital_notifications'; // Phone/app alerts

/**
 * Maladaptive Coping Strategies
 */
export interface CASMaladaptiveCoping {
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
export interface MaladaptiveStrategy {
  readonly type: MaladaptiveStrategyType;
  readonly frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
  readonly effectiveness: number; // Perceived effectiveness 0-1
  readonly actualEffect: 'maintaining' | 'worsening' | 'neutral';
  readonly description?: string;
}

export type MaladaptiveStrategyType =
  | 'thought_suppression'
  | 'distraction'
  | 'avoidance'
  | 'reassurance_seeking'
  | 'checking'
  | 'safety_behavior'
  | 'substance_use'
  | 'excessive_planning'
  | 'rumination_as_coping'
  | 'worry_as_preparation'
  | 'digital_escape'
  | 'social_withdrawal'
  | 'overworking'
  | 'perfectionism';

// ============================================================
// METACOGNITIVE BELIEFS (Beyond MCQ-30)
// ============================================================

/**
 * Detailed Metacognitive Beliefs Assessment
 */
export interface MetacognitiveBeliefs {
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
export interface BeliefCluster {
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
export interface SpecificBelief {
  readonly id: string;
  readonly content: string;
  readonly contentRu?: string;
  readonly type: 'positive' | 'negative';
  readonly strength: number; // 0-1
  readonly evidenceFor: string[];
  readonly evidenceAgainst: string[];
  readonly challengedAt?: Date;
  readonly responseToChallenge?: string;
}

// ============================================================
// MAIN METACOGNITIVE STATE INTERFACE
// ============================================================

/**
 * Complete Metacognitive State
 * Extends basic Metacognition from ICognitiveState
 */
export interface IMetacognitiveState {
  /** Unique identifier */
  readonly id: string;

  /** User identifier */
  readonly userId: string | number;

  // ========== MCQ-30 Assessment ==========

  /**
   * MCQ-30 subscale scores
   */
  readonly mcq30: MCQ30Subscales;

  // ========== CAS Assessment ==========

  /**
   * Cognitive Attentional Syndrome
   */
  readonly cas: CognitiveAttentionalSyndrome;

  // ========== Detailed Beliefs ==========

  /**
   * Detailed metacognitive beliefs
   */
  readonly beliefs: MetacognitiveBeliefs;

  // ========== Attentional Control ==========

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

  // ========== Treatment Targets ==========

  /**
   * Primary treatment targets (prioritized)
   */
  readonly treatmentTargets: TreatmentTarget[];

  /**
   * Recommended interventions
   */
  readonly recommendedInterventions: MCTIntervention[];

  // ========== Meta ==========

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
export interface TreatmentTarget {
  readonly type: TreatmentTargetType;
  readonly priority: 'high' | 'medium' | 'low';
  readonly description: string;
  readonly currentSeverity: number;
  readonly linkedBeliefs: string[];
}

export type TreatmentTargetType =
  | 'positive_worry_beliefs'
  | 'negative_worry_beliefs'
  | 'rumination'
  | 'threat_monitoring'
  | 'thought_suppression'
  | 'attentional_inflexibility'
  | 'reassurance_seeking'
  | 'avoidance'
  | 'low_metacognitive_awareness';

/**
 * MCT Intervention types
 */
export type MCTIntervention =
  | 'attention_training_technique'    // ATT
  | 'detached_mindfulness'            // DM
  | 'worry_postponement'              // Scheduled worry time
  | 'rumination_postponement'         // Scheduled rumination time
  | 'verbal_reattribution'            // Challenge beliefs verbally
  | 'behavioral_experiment'           // Test beliefs behaviorally
  | 'advantages_disadvantages'        // Analyze worry pros/cons
  | 'metacognitive_profiling'         // Understand own patterns
  | 'situational_attention_refocusing'; // SAR

// ============================================================
// MCQ-30 ITEMS (Full Questionnaire)
// ============================================================

/**
 * Complete MCQ-30 Items
 * Based on Wells & Cartwright-Hatton (2004)
 */
export const MCQ30_ITEMS: MCQ30Item[] = [
  // Factor 1: Positive Beliefs about Worry
  { id: 1, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to avoid problems in the future', textRu: 'Беспокойство помогает мне избежать проблем в будущем', reversed: false },
  { id: 7, subscale: 'positiveWorryBeliefs', textEn: 'I need to worry in order to remain organised', textRu: 'Мне нужно беспокоиться, чтобы оставаться организованным', reversed: false },
  { id: 10, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to get things sorted out in my mind', textRu: 'Беспокойство помогает мне разобраться в мыслях', reversed: false },
  { id: 19, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me cope', textRu: 'Беспокойство помогает мне справляться', reversed: false },
  { id: 23, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to solve problems', textRu: 'Беспокойство помогает мне решать проблемы', reversed: false },
  { id: 28, subscale: 'positiveWorryBeliefs', textEn: 'I need to worry in order to work well', textRu: 'Мне нужно беспокоиться, чтобы хорошо работать', reversed: false },

  // Factor 2: Negative Beliefs about Uncontrollability and Danger
  { id: 2, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying is dangerous for me', textRu: 'Моё беспокойство опасно для меня', reversed: false },
  { id: 4, subscale: 'negativeUncontrollabilityDanger', textEn: 'I could make myself sick with worrying', textRu: 'Я могу заболеть от беспокойства', reversed: false },
  { id: 9, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying thoughts persist, no matter how I try to stop them', textRu: 'Мои тревожные мысли сохраняются, как бы я ни пытался их остановить', reversed: false },
  { id: 11, subscale: 'negativeUncontrollabilityDanger', textEn: 'I cannot ignore my worrying thoughts', textRu: 'Я не могу игнорировать свои тревожные мысли', reversed: false },
  { id: 15, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying could make me go mad', textRu: 'Моё беспокойство может свести меня с ума', reversed: false },
  { id: 21, subscale: 'negativeUncontrollabilityDanger', textEn: 'When I start worrying I cannot stop', textRu: 'Когда я начинаю беспокоиться, я не могу остановиться', reversed: false },

  // Factor 3: Cognitive Confidence
  { id: 8, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for words and names', textRu: 'У меня мало уверенности в своей памяти на слова и имена', reversed: false },
  { id: 14, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for places', textRu: 'У меня мало уверенности в своей памяти на места', reversed: false },
  { id: 17, subscale: 'cognitiveConfidence', textEn: 'I have a poor memory', textRu: 'У меня плохая память', reversed: false },
  { id: 24, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for actions', textRu: 'У меня мало уверенности в своей памяти на действия', reversed: false },
  { id: 26, subscale: 'cognitiveConfidence', textEn: 'I do not trust my memory', textRu: 'Я не доверяю своей памяти', reversed: false },
  { id: 29, subscale: 'cognitiveConfidence', textEn: 'My memory can mislead me at times', textRu: 'Моя память иногда может вводить меня в заблуждение', reversed: false },

  // Factor 4: Need to Control Thoughts
  { id: 6, subscale: 'needToControlThoughts', textEn: 'Not being able to control my thoughts is a sign of weakness', textRu: 'Неспособность контролировать мысли — признак слабости', reversed: false },
  { id: 13, subscale: 'needToControlThoughts', textEn: 'I should be in control of my thoughts all of the time', textRu: 'Я должен всегда контролировать свои мысли', reversed: false },
  { id: 20, subscale: 'needToControlThoughts', textEn: 'It is bad to think certain thoughts', textRu: 'Плохо думать определённые мысли', reversed: false },
  { id: 22, subscale: 'needToControlThoughts', textEn: 'I will be punished for not controlling certain thoughts', textRu: 'Меня накажут за то, что я не контролирую определённые мысли', reversed: false },
  { id: 25, subscale: 'needToControlThoughts', textEn: 'It is bad to have certain thoughts', textRu: 'Плохо иметь определённые мысли', reversed: false },
  { id: 27, subscale: 'needToControlThoughts', textEn: 'If I could not control my thoughts I would not be able to function', textRu: 'Если бы я не мог контролировать свои мысли, я бы не смог функционировать', reversed: false },

  // Factor 5: Cognitive Self-Consciousness
  { id: 3, subscale: 'cognitiveSelfConsciousness', textEn: 'I think a lot about my thoughts', textRu: 'Я много думаю о своих мыслях', reversed: false },
  { id: 5, subscale: 'cognitiveSelfConsciousness', textEn: 'I am aware of the way my mind works when I am thinking through a problem', textRu: 'Я осознаю, как работает мой ум, когда я обдумываю проблему', reversed: false },
  { id: 12, subscale: 'cognitiveSelfConsciousness', textEn: 'I monitor my thoughts', textRu: 'Я слежу за своими мыслями', reversed: false },
  { id: 16, subscale: 'cognitiveSelfConsciousness', textEn: 'I pay close attention to the way my mind works', textRu: 'Я внимательно слежу за тем, как работает мой ум', reversed: false },
  { id: 18, subscale: 'cognitiveSelfConsciousness', textEn: 'I constantly examine my thoughts', textRu: 'Я постоянно анализирую свои мысли', reversed: false },
  { id: 30, subscale: 'cognitiveSelfConsciousness', textEn: 'I am constantly aware of my thinking', textRu: 'Я постоянно осознаю своё мышление', reversed: false }
];

// ============================================================
// CAS DETECTION PATTERNS
// ============================================================

/**
 * Patterns for detecting worry in text
 */
export const WORRY_PATTERNS = {
  keywords: {
    en: ['what if', 'might', 'could happen', 'worried about', "can't stop thinking", 'keep thinking about', 'anxious about', 'concerned that', 'afraid that', 'fear that'],
    ru: ['а что если', 'может случиться', 'беспокоюсь о', 'не могу перестать думать', 'постоянно думаю о', 'тревожусь', 'боюсь что', 'переживаю']
  },
  futureOrientation: {
    en: ['will', 'going to', 'tomorrow', 'next', 'future', 'later', 'soon'],
    ru: ['будет', 'завтра', 'потом', 'скоро', 'в будущем', 'когда-нибудь']
  }
};

/**
 * Patterns for detecting rumination in text
 */
export const RUMINATION_PATTERNS = {
  keywords: {
    en: ['should have', 'could have', 'why did I', 'why didn\'t I', 'if only', 'keep going over', 'can\'t let go', 'keep replaying', 'regret'],
    ru: ['надо было', 'зачем я', 'почему я не', 'если бы только', 'не могу забыть', 'всё время вспоминаю', 'жалею', 'прокручиваю в голове']
  },
  pastOrientation: {
    en: ['yesterday', 'last', 'before', 'used to', 'back when', 'remember when'],
    ru: ['вчера', 'раньше', 'когда-то', 'помню как', 'тогда']
  }
};

/**
 * Patterns for detecting positive worry beliefs
 */
export const POSITIVE_WORRY_BELIEF_PATTERNS = {
  en: ['worry helps', 'worrying keeps me', 'need to worry', 'have to think about', 'better to be prepared', 'being careful', 'can\'t relax until'],
  ru: ['беспокойство помогает', 'нужно беспокоиться', 'лучше подготовиться', 'не могу расслабиться пока']
};

/**
 * Patterns for detecting uncontrollability beliefs
 */
export const UNCONTROLLABILITY_PATTERNS = {
  en: ['can\'t stop', 'can\'t control', 'takes over', 'overwhelming', 'won\'t go away', 'stuck in my head', 'going crazy', 'losing my mind'],
  ru: ['не могу остановить', 'не могу контролировать', 'захлёстывает', 'не уходит', 'застряло в голове', 'схожу с ума']
};

// ============================================================
// CLINICAL THRESHOLDS
// ============================================================

/**
 * MCQ-30 Clinical Cutoffs
 * Based on normative data
 */
export const MCQ30_CLINICAL_CUTOFFS = {
  positiveWorryBeliefs: 12,        // Above = clinically significant
  negativeUncontrollabilityDanger: 14,
  cognitiveConfidence: 13,
  needToControlThoughts: 12,
  cognitiveSelfConsciousness: 16,
  totalScore: 65                   // Above = elevated metacognitive dysfunction
} as const;

/**
 * CAS severity thresholds
 */
export const CAS_SEVERITY_THRESHOLDS = {
  mild: 0.3,
  moderate: 0.5,
  severe: 0.7,
  critical: 0.85
} as const;
