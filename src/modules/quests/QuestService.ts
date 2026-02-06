/**
 * QuestService - Gamification Quest System for Sleep Improvement
 * ==============================================================
 *
 * Manages quests, progress tracking, and rewards for sleep health goals.
 * Based on research: 40-60% higher DAU with streak+milestone combinations.
 *
 * Research basis:
 * - Self-Determination Theory: autonomy, competence, relatedness
 * - Duolingo: 7-day streak = 2.3x daily engagement
 * - Gamification increases user engagement by satisfying psychological needs
 * - Variable rewards boost engagement (Frontiers in Sleep 2025)
 *
 * @packageDocumentation
 * @module @sleepcore/modules/quests
 */

/**
 * Quest category types
 */
export type QuestCategory = 'sleep' | 'diary' | 'mindfulness' | 'digital_detox' | 'routine';

/**
 * Quest difficulty levels
 */
export type QuestDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Quest progress type
 */
export type QuestProgressType = 'streak' | 'cumulative' | 'improvement';

/**
 * Quest status
 */
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

/**
 * Quest definition
 */
export interface IQuest {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  durationDays: number;
  progressType: QuestProgressType;
  targetMetric: string;
  targetValue: number;
  reward: IQuestReward;
}

/**
 * Quest reward
 */
export interface IQuestReward {
  xp: number;
  badge?: string;
  unlocks?: string[];
}

/**
 * Active quest instance for a user
 */
export interface IActiveQuest {
  id: string;
  userId: string;
  questId: string;
  startedAt: Date;
  expiresAt: Date;
  progress: IQuestProgress;
  status: QuestStatus;
  completedAt?: Date;
}

/**
 * Quest progress tracking
 */
export interface IQuestProgress {
  currentValue: number;
  targetValue: number;
  consecutiveDays: number;
  lastUpdateDate: string;
  history: IProgressEntry[];
}

/**
 * Progress history entry
 */
export interface IProgressEntry {
  date: string;
  value: number;
  cumulative: number;
}

/**
 * Quest completion result
 */
export interface IQuestCompletionResult {
  completed: boolean;
  quest: IQuest;
  reward?: IQuestReward;
  celebrationMessage?: string;
}

/**
 * Default quests based on research
 * Aligned with sleep hygiene, habit formation, and gamification best practices
 */
