/**
 * SleepCoreAdapter - Bridge between SleepCore Domain and CogniCore Engine
 * =========================================================================
 *
 * Phase 2 Integration: Connects sleep-specific state and actions to
 * CogniCore's universal POMDP framework.
 *
 * Responsibilities:
 * - Map ISleepState ↔ IFullBeliefState (CogniCore Bayesian beliefs)
 * - Map ISleepMetrics → Observation (for belief updates)
 * - Map SleepAction ↔ IIntervention (CogniCore interventions)
 * - Select interventions via InterventionOptimizer (Thompson Sampling)
 * - Record outcomes for adaptive learning
 * - Provide explainability for intervention decisions
 *
 * Scientific Foundation:
 * - Thompson Sampling (IntelligentPooling, 2024)
 * - Contextual Bandits (CAREForMe, MOBILESoft 2024)
 * - CBT-I Protocol (Espie et al., Lancet 2019)
 *
 * @packageDocumentation
 * @module @sleepcore/platform
 */

import type {
  IFullBeliefState,
  Observation,
  ObservationType,
  BeliefUpdateResult,
  IBeliefUpdateEngine,
  DimensionBelief,
  IIntervention,
  IInterventionSelection,
  IInterventionOutcome,
  IContextualFeatures,
  IInterventionOptimizer,
  InterventionCategory,
  InterventionIntensity,
  IUserInterventionProfile,
  IExplainabilityService,
  IUserExplanation,
  IUserFactor,
  IExplanationRequest,
  IExplanationResponse,
  // Motivational Engine Types (Phase 5)
  IMotivationalState,
  IMotivationalInterviewingEngine,
  ClientUtterance,
  ChangeTaskSubtype,
  MIResponse,
  MIResponseContext,
  MIStrategy,
  MIFidelityReport,
} from '@cognicore/engine';

import {
  ExplainabilityService,
  createExplainabilityService,
  // Motivational Engine (Phase 5)
  MotivationalEngine,
  MotivationalStateFactory,
} from '@cognicore/engine';

import type {
  ISleepState,
  ISleepMetrics,
  ISleepCognitions,
} from '../sleep/interfaces/ISleepState';

import type { SleepAction, IActionStats } from './SleepCorePOMDP';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * CBT-I Component mapping
 */
export type CBTIComponent =
  | 'sleep_restriction'
  | 'stimulus_control'
  | 'cognitive_restructuring'
  | 'sleep_hygiene'
  | 'relaxation';

/**
 * Sleep intervention selection result
 */
export interface ISleepInterventionSelection {
  /** Selected sleep action */
  action: SleepAction;

  /** CBT-I component this action belongs to */
  component: CBTIComponent;

  /** Confidence in this selection (0-1) */
  confidence: number;

  /** Human-readable explanation */
  explanation: string;

  /** CogniCore intervention ID */
  interventionId: string;

  /** Was this an exploration (vs exploitation) */
  isExploration: boolean;

  /** Alternative actions considered */
  alternatives: Array<{
    action: SleepAction;
    confidence: number;
  }>;
}

/**
 * Detailed sleep intervention explanation (using CogniCore ExplainabilityService)
 */
export interface ISleepInterventionExplanation {
  /** Summary of why this intervention was selected */
  summary: string;

  /** Summary in Russian */
  summaryRu: string;

  /** Detailed reasoning */
  reasoning: string;

  /** Detailed reasoning in Russian */
  reasoningRu: string;

  /** Key factors that influenced the decision */
  keyFactors: Array<{
    name: string;
    nameRu: string;
    value: string;
    impact: 'helps' | 'hurts' | 'neutral';
    emoji: string;
    explanation: string;
    explanationRu: string;
  }>;

  /** Confidence level */
  confidence: {
    level: 'low' | 'medium' | 'high';
    emoji: string;
    description: string;
    descriptionRu: string;
  };

  /** What the user can do to improve */
  actionableAdvice: string[];
  actionableAdviceRu: string[];

  /** Counterfactual: what would change the recommendation */
  whatWouldChange?: string[];
  whatWouldChangeRu?: string[];

  /** Limitations of the AI recommendation */
  limitations: string[];
  limitationsRu: string[];

  /** Disclaimer */
  disclaimer: string;
  disclaimerRu: string;
}

/**
 * Sleep motivational context types (Phase 5: MI Integration)
 */
export type SleepMotivationalContext =
  | 'streak_broken'          // User broke their sleep tracking streak
  | 'low_adherence'          // Low adherence to sleep schedule
  | 'plateau'                // No improvement despite following protocol
  | 'early_dropout_risk'     // Risk of early dropout detected
  | 'resistance_to_change'   // User expressing resistance to changes
  | 'sleep_window_challenge' // Difficulty with sleep restriction
  | 'relapse'                // Return of insomnia symptoms after improvement
  | 'setback'                // Temporary setback (stress, illness)
  | 'ambivalence';           // Mixed feelings about treatment

/**
 * Sleep-specific motivational response
 */
export interface ISleepMotivationalResponse {
  /** The MI-style response text */
  text: string;

  /** Russian version */
  textRu: string;

  /** MI technique used */
  technique: 'open_question' | 'affirmation' | 'reflection' | 'summary';

  /** Target change talk type being elicited */
  targetChangeTalk?: ChangeTaskSubtype;

  /** MI strategy being employed */
  strategy: MIStrategy;

  /** Expected impact on change talk */
  expectedImpact: 'increase_ct' | 'decrease_st' | 'explore' | 'neutral';

  /** Confidence in this response (0-1) */
  confidence: number;

  /** Follow-up suggestions */
  followUpSuggestions: string[];
  followUpSuggestionsRu: string[];

  /** Personalization note */
  personalizationNote?: string;
  personalizationNoteRu?: string;
}

/**
 * User speech analysis result for MI
 */
export interface ISpeechAnalysisResult {
  /** Detected category */
  category: 'change_talk' | 'sustain_talk' | 'neutral';

  /** Specific subtype if change/sustain talk */
  subtype?: ChangeTaskSubtype | string;

  /** Strength of the detected language (0-1) */
  strength: number;

  /** Confidence in classification (0-1) */
  confidence: number;

  /** Evidence spans in the text */
  evidenceSpans: Array<{
    start: number;
    end: number;
    text: string;
    pattern: string;
  }>;

  /** Interpretation for the clinician */
  interpretation: string;
  interpretationRu: string;
}

/**
 * Adapter configuration
 */
export interface ISleepCoreAdapterConfig {
  /** Enable Thompson Sampling exploration */
  enableExploration: boolean;

  /** Exploration temperature (higher = more exploration) */
  explorationTemperature: number;

  /** Minimum observations before trusting estimates */
  minObservationsPerAction: number;

  /** Language for explanations */
  language: 'ru' | 'en';

  /** Enable verbose logging */
  debug: boolean;
}

/**
 * Default adapter configuration
 */
const DEFAULT_ADAPTER_CONFIG: ISleepCoreAdapterConfig = {
  enableExploration: true,
  explorationTemperature: 1.0,
  minObservationsPerAction: 3,
  language: 'ru',
  debug: false,
};

// ============================================================================
// MAPPING CONSTANTS
// ============================================================================

/**
 * Map SleepAction to CogniCore intervention ID
 */
export const SLEEP_ACTION_TO_INTERVENTION_ID: Record<SleepAction, string> = {
  'adjust_sleep_window': 'sleep_restriction_adjust',
  'enforce_wake_time': 'sleep_restriction_enforce',
  'leave_bed_reminder': 'stimulus_control_leave',
  'bed_restriction': 'stimulus_control_restrict',
  'challenge_belief': 'cognitive_challenge',
  'behavioral_experiment': 'cognitive_experiment',
  'caffeine_education': 'hygiene_caffeine',
  'environment_advice': 'hygiene_environment',
  'relaxation_pmr': 'relaxation_pmr',
  'relaxation_breathing': 'relaxation_breathing',
  'relaxation_imagery': 'relaxation_imagery',
  'no_intervention': 'no_action',
};

/**
 * Map CogniCore intervention ID to SleepAction
 */
export const INTERVENTION_ID_TO_SLEEP_ACTION: Record<string, SleepAction> = {
  'sleep_restriction_adjust': 'adjust_sleep_window',
  'sleep_restriction_enforce': 'enforce_wake_time',
  'stimulus_control_leave': 'leave_bed_reminder',
  'stimulus_control_restrict': 'bed_restriction',
  'cognitive_challenge': 'challenge_belief',
  'cognitive_experiment': 'behavioral_experiment',
  'hygiene_caffeine': 'caffeine_education',
  'hygiene_environment': 'environment_advice',
  'relaxation_pmr': 'relaxation_pmr',
  'relaxation_breathing': 'relaxation_breathing',
  'relaxation_imagery': 'relaxation_imagery',
  'no_action': 'no_intervention',
};

/**
 * Map SleepAction to CBT-I Component
 */
export const SLEEP_ACTION_TO_COMPONENT: Record<SleepAction, CBTIComponent> = {
  'adjust_sleep_window': 'sleep_restriction',
  'enforce_wake_time': 'sleep_restriction',
  'leave_bed_reminder': 'stimulus_control',
  'bed_restriction': 'stimulus_control',
  'challenge_belief': 'cognitive_restructuring',
  'behavioral_experiment': 'cognitive_restructuring',
  'caffeine_education': 'sleep_hygiene',
  'environment_advice': 'sleep_hygiene',
  'relaxation_pmr': 'relaxation',
  'relaxation_breathing': 'relaxation',
  'relaxation_imagery': 'relaxation',
  'no_intervention': 'sleep_hygiene', // Default
};

/**
 * Map CBT-I Component to CogniCore InterventionCategory
 */
export const COMPONENT_TO_CATEGORY: Record<CBTIComponent, InterventionCategory> = {
  'sleep_restriction': 'behavioral_activation',
  'stimulus_control': 'behavioral_activation',
  'cognitive_restructuring': 'cognitive_restructuring',
  'sleep_hygiene': 'psychoeducation',
  'relaxation': 'mindfulness',
};

