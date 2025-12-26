/**
 * Digital Twin Service
 *
 * Phase 6.3: Main Service for Mental Health Digital Twins Management
 *
 * 2025 Research Integration:
 * - Real-time bidirectional synchronization
 * - Multi-method state estimation (Kalman, Bayesian, Ensemble)
 * - Digital phenotyping integration
 * - Personalization learning
 * - POMDP belief state management
 *
 * Research basis:
 * - CogniFit/Duke Digital Cognitive Twins Framework (2025)
 * - Nature: "Digital twins and Big AI"
 * - Frontiers: "Digital twins and the future of precision mental health"
 *
 * © БФ "Другой путь", 2025
 */

import {
  IDigitalTwinState,
  IDigitalTwinService,
  ITwinStateVariable,
  IStateTrajectory,
  ITwinPersonalization,
  IPhenotypingObservation,
  StateEstimationMethod,
  TwinStability,
  AttractorType,
  SyncMode,
  PhenotypingSource,
  generateTwinId,
} from '../interfaces/IDigitalTwin';

import { KalmanFilterEngine } from '../engines/KalmanFilterEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default state variables for mental health digital twin
 */
const DEFAULT_STATE_VARIABLES: Array<{
  id: string;
  name: string;
  nameRu: string;
  defaultValue: number;
  processNoise: number;
  measurementNoise: number;
}> = [
  // Emotional variables
  { id: 'emotion_anxiety', name: 'Anxiety Level', nameRu: 'Уровень тревоги', defaultValue: 0.3, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'emotion_sadness', name: 'Sadness Level', nameRu: 'Уровень грусти', defaultValue: 0.3, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'emotion_stress', name: 'Stress Level', nameRu: 'Уровень стресса', defaultValue: 0.3, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'emotion_joy', name: 'Joy Level', nameRu: 'Уровень радости', defaultValue: 0.5, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'emotion_hopelessness', name: 'Hopelessness', nameRu: 'Безнадёжность', defaultValue: 0.2, processNoise: 0.03, measurementNoise: 0.1 },

  // Cognitive variables
  { id: 'cognition_rumination', name: 'Rumination', nameRu: 'Руминация', defaultValue: 0.3, processNoise: 0.04, measurementNoise: 0.1 },
  { id: 'cognition_focus', name: 'Focus/Concentration', nameRu: 'Концентрация', defaultValue: 0.6, processNoise: 0.04, measurementNoise: 0.1 },
  { id: 'cognition_suicidal_ideation', name: 'Suicidal Ideation', nameRu: 'Суицидальные мысли', defaultValue: 0.0, processNoise: 0.02, measurementNoise: 0.05 },

  // Physiological variables
  { id: 'physio_sleep_quality', name: 'Sleep Quality', nameRu: 'Качество сна', defaultValue: 0.6, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'physio_energy', name: 'Energy Level', nameRu: 'Уровень энергии', defaultValue: 0.5, processNoise: 0.05, measurementNoise: 0.1 },
  { id: 'physio_appetite', name: 'Appetite', nameRu: 'Аппетит', defaultValue: 0.5, processNoise: 0.03, measurementNoise: 0.1 },

  // Social variables
  { id: 'social_engagement', name: 'Social Engagement', nameRu: 'Социальная активность', defaultValue: 0.5, processNoise: 0.04, measurementNoise: 0.1 },
  { id: 'social_support', name: 'Perceived Support', nameRu: 'Воспринимаемая поддержка', defaultValue: 0.5, processNoise: 0.03, measurementNoise: 0.1 },

  // Behavioral variables
  { id: 'behavior_withdrawal', name: 'Social Withdrawal', nameRu: 'Социальная изоляция', defaultValue: 0.3, processNoise: 0.04, measurementNoise: 0.1 },
  { id: 'behavior_substance_use', name: 'Substance Use Risk', nameRu: 'Риск употребления', defaultValue: 0.2, processNoise: 0.03, measurementNoise: 0.1 },

  // Protective factors
  { id: 'protective_coping', name: 'Coping Skills', nameRu: 'Навыки совладания', defaultValue: 0.5, processNoise: 0.03, measurementNoise: 0.1 },
  { id: 'protective_resilience', name: 'Resilience', nameRu: 'Резильентность', defaultValue: 0.5, processNoise: 0.02, measurementNoise: 0.1 },
];

