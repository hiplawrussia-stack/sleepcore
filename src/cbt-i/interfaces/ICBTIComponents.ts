/**
 * ICBTIComponents - CBT-I 5-Component System Interfaces
 * ======================================================
 * Defines interfaces for the five core components of
 * Cognitive Behavioral Therapy for Insomnia.
 *
 * Components:
 * 1. Sleep Restriction Therapy (SRT)
 * 2. Stimulus Control Therapy (SCT)
 * 3. Cognitive Restructuring (CR)
 * 4. Sleep Hygiene Education (SHE)
 * 5. Relaxation Training (RT)
 *
 * Scientific Foundation:
 * - Spielman et al. (1987) - Sleep Restriction
 * - Bootzin (1972) - Stimulus Control
 * - Beck (1979) - Cognitive Restructuring
 * - Hauri (1977) - Sleep Hygiene
 * - Jacobson (1938) - Progressive Muscle Relaxation
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type { ISleepState, ISleepMetrics } from '../../sleep/interfaces/ISleepState';

/**
 * CBT-I Component types
 */
export type CBTIComponent =
  | 'sleep_restriction'
  | 'stimulus_control'
  | 'cognitive_restructuring'
  | 'sleep_hygiene'
  | 'relaxation';

/**
 * CBT-I Session phase
 */
export type CBTIPhase =
  | 'assessment'     // Week 1: Initial assessment
  | 'education'      // Week 1-2: Psychoeducation
  | 'intervention'   // Week 2-6: Active intervention
  | 'maintenance'    // Week 7-8: Consolidation
  | 'follow_up';     // Post-treatment

/**
 * Treatment intensity level
 */
export type IntensityLevel = 'mild' | 'moderate' | 'intensive';

// =============================================================================
// 1. SLEEP RESTRICTION THERAPY (SRT)
// =============================================================================

/**
 * Sleep Restriction prescription
 * Restricts time in bed to match actual sleep time
 */
export interface ISleepRestrictionPrescription {
  /**
   * Prescribed time in bed (minutes)
   * Minimum: 5 hours (300 min) for safety
   */
  readonly prescribedTIB: number;

  /**
   * Prescribed bedtime (24h format)
   */
  readonly prescribedBedtime: string;

  /**
   * Prescribed wake time (fixed anchor)
   */
  readonly prescribedWakeTime: string;

  /**
   * Current sleep efficiency threshold for adjustment
   * Default: 85%
   */
  readonly efficiencyThreshold: number;

  /**
   * Minimum time in bed (safety limit)
   * Default: 300 minutes (5 hours)
   */
  readonly minimumTIB: number;

  /**
   * Adjustment increment (minutes)
   * Default: 15-30 minutes
   */
  readonly adjustmentIncrement: number;

  /**
   * Days until next adjustment evaluation
   */
  readonly evaluationPeriod: number;

  /**
   * Is restriction active?
   */
  readonly isActive: boolean;

  /**
   * Prescription start date
   */
  readonly startDate: string;

  /**
   * Current week of restriction
   */
  readonly currentWeek: number;
}

/**
 * Sleep Restriction adjustment rules
 */
export interface ISleepRestrictionRules {
  /**
   * Increase TIB when SE >= this threshold (e.g., 90%)
   */
  readonly increaseThreshold: number;

  /**
   * Maintain TIB when SE is in this range
   */
  readonly maintainRange: { min: number; max: number };

  /**
   * Decrease TIB when SE < this threshold (e.g., 80%)
   */
  readonly decreaseThreshold: number;

  /**
   * Amount to increase TIB (minutes)
   */
  readonly increaseAmount: number;

  /**
   * Amount to decrease TIB (minutes)
   */
  readonly decreaseAmount: number;
}

/**
 * Sleep Restriction Therapy Engine Interface
 */
export interface ISleepRestrictionEngine {
  /**
   * Calculate initial sleep window based on sleep diary
   */
  calculateInitialWindow(
    sleepHistory: ISleepMetrics[],
    preferredWakeTime: string
  ): ISleepRestrictionPrescription;

  /**
   * Evaluate and adjust sleep window based on recent efficiency
   */
  evaluateAndAdjust(
    currentPrescription: ISleepRestrictionPrescription,
    recentMetrics: ISleepMetrics[]
  ): ISleepRestrictionPrescription;

