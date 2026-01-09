/**
 * BELIEF STATE ADAPTER
 * ====================
 * Bridge between BeliefUpdateEngine (linear Bayesian) and Phase 1 engines
 * (PLRNN nonlinear dynamics, KalmanFormer hybrid)
 *
 * Scientific Foundation:
 * - ROADMAP task 1.1.3: "BeliefUpdateEngine.predictHybrid()"
 * - Converts BeliefState <-> IPLRNNState <-> IKalmanFormerState
 * - Enables nonlinear prediction while maintaining Bayesian uncertainty
 *
 * (c) BF "Drugoi Put", 2025
 */

import type { BeliefState } from './IBeliefUpdate';
import type {
  IPLRNNState,
  IPLRNNPrediction,
  IEarlyWarningSignal,
  ICausalNetwork,
  IInterventionSimulation,
} from '../temporal/interfaces/IPLRNNEngine';
import type {
  IKalmanFormerState,
  IKalmanFormerPrediction,
  IAttentionWeights,
} from '../temporal/interfaces/IKalmanFormer';
import type { IKalmanFilterState } from '../twin/interfaces/IDigitalTwin';

/**
 * Dimension mapping from BeliefState to 5D state vector
 * S_t = (valence, arousal, dominance, risk, resources)
 */
export const DIMENSION_MAPPING = {
  0: 'valence',
  1: 'arousal',
  2: 'dominance',
  3: 'risk',
  4: 'resources',
} as const;

export const DIMENSION_INDEX: Record<string, number> = {
  valence: 0,
  arousal: 1,
  dominance: 2,
  risk: 3,
  resources: 4,
};

/**
 * Hybrid prediction result combining Bayesian uncertainty with nonlinear dynamics
 */
export interface IHybridPrediction {
  /** PLRNN prediction for nonlinear dynamics */
  plrnnPrediction?: IPLRNNPrediction;

  /** KalmanFormer prediction for short-term accuracy */
  kalmanFormerPrediction?: IKalmanFormerPrediction;

  /** Blended prediction with uncertainty */
  blendedPrediction: {
    /** Mean prediction at each horizon step */
    trajectory: number[][];
    /** Bayesian credible intervals */
    credibleIntervals: Array<{
      lower: number[];
      upper: number[];
      level: number;
    }>;
    /** Final prediction */
    finalPrediction: number[];
  };

  /** Early warning signals from PLRNN */
  earlyWarningSignals: IEarlyWarningSignal[];

  /** Attention explanation from KalmanFormer */
  attention?: IAttentionWeights;

  /** Prediction horizon used */
  horizon: 'short' | 'medium' | 'long';

  /** Hours ahead */
  hoursAhead: number;

  /** Confidence in prediction */
  confidence: number;

  /** Which engine contributed most */
  primaryEngine: 'plrnn' | 'kalmanformer' | 'bayesian';
}

/**
 * Convert BeliefState to 5D observation vector
 * Maps complex belief structure to simple [V, A, D, risk, resources] vector
 */
export function beliefStateToObservation(belief: BeliefState): number[] {
  // Extract posterior means from belief dimensions
  const valence = belief.emotional.valence.posterior.mean;
  const arousal = belief.emotional.arousal.posterior.mean;
  const dominance = belief.emotional.dominance.posterior.mean;
  const risk = belief.risk.overallRisk.posterior.mean;

  // Aggregate resources into single value
  const resources = (
    belief.resources.energy.posterior.mean +
    belief.resources.copingCapacity.posterior.mean +
    belief.resources.socialSupport.posterior.mean
  ) / 3;

  return [valence, arousal, dominance, risk, resources];
}

/**
 * Extract uncertainty vector from BeliefState
 */
export function beliefStateToUncertainty(belief: BeliefState): number[] {
  return [
    belief.emotional.valence.posterior.variance,
    belief.emotional.arousal.posterior.variance,
    belief.emotional.dominance.posterior.variance,
    belief.risk.overallRisk.posterior.variance,
    (belief.resources.energy.posterior.variance +
     belief.resources.copingCapacity.posterior.variance +
     belief.resources.socialSupport.posterior.variance) / 3,
  ];
}

/**
 * Convert BeliefState to IPLRNNState
 */
