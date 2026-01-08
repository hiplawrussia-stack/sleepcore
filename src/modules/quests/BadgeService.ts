/**
 * BadgeService - Achievement Badge System for Sleep Health App
 * ============================================================
 *
 * Manages badges, achievements, and visual rewards for user motivation.
 * Based on research: 83% employees feel more motivated with gamified elements.
 *
 * Psychological foundations:
 * - Recognition & Validation: Visible markers of achievement
 * - Dopamine Response: Small, frequent boosts create return motivation
 * - Social Proof (Cialdini): Others' badges create desire to achieve
 * - Goal Gradient Effect: Commitment increases near completion
 * - Collector Instinct: Natural completion desire ("catch 'em all")
 *
 * @packageDocumentation
 * @module @sleepcore/modules/quests
 */

/**
 * Badge category types
 */
export type BadgeCategory =
  | 'achievement'    // Task completion
  | 'streak'         // Consistency
  | 'milestone'      // Progress markers
  | 'evolution'      // Sonya stage unlocks
  | 'special';       // Hidden/surprise badges

/**
 * Badge rarity levels
 */
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Badge definition
 */
export interface IBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteria: IBadgeCriteria;
  reward?: IBadgeReward;
  hidden?: boolean; // For surprise badges
}

/**
 * Badge earning criteria
 */
export interface IBadgeCriteria {
  type: 'quest' | 'streak' | 'count' | 'first' | 'special';
  metric?: string;
  value?: number;
  questId?: string;
}

/**
 * Badge reward
 */
export interface IBadgeReward {
  xp: number;
  unlocks?: string[];
  title?: string; // User title/flair
}

/**
 * User badge instance
 */
export interface IUserBadge {
  badgeId: string;
  userId: string;
  earnedAt: Date;
  displayOrder: number;
  isNew: boolean;
}

/**
 * Badge award result
 */
export interface IBadgeAwardResult {
  awarded: boolean;
  badge?: IBadge;
  userBadge?: IUserBadge;
  message?: string;
  isFirstTime: boolean;
}

/**
 * Default badges based on research
 * Aligned with badge psychology: achievement, streak, milestone, evolution, special
 */
