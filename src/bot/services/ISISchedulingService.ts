/**
 * ISI Scheduling Service
 * ======================
 * Automated biweekly ISI (Insomnia Severity Index) assessment scheduling.
 *
 * Research basis (2025):
 * - ISI standard recall period: "last month" or "last 2 weeks" (Morin et al., 2011)
 * - dCBT-I protocols: assessments at baseline, W2, W4, W6, W8, W12 (DREAM/SLEEP-I)
 * - MCID (between-group): 4 points; MIC (within-person): 6-7 points (PMC 3079939)
 * - Semi-random scheduling improves compliance (JMIR EMA 2024)
 *
 * Schedule:
 * - Baseline: At enrollment (via /start)
 * - Week 2, 4, 6: Treatment phase assessments
 * - Week 8: End of treatment
 * - Week 12: Follow-up assessment
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import * as cron from 'node-cron';
import type { Bot, Context } from 'grammy';
import { formatter } from '../commands/utils/MessageFormatter';
import { sonya } from '../persona';
import type { ISIScheduleRepository } from '../../infrastructure/database/repositories/ISIScheduleRepository';

// ==================== Constants ====================

/**
 * ISI Assessment Schedule
 * Based on dCBT-I clinical trial protocols (Somryst DREAM, Sleepio SAC)
 */
const ISI_SCHEDULE = {
  /** Assessment interval in days (2 weeks = 14 days) */
  intervalDays: 14,
  /** Time of day for assessment notification (10:00 MSK) */
  notificationHour: 10,
  /** Reminder if not completed within N hours */
  reminderAfterHours: 24,
  /** Assessment windows (weeks from enrollment) */
  assessmentWeeks: [0, 2, 4, 6, 8, 12],
  /** Cron expression for daily check (10:00 MSK) */
  cronExpression: '0 10 * * *',
} as const;

/**
 * Assessment status tracking
 */
interface IUserAssessmentData {
  chatId: number;
  odlikerId: string;
  userName?: string;
  enrollmentDate: Date;
  lastAssessmentDate?: Date;
  lastAssessmentWeek?: number;
  nextAssessmentWeek: number;
  reminderSent: boolean;
  /** ISI scores history */
  isiHistory: Array<{ week: number; score: number; date: Date }>;
}

// ==================== ISI Scheduling Service ====================

/**
 * ISI Scheduling Service
 * Manages biweekly ISI assessment reminders for all enrolled users
 */
export class ISISchedulingService {
  private bot: Bot<Context>;
  private users: Map<string, IUserAssessmentData> = new Map();
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private repo?: ISIScheduleRepository;

  constructor(bot: Bot<Context>) {
    this.bot = bot;
  }

  /**
   * Set repository for persistence. Hydrates Map from DB.
   */
  async setRepository(repo: ISIScheduleRepository): Promise<void> {
    this.repo = repo;
    await this.loadFromDB();
  }

  private async loadFromDB(): Promise<void> {
    if (!this.repo) return;
    try {
      const entities = await this.repo.findAll();
      for (const e of entities) {
        this.users.set(e.userId, {
          chatId: e.chatId,
          odlikerId: e.userId,
          userName: e.userName,
          enrollmentDate: e.enrollmentDate,
          lastAssessmentDate: e.lastAssessmentDate,
          lastAssessmentWeek: e.lastAssessmentWeek,
          nextAssessmentWeek: e.nextAssessmentWeek,
          reminderSent: e.reminderSent,
          isiHistory: e.isiHistory,
        });
      }
      console.log(`[ISI Schedule] Loaded ${entities.length} users from DB`);
    } catch (err) {
      console.error('[ISI Schedule] DB load failed:', err);
    }
  }

  private persistUser(userId: string, data: IUserAssessmentData): void {
    if (!this.repo) return;
    this.repo.upsert(userId, {
      userId,
      chatId: data.chatId,
      userName: data.userName,
      enrollmentDate: data.enrollmentDate,
      lastAssessmentDate: data.lastAssessmentDate,
      lastAssessmentWeek: data.lastAssessmentWeek,
      nextAssessmentWeek: data.nextAssessmentWeek,
      reminderSent: data.reminderSent,
      isiHistory: data.isiHistory,
    }).catch(err => {
      console.error(`[ISI Schedule] Failed to persist user ${userId}:`, err);
    });
  }

