/**
 * API Client for VK Mini App
 * ==========================
 * HTTP client for SleepCore API with VK authentication.
 *
 * Security Architecture:
 * - NO refresh tokens stored in localStorage
 * - Re-authentication via VK launch params when token expires
 * - Memory-only token storage (XSS safe)
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/api
 */

import type { ZodSchema } from 'zod';
import { vk } from '@/services/vk';

/**
 * API configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT = 10_000;
const AUTH_TIMEOUT = 30_000;
const MAX_RETRIES = 3;

/**
 * Token manager - memory-only storage
 * NO localStorage for tokens (XSS protection)
 */
class TokenManager {
  private accessToken: string | null = null;
  private expiresAt: number | null = null;

  setTokens(accessToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.expiresAt = Date.now() + expiresIn * 1000;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isTokenExpired(): boolean {
    if (!this.expiresAt) return true;
    // Consider expired 1 minute before actual expiry
    return Date.now() >= this.expiresAt - 60_000;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.expiresAt = null;
  }
}

export const tokenManager = new TokenManager();

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Request options
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeout?: number;
  requiresAuth?: boolean;
  retry?: boolean;
}

/**
 * API Client class
 */
class ApiClient {
  /**
   * Make authenticated request to API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      timeout = DEFAULT_TIMEOUT,
      requiresAuth = true,
      retry = true,
    } = options;

    // Check auth if required
    if (requiresAuth && !tokenManager.getAccessToken()) {
      await this.authenticate();
    }

    // Re-authenticate if token expired
    if (requiresAuth && tokenManager.isTokenExpired()) {
      await this.reauthenticateViaLaunchParams();
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth header if available
    const token = tokenManager.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add VK launch params header
    const launchParams = vk.getLaunchParamsString();
    if (launchParams) {
      headers['X-VK-Launch-Params'] = launchParams;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.code
        );
      }

      const data = await response.json();
      return data.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        // Retry on 5xx errors
        if (retry && error.status >= 500 && error.status < 600) {
          return this.retryWithBackoff(() =>
            this.request<T>(endpoint, { ...options, retry: false })
          );
        }
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }

      throw new ApiError('Network error', 0, 'NETWORK_ERROR');
    }
  }

  /**
   * Request with Zod schema validation
   */
  async requestValidated<T>(
    endpoint: string,
    schema: ZodSchema<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const data = await this.request<unknown>(endpoint, options);
    return schema.parse(data);
  }

  /**
   * Request with validation and fallback on error
   */
  async requestValidatedSafe<T>(
    endpoint: string,
    schema: ZodSchema<T>,
    fallback: T,
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      return await this.requestValidated(endpoint, schema, options);
    } catch {
      return fallback;
    }
  }

  /**
   * Authenticate with VK launch params
   */
  async authenticate(): Promise<{ user: unknown }> {
    const launchParams = vk.getLaunchParamsString();
    if (!launchParams && !import.meta.env.DEV) {
      throw new ApiError('No VK launch params', 401, 'NO_LAUNCH_PARAMS');
    }

    const response = await this.request<{
      accessToken: string;
      expiresIn: number;
      user: unknown;
    }>('/auth/vk', {
      method: 'POST',
      body: { launchParams },
      timeout: AUTH_TIMEOUT,
      requiresAuth: false,
    });

    tokenManager.setTokens(response.accessToken, response.expiresIn);

    return { user: response.user };
  }

  /**
   * Re-authenticate using VK launch params
   * This is the ONLY re-auth method - no refresh tokens
   */
  async reauthenticateViaLaunchParams(): Promise<void> {
    try {
      await this.authenticate();
    } catch (error) {
      tokenManager.clearTokens();
      throw error;
    }
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new ApiError('Max retries exceeded', 0, 'MAX_RETRIES');
  }
}

/**
 * API client singleton
 */
export const apiClient = new ApiClient();

export default apiClient;
