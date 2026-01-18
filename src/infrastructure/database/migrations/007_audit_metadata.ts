/**
 * Migration 007 - Audit Log Metadata
 * ===================================
 *
 * Adds metadata_json column to audit_log table for additional
 * context storage (HIPAA/GDPR compliance enhancement).
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration007: IMigration = {
  version: 7,
  name: 'audit_metadata',

  up: `
    -- Add metadata_json column for additional audit context
    ALTER TABLE audit_log ADD COLUMN metadata_json TEXT;
  `,

  down: `
    -- SQLite doesn't support DROP COLUMN directly
    -- This would require table recreation in a real rollback scenario
    -- For now, we leave the column (it's nullable anyway)
  `,
};
