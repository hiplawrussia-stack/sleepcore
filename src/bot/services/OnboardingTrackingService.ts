/**
 * Onboarding Tracking Service
 * ============================
 * Funnel analytics for user onboarding journey.
 *
 * Research basis (2025):
 * - 77% of DAUs stop using app within 3 days (UXCam)
 * - 90% of apps abandoned within first month (Whatfix)
 * - Only 40% of DTx participants install app (PMC)
 * - Funnel analysis identifies drop-off points
 * - Cohort analysis tracks retention over time
 *
 * Key metrics tracked:
 * - Completion rate per step
 * - Time to complete each step
 * - Drop-off points
 * - Overall funnel conversion
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ==================== Types ====================

/**
 * Onboarding step identifiers
 * Order matters - this defines the funnel sequence
 */
export type OnboardingStep =
  | 'welcome_viewed'
  | 'name_collected'
  | 'age_confirmed'
  | 'isi_started'
  | 'isi_completed'
  | 'first_diary_entry'
  | 'first_mood_check'
  | 'notifications_configured'
  | 'onboarding_completed';

/**
 * Step completion record
 */
export interface IStepCompletion {
  step: OnboardingStep;
  completedAt: Date;
  durationMs?: number; // Time from previous step
  metadata?: Record<string, unknown>;
}

/**
 * User onboarding progress
 */
export interface IOnboardingProgress {
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  currentStep: OnboardingStep;
  completedSteps: IStepCompletion[];
  isCompleted: boolean;
  /** Calculated: percentage through funnel */
  completionPercentage: number;
}

/**
 * Funnel analytics summary
 */
export interface IFunnelAnalytics {
  totalUsers: number;
  completedUsers: number;
  conversionRate: number;
  stepConversions: {
    step: OnboardingStep;
    reached: number;
    completed: number;
    dropOffRate: number;
    avgDurationMs: number;
  }[];
  averageCompletionTimeMs: number;
}

/**
 * Onboarding event for logging
 */
export interface IOnboardingEvent {
  userId: string;
  step: OnboardingStep;
  action: 'started' | 'completed' | 'skipped' | 'abandoned';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ==================== Constants ====================

/**
 * Onboarding steps in order (defines the funnel)
 */
const ONBOARDING_FUNNEL: readonly OnboardingStep[] = [
  'welcome_viewed',
  'name_collected',
  'age_confirmed',
  'isi_started',
  'isi_completed',
  'first_diary_entry',
  'first_mood_check',
  'notifications_configured',
  'onboarding_completed',
] as const;

/**
 * Step display names (Russian)
 */
const STEP_NAMES: Record<OnboardingStep, string> = {
  welcome_viewed: 'Приветствие просмотрено',
  name_collected: 'Имя получено',
  age_confirmed: 'Возраст подтвержден',
  isi_started: 'ISI начат',
  isi_completed: 'ISI завершен',
  first_diary_entry: 'Первая запись в дневнике',
  first_mood_check: 'Первая проверка настроения',
  notifications_configured: 'Уведомления настроены',
  onboarding_completed: 'Онбординг завершен',
};

/**
 * Target completion times (ms) - for progress tracking
 */
const _TARGET_COMPLETION_TIMES: Record<OnboardingStep, number> = {
  welcome_viewed: 10_000,       // 10 seconds
  name_collected: 30_000,       // 30 seconds
  age_confirmed: 20_000,        // 20 seconds
  isi_started: 10_000,          // 10 seconds (just starting)
  isi_completed: 300_000,       // 5 minutes (7 questions)
  first_diary_entry: 180_000,   // 3 minutes
  first_mood_check: 60_000,     // 1 minute
  notifications_configured: 30_000, // 30 seconds
  onboarding_completed: 0,      // Immediate after last step
};

// ==================== Service Implementation ====================

import type { OnboardingRepository } from '../../infrastructure/database/repositories/OnboardingRepository';

/**
 * Onboarding Tracking Service
 *
 * Tracks user progress through onboarding funnel.
 * Provides analytics for identifying drop-off points.
 *
 * @example
 * ```typescript
 * const tracker = new OnboardingTrackingService();
 *
 * // Start tracking new user
 * tracker.startOnboarding('user123');
 *
 * // Mark steps as completed
 * tracker.completeStep('user123', 'welcome_viewed');
 * tracker.completeStep('user123', 'name_collected');
 *
 * // Get progress
 * const progress = tracker.getProgress('user123');
 * console.log(`Completion: ${progress.completionPercentage}%`);
 * ```
 */
export class OnboardingTrackingService {
  private progressMap: Map<string, IOnboardingProgress> = new Map();
  private eventLog: IOnboardingEvent[] = [];
  private maxEventLogSize = 10000; // Prevent memory bloat
  private repo?: OnboardingRepository;

