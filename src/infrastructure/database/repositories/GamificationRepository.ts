/**
 * GamificationRepository - Gamification Data Access Implementation
 * =================================================================
 *
 * SQLite repository for gamification persistence layer.
 * Implements IGamificationRepository with better-sqlite3.
 *
 * Features:
 * - XP transactions (event sourcing)
 * - Achievement/badge management
 * - Streak tracking with soft reset
 * - Quest progress tracking
 * - Ethical gamification settings
 * - GDPR compliance (export, delete, anonymize)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type {
  IGamificationRepository,
  IGamificationStateEntity,
  IXPTransactionEntity,
  IAchievementEntity,
  IStreakEntity,
  IUserQuestEntity,
  IInventoryEntity,
  IEquippedItemsEntity,
  IGamificationSettingsEntity,
  ISessionTrackingEntity,
  IDailySessionSummaryEntity,
  XPSource,
  StreakType,
  EngagementLevel,
  QuestStatus,
} from '../interfaces/IGamificationRepository';

// ==================== LEVEL THRESHOLDS ====================

/**
 * XP required for each level (exponential curve)
 * Based on Octalysis Framework progression design
 */
const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  1750,   // Level 6
  2750,   // Level 7
  4000,   // Level 8
  5500,   // Level 9
  7500,   // Level 10
  10000,  // Level 11
  13000,  // Level 12
  16500,  // Level 13
  20500,  // Level 14
  25000,  // Level 15+
];

/**
 * Calculate level from total XP
 */
function calculateLevel(totalXp: number): number {
  for (let level = LEVEL_THRESHOLDS.length - 1; level >= 0; level--) {
    if (totalXp >= LEVEL_THRESHOLDS[level]) {
      return level + 1;
    }
  }
  return 1;
}

// ==================== DATABASE ROW TYPES ====================

interface IGamificationStateRow {
  id?: number;
  user_id: number;
  total_xp: number;
  current_level: number;
  engagement_level: string;
  total_days_active: number;
  adaptive_difficulty: number;
  preferred_challenge_types_json: string;
  emotional_patterns_json: string;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface IXPTransactionRow {
  id?: number;
  user_id: number;
  amount: number;
  source: string;
  multiplier: number;
  metadata_json: string;
  created_at?: string;
}

interface IAchievementRow {
  id?: number;
  user_id: number;
  achievement_id: string;
  progress: number;
  unlocked_at?: string;
  notified: number;
  created_at?: string;
  updated_at?: string;
}

interface IStreakRow {
  id?: number;
  user_id: number;
  type: string;
  current_count: number;
  longest_count: number;
  last_activity_at?: string;
  multiplier: number;
  frozen: number;
  frozen_until?: string;
  created_at?: string;
  updated_at?: string;
}

interface IUserQuestRow {
  id?: number;
  user_id: number;
  quest_id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  objectives_json: string;
  created_at?: string;
  updated_at?: string;
}

interface IInventoryRow {
  id?: number;
  user_id: number;
  reward_id: string;
  quantity: number;
  acquired_at: string;
  expires_at?: string;
}

interface IEquippedItemsRow {
  user_id: number;
  equipped_badge?: string;
  equipped_title?: string;
  equipped_theme?: string;
  equipped_frame?: string;
  updated_at?: string;
}

interface IGamificationSettingsRow {
  user_id: number;
  compassion_enabled: number;
  auto_freeze_on_stress: number;
  auto_freeze_threshold: number;
  max_auto_freezes_per_week: number;
  current_auto_freezes_used: number;
  last_auto_freeze_at?: string;
  stress_detection_enabled: number;
  soft_reset_enabled: number;
  preserve_percentage: number;
  minimum_preserved: number;
  grace_period_days: number;
  notify_before_reset: number;
  soft_limit_minutes: number;
  hard_limit_minutes: number;
  daily_limit_minutes: number;
  break_duration_minutes: number;
  cooldown_between_sessions_minutes: number;
  created_at?: string;
  updated_at?: string;
}

interface ISessionTrackingRow {
  id?: number;
  user_id: number;
  session_start: string;
  session_end?: string;
  duration_minutes?: number;
  breaks_taken: number;
  wellbeing_alerts_json: string;
  created_at?: string;
}

interface IDailySessionSummaryRow {
  id?: number;
  user_id: number;
  date: string;
  total_sessions: number;
  total_minutes: number;
  breaks_taken: number;
  wellbeing_alerts_triggered: number;
  created_at?: string;
}

// ==================== REPOSITORY IMPLEMENTATION ====================

/**
 * GamificationRepository - SQLite implementation
 */
export class GamificationRepository implements IGamificationRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  // ==================== HELPER METHODS ====================

