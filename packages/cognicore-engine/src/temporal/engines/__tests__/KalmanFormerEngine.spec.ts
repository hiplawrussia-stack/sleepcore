/**
 * KalmanFormerEngine Unit Tests
 * Phase 1 CogniCore Engine 2.0
 */

import {
  KalmanFormerEngine,
  createKalmanFormerEngine,
  DEFAULT_KALMANFORMER_CONFIG,
} from '../KalmanFormerEngine';
import type {
  IKalmanFormerConfig,
  IKalmanFormerTrainingSample,
} from '../../interfaces/IKalmanFormer';

describe('KalmanFormerEngine', () => {
  let engine: KalmanFormerEngine;

  beforeEach(() => {
    engine = createKalmanFormerEngine();
    engine.initialize();
  });

  describe('Factory Function', () => {
    it('should create engine with default config', () => {
      const eng = createKalmanFormerEngine();
      expect(eng).toBeInstanceOf(KalmanFormerEngine);
    });

    it('should create engine with custom config', () => {
      const customConfig: Partial<IKalmanFormerConfig> = {
        embedDim: 128,
        numHeads: 8,
        numLayers: 4,
        blendRatio: 0.7,
      };
      const eng = createKalmanFormerEngine(customConfig);
      eng.initialize();
      expect(eng).toBeInstanceOf(KalmanFormerEngine);
    });
  });

  describe('Initialization', () => {
    it('should initialize weights', () => {
      const weights = engine.getWeights();
      expect(weights).toBeDefined();
      expect(weights.kalman).toBeDefined();
      expect(weights.transformer).toBeDefined();
      expect(weights.embedding).toBeDefined();
    });

    it('should have default config values', () => {
      expect(DEFAULT_KALMANFORMER_CONFIG.stateDim).toBe(5);
      expect(DEFAULT_KALMANFORMER_CONFIG.obsDim).toBe(5);
      expect(DEFAULT_KALMANFORMER_CONFIG.embedDim).toBe(64);
    });
  });

  describe('Weight Structure', () => {
    it('should have kalman matrices', () => {
      const weights = engine.getWeights();
      expect(weights.kalman.stateTransition).toBeDefined();
      expect(weights.kalman.observationMatrix).toBeDefined();
      expect(weights.kalman.processNoise).toBeDefined();
      expect(weights.kalman.measurementNoise).toBeDefined();
    });

    it('should have transformer weights', () => {
      const weights = engine.getWeights();
      expect(weights.transformer.queryWeights).toBeDefined();
      expect(weights.transformer.keyWeights).toBeDefined();
      expect(weights.transformer.valueWeights).toBeDefined();
      expect(weights.transformer.outputProjection).toBeDefined();
    });

    it('should have embedding weights', () => {
      const weights = engine.getWeights();
      expect(weights.embedding.observation).toBeDefined();
      expect(weights.embedding.position).toBeDefined();
    });
  });

  describe('PLRNN Interoperability', () => {
    it('should convert from PLRNN state', () => {
      const plrnnState = {
        latentState: [0.1, 0.2, 0.3, 0.4, 0.5],
        hiddenActivations: new Array(16).fill(0),
        observedState: [0.5, 0.3, 0.7, 0.2, 0.8],
        uncertainty: [0.1, 0.1, 0.1, 0.1, 0.1],
        timestamp: new Date(),
        timestep: 0,
      };

      const kfState = engine.fromPLRNNState(plrnnState);

      expect(kfState).toBeDefined();
      expect(kfState.kalmanState).toBeDefined();
    });
  });

  describe('Weight Management', () => {
    it('should load and save weights', () => {
      const originalWeights = engine.getWeights();

      const newEngine = createKalmanFormerEngine();
      newEngine.loadWeights(originalWeights);

      const loadedWeights = newEngine.getWeights();
      expect(loadedWeights.meta).toBeDefined();
      expect(loadedWeights.meta.config).toBeDefined();
    });

    it('should preserve meta information', () => {
      const weights = engine.getWeights();
      expect(weights.meta.trainedAt).toBeDefined();
      expect(weights.meta.config).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use custom embed dimension', () => {
      const customEngine = createKalmanFormerEngine({ embedDim: 128 });
      customEngine.initialize();
      const weights = customEngine.getWeights();
      expect(weights.meta.config.embedDim).toBe(128);
    });

    it('should use custom number of heads', () => {
      const customEngine = createKalmanFormerEngine({ numHeads: 8 });
      customEngine.initialize();
      const weights = customEngine.getWeights();
      expect(weights.meta.config.numHeads).toBe(8);
    });

    it('should use custom number of layers', () => {
      const customEngine = createKalmanFormerEngine({ numLayers: 4 });
      customEngine.initialize();
      const weights = customEngine.getWeights();
      expect(weights.meta.config.numLayers).toBe(4);
    });
  });

  describe('Explain Function', () => {
    it('should return explanation structure', () => {
      // Create a minimal state that the engine can process
      const minimalState = {
        kalmanState: {
          mean: [0.5, 0.3, 0.7, 0.2, 0.8],
          covariance: Array(5).fill(null).map(() => Array(5).fill(0.1)),
          timestamp: new Date(),
        },
        transformerHidden: [],
        observationHistory: [
          { observation: [0.5, 0.3, 0.7, 0.2, 0.8], timestamp: new Date() },
        ],
        currentBlendRatio: 0.5,
        confidence: 0.8,
        timestamp: new Date(),
      };

      const explanation = engine.explain(minimalState);
      expect(explanation).toBeDefined();
      expect(explanation.topInfluentialObservations).toBeDefined();
      expect(explanation.temporalPattern).toBeDefined();
    });
  });
});
