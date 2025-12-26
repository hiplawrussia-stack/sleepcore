/**
 * Digital Twin Interfaces
 *
 * Phase 6.3: Mental Health Digital Twin (MHDT) for Precision Mental Health
 *
 * 2025 Research Integration:
 * - CogniFit/Duke Digital Cognitive Twins Framework (2025)
 * - Kalman Filter State Estimation (Enhanced KF, Ensemble KF)
 * - Bayesian Model Updating for Digital Twins (GenAI-BMU)
 * - Digital Phenotyping (smartphone sensors, EMA)
 * - POMDP Belief State Modeling
 * - Multi-layer Architecture (sensing, processing, simulation, visualization)
 * - Big AI Integration (physics-based + data-driven)
 * - Real-time Bidirectional Synchronization
 *
 * Research basis:
 * - Nature: "Digital twins and Big AI: the future of truly individualised healthcare"
 * - PMC: "Digital Twin Cognition: AI-Biomarker Integration in Biomimetic Neuropsychology"
 * - Frontiers: "Digital twins and the future of precision mental health"
 * - JAMA Psychiatry: "A Dynamical Systems View of Psychiatric Disorders"
 * - arXiv: "Position: AI Will Transform Neuropsychology Through MHDTs"
 *
 * © БФ "Другой путь", 2025
 */

