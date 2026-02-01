/**
 * ATTService - Attention Training Technique (Sprint 7 - MCT Module)
 * ==================================================================
 * Implements Adrian Wells' Attention Training Technique (ATT).
 *
 * Research Foundation:
 * - Wells (1990): Original ATT protocol
 * - Wells (2009): MCT for Anxiety and Depression
 * - MCT Institute official protocols
 *
 * Protocol Structure:
 * - 12 minutes total (can extend to 15)
 * - Phase 1: Selective Attention (5 min) - focus on one sound
 * - Phase 2: Attention Switching (5 min) - switch between sounds
 * - Phase 3: Divided Attention (2 min) - all sounds simultaneously
 *
 * Requirements:
 * - 6-9 different sounds
 * - Different spatial locations
 * - Eyes OPEN (not meditation)
 * - 2x daily for minimum 4 weeks
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * ATT session phase
 */
export type ATTPhase = 'selective' | 'switching' | 'divided';

/**
 * ATT session record
 */
export interface IATTSessionRecord {
  /** Session ID */
  readonly id: string;
  /** User ID */
  readonly userId: string;
  /** Timestamp */
  readonly timestamp: Date;
  /** Duration in seconds */
  readonly duration: number;
  /** Phases completed */
  readonly phasesCompleted: ATTPhase[];
  /** Completed successfully */
  readonly completed: boolean;
  /** Attention control rating (0-10) */
  readonly attentionRating?: number;
  /** Difficulty rating (0-10) */
  readonly difficultyRating?: number;
  /** Distractions count */
  readonly distractionsCount?: number;
  /** Notes */
  readonly notes?: string;
  /** Context (when practiced) */
  readonly context: 'morning' | 'afternoon' | 'evening';
}

/**
 * User ATT progress
 */
export interface IATTProgress {
  /** User ID */
  readonly userId: string;
  /** Total sessions completed */
  readonly totalSessions: number;
  /** Current streak (consecutive days) */
  readonly currentStreak: number;
  /** Best streak */
  readonly bestStreak: number;
  /** Average attention rating */
  readonly avgAttentionRating: number;
  /** Average difficulty rating */
  readonly avgDifficultyRating: number;
  /** Sessions this week */
  readonly sessionsThisWeek: number;
  /** Target sessions per week (14 = 2x daily) */
  readonly targetSessionsPerWeek: number;
  /** Trend: improving/stable/declining */
  readonly trend: 'improving' | 'stable' | 'declining';
  /** Week number (in program) */
  readonly weekNumber: number;
  /** Program start date */
  readonly startDate: Date;
}

/**
 * ATT audio instruction
 */
export interface IATTAudioInstruction {
  /** Phase */
  readonly phase: ATTPhase;
  /** Time offset in seconds */
  readonly timeOffset: number;
  /** Instruction text (Russian) */
  readonly textRu: string;
  /** Duration to hold (seconds) */
  readonly holdDuration?: number;
}

/**
 * ATT configuration
 */
