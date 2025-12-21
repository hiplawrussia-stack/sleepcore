/**
 * Migration 001 - Initial Schema
 * ===============================
 *
 * Creates core tables for SleepCore:
 * - users: User profiles with consent tracking
 * - sleep_diary_entries: Daily sleep diary data
 * - assessments: ISI, MEQ, MCTQ, DBAS results
 *
 * Follows GDPR/HIPAA compliance patterns:
 * - Soft delete (deleted_at)
 * - Consent tracking
 * - Audit timestamps
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration001: IMigration = {
  version: 1,
  name: 'initial_schema',

  up: `
    -- Users table with consent tracking
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      chronotype TEXT,
      prakriti TEXT,
      tcm_constitution TEXT,
      timezone TEXT DEFAULT 'UTC',
      locale TEXT DEFAULT 'ru',
      settings_json TEXT,
      consent_given INTEGER NOT NULL DEFAULT 0,
      consent_date TEXT,
      last_activity_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    -- Sleep diary entries
    CREATE TABLE IF NOT EXISTS sleep_diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      bedtime TEXT NOT NULL,
      lights_off_time TEXT NOT NULL,
      sleep_onset_latency INTEGER NOT NULL,
      wake_time TEXT NOT NULL,
      out_of_bed_time TEXT NOT NULL,
      night_awakenings INTEGER NOT NULL DEFAULT 0,
      wake_after_sleep_onset INTEGER NOT NULL DEFAULT 0,
      total_sleep_time INTEGER NOT NULL,
      time_in_bed INTEGER NOT NULL,
      sleep_efficiency REAL NOT NULL,
      sleep_quality INTEGER NOT NULL,
      morning_mood INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    );

    -- Assessments (ISI, MEQ, MCTQ, DBAS, TCM, Ayurveda)
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('isi', 'meq', 'mctq', 'dbas', 'tcm', 'ayurveda')),
      score REAL NOT NULL,
      severity TEXT,
      category TEXT,
      responses_json TEXT NOT NULL,
      interpretation TEXT,
      assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);
    CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_diary_user_date ON sleep_diary_entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_diary_date ON sleep_diary_entries(date);
    CREATE INDEX IF NOT EXISTS idx_diary_deleted ON sleep_diary_entries(deleted_at);

    CREATE INDEX IF NOT EXISTS idx_assessments_user_type ON assessments(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
    CREATE INDEX IF NOT EXISTS idx_assessments_assessed ON assessments(assessed_at);
    CREATE INDEX IF NOT EXISTS idx_assessments_deleted ON assessments(deleted_at);
  `,

  down: `
    DROP INDEX IF EXISTS idx_assessments_deleted;
    DROP INDEX IF EXISTS idx_assessments_assessed;
    DROP INDEX IF EXISTS idx_assessments_type;
    DROP INDEX IF EXISTS idx_assessments_user_type;

    DROP INDEX IF EXISTS idx_diary_deleted;
    DROP INDEX IF EXISTS idx_diary_date;
    DROP INDEX IF EXISTS idx_diary_user_date;

    DROP INDEX IF EXISTS idx_users_deleted;
    DROP INDEX IF EXISTS idx_users_last_activity;
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_users_external_id;

    DROP TABLE IF EXISTS assessments;
    DROP TABLE IF EXISTS sleep_diary_entries;
    DROP TABLE IF EXISTS users;
  `,
};
