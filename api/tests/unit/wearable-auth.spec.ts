/**
 * Wearable Auth Unit Tests
 * ========================
 * Tests for JWT device token generation and verification.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDeviceToken,
  verifyDeviceToken,
  refreshDeviceToken,
} from '../../src/utils/wearable-auth.js';

const TEST_SECRET = 'test-jwt-secret-key-1234567890abcdef';

describe('generateDeviceToken', () => {
  it('should generate a valid JWT token', async () => {
    const result = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^eyJ/); // JWT header starts with eyJ
    expect(result.expiresAt).toBeDefined();
    expect(result.expiresInDays).toBe(90);
  });

  it('should generate token with default 90 days expiration', async () => {
    const result = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    expect(result.expiresInDays).toBe(90);

    const expiresAt = new Date(result.expiresAt);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeGreaterThan(89);
    expect(diffDays).toBeLessThan(91);
  });

  it('should generate token with custom expiration', async () => {
    const result = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET,
      30
    );

    expect(result.expiresInDays).toBe(30);

    const expiresAt = new Date(result.expiresAt);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it('should generate unique tokens for different devices', async () => {
    const result1 = await generateDeviceToken(
      {
        deviceId: 'device-1',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const result2 = await generateDeviceToken(
      {
        deviceId: 'device-2',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    // Different deviceIds mean different tokens
    expect(result1.token).not.toBe(result2.token);
  });

  it('should include ISO 8601 expiresAt timestamp', async () => {
    const result = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('verifyDeviceToken', () => {
  it('should verify a valid token', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const result = await verifyDeviceToken(token, TEST_SECRET);

    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.deviceId).toBe('device-123');
    expect(result.payload?.userId).toBe('user-456');
    expect(result.payload?.telegramId).toBe(123456789);
    expect(result.payload?.type).toBe('device');
  });

  it('should reject token with wrong secret', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const result = await verifyDeviceToken(token, 'wrong-secret');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token signature');
  });

  it('should reject malformed token', async () => {
    const result = await verifyDeviceToken('invalid-token', TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject empty token', async () => {
    const result = await verifyDeviceToken('', TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject token with missing parts', async () => {
    const result = await verifyDeviceToken('header.payload', TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should include payload details on successful verification', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'my-device',
        userId: 'my-user',
        telegramId: 999888777,
      },
      TEST_SECRET
    );

    const result = await verifyDeviceToken(token, TEST_SECRET);

    expect(result.valid).toBe(true);
    expect(result.payload).toMatchObject({
      deviceId: 'my-device',
      userId: 'my-user',
      telegramId: 999888777,
      type: 'device',
    });
  });
});

describe('refreshDeviceToken', () => {
  it('should refresh a valid token', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET,
      30 // 30 days
    );

    const result = await refreshDeviceToken(token, TEST_SECRET);

    expect(result).not.toBeNull();
    expect(result?.token).toBeDefined();
    expect(result?.token).not.toBe(token);
    expect(result?.expiresInDays).toBe(90); // Default expiration
  });

  it('should refresh with custom expiration', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const result = await refreshDeviceToken(token, TEST_SECRET, 60);

    expect(result).not.toBeNull();
    expect(result?.expiresInDays).toBe(60);
  });

  it('should return null for invalid token', async () => {
    const result = await refreshDeviceToken('invalid-token', TEST_SECRET);

    expect(result).toBeNull();
  });

  it('should return null for token with wrong secret', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const result = await refreshDeviceToken(token, 'wrong-secret');

    expect(result).toBeNull();
  });

  it('should preserve payload data in refreshed token', async () => {
    const originalPayload = {
      deviceId: 'original-device',
      userId: 'original-user',
      telegramId: 111222333,
    };

    const { token } = await generateDeviceToken(originalPayload, TEST_SECRET);
    const refreshed = await refreshDeviceToken(token, TEST_SECRET);

    expect(refreshed).not.toBeNull();

    const verified = await verifyDeviceToken(refreshed!.token, TEST_SECRET);

    expect(verified.valid).toBe(true);
    expect(verified.payload?.deviceId).toBe(originalPayload.deviceId);
    expect(verified.payload?.userId).toBe(originalPayload.userId);
    expect(verified.payload?.telegramId).toBe(originalPayload.telegramId);
  });
});

describe('Token security', () => {
  it('should include issuer claim', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    // Decode payload (without verification) to check issuer
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    expect(payload.iss).toBe('sleepcore-api');
  });

  it('should include audience claim', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    expect(payload.aud).toBe('sleepcore-companion');
  });

  it('should include issued at timestamp', async () => {
    const before = Math.floor(Date.now() / 1000);

    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const after = Math.floor(Date.now() / 1000);

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
  });

  it('should use HS256 algorithm', async () => {
    const { token } = await generateDeviceToken(
      {
        deviceId: 'device-123',
        userId: 'user-456',
        telegramId: 123456789,
      },
      TEST_SECRET
    );

    const parts = token.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

    expect(header.alg).toBe('HS256');
  });
});
