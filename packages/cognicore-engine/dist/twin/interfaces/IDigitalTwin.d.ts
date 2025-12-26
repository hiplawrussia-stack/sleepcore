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
export declare function generateTwinId(prefix?: string): string;
/**
 * Twin state stability classification
 * Extended with 2025 dynamical systems theory
 */
export type TwinStability = 'stable' | 'metastable' | 'unstable' | 'critical' | 'transitioning';
/**
 * Attractor type in dynamical systems
 */
export type AttractorType = 'point' | 'limit_cycle' | 'strange' | 'none' | 'quasi_periodic';
/**
 * Scenario outcome classification
 */
export type ScenarioOutcome = 'improvement' | 'stable' | 'deterioration' | 'crisis' | 'recovery' | 'remission';
/**
 * Bifurcation type from dynamical systems theory
 */
export type BifurcationType = 'saddle_node' | 'transcritical' | 'pitchfork' | 'hopf' | 'fold_bifurcation' | 'period_doubling' | 'blue_sky' | 'unknown';
/**
 * Digital phenotyping data source
 * Based on 2025 sensor review (112 papers)
 */
export type PhenotypingSource = 'gps_location' | 'accelerometer' | 'screen_time' | 'call_logs' | 'message_logs' | 'social_media' | 'sleep_tracking' | 'heart_rate' | 'ema_survey' | 'keyboard_dynamics' | 'voice_analysis' | 'facial_expression';
/**
 * State estimation method
 * 2025: Multiple methods for ensemble approaches
 */
export type StateEstimationMethod = 'kalman_filter' | 'extended_kalman' | 'unscented_kalman' | 'ensemble_kalman' | 'particle_filter' | 'bayesian_inference' | 'variational_bayes' | 'physics_informed_nn';
/**
 * Twin synchronization mode
 * 2025: Bidirectional communication
 */
export type SyncMode = 'unidirectional_p2v' | 'unidirectional_v2p' | 'bidirectional' | 'event_driven' | 'scheduled';
/**
 * Single state variable in the cognitive twin
 * Enhanced with 2025 uncertainty quantification
 */
