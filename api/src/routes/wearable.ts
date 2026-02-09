/**
 * Wearable Routes
 * ===============
 * API endpoints for Android Companion App integration.
 *
 * Endpoints:
 * - POST /api/wearable/link/generate - Generate link code (from bot)
 * - POST /api/wearable/link - Link device using code (from Android app)
 * - POST /api/wearable/sync - Sync wearable data
 * - GET /api/wearable/status - Get sync status
 *
 * @packageDocumentation
 * @module api/routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, and, desc, gte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDatabase, users } from '../db/index.js';
import {
  wearableDevices,
  wearableSleepSessions,
  wearableSyncLog,
} from '../db/wearable-schema.js';
// Note: authMiddleware not used here - using deviceAuthMiddleware instead
import { generateDeviceToken, verifyDeviceToken } from '../utils/wearable-auth.js';
import { getEncryptionService, isEncryptionAvailable } from '../utils/encryption.js';
import type { ApiResponse } from '../types/index.js';

const wearable = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const generateLinkCodeSchema = z.object({
  telegramId: z.number().int().positive(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  username: z.string().optional(),
});

const linkDeviceSchema = z.object({
  linkCode: z.string().length(6),
  device: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }),
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
      stages: z
        .array(
          z.object({
            type: z.string(),
            startTime: z.string(),
            endTime: z.string(),
          })
        )
        .optional(),
      hrv: z
        .array(
          z.object({
            timestamp: z.string(),
            rmssd: z.number(),
            sdnn: z.number().optional(),
            quality: z.number().optional(),
          })
        )
        .optional(),
      heartRate: z
        .array(
          z.object({
            timestamp: z.string(),
            bpm: z.number(),
          })
        )
        .optional(),
      restingHeartRate: z.number().optional(),
    })
  ),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a 6-character alphanumeric link code
 */
function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

      const isWake =
        stage.type === 'awake' ||
        stage.type === 'awake_in_bed' ||
        stage.type === 'out_of_bed';

      if (isWake) {
        wakeMinutes += durationMinutes;
        if (wasAsleep) {
          awakenings++;
        }
        wasAsleep = false;
      } else {
        wasAsleep = true;
        switch (stage.type) {
          case 'light':
            lightMinutes += durationMinutes;
            break;
          case 'deep':
            deepMinutes += durationMinutes;
            break;
          case 'rem':
            remMinutes += durationMinutes;
            break;
          default:
            lightMinutes += durationMinutes; // Default to light
        }
      }
    }
  }

  const tstMinutes = lightMinutes + deepMinutes + remMinutes;
  const totalStaged = tstMinutes + wakeMinutes;
  const se = tibMinutes > 0 ? (tstMinutes / tibMinutes) * 100 : 0;

  // Stage distribution (percentages)
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

  // HRV metrics
  let hrvMeanRmssd: number | null = null;
  let hrvSdRmssd: number | null = null;
  let hrvSampleCount: number | null = null;

  if (session.hrv && session.hrv.length > 0) {
    const validHrv = session.hrv.filter((h) => h.rmssd >= 10 && h.rmssd <= 200);
    if (validHrv.length > 0) {
      hrvSampleCount = validHrv.length;
      hrvMeanRmssd =
        validHrv.reduce((sum, h) => sum + h.rmssd, 0) / validHrv.length;
      const variance =
        validHrv.reduce((sum, h) => sum + Math.pow(h.rmssd - hrvMeanRmssd!, 2), 0) /
        validHrv.length;
      hrvSdRmssd = Math.sqrt(variance);
    }
  }

  return {
    tst: Math.round(tstMinutes),
    tib: Math.round(tibMinutes),
    se: Math.round(se * 10) / 10,
    waso: Math.round(wakeMinutes),
    sol: 0, // Cannot calculate without first-sleep detection
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
// Device Authentication Middleware
// ============================================================================

/**
 * Middleware to verify device token
 */
async function deviceAuthMiddleware(
  c: Parameters<Parameters<typeof wearable.use>[1]>[0],
  next: () => Promise<void>
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing device token' });
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.get('jwtSecret');

  const result = await verifyDeviceToken(token, jwtSecret);

  if (!result.valid || !result.payload) {
    throw new HTTPException(401, { message: result.error || 'Invalid device token' });
  }

  // Verify device is still active
  const db = getDatabase();
  const device = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.deviceId, result.payload.deviceId),
      eq(wearableDevices.isActive, true)
    ),
  });

  if (!device) {
    throw new HTTPException(401, { message: 'Device not linked or deactivated' });
  }

  // Add device info to context
  // @ts-expect-error - Custom context variables for device auth
  c.set('device', device);
  // @ts-expect-error - Custom context variables for device auth
  c.set('devicePayload', result.payload);

  await next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/wearable/link/generate
 * Generate a link code for the user (called from Telegram bot)
 *
 * Requires: JWT auth (from Mini App) or internal API key
 */
