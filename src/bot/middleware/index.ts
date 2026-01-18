/**
 * Bot Middleware Module
 * =====================
 * Exports for Grammy middleware components.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/middleware
 */

// ==================== Constitutional AI Middleware ====================
export {
  ConstitutionalMiddleware,
  createConstitutionalMiddleware,
  constitutionalMiddleware,
  DEFAULT_CONSTITUTIONAL_CONFIG,
} from './ConstitutionalMiddleware';

export type {
  ConstitutionalPrinciple,
  ViolationSeverity,
  IConstitutionalCheck,
  IConstitutionalConfig,
} from './ConstitutionalMiddleware';
