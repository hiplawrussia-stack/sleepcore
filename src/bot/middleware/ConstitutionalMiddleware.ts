/**
 * Constitutional AI Middleware for Grammy
 * ========================================
 * Implements constitutional guardrails for healthcare chatbot safety.
 *
 * Research basis (2025-2026):
 * - Constitutional AI (Anthropic) - self-assessment against principles (HIGH confidence)
 * - Healthcare chatbots require safety guardrails (FDA guidance)
 * - Crisis detection integration for mental health apps
 * - Rule-based filtering before ML-based classification
 *
 * Key principles (Constitution):
 * 1. SAFETY - Never provide harmful advice
 * 2. CLINICAL - Stay within evidence-based guidance
 * 3. EMPATHY - Respond with compassion
 * 4. BOUNDARIES - Refer to professionals when needed
 * 5. PRIVACY - Protect patient data
 *
 * @packageDocumentation
 * @module @sleepcore/bot/middleware
 */

import type { Context, NextFunction } from 'grammy';
import {
  crisisDetectionService,
  type CrisisAction,
  type ICrisisEvent,
} from '../services/CrisisDetectionService';

// ==================== Constitutional Principles ====================

/**
 * Constitutional principle types
 */
export type ConstitutionalPrinciple =
  | 'safety'
  | 'clinical'
  | 'empathy'
  | 'boundaries'
  | 'privacy';

/**
 * Constitutional violation severity
 */
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Constitutional check result
 */
export interface IConstitutionalCheck {
  /** Whether content passes all checks */
  passed: boolean;

  /** Violated principles (if any) */
  violations: Array<{
    principle: ConstitutionalPrinciple;
    severity: ViolationSeverity;
    reason: string;
    reasonRu: string;
  }>;

  /** Suggested action */
  action: 'allow' | 'modify' | 'block' | 'escalate';

  /** Modified content (if action is 'modify') */
  modifiedContent?: string;

  /** Crisis event (if detected) */
  crisisEvent?: ICrisisEvent;
}

/**
 * Constitutional AI configuration
 */
export interface IConstitutionalConfig {
  /** Enable crisis detection */
  enableCrisisDetection: boolean;

  /** Enable clinical boundary checking */
  enableClinicalBoundaries: boolean;

  /** Enable privacy protection */
  enablePrivacyProtection: boolean;

  /** Blocked topics (hard rules) */
  blockedTopics: string[];

  /** Warning topics (soft rules) */
  warningTopics: string[];

  /** Maximum message length */
  maxMessageLength: number;

  /** Enable response validation */
  validateResponses: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONSTITUTIONAL_CONFIG: IConstitutionalConfig = {
  enableCrisisDetection: true,
  enableClinicalBoundaries: true,
  enablePrivacyProtection: true,
  blockedTopics: [
    'suicide methods',
    'self-harm instructions',
    'medication dosages',
    'drug interactions',
    'diagnosis',
  ],
  warningTopics: [
    'suicidal ideation',
    'self-harm',
    'severe depression',
    'medication questions',
    'professional treatment',
  ],
  maxMessageLength: 4000,
  validateResponses: true,
};

// ==================== Pattern Matching ====================

/**
 * Crisis patterns for detection (Russian and English)
 */
const CRISIS_PATTERNS = {
  suicidalIdeation: [
    /\b(хочу|хотел|хотела)\s+(умереть|покончить|убить себя)/i,
    /\b(не хочу|не вижу смысла)\s+(жить|просыпаться)/i,
    /\bсуицид/i,
    /\bпокончить с собой/i,
    /\bсамоубий/i,
    /\bwant to (die|end it|kill myself)/i,
    /\bsuicid/i,
    /\bno reason to live/i,
  ],
  selfHarm: [
    /\b(режу|порезы|порезать)\s*(себя)?/i,
    /\bселфхарм/i,
    /\bself[- ]?harm/i,
    /\bcutting myself/i,
  ],
  severeDistress: [
    /\bне могу больше (так|терпеть|жить)/i,
    /\bневыносим/i,
    /\bотчаян/i,
    /\bcannot (take|bear) it/i,
    /\bdesperate/i,
  ],
};

/**
 * Clinical boundary patterns
 */
const CLINICAL_BOUNDARY_PATTERNS = {
  diagnosisRequest: [
    /\bу меня (есть |).*(бессонница|депрессия|тревог|апноэ)/i,
    /\bдиагноз/i,
    /\bdo i have (insomnia|depression|anxiety|apnea)/i,
    /\bdiagnos/i,
  ],
  medicationAdvice: [
    /\b(какие|какое)\s*(лекарств|таблетк|снотворн)/i,
    /\b(принимать|пить)\s*(мелатонин|снотворн)/i,
    /\bwhat (medication|pills|drugs)/i,
    /\bshould i take/i,
  ],
  emergencySymptoms: [
    /\bне сплю\s*\d+\s*(дней|суток|ночей)/i,
    /\bгаллюцинац/i,
    /\bне спал (неделю|5|6|7)/i,
    /\bhaven't slept for \d+ days/i,
    /\bhallucin/i,
  ],
};

/**
 * Privacy patterns to redact
 */
const PRIVACY_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Card numbers
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN-like
];

