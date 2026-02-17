/**
 * Wearable Routes (RFC 8628 Device Authorization)
 * ================================================
 * API endpoints for Android Companion App integration.
 *
 * Architecture based on RFC 8628 (OAuth 2.0 Device Authorization Grant):
 * - POST /device/authorize - Generate user_code + device_code
 * - POST /device/token     - Exchange device_code for access + refresh tokens
 * - POST /device/refresh   - Refresh tokens with rotation
 * - DELETE /device/revoke  - Revoke token family
 *
 * Data endpoints:
 * - POST /sync    - Sync wearable data
 * - GET /status   - Get sync status
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8628
 * @packageDocumentation
 * @module api/routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, and, desc, gte, lt, isNull } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDatabase, users } from '../db/index.js';
import {
  wearableLinkCodes,
  wearableDevices,
  wearableSleepSessions,
  wearableSyncLog,
} from '../db/wearable-schema.js';
import {
  generateLinkCodes,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  MAX_LINK_CODE_ATTEMPTS,
  type AccessTokenPayload,
} from '../utils/wearable-auth.js';
import { getEncryptionService, isEncryptionAvailable } from '../utils/encryption.js';
import type { ApiResponse } from '../types/index.js';

const wearable = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const authorizeSchema = z.object({
  telegramId: z.number().int().positive(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  username: z.string().optional(),
});

const tokenSchema = z.object({
  grantType: z.literal('urn:ietf:params:oauth:grant-type:device_code'),
  deviceCode: z.string().min(1),
  device: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }),
});

const refreshSchema = z.object({
  grantType: z.literal('refresh_token'),
  refreshToken: z.string().min(1),
});

const syncDataSchema = z.object({
  syncType: z.enum(['manual', 'background', 'initial']).default('manual'),
  lastSyncTime: z.string().optional(),
  sleepSessions: z.array(
    z.object({
      sessionId: z.string(),
      source: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      notes: z.string().optional(),
      stages: z.array(z.object({
        type: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })).optional(),
      hrv: z.array(z.object({
        timestamp: z.string(),
        rmssd: z.number(),
        sdnn: z.number().optional(),
        quality: z.number().optional(),
      })).optional(),
      heartRate: z.array(z.object({
        timestamp: z.string(),
        bpm: z.number(),
      })).optional(),
      restingHeartRate: z.number().optional(),
    })
  ),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate sleep metrics from session data
 */
