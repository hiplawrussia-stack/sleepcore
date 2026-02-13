/**
 * 🤖 AI DISCLOSURE SERVICE
 * =========================
 * Implements mandatory AI disclosure notifications per NY AI Companion Law
 * and CA SB-243 requirements (effective 2025-2026).
 *
 * Legal Requirements:
 * - NY Law (Nov 5, 2025): Disclosure at start + every 3 hours
 * - CA SB-243 (Jan 1, 2026): Disclosure at interaction start + every 3 hours for minors
 *
 * Features:
 * - Tracks last disclosure timestamp per user
 * - Auto-triggers disclosure after 3-hour threshold
 * - Bilingual support (Russian/English)
 * - Audit logging for compliance verification
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Disclosure interval in milliseconds (3 hours)
 * Per NY AI Companion Law § 899-aa
 */
export const DISCLOSURE_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Disclosure interval in hours (for display)
 */
export const DISCLOSURE_INTERVAL_HOURS = 3;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AI Disclosure event for audit trail
 */
export interface IAIDisclosureEvent {
  readonly userId: string;
  readonly chatId: string;
  readonly timestamp: Date;
  readonly disclosureType: 'initial' | 'periodic' | 'manual';
  readonly language: 'ru' | 'en';
  readonly reason: string;
}

/**
 * Service configuration
 */
export interface IAIDisclosureConfig {
  /**
   * Interval between disclosures in milliseconds
   * @default 10800000 (3 hours)
   */
  readonly intervalMs: number;

  /**
   * Log all disclosure events
   * @default true
   */
  readonly logAllEvents: boolean;

  /**
   * Default language for disclosures
   * @default 'ru'
   */
  readonly defaultLanguage: 'ru' | 'en';
}

/**
 * Result of disclosure check
 */
export interface IDisclosureCheckResult {
  readonly shouldDisclose: boolean;
  readonly message: string | null;
  readonly reason: 'initial' | 'periodic' | 'not_needed';
  readonly timeSinceLastMs: number | null;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_AI_DISCLOSURE_CONFIG: IAIDisclosureConfig = {
  intervalMs: DISCLOSURE_INTERVAL_MS,
  logAllEvents: true,
  defaultLanguage: 'ru',
};

// ============================================================================
// DISCLOSURE MESSAGES
// ============================================================================

/**
 * AI disclosure messages
 * Compliant with NY Law § 899-aa notification requirements
 */
const DISCLOSURE_MESSAGES = {
  ru: {
    initial: `🤖 <b>Важное уведомление</b>

Вы общаетесь с SleepCore — AI-ассистентом для улучшения сна.

Это <b>искусственный интеллект</b>, а не живой человек. SleepCore использует доказательные методы когнитивно-поведенческой терапии (CBT-I), но не заменяет консультацию врача.

При кризисных состояниях звоните: 📞 8-800-2000-122`,

    periodic: `🤖 <i>Напоминание: вы общаетесь с AI-ассистентом SleepCore, а не с человеком.</i>

При необходимости профессиональной помощи: 📞 8-800-2000-122`,
  },

  en: {
    initial: `🤖 <b>Important Notice</b>

You are interacting with SleepCore — an AI assistant for sleep improvement.

This is <b>artificial intelligence</b>, not a human. SleepCore uses evidence-based Cognitive Behavioral Therapy for Insomnia (CBT-I) methods, but does not replace medical consultation.

In case of crisis: 📞 988 Suicide & Crisis Lifeline`,

    periodic: `🤖 <i>Reminder: you are interacting with SleepCore AI assistant, not a human.</i>

For professional help: 📞 988 Suicide & Crisis Lifeline`,
  },
};

// ============================================================================
// AI DISCLOSURE SERVICE
// ============================================================================

/**
 * AI Disclosure Service
 * Manages mandatory AI identity disclosures per NY/CA regulations
 */
export class AIDisclosureService {
  private readonly config: IAIDisclosureConfig;
  private readonly events: IAIDisclosureEvent[] = [];

