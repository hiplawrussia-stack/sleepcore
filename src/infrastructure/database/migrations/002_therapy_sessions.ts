/**
 * Migration 002 - Therapy Sessions
 * =================================
 *
 * Creates tables for therapy tracking:
 * - therapy_sessions: CBT-I, MBT-I, ACT-I sessions
 * - treatment_plans: Active treatment plans
 * - circadian_plans: Chronotherapy plans
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration002: IMigration = {
  version: 2,
  name: 'therapy_sessions',

  up: `
    -- Treatment plans
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL CHECK(plan_type IN ('cbti', 'mbti', 'acti', 'integrated')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'abandoned')),
      current_week INTEGER NOT NULL DEFAULT 1,
      total_weeks INTEGER NOT NULL DEFAULT 8,
      isi_baseline REAL,
      sleep_efficiency_baseline REAL,
      sleep_window_json TEXT,
      components_json TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Therapy sessions
    CREATE TABLE IF NOT EXISTS therapy_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER,
      session_type TEXT NOT NULL CHECK(session_type IN ('cbti', 'mbti', 'acti', 'tcm', 'ayurveda')),
      week INTEGER NOT NULL,
      component TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'skipped')),
      adherence REAL NOT NULL DEFAULT 0,
      homework_completed INTEGER NOT NULL DEFAULT 0,
      notes_json TEXT,
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE SET NULL
    );

    -- Circadian plans (chronotherapy)
    CREATE TABLE IF NOT EXISTS circadian_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chronotype TEXT NOT NULL,
      chronotype_category TEXT,
      social_jetlag REAL,
      meq_score INTEGER,
      msfsc TEXT,
      estimated_dlmo TEXT,
      optimal_bedtime TEXT,
      optimal_wake_time TEXT,
      light_therapy_json TEXT,
      melatonin_timing_json TEXT,
      session_times_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Sleep window adjustments
    CREATE TABLE IF NOT EXISTS sleep_window_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER,
      week INTEGER NOT NULL,
      bedtime TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      time_in_bed INTEGER NOT NULL,
      sleep_efficiency_target REAL,
      adjustment_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE SET NULL
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_plans_user ON treatment_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_plans_status ON treatment_plans(status);
    CREATE INDEX IF NOT EXISTS idx_plans_deleted ON treatment_plans(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON therapy_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_plan ON therapy_sessions(plan_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_type ON therapy_sessions(session_type);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON therapy_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON therapy_sessions(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_deleted ON therapy_sessions(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_circadian_user ON circadian_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_circadian_deleted ON circadian_plans(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_window_user ON sleep_window_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_window_plan ON sleep_window_history(plan_id);
  `,

  down: `
    DROP INDEX IF EXISTS idx_window_plan;
    DROP INDEX IF EXISTS idx_window_user;

    DROP INDEX IF EXISTS idx_circadian_deleted;
    DROP INDEX IF EXISTS idx_circadian_user;

    DROP INDEX IF EXISTS idx_sessions_deleted;
    DROP INDEX IF EXISTS idx_sessions_scheduled;
    DROP INDEX IF EXISTS idx_sessions_status;
    DROP INDEX IF EXISTS idx_sessions_type;
    DROP INDEX IF EXISTS idx_sessions_plan;
    DROP INDEX IF EXISTS idx_sessions_user;

    DROP INDEX IF EXISTS idx_plans_deleted;
    DROP INDEX IF EXISTS idx_plans_status;
    DROP INDEX IF EXISTS idx_plans_user;

    DROP TABLE IF EXISTS sleep_window_history;
    DROP TABLE IF EXISTS circadian_plans;
    DROP TABLE IF EXISTS therapy_sessions;
    DROP TABLE IF EXISTS treatment_plans;
  `,
};
