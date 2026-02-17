/**
 * Oura Integration Database Schema
 * =================================
 * Drizzle ORM schema for Oura Ring OAuth2 connections.
 *
 * @packageDocumentation
 * @module api/integrations/oura
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from '../../db/schema.js';

/**
 * Oura Connections table
 * Stores OAuth2 credentials for Oura Ring users
 */
export const ouraConnections = sqliteTable('api_oura_connections', {
  id: text('id').primaryKey(),

  // User reference
  userId: text('user_id').notNull().references(() => users.id).unique(),
  telegramId: integer('telegram_id').notNull(),

  // Oura user info
  ouraUserId: text('oura_user_id'),
  ouraEmail: text('oura_email'),

  // OAuth2 tokens (encrypted in production)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: text('token_expires_at').notNull(),

  // Scopes granted
  scopesGranted: text('scopes_granted').notNull(), // JSON array

  // Connection status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncAt: text('last_sync_at'),
  lastSyncStatus: text('last_sync_status'), // 'success', 'failed', 'partial'
  lastSyncError: text('last_sync_error'),

  // Sync settings
  syncEnabled: integer('sync_enabled', { mode: 'boolean' }).default(true),
  lastSyncedDate: text('last_synced_date'), // YYYY-MM-DD format

  // Timestamps
  connectedAt: text('connected_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Oura Sync Log table
 * Tracks sync operations from Oura API
 */
export const ouraSyncLog = sqliteTable('api_oura_sync_log', {
  id: text('id').primaryKey(),

  // References
  userId: text('user_id').notNull().references(() => users.id),
  connectionId: text('connection_id').notNull().references(() => ouraConnections.id),

  // Sync info
  syncType: text('sync_type').notNull(), // 'manual', 'scheduled', 'initial', 'webhook'
  dateRangeStart: text('date_range_start').notNull(),
  dateRangeEnd: text('date_range_end').notNull(),

  // Results
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
});

/**
 * OAuth state storage (temporary)
 * For CSRF protection during OAuth flow
 */
export const ouraOAuthStates = sqliteTable('api_oura_oauth_states', {
  state: text('state').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  telegramId: integer('telegram_id').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

// Type exports
export type OuraConnection = typeof ouraConnections.$inferSelect;
export type NewOuraConnection = typeof ouraConnections.$inferInsert;
export type OuraSyncLogEntry = typeof ouraSyncLog.$inferSelect;
export type NewOuraSyncLogEntry = typeof ouraSyncLog.$inferInsert;
export type OuraOAuthState = typeof ouraOAuthStates.$inferSelect;
export type NewOuraOAuthState = typeof ouraOAuthStates.$inferInsert;
