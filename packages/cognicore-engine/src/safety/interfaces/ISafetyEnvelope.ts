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

import { randomUUID } from 'crypto';

// ============================================================================
// SAFETY LEVELS (MHSL - Mental Health Safety Levels)
// ============================================================================

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

  // Capabilities at this level
  capabilities: {
    canProvideInformation: boolean;
    canProvideEmotionalSupport: boolean;
    canSuggestInterventions: boolean;
    canDeliverTherapeuticContent: boolean;
    canMakeClinicalRecommendations: boolean;
    requiresHumanOversight: boolean;
    requiresClinicalValidation: boolean;
    // 2025 additions
    canUseAdaptivePersonalization: boolean;
    canAccessUserHistory: boolean;
    requiresExplainability: boolean;
  };

  // Safety requirements at this level
  requirements: {
    disclaimerRequired: boolean;
    humanEscalationRequired: boolean;
    auditLoggingRequired: boolean;
    consentRequired: boolean;
    minorProtectionRequired: boolean;
    // 2025 additions
    fundamentalRightsImpactAssessment: boolean;
    realTimeMonitoring: boolean;
    explainabilityRequired: boolean;
  };

  // Deployment constraints
  deployment: {
    allowedEnvironments: ('development' | 'staging' | 'production')[];
    requiresClinicalApproval: boolean;
    requiresRegulatoryApproval: boolean;
    // 2025 additions
    maxResponseLatencyMs: number;
    requiresRedTeamTesting: boolean;
  };

  // ASL-3 Security tier mapping
  asl3SecurityTier: ASL3SecurityTier;

  // EU AI Act classification
  euAiActClassification: EUAIActRiskLevel;
}

// ============================================================================
// SAFETY INVARIANTS (Formal Verification Approach)
// ============================================================================

/**
 * Safety invariant categories
 * Based on 2025 research on formal verification for AI systems
 */
export type SafetyInvariantCategory =
  | 'never_diagnose'           // Never provide clinical diagnoses
  | 'never_prescribe'          // Never recommend medications
  | 'never_discourage_help'    // Never discourage professional help
  | 'never_minimize_crisis'    // Never minimize suicidal ideation
  | 'always_escalate_crisis'   // Always escalate crisis situations
  | 'always_disclose_ai'       // Always disclose AI nature
  | 'always_protect_minors'    // Always apply minor protections
  | 'always_protect_privacy'   // Always protect PII
  | 'never_manipulate'         // Never use manipulative techniques
  | 'always_provide_hotline'   // Always provide crisis hotlines
  // 2025 additions
  | 'never_cause_psychological_harm'  // EU AI Act Art. 5
  | 'never_exploit_vulnerability'     // EU AI Act vulnerable groups
  | 'always_enable_human_oversight'   // HITL requirement
  | 'always_provide_explanation';     // XAI requirement

/**
 * Violation action types
 */
export type SafetyViolationAction =
  | 'block'           // Block the action entirely
  | 'escalate'        // Escalate to human
  | 'modify'          // Modify the output
  | 'log_and_alert'   // Log and alert administrators
  | 'emergency'       // Trigger emergency protocol
  // 2025 additions
  | 'circuit_breaker' // Ethical circuit breaker - pause system
  | 'quarantine'      // Quarantine for human review
  | 'rollback';       // Rollback to safe state

/**
 * Safety invariant with formal verification properties
 */
export interface ISafetyInvariant {
  id: string;
  name: string;
  description: string;
  category: SafetyInvariantCategory;
  severity: 'critical' | 'high' | 'medium';

  // Formal verification properties (2025)
  formalSpec?: {
    temporalLogic: string;  // LTL/CTL formula
    preconditions: string[];
    postconditions: string[];
    invariantProperty: string;
  };

  // Validation function
  validate: (context: ISafetyContext) => ISafetyValidationResult;

  // Action when violated
  violationAction: SafetyViolationAction;

  // 2025 additions
  verificationMethod: 'pattern_matching' | 'semantic_analysis' | 'formal_proof' | 'hybrid';
  confidenceThreshold: number;  // 0-1, below this triggers escalation
}

// ============================================================================
// SAFETY CONTEXT
// ============================================================================

/**
 * Risk levels
 */
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';

/**
 * Safety operations
 */
