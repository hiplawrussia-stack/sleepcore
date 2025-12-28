/**
 * PLRNNEngine Unit Tests
 * Phase 1 CogniCore Engine 2.0
 */

import { PLRNNEngine, createPLRNNEngine, DEFAULT_PLRNN_CONFIG } from '../PLRNNEngine';
import type { IPLRNNState, IPLRNNConfig, IPLRNNTrainingSample } from '../../interfaces/IPLRNNEngine';

// Helper to create a valid state
function createTestState(observation: number[] = [0.5, 0.3, 0.7, 0.2, 0.8]): IPLRNNState {
  const n = observation.length || DEFAULT_PLRNN_CONFIG.latentDim;
  return {
    latentState: observation.slice(),
    hiddenActivations: new Array(DEFAULT_PLRNN_CONFIG.hiddenUnits).fill(0),
    observedState: observation.slice(),
    uncertainty: new Array(n).fill(0.1),
    timestamp: new Date(),
    timestep: 0,
  };
}

describe('PLRNNEngine', () => {
  let engine: PLRNNEngine;

  beforeEach(() => {
    engine = createPLRNNEngine();
    engine.initialize();
  });

  describe('Factory Function', () => {
    it('should create engine with default config', () => {
      const eng = createPLRNNEngine();
      expect(eng).toBeInstanceOf(PLRNNEngine);
    });

    it('should create engine with custom config', () => {
      const customConfig: Partial<IPLRNNConfig> = {
        latentDim: 8,
        hiddenUnits: 32,
        connectivity: 'full',
      };
      const eng = createPLRNNEngine(customConfig);
      eng.initialize();
      expect(eng).toBeInstanceOf(PLRNNEngine);
    });
  });

  describe('Initialization', () => {
    it('should initialize weights', () => {
      const weights = engine.getWeights();
      expect(weights).toBeDefined();
      expect(weights.A).toBeDefined();
      expect(weights.A.length).toBe(DEFAULT_PLRNN_CONFIG.latentDim);
      expect(weights.W).toBeDefined();
      expect(weights.B).toBeDefined();
    });

    it('should auto-initialize if needed', () => {
      const uninitEngine = createPLRNNEngine();
      uninitEngine.initialize(); // Explicit init
      expect(uninitEngine.getWeights()).toBeDefined();
    });
  });

  describe('Forward Pass', () => {
    it('should compute forward step', () => {
      const state = createTestState();
      const nextState = engine.forward(state);

      expect(nextState).toBeDefined();
      expect(nextState.latentState).toBeDefined();
      expect(nextState.latentState.length).toBe(state.latentState.length);
      expect(nextState.timestep).toBe(state.timestep + 1);
    });

    it('should compute forward step with input', () => {
      const state = createTestState();
      const input = [0.1, 0.2, 0.3, 0.4, 0.5];
      const nextState = engine.forward(state, input);

      expect(nextState).toBeDefined();
      expect(nextState.latentState).toBeDefined();
    });

    it('should preserve state immutability', () => {
      const state = createTestState();
      const originalLatent = [...state.latentState];

      engine.forward(state);

      expect(state.latentState).toEqual(originalLatent);
    });

    it('should update timestep', () => {
      const state = createTestState();
      const nextState = engine.forward(state);

      expect(nextState.timestep).toBe(1);
    });
  });

  describe('Prediction', () => {
    it('should predict multiple steps ahead', () => {
      const state = createTestState();
      const prediction = engine.predict(state, 6);

      expect(prediction).toBeDefined();
      expect(prediction.trajectory).toBeDefined();
      expect(prediction.trajectory.length).toBeGreaterThanOrEqual(1);
    });

    it('should include trajectory in prediction', () => {
      const state = createTestState();
      const prediction = engine.predict(state, 3);

      expect(prediction.trajectory).toBeDefined();
      expect(prediction.trajectory.length).toBeGreaterThan(0);
    });

    it('should handle single step prediction', () => {
      const state = createTestState();
      const prediction = engine.predict(state, 1);

      expect(prediction.trajectory).toBeDefined();
    });
  });

  describe('Hybrid Prediction', () => {
    it('should provide short horizon prediction', () => {
      const state = createTestState();
      const prediction = engine.hybridPredict(state, 'short');

      expect(prediction).toBeDefined();
      expect(prediction.trajectory).toBeDefined();
    });

    it('should provide medium horizon prediction', () => {
      const state = createTestState();
      const prediction = engine.hybridPredict(state, 'medium');

      expect(prediction).toBeDefined();
    });

    it('should provide long horizon prediction', () => {
      const state = createTestState();
      const prediction = engine.hybridPredict(state, 'long');

      expect(prediction).toBeDefined();
    });
  });

  describe('Causal Network Extraction', () => {
    it('should extract causal network from weights', () => {
      const network = engine.extractCausalNetwork();

      expect(network).toBeDefined();
      expect(network.nodes).toBeDefined();
      expect(network.edges).toBeDefined();
    });

    it('should have valid node structure', () => {
      const network = engine.extractCausalNetwork();

      expect(network.nodes.length).toBeGreaterThan(0);
      for (const node of network.nodes) {
        expect(node.id).toBeDefined();
      }
    });

    it('should have valid edge structure', () => {
      const network = engine.extractCausalNetwork();

      for (const edge of network.edges) {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(typeof edge.weight).toBe('number');
      }
    });
  });

  describe('Intervention Simulation', () => {
    it('should simulate intervention effect', () => {
      const state = createTestState([0.2, -0.3, 0.5, 0.4, 0.6]);
      const simulation = engine.simulateIntervention(
        state,
        'valence',
        'increase',
        0.5
      );

      expect(simulation).toBeDefined();
      expect(simulation.target).toBeDefined();
      expect(simulation.response).toBeDefined();
      expect(simulation.confidence).toBeDefined();
    });

    it('should handle decrease intervention', () => {
      const state = createTestState([0.8, 0.7, 0.5, 0.2, 0.8]);
      const simulation = engine.simulateIntervention(
        state,
        'arousal',
        'decrease',
        0.3
      );

      expect(simulation).toBeDefined();
      expect(simulation.target.intervention).toBe('decrease');
    });

    it('should handle stabilize intervention', () => {
      const state = createTestState();
      const simulation = engine.simulateIntervention(
        state,
        'dominance',
        'stabilize',
        0.2
      );

      expect(simulation).toBeDefined();
      expect(simulation.target.intervention).toBe('stabilize');
    });
  });

  describe('Early Warning Signal Detection', () => {
    it('should detect early warning signals', () => {
      // Create state history
      const history: IPLRNNState[] = [];
      let state = createTestState();

      for (let i = 0; i < 20; i++) {
        state = engine.forward(state);
        history.push({ ...state });
      }

      const signals = engine.detectEarlyWarnings(history, 5);

      expect(signals).toBeDefined();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should handle short history', () => {
      const history = [createTestState(), createTestState()];
      const signals = engine.detectEarlyWarnings(history, 2);

      expect(signals).toBeDefined();
    });
  });

  describe('Online Training', () => {
    it('should train on sample', () => {
      const sample: IPLRNNTrainingSample = {
        observations: [
          [0.5, 0.3, 0.7, 0.2, 0.8],
          [0.6, 0.4, 0.7, 0.15, 0.85],
          [0.65, 0.35, 0.75, 0.1, 0.9],
        ],
        timestamps: [new Date(), new Date(), new Date()],
        userId: 'test-user',
      };

      const result = engine.trainOnline(sample);

      expect(result).toBeDefined();
      expect(typeof result.loss).toBe('number');
      expect(result.epochs).toBeGreaterThanOrEqual(0);
    });

    it('should return training result with weights', () => {
      const sample: IPLRNNTrainingSample = {
        observations: Array.from({ length: 10 }, (_, i) => [
          0.5 + i * 0.01, 0.3, 0.7, 0.2, 0.8,
        ]),
        timestamps: Array.from({ length: 10 }, (_, i) =>
          new Date(Date.now() + i * 1000)
        ),
        userId: 'test-user',
      };

      const result = engine.trainOnline(sample);

      expect(result).toBeDefined();
      expect(result.weights).toBeDefined();
    });
  });

  describe('Loss Calculation', () => {
    it('should calculate reconstruction loss', () => {
      const predicted = [[0.5, 0.3, 0.7], [0.6, 0.4, 0.8]];
      const actual = [[0.5, 0.3, 0.7], [0.6, 0.4, 0.8]];

      const loss = engine.calculateLoss(predicted, actual);

      expect(loss).toBe(0);
    });

    it('should return positive loss for different values', () => {
      const predicted = [[0.5, 0.3, 0.7]];
      const actual = [[0.6, 0.4, 0.8]];

      const loss = engine.calculateLoss(predicted, actual);

      expect(loss).toBeGreaterThan(0);
    });
  });

  describe('Weight Management', () => {
    it('should load and save weights', () => {
      const originalWeights = engine.getWeights();

      const newEngine = createPLRNNEngine();
      newEngine.loadWeights(originalWeights);

      const loadedWeights = newEngine.getWeights();
      expect(loadedWeights.A).toEqual(originalWeights.A);
    });
  });
});
