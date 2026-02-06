/**
 * Migration 008 - Adverse Events Tables
 * ======================================
 *
 * Creates tables for adverse event tracking and regulatory compliance.
 *
 * Compliance:
 * - ICH E6(R3): GCP requirements for safety reporting
 * - ICH E2B(R3): ICSR data elements
 * - 21 CFR Part 11: Electronic records audit trail
 * - ГОСТ IEC 62304-2022: Medical device software lifecycle
 * - CIOMS Form I: Minimum data elements
 *
 * Tables created:
 * - adverse_events: Core AE reports with CIOMS data
 * - adverse_events_audit: Immutable audit trail (21 CFR Part 11)
 * - safety_alerts: Real-time safety notifications
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration008: IMigration = {
  version: 8,
  name: 'adverse_events',

  up: `
    -- ===========================================================
    -- Adverse Events Table (CIOMS + ICH E2B(R3) compliant)
    -- ===========================================================
    CREATE TABLE IF NOT EXISTS adverse_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- UUID for external reference (regulatory submissions)
      uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),

      -- User reference
      user_id TEXT NOT NULL,
      user_internal_id INTEGER,

      -- CIOMS E.1: Reporter identification
      reporter_type TEXT NOT NULL CHECK (reporter_type IN ('patient', 'healthcare_professional', 'other')),
      reporter_name TEXT,
      reporter_contact TEXT,

      -- CIOMS E.2: Patient identification
      patient_initials TEXT,
      patient_age INTEGER,
      patient_sex TEXT CHECK (patient_sex IN ('male', 'female', 'other')),

      -- CIOMS E.3: Suspect product
      product_name TEXT NOT NULL DEFAULT 'SleepCore DTx',
      product_version TEXT,

      -- CIOMS E.4: Adverse reaction
      reaction_term TEXT NOT NULL,
      reaction_onset_date TEXT NOT NULL,

      -- Classification (ICH E2A)
      severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
      is_serious INTEGER NOT NULL DEFAULT 0,
      seriousness_criteria_json TEXT,
      expectedness TEXT NOT NULL CHECK (expectedness IN ('expected', 'unexpected')),

      -- DTx-specific (MedDRA coding)
      dtx_category TEXT,
      meddra_pt_code TEXT,
      meddra_soc TEXT,
      custom_term TEXT,

      -- Clinical details
      description TEXT,
      onset_date TEXT NOT NULL,
      resolution_date TEXT,
      outcome TEXT CHECK (outcome IN ('recovered', 'recovering', 'not_recovered', 'recovered_with_sequelae', 'fatal', 'unknown')),

      -- Assessment
      causality TEXT CHECK (causality IN ('certain', 'probable', 'possible', 'unlikely', 'conditional', 'unassessable')),
      action_taken TEXT CHECK (action_taken IN ('none', 'dose_reduced', 'temporarily_interrupted', 'permanently_discontinued', 'not_applicable')),

      -- Context data (CBT-I specific)
      current_isi INTEGER,
      baseline_isi INTEGER,
      current_week INTEGER,

      -- Regulatory tracking
      report_status TEXT NOT NULL DEFAULT 'draft' CHECK (report_status IN ('draft', 'pending_review', 'submitted_roszdravnadzor', 'submitted_ethics', 'closed')),
      regulatory_deadline TEXT,
      submitted_to_roszdravnadzor TEXT,
      submitted_to_ethics TEXT,

      -- Metadata (21 CFR Part 11 compliance)
      reported_at TEXT NOT NULL DEFAULT (datetime('now')),
      reported_by TEXT NOT NULL CHECK (reported_by IN ('patient', 'system', 'clinician')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system',

      -- Soft delete (GDPR compliance)
      deleted_at TEXT,

      -- Notes for follow-up
      notes TEXT
    );

    -- Indexes for adverse_events
    CREATE INDEX IF NOT EXISTS idx_ae_user_id ON adverse_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_ae_uuid ON adverse_events(uuid);
    CREATE INDEX IF NOT EXISTS idx_ae_is_serious ON adverse_events(is_serious);
    CREATE INDEX IF NOT EXISTS idx_ae_report_status ON adverse_events(report_status);
    CREATE INDEX IF NOT EXISTS idx_ae_regulatory_deadline ON adverse_events(regulatory_deadline);
    CREATE INDEX IF NOT EXISTS idx_ae_created_at ON adverse_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_ae_deleted_at ON adverse_events(deleted_at);

    -- ===========================================================
    -- Adverse Events Audit Trail (21 CFR Part 11)
    -- Immutable record of all changes to adverse events
    -- ===========================================================
    CREATE TABLE IF NOT EXISTS adverse_events_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Reference to adverse event
      adverse_event_id INTEGER NOT NULL,

      -- Action type
      action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'SUBMISSION')),

      -- Timestamp (immutable)
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Who made the change
      changed_by TEXT NOT NULL,

      -- What changed (JSON)
      old_values_json TEXT,
      new_values_json TEXT,

      -- Reason for change (required for regulatory)
      reason TEXT,

      -- Additional context
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,

      FOREIGN KEY (adverse_event_id) REFERENCES adverse_events(id) ON DELETE RESTRICT
    );

    -- Indexes for audit trail
    CREATE INDEX IF NOT EXISTS idx_ae_audit_event_id ON adverse_events_audit(adverse_event_id);
    CREATE INDEX IF NOT EXISTS idx_ae_audit_changed_at ON adverse_events_audit(changed_at);
    CREATE INDEX IF NOT EXISTS idx_ae_audit_action ON adverse_events_audit(action);

    -- ===========================================================
    -- Safety Alerts Table
    -- Real-time notifications for safety-critical events
    -- ===========================================================
    CREATE TABLE IF NOT EXISTS safety_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Alert classification
      type TEXT NOT NULL CHECK (type IN ('ISI_WORSENING', 'SERIOUS_AE', 'SUSAR', 'DEADLINE_APPROACHING', 'CRISIS')),
      severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),

      -- User reference
      user_id TEXT NOT NULL,
      user_display_name TEXT,

      -- Alert content
      message TEXT NOT NULL,

      -- Related adverse event (optional)
      adverse_event_id INTEGER,

      -- Timestamps
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Acknowledgment tracking
      acknowledged INTEGER NOT NULL DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,

      -- Escalation tracking
      escalated INTEGER NOT NULL DEFAULT 0,
      escalated_to TEXT,
      escalated_at TEXT,

      FOREIGN KEY (adverse_event_id) REFERENCES adverse_events(id)
    );

    -- Indexes for safety alerts
    CREATE INDEX IF NOT EXISTS idx_sa_user_id ON safety_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_sa_type ON safety_alerts(type);
    CREATE INDEX IF NOT EXISTS idx_sa_acknowledged ON safety_alerts(acknowledged);
    CREATE INDEX IF NOT EXISTS idx_sa_created_at ON safety_alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_sa_adverse_event_id ON safety_alerts(adverse_event_id);
  `,

  down: `
    -- Drop indexes first
    DROP INDEX IF EXISTS idx_sa_adverse_event_id;
    DROP INDEX IF EXISTS idx_sa_created_at;
    DROP INDEX IF EXISTS idx_sa_acknowledged;
    DROP INDEX IF EXISTS idx_sa_type;
    DROP INDEX IF EXISTS idx_sa_user_id;

    DROP INDEX IF EXISTS idx_ae_audit_action;
    DROP INDEX IF EXISTS idx_ae_audit_changed_at;
    DROP INDEX IF EXISTS idx_ae_audit_event_id;

    DROP INDEX IF EXISTS idx_ae_deleted_at;
    DROP INDEX IF EXISTS idx_ae_created_at;
    DROP INDEX IF EXISTS idx_ae_regulatory_deadline;
    DROP INDEX IF EXISTS idx_ae_report_status;
    DROP INDEX IF EXISTS idx_ae_is_serious;
    DROP INDEX IF EXISTS idx_ae_uuid;
    DROP INDEX IF EXISTS idx_ae_user_id;

    -- Drop tables
    DROP TABLE IF EXISTS safety_alerts;
    DROP TABLE IF EXISTS adverse_events_audit;
    DROP TABLE IF EXISTS adverse_events;
  `,
};
