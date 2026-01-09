/**
 * BeliefStateAdapter Unit Tests
 * Phase 1 CogniCore Engine 2.0
 *
 * Tests the bridge between BeliefUpdateEngine (linear Bayesian)
 * and Phase 1 engines (PLRNN/KalmanFormer nonlinear)
 */

import {
  BeliefStateAdapter,
  createBeliefStateAdapter,
  beliefStateToObservation,
  beliefStateToUncertainty,
  beliefStateToPLRNNState,
  beliefStateToKalmanFormerState,
  plrnnStateToBeliefUpdate,
  kalmanFormerStateToBeliefUpdate,
  mergeHybridPredictions,
  DIMENSION_MAPPING,
  DIMENSION_INDEX,
  type IHybridPrediction,
  type IBeliefAdapterEngines,
} from '../BeliefStateAdapter';

import type { BeliefState, DimensionBelief, Prior, Posterior } from '../IBeliefUpdate';
import type { IPLRNNState, IPLRNNPrediction, IEarlyWarningSignal, ICausalNetwork, IInterventionSimulation } from '../../temporal/interfaces/IPLRNNEngine';
import type { IKalmanFormerState, IKalmanFormerPrediction, IAttentionWeights } from '../../temporal/interfaces/IKalmanFormer';
import type { EmotionType } from '../../state/interfaces/IEmotionalState';
import type { CognitiveDistortionType } from '../../state/interfaces/ICognitiveState';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock Prior
 */
function createMockPrior(mean: number = 0.5, variance: number = 0.1): Prior {
  return {
    mean,
    variance,
    sampleSize: 10,
    lastUpdated: new Date(),
  };
}

/**
 * Create a mock Posterior
 */
function createMockPosterior(mean: number = 0.5, variance: number = 0.1): Posterior {
  return {
    mean,
    variance,
    credibleInterval: {
      lower: mean - 1.96 * Math.sqrt(variance),
      upper: mean + 1.96 * Math.sqrt(variance),
    },
    updatedAt: new Date(),
    basedOnObservations: 10,
  };
}

/**
 * Create a mock DimensionBelief
 */
function createMockDimensionBelief(
  dimension: string,
  mean: number = 0.5,
  variance: number = 0.1
): DimensionBelief {
  return {
    dimension,
    prior: createMockPrior(mean, variance),
    posterior: createMockPosterior(mean, variance),
    beliefShift: 0.05,
    informationGain: 0.1,
    stability: 0.9,
  };
}

/**
 * Create a complete mock BeliefState for testing
 */
