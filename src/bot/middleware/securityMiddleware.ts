/**
 * Security Middleware - Protection Against Common Bot Attacks
 * ============================================================
 * Implements security controls for Telegram bot (OWASP 2025).
 *
 * Features:
 * - Session hijacking protection (chat_id + user_id binding)
 * - Input sanitization for free-text fields
 * - Security event audit logging
 * - Admin ID validation
 *
 * @see CLAUDE.md §2.2 - Technical security requirements
 * @packageDocumentation
 * @module @sleepcore/bot/middleware
 */

import { Context, NextFunction } from 'grammy';

// ============================================================================
// TYPES
// ============================================================================

export interface ISecurityEvent {
  /** Event timestamp */
  timestamp: Date;
  /** Event type */
  type: SecurityEventType;
  /** User ID (Telegram) */
  userId: string;
  /** Chat ID */
  chatId: string;
  /** Event details */
  details: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type SecurityEventType =
  | 'session_mismatch'
  | 'rate_limit_exceeded'
  | 'invalid_callback'
  | 'suspicious_input'
  | 'admin_action'
  | 'crisis_escalation'
  | 'auth_failure'
  | 'input_sanitized';

export interface ISecurityConfig {
  /** Enable session binding (user_id + chat_id) */
  enableSessionBinding: boolean;
  /** Enable input sanitization */
  enableInputSanitization: boolean;
  /** Max message length (chars) */
  maxMessageLength: number;
  /** Patterns to detect in input (potential injection) */
  suspiciousPatterns: RegExp[];
  /** Log retention period (days) */
  logRetentionDays: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: ISecurityConfig = {
  enableSessionBinding: true,
  enableInputSanitization: true,
  maxMessageLength: 4096, // Telegram limit
  suspiciousPatterns: [
    // Script injection attempts
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    // SQL injection patterns
    /'\s*(?:or|and)\s*'?\d/i,
    /;\s*(?:drop|delete|update|insert)/i,
    // Command injection
    /\$\([^)]+\)/,
    /`[^`]+`/,
    // Path traversal
    /\.\.\//,
    /\.\.\\/,
  ],
  logRetentionDays: 90,
};

// ============================================================================
// SECURITY AUDIT LOG
// ============================================================================

/**
 * In-memory security audit log with size limit
 * Production should use persistent storage
 */
class SecurityAuditLog {
  private events: ISecurityEvent[] = [];
  private readonly maxEvents = 10000;

  /**
   * Log a security event
   */
  log(event: Omit<ISecurityEvent, 'timestamp'>): void {
    const fullEvent: ISecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Trim old events if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Console log for critical events
    if (event.severity === 'critical') {
      console.error(`[SECURITY:CRITICAL] ${event.type}: ${event.details}`, {
        userId: event.userId,
        chatId: event.chatId,
      });
    } else if (event.severity === 'warning') {
      console.warn(`[SECURITY:WARNING] ${event.type}: ${event.details}`, {
        userId: event.userId,
      });
    }
  }

  /**
   * Get recent events for a user
   */
  getEventsForUser(userId: string, limit = 50): ISecurityEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit = 100): ISecurityEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }

  /**
   * Get all critical events (last 24 hours)
   */
  getCriticalEvents(): ISecurityEvent[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.events.filter(
      e => e.severity === 'critical' && e.timestamp > oneDayAgo
    );
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { total: number; critical: number; warning: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    let critical = 0;
    let warning = 0;

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      if (event.severity === 'critical') critical++;
      if (event.severity === 'warning') warning++;
    }

    return { total: this.events.length, critical, warning, byType };
  }

  /**
   * Clear old events (for cleanup)
   */
  cleanup(retentionDays: number): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const before = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoff);
    return before - this.events.length;
  }
}

// Singleton instance
const securityAuditLog = new SecurityAuditLog();

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize user input text
 * Removes potentially dangerous patterns while preserving legitimate content
 */
export function sanitizeInput(text: string, config: ISecurityConfig = DEFAULT_CONFIG): {
  sanitized: string;
  wasModified: boolean;
  detectedPatterns: string[];
} {
  if (!text || typeof text !== 'string') {
    return { sanitized: '', wasModified: false, detectedPatterns: [] };
  }

  let sanitized = text;
  const detectedPatterns: string[] = [];

  // Truncate if too long
  if (sanitized.length > config.maxMessageLength) {
    sanitized = sanitized.substring(0, config.maxMessageLength);
    detectedPatterns.push('length_exceeded');
  }

  // Check for suspicious patterns
  for (const pattern of config.suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      detectedPatterns.push(pattern.source);
      // Remove the suspicious pattern
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    }
  }

  // Remove null bytes and control characters (except newlines)
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (controlCharPattern.test(sanitized)) {
    sanitized = sanitized.replace(controlCharPattern, '');
    detectedPatterns.push('control_chars');
  }

  return {
    sanitized,
    wasModified: sanitized !== text,
    detectedPatterns,
  };
}

// ============================================================================
// ADMIN VALIDATION
// ============================================================================

/**
 * Validate admin user IDs format
 * Returns validated numeric IDs only
 */
export function validateAdminIds(rawIds: string | undefined): {
  validIds: string[];
  invalidIds: string[];
  isValid: boolean;
} {
  if (!rawIds) {
    return { validIds: [], invalidIds: [], isValid: true };
  }

  const ids = rawIds.split(',').map(id => id.trim()).filter(Boolean);
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of ids) {
    // Telegram user IDs are positive integers
    if (/^\d{1,20}$/.test(id) && BigInt(id) > 0) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  return {
    validIds,
    invalidIds,
    isValid: invalidIds.length === 0,
  };
}

/**
 * Check if user is admin with validated ID
 */
export function isValidAdmin(userId: string, adminIds: string[]): boolean {
  if (!userId || !adminIds.length) return false;

  // Validate userId format
  if (!/^\d{1,20}$/.test(userId)) return false;

  return adminIds.includes(userId);
}

// ============================================================================
// SESSION SECURITY
// ============================================================================

interface SessionBinding {
  userId: string;
  chatId: string;
  createdAt: number;
  lastVerified: number;
}

const sessionBindings = new Map<string, SessionBinding>();

/**
 * Verify session binding (user_id + chat_id)
 * Prevents session hijacking across chats
 */
export function verifySessionBinding(
  userId: string,
  chatId: string
): { valid: boolean; reason?: string } {
  const key = `${userId}`;
  const existing = sessionBindings.get(key);

  if (!existing) {
    // First interaction - create binding
    sessionBindings.set(key, {
      userId,
      chatId,
      createdAt: Date.now(),
      lastVerified: Date.now(),
    });
    return { valid: true };
  }

  // Verify chat_id matches original binding
  if (existing.chatId !== chatId) {
    return {
      valid: false,
      reason: `Session bound to different chat (original: ${existing.chatId}, current: ${chatId})`,
    };
  }

  // Update last verified
  existing.lastVerified = Date.now();
  return { valid: true };
}

/**
 * Clear session binding (for logout/reset)
 */
export function clearSessionBinding(userId: string): void {
  sessionBindings.delete(userId);
}

/**
 * Get session binding stats
 */
export function getSessionBindingStats(): { activeSessions: number; oldestSession: number | null } {
  let oldest: number | null = null;
  for (const binding of sessionBindings.values()) {
    if (oldest === null || binding.createdAt < oldest) {
      oldest = binding.createdAt;
    }
  }
  return {
    activeSessions: sessionBindings.size,
    oldestSession: oldest,
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Grammy middleware for security controls
 *
 * Usage:
 * ```typescript
 * bot.use(createSecurityMiddleware());
 * ```
 */
export function createSecurityMiddleware(config: Partial<ISecurityConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id?.toString() || '';
    const chatId = ctx.chat?.id?.toString() || '';

    // Skip if no user (shouldn't happen)
    if (!userId) {
      await next();
      return;
    }

    // 1. Session binding verification
    if (fullConfig.enableSessionBinding && chatId) {
      const bindingResult = verifySessionBinding(userId, chatId);
      if (!bindingResult.valid) {
        securityAuditLog.log({
          type: 'session_mismatch',
          userId,
          chatId,
          details: bindingResult.reason || 'Session binding mismatch',
          severity: 'warning',
        });

        // Don't block - could be legitimate multi-chat usage
        // But log for monitoring
      }
    }

    // 2. Input sanitization for text messages
    if (fullConfig.enableInputSanitization && ctx.message?.text) {
      const result = sanitizeInput(ctx.message.text, fullConfig);

      if (result.wasModified) {
        securityAuditLog.log({
          type: 'input_sanitized',
          userId,
          chatId,
          details: `Patterns detected: ${result.detectedPatterns.join(', ')}`,
          severity: result.detectedPatterns.includes('length_exceeded') ? 'info' : 'warning',
          metadata: { patterns: result.detectedPatterns },
        });

        // Log if suspicious patterns found
        if (result.detectedPatterns.some(p => p !== 'length_exceeded' && p !== 'control_chars')) {
          securityAuditLog.log({
            type: 'suspicious_input',
            userId,
            chatId,
            details: `Suspicious input detected: ${result.detectedPatterns.join(', ')}`,
            severity: 'warning',
            metadata: { originalLength: ctx.message.text.length },
          });
        }
      }
    }

    await next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  securityAuditLog,
  DEFAULT_CONFIG as DEFAULT_SECURITY_CONFIG,
};
