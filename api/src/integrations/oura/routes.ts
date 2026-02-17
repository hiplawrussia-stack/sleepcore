/**
 * Oura Ring API Routes
 * ====================
 * OAuth2 flow and sync endpoints for Oura Ring integration.
 *
 * Endpoints:
 * - GET  /api/oura/connect     - Initiate OAuth flow
 * - GET  /api/oura/callback    - OAuth callback
 * - POST /api/oura/sync        - Manual sync
 * - GET  /api/oura/status      - Connection status
 * - POST /api/oura/disconnect  - Revoke connection
 *
 * @packageDocumentation
 * @module api/integrations/oura
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, lt } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDatabase } from '../../db/index.js';
import { ouraOAuthStates } from './schema.js';
import { OuraSyncService } from './OuraSyncService.js';
import type { ApiResponse } from '../../types/index.js';

const oura = new Hono();

// ============================================================================
// Configuration
// ============================================================================

function getOuraConfig() {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new HTTPException(500, {
      message: 'Oura integration not configured',
    });
  }

  return { clientId, clientSecret, redirectUri };
}

function getSyncService() {
  const config = getOuraConfig();
  return new OuraSyncService(config);
}

// ============================================================================
// Validation Schemas
// ============================================================================

const initiateConnectSchema = z.object({
  userId: z.string().min(1),
  telegramId: z.number().int().positive(),
});

const syncSchema = z.object({
  daysBack: z.number().int().min(1).max(30).default(7),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/oura/connect
 * Initiate OAuth2 flow - generates authorization URL
 *
 * Called from Telegram bot when user wants to connect Oura Ring
 */
oura.post('/connect', zValidator('json', initiateConnectSchema), async (c) => {
  const { userId, telegramId } = c.req.valid('json');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Generate state for CSRF protection
  const state = nanoid(32);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Store state
  await db.insert(ouraOAuthStates).values({
    state,
    userId,
    telegramId,
    createdAt: now,
    expiresAt,
  });

  // Clean up expired states
  await db
    .delete(ouraOAuthStates)
    .where(lt(ouraOAuthStates.expiresAt, now));

  // Generate authorization URL
  const syncService = getSyncService();
  const authUrl = syncService.getAuthorizationUrl(state);

  const response: ApiResponse<{
    authUrl: string;
    expiresAt: string;
  }> = {
    success: true,
    data: {
      authUrl,
      expiresAt,
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * GET /api/oura/callback
 * OAuth2 callback - exchanges code for tokens
 *
 * User is redirected here after authorizing in Oura
 */
oura.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  // Handle OAuth errors
  if (error) {
    // Redirect to error page in mini-app
    return c.redirect(`/connect/oura/error?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect('/connect/oura/error?error=missing_params');
  }

  const db = getDatabase();

  // Validate state
  const storedState = await db.query.ouraOAuthStates.findFirst({
    where: eq(ouraOAuthStates.state, state),
  });

  if (!storedState) {
    return c.redirect('/connect/oura/error?error=invalid_state');
  }

  // Check expiration
  if (new Date(storedState.expiresAt) < new Date()) {
    await db.delete(ouraOAuthStates).where(eq(ouraOAuthStates.state, state));
    return c.redirect('/connect/oura/error?error=state_expired');
  }

  // Clean up state
  await db.delete(ouraOAuthStates).where(eq(ouraOAuthStates.state, state));

  // Complete OAuth flow
  const syncService = getSyncService();
  const result = await syncService.completeOAuthFlow(
    code,
    storedState.userId,
    storedState.telegramId
  );

  if (!result.success) {
    return c.redirect(`/connect/oura/error?error=${encodeURIComponent(result.error || 'unknown')}`);
  }

  // Trigger initial sync (async, don't wait)
  syncService
    .syncSleepData(storedState.userId, 7, 'initial')
    .catch((err) => console.error('Initial Oura sync failed:', err));

  // Redirect to success page
  return c.redirect('/connect/oura/success');
});

/**
 * POST /api/oura/sync
 * Manual sync - fetches recent sleep data
 *
 * Requires: JWT auth
 */
oura.post('/sync', zValidator('json', syncSchema), async (c) => {
  // Get user from JWT (assumes auth middleware)
  const jwtPayload = c.get('jwtPayload' as never) as { userId: string } | undefined;

  if (!jwtPayload?.userId) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  const { daysBack } = c.req.valid('json');
  const syncService = getSyncService();

  try {
    const result = await syncService.syncSleepData(jwtPayload.userId, daysBack, 'manual');

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  } catch (err) {
    const response: ApiResponse<null> = {
      success: false,
      error: err instanceof Error ? err.message : 'Sync failed',
      timestamp: Date.now(),
    };

    return c.json(response, 400);
  }
});

/**
 * GET /api/oura/status
 * Get Oura connection status
 *
 * Requires: JWT auth
 */
oura.get('/status', async (c) => {
  const jwtPayload = c.get('jwtPayload' as never) as { userId: string } | undefined;

  if (!jwtPayload?.userId) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  const syncService = getSyncService();
  const status = await syncService.getConnectionStatus(jwtPayload.userId);

  const response: ApiResponse<typeof status> = {
    success: true,
    data: status,
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/oura/disconnect
 * Revoke Oura connection
 *
 * Requires: JWT auth
 */
oura.post('/disconnect', async (c) => {
  const jwtPayload = c.get('jwtPayload' as never) as { userId: string } | undefined;

  if (!jwtPayload?.userId) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  const syncService = getSyncService();
  const success = await syncService.disconnect(jwtPayload.userId);

  const response: ApiResponse<{ disconnected: boolean }> = {
    success: true,
    data: { disconnected: success },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default oura;