  constructor(config: Partial<IAIDisclosureConfig> = {}) {
    this.config = { ...DEFAULT_AI_DISCLOSURE_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN API
  // ==========================================================================

  /**
   * Check if disclosure is needed based on last disclosure time
   *
   * @param lastDisclosureAt - Timestamp of last disclosure (null if never disclosed)
   * @param language - User's language preference
   * @returns Check result with message if disclosure needed
   */
  checkDisclosure(
    lastDisclosureAt: Date | null,
    language: 'ru' | 'en' = this.config.defaultLanguage
  ): IDisclosureCheckResult {
    const now = Date.now();

    // Initial disclosure (never disclosed before)
    if (!lastDisclosureAt) {
      return {
        shouldDisclose: true,
        message: DISCLOSURE_MESSAGES[language].initial,
        reason: 'initial',
        timeSinceLastMs: null,
      };
    }

    // Calculate time since last disclosure
    const timeSinceLastMs = now - lastDisclosureAt.getTime();

    // Periodic disclosure (3 hours passed)
    if (timeSinceLastMs >= this.config.intervalMs) {
      return {
        shouldDisclose: true,
        message: DISCLOSURE_MESSAGES[language].periodic,
        reason: 'periodic',
        timeSinceLastMs,
      };
    }

    // No disclosure needed
    return {
      shouldDisclose: false,
      message: null,
      reason: 'not_needed',
      timeSinceLastMs,
    };
  }

  /**
   * Get disclosure message for manual triggering
   *
   * @param type - Type of disclosure (initial or periodic)
   * @param language - Language for message
   */
  getDisclosureMessage(
    type: 'initial' | 'periodic',
    language: 'ru' | 'en' = this.config.defaultLanguage
  ): string {
    return DISCLOSURE_MESSAGES[language][type];
  }

  /**
   * Record disclosure event for audit trail
   *
   * @param userId - User identifier
   * @param chatId - Chat identifier
   * @param type - Type of disclosure
   * @param language - Language used
   */
  recordDisclosure(
    userId: string,
    chatId: string,
    type: 'initial' | 'periodic' | 'manual',
    language: 'ru' | 'en'
  ): IAIDisclosureEvent {
    const event: IAIDisclosureEvent = {
      userId,
      chatId,
      timestamp: new Date(),
      disclosureType: type,
      language,
      reason: type === 'initial'
        ? 'First interaction - NY Law § 899-aa'
        : type === 'periodic'
          ? '3-hour interval - NY Law § 899-aa'
          : 'User-requested disclosure',
    };

    if (this.config.logAllEvents) {
      this.logEvent(event);
    }

    return event;
  }

  /**
   * Calculate time until next required disclosure
   *
   * @param lastDisclosureAt - Timestamp of last disclosure
   * @returns Milliseconds until next disclosure, or 0 if due now
   */
  getTimeUntilNextDisclosure(lastDisclosureAt: Date | null): number {
    if (!lastDisclosureAt) {
      return 0; // Due now
    }

    const elapsed = Date.now() - lastDisclosureAt.getTime();
    const remaining = this.config.intervalMs - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Format time until next disclosure for display
   *
   * @param lastDisclosureAt - Timestamp of last disclosure
   * @param language - Language for formatting
   */
  formatTimeUntilNext(
    lastDisclosureAt: Date | null,
    language: 'ru' | 'en' = 'ru'
  ): string {
    const ms = this.getTimeUntilNextDisclosure(lastDisclosureAt);

    if (ms === 0) {
      return language === 'ru' ? 'сейчас' : 'now';
    }

    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (language === 'ru') {
      if (hours > 0) {
        return `${hours} ч ${minutes} мин`;
      }
      return `${minutes} мин`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // ==========================================================================
  // AUDIT & COMPLIANCE
  // ==========================================================================

  /**
   * Get all disclosure events
   */
  getEvents(): readonly IAIDisclosureEvent[] {
    return [...this.events];
  }

  /**
   * Get events for specific user
   */
  getUserEvents(userId: string): IAIDisclosureEvent[] {
    return this.events.filter(e => e.userId === userId);
  }

  /**
   * Get events in date range (for compliance reporting)
   */
  getEventsInRange(startDate: Date, endDate: Date): IAIDisclosureEvent[] {
    return this.events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );
  }

  /**
   * Get disclosure count for reporting
   */
  getDisclosureCount(): {
    total: number;
    initial: number;
    periodic: number;
    manual: number;
  } {
    return {
      total: this.events.length,
      initial: this.events.filter(e => e.disclosureType === 'initial').length,
      periodic: this.events.filter(e => e.disclosureType === 'periodic').length,
      manual: this.events.filter(e => e.disclosureType === 'manual').length,
    };
  }

  /**
   * Clear old events (for memory management)
   */
  clearOldEvents(daysToKeep: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const initialCount = this.events.length;
    const filtered = this.events.filter(e => e.timestamp >= cutoff);

    this.events.length = 0;
    this.events.push(...filtered);

    return initialCount - this.events.length;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Log disclosure event
   */
  private logEvent(event: IAIDisclosureEvent): void {
    this.events.push(event);

    console.log('[AIDisclosure] Event recorded:', {
      userId: event.userId,
      type: event.disclosureType,
      language: event.language,
      timestamp: event.timestamp.toISOString(),
    });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create AI disclosure service with optional configuration
 */
export function createAIDisclosureService(
  config?: Partial<IAIDisclosureConfig>
): AIDisclosureService {
  return new AIDisclosureService(config);
}

/**
 * Default AI disclosure service instance
 */
export const aiDisclosureService = createAIDisclosureService();
