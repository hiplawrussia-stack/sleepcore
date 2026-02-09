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

// ==================== Rate Limiting Middleware ====================
export {
  RateLimiter,
  getRateLimiter,
  createRateLimitMiddleware,
  stopRateLimiter,
} from './rateLimiter';

// ==================== Security Middleware ====================
export {
  createSecurityMiddleware,
  sanitizeInput,
  validateAdminIds,
  isValidAdmin,
  verifySessionBinding,
  clearSessionBinding,
  getSessionBindingStats,
  verifyReplyToMessage,
  securityAuditLog,
  DEFAULT_SECURITY_CONFIG,
} from './securityMiddleware';

export type {
  ISecurityEvent,
  SecurityEventType,
  ISecurityConfig,
  IReplyVerificationResult,
} from './securityMiddleware';