export interface IATTConfig {
  /** Enable service */
  readonly enabled: boolean;
  /** Selective attention duration (seconds) */
  readonly selectiveDuration: number;
  /** Switching duration (seconds) */
  readonly switchingDuration: number;
  /** Divided attention duration (seconds) */
  readonly dividedDuration: number;
  /** Minimum sounds required */
  readonly minSounds: number;
  /** Target sessions per day */
  readonly targetSessionsPerDay: number;
  /** Minimum program weeks */
  readonly minProgramWeeks: number;
  /** Switch interval in switching phase (seconds) */
  readonly switchInterval: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_ATT_CONFIG: IATTConfig = {
  enabled: true,
  selectiveDuration: 300, // 5 minutes
  switchingDuration: 300, // 5 minutes
  dividedDuration: 120,   // 2 minutes
  minSounds: 6,
  targetSessionsPerDay: 2,
  minProgramWeeks: 4,
  switchInterval: 15, // Switch every 15 seconds
};

// ============================================================================
// AUDIO INSTRUCTIONS (RUSSIAN)
// ============================================================================

const ATT_AUDIO_SCRIPT: IATTAudioInstruction[] = [
  // Introduction (0-30 sec)
  { phase: 'selective', timeOffset: 0, textRu: 'Техника тренировки внимания. Сядьте удобно, глаза остаются ОТКРЫТЫМИ.' },
  { phase: 'selective', timeOffset: 10, textRu: 'Зафиксируйте взгляд на точке перед собой.' },
  { phase: 'selective', timeOffset: 20, textRu: 'Определите 6-9 различных звуков вокруг вас: в комнате и снаружи.' },

  // Selective Attention Phase (30 sec - 5:30)
  { phase: 'selective', timeOffset: 30, textRu: 'Начинаем первую фазу: Избирательное внимание.' },
  { phase: 'selective', timeOffset: 40, textRu: 'Выберите один звук. Сосредоточьте на нём всё внимание.' },
  { phase: 'selective', timeOffset: 50, textRu: 'Игнорируйте все остальные звуки. Только этот звук имеет значение.' },
  { phase: 'selective', timeOffset: 90, textRu: 'Если внимание уходит — мягко верните его к выбранному звуку.' },
  { phase: 'selective', timeOffset: 150, textRu: 'Переключите внимание на другой звук. Полностью сосредоточьтесь на нём.' },
  { phase: 'selective', timeOffset: 210, textRu: 'Слушайте этот звук максимально детально.' },
  { phase: 'selective', timeOffset: 270, textRu: 'Последний звук в этой фазе. Полное внимание только на нём.' },

  // Switching Phase (5:30 - 10:30)
  { phase: 'switching', timeOffset: 330, textRu: 'Вторая фаза: Переключение внимания.' },
  { phase: 'switching', timeOffset: 340, textRu: 'Теперь быстро переключайте внимание между звуками по моей команде.' },
  { phase: 'switching', timeOffset: 355, textRu: 'Первый звук.' },
  { phase: 'switching', timeOffset: 370, textRu: 'Переключаемся. Второй звук.' },
  { phase: 'switching', timeOffset: 385, textRu: 'Третий звук.' },
  { phase: 'switching', timeOffset: 400, textRu: 'Четвёртый звук.' },
  { phase: 'switching', timeOffset: 415, textRu: 'Снова первый.' },
  { phase: 'switching', timeOffset: 430, textRu: 'Теперь быстрее. Второй.' },
  { phase: 'switching', timeOffset: 440, textRu: 'Третий.' },
  { phase: 'switching', timeOffset: 450, textRu: 'Первый.' },
  { phase: 'switching', timeOffset: 460, textRu: 'Четвёртый.' },
  { phase: 'switching', timeOffset: 470, textRu: 'Второй.' },
  { phase: 'switching', timeOffset: 480, textRu: 'Продолжайте переключаться самостоятельно каждые несколько секунд.' },
  { phase: 'switching', timeOffset: 540, textRu: 'Продолжайте. Плавное, контролируемое переключение.' },
  { phase: 'switching', timeOffset: 600, textRu: 'Последние переключения.' },

  // Divided Attention Phase (10:30 - 12:30)
  { phase: 'divided', timeOffset: 630, textRu: 'Третья фаза: Разделённое внимание.' },
  { phase: 'divided', timeOffset: 640, textRu: 'Теперь расширьте внимание, чтобы воспринимать ВСЕ звуки одновременно.' },
  { phase: 'divided', timeOffset: 660, textRu: 'Слушайте всё звуковое пространство как единый оркестр.' },
  { phase: 'divided', timeOffset: 690, textRu: 'Удерживайте широкое, панорамное внимание.' },
  { phase: 'divided', timeOffset: 720, textRu: 'Это самая сложная часть — будьте терпеливы.' },

  // Closing (12:30 - 13:00)
  { phase: 'divided', timeOffset: 750, textRu: 'Сессия завершена. Отлично.' },
  { phase: 'divided', timeOffset: 760, textRu: 'Запомните это ощущение гибкого, управляемого внимания.' },
  { phase: 'divided', timeOffset: 770, textRu: 'Применяйте его, когда мысли о сне начинают захватывать вас.' },
];

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * ATTService - Attention Training Technique service
 */
export class ATTService {
  private readonly config: IATTConfig;
  private readonly sessions: Map<string, IATTSessionRecord[]> = new Map();
  private readonly startDates: Map<string, Date> = new Map();
  private mctRepo?: import('../../infrastructure/database/repositories/MCTRepository').MCTRepository;
  private stateRepo?: import('../../infrastructure/database/repositories/ServiceStateRepository').ServiceStateRepository;

  constructor(config: Partial<IATTConfig> = {}) {
    this.config = { ...DEFAULT_ATT_CONFIG, ...config };
  }

