/**
 * MetacognitiveEngineService (Sprint 7 - MCT Module)
 * ===================================================
 * Main integration service for Metacognitive Therapy module.
 * Coordinates WorryPostponement, ATT, MCQ-30, and Detached Mindfulness.
 *
 * Research Foundation:
 * - Wells (2009): Metacognitive Therapy for Anxiety and Depression
 * - MCT-I open cohort study (2025)
 * - Integration with CBT-I (sequential approach)
 *
 * Protocol:
 * - CBT-I remains primary treatment (weeks 1-4)
 * - MCT introduced in weeks 5-8 or for CBT-I non-responders
 * - Key targets: Rumination, worry, metacognitive beliefs
 *
 * Components:
 * - WorryPostponementService: Daily worry management
 * - ATTService: Attention flexibility training
 * - MCQ30AssessmentService: Metacognitive beliefs screening
 * - DetachedMindfulnessService: Core MCT technique
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import {
  WorryPostponementService,
  createWorryPostponementService,
  type IWorryEntry,
  type IWorryStatistics,
} from './WorryPostponementService';

import {
  ATTService,
  createATTService,
  type IATTProgress,
  type IATTSessionRecord,
} from './ATTService';

import {
  MCQ30AssessmentService,
  createMCQ30AssessmentService,
  type IMCQ30Result,
  type MCQ30Subscale,
} from './MCQ30AssessmentService';

import {
  DetachedMindfulnessService,
  createDetachedMindfulnessService,
  type IDMSkillLevel,
  type IDMExercise,
  type DMExerciseType,
} from './DetachedMindfulnessService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * MCT module status for a user
 */
export interface IMCTStatus {
  /** Is MCT module active for user */
  readonly active: boolean;
  /** Week number in MCT program */
  readonly weekNumber: number;
  /** Overall MCT skill level (0-1) */
  readonly overallSkill: number;
  /** Component statuses */
  readonly components: {
    readonly worryPostponement: {
      readonly enabled: boolean;
      readonly worryTimeSet: boolean;
      readonly todaysWorryCount: number;
      readonly sessionsDone: number;
    };
    readonly att: {
      readonly enabled: boolean;
      readonly sessionsThisWeek: number;
      readonly targetSessionsPerWeek: number;
      readonly currentStreak: number;
    };
    readonly mcq30: {
      readonly assessmentDue: boolean;
      readonly lastScore?: number;
      readonly trend?: 'improving' | 'stable' | 'worsening';
    };
    readonly detachedMindfulness: {
      readonly skillLevel: number;
      readonly masteredExercises: number;
      readonly recommendedExercise: string;
    };
  };
  /** Daily recommendations */
  readonly dailyRecommendations: string[];
}

/**
 * MCT trigger event (from user interaction)
 */
export type MCTTrigger =
  | 'worry_reported'
  | 'rumination_detected'
  | 'sleep_anxiety'
  | 'racing_thoughts'
  | 'nighttime_awakening'
  | 'user_request'
  | 'scheduled_worry_time'
  | 'scheduled_att';

/**
 * MCT response to user
 */
export interface IMCTResponse {
  /** Response type */
  readonly type: 'exercise' | 'guidance' | 'assessment' | 'reminder' | 'encouragement';
  /** Primary message (Russian) */
  readonly messageRu: string;
  /** Secondary instructions if any */
  readonly instructionsRu?: string[];
  /** Suggested actions */
  readonly suggestedActions: {
    readonly label: string;
    readonly action: string;
    readonly data?: Record<string, unknown>;
  }[];
  /** Related exercise if applicable */
  readonly exercise?: {
    readonly type: string;
    readonly name: string;
    readonly duration: number;
  };
}

/**
 * CSD integration data for MCT
 */
export interface IMCTCSDData {
  /** Data available */
  readonly available: boolean;
  /** Overall MCT risk contribution (0-1) */
  readonly metacognitiveRisk: number;
  /** Specific indicators */
  readonly indicators: {
    readonly worryFrequency: number;
    readonly ruminationLevel: number;
    readonly attentionControl: number;
    readonly detachmentSkill: number;
  };
  /** Trend */
  readonly trend: 'improving' | 'stable' | 'worsening';
  /** Last assessment date */
  readonly lastAssessmentDate?: Date;
}