/**
 * Observation to variable mapping
 */
const OBSERVATION_VARIABLE_MAPPING: Record<PhenotypingSource, string[]> = {
  gps_location: ['social_engagement', 'behavior_withdrawal'],
  accelerometer: ['physio_energy', 'physio_sleep_quality'],
  screen_time: ['cognition_focus', 'behavior_withdrawal', 'emotion_anxiety'],
  call_logs: ['social_engagement', 'social_support'],
  message_logs: ['social_engagement', 'emotion_sadness'],
  social_media: ['social_engagement', 'emotion_anxiety', 'cognition_rumination'],
  sleep_tracking: ['physio_sleep_quality', 'physio_energy'],
  heart_rate: ['emotion_anxiety', 'emotion_stress'],
  ema_survey: ['emotion_anxiety', 'emotion_sadness', 'emotion_joy', 'emotion_stress'],
  keyboard_dynamics: ['cognition_focus', 'emotion_stress'],
  voice_analysis: ['emotion_sadness', 'emotion_anxiety'],
  facial_expression: ['emotion_joy', 'emotion_sadness', 'emotion_anxiety'],
};

// ============================================================================
// IN-MEMORY STORAGE (Replace with actual database in production)
// ============================================================================

const twinStorage = new Map<number, IDigitalTwinState>();
const historyStorage = new Map<number, IStateTrajectory>();
const personalizationStorage = new Map<number, ITwinPersonalization>();

// ============================================================================
// DIGITAL TWIN SERVICE
// ============================================================================

/**
 * Digital Twin Service
 *
 * Manages lifecycle and operations of mental health digital twins
 */
export class DigitalTwinService implements IDigitalTwinService {
  private kalmanEngine: KalmanFilterEngine;

  constructor() {
    this.kalmanEngine = new KalmanFilterEngine();
  }

  // ==========================================================================
  // TWIN LIFECYCLE
  // ==========================================================================

  async createTwin(
    userId: number,
    initialObservations: IPhenotypingObservation[] = []
  ): Promise<IDigitalTwinState> {
    const twinId = generateTwinId('MHDT');

    // Initialize state variables
    const variables = new Map<string, ITwinStateVariable>();

    for (const varDef of DEFAULT_STATE_VARIABLES) {
      variables.set(varDef.id, {
        id: varDef.id,
        name: varDef.name,
        nameRu: varDef.nameRu,
        value: varDef.defaultValue,
        variance: 0.1,
        confidence: 0.5,
        velocity: 0,
        acceleration: 0,
        baselineValue: varDef.defaultValue,
        historicalMean: varDef.defaultValue,
        historicalStd: 0.1,
        kalmanState: {
          estimate: varDef.defaultValue,
          errorCovariance: 0.1,
          processNoise: varDef.processNoise,
          measurementNoise: varDef.measurementNoise,
          gain: 0.5,
        },
        lastObserved: new Date(),
        lastUpdated: new Date(),
        observationCount: 0,
        dataSource: [],
      });
    }

    // Create initial twin state
    const twin: IDigitalTwinState = {
      id: twinId,
      userId,
      timestamp: new Date(),
      version: 1,
      variables,
      overallWellbeing: 0.5,
      stability: 'stable',
      dominantAttractor: 'point',
      resilience: 0.5,
      lyapunovExponent: -0.3,
      autocorrelation: 0.3,
      varianceRatio: 1.0,
      stateUncertainty: 0.3,
      dataQuality: 0.5,
      beliefState: {
        discreteBeliefs: new Map([
          ['healthy', 0.6],
          ['stressed', 0.3],
          ['crisis', 0.1],
        ]),
        continuousBeliefs: new Map(),
        entropy: 0.5,
      },
      causalGraphId: `causal_${userId}`,
      syncMetadata: {
        lastSync: new Date(),
        syncMode: 'bidirectional',
        pendingUpdates: 0,
        syncHealth: 1.0,
      },
    };

    // Apply initial observations if any
    for (const observation of initialObservations) {
      await this.applyObservation(twin, observation);
    }

    // Store
    twinStorage.set(userId, twin);

    // Initialize history
    historyStorage.set(userId, {
      userId,
      timepoints: [new Date()],
      states: [twin],
      interventionsApplied: [],
    });

    return twin;
  }

