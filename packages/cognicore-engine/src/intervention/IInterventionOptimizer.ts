/**
 * 🎯 INTERVENTION OPTIMIZATION ENGINE - INTERFACES
 * =================================================
 * Phase 3.4: Multi-Armed Bandit & Reinforcement Learning
 * for Optimal Intervention Selection
 *
 * Scientific Foundation (2024-2025):
 * - CAREForMe (MOBILESoft 2024) - Contextual MAB for mental health
 * - DIAMANTE Trial (JMIR 2024) - RL for depression, 19% improvement
 * - StayWell Trial (npj 2025) - CBT/DBT with RL, 25% depression reduction
 * - IntelligentPooling - Thompson Sampling for mHealth
 * - MRT Design (HeartSteps) - 210 randomizations per participant
 * - JITAI Framework - Just-In-Time Adaptive Interventions
 *
 * Key Algorithms:
 * - Thompson Sampling with Beta/Normal conjugate priors
 * - Contextual Bandits with state features
 * - Reward Shaping for sparse healthcare outcomes
 * - Exploration/Exploitation via UCB and Thompson
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

// ============================================================================
// CORE ENUMS & TYPES
// ============================================================================

/**
 * Intervention categories based on clinical taxonomy
 * Aligned with CAREForMe and StayWell frameworks
 */
export type InterventionCategory =
  | 'cognitive_restructuring'    // CBT thought challenges
  | 'behavioral_activation'      // Activity scheduling, engagement
  | 'mindfulness'               // Grounding, present-moment focus
  | 'psychoeducation'           // Information and learning
  | 'social_support'            // Connection and relationships
  | 'crisis_intervention'       // Immediate safety response
  | 'distress_tolerance'        // DBT skills
  | 'emotion_regulation'        // DBT skills
  | 'interpersonal_effectiveness' // DBT skills
  | 'physical_wellness'         // Exercise, sleep, nutrition
  | 'goal_setting'              // Motivational interviewing
  | 'self_compassion'           // Self-kindness practices
  | 'gratitude'                 // Positive psychology
  | 'values_clarification'      // ACT-based
  | 'acceptance'                // ACT-based
  | 'exposure'                  // Gradual approach
  | 'problem_solving';          // Structured problem resolution

/**
 * Intervention intensity levels (JITAI framework)
 */
export type InterventionIntensity =
  | 'micro'      // <30 seconds, quick prompt
  | 'brief'      // 1-3 minutes, short exercise
  | 'standard'   // 5-10 minutes, full exercise
  | 'extended'   // 15-30 minutes, deeper work
  | 'intensive'; // >30 minutes, crisis or deep session

/**
 * Delivery modality
 */
export type DeliveryModality =
  | 'text_message'
  | 'interactive_exercise'
  | 'guided_reflection'
  | 'audio_guidance'
  | 'image_prompt'
  | 'video_content'
  | 'chatbot_dialogue'
  | 'peer_connection';

/**
 * Outcome types for reward modeling
 * Based on DIAMANTE and StayWell outcome measures
 */
export type OutcomeType =
  | 'engagement'           // Did user interact?
  | 'completion'           // Did user finish exercise?
  | 'self_reported_mood'   // Mood rating after intervention
  | 'mood_improvement'     // Delta from baseline
  | 'symptom_reduction'    // Clinical scale improvement
  | 'behavioral_change'    // Activity, sleep, etc.
  | 'skill_acquisition'    // Learned and applied skill
  | 'crisis_averted'       // Prevented escalation
  | 'user_rating'          // Explicit feedback
  | 'return_engagement';   // Came back to platform

/**
 * Decision point types (MRT framework)
 * HeartSteps: 5 decision points/day, 210 total per 42-day study
 */
export type DecisionPointType =
  | 'scheduled'            // Fixed time points
  | 'event_triggered'      // Response to user event
  | 'state_triggered'      // Response to state change
  | 'user_initiated'       // User requested help
  | 'crisis_triggered'     // Emergency response
  | 'random';              // MRT random assignment

/**
 * Exploration strategy
 */
