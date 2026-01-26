/**
 * /therapy Command - Structured CBT-I Sessions
 * =============================================
 * Delivers the 6-core CBT-I treatment program based on SHUTi/Somryst
 * evidence-based digital CBT-I structure.
 *
 * Core Sessions (based on 2024-2025 dCBT-I research):
 * 1. Overview - Sleep education & psychoeducation
 * 2. Sleep Behavior I - Sleep restriction + stimulus control
 * 3. Sleep Behavior II - Behavioral practice & consolidation
 * 4. Sleep Education - Sleep hygiene optimization
 * 5. Sleep Thoughts - Cognitive restructuring
 * 6. Problem Prevention - Relapse prevention & maintenance
 *
 * Research basis:
 * - SHUTi (Internet CBT-I): 6-core structure, 45-60 min sessions
 * - Somryst (FDA cleared): 6 modules over 9 weeks
 * - Sleepio (UK): 6 sessions with animated expert
 * - AASM Clinical Practice Guideline 2025
 *
 * Session timing: 20-60 min per session, 1 session/week (weeks 1-6),
 * then maintenance (weeks 7-8)
 *
 * Safety:
 * - Minimum TIB: 5.5 hours (safety floor per VA CBT-I protocol)
 * - Contraindications: untreated sleep apnea, bipolar, epilepsy
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
 * Therapy session cores (6-week structure)
 */
type TherapyCore =
  | 'overview'           // Core 1: Sleep education
  | 'sleep_behavior_1'   // Core 2: Sleep restriction + stimulus control
  | 'sleep_behavior_2'   // Core 3: Behavioral practice
  | 'sleep_education'    // Core 4: Sleep hygiene
  | 'sleep_thoughts'     // Core 5: Cognitive restructuring
  | 'problem_prevention';// Core 6: Relapse prevention

/**
 * Third-Wave Therapy Types (for non-responders at Week 6+)
 *
 * Scientific basis (2025-2026):
 * - MBT-I (Ong 2014, 2018): For cognitive/somatic arousal [HIGH]
 * - ACT-I (Dalrymple 2010): For experiential avoidance [HIGH]
 * - MCT (Wells 2009, first RCT 2025): For rumination/worry [MEDIUM]
 *
 * Stepped care model:
 * - Week 6-8 evaluation: ISI reduction < 7-8 points = non-response
 * - Non-responders offered third-wave options
 */
type ThirdWaveTherapy = 'mbti' | 'acti' | 'mct';

/**
 * Third-wave therapy session info
 */
interface IThirdWaveSession {
  readonly id: ThirdWaveTherapy;
  readonly title: string;
  readonly titleRu: string;
  readonly description: string;
  readonly sessions: number;
  readonly icon: string;
  readonly bestFor: string[];
  readonly contraindications: string[];
}

/**
 * Third-wave therapy options
 */
const THIRD_WAVE_SESSIONS: readonly IThirdWaveSession[] = [
  {
    id: 'mbti',
    title: 'MBT-I (Mindfulness-Based Therapy)',
    titleRu: 'Осознанность для сна (MBT-I)',
    description: 'Терапия на основе осознанности, разработанная Jason Ong. Интегрирует медитацию с поведенческими техниками сна.',
    sessions: 8,
    icon: '🧘',
    bestFor: [
      'Когнитивное возбуждение (racing thoughts)',
      'Соматическое напряжение',
      'Усилие уснуть (trying too hard)',
    ],
    contraindications: ['Психоз', 'Тяжёлая депрессия', 'Острое ПТСР'],
  },
  {
    id: 'acti',
    title: 'ACT-I (Acceptance & Commitment Therapy)',
    titleRu: 'Принятие и приверженность (ACT-I)',
    description: 'Терапия принятия и приверженности для инсомнии. Фокус на психологической гибкости вместо контроля сна.',
    sessions: 6,
    icon: '🌿',
    bestFor: [
      'Избегающее поведение',
      'Борьба с мыслями',
      'Трудности с приверженностью CBT-I',
    ],
    contraindications: ['Острое суицидальное состояние'],
  },
  {
    id: 'mct',
    title: 'MCT (Metacognitive Therapy)',
    titleRu: 'Метакогнитивная терапия (MCT)',
    description: 'Терапия Adrian Wells, направленная на изменение отношения к мыслям. Включает откладывание беспокойства и тренировку внимания.',
    sessions: 8,
    icon: '🎯',
    bestFor: [
      'Хроническое беспокойство',
      'Руминация о последствиях бессонницы',
      'Метакогнитивные убеждения ("я должен контролировать мысли")',
    ],
    contraindications: ['Когнитивные нарушения', 'Психоз', 'Тяжёлая депрессия'],
  },
];

/**
 * Therapy command steps
 */
type TherapyStep =
  | 'menu'
  | 'core_intro'
  | 'core_content'
  | 'core_exercise'
  | 'core_homework'
  | 'core_complete'
  | 'progress_review'
  | 'third_wave_intro'
  | 'third_wave_menu';

/**
 * Core session structure
 */
interface ICoreSession {
  readonly id: TherapyCore;
  readonly weekNumber: number;
  readonly title: string;
  readonly titleRu: string;
  readonly duration: string;
  readonly objectives: readonly string[];
  readonly components: readonly string[];
  readonly homework: readonly string[];
  readonly icon: string;
}

/**
 * 6-Core CBT-I Session Structure
 * Based on SHUTi/Somryst evidence-based model
 */
