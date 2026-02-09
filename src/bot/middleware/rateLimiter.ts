/**
 * Rate Limiter Middleware - Protection Against Abuse
 * ===================================================
 * Implements per-user rate limiting for bot commands.
 *
 * Security:
 * - Prevents command flooding/DoS
 * - Protects database from excessive queries
 * - OWASP 2025 recommended pattern
 *
 * Configuration:
 * - 20 commands per minute per user (default)
 * - 200 commands per hour per user (default)
 * - Configurable via environment variables
 *
 * @see CLAUDE.md §2.2 - Technical security requirements
 * @packageDocumentation
 * @module @sleepcore/bot/middleware
 */

import { Context, NextFunction } from 'grammy';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
  /** Timestamps of recent requests */
  timestamps: number[];
  /** Blocked until timestamp (0 if not blocked) */
  blockedUntil: number;
}

interface RateLimiterConfig {
  /** Max requests per minute */
  maxPerMinute: number;
  /** Max requests per hour */
  maxPerHour: number;
  /** Block duration in ms when limit exceeded */
  blockDurationMs: number;
  /** Cleanup interval in ms */
  cleanupIntervalMs: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20', 10),
  maxPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '200', 10),
  blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_MS || '60000', 10), // 1 minute
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

/**
 * In-memory rate limiter with sliding window
 */
export class RateLimiter {
  private readonly limits: Map<string, RateLimitEntry> = new Map();
  private readonly config: RateLimiterConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Check if user is rate limited
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(userId: string): boolean {
    const now = Date.now();
    let entry = this.limits.get(userId);

    // Create new entry if doesn't exist
    if (!entry) {
      entry = { timestamps: [], blockedUntil: 0 };
      this.limits.set(userId, entry);
    }

    // Check if currently blocked
    if (entry.blockedUntil > now) {
      return false;
    }

    // Clear block if expired
    if (entry.blockedUntil > 0 && entry.blockedUntil <= now) {
      entry.blockedUntil = 0;
      entry.timestamps = [];
    }

    // Remove old timestamps (older than 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    entry.timestamps = entry.timestamps.filter(t => t > oneHourAgo);

    // Count recent requests
    const oneMinuteAgo = now - 60 * 1000;
    const requestsLastMinute = entry.timestamps.filter(t => t > oneMinuteAgo).length;
    const requestsLastHour = entry.timestamps.length;

    // Check limits
    if (requestsLastMinute >= this.config.maxPerMinute) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      console.warn(`[RateLimiter] User ${userId} blocked: ${requestsLastMinute} req/min exceeded`);
      return false;
    }

    if (requestsLastHour >= this.config.maxPerHour) {
      entry.blockedUntil = now + this.config.blockDurationMs * 5; // 5x block for hour limit
      console.warn(`[RateLimiter] User ${userId} blocked: ${requestsLastHour} req/hour exceeded`);
      return false;
    }

    // Record this request
    entry.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining time until unblock (in seconds)
   */
  getBlockedSeconds(userId: string): number {
    const entry = this.limits.get(userId);
    if (!entry || entry.blockedUntil === 0) return 0;
    const remaining = entry.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Start periodic cleanup of old entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      for (const [userId, entry] of this.limits.entries()) {
        // Remove entries with no recent activity
        if (entry.timestamps.length === 0 && entry.blockedUntil < now) {
          this.limits.delete(userId);
          continue;
        }
        // Clean old timestamps
        entry.timestamps = entry.timestamps.filter(t => t > oneHourAgo);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { trackedUsers: number; blockedUsers: number } {
    const now = Date.now();
    let blockedUsers = 0;
    for (const entry of this.limits.values()) {
      if (entry.blockedUntil > now) blockedUsers++;
    }
    return {
      trackedUsers: this.limits.size,
      blockedUsers,
    };
  }
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/** Singleton instance */
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get or create rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Grammy middleware for rate limiting
 *
 * Usage:
 * ```typescript
 * bot.use(createRateLimitMiddleware());
 * ```
 */
export function createRateLimitMiddleware() {
  const limiter = getRateLimiter();

  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id?.toString();

    // Skip if no user (shouldn't happen, but be safe)
    if (!userId) {
      await next();
      return;
    }

    // Check rate limit
    if (!limiter.isAllowed(userId)) {
      const blockedSeconds = limiter.getBlockedSeconds(userId);
      console.warn(`[RateLimiter] Blocked request from user ${userId}, ${blockedSeconds}s remaining`);

      // Respond with rate limit message (only for direct messages, not callbacks)
      if (ctx.message) {
        try {
          await ctx.reply(
            `⏳ Слишком много запросов. Подождите ${blockedSeconds} секунд.`,
            { parse_mode: undefined }
          );
        } catch {
          // Ignore send errors (user might have blocked bot)
        }
      } else if (ctx.callbackQuery) {
        try {
          await ctx.answerCallbackQuery({
            text: `⏳ Подождите ${blockedSeconds} сек.`,
            show_alert: false,
          });
        } catch {
          // Ignore
        }
      }

      return; // Don't call next()
    }

    await next();
  };
}

/**
 * Stop rate limiter (for graceful shutdown)
 */
export function stopRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.stop();
    rateLimiterInstance = null;
  }
}
