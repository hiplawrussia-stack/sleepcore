/**
 * Migration 003 - Cultural Adaptations
 * =====================================
 *
 * Creates tables for cultural therapy modalities:
 * - tcm_plans: Traditional Chinese Medicine integration
 * - ayurveda_plans: Ayurveda & Yoga Nidra integration
 * - audit_log: Compliance audit trail
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration003: IMigration = {
  version: 3,
  name: 'cultural_adaptations',

  up: `
    -- TCM (Traditional Chinese Medicine) plans
    CREATE TABLE IF NOT EXISTS tcm_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      constitution TEXT NOT NULL,
      insomnia_pattern TEXT NOT NULL,
      integration_mode TEXT NOT NULL DEFAULT 'cbti_primary',
      acupoints_json TEXT,
      herbal_formula_json TEXT,
      mind_body_protocol_json TEXT,
      schedule_json TEXT,
      rationale TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Ayurveda plans
    CREATE TABLE IF NOT EXISTS ayurveda_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prakriti TEXT NOT NULL,
      vikriti_json TEXT,
      anidra_type TEXT NOT NULL,
      recommended_therapies_json TEXT,
      herbs_json TEXT,
      yoga_nidra_protocol_json TEXT,
      dinacharya_json TEXT,
      rationale TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit log for compliance (HIPAA/GDPR)
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value_json TEXT,
      new_value_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Consent history (GDPR compliance)
    CREATE TABLE IF NOT EXISTS consent_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      consent_type TEXT NOT NULL CHECK(consent_type IN ('terms', 'privacy', 'data_processing', 'research', 'marketing')),
      consent_given INTEGER NOT NULL,
      consent_version TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Data export requests (GDPR compliance)
    CREATE TABLE IF NOT EXISTS data_export_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_type TEXT NOT NULL CHECK(request_type IN ('export', 'delete', 'rectify')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'rejected')),
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT,
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_tcm_user ON tcm_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_tcm_deleted ON tcm_plans(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_ayurveda_user ON ayurveda_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_ayurveda_deleted ON ayurveda_plans(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

    CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_history(consent_type);

    CREATE INDEX IF NOT EXISTS idx_export_user ON data_export_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_export_status ON data_export_requests(status);
  `,

  down: `
    DROP INDEX IF EXISTS idx_export_status;
    DROP INDEX IF EXISTS idx_export_user;

    DROP INDEX IF EXISTS idx_consent_type;
    DROP INDEX IF EXISTS idx_consent_user;

    DROP INDEX IF EXISTS idx_audit_created;
    DROP INDEX IF EXISTS idx_audit_entity;
    DROP INDEX IF EXISTS idx_audit_action;
    DROP INDEX IF EXISTS idx_audit_user;

    DROP INDEX IF EXISTS idx_ayurveda_deleted;
    DROP INDEX IF EXISTS idx_ayurveda_user;

    DROP INDEX IF EXISTS idx_tcm_deleted;
    DROP INDEX IF EXISTS idx_tcm_user;

    DROP TABLE IF EXISTS data_export_requests;
    DROP TABLE IF EXISTS consent_history;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS ayurveda_plans;
    DROP TABLE IF EXISTS tcm_plans;
  `,
};
