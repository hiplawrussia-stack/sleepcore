/**
 * Sentry Instrumentation for API - HIPAA-Compliant Monitoring
 * ============================================================
 * Initialize Sentry before any other modules load.
 * Import this file at the very top of index.ts.
 *
 * Security:
 * - HIPAA compliant: PHI/PII scrubbed before sending
 * - No email, phone, or health data captured
 * - User IDs anonymized via SHA-256 hash
 *
 * @see CLAUDE.md §6 - Monitoring requirements
 * @packageDocumentation
 * @module @sleepcore/api/utils
 */

import * as Sentry from '@sentry/node';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_SENTRY_ENABLED = !!SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false';

/**
 * Sample rates (2025 best practices)
 * - Development: 1.0 (100%) for full visibility
 * - Production: 0.2 (20%) to reduce noise
 */
const TRACES_SAMPLE_RATE = IS_PRODUCTION
  ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2')
  : 1.0;

// ============================================================================
// PHI/PII SCRUBBING (HIPAA Compliance)
// ============================================================================

/**
 * Sensitive fields to scrub from error reports
 * Healthcare DTx: Must not send PHI (Protected Health Information)
 */
const SENSITIVE_FIELDS = [
  // Authentication
  'password', 'token', 'apiKey', 'api_key', 'secret', 'authorization',
  'auth', 'bearer', 'jwt', 'session', 'cookie', 'csrf', 'initData',
  // Healthcare PHI
  'isi_score', 'sleep_data', 'therapy_notes', 'diagnosis', 'medical_record',
  // PII
  'email', 'phone', 'address', 'birth_date', 'first_name', 'last_name',
  'telegram_id', 'external_id', 'user_id', 'userId', 'telegramId',
];

/**
 * Regex patterns for sensitive data detection
 */
const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // Phone
  /\b\d{7,12}\b/g, // Telegram IDs
];

/**
 * Recursively scrub sensitive data from objects
 */
export function scrubSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

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
      const lowerKey = key.toLowerCase();
      const isSensitiveKey = SENSITIVE_FIELDS.some(
        (field) => lowerKey.includes(field.toLowerCase())
      );
      scrubbed[key] = isSensitiveKey ? '[REDACTED]' : scrubSensitiveData(value, depth + 1);
    }
    return scrubbed;
  }

  return obj;
}

/**
 * Hash user ID for anonymization (SHA-256)
 */
export function anonymizeUserId(userId: string | number): string {
  const salt = process.env.SENTRY_USER_SALT || 'sleepcore-api-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${userId}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * beforeSend hook for HIPAA-compliant data scrubbing
 */
function beforeSendHook(
  event: Sentry.ErrorEvent,
  _hint: Sentry.EventHint
): Sentry.ErrorEvent | null {
  if (process.env.NODE_ENV === 'test') return null;

  // Scrub user data
  if (event.user) {
    event.user = { id: event.user.id ? '[USER_ID]' : undefined };
  }

  // Scrub request data
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubSensitiveData(event.request.headers) as Record<string, string>;
    }
    if (event.request.data) {
      event.request.data = scrubSensitiveData(event.request.data);
    }
    if (event.request.query_string) {
      event.request.query_string = '[SCRUBBED]';
    }
    if (event.request.cookies) {
      event.request.cookies = { scrubbed: '[SCRUBBED]' };
    }
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => ({
      ...bc,
      data: bc.data ? (scrubSensitiveData(bc.data) as Record<string, unknown>) : undefined,
      message: bc.message ? (scrubSensitiveData(bc.message) as string) : undefined,
    }));
  }

  // Scrub extra and tags
  if (event.extra) {
    event.extra = scrubSensitiveData(event.extra) as Record<string, unknown>;
  }
  if (event.tags) {
    event.tags = scrubSensitiveData(event.tags) as Record<string, string>;
  }

  // Scrub exception messages
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => ({
      ...ex,
      value: ex.value ? (scrubSensitiveData(ex.value) as string) : undefined,
    }));
  }

  return event;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize Sentry (call once at startup)
 */
export function initSentry(): void {
  if (!IS_SENTRY_ENABLED) {
    console.log('[Sentry] Disabled: SENTRY_DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Sample rate
    tracesSampleRate: TRACES_SAMPLE_RATE,

    // HIPAA: No PII by default
    sendDefaultPii: false,

    // Data scrubbing
    beforeSend: beforeSendHook,

    // Ignore known non-critical errors
    ignoreErrors: [
      'Network request failed',
      'Too Many Requests',
      '429',
      'ECONNRESET',
      'ETIMEDOUT',
    ],

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      if (IS_PRODUCTION && breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },

    // Debug only in development
    debug: !IS_PRODUCTION && process.env.SENTRY_DEBUG === 'true',

    // Limits
    maxBreadcrumbs: IS_PRODUCTION ? 50 : 100,
    attachStacktrace: true,

    // Server name (anonymized)
    serverName: IS_PRODUCTION ? 'sleepcore-api-prod' : 'sleepcore-api-dev',
  });

  console.log(
    `[Sentry] Initialized: env=${process.env.NODE_ENV}, traces=${TRACES_SAMPLE_RATE}`
  );
}

// ============================================================================
// ERROR CAPTURE API
// ============================================================================

/**
 * Capture an error with context
 */
export function captureError(
  error: Error | string,
  context?: {
    category?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string | number;
  }
): string | undefined {
  const errorInstance = typeof error === 'string' ? new Error(error) : error;

  console.error('[API Error]', errorInstance.message);

  if (!IS_SENTRY_ENABLED) return undefined;

  return Sentry.withScope((scope) => {
    if (context?.category) {
      scope.setTag('error_category', context.category);
    }
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extra) {
      scope.setExtras(scrubSensitiveData(context.extra) as Record<string, unknown>);
    }
    if (context?.userId) {
      scope.setUser({ id: anonymizeUserId(context.userId) });
    }

    return Sentry.captureException(errorInstance);
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): string | undefined {
  if (!IS_SENTRY_ENABLED) {
    console.log(`[Sentry] ${level.toUpperCase()}: ${message}`);
    return undefined;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context (anonymized)
 */
export function setUser(userId: string | number | null): void {
  if (!IS_SENTRY_ENABLED) return;

  if (userId === null) {
    Sentry.setUser(null);
  } else {
    Sentry.setUser({ id: anonymizeUserId(userId) });
  }
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!IS_SENTRY_ENABLED) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data: data ? (scrubSensitiveData(data) as Record<string, unknown>) : undefined,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Flush pending events (call before process exit)
 */
export async function flush(timeout = 2000): Promise<boolean> {
  if (!IS_SENTRY_ENABLED) return true;
  return Sentry.flush(timeout);
}

export { Sentry };
