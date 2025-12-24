/**
 * SleepCore API Entry Point
 * =========================
 * Backend API for Telegram Mini App.
 *
 * Usage:
 *   npm run dev   - Development with hot reload
 *   npm run build - Build for production
 *   npm start     - Run production build
 */

import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { setInitialized } from './routes/health.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || process.env.BOT_TOKEN || '';
const DATABASE_PATH = process.env.DATABASE_PATH || './database/api.db';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Validate required config
if (!BOT_TOKEN) {
  console.error('[API] ERROR: BOT_TOKEN environment variable is required');
  process.exit(1);
}

console.log('[API] Starting SleepCore API...');
console.log(`[API] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[API] Database: ${DATABASE_PATH}`);

// Initialize database
try {
  initDatabase(DATABASE_PATH);
  console.log('[API] Database initialized');
} catch (error) {
  console.error('[API] Database initialization failed:', error);
  process.exit(1);
}

// Create Hono app
const app = createApp({
  botToken: BOT_TOKEN,
  jwtSecret: JWT_SECRET,
  corsOrigin: CORS_ORIGIN,
});

// Mark as initialized
setInitialized(true);

// Start server
serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});

console.log(`[API] Server running at http://${HOST}:${PORT}`);
console.log('[API] Health check: /health');
console.log('[API] API endpoints: /api/*');

// Graceful shutdown
const shutdown = () => {
  console.log('\n[API] Shutting down...');
  setInitialized(false);
  closeDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