function createMockBeliefState(overrides?: {
  valence?: number;
  arousal?: number;
  dominance?: number;
  risk?: number;
  energy?: number;
  copingCapacity?: number;
  socialSupport?: number;
}): BeliefState {
  const v = overrides?.valence ?? 0.2;
  const a = overrides?.arousal ?? -0.3;
  const d = overrides?.dominance ?? 0.6;
  const r = overrides?.risk ?? 0.15;
  const e = overrides?.energy ?? 0.7;
  const c = overrides?.copingCapacity ?? 0.6;
  const s = overrides?.socialSupport ?? 0.5;

  // Create emotion distribution
  const emotionDistribution = new Map<EmotionType, number>([
    ['neutral', 0.3],
    ['calm', 0.2],
    ['anxiety', 0.15],
    ['sadness', 0.1],
    ['joy', 0.1],
    ['stress', 0.15],
  ]);

  // Create cognitive distortion presence
  const distortionPresence = new Map<CognitiveDistortionType, number>([
    ['catastrophizing', 0.1],
    ['black_and_white', 0.1],
    ['mind_reading', 0.1],
    ['fortune_telling', 0.1],
    ['emotional_reasoning', 0.1],
  ]);

  return {
    userId: 'test-user-123',
    timestamp: new Date(),
    emotional: {
      valence: createMockDimensionBelief('valence', v),
      arousal: createMockDimensionBelief('arousal', a),
      dominance: createMockDimensionBelief('dominance', d),
      primaryEmotion: {
        distribution: emotionDistribution,
        entropy: 2.3,
      },
    },
    cognitive: {
      selfView: createMockDimensionBelief('selfView', 0.5),
      worldView: createMockDimensionBelief('worldView', 0.5),
      futureView: createMockDimensionBelief('futureView', 0.5),
      distortionPresence,
    },
    risk: {
      overallRisk: createMockDimensionBelief('overallRisk', r),
      categoryRisks: new Map([
        ['self_harm', createMockDimensionBelief('self_harm', 0.05)],
        ['substance', createMockDimensionBelief('substance', 0.1)],
        ['isolation', createMockDimensionBelief('isolation', 0.1)],
        ['crisis', createMockDimensionBelief('crisis', 0.05)],
      ]),
    },
    resources: {
      energy: createMockDimensionBelief('energy', e),
      copingCapacity: createMockDimensionBelief('copingCapacity', c),
      socialSupport: createMockDimensionBelief('socialSupport', s),
      perma: {
        positive: createMockDimensionBelief('positive', 0.5),
        engagement: createMockDimensionBelief('engagement', 0.5),
        relationships: createMockDimensionBelief('relationships', 0.5),
        meaning: createMockDimensionBelief('meaning', 0.5),
        accomplishment: createMockDimensionBelief('accomplishment', 0.5),
      },
    },
    meta: {
      overallConfidence: 0.75,
      totalObservations: 50,
      averageInformationGain: 0.12,
      beliefConsistency: 0.85,
      predictionAccuracy: 0.7,
    },
  };
}

/**
 * Create a mock IPLRNNState
 */
function createMockPLRNNState(observation: number[] = [0.2, -0.3, 0.6, 0.15, 0.6]): IPLRNNState {
  return {
    latentState: observation.slice(),
    hiddenActivations: new Array(16).fill(0).map(() => Math.random() * 0.1),
    observedState: observation.slice(),
    uncertainty: new Array(5).fill(0.1),
    timestamp: new Date(),
    timestep: 0,
  };
}

/**
 * Create a mock IPLRNNPrediction
 */
function createMockPLRNNPrediction(meanPrediction: number[] = [0.3, -0.2, 0.7, 0.1, 0.65]): IPLRNNPrediction {
  return {
    trajectory: [
      createMockPLRNNState([0.25, -0.25, 0.65, 0.12, 0.62]),
      createMockPLRNNState([0.28, -0.22, 0.68, 0.11, 0.64]),
      createMockPLRNNState(meanPrediction),
    ],
    meanPrediction,
    confidenceInterval: {
      lower: meanPrediction.map(v => v - 0.15),
      upper: meanPrediction.map(v => v + 0.15),
      level: 0.95,
    },
    variance: [
      new Array(5).fill(0.02),
      new Array(5).fill(0.03),
      new Array(5).fill(0.04),
    ],
    earlyWarningSignals: [
      {
        type: 'autocorrelation',
        dimension: 'valence',
        strength: 0.3,
        estimatedTimeToTransition: 24,
        confidence: 0.6,
        recommendation: 'Monitor valence closely',
      },
    ],
    horizon: 12,
  };
}

/**
 * Create a mock IKalmanFormerPrediction
 */
function createMockKalmanFormerPrediction(blendedPrediction: number[] = [0.28, -0.25, 0.68, 0.12, 0.62]): IKalmanFormerPrediction {
  const dim = blendedPrediction.length;
  return {
    stateEstimate: blendedPrediction,
    covariance: blendedPrediction.map(() => blendedPrediction.map(() => 0.1)),
    kalmanContribution: blendedPrediction.map(v => v * 0.6),
    transformerContribution: blendedPrediction.map(v => v * 0.4),
    blendedPrediction,
    confidenceInterval: {
      lower: blendedPrediction.map(v => v - 0.1),
      upper: blendedPrediction.map(v => v + 0.1),
      level: 0.95,
    },
    attention: {
      selfAttention: [[[0.5, 0.3, 0.2]]],
      topInfluentialObservations: [
        { index: 0, timestamp: new Date(), weight: 0.5, dimension: 'valence' },
        { index: 1, timestamp: new Date(), weight: 0.3, dimension: 'arousal' },
      ],
      temporalPattern: 'recency_bias',
    },
    horizon: 4,
  };
}