  async setRepository(
    mctRepo: import('../../infrastructure/database/repositories/MCTRepository').MCTRepository,
    stateRepo: import('../../infrastructure/database/repositories/ServiceStateRepository').ServiceStateRepository
  ): Promise<void> {
    this.mctRepo = mctRepo;
    this.stateRepo = stateRepo;
    await this.loadFromDB();
  }

  private async loadFromDB(): Promise<void> {
    try {
      if (this.mctRepo) {
        const entries = await this.mctRepo.getAllSessionsForService('att');
        for (const { userId, sessions } of entries) {
          this.sessions.set(userId, sessions as IATTSessionRecord[]);
        }
        console.log(`[ATT] Loaded ${entries.length} user session records from DB`);
      }

      if (this.stateRepo) {
        const dates = await this.stateRepo.getAllForService('att_start_dates');
        for (const { userId, state } of dates) {
          const dateStr = (state as { startDate?: string }).startDate;
          if (dateStr) {
            this.startDates.set(userId, new Date(dateStr));
          }
        }
        console.log(`[ATT] Loaded ${dates.length} start dates from DB`);
      }
    } catch (err) {
      console.error('[ATT] DB load failed:', err);
    }
  }

  private persistSession(userId: string, session: IATTSessionRecord): void {
    if (!this.mctRepo) return;
    this.mctRepo.addSession(userId, 'att', session, session.timestamp).catch(err => {
      console.error(`[ATT] Failed to persist session for ${userId}:`, err);
    });
  }

  private persistStartDate(userId: string, date: Date): void {
    if (!this.stateRepo) return;
    this.stateRepo.set(userId, 'att_start_dates', { startDate: date.toISOString() }).catch(err => {
      console.error(`[ATT] Failed to persist start date for ${userId}:`, err);
    });
  }

  /**
   * Get configuration
   */
  getConfig(): IATTConfig {
    return this.config;
  }

  // ==========================================================================
  // INSTRUCTIONS
  // ==========================================================================

  /**
   * Get preparation instructions (Russian)
   */
  getPreparationInstructions(): string[] {
    return [
      'Подготовка к ATT:',
      '',
      '1. Найдите тихое место, где вас не побеспокоят 12-15 минут',
      '2. Сядьте удобно',
      '3. Наушники рекомендуются, но не обязательны',
      '4. Глаза остаются ОТКРЫТЫМИ (это НЕ медитация)',
      '5. Зафиксируйте взгляд на точке перед собой',
      '',
      `Определите ${this.config.minSounds}-9 различных звуков вокруг:`,
      '• Внутри комнаты: часы, техника, шорохи',
      '• Снаружи: машины, птицы, голоса, ветер',
    ];
  }

  /**
   * Get phase instructions
   */
  getPhaseInstructions(phase: ATTPhase): string[] {
    switch (phase) {
      case 'selective':
        return [
          'ФАЗА 1: Избирательное внимание (5 минут)',
          '',
          '• Выберите один звук',
          '• Сосредоточьте на нём ВСЁ внимание',
          '• Игнорируйте остальные звуки',
          '• Удерживайте внимание 1-2 минуты',
          '• Затем переключитесь на другой звук',
          '',
          'Если внимание уходит — мягко верните его.',
        ];

      case 'switching':
        return [
          'ФАЗА 2: Переключение внимания (5 минут)',
          '',
          '• Выберите 3-4 разных звука',
          '• Переключайте внимание каждые 10-15 секунд',
          '• Переключение должно быть плавным и контролируемым',
          '• Постепенно ускоряйте темп',
          '',
          'Цель: развить гибкость переключения внимания.',
        ];

      case 'divided':
        return [
          'ФАЗА 3: Разделённое внимание (2 минуты)',
          '',
          '• Расширьте внимание на ВСЕ звуки одновременно',
          '• Слушайте всё как единый звуковой ландшафт',
          '• Удерживайте "панорамное" внимание',
          '',
          'Это самая сложная часть — со временем станет легче.',
        ];
    }
  }

  /**
   * Get audio script for generating audio
   */
  getAudioScript(): IATTAudioInstruction[] {
    return [...ATT_AUDIO_SCRIPT];
  }

