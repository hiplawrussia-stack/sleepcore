/**
 * Database Migrations Registry
 * =============================
 *
 * Central registry for all database migrations.
 * Migrations are applied in version order.
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IMigration } from '../interfaces/IDatabaseConnection';
import { migration001 } from './001_initial_schema';
import { migration002 } from './002_therapy_sessions';
import { migration003 } from './003_cultural_adaptations';
import { migration004 } from './004_bot_sessions';

/**
 * All registered migrations in version order
 */
export const MIGRATIONS: readonly IMigration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
] as const;

/**
 * Get migration by version
 */
export function getMigration(version: number): IMigration | undefined {
  return MIGRATIONS.find((m) => m.version === version);
}

/**
 * Get latest migration version
 */
export function getLatestVersion(): number {
  return Math.max(...MIGRATIONS.map((m) => m.version), 0);
}

// Re-export individual migrations
export { migration001 } from './001_initial_schema';
export { migration002 } from './002_therapy_sessions';
export { migration003 } from './003_cultural_adaptations';
export { migration004 } from './004_bot_sessions';
