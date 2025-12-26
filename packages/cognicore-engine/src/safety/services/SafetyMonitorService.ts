/**
 * Safety Monitor Service
 *
 * Phase 6.2: Central safety monitoring and enforcement
 *
 * Orchestrates:
 * - Safety Invariants validation
 * - Constitutional Classification
 * - Human Escalation
 * - Crisis Detection
 * - Guardrails (LlamaFirewall-style)
 * - Audit Logging
 *
 * 2025 Research Integration:
 * - <100ms latency target (Fiddler Guardrails)
 * - Multi-layer defense (Anthropic Constitutional Classifiers)
 * - Ethical circuit breakers (HITL 2025)
 * - Real-time monitoring (OWASP Top 10 2025)
 */

import { randomUUID } from 'crypto';
import {
  ISafetyMonitor,
  ISafetyContext,
  ISafetyValidationResult,
  ICrisisDetectionResult,
  IEscalationDecision,
  IHumanEscalationRequest,
  IConstitutionalClassification,
  IGuardrailCheckResult,
  IGuardrailConfig,
  ISafetyEvent,
  ISafetyReport,
  IEUAIActCompliance,
  IModelCard,
  ISafetyViolation,
  ISafetyAction,
  RiskLevel,
  generateSafetyId,
} from '../interfaces/ISafetyEnvelope';
import { SafetyInvariantService, safetyInvariantService } from './SafetyInvariantService';
import { ConstitutionalClassifierEngine, constitutionalClassifierEngine } from '../engines/ConstitutionalClassifierEngine';
import { CrisisDetectionEngine, crisisDetectionEngine } from '../engines/CrisisDetectionEngine';
import { HumanEscalationService, humanEscalationService } from './HumanEscalationService';
import { SAFETY_LEVEL_CONFIGS, CURRENT_SAFETY_LEVEL, EU_AI_ACT_CLASSIFICATION } from '../utils/SafetyLevels';
import { COGNICORE_MODEL_CARD } from '../utils/ModelCard';

// ============================================================================
// DEFAULT GUARDRAIL CONFIGURATIONS
// ============================================================================

const DEFAULT_GUARDRAILS: IGuardrailConfig[] = [
  {
    id: 'GR-001',
    name: 'Jailbreak Detector',
    enabled: true,
    checkType: 'input',
    confidenceThreshold: 0.85,
    maxLatencyMs: 50,
    onDetection: 'block',
    categories: ['jailbreak', 'prompt_injection'],
    patterns: {
      jailbreak: true,
      promptInjection: true,
      harmfulContent: false,
      piiLeakage: false,
      topicDrift: false,
    },
  },
  {
    id: 'GR-002',
    name: 'Harmful Content Filter',
    enabled: true,
    checkType: 'both',
    confidenceThreshold: 0.80,
    maxLatencyMs: 50,
    onDetection: 'block',
    categories: ['harmful_content', 'crisis'],
    patterns: {
      jailbreak: false,
      promptInjection: false,
      harmfulContent: true,
      piiLeakage: false,
      topicDrift: false,
    },
  },
  {
    id: 'GR-003',
    name: 'PII Detector',
    enabled: true,
    checkType: 'output',
    confidenceThreshold: 0.90,
    maxLatencyMs: 30,
    onDetection: 'modify',
    categories: ['pii'],
    patterns: {
      jailbreak: false,
      promptInjection: false,
      harmfulContent: false,
      piiLeakage: true,
      topicDrift: false,
    },
  },
];

// ============================================================================
// PII DETECTION PATTERNS
// ============================================================================

