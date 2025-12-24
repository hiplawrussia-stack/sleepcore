/**
 * Hono App Configuration
 * ======================
 * Main application setup with middleware and routes.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

import { errorHandler, notFoundHandler } from './middleware/index.js';
import {
  authRoutes,
  breathingRoutes,
  userRoutes,
  syncRoutes,
  healthRoutes,
} from './routes/index.js';

export interface AppConfig {
  botToken: string;
  jwtSecret: string;
  corsOrigin?: string;
}

export function createApp(config: AppConfig): Hono {
  const app = new Hono();

  // Global middleware
  app.use('*', logger());
  app.use('*', timing());
  app.use('*', secureHeaders());

  // CORS configuration
  app.use('*', cors({
    origin: config.corsOrigin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
    credentials: true,
  }));

  // Inject config into context
  app.use('*', async (c, next) => {
    c.set('botToken', config.botToken);
    c.set('jwtSecret', config.jwtSecret);
    await next();
  });

  // Health routes (no /api prefix)
  app.route('/health', healthRoutes);

  // API routes
  app.route('/api/auth', authRoutes);
  app.route('/api/breathing', breathingRoutes);
  app.route('/api/user', userRoutes);
  app.route('/api/sync', syncRoutes);

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
