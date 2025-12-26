/**
 * METACOGNITIVE THERAPY TECHNIQUES INTERFACE
 * ==========================================
 * Wells' MCT Interventions for Digital Implementation
 *
 * Scientific Foundation:
 * - Attention Training Technique (ATT) - Wells, 1990
 * - Detached Mindfulness (DM) - Wells, 2005
 * - Worry Postponement - Wells, 2009
 * - Situational Attention Refocusing (SAR) - Wells
 * - Digital ATT Effectiveness: d = 0.67 abbreviated version (2024 RCT)
 *
 * Key Innovation:
 * - Automated ATT delivery via chat/audio
 * - Real-time CAS interruption
 * - Digital worry postponement scheduling
 * - DM guidance adapted for text-based delivery
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */

import type {
  IMetacognitiveState,
  MCTIntervention,
  WorryRuminationTheme,
  SpecificBelief
} from './IMetacognitiveState';

// ============================================================
// ATTENTION TRAINING TECHNIQUE (ATT)
// ============================================================

/**
 * ATT Session Configuration
 * Based on Wells' protocol
 */
export interface ATTSession {
  /** Session identifier */
  readonly id: string;

  /** User identifier */
  readonly userId: string | number;

  /** Session type */
  readonly type: ATTSessionType;

  /** Duration in minutes */
  readonly durationMinutes: number;

  /** Session phases */
  readonly phases: ATTPhase[];

  /** Audio tracks used */
  readonly audioTracks?: ATTAudioTrack[];

  /** Text-based instructions */
  readonly instructions: ATTInstruction[];

  /** Session state */
  readonly state: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned';

  /** Progress within session (0-1) */
  readonly progress: number;

  /** Start time */
  readonly startedAt?: Date;

  /** End time */
  readonly completedAt?: Date;

  /** User feedback */
  readonly feedback?: ATTSessionFeedback;
}

/**
 * ATT Session Types
 */
export type ATTSessionType =
  | 'full'         // Complete 12-minute session
  | 'abbreviated'  // 6-minute abbreviated version (more adherence per 2024 research)
  | 'practice'     // Brief practice session
  | 'introduction'; // First-time introduction

/**
 * ATT Phase
 * Based on Wells' three-component structure
 */
export interface ATTPhase {
  readonly type: ATTPhaseType;
  readonly durationSeconds: number;
  readonly instructions: string;
  readonly instructionsRu: string;
  readonly sounds?: string[];
  readonly currentSound?: number;
}

export type ATTPhaseType =
  | 'psychoeducation'        // Explain rationale
  | 'selective_attention'    // Focus on single sound
  | 'attention_switching'    // Rapid switching between sounds
  | 'divided_attention'      // Attend to multiple sounds simultaneously
  | 'self_focus_redirect'    // Redirect from internal to external
  | 'closing';               // Transition back

/**
 * ATT Audio Track
 */
export interface ATTAudioTrack {
  readonly id: string;
  readonly name: string;
  readonly nameRu: string;
  readonly location: 'left' | 'right' | 'center' | 'behind' | 'above';
  readonly type: 'voice' | 'ambient' | 'tonal' | 'nature';
  readonly url?: string;
  readonly description: string;
}

/**
 * ATT Text Instruction
 * For text-based delivery without audio
 */
export interface ATTInstruction {
  readonly phase: ATTPhaseType;
  readonly order: number;
  readonly textEn: string;
  readonly textRu: string;
  readonly durationSeconds: number;
  readonly visualCue?: string;
  readonly pause?: boolean;
}

/**
 * ATT Session Feedback
 */
export interface ATTSessionFeedback {
  /** Difficulty rating (1-10) */
  readonly difficulty: number;

  /** Focus quality (1-10) */
  readonly focusQuality: number;

  /** Mind wandering frequency (1-10) */
  readonly mindWandering: number;

  /** Relaxation achieved (1-10) */
  readonly relaxation: number;

  /** Would practice again */
  readonly wouldRepeat: boolean;