const PII_PATTERNS = [
  { type: 'phone_ru', pattern: /\+?[78][\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g },
  { type: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: 'passport_ru', pattern: /\d{4}\s?\d{6}/g },
  { type: 'snils', pattern: /\d{3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}/g },
  { type: 'inn', pattern: /\d{10,12}/g },
  { type: 'card_number', pattern: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g },
  { type: 'address', pattern: /ул\.\s*[А-Яа-яЁё\s]+,?\s*д\.\s*\d+/gi },
];

// ============================================================================
// SAFETY MONITOR SERVICE
// ============================================================================

/**
 * Safety Monitor Service
 *
 * Central component for real-time safety monitoring with 2025 best practices
 */
export class SafetyMonitorService implements ISafetyMonitor {
  private invariantService: SafetyInvariantService;
  private constitutionalClassifier: ConstitutionalClassifierEngine;
  private crisisDetector: CrisisDetectionEngine;
  private humanEscalation: HumanEscalationService;
  private guardrails: IGuardrailConfig[];

  // Event log (should be database in production)
  private eventLog: ISafetyEvent[] = [];

  // User violation history
  private userViolations: Map<number, ISafetyViolation[]> = new Map();

  // Circuit breaker state
  private circuitBreakerTriggered: boolean = false;
  private circuitBreakerReason?: string;

  constructor(
    invariantService?: SafetyInvariantService,
    constitutional?: ConstitutionalClassifierEngine,
    crisisDetector?: CrisisDetectionEngine,
    escalation?: HumanEscalationService,
    guardrails?: IGuardrailConfig[]
  ) {
    this.invariantService = invariantService || safetyInvariantService;
    this.constitutionalClassifier = constitutional || constitutionalClassifierEngine;
    this.crisisDetector = crisisDetector || crisisDetectionEngine;
    this.humanEscalation = escalation || humanEscalationService;
    this.guardrails = guardrails || DEFAULT_GUARDRAILS;
  }

  // ==========================================================================
  // INPUT VALIDATION
  // ==========================================================================

  /**
   * Validate user input before processing
   */
  async validateInput(
    input: string,
    context: ISafetyContext
  ): Promise<ISafetyValidationResult> {
    const startTime = Date.now();
    const violations: ISafetyViolation[] = [];
    const warnings: ISafetyValidationResult['warnings'] = [];
    const requiredActions: ISafetyAction[] = [];
    const checksPerformed: string[] = [];

    // Check circuit breaker
    if (this.circuitBreakerTriggered) {
      return {
        passed: false,
        violations: [{
          id: generateSafetyId('VIO'),
          invariantId: 'CIRCUIT_BREAKER',
          severity: 'critical',
          message: 'System paused by circuit breaker',
          details: this.circuitBreakerReason || 'Safety pause active',
          timestamp: new Date(),
          context: {},
          action: 'circuit_breaker',
          resolved: false,
          confidence: 1.0,
          verificationMethod: 'system',
        }],
        warnings: [],
        recommendations: [],
        requiredActions: [{
          type: 'circuit_breaker',
          target: 'system',
          details: 'Escalate to human immediately',
          priority: 1,
        }],
        validationTime: Date.now() - startTime,
        checksPerformed: ['circuit_breaker'],
        overallConfidence: 1.0,
        riskScore: 100,
        requiresHumanReview: true,
      };
    }

    // 1. Run guardrails on input
    const guardrailResults = await this.runGuardrails(input, '', this.guardrails.filter(g => g.checkType === 'input' || g.checkType === 'both'));
    checksPerformed.push('guardrails_input');

    for (const result of guardrailResults) {
      if (!result.passed) {
        for (const detection of result.detections) {
          if (detection.severity === 'critical' || detection.severity === 'high') {
            violations.push({
              id: generateSafetyId('VIO'),
              invariantId: result.guardrailId,
              severity: detection.severity === 'critical' ? 'critical' : 'high',
              message: detection.description,
              details: `Guardrail ${result.guardrailName} triggered`,
              timestamp: new Date(),
              context: { inputText: context.inputText },
              action: result.blocked ? 'block' : 'log_and_alert',
              resolved: false,
              confidence: detection.confidence,
              verificationMethod: 'guardrail',
            });
          }
        }
      }
    }

    // 2. Constitutional input classification
    const inputClassification = this.constitutionalClassifier.classifyInput(input);
    checksPerformed.push('constitutional_input');

    if (!inputClassification.isAllowed) {
      violations.push({
        id: generateSafetyId('VIO'),
        invariantId: 'CONSTITUTIONAL_INPUT',
        severity: 'critical',
        message: 'Input violates constitutional principles',
        details: `Risk category: ${inputClassification.riskCategory}`,
        timestamp: new Date(),
        context: { inputText: context.inputText },
        action: 'block',
        resolved: false,
        confidence: inputClassification.confidence,
        verificationMethod: 'constitutional',
      });

      requiredActions.push({
        type: 'block',
        target: 'input',
        details: 'Input prohibited by constitutional classifier',
        priority: 1,
      });
    }

    // 3. Crisis detection
    const crisisResult = await this.detectCrisis({
      ...context,
      inputText: input,
    });
    checksPerformed.push('crisis_detection');

    if (crisisResult.isCrisis) {
      requiredActions.push(...crisisResult.immediateActions);

      // Log crisis event
      await this.logSafetyEvent({
        type: 'crisis',
        severity: crisisResult.riskLevel === 'critical' ? 'critical' : 'high',
        userId: context.userId,
        sessionId: context.sessionId,
        details: {
          riskLevel: crisisResult.riskLevel,
          indicators: crisisResult.indicators,
          crisisType: crisisResult.crisisType,
        },
        timestamp: new Date(),
      });
    }

    // 4. Check for harmful request patterns
    const harmfulPatterns = [
      { pattern: /как (убить|отравить|навредить) (человека|кого-то)/gi, type: 'harmful_request' },
      { pattern: /как (сделать|изготовить) (бомбу|оружие|наркотики)/gi, type: 'illegal_request' },
    ];

    for (const { pattern, type } of harmfulPatterns) {
      if (pattern.test(input)) {
        violations.push({
          id: generateSafetyId('VIO'),
          invariantId: 'INPUT-HARMFUL',
          severity: 'critical',
          message: `Harmful input detected: ${type}`,
          details: 'Input blocked for safety',
          timestamp: new Date(),
          context: { inputText: context.inputText },
          action: 'block',
          resolved: false,
          confidence: 0.95,
          verificationMethod: 'pattern_matching',
        });

        requiredActions.push({
          type: 'block',
          target: 'input',
          details: 'Block harmful request',
          priority: 1,
        });
      }
    }
    checksPerformed.push('harmful_patterns');

    const validationTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(violations, guardrailResults);
    const riskScore = this.calculateRiskScore(violations, crisisResult);

    return {
      passed: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      warnings,
      recommendations: [],
      requiredActions,
      validationTime,
      checksPerformed,
      overallConfidence,
      riskScore,
      requiresHumanReview: violations.some(v => v.severity === 'critical') || crisisResult.isCrisis,
    };
  }

  // ==========================================================================
  // OUTPUT VALIDATION
  // ==========================================================================

  /**
   * Validate AI output before sending to user
   */
  async validateOutput(
    output: string,
    context: ISafetyContext
  ): Promise<ISafetyValidationResult> {
    const startTime = Date.now();
    const checksPerformed: string[] = [];

    // 1. Validate safety invariants
    const invariantResult = this.invariantService.validateAll({
      ...context,
      outputText: output,
    });
    checksPerformed.push('invariants');

    // 2. Constitutional classification
    const constitutionalResult = this.constitutionalClassifier.classify(
      context.inputText,
      output,
      context
    );
    checksPerformed.push('constitutional');

    // 3. Run guardrails on output
    const guardrailResults = await this.runGuardrails('', output, this.guardrails.filter(g => g.checkType === 'output' || g.checkType === 'both'));
    checksPerformed.push('guardrails_output');

    // 4. Combine results
    const violations = [...invariantResult.violations];
    const warnings = [...invariantResult.warnings];
    const requiredActions = [...invariantResult.requiredActions];

    // Add constitutional violations
    if (!constitutionalResult.isCompliant) {
      for (const principleId of constitutionalResult.violatedPrinciples) {
        violations.push({
          id: generateSafetyId('VIO'),
          invariantId: principleId,
          severity: 'high',
          message: `Constitutional principle violated: ${principleId}`,
          details: constitutionalResult.scores
            .find(s => s.principleId === principleId)?.reasoning || '',
          timestamp: new Date(),
          context: {},
          action: 'modify',
          resolved: false,
          confidence: constitutionalResult.confidence,
          verificationMethod: 'constitutional',
        });
      }

      if (constitutionalResult.suggestedModification) {
        requiredActions.push({
          type: 'modify',
          target: 'output',
          details: 'Apply constitutional modification',
          priority: 2,
        });
      }
    }

    // Add guardrail violations
    for (const result of guardrailResults) {
      if (!result.passed) {
        for (const detection of result.detections) {
          violations.push({
            id: generateSafetyId('VIO'),
            invariantId: result.guardrailId,
            severity: detection.severity === 'critical' ? 'critical' : 'high',
            message: detection.description,
            details: `Guardrail: ${result.guardrailName}`,
            timestamp: new Date(),
            context: {},
            action: result.modified ? 'modify' : 'block',
            resolved: false,
            confidence: detection.confidence,
            verificationMethod: 'guardrail',
          });
        }
      }
    }

    // 5. Age-appropriate check
    if (context.isMinor && this.containsAgeInappropriateContent(output)) {
      violations.push({
        id: generateSafetyId('VIO'),
        invariantId: 'AGE-INAPPROPRIATE',
        severity: 'high',
        message: 'Age-inappropriate content for minor',
        details: 'Content must be filtered',
        timestamp: new Date(),
        context: { ageGroup: context.ageGroup },
        action: 'modify',
        resolved: false,
        confidence: 0.90,
        verificationMethod: 'pattern_matching',
      });
    }
    checksPerformed.push('age_appropriate');

    // 6. PII check
    const piiResult = this.detectPII(output);
    if (piiResult.found) {
      warnings.push({
        id: generateSafetyId('WARN'),
        type: 'pii_detected',
        message: `PII detected in output: ${piiResult.types.join(', ')}`,
        severity: 'medium',
        suggestion: 'PII should be masked',
        category: 'privacy',
        confidence: 0.90,
      });
    }
    checksPerformed.push('pii_detection');

    // Log violations
    if (violations.length > 0) {
      await this.logSafetyEvent({
        type: 'violation',
        severity: violations.some(v => v.severity === 'critical') ? 'critical' : 'high',
        userId: context.userId,
        sessionId: context.sessionId,
        details: {
          violationCount: violations.length,
          violationIds: violations.map(v => v.invariantId),
        },
        timestamp: new Date(),
      });

      // Store user violations
      const userViolations = this.userViolations.get(context.userId) || [];
      userViolations.push(...violations);
      this.userViolations.set(context.userId, userViolations);
    }

    const validationTime = Date.now() - startTime;
    const sanitizedContent = constitutionalResult.suggestedModification ||
                             (piiResult.found ? piiResult.masked : output);

    return {
      passed: !violations.some(v => v.severity === 'critical'),
      violations,
      warnings,
      recommendations: invariantResult.recommendations,
      sanitizedContent,
      requiredActions,
      validationTime,
      checksPerformed,
      overallConfidence: this.calculateOverallConfidence(violations, guardrailResults),
      riskScore: violations.length > 0 ? Math.max(...violations.map(v => v.severity === 'critical' ? 100 : 70)) : 0,
      requiresHumanReview: violations.some(v => v.severity === 'critical'),
    };
  }

  // ==========================================================================
  // CRISIS DETECTION
  // ==========================================================================

  /**
   * Detect crisis indicators
   */
  async detectCrisis(context: ISafetyContext): Promise<ICrisisDetectionResult> {
    return this.crisisDetector.detectCrisis(context);
  }

  // ==========================================================================
  // HUMAN ESCALATION
  // ==========================================================================

  /**
   * Determine if escalation is needed
   */
  async shouldEscalate(context: ISafetyContext): Promise<IEscalationDecision> {
    return this.humanEscalation.shouldEscalate(context);
  }

  /**
   * Create escalation request
   */
  async createEscalation(
    request: Omit<IHumanEscalationRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<IHumanEscalationRequest> {
    const escalation = this.humanEscalation.createEscalation(request);

    // Log escalation event
    await this.logSafetyEvent({
      type: 'escalation',
      severity: request.urgency === 'emergency' ? 'critical' : 'high',
      userId: request.userId,
      sessionId: request.sessionId,
      details: {
        escalationId: escalation.id,
        reason: request.reason,
        urgency: request.urgency,
      },
      timestamp: new Date(),
    });

    return escalation;
  }

  // ==========================================================================
  // CONSTITUTIONAL CLASSIFICATION
  // ==========================================================================

  /**
   * Classify input/output pair
   */
  async classifyConstitutional(
    input: string,
    output: string
  ): Promise<IConstitutionalClassification> {
    return this.constitutionalClassifier.classify(input, output);
  }

  // ==========================================================================
  // GUARDRAILS
  // ==========================================================================

  /**
   * Run guardrails on input/output
   */
  async runGuardrails(
    input: string,
    output: string,
    configs?: IGuardrailConfig[]
  ): Promise<IGuardrailCheckResult[]> {
    const activeConfigs = configs || this.guardrails.filter(g => g.enabled);
    const results: IGuardrailCheckResult[] = [];

    for (const config of activeConfigs) {
      const startTime = Date.now();
      const detections: IGuardrailCheckResult['detections'] = [];
      let passed = true;
      let blocked = false;
      let modified = false;
      let modifiedContent: string | undefined;

      const textToCheck = config.checkType === 'input' ? input :
                          config.checkType === 'output' ? output :
                          `${input}\n${output}`;

      // Run pattern checks based on config
      if (config.patterns?.jailbreak) {
        const jailbreakPatterns = [
          /ignore (all |)previous instructions/gi,
          /you are now/gi,
          /\[SYSTEM\]/gi,
          /DAN mode/gi,
        ];

        for (const pattern of jailbreakPatterns) {
          if (pattern.test(textToCheck)) {
            detections.push({
              type: 'jailbreak_attempt',
              severity: 'critical',
              description: 'Jailbreak attempt detected',
              confidence: 0.95,
            });
            passed = false;
            if (config.onDetection === 'block') blocked = true;
          }
        }
      }

      if (config.patterns?.promptInjection) {
        const injectionPatterns = [
          /\[ADMIN\]/gi,
          /system prompt/gi,
          /ignore safety/gi,
        ];

        for (const pattern of injectionPatterns) {
          if (pattern.test(textToCheck)) {
            detections.push({
              type: 'prompt_injection',
              severity: 'high',
              description: 'Prompt injection attempt detected',
              confidence: 0.90,
            });
            passed = false;
            if (config.onDetection === 'block') blocked = true;
          }
        }
      }

      if (config.patterns?.harmfulContent) {
        const harmfulPatterns = [
          /как (убить|навредить|отравить)/gi,
          /методы суицида/gi,
        ];

        for (const pattern of harmfulPatterns) {
          if (pattern.test(textToCheck)) {
            detections.push({
              type: 'harmful_content',
              severity: 'critical',
              description: 'Harmful content detected',
              confidence: 0.95,
            });
            passed = false;
            if (config.onDetection === 'block') blocked = true;
          }
        }
      }

      if (config.patterns?.piiLeakage && output) {
        const piiResult = this.detectPII(output);
        if (piiResult.found) {
          detections.push({
            type: 'pii_leakage',
            severity: 'medium',
            description: `PII detected: ${piiResult.types.join(', ')}`,
            confidence: 0.90,
          });
          if (config.onDetection === 'modify') {
            modified = true;
            modifiedContent = piiResult.masked;
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      results.push({
        passed,
        guardrailId: config.id,
        guardrailName: config.name,
        checkType: config.checkType,
        detections,
        blocked,
        modified,
        modifiedContent,
        latencyMs,
      });
    }

    return results;
  }

  // ==========================================================================
  // CIRCUIT BREAKER
  // ==========================================================================

  /**
   * Trigger circuit breaker to pause system
   */
  async triggerCircuitBreaker(reason: string): Promise<void> {
    this.circuitBreakerTriggered = true;
    this.circuitBreakerReason = reason;

    await this.logSafetyEvent({
      type: 'circuit_breaker',
      severity: 'critical',
      userId: 0,
      sessionId: 'SYSTEM',
      details: { reason },
      timestamp: new Date(),
    });
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerTriggered = false;
    this.circuitBreakerReason = undefined;
  }

  // ==========================================================================
  // AUDIT & LOGGING
  // ==========================================================================

  /**
   * Log safety event
   */
  async logSafetyEvent(event: ISafetyEvent): Promise<void> {
    this.eventLog.push({
      ...event,
      timestamp: event.timestamp || new Date(),
      correlationId: event.correlationId || generateSafetyId('COR'),
    });
  }

  /**
   * Get safety report for user
   */
  async getSafetyReport(
    userId: number,
    period: 'day' | 'week' | 'month'
  ): Promise<ISafetyReport> {
    const now = new Date();
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const startDate = new Date(now.getTime() - periodMs[period]);

    const userEvents = this.eventLog.filter(
      e => e.userId === userId && e.timestamp >= startDate
    );

    const violations = (this.userViolations.get(userId) || [])
      .filter(v => v.timestamp >= startDate);

    const escalations = this.humanEscalation.getUserEscalations(userId)
      .filter(e => e.createdAt >= startDate);

    const riskTrend = this.calculateRiskTrend(userEvents);

    const recommendations = this.generateRecommendations(violations, escalations, riskTrend);

    const overallSafetyScore = this.calculateSafetyScore(violations, escalations);

    return {
      userId,
      period: `${period} (${startDate.toISOString()} - ${now.toISOString()})`,
      totalInteractions: userEvents.length,
      violations,
      warnings: [],
      escalations,
      riskTrend,
      recommendations,
      overallSafetyScore,
      complianceStatus: overallSafetyScore >= 80 ? 'compliant' :
                        overallSafetyScore >= 60 ? 'at_risk' : 'non_compliant',
      improvementAreas: this.identifyImprovementAreas(violations),
    };
  }

  // ==========================================================================
  // COMPLIANCE
  // ==========================================================================

  /**
   * Get EU AI Act compliance status
   */
  async getComplianceStatus(): Promise<IEUAIActCompliance> {
    return EU_AI_ACT_CLASSIFICATION as any;
  }

  /**
   * Get model card
   */
  getModelCard(): IModelCard {
    return COGNICORE_MODEL_CARD;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private containsAgeInappropriateContent(text: string): boolean {
    const patterns = [
      /алкоголь|наркотики|курение/gi,
      /секс|порно/gi,
      /насилие|убийство/gi,
    ];
    return patterns.some(p => p.test(text));
  }

  private detectPII(text: string): { found: boolean; types: string[]; masked: string } {
    const types: string[] = [];
    let masked = text;

    for (const { type, pattern } of PII_PATTERNS) {
      if (pattern.test(text)) {
        types.push(type);
        masked = masked.replace(pattern, '[СКРЫТО]');
      }
    }

    return { found: types.length > 0, types, masked };
  }

  private calculateOverallConfidence(
    violations: ISafetyViolation[],
    guardrailResults: IGuardrailCheckResult[]
  ): number {
    if (violations.length === 0) return 0.95;

    const avgViolationConfidence = violations.reduce((sum, v) => sum + v.confidence, 0) / violations.length;
    return avgViolationConfidence;
  }

  private calculateRiskScore(
    violations: ISafetyViolation[],
    crisisResult: ICrisisDetectionResult
  ): number {
    let score = 0;

    for (const v of violations) {
      score += v.severity === 'critical' ? 30 : v.severity === 'high' ? 20 : 10;
    }

    const riskScores: Record<RiskLevel, number> = {
      none: 0, low: 10, moderate: 30, high: 50, critical: 70
    };
    score += riskScores[crisisResult.riskLevel];

    return Math.min(100, score);
  }

  private calculateRiskTrend(events: ISafetyEvent[]): RiskLevel[] {
    const byDay = new Map<string, RiskLevel>();

    for (const event of events) {
      const day = event.timestamp.toISOString().split('T')[0];
      const riskLevel = this.severityToRisk(event.severity);

      const currentMax = byDay.get(day) || 'none';
      if (this.compareRisk(riskLevel, currentMax) > 0) {
        byDay.set(day, riskLevel);
      }
    }

    return Array.from(byDay.values());
  }

  private severityToRisk(severity: ISafetyEvent['severity']): RiskLevel {
    const map: Record<ISafetyEvent['severity'], RiskLevel> = {
      critical: 'critical',
      high: 'high',
      medium: 'moderate',
      low: 'low',
    };
    return map[severity];
  }

  private compareRisk(a: RiskLevel, b: RiskLevel): number {
    const order: RiskLevel[] = ['none', 'low', 'moderate', 'high', 'critical'];
    return order.indexOf(a) - order.indexOf(b);
  }

  private generateRecommendations(
    violations: ISafetyViolation[],
    escalations: IHumanEscalationRequest[],
    riskTrend: RiskLevel[]
  ): string[] {
    const recommendations: string[] = [];

    if (violations.length > 3) {
      recommendations.push('Rекомендуется консультация с психологом');
    }

    if (escalations.some(e => e.status !== 'resolved')) {
      recommendations.push('Есть нерешённые запросы на помощь');
    }

    const recentHighRisk = riskTrend.slice(-3).filter(
      r => r === 'high' || r === 'critical'
    ).length;

    if (recentHighRisk >= 2) {
      recommendations.push('Повышенный уровень риска — рекомендуется профессиональная поддержка');
    }

    if (recommendations.length === 0) {
      recommendations.push('Показатели безопасности в норме');
    }

    return recommendations;
  }

  private calculateSafetyScore(
    violations: ISafetyViolation[],
    escalations: IHumanEscalationRequest[]
  ): number {
    let score = 100;

    for (const v of violations) {
      score -= v.severity === 'critical' ? 15 : v.severity === 'high' ? 10 : 5;
    }

    for (const e of escalations) {
      if (e.status !== 'resolved') {
        score -= e.urgency === 'emergency' ? 20 : 10;
      }
    }

    return Math.max(0, score);
  }

  private identifyImprovementAreas(violations: ISafetyViolation[]): string[] {
    const areas: Set<string> = new Set();

    for (const v of violations) {
      if (v.invariantId.includes('DIAG')) areas.add('Clinical boundaries');
      if (v.invariantId.includes('CRISIS')) areas.add('Crisis response');
      if (v.invariantId.includes('MINOR')) areas.add('Minor protection');
      if (v.invariantId.includes('PRIN')) areas.add('Constitutional compliance');
    }

    return Array.from(areas);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get safety statistics
   */
  getStatistics(): {
    totalEvents: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    escalationStats: ReturnType<HumanEscalationService['getStatistics']>;
    invariantStats: ReturnType<SafetyInvariantService['getStatistics']>;
    circuitBreakerStatus: boolean;
  } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const event of this.eventLog) {
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    return {
      totalEvents: this.eventLog.length,
      bySeverity,
      byType,
      escalationStats: this.humanEscalation.getStatistics(),
      invariantStats: this.invariantService.getStatistics(),
      circuitBreakerStatus: this.circuitBreakerTriggered,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const safetyMonitorService = new SafetyMonitorService();
