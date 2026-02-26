/**
 * URL Validation Utilities - XSS Prevention via Protocol Allowlist
 * =================================================================
 * Validates URLs before opening external links to prevent XSS attacks
 * through dangerous protocols like javascript:, data:, vbscript:.
 *
 * Security Model:
 * - Allowlist approach (OWASP recommended over denylist)
 * - Uses URL constructor for parsing (not regex - avoids backtracking)
 * - Handles case variations and encoding bypass attempts
 * - Returns safe fallback for invalid URLs
 *
 * References:
 * - OWASP Unvalidated Redirects Cheat Sheet
 * - Snyk Secure JavaScript URL Validation (2025)
 * - OWASP ASVS 5.0 (May 2025)
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
 * @see CLAUDE.md §1 - Security Priority
 * @module @sleepcore/mini-app/utils
 */

// ========== Constants ==========

/**
 * Allowed URL protocols (allowlist approach per OWASP)
 *
 * - https: Primary protocol for external links
 * - http: Legacy support (Telegram may redirect to HTTPS)
 * - tg: Telegram deep links (tg://resolve?domain=...)
 * - mailto: Email links
 * - tel: Phone links
 *
 * Blocked (not in list):
 * - javascript: XSS execution
 * - data: XSS via data URLs
 * - vbscript: Legacy IE XSS
 * - file: Local file access
 */
export const ALLOWED_PROTOCOLS: ReadonlyArray<string> = [
  'https:',
  'http:',
  'tg:',
  'mailto:',
  'tel:',
] as const;

/**
 * Allowed protocols specifically for Telegram links
 * More restrictive than general links
 */
export const TELEGRAM_ALLOWED_PROTOCOLS: ReadonlyArray<string> = [
  'https:',
  'tg:',
] as const;

/**
 * Allowed hostnames for Telegram links
 */
export const TELEGRAM_ALLOWED_HOSTS: ReadonlyArray<string> = [
  't.me',
  'telegram.me',
  'telegram.org',
] as const;

/**
 * Safe fallback URL returned for invalid/dangerous URLs
 * Standard practice per @braintree/sanitize-url
 */
export const SAFE_URL_FALLBACK = 'about:blank';

// ========== Types ==========

export interface UrlValidationResult {
  /** Whether the URL is safe to open */
  isValid: boolean;
  /** Sanitized URL (original if valid, about:blank if not) */
  sanitizedUrl: string;
  /** Reason for rejection (if invalid) */
  reason?: string;
  /** Parsed protocol (if parseable) */
  protocol?: string;
}

// ========== Validation Functions ==========

/**
 * Validate URL against protocol allowlist
 *
 * Uses native URL constructor for parsing:
 * - Handles encoding/decoding automatically
 * - Normalizes protocol to lowercase
 * - Throws on invalid URL syntax
 *
 * @param url - URL string to validate
 * @param allowedProtocols - Array of allowed protocols (default: ALLOWED_PROTOCOLS)
 * @returns Validation result with sanitized URL
 *
 * @example
 * ```ts
 * validateUrl('https://example.com') // { isValid: true, sanitizedUrl: 'https://example.com' }
 * validateUrl('javascript:alert(1)') // { isValid: false, sanitizedUrl: 'about:blank', reason: '...' }
 * ```
 */
export function validateUrl(
  url: string,
  allowedProtocols: ReadonlyArray<string> = ALLOWED_PROTOCOLS
): UrlValidationResult {
  // Handle empty/null input
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      sanitizedUrl: SAFE_URL_FALLBACK,
      reason: 'Empty or invalid URL input',
    };
  }

  // Trim whitespace (common bypass technique)
  const trimmedUrl = url.trim();

  // Check for empty after trim
  if (!trimmedUrl) {
    return {
      isValid: false,
      sanitizedUrl: SAFE_URL_FALLBACK,
      reason: 'Empty URL after trimming',
    };
  }

  try {
    // URL constructor handles:
    // - Case normalization (JavaScript: -> javascript:)
    // - URL decoding (javascript%3A -> javascript:)
    // - Whitespace in protocol (java\nscript: throws)
    const parsed = new URL(trimmedUrl);

    // Protocol is always lowercase with trailing colon
    const protocol = parsed.protocol.toLowerCase();

    // Check against allowlist
    if (!allowedProtocols.includes(protocol)) {
      return {
        isValid: false,
        sanitizedUrl: SAFE_URL_FALLBACK,
        reason: `Protocol '${protocol}' not in allowlist`,
        protocol,
      };
    }

    // URL is safe
    return {
      isValid: true,
      sanitizedUrl: trimmedUrl,
      protocol,
    };
  } catch {
    // URL constructor throws for invalid URLs
    // This includes malformed URLs and some bypass attempts
    return {
      isValid: false,
      sanitizedUrl: SAFE_URL_FALLBACK,
      reason: 'Invalid URL syntax',
    };
  }
}

/**
 * Validate Telegram-specific links
 *
 * More restrictive validation for openTelegramLink():
 * - Only https: and tg: protocols
 * - Hostname must be t.me, telegram.me, or telegram.org (for https)
 *
 * @param url - Telegram URL to validate
 * @returns Validation result
 *
 * @example
 * ```ts
 * validateTelegramUrl('https://t.me/SleepCore_Bot') // valid
 * validateTelegramUrl('tg://resolve?domain=SleepCore_Bot') // valid
 * validateTelegramUrl('https://example.com') // invalid - wrong host
 * ```
 */
export function validateTelegramUrl(url: string): UrlValidationResult {
  // First, validate basic URL structure
  const baseResult = validateUrl(url, TELEGRAM_ALLOWED_PROTOCOLS);

  if (!baseResult.isValid) {
    return baseResult;
  }

  try {
    const parsed = new URL(url.trim());

    // tg: protocol doesn't need hostname validation
    if (parsed.protocol === 'tg:') {
      return baseResult;
    }

    // For https:, validate hostname
    const hostname = parsed.hostname.toLowerCase();
    if (!TELEGRAM_ALLOWED_HOSTS.includes(hostname)) {
      return {
        isValid: false,
        sanitizedUrl: SAFE_URL_FALLBACK,
        reason: `Hostname '${hostname}' not allowed for Telegram links`,
        protocol: parsed.protocol,
      };
    }

    return baseResult;
  } catch {
    return {
      isValid: false,
      sanitizedUrl: SAFE_URL_FALLBACK,
      reason: 'Invalid Telegram URL syntax',
    };
  }
}

/**
 * Quick check if URL is safe (boolean version)
 *
 * @param url - URL to check
 * @returns true if URL is safe to open
 */
export function isUrlSafe(url: string): boolean {
  return validateUrl(url).isValid;
}

/**
 * Quick check if Telegram URL is safe (boolean version)
 *
 * @param url - Telegram URL to check
 * @returns true if URL is safe for openTelegramLink
 */
export function isTelegramUrlSafe(url: string): boolean {
  return validateTelegramUrl(url).isValid;
}

/**
 * Sanitize URL - returns safe URL or fallback
 *
 * Convenience function for inline usage:
 * ```ts
 * window.open(sanitizeUrl(userInput), '_blank')
 * ```
 *
 * @param url - URL to sanitize
 * @returns Original URL if safe, 'about:blank' if dangerous
 */
export function sanitizeUrl(url: string): string {
  return validateUrl(url).sanitizedUrl;
}
