/**
 * Wearable Integration Module
 *
 * Provides Health Connect API integration for receiving
 * sleep and HRV data from Samsung and other wearable devices.
 *
 * @packageDocumentation
 * @module wearable
 *
 * Architecture:
 * - Types: Data structures matching Health Connect API
 * - WearableIngestionService: Validates and processes incoming data
 * - WearableRepository: Persistence layer (to be implemented)
 *
 * Integration path:
 * 1. Android Companion App reads Health Connect
 * 2. App syncs data to SleepCore backend via API
 * 3. WearableIngestionService validates and stores
 * 4. PAT Adapter uses real wearable data for phenotyping
 */

// Types
export * from './types';

// Services
export { WearableIngestionService } from './WearableIngestionService';
export type { IWearableIngestionConfig } from './WearableIngestionService';

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