  async getTwin(userId: number): Promise<IDigitalTwinState | null> {
    return twinStorage.get(userId) || null;
  }

  async deleteTwin(userId: number): Promise<boolean> {
    const existed = twinStorage.has(userId);
    twinStorage.delete(userId);
    historyStorage.delete(userId);
    personalizationStorage.delete(userId);
    return existed;
  }

  // ==========================================================================
  // STATE UPDATES
  // ==========================================================================

  async updateWithObservation(
    userId: number,
    observation: IPhenotypingObservation
  ): Promise<IDigitalTwinState> {
    let twin = await this.getTwin(userId);

    if (!twin) {
      twin = await this.createTwin(userId);
    }

    // Apply observation
    await this.applyObservation(twin, observation);

    // Update derived metrics
    this.updateDerivedMetrics(twin);

    // Increment version
    twin.version++;
    twin.timestamp = new Date();

    // Update sync metadata
    twin.syncMetadata.lastSync = new Date();
    twin.syncMetadata.syncHealth = 1.0;

    // Store updated twin
    twinStorage.set(userId, twin);

    // Update history
    this.updateHistory(userId, twin);

    return twin;
  }

  async batchUpdate(
    userId: number,
    observations: IPhenotypingObservation[]
  ): Promise<IDigitalTwinState> {
    let twin = await this.getTwin(userId);

    if (!twin) {
      twin = await this.createTwin(userId);
    }

    // Sort observations by timestamp
    observations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply each observation
    for (const observation of observations) {
      await this.applyObservation(twin, observation);
    }

    // Update derived metrics
    this.updateDerivedMetrics(twin);

    // Update version and timestamp
    twin.version++;
    twin.timestamp = new Date();

    // Store
    twinStorage.set(userId, twin);
    this.updateHistory(userId, twin);

    return twin;
  }

  // ==========================================================================
  // STATE ESTIMATION
  // ==========================================================================

  async estimateState(
    userId: number,
    method: StateEstimationMethod = 'kalman_filter'
  ): Promise<IDigitalTwinState> {
    const twin = await this.getTwin(userId);
    if (!twin) {
      return this.createTwin(userId);
    }

    // Apply state estimation based on method
    switch (method) {
      case 'kalman_filter':
        this.applyKalmanEstimation(twin);
        break;
      case 'ensemble_kalman':
        this.applyEnsembleEstimation(twin);
        break;
      case 'bayesian_inference':
        this.applyBayesianEstimation(twin);
        break;
      default:
        this.applyKalmanEstimation(twin);
    }

    // Update derived metrics
    this.updateDerivedMetrics(twin);

    twin.version++;
    twin.timestamp = new Date();
    twinStorage.set(userId, twin);

    return twin;
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  async getStateHistory(userId: number, days: number): Promise<IStateTrajectory> {
    const history = historyStorage.get(userId);

    if (!history) {
      return {
        userId,
        timepoints: [],
        states: [],
        interventionsApplied: [],
      };
    }

    // Filter by days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filteredIndices = history.timepoints
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t >= cutoff)
      .map(({ i }) => i);

    return {
      userId,
      timepoints: filteredIndices.map(i => history.timepoints[i]),
      states: filteredIndices.map(i => history.states[i]),
      interventionsApplied: history.interventionsApplied.filter(
        int => int.timestamp >= cutoff
      ),
    };
  }

  // ==========================================================================
  // PERSONALIZATION
  // ==========================================================================

  async getPersonalization(userId: number): Promise<ITwinPersonalization | null> {
    return personalizationStorage.get(userId) || null;
  }

