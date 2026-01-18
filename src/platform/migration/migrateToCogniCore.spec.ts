/**
 * Migration Utility Tests
 * =======================
 * Tests for CogniCore migration from SleepCorePOMDP
 *
 * @module @sleepcore/platform/migration/__tests__
 */

import {
  migrateUser,
  migrateAllUsers,
  validateMigrationData,
  generateMigrationReport,
  estimateMigrationSize,
  type IMigrationResult,
} from './migrateToCogniCore';

import { SleepCorePOMDP, type IActionStats, type SleepAction } from '../SleepCorePOMDP';
import { SleepCoreAdapter, createSleepCoreAdapter } from '../SleepCoreAdapter';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockActionStats(): Map<SleepAction, IActionStats> {
  const stats = new Map<SleepAction, IActionStats>();

  stats.set('adjust_sleep_window', {
    action: 'adjust_sleep_window',
    alpha: 5, // 4 successes
    beta: 2,  // 1 failure
    lastUpdate: new Date(),
  });

  stats.set('relaxation_pmr', {
    action: 'relaxation_pmr',
    alpha: 3,  // 2 successes
    beta: 4,   // 3 failures
    lastUpdate: new Date(),
  });

  stats.set('challenge_belief', {
    action: 'challenge_belief',
    alpha: 2,  // 1 success
    beta: 2,   // 1 failure
    lastUpdate: new Date(),
  });

  return stats;
}

