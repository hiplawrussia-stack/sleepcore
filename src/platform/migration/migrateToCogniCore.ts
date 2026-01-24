/**
 * CogniCore Migration Utility
 * ===========================
 * Migrate data from legacy SleepCorePOMDP to SleepCoreAdapter + CogniCore
 *
 * Phase 7 of CogniCore Integration Plan
 *
 * @module @sleepcore/platform/migration
 */

import { SleepCorePOMDP, type IActionStats, type SleepAction } from '../SleepCorePOMDP';
import { SleepCoreAdapter } from '../SleepCoreAdapter';

// ============================================================================
// MIGRATION TYPES
// ============================================================================

/**
 * Migration result for a single user
 */
export interface IUserMigrationResult {
  userId: string;
  actionsImported: number;
  totalObservations: number;
  errors: string[];
  success: boolean;
}

/**
 * Full migration result
 */
export interface IMigrationResult {
  startTime: Date;
  endTime: Date;
  totalUsers: number;
  successfulUsers: number;
  failedUsers: number;
  totalActionsImported: number;
  totalObservationsImported: number;
  userResults: IUserMigrationResult[];
  errors: string[];
}

/**
 * Migration options
 */
export interface IMigrationOptions {
  /** Skip validation before migration */
  skipValidation?: boolean;

  /** Continue on errors */
  continueOnError?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** Dry run (don't actually migrate) */
  dryRun?: boolean;
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migrate a single user from SleepCorePOMDP to SleepCoreAdapter
 */
export async function migrateUser(
  pomdp: SleepCorePOMDP,
  adapter: SleepCoreAdapter,
  userId: string,
  options: IMigrationOptions = {}
): Promise<IUserMigrationResult> {
  const result: IUserMigrationResult = {
    userId,
    actionsImported: 0,
    totalObservations: 0,
    errors: [],
    success: false,
  };

  try {
    // Get action stats from legacy POMDP
    const actionStats = pomdp.getActionStats();

    if (!actionStats || actionStats.size === 0) {
      result.errors.push('No action stats found in legacy POMDP');
      return result;
    }

    // Calculate total observations
    for (const [_action, stats] of actionStats) {
      const observations = Math.max(0, (stats.alpha - 1) + (stats.beta - 1));
      result.totalObservations += observations;
    }

    result.actionsImported = actionStats.size;

    if (options.verbose) {
      console.log(`[Migration] User ${userId}: ${result.actionsImported} actions, ${result.totalObservations} observations`);
    }

    // Skip actual migration if dry run
    if (options.dryRun) {
      result.success = true;
      return result;
    }

    // Import into adapter
    await adapter.importLegacyStats(actionStats, userId);

    result.success = true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);

    if (options.verbose) {
      console.error(`[Migration] Error migrating user ${userId}:`, errorMessage);
    }
  }

  return result;
}

/**
 * Migrate all users from a map of POMDPs to a single SleepCoreAdapter
 *
 * @param userPomdps - Map of userId to their SleepCorePOMDP instance
 * @param adapter - Target SleepCoreAdapter
 * @param options - Migration options
 */
export async function migrateAllUsers(
  userPomdps: Map<string, SleepCorePOMDP>,
  adapter: SleepCoreAdapter,
  options: IMigrationOptions = {}
): Promise<IMigrationResult> {
  const result: IMigrationResult = {
    startTime: new Date(),
    endTime: new Date(),
    totalUsers: userPomdps.size,
    successfulUsers: 0,
    failedUsers: 0,
    totalActionsImported: 0,
    totalObservationsImported: 0,
    userResults: [],
    errors: [],
  };

  if (options.verbose) {
    console.log(`[Migration] Starting migration for ${userPomdps.size} users`);
  }

  for (const [userId, pomdp] of userPomdps) {
    const userResult = await migrateUser(pomdp, adapter, userId, options);
    result.userResults.push(userResult);

    if (userResult.success) {
      result.successfulUsers++;
      result.totalActionsImported += userResult.actionsImported;
      result.totalObservationsImported += userResult.totalObservations;
    } else {
      result.failedUsers++;
      result.errors.push(...userResult.errors.map(e => `User ${userId}: ${e}`));

      if (!options.continueOnError) {
        break;
      }
    }
  }

  result.endTime = new Date();

  if (options.verbose) {
    console.log(`[Migration] Completed in ${result.endTime.getTime() - result.startTime.getTime()}ms`);
    console.log(`[Migration] Success: ${result.successfulUsers}/${result.totalUsers}`);
    console.log(`[Migration] Actions imported: ${result.totalActionsImported}`);
    console.log(`[Migration] Observations imported: ${result.totalObservationsImported}`);
  }

  return result;
}

/**
 * Validate migration data before importing
 */
export function validateMigrationData(
  actionStats: Map<SleepAction, IActionStats>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!actionStats || actionStats.size === 0) {
    errors.push('No action stats provided');
    return { valid: false, errors };
  }

  for (const [action, stats] of actionStats) {
    // Validate alpha/beta are positive
    if (stats.alpha <= 0) {
      errors.push(`Action ${action}: alpha must be positive (got ${stats.alpha})`);
    }
    if (stats.beta <= 0) {
      errors.push(`Action ${action}: beta must be positive (got ${stats.beta})`);
    }

    // Validate lastUpdate is a valid date
    if (!(stats.lastUpdate instanceof Date) || isNaN(stats.lastUpdate.getTime())) {
      errors.push(`Action ${action}: invalid lastUpdate date`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a migration report
 */
export function generateMigrationReport(result: IMigrationResult): string {
  const lines: string[] = [
    '='.repeat(60),
    'COGNICORE MIGRATION REPORT',
    '='.repeat(60),
    '',
    `Start Time: ${result.startTime.toISOString()}`,
    `End Time: ${result.endTime.toISOString()}`,
    `Duration: ${result.endTime.getTime() - result.startTime.getTime()}ms`,
    '',
    '--- Summary ---',
    `Total Users: ${result.totalUsers}`,
    `Successful: ${result.successfulUsers}`,
    `Failed: ${result.failedUsers}`,
    `Success Rate: ${result.totalUsers > 0 ? ((result.successfulUsers / result.totalUsers) * 100).toFixed(1) : 0}%`,
    '',
    `Actions Imported: ${result.totalActionsImported}`,
    `Observations Imported: ${result.totalObservationsImported}`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('--- Errors ---');
    result.errors.forEach((error, i) => {
      lines.push(`${i + 1}. ${error}`);
    });
    lines.push('');
  }

  if (result.userResults.length > 0) {
    lines.push('--- User Details ---');
    result.userResults.forEach(user => {
      const status = user.success ? '✓' : '✗';
      lines.push(`${status} ${user.userId}: ${user.actionsImported} actions, ${user.totalObservations} observations`);
    });
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Estimate migration size before running
 */
export function estimateMigrationSize(
  userPomdps: Map<string, SleepCorePOMDP>
): { users: number; actions: number; observations: number } {
  let totalActions = 0;
  let totalObservations = 0;

  for (const [, pomdp] of userPomdps) {
    const actionStats = pomdp.getActionStats();
    totalActions += actionStats.size;

    for (const [, stats] of actionStats) {
      totalObservations += Math.max(0, (stats.alpha - 1) + (stats.beta - 1));
    }
  }

  return {
    users: userPomdps.size,
    actions: totalActions,
    observations: totalObservations,
  };
}

