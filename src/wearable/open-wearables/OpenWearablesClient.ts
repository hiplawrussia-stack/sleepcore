/**
 * Open Wearables API Client
 *
 * HTTP client for communicating with Open Wearables API.
 * Supports both self-hosted and cloud deployments.
 *
 * @packageDocumentation
 * @module wearable/open-wearables
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Error normalization
 * - Rate limit handling
 *
 * @since 2026-02
 */

import {
  IOpenWearablesConfig,
  IOpenWearablesSleepRequest,
  IOpenWearablesSleepListResponse,
  IOpenWearablesProvidersResponse,
  IOpenWearablesConnectRequest,
  IOpenWearablesConnectResponse,
  IOpenWearablesError,
  IOpenWearablesSyncStatus,
  OpenWearablesProvider,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<IOpenWearablesConfig> = {
  timeout: 30000, // 30 seconds
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
  },
};

/**
 * Open Wearables API Client
 *
 * Example usage:
 * ```typescript
 * const client = new OpenWearablesClient({
 *   baseUrl: 'https://api.openwearables.local',
 *   apiKey: 'your-api-key'
 * });
 *
 * const sessions = await client.getSleepSessions({
 *   userId: 'user123',
 *   startDate: '2026-02-01',
 *   endDate: '2026-02-07',
 *   includeHrv: true
 * });
 * ```
 */
export class OpenWearablesClient {
  private readonly config: Required<IOpenWearablesConfig>;

  constructor(config: IOpenWearablesConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout!,
      retry: config.retry ?? DEFAULT_CONFIG.retry!,
    } as Required<IOpenWearablesConfig>;

    // Validate required config
    if (!this.config.baseUrl) {
      throw new Error('OpenWearablesClient: baseUrl is required');
    }
    if (!this.config.apiKey) {
      throw new Error('OpenWearablesClient: apiKey is required');
    }
  }

  /**
   * Get sleep sessions for a user
   *
   * @param request - Request parameters
   * @returns Sleep sessions list response
   */
  async getSleepSessions(
    request: IOpenWearablesSleepRequest
  ): Promise<IOpenWearablesSleepListResponse> {
    const queryParams = new URLSearchParams({
      user_id: request.userId,
      start_date: request.startDate,
      end_date: request.endDate,
    });

    if (request.providers && request.providers.length > 0) {
      queryParams.set('providers', request.providers.join(','));
    }
    if (request.includeHrv !== undefined) {
      queryParams.set('include_hrv', String(request.includeHrv));
    }
    if (request.includeSpo2 !== undefined) {
      queryParams.set('include_spo2', String(request.includeSpo2));
    }
    if (request.includeRespiration !== undefined) {
      queryParams.set('include_respiration', String(request.includeRespiration));
    }
    if (request.includeTemperature !== undefined) {
      queryParams.set('include_temperature', String(request.includeTemperature));
    }
    if (request.page !== undefined) {
      queryParams.set('page', String(request.page));
    }
    if (request.perPage !== undefined) {
      queryParams.set('per_page', String(request.perPage));
    }

    return this.request<IOpenWearablesSleepListResponse>(
      'GET',
      `/v1/sleep?${queryParams.toString()}`
    );
  }

  /**
   * Get a single sleep session by ID
   *
   * @param sessionId - Session ID
   * @returns Sleep session data
   */
  async getSleepSession(
    sessionId: string
  ): Promise<IOpenWearablesSleepListResponse['sessions'][0]> {
    return this.request('GET', `/v1/sleep/${sessionId}`);
  }

  /**
   * Get connected providers for a user
   *
   * @param userId - User ID
   * @returns Connected providers
   */
  async getConnectedProviders(
    userId: string
  ): Promise<IOpenWearablesProvidersResponse> {
    return this.request<IOpenWearablesProvidersResponse>(
      'GET',
      `/v1/users/${userId}/connections`
    );
  }

  /**
   * Initiate OAuth connection for a provider
   *
   * @param request - Connection request
   * @returns OAuth authorization URL
   */
  async initiateConnection(
    request: IOpenWearablesConnectRequest
  ): Promise<IOpenWearablesConnectResponse> {
    return this.request<IOpenWearablesConnectResponse>(
      'POST',
      `/v1/users/${request.userId}/connect`,
      {
        provider: request.provider,
        redirect_url: request.redirectUrl,
        scopes: request.scopes,
      }
    );
  }

  /**
   * Disconnect a provider for a user
   *
   * @param userId - User ID
   * @param provider - Provider to disconnect
   */
  async disconnectProvider(
    userId: string,
    provider: OpenWearablesProvider
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/v1/users/${userId}/connections/${provider}`
    );
  }

  /**
   * Trigger manual sync for a user
   *
   * @param userId - User ID
   * @param providers - Specific providers to sync (optional)
   */
  async triggerSync(
    userId: string,
    providers?: OpenWearablesProvider[]
  ): Promise<void> {
    await this.request('POST', `/v1/users/${userId}/sync`, {
      providers,
    });
  }

  /**
   * Get sync status for a user
   *
   * @param userId - User ID
   * @returns Sync status
   */
  async getSyncStatus(userId: string): Promise<IOpenWearablesSyncStatus> {
    return this.request<IOpenWearablesSyncStatus>(
      'GET',
      `/v1/users/${userId}/sync/status`
    );
  }

  /**
   * Health check for the API
   *
   * @returns true if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('GET', '/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Client': 'sleepcore/1.0',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({})) as IOpenWearablesError;
          throw new OpenWearablesAPIError(
            errorBody.message || `HTTP ${response.status}`,
            response.status,
            errorBody.code || 'UNKNOWN_ERROR',
            errorBody.requestId
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (error instanceof OpenWearablesAPIError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retry.maxAttempts) {
          break;
        }

        // Exponential backoff
        const delay = this.config.retry.baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenWearablesAPIError(
          'Request timeout',
          408,
          'TIMEOUT',
          undefined
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error class for Open Wearables API errors
 */
export class OpenWearablesAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'OpenWearablesAPIError';
  }
}

/**
 * Factory function for creating client
 */
export function createOpenWearablesClient(
  config: IOpenWearablesConfig
): OpenWearablesClient {
  return new OpenWearablesClient(config);
}