const CORE_SESSIONS: readonly ICoreSession[] = [
  {
    id: 'overview',
    weekNumber: 1,
    title: 'Overview',
    titleRu: 'Обзор программы',
    duration: '30-45 мин',
    icon: '📚',
    objectives: [
      'Понять природу и механизмы инсомнии',
      'Узнать о 3P-модели (Spielman)',
      'Ознакомиться со структурой программы КПТ-И',
      'Установить реалистичные ожидания от терапии',
    ],
    components: [
      'Психообразование о сне и инсомнии',
      '3P-модель (Predisposing, Precipitating, Perpetuating)',
      'Обзор 5 компонентов КПТ-И',
      'Важность ведения дневника сна',
    ],
    homework: [
      'Вести дневник сна каждый день (/diary)',
      'Прочитать материал о циркадных ритмах',
      'Определить свой хронотип (/profile)',
    ],
  },
  {
    id: 'sleep_behavior_1',
    weekNumber: 2,
    title: 'Sleep Behavior I',
    titleRu: 'Ограничение сна',
    duration: '45-60 мин',
    icon: '🛏️',
    objectives: [
      'Освоить технику ограничения сна (SRT)',
      'Понять принципы контроля стимулов (SCT)',
      'Рассчитать индивидуальное окно сна',
      'Научиться техникам выхода из кровати',
    ],
    components: [
      'Sleep Restriction Therapy (SRT): расчёт TIB',
      'Stimulus Control Instructions (Bootzin)',
      'Правило 15-20 минут',
      'Минимальный безопасный TIB: 5.5 часов',
    ],
    homework: [
      'Соблюдать рассчитанное окно сна',
      'Применять правило 15-20 минут',
      'Использовать кровать только для сна',
      'Отмечать в дневнике соблюдение режима',
    ],
  },
  {
    id: 'sleep_behavior_2',
    weekNumber: 3,
    title: 'Sleep Behavior II',
    titleRu: 'Поведенческая практика',
    duration: '30-45 мин',
    icon: '🔄',
    objectives: [
      'Закрепить навыки SRT и SCT',
      'Скорректировать окно сна по данным SE',
      'Справиться с дневной сонливостью',
      'Работать с временным ухудшением сна',
    ],
    components: [
      'Обзор прогресса за неделю 2',
      'Корректировка TIB (+15 мин при SE ≥ 85%)',
      'Управление дневной сонливостью',
      'Нормализация "парадокса улучшения"',
    ],
    homework: [
      'Продолжать SRT с скорректированным окном',
      'Избегать дневного сна (или ≤20 мин до 15:00)',
      'Техники бодрствования: яркий свет, движение',
      'Записывать уровень сонливости (1-10)',
    ],
  },
  {
    id: 'sleep_education',
    weekNumber: 4,
    title: 'Sleep Education',
    titleRu: 'Гигиена сна',
    duration: '30-45 мин',
    icon: '🌙',
    objectives: [
      'Оптимизировать среду для сна',
      'Разработать вечерний ритуал',
      'Понять влияние факторов образа жизни',
      'Создать план улучшения гигиены сна',
    ],
    components: [
      'Температура, свет, шум в спальне',
      '90-минутный буфер перед сном',
      'Влияние кофеина, алкоголя, еды',
      'Физическая активность и сон',
    ],
    homework: [
      'Провести аудит спальни (чеклист)',
      'Создать 30-минутный вечерний ритуал',
      'Прекратить кофеин за 6 часов до сна',
      'Использовать ночной режим на устройствах',
    ],
  },
  {
    id: 'sleep_thoughts',
    weekNumber: 5,
    title: 'Sleep Thoughts',
    titleRu: 'Когнитивная терапия',
    duration: '45-60 мин',
    icon: '🧠',
    objectives: [
      'Выявить дисфункциональные убеждения о сне',
      'Освоить техники когнитивной реструктуризации',
      'Снизить тревогу, связанную со сном',
      'Изменить катастрофизацию последствий',
    ],
    components: [
      'DBAS-16: дисфункциональные убеждения',
      'Когнитивные искажения при инсомнии',
      'Техника реструктуризации мыслей',
      'Парадоксальное намерение',
    ],
    homework: [
      'Вести дневник мыслей о сне',
      'Практиковать реструктуризацию 1 мысли/день',
      'Опробовать парадоксальное намерение',
      'Заполнить DBAS в конце недели',
    ],
  },
  {
    id: 'problem_prevention',
    weekNumber: 6,
    title: 'Problem Prevention',
    titleRu: 'Профилактика рецидива',
    duration: '30-45 мин',
    icon: '🛡️',
    objectives: [
      'Закрепить достигнутые результаты',
      'Подготовить план на случай обострения',
      'Определить триггеры рецидива',
      'Создать долгосрочную стратегию',
    ],
    components: [
      'Обзор прогресса ISI (до/после)',
      'Идентификация персональных триггеров',
      'План действий при обострении',
      'Поддержание навыков КПТ-И',
    ],
    homework: [
      'Составить личный план профилактики',
      'Продолжать дневник сна 1-2 раза/неделю',
      'Пройти ISI через 4 недели (неделя 10)',
      'Применять навыки при первых признаках',
    ],
  },
] as const;

/**
 * /therapy Command Implementation
 * 6-Core Structured CBT-I Sessions
 */
export class TherapyCommand implements IConversationCommand {
  readonly name = 'therapy';
  readonly description = 'Терапевтические сессии КПТ-И';
  readonly aliases = ['session', 'терапия', 'сессия'];
  readonly requiresSession = true;

  readonly steps: TherapyStep[] = [
    'menu',
    'core_intro',
    'core_content',
    'core_exercise',
    'core_homework',
    'core_complete',
    'progress_review',
  ];

  /**
   * Main execute method - shows therapy menu
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession(ctx);
    }

    return this.handleStep(ctx, 'menu', {});
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step as TherapyStep) {
      case 'menu':
        return this.showTherapyMenu(ctx, data);

      case 'core_intro':
        return this.showCoreIntro(ctx, data);

      case 'core_content':
        return this.showCoreContent(ctx, data);

      case 'core_exercise':
        return this.showCoreExercise(ctx, data);

      case 'core_homework':
        return this.showCoreHomework(ctx, data);

      case 'core_complete':
        return this.showCoreComplete(ctx, data);

      case 'progress_review':
        return this.showProgressReview(ctx, data);

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
    const parts = callbackData.split(':');
    if (parts[0] !== 'therapy') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];
    const coreId = parts[2] as TherapyCore | undefined;

    switch (action) {
      case 'start_core':
        if (!coreId) return { success: false, error: 'Core ID required' };
        return this.handleStep(ctx, 'core_intro', {
          ...conversationData,
          currentCore: coreId,
        });

      case 'continue':
        return this.handleStep(ctx, 'core_content', conversationData);

      case 'exercise':
        return this.handleStep(ctx, 'core_exercise', conversationData);

      case 'homework':
        return this.handleStep(ctx, 'core_homework', conversationData);

      case 'complete':
        return this.handleStep(ctx, 'core_complete', conversationData);

      case 'menu':
        return this.handleStep(ctx, 'menu', conversationData);

      case 'progress':
        return this.handleStep(ctx, 'progress_review', conversationData);

      case 'locked':
        return this.showLockedCore(ctx, coreId);

      // ==================== Third-Wave Therapy Handlers ====================
      case 'third_wave_menu':
        return this.showThirdWaveMenu(ctx, conversationData);

      case 'start_mbti':
        return this.initializeThirdWaveTherapy(ctx, 'mbti', conversationData);

      case 'start_acti':
        return this.initializeThirdWaveTherapy(ctx, 'acti', conversationData);

      case 'start_mct':
        return this.initializeThirdWaveTherapy(ctx, 'mct', conversationData);

      case 'third_wave_info': {
        const therapyId = parts[2] as ThirdWaveTherapy | undefined;
        if (!therapyId) return { success: false, error: 'Therapy ID required' };
        return this.showThirdWaveInfo(ctx, therapyId, conversationData);
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ==================== Step Handlers ====================

  private async showNoSession(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для начала терапевтической программы необходимо:
1. Пройти регистрацию (/start)
2. Заполнить ISI-опросник
3. Вести дневник сна минимум 7 дней

${formatter.tip('Начните с /start для регистрации в программе')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showTherapyMenu(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Get user's current week in the program
    const session = ctx.sleepCore.getSession(ctx.userId);
    const currentWeek = this.getCurrentWeek(session);

    const greeting = sonya.greet({ userName: ctx.displayName || 'друг' });

    // Build session list with lock status
    const sessionLines: string[] = [];

    for (const core of CORE_SESSIONS) {
      const _isUnlocked = core.weekNumber <= currentWeek;
      const isCompleted = core.weekNumber < currentWeek;
      const isCurrent = core.weekNumber === currentWeek;

      let status: string;
      if (isCompleted) {
        status = '✅';
      } else if (isCurrent) {
        status = '▶️';
      } else {
        status = '🔒';
      }

      sessionLines.push(
        `${status} *Core ${core.weekNumber}*: ${core.titleRu} ${core.icon}`
      );
    }

    const message = `
${greeting.emoji} *${sonya.name} — Терапевтические сессии*

${formatter.header('6-недельная программа КПТ-И')}

${sessionLines.join('\n')}

${formatter.divider()}

📊 *Ваш прогресс:* Неделя ${currentWeek} из 8
${formatter.progressBar((currentWeek / 8) * 100, 10)}

${formatter.tip('Каждая сессия занимает 30-60 минут. Проходите по одной в неделю для лучшего усвоения.')}
    `.trim();

    // Build keyboard with available sessions
    const keyboard: IInlineButton[][] = [];

    for (const core of CORE_SESSIONS) {
      const isUnlocked = core.weekNumber <= currentWeek;

      if (isUnlocked) {
        keyboard.push([{
          text: `${core.icon} Core ${core.weekNumber}: ${core.titleRu}`,
          callbackData: `therapy:start_core:${core.id}`,
        }]);
      } else {
        keyboard.push([{
          text: `🔒 Core ${core.weekNumber}: ${core.titleRu}`,
          callbackData: `therapy:locked:${core.id}`,
        }]);
      }
    }

    keyboard.push([
      { text: '📊 Обзор прогресса', callbackData: 'therapy:progress' },
    ]);

    // Add third-wave therapy option when indicated (Week 6+ or non-responding)
    // Based on stepped care model (JCSM guidelines)
    const isThirdWaveIndicated = this.checkThirdWaveIndication(ctx, currentWeek);
    if (isThirdWaveIndicated) {
      keyboard.push([
        { text: '🌿 Альтернативные подходы (Third-Wave)', callbackData: 'therapy:third_wave_menu' },
      ]);
    }

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'menu', currentWeek },
    };
  }

  /**
   * Check if third-wave therapy is indicated
   * Based on stepped care model:
   * - Week 6+ evaluation point
   * - Non-response: ISI reduction < 7-8 points OR ISI still >= 8
   *
   * Research basis (2025-2026):
   * - European Insomnia Guideline 2023: Third-wave after CBT-I non-response [HIGH]
   * - 20-35% non-response rate to CBT-I [HIGH]
   * - Week 6-8 optimal evaluation point [HIGH]
   */
  private checkThirdWaveIndication(
    ctx: ISleepCoreContext,
    currentWeek: number
  ): boolean {
    // Only available from Week 6 (stepped care evaluation point)
    if (currentWeek < 6) return false;

    // Check if user has ISI still above threshold
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) return false;

