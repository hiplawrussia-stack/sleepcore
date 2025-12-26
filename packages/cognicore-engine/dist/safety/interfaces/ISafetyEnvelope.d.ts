/**
 * Safety Envelope Interfaces
 *
 * Phase 6.2: Enterprise-Grade Safety Framework for Mental Health AI
 *
 * 2025 Research Integration:
 * - Anthropic Constitutional Classifiers (Feb 2025) - 95% jailbreak prevention
 * - EmoAgent Framework (Apr 2025) - Mental health safety assessment
 * - EU AI Act (Feb 2025) - High-risk AI requirements
 * - LlamaFirewall (May 2025) - Multi-layer guardrails
 * - Human-in-the-Loop patterns - Ethical circuit breakers
 * - Formal Verification approaches - Safety invariants with temporal logic
 *
 * Based on:
 * - Anthropic ASL (AI Safety Levels) Framework
 * - FDA AI-Enabled Device Software Guidance (Jan 2025)
 * - EU AI Act (Regulation 2024/1689) High-Risk AI Requirements
 * - CHAI Model Card Standard
 * - WHO Digital Mental Health Guidelines
 * - APA Mental Health AI Guidelines (Nov 2025)
 */
/**
 * Mental Health Safety Level (inspired by Anthropic's ASL)
 *
 * MHSL-1: Informational only, no interaction
 * MHSL-2: Supportive interaction, wellness tips (CURRENT LEVEL)
 * MHSL-3: Therapeutic guidance with human oversight
 * MHSL-4: Autonomous therapeutic intervention (requires clinical validation)
 */
export type SafetyLevel = 'MHSL-1' | 'MHSL-2' | 'MHSL-3' | 'MHSL-4';
/**
 * Anthropic ASL-3 Security Standard (May 2025)
 * Extended for mental health context
 */
export type ASL3SecurityTier = 'standard' | 'elevated' | 'restricted' | 'critical';
/**
 * EU AI Act Risk Classification (Feb 2025)
 */
export type EUAIActRiskLevel = 'unacceptable' | 'high-risk' | 'limited-risk' | 'minimal-risk';
/**
 * Safety level configuration
 */
export interface ISafetyLevelConfig {
    level: SafetyLevel;
    name: string;
    description: string;
    capabilities: {
        canProvideInformation: boolean;
        canProvideEmotionalSupport: boolean;
        canSuggestInterventions: boolean;
        canDeliverTherapeuticContent: boolean;
        canMakeClinicalRecommendations: boolean;
        requiresHumanOversight: boolean;
        requiresClinicalValidation: boolean;
        canUseAdaptivePersonalization: boolean;
        canAccessUserHistory: boolean;
        requiresExplainability: boolean;
    };
    requirements: {
        disclaimerRequired: boolean;
        humanEscalationRequired: boolean;
        auditLoggingRequired: boolean;
        consentRequired: boolean;
        minorProtectionRequired: boolean;
        fundamentalRightsImpactAssessment: boolean;
        realTimeMonitoring: boolean;
        explainabilityRequired: boolean;
    };
    deployment: {
        allowedEnvironments: ('development' | 'staging' | 'production')[];
        requiresClinicalApproval: boolean;
        requiresRegulatoryApproval: boolean;
        maxResponseLatencyMs: number;
        requiresRedTeamTesting: boolean;
    };
    asl3SecurityTier: ASL3SecurityTier;
    euAiActClassification: EUAIActRiskLevel;
}
/**
 * Safety invariant categories
 * Based on 2025 research on formal verification for AI systems
 */
export type SafetyInvariantCategory = 'never_diagnose' | 'never_prescribe' | 'never_discourage_help' | 'never_minimize_crisis' | 'always_escalate_crisis' | 'always_disclose_ai' | 'always_protect_minors' | 'always_protect_privacy' | 'never_manipulate' | 'always_provide_hotline' | 'never_cause_psychological_harm' | 'never_exploit_vulnerability' | 'always_enable_human_oversight' | 'always_provide_explanation';
/**
 * Violation action types
 */
export type SafetyViolationAction = 'block' | 'escalate' | 'modify' | 'log_and_alert' | 'emergency' | 'circuit_breaker' | 'quarantine' | 'rollback';
/**
 * Safety invariant with formal verification properties
 */