export function beliefStateToPLRNNState(
  belief: BeliefState,
  hiddenUnits: number = 16
): IPLRNNState {
  const observation = beliefStateToObservation(belief);
  const uncertainty = beliefStateToUncertainty(belief);

  return {
    latentState: observation, // Use observation as initial latent state
    hiddenActivations: new Array(hiddenUnits).fill(0).map(() => Math.random() * 0.1),
    observedState: observation,
    uncertainty,
    timestamp: belief.timestamp,
    timestep: 0,
  };
}

/**
 * Convert IPLRNNState back to partial BeliefState update
 * Returns the dimensions that should be updated
 */
export function plrnnStateToBeliefUpdate(
  plrnnState: IPLRNNState
): Record<string, { mean: number; variance: number }> {
  const obs = plrnnState.observedState;
  const unc = plrnnState.uncertainty;

  return {
    valence: { mean: obs[0] ?? 0, variance: unc[0] ?? 0.1 },
    arousal: { mean: obs[1] ?? 0, variance: unc[1] ?? 0.1 },
    dominance: { mean: obs[2] ?? 0.5, variance: unc[2] ?? 0.1 },
    risk: { mean: obs[3] ?? 0.1, variance: unc[3] ?? 0.1 },
    resources: { mean: obs[4] ?? 0.5, variance: unc[4] ?? 0.1 },
  };
}

/**
 * Convert BeliefState to IKalmanFormerState
 */
export function beliefStateToKalmanFormerState(
  belief: BeliefState,
  _contextWindow: number = 24
): IKalmanFormerState {
  const observation = beliefStateToObservation(belief);
  const uncertainty = beliefStateToUncertainty(belief);
  const dim = observation.length;

  // Create covariance matrix from uncertainty vector
  const covariance = uncertainty.map((v, i) =>
    uncertainty.map((_, j) => (i === j ? v : 0))
  );

  // Create Kalman filter state with all required fields
  const kalmanState: IKalmanFilterState = {
    // Current estimates
    stateEstimate: observation,
    errorCovariance: covariance,

    // Predicted values (same as current for initial state)
    predictedState: observation,
    predictedCovariance: covariance,

    // Innovation (zero for initial state)
    innovation: new Array(dim).fill(0),
    innovationCovariance: covariance,

    // Kalman gain (identity-like for initial)
    kalmanGain: new Array(dim).fill(0).map((_, i) =>
      new Array(dim).fill(0).map((_, j) => (i === j ? 0.5 : 0))
    ),

    // 2025 Diagnostics
    normalized_innovation_squared: 0,
    isOutlier: false,
    adaptedQ: null,
    adaptedR: null,

    // Metadata
    timestep: 0,
    timestamp: belief.timestamp,
  };

  return {
    kalmanState,
    transformerHidden: [new Array(64).fill(0)], // Placeholder for transformer hidden
    observationHistory: [{
      observation,
      timestamp: belief.timestamp,
    }],
    currentBlendRatio: 0.5,
    confidence: belief.meta.overallConfidence,
    timestamp: belief.timestamp,
  };
}

/**
 * Convert IKalmanFormerState back to partial BeliefState update
 */
export function kalmanFormerStateToBeliefUpdate(
  kfState: IKalmanFormerState
): Record<string, { mean: number; variance: number }> {
  const state = kfState.kalmanState.stateEstimate;
  const cov = kfState.kalmanState.errorCovariance;

  return {
    valence: { mean: state[0] ?? 0, variance: cov[0]?.[0] ?? 0.1 },
    arousal: { mean: state[1] ?? 0, variance: cov[1]?.[1] ?? 0.1 },
    dominance: { mean: state[2] ?? 0.5, variance: cov[2]?.[2] ?? 0.1 },
    risk: { mean: state[3] ?? 0.1, variance: cov[3]?.[3] ?? 0.1 },
    resources: { mean: state[4] ?? 0.5, variance: cov[4]?.[4] ?? 0.1 },
  };
}

/**
 * Merge prediction results from multiple engines
 */
