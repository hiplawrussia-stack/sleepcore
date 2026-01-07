/**
 * SleepCorePOMDP - Sleep-Specific POMDP Implementation
 * =====================================================
 * Extends CogniCore's POMDP framework for sleep/insomnia domain.
 *
 * State Space: Sleep metrics, circadian state, insomnia severity
 * Action Space: CBT-I interventions (5 components)
 * Observation Space: Sleep diary entries, wearable data
 * Reward: Sleep efficiency improvement, ISI reduction
 *
 * Uses Thompson Sampling for intervention selection
 * and Kalman Filter for state estimation.
 *
 * @packageDocumentation
 * @module @sleepcore/platform
 */

// Note: SleepCore implements its own POMDP on top of CogniCore's IStateVector
// The core POMDP algorithms (Thompson Sampling, Kalman Filter) are implemented here
import type { ISleepState, ISleepMetrics } from '../sleep/interfaces/ISleepState';

/**
 * Sleep POMDP State
 * Extends CogniCore state vector with sleep-specific dimensions
 */
export interface ISleepPOMDPState {
  /** Sleep Efficiency (0-100) */
  sleepEfficiency: number;

  /** Insomnia Severity Index (0-28) */
  isiScore: number;

  /** Sleep Onset Latency (minutes) */
  solMinutes: number;

  /** Wake After Sleep Onset (minutes) */
  wasoMinutes: number;

  /** Pre-sleep arousal (0-1) */
  preSleepArousal: number;

  /** Sleep anxiety (0-1) */
  sleepAnxiety: number;

  /** Circadian phase deviation (hours) */
  circadianDeviation: number;

  /** Treatment adherence (0-1) */
  treatmentAdherence: number;

  /** Current treatment week */
  treatmentWeek: number;
}

/**
 * Sleep POMDP Actions (CBT-I Interventions)
 */
export type SleepAction =
  | 'adjust_sleep_window'    // SRT: expand/contract TIB
  | 'enforce_wake_time'      // SRT: strict wake time
  | 'leave_bed_reminder'     // SCT: get up if not sleeping
  | 'bed_restriction'        // SCT: bed only for sleep
  | 'challenge_belief'       // CR: Socratic questioning
  | 'behavioral_experiment'  // CR: test belief
  | 'caffeine_education'     // SHE: caffeine advice
  | 'environment_advice'     // SHE: bedroom optimization
  | 'relaxation_pmr'         // RT: Progressive muscle relaxation
  | 'relaxation_breathing'   // RT: Breathing exercise
  | 'relaxation_imagery'     // RT: Guided imagery
  | 'no_intervention';       // Wait/observe

/**
 * Sleep POMDP Observation
 */
export interface ISleepObservation {
  /** Source of data */
  source: 'diary' | 'wearable' | 'hybrid';

  /** Reported/measured sleep metrics */
  metrics: ISleepMetrics;

  /** Subjective quality rating */
  subjectiveQuality: number;

  /** Did user follow prescription? */
  followedPrescription: boolean;

  /** User reported mood */
  morningMood: number;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Action outcome statistics for Thompson Sampling
 */
export interface IActionStats {
  action: SleepAction;
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
  lastUpdate: Date;
}

/**
 * Sleep POMDP Configuration
 */
export interface ISleepPOMDPConfig {
  /** Discount factor for future rewards */
  discountFactor: number;

  /** Exploration vs exploitation balance */
  explorationBonus: number;

  /** Minimum observations before switching actions */
  minObservationsPerAction: number;

  /** Prior strength for Thompson Sampling */
  priorStrength: number;

  /** Reward weights */
  rewardWeights: {
    sleepEfficiency: number;
    isiReduction: number;
    solReduction: number;
    adherence: number;
  };
}

/**
 * Default POMDP configuration
 */
const DEFAULT_CONFIG: ISleepPOMDPConfig = {
  discountFactor: 0.95,
  explorationBonus: 0.1,
  minObservationsPerAction: 3,
  priorStrength: 1,
  rewardWeights: {
    sleepEfficiency: 0.35,
    isiReduction: 0.35,
    solReduction: 0.15,
    adherence: 0.15,
  },
};

/**
 * Sleep POMDP Implementation
 */
export class SleepCorePOMDP {
  private config: ISleepPOMDPConfig;
  private actionStats: Map<SleepAction, IActionStats>;
  private beliefState: ISleepPOMDPState | null = null;
  private stateHistory: ISleepPOMDPState[] = [];
  private observationHistory: ISleepObservation[] = [];

  constructor(config: Partial<ISleepPOMDPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.actionStats = this.initializeActionStats();
  }