// ============================================================================
// SLEEP CORE ADAPTER
// ============================================================================

/**
 * SleepCoreAdapter - Bridge between SleepCore and CogniCore Engine
 *
 * Uses dependency injection for CogniCore engines.
 * When engines are not provided, uses local stub implementations.
 *
 * @example
 * ```typescript
 * // With CogniCore engines (production)
 * const adapter = createSleepCoreAdapter({}, beliefEngine, optimizer);
 *
 * // Without engines (standalone mode with stubs)
 * const adapter = createSleepCoreAdapter();
 *
 * // Select next intervention
 * const selection = await adapter.selectIntervention(sleepState);
 * console.log(selection.action); // 'leave_bed_reminder'
 * ```
 */
export class SleepCoreAdapter {
  private config: ISleepCoreAdapterConfig;
  private beliefEngine: IBeliefUpdateEngine | null;
  private interventionOptimizer: IInterventionOptimizer | null;
  private explainabilityService: ExplainabilityService;
  private userBeliefs: Map<string, IFullBeliefState> = new Map();
  private interventions: IIntervention[] = [];

  // Local stats for standalone mode (when no optimizer provided)
  private localStats: Map<string, Map<SleepAction, { alpha: number; beta: number; count: number }>> = new Map();

  // Phase 5: Motivational Engine
  private motivationalEngine: MotivationalEngine;
  private motivationalStateFactory: MotivationalStateFactory;
  private userMotivationalStates: Map<string, IMotivationalState> = new Map();

  constructor(
    config: Partial<ISleepCoreAdapterConfig> = {},
    beliefEngine?: IBeliefUpdateEngine,
    interventionOptimizer?: IInterventionOptimizer
  ) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
    this.beliefEngine = beliefEngine || null;
    this.interventionOptimizer = interventionOptimizer || null;
    this.explainabilityService = createExplainabilityService();

    // Phase 5: Initialize Motivational Engine
    this.motivationalEngine = new MotivationalEngine();
    this.motivationalStateFactory = new MotivationalStateFactory(this.motivationalEngine);

