/**
 * StreakService - Forgiveness-First Streak Counter
 * =================================================
 *
 * Research-based streak implementation for mental health context:
 * - Grace period: 3 hours after midnight (for late-night users)
 * - Auto-freeze: 1 per week automatically granted
 * - No punishment messaging: "Продолжим!" instead of "Ты потерял streak!"
 * - Milestone celebrations at 3, 7, 14, 30, 66 days
 *
 * Evidence base:
 * - Duolingo: 7-day streak = 2.4x retention (600+ experiments)
 * - UCL Study: 66 days median for habit formation (not 21!)
 * - Frontiers 2025: Avoid anxiety-inducing streak mechanics in mental health
 * - Scientific American: Missing 1 day doesn't break habit formation
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services/StreakService
 */

/**
 * Streak milestone configuration
 * Based on habit formation research (Phillippa Lally 2009)
 */
export interface IStreakMilestone {
  days: number;
  badge: string;
  title: string;
  message: string;
  isHabitFormed?: boolean;
}

/**
 * Daily activity record
 */
export interface IDailyActivity {
  date: string; // YYYY-MM-DD format
  hasDiary: boolean;
  hasInteraction: boolean;
  timestamp: number;
}

/**
 * User streak data
 */
export interface IStreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  freezesAvailable: number;
  freezesUsedThisWeek: number;
  lastFreezeGrantDate: string | null;
  totalActiveDays: number;
  weeklyActivity: IDailyActivity[];
  milestoneReached: number[];
}

/**
 * Streak update result
 */
export interface IStreakUpdateResult {
  previousStreak: number;
  currentStreak: number;
  streakBroken: boolean;
  freezeUsed: boolean;
  newMilestone: IStreakMilestone | null;
  message: string;
}

/**
 * Streak configuration
 */
export interface IStreakConfig {
  gracePeriodHours: number;
  autoFreezeWeekly: number;
  maxFreezes: number;
  milestones: IStreakMilestone[];
  timezone: string;
}

/**
 * Default streak milestones
 * Based on habit formation phases research
 */
