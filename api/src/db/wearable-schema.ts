/**
 * Wearable Database Schema
 * ========================
 * Drizzle ORM schema for wearable device linking and data sync.
 *
 * @packageDocumentation
 * @module api/db
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users } from './schema.js';

/**
 * Wearable Devices table
 * Stores linked Android companion app devices
 */
export const wearableDevices = sqliteTable('api_wearable_devices', {
  id: text('id').primaryKey(),

  // User reference
  userId: text('user_id').notNull().references(() => users.id),
  telegramId: integer('telegram_id').notNull(),

  // Device info
  deviceId: text('device_id').notNull().unique(),
  deviceName: text('device_name'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  osVersion: text('os_version'),
  appVersion: text('app_version'),

  // Authentication
  deviceToken: text('device_token').notNull().unique(),
  tokenExpiresAt: text('token_expires_at'),

  // Linking
  linkCode: text('link_code').unique(),
  linkCodeExpiresAt: text('link_code_expires_at'),
  linkedAt: text('linked_at'),

  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncAt: text('last_sync_at'),

  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
export type WearableDevice = typeof wearableDevices.$inferSelect;
export type NewWearableDevice = typeof wearableDevices.$inferInsert;
export type WearableSleepSession = typeof wearableSleepSessions.$inferSelect;
export type NewWearableSleepSession = typeof wearableSleepSessions.$inferInsert;
export type WearableSyncLogEntry = typeof wearableSyncLog.$inferSelect;
export type NewWearableSyncLogEntry = typeof wearableSyncLog.$inferInsert;
