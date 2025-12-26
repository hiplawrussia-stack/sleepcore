/**
 * 🔬 CAUSAL GRAPH LAYER - INTERFACES
 * ===================================
 * Phase 5.1: Causal Discovery & Intervention Targeting
 *
 * Scientific Foundation (2024-2025):
 * - Pearl's Causal Hierarchy: Association → Intervention → Counterfactual
 * - PC Algorithm (Spirtes, Glymour, Scheines, 2000)
 * - PyWhy/DoWhy Framework (Microsoft Research, 2024)
 * - Critical Slowing Down for Depression (PNAS, 2019)
 * - BOSS Algorithm (PMC, 2024) - Best Order Score Search
 * - Causal Forest (Wager & Athey, 2018) - Heterogeneous treatment effects
 *
 * Market Context (2025):
 * - Causal AI Market: $63.37M (2025) → $1.62B (2035), 38.35% CAGR
 * - Key drivers: Personalized interventions, XAI requirements, healthcare
 *
 * Integration Points:
 * - StateVector (Phase 3.1) - Provides observation data
 * - InterventionOptimizer (Phase 3.4) - Consumes causal targets
 * - TemporalEchoEngine (Phase 3.2) - Temporal pattern integration
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Domain-specific node types for mental health causal modeling
 * Based on CBT/DBT theoretical frameworks
 */
export type CausalNodeType = 'emotion' | 'behavior' | 'cognition' | 'physiological' | 'trigger' | 'protective' | 'intervention';
/**
 * Edge types representing different causal relationships
 * Based on structural causal models (SCM)
 */
export type CausalEdgeType = 'direct' | 'mediated' | 'moderated' | 'bidirectional' | 'confounded';
/**
 * Confidence level for causal relationships
 * Based on evidence hierarchy
 */
export type CausalConfidence = 'established' | 'probable' | 'hypothesized' | 'learned';
/**
 * Algorithm types for causal discovery
 */
export type CausalDiscoveryAlgorithm = 'pc' | 'fci' | 'ges' | 'gfci' | 'lingam' | 'notears' | 'hybrid';
/**
 * Intervention type taxonomy
 * Aligned with InterventionOptimizer categories
 */
export type CausalInterventionType = 'challenge' | 'cognitive_reframe' | 'social_prompt' | 'relaxation' | 'activity_schedule' | 'psychoeducation' | 'crisis_support';
/**
 * Early warning signal types based on Critical Slowing Down theory
 */
export type EarlyWarningType = 'critical_slowing_down' | 'increased_variance' | 'flickering' | 'network_densification' | 'recovery_slowdown';
/**
 * A node in the causal graph representing a variable
 */
export interface ICausalNode {
    /** Unique identifier */
    readonly id: string;
    /** Human-readable name (English) */
    readonly name: string;
    /** Human-readable name (Russian) */
    readonly nameRu: string;
    /** Node type classification */
    readonly type: CausalNodeType;
    /** Current value (normalized 0-1) */
    value: number;
    /** Last observation timestamp */
    observedAt: Date;
    /** Can we measure this directly? */
    readonly isObservable: boolean;
    /** Can we intervene on this? */
    readonly isManipulable: boolean;
    /** User's typical value */
    baselineValue: number;
    /** How much it fluctuates (0-1) */
    volatility: number;
    /** Typical delay before effects propagate (days) */
    readonly lagDays: number;
    /** How long effects last (0-1) */
    readonly persistence: number;
    /** Domain-specific metadata */
    readonly metadata: ICausalNodeMetadata;
}
/**
 * Additional metadata for causal nodes
 */
