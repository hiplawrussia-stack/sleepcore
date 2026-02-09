/**
 * Rate Limiting Middleware
 * ========================
 * In-memory rate limiting for API endpoints.
 *
 * Security Controls:
 * - OWASP API4:2023 — Unrestricted Resource Consumption
 * - NIST SP 800-228 — API Protection Guidelines
 * - Brute-force protection on auth endpoints
 *
 * Standards:
 * - HTTP 429 Too Many Requests
 * - X-RateLimit-* headers (IETF draft-ietf-httpapi-ratelimit-headers)
 * - Retry-After header (RFC 7231)
 *
 * @see https://owasp.org/API-Security/
 * @see https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025
 * @packageDocumentation
 * @module @sleepcore/api/middleware
 */

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getRateLimitKey } from './auth.js';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
  /** Request count in current window */
  count: number;
  /** Window reset timestamp (ms) */
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for different limit tiers */
  keyPrefix: string;
}

// ============================================================================
// CONSTANTS (based on industry standards)
// ============================================================================

/**
 * Rate limit configurations for different endpoint types
 *
 * Values based on:
 * - Zuplo 2025: "100 requests per minute is a solid baseline"
 * - Auth endpoints: stricter to prevent brute force (10-20 req/min)
 */
export const RATE_LIMITS = {
  /** Auth endpoints — strict limits for brute force protection */
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'auth',
  },
  /** Sync endpoints — generous for offline-first apps */
  sync: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'sync',
  },
  /** General API endpoints */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api',
  },
} as const satisfies Record<string, RateLimitConfig>;

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanup();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Create rate limiting middleware
 *
 * @param config Rate limit configuration
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * // Apply to auth routes (stricter)
 * app.use('/api/auth/*', createRateLimitMiddleware(RATE_LIMITS.auth));
 *
 * // Apply to general API (standard)
 * app.use('/api/*', createRateLimitMiddleware(RATE_LIMITS.api));
 * ```
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyPrefix } = config;

  return createMiddleware(async (c, next) => {
    const baseKey = getRateLimitKey(c);
    const key = `${keyPrefix}:${baseKey}`;
    const now = Date.now();

    // Get or initialize entry
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    // Increment count
    entry.count++;
    store.set(key, entry);

    // Calculate header values
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    // Set standard rate limit headers
    // @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      // RFC 7231: Retry-After header
      c.header('Retry-After', resetSeconds.toString());

      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${resetSeconds} seconds.`,
      });
    }

    await next();
  });
}

// ============================================================================
// UTILITIES (for testing and monitoring)
// ============================================================================

/**
 * Get current rate limit statistics
 */
export function getRateLimitStats(): {
  activeKeys: number;
  totalRequests: number;
} {
  let totalRequests = 0;
  for (const entry of store.values()) {
    totalRequests += entry.count;
  }

  return {
    activeKeys: store.size,
    totalRequests,
  };
}

/**
 * Clear rate limit for specific key (admin/testing)
 */
export function clearRateLimit(key: string): boolean {
  return store.delete(key);
}

/**
 * Clear all rate limits (testing only)
 */
export function clearAllRateLimits(): void {
  store.clear();
}

/**
 * Stop cleanup timer (for graceful shutdown)
 */
export function stopRateLimitCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