const DEFAULT_BADGES: IBadge[] = [
  // === ACHIEVEMENT BADGES (Quest completion) ===
  {
    id: 'diary_starter',
    name: 'Начинающий писатель',
    description: 'Вёл дневник сна 7 дней подряд',
    icon: '📝',
    category: 'achievement',
    rarity: 'common',
    criteria: { type: 'quest', questId: 'diary_streak_7' },
    reward: { xp: 25 },
  },
  {
    id: 'digital_detox_beginner',
    name: 'Цифровая гигиена',
    description: 'Прошёл первый цифровой детокс',
    icon: '📵',
    category: 'achievement',
    rarity: 'common',
    criteria: { type: 'quest', questId: 'digital_detox_3d' },
    reward: { xp: 20 },
  },
  {
    id: 'voice_journaler',
    name: 'Голос сердца',
    description: 'Записал 5 голосовых дневников',
    icon: '🎤',
    category: 'achievement',
    rarity: 'common',
    criteria: { type: 'quest', questId: 'voice_diary_5' },
    reward: { xp: 25 },
  },
  {
    id: 'consistent_sleeper',
    name: 'Крепкий сон',
    description: 'Спал 7+ часов 5 ночей подряд',
    icon: '😴',
    category: 'achievement',
    rarity: 'rare',
    criteria: { type: 'quest', questId: 'sleep_7h_5d' },
    reward: { xp: 40 },
  },
  {
    id: 'routine_builder',
    name: 'Режим дня',
    description: 'Установил стабильный режим засыпания',
    icon: '🕐',
    category: 'achievement',
    rarity: 'rare',
    criteria: { type: 'quest', questId: 'bedtime_routine_5d' },
    reward: { xp: 35 },
  },
  {
    id: 'mindful_explorer',
    name: 'Путь осознанности',
    description: 'Прошёл 10 сессий релаксации',
    icon: '🧘',
    category: 'achievement',
    rarity: 'rare',
    criteria: { type: 'quest', questId: 'mindful_10_sessions' },
    reward: { xp: 50 },
  },
  {
    id: 'emotion_aware',
    name: 'Эмоциональный интеллект',
    description: 'Отслеживал настроение 14 дней',
    icon: '💭',
    category: 'achievement',
    rarity: 'rare',
    criteria: { type: 'quest', questId: 'emotion_tracking_14d' },
    reward: { xp: 40 },
  },
  {
    id: 'sleep_improver',
    name: 'Мастер сна',
    description: 'Улучшил качество сна',
    icon: '⭐',
    category: 'achievement',
    rarity: 'epic',
    criteria: { type: 'quest', questId: 'sleep_quality_improve' },
    reward: { xp: 75, title: 'Мастер сна' },
  },
  {
    id: 'weekend_warrior',
    name: 'Выходной герой',
    description: 'Сохранил режим в выходные',
    icon: '🏆',
    category: 'achievement',
    rarity: 'epic',
    criteria: { type: 'quest', questId: 'weekend_warrior' },
    reward: { xp: 60 },
  },
  {
    id: 'breathing_master',
    name: 'Мастер дыхания',
    description: 'Выполнил 20 дыхательных упражнений',
    icon: '🌬️',
    category: 'achievement',
    rarity: 'epic',
    criteria: { type: 'quest', questId: 'breathing_master' },
    reward: { xp: 100, unlocks: ['advanced_breathing'], title: 'Мастер дыхания' },
  },

  // === STREAK BADGES (Consistency - Loss aversion psychology) ===
  {
    id: 'streak_7',
    name: 'Первая неделя',
    description: '7 дней подряд с Соней',
    icon: '🔥',
    category: 'streak',
    rarity: 'common',
    criteria: { type: 'streak', metric: 'daily_check_in', value: 7 },
    reward: { xp: 30 },
  },
  {
    id: 'streak_21',
    name: 'Привычка',
    description: '21 день — привычка сформирована!',
    icon: '🌟',
    category: 'streak',
    rarity: 'rare',
    criteria: { type: 'streak', metric: 'daily_check_in', value: 21 },
    reward: { xp: 75, title: 'Постоянный' },
  },
  {
    id: 'streak_30',
    name: 'Месяц с Соней',
    description: '30 дней без перерыва',
    icon: '💫',
    category: 'streak',
    rarity: 'epic',
    criteria: { type: 'streak', metric: 'daily_check_in', value: 30 },
    reward: { xp: 100 },
  },
  {
    id: 'streak_66',
    name: 'Новый образ жизни',
    description: '66 дней — научно доказанный срок формирования привычки',
    icon: '🏅',
    category: 'streak',
    rarity: 'legendary',
    criteria: { type: 'streak', metric: 'daily_check_in', value: 66 },
    reward: { xp: 250, title: 'Легенда' },
  },

  // === MILESTONE BADGES (Progress markers - Goal gradient effect) ===
  {
    id: 'first_diary',
    name: 'Первая запись',
    description: 'Создал первую запись в дневнике',
    icon: '📔',
    category: 'milestone',
    rarity: 'common',
    criteria: { type: 'first', metric: 'diary_entry' },
    reward: { xp: 10 },
  },
  {
    id: 'first_voice',
    name: 'Первый голос',
    description: 'Записал первое голосовое сообщение',
    icon: '🎙️',
    category: 'milestone',
    rarity: 'common',
    criteria: { type: 'first', metric: 'voice_entry' },
    reward: { xp: 15 },
  },
  {
    id: 'first_quest',
    name: 'Первый квест',
    description: 'Завершил первый квест',
    icon: '🎯',
    category: 'milestone',
    rarity: 'common',
    criteria: { type: 'first', metric: 'quest_complete' },
    reward: { xp: 20 },
  },
  {
    id: 'first_relax',
    name: 'Момент покоя',
    description: 'Провёл первую сессию релаксации',
    icon: '🌿',
    category: 'milestone',
    rarity: 'common',
    criteria: { type: 'first', metric: 'relax_session' },
    reward: { xp: 10 },
  },
  {
    id: 'quests_5',
    name: 'Искатель',
    description: 'Завершил 5 квестов',
    icon: '🗺️',
    category: 'milestone',
    rarity: 'rare',
    criteria: { type: 'count', metric: 'quests_completed', value: 5 },
    reward: { xp: 50, title: 'Искатель' },
  },
  {
    id: 'quests_10',
    name: 'Путешественник',
    description: 'Завершил 10 квестов',
    icon: '🧭',
    category: 'milestone',
    rarity: 'epic',
    criteria: { type: 'count', metric: 'quests_completed', value: 10 },
    reward: { xp: 100, title: 'Путешественник' },
  },
  {
    id: 'diary_50',
    name: 'Летописец',
    description: 'Создал 50 записей в дневнике',
    icon: '📚',
    category: 'milestone',
    rarity: 'epic',
    criteria: { type: 'count', metric: 'diary_entries', value: 50 },
    reward: { xp: 100 },
  },

  // === EVOLUTION BADGES (Sonya stages) ===
  {
    id: 'sonya_awakened',
    name: 'Пробуждение Сони',
    description: 'Соня начала просыпаться',
    icon: '🌅',
    category: 'evolution',
    rarity: 'rare',
    criteria: { type: 'special', metric: 'sonya_stage', value: 1 },
    reward: { xp: 50 },
  },
  {
    id: 'sonya_growing',
    name: 'Рост Сони',
    description: 'Соня развивается вместе с тобой',
    icon: '🌱',
    category: 'evolution',
    rarity: 'epic',
    criteria: { type: 'special', metric: 'sonya_stage', value: 2 },
    reward: { xp: 100, unlocks: ['sonya_advanced'] },
  },
  {
    id: 'sonya_master',
    name: 'Мастер и Соня',
    description: 'Максимальная связь с Соней',
    icon: '🦉',
    category: 'evolution',
    rarity: 'legendary',
    criteria: { type: 'special', metric: 'sonya_stage', value: 3 },
    reward: { xp: 200, title: 'Друг Сони', unlocks: ['sonya_secret'] },
  },

  // === SPECIAL BADGES (Hidden/Surprise - Dopamine spikes) ===
  {
    id: 'night_owl',
    name: 'Ночная сова',
    description: 'Использовал бота после полуночи',
    icon: '🦉',
    category: 'special',
    rarity: 'common',
    criteria: { type: 'special', metric: 'late_night_use' },
    hidden: true,
    reward: { xp: 15 },
  },
  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Сделал запись до 6 утра',
    icon: '🐦',
    category: 'special',
    rarity: 'common',
    criteria: { type: 'special', metric: 'early_morning_use' },
    hidden: true,
    reward: { xp: 15 },
  },
  {
    id: 'comeback',
    name: 'Возвращение',
    description: 'Вернулся после долгого перерыва',
    icon: '🔄',
    category: 'special',
    rarity: 'rare',
    criteria: { type: 'special', metric: 'comeback_after_break' },
    hidden: true,
    reward: { xp: 30 },
  },
  {
    id: 'helper',
    name: 'Помощник',
    description: 'Поделился ботом с другом',
    icon: '🤝',
    category: 'special',
    rarity: 'rare',
    criteria: { type: 'special', metric: 'referral' },
    hidden: true,
    reward: { xp: 50 },
  },
  {
    id: 'perfectionist',
    name: 'Перфекционист',
    description: 'Заполнил все поля дневника за день',
    icon: '✨',
    category: 'special',
    rarity: 'rare',
    criteria: { type: 'special', metric: 'complete_diary_entry' },
    hidden: true,
    reward: { xp: 25 },
  },
];

