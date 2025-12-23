/**
 * Proactive Notification Service
 * ==============================
 * Scheduled push notifications for user engagement.
 *
 * Research basis (2025):
 * - Push notifications increase adherence P<.001 (JMIR 2025)
 * - Optimal evening time: 17:00-20:00, "golden hour" 20:00 (PLOS One, ContextSDK)
 * - Morning 08:00 effective for diary completion (JMIR 2025)
 * - Re-engagement after 7+ days, not 2 days (PMC retention studies)
 * - Meta's 14-day rule: follow-ups only within 14 days of first contact
 * - Alert fatigue: max 2 notifications/day (PMC 5466696)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import * as cron from 'node-cron';
import type { Bot, Context } from 'grammy';
import {
  ContextAwareMenuService,
  type ICommandContext,
  getMoscowHour,
} from '../commands/registry';
import { dailyGreeting } from './DailyGreetingService';

// ==================== Constants (Research-Based) ====================

/**
 * Notification timing based on research
 * - Morning: 08:00 MSK (JMIR 2025 - diary completion)
 * - Evening: 20:00 MSK (PLOS One - "golden hour" 17:00-20:00)
 * - NOT 21:00 - too close to sleep time for CBT-I users
 */
const NOTIFICATION_TIMES = {
  morning: { hour: 8, cronExpression: '0 8 * * *' },
  evening: { hour: 20, cronExpression: '0 20 * * *' }, // Changed from 21:00
  reengagement: { hour: 12, cronExpression: '0 12 * * *' },
} as const;

/**
 * Re-engagement thresholds based on research
 * - PMC 9092233: 91% inactive users stay inactive
 * - Effective re-engagement starts at 7 days, not 2
 * - Meta's rule: stop follow-ups after 14 days
 */
const REENGAGEMENT_CONFIG = {
  minInactiveDays: 7,        // Changed from 2 (research: too early is ineffective)
  maxFollowUpDays: 14,       // Meta's 14-day rule
  maxNotificationsPerDay: 2, // Alert fatigue prevention
  cooldownHours: 24,         // Minimum hours between re-engagement attempts
} as const;

// ==================== Types ====================

/**
 * User notification preferences
 */
export interface INotificationPreferences {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
  timezone: string;
}

/**
 * Active user session data with Meta 14-day tracking
 */
export interface IUserNotificationData {
  chatId: number;
  userId: string;
  userName?: string;
  preferences: INotificationPreferences;
  context: Partial<ICommandContext>;
  /** First interaction date - for 14-day rule */
  firstInteractionAt: Date;
  /** Last notification sent */
  lastNotificationAt?: Date;
  /** Count of re-engagement attempts */
  reengagementAttempts: number;
  /** Last user response to notification */
  lastResponseAt?: Date;
}

/**
 * Notification job configuration
 */
export interface INotificationJob {
  id: string;
  cronExpression: string;
  type: 'morning' | 'evening' | 'reengagement';
  handler: () => Promise<void>;
}

// ==================== Proactive Notification Service ====================

/**
 * Proactive Notification Service
 * Research-compliant push notification management
 */
export class ProactiveNotificationService {
  private bot: Bot<Context>;
  private menuService: ContextAwareMenuService;
  private activeUsers: Map<string, IUserNotificationData> = new Map();
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor(bot: Bot<Context>, menuService: ContextAwareMenuService) {
    this.bot = bot;
    this.menuService = menuService;
  }

  /**
   * Start the notification service
   */
  start(): void {
    if (this.isRunning) return;

    // Morning notification - 08:00 MSK (research-backed for diary)
    this.scheduleJob({
      id: 'morning',
      cronExpression: NOTIFICATION_TIMES.morning.cronExpression,
      type: 'morning',
      handler: () => this.sendMorningNotifications(),
    });

    // Evening notification - 20:00 MSK (research: "golden hour")
    this.scheduleJob({
      id: 'evening',
      cronExpression: NOTIFICATION_TIMES.evening.cronExpression,
      type: 'evening',
      handler: () => this.sendEveningNotifications(),
    });

    // Re-engagement check - 12:00 MSK daily
    this.scheduleJob({
      id: 'reengagement',
      cronExpression: NOTIFICATION_TIMES.reengagement.cronExpression,
      type: 'reengagement',
      handler: () => this.sendReengagementNotifications(),
    });

    this.isRunning = true;
    console.log('[Notifications] Service started (research-compliant timings)');
    console.log(`[Notifications] Morning: ${NOTIFICATION_TIMES.morning.hour}:00 MSK`);
    console.log(`[Notifications] Evening: ${NOTIFICATION_TIMES.evening.hour}:00 MSK (golden hour)`);
    console.log(`[Notifications] Re-engagement: after ${REENGAGEMENT_CONFIG.minInactiveDays} days (max ${REENGAGEMENT_CONFIG.maxFollowUpDays} days)`);
  }