export interface ISafetyInvariant {
    id: string;
    name: string;
    description: string;
    category: SafetyInvariantCategory;
    severity: 'critical' | 'high' | 'medium';
    formalSpec?: {
        temporalLogic: string;
        preconditions: string[];
        postconditions: string[];
        invariantProperty: string;
    };
    validate: (context: ISafetyContext) => ISafetyValidationResult;
    violationAction: SafetyViolationAction;
    verificationMethod: 'pattern_matching' | 'semantic_analysis' | 'formal_proof' | 'hybrid';
    confidenceThreshold: number;
}
/**
 * Risk levels
 */
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';
/**
 * Safety operations
 */
export type SafetyOperation = 'chat_response' | 'intervention_selection' | 'crisis_check' | 'content_personalization' | 'daily_insight' | 'weekly_analysis' | 'notification' | 'command_execution' | 'causal_inference' | 'counterfactual_generation' | 'family_pomdp_action' | 'explainability_generation';
/**
 * Emotional context for safety evaluation
 */
export interface IEmotionalContext {
    primaryEmotion: string;
    intensity: number;
    valence: number;
    arousal: number;
    phq9Score?: number;
    pdiScore?: number;
    anxietyLevel?: number;
    stressLevel?: number;
    emotionalTrend: 'improving' | 'stable' | 'declining' | 'volatile';
}
/**
 * Recent interaction record
 */
export interface IRecentInteraction {
    timestamp: Date;
    type: string;
    content: string;
    riskLevel: RiskLevel;
    emotionalState?: IEmotionalContext;
}
/**
 * Safety violation record
 */
export interface ISafetyViolation {
    id: string;
    invariantId: string;
    severity: 'critical' | 'high' | 'medium';
    message: string;
    details: string;
    timestamp: Date;
    context: Partial<ISafetyContext>;
    action: SafetyViolationAction;
    resolved: boolean;
    resolution?: string;
    confidence: number;
    verificationMethod: string;
    suggestedRemediation?: string;
}
/**
 * Comprehensive safety context
 */
export interface ISafetyContext {
    userId: number;
    ageGroup: 'child' | 'teen' | 'adult';
    isMinor: boolean;
    sessionId: string;
    messageCount: number;
    sessionDuration: number;
    inputText: string;
    outputText?: string;
    operation: SafetyOperation;
    currentRiskLevel: RiskLevel;
    crisisIndicators: string[];
    emotionalState?: IEmotionalContext;
    recentInteractions: IRecentInteraction[];
    previousViolations: ISafetyViolation[];
    timestamp: Date;
    source: 'user_message' | 'ai_response' | 'system_action';
    conversationTopic?: string;
    vulnerabilityFactors?: string[];
    confidenceInAgeDetection: number;
    requiresExplanation: boolean;
    parentalConsentStatus?: 'obtained' | 'pending' | 'not_required';
}
/**
 * Safety warning (not a violation, but needs attention)
 */
export interface ISafetyWarning {
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium';
    suggestion: string;
    category?: string;
    confidence?: number;
}
/**
 * Safety recommendation
 */
export interface ISafetyRecommendation {
    id: string;
    type: string;
    message: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    rationale?: string;
    expectedOutcome?: string;
}
/**
 * Safety action to take
 */
export interface ISafetyAction {
    type: 'block' | 'modify' | 'escalate' | 'log' | 'notify' | 'emergency' | 'circuit_breaker' | 'quarantine';
    target: string;
    details: string;
    priority: number;
    deadline?: Date;
    assignedTo?: string;
    automatedResponse?: string;
}
/**
 * Result of safety validation
 */
export interface ISafetyValidationResult {
    passed: boolean;
    violations: ISafetyViolation[];
    warnings: ISafetyWarning[];
    recommendations: ISafetyRecommendation[];
    sanitizedContent?: string;
    requiredActions: ISafetyAction[];
    validationTime: number;
    checksPerformed: string[];
    overallConfidence: number;
    riskScore: number;
    requiresHumanReview: boolean;
    explanationGenerated?: string;
}
/**
 * Constitutional principle for AI behavior
 */
export interface IConstitutionalPrinciple {
    id: string;
    name: string;
    description: string;
    category: 'safety' | 'ethics' | 'clinical' | 'legal' | 'regulatory';
    mustDo: string[];
    mustNotDo: string[];
    shouldDo: string[];
    shouldNotDo: string[];
    examples: {
        compliant: string[];
        nonCompliant: string[];
    };
    weight: number;
    regulatoryBasis?: string[];
    aiSafetyLevel?: SafetyLevel;
}
/**
 * Classification result from constitutional classifier
 */