export type ExplorationStrategy =
  | 'thompson_sampling'    // Probability matching
  | 'ucb'                  // Upper Confidence Bound
  | 'epsilon_greedy'       // Random exploration
  | 'boltzmann'            // Softmax selection
  | 'gradient_bandit';     // Policy gradient

// ============================================================================
// INTERVENTION DEFINITION
// ============================================================================

/**
 * Complete intervention definition
 */
export interface IIntervention {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Detailed description */
  readonly description: string;

  /** Category classification */
  readonly category: InterventionCategory;

  /** Intensity level */
  readonly intensity: InterventionIntensity;

  /** Delivery method */
  readonly modality: DeliveryModality;

  /** Estimated duration in seconds */
  readonly estimatedDurationSeconds: number;

  /** Required user state conditions */
  readonly preconditions: IInterventionPreconditions;

  /** Contraindications - when NOT to use */
  readonly contraindications: IInterventionContraindications;

  /** Content in multiple languages */
  readonly content: IInterventionContent;

  /** Therapeutic mechanisms */
  readonly mechanisms: TherapeuticMechanism[];

  /** Target outcomes */
  readonly targetOutcomes: OutcomeType[];

  /** Evidence base strength */
  readonly evidenceLevel: EvidenceLevel;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Last update timestamp */
  readonly updatedAt: Date;

  /** Active status */
  readonly isActive: boolean;
}

/**
 * Preconditions for intervention eligibility
 */
export interface IInterventionPreconditions {
  /** Minimum emotional state (valence) */
  minValence?: number;

  /** Maximum emotional state (valence) */
  maxValence?: number;

  /** Minimum arousal */
  minArousal?: number;

  /** Maximum arousal */
  maxArousal?: number;

  /** Minimum energy level */
  minEnergy?: number;

  /** Maximum risk level allowed */
  maxRiskLevel?: 'none' | 'low' | 'moderate' | 'elevated' | 'high' | 'crisis';

  /** Required time available (seconds) */
  requiredTimeAvailable?: number;

  /** Time of day restrictions */
  allowedTimeOfDay?: TimeOfDay[];

  /** Minimum sessions completed */
  minSessionsCompleted?: number;

  /** Required previous interventions */
  requiredPriorInterventions?: string[];

  /** Cognitive distortions that should be present */
  targetDistortions?: string[];
}

/**
 * When NOT to deliver intervention
 */
export interface IInterventionContraindications {
  /** Active crisis state */
  crisisState?: boolean;

  /** Specific emotions to avoid */
  avoidEmotions?: string[];

  /** Maximum number of interventions per day */
  maxDailyInterventions?: number;

  /** Minimum time since last intervention (seconds) */
  minTimeSinceLastIntervention?: number;

  /** Specific distortions where this shouldn't be used */
  avoidWithDistortions?: string[];

  /** User has explicitly declined this type */
  userDeclined?: boolean;
}

/**
 * Time of day categories
 */
export type TimeOfDay = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night';

/**
 * Therapeutic mechanism of action
 */
export type TherapeuticMechanism =
  | 'cognitive_defusion'
  | 'behavioral_change'
  | 'emotional_processing'
  | 'social_connection'
  | 'physiological_regulation'
  | 'insight_generation'
  | 'skill_building'
  | 'motivation_enhancement'
  | 'self_awareness'
  | 'values_alignment';

/**
 * Evidence level classification
 */
export type EvidenceLevel =
  | 'meta_analysis'     // Highest: systematic review
  | 'rct'               // Randomized controlled trial
  | 'quasi_experimental'
  | 'observational'
  | 'expert_consensus'
  | 'theoretical';

/**
 * Multilingual content
 */
export interface IInterventionContent {
  /** English content */
  en: ILocalizedContent;

  /** Russian content */
  ru: ILocalizedContent;
}

/**
 * Content in single language
 */
export interface ILocalizedContent {
  /** Introduction text */
  introduction: string;

  /** Main instruction/exercise */
  mainContent: string;

  /** Step-by-step instructions if applicable */
  steps?: string[];

  /** Reflection prompts */
  reflectionPrompts?: string[];

  /** Closing/summary text */
  closing: string;

  /** Quick version for micro intensity */
  quickVersion?: string;
}

