/**
 * Wearable Authentication Utilities
 * ==================================
 * JWT token generation and verification for Android Companion App.
 *
 * Device tokens are long-lived (90 days) to minimize user friction
 * while maintaining security through device ID binding.
 *
 * @packageDocumentation
 * @module api/utils
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Device token payload
 */
export interface DeviceTokenPayload extends JWTPayload {
  deviceId: string;
  userId: string;
  telegramId: number;
  type: 'device';
}

/**
 * Token generation result
 */
export interface DeviceTokenResult {
  token: string;
  expiresAt: string;
  expiresInDays: number;
}

/**
 * Token verification result
 */
export interface DeviceTokenVerification {
  valid: boolean;
  payload?: DeviceTokenPayload;
  error?: string;
}

/**
 * Generate a long-lived device token
 *
 * @param payload - Device identification data
 * @param secret - JWT signing secret
 * @param expiresInDays - Token validity in days (default: 90)
 */
export async function generateDeviceToken(
  payload: {
    deviceId: string;
    userId: string;
    telegramId: number;
  },
  secret: string,
  expiresInDays: number = 90
): Promise<DeviceTokenResult> {
  const secretKey = new TextEncoder().encode(secret);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({
    deviceId: payload.deviceId,
    userId: payload.userId,
    telegramId: payload.telegramId,
    type: 'device',
  } as DeviceTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer('sleepcore-api')
    .setAudience('sleepcore-companion')
    .sign(secretKey);

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    expiresInDays,
  };
}

/**
 * Verify a device token
 *
 * @param token - JWT token string
 * @param secret - JWT signing secret
 */
export async function verifyDeviceToken(
  token: string,
  secret: string
): Promise<DeviceTokenVerification> {
  try {
    const secretKey = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, secretKey, {
      issuer: 'sleepcore-api',
      audience: 'sleepcore-companion',
    });

    // Validate payload structure
    if (
      typeof payload.deviceId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.telegramId !== 'number' ||
      payload.type !== 'device'
    ) {
      return {
        valid: false,
        error: 'Invalid token payload structure',
      };
    }

    return {
      valid: true,
      payload: payload as DeviceTokenPayload,
    };
  } catch (err) {
    if (err instanceof Error) {
      // Handle specific JWT errors
      if (err.message.includes('expired')) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }
      if (err.message.includes('signature')) {
        return {
          valid: false,
          error: 'Invalid token signature',
        };
      }
      return {
        valid: false,
        error: err.message,
      };
    }
    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Refresh a device token (extends expiration)
 *
 * @param currentToken - Current valid token
 * @param secret - JWT signing secret
 * @param expiresInDays - New validity period
 */
export async function refreshDeviceToken(
  currentToken: string,
  secret: string,
  expiresInDays: number = 90
): Promise<DeviceTokenResult | null> {
  const verification = await verifyDeviceToken(currentToken, secret);

  if (!verification.valid || !verification.payload) {
    return null;
  }

  return generateDeviceToken(
    {
      deviceId: verification.payload.deviceId,
      userId: verification.payload.userId,
      telegramId: verification.payload.telegramId,
    },
    secret,
    expiresInDays
  );
}
