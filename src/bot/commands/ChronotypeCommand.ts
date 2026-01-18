/**
 * ChronotypeCommand - Chronotype Assessment via MEQ Questionnaire
 * ================================================================
 *
 * Integrates CircadianAI with Telegram bot for chronotype assessment.
 *
 * Features:
 * - 5-item MEQ questionnaire (Horne & Östberg, 1976)
 * - Chronotype determination (lark/intermediate/owl)
 * - DLMO estimation
 * - Personalized sleep window recommendations
 * - Light therapy scheduling
 * - Social jetlag awareness
 *
 * Scientific Foundation:
 * - Morningness-Eveningness Questionnaire (MEQ)
 * - Munich Chronotype Questionnaire (MCTQ) concepts
 * - DLMO prediction algorithms
 * - Chronotype-mood links (Nature Scientific Reports, 2025)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ICommandResult,
  ISleepCoreContext,
  IInlineButton,
} from './interfaces/ICommand';
import {
  circadianAI,
  MEQ_ITEMS,
  type IMEQResponse,
  type ICircadianAssessment,
  type IChronotherapyPlan,
  type ChronotypeCategory,
} from '../../circadian/CircadianAI';

// ==================== CONSTANTS ====================

/**
 * MEQ question steps
 */
const MEQ_STEPS = [
  'q1_wakePreference',
  'q2_morningTiredness',
  'q3_bedtimeWork',
  'q4_peakPerformance',
  'q5_selfRating',
] as const;

/**
 * Chronotype emoji mapping
 */
const CHRONOTYPE_EMOJI: Record<ChronotypeCategory, string> = {
  extreme_morning: '🌅',
  moderate_morning: '🌤️',
  intermediate: '☀️',
  moderate_evening: '🌙',
  extreme_evening: '🦉',
};

/**
 * Chronotype Russian names
 */
const CHRONOTYPE_NAMES_RU: Record<ChronotypeCategory, string> = {
  extreme_morning: 'Выраженный жаворонок',
  moderate_morning: 'Умеренный жаворонок',
  intermediate: 'Промежуточный тип',
  moderate_evening: 'Умеренная сова',
  extreme_evening: 'Выраженная сова',
};

/**
 * Social jetlag severity descriptions
 */
const SOCIAL_JETLAG_DESCRIPTIONS: Record<string, string> = {
  none: '✅ Минимальный (< 30 мин) — отлично!',
  mild: '⚠️ Лёгкий (30-60 мин) — в пределах нормы',
  moderate: '🟠 Умеренный (1-2 часа) — рекомендуется коррекция',
  severe: '🔴 Значительный (> 2 часов) — требуется внимание',
};

// ==================== CHRONOTYPE COMMAND ====================

/**
 * ChronotypeCommand implementation
 */
export class ChronotypeCommand implements IConversationCommand {
  readonly name = 'chronotype';
  readonly description = 'Определить хронотип (жаворонок/сова)';
  readonly aliases = ['chrono', 'meq'];
  readonly requiresSession = false;
  readonly steps = ['intro', ...MEQ_STEPS, 'mctq_offer', 'mctq_work', 'mctq_free', 'results'];