  /**
   * Check if user is ready to graduate from restriction
   */
  checkGraduation(
    sleepHistory: ISleepMetrics[],
    prescription: ISleepRestrictionPrescription
  ): { ready: boolean; reason: string };

  /**
   * Get adherence score for restriction
   */
  calculateAdherence(
    prescription: ISleepRestrictionPrescription,
    actualBehavior: ISleepMetrics[]
  ): number;
}

// =============================================================================
// 2. STIMULUS CONTROL THERAPY (SCT)
// =============================================================================

/**
 * Stimulus Control rules
 */
export interface IStimulusControlRules {
  /**
   * Go to bed only when sleepy
   */
  readonly goToBedWhenSleepy: boolean;

  /**
   * Use bed only for sleep and sex
   */
  readonly bedOnlyForSleep: boolean;

  /**
   * Leave bed if unable to sleep (15-20 min)
   */
  readonly leaveIfAwake: boolean;
  readonly leaveThresholdMinutes: number;

  /**
   * Return to bed only when sleepy
   */
  readonly returnWhenSleepy: boolean;

  /**
   * Fixed wake time regardless of sleep
   */
  readonly fixedWakeTime: boolean;
  readonly wakeTime: string;

  /**
   * No napping
   */
  readonly noNapping: boolean;
}

/**
 * Stimulus Control adherence tracking
 */
export interface IStimulusControlAdherence {
  readonly date: string;
  readonly wentToBedWhenSleepy: boolean;
  readonly usedBedOnlyForSleep: boolean;
  readonly leftBedWhenAwake: boolean;
  readonly maintainedFixedWakeTime: boolean;
  readonly avoidedNaps: boolean;
  readonly overallAdherence: number;  // 0-1
}

/**
 * Stimulus Control Therapy Engine Interface
 */
export interface IStimulusControlEngine {
  /**
   * Get personalized stimulus control rules
   */
  getRules(sleepState: ISleepState): IStimulusControlRules;

  /**
   * Track adherence to rules
   */
  trackAdherence(
    rules: IStimulusControlRules,
    behavior: ISleepMetrics
  ): IStimulusControlAdherence;

  /**
   * Generate reminder for leaving bed
   */
  generateLeaveReminder(minutesAwake: number): string;

  /**
   * Check if bedroom association is improving
   */
  assessBedroomAssociation(
    adherenceHistory: IStimulusControlAdherence[]
  ): { score: number; trend: 'improving' | 'stable' | 'declining' };
}

// =============================================================================
// 3. COGNITIVE RESTRUCTURING
// =============================================================================

/**
 * Sleep-related emotions commonly experienced with insomnia
 *
 * Scientific basis:
 * - Harvey (2002) cognitive model of insomnia
 * - Pre-Sleep Arousal Scale (PSAS) cognitive subscale
 * - JAMA Network Open (2025) emotional processing in CBT-I
 *
 * @see https://pmc.ncbi.nlm.nih.gov/articles/PMC6796223/
 * @see https://pmc.ncbi.nlm.nih.gov/articles/PMC11868973/
 */
export type SleepRelatedEmotion =
  | 'anxiety'       // Pre-sleep worry, anticipatory anxiety about not sleeping
  | 'frustration'   // Frustration from inability to sleep (conditioned arousal)
  | 'hopelessness'  // "Nothing will help my sleep" (DBAS helplessness)
  | 'fear'          // Fear of consequences of poor sleep (catastrophizing)
  | 'anger'         // Irritability, anger associated with sleep deprivation
  | 'worry';        // Rumination, perseverative thinking about sleep

/**
 * Sleep-related dysfunctional belief
 *
 * Extended with emotional component following Beck's CBT model:
 * Situation → Automatic Thought → Emotion → Behavior
 *
 * @see Beck (1976) Cognitive Therapy and the Emotional Disorders
 * @see Blueprint.ai CBT Thought Record clinical standard
 */
export interface IDysfunctionalBelief {
  readonly id: string;
  readonly category:
    | 'expectations'      // Unrealistic sleep expectations
    | 'consequences'      // Catastrophizing about consequences
    | 'control'           // Beliefs about control over sleep
    | 'medication'        // Beliefs about sleep medication
    | 'causes';           // Beliefs about causes of insomnia

