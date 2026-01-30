/**
 * /diary Command - 3-Tap Sleep Diary Entry
 * =========================================
 * Quick sleep diary logging with minimal taps.
 *
 * UX Research (JMIR 2025):
 * - 88% of users find sleep diary most important feature
 * - 3-tap entry improves adherence by 44%
 * - Morning completion is standard CBT-I practice
 *
 * Flow:
 * 1. Bedtime (quick time picker)
 * 2. Wake time (quick time picker)
 * 3. Sleep quality (1-5 rating)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import type { ISleepDiaryEntry } from '../../sleep/interfaces/ISleepState';
import type { ICBTIIntervention } from '../../cbt-i/interfaces/ICBTIComponents';
import type { IThirdWaveRecommendation } from '../../third-wave/interfaces/IThirdWaveTherapies';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';

/**
 * Diary entry steps
 */
type DiaryStep =
  | 'intro'
  | 'bedtime_hour'
  | 'bedtime_minute'
  | 'waketime_hour'
  | 'waketime_minute'
  | 'sleep_quality'
  | 'summary';

/**
 * Processing result from SleepCoreAPI
 *
 * Extended January 2026 to include third-wave therapy fields
 * for CBT-I non-responder detection (European Guideline 2023 stepped care)
 */
interface ProcessingResult {
  metrics: import('../../sleep/interfaces/ISleepState').ISleepMetrics | null;
  entriesCount: number;
  planCreated: boolean;
  intervention: ICBTIIntervention | null;
  message: string;
  /** Third-wave therapy recommendation when CBT-I non-response detected */
  thirdWaveRecommendation: IThirdWaveRecommendation | null;
  /** True if non-response detected after Week 6 (ISI reduction < 8 points) */
  isNonResponding: boolean;
}

/**
 * Diary entry data
 */
interface DiaryData {
  date: string;
  bedtimeHour?: number;
  bedtimeMinute?: number;
  waketimeHour?: number;
  waketimeMinute?: number;
  sleepQuality?: number;
  processingResult?: ProcessingResult;
  [key: string]: unknown; // Index signature for Record compatibility
}

/**
 * /diary Command Implementation
 */
export class DiaryCommand implements IConversationCommand {
  readonly name = 'diary';
  readonly description = 'Записать сон в дневник';
  readonly aliases = ['sleep', 'log', 'дневник'];
  readonly requiresSession = true;

  readonly steps: DiaryStep[] = [
    'intro',
    'bedtime_hour',
    'bedtime_minute',
    'waketime_hour',
    'waketime_minute',
    'sleep_quality',
    'summary',
  ];

