/**
 * 🚨 CRISIS ESCALATION SERVICE
 * =============================
 * Handles escalation protocol for crisis events detected by CrisisDetectionService.
 *
 * Scientific Foundation (2025 Research):
 * - SAMHSA 2025 National Guidelines: continuity of care, real-time escalation
 * - Scientific Reports 2025: AI chatbots need robust escalation to human clinicians
 * - JMIR Mental Health 2025: Digital safety plans reduce ED visits by 50%
 * - Neolth model: ~30 min from detection to clinician notification
 *
 * Features:
 * - Admin Telegram notifications for HIGH/CRITICAL severity
 * - Auto-creation of Adverse Event reports for CRITICAL
 * - Safety plan flow integration
 * - Escalation audit trail for ICH E6(R3) compliance
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import { Bot, Context } from 'grammy';
import type { ICrisisEvent, CrisisAction } from './CrisisDetectionService';
import type { AdverseEventService, IAdverseEventReport } from './AdverseEventService';
import { DTX_AE_CATEGORIES } from './AdverseEventService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Escalation level based on severity
 */
export type EscalationLevel =
  | 'none'           // No escalation needed
  | 'monitor'        // Log for review
  | 'notify_async'   // Notify admins (non-blocking)
  | 'notify_urgent'  // Notify admins (urgent)
  | 'emergency';     // Emergency protocol + auto-AE

/**
 * Admin notification record
 */
export interface IAdminNotification {
  readonly id: string;
  readonly crisisEventId: string;
  readonly userId: string;
  readonly severity: string;
  readonly crisisType: string;
  readonly notifiedAdmins: string[];
  readonly sentAt: Date;
  readonly acknowledged: boolean;
  readonly acknowledgedBy?: string;
  readonly acknowledgedAt?: Date;
}

/**
 * Safety plan step
 */
export interface ISafetyPlanStep {
  readonly step: number;
  readonly title: string;
  readonly titleRu: string;
  readonly prompt: string;
  readonly promptRu: string;
  readonly examples?: string[];
  readonly examplesRu?: string[];
}

/**
 * User's safety plan
 */
export interface IUserSafetyPlan {
  readonly userId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly warningSignsRu?: string[];
  readonly warningSignsEn?: string[];
  readonly copingStrategies?: string[];
  readonly reasonsToLive?: string[];
  readonly supportContacts?: Array<{
    name: string;
    phone?: string;
    relation?: string;
  }>;
  readonly safePlaces?: string[];
  readonly professionalContacts?: Array<{
    name: string;
    phone: string;
    type: 'crisis_line' | 'therapist' | 'doctor' | 'emergency';
  }>;
}

/**
 * Escalation service configuration
 */
