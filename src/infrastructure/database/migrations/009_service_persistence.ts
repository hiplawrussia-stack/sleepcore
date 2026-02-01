/**
 * Migration 009 - Service Persistence Tables
 * ===========================================
 *
 * Creates tables for persisting bot service state across restarts.
 * Addresses FDA 21 CFR Part 11 (ALCOA+ data integrity), HIPAA (PHI at rest),
 * and IEC 62304 Class C (audit trail for safety-critical data).
 *
 * Tables created:
 * - safety_plans: Patient safety plans (CRITICAL - crisis escalation)
 * - isi_schedule_users: ISI assessment scheduling
 * - digital_twins: Patient digital twin state
 * - onboarding_progress: User onboarding funnel tracking
 * - service_state: Generic key-value for service state persistence
 * - notification_users: Proactive notification user registry
 * - proactive_insights: Clinical insight audit trail
 * - engagement_tracking: User engagement state
 * - communication_profiles: Adaptive persona profiles
 * - emotional_history: Emotional state history
 * - mct_worry_entries: MCT worry postponement entries
 * - mct_worry_settings: MCT worry time settings
 * - mct_sessions: MCT therapy sessions (worry/DM/ATT)
 * - mcq30_results: MCQ-30 assessment results
 * - voice_baselines: Voice biomarker baselines
 * - voice_analysis_history: Voice analysis history
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration009: IMigration = {
  version: 9,
  name: 'service_persistence',

  up: `
    -- ===========================================================
    -- Migration 009: Service Persistence Tables
    -- ===========================================================
    -- FDA 21 CFR Part 11: ALCOA+ data integrity
    -- HIPAA: PHI encrypted at rest
    -- IEC 62304 Class C: Audit trail for safety-critical data
    -- ===========================================================

    -- ============================================================
    -- Sprint 1: CRITICAL — Safety + Clinical scheduling
    -- ============================================================

    CREATE TABLE IF NOT EXISTS safety_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      warning_signs_json TEXT NOT NULL DEFAULT '[]',
      coping_strategies_json TEXT NOT NULL DEFAULT '[]',
      reasons_to_live_json TEXT NOT NULL DEFAULT '[]',
      support_contacts_json TEXT NOT NULL DEFAULT '[]',
      safe_places_json TEXT NOT NULL DEFAULT '[]',
      professional_contacts_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_safety_plans_user ON safety_plans(user_id);

    CREATE TABLE IF NOT EXISTS isi_schedule_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      chat_id INTEGER NOT NULL,
      user_name TEXT,
      enrollment_date TEXT NOT NULL,
      last_assessment_date TEXT,
      last_assessment_week INTEGER,
      next_assessment_week INTEGER NOT NULL DEFAULT 0,
      reminder_sent INTEGER NOT NULL DEFAULT 0,
      isi_history_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_isi_schedule_user ON isi_schedule_users(user_id);

    -- ============================================================
    -- Sprint 2: HIGH — Clinical state
    -- ============================================================

    CREATE TABLE IF NOT EXISTS digital_twins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      observation_count INTEGER NOT NULL DEFAULT 0,
      state_quality REAL NOT NULL DEFAULT 0,
      is_ready INTEGER NOT NULL DEFAULT 0,
      current_metrics_json TEXT,
      trend TEXT NOT NULL DEFAULT 'stable',
      risk_level TEXT NOT NULL DEFAULT 'low',
      twin_created_at TEXT NOT NULL,
      last_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_digital_twins_user ON digital_twins(user_id);

    CREATE TABLE IF NOT EXISTS onboarding_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      current_step TEXT NOT NULL DEFAULT 'welcome_viewed',
      completed_steps_json TEXT NOT NULL DEFAULT '[]',
      is_completed INTEGER NOT NULL DEFAULT 0,
      completion_percentage REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

    CREATE TABLE IF NOT EXISTS service_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      state_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      UNIQUE(user_id, service_name)
    );
    CREATE INDEX IF NOT EXISTS idx_service_state_user ON service_state(user_id, service_name);

    -- ============================================================
    -- Sprint 3: MEDIUM/LOW — Engagement + MCT
    -- ============================================================

    CREATE TABLE IF NOT EXISTS notification_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      chat_id INTEGER NOT NULL,
      user_name TEXT,
      preferences_json TEXT NOT NULL DEFAULT '{}',
      context_json TEXT NOT NULL DEFAULT '{}',
      first_interaction_at TEXT,
      last_notification_at TEXT,
      last_response_at TEXT,
      reengagement_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_notification_users_user ON notification_users(user_id);

    CREATE TABLE IF NOT EXISTS proactive_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      insight_type TEXT NOT NULL,
      insight_data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_proactive_insights_user ON proactive_insights(user_id);

    CREATE TABLE IF NOT EXISTS engagement_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      state_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_engagement_user ON engagement_tracking(user_id);

    CREATE TABLE IF NOT EXISTS communication_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_comm_profiles_user ON communication_profiles(user_id);

    CREATE TABLE IF NOT EXISTS emotional_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      emotion_data_json TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_emotional_history_user ON emotional_history(user_id);

    CREATE TABLE IF NOT EXISTS mct_worry_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      entry_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_worry_entries_user ON mct_worry_entries(user_id);

    CREATE TABLE IF NOT EXISTS mct_worry_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_worry_settings_user ON mct_worry_settings(user_id);

    CREATE TABLE IF NOT EXISTS mct_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_type TEXT NOT NULL CHECK (session_type IN ('worry', 'dm', 'att')),
      session_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mct_sessions_user ON mct_sessions(user_id, session_type);

    CREATE TABLE IF NOT EXISTS mcq30_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result_json TEXT NOT NULL,
      assessed_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mcq30_user ON mcq30_results(user_id);

    CREATE TABLE IF NOT EXISTS voice_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      baseline_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_voice_baselines_user ON voice_baselines(user_id);

    CREATE TABLE IF NOT EXISTS voice_analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_voice_analysis_user ON voice_analysis_history(user_id);
  `,

  down: `
    -- ===========================================================
    -- Rollback Migration 009: Drop all service persistence tables
    -- ===========================================================

    DROP INDEX IF EXISTS idx_voice_analysis_user;
    DROP TABLE IF EXISTS voice_analysis_history;

    DROP INDEX IF EXISTS idx_voice_baselines_user;
    DROP TABLE IF EXISTS voice_baselines;

    DROP INDEX IF EXISTS idx_mcq30_user;
    DROP TABLE IF EXISTS mcq30_results;

    DROP INDEX IF EXISTS idx_mct_sessions_user;
    DROP TABLE IF EXISTS mct_sessions;

    DROP INDEX IF EXISTS idx_worry_settings_user;
    DROP TABLE IF EXISTS mct_worry_settings;

    DROP INDEX IF EXISTS idx_worry_entries_user;
    DROP TABLE IF EXISTS mct_worry_entries;

    DROP INDEX IF EXISTS idx_emotional_history_user;
    DROP TABLE IF EXISTS emotional_history;

    DROP INDEX IF EXISTS idx_comm_profiles_user;
    DROP TABLE IF EXISTS communication_profiles;

    DROP INDEX IF EXISTS idx_engagement_user;
    DROP TABLE IF EXISTS engagement_tracking;

    DROP INDEX IF EXISTS idx_proactive_insights_user;
    DROP TABLE IF EXISTS proactive_insights;

    DROP INDEX IF EXISTS idx_notification_users_user;
    DROP TABLE IF EXISTS notification_users;

    DROP INDEX IF EXISTS idx_service_state_user;
    DROP TABLE IF EXISTS service_state;

    DROP INDEX IF EXISTS idx_onboarding_user;
    DROP TABLE IF EXISTS onboarding_progress;

    DROP INDEX IF EXISTS idx_digital_twins_user;
    DROP TABLE IF EXISTS digital_twins;

    DROP INDEX IF EXISTS idx_isi_schedule_user;
    DROP TABLE IF EXISTS isi_schedule_users;

    DROP INDEX IF EXISTS idx_safety_plans_user;
    DROP TABLE IF EXISTS safety_plans;
  `,
};