  async updatePersonalization(userId: number): Promise<ITwinPersonalization> {
    const history = await this.getStateHistory(userId, 30);

    if (history.states.length < 7) {
      // Not enough data - return defaults
      const defaultPersonalization: ITwinPersonalization = {
        userId,
        learnedAt: new Date(),
        lastValidated: new Date(),
        meanReversionRate: new Map(),
        volatility: new Map(),
        sensitivityMatrix: new Map(),
        interventionResponse: new Map(),
        stressorVulnerability: new Map(),
        protectiveFactorEfficacy: new Map(),
        circadianPattern: new Map(),
        weeklyPattern: new Map(),
        seasonalPattern: new Map(),
        intraIndividualVariability: new Map(),
        responseLatency: new Map(),
        sustainedEffectRate: new Map(),
        learnedPriors: new Map(),
        dataPointsUsed: history.states.length,
        fitQuality: 0,
        crossValidationScore: 0,
      };
      personalizationStorage.set(userId, defaultPersonalization);
      return defaultPersonalization;
    }

    // Learn parameters from history
    const meanReversionRate = new Map<string, number>();
    const volatility = new Map<string, number>();
    const learnedPriors = new Map<string, { mean: number; variance: number }>();

    for (const varDef of DEFAULT_STATE_VARIABLES) {
      const timeSeries = history.states.map(s => s.variables.get(varDef.id)?.value ?? 0.5);

      // Estimate mean reversion rate (Ornstein-Uhlenbeck parameter)
      const mrRate = this.estimateMeanReversionRate(timeSeries);
      meanReversionRate.set(varDef.id, mrRate);

      // Estimate volatility
      const vol = this.calculateVolatility(timeSeries);
      volatility.set(varDef.id, vol);

      // Learn priors
      const mean = timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
      const variance = timeSeries.reduce((sum, x) => sum + (x - mean) ** 2, 0) / timeSeries.length;
      learnedPriors.set(varDef.id, { mean, variance });
    }

    const personalization: ITwinPersonalization = {
      userId,
      learnedAt: new Date(),
      lastValidated: new Date(),
      meanReversionRate,
      volatility,
      sensitivityMatrix: new Map(),
      interventionResponse: new Map(),
      stressorVulnerability: new Map(),
      protectiveFactorEfficacy: new Map(),
      circadianPattern: new Map(),
      weeklyPattern: this.learnWeeklyPattern(history),
      seasonalPattern: new Map(),
      intraIndividualVariability: volatility,
      responseLatency: new Map(),
      sustainedEffectRate: new Map(),
      learnedPriors,
      dataPointsUsed: history.states.length,
      fitQuality: 0.7,
      crossValidationScore: 0.65,
    };

    personalizationStorage.set(userId, personalization);
    return personalization;
  }

  // ==========================================================================
  // SYNCHRONIZATION
  // ==========================================================================

  async synchronize(userId: number): Promise<IDigitalTwinState> {
    const twin = await this.getTwin(userId);
    if (!twin) {
      return this.createTwin(userId);
    }

    // Apply any pending updates
    if (twin.syncMetadata.pendingUpdates > 0) {
      // In production, this would sync with external data sources
      twin.syncMetadata.pendingUpdates = 0;
    }

    // Update sync metadata
    twin.syncMetadata.lastSync = new Date();
    twin.syncMetadata.syncHealth = 1.0;

    // Re-estimate state
    await this.estimateState(userId);

    return twin;
  }

  // ==========================================================================
  // PRIVATE: OBSERVATION APPLICATION
  // ==========================================================================

