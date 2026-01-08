/**
 * Adverse Event Report Command
 * ============================
 * Patient self-reporting of adverse events.
 *
 * Implements:
 * - Guided AE reporting flow
 * - CIOMS Form I minimum data collection
 * - Severity and seriousness assessment
 * - Safety alert generation
 *
 * Research basis:
 * - ICH E6(R3): Patient safety paramount
 * - "Digitalovigilance": DTx-specific safety monitoring
 * - Self-report AE tracking in dCBT-I trials (DREAM protocol)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import {
  AdverseEventService,
  createAdverseEventService,
  DTX_AE_CATEGORIES,
} from '../services/AdverseEventService';
import type { AESeverity } from '../services/AdverseEventService';

// ==================== Types ====================

type AEReportStep =
  | 'intro'
  | 'category'
  | 'severity'
  | 'onset'
  | 'description'
  | 'serious_check'
  | 'confirm'
  | 'submitted';

interface IAEReportData {
  step: AEReportStep;
  category?: string;
  severity?: AESeverity;
  onset?: string;
  description?: string;
  seriousCheck?: string;
}

// ==================== AE Report Command ====================

/**
 * Adverse Event Report Command
 * Allows patients to report problems or side effects
 */
class AEReportCommand implements ICommand, IConversationCommand {
  name = 'aereport';
  description = 'Сообщить о проблеме или побочном эффекте';
  aliases = ['ae', 'problem', 'sideeffect'];
  requiresSession = true;

  readonly steps: AEReportStep[] = [
    'intro',
    'category',
    'severity',
    'onset',
    'description',
    'serious_check',
    'confirm',
    'submitted',
  ];

  private aeService: AdverseEventService | null = null;

  /**
   * Get or create AE service instance
   */
  private getAEService(ctx: ISleepCoreContext): AdverseEventService {
    if (!this.aeService) {
      // For now, create with a mock DB connection
      // In production, this would use the real database
      this.aeService = createAdverseEventService({} as never);
    }
    return this.aeService;
  }