export interface ICausalNodeMetadata {
    /** For emotions: -1 (negative) to 1 (positive) */
    valence?: number;
    /** For emotions: 0 (calm) to 1 (activated) */
    arousal?: number;
    /** For behaviors: frequency pattern */
    frequency?: 'daily' | 'weekly' | 'monthly' | 'episodic';
    /** For behaviors: -1 (harmful) to 1 (beneficial) */
    healthImpact?: number;
    /** For triggers: 0 (uncontrollable) to 1 (controllable) */
    controllability?: number;
    /** For triggers: 0 (random) to 1 (predictable) */
    predictability?: number;
    /** For interventions: type classification */
    interventionType?: CausalInterventionType;
    /** For interventions: expected effect size */
    expectedEffectSize?: number;
}
/**
 * A directed edge representing causal relationship
 */
export interface ICausalEdge {
    /** Unique identifier */
    readonly id: string;
    /** Source node (cause) */
    readonly sourceId: string;
    /** Target node (effect) */
    readonly targetId: string;
    /** Edge type classification */
    readonly type: CausalEdgeType;
    /** Causal strength: -1 to 1 (negative/positive effect) */
    strength: number;
    /** Confidence in this edge */
    confidence: CausalConfidence;
    /** P(effect | cause) */
    conditionalProbability: number;
    /** Minimum time for effect (hours) */
    readonly minLagHours: number;
    /** Maximum time for effect (hours) */
    readonly maxLagHours: number;
    /** When effect is strongest (hours) */
    readonly peakLagHours: number;
    /** Number of observations supporting this edge */
    evidenceCount: number;
    /** Last update timestamp */
    lastUpdated: Date;
    /** For moderated edges: moderator node ID */
    moderatorId?: string;
    /** For moderated edges: moderation function */
    moderationFunction?: IModerationFunction;
}
/**
 * Moderation function specification
 */
export interface IModerationFunction {
    /** Type of moderation */
    type: 'linear' | 'threshold' | 'nonlinear';
    /** Function parameters */
    parameters: Record<string, number>;
}
/**
 * Complete causal graph (DAG) for a user
 */
export interface ICausalGraph {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: number;
    /** Creation timestamp */
    readonly createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** All nodes in the graph */
    nodes: Map<string, ICausalNode>;
    /** All edges in the graph */
    edges: Map<string, ICausalEdge>;
    /** nodeId -> childIds */
    adjacencyList: Map<string, string[]>;
    /** nodeId -> parentIds */
    reverseAdjacency: Map<string, string[]>;
    /** Is the graph acyclic? */
    isAcyclic: boolean;
    /** Nodes in causal order */
    topologicalOrder: string[];
    /** User age group for personalization */
    readonly ageGroup: 'child' | 'teen' | 'adult';
    /** Personalized edge strengths */
    personalizedStrengths: Map<string, number>;
}
/**
 * Input data for causal discovery
 */
export interface ICausalObservation {
    /** Observation timestamp */
    timestamp: Date;
    /** nodeId -> observed value */
    variables: Map<string, number>;
    /** Contextual information */
    context?: ICausalContext;
}
/**
 * Contextual information for observation
 */
export interface ICausalContext {
    /** Time of day category */
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    /** Day of week (0-6) */
    dayOfWeek: number;
    /** Is weekend? */
    isWeekend: boolean;
    /** Recent trigger IDs */
    recentEvents: string[];
}
/**
 * Parameters for causal discovery algorithms
 */
export interface ICausalDiscoveryConfig {
    /** Algorithm to use */
    algorithm: CausalDiscoveryAlgorithm;
    /** Alpha for independence tests (default: 0.05) */
    significanceLevel: number;
    /** Minimum edge confidence (default: 0.6) */
    minConfidence: number;
    /** Minimum data points needed (default: 30) */
    minObservations: number;
    /** Max parents per node (default: 5) */
    maxParents: number;
    /** [source, target] pairs that cannot exist */
    forbiddenEdges: string[][];
    /** Must-have edges */
    requiredEdges: string[][];
    /** Use expert-defined edges? */
    useDomainPriors: boolean;
    /** Expert-defined edges */
    domainPriors: Partial<ICausalEdge>[];
    /** Cause must precede effect? */
    respectTemporalOrder: boolean;
    /** Maximum causal lag (days) */
    maxLagDays: number;
}
/**
 * Default discovery configuration
 */
