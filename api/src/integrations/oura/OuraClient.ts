/**
 * Oura Ring API Client
 * ====================
 * OAuth2-authenticated client for Oura API v2.
 *
 * Rate Limits: 5,000 requests per 5 minutes (~1,000/min)
 * @see https://cloud.ouraring.com/v2/docs
 *
 * @packageDocumentation
 * @module api/integrations/oura
 */

import type {
  OuraTokenResponse,
  OuraCredentials,
  OuraSleepDocument,
  OuraDailySleep,
  OuraHeartRate,
  OuraPersonalInfo,
  OuraPaginatedResponse,
  OuraScope,
} from './types.js';

/**
 * Oura API configuration
 */
export interface OuraClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Oura API v2 Client
 *
 * Implements OAuth2 authentication flow and data fetching.
 */
export class OuraClient {
  private static readonly API_BASE = 'https://api.ouraring.com/v2';
  private static readonly AUTH_BASE = 'https://cloud.ouraring.com';
  private static readonly TOKEN_URL = 'https://api.ouraring.com/oauth/token';
  private static readonly REVOKE_URL = 'https://api.ouraring.com/oauth/revoke';

  private readonly config: OuraClientConfig;
  private credentials: OuraCredentials | null = null;

  constructor(config: OuraClientConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth2 authorization URL
   *
   * @param state - CSRF protection state
   * @param scopes - Requested scopes (default: SLEEPCORE_REQUIRED_SCOPES)
   */
  getAuthorizationUrl(state: string, scopes: OuraScope[] = ['sleep', 'daily', 'heartrate', 'personal']): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state,
    });

    return `${OuraClient.AUTH_BASE}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code - Authorization code from OAuth callback
   */
  async exchangeCode(code: string): Promise<OuraCredentials> {
    const response = await fetch(OuraClient.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OuraTokenResponse;

    this.credentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope?.split(' ') || [],
    };

    return this.credentials;
  }

  /**
   * Refresh access token
   *
   * @param refreshToken - Refresh token (optional, uses stored if available)
   */
  async refreshAccessToken(refreshToken?: string): Promise<OuraCredentials> {
    const token = refreshToken || this.credentials?.refreshToken;

    if (!token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(OuraClient.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OuraTokenResponse;

    this.credentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope?.split(' ') || this.credentials?.scope || [],
    };

    return this.credentials;
  }

  /**
   * Revoke access token
   */
  async revokeToken(): Promise<void> {
    if (!this.credentials?.accessToken) {
      return;
    }

    await fetch(`${OuraClient.REVOKE_URL}?access_token=${this.credentials.accessToken}`, {
      method: 'POST',
    });

    this.credentials = null;
  }

  /**
   * Set credentials (from database)
   */
  setCredentials(credentials: OuraCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Get current credentials
   */
  getCredentials(): OuraCredentials | null {
    return this.credentials;
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.credentials) {
      return true;
    }

    const bufferMs = bufferMinutes * 60 * 1000;
    return this.credentials.expiresAt.getTime() - bufferMs < Date.now();
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.credentials?.accessToken) {
      throw new Error('Not authenticated');
    }

    // Auto-refresh if token is expired
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    const response = await fetch(`${OuraClient.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Oura API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as T;
  }

  // ============================================================================
  // Data Endpoints
  // ============================================================================

  /**
   * Get personal info
   */
  async getPersonalInfo(): Promise<OuraPersonalInfo> {
    return this.apiRequest<OuraPersonalInfo>('/usercollection/personal_info');
  }

  /**
   * Get sleep documents for date range
   *
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getSleep(
    startDate: string,
    endDate: string
  ): Promise<OuraPaginatedResponse<OuraSleepDocument>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    return this.apiRequest<OuraPaginatedResponse<OuraSleepDocument>>(
      `/usercollection/sleep?${params.toString()}`
    );
  }

  /**
   * Get daily sleep summaries for date range
   *
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getDailySleep(
    startDate: string,
    endDate: string
  ): Promise<OuraPaginatedResponse<OuraDailySleep>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    return this.apiRequest<OuraPaginatedResponse<OuraDailySleep>>(
      `/usercollection/daily_sleep?${params.toString()}`
    );
  }

  /**
   * Get heart rate data for date range
   *
   * @param startDateTime - Start datetime (ISO 8601)
   * @param endDateTime - End datetime (ISO 8601)
   */
  async getHeartRate(
    startDateTime: string,
    endDateTime: string
  ): Promise<OuraPaginatedResponse<OuraHeartRate>> {
    const params = new URLSearchParams({
      start_datetime: startDateTime,
      end_datetime: endDateTime,
    });

    return this.apiRequest<OuraPaginatedResponse<OuraHeartRate>>(
      `/usercollection/heartrate?${params.toString()}`
    );
  }

  /**
   * Get all sleep data with pagination
   *
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getAllSleep(
    startDate: string,
    endDate: string
  ): Promise<OuraSleepDocument[]> {
    const allData: OuraSleepDocument[] = [];
    let nextToken: string | null = null;

    do {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (nextToken) {
        params.set('next_token', nextToken);
      }

      const response = await this.apiRequest<OuraPaginatedResponse<OuraSleepDocument>>(
        `/usercollection/sleep?${params.toString()}`
      );

      allData.push(...response.data);
      nextToken = response.next_token;
    } while (nextToken);

    return allData;
  }
}