  /**
   * Execute command - show intro
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    return this.showIntro(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const reportData = data as unknown as IAEReportData;

    switch (step) {
      case 'intro':
        return this.showIntro(ctx);
      case 'category':
        return this.showCategorySelection(ctx, reportData);
      case 'severity':
        return this.showSeveritySelection(ctx, reportData);
      case 'onset':
        return this.showOnsetSelection(ctx, reportData);
      case 'description':
        return this.showDescriptionPrompt(ctx, reportData);
      case 'serious_check':
        return this.showSeriousCheck(ctx, reportData);
      case 'confirm':
        return this.showConfirmation(ctx, reportData);
      default:
        return this.showIntro(ctx);
    }
  }

  /**
   * Handle callback query
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    const action = parts[1];
    const value = parts[2];

    const reportData = conversationData as unknown as IAEReportData;

    switch (action) {
      case 'start':
        return this.showCategorySelection(ctx, reportData);

      case 'category':
        reportData.category = value;
        return this.showSeveritySelection(ctx, reportData);

      case 'severity':
        reportData.severity = value as AESeverity;
        return this.showOnsetSelection(ctx, reportData);

      case 'onset':
        reportData.onset = value;
        return this.showDescriptionPrompt(ctx, reportData);

      case 'skip_description':
        reportData.description = '';
        return this.showSeriousCheck(ctx, reportData);

      case 'serious':
        reportData.seriousCheck = value;
        return this.showConfirmation(ctx, reportData);

      case 'confirm':
        return this.submitReport(ctx, reportData);

      case 'cancel':
        return this.cancelReport(ctx);

      default:
        return this.showIntro(ctx);
    }
  }

  // ==================== Step Handlers ====================

  /**
   * Show introduction
   */
  private showIntro(ctx: ISleepCoreContext): ICommandResult {
    const message = `
${formatter.header('Сообщение о проблеме')}

${sonya.emoji} ${ctx.displayName}, если у тебя возникли какие-либо проблемы или неприятные ощущения во время программы, очень важно сообщить об этом.

${formatter.divider()}

Это поможет:
- Скорректировать твою программу
- Обеспечить безопасность
- Улучшить терапию для всех

${formatter.tip('Все сообщения конфиденциальны и будут рассмотрены специалистом')}

${formatter.divider()}

<i>Если это экстренная ситуация, пожалуйста, обратитесь за медицинской помощью!</i>
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 Сообщить о проблеме', callbackData: 'aereport:start' }],
      [{ text: '❌ Отмена', callbackData: 'aereport:cancel' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'intro' },
    };
  }

  /**
   * Show category selection
   */
  private showCategorySelection(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const message = `
${formatter.header('Тип проблемы')}

Выбери, что лучше всего описывает твою ситуацию:
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '😰 Ухудшение сна',
          callbackData: 'aereport:category:SYMPTOM_DETERIORATION',
        },
      ],
      [
        {
          text: '😟 Усиление тревоги',
          callbackData: 'aereport:category:ANXIETY_INCREASE',
        },
      ],
      [
        {
          text: '😤 Фрустрация от терапии',
          callbackData: 'aereport:category:FRUSTRATION',
        },
      ],
      [
        {
          text: '😴 Сильная дневная сонливость',
          callbackData: 'aereport:category:EXCESSIVE_DAYTIME_SLEEPINESS',
        },
      ],
      [
        {
          text: '😩 Сильная усталость',
          callbackData: 'aereport:category:FATIGUE',
        },
      ],
      [
        {
          text: '🤕 Головная боль',
          callbackData: 'aereport:category:HEADACHE',
        },
      ],
      [
        {
          text: '😵 Головокружение',
          callbackData: 'aereport:category:DIZZINESS',
        },
      ],
      [
        {
          text: '🚗 Несчастный случай/травма',
          callbackData: 'aereport:category:ACCIDENT_INJURY',
        },
      ],
      [
        {
          text: '📝 Другое',
          callbackData: 'aereport:category:OTHER',
        },
      ],
      [{ text: '❌ Отмена', callbackData: 'aereport:cancel' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'category' },
    };
  }

  /**
   * Show severity selection
   */
  private showSeveritySelection(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const categoryName = this.getCategoryName(data.category);

    const message = `
${formatter.header('Серьёзность проблемы')}

Ты выбрал(а): <b>${categoryName}</b>

Насколько это влияет на твою жизнь?
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '🟢 Лёгкая - не мешает обычной жизни',
          callbackData: 'aereport:severity:mild',
        },
      ],
      [
        {
          text: '🟡 Умеренная - некоторые ограничения',
          callbackData: 'aereport:severity:moderate',
        },
      ],
      [
        {
          text: '🔴 Тяжёлая - значительно мешает',
          callbackData: 'aereport:severity:severe',
        },
      ],
      [{ text: '⬅️ Назад', callbackData: 'aereport:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'severity' },
    };
  }

  /**
   * Show onset selection
   */
  private showOnsetSelection(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const message = `
${formatter.header('Когда это началось?')}

Когда ты впервые заметил(а) эту проблему?
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '📅 Сегодня',
          callbackData: 'aereport:onset:today',
        },
      ],
      [
        {
          text: '📅 Вчера',
          callbackData: 'aereport:onset:yesterday',
        },
      ],
      [
        {
          text: '📅 На этой неделе',
          callbackData: 'aereport:onset:this_week',
        },
      ],
      [
        {
          text: '📅 Раньше',
          callbackData: 'aereport:onset:earlier',
        },
      ],
      [{ text: '⬅️ Назад', callbackData: 'aereport:category:' + data.category }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'onset' },
    };
  }

  /**
   * Show description prompt
   */
  private showDescriptionPrompt(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const message = `
${formatter.header('Описание')}

Пожалуйста, опиши подробнее, что произошло.

Напиши текстом или нажми "Пропустить", если не хочешь добавлять описание.

${formatter.tip('Чем подробнее описание, тем лучше мы сможем помочь')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '⏭️ Пропустить',
          callbackData: 'aereport:skip_description',
        },
      ],
      [{ text: '⬅️ Назад', callbackData: 'aereport:onset:' + data.onset }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'description', awaitingText: true },
    };
  }

  /**
   * Show serious check
   */
  private showSeriousCheck(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const message = `
${formatter.header('Медицинская помощь')}

Требовалась ли медицинская помощь в связи с этой проблемой?
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '❌ Нет',
          callbackData: 'aereport:serious:no',
        },
      ],
      [
        {
          text: '🏥 Да, амбулаторно',
          callbackData: 'aereport:serious:outpatient',
        },
      ],
      [
        {
          text: '🏨 Да, госпитализация',
          callbackData: 'aereport:serious:hospitalized',
        },
      ],
      [
        {
          text: '🚑 Да, экстренная помощь',
          callbackData: 'aereport:serious:emergency',
        },
      ],
      [{ text: '⬅️ Назад', callbackData: 'aereport:skip_description' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'serious_check' },
    };
  }

  /**
   * Show confirmation
   */
  private showConfirmation(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): ICommandResult {
    const categoryName = this.getCategoryName(data.category);
    const severityName = this.getSeverityName(data.severity);
    const onsetName = this.getOnsetName(data.onset);
    const seriousName = this.getSeriousName(data.seriousCheck);

    const message = `
${formatter.header('Подтверждение')}

Проверь данные перед отправкой:

${formatter.divider()}

<b>Тип проблемы:</b> ${categoryName}
<b>Серьёзность:</b> ${severityName}
<b>Начало:</b> ${onsetName}
<b>Мед. помощь:</b> ${seriousName}
${data.description ? `<b>Описание:</b> ${data.description}` : ''}

${formatter.divider()}

Всё верно?
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '✅ Отправить',
          callbackData: 'aereport:confirm',
        },
      ],
      [
        {
          text: '✏️ Изменить',
          callbackData: 'aereport:start',
        },
      ],
      [{ text: '❌ Отмена', callbackData: 'aereport:cancel' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'confirm' },
    };
  }

  /**
   * Submit the report
   */
  private async submitReport(
    ctx: ISleepCoreContext,
    data: IAEReportData
  ): Promise<ICommandResult> {
    try {
      const aeService = this.getAEService(ctx);

      // Get context data from session
      const session = ctx.sleepCore.getSession(ctx.userId);
      // Calculate week number from session start
      const weekNumber = session?.startDate
        ? Math.floor((Date.now() - session.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : undefined;
      const contextData = {
        currentISI: undefined, // ISI scores tracked separately via ISISchedulingService
        baselineISI: undefined,
        currentWeek: weekNumber,
      };

      // Process the report
      const report = await aeService.processPatientReport(
        ctx.userId,
        {
          category: data.category || 'OTHER',
          severity: data.severity || 'mild',
          onset: data.onset || 'today',
          description: data.description || '',
          serious_check: data.seriousCheck || 'no',
        },
        contextData
      );

      // Generate response based on seriousness
      let message: string;
      let followUp: string;

      if (report.isSerious) {
        message = `
${formatter.header('Сообщение получено')}

${sonya.emoji} Спасибо, ${ctx.displayName}!

<b>Твоё сообщение получено и будет рассмотрено в приоритетном порядке.</b>

Номер обращения: <code>AE-${report.id}</code>

${formatter.divider()}

⚠️ <b>Важно:</b> Если симптомы ухудшаются, обратись за медицинской помощью!

Специалист свяжется с тобой в ближайшее время.
        `.trim();

        followUp = 'Мы свяжемся с тобой в течение 24 часов.';
      } else {
        message = `
${formatter.header('Сообщение получено')}

${sonya.emoji} Спасибо, ${ctx.displayName}!

Твоё сообщение зарегистрировано.

Номер обращения: <code>AE-${report.id}</code>

${formatter.divider()}

${formatter.tip('Продолжай программу и следи за своим состоянием. Если что-то изменится - сообщи нам.')}
        `.trim();

        followUp =
          'Специалист рассмотрит твоё сообщение и при необходимости свяжется с тобой.';
      }

      // Log the submission
      console.log(
        `[AE Command] Report submitted: ID=${report.id}, User=${ctx.userId}, Serious=${report.isSerious}`
      );

      return {
        success: true,
        message: message + '\n\n' + followUp,
        metadata: { step: 'submitted', reportId: report.id },
      };
    } catch (error) {
      console.error('[AE Command] Failed to submit report:', error);
      return {
        success: false,
        error: 'Не удалось отправить сообщение. Попробуйте позже.',
      };
    }
  }

  /**
   * Cancel report
   */
  private cancelReport(ctx: ISleepCoreContext): ICommandResult {
    const message = `
${sonya.emoji} Хорошо, отменено.

Если у тебя возникнут вопросы или проблемы, ты всегда можешь использовать команду /aereport или написать /sos.
    `.trim();

    return {
      success: true,
      message,
    };
  }

  // ==================== Helpers ====================

  private getCategoryName(category?: string): string {
    if (!category) return 'Не указано';
    if (category in DTX_AE_CATEGORIES) {
      const cat = DTX_AE_CATEGORIES[category as keyof typeof DTX_AE_CATEGORIES];
      return cat.term;
    }
    return 'Другое';
  }

  private getSeverityName(severity?: string): string {
    switch (severity) {
      case 'mild':
        return 'Лёгкая';
      case 'moderate':
        return 'Умеренная';
      case 'severe':
        return 'Тяжёлая';
      default:
        return 'Не указано';
    }
  }

  private getOnsetName(onset?: string): string {
    switch (onset) {
      case 'today':
        return 'Сегодня';
      case 'yesterday':
        return 'Вчера';
      case 'this_week':
        return 'На этой неделе';
      case 'earlier':
        return 'Раньше';
      default:
        return 'Не указано';
    }
  }

  private getSeriousName(serious?: string): string {
    switch (serious) {
      case 'no':
        return 'Не требовалась';
      case 'outpatient':
        return 'Амбулаторно';
      case 'hospitalized':
        return 'Госпитализация';
      case 'emergency':
        return 'Экстренная помощь';
      default:
        return 'Не указано';
    }
  }
}

// ==================== Export ====================

export const aeReportCommand = new AEReportCommand();
export default aeReportCommand;