// ==================== Constitutional Middleware ====================

/**
 * Constitutional AI Middleware Service
 *
 * Provides safety guardrails for healthcare chatbot using
 * constitutional principles and rule-based + ML classification.
 */
export class ConstitutionalMiddleware {
  private config: IConstitutionalConfig;

  constructor(config: Partial<IConstitutionalConfig> = {}) {
    this.config = { ...DEFAULT_CONSTITUTIONAL_CONFIG, ...config };
  }

  // ==================== Grammy Middleware ====================

  /**
   * Grammy middleware function
   * Use with bot.use(constitutionalMiddleware.middleware())
   */
  middleware() {
    return async (ctx: Context, next: NextFunction): Promise<void> => {
      // Check incoming message
      const messageText = ctx.message?.text;
      if (messageText) {
        const check = await this.checkIncomingMessage(messageText, ctx.from?.id?.toString() || 'unknown');

        // Store check result in context for downstream handlers
        (ctx as any).constitutionalCheck = check;

        // Handle based on action
        if (check.action === 'block') {
          await ctx.reply(this.getBlockedMessageResponse(check));
          return; // Don't continue to next middleware
        }

        if (check.action === 'escalate' && check.crisisEvent) {
          // Crisis detected - escalate immediately
          await this.handleCrisisEscalation(ctx, check);
          // Continue to allow crisis response handler to take over
        }
      }

      // Continue to next middleware
      await next();
    };
  }

  // ==================== Input Validation ====================

