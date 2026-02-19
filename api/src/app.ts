/**
 * Hono App Configuration
 * ======================
 * Main application setup with middleware and routes.
 *
 * Security Controls:
 * - OWASP API4:2023 — Rate limiting on all endpoints
 * - OWASP API8:2023 — CORS validation (no wildcard in production)
 * - NIST SP 800-228 — API protection guidelines
 *
 * @see https://owasp.org/API-Security/
 * @packageDocumentation
 * @module @sleepcore/api
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { bodyLimit } from 'hono/body-limit';

import {
  errorHandler,
  notFoundHandler,
  createRateLimitMiddleware,
  RATE_LIMITS,
} from './middleware/index.js';
import {
  authRoutes,
  breathingRoutes,
  userRoutes,
  syncRoutes,
  healthRoutes,
  wearableRoutes,
  leaderboardRoutes,
  downloadRoutes,
  ouraRoutes,
} from './routes/index.js';

export interface AppConfig {
  botToken: string;
  jwtSecret: string;
  corsOrigin?: string;
  /** Environment: 'production' requires explicit CORS origin */
  nodeEnv?: string;
  /** VK app secret key for launch params validation */
  vkSecretKey?: string;
}

export function createApp(config: AppConfig): Hono {
  const app = new Hono();
  const isProduction = config.nodeEnv === 'production';
  const corsOrigin = config.corsOrigin;

  // =========================================================================
  // CORS Validation (OWASP API8:2023 — Security Misconfiguration)
  // =========================================================================
  // Production MUST have explicit CORS origin — wildcard is a security risk
  if (isProduction && (!corsOrigin || corsOrigin === '*')) {
    throw new Error(
      '[SECURITY] CORS_ORIGIN must be explicitly set in production. ' +
      'Wildcard (*) is not allowed. Set CORS_ORIGIN environment variable.'
    );
  }

  // Development warning
  if (!isProduction && (!corsOrigin || corsOrigin === '*')) {
    console.warn(
      '[SECURITY] CORS origin is wildcard (*). ' +
      'Acceptable for development, but MUST be configured for production.'
    );
  }

  // =========================================================================
  // Global Middleware
  // =========================================================================
  app.use('*', logger());
  app.use('*', timing());
  app.use('*', secureHeaders());

  // =========================================================================
  // Request Body Size Limits (OWASP API4:2023 — DoS Protection)
  // =========================================================================
  // Default: 1MB for most endpoints
  app.use('*', bodyLimit({
    maxSize: 1024 * 1024, // 1MB
    onError: (c) => {
      return c.json({
        success: false,
        error: 'Request body too large',
        timestamp: Date.now(),
      }, 413);
    },
  }));

  // Wearable sync: 5MB (may contain raw HRV/HR data)
  app.use('/api/wearable/sync', bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5MB
    onError: (c) => {
      return c.json({
        success: false,
        error: 'Request body too large. Maximum size is 5MB.',
        timestamp: Date.now(),
      }, 413);
    },
  }));

  // CORS configuration
  const hasExplicitOrigin = Boolean(corsOrigin && corsOrigin !== '*');
  app.use('*', cors({
    origin: corsOrigin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-VK-Launch-Params'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    maxAge: 86400,
    // credentials only valid with explicit origin, not '*'
    credentials: hasExplicitOrigin,
  }));

  // Inject config into context
  app.use('*', async (c, next) => {
    c.set('botToken', config.botToken);
    c.set('jwtSecret', config.jwtSecret);
    if (config.vkSecretKey) {
      c.set('vkSecretKey', config.vkSecretKey);
    }
    await next();
  });

  // =========================================================================
  // Health Routes (no rate limiting, no /api prefix)
  // =========================================================================
  app.route('/health', healthRoutes);

  // =========================================================================
  // Download Routes (no rate limiting, no /api prefix)
  // =========================================================================
  app.route('/download', downloadRoutes);

  // =========================================================================
  // Rate Limiting (OWASP API4:2023 — Unrestricted Resource Consumption)
  // Order matters: more specific routes first
  // =========================================================================

  // Auth endpoints — strict limits (brute force protection)
  app.use('/api/auth/*', createRateLimitMiddleware(RATE_LIMITS.auth));

  // Sync endpoints — generous for offline-first
  app.use('/api/sync/*', createRateLimitMiddleware(RATE_LIMITS.sync));

  // General API — standard limits
  app.use('/api/*', createRateLimitMiddleware(RATE_LIMITS.api));

  // =========================================================================
  // API Routes
  // =========================================================================
  app.route('/api/auth', authRoutes);
  app.route('/api/breathing', breathingRoutes);
  app.route('/api/user', userRoutes);
  app.route('/api/sync', syncRoutes);
  app.route('/api/wearable', wearableRoutes);
  app.route('/api/leaderboard', leaderboardRoutes);
  app.route('/api/oura', ouraRoutes);

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'SleepCore API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
    });
  });

  // Error handling
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  return app;
}
