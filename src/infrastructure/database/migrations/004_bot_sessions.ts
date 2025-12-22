/**
 * Migration 004 - Bot Sessions
 * ============================
 *
 * Creates table for Grammy Telegram bot session persistence.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration004: IMigration = {
  version: 4,
  name: 'bot_sessions',

  up: `
    CREATE TABLE IF NOT EXISTS bot_sessions (
      session_key TEXT PRIMARY KEY NOT NULL,
      session_data TEXT NOT NULL,
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bot_sessions_user_id ON bot_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_bot_sessions_updated ON bot_sessions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON bot_sessions(expires_at)
  `,

  down: `
    DROP INDEX IF EXISTS idx_bot_sessions_expires;
    DROP INDEX IF EXISTS idx_bot_sessions_updated;
    DROP INDEX IF EXISTS idx_bot_sessions_user_id;
    DROP TABLE IF EXISTS bot_sessions
  `,
};
