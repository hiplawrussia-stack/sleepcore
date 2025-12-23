/**
 * IGamificationRepository - Gamification Data Access Interface
 * =============================================================
 *
 * Repository interface for gamification persistence layer.
 * Follows Repository Pattern with domain-specific methods.
 *
 * Based on:
 * - Sprint 4 Migration 005 schema
 * - Octalysis Framework gamification mechanics
 * - GDPR Article 17 compliance (soft delete)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IEntity } from './IRepository';

// ==================== ENTITY DEFINITIONS ====================

/**
 * Engagement level enum
 */
export type EngagementLevel = 'new_user' | 'exploring' | 'committed' | 'habituated' | 'veteran';

/**
 * XP source types
 */
export type XPSource =
  | 'daily_check_in'
  | 'emotion_log'
  | 'challenge_complete'
  | 'quest_complete'
  | 'streak_bonus'
  | 'first_action'
  | 'helping_others'
  | 'crisis_overcome'
  | 'milestone_reached'
  | 'ai_interaction'
  | 'sleep_diary'
  | 'assessment_complete';

/**
 * Streak types
 */
export type StreakType =
  | 'daily_login'
  | 'sleep_diary'
  | 'emotion_log'
  | 'challenge_complete'
  | 'therapy_session';

/**
 * Quest status
 */
export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'expired';

/**
 * Gamification state entity
 */
export interface IGamificationStateEntity extends IEntity {
  readonly userId: number;
  readonly totalXp: number;
  readonly currentLevel: number;
  readonly engagementLevel: EngagementLevel;
  readonly totalDaysActive: number;
  readonly adaptiveDifficulty: number;
  readonly preferredChallengeTypesJson: string;
  readonly emotionalPatternsJson: string;
  readonly lastActiveAt?: Date;
}

/**
 * XP transaction entity (event sourcing)
 */
export interface IXPTransactionEntity extends IEntity {
  readonly userId: number;
  readonly amount: number;
  readonly source: XPSource;
  readonly multiplier: number;
  readonly metadataJson: string;
}

/**
 * Achievement/Badge entity
 */
export interface IAchievementEntity extends IEntity {
  readonly userId: number;
  readonly achievementId: string;
  readonly progress: number;
  readonly unlockedAt?: Date;
  readonly notified: boolean;
}

/**
 * Streak entity
 */
export interface IStreakEntity extends IEntity {
  readonly userId: number;
  readonly type: StreakType;
  readonly currentCount: number;
  readonly longestCount: number;
  readonly lastActivityAt?: Date;
  readonly multiplier: number;
  readonly frozen: boolean;
  readonly frozenUntil?: Date;
}

/**
 * User quest entity
 */
export interface IUserQuestEntity extends IEntity {
  readonly userId: number;
  readonly questId: string;
  readonly status: QuestStatus;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly objectivesJson: string;
}

/**
 * Inventory item entity
 */
export interface IInventoryEntity extends IEntity {
  readonly userId: number;
  readonly rewardId: string;
  readonly quantity: number;
  readonly acquiredAt: Date;
  readonly expiresAt?: Date;
}

/**
 * Equipped items entity
 */
export interface IEquippedItemsEntity {
  readonly userId: number;
  readonly equippedBadge?: string;
  readonly equippedTitle?: string;
  readonly equippedTheme?: string;
  readonly equippedFrame?: string;
  readonly updatedAt?: Date;
}

/**
 * Gamification settings entity (ethical gamification)
 */