  /** Free-form comments */
  readonly comments?: string;

  /** Submitted at */
  readonly submittedAt: Date;
}

// ============================================================
// DETACHED MINDFULNESS (DM)
// ============================================================

/**
 * Detached Mindfulness Exercise
 */
export interface DetachedMindfulnessExercise {
  /** Exercise identifier */
  readonly id: string;

  /** Exercise type */
  readonly type: DMExerciseType;

  /** Target: what to apply DM to */
  readonly target: DMTarget;

  /** Exercise instructions */
  readonly instructions: DMInstruction[];

  /** Metaphors to use */
  readonly metaphors: DMMetaphor[];

  /** Duration estimate (minutes) */
  readonly estimatedDuration: number;

  /** Prerequisites */
  readonly prerequisites: string[];

  /** Contraindications */
  readonly contraindications: string[];
}

/**
 * DM Exercise Types
 */
export type DMExerciseType =
  | 'tiger_task'            // Classic Wells tiger visualization
  | 'clouds_passing'        // Thoughts as clouds
  | 'leaves_on_stream'      // Thoughts floating by
  | 'train_station'         // Thoughts as trains
  | 'free_association'      // Let thoughts occur without control
  | 'thought_observation'   // Simply notice thoughts
  | 'spatial_distancing';   // View thoughts from distance

/**
 * DM Target
 */
export interface DMTarget {
  readonly type: 'worry' | 'rumination' | 'intrusive_thought' | 'negative_belief' | 'emotion' | 'sensation';
  readonly content?: string;
  readonly intensity: number;
}

/**
 * DM Instruction
 */
export interface DMInstruction {
  readonly order: number;
  readonly textEn: string;
  readonly textRu: string;
  readonly duration: number; // seconds
  readonly pause: boolean;
}

/**
 * DM Metaphor
 */
export interface DMMetaphor {
  readonly id: string;
  readonly nameEn: string;
  readonly nameRu: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly scriptEn: string;
  readonly scriptRu: string;
  readonly suitableFor: DMTarget['type'][];
}

// ============================================================
// WORRY POSTPONEMENT
// ============================================================

/**
 * Worry Postponement Protocol
 */
export interface WorryPostponementProtocol {
  /** User identifier */
  readonly userId: string | number;

  /** Scheduled worry time */
  readonly scheduledWorryTime: ScheduledWorryTime;

  /** Current postponed worries */
  readonly postponedWorries: PostponedWorry[];

  /** Worry time sessions completed */
  readonly sessionsCompleted: number;

  /** Protocol start date */
  readonly startedAt: Date;

  /** Protocol active */
  readonly isActive: boolean;

  /** Effectiveness metrics */
  readonly effectiveness: WorryPostponementEffectiveness;
}

/**
 * Scheduled Worry Time
 */
export interface ScheduledWorryTime {
  /** Time of day (24h format, e.g., "18:00") */
  readonly time: string;

  /** Duration in minutes (typically 15-30) */
  readonly durationMinutes: number;

  /** Days of week (0=Sunday, 6=Saturday) */
  readonly daysOfWeek: number[];

  /** Location (optional, for consistency) */
  readonly location?: string;

  /** Reminder enabled */
  readonly reminderEnabled: boolean;

  /** Reminder minutes before */
  readonly reminderMinutesBefore: number;
}

/**
 * Postponed Worry
 */
export interface PostponedWorry {
  readonly id: string;
  readonly content: string;
  readonly theme: WorryRuminationTheme;
  readonly capturedAt: Date;
  readonly urgencyPerceived: number; // 0-1
  readonly processedDuringWorryTime: boolean;
  readonly processedAt?: Date;
  readonly outcome?: WorryOutcome;
}

/**
 * Worry Processing Outcome
 */
export interface WorryOutcome {
  readonly stillRelevant: boolean;
  readonly actionTaken?: string;
  readonly resolved: boolean;
  readonly lessIntense: boolean;
  readonly insight?: string;
}

