/**
 * WorryPostponementService (Sprint 7 - MCT Module)
 * =================================================
 * Implements the Worry Postponement protocol from Metacognitive Therapy.
 *
 * Research Foundation:
 * - Brosschot et al. (2006): Original worry postponement protocol
 * - Effects of worry postponement on daily worry and sleep (2025)
 * - Wells (2009): MCT for anxiety and depression
 *
 * Key Protocol Elements:
 * 1. Schedule 15-30 min "worry time" (4-5 hours before bed)
 * 2. Record worries throughout the day
 * 3. Categorize as solvable/unsolvable during worry time
 * 4. Track effectiveness over time
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Worry entry recorded by user
 */
export interface IWorryEntry {
  /** Unique identifier */
  readonly id: string;
  /** User ID */
  readonly userId: string;
  /** Worry content (brief description) */
  readonly content: string;
  /** When the worry occurred */
  readonly timestamp: Date;
  /** Context when worry appeared */
  readonly context: 'daytime' | 'pre_sleep' | 'during_night' | 'morning';
  /** Initial distress level (0-10) */
  readonly distressLevel: number;
  /** Has been processed during worry time */
  processed: boolean;
  /** Category after processing */
  category?: 'solvable' | 'unsolvable' | 'already_resolved';
  /** Action plan if solvable */
  actionPlan?: string;
  /** Distress after processing (0-10) */
  distressAfter?: number;
}

/**
 * User's worry time settings
 */
export interface IWorryTimeSettings {
  /** User ID */
  readonly userId: string;
  /** Scheduled worry time (HH:MM format) */
  readonly scheduledTime: string;
  /** Duration in minutes (15-30) */
  readonly duration: number;
  /** Days enabled (0=Sun, 6=Sat) */
  readonly enabledDays: number[];
  /** Created date */
  readonly createdAt: Date;
  /** Last updated */
  readonly updatedAt: Date;
}

/**
 * Worry session (daily worry time completion)
 */
export interface IWorrySession {
  /** Session ID */
  readonly id: string;
  /** User ID */
  readonly userId: string;
  /** Session date */
  readonly date: Date;
  /** Scheduled start time */
  readonly scheduledTime: Date;
  /** Actual start time */
  readonly actualStartTime?: Date;
  /** End time */
  readonly endTime?: Date;
  /** Worries processed in this session */
  readonly processedWorries: string[];
  /** Session completed */
  readonly completed: boolean;
  /** Skipped reason if not completed */
  readonly skipReason?: string;
  /** Overall distress before session (0-10) */
  readonly distressBefore?: number;
  /** Overall distress after session (0-10) */
  readonly distressAfter?: number;
  /** Session notes */
  readonly notes?: string;
}

/**
 * Worry statistics for user
 */
export interface IWorryStatistics {
  /** Total worries recorded */
  readonly totalWorries: number;
  /** Worries processed */
  readonly processedWorries: number;
  /** Sessions completed */
  readonly sessionsCompleted: number;
  /** Sessions skipped */
  readonly sessionsSkipped: number;
  /** Average distress reduction */
  readonly avgDistressReduction: number;
  /** Percentage solvable vs unsolvable */
  readonly solvablePercentage: number;
  /** Worries that resolved before worry time */
  readonly autoResolvedCount: number;
  /** Weekly worry count trend */
  readonly weeklyTrend: number[];
}

/**
 * Configuration for WorryPostponementService
 */