export declare const DEFAULT_DISCOVERY_CONFIG: ICausalDiscoveryConfig;
/**
 * Result of causal discovery
 */
export interface ICausalDiscoveryResult {
    /** Discovered graph */
    graph: ICausalGraph;
    /** How well graph fits data (R²) */
    fitScore: number;
    /** BIC/AIC penalty */
    complexityPenalty: number;
    /** Cross-validation score */
    crossValidationScore: number;
    /** Newly discovered edges */
    newEdges: ICausalEdge[];
    /** Edge IDs no longer supported by data */
    removedEdges: string[];
    /** edgeId -> updated strength */
    strengthUpdates: Map<string, number>;
    /** Overall confidence in graph */
    overallConfidence: number;
    /** Edge IDs that need more data */
    lowConfidenceEdges: string[];
}
/**
 * Intervention target selection result
 */
export interface IInterventionTarget {
    /** Node to intervene on */
    nodeId: string;
    /** Type of intervention */
    interventionType: CausalInterventionType;
    /** Desired post-intervention value */
    targetValue: number;
    /** Direct effect on target */
    expectedDirectEffect: number;
    /** Total effect including downstream */
    expectedTotalEffect: number;
    /** All affected nodes */
    affectedNodes: INodeEffect[];
    /** Feasibility score (0-1) */
    feasibilityScore: number;
    /** Hours until effect */
    estimatedTimeToEffect: number;
    /** User effort required (0-1) */
    requiredUserEngagement: number;
    /** Risk of negative outcome (0-1) */
    riskOfBackfire: number;
    /** Reasons not to use this intervention */
    contraindications: string[];
}
/**
 * Effect on a downstream node
 */
export interface INodeEffect {
    /** Affected node ID */
    nodeId: string;
    /** Expected change (-1 to 1) */
    expectedChange: number;
    /** Likelihood of effect (0-1) */
    probability: number;
    /** Hours until effect */
    timeToEffect: number;
    /** Hops from intervention */
    pathLength: number;
}
/**
 * Constraints on intervention selection
 */
export interface IInterventionConstraints {
    /** Maximum intervention difficulty */
    maxComplexity?: number;
    /** Preferred intervention types */
    preferredTypes?: CausalInterventionType[];
    /** Nodes to exclude from intervention */
    excludedNodes?: string[];
    /** Maximum hours to see effect */
    timeConstraint?: number;
    /** Maximum user effort budget */
    userEngagementBudget?: number;
}
/**
 * Result of do-calculus operator
 * Implements Pearl's intervention calculus
 */
export interface IDoOperatorResult {
    /** Intervention specification: do(X = x) */
    intervention: string;
    /** Target node for effect estimation */
    targetNode: string;
    /** E[Y | do(X=1)] - E[Y | do(X=0)] */
    averageTreatmentEffect: number;
    /** ATE by subgroup */
    conditionalATE: Map<string, number>;
    /** Lower bound of effect */
    effectLowerBound: number;
    /** Upper bound of effect */
    effectUpperBound: number;
    /** Can effect be identified from observational data? */
    isIdentifiable: boolean;
    /** Variables to adjust for (backdoor) */
    adjustmentSet: string[];
    /** Mediating path (front-door) */
    frontDoorPath?: string[];
    /** All backdoor paths */
    backDoorPaths: string[][];
}
/**
 * Intervention simulation result
 */
export interface IInterventionSimulation {
    /** The intervention being simulated */
    intervention: IInterventionTarget;
    /** Monte Carlo trajectories */
    trajectories: ISimulatedTrajectory[];
    /** Probability of success (0-1) */
    successProbability: number;
    /** Expected node values at end */
    expectedOutcome: Map<string, number>;
    /** 10th percentile outcome */
    worstCaseOutcome: Map<string, number>;
    /** 90th percentile outcome */
    bestCaseOutcome: Map<string, number>;
}
/**
 * A single simulated trajectory
 */