function calculateSleepMetrics(session: {
  startTime: string;
  endTime: string;
  stages?: Array<{ type: string; startTime: string; endTime: string }>;
  hrv?: Array<{ rmssd: number }>;
}): {
  tst: number;
  tib: number;
  se: number;
  waso: number;
  sol: number;
  awakenings: number;
  stageWake: number | null;
  stageLight: number | null;
  stageDeep: number | null;
  stageRem: number | null;
  hrvMeanRmssd: number | null;
  hrvSdRmssd: number | null;
  hrvSampleCount: number | null;
} {
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const tibMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

  let wakeMinutes = 0;
  let lightMinutes = 0;
  let deepMinutes = 0;
  let remMinutes = 0;
  let awakenings = 0;
  let wasAsleep = false;

  if (session.stages && session.stages.length > 0) {
    for (const stage of session.stages) {
      const stageStart = new Date(stage.startTime);
      const stageEnd = new Date(stage.endTime);
      const durationMinutes = (stageEnd.getTime() - stageStart.getTime()) / (1000 * 60);

      const isWake = stage.type === 'awake' || stage.type === 'awake_in_bed' || stage.type === 'out_of_bed';

      if (isWake) {
        wakeMinutes += durationMinutes;
        if (wasAsleep) awakenings++;
        wasAsleep = false;
      } else {
        wasAsleep = true;
        switch (stage.type) {
          case 'light': lightMinutes += durationMinutes; break;
          case 'deep': deepMinutes += durationMinutes; break;
          case 'rem': remMinutes += durationMinutes; break;
          default: lightMinutes += durationMinutes;
        }
      }
    }
  }

  const tstMinutes = lightMinutes + deepMinutes + remMinutes;
  const totalStaged = tstMinutes + wakeMinutes;
  const se = tibMinutes > 0 ? (tstMinutes / tibMinutes) * 100 : 0;

  let stageWake: number | null = null;
  let stageLight: number | null = null;
  let stageDeep: number | null = null;
  let stageRem: number | null = null;

  if (session.stages && session.stages.length > 0 && totalStaged > 0) {
    stageWake = (wakeMinutes / totalStaged) * 100;
    stageLight = (lightMinutes / totalStaged) * 100;
    stageDeep = (deepMinutes / totalStaged) * 100;
    stageRem = (remMinutes / totalStaged) * 100;
  }

  let hrvMeanRmssd: number | null = null;
  let hrvSdRmssd: number | null = null;
  let hrvSampleCount: number | null = null;

  if (session.hrv && session.hrv.length > 0) {
    const validHrv = session.hrv.filter((h) => h.rmssd >= 10 && h.rmssd <= 200);
    if (validHrv.length > 0) {
      hrvSampleCount = validHrv.length;
      hrvMeanRmssd = validHrv.reduce((sum, h) => sum + h.rmssd, 0) / validHrv.length;
      const variance = validHrv.reduce((sum, h) => sum + Math.pow(h.rmssd - hrvMeanRmssd!, 2), 0) / validHrv.length;
      hrvSdRmssd = Math.sqrt(variance);
    }
  }

  return {
    tst: Math.round(tstMinutes),
    tib: Math.round(tibMinutes),
    se: Math.round(se * 10) / 10,
    waso: Math.round(wakeMinutes),
    sol: 0,
    awakenings,
    stageWake: stageWake !== null ? Math.round(stageWake * 10) / 10 : null,
    stageLight: stageLight !== null ? Math.round(stageLight * 10) / 10 : null,
    stageDeep: stageDeep !== null ? Math.round(stageDeep * 10) / 10 : null,
    stageRem: stageRem !== null ? Math.round(stageRem * 10) / 10 : null,
    hrvMeanRmssd: hrvMeanRmssd !== null ? Math.round(hrvMeanRmssd * 10) / 10 : null,
    hrvSdRmssd: hrvSdRmssd !== null ? Math.round(hrvSdRmssd * 10) / 10 : null,
    hrvSampleCount,
  };
}

// ============================================================================
// Device Auth Middleware
// ============================================================================

/**
 * Middleware to verify access token
 */
async function deviceAuthMiddleware(
  c: Parameters<Parameters<typeof wearable.use>[1]>[0],
  next: () => Promise<void>
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing access token' });
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.get('jwtSecret');

  const result = await verifyAccessToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    throw new HTTPException(401, { message: result.error || 'Invalid access token' });
  }

  // Verify device is still active
  const db = getDatabase();
  const device = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, result.payload.deviceId),
      eq(wearableDevices.userId, result.payload.userId),
      eq(wearableDevices.isActive, true)
    ),
  });

  if (!device) {
    throw new HTTPException(401, { message: 'Device not linked or deactivated' });
  }

  // Verify token matches stored token
  if (device.accessToken !== token) {
    throw new HTTPException(401, { message: 'Token has been revoked' });
  }

  // @ts-expect-error - Custom context
  c.set('device', device);
  // @ts-expect-error - Custom context
  c.set('tokenPayload', result.payload);

  await next();
}

// ============================================================================
// RFC 8628: Device Authorization Endpoints
// ============================================================================

/**
 * POST /device/authorize
 * Generate link codes for device authorization (called from Telegram bot)
 *
 * RFC 8628 Step 1: Device Authorization Request
 */