const DEFAULT_QUESTS: IQuest[] = [
  // === EASY QUESTS (Entry point) ===
  {
    id: 'diary_streak_7',
    title: 'Дневник на неделю',
    description: 'Веди дневник сна 7 дней подряд',
    icon: '📔',
    category: 'diary',
    difficulty: 'easy',
    durationDays: 7,
    progressType: 'streak',
    targetMetric: 'diary_entries',
    targetValue: 7,
    reward: { xp: 75, badge: 'diary_starter' },
  },
  {
    id: 'digital_detox_3d',
    title: 'Цифровой детокс',
    description: 'Не используй телефон за час до сна 3 дня подряд',
    icon: '📵',
    category: 'digital_detox',
    difficulty: 'easy',
    durationDays: 5,
    progressType: 'streak',
    targetMetric: 'no_phone_before_bed',
    targetValue: 3,
    reward: { xp: 50, badge: 'digital_detox_beginner' },
  },
  {
    id: 'voice_diary_5',
    title: 'Голосовой дневник',
    description: 'Запиши 5 голосовых записей в дневник',
    icon: '🎤',
    category: 'diary',
    difficulty: 'easy',
    durationDays: 10,
    progressType: 'cumulative',
    targetMetric: 'voice_entries',
    targetValue: 5,
    reward: { xp: 60, badge: 'voice_journaler' },
  },

  // === MEDIUM QUESTS ===
  {
    id: 'sleep_7h_5d',
    title: '7 часов сна',
    description: 'Спи минимум 7 часов каждую ночь в течение 5 дней',
    icon: '😴',
    category: 'sleep',
    difficulty: 'medium',
    durationDays: 7,
    progressType: 'streak',
    targetMetric: 'sleep_hours_7',
    targetValue: 5,
    reward: { xp: 100, badge: 'consistent_sleeper' },
  },
  {
    id: 'bedtime_routine_5d',
    title: 'Режим засыпания',
    description: 'Ложись спать в одно время (±30 мин) 5 дней подряд',
    icon: '🕐',
    category: 'routine',
    difficulty: 'medium',
    durationDays: 7,
    progressType: 'streak',
    targetMetric: 'consistent_bedtime',
    targetValue: 5,
    reward: { xp: 80, badge: 'routine_builder' },
  },
  {
    id: 'mindful_10_sessions',
    title: 'Путь осознанности',
    description: 'Выполни 10 сессий релаксации',
    icon: '🧘',
    category: 'mindfulness',
    difficulty: 'medium',
    durationDays: 14,
    progressType: 'cumulative',
    targetMetric: 'relax_sessions',
    targetValue: 10,
    reward: { xp: 120, badge: 'mindful_explorer' },
  },
  {
    id: 'emotion_tracking_14d',
    title: 'Эмоциональный трекер',
    description: 'Отслеживай своё настроение 14 дней',
    icon: '💭',
    category: 'diary',
    difficulty: 'medium',
    durationDays: 21,
    progressType: 'cumulative',
    targetMetric: 'emotion_logs',
    targetValue: 14,
    reward: { xp: 100, badge: 'emotion_aware' },
  },

  // === HARD QUESTS ===
  {
    id: 'sleep_quality_improve',
    title: 'Улучшение качества',
    description: 'Улучши качество сна на 1 балл за 2 недели',
    icon: '⭐',
    category: 'sleep',
    difficulty: 'hard',
    durationDays: 14,
    progressType: 'improvement',
    targetMetric: 'sleep_quality_delta',
    targetValue: 1,
    reward: { xp: 150, badge: 'sleep_improver' },
  },
  {
    id: 'weekend_warrior',
    title: 'Выходной режим',
    description: 'Сохрани режим сна в выходные (4 выходных подряд)',
    icon: '🏆',
    category: 'routine',
    difficulty: 'hard',
    durationDays: 14,
    progressType: 'cumulative',
    targetMetric: 'weekend_routine_kept',
    targetValue: 4,
    reward: { xp: 130, badge: 'weekend_warrior' },
  },
  {
    id: 'breathing_master',
    title: 'Мастер дыхания',
    description: 'Выполни 20 дыхательных упражнений',
    icon: '🌬️',
    category: 'mindfulness',
    difficulty: 'hard',
    durationDays: 30,
    progressType: 'cumulative',
    targetMetric: 'breathing_sessions',
    targetValue: 20,
    reward: { xp: 200, badge: 'breathing_master', unlocks: ['advanced_breathing'] },
  },
];

/**
 * QuestService - Manages quests and progress for users
 */
export class QuestService {
  private quests: Map<string, IQuest> = new Map();
  private activeQuests: Map<string, IActiveQuest[]> = new Map();
  private completedQuests: Map<string, string[]> = new Map();
  private readonly maxActiveQuests = 3;

  constructor(customQuests?: IQuest[]) {
    // Load default quests
    for (const quest of DEFAULT_QUESTS) {
      this.quests.set(quest.id, quest);
    }

    // Add custom quests
    if (customQuests) {
      for (const quest of customQuests) {
        this.quests.set(quest.id, quest);
      }
    }
  }

  /**
   * Get all available quests for a user
   */
  getAvailableQuests(userId: string): IQuest[] {
    const active = this.getActiveQuestIds(userId);
    const completed = this.completedQuests.get(userId) || [];

    return Array.from(this.quests.values())
      .filter((quest) => !active.includes(quest.id))
      .filter((quest) => !completed.includes(quest.id))
      .slice(0, 5); // Show max 5 available
  }

  /**
   * Get active quests for a user
   */
  getActiveQuests(userId: string): IActiveQuest[] {
    return this.activeQuests.get(userId) || [];
  }

  /**
   * Get active quest IDs for a user
   */
  private getActiveQuestIds(userId: string): string[] {
    return this.getActiveQuests(userId).map((q) => q.questId);
  }

  /**
   * Start a quest for a user
   */
  startQuest(userId: string, questId: string): IActiveQuest | null {
    const quest = this.quests.get(questId);
    if (!quest) {
      return null;
    }

    const userActive = this.getActiveQuests(userId);

    // Check if already active
    if (userActive.some((q) => q.questId === questId)) {
      return null;
    }

    // Check max active quests
    if (userActive.length >= this.maxActiveQuests) {
      return null;
    }

    // Check if already completed
    const completed = this.completedQuests.get(userId) || [];
    if (completed.includes(questId)) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + quest.durationDays);