  private parseDate(dateStr: string | null | undefined): Date | undefined {
    if (!dateStr) return undefined;
    return new Date(dateStr);
  }

  private toISOString(date: Date | undefined): string | undefined {
    return date?.toISOString();
  }

  // ==================== GAMIFICATION STATE ====================

  async getState(userId: number): Promise<IGamificationStateEntity | null> {
    const row = await this.db.queryOne<IGamificationStateRow>(
      `SELECT * FROM gamification_state WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      totalXp: row.total_xp,
      currentLevel: row.current_level,
      engagementLevel: row.engagement_level as EngagementLevel,
      totalDaysActive: row.total_days_active,
      adaptiveDifficulty: row.adaptive_difficulty,
      preferredChallengeTypesJson: row.preferred_challenge_types_json,
      emotionalPatternsJson: row.emotional_patterns_json,
      lastActiveAt: this.parseDate(row.last_active_at),
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  async saveState(state: Partial<IGamificationStateEntity> & { userId: number }): Promise<IGamificationStateEntity> {
    const existing = await this.getState(state.userId);

    if (existing) {
      // Update
      await this.db.execute(
        `UPDATE gamification_state SET
          total_xp = COALESCE(?, total_xp),
          current_level = COALESCE(?, current_level),
          engagement_level = COALESCE(?, engagement_level),
          total_days_active = COALESCE(?, total_days_active),
          adaptive_difficulty = COALESCE(?, adaptive_difficulty),
          preferred_challenge_types_json = COALESCE(?, preferred_challenge_types_json),
          emotional_patterns_json = COALESCE(?, emotional_patterns_json),
          last_active_at = COALESCE(?, last_active_at),
          updated_at = datetime('now')
        WHERE user_id = ? AND deleted_at IS NULL`,
        [
          state.totalXp,
          state.currentLevel,
          state.engagementLevel,
          state.totalDaysActive,
          state.adaptiveDifficulty,
          state.preferredChallengeTypesJson,
          state.emotionalPatternsJson,
          this.toISOString(state.lastActiveAt),
          state.userId,
        ]
      );
    } else {
      // Insert
      await this.db.execute(
        `INSERT INTO gamification_state (
          user_id, total_xp, current_level, engagement_level,
          total_days_active, adaptive_difficulty,
          preferred_challenge_types_json, emotional_patterns_json, last_active_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          state.userId,
          state.totalXp ?? 0,
          state.currentLevel ?? 1,
          state.engagementLevel ?? 'new_user',
          state.totalDaysActive ?? 0,
          state.adaptiveDifficulty ?? 50,
          state.preferredChallengeTypesJson ?? '[]',
          state.emotionalPatternsJson ?? '[]',
          this.toISOString(state.lastActiveAt),
        ]
      );
    }