wearable.post('/device/authorize', zValidator('json', authorizeSchema), async (c) => {
  const { telegramId, firstName, lastName, username } = c.req.valid('json');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramId),
  });

  if (!user) {
    const userId = nanoid();
    await db.insert(users).values({
      id: userId,
      telegramId,
      firstName,
      lastName: lastName ?? null,
      username: username ?? null,
      createdAt: now,
      updatedAt: now,
    });
    user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  }

  if (!user) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to create user',
      timestamp: Date.now(),
    }, 500);
  }

  // Invalidate all previous unused link codes for this user
  await db.update(wearableLinkCodes)
    .set({ usedAt: now }) // Mark as used (invalidated)
    .where(and(
      eq(wearableLinkCodes.userId, user.id),
      isNull(wearableLinkCodes.usedAt)
    ));

  // Generate new link codes
  const codes = generateLinkCodes();

  // Store link code
  await db.insert(wearableLinkCodes).values({
    id: nanoid(),
    userId: user.id,
    telegramId,
    userCode: codes.userCode,
    deviceCode: codes.deviceCode,
    expiresAt: codes.expiresAt,
    createdAt: now,
  });

  // RFC 8628 Response
  return c.json<ApiResponse<{
    userCode: string;
    deviceCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  }>>({
    success: true,
    data: {
      userCode: codes.userCode,
      deviceCode: codes.deviceCode,
      verificationUri: 'sleepcore://link', // Deep link for app
      expiresIn: codes.expiresInSeconds,
      interval: 5, // RFC 8628: polling interval in seconds
    },
    timestamp: Date.now(),
  });
});

/**
 * POST /device/token
 * Exchange device_code for tokens (called from Android app)
 *
 * RFC 8628 Step 2: Device Access Token Request
 */
wearable.post('/device/token', zValidator('json', tokenSchema), async (c) => {
  const { deviceCode, device } = c.req.valid('json');
  const jwtSecret = c.get('jwtSecret');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find link code
  const linkCode = await db.query.wearableLinkCodes.findFirst({
    where: eq(wearableLinkCodes.deviceCode, deviceCode),
  });

  if (!linkCode) {
    // RFC 8628: invalid_grant
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'invalid_grant',
      timestamp: Date.now(),
    }, 400);
  }

  // Check if already used
  if (linkCode.usedAt) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'invalid_grant',
      timestamp: Date.now(),
    }, 400);
  }

  // Check expiration
  if (new Date(linkCode.expiresAt) < new Date()) {
    // RFC 8628: expired_token
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'expired_token',
      timestamp: Date.now(),
    }, 400);
  }

  // Rate limiting: check attempts
  if ((linkCode.attempts || 0) >= MAX_LINK_CODE_ATTEMPTS) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'slow_down',
      timestamp: Date.now(),
    }, 400);
  }

  // Increment attempts
  await db.update(wearableLinkCodes)
    .set({
      attempts: (linkCode.attempts || 0) + 1,
      lastAttemptAt: now,
    })
    .where(eq(wearableLinkCodes.id, linkCode.id));

  // Check if device is already linked to another user
  const existingDeviceOtherUser = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, device.id),
      eq(wearableDevices.isActive, true)
    ),
  });

  if (existingDeviceOtherUser && existingDeviceOtherUser.userId !== linkCode.userId) {
    // Device linked to different user - conflict
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'device_already_linked',
      timestamp: Date.now(),
    }, 409);
  }

  // Check if device already linked to this user (re-link scenario)
  const existingDevice = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, device.id),
      eq(wearableDevices.userId, linkCode.userId)
    ),
  });

  // Generate token pair
  const tokens = await generateTokenPair(
    {
      deviceId: device.id,
      userId: linkCode.userId,
      telegramId: linkCode.telegramId,
    },
    jwtSecret,
    existingDevice?.tokenFamily // Reuse family for re-link
  );

  if (existingDevice) {
    // RE-LINK: Update existing device
    await db.update(wearableDevices)
      .set({
        deviceName: device.name ?? null,
        manufacturer: device.manufacturer ?? null,
        model: device.model ?? null,
        osVersion: device.osVersion ?? null,
        appVersion: device.appVersion ?? null,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        updatedAt: now,
      })
      .where(eq(wearableDevices.id, existingDevice.id));
  } else {
    // NEW DEVICE: Create record
    await db.insert(wearableDevices).values({
      id: nanoid(),
      userId: linkCode.userId,
      telegramId: linkCode.telegramId,
      deviceId: device.id,
      deviceName: device.name ?? null,
      manufacturer: device.manufacturer ?? null,
      model: device.model ?? null,
      osVersion: device.osVersion ?? null,
      appVersion: device.appVersion ?? null,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      tokenFamily: tokens.tokenFamily,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Mark link code as used
  await db.update(wearableLinkCodes)
    .set({
      usedAt: now,
      usedByDeviceId: device.id,
    })
    .where(eq(wearableLinkCodes.id, linkCode.id));

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, linkCode.userId),
  });

  return c.json<ApiResponse<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken: string;
    user: { id: string; telegramId: number; firstName: string };
  }>>({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      refreshToken: tokens.refreshToken,
      user: {
        id: linkCode.userId,
        telegramId: linkCode.telegramId,
        firstName: user?.firstName || 'User',
      },
    },
    timestamp: Date.now(),
  });
});