// ============================================================================
// CONTEXTUAL FEATURES (for Contextual Bandits)
// ============================================================================

/**
 * Context vector for contextual bandit
 * Features extracted from StateVector and environment
 */
export interface IContextualFeatures {
  // Emotional features
  valence: number;                    // -1 to 1
  arousal: number;                    // 0 to 1
  dominance: number;                  // 0 to 1
  emotionalStability: number;         // Variance over time
  moodTrend: 'improving' | 'stable' | 'declining';

  // Cognitive features
  cognitiveDistortionCount: number;
  primaryDistortion?: string;
  cognitiveFlexibility: number;       // 0 to 1
  insightLevel: number;               // 0 to 1

  // Resource features
  energyLevel: number;                // 0 to 1
  copingCapacity: number;             // 0 to 1
  socialSupport: number;              // 0 to 1

  // Risk features
  riskLevel: number;                  // 0 to 1
  crisisProximity: number;            // 0 to 1

  // Temporal features
  hourOfDay: number;                  // 0-23
  dayOfWeek: number;                  // 0-6
  minutesSinceLastInteraction: number;
  sessionsToday: number;
  sessionsTotalLifetime: number;
  daysSinceFirstSession: number;

  // Behavioral features
  averageSessionDuration: number;
  completionRate: number;             // 0 to 1
  engagementScore: number;            // 0 to 1
  preferredIntensity: InterventionIntensity;
  preferredCategory?: InterventionCategory;

  // Historical intervention features
  lastInterventionCategory?: InterventionCategory;
  lastInterventionOutcome?: number;   // -1 to 1
  interventionFatigue: number;        // 0 to 1
  categoryExposureCounts: Record<InterventionCategory, number>;
}

// ============================================================================
// BANDIT ARMS & STATISTICS
// ============================================================================

/**
 * Bandit arm representing an intervention option
 */
export interface IBanditArm {
  /** Intervention ID */
  interventionId: string;

  /** Number of times pulled */
  pullCount: number;

  /** Total reward accumulated */
  totalReward: number;

  /** Mean reward estimate */
  meanReward: number;

  /** Reward variance */
  rewardVariance: number;

  /** For Thompson Sampling: Beta distribution alpha */
  alphaSuccess: number;

  /** For Thompson Sampling: Beta distribution beta */
  betaFailure: number;

  /** For Normal Thompson: mean estimate */
  normalMean: number;

  /** For Normal Thompson: precision (1/variance) */
  normalPrecision: number;

  /** UCB value for exploration bonus */
  ucbValue: number;

  /** Last update timestamp */
  lastUpdated: Date;

  /** Last pull timestamp */
  lastPulled?: Date;
}

/**
 * Contextual bandit arm with feature weights
 */
export interface IContextualBanditArm extends IBanditArm {
  /** Linear model weights for features */
  featureWeights: Record<string, number>;

  /** Covariance matrix for LinUCB (flattened) */
  covarianceMatrix: number[];

  /** Feature vector accumulator */
  featureAccumulator: number[];

  /** Reward-weighted feature accumulator */
  rewardFeatureAccumulator: number[];
}

// ============================================================================
// DECISION POINTS & OUTCOMES
// ============================================================================

/**
 * A decision point where intervention may be delivered
 */
export interface IDecisionPoint {
  /** Unique identifier */
  id: string;

  /** User identifier */
  userId: string;

  /** Timestamp */
  timestamp: Date;

  /** Type of decision point */
  type: DecisionPointType;

  /** Contextual features at this point */
  context: IContextualFeatures;

  /** Whether intervention was delivered */
  interventionDelivered: boolean;

  /** Selected intervention if delivered */
  selectedIntervention?: string;

  /** Selection probability (for MRT) */
  selectionProbability?: number;

  /** Reason for selection/non-selection */
  selectionReason: string;

  /** Exploration flag */
  wasExploration: boolean;
}

/**
 * Outcome measurement after intervention
 */
export interface IInterventionOutcome {
  /** Decision point ID */
  decisionPointId: string;

  /** User identifier */
  userId: string;

  /** Intervention ID */
  interventionId: string;

