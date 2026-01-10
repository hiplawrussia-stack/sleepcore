/**
 * 🚨 CRISIS DETECTION SERVICE
 * ============================
 * Integrates CogniCore Engine's multi-layer crisis detection into SleepCore.
 *
 * Scientific Foundation (2025 Research):
 * - Multi-layer detection pattern (AI UX Design Guide, 2025)
 * - C-SSRS inspired severity levels (Columbia Protocol)
 * - Scientific Reports Aug 2025: 29 AI chatbots tested for suicide scenarios
 * - Frontiers in Psychiatry Aug 2025: LLM-based safety guardrails
 *
 * Features:
 * - 3-layer crisis detection (keywords, patterns, state-based)
 * - Bilingual support (Russian + English)
 * - Automatic session interruption for critical severity
 * - Escalation protocol with crisis resources
 * - Audit logging for clinical compliance
 *
 * ICH E6(R3) Compliance:
 * - Real-time safety monitoring
 * - Immediate escalation for SAEs
 * - Audit trail for all detections
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import {
  CrisisDetector,
  createCrisisDetector,
  CrisisDetectionResult,
  CrisisSeverity,
  CrisisType,
  CrisisDetectorConfig,
  StateRiskData,
} from '@cognicore/engine';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Crisis response action
 */
export type CrisisAction =
  | 'continue'           // No crisis, continue normal flow
  | 'monitor'            // Low severity, log and monitor
  | 'supportive'         // Moderate severity, provide support
  | 'interrupt'          // High severity, interrupt session
  | 'emergency';         // Critical severity, emergency protocol

/**
 * Crisis detection event for logging
 */
export interface ICrisisEvent {
  readonly userId: string;
  readonly chatId: string;
  readonly timestamp: Date;
  readonly severity: CrisisSeverity;
  readonly crisisType: CrisisType;
  readonly confidence: number;
  readonly action: CrisisAction;
  readonly messageText: string;
  readonly indicators: string[];
  readonly responseProvided: boolean;
}

/**
 * Crisis response result
 */
export interface ICrisisResponse {
  readonly shouldInterrupt: boolean;
  readonly action: CrisisAction;
  readonly message: string;
  readonly resources: string[];
  readonly severity: CrisisSeverity;
  readonly event: ICrisisEvent;
}

/**
 * Service configuration
 */
export interface ICrisisDetectionServiceConfig {
  readonly enabled: boolean;
  readonly sensitivityLevel: 'low' | 'medium' | 'high';
  readonly language: 'ru' | 'en' | 'auto';
  readonly logAllDetections: boolean;
  readonly notifyOnHighSeverity: boolean;
  readonly adminUserIds: string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CRISIS_SERVICE_CONFIG: ICrisisDetectionServiceConfig = {
  enabled: true,
  sensitivityLevel: 'high',
  language: 'auto',
  logAllDetections: true,
  notifyOnHighSeverity: true,
  adminUserIds: [],
};

// ============================================================================
// CRISIS RESPONSE MESSAGES
// ============================================================================

const CRISIS_MESSAGES = {
  ru: {
    critical: `🚨 <b>Мы очень беспокоимся о тебе</b>

Я заметил, что тебе сейчас очень тяжело. Твоя безопасность — самое важное.

Пожалуйста, свяжись прямо сейчас с кризисной службой:

📞 <b>Телефон доверия: 8-800-2000-122</b> (бесплатно, круглосуточно)
📞 Центр экстренной психологической помощи МЧС: 8-499-216-50-50

Если ты в непосредственной опасности, позвони 112.

Ты не один(а). Помощь доступна прямо сейчас. 💙`,

    high: `💙 <b>Я слышу, что тебе сейчас очень тяжело</b>

Твои чувства важны, и я рядом.

Если тебе нужна поддержка прямо сейчас:
📞 <b>Телефон доверия: 8-800-2000-122</b> (бесплатно)

Хочешь поговорить о том, что происходит? Я здесь, чтобы выслушать.`,

    moderate: `💙 Я заметил, что тебе сейчас нелегко.

Помни: ты не один(а), и твои чувства важны.

Если хочешь поговорить — я здесь. А если нужна профессиональная поддержка:
📞 Телефон доверия: 8-800-2000-122`,

    low: `Я здесь, если тебе нужна поддержка. 💙`,
  },

  en: {
    critical: `🚨 <b>We're very concerned about you</b>

I noticed you're going through an extremely difficult time. Your safety is the most important thing.

Please reach out to a crisis service right now:

📞 <b>National Suicide Prevention Lifeline: 988</b>
📱 Crisis Text Line: Text HOME to 741741

If you're in immediate danger, call 911.

You're not alone. Help is available right now. 💙`,

    high: `💙 <b>I hear that you're going through a really hard time</b>

Your feelings matter, and I'm here for you.

If you need support right now:
📞 <b>988 Suicide & Crisis Lifeline</b>

Would you like to talk about what's happening? I'm here to listen.`,

    moderate: `💙 I noticed you're having a tough time.

Remember: you're not alone, and your feelings are valid.

I'm here if you want to talk. And if you need professional support:
📞 988 Suicide & Crisis Lifeline`,

    low: `I'm here if you need support. 💙`,
  },
};

// ============================================================================
// CRISIS DETECTION SERVICE
// ============================================================================

/**
 * Crisis Detection Service
 * Wraps CogniCore Engine's CrisisDetector for SleepCore integration
 */
export class CrisisDetectionService {
  private readonly detector: CrisisDetector;
  private readonly config: ICrisisDetectionServiceConfig;
  private readonly events: ICrisisEvent[] = [];

