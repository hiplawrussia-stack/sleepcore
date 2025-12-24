/**
 * IGamificationEngine - Gamification Engine Interface
 * ====================================================
 *
 * Defines the contract for the unified gamification system.
 * Implements Facade pattern over Quest, Badge, and Evolution services.
 *
 * Research basis:
 * - arXiv 2024: Centralized gamification engine architecture
 * - Event-driven design for real-time feedback
 * - GDPR-compliant data operations
 *
 * @packageDocumentation
 * @module @sleepcore/modules/gamification
 */

import type { EventEmitter } from 'events';
import type { IQuest, IActiveQuest, IQuestCompletionResult } from '../quests/QuestService';
import type { IBadge, IUserBadge, IBadgeAwardResult } from '../quests/BadgeService';
import type { ISonyaStage, IUserEvolutionData, IEvolutionResult } from '../evolution/SonyaEvolutionService';

// ==================== ACTION TYPES ====================

/**
 * User action types that trigger gamification events
 */
export type GamificationAction =
  | 'diary_entry'
  | 'voice_diary'
  | 'sleep_logged'
  | 'emotion_logged'
  | 'relax_session'
  | 'breathing_exercise'
  | 'mindful_session'
  | 'quest_started'
  | 'quest_completed'
  | 'daily_check_in'
  | 'referral'
  | 'streak_maintained'
  | 'goal_achieved'
  | 'custom';

// ==================== RESULT TYPES ====================

/**
 * Unified gamification result
 */
export interface IGamificationResult {
  /** XP earned from this action */
  xpEarned: number;

  /** New total XP after this action */
  totalXp: number;

  /** Current level */
  level: number;

  /** Whether user leveled up */
  leveledUp: boolean;

  /** Previous level (if leveled up) */
  previousLevel?: number;

  /** Completed quests */
  completedQuests: IQuestCompletionResult[];

  /** Awarded badges */
  awardedBadges: IBadgeAwardResult[];

  /** Streak updates */
  streakUpdates: IStreakUpdate[];

  /** Evolution result (if stage changed) */
  evolution?: IEvolutionResult;

  /** Celebration messages to show user */
  celebrations: string[];

  /** Timestamp of this result */
  timestamp: Date;
}

/**
 * Streak update information
 */
export interface IStreakUpdate {
  type: string;
  currentCount: number;
  previousCount: number;
  isFrozen: boolean;
  isNewRecord: boolean;
}

/**
 * Player profile with all gamification data
 */
export interface IPlayerProfile {
  userId: number;

  // XP & Level
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  levelProgress: number; // 0-100%

  // Engagement
  engagementLevel: string;
  totalDaysActive: number;
  lastActiveAt?: Date;

  // Streaks
  streaks: IStreakInfo[];
  longestStreak: number;

  // Quests
  activeQuests: IActiveQuestInfo[];
  completedQuestCount: number;

  // Achievements
  badges: IUserBadge[];
  badgeCount: number;
  totalBadgeXp: number;

  // Evolution
  sonyaStage: ISonyaStage;
  sonyaEmoji: string;
  sonyaName: string;

  // Settings
  compassionModeEnabled: boolean;
  softResetEnabled: boolean;
}

/**
 * Streak information
 */
export interface IStreakInfo {
  type: string;
  currentCount: number;
  longestCount: number;
  lastActivityAt?: Date;
  isFrozen: boolean;
  frozenUntil?: Date;
  multiplier: number;
}

/**
 * Active quest information
 */
export interface IActiveQuestInfo {
  quest: IQuest;
  progress: number; // 0-100%
  currentValue: number;
  targetValue: number;
  daysRemaining: number;
  startedAt: Date;
  expiresAt: Date;
}

// ==================== EVENT TYPES ====================

/**
 * Gamification event types
 */
export type GamificationEventType =
  | 'xp:earned'
  | 'level:up'
  | 'quest:started'
  | 'quest:progress'
  | 'quest:completed'
  | 'quest:expired'
  | 'achievement:unlocked'
  | 'achievement:progress'
  | 'streak:updated'
  | 'streak:broken'
  | 'streak:frozen'
  | 'evolution:stage_changed'
  | 'daily:check_in'
  | 'session:started'
  | 'session:ended';

/**
 * XP earned event data
 */
export interface IXPEarnedEvent {
  userId: number;
  amount: number;
  source: string;
  newTotal: number;
  multiplier: number;
}

/**
 * Level up event data
 */
export interface ILevelUpEvent {
  userId: number;
  previousLevel: number;
  newLevel: number;
  totalXp: number;
}

/**
 * Quest event data
 */
export interface IQuestEvent {
  userId: number;
  questId: string;
  quest: IQuest;
  progress?: number;
  reward?: { xp: number; badge?: string };
}

/**
 * Achievement event data
 */
export interface IAchievementEvent {
  userId: number;
  achievementId: string;
  badge: IBadge;
  isFirstTime: boolean;
}

/**
 * Streak event data
 */
export interface IStreakEvent {
  userId: number;
  type: string;
  currentCount: number;
  previousCount: number;
  isNewRecord: boolean;
}

/**
 * Evolution event data
 */
export interface IEvolutionEvent {
  userId: number;
  previousStage: ISonyaStage | null;
  newStage: ISonyaStage;
  daysActive: number;
}

// ==================== ENGINE INTERFACE ====================

