/**
 * /start Command - Onboarding + ISI Assessment
 * =============================================
 * First command users encounter. Implements:
 * - Welcome message with therapeutic framing
 * - Session initialization with SleepCoreAPI
 * - ISI (Insomnia Severity Index) assessment flow
 * - Visual feedback with traffic-light colors (KANOPEE pattern)
 *
 * Research basis:
 * - KANOPEE study (PMC 2025): ISI in screening phase
 * - AI chatbot onboarding reduces drop-offs by 28% (UserPilot 2025)
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
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';

/**
 * Onboarding steps
 */
type OnboardingStep =
  | 'welcome'
  | 'isi_intro'
  | 'isi_q1'
  | 'isi_q2'
  | 'isi_q3'
  | 'isi_q4'
  | 'isi_q5'
  | 'isi_q6'
  | 'isi_q7'
  | 'isi_result'
  | 'complete';

/**
 * ISI Question structure
 */
interface ISIQuestion {
  id: number;
  text: string;
  options: Array<{ value: number; label: string }>;
}

/**
 * /start Command Implementation
 */
export class StartCommand implements IConversationCommand {
  readonly name = 'start';
  readonly description = 'Начать программу улучшения сна';
  readonly aliases = ['begin', 'начать'];
  readonly requiresSession = false;

  readonly steps: OnboardingStep[] = [
    'welcome',
    'isi_intro',
    'isi_q1',
    'isi_q2',
    'isi_q3',
    'isi_q4',
    'isi_q5',
    'isi_q6',
    'isi_q7',
    'isi_result',
    'complete',
  ];

  /**
   * ISI-7 Questions (Russian validated version)
   * Based on: Morin et al. (2011) - ISI validation
   */
  private readonly isiQuestions: ISIQuestion[] = [
    {
      id: 1,
      text: 'Насколько серьёзны ваши проблемы с *засыпанием*?',
      options: [
        { value: 0, label: 'Нет проблем' },
        { value: 1, label: 'Лёгкие' },
        { value: 2, label: 'Умеренные' },
        { value: 3, label: 'Серьёзные' },
        { value: 4, label: 'Очень серьёзные' },
      ],
    },
    {
      id: 2,
      text: 'Насколько серьёзны ваши проблемы с *поддержанием сна*?',
      options: [
        { value: 0, label: 'Нет проблем' },
        { value: 1, label: 'Лёгкие' },
        { value: 2, label: 'Умеренные' },
        { value: 3, label: 'Серьёзные' },
        { value: 4, label: 'Очень серьёзные' },
      ],
    },
    {
      id: 3,
      text: 'Насколько серьёзны проблемы со *слишком ранним пробуждением*?',
      options: [
        { value: 0, label: 'Нет проблем' },
        { value: 1, label: 'Лёгкие' },
        { value: 2, label: 'Умеренные' },
        { value: 3, label: 'Серьёзные' },
        { value: 4, label: 'Очень серьёзные' },
      ],
    },
    {
      id: 4,
      text: 'Насколько вы *удовлетворены* вашим текущим сном?',
      options: [
        { value: 0, label: 'Полностью удовлетворён' },
        { value: 1, label: 'Удовлетворён' },
        { value: 2, label: 'Частично' },
        { value: 3, label: 'Не удовлетворён' },
        { value: 4, label: 'Совсем не удовлетворён' },
      ],
    },
    {
      id: 5,
      text: 'Насколько проблемы со сном *заметны другим* (усталость, настроение)?',
      options: [
        { value: 0, label: 'Совсем не заметны' },
        { value: 1, label: 'Немного' },
        { value: 2, label: 'Заметны' },
        { value: 3, label: 'Очень заметны' },
        { value: 4, label: 'Крайне заметны' },
      ],
    },
    {
      id: 6,
      text: 'Насколько вас *беспокоят* проблемы со сном?',
      options: [
        { value: 0, label: 'Совсем не беспокоят' },
        { value: 1, label: 'Немного' },
        { value: 2, label: 'Беспокоят' },
        { value: 3, label: 'Сильно беспокоят' },
        { value: 4, label: 'Очень сильно' },
      ],
    },
    {
      id: 7,
      text: 'Насколько проблемы со сном *мешают* вашей дневной деятельности?',
      options: [
        { value: 0, label: 'Совсем не мешают' },
        { value: 1, label: 'Немного' },
        { value: 2, label: 'Мешают' },
        { value: 3, label: 'Сильно мешают' },
        { value: 4, label: 'Очень сильно' },
      ],
    },
  ];

