/**
 * Sentry Service - Healthcare-Compliant Error Monitoring
 * ======================================================
 * Provides high-level API for error tracking and performance monitoring.
 *
 * Research (2025 Best Practices):
 * - Centralized error handling improves observability
 * - Structured logging correlates with Sentry events
 * - Healthcare: All user data anonymized before capture
 *
 * HIPAA Compliance:
 * - NO PHI (Protected Health Information) in error reports
 * - User IDs anonymized (hash, not raw Telegram ID)
 * - No email, phone, or medical data captured
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/monitoring/SentryService
 */

import * as Sentry from '@sentry/node';
import * as crypto from 'crypto';
import { IS_SENTRY_ENABLED, scrubSensitiveData } from './instrument';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Error severity levels for categorization
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error categories for routing and filtering
 */
export type ErrorCategory =
  | 'database'
  | 'telegram_api'
  | 'external_api'
  | 'business_logic'
  | 'validation'
  | 'authentication'
  | 'configuration'
  | 'unknown';

/**
 * Anonymized user context (no PII)
 */
export interface IAnonymizedUserContext {
  /** Hashed user ID (not raw Telegram ID) */
  anonymousId: string;
  /** Therapy week (0-8) - non-identifying */
  therapyWeek?: number;
  /** Has completed onboarding - non-identifying */
  hasCompletedOnboarding?: boolean;
  /** Session duration in minutes - non-identifying */
  sessionDurationMinutes?: number;
}

/**
 * Error context for enriched reporting
 */
export interface IErrorContext {
  /** Error category for filtering */
  category?: ErrorCategory;
  /** Additional tags for search */
  tags?: Record<string, string>;
  /** Extra context data (will be scrubbed) */
  extra?: Record<string, unknown>;
  /** User context (anonymized) */
  user?: IAnonymizedUserContext;
  /** Fingerprint for grouping similar errors */
  fingerprint?: string[];
}

/**
 * Performance span context
 */
export interface ISpanContext {
  /** Operation name */
  name: string;
  /** Operation type (e.g., 'db.query', 'http.request') */
  op: string;
  /** Additional attributes */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Alert configuration for critical errors
 */
export interface IAlertConfig {
  /** Callback for critical error notifications */
  onCriticalError?: (error: Error, context: IErrorContext) => void | Promise<void>;
  /** Callback for warning threshold exceeded */
  onWarningThreshold?: (count: number, timeWindowMinutes: number) => void | Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hash user ID for anonymization
 * Uses SHA-256 to create consistent but non-reversible ID
 */
function hashUserId(userId: string): string {
  const salt = process.env.SENTRY_USER_SALT || 'sleepcore-default-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${userId}`)
    .digest('hex')
    .substring(0, 16); // First 16 chars for shorter IDs
}

/**
 * Map error severity to Sentry severity level
 */
function mapSeverity(severity: ErrorSeverity): Sentry.SeverityLevel {
  const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
    fatal: 'fatal',
    error: 'error',
    warning: 'warning',
    info: 'info',
    debug: 'debug',
  };
  return mapping[severity] || 'error';
}

// ============================================================================
// SENTRY SERVICE CLASS
// ============================================================================

/**
 * Centralized Sentry Service for healthcare-compliant monitoring
 *
 * @example
 * ```typescript
 * const sentry = new SentryService();
 *
 * // Capture error with context
 * sentry.captureError(error, {
 *   category: 'database',
 *   user: { anonymousId: sentry.anonymizeUserId('123456') }
 * });
 *
 * // Track performance
 * const transaction = sentry.startTransaction('process-diary', 'task');
 * // ... do work
 * transaction.end();
 * ```
 */
export class SentryService {
  private readonly isEnabled: boolean;
  private alertConfig?: IAlertConfig;
  private errorCounts: Map<string, { count: number; firstSeen: Date }> = new Map();

  constructor(alertConfig?: IAlertConfig) {
    this.isEnabled = IS_SENTRY_ENABLED;
    this.alertConfig = alertConfig;
  }

