/**
 * GamificationRepository Unit Tests
 * ==================================
 *
 * Tests for gamification persistence layer.
 * Uses in-memory SQLite for isolation.
 */

import { GamificationRepository } from '../../../../src/infrastructure/database/repositories/GamificationRepository';
import { SQLiteConnection } from '../../../../src/infrastructure/database/sqlite/SQLiteConnection';
import { SQLiteMigration } from '../../../../src/infrastructure/database/sqlite/SQLiteMigration';
import { MIGRATIONS } from '../../../../src/infrastructure/database/migrations';

describe('GamificationRepository', () => {
  let db: SQLiteConnection;
  let repo: GamificationRepository;
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

    // Create repository
    repo = new GamificationRepository(db);
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
    await db.execute('DELETE FROM inventory WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM equipped_items WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM gamification_settings WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM session_tracking WHERE user_id = ?', [testUserId]);
    await db.execute('DELETE FROM daily_session_summary WHERE user_id = ?', [testUserId]);
  });

  // ==================== GAMIFICATION STATE ====================

  describe('Gamification State', () => {
    it('should return null for non-existent user', async () => {
      const state = await repo.getState(99999);
      expect(state).toBeNull();
    });

    it('should create new state', async () => {
      const state = await repo.saveState({ userId: testUserId });

      expect(state).toBeDefined();
      expect(state.userId).toBe(testUserId);
      expect(state.totalXp).toBe(0);
      expect(state.currentLevel).toBe(1);
      expect(state.engagementLevel).toBe('new_user');
    });

    it('should update existing state', async () => {
      // Create initial state
      await repo.saveState({ userId: testUserId });

      // Update state
      const updated = await repo.saveState({
        userId: testUserId,
        totalXp: 500,
        currentLevel: 4,
        engagementLevel: 'exploring',
      });

      expect(updated.totalXp).toBe(500);
      expect(updated.currentLevel).toBe(4);
      expect(updated.engagementLevel).toBe('exploring');
    });

    it('should retrieve saved state', async () => {
      await repo.saveState({
        userId: testUserId,
        totalXp: 1000,
        currentLevel: 5,
      });

      const state = await repo.getState(testUserId);

      expect(state).not.toBeNull();
      expect(state!.totalXp).toBe(1000);
      expect(state!.currentLevel).toBe(5);
    });
  });

  // ==================== XP OPERATIONS ====================

  describe('XP Operations', () => {
    beforeEach(async () => {
      // Initialize state
      await repo.saveState({ userId: testUserId });
    });

    it('should add XP and update level', async () => {
      const result = await repo.addXP(testUserId, 100, 'daily_check_in');

      expect(result.newTotalXp).toBe(100);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
    });

    it('should not level up if threshold not reached', async () => {
      const result = await repo.addXP(testUserId, 50, 'emotion_log');

      expect(result.newTotalXp).toBe(50);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBe(1);
    });

    it('should record XP transaction', async () => {
      await repo.addXP(testUserId, 75, 'challenge_complete', { challengeId: 'test' });

      const transactions = await repo.getXPTransactions(testUserId);

      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(75);
      expect(transactions[0].source).toBe('challenge_complete');
    });

    it('should get total XP from transactions', async () => {
      await repo.addXP(testUserId, 50, 'daily_check_in');
      await repo.addXP(testUserId, 30, 'emotion_log');
      await repo.addXP(testUserId, 20, 'sleep_diary');

      const total = await repo.getTotalXPFromTransactions(testUserId);
      expect(total).toBe(100);
    });

    it('should get XP earned today', async () => {
      await repo.addXP(testUserId, 100, 'daily_check_in');

      const todayXp = await repo.getXPEarnedToday(testUserId);
      expect(todayXp).toBe(100);
    });
  });

  // ==================== ACHIEVEMENTS ====================

  describe('Achievements', () => {
    it('should unlock achievement', async () => {
      const achievement = await repo.unlockAchievement(testUserId, 'first_login');

      expect(achievement).toBeDefined();
      expect(achievement.achievementId).toBe('first_login');
      expect(achievement.unlockedAt).toBeDefined();
      expect(achievement.progress).toBe(100);
    });

    it('should check if achievement exists', async () => {
      await repo.unlockAchievement(testUserId, 'first_login');

      const has = await repo.hasAchievement(testUserId, 'first_login');
      const hasNot = await repo.hasAchievement(testUserId, 'non_existent');

      expect(has).toBe(true);
      expect(hasNot).toBe(false);
    });

    it('should update achievement progress', async () => {
      const achievement = await repo.updateAchievementProgress(testUserId, 'diary_streak', 50);

      expect(achievement.progress).toBe(50);
      expect(achievement.unlockedAt).toBeUndefined(); // Not unlocked yet
    });

    it('should auto-unlock at 100% progress on update', async () => {
      // First create achievement with 50% progress
      await repo.updateAchievementProgress(testUserId, 'diary_streak', 50);

      // Then update to 100%
      const achievement = await repo.updateAchievementProgress(testUserId, 'diary_streak', 100);

      expect(achievement.progress).toBe(100);
      expect(achievement.unlockedAt).toBeDefined();
    });

    it('should get unlocked achievements', async () => {
      await repo.unlockAchievement(testUserId, 'first_login');
      await repo.unlockAchievement(testUserId, 'diary_master');
      await repo.updateAchievementProgress(testUserId, 'streak_king', 50);

      const unlocked = await repo.getUnlockedAchievements(testUserId);

      expect(unlocked.length).toBe(2);
    });

    it('should mark achievement as notified', async () => {
      await repo.unlockAchievement(testUserId, 'first_login');

      const result = await repo.markAchievementNotified(testUserId, 'first_login');
      expect(result).toBe(true);

      const unnotified = await repo.getUnnotifiedAchievements(testUserId);
      expect(unnotified.length).toBe(0);
    });
  });

  // ==================== STREAKS ====================

  describe('Streaks', () => {
    it('should increment streak', async () => {
      const streak = await repo.incrementStreak(testUserId, 'daily_login');

      expect(streak.currentCount).toBe(1);
      expect(streak.longestCount).toBe(1);
    });

    it('should track longest streak', async () => {
      await repo.incrementStreak(testUserId, 'daily_login');
      await repo.incrementStreak(testUserId, 'daily_login');
      await repo.incrementStreak(testUserId, 'daily_login');

      // Hard reset (softReset = false)
      await repo.resetStreak(testUserId, 'daily_login', false);

      const streak = await repo.getStreak(testUserId, 'daily_login');

      expect(streak!.currentCount).toBe(0);
      expect(streak!.longestCount).toBe(3);
    });

    it('should support soft reset', async () => {
      // Build up streak
      for (let i = 0; i < 10; i++) {
        await repo.incrementStreak(testUserId, 'sleep_diary');
      }

      // Soft reset (preserves 50%)
      await repo.resetStreak(testUserId, 'sleep_diary', true);

      const streak = await repo.getStreak(testUserId, 'sleep_diary');
      expect(streak!.currentCount).toBeGreaterThan(0);
      expect(streak!.currentCount).toBeLessThan(10);
    });

    it('should freeze streak', async () => {
      await repo.incrementStreak(testUserId, 'daily_login');
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await repo.freezeStreak(testUserId, 'daily_login', until);
      expect(result).toBe(true);

      const streak = await repo.getStreak(testUserId, 'daily_login');
      expect(streak!.frozen).toBe(true);
    });

    it('should unfreeze streak', async () => {
      await repo.incrementStreak(testUserId, 'daily_login');
      await repo.freezeStreak(testUserId, 'daily_login', new Date(Date.now() + 86400000));
      await repo.unfreezeStreak(testUserId, 'daily_login');

      const streak = await repo.getStreak(testUserId, 'daily_login');
      expect(streak!.frozen).toBe(false);
    });
  });

  // ==================== QUESTS ====================

  describe('Quests', () => {
    it('should start a quest', async () => {
      const quest = await repo.startQuest(testUserId, 'diary_streak_7');

      expect(quest.questId).toBe('diary_streak_7');
      expect(quest.status).toBe('active');
      expect(quest.startedAt).toBeDefined();
    });

    it('should get active quests', async () => {
      await repo.startQuest(testUserId, 'diary_streak_7');
      await repo.startQuest(testUserId, 'voice_diary_5');

      const active = await repo.getActiveQuests(testUserId);
      expect(active.length).toBe(2);
    });

    it('should update quest progress', async () => {
      await repo.startQuest(testUserId, 'diary_streak_7');

      const updated = await repo.updateQuestProgress(testUserId, 'diary_streak_7', {
        currentValue: 3,
        targetValue: 7,
      });

      expect(JSON.parse(updated.objectivesJson).currentValue).toBe(3);
    });

    it('should complete a quest', async () => {
      await repo.startQuest(testUserId, 'diary_streak_7');
      const completed = await repo.completeQuest(testUserId, 'diary_streak_7');

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should expire a quest', async () => {
      await repo.startQuest(testUserId, 'diary_streak_7');
      const expired = await repo.expireQuest(testUserId, 'diary_streak_7');

      expect(expired.status).toBe('expired');
    });

    it('should count completed quests', async () => {
      await repo.startQuest(testUserId, 'quest_1');
      await repo.startQuest(testUserId, 'quest_2');
      await repo.completeQuest(testUserId, 'quest_1');
      await repo.completeQuest(testUserId, 'quest_2');

      const count = await repo.getCompletedQuestCount(testUserId);
      expect(count).toBe(2);
    });
  });

  // ==================== INVENTORY ====================

  describe('Inventory', () => {
    it('should add item to inventory', async () => {
      const item = await repo.addToInventory(testUserId, 'freeze_token', 3);

      expect(item.rewardId).toBe('freeze_token');
      expect(item.quantity).toBe(3);
    });

    it('should increase quantity if item exists', async () => {
      await repo.addToInventory(testUserId, 'freeze_token', 1);
      await repo.addToInventory(testUserId, 'freeze_token', 2);

      const inventory = await repo.getInventory(testUserId);
      const token = inventory.find((i) => i.rewardId === 'freeze_token');

      expect(token!.quantity).toBe(3);
    });

    it('should check if user has item', async () => {
      await repo.addToInventory(testUserId, 'freeze_token');

      const has = await repo.hasItem(testUserId, 'freeze_token');
      const hasNot = await repo.hasItem(testUserId, 'non_existent');

      expect(has).toBe(true);
      expect(hasNot).toBe(false);
    });

    it('should remove item from inventory', async () => {
      await repo.addToInventory(testUserId, 'freeze_token', 3);
      await repo.removeFromInventory(testUserId, 'freeze_token', 2);

      const inventory = await repo.getInventory(testUserId);
      const token = inventory.find((i) => i.rewardId === 'freeze_token');

      expect(token!.quantity).toBe(1);
    });

    it('should delete item when quantity reaches 0', async () => {
      await repo.addToInventory(testUserId, 'freeze_token', 2);
      await repo.removeFromInventory(testUserId, 'freeze_token', 2);

      const has = await repo.hasItem(testUserId, 'freeze_token');
      expect(has).toBe(false);
    });
  });

  // ==================== EQUIPPED ITEMS ====================

  describe('Equipped Items', () => {
    it('should equip an item', async () => {
      const equipped = await repo.equipItem(testUserId, 'badge', 'early_adopter');

      expect(equipped.equippedBadge).toBe('early_adopter');
    });

    it('should get equipped items', async () => {
      await repo.equipItem(testUserId, 'badge', 'early_adopter');
      await repo.equipItem(testUserId, 'title', 'Sleep Master');

      const equipped = await repo.getEquippedItems(testUserId);

      expect(equipped!.equippedBadge).toBe('early_adopter');
      expect(equipped!.equippedTitle).toBe('Sleep Master');
    });

    it('should unequip an item', async () => {
      await repo.equipItem(testUserId, 'badge', 'early_adopter');
      await repo.unequipItem(testUserId, 'badge');

      const equipped = await repo.getEquippedItems(testUserId);
      expect(equipped!.equippedBadge).toBeNull();
    });
  });

  // ==================== SETTINGS ====================

  describe('Gamification Settings', () => {
    it('should get default settings', () => {
      const defaults = repo.getDefaultSettings();

      expect(defaults.compassionEnabled).toBe(true);
      expect(defaults.softResetEnabled).toBe(true);
      expect(defaults.preservePercentage).toBe(0.5);
    });

    it('should save settings', async () => {
      const settings = await repo.saveSettings({
        userId: testUserId,
        compassionEnabled: false,
        softLimitMinutes: 45,
      });

      expect(settings.compassionEnabled).toBe(false);
      expect(settings.softLimitMinutes).toBe(45);
    });

    it('should retrieve saved settings', async () => {
      await repo.saveSettings({
        userId: testUserId,
        dailyLimitMinutes: 90,
      });

      const settings = await repo.getSettings(testUserId);

      expect(settings!.dailyLimitMinutes).toBe(90);
    });
  });

  // ==================== SESSION TRACKING ====================

  describe('Session Tracking', () => {
    it('should start a session', async () => {
      const session = await repo.startSession(testUserId);

      expect(session.userId).toBe(testUserId);
      expect(session.sessionStart).toBeDefined();
    });

    it('should end a session', async () => {
      const session = await repo.startSession(testUserId);
      const ended = await repo.endSession(session.id!, 2);

      expect(ended.sessionEnd).toBeDefined();
      expect(ended.breaksTaken).toBe(2);
    });

    it('should get current active session', async () => {
      await repo.startSession(testUserId);

      const current = await repo.getCurrentSession(testUserId);
      expect(current).not.toBeNull();
      expect(current!.sessionEnd).toBeUndefined();
    });

    it('should return null if no active session', async () => {
      const session = await repo.startSession(testUserId);
      await repo.endSession(session.id!);

      const current = await repo.getCurrentSession(testUserId);
      expect(current).toBeNull();
    });
  });

  // ==================== COMPOSITE OPERATIONS ====================

  describe('Composite Operations', () => {
    beforeEach(async () => {
      await repo.saveState({ userId: testUserId });
    });

    it('should award quest completion atomically', async () => {
      await repo.startQuest(testUserId, 'test_quest');

      const result = await repo.awardQuestCompletion(
        testUserId,
        'test_quest',
        150,
        'quest_master'
      );

      expect(result.quest.status).toBe('completed');
      expect(result.xpTransaction.amount).toBe(150);
      expect(result.leveledUp).toBe(true);
      expect(result.badge).toBeDefined();
      expect(result.badge!.achievementId).toBe('quest_master');
    });

    it('should record daily check-in', async () => {
      const result = await repo.recordDailyCheckIn(testUserId);

      expect(result.streak.currentCount).toBe(1);
      expect(result.xpEarned).toBeGreaterThan(0);
    });
  });

  // ==================== GDPR COMPLIANCE ====================

  describe('GDPR Compliance', () => {
    it('should export all user data', async () => {
      // Create some data
      await repo.saveState({ userId: testUserId, totalXp: 500 });
      await repo.addXP(testUserId, 100, 'daily_check_in');
      await repo.unlockAchievement(testUserId, 'first_login');
      await repo.incrementStreak(testUserId, 'daily_login');
      await repo.startQuest(testUserId, 'test_quest');
      await repo.addToInventory(testUserId, 'freeze_token');
      await repo.saveSettings({ userId: testUserId });

      const exported = await repo.exportUserData(testUserId);

      expect(exported.state).not.toBeNull();
      expect(exported.xpTransactions.length).toBeGreaterThan(0);
      expect(exported.achievements.length).toBeGreaterThan(0);
      expect(exported.streaks.length).toBeGreaterThan(0);
      expect(exported.quests.length).toBeGreaterThan(0);
      expect(exported.inventory.length).toBeGreaterThan(0);
      expect(exported.settings).not.toBeNull();
    });

    it('should delete all user data (hard delete)', async () => {
      // Create data
      await repo.saveState({ userId: testUserId });
      await repo.unlockAchievement(testUserId, 'test');
      await repo.incrementStreak(testUserId, 'daily_login');

      // Delete
      const result = await repo.deleteUserData(testUserId);
      expect(result).toBe(true);

      // Verify deletion
      const state = await repo.getState(testUserId);
      const achievements = await repo.getAchievements(testUserId);
      const streaks = await repo.getStreaks(testUserId);

      expect(state).toBeNull();
      expect(achievements.length).toBe(0);
      expect(streaks.length).toBe(0);
    });

    it('should anonymize user data', async () => {
      // Create data
      await repo.saveState({ userId: testUserId, totalXp: 1000 });
      await repo.addXP(testUserId, 100, 'daily_check_in', { userName: 'John' });
      await repo.startSession(testUserId);

      // Anonymize (soft deletes state, removes session tracking)
      const result = await repo.anonymizeUserData(testUserId);
      expect(result).toBe(true);

      // Gamification state is soft-deleted (getState returns null for deleted records)
      const state = await repo.getState(testUserId);
      expect(state).toBeNull();

      // Session tracking is removed
      const session = await repo.getCurrentSession(testUserId);
      expect(session).toBeNull();
    });
  });
});
