/**
 * Sentry Instrumentation - MUST be imported FIRST
 * ================================================
 * This file initializes Sentry before any other modules load.
 * Import this file at the very top of your entry point (main.ts).
 *
 * Research (2025 Best Practices):
 * - Early initialization required for auto-instrumentation
 * - TracingChannel requires Node.js 18.19.0+
 * - DSN from environment variables (not hardcoded)
 * - Healthcare: HIPAA compliance via data scrubbing
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/monitoring/instrument
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Check if Sentry is configured
 * Sentry will only initialize if DSN is provided
 */
const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_SENTRY_ENABLED = !!SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false';

/**
 * Sample rates (2025 best practices)
 * - Development: 1.0 (100%) for full visibility
 * - Production: 0.1-0.5 (10-50%) to reduce noise
 */
const TRACES_SAMPLE_RATE = IS_PRODUCTION
  ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2')
  : 1.0;

const PROFILES_SAMPLE_RATE = IS_PRODUCTION
  ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0')
  : 1.0;

// ============================================================================
// PHI/PII SCRUBBING (HIPAA Compliance)
// ============================================================================

/**
 * List of sensitive fields to scrub from error reports
 * Healthcare DTx: Must not send PHI (Protected Health Information)
 */
const SENSITIVE_FIELDS = [
  // Authentication
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'jwt',
  'session',
  'cookie',
  'csrf',
  // Healthcare PHI (HIPAA)
  'ssn',
  'social_security',
  'medical_record',
  'diagnosis',
  'prescription',
  'insurance',
  'health_condition',
  'isi_score', // ISI assessment scores
  'sleep_data',
  'therapy_notes',
  // Personal Identifiable Information
  'email',
  'phone',
  'address',
  'birth_date',
  'date_of_birth',
  'dob',
  'first_name',
  'last_name',
  'full_name',
  'telegram_id',
  'external_id',
  'user_id',
  'userId',
  'dbUserId',
];

/**
 * Regex patterns for sensitive data detection
 */
const SENSITIVE_PATTERNS = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // Phone numbers (various formats)
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // Telegram IDs (numeric)
  /\b\d{7,12}\b/g,
  // Credit card numbers (basic pattern)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
];

/**
 * Recursively scrub sensitive data from objects
 */
function scrubSensitiveData(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    let scrubbed = obj;
    for (const pattern of SENSITIVE_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, '[SCRUBBED]');
    }
    return scrubbed;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubSensitiveData(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Check if key is sensitive
      const lowerKey = key.toLowerCase();
      const isSensitiveKey = SENSITIVE_FIELDS.some(
        (field) => lowerKey.includes(field.toLowerCase())
      );

      if (isSensitiveKey) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubSensitiveData(value, depth + 1);
      }
    }
    return scrubbed;
  }

  return obj;
}

/**
 * beforeSend hook for HIPAA-compliant data scrubbing
 * Filters sensitive data before sending to Sentry
 */
function beforeSendHook(
  event: Sentry.ErrorEvent,
  _hint: Sentry.EventHint
): Sentry.ErrorEvent | null {
  // Skip events in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  // Scrub user data
  if (event.user) {
    event.user = {
      id: event.user.id ? '[USER_ID]' : undefined,
      // Don't send email, username, ip_address
    };
  }

  // Scrub request data
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubSensitiveData(
        event.request.headers
      ) as Record<string, string>;
    }
    if (event.request.data) {
      event.request.data = scrubSensitiveData(event.request.data);
    }
    if (event.request.query_string) {
      event.request.query_string = '[SCRUBBED]';
    }
    if (event.request.cookies) {
      // Type-safe cookie scrubbing
      event.request.cookies = { scrubbed: '[SCRUBBED]' };
    }
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      data: breadcrumb.data
        ? (scrubSensitiveData(breadcrumb.data) as Record<string, unknown>)
        : undefined,
      message: breadcrumb.message
        ? (scrubSensitiveData(breadcrumb.message) as string)
        : undefined,
    }));
  }

  // Scrub extra context
  if (event.extra) {
    event.extra = scrubSensitiveData(event.extra) as Record<string, unknown>;
  }

  // Scrub tags
  if (event.tags) {
    event.tags = scrubSensitiveData(event.tags) as Record<string, string>;
  }

  // Scrub exception messages and stack traces
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value
        ? (scrubSensitiveData(exception.value) as string)
        : undefined,
    }));
  }

  return event;
}

/**
 * beforeSendSpan hook for performance span scrubbing
 * Parameterizes user IDs in span descriptions
 * Note: Cannot return null (Sentry SDK requirement), so always returns span
 */
function beforeSendSpanHook(span: Parameters<NonNullable<Sentry.NodeOptions['beforeSendSpan']>>[0]): ReturnType<NonNullable<Sentry.NodeOptions['beforeSendSpan']>> {
  // Scrub span description if it contains sensitive patterns
  if (span.description) {
    // Parameterize user IDs in span descriptions
    span.description = span.description.replace(/\/\d{7,12}\//g, '/:userId/');
  }

  return span;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

if (IS_SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0-alpha.4',

    // Integrations
    integrations: [
      // Node.js profiling (2025 best practice)
      nodeProfilingIntegration(),
    ],

    // Sample rates (2025 production recommendations)
    tracesSampleRate: TRACES_SAMPLE_RATE,
    profilesSampleRate: PROFILES_SAMPLE_RATE,

    // HIPAA Compliance: Do not send PII by default
    sendDefaultPii: false,

    // Data scrubbing hooks
    beforeSend: beforeSendHook,
    beforeSendSpan: beforeSendSpanHook,

    // Additional scrubbing rules
    // Note: Also configure server-side scrubbing in Sentry UI
    ignoreErrors: [
      // Ignore known non-critical errors
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      // Telegram API rate limits (handled by auto-retry)
      'Too Many Requests',
      '429',
    ],

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Don't record console breadcrumbs in production (can contain PHI)
      if (IS_PRODUCTION && breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },

    // Debug mode (only in development)
    debug: !IS_PRODUCTION && process.env.SENTRY_DEBUG === 'true',

    // Max breadcrumbs to reduce data volume
    maxBreadcrumbs: IS_PRODUCTION ? 50 : 100,

    // Attach stack traces to messages
    attachStacktrace: true,

    // Server name (anonymized for HIPAA)
    serverName: IS_PRODUCTION ? 'sleepcore-prod' : 'sleepcore-dev',
  });

  console.log(
    `[Sentry] Initialized: env=${process.env.NODE_ENV}, traces=${TRACES_SAMPLE_RATE}, profiles=${PROFILES_SAMPLE_RATE}`
  );
} else {
  console.log('[Sentry] Disabled: SENTRY_DSN not configured');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Sentry, IS_SENTRY_ENABLED, scrubSensitiveData };
