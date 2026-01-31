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

      // ==================== ACT-I Session Delivery Handlers ====================
      case 'acti_hub':
        return this.showACTISessionHub(ctx, conversationData);

      case 'acti_acceptance':
        return this.showAcceptanceExercise(ctx, conversationData);

      case 'acti_defusion':
        return this.showDefusionTechnique(ctx, conversationData);

      case 'acti_experiences':
        return this.showUnwantedExperiences(ctx, conversationData);

      case 'acti_summary':
        return this.showACTISummary(ctx, conversationData);

      // ==================== MCT Session Delivery Handlers ====================
      case 'mct_hub':
        return this.showMCTSessionHub(ctx, conversationData);

      case 'mct_worry':
        return this.showWorryPostponement(ctx, conversationData);

      case 'mct_dm':
        return this.showDetachedMindfulness(ctx, conversationData);

      case 'mct_att_selective':
        return this.showATTSession(ctx, 'selective', conversationData);

      case 'mct_att_switching':
        return this.showATTSession(ctx, 'switching', conversationData);

      case 'mct_att_divided':
        return this.showATTSession(ctx, 'divided', conversationData);

      case 'mct_summary':
        return this.showMCTSummary(ctx, conversationData);

      // ==================== MBT-I Session Delivery Handlers ====================
      case 'mbti_hub':
        return this.showMBTISessionHub(ctx, conversationData);

      case 'mbti_practice':
        return this.showMBTIPractice(ctx, conversationData);

      case 'mbti_summary':
        return this.showMBTIWeeklySummary(ctx, conversationData);

      // ==================== Weekly SRT Review Handler ====================
      case 'weekly_review':
        return this.showWeeklyReview(ctx, conversationData);

      // ==================== Evidence-Based Guidelines Handlers ====================
      case 'evidence_overview':
        return this.showEvidenceOverview(ctx, conversationData);

      case 'evidence_components':
        return this.showComponentEvidence(ctx, conversationData);

      case 'evidence_new2023':
        return this.showNew2023Recommendations(ctx, conversationData);

      // ==================== Cognitive Therapy Handlers (Phase 5a) ====================
      case 'behavioral_experiment':
        return this.showBehavioralExperiment(ctx, conversationData);

      case 'hygiene_education':
        return this.showHygieneEducation(ctx, coreId, conversationData);

      case 'cognitive_progress':
        return this.showCognitiveProgress(ctx, conversationData);

      // ==================== Extended Evidence Handlers (Phase 5b) ====================
      case 'evidence_pharma':
        return this.showPharmacologicalEvidence(ctx, conversationData);

      case 'evidence_dcbti':
        return this.showDCBTICompliance(ctx, conversationData);

      case 'evidence_integrated':
        return this.showIntegratedRecommendation(ctx, conversationData);

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

    // Weekly SRT review button (available from Week 2 when plan exists)
    // Based on Spielman et al. 1987: weekly sleep window adjustment is core SRT mechanism
    if (session?.plan && currentWeek >= 2) {
      keyboard.push([
        { text: '📊 Еженедельный обзор SRT', callbackData: 'therapy:weekly_review' },
      ]);
    }

    // Cognitive therapy tools (Core 5 support)
    if (currentWeek >= 5) {
      keyboard.push([
        { text: '🔬 Поведенческий эксперимент', callbackData: 'therapy:behavioral_experiment' },
      ]);
    }

    // Sleep hygiene education (Core 4 support)
    if (currentWeek >= 4) {
      keyboard.push([
        { text: '📚 Гигиена сна', callbackData: 'therapy:hygiene_education' },
      ]);
    }

    // Evidence-based guidelines (psychoeducation, European Guideline 2023)
    keyboard.push([
      { text: '📋 Доказательная база', callbackData: 'therapy:evidence_overview' },
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

      const hubButtons: Record<string, IInlineButton[]> = {
        mct: [{ text: '🎯 Перейти к упражнениям MCT', callbackData: 'therapy:mct_hub' }],
        acti: [{ text: '🧘 Перейти к упражнениям ACT-I', callbackData: 'therapy:acti_hub' }],
        mbti: [{ text: '🧘 Перейти к практикам MBT-I', callbackData: 'therapy:mbti_hub' }],
      };

      const keyboard: IInlineButton[][] = hubButtons[therapyId]
        ? [
            hubButtons[therapyId],
            [{ text: '📋 К меню терапии', callbackData: 'therapy:menu' }],
          ]
        : [
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

    // For overview session, add evidence-based component summary
    // Uses European Insomnia Guideline 2023 evidence data
    if (coreId === 'overview') {
      const evidenceContent = this.getEvidenceBasedOverviewContent(ctx);
      if (evidenceContent) {
        content += '\n\n' + evidenceContent;
      }
    }

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
_(European Insomnia Guideline 2023)_
• ISI < 7 (ремиссия) — ${this.getGoalStatus('isi', ctx)}
• SE ≥ 85% — ${this.getGoalStatus('se', ctx)}
• SOL < 20 мин — ${this.getGoalStatus('sol', ctx)}
• WASO < 30 мин — ${this.getGoalStatus('waso', ctx)}

${formatter.tip('Регулярное прохождение ISI каждые 2 недели помогает отслеживать прогресс')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 К сессиям', callbackData: 'therapy:menu' }],
      [{ text: '📝 Пройти ISI', callbackData: 'start:begin_assessment' }],
      [{ text: '📊 Доказательная база', callbackData: 'therapy:evidence_overview' }],
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

  // ==================== ACT-I Session Delivery ====================

  /**
   * Show ACT-I Session Hub — central navigation for ACT-I exercises
   * Displays current session info and available exercise buttons
   *
   * Scientific basis:
   * - Hayes et al. (1999): ACT Hexaflex — 6 core processes
   * - Meadows (2014): "The Sleep Book" — ACT-I digital protocol
   * - El Rafihi-Ferreira et al. (2024): ACT vs CBT-I RCT (n=227) [HIGH]
   */
  private async showACTISessionHub(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: false,
        message: `${formatter.warning('Сессия не найдена')}\n\nПожалуйста, начните с /start`,
      };
    }

    const summary = ctx.sleepCore.getACTISessionSummary(ctx.userId);

    const message = `
${formatter.header('🧘 Терапия принятия и ответственности (ACT-I)')}

${sonya.tip('Выберите упражнение для сегодняшней практики.')}

${formatter.divider()}

*Доступные упражнения:*

💚 *Упражнение на принятие* (Acceptance)
   Научитесь быть открытыми к опыту бессонницы вместо борьбы с ней

🍃 *Техника дефузии* (Cognitive Defusion)
   Измените отношение к тревожным мыслям о сне

🔍 *Исследование переживаний* (Unwanted Experiences)
   Идентифицируйте мысли, чувства и ощущения, связанные с бессонницей

${formatter.divider()}

${summary ? `📊 *Ключевые выводы:*\n${summary.keyTakeaways.slice(0, 2).join('\n')}\n` : ''}
${formatter.tip('Борьба с бессонницей усиливает её. Готовность к бодрствованию парадоксально приводит ко сну (Meadows, 2014).')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '💚 Упражнение на принятие', callbackData: 'therapy:acti_acceptance' }],
      [{ text: '🍃 Техника дефузии', callbackData: 'therapy:acti_defusion' }],
      [{ text: '🔍 Исследование переживаний', callbackData: 'therapy:acti_experiences' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:acti_summary' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'acti_hub' },
    };
  }

  /**
   * Deliver Acceptance exercise via SleepCoreAPI
   *
   * Scientific basis:
   * - Meadows (2014): "Willing wakefulness" — core ACT-I principle [HIGH]
   * - Harris (2009): "The Happiness Trap" — Expansion technique [HIGH]
   * - Ruan et al. (2022): Acceptance — strongest predictor of ISI (27%) [HIGH]
   */
  private async showAcceptanceExercise(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const exercise = ctx.sleepCore.getAcceptanceExercise('cant_sleep');

    if (!exercise) {
      return {
        success: true,
        message: `
${formatter.warning('План ACT-I не найден')}

Для доступа к упражнениям необходимо сначала инициализировать план ACT-I.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите ACT-I.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const instructionsList = exercise.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const message = `
${formatter.header('💚 Упражнение на принятие')}
_${exercise.exercise}_
_(ACT-I — Meadows, 2014; Harris, 2009)_

${formatter.divider()}

*Метафора:*
_${exercise.metaphor}_

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

${sonya.tip('Готовность — это не желание бодрствовать. Это открытость опыту без борьбы. Парадокс: когда мы перестаём бороться, сон приходит сам.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🧘 Вернуться к упражнениям ACT-I', callbackData: 'therapy:acti_hub' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:acti_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'acti_acceptance' },
    };
  }

  /**
   * Deliver Defusion technique via SleepCoreAPI
   *
   * Scientific basis:
   * - Hayes et al. (1999): Cognitive defusion — core ACT process [HIGH]
   * - Harris (2009): "I notice the thought..." technique [HIGH]
   * - Hertenstein et al. (2024): Defusion reduces thought-action fusion [MEDIUM]
   */
  private async showDefusionTechnique(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Create a default experience for technique selection
    const defaultExperience = {
      id: 'default',
      type: 'thought' as const,
      content: 'Я не смогу уснуть',
      context: 'pre_sleep' as const,
      frequency: 0.7,
      distress: 0.6,
      fusionLevel: 0.7,
      avoidanceBehaviors: [],
    };

    const technique = ctx.sleepCore.getDefusionTechnique(defaultExperience, 'beginner');

    if (!technique) {
      return {
        success: true,
        message: `
${formatter.warning('Техника дефузии недоступна')}

Для доступа к упражнениям необходимо сначала инициализировать план ACT-I.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите ACT-I.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const instructionsList = technique.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const difficultyLabels: Record<string, string> = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
    };

    const message = `
${formatter.header('🍃 Техника дефузии')}
*${technique.name}*
_(Cognitive Defusion — Hayes et al., 1999)_

${formatter.divider()}

${technique.description}

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

⏱ *Длительность:* ${technique.duration} мин
📊 *Уровень:* ${difficultyLabels[technique.difficulty] || technique.difficulty}

${formatter.divider()}

${sonya.tip('Мысли — это не факты. Вы можете наблюдать мысли о сне, не сливаясь с ними. Со временем их влияние ослабевает.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🧘 Вернуться к упражнениям ACT-I', callbackData: 'therapy:acti_hub' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:acti_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'acti_defusion' },
    };
  }

  /**
   * Deliver Unwanted Experiences identification via SleepCoreAPI
   *
   * Scientific basis:
   * - Hayes et al. (1999): Creative hopelessness — identifying struggle [HIGH]
   * - Meadows (2014): Identifying control strategies that backfire [HIGH]
   */
  private async showUnwantedExperiences(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Identify common pre-sleep unwanted experiences
    const experiences = ctx.sleepCore.identifyUnwantedExperiences(
      'не засну тревога напряжение',
      'pre_sleep'
    );

    const experiencesList = experiences.length > 0
      ? experiences
          .map((exp) => {
            const typeLabels: Record<string, string> = {
              thought: '💭 Мысль',
              feeling: '💛 Чувство',
              sensation: '🫀 Ощущение',
              urge: '⚡ Побуждение',
            };
            const distressBar = '█'.repeat(Math.round(exp.distress * 5)) + '░'.repeat(5 - Math.round(exp.distress * 5));
            return `${typeLabels[exp.type] || exp.type}: *${exp.content}*\n   Дистресс: ${distressBar} (${Math.round(exp.distress * 100)}%)`;
          })
          .join('\n\n')
      : '_Нет идентифицированных переживаний_';

    const message = `
${formatter.header('🔍 Исследование переживаний')}
_(Creative Hopelessness — Hayes et al., 1999)_

${formatter.divider()}

*Что такое «нежелательные переживания»?*

Это мысли, чувства и ощущения, связанные с бессонницей, с которыми вы боретесь. Борьба с ними — как зыбучие пески: чем сильнее сопротивляетесь, тем глубже увязаете.

${formatter.divider()}

*Типичные переживания при бессоннице:*

${experiencesList}

${formatter.divider()}

*Вопросы для размышления:*
• Что вы пробовали, чтобы избавиться от этих переживаний?
• Помогло ли это в долгосрочной перспективе?
• Какую цену вы платите за борьбу с ними?

${formatter.divider()}

${sonya.tip('Цель — не избавиться от переживаний, а изменить отношение к ним. Когда мы перестаём бороться, мы освобождаем энергию для того, что действительно важно.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '💚 Попробовать упражнение на принятие', callbackData: 'therapy:acti_acceptance' }],
      [{ text: '🍃 Попробовать технику дефузии', callbackData: 'therapy:acti_defusion' }],
      [{ text: '🧘 Вернуться к упражнениям ACT-I', callbackData: 'therapy:acti_hub' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'acti_experiences' },
    };
  }

  /**
   * Show ACT-I session summary via SleepCoreAPI
   *
   * Scientific basis:
   * - El Rafihi-Ferreira (Springer, 2024): Session-by-session ACT-I guide [HIGH]
   */
  private async showACTISummary(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const summary = ctx.sleepCore.getACTISessionSummary(ctx.userId);

    if (!summary) {
      return {
        success: true,
        message: `
${formatter.warning('Итоги сессии недоступны')}

Для получения итогов необходимо инициализировать план ACT-I.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите ACT-I.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const takeawaysList = summary.keyTakeaways
      .map((t, i) => `${i + 1}. ${t}`)
      .join('\n');

    const exercisesList = summary.practiceExercises
      .map((e) => `• ${e}`)
      .join('\n');

    const message = `
${formatter.header('📊 Итоги сессии ACT-I')}

${formatter.divider()}

*Ключевые выводы:*
${takeawaysList}

${formatter.divider()}

*Домашние эксперименты:*
${exercisesList}

${formatter.divider()}

*Следующая сессия:*
${summary.nextSessionPreview}

${formatter.divider()}

${sonya.tip('Практикуйте готовность к бодрствованию каждую ночь. Записывайте наблюдения в дневник.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🧘 К упражнениям ACT-I', callbackData: 'therapy:acti_hub' }],
      [{ text: '📋 К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'acti_summary' },
    };
  }

  // ==================== MBT-I Session Delivery ====================

  /**
   * Show MBT-I Session Hub — central navigation for MBT-I practices
   * Displays current week, session theme, and available practice buttons
   *
   * Scientific basis:
   * - Ong et al. (2014): 8-week MBT-I protocol, d=1.32 for ISI [HIGH]
   * - Ong (2012): Two-level arousal model — primary + metacognitive [HIGH]
   * - MIST trial (2023): Older adults RCT, d=-1.27, no adverse events [HIGH]
   */
  private async showMBTISessionHub(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: false,
        message: `${formatter.warning('Сессия не найдена')}\n\nПожалуйста, начните с /start`,
      };
    }

    const summary = ctx.sleepCore.getMBTIWeeklySummary(ctx.userId);

    const weekInfo = summary
      ? `📊 *Практика за неделю:* ${summary.practiceMinutes} мин (adherence: ${(summary.practiceAdherence * 100).toFixed(0)}%)`
      : '';

    const arousalInfo = summary && summary.arousalChange
      ? `🧠 *Когнитивное возбуждение:* ${summary.arousalChange.cognitive > 0 ? '↓' : '→'} ${(Math.abs(summary.arousalChange.cognitive) * 100).toFixed(0)}%`
      : '';

    const message = `
${formatter.header('🧘 Осознанная терапия бессонницы (MBT-I)')}

${sonya.tip('8-недельный протокол Джейсона Онга. Осознанность + поведенческие стратегии сна.')}

${formatter.divider()}

*Доступные практики:*

🫁 *Практика медитации*
   Осознавание дыхания, сканирование тела, сидячая медитация

📊 *Еженедельный обзор*
   Прогресс практики, изменение возбуждения, фокус следующей недели

${formatter.divider()}

${weekInfo}
${arousalInfo}

${summary?.keyInsights?.length ? `💡 *Инсайт:* ${summary.keyInsights[0]}` : ''}

${formatter.tip('Осознанность — не попытка заснуть, а изменение отношения к бодрствованию. Парадокс: принятие бессонницы ведёт ко сну (Ong, 2012).')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🫁 Практика медитации', callbackData: 'therapy:mbti_practice' }],
      [{ text: '📊 Еженедельный обзор', callbackData: 'therapy:mbti_summary' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mbti_hub' },
    };
  }

  /**
   * Deliver mindfulness practice via SleepCoreAPI
   *
   * Scientific basis:
   * - Ong (2017): MBT-I treatment manual — practice instructions [HIGH]
   * - Ong (2008): Practice compliance ~16 min/session, ~57% adherence [HIGH]
   * - Dose-response: Total meditations correlate with arousal reduction r=-0.38 [MEDIUM]
   */
  private async showMBTIPractice(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const practice = ctx.sleepCore.getMindfulnessPractice(ctx.userId, 'bedtime', 15);

    if (!practice) {
      return {
        success: true,
        message: `
${formatter.warning('План MBT-I не найден')}

Для доступа к практикам необходимо сначала инициализировать план MBT-I.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите MBT-I.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const instructionsList = practice.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const practiceNames: Record<string, string> = {
      breath_awareness: 'Осознавание дыхания',
      body_scan: 'Сканирование тела',
      sitting_meditation: 'Сидячая медитация',
      mindful_movement: 'Осознанное движение',
      loving_kindness: 'Медитация любящей доброты',
      open_awareness: 'Открытое осознавание',
      '3_minute_breathing_space': '3-минутное пространство дыхания',
    };

    const practiceName = practiceNames[practice.practice] || practice.practice;

    const message = `
${formatter.header(`🫁 ${practiceName}`)}
_(MBT-I — Ong, 2017)_

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

${sonya.tip('Не пытайтесь заставить себя расслабиться. Просто наблюдайте. Когда ум уходит — мягко возвращайте внимание. Это и есть практика.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🧘 Вернуться к MBT-I', callbackData: 'therapy:mbti_hub' }],
      [{ text: '📊 Еженедельный обзор', callbackData: 'therapy:mbti_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mbti_practice' },
    };
  }

  /**
   * Show MBT-I weekly summary via SleepCoreAPI.getMBTIWeeklySummary()
   *
   * Scientific basis:
   * - Ong (2008): Weekly PSAS tracking, linear improvement across weeks [HIGH]
   * - PSAS reliability: alpha=0.88, test-retest r=0.87 (meta-analysis 2024) [HIGH]
   * - Arousal change: PSAS-Cognitive d=-0.76 at 6-month follow-up (MIST 2023) [HIGH]
   */
  private async showMBTIWeeklySummary(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const summary = ctx.sleepCore.getMBTIWeeklySummary(ctx.userId);

    if (!summary) {
      return {
        success: true,
        message: `
${formatter.warning('Еженедельный обзор недоступен')}

Для получения обзора необходимо инициализировать план MBT-I и провести хотя бы одну практику.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите MBT-I.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const adherencePercent = (summary.practiceAdherence * 100).toFixed(0);
    const adherenceStatus = summary.practiceAdherence >= 0.8
      ? '✅ Отлично'
      : summary.practiceAdherence >= 0.5
        ? '🟡 Можно лучше'
        : '🔻 Нужно больше практики';

    const cognitiveChange = summary.arousalChange.cognitive;
    const somaticChange = summary.arousalChange.somatic;
    const effortChange = summary.arousalChange.sleepEffort;

    const insightsList = summary.keyInsights
      .map((insight) => `• ${insight}`)
      .join('\n');

    const focusList = summary.nextWeekFocus
      .map((focus) => `• ${focus}`)
      .join('\n');

    const message = `
${formatter.header('📊 Еженедельный обзор MBT-I')}

${formatter.divider()}

*Практика за неделю:*
⏱️ Общее время: ${summary.practiceMinutes} мин
📈 Приверженность: ${adherencePercent}% ${adherenceStatus}

${formatter.divider()}

*Изменение возбуждения (arousal):*
🧠 Когнитивное: ${cognitiveChange > 0 ? '↓' : cognitiveChange < 0 ? '↑' : '→'} ${(Math.abs(cognitiveChange) * 100).toFixed(0)}%
💪 Соматическое: ${somaticChange > 0 ? '↓' : somaticChange < 0 ? '↑' : '→'} ${(Math.abs(somaticChange) * 100).toFixed(0)}%
😤 Усилие сна: ${effortChange > 0 ? '↓' : effortChange < 0 ? '↑' : '→'} ${(Math.abs(effortChange) * 100).toFixed(0)}%

${formatter.divider()}

${insightsList ? `*Инсайты:*\n${insightsList}\n\n${formatter.divider()}\n` : ''}
*Фокус следующей недели:*
${focusList}

${formatter.tip('Регулярная практика — ключ к снижению пресомнического возбуждения. Даже 5 минут в день имеют значение (Ong, 2008).')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🫁 К практике', callbackData: 'therapy:mbti_practice' }],
      [{ text: '🧘 К MBT-I меню', callbackData: 'therapy:mbti_hub' }],
      [{ text: '📋 К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mbti_summary' },
    };
  }

  // ==================== MCT Session Delivery ====================

  /**
   * Show MCT Session Hub — central navigation for MCT exercises
   * Displays current session info and available exercise buttons
   */
  private async showMCTSessionHub(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: false,
        message: `${formatter.warning('Сессия не найдена')}\n\nПожалуйста, начните с /start`,
      };
    }

    // Check MCT plan exists
    const mctSummary = ctx.sleepCore.getMCTSessionSummary(ctx.userId);

    const message = `
${formatter.header('🎯 Метакогнитивная терапия (MCT)')}

${sonya.tip('Выберите упражнение для сегодняшней практики.')}

${formatter.divider()}

*Доступные упражнения:*

📝 *Откладывание беспокойства* (Worry Postponement)
   Научитесь откладывать тревожные мысли на определённое время

🧘 *Отстранённая осознанность* (Detached Mindfulness)
   Наблюдайте за мыслями без вовлечения

🎧 *Тренировка внимания* (ATT)
   Развитие гибкости внимания через три фазы
   _Примечание: в текущей версии — текстовые инструкции. Аудио-формат в разработке._

${formatter.divider()}

${mctSummary ? `📊 *Ключевые выводы:*\n${mctSummary.keyTakeaways.slice(0, 2).join('\n')}\n` : ''}
${formatter.tip('Регулярная практика — ключ к изменению метакогнитивных паттернов. Рекомендуется 15-20 минут ежедневно.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📝 Откладывание беспокойства', callbackData: 'therapy:mct_worry' }],
      [{ text: '🧘 Отстранённая осознанность', callbackData: 'therapy:mct_dm' }],
      [{ text: '🎧 ATT: Избирательное внимание', callbackData: 'therapy:mct_att_selective' }],
      [{ text: '🎧 ATT: Переключение', callbackData: 'therapy:mct_att_switching' }],
      [{ text: '🎧 ATT: Распределённое внимание', callbackData: 'therapy:mct_att_divided' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:mct_summary' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mct_hub' },
    };
  }

  /**
   * Deliver Worry Postponement exercise via SleepCoreAPI
   *
   * Scientific basis:
   * - Wells (2009): Worry postponement reduces CAS engagement
   * - 2025 RCT: Reduces worry but not directly sleep (adjunct to MCT-I)
   */
  private async showWorryPostponement(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const exercise = ctx.sleepCore.getWorryPostponementExercise(ctx.userId);

    if (!exercise) {
      return {
        success: true,
        message: `
${formatter.warning('План MCT не найден')}

Для доступа к упражнениям необходимо сначала инициализировать план MCT.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите MCT.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const instructionsList = exercise.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const tipsList = exercise.tips
      .map((tip) => `• ${tip}`)
      .join('\n');

    const message = `
${formatter.header('📝 Откладывание беспокойства')}
_(Worry Postponement — Wells, 2009)_

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

⏰ *Время для беспокойства:* ${exercise.postponeToTime}
⏱ *Длительность периода беспокойства:* ${exercise.worryPeriodDuration} минут

${formatter.divider()}

💡 *Советы:*
${tipsList}

${formatter.divider()}

${sonya.tip('Помните: цель не в том, чтобы избавиться от мыслей, а в том, чтобы изменить своё отношение к ним.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Вернуться к упражнениям MCT', callbackData: 'therapy:mct_hub' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:mct_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mct_worry' },
    };
  }

  /**
   * Deliver Detached Mindfulness exercise via SleepCoreAPI
   *
   * Scientific basis:
   * - Wells (2009): DM reduces thought-action fusion
   * - Key MCT technique for disengaging from CAS
   */
  private async showDetachedMindfulness(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const exercise = ctx.sleepCore.getDetachedMindfulnessExercise('racing_thoughts');

    const instructionsList = exercise.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const message = `
${formatter.header('🧘 Отстранённая осознанность')}
_(Detached Mindfulness — Wells, 2009)_

${formatter.divider()}

*Метафора:*
_${exercise.metaphor}_

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

⏱ *Рекомендуемая длительность:* ${exercise.duration} минут

${formatter.divider()}

${sonya.tip('Представьте, что мысли — это облака, проплывающие по небу. Вы наблюдаете за ними, но не пытаетесь их удержать или прогнать.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Вернуться к упражнениям MCT', callbackData: 'therapy:mct_hub' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:mct_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mct_dm' },
    };
  }

  /**
   * Deliver ATT (Attention Training Technique) session via SleepCoreAPI
   *
   * Scientific basis:
   * - Wells (2009): ATT strengthens executive attention control
   * - 3 phases: selective → switching → divided attention
   * - Note: ATT is fundamentally audio-based; text delivery is a pragmatic
   *   adaptation (SpACE variant). Future versions will include audio.
   */
  private async showATTSession(
    ctx: ISleepCoreContext,
    phase: 'selective' | 'switching' | 'divided',
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getATTSession(phase);

    const phaseNames: Record<string, string> = {
      selective: 'Избирательное внимание',
      switching: 'Переключение внимания',
      divided: 'Распределённое внимание',
    };

    const phaseIcons: Record<string, string> = {
      selective: '1️⃣',
      switching: '2️⃣',
      divided: '3️⃣',
    };

    const instructionsList = session.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join('\n');

    const tipsList = session.tips
      .map((tip) => `• ${tip}`)
      .join('\n');

    const message = `
${formatter.header(`🎧 Тренировка внимания (ATT) — Фаза ${phaseIcons[phase]}`)}
*${phaseNames[phase]}*
_(Attention Training Technique — Wells, 1990)_

${formatter.divider()}

*Инструкции:*

${instructionsList}

${formatter.divider()}

💡 *Советы:*
${tipsList}

${formatter.divider()}

⚠️ _Текущая версия: текстовые инструкции. ATT изначально разработана как аудио-техника.
Аудио-формат будет добавлен в следующем обновлении._

${sonya.tip('Практикуйте все три фазы ATT последовательно: сначала избирательное внимание, затем переключение, затем распределённое.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Вернуться к упражнениям MCT', callbackData: 'therapy:mct_hub' }],
      [{ text: '📊 Итоги сессии', callbackData: 'therapy:mct_summary' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: `mct_att_${phase}` },
    };
  }

  /**
   * Show MCT session summary via SleepCoreAPI
   */
  private async showMCTSummary(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const summary = ctx.sleepCore.getMCTSessionSummary(ctx.userId);

    if (!summary) {
      return {
        success: true,
        message: `
${formatter.warning('Итоги сессии недоступны')}

Для получения итогов необходимо инициализировать план MCT.

${formatter.tip('Перейдите в раздел "Альтернативные подходы" и выберите MCT.')}
        `.trim(),
        keyboard: [
          [{ text: '🌿 К альтернативным подходам', callbackData: 'therapy:third_wave_menu' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
      };
    }

    const takeawaysList = summary.keyTakeaways
      .map((t, i) => `${i + 1}. ${t}`)
      .join('\n');

    const experimentsList = summary.homeExperiments
      .map((e) => `• ${e}`)
      .join('\n');

    const highlightsList = summary.progressHighlights
      .map((h) => `✅ ${h}`)
      .join('\n');

    const message = `
${formatter.header('📊 Итоги сессии MCT')}

${formatter.divider()}

*Ключевые выводы:*
${takeawaysList}

${formatter.divider()}

*Домашние эксперименты:*
${experimentsList}

${formatter.divider()}

*Достижения:*
${highlightsList}

${formatter.divider()}

*Следующая сессия:*
${summary.nextSessionPreview}

${formatter.divider()}

${sonya.tip('Выполняйте домашние эксперименты ежедневно. Записывайте наблюдения в дневник.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 К упражнениям MCT', callbackData: 'therapy:mct_hub' }],
      [{ text: '📋 К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'mct_summary' },
    };
  }

  // ==================== Evidence-Based Guidelines ====================

  /**
   * Show evidence overview — psychoeducation about CBT-I evidence base
   * Uses European Insomnia Guideline 2023 (Riemann et al.)
   *
   * Research basis:
   * - dCBT-I Grade A first-line recommendation [HIGH]
   * - Psychoeducation is standard CBT-I component [HIGH]
   * - Patient Decision Aids improve knowledge +11.90/100 (Cochrane 2024) [HIGH]
   *
   * NOTE: Pharmacological evidence is NOT exposed to patients.
   * CLAUDE.md red line: "Нет рекомендаций снотворных без врача"
   * Regulatory risk: FDA PDURS, EU MDR scope creep [HIGH]
   */
  private async showEvidenceOverview(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const recommendations = ctx.sleepCore.getTreatmentRecommendations('treatment');

    // Format top treatment recommendations (non-pharmacological only)
    const recLines = recommendations
      .filter((r) => r.category === 'treatment')
      .slice(0, 5)
      .map((r) => {
        const gradeIcon = r.evidenceGrade === 'A' ? '🟢' : r.evidenceGrade === 'B' ? '🟡' : '🔵';
        const newTag = r.isNew2023 ? ' 🆕' : '';
        return `${gradeIcon} *${r.textRu}*${newTag}\n   Уровень доказательности: ${r.evidenceGrade} | ${r.source}`;
      })
      .join('\n\n');

    const message = `
${formatter.header('📊 Доказательная база КПТ-И')}
_(European Insomnia Guideline 2023, Riemann et al.)_

${formatter.divider()}

*Уровни доказательности:*
🟢 Grade A — высокий (множественные РКИ, мета-анализы)
🟡 Grade B — умеренный (РКИ, систематические обзоры)
🔵 Grade C/D — низкий (мнения экспертов, серии случаев)

${formatter.divider()}

*Рекомендации по лечению:*

${recLines}

${formatter.divider()}

${sonya.tip('КПТ-И — «золотой стандарт» лечения хронической бессонницы с Grade A доказательностью. Наша программа следует этим рекомендациям.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📈 Эффективность компонентов КПТ-И', callbackData: 'therapy:evidence_components' }],
      [{ text: '🆕 Что нового в 2023?', callbackData: 'therapy:evidence_new2023' }],
      [{ text: '💊 Фармакология (для врача)', callbackData: 'therapy:evidence_pharma' }],
      [{ text: '🏥 Соответствие dCBT-I', callbackData: 'therapy:evidence_dcbti' }],
      [{ text: '🌐 Интегрированная рекомендация', callbackData: 'therapy:evidence_integrated' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_overview' },
    };
  }

  /**
   * Show CBT-I component evidence with effect sizes
   * Uses getCBTIComponentEvidence() and getMostEffectiveCBTIComponents()
   *
   * Displays Cohen's d effect sizes for each CBT-I component,
   * helping patients understand which techniques have the strongest evidence.
   */
  private async showComponentEvidence(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const components = ctx.sleepCore.getMostEffectiveCBTIComponents();
    const allEvidence = ctx.sleepCore.getCBTIComponentEvidence();

    // Component name mapping (Russian)
    const componentNames: Record<string, string> = {
      multicomponent_cbti: 'Мультикомпонентная КПТ-И',
      sleep_restriction: 'Ограничение сна (SRT)',
      stimulus_control: 'Контроль стимулов (SCT)',
      cognitive_restructuring: 'Когнитивная реструктуризация',
      relaxation: 'Релаксация',
      sleep_hygiene: 'Гигиена сна',
    };

    // Build ranked list
    const componentLines = components
      .slice(0, 6)
      .map((c, i) => {
        const name = componentNames[c.component] || c.component;
        const qualityIcon = c.quality === 'high' ? '🟢' : c.quality === 'moderate' ? '🟡' : '🔵';
        const effectBar = this.renderEffectBar(c.effectSize);
        return `${i + 1}. *${name}*
   ${effectBar} d = ${c.effectSize.toFixed(2)} [${c.effectSizeCI[0].toFixed(2)}–${c.effectSizeCI[1].toFixed(2)}]
   ${qualityIcon} ${c.nStudies} исследований, ${c.nParticipants.toLocaleString()} участников`;
      })
      .join('\n\n');

    const message = `
${formatter.header('📈 Эффективность компонентов КПТ-И')}
_(ранжированы по размеру эффекта, Cohen\\'s d)_

${formatter.divider()}

${componentLines}

${formatter.divider()}

*Как читать:*
• d ≥ 0.8 — большой эффект
• d = 0.5-0.8 — средний эффект
• d = 0.2-0.5 — малый эффект

${formatter.divider()}

${sonya.tip('Мультикомпонентная КПТ-И (все компоненты вместе) значительно эффективнее любого отдельного компонента. Поэтому наша программа включает все 5.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Обзор доказательной базы', callbackData: 'therapy:evidence_overview' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_components' },
    };
  }

  /**
   * Show new 2023 guideline recommendations
   * Uses getNew2023Recommendations() for updates since 2017 guideline
   */
  private async showNew2023Recommendations(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const newRecs = ctx.sleepCore.getNew2023Recommendations();

    const recLines = newRecs
      .filter((r) => r.category !== 'pharmacological') // Exclude pharma from patient view
      .map((r) => {
        const gradeIcon = r.evidenceGrade === 'A' ? '🟢' : r.evidenceGrade === 'B' ? '🟡' : '🔵';
        return `${gradeIcon} *${r.textRu}*\n   Уровень: ${r.evidenceGrade} | ${r.source}`;
      })
      .join('\n\n');

    const message = `
${formatter.header('🆕 Обновления European Insomnia Guideline 2023')}
_(Riemann et al., Journal of Sleep Research)_

${formatter.divider()}

*Ключевые изменения по сравнению с 2017:*

${recLines || 'Нет новых нефармакологических рекомендаций.'}

${formatter.divider()}

${sonya.tip('Рекомендации обновляются на основе новых мета-анализов и РКИ. Наша программа соответствует актуальным стандартам 2023 года.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📈 Эффективность компонентов', callbackData: 'therapy:evidence_components' }],
      [{ text: '📊 Обзор доказательной базы', callbackData: 'therapy:evidence_overview' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_new2023' },
    };
  }

  // ==================== Phase 5a: Cognitive Therapy Methods ====================

  /**
   * Show behavioral experiment design for a dysfunctional belief
   *
   * Scientific basis (HIGH confidence):
   * - Harvey (2002): Cognitive model of insomnia — prediction testing
   * - Morin et al. (1993): DBAS-16 as primary cognitive outcome
   * - European Guideline 2023: Cognitive restructuring Grade A component
   *
   * Implementation: Uses CognitiveRestructuringEngine.designExperiment()
   * which generates hypothesis, experiment design, and predicted outcome
   * categorized by belief type (expectations, consequences, control, medication, causes).
   */
  private async showBehavioralExperiment(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: true,
        message: `${formatter.warning('Сессия не найдена')}\n\nНачните с /start для прохождения программы.`,
      };
    }

    // Identify beliefs from session data or use a common insomnia belief
    const beliefs = ctx.sleepCore.identifyCognitiveBeliefs(
      ctx.userId,
      'Я не смогу функционировать, если не высплюсь'
    );

    if (beliefs.length === 0) {
      return {
        success: true,
        message: `${formatter.header('🔬 Поведенческий эксперимент')}\n\n${formatter.warning('Недостаточно данных')}\n\nДля проведения поведенческих экспериментов необходимы данные о вашем сне. Продолжайте вести дневник сна (/diary).`,
        keyboard: [[{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }]],
      };
    }

    const belief = beliefs[0];
    const experiment = ctx.sleepCore.designBehavioralExperiment(belief);
    const questions = ctx.sleepCore.getSocraticQuestions(belief);

    const message = `
${formatter.header('🔬 Поведенческий эксперимент')}
_(Harvey, 2002; Morin, 1993)_

${formatter.divider()}

*Убеждение:* "${belief.belief}"
*Категория:* ${this.getBeliefCategoryRu(belief.category)}
*Интенсивность:* ${(belief.intensity * 100).toFixed(0)}%

${formatter.divider()}

*🔍 Гипотеза:*
${experiment.hypothesis}

*📋 Эксперимент:*
${experiment.experiment}

*📊 Ожидаемый результат:*
${experiment.predictedOutcome}

${formatter.divider()}

*❓ Вопросы для размышления:*
${questions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}

${formatter.divider()}

${sonya.tip('Поведенческие эксперименты — один из самых эффективных методов когнитивной реструктуризации. Проверяйте свои убеждения на практике!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Когнитивный прогресс', callbackData: 'therapy:cognitive_progress' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'behavioral_experiment', belief: belief.category },
    };
  }

  /**
   * Show sleep hygiene educational content
   *
   * Scientific basis (HIGH confidence):
   * - Hauri (1977): Sleep hygiene principles
   * - European Guideline 2023: SHE NOT sufficient as standalone (Grade A)
   * - Irish et al. 2015: SHE as adjunct to CBT-I, effect size d=0.12
   *
   * Renders educational content from SleepHygieneEngine including
   * tips, myths, and category-specific information.
   */
  private async showHygieneEducation(
    ctx: ISleepCoreContext,
    categoryId: string | undefined,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    type SleepHygieneCategory = import('../../cbt-i/interfaces/ICBTIComponents').SleepHygieneCategory;

    const validCategories: SleepHygieneCategory[] = [
      'caffeine', 'alcohol', 'nicotine', 'exercise',
      'diet', 'environment', 'screen_time', 'routine', 'stress',
    ];

    // If no category specified, show category menu
    if (!categoryId || !validCategories.includes(categoryId as SleepHygieneCategory)) {
      const categoryNames: Record<SleepHygieneCategory, string> = {
        caffeine: '☕ Кофеин',
        alcohol: '🍷 Алкоголь',
        nicotine: '🚬 Никотин',
        exercise: '🏃 Физическая активность',
        diet: '🍽️ Питание',
        environment: '🌡️ Среда сна',
        screen_time: '📱 Экраны и синий свет',
        routine: '⏰ Режим дня',
        stress: '🧘 Управление стрессом',
      };

      const keyboard: IInlineButton[][] = validCategories.map(cat => [{
        text: categoryNames[cat],
        callbackData: `therapy:hygiene_education:${cat}`,
      }]);
      keyboard.push([{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }]);

      return {
        success: true,
        message: `${formatter.header('📚 Гигиена сна — Обучение')}\n_(Hauri, 1977; European Guideline 2023)_\n\n${sonya.tip('Гигиена сна сама по себе недостаточна для лечения бессонницы (Grade A), но является важным компонентом КПТ-И.')}\n\nВыберите тему:`,
        keyboard,
        metadata: { step: 'hygiene_education_menu' },
      };
    }

    const category = categoryId as SleepHygieneCategory;
    const education = ctx.sleepCore.getHygieneEducation(category);

    const tipsFormatted = education.tips
      .map((tip, i) => `${i + 1}. ${tip}`)
      .join('\n');

    const mythsFormatted = education.myths
      .map(myth => `❌ ${myth}`)
      .join('\n');

    const message = `
${formatter.header(`📚 ${education.title}`)}

${formatter.divider()}

${education.content}

${formatter.divider()}

*✅ Рекомендации:*
${tipsFormatted}

${formatter.divider()}

*🚫 Распространённые мифы:*
${mythsFormatted}

${formatter.divider()}

${sonya.tip('Помните: гигиена сна — это часть комплексной терапии. Она работает лучше всего в сочетании с другими компонентами КПТ-И.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📚 Другие темы', callbackData: 'therapy:hygiene_education' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'hygiene_education', category },
    };
  }

  /**
   * Show cognitive restructuring progress report
   *
   * Note: getCognitiveProgressReport() currently returns null
   * as belief history storage is not yet implemented.
   * This handler gracefully handles that case.
   */
  private async showCognitiveProgress(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const report = ctx.sleepCore.getCognitiveProgressReport(ctx.userId);

    if (!report) {
      return {
        success: true,
        message: `${formatter.header('📊 Когнитивный прогресс')}\n\n${formatter.warning('Недостаточно данных')}\n\nДля формирования отчёта необходимо:\n• Минимум 2 недели работы с убеждениями\n• Регулярное ведение дневника мыслей\n\nИспользуйте /therapy → Core 5 (Мысли о сне) для начала когнитивной реструктуризации.`,
        keyboard: [
          [{ text: '🔬 Поведенческий эксперимент', callbackData: 'therapy:behavioral_experiment' }],
          [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
        ],
        metadata: { step: 'cognitive_progress' },
      };
    }

    const message = `
${formatter.header('📊 Когнитивный прогресс')}
_(Beck, 1979; Morin, 1993)_

${formatter.divider()}

${report.toMarkdownTable()}

${formatter.divider()}

*Обработано убеждений:* ${report.summary.totalBeliefs}
*Доминирующая категория:* ${this.getBeliefCategoryRu(report.summary.dominantCategory)}

${sonya.tip('Когнитивная реструктуризация — постепенный процесс. Каждая неделя работы приближает вас к здоровому отношению ко сну.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔬 Поведенческий эксперимент', callbackData: 'therapy:behavioral_experiment' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'cognitive_progress' },
    };
  }

  // ==================== Phase 5b: Extended Evidence Methods ====================

  /**
   * Show pharmacological evidence (for healthcare provider reference)
   *
   * Scientific basis (HIGH confidence):
   * - European Guideline 2023: Updated pharmacological recommendations
   * - Daridorexant (DORA): NEW Grade A, up to 3 months (Idorsia 2023)
   * - BZ/Z-drugs: ≤4 weeks Grade A
   * - Melatonin PR: ≥55 years, up to 3 months Grade B
   * - Antihistamines: NOT recommended Grade A
   *
   * IMPORTANT: For informational purposes only, not prescribing advice.
   * System is not authorized to recommend medications.
   */
  private async showPharmacologicalEvidence(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const allEvidence = ctx.sleepCore.getPharmacologicalEvidence();

    const gradeIcons: Record<string, string> = {
      A: '🟢', B: '🟡', C: '🔵', D: '⚪',
    };

    const evidenceLines = allEvidence
      .map(e => {
        const icon = gradeIcons[e.evidenceGrade] || '⚪';
        const recIcon = e.isRecommended ? '✅' : '⛔';
        return `${icon} *${e.agent}* (${e.class})\n   ${recIcon} ${e.notes}\n   Уровень: ${e.evidenceGrade} | ${e.recommendedDuration}`;
      })
      .join('\n\n');

    const message = `
${formatter.header('💊 Фармакологическая доказательная база')}
_(European Insomnia Guideline 2023, Riemann et al.)_

${formatter.divider()}

${formatter.warning('Только для справки — решение о медикаментах принимает врач.')}

${formatter.divider()}

${evidenceLines}

${formatter.divider()}

${sonya.tip('КПТ-И остаётся терапией первой линии (Grade A). Медикаменты рассматриваются при недостаточном ответе на КПТ-И или как временная мера.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Обзор доказательной базы', callbackData: 'therapy:evidence_overview' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_pharma' },
    };
  }

  /**
   * Show dCBT-I compliance status
   *
   * Scientific basis (HIGH confidence):
   * - Espie, Torous & Brennan (2022): Digital CBT-I implementation criteria
   * - FDA 510(k): Somryst (K191716), SleepioRx cleared as Class II
   * - DiGA/BfArM: Somnio, HelloBetter Sleep permanent listing
   *
   * Shows which dCBT-I criteria the platform meets.
   */
  private async showDCBTICompliance(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Check compliance against our implemented features
    const criteria: Record<string, boolean> = {
      sleepDiary: true,
      sleepRestriction: true,
      stimulusControl: true,
      cognitiveRestructuring: true,
      sleepHygiene: true,
      relaxation: true,
      personalizedTiming: true,
      progressTracking: true,
      automatedAdjustment: true,
      clinicianDashboard: false, // Not yet implemented
    };

    const compliance = ctx.sleepCore.checkDCBTICompliance(criteria);

    const statusIcon = compliance.compliant ? '✅' : '⚠️';
    const statusText = compliance.compliant
      ? 'Платформа соответствует критериям dCBT-I'
      : 'Частичное соответствие критериям dCBT-I';

    const missingReqLines = compliance.missingRequired.length > 0
      ? `\n*Отсутствующие обязательные:*\n${compliance.missingRequired.map(r => `❌ ${r}`).join('\n')}`
      : '';

    const missingOptLines = compliance.missingOptional.length > 0
      ? `\n*Отсутствующие рекомендуемые:*\n${compliance.missingOptional.map(r => `⚠️ ${r}`).join('\n')}`
      : '';

    const message = `
${formatter.header('🏥 Соответствие стандартам dCBT-I')}
_(Espie, Torous & Brennan, 2022)_

${formatter.divider()}

${statusIcon} *${statusText}*

*Реализованные компоненты:*
${Object.entries(criteria)
  .filter(([, v]) => v)
  .map(([k]) => `✅ ${k}`)
  .join('\n')}
${missingReqLines}${missingOptLines}

${formatter.divider()}

*Регуляторные аналоги:*
• Somryst — FDA 510(k) K191716
• SleepioRx — FDA 510(k) 2024
• Somnio — DiGA (Германия)

${sonya.tip('Наша платформа следует стандартам FDA-cleared dCBT-I продуктов, обеспечивая доказательный подход к лечению бессонницы.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Обзор доказательной базы', callbackData: 'therapy:evidence_overview' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_dcbti' },
    };
  }

  /**
   * Show integrated treatment recommendation
   *
   * Combines circadian, cultural (TCM/Ayurveda), and evidence-based factors
   * into a personalized treatment plan overview.
   */
  private async showIntegratedRecommendation(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const recommendation = ctx.sleepCore.getIntegratedRecommendation(ctx.userId);

    if (!recommendation) {
      return {
        success: true,
        message: `${formatter.header('🌐 Интегрированная рекомендация')}\n\n${formatter.warning('Недостаточно данных')}\n\nДля формирования интегрированной рекомендации необходима активная сессия. Начните с /start.`,
        keyboard: [[{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }]],
      };
    }

    const adaptationsBlock = recommendation.culturalAdaptations.length > 0
      ? `\n*🌍 Культурные адаптации:*\n${recommendation.culturalAdaptations.map(a => `• ${a}`).join('\n')}`
      : '';

    const factorsBlock = recommendation.personalizationFactors.length > 0
      ? `\n*🎯 Факторы персонализации:*\n${recommendation.personalizationFactors.map(f => `• ${f}`).join('\n')}`
      : '';

    const scheduleBlock = recommendation.weeklySchedule.length > 0
      ? `\n*📅 Недельное расписание:*\n${recommendation.weeklySchedule.map(d => `*${d.day}:* ${d.activities.join(', ')}`).join('\n')}`
      : '';

    const message = `
${formatter.header('🌐 Интегрированная рекомендация')}

${formatter.divider()}

*Основной подход:* ${recommendation.primaryApproach}
*Уровень доказательности:* Grade ${recommendation.evidenceLevel}

*Дополнительные подходы:*
${recommendation.secondaryApproaches.map(a => `• ${a}`).join('\n')}
${adaptationsBlock}${factorsBlock}

${formatter.divider()}
${scheduleBlock}

${sonya.tip('Рекомендация учитывает ваш хронотип, культурные предпочтения и индивидуальные факторы для оптимального результата.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Обзор доказательной базы', callbackData: 'therapy:evidence_overview' }],
      [{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'evidence_integrated' },
    };
  }

  /**
   * Get Russian name for belief category
   */
  private getBeliefCategoryRu(
    category: 'expectations' | 'consequences' | 'control' | 'medication' | 'causes'
  ): string {
    const names: Record<string, string> = {
      expectations: 'Ожидания от сна',
      consequences: 'Последствия бессонницы',
      control: 'Контроль над сном',
      medication: 'Убеждения о лекарствах',
      causes: 'Причины бессонницы',
    };
    return names[category] || category;
  }

  /**
   * Render effect size bar for visual representation
   */
  private renderEffectBar(effectSize: number): string {
    const maxBars = 10;
    const filled = Math.min(maxBars, Math.round(effectSize * 10));
    const empty = maxBars - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  // ==================== Content Helpers ====================

  /**
   * Get evidence-based overview content from European Guideline 2023
   * Integrates getCBTIComponentEvidence() into Core 1 psychoeducation
   *
   * Shows patients the scientific foundation of their treatment program,
   * increasing trust and adherence (Patient Decision Aids, Cochrane 2024).
   */
  private getEvidenceBasedOverviewContent(ctx: ISleepCoreContext): string | null {
    try {
      const components = ctx.sleepCore.getMostEffectiveCBTIComponents();
      if (!components || components.length === 0) {
        return null;
      }

      // Component name mapping
      const componentNames: Record<string, string> = {
        multicomponent_cbti: 'Мультикомпонентная КПТ-И',
        sleep_restriction: 'Ограничение сна',
        stimulus_control: 'Контроль стимулов',
        cognitive_restructuring: 'Когнитивная реструктуризация',
        relaxation: 'Релаксация',
        sleep_hygiene: 'Гигиена сна',
      };

      const topComponents = components.slice(0, 4).map((c) => {
        const name = componentNames[c.component] || c.component;
        return `• *${name}*: d = ${c.effectSize.toFixed(2)} (${c.nStudies} исследований)`;
      }).join('\n');

      // Get treatment recommendations for headline
      const recs = ctx.sleepCore.getTreatmentRecommendations('treatment');
      const topRec = recs.find((r) => r.evidenceGrade === 'A');
      const topRecLine = topRec
        ? `\n🟢 *${topRec.textRu}* (Grade A)`
        : '';

      return `
*📊 Научная основа программы*
_(European Insomnia Guideline 2023)_
${topRecLine}

*Эффективность компонентов КПТ-И (Cohen's d):*
${topComponents}

_d ≥ 0.8 = большой эффект, 0.5-0.8 = средний, 0.2-0.5 = малый_
      `.trim();
    } catch {
      return null;
    }
  }

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

  // ==================== Weekly SRT Review ====================

  /**
   * Show weekly SRT review — core mechanism of Sleep Restriction Therapy
   *
   * Scientific basis (HIGH confidence):
   * - Spielman et al. 1987: Weekly TIB adjustment based on SE
   * - AASM 2021 (Edinger et al.): SE ≥ 90% → increase, < 85% → decrease
   * - HABIT Trial 2023 (Lancet, n=642): SRT safe in primary care
   * - Kyle et al. 2014: 33% with ESS > normal weeks 1-3, normalizes by 3 months
   *
   * Safety:
   * - TIB never < 300 min (5h) — enforced by SleepRestrictionEngine
   * - Driving warning when TIB < 360 min (6h) — per European Guideline 2023
   */
  private async showWeeklyReview(
    ctx: ISleepCoreContext,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session?.plan) {
      return {
        success: false,
        message: `${formatter.warning('План лечения не найден')}\n\nПожалуйста, начните с /start и заполните 7 дней дневника.`,
      };
    }

    // Save old values for comparison
    const oldPlan = session.plan;
    const oldTIB = oldPlan.activeComponents.sleepRestriction?.prescribedTIB;
    const oldBedtime = oldPlan.activeComponents.sleepRestriction?.prescribedBedtime;

    // Get current progress
    const progress = ctx.sleepCore.getProgressReport(ctx.userId);

    // Trigger plan adjustment via SleepRestrictionEngine
    const updatedPlan = ctx.sleepCore.updateTreatmentPlan(ctx.userId);

    if (!updatedPlan) {
      return {
        success: true,
        message: `${formatter.warning('Недостаточно данных для обзора')}\n\nНеобходимо минимум 5 записей дневника за последнюю неделю.`,
        keyboard: [[{ text: '⬅️ К меню терапии', callbackData: 'therapy:menu' }]],
      };
    }

    const newTIB = updatedPlan.activeComponents.sleepRestriction?.prescribedTIB;
    const newBedtime = updatedPlan.activeComponents.sleepRestriction?.prescribedBedtime;
    const se = progress?.currentSleepEfficiency || 0;

    // Determine adjustment decision
    let decision: string;
    let decisionEmoji: string;
    if (newTIB && oldTIB && newTIB > oldTIB) {
      decision = `Увеличение на ${newTIB - oldTIB} мин`;
      decisionEmoji = '📈';
    } else if (newTIB && oldTIB && newTIB < oldTIB) {
      decision = `Уменьшение на ${oldTIB - newTIB} мин`;
      decisionEmoji = '📉';
    } else {
      decision = 'Без изменений';
      decisionEmoji = '➡️';
    }

    // Safety warning when TIB < 6 hours (per European Guideline 2023, Kyle et al. 2014)
    const safetyWarning = (newTIB && newTIB < 360)
      ? `\n\n${formatter.warning('Окно сна < 6 часов. Будьте внимательны за рулём и при работе с механизмами. При выраженной сонливости сообщите нам.')}`
      : '';

    const message = `
${formatter.header('📊 Еженедельный обзор SRT')}

${sonya.tip(`Неделя ${updatedPlan.currentWeek}. Анализ вашего сна за 7 дней.`)}

${formatter.divider()}

*Эффективность сна (SE):* ${se.toFixed(1)}%
${se >= 90 ? '✅ Отлично! SE ≥ 90%' : se >= 85 ? '🟡 Хорошо. SE 85-89%' : '🔻 SE < 85% — требуется корректировка'}

*Решение:* ${decisionEmoji} ${decision}

${oldTIB && newTIB ? `*Окно сна:* ${this.formatMinutes(oldTIB)} → ${this.formatMinutes(newTIB)}` : ''}
${oldBedtime && newBedtime && oldBedtime !== newBedtime ? `*Время отхода:* ${oldBedtime} → ${newBedtime}` : ''}

${formatter.divider()}

${progress ? `*ISI:* ${progress.currentISI} (изменение: ${progress.isiChange > 0 ? '-' : '+'}${Math.abs(progress.isiChange)})` : ''}
${safetyWarning}

${formatter.tip('Протокол Spielman (1987): еженедельная корректировка окна сна — ключевой элемент терапии ограничения сна.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Понятно', callbackData: 'therapy:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { step: 'weekly_review' },
    };
  }

  /**
   * Format minutes as hours and minutes (e.g. 330 → "5ч 30мин")
   */
  private formatMinutes(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}ч ${m > 0 ? m + 'мин' : ''}`.trim();
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