  constructor(config: Partial<ICrisisDetectionServiceConfig> = {}) {
    this.config = { ...DEFAULT_CRISIS_SERVICE_CONFIG, ...config };

    // Create CrisisDetector with matching config
    const detectorConfig: Partial<CrisisDetectorConfig> = {
      enableLayer1: true,
      enableLayer2: true,
      enableLayer3: true,
      sensitivityLevel: this.config.sensitivityLevel,
      language: this.config.language,
    };

    this.detector = createCrisisDetector(detectorConfig);
  }

  // ==========================================================================
  // MAIN API
  // ==========================================================================

  /**
   * Analyze message for crisis indicators
   * This should be called BEFORE any other message processing
   *
   * @param text - User message text
   * @param userId - User identifier
   * @param chatId - Chat identifier
   * @param stateRiskData - Optional state-based risk data
   * @returns Crisis response with action and message
   */
  analyzeMessage(
    text: string,
    userId: string,
    chatId: string,
    stateRiskData?: StateRiskData
  ): ICrisisResponse {
    if (!this.config.enabled) {
      return this.createContinueResponse(userId, chatId, text);
    }

    // Run crisis detection
    const result = this.detector.detect(text, stateRiskData);

    // Determine action based on severity
    const action = this.determineAction(result);

    // Detect language for response
    const language = this.detectLanguage(text);

    // Get appropriate message
    const message = this.getResponseMessage(result.severity, language);
    const resources = this.detector.getCrisisResources(language);

    // Create event for logging
    const event = this.createEvent(userId, chatId, text, result, action);

    // Log event if configured
    if (this.config.logAllDetections || action !== 'continue') {
      this.logEvent(event);
    }

    return {
      shouldInterrupt: action === 'interrupt' || action === 'emergency',
      action,
      message,
      resources,
      severity: result.severity,
      event,
    };
  }

  /**
   * Quick check for crisis indicators
   * Use for fast pre-screening before full analysis
   */
  quickCheck(text: string): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return this.detector.quickCheck(text);
  }

  /**
   * Get crisis resources for user
   */
  getCrisisResources(language: 'ru' | 'en' = 'ru'): string[] {
    return this.detector.getCrisisResources(language);
  }

  /**
   * Get all logged crisis events
   */
  getEvents(): readonly ICrisisEvent[] {
    return [...this.events];
  }

  /**
   * Get events for specific user
   */
  getUserEvents(userId: string): ICrisisEvent[] {
    return this.events.filter(e => e.userId === userId);
  }

