/**
 * JWT Utilities
 * =============
 * JSON Web Token generation and verification using jose library.
 * Follows RFC8725 best practices.
 */

import * as jose from 'jose';
import { nanoid } from 'nanoid';
import type { JWTPayload, ValidatedUser } from '../types/index.js';
import type { ValidatedVKUser } from './vk.js';

// JWT configuration
const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL = '15m';  // 15 minutes
const REFRESH_TOKEN_TTL = '7d';  // 7 days

/**
 * Generate JWT secret from bot token
 * In production, use a separate secret
 */
function getSecret(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

/**
 * Generate access token
 */
export async function generateAccessToken(
  user: ValidatedUser,
  jwtSecret: string
): Promise<string> {
  const secret = getSecret(jwtSecret);

  const token = await new jose.SignJWT({
    telegramId: user.telegramId,
    firstName: user.firstName,
    username: user.username,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setJti(nanoid())
    .sign(secret);

  return token;
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(
  user: ValidatedUser,
  jwtSecret: string
): Promise<string> {
  const secret = getSecret(jwtSecret);

  const token = await new jose.SignJWT({
    telegramId: user.telegramId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(nanoid())
    .sign(secret);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(
  token: string,
  jwtSecret: string
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const secret = getSecret(jwtSecret);

    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    return {
      valid: true,
      payload: payload as unknown as JWTPayload,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jose.errors.JWTInvalid) {
      return { valid: false, error: 'Invalid token' };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token);
    return decoded as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate both access and refresh tokens for Telegram users
 */
export async function generateTokenPair(
  user: ValidatedUser,
  jwtSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user, jwtSecret),
    generateRefreshToken(user, jwtSecret),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Generate access token for VK user
 */
export async function generateAccessTokenForVK(
  user: ValidatedVKUser,
  jwtSecret: string
): Promise<string> {
  const secret = getSecret(jwtSecret);

  const token = await new jose.SignJWT({
    vkId: user.vkId,
    firstName: user.firstName,
    provider: 'vk',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setJti(nanoid())
    .sign(secret);

  return token;
}

/**
 * Generate refresh token for VK user
 */
export async function generateRefreshTokenForVK(
  user: ValidatedVKUser,
  jwtSecret: string
): Promise<string> {
  const secret = getSecret(jwtSecret);

  const token = await new jose.SignJWT({
    vkId: user.vkId,
    type: 'refresh',
    provider: 'vk',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(nanoid())
    .sign(secret);

  return token;
}

/**
 * Generate both access and refresh tokens for VK users
 */
export async function generateTokenPairForVK(
  user: ValidatedVKUser,
  jwtSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessTokenForVK(user, jwtSecret),
    generateRefreshTokenForVK(user, jwtSecret),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}
