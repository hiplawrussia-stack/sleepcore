/**
 * ICognitiveConsolidation - Memory Consolidation Interfaces
 * ==========================================================
 *
 * Interfaces for the Smart Memory Window system that leverages
 * sleep-dependent memory consolidation for behavior change.
 *
 * Scientific Foundation (2025 Research):
 * - Neuron 2025: cAMP oscillations during NREM create optimal plasticity window
 * - Nature npj Science of Learning 2024: Targeted Memory Reactivation
 * - Science Advances 2019: Rehearsal initiates consolidation, sleep makes it last
 * - PMC: Sleep-dependent consolidation of intentional learning
 *
 * The system consists of:
 * 1. Pre-sleep Mental Rehearsal - Encode CBT-I rules before sleep
 * 2. Morning Recall Quiz - Test consolidation and adapt learning
 * 3. Adaptive Spaced Repetition - Focus on poorly consolidated rules
 *
 * @packageDocumentation
 * @module @sleepcore/cognitive
 */

/**
 * Sleep rule categories for CBT-I consolidation
 */
export type SleepRuleCategory =
  | 'stimulus_control'      // Bed-sleep association
  | 'sleep_restriction'     // Time in bed limits
  | 'sleep_hygiene'         // Environmental factors
  | 'cognitive'             // Thought patterns
  | 'relaxation';           // Wind-down techniques

/**
 * A single sleep rule to be consolidated
 */
export interface ISleepRule {
  /** Unique rule ID */
  readonly id: string;

  /** Rule category */
  readonly category: SleepRuleCategory;

  /** Short rule statement (for recall testing) */
  readonly statement: string;

  /** Full explanation (for learning) */
  readonly explanation: string;

  /** Visualization prompt for mental rehearsal */
  readonly visualizationPrompt: string;

  /** Why this rule matters (emotional framing) */
  readonly rationale: string;

  /** Difficulty level (1-5) */
  readonly difficulty: number;

  /** Related rules for context */
  readonly relatedRuleIds: string[];
}

/**
 * User's consolidation state for a single rule
 */
export interface IRuleConsolidationState {
  /** Rule ID */
  readonly ruleId: string;

  /** Times presented for rehearsal */
  readonly rehearsalCount: number;

  /** Times successfully recalled */
  readonly successfulRecalls: number;

  /** Times failed to recall */
  readonly failedRecalls: number;

  /** Current consolidation score (0-1) */
  readonly consolidationScore: number;

  /** Last rehearsal timestamp */
  readonly lastRehearsalAt: Date | null;

  /** Last recall test timestamp */
  readonly lastRecallAt: Date | null;

  /** Next scheduled review (spaced repetition) */
  readonly nextReviewAt: Date | null;

  /** Is this rule considered "mastered"? (score > 0.8 for 3+ days) */
  readonly isMastered: boolean;

  /** Consecutive days with successful recall */
  readonly streakDays: number;
}

/**
 * Pre-sleep mental rehearsal session
 */
export interface IRehearsalSession {
  /** Session ID */
  readonly sessionId: string;

  /** User ID */
  readonly userId: string;

  /** Timestamp */
  readonly timestamp: Date;

  /** Rules presented in this session */
  readonly rules: ISleepRule[];

  /** User's bedtime (to calculate timing) */
  readonly plannedBedtime: string;

  /** Minutes before bedtime this was presented */
  readonly minutesBeforeBed: number;

  /** Did user complete the visualization? */
  readonly visualizationCompleted: boolean;

  /** User's self-rated engagement (1-5) */
  readonly engagementRating?: number;

  /** Learning intention set? */
  readonly intentionSet: boolean;
}

/**
 * Morning recall quiz question
 */
export interface IRecallQuestion {
  /** Question ID */
  readonly questionId: string;

  /** Rule being tested */
  readonly ruleId: string;

  /** Question type */
  readonly type: 'free_recall' | 'recognition' | 'application';

  /** Question text */
  readonly question: string;

  /** For recognition type: options */
  readonly options?: string[];

  /** Correct answer(s) */
  readonly correctAnswers: string[];

  /** Hint if needed */
  readonly hint?: string;
}