/**
 * POST /device/refresh
 * Refresh tokens with rotation (called from Android app)
 */
wearable.post('/device/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const jwtSecret = c.get('jwtSecret');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Verify refresh token
  const verification = await verifyRefreshToken(refreshToken, jwtSecret);

  if (!verification.valid || !verification.payload) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: verification.error || 'invalid_grant',
      timestamp: Date.now(),
    }, 400);
  }

  // Find device with this refresh token
  const device = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.refreshToken, refreshToken),
      eq(wearableDevices.isActive, true)
    ),
  });

  if (!device) {
    // Token reuse detection: if token family exists but refresh doesn't match,
    // this could be a stolen token replay attack
    const familyDevice = await db.query.wearableDevices.findFirst({
      where: eq(wearableDevices.tokenFamily, verification.payload.family),
    });

    if (familyDevice) {
      // SECURITY: Revoke entire token family
      await db.update(wearableDevices)
        .set({
          isActive: false,
          deactivatedAt: now,
          deactivationReason: 'token_reuse',
          updatedAt: now,
        })
        .where(eq(wearableDevices.tokenFamily, verification.payload.family));

      console.error(`[Security] Token reuse detected for family ${verification.payload.family}`);
    }

    return c.json<ApiResponse<null>>({
      success: false,
      error: 'invalid_grant',
      timestamp: Date.now(),
    }, 400);
  }

  // Generate new token pair (rotation)
  const tokens = await generateTokenPair(
    {
      deviceId: device.deviceId,
      userId: device.userId,
      telegramId: device.telegramId,
    },
    jwtSecret,
    device.tokenFamily // Keep same family
  );

  // Update device with new tokens
  await db.update(wearableDevices)
    .set({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      updatedAt: now,
    })
    .where(eq(wearableDevices.id, device.id));

  return c.json<ApiResponse<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken: string;
  }>>({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: tokens.refreshToken,
    },
    timestamp: Date.now(),
  });
});

/**
 * DELETE /device/revoke
 * Revoke device tokens (logout)
 */
wearable.delete('/device/revoke', deviceAuthMiddleware, async (c) => {
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();
  const now = new Date().toISOString();

  // Deactivate device (soft delete)
  await db.update(wearableDevices)
    .set({
      isActive: false,
      deactivatedAt: now,
      deactivationReason: 'user_request',
      updatedAt: now,
    })
    .where(eq(wearableDevices.id, device.id));

  return c.json<ApiResponse<{ revoked: boolean }>>({
    success: true,
    data: { revoked: true },
    timestamp: Date.now(),
  });
});

// ============================================================================
// Legacy Endpoints (backward compatibility)
// ============================================================================

