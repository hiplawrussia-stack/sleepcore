/**
 * Wearable Integration Module
 *
 * Provides multi-source wearable data integration:
 * - Health Connect API (Android native)
 * - Open Wearables API (200+ devices via unified API)
 *
 * @packageDocumentation
 * @module wearable
 *
 * Architecture:
 * - Types: Data structures for all wearable sources
 * - WearableIngestionService: Validates and processes incoming data
 * - WearablePATIntegration: Phenotyping from wearable data
 * - OpenWearablesService: Integration with Open Wearables API
 *
 * Integration paths:
 * 1. Health Connect (Android): Companion App -> API -> WearableIngestionService
 * 2. Open Wearables: OAuth -> OpenWearablesService -> WearableIngestionService
 *
 * Both paths normalize data to IWearableSleepData and integrate
 * with PAT for Blanken phenotyping.
 *
 * @since 2026-02: Added Open Wearables API integration
 */

// Types
export * from './types';

// Services
export { WearableIngestionService } from './WearableIngestionService';
export type { IWearableIngestionConfig } from './WearableIngestionService';

// Readiness Score Calculator (2025-02)
export {
  calculateReadinessScore,
  getReadinessCategory,
} from './ReadinessScoreCalculator';
export type { IReadinessScoreConfig } from './ReadinessScoreCalculator';

// PAT Integration
export {
  WearablePATIntegration,
  createWearablePATIntegration,
} from './WearablePATIntegration';
export type {
  IWearableHRVFeatures,
  IWearableSleepFeatures,
  IBlankenPhenotypeHints,
} from './WearablePATIntegration';

// Open Wearables API Integration (2026-02)
export {
  OpenWearablesClient,
  OpenWearablesAdapter,
  OpenWearablesService,
  OpenWearablesAPIError,
  createOpenWearablesClient,
  createOpenWearablesAdapter,
  createOpenWearablesService,
} from './open-wearables';
export type {
  IOpenWearablesConfig,
  IOpenWearablesServiceConfig,
  IOpenWearablesSyncResult,
  IOpenWearablesConnection,
  IOpenWearablesSleepSession,
  OpenWearablesProvider,
  IAdaptedSleepData,
} from './open-wearables';
