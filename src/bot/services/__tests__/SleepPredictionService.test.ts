/**
 * SleepPredictionService Tests
 * ============================
 *
 * Tests for PLRNN-based sleep prediction service.
 * Validates state conversion, prediction, early warning detection, and trend analysis.
 *
 * Scientific basis: npj Digital Medicine 2025, medRxiv 2025 (PLRNNs for EMA prediction)
 *
 * @packageDocumentation
 */

// Mock the @cognicore/engine module FIRST (before imports)
const mockInitialize = jest.fn();
const mockForward = jest.fn();
const mockPredict = jest.fn();
const mockExtractCausalNetwork = jest.fn();
const mockSimulateIntervention = jest.fn();
const mockTrainOnline = jest.fn();
const mockGetComplexityMetrics = jest.fn();

jest.mock('@cognicore/engine', () => ({
  createPLRNNEngine: jest.fn(() => ({
    initialize: mockInitialize,
    forward: mockForward,
    predict: mockPredict,
    extractCausalNetwork: mockExtractCausalNetwork,
    simulateIntervention: mockSimulateIntervention,
    trainOnline: mockTrainOnline,
    getComplexityMetrics: mockGetComplexityMetrics,
  })),
}));

import {
  SleepPredictionService,
  createSleepPredictionService,
  sleepPredictionService,
  DEFAULT_SLEEP_PREDICTION_CONFIG,
  SLEEP_DIMENSION_MAPPING,
  SLEEP_DIMENSION_INDEX,
  type ISleepPredictionConfig,
  type ISleepHistoryEntry,
  type ISleepPrediction,
  type ISleepEarlyWarning,
} from '../SleepPredictionService';

import type { ISleepMetrics } from '../../../sleep/interfaces/ISleepState';