export interface IWorryPostponementConfig {
  /** Enable/disable the service */
  readonly enabled: boolean;
  /** Default worry time (HH:MM) */
  readonly defaultWorryTime: string;
  /** Default duration (minutes) */
  readonly defaultDuration: number;
  /** Minimum hours before bedtime */
  readonly minHoursBeforeBed: number;
  /** Maximum hours before bedtime */
  readonly maxHoursBeforeBed: number;
  /** Max worries per day before suggesting processing */
  readonly maxDailyWorries: number;
  /** Reminder minutes before worry time */
  readonly reminderMinutesBefore: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_WORRY_CONFIG: IWorryPostponementConfig = {
  enabled: true,
  defaultWorryTime: '18:30',
  defaultDuration: 20,
  minHoursBeforeBed: 3,
  maxHoursBeforeBed: 6,
  maxDailyWorries: 10,
  reminderMinutesBefore: 15,
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * WorryPostponementService
 * Manages the Worry Postponement protocol for MCT
 */
export class WorryPostponementService {
  private readonly config: IWorryPostponementConfig;
  private readonly worryEntries: Map<string, IWorryEntry[]> = new Map();
  private readonly settings: Map<string, IWorryTimeSettings> = new Map();
  private readonly sessions: Map<string, IWorrySession[]> = new Map();

  constructor(config: Partial<IWorryPostponementConfig> = {}) {
    this.config = { ...DEFAULT_WORRY_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): IWorryPostponementConfig {
    return this.config;
  }

  // ==========================================================================
  // WORRY TIME SETUP
  // ==========================================================================

  /**
   * Set up worry time for user
   */
  setupWorryTime(
    userId: string,
    time: string,
    duration: number = this.config.defaultDuration
  ): IWorryTimeSettings {
    const settings: IWorryTimeSettings = {
      userId,
      scheduledTime: time,
      duration: Math.min(30, Math.max(15, duration)),
      enabledDays: [0, 1, 2, 3, 4, 5, 6], // All days by default
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.settings.set(userId, settings);
    return settings;
  }

  /**
   * Get user's worry time settings
   */
  getWorryTimeSettings(userId: string): IWorryTimeSettings | null {
    return this.settings.get(userId) ?? null;
  }

  /**
   * Update worry time settings
   */
  updateWorryTimeSettings(
    userId: string,
    updates: Partial<Pick<IWorryTimeSettings, 'scheduledTime' | 'duration' | 'enabledDays'>>
  ): IWorryTimeSettings | null {
    const current = this.settings.get(userId);
    if (!current) return null;

    const updated: IWorryTimeSettings = {
      ...current,
      ...updates,
      updatedAt: new Date(),
    };

    this.settings.set(userId, updated);
    return updated;
  }

  /**
   * Suggest optimal worry time based on bedtime
   */
  suggestWorryTime(bedtimeHour: number): string[] {
    const suggestions: string[] = [];

    // Suggest times 4-5 hours before bed
    for (let hoursBack = 4; hoursBack <= 5; hoursBack++) {
      let worryHour = bedtimeHour - hoursBack;
      if (worryHour < 0) worryHour += 24;

      suggestions.push(`${worryHour.toString().padStart(2, '0')}:00`);
      suggestions.push(`${worryHour.toString().padStart(2, '0')}:30`);
    }

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }

  // ==========================================================================
  // WORRY RECORDING
  // ==========================================================================

  /**
   * Record a new worry entry
   */
  recordWorry(
    userId: string,
    content: string,
    context: IWorryEntry['context'] = 'daytime',
    distressLevel: number = 5
  ): IWorryEntry {
    const entry: IWorryEntry = {
      id: `worry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content: content.trim(),
      timestamp: new Date(),
      context,
      distressLevel: Math.min(10, Math.max(0, distressLevel)),
      processed: false,
    };

    const userWorries = this.worryEntries.get(userId) ?? [];
    userWorries.push(entry);
    this.worryEntries.set(userId, userWorries);

    return entry;
  }

  /**
   * Get today's unprocessed worries
   */
  getTodaysWorries(userId: string): IWorryEntry[] {
    const userWorries = this.worryEntries.get(userId) ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return userWorries.filter(w => {
      const worryDate = new Date(w.timestamp);
      worryDate.setHours(0, 0, 0, 0);
      return worryDate.getTime() === today.getTime() && !w.processed;
    });
  }

  /**
   * Get all unprocessed worries (including backlog)
   */
  getUnprocessedWorries(userId: string): IWorryEntry[] {
    const userWorries = this.worryEntries.get(userId) ?? [];
    return userWorries.filter(w => !w.processed);
  }

  /**
   * Check if user has reached daily worry limit
   */
  hasReachedDailyLimit(userId: string): boolean {
    return this.getTodaysWorries(userId).length >= this.config.maxDailyWorries;
  }

  // ==========================================================================
  // WORRY TIME SESSION
  // ==========================================================================

  /**
   * Start a worry time session
   */
  startWorrySession(userId: string): IWorrySession {
    const settings = this.settings.get(userId);
    const [hours, minutes] = (settings?.scheduledTime ?? this.config.defaultWorryTime)
      .split(':')
      .map(Number);

    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    const session: IWorrySession = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      date: new Date(),
      scheduledTime,
      actualStartTime: new Date(),
      processedWorries: [],
      completed: false,
    };

    const userSessions = this.sessions.get(userId) ?? [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);

    return session;
  }

  /**
   * Process a worry during worry time
   */
  processWorry(
    userId: string,
    worryId: string,
    category: 'solvable' | 'unsolvable' | 'already_resolved',
    actionPlan?: string,
    distressAfter?: number
  ): IWorryEntry | null {
    const userWorries = this.worryEntries.get(userId) ?? [];
    const worryIndex = userWorries.findIndex(w => w.id === worryId);

    if (worryIndex === -1) return null;

    const worry = userWorries[worryIndex];
    worry.processed = true;
    worry.category = category;
    worry.actionPlan = actionPlan;
    worry.distressAfter = distressAfter;

    // Update in current session
    const sessions = this.sessions.get(userId) ?? [];
    const currentSession = sessions.find(s => !s.completed);
    if (currentSession) {
      (currentSession.processedWorries as string[]).push(worryId);
    }

    return worry;
  }

  /**
   * Complete worry time session
   */
  completeWorrySession(
    userId: string,
    distressBefore: number,
    distressAfter: number,
    notes?: string
  ): IWorrySession | null {
    const sessions = this.sessions.get(userId) ?? [];
    const currentSession = sessions.find(s => !s.completed);

    if (!currentSession) return null;

    // Mutate to complete (in real implementation, would create new object)
    (currentSession as { completed: boolean }).completed = true;
    (currentSession as { endTime: Date }).endTime = new Date();
    (currentSession as { distressBefore: number }).distressBefore = distressBefore;
    (currentSession as { distressAfter: number }).distressAfter = distressAfter;
    if (notes) (currentSession as { notes: string }).notes = notes;

    return currentSession;
  }

  /**
   * Skip worry time session
   */
  skipWorrySession(userId: string, reason: string): IWorrySession | null {
    const sessions = this.sessions.get(userId) ?? [];
    const currentSession = sessions.find(s => !s.completed);

    if (!currentSession) return null;

    (currentSession as { completed: boolean }).completed = true;
    (currentSession as { endTime: Date }).endTime = new Date();
    (currentSession as { skipReason: string }).skipReason = reason;

    return currentSession;
  }

  // ==========================================================================
  // INSTRUCTIONS AND GUIDANCE
  // ==========================================================================

  /**
   * Get worry postponement instructions (Russian)
   */
  getPostponementInstructions(): string[] {
    return [
      '1. Заметьте беспокойство: "Это беспокойство"',
      '2. Кратко запишите его (1-2 предложения)',
      '3. Скажите себе: "Я подумаю об этом в своё время для беспокойства"',
      '4. Верните внимание к текущему занятию',
      '5. Если мысль возвращается — повторите процесс',
    ];
  }

  /**
   * Get worry time session instructions (Russian)
   */
  getWorryTimeInstructions(): string[] {
    return [
      '1. Просмотрите записанные беспокойства',
      '2. Для каждого определите: решаемая или нерешаемая проблема?',
      '3. Для решаемых: составьте план действий',
      '4. Для нерешаемых: практикуйте принятие',
      '5. После обработки всех — закройте список',
      '6. Если время вышло — продолжите завтра',
    ];
  }

  /**
   * Get night protocol instructions (Russian)
   * For middle-of-night awakenings
   */
  getNightProtocolInstructions(): string[] {
    return [
      'Если проснулись и начали беспокоиться:',
      '',
      '1. Вспомните: "Я уже занялся этим вечером"',
      '2. Если новое беспокойство — кратко запишите',
      '3. Скажите себе: "Я подумаю об этом завтра в отведённое время"',
      '4. Примените технику релаксации',
      '',
      'Помните: Решать проблемы в полусне неэффективно.',
    ];
  }

  /**
   * Generate response for worry recording
   */
  generateWorryRecordedResponse(worry: IWorryEntry, isNight: boolean): string {
    const baseResponse = `Записала беспокойство.`;

    if (isNight) {
      return `${baseResponse}\n\nСейчас ночь — не время для решения проблем. Мы разберём это завтра в ваше время для беспокойства. А пока — позвольте себе отдохнуть.`;
    }

    const settings = this.settings.get(worry.userId);
    if (settings) {
      return `${baseResponse}\n\nМы разберём это сегодня в ${settings.scheduledTime} во время вашего "времени для беспокойства".`;
    }

    return `${baseResponse}\n\nВернёмся к этому позже.`;
  }

  /**
   * Generate worry time reminder message
   */
  generateReminderMessage(userId: string): string {
    const worries = this.getTodaysWorries(userId);
    const count = worries.length;

    if (count === 0) {
      return `Время для беспокойства! Сегодня вы не записали ни одного беспокойства — это отличный результат.`;
    }

    const plural = count === 1 ? 'беспокойство' :
                   count < 5 ? 'беспокойства' : 'беспокойств';

    return `Время для беспокойства!\n\nСегодня у вас ${count} ${plural} для обработки.\n\nНачнём?`;
  }

  // ==========================================================================
  // CATEGORIZATION GUIDANCE
  // ==========================================================================

  /**
   * Get solvable problem guidance
   */
  getSolvableProblemGuidance(): string[] {
    return [
      'Это РЕШАЕМАЯ проблема.',
      '',
      'Составьте план действий:',
      '• Какой первый маленький шаг?',
      '• Когда вы его сделаете?',
      '• Что может помешать и как это обойти?',
      '',
      'После составления плана — отложите проблему до момента действия.',
    ];
  }

  /**
   * Get unsolvable problem guidance
   */
  getUnsolvableProblemGuidance(): string[] {
    return [
      'Это НЕРЕШАЕМАЯ проблема (сейчас).',
      '',
      'Практикуйте принятие:',
      '• Признайте: "Это вне моего контроля прямо сейчас"',
      '• Напомните: беспокойство не изменит ситуацию',
      '• Скажите себе: "Я сделаю что смогу, когда смогу"',
      '',
      'Позвольте этой мысли быть — без борьбы.',
    ];
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get worry statistics for user
   */
  getStatistics(userId: string): IWorryStatistics {
    const worries = this.worryEntries.get(userId) ?? [];
    const sessions = this.sessions.get(userId) ?? [];

    const processedWorries = worries.filter(w => w.processed);
    const completedSessions = sessions.filter(s => s.completed && !s.skipReason);
    const skippedSessions = sessions.filter(s => s.completed && s.skipReason);

    // Calculate average distress reduction
    const worriesWithDistress = processedWorries.filter(
      w => w.distressAfter !== undefined
    );
    const avgDistressReduction = worriesWithDistress.length > 0
      ? worriesWithDistress.reduce((sum, w) =>
          sum + (w.distressLevel - (w.distressAfter ?? w.distressLevel)), 0
        ) / worriesWithDistress.length
      : 0;

    // Calculate solvable percentage
    const categorizedWorries = processedWorries.filter(w => w.category);
    const solvableCount = categorizedWorries.filter(w => w.category === 'solvable').length;
    const solvablePercentage = categorizedWorries.length > 0
      ? (solvableCount / categorizedWorries.length) * 100
      : 0;

    // Auto-resolved count
    const autoResolvedCount = processedWorries.filter(
      w => w.category === 'already_resolved'
    ).length;

    // Weekly trend (last 4 weeks)
    const weeklyTrend = this.calculateWeeklyTrend(worries);

    return {
      totalWorries: worries.length,
      processedWorries: processedWorries.length,
      sessionsCompleted: completedSessions.length,
      sessionsSkipped: skippedSessions.length,
      avgDistressReduction,
      solvablePercentage,
      autoResolvedCount,
      weeklyTrend,
    };
  }

  /**
   * Calculate weekly worry trend
   */
  private calculateWeeklyTrend(worries: IWorryEntry[]): number[] {
    const trend: number[] = [];
    const now = new Date();

    for (let week = 3; week >= 0; week--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (week * 7) - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = worries.filter(w => {
        const timestamp = new Date(w.timestamp);
        return timestamp >= weekStart && timestamp < weekEnd;
      }).length;

      trend.push(count);
    }

    return trend;
  }

  /**
   * Get effectiveness summary
   */
  getEffectivenessSummary(userId: string): {
    isEffective: boolean;
    summary: string;
    recommendations: string[];
  } {
    const stats = this.getStatistics(userId);
    const recommendations: string[] = [];

    // Determine effectiveness
    let isEffective = true;
    let summary = '';

    if (stats.sessionsCompleted < 7) {
      isEffective = false;
      summary = 'Недостаточно данных для оценки. Продолжайте практику.';
      recommendations.push('Практикуйте ежедневно минимум 2 недели');
    } else if (stats.avgDistressReduction < 1) {
      isEffective = false;
      summary = 'Снижение дистресса минимальное.';
      recommendations.push('Попробуйте более детально разбирать беспокойства');
      recommendations.push('Рассмотрите добавление техники отстранённой осознанности');
    } else if (stats.autoResolvedCount / stats.totalWorries > 0.3) {
      isEffective = true;
      summary = `Отлично! ${Math.round(stats.autoResolvedCount / stats.totalWorries * 100)}% беспокойств разрешились до времени для беспокойства.`;
    } else if (stats.avgDistressReduction >= 2) {
      isEffective = true;
      summary = `Техника работает. Среднее снижение дистресса: ${stats.avgDistressReduction.toFixed(1)} балла.`;
    } else {
      isEffective = true;
      summary = 'Умеренная эффективность. Продолжайте практику.';
      recommendations.push('Уделяйте больше внимания категоризации беспокойств');
    }

    if (stats.sessionsSkipped > stats.sessionsCompleted) {
      recommendations.push('Старайтесь не пропускать время для беспокойства');
    }

    return { isEffective, summary, recommendations };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Check if it's currently worry time for user
   */
  isWorryTime(userId: string): boolean {
    const settings = this.settings.get(userId);
    if (!settings) return false;

    const [hours, minutes] = settings.scheduledTime.split(':').map(Number);
    const now = new Date();
    const worryStart = new Date();
    worryStart.setHours(hours, minutes, 0, 0);
    const worryEnd = new Date(worryStart);
    worryEnd.setMinutes(worryEnd.getMinutes() + settings.duration);

    return now >= worryStart && now <= worryEnd;
  }

  /**
   * Check if reminder should be sent
   */
  shouldSendReminder(userId: string): boolean {
    const settings = this.settings.get(userId);
    if (!settings) return false;

    const [hours, minutes] = settings.scheduledTime.split(':').map(Number);
    const now = new Date();
    const worryTime = new Date();
    worryTime.setHours(hours, minutes, 0, 0);

    const reminderTime = new Date(worryTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - this.config.reminderMinutesBefore);

    const diff = Math.abs(now.getTime() - reminderTime.getTime());
    return diff < 60000; // Within 1 minute of reminder time
  }

  /**
   * Get CSD integration data (for Critical Slowing Down)
   */
  getCSDIntegrationData(userId: string): {
    available: boolean;
    worryFrequency: number;
    avgDistress: number;
    trend: 'improving' | 'stable' | 'worsening';
  } {
    const worries = this.worryEntries.get(userId) ?? [];

    if (worries.length < 7) {
      return {
        available: false,
        worryFrequency: 0,
        avgDistress: 0,
        trend: 'stable',
      };
    }

    const recentWorries = worries.slice(-14);
    const worryFrequency = recentWorries.length / 14;
    const avgDistress = recentWorries.reduce((sum, w) => sum + w.distressLevel, 0) / recentWorries.length;

    // Calculate trend
    const weeklyTrend = this.calculateWeeklyTrend(worries);
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';

    if (weeklyTrend.length >= 2) {
      const lastWeek = weeklyTrend[weeklyTrend.length - 1];
      const prevWeek = weeklyTrend[weeklyTrend.length - 2];

      if (lastWeek < prevWeek * 0.8) trend = 'improving';
      else if (lastWeek > prevWeek * 1.2) trend = 'worsening';
    }

    return {
      available: true,
      worryFrequency,
      avgDistress,
      trend,
    };
  }

  /**
   * Reset user data (for testing or user request)
   */
  resetUserData(userId: string): void {
    this.worryEntries.delete(userId);
    this.settings.delete(userId);
    this.sessions.delete(userId);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create new WorryPostponementService instance
 */
export function createWorryPostponementService(
  config?: Partial<IWorryPostponementConfig>
): WorryPostponementService {
  return new WorryPostponementService(config);
}

/**
 * Singleton instance
 */
export const worryPostponementService = new WorryPostponementService();