  /**
   * Initialize action statistics with priors
   */
  private initializeActionStats(): Map<SleepAction, IActionStats> {
    const actions: SleepAction[] = [
      'adjust_sleep_window',
      'enforce_wake_time',
      'leave_bed_reminder',
      'bed_restriction',
      'challenge_belief',
      'behavioral_experiment',
      'caffeine_education',
      'environment_advice',
      'relaxation_pmr',
      'relaxation_breathing',
      'relaxation_imagery',
      'no_intervention',
    ];

    const stats = new Map<SleepAction, IActionStats>();
    const prior = this.config.priorStrength;

    for (const action of actions) {
      stats.set(action, {
        action,
        alpha: prior,
        beta: prior,
        lastUpdate: new Date(),
      });
    }

    return stats;
  }

  /**
   * Convert ISleepState to POMDP state
   */
  sleepStateToPomdpState(sleepState: ISleepState): ISleepPOMDPState {
    return {
      sleepEfficiency: sleepState.metrics.sleepEfficiency,
      isiScore: sleepState.insomnia.isiScore,
      solMinutes: sleepState.metrics.sleepOnsetLatency,
      wasoMinutes: sleepState.metrics.wakeAfterSleepOnset,
      preSleepArousal: sleepState.cognitions.preSleepArousal,
      sleepAnxiety: sleepState.cognitions.sleepAnxiety,
      circadianDeviation: sleepState.circadian.phaseDeviation,
      treatmentAdherence: 0.7, // Would need tracking
      treatmentWeek: 1, // Would need tracking
    };
  }

  /**
   * Update belief state with new observation (Kalman Filter)
   */
  updateBelief(observation: ISleepObservation): ISleepPOMDPState {
    this.observationHistory.push(observation);

    // Extract observed state
    const observedState: ISleepPOMDPState = {
      sleepEfficiency: observation.metrics.sleepEfficiency,
      isiScore: 0, // Would need questionnaire
      solMinutes: observation.metrics.sleepOnsetLatency,
      wasoMinutes: observation.metrics.wakeAfterSleepOnset,
      preSleepArousal: 0.5, // Would need input
      sleepAnxiety: 0.5, // Would need input
      circadianDeviation: 0, // Would need calculation
      treatmentAdherence: observation.followedPrescription ? 1 : 0,
      treatmentWeek: this.beliefState?.treatmentWeek || 1,
    };

    if (!this.beliefState) {
      this.beliefState = observedState;
      this.stateHistory.push(observedState);
      return observedState;
    }

    // Simple Kalman Filter update
    // K = P / (P + R), where P = process variance, R = measurement variance
    const kalmanGain = 0.3; // Simplified; would compute from covariances

    const updatedState: ISleepPOMDPState = {
      sleepEfficiency:
        this.beliefState.sleepEfficiency +
        kalmanGain * (observedState.sleepEfficiency - this.beliefState.sleepEfficiency),
      isiScore:
        this.beliefState.isiScore +
        kalmanGain * (observedState.isiScore - this.beliefState.isiScore),
      solMinutes:
        this.beliefState.solMinutes +
        kalmanGain * (observedState.solMinutes - this.beliefState.solMinutes),
      wasoMinutes:
        this.beliefState.wasoMinutes +
        kalmanGain * (observedState.wasoMinutes - this.beliefState.wasoMinutes),
      preSleepArousal:
        this.beliefState.preSleepArousal +
        kalmanGain * (observedState.preSleepArousal - this.beliefState.preSleepArousal),
      sleepAnxiety:
        this.beliefState.sleepAnxiety +
        kalmanGain * (observedState.sleepAnxiety - this.beliefState.sleepAnxiety),
      circadianDeviation:
        this.beliefState.circadianDeviation +
        kalmanGain * (observedState.circadianDeviation - this.beliefState.circadianDeviation),
      treatmentAdherence:
        this.beliefState.treatmentAdherence +
        kalmanGain * (observedState.treatmentAdherence - this.beliefState.treatmentAdherence),
      treatmentWeek: this.beliefState.treatmentWeek,
    };

    this.beliefState = updatedState;
    this.stateHistory.push(updatedState);

    return updatedState;
  }