function createMockPomdp(): SleepCorePOMDP {
  const pomdp = new SleepCorePOMDP();

  // Simulate some learning by recording action outcomes
  // This updates the internal action stats via Thompson Sampling
  pomdp.updateActionOutcome('adjust_sleep_window', 0.8);
  pomdp.updateActionOutcome('adjust_sleep_window', 0.7);
  pomdp.updateActionOutcome('relaxation_pmr', 0.6);
  pomdp.updateActionOutcome('challenge_belief', 0.3);

  return pomdp;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Migration Utility', () => {
  describe('validateMigrationData', () => {
    it('should validate correct action stats', () => {
      const stats = createMockActionStats();
      const result = validateMigrationData(stats);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty stats', () => {
      const stats = new Map<SleepAction, IActionStats>();
      const result = validateMigrationData(stats);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No action stats provided');
    });

    it('should reject negative alpha', () => {
      const stats = new Map<SleepAction, IActionStats>();
      stats.set('adjust_sleep_window', {
        action: 'adjust_sleep_window',
        alpha: -1,
        beta: 2,
        lastUpdate: new Date(),
      });

      const result = validateMigrationData(stats);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('alpha must be positive'))).toBe(true);
    });

    it('should reject negative beta', () => {
      const stats = new Map<SleepAction, IActionStats>();
      stats.set('relaxation_pmr', {
        action: 'relaxation_pmr',
        alpha: 2,
        beta: 0,
        lastUpdate: new Date(),
      });

      const result = validateMigrationData(stats);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('beta must be positive'))).toBe(true);
    });

    it('should reject invalid date', () => {
      const stats = new Map<SleepAction, IActionStats>();
      stats.set('challenge_belief', {
        action: 'challenge_belief',
        alpha: 2,
        beta: 2,
        lastUpdate: new Date('invalid'),
      });

      const result = validateMigrationData(stats);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid lastUpdate'))).toBe(true);
    });
  });

  describe('migrateUser', () => {
    let adapter: SleepCoreAdapter;

    beforeEach(() => {
      adapter = createSleepCoreAdapter({ debug: false, language: 'en' });
    });

    it('should migrate user stats successfully', async () => {
      const pomdp = createMockPomdp();
      const userId = 'migrate-test-user';

      const result = await migrateUser(pomdp, adapter, userId, { verbose: false });

      expect(result.success).toBe(true);
      expect(result.actionsImported).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should perform dry run without actual migration', async () => {
      const pomdp = createMockPomdp();
      const userId = 'dry-run-user';

      const result = await migrateUser(pomdp, adapter, userId, {
        dryRun: true,
        verbose: false,
      });

      expect(result.success).toBe(true);
      expect(result.actionsImported).toBeGreaterThan(0);

      // Verify no actual stats were imported
      const stats = await adapter.getInterventionStats(userId);
      expect(stats.size).toBe(0);
    });

    it('should count observations correctly', async () => {
      const pomdp = new SleepCorePOMDP();

      // Record exactly 5 outcomes
      for (let i = 0; i < 5; i++) {
        pomdp.updateActionOutcome('adjust_sleep_window', i % 2 === 0 ? 0.8 : 0.2);
      }

      const result = await migrateUser(pomdp, adapter, 'count-test-user', {
        dryRun: true,
        verbose: false,
      });

      expect(result.totalObservations).toBe(5);
    });
  });

  describe('migrateAllUsers', () => {
    let adapter: SleepCoreAdapter;

    beforeEach(() => {
      adapter = createSleepCoreAdapter({ debug: false, language: 'en' });
    });

    it('should migrate multiple users', async () => {
      const userPomdps = new Map<string, SleepCorePOMDP>();
      userPomdps.set('user-1', createMockPomdp());
      userPomdps.set('user-2', createMockPomdp());
      userPomdps.set('user-3', createMockPomdp());

      const result = await migrateAllUsers(userPomdps, adapter, { verbose: false });

      expect(result.totalUsers).toBe(3);
      expect(result.successfulUsers).toBe(3);
      expect(result.failedUsers).toBe(0);
      expect(result.userResults).toHaveLength(3);
    });

    it('should continue on error when option is set', async () => {
      const userPomdps = new Map<string, SleepCorePOMDP>();
      userPomdps.set('user-1', createMockPomdp());

      // Create a mock POMDP that throws an error
      const brokenPomdp = new SleepCorePOMDP();
      jest.spyOn(brokenPomdp, 'getActionStats').mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      userPomdps.set('user-2', brokenPomdp);

      userPomdps.set('user-3', createMockPomdp());

      const result = await migrateAllUsers(userPomdps, adapter, {
        continueOnError: true,
        verbose: false,
      });

      expect(result.totalUsers).toBe(3);
      expect(result.successfulUsers).toBe(2); // user-1 and user-3
      expect(result.failedUsers).toBe(1); // user-2
    });

    it('should stop on error when option is not set', async () => {
      const userPomdps = new Map<string, SleepCorePOMDP>();

      // Create a mock POMDP that throws an error
      const brokenPomdp = new SleepCorePOMDP();
      jest.spyOn(brokenPomdp, 'getActionStats').mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      userPomdps.set('user-1', brokenPomdp);

      userPomdps.set('user-2', createMockPomdp());

      const result = await migrateAllUsers(userPomdps, adapter, {
        continueOnError: false,
        verbose: false,
      });

      expect(result.failedUsers).toBe(1);
      expect(result.userResults).toHaveLength(1); // Stopped after first failure
    });
  });

  describe('estimateMigrationSize', () => {
    it('should estimate migration size correctly', () => {
      const userPomdps = new Map<string, SleepCorePOMDP>();
      userPomdps.set('user-1', createMockPomdp());
      userPomdps.set('user-2', createMockPomdp());

      const estimate = estimateMigrationSize(userPomdps);

      expect(estimate.users).toBe(2);
      expect(estimate.actions).toBeGreaterThan(0);
      expect(estimate.observations).toBeGreaterThan(0);
    });

    it('should handle empty map', () => {
      const userPomdps = new Map<string, SleepCorePOMDP>();

      const estimate = estimateMigrationSize(userPomdps);

      expect(estimate.users).toBe(0);
      expect(estimate.actions).toBe(0);
      expect(estimate.observations).toBe(0);
    });
  });

  describe('generateMigrationReport', () => {
    it('should generate report for successful migration', () => {
      const result: IMigrationResult = {
        startTime: new Date('2026-01-18T10:00:00Z'),
        endTime: new Date('2026-01-18T10:00:05Z'),
        totalUsers: 3,
        successfulUsers: 3,
        failedUsers: 0,
        totalActionsImported: 36, // 12 actions × 3 users
        totalObservationsImported: 150,
        userResults: [
          { userId: 'user-1', actionsImported: 12, totalObservations: 50, errors: [], success: true },
          { userId: 'user-2', actionsImported: 12, totalObservations: 50, errors: [], success: true },
          { userId: 'user-3', actionsImported: 12, totalObservations: 50, errors: [], success: true },
        ],
        errors: [],
      };

      const report = generateMigrationReport(result);

      expect(report).toContain('COGNICORE MIGRATION REPORT');
      expect(report).toContain('Total Users: 3');
      expect(report).toContain('Successful: 3');
      expect(report).toContain('Success Rate: 100.0%');
      expect(report).toContain('Actions Imported: 36');
      expect(report).toContain('Observations Imported: 150');
    });

    it('should include errors in report', () => {
      const result: IMigrationResult = {
        startTime: new Date('2026-01-18T10:00:00Z'),
        endTime: new Date('2026-01-18T10:00:05Z'),
        totalUsers: 2,
        successfulUsers: 1,
        failedUsers: 1,
        totalActionsImported: 12,
        totalObservationsImported: 50,
        userResults: [
          { userId: 'user-1', actionsImported: 12, totalObservations: 50, errors: [], success: true },
          { userId: 'user-2', actionsImported: 0, totalObservations: 0, errors: ['Database error'], success: false },
        ],
        errors: ['User user-2: Database error'],
      };

      const report = generateMigrationReport(result);

      expect(report).toContain('--- Errors ---');
      expect(report).toContain('Database error');
      expect(report).toContain('✗ user-2');
      expect(report).toContain('✓ user-1');
    });
  });
});

describe('Migration Integration', () => {
  it('should preserve learning history after migration', async () => {
    const adapter = createSleepCoreAdapter({ debug: false, language: 'en' });
    const pomdp = new SleepCorePOMDP();
    const userId = 'learning-history-user';

    // Train POMDP with positive outcomes for adjust_sleep_window
    for (let i = 0; i < 10; i++) {
      pomdp.updateActionOutcome('adjust_sleep_window', 0.85); // High reward
    }

    // Train with lower outcomes for relaxation
    for (let i = 0; i < 5; i++) {
      pomdp.updateActionOutcome('relaxation_pmr', 0.4); // Low reward
    }

    // Migrate
    const migrationResult = await migrateUser(pomdp, adapter, userId, { verbose: false });
    expect(migrationResult.success).toBe(true);

    // Verify stats were imported
    const stats = await adapter.getInterventionStats(userId);
    expect(stats.size).toBeGreaterThan(0);

    // The adapter should now have the learning history
    // adjust_sleep_window should have better stats than relaxation_pmr
    const adjustStats = stats.get('adjust_sleep_window');
    const relaxStats = stats.get('relaxation_pmr');

    if (adjustStats && relaxStats) {
      expect(adjustStats.avgReward).toBeGreaterThan(relaxStats.avgReward);
    }
  });
});