export function mergeHybridPredictions(
  plrnnPred?: IPLRNNPrediction,
  kfPred?: IKalmanFormerPrediction,
  horizon: 'short' | 'medium' | 'long' = 'medium',
  confidence: number = 0.5
): IHybridPrediction {
  // Determine weights based on horizon
  // Short-term: favor KalmanFormer (better for noisy observations)
  // Long-term: favor PLRNN (better for nonlinear dynamics)
  let plrnnWeight: number;
  let kfWeight: number;
  let hoursAhead: number;

  switch (horizon) {
    case 'short':
      plrnnWeight = 0.3;
      kfWeight = 0.7;
      hoursAhead = 4;
      break;
    case 'long':
      plrnnWeight = 0.8;
      kfWeight = 0.2;
      hoursAhead = 48;
      break;
    case 'medium':
    default:
      plrnnWeight = 0.5;
      kfWeight = 0.5;
      hoursAhead = 12;
  }

  // Get trajectory from available predictions
  let trajectory: number[][] = [];
  let finalPrediction: number[] = [];

  if (plrnnPred && kfPred) {
    // Blend both predictions
    const plrnnFinal = plrnnPred.meanPrediction;
    const kfFinal = kfPred.blendedPrediction;

    finalPrediction = plrnnFinal.map((p, i) =>
      p * plrnnWeight + (kfFinal[i] ?? 0) * kfWeight
    );

    trajectory = plrnnPred.trajectory.map((state, idx) => {
      const plrnnObs = state.observedState;
      const kfObs = kfPred.trajectory?.[idx]?.kalmanState.stateEstimate ?? plrnnObs;
      return plrnnObs.map((p, i) => p * plrnnWeight + (kfObs[i] ?? 0) * kfWeight);
    });
  } else if (plrnnPred) {
    finalPrediction = plrnnPred.meanPrediction;
    trajectory = plrnnPred.trajectory.map(s => s.observedState);
  } else if (kfPred) {
    finalPrediction = kfPred.blendedPrediction;
    trajectory = kfPred.trajectory?.map(s => s.kalmanState.stateEstimate) ?? [finalPrediction];
  }

  // Build credible intervals
  const credibleIntervals = [{
    lower: plrnnPred?.confidenceInterval.lower ?? finalPrediction.map(v => v - 0.2),
    upper: plrnnPred?.confidenceInterval.upper ?? finalPrediction.map(v => v + 0.2),
    level: 0.95,
  }];

  // Determine primary engine
  let primaryEngine: 'plrnn' | 'kalmanformer' | 'bayesian';
  if (horizon === 'long' || (!kfPred && plrnnPred)) {
    primaryEngine = 'plrnn';
  } else if (horizon === 'short' || (!plrnnPred && kfPred)) {
    primaryEngine = 'kalmanformer';
  } else {
    primaryEngine = 'plrnn';
  }

  return {
    plrnnPrediction: plrnnPred,
    kalmanFormerPrediction: kfPred,
    blendedPrediction: {
      trajectory,
      credibleIntervals,
      finalPrediction,
    },
    earlyWarningSignals: plrnnPred?.earlyWarningSignals ?? [],
    attention: kfPred?.attention,
    horizon,
    hoursAhead,
    confidence,
    primaryEngine,
  };
}

/**
 * BeliefStateAdapter class
 * Bridges BeliefUpdateEngine with Phase 1 nonlinear engines
 */
export class BeliefStateAdapter {
  private plrnnEngine?: {
    forward: (state: IPLRNNState, input?: number[]) => IPLRNNState;
    predict: (state: IPLRNNState, horizon: number) => IPLRNNPrediction;
    extractCausalNetwork: () => ICausalNetwork;
    simulateIntervention: (
      state: IPLRNNState,
      target: string,
      intervention: 'increase' | 'decrease' | 'stabilize',
      magnitude: number
    ) => IInterventionSimulation;
  };

  private kalmanFormerEngine?: {
    update: (state: IKalmanFormerState, observation: number[], timestamp: Date) => IKalmanFormerState;
    predict: (state: IKalmanFormerState, horizon: number) => IKalmanFormerPrediction;
    explain: (state: IKalmanFormerState) => IAttentionWeights;
  };

  constructor(engines?: IBeliefAdapterEngines) {
    this.plrnnEngine = engines?.plrnn;
    this.kalmanFormerEngine = engines?.kalmanFormer;
  }

  /**
   * Set PLRNN engine
   */
  setPLRNNEngine(engine: IBeliefAdapterEngines['plrnn']): void {
    this.plrnnEngine = engine;
  }