/**
 * Worry Postponement Effectiveness
 */
export interface WorryPostponementEffectiveness {
  /** Reduction in spontaneous worry (0-1) */
  readonly worryReduction: number;

  /** Success rate of postponing (0-1) */
  readonly postponementSuccessRate: number;

  /** Average time to worry dissipation */
  readonly avgDissipationMinutes: number;

  /** Worries that resolved before worry time */
  readonly resolvedBeforeWorryTime: number;

  /** Total worries processed */
  readonly totalWorriesProcessed: number;
}

// ============================================================
// VERBAL REATTRIBUTION
// ============================================================

/**
 * Verbal Reattribution for Metacognitive Beliefs
 */
export interface VerbalReattribution {
  /** Target belief */
  readonly targetBelief: SpecificBelief;

  /** Socratic questions to use */
  readonly socraticQuestions: SocraticQuestion[];

  /** Evidence gathering prompts */
  readonly evidencePrompts: EvidencePrompt[];

  /** Alternative perspectives */
  readonly alternatives: AlternativePerspective[];

  /** Behavioral experiment suggestions */
  readonly experiments: BehavioralExperiment[];
}

/**
 * Socratic Question for MCT
 */
export interface SocraticQuestion {
  readonly id: string;
  readonly questionEn: string;
  readonly questionRu: string;
  readonly targetBeliefType: 'positive_worry' | 'uncontrollability' | 'danger' | 'need_to_control';
  readonly purpose: string;
  readonly followUpIfYes?: string;
  readonly followUpIfNo?: string;
}

/**
 * Evidence Gathering Prompt
 */
export interface EvidencePrompt {
  readonly id: string;
  readonly promptEn: string;
  readonly promptRu: string;
  readonly forOrAgainst: 'for' | 'against';
  readonly targetBelief: string;
}

/**
 * Alternative Perspective
 */
export interface AlternativePerspective {
  readonly id: string;
  readonly originalBelief: string;
  readonly alternativeEn: string;
  readonly alternativeRu: string;
  readonly evidenceSupporting: string[];
}

/**
 * Behavioral Experiment for MCT
 */
export interface BehavioralExperiment {
  readonly id: string;
  readonly nameEn: string;
  readonly nameRu: string;
  readonly beliefTested: string;
  readonly prediction: string;
  readonly procedure: string[];
  readonly procedureRu: string[];
  readonly possibleOutcomes: ExperimentOutcome[];
  readonly safetyConsiderations: string[];
}

/**
 * Experiment Outcome
 */
export interface ExperimentOutcome {
  readonly outcome: string;
  readonly interpretation: string;
  readonly implicationForBelief: 'supports' | 'contradicts' | 'neutral';
}

// ============================================================
// MCT ENGINE INTERFACE
// ============================================================

/**
 * Main MCT Engine Interface
 */
export interface IMetacognitiveTherapyEngine {
  // ========== Assessment ==========

  /**
   * Detect CAS activity in text
   */
  detectCAS(text: string, context?: MCTContext): Promise<CASDetectionResult>;

  /**
   * Administer MCQ-30 item
   */
  scoreMCQ30Item(itemId: number, response: number): MCQ30ItemScore;

  /**
   * Calculate full MCQ-30 from responses
   */
  calculateMCQ30(responses: Map<number, number>): MCQ30Result;

  /**
   * Update metacognitive state
   */
  updateState(
    currentState: IMetacognitiveState,
    newData: Partial<IMetacognitiveState>
  ): IMetacognitiveState;

  // ========== Interventions ==========

  /**
   * Create ATT session
   */
  createATTSession(
    userId: string | number,
    type: ATTSessionType,
    preferences?: ATTPreferences
  ): ATTSession;

  /**
   * Get next ATT instruction
   */
  getNextATTInstruction(session: ATTSession): ATTInstruction | null;

  /**
   * Complete ATT session
   */
  completeATTSession(
    session: ATTSession,
    feedback: ATTSessionFeedback
  ): ATTSession;

