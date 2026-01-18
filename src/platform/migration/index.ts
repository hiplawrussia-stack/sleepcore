/**
 * CogniCore Migration Module
 * ==========================
 * Export migration utilities for SleepCorePOMDP → SleepCoreAdapter
 *
 * @module @sleepcore/platform/migration
 */

export {
  migrateUser,
  migrateAllUsers,
  validateMigrationData,
  generateMigrationReport,
  estimateMigrationSize,
  type IUserMigrationResult,
  type IMigrationResult,
  type IMigrationOptions,
} from './migrateToCogniCore';