  async setRepository(repo: OnboardingRepository): Promise<void> {
    this.repo = repo;
    await this.loadFromDB();
  }

  private async loadFromDB(): Promise<void> {
    if (!this.repo) return;
    try {
      const entities = await this.repo.findAll();
      for (const e of entities) {
        this.progressMap.set(e.userId, {
          userId: e.userId,
          startedAt: new Date(e.startedAt),
          completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
          currentStep: e.currentStep as OnboardingStep,
          completedSteps: JSON.parse(e.completedStepsJson).map((s: { step: string; completedAt: string; durationMs?: number; metadata?: Record<string, unknown> }) => ({
            ...s,
            completedAt: new Date(s.completedAt),
          })),
          isCompleted: !!e.isCompleted,
          completionPercentage: e.completionPercentage,
        });
      }
      console.log(`[Onboarding] Loaded ${entities.length} progress records from DB`);
    } catch (err) {
      console.error('[Onboarding] DB load failed:', err);
    }
  }

  private persistProgress(userId: string, progress: IOnboardingProgress): void {
    if (!this.repo) return;
    this.repo.upsert(userId, {
      userId,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      currentStep: progress.currentStep,
      completedStepsJson: JSON.stringify(progress.completedSteps),
      isCompleted: progress.isCompleted,
      completionPercentage: progress.completionPercentage,
    }).catch(err => {
      console.error(`[Onboarding] Failed to persist progress for ${userId}:`, err);
    });
  }

  /**
   * Start onboarding tracking for a user
   */
  startOnboarding(userId: string): IOnboardingProgress {
    const existingProgress = this.progressMap.get(userId);
    if (existingProgress) {
      return existingProgress; // Already started
    }

    const progress: IOnboardingProgress = {
      userId,
      startedAt: new Date(),
      currentStep: 'welcome_viewed',
      completedSteps: [],
      isCompleted: false,
      completionPercentage: 0,
    };

    this.progressMap.set(userId, progress);
    this.persistProgress(userId, progress);
    this.logEvent(userId, 'welcome_viewed', 'started');

    console.log(`[Onboarding] Started tracking for user: ${userId}`);
    return progress;
  }

  /**
   * Mark a step as completed
   */
  completeStep(
    userId: string,
    step: OnboardingStep,
    metadata?: Record<string, unknown>
  ): IOnboardingProgress | null {
    let progress = this.progressMap.get(userId);

    // Auto-start if not started
    if (!progress) {
      progress = this.startOnboarding(userId);
    }

    // Check if step already completed
    const alreadyCompleted = progress.completedSteps.some(s => s.step === step);
    if (alreadyCompleted) {
      return progress;
    }

    // Calculate duration from previous step
    const prevStep = progress.completedSteps[progress.completedSteps.length - 1];
    const durationMs = prevStep
      ? Date.now() - prevStep.completedAt.getTime()
      : Date.now() - progress.startedAt.getTime();

    // Add completion record
    const completion: IStepCompletion = {
      step,
      completedAt: new Date(),
      durationMs,
      metadata,
    };

    progress.completedSteps.push(completion);

    // Update current step to next in funnel
    const currentIndex = ONBOARDING_FUNNEL.indexOf(step);
    if (currentIndex < ONBOARDING_FUNNEL.length - 1) {
      progress.currentStep = ONBOARDING_FUNNEL[currentIndex + 1];
    }

    // Calculate completion percentage
    progress.completionPercentage = Math.round(
      (progress.completedSteps.length / ONBOARDING_FUNNEL.length) * 100
    );

    // Check if fully completed
    if (step === 'onboarding_completed' || progress.completionPercentage === 100) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    this.persistProgress(userId, progress);
    this.logEvent(userId, step, 'completed', metadata);

    console.log(
      `[Onboarding] User ${userId} completed step: ${step} ` +
      `(${progress.completionPercentage}% complete)`
    );

    return progress;
  }

  /**
   * Skip a step (user chose to skip optional step)
   */
  skipStep(userId: string, step: OnboardingStep): void {
    this.logEvent(userId, step, 'skipped');
    console.log(`[Onboarding] User ${userId} skipped step: ${step}`);
  }

  /**
   * Get user's current progress
   */
  getProgress(userId: string): IOnboardingProgress | null {
    return this.progressMap.get(userId) || null;
  }

  /**
   * Check if user has completed onboarding
   */
  isOnboardingComplete(userId: string): boolean {
    const progress = this.progressMap.get(userId);
    return progress?.isCompleted ?? false;
  }