    return (await this.getState(state.userId))!;
  }

  async addXP(
    userId: number,
    amount: number,
    source: XPSource,
    metadata?: object
  ): Promise<{
    newTotalXp: number;
    previousLevel: number;
    newLevel: number;
    leveledUp: boolean;
  }> {
    // Ensure state exists
    let state = await this.getState(userId);
    if (!state) {
      state = await this.saveState({ userId });
    }

    const previousLevel = state.currentLevel;
    const newTotalXp = state.totalXp + amount;
    const newLevel = calculateLevel(newTotalXp);
    const leveledUp = newLevel > previousLevel;

    // Add XP transaction
    await this.db.execute(
      `INSERT INTO xp_transactions (user_id, amount, source, multiplier, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amount, source, 1.0, JSON.stringify(metadata ?? {})]
    );

    // Update state
    await this.db.execute(
      `UPDATE gamification_state SET
        total_xp = ?,
        current_level = ?,
        updated_at = datetime('now')
      WHERE user_id = ? AND deleted_at IS NULL`,
      [newTotalXp, newLevel, userId]
    );

    return { newTotalXp, previousLevel, newLevel, leveledUp };
  }

  // ==================== XP TRANSACTIONS ====================

  async getXPTransactions(userId: number, limit: number = 50): Promise<IXPTransactionEntity[]> {
    const rows = await this.db.query<IXPTransactionRow>(
      `SELECT * FROM xp_transactions WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      source: row.source as XPSource,
      multiplier: row.multiplier,
      metadataJson: row.metadata_json,
      createdAt: this.parseDate(row.created_at),
    }));
  }

  async getTotalXPFromTransactions(userId: number): Promise<number> {
    const result = await this.db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ?`,
      [userId]
    );
    return result?.total ?? 0;
  }

  async getXPEarnedToday(userId: number): Promise<number> {
    const result = await this.db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions
       WHERE user_id = ? AND date(created_at) = date('now')`,
      [userId]
    );
    return result?.total ?? 0;
  }

  // ==================== ACHIEVEMENTS ====================

  async getAchievements(userId: number): Promise<IAchievementEntity[]> {
    const rows = await this.db.query<IAchievementRow>(
      `SELECT * FROM achievements WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      progress: row.progress,
      unlockedAt: this.parseDate(row.unlocked_at),
      notified: row.notified === 1,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    }));
  }

  async getUnlockedAchievements(userId: number): Promise<IAchievementEntity[]> {
    const rows = await this.db.query<IAchievementRow>(
      `SELECT * FROM achievements WHERE user_id = ? AND unlocked_at IS NOT NULL
       ORDER BY unlocked_at DESC`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      progress: row.progress,
      unlockedAt: this.parseDate(row.unlocked_at),
      notified: row.notified === 1,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    }));
  }

  async hasAchievement(userId: number, achievementId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM achievements
       WHERE user_id = ? AND achievement_id = ? AND unlocked_at IS NOT NULL`,
      [userId, achievementId]
    );
    return (result?.count ?? 0) > 0;
  }

  async unlockAchievement(userId: number, achievementId: string): Promise<IAchievementEntity> {
    // Upsert pattern
    await this.db.execute(
      `INSERT INTO achievements (user_id, achievement_id, progress, unlocked_at)
       VALUES (?, ?, 100, datetime('now'))
       ON CONFLICT(user_id, achievement_id) DO UPDATE SET
         unlocked_at = COALESCE(unlocked_at, datetime('now')),
         updated_at = datetime('now')`,
      [userId, achievementId]
    );

    const row = await this.db.queryOne<IAchievementRow>(
      `SELECT * FROM achievements WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievementId]
    );

    return {
      id: row!.id,
      userId: row!.user_id,
      achievementId: row!.achievement_id,
      progress: row!.progress,
      unlockedAt: this.parseDate(row!.unlocked_at),
      notified: row!.notified === 1,
      createdAt: this.parseDate(row!.created_at),
      updatedAt: this.parseDate(row!.updated_at),
    };
  }

  async updateAchievementProgress(userId: number, achievementId: string, progress: number): Promise<IAchievementEntity> {
    await this.db.execute(
      `INSERT INTO achievements (user_id, achievement_id, progress)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, achievement_id) DO UPDATE SET
         progress = ?,
         unlocked_at = CASE WHEN ? >= 100 THEN COALESCE(unlocked_at, datetime('now')) ELSE unlocked_at END,
         updated_at = datetime('now')`,
      [userId, achievementId, progress, progress, progress]
    );

    const row = await this.db.queryOne<IAchievementRow>(
      `SELECT * FROM achievements WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievementId]
    );

    return {
      id: row!.id,
      userId: row!.user_id,
      achievementId: row!.achievement_id,
      progress: row!.progress,
      unlockedAt: this.parseDate(row!.unlocked_at),
      notified: row!.notified === 1,
      createdAt: this.parseDate(row!.created_at),
      updatedAt: this.parseDate(row!.updated_at),
    };
  }

  async markAchievementNotified(userId: number, achievementId: string): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE achievements SET notified = 1, updated_at = datetime('now')
       WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievementId]
    );
    return result.changes > 0;
  }

  async getUnnotifiedAchievements(userId: number): Promise<IAchievementEntity[]> {
    const rows = await this.db.query<IAchievementRow>(
      `SELECT * FROM achievements WHERE user_id = ? AND unlocked_at IS NOT NULL AND notified = 0`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      progress: row.progress,
      unlockedAt: this.parseDate(row.unlocked_at),
      notified: row.notified === 1,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    }));
  }

  // ==================== STREAKS ====================

  async getStreaks(userId: number): Promise<IStreakEntity[]> {
    const rows = await this.db.query<IStreakRow>(
      `SELECT * FROM streaks WHERE user_id = ?`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as StreakType,
      currentCount: row.current_count,
      longestCount: row.longest_count,
      lastActivityAt: this.parseDate(row.last_activity_at),
      multiplier: row.multiplier,
      frozen: row.frozen === 1,
      frozenUntil: this.parseDate(row.frozen_until),
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    }));
  }

  async getStreak(userId: number, type: StreakType): Promise<IStreakEntity | null> {
    const row = await this.db.queryOne<IStreakRow>(
      `SELECT * FROM streaks WHERE user_id = ? AND type = ?`,
      [userId, type]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as StreakType,
      currentCount: row.current_count,
      longestCount: row.longest_count,
      lastActivityAt: this.parseDate(row.last_activity_at),
      multiplier: row.multiplier,
      frozen: row.frozen === 1,
      frozenUntil: this.parseDate(row.frozen_until),
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    };
  }

  async updateStreak(userId: number, type: StreakType, newCount: number): Promise<IStreakEntity> {
    await this.db.execute(
      `INSERT INTO streaks (user_id, type, current_count, longest_count, last_activity_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, type) DO UPDATE SET
         current_count = ?,
         longest_count = MAX(longest_count, ?),
         last_activity_at = datetime('now'),
         updated_at = datetime('now')`,
      [userId, type, newCount, newCount, newCount, newCount]
    );

    return (await this.getStreak(userId, type))!;
  }

  async incrementStreak(userId: number, type: StreakType): Promise<IStreakEntity> {
    const current = await this.getStreak(userId, type);
    const newCount = (current?.currentCount ?? 0) + 1;
    return this.updateStreak(userId, type, newCount);
  }

  async resetStreak(userId: number, type: StreakType, softReset: boolean = true): Promise<IStreakEntity> {
    const current = await this.getStreak(userId, type);
    if (!current) {
      return this.updateStreak(userId, type, 0);
    }

    let newCount = 0;
    if (softReset) {
      // Preserve 50% with minimum of 3
      newCount = Math.max(3, Math.floor(current.currentCount * 0.5));
    }

    await this.db.execute(
      `UPDATE streaks SET current_count = ?, updated_at = datetime('now')
       WHERE user_id = ? AND type = ?`,
      [newCount, userId, type]
    );

    return (await this.getStreak(userId, type))!;
  }

  async freezeStreak(userId: number, type: StreakType, until: Date): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE streaks SET frozen = 1, frozen_until = ?, updated_at = datetime('now')
       WHERE user_id = ? AND type = ?`,
      [until.toISOString(), userId, type]
    );
    return result.changes > 0;
  }

  async unfreezeStreak(userId: number, type: StreakType): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE streaks SET frozen = 0, frozen_until = NULL, updated_at = datetime('now')
       WHERE user_id = ? AND type = ?`,
      [userId, type]
    );
    return result.changes > 0;
  }

  // ==================== QUESTS ====================

  async getActiveQuests(userId: number): Promise<IUserQuestEntity[]> {
    const rows = await this.db.query<IUserQuestRow>(
      `SELECT * FROM user_quests WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    return rows.map((row) => this.rowToQuestEntity(row));
  }

  async getUserQuests(userId: number): Promise<IUserQuestEntity[]> {
    const rows = await this.db.query<IUserQuestRow>(
      `SELECT * FROM user_quests WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((row) => this.rowToQuestEntity(row));
  }

  async getUserQuest(userId: number, questId: string): Promise<IUserQuestEntity | null> {
    const row = await this.db.queryOne<IUserQuestRow>(
      `SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?`,
      [userId, questId]
    );

    return row ? this.rowToQuestEntity(row) : null;
  }

  async startQuest(userId: number, questId: string): Promise<IUserQuestEntity> {
    await this.db.execute(
      `INSERT INTO user_quests (user_id, quest_id, status, started_at, objectives_json)
       VALUES (?, ?, 'active', datetime('now'), '[]')
       ON CONFLICT(user_id, quest_id) DO UPDATE SET
         status = 'active',
         started_at = datetime('now'),
         updated_at = datetime('now')`,
      [userId, questId]
    );

    return (await this.getUserQuest(userId, questId))!;
  }

  async updateQuestProgress(userId: number, questId: string, objectives: object): Promise<IUserQuestEntity> {
    await this.db.execute(
      `UPDATE user_quests SET objectives_json = ?, updated_at = datetime('now')
       WHERE user_id = ? AND quest_id = ?`,
      [JSON.stringify(objectives), userId, questId]
    );

    return (await this.getUserQuest(userId, questId))!;
  }

  async completeQuest(userId: number, questId: string): Promise<IUserQuestEntity> {
    await this.db.execute(
      `UPDATE user_quests SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
       WHERE user_id = ? AND quest_id = ?`,
      [userId, questId]
    );

    return (await this.getUserQuest(userId, questId))!;
  }

  async expireQuest(userId: number, questId: string): Promise<IUserQuestEntity> {
    await this.db.execute(
      `UPDATE user_quests SET status = 'expired', updated_at = datetime('now')
       WHERE user_id = ? AND quest_id = ?`,
      [userId, questId]
    );

    return (await this.getUserQuest(userId, questId))!;
  }

  async getCompletedQuestCount(userId: number): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_quests WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    return result?.count ?? 0;
  }

  private rowToQuestEntity(row: IUserQuestRow): IUserQuestEntity {
    return {
      id: row.id,
      userId: row.user_id,
      questId: row.quest_id,
      status: row.status as QuestStatus,
      startedAt: this.parseDate(row.started_at),
      completedAt: this.parseDate(row.completed_at),
      objectivesJson: row.objectives_json,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    };
  }

  // ==================== INVENTORY ====================

  async getInventory(userId: number): Promise<IInventoryEntity[]> {
    const rows = await this.db.query<IInventoryRow>(
      `SELECT * FROM inventory WHERE user_id = ?`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      rewardId: row.reward_id,
      quantity: row.quantity,
      acquiredAt: this.parseDate(row.acquired_at)!,
      expiresAt: this.parseDate(row.expires_at),
    }));
  }

  async addToInventory(userId: number, rewardId: string, quantity: number = 1, expiresAt?: Date): Promise<IInventoryEntity> {
    await this.db.execute(
      `INSERT INTO inventory (user_id, reward_id, quantity, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, reward_id) DO UPDATE SET
         quantity = quantity + ?`,
      [userId, rewardId, quantity, expiresAt?.toISOString(), quantity]
    );

    const row = await this.db.queryOne<IInventoryRow>(
      `SELECT * FROM inventory WHERE user_id = ? AND reward_id = ?`,
      [userId, rewardId]
    );

    return {
      id: row!.id,
      userId: row!.user_id,
      rewardId: row!.reward_id,
      quantity: row!.quantity,
      acquiredAt: this.parseDate(row!.acquired_at)!,
      expiresAt: this.parseDate(row!.expires_at),
    };
  }

  async removeFromInventory(userId: number, rewardId: string, quantity: number = 1): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE inventory SET quantity = quantity - ?
       WHERE user_id = ? AND reward_id = ? AND quantity >= ?`,
      [quantity, userId, rewardId, quantity]
    );

    // Clean up zero quantity items
    await this.db.execute(
      `DELETE FROM inventory WHERE user_id = ? AND reward_id = ? AND quantity <= 0`,
      [userId, rewardId]
    );

    return result.changes > 0;
  }

  async hasItem(userId: number, rewardId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND reward_id = ? AND quantity > 0`,
      [userId, rewardId]
    );
    return (result?.count ?? 0) > 0;
  }

  // ==================== EQUIPPED ITEMS ====================

  async getEquippedItems(userId: number): Promise<IEquippedItemsEntity | null> {
    const row = await this.db.queryOne<IEquippedItemsRow>(
      `SELECT * FROM equipped_items WHERE user_id = ?`,
      [userId]
    );

    if (!row) return null;

    return {
      userId: row.user_id,
      equippedBadge: row.equipped_badge,
      equippedTitle: row.equipped_title,
      equippedTheme: row.equipped_theme,
      equippedFrame: row.equipped_frame,
      updatedAt: this.parseDate(row.updated_at),
    };
  }

  async equipItem(userId: number, slot: 'badge' | 'title' | 'theme' | 'frame', itemId: string): Promise<IEquippedItemsEntity> {
    const column = `equipped_${slot}`;
    await this.db.execute(
      `INSERT INTO equipped_items (user_id, ${column})
       VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         ${column} = ?,
         updated_at = datetime('now')`,
      [userId, itemId, itemId]
    );

    return (await this.getEquippedItems(userId))!;
  }

  async unequipItem(userId: number, slot: 'badge' | 'title' | 'theme' | 'frame'): Promise<IEquippedItemsEntity> {
    const column = `equipped_${slot}`;
    await this.db.execute(
      `UPDATE equipped_items SET ${column} = NULL, updated_at = datetime('now')
       WHERE user_id = ?`,
      [userId]
    );

    return (await this.getEquippedItems(userId))!;
  }

  // ==================== GAMIFICATION SETTINGS ====================

  async getSettings(userId: number): Promise<IGamificationSettingsEntity | null> {
    const row = await this.db.queryOne<IGamificationSettingsRow>(
      `SELECT * FROM gamification_settings WHERE user_id = ?`,
      [userId]
    );

    if (!row) return null;

    return this.rowToSettingsEntity(row);
  }

  async saveSettings(settings: Partial<IGamificationSettingsEntity> & { userId: number }): Promise<IGamificationSettingsEntity> {
    const defaults = this.getDefaultSettings();
    const merged = { ...defaults, ...settings };

    await this.db.execute(
      `INSERT INTO gamification_settings (
        user_id, compassion_enabled, auto_freeze_on_stress, auto_freeze_threshold,
        max_auto_freezes_per_week, current_auto_freezes_used, stress_detection_enabled,
        soft_reset_enabled, preserve_percentage, minimum_preserved, grace_period_days,
        notify_before_reset, soft_limit_minutes, hard_limit_minutes, daily_limit_minutes,
        break_duration_minutes, cooldown_between_sessions_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        compassion_enabled = ?, auto_freeze_on_stress = ?, auto_freeze_threshold = ?,
        max_auto_freezes_per_week = ?, current_auto_freezes_used = ?, stress_detection_enabled = ?,
        soft_reset_enabled = ?, preserve_percentage = ?, minimum_preserved = ?, grace_period_days = ?,
        notify_before_reset = ?, soft_limit_minutes = ?, hard_limit_minutes = ?, daily_limit_minutes = ?,
        break_duration_minutes = ?, cooldown_between_sessions_minutes = ?,
        updated_at = datetime('now')`,
      [
        merged.userId,
        merged.compassionEnabled ? 1 : 0,
        merged.autoFreezeOnStress ? 1 : 0,
        merged.autoFreezeThreshold,
        merged.maxAutoFreezesPerWeek,
        merged.currentAutoFreezesUsed,
        merged.stressDetectionEnabled ? 1 : 0,
        merged.softResetEnabled ? 1 : 0,
        merged.preservePercentage,
        merged.minimumPreserved,
        merged.gracePeriodDays,
        merged.notifyBeforeReset ? 1 : 0,
        merged.softLimitMinutes,
        merged.hardLimitMinutes,
        merged.dailyLimitMinutes,
        merged.breakDurationMinutes,
        merged.cooldownBetweenSessionsMinutes,
        // For UPDATE
        merged.compassionEnabled ? 1 : 0,
        merged.autoFreezeOnStress ? 1 : 0,
        merged.autoFreezeThreshold,
        merged.maxAutoFreezesPerWeek,
        merged.currentAutoFreezesUsed,
        merged.stressDetectionEnabled ? 1 : 0,
        merged.softResetEnabled ? 1 : 0,
        merged.preservePercentage,
        merged.minimumPreserved,
        merged.gracePeriodDays,
        merged.notifyBeforeReset ? 1 : 0,
        merged.softLimitMinutes,
        merged.hardLimitMinutes,
        merged.dailyLimitMinutes,
        merged.breakDurationMinutes,
        merged.cooldownBetweenSessionsMinutes,
      ]
    );

    return (await this.getSettings(settings.userId))!;
  }

  getDefaultSettings(): IGamificationSettingsEntity {
    return {
      userId: 0, // Will be overwritten
      compassionEnabled: true,
      autoFreezeOnStress: true,
      autoFreezeThreshold: 7,
      maxAutoFreezesPerWeek: 2,
      currentAutoFreezesUsed: 0,
      stressDetectionEnabled: true,
      softResetEnabled: true,
      preservePercentage: 0.5,
      minimumPreserved: 3,
      gracePeriodDays: 2,
      notifyBeforeReset: true,
      softLimitMinutes: 30,
      hardLimitMinutes: 60,
      dailyLimitMinutes: 120,
      breakDurationMinutes: 15,
      cooldownBetweenSessionsMinutes: 30,
    };
  }

  private rowToSettingsEntity(row: IGamificationSettingsRow): IGamificationSettingsEntity {
    return {
      userId: row.user_id,
      compassionEnabled: row.compassion_enabled === 1,
      autoFreezeOnStress: row.auto_freeze_on_stress === 1,
      autoFreezeThreshold: row.auto_freeze_threshold,
      maxAutoFreezesPerWeek: row.max_auto_freezes_per_week,
      currentAutoFreezesUsed: row.current_auto_freezes_used,
      lastAutoFreezeAt: this.parseDate(row.last_auto_freeze_at),
      stressDetectionEnabled: row.stress_detection_enabled === 1,
      softResetEnabled: row.soft_reset_enabled === 1,
      preservePercentage: row.preserve_percentage,
      minimumPreserved: row.minimum_preserved,
      gracePeriodDays: row.grace_period_days,
      notifyBeforeReset: row.notify_before_reset === 1,
      softLimitMinutes: row.soft_limit_minutes,
      hardLimitMinutes: row.hard_limit_minutes,
      dailyLimitMinutes: row.daily_limit_minutes,
      breakDurationMinutes: row.break_duration_minutes,
      cooldownBetweenSessionsMinutes: row.cooldown_between_sessions_minutes,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
    };
  }

  // ==================== SESSION TRACKING ====================

  async startSession(userId: number): Promise<ISessionTrackingEntity> {
    const result = await this.db.execute(
      `INSERT INTO session_tracking (user_id, session_start, wellbeing_alerts_json)
       VALUES (?, datetime('now'), '[]')`,
      [userId]
    );

    const row = await this.db.queryOne<ISessionTrackingRow>(
      `SELECT * FROM session_tracking WHERE id = ?`,
      [result.lastInsertRowid]
    );

    return {
      id: row!.id,
      userId: row!.user_id,
      sessionStart: this.parseDate(row!.session_start)!,
      sessionEnd: this.parseDate(row!.session_end),
      durationMinutes: row!.duration_minutes,
      breaksTaken: row!.breaks_taken,
      wellbeingAlertsJson: row!.wellbeing_alerts_json,
      createdAt: this.parseDate(row!.created_at),
    };
  }

  async endSession(sessionId: number, breaksTaken: number = 0): Promise<ISessionTrackingEntity> {
    await this.db.execute(
      `UPDATE session_tracking SET
        session_end = datetime('now'),
        duration_minutes = CAST((julianday(datetime('now')) - julianday(session_start)) * 24 * 60 AS INTEGER),
        breaks_taken = ?
       WHERE id = ?`,
      [breaksTaken, sessionId]
    );

    const row = await this.db.queryOne<ISessionTrackingRow>(
      `SELECT * FROM session_tracking WHERE id = ?`,
      [sessionId]
    );

    return {
      id: row!.id,
      userId: row!.user_id,
      sessionStart: this.parseDate(row!.session_start)!,
      sessionEnd: this.parseDate(row!.session_end),
      durationMinutes: row!.duration_minutes,
      breaksTaken: row!.breaks_taken,
      wellbeingAlertsJson: row!.wellbeing_alerts_json,
      createdAt: this.parseDate(row!.created_at),
    };
  }

  async getCurrentSession(userId: number): Promise<ISessionTrackingEntity | null> {
    const row = await this.db.queryOne<ISessionTrackingRow>(
      `SELECT * FROM session_tracking WHERE user_id = ? AND session_end IS NULL
       ORDER BY session_start DESC LIMIT 1`,
      [userId]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      sessionStart: this.parseDate(row.session_start)!,
      sessionEnd: this.parseDate(row.session_end),
      durationMinutes: row.duration_minutes,
      breaksTaken: row.breaks_taken,
      wellbeingAlertsJson: row.wellbeing_alerts_json,
      createdAt: this.parseDate(row.created_at),
    };
  }

  async addWellbeingAlert(sessionId: number, alertType: string): Promise<boolean> {
    const row = await this.db.queryOne<{ wellbeing_alerts_json: string }>(
      `SELECT wellbeing_alerts_json FROM session_tracking WHERE id = ?`,
      [sessionId]
    );

    if (!row) return false;

    const alerts = JSON.parse(row.wellbeing_alerts_json);
    alerts.push({ type: alertType, timestamp: new Date().toISOString() });

    const result = await this.db.execute(
      `UPDATE session_tracking SET wellbeing_alerts_json = ? WHERE id = ?`,
      [JSON.stringify(alerts), sessionId]
    );

    return result.changes > 0;
  }

  async getDailySummary(userId: number, date: string): Promise<IDailySessionSummaryEntity | null> {
    const row = await this.db.queryOne<IDailySessionSummaryRow>(
      `SELECT * FROM daily_session_summary WHERE user_id = ? AND date = ?`,
      [userId, date]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      totalSessions: row.total_sessions,
      totalMinutes: row.total_minutes,
      breaksTaken: row.breaks_taken,
      wellbeingAlertsTriggered: row.wellbeing_alerts_triggered,
      createdAt: this.parseDate(row.created_at),
    };
  }

  async getSessionSummaries(userId: number, startDate: string, endDate: string): Promise<IDailySessionSummaryEntity[]> {
    const rows = await this.db.query<IDailySessionSummaryRow>(
      `SELECT * FROM daily_session_summary WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [userId, startDate, endDate]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: row.date,
      totalSessions: row.total_sessions,
      totalMinutes: row.total_minutes,
      breaksTaken: row.breaks_taken,
      wellbeingAlertsTriggered: row.wellbeing_alerts_triggered,
      createdAt: this.parseDate(row.created_at),
    }));
  }

  // ==================== COMPOSITE OPERATIONS ====================

  async awardQuestCompletion(
    userId: number,
    questId: string,
    xpReward: number,
    badgeId?: string
  ): Promise<{
    quest: IUserQuestEntity;
    xpTransaction: IXPTransactionEntity;
    leveledUp: boolean;
    newLevel?: number;
    badge?: IAchievementEntity;
  }> {
    // Complete quest
    const quest = await this.completeQuest(userId, questId);

    // Add XP
    const xpResult = await this.addXP(userId, xpReward, 'quest_complete', { questId });

    // Get the XP transaction
    const xpTransactions = await this.getXPTransactions(userId, 1);
    const xpTransaction = xpTransactions[0];

    // Unlock badge if provided
    let badge: IAchievementEntity | undefined;
    if (badgeId) {
      badge = await this.unlockAchievement(userId, badgeId);
    }

    return {
      quest,
      xpTransaction,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.leveledUp ? xpResult.newLevel : undefined,
      badge,
    };
  }

  async recordDailyCheckIn(userId: number): Promise<{
    streak: IStreakEntity;
    xpEarned: number;
    newAchievements: IAchievementEntity[];
  }> {
    // Update streak
    const streak = await this.incrementStreak(userId, 'daily_login');

    // Calculate XP with streak bonus
    const streakBonus = Math.min(streak.currentCount, 7) * 5; // Max 35 bonus
    const baseXP = 10;
    const totalXP = baseXP + streakBonus;

    await this.addXP(userId, totalXP, 'daily_check_in', {
      streakDay: streak.currentCount,
      bonus: streakBonus,
    });

    // Check streak achievements
    const newAchievements: IAchievementEntity[] = [];
    const milestones = [7, 21, 30, 66];

    for (const milestone of milestones) {
      if (streak.currentCount === milestone) {
        const achievementId = `streak_${milestone}`;
        if (!(await this.hasAchievement(userId, achievementId))) {
          const achievement = await this.unlockAchievement(userId, achievementId);
          newAchievements.push(achievement);
        }
      }
    }

    return {
      streak,
      xpEarned: totalXP,
      newAchievements,
    };
  }

  // ==================== GDPR COMPLIANCE ====================

  async exportUserData(userId: number): Promise<{
    state: IGamificationStateEntity | null;
    xpTransactions: IXPTransactionEntity[];
    achievements: IAchievementEntity[];
    streaks: IStreakEntity[];
    quests: IUserQuestEntity[];
    inventory: IInventoryEntity[];
    settings: IGamificationSettingsEntity | null;
  }> {
    const [state, xpTransactions, achievements, streaks, quests, inventory, settings] = await Promise.all([
      this.getState(userId),
      this.getXPTransactions(userId, 1000), // Export all
      this.getAchievements(userId),
      this.getStreaks(userId),
      this.getUserQuests(userId),
      this.getInventory(userId),
      this.getSettings(userId),
    ]);

    return {
      state,
      xpTransactions,
      achievements,
      streaks,
      quests,
      inventory,
      settings,
    };
  }

  async deleteUserData(userId: number): Promise<boolean> {
    const tables = [
      'gamification_state',
      'xp_transactions',
      'achievements',
      'streaks',
      'user_quests',
      'inventory',
      'equipped_items',
      'gamification_settings',
      'session_tracking',
      'daily_session_summary',
    ];

    for (const table of tables) {
      await this.db.execute(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }

    return true;
  }

  async anonymizeUserData(userId: number): Promise<boolean> {
    // Soft delete gamification state
    await this.db.execute(
      `UPDATE gamification_state SET deleted_at = datetime('now') WHERE user_id = ?`,
      [userId]
    );

    // Delete personal tracking data
    await this.db.execute(`DELETE FROM session_tracking WHERE user_id = ?`, [userId]);
    await this.db.execute(`DELETE FROM daily_session_summary WHERE user_id = ?`, [userId]);

    return true;
  }
}