  readonly belief: string;           // The dysfunctional thought
  readonly intensity: number;        // 0-1, how strongly held
  readonly frequency: number;        // 0-1, how often occurs
  readonly evidenceFor: string[];    // User's evidence for belief
  readonly evidenceAgainst: string[]; // Evidence against (therapeutic)
  readonly alternativeThought: string; // Balanced alternative
  readonly isActive: boolean;

  /**
   * Primary emotion associated with this belief
   * Part of Beck's cognitive triad: thought → emotion → behavior
   *
   * @see Harvey (2002) cognitive model of insomnia
   */
  readonly emotion?: SleepRelatedEmotion;

  /**
   * Intensity of the emotion (0.0-1.0)
   * Maps to 0-100% scale used in clinical thought records
   *
   * @see Psychology Tools thought record format
   */
  readonly emotionIntensity?: number;

  /**
   * Emotion intensity after cognitive restructuring (0.0-1.0)
   * Used to track emotional improvement from reframing
   *
   * Clinical standard: re-rate emotion after generating alternative thought
   */
  readonly emotionIntensityAfter?: number;
}

/**
 * Cognitive restructuring session
 */
export interface ICognitiveSession {
  readonly sessionId: string;
  readonly date: string;
  readonly targetBelief: IDysfunctionalBelief;
  readonly technique:
    | 'socratic_questioning'
    | 'behavioral_experiment'
    | 'evidence_review'
    | 'decatastrophizing'
    | 'probability_estimation';
  readonly questions: string[];
  readonly userResponses: string[];
  readonly newPerspective?: string;
  readonly beliefChangeScore: number;  // -1 to +1
}

/**
 * Cognitive Restructuring Engine Interface
 */
export interface ICognitiveRestructuringEngine {
  /**
   * Identify dysfunctional beliefs from user input
   */
  identifyBeliefs(
    userText: string,
    sleepState: ISleepState
  ): IDysfunctionalBelief[];

  /**
   * Generate Socratic questions for a belief
   */
  generateSocraticQuestions(belief: IDysfunctionalBelief): string[];

  /**
   * Generate alternative balanced thought
   */
  generateAlternativeThought(
    belief: IDysfunctionalBelief,
    evidence: { for: string[]; against: string[] }
  ): string;

  /**
   * Design behavioral experiment
   */
  designExperiment(belief: IDysfunctionalBelief): {
    hypothesis: string;
    experiment: string;
    predictedOutcome: string;
    actualOutcome?: string;
  };

  /**
   * Calculate cognitive improvement
   */
  calculateImprovement(
    beliefHistory: IDysfunctionalBelief[][]
  ): ICognitiveImprovementResult;

  /**
   * Generate structured progress report for cognitive restructuring
   *
   * Produces a table-format report showing:
   * - Belief → Emotion → Category → Alternative Thought
   * - Intensity changes over time
   *
   * @see ChatCBT summary table format
   * @see Blueprint.ai thought record format
   */
  generateCognitiveProgressReport(
    beliefHistory: IDysfunctionalBelief[][]
  ): ICognitiveProgressReport;

  /**
   * Infer emotion from belief category and content
   * Used when emotion is not explicitly provided
   */
  inferEmotionFromBelief(belief: IDysfunctionalBelief): SleepRelatedEmotion;
}

/**
 * Result of cognitive improvement calculation
 */
export interface ICognitiveImprovementResult {
  /** Overall DBAS score reduction (0-1) */
  readonly dbasReduction: number;

  /** Beliefs with most improvement */
  readonly topImprovedBeliefs: string[];

  /** Emotional improvement metrics (new) */
  readonly emotionalImprovement: {
    /** Average reduction in emotion intensity */
    readonly avgEmotionReduction: number;
    /** Emotions with most improvement */
    readonly improvedEmotions: SleepRelatedEmotion[];
  };
}

/**
 * Single row in cognitive progress report
 *
 * Format inspired by CBT thought record + ChatCBT summary table
 */
export interface ICognitiveProgressRow {
  /** Date of belief identification */
  readonly date: string;

  /** The dysfunctional belief text */
  readonly belief: string;

  /** Belief category (DBAS-based) */
  readonly category: IDysfunctionalBelief['category'];

  /** Associated emotion */
  readonly emotion: SleepRelatedEmotion;

