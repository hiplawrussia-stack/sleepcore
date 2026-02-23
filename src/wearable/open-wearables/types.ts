/**
 * Open Wearables API Type Definitions
 *
 * Types for integrating with Open Wearables API (MIT-licensed, self-hosted)
 * https://github.com/open-wearables/open-wearables
 *
 * @packageDocumentation
 * @module wearable/open-wearables
 *
 * Architecture:
 * - OpenWearablesClient: HTTP client for API communication
 * - OpenWearablesAdapter: Normalizes data to SleepCore format
 *
 * Supported devices (200+):
 * - Fitbit (via OAuth2)
 * - Garmin (via OAuth1.0a)
 * - Oura (via OAuth2)
 * - Polar (via AccessLink API)
 * - WHOOP (via OAuth2)
 * - Withings (via OAuth2)
 * - And many more via manufacturer APIs
 *
 * @since 2026-02
 */

/**
 * Open Wearables API configuration
 */
export interface IOpenWearablesConfig {
  /** Base URL for Open Wearables API (self-hosted) */
  baseUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number;
    /** Base delay between retries (ms) */
    baseDelay: number;
  };
}

/**
 * Supported data providers in Open Wearables
 *
 * Note: List based on Open Wearables documentation (2025-2026)
 * Some providers may require additional OAuth setup
 */
export type OpenWearablesProvider =
  | 'fitbit'
  | 'garmin'
  | 'oura'
  | 'polar'
  | 'whoop'
  | 'withings'
  | 'apple_health'    // Via Apple HealthKit export
  | 'google_fit'      // Deprecated but still supported
  | 'samsung_health'  // Via Health Connect bridge
  | 'huawei_health'
  | 'xiaomi_mi_fitness'
  | 'amazfit'
  | 'suunto'
  | 'coros'
  | 'eight_sleep'     // Smart mattress
  | 'dreem'           // Sleep headband
  | 'muse'            // EEG headband
  | 'biostrap'
  | 'ouraring'        // Alias for oura
  | 'custom';         // Custom integrations

/**
 * User connection status with a provider
 */
export interface IOpenWearablesConnection {
  /** Provider identifier */
  provider: OpenWearablesProvider;

  /** Connection status */
  status: 'connected' | 'disconnected' | 'expired' | 'error';

  /** Last sync timestamp */
  lastSync?: Date;

  /** Error message if status is 'error' */
  error?: string;

  /** Scopes granted by user */
  scopes?: string[];

  /** Token expiry (if applicable) */
  tokenExpiry?: Date;
}

/**
 * Open Wearables sleep session (raw API response)
 *
 * This is the structure returned by Open Wearables API.
 * Different providers may have different field availability.
 */
export interface IOpenWearablesSleepSession {
  /** Unique session ID */
  id: string;

  /** Data provider */
  provider: OpenWearablesProvider;

  /** User ID in Open Wearables system */
  userId: string;

  /** Session start time (ISO 8601) */
  startTime: string;

  /** Session end time (ISO 8601) */
  endTime: string;

  /** Time zone offset (e.g., "+03:00") */
  timezone?: string;

  /** Sleep stages (if available) */
  stages?: IOpenWearablesSleepStage[];

  /** HRV data (if available) */
  hrv?: IOpenWearablesHRVRecord[];

  /** Heart rate data (if available) */
  heartRate?: IOpenWearablesHeartRateRecord[];

  /** SpO2 data (if available) */
  spo2?: IOpenWearablesSpO2Record[];

  /** Respiration data (if available) */
  respiration?: IOpenWearablesRespirationRecord[];

  /** Skin temperature (if available) */
  skinTemperature?: IOpenWearablesTemperatureRecord[];

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;

  /** Data quality indicators from provider */
  quality?: {
    /** Overall quality score (0-100) */
    score: number;
    /** Quality issues */
    issues?: string[];
  };
}

/**
 * Sleep stage from Open Wearables
 *
 * Normalized stage types across all providers
 */
export interface IOpenWearablesSleepStage {
  /** Stage type (normalized) */
  type: 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

  /** Stage start time (ISO 8601) */
  startTime: string;

  /** Stage end time (ISO 8601) */
  endTime: string;

  /** Confidence score (0-100, if available) */
  confidence?: number;
}

/**
 * HRV record from Open Wearables
 */
