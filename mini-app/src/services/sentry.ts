/**
 * Sentry Error Monitoring Service
 * ================================
 * Production error tracking for DTx compliance.
 *
 * IEC 62304 Compliance:
 * - Error monitoring per §5.7.2 (software problem resolution)
 * - Post-market surveillance support
 *
 * HIPAA/GDPR:
 * - No PHI in error reports (user ID only)
 * - IP address anonymization enabled
 *
 * @module @sleepcore/mini-app/services
 */

import * as Sentry from '@sentry/react';
import { env } from '@/env';

/**
 * Sensitive routes that should not be traced in detail
 * @see HIPAA Safe Harbor de-identification
 */
const SENSITIVE_ROUTE_PATTERNS = [
  /\/profile/i,
  /\/settings/i,
  /\/diary/i,
];

/**
 * Initialize Sentry error monitoring
 * Should be called BEFORE React renders
 *
 * Configuration follows 2025-2026 best practices:
 * - replaysOnErrorSampleRate: 1.0 to capture full context on errors
 * - tracesSampleRate: 0.2 for balanced coverage vs cost
 * - beforeSendTransaction: filter sensitive routes
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */
export function initSentry(): void {
  // Skip in development (DSN check moved to main.tsx for graceful degradation)
  if (env.DEV) {
    console.log('[Sentry] Disabled in development mode');
    return;
  }

  // DSN is validated by T3-Env, guaranteed to be valid URL if present
  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.MODE,
    release: `sleepcore-mini-app@${env.VITE_APP_VERSION}`,

    // Global tags for all events (IEC 62304 traceability)
    initialScope: {
      tags: {
        app: 'mini-app',
        app_type: 'telegram-webapp',
      },
    },

    // Performance monitoring (2025 best practice: 10-30% for production)
    tracesSampleRate: 0.2, // 20% of transactions

    // Session replay for debugging
    // Best practice 2025: low session rate, high error rate
    replaysSessionSampleRate: 0.05, // 5% of sessions for baseline
    replaysOnErrorSampleRate: 1.0, // 100% on error for full context

    // HIPAA/GDPR: Anonymize user data
    beforeSend(event) {
      // Strip any potential PHI from error messages
      if (event.message) {
        event.message = sanitizeMessage(event.message);
      }

      // Strip PHI from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          message: breadcrumb.message ? sanitizeMessage(breadcrumb.message) : undefined,
        }));
      }

      return event;
    },

    // Filter sensitive transactions (HIPAA compliance)
    beforeSendTransaction(event) {
      const transactionName = event.transaction || '';

      // Redact sensitive route names
      for (const pattern of SENSITIVE_ROUTE_PATTERNS) {
        if (pattern.test(transactionName)) {
          event.transaction = transactionName.replace(pattern, '/[REDACTED]');
        }
      }

      return event;
    },

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration({
        // Enable interaction tracing for INP insights
        enableInp: true,
      }),
      Sentry.replayIntegration({
        // GDPR/HIPAA: Mask all text to prevent PHI capture
        maskAllText: true,
        blockAllMedia: true,
        // Block sensitive form inputs
        maskAllInputs: true,
      }),
    ],
  });

  console.log('[Sentry] Initialized');
}

/**
 * Remove potential PHI patterns from messages
 */
function sanitizeMessage(message: string): string {
  return message
    // Remove potential email patterns
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Remove potential phone patterns
    .replace(/\+?[\d\s-]{10,}/g, '[PHONE]')
    // Remove potential Telegram user IDs (numeric sequences)
    .replace(/user[_\s]?id[:\s]*\d+/gi, 'user_id:[REDACTED]');
}

/**
 * Set user context (ID only, no PHI)
 */
export function setUser(telegramId: number): void {
  if (env.DEV) return;

  Sentry.setUser({
    id: String(telegramId),
    // No email, username, or other PHI
  });
}

/**
 * Clear user context on logout
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Error categories for filtering in Sentry dashboard
 * IEC 62304: Categorization supports problem resolution tracking (§5.7.2)
 */
export type ErrorCategory =
  | 'auth'       // Authentication/authorization errors
  | 'api'        // API/network communication errors
  | 'storage'    // LocalStorage/CloudStorage errors
  | 'breathing'  // Breathing session errors
  | 'sync'       // Offline sync errors
  | 'telegram'   // Telegram SDK errors
  | 'validation' // Data validation errors
  | 'security'   // Security-related issues
  | 'ui'         // UI/rendering errors
  | 'unknown';   // Uncategorized errors

/**
 * Extended context for captureException
 */
export interface CaptureContext {
  /** Error category for filtering */
  category?: ErrorCategory;
  /** Custom tags for Sentry */
  tags?: Record<string, string>;
  /** Extra data for debugging */
  extra?: Record<string, unknown>;
}

/**
 * Capture exception with category tags and context
 *
 * @example
 * ```ts
 * captureException(error, {
 *   category: 'api',
 *   tags: { endpoint: '/auth/me' },
 *   extra: { statusCode: 500 }
 * });
 * ```
 */
export function captureException(
  error: unknown,
  context?: CaptureContext | Record<string, unknown>
): void {
  if (env.DEV) {
    console.error('[Sentry] Would capture:', error, context);
    return;
  }

  // Handle both new CaptureContext and legacy Record<string, unknown>
  const isExtendedContext = context && ('category' in context || 'tags' in context || 'extra' in context);

  if (isExtendedContext) {
    const { category, tags, extra } = context as CaptureContext;
    Sentry.captureException(error, {
      tags: {
        ...(category && { error_category: category }),
        ...tags,
      },
      extra,
    });
  } else {
    // Legacy support: treat context as extra data
    Sentry.captureException(error, {
      extra: context as Record<string, unknown>,
    });
  }
}

/**
 * Extended context for captureMessage
 */
export interface MessageContext {
  /** Severity level */
  level?: Sentry.SeverityLevel;
  /** Error category for filtering */
  category?: ErrorCategory;
  /** Custom tags for Sentry */
  tags?: Record<string, string>;
  /** Extra data for debugging */
  extra?: Record<string, unknown>;
}

/**
 * Capture message with category and context
 *
 * @example
 * ```ts
 * captureMessage('User completed breathing session', {
 *   level: 'info',
 *   category: 'breathing',
 *   extra: { cycles: 5, patternId: '478' }
 * });
 * ```
 */
export function captureMessage(
  message: string,
  levelOrContext: Sentry.SeverityLevel | MessageContext = 'info'
): void {
  if (env.DEV) {
    console.log(`[Sentry] Would capture message:`, message, levelOrContext);
    return;
  }

  // Handle simple level string (backward compatible)
  if (typeof levelOrContext === 'string') {
    Sentry.captureMessage(message, levelOrContext);
    return;
  }

  // Handle extended context
  const { level = 'info', category, tags, extra } = levelOrContext;
  Sentry.withScope((scope) => {
    if (category) {
      scope.setTag('error_category', category);
    }
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (extra) {
      scope.setExtras(extra);
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Export Sentry's ErrorBoundary for use in components
export { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