    // Register sleep interventions
    this.registerSleepInterventions();
  }

  // ==========================================================================
  // STATE CONVERSION
  // ==========================================================================

  /**
   * Convert ISleepState to CogniCore IFullBeliefState
   *
   * Maps sleep-specific dimensions to CogniCore's universal belief structure:
   * - emotional.valence → inverse of sleepAnxiety
   * - emotional.arousal → preSleepArousal
   * - cognitive.selfView → sleepSelfEfficacy
   * - risk.overallRisk → normalized ISI score
   * - resources.energy → sleep efficiency
   */
  sleepStateToBeliefState(sleepState: ISleepState): IFullBeliefState {
    const now = new Date();

    // Create dimension beliefs from sleep state
    const createDimensionBelief = (
      dimension: string,
      value: number,
      variance: number = 0.1
    ): DimensionBelief => ({
      dimension,
      prior: {
        mean: 0.5,
        variance: 0.25,
        sampleSize: 1,
        lastUpdated: now,
      },
      posterior: {
        mean: value,
        variance: variance,
        credibleInterval: {
          lower: Math.max(0, value - 1.96 * Math.sqrt(variance)),
          upper: Math.min(1, value + 1.96 * Math.sqrt(variance)),
        },
        updatedAt: now,
        basedOnObservations: 1,
      },
      beliefShift: 0,
      informationGain: 0,
      stability: 0.8,
    });

    // Calculate normalized values
    const sleepAnxiety = sleepState.cognitions.sleepAnxiety;
    const preSleepArousal = sleepState.cognitions.preSleepArousal;
    const sleepSelfEfficacy = sleepState.cognitions.sleepSelfEfficacy;
    const sleepEfficiency = sleepState.metrics.sleepEfficiency / 100;
    const isiNormalized = sleepState.insomnia.isiScore / 28;

    // Map to CogniCore belief dimensions
    return {
      userId: sleepState.userId,
      timestamp: now,

      emotional: {
        // Valence: inverse of sleep anxiety (low anxiety = high valence)
        valence: createDimensionBelief('valence', 1 - sleepAnxiety, 0.15),
        // Arousal: pre-sleep arousal directly maps
        arousal: createDimensionBelief('arousal', preSleepArousal, 0.12),
        // Dominance: sleep self-efficacy
        dominance: createDimensionBelief('dominance', sleepSelfEfficacy, 0.18),
        primaryEmotion: {
          distribution: new Map([
            ['anxiety', sleepAnxiety],
            ['calm', 1 - preSleepArousal],
            ['frustration', sleepState.insomnia.sleepDistress],
            ['neutral', 0.3],
          ]),
          entropy: this.calculateEntropy([sleepAnxiety, 1 - preSleepArousal, sleepState.insomnia.sleepDistress, 0.3]),
        },
      },

      cognitive: {
        // Self-view: sleep self-efficacy
        selfView: createDimensionBelief('selfView', sleepSelfEfficacy, 0.15),
        // World-view: treatment adherence
        worldView: createDimensionBelief('worldView', 0.6, 0.2),
        // Future-view: inverse of catastrophizing
        futureView: createDimensionBelief(
          'futureView',
          sleepState.cognitions.beliefs.catastrophizing ? 0.3 : 0.7,
          0.2
        ),
        distortionPresence: new Map([
          ['catastrophizing', sleepState.cognitions.beliefs.catastrophizing ? 0.8 : 0.1],
          ['magnification', sleepState.cognitions.beliefs.healthWorries ? 0.7 : 0.1],
          ['all_or_nothing', sleepState.cognitions.beliefs.unrealisticExpectations ? 0.7 : 0.1],
        ]),
      },

      risk: {
        // Overall risk based on ISI score
        overallRisk: createDimensionBelief('overallRisk', isiNormalized, 0.1),
        categoryRisks: new Map([
          ['insomnia', createDimensionBelief('insomnia', isiNormalized, 0.1)],
          ['circadian_disruption', createDimensionBelief(
            'circadian_disruption',
            Math.min(1, Math.abs(sleepState.circadian.phaseDeviation) / 3),
            0.15
          )],
          ['daytime_impairment', createDimensionBelief(
            'daytime_impairment',
            sleepState.insomnia.daytimeImpact,
            0.12
          )],
        ]),
      },

      resources: {
        // Energy: based on sleep efficiency and daytime sleepiness
        energy: createDimensionBelief(
          'energy',
          sleepEfficiency * (1 - sleepState.daytimeSleepiness),
          0.15
        ),
        // Coping: sleep self-efficacy
        copingCapacity: createDimensionBelief('copingCapacity', sleepSelfEfficacy, 0.18),
        // Social support: placeholder
        socialSupport: createDimensionBelief('socialSupport', 0.5, 0.25),
        perma: {
          positive: createDimensionBelief('positive', 1 - sleepAnxiety, 0.2),
          engagement: createDimensionBelief('engagement', 0.5, 0.25),
          relationships: createDimensionBelief('relationships', 0.5, 0.25),
          meaning: createDimensionBelief('meaning', 0.5, 0.25),
          accomplishment: createDimensionBelief('accomplishment', sleepSelfEfficacy, 0.2),
        },
      },

      meta: {
        overallConfidence: sleepState.dataQuality,
        totalObservations: 1,
        averageInformationGain: 0.1,
        beliefConsistency: 0.8,
        predictionAccuracy: 0.7,
      },
    };
  }

  /**
   * Convert ISleepMetrics to CogniCore Observation
   */
  metricsToObservation(
    metrics: ISleepMetrics,
    source: 'diary' | 'wearable' | 'hybrid' = 'diary'
  ): Observation {
    // Normalize metrics to 0-1 range
    const normalizedSE = metrics.sleepEfficiency / 100;
    const normalizedSOL = Math.min(1, metrics.sleepOnsetLatency / 60); // Cap at 60 min
    const normalizedWASO = Math.min(1, metrics.wakeAfterSleepOnset / 120); // Cap at 120 min
    const normalizedTST = Math.min(1, metrics.totalSleepTime / 540); // Target 9h max

    // Reliability based on source
    const reliability = source === 'wearable' ? 0.85 : source === 'hybrid' ? 0.9 : 0.75;

    return {
      id: `sleep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'behavioral' as ObservationType,
      timestamp: new Date(),
      data: {
        sleep_efficiency: normalizedSE,
        sleep_onset_latency: normalizedSOL,
        waso: normalizedWASO,
        total_sleep_time: normalizedTST,
        time_in_bed: metrics.timeInBed,
        awakenings: metrics.numberOfAwakenings,
        bedtime: metrics.bedtime,
        wake_time: metrics.wakeTime,
        source: source,
      },
      reliability,
      informsComponents: ['emotional', 'cognitive', 'resources'],
    };
  }

  /**
   * Convert ISleepCognitions to CogniCore Observation
   */
  cognitionsToObservation(cognitions: ISleepCognitions): Observation {
    return {
      id: `cognition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'self_report_mood' as ObservationType,
      timestamp: new Date(),
      data: {
        sleep_anxiety: cognitions.sleepAnxiety,
        pre_sleep_arousal: cognitions.preSleepArousal,
        sleep_self_efficacy: cognitions.sleepSelfEfficacy,
        dbas_score: cognitions.dbasScore,
        beliefs: cognitions.beliefs,
      },
      reliability: 0.85,
      informsComponents: ['emotional', 'cognitive', 'risk'],
    };
  }

  // ==========================================================================
  // INTERVENTION SELECTION
  // ==========================================================================

  /**
   * Select next intervention using CogniCore's Thompson Sampling
   * Falls back to local Thompson Sampling if optimizer not provided.
   *
   * @param sleepState Current sleep state
   * @param userId User identifier
   * @returns Selected intervention with explanation
   */
  async selectIntervention(
    sleepState: ISleepState,
    userId?: string
  ): Promise<ISleepInterventionSelection> {
    const uid = userId || sleepState.userId;

    // Get valid interventions based on sleep state
    const validActions = this.getValidActions(sleepState);

    // Use CogniCore optimizer if available, otherwise use local Thompson Sampling
    if (this.interventionOptimizer) {
      return this.selectWithOptimizer(sleepState, uid, validActions);
    } else {
      return this.selectWithLocalThompson(sleepState, uid, validActions);
    }
  }

  /**
   * Select intervention using CogniCore's InterventionOptimizer
   */
  private async selectWithOptimizer(
    sleepState: ISleepState,
    userId: string,
    validActions: SleepAction[]
  ): Promise<ISleepInterventionSelection> {
    // 1. Update belief state if engine available
    if (this.beliefEngine) {
      let belief = this.userBeliefs.get(userId);
      if (!belief) {
        belief = this.beliefEngine.initializeBelief(userId);
      }

      const metricsObs = this.metricsToObservation(sleepState.metrics, sleepState.source);
      const cognitionsObs = this.cognitionsToObservation(sleepState.cognitions);

      const updateResult = this.beliefEngine.updateBelief(belief, metricsObs);
      belief = this.beliefEngine.updateBelief(updateResult.newBelief, cognitionsObs).newBelief;
      this.userBeliefs.set(userId, belief);
    }

    // 2. Extract contextual features
    const belief = this.userBeliefs.get(userId) || this.sleepStateToBeliefState(sleepState);
    const contextFeatures = this.extractContextualFeatures(sleepState, belief);

    // 3. Filter valid interventions
    const validInterventions = this.interventions.filter(
      i => validActions.includes(INTERVENTION_ID_TO_SLEEP_ACTION[i.id])
    );

    // 4. Select using CogniCore optimizer
    const selection = await this.interventionOptimizer!.selectIntervention(
      userId,
      contextFeatures,
      validInterventions
    );

    // 5. Map to SleepAction
    const action = INTERVENTION_ID_TO_SLEEP_ACTION[selection.intervention.id] || 'no_intervention';
    const component = SLEEP_ACTION_TO_COMPONENT[action];

    // 6. Get alternatives
    const alternatives = await this.getAlternativesFromOptimizer(
      userId,
      contextFeatures,
      validInterventions,
      selection
    );

    return {
      action,
      component,
      confidence: selection.confidence,
      explanation: this.generateExplanation(action, sleepState, selection.confidence),
      interventionId: selection.intervention.id,
      isExploration: selection.isExploration,
      alternatives,
    };
  }

  /**
   * Select intervention using local Thompson Sampling (standalone mode)
   */
  private selectWithLocalThompson(
    sleepState: ISleepState,
    userId: string,
    validActions: SleepAction[]
  ): ISleepInterventionSelection {
    // Initialize user stats if needed
    if (!this.localStats.has(userId)) {
      const userStats = new Map<SleepAction, { alpha: number; beta: number; count: number }>();
      for (const action of Object.keys(SLEEP_ACTION_TO_INTERVENTION_ID) as SleepAction[]) {
        userStats.set(action, { alpha: 1, beta: 1, count: 0 });
      }
      this.localStats.set(userId, userStats);
    }

    const userStats = this.localStats.get(userId)!;

    // Thompson Sampling: sample from Beta distribution for each action
    const samples: Array<{ action: SleepAction; sample: number }> = [];

    for (const action of validActions) {
      const stats = userStats.get(action) || { alpha: 1, beta: 1, count: 0 };
      const sample = this.sampleBeta(stats.alpha, stats.beta);
      samples.push({ action, sample });
    }

    // Sort by sampled value
    samples.sort((a, b) => b.sample - a.sample);

    const selected = samples[0];
    const isExploration = samples[0].sample < samples[1]?.sample * 0.9;

    // Build alternatives
    const alternatives = samples.slice(1, 4).map(s => ({
      action: s.action,
      confidence: s.sample,
    }));

    return {
      action: selected.action,
      component: SLEEP_ACTION_TO_COMPONENT[selected.action],
      confidence: selected.sample,
      explanation: this.generateExplanation(selected.action, sleepState, selected.sample),
      interventionId: SLEEP_ACTION_TO_INTERVENTION_ID[selected.action],
      isExploration,
      alternatives,
    };
  }

  /**
   * Sample from Beta distribution (Thompson Sampling)
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Use gamma distribution to sample from beta
    const gammaA = this.sampleGamma(alpha, 1);
    const gammaB = this.sampleGamma(beta, 1);
    return gammaA / (gammaA + gammaB);
  }

  /**
   * Sample from Gamma distribution (helper for Beta sampling)
   */
  private sampleGamma(shape: number, scale: number): number {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.randomNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * Sample from standard normal distribution
   */
  private randomNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Record intervention outcome for learning
   */
  async recordOutcome(
    action: SleepAction,
    previousState: ISleepState,
    currentState: ISleepState,
    userId?: string
  ): Promise<void> {
    const uid = userId || previousState.userId;
    const interventionId = SLEEP_ACTION_TO_INTERVENTION_ID[action];

    // Calculate reward based on state improvement
    const reward = this.calculateReward(previousState, currentState);
    const success = reward > 0;

    // Update CogniCore optimizer if available
    if (this.interventionOptimizer) {
      const outcome: IInterventionOutcome = {
        decisionPointId: `dp-${uid}-${Date.now()}`,
        userId: uid,
        interventionId,
        timestamp: new Date(),
        latencySeconds: 86400, // 1 day between observations
        outcomeType: 'mood_improvement',
        value: reward,
        rawValue: reward,
        confidence: currentState.dataQuality,
      };

      await this.interventionOptimizer.recordOutcome(outcome);
    }

    // Update local stats (for standalone mode or backup)
    if (this.localStats.has(uid)) {
      const userStats = this.localStats.get(uid)!;
      const stats = userStats.get(action);
      if (stats) {
        if (success) {
          stats.alpha += 1;
        } else {
          stats.beta += 1;
        }
        stats.count += 1;
      }
    }

    if (this.config.debug) {
      console.log(`[SleepCoreAdapter] Recorded outcome for ${action}: reward=${reward.toFixed(3)}, success=${success}`);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get valid actions based on sleep state
   */
  private getValidActions(sleepState: ISleepState): SleepAction[] {
    const sleepEfficiency = sleepState.metrics.sleepEfficiency;
    const sol = sleepState.metrics.sleepOnsetLatency;
    const anxiety = sleepState.cognitions.sleepAnxiety;
    const arousal = sleepState.cognitions.preSleepArousal;

    const validActions: SleepAction[] = [];

    // Sleep Restriction: only if efficiency is low
    if (sleepEfficiency < 85) {
      validActions.push('adjust_sleep_window');
    }
    validActions.push('enforce_wake_time'); // Always valid

    // Stimulus Control: only if SOL is high
    if (sol > 20) {
      validActions.push('leave_bed_reminder');
    }
    validActions.push('bed_restriction'); // Always valid

    // Cognitive: only if anxiety is elevated
    if (anxiety > 0.4) {
      validActions.push('challenge_belief');
      validActions.push('behavioral_experiment');
    }

    // Relaxation: only if arousal is elevated
    if (arousal > 0.4) {
      validActions.push('relaxation_pmr');
      validActions.push('relaxation_breathing');
      validActions.push('relaxation_imagery');
    }

    // Sleep Hygiene: always valid
    validActions.push('caffeine_education');
    validActions.push('environment_advice');

    // No intervention always valid
    validActions.push('no_intervention');

    return validActions;
  }

  /**
   * Extract contextual features for bandit selection
   */
  private extractContextualFeatures(
    sleepState: ISleepState,
    belief: IFullBeliefState
  ): IContextualFeatures {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Determine mood trend
    let moodTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (sleepState.trend === 'improving') {
      moodTrend = 'improving';
    } else if (sleepState.trend === 'declining') {
      moodTrend = 'declining';
    }

    return {
      // Emotional features
      valence: belief.emotional.valence.posterior.mean,
      arousal: belief.emotional.arousal.posterior.mean,
      dominance: belief.emotional.dominance.posterior.mean,
      emotionalStability: belief.emotional.valence.stability,
      moodTrend,

      // Cognitive features
      cognitiveDistortionCount: this.countDistortions(sleepState.cognitions),
      primaryDistortion: this.getPrimaryDistortion(sleepState.cognitions),
      cognitiveFlexibility: sleepState.cognitions.sleepSelfEfficacy,
      insightLevel: 1 - sleepState.cognitions.dbasScore / 100,

      // Resource features
      energyLevel: (sleepState.metrics.sleepEfficiency / 100) * (1 - sleepState.daytimeSleepiness),
      copingCapacity: sleepState.cognitions.sleepSelfEfficacy,
      socialSupport: 0.5,

      // Risk features
      riskLevel: sleepState.insomnia.isiScore / 28,
      crisisProximity: sleepState.insomnia.severity === 'severe' ? 0.8 : 0.2,

      // Temporal features
      hourOfDay: hour,
      dayOfWeek: day,
      minutesSinceLastInteraction: 0,

      // Engagement features
      sessionsToday: 1,
      sessionsTotalLifetime: 1,
      daysSinceFirstSession: 1,
      averageSessionDuration: 300,
      completionRate: 0.7,
      engagementScore: 0.7,
      preferredIntensity: 'brief' as InterventionIntensity,
      interventionFatigue: 0.2,
      categoryExposureCounts: {} as Record<InterventionCategory, number>,
    };
  }

  /**
   * Get alternative intervention recommendations from optimizer
   */
  private async getAlternativesFromOptimizer(
    userId: string,
    context: IContextualFeatures,
    interventions: IIntervention[],
    selected: IInterventionSelection
  ): Promise<Array<{ action: SleepAction; confidence: number }>> {
    const topK = await this.interventionOptimizer!.getTopKRecommendations(
      userId,
      context,
      3,
      interventions
    );

    return topK
      .filter((sel: IInterventionSelection) => sel.intervention.id !== selected.intervention.id)
      .map((sel: IInterventionSelection) => ({
        action: INTERVENTION_ID_TO_SLEEP_ACTION[sel.intervention.id] || 'no_intervention',
        confidence: sel.confidence,
      }));
  }

  /**
   * Calculate reward from state transition
   */
  private calculateReward(
    previousState: ISleepState,
    currentState: ISleepState
  ): number {
    const weights = {
      sleepEfficiency: 0.35,
      isiReduction: 0.35,
      solReduction: 0.15,
      anxietyReduction: 0.15,
    };

    // Sleep Efficiency improvement (normalized)
    const seImprovement = (currentState.metrics.sleepEfficiency - previousState.metrics.sleepEfficiency) / 100;

    // ISI reduction (lower is better)
    const isiReduction = (previousState.insomnia.isiScore - currentState.insomnia.isiScore) / 28;

    // SOL reduction (lower is better)
    const solReduction = Math.min(1, (previousState.metrics.sleepOnsetLatency - currentState.metrics.sleepOnsetLatency) / 30);

    // Anxiety reduction
    const anxietyReduction = previousState.cognitions.sleepAnxiety - currentState.cognitions.sleepAnxiety;

    const totalReward =
      weights.sleepEfficiency * seImprovement +
      weights.isiReduction * isiReduction +
      weights.solReduction * solReduction +
      weights.anxietyReduction * anxietyReduction;

    return totalReward;
  }

  /**
   * Generate human-readable explanation for intervention
   */
  private generateExplanation(
    action: SleepAction,
    state: ISleepState,
    confidence: number
  ): string {
    if (this.config.language === 'ru') {
      return this.generateRussianExplanation(action, state, confidence);
    } else {
      return this.generateEnglishExplanation(action, state, confidence);
    }
  }

  private generateRussianExplanation(
    action: SleepAction,
    state: ISleepState,
    confidence: number
  ): string {
    const confidencePct = (confidence * 100).toFixed(0);
    const se = state.metrics.sleepEfficiency.toFixed(0);
    const sol = state.metrics.sleepOnsetLatency.toFixed(0);
    const anxiety = (state.cognitions.sleepAnxiety * 100).toFixed(0);

    const explanations: Record<SleepAction, string> = {
      'adjust_sleep_window': `Рекомендую скорректировать окно сна.\n\n` +
        `Ваша эффективность сна: ${se}% (цель: >=85%)\n` +
        `Уверенность в рекомендации: ${confidencePct}%\n\n` +
        `Ограничение времени в постели помогает консолидировать сон.`,

      'enforce_wake_time': `Рекомендую строго соблюдать время подъёма.\n\n` +
        `Это поможет синхронизировать циркадный ритм.\n` +
        `Уверенность: ${confidencePct}%`,

      'leave_bed_reminder': `Рекомендую технику "уход из постели".\n\n` +
        `Время засыпания: ${sol} минут (выше нормы)\n` +
        `Уверенность: ${confidencePct}%\n\n` +
        `Если не уснули за 15-20 минут - встаньте и займитесь спокойным делом.`,

      'bed_restriction': `Используйте кровать только для сна.\n\n` +
        `Это усиливает ассоциацию "кровать = сон".\n` +
        `Уверенность: ${confidencePct}%`,

      'challenge_belief': `Рекомендую поработать с убеждениями о сне.\n\n` +
        `Уровень тревоги о сне: ${anxiety}%\n` +
        `Уверенность: ${confidencePct}%\n\n` +
        `Давайте проверим, насколько обоснованы ваши опасения.`,

      'behavioral_experiment': `Предлагаю провести поведенческий эксперимент.\n\n` +
        `Это поможет проверить ваши убеждения на практике.\n` +
        `Уверенность: ${confidencePct}%`,

      'caffeine_education': `Рекомендую обратить внимание на кофеин.\n\n` +
        `Кофеин может влиять на сон до 6 часов после приёма.\n` +
        `Уверенность: ${confidencePct}%`,

      'environment_advice': `Оптимизируйте обстановку в спальне.\n\n` +
        `Прохлада, темнота и тишина - ключи к хорошему сну.\n` +
        `Уверенность: ${confidencePct}%`,

      'relaxation_pmr': `Рекомендую прогрессивную мышечную релаксацию.\n\n` +
        `Уровень тревоги: ${anxiety}%\n` +
        `Уверенность: ${confidencePct}%\n\n` +
        `Эта техника помогает снизить физическое напряжение.`,

      'relaxation_breathing': `Рекомендую дыхательные упражнения.\n\n` +
        `Это активирует парасимпатическую нервную систему.\n` +
        `Уверенность: ${confidencePct}%`,

      'relaxation_imagery': `Рекомендую технику визуализации.\n\n` +
        `Представьте спокойное место для расслабления.\n` +
        `Уверенность: ${confidencePct}%`,

      'no_intervention': `Пока всё хорошо, продолжайте в том же духе!\n\n` +
        `Уверенность: ${confidencePct}%`,
    };

    return explanations[action] || `Рекомендация: ${action}\nУверенность: ${confidencePct}%`;
  }

  private generateEnglishExplanation(
    action: SleepAction,
    state: ISleepState,
    confidence: number
  ): string {
    const confidencePct = (confidence * 100).toFixed(0);
    const se = state.metrics.sleepEfficiency.toFixed(0);
    const sol = state.metrics.sleepOnsetLatency.toFixed(0);

    const explanations: Record<SleepAction, string> = {
      'adjust_sleep_window': `Recommend adjusting sleep window.\n\n` +
        `Sleep efficiency: ${se}% (target: >=85%)\n` +
        `Confidence: ${confidencePct}%`,

      'enforce_wake_time': `Recommend strict wake time.\nConfidence: ${confidencePct}%`,

      'leave_bed_reminder': `Recommend leaving bed if not asleep.\n` +
        `Sleep onset: ${sol} minutes\nConfidence: ${confidencePct}%`,

      'bed_restriction': `Use bed only for sleep.\nConfidence: ${confidencePct}%`,

      'challenge_belief': `Recommend cognitive restructuring.\nConfidence: ${confidencePct}%`,

      'behavioral_experiment': `Recommend behavioral experiment.\nConfidence: ${confidencePct}%`,

      'caffeine_education': `Recommend caffeine awareness.\nConfidence: ${confidencePct}%`,

      'environment_advice': `Optimize bedroom environment.\nConfidence: ${confidencePct}%`,

      'relaxation_pmr': `Recommend muscle relaxation.\nConfidence: ${confidencePct}%`,

      'relaxation_breathing': `Recommend breathing exercises.\nConfidence: ${confidencePct}%`,

      'relaxation_imagery': `Recommend guided imagery.\nConfidence: ${confidencePct}%`,

      'no_intervention': `Continue current approach.\nConfidence: ${confidencePct}%`,
    };

    return explanations[action] || `Recommendation: ${action}\nConfidence: ${confidencePct}%`;
  }

  // ==========================================================================
  // EXPLAINABILITY (CogniCore Integration)
  // ==========================================================================

  /**
   * Generate detailed explanation for intervention using CogniCore ExplainabilityService
   *
   * Provides:
   * - Feature attribution (which factors influenced decision)
   * - Counterfactual explanations (what would change recommendation)
   * - User-friendly narrative
   * - Confidence metrics
   *
   * @param selection - The intervention selection to explain
   * @param sleepState - Current sleep state
   * @returns Detailed explanation for user or clinician
   */
  async explainIntervention(
    selection: ISleepInterventionSelection,
    sleepState: ISleepState
  ): Promise<ISleepInterventionExplanation> {
    // Build features for explanation
    const features = this.buildExplanationFeatures(sleepState);

    // Create explanation request
    const request: IExplanationRequest = {
      predictionId: `sleep-intervention-${Date.now()}`,
      predictionType: 'sleep_intervention_selection',
      context: {
        userId: sleepState.userId,
        component: selection.component,
        severity: sleepState.insomnia.severity,
      },
      inputFeatures: features,
      output: {
        intervention: selection.interventionId,
        action: selection.action,
        confidence: selection.confidence,
      },
      audience: 'user',
      level: 'detailed',
      types: ['local', 'counterfactual', 'narrative'],
      includeCounterfactuals: true,
      includeGlobalContext: false,
      includeCausal: false,
      includeNarrative: true,
      maxCounterfactuals: 2,
      ageGroup: 'adult',
      language: this.config.language,
    };

    // Get explanation from CogniCore
    const response = await this.explainabilityService.explain(request);

    // Map to sleep-specific explanation format
    return this.mapToSleepExplanation(response, selection, sleepState);
  }

  /**
   * Build features for explanation from sleep state
   */
  private buildExplanationFeatures(sleepState: ISleepState): Record<string, unknown> {
    return {
      // Sleep metrics
      sleepEfficiency: sleepState.metrics.sleepEfficiency,
      sleepOnsetLatency: sleepState.metrics.sleepOnsetLatency,
      wakeAfterSleepOnset: sleepState.metrics.wakeAfterSleepOnset,
      totalSleepTime: sleepState.metrics.totalSleepTime,
      numberOfAwakenings: sleepState.metrics.numberOfAwakenings,

      // Insomnia severity
      isiScore: sleepState.insomnia.isiScore,
      severity: sleepState.insomnia.severity,

      // Cognitions
      sleepAnxiety: sleepState.cognitions.sleepAnxiety,
      preSleepArousal: sleepState.cognitions.preSleepArousal,
      sleepSelfEfficacy: sleepState.cognitions.sleepSelfEfficacy,
      dbasScore: sleepState.cognitions.dbasScore,

      // Beliefs
      catastrophizing: sleepState.cognitions.beliefs.catastrophizing,
      unrealisticExpectations: sleepState.cognitions.beliefs.unrealisticExpectations,
      helplessness: sleepState.cognitions.beliefs.helplessness,

      // Other factors
      daytimeSleepiness: sleepState.daytimeSleepiness,
    };
  }

  /**
   * Map CogniCore explanation to sleep-specific format
   */
  private mapToSleepExplanation(
    response: IExplanationResponse,
    selection: ISleepInterventionSelection,
    sleepState: ISleepState
  ): ISleepInterventionExplanation {
    const userExplanation = response.userExplanation;

    // Map key factors
    const keyFactors = userExplanation.keyFactors.map(factor => ({
      name: factor.name,
      nameRu: factor.nameRu,
      value: factor.value,
      impact: factor.impact,
      emoji: factor.emoji,
      explanation: factor.explanation,
      explanationRu: factor.explanationRu,
    }));

    // Add sleep-specific factors if not present
    if (keyFactors.length < 3) {
      keyFactors.push(...this.getSleepSpecificFactors(sleepState, selection));
    }

    // Build counterfactual advice (what would change the recommendation)
    const whatWouldChange: string[] = [];
    const whatWouldChangeRu: string[] = [];

    if (response.counterfactualExplanation) {
      for (const scenario of response.counterfactualExplanation.scenarios.slice(0, 2)) {
        whatWouldChange.push(scenario.description);
        whatWouldChangeRu.push(scenario.descriptionRu);
      }
    }

    // Get actionable advice
    const actionableAdvice = this.getActionableAdvice(selection, sleepState, 'en');
    const actionableAdviceRu = this.getActionableAdvice(selection, sleepState, 'ru');

    return {
      summary: userExplanation.summary,
      summaryRu: userExplanation.summaryRu,
      reasoning: userExplanation.reasoning,
      reasoningRu: userExplanation.reasoningRu,

      keyFactors,

      confidence: {
        level: userExplanation.confidence.level,
        emoji: userExplanation.confidence.emoji,
        description: userExplanation.confidence.description,
        descriptionRu: userExplanation.confidence.descriptionRu,
      },

      actionableAdvice,
      actionableAdviceRu,

      whatWouldChange: whatWouldChange.length > 0 ? whatWouldChange : undefined,
      whatWouldChangeRu: whatWouldChangeRu.length > 0 ? whatWouldChangeRu : undefined,

      limitations: [
        'Based on self-reported data',
        'Cannot replace professional diagnosis',
        'Recommendations may take time to show results',
      ],
      limitationsRu: [
        'На основе данных самоотчёта',
        'Не заменяет профессиональную диагностику',
        'Результаты могут проявиться со временем',
      ],

      disclaimer: userExplanation.disclaimer,
      disclaimerRu: userExplanation.disclaimerRu,
    };
  }

  /**
   * Get sleep-specific key factors for explanation
   */
  private getSleepSpecificFactors(
    sleepState: ISleepState,
    selection: ISleepInterventionSelection
  ): ISleepInterventionExplanation['keyFactors'] {
    const factors: ISleepInterventionExplanation['keyFactors'] = [];

    // Sleep efficiency factor
    const se = sleepState.metrics.sleepEfficiency;
    if (se < 85) {
      factors.push({
        name: 'Sleep Efficiency',
        nameRu: 'Эффективность сна',
        value: `${se.toFixed(0)}%`,
        impact: 'hurts',
        emoji: '📉',
        explanation: `Below 85% target, indicates fragmented sleep`,
        explanationRu: `Ниже целевых 85%, указывает на фрагментированный сон`,
      });
    }

    // Sleep onset latency factor
    const sol = sleepState.metrics.sleepOnsetLatency;
    if (sol > 30 && selection.component === 'stimulus_control') {
      factors.push({
        name: 'Sleep Onset Latency',
        nameRu: 'Время засыпания',
        value: `${sol.toFixed(0)} min`,
        impact: 'hurts',
        emoji: '⏰',
        explanation: `Taking ${sol.toFixed(0)} minutes to fall asleep (target: <30 min)`,
        explanationRu: `Засыпание занимает ${sol.toFixed(0)} минут (цель: <30 мин)`,
      });
    }

    // Anxiety factor
    const anxiety = sleepState.cognitions.sleepAnxiety;
    if (anxiety > 0.5 && selection.component === 'cognitive_restructuring') {
      factors.push({
        name: 'Sleep Anxiety',
        nameRu: 'Тревога о сне',
        value: `${(anxiety * 100).toFixed(0)}%`,
        impact: 'hurts',
        emoji: '😰',
        explanation: `Elevated sleep-related anxiety`,
        explanationRu: `Повышенная тревога, связанная со сном`,
      });
    }

    // ISI factor
    const isi = sleepState.insomnia.isiScore;
    factors.push({
      name: 'Insomnia Severity',
      nameRu: 'Тяжесть бессонницы',
      value: `ISI: ${isi}`,
      impact: isi >= 15 ? 'hurts' : isi >= 8 ? 'neutral' : 'helps',
      emoji: isi >= 15 ? '🔴' : isi >= 8 ? '🟡' : '🟢',
      explanation: this.getISISeverityLabel(isi, 'en'),
      explanationRu: this.getISISeverityLabel(isi, 'ru'),
    });

    return factors.slice(0, 3);
  }

  /**
   * Get ISI severity label
   */
  private getISISeverityLabel(isi: number, language: 'en' | 'ru'): string {
    if (language === 'ru') {
      if (isi >= 22) return 'Тяжёлая клиническая бессонница';
      if (isi >= 15) return 'Умеренная клиническая бессонница';
      if (isi >= 8) return 'Подпороговая бессонница';
      return 'Нет клинически значимой бессонницы';
    }
    if (isi >= 22) return 'Severe clinical insomnia';
    if (isi >= 15) return 'Moderate clinical insomnia';
    if (isi >= 8) return 'Subthreshold insomnia';
    return 'No clinically significant insomnia';
  }

  /**
   * Get actionable advice based on intervention
   */
  private getActionableAdvice(
    selection: ISleepInterventionSelection,
    sleepState: ISleepState,
    language: 'en' | 'ru'
  ): string[] {
    const advice: string[] = [];

    if (language === 'ru') {
      switch (selection.component) {
        case 'sleep_restriction':
          advice.push('Вставайте в одно и то же время каждый день, даже по выходным');
          advice.push('Избегайте дневного сна, чтобы накопить "давление сна"');
          if (sleepState.metrics.sleepEfficiency < 85) {
            advice.push('Сократите время в постели до фактического времени сна');
          }
          break;

        case 'stimulus_control':
          advice.push('Используйте кровать только для сна');
          advice.push('Если не уснули за 15-20 минут — встаньте');
          advice.push('Вернитесь в кровать только когда почувствуете сонливость');
          break;

        case 'cognitive_restructuring':
          advice.push('Записывайте тревожные мысли о сне');
          advice.push('Проверяйте: есть ли факты, подтверждающие эти мысли?');
          advice.push('Замените катастрофические мысли на реалистичные');
          break;

        case 'sleep_hygiene':
          advice.push('Ограничьте кофеин после 14:00');
          advice.push('Создайте тёмную, прохладную, тихую спальню');
          advice.push('За час до сна избегайте экранов');
          break;

        case 'relaxation':
          advice.push('Практикуйте релаксацию за 30 минут до сна');
          advice.push('Начните с 5 минут и постепенно увеличивайте');
          advice.push('Делайте это каждый день для формирования привычки');
          break;
      }
    } else {
      switch (selection.component) {
        case 'sleep_restriction':
          advice.push('Wake up at the same time every day, even on weekends');
          advice.push('Avoid daytime naps to build sleep pressure');
          if (sleepState.metrics.sleepEfficiency < 85) {
            advice.push('Restrict time in bed to actual sleep time');
          }
          break;

        case 'stimulus_control':
          advice.push('Use bed only for sleep');
          advice.push("If not asleep in 15-20 minutes, get up");
          advice.push('Return to bed only when feeling sleepy');
          break;

        case 'cognitive_restructuring':
          advice.push('Write down worrying thoughts about sleep');
          advice.push('Check: is there evidence supporting these thoughts?');
          advice.push('Replace catastrophic thoughts with realistic ones');
          break;

        case 'sleep_hygiene':
          advice.push('Limit caffeine after 2 PM');
          advice.push('Create a dark, cool, quiet bedroom');
          advice.push('Avoid screens for an hour before bed');
          break;

        case 'relaxation':
          advice.push('Practice relaxation 30 minutes before bed');
          advice.push('Start with 5 minutes and gradually increase');
          advice.push('Do it daily to form a habit');
          break;
      }
    }

    return advice;
  }

  /**
   * Format detailed explanation for display
   */
  formatExplanationForDisplay(
    explanation: ISleepInterventionExplanation,
    language: 'en' | 'ru' = 'ru'
  ): string {
    const isRu = language === 'ru';
    let result = '';

    // Summary
    result += `📋 ${isRu ? explanation.summaryRu : explanation.summary}\n\n`;

    // Reasoning
    result += `💡 ${isRu ? explanation.reasoningRu : explanation.reasoning}\n\n`;

    // Key factors
    if (explanation.keyFactors.length > 0) {
      result += isRu ? '📊 Ключевые факторы:\n' : '📊 Key Factors:\n';
      for (const factor of explanation.keyFactors) {
        const impactEmoji = factor.impact === 'helps' ? '✅' :
                           factor.impact === 'hurts' ? '⚠️' : '➡️';
        result += `${factor.emoji} ${isRu ? factor.nameRu : factor.name}: ${factor.value} ${impactEmoji}\n`;
        result += `   ${isRu ? factor.explanationRu : factor.explanation}\n`;
      }
      result += '\n';
    }

    // Confidence
    result += `${explanation.confidence.emoji} ${isRu ? 'Уверенность' : 'Confidence'}: `;
    result += `${isRu ? explanation.confidence.descriptionRu : explanation.confidence.description}\n\n`;

    // Actionable advice
    const advice = isRu ? explanation.actionableAdviceRu : explanation.actionableAdvice;
    if (advice.length > 0) {
      result += isRu ? '🎯 Что делать:\n' : '🎯 What to do:\n';
      for (const item of advice) {
        result += `• ${item}\n`;
      }
      result += '\n';
    }

    // What would change
    const whatWouldChange = isRu ? explanation.whatWouldChangeRu : explanation.whatWouldChange;
    if (whatWouldChange && whatWouldChange.length > 0) {
      result += isRu ? '🔄 Что изменило бы рекомендацию:\n' : '🔄 What would change the recommendation:\n';
      for (const item of whatWouldChange) {
        result += `• ${item}\n`;
      }
      result += '\n';
    }

    // Disclaimer
    result += `\n_${isRu ? explanation.disclaimerRu : explanation.disclaimer}_`;

    return result.trim();
  }

  // ==========================================================================
  // MOTIVATIONAL INTERVIEWING (Phase 5: CogniCore Integration)
  // ==========================================================================

  /**
   * Generate MI-style motivational response for sleep-specific context
   *
   * Uses CogniCore MotivationalEngine to generate responses that:
   * - Evoke change talk about sleep habits
   * - Support self-efficacy for sleep improvement
   * - Roll with resistance to treatment
   * - Explore ambivalence about behavior change
   *
   * @param userId - User identifier
   * @param context - Sleep-specific motivational context
   * @param sleepState - Current sleep state (optional)
   * @returns MI-style motivational response
   *
   * @example
   * ```typescript
   * const response = await adapter.generateMotivationalResponse(
   *   'user123',
   *   'streak_broken',
   *   sleepState
   * );
   * console.log(response.textRu);
   * // "Похоже, вы пропустили несколько дней отслеживания сна.
   * //  Что для вас сейчас было бы важнее всего в улучшении сна?"
   * ```
   */
  async generateMotivationalResponse(
    userId: string,
    context: SleepMotivationalContext,
    sleepState?: ISleepState
  ): Promise<ISleepMotivationalResponse> {
    // Get or create motivational state
    let motivationalState = this.userMotivationalStates.get(userId);
    if (!motivationalState) {
      motivationalState = this.motivationalStateFactory.createInitial(userId);
      this.userMotivationalStates.set(userId, motivationalState);
    }

    // Map sleep context to MI strategy
    const strategy = this.mapContextToMIStrategy(context, sleepState);

    // Determine target change talk
    const targetChangeTalk = this.determineTargetChangeTalk(context, sleepState);

    // Create response context
    const responseContext: MIResponseContext = {
      motivationalState,
      lastUtterance: {
        id: `sleep-context-${Date.now()}`,
        text: this.contextToUtteranceText(context),
        timestamp: new Date(),
        category: context === 'resistance_to_change' ? 'sustain_talk' : 'follow_neutral',
        strength: 0.5,
        confidence: 0.5,
        evidenceSpans: [],
      },
      recentExchanges: [],
      currentStrategy: strategy,
      targetBehavior: 'improving sleep habits and following CBT-I protocol',
      ageGroup: 'adult',
      language: this.config.language,
    };

    // Generate MI response
    const miResponse = await this.motivationalEngine.generateResponse(responseContext);

    // Create sleep-specific follow-up suggestions
    const followUpSuggestions = this.createFollowUpSuggestions(context, 'en');
    const followUpSuggestionsRu = this.createFollowUpSuggestions(context, 'ru');

    // Personalization based on sleep state
    let personalizationNote: string | undefined;
    let personalizationNoteRu: string | undefined;

    if (sleepState) {
      const personalization = this.getPersonalizationNote(sleepState, context);
      personalizationNote = personalization.en;
      personalizationNoteRu = personalization.ru;
    }

    return {
      text: miResponse.text,
      textRu: miResponse.textRu || miResponse.text,
      technique: this.mapBehaviorToTechnique(miResponse.primaryBehavior),
      targetChangeTalk: targetChangeTalk,
      strategy: strategy,
      expectedImpact: miResponse.expectedImpact,
      confidence: miResponse.spiritAlignment,
      followUpSuggestions,
      followUpSuggestionsRu,
      personalizationNote,
      personalizationNoteRu,
    };
  }

  /**
   * Analyze user speech for change talk / sustain talk
   *
   * Uses CogniCore MI engine to classify user language according to DARN-CAT framework:
   * - D: Desire ("I want to sleep better")
   * - A: Ability ("I could try going to bed earlier")
   * - R: Reasons ("Because I'm tired all the time")
   * - N: Need ("I have to fix my sleep")
   * - C: Commitment ("I will follow the schedule")
   * - A: Activation ("I'm ready to start")
   * - T: Taking steps ("I've already stopped caffeine")
   *
   * @param text - User's text to analyze
   * @returns Speech analysis result with MI classification
   */
  async analyzeUserSpeech(text: string): Promise<ISpeechAnalysisResult> {
    const utterance = await this.motivationalEngine.analyzeUtterance(text);

    // Create interpretation
    const interpretation = this.createInterpretation(utterance, 'en');
    const interpretationRu = this.createInterpretation(utterance, 'ru');

    return {
      category: utterance.category === 'change_talk' ? 'change_talk' :
                utterance.category === 'sustain_talk' ? 'sustain_talk' : 'neutral',
      subtype: utterance.changeSubtype || utterance.sustainSubtype,
      strength: utterance.strength,
      confidence: utterance.confidence,
      evidenceSpans: utterance.evidenceSpans,
      interpretation,
      interpretationRu,
    };
  }

  /**
   * Update user's motivational state based on conversation
   *
   * Tracks Change Talk / Sustain Talk ratio and recommends strategy adjustments.
   *
   * @param userId - User identifier
   * @param messages - Recent conversation messages
   * @returns Updated motivational state
   */
  async updateMotivationalState(
    userId: string,
    messages: Array<{ text: string; timestamp: Date; isUser: boolean }>
  ): Promise<IMotivationalState> {
    const previousState = this.userMotivationalStates.get(userId);

    const newState = await this.motivationalStateFactory.fromConversation(
      messages,
      userId,
      previousState
    );

    this.userMotivationalStates.set(userId, newState);
    return newState;
  }

  /**
   * Get MI strategy recommendation for current sleep state
   *
   * Recommends appropriate MI strategy based on:
   * - User's stage of change
   * - Current sleep state
   * - Treatment adherence
   * - Change Talk / Sustain Talk ratio
   *
   * @param userId - User identifier
   * @param sleepState - Current sleep state
   * @returns Recommended MI strategy with rationale
   */
  getMotivationalStrategy(
    userId: string,
    sleepState: ISleepState
  ): { strategy: MIStrategy; rationale: string; rationaleRu: string } {
    const motivationalState = this.userMotivationalStates.get(userId);

    if (!motivationalState) {
      return {
        strategy: 'build_rapport',
        rationale: 'No interaction history - start by building rapport',
        rationaleRu: 'Нет истории взаимодействия - начните с установления контакта',
      };
    }

    const recommendedStrategy = this.motivationalEngine.recommendStrategy(motivationalState);

    // Get rationale based on strategy
    const { rationale, rationaleRu } = this.getStrategyRationale(
      recommendedStrategy,
      motivationalState,
      sleepState
    );

    return {
      strategy: recommendedStrategy,
      rationale,
      rationaleRu,
    };
  }

  /**
   * Get MI fidelity report for session
   *
   * Calculates MITI 4.2 scores for bot responses.
   *
   * @param responses - Bot's MI responses from session
   * @param userUtterances - User's utterances from session
   * @returns MI fidelity report
   */
  getMIFidelityReport(
    responses: MIResponse[],
    userUtterances: ClientUtterance[]
  ): MIFidelityReport {
    return this.motivationalEngine.calculateFidelity(responses, userUtterances);
  }

  /**
   * Get user's motivational state
   */
  getUserMotivationalState(userId: string): IMotivationalState | undefined {
    return this.userMotivationalStates.get(userId);
  }

  /**
   * Format motivational response for display in Telegram bot
   */
  formatMotivationalResponseForDisplay(
    response: ISleepMotivationalResponse,
    language: 'en' | 'ru' = 'ru'
  ): string {
    const isRu = language === 'ru';
    let result = '';

    // Main response text
    result += `💬 ${isRu ? response.textRu : response.text}\n\n`;

    // Personalization note if present
    if (response.personalizationNote || response.personalizationNoteRu) {
      const note = isRu ? response.personalizationNoteRu : response.personalizationNote;
      if (note) {
        result += `💡 _${note}_\n\n`;
      }
    }

    // Follow-up suggestions
    const suggestions = isRu ? response.followUpSuggestionsRu : response.followUpSuggestions;
    if (suggestions.length > 0) {
      result += isRu ? '📋 Возможные следующие шаги:\n' : '📋 Possible next steps:\n';
      for (const suggestion of suggestions) {
        result += `• ${suggestion}\n`;
      }
    }

    return result.trim();
  }

  // --------------------------------------------------------------------------
  // Private Motivational Helpers
  // --------------------------------------------------------------------------

  /**
   * Map sleep context to MI strategy
   */
  private mapContextToMIStrategy(
    context: SleepMotivationalContext,
    sleepState?: ISleepState
  ): MIStrategy {
    const strategyMap: Record<SleepMotivationalContext, MIStrategy> = {
      'streak_broken': 'support_self_efficacy',
      'low_adherence': 'explore_ambivalence',
      'plateau': 'develop_discrepancy',
      'early_dropout_risk': 'build_rapport',
      'resistance_to_change': 'roll_with_resistance',
      'sleep_window_challenge': 'support_self_efficacy',
      'relapse': 'strengthen_commitment',
      'setback': 'roll_with_resistance',
      'ambivalence': 'explore_ambivalence',
    };

    // Adjust based on sleep state if available
    if (sleepState) {
      // High anxiety → focus on rapport
      if (sleepState.cognitions.sleepAnxiety > 0.7) {
        return 'build_rapport';
      }

      // Making progress → strengthen commitment
      if (sleepState.metrics.sleepEfficiency > 85 && context !== 'relapse') {
        return 'strengthen_commitment';
      }
    }

    return strategyMap[context];
  }

  /**
   * Determine target change talk based on context
   */
  private determineTargetChangeTalk(
    context: SleepMotivationalContext,
    sleepState?: ISleepState
  ): ChangeTaskSubtype {
    // Map context to target DARN-CAT
    const targetMap: Record<SleepMotivationalContext, ChangeTaskSubtype> = {
      'streak_broken': 'ability',
      'low_adherence': 'reasons',
      'plateau': 'need',
      'early_dropout_risk': 'desire',
      'resistance_to_change': 'desire',
      'sleep_window_challenge': 'ability',
      'relapse': 'commitment',
      'setback': 'ability',
      'ambivalence': 'reasons',
    };

    // If near action stage, target mobilizing language
    if (sleepState && sleepState.cognitions.sleepSelfEfficacy > 0.7) {
      return 'commitment';
    }

    return targetMap[context];
  }

  /**
   * Convert context to pseudo-utterance for MI engine
   */
  private contextToUtteranceText(context: SleepMotivationalContext): string {
    const contextTexts: Record<SleepMotivationalContext, string> = {
      'streak_broken': 'I missed tracking my sleep for a few days',
      'low_adherence': 'I\'m having trouble following the sleep schedule',
      'plateau': 'I don\'t see any improvement despite trying',
      'early_dropout_risk': 'I\'m not sure if this is working for me',
      'resistance_to_change': 'I don\'t want to change my bedtime',
      'sleep_window_challenge': 'The sleep restriction is too hard',
      'relapse': 'My insomnia came back',
      'setback': 'I had a bad week with stress',
      'ambivalence': 'I\'m not sure if I should keep doing this',
    };

    return contextTexts[context];
  }

  /**
   * Map MI behavior code to simple technique name
   */
  private mapBehaviorToTechnique(
    behavior: string
  ): 'open_question' | 'affirmation' | 'reflection' | 'summary' {
    if (behavior.includes('question')) return 'open_question';
    if (behavior === 'affirm') return 'affirmation';
    if (behavior.includes('reflection')) return 'reflection';
    return 'reflection'; // Default
  }

  /**
   * Infer therapy phase from sleep state
   */
  private inferTherapyPhase(sleepState?: ISleepState): 'early' | 'middle' | 'late' | 'maintenance' {
    if (!sleepState) return 'early';

    const isi = sleepState.insomnia.isiScore;
    const se = sleepState.metrics.sleepEfficiency;

    // ISI < 8 and SE > 85% → maintenance
    if (isi < 8 && se > 85) return 'maintenance';

    // ISI < 15 and SE > 75% → late phase
    if (isi < 15 && se > 75) return 'late';

    // Some improvement → middle
    if (isi < 22 || se > 70) return 'middle';

    // Otherwise early phase
    return 'early';
  }

  /**
   * Create follow-up suggestions based on context
   */
  private createFollowUpSuggestions(
    context: SleepMotivationalContext,
    language: 'en' | 'ru'
  ): string[] {
    const suggestions: Record<SleepMotivationalContext, { en: string[]; ru: string[] }> = {
      'streak_broken': {
        en: [
          'Set a daily reminder for sleep tracking',
          'Start fresh from today',
          'Review what made tracking difficult',
        ],
        ru: [
          'Установите напоминание для отслеживания сна',
          'Начните заново с сегодняшнего дня',
          'Подумайте, что мешало вести дневник',
        ],
      },
      'low_adherence': {
        en: [
          'Identify barriers to following the schedule',
          'Consider a more gradual adjustment',
          'Discuss concerns with the bot',
        ],
        ru: [
          'Определите, что мешает следовать расписанию',
          'Попробуйте более постепенную корректировку',
          'Обсудите ваши опасения',
        ],
      },
      'plateau': {
        en: [
          'Review sleep diary for patterns',
          'Consider additional techniques',
          'Focus on progress already made',
        ],
        ru: [
          'Просмотрите дневник сна на предмет закономерностей',
          'Рассмотрите дополнительные техники',
          'Сосредоточьтесь на уже достигнутом прогрессе',
        ],
      },
      'early_dropout_risk': {
        en: [
          'Share your concerns',
          'Review treatment goals together',
          'Consider what success would look like',
        ],
        ru: [
          'Поделитесь своими опасениями',
          'Пересмотрим вместе цели лечения',
          'Подумайте, как выглядит для вас успех',
        ],
      },
      'resistance_to_change': {
        en: [
          'Explore what feels right for you',
          'Consider small experiments',
          'Focus on your own values and goals',
        ],
        ru: [
          'Исследуйте, что подходит именно вам',
          'Рассмотрите небольшие эксперименты',
          'Сосредоточьтесь на ваших ценностях и целях',
        ],
      },
      'sleep_window_challenge': {
        en: [
          'Adjust the sleep window gradually',
          'Plan relaxing activities for extra waking time',
          'Remember this phase is temporary',
        ],
        ru: [
          'Корректируйте окно сна постепенно',
          'Запланируйте расслабляющие занятия на время бодрствования',
          'Помните, что эта фаза временная',
        ],
      },
      'relapse': {
        en: [
          'Review what was working before',
          'Identify triggers for the relapse',
          'Restart sleep restriction gradually',
        ],
        ru: [
          'Вспомните, что работало раньше',
          'Определите триггеры рецидива',
          'Постепенно возобновите ограничение сна',
        ],
      },
      'setback': {
        en: [
          'Be kind to yourself during difficult times',
          'Return to basics when ready',
          'Maintain wake time even if sleep time varies',
        ],
        ru: [
          'Будьте добрее к себе в трудные времена',
          'Вернитесь к основам, когда будете готовы',
          'Сохраняйте время подъёма, даже если время сна меняется',
        ],
      },
      'ambivalence': {
        en: [
          'List pros and cons of change',
          'Consider what matters most to you',
          'Talk about your mixed feelings',
        ],
        ru: [
          'Составьте список за и против изменений',
          'Подумайте, что для вас важнее всего',
          'Поговорите о ваших смешанных чувствах',
        ],
      },
    };

    return language === 'ru' ? suggestions[context].ru : suggestions[context].en;
  }

  /**
   * Get personalization note based on sleep state
   */
  private getPersonalizationNote(
    sleepState: ISleepState,
    context: SleepMotivationalContext
  ): { en: string; ru: string } {
    const se = sleepState.metrics.sleepEfficiency;
    const isi = sleepState.insomnia.isiScore;

    // Good efficiency - acknowledge progress
    if (se > 85) {
      return {
        en: `Your sleep efficiency is ${se.toFixed(0)}% - that's excellent progress!`,
        ru: `Ваша эффективность сна ${se.toFixed(0)}% - это отличный прогресс!`,
      };
    }

    // Moderate severity - encourage
    if (isi < 15) {
      return {
        en: 'You\'re already making progress with subthreshold insomnia',
        ru: 'Вы уже делаете успехи с подпороговой бессонницей',
      };
    }

    // High anxiety - validate
    if (sleepState.cognitions.sleepAnxiety > 0.7) {
      return {
        en: 'It\'s understandable to feel anxious about sleep',
        ru: 'Понятно, что вы тревожитесь о сне',
      };
    }

    // Default based on context
    if (context === 'streak_broken' || context === 'setback') {
      return {
        en: 'Setbacks are a normal part of the process',
        ru: 'Откаты - нормальная часть процесса',
      };
    }

    return {
      en: '',
      ru: '',
    };
  }

  /**
   * Create interpretation of utterance for display
   */
  private createInterpretation(utterance: ClientUtterance, language: 'en' | 'ru'): string {
    const { category, changeSubtype, sustainSubtype, strength } = utterance;

    if (category === 'change_talk' && changeSubtype) {
      const subtypeNames: Record<string, { en: string; ru: string }> = {
        'desire': { en: 'Desire for change', ru: 'Желание измениться' },
        'ability': { en: 'Perceived ability', ru: 'Осознание способности' },
        'reasons': { en: 'Reasons for change', ru: 'Причины для изменений' },
        'need': { en: 'Need for change', ru: 'Необходимость изменений' },
        'commitment': { en: 'Commitment to change', ru: 'Готовность к изменениям' },
        'activation': { en: 'Activation language', ru: 'Язык активации' },
        'taking_steps': { en: 'Taking steps', ru: 'Предпринятие шагов' },
      };

      const name = subtypeNames[changeSubtype] || { en: changeSubtype, ru: changeSubtype };
      const strengthLabel = strength > 0.7 ? (language === 'ru' ? 'сильный' : 'strong') :
                           strength > 0.4 ? (language === 'ru' ? 'умеренный' : 'moderate') :
                           (language === 'ru' ? 'слабый' : 'weak');

      return language === 'ru'
        ? `Обнаружен язык изменений: ${name.ru} (${strengthLabel})`
        : `Change talk detected: ${name.en} (${strengthLabel})`;
    }

    if (category === 'sustain_talk' && sustainSubtype) {
      return language === 'ru'
        ? `Обнаружен язык сохранения статус-кво: ${sustainSubtype}`
        : `Sustain talk detected: ${sustainSubtype}`;
    }

    return language === 'ru'
      ? 'Нейтральное высказывание'
      : 'Neutral statement';
  }

  /**
   * Get strategy rationale
   */
  private getStrategyRationale(
    strategy: MIStrategy,
    motivationalState: IMotivationalState,
    sleepState: ISleepState
  ): { rationale: string; rationaleRu: string } {
    const rationales: Record<MIStrategy, { rationale: string; rationaleRu: string }> = {
      'build_rapport': {
        rationale: 'Focus on building therapeutic relationship first',
        rationaleRu: 'Сначала сосредоточьтесь на построении терапевтического альянса',
      },
      'explore_ambivalence': {
        rationale: `CT/ST ratio is ${(motivationalState.sessionRatio * 100).toFixed(0)}% - explore mixed feelings`,
        rationaleRu: `Соотношение ЯИ/ЯС ${(motivationalState.sessionRatio * 100).toFixed(0)}% - исследуйте смешанные чувства`,
      },
      'evoke_change_talk': {
        rationale: 'Elicit more reasons and desire for sleep improvement',
        rationaleRu: 'Вызывайте больше причин и желания улучшить сон',
      },
      'strengthen_commitment': {
        rationale: `Sleep efficiency at ${sleepState.metrics.sleepEfficiency.toFixed(0)}% - strengthen commitment to continue`,
        rationaleRu: `Эффективность сна ${sleepState.metrics.sleepEfficiency.toFixed(0)}% - укрепляйте готовность продолжать`,
      },
      'support_self_efficacy': {
        rationale: 'Build confidence in ability to improve sleep',
        rationaleRu: 'Укрепляйте уверенность в способности улучшить сон',
      },
      'roll_with_resistance': {
        rationale: `Discord level at ${(motivationalState.discord.level * 100).toFixed(0)}% - avoid argumentation`,
        rationaleRu: `Уровень сопротивления ${(motivationalState.discord.level * 100).toFixed(0)}% - избегайте споров`,
      },
      'summarize_and_transition': {
        rationale: 'Ready to summarize and move to action planning',
        rationaleRu: 'Готовы подвести итоги и перейти к планированию действий',
      },
      'action_planning': {
        rationale: 'Commitment language present - plan specific steps',
        rationaleRu: 'Присутствует язык готовности - планируйте конкретные шаги',
      },
      'relapse_prevention': {
        rationale: 'Focus on maintaining gains and preventing relapse',
        rationaleRu: 'Сосредоточьтесь на поддержании результатов и предотвращении рецидива',
      },
      'develop_discrepancy': {
        rationale: 'Help see gap between current sleep and desired sleep',
        rationaleRu: 'Помогите увидеть разрыв между текущим и желаемым сном',
      },
    };

    return rationales[strategy];
  }

  /**
   * Count cognitive distortions present
   */
  private countDistortions(cognitions: ISleepCognitions): number {
    let count = 0;
    if (cognitions.beliefs.unrealisticExpectations) count++;
    if (cognitions.beliefs.catastrophizing) count++;
    if (cognitions.beliefs.helplessness) count++;
    if (cognitions.beliefs.effortfulSleep) count++;
    if (cognitions.beliefs.healthWorries) count++;
    return count;
  }

  /**
   * Get primary cognitive distortion
   */
  private getPrimaryDistortion(cognitions: ISleepCognitions): string | undefined {
    if (cognitions.beliefs.catastrophizing) return 'catastrophizing';
    if (cognitions.beliefs.unrealisticExpectations) return 'all_or_nothing';
    if (cognitions.beliefs.helplessness) return 'magnification';
    if (cognitions.beliefs.healthWorries) return 'fortune_telling';
    return undefined;
  }

  /**
   * Calculate entropy of probability distribution
   */
  private calculateEntropy(probs: number[]): number {
    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const normalized = probs.map(p => p / sum);
    return -normalized.reduce((entropy, p) => {
      if (p > 0) {
        return entropy + p * Math.log2(p);
      }
      return entropy;
    }, 0);
  }

  /**
   * Register CBT-I interventions
   */
  private registerSleepInterventions(): void {
    const createIntervention = (
      id: string,
      nameEn: string,
      nameRu: string,
      category: InterventionCategory,
      intensity: InterventionIntensity
    ): IIntervention => {
      const durationMap: Record<InterventionIntensity, number> = {
        'micro': 30,
        'brief': 180,
        'standard': 600,
        'extended': 1200,
        'intensive': 1800,
      };

      return {
        id,
        name: nameEn,
        description: nameRu,
        category,
        intensity,
        modality: 'text_message',
        estimatedDurationSeconds: durationMap[intensity],
        preconditions: {},
        contraindications: {},
        content: {
          en: { introduction: '', mainContent: nameEn, closing: '' },
          ru: { introduction: '', mainContent: nameRu, closing: '' },
        },
        mechanisms: [],
        targetOutcomes: ['engagement', 'completion', 'mood_improvement'],
        evidenceLevel: 'rct',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
    };

    this.interventions = [
      createIntervention('sleep_restriction_adjust', 'Sleep Window Adjustment', 'Корректировка окна сна', 'behavioral_activation', 'brief'),
      createIntervention('sleep_restriction_enforce', 'Enforce Wake Time', 'Строгое время подъёма', 'behavioral_activation', 'micro'),
      createIntervention('stimulus_control_leave', 'Leave Bed Reminder', 'Напоминание покинуть кровать', 'behavioral_activation', 'micro'),
      createIntervention('stimulus_control_restrict', 'Bed Restriction', 'Ограничение использования кровати', 'behavioral_activation', 'brief'),
      createIntervention('cognitive_challenge', 'Challenge Sleep Belief', 'Когнитивная реструктуризация', 'cognitive_restructuring', 'standard'),
      createIntervention('cognitive_experiment', 'Behavioral Experiment', 'Поведенческий эксперимент', 'cognitive_restructuring', 'extended'),
      createIntervention('hygiene_caffeine', 'Caffeine Education', 'Информация о кофеине', 'psychoeducation', 'brief'),
      createIntervention('hygiene_environment', 'Environment Optimization', 'Оптимизация обстановки', 'psychoeducation', 'brief'),
      createIntervention('relaxation_pmr', 'Progressive Muscle Relaxation', 'Прогрессивная мышечная релаксация', 'mindfulness', 'standard'),
      createIntervention('relaxation_breathing', 'Breathing Exercise', 'Дыхательные упражнения', 'mindfulness', 'brief'),
      createIntervention('relaxation_imagery', 'Guided Imagery', 'Визуализация', 'mindfulness', 'standard'),
      createIntervention('no_action', 'Continue Monitoring', 'Продолжить наблюдение', 'psychoeducation', 'micro'),
    ];

    // Register with optimizer if available
    if (this.interventionOptimizer) {
      for (const intervention of this.interventions) {
        this.interventionOptimizer.registerIntervention(intervention);
      }
    }
  }

  // ==========================================================================
  // MIGRATION & COMPATIBILITY
  // ==========================================================================

  /**
   * Import action statistics from legacy SleepCorePOMDP
   * Used for migration from old system
   */
  async importLegacyStats(
    oldStats: Map<SleepAction, IActionStats>,
    userId: string
  ): Promise<void> {
    // Import into local stats
    if (!this.localStats.has(userId)) {
      this.localStats.set(userId, new Map());
    }
    const userStats = this.localStats.get(userId)!;

    for (const [action, stats] of oldStats) {
      // Calculate count from alpha/beta (subtract priors of 1 each)
      const count = Math.max(0, (stats.alpha - 1) + (stats.beta - 1));
      userStats.set(action, {
        alpha: stats.alpha,
        beta: stats.beta,
        count,
      });
    }

    // Import into CogniCore optimizer if available
    if (this.interventionOptimizer) {
      for (const [action, stats] of oldStats) {
        const interventionId = SLEEP_ACTION_TO_INTERVENTION_ID[action];
        const successes = Math.max(0, stats.alpha - 1);
        const failures = Math.max(0, stats.beta - 1);

        for (let i = 0; i < successes; i++) {
          await this.interventionOptimizer.recordOutcome({
            decisionPointId: `migration-${Date.now()}-${i}`,
            userId,
            interventionId,
            timestamp: stats.lastUpdate,
            latencySeconds: 86400,
            outcomeType: 'completion',
            value: 1,
            rawValue: 1,
            confidence: 0.7,
          });
        }

        for (let i = 0; i < failures; i++) {
          await this.interventionOptimizer.recordOutcome({
            decisionPointId: `migration-${Date.now()}-${successes + i}`,
            userId,
            interventionId,
            timestamp: stats.lastUpdate,
            latencySeconds: 86400,
            outcomeType: 'completion',
            value: 0,
            rawValue: 0,
            confidence: 0.7,
          });
        }
      }
    }

    if (this.config.debug) {
      console.log(`[SleepCoreAdapter] Imported ${oldStats.size} action statistics for user ${userId}`);
    }
  }

  /**
   * Get user belief state
   */
  getUserBelief(userId: string): IFullBeliefState | undefined {
    return this.userBeliefs.get(userId);
  }

  /**
   * Get intervention statistics
   */
  async getInterventionStats(userId: string): Promise<Map<SleepAction, {
    attempts: number;
    avgReward: number;
    confidence: number
  }>> {
    const stats = new Map<SleepAction, { attempts: number; avgReward: number; confidence: number }>();

    // Get from CogniCore optimizer if available
    if (this.interventionOptimizer) {
      const profile = await this.interventionOptimizer.getUserProfile(userId);

      for (const [interventionId, interventionStats] of Object.entries(profile.interventionStats)) {
        const action = INTERVENTION_ID_TO_SLEEP_ACTION[interventionId];
        if (action) {
          const typedStats = interventionStats as {
            deliveryCount: number;
            averageReward: number;
            totalReward: number;
          };
          stats.set(action, {
            attempts: typedStats.deliveryCount,
            avgReward: typedStats.averageReward,
            confidence: typedStats.deliveryCount > 0 ? Math.min(1, typedStats.deliveryCount / 10) : 0,
          });
        }
      }
    } else {
      // Get from local stats
      const userStats = this.localStats.get(userId);
      if (userStats) {
        for (const [action, actionStats] of userStats) {
          const avgReward = actionStats.alpha / (actionStats.alpha + actionStats.beta);
          stats.set(action, {
            attempts: actionStats.count,
            avgReward,
            confidence: actionStats.count > 0 ? Math.min(1, actionStats.count / 10) : 0,
          });
        }
      }
    }

    return stats;
  }

  /**
   * Get registered interventions
   */
  getInterventions(): IIntervention[] {
    return [...this.interventions];
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create SleepCoreAdapter instance
 *
 * @param config - Adapter configuration
 * @param beliefEngine - Optional CogniCore belief update engine
 * @param interventionOptimizer - Optional CogniCore intervention optimizer
 */
export function createSleepCoreAdapter(
  config?: Partial<ISleepCoreAdapterConfig>,
  beliefEngine?: IBeliefUpdateEngine,
  interventionOptimizer?: IInterventionOptimizer
): SleepCoreAdapter {
  return new SleepCoreAdapter(config, beliefEngine, interventionOptimizer);
}

/**
 * Default adapter instance (standalone mode with local Thompson Sampling)
 */
export const defaultSleepCoreAdapter = new SleepCoreAdapter();