export interface ICrisisEscalationConfig {
  readonly enabled: boolean;
  readonly adminUserIds: string[];
  readonly adminChatId?: string;
  readonly notifyOnHigh: boolean;
  readonly notifyOnCritical: boolean;
  readonly autoCreateAE: boolean;
  readonly escalationTimeoutMinutes: number;
  readonly enableSafetyPlan: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_ESCALATION_CONFIG: ICrisisEscalationConfig = {
  enabled: true,
  adminUserIds: [],
  adminChatId: undefined,
  notifyOnHigh: true,
  notifyOnCritical: true,
  autoCreateAE: true,
  escalationTimeoutMinutes: 30,
  enableSafetyPlan: true,
};

// ============================================================================
// SAFETY PLAN TEMPLATE (Based on Stanley-Brown Safety Planning)
// ============================================================================

export const SAFETY_PLAN_STEPS: ISafetyPlanStep[] = [
  {
    step: 1,
    title: 'Warning Signs',
    titleRu: 'Предупреждающие знаки',
    prompt: 'What thoughts, feelings, or situations trigger your distress?',
    promptRu: 'Какие мысли, чувства или ситуации вызывают у тебя сильный стресс?',
    examples: ['Feeling hopeless', 'Thoughts of giving up', 'Isolating myself'],
    examplesRu: ['Чувство безнадёжности', 'Мысли о том, чтобы сдаться', 'Желание изолироваться'],
  },
  {
    step: 2,
    title: 'Coping Strategies',
    titleRu: 'Способы справиться',
    prompt: 'What can you do on your own to feel better?',
    promptRu: 'Что ты можешь сделать сам(а), чтобы почувствовать себя лучше?',
    examples: ['Take a walk', 'Listen to music', 'Deep breathing'],
    examplesRu: ['Прогуляться', 'Послушать музыку', 'Глубокое дыхание'],
  },
  {
    step: 3,
    title: 'Reasons to Live',
    titleRu: 'Ради чего жить',
    prompt: 'What gives your life meaning? Who or what matters to you?',
    promptRu: 'Что придаёт твоей жизни смысл? Кто или что важно для тебя?',
    examples: ['My family', 'My pet', 'Future goals'],
    examplesRu: ['Моя семья', 'Мой питомец', 'Мои цели'],
  },
  {
    step: 4,
    title: 'People I Can Contact',
    titleRu: 'Люди, которым я могу позвонить',
    prompt: 'Who can you reach out to when you need support?',
    promptRu: 'К кому ты можешь обратиться, когда нужна поддержка?',
  },
  {
    step: 5,
    title: 'Professional Help',
    titleRu: 'Профессиональная помощь',
    prompt: 'Crisis lines and professionals you can contact:',
    promptRu: 'Кризисные службы и специалисты, к которым можно обратиться:',
  },
  {
    step: 6,
    title: 'Making Environment Safe',
    titleRu: 'Безопасное окружение',
    prompt: 'How can you make your environment safer during a crisis?',
    promptRu: 'Как ты можешь сделать своё окружение безопаснее во время кризиса?',
  },
];

// ============================================================================
// ADMIN NOTIFICATION MESSAGES
// ============================================================================

const ADMIN_MESSAGES = {
  ru: {
    critical: `🚨 <b>КРИТИЧЕСКИЙ КРИЗИС</b> 🚨

<b>Пользователь:</b> {userId}
<b>Время:</b> {timestamp}
<b>Тип:</b> {crisisType}
<b>Уверенность:</b> {confidence}%

<b>Индикаторы:</b>
{indicators}

<b>Действие:</b> Сессия прервана, показаны кризисные ресурсы.

⚠️ Требуется проверка и follow-up в течение 30 минут.`,

    high: `⚠️ <b>ВЫСОКИЙ РИСК</b>

<b>Пользователь:</b> {userId}
<b>Время:</b> {timestamp}
<b>Тип:</b> {crisisType}
<b>Уверенность:</b> {confidence}%

<b>Индикаторы:</b>
{indicators}

<b>Действие:</b> Сессия прервана, показаны кризисные ресурсы.

Рекомендуется проверка.`,
  },
  en: {
    critical: `🚨 <b>CRITICAL CRISIS</b> 🚨

<b>User:</b> {userId}
<b>Time:</b> {timestamp}
<b>Type:</b> {crisisType}
<b>Confidence:</b> {confidence}%

<b>Indicators:</b>
{indicators}

<b>Action:</b> Session interrupted, crisis resources shown.

⚠️ Review and follow-up required within 30 minutes.`,

    high: `⚠️ <b>HIGH RISK</b>

<b>User:</b> {userId}
<b>Time:</b> {timestamp}
<b>Type:</b> {crisisType}
<b>Confidence:</b> {confidence}%

<b>Indicators:</b>
{indicators}

<b>Action:</b> Session interrupted, crisis resources shown.

Review recommended.`,
  },
};

// ============================================================================
// CRISIS ESCALATION SERVICE
// ============================================================================

/**
 * Crisis Escalation Service
 * Handles admin notifications, auto-AE creation, and safety planning
 */
export class CrisisEscalationService {
  private config: ICrisisEscalationConfig;
  private bot?: Bot<Context>;
  private aeService?: AdverseEventService;
  private notifications: IAdminNotification[] = [];
  private safetyPlans: Map<string, IUserSafetyPlan> = new Map();

