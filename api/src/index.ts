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

// IMPORTANT: Sentry must be initialized FIRST for proper error capture
import { initSentry, flush as flushSentry } from './utils/sentry.js';
initSentry();

import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { setInitialized } from './routes/health.js';
import { getEncryptionService, isEncryptionAvailable } from './utils/encryption.js';

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

// =========================================================================
// PHI Encryption Validation (HIPAA Compliance)
// =========================================================================
// Production MUST have encryption configured for wearable health data
// @see CLAUDE.md §2.2 — PHI encryption requirements
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (!isEncryptionAvailable()) {
    console.error(
      '[API] ERROR: PHI encryption is required in production.\n' +
      '  Set ENCRYPTION_MASTER_KEY and ENCRYPTION_MASTER_KEY_SALT environment variables.\n' +
      '  Generate keys with:\n' +
      '    ENCRYPTION_MASTER_KEY: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      '    ENCRYPTION_MASTER_KEY_SALT: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"\n'
    );
    process.exit(1);
  }

  // Validate key integrity
  try {
    getEncryptionService();
    console.log('[API] PHI encryption initialized and validated');
  } catch (error) {
    console.error('[API] PHI encryption initialization failed:', error);
    process.exit(1);
  }
} else {
  // Development: warn if encryption not configured
  if (!isEncryptionAvailable()) {
    console.warn(
      '[API] WARNING: PHI encryption not configured. Wearable health data will be stored unencrypted.\n' +
      '  This is acceptable for development, but MUST be configured for production.'
    );
  } else {
    try {
      getEncryptionService();
      console.log('[API] PHI encryption initialized (development mode)');
    } catch (error) {
      console.warn('[API] PHI encryption configuration error:', error);
    }
  }
}

// Create Hono app
const app = createApp({
  botToken: BOT_TOKEN,
  jwtSecret: JWT_SECRET,
  corsOrigin: CORS_ORIGIN,
  nodeEnv: process.env.NODE_ENV,
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
const shutdown = async () => {
  console.log('\n[API] Shutting down...');
  setInitialized(false);

  // Flush Sentry events before exit
  await flushSentry(2000);

  closeDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
