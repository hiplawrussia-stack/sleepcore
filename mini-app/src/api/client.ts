/**
 * API Client
 * ==========
 * Enhanced fetch wrapper with JWT authentication, retry logic, and error handling.
 * Based on 2025 best practices for React + API integration.
 */

import { telegram } from '@/services/telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

// ========== Token Management ==========

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: number | null = null;

export const tokenManager = {
  setTokens: (access: string, refresh: string, expiresIn: number) => {
    accessToken = access;
    refreshToken = refresh;
    tokenExpiresAt = Date.now() + expiresIn * 1000;

    // Persist refresh token for session recovery
    try {
      localStorage.setItem('sleepcore_refresh_token', refresh);
    } catch {
      // Ignore storage errors
    }
  },

  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,

  isTokenExpired: () => {
    if (!tokenExpiresAt) return true;
    // Consider expired 1 minute before actual expiry
    return Date.now() > tokenExpiresAt - 60000;
  },

  clearTokens: () => {
    accessToken = null;
    refreshToken = null;
    tokenExpiresAt = null;
    try {
      localStorage.removeItem('sleepcore_refresh_token');
    } catch {
      // Ignore storage errors
    }
  },

  loadStoredRefreshToken: () => {
    try {
      return localStorage.getItem('sleepcore_refresh_token');
    } catch {
      return null;
    }
  },
};

// ========== API Client ==========

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retries?: number;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make API request with automatic auth and retry
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, retries = 3, ...fetchOptions } = options;

    // Ensure we have valid tokens
    if (!skipAuth && tokenManager.isTokenExpired() && refreshToken) {
      await this.refreshTokens();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    };

    // Add auth header if we have a token
    if (!skipAuth && accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        // Handle 401 - token expired
        if (response.status === 401 && !skipAuth) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            // Retry with new token
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
            continue;
          }
          throw new ApiError(401, 'Unauthorized', null);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new ApiError(response.status, response.statusText, errorData);
        }

        const data = await response.json();
        return data.data !== undefined ? data.data : data;
      } catch (error) {
        lastError = error as Error;

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
    });

    tokenManager.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresIn
    );

    return response;
  }

  /**
   * Refresh access token
   */
  private async refreshTokens(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve(false);
    }

    const storedRefresh = refreshToken || tokenManager.loadStoredRefreshToken();
    if (!storedRefresh) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await this.request<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        }>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: storedRefresh }),
          skipAuth: true,
        });

        tokenManager.setTokens(
          response.accessToken,
          response.refreshToken,
          response.expiresIn
        );

        return true;
      } catch {
        tokenManager.clearTokens();
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

