/**
 * GamificationEngine - Unified Gamification System
 * =================================================
 *
 * Facade over Quest, Badge, and Evolution services.
 * Integrates with GamificationRepository for persistence.
 *
 * Architecture:
 * - Facade Pattern: Unified API over multiple services
 * - Event-Driven: Emits events for real-time notifications
 * - Repository Pattern: SQLite persistence via GamificationRepository
 *
 * @packageDocumentation
 * @module @sleepcore/modules/gamification
 */

import { EventEmitter } from 'events';
import type {
  IGamificationEngine,
  IGamificationResult,
  IPlayerProfile,
  IStreakInfo,
  IStreakUpdate,
  IActiveQuestInfo,
  GamificationAction,
  GamificationEventType,
} from './IGamificationEngine';
import type { IGamificationRepository, XPSource, StreakType } from '../../infrastructure/database';
import { QuestService, type IQuest, type IActiveQuest, type IQuestCompletionResult } from '../quests/QuestService';
import { BadgeService, type IBadge, type IUserBadge, type IBadgeAwardResult } from '../quests/BadgeService';
import { SonyaEvolutionService, type IEvolutionResult } from '../evolution/SonyaEvolutionService';

// ==================== XP CONFIGURATION ====================

/**
 * XP rewards for different actions
 */
const XP_REWARDS: Record<GamificationAction, number> = {
  diary_entry: 15,
  voice_diary: 20,
  sleep_logged: 10,
  emotion_logged: 10,
  relax_session: 15,
  breathing_exercise: 10,
  mindful_session: 15,
  quest_started: 5,
  quest_completed: 0, // XP comes from quest reward
  daily_check_in: 25,
  referral: 50,
  streak_maintained: 5,
  goal_achieved: 30,
  custom: 0,
};

/**
 * Map action types to valid XPSource values
 */
const ACTION_TO_XP_SOURCE: Record<GamificationAction, XPSource> = {
  diary_entry: 'sleep_diary',
  voice_diary: 'sleep_diary',
  sleep_logged: 'sleep_diary',
  emotion_logged: 'emotion_log',
  relax_session: 'ai_interaction',
  breathing_exercise: 'ai_interaction',
  mindful_session: 'ai_interaction',
  quest_started: 'first_action',
  quest_completed: 'quest_complete',
  daily_check_in: 'daily_check_in',
  referral: 'helping_others',
  streak_maintained: 'streak_bonus',
  goal_achieved: 'milestone_reached',
  custom: 'ai_interaction',
};

/**
 * Map action types to quest metrics
 */
const ACTION_TO_METRIC: Record<GamificationAction, string> = {
  diary_entry: 'diary_entries',
  voice_diary: 'voice_entries',
  sleep_logged: 'sleep_hours_7',
  emotion_logged: 'emotion_logs',
  relax_session: 'relax_sessions',
  breathing_exercise: 'breathing_sessions',
  mindful_session: 'relax_sessions',
  quest_started: 'quests_started',
  quest_completed: 'quests_completed',
  daily_check_in: 'daily_check_in',
  referral: 'referral',
  streak_maintained: 'streak_days',
  goal_achieved: 'goals_achieved',
  custom: 'custom',
};

/**
 * Map action types to streak types
 */
const ACTION_TO_STREAK: Partial<Record<GamificationAction, StreakType>> = {
  diary_entry: 'sleep_diary',
  daily_check_in: 'daily_login',
  emotion_logged: 'emotion_log',
};

// ==================== LEVEL THRESHOLDS ====================

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

function calculateXPToNextLevel(level: number, totalXp: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return 0;
  return LEVEL_THRESHOLDS[level] - totalXp;
}