  /** Timestamp of outcome measurement */
  timestamp: Date;

  /** Time elapsed since intervention (seconds) */
  latencySeconds: number;

  /** Outcome type */
  outcomeType: OutcomeType;

  /** Outcome value (-1 to 1, normalized) */
  value: number;

  /** Raw value before normalization */
  rawValue: number;

  /** Confidence in measurement */
  confidence: number;

  /** Context at outcome time */
  outcomeContext?: Partial<IContextualFeatures>;
}

/**
 * Reward signal for bandit update
 */
export interface IRewardSignal {
  /** Primary reward value (0 to 1 for Beta, unbounded for Normal) */
  reward: number;

  /** Immediate engagement reward */
  immediateReward: number;

  /** Delayed outcome reward */
  delayedReward: number;

  /** Shaped reward with auxiliary signals */
  shapedReward: number;

  /** Discount factor applied */
  discountFactor: number;

  /** Contributing outcomes */
  outcomes: IInterventionOutcome[];

  /** Reward shaping components */
  shapingComponents: IRewardShapingComponents;
}

/**
 * Reward shaping for sparse healthcare outcomes
 * Based on potential-based reward shaping (Ng et al.)
 */
export interface IRewardShapingComponents {
  /** Engagement bonus for interaction */
  engagementBonus: number;

  /** Completion bonus */
  completionBonus: number;

  /** Progress toward goal */
  progressPotential: number;

  /** Exploration bonus */
  explorationBonus: number;

  /** Novelty bonus */
  noveltyBonus: number;

  /** Diversity bonus (variety in interventions) */
  diversityBonus: number;

  /** Time appropriateness */
  timingBonus: number;

  /** Context match bonus */
  contextMatchBonus: number;
}

// ============================================================================
// USER INTERVENTION HISTORY
// ============================================================================

/**
 * User's intervention history and preferences
 */
export interface IUserInterventionProfile {
  /** User identifier */
  userId: string;

  /** Total interventions received */
  totalInterventions: number;

  /** Interventions by category */
  categoryHistory: Record<InterventionCategory, ICategoryStats>;

  /** Individual intervention stats */
  interventionStats: Record<string, IInterventionStats>;

  /** Preferred categories (learned) */
  preferredCategories: InterventionCategory[];

  /** Avoided categories (explicit or learned) */
  avoidedCategories: InterventionCategory[];

  /** Preferred intensity */
  preferredIntensity: InterventionIntensity;

  /** Preferred time of day */
  preferredTimeOfDay: TimeOfDay[];

  /** Overall engagement rate */
  engagementRate: number;

  /** Overall completion rate */
  completionRate: number;

  /** Average outcome improvement */
  averageOutcomeImprovement: number;

  /** Last intervention timestamp */
  lastInterventionAt?: Date;

  /** Profile creation date */
  createdAt: Date;

  /** Last update */
  updatedAt: Date;
}

/**
 * Statistics for a category
 */
export interface ICategoryStats {
  /** Number of interventions */
  count: number;

  /** Average reward */
  averageReward: number;

  /** Reward variance */
  rewardVariance: number;

  /** Engagement rate */
  engagementRate: number;

  /** Completion rate */
  completionRate: number;

  /** Last used */
  lastUsed?: Date;
}

/**
 * Statistics for individual intervention
 */
export interface IInterventionStats {
  /** Number of times delivered */
  deliveryCount: number;

  /** Number of engagements */
  engagementCount: number;

  /** Number of completions */
  completionCount: number;

  /** Total reward */
  totalReward: number;

  /** Average reward */
  averageReward: number;

  /** Best outcome achieved */
  bestOutcome: number;

  /** Last delivered */
  lastDelivered?: Date;

  /** User explicit feedback */
  userFeedback?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// OPTIMIZER CONFIGURATION
// ============================================================================

/**
 * Intervention optimizer configuration
 */
export interface IOptimizerConfig {
  /** Exploration strategy */
  explorationStrategy: ExplorationStrategy;

  /** Epsilon for epsilon-greedy (0 to 1) */
  epsilon: number;

  /** Temperature for Boltzmann (softmax) */
  temperature: number;