  /**
   * Check incoming user message against constitutional principles
   */
  async checkIncomingMessage(
    text: string,
    userId: string
  ): Promise<IConstitutionalCheck> {
    const violations: IConstitutionalCheck['violations'] = [];
    let action: IConstitutionalCheck['action'] = 'allow';
    let crisisEvent: ICrisisEvent | undefined;

    // 1. Crisis Detection (SAFETY principle)
    if (this.config.enableCrisisDetection) {
      const crisisCheck = await this.checkForCrisis(text, userId);
      if (crisisCheck.detected) {
        crisisEvent = crisisCheck.event;
        violations.push({
          principle: 'safety',
          severity: crisisCheck.severity,
          reason: crisisCheck.reason,
          reasonRu: crisisCheck.reasonRu,
        });

        if (crisisCheck.severity === 'critical' || crisisCheck.severity === 'high') {
          action = 'escalate';
        }
      }
    }

    // 2. Clinical Boundaries (CLINICAL + BOUNDARIES principles)
    if (this.config.enableClinicalBoundaries) {
      const boundaryCheck = this.checkClinicalBoundaries(text);
      for (const violation of boundaryCheck.violations) {
        violations.push(violation);
        if (violation.severity === 'high' && action !== 'escalate') {
          action = 'modify';
        }
      }
    }

    // 3. Privacy Protection (PRIVACY principle)
    if (this.config.enablePrivacyProtection) {
      const privacyCheck = this.checkPrivacy(text);
      if (privacyCheck.containsSensitive) {
        violations.push({
          principle: 'privacy',
          severity: 'medium',
          reason: 'Message contains potentially sensitive personal information',
          reasonRu: 'Сообщение содержит потенциально конфиденциальную информацию',
        });
      }
    }

    // 4. Blocked Topics
    for (const topic of this.config.blockedTopics) {
      if (text.toLowerCase().includes(topic.toLowerCase())) {
        violations.push({
          principle: 'clinical',
          severity: 'high',
          reason: `Blocked topic detected: ${topic}`,
          reasonRu: `Обнаружена заблокированная тема: ${topic}`,
        });
        action = 'block';
        break;
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      action,
      crisisEvent,
    };
  }

  // ==================== Response Validation ====================

  /**
   * Validate bot response against constitutional principles
   * Call this before sending a response
   */
  validateResponse(responseText: string): IConstitutionalCheck {
    const violations: IConstitutionalCheck['violations'] = [];
    let modifiedContent = responseText;

    // Check for harmful advice patterns
    const harmfulPatterns = [
      { pattern: /\bпринимай(те)?\s+\d+\s*(мг|таблет)/i, topic: 'medication dosage' },
      { pattern: /\btake\s+\d+\s*(mg|pills|tablets)/i, topic: 'medication dosage' },
      { pattern: /\bу вас\s+(есть |)(бессонница|депрессия|апноэ)/i, topic: 'diagnosis' },
      { pattern: /\byou have (insomnia|depression|apnea)/i, topic: 'diagnosis' },
    ];

    for (const { pattern, topic } of harmfulPatterns) {
      if (pattern.test(responseText)) {
        violations.push({
          principle: 'clinical',
          severity: 'high',
          reason: `Response contains ${topic}`,
          reasonRu: `Ответ содержит ${topic}`,
        });
      }
    }

    // Check length
    if (responseText.length > this.config.maxMessageLength) {
      modifiedContent = responseText.slice(0, this.config.maxMessageLength - 3) + '...';
      violations.push({
        principle: 'boundaries',
        severity: 'low',
        reason: 'Response truncated due to length',
        reasonRu: 'Ответ сокращён из-за длины',
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
      violations,
      action: violations.some(v => v.severity === 'high') ? 'modify' : 'allow',
      modifiedContent: modifiedContent !== responseText ? modifiedContent : undefined,
    };
  }

  // ==================== Crisis Detection ====================

  /**
   * Check message for crisis signals
   */
  private async checkForCrisis(
    text: string,
    userId: string
  ): Promise<{
    detected: boolean;
    severity: ViolationSeverity;
    reason: string;
    reasonRu: string;
    event?: ICrisisEvent;
  }> {
    // Use existing CrisisDetectionService
    try {
      const crisisResult = crisisDetectionService.analyzeMessage(text, userId, '0');

      if (crisisResult.shouldInterrupt || crisisResult.action !== 'continue') {
        const severityMap: Record<CrisisAction, ViolationSeverity> = {
          'continue': 'low',
          'monitor': 'low',
          'supportive': 'medium',
          'interrupt': 'high',
          'emergency': 'critical',
        };

        return {
          detected: true,
          severity: severityMap[crisisResult.action] || 'medium',
          reason: `Crisis detected: ${crisisResult.severity}`,
          reasonRu: `Обнаружен кризис: ${this.getCrisisSeverityRu(crisisResult.severity)}`,
          event: crisisResult.event,
        };
      }
    } catch {
      // Fallback to pattern matching if service fails
      for (const [type, patterns] of Object.entries(CRISIS_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(text)) {
            return {
              detected: true,
              severity: type === 'suicidalIdeation' ? 'critical' : 'high',
              reason: `Crisis pattern matched: ${type}`,
              reasonRu: `Обнаружен паттерн кризиса: ${this.getCrisisTypeRu(type)}`,
            };
          }
        }
      }
    }

    return {
      detected: false,
      severity: 'low',
      reason: '',
      reasonRu: '',
    };
  }

  /**
   * Get Russian translation for crisis type
   */
  private getCrisisTypeRu(type: string): string {
    const translations: Record<string, string> = {
      suicidalIdeation: 'суицидальные мысли',
      selfHarm: 'самоповреждение',
      severeDistress: 'острый дистресс',
      suicidal_ideation: 'суицидальные мысли',
      self_harm: 'самоповреждение',
      severe_distress: 'острый дистресс',
    };
    return translations[type] || type;
  }

  private getCrisisSeverityRu(severity: string): string {
    const translations: Record<string, string> = {
      none: 'нет',
      low: 'низкий',
      moderate: 'умеренный',
      high: 'высокий',
      critical: 'критический',
    };
    return translations[severity] || severity;
  }

  // ==================== Clinical Boundaries ====================

  /**
   * Check for clinical boundary violations
   */
  private checkClinicalBoundaries(text: string): {
    violations: IConstitutionalCheck['violations'];
  } {
    const violations: IConstitutionalCheck['violations'] = [];

    // Check diagnosis requests
    for (const pattern of CLINICAL_BOUNDARY_PATTERNS.diagnosisRequest) {
      if (pattern.test(text)) {
        violations.push({
          principle: 'boundaries',
          severity: 'medium',
          reason: 'User may be seeking diagnosis',
          reasonRu: 'Пользователь может искать диагноз',
        });
        break;
      }
    }

    // Check medication advice requests
    for (const pattern of CLINICAL_BOUNDARY_PATTERNS.medicationAdvice) {
      if (pattern.test(text)) {
        violations.push({
          principle: 'clinical',
          severity: 'high',
          reason: 'User seeking medication advice',
          reasonRu: 'Пользователь ищет совет по лекарствам',
        });
        break;
      }
    }

    // Check emergency symptoms
    for (const pattern of CLINICAL_BOUNDARY_PATTERNS.emergencySymptoms) {
      if (pattern.test(text)) {
        violations.push({
          principle: 'safety',
          severity: 'high',
          reason: 'User reporting emergency symptoms',
          reasonRu: 'Пользователь сообщает об экстренных симптомах',
        });
        break;
      }
    }

    return { violations };
  }

  // ==================== Privacy Protection ====================

  /**
   * Check for and redact sensitive information
   */
  private checkPrivacy(text: string): {
    containsSensitive: boolean;
    redactedText: string;
  } {
    let redactedText = text;
    let containsSensitive = false;

    for (const pattern of PRIVACY_PATTERNS) {
      if (pattern.test(text)) {
        containsSensitive = true;
        redactedText = redactedText.replace(pattern, '[REDACTED]');
      }
    }

    return { containsSensitive, redactedText };
  }

  // ==================== Crisis Escalation ====================

  /**
   * Handle crisis escalation
   */
  private async handleCrisisEscalation(
    ctx: Context,
    check: IConstitutionalCheck
  ): Promise<void> {
    // Log crisis for monitoring
    console.warn('[ConstitutionalMiddleware] Crisis detected:', {
      userId: ctx.from?.id,
      timestamp: new Date().toISOString(),
      severity: check.violations[0]?.severity,
    });

    // Send immediate support message
    await ctx.reply(this.getCrisisSupportMessage(check));
  }

  /**
   * Get crisis support message
   */
  private getCrisisSupportMessage(check: IConstitutionalCheck): string {
    const severity = check.violations[0]?.severity;

    if (severity === 'critical') {
      return `
Я вижу, что тебе сейчас очень тяжело.

Если ты думаешь о том, чтобы причинить себе вред, пожалуйста, свяжись со службой помощи:

📞 Телефон доверия: 8-800-2000-122 (бесплатно)
📞 Экстренная психологическая помощь: 051

Ты не один(а). Помощь доступна прямо сейчас.
      `.trim();
    }

    return `
Я слышу, что тебе непросто.

Если тебе нужна поддержка, ты можешь:
• Позвонить на телефон доверия: 8-800-2000-122
• Написать мне о своих переживаниях
• Обратиться к психологу

Я здесь, чтобы помочь.
    `.trim();
  }

  /**
   * Get blocked message response
   */
  private getBlockedMessageResponse(_check: IConstitutionalCheck): string {
    return `
К сожалению, я не могу ответить на этот вопрос.

Для получения медицинских консультаций, включая вопросы о лекарствах и диагнозах, пожалуйста, обратитесь к врачу.

Я могу помочь с:
• Ведением дневника сна (/diary)
• Техниками релаксации (/relax)
• Отслеживанием прогресса (/progress)
    `.trim();
  }
}

// ==================== Factory & Singleton ====================

/**
 * Create Constitutional Middleware instance
 */
export function createConstitutionalMiddleware(
  config?: Partial<IConstitutionalConfig>
): ConstitutionalMiddleware {
  return new ConstitutionalMiddleware(config);
}

/**
 * Default singleton instance
 */
export const constitutionalMiddleware = createConstitutionalMiddleware();