  /**
   * Get high severity events (for admin dashboard)
   */
  getHighSeverityEvents(): ICrisisEvent[] {
    return this.events.filter(
      e => e.severity === 'high' || e.severity === 'critical'
    );
  }

  /**
   * Get events in date range
   */
  getEventsInRange(startDate: Date, endDate: Date): ICrisisEvent[] {
    return this.events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );
  }

  /**
   * Clear events older than specified days
   */
  clearOldEvents(daysToKeep: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const initialCount = this.events.length;
    const filtered = this.events.filter(e => e.timestamp >= cutoff);

    // Replace array contents
    this.events.length = 0;
    this.events.push(...filtered);

    return initialCount - this.events.length;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Determine action based on detection result
   */
  private determineAction(result: CrisisDetectionResult): CrisisAction {
    if (!result.isCrisis) {
      if (result.severity === 'low') {
        return 'monitor';
      }
      return 'continue';
    }

    switch (result.severity) {
      case 'critical':
        return 'emergency';
      case 'high':
        return 'interrupt';
      case 'moderate':
        return 'supportive';
      case 'low':
        return 'monitor';
      default:
        return 'continue';
    }
  }

  /**
   * Get response message based on severity
   */
  private getResponseMessage(severity: CrisisSeverity, language: 'ru' | 'en'): string {
    const messages = CRISIS_MESSAGES[language];

    switch (severity) {
      case 'critical':
        return messages.critical;
      case 'high':
        return messages.high;
      case 'moderate':
        return messages.moderate;
      case 'low':
        return messages.low;
      default:
        return '';
    }
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): 'ru' | 'en' {
    if (this.config.language !== 'auto') {
      return this.config.language === 'ru' ? 'ru' : 'en';
    }

    // Simple heuristic: check for Cyrillic characters
    const cyrillicPattern = /[а-яё]/i;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
  }

  /**
   * Create crisis event for logging
   */
  private createEvent(
    userId: string,
    chatId: string,
    text: string,
    result: CrisisDetectionResult,
    action: CrisisAction
  ): ICrisisEvent {
    return {
      userId,
      chatId,
      timestamp: new Date(),
      severity: result.severity,
      crisisType: result.crisisType,
      confidence: result.confidence,
      action,
      messageText: this.sanitizeText(text),
      indicators: result.allIndicators,
      responseProvided: action !== 'continue',
    };
  }

  /**
   * Create continue response (no crisis detected)
   */
  private createContinueResponse(
    userId: string,
    chatId: string,
    text: string
  ): ICrisisResponse {
    const event: ICrisisEvent = {
      userId,
      chatId,
      timestamp: new Date(),
      severity: 'none',
      crisisType: 'unknown',
      confidence: 0,
      action: 'continue',
      messageText: '',
      indicators: [],
      responseProvided: false,
    };

    return {
      shouldInterrupt: false,
      action: 'continue',
      message: '',
      resources: [],
      severity: 'none',
      event,
    };
  }

  /**
   * Sanitize text for logging (limit length, remove PII patterns)
   */
  private sanitizeText(text: string): string {
    // Limit length
    const maxLength = 500;
    let sanitized = text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;

    // Remove potential phone numbers
    sanitized = sanitized.replace(/\+?\d{10,}/g, '[PHONE]');

    // Remove potential email addresses
    sanitized = sanitized.replace(/\S+@\S+\.\S+/g, '[EMAIL]');

    return sanitized;
  }

  /**
   * Log crisis event
   */
  private logEvent(event: ICrisisEvent): void {
    this.events.push(event);

    // Console log for monitoring
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn('[CrisisDetection] HIGH SEVERITY EVENT:', {
        userId: event.userId,
        severity: event.severity,
        crisisType: event.crisisType,
        confidence: event.confidence,
        action: event.action,
        timestamp: event.timestamp.toISOString(),
      });
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create crisis detection service with optional configuration
 */
export function createCrisisDetectionService(
  config?: Partial<ICrisisDetectionServiceConfig>
): CrisisDetectionService {
  return new CrisisDetectionService(config);
}

/**
 * Default crisis detection service instance
 */
export const crisisDetectionService = createCrisisDetectionService();