  /**
   * Get total session duration
   */
  getTotalDuration(): number {
    return (
      this.config.selectiveDuration +
      this.config.switchingDuration +
      this.config.dividedDuration
    );
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Start ATT program for user
   */
  startProgram(userId: string): Date {
    if (!this.startDates.has(userId)) {
      const date = new Date();
      this.startDates.set(userId, date);
      this.persistStartDate(userId, date);
    }
    return this.startDates.get(userId)!;
  }

  /**
   * Check if program is active
   */
  isProgramActive(userId: string): boolean {
    return this.startDates.has(userId);
  }

  /**
   * Start ATT session
   */
  startSession(userId: string, context: IATTSessionRecord['context']): IATTSessionRecord {
    // Ensure program is started
    if (!this.startDates.has(userId)) {
      this.startProgram(userId);
    }

    const session: IATTSessionRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      duration: 0,
      phasesCompleted: [],
      completed: false,
      context,
    };

    return session;
  }

  /**
   * Complete ATT session
   */
  completeSession(
    userId: string,
    sessionId: string,
    phasesCompleted: ATTPhase[],
    attentionRating?: number,
    difficultyRating?: number,
    distractionsCount?: number,
    notes?: string
  ): IATTSessionRecord {
    const duration = this.calculateDuration(phasesCompleted);

    const session: IATTSessionRecord = {
      id: sessionId,
      userId,
      timestamp: new Date(),
      duration,
      phasesCompleted,
      completed: phasesCompleted.length === 3, // All three phases
      attentionRating,
      difficultyRating,
      distractionsCount,
      notes,
      context: this.determineContext(),
    };

    const userSessions = this.sessions.get(userId) ?? [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);
    this.persistSession(userId, session);

    return session;
  }

  /**
   * Record partial session (if interrupted)
   */
  recordPartialSession(
    userId: string,
    phasesCompleted: ATTPhase[],
    reason?: string
  ): IATTSessionRecord {
    const session: IATTSessionRecord = {
      id: `att_partial_${Date.now()}`,
      userId,
      timestamp: new Date(),
      duration: this.calculateDuration(phasesCompleted),
      phasesCompleted,
      completed: false,
      notes: reason,
      context: this.determineContext(),
    };

    const userSessions = this.sessions.get(userId) ?? [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);
    this.persistSession(userId, session);

    return session;
  }

  /**
   * Calculate duration from phases
   */
  private calculateDuration(phases: ATTPhase[]): number {
    let duration = 0;
    if (phases.includes('selective')) duration += this.config.selectiveDuration;
    if (phases.includes('switching')) duration += this.config.switchingDuration;
    if (phases.includes('divided')) duration += this.config.dividedDuration;
    return duration;
  }