  private persistDelete(userId: string): void {
    if (!this.repo) return;
    this.repo.deleteByUserId(userId).catch(err => {
      console.error(`[ISI Schedule] Failed to delete user ${userId} from DB:`, err);
    });
  }

  /**
   * Start the ISI scheduling service
   */
  start(): void {
    if (this.isRunning) return;

    // Schedule daily check at 10:00 MSK
    this.cronJob = cron.schedule(
      ISI_SCHEDULE.cronExpression,
      async () => {
        console.log('[ISI Schedule] Running daily assessment check');
        await this.checkAndSendAssessments();
      },
      { timezone: 'Europe/Moscow' }
    );

    this.isRunning = true;
    console.log('[ISI Schedule] Service started');
    console.log(`[ISI Schedule] Notification time: ${ISI_SCHEDULE.notificationHour}:00 MSK`);
    console.log(`[ISI Schedule] Assessment interval: every ${ISI_SCHEDULE.intervalDays} days`);
    console.log(`[ISI Schedule] Assessment weeks: ${ISI_SCHEDULE.assessmentWeeks.join(', ')}`);
  }

  /**
   * Stop the ISI scheduling service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('[ISI Schedule] Service stopped');
  }

  /**
   * Enroll user in ISI assessment schedule
   * Called after consent is given and baseline ISI is completed
   */
  enrollUser(
    userId: string,
    chatId: number,
    userName?: string,
    baselineISI?: number
  ): void {
    const enrollmentDate = new Date();

    const userData: IUserAssessmentData = {
      chatId,
      odlikerId: userId,
      userName,
      enrollmentDate,
      lastAssessmentDate: baselineISI !== undefined ? enrollmentDate : undefined,
      lastAssessmentWeek: baselineISI !== undefined ? 0 : undefined,
      nextAssessmentWeek: baselineISI !== undefined ? 2 : 0, // Week 2 if baseline done, else 0
      reminderSent: false,
      isiHistory: baselineISI !== undefined
        ? [{ week: 0, score: baselineISI, date: enrollmentDate }]
        : [],
    };

    this.users.set(userId, userData);
    this.persistUser(userId, userData);
    console.log(`[ISI Schedule] Enrolled user ${userId}, next assessment: Week ${userData.nextAssessmentWeek}`);
  }

  /**
   * Record ISI assessment completion
   */
  recordAssessment(userId: string, isiScore: number): void {
    const user = this.users.get(userId);
    if (!user) {
      console.warn(`[ISI Schedule] User ${userId} not enrolled, cannot record assessment`);
      return;
    }

    const currentWeek = this.getCurrentWeek(user.enrollmentDate);

    // Update user data
    user.lastAssessmentDate = new Date();
    user.lastAssessmentWeek = currentWeek;
    user.reminderSent = false;

    // Add to history
    user.isiHistory.push({
      week: currentWeek,
      score: isiScore,
      date: new Date(),
    });

    // Calculate next assessment week
    const nextWeekIndex = ISI_SCHEDULE.assessmentWeeks.findIndex((w) => w > currentWeek);
    user.nextAssessmentWeek = nextWeekIndex >= 0
      ? ISI_SCHEDULE.assessmentWeeks[nextWeekIndex]
      : -1; // -1 means study completed

    this.persistUser(userId, user);

    console.log(`[ISI Schedule] User ${userId} completed Week ${currentWeek} ISI (score: ${isiScore})`);
    console.log(`[ISI Schedule] Next assessment: ${user.nextAssessmentWeek >= 0 ? `Week ${user.nextAssessmentWeek}` : 'Study complete'}`);

    // Check for clinically significant change
    this.checkClinicalChange(userId, user);
  }

