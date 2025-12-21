/**
 * IThirdWaveTherapies - Third-Wave Therapy Interfaces for Insomnia
 * ==================================================================
 * Defines interfaces for third-wave cognitive-behavioral therapies:
 *
 * 1. MBT-I (Mindfulness-Based Therapy for Insomnia)
 *    - Developed by Jason Ong (2014)
 *    - Integrates mindfulness with behavioral sleep strategies
 *    - Targets metacognitive arousal and sleep-related worry
 *
 * 2. ACT-I (Acceptance and Commitment Therapy for Insomnia)
 *    - Developed by Guy Meadows / Lundh & Broman
 *    - Focuses on psychological flexibility
 *    - Uses acceptance instead of control-based strategies
 *
 * Scientific Foundation:
 * - Ong et al. (2014) - MBTI Protocol
 * - Meadows (2014) - The Sleep Book (ACT-I)
 * - Lundh & Broman (2000) - Insomnia as Problem Solving
 * - Hayes et al. (1999) - ACT Framework
 *
 * @packageDocumentation
 * @module @sleepcore/third-wave
 */

import type { ISleepState } from '../../sleep/interfaces/ISleepState';

// =============================================================================
// SHARED TYPES
// =============================================================================

/**
 * Mindfulness practice types
 */
export type MindfulnessPractice =
  | 'breath_awareness'
  | 'body_scan'
  | 'sitting_meditation'
  | 'mindful_movement'
  | 'loving_kindness'
  | 'open_awareness'
  | '3_minute_breathing_space';

/**
 * ACT process types
 */
export type ACTProcess =
  | 'acceptance'
  | 'cognitive_defusion'
  | 'present_moment'
  | 'self_as_context'
  | 'values'
  | 'committed_action';

/**
 * Session difficulty level
 */
export type SessionLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Treatment modality
 */
export type TherapyModality = 'individual' | 'group' | 'digital' | 'hybrid';

// =============================================================================
// MBT-I (MINDFULNESS-BASED THERAPY FOR INSOMNIA)
// =============================================================================

/**
 * MBT-I session structure
 * Based on Ong's 8-session protocol
 */
export interface IMBTISession {
  readonly sessionId: string;
  readonly weekNumber: number; // 1-8
  readonly theme: string;
  readonly objectives: string[];
  readonly mindfulnessPractice: MindfulnessPractice;
  readonly behavioralComponent: 'sleep_restriction' | 'stimulus_control' | 'none';
  readonly homeAssignment: string[];
  readonly duration: number; // minutes
}

/**
 * Mindfulness practice session
 */
export interface IMindfulnessSession {
  readonly sessionId: string;
  readonly practice: MindfulnessPractice;
  readonly duration: number; // minutes
  readonly guidedAudioUrl?: string;
  readonly instructions: string[];
  readonly timestamp: Date;

  // Pre-post measures
  readonly preArousalLevel: number;    // 0-1
  readonly postArousalLevel: number;   // 0-1
  readonly preMindfulness: number;     // 0-1 (present moment awareness)
  readonly postMindfulness: number;    // 0-1

  readonly completed: boolean;
  readonly userRating: number; // 1-5
  readonly notes?: string;
}

/**
 * Sleep-related arousal assessment
 */
export interface ISleepArousal {
  /** Cognitive arousal (racing thoughts) 0-1 */
  readonly cognitive: number;

  /** Somatic arousal (physical tension) 0-1 */
  readonly somatic: number;

  /** Sleep effort (trying too hard to sleep) 0-1 */
  readonly sleepEffort: number;

  /** Sleep-related worry 0-1 */
  readonly sleepWorry: number;

  /** Pre-sleep rumination 0-1 */
  readonly rumination: number;
}

/**
 * MBT-I treatment plan
 */
export interface IMBTIPlan {
  readonly userId: string;
  readonly startDate: string;
  readonly currentWeek: number;
  readonly totalWeeks: number; // typically 8

  /** Current session in progress */
  readonly currentSession: IMBTISession;

  /** Completed sessions */
  readonly completedSessions: IMBTISession[];

  /** Mindfulness practice log */
  readonly practiceLog: IMindfulnessSession[];

  /** Daily home practice minutes target */
  readonly dailyPracticeTarget: number;

  /** Arousal baseline and current */
  readonly arousalBaseline: ISleepArousal;
  readonly arousalCurrent: ISleepArousal;