  /**
   * Select next action using Thompson Sampling
   */
  selectAction(context?: Partial<ISleepPOMDPState>): SleepAction {
    const state = context || this.beliefState;
    if (!state) {
      return 'no_intervention';
    }

    // Filter valid actions based on context
    const validActions = this.getValidActions(state);

    // Thompson Sampling: sample from Beta distribution for each action
    let bestAction: SleepAction = 'no_intervention';
    let bestSample = -Infinity;

    for (const action of validActions) {
      const stats = this.actionStats.get(action)!;
      const sample = this.sampleBeta(stats.alpha, stats.beta);

      // Apply context-based bonuses
      const contextBonus = this.calculateContextBonus(action, state);
      const adjustedSample = sample + contextBonus;

      if (adjustedSample > bestSample) {
        bestSample = adjustedSample;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Update action statistics based on outcome
   */
  updateActionOutcome(action: SleepAction, reward: number): void {
    const stats = this.actionStats.get(action);
    if (!stats) return;

    // Convert reward to success/failure (threshold at 0)
    if (reward > 0) {
      stats.alpha += 1;
    } else {
      stats.beta += 1;
    }

    stats.lastUpdate = new Date();
  }

  /**
   * Calculate reward from state transition
   */
  calculateReward(
    previousState: ISleepPOMDPState,
    currentState: ISleepPOMDPState
  ): number {
    const weights = this.config.rewardWeights;

    // Sleep Efficiency improvement
    const seImprovement = (currentState.sleepEfficiency - previousState.sleepEfficiency) / 100;

    // ISI reduction (lower is better)
    const isiReduction = (previousState.isiScore - currentState.isiScore) / 28;

    // SOL reduction (lower is better)
    const solReduction = Math.min(
      1,
      (previousState.solMinutes - currentState.solMinutes) / 30
    );

    // Adherence reward
    const adherenceReward = currentState.treatmentAdherence;

    const totalReward =
      weights.sleepEfficiency * seImprovement +
      weights.isiReduction * isiReduction +
      weights.solReduction * solReduction +
      weights.adherence * adherenceReward;

    return totalReward;
  }

  /**
   * Get valid actions for current state
   */
  private getValidActions(state: Partial<ISleepPOMDPState>): SleepAction[] {
    const actions: SleepAction[] = [];

    // Sleep Restriction actions
    if ((state.sleepEfficiency ?? 0) < 85) {
      actions.push('adjust_sleep_window');
    }
    actions.push('enforce_wake_time');

    // Stimulus Control actions
    if ((state.solMinutes ?? 0) > 20) {
      actions.push('leave_bed_reminder');
    }
    actions.push('bed_restriction');

    // Cognitive Restructuring actions
    if ((state.sleepAnxiety ?? 0) > 0.4) {
      actions.push('challenge_belief');
      actions.push('behavioral_experiment');
    }

    // Sleep Hygiene actions
    actions.push('caffeine_education');
    actions.push('environment_advice');

    // Relaxation actions
    if ((state.preSleepArousal ?? 0) > 0.4) {
      actions.push('relaxation_pmr');
      actions.push('relaxation_breathing');
      actions.push('relaxation_imagery');
    }

    // Always allow no intervention
    actions.push('no_intervention');

    return actions;
  }

  /**
   * Calculate context-based bonus for action selection
   */
  private calculateContextBonus(
    action: SleepAction,
    state: Partial<ISleepPOMDPState>
  ): number {
    let bonus = 0;

    // High anxiety → cognitive or relaxation actions
    if ((state.sleepAnxiety ?? 0) > 0.6) {
      if (action.startsWith('relaxation_') || action.startsWith('challenge_')) {
        bonus += 0.15;
      }
    }

    // Low efficiency → sleep restriction
    if ((state.sleepEfficiency ?? 100) < 80) {
      if (action === 'adjust_sleep_window' || action === 'enforce_wake_time') {
        bonus += 0.1;
      }
    }

    // High SOL → stimulus control
    if ((state.solMinutes ?? 0) > 30) {
      if (action === 'leave_bed_reminder') {
        bonus += 0.15;
      }
    }

    // Exploration bonus for under-sampled actions
    const stats = this.actionStats.get(action);
    if (stats && stats.alpha + stats.beta < 5) {
      bonus += this.config.explorationBonus;
    }

    return bonus;
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Use inverse transform sampling approximation
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  /**
   * Sample from Gamma distribution (approximation)
   */
  private sampleGamma(shape: number): number {
    // Marsaglia and Tsang's method (simplified)
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
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

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Generate standard normal random number (Box-Muller)
   */
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get current belief state
   */
  getBeliefState(): ISleepPOMDPState | null {
    return this.beliefState;
  }

  /**
   * Get action statistics
   */
  getActionStats(): Map<SleepAction, IActionStats> {
    return this.actionStats;
  }

  /**
   * Export state for persistence
   */
  exportState(): {
    beliefState: ISleepPOMDPState | null;
    actionStats: [SleepAction, IActionStats][];
    config: ISleepPOMDPConfig;
  } {
    return {
      beliefState: this.beliefState,
      actionStats: Array.from(this.actionStats.entries()),
      config: this.config,
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: ReturnType<typeof this.exportState>): void {
    this.beliefState = state.beliefState;
    this.actionStats = new Map(state.actionStats);
    this.config = state.config;
  }
}