export interface IConstitutionalClassification {
    input: string;
    output: string;
    isCompliant: boolean;
    violatedPrinciples: string[];
    scores: {
        principleId: string;
        score: number;
        reasoning: string;
    }[];
    suggestedModification?: string;
    confidence: number;
    inputClassification: IInputClassification;
    outputClassification: IOutputClassification;
    jailbreakAttemptDetected: boolean;
    promptInjectionDetected: boolean;
}
/**
 * Input classification (Anthropic Constitutional Classifiers 2025)
 */
export interface IInputClassification {
    isAllowed: boolean;
    riskCategory: 'safe' | 'borderline' | 'restricted' | 'prohibited';
    detectedPatterns: string[];
    confidence: number;
    shouldBlock: boolean;
    suggestedRedirect?: string;
}
/**
 * Output classification
 */
export interface IOutputClassification {
    isCompliant: boolean;
    harmfulContentScore: number;
    ethicsScore: number;
    clinicalSafetyScore: number;
    regulatoryComplianceScore: number;
    shouldModify: boolean;
    modificationSuggestion?: string;
}
/**
 * Escalation reasons
 */
export type EscalationReason = 'crisis_detected' | 'safety_concern' | 'ai_uncertainty' | 'user_request' | 'clinical_complexity' | 'minor_protection' | 'repeated_distress' | 'ethical_circuit_breaker' | 'confidence_below_threshold' | 'regulatory_requirement' | 'vulnerability_detected';
/**
 * Escalation status
 */
export type EscalationStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated_further' | 'auto_resolved' | 'timed_out' | 'cancelled';
/**
 * Escalation urgency levels
 */
export type EscalationUrgency = 'routine' | 'priority' | 'urgent' | 'emergency';
/**
 * Conversation message for escalation context
 */
export interface IConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
/**
 * Human escalation request
 */
export interface IHumanEscalationRequest {
    id: string;
    userId: number;
    sessionId: string;
    reason: EscalationReason;
    urgency: EscalationUrgency;
    triggerMessage: string;
    conversationHistory: IConversationMessage[];
    safetyContext: ISafetyContext;
    aiAssessment: {
        riskLevel: RiskLevel;
        confidence: number;
        reasoning: string;
        recommendedAction: string;
        suggestedResponses?: string[];
        relevantPrinciples?: string[];
        emotionalAnalysis?: IEmotionalContext;
    };
    status: EscalationStatus;
    assignedTo?: string;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
    priorityScore: number;
    estimatedResponseTime?: number;
    autoResponseSent?: boolean;
    followUpScheduled?: Date;
}
/**
 * Escalation decision result
 */
export interface IEscalationDecision {
    shouldEscalate: boolean;
    reason?: EscalationReason;
    urgency?: EscalationUrgency;
    confidence: number;
    triggers: string[];
    humanResponseRequired: boolean;
    maxWaitTime?: number;
    fallbackAction?: string;
}
/**
 * Crisis detection result
 */
export interface ICrisisDetectionResult {
    isCrisis: boolean;
    riskLevel: RiskLevel;
    indicators: string[];
    confidence: number;
    recommendedAction: string;
    immediateActions: ISafetyAction[];
    crisisType?: 'suicidal' | 'self_harm' | 'panic' | 'psychotic' | 'abuse' | 'other';
    assessmentMethod: 'keyword' | 'semantic' | 'behavioral' | 'multi_modal';
    suggestedResponses: string[];
    resourcesProvided: string[];
    followUpRequired: boolean;
}
/**
 * Guardrail check result
 */
export interface IGuardrailCheckResult {
    passed: boolean;
    guardrailId: string;
    guardrailName: string;
    checkType: 'input' | 'output' | 'both';
    detections: {
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        confidence: number;
    }[];
    blocked: boolean;
    modified: boolean;
    modifiedContent?: string;
    latencyMs: number;
    llmFirewallResult?: {
        promptGuardPassed: boolean;
        agentAlignmentPassed: boolean;
        codeShieldPassed: boolean;
    };
}
/**
 * Guardrail configuration
 */
export interface IGuardrailConfig {
    id: string;
    name: string;
    enabled: boolean;
    checkType: 'input' | 'output' | 'both';
    confidenceThreshold: number;
    maxLatencyMs: number;
    onDetection: 'block' | 'warn' | 'modify' | 'log';
    categories: string[];
    patterns?: {
        jailbreak: boolean;
        promptInjection: boolean;
        harmfulContent: boolean;
        piiLeakage: boolean;
        topicDrift: boolean;
    };
}
/**
 * Model metric for model card
 */