  /** Integration with behavioral components */
  readonly useSleepRestriction: boolean;
  readonly useStimulusControl: boolean;

  /** Progress metrics */
  readonly progress: {
    readonly practiceAdherence: number; // 0-1
    readonly arousalReduction: number;  // percentage
    readonly mindfulnessIncrease: number; // percentage
    readonly isiChange: number;
  };
}

/**
 * MBT-I Engine Interface
 */
export interface IMBTIEngine {
  /**
   * Initialize MBT-I treatment plan
   */
  initializePlan(
    userId: string,
    baselineAssessment: ISleepState[],
    options?: { useBehavioralComponents: boolean }
  ): IMBTIPlan;

  /**
   * Get current week's session
   */
  getCurrentSession(plan: IMBTIPlan): IMBTISession;

  /**
   * Get mindfulness practice for context
   */
  getPractice(
    plan: IMBTIPlan,
    context: 'bedtime' | 'daytime' | 'night_awakening',
    duration: number
  ): {
    practice: MindfulnessPractice;
    instructions: string[];
    audioUrl?: string;
  };

  /**
   * Record completed practice session
   */
  recordPractice(
    plan: IMBTIPlan,
    session: IMindfulnessSession
  ): IMBTIPlan;

  /**
   * Assess current arousal levels
   */
  assessArousal(sleepState: ISleepState): ISleepArousal;

  /**
   * Update plan based on progress
   */
  updatePlan(
    plan: IMBTIPlan,
    recentStates: ISleepState[]
  ): IMBTIPlan;

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(plan: IMBTIPlan): {
    practiceMinutes: number;
    practiceAdherence: number;
    arousalChange: ISleepArousal;
    keyInsights: string[];
    nextWeekFocus: string[];
  };
}

// =============================================================================
// ACT-I (ACCEPTANCE AND COMMITMENT THERAPY FOR INSOMNIA)
// =============================================================================

/**
 * ACT-I thought/experience to work with
 */
export interface IUnwantedExperience {
  readonly id: string;
  readonly type: 'thought' | 'feeling' | 'sensation' | 'urge';
  readonly content: string;
  readonly context: 'pre_sleep' | 'during_night' | 'morning' | 'daytime';
  readonly frequency: number; // 0-1
  readonly distress: number;  // 0-1
  readonly fusionLevel: number; // 0-1 (how "hooked" by the thought)
  readonly avoidanceBehaviors: string[];
}

/**
 * ACT defusion technique
 */
export interface IDefusionTechnique {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly instructions: string[];
  readonly targetExperiences: ('thought' | 'feeling' | 'sensation' | 'urge')[];
  readonly difficulty: SessionLevel;
  readonly duration: number; // minutes
}

/**
 * Personal values assessment
 */
export interface IValuesAssessment {
  readonly userId: string;
  readonly date: string;

  /** Life domains and importance (0-10) */
  readonly domains: {
    readonly health: { importance: number; currentAction: number };
    readonly relationships: { importance: number; currentAction: number };
    readonly work: { importance: number; currentAction: number };
    readonly leisure: { importance: number; currentAction: number };
    readonly personal_growth: { importance: number; currentAction: number };
  };

  /** How insomnia impacts valued living */
  readonly insomniaImpact: string[];

  /** Values-based sleep goals */
  readonly sleepGoals: string[];
}

/**
 * Committed action for sleep
 */
export interface ICommittedAction {
  readonly id: string;
  readonly action: string;
  readonly linkedValue: string;
  readonly frequency: 'daily' | 'weekly' | 'as_needed';
  readonly startDate: string;
  readonly completed: boolean[];  // Track daily completion
  readonly barriers: string[];
  readonly adjustments: string[];
}

/**
 * ACT-I session structure
 */
export interface IACTISession {
  readonly sessionId: string;
  readonly sessionNumber: number; // 1-6 typically
  readonly theme: string;
  readonly primaryProcess: ACTProcess;
  readonly secondaryProcesses: ACTProcess[];
  readonly exercises: string[];
  readonly metaphors: string[];
  readonly homeExperiments: string[];
  readonly duration: number;
}

/**
 * ACT-I treatment plan
 */
export interface IACTIPlan {
  readonly userId: string;
  readonly startDate: string;
  readonly currentSession: number;
  readonly totalSessions: number; // typically 5-6

