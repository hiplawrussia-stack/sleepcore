/**
 * Monitoring Infrastructure Module
 * =================================
 * Provides error tracking and performance monitoring via Sentry.
 *
 * IMPORTANT: Import order matters!
 * The instrument module MUST be imported before any other application code.
 *
 * Usage in main.ts:
 * ```typescript
 * // FIRST LINE - before any other imports
 * import './infrastructure/monitoring/instrument';
 *
 * // Then other imports
 * import { sentryService } from './infrastructure/monitoring';
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/monitoring
 */

// Re-export instrument (should be imported first in entry point)
export { Sentry, IS_SENTRY_ENABLED, scrubSensitiveData } from './instrument';

// Export service and types
export {
  SentryService,
  sentryService,
  type ErrorSeverity,
  type ErrorCategory,
  type IAnonymizedUserContext,
  type IErrorContext,
  type ISpanContext,
  type IAlertConfig,
} from './SentryService';