  /**
   * Execute command - show intro or results if already assessed
   */
  async execute(ctx: ISleepCoreContext, _args?: string): Promise<ICommandResult> {
    // Check if user already has chronotype assessment
    const existingAssessment = await this.getStoredAssessment(ctx.userId);

    if (existingAssessment) {
      return this.showExistingResults(ctx, existingAssessment);
    }

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
    // Route to appropriate step handler
    if (MEQ_STEPS.includes(step as typeof MEQ_STEPS[number])) {
      return this.showMEQQuestion(ctx, step as typeof MEQ_STEPS[number], data);
    }

    switch (step) {
      case 'intro':
        return this.showIntro(ctx);
      case 'mctq_offer':
        return this.showMCTQOffer(ctx, data);
      case 'mctq_work':
        return this.showMCTQWork(ctx, data);
      case 'mctq_free':
        return this.showMCTQFree(ctx, data);
      case 'results':
        return this.showResults(ctx, data);
      default:
        return this.showIntro(ctx);
    }
  }

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Parse callback: "chronotype:action:value"
    const parts = callbackData.split(':');
    if (parts[0] !== 'chronotype') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];
    const value = parts[2];

    switch (action) {
      case 'start':
        return this.showMEQQuestion(ctx, 'q1_wakePreference', {});

      case 'meq':
        return this.handleMEQAnswer(ctx, value, conversationData);

      case 'mctq':
        return await this.handleMCTQAction(ctx, value, conversationData);

      case 'skip_mctq':
        return await this.calculateAndShowResults(ctx, conversationData, false);

      case 'view_plan':
        return this.showChronotherapyPlan(ctx, conversationData);

      case 'view_light':
        return this.showLightTherapyDetails(ctx, conversationData);

      case 'reassess':
        return this.showIntro(ctx);

      case 'back':
        return this.showExistingResults(
          ctx,
          conversationData.assessment as ICircadianAssessment
        );

      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  // ==================== INTRO ====================

  /**
   * Show introduction screen
   */
  private showIntro(_ctx: ISleepCoreContext): ICommandResult {
    const message = `
<b>🕐 Определение хронотипа</b>

Хронотип — это ваши индивидуальные биологические часы, определяющие оптимальное время для сна и бодрствования.

<b>Зачем это нужно?</b>
• Персонализация рекомендаций по времени сна
• Оптимизация расписания терапии
• Рекомендации по светотерапии
• Выявление социального джетлага

<b>Как это работает?</b>
Вы ответите на 5 вопросов теста MEQ (Morningness-Eveningness Questionnaire) — это займёт около 2 минут.

По результатам вы узнаете:
• Ваш хронотип (жаворонок/сова/промежуточный)
• Оптимальное время отхода ко сну
• Рекомендации по светотерапии
• Риски социального джетлага
`.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '🚀 Начать тест',
          callbackData: 'chronotype:start',
        },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'intro' },
    };
  }

  // ==================== MEQ QUESTIONS ====================

  /**
   * Show MEQ question
   */
  private showMEQQuestion(
    _ctx: ISleepCoreContext,
    questionId: typeof MEQ_STEPS[number],
    data: Record<string, unknown>
  ): ICommandResult {
    const questionIndex = MEQ_STEPS.indexOf(questionId);
    const question = MEQ_ITEMS[questionIndex];

    if (!question) {
      return { success: false, error: 'Question not found' };
    }

    const progress = `${questionIndex + 1}/5`;
    const progressBar = this.renderProgressBar(questionIndex + 1, 5);

    const message = `
<b>🕐 Хронотип — вопрос ${progress}</b>
${progressBar}

${question.textRu}
`.trim();

    // Build answer buttons
    const keyboard: IInlineButton[][] = question.options.map((option) => [
      {
        text: option.label,
        callbackData: `chronotype:meq:${questionId}:${option.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: questionId,
        meqAnswers: data.meqAnswers || {},
      },
    };
  }

  /**
   * Handle MEQ answer
   */
  private handleMEQAnswer(
    ctx: ISleepCoreContext,
    value: string,
    data: Record<string, unknown>
  ): ICommandResult {
    // Parse value: "questionId:score"
    const [questionId, scoreStr] = value.split(':');
    const score = parseInt(scoreStr, 10);

    // Store answer
    const meqAnswers = (data.meqAnswers as Record<string, number>) || {};
    meqAnswers[questionId] = score;

    // Find next question
    const currentIndex = MEQ_STEPS.indexOf(questionId as typeof MEQ_STEPS[number]);
    const nextIndex = currentIndex + 1;

    if (nextIndex < MEQ_STEPS.length) {
      // Show next question
      return this.showMEQQuestion(ctx, MEQ_STEPS[nextIndex], { meqAnswers });
    }

    // All MEQ questions answered - offer MCTQ for more precision
    return this.showMCTQOffer(ctx, { meqAnswers });
  }

  // ==================== MCTQ (OPTIONAL) ====================

  /**
   * Offer MCTQ assessment for better accuracy
   */
  private showMCTQOffer(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const message = `
<b>✅ Тест MEQ завершён!</b>

Хотите повысить точность оценки?

Дополнительно можно указать ваше реальное время сна в рабочие и выходные дни (MCTQ). Это позволит:
• Рассчитать социальный джетлаг
• Точнее определить ваш хронотип
• Дать более персональные рекомендации

<i>Это займёт ещё 1-2 минуты.</i>
`.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '📊 Добавить данные о сне',
          callbackData: 'chronotype:mctq:start',
        },
      ],
      [
        {
          text: '⏭️ Пропустить и показать результат',
          callbackData: 'chronotype:skip_mctq',
        },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'mctq_offer',
        meqAnswers: data.meqAnswers,
      },
    };
  }

  /**
   * Show MCTQ work days input
   */
  private showMCTQWork(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const message = `
<b>📅 Рабочие дни</b>

В какое время вы обычно <b>засыпаете</b> в рабочие дни?

<i>Выберите наиболее близкий вариант:</i>
`.trim();

    const timeOptions = [
      { label: '21:00 - 22:00', value: '21:30' },
      { label: '22:00 - 23:00', value: '22:30' },
      { label: '23:00 - 00:00', value: '23:30' },
      { label: '00:00 - 01:00', value: '00:30' },
      { label: '01:00 - 02:00', value: '01:30' },
      { label: 'Позже 02:00', value: '02:30' },
    ];

    const keyboard: IInlineButton[][] = timeOptions.map((opt) => [
      {
        text: opt.label,
        callbackData: `chronotype:mctq:work_sleep:${opt.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'mctq_work',
        meqAnswers: data.meqAnswers,
        mctqData: data.mctqData || {},
      },
    };
  }

  /**
   * Show MCTQ free days input
   */
  private showMCTQFree(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const message = `
<b>🌴 Выходные дни</b>

В какое время вы обычно <b>засыпаете</b> в выходные (когда не нужно вставать по будильнику)?

<i>Выберите наиболее близкий вариант:</i>
`.trim();

    const timeOptions = [
      { label: '21:00 - 22:00', value: '21:30' },
      { label: '22:00 - 23:00', value: '22:30' },
      { label: '23:00 - 00:00', value: '23:30' },
      { label: '00:00 - 01:00', value: '00:30' },
      { label: '01:00 - 02:00', value: '01:30' },
      { label: '02:00 - 03:00', value: '02:30' },
      { label: 'Позже 03:00', value: '03:30' },
    ];

    const keyboard: IInlineButton[][] = timeOptions.map((opt) => [
      {
        text: opt.label,
        callbackData: `chronotype:mctq:free_sleep:${opt.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'mctq_free',
        meqAnswers: data.meqAnswers,
        mctqData: data.mctqData,
      },
    };
  }

  /**
   * Handle MCTQ actions
   */
  private async handleMCTQAction(
    ctx: ISleepCoreContext,
    value: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    if (value === 'start') {
      return this.showMCTQWork(ctx, data);
    }

    // Parse value: "action:time"
    const [action, time] = value.split(':');
    const mctqData = (data.mctqData as Record<string, string>) || {};

    switch (action) {
      case 'work_sleep':
        mctqData.workSleepOnset = time;
        return this.showMCTQWorkWake(ctx, { ...data, mctqData });

      case 'work_wake':
        mctqData.workWakeTime = time;
        return this.showMCTQFree(ctx, { ...data, mctqData });

      case 'free_sleep':
        mctqData.freeSleepOnset = time;
        return this.showMCTQFreeWake(ctx, { ...data, mctqData });

      case 'free_wake':
        mctqData.freeWakeTime = time;
        return await this.calculateAndShowResults(ctx, { ...data, mctqData }, true);

      default:
        return { success: false, error: 'Unknown MCTQ action' };
    }
  }

  /**
   * Show MCTQ work wake time input
   */
  private showMCTQWorkWake(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const message = `
<b>📅 Рабочие дни</b>

В какое время вы обычно <b>просыпаетесь</b> в рабочие дни?
`.trim();

    const timeOptions = [
      { label: '05:00 - 06:00', value: '05:30' },
      { label: '06:00 - 07:00', value: '06:30' },
      { label: '07:00 - 08:00', value: '07:30' },
      { label: '08:00 - 09:00', value: '08:30' },
      { label: '09:00 - 10:00', value: '09:30' },
      { label: 'Позже 10:00', value: '10:30' },
    ];

    const keyboard: IInlineButton[][] = timeOptions.map((opt) => [
      {
        text: opt.label,
        callbackData: `chronotype:mctq:work_wake:${opt.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'mctq_work_wake',
        meqAnswers: data.meqAnswers,
        mctqData: data.mctqData,
      },
    };
  }

  /**
   * Show MCTQ free wake time input
   */
  private showMCTQFreeWake(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const message = `
<b>🌴 Выходные дни</b>

В какое время вы обычно <b>просыпаетесь естественно</b> в выходные (без будильника)?
`.trim();

    const timeOptions = [
      { label: '06:00 - 07:00', value: '06:30' },
      { label: '07:00 - 08:00', value: '07:30' },
      { label: '08:00 - 09:00', value: '08:30' },
      { label: '09:00 - 10:00', value: '09:30' },
      { label: '10:00 - 11:00', value: '10:30' },
      { label: '11:00 - 12:00', value: '11:30' },
      { label: 'Позже 12:00', value: '12:30' },
    ];

    const keyboard: IInlineButton[][] = timeOptions.map((opt) => [
      {
        text: opt.label,
        callbackData: `chronotype:mctq:free_wake:${opt.value}`,
      },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'mctq_free_wake',
        meqAnswers: data.meqAnswers,
        mctqData: data.mctqData,
      },
    };
  }

  // ==================== RESULTS ====================

  /**
   * Calculate assessment and show results
   */
  private async calculateAndShowResults(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>,
    includeMCTQ: boolean
  ): Promise<ICommandResult> {
    const meqAnswers = data.meqAnswers as Record<string, number>;

    // Build MEQ response
    const meqResponse: IMEQResponse = {
      userId: ctx.userId,
      date: new Date().toISOString().split('T')[0],
      q1_wakePreference: meqAnswers.q1_wakePreference,
      q2_morningTiredness: meqAnswers.q2_morningTiredness,
      q3_bedtimeWork: meqAnswers.q3_bedtimeWork,
      q4_peakPerformance: meqAnswers.q4_peakPerformance,
      q5_selfRating: meqAnswers.q5_selfRating,
    };

    // Get assessment from CircadianAI
    let assessment = circadianAI.assessFromMEQ(meqResponse);

    // If MCTQ data provided, calculate social jetlag
    if (includeMCTQ) {
      const mctqData = data.mctqData as Record<string, string>;
      const socialJetlag = this.calculateSocialJetlag(mctqData);
      assessment = {
        ...assessment,
        socialJetlag,
        socialJetlagSeverity: this.getSocialJetlagSeverity(socialJetlag),
        dlmoConfidence: 0.8, // Higher confidence with MCTQ
      };
    }

    // Store assessment
    await this.storeAssessment(ctx.userId, assessment);

    // Generate chronotherapy plan
    const plan = circadianAI.generateChronotherapyPlan(ctx.userId, assessment);

    return this.showResults(ctx, { assessment, plan });
  }

  /**
   * Show assessment results
   */
  private showResults(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const assessment = data.assessment as ICircadianAssessment;
    const plan = data.plan as IChronotherapyPlan;

    const emoji = CHRONOTYPE_EMOJI[assessment.chronotypeCategory];
    const name = CHRONOTYPE_NAMES_RU[assessment.chronotypeCategory];
    const jetlagDesc = SOCIAL_JETLAG_DESCRIPTIONS[assessment.socialJetlagSeverity];

    let message = `
<b>${emoji} Ваш хронотип: ${name}</b>

<b>📊 Результаты оценки</b>
`;

    if (assessment.meqScore) {
      message += `• MEQ-балл: <b>${assessment.meqScore}</b>/86\n`;
    }

    message += `• DLMO (начало выработки мелатонина): <b>${assessment.estimatedDLMO}</b>
• Уверенность оценки: ${Math.round(assessment.dlmoConfidence * 100)}%

<b>🛏️ Оптимальное окно сна</b>
• Отход ко сну: <b>${assessment.optimalSleepWindow.bedtime}</b>
• Пробуждение: <b>${assessment.optimalSleepWindow.wakeTime}</b>
• Потребность во сне: ~${assessment.estimatedSleepNeed.toFixed(1)} ч

<b>✈️ Социальный джетлаг</b>
${jetlagDesc}
`;

    // Add risk factors if any
    if (assessment.riskFactors.length > 0) {
      message += `\n<b>⚠️ Факторы риска</b>\n`;
      for (const risk of assessment.riskFactors) {
        message += `• ${risk}\n`;
      }
    }

    // Add light therapy note if recommended
    if (plan?.lightTherapy?.recommended) {
      message += `\n<b>💡 Рекомендована светотерапия</b>\nНажмите кнопку ниже для подробностей.`;
    }

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '📋 План хронотерапии',
          callbackData: 'chronotype:view_plan',
        },
      ],
    ];

    if (plan?.lightTherapy?.recommended) {
      keyboard.push([
        {
          text: '💡 Подробнее о светотерапии',
          callbackData: 'chronotype:view_light',
        },
      ]);
    }

    keyboard.push([
      {
        text: '🔄 Пройти тест заново',
        callbackData: 'chronotype:reassess',
      },
    ]);

    return {
      success: true,
      message: message.trim(),
      keyboard,
      metadata: {
        step: 'results',
        assessment,
        plan,
      },
    };
  }

  /**
   * Show existing results
   */
  private showExistingResults(
    ctx: ISleepCoreContext,
    assessment: ICircadianAssessment
  ): ICommandResult {
    const plan = circadianAI.generateChronotherapyPlan(ctx.userId, assessment);
    return this.showResults(ctx, { assessment, plan });
  }

  /**
   * Show chronotherapy plan details
   */
  private showChronotherapyPlan(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const plan = data.plan as IChronotherapyPlan;
    const assessment = data.assessment as ICircadianAssessment;

    if (!plan) {
      return { success: false, error: 'План не найден' };
    }

    let message = `
<b>📋 Персональный план хронотерапии</b>

<b>🕐 Оптимальное время для занятий</b>
`;

    for (const time of plan.optimalSessionTimes) {
      message += `• ${time}\n`;
    }

    message += `
<b>🛏️ Рестрикция сна</b>
• Начальное время отхода: ${plan.sleepRestrictionAdjustments.initialBedtime}
• Время подъёма: ${plan.sleepRestrictionAdjustments.initialWakeTime}

<i>${plan.sleepRestrictionAdjustments.rationale}</i>

<b>💊 Рекомендации по образу жизни</b>
`;

    for (const rec of plan.lifestyleRecommendations) {
      message += `• ${rec}\n`;
    }

    // Add melatonin info if applicable
    if (plan.melatoninTiming?.recommended) {
      message += `
<b>💊 Мелатонин</b>
• Время приёма: ${plan.melatoninTiming.timing}
• Доза: ${plan.melatoninTiming.dose}
<i>${plan.melatoninTiming.rationale}</i>

⚠️ <i>Проконсультируйтесь с врачом перед приёмом мелатонина!</i>
`;
    }

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '◀️ Назад к результатам',
          callbackData: 'chronotype:back',
        },
      ],
    ];

    return {
      success: true,
      message: message.trim(),
      keyboard,
      metadata: {
        step: 'plan_details',
        assessment,
        plan,
      },
    };
  }

  /**
   * Show light therapy details
   */
  private showLightTherapyDetails(
    _ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): ICommandResult {
    const plan = data.plan as IChronotherapyPlan;
    const assessment = data.assessment as ICircadianAssessment;

    if (!plan?.lightTherapy) {
      return { success: false, error: 'Данные о светотерапии не найдены' };
    }

    const lt = plan.lightTherapy;

    const message = `
<b>💡 Светотерапия для вашего хронотипа</b>

<b>Рекомендация:</b> ${lt.recommended ? '✅ Да' : '❌ Не требуется'}

${lt.recommended ? `
<b>📍 Параметры:</b>
• Время: <b>${lt.timing}</b>
• Длительность: <b>${lt.duration} минут</b>
• Интенсивность: <b>${lt.intensity.toLocaleString()} люкс</b>

<b>📝 Обоснование:</b>
${lt.rationale}

<b>🔧 Как применять:</b>
1. Используйте специальную лампу для светотерапии (10,000 люкс) или яркий естественный свет
2. Расположите источник света на расстоянии 30-50 см от лица
3. Не смотрите прямо на свет — занимайтесь обычными делами
4. Старайтесь соблюдать указанное время ежедневно

<b>⚠️ Противопоказания:</b>
• Заболевания сетчатки
• Биполярное расстройство (риск мании)
• Приём фотосенсибилизирующих препаратов
• Проконсультируйтесь с врачом при наличии заболеваний глаз
` : `
Для вашего хронотипа специальная светотерапия не требуется.

Общие рекомендации:
• Получайте 30+ минут естественного света днём
• Избегайте яркого света за 2 часа до сна
• Используйте ночной режим на экранах вечером
`}
`.trim();

    const keyboard: IInlineButton[][] = [
      [
        {
          text: '◀️ Назад к результатам',
          callbackData: 'chronotype:back',
        },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        step: 'light_details',
        assessment,
        plan,
      },
    };
  }

  // ==================== HELPERS ====================

  /**
   * Render progress bar
   */
  private renderProgressBar(current: number, total: number): string {
    const filled = Math.round((current / total) * 10);
    const empty = 10 - filled;
    return `[${'▓'.repeat(filled)}${'░'.repeat(empty)}] ${current}/${total}`;
  }

  /**
   * Calculate social jetlag from MCTQ data
   */
  private calculateSocialJetlag(mctqData: Record<string, string>): number {
    const workMidpoint = this.calculateMidpoint(
      mctqData.workSleepOnset,
      mctqData.workWakeTime
    );
    const freeMidpoint = this.calculateMidpoint(
      mctqData.freeSleepOnset,
      mctqData.freeWakeTime
    );

    return Math.abs(freeMidpoint - workMidpoint);
  }

  /**
   * Calculate midpoint between sleep and wake times
   */
  private calculateMidpoint(sleepTime: string, wakeTime: string): number {
    const sleepHours = this.timeToHours(sleepTime);
    const wakeHours = this.timeToHours(wakeTime);

    let duration = wakeHours - sleepHours;
    if (duration < 0) duration += 24;

    let midpoint = sleepHours + duration / 2;
    if (midpoint >= 24) midpoint -= 24;

    return midpoint;
  }

  /**
   * Convert time string to hours
   */
  private timeToHours(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Get social jetlag severity
   */
  private getSocialJetlagSeverity(
    hours: number
  ): 'none' | 'mild' | 'moderate' | 'severe' {
    if (hours < 0.5) return 'none';
    if (hours < 1.0) return 'mild';
    if (hours < 2.0) return 'moderate';
    return 'severe';
  }

  /**
   * Get stored assessment for user
   */
  private async getStoredAssessment(
    userId: string
  ): Promise<ICircadianAssessment | null> {
    // TODO: Integrate with SleepCore storage
    // For now, return null to always offer assessment
    return null;
  }

  /**
   * Store assessment for user
   */
  private async storeAssessment(
    userId: string,
    assessment: ICircadianAssessment
  ): Promise<void> {
    // TODO: Integrate with SleepCore storage
    // This should save to user's profile
    console.log(`[ChronotypeCommand] Stored assessment for user ${userId}:`, {
      chronotype: assessment.chronotype,
      meqScore: assessment.meqScore,
      socialJetlag: assessment.socialJetlag,
    });
  }
}

// Export singleton
export const chronotypeCommand = new ChronotypeCommand();