  /** Current session details */
  readonly sessionDetails: IACTISession;

  /** Completed sessions */
  readonly completedSessions: IACTISession[];

  /** Identified unwanted experiences */
  readonly unwantedExperiences: IUnwantedExperience[];

  /** Defusion techniques practiced */
  readonly defusionPractice: {
    technique: IDefusionTechnique;
    timesUsed: number;
    effectiveness: number; // 0-1
  }[];

  /** Values assessment */
  readonly values: IValuesAssessment | null;

  /** Committed actions */
  readonly committedActions: ICommittedAction[];

  /** Psychological flexibility metrics */
  readonly flexibility: {
    readonly acceptanceBaseline: number;
    readonly acceptanceCurrent: number;
    readonly defusionBaseline: number;
    readonly defusionCurrent: number;
    readonly valuesClarity: number;
    readonly committedActionAdherence: number;
  };

  /** Sleep willingness (key ACT-I metric) */
  readonly sleepWillingness: {
    readonly baseline: number;
    readonly current: number;
  };

  /** Progress */
  readonly progress: {
    readonly flexibilityChange: number;
    readonly isiChange: number;
    readonly qualityOfLifeChange: number;
  };
}

/**
 * ACT-I Engine Interface
 */
export interface IACTIEngine {
  /**
   * Initialize ACT-I treatment plan
   */
  initializePlan(
    userId: string,
    baselineAssessment: ISleepState[]
  ): IACTIPlan;

  /**
   * Get current session
   */
  getCurrentSession(plan: IACTIPlan): IACTISession;

  /**
   * Identify unwanted experiences from user input
   */
  identifyUnwantedExperiences(
    userText: string,
    context: 'pre_sleep' | 'during_night' | 'morning' | 'daytime'
  ): IUnwantedExperience[];

  /**
   * Get defusion technique for experience
   */
  getDefusionTechnique(
    experience: IUnwantedExperience,
    userLevel: SessionLevel
  ): IDefusionTechnique;

  /**
   * Conduct values assessment
   */
  conductValuesAssessment(
    userId: string,
    responses: Record<string, number>
  ): IValuesAssessment;

  /**
   * Generate committed actions from values
   */
  generateCommittedActions(
    values: IValuesAssessment,
    sleepState: ISleepState
  ): ICommittedAction[];

  /**
   * Get acceptance exercise for sleep struggle
   */
  getAcceptanceExercise(
    struggle: 'cant_sleep' | 'anxious' | 'frustrated' | 'exhausted'
  ): {
    exercise: string;
    instructions: string[];
    metaphor: string;
  };

  /**
   * Update plan based on progress
   */
  updatePlan(
    plan: IACTIPlan,
    recentStates: ISleepState[]
  ): IACTIPlan;

  /**
   * Assess psychological flexibility
   */
  assessFlexibility(sleepState: ISleepState): {
    acceptance: number;
    defusion: number;
    presentMoment: number;
    selfAsContext: number;
    valuesClarity: number;
    committedAction: number;
    overall: number;
  };

  /**
   * Generate session summary
   */
  generateSessionSummary(plan: IACTIPlan): {
    keyTakeaways: string[];
    practiceExercises: string[];
    nextSessionPreview: string;
  };
}

// =============================================================================
// INTEGRATED THIRD-WAVE COORDINATOR
// =============================================================================

/**
 * Third-wave therapy selection
 */
export type ThirdWaveApproach = 'mbti' | 'acti' | 'hybrid' | 'none';

/**
 * Treatment recommendation
 */
export interface IThirdWaveRecommendation {
  readonly recommendedApproach: ThirdWaveApproach;
  readonly rationale: string;
  readonly contraindications: string[];
  readonly expectedBenefits: string[];
}

/**
 * Third-Wave Therapy Coordinator Interface
 */
export interface IThirdWaveCoordinator {
  /**
   * Recommend approach based on patient profile
   */
  recommendApproach(
    sleepState: ISleepState,
    treatmentHistory?: { failedCBTI: boolean; preferences: string[] }
  ): IThirdWaveRecommendation;

  /**
   * Get MBT-I engine
   */
  getMBTIEngine(): IMBTIEngine;

  /**
   * Get ACT-I engine
   */
  getACTIEngine(): IACTIEngine;

  /**
   * Check if third-wave approach is indicated
   */
  isThirdWaveIndicated(sleepState: ISleepState): boolean;
}