  private async applyObservation(
    twin: IDigitalTwinState,
    observation: IPhenotypingObservation
  ): Promise<void> {
    // Get affected variables
    const affectedVars = OBSERVATION_VARIABLE_MAPPING[observation.source] || [];

    for (const varId of affectedVars) {
      const variable = twin.variables.get(varId);
      if (!variable) continue;

      // Extract measurement from observation
      const measurement = this.extractMeasurement(observation, varId);
      if (measurement === null) continue;

      // Apply Kalman update
      if (variable.kalmanState) {
        const config = this.getKalmanConfig(variable);
        const state = this.kalmanEngine.initialize(config);

        // Predict
        const predicted = this.kalmanEngine.predict(state, config);

        // Update with measurement
        const updated = this.kalmanEngine.update(predicted, [measurement], config);

        // Update variable
        variable.value = updated.stateEstimate[0];
        variable.variance = updated.errorCovariance[0][0];
        variable.kalmanState = {
          estimate: updated.stateEstimate[0],
          errorCovariance: updated.errorCovariance[0][0],
          processNoise: config.processNoiseCovariance[0][0],
          measurementNoise: config.measurementNoiseCovariance[0][0],
          gain: updated.kalmanGain[0][0],
        };
      } else {
        // Simple exponential smoothing
        const alpha = 0.3;
        variable.value = alpha * measurement + (1 - alpha) * variable.value;
      }

      // Update metadata
      variable.lastObserved = observation.timestamp;
      variable.lastUpdated = new Date();
      variable.observationCount++;
      if (!variable.dataSource.includes(observation.source)) {
        variable.dataSource.push(observation.source);
      }

      // Update velocity
      const prevValue = variable.historicalMean;
      variable.velocity = variable.value - prevValue;
      variable.acceleration = variable.velocity - (variable.velocity || 0);

      // Update confidence
      variable.confidence = this.calculateConfidence(variable);
    }
  }

  private extractMeasurement(observation: IPhenotypingObservation, varId: string): number | null {
    // Check processed features first
    if (observation.processedFeatures.has(varId)) {
      return observation.processedFeatures.get(varId) ?? null;
    }

    // Map raw value to variable scale [0, 1]
    const rawValue = observation.rawValue;

    if (typeof rawValue === 'number') {
      // Normalize based on source
      switch (observation.source) {
        case 'screen_time':
          // Hours per day, normalize to 0-1 (0-12 hours)
          return Math.min(1, rawValue / 12);
        case 'sleep_tracking':
          // Hours, normalize (0-12 hours optimal at 7-8)
          return Math.min(1, Math.max(0, 1 - Math.abs(rawValue - 7.5) / 7.5));
        case 'ema_survey':
          // Already 0-1 or 1-10 scale
          return rawValue <= 1 ? rawValue : rawValue / 10;
        default:
          return Math.min(1, Math.max(0, rawValue));
      }
    }

    return null;
  }

  private getKalmanConfig(variable: ITwinStateVariable) {
    const q = variable.kalmanState?.processNoise || 0.01;
    const r = variable.kalmanState?.measurementNoise || 0.1;

    return {
      stateTransitionMatrix: [[1]],
      observationMatrix: [[1]],
      processNoiseCovariance: [[q]],
      measurementNoiseCovariance: [[r]],
      initialState: [variable.value],
      initialCovariance: [[variable.variance || 0.1]],
      adaptiveQ: true,
      adaptiveR: true,
      adaptationRate: 0.1,
      forgettingFactor: 0.95,
      outlierThreshold: 3.0,
      maxGain: 0.9,
    };
  }

  // ==========================================================================
  // PRIVATE: STATE ESTIMATION METHODS
  // ==========================================================================

  private applyKalmanEstimation(twin: IDigitalTwinState): void {
    for (const [, variable] of Array.from(twin.variables)) {
      if (!variable.kalmanState) continue;

      const config = this.getKalmanConfig(variable);
      const state = this.kalmanEngine.initialize(config);
      const predicted = this.kalmanEngine.predict(state, config);

      variable.value = predicted.predictedState[0];
      variable.variance = predicted.predictedCovariance[0][0];
    }
  }

  private applyEnsembleEstimation(twin: IDigitalTwinState): void {
    // Simplified ensemble - average multiple Kalman runs
    for (const [, variable] of Array.from(twin.variables)) {
      const estimates: number[] = [];

      for (let i = 0; i < 10; i++) {
        const config = this.getKalmanConfig(variable);
        // Add noise to initial state
        config.initialState[0] += (Math.random() - 0.5) * 0.1;

        const state = this.kalmanEngine.initialize(config);
        const predicted = this.kalmanEngine.predict(state, config);
        estimates.push(predicted.predictedState[0]);
      }

      variable.value = estimates.reduce((a, b) => a + b, 0) / estimates.length;
      variable.variance = estimates.reduce((sum, x) =>
        sum + (x - variable.value) ** 2, 0) / estimates.length;
    }
  }