/**
 * BadgeService - Manages badges and achievements for users
 */
export class BadgeService {
  private badges: Map<string, IBadge> = new Map();
  private userBadges: Map<string, IUserBadge[]> = new Map();
  private userMetrics: Map<string, Map<string, number>> = new Map();
  private userStreaks: Map<string, Map<string, number>> = new Map();

  constructor(customBadges?: IBadge[]) {
    // Load default badges
    for (const badge of DEFAULT_BADGES) {
      this.badges.set(badge.id, badge);
    }

    // Add custom badges
    if (customBadges) {
      for (const badge of customBadges) {
        this.badges.set(badge.id, badge);
      }
    }
  }

  /**
   * Award a badge to a user
   */
  awardBadge(userId: string, badgeId: string): IBadgeAwardResult {
    const badge = this.badges.get(badgeId);
    if (!badge) {
      return { awarded: false, isFirstTime: false };
    }

    // Check if already has badge
    const userBadgeList = this.userBadges.get(userId) || [];
    if (userBadgeList.some((ub) => ub.badgeId === badgeId)) {
      return { awarded: false, isFirstTime: false, message: 'Badge already earned' };
    }

    // Create user badge
    const userBadge: IUserBadge = {
      badgeId,
      userId,
      earnedAt: new Date(),
      displayOrder: userBadgeList.length,
      isNew: true,
    };

    if (!this.userBadges.has(userId)) {
      this.userBadges.set(userId, []);
    }
    this.userBadges.get(userId)!.push(userBadge);

    return {
      awarded: true,
      badge,
      userBadge,
      message: this.getAwardMessage(badge),
      isFirstTime: true,
    };
  }