export interface ISimulatedTrajectory {
    /** Time points (hours) */
    timepoints: number[];
    /** nodeId -> values at timepoints */
    nodeValues: Map<string, number[]>;
    /** Probability of this trajectory */
    probability: number;
}
/**
 * Tipping point detection based on Critical Slowing Down theory
 * Reference: PNAS 2019 - "Critical slowing down as early warning for depression"
 */
export interface IEarlyWarningSignal {
    /** User identifier */
    userId: number;
    /** Detection timestamp */
    detectedAt: Date;
    /** Signal type */
    signalType: EarlyWarningType;
    /** Signal severity */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Statistical indicators */
    indicators: ICriticalSlowingDownIndicators;
    /** English interpretation */
    interpretation: string;
    /** Russian interpretation */
    interpretationRu: string;
    /** Predicted state transition */
    predictedTransition?: IPredictedTransition;
    /** Recommended interventions */
    recommendedInterventions: IInterventionTarget[];
    /** Urgency level (0-1) */
    urgency: number;
}
/**
 * Critical slowing down indicators
 */
export interface ICriticalSlowingDownIndicators {
    /** AR(1) coefficient */
    autocorrelation: number;
    /** Autocorrelation trend */
    autocorrelationTrend: 'increasing' | 'stable' | 'decreasing';
    /** Variance of state */
    variance: number;
    /** Variance trend */
    varianceTrend: 'increasing' | 'stable' | 'decreasing';
    /** Average cross-correlation between symptoms */
    averageCrossCorrelation: number;
    /** Cross-correlation trend */
    crossCorrelationTrend: 'increasing' | 'stable' | 'decreasing';
    /** Speed of return to baseline */
    recoveryRate: number;
    /** Recovery rate trend */
    recoveryRateTrend: 'increasing' | 'stable' | 'decreasing';
    /** Composite resilience score (0-1, lower = closer to tipping) */
    resilienceScore: number;
}
/**
 * Predicted state transition
 */
export interface IPredictedTransition {
    /** Type of transition */
    transitionType: 'improvement' | 'deterioration' | 'crisis';
    /** Probability of transition */
    probability: number;
    /** Estimated days until transition */
    estimatedTimeframe: number;
    /** Confidence interval (days) */
    confidenceInterval: [number, number];
    /** Node IDs likely to trigger */
    triggeringFactors: string[];
}
/**
 * Graph validation result
 */
export interface IGraphValidationResult {
    /** Is the graph valid? */
    isValid: boolean;
    /** Is the graph acyclic? */
    isAcyclic: boolean;
    /** Detected cycles */
    hasCycles: string[][];
    /** Nodes with no connections */
    isolatedNodes: string[];
    /** Missing required edges */
    missingRequired: string[];
    /** Validation violations */
    violations: IValidationViolation[];
}
/**
 * A validation violation
 */
export interface IValidationViolation {
    /** Type of violation */
    type: 'cycle' | 'temporal_violation' | 'strength_bound' | 'missing_node';
    /** Human-readable description */
    description: string;
    /** Affected elements */
    affectedElements: string[];
}
/**
 * Main service interface for Causal Graph operations
 */
export interface ICausalGraphService {
    getGraph(userId: number): Promise<ICausalGraph | null>;
    initializeGraph(userId: number, ageGroup: string): Promise<ICausalGraph>;
    updateGraph(userId: number, observations: ICausalObservation[]): Promise<ICausalGraph>;
    addNode(userId: number, node: ICausalNode): Promise<ICausalGraph>;
    updateNodeValue(userId: number, nodeId: string, value: number): Promise<void>;
    getNodeHistory(userId: number, nodeId: string, days: number): Promise<ICausalObservation[]>;
    addEdge(userId: number, edge: ICausalEdge): Promise<ICausalGraph>;
    updateEdgeStrength(userId: number, edgeId: string, strength: number): Promise<void>;
    removeEdge(userId: number, edgeId: string): Promise<ICausalGraph>;
    getParents(userId: number, nodeId: string): Promise<ICausalNode[]>;
    getChildren(userId: number, nodeId: string): Promise<ICausalNode[]>;
    getAncestors(userId: number, nodeId: string): Promise<ICausalNode[]>;
    getDescendants(userId: number, nodeId: string): Promise<ICausalNode[]>;
    findPaths(userId: number, sourceId: string, targetId: string): Promise<string[][]>;
}
/**
 * Causal Discovery Engine interface
 */