/**
 * Create mock PLRNN engine
 */
function createMockPLRNNEngine(): IBeliefAdapterEngines['plrnn'] {
  return {
    forward: (state: IPLRNNState) => ({
      ...state,
      timestep: state.timestep + 1,
    }),
    predict: (state: IPLRNNState, horizon: number) => createMockPLRNNPrediction(),
    extractCausalNetwork: () => ({
      nodes: [
        { id: 'valence', label: 'Valence', selfWeight: 0.8, centrality: 0.9, value: 0.2 },
        { id: 'arousal', label: 'Arousal', selfWeight: 0.7, centrality: 0.6, value: -0.3 },
        { id: 'risk', label: 'Risk', selfWeight: 0.6, centrality: 0.4, value: 0.15 },
      ],
      edges: [
        { source: 'valence', target: 'risk', weight: -0.5, lag: 1, significance: 0.95 },
        { source: 'arousal', target: 'valence', weight: 0.3, lag: 1, significance: 0.8 },
      ],
      metrics: {
        density: 0.4,
        centralNode: 'valence',
        feedbackLoops: [['valence', 'arousal', 'valence']],
      },
    }),
    simulateIntervention: (state, target, intervention, magnitude) => ({
      target: { dimension: target, intervention, magnitude },
      response: {
        effects: new Map([['valence', 0.3], ['risk', -0.2]]),
        timeToPeak: 6,
        duration: 24,
        sideEffects: [{ dimension: 'arousal', effect: 0.1 }],
      },
      confidence: 0.7,
    }),
  };
}

/**
 * Create mock KalmanFormer engine
 */