/**
 * MCT Engine configuration
 */
export interface IMCTEngineConfig {
  /** Enable MCT module */
  readonly enabled: boolean;
  /** Week to introduce MCT (1-8) */
  readonly introductionWeek: number;
  /** Minimum ISI score to suggest MCT */
  readonly minISIForMCT: number;
  /** Enable for CBT-I non-responders automatically */
  readonly enableForNonResponders: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_MCT_ENGINE_CONFIG: IMCTEngineConfig = {
  enabled: true,
  introductionWeek: 5,
  minISIForMCT: 8,
  enableForNonResponders: true,
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * MetacognitiveEngineService
 * Main orchestrator for MCT module
 */
export class MetacognitiveEngineService {
  private readonly config: IMCTEngineConfig;
  private readonly worryService: WorryPostponementService;
  private readonly attService: ATTService;
  private readonly mcq30Service: MCQ30AssessmentService;
  private readonly dmService: DetachedMindfulnessService;

  // Track active users and their start dates
  private readonly activeUsers: Map<string, Date> = new Map();

  constructor(config: Partial<IMCTEngineConfig> = {}) {
    this.config = { ...DEFAULT_MCT_ENGINE_CONFIG, ...config };

    // Initialize component services
    this.worryService = createWorryPostponementService();
    this.attService = createATTService();
    this.mcq30Service = createMCQ30AssessmentService();
    this.dmService = createDetachedMindfulnessService();
  }

  /**
   * Get configuration
   */
  getConfig(): IMCTEngineConfig {
    return this.config;
  }

  // ==========================================================================
  // COMPONENT ACCESS
  // ==========================================================================

  /**
   * Get WorryPostponementService
   */
  getWorryService(): WorryPostponementService {
    return this.worryService;
  }

  /**
   * Get ATTService
   */
  getATTService(): ATTService {
    return this.attService;
  }

  /**
   * Get MCQ30AssessmentService
   */
  getMCQ30Service(): MCQ30AssessmentService {
    return this.mcq30Service;
  }

  /**
   * Get DetachedMindfulnessService
   */
  getDMService(): DetachedMindfulnessService {
    return this.dmService;
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  /**
   * Activate MCT module for user
   */
  activateMCT(userId: string): void {
    if (!this.activeUsers.has(userId)) {
      this.activeUsers.set(userId, new Date());
    }
  }

  /**
   * Check if MCT is active for user
   */
  isMCTActive(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  /**
   * Deactivate MCT for user
   */
  deactivateMCT(userId: string): void {
    this.activeUsers.delete(userId);
  }

  /**
   * Get MCT status for user
   */
  getMCTStatus(userId: string): IMCTStatus {
    const isActive = this.activeUsers.has(userId);
    const startDate = this.activeUsers.get(userId);

    // Calculate week number
    const weekNumber = startDate
      ? Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
      : 0;

    // Get component statuses
    const worrySettings = this.worryService.getWorryTimeSettings(userId);
    const worryStats = this.worryService.getStatistics(userId);
    const attProgress = this.attService.getProgress(userId);
    const mcq30Latest = this.mcq30Service.getLatestAssessment(userId);
    const mcq30CSD = this.mcq30Service.getMetacognitiveRiskForCSD(userId);
    const dmSkill = this.dmService.getSkillLevel(userId);

    // Calculate overall skill
    const overallSkill = this.calculateOverallSkill(userId);

    // Generate daily recommendations
    const dailyRecommendations = this.generateDailyRecommendations(
      userId,
      worryStats,
      attProgress,
      dmSkill,
      mcq30CSD
    );

    return {
      active: isActive,
      weekNumber,
      overallSkill,
      components: {
        worryPostponement: {
          enabled: worrySettings !== null,
          worryTimeSet: worrySettings !== null,
          todaysWorryCount: this.worryService.getTodaysWorries(userId).length,
          sessionsDone: worryStats.sessionsCompleted,
        },
        att: {
          enabled: this.attService.isProgramActive(userId),
          sessionsThisWeek: attProgress.sessionsThisWeek,
          targetSessionsPerWeek: attProgress.targetSessionsPerWeek,
          currentStreak: attProgress.currentStreak,
        },
        mcq30: {
          assessmentDue: this.mcq30Service.isAssessmentDue(userId),
          lastScore: mcq30Latest?.totalScore,
          trend: mcq30CSD.trend,
        },
        detachedMindfulness: {
          skillLevel: dmSkill.overall,
          masteredExercises: dmSkill.masteredExercises.length,
          recommendedExercise: dmSkill.recommendedExercise,
        },
      },
      dailyRecommendations,
    };
  }

  // ==========================================================================
  // TRIGGER HANDLING
  // ==========================================================================

  /**
   * Handle MCT trigger event
   */
  handleTrigger(userId: string, trigger: MCTTrigger, context?: {
    userText?: string;
    isNight?: boolean;
    distressLevel?: number;
  }): IMCTResponse {
    // Ensure MCT is active
    if (!this.isMCTActive(userId)) {
      this.activateMCT(userId);
    }

    switch (trigger) {
      case 'worry_reported':
        return this.handleWorryReported(userId, context?.userText, context?.isNight, context?.distressLevel);

      case 'rumination_detected':
        return this.handleRuminationDetected(userId);

      case 'sleep_anxiety':
        return this.handleSleepAnxiety(userId);

      case 'racing_thoughts':
        return this.handleRacingThoughts(userId);

      case 'nighttime_awakening':
        return this.handleNighttimeAwakening(userId);

      case 'scheduled_worry_time':
        return this.handleScheduledWorryTime(userId);

      case 'scheduled_att':
        return this.handleScheduledATT(userId);

      case 'user_request':
      default:
        return this.handleUserRequest(userId);
    }
  }

  /**
   * Handle worry reported
   */
  private handleWorryReported(
    userId: string,
    userText?: string,
    isNight?: boolean,
    distressLevel?: number
  ): IMCTResponse {
    // Record the worry
    const worry = this.worryService.recordWorry(
      userId,
      userText ?? 'Беспокойство без описания',
      isNight ? 'during_night' : 'daytime',
      distressLevel ?? 5
    );

    const message = this.worryService.generateWorryRecordedResponse(worry, isNight ?? false);

    if (isNight) {
      // Night protocol
      const nightInstructions = this.worryService.getNightProtocolInstructions();
      return {
        type: 'guidance',
        messageRu: message,
        instructionsRu: nightInstructions,
        suggestedActions: [
          { label: 'Техника расслабления', action: 'relaxation', data: { type: 'breathing' } },
          { label: 'Отстранённая осознанность', action: 'dm', data: { exercise: 'radio' } },
        ],
      };
    }

    // Daytime - postpone to worry time
    const settings = this.worryService.getWorryTimeSettings(userId);

    return {
      type: 'encouragement',
      messageRu: message,
      suggestedActions: settings
        ? [
            { label: 'Добавить ещё беспокойство', action: 'add_worry' },
            { label: 'Практика DM', action: 'dm', data: { exercise: 'clouds' } },
          ]
        : [
            { label: 'Настроить время для беспокойства', action: 'setup_worry_time' },
          ],
    };
  }

  /**
   * Handle rumination detected
   */
  private handleRuminationDetected(userId: string): IMCTResponse {
    const dmExercise = this.dmService.getExercise('leaves_river')!;

    return {
      type: 'exercise',
      messageRu: 'Похоже, вы "пережёвываете" прошлое. Это руминация — и с ней можно работать.',
      instructionsRu: [
        'Руминация — это возвращение к прошлому снова и снова.',
        'Попробуйте технику "Листья на реке":',
        ...dmExercise.instructionsRu.slice(0, 5),
      ],
      suggestedActions: [
        { label: 'Начать упражнение', action: 'dm', data: { exercise: 'leaves_river' } },
        { label: 'Отложить на "время беспокойства"', action: 'postpone_worry' },
      ],
      exercise: {
        type: 'detached_mindfulness',
        name: dmExercise.nameRu,
        duration: dmExercise.duration,
      },
    };
  }

  /**
   * Handle sleep anxiety
   */
  private handleSleepAnxiety(userId: string): IMCTResponse {
    const dmExercise = this.dmService.getExercise('quick_dm')!;

    return {
      type: 'exercise',
      messageRu: 'Тревога о сне — частый спутник бессонницы. Попробуем изменить отношение к ней.',
      instructionsRu: this.dmService.getTipsForTrigger('sleep_anxiety'),
      suggestedActions: [
        { label: 'Быстрое DM (3 мин)', action: 'dm', data: { exercise: 'quick_dm' } },
        { label: 'Метафора "Радио"', action: 'dm', data: { exercise: 'radio' } },
        { label: 'Записать беспокойство', action: 'record_worry' },
      ],
      exercise: {
        type: 'detached_mindfulness',
        name: dmExercise.nameRu,
        duration: dmExercise.duration,
      },
    };
  }

  /**
   * Handle racing thoughts
   */
  private handleRacingThoughts(userId: string): IMCTResponse {
    const dmExercise = this.dmService.getExercise('train_station')!;

    return {
      type: 'exercise',
      messageRu: 'Много мыслей сразу? Это нормально для ума. Попробуем не "садиться" на каждый поезд.',
      instructionsRu: dmExercise.instructionsRu.slice(0, 8),
      suggestedActions: [
        { label: 'Упражнение "Поезда"', action: 'dm', data: { exercise: 'train_station' } },
        { label: 'ATT (если есть 12 мин)', action: 'att' },
      ],
      exercise: {
        type: 'detached_mindfulness',
        name: dmExercise.nameRu,
        duration: dmExercise.duration,
      },
    };
  }

  /**
   * Handle nighttime awakening
   */
  private handleNighttimeAwakening(userId: string): IMCTResponse {
    const nightInstructions = this.worryService.getNightProtocolInstructions();

    return {
      type: 'guidance',
      messageRu: 'Проснулись среди ночи? Это бывает. Вот что можно сделать:',
      instructionsRu: nightInstructions,
      suggestedActions: [
        { label: 'Записать мысль (кратко)', action: 'record_worry', data: { context: 'during_night' } },
        { label: 'Метафора "Радио"', action: 'dm', data: { exercise: 'radio' } },
        { label: 'Дыхание 4-7-8', action: 'relaxation', data: { type: 'breathing_478' } },
      ],
    };
  }

  /**
   * Handle scheduled worry time
   */
  private handleScheduledWorryTime(userId: string): IMCTResponse {
    const reminder = this.worryService.generateReminderMessage(userId);
    const worries = this.worryService.getTodaysWorries(userId);

    return {
      type: 'reminder',
      messageRu: reminder,
      instructionsRu: worries.length > 0
        ? this.worryService.getWorryTimeInstructions()
        : ['Сегодня без записанных беспокойств — отличный результат!'],
      suggestedActions: worries.length > 0
        ? [
            { label: 'Начать сессию', action: 'start_worry_session' },
            { label: 'Пропустить сегодня', action: 'skip_worry_session' },
          ]
        : [
            { label: 'Понятно', action: 'acknowledge' },
          ],
    };
  }

  /**
   * Handle scheduled ATT
   */
  private handleScheduledATT(userId: string): IMCTResponse {
    const progress = this.attService.getProgress(userId);

    const streakMessage = progress.currentStreak > 0
      ? ` Текущая серия: ${progress.currentStreak} дней!`
      : '';

    return {
      type: 'reminder',
      messageRu: `Время для тренировки внимания (ATT).${streakMessage}`,
      instructionsRu: this.attService.getPreparationInstructions(),
      suggestedActions: [
        { label: 'Начать ATT (12 мин)', action: 'start_att' },
        { label: 'Напомнить позже', action: 'snooze_att' },
      ],
      exercise: {
        type: 'att',
        name: 'Тренировка внимания',
        duration: 12,
      },
    };
  }

  /**
   * Handle user request (general MCT menu)
   */
  private handleUserRequest(userId: string): IMCTResponse {
    const status = this.getMCTStatus(userId);

    return {
      type: 'guidance',
      messageRu: 'Метакогнитивная терапия (MCT) — работа с отношением к мыслям.',
      instructionsRu: [
        'Доступные техники:',
        '',
        `• Откладывание беспокойства (${status.components.worryPostponement.enabled ? 'настроено' : 'не настроено'})`,
        `• Тренировка внимания ATT (${status.components.att.sessionsThisWeek}/${status.components.att.targetSessionsPerWeek} на этой неделе)`,
        `• Отстранённая осознанность (уровень: ${Math.round(status.components.detachedMindfulness.skillLevel * 100)}%)`,
        `• Оценка метакогниций MCQ-30 (${status.components.mcq30.assessmentDue ? 'рекомендуется пройти' : 'актуально'})`,
      ],
      suggestedActions: [
        { label: 'Записать беспокойство', action: 'record_worry' },
        { label: 'ATT', action: 'start_att' },
        { label: 'DM упражнение', action: 'dm', data: { exercise: status.components.detachedMindfulness.recommendedExercise } },
        { label: 'MCQ-30 тест', action: 'start_mcq30' },
      ],
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Calculate overall MCT skill
   */
  private calculateOverallSkill(userId: string): number {
    const attProgress = this.attService.getProgress(userId);
    const dmSkill = this.dmService.getSkillLevel(userId);
    const worryStats = this.worryService.getStatistics(userId);
    const mcq30Data = this.mcq30Service.getMetacognitiveRiskForCSD(userId);

    // Weight different components
    const attScore = Math.min(1, attProgress.totalSessions / 28); // 4 weeks of 2x daily
    const dmScore = dmSkill.overall;
    const worryScore = Math.min(1, worryStats.sessionsCompleted / 14); // 2 weeks
    const mcqImprovement = mcq30Data.available && mcq30Data.trend === 'improving' ? 0.2 : 0;

    return (
      attScore * 0.25 +
      dmScore * 0.35 +
      worryScore * 0.25 +
      mcqImprovement +
      0.15 // Base score for engagement
    );
  }

  /**
   * Generate daily recommendations
   */
  private generateDailyRecommendations(
    userId: string,
    worryStats: IWorryStatistics,
    attProgress: IATTProgress,
    dmSkill: IDMSkillLevel,
    mcq30Data: ReturnType<MCQ30AssessmentService['getMetacognitiveRiskForCSD']>
  ): string[] {
    const recommendations: string[] = [];

    // ATT recommendations
    if (attProgress.sessionsThisWeek < attProgress.targetSessionsPerWeek / 2) {
      recommendations.push('Практикуйте ATT дважды в день для лучших результатов.');
    }

    // Worry postponement recommendations
    if (!this.worryService.getWorryTimeSettings(userId)) {
      recommendations.push('Настройте "время для беспокойства" — это основа MCT.');
    }

    // DM recommendations
    if (dmSkill.trend === 'needs_practice') {
      recommendations.push('Практикуйте отстранённую осознанность чаще.');
    }

    // MCQ-30 recommendations
    if (this.mcq30Service.isAssessmentDue(userId)) {
      recommendations.push('Пройдите MCQ-30 для оценки прогресса.');
    }

    // Positive reinforcement
    if (attProgress.currentStreak >= 7) {
      recommendations.push(`Отлично! ${attProgress.currentStreak} дней ATT подряд!`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Продолжайте практику — вы на правильном пути.');
    }

    return recommendations.slice(0, 3);
  }

  // ==========================================================================
  // CSD INTEGRATION
  // ==========================================================================

  /**
   * Get CSD integration data
   */
  getCSDIntegrationData(userId: string): IMCTCSDData {
    const worryData = this.worryService.getCSDIntegrationData(userId);
    const attData = this.attService.getCSDIntegrationData(userId);
    const mcq30Data = this.mcq30Service.getMetacognitiveRiskForCSD(userId);
    const dmData = this.dmService.getCSDIntegrationData(userId);

    // Check if enough data
    const available = worryData.available || attData.available || mcq30Data.available || dmData.available;

    if (!available) {
      return {
        available: false,
        metacognitiveRisk: 0,
        indicators: {
          worryFrequency: 0,
          ruminationLevel: 0,
          attentionControl: 0,
          detachmentSkill: 0,
        },
        trend: 'stable',
      };
    }

    // Calculate overall metacognitive risk
    const worryRisk = worryData.available ? worryData.avgDistress / 10 : 0;
    const mcqRisk = mcq30Data.available ? mcq30Data.overallRisk : 0;
    const attProtection = attData.available ? attData.attentionControl : 0;
    const dmProtection = dmData.available ? dmData.detachmentSkill : 0;

    // Risk minus protective factors
    const metacognitiveRisk = Math.max(0, Math.min(1,
      (worryRisk * 0.3 + mcqRisk * 0.4) - (attProtection * 0.15 + dmProtection * 0.15)
    ));

    // Determine overall trend
    const trends = [worryData.trend, attData.trend, mcq30Data.trend, dmData.trend];
    const improvingCount = trends.filter(t => t === 'improving').length;
    const worseningCount = trends.filter(t => t === 'worsening' || t === 'needs_practice').length;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (improvingCount > worseningCount + 1) trend = 'improving';
    else if (worseningCount > improvingCount + 1) trend = 'worsening';

    return {
      available: true,
      metacognitiveRisk,
      indicators: {
        worryFrequency: worryData.available ? worryData.worryFrequency : 0,
        ruminationLevel: mcqRisk, // Approximation
        attentionControl: attData.available ? attData.attentionControl : 0,
        detachmentSkill: dmData.available ? dmData.detachmentSkill : 0,
      },
      trend,
      lastAssessmentDate: mcq30Data.lastAssessmentDate,
    };
  }

  // ==========================================================================
  // SETUP AND ONBOARDING
  // ==========================================================================

  /**
   * Get MCT onboarding messages
   */
  getOnboardingMessages(): string[] {
    return [
      'Метакогнитивная терапия (MCT) — это современный подход к работе с бессонницей.',
      '',
      'Ключевая идея: проблема не в самих мыслях, а в нашем отношении к ним.',
      '',
      'MCT включает:',
      '• Откладывание беспокойства — не боритесь с мыслями, отложите их на потом',
      '• Тренировка внимания (ATT) — развивает гибкость ума',
      '• Отстранённая осознанность — наблюдение мыслей без вовлечения',
      '',
      'Эти техники особенно помогают, если вы много думаете о сне и беспокоитесь о последствиях бессонницы.',
    ];
  }

  /**
   * Check if MCT should be suggested based on user profile
   */
  shouldSuggestMCT(
    isiScore: number,
    weekInProgram: number,
    highRumination: boolean,
    cbtiResponded: boolean
  ): { suggest: boolean; reason: string } {
    // Suggest if high rumination
    if (highRumination) {
      return {
        suggest: true,
        reason: 'Выраженная руминация — MCT может быть особенно полезна.',
      };
    }

    // Suggest if CBT-I non-responder after 4 weeks
    if (!cbtiResponded && weekInProgram >= 4) {
      return {
        suggest: true,
        reason: 'CBT-I показал ограниченный эффект — попробуем MCT как альтернативу.',
      };
    }

    // Suggest at week 5+ as enhancement
    if (weekInProgram >= this.config.introductionWeek && isiScore >= this.config.minISIForMCT) {
      return {
        suggest: true,
        reason: 'Пора добавить MCT техники для усиления эффекта.',
      };
    }

    return {
      suggest: false,
      reason: 'MCT будет предложена позже в программе.',
    };
  }

  /**
   * Reset all user data
   */
  resetUserData(userId: string): void {
    this.activeUsers.delete(userId);
    this.worryService.resetUserData(userId);
    this.attService.resetUserData(userId);
    this.mcq30Service.resetUserData(userId);
    this.dmService.resetUserData(userId);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create MetacognitiveEngineService instance
 */
export function createMetacognitiveEngineService(
  config?: Partial<IMCTEngineConfig>
): MetacognitiveEngineService {
  return new MetacognitiveEngineService(config);
}

/**
 * Singleton instance
 */
export const metacognitiveEngineService = new MetacognitiveEngineService();
