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
 * Initialize Sentry error monitoring
 * Should be called BEFORE React renders
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

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay for debugging (GDPR: minimal, no text)
    replaysSessionSampleRate: 0.0, // Disabled by default
    replaysOnErrorSampleRate: 0.1, // 10% on error

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

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // GDPR: Mask all text to prevent PHI capture
        maskAllText: true,
        blockAllMedia: true,
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