export interface ITwinStateVariable {
    id: string;
    name: string;
    nameRu: string;
    value: number;
    variance: number;
    confidence: number;
    velocity: number;
    acceleration: number;
    baselineValue: number;
    historicalMean: number;
    historicalStd: number;
    kalmanState?: {
        estimate: number;
        errorCovariance: number;
        processNoise: number;
        measurementNoise: number;
        gain: number;
    };
    posterior?: {
        mean: number;
        variance: number;
        distribution: 'gaussian' | 'beta' | 'mixture';
        parameters: Record<string, number>;
    };
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
    version: number;
    variables: Map<string, ITwinStateVariable>;
    overallWellbeing: number;
    stability: TwinStability;
    dominantAttractor: AttractorType;
    resilience: number;
    lyapunovExponent: number;
    autocorrelation: number;
    varianceRatio: number;
    stateUncertainty: number;
    dataQuality: number;
    beliefState?: {
        discreteBeliefs: Map<string, number>;
        continuousBeliefs: Map<string, {
            mean: number;
            variance: number;
        }>;
        entropy: number;
    };
    phenotypeSummary?: {
        activityLevel: number;
        socialEngagement: number;
        sleepRegularity: number;
        moodVariability: number;
        stressIndicators: number;
        lastPhenotypingTimestamp: Date;
    };
    causalGraphId: string;
    syncMetadata: {
        lastSync: Date;
        syncMode: SyncMode;
        pendingUpdates: number;
        syncHealth: number;
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
    trajectoryMetrics?: {
        volatility: number;
        trend: number;
        seasonality: number;
        breakpoints: Date[];
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
    predictedEffect: number;
    actualEffect: number;
    effectiveness: number;
    causalConfidence: number;
    confounders: string[];
}
/**
 * Kalman Filter configuration
 * Based on 2025 adaptive KF research
 */
export interface IKalmanFilterConfig {
    stateTransitionMatrix: number[][];
    observationMatrix: number[][];
    processNoiseCovariance: number[][];
    measurementNoiseCovariance: number[][];
    initialState: number[];
    initialCovariance: number[][];
    adaptiveQ: boolean;
    adaptiveR: boolean;
    adaptationRate: number;
    forgettingFactor: number;
    outlierThreshold: number;
    maxGain: number;
}
/**
 * Kalman Filter state
 */
export interface IKalmanFilterState {
    stateEstimate: number[];
    errorCovariance: number[][];
    predictedState: number[];
    predictedCovariance: number[][];
    innovation: number[];
    innovationCovariance: number[][];
    kalmanGain: number[][];
    normalized_innovation_squared: number;
    isOutlier: boolean;
    adaptedQ: number[][] | null;
    adaptedR: number[][] | null;
    timestep: number;
    timestamp: Date;
}
/**
 * Ensemble Kalman Filter configuration (2025)
 * For high-dimensional agent-based digital twins
 */
export interface IEnsembleKalmanConfig {
    ensembleSize: number;
    localizationRadius: number;
    inflationFactor: number;
    perturbObservations: boolean;
    agentSyncStrategy: 'micro' | 'macro' | 'hybrid';
    macrostateDefinition: string[];
}
/**
 * Bayesian model updating configuration
 * Based on GenAI-BMU research (2025)
 */
export interface IBayesianUpdateConfig {
    priorType: 'conjugate' | 'diffuse' | 'informative' | 'empirical_bayes';
    priorParameters: Record<string, number>;
    likelihoodModel: 'gaussian' | 'beta_binomial' | 'poisson' | 'mixture';
    inferenceMethod: 'exact' | 'mcmc' | 'variational' | 'laplace';
    mcmcSamples?: number;
    mcmcBurnin?: number;
    mcmcThinning?: number;
    useNeuralSurrogate: boolean;
    surrogateUpdateFrequency: number;
}
/**
 * Bayesian posterior result
 */
export interface IBayesianPosterior {
    mean: number[];
    mode: number[];
    median: number[];
    covariance: number[][];
    credibleIntervals: {
        level: number;
        lower: number[];
        upper: number[];
    }[];
    distributionType: string;
    parameters: Record<string, number>;
    logMarginalLikelihood: number;
    dic: number;
    waic: number;
    convergenceDiagnostics?: {
        rhat: number[];
        effectiveSampleSize: number[];
    };
}
/**
 * Digital phenotyping observation
 * Based on 2025 systematic review (112 papers)
 */
export interface IPhenotypingObservation {
    id: string;
    userId: number;
    timestamp: Date;
    source: PhenotypingSource;
    rawValue: number | string | number[];
    unit: string;
    processedFeatures: Map<string, number>;
    dataQuality: number;
    missingness: number;
    isImputed: boolean;
    isAnonymized: boolean;
    aggregationLevel: 'raw' | 'hourly' | 'daily' | 'weekly';
    contextTags: string[];
}
/**
 * Aggregated phenotyping profile
 * Behavioral markers derived from passive data
 */
export interface IPhenotypingProfile {
    userId: number;
    periodStart: Date;
    periodEnd: Date;
    mobility: {
        totalDistance: number;
        locationEntropy: number;
        homeTime: number;
        circadianMovement: number;
    };
    social: {
        callFrequency: number;
        messageFrequency: number;
        socialDiversity: number;
        reciprocity: number;
        responseLatency: number;
    };
    sleep: {
        duration: number;
        regularity: number;
        efficiency: number;
        midpoint: number;
    };
    deviceUsage: {
        screenTime: number;
        pickupFrequency: number;
        appSwitching: number;
        nightUsage: number;
    };
    mentalHealthIndicators: {
        depressionRisk: number;
        anxietyRisk: number;
        socialWithdrawal: number;
        sleepDisturbance: number;
        agitation: number;
    };
    confidence: number;
    dataCompleteness: number;
}
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
    interventionType: string | null;
    targetVariable: string | null;
    interventionStrength: number;
    horizonDays: number;
    startState: IDigitalTwinState;
    externalStressors: IExternalStressor[];
    protectiveFactors: IProtectiveFactor[];
    counterfactual?: {
        interventionQuery: string;
        conditioningSet: Map<string, number>;
        mediatorBlocking: string[];
    };
}
/**
 * External stressor in scenario
 */
export interface IExternalStressor {
    type: 'work' | 'relationship' | 'health' | 'financial' | 'loss' | 'trauma' | 'other';
    intensity: number;
    onsetDay: number;
    durationDays: number;
    description: string;
    affectedVariables: string[];
    effectSize: Map<string, number>;
}
/**
 * Protective factor in scenario
 */
export interface IProtectiveFactor {
    type: 'social_support' | 'therapy' | 'medication' | 'lifestyle' | 'coping_skills' | 'mindfulness';
    strength: number;
    reliability: number;
    description: string;
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
    trajectories: ISimulatedTrajectory[];
    expectedTrajectory: ISimulatedTrajectory;
    outcome: ScenarioOutcome;
    outcomeDistribution: Map<ScenarioOutcome, number>;
    expectedEndState: Map<string, number>;
    worstCaseEndState: Map<string, number>;
    bestCaseEndState: Map<string, number>;
    crisisProbability: number;
    recoveryProbability: number;
    tippingPointProbability: number;
    expectedTimeToImprovement: number | null;
    expectedTimeToCrisis: number | null;
    predictionUncertainty: number;
    aleatoric: number;
    epistemic: number;
    keyDrivers: Array<{
        variable: string;
        contribution: number;
        direction: 'positive' | 'negative';
    }>;
    confidenceLevel: number;
    simulationCount: number;
    methodUsed: StateEstimationMethod;
}
/**
 * Single simulated trajectory
 */
export interface ISimulatedTrajectory {
    id: string;
    timepoints: number[];
    states: Map<string, number[]>;
    events: ITrajectoryEvent[];
    finalOutcome: ScenarioOutcome;
    probability: number;
    confidenceBands?: {
        lower: Map<string, number[]>;
        upper: Map<string, number[]>;
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
    causalMechanism?: string;
    counterfactualImpact?: number;
}
/**
 * Scenario comparison (A vs B)
 */
export interface IScenarioComparison {
    scenarioA: IScenarioResult;
    scenarioB: IScenarioResult;
    comparedAt: Date;
    differentialOutcome: Map<string, number>;
    relativeBenefit: number;
    numberNeededToTreat: number | null;
    relativeRiskReduction: number;
    absoluteRiskReduction: number;
    hazardRatio: number;
    expectedTimeAdvantage: number;
    comparisonConfidence: number;
    effectSize: number;
    pValue: number;
    confidenceInterval: [number, number];
    averageTreatmentEffect?: number;
    conditionalATE?: Map<string, number>;
    recommendedScenario: 'A' | 'B' | 'equivalent';
    recommendationReason: string;
    recommendationReasonRu: string;
}
/**
 * Detected tipping point (bifurcation)
 * Enhanced with 2025 early warning signals research
 */
export interface ITippingPoint {
    id: string;
    timestamp: Date;
    detectedAt: Date;
    bifurcationType: BifurcationType;
    criticalParameter: string;
    criticalThreshold: number;
    currentDistance: number;
    estimatedTimeToPoint: number;
    confidenceInterval: [number, number];
    preTransitionState: AttractorType;
    postTransitionState: AttractorType;
    expectedOutcome: ScenarioOutcome;
    irreversibility: number;
    earlyWarningStrength: number;
    autocorrelationIncrease: number;
    varianceIncrease: number;
    crossCorrelationIncrease: number;
    flickeringDetected: boolean;
    skewnessChange: number;
    detrended_fluctuation_exponent: number;
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
    basinSize: number;
    basinDepth: number;
    escapeVelocity: number;
    neighboringAttractors: string[];
    basinBoundary?: Map<string, [number, number]>;
    transitionProbabilities?: Map<string, number>;
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
    isLandscapeChanging: boolean;
    landscapeChangeRate: number;
    emergingAttractors: string[];
    disappearingAttractors: string[];
}
/**
 * Personal twin parameters (learned from data)
 * Enhanced with 2025 personalization research
 */
export interface ITwinPersonalization {
    userId: number;
    learnedAt: Date;
    lastValidated: Date;
    meanReversionRate: Map<string, number>;
    volatility: Map<string, number>;
    sensitivityMatrix: Map<string, Map<string, number>>;
    interventionResponse: Map<string, IInterventionResponseProfile>;
    stressorVulnerability: Map<string, number>;
    protectiveFactorEfficacy: Map<string, number>;
    circadianPattern: Map<string, number[]>;
    weeklyPattern: Map<string, number[]>;
    seasonalPattern: Map<string, number[]>;
    intraIndividualVariability: Map<string, number>;
    responseLatency: Map<string, number>;
    sustainedEffectRate: Map<string, number>;
    learnedPriors: Map<string, {
        mean: number;
        variance: number;
    }>;
    dataPointsUsed: number;
    fitQuality: number;
    crossValidationScore: number;
}
/**
 * Personalized intervention response profile
 */
export interface IInterventionResponseProfile {
    interventionType: string;
    meanEffect: number;
    effectVariability: number;
    timeToOnset: number;
    timeToPeak: number;
    duration: number;
    sustainedEffectRate: number;
    moderators: Map<string, number>;
    conditionalEffects: Map<string, number>;
}
/**
 * Main Digital Twin service interface
 */
export interface IDigitalTwinService {
    createTwin(userId: number, initialObservations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;
    getTwin(userId: number): Promise<IDigitalTwinState | null>;
    deleteTwin(userId: number): Promise<boolean>;
    updateWithObservation(userId: number, observation: IPhenotypingObservation): Promise<IDigitalTwinState>;
    batchUpdate(userId: number, observations: IPhenotypingObservation[]): Promise<IDigitalTwinState>;
    estimateState(userId: number, method?: StateEstimationMethod): Promise<IDigitalTwinState>;
    getStateHistory(userId: number, days: number): Promise<IStateTrajectory>;
    getPersonalization(userId: number): Promise<ITwinPersonalization | null>;
    updatePersonalization(userId: number): Promise<ITwinPersonalization>;
    synchronize(userId: number): Promise<IDigitalTwinState>;
}
/**
 * Twin Simulator service interface
 */
export interface ITwinSimulatorService {
    simulateScenario(twin: IDigitalTwinState, scenario: IScenario, personalization?: ITwinPersonalization): Promise<IScenarioResult>;
    compareScenarios(twin: IDigitalTwinState, scenarioA: IScenario, scenarioB: IScenario, personalization?: ITwinPersonalization): Promise<IScenarioComparison>;
    createBaselineScenario(twin: IDigitalTwinState, horizonDays: number): IScenario;
    createInterventionScenario(twin: IDigitalTwinState, interventionType: string, targetVariable: string, horizonDays: number): IScenario;
    predictFuture(twin: IDigitalTwinState, horizonDays: number, intervention?: {
        type: string;
        target: string;
    }): Promise<IScenarioResult>;
}
/**
 * Tipping Point Detector service interface
 */
export interface ITippingPointDetectorService {
    detectTippingPoints(twin: IDigitalTwinState, stateHistory: IStateTrajectory): Promise<ITippingPoint[]>;
    analyzeStabilityLandscape(twin: IDigitalTwinState): Promise<IStabilityLandscape>;
    predictBifurcationTiming(tippingPoint: ITippingPoint, stateHistory: IStateTrajectory): Promise<{
        estimatedDays: number;
        confidence: number;
        interventionWindow: number;
    }>;
    distanceToTippingPoint(twin: IDigitalTwinState, stateHistory: IStateTrajectory): Promise<{
        distance: number;
        direction: string;
        velocity: number;
        timeToReach: number | null;
    }>;
    findPreventiveIntervention(tippingPoint: ITippingPoint, twin: IDigitalTwinState): Promise<IInterventionRecommendation | null>;
}
/**
 * Kalman Filter service interface (2025)
 */
export interface IKalmanFilterService {
    initialize(config: IKalmanFilterConfig): IKalmanFilterState;
    predict(state: IKalmanFilterState, config: IKalmanFilterConfig): IKalmanFilterState;
    update(state: IKalmanFilterState, measurement: number[], config: IKalmanFilterConfig): IKalmanFilterState;
    filter(state: IKalmanFilterState, measurement: number[], config: IKalmanFilterConfig): IKalmanFilterState;
    smooth(states: IKalmanFilterState[], config: IKalmanFilterConfig): IKalmanFilterState[];
    adaptProcessNoise(state: IKalmanFilterState, innovations: number[][], config: IKalmanFilterConfig): number[][];
}
/**
 * Digital Phenotyping service interface (2025)
 */
export interface IDigitalPhenotypingService {
    collectObservation(userId: number, source: PhenotypingSource, rawValue: number | string | number[]): Promise<IPhenotypingObservation>;
    generateProfile(userId: number, periodDays: number): Promise<IPhenotypingProfile>;
    extractFeatures(observations: IPhenotypingObservation[]): Map<string, number>;
    estimateMentalHealthIndicators(profile: IPhenotypingProfile): Promise<{
        depressionRisk: number;
        anxietyRisk: number;
        socialWithdrawal: number;
        overallRisk: number;
        confidence: number;
    }>;
    anonymizeProfile(profile: IPhenotypingProfile): IPhenotypingProfile;
}
/**
 * Simulation configuration
 * Enhanced with 2025 ensemble methods
 */
export interface ISimulationConfig {
    numTrajectories: number;
    timeStepDays: number;
    noiseLevel: number;
    seed?: number;
    usePersonalization: boolean;
    includeCircadian: boolean;
    includeWeekly: boolean;
    includeSeasonal: boolean;
    ensembleMethod: 'monte_carlo' | 'bootstrap' | 'bagging' | 'stacking';
    ensembleWeighting: 'equal' | 'performance' | 'bayesian';
    propagateUncertainty: boolean;
    uncertaintyMethod: 'sampling' | 'sigma_points' | 'linearization';
    maxComputeTimeMs: number;
    parallelization: boolean;
}
export declare const DEFAULT_SIMULATION_CONFIG: ISimulationConfig;
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
    keyDriversExplanation: string;
    keyDriversExplanationRu: string;
    uncertaintyStatement: string;
    uncertaintyStatementRu: string;
}
/**
 * Digital Twin metadata
 */
export interface IDigitalTwinMetadata {
    twinId: string;
    userId: number;
    createdAt: Date;
    lastModified: Date;
    version: string;
    modelType: 'mhdt' | 'cognitive_twin' | 'physiological_twin';
    modelVersion: string;
    estimationMethods: StateEstimationMethod[];
    activePhenotypingSources: PhenotypingSource[];
    dataCompleteness: number;
    lastDataIngestion: Date;
    modelFitScore: number;
    predictionAccuracy: number;
    lastValidationDate: Date;
    gdprCompliant: boolean;
    anonymizationLevel: string;
    dataRetentionPolicy: string;
}
//# sourceMappingURL=IDigitalTwin.d.ts.map