  /**
   * Check and award badge for a specific event
   * Simplified alias for checkAndAwardBadges
   * @param userId - User ID
   * @param event - Event that triggered the check (e.g., 'voice_diary')
   */
  checkAndAward(userId: string, event: string): IBadgeAwardResult[] {
    return this.checkAndAwardBadges(userId, event, 1);
  }

  /**
   * Check and award badges based on event
   * Returns all newly awarded badges
   */
  checkAndAwardBadges(
    userId: string,
    event: string,
    value: number = 1
  ): IBadgeAwardResult[] {
    const results: IBadgeAwardResult[] = [];

    // Update user metrics
    this.updateMetric(userId, event, value);

    // Check all badges
    for (const badge of this.badges.values()) {
      if (this.hasBadge(userId, badge.id)) continue;
      if (badge.hidden && event !== badge.criteria.metric) continue;

      if (this.checkBadgeCriteria(userId, badge)) {
        const result = this.awardBadge(userId, badge.id);
        if (result.awarded) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Update a metric for a user
   */
  updateMetric(userId: string, metric: string, value: number = 1): void {
    if (!this.userMetrics.has(userId)) {
      this.userMetrics.set(userId, new Map());
    }

    const metrics = this.userMetrics.get(userId)!;
    const current = metrics.get(metric) || 0;
    metrics.set(metric, current + value);
  }

  /**
   * Update streak for a user
   */
  updateStreak(userId: string, metric: string, newStreak: number): void {
    if (!this.userStreaks.has(userId)) {
      this.userStreaks.set(userId, new Map());
    }

    const streaks = this.userStreaks.get(userId)!;
    const current = streaks.get(metric) || 0;

    // Only update if new streak is higher
    if (newStreak > current) {
      streaks.set(metric, newStreak);
    }
  }

  /**
   * Check if badge criteria is met
   */
  private checkBadgeCriteria(userId: string, badge: IBadge): boolean {
    const criteria = badge.criteria;
    const metrics = this.userMetrics.get(userId);
    const streaks = this.userStreaks.get(userId);

    switch (criteria.type) {
      case 'quest':
        // Quest completion badges are awarded via awardBadge directly
        return false;

      case 'streak': {
        if (!streaks || !criteria.metric || criteria.value === undefined) return false;
        const streak = streaks.get(criteria.metric) || 0;
        return streak >= criteria.value;
      }

      case 'count': {
        if (!metrics || !criteria.metric || criteria.value === undefined) return false;
        const count = metrics.get(criteria.metric) || 0;
        return count >= criteria.value;
      }

      case 'first': {
        if (!metrics || !criteria.metric) return false;
        const firstCount = metrics.get(criteria.metric) || 0;
        return firstCount >= 1;
      }

      case 'special': {
        if (!metrics || !criteria.metric) return false;
        const specialCount = metrics.get(criteria.metric) || 0;
        if (criteria.value !== undefined) {
          return specialCount >= criteria.value;
        }
        return specialCount >= 1;
      }

      default:
        return false;
    }
  }

  /**
   * Check if user has a badge
   */
  hasBadge(userId: string, badgeId: string): boolean {
    const userBadgeList = this.userBadges.get(userId) || [];
    return userBadgeList.some((ub) => ub.badgeId === badgeId);
  }

  /**
   * Get user's badges
   */
  getUserBadges(userId: string): IUserBadge[] {
    return this.userBadges.get(userId) || [];
  }

  /**
   * Get user's badges with full badge info
   */
  getUserBadgesWithInfo(userId: string): Array<{ badge: IBadge; userBadge: IUserBadge }> {
    const userBadgeList = this.getUserBadges(userId);
    return userBadgeList
      .map((ub) => {
        const badge = this.badges.get(ub.badgeId);
        if (!badge) return null;
        return { badge, userBadge: ub };
      })
      .filter((item): item is { badge: IBadge; userBadge: IUserBadge } => item !== null);
  }

  /**
   * Get badge by ID
   */
  getBadge(badgeId: string): IBadge | undefined {
    return this.badges.get(badgeId);
  }

  /**
   * Get all badges (excluding hidden)
   */
  getAllVisibleBadges(): IBadge[] {
    return Array.from(this.badges.values()).filter((b) => !b.hidden);
  }

  /**
   * Get all badges including hidden
   */
  getAllBadges(): IBadge[] {
    return Array.from(this.badges.values());
  }

  /**
   * Get badges by category
   */
  getBadgesByCategory(category: BadgeCategory): IBadge[] {
    return Array.from(this.badges.values()).filter((b) => b.category === category);
  }

  /**
   * Get user progress toward badges
   */
  getUserProgress(userId: string): Array<{
    badge: IBadge;
    progress: number;
    target: number;
    percentage: number;
    earned: boolean;
  }> {
    const metrics = this.userMetrics.get(userId) || new Map();
    const streaks = this.userStreaks.get(userId) || new Map();
    const results: Array<{
      badge: IBadge;
      progress: number;
      target: number;
      percentage: number;
      earned: boolean;
    }> = [];

    for (const badge of this.getAllVisibleBadges()) {
      const earned = this.hasBadge(userId, badge.id);
      let progress = 0;
      let target = 1;

      switch (badge.criteria.type) {
        case 'streak':
          if (badge.criteria.metric && badge.criteria.value) {
            progress = streaks.get(badge.criteria.metric) || 0;
            target = badge.criteria.value;
          }
          break;

        case 'count':
        case 'first':
          if (badge.criteria.metric) {
            progress = metrics.get(badge.criteria.metric) || 0;
            target = badge.criteria.value || 1;
          }
          break;

        case 'special':
          if (badge.criteria.metric) {
            progress = metrics.get(badge.criteria.metric) || 0;
            target = badge.criteria.value || 1;
          }
          break;

        case 'quest':
          // Quest badges show 0 or 100% based on earned status
          progress = earned ? 1 : 0;
          target = 1;
          break;
      }

      const percentage = Math.min(100, Math.round((progress / target) * 100));

      results.push({
        badge,
        progress,
        target,
        percentage,
        earned,
      });
    }

    return results;
  }

  /**
   * Calculate total XP from badges
   */
  getTotalBadgeXP(userId: string): number {
    const userBadgeList = this.getUserBadges(userId);
    return userBadgeList.reduce((total, ub) => {
      const badge = this.badges.get(ub.badgeId);
      return total + (badge?.reward?.xp || 0);
    }, 0);
  }

  /**
   * Mark badge as seen (not new)
   */
  markBadgeSeen(userId: string, badgeId: string): void {
    const userBadgeList = this.userBadges.get(userId);
    if (!userBadgeList) return;

    const badge = userBadgeList.find((ub) => ub.badgeId === badgeId);
    if (badge) {
      badge.isNew = false;
    }
  }

  /**
   * Get new (unseen) badges
   */
  getNewBadges(userId: string): IUserBadge[] {
    return this.getUserBadges(userId).filter((ub) => ub.isNew);
  }

  /**
   * Get award message for a badge
   */
  private getAwardMessage(badge: IBadge): string {
    const rarityMessages: Record<BadgeRarity, string[]> = {
      common: [
        `${badge.icon} Новый бейдж: *${badge.name}*!`,
        `${badge.icon} Ты получил: *${badge.name}*`,
      ],
      rare: [
        `${badge.icon} Редкий бейдж: *${badge.name}*!`,
        `${badge.icon} Поздравляем! *${badge.name}* — редкая награда!`,
      ],
      epic: [
        `${badge.icon} Эпический бейдж: *${badge.name}*!`,
        `${badge.icon} Эпический! Ты заслужил *${badge.name}*!`,
      ],
      legendary: [
        `${badge.icon} ЛЕГЕНДАРНЫЙ БЕЙДЖ: *${badge.name}*!`,
        `${badge.icon} Ты — легенда! *${badge.name}* теперь твой!`,
      ],
    };

    const options = rarityMessages[badge.rarity];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Format badge for display
   */
  formatBadgeMessage(badge: IBadge, earned: boolean = false): string {
    const rarityEmoji: Record<BadgeRarity, string> = {
      common: '⬜',
      rare: '🟦',
      epic: '🟪',
      legendary: '🟨',
    };

    const rarityName: Record<BadgeRarity, string> = {
      common: 'Обычный',
      rare: 'Редкий',
      epic: 'Эпический',
      legendary: 'Легендарный',
    };

    let message = `${badge.icon} *${badge.name}*`;
    if (earned) {
      message += ' ✓';
    }
    message += '\n';
    message += `${badge.description}\n`;
    message += `${rarityEmoji[badge.rarity]} ${rarityName[badge.rarity]}`;

    if (badge.reward) {
      message += ` • ${badge.reward.xp} XP`;
      if (badge.reward.title) {
        message += ` • Титул: "${badge.reward.title}"`;
      }
    }

    return message;
  }

  /**
   * Format badge collection for display
   */
  formatBadgeCollection(userId: string): string {
    const userBadgesWithInfo = this.getUserBadgesWithInfo(userId);
    const totalBadges = this.getAllVisibleBadges().length;

    if (userBadgesWithInfo.length === 0) {
      return `🏅 *Твои бейджи*\n\nПока нет бейджей. Начни выполнять квесты, чтобы получить награды!`;
    }

    let message = `🏅 *Твои бейджи* (${userBadgesWithInfo.length}/${totalBadges})\n\n`;

    // Group by category
    const byCategory = new Map<BadgeCategory, typeof userBadgesWithInfo>();
    for (const item of userBadgesWithInfo) {
      const category = item.badge.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(item);
    }

    const categoryNames: Record<BadgeCategory, string> = {
      achievement: '🎯 Достижения',
      streak: '🔥 Серии',
      milestone: '📍 Вехи',
      evolution: '🌱 Эволюция',
      special: '✨ Особые',
    };

    for (const [category, items] of byCategory) {
      message += `\n${categoryNames[category]}:\n`;
      for (const { badge, userBadge } of items) {
        const newMark = userBadge.isNew ? ' 🆕' : '';
        message += `${badge.icon} ${badge.name}${newMark}\n`;
      }
    }

    const totalXP = this.getTotalBadgeXP(userId);
    message += `\n💎 Всего XP от бейджей: ${totalXP}`;

    return message;
  }

  /**
   * Clear user data (GDPR)
   */
  clearUserData(userId: string): void {
    this.userBadges.delete(userId);
    this.userMetrics.delete(userId);
    this.userStreaks.delete(userId);
  }

  /**
   * Export user data (GDPR)
   */
  exportUserData(userId: string): {
    badges: IUserBadge[];
    metrics: Record<string, number>;
    streaks: Record<string, number>;
  } {
    const metrics: Record<string, number> = {};
    const streaks: Record<string, number> = {};

    const userMetrics = this.userMetrics.get(userId);
    if (userMetrics) {
      for (const [key, value] of userMetrics) {
        metrics[key] = value;
      }
    }

    const userStreaks = this.userStreaks.get(userId);
    if (userStreaks) {
      for (const [key, value] of userStreaks) {
        streaks[key] = value;
      }
    }

    return {
      badges: this.getUserBadges(userId),
      metrics,
      streaks,
    };
  }
}

// Singleton instance
export const badgeService = new BadgeService();

// Export default badges for testing
export { DEFAULT_BADGES };