  /**
   * Stop the notification service
   */
  stop(): void {
    for (const [id, task] of this.jobs) {
      task.stop();
      console.log(`[Notifications] Stopped job: ${id}`);
    }
    this.jobs.clear();
    this.isRunning = false;
    console.log('[Notifications] Service stopped');
  }

  /**
   * Register user for notifications
   */
  registerUser(data: Omit<IUserNotificationData, 'firstInteractionAt' | 'reengagementAttempts'>): void {
    if (!data.preferences.enabled) return;

    const fullData: IUserNotificationData = {
      ...data,
      firstInteractionAt: new Date(),
      reengagementAttempts: 0,
    };

    this.activeUsers.set(data.userId, fullData);
    console.log(`[Notifications] Registered user: ${data.userId}`);
  }

  /**
   * Unregister user from notifications
   */
  unregisterUser(userId: string): void {
    this.activeUsers.delete(userId);
    console.log(`[Notifications] Unregistered user: ${userId}`);
  }

  /**
   * Record user response (resets 14-day window)
   * Call this when user interacts with bot
   */
  recordUserResponse(userId: string): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.lastResponseAt = new Date();
      user.reengagementAttempts = 0; // Reset on engagement
      // Extend 14-day window on response (Meta's rule)
      user.firstInteractionAt = new Date();
    }
  }

  /**
   * Update user context (for personalized notifications)
   */
  updateUserContext(userId: string, context: Partial<ICommandContext>): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.context = { ...user.context, ...context };
    }
  }

  /**
   * Check if we can send notification (Meta's 14-day rule)
   */
  private canSendFollowUp(userData: IUserNotificationData): boolean {
    const daysSinceFirstInteraction = Math.floor(
      (Date.now() - userData.firstInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Meta's rule: stop after 14 days without response
    if (daysSinceFirstInteraction > REENGAGEMENT_CONFIG.maxFollowUpDays) {
      // Check if user responded recently
      if (!userData.lastResponseAt) {
        return false;
      }
      const daysSinceResponse = Math.floor(
        (Date.now() - userData.lastResponseAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceResponse > REENGAGEMENT_CONFIG.maxFollowUpDays) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check cooldown between notifications
   */
  private isInCooldown(userData: IUserNotificationData): boolean {
    if (!userData.lastNotificationAt) return false;

    const hoursSinceNotification =
      (Date.now() - userData.lastNotificationAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceNotification < REENGAGEMENT_CONFIG.cooldownHours;
  }

  /**
   * Schedule a notification job
   */
  private scheduleJob(job: INotificationJob): void {
    const task = cron.schedule(
      job.cronExpression,
      async () => {
        console.log(`[Notifications] Running job: ${job.id}`);
        try {
          await job.handler();
        } catch (error) {
          console.error(`[Notifications] Job ${job.id} failed:`, error);
        }
      },
      { timezone: 'Europe/Moscow' }
    );

    this.jobs.set(job.id, task);
    console.log(`[Notifications] Scheduled job: ${job.id} (${job.cronExpression})`);
  }

  /**
   * Send morning notifications with integrated mood check
   * Uses DailyGreetingService for personalized, mood-aware greetings
   */
  private async sendMorningNotifications(): Promise<void> {
    const hour = getMoscowHour();
    if (hour !== NOTIFICATION_TIMES.morning.hour) return;

    for (const [userId, userData] of this.activeUsers) {
      try {
        // Check 14-day rule
        if (!this.canSendFollowUp(userData)) {
          console.log(`[Notifications] Skipping ${userId} - exceeded 14-day window`);
          continue;
        }

        const context = this.buildFullContext(userData);

        // Use DailyGreetingService for mood-integrated morning notification
        const { message, keyboard } = dailyGreeting.generateMorningNotification(
          userData.userName,
          undefined, // streak - would need to be passed in userData
          context.hasPendingDiary
        );

        // Convert InlineKeyboard to notification format
        const notification = {
          message,
          keyboard: this.convertInlineKeyboard(keyboard),
        };

        await this.sendNotification(userData.chatId, notification);
        userData.lastNotificationAt = new Date();
        console.log(`[Notifications] Sent mood-integrated morning notification to ${userId}`);
      } catch (error) {
        console.error(`[Notifications] Failed to notify ${userId}:`, error);
      }
    }
  }

  /**
   * Send evening notifications (20:00 - research "golden hour")
   * Uses DailyGreetingService for mood-aware evening greetings
   */
  private async sendEveningNotifications(): Promise<void> {
    const hour = getMoscowHour();
    if (hour !== NOTIFICATION_TIMES.evening.hour) return;

    for (const [userId, userData] of this.activeUsers) {
      try {
        // Check 14-day rule
        if (!this.canSendFollowUp(userData)) {
          continue;
        }

        const context = this.buildFullContext(userData);

        // Use DailyGreetingService for mood-integrated evening notification
        const { message, keyboard } = dailyGreeting.generateEveningNotification(
          userData.userName,
          context.hasPendingDiary
        );

        // Convert InlineKeyboard to notification format
        const notification = {
          message,
          keyboard: this.convertInlineKeyboard(keyboard),
        };

        await this.sendNotification(userData.chatId, notification);
        userData.lastNotificationAt = new Date();
        console.log(`[Notifications] Sent mood-integrated evening notification to ${userId}`);
      } catch (error) {
        console.error(`[Notifications] Failed to notify ${userId}:`, error);
      }
    }
  }

  /**
   * Convert Grammy InlineKeyboard to notification format
   */
  private convertInlineKeyboard(keyboard: any): { text: string; callbackData?: string }[][] {
    // Grammy InlineKeyboard stores buttons in inline_keyboard property
    const buttons = keyboard?.inline_keyboard || [];
    return buttons.map((row: any[]) =>
      row.map((btn: any) => ({
        text: btn.text,
        callbackData: btn.callback_data,
      }))
    );
  }

  /**
   * Send re-engagement notifications to inactive users
   * Research: 7+ days inactive, not 2 days (PMC 9092233)
   */
  private async sendReengagementNotifications(): Promise<void> {
    for (const [userId, userData] of this.activeUsers) {
      try {
        const context = this.buildFullContext(userData);

        // Research-based: wait 7 days, not 2 (PMC: early re-engagement ineffective)
        if (context.daysSinceLastActivity < REENGAGEMENT_CONFIG.minInactiveDays) {
          continue;
        }

        // Check 14-day rule
        if (!this.canSendFollowUp(userData)) {
          console.log(`[Notifications] Removing ${userId} - exceeded 14-day window without response`);
          this.activeUsers.delete(userId);
          continue;
        }

        // Check cooldown
        if (this.isInCooldown(userData)) {
          continue;
        }

        const notification = this.menuService.generateReengagementMessage(
          context,
          userData.userName
        );

        if (notification) {
          await this.sendNotification(userData.chatId, notification);
          userData.lastNotificationAt = new Date();
          userData.reengagementAttempts++;
          console.log(`[Notifications] Sent re-engagement to ${userId} (attempt ${userData.reengagementAttempts})`);
        }
      } catch (error) {
        console.error(`[Notifications] Failed to notify ${userId}:`, error);
      }
    }
  }

  /**
   * Build full context from partial user data
   */
  private buildFullContext(userData: IUserNotificationData): ICommandContext {
    const now = new Date();
    const lastActivity = userData.context.daysSinceLastActivity
      ? new Date(now.getTime() - userData.context.daysSinceLastActivity * 24 * 60 * 60 * 1000)
      : now;

    return {
      timeOfDay: userData.context.timeOfDay || 'day',
      dayOfWeek: now.getDay(),
      therapyPhase: userData.context.therapyPhase || 'active',
      therapyWeek: userData.context.therapyWeek || 1,
      hasPendingDiary: userData.context.hasPendingDiary ?? true,
      hasPendingAssessment: userData.context.hasPendingAssessment ?? false,
      daysSinceLastActivity: Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  }

  /**
   * Send notification to user
   */
  private async sendNotification(
    chatId: number,
    notification: { message: string; keyboard: { text: string; callbackData?: string }[][] }
  ): Promise<void> {
    const inlineKeyboard: { text: string; callback_data: string }[][] = notification.keyboard.map(
      (row) =>
        row.map((btn) => ({
          text: btn.text,
          callback_data: btn.callbackData || 'noop',
        }))
    );

    try {
      await this.bot.api.sendMessage(chatId, notification.message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && 'error_code' in error) {
        const grammyError = error as { error_code: number };
        if (grammyError.error_code === 403) {
          console.log(`[Notifications] User ${chatId} blocked bot, removing`);
          for (const [uId, data] of this.activeUsers) {
            if (data.chatId === chatId) {
              this.activeUsers.delete(uId);
              break;
            }
          }
        }
      }
      throw error;
    }
  }

  /**
   * Get active user count
   */
  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  /**
   * Get job status
   */
  getJobStatus(): { id: string; running: boolean }[] {
    return Array.from(this.jobs.entries()).map(([id]) => ({
      id,
      running: this.isRunning,
    }));
  }

  /**
   * Get notification config (for debugging/monitoring)
   */
  getConfig() {
    return {
      times: NOTIFICATION_TIMES,
      reengagement: REENGAGEMENT_CONFIG,
    };
  }
}

// ==================== Factory ====================

export function createProactiveNotificationService(
  bot: Bot<Context>,
  menuService: ContextAwareMenuService
): ProactiveNotificationService {
  return new ProactiveNotificationService(bot, menuService);
}

export default ProactiveNotificationService;