  /** UCB exploration constant */
  ucbConstant: number;

  /** Thompson Sampling prior strength */
  thompsonPriorStrength: number;

  /** Minimum pulls before exploitation */
  minPullsPerArm: number;

  /** Reward discount factor */
  rewardDiscountFactor: number;

  /** Delayed reward weight */
  delayedRewardWeight: number;

  /** Immediate reward weight */
  immediateRewardWeight: number;

  /** Enable reward shaping */
  enableRewardShaping: boolean;

  /** Reward shaping weights */
  rewardShapingWeights: IRewardShapingWeights;

  /** Maximum interventions per day */
  maxInterventionsPerDay: number;

  /** Minimum time between interventions (seconds) */
  minInterventionIntervalSeconds: number;

  /** Enable contextual features */
  enableContextualBandit: boolean;

  /** Feature regularization (L2) */
  contextualRegularization: number;

  /** Enable MRT-style randomization */
  enableMRTRandomization: boolean;

  /** MRT randomization probability */
  mrtRandomizationProbability: number;

  /** Enable crisis override */
  enableCrisisOverride: boolean;

  /** Learning rate for online updates */
  learningRate: number;

  /** Batch size for batch updates */
  batchSize: number;
}

/**
 * Reward shaping weights
 */
export interface IRewardShapingWeights {
  engagementBonus: number;
  completionBonus: number;
  progressPotential: number;
  explorationBonus: number;
  noveltyBonus: number;
  diversityBonus: number;
  timingBonus: number;
  contextMatchBonus: number;
}

/**
 * Default optimizer configuration
 */
export const DEFAULT_OPTIMIZER_CONFIG: IOptimizerConfig = {
  explorationStrategy: 'thompson_sampling',
  epsilon: 0.1,
  temperature: 1.0,
  ucbConstant: 2.0,
  thompsonPriorStrength: 1.0,
  minPullsPerArm: 5,
  rewardDiscountFactor: 0.95,
  delayedRewardWeight: 0.6,
  immediateRewardWeight: 0.4,
  enableRewardShaping: true,
  rewardShapingWeights: {
    engagementBonus: 0.2,
    completionBonus: 0.3,
    progressPotential: 0.15,
    explorationBonus: 0.1,
    noveltyBonus: 0.05,
    diversityBonus: 0.1,
    timingBonus: 0.05,
    contextMatchBonus: 0.05,
  },
  maxInterventionsPerDay: 10,
  minInterventionIntervalSeconds: 3600, // 1 hour
  enableContextualBandit: true,
  contextualRegularization: 1.0,
  enableMRTRandomization: false,
  mrtRandomizationProbability: 0.5,
  enableCrisisOverride: true,
  learningRate: 0.01,
  batchSize: 32,
};

// ============================================================================
// SELECTION RESULT
// ============================================================================

/**
 * Result of intervention selection
 */
export interface IInterventionSelection {
  /** Selected intervention */
  intervention: IIntervention;

  /** Selection confidence */
  confidence: number;

  /** Expected reward */
  expectedReward: number;

  /** Selection probability */
  probability: number;

  /** Whether this was exploration */
  isExploration: boolean;

  /** Exploration strategy used */
  explorationStrategy: ExplorationStrategy;

  /** Alternative interventions considered */
  alternatives: IAlternativeIntervention[];

  /** Selection reasoning */
  reasoning: ISelectionReasoning;

  /** Decision point */
  decisionPoint: IDecisionPoint;
}

/**
 * Alternative intervention considered
 */
export interface IAlternativeIntervention {
  interventionId: string;
  expectedReward: number;
  probability: number;
  reasonNotSelected: string;
}

/**
 * Detailed reasoning for selection
 */
export interface ISelectionReasoning {
  /** Primary selection factor */
  primaryFactor: string;

  /** Context features that influenced decision */
  influentialFeatures: Array<{
    feature: string;
    value: number;
    influence: 'positive' | 'negative' | 'neutral';
  }>;

  /** Why alternatives were rejected */
  rejectionReasons: Record<string, string>;

  /** Exploration vs exploitation explanation */
  exploitationExplanation: string;

