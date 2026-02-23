/**
 * Open Wearables Integration Module
 *
 * Provides integration with Open Wearables API for accessing
 * sleep and health data from 200+ wearable devices.
 *
 * @packageDocumentation
 * @module wearable/open-wearables
 *
 * Architecture:
 * - Types: API request/response structures
 * - OpenWearablesClient: HTTP client for API communication
 * - OpenWearablesAdapter: Data normalization to SleepCore format
 * - OpenWearablesService: High-level orchestration service
 *
 * Integration path:
 * 1. User connects wearable via OAuth (Open Wearables handles auth)
 * 2. OpenWearablesService syncs data periodically
 * 3. OpenWearablesAdapter normalizes to IWearableSleepData
 * 4. WearableIngestionService validates and stores
 * 5. Data integrates with PAT for phenotyping
 *
 * Supported providers (200+):
 * - High quality (confidence >= 0.8): Oura, WHOOP, Garmin, Polar, Apple
 * - Medium quality: Fitbit, Samsung, Huawei, Xiaomi
 * - Basic: Others via Open Wearables API
 *
 * @since 2026-02
 */

// Types
export * from './types';

// Client
export {
  OpenWearablesClient,
  OpenWearablesAPIError,
  createOpenWearablesClient,
} from './OpenWearablesClient';

// Adapter
export {
  OpenWearablesAdapter,
  createOpenWearablesAdapter,
} from './OpenWearablesAdapter';
export type { IAdaptedSleepData } from './OpenWearablesAdapter';

// Service
export {
  OpenWearablesService,
  createOpenWearablesService,
} from './OpenWearablesService';
export type {
  IOpenWearablesServiceConfig,
  IOpenWearablesSyncResult,
} from './OpenWearablesService';
