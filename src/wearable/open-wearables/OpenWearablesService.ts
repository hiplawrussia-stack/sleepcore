/**
 * Open Wearables Integration Service
 *
 * High-level service for integrating Open Wearables API with SleepCore.
 * Orchestrates client, adapter, and ingestion service.
 *
 * @packageDocumentation
 * @module wearable/open-wearables
 *
 * Features:
 * - Unified API for multi-device data access
 * - Automatic data normalization
 * - Quality-based data prioritization
 * - Multi-source fusion for same time periods
 * - Caching for reduced API calls
 *
 * Integration with SleepCore:
 * - Works alongside Health Connect integration
 * - Extends device support to 200+ wearables
 * - Maintains data quality standards
 *
 * @since 2026-02
 */

import { OpenWearablesClient, createOpenWearablesClient, OpenWearablesAPIError } from './OpenWearablesClient';
import { OpenWearablesAdapter, IAdaptedSleepData, createOpenWearablesAdapter } from './OpenWearablesAdapter';
import {
  IOpenWearablesConfig,
  IOpenWearablesConnection,
  OpenWearablesProvider,
  IOpenWearablesSyncStatus,
} from './types';
import {
  IWearableSyncPayload,
} from '../types';
import { WearableIngestionService } from '../WearableIngestionService';

/**
 * Service configuration
 */
export interface IOpenWearablesServiceConfig extends IOpenWearablesConfig {
  /** Enable data caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;

  /** Minimum quality score to accept data (0-1) */
  minQualityScore?: number;

  /** Enable multi-source fusion */
  enableFusion?: boolean;
}

/**
 * Sync result for a user
 */
export interface IOpenWearablesSyncResult {
  /** Number of sessions synced */
  sessionsSynced: number;

  /** Number of sessions skipped (quality/duplicates) */
  sessionsSkipped: number;

  /** Providers synced */
  providers: OpenWearablesProvider[];

  /** Quality statistics */
  qualityStats: {
    avgQualityScore: number;
    highQualitySessions: number;
    lowQualitySessions: number;
  };

  /** Errors encountered */
  errors: Array<{
    provider: OpenWearablesProvider;
    message: string;
  }>;

  /** Warnings */
  warnings: string[];
}

/**
 * Data fusion result when multiple sources have overlapping data
 */
interface IFusedSleepData {
  /** Primary data source (highest quality) */
  primary: IAdaptedSleepData;

  /** Supporting data sources */
  supporting: IAdaptedSleepData[];

  /** Combined quality score */
  fusedQualityScore: number;
}

/**
 * Open Wearables Integration Service
 *
 * Example usage:
 * ```typescript
 * const service = new OpenWearablesService({
 *   baseUrl: 'https://api.openwearables.local',
 *   apiKey: 'your-api-key',
 *   minQualityScore: 0.7
 * });
 *
 * // Sync user data
 * const result = await service.syncUserData('user123', 7);
 *
 * // Get connected providers
 * const providers = await service.getConnectedProviders('user123');
 * ```
 */
export class OpenWearablesService {
  private readonly client: OpenWearablesClient;
  private readonly adapter: OpenWearablesAdapter;
  private readonly ingestionService: WearableIngestionService;
  private readonly config: IOpenWearablesServiceConfig;

  // Simple in-memory cache
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  constructor(
    config: IOpenWearablesServiceConfig,
    ingestionService?: WearableIngestionService
  ) {
    this.config = {
      enableCache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      minQualityScore: 0.6,
      enableFusion: true,
      ...config,
    };

    this.client = createOpenWearablesClient(config);
    this.adapter = createOpenWearablesAdapter();
    this.ingestionService = ingestionService || new WearableIngestionService();
  }