export type SafetyOperation =
  | 'chat_response'
  | 'intervention_selection'
  | 'crisis_check'
  | 'content_personalization'
  | 'daily_insight'
  | 'weekly_analysis'
  | 'notification'
  | 'command_execution'
  // 2025 additions
  | 'causal_inference'
  | 'counterfactual_generation'
  | 'family_pomdp_action'
  | 'explainability_generation';

/**
 * Emotional context for safety evaluation
 */
export interface IEmotionalContext {
  primaryEmotion: string;
  intensity: number;      // 0-1
  valence: number;        // -1 to 1
  arousal: number;        // 0-1
  // 2025 additions (EmoAgent)
  phq9Score?: number;     // PHQ-9 depression screening
  pdiScore?: number;      // PDI delusion inventory
  anxietyLevel?: number;  // 0-1
  stressLevel?: number;   // 0-1
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

  // Resolution
  action: SafetyViolationAction;
  resolved: boolean;
  resolution?: string;

  // 2025 additions
  confidence: number;
  verificationMethod: string;
  suggestedRemediation?: string;
}

/**
 * Comprehensive safety context
 */
export interface ISafetyContext {
  // User context
  userId: number;
  ageGroup: 'child' | 'teen' | 'adult';
  isMinor: boolean;

  // Session context
  sessionId: string;
  messageCount: number;
  sessionDuration: number; // minutes

  // Content context
  inputText: string;
  outputText?: string;
  operation: SafetyOperation;

  // Risk context
  currentRiskLevel: RiskLevel;
  crisisIndicators: string[];
  emotionalState?: IEmotionalContext;

  // History context
  recentInteractions: IRecentInteraction[];
  previousViolations: ISafetyViolation[];

  // Metadata
  timestamp: Date;
  source: 'user_message' | 'ai_response' | 'system_action';

  // 2025 additions
  conversationTopic?: string;
  vulnerabilityFactors?: string[];  // EU AI Act
  confidenceInAgeDetection: number;
  requiresExplanation: boolean;
  parentalConsentStatus?: 'obtained' | 'pending' | 'not_required';
}

// ============================================================================
// SAFETY VALIDATION
// ============================================================================

/**
 * Safety warning (not a violation, but needs attention)
 */
export interface ISafetyWarning {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium';
  suggestion: string;
  // 2025 additions
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
  // 2025 additions
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
  // 2025 additions
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

  // Modified content (if applicable)
  sanitizedContent?: string;

  // Actions to take
  requiredActions: ISafetyAction[];

  // Metadata
  validationTime: number; // ms
  checksPerformed: string[];

  // 2025 additions
  overallConfidence: number;
  riskScore: number;  // 0-100
  requiresHumanReview: boolean;
  explanationGenerated?: string;
}

// ============================================================================
// CONSTITUTIONAL CLASSIFIER (Anthropic 2025)
// ============================================================================

/**
 * Constitutional principle for AI behavior
 */
export interface IConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'ethics' | 'clinical' | 'legal' | 'regulatory';

  // Principle rules
  mustDo: string[];      // Actions that MUST be taken
  mustNotDo: string[];   // Actions that MUST NOT be taken
  shouldDo: string[];    // Recommended actions
  shouldNotDo: string[]; // Discouraged actions

  // Examples
  examples: {
    compliant: string[];
    nonCompliant: string[];
  };

  // 2025 additions
  weight: number;  // 0-1, importance in overall score
  regulatoryBasis?: string[];  // EU AI Act, FDA, etc.
  aiSafetyLevel?: SafetyLevel;
}

/**
 * Classification result from constitutional classifier
 */
export interface IConstitutionalClassification {
  input: string;
  output: string;

  // Classification
  isCompliant: boolean;
  violatedPrinciples: string[];

  // Scores
  scores: {
    principleId: string;
    score: number; // 0-1, 1 = fully compliant
    reasoning: string;
  }[];

  // Suggested modification
  suggestedModification?: string;

  // Confidence
  confidence: number;

  // 2025 additions
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
  harmfulContentScore: number;  // 0-1
  ethicsScore: number;          // 0-1
  clinicalSafetyScore: number;  // 0-1
  regulatoryComplianceScore: number; // 0-1
  shouldModify: boolean;
  modificationSuggestion?: string;
}

// ============================================================================
// HUMAN ESCALATION (HITL 2025)
// ============================================================================

/**
 * Escalation reasons
 */