  /** Initial emotion intensity (0-100 for display) */
  readonly emotionIntensityBefore: number;

  /** Emotion intensity after restructuring (0-100 for display) */
  readonly emotionIntensityAfter: number;

  /** Belief intensity before (0-100 for display) */
  readonly beliefIntensityBefore: number;

  /** Belief intensity after (0-100 for display) */
  readonly beliefIntensityAfter: number;

  /** Alternative balanced thought */
  readonly alternativeThought: string;

  /** Whether restructuring was successful (intensity reduced >20%) */
  readonly restructuringSuccess: boolean;
}

/**
 * Cognitive progress report
 *
 * Structured table format for tracking cognitive-emotional journey
 *
 * @see JAMA Network Open (2025) - emotional processing in dCBT-I
 */
export interface ICognitiveProgressReport {
  /** Report generation date */
  readonly generatedAt: string;

  /** User ID */
  readonly userId: string;

  /** Period covered by report */
  readonly periodStart: string;
  readonly periodEnd: string;

  /** Individual belief rows */
  readonly rows: ICognitiveProgressRow[];

  /** Summary statistics */
  readonly summary: {
    /** Total beliefs tracked */
    readonly totalBeliefs: number;

    /** Beliefs successfully restructured */
    readonly successfulRestructurings: number;

    /** Success rate (0-100) */
    readonly successRate: number;

    /** Average belief intensity reduction */
    readonly avgBeliefReduction: number;

    /** Average emotion intensity reduction */
    readonly avgEmotionReduction: number;

    /** Most common emotion */
    readonly dominantEmotion: SleepRelatedEmotion;

    /** Category with most beliefs */
    readonly dominantCategory: IDysfunctionalBelief['category'];
  };

  /**
   * Format report as markdown table
   * For display in UI or export
   */
  toMarkdownTable(): string;
}

// =============================================================================
// 4. SLEEP HYGIENE EDUCATION
// =============================================================================

/**
 * Sleep hygiene category
 */
export type SleepHygieneCategory =
  | 'caffeine'
  | 'alcohol'
  | 'nicotine'
  | 'exercise'
  | 'diet'
  | 'environment'
  | 'screen_time'
  | 'routine'
  | 'stress';

/**
 * Sleep hygiene recommendation
 */
export interface ISleepHygieneRecommendation {
  readonly id: string;
  readonly category: SleepHygieneCategory;
  readonly recommendation: string;
  readonly rationale: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly isPersonalized: boolean;
  readonly basedOn?: string;  // What data triggered this
}

/**
 * Sleep hygiene assessment
 */
export interface ISleepHygieneAssessment {
  readonly userId: string;
  readonly date: string;
  readonly scores: Record<SleepHygieneCategory, number>;  // 0-1 per category
  readonly overallScore: number;
  readonly topIssues: SleepHygieneCategory[];
  readonly recommendations: ISleepHygieneRecommendation[];
}

/**
 * Sleep Hygiene Engine Interface
 */
export interface ISleepHygieneEngine {
  /**
   * Assess sleep hygiene from behaviors
   */
  assess(sleepState: ISleepState): ISleepHygieneAssessment;

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(
    assessment: ISleepHygieneAssessment,
    previousRecommendations?: ISleepHygieneRecommendation[]
  ): ISleepHygieneRecommendation[];

  /**
   * Get educational content for category
   */
  getEducationalContent(category: SleepHygieneCategory): {
    title: string;
    content: string;
    tips: string[];
    myths: string[];
  };

  /**
   * Track hygiene improvement over time
   */
  trackImprovement(
    assessmentHistory: ISleepHygieneAssessment[]
  ): { improved: SleepHygieneCategory[]; declined: SleepHygieneCategory[] };
}

// =============================================================================
// 5. RELAXATION TRAINING
// =============================================================================

/**
 * Relaxation technique types
 */
export type RelaxationTechnique =
  | 'progressive_muscle_relaxation'  // PMR
  | 'diaphragmatic_breathing'
  | 'body_scan'
  | 'guided_imagery'
  | 'autogenic_training'
  | 'mindfulness_meditation'
  | 'cognitive_shuffle';  // Random word association

/**
 * Relaxation session
 */
