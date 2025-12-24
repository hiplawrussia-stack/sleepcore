/**
 * Authentication Middleware
 * =========================
 * JWT verification and user context middleware.
 */

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '../utils/jwt.js';
import type { JWTPayload } from '../types/index.js';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
    jwtSecret: string;
    botToken: string;
  }
}

/**
 * JWT Authentication middleware
 * Verifies Bearer token and adds user to context
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const jwtSecret = c.get('jwtSecret');

  if (!jwtSecret) {
    throw new HTTPException(500, { message: 'JWT secret not configured' });
  }

  const result = await verifyToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    throw new HTTPException(401, { message: result.error || 'Invalid token' });
  }

  // Add user to context
  c.set('user', result.payload);

  await next();
});

/**
 * Optional auth middleware
 * Adds user to context if token is valid, but doesn't fail if missing
 */
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecret = c.get('jwtSecret');

    if (jwtSecret) {
      const result = await verifyToken(token, jwtSecret);

      if (result.valid && result.payload) {
        c.set('user', result.payload);
      }
    }
  }

  await next();
});

/**
 * Rate limit key extractor
 * Uses telegram ID for authenticated requests, IP for anonymous
 */
export function getRateLimitKey(c: { get: (key: string) => unknown; req: { header: (name: string) => string | undefined } }): string {
  const user = c.get('user') as JWTPayload | undefined;

  if (user?.telegramId) {
    return `user:${user.telegramId}`;
  }

  // Fall back to IP
  const forwarded = c.req.header('X-Forwarded-For');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

  return `ip:${ip}`;
}