  /**
   * Unenroll user from ISI schedule
   */
  unenrollUser(userId: string): void {
    this.users.delete(userId);
    this.persistDelete(userId);
    console.log(`[ISI Schedule] Unenrolled user ${userId}`);
  }

  /**
   * Check and send assessments for all enrolled users
   */
  private async checkAndSendAssessments(): Promise<void> {
    const now = new Date();

    for (const [userId, userData] of this.users) {
      try {
        // Skip if study completed
        if (userData.nextAssessmentWeek < 0) continue;

        const currentWeek = this.getCurrentWeek(userData.enrollmentDate);

        // Check if it's time for assessment
        if (currentWeek >= userData.nextAssessmentWeek) {
          // Check if already sent reminder today
          if (userData.reminderSent) {
            // Check if we need to send follow-up reminder
            const hoursSinceLastAssessment = userData.lastAssessmentDate
              ? (now.getTime() - userData.lastAssessmentDate.getTime()) / (1000 * 60 * 60)
              : Infinity;

            if (hoursSinceLastAssessment > ISI_SCHEDULE.reminderAfterHours) {
              await this.sendFollowUpReminder(userData);
            }
            continue;
          }

          // Send initial assessment notification
          await this.sendAssessmentNotification(userData, currentWeek);
          userData.reminderSent = true;
          this.persistUser(userId, userData);
        }
      } catch (error) {
        console.error(`[ISI Schedule] Error processing user ${userId}:`, error);
      }
    }
  }