export interface IRelaxationSession {
  readonly sessionId: string;
  readonly technique: RelaxationTechnique;
  readonly duration: number;  // minutes
  readonly guidedAudio?: string;  // URL or ID
  readonly preAnxietyLevel: number;  // 0-1
  readonly postAnxietyLevel: number;  // 0-1
  readonly preTensionLevel: number;   // 0-1
  readonly postTensionLevel: number;  // 0-1
  readonly userRating: number;  // 1-5
  readonly completed: boolean;
  readonly timestamp: Date;
}

/**
 * Relaxation protocol (sequence of exercises)
 */
export interface IRelaxationProtocol {
  readonly id: string;
  readonly name: string;
  readonly techniques: RelaxationTechnique[];
  readonly totalDuration: number;
  readonly targetContext: 'bedtime' | 'daytime' | 'wakeup' | 'anytime';
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Relaxation Training Engine Interface
 */
export interface IRelaxationEngine {
  /**
   * Get recommended technique based on state
   */
  recommendTechnique(
    sleepState: ISleepState,
    context: 'bedtime' | 'daytime' | 'wakeup'
  ): RelaxationTechnique;

  /**
   * Get protocol for user
   */
  getProtocol(
    userLevel: 'beginner' | 'intermediate' | 'advanced',
    targetContext: 'bedtime' | 'daytime' | 'wakeup'
  ): IRelaxationProtocol;

  /**
   * Generate guided instructions for technique
   */
  generateInstructions(
    technique: RelaxationTechnique,
    duration: number
  ): string[];

  /**
   * Track relaxation effectiveness
   */
  calculateEffectiveness(
    sessions: IRelaxationSession[]
  ): { avgAnxietyReduction: number; mostEffectiveTechnique: RelaxationTechnique };
}

// =============================================================================
// INTEGRATED CBT-I ENGINE
// =============================================================================

/**
 * CBT-I treatment plan
 */
export interface ICBTIPlan {
  readonly userId: string;
  readonly startDate: string;
  readonly currentPhase: CBTIPhase;
  readonly currentWeek: number;
  readonly totalWeeks: number;

  /**
   * Active components
   */
  readonly activeComponents: {
    sleepRestriction: ISleepRestrictionPrescription | null;
    stimulusControl: IStimulusControlRules;
    cognitiveTargets: IDysfunctionalBelief[];
    hygieneRecommendations: ISleepHygieneRecommendation[];
    relaxationProtocol: IRelaxationProtocol;
  };

  /**
   * Weekly goals
   */
  readonly weeklyGoals: {
    component: CBTIComponent;
    goal: string;
    achieved: boolean;
  }[];

  /**
   * Overall progress
   */
  readonly progress: {
    isiBaseline: number;
    isiCurrent: number;
    isiTarget: number;
    sleepEfficiencyBaseline: number;
    sleepEfficiencyCurrent: number;
    completionPercentage: number;
  };
}

/**
 * CBT-I intervention recommendation
 */
export interface ICBTIIntervention {
  readonly component: CBTIComponent;
  readonly action: string;
  readonly rationale: string;
  readonly priority: number;  // 1-5
  readonly timing: 'immediate' | 'tonight' | 'this_week';
  readonly personalizationScore: number;  // 0-1
}

/**
 * Main CBT-I Engine Interface
 */
export interface ICBTIEngine {
  /**
   * Initialize treatment plan for user
   */
  initializePlan(
    userId: string,
    baselineAssessment: ISleepState[]
  ): ICBTIPlan;

  /**
   * Get next recommended intervention
   * @returns Promise with intervention selection (async for CogniCore integration)
   */
  getNextIntervention(
    plan: ICBTIPlan,
    currentState: ISleepState
  ): Promise<ICBTIIntervention>;

  /**
   * Update plan based on progress
   */
  updatePlan(
    plan: ICBTIPlan,
    recentStates: ISleepState[]
  ): ICBTIPlan;

  /**
   * Check treatment response
   */
  assessResponse(plan: ICBTIPlan): {
    isResponding: boolean;
    isiChange: number;
    recommendation: 'continue' | 'intensify' | 'modify' | 'graduate';
  };

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(
    plan: ICBTIPlan,
    weeklyStates: ISleepState[]
  ): {
    sleepEfficiencyAvg: number;
    totalSleepTimeAvg: number;
    adherenceScore: number;
    keyAchievements: string[];
    nextWeekFocus: string[];
  };
}