export interface IGamificationSettingsEntity {
  readonly userId: number;
  // Compassion mode
  readonly compassionEnabled: boolean;
  readonly autoFreezeOnStress: boolean;
  readonly autoFreezeThreshold: number;
  readonly maxAutoFreezesPerWeek: number;
  readonly currentAutoFreezesUsed: number;
  readonly lastAutoFreezeAt?: Date;
  readonly stressDetectionEnabled: boolean;
  // Soft reset
  readonly softResetEnabled: boolean;
  readonly preservePercentage: number;
  readonly minimumPreserved: number;
  readonly gracePeriodDays: number;
  readonly notifyBeforeReset: boolean;
  // Wellbeing limits
  readonly softLimitMinutes: number;
  readonly hardLimitMinutes: number;
  readonly dailyLimitMinutes: number;
  readonly breakDurationMinutes: number;
  readonly cooldownBetweenSessionsMinutes: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Session tracking entity
 */
export interface ISessionTrackingEntity extends IEntity {
  readonly userId: number;
  readonly sessionStart: Date;
  readonly sessionEnd?: Date;
  readonly durationMinutes?: number;
  readonly breaksTaken: number;
  readonly wellbeingAlertsJson: string;
}

/**
 * Daily session summary entity
 */
export interface IDailySessionSummaryEntity extends IEntity {
  readonly userId: number;
  readonly date: string;
  readonly totalSessions: number;
  readonly totalMinutes: number;
  readonly breaksTaken: number;
  readonly wellbeingAlertsTriggered: number;
}

// ==================== REPOSITORY INTERFACE ====================

/**
 * Gamification repository interface
 * Provides data access for all gamification-related entities
 */
export interface IGamificationRepository {
  // ==================== GAMIFICATION STATE ====================

  /**
   * Get gamification state for a user
   */
  getState(userId: number): Promise<IGamificationStateEntity | null>;

  /**
   * Create or update gamification state
   */
  saveState(state: Partial<IGamificationStateEntity> & { userId: number }): Promise<IGamificationStateEntity>;

  /**
   * Update XP and potentially level up
   */
  addXP(userId: number, amount: number, source: XPSource, metadata?: object): Promise<{
    newTotalXp: number;
    previousLevel: number;
    newLevel: number;
    leveledUp: boolean;
  }>;

  // ==================== XP TRANSACTIONS ====================

  /**
   * Get XP transaction history
   */
  getXPTransactions(userId: number, limit?: number): Promise<IXPTransactionEntity[]>;

  /**
   * Get total XP from transactions (for verification)
   */
  getTotalXPFromTransactions(userId: number): Promise<number>;

  /**
   * Get XP earned today
   */
  getXPEarnedToday(userId: number): Promise<number>;

  // ==================== ACHIEVEMENTS ====================

  /**
   * Get all achievements for a user
   */
  getAchievements(userId: number): Promise<IAchievementEntity[]>;

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(userId: number): Promise<IAchievementEntity[]>;

  /**
   * Check if user has an achievement
   */
  hasAchievement(userId: number, achievementId: string): Promise<boolean>;

  /**
   * Unlock an achievement
   */
  unlockAchievement(userId: number, achievementId: string): Promise<IAchievementEntity>;

  /**
   * Update achievement progress
   */
  updateAchievementProgress(userId: number, achievementId: string, progress: number): Promise<IAchievementEntity>;

  /**
   * Mark achievement as notified
   */
  markAchievementNotified(userId: number, achievementId: string): Promise<boolean>;

  /**
   * Get unnotified achievements
   */
  getUnnotifiedAchievements(userId: number): Promise<IAchievementEntity[]>;

  // ==================== STREAKS ====================

  /**
   * Get all streaks for a user
   */
  getStreaks(userId: number): Promise<IStreakEntity[]>;

  /**
   * Get a specific streak
   */
  getStreak(userId: number, type: StreakType): Promise<IStreakEntity | null>;

  /**
   * Update streak (increment or reset)
   */
  updateStreak(userId: number, type: StreakType, newCount: number): Promise<IStreakEntity>;

  /**
   * Increment streak by 1
   */
  incrementStreak(userId: number, type: StreakType): Promise<IStreakEntity>;

  /**
   * Reset streak (with soft reset option)
   */
  resetStreak(userId: number, type: StreakType, softReset?: boolean): Promise<IStreakEntity>;

  /**
   * Freeze streak
   */
  freezeStreak(userId: number, type: StreakType, until: Date): Promise<boolean>;

  /**
   * Unfreeze streak
   */
  unfreezeStreak(userId: number, type: StreakType): Promise<boolean>;

  // ==================== QUESTS ====================

  /**
   * Get active quests for a user
   */
  getActiveQuests(userId: number): Promise<IUserQuestEntity[]>;

  /**
   * Get all quests for a user
   */
  getUserQuests(userId: number): Promise<IUserQuestEntity[]>;

  /**
   * Get a specific quest
   */
  getUserQuest(userId: number, questId: string): Promise<IUserQuestEntity | null>;

  /**
   * Start a quest
   */
  startQuest(userId: number, questId: string): Promise<IUserQuestEntity>;