  /**
   * Main execute method
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const today = new Date().toISOString().split('T')[0];
    return this.handleStep(ctx, 'intro', { date: today });
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const diaryData = data as DiaryData;

    switch (step as DiaryStep) {
      case 'intro':
        return this.showIntro(ctx, diaryData);
      case 'bedtime_hour':
        return this.showBedtimeHour(ctx, diaryData);
      case 'bedtime_minute':
        return this.showBedtimeMinute(ctx, diaryData);
      case 'waketime_hour':
        return this.showWaketimeHour(ctx, diaryData);
      case 'waketime_minute':
        return this.showWaketimeMinute(ctx, diaryData);
      case 'sleep_quality':
        return this.showSleepQuality(ctx, diaryData);
      case 'summary':
        return this.showSummary(ctx, diaryData);
      default:
        return { success: false, error: `Unknown step: ${step}` };
    }
  }

  /**
   * Handle callback button press
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    if (parts[0] !== 'diary') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];
    const value = parts[2];
    const diaryData = conversationData as DiaryData;

    switch (action) {
      case 'quick':
        return this.handleQuickEntry(ctx, value, diaryData);
      case 'bedtime_hour':
        diaryData.bedtimeHour = parseInt(value);
        return this.handleStep(ctx, 'bedtime_minute', diaryData);
      case 'bedtime_min':
        diaryData.bedtimeMinute = parseInt(value);
        return this.handleStep(ctx, 'waketime_hour', diaryData);
      case 'wake_hour':
        diaryData.waketimeHour = parseInt(value);
        return this.handleStep(ctx, 'waketime_minute', diaryData);
      case 'wake_min':
        diaryData.waketimeMinute = parseInt(value);
        return this.handleStep(ctx, 'sleep_quality', diaryData);
      case 'quality':
        diaryData.sleepQuality = parseInt(value);
        return this.saveDiaryEntry(ctx, diaryData);
      case 'confirm':
        return this.handleStep(ctx, 'summary', diaryData);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ==================== Step Handlers ====================

  private async showIntro(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const dateStr = formatter.formatDate(new Date(data.date));
    const greeting = sonya.greet({ timeOfDay: this.getTimeOfDay() });

    const message = `
${sonya.emoji} *${sonya.name}*

${greeting.text}

${formatter.header('Дневник сна')}

📅 *${dateStr}*

Расскажи, как ты спал(а) прошлой ночью.
Это займёт всего *3 касания*.

${sonya.tip('Регулярное ведение дневника — ключ к успеху КПТ-И')}
    `.trim();

    // Quick entry options for common patterns
    const keyboard: IInlineButton[][] = [
      [
        { text: '🌙 22:00-6:00', callbackData: 'diary:quick:22-6' },
        { text: '🌙 23:00-7:00', callbackData: 'diary:quick:23-7' },
      ],
      [
        { text: '🌙 00:00-7:00', callbackData: 'diary:quick:0-7' },
        { text: '🌙 00:00-8:00', callbackData: 'diary:quick:0-8' },
      ],
      [{ text: '⚙️ Ввести вручную', callbackData: 'diary:bedtime_hour:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'intro', ...data },
    };
  }

  private async handleQuickEntry(
    ctx: ISleepCoreContext,
    value: string,
    data: DiaryData
  ): Promise<ICommandResult> {
    const [bedtime, waketime] = value.split('-').map((v) => parseInt(v));

    data.bedtimeHour = bedtime;
    data.bedtimeMinute = 0;
    data.waketimeHour = waketime;
    data.waketimeMinute = 0;

    return this.handleStep(ctx, 'sleep_quality', data);
  }

  private async showBedtimeHour(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const message = `
${formatter.header('Шаг 1/3: Время отхода ко сну')}

🛏 Во сколько вы легли спать?

_Выберите час:_
    `.trim();

    // Evening hours keyboard
    const keyboard: IInlineButton[][] = [
      [
        { text: '21:00', callbackData: 'diary:bedtime_hour:21' },
        { text: '22:00', callbackData: 'diary:bedtime_hour:22' },
        { text: '23:00', callbackData: 'diary:bedtime_hour:23' },
      ],
      [
        { text: '00:00', callbackData: 'diary:bedtime_hour:0' },
        { text: '01:00', callbackData: 'diary:bedtime_hour:1' },
        { text: '02:00', callbackData: 'diary:bedtime_hour:2' },
      ],
      [
        { text: '03:00', callbackData: 'diary:bedtime_hour:3' },
        { text: 'Раньше 21', callbackData: 'diary:bedtime_hour:20' },
        { text: 'Позже 03', callbackData: 'diary:bedtime_hour:4' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'bedtime_hour', ...data },
    };
  }

  private async showBedtimeMinute(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const hour = data.bedtimeHour?.toString().padStart(2, '0');

    const message = `
${formatter.header('Шаг 1/3: Время отхода ко сну')}

🛏 Легли в *${hour}:__*

_Выберите минуты:_
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: ':00', callbackData: 'diary:bedtime_min:0' },
        { text: ':15', callbackData: 'diary:bedtime_min:15' },
        { text: ':30', callbackData: 'diary:bedtime_min:30' },
        { text: ':45', callbackData: 'diary:bedtime_min:45' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'bedtime_minute', ...data },
    };
  }

  private async showWaketimeHour(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const bedtime = this.formatTime(data.bedtimeHour!, data.bedtimeMinute!);

    const message = `
${formatter.header('Шаг 2/3: Время пробуждения')}

🛏 Легли: ${bedtime}
⏰ Проснулись во сколько?

_Выберите час:_
    `.trim();

    // Morning hours keyboard
    const keyboard: IInlineButton[][] = [
      [
        { text: '05:00', callbackData: 'diary:wake_hour:5' },
        { text: '06:00', callbackData: 'diary:wake_hour:6' },
        { text: '07:00', callbackData: 'diary:wake_hour:7' },
      ],
      [
        { text: '08:00', callbackData: 'diary:wake_hour:8' },
        { text: '09:00', callbackData: 'diary:wake_hour:9' },
        { text: '10:00', callbackData: 'diary:wake_hour:10' },
      ],
      [
        { text: 'Раньше 05', callbackData: 'diary:wake_hour:4' },
        { text: 'Позже 10', callbackData: 'diary:wake_hour:11' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'waketime_hour', ...data },
    };
  }

  private async showWaketimeMinute(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const hour = data.waketimeHour?.toString().padStart(2, '0');

    const message = `
${formatter.header('Шаг 2/3: Время пробуждения')}

⏰ Проснулись в *${hour}:__*

_Выберите минуты:_
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: ':00', callbackData: 'diary:wake_min:0' },
        { text: ':15', callbackData: 'diary:wake_min:15' },
        { text: ':30', callbackData: 'diary:wake_min:30' },
        { text: ':45', callbackData: 'diary:wake_min:45' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'waketime_minute', ...data },
    };
  }

  private async showSleepQuality(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const bedtime = this.formatTime(data.bedtimeHour!, data.bedtimeMinute!);
    const waketime = this.formatTime(data.waketimeHour!, data.waketimeMinute!);
    const duration = this.calculateDuration(data);

    const message = `
${formatter.header('Шаг 3/3: Качество сна')}

🛏 ${bedtime} → ⏰ ${waketime}
⏱ В постели: ${formatter.duration(duration)}

*Как вы оцениваете качество сна?*
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '😫 1', callbackData: 'diary:quality:1' },
        { text: '😕 2', callbackData: 'diary:quality:2' },
        { text: '😐 3', callbackData: 'diary:quality:3' },
        { text: '🙂 4', callbackData: 'diary:quality:4' },
        { text: '😊 5', callbackData: 'diary:quality:5' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'sleep_quality', ...data },
    };
  }

  private async saveDiaryEntry(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    // Validate required fields
    if (
      data.bedtimeHour === undefined ||
      data.bedtimeMinute === undefined ||
      data.waketimeHour === undefined ||
      data.waketimeMinute === undefined ||
      data.sleepQuality === undefined
    ) {
      return {
        success: false,
        message: `${sonya.emoji} Данные сессии потеряны. Пожалуйста, начните заново с /diary`,
      };
    }

    const bedtime = this.formatTime(data.bedtimeHour, data.bedtimeMinute);
    const waketime = this.formatTime(data.waketimeHour, data.waketimeMinute);
    const durationMinutes = this.calculateDuration(data);

    // Build full diary entry
    const qualityMap = ['very_poor', 'poor', 'fair', 'good', 'excellent'] as const;
    const entry: ISleepDiaryEntry = {
      userId: ctx.userId,
      date: data.date,
      bedtime,
      lightsOffTime: bedtime,
      sleepOnsetLatency: 15, // Default estimate
      numberOfAwakenings: 1,
      wakeAfterSleepOnset: Math.round(durationMinutes * 0.1),
      finalAwakening: waketime,
      outOfBedTime: waketime,
      subjectiveQuality: qualityMap[data.sleepQuality! - 1] || 'fair',
      morningAlertness: data.sleepQuality!,
    };

    // CRITICAL FIX (January 2026 Audit):
    // Use processNewDiaryEntry() instead of addDiaryEntry()
    // This connects the diary → plan → intervention pipeline
    try {
      const result = await ctx.sleepCore.processNewDiaryEntry(entry);

      // Store processing result for summary display
      data.processingResult = {
        metrics: result.metrics,
        entriesCount: result.entriesCount,
        planCreated: result.planCreated,
        intervention: result.intervention,
        message: result.message,
        thirdWaveRecommendation: result.thirdWaveRecommendation,
        isNonResponding: result.isNonResponding,
      };
    } catch (error) {
      console.error('Failed to process diary entry:', error);
      // Fallback to simple add if integration fails
      try {
        ctx.sleepCore.addDiaryEntry(entry);
        data.processingResult = {
          metrics: null,
          entriesCount: 0,
          planCreated: false,
          intervention: null,
          message: 'Запись сохранена.',
          thirdWaveRecommendation: null,
          isNonResponding: false,
        };
      } catch (e) {
        console.error('Failed to save diary entry:', e);
      }
    }

    return this.handleStep(ctx, 'summary', data);
  }

  private async showSummary(
    ctx: ISleepCoreContext,
    data: DiaryData
  ): Promise<ICommandResult> {
    const bedtime = this.formatTime(data.bedtimeHour!, data.bedtimeMinute!);
    const waketime = this.formatTime(data.waketimeHour!, data.waketimeMinute!);
    const durationMinutes = this.calculateDuration(data);

    // Quality emoji
    const qualityEmoji = ['', '😫', '😕', '😐', '🙂', '😊'][data.sleepQuality!];

    // Get processing result (from integration)
    const result = data.processingResult;
    const sleepEfficiency = result?.metrics?.sleepEfficiency ?? 85;
    const entriesCount = result?.entriesCount ?? 1;

    // Build main message based on treatment status
    let statusSection = '';
    let interventionSection = '';

    if (result?.planCreated) {
      // Plan was just created!
      statusSection = `
${formatter.divider()}

🎉 *Базовый период завершён!*

Собрано данных: *${entriesCount} дней*
Ваш персональный план КПТ-И готов.
      `.trim();
    } else if (entriesCount < 7) {
      // Still collecting baseline
      const remaining = 7 - entriesCount;
      statusSection = `
${formatter.divider()}

📊 *Сбор базовых данных*

День: ${entriesCount}/7
${formatter.progressBar((entriesCount / 7) * 100, 7)}

Ещё ${remaining} ${this.pluralizeDays(remaining)} до начала терапии.
      `.trim();
    } else {
      // Active treatment
      statusSection = `
${formatter.divider()}

${formatter.sleepEfficiency(sleepEfficiency)}
${result?.message || ''}
      `.trim();
    }

    // Show intervention if available
    if (result?.intervention) {
      const intervention = result.intervention;
      const componentEmoji: Record<string, string> = {
        sleep_restriction: '⏰',
        stimulus_control: '🛏',
        cognitive_restructuring: '💭',
        sleep_hygiene: '🌙',
        relaxation: '🧘',
      };
      const emoji = componentEmoji[intervention.component] || '💡';

      interventionSection = `
${formatter.divider()}

${emoji} *Рекомендация на сегодня*

${intervention.action}

_${intervention.rationale}_
      `.trim();
    }

    // Show non-response detection and third-wave recommendation
    // (European Guideline 2023 stepped care model)
    let nonResponseSection = '';
    if (result?.isNonResponding && result?.thirdWaveRecommendation) {
      const rec = result.thirdWaveRecommendation;
      const approachNames: Record<string, string> = {
        mbti: 'Терапия осознанности (MBT-I)',
        acti: 'Терапия принятия (ACT-I)',
        mct: 'Метакогнитивная терапия (MCT)',
        hybrid: 'Комбинированный подход',
      };
      const approachName = approachNames[rec.recommendedApproach] || 'альтернативный подход';

      if (rec.recommendedApproach !== 'none') {
        nonResponseSection = `
${formatter.divider()}

💡 *Рекомендация по терапии*

Стандартная КПТ-И показывает ограниченный эффект.
Рекомендуется: *${approachName}*

_${rec.rationale}_
        `.trim();
      }
    }

    // Sonya's response based on context
    let sonyaResponse: string;
    if (result?.planCreated) {
      sonyaResponse = sonya.celebrate('План терапии готов! Начинаем лечение.');
    } else if (data.sleepQuality! >= 4) {
      sonyaResponse = sonya.celebrate('Отличный сон! Продолжай в том же духе.');
    } else if (data.sleepQuality! >= 3) {
      sonyaResponse = sonya.say('Запись сохранена! Продолжай отслеживать.');
    } else {
      sonyaResponse = sonya.respondToEmotion('tired').text;
    }

    const message = `
${sonya.emoji} *${sonya.name}*

${sonyaResponse}

${formatter.header('Твой сон')}

🛏 Легли: ${bedtime}
⏰ Встали: ${waketime}
⏱ В постели: ${formatter.duration(durationMinutes)}
${qualityEmoji} Качество: ${data.sleepQuality}/5

${statusSection}
${interventionSection}
${nonResponseSection}

${sonya.tip(entriesCount < 7 ? 'Заполняй дневник каждое утро — осталось совсем немного!' : 'Следуй рекомендациям для улучшения сна')}
    `.trim();

    // Dynamic keyboard based on treatment status
    const keyboard: IInlineButton[][] = [];

    if (result?.intervention) {
      keyboard.push([{ text: '✅ Понятно', callbackData: 'intervention:ack' }]);
    }

    // Non-response: show button to navigate to third-wave therapy
    if (result?.isNonResponding && result?.thirdWaveRecommendation &&
        result.thirdWaveRecommendation.recommendedApproach !== 'none') {
      keyboard.push([{ text: '🔄 Перейти к новой терапии', callbackData: 'therapy:third_wave_menu' }]);
    }

    keyboard.push([{ text: '📊 Мой прогресс', callbackData: 'progress:show' }]);

    if (entriesCount >= 7) {
      keyboard.push([{ text: '🧘 Релаксация', callbackData: 'relax:start' }]);
    }

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'summary', ...data, saved: true },
    };
  }

  /**
   * Helper for Russian day pluralization
   */
  private pluralizeDays(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней';
    if (mod10 === 1) return 'день';
    if (mod10 >= 2 && mod10 <= 4) return 'дня';
    return 'дней';
  }

  // ==================== Helpers ====================

  private getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'day';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  private formatTime(hour: number | undefined, minute: number | undefined): string {
    if (hour === undefined || minute === undefined) {
      return '--:--';
    }
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private calculateDuration(data: DiaryData): number {
    if (
      data.waketimeHour === undefined ||
      data.bedtimeHour === undefined ||
      data.waketimeMinute === undefined ||
      data.bedtimeMinute === undefined
    ) {
      return 0;
    }

    let hours = data.waketimeHour - data.bedtimeHour;
    const minutes = data.waketimeMinute - data.bedtimeMinute;

    // Handle crossing midnight
    if (hours < 0) {
      hours += 24;
    }

    return hours * 60 + minutes;
  }
}

// Export singleton
export const diaryCommand = new DiaryCommand();
