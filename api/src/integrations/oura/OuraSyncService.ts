/**
 * Oura Ring Sync Service
 * ======================
 * Handles data synchronization from Oura API to SleepCore.
 *
 * Converts Oura sleep documents to SleepCore wearable format
 * for unified processing through existing CBT-I engines.
 *
 * @packageDocumentation
 * @module api/integrations/oura
 */

import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../../db/index.js';
import { wearableSleepSessions } from '../../db/wearable-schema.js';
import { ouraConnections, ouraSyncLog } from './schema.js';
import { OuraClient, type OuraClientConfig } from './OuraClient.js';
import type {
  OuraSleepDocument,
  OuraSyncResult,
  OuraCredentials,
} from './types.js';
import { getEncryptionService, isEncryptionAvailable } from '../../utils/encryption.js';

/**
 * Oura Sync Service
 *
 * Manages OAuth2 connections and data synchronization.
 */
export class OuraSyncService {
  private readonly client: OuraClient;

  constructor(config: OuraClientConfig) {
    this.client = new OuraClient(config);
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state: string): string {
    return this.client.getAuthorizationUrl(state);
  }

  /**
   * Complete OAuth flow and save connection
   */
  async completeOAuthFlow(
    code: string,
    userId: string,
    telegramId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Exchange code for tokens
      const credentials = await this.client.exchangeCode(code);

      // Get user info from Oura
      let ouraUserId: string | null = null;
      let ouraEmail: string | null = null;

      try {
        const personalInfo = await this.client.getPersonalInfo();
        ouraUserId = personalInfo.id;
        ouraEmail = personalInfo.email;
      } catch {
        // Personal info is optional
      }

      const db = getDatabase();
      const now = new Date().toISOString();

      // Check for existing connection
      const existing = await db.query.ouraConnections.findFirst({
        where: eq(ouraConnections.userId, userId),
      });

      // Encrypt tokens for storage (HIPAA compliance)
      let accessTokenEncrypted = credentials.accessToken;
      let refreshTokenEncrypted = credentials.refreshToken;

      if (isEncryptionAvailable()) {
        const encryption = getEncryptionService();
        accessTokenEncrypted = encryption.encrypt(credentials.accessToken);
        refreshTokenEncrypted = encryption.encrypt(credentials.refreshToken);
      } else if (process.env.NODE_ENV === 'production') {
        throw new Error('Token encryption is required in production');
      }

      if (existing) {
        // Update existing connection
        await db
          .update(ouraConnections)
          .set({
            ouraUserId,
            ouraEmail,
            accessToken: accessTokenEncrypted,
            refreshToken: refreshTokenEncrypted,
            tokenExpiresAt: credentials.expiresAt.toISOString(),
            scopesGranted: JSON.stringify(credentials.scope),
            isActive: true,
            syncEnabled: true,
            updatedAt: now,
          })
          .where(eq(ouraConnections.id, existing.id));
      } else {
        // Create new connection
        await db.insert(ouraConnections).values({
          id: nanoid(),
          userId,
          telegramId,
          ouraUserId,
          ouraEmail,
          accessToken: accessTokenEncrypted,
          refreshToken: refreshTokenEncrypted,
          tokenExpiresAt: credentials.expiresAt.toISOString(),
          scopesGranted: JSON.stringify(credentials.scope),
          isActive: true,
          syncEnabled: true,
          connectedAt: now,
          updatedAt: now,
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth flow failed',
      };
    }
  }

  /**
   * Load credentials from database for a user
   */
  async loadCredentials(userId: string): Promise<boolean> {
    const db = getDatabase();

    const connection = await db.query.ouraConnections.findFirst({
      where: and(
        eq(ouraConnections.userId, userId),
        eq(ouraConnections.isActive, true)
      ),
    });

    if (!connection) {
      return false;
    }

    // Decrypt tokens if encrypted
    let accessToken = connection.accessToken;
    let refreshToken = connection.refreshToken;

    if (isEncryptionAvailable()) {
      const encryption = getEncryptionService();
      try {
        accessToken = encryption.decrypt(connection.accessToken);
        refreshToken = encryption.decrypt(connection.refreshToken);
      } catch {
        // Tokens might be unencrypted (dev mode)
      }
    }

    this.client.setCredentials({
      accessToken,
      refreshToken,
      expiresAt: new Date(connection.tokenExpiresAt),
      scope: JSON.parse(connection.scopesGranted),
    });

    return true;
  }

  /**
   * Sync sleep data for a user
   *
   * @param userId - User ID
   * @param daysBack - Number of days to sync (default: 7)
   * @param syncType - Type of sync operation
   */
  async syncSleepData(
    userId: string,
    daysBack: number = 7,
    syncType: 'manual' | 'scheduled' | 'initial' = 'manual'
  ): Promise<OuraSyncResult> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Load credentials
    const hasCredentials = await this.loadCredentials(userId);
    if (!hasCredentials) {
      throw new Error('Oura Ring not connected');
    }

    // Get connection info
    const connection = await db.query.ouraConnections.findFirst({
      where: eq(ouraConnections.userId, userId),
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Create sync log entry
    const syncLogId = nanoid();
    await db.insert(ouraSyncLog).values({
      id: syncLogId,
      userId,
      connectionId: connection.id,
      syncType,
      dateRangeStart: startDateStr,
      dateRangeEnd: endDateStr,
      syncStartedAt: now,
      status: 'processing',
    });

    const result: OuraSyncResult = {
      sessionsProcessed: 0,
      sessionsSkipped: 0,
      errors: [],
      lastSyncedDate: null,
    };

    try {
      // Fetch sleep data from Oura
      const sleepData = await this.client.getAllSleep(startDateStr, endDateStr);

      // Process each sleep document
      for (const sleepDoc of sleepData) {
        try {
          // Skip deleted sessions
          if (sleepDoc.type === 'deleted') {
            result.sessionsSkipped++;
            continue;
          }

          // Check for duplicate
          const existing = await db.query.wearableSleepSessions.findFirst({
            where: and(
              eq(wearableSleepSessions.userId, userId),
              eq(wearableSleepSessions.sourceSessionId, `oura:${sleepDoc.id}`)
            ),
          });

          if (existing) {
            result.sessionsSkipped++;
            continue;
          }

          // Convert and save
          await this.saveOuraSleepSession(userId, connection.id, sleepDoc);
          result.sessionsProcessed++;
          result.lastSyncedDate = sleepDoc.day;
        } catch (err) {
          result.errors.push({
            sessionId: sleepDoc.id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Update sync log with success
      const syncEndTime = new Date().toISOString();
      await db
        .update(ouraSyncLog)
        .set({
          sessionsReceived: sleepData.length,
          sessionsProcessed: result.sessionsProcessed,
          sessionsSkipped: result.sessionsSkipped,
          syncCompletedAt: syncEndTime,
          durationMs: new Date(syncEndTime).getTime() - new Date(now).getTime(),
          status: result.errors.length > 0 ? 'partial' : 'completed',
          errorsJson: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        })
        .where(eq(ouraSyncLog.id, syncLogId));

      // Update connection last sync
      await db
        .update(ouraConnections)
        .set({
          lastSyncAt: syncEndTime,
          lastSyncStatus: result.errors.length > 0 ? 'partial' : 'success',
          lastSyncedDate: result.lastSyncedDate,
          updatedAt: syncEndTime,
        })
        .where(eq(ouraConnections.id, connection.id));

      // Update stored tokens if refreshed
      const currentCredentials = this.client.getCredentials();
      if (currentCredentials) {
        await this.updateStoredTokens(connection.id, currentCredentials);
      }

      return result;
    } catch (error) {
      // Update sync log with failure
      const syncEndTime = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await db
        .update(ouraSyncLog)
        .set({
          syncCompletedAt: syncEndTime,
          durationMs: new Date(syncEndTime).getTime() - new Date(now).getTime(),
          status: 'failed',
          errorMessage,
        })
        .where(eq(ouraSyncLog.id, syncLogId));

      await db
        .update(ouraConnections)
        .set({
          lastSyncAt: syncEndTime,
          lastSyncStatus: 'failed',
          lastSyncError: errorMessage,
          updatedAt: syncEndTime,
        })
        .where(eq(ouraConnections.id, connection.id));

      throw error;
    }
  }

  /**
   * Convert and save Oura sleep document to SleepCore format
   */
  private async saveOuraSleepSession(
    userId: string,
    connectionId: string,
    sleepDoc: OuraSleepDocument
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Convert Oura data to SleepCore format
    // Oura times are in seconds, convert to minutes
    const tstMinutes = sleepDoc.total_sleep_duration
      ? Math.round(sleepDoc.total_sleep_duration / 60)
      : null;
    const tibMinutes = sleepDoc.time_in_bed
      ? Math.round(sleepDoc.time_in_bed / 60)
      : null;
    const wasoMinutes = sleepDoc.awake_time
      ? Math.round(sleepDoc.awake_time / 60)
      : null;
    const solMinutes = sleepDoc.latency
      ? Math.round(sleepDoc.latency / 60)
      : null;

    // Sleep efficiency from Oura (already percentage)
    const se = sleepDoc.efficiency;

    // Stage durations in minutes
    const deepMinutes = sleepDoc.deep_sleep_duration
      ? Math.round(sleepDoc.deep_sleep_duration / 60)
      : null;
    const lightMinutes = sleepDoc.light_sleep_duration
      ? Math.round(sleepDoc.light_sleep_duration / 60)
      : null;
    const remMinutes = sleepDoc.rem_sleep_duration
      ? Math.round(sleepDoc.rem_sleep_duration / 60)
      : null;

    // Calculate stage percentages
    const totalSleep = (deepMinutes || 0) + (lightMinutes || 0) + (remMinutes || 0) + (wasoMinutes || 0);
    const stageWake = totalSleep > 0 && wasoMinutes ? (wasoMinutes / totalSleep) * 100 : null;
    const stageDeep = totalSleep > 0 && deepMinutes ? (deepMinutes / totalSleep) * 100 : null;
    const stageLight = totalSleep > 0 && lightMinutes ? (lightMinutes / totalSleep) * 100 : null;
    const stageRem = totalSleep > 0 && remMinutes ? (remMinutes / totalSleep) * 100 : null;

    // HRV metrics
    const hrvMeanRmssd = sleepDoc.average_hrv;

    // Prepare raw data for storage (encrypted)
    let stagesJson: string | null = null;
    let hrvJson: string | null = null;
    let heartRateJson: string | null = null;

    if (isEncryptionAvailable()) {
      const encryption = getEncryptionService();

      if (sleepDoc.sleep_phase_5_min) {
        stagesJson = encryption.encrypt(JSON.stringify({
          phases: sleepDoc.sleep_phase_5_min,
          interval: 5,
        }));
      }

      if (sleepDoc.hrv) {
        hrvJson = encryption.encrypt(JSON.stringify(sleepDoc.hrv));
      }

      if (sleepDoc.heart_rate) {
        heartRateJson = encryption.encrypt(JSON.stringify(sleepDoc.heart_rate));
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('PHI encryption is required in production');
    } else {
      // Dev mode - store unencrypted
      if (sleepDoc.sleep_phase_5_min) {
        stagesJson = JSON.stringify({ phases: sleepDoc.sleep_phase_5_min, interval: 5 });
      }
      if (sleepDoc.hrv) {
        hrvJson = JSON.stringify(sleepDoc.hrv);
      }
      if (sleepDoc.heart_rate) {
        heartRateJson = JSON.stringify(sleepDoc.heart_rate);
      }
    }

    // Insert into wearable sessions table (unified format)
    await db.insert(wearableSleepSessions).values({
      id: nanoid(),
      userId,
      deviceId: connectionId, // Using connection ID as device reference
      sourceSessionId: `oura:${sleepDoc.id}`,
      source: 'oura_ring',
      startTime: sleepDoc.bedtime_start,
      endTime: sleepDoc.bedtime_end,
      tst: tstMinutes,
      tib: tibMinutes,
      se: se ? Math.round(se * 10) / 10 : null,
      waso: wasoMinutes,
      sol: solMinutes,
      awakenings: sleepDoc.restless_periods,
      stageWake: stageWake ? Math.round(stageWake * 10) / 10 : null,
      stageLight: stageLight ? Math.round(stageLight * 10) / 10 : null,
      stageDeep: stageDeep ? Math.round(stageDeep * 10) / 10 : null,
      stageRem: stageRem ? Math.round(stageRem * 10) / 10 : null,
      hrvMeanRmssd: hrvMeanRmssd ? Math.round(hrvMeanRmssd * 10) / 10 : null,
      hrvSdRmssd: null, // Oura doesn't provide SDNN
      hrvSampleCount: sleepDoc.hrv?.items?.filter(v => v !== null).length ?? null,
      restingHeartRate: sleepDoc.lowest_heart_rate,
      stagesJson,
      hrvJson,
      heartRateJson,
      notes: `Oura sleep score: ${sleepDoc.readiness?.score ?? 'N/A'}`,
      processedAt: now,
      syncedAt: now,
    });
  }

  /**
   * Update stored tokens after refresh
   */
  private async updateStoredTokens(
    connectionId: string,
    credentials: OuraCredentials
  ): Promise<void> {
    const db = getDatabase();

    let accessTokenEncrypted = credentials.accessToken;
    let refreshTokenEncrypted = credentials.refreshToken;

    if (isEncryptionAvailable()) {
      const encryption = getEncryptionService();
      accessTokenEncrypted = encryption.encrypt(credentials.accessToken);
      refreshTokenEncrypted = encryption.encrypt(credentials.refreshToken);
    }

    await db
      .update(ouraConnections)
      .set({
        accessToken: accessTokenEncrypted,
        refreshToken: refreshTokenEncrypted,
        tokenExpiresAt: credentials.expiresAt.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ouraConnections.id, connectionId));
  }

  /**
   * Disconnect Oura Ring
   */
  async disconnect(userId: string): Promise<boolean> {
    const db = getDatabase();

    // Load credentials to revoke token
    const hasCredentials = await this.loadCredentials(userId);
    if (hasCredentials) {
      try {
        await this.client.revokeToken();
      } catch {
        // Token revocation is best-effort
      }
    }

    // Deactivate connection (soft delete)
    await db
      .update(ouraConnections)
      .set({
        isActive: false,
        syncEnabled: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ouraConnections.userId, userId));

    return true;
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    lastSyncAt: string | null;
    tokenExpiresAt: string | null;
    scopesGranted: string[];
  }> {
    const db = getDatabase();

    const connection = await db.query.ouraConnections.findFirst({
      where: and(
        eq(ouraConnections.userId, userId),
        eq(ouraConnections.isActive, true)
      ),
    });

    if (!connection) {
      return {
        connected: false,
        lastSyncAt: null,
        tokenExpiresAt: null,
        scopesGranted: [],
      };
    }

    return {
      connected: true,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      scopesGranted: JSON.parse(connection.scopesGranted),
    };
  }
}