  /**
   * Set KalmanFormer engine
   */
  setKalmanFormerEngine(engine: IBeliefAdapterEngines['kalmanFormer']): void {
    this.kalmanFormerEngine = engine;
  }

  /**
   * Hybrid prediction using Phase 1 engines
   * ROADMAP task 1.1.3 deliverable
   */
  predictHybrid(
    belief: BeliefState,
    horizon: 'short' | 'medium' | 'long' = 'medium'
  ): IHybridPrediction {
    // Convert belief to engine states
    const plrnnState = beliefStateToPLRNNState(belief);
    const kfState = beliefStateToKalmanFormerState(belief);

    // Get hours for horizon
    const hoursMap = { short: 4, medium: 12, long: 48 };
    const hours = hoursMap[horizon];

    // Get predictions from available engines
    let plrnnPred: IPLRNNPrediction | undefined;
    let kfPred: IKalmanFormerPrediction | undefined;

    if (this.plrnnEngine) {
      plrnnPred = this.plrnnEngine.predict(plrnnState, hours);
    }

    if (this.kalmanFormerEngine) {
      kfPred = this.kalmanFormerEngine.predict(kfState, hours);
    }

    // Merge predictions
    return mergeHybridPredictions(
      plrnnPred,
      kfPred,
      horizon,
      belief.meta.overallConfidence
    );
  }

  /**
   * Extract causal network from current belief and PLRNN weights
   */
  extractCausalNetwork(_belief: BeliefState): ICausalNetwork | null {
    if (!this.plrnnEngine) {
      return null;
    }

    return this.plrnnEngine.extractCausalNetwork();
  }

  /**
   * Simulate intervention effect on belief state
   */
  simulateIntervention(
    belief: BeliefState,
    target: string,
    intervention: 'increase' | 'decrease' | 'stabilize',
    magnitude: number
  ): IInterventionSimulation | null {
    if (!this.plrnnEngine) {
      return null;
    }

    const plrnnState = beliefStateToPLRNNState(belief);
    return this.plrnnEngine.simulateIntervention(
      plrnnState,
      target,
      intervention,
      magnitude
    );
  }

  /**
   * Get attention explanation for current state
   */
  explainPrediction(belief: BeliefState): IAttentionWeights | null {
    if (!this.kalmanFormerEngine) {
      return null;
    }

    const kfState = beliefStateToKalmanFormerState(belief);
    return this.kalmanFormerEngine.explain(kfState);
  }

  /**
   * Convert belief to observation vector
   */
  toObservation(belief: BeliefState): number[] {
    return beliefStateToObservation(belief);
  }

  /**
   * Convert belief to PLRNN state
   */
  toPLRNNState(belief: BeliefState, hiddenUnits?: number): IPLRNNState {
    return beliefStateToPLRNNState(belief, hiddenUnits);
  }

  /**
   * Convert belief to KalmanFormer state
   */
  toKalmanFormerState(belief: BeliefState, contextWindow?: number): IKalmanFormerState {
    return beliefStateToKalmanFormerState(belief, contextWindow);
  }
}

/**
 * Engine types for factory function
 */
export interface IBeliefAdapterEngines {
  plrnn?: {
    forward: (state: IPLRNNState, input?: number[]) => IPLRNNState;
    predict: (state: IPLRNNState, horizon: number) => IPLRNNPrediction;
    extractCausalNetwork: () => ICausalNetwork;
    simulateIntervention: (
      state: IPLRNNState,
      target: string,
      intervention: 'increase' | 'decrease' | 'stabilize',
      magnitude: number
    ) => IInterventionSimulation;
  };
  kalmanFormer?: {
    update: (state: IKalmanFormerState, observation: number[], timestamp: Date) => IKalmanFormerState;
    predict: (state: IKalmanFormerState, horizon: number) => IKalmanFormerPrediction;
    explain: (state: IKalmanFormerState) => IAttentionWeights;
  };
}

/**
 * Factory function
 */
export function createBeliefStateAdapter(engines?: IBeliefAdapterEngines): BeliefStateAdapter {
  return new BeliefStateAdapter(engines);
}

/**
 * Export types
 */
export type {
  IPLRNNState,
  IPLRNNPrediction,
  IEarlyWarningSignal,
  ICausalNetwork,
  IInterventionSimulation,
  IKalmanFormerState,
  IKalmanFormerPrediction,
  IAttentionWeights,
};