/**
 * POST /link/generate (LEGACY)
 * @deprecated Use POST /device/authorize instead
 */
wearable.post('/link/generate', zValidator('json', authorizeSchema), async (c) => {
  const { telegramId, firstName, lastName, username } = c.req.valid('json');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramId),
  });

  if (!user) {
    const userId = nanoid();
    await db.insert(users).values({
      id: userId,
      telegramId,
      firstName,
      lastName: lastName ?? null,
      username: username ?? null,
      createdAt: now,
      updatedAt: now,
    });
    user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  }

  if (!user) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to create user',
      timestamp: Date.now(),
    }, 500);
  }

  // Invalidate previous codes
  await db.update(wearableLinkCodes)
    .set({ usedAt: now })
    .where(and(
      eq(wearableLinkCodes.userId, user.id),
      isNull(wearableLinkCodes.usedAt)
    ));

  // Generate codes
  const codes = generateLinkCodes();

  await db.insert(wearableLinkCodes).values({
    id: nanoid(),
    userId: user.id,
    telegramId,
    userCode: codes.userCode,
    deviceCode: codes.deviceCode,
    expiresAt: codes.expiresAt,
    createdAt: now,
  });

  // Legacy response format
  return c.json<ApiResponse<{
    linkCode: string;
    expiresAt: string;
    expiresInSeconds: number;
  }>>({
    success: true,
    data: {
      linkCode: codes.userCode, // Legacy: userCode was called linkCode
      expiresAt: codes.expiresAt,
      expiresInSeconds: codes.expiresInSeconds,
    },
    timestamp: Date.now(),
  });
});

/**
 * POST /link (LEGACY)
 * @deprecated Use POST /device/token instead
 */