  /**
   * Determine context based on current time
   */
  private determineContext(): IATTSessionRecord['context'] {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Get user progress
   */
  getProgress(userId: string): IATTProgress {
    const sessions = this.sessions.get(userId) ?? [];
    const startDate = this.startDates.get(userId) ?? new Date();

    // Calculate week number
    const weekNumber = Math.floor(
      (Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;

    // Sessions this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const sessionsThisWeek = sessions.filter(
      s => new Date(s.timestamp) >= weekStart
    ).length;

    // Calculate streak
    const { currentStreak, bestStreak } = this.calculateStreaks(sessions);

    // Calculate averages
    const completedSessions = sessions.filter(s => s.completed);
    const avgAttentionRating = this.calculateAverage(
      completedSessions.map(s => s.attentionRating).filter((r): r is number => r !== undefined)
    );
    const avgDifficultyRating = this.calculateAverage(
      completedSessions.map(s => s.difficultyRating).filter((r): r is number => r !== undefined)
    );

    // Calculate trend
    const trend = this.calculateTrend(sessions);

    return {
      userId,
      totalSessions: completedSessions.length,
      currentStreak,
      bestStreak,
      avgAttentionRating,
      avgDifficultyRating,
      sessionsThisWeek,
      targetSessionsPerWeek: this.config.targetSessionsPerDay * 7,
      trend,
      weekNumber,
      startDate,
    };
  }

  /**
   * Calculate streaks
   */
  private calculateStreaks(sessions: IATTSessionRecord[]): {
    currentStreak: number;
    bestStreak: number;
  } {
    if (sessions.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    // Get unique days with completed sessions
    const completedDays = new Set<string>();
    sessions
      .filter(s => s.completed)
      .forEach(s => {
        const date = new Date(s.timestamp).toISOString().split('T')[0];
        completedDays.add(date);
      });

    const sortedDays = Array.from(completedDays).sort();
    if (sortedDays.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 1;

    // Check if today is in the list
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;

      if (diffDays === 1) {
        streak++;
      } else {
        bestStreak = Math.max(bestStreak, streak);
        streak = 1;
      }
    }

    bestStreak = Math.max(bestStreak, streak);

    // Current streak only counts if includes today or yesterday
    const lastDay = sortedDays[sortedDays.length - 1];
    if (lastDay === today || lastDay === yesterday) {
      currentStreak = streak;
    }

    return { currentStreak, bestStreak };
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate trend based on recent sessions
   */
  private calculateTrend(
    sessions: IATTSessionRecord[]
  ): 'improving' | 'stable' | 'declining' {
    const recentSessions = sessions
      .filter(s => s.completed && s.attentionRating !== undefined)
      .slice(-14); // Last 2 weeks

    if (recentSessions.length < 4) return 'stable';

    const firstHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));
    const secondHalf = recentSessions.slice(Math.floor(recentSessions.length / 2));

    const firstAvg = this.calculateAverage(
      firstHalf.map(s => s.attentionRating!)
    );
    const secondAvg = this.calculateAverage(
      secondHalf.map(s => s.attentionRating!)
    );

    if (secondAvg > firstAvg + 0.5) return 'improving';
    if (secondAvg < firstAvg - 0.5) return 'declining';
    return 'stable';
  }

  // ==========================================================================
  // GUIDANCE AND TIPS
  // ==========================================================================

  /**
   * Get tips based on progress
   */
  getTips(progress: IATTProgress): string[] {
    const tips: string[] = [];

    // Adherence tips
    if (progress.sessionsThisWeek < progress.targetSessionsPerWeek * 0.5) {
      tips.push('Старайтесь практиковать ATT дважды в день для лучших результатов.');
    }

    // Difficulty tips
    if (progress.avgDifficultyRating > 7) {
      tips.push('Если сложно — это нормально. Со временем станет легче.');
      tips.push('Начните с более коротких сессий и постепенно увеличивайте.');
    }

    // Attention tips
    if (progress.avgAttentionRating < 5 && progress.totalSessions > 7) {
      tips.push('Попробуйте практиковать в более тихом месте.');
      tips.push('Убедитесь, что определили достаточно разных звуков.');
    }

    // Week-specific tips
    if (progress.weekNumber === 1) {
      tips.push('Первая неделя — время привыкнуть к практике.');
      tips.push('Не стремитесь к совершенству, просто практикуйте.');
    } else if (progress.weekNumber >= 4 && progress.trend === 'improving') {
      tips.push('Отличный прогресс! Продолжайте практику для закрепления.');
    }

    // Streak tips
    if (progress.currentStreak >= 7) {
      tips.push(`Отлично! ${progress.currentStreak} дней подряд — так держать!`);
    }

    return tips.slice(0, 3); // Return max 3 tips
  }

  /**
   * Get application guidance for sleep
   */
  getSleepApplicationGuidance(): string[] {
    return [
      'Как применять ATT для улучшения сна:',
      '',
      '• НЕ практикуйте ATT непосредственно перед сном',
      '• Лучшее время: утро и ранний вечер',
      '• Когда мысли о сне захватывают — вспомните ощущение гибкого внимания',
      '• Вы можете "переключить" внимание с беспокойства',
      '• ATT развивает навык "отпускать" мысли',
      '',
      'После 4 недель практики вы заметите, что мысли о сне',
      'меньше "захватывают" ваше внимание.',
    ];
  }

  // ==========================================================================
  // CSD INTEGRATION
  // ==========================================================================

  /**
   * Get CSD integration data
   */
  getCSDIntegrationData(userId: string): {
    available: boolean;
    attentionControl: number;
    adherence: number;
    trend: 'improving' | 'stable' | 'declining';
  } {
    const sessions = this.sessions.get(userId) ?? [];

    if (sessions.length < 7) {
      return {
        available: false,
        attentionControl: 0,
        adherence: 0,
        trend: 'stable',
      };
    }

    const progress = this.getProgress(userId);

    return {
      available: true,
      attentionControl: progress.avgAttentionRating / 10, // Normalize to 0-1
      adherence: progress.sessionsThisWeek / progress.targetSessionsPerWeek,
      trend: progress.trend,
    };
  }

  /**
   * Get session history
   */
  getSessionHistory(userId: string, limit?: number): IATTSessionRecord[] {
    const sessions = this.sessions.get(userId) ?? [];
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Reset user data
   */
  resetUserData(userId: string): void {
    this.sessions.delete(userId);
    this.startDates.delete(userId);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create ATTService instance
 */
export function createATTService(config?: Partial<IATTConfig>): ATTService {
  return new ATTService(config);
}

/**
 * Singleton instance
 */
export const attService = new ATTService();