  // ==========================================================================
  // USER CONTEXT
  // ==========================================================================

  /**
   * Anonymize user ID for HIPAA compliance
   * Returns a hashed, non-reversible identifier
   */
  anonymizeUserId(userId: string): string {
    return hashUserId(userId);
  }

  /**
   * Set anonymized user context for current scope
   * Call this at the start of request/command processing
   */
  setUserContext(user: IAnonymizedUserContext): void {
    if (!this.isEnabled) return;

    Sentry.setUser({
      id: user.anonymousId,
      // Note: No email, username, or IP address (HIPAA)
    });

    // Set non-PII user attributes as tags
    if (user.therapyWeek !== undefined) {
      Sentry.setTag('therapy_week', user.therapyWeek.toString());
    }
    if (user.hasCompletedOnboarding !== undefined) {
      Sentry.setTag('onboarding_complete', user.hasCompletedOnboarding.toString());
    }
  }

  /**
   * Clear user context (e.g., on logout or session end)
   */
  clearUserContext(): void {
    if (!this.isEnabled) return;
    Sentry.setUser(null);
  }

  // ==========================================================================
  // ERROR CAPTURE
  // ==========================================================================

  /**
   * Capture an error with enriched context
   *
   * @param error - The error to capture
   * @param context - Additional context for the error
   * @param severity - Error severity level
   */
  captureError(
    error: Error | string,
    context?: IErrorContext,
    severity: ErrorSeverity = 'error'
  ): string | undefined {
    // Always log to console
    console.error(`[SentryService] ${severity.toUpperCase()}:`, error);

    if (!this.isEnabled) {
      return undefined;
    }

    // Track error counts for alerting
    this.trackErrorCount(context?.category || 'unknown');

    // Prepare error instance
    const errorInstance = typeof error === 'string' ? new Error(error) : error;

    // Capture with Sentry
    const eventId = Sentry.withScope((scope) => {
      // Set severity
      scope.setLevel(mapSeverity(severity));

      // Set category tag
      if (context?.category) {
        scope.setTag('error_category', context.category);
      }

      // Set additional tags
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }

      // Set scrubbed extra context
      if (context?.extra) {
        const scrubbedExtra = scrubSensitiveData(context.extra) as Record<string, unknown>;
        scope.setExtras(scrubbedExtra);
      }

      // Set user context
      if (context?.user) {
        scope.setUser({
          id: context.user.anonymousId,
        });
      }

      // Set fingerprint for grouping
      if (context?.fingerprint) {
        scope.setFingerprint(context.fingerprint);
      }

      return Sentry.captureException(errorInstance);
    });

    // Trigger alert callback for critical errors
    if (severity === 'fatal' || severity === 'error') {
      this.triggerAlertIfNeeded(errorInstance, context);
    }

    return eventId;
  }

  /**
   * Capture a message (non-exception event)
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    context?: IErrorContext
  ): string | undefined {
    if (!this.isEnabled) {
      console.log(`[SentryService] ${severity.toUpperCase()}: ${message}`);
      return undefined;
    }

    return Sentry.withScope((scope) => {
      scope.setLevel(mapSeverity(severity));

      if (context?.category) {
        scope.setTag('error_category', context.category);
      }

      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }

      return Sentry.captureMessage(message);
    });
  }

  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================

  /**
   * Start a performance transaction
   * Use for tracking operation duration
   *
   * @example
   * ```typescript
   * const span = sentry.startSpan({ name: 'process-diary', op: 'task' });
   * // ... do work
   * span?.end();
   * ```
   */
  startSpan(context: ISpanContext): Sentry.Span | undefined {
    if (!this.isEnabled) return undefined;

    return Sentry.startInactiveSpan({
      name: context.name,
      op: context.op,
      attributes: context.attributes,
    });
  }

