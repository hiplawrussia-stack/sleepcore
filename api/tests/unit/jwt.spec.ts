/**
 * JWT Utilities Tests
 * ===================
 * Tests for token generation, verification, and decoding.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokenPair,
} from '../../src/utils/jwt.js';
import type { ValidatedUser } from '../../src/types/index.js';

describe('JWT Utilities', () => {
  const testSecret = 'test-secret-key-12345678901234567890';

  const testUser: ValidatedUser = {
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    languageCode: 'ru',
    isPremium: false,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', async () => {
      const token = await generateAccessToken(testUser, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include user data in token payload', async () => {
      const token = await generateAccessToken(testUser, testSecret);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.telegramId).toBe(testUser.telegramId);
      expect(decoded?.firstName).toBe(testUser.firstName);
      expect(decoded?.username).toBe(testUser.username);
    });

    it('should set expiration time', async () => {
      const token = await generateAccessToken(testUser, testSecret);
      const decoded = decodeToken(token);

      expect(decoded?.exp).toBeDefined();
      expect(decoded?.iat).toBeDefined();
      // Access token should expire in ~15 minutes
      const expDiff = (decoded!.exp as number) - (decoded!.iat as number);
      expect(expDiff).toBe(15 * 60);
    });

    it('should include unique JTI', async () => {
      const token1 = await generateAccessToken(testUser, testSecret);
      const token2 = await generateAccessToken(testUser, testSecret);

      const decoded1 = decodeToken(token1);
      const decoded2 = decodeToken(token2);

      expect(decoded1?.jti).toBeDefined();
      expect(decoded2?.jti).toBeDefined();
      expect(decoded1?.jti).not.toBe(decoded2?.jti);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', async () => {
      const token = await generateRefreshToken(testUser, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include refresh type in payload', async () => {
      const token = await generateRefreshToken(testUser, testSecret);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.type).toBe('refresh');
      expect(decoded?.telegramId).toBe(testUser.telegramId);
    });

    it('should have longer expiration than access token', async () => {
      const refreshToken = await generateRefreshToken(testUser, testSecret);
      const accessToken = await generateAccessToken(testUser, testSecret);

      const refreshDecoded = decodeToken(refreshToken);
      const accessDecoded = decodeToken(accessToken);

      const refreshExpDiff = (refreshDecoded!.exp as number) - (refreshDecoded!.iat as number);
      const accessExpDiff = (accessDecoded!.exp as number) - (accessDecoded!.iat as number);

      expect(refreshExpDiff).toBeGreaterThan(accessExpDiff);
      // Refresh token should expire in 7 days
      expect(refreshExpDiff).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await generateAccessToken(testUser, testSecret);
      const result = await verifyToken(token, testSecret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.telegramId).toBe(testUser.telegramId);
      expect(result.error).toBeUndefined();
    });

    it('should reject token with wrong secret', async () => {
      const token = await generateAccessToken(testUser, testSecret);
      const result = await verifyToken(token, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.payload).toBeUndefined();
    });

    it('should reject malformed token', async () => {
      const result = await verifyToken('invalid.token.here', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle token verification errors gracefully', async () => {
      // Test with completely malformed token
      const result = await verifyToken('not.a.validtoken', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty token', async () => {
      const result = await verifyToken('', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', async () => {
      const token = await generateAccessToken(testUser, testSecret);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.telegramId).toBe(testUser.telegramId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('not-a-jwt');

      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeToken('');

      expect(decoded).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      const result = await generateTokenPair(testUser, testSecret);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(15 * 60);
    });

    it('should generate valid tokens', async () => {
      const result = await generateTokenPair(testUser, testSecret);

      const accessResult = await verifyToken(result.accessToken, testSecret);
      const refreshResult = await verifyToken(result.refreshToken, testSecret);

      expect(accessResult.valid).toBe(true);
      expect(refreshResult.valid).toBe(true);
    });

    it('should generate different tokens for access and refresh', async () => {
      const result = await generateTokenPair(testUser, testSecret);

      expect(result.accessToken).not.toBe(result.refreshToken);
    });
  });
});