export interface ICausalDiscoveryEngine {
    discoverStructure(observations: ICausalObservation[], config?: Partial<ICausalDiscoveryConfig>): Promise<ICausalDiscoveryResult>;
    updateWithNewObservation(graph: ICausalGraph, observation: ICausalObservation): Promise<ICausalGraph>;
    validateGraph(graph: ICausalGraph): Promise<IGraphValidationResult>;
    testIndependence(graph: ICausalGraph, nodeA: string, nodeB: string, given: string[]): Promise<number>;
    scoreDag(graph: ICausalGraph, observations: ICausalObservation[]): Promise<number>;
    findBestParents(nodeId: string, candidates: string[], observations: ICausalObservation[]): Promise<string[]>;
}
/**
 * Intervention Targeting interface
 */
export interface IInterventionTargetingService {
    findOptimalTarget(graph: ICausalGraph, goalNodeId: string, constraints?: IInterventionConstraints): Promise<IInterventionTarget>;
    rankTargets(graph: ICausalGraph, goalNodeId: string, topK?: number): Promise<IInterventionTarget[]>;
    estimateDoEffect(graph: ICausalGraph, interventionNodeId: string, targetNodeId: string, interventionValue: number): Promise<IDoOperatorResult>;
    simulateIntervention(graph: ICausalGraph, intervention: IInterventionTarget): Promise<IInterventionSimulation>;
    computeCounterfactual(graph: ICausalGraph, observation: ICausalObservation, hypotheticalChange: Map<string, number>): Promise<Map<string, number>>;
}
/**
 * Early Warning System interface
 */
export interface IEarlyWarningService {
    detectEarlyWarnings(graph: ICausalGraph, recentObservations: ICausalObservation[]): Promise<IEarlyWarningSignal[]>;
    calculateResilienceScore(graph: ICausalGraph, observations: ICausalObservation[]): Promise<ICriticalSlowingDownIndicators>;
    predictTransition(graph: ICausalGraph, observations: ICausalObservation[], horizonDays: number): Promise<IPredictedTransition | null>;
    shouldAlert(signal: IEarlyWarningSignal): boolean;
    formatAlert(signal: IEarlyWarningSignal): IFormattedAlert;
}
/**
 * Formatted alert for user display
 */
export interface IFormattedAlert {
    /** English title */
    title: string;
    /** Russian title */
    titleRu: string;
    /** English message */
    message: string;
    /** Russian message */
    messageRu: string;
    /** Severity level */
    severity: 'info' | 'warning' | 'urgent' | 'critical';
    /** Available actions */
    actions: IAlertAction[];
}
/**
 * Alert action
 */
export interface IAlertAction {
    /** Action type */
    type: 'intervention' | 'notification' | 'escalation';
    /** English label */
    label: string;
    /** Russian label */
    labelRu: string;
    /** Action payload */
    payload: Record<string, unknown>;
}
/**
 * Default node templates for mental health domain
 */
export declare const DEFAULT_NODE_TEMPLATES: Partial<ICausalNode>[];
/**
 * Expert-defined causal relationships for mental health domain
 * Based on CBT model, emotion regulation theory, and addiction research
 */
export declare const MENTAL_HEALTH_DOMAIN_PRIORS: Partial<ICausalEdge>[];
//# sourceMappingURL=ICausalGraph.d.ts.map