  /** Clinical appropriateness notes */
  clinicalNotes?: string;
}

// ============================================================================
// OPTIMIZER STATE
// ============================================================================

/**
 * Complete optimizer state (for persistence)
 */
export interface IOptimizerState {
  /** Configuration */
  config: IOptimizerConfig;

  /** All bandit arms */
  arms: Record<string, IBanditArm | IContextualBanditArm>;

  /** User profiles */
  userProfiles: Record<string, IUserInterventionProfile>;

  /** Recent decision points */
  recentDecisionPoints: IDecisionPoint[];

  /** Pending outcomes (awaiting measurement) */
  pendingOutcomes: Array<{
    decisionPointId: string;
    expectedOutcomeTime: Date;
  }>;

  /** Global statistics */
  globalStats: IGlobalStats;

  /** Last update timestamp */
  lastUpdated: Date;

  /** Version for migration */
  version: string;
}

/**
 * Global optimizer statistics
 */
export interface IGlobalStats {
  /** Total decision points */
  totalDecisionPoints: number;

  /** Total interventions delivered */
  totalInterventionsDelivered: number;

  /** Overall engagement rate */
  overallEngagementRate: number;

  /** Overall outcome improvement */
  overallOutcomeImprovement: number;

  /** Exploration ratio */
  explorationRatio: number;

  /** Category distribution */
  categoryDistribution: Record<InterventionCategory, number>;

  /** Time-of-day distribution */
  timeOfDayDistribution: Record<TimeOfDay, number>;

  /** Reward trend (last 7 days) */
  rewardTrend: number[];
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * 🎯 Main Intervention Optimizer Interface
 *
 * Multi-Armed Bandit + Contextual Bandit + Reinforcement Learning
 * for optimal intervention selection in mental health context
 */
export interface IInterventionOptimizer {
  // ========================
  // CORE SELECTION
  // ========================

  /**
   * Select optimal intervention for user
   * @param userId - User identifier
   * @param context - Contextual features
   * @param availableInterventions - Pool of available interventions
   * @returns Selected intervention with reasoning
   */
  selectIntervention(
    userId: string,
    context: IContextualFeatures,
    availableInterventions: IIntervention[]
  ): Promise<IInterventionSelection>;

  /**
   * Check if intervention should be delivered at this decision point
   * @param userId - User identifier
   * @param context - Contextual features
   * @param decisionPointType - Type of decision point
   * @returns Whether to deliver intervention
   */
  shouldDeliver(
    userId: string,
    context: IContextualFeatures,
    decisionPointType: DecisionPointType
  ): Promise<boolean>;

  /**
   * Get top-k intervention recommendations
   * @param userId - User identifier
   * @param context - Contextual features
   * @param k - Number of recommendations
   * @param availableInterventions - Pool of available interventions
   * @returns Top-k interventions with scores
   */
  getTopKRecommendations(
    userId: string,
    context: IContextualFeatures,
    k: number,
    availableInterventions: IIntervention[]
  ): Promise<IInterventionSelection[]>;

  // ========================
  // REWARD & LEARNING
  // ========================

  /**
   * Record outcome and update bandit
   * @param outcome - Intervention outcome
   */
  recordOutcome(outcome: IInterventionOutcome): Promise<void>;

  /**
   * Compute reward signal from outcomes
   * @param outcomes - Collection of outcomes
   * @param context - Context at intervention time
   * @returns Computed reward signal
   */
  computeReward(
    outcomes: IInterventionOutcome[],
    context: IContextualFeatures
  ): IRewardSignal;

  /**
   * Update bandit arm with reward
   * @param interventionId - Intervention identifier
   * @param reward - Reward signal
   * @param context - Context if contextual bandit
   */
  updateArm(
    interventionId: string,
    reward: IRewardSignal,
    context?: IContextualFeatures
  ): Promise<void>;

  /**
   * Batch update from multiple outcomes
   * @param outcomes - Batch of outcomes
   */
  batchUpdate(outcomes: IInterventionOutcome[]): Promise<void>;

  // ========================
  // USER PROFILE
  // ========================

