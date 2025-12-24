/**
 * Health Routes
 * =============
 * Kubernetes-compatible health check endpoints.
 */

import { Hono } from 'hono';
import { isDatabaseHealthy } from '../db/index.js';

const health = new Hono();

// Track initialization state
let isInitialized = false;

export function setInitialized(value: boolean): void {
  isInitialized = value;
}

/**
 * GET /health/live
 * Liveness probe - Is the process alive?
 */
health.get('/live', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

/**
 * GET /health/ready
 * Readiness probe - Can we accept traffic?
 */
health.get('/ready', (c) => {
  const dbHealthy = isDatabaseHealthy();

  if (!dbHealthy) {
    return c.json({
      status: 'not ready',
      checks: {
        database: 'disconnected',
      },
      timestamp: Date.now(),
    }, 503);
  }

  return c.json({
    status: 'ready',
    checks: {
      database: 'connected',
    },
    timestamp: Date.now(),
  });
});

/**
 * GET /health/startup
 * Startup probe - Have we finished initializing?
 */
health.get('/startup', (c) => {
  if (!isInitialized) {
    return c.json({
      status: 'starting',
      timestamp: Date.now(),
    }, 503);
  }

  return c.json({
    status: 'started',
    timestamp: Date.now(),
  });
});

/**
 * GET /health
 * Combined health check
 */
health.get('/', (c) => {
  const dbHealthy = isDatabaseHealthy();

  const status = {
    status: dbHealthy && isInitialized ? 'healthy' : 'unhealthy',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: dbHealthy ? 'ok' : 'error',
      initialized: isInitialized,
    },
    timestamp: Date.now(),
  };

  return c.json(status, dbHealthy && isInitialized ? 200 : 503);
});

export default health;