  /**
   * Check if a specific step is completed
   */
  isStepCompleted(userId: string, step: OnboardingStep): boolean {
    const progress = this.progressMap.get(userId);
    if (!progress) return false;
    return progress.completedSteps.some(s => s.step === step);
  }

  /**
   * Get next recommended step for user
   */
  getNextStep(userId: string): OnboardingStep | null {
    const progress = this.progressMap.get(userId);
    if (!progress || progress.isCompleted) return null;

    const completedStepIds = new Set(progress.completedSteps.map(s => s.step));

    for (const step of ONBOARDING_FUNNEL) {
      if (!completedStepIds.has(step)) {
        return step;
      }
    }

    return null;
  }

  /**
   * Get step display name
   */
  getStepName(step: OnboardingStep): string {
    return STEP_NAMES[step];
  }

  /**
   * Generate progress bar for user
   */
  generateProgressBar(userId: string): string {
    const progress = this.progressMap.get(userId);
    if (!progress) return '';

    const totalSteps = ONBOARDING_FUNNEL.length;
    const completedCount = progress.completedSteps.length;
    const percentage = progress.completionPercentage;

    // Visual progress bar
    const filled = Math.round((completedCount / totalSteps) * 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `${bar} ${percentage}% (${completedCount}/${totalSteps})`;
  }

  /**
   * Generate onboarding status message
   */
  generateStatusMessage(userId: string): string {
    const progress = this.progressMap.get(userId);
    if (!progress) {
      return 'Онбординг не начат.';
    }

    if (progress.isCompleted) {
      return '✅ Онбординг завершен!\n\n' +
        `Время: ${this.formatDuration(progress.completedAt!.getTime() - progress.startedAt.getTime())}`;
    }

    const nextStep = this.getNextStep(userId);
    const nextStepName = nextStep ? STEP_NAMES[nextStep] : 'Нет';

    return `📊 *Прогресс онбординга*\n\n` +
      `${this.generateProgressBar(userId)}\n\n` +
      `Следующий шаг: ${nextStepName}`;
  }

  /**
   * Get funnel analytics across all users
   */
  getFunnelAnalytics(): IFunnelAnalytics {
    const allProgress = Array.from(this.progressMap.values());
    const totalUsers = allProgress.length;
    const completedUsers = allProgress.filter(p => p.isCompleted).length;

    // Calculate step-by-step conversion
    const stepConversions = ONBOARDING_FUNNEL.map((step) => {
      const reached = allProgress.filter(p => {
        const stepIndex = ONBOARDING_FUNNEL.indexOf(step);
        const userStepIndex = ONBOARDING_FUNNEL.indexOf(p.currentStep);
        return userStepIndex >= stepIndex || p.completedSteps.some(s => s.step === step);
      }).length;

      const completed = allProgress.filter(p =>
        p.completedSteps.some(s => s.step === step)
      ).length;

      const durations = allProgress
        .map(p => p.completedSteps.find(s => s.step === step)?.durationMs)
        .filter((d): d is number => d !== undefined);

      const avgDurationMs = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      return {
        step,
        reached,
        completed,
        dropOffRate: reached > 0 ? ((reached - completed) / reached) * 100 : 0,
        avgDurationMs,
      };
    });

    // Average completion time
    const completionTimes = allProgress
      .filter(p => p.isCompleted && p.completedAt)
      .map(p => p.completedAt!.getTime() - p.startedAt.getTime());

    const averageCompletionTimeMs = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      totalUsers,
      completedUsers,
      conversionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
      stepConversions,
      averageCompletionTimeMs,
    };
  }

  /**
   * Export progress data for external analytics
   */
  exportProgressData(): IOnboardingProgress[] {
    return Array.from(this.progressMap.values());
  }

  /**
   * Export event log for external analytics
   */
  exportEventLog(): IOnboardingEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.progressMap.clear();
    this.eventLog = [];
  }

  /**
   * Log onboarding event
   */
  private logEvent(
    userId: string,
    step: OnboardingStep,
    action: IOnboardingEvent['action'],
    metadata?: Record<string, unknown>
  ): void {
    const event: IOnboardingEvent = {
      userId,
      step,
      action,
      timestamp: new Date(),
      metadata,
    };

    this.eventLog.push(event);

    // Prevent memory bloat
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogSize / 2);
    }
  }

  /**
   * Format duration in human-readable form
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}ч ${minutes % 60}мин`;
    }
    if (minutes > 0) {
      return `${minutes}мин ${seconds % 60}сек`;
    }
    return `${seconds}сек`;
  }
}

// ==================== Singleton Export ====================

/** Shared instance for app-wide tracking */
export const onboardingTracker = new OnboardingTrackingService();

export default OnboardingTrackingService;