  /**
   * Get or create user intervention profile
   * @param userId - User identifier
   * @returns User profile
   */
  getUserProfile(userId: string): Promise<IUserInterventionProfile>;

  /**
   * Update user preferences
   * @param userId - User identifier
   * @param preferences - Preference updates
   */
  updateUserPreferences(
    userId: string,
    preferences: Partial<IUserInterventionProfile>
  ): Promise<void>;

  /**
   * Record user explicit feedback
   * @param userId - User identifier
   * @param interventionId - Intervention identifier
   * @param feedback - User feedback
   */
  recordUserFeedback(
    userId: string,
    interventionId: string,
    feedback: 'positive' | 'neutral' | 'negative'
  ): Promise<void>;

  // ========================
  // INTERVENTION MANAGEMENT
  // ========================

  /**
   * Register new intervention
   * @param intervention - Intervention definition
   */
  registerIntervention(intervention: IIntervention): Promise<void>;

  /**
   * Update intervention definition
   * @param interventionId - Intervention identifier
   * @param updates - Updates to apply
   */
  updateIntervention(
    interventionId: string,
    updates: Partial<IIntervention>
  ): Promise<void>;

  /**
   * Deactivate intervention
   * @param interventionId - Intervention identifier
   */
  deactivateIntervention(interventionId: string): Promise<void>;

  /**
   * Get intervention by ID
   * @param interventionId - Intervention identifier
   * @returns Intervention if found
   */
  getIntervention(interventionId: string): Promise<IIntervention | null>;

  /**
   * Filter eligible interventions for context
   * @param interventions - All interventions
   * @param context - Current context
   * @param userProfile - User profile
   * @returns Eligible interventions
   */
  filterEligibleInterventions(
    interventions: IIntervention[],
    context: IContextualFeatures,
    userProfile: IUserInterventionProfile
  ): IIntervention[];

  // ========================
  // STATISTICS & ANALYTICS
  // ========================

  /**
   * Get arm statistics
   * @param interventionId - Intervention identifier
   * @returns Arm statistics
   */
  getArmStats(interventionId: string): Promise<IBanditArm | null>;

  /**
   * Get global optimizer statistics
   * @returns Global statistics
   */
  getGlobalStats(): Promise<IGlobalStats>;

  /**
   * Get optimizer state for persistence
   * @returns Complete optimizer state
   */
  getState(): Promise<IOptimizerState>;

  /**
   * Load optimizer state
   * @param state - State to load
   */
  loadState(state: IOptimizerState): Promise<void>;

  // ========================
  // EXPLORATION CONTROL
  // ========================

  /**
   * Sample from Thompson Sampling posterior
   * @param arm - Bandit arm
   * @returns Sampled value
   */
  thompsonSample(arm: IBanditArm): number;

  /**
   * Calculate UCB value for arm
   * @param arm - Bandit arm
   * @param totalPulls - Total pulls across all arms
   * @returns UCB value
   */
  calculateUCB(arm: IBanditArm, totalPulls: number): number;

  /**
   * Get exploration probability
   * @returns Current exploration probability
   */
  getExplorationProbability(): number;

  /**
   * Decay exploration rate
   * @param decayFactor - Factor to decay by
   */
  decayExploration(decayFactor: number): void;

  // ========================
  // CRISIS HANDLING
  // ========================

  /**
   * Get crisis intervention (bypasses bandit)
   * @param context - Current context
   * @returns Crisis intervention
   */
  getCrisisIntervention(context: IContextualFeatures): Promise<IIntervention>;

  /**
   * Check if context indicates crisis
   * @param context - Current context
   * @returns Whether crisis is detected
   */
  isCrisisContext(context: IContextualFeatures): boolean;

  // ========================
  // CONFIGURATION
  // ========================