function calculateLevelProgress(level: number, totalXp: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return 100;
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[level] || currentLevelXp + 1000;
  const progress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

// ==================== GAMIFICATION ENGINE ====================

/**
 * GamificationEngine - Main gamification system implementation
 */
export class GamificationEngine implements IGamificationEngine {
  private eventEmitter: EventEmitter;
  private questService: QuestService;
  private badgeService: BadgeService;
  private evolutionService: SonyaEvolutionService;

  constructor(
    private repository: IGamificationRepository,
    eventEmitter?: EventEmitter
  ) {
    this.eventEmitter = eventEmitter || new EventEmitter();
    this.questService = new QuestService();
    this.badgeService = new BadgeService();
    this.evolutionService = new SonyaEvolutionService();
  }

  // ==================== CORE OPERATIONS ====================

  async recordAction(
    userId: number,
    action: GamificationAction,
    metadata?: Record<string, unknown>
  ): Promise<IGamificationResult> {
    const celebrations: string[] = [];
    const completedQuests: IQuestCompletionResult[] = [];
    const awardedBadges: IBadgeAwardResult[] = [];
    const streakUpdates: IStreakUpdate[] = [];

    // 1. Ensure user has gamification state
    let state = await this.repository.getState(userId);
    if (!state) {
      state = await this.repository.saveState({ userId });
    }

    const previousLevel = state.currentLevel;

    // 2. Add XP for action
    const baseXp = XP_REWARDS[action];
    const xpSource = ACTION_TO_XP_SOURCE[action];
    let xpEarned = 0;

    if (baseXp > 0) {
      const xpResult = await this.repository.addXP(
        userId,
        baseXp,
        xpSource,
        metadata
      );
      xpEarned = baseXp;

      this.emit('xp:earned', {
        userId,
        amount: baseXp,
        source: xpSource,
        newTotal: xpResult.newTotalXp,
        multiplier: 1,
      });

      if (xpResult.leveledUp) {
        celebrations.push(
          `🎉 Поздравляем! Ты достиг ${xpResult.newLevel} уровня!`
        );
        this.emit('level:up', {
          userId,
          previousLevel: xpResult.previousLevel,
          newLevel: xpResult.newLevel,
          totalXp: xpResult.newTotalXp,
        });
      }
    }

    // 3. Update streak if applicable
    const streakType = ACTION_TO_STREAK[action];
    if (streakType) {
      const streak = await this.repository.incrementStreak(userId, streakType);
      const previousStreak = await this.repository.getStreak(userId, streakType);
      const isNewRecord = streak.currentCount > (previousStreak?.longestCount || 0);

      streakUpdates.push({
        type: streakType,
        currentCount: streak.currentCount,
        previousCount: streak.currentCount - 1,
        isFrozen: streak.frozen,
        isNewRecord,
      });

      if (streak.currentCount % 7 === 0) {
        celebrations.push(
          `🔥 ${streak.currentCount} дней подряд! Отличная серия!`
        );
      }

      this.emit('streak:updated', {
        userId,
        type: streakType,
        currentCount: streak.currentCount,
        previousCount: streak.currentCount - 1,
        isNewRecord,
      });
    }

    // 4. Update quest progress
    const metric = ACTION_TO_METRIC[action];
    if (metric) {
      const questResults = await this.updateQuestProgressInternal(userId, metric);
      completedQuests.push(...questResults);

      for (const result of questResults) {
        if (result.completed && result.reward) {
          // Add quest completion XP
          const _questXpResult = await this.repository.addXP(
            userId,
            result.reward.xp,
            'quest_complete',
            { questId: result.quest.id }
          );
          xpEarned += result.reward.xp;

          if (result.celebrationMessage) {
            celebrations.push(result.celebrationMessage);
          }

          this.emit('quest:completed', {
            userId,
            questId: result.quest.id,
            quest: result.quest,
            reward: result.reward,
          });

          // Award badge if quest has one
          if (result.reward.badge) {
            const badgeResult = await this.awardBadgeInternal(userId, result.reward.badge);
            if (badgeResult.awarded) {
              awardedBadges.push(badgeResult);
              if (badgeResult.message) {
                celebrations.push(badgeResult.message);
              }
            }
          }
        }
      }
    }

    // 5. Check and award badges
    const badgeResults = await this.checkAndAwardBadgesInternal(userId, action);
    awardedBadges.push(...badgeResults);

    for (const badge of badgeResults) {
      if (badge.awarded && badge.message) {
        celebrations.push(badge.message);
      }
    }

    // 6. Check evolution
    const updatedState = await this.repository.getState(userId);
    const daysActive = updatedState?.totalDaysActive || 0;
    const evolutionResult = await this.evolutionService.checkEvolution(
      String(userId),
      daysActive
    );

    if (evolutionResult.evolved && evolutionResult.celebrationMessage) {
      celebrations.push(evolutionResult.celebrationMessage);
      this.emit('evolution:stage_changed', {
        userId,
        previousStage: evolutionResult.previousStage,
        newStage: evolutionResult.currentStage,
        daysActive,
      });
    }

    // 7. Build result
    const finalState = await this.repository.getState(userId);

    return {
      xpEarned,
      totalXp: finalState?.totalXp || 0,
      level: finalState?.currentLevel || 1,
      leveledUp: (finalState?.currentLevel || 1) > previousLevel,
      previousLevel: previousLevel,
      completedQuests,
      awardedBadges,
      streakUpdates,
      evolution: evolutionResult.evolved ? evolutionResult : undefined,
      celebrations,
      timestamp: new Date(),
    };
  }

  async getPlayerProfile(userId: number): Promise<IPlayerProfile> {
    const state = await this.repository.getState(userId);
    const streaks = await this.repository.getStreaks(userId);
    const achievements = await this.repository.getAchievements(userId);
    const quests = await this.repository.getActiveQuests(userId);
    const completedQuestCount = await this.repository.getCompletedQuestCount(userId);
    const settings = await this.repository.getSettings(userId);
    const evolutionData = this.evolutionService.getUserData(String(userId));

    const totalXp = state?.totalXp || 0;
    const level = state?.currentLevel || 1;

    // Map streaks
    const streakInfos: IStreakInfo[] = streaks.map(s => ({
      type: s.type,
      currentCount: s.currentCount,
      longestCount: s.longestCount,
      lastActivityAt: s.lastActivityAt,
      isFrozen: s.frozen,
      frozenUntil: s.frozenUntil,
      multiplier: s.multiplier,
    }));

    // Map badges
    const badges: IUserBadge[] = achievements
      .filter(a => a.unlockedAt)
      .map(a => ({
        badgeId: a.achievementId,
        userId: String(userId),
        earnedAt: a.unlockedAt!,
        displayOrder: 0,
        isNew: !a.notified,
      }));

    // Map active quests
    const activeQuestInfos: IActiveQuestInfo[] = quests.map(q => {
      const quest = this.questService.getQuest(q.questId);
      const objectives = JSON.parse(q.objectivesJson || '{}');
      return {
        quest: quest!,
        progress: Math.min(100, Math.round((objectives.currentValue || 0) / (objectives.targetValue || 1) * 100)),
        currentValue: objectives.currentValue || 0,
        targetValue: objectives.targetValue || 1,
        daysRemaining: Math.max(0, Math.ceil((new Date(q.startedAt!).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))),
        startedAt: q.startedAt!,
        expiresAt: new Date(new Date(q.startedAt!).getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    });

    // Get Sonya stage
    const sonyaStage = this.evolutionService.getStage(evolutionData.currentStage)!;

    return {
      userId,
      totalXp,
      level,
      xpToNextLevel: calculateXPToNextLevel(level, totalXp),
      levelProgress: calculateLevelProgress(level, totalXp),
      engagementLevel: state?.engagementLevel || 'new_user',
      totalDaysActive: state?.totalDaysActive || 0,
      lastActiveAt: state?.lastActiveAt,
      streaks: streakInfos,
      longestStreak: Math.max(0, ...streaks.map(s => s.longestCount)),
      activeQuests: activeQuestInfos,
      completedQuestCount,
      badges,
      badgeCount: badges.length,
      totalBadgeXp: this.badgeService.getTotalBadgeXP(String(userId)),
      sonyaStage,
      sonyaEmoji: sonyaStage.emoji,
      sonyaName: sonyaStage.name,
      compassionModeEnabled: settings?.compassionEnabled ?? true,
      softResetEnabled: settings?.softResetEnabled ?? true,
    };
  }

  async recordDailyCheckIn(userId: number): Promise<IGamificationResult> {
    const result = await this.repository.recordDailyCheckIn(userId);

    const celebrations: string[] = [];

    if (result.streak.currentCount % 7 === 0) {
      celebrations.push(`🔥 ${result.streak.currentCount} дней подряд! Невероятно!`);
    }

    this.emit('daily:check_in', {
      userId,
      streak: result.streak.currentCount,
      xpEarned: result.xpEarned,
    });

    return this.recordAction(userId, 'daily_check_in');
  }

  // ==================== XP & LEVEL ====================

  async addXP(
    userId: number,
    amount: number,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    newTotalXp: number;
    previousLevel: number;
    newLevel: number;
    leveledUp: boolean;
  }> {
    const result = await this.repository.addXP(
      userId,
      amount,
      source as XPSource,
      metadata
    );

    if (result.leveledUp) {
      this.emit('level:up', {
        userId,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        totalXp: result.newTotalXp,
      });
    }

    return result;
  }

  async getXPStatus(userId: number): Promise<{
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    levelProgress: number;
  }> {
    const state = await this.repository.getState(userId);
    const totalXp = state?.totalXp || 0;
    const level = state?.currentLevel || 1;

    return {
      totalXp,
      level,
      xpToNextLevel: calculateXPToNextLevel(level, totalXp),
      levelProgress: calculateLevelProgress(level, totalXp),
    };
  }

  // ==================== QUESTS ====================

  async getAvailableQuests(userId: number): Promise<IQuest[]> {
    const _activeQuests = await this.repository.getActiveQuests(userId);
    const _completedCount = await this.repository.getCompletedQuestCount(userId);

    // Use in-memory service for quest definitions
    return this.questService.getAvailableQuests(String(userId));
  }

  async getActiveQuests(userId: number): Promise<IActiveQuestInfo[]> {
    const quests = await this.repository.getActiveQuests(userId);

    return quests.map(q => {
      const quest = this.questService.getQuest(q.questId);
      const objectives = JSON.parse(q.objectivesJson || '{}');
      const startDate = new Date(q.startedAt!);
      const expiresAt = new Date(startDate.getTime() + (quest?.durationDays || 7) * 24 * 60 * 60 * 1000);

      return {
        quest: quest!,
        progress: Math.min(100, Math.round((objectives.currentValue || 0) / (objectives.targetValue || 1) * 100)),
        currentValue: objectives.currentValue || 0,
        targetValue: objectives.targetValue || 1,
        daysRemaining: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
        startedAt: startDate,
        expiresAt,
      };
    });
  }

  async startQuest(userId: number, questId: string): Promise<IActiveQuest | null> {
    const quest = this.questService.getQuest(questId);
    if (!quest) return null;

    // Check if already active
    const activeQuests = await this.repository.getActiveQuests(userId);
    if (activeQuests.some(q => q.questId === questId)) {
      return null;
    }

    // Check max active (3)
    if (activeQuests.length >= 3) {
      return null;
    }

    // Start quest in repository
    const _userQuest = await this.repository.startQuest(userId, questId);

    // Also track in in-memory service for compatibility
    const activeQuest = this.questService.startQuest(String(userId), questId);

    this.emit('quest:started', {
      userId,
      questId,
      quest,
    });

    return activeQuest;
  }

  async updateQuestProgress(
    userId: number,
    metric: string,
    value?: number
  ): Promise<IQuestCompletionResult[]> {
    return this.updateQuestProgressInternal(userId, metric, value);
  }

  private async updateQuestProgressInternal(
    userId: number,
    metric: string,
    value: number = 1
  ): Promise<IQuestCompletionResult[]> {
    const results: IQuestCompletionResult[] = [];
    const activeQuests = await this.repository.getActiveQuests(userId);

    for (const userQuest of activeQuests) {
      const quest = this.questService.getQuest(userQuest.questId);
      if (!quest || quest.targetMetric !== metric) continue;

      const objectives = JSON.parse(userQuest.objectivesJson || '{}');
      const newValue = (objectives.currentValue || 0) + value;

      await this.repository.updateQuestProgress(userId, userQuest.questId, {
        currentValue: newValue,
        targetValue: quest.targetValue,
      });

      if (newValue >= quest.targetValue) {
        await this.repository.completeQuest(userId, userQuest.questId);
        results.push({
          completed: true,
          quest,
          reward: quest.reward,
          celebrationMessage: `🎉 Квест "${quest.title}" завершён!`,
        });
      }
    }

    // Also update in-memory service
    const memoryResults = this.questService.updateProgress(String(userId), metric, value);

    return results.length > 0 ? results : memoryResults;
  }

  async getCompletedQuestCount(userId: number): Promise<number> {
    return this.repository.getCompletedQuestCount(userId);
  }

  // ==================== ACHIEVEMENTS ====================

  async checkAndAwardBadges(
    userId: number,
    event: string,
    value?: number
  ): Promise<IBadgeAwardResult[]> {
    return this.checkAndAwardBadgesInternal(userId, event, value);
  }

  private async checkAndAwardBadgesInternal(
    userId: number,
    event: string,
    value: number = 1
  ): Promise<IBadgeAwardResult[]> {
    const results: IBadgeAwardResult[] = [];

    // Use in-memory badge service for badge definitions and criteria
    const badgeResults = this.badgeService.checkAndAwardBadges(String(userId), event, value);

    // Persist awarded badges
    for (const result of badgeResults) {
      if (result.awarded && result.badge) {
        await this.repository.unlockAchievement(userId, result.badge.id);
        results.push(result);

        this.emit('achievement:unlocked', {
          userId,
          achievementId: result.badge.id,
          badge: result.badge,
          isFirstTime: result.isFirstTime,
        });
      }
    }

    return results;
  }

  private async awardBadgeInternal(userId: number, badgeId: string): Promise<IBadgeAwardResult> {
    const result = this.badgeService.awardBadge(String(userId), badgeId);

    if (result.awarded) {
      await this.repository.unlockAchievement(userId, badgeId);
    }

    return result;
  }

  async getUserBadges(userId: number): Promise<IUserBadge[]> {
    const achievements = await this.repository.getUnlockedAchievements(userId);

    return achievements.map(a => ({
      badgeId: a.achievementId,
      userId: String(userId),
      earnedAt: a.unlockedAt!,
      displayOrder: 0,
      isNew: !a.notified,
    }));
  }

  getAllBadges(): IBadge[] {
    return this.badgeService.getAllBadges();
  }

  async hasBadge(userId: number, badgeId: string): Promise<boolean> {
    return this.repository.hasAchievement(userId, badgeId);
  }

  // ==================== STREAKS ====================

  async getStreaks(userId: number): Promise<IStreakInfo[]> {
    const streaks = await this.repository.getStreaks(userId);

    return streaks.map(s => ({
      type: s.type,
      currentCount: s.currentCount,
      longestCount: s.longestCount,
      lastActivityAt: s.lastActivityAt,
      isFrozen: s.frozen,
      frozenUntil: s.frozenUntil,
      multiplier: s.multiplier,
    }));
  }

  async incrementStreak(userId: number, type: string): Promise<IStreakUpdate> {
    const before = await this.repository.getStreak(userId, type as StreakType);
    const after = await this.repository.incrementStreak(userId, type as StreakType);

    const update: IStreakUpdate = {
      type,
      currentCount: after.currentCount,
      previousCount: before?.currentCount || 0,
      isFrozen: after.frozen,
      isNewRecord: after.currentCount > (before?.longestCount || 0),
    };

    this.emit('streak:updated', {
      userId,
      ...update,
    });

    return update;
  }

  async freezeStreak(userId: number, type: string, until: Date): Promise<boolean> {
    const result = await this.repository.freezeStreak(userId, type as StreakType, until);

    if (result) {
      this.emit('streak:frozen', { userId, type, until });
    }

    return result;
  }

  async softResetStreak(userId: number, type: string): Promise<IStreakInfo> {
    const streak = await this.repository.resetStreak(userId, type as StreakType, true);

    return {
      type: streak.type,
      currentCount: streak.currentCount,
      longestCount: streak.longestCount,
      lastActivityAt: streak.lastActivityAt,
      isFrozen: streak.frozen,
      frozenUntil: streak.frozenUntil,
      multiplier: streak.multiplier,
    };
  }

  // ==================== EVOLUTION ====================

  async checkEvolution(userId: number): Promise<IEvolutionResult> {
    const state = await this.repository.getState(userId);
    const daysActive = state?.totalDaysActive || 0;

    return this.evolutionService.checkEvolution(String(userId), daysActive);
  }

  async getSonyaGreeting(userId: number): Promise<string> {
    return this.evolutionService.getSonyaGreeting(String(userId));
  }

  async getSonyaEmoji(userId: number): Promise<string> {
    return this.evolutionService.getSonyaEmoji(String(userId));
  }

  async getEvolutionStatus(userId: number): Promise<string> {
    return this.evolutionService.getEvolutionStatus(String(userId));
  }

  // ==================== SESSION TRACKING ====================

  async startSession(userId: number): Promise<{ sessionId: number }> {
    const session = await this.repository.startSession(userId);

    this.emit('session:started', { userId, sessionId: session.id });

    return { sessionId: session.id! };
  }

  async endSession(userId: number, breaksTaken?: number): Promise<void> {
    const current = await this.repository.getCurrentSession(userId);

    if (current?.id) {
      await this.repository.endSession(current.id, breaksTaken);
      this.emit('session:ended', { userId, sessionId: current.id });
    }
  }

  async getTodaySessionDuration(userId: number): Promise<number> {
    const summary = await this.repository.getDailySummary(
      userId,
      new Date().toISOString().split('T')[0]
    );

    return summary?.totalMinutes || 0;
  }

  // ==================== SETTINGS ====================

  async getSettings(userId: number): Promise<{
    compassionEnabled: boolean;
    softResetEnabled: boolean;
    softLimitMinutes: number;
    dailyLimitMinutes: number;
  }> {
    const settings = await this.repository.getSettings(userId);
    const defaults = this.repository.getDefaultSettings();

    return {
      compassionEnabled: settings?.compassionEnabled ?? defaults.compassionEnabled,
      softResetEnabled: settings?.softResetEnabled ?? defaults.softResetEnabled,
      softLimitMinutes: settings?.softLimitMinutes ?? defaults.softLimitMinutes,
      dailyLimitMinutes: settings?.dailyLimitMinutes ?? defaults.dailyLimitMinutes,
    };
  }

  async updateSettings(
    userId: number,
    settings: Partial<{
      compassionEnabled: boolean;
      softResetEnabled: boolean;
      softLimitMinutes: number;
      dailyLimitMinutes: number;
    }>
  ): Promise<void> {
    await this.repository.saveSettings({
      userId,
      ...settings,
    });
  }

  // ==================== EVENTS ====================

  on(event: GamificationEventType, listener: (data: unknown) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: GamificationEventType, listener: (data: unknown) => void): void {
    this.eventEmitter.off(event, listener);
  }

  private emit(event: GamificationEventType, data: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  // ==================== GDPR ====================

  async exportUserData(userId: number): Promise<{
    profile: IPlayerProfile;
    xpTransactions: unknown[];
    quests: unknown[];
    achievements: unknown[];
    streaks: unknown[];
    inventory: unknown[];
  }> {
    const exported = await this.repository.exportUserData(userId);
    const profile = await this.getPlayerProfile(userId);

    return {
      profile,
      xpTransactions: exported.xpTransactions,
      quests: exported.quests,
      achievements: exported.achievements,
      streaks: exported.streaks,
      inventory: exported.inventory,
    };
  }

  async deleteUserData(userId: number): Promise<boolean> {
    // Clear in-memory services
    this.questService.clearUserData(String(userId));
    this.badgeService.clearUserData(String(userId));
    this.evolutionService.clearUserData(String(userId));

    // Delete from repository
    return this.repository.deleteUserData(userId);
  }

  async anonymizeUserData(userId: number): Promise<boolean> {
    return this.repository.anonymizeUserData(userId);
  }
}