wearable.post('/link', zValidator('json', z.object({
  linkCode: z.string().length(6),
  device: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }),
})), async (c) => {
  const { linkCode, device } = c.req.valid('json');
  const jwtSecret = c.get('jwtSecret');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find by userCode (legacy: linkCode = userCode)
  const code = await db.query.wearableLinkCodes.findFirst({
    where: eq(wearableLinkCodes.userCode, linkCode.toUpperCase()),
  });

  if (!code || code.usedAt) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid or expired link code',
      timestamp: Date.now(),
    }, 400);
  }

  if (new Date(code.expiresAt) < new Date()) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Link code has expired',
      timestamp: Date.now(),
    }, 400);
  }

  // Rate limiting
  if ((code.attempts || 0) >= MAX_LINK_CODE_ATTEMPTS) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Too many attempts',
      timestamp: Date.now(),
    }, 429);
  }

  await db.update(wearableLinkCodes)
    .set({ attempts: (code.attempts || 0) + 1, lastAttemptAt: now })
    .where(eq(wearableLinkCodes.id, code.id));

  // Check for existing device (same user)
  const existingDevice = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, device.id),
      eq(wearableDevices.userId, code.userId)
    ),
  });

  // Check for device linked to other user
  const otherUserDevice = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, device.id),
      eq(wearableDevices.isActive, true)
    ),
  });

  if (otherUserDevice && otherUserDevice.userId !== code.userId) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Device is linked to another account',
      timestamp: Date.now(),
    }, 409);
  }

  // Generate tokens
  const tokens = await generateTokenPair(
    { deviceId: device.id, userId: code.userId, telegramId: code.telegramId },
    jwtSecret,
    existingDevice?.tokenFamily
  );

  if (existingDevice) {
    await db.update(wearableDevices)
      .set({
        deviceName: device.name ?? null,
        manufacturer: device.manufacturer ?? null,
        model: device.model ?? null,
        osVersion: device.osVersion ?? null,
        appVersion: device.appVersion ?? null,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        updatedAt: now,
      })
      .where(eq(wearableDevices.id, existingDevice.id));
  } else {
    await db.insert(wearableDevices).values({
      id: nanoid(),
      userId: code.userId,
      telegramId: code.telegramId,
      deviceId: device.id,
      deviceName: device.name ?? null,
      manufacturer: device.manufacturer ?? null,
      model: device.model ?? null,
      osVersion: device.osVersion ?? null,
      appVersion: device.appVersion ?? null,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      tokenFamily: tokens.tokenFamily,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.update(wearableLinkCodes)
    .set({ usedAt: now, usedByDeviceId: device.id })
    .where(eq(wearableLinkCodes.id, code.id));

  const user = await db.query.users.findFirst({
    where: eq(users.id, code.userId),
  });

  // Legacy response format
  return c.json<ApiResponse<{
    token: string;
    expiresAt: string;
    user: { id: string; telegramId: number; firstName: string };
  }>>({
    success: true,
    data: {
      token: tokens.accessToken, // Legacy: single token
      expiresAt: tokens.accessTokenExpiresAt,
      user: {
        id: code.userId,
        telegramId: code.telegramId,
        firstName: user?.firstName || 'User',
      },
    },
    timestamp: Date.now(),
  });
});

// ============================================================================
// Data Sync Endpoints
// ============================================================================

/**
 * POST /sync
 * Sync wearable data from Android Companion App
 */
wearable.post('/sync', deviceAuthMiddleware, zValidator('json', syncDataSchema), async (c) => {
  const payload = c.req.valid('json');
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();
  const now = new Date().toISOString();

  const syncLogId = nanoid();
  await db.insert(wearableSyncLog).values({
    id: syncLogId,
    userId: device.userId,
    deviceId: device.id,
    syncType: payload.syncType,
    sessionsReceived: payload.sleepSessions.length,
    syncStartedAt: now,
    status: 'processing',
    dataFromTime: payload.lastSyncTime ?? null,
    dataToTime: now,
  });

  let processed = 0;
  let skipped = 0;
  const errors: Array<{ sessionId: string; error: string }> = [];

  for (const session of payload.sleepSessions) {
    try {
      const existing = await db.query.wearableSleepSessions.findFirst({
        where: and(
          eq(wearableSleepSessions.userId, device.userId),
          eq(wearableSleepSessions.sourceSessionId, session.sessionId)
        ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      const metrics = calculateSleepMetrics(session);

      let stagesJsonEncrypted: string | null = null;
      let hrvJsonEncrypted: string | null = null;
      let heartRateJsonEncrypted: string | null = null;

      if (isEncryptionAvailable()) {
        const encryption = getEncryptionService();
        if (session.stages) stagesJsonEncrypted = encryption.encrypt(JSON.stringify(session.stages));
        if (session.hrv) hrvJsonEncrypted = encryption.encrypt(JSON.stringify(session.hrv));
        if (session.heartRate) heartRateJsonEncrypted = encryption.encrypt(JSON.stringify(session.heartRate));
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new HTTPException(500, { message: 'PHI encryption is required in production' });
        }
        stagesJsonEncrypted = session.stages ? JSON.stringify(session.stages) : null;
        hrvJsonEncrypted = session.hrv ? JSON.stringify(session.hrv) : null;
        heartRateJsonEncrypted = session.heartRate ? JSON.stringify(session.heartRate) : null;
      }

      await db.insert(wearableSleepSessions).values({
        id: nanoid(),
        userId: device.userId,
        deviceId: device.id,
        sourceSessionId: session.sessionId,
        source: session.source,
        startTime: session.startTime,
        endTime: session.endTime,
        tst: metrics.tst,
        tib: metrics.tib,
        se: metrics.se,
        waso: metrics.waso,
        sol: metrics.sol,
        awakenings: metrics.awakenings,
        stageWake: metrics.stageWake,
        stageLight: metrics.stageLight,
        stageDeep: metrics.stageDeep,
        stageRem: metrics.stageRem,
        hrvMeanRmssd: metrics.hrvMeanRmssd,
        hrvSdRmssd: metrics.hrvSdRmssd,
        hrvSampleCount: metrics.hrvSampleCount,
        restingHeartRate: session.restingHeartRate ?? null,
        stagesJson: stagesJsonEncrypted,
        hrvJson: hrvJsonEncrypted,
        heartRateJson: heartRateJsonEncrypted,
        notes: session.notes ?? null,
        processedAt: now,
        syncedAt: now,
      });

      processed++;
    } catch (err) {
      errors.push({
        sessionId: session.sessionId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const syncEndTime = new Date().toISOString();
  const durationMs = new Date(syncEndTime).getTime() - new Date(now).getTime();

  await db.update(wearableSyncLog)
    .set({
      sessionsProcessed: processed,
      sessionsSkipped: skipped,
      syncCompletedAt: syncEndTime,
      durationMs,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
    })
    .where(eq(wearableSyncLog.id, syncLogId));

  await db.update(wearableDevices)
    .set({ lastSyncAt: syncEndTime, updatedAt: syncEndTime })
    .where(eq(wearableDevices.id, device.id));

  return c.json<ApiResponse<{
    processed: number;
    skipped: number;
    errors: Array<{ sessionId: string; error: string }>;
    syncId: string;
    nextSyncRecommended: string;
  }>>({
    success: true,
    data: {
      processed,
      skipped,
      errors,
      syncId: syncLogId,
      nextSyncRecommended: 'PT15M',
    },
    timestamp: Date.now(),
  });
});

/**
 * GET /status
 * Get wearable sync status
 */
wearable.get('/status', deviceAuthMiddleware, async (c) => {
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();

  const recentSyncs = await db.query.wearableSyncLog.findMany({
    where: eq(wearableSyncLog.deviceId, device.id),
    orderBy: [desc(wearableSyncLog.syncStartedAt)],
    limit: 5,
  });

  // Use COUNT instead of loading all sessions
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const allSessions = await db.query.wearableSleepSessions.findMany({
    where: eq(wearableSleepSessions.deviceId, device.id),
    columns: { id: true },
  });

  const recentSessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.deviceId, device.id),
      gte(wearableSleepSessions.syncedAt, weekAgo)
    ),
    columns: { id: true },
  });

  return c.json<ApiResponse<{
    device: {
      id: string;
      name: string | null;
      manufacturer: string | null;
      model: string | null;
      linkedAt: string | null;
      lastSyncAt: string | null;
    };
    stats: {
      totalSessions: number;
      sessionsLast7Days: number;
      lastSyncStatus: string | null;
    };
    recentSyncs: Array<{
      id: string;
      type: string;
      processed: number;
      status: string | null;
      completedAt: string | null;
    }>;
  }>>({
    success: true,
    data: {
      device: {
        id: device.deviceId,
        name: device.deviceName,
        manufacturer: device.manufacturer,
        model: device.model,
        linkedAt: device.linkedAt,
        lastSyncAt: device.lastSyncAt,
      },
      stats: {
        totalSessions: allSessions.length,
        sessionsLast7Days: recentSessions.length,
        lastSyncStatus: recentSyncs[0]?.status ?? null,
      },
      recentSyncs: recentSyncs.map((s) => ({
        id: s.id,
        type: s.syncType,
        processed: s.sessionsProcessed ?? 0,
        status: s.status,
        completedAt: s.syncCompletedAt,
      })),
    },
    timestamp: Date.now(),
  });
});

/**
 * DELETE /unlink (LEGACY)
 * @deprecated Use DELETE /device/revoke instead
 */
wearable.delete('/unlink', deviceAuthMiddleware, async (c) => {
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.update(wearableDevices)
    .set({
      isActive: false,
      deactivatedAt: now,
      deactivationReason: 'user_request',
      updatedAt: now,
    })
    .where(eq(wearableDevices.id, device.id));

  return c.json<ApiResponse<{ unlinked: boolean }>>({
    success: true,
    data: { unlinked: true },
    timestamp: Date.now(),
  });
});

export default wearable;