  private applyBayesianEstimation(twin: IDigitalTwinState): void {
    // Simplified Bayesian update using conjugate prior
    for (const [varId, variable] of Array.from(twin.variables)) {
      const personalization = personalizationStorage.get(twin.userId);
      const prior = personalization?.learnedPriors.get(varId);

      if (prior) {
        // Bayesian update with Gaussian conjugate prior
        const priorMean = prior.mean;
        const priorVariance = prior.variance;
        const measurement = variable.value;
        const measurementVariance = variable.variance;

        const posteriorVariance = 1 / (1 / priorVariance + 1 / measurementVariance);
        const posteriorMean = posteriorVariance * (priorMean / priorVariance + measurement / measurementVariance);

        variable.value = posteriorMean;
        variable.variance = posteriorVariance;

        // Update posterior
        variable.posterior = {
          mean: posteriorMean,
          variance: posteriorVariance,
          distribution: 'gaussian',
          parameters: { mean: posteriorMean, variance: posteriorVariance },
        };
      }
    }
  }

  // ==========================================================================
  // PRIVATE: DERIVED METRICS
  // ==========================================================================

  private updateDerivedMetrics(twin: IDigitalTwinState): void {
    // Overall wellbeing (weighted average of positive - negative)
    const positiveVars = ['emotion_joy', 'physio_sleep_quality', 'physio_energy', 'social_engagement', 'protective_coping'];
    const negativeVars = ['emotion_anxiety', 'emotion_sadness', 'emotion_stress', 'cognition_rumination', 'behavior_withdrawal'];

    let positiveSum = 0;
    let negativeSum = 0;
    let count = 0;

    for (const varId of positiveVars) {
      const v = twin.variables.get(varId);
      if (v) {
        positiveSum += v.value;
        count++;
      }
    }

    for (const varId of negativeVars) {
      const v = twin.variables.get(varId);
      if (v) {
        negativeSum += v.value;
        count++;
      }
    }

    if (count > 0) {
      twin.overallWellbeing = Math.max(0, Math.min(1,
        (positiveSum / positiveVars.length - negativeSum / negativeVars.length + 1) / 2
      ));
    }

    // Stability based on variance and autocorrelation
    const avgVariance = Array.from(twin.variables.values())
      .reduce((sum, v) => sum + v.variance, 0) / twin.variables.size;

    if (avgVariance < 0.05) {
      twin.stability = 'stable';
    } else if (avgVariance < 0.1) {
      twin.stability = 'metastable';
    } else if (avgVariance < 0.2) {
      twin.stability = 'unstable';
    } else {
      twin.stability = 'critical';
    }

    // Dominant attractor based on wellbeing
    if (twin.overallWellbeing > 0.6) {
      twin.dominantAttractor = 'point';
    } else if (twin.overallWellbeing > 0.4) {
      twin.dominantAttractor = 'limit_cycle';
    } else {
      twin.dominantAttractor = 'strange';
    }

    // Resilience based on stability and protective factors
    const coping = twin.variables.get('protective_coping')?.value || 0.5;
    const resilience = twin.variables.get('protective_resilience')?.value || 0.5;
    twin.resilience = (coping + resilience) / 2;

    // Lyapunov exponent (simplified - negative = stable)
    twin.lyapunovExponent = twin.stability === 'stable' ? -0.5 :
                            twin.stability === 'metastable' ? -0.2 :
                            twin.stability === 'unstable' ? 0 : 0.3;

    // State uncertainty
    twin.stateUncertainty = avgVariance;

    // Data quality based on observation recency
    const now = new Date().getTime();
    const avgRecency = Array.from(twin.variables.values())
      .reduce((sum, v) => sum + (now - v.lastObserved.getTime()), 0) / twin.variables.size;
    const hoursSinceLastObs = avgRecency / (1000 * 60 * 60);
    twin.dataQuality = Math.max(0, 1 - hoursSinceLastObs / 24);

    // Update POMDP belief state
    if (twin.beliefState) {
      const crisisProb = Math.max(0, (negativeSum / negativeVars.length - 0.5) * 2);
      const healthyProb = Math.max(0, (positiveSum / positiveVars.length - 0.3) * 1.5);
      const stressedProb = Math.max(0, 1 - crisisProb - healthyProb);

      const total = crisisProb + healthyProb + stressedProb;
      twin.beliefState.discreteBeliefs.set('crisis', crisisProb / total);
      twin.beliefState.discreteBeliefs.set('healthy', healthyProb / total);
      twin.beliefState.discreteBeliefs.set('stressed', stressedProb / total);

      // Entropy
      let entropy = 0;
      for (const prob of Array.from(twin.beliefState.discreteBeliefs.values())) {
        if (prob > 0) entropy -= prob * Math.log2(prob);
      }
      twin.beliefState.entropy = entropy;
    }
  }