  /**
   * Wrap an async function with automatic performance tracking
   *
   * @example
   * ```typescript
   * const result = await sentry.traceAsync(
   *   'fetch-user-data',
   *   'db.query',
   *   async () => userRepository.findById(id)
   * );
   * ```
   */
  async traceAsync<T>(
    name: string,
    op: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    if (!this.isEnabled) {
      return fn();
    }

    return Sentry.startSpan(
      {
        name,
        op,
        attributes,
      },
      async () => fn()
    );
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: ErrorSeverity = 'info',
    data?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level: mapSeverity(level),
      data: data ? (scrubSensitiveData(data) as Record<string, unknown>) : undefined,
      timestamp: Date.now() / 1000,
    });
  }

  // ==========================================================================
  // CONTEXT TAGS
  // ==========================================================================

  /**
   * Set a global tag for all subsequent events
   */
  setTag(key: string, value: string): void {
    if (!this.isEnabled) return;
    Sentry.setTag(key, value);
  }

  /**
   * Set multiple global tags
   */
  setTags(tags: Record<string, string>): void {
    if (!this.isEnabled) return;
    Sentry.setTags(tags);
  }

  /**
   * Set extra context data (will be scrubbed)
   */
  setExtra(key: string, value: unknown): void {
    if (!this.isEnabled) return;
    const scrubbed = scrubSensitiveData(value);
    Sentry.setExtra(key, scrubbed);
  }

  // ==========================================================================
  // GRAMMY BOT INTEGRATION
  // ==========================================================================

  /**
   * Create error handler for Grammy bot
   * Integrates with Grammy's error boundary
   *
   * @example
   * ```typescript
   * bot.catch(sentryService.createBotErrorHandler());
   * ```
   */
  createBotErrorHandler(): (err: { ctx: unknown; error: Error }) => void {
    return (err) => {
      const { ctx, error } = err;

      // Extract context safely
      const updateId = (ctx as { update?: { update_id?: number } })?.update?.update_id;
      const userId = (ctx as { from?: { id?: number } })?.from?.id;

      this.captureError(error, {
        category: 'telegram_api',
        tags: {
          update_id: updateId?.toString() || 'unknown',
          error_type: error.name,
        },
        user: userId
          ? { anonymousId: this.anonymizeUserId(userId.toString()) }
          : undefined,
        extra: {
          error_message: error.message,
          // Don't include full context - may contain PHI
        },
      });
    };
  }

  // ==========================================================================
  // ALERTING
  // ==========================================================================

  /**
   * Configure alert callbacks
   */
  configureAlerts(config: IAlertConfig): void {
    this.alertConfig = config;
  }

  /**
   * Track error count for threshold alerting
   */
  private trackErrorCount(category: string): void {
    const key = category;
    const now = new Date();
    const existing = this.errorCounts.get(key);

    if (existing) {
      // Reset if older than 5 minutes
      const ageMinutes = (now.getTime() - existing.firstSeen.getTime()) / 60000;
      if (ageMinutes > 5) {
        this.errorCounts.set(key, { count: 1, firstSeen: now });
      } else {
        existing.count++;

        // Check threshold (10 errors in 5 minutes)
        if (existing.count >= 10 && this.alertConfig?.onWarningThreshold) {
          Promise.resolve(this.alertConfig.onWarningThreshold(existing.count, 5)).catch(
            (err: Error) => console.error('[SentryService] Warning threshold callback error:', err)
          );
          // Reset counter after alert
          this.errorCounts.set(key, { count: 0, firstSeen: now });
        }
      }
    } else {
      this.errorCounts.set(key, { count: 1, firstSeen: now });
    }
  }

  /**
   * Trigger alert callback if configured
   */
  private triggerAlertIfNeeded(error: Error, context?: IErrorContext): void {
    if (this.alertConfig?.onCriticalError) {
      Promise.resolve(this.alertConfig.onCriticalError(error, context || {})).catch(
        (err: Error) => console.error('[SentryService] Critical error callback error:', err)
      );
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Check if Sentry is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Flush pending events (call before process exit)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.isEnabled) return true;
    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry client (call on graceful shutdown)
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.isEnabled) return true;
    return Sentry.close(timeout);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default Sentry service instance
 * Use this for most cases
 */
export const sentryService = new SentryService();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { Sentry, IS_SENTRY_ENABLED };