  constructor(config: Partial<ICrisisEscalationConfig> = {}) {
    this.config = { ...DEFAULT_ESCALATION_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Set bot instance for sending notifications
   */
  setBot(bot: Bot<Context>): void {
    this.bot = bot;
  }

  /**
   * Set AdverseEventService for auto-AE creation
   */
  setAdverseEventService(aeService: AdverseEventService): void {
    this.aeService = aeService;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ICrisisEscalationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ICrisisEscalationConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // ESCALATION HANDLING
  // ==========================================================================

  /**
   * Handle crisis event escalation
   * Called after CrisisDetectionService detects a crisis
   */
  async escalate(event: ICrisisEvent): Promise<{
    escalated: boolean;
    level: EscalationLevel;
    notificationsSent: number;
    aeCreated: boolean;
    aeId?: number;
  }> {
    if (!this.config.enabled) {
      return { escalated: false, level: 'none', notificationsSent: 0, aeCreated: false };
    }

    const level = this.determineEscalationLevel(event);

    let notificationsSent = 0;
    let aeCreated = false;
    let aeId: number | undefined;

    // Send admin notifications for HIGH/CRITICAL
    if (level === 'notify_urgent' || level === 'emergency') {
      notificationsSent = await this.sendAdminNotifications(event);
    } else if (level === 'notify_async') {
      // Non-blocking notification for HIGH
      this.sendAdminNotifications(event).catch(err => {
        console.error('[CrisisEscalation] Failed to send async notification:', err);
      });
      notificationsSent = this.config.adminUserIds.length;
    }

    // Auto-create AE for CRITICAL
    if (level === 'emergency' && this.config.autoCreateAE) {
      const result = await this.createAdverseEventFromCrisis(event);
      aeCreated = result.created;
      aeId = result.aeId;
    }

    // Log escalation
    this.logEscalation(event, level, notificationsSent, aeCreated);

    return {
      escalated: level !== 'none' && level !== 'monitor',
      level,
      notificationsSent,
      aeCreated,
      aeId,
    };
  }

  /**
   * Determine escalation level based on crisis event
   */
  private determineEscalationLevel(event: ICrisisEvent): EscalationLevel {
    switch (event.severity) {
      case 'critical':
        return this.config.notifyOnCritical ? 'emergency' : 'monitor';
      case 'high':
        return this.config.notifyOnHigh ? 'notify_async' : 'monitor';
      case 'moderate':
        return 'monitor';
      case 'low':
        return 'monitor';
      default:
        return 'none';
    }
  }

  // ==========================================================================
  // ADMIN NOTIFICATIONS
  // ==========================================================================

  /**
   * Send notifications to all configured admins
   */
  async sendAdminNotifications(event: ICrisisEvent): Promise<number> {
    if (!this.bot) {
      console.warn('[CrisisEscalation] Bot not configured, cannot send notifications');
      return 0;
    }

    if (this.config.adminUserIds.length === 0 && !this.config.adminChatId) {
      console.warn('[CrisisEscalation] No admin recipients configured');
      return 0;
    }

    const message = this.formatAdminMessage(event);
    const notifiedAdmins: string[] = [];
    let successCount = 0;

    // Send to admin chat if configured
    if (this.config.adminChatId) {
      try {
        await this.bot.api.sendMessage(this.config.adminChatId, message, {
          parse_mode: 'HTML',
        });
        notifiedAdmins.push(`chat:${this.config.adminChatId}`);
        successCount++;
      } catch (error) {
        console.error('[CrisisEscalation] Failed to send to admin chat:', error);
      }
    }

    // Send to individual admins
    for (const adminId of this.config.adminUserIds) {
      try {
        await this.bot.api.sendMessage(adminId, message, {
          parse_mode: 'HTML',
        });
        notifiedAdmins.push(adminId);
        successCount++;
      } catch (error) {
        console.error(`[CrisisEscalation] Failed to notify admin ${adminId}:`, error);
      }
    }

    // Record notification
    if (notifiedAdmins.length > 0) {
      this.recordNotification(event, notifiedAdmins);
    }

    return successCount;
  }

  /**
   * Format admin notification message
   */
  private formatAdminMessage(event: ICrisisEvent): string {
    // Detect language from event indicators (simple heuristic)
    const isRussian = event.indicators.some(i => /[а-яё]/i.test(i));
    const lang = isRussian ? 'ru' : 'en';
    const messages = ADMIN_MESSAGES[lang];

    const template = event.severity === 'critical' ? messages.critical : messages.high;

    return template
      .replace('{userId}', event.userId)
      .replace('{timestamp}', event.timestamp.toISOString())
      .replace('{crisisType}', event.crisisType)
      .replace('{confidence}', Math.round(event.confidence * 100).toString())
      .replace('{indicators}', event.indicators.map(i => `• ${i}`).join('\n'));
  }

  /**
   * Record notification for audit trail
   */
  private recordNotification(event: ICrisisEvent, notifiedAdmins: string[]): void {
    const notification: IAdminNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      crisisEventId: `${event.userId}-${event.timestamp.getTime()}`,
      userId: event.userId,
      severity: event.severity,
      crisisType: event.crisisType,
      notifiedAdmins,
      sentAt: new Date(),
      acknowledged: false,
    };

    this.notifications.push(notification);
  }

  /**
   * Acknowledge notification (from admin dashboard)
   */
  acknowledgeNotification(notificationId: string, acknowledgedBy: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.acknowledged) {
      // TypeScript: cast to mutable for updating
      (notification as { acknowledged: boolean }).acknowledged = true;
      (notification as { acknowledgedBy?: string }).acknowledgedBy = acknowledgedBy;
      (notification as { acknowledgedAt?: Date }).acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get unacknowledged notifications
   */
  getUnacknowledgedNotifications(): IAdminNotification[] {
    return this.notifications.filter(n => !n.acknowledged);
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): readonly IAdminNotification[] {
    return [...this.notifications];
  }

  // ==========================================================================
  // AUTO ADVERSE EVENT CREATION
  // ==========================================================================

  /**
   * Create Adverse Event report from crisis event
   */
  private async createAdverseEventFromCrisis(event: ICrisisEvent): Promise<{
    created: boolean;
    aeId?: number;
  }> {
    if (!this.aeService) {
      console.warn('[CrisisEscalation] AdverseEventService not configured');
      return { created: false };
    }

    try {
      const aeReport = await this.aeService.reportAdverseEvent({
        userId: event.userId,
        cioms: {
          reporterType: 'patient',
          patientId: event.userId,
          productName: 'SleepCore DTx',
          productVersion: '1.0.0-alpha.4',
          reactionTerm: DTX_AE_CATEGORIES.SUICIDAL_IDEATION.term,
          reactionOnsetDate: event.timestamp,
        },
        severity: 'severe',
        isSerious: true,
        seriousnessCriteria: ['medically_important'],
        expectedness: 'expected', // Suicidal ideation is a known risk in mental health treatment
        dtxCategory: 'SUICIDAL_IDEATION',
        description: `Auto-generated AE from crisis detection. Type: ${event.crisisType}. Confidence: ${Math.round(event.confidence * 100)}%. Indicators: ${event.indicators.join(', ')}`,
        onsetDate: event.timestamp,
        outcome: 'unknown',
        causality: 'possible',
        actionTaken: 'temporarily_interrupted',
        reportedBy: 'system',
      });

      console.log('[CrisisEscalation] Auto-created AE report:', aeReport.id);
      return { created: true, aeId: aeReport.id };
    } catch (error) {
      console.error('[CrisisEscalation] Failed to create AE:', error);
      return { created: false };
    }
  }

  // ==========================================================================
  // SAFETY PLAN
  // ==========================================================================

  /**
   * Get safety plan steps for user
   */
  getSafetyPlanSteps(language: 'ru' | 'en' = 'ru'): ISafetyPlanStep[] {
    return SAFETY_PLAN_STEPS;
  }

  /**
   * Get user's existing safety plan
   */
  getUserSafetyPlan(userId: string): IUserSafetyPlan | undefined {
    return this.safetyPlans.get(userId);
  }

  /**
   * Save user's safety plan
   */
  saveUserSafetyPlan(userId: string, plan: Partial<IUserSafetyPlan>): IUserSafetyPlan {
    const existing = this.safetyPlans.get(userId);
    const now = new Date();

    const updatedPlan: IUserSafetyPlan = {
      userId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      warningSignsRu: plan.warningSignsRu || existing?.warningSignsRu,
      warningSignsEn: plan.warningSignsEn || existing?.warningSignsEn,
      copingStrategies: plan.copingStrategies || existing?.copingStrategies,
      reasonsToLive: plan.reasonsToLive || existing?.reasonsToLive,
      supportContacts: plan.supportContacts || existing?.supportContacts,
      safePlaces: plan.safePlaces || existing?.safePlaces,
      professionalContacts: plan.professionalContacts || existing?.professionalContacts || [
        { name: 'Телефон доверия', phone: '8-800-2000-122', type: 'crisis_line' },
        { name: 'Экстренная помощь', phone: '112', type: 'emergency' },
      ],
    };

    this.safetyPlans.set(userId, updatedPlan);
    return updatedPlan;
  }

  /**
   * Check if user has safety plan
   */
  hasSafetyPlan(userId: string): boolean {
    return this.safetyPlans.has(userId);
  }

  /**
   * Generate safety plan keyboard for Telegram
   */
  getSafetyPlanKeyboard(userId: string, language: 'ru' | 'en' = 'ru'): Array<Array<{ text: string; callback_data: string }>> {
    const plan = this.safetyPlans.get(userId);
    const hasExistingPlan = !!plan;

    if (language === 'ru') {
      return [
        [
          hasExistingPlan
            ? { text: '📋 Мой план безопасности', callback_data: 'safety:view' }
            : { text: '📋 Создать план безопасности', callback_data: 'safety:create' },
        ],
        [
          { text: '📞 Телефон доверия', callback_data: 'sos:hotline' },
          { text: '🆘 Экстренная помощь', callback_data: 'sos:emergency' },
        ],
      ];
    }

    return [
      [
        hasExistingPlan
          ? { text: '📋 My Safety Plan', callback_data: 'safety:view' }
          : { text: '📋 Create Safety Plan', callback_data: 'safety:create' },
      ],
      [
        { text: '📞 Crisis Hotline', callback_data: 'sos:hotline' },
        { text: '🆘 Emergency', callback_data: 'sos:emergency' },
      ],
    ];
  }

  // ==========================================================================
  // LOGGING & AUDIT
  // ==========================================================================

  /**
   * Log escalation for audit trail
   */
  private logEscalation(
    event: ICrisisEvent,
    level: EscalationLevel,
    notificationsSent: number,
    aeCreated: boolean
  ): void {
    console.log('[CrisisEscalation] Escalation processed:', {
      userId: event.userId,
      severity: event.severity,
      crisisType: event.crisisType,
      escalationLevel: level,
      notificationsSent,
      aeCreated,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create crisis escalation service
 */
export function createCrisisEscalationService(
  config?: Partial<ICrisisEscalationConfig>
): CrisisEscalationService {
  return new CrisisEscalationService(config);
}

/**
 * Default escalation service instance
 */
export const crisisEscalationService = createCrisisEscalationService();
