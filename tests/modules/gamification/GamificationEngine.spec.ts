/**
 * GamificationEngine Integration Tests
 * =====================================
 *
 * Tests the unified gamification system with SQLite persistence.
 */

import { GamificationEngine } from '../../../src/modules/gamification/GamificationEngine';
import { GamificationRepository } from '../../../src/infrastructure/database/repositories/GamificationRepository';
import { SQLiteConnection } from '../../../src/infrastructure/database/sqlite/SQLiteConnection';
import { SQLiteMigration } from '../../../src/infrastructure/database/sqlite/SQLiteMigration';
import { MIGRATIONS } from '../../../src/infrastructure/database/migrations';
import { EventEmitter } from 'events';

describe('GamificationEngine', () => {
  let db: SQLiteConnection;
  let repository: GamificationRepository;
  let engine: GamificationEngine;
  let eventEmitter: EventEmitter;
  const testUserId = 12345;

  beforeAll(async () => {
    // Create in-memory SQLite database
    db = new SQLiteConnection({
      type: 'sqlite',
      connectionString: ':memory:',
      verbose: false,
    });
    await db.connect();

    // Run migrations
    const migration = new SQLiteMigration(db);
    await migration.initialize();
    await migration.migrate([...MIGRATIONS]);

    // Create test user
    await db.execute(
      `INSERT INTO users (id, external_id, first_name, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      [testUserId, 'tg_12345', 'TestUser']
    );

    // Create repository and engine
    repository = new GamificationRepository(db);
    eventEmitter = new EventEmitter();
    engine = new GamificationEngine(repository, eventEmitter);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up gamification data between tests
    await db.execute('DELETE FROM gamification_state WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM xp_transactions WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM achievements WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM streaks WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM user_quests WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM gamification_settings WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM session_tracking WHERE user_id = ?', [testUserId]);
  });

  // ==================== CORE OPERATIONS ====================

  describe('recordAction', () => {
    it('should record action and award XP', async () => {
      const result = await engine.recordAction(testUserId, 'diary_entry');

      expect(result.xpEarned).toBe(15); // diary_entry = 15 XP
      expect(result.totalXp).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should level up when enough XP earned', async () => {
      // Add enough XP to level up (100 XP for level 2)
      await engine.addXP(testUserId, 90, 'first_action');

      const result = await engine.recordAction(testUserId, 'daily_check_in'); // 25 XP

      expect(result.leveledUp).toBe(true);
      expect(result.level).toBe(2);
      expect(result.celebrations.length).toBeGreaterThan(0);
    });

    it('should update streak for diary entry', async () => {
      const result = await engine.recordAction(testUserId, 'diary_entry');

      expect(result.streakUpdates.length).toBeGreaterThan(0);
      expect(result.streakUpdates[0].type).toBe('sleep_diary');
      expect(result.streakUpdates[0].currentCount).toBe(1);
    });

    it('should emit xp:earned event', async () => {
      const events: unknown[] = [];
      engine.on('xp:earned', (data) => events.push(data));

      await engine.recordAction(testUserId, 'diary_entry');

      expect(events.length).toBe(1);
      expect((events[0] as Record<string, unknown>).amount).toBe(15);
    });
  });

  // ==================== PLAYER PROFILE ====================

  describe('getPlayerProfile', () => {
    it('should return complete player profile', async () => {
      // Record some actions first
      await engine.recordAction(testUserId, 'diary_entry');
      await engine.recordAction(testUserId, 'daily_check_in');

      const profile = await engine.getPlayerProfile(testUserId);

      expect(profile.userId).toBe(testUserId);
      expect(profile.totalXp).toBeGreaterThan(0);
      expect(profile.level).toBeGreaterThanOrEqual(1);
      expect(profile.sonyaEmoji).toBeDefined();
      expect(profile.sonyaName).toBeDefined();
    });

    it('should return default profile for new user', async () => {
      const profile = await engine.getPlayerProfile(testUserId);

      expect(profile.level).toBe(1);
      expect(profile.engagementLevel).toBe('new_user');
    });
  });

  // ==================== XP & LEVEL ====================

  describe('XP Operations', () => {
    it('should add XP correctly', async () => {
      const result = await engine.addXP(testUserId, 50, 'first_action');

      expect(result.newTotalXp).toBe(50);
      expect(result.leveledUp).toBe(false);
    });

    it('should get XP status', async () => {
      await engine.addXP(testUserId, 75, 'first_action');

      const status = await engine.getXPStatus(testUserId);

      expect(status.totalXp).toBe(75);
      expect(status.level).toBe(1);
      expect(status.xpToNextLevel).toBe(25); // 100 - 75
      expect(status.levelProgress).toBe(75); // 75%
    });
  });

  // ==================== QUESTS ====================

  describe('Quest Operations', () => {
    it('should get available quests', async () => {
      const quests = await engine.getAvailableQuests(testUserId);

      expect(quests.length).toBeGreaterThan(0);
    });

    it('should start a quest', async () => {
      const quest = await engine.startQuest(testUserId, 'diary_streak_7');

      expect(quest).not.toBeNull();
      expect(quest!.questId).toBe('diary_streak_7');
    });

    it('should get active quests', async () => {
      await engine.startQuest(testUserId, 'diary_streak_7');

      const activeQuests = await engine.getActiveQuests(testUserId);

      expect(activeQuests.length).toBe(1);
      expect(activeQuests[0].quest.id).toBe('diary_streak_7');
    });

    it('should not allow more than 3 active quests', async () => {
      await engine.startQuest(testUserId, 'diary_streak_7');
      await engine.startQuest(testUserId, 'digital_detox_3d');
      await engine.startQuest(testUserId, 'voice_diary_5');

      const fourth = await engine.startQuest(testUserId, 'sleep_7h_5d');

      expect(fourth).toBeNull();
    });
  });

  // ==================== ACHIEVEMENTS ====================

  describe('Achievement Operations', () => {
    it('should award badges', async () => {
      const results = await engine.checkAndAwardBadges(testUserId, 'diary_entry');

      // First diary entry should trigger 'first_diary' badge check
      // (may or may not award depending on badge criteria)
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get user badges', async () => {
      // Manually award a badge
      await repository.unlockAchievement(testUserId, 'first_login');

      const badges = await engine.getUserBadges(testUserId);

      expect(badges.length).toBe(1);
      expect(badges[0].badgeId).toBe('first_login');
    });

    it('should check if user has badge', async () => {
      await repository.unlockAchievement(testUserId, 'first_login');

      const has = await engine.hasBadge(testUserId, 'first_login');
      const hasNot = await engine.hasBadge(testUserId, 'non_existent');

      expect(has).toBe(true);
      expect(hasNot).toBe(false);
    });

    it('should get all badge definitions', () => {
      const badges = engine.getAllBadges();

      expect(badges.length).toBeGreaterThan(0);
    });
  });

  // ==================== STREAKS ====================

  describe('Streak Operations', () => {
    it('should get user streaks', async () => {
      await engine.incrementStreak(testUserId, 'daily_login');

      const streaks = await engine.getStreaks(testUserId);

      expect(streaks.length).toBe(1);
      expect(streaks[0].currentCount).toBe(1);
    });

    it('should increment streak', async () => {
      const update = await engine.incrementStreak(testUserId, 'daily_login');

      expect(update.currentCount).toBe(1);
      expect(update.previousCount).toBe(0);
    });

    it('should freeze streak', async () => {
      await engine.incrementStreak(testUserId, 'daily_login');

      const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await engine.freezeStreak(testUserId, 'daily_login', until);

      expect(result).toBe(true);

      const streaks = await engine.getStreaks(testUserId);
      expect(streaks[0].isFrozen).toBe(true);
    });

    it('should soft reset streak', async () => {
      // Build streak
      for (let i = 0; i < 10; i++) {
        await repository.incrementStreak(testUserId, 'daily_login');
      }

      const result = await engine.softResetStreak(testUserId, 'daily_login');

      expect(result.currentCount).toBeGreaterThan(0);
      expect(result.currentCount).toBeLessThan(10);
    });
  });

  // ==================== EVOLUTION ====================

  describe('Evolution Operations', () => {
    it('should check evolution', async () => {
      const result = await engine.checkEvolution(testUserId);

      expect(result.currentStage).toBeDefined();
      expect(result.currentStage.id).toBe('owlet');
    });

    it('should get Sonya greeting', async () => {
      const greeting = await engine.getSonyaGreeting(testUserId);

      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(0);
    });

    it('should get Sonya emoji', async () => {
      const emoji = await engine.getSonyaEmoji(testUserId);

      expect(emoji).toBeDefined();
    });

    it('should get evolution status', async () => {
      const status = await engine.getEvolutionStatus(testUserId);

      expect(status).toBeDefined();
      expect(status).toContain('Совёнок');
    });
  });

  // ==================== SESSION TRACKING ====================

  describe('Session Tracking', () => {
    it('should start a session', async () => {
      const { sessionId } = await engine.startSession(testUserId);

      expect(sessionId).toBeDefined();
      expect(sessionId).toBeGreaterThan(0);
    });

    it('should end a session', async () => {
      await engine.startSession(testUserId);
      await engine.endSession(testUserId, 2);

      // Should not throw
      const duration = await engine.getTodaySessionDuration(testUserId);
      expect(typeof duration).toBe('number');
    });
  });

  // ==================== SETTINGS ====================

  describe('Settings', () => {
    it('should get default settings', async () => {
      const settings = await engine.getSettings(testUserId);

      expect(settings.compassionEnabled).toBe(true);
      expect(settings.softResetEnabled).toBe(true);
    });

    it('should update settings', async () => {
      await engine.updateSettings(testUserId, {
        compassionEnabled: false,
        softLimitMinutes: 45,
      });

      const settings = await engine.getSettings(testUserId);

      expect(settings.compassionEnabled).toBe(false);
      expect(settings.softLimitMinutes).toBe(45);
    });
  });

  // ==================== EVENTS ====================

  describe('Event System', () => {
    it('should emit and receive events', async () => {
      const events: unknown[] = [];
      const handler = (data: unknown) => events.push(data);

      engine.on('xp:earned', handler);
      await engine.recordAction(testUserId, 'diary_entry');
      engine.off('xp:earned', handler);

      expect(events.length).toBe(1);
    });

    it('should emit level:up event on level up', async () => {
      const events: unknown[] = [];
      engine.on('level:up', (data) => events.push(data));

      // Add enough XP to level up
      await engine.addXP(testUserId, 100, 'milestone_reached');

      expect(events.length).toBe(1);
      expect((events[0] as Record<string, unknown>).newLevel).toBe(2);
    });
  });

  // ==================== GDPR ====================

  describe('GDPR Compliance', () => {
    it('should export user data', async () => {
      // Create some data
      await engine.recordAction(testUserId, 'diary_entry');
      await engine.startQuest(testUserId, 'diary_streak_7');

      const exported = await engine.exportUserData(testUserId);

      expect(exported.profile).toBeDefined();
      expect(exported.xpTransactions.length).toBeGreaterThan(0);
    });

    it('should delete user data', async () => {
      // Create some data
      await engine.recordAction(testUserId, 'diary_entry');

      const result = await engine.deleteUserData(testUserId);
      expect(result).toBe(true);

      // Verify deletion
      const profile = await engine.getPlayerProfile(testUserId);
      expect(profile.totalXp).toBe(0);
    });

    it('should anonymize user data', async () => {
      // Create some data
      await engine.recordAction(testUserId, 'diary_entry');

      const result = await engine.anonymizeUserData(testUserId);
      expect(result).toBe(true);
    });
  });

  // ==================== DAILY CHECK-IN ====================

  describe('Daily Check-In', () => {
    it('should record daily check-in', async () => {
      const result = await engine.recordDailyCheckIn(testUserId);

      expect(result.xpEarned).toBeGreaterThan(0);
      expect(result.streakUpdates.length).toBeGreaterThan(0);
    });
  });
});