export interface IOpenWearablesHRVRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: string;

  /**
   * RMSSD in milliseconds
   *
   * Primary HRV metric used by most wearables
   */
  rmssd: number;

  /**
   * SDNN in milliseconds (optional)
   *
   * Less commonly available from consumer wearables
   */
  sdnn?: number;

  /**
   * LF/HF ratio (optional)
   *
   * Sympathovagal balance indicator
   */
  lfHfRatio?: number;

  /** Measurement quality (0-100) */
  quality?: number;
}

/**
 * Heart rate record from Open Wearables
 */
export interface IOpenWearablesHeartRateRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: string;

  /** Heart rate in BPM */
  bpm: number;

  /** Is this a resting measurement */
  isResting?: boolean;
}

/**
 * SpO2 record from Open Wearables
 */
export interface IOpenWearablesSpO2Record {
  /** Measurement timestamp (ISO 8601) */
  timestamp: string;

  /** SpO2 percentage (0-100) */
  value: number;

  /** Measurement quality (0-100) */
  quality?: number;
}

/**
 * Respiration record from Open Wearables
 */
export interface IOpenWearablesRespirationRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: string;

  /** Breaths per minute */
  rate: number;
}

/**
 * Temperature record from Open Wearables
 */
export interface IOpenWearablesTemperatureRecord {
  /** Measurement timestamp (ISO 8601) */
  timestamp: string;

  /** Temperature value */
  value: number;

  /** Temperature unit */
  unit: 'celsius' | 'fahrenheit';

  /** Is this a deviation from baseline */
  isDeviation?: boolean;
}

/**
 * API response for listing sleep sessions
 */
export interface IOpenWearablesSleepListResponse {
  /** Sleep sessions */
  sessions: IOpenWearablesSleepSession[];

  /** Pagination info */
  pagination: {
    /** Total count */
    total: number;
    /** Current page */
    page: number;
    /** Items per page */
    perPage: number;
    /** Has more pages */
    hasMore: boolean;
  };
}

/**
 * API response for listing connected providers
 */
export interface IOpenWearablesProvidersResponse {
  /** Connected providers */
  connections: IOpenWearablesConnection[];
}

/**
 * Request parameters for fetching sleep data
 */
export interface IOpenWearablesSleepRequest {
  /** User ID */
  userId: string;

  /** Start date (ISO 8601) */
  startDate: string;

  /** End date (ISO 8601) */
  endDate: string;

  /** Filter by providers (optional) */
  providers?: OpenWearablesProvider[];

  /** Include HRV data */
  includeHrv?: boolean;

  /** Include SpO2 data */
  includeSpo2?: boolean;

  /** Include respiration data */
  includeRespiration?: boolean;

  /** Include temperature data */
  includeTemperature?: boolean;

  /** Page number */
  page?: number;

  /** Items per page */
  perPage?: number;
}

/**
 * OAuth connection request for a provider
 */
export interface IOpenWearablesConnectRequest {
  /** User ID in SleepCore */
  userId: string;

  /** Provider to connect */
  provider: OpenWearablesProvider;

  /** OAuth redirect URL */
  redirectUrl: string;

  /** Requested scopes */
  scopes?: string[];
}

/**
 * OAuth connection response
 */
export interface IOpenWearablesConnectResponse {
  /** OAuth authorization URL to redirect user */
  authUrl: string;

  /** State parameter for CSRF protection */
  state: string;
}

/**
 * Error response from Open Wearables API
 */
export interface IOpenWearablesError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Additional details */
  details?: Record<string, unknown>;

  /** Request ID for support */
  requestId?: string;
}

/**
 * Webhook payload for data updates
 *
 * Open Wearables can push updates via webhooks
 */
export interface IOpenWearablesWebhookPayload {
  /** Event type */
  event: 'sleep.created' | 'sleep.updated' | 'connection.status' | 'sync.completed';

  /** User ID */
  userId: string;

  /** Provider */
  provider: OpenWearablesProvider;

  /** Timestamp */
  timestamp: string;

  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Sync status for a user
 */
export interface IOpenWearablesSyncStatus {
  /** User ID */
  userId: string;

  /** Last successful sync per provider */
  lastSync: Record<OpenWearablesProvider, Date | null>;

  /** Sync in progress */
  syncing: boolean;

  /** Next scheduled sync */
  nextSync?: Date;

  /** Sync errors (if any) */
  errors?: Array<{
    provider: OpenWearablesProvider;
    error: string;
    timestamp: Date;
  }>;
}