/**
 * User's answer to a recall question
 */
export interface IRecallAnswer {
  /** Question ID */
  readonly questionId: string;

  /** User's response */
  readonly response: string;

  /** Was it correct? */
  readonly isCorrect: boolean;

  /** Partial credit score (0-1) for approximate answers */
  readonly partialScore: number;

  /** Response time in seconds */
  readonly responseTimeSeconds: number;

  /** Confidence rating (1-5) */
  readonly confidenceRating?: number;
}

/**
 * Morning recall quiz session
 */
export interface IRecallSession {
  /** Session ID */
  readonly sessionId: string;

  /** User ID */
  readonly userId: string;

  /** Timestamp */
  readonly timestamp: Date;

  /** Related rehearsal session (previous night) */
  readonly rehearsalSessionId: string | null;

  /** Questions in this quiz */
  readonly questions: IRecallQuestion[];

  /** User's answers */
  readonly answers: IRecallAnswer[];

  /** Overall score (0-1) */
  readonly overallScore: number;

  /** Time to complete quiz (seconds) */
  readonly completionTimeSeconds: number;

  /** Sleep quality reported (1-5) */
  readonly sleepQualityRating?: number;
}

/**
 * Consolidation analytics over time
 */
export interface IConsolidationAnalytics {
  /** User ID */
  readonly userId: string;

  /** Analysis period */
  readonly periodStart: Date;
  readonly periodEnd: Date;

  /** Overall consolidation progress */
  readonly overallProgress: number;  // 0-1

  /** Rules by consolidation status */
  readonly ruleStats: {
    mastered: number;
    consolidating: number;
    struggling: number;
    notStarted: number;
  };

  /** Average recall accuracy over period */
  readonly avgRecallAccuracy: number;

  /** Trend: improving, stable, declining */
  readonly trend: 'improving' | 'stable' | 'declining';

  /** Best consolidated categories */
  readonly strongCategories: SleepRuleCategory[];

  /** Categories needing more work */
  readonly weakCategories: SleepRuleCategory[];

  /** Recommendations for next sessions */
  readonly recommendations: string[];
}

/**
 * Adaptive learning configuration
 */
export interface IAdaptiveLearningConfig {
  /** Max rules per rehearsal session */
  readonly maxRulesPerSession: number;

  /** Min rules per session */
  readonly minRulesPerSession: number;

  /** Optimal time before bed (minutes) */
  readonly optimalMinutesBeforeBed: number;

  /** Spaced repetition intervals (days) */
  readonly spacedRepetitionIntervals: number[];

  /** Consolidation threshold for "mastered" */
  readonly masteryThreshold: number;

  /** Days of consistent recall for mastery */
  readonly masteryStreakDays: number;

  /** Include visualization in rehearsal? */
  readonly includeVisualization: boolean;

  /** Include emotional framing? */
  readonly includeRationale: boolean;
}

/**
 * Default adaptive learning configuration
 * Based on spaced repetition research (Ebbinghaus, Pimsleur, SuperMemo)
 */
export const DEFAULT_ADAPTIVE_CONFIG: IAdaptiveLearningConfig = {
  maxRulesPerSession: 5,
  minRulesPerSession: 3,
  optimalMinutesBeforeBed: 30,
  spacedRepetitionIntervals: [1, 2, 4, 7, 14, 30],  // Fibonacci-like
  masteryThreshold: 0.85,
  masteryStreakDays: 3,
  includeVisualization: true,
  includeRationale: true,
};

/**
 * Pre-sleep Mental Rehearsal Engine Interface
 */
export interface IRehearsalEngine {
  /**
   * Get rules for tonight's rehearsal session
   * Uses adaptive algorithm based on consolidation state
   */
  selectRulesForRehearsal(
    userId: string,
    consolidationStates: IRuleConsolidationState[],
    config?: IAdaptiveLearningConfig
  ): ISleepRule[];

  /**
   * Generate visualization script for a rule
   * Creates immersive mental imagery prompt
   */
  generateVisualization(rule: ISleepRule): string;