  /**
   * Send ISI assessment notification
   */
  private async sendAssessmentNotification(
    userData: IUserAssessmentData,
    currentWeek: number
  ): Promise<void> {
    const name = userData.userName || 'друг';

    // Get appropriate message based on week
    let weekDescription: string;
    if (currentWeek === 0) {
      weekDescription = 'начальная оценка';
    } else if (currentWeek === 8) {
      weekDescription = 'завершение основной программы';
    } else if (currentWeek === 12) {
      weekDescription = 'контрольная оценка';
    } else {
      weekDescription = `неделя ${currentWeek}`;
    }

    const encouragement = sonya.encourageByWeek(Math.min(currentWeek, 8));

    const message = `
${formatter.header('Время оценки сна')}

${encouragement.emoji} Привет, ${name}!

Пришло время оценить качество твоего сна (*${weekDescription}*).

Это займёт всего *2-3 минуты* и поможет отслеживать прогресс.

${formatter.divider()}

${this.getProgressMessage(userData)}

${formatter.tip('Регулярная оценка — ключ к успеху терапии')}
    `.trim();

    const keyboard = [
      [{ text: '📋 Пройти оценку ISI', callback_data: 'isi_schedule:start_assessment' }],
      [{ text: '⏰ Напомнить позже', callback_data: 'isi_schedule:remind_later' }],
    ];

    try {
      await this.bot.api.sendMessage(userData.chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
      });
      console.log(`[ISI Schedule] Sent assessment notification to user ${userData.odlikerId}`);
    } catch (error) {
      this.handleSendError(error, userData);
    }
  }

  /**
   * Send follow-up reminder if assessment not completed
   */
  private async sendFollowUpReminder(userData: IUserAssessmentData): Promise<void> {
    const name = userData.userName || 'друг';

    const message = `
${sonya.emoji} ${name}, напоминаю об оценке сна!

Ты ещё не прошёл(а) ISI-опрос. Это важно для отслеживания прогресса.

${formatter.tip('Оценка займёт всего 2-3 минуты')}
    `.trim();

    const keyboard = [
      [{ text: '📋 Пройти сейчас', callback_data: 'isi_schedule:start_assessment' }],
    ];

    try {
      await this.bot.api.sendMessage(userData.chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
      });
      console.log(`[ISI Schedule] Sent follow-up reminder to user ${userData.odlikerId}`);
    } catch (error) {
      this.handleSendError(error, userData);
    }
  }

  /**
   * Get progress message based on ISI history
   */
  private getProgressMessage(userData: IUserAssessmentData): string {
    if (userData.isiHistory.length < 2) {
      return '📊 Это поможет создать базовую линию для сравнения.';
    }

    const baseline = userData.isiHistory[0];
    const latest = userData.isiHistory[userData.isiHistory.length - 1];
    const change = baseline.score - latest.score;

    if (change >= 7) {
      return `📊 *Отличный прогресс!* ISI снизился на ${change} баллов с начала программы.`;
    } else if (change >= 4) {
      return `📊 *Хороший прогресс!* ISI снизился на ${change} балла. Продолжай в том же духе!`;
    } else if (change > 0) {
      return `📊 ISI снизился на ${change} балла. Каждый шаг важен!`;
    } else if (change === 0) {
      return '📊 ISI пока на том же уровне. Терапии нужно время — продолжай!';
    } else {
      return '📊 Давай оценим текущее состояние и скорректируем программу.';
    }
  }

  /**
   * Check for clinically significant change and notify
   */
  private checkClinicalChange(userId: string, userData: IUserAssessmentData): void {
    if (userData.isiHistory.length < 2) return;

    const baseline = userData.isiHistory[0];
    const latest = userData.isiHistory[userData.isiHistory.length - 1];
    const change = baseline.score - latest.score;

    // MCID threshold: 6-7 points within-person (PMC 3079939)
    if (change >= 7) {
      console.log(`[ISI Schedule] User ${userId} achieved MCID: ${change} point reduction`);
      // Could trigger celebration notification or badge
    }

    // Remission threshold: ISI < 8
    if (latest.score < 8 && baseline.score >= 8) {
      console.log(`[ISI Schedule] User ${userId} achieved remission (ISI < 8)`);
      // Could trigger special notification
    }

    // Worsening detection: ISI increase ≥ 7 (safety monitoring)
    if (change <= -7) {
      console.warn(`[ISI Schedule] SAFETY ALERT: User ${userId} ISI worsened by ${Math.abs(change)} points`);
      // Should trigger safety protocol / adverse event reporting
    }
  }

  /**
   * Calculate current week from enrollment
   */
  private getCurrentWeek(enrollmentDate: Date): number {
    const now = new Date();
    const daysSinceEnrollment = Math.floor(
      (now.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.floor(daysSinceEnrollment / 7);
  }

  /**
   * Handle send errors (user blocked bot, etc.)
   */
  private handleSendError(error: unknown, userData: IUserAssessmentData): void {
    if (error instanceof Error && 'error_code' in error) {
      const grammyError = error as { error_code: number };
      if (grammyError.error_code === 403) {
        console.log(`[ISI Schedule] User ${userData.odlikerId} blocked bot, removing from schedule`);
        this.users.delete(userData.odlikerId);
        this.persistDelete(userData.odlikerId);
        return;
      }
    }
    throw error;
  }

  /**
   * Get user assessment data (for external queries)
   */
  getUserData(userId: string): IUserAssessmentData | undefined {
    return this.users.get(userId);
  }

  /**
   * Get all enrolled users count
   */
  getEnrolledCount(): number {
    return this.users.size;
  }

  /**
   * Get service configuration
   */
  getConfig() {
    return ISI_SCHEDULE;
  }

  /**
   * Check if user is due for assessment
   */
  isAssessmentDue(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const currentWeek = this.getCurrentWeek(user.enrollmentDate);
    return currentWeek >= user.nextAssessmentWeek && user.nextAssessmentWeek >= 0;
  }

  /**
   * Get next assessment info for user
   */
  getNextAssessmentInfo(userId: string): { week: number; daysUntil: number } | null {
    const user = this.users.get(userId);
    if (!user || user.nextAssessmentWeek < 0) return null;

    const currentWeek = this.getCurrentWeek(user.enrollmentDate);
    const weeksUntil = user.nextAssessmentWeek - currentWeek;
    const daysUntil = Math.max(0, weeksUntil * 7);

    return {
      week: user.nextAssessmentWeek,
      daysUntil,
    };
  }
}

// ==================== Factory ====================

export function createISISchedulingService(bot: Bot<Context>): ISISchedulingService {
  return new ISISchedulingService(bot);
}

export default ISISchedulingService;