import { randomUUID } from 'crypto';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateTwinId(prefix: string = 'TWIN'): string {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

/**
 * Twin state stability classification
 * Extended with 2025 dynamical systems theory
 */
export type TwinStability =
  | 'stable'        // Point attractor, resilient
  | 'metastable'    // Shallow attractor, vulnerable
  | 'unstable'      // No attractor, drifting
  | 'critical'      // Near bifurcation point
  | 'transitioning'; // 2025: Actively crossing tipping point

/**
 * Attractor type in dynamical systems
 */
export type AttractorType =
  | 'point'         // Stable equilibrium
  | 'limit_cycle'   // Periodic oscillation
  | 'strange'       // Chaotic attractor
  | 'none'          // No clear attractor
  | 'quasi_periodic'; // 2025: Quasi-periodic (torus)

/**
 * Scenario outcome classification
 */
export type ScenarioOutcome =
  | 'improvement'
  | 'stable'
  | 'deterioration'
  | 'crisis'
  | 'recovery'
  | 'remission';     // 2025: Full remission

/**
 * Bifurcation type from dynamical systems theory
 */
export type BifurcationType =
  | 'saddle_node'       // Sudden appearance/disappearance of equilibrium
  | 'transcritical'     // Exchange of stability
  | 'pitchfork'         // Symmetry-breaking
  | 'hopf'              // Transition to oscillations
  | 'fold_bifurcation'  // Collapse of attractor basin
  | 'period_doubling'   // 2025: Route to chaos
  | 'blue_sky'          // 2025: Catastrophic transition
  | 'unknown';

/**
 * Digital phenotyping data source
 * Based on 2025 sensor review (112 papers)
 */
export type PhenotypingSource =
  | 'gps_location'          // Most used sensor
  | 'accelerometer'         // Movement patterns
  | 'screen_time'           // App usage
  | 'call_logs'             // Communication
  | 'message_logs'          // Text patterns
  | 'social_media'          // Online behavior
  | 'sleep_tracking'        // Sleep quality
  | 'heart_rate'            // Physiological
  | 'ema_survey'            // Ecological Momentary Assessment
  | 'keyboard_dynamics'     // Typing patterns
  | 'voice_analysis'        // Speech patterns (2025)
  | 'facial_expression';    // Emotion detection (2025)

/**
 * State estimation method
 * 2025: Multiple methods for ensemble approaches
 */
export type StateEstimationMethod =
  | 'kalman_filter'         // Standard KF
  | 'extended_kalman'       // EKF for nonlinear
  | 'unscented_kalman'      // UKF for highly nonlinear
  | 'ensemble_kalman'       // EnKF for high-dimensional
  | 'particle_filter'       // Sequential Monte Carlo
  | 'bayesian_inference'    // Full Bayesian
  | 'variational_bayes'     // Approximate Bayesian
  | 'physics_informed_nn';  // 2025: PINNs

/**
 * Twin synchronization mode
 * 2025: Bidirectional communication
 */
export type SyncMode =
  | 'unidirectional_p2v'    // Physical to Virtual only
  | 'unidirectional_v2p'    // Virtual to Physical only
  | 'bidirectional'         // Full sync (true Digital Twin)
  | 'event_driven'          // Sync on events only
  | 'scheduled';            // Periodic sync

// ============================================================================
// STATE VARIABLE INTERFACES
// ============================================================================

/**
 * Single state variable in the cognitive twin
 * Enhanced with 2025 uncertainty quantification
 */
export interface ITwinStateVariable {
  id: string;
  name: string;
  nameRu: string;

  // Current state
  value: number;                      // Current estimate [0, 1]
  variance: number;                   // 2025: Estimation uncertainty
  confidence: number;                 // 2025: Confidence in estimate

  // Derivatives (dynamical systems)
  velocity: number;                   // Rate of change (dx/dt)
  acceleration: number;               // Second derivative (d²x/dt²)

  // Reference values
  baselineValue: number;              // Personal baseline
  historicalMean: number;             // Long-term average
  historicalStd: number;              // Historical variability

  // 2025: Kalman filter state
  kalmanState?: {
    estimate: number;
    errorCovariance: number;
    processNoise: number;
    measurementNoise: number;
    gain: number;
  };

  // 2025: Bayesian posterior
  posterior?: {
    mean: number;
    variance: number;
    distribution: 'gaussian' | 'beta' | 'mixture';
    parameters: Record<string, number>;
  };

  // Metadata
  lastObserved: Date;
  lastUpdated: Date;
  observationCount: number;
  dataSource: PhenotypingSource[];
}

/**
 * Complete cognitive twin state snapshot
 * Enhanced with 2025 MHDT framework
 */
export interface IDigitalTwinState {
  id: string;
  userId: number;
  timestamp: Date;
  version: number;                    // 2025: State version for sync

  // State variables
  variables: Map<string, ITwinStateVariable>;

  // Derived metrics
  overallWellbeing: number;           // Composite score [0, 1]
  stability: TwinStability;
  dominantAttractor: AttractorType;
  resilience: number;                 // System resilience [0, 1]

  // Dynamical indicators (from Critical Slowing Down research)
  lyapunovExponent: number;           // Chaos measure (negative = stable)
  autocorrelation: number;            // Critical slowing down indicator
  varianceRatio: number;              // Variance increase indicator

  // 2025: Global uncertainty
  stateUncertainty: number;           // Overall confidence in state
  dataQuality: number;                // Quality of input data

  // 2025: POMDP belief state
  beliefState?: {
    discreteBeliefs: Map<string, number>;  // P(hidden state)
    continuousBeliefs: Map<string, { mean: number; variance: number }>;
    entropy: number;                   // Belief uncertainty
  };

  // 2025: Digital phenotype summary
  phenotypeSummary?: {
    activityLevel: number;
    socialEngagement: number;
    sleepRegularity: number;
    moodVariability: number;
    stressIndicators: number;
    lastPhenotypingTimestamp: Date;
  };

  // Reference to underlying causal graph
  causalGraphId: string;

  // 2025: Sync metadata
  syncMetadata: {
    lastSync: Date;
    syncMode: SyncMode;
    pendingUpdates: number;
    syncHealth: number;               // 0-1 sync quality
  };
}

/**
 * State trajectory over time
 */
export interface IStateTrajectory {
  userId: number;
  timepoints: Date[];
  states: IDigitalTwinState[];
  interventionsApplied: IInterventionEvent[];

  // 2025: Trajectory analysis
  trajectoryMetrics?: {
    volatility: number;
    trend: number;
    seasonality: number;
    breakpoints: Date[];              // Structural changes
  };
}

/**
 * Intervention event record
 */
export interface IInterventionEvent {
  id: string;
  timestamp: Date;
  interventionType: string;
  targetVariable: string;

  // Outcomes
  predictedEffect: number;
  actualEffect: number;
  effectiveness: number;              // 0-1 scale

  // 2025: Causal attribution
  causalConfidence: number;           // Confidence it was causal
  confounders: string[];              // Potential confounders
}

// ============================================================================
// KALMAN FILTER INTERFACES (2025)
// ============================================================================

/**
 * Kalman Filter configuration
 * Based on 2025 adaptive KF research
 */
export interface IKalmanFilterConfig {
  // Model parameters
  stateTransitionMatrix: number[][];   // A: State transition
  observationMatrix: number[][];       // H: Observation model
  processNoiseCovariance: number[][];  // Q: Process noise
  measurementNoiseCovariance: number[][]; // R: Measurement noise

  // Initial conditions
  initialState: number[];
  initialCovariance: number[][];

  // 2025: Adaptive parameters
  adaptiveQ: boolean;                  // Adapt process noise
  adaptiveR: boolean;                  // Adapt measurement noise
  adaptationRate: number;              // Learning rate for adaptation
  forgettingFactor: number;            // For time-varying systems

  // 2025: Robustness
  outlierThreshold: number;            // Mahalanobis distance for outliers
  maxGain: number;                     // Cap on Kalman gain
}

/**
 * Kalman Filter state
 */
export interface IKalmanFilterState {
  // Current estimates
  stateEstimate: number[];
  errorCovariance: number[][];

  // Predicted values (before measurement update)
  predictedState: number[];
  predictedCovariance: number[][];

  // Innovation (measurement residual)
  innovation: number[];
  innovationCovariance: number[][];

  // Kalman gain
  kalmanGain: number[][];

  // 2025: Diagnostics
  normalized_innovation_squared: number;  // Chi-squared test
  isOutlier: boolean;
  adaptedQ: number[][] | null;
  adaptedR: number[][] | null;

  // Metadata
  timestep: number;
  timestamp: Date;
}

/**
 * Ensemble Kalman Filter configuration (2025)
 * For high-dimensional agent-based digital twins
 */
export interface IEnsembleKalmanConfig {
  ensembleSize: number;                // Number of ensemble members (50-100)
  localizationRadius: number;          // For localization
  inflationFactor: number;             // Covariance inflation
  perturbObservations: boolean;        // Perturb observations

  // 2025: Agent-based specific
  agentSyncStrategy: 'micro' | 'macro' | 'hybrid';
  macrostateDefinition: string[];      // Which variables are macrostates
}

// ============================================================================
// BAYESIAN INFERENCE INTERFACES (2025)
// ============================================================================

/**
 * Bayesian model updating configuration
 * Based on GenAI-BMU research (2025)
 */
export interface IBayesianUpdateConfig {
  // Prior specification
  priorType: 'conjugate' | 'diffuse' | 'informative' | 'empirical_bayes';
  priorParameters: Record<string, number>;

  // Likelihood
  likelihoodModel: 'gaussian' | 'beta_binomial' | 'poisson' | 'mixture';

  // Inference method
  inferenceMethod: 'exact' | 'mcmc' | 'variational' | 'laplace';
  mcmcSamples?: number;
  mcmcBurnin?: number;
  mcmcThinning?: number;

  // 2025: Neural surrogate
  useNeuralSurrogate: boolean;         // Use NN for inverse mapping
  surrogateUpdateFrequency: number;    // How often to update surrogate
}

/**
 * Bayesian posterior result
 */
export interface IBayesianPosterior {
  // Point estimates
  mean: number[];
  mode: number[];
  median: number[];

  // Uncertainty
  covariance: number[][];
  credibleIntervals: {
    level: number;                     // e.g., 0.95
    lower: number[];
    upper: number[];
  }[];

  // Distribution info
  distributionType: string;
  parameters: Record<string, number>;

  // 2025: Model comparison
  logMarginalLikelihood: number;
  dic: number;                         // Deviance Information Criterion
  waic: number;                        // WAIC

  // Diagnostics
  convergenceDiagnostics?: {
    rhat: number[];                    // Gelman-Rubin
    effectiveSampleSize: number[];
  };
}

// ============================================================================
// DIGITAL PHENOTYPING INTERFACES (2025)
// ============================================================================

/**
 * Digital phenotyping observation
 * Based on 2025 systematic review (112 papers)
 */
export interface IPhenotypingObservation {
  id: string;
  userId: number;
  timestamp: Date;
  source: PhenotypingSource;

  // Raw data
  rawValue: number | string | number[];
  unit: string;

  // Processed features
  processedFeatures: Map<string, number>;

  // Quality indicators
  dataQuality: number;                 // 0-1
  missingness: number;                 // Proportion missing
  isImputed: boolean;

  // 2025: Privacy-preserving
  isAnonymized: boolean;
  aggregationLevel: 'raw' | 'hourly' | 'daily' | 'weekly';

  // Context
  contextTags: string[];               // e.g., ['weekend', 'evening']
}

/**
 * Aggregated phenotyping profile
 * Behavioral markers derived from passive data
 */
export interface IPhenotypingProfile {
  userId: number;
  periodStart: Date;
  periodEnd: Date;

  // Activity & Mobility (from GPS, accelerometer)
  mobility: {
    totalDistance: number;             // km
    locationEntropy: number;           // Regularity of places
    homeTime: number;                  // Proportion at home
    circadianMovement: number;         // Movement regularity
  };

  // Social (from calls, messages)
  social: {
    callFrequency: number;
    messageFrequency: number;
    socialDiversity: number;           // Number of unique contacts
    reciprocity: number;               // Balance of in/out
    responseLatency: number;           // Avg response time
  };

  // Sleep (from screen time, accelerometer)
  sleep: {
    duration: number;                  // Hours
    regularity: number;                // Consistency of timing
    efficiency: number;                // Time in bed vs asleep
    midpoint: number;                  // Sleep midpoint hour
  };

  // Device usage
  deviceUsage: {
    screenTime: number;                // Hours/day
    pickupFrequency: number;           // Times/day
    appSwitching: number;              // Transitions/hour
    nightUsage: number;                // Usage 00:00-06:00
  };

  // 2025: Derived mental health indicators
  mentalHealthIndicators: {
    depressionRisk: number;            // 0-1 (from PHQ-9 proxy)
    anxietyRisk: number;               // 0-1
    socialWithdrawal: number;          // 0-1
    sleepDisturbance: number;          // 0-1
    agitation: number;                 // 0-1
  };

  // Model confidence
  confidence: number;
  dataCompleteness: number;
}

// ============================================================================
// SCENARIO INTERFACES
// ============================================================================

/**
 * What-if scenario definition
 * Enhanced with 2025 counterfactual reasoning
 */
export interface IScenario {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;

  // Scenario parameters
  interventionType: string | null;     // null = baseline
  targetVariable: string | null;
  interventionStrength: number;
  horizonDays: number;
  startState: IDigitalTwinState;

  // Environmental assumptions
  externalStressors: IExternalStressor[];
  protectiveFactors: IProtectiveFactor[];

  // 2025: Counterfactual specification
  counterfactual?: {
    interventionQuery: string;         // do(X=x) notation
    conditioningSet: Map<string, number>;
    mediatorBlocking: string[];        // Block indirect paths
  };
}

/**
 * External stressor in scenario
 */
export interface IExternalStressor {
  type: 'work' | 'relationship' | 'health' | 'financial' | 'loss' | 'trauma' | 'other';
  intensity: number;                   // 0-1 scale
  onsetDay: number;                    // Days from scenario start
  durationDays: number;
  description: string;

  // 2025: Causal mechanism
  affectedVariables: string[];
  effectSize: Map<string, number>;
}

/**
 * Protective factor in scenario
 */
export interface IProtectiveFactor {
  type: 'social_support' | 'therapy' | 'medication' | 'lifestyle' | 'coping_skills' | 'mindfulness';
  strength: number;                    // 0-1 scale
  reliability: number;                 // How consistently available
  description: string;

  // 2025: Mechanism
  bufferedVariables: string[];
  bufferingEffect: Map<string, number>;
}

/**
 * Scenario simulation result
 * Enhanced with 2025 ensemble predictions
 */
export interface IScenarioResult {
  id: string;
  scenario: IScenario;
  simulatedAt: Date;

  // Trajectories
  trajectories: ISimulatedTrajectory[];
  expectedTrajectory: ISimulatedTrajectory;

  // Outcome classification
  outcome: ScenarioOutcome;
  outcomeDistribution: Map<ScenarioOutcome, number>;

  // End state statistics
  expectedEndState: Map<string, number>;
  worstCaseEndState: Map<string, number>;  // 95th percentile
  bestCaseEndState: Map<string, number>;   // 5th percentile

  // Risk metrics
  crisisProbability: number;
  recoveryProbability: number;
  tippingPointProbability: number;

  // Time-to-event
  expectedTimeToImprovement: number | null;
  expectedTimeToCrisis: number | null;

  // 2025: Uncertainty quantification
  predictionUncertainty: number;       // Overall uncertainty
  aleatoric: number;                   // Irreducible uncertainty
  epistemic: number;                   // Model uncertainty

  // 2025: Explainability
  keyDrivers: Array<{
    variable: string;
    contribution: number;
    direction: 'positive' | 'negative';
  }>;

  // Confidence
  confidenceLevel: number;
  simulationCount: number;
  methodUsed: StateEstimationMethod;
}

/**
 * Single simulated trajectory
 */
export interface ISimulatedTrajectory {
  id: string;
  timepoints: number[];                // Days from start
  states: Map<string, number[]>;       // Variable -> values
  events: ITrajectoryEvent[];
  finalOutcome: ScenarioOutcome;
  probability: number;

  // 2025: Trajectory uncertainty bands
  confidenceBands?: {
    lower: Map<string, number[]>;      // 5th percentile
    upper: Map<string, number[]>;      // 95th percentile
  };
}

/**
 * Event during trajectory simulation
 */
export interface ITrajectoryEvent {
  day: number;
  eventType: 'intervention' | 'stressor' | 'tipping_point' | 'recovery' | 'crisis' | 'regime_change';
  description: string;
  impact: Map<string, number>;

  // 2025: Causal attribution
  causalMechanism?: string;
  counterfactualImpact?: number;       // Effect if event hadn't occurred
}

/**
 * Scenario comparison (A vs B)
 */
export interface IScenarioComparison {
  scenarioA: IScenarioResult;
  scenarioB: IScenarioResult;
  comparedAt: Date;

  // Differential analysis
  differentialOutcome: Map<string, number>;
  relativeBenefit: number;             // Positive = A is better
  numberNeededToTreat: number | null;

  // Risk comparison
  relativeRiskReduction: number;
  absoluteRiskReduction: number;
  hazardRatio: number;                 // 2025: Survival analysis

  // Time comparison
  expectedTimeAdvantage: number;       // Days faster to improvement

  // Statistical comparison
  comparisonConfidence: number;
  effectSize: number;                  // Cohen's d
  pValue: number;
  confidenceInterval: [number, number]; // 2025: 95% CI

  // 2025: Causal effect estimate
  averageTreatmentEffect?: number;
  conditionalATE?: Map<string, number>; // By subgroup

  // Recommendation
  recommendedScenario: 'A' | 'B' | 'equivalent';
  recommendationReason: string;
  recommendationReasonRu: string;
}

// ============================================================================
// TIPPING POINT INTERFACES
// ============================================================================

/**
 * Detected tipping point (bifurcation)
 * Enhanced with 2025 early warning signals research
 */
export interface ITippingPoint {
  id: string;
  timestamp: Date;
  detectedAt: Date;

  // Bifurcation characteristics
  bifurcationType: BifurcationType;
  criticalParameter: string;
  criticalThreshold: number;
  currentDistance: number;

  // Timing
  estimatedTimeToPoint: number;        // Days
  confidenceInterval: [number, number];

  // Consequences
  preTransitionState: AttractorType;
  postTransitionState: AttractorType;
  expectedOutcome: ScenarioOutcome;
  irreversibility: number;             // 0 = reversible, 1 = irreversible

  // Early warning signals (CSD indicators)
  earlyWarningStrength: number;        // Composite EWS score
  autocorrelationIncrease: number;
  varianceIncrease: number;
  crossCorrelationIncrease: number;

  // 2025: Additional EWS
  flickeringDetected: boolean;         // Flickering between states
  skewnessChange: number;
  detrended_fluctuation_exponent: number;

  // Intervention window
  interventionWindowDays: number;
  preventionProbability: number;
  recommendedInterventions: IInterventionRecommendation[];
}

/**
 * Intervention recommendation for preventing tipping point
 */
export interface IInterventionRecommendation {
  interventionType: string;
  targetVariable: string;
  expectedEffect: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  feasibility: number;
  description: string;
  descriptionRu: string;
}

/**
 * Basin of attraction analysis
 */
export interface IAttractorBasin {
  attractorId: string;
  attractorType: AttractorType;
  centerState: Map<string, number>;
  basinSize: number;                   // Relative size
  basinDepth: number;                  // Stability (deeper = more stable)
  escapeVelocity: number;              // Energy needed to escape
  neighboringAttractors: string[];

  // 2025: Basin characteristics
  basinBoundary?: Map<string, [number, number]>;  // Variable -> [min, max]
  transitionProbabilities?: Map<string, number>;  // P(transition to other)
}

/**
 * Stability landscape analysis
 */
export interface IStabilityLandscape {
  timestamp: Date;
  attractors: IAttractorBasin[];
  currentAttractor: string;
  currentBasinPosition: number[];
  landscapeTopology: 'simple' | 'complex' | 'multistable';
  dominantTransitionPath: string[];

  // 2025: Landscape dynamics
  isLandscapeChanging: boolean;
  landscapeChangeRate: number;
  emergingAttractors: string[];
  disappearingAttractors: string[];
}

// ============================================================================
// PERSONALIZATION INTERFACES
// ============================================================================

/**
 * Personal twin parameters (learned from data)
 * Enhanced with 2025 personalization research
 */
export interface ITwinPersonalization {
  userId: number;
  learnedAt: Date;
  lastValidated: Date;

  // Dynamical parameters
  meanReversionRate: Map<string, number>;
  volatility: Map<string, number>;
  sensitivityMatrix: Map<string, Map<string, number>>;

  // Response patterns
  interventionResponse: Map<string, IInterventionResponseProfile>;
  stressorVulnerability: Map<string, number>;
  protectiveFactorEfficacy: Map<string, number>;

  // Temporal patterns
  circadianPattern: Map<string, number[]>;     // 24-hour pattern
  weeklyPattern: Map<string, number[]>;        // 7-day pattern
  seasonalPattern: Map<string, number[]>;      // 12-month pattern

  // 2025: Individual variability
  intraIndividualVariability: Map<string, number>;  // Person-specific variance
  responseLatency: Map<string, number>;             // Lag to intervention response
  sustainedEffectRate: Map<string, number>;         // How effects persist

  // 2025: Learned priors for Bayesian updates
  learnedPriors: Map<string, { mean: number; variance: number }>;

  // Model fit
  dataPointsUsed: number;
  fitQuality: number;                  // R² or similar
  crossValidationScore: number;
}

/**
 * Personalized intervention response profile
 */
export interface IInterventionResponseProfile {
  interventionType: string;
  meanEffect: number;
  effectVariability: number;
  timeToOnset: number;                 // Hours
  timeToPeak: number;                  // Hours
  duration: number;                    // Hours
  sustainedEffectRate: number;

  // 2025: Heterogeneous treatment effects
  moderators: Map<string, number>;     // Variables that modify effect
  conditionalEffects: Map<string, number>;  // Effect given moderator level
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Main Digital Twin service interface
 */
export interface IDigitalTwinService {
  // Twin lifecycle
  createTwin(userId: number, initialObservations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;
  getTwin(userId: number): Promise<IDigitalTwinState | null>;
  deleteTwin(userId: number): Promise<boolean>;

  // State updates
  updateWithObservation(userId: number, observation: IPhenotypingObservation): Promise<IDigitalTwinState>;
  batchUpdate(userId: number, observations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;

  // State estimation
  estimateState(userId: number, method?: StateEstimationMethod): Promise<IDigitalTwinState>;

  // History
  getStateHistory(userId: number, days: number): Promise<IStateTrajectory>;

  // Personalization
  getPersonalization(userId: number): Promise<ITwinPersonalization | null>;
  updatePersonalization(userId: number): Promise<ITwinPersonalization>;

  // Sync
  synchronize(userId: number): Promise<IDigitalTwinState>;
}

/**
 * Twin Simulator service interface
 */
export interface ITwinSimulatorService {
  // Scenario simulation
  simulateScenario(
    twin: IDigitalTwinState,
    scenario: IScenario,
    personalization?: ITwinPersonalization
  ): Promise<IScenarioResult>;

  // Scenario comparison
  compareScenarios(
    twin: IDigitalTwinState,
    scenarioA: IScenario,
    scenarioB: IScenario,
    personalization?: ITwinPersonalization
  ): Promise<IScenarioComparison>;

  // Scenario creation helpers
  createBaselineScenario(twin: IDigitalTwinState, horizonDays: number): IScenario;
  createInterventionScenario(
    twin: IDigitalTwinState,
    interventionType: string,
    targetVariable: string,
    horizonDays: number
  ): IScenario;

  // Prediction
  predictFuture(
    twin: IDigitalTwinState,
    horizonDays: number,
    intervention?: { type: string; target: string }
  ): Promise<IScenarioResult>;
}

/**
 * Tipping Point Detector service interface
 */
export interface ITippingPointDetectorService {
  // Detection
  detectTippingPoints(
    twin: IDigitalTwinState,
    stateHistory: IStateTrajectory
  ): Promise<ITippingPoint[]>;

  // Analysis
  analyzeStabilityLandscape(twin: IDigitalTwinState): Promise<IStabilityLandscape>;

  // Timing prediction
  predictBifurcationTiming(
    tippingPoint: ITippingPoint,
    stateHistory: IStateTrajectory
  ): Promise<{ estimatedDays: number; confidence: number; interventionWindow: number }>;

  // Distance calculation
  distanceToTippingPoint(
    twin: IDigitalTwinState,
    stateHistory: IStateTrajectory
  ): Promise<{ distance: number; direction: string; velocity: number; timeToReach: number | null }>;

  // Prevention
  findPreventiveIntervention(
    tippingPoint: ITippingPoint,
    twin: IDigitalTwinState
  ): Promise<IInterventionRecommendation | null>;
}

/**
 * Kalman Filter service interface (2025)
 */
export interface IKalmanFilterService {
  // Initialization
  initialize(config: IKalmanFilterConfig): IKalmanFilterState;

  // Prediction step
  predict(state: IKalmanFilterState, config: IKalmanFilterConfig): IKalmanFilterState;

  // Update step
  update(
    state: IKalmanFilterState,
    measurement: number[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState;

  // Combined predict-update
  filter(
    state: IKalmanFilterState,
    measurement: number[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState;

  // Smoothing (retrospective)
  smooth(
    states: IKalmanFilterState[],
    config: IKalmanFilterConfig
  ): IKalmanFilterState[];

  // Adaptive methods
  adaptProcessNoise(
    state: IKalmanFilterState,
    innovations: number[][],
    config: IKalmanFilterConfig
  ): number[][];
}

/**
 * Digital Phenotyping service interface (2025)
 */
export interface IDigitalPhenotypingService {
  // Data collection
  collectObservation(
    userId: number,
    source: PhenotypingSource,
    rawValue: number | string | number[]
  ): Promise<IPhenotypingObservation>;

  // Profile generation
  generateProfile(
    userId: number,
    periodDays: number
  ): Promise<IPhenotypingProfile>;

  // Feature extraction
  extractFeatures(
    observations: IPhenotypingObservation[]
  ): Map<string, number>;

  // Mental health indicators
  estimateMentalHealthIndicators(
    profile: IPhenotypingProfile
  ): Promise<{
    depressionRisk: number;
    anxietyRisk: number;
    socialWithdrawal: number;
    overallRisk: number;
    confidence: number;
  }>;

  // Privacy
  anonymizeProfile(profile: IPhenotypingProfile): IPhenotypingProfile;
}

// ============================================================================
// SIMULATION CONFIGURATION
// ============================================================================

/**
 * Simulation configuration
 * Enhanced with 2025 ensemble methods
 */
export interface ISimulationConfig {
  // Monte Carlo parameters
  numTrajectories: number;             // Sample size (default: 1000)
  timeStepDays: number;                // Time step (default: 0.5)
  noiseLevel: number;                  // Process noise (default: 0.1)
  seed?: number;                       // Random seed

  // Personalization
  usePersonalization: boolean;
  includeCircadian: boolean;
  includeWeekly: boolean;
  includeSeasonal: boolean;            // 2025

  // 2025: Ensemble configuration
  ensembleMethod: 'monte_carlo' | 'bootstrap' | 'bagging' | 'stacking';
  ensembleWeighting: 'equal' | 'performance' | 'bayesian';

  // 2025: Uncertainty propagation
  propagateUncertainty: boolean;
  uncertaintyMethod: 'sampling' | 'sigma_points' | 'linearization';

  // 2025: Computational constraints
  maxComputeTimeMs: number;
  parallelization: boolean;
}

export const DEFAULT_SIMULATION_CONFIG: ISimulationConfig = {
  numTrajectories: 1000,
  timeStepDays: 0.5,
  noiseLevel: 0.1,
  usePersonalization: true,
  includeCircadian: false,
  includeWeekly: true,
  includeSeasonal: false,
  ensembleMethod: 'monte_carlo',
  ensembleWeighting: 'equal',
  propagateUncertainty: true,
  uncertaintyMethod: 'sampling',
  maxComputeTimeMs: 10000,
  parallelization: true,
};

// ============================================================================
// CLINICAL INTERPRETATION
// ============================================================================

/**
 * Clinical interpretation of simulation results
 */
export interface IClinicalInterpretation {
  summary: string;
  summaryRu: string;

  keyFindings: string[];
  keyFindingsRu: string[];

  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  actionRequired: boolean;
  urgency: 'routine' | 'soon' | 'urgent' | 'immediate';

  recommendedActions: string[];
  recommendedActionsRu: string[];

  confidenceStatement: string;
  confidenceStatementRu: string;

  // 2025: Explainability
  keyDriversExplanation: string;
  keyDriversExplanationRu: string;

  // 2025: Uncertainty communication
  uncertaintyStatement: string;
  uncertaintyStatementRu: string;
}

// ============================================================================
// TWIN METADATA & VERSIONING
// ============================================================================

/**
 * Digital Twin metadata
 */
export interface IDigitalTwinMetadata {
  twinId: string;
  userId: number;
  createdAt: Date;
  lastModified: Date;
  version: string;

  // Model information
  modelType: 'mhdt' | 'cognitive_twin' | 'physiological_twin';
  modelVersion: string;
  estimationMethods: StateEstimationMethod[];

  // Data sources
  activePhenotypingSources: PhenotypingSource[];
  dataCompleteness: number;
  lastDataIngestion: Date;

  // Quality metrics
  modelFitScore: number;
  predictionAccuracy: number;
  lastValidationDate: Date;

  // 2025: Compliance
  gdprCompliant: boolean;
  anonymizationLevel: string;
  dataRetentionPolicy: string;
}