  /**
   * Create DM exercise
   */
  createDMExercise(
    target: DMTarget,
    preferences?: DMPreferences
  ): DetachedMindfulnessExercise;

  /**
   * Setup worry postponement
   */
  setupWorryPostponement(
    userId: string | number,
    schedule: ScheduledWorryTime
  ): WorryPostponementProtocol;

  /**
   * Record postponed worry
   */
  recordPostponedWorry(
    protocol: WorryPostponementProtocol,
    worry: Omit<PostponedWorry, 'id' | 'capturedAt' | 'processedDuringWorryTime'>
  ): WorryPostponementProtocol;

  /**
   * Process worry during worry time
   */
  processWorryDuringWorryTime(
    protocol: WorryPostponementProtocol,
    worryId: string,
    outcome: WorryOutcome
  ): WorryPostponementProtocol;

  // ========== Belief Work ==========

  /**
   * Generate Socratic questions for belief
   */
  generateSocraticQuestions(
    belief: SpecificBelief,
    context: MCTContext
  ): SocraticQuestion[];

  /**
   * Create verbal reattribution plan
   */
  createReattributionPlan(
    belief: SpecificBelief,
    state: IMetacognitiveState
  ): VerbalReattribution;

  /**
   * Suggest behavioral experiment
   */
  suggestBehavioralExperiment(
    belief: SpecificBelief,
    context: MCTContext
  ): BehavioralExperiment[];

  // ========== Strategy ==========

  /**
   * Recommend intervention based on state
   */
  recommendIntervention(state: IMetacognitiveState): MCTIntervention;

  /**
   * Get intervention priority
   */
  getInterventionPriority(state: IMetacognitiveState): MCTIntervention[];