export type EscalationReason =
  | 'crisis_detected'
  | 'safety_concern'
  | 'ai_uncertainty'
  | 'user_request'
  | 'clinical_complexity'
  | 'minor_protection'
  | 'repeated_distress'
  // 2025 additions
  | 'ethical_circuit_breaker'
  | 'confidence_below_threshold'
  | 'regulatory_requirement'
  | 'vulnerability_detected';

/**
 * Escalation status
 */
export type EscalationStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'escalated_further'
  // 2025 additions
  | 'auto_resolved'
  | 'timed_out'
  | 'cancelled';

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

  // Reason for escalation
  reason: EscalationReason;
  urgency: EscalationUrgency;

  // Context
  triggerMessage: string;
  conversationHistory: IConversationMessage[];
  safetyContext: ISafetyContext;

  // AI assessment
  aiAssessment: {
    riskLevel: RiskLevel;
    confidence: number;
    reasoning: string;
    recommendedAction: string;
    // 2025 additions
    suggestedResponses?: string[];
    relevantPrinciples?: string[];
    emotionalAnalysis?: IEmotionalContext;
  };

  // Status
  status: EscalationStatus;
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;

  // 2025 additions
  priorityScore: number;  // Computed priority for queue ordering
  estimatedResponseTime?: number;  // minutes
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
  // 2025 additions
  triggers: string[];
  humanResponseRequired: boolean;
  maxWaitTime?: number;  // minutes
  fallbackAction?: string;
}

// ============================================================================
// CRISIS DETECTION (2025 Research)
// ============================================================================

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

  // 2025 additions
  crisisType?: 'suicidal' | 'self_harm' | 'panic' | 'psychotic' | 'abuse' | 'other';
  assessmentMethod: 'keyword' | 'semantic' | 'behavioral' | 'multi_modal';
  suggestedResponses: string[];
  resourcesProvided: string[];
  followUpRequired: boolean;
}

// ============================================================================
// GUARDRAILS (LlamaFirewall, NeMo Guardrails 2025)
// ============================================================================

/**
 * Guardrail check result
 */
export interface IGuardrailCheckResult {
  passed: boolean;
  guardrailId: string;
  guardrailName: string;
  checkType: 'input' | 'output' | 'both';

  // Detection results
  detections: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    confidence: number;
  }[];

  // Actions
  blocked: boolean;
  modified: boolean;
  modifiedContent?: string;

  // Performance
  latencyMs: number;

  // 2025 specific
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

  // Thresholds
  confidenceThreshold: number;
  maxLatencyMs: number;

  // Actions
  onDetection: 'block' | 'warn' | 'modify' | 'log';

  // Categories to check
  categories: string[];

  // 2025 patterns
  patterns?: {
    jailbreak: boolean;
    promptInjection: boolean;
    harmfulContent: boolean;
    piiLeakage: boolean;
    topicDrift: boolean;
  };
}

// ============================================================================
// MODEL CARD (CHAI-Compatible)
// ============================================================================

/**
 * Model metric for model card
 */
export interface IModelMetric {
  name: string;
  value: number;
  unit: string;
  description: string;
  dataset: string;
  // 2025 additions
  methodology?: string;
  confidence?: number;
  lastMeasured?: Date;
}

/**
 * Model Card following CHAI (Coalition for Health AI) standard
 */
export interface IModelCard {
  // Basic Information
  modelName: string;
  modelVersion: string;
  organization: string;
  releaseDate: Date;
  lastUpdated: Date;

  // Intended Use
  intendedUse: {
    primaryUse: string;
    primaryUsers: string[];
    outOfScopeUses: string[];
  };

  // Training Data
  trainingData: {
    description: string;
    sources: string[];
    size: string;
    preprocessing: string[];
    biasConsiderations: string[];
  };

  // Performance Metrics
  performance: {
    metrics: IModelMetric[];
    evaluationData: string;
    evaluationProcess: string;
    limitations: string[];
  };

  // Ethical Considerations
  ethicalConsiderations: {
    sensitiveUseCases: string[];
    potentialHarms: string[];
    mitigationStrategies: string[];
  };

  // Safety Information
  safety: {
    safetyLevel: SafetyLevel;
    testedScenarios: string[];
    knownFailureModes: string[];
    safetyMeasures: string[];
    monitoringProcedures: string[];
    // 2025 additions
    redTeamingResults?: string;
    adversarialTestingResults?: string;
    constitutionalPrinciplesCount?: number;
    safetyInvariantsCount?: number;
  };