/**
 * IGamificationEngine - Main gamification system interface
 *
 * Provides unified API for all gamification operations:
 * - XP and leveling
 * - Quests
 * - Achievements/Badges
 * - Streaks
 * - Evolution (Sonya stages)
 * - Session tracking
 */
export interface IGamificationEngine {
  // ==================== CORE OPERATIONS ====================

  /**
   * Record a user action and process all gamification effects
   * This is the main entry point for gamification
   *
   * @param userId - Numeric user ID
   * @param action - Type of action performed
   * @param metadata - Additional action metadata
   * @returns Unified gamification result
   */
  recordAction(
    userId: number,
    action: GamificationAction,
    metadata?: Record<string, unknown>
  ): Promise<IGamificationResult>;

  /**
   * Get complete player profile
   */
  getPlayerProfile(userId: number): Promise<IPlayerProfile>;

  /**
   * Record daily check-in
   * Special action that updates streaks and awards daily XP
   */
  recordDailyCheckIn(userId: number): Promise<IGamificationResult>;

  // ==================== XP & LEVEL ====================

  /**
   * Add XP to user
   * Automatically handles level-up
   */
  addXP(
    userId: number,
    amount: number,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    newTotalXp: number;
    previousLevel: number;
    newLevel: number;
    leveledUp: boolean;
  }>;

  /**
   * Get user's current XP and level
   */
  getXPStatus(userId: number): Promise<{
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    levelProgress: number;
  }>;

  // ==================== QUESTS ====================

  /**
   * Get available quests for user
   */
  getAvailableQuests(userId: number): Promise<IQuest[]>;

  /**
   * Get user's active quests
   */
  getActiveQuests(userId: number): Promise<IActiveQuestInfo[]>;

  /**
   * Start a quest
   */
  startQuest(userId: number, questId: string): Promise<IActiveQuest | null>;

  /**
   * Update quest progress
   * Called internally by recordAction
   */
  updateQuestProgress(
    userId: number,
    metric: string,
    value?: number
  ): Promise<IQuestCompletionResult[]>;

  /**
   * Get completed quest count
   */
  getCompletedQuestCount(userId: number): Promise<number>;

  // ==================== ACHIEVEMENTS ====================

  /**
   * Check and award badges based on event
   */
  checkAndAwardBadges(
    userId: number,
    event: string,
    value?: number
  ): Promise<IBadgeAwardResult[]>;

  /**
   * Get user's badges
   */
  getUserBadges(userId: number): Promise<IUserBadge[]>;

  /**
   * Get all available badges
   */
  getAllBadges(): IBadge[];

  /**
   * Check if user has a specific badge
   */
  hasBadge(userId: number, badgeId: string): Promise<boolean>;

  // ==================== STREAKS ====================

  /**
   * Get user's streaks
   */
  getStreaks(userId: number): Promise<IStreakInfo[]>;

  /**
   * Increment a streak
   */
  incrementStreak(userId: number, type: string): Promise<IStreakUpdate>;

  /**
   * Freeze a streak (protection)
   */
  freezeStreak(userId: number, type: string, until: Date): Promise<boolean>;

  /**
   * Use soft reset on a streak
   */
  softResetStreak(userId: number, type: string): Promise<IStreakInfo>;

  // ==================== EVOLUTION ====================

  /**
   * Check and process evolution
   */
  checkEvolution(userId: number): Promise<IEvolutionResult>;

  /**
   * Get Sonya's current greeting
   */
  getSonyaGreeting(userId: number): Promise<string>;

  /**
   * Get Sonya's current emoji
   */
  getSonyaEmoji(userId: number): Promise<string>;

  /**
   * Get evolution status
   */
  getEvolutionStatus(userId: number): Promise<string>;

  // ==================== SESSION TRACKING ====================

  /**
   * Start a session
   */
  startSession(userId: number): Promise<{ sessionId: number }>;

  /**
   * End current session
   */
  endSession(userId: number, breaksTaken?: number): Promise<void>;

  /**
   * Get today's session duration
   */
  getTodaySessionDuration(userId: number): Promise<number>;

  // ==================== SETTINGS ====================

  /**
   * Get user's gamification settings
   */
  getSettings(userId: number): Promise<{
    compassionEnabled: boolean;
    softResetEnabled: boolean;
    softLimitMinutes: number;
    dailyLimitMinutes: number;
  }>;

  /**
   * Update gamification settings
   */
  updateSettings(
    userId: number,
    settings: Partial<{
      compassionEnabled: boolean;
      softResetEnabled: boolean;
      softLimitMinutes: number;
      dailyLimitMinutes: number;
    }>
  ): Promise<void>;

  // ==================== EVENTS ====================

  /**
   * Subscribe to gamification events
   */
  on(event: GamificationEventType, listener: (data: unknown) => void): void;

  /**
   * Unsubscribe from events
   */
  off(event: GamificationEventType, listener: (data: unknown) => void): void;

  // ==================== GDPR ====================

  /**
   * Export all user gamification data
   */
  exportUserData(userId: number): Promise<{
    profile: IPlayerProfile;
    xpTransactions: unknown[];
    quests: unknown[];
    achievements: unknown[];
    streaks: unknown[];
    inventory: unknown[];
  }>;

  /**
   * Delete all user gamification data
   */
  deleteUserData(userId: number): Promise<boolean>;

  /**
   * Anonymize user data (keep aggregates, remove PII)
   */
  anonymizeUserData(userId: number): Promise<boolean>;
}