  /**
   * Sync user data from Open Wearables for the specified number of days
   *
   * @param userId - SleepCore user ID
   * @param days - Number of days to sync (default: 7)
   * @returns Sync result
   */
  async syncUserData(userId: string, days: number = 7): Promise<IOpenWearablesSyncResult> {
    const result: IOpenWearablesSyncResult = {
      sessionsSynced: 0,
      sessionsSkipped: 0,
      providers: [],
      qualityStats: {
        avgQualityScore: 0,
        highQualitySessions: 0,
        lowQualitySessions: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch sleep sessions
      const response = await this.client.getSleepSessions({
        userId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        includeHrv: true,
        includeSpo2: true,
        includeRespiration: true,
        includeTemperature: true,
      });

      if (response.sessions.length === 0) {
        return result;
      }

      // Adapt sessions
      const adaptedSessions = this.adapter.adaptSleepSessions(response.sessions);

      // Track unique providers
      const providers = new Set<OpenWearablesProvider>();

      // Quality tracking
      let totalQuality = 0;

      // Group sessions by date for potential fusion
      const sessionsByDate = this.groupSessionsByDate(adaptedSessions);

      // Process each date's sessions
      for (const [_, dateSessions] of sessionsByDate) {
        // Apply fusion if enabled and multiple sources
        let sessionsToProcess: IAdaptedSleepData[];

        if (this.config.enableFusion && dateSessions.length > 1) {
          const fused = this.fuseSessions(dateSessions);
          sessionsToProcess = [fused.primary];
          result.warnings.push(
            `Fused ${dateSessions.length} sessions for same period (quality: ${fused.fusedQualityScore.toFixed(2)})`
          );
        } else {
          sessionsToProcess = dateSessions;
        }

        for (const adapted of sessionsToProcess) {
          // Track provider
          const provider = response.sessions.find(s => s.id === adapted.data.sessionId)?.provider;
          if (provider) {
            providers.add(provider);
          }

          // Check quality threshold
          if (adapted.qualityScore < this.config.minQualityScore!) {
            result.sessionsSkipped++;
            result.qualityStats.lowQualitySessions++;
            continue;
          }

          totalQuality += adapted.qualityScore;

          if (adapted.qualityScore >= 0.8) {
            result.qualityStats.highQualitySessions++;
          }

          // Add warnings
          result.warnings.push(...adapted.warnings);

          // Process through ingestion service
          try {
            const syncPayload: IWearableSyncPayload = {
              userId,
              device: {
                id: adapted.data.deviceId,
                manufacturer: 'open_wearables',
                model: provider || 'unknown',
                osVersion: 'N/A',
              },
              syncInfo: {
                timestamp: new Date(),
                lastSyncTime: new Date(),
                appVersion: '1.0.0',
              },
              sleepSessions: [adapted.data],
            };

            const syncResponse = await this.ingestionService.processSyncPayload(syncPayload);

            if (syncResponse.success) {
              result.sessionsSynced += syncResponse.sessionsProcessed;
            } else if (syncResponse.errors) {
              for (const error of syncResponse.errors) {
                result.errors.push({
                  provider: provider || 'unknown' as OpenWearablesProvider,
                  message: error.error,
                });
              }
            }
          } catch (error) {
            result.errors.push({
              provider: provider || 'unknown' as OpenWearablesProvider,
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      result.providers = Array.from(providers);
      result.qualityStats.avgQualityScore = result.sessionsSynced > 0
        ? totalQuality / result.sessionsSynced
        : 0;

    } catch (error) {
      if (error instanceof OpenWearablesAPIError) {
        result.errors.push({
          provider: 'custom',
          message: `API error: ${error.message} (${error.code})`,
        });
      } else {
        result.errors.push({
          provider: 'custom',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Get connected providers for a user
   *
   * @param userId - SleepCore user ID
   * @returns Connected providers
   */
  async getConnectedProviders(userId: string): Promise<IOpenWearablesConnection[]> {
    const cacheKey = `providers_${userId}`;

    // Check cache
    if (this.config.enableCache) {
      const cached = this.getFromCache<IOpenWearablesConnection[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.client.getConnectedProviders(userId);

    // Cache result
    if (this.config.enableCache) {
      this.setCache(cacheKey, response.connections);
    }

    return response.connections;
  }

  /**
   * Connect a new provider for a user
   *
   * @param userId - SleepCore user ID
   * @param provider - Provider to connect
   * @param redirectUrl - OAuth redirect URL
   * @returns OAuth authorization URL
   */
  async connectProvider(
    userId: string,
    provider: OpenWearablesProvider,
    redirectUrl: string
  ): Promise<string> {
    const response = await this.client.initiateConnection({
      userId,
      provider,
      redirectUrl,
    });

    // Invalidate providers cache
    this.invalidateCache(`providers_${userId}`);

    return response.authUrl;
  }

  /**
   * Disconnect a provider for a user
   *
   * @param userId - SleepCore user ID
   * @param provider - Provider to disconnect
   */
  async disconnectProvider(
    userId: string,
    provider: OpenWearablesProvider
  ): Promise<void> {
    await this.client.disconnectProvider(userId, provider);

    // Invalidate providers cache
    this.invalidateCache(`providers_${userId}`);
  }

  /**
   * Get sync status for a user
   *
   * @param userId - SleepCore user ID
   * @returns Sync status
   */
  async getSyncStatus(userId: string): Promise<IOpenWearablesSyncStatus> {
    return this.client.getSyncStatus(userId);
  }

  /**
   * Trigger manual sync for a user
   *
   * @param userId - SleepCore user ID
   * @param providers - Specific providers to sync (optional)
   */
  async triggerManualSync(
    userId: string,
    providers?: OpenWearablesProvider[]
  ): Promise<void> {
    await this.client.triggerSync(userId, providers);
  }

  /**
   * Check if Open Wearables API is available
   *
   * @returns true if API is healthy
   */
  async isAvailable(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Get high-quality providers
   *
   * @returns List of providers with confidence >= 0.8
   */
  getHighQualityProviders(): OpenWearablesProvider[] {
    return this.adapter.getHighQualityProviders();
  }

  /**
   * Check if a provider is high quality
   *
   * @param provider - Provider to check
   * @returns true if provider has high quality data
   */
  isHighQualityProvider(provider: OpenWearablesProvider): boolean {
    return this.adapter.isHighQualityProvider(provider);
  }

  /**
   * Group sessions by date for fusion
   */
  private groupSessionsByDate(
    sessions: IAdaptedSleepData[]
  ): Map<string, IAdaptedSleepData[]> {
    const groups = new Map<string, IAdaptedSleepData[]>();

    for (const session of sessions) {
      // Use end date as the "sleep night" date
      const dateKey = session.data.endTime.toISOString().split('T')[0];

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(session);
    }

    return groups;
  }

  /**
   * Fuse multiple sessions from different sources
   *
   * Prioritizes highest quality source as primary,
   * uses supporting sources to fill gaps.
   */
  private fuseSessions(sessions: IAdaptedSleepData[]): IFusedSleepData {
    // Sort by quality score descending
    const sorted = [...sessions].sort((a, b) => b.qualityScore - a.qualityScore);

    const primary = sorted[0];
    const supporting = sorted.slice(1);

    // Fill in missing data from supporting sources
    if (!primary.data.hrv && supporting.length > 0) {
      const withHRV = supporting.find(s => s.data.hrv && s.data.hrv.length > 0);
      if (withHRV) {
        primary.data.hrv = withHRV.data.hrv;
        primary.warnings.push(`HRV data from ${withHRV.data.source}`);
      }
    }

    if (!primary.data.stages && supporting.length > 0) {
      const withStages = supporting.find(s => s.data.stages && s.data.stages.length > 0);
      if (withStages) {
        primary.data.stages = withStages.data.stages;
        primary.warnings.push(`Stages from ${withStages.data.source}`);
      }
    }

    if (!primary.data.spo2 && supporting.length > 0) {
      const withSpO2 = supporting.find(s => s.data.spo2 !== undefined);
      if (withSpO2) {
        primary.data.spo2 = withSpO2.data.spo2;
        primary.data.spo2Min = withSpO2.data.spo2Min;
        primary.warnings.push(`SpO2 from ${withSpO2.data.source}`);
      }
    }

    // Calculate fused quality score (weighted average)
    const totalWeight = sessions.reduce((sum, s) => sum + s.qualityScore, 0);
    const fusedQualityScore = totalWeight / sessions.length;

    return {
      primary,
      supporting,
      fusedQualityScore,
    };
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.config.cacheTTL!,
    });
  }

  /**
   * Invalidate cache entry
   */
  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Factory function for creating service
 */
export function createOpenWearablesService(
  config: IOpenWearablesServiceConfig,
  ingestionService?: WearableIngestionService
): OpenWearablesService {
  return new OpenWearablesService(config, ingestionService);
}