wearable.post(
  '/link/generate',
  zValidator('json', generateLinkCodeSchema),
  async (c) => {
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
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    }

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create user',
        timestamp: Date.now(),
      };
      return c.json(response, 500);
    }

    // Generate link code
    const linkCode = generateLinkCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Check for existing pending device (reuse or create new)
    const existingDevice = await db.query.wearableDevices.findFirst({
      where: and(
        eq(wearableDevices.userId, user.id),
        eq(wearableDevices.linkedAt, '')
      ),
    });

    const deviceId = existingDevice?.id || nanoid();

    if (existingDevice) {
      // Update existing pending device
      await db
        .update(wearableDevices)
        .set({
          linkCode,
          linkCodeExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(wearableDevices.id, existingDevice.id));
    } else {
      // Create new pending device entry
      await db.insert(wearableDevices).values({
        id: deviceId,
        userId: user.id,
        telegramId,
        deviceId: `pending_${nanoid(8)}`,
        deviceToken: `pending_${nanoid(32)}`,
        linkCode,
        linkCodeExpiresAt: expiresAt,
        linkedAt: '',
        createdAt: now,
        updatedAt: now,
      });
    }

    const response: ApiResponse<{
      linkCode: string;
      expiresAt: string;
      expiresInSeconds: number;
    }> = {
      success: true,
      data: {
        linkCode,
        expiresAt,
        expiresInSeconds: 15 * 60,
      },
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

/**
 * POST /api/wearable/link
 * Link Android device using link code
 *
 * Called from Android Companion App
 */
wearable.post('/link', zValidator('json', linkDeviceSchema), async (c) => {
  const { linkCode, device } = c.req.valid('json');
  const jwtSecret = c.get('jwtSecret');
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find pending device with this link code
  const pendingDevice = await db.query.wearableDevices.findFirst({
    where: and(
      eq(wearableDevices.linkCode, linkCode.toUpperCase()),
      eq(wearableDevices.linkedAt, '')
    ),
  });

  if (!pendingDevice) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid or expired link code',
      timestamp: Date.now(),
    };
    return c.json(response, 400);
  }

  // Check expiration
  if (
    pendingDevice.linkCodeExpiresAt &&
    new Date(pendingDevice.linkCodeExpiresAt) < new Date()
  ) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Link code has expired',
      timestamp: Date.now(),
    };
    return c.json(response, 400);
  }

  // Generate device token (long-lived)
  const tokenResult = await generateDeviceToken(
    {
      deviceId: device.id,
      userId: pendingDevice.userId,
      telegramId: pendingDevice.telegramId,
    },
    jwtSecret
  );

  // Update device record
  await db
    .update(wearableDevices)
    .set({
      deviceId: device.id,
      deviceName: device.name ?? null,
      manufacturer: device.manufacturer ?? null,
      model: device.model ?? null,
      osVersion: device.osVersion ?? null,
      appVersion: device.appVersion ?? null,
      deviceToken: tokenResult.token,
      tokenExpiresAt: tokenResult.expiresAt,
      linkCode: null,
      linkCodeExpiresAt: null,
      linkedAt: now,
      isActive: true,
      updatedAt: now,
    })
    .where(eq(wearableDevices.id, pendingDevice.id));

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, pendingDevice.userId),
  });

  const response: ApiResponse<{
    token: string;
    expiresAt: string;
    user: {
      id: string;
      telegramId: number;
      firstName: string;
    };
  }> = {
    success: true,
    data: {
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt,
      user: {
        id: pendingDevice.userId,
        telegramId: pendingDevice.telegramId,
        firstName: user?.firstName || 'User',
      },
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/wearable/sync
 * Sync wearable data from Android Companion App
 *
 * Requires: Device token authentication
 */
wearable.post(
  '/sync',
  deviceAuthMiddleware,
  zValidator('json', syncDataSchema),
  async (c) => {
    const payload = c.req.valid('json');
    const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
    const db = getDatabase();
    const now = new Date().toISOString();

    // Create sync log entry
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

    // Process sessions
    let processed = 0;
    let skipped = 0;
    const errors: Array<{ sessionId: string; error: string }> = [];

    for (const session of payload.sleepSessions) {
      try {
        // Check for duplicate
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

        // Calculate metrics
        const metrics = calculateSleepMetrics(session);

        // Encrypt PHI fields (HIPAA compliance)
        // @see CLAUDE.md §2.2 — PHI encryption requirements
        let stagesJsonEncrypted: string | null = null;
        let hrvJsonEncrypted: string | null = null;
        let heartRateJsonEncrypted: string | null = null;

        if (isEncryptionAvailable()) {
          const encryption = getEncryptionService();
          if (session.stages) {
            stagesJsonEncrypted = encryption.encrypt(JSON.stringify(session.stages));
          }
          if (session.hrv) {
            hrvJsonEncrypted = encryption.encrypt(JSON.stringify(session.hrv));
          }
          if (session.heartRate) {
            heartRateJsonEncrypted = encryption.encrypt(JSON.stringify(session.heartRate));
          }
        } else {
          // Fallback to unencrypted (development only)
          // Production MUST have encryption configured
          if (process.env.NODE_ENV === 'production') {
            throw new HTTPException(500, {
              message: 'PHI encryption is required in production',
            });
          }
          stagesJsonEncrypted = session.stages ? JSON.stringify(session.stages) : null;
          hrvJsonEncrypted = session.hrv ? JSON.stringify(session.hrv) : null;
          heartRateJsonEncrypted = session.heartRate ? JSON.stringify(session.heartRate) : null;
        }

        // Insert session with encrypted PHI
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

    // Update sync log
    const syncEndTime = new Date().toISOString();
    const syncStartMs = new Date(now).getTime();
    const syncEndMs = new Date(syncEndTime).getTime();

    await db
      .update(wearableSyncLog)
      .set({
        sessionsProcessed: processed,
        sessionsSkipped: skipped,
        syncCompletedAt: syncEndTime,
        durationMs: syncEndMs - syncStartMs,
        status: errors.length > 0 ? 'completed' : 'completed',
        errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .where(eq(wearableSyncLog.id, syncLogId));

    // Update device last sync time
    await db
      .update(wearableDevices)
      .set({
        lastSyncAt: syncEndTime,
        updatedAt: syncEndTime,
      })
      .where(eq(wearableDevices.id, device.id));

    const response: ApiResponse<{
      processed: number;
      skipped: number;
      errors: Array<{ sessionId: string; error: string }>;
      syncId: string;
      nextSyncRecommended: string;
    }> = {
      success: true,
      data: {
        processed,
        skipped,
        errors,
        syncId: syncLogId,
        nextSyncRecommended: 'PT15M', // ISO 8601 duration: 15 minutes
      },
      timestamp: Date.now(),
    };

    return c.json(response, 200);
  }
);

/**
 * GET /api/wearable/status
 * Get wearable sync status
 *
 * Requires: Device token authentication
 */
wearable.get('/status', deviceAuthMiddleware, async (c) => {
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();

  // Get recent sync logs
  const recentSyncs = await db.query.wearableSyncLog.findMany({
    where: eq(wearableSyncLog.deviceId, device.id),
    orderBy: [desc(wearableSyncLog.syncStartedAt)],
    limit: 5,
  });

  // Get session count
  const sessions = await db.query.wearableSleepSessions.findMany({
    where: eq(wearableSleepSessions.deviceId, device.id),
  });

  // Get sessions from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentSessions = await db.query.wearableSleepSessions.findMany({
    where: and(
      eq(wearableSleepSessions.deviceId, device.id),
      gte(wearableSleepSessions.syncedAt, weekAgo)
    ),
  });

  const response: ApiResponse<{
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
  }> = {
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
        totalSessions: sessions.length,
        sessionsLast7Days: recentSessions.length,
        lastSyncStatus: recentSyncs[0]?.status ?? null,
      },
      recentSyncs: recentSyncs.map((s: typeof wearableSyncLog.$inferSelect) => ({
        id: s.id,
        type: s.syncType,
        processed: s.sessionsProcessed ?? 0,
        status: s.status,
        completedAt: s.syncCompletedAt,
      })),
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * DELETE /api/wearable/unlink
 * Unlink device
 *
 * Requires: Device token authentication
 */
wearable.delete('/unlink', deviceAuthMiddleware, async (c) => {
  const device = c.get('device' as never) as typeof wearableDevices.$inferSelect;
  const db = getDatabase();
  const now = new Date().toISOString();

  // Deactivate device (soft delete)
  await db
    .update(wearableDevices)
    .set({
      isActive: false,
      updatedAt: now,
    })
    .where(eq(wearableDevices.id, device.id));

  const response: ApiResponse<{ unlinked: boolean }> = {
    success: true,
    data: { unlinked: true },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default wearable;