  /**
   * Create complete rehearsal session
   */
  createRehearsalSession(
    userId: string,
    rules: ISleepRule[],
    plannedBedtime: string
  ): IRehearsalSession;

  /**
   * Format rehearsal content for Telegram message
   */
  formatRehearsalMessage(session: IRehearsalSession): string;

  /**
   * Set learning intention (enhances consolidation)
   */
  setLearningIntention(sessionId: string): string;
}

/**
 * Morning Recall Quiz Engine Interface
 */
export interface IRecallEngine {
  /**
   * Generate quiz questions based on previous rehearsal
   */
  generateQuiz(
    userId: string,
    rehearsalSession: IRehearsalSession,
    maxQuestions?: number
  ): IRecallQuestion[];

  /**
   * Evaluate user's answer
   */
  evaluateAnswer(
    question: IRecallQuestion,
    userResponse: string
  ): IRecallAnswer;

  /**
   * Create recall session from answers
   */
  createRecallSession(
    userId: string,
    rehearsalSessionId: string | null,
    questions: IRecallQuestion[],
    answers: IRecallAnswer[]
  ): IRecallSession;

  /**
   * Update consolidation states based on recall performance
   */
  updateConsolidationStates(
    currentStates: IRuleConsolidationState[],
    recallSession: IRecallSession
  ): IRuleConsolidationState[];

  /**
   * Format quiz for Telegram (with inline keyboard)
   */
  formatQuizMessage(question: IRecallQuestion): {
    text: string;
    keyboard?: { text: string; callbackData: string }[][];
  };
}

/**
 * Consolidation Analytics Engine Interface
 */
export interface IConsolidationAnalyticsEngine {
  /**
   * Calculate consolidation analytics for a period
   */
  analyzeConsolidation(
    userId: string,
    rehearsalSessions: IRehearsalSession[],
    recallSessions: IRecallSession[],
    periodDays: number
  ): IConsolidationAnalytics;

  /**
   * Get personalized recommendations
   */
  getRecommendations(
    analytics: IConsolidationAnalytics,
    consolidationStates: IRuleConsolidationState[]
  ): string[];

  /**
   * Calculate spaced repetition schedule
   */
  calculateNextReview(
    consolidationState: IRuleConsolidationState,
    config: IAdaptiveLearningConfig
  ): Date;

  /**
   * Generate progress report for user
   */
  generateProgressReport(analytics: IConsolidationAnalytics): string;
}

/**
 * Main Smart Memory Window Engine Interface
 * Orchestrates rehearsal, recall, and adaptation
 */
export interface ISmartMemoryWindowEngine {
  /** Get rehearsal engine */
  readonly rehearsal: IRehearsalEngine;

  /** Get recall engine */
  readonly recall: IRecallEngine;

  /** Get analytics engine */
  readonly analytics: IConsolidationAnalyticsEngine;

  /**
   * Initialize consolidation tracking for user
   */
  initializeUser(userId: string): Promise<IRuleConsolidationState[]>;

  /**
   * Get evening rehearsal content
   * Call ~30 min before user's bedtime
   */
  getEveningRehearsal(
    userId: string,
    bedtime: string
  ): Promise<IRehearsalSession>;

  /**
   * Get morning recall quiz
   * Call after user wakes up
   */
  getMorningQuiz(userId: string): Promise<IRecallQuestion[]>;

  /**
   * Process quiz answers and update learning
   */
  processQuizAnswers(
    userId: string,
    answers: IRecallAnswer[]
  ): Promise<{
    recallSession: IRecallSession;
    updatedStates: IRuleConsolidationState[];
    feedback: string;
  }>;

  /**
   * Get user's consolidation progress
   */
  getProgress(userId: string): Promise<IConsolidationAnalytics>;

  /**
   * Check if user should receive rehearsal prompt
   * Based on time relative to bedtime
   */
  shouldPromptRehearsal(
    userId: string,
    currentTime: Date,
    bedtime: string
  ): boolean;

  /**
   * Check if user should receive morning quiz
   * Based on time and sleep diary entry
   */
  shouldPromptMorningQuiz(
    userId: string,
    currentTime: Date,
    wakeTime: string
  ): boolean;
}
