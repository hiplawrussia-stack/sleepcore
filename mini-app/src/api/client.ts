/**
 * API Client - Secure Token Management for Telegram Mini Apps
 * ============================================================
 * Enhanced fetch wrapper with JWT authentication, retry logic, and error handling.
 *
 * Security Architecture (2025/2026 Best Practices):
 * - Access tokens stored in memory only (never localStorage)
 * - NO refresh tokens in localStorage (XSS vulnerable)
 * - Re-authentication via Telegram initData when token expires
 * - Request timeouts via AbortSignal.timeout()
 * - auth_date validation to prevent replay attacks
 *
 * References:
 * - OWASP HTML5 Security Cheat Sheet
 * - Auth0 Token Storage Best Practices
 * - Telegram Mini Apps Documentation
 *
 * @see CLAUDE.md §6 - Security requirements
 * @module @sleepcore/mini-app/api
 */

import { telegram } from '@/services/telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ========== Security Constants ==========

/** Request timeout in milliseconds (10 seconds for normal requests) */
const REQUEST_TIMEOUT_MS = 10_000;

/** Auth request timeout in milliseconds (30 seconds for auth) */
const AUTH_TIMEOUT_MS = 30_000;

/** Maximum age of initData auth_date in seconds (24 hours) */
const MAX_AUTH_DATE_AGE_SECONDS = 24 * 60 * 60;

// ========== Types ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export class AuthDateExpiredError extends Error {
  constructor(authDate: number) {
    super(`initData auth_date expired: ${new Date(authDate * 1000).toISOString()}`);
    this.name = 'AuthDateExpiredError';
  }
}

// ========== Token Management (Memory-Only) ==========

/**
 * Token manager with memory-only storage.
 *
 * SECURITY: Tokens are NEVER stored in localStorage.
 * When access token expires, re-authenticate via Telegram initData.
 *
 * This approach is recommended for Telegram Mini Apps because:
 * 1. WebView cookie/localStorage behavior is unreliable (iOS loses cookies)
 * 2. initData provides cryptographic authentication already
 * 3. Memory storage is immune to XSS token theft
 */
let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;