function createMockKalmanFormerEngine(): IBeliefAdapterEngines['kalmanFormer'] {
  return {
    update: (state: IKalmanFormerState, observation: number[], timestamp: Date) => ({
      ...state,
      timestamp,
      kalmanState: {
        ...state.kalmanState,
        stateEstimate: observation,
        timestamp,
      },
    }),
    predict: (state: IKalmanFormerState, horizon: number) => createMockKalmanFormerPrediction(),
    explain: (state: IKalmanFormerState) => ({
      selfAttention: [[[0.5, 0.3, 0.2]]],
      topInfluentialObservations: [
        { index: 0, timestamp: new Date(), weight: 0.5, dimension: 'valence' },
      ],
      temporalPattern: 'recency_bias' as const,
    }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('BeliefStateAdapter', () => {
  describe('Constants', () => {
    it('should have correct dimension mapping', () => {
      expect(DIMENSION_MAPPING[0]).toBe('valence');
      expect(DIMENSION_MAPPING[1]).toBe('arousal');
      expect(DIMENSION_MAPPING[2]).toBe('dominance');
      expect(DIMENSION_MAPPING[3]).toBe('risk');
      expect(DIMENSION_MAPPING[4]).toBe('resources');
    });

    it('should have correct dimension index', () => {
      expect(DIMENSION_INDEX.valence).toBe(0);
      expect(DIMENSION_INDEX.arousal).toBe(1);
      expect(DIMENSION_INDEX.dominance).toBe(2);
      expect(DIMENSION_INDEX.risk).toBe(3);
      expect(DIMENSION_INDEX.resources).toBe(4);
    });
  });

  describe('beliefStateToObservation', () => {
    it('should convert belief state to 5D observation vector', () => {
      const belief = createMockBeliefState({
        valence: 0.2,
        arousal: -0.3,
        dominance: 0.6,
        risk: 0.15,
        energy: 0.7,
        copingCapacity: 0.6,
        socialSupport: 0.5,
      });

      const observation = beliefStateToObservation(belief);

      expect(observation).toHaveLength(5);
      expect(observation[0]).toBeCloseTo(0.2);  // valence
      expect(observation[1]).toBeCloseTo(-0.3); // arousal
      expect(observation[2]).toBeCloseTo(0.6);  // dominance
      expect(observation[3]).toBeCloseTo(0.15); // risk
      // resources = (energy + coping + social) / 3 = (0.7 + 0.6 + 0.5) / 3 = 0.6
      expect(observation[4]).toBeCloseTo(0.6);  // resources
    });

    it('should handle extreme values', () => {
      const belief = createMockBeliefState({
        valence: -1.0,
        arousal: 1.0,
        dominance: 0.0,
        risk: 1.0,
        energy: 0.0,
        copingCapacity: 0.0,
        socialSupport: 0.0,
      });

      const observation = beliefStateToObservation(belief);

      expect(observation[0]).toBeCloseTo(-1.0);
      expect(observation[1]).toBeCloseTo(1.0);
      expect(observation[2]).toBeCloseTo(0.0);
      expect(observation[3]).toBeCloseTo(1.0);
      expect(observation[4]).toBeCloseTo(0.0);
    });
  });

  describe('beliefStateToUncertainty', () => {
    it('should extract uncertainty vector from belief state', () => {
      const belief = createMockBeliefState();
      const uncertainty = beliefStateToUncertainty(belief);

      expect(uncertainty).toHaveLength(5);
      // All mock dimension beliefs have variance 0.1
      expect(uncertainty[0]).toBeCloseTo(0.1); // valence variance
      expect(uncertainty[1]).toBeCloseTo(0.1); // arousal variance
      expect(uncertainty[2]).toBeCloseTo(0.1); // dominance variance
      expect(uncertainty[3]).toBeCloseTo(0.1); // risk variance
      expect(uncertainty[4]).toBeCloseTo(0.1); // resources variance (avg)
    });

    it('should compute average variance for resources', () => {
      const belief = createMockBeliefState();
      // Modify variance for testing average calculation
      belief.resources.energy.posterior = createMockPosterior(0.5, 0.2);
      belief.resources.copingCapacity.posterior = createMockPosterior(0.5, 0.1);
      belief.resources.socialSupport.posterior = createMockPosterior(0.5, 0.3);

      const uncertainty = beliefStateToUncertainty(belief);

      // Average of 0.2, 0.1, 0.3 = 0.2
      expect(uncertainty[4]).toBeCloseTo(0.2);
    });
  });

  describe('beliefStateToPLRNNState', () => {
    it('should convert belief state to PLRNN state', () => {
      const belief = createMockBeliefState({
        valence: 0.2,
        arousal: -0.3,
        dominance: 0.6,
        risk: 0.15,
      });

      const plrnnState = beliefStateToPLRNNState(belief);

      expect(plrnnState.latentState).toHaveLength(5);
      expect(plrnnState.observedState).toHaveLength(5);
      expect(plrnnState.uncertainty).toHaveLength(5);
      expect(plrnnState.timestep).toBe(0);
      expect(plrnnState.timestamp).toEqual(belief.timestamp);
    });

    it('should use custom hidden units', () => {
      const belief = createMockBeliefState();
      const plrnnState = beliefStateToPLRNNState(belief, 32);

      expect(plrnnState.hiddenActivations).toHaveLength(32);
    });

    it('should copy observation to latent state', () => {
      const belief = createMockBeliefState({
        valence: 0.5,
        arousal: 0.3,
        dominance: 0.7,
        risk: 0.1,
      });

      const plrnnState = beliefStateToPLRNNState(belief);

      expect(plrnnState.latentState).toEqual(plrnnState.observedState);
      expect(plrnnState.latentState[0]).toBeCloseTo(0.5);
    });
  });

  describe('beliefStateToKalmanFormerState', () => {
    it('should convert belief state to KalmanFormer state', () => {
      const belief = createMockBeliefState();
      const kfState = beliefStateToKalmanFormerState(belief);

      expect(kfState.kalmanState).toBeDefined();
      expect(kfState.kalmanState.stateEstimate).toHaveLength(5);
      expect(kfState.kalmanState.errorCovariance).toHaveLength(5);
      expect(kfState.transformerHidden).toBeDefined();
      expect(kfState.observationHistory).toHaveLength(1);
      expect(kfState.timestamp).toEqual(belief.timestamp);
    });

    it('should create diagonal covariance matrix', () => {
      const belief = createMockBeliefState();
      const kfState = beliefStateToKalmanFormerState(belief);

      const cov = kfState.kalmanState.errorCovariance;
      // Check diagonal elements are variances
      expect(cov[0][0]).toBeCloseTo(0.1);
      // Check off-diagonal elements are zero
      expect(cov[0][1]).toBe(0);
      expect(cov[1][0]).toBe(0);
    });

    it('should initialize all required Kalman fields', () => {
      const belief = createMockBeliefState();
      const kfState = beliefStateToKalmanFormerState(belief);
      const ks = kfState.kalmanState;

      expect(ks.predictedState).toBeDefined();
      expect(ks.predictedCovariance).toBeDefined();
      expect(ks.innovation).toBeDefined();
      expect(ks.innovationCovariance).toBeDefined();
      expect(ks.kalmanGain).toBeDefined();
      expect(ks.timestep).toBe(0);
      expect(ks.isOutlier).toBe(false);
      expect(ks.normalized_innovation_squared).toBe(0);
    });

    it('should set confidence from meta', () => {
      const belief = createMockBeliefState();
      belief.meta = { ...belief.meta, overallConfidence: 0.85 };

      const kfState = beliefStateToKalmanFormerState(belief);

      expect(kfState.confidence).toBeCloseTo(0.85);
    });
  });

  describe('plrnnStateToBeliefUpdate', () => {
    it('should convert PLRNN state to belief update', () => {
      const plrnnState = createMockPLRNNState([0.3, -0.2, 0.7, 0.1, 0.65]);

      const update = plrnnStateToBeliefUpdate(plrnnState);

      expect(update.valence.mean).toBeCloseTo(0.3);
      expect(update.arousal.mean).toBeCloseTo(-0.2);
      expect(update.dominance.mean).toBeCloseTo(0.7);
      expect(update.risk.mean).toBeCloseTo(0.1);
      expect(update.resources.mean).toBeCloseTo(0.65);
    });

    it('should extract variance from uncertainty', () => {
      const plrnnState = createMockPLRNNState();
      plrnnState.uncertainty = [0.05, 0.1, 0.15, 0.2, 0.25];

      const update = plrnnStateToBeliefUpdate(plrnnState);

      expect(update.valence.variance).toBeCloseTo(0.05);
      expect(update.arousal.variance).toBeCloseTo(0.1);
      expect(update.dominance.variance).toBeCloseTo(0.15);
      expect(update.risk.variance).toBeCloseTo(0.2);
      expect(update.resources.variance).toBeCloseTo(0.25);
    });
  });

  describe('kalmanFormerStateToBeliefUpdate', () => {
    it('should convert KalmanFormer state to belief update', () => {
      const belief = createMockBeliefState({
        valence: 0.4,
        arousal: -0.1,
        dominance: 0.8,
        risk: 0.05,
      });
      const kfState = beliefStateToKalmanFormerState(belief);

      const update = kalmanFormerStateToBeliefUpdate(kfState);

      expect(update.valence.mean).toBeCloseTo(0.4);
      expect(update.arousal.mean).toBeCloseTo(-0.1);
      expect(update.dominance.mean).toBeCloseTo(0.8);
      expect(update.risk.mean).toBeCloseTo(0.05);
    });

    it('should extract variance from error covariance diagonal', () => {
      const belief = createMockBeliefState();
      const kfState = beliefStateToKalmanFormerState(belief);

      const update = kalmanFormerStateToBeliefUpdate(kfState);

      expect(update.valence.variance).toBeCloseTo(0.1);
      expect(update.arousal.variance).toBeCloseTo(0.1);
    });
  });

  describe('mergeHybridPredictions', () => {
    it('should merge PLRNN and KalmanFormer predictions', () => {
      const plrnnPred = createMockPLRNNPrediction([0.3, -0.2, 0.7, 0.1, 0.65]);
      const kfPred = createMockKalmanFormerPrediction([0.28, -0.25, 0.68, 0.12, 0.62]);

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'medium', 0.8);

      expect(merged.blendedPrediction.finalPrediction).toHaveLength(5);
      expect(merged.horizon).toBe('medium');
      expect(merged.hoursAhead).toBe(12);
      expect(merged.confidence).toBeCloseTo(0.8);
    });

    it('should favor KalmanFormer for short horizon', () => {
      const plrnnPred = createMockPLRNNPrediction([0.5, 0.5, 0.5, 0.5, 0.5]);
      const kfPred = createMockKalmanFormerPrediction([0.3, 0.3, 0.3, 0.3, 0.3]);

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'short');

      // For short horizon: PLRNN weight 0.3, KF weight 0.7
      // Expected: 0.5 * 0.3 + 0.3 * 0.7 = 0.15 + 0.21 = 0.36
      expect(merged.blendedPrediction.finalPrediction[0]).toBeCloseTo(0.36);
      expect(merged.hoursAhead).toBe(4);
    });

    it('should favor PLRNN for long horizon', () => {
      const plrnnPred = createMockPLRNNPrediction([0.5, 0.5, 0.5, 0.5, 0.5]);
      const kfPred = createMockKalmanFormerPrediction([0.3, 0.3, 0.3, 0.3, 0.3]);

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'long');

      // For long horizon: PLRNN weight 0.8, KF weight 0.2
      // Expected: 0.5 * 0.8 + 0.3 * 0.2 = 0.4 + 0.06 = 0.46
      expect(merged.blendedPrediction.finalPrediction[0]).toBeCloseTo(0.46);
      expect(merged.hoursAhead).toBe(48);
    });

    it('should handle PLRNN only', () => {
      const plrnnPred = createMockPLRNNPrediction([0.4, -0.1, 0.6, 0.2, 0.5]);

      const merged = mergeHybridPredictions(plrnnPred, undefined, 'medium');

      expect(merged.plrnnPrediction).toBeDefined();
      expect(merged.kalmanFormerPrediction).toBeUndefined();
      expect(merged.blendedPrediction.finalPrediction).toEqual([0.4, -0.1, 0.6, 0.2, 0.5]);
      expect(merged.primaryEngine).toBe('plrnn');
    });

    it('should handle KalmanFormer only', () => {
      const kfPred = createMockKalmanFormerPrediction([0.35, -0.15, 0.65, 0.18, 0.55]);

      const merged = mergeHybridPredictions(undefined, kfPred, 'medium');

      expect(merged.plrnnPrediction).toBeUndefined();
      expect(merged.kalmanFormerPrediction).toBeDefined();
      expect(merged.blendedPrediction.finalPrediction).toEqual([0.35, -0.15, 0.65, 0.18, 0.55]);
      expect(merged.primaryEngine).toBe('kalmanformer');
    });

    it('should include early warning signals from PLRNN', () => {
      const plrnnPred = createMockPLRNNPrediction();
      const kfPred = createMockKalmanFormerPrediction();

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'medium');

      expect(merged.earlyWarningSignals).toHaveLength(1);
      expect(merged.earlyWarningSignals[0].type).toBe('autocorrelation');
    });

    it('should include attention from KalmanFormer', () => {
      const plrnnPred = createMockPLRNNPrediction();
      const kfPred = createMockKalmanFormerPrediction();

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'medium');

      expect(merged.attention).toBeDefined();
      expect(merged.attention?.temporalPattern).toBe('recency_bias');
    });

    it('should include credible intervals', () => {
      const plrnnPred = createMockPLRNNPrediction();
      const kfPred = createMockKalmanFormerPrediction();

      const merged = mergeHybridPredictions(plrnnPred, kfPred, 'medium');

      expect(merged.blendedPrediction.credibleIntervals).toHaveLength(1);
      expect(merged.blendedPrediction.credibleIntervals[0].level).toBe(0.95);
      expect(merged.blendedPrediction.credibleIntervals[0].lower).toHaveLength(5);
      expect(merged.blendedPrediction.credibleIntervals[0].upper).toHaveLength(5);
    });
  });

  describe('BeliefStateAdapter Class', () => {
    describe('Factory Function', () => {
      it('should create adapter without engines', () => {
        const adapter = createBeliefStateAdapter();
        expect(adapter).toBeInstanceOf(BeliefStateAdapter);
      });

      it('should create adapter with engines', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
          kalmanFormer: createMockKalmanFormerEngine(),
        });
        expect(adapter).toBeInstanceOf(BeliefStateAdapter);
      });
    });

    describe('Engine Setters', () => {
      it('should set PLRNN engine', () => {
        const adapter = createBeliefStateAdapter();
        adapter.setPLRNNEngine(createMockPLRNNEngine());

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'medium');

        expect(prediction.plrnnPrediction).toBeDefined();
      });

      it('should set KalmanFormer engine', () => {
        const adapter = createBeliefStateAdapter();
        adapter.setKalmanFormerEngine(createMockKalmanFormerEngine());

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'short');

        expect(prediction.kalmanFormerPrediction).toBeDefined();
      });
    });

    describe('predictHybrid', () => {
      it('should return hybrid prediction with both engines', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
          kalmanFormer: createMockKalmanFormerEngine(),
        });

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'medium');

        expect(prediction.plrnnPrediction).toBeDefined();
        expect(prediction.kalmanFormerPrediction).toBeDefined();
        expect(prediction.blendedPrediction).toBeDefined();
        expect(prediction.horizon).toBe('medium');
      });

      it('should handle short horizon', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
          kalmanFormer: createMockKalmanFormerEngine(),
        });

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'short');

        expect(prediction.hoursAhead).toBe(4);
      });

      it('should handle long horizon', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
          kalmanFormer: createMockKalmanFormerEngine(),
        });

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'long');

        expect(prediction.hoursAhead).toBe(48);
      });

      it('should work without any engines', () => {
        const adapter = createBeliefStateAdapter();

        const belief = createMockBeliefState();
        const prediction = adapter.predictHybrid(belief, 'medium');

        expect(prediction.plrnnPrediction).toBeUndefined();
        expect(prediction.kalmanFormerPrediction).toBeUndefined();
        // Should still return a valid structure
        expect(prediction.blendedPrediction).toBeDefined();
      });
    });

    describe('extractCausalNetwork', () => {
      it('should extract causal network when PLRNN is available', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
        });

        const belief = createMockBeliefState();
        const network = adapter.extractCausalNetwork(belief);

        expect(network).toBeDefined();
        expect(network?.nodes).toHaveLength(3);
        expect(network?.edges).toHaveLength(2);
        expect(network?.metrics.centralNode).toBe('valence');
      });

      it('should return null when PLRNN is not available', () => {
        const adapter = createBeliefStateAdapter();

        const belief = createMockBeliefState();
        const network = adapter.extractCausalNetwork(belief);

        expect(network).toBeNull();
      });
    });

    describe('simulateIntervention', () => {
      it('should simulate intervention when PLRNN is available', () => {
        const adapter = createBeliefStateAdapter({
          plrnn: createMockPLRNNEngine(),
        });

        const belief = createMockBeliefState();
        const simulation = adapter.simulateIntervention(
          belief,
          'valence',
          'increase',
          0.3
        );

        expect(simulation).toBeDefined();
        expect(simulation?.target.dimension).toBe('valence');
        expect(simulation?.target.intervention).toBe('increase');
        expect(simulation?.target.magnitude).toBe(0.3);
        expect(simulation?.response.effects).toBeDefined();
      });

      it('should return null when PLRNN is not available', () => {
        const adapter = createBeliefStateAdapter();

        const belief = createMockBeliefState();
        const simulation = adapter.simulateIntervention(
          belief,
          'valence',
          'increase',
          0.3
        );

        expect(simulation).toBeNull();
      });
    });

    describe('explainPrediction', () => {
      it('should explain prediction when KalmanFormer is available', () => {
        const adapter = createBeliefStateAdapter({
          kalmanFormer: createMockKalmanFormerEngine(),
        });

        const belief = createMockBeliefState();
        const explanation = adapter.explainPrediction(belief);

        expect(explanation).toBeDefined();
        expect(explanation?.temporalPattern).toBe('recency_bias');
        expect(explanation?.topInfluentialObservations).toHaveLength(1);
      });

      it('should return null when KalmanFormer is not available', () => {
        const adapter = createBeliefStateAdapter();

        const belief = createMockBeliefState();
        const explanation = adapter.explainPrediction(belief);

        expect(explanation).toBeNull();
      });
    });

    describe('Conversion Helpers', () => {
      it('toObservation should delegate to beliefStateToObservation', () => {
        const adapter = createBeliefStateAdapter();
        const belief = createMockBeliefState({ valence: 0.5 });

        const observation = adapter.toObservation(belief);

        expect(observation).toEqual(beliefStateToObservation(belief));
      });

      it('toPLRNNState should delegate to beliefStateToPLRNNState', () => {
        const adapter = createBeliefStateAdapter();
        const belief = createMockBeliefState();

        const state = adapter.toPLRNNState(belief, 32);

        expect(state.hiddenActivations).toHaveLength(32);
      });

      it('toKalmanFormerState should delegate to beliefStateToKalmanFormerState', () => {
        const adapter = createBeliefStateAdapter();
        const belief = createMockBeliefState();

        const state = adapter.toKalmanFormerState(belief);

        expect(state.kalmanState).toBeDefined();
        expect(state.timestamp).toEqual(belief.timestamp);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle belief state with zero values', () => {
      const belief = createMockBeliefState({
        valence: 0,
        arousal: 0,
        dominance: 0,
        risk: 0,
        energy: 0,
        copingCapacity: 0,
        socialSupport: 0,
      });

      const observation = beliefStateToObservation(belief);

      expect(observation).toEqual([0, 0, 0, 0, 0]);
    });

    it('should handle belief state with negative values', () => {
      const belief = createMockBeliefState({
        valence: -0.8,
        arousal: -0.9,
      });

      const observation = beliefStateToObservation(belief);

      expect(observation[0]).toBeCloseTo(-0.8);
      expect(observation[1]).toBeCloseTo(-0.9);
    });

    it('should handle empty trajectory in merge', () => {
      const plrnnPred: IPLRNNPrediction = {
        ...createMockPLRNNPrediction(),
        trajectory: [],
      };

      const merged = mergeHybridPredictions(plrnnPred, undefined, 'medium');

      expect(merged.blendedPrediction.trajectory).toEqual([]);
    });

    it('should preserve timestamp through conversions', () => {
      const testDate = new Date('2025-06-15T10:30:00Z');
      const belief = createMockBeliefState();
      (belief as any).timestamp = testDate;

      const plrnnState = beliefStateToPLRNNState(belief);
      const kfState = beliefStateToKalmanFormerState(belief);

      expect(plrnnState.timestamp).toEqual(testDate);
      expect(kfState.timestamp).toEqual(testDate);
      expect(kfState.kalmanState.timestamp).toEqual(testDate);
    });
  });
});
