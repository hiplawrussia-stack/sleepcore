/**
 * Migration 005 - Gamification Persistence Layer
 * ===============================================
 *
 * Creates tables for XP, achievements, streaks, quests, inventory,
 * and ethical gamification settings.
 *
 * Based on:
 * - Octalysis Framework (Yu-kai Chou)
 * - UCL Habit Formation Study (66-day threshold)
 * - GDPR Article 5 (data minimization)
 * - Duolingo Streak Psychology Research
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration005: IMigration = {
  version: 5,
  name: 'gamification_persistence',

  up: `
    -- ==================== CORE GAMIFICATION STATE ====================
    CREATE TABLE IF NOT EXISTS gamification_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      total_xp INTEGER NOT NULL DEFAULT 0,
      current_level INTEGER NOT NULL DEFAULT 1,
      engagement_level TEXT NOT NULL DEFAULT 'new_user'
        CHECK(engagement_level IN ('new_user', 'exploring', 'committed', 'habituated', 'veteran')),
      total_days_active INTEGER NOT NULL DEFAULT 0,
      adaptive_difficulty INTEGER NOT NULL DEFAULT 50,
      preferred_challenge_types_json TEXT DEFAULT '[]',
      emotional_patterns_json TEXT DEFAULT '[]',
      last_active_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== XP TRANSACTION LOG (Event Sourcing) ====================
    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      source TEXT NOT NULL CHECK(source IN (
        'daily_check_in', 'emotion_log', 'challenge_complete', 'quest_complete',
        'streak_bonus', 'first_action', 'helping_others', 'crisis_overcome',
        'milestone_reached', 'ai_interaction', 'sleep_diary', 'assessment_complete'
      )),
      multiplier REAL NOT NULL DEFAULT 1.0,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== ACHIEVEMENTS ====================
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT,
      notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== STREAKS ====================
    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN (
        'daily_login', 'sleep_diary', 'emotion_log', 'challenge_complete', 'therapy_session'
      )),
      current_count INTEGER NOT NULL DEFAULT 0,
      longest_count INTEGER NOT NULL DEFAULT 0,
      last_activity_at TEXT,
      multiplier REAL NOT NULL DEFAULT 1.0,
      frozen INTEGER NOT NULL DEFAULT 0,
      frozen_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== QUESTS ====================
    CREATE TABLE IF NOT EXISTS user_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quest_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available'
        CHECK(status IN ('locked', 'available', 'active', 'completed', 'expired')),
      started_at TEXT,
      completed_at TEXT,
      objectives_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, quest_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== INVENTORY ====================
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reward_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      UNIQUE(user_id, reward_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== EQUIPPED ITEMS ====================
    CREATE TABLE IF NOT EXISTS equipped_items (
      user_id INTEGER PRIMARY KEY,
      equipped_badge TEXT,
      equipped_title TEXT,
      equipped_theme TEXT,
      equipped_frame TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== ETHICAL GAMIFICATION SETTINGS ====================
    CREATE TABLE IF NOT EXISTS gamification_settings (
      user_id INTEGER PRIMARY KEY,
      -- Compassion Mode (auto-freeze on stress)
      compassion_enabled INTEGER NOT NULL DEFAULT 1,
      auto_freeze_on_stress INTEGER NOT NULL DEFAULT 1,
      auto_freeze_threshold INTEGER NOT NULL DEFAULT 7,
      max_auto_freezes_per_week INTEGER NOT NULL DEFAULT 2,
      current_auto_freezes_used INTEGER NOT NULL DEFAULT 0,
      last_auto_freeze_at TEXT,
      stress_detection_enabled INTEGER NOT NULL DEFAULT 1,
      -- Soft Reset (preserve % of streak instead of reset to 0)
      soft_reset_enabled INTEGER NOT NULL DEFAULT 1,
      preserve_percentage REAL NOT NULL DEFAULT 0.5,
      minimum_preserved INTEGER NOT NULL DEFAULT 3,
      grace_period_days INTEGER NOT NULL DEFAULT 2,
      notify_before_reset INTEGER NOT NULL DEFAULT 1,
      -- Wellbeing Limits (anti-addiction)
      soft_limit_minutes INTEGER NOT NULL DEFAULT 30,
      hard_limit_minutes INTEGER NOT NULL DEFAULT 60,
      daily_limit_minutes INTEGER NOT NULL DEFAULT 120,
      break_duration_minutes INTEGER NOT NULL DEFAULT 15,
      cooldown_between_sessions_minutes INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== SESSION TRACKING ====================
    CREATE TABLE IF NOT EXISTS session_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_start TEXT NOT NULL,
      session_end TEXT,
      duration_minutes INTEGER,
      breaks_taken INTEGER NOT NULL DEFAULT 0,
      wellbeing_alerts_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== DAILY SESSION SUMMARY ====================
    CREATE TABLE IF NOT EXISTS daily_session_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      breaks_taken INTEGER NOT NULL DEFAULT 0,
      wellbeing_alerts_triggered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== INDEXES ====================
    -- Gamification state
    CREATE INDEX IF NOT EXISTS idx_gamification_state_user ON gamification_state(user_id);
    CREATE INDEX IF NOT EXISTS idx_gamification_state_level ON gamification_state(current_level);
    CREATE INDEX IF NOT EXISTS idx_gamification_state_deleted ON gamification_state(deleted_at);

    -- XP transactions (event log - frequently queried)
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions(source);

    -- Achievements
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked_at);

    -- Streaks
    CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
    CREATE INDEX IF NOT EXISTS idx_streaks_type ON streaks(type);
    CREATE INDEX IF NOT EXISTS idx_streaks_last_activity ON streaks(last_activity_at);

    -- Quests
    CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);

    -- Inventory
    CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_expires ON inventory(expires_at);

    -- Session tracking
    CREATE INDEX IF NOT EXISTS idx_session_tracking_user ON session_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_tracking_start ON session_tracking(session_start);

    -- Daily summary
    CREATE INDEX IF NOT EXISTS idx_daily_summary_user ON daily_session_summary(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_session_summary(date)
  `,

  down: `
    -- Drop indexes
    DROP INDEX IF EXISTS idx_daily_summary_date;
    DROP INDEX IF EXISTS idx_daily_summary_user;
    DROP INDEX IF EXISTS idx_session_tracking_start;
    DROP INDEX IF EXISTS idx_session_tracking_user;
    DROP INDEX IF EXISTS idx_inventory_expires;
    DROP INDEX IF EXISTS idx_inventory_user;
    DROP INDEX IF EXISTS idx_user_quests_status;
    DROP INDEX IF EXISTS idx_user_quests_user;
    DROP INDEX IF EXISTS idx_streaks_last_activity;
    DROP INDEX IF EXISTS idx_streaks_type;
    DROP INDEX IF EXISTS idx_streaks_user;
    DROP INDEX IF EXISTS idx_achievements_unlocked;
    DROP INDEX IF EXISTS idx_achievements_user;
    DROP INDEX IF EXISTS idx_xp_transactions_source;
    DROP INDEX IF EXISTS idx_xp_transactions_created;
    DROP INDEX IF EXISTS idx_xp_transactions_user;
    DROP INDEX IF EXISTS idx_gamification_state_deleted;
    DROP INDEX IF EXISTS idx_gamification_state_level;
    DROP INDEX IF EXISTS idx_gamification_state_user;

    -- Drop tables
    DROP TABLE IF EXISTS daily_session_summary;
    DROP TABLE IF EXISTS session_tracking;
    DROP TABLE IF EXISTS gamification_settings;
    DROP TABLE IF EXISTS equipped_items;
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS user_quests;
    DROP TABLE IF EXISTS streaks;
    DROP TABLE IF EXISTS achievements;
    DROP TABLE IF EXISTS xp_transactions;
    DROP TABLE IF EXISTS gamification_state
  `,
};
