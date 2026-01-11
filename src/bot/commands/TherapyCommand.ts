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
 * Therapy command steps
 */
type TherapyStep =
  | 'menu'
  | 'core_intro'
  | 'core_content'
  | 'core_exercise'
  | 'core_homework'
  | 'core_complete'
  | 'progress_review';

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
      const isUnlocked = core.weekNumber <= currentWeek;
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

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'menu', currentWeek },
    };
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
    const content = this.getCoreContent(core);

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
• ISI < 7 (ремиссия) — ${this.getGoalStatus('isi')}
• SE ≥ 85% — ${this.getGoalStatus('se')}
• SOL < 20 мин — ${this.getGoalStatus('sol')}
• WASO < 30 мин — ${this.getGoalStatus('waso')}

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

  private getISITrend(_ctx: ISleepCoreContext): string {
    // In production, fetch actual ISI history from database
    // Mock data for now
    return `
Неделя 0: ISI 18 (умеренная)
Неделя 2: ISI 14 (субклиническая)
Неделя 4: — ожидается —
    `.trim();
  }

  private getGoalStatus(metric: 'isi' | 'se' | 'sol' | 'waso'): string {
    // In production, fetch from user data
    const statuses: Record<string, string> = {
      isi: '🔄 в процессе',
      se: '🔄 в процессе',
      sol: '🔄 в процессе',
      waso: '🔄 в процессе',
    };
    return statuses[metric];
  }
}

// Export singleton
export const therapyCommand = new TherapyCommand();