export const tokenManager = {
  /**
   * Set access token (memory only, no persistence)
   */
  setTokens: (access: string, _refresh: string, expiresIn: number) => {
    accessToken = access;
    tokenExpiresAt = Date.now() + expiresIn * 1000;
    // NOTE: refresh token is intentionally NOT stored
    // Re-authentication via initData is used instead
  },

  getAccessToken: () => accessToken,

  /**
   * @deprecated Refresh tokens not used in Telegram Mini Apps
   * Re-authenticate via initData instead
   */
  getRefreshToken: () => null,

  isTokenExpired: () => {
    if (!tokenExpiresAt) return true;
    // Consider expired 1 minute before actual expiry
    return Date.now() > tokenExpiresAt - 60000;
  },

  clearTokens: () => {
    accessToken = null;
    tokenExpiresAt = null;
    // Clean up any legacy localStorage tokens from previous versions
    try {
      localStorage.removeItem('sleepcore_refresh_token');
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * @deprecated Returns null - refresh tokens not used
   * Kept for backward compatibility during migration
   */
  loadStoredRefreshToken: () => null,
};

// ========== API Client ==========

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retries?: number;
  /** Custom timeout in ms (default: 10000) */
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private isReauthenticating = false;
  private reauthPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Validate initData auth_date to prevent replay attacks
   * @throws AuthDateExpiredError if auth_date is too old
   */
  private validateAuthDate(): void {
    const initDataUnsafe = telegram.getInitDataUnsafe();
    if (!initDataUnsafe?.auth_date) {
      // No auth_date available, skip validation (will be validated on backend)
      return;
    }

    const authDate = initDataUnsafe.auth_date;
    const now = Math.floor(Date.now() / 1000);
    const age = now - authDate;

    if (age > MAX_AUTH_DATE_AGE_SECONDS) {
      throw new AuthDateExpiredError(authDate);
    }
  }

  /**
   * Create AbortSignal with timeout
   * Uses modern AbortSignal.timeout() API (2025 best practice)
   */
  private createTimeoutSignal(timeoutMs: number, existingSignal?: AbortSignal): AbortSignal {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);

    if (existingSignal) {
      // Combine timeout with existing signal (e.g., user cancellation)
      return AbortSignal.any([timeoutSignal, existingSignal]);
    }

    return timeoutSignal;
  }

  /**
   * Make API request with automatic auth, timeout, and retry
   *
   * Security features:
   * - Automatic token refresh via initData (not refresh tokens)
   * - Request timeout via AbortSignal.timeout()
   * - Retry with exponential backoff for server errors
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      retries = 3,
      timeout = REQUEST_TIMEOUT_MS,
      signal: existingSignal,
      ...fetchOptions
    } = options;

    // Re-authenticate via initData if token expired
    if (!skipAuth && tokenManager.isTokenExpired()) {
      await this.reauthenticateViaInitData();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Always send initData for backend validation (defense in depth)
      'X-Telegram-Init-Data': telegram.getInitData() || '',
      ...(fetchOptions.headers || {}),
    };

    // Add auth header if we have a token
    const currentToken = tokenManager.getAccessToken();
    if (!skipAuth && currentToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${currentToken}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create timeout signal for this attempt
        // Convert null to undefined for type safety
        const signal = this.createTimeoutSignal(timeout, existingSignal ?? undefined);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal,
        });

        // Handle 401 - token expired, re-authenticate via initData
        if (response.status === 401 && !skipAuth) {
          const reauthenticated = await this.reauthenticateViaInitData();
          if (reauthenticated) {
            // Update Authorization header with new token
            const newToken = tokenManager.getAccessToken();
            if (newToken) {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            }
            continue;
          }
          throw new ApiError(401, 'Unauthorized - re-authentication failed', null);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new ApiError(response.status, response.statusText, errorData);
        }

        const data = await response.json();
        return data.data !== undefined ? data.data : data;
      } catch (error) {
        // Handle timeout errors specifically
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          lastError = new TimeoutError(timeout);
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled the request
          throw error;
        } else {
          lastError = error as Error;
        }

        // Don't retry on auth errors or client errors
        if (error instanceof ApiError && error.status < 500) {
          throw error;
        }

        // Exponential backoff for retries
        if (attempt < retries) {
          await this.delay(Math.min(1000 * Math.pow(2, attempt), 10000));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Authenticate with Telegram initData
   *
   * Security:
   * - Validates auth_date before sending
   * - Uses longer timeout for auth requests
   * - initData signature verified on backend
   */
  async authenticate(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      telegramId: number;
      firstName: string;
      lastName?: string;
      evolutionStage: string;
      xp: number;
      level: number;
    };
  }> {
    const initData = telegram.getInitData();

    if (!initData) {
      throw new Error('No Telegram initData available');
    }

    // Validate auth_date to prevent replay attacks
    this.validateAuthDate();

    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: {
        id: string;
        telegramId: number;
        firstName: string;
        lastName?: string;
        evolutionStage: string;
        xp: number;
        level: number;
      };
    }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
      skipAuth: true,
      timeout: AUTH_TIMEOUT_MS, // Longer timeout for auth
    });

    tokenManager.setTokens(
      response.accessToken,
      response.refreshToken || '', // May not be provided
      response.expiresIn
    );

    return response;
  }

  /**
   * Re-authenticate via Telegram initData
   *
   * This replaces refresh token flow for Telegram Mini Apps.
   * Benefits:
   * - No tokens stored in localStorage (XSS safe)
   * - Uses Telegram's cryptographic authentication
   * - Works reliably in WebView (unlike cookies)
   */
  private async reauthenticateViaInitData(): Promise<boolean> {
    // Prevent multiple simultaneous re-auth attempts
    if (this.isReauthenticating) {
      return this.reauthPromise || Promise.resolve(false);
    }

    const initData = telegram.getInitData();
    if (!initData) {
      console.warn('[ApiClient] No initData available for re-authentication');
      return false;
    }

    this.isReauthenticating = true;
    this.reauthPromise = (async () => {
      try {
        // Validate auth_date before re-authentication
        this.validateAuthDate();

        const response = await this.request<{
          accessToken: string;
          refreshToken?: string;
          expiresIn: number;
        }>('/auth/telegram', {
          method: 'POST',
          body: JSON.stringify({ initData }),
          skipAuth: true,
          timeout: AUTH_TIMEOUT_MS,
        });

        tokenManager.setTokens(
          response.accessToken,
          response.refreshToken || '',
          response.expiresIn
        );

        console.log('[ApiClient] Re-authenticated successfully via initData');
        return true;
      } catch (error) {
        console.error('[ApiClient] Re-authentication failed:', error);
        tokenManager.clearTokens();
        return false;
      } finally {
        this.isReauthenticating = false;
        this.reauthPromise = null;
      }
    })();

    return this.reauthPromise;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

