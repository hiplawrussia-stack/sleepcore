/**
 * Sync Routes
 * ===========
 * Offline-first sync endpoints for Mini App.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, gt, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDatabase,
  syncLog,
  users,
  breathingSessions,
} from '../db/index.js';
import type { ApiResponse, SyncChange, SyncChangesResponse } from '../types/index.js';

const sync = new Hono();

// Apply auth middleware
sync.use('*', authMiddleware);

// Validation schemas
const pushSchema = z.object({
  changes: z.array(z.object({
    localId: z.string(),
    entity: z.enum(['session', 'profile', 'quest', 'badge']),
    action: z.enum(['create', 'update', 'delete']),
    data: z.record(z.unknown()),
    clientTimestamp: z.number(),
  })),
  lastSyncTime: z.number(),
});

/**
 * GET /api/sync/changes
 * Get changes since last sync
 */
sync.get('/changes', async (c) => {
  const authUser = c.get('user');
  const since = parseInt(c.req.query('since') || '0', 10);
  const limit = parseInt(c.req.query('limit') || '100', 10);

  const db = getDatabase();

  // Get user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Get changes from sync log
  const logEntries = await db.query.syncLog.findMany({
    where: and(
      eq(syncLog.userId, dbUser.id),
      gt(syncLog.timestamp, since)
    ),
    orderBy: [syncLog.timestamp],
    limit: limit + 1, // Get one extra to check hasMore
  });

  const hasMore = logEntries.length > limit;
  const entries = hasMore ? logEntries.slice(0, limit) : logEntries;

  const changes: SyncChange[] = entries.map(entry => ({
    entity: entry.entity as SyncChange['entity'],
    action: entry.action as SyncChange['action'],
    id: entry.entityId,
    data: entry.data ? JSON.parse(entry.data) : {},
    timestamp: entry.timestamp,
  }));

  const response: ApiResponse<SyncChangesResponse> = {
    success: true,
    data: {
      changes,
      serverTime: Date.now(),
      hasMore,
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

/**
 * POST /api/sync/push
 * Push local changes to server
 */
sync.post(
  '/push',
  zValidator('json', pushSchema),
  async (c) => {
    const { changes } = c.req.valid('json');
    const authUser = c.get('user');
    const db = getDatabase();

    // Get user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.telegramId, authUser.telegramId),
    });

    if (!dbUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
        timestamp: Date.now(),
      };
      return c.json(response, 404);
    }

    const now = Date.now();
    const results: Array<{ localId: string; serverId: string; status: string }> = [];

    for (const change of changes) {
      try {
        let serverId = change.localId;

        // Process based on entity type
        switch (change.entity) {
          case 'session':
            if (change.action === 'create') {
              serverId = nanoid();
              await db.insert(breathingSessions).values({
                id: serverId,
                userId: dbUser.id,
                patternId: change.data.patternId as string,
                patternName: change.data.patternName as string,
                cycles: change.data.cycles as number,
                duration: change.data.duration as number,
                completedAt: change.data.completedAt as string || new Date().toISOString(),
                syncedAt: new Date().toISOString(),
              });
            }
            break;

          case 'profile':
            if (change.action === 'update') {
              const updateData: Record<string, unknown> = {
                updatedAt: new Date().toISOString(),
              };
              if (change.data.firstName) updateData.firstName = change.data.firstName;
              if (change.data.lastName !== undefined) updateData.lastName = change.data.lastName;

              await db
                .update(users)
                .set(updateData as typeof users.$inferInsert)
                .where(eq(users.id, dbUser.id));
            }
            break;
        }

        // Log sync operation
        await db.insert(syncLog).values({
          id: nanoid(),
          userId: dbUser.id,
          entity: change.entity,
          entityId: serverId,
          action: change.action,
          data: JSON.stringify(change.data),
          timestamp: now,
          syncedAt: new Date().toISOString(),
        });

        results.push({
          localId: change.localId,
          serverId,
          status: 'synced',
        });
      } catch (error) {
        results.push({
          localId: change.localId,
          serverId: change.localId,
          status: 'error',
        });
      }
    }

    const response: ApiResponse<{
      results: typeof results;
      serverTime: number;
    }> = {
      success: true,
      data: {
        results,
        serverTime: now,
      },
      timestamp: now,
    };

    return c.json(response, 200);
  }
);

/**
 * GET /api/sync/status
 * Get sync status for debugging
 */
sync.get('/status', async (c) => {
  const authUser = c.get('user');
  const db = getDatabase();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.telegramId, authUser.telegramId),
  });

  if (!dbUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
      timestamp: Date.now(),
    };
    return c.json(response, 404);
  }

  // Get last sync entry
  const lastSync = await db.query.syncLog.findFirst({
    where: eq(syncLog.userId, dbUser.id),
    orderBy: [desc(syncLog.timestamp)],
  });

  // Count entities
  const sessionCount = await db.query.breathingSessions.findMany({
    where: eq(breathingSessions.userId, dbUser.id),
  });

  const response: ApiResponse<{
    lastSyncTime: number | null;
    counts: {
      sessions: number;
    };
  }> = {
    success: true,
    data: {
      lastSyncTime: lastSync?.timestamp ?? null,
      counts: {
        sessions: sessionCount.length,
      },
    },
    timestamp: Date.now(),
  };

  return c.json(response, 200);
});

export default sync;
