/**
 * Oura Client Unit Tests
 * ======================
 * Tests for Oura Ring API client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OuraClient } from '../../src/integrations/oura/OuraClient.js';

describe('OuraClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://example.com/callback',
  };

  let client: OuraClient;

  beforeEach(() => {
    client = new OuraClient(mockConfig);
    vi.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL with default scopes', () => {
      const state = 'test-state-123';
      const url = client.getAuthorizationUrl(state);

      expect(url).toContain('https://cloud.ouraring.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=sleep+daily+heartrate+personal');
    });

    it('should generate URL with custom scopes', () => {
      const state = 'test-state';
      const url = client.getAuthorizationUrl(state, ['sleep', 'heartrate']);

      expect(url).toContain('scope=sleep+heartrate');
      expect(url).not.toContain('daily');
      expect(url).not.toContain('personal');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no credentials set', () => {
      expect(client.isTokenExpired()).toBe(true);
    });

    it('should return false when token is not expired', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      client.setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: futureDate,
        scope: ['sleep'],
      });

      expect(client.isTokenExpired()).toBe(false);
    });

    it('should return true when token is expired', () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      client.setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: pastDate,
        scope: ['sleep'],
      });

      expect(client.isTokenExpired()).toBe(true);
    });

    it('should return true when token expires within buffer period', () => {
      const almostExpired = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      client.setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: almostExpired,
        scope: ['sleep'],
      });

      // With default 5 minute buffer
      expect(client.isTokenExpired(5)).toBe(true);
      // With 1 minute buffer
      expect(client.isTokenExpired(1)).toBe(false);
    });
  });

  describe('getCredentials', () => {
    it('should return null when no credentials set', () => {
      expect(client.getCredentials()).toBeNull();
    });

    it('should return credentials after setting', () => {
      const credentials = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(),
        scope: ['sleep', 'heartrate'],
      };

      client.setCredentials(credentials);
      const result = client.getCredentials();

      expect(result).toEqual(credentials);
    });
  });
});

describe('OuraClient API endpoints', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://example.com/callback',
  };

  it('should throw error when not authenticated', async () => {
    const client = new OuraClient(mockConfig);

    await expect(client.getPersonalInfo()).rejects.toThrow('Not authenticated');
  });

  it('should throw error when refreshing without token', async () => {
    const client = new OuraClient(mockConfig);

    await expect(client.refreshAccessToken()).rejects.toThrow('No refresh token available');
  });
});