const DEFAULT_MILESTONES: IStreakMilestone[] = [
  {
    days: 3,
    badge: '🌱',
    title: 'Росток',
    message: 'Отличное начало! Ты уже 3 дня ведёшь дневник сна.',
  },
  {
    days: 7,
    badge: '🌿',
    title: 'Побег',
    message: 'Целая неделя! Привычка начинает формироваться.',
  },
  {
    days: 14,
    badge: '🌳',
    title: 'Дерево',
    message: '2 недели стабильности! Ты на верном пути.',
  },
  {
    days: 30,
    badge: '🌲',
    title: 'Лес',
    message: 'Месяц! Это серьёзное достижение. Гордись собой!',
  },
  {
    days: 66,
    badge: '🏆',
    title: 'Мастер сна',
    message: 'Привычка сформирована! По науке, 66 дней — это порог автоматизма.',
    isHabitFormed: true,
  },
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: IStreakConfig = {
  gracePeriodHours: 3,
  autoFreezeWeekly: 1,
  maxFreezes: 3,
  milestones: DEFAULT_MILESTONES,
  timezone: 'Europe/Moscow',
};

/**
 * StreakService - Manages user streaks with forgiveness mechanics
 */
export class StreakService {
  private config: IStreakConfig;

  constructor(config: Partial<IStreakConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current date in configured timezone
   */
  private getCurrentDate(): Date {
    // Use Moscow timezone for consistency
    const now = new Date();
    const moscowOffset = 3 * 60; // UTC+3
    const localOffset = now.getTimezoneOffset();
    const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60000);
    return moscowTime;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  /**
   * Get the effective date considering grace period
   * If it's 00:00-03:00, count as previous day
   */
  private getEffectiveDate(): string {
    const now = this.getCurrentDate();
    const hours = now.getHours();

    if (hours < this.config.gracePeriodHours) {
      // Still counts as yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return this.formatDate(yesterday);
    }

    return this.formatDate(now);
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: string, date2: string): number {
    const d1 = this.parseDate(date1);
    const d2 = this.parseDate(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get start of current week (Monday)
   */
  private getWeekStart(): string {
    const now = this.getCurrentDate();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return this.formatDate(monday);
  }

  /**
   * Create initial streak data for new user
   */
  createInitialData(): IStreakData {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      freezesAvailable: 1, // Start with 1 freeze
      freezesUsedThisWeek: 0,
      lastFreezeGrantDate: null,
      totalActiveDays: 0,
      weeklyActivity: [],
      milestoneReached: [],
    };
  }

  /**
   * Grant weekly auto-freeze if eligible
   */
  private grantWeeklyFreeze(data: IStreakData): IStreakData {
    const weekStart = this.getWeekStart();

    // Reset weekly usage if new week
    if (data.lastFreezeGrantDate !== weekStart) {
      data.freezesUsedThisWeek = 0;
      data.lastFreezeGrantDate = weekStart;

      // Grant auto-freeze up to max
      if (data.freezesAvailable < this.config.maxFreezes) {
        data.freezesAvailable = Math.min(
          data.freezesAvailable + this.config.autoFreezeWeekly,
          this.config.maxFreezes
        );
      }
    }

    return data;
  }

  /**
   * Record activity and update streak
   * This is the main method to call when user interacts
   */
  recordActivity(data: IStreakData, activityType: 'diary' | 'interaction' = 'interaction'): IStreakUpdateResult {
    const effectiveDate = this.getEffectiveDate();
    const _today = this.formatDate(this.getCurrentDate());

    // Grant weekly freeze first
    data = this.grantWeeklyFreeze(data);

    const previousStreak = data.currentStreak;
    let streakBroken = false;
    let freezeUsed = false;
    let newMilestone: IStreakMilestone | null = null;

    // Check if already recorded today
    const existingActivity = data.weeklyActivity.find(a => a.date === effectiveDate);
    if (existingActivity) {
      // Update existing activity
      if (activityType === 'diary') {
        existingActivity.hasDiary = true;
      }
      existingActivity.hasInteraction = true;
      existingActivity.timestamp = Date.now();

      // No streak change needed
      return {
        previousStreak,
        currentStreak: data.currentStreak,
        streakBroken: false,
        freezeUsed: false,
        newMilestone: null,
        message: this.getEncouragementMessage(data.currentStreak),
      };
    }

    // New day activity
    if (data.lastActivityDate === null) {
      // First ever activity
      data.currentStreak = 1;
      data.totalActiveDays = 1;
    } else {
      const daysSinceLastActivity = this.daysBetween(data.lastActivityDate, effectiveDate);

      if (daysSinceLastActivity === 0) {
        // Same day (shouldn't happen due to check above)
        // No change
      } else if (daysSinceLastActivity === 1) {
        // Consecutive day - streak continues!
        data.currentStreak += 1;
        data.totalActiveDays += 1;
      } else if (daysSinceLastActivity === 2 && data.freezesAvailable > 0) {
        // Missed 1 day but have freeze
        data.freezesAvailable -= 1;
        data.freezesUsedThisWeek += 1;
        data.currentStreak += 1; // Continue streak
        data.totalActiveDays += 1;
        freezeUsed = true;
      } else {
        // Streak broken (missed more than 1 day or no freeze)
        streakBroken = data.currentStreak > 0;
        data.currentStreak = 1; // Start fresh
        data.totalActiveDays += 1;
      }
    }

    // Update last activity date
    data.lastActivityDate = effectiveDate;

    // Update longest streak
    if (data.currentStreak > data.longestStreak) {
      data.longestStreak = data.currentStreak;
    }

    // Check for new milestone
    newMilestone = this.checkMilestone(data);

    // Add to weekly activity
    data.weeklyActivity.push({
      date: effectiveDate,
      hasDiary: activityType === 'diary',
      hasInteraction: true,
      timestamp: Date.now(),
    });

    // Keep only last 14 days of activity
    const twoWeeksAgo = new Date(this.getCurrentDate());
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const cutoffDate = this.formatDate(twoWeeksAgo);
    data.weeklyActivity = data.weeklyActivity.filter(a => a.date >= cutoffDate);

    // Generate appropriate message
    let message: string;
    if (newMilestone) {
      message = `${newMilestone.badge} *${newMilestone.title}!*\n${newMilestone.message}`;
    } else if (freezeUsed) {
      message = '❄️ Использован streak freeze! Ты не потерял прогресс.';
    } else if (streakBroken) {
      message = this.getRecoveryMessage();
    } else {
      message = this.getEncouragementMessage(data.currentStreak);
    }

    return {
      previousStreak,
      currentStreak: data.currentStreak,
      streakBroken,
      freezeUsed,
      newMilestone,
      message,
    };
  }

  /**
   * Check if a new milestone was reached
   */
  private checkMilestone(data: IStreakData): IStreakMilestone | null {
    for (const milestone of this.config.milestones) {
      if (
        data.currentStreak === milestone.days &&
        !data.milestoneReached.includes(milestone.days)
      ) {
        data.milestoneReached.push(milestone.days);
        return milestone;
      }
    }
    return null;
  }

  /**
   * Get encouraging message based on streak
   * (No anxiety-inducing messages!)
   */
  private getEncouragementMessage(streak: number): string {
    if (streak === 1) {
      return '✨ Первый шаг сделан!';
    } else if (streak < 7) {
      return `🔥 ${streak} ${this.pluralizeDays(streak)} подряд!`;
    } else if (streak < 14) {
      return `🔥 ${streak} ${this.pluralizeDays(streak)}! Отличный ритм!`;
    } else if (streak < 30) {
      return `🔥 ${streak} ${this.pluralizeDays(streak)}! Ты молодец!`;
    } else {
      return `🔥 ${streak} ${this.pluralizeDays(streak)}! Невероятно!`;
    }
  }

  /**
   * Get recovery message after broken streak
   * (Supportive, not punishing)
   */
  private getRecoveryMessage(): string {
    const messages = [
      '💪 Ничего страшного! Главное — продолжать.',
      '🌅 Новый день — новое начало!',
      '✨ Рада, что ты вернулся! Продолжим.',
      '🌱 Каждый день — это возможность начать заново.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Pluralize days in Russian
   */
  private pluralizeDays(n: number): string {
    const lastTwo = n % 100;
    const lastOne = n % 10;

    if (lastTwo >= 11 && lastTwo <= 19) {
      return 'дней';
    }
    if (lastOne === 1) {
      return 'день';
    }
    if (lastOne >= 2 && lastOne <= 4) {
      return 'дня';
    }
    return 'дней';
  }

  /**
   * Get the next milestone for user
   */
  getNextMilestone(currentStreak: number): IStreakMilestone | null {
    for (const milestone of this.config.milestones) {
      if (milestone.days > currentStreak) {
        return milestone;
      }
    }
    return null;
  }

  /**
   * Calculate progress to next milestone (0-100)
   */
  getMilestoneProgress(currentStreak: number): { progress: number; current: number; target: number } {
    const nextMilestone = this.getNextMilestone(currentStreak);
    if (!nextMilestone) {
      return { progress: 100, current: currentStreak, target: currentStreak };
    }

    // Find previous milestone
    let previousTarget = 0;
    for (const milestone of this.config.milestones) {
      if (milestone.days < nextMilestone.days && milestone.days <= currentStreak) {
        previousTarget = milestone.days;
      }
    }

    const range = nextMilestone.days - previousTarget;
    const current = currentStreak - previousTarget;
    const progress = Math.round((current / range) * 100);

    return {
      progress,
      current: currentStreak,
      target: nextMilestone.days,
    };
  }

  /**
   * Get weekly activity summary for last 7 days
   */
  getWeeklyActivitySummary(data: IStreakData): string[] {
    const result: string[] = [];
    const today = this.getCurrentDate();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);

      const activity = data.weeklyActivity.find(a => a.date === dateStr);

      if (activity?.hasDiary) {
        result.push('✓'); // Completed with diary
      } else if (activity?.hasInteraction) {
        result.push('●'); // Had interaction
      } else if (i === 0) {
        result.push('○'); // Today, not done yet
      } else {
        result.push('·'); // Missed
      }
    }

    return result;
  }

  /**
   * Get configuration (for testing/debugging)
   */
  getConfig(): IStreakConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const streakService = new StreakService();