describe('SleepPredictionService', () => {
  let service: SleepPredictionService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SleepPredictionService();

    // Default mock implementations
    mockForward.mockImplementation((state) => ({
      ...state,
      timestep: state.timestep + 1,
    }));

    mockPredict.mockReturnValue({
      trajectory: [
        {
          latentState: [0.85, 0.1, 0.1, 0.7, 0.7],
          hiddenActivations: new Array(16).fill(0),
          observedState: [0.85, 0.1, 0.1, 0.7, 0.7],
          uncertainty: [0.1, 0.1, 0.1, 0.1, 0.1],
          timestamp: new Date(),
          timestep: 1,
        },
        {
          latentState: [0.83, 0.12, 0.12, 0.68, 0.68],
          hiddenActivations: new Array(16).fill(0),
          observedState: [0.83, 0.12, 0.12, 0.68, 0.68],
          uncertainty: [0.12, 0.12, 0.12, 0.12, 0.12],
          timestamp: new Date(),
          timestep: 2,
        },
        {
          latentState: [0.80, 0.15, 0.15, 0.65, 0.65],
          hiddenActivations: new Array(16).fill(0),
          observedState: [0.80, 0.15, 0.15, 0.65, 0.65],
          uncertainty: [0.15, 0.15, 0.15, 0.15, 0.15],
          timestamp: new Date(),
          timestep: 3,
        },
      ],
      variance: [[0.05], [0.07], [0.1]],
      confidence: 0.85,
      earlyWarningSignals: [],
    });

    mockGetComplexityMetrics.mockReturnValue({
      effectiveDimensionality: 5,
      sparsity: 0.3,
      lyapunovExponent: 0.1,
    });

    mockExtractCausalNetwork.mockReturnValue({
      nodes: ['SE', 'SOL', 'WASO', 'TST', 'Quality'],
      edges: [
        { from: 'SE', to: 'Quality', weight: 0.8 },
        { from: 'SOL', to: 'SE', weight: -0.5 },
      ],
    });

    mockSimulateIntervention.mockReturnValue({
      originalTrajectory: [],
      interventionTrajectory: [],
      effect: 0.1,
      confidence: 0.7,
    });
  });

  /**
   * Create test sleep metrics
   */
  function createSleepMetrics(overrides: Partial<ISleepMetrics> = {}): ISleepMetrics {
    return {
      sleepEfficiency: 85,
      sleepOnsetLatency: 15,
      wakeAfterSleepOnset: 20,
      totalSleepTime: 420, // 7 hours in minutes
      numberOfAwakenings: 2,
      timeInBed: 480, // 8 hours in minutes
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:45',
      outOfBedTime: '07:15',
      ...overrides,
    };
  }

  /**
   * Create test sleep history entry
   */
  function createHistoryEntry(
    overrides: Partial<ISleepHistoryEntry> = {}
  ): ISleepHistoryEntry {
    return {
      userId: testUserId,
      date: new Date(),
      metrics: createSleepMetrics(),
      subjectiveQuality: 0.7,
      ...overrides,
    };
  }

  /**
   * Add multiple history entries for user
   */
  function addMultipleEntries(count: number, baseEfficiency: number = 85): void {
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - i));

      service.addSleepEntry({
        userId: testUserId,
        date,
        metrics: createSleepMetrics({
          sleepEfficiency: baseEfficiency + (Math.random() * 5 - 2.5),
        }),
        subjectiveQuality: 0.7 + (Math.random() * 0.2 - 0.1),
      });
    }
  }

  // ==========================================================================
  // Configuration & Constants
  // ==========================================================================
  describe('Configuration & Constants', () => {
    it('should have correct dimension mapping', () => {
      expect(SLEEP_DIMENSION_MAPPING[0]).toBe('sleepEfficiency');
      expect(SLEEP_DIMENSION_MAPPING[1]).toBe('sleepOnsetLatency');
      expect(SLEEP_DIMENSION_MAPPING[2]).toBe('wakeAfterSleepOnset');
      expect(SLEEP_DIMENSION_MAPPING[3]).toBe('totalSleepTime');
      expect(SLEEP_DIMENSION_MAPPING[4]).toBe('sleepQuality');
    });

    it('should have correct dimension indices', () => {
      expect(SLEEP_DIMENSION_INDEX.sleepEfficiency).toBe(0);
      expect(SLEEP_DIMENSION_INDEX.sleepOnsetLatency).toBe(1);
      expect(SLEEP_DIMENSION_INDEX.wakeAfterSleepOnset).toBe(2);
      expect(SLEEP_DIMENSION_INDEX.totalSleepTime).toBe(3);
      expect(SLEEP_DIMENSION_INDEX.sleepQuality).toBe(4);
    });

    it('should have valid default configuration', () => {
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.latentDim).toBe(5);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.plrnnConfig?.hiddenUnits).toBe(16);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxSE).toBe(100);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxSOL).toBe(120);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxWASO).toBe(180);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.normalization.maxTST).toBe(12);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.earlyWarning.seDropThreshold).toBe(12);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.minHistoryEntries).toBe(3);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.short).toBe(24);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.medium).toBe(72);
      expect(DEFAULT_SLEEP_PREDICTION_CONFIG.horizons.long).toBe(168);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<ISleepPredictionConfig> = {
        minHistoryEntries: 5,
        normalization: {
          maxSE: 100,
          maxSOL: 90,
          maxWASO: 150,
          maxTST: 10,
        },
      };

      const customService = new SleepPredictionService(customConfig);
      expect(customService).toBeDefined();
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should not be ready before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should initialize the engine', () => {
      service.initialize();

      expect(service.isReady()).toBe(true);
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('should not double-initialize', () => {
      service.initialize();
      service.initialize();

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // State Conversion
  // ==========================================================================
  describe('State Conversion', () => {
    it('should convert sleep metrics to PLRNN state', () => {
      const metrics = createSleepMetrics({
        sleepEfficiency: 85,
        sleepOnsetLatency: 15,
        wakeAfterSleepOnset: 20,
        totalSleepTime: 420, // 7 hours
      });

      const state = service.sleepMetricsToPLRNNState(metrics, 0.7);

      expect(state.latentState).toHaveLength(5);
      expect(state.latentState[0]).toBeCloseTo(0.85); // SE: 85/100
      expect(state.latentState[1]).toBeCloseTo(0.125); // SOL: 15/120
      expect(state.latentState[2]).toBeCloseTo(0.111, 2); // WASO: 20/180
      expect(state.latentState[3]).toBeCloseTo(0.583, 2); // TST: 7/12
      expect(state.latentState[4]).toBe(0.7); // Quality
      expect(state.observedState).toEqual(state.latentState);
      expect(state.uncertainty).toHaveLength(5);
    });

    it('should clamp normalized values to 0-1', () => {
      const metrics = createSleepMetrics({
        sleepOnsetLatency: 200, // Over max
        wakeAfterSleepOnset: 300, // Over max
        totalSleepTime: 900, // 15 hours, over max
      });

      const state = service.sleepMetricsToPLRNNState(metrics, 0.5);

      expect(state.latentState[1]).toBe(1); // Clamped
      expect(state.latentState[2]).toBe(1); // Clamped
      expect(state.latentState[3]).toBe(1); // Clamped
    });

    it('should convert PLRNN state back to sleep metrics', () => {
      const plrnnState = {
        latentState: [0.85, 0.125, 0.111, 0.583, 0.7],
        hiddenActivations: new Array(16).fill(0),
        observedState: [0.85, 0.125, 0.111, 0.583, 0.7],
        uncertainty: [0.1, 0.1, 0.1, 0.1, 0.1],
        timestamp: new Date(),
        timestep: 0,
      };

      const metrics = service.plrnnStateToSleepMetrics(plrnnState);

      expect(metrics.sleepEfficiency).toBe(85);
      expect(metrics.sleepOnsetLatency).toBe(15);
      expect(metrics.wakeAfterSleepOnset).toBe(20);
      expect(metrics.totalSleepTime).toBe(420); // 7 hours * 60
      expect(metrics.sleepQuality).toBeCloseTo(0.7);
    });

    it('should clamp output metrics to valid ranges', () => {
      const plrnnState = {
        latentState: [1.5, -0.5, 1.2, -0.1, 1.5],
        hiddenActivations: new Array(16).fill(0),
        observedState: [1.5, -0.5, 1.2, -0.1, 1.5],
        uncertainty: [0.1, 0.1, 0.1, 0.1, 0.1],
        timestamp: new Date(),
        timestep: 0,
      };

      const metrics = service.plrnnStateToSleepMetrics(plrnnState);

      expect(metrics.sleepEfficiency).toBe(100); // Clamped to max
      expect(metrics.sleepOnsetLatency).toBe(0); // Clamped to 0
      expect(metrics.wakeAfterSleepOnset).toBe(180); // Clamped to max
      expect(metrics.totalSleepTime).toBe(0); // Clamped to 0
      expect(metrics.sleepQuality).toBe(1); // Clamped to 1
    });
  });

  // ==========================================================================
  // Data Management
  // ==========================================================================
  describe('Data Management', () => {
    it('should add sleep entry', () => {
      const entry = createHistoryEntry();
      service.addSleepEntry(entry);

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(1);
      expect(history[0].userId).toBe(testUserId);
    });

    it('should update PLRNN state on entry when initialized', () => {
      service.initialize();
      service.addSleepEntry(createHistoryEntry());

      expect(mockForward).toHaveBeenCalled();
      expect(service.getCurrentState(testUserId)).toBeDefined();
    });

    it('should store state without forward pass when not initialized', () => {
      service.addSleepEntry(createHistoryEntry());

      expect(mockForward).not.toHaveBeenCalled();
      expect(service.getCurrentState(testUserId)).toBeDefined();
    });

    it('should maintain history for multiple users', () => {
      service.addSleepEntry(createHistoryEntry({ userId: 'user1' }));
      service.addSleepEntry(createHistoryEntry({ userId: 'user2' }));
      service.addSleepEntry(createHistoryEntry({ userId: 'user1' }));

      expect(service.getHistory('user1')).toHaveLength(2);
      expect(service.getHistory('user2')).toHaveLength(1);
    });

    it('should keep only last 90 days of history', () => {
      // Add entries older than 90 days
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      service.addSleepEntry(createHistoryEntry({ date: oldDate }));

      // Add recent entry
      service.addSleepEntry(createHistoryEntry());

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(1); // Old entry filtered out
    });

    it('should return empty array for unknown user history', () => {
      expect(service.getHistory('unknown_user')).toEqual([]);
    });

    it('should return undefined for unknown user state', () => {
      expect(service.getCurrentState('unknown_user')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Prediction
  // ==========================================================================
  describe('Prediction', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should return null for user without sufficient history', () => {
      service.addSleepEntry(createHistoryEntry()); // Only 1 entry

      const prediction = service.predict(testUserId);

      expect(prediction).toBeNull();
    });

    it('should return null for unknown user', () => {
      const prediction = service.predict('unknown_user');

      expect(prediction).toBeNull();
    });

    it('should make prediction with sufficient history', () => {
      addMultipleEntries(7); // Add 7 entries (≥7 for PLRNN path)

      const prediction = service.predict(testUserId, 'medium');

      expect(prediction).not.toBeNull();
      expect(prediction!.userId).toBe(testUserId);
      expect(prediction!.horizon).toBe('medium');
      expect(prediction!.hoursAhead).toBe(72);
      expect(prediction!.daysAhead).toBe(3);
    });

    it('should include sleep efficiency trajectory', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(prediction.sleepEfficiencyTrajectory).toHaveLength(3);
      expect(prediction.sleepEfficiencyTrajectory[0]).toHaveProperty('date');
      expect(prediction.sleepEfficiencyTrajectory[0]).toHaveProperty('predicted');
      expect(prediction.sleepEfficiencyTrajectory[0]).toHaveProperty('lower95');
      expect(prediction.sleepEfficiencyTrajectory[0]).toHaveProperty('upper95');
    });

    it('should include predicted sleep efficiency', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(prediction.predictedSleepEfficiency).toHaveProperty('value');
      expect(prediction.predictedSleepEfficiency).toHaveProperty('confidence');
      expect(prediction.predictedSleepEfficiency).toHaveProperty('lower95');
      expect(prediction.predictedSleepEfficiency).toHaveProperty('upper95');
    });

    it('should include predicted metrics', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(prediction.predictedMetrics).toHaveProperty('sleepOnsetLatency');
      expect(prediction.predictedMetrics).toHaveProperty('wakeAfterSleepOnset');
      expect(prediction.predictedMetrics).toHaveProperty('totalSleepTime');
      expect(prediction.predictedMetrics).toHaveProperty('sleepQuality');
    });

    it('should include trend analysis', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(['improving', 'stable', 'declining', 'critical']).toContain(prediction.trend);
    });

    it('should include deterioration risk', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(prediction.deteriorationRisk).toBeGreaterThanOrEqual(0);
      expect(prediction.deteriorationRisk).toBeLessThanOrEqual(1);
    });

    it('should include recommendations', () => {
      addMultipleEntries(7);

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations).toBeInstanceOf(Array);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(prediction.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should predict for different horizons', () => {
      addMultipleEntries(7);

      const shortPrediction = service.predict(testUserId, 'short')!;
      const longPrediction = service.predict(testUserId, 'long')!;

      expect(shortPrediction.hoursAhead).toBe(24);
      expect(shortPrediction.daysAhead).toBe(1);
      expect(longPrediction.hoursAhead).toBe(168);
      expect(longPrediction.daysAhead).toBe(7);
    });

    it('should auto-initialize when predicting', () => {
      const uninitService = new SleepPredictionService();
      // Add entries to uninitService
      for (let i = 0; i < 7; i++) {
        uninitService.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
        }));
      }

      expect(uninitService.isReady()).toBe(false);
      uninitService.predict(testUserId);
      expect(uninitService.isReady()).toBe(true);
    });
  });

  // ==========================================================================
  // Hybrid Prediction
  // ==========================================================================
  describe('Hybrid Prediction', () => {
    beforeEach(() => {
      service.initialize();
      addMultipleEntries(7);
    });

    it('should return prediction for hybrid method', () => {
      const prediction = service.predictHybrid(testUserId, 'medium');

      expect(prediction).not.toBeNull();
      expect(prediction!.userId).toBe(testUserId);
    });

    it('should return null for insufficient data', () => {
      const prediction = service.predictHybrid('unknown_user');

      expect(prediction).toBeNull();
    });
  });

  // ==========================================================================
  // Early Warning Detection
  // ==========================================================================
  describe('Early Warning Detection', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should detect sleep efficiency drop', () => {
      // Add history with good sleep
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ sleepEfficiency: 90 }),
        }));
      }

      // Mock prediction with declining SE
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.75, 0.15, 0.15, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.1]],
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.earlyWarnings.some(w => w.type === 'efficiency_drop')).toBe(true);
    });

    it('should detect sleep onset latency increase', () => {
      // Add history with low SOL
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ sleepOnsetLatency: 10 }),
        }));
      }

      // Mock prediction with high SOL
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.4, 0.1, 0.7, 0.7], timestep: 1 }, // SOL: 0.4 * 120 = 48
        ],
        variance: [[0.1]],
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.earlyWarnings.some(w => w.type === 'latency_increase')).toBe(true);
    });

    it('should detect WASO increase', () => {
      // Add history with low WASO
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ wakeAfterSleepOnset: 15 }),
        }));
      }

      // Mock prediction with high WASO
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.5, 0.7, 0.7], timestep: 1 }, // WASO: 0.5 * 180 = 90
        ],
        variance: [[0.1]],
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.earlyWarnings.some(w => w.type === 'waso_increase')).toBe(true);
    });

    it('should detect variance spike', () => {
      // Add history
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ sleepEfficiency: 85 + (i % 2) }), // Low variance
        }));
      }

      // Mock prediction with high variance
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.5]], // High variance
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.earlyWarnings.some(w => w.type === 'variance_spike')).toBe(true);
    });

    it('should include pattern disruption from PLRNN EWS', () => {
      addMultipleEntries(7);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.1]],
        confidence: 0.8,
        earlyWarningSignals: [
          {
            type: 'autocorrelation',
            dimension: 'sleepEfficiency',
            strength: 0.8,
            confidence: 0.75,
            estimatedTimeToTransition: 72,
            recommendation: 'Monitor closely',
          },
        ],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.earlyWarnings.some(w => w.type === 'pattern_disruption')).toBe(true);
    });

    it('should include Russian and English messages in warnings', () => {
      // Add history with good sleep
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ sleepEfficiency: 90 }),
        }));
      }

      // Mock prediction with declining SE
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.65, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.1]],
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;
      const warning = prediction.earlyWarnings.find(w => w.type === 'efficiency_drop');

      expect(warning).toBeDefined();
      expect(warning!.messageRu).toContain('Прогноз');
      expect(warning!.messageEn).toContain('Forecast');
    });
  });

  // ==========================================================================
  // Trend Analysis
  // ==========================================================================
  describe('Trend Analysis', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('should detect improving trend', () => {
      addMultipleEntries(7, 75); // Start with lower SE

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.80, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 2 },
          { observedState: [0.90, 0.1, 0.1, 0.7, 0.7], timestep: 3 },
        ],
        variance: [[0.05], [0.05], [0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      addMultipleEntries(7, 90);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
          { observedState: [0.80, 0.1, 0.1, 0.7, 0.7], timestep: 2 },
          { observedState: [0.75, 0.1, 0.1, 0.7, 0.7], timestep: 3 },
        ],
        variance: [[0.05], [0.05], [0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.trend).toBe('declining');
    });

    it('should detect critical trend', () => {
      addMultipleEntries(7, 80);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.72, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
          { observedState: [0.68, 0.1, 0.1, 0.7, 0.7], timestep: 2 },
          { observedState: [0.60, 0.1, 0.1, 0.7, 0.7], timestep: 3 }, // Below 75% and dropping
        ],
        variance: [[0.05], [0.05], [0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.trend).toBe('critical');
    });

    it('should detect stable trend', () => {
      addMultipleEntries(7, 85);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
          { observedState: [0.84, 0.1, 0.1, 0.7, 0.7], timestep: 2 },
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 3 },
        ],
        variance: [[0.05], [0.05], [0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.trend).toBe('stable');
    });
  });

  // ==========================================================================
  // Recommendations
  // ==========================================================================
  describe('Recommendations', () => {
    beforeEach(() => {
      service.initialize();
      addMultipleEntries(7);
    });

    it('should recommend CBT-I review for critical trend', () => {
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.70, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
          { observedState: [0.65, 0.1, 0.1, 0.7, 0.7], timestep: 2 },
          { observedState: [0.60, 0.1, 0.1, 0.7, 0.7], timestep: 3 },
        ],
        variance: [[0.05], [0.05], [0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.some(r => r.includes('CBT-I'))).toBe(true);
    });

    it('should recommend sleep restriction for low efficiency', () => {
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.75, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.some(r => r.includes('постели'))).toBe(true);
    });

    it('should recommend relaxation for high SOL', () => {
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.3, 0.1, 0.7, 0.7], timestep: 1 }, // SOL: 0.3 * 120 = 36
        ],
        variance: [[0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.some(r => r.includes('релаксационные') || r.includes('сонливость'))).toBe(true);
    });

    it('should recommend environment check for high WASO', () => {
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.25, 0.7, 0.7], timestep: 1 }, // WASO: 0.25 * 180 = 45
        ],
        variance: [[0.05]],
        confidence: 0.85,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.some(r => r.includes('температуру') || r.includes('постели'))).toBe(true);
    });

    it('should return positive message for stable good sleep', () => {
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.88, 0.05, 0.05, 0.7, 0.7], timestep: 1 },
          { observedState: [0.89, 0.05, 0.05, 0.7, 0.7], timestep: 2 },
          { observedState: [0.90, 0.05, 0.05, 0.7, 0.7], timestep: 3 },
        ],
        variance: [[0.02], [0.02], [0.02]],
        confidence: 0.9,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.some(r => r.includes('Продолжайте'))).toBe(true);
    });
  });

  // ==========================================================================
  // Causal Analysis
  // ==========================================================================
  describe('Causal Analysis', () => {
    it('should return null for causal network when not initialized', () => {
      const network = service.extractCausalNetwork();

      expect(network).toBeNull();
    });

    it('should extract causal network when initialized', () => {
      service.initialize();

      const network = service.extractCausalNetwork();

      expect(network).not.toBeNull();
      expect(mockExtractCausalNetwork).toHaveBeenCalled();
    });

    it('should return null for intervention simulation without state', () => {
      service.initialize();

      const result = service.simulateIntervention(
        'unknown_user',
        'sleepEfficiency',
        'increase',
        0.1
      );

      expect(result).toBeNull();
    });

    it('should simulate intervention for existing user', () => {
      service.initialize();
      service.addSleepEntry(createHistoryEntry());

      const result = service.simulateIntervention(
        testUserId,
        'sleepEfficiency',
        'increase',
        0.1
      );

      expect(result).not.toBeNull();
      expect(mockSimulateIntervention).toHaveBeenCalled();
    });

    it('should return null for intervention when not initialized', () => {
      service.addSleepEntry(createHistoryEntry());

      const result = service.simulateIntervention(
        testUserId,
        'sleepEfficiency',
        'increase',
        0.1
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Online Learning
  // ==========================================================================
  describe('Online Learning', () => {
    it('should train online with new entry', () => {
      service.initialize();

      const entry = createHistoryEntry();
      service.trainOnline(testUserId, entry);

      expect(mockTrainOnline).toHaveBeenCalledWith({
        observations: expect.any(Array),
        timestamps: [entry.date],
        userId: testUserId,
      });
    });

    it('should auto-initialize when training', () => {
      expect(service.isReady()).toBe(false);

      service.trainOnline(testUserId, createHistoryEntry());

      expect(service.isReady()).toBe(true);
    });

    it('should add entry to history after training', () => {
      service.trainOnline(testUserId, createHistoryEntry());

      expect(service.getHistory(testUserId)).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Diagnostics
  // ==========================================================================
  describe('Diagnostics', () => {
    it('should return default metrics when not initialized', () => {
      const metrics = service.getComplexityMetrics();

      expect(metrics.effectiveDimensionality).toBe(5);
      expect(metrics.sparsity).toBe(0);
      expect(metrics.lyapunovExponent).toBe(0);
    });

    it('should return engine metrics when initialized', () => {
      service.initialize();

      const metrics = service.getComplexityMetrics();

      expect(mockGetComplexityMetrics).toHaveBeenCalled();
      expect(metrics.effectiveDimensionality).toBe(5);
      expect(metrics.sparsity).toBe(0.3);
      expect(metrics.lyapunovExponent).toBe(0.1);
    });

    it('should return statistics', () => {
      service.addSleepEntry(createHistoryEntry({ userId: 'user1' }));
      service.addSleepEntry(createHistoryEntry({ userId: 'user1' }));
      service.addSleepEntry(createHistoryEntry({ userId: 'user2' }));

      const stats = service.getStats();

      expect(stats.usersTracked).toBe(2);
      expect(stats.totalEntries).toBe(3);
      expect(stats.averageHistoryLength).toBe(1.5);
    });

    it('should handle empty statistics', () => {
      const stats = service.getStats();

      expect(stats.usersTracked).toBe(0);
      expect(stats.totalEntries).toBe(0);
      expect(stats.averageHistoryLength).toBe(0);
    });
  });

  // ==========================================================================
  // Factory & Singleton
  // ==========================================================================
  describe('Factory & Singleton', () => {
    it('should create service via factory', () => {
      const created = createSleepPredictionService({ minHistoryEntries: 5 });

      expect(created).toBeInstanceOf(SleepPredictionService);
    });

    it('should export singleton instance', () => {
      expect(sleepPredictionService).toBeInstanceOf(SleepPredictionService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle prediction with exact minHistoryEntries', () => {
      service.initialize();

      // Add exactly 3 entries (minHistoryEntries default)
      for (let i = 0; i < 3; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000),
        }));
      }

      const prediction = service.predict(testUserId);

      expect(prediction).not.toBeNull();
    });

    it('should handle empty trajectory in prediction', () => {
      service.initialize();
      addMultipleEntries(7);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [],
        confidence: 0.5,
        earlyWarningSignals: [],
      });

      // Should return prediction with minimal data
      const prediction = service.predict(testUserId);
      expect(prediction).not.toBeNull();
    });

    it('should handle missing variance data', () => {
      service.initialize();
      addMultipleEntries(7);

      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [], // Empty variance
        confidence: 0.8,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId);

      expect(prediction).not.toBeNull();
    });

    it('should handle default subjective quality', () => {
      const metrics = createSleepMetrics();
      const state = service.sleepMetricsToPLRNNState(metrics);

      expect(state.latentState[4]).toBe(0.5); // Default quality
    });

    it('should handle state with missing observedState values', () => {
      const plrnnState = {
        latentState: [0.85],
        hiddenActivations: [],
        observedState: [], // Empty
        uncertainty: [],
        timestamp: new Date(),
        timestep: 0,
      };

      const metrics = service.plrnnStateToSleepMetrics(plrnnState);

      expect(metrics.sleepEfficiency).toBe(0); // Default to 0 when undefined
      expect(metrics.sleepQuality).toBe(0.5); // Default quality
    });

    it('should calculate variance correctly for small arrays', () => {
      service.initialize();

      // Add 7 entries with varying SE (creates historical variance)
      const seValues = [82, 84, 86, 88, 85, 83, 87]; // Variance ~= 4.67
      for (let i = 0; i < 7; i++) {
        service.addSleepEntry(createHistoryEntry({
          date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000),
          metrics: createSleepMetrics({ sleepEfficiency: seValues[i] }),
        }));
      }

      // Mock prediction with low variance
      // Historical variance is ~4.67, threshold is 1.8x = 8.4
      // Predicted variance should be less than 8.4 / (100^2) = 0.00084
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.85, 0.1, 0.1, 0.7, 0.7], timestep: 1 },
        ],
        variance: [[0.00005]], // Normalized: 0.00005 * 10000 = 0.5 < 7.0
        confidence: 0.9,
        earlyWarningSignals: [],
      });

      const prediction = service.predict(testUserId);

      expect(prediction).not.toBeNull();
      // No variance spike because predicted variance is below threshold
      expect(prediction!.earlyWarnings.filter(w => w.type === 'variance_spike')).toHaveLength(0);
    });

    it('should limit recommendations to 5', () => {
      service.initialize();
      addMultipleEntries(7);

      // Mock prediction with many warnings
      mockPredict.mockReturnValueOnce({
        trajectory: [
          { observedState: [0.60, 0.5, 0.5, 0.4, 0.3], timestep: 1 },
        ],
        variance: [[0.3]],
        confidence: 0.6,
        earlyWarningSignals: [
          { type: 'autocorrelation', dimension: 'SE', strength: 0.9, confidence: 0.8, recommendation: 'Rec1' },
          { type: 'variance', dimension: 'SOL', strength: 0.85, confidence: 0.75, recommendation: 'Rec2' },
          { type: 'connectivity', dimension: 'WASO', strength: 0.8, confidence: 0.7, recommendation: 'Rec3' },
        ],
      });

      const prediction = service.predict(testUserId)!;

      expect(prediction.recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});