  /**
   * Main execute method
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Start new session with SleepCoreAPI
    ctx.sleepCore.startSession(ctx.userId);

    return this.handleStep(ctx, 'welcome', {});
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step as OnboardingStep) {
      case 'welcome':
        return this.showWelcome(ctx);

      case 'isi_intro':
        return this.showISIIntro(ctx);

      case 'isi_q1':
      case 'isi_q2':
      case 'isi_q3':
      case 'isi_q4':
      case 'isi_q5':
      case 'isi_q6':
      case 'isi_q7': {
        const qNum = parseInt(step.replace('isi_q', ''));
        return this.showISIQuestion(ctx, qNum);
      }

      case 'isi_result':
        return this.showISIResult(ctx, data as { isiAnswers: number[] });

      case 'complete':
        return this.showComplete(ctx);

      default:
        return {
          success: false,
          error: `Unknown step: ${step}`,
        };
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
    // Parse callback data: "start:action:value"
    const parts = callbackData.split(':');
    if (parts[0] !== 'start') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];
    const questionNum = parts[2];
    const answerValue = parts[3];

    switch (action) {
      case 'begin_assessment':
        return this.handleStep(ctx, 'isi_intro', conversationData);

      case 'skip_assessment':
        return this.handleStep(ctx, 'complete', conversationData);

      case 'isi_answer':
        return this.handleISIAnswer(
          ctx,
          parseInt(questionNum),
          answerValue ? parseInt(answerValue) : undefined,
          conversationData
        );

      case 'view_tips':
        return this.showQuickTips(ctx);

      case 'start_diary':
        return {
          success: true,
          message: formatter.info('Используйте /diary для ведения дневника сна'),
          metadata: { redirect: 'diary' },
        };

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ==================== Step Handlers ====================

  private async showWelcome(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const name = ctx.displayName || 'друг';

    // Get time-aware greeting from Sonya persona
    const greeting = sonya.greet({
      userName: name,
      week: 0,
    });

    const message = `
${greeting.emoji} *${greeting.text}*

Я — ${sonya.name}, твоя персональная помощница по сну. Помогу улучшить сон с помощью *научно обоснованных методов*:

✓ КПТ-И (когнитивно-поведенческая терапия инсомнии)
✓ Осознанность и релаксация
✓ Персональные рекомендации

${formatter.divider()}

Для начала давай оценим твой сон. Это займёт *2-3 минуты*.

${formatter.tip('ISI — золотой стандарт оценки инсомнии (European Guideline 2023)')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать оценку сна', callbackData: 'start:begin_assessment' }],
      [{ text: '⏭ Пропустить пока', callbackData: 'start:skip_assessment' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'welcome' },
    };
  }

  private async showISIIntro(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
📋 *Оценка качества сна (ISI)*

Сейчас я задам 7 коротких вопросов о вашем сне за *последние 2 недели*.

Выбирайте ответ, который лучше всего описывает вашу ситуацию.

${formatter.tip('Отвечайте честно — это поможет подобрать оптимальную программу')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📝 Начать опрос', callbackData: 'start:isi_answer:-1' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'isi_intro', isiAnswers: [] },
    };
  }

  private async showISIQuestion(
    ctx: ISleepCoreContext,
    questionNumber: number
  ): Promise<ICommandResult> {
    const question = this.isiQuestions[questionNumber - 1];
    if (!question) {
      return { success: false, error: 'Invalid question number' };
    }

    const progress = formatter.progressBar((questionNumber / 7) * 100, 7);

    const message = `
${formatter.header(`Вопрос ${questionNumber}/7`)}

${question.text}

${progress}
    `.trim();

    // Create keyboard with answer options
    const keyboard: IInlineButton[][] = question.options.map((opt) => [
      {
        text: opt.label,
        callbackData: `start:isi_answer:${questionNumber}:${opt.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: `isi_q${questionNumber}` },
    };
  }

  private async handleISIAnswer(
    ctx: ISleepCoreContext,
    questionNumber: number,
    answerValue: number | undefined,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Initialize or get existing answers
    const isiAnswers = [...((data.isiAnswers as number[]) || [])];

    // If this is the start (-1), show first question
    if (questionNumber === -1) {
      const result = await this.showISIQuestion(ctx, 1);
      return {
        ...result,
        metadata: { ...result.metadata, isiAnswers: [], currentQuestion: 1 },
      };
    }

    // Store answer if provided
    if (answerValue !== undefined) {
      // Store answer at the correct index (0-based)
      isiAnswers[questionNumber - 1] = answerValue;
    }

    const nextQuestion = questionNumber + 1;

    if (nextQuestion <= 7) {
      const result = await this.showISIQuestion(ctx, nextQuestion);
      return {
        ...result,
        metadata: { ...result.metadata, isiAnswers, currentQuestion: nextQuestion },
      };
    }

    // All questions answered, show results
    return this.showISIResult(ctx, { isiAnswers });
  }

  private async showISIResult(
    ctx: ISleepCoreContext,
    data: { isiAnswers: number[] }
  ): Promise<ICommandResult> {
    // Calculate ISI score from answers (sum of 7 questions, 0-4 each, max 28)
    const isiScore = data.isiAnswers.reduce((sum, val) => sum + (val || 0), 0);

    const severity = formatter.getISISeverity(isiScore);

    // Traffic light color indicator (KANOPEE pattern)
    let colorIndicator: string;
    let recommendation: string;
    let sonyaResponse: ReturnType<typeof sonya.respondToEmotion>;

    switch (severity) {
      case 'none':
        colorIndicator = '🟢🟢🟢🟢🟢';
        recommendation = 'Ваш сон в норме! Программа поможет поддерживать его качество.';
        sonyaResponse = sonya.respondToEmotion('positive');
        break;
      case 'subthreshold':
        colorIndicator = '🟢🟢🟢🟡🟡';
        recommendation = 'Есть признаки нарушения сна. КПТ-И поможет предотвратить развитие инсомнии.';
        sonyaResponse = sonya.respondToEmotion('hopeful');
        break;
      case 'moderate':
        colorIndicator = '🟢🟡🟡🟠🟠';
        recommendation = 'Умеренная инсомния. Рекомендую начать с дневника сна и базовых техник.';
        sonyaResponse = sonya.respondToEmotion('tired');
        break;
      case 'severe':
        colorIndicator = '🟡🟠🟠🔴🔴';
        recommendation = 'Выраженная инсомния. Программа КПТ-И особенно эффективна в вашем случае.';
        sonyaResponse = sonya.respondToEmotion('discouraged');
        break;
      default:
        colorIndicator = '🟢🟢🟢🟡🟡';
        recommendation = 'Программа поможет улучшить качество сна.';
        sonyaResponse = sonya.respondToEmotion('neutral');
    }

    const message = `
${formatter.header('Результаты оценки')}

${formatter.isiScore(isiScore)}

${colorIndicator}

${formatter.divider()}

${sonyaResponse.emoji} ${sonyaResponse.text}

*Рекомендация:*
${recommendation}

${formatter.tip('КПТ-И — первая линия терапии инсомнии (Grade A, European Guideline 2023)')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📝 Начать дневник сна', callbackData: 'start:start_diary' }],
      [{ text: '💡 Быстрые советы', callbackData: 'start:view_tips' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'isi_result', isiScore, severity },
    };
  }

  private async showComplete(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Sonya celebrates the completion
    const encouragement = sonya.encourageByWeek(0);

    const message = `
${formatter.success('Регистрация завершена!')}

${encouragement.emoji} ${encouragement.text}

Теперь у тебя есть доступ к:

📓 /diary — Дневник сна (3 клика)
📅 /today — Задание на сегодня
🧘 /relax — Техники релаксации
🧠 /mindful — Осознанность
📊 /progress — Твой прогресс
🆘 /sos — Экстренная помощь

${formatter.divider()}

${formatter.tip('Начни с /diary — веди дневник сна каждое утро')}
    `.trim();

    return {
      success: true,
      message,
      metadata: { step: 'complete', onboardingCompleted: true },
    };
  }

  private async showQuickTips(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const tips = [
      'Ложись и вставай в одно время (±30 мин)',
      'Кровать только для сна (не работа, не телефон)',
      'Если не спится 20 мин — встань',
      'Яркий свет утром, приглушённый вечером',
      'Без кофеина за 6 часов до сна',
    ];

    const message = `
${formatter.header('5 базовых правил сна')}

${sonya.emoji} Вот проверенные временем правила:

${formatter.numberedList(tips)}

${formatter.divider()}

${formatter.tip('Эти правила — основа гигиены сна (компонент КПТ-И)')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📝 Начать дневник', callbackData: 'start:start_diary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }
}

// Export singleton
export const startCommand = new StartCommand();
