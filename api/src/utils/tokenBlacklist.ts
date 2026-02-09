/**
 * Token Blacklist Service
 * =======================
 * In-memory JWT token revocation for security.
 *
 * Security Controls:
 * - OWASP API2:2023 — Broken Authentication
 * - RFC 8725 — JWT Best Current Practices
 * - Immediate token invalidation on logout
 *
 * Features:
 * - Revoke individual tokens by JTI
 * - Revoke all tokens for a user (logout all devices)
 * - Automatic cleanup of expired entries
 *
 * @see CLAUDE.md §2.2 — Security requirements
 * @packageDocumentation
 * @module api/utils
 */

// ============================================================================
// TYPES
// ============================================================================

interface RevokedToken {
  /** Token JTI (unique identifier) */
  jti: string;
  /** User's Telegram ID */
  telegramId: number;
  /** Token expiration time (ms) — for cleanup */
  expiresAt: number;
  /** Revocation reason */
  reason: 'logout' | 'logout_all' | 'security' | 'admin';
  /** When revoked */
  revokedAt: number;
}

interface UserRevocation {
  /** User's Telegram ID */
  telegramId: number;
  /** All tokens issued before this time are revoked */
  revokedBefore: number;
  /** Revocation reason */
  reason: 'logout_all' | 'security' | 'password_change' | 'admin';
}

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

/** Individual revoked tokens (by JTI) */
const revokedTokens = new Map<string, RevokedToken>();

/** User-wide revocations (all tokens before timestamp) */
const userRevocations = new Map<number, UserRevocation>();

// Cleanup interval: every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Start cleanup timer for expired entries
 */
function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();

    // Clean up expired token entries
    for (const [jti, entry] of revokedTokens.entries()) {
      if (entry.expiresAt < now) {
        revokedTokens.delete(jti);
      }
    }

    // User revocations don't expire (kept for audit), but we could add TTL
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanup();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Revoke a specific token by JTI
 *
 * @param jti Token's unique identifier (from JWT payload)
 * @param telegramId User's Telegram ID
 * @param expiresAt Token's expiration time (ms)
 * @param reason Revocation reason
 */
export function revokeToken(
  jti: string,
  telegramId: number,
  expiresAt: number,
  reason: RevokedToken['reason'] = 'logout'
): void {
  revokedTokens.set(jti, {
    jti,
    telegramId,
    expiresAt,
    reason,
    revokedAt: Date.now(),
  });
}

/**
 * Revoke all tokens for a user issued before now
 *
 * Use for "logout from all devices" or security incidents
 *
 * @param telegramId User's Telegram ID
 * @param reason Revocation reason
 */
export function revokeAllUserTokens(
  telegramId: number,
  reason: UserRevocation['reason'] = 'logout_all'
): void {
  userRevocations.set(telegramId, {
    telegramId,
    revokedBefore: Date.now(),
    reason,
  });
}

/**
 * Check if a token is revoked
 *
 * @param jti Token's unique identifier
 * @param telegramId User's Telegram ID
 * @param issuedAt Token's issued-at time (ms)
 * @returns true if token is revoked
 */
export function isTokenRevoked(
  jti: string,
  telegramId: number,
  issuedAt: number
): boolean {
  // Check individual revocation
  if (revokedTokens.has(jti)) {
    return true;
  }

  // Check user-wide revocation
  const userRevocation = userRevocations.get(telegramId);
  if (userRevocation && issuedAt < userRevocation.revokedBefore) {
    return true;
  }

  return false;
}

/**
 * Get revocation statistics (for monitoring)
 */
export function getRevocationStats(): {
  revokedTokens: number;
  userRevocations: number;
} {
  return {
    revokedTokens: revokedTokens.size,
    userRevocations: userRevocations.size,
  };
}

/**
 * Clear all revocations (for testing only)
 */
export function clearAllRevocations(): void {
  revokedTokens.clear();
  userRevocations.clear();
}

/**
 * Stop cleanup timer (for graceful shutdown)
 */
export function stopBlacklistCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
