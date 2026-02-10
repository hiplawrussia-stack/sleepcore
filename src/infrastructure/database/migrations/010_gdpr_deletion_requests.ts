/**
 * Migration 010: GDPR Deletion Requests
 * ======================================
 * Adds table for tracking Article 17 deletion requests.
 *
 * GDPR Compliance:
 * - Article 17: Right to erasure ("right to be forgotten")
 * - Article 12(3): 30-day response window
 * - EDPB 2025 Coordinated Enforcement Framework
 *
 * EU MDR Consideration:
 * - Medical data may require 10-15 year retention
 * - Anonymization as alternative to deletion
 *
 * @see CLAUDE.md §9.3 — Data Protection
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/migrations
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration010: IMigration = {
  version: 10,
  name: 'gdpr_deletion_requests',

  up: `
    -- ===========================================================
    -- Migration 010: GDPR Deletion Requests
    -- ===========================================================
    -- GDPR Article 17: Right to erasure
    -- Article 12(3): 30-day deadline
    -- EU MDR: Medical data retention consideration
    -- ===========================================================

    CREATE TABLE IF NOT EXISTS deletion_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      external_id TEXT NOT NULL,

      -- Request status workflow
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retained')),

      -- Request details
      request_type TEXT NOT NULL DEFAULT 'full_deletion'
        CHECK (request_type IN ('full_deletion', 'anonymization', 'partial_deletion')),
      request_source TEXT NOT NULL DEFAULT 'user_request'
        CHECK (request_source IN ('user_request', 'admin', 'regulatory', 'consent_withdrawal')),
      request_reason TEXT,

      -- GDPR Article 12(3): 30-day deadline tracking
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      deadline_at TEXT NOT NULL,
      processed_at TEXT,

      -- Retention override (EU MDR medical data)
      retention_required INTEGER DEFAULT 0,
      retention_reason TEXT,
      retention_until TEXT,

      -- Processing details
      deleted_tables TEXT,  -- JSON array of affected tables
      deleted_record_counts TEXT,  -- JSON object {table: count}
      error_message TEXT,

      -- Audit trail
      processed_by INTEGER,  -- Admin user ID if admin-initiated
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Index for finding pending requests
    CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
    ON deletion_requests(status);

    -- Index for deadline tracking
    CREATE INDEX IF NOT EXISTS idx_deletion_requests_deadline
    ON deletion_requests(deadline_at);

    -- Index for user lookup
    CREATE INDEX IF NOT EXISTS idx_deletion_requests_user
    ON deletion_requests(user_id);

    -- Index for external_id lookup (Telegram ID, etc.)
    CREATE INDEX IF NOT EXISTS idx_deletion_requests_external_id
    ON deletion_requests(external_id);
  `,

  down: `
    DROP TABLE IF EXISTS deletion_requests;
  `,
};