export interface IModelMetric {
    name: string;
    value: number;
    unit: string;
    description: string;
    dataset: string;
    methodology?: string;
    confidence?: number;
    lastMeasured?: Date;
}
/**
 * Model Card following CHAI (Coalition for Health AI) standard
 */
export interface IModelCard {
    modelName: string;
    modelVersion: string;
    organization: string;
    releaseDate: Date;
    lastUpdated: Date;
    intendedUse: {
        primaryUse: string;
        primaryUsers: string[];
        outOfScopeUses: string[];
    };
    trainingData: {
        description: string;
        sources: string[];
        size: string;
        preprocessing: string[];
        biasConsiderations: string[];
    };
    performance: {
        metrics: IModelMetric[];
        evaluationData: string;
        evaluationProcess: string;
        limitations: string[];
    };
    ethicalConsiderations: {
        sensitiveUseCases: string[];
        potentialHarms: string[];
        mitigationStrategies: string[];
    };
    safety: {
        safetyLevel: SafetyLevel;
        testedScenarios: string[];
        knownFailureModes: string[];
        safetyMeasures: string[];
        monitoringProcedures: string[];
        redTeamingResults?: string;
        adversarialTestingResults?: string;
        constitutionalPrinciplesCount?: number;
        safetyInvariantsCount?: number;
    };
    regulatory: {
        fdaStatus: string;
        ceMarking: string;
        euAiActClassification: string;
        clinicalValidation: string;
        fundamentalRightsAssessment?: string;
        dataProtectionCompliance?: string;
    };
    contact: {
        email: string;
        issueTracker: string;
        documentation: string;
    };
}
/**
 * Compliance status
 */
export interface IComplianceStatus {
    compliant: boolean;
    evidence: string;
    gaps: string[];
    lastAssessed: Date;
    remediationPlan?: string;
}
/**
 * EU AI Act compliance checklist
 */
export interface IEUAIActCompliance {
    riskClassification: EUAIActRiskLevel;
    requirements: {
        riskManagementSystem: IComplianceStatus;
        dataGovernance: IComplianceStatus;
        technicalDocumentation: IComplianceStatus;
        recordKeeping: IComplianceStatus;
        transparency: IComplianceStatus;
        humanOversight: IComplianceStatus;
        accuracy: IComplianceStatus;
        cybersecurity: IComplianceStatus;
        fundamentalRightsImpact: IComplianceStatus;
        postMarketMonitoring: IComplianceStatus;
    };
    transparency: {
        aiDisclosure: boolean;
        humanInteractionNotice: boolean;
        dataProcessingNotice: boolean;
        emotionRecognitionNotice: boolean;
    };
    prohibitedPractices: {
        subliminalManipulation: boolean;
        exploitingVulnerabilities: boolean;
        socialScoring: boolean;
        psychologicalHarm: boolean;
    };
    overallCompliance: boolean;
    gaps: string[];
    remediationPlan: string[];
    nextAssessmentDate: Date;
}
/**
 * Safety event for logging
 */
export interface ISafetyEvent {
    type: 'violation' | 'warning' | 'escalation' | 'crisis' | 'audit' | 'circuit_breaker';
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId: number;
    sessionId: string;
    details: Record<string, unknown>;
    timestamp: Date;
    correlationId?: string;
    traceId?: string;
    remediationApplied?: string;
}
/**
 * Safety report for user
 */
export interface ISafetyReport {
    userId: number;
    period: string;
    totalInteractions: number;
    violations: ISafetyViolation[];
    warnings: ISafetyWarning[];
    escalations: IHumanEscalationRequest[];
    riskTrend: RiskLevel[];
    recommendations: string[];
    overallSafetyScore: number;
    complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
    improvementAreas: string[];
}
/**
 * Safety monitor interface
 */
export interface ISafetyMonitor {
    validateInput(input: string, context: ISafetyContext): Promise<ISafetyValidationResult>;
    validateOutput(output: string, context: ISafetyContext): Promise<ISafetyValidationResult>;
    detectCrisis(context: ISafetyContext): Promise<ICrisisDetectionResult>;
    shouldEscalate(context: ISafetyContext): Promise<IEscalationDecision>;
    createEscalation(request: Omit<IHumanEscalationRequest, 'id' | 'status' | 'createdAt'>): Promise<IHumanEscalationRequest>;
    classifyConstitutional(input: string, output: string): Promise<IConstitutionalClassification>;
    runGuardrails(input: string, output: string, config?: IGuardrailConfig[]): Promise<IGuardrailCheckResult[]>;
    logSafetyEvent(event: ISafetyEvent): Promise<void>;
    getSafetyReport(userId: number, period: 'day' | 'week' | 'month'): Promise<ISafetyReport>;
    getComplianceStatus(): Promise<IEUAIActCompliance>;
    triggerCircuitBreaker(reason: string): Promise<void>;
    getModelCard(): IModelCard;
}
/**
 * Safety invariant service interface
 */
