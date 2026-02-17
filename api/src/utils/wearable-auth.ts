/**
 * Wearable Authentication Utilities
 * ==================================
 * JWT token generation and verification for Android Companion App.
 *
 * Architecture based on RFC 8628 + OAuth 2.0 best practices:
 * - Access tokens: short-lived (1 hour)
 * - Refresh tokens: longer-lived (30 days), rotated on use
 * - Token family tracking for reuse detection
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8628
 * @see https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
 * @packageDocumentation
 * @module api/utils
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomBytes } from 'crypto';

// ============================================================================
// Constants (RFC 8628 + Best Practices)
// ============================================================================

/** Access token lifetime: 1 hour */
export const ACCESS_TOKEN_LIFETIME_HOURS = 1;

/** Refresh token lifetime: 30 days */
export const REFRESH_TOKEN_LIFETIME_DAYS = 30;

/** Link code lifetime: 15 minutes (RFC 8628 standard) */
export const LINK_CODE_LIFETIME_MINUTES = 15;

/** Max attempts for link code (rate limiting) */
export const MAX_LINK_CODE_ATTEMPTS = 5;

/** User code length (human-readable) */
export const USER_CODE_LENGTH = 6;

/** Device code length (high entropy) */
export const DEVICE_CODE_LENGTH = 32;

// Characters for user code (excluding confusing chars: 0/O, 1/I/L)
const USER_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ============================================================================
// Types
// ============================================================================

/**
 * Access token payload
 */
export interface AccessTokenPayload extends JWTPayload {
  deviceId: string;
  userId: string;
  telegramId: number;
  type: 'access';
  family: string; // Token family for rotation tracking
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload extends JWTPayload {
  deviceId: string;
  userId: string;
  telegramId: number;
  type: 'refresh';
  family: string;
}

/**
 * Token pair result
 */
export interface TokenPairResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenFamily: string;
}

/**
 * Token verification result
 */
export interface TokenVerification<T extends JWTPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
}

/**
 * Link code generation result
 */
export interface LinkCodeResult {
  userCode: string;      // Human-readable, 6 chars
  deviceCode: string;    // High entropy, for app polling
  expiresAt: string;
  expiresInSeconds: number;
}

// ============================================================================
// Code Generation (RFC 8628)
// ============================================================================

/**
 * Generate cryptographically secure user code
 * RFC 8628: Should be human-readable, excludes confusing characters
 */
export function generateUserCode(): string {
  const bytes = randomBytes(USER_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < USER_CODE_LENGTH; i++) {
    code += USER_CODE_CHARS[bytes[i] % USER_CODE_CHARS.length];
  }
  return code;
}

/**
 * Generate high-entropy device code
 * RFC 8628: Should have very high entropy (not displayed to user)
 */
export function generateDeviceCode(): string {
  return randomBytes(DEVICE_CODE_LENGTH).toString('base64url');
}

/**
 * Generate token family ID for rotation tracking
 */
export function generateTokenFamily(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate link codes for device authorization
 * @returns User code (display) + device code (polling)
 */
export function generateLinkCodes(): LinkCodeResult {
  const expiresAt = new Date(Date.now() + LINK_CODE_LIFETIME_MINUTES * 60 * 1000);

  return {
    userCode: generateUserCode(),
    deviceCode: generateDeviceCode(),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: LINK_CODE_LIFETIME_MINUTES * 60,
  };
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate access + refresh token pair
 *
 * @param payload - Device identification data
 * @param secret - JWT signing secret
 * @param existingFamily - Existing token family (for rotation) or null for new
 */
export async function generateTokenPair(
  payload: {
    deviceId: string;
    userId: string;
    telegramId: number;
  },
  secret: string,
  existingFamily?: string
): Promise<TokenPairResult> {
  const secretKey = new TextEncoder().encode(secret);
  const family = existingFamily || generateTokenFamily();

  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  // Generate access token (short-lived)
  const accessToken = await new SignJWT({
    deviceId: payload.deviceId,
    userId: payload.userId,
    telegramId: payload.telegramId,
    type: 'access',
    family,
  } as AccessTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(accessExpiresAt)
    .setIssuer('sleepcore-api')
    .setAudience('sleepcore-companion')
    .sign(secretKey);

  // Generate refresh token (longer-lived)
  const refreshToken = await new SignJWT({
    deviceId: payload.deviceId,
    userId: payload.userId,
    telegramId: payload.telegramId,
    type: 'refresh',
    family,
  } as RefreshTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(refreshExpiresAt)
    .setIssuer('sleepcore-api')
    .setAudience('sleepcore-companion')
    .sign(secretKey);

  return {
    accessToken,
    accessTokenExpiresAt: accessExpiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    tokenFamily: family,
  };
}

// ============================================================================
// Token Verification
// ============================================================================

/**
 * Verify an access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<TokenVerification<AccessTokenPayload>> {
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
      typeof payload.family !== 'string' ||
      payload.type !== 'access'
    ) {
      return {
        valid: false,
        error: 'Invalid access token payload',
      };
    }

    return {
      valid: true,
      payload: payload as AccessTokenPayload,
    };
  } catch (err) {
    return handleTokenError(err);
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<TokenVerification<RefreshTokenPayload>> {
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
      typeof payload.family !== 'string' ||
      payload.type !== 'refresh'
    ) {
      return {
        valid: false,
        error: 'Invalid refresh token payload',
      };
    }

    return {
      valid: true,
      payload: payload as RefreshTokenPayload,
    };
  } catch (err) {
    return handleTokenError(err);
  }
}

/**
 * Handle JWT verification errors
 */
function handleTokenError(err: unknown): TokenVerification<never> {
  if (err instanceof Error) {
    if (err.message.includes('expired')) {
      return { valid: false, error: 'Token expired' };
    }
    if (err.message.includes('signature')) {
      return { valid: false, error: 'Invalid token signature' };
    }
    return { valid: false, error: err.message };
  }
  return { valid: false, error: 'Token verification failed' };
}

// ============================================================================
// Legacy Support (for backward compatibility during migration)
// ============================================================================

/** @deprecated Use generateTokenPair instead */
export interface DeviceTokenPayload extends JWTPayload {
  deviceId: string;
  userId: string;
  telegramId: number;
  type: 'device';
}

/** @deprecated Use generateTokenPair instead */
export interface DeviceTokenResult {
  token: string;
  expiresAt: string;
  expiresInDays: number;
}

/** @deprecated Use generateTokenPair instead */
export interface DeviceTokenVerification {
  valid: boolean;
  payload?: DeviceTokenPayload;
  error?: string;
}

/** @deprecated Use generateTokenPair instead */
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

/** @deprecated Use verifyAccessToken instead */
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

    if (
      typeof payload.deviceId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.telegramId !== 'number' ||
      payload.type !== 'device'
    ) {
      return { valid: false, error: 'Invalid token payload structure' };
    }

    return { valid: true, payload: payload as DeviceTokenPayload };
  } catch (err) {
    return handleTokenError(err) as DeviceTokenVerification;
  }
}

/** @deprecated Use token refresh endpoint instead */
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
