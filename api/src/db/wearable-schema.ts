/**
 * Wearable Database Schema
 * ========================
 * Drizzle ORM schema for wearable device linking and data sync.
 *
 * Architecture based on RFC 8628 (OAuth 2.0 Device Authorization Grant):
 * - Separate link_codes table for authorization flow
 * - Access + Refresh token architecture
 * - Token rotation on refresh
 * - Rate limiting via attempts counter
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8628
 * @packageDocumentation
 * @module api/db
 */

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './schema.js';

/**
 * Device Link Codes table (RFC 8628)
 * Temporary codes for device authorization flow
 *
 * Flow:
 * 1. Bot calls /device/authorize → creates link code
 * 2. User enters code in Android app
 * 3. App calls /device/token → exchanges code for tokens
 * 4. Code is marked as used
 */
export const wearableLinkCodes = sqliteTable('api_wearable_link_codes', {
  id: text('id').primaryKey(),

  // User reference
  userId: text('user_id').notNull().references(() => users.id),
  telegramId: integer('telegram_id').notNull(),

  // RFC 8628: user_code (displayed to user, 6 chars)
  userCode: text('user_code').notNull().unique(),

  // RFC 8628: device_code (high entropy, used by app for polling)
  deviceCode: text('device_code').notNull().unique(),

  // Expiration (RFC 8628: typically 900 seconds / 15 minutes)
  expiresAt: text('expires_at').notNull(),

  // Usage tracking
  usedAt: text('used_at'), // NULL = not used, timestamp = used
  usedByDeviceId: text('used_by_device_id'), // Which device used this code

  // Rate limiting (RFC 8628 §5.2: SHOULD rate-limit)
  attempts: integer('attempts').default(0),
  lastAttemptAt: text('last_attempt_at'),

  // Timestamps
  createdAt: text('created_at').notNull(),
});

/**
 * Wearable Devices table
 * Stores linked Android companion app devices
 *
 * Note: deviceId is NOT globally unique - same physical device
 * can be linked to different users (device replacement scenario).
 * Uniqueness is enforced on (deviceId, userId) pair.
 */
export const wearableDevices = sqliteTable('api_wearable_devices', {
  id: text('id').primaryKey(),

  // User reference
  userId: text('user_id').notNull().references(() => users.id),
  telegramId: integer('telegram_id').notNull(),

  // Device info (deviceId = Android device ID)
  deviceId: text('device_id').notNull(),
  deviceName: text('device_name'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  osVersion: text('os_version'),
  appVersion: text('app_version'),

  // Access Token (short-lived: 1 hour)
  accessToken: text('access_token').notNull().unique(),
  accessTokenExpiresAt: text('access_token_expires_at').notNull(),

  // Refresh Token (longer-lived: 30 days, rotated on use)
  refreshToken: text('refresh_token').notNull().unique(),
  refreshTokenExpiresAt: text('refresh_token_expires_at').notNull(),

  // Token family for rotation detection (RFC 6749)
  tokenFamily: text('token_family').notNull(),

  // Linking info
  linkedAt: text('linked_at').notNull(),

  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  lastSyncAt: text('last_sync_at'),

  // Deactivation tracking (audit trail)
  deactivatedAt: text('deactivated_at'),
  deactivationReason: text('deactivation_reason'), // 'replaced', 'user_request', 'admin', 'token_reuse'

  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  // Composite unique: same device can only be linked once per user
  deviceUserIdx: uniqueIndex('device_user_idx').on(table.deviceId, table.userId),
}));

/**
 * Wearable Sleep Sessions table
 * Stores sleep sessions received from wearables
 */
export const wearableSleepSessions = sqliteTable('api_wearable_sleep_sessions', {
  id: text('id').primaryKey(),

  // References
  userId: text('user_id').notNull().references(() => users.id),
  deviceId: text('device_id').notNull().references(() => wearableDevices.id),

  // Session identifiers
  sourceSessionId: text('source_session_id').notNull(),
  source: text('source').notNull(), // 'health_connect', 'samsung_health', etc.

  // Time boundaries
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),

  // Calculated metrics
  tst: integer('tst'), // Total sleep time (minutes)
  tib: integer('tib'), // Time in bed (minutes)
  se: real('se'),      // Sleep efficiency (0-100)
  waso: integer('waso'), // Wake after sleep onset (minutes)
  sol: integer('sol'),   // Sleep onset latency (minutes)
  awakenings: integer('awakenings'),

  // Stage distribution (percentages)
  stageWake: real('stage_wake'),
  stageLight: real('stage_light'),
  stageDeep: real('stage_deep'),
  stageRem: real('stage_rem'),

  // HRV metrics
  hrvMeanRmssd: real('hrv_mean_rmssd'),
  hrvSdRmssd: real('hrv_sd_rmssd'),
  hrvSampleCount: integer('hrv_sample_count'),

  // Heart rate
  restingHeartRate: integer('resting_heart_rate'),

  // Raw data (JSON)
  stagesJson: text('stages_json'),    // Full stage data
  hrvJson: text('hrv_json'),          // Full HRV data
  heartRateJson: text('heart_rate_json'), // Full HR data

  // Metadata
  notes: text('notes'),
  processedAt: text('processed_at'),
  syncedAt: text('synced_at').notNull(),
});

/**
 * Wearable Sync Log table
 * Tracks sync operations from companion app
 */
export const wearableSyncLog = sqliteTable('api_wearable_sync_log', {
  id: text('id').primaryKey(),

  // References
  userId: text('user_id').notNull().references(() => users.id),
  deviceId: text('device_id').notNull().references(() => wearableDevices.id),

  // Sync info
  syncType: text('sync_type').notNull(), // 'manual', 'background', 'initial'
  sessionsReceived: integer('sessions_received').default(0),
  sessionsProcessed: integer('sessions_processed').default(0),
  sessionsSkipped: integer('sessions_skipped').default(0),

  // Timing
  syncStartedAt: text('sync_started_at').notNull(),
  syncCompletedAt: text('sync_completed_at'),
  durationMs: integer('duration_ms'),

  // Status
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorMessage: text('error_message'),
  errorsJson: text('errors_json'), // Array of session-specific errors

  // Data range
  dataFromTime: text('data_from_time'),
  dataToTime: text('data_to_time'),
});

// Type exports
export type WearableLinkCode = typeof wearableLinkCodes.$inferSelect;
export type NewWearableLinkCode = typeof wearableLinkCodes.$inferInsert;
export type WearableDevice = typeof wearableDevices.$inferSelect;
export type NewWearableDevice = typeof wearableDevices.$inferInsert;
export type WearableSleepSession = typeof wearableSleepSessions.$inferSelect;
export type NewWearableSleepSession = typeof wearableSleepSessions.$inferInsert;
export type WearableSyncLogEntry = typeof wearableSyncLog.$inferSelect;
export type NewWearableSyncLogEntry = typeof wearableSyncLog.$inferInsert;