  /**
   * Update quest progress
   */
  updateQuestProgress(userId: number, questId: string, objectives: object): Promise<IUserQuestEntity>;

  /**
   * Complete a quest
   */
  completeQuest(userId: number, questId: string): Promise<IUserQuestEntity>;

  /**
   * Expire a quest
   */
  expireQuest(userId: number, questId: string): Promise<IUserQuestEntity>;

  /**
   * Get completed quest count
   */
  getCompletedQuestCount(userId: number): Promise<number>;

  // ==================== INVENTORY ====================

  /**
   * Get user's inventory
   */
  getInventory(userId: number): Promise<IInventoryEntity[]>;

  /**
   * Add item to inventory
   */
  addToInventory(userId: number, rewardId: string, quantity?: number, expiresAt?: Date): Promise<IInventoryEntity>;

  /**
   * Remove item from inventory
   */
  removeFromInventory(userId: number, rewardId: string, quantity?: number): Promise<boolean>;

  /**
   * Check if user has item
   */
  hasItem(userId: number, rewardId: string): Promise<boolean>;

  // ==================== EQUIPPED ITEMS ====================

  /**
   * Get equipped items
   */
  getEquippedItems(userId: number): Promise<IEquippedItemsEntity | null>;

  /**
   * Equip an item (badge, title, theme, frame)
   */
  equipItem(userId: number, slot: 'badge' | 'title' | 'theme' | 'frame', itemId: string): Promise<IEquippedItemsEntity>;

  /**
   * Unequip an item
   */
  unequipItem(userId: number, slot: 'badge' | 'title' | 'theme' | 'frame'): Promise<IEquippedItemsEntity>;

  // ==================== GAMIFICATION SETTINGS ====================

  /**
   * Get user's gamification settings
   */
  getSettings(userId: number): Promise<IGamificationSettingsEntity | null>;

  /**
   * Save gamification settings
   */
  saveSettings(settings: Partial<IGamificationSettingsEntity> & { userId: number }): Promise<IGamificationSettingsEntity>;

  /**
   * Get default settings
   */
  getDefaultSettings(): IGamificationSettingsEntity;

  // ==================== SESSION TRACKING ====================

  /**
   * Start a session
   */
  startSession(userId: number): Promise<ISessionTrackingEntity>;

  /**
   * End a session
   */
  endSession(sessionId: number, breaksTaken?: number): Promise<ISessionTrackingEntity>;

  /**
   * Get current active session
   */
  getCurrentSession(userId: number): Promise<ISessionTrackingEntity | null>;

  /**
   * Add wellbeing alert to session
   */
  addWellbeingAlert(sessionId: number, alertType: string): Promise<boolean>;

  /**
   * Get daily session summary
   */
  getDailySummary(userId: number, date: string): Promise<IDailySessionSummaryEntity | null>;

  /**
   * Get session summaries for date range
   */
  getSessionSummaries(userId: number, startDate: string, endDate: string): Promise<IDailySessionSummaryEntity[]>;

  // ==================== COMPOSITE OPERATIONS ====================

  /**
   * Award quest completion with all side effects
   * - Mark quest completed
   * - Add XP transaction
   * - Update total XP & level
   * - Unlock badge if applicable
   * All in a single transaction
   */
  awardQuestCompletion(
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
  }>;

  /**
   * Record daily check-in
   * - Update streak
   * - Add XP for streak bonus
   * - Check achievements
   */
  recordDailyCheckIn(userId: number): Promise<{
    streak: IStreakEntity;
    xpEarned: number;
    newAchievements: IAchievementEntity[];
  }>;

  // ==================== GDPR COMPLIANCE ====================

  /**
   * Export all gamification data for a user
   */
  exportUserData(userId: number): Promise<{
    state: IGamificationStateEntity | null;
    xpTransactions: IXPTransactionEntity[];
    achievements: IAchievementEntity[];
    streaks: IStreakEntity[];
    quests: IUserQuestEntity[];
    inventory: IInventoryEntity[];
    settings: IGamificationSettingsEntity | null;
  }>;

  /**
   * Delete all gamification data for a user (hard delete)
   */
  deleteUserData(userId: number): Promise<boolean>;

  /**
   * Anonymize gamification data for a user
   */
  anonymizeUserData(userId: number): Promise<boolean>;
}