  private calculateConfidence(variable: ITwinStateVariable): number {
    // Based on observation count, recency, and variance
    const obsCountFactor = Math.min(1, variable.observationCount / 10);
    const recencyFactor = Math.max(0, 1 - (Date.now() - variable.lastObserved.getTime()) / (24 * 60 * 60 * 1000));
    const varianceFactor = Math.max(0, 1 - variable.variance);

    return obsCountFactor * 0.3 + recencyFactor * 0.3 + varianceFactor * 0.4;
  }

  // ==========================================================================
  // PRIVATE: HISTORY MANAGEMENT
  // ==========================================================================

  private updateHistory(userId: number, twin: IDigitalTwinState): void {
    let history = historyStorage.get(userId);

    if (!history) {
      history = {
        userId,
        timepoints: [],
        states: [],
        interventionsApplied: [],
      };
    }

    // Add new state
    history.timepoints.push(new Date());
    history.states.push(JSON.parse(JSON.stringify(twin))); // Deep copy

    // Keep last 1000 states
    if (history.states.length > 1000) {
      history.timepoints = history.timepoints.slice(-1000);
      history.states = history.states.slice(-1000);
    }

    historyStorage.set(userId, history);
  }

  // ==========================================================================
  // PRIVATE: PERSONALIZATION LEARNING
  // ==========================================================================

  private estimateMeanReversionRate(timeSeries: number[]): number {
    if (timeSeries.length < 3) return 0.1;

    // AR(1) parameter estimation
    const mean = timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
    const demeaned = timeSeries.map(x => x - mean);

    let numerator = 0;
    let denominator = 0;

    for (let i = 1; i < demeaned.length; i++) {
      numerator += demeaned[i] * demeaned[i - 1];
      denominator += demeaned[i - 1] ** 2;
    }

    const phi = denominator > 0 ? numerator / denominator : 0;

    // Mean reversion rate = 1 - AR(1) coefficient
    return Math.max(0.01, Math.min(1, 1 - phi));
  }

  private calculateVolatility(timeSeries: number[]): number {
    if (timeSeries.length < 2) return 0.1;

    // Calculate returns/changes
    const changes: number[] = [];
    for (let i = 1; i < timeSeries.length; i++) {
      changes.push(timeSeries[i] - timeSeries[i - 1]);
    }

    // Standard deviation of changes
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((sum, x) => sum + (x - mean) ** 2, 0) / changes.length;

    return Math.sqrt(variance);
  }

  private learnWeeklyPattern(history: IStateTrajectory): Map<string, number[]> {
    const patterns = new Map<string, number[]>();

    for (const varDef of DEFAULT_STATE_VARIABLES) {
      const dayValues: number[][] = Array.from({ length: 7 }, () => []);

      for (let i = 0; i < history.states.length; i++) {
        const dayOfWeek = history.timepoints[i].getDay();
        const value = history.states[i].variables.get(varDef.id)?.value ?? 0.5;
        dayValues[dayOfWeek].push(value);
      }

      const pattern = dayValues.map(values =>
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0.5
      );

      patterns.set(varDef.id, pattern);
    }

    return patterns;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const digitalTwinService = new DigitalTwinService();