  // Regulatory Information
  regulatory: {
    fdaStatus: string;
    ceMarking: string;
    euAiActClassification: string;
    clinicalValidation: string;
    // 2025 additions
    fundamentalRightsAssessment?: string;
    dataProtectionCompliance?: string;
  };

  // Contact
  contact: {
    email: string;
    issueTracker: string;
    documentation: string;
  };
}

// ============================================================================
// EU AI ACT COMPLIANCE (2025)
// ============================================================================

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
  // Risk classification
  riskClassification: EUAIActRiskLevel;

  // Requirements for high-risk systems (Article 9-15)
  requirements: {
    riskManagementSystem: IComplianceStatus;      // Art. 9
    dataGovernance: IComplianceStatus;            // Art. 10
    technicalDocumentation: IComplianceStatus;    // Art. 11
    recordKeeping: IComplianceStatus;             // Art. 12
    transparency: IComplianceStatus;              // Art. 13
    humanOversight: IComplianceStatus;            // Art. 14
    accuracy: IComplianceStatus;                  // Art. 15
    cybersecurity: IComplianceStatus;             // Art. 15
    // 2025 additions
    fundamentalRightsImpact: IComplianceStatus;   // Art. 27
    postMarketMonitoring: IComplianceStatus;      // Art. 72
  };

  // Transparency obligations (Article 52)
  transparency: {
    aiDisclosure: boolean;
    humanInteractionNotice: boolean;
    dataProcessingNotice: boolean;
    emotionRecognitionNotice: boolean;  // 2025
  };

  // Prohibited practices check (Article 5)
  prohibitedPractices: {
    subliminalManipulation: boolean;  // Art. 5(1)(a)
    exploitingVulnerabilities: boolean; // Art. 5(1)(b)
    socialScoring: boolean;  // Art. 5(1)(c)
    psychologicalHarm: boolean;  // 2025 interpretation
  };

  // Overall status
  overallCompliance: boolean;
  gaps: string[];
  remediationPlan: string[];
  nextAssessmentDate: Date;
}

// ============================================================================
// SAFETY MONITOR INTERFACE
// ============================================================================

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
  // 2025 additions
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
  // 2025 additions
  overallSafetyScore: number;  // 0-100
  complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  improvementAreas: string[];
}

/**
 * Safety monitor interface
 */
export interface ISafetyMonitor {
  // Real-time monitoring
  validateInput(input: string, context: ISafetyContext): Promise<ISafetyValidationResult>;
  validateOutput(output: string, context: ISafetyContext): Promise<ISafetyValidationResult>;

  // Crisis detection
  detectCrisis(context: ISafetyContext): Promise<ICrisisDetectionResult>;

  // Human escalation
  shouldEscalate(context: ISafetyContext): Promise<IEscalationDecision>;
  createEscalation(request: Omit<IHumanEscalationRequest, 'id' | 'status' | 'createdAt'>): Promise<IHumanEscalationRequest>;

  // Constitutional classification
  classifyConstitutional(input: string, output: string): Promise<IConstitutionalClassification>;

  // Guardrails (2025)
  runGuardrails(input: string, output: string, config?: IGuardrailConfig[]): Promise<IGuardrailCheckResult[]>;

  // Audit
  logSafetyEvent(event: ISafetyEvent): Promise<void>;
  getSafetyReport(userId: number, period: 'day' | 'week' | 'month'): Promise<ISafetyReport>;

  // 2025 additions
  getComplianceStatus(): Promise<IEUAIActCompliance>;
  triggerCircuitBreaker(reason: string): Promise<void>;
  getModelCard(): IModelCard;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

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
  quickCheck(output: string): { passed: boolean; criticalViolations: string[] };
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
  getCrisisPatterns(): { critical: RegExp[]; high: RegExp[]; moderate: RegExp[] };
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

// ============================================================================
// UTILITY TYPES
// ============================================================================

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
  // 2025 additions
  circuitBreakerTriggered: number;
  humanInterventionRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

/**
 * Generate unique ID for safety entities
 */
export function generateSafetyId(prefix: string = 'SAFE'): string {
  return `${prefix}-${randomUUID()}`;
}