    const activeQuest: IActiveQuest = {
      id: `${userId}_${questId}_${Date.now()}`,
      userId,
      questId,
      startedAt: now,
      expiresAt,
      status: 'active',
      progress: {
        currentValue: 0,
        targetValue: quest.targetValue,
        consecutiveDays: 0,
        lastUpdateDate: '',
        history: [],
      },
    };

    if (!this.activeQuests.has(userId)) {
      this.activeQuests.set(userId, []);
    }
    this.activeQuests.get(userId)!.push(activeQuest);

    return activeQuest;
  }

  /**
   * Abandon an active quest
   *
   * Sets the quest status to 'failed' and removes it from active quests.
   * Does NOT add to completed list (can be restarted later).
   *
   * @param userId - User ID
   * @param questId - Quest ID to abandon
   * @returns true if quest was found and abandoned, false otherwise
   */
  abandonQuest(userId: string, questId: string): boolean {
    const userActive = this.activeQuests.get(userId);
    if (!userActive) {
      return false;
    }

    const questIndex = userActive.findIndex((q) => q.questId === questId && q.status === 'active');
    if (questIndex === -1) {
      return false;
    }

    // Mark as failed and remove from active
    userActive[questIndex].status = 'failed';
    userActive.splice(questIndex, 1);

    return true;
  }

  /**
   * Update progress for a metric
   * Returns completed quests if any
   */
  updateProgress(
    userId: string,
    metric: string,
    value: number = 1
  ): IQuestCompletionResult[] {
    const userActive = this.getActiveQuests(userId);
    const completedResults: IQuestCompletionResult[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const activeQuest of userActive) {
      const quest = this.quests.get(activeQuest.questId);
      if (!quest || quest.targetMetric !== metric) continue;
      if (activeQuest.status !== 'active') continue;

      // Check expiration
      if (new Date() > activeQuest.expiresAt) {
        activeQuest.status = 'expired';
        continue;
      }

      // Update progress based on type
      this.updateQuestProgress(activeQuest, quest, value, today);

      // Check completion
      if (this.isQuestCompleted(activeQuest, quest)) {
        activeQuest.status = 'completed';
        activeQuest.completedAt = new Date();

        // Add to completed list
        if (!this.completedQuests.has(userId)) {
          this.completedQuests.set(userId, []);
        }
        this.completedQuests.get(userId)!.push(quest.id);

        completedResults.push({
          completed: true,
          quest,
          reward: quest.reward,
          celebrationMessage: this.getCelebrationMessage(quest),
        });
      }
    }

    // Remove completed/expired from active
    this.cleanupUserQuests(userId);

    return completedResults;
  }

  /**
   * Update progress for a specific quest
   */
  private updateQuestProgress(
    activeQuest: IActiveQuest,
    quest: IQuest,
    value: number,
    today: string
  ): void {
    const progress = activeQuest.progress;

    switch (quest.progressType) {
      case 'streak': {
        // Check if consecutive day
        if (progress.lastUpdateDate === today) {
          // Already updated today
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (progress.lastUpdateDate === yesterdayStr || progress.lastUpdateDate === '') {
          // Consecutive!
          progress.consecutiveDays++;
          progress.currentValue = progress.consecutiveDays;
        } else {
          // Streak broken, restart
          progress.consecutiveDays = 1;
          progress.currentValue = 1;
        }

        progress.lastUpdateDate = today;
        break;
      }

      case 'cumulative':
        progress.currentValue += value;
        progress.lastUpdateDate = today;
        break;

      case 'improvement':
        // For improvement type, value represents the delta
        progress.currentValue = value;
        progress.lastUpdateDate = today;
        break;
    }

    // Add to history
    progress.history.push({
      date: today,
      value,
      cumulative: progress.currentValue,
    });
  }

  /**
   * Check if quest is completed
   */
  private isQuestCompleted(activeQuest: IActiveQuest, quest: IQuest): boolean {
    return activeQuest.progress.currentValue >= quest.targetValue;
  }

  /**
   * Get celebration message for completed quest
   */
  private getCelebrationMessage(quest: IQuest): string {
    const messages: Record<QuestDifficulty, string[]> = {
      easy: [
        `🎉 Отлично! Ты завершил квест "${quest.title}"!`,
        `✨ Молодец! Квест "${quest.title}" выполнен!`,
      ],
      medium: [
        `🏆 Впечатляюще! Квест "${quest.title}" завершён!`,
        `💪 Отличная работа! "${quest.title}" — готово!`,
      ],
      hard: [
        `🌟 Невероятно! Ты справился с "${quest.title}"!`,
        `🎊 Мастер! Сложный квест "${quest.title}" покорён!`,
      ],
    };

    const options = messages[quest.difficulty];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Remove completed/expired quests from active list
   */
  private cleanupUserQuests(userId: string): void {
    const userActive = this.activeQuests.get(userId);
    if (!userActive) return;

    const active = userActive.filter(
      (q) => q.status === 'active' && new Date() <= q.expiresAt
    );
    this.activeQuests.set(userId, active);
  }

  /**
   * Get quest by ID
   */
  getQuest(questId: string): IQuest | undefined {
    return this.quests.get(questId);
  }

  /**
   * Check and update quest progress for a specific metric
   * Alias for updateProgress with clearer naming
   * @param userId - User ID
   * @param metric - Metric to update (e.g., 'voice_diary', 'diary_entry')
   * @param value - Amount to add
   */
  async checkQuestProgress(
    userId: string,
    metric: string,
    value: number = 1
  ): Promise<IQuestCompletionResult[]> {
    return this.updateProgress(userId, metric, value);
  }

  /**
   * Get all quests
   */
  getAllQuests(): IQuest[] {
    return Array.from(this.quests.values());
  }

  /**
   * Get completed quest IDs for a user
   */
  getCompletedQuestIds(userId: string): string[] {
    return this.completedQuests.get(userId) || [];
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(activeQuest: IActiveQuest): number {
    const { currentValue, targetValue } = activeQuest.progress;
    return Math.min(100, Math.round((currentValue / targetValue) * 100));
  }

  /**
   * Get days remaining for a quest
   */
  getDaysRemaining(activeQuest: IActiveQuest): number {
    const now = new Date();
    const expires = new Date(activeQuest.expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  }

  /**
   * Format quest message for display
   */
  formatQuestMessage(quest: IQuest, activeQuest?: IActiveQuest): string {
    const difficultyEmoji: Record<QuestDifficulty, string> = {
      easy: '🟢',
      medium: '🟡',
      hard: '🔴',
    };

    let message = `${quest.icon} *${quest.title}*\n`;
    message += `${quest.description}\n\n`;
    message += `${difficultyEmoji[quest.difficulty]} Сложность: ${this.translateDifficulty(quest.difficulty)}\n`;
    message += `⏱ Длительность: ${quest.durationDays} дней\n`;
    message += `💎 Награда: ${quest.reward.xp} XP`;

    if (quest.reward.badge) {
      message += ` + 🏅`;
    }

    if (activeQuest) {
      const progress = this.getProgressPercentage(activeQuest);
      const remaining = this.getDaysRemaining(activeQuest);
      message += `\n\n📊 Прогресс: ${progress}%`;
      message += `\n⏳ Осталось: ${remaining} дней`;
    }

    return message;
  }

  /**
   * Translate difficulty to Russian
   */
  private translateDifficulty(difficulty: QuestDifficulty): string {
    const translations: Record<QuestDifficulty, string> = {
      easy: 'Легко',
      medium: 'Средне',
      hard: 'Сложно',
    };
    return translations[difficulty];
  }

  /**
   * Clear user data (GDPR)
   */
  clearUserData(userId: string): void {
    this.activeQuests.delete(userId);
    this.completedQuests.delete(userId);
  }

  /**
   * Export user data (GDPR)
   */
  exportUserData(userId: string): {
    activeQuests: IActiveQuest[];
    completedQuestIds: string[];
  } {
    return {
      activeQuests: this.getActiveQuests(userId),
      completedQuestIds: this.getCompletedQuestIds(userId),
    };
  }
}

// Singleton instance
export const questService = new QuestService();

// Export default quests for testing
export { DEFAULT_QUESTS };