  /**
   * Generate response to CAS
   */
  generateCASResponse(
    detection: CASDetectionResult,
    context: MCTContext
  ): MCTResponse;
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

/**
 * MCT Context
 */
export interface MCTContext {
  readonly state: IMetacognitiveState;
  readonly recentMessages: Array<{ text: string; isUser: boolean; timestamp: Date }>;
  readonly currentTopic?: string;
  readonly sessionGoal?: string;
  readonly language: 'ru' | 'en';
  readonly ageGroup: 'child' | 'teen' | 'adult';
}

/**
 * CAS Detection Result
 */
export interface CASDetectionResult {
  readonly detected: boolean;
  readonly type: 'worry' | 'rumination' | 'threat_monitoring' | 'mixed' | 'none';
  readonly confidence: number;
  readonly intensity: number;
  readonly themes: WorryRuminationTheme[];
  readonly triggerText: string;
  readonly metacognitiveBeliefActivated?: string;
  readonly recommendedIntervention: MCTIntervention;
}

/**
 * MCQ-30 Item Score
 */
export interface MCQ30ItemScore {
  readonly itemId: number;
  readonly rawScore: number;
  readonly subscale: string;
}

/**
 * MCQ-30 Full Result
 */
export interface MCQ30Result {
  readonly subscales: {
    readonly positiveWorryBeliefs: number;
    readonly negativeUncontrollabilityDanger: number;
    readonly cognitiveConfidence: number;
    readonly needToControlThoughts: number;
    readonly cognitiveSelfConsciousness: number;
  };
  readonly totalScore: number;
  readonly clinicalFlags: string[];
  readonly primaryConcern?: string;
}

/**
 * ATT Preferences
 */
export interface ATTPreferences {
  readonly preferredDuration: 'short' | 'standard' | 'extended';
  readonly audioEnabled: boolean;
  readonly visualCuesEnabled: boolean;
  readonly reminderFrequency: 'daily' | 'every_other_day' | 'weekly';
}

/**
 * DM Preferences
 */
export interface DMPreferences {
  readonly preferredMetaphor: DMExerciseType;
  readonly visualizationAbility: 'low' | 'medium' | 'high';
  readonly preferredLength: 'brief' | 'standard' | 'extended';
}

/**
 * MCT Response
 */
export interface MCTResponse {
  readonly type: 'psychoeducation' | 'intervention_offer' | 'technique_guidance' | 'belief_challenge' | 'encouragement';
  readonly textEn: string;
  readonly textRu: string;
  readonly intervention?: MCTIntervention;
  readonly followUpQuestions?: string[];
}

// ============================================================
// ATT INSTRUCTIONS LIBRARY
// ============================================================

/**
 * Standard ATT Instructions (Abbreviated Version)
 * Based on 2024 research showing better adherence with shorter version
 */
export const ATT_ABBREVIATED_INSTRUCTIONS: ATTInstruction[] = [
  // Psychoeducation (30 seconds)
  {
    phase: 'psychoeducation',
    order: 1,
    textEn: "We're going to practice a technique called Attention Training. This will help you gain more control over where you focus your attention, rather than being pulled into worry or rumination.",
    textRu: 'Сейчас мы будем практиковать технику тренировки внимания. Это поможет вам лучше контролировать, на чём вы фокусируетесь, вместо того чтобы погружаться в беспокойство или размышления.',
    durationSeconds: 30,
    pause: false
  },

  // Selective Attention (90 seconds)
  {
    phase: 'selective_attention',
    order: 2,
    textEn: 'First, focus all your attention on just one sound around you. It could be traffic, a clock, the hum of a device. Focus only on that sound for the next 90 seconds.',
    textRu: 'Сначала сосредоточьте всё внимание на одном звуке вокруг вас. Это может быть шум улицы, часы, гул устройства. Сосредоточьтесь только на этом звуке следующие 90 секунд.',
    durationSeconds: 90,
    pause: true
  },

  // Attention Switching (120 seconds)
  {
    phase: 'attention_switching',
    order: 3,
    textEn: 'Now practice switching your attention between different sounds. When I say "switch," move your attention to a different sound. Switch... Switch... Switch...',
    textRu: 'Теперь переключайте внимание между разными звуками. Когда я говорю "переключи", переведите внимание на другой звук. Переключи... Переключи... Переключи...',
    durationSeconds: 120,
    pause: true
  },

  // Divided Attention (90 seconds)
  {
    phase: 'divided_attention',
    order: 4,
    textEn: 'Now try to expand your attention to hear multiple sounds at once. Broaden your awareness to take in all the sounds around you simultaneously.',
    textRu: 'Теперь попробуйте расширить внимание, чтобы слышать несколько звуков одновременно. Расширьте осознание, чтобы воспринимать все звуки вокруг вас сразу.',
    durationSeconds: 90,
    pause: true
  },

  // Self-focus Redirect (30 seconds)
  {
    phase: 'self_focus_redirect',
    order: 5,
    textEn: 'Notice how you can direct your attention outward. Whenever you notice your mind wandering to worries or yourself, gently redirect it to external sounds.',
    textRu: 'Заметьте, как вы можете направлять внимание наружу. Когда заметите, что ум уходит в беспокойства или к себе, мягко перенаправьте его на внешние звуки.',
    durationSeconds: 30,
    pause: false
  },

  // Closing (30 seconds)
  {
    phase: 'closing',
    order: 6,
    textEn: "Well done. Practice this daily for best results. Remember: you have more control over your attention than you might think. This skill will strengthen with practice.",
    textRu: 'Отлично. Практикуйте это ежедневно для лучших результатов. Помните: у вас больше контроля над вниманием, чем вам кажется. Этот навык укрепляется с практикой.',
    durationSeconds: 30,
    pause: false
  }
];

// ============================================================
// DM METAPHORS LIBRARY
// ============================================================

/**
 * Detached Mindfulness Metaphors
 */
export const DM_METAPHORS: DMMetaphor[] = [
  {
    id: 'tiger_task',
    nameEn: 'The Tiger Task',
    nameRu: 'Задание с тигром',
    descriptionEn: "Classic Wells exercise using visualization to practice thought observation",
    descriptionRu: 'Классическое упражнение Уэллса с визуализацией для практики наблюдения за мыслями',
    scriptEn: 'Close your eyes and form an image of a tiger. Do not attempt to influence or change the image in any way. Just watch. The tiger may move, but don\'t make it move. It may blink, but don\'t make it blink. Simply observe how the tiger has its own behavior, separate from your control. Notice how thoughts are like this tiger - they have their own life, separate from you.',
    scriptRu: 'Закройте глаза и представьте тигра. Не пытайтесь влиять на образ или изменять его. Просто наблюдайте. Тигр может двигаться, но не заставляйте его двигаться. Он может моргнуть, но не заставляйте его моргать. Просто наблюдайте, как тигр ведёт себя сам по себе, отдельно от вашего контроля. Заметьте, что мысли похожи на этого тигра - у них своя жизнь, отдельная от вас.',
    suitableFor: ['worry', 'intrusive_thought', 'negative_belief']
  },
  {
    id: 'clouds_passing',
    nameEn: 'Clouds Passing',
    nameRu: 'Проплывающие облака',
    descriptionEn: 'Visualize thoughts as clouds drifting across the sky',
    descriptionRu: 'Визуализация мыслей как облаков, плывущих по небу',
    scriptEn: 'Imagine yourself lying in a field, looking up at a clear blue sky. Your thoughts appear as clouds. Some are white and fluffy, others dark and heavy. Watch each thought-cloud drift across the sky. You don\'t need to hold onto them or push them away. Just let them pass in their own time. The sky remains - vast and clear - no matter what clouds pass through.',
    scriptRu: 'Представьте, что вы лежите на поле и смотрите на чистое голубое небо. Ваши мысли появляются как облака. Некоторые белые и пушистые, другие тёмные и тяжёлые. Наблюдайте, как каждое облако-мысль плывёт по небу. Вам не нужно держаться за них или отталкивать их. Просто позвольте им пройти в своё время. Небо остаётся - бескрайним и ясным - независимо от того, какие облака проходят.',
    suitableFor: ['worry', 'rumination', 'emotion']
  },
  {
    id: 'leaves_on_stream',
    nameEn: 'Leaves on a Stream',
    nameRu: 'Листья на ручье',
    descriptionEn: 'Place thoughts on leaves and watch them float away',
    descriptionRu: 'Поместите мысли на листья и наблюдайте, как они уплывают',
    scriptEn: 'Picture yourself sitting by a gently flowing stream. Autumn leaves float by on the water. When a thought comes, place it on a leaf and watch it float downstream. Don\'t try to speed up or slow down the leaves. Just place each thought on a leaf and let the stream carry it away. The stream continues to flow, thoughts come and go.',
    scriptRu: 'Представьте, что вы сидите у тихо текущего ручья. Осенние листья плывут по воде. Когда приходит мысль, положите её на лист и наблюдайте, как он уплывает вниз по течению. Не пытайтесь ускорить или замедлить листья. Просто кладите каждую мысль на лист и позвольте ручью унести её. Ручей продолжает течь, мысли приходят и уходят.',
    suitableFor: ['worry', 'rumination', 'negative_belief']
  },
  {
    id: 'train_station',
    nameEn: 'Train Station',
    nameRu: 'Железнодорожная станция',
    descriptionEn: 'Watch thoughts arrive and depart like trains',
    descriptionRu: 'Наблюдайте за мыслями, как за поездами, которые приходят и уходят',
    scriptEn: 'Imagine yourself standing on a train platform. Thoughts are trains arriving at the station. You can observe each train - its color, speed, the noise it makes - without boarding it. Some trains are loud and demanding attention, others quiet. You don\'t have to get on any train. Just stand on the platform and watch them come and go.',
    scriptRu: 'Представьте, что вы стоите на железнодорожной платформе. Мысли - это поезда, прибывающие на станцию. Вы можете наблюдать каждый поезд - его цвет, скорость, шум - не садясь в него. Некоторые поезда громкие и требуют внимания, другие тихие. Вам не нужно садиться ни в один поезд. Просто стойте на платформе и наблюдайте, как они приходят и уходят.',
    suitableFor: ['worry', 'intrusive_thought', 'emotion']
  }
];

// ============================================================
// SOCRATIC QUESTIONS FOR MCT
// ============================================================

/**
 * Socratic Questions for Metacognitive Belief Challenge
 */
export const MCT_SOCRATIC_QUESTIONS: SocraticQuestion[] = [
  // For Positive Worry Beliefs
  {
    id: 'sq_pwb_1',
    questionEn: 'Has worrying ever actually prevented a bad outcome?',
    questionRu: 'Беспокойство когда-нибудь реально предотвращало плохой исход?',
    targetBeliefType: 'positive_worry',
    purpose: 'Challenge the usefulness of worry',
    followUpIfYes: 'How do you know it was the worrying that helped, rather than the actions you took?',
    followUpIfNo: 'So what does the worrying actually do for you?'
  },
  {
    id: 'sq_pwb_2',
    questionEn: 'If you stopped worrying, what is the worst that could happen?',
    questionRu: 'Если бы вы перестали беспокоиться, что самое худшее могло бы случиться?',
    targetBeliefType: 'positive_worry',
    purpose: 'Examine feared consequences of not worrying'
  },
  {
    id: 'sq_pwb_3',
    questionEn: 'Do you know people who worry less but still cope well with problems?',
    questionRu: 'Знаете ли вы людей, которые беспокоятся меньше, но всё равно хорошо справляются с проблемами?',
    targetBeliefType: 'positive_worry',
    purpose: 'Challenge necessity of worry for coping'
  },

  // For Uncontrollability Beliefs
  {
    id: 'sq_unc_1',
    questionEn: 'Have there been times when you were able to stop worrying?',
    questionRu: 'Были ли моменты, когда вам удавалось прекратить беспокоиться?',
    targetBeliefType: 'uncontrollability',
    purpose: 'Find exceptions to uncontrollability belief'
  },
  {
    id: 'sq_unc_2',
    questionEn: 'If a fire alarm went off right now, could you stop worrying?',
    questionRu: 'Если бы сейчас сработала пожарная сигнализация, смогли бы вы перестать беспокоиться?',
    targetBeliefType: 'uncontrollability',
    purpose: 'Demonstrate contextual control over worry'
  },
  {
    id: 'sq_unc_3',
    questionEn: 'What would it mean if worry was actually controllable?',
    questionRu: 'Что бы это значило, если бы беспокойство на самом деле было контролируемым?',
    targetBeliefType: 'uncontrollability',
    purpose: 'Explore implications of control'
  },

  // For Danger Beliefs
  {
    id: 'sq_dng_1',
    questionEn: 'Has your worrying ever actually made you go crazy or lose control?',
    questionRu: 'Беспокойство когда-нибудь реально сводило вас с ума или приводило к потере контроля?',
    targetBeliefType: 'danger',
    purpose: 'Reality-test danger beliefs'
  },
  {
    id: 'sq_dng_2',
    questionEn: 'What evidence do you have that worrying is dangerous to your health?',
    questionRu: 'Какие у вас есть доказательства того, что беспокойство опасно для здоровья?',
    targetBeliefType: 'danger',
    purpose: 'Examine evidence for danger'
  },

  // For Need to Control Thoughts
  {
    id: 'sq_ntc_1',
    questionEn: 'Is it actually possible to control all of your thoughts?',
    questionRu: 'Возможно ли на самом деле контролировать все свои мысли?',
    targetBeliefType: 'need_to_control',
    purpose: 'Challenge possibility of thought control'
  },
  {
    id: 'sq_ntc_2',
    questionEn: 'What happens when you try not to think about something?',
    questionRu: 'Что происходит, когда вы пытаетесь не думать о чём-то?',
    targetBeliefType: 'need_to_control',
    purpose: 'Demonstrate rebound effect'
  }
];
