/**
 * Migration 006 - Voice Diary Entries
 * ====================================
 *
 * Creates voice_diary_entries table for storing voice diary transcriptions.
 *
 * Research basis (2025-2026):
 * - HIPAA: AES-256 encryption at rest, audit trails required
 * - ePRO: Item-level timestamps for compliance
 * - Voice data: Store transcripts, delete audio after processing (privacy-first)
 *
 * Features:
 * - Transcription storage with confidence scores
 * - Emotion analysis results
 * - Audit timestamps (HIPAA/ePRO compliant)
 * - Soft delete support
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';

export const migration006: IMigration = {
  version: 6,
  name: 'voice_diary',

  up: `
    -- Voice diary entries table
    -- Stores transcribed voice messages with emotion analysis
    CREATE TABLE IF NOT EXISTS voice_diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,

      -- Transcription data
      transcription_text TEXT NOT NULL,
      transcription_confidence REAL NOT NULL DEFAULT 0.0,
      transcription_language TEXT DEFAULT 'ru',
      voice_duration INTEGER NOT NULL,

      -- Emotion analysis (optional, from EmotionalRecognitionService)
      emotion TEXT,
      emotion_intensity REAL,

      -- Metadata (HIPAA audit trail)
      telegram_file_id TEXT,
      file_size INTEGER,

      -- Timestamps (ePRO compliant)
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      transcribed_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Standard audit fields
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_voice_diary_user ON voice_diary_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_voice_diary_date ON voice_diary_entries(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_voice_diary_emotion ON voice_diary_entries(emotion);
    CREATE INDEX IF NOT EXISTS idx_voice_diary_deleted ON voice_diary_entries(deleted_at);
  `,

  down: `
    DROP INDEX IF EXISTS idx_voice_diary_deleted;
    DROP INDEX IF EXISTS idx_voice_diary_emotion;
    DROP INDEX IF EXISTS idx_voice_diary_date;
    DROP INDEX IF EXISTS idx_voice_diary_user;
    DROP TABLE IF EXISTS voice_diary_entries;
  `,
};