  /**
   * Update optimizer configuration
   * @param config - Configuration updates
   */
  updateConfig(config: Partial<IOptimizerConfig>): void;

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): IOptimizerConfig;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory function signature for creating optimizer
 */
export type CreateInterventionOptimizer = (
  config?: Partial<IOptimizerConfig>
) => IInterventionOptimizer;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Intervention categories with descriptions
 */
export const INTERVENTION_CATEGORIES: Record<InterventionCategory, {
  name: string;
  description: string;
  evidenceBase: string;
}> = {
  cognitive_restructuring: {
    name: 'Cognitive Restructuring',
    description: 'Challenge and reframe unhelpful thoughts',
    evidenceBase: 'CBT core technique, extensive RCT support',
  },
  behavioral_activation: {
    name: 'Behavioral Activation',
    description: 'Increase engagement in valued activities',
    evidenceBase: 'Strong evidence for depression (Dimidjian et al., 2006)',
  },
  mindfulness: {
    name: 'Mindfulness',
    description: 'Present-moment awareness without judgment',
    evidenceBase: 'MBCT prevents depression relapse (Segal et al., 2010)',
  },
  psychoeducation: {
    name: 'Psychoeducation',
    description: 'Information about mental health and coping',
    evidenceBase: 'Foundation of most evidence-based treatments',
  },
  social_support: {
    name: 'Social Support',
    description: 'Connection with others for emotional support',
    evidenceBase: 'Strong protective factor (Cohen & Wills, 1985)',
  },
  crisis_intervention: {
    name: 'Crisis Intervention',
    description: 'Immediate safety and stabilization',
    evidenceBase: 'Essential for acute risk management',
  },
  distress_tolerance: {
    name: 'Distress Tolerance',
    description: 'Skills to survive crisis without making things worse',
    evidenceBase: 'DBT core module (Linehan, 1993)',
  },
  emotion_regulation: {
    name: 'Emotion Regulation',
    description: 'Skills to understand and manage emotions',
    evidenceBase: 'DBT core module, transdiagnostic relevance',
  },
  interpersonal_effectiveness: {
    name: 'Interpersonal Effectiveness',
    description: 'Skills for healthy relationships',
    evidenceBase: 'DBT core module',
  },
  physical_wellness: {
    name: 'Physical Wellness',
    description: 'Exercise, sleep, and nutrition for mental health',
    evidenceBase: 'Exercise comparable to antidepressants (Blumenthal et al., 2007)',
  },
  goal_setting: {
    name: 'Goal Setting',
    description: 'Setting and working toward meaningful goals',
    evidenceBase: 'Motivational Interviewing, Self-Determination Theory',
  },
  self_compassion: {
    name: 'Self-Compassion',
    description: 'Kindness toward oneself in difficult moments',
    evidenceBase: 'Neff research, reduces depression and anxiety',
  },
  gratitude: {
    name: 'Gratitude',
    description: 'Appreciating positive aspects of life',
    evidenceBase: 'Positive psychology intervention (Emmons & McCullough, 2003)',
  },
  values_clarification: {
    name: 'Values Clarification',
    description: 'Identifying what matters most',
    evidenceBase: 'ACT core process (Hayes et al., 2006)',
  },
  acceptance: {
    name: 'Acceptance',
    description: 'Making room for difficult experiences',
    evidenceBase: 'ACT core process, alternative to avoidance',
  },
  exposure: {
    name: 'Exposure',
    description: 'Gradual approach to feared situations',
    evidenceBase: 'Gold standard for anxiety disorders',
  },
  problem_solving: {
    name: 'Problem Solving',
    description: 'Structured approach to solving problems',
    evidenceBase: 'PST effective for depression (Cuijpers et al., 2007)',
  },
};

/**
 * Time of day hour ranges
 */
export const TIME_OF_DAY_HOURS: Record<TimeOfDay, [number, number]> = {
  early_morning: [5, 7],
  morning: [7, 12],
  midday: [12, 14],
  afternoon: [14, 17],
  evening: [17, 21],
  night: [21, 24],
  late_night: [0, 5],
};

/**
 * Default reward shaping weights based on DIAMANTE trial
 */
export const DIAMANTE_REWARD_WEIGHTS: IRewardShapingWeights = {
  engagementBonus: 0.25,
  completionBonus: 0.35,
  progressPotential: 0.15,
  explorationBonus: 0.05,
  noveltyBonus: 0.05,
  diversityBonus: 0.05,
  timingBonus: 0.05,
  contextMatchBonus: 0.05,
};