    // Check via SleepCoreAPI method
    try {
      const isIndicated = ctx.sleepCore.isThirdWaveIndicated(ctx.userId);
      return isIndicated;
    } catch {
      // Fallback: show option if Week 6+ regardless of ISI
      return currentWeek >= 6;
    }
  }

  /**
   * Show third-wave therapy menu
   * Displayed when user is a non-responder at Week 6+
   */
  private async showThirdWaveMenu(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    const currentWeek = this.getCurrentWeek(session);

    // Get recommendation from SleepCoreAPI
    let recommendation = null;
    try {
      recommendation = ctx.sleepCore.recommendThirdWaveApproach(ctx.userId, {
        failedCBTI: currentWeek >= 6,
        preferences: [],
      });
    } catch {
      // Continue without recommendation
    }

    const therapyOptions = THIRD_WAVE_SESSIONS.map((t) => {
      const isRecommended = recommendation?.recommendedApproach === t.id;
      const recommendedMark = isRecommended ? ' ⭐' : '';
      return `${t.icon} *${t.titleRu}*${recommendedMark}
   └ ${t.sessions} сессий • ${t.description.slice(0, 60)}...`;
    }).join('\n\n');

    const message = `
${formatter.header('Альтернативные подходы (Third-Wave)')}

${formatter.warning('Важно')}
Эти терапии рекомендованы при недостаточном ответе на стандартную КПТ-И.
Они _дополняют_, а не заменяют базовые техники.

${formatter.divider()}

${therapyOptions}

${formatter.divider()}

${recommendation ? `
🎯 *Рекомендация на основе вашего профиля:*
${recommendation.rationale}
` : ''}

${formatter.tip('Выберите терапию для подробной информации. Рекомендуемые отмечены ⭐')}
    `.trim();

    const keyboard: IInlineButton[][] = [];

    for (const therapy of THIRD_WAVE_SESSIONS) {
      const isRecommended = recommendation?.recommendedApproach === therapy.id;
      keyboard.push([{
        text: `${therapy.icon} ${therapy.titleRu}${isRecommended ? ' ⭐' : ''}`,
        callbackData: `therapy:third_wave_info:${therapy.id}`,
      }]);
    }

    keyboard.push([
      { text: '⬅️ Назад к меню КПТ-И', callbackData: 'therapy:menu' },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'third_wave_menu', currentWeek },
    };
  }

  /**
   * Show detailed info about a specific third-wave therapy
   */
  private async showThirdWaveInfo(
    ctx: ISleepCoreContext,
    therapyId: ThirdWaveTherapy,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const therapy = THIRD_WAVE_SESSIONS.find((t) => t.id === therapyId);
    if (!therapy) {
      return { success: false, error: 'Therapy not found' };
    }

    const bestForList = therapy.bestFor.map((b) => `• ${b}`).join('\n');
    const contraindicationsList = therapy.contraindications.map((c) => `• ${c}`).join('\n');

    const message = `
${therapy.icon} *${therapy.titleRu}*
_(${therapy.title})_

${formatter.divider()}

📝 *Описание:*
${therapy.description}

${formatter.divider()}

📊 *Структура:* ${therapy.sessions} сессий

${formatter.header('Лучше всего подходит при')}
${bestForList}

${formatter.divider()}

${formatter.warning('Противопоказания')}
${contraindicationsList}

${formatter.divider()}

${formatter.tip('Нажмите "Начать", чтобы инициализировать план терапии. Вы сможете вернуться к КПТ-И в любой момент.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: `🚀 Начать ${therapy.titleRu}`, callbackData: `therapy:start_${therapy.id}` }],
      [{ text: '⬅️ Назад к выбору', callbackData: 'therapy:third_wave_menu' }],
      [{ text: '📋 К меню КПТ-И', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Initialize a third-wave therapy plan
   *
   * IMPORTANT: This is a significant therapeutic decision.
   * - Framed as enhancement, not failure (UX research: reduces dropout)
   * - User retains autonomy to return to CBT-I
   * - Requires 7+ days of baseline data
   */
  private async initializeThirdWaveTherapy(
    ctx: ISleepCoreContext,
    therapyId: ThirdWaveTherapy,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const therapy = THIRD_WAVE_SESSIONS.find((t) => t.id === therapyId);
    if (!therapy) {
      return { success: false, error: 'Therapy not found' };
    }

    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: false,
        error: 'Сессия не найдена. Пожалуйста, начните с /start',
      };
    }

    // Get baseline data
    const sleepStates = ctx.sleepCore.getSleepStates(ctx.userId);
    if (!sleepStates || sleepStates.length < 7) {
      return {
        success: false,
        message: `
${formatter.warning('Недостаточно данных')}

Для начала ${therapy.titleRu} необходимо минимум 7 дней данных в дневнике сна.

Текущее количество записей: ${sleepStates?.length || 0}

${formatter.tip('Продолжайте вести дневник сна (/diary) ежедневно')}
        `.trim(),
        keyboard: [[{ text: '⬅️ Назад', callbackData: 'therapy:third_wave_menu' }]],
      };
    }

    try {
      let planInfo: string;

      switch (therapyId) {
        case 'mbti': {
          const mbtiPlan = ctx.sleepCore.initializeMBTI(ctx.userId, sleepStates);
          planInfo = `
📅 *Начало:* ${mbtiPlan.startDate}
📊 *Текущая неделя:* ${mbtiPlan.currentWeek} из ${mbtiPlan.totalWeeks}
🎯 *Ежедневная практика:* ${mbtiPlan.dailyPracticeTarget} минут медитации
          `.trim();
          break;
        }
        case 'acti': {
          const actiPlan = ctx.sleepCore.initializeACTI(ctx.userId, sleepStates);
          planInfo = `
📅 *Начало:* ${actiPlan.startDate}
📊 *Сессия:* ${actiPlan.currentSession} из ${actiPlan.totalSessions}
🎯 *Фокус:* Психологическая гибкость
          `.trim();
          break;
        }
        case 'mct': {
          const mctPlan = ctx.sleepCore.initializeMCT(ctx.userId, sleepStates);
          planInfo = `
📅 *Начало:* ${mctPlan.startDate}
📊 *Сессия:* ${mctPlan.currentSession} из ${mctPlan.totalSessions}
🎯 *Фокус:* Метакогнитивные стратегии
          `.trim();
          break;
        }
        default:
          return { success: false, error: 'Unknown therapy type' };
      }

      const message = `
${formatter.header(`${therapy.icon} План ${therapy.titleRu} создан!`)}

🎉 *Поздравляем!*

Вы сделали важный шаг к улучшению сна. Этот подход _дополняет_ ваш опыт с КПТ-И.

${formatter.divider()}

${planInfo}

${formatter.divider()}

${formatter.tip('Техники третьей волны требуют регулярной практики. Выделите 15-30 минут ежедневно.')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📋 К меню терапии', callbackData: 'therapy:menu' }],
      ];

      return {
        success: true,
        message,
        keyboard,
        metadata: {
          thirdWaveInitialized: therapyId,
          initializedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      return {
        success: false,
        message: `
${formatter.warning('Ошибка инициализации')}

Не удалось создать план терапии: ${errorMessage}

${formatter.tip('Попробуйте позже или обратитесь в поддержку')}
        `.trim(),
        keyboard: [[{ text: '⬅️ Назад', callbackData: 'therapy:third_wave_menu' }]],
      };
    }
  }

  private async showCoreIntro(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const coreId = data.currentCore as TherapyCore;
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    if (!core) {
      return { success: false, error: 'Core not found' };
    }

    const objectivesList = core.objectives
      .map((obj, i) => `${i + 1}. ${obj}`)
      .join('\n');

    const message = `
${core.icon} *Core ${core.weekNumber}: ${core.titleRu}*
_(${core.title})_

${formatter.divider()}

⏱ *Длительность:* ${core.duration}

${formatter.header('Цели сессии')}

${objectivesList}

${formatter.divider()}

${sonya.tip('Устройтесь поудобнее. Эта сессия заложит важную основу для улучшения вашего сна.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '▶️ Начать сессию', callbackData: 'therapy:continue' }],
      [{ text: '⬅️ Назад к меню', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'core_intro' },
    };
  }

  private async showCoreContent(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const coreId = data.currentCore as TherapyCore;
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    if (!core) {
      return { success: false, error: 'Core not found' };
    }

    // Get detailed content for this core
    // For SRT session (sleep_behavior_1), add personalized sleep window
    let content = this.getCoreContent(core);

    // Integrate with real CBT-I engines for personalized content
    // January 2026: Enhanced integration based on Furukawa 2024 JAMA NMA findings
    if (coreId === 'sleep_behavior_1' || coreId === 'sleep_behavior_2') {
      // Add SRT content (most effective: d = −0.45) [HIGH confidence]
      const personalizedSRT = this.getPersonalizedSRTContent(ctx);
      if (personalizedSRT) {
        content += '\n\n' + personalizedSRT;
      }

      // Add SCT content (consistently effective) [HIGH confidence]
      const personalizedSCT = this.getPersonalizedSCTContent(ctx);
      if (personalizedSCT) {
        content += '\n\n' + personalizedSCT;
      }
    }

    // For sleep hygiene session, add personalized assessment
    // Note: Sleep hygiene NOT effective as standalone (Furukawa 2024)
    // but useful as adjunct to SRT/SCT [HIGH confidence]
    if (coreId === 'sleep_education') {
      const personalizedHygiene = this.getPersonalizedHygieneContent(ctx);
      if (personalizedHygiene) {
        content += '\n\n' + personalizedHygiene;
      }
    }

    // For cognitive therapy session, add personalized belief analysis
    if (coreId === 'sleep_thoughts') {
      const personalizedCR = this.getPersonalizedCRContent(ctx);
      if (personalizedCR) {
        content += '\n\n' + personalizedCR;
      }
    }

    const componentsList = core.components
      .map((comp) => `• ${comp}`)
      .join('\n');

    const message = `
${core.icon} *Core ${core.weekNumber}: ${core.titleRu}*

${formatter.header('Содержание сессии')}

${componentsList}

${formatter.divider()}

${content}

${formatter.divider()}

${formatter.tip('Прочитайте материал внимательно. Затем перейдите к практическому упражнению.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Перейти к упражнению', callbackData: 'therapy:exercise' }],
      [{ text: '⬅️ Назад', callbackData: 'therapy:start_core:' + coreId }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'core_content' },
    };
  }

  private async showCoreExercise(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const coreId = data.currentCore as TherapyCore;
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    if (!core) {
      return { success: false, error: 'Core not found' };
    }

    // Get interactive exercise for this core
    const exercise = this.getCoreExercise(core);

    const message = `
${core.icon} *Практическое упражнение*
_Core ${core.weekNumber}: ${core.titleRu}_

${formatter.divider()}

${exercise}

${formatter.divider()}

${sonya.tip('Выполните упражнение прямо сейчас или запланируйте на удобное время.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Выполнено', callbackData: 'therapy:homework' }],
      [{ text: '📝 Запомнить на потом', callbackData: 'therapy:homework' }],
      [{ text: '⬅️ Вернуться к материалу', callbackData: 'therapy:continue' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'core_exercise' },
    };
  }

  private async showCoreHomework(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const coreId = data.currentCore as TherapyCore;
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    if (!core) {
      return { success: false, error: 'Core not found' };
    }

    const homeworkList = core.homework
      .map((hw, i) => `${i + 1}. ${hw}`)
      .join('\n');

    const message = `
${core.icon} *Домашнее задание*
_Core ${core.weekNumber}: ${core.titleRu}_

${formatter.divider()}

${formatter.header('На эту неделю')}

${homeworkList}

${formatter.divider()}

⏰ *Следующая сессия:* через 7 дней
📓 *Не забывайте:* вести дневник сна каждый день

${sonya.tip('Регулярное выполнение заданий — ключ к успеху терапии. Исследования показывают, что adherence > 80% даёт лучшие результаты.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Завершить сессию', callbackData: 'therapy:complete' }],
      [{ text: '📓 Открыть дневник', callbackData: 'diary:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'core_homework' },
    };
  }

  private async showCoreComplete(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const coreId = data.currentCore as TherapyCore;
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    if (!core) {
      return { success: false, error: 'Core not found' };
    }

    // Calculate next session info
    const nextCoreIndex = CORE_SESSIONS.findIndex((c) => c.id === coreId) + 1;
    const nextCore = CORE_SESSIONS[nextCoreIndex];

    let nextSessionInfo: string;
    if (nextCore) {
      nextSessionInfo = `🔜 *Следующая сессия:* Core ${nextCore.weekNumber}: ${nextCore.titleRu}`;
    } else {
      nextSessionInfo = '🎉 *Поздравляем!* Вы завершили основную программу КПТ-И';
    }

    const encouragement = sonya.encourageByWeek(core.weekNumber);

    const message = `
${formatter.success('Сессия завершена!')}

${core.icon} *Core ${core.weekNumber}: ${core.titleRu}* ✅

${formatter.divider()}

${encouragement.emoji} ${encouragement.text}

${nextSessionInfo}

📊 *Ваш прогресс:*
${formatter.progressBar((core.weekNumber / 6) * 100, 10)}
${core.weekNumber}/6 сессий пройдено

${formatter.divider()}

${formatter.tip('Помните: КПТ-И требует времени. Первые результаты обычно появляются к 3-4 неделе.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 К списку сессий', callbackData: 'therapy:menu' }],
      [{ text: '📊 Мой прогресс', callbackData: 'therapy:progress' }],
    ];

    // Record session completion
    // Note: In production, this would update UserRepository

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        ...data,
        step: 'core_complete',
        completedCore: coreId,
        completedAt: new Date().toISOString(),
      },
    };
  }

  private async showProgressReview(
    ctx: ISleepCoreContext,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    const currentWeek = this.getCurrentWeek(session);

    // Build progress summary
    const completedSessions = Math.max(0, currentWeek - 1);
    const progressPercent = (completedSessions / 6) * 100;

    // Get ISI trend (mock for now)
    const isiTrend = this.getISITrend(ctx);

    const message = `
${formatter.header('Обзор прогресса')}

👤 *${ctx.displayName || 'Пользователь'}*
📅 Неделя программы: ${currentWeek} из 8

${formatter.divider()}

📊 *Терапевтические сессии:*
${formatter.progressBar(progressPercent, 10)}
${completedSessions}/6 сессий завершено

${formatter.divider()}

📈 *Динамика ISI:*
${isiTrend}

${formatter.divider()}

🎯 *Клинические цели:*
• ISI < 7 (ремиссия) — ${this.getGoalStatus('isi', ctx)}
• SE ≥ 85% — ${this.getGoalStatus('se', ctx)}
• SOL < 20 мин — ${this.getGoalStatus('sol', ctx)}
• WASO < 30 мин — ${this.getGoalStatus('waso', ctx)}

${formatter.tip('Регулярное прохождение ISI каждые 2 недели помогает отслеживать прогресс')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 К сессиям', callbackData: 'therapy:menu' }],
      [{ text: '📝 Пройти ISI', callbackData: 'start:begin_assessment' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { ...data, step: 'progress_review' },
    };
  }

  private async showLockedCore(
    _ctx: ISleepCoreContext,
    coreId: TherapyCore | undefined
  ): Promise<ICommandResult> {
    const core = CORE_SESSIONS.find((c) => c.id === coreId);

    const message = `
${formatter.warning('Сессия заблокирована')}

${core ? `🔒 *Core ${core.weekNumber}: ${core.titleRu}*` : '🔒 Сессия недоступна'}

Для разблокировки необходимо:
1. Завершить предыдущие сессии
2. Вести дневник сна ежедневно
3. Дождаться начала соответствующей недели

${formatter.tip('Последовательное прохождение программы даёт лучшие результаты')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⬅️ Назад к меню', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  // ==================== Content Helpers ====================

  /**
   * Get personalized Sleep Restriction content from treatment plan
   * Uses SleepRestrictionEngine calculations via SleepCoreAPI
   *
   * Research basis (2025-2026):
   * - Initial TIB = Average TST (min 5-5.5h) [AASM 2021, HIGH confidence]
   * - Weekly titration: SE ≥90% → +15min, SE <85% → -15min [HIGH confidence]
   * - Fixed wake time as anchor [Bootzin, HIGH confidence]
   *
   * @param ctx - Sleep core context with user session
   * @returns Personalized SRT content or null if no plan
   */
  private getPersonalizedSRTContent(ctx: ISleepCoreContext): string | null {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session?.plan?.activeComponents.sleepRestriction) {
      return null;
    }

    const sr = session.plan.activeComponents.sleepRestriction;

    // Format times for display
    const bedtime = sr.prescribedBedtime || 'не определено';
    const wakeTime = sr.prescribedWakeTime || 'не определено';
    const tibMinutes = sr.prescribedTIB || 0;
    const tibHours = Math.floor(tibMinutes / 60);
    const tibMins = tibMinutes % 60;
    const tibDisplay = tibMins > 0 ? `${tibHours}ч ${tibMins}мин` : `${tibHours}ч`;

    // Get current SE from progress
    const progress = ctx.sleepCore.getProgressReport(ctx.userId);
    const currentSE = progress?.currentSleepEfficiency
      ? `${progress.currentSleepEfficiency.toFixed(1)}%`
      : 'рассчитывается...';

    // Determine titration recommendation
    let titrationAdvice: string;
    if (progress?.currentSleepEfficiency) {
      const se = progress.currentSleepEfficiency;
      if (se >= 90) {
        titrationAdvice = '📈 SE ≥ 90%: можно увеличить TIB на 15 минут';
      } else if (se >= 85) {
        titrationAdvice = '📊 SE 85-90%: поддерживайте текущее окно';
      } else {
        titrationAdvice = '📉 SE < 85%: сохраняйте текущее окно (или сократите на 15 мин)';
      }
    } else {
      titrationAdvice = 'Титрация будет доступна после недели данных';
    }

    return `
${formatter.header('Ваш персональный режим сна')}

🛏 *Время отбоя:* ${bedtime}
⏰ *Время подъёма:* ${wakeTime}
⏱ *Время в кровати (TIB):* ${tibDisplay}

📊 *Текущая эффективность сна (SE):* ${currentSE}

${formatter.divider()}

*Рекомендация по титрации:*
${titrationAdvice}

⚠️ *Важно:* Минимальный безопасный TIB = 5.5 часов
    `.trim();
  }

  /**
   * Get personalized Cognitive Restructuring content from CognitiveRestructuringEngine
   * Uses SleepCoreAPI methods for belief identification and Socratic questioning
   *
   * Research basis (2025-2026):
   * - DBAS-16 identifies 5 categories of dysfunctional beliefs [Harvey 2002, HIGH confidence]
   * - Socratic questioning most effective for sleep-specific beliefs [HIGH confidence]
   * - Beck/Morin cognitive model: Situation → Automatic Thought → Emotion → Behavior
   * - Cognitive defusion (ACT) effective for rumination [MEDIUM confidence]
   *
   * @param ctx - Sleep core context with user session
   * @returns Personalized CR content or null if no plan
   */
  private getPersonalizedCRContent(ctx: ISleepCoreContext): string | null {
    try {
      const session = ctx.sleepCore.getSession(ctx.userId);
      if (!session) {
        return null;
      }

      // Get cognitive targets from plan
      const cognitiveTargets = session?.plan?.activeComponents.cognitiveTargets;

      // If no plan targets, try to identify beliefs from recent user text
      // This uses the CognitiveRestructuringEngine directly
      let beliefs = cognitiveTargets || [];

      if (beliefs.length === 0) {
        // Try to get beliefs from recent diary entries or user inputs
        const recentText = this.getRecentUserText(ctx);
        if (recentText) {
          beliefs = ctx.sleepCore.identifyCognitiveBeliefs(ctx.userId, recentText);
        }
      }

      if (!beliefs || beliefs.length === 0) {
        return null;
      }

      // Build personalized content with Socratic questions
      const beliefSections: string[] = [];

      for (const belief of beliefs.slice(0, 2)) {
        // Get Socratic questions for this belief
        const questions = ctx.sleepCore.getSocraticQuestions(belief);

        // Generate alternative thought
        // ICognitiveRestructuringEngine.generateAlternativeThought expects { for: [], against: [] }
        const alternative = ctx.sleepCore.generateAlternativeThought(
          belief,
          {
            for: belief.evidenceFor || [],
            against: belief.evidenceAgainst || ['Реальные доказательства из вашего опыта'],
          }
        );

        beliefSections.push(`
*🔴 ${belief.category || 'Убеждение'}:*
"${belief.belief}"

*Сократические вопросы:*
${questions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}

*💚 Альтернативная мысль:*
"${alternative || belief.alternativeThought || 'Определите вместе с терапевтом'}"
        `.trim());
      }

      // Get cognitive progress report if available
      // Uses ICognitiveProgressReport.summary per interface spec
      const progressReport = ctx.sleepCore.getCognitiveProgressReport(ctx.userId);
      const progressSection = progressReport
        ? `
📊 *Прогресс когнитивной терапии:*
• Проработано убеждений: ${progressReport.summary.totalBeliefs || 0}
• Сформулировано альтернатив: ${progressReport.summary.successfulRestructurings || 0}`
        : '';

      // Average belief reduction from progress report (0-100 scale)
      // Note: This represents belief intensity reduction, not DBAS-16 score
      const beliefReduction = progressReport?.summary.avgBeliefReduction
        ? `${Math.round(progressReport.summary.avgBeliefReduction)}% снижение (${this.getBeliefReductionLevel(progressReport.summary.avgBeliefReduction)})`
        : 'оцените в упражнении';
      const dbasTarget = 'снижение на 20%+';

      return `
${formatter.header('Когнитивная реструктуризация')}

${formatter.divider()}

${beliefSections.join('\n\n' + formatter.divider() + '\n\n')}

${formatter.divider()}

📊 *Прогресс:* ${beliefReduction}
🎯 *Цель:* ${dbasTarget}
${progressSection}

💡 *Практика на эту неделю:*
Работайте над одним убеждением в день:
1. Заметьте автоматическую мысль
2. Задайте себе сократические вопросы
3. Сформулируйте альтернативу
4. Оцените изменение эмоций (0-100)
      `.trim();
    } catch {
      // Fallback to simple content if engine unavailable
      return this.getSimpleCRContent(ctx);
    }
  }

  /**
   * Get recent user text for cognitive belief analysis
   * Extracts text from diary entries, assessments, or conversation
   */
  private getRecentUserText(ctx: ISleepCoreContext): string | null {
    try {
      // Get recent diary entries with notes
      const sleepStates = ctx.sleepCore.getSleepStates(ctx.userId);
      if (sleepStates && sleepStates.length > 0) {
        // Extract notes from recent entries
        const recentNotes = sleepStates
          .slice(0, 7)
          .map((s) => (s as { notes?: string }).notes)
          .filter(Boolean)
          .join(' ');
        if (recentNotes.length > 20) {
          return recentNotes;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Simple CR content fallback when engine unavailable
   */
  private getSimpleCRContent(ctx: ISleepCoreContext): string | null {
    const session = ctx.sleepCore.getSession(ctx.userId);
    const cognitiveTargets = session?.plan?.activeComponents.cognitiveTargets;
    if (!cognitiveTargets || cognitiveTargets.length === 0) {
      return null;
    }

    const beliefLines: string[] = [];
    for (const belief of cognitiveTargets.slice(0, 3)) {
      beliefLines.push(`• *${belief.category || 'Убеждение'}:* ${belief.belief}`);
      if (belief.alternativeThought) {
        beliefLines.push(`  ↳ Альтернатива: ${belief.alternativeThought}`);
      }
    }

    return `
${formatter.header('Ваши выявленные убеждения')}

${beliefLines.join('\n')}

${formatter.divider()}

💡 *Практика на эту неделю:*
Работайте над одним убеждением в день, используя
технику реструктуризации (см. упражнение).
    `.trim();
  }

  /**
   * Get DBAS-16 severity label (Russian)
   * Based on Morin et al. cutoffs
   */
  private getDBASSeverity(score: number): string {
    if (score <= 3) return 'норма';
    if (score <= 5) return 'умеренные искажения';
    if (score <= 7) return 'выраженные искажения';
    return 'тяжёлые искажения';
  }

  /**
   * Get belief reduction level interpretation
   * Based on cognitive restructuring progress (0-100%)
   * Research: 20%+ reduction considered clinically significant
   */
  private getBeliefReductionLevel(reduction: number): string {
    if (reduction >= 50) return 'отличный результат';
    if (reduction >= 30) return 'хороший прогресс';
    if (reduction >= 20) return 'клинически значимо';
    if (reduction >= 10) return 'начальный прогресс';
    return 'в процессе';
  }

  /**
   * Get personalized Stimulus Control content from StimulusControlEngine
   * Uses SleepCoreAPI.getStimulusControlRules() for Bootzin's 6 rules
   *
   * Research basis (2025-2026):
   * - Bootzin (1972): Original SCT instructions [HIGH confidence]
   * - Furukawa 2024 JAMA: SCT consistently effective as adjunct [HIGH confidence]
   * - AASM 2021: Strong recommendation for SCT [HIGH confidence]
   *
   * @param ctx - Sleep core context with user session
   * @returns Personalized SCT content or null if unavailable
   */
  private getPersonalizedSCTContent(ctx: ISleepCoreContext): string | null {
    try {
      const sctRules = ctx.sleepCore.getStimulusControlRules(ctx.userId);
      if (!sctRules) {
        return null;
      }

      // Get adherence tracking if available
      const adherence = ctx.sleepCore.trackStimulusControlAdherence(ctx.userId);

      // Build personalized rules list from IStimulusControlRules flat structure
      // Bootzin's 6 rules mapped to interface properties
      // Adherence keys match IStimulusControlAdherence property names
      const bootzinRules = [
        { adherenceKey: 'wentToBedWhenSleepy' as const, enabled: sctRules.goToBedWhenSleepy, text: 'Ложитесь спать только когда сонливы' },
        { adherenceKey: 'usedBedOnlyForSleep' as const, enabled: sctRules.bedOnlyForSleep, text: 'Кровать — только для сна (и интимной близости)' },
        { adherenceKey: 'leftBedWhenAwake' as const, enabled: sctRules.leaveIfAwake, text: `Покиньте кровать, если не уснули за ${sctRules.leaveThresholdMinutes || 20} минут` },
        { adherenceKey: 'leftBedWhenAwake' as const, enabled: sctRules.returnWhenSleepy, text: 'Возвращайтесь в кровать только когда сонливы' },
        { adherenceKey: 'maintainedFixedWakeTime' as const, enabled: sctRules.fixedWakeTime, text: `Вставайте в одно время (${sctRules.wakeTime || '07:00'}) независимо от сна` },
        { adherenceKey: 'avoidedNaps' as const, enabled: sctRules.noNapping, text: 'Избегайте дневного сна' },
      ];

      const rulesList = bootzinRules.map((rule, i) => {
        // Check adherence using mapped property name from IStimulusControlAdherence
        const isAdherent = adherence ? adherence[rule.adherenceKey] : false;
        const adherenceIcon = isAdherent ? '✅' : rule.enabled ? '⬜' : '⚪';
        return `${adherenceIcon} *Правило ${i + 1}:* ${rule.text}`;
      }).join('\n');

      // Calculate overall adherence
      const adherencePercent = adherence
        ? Math.round((adherence.overallAdherence || 0) * 100)
        : null;

      const adherenceSection = adherencePercent !== null
        ? `
📊 *Ваше соблюдение SCT:* ${adherencePercent}%
${formatter.progressBar(adherencePercent, 10)}
${adherencePercent >= 80 ? '✅ Отличная приверженность!' : '💪 Продолжайте практиковать!'}`
        : '';

      // Get leave reminder based on typical awake time
      const leaveReminder = ctx.sleepCore.getLeaveReminder(20);

      return `
${formatter.header('Ваши правила контроля стимулов (SCT)')}

*6 правил Bootzin:*
${rulesList}

${formatter.divider()}

⏱ *Правило 15-20 минут:*
${leaveReminder}

${adherenceSection}

💡 *Ключевой принцип:* Кровать = только сон.
Это восстанавливает ассоциацию между кроватью и сонливостью.
      `.trim();
    } catch {
      // Return null if engine unavailable
      return null;
    }
  }

  /**
   * Get personalized Sleep Hygiene content from SleepHygieneEngine
   * Uses SleepCoreAPI.assessSleepHygiene() for 9 Hauri categories
   *
   * Research basis (2025-2026):
   * - Hauri (1991): Original 9 sleep hygiene categories
   * - Furukawa 2024 JAMA: Sleep hygiene NOT effective as standalone
   *   but useful as adjunct to SRT/SCT [HIGH confidence]
   * - AASM 2021: Conditional recommendation (adjunct only)
   *
   * IMPORTANT: Always frame as ADJUNCT to behavioral interventions
   *
   * @param ctx - Sleep core context with user session
   * @returns Personalized hygiene content or null if unavailable
   */
  private getPersonalizedHygieneContent(ctx: ISleepCoreContext): string | null {
    try {
      const assessment = ctx.sleepCore.assessSleepHygiene(ctx.userId);
      if (!assessment) {
        return null;
      }

      // Get improvement tracking
      const improvement = ctx.sleepCore.trackHygieneImprovement(ctx.userId);

      // Category name mappings (9 Hauri categories)
      const categoryNames: Record<string, string> = {
        caffeine: 'Кофеин',
        alcohol: 'Алкоголь',
        nicotine: 'Никотин',
        exercise: 'Физическая активность',
        diet: 'Питание',
        environment: 'Обстановка для сна',
        screen_time: 'Экраны',
        routine: 'Режим дня',
        stress: 'Управление стрессом',
      };

      // Build category assessment list from scores Record
      // ISleepHygieneAssessment.scores: Record<SleepHygieneCategory, number> (0-1)
      const categoryLines: string[] = [];
      for (const [category, scoreValue] of Object.entries(assessment.scores)) {
        const scorePercent = Math.round((scoreValue as number) * 100);
        const icon = scorePercent >= 80 ? '✅' : scorePercent >= 60 ? '🔶' : '🔴';
        const categoryName = categoryNames[category] || category;
        categoryLines.push(`${icon} *${categoryName}:* ${scorePercent}%`);
      }

      // Get priority issues from topIssues array and recommendations
      const priorityIssues: string[] = assessment.recommendations
        .filter((rec) => rec.priority === 'high')
        .slice(0, 3)
        .map((rec) => rec.recommendation);

      // Build priority recommendations section
      const prioritySection = priorityIssues.length > 0
        ? `
${formatter.header('Приоритетные улучшения')}
${priorityIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`
        : '';

      // Improvement tracking
      const improvementSection = improvement
        ? `
📈 *Улучшения за неделю:*
✅ Улучшено: ${improvement.improved.length} категорий
⚠️ Требует внимания: ${improvement.declined.length} категорий`
        : '';

      // CRITICAL: Evidence-based disclaimer
      const disclaimer = `
⚠️ *Важно:* Гигиена сна эффективна только как дополнение
к поведенческим техникам (SRT, SCT). Сама по себе не лечит
хроническую инсомнию (Furukawa 2024, JAMA).`;

      return `
${formatter.header('Оценка гигиены сна (9 категорий)')}

${categoryLines.join('\n')}

${formatter.divider()}

*Общий балл:* ${Math.round(assessment.overallScore * 100)}%
${formatter.progressBar(Math.round(assessment.overallScore * 100), 10)}
${prioritySection}
${improvementSection}

${formatter.divider()}
${disclaimer}
      `.trim();
    } catch {
      // Return null if engine unavailable
      return null;
    }
  }

  private getCoreContent(core: ICoreSession): string {
    const contentMap: Record<TherapyCore, string> = {
      overview: `
*🧠 Что такое инсомния?*

Инсомния — это не просто "плохой сон". Это нарушение, при котором:
• Трудно заснуть или поддерживать сон
• Сон не приносит восстановления
• Это влияет на дневное функционирование

*📐 3P-модель Spielman*

1️⃣ *Predisposing* (предрасполагающие факторы):
   Генетика, темперамент, склонность к тревоге

2️⃣ *Precipitating* (провоцирующие):
   Стресс, болезнь, смена работы, развод

3️⃣ *Perpetuating* (поддерживающие):
   Привычки, которые закрепляют проблему:
   • Долгое лежание в кровати без сна
   • Нерегулярный режим
   • Дневной сон
   • Катастрофизация

*💡 КПТ-И работает на P3* — меняет поведение и мысли, поддерживающие инсомнию.
      `,

      sleep_behavior_1: `
*🛏️ Ограничение сна (Sleep Restriction Therapy)*

Парадоксально, но для улучшения сна нужно *сократить* время в кровати.

*Как это работает:*
1. Рассчитываем среднее время сна (TST) по дневнику
2. Устанавливаем TIB (время в кровати) = TST + 30 мин
3. Минимум: *5.5 часов* (безопасность)
4. Фиксируем время подъёма (якорь)

*📊 Пример:*
Если вы спите в среднем 5 часов:
• TIB = 5.5 часов (минимум)
• Подъём: 07:00
• Отбой: 01:30

*🚪 Контроль стимулов (Bootzin Instructions):*
1. Ложитесь только когда сонливы
2. Кровать = только сон (не работа, не телефон)
3. Если не спите 15-20 мин — встаньте
4. Вернитесь когда снова сонливы
5. Подъём в одно время независимо от качества сна
      `,

      sleep_behavior_2: `
*🔄 Закрепление навыков*

К этому моменту вы практикуете SRT и SCT уже неделю. Это сложно, но вы на правильном пути.

*📈 Когда корректировать TIB:*
• SE ≥ 90% три дня подряд → +15 мин TIB
• SE ≥ 85% → поддерживаем текущее
• SE < 85% → можно сократить на 15 мин (не ниже 5.5ч)

*😴 Дневная сонливость — это нормально:*
Первые 1-3 недели SRT часто вызывают усталость. Это:
• Признак работы терапии
• Создаёт "давление сна"
• Проходит к 3-4 неделе

*⚠️ Важно:*
• Не садитесь за руль если очень сонливы
• Избегайте дневного сна (или макс 20 мин до 15:00)
• Яркий свет утром помогает бодрости
      `,

      sleep_education: `
*🌙 Оптимизация среды сна*

*🌡️ Температура:*
• Идеально: 18-20°C
• Прохладнее лучше чем теплее
• Тёплая ванна за 90 мин до сна → охлаждение тела → сонливость

*💡 Свет:*
• Яркий свет утром (первые 30 мин после пробуждения)
• Приглушённый свет за 2 часа до сна
• Блокировка синего света вечером (f.lux, Night Shift)

*🔇 Шум:*
• Тишина или белый шум
• Беруши если нужно
• Избегайте резких звуков

*☕ Образ жизни:*
• Кофеин: последний за 6 часов до сна
• Алкоголь: нарушает структуру сна (избегать за 4ч)
• Еда: лёгкий ужин за 2-3 часа до сна
• Спорт: отлично, но не позже чем за 4 часа до сна
      `,

      sleep_thoughts: `
*🧠 Когнитивная реструктуризация*

Мысли о сне влияют на сон. Часто мы сами усиливаем проблему.

*❌ Типичные когнитивные искажения:*

1️⃣ *Катастрофизация:*
"Если я не высплюсь, завтра будет ужасный день"
↓
✅ "Я справлюсь, даже если поспал не идеально"

2️⃣ *Нереалистичные ожидания:*
"Я должен спать 8 часов каждую ночь"
↓
✅ "Потребность во сне индивидуальна (6-9ч)"

3️⃣ *Преувеличение последствий:*
"Бессонница разрушает моё здоровье"
↓
✅ "Тело адаптируется, и я могу это изменить"

*🎯 Техника реструктуризации:*
1. Заметить автоматическую мысль
2. Спросить: "Есть ли доказательства?"
3. Найти альтернативную интерпретацию
4. Оценить реалистично
      `,

      problem_prevention: `
*🛡️ Профилактика рецидива*

Вы прошли основную программу! Теперь важно сохранить результаты.

*⚠️ Типичные триггеры рецидива:*
• Сильный стресс (работа, отношения)
• Путешествия и смена часовых поясов
• Болезнь
• Отпуск от режима ("расслаблюсь на выходных")

*📋 Ваш план действий при обострении:*

1. *Первые признаки* (1-2 плохих ночи):
   → Не паниковать, это нормально
   → Применить SCT (правило 15 мин)

2. *Продолжение* (3-5 ночей):
   → Вернуться к строгому режиму
   → Временно сократить TIB
   → Возобновить дневник сна

3. *Затяжное* (>1 недели):
   → Пройти ISI для оценки
   → Вернуться к Core 2 (SRT/SCT)
   → Рассмотреть консультацию специалиста

*🎯 Поддержание навыков:*
• Дневник сна 1-2 раза в неделю
• ISI каждые 4 недели
• Режим ±30 мин (даже в выходные)
      `,
    };

    return (contentMap[core.id] || 'Содержание сессии').trim();
  }

  private getCoreExercise(core: ICoreSession): string {
    const exerciseMap: Record<TherapyCore, string> = {
      overview: `
*📝 Упражнение: Анализ вашей инсомнии по 3P*

Подумайте и запишите:

1️⃣ *Predisposing* — что меня предрасполагает?
   (характер, наследственность, склонность к тревоге)
   _________________________________

2️⃣ *Precipitating* — что спровоцировало проблему?
   (когда началось, какое событие)
   _________________________________

3️⃣ *Perpetuating* — что поддерживает проблему сейчас?
   (привычки, поведение, мысли)
   _________________________________

💡 Осознание этих факторов — первый шаг к изменению.
      `,

      sleep_behavior_1: `
*📊 Упражнение: Расчёт вашего окна сна*

На основе дневника сна за последнюю неделю:

1. Запишите TST (общее время сна) за каждую ночь:
   Пн: ___ | Вт: ___ | Ср: ___ | Чт: ___ | Пт: ___ | Сб: ___ | Вс: ___

2. Рассчитайте среднее: (сумма) / 7 = ___ часов

3. Ваше начальное TIB = ___ + 30 мин = ___ часов
   (но не менее 5.5 часов!)

4. Определите время подъёма (фиксированное): ___:___

5. Рассчитайте время отбоя:
   Время подъёма минус TIB = ___:___

*📌 Ваш режим на эту неделю:*
🛏 Отбой: ___:___
⏰ Подъём: ___:___
      `,

      sleep_behavior_2: `
*📈 Упражнение: Анализ эффективности сна (SE)*

Используя данные дневника, рассчитайте SE за каждый день:

*Формула:* SE = (TST / TIB) × 100%

| День | TST (мин) | TIB (мин) | SE (%) |
|------|-----------|-----------|--------|
| Пн   |           |           |        |
| Вт   |           |           |        |
| Ср   |           |           |        |
| Чт   |           |           |        |
| Пт   |           |           |        |
| Сб   |           |           |        |
| Вс   |           |           |        |

*Средняя SE за неделю:* ____%

*Решение по TIB:*
□ SE ≥ 90% три дня → увеличить TIB на 15 мин
□ SE 85-90% → оставить текущее
□ SE < 85% → сократить на 15 мин (мин 5.5ч)
      `,

      sleep_education: `
*🏠 Упражнение: Аудит спальни*

Оцените каждый пункт (1-5, где 5 = идеально):

*Температура:*
□ Прохладно (18-20°C): ___/5

*Свет:*
□ Темнота ночью: ___/5
□ Яркий свет утром: ___/5
□ Приглушение за 2ч до сна: ___/5

*Шум:*
□ Тишина или белый шум: ___/5

*Кровать:*
□ Только для сна: ___/5
□ Комфортный матрас: ___/5

*План улучшения:*
Что улучшить в первую очередь?
1. _________________________________
2. _________________________________
3. _________________________________

*Вечерний ритуал (30 мин):*
21:30 — _________________________________
21:45 — _________________________________
22:00 — _________________________________
      `,

      sleep_thoughts: `
*🧠 Упражнение: Дневник мыслей о сне*

Когда вы не можете заснуть, записывайте мысли:

*Ситуация:* Не могу заснуть уже 30 минут

*Автоматическая мысль:*
_________________________________

*Эмоция и интенсивность (0-100):*
_________________________________

*Доказательства "за" эту мысль:*
_________________________________

*Доказательства "против":*
_________________________________

*Альтернативная мысль:*
_________________________________

*Эмоция после (0-100):*
_________________________________

💡 Практикуйте это упражнение каждый раз, когда замечаете тревожные мысли о сне.
      `,

      problem_prevention: `
*📋 Упражнение: Ваш личный план профилактики*

Заполните карточку для будущего использования:

*Мои персональные триггеры рецидива:*
1. _________________________________
2. _________________________________
3. _________________________________

*Ранние признаки ухудшения сна:*
1. _________________________________
2. _________________________________

*Мои эффективные стратегии КПТ-И:*
1. _________________________________
2. _________________________________
3. _________________________________

*При первых признаках я буду:*
□ _________________________________
□ _________________________________

*Если проблема сохраняется > 1 недели:*
□ Пройти ISI
□ Вернуться к строгому режиму
□ _________________________________

*Контакт специалиста (при необходимости):*
_________________________________
      `,
    };

    return (exerciseMap[core.id] || 'Упражнение').trim();
  }

  // ==================== Utility Methods ====================

  private getCurrentWeek(session: unknown): number {
    // In production, calculate from session start date
    // For now, return week 1 for new users
    if (!session) return 1;

    // Check session metadata for therapy progress
    const sessionData = session as { therapyWeek?: number; startDate?: string };

    if (sessionData.therapyWeek) {
      return sessionData.therapyWeek;
    }

    if (sessionData.startDate) {
      const startDate = new Date(sessionData.startDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.min(8, Math.ceil(diffDays / 7));
    }

    return 1;
  }

  /**
   * Get ISI trend from real user data
   * Uses SleepCoreAPI.getProgressReport() for actual ISI values
   *
   * Research basis (2025-2026):
   * - MCID for ISI: 6-8 points (Morin et al.)
   * - Target remission: ISI ≤ 7
   * - Response: ISI reduction ≥ 8 points
   */
  private getISITrend(ctx: ISleepCoreContext): string {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return 'Данные недоступны. Пройдите ISI-опросник для начала.';
    }

    // Get progress report with real ISI data
    const progress = ctx.sleepCore.getProgressReport(ctx.userId);

    if (!progress) {
      // Estimate ISI from diary if no full progress yet
      const estimatedISI = ctx.sleepCore.estimateISI(ctx.userId);
      if (estimatedISI > 0) {
        const severity = this.getISISeverity(estimatedISI);
        return `Оценка ISI по дневнику: ${estimatedISI} (${severity})`;
      }
      return 'Заполните дневник сна минимум 7 дней для оценки.';
    }

    const currentISI = progress.currentISI;
    const baselineISI = currentISI + progress.isiChange; // Reconstruct baseline
    const change = progress.isiChange;

    const lines: string[] = [];

    // Baseline
    lines.push(`Неделя 0: ISI ${baselineISI} (${this.getISISeverity(baselineISI)})`);

    // Current week
    const weekLabel = `Неделя ${progress.currentWeek}`;
    const changeStr = change > 0 ? `↓${change}` : change < 0 ? `↑${Math.abs(change)}` : '→';
    lines.push(`${weekLabel}: ISI ${currentISI} (${this.getISISeverity(currentISI)}) ${changeStr}`);

    // Add clinical interpretation
    if (currentISI <= 7) {
      lines.push('🎉 Ремиссия достигнута!');
    } else if (change >= 8) {
      lines.push('✅ Значимый клинический ответ');
    } else if (change >= 4) {
      lines.push('🔄 Положительная динамика');
    }

    return lines.join('\n');
  }

  /**
   * Get ISI severity label (Russian)
   * Based on Morin et al. cutoffs
   */
  private getISISeverity(isi: number): string {
    if (isi <= 7) return 'норма';
    if (isi <= 14) return 'субклиническая';
    if (isi <= 21) return 'умеренная';
    return 'тяжёлая';
  }

  /**
   * Get goal status from real user progress
   * Uses SleepCoreAPI.getProgressReport() for actual metrics
   *
   * Clinical targets (AASM 2025):
   * - ISI < 7 (remission)
   * - SE ≥ 85% (acceptable), ≥ 90% (excellent)
   * - SOL < 20 min (normal)
   * - WASO < 30 min (normal)
   */
  private getGoalStatus(
    metric: 'isi' | 'se' | 'sol' | 'waso',
    ctx?: ISleepCoreContext
  ): string {
    // If no context provided, return default
    if (!ctx) {
      return '🔄 в процессе';
    }

    const progress = ctx.sleepCore.getProgressReport(ctx.userId);

    if (!progress) {
      return '⏳ нет данных';
    }

    switch (metric) {
      case 'isi': {
        const isi = progress.currentISI;
        if (isi <= 7) return '✅ достигнуто';
        if (isi <= 14) return '🔄 улучшается';
        return '⏳ в процессе';
      }
      case 'se': {
        const se = progress.currentSleepEfficiency;
        if (se >= 90) return '✅ отлично';
        if (se >= 85) return '✅ достигнуто';
        if (se >= 80) return '🔄 близко';
        return '⏳ в процессе';
      }
      case 'sol':
      case 'waso': {
        // These require diary metrics, not in progress report
        // Return status based on overall response
        if (progress.responseStatus === 'responding') return '🔄 улучшается';
        if (progress.responseStatus === 'partial') return '⏳ в процессе';
        return '⏳ в процессе';
      }
      default:
        return '🔄 в процессе';
    }
  }
}

// Export singleton
export const therapyCommand = new TherapyCommand();