export interface ISafetyInvariantService {
    validateAll(context: ISafetyContext): ISafetyValidationResult;
    validateInvariant(invariantId: string, context: ISafetyContext): ISafetyValidationResult;
    getCriticalInvariants(): ISafetyInvariant[];
    getInvariantsByCategory(category: SafetyInvariantCategory): ISafetyInvariant[];
    addInvariant(invariant: ISafetyInvariant): void;
    getStatistics(): {
        total: number;
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
    };
}
/**
 * Constitutional classifier service interface
 */
export interface IConstitutionalClassifierService {
    classify(input: string, output: string, context?: Partial<ISafetyContext>): IConstitutionalClassification;
    quickCheck(output: string): {
        passed: boolean;
        criticalViolations: string[];
    };
    classifyInput(input: string): IInputClassification;
    classifyOutput(output: string, context?: Partial<ISafetyContext>): IOutputClassification;
    getAllPrinciples(): IConstitutionalPrinciple[];
    getPrinciplesByCategory(category: IConstitutionalPrinciple['category']): IConstitutionalPrinciple[];
    addPrinciple(principle: IConstitutionalPrinciple): void;
}
/**
 * Human escalation service interface
 */
export interface IHumanEscalationService {
    shouldEscalate(context: ISafetyContext): IEscalationDecision;
    createEscalation(request: Omit<IHumanEscalationRequest, 'id' | 'status' | 'createdAt'>): IHumanEscalationRequest;
    updateStatus(escalationId: string, status: EscalationStatus, resolution?: string): IHumanEscalationRequest | null;
    getEscalation(id: string): IHumanEscalationRequest | null;
    getPendingEscalations(): IHumanEscalationRequest[];
    getUserEscalations(userId: number): IHumanEscalationRequest[];
    generateEscalationResponse(reason: EscalationReason, urgency: EscalationUrgency, ageGroup: 'child' | 'teen' | 'adult'): string;
}
/**
 * Crisis detection service interface
 */
export interface ICrisisDetectionService {
    detectCrisis(context: ISafetyContext): Promise<ICrisisDetectionResult>;
    assessRiskLevel(text: string, context?: Partial<ISafetyContext>): RiskLevel;
    getCrisisPatterns(): {
        critical: RegExp[];
        high: RegExp[];
        moderate: RegExp[];
    };
    generateCrisisResponse(result: ICrisisDetectionResult, ageGroup: 'child' | 'teen' | 'adult'): string;
}
/**
 * Guardrail service interface
 */
export interface IGuardrailService {
    checkInput(input: string, configs?: IGuardrailConfig[]): Promise<IGuardrailCheckResult[]>;
    checkOutput(output: string, configs?: IGuardrailConfig[]): Promise<IGuardrailCheckResult[]>;
    checkBoth(input: string, output: string, configs?: IGuardrailConfig[]): Promise<IGuardrailCheckResult[]>;
    getActiveGuardrails(): IGuardrailConfig[];
    enableGuardrail(id: string): void;
    disableGuardrail(id: string): void;
}
/**
 * Safety score breakdown
 */
export interface ISafetyScoreBreakdown {
    overallScore: number;
    components: {
        invariantCompliance: number;
        constitutionalCompliance: number;
        crisisRisk: number;
        guardrailsPassed: number;
        humanOversightAdequate: number;
    };
    confidence: number;
    timestamp: Date;
}
/**
 * Safety metrics for monitoring
 */
export interface ISafetyMetrics {
    totalValidations: number;
    violationsCount: number;
    warningsCount: number;
    escalationsCount: number;
    crisisEventsCount: number;
    averageValidationTime: number;
    guardrailBlockRate: number;
    constitutionalComplianceRate: number;
    circuitBreakerTriggered: number;
    humanInterventionRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
}
/**
 * Generate unique ID for safety entities
 */
export declare function generateSafetyId(prefix?: string): string;
//# sourceMappingURL=ISafetyEnvelope.d.ts.map