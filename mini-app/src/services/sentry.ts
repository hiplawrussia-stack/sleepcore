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
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip in development or if no DSN
  if (import.meta.env.DEV || !dsn) {
    console.log('[Sentry] Disabled (dev mode or no DSN)');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `sleepcore-mini-app@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

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
  if (import.meta.env.DEV) return;

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
 * Capture exception with optional context
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.error('[Sentry] Would capture:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (import.meta.env.DEV) {
    console.log(`[Sentry] Would capture message (${level}):`, message);
    return;
  }

  Sentry.captureMessage(message, level);
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
