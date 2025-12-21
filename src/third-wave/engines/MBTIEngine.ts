/**
 * MBTIEngine - Mindfulness-Based Therapy for Insomnia
 * ====================================================
 * Implementation of Jason Ong's MBT-I protocol (2014).
 *
 * MBT-I combines:
 * - Mindfulness meditation practices
 * - Behavioral sleep strategies (SRT, SCT)
 * - Metacognitive awareness training
 *
 * 8-Week Protocol Structure:
 * Week 1-2: Introduction to mindfulness + sleep education
 * Week 3-4: Working with sleepiness + sleep restriction
 * Week 5-6: Working with wakefulness + stimulus control
 * Week 7-8: Cultivating acceptance + maintenance
 *
 * Key Mechanisms:
 * - Reduces pre-sleep arousal (cognitive & somatic)
 * - Decreases sleep effort paradox
 * - Builds metacognitive awareness of sleep
 *
 * Scientific Evidence:
 * - Ong et al. (2014): RCT showing d=1.32 for ISI reduction
 * - Effective for treatment-resistant insomnia
 *
 * @packageDocumentation
 * @module @sleepcore/third-wave
 */

import type {
  IMBTIEngine,
  IMBTIPlan,
  IMBTISession,
  IMindfulnessSession,
  ISleepArousal,
  MindfulnessPractice,
} from '../interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * 8-Week MBT-I Session Templates
 */
const SESSION_TEMPLATES: IMBTISession[] = [
  {
    sessionId: 'mbti_w1',
    weekNumber: 1,
    theme: 'Знакомство с осознанностью и сном',
    objectives: [
      'Понять связь между осознанностью и сном',
      'Освоить базовое дыхательное упражнение',
      'Начать вести дневник сна',
    ],
    mindfulnessPractice: 'breath_awareness',
    behavioralComponent: 'none',
    homeAssignment: [
      'Практика осознанного дыхания 10 мин/день',
      'Заполнять дневник сна каждое утро',
      'Замечать моменты автопилота в течение дня',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w2',
    weekNumber: 2,
    theme: 'Осознанность тела и сонливость',
    objectives: [
      'Научиться различать усталость и сонливость',
      'Освоить сканирование тела',
      'Понять роль тела в засыпании',
    ],
    mindfulnessPractice: 'body_scan',
    behavioralComponent: 'none',
    homeAssignment: [
      'Сканирование тела перед сном 20 мин',
      'Отмечать уровень сонливости в течение дня',
      'Практика "пауза перед сном" — 5 мин осознанности',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w3',
    weekNumber: 3,
    theme: 'Работа с мыслями о сне',
    objectives: [
      'Распознавать автоматические мысли о сне',
      'Практиковать наблюдение мыслей без вовлечения',
      'Ввести ограничение времени в постели',
    ],
    mindfulnessPractice: 'sitting_meditation',
    behavioralComponent: 'sleep_restriction',
    homeAssignment: [
      'Сидячая медитация 20 мин/день',
      'Вести журнал мыслей о сне',
      'Соблюдать предписанное окно сна',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w4',
    weekNumber: 4,
    theme: 'Принятие бессонницы',
    objectives: [
      'Исследовать сопротивление и принятие',
      'Практиковать "позволение быть"',
      'Углубить практику ограничения сна',
    ],
    mindfulnessPractice: 'open_awareness',
    behavioralComponent: 'sleep_restriction',
    homeAssignment: [
      'Практика открытого осознавания 20 мин',
      'Упражнение "гость в доме" с бессонницей',
      'Продолжать ограничение времени в постели',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w5',
    weekNumber: 5,
    theme: 'Осознанное бодрствование ночью',
    objectives: [
      'Изменить отношение к ночному бодрствованию',
      'Освоить "3-минутное пространство дыхания"',
      'Ввести контроль стимулов',
    ],
    mindfulnessPractice: '3_minute_breathing_space',
    behavioralComponent: 'stimulus_control',
    homeAssignment: [
      '3-минутное дыхание при ночном пробуждении',
      'Вставать из постели если не спится > 15 мин',
      'Практика осознанной деятельности ночью',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w6',
    weekNumber: 6,
    theme: 'Доброжелательность к себе',
    objectives: [
      'Развить самосострадание при бессоннице',
      'Освоить медитацию любящей доброты',
      'Отпустить самокритику за плохой сон',
    ],
    mindfulnessPractice: 'loving_kindness',
    behavioralComponent: 'stimulus_control',
    homeAssignment: [
      'Медитация любящей доброты 15 мин/день',
      'Фразы самосострадания при трудностях со сном',
      'Письмо себе от сострадательного друга',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w7',
    weekNumber: 7,
    theme: 'Интеграция практик',
    objectives: [
      'Объединить все практики в личную программу',
      'Определить предпочтительные техники',
      'Планировать поддержание практики',
    ],
    mindfulnessPractice: 'sitting_meditation',
    behavioralComponent: 'none',
    homeAssignment: [
      'Создать личный план практики',
      'Чередовать разные медитации',
      'Рефлексия: что работает лучше всего',
    ],
    duration: 120,
  },
  {
    sessionId: 'mbti_w8',
    weekNumber: 8,
    theme: 'Осознанность как образ жизни',
    objectives: [
      'Закрепить навыки для долгосрочного использования',
      'Предвидеть трудности и рецидивы',
      'Завершить программу с планом поддержки',
    ],
    mindfulnessPractice: 'open_awareness',
    behavioralComponent: 'none',
    homeAssignment: [
      'Продолжать ежедневную практику 20+ мин',
      'Применять осознанность в повседневной жизни',
      'Периодические "дни молчания" для углубления',
    ],
    duration: 120,
  },
];

/**
 * Mindfulness practice instructions
 */
const PRACTICE_INSTRUCTIONS: Record<MindfulnessPractice, string[]> = {
  breath_awareness: [
    'Сядьте или лягте в удобную позу.',
    'Закройте глаза или опустите взгляд.',
    'Направьте внимание на дыхание — просто наблюдайте.',
    'Не пытайтесь изменить дыхание, просто замечайте.',
    'Вдох... выдох... ощущение воздуха...',
    'Когда ум уходит — мягко возвращайте к дыханию.',
    'Это не ошибка, это и есть практика.',
    'Продолжайте наблюдать дыхание...',
  ],
  body_scan: [
    'Лягте на спину, руки вдоль тела.',
    'Закройте глаза и сделайте несколько глубоких вдохов.',
    'Направьте внимание на пальцы ног. Что вы чувствуете?',
    'Медленно поднимайтесь выше: стопы, голени, колени...',
    'Без суждения отмечайте любые ощущения.',
    'Бёдра, таз, живот... дышите в каждую область.',
    'Грудь, спина, плечи, руки до кончиков пальцев.',
    'Шея, лицо, макушка. Всё тело в поле осознавания.',
    'Ощутите тело как единое целое, дышащее, живое.',
  ],
  sitting_meditation: [
    'Сядьте с прямой спиной, руки на коленях.',
    'Закройте глаза или смягчите взгляд.',
    'Начните с осознавания дыхания.',
    'Расширьте внимание на тело целиком.',
    'Включите звуки вокруг — не анализируя.',
    'Мысли приходят и уходят, как облака.',
    'Вы — небо, не облака. Наблюдайте.',
    'Оставайтесь в открытом присутствии.',
  ],
  mindful_movement: [
    'Встаньте, ноги на ширине плеч.',
    'Медленно поднимите руки через стороны — осознавайте каждое движение.',
    'Опустите руки так же медленно.',
    'Сделайте мягкий наклон вперёд, следя за ощущениями.',
    'Поверните голову влево-вправо с полным вниманием.',
    'Каждое движение — как в первый раз.',
    'Синхронизируйте движение с дыханием.',
    'Завершите в неподвижности, ощущая тело.',
  ],
  loving_kindness: [
    'Сядьте удобно, закройте глаза.',
    'Вспомните того, кто вас безусловно любит.',
    'Почувствуйте тепло этой любви в груди.',
    'Направьте это тепло к себе: "Пусть я буду счастлив..."',
    '"Пусть я буду здоров... Пусть я буду спокоен..."',
    'Направьте доброту к близкому человеку.',
    'Затем к нейтральному человеку.',
    'И наконец — ко всем существам повсюду.',
    '"Пусть все существа будут счастливы..."',
  ],
  open_awareness: [
    'Начните с осознавания дыхания.',
    'Постепенно расширяйте внимание.',
    'Включите ощущения тела.',
    'Добавьте звуки вокруг.',
    'Отпустите фокус — станьте открытым пространством.',
    'Всё появляется и исчезает в осознавании.',
    'Вы — чистое присутствие, свидетель.',
    'Ничего не нужно делать, просто быть.',
  ],
  '3_minute_breathing_space': [
    'Минута 1: ОСОЗНАТЬ. Что происходит прямо сейчас?',
    'Какие мысли? Чувства? Ощущения в теле?',
    'Минута 2: СОБРАТЬ. Направьте внимание на дыхание.',
    'Следуйте за каждым вдохом и выдохом.',
    'Минута 3: РАСШИРИТЬ. Расширьте внимание на всё тело.',
    'Примите позу готовности к следующему моменту.',
  ],
};

/**
 * MBT-I Engine Implementation
 */
export class MBTIEngine implements IMBTIEngine {
  /**
   * Initialize MBT-I treatment plan
   */
  initializePlan(
    userId: string,
    baselineAssessment: ISleepState[],
    options: { useBehavioralComponents: boolean } = { useBehavioralComponents: true }
  ): IMBTIPlan {
    const lastState = baselineAssessment[baselineAssessment.length - 1];
    const arousalBaseline = this.assessArousal(lastState);

    return {
      userId,
      startDate: new Date().toISOString().split('T')[0],
      currentWeek: 1,
      totalWeeks: 8,

      currentSession: SESSION_TEMPLATES[0],
      completedSessions: [],
      practiceLog: [],

      dailyPracticeTarget: 20, // minutes

      arousalBaseline,
      arousalCurrent: arousalBaseline,

      useSleepRestriction: options.useBehavioralComponents,
      useStimulusControl: options.useBehavioralComponents,

      progress: {
        practiceAdherence: 0,
        arousalReduction: 0,
        mindfulnessIncrease: 0,
        isiChange: 0,
      },
    };
  }

  /**
   * Get current week's session
   */
  getCurrentSession(plan: IMBTIPlan): IMBTISession {
    const weekIndex = Math.min(plan.currentWeek - 1, SESSION_TEMPLATES.length - 1);
    return SESSION_TEMPLATES[weekIndex];
  }

  /**
   * Get mindfulness practice for context
   */
  getPractice(
    plan: IMBTIPlan,
    context: 'bedtime' | 'daytime' | 'night_awakening',
    duration: number
  ): {
    practice: MindfulnessPractice;
    instructions: string[];
    audioUrl?: string;
  } {
    let practice: MindfulnessPractice;

    switch (context) {
      case 'bedtime':
        // Body scan or breath awareness for bedtime
        practice = plan.currentWeek >= 2 ? 'body_scan' : 'breath_awareness';
        break;

      case 'night_awakening':
        // 3-minute breathing space for night awakenings
        practice = '3_minute_breathing_space';
        break;

      case 'daytime':
        // Sitting meditation or current week's practice
        practice = plan.currentSession.mindfulnessPractice;
        break;

      default:
        practice = 'breath_awareness';
    }

    const instructions = this.scaleInstructions(
      PRACTICE_INSTRUCTIONS[practice],
      duration
    );

    return {
      practice,
      instructions,
      audioUrl: undefined, // Would link to audio resources
    };
  }

  /**
   * Record completed practice session
   */
  recordPractice(plan: IMBTIPlan, session: IMindfulnessSession): IMBTIPlan {
    const updatedLog = [...plan.practiceLog, session];

    // Calculate adherence
    const weekPractices = updatedLog.filter((p) => {
      const practiceDate = new Date(p.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return practiceDate >= weekAgo;
    });

    const totalMinutes = weekPractices.reduce((sum, p) => sum + p.duration, 0);
    const targetMinutes = plan.dailyPracticeTarget * 7;
    const practiceAdherence = Math.min(1, totalMinutes / targetMinutes);

    // Calculate arousal change
    const recentPractices = updatedLog.slice(-5);
    const avgArousalReduction =
      recentPractices.length > 0
        ? recentPractices.reduce(
            (sum, p) => sum + (p.preArousalLevel - p.postArousalLevel),
            0
          ) / recentPractices.length
        : 0;

    // Calculate mindfulness increase
    const mindfulnessIncrease =
      recentPractices.length > 0
        ? recentPractices.reduce(
            (sum, p) => sum + (p.postMindfulness - p.preMindfulness),
            0
          ) / recentPractices.length
        : 0;

    return {
      ...plan,
      practiceLog: updatedLog,
      progress: {
        ...plan.progress,
        practiceAdherence,
        arousalReduction: avgArousalReduction * 100,
        mindfulnessIncrease: mindfulnessIncrease * 100,
      },
    };
  }

  /**
   * Assess current arousal levels
   */
  assessArousal(sleepState: ISleepState): ISleepArousal {
    const cognitions = sleepState.cognitions;

    return {
      cognitive: cognitions.preSleepArousal,
      somatic: 0.3 + cognitions.preSleepArousal * 0.4, // Estimate
      sleepEffort: cognitions.beliefs.effortfulSleep ? 0.8 : 0.3,
      sleepWorry: cognitions.sleepAnxiety,
      rumination: cognitions.preSleepArousal * 0.8,
    };
  }

  /**
   * Update plan based on progress
   */
  updatePlan(plan: IMBTIPlan, recentStates: ISleepState[]): IMBTIPlan {
    if (recentStates.length === 0) return plan;

    const lastState = recentStates[recentStates.length - 1];
    const arousalCurrent = this.assessArousal(lastState);

    // Check if week should advance
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const newWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, 8);

    // Move current session to completed if week advanced
    let completedSessions = plan.completedSessions;
    let currentSession = plan.currentSession;

    if (newWeek > plan.currentWeek) {
      completedSessions = [...plan.completedSessions, plan.currentSession];
      currentSession = SESSION_TEMPLATES[newWeek - 1];
    }

    // Calculate ISI change if we have baseline
    const isiBaseline = recentStates[0]?.insomnia.isiScore || 15;
    const isiCurrent = lastState.insomnia.isiScore;
    const isiChange = isiBaseline - isiCurrent;

    return {
      ...plan,
      currentWeek: newWeek,
      currentSession,
      completedSessions,
      arousalCurrent,
      progress: {
        ...plan.progress,
        isiChange,
      },
    };
  }

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(plan: IMBTIPlan): {
    practiceMinutes: number;
    practiceAdherence: number;
    arousalChange: ISleepArousal;
    keyInsights: string[];
    nextWeekFocus: string[];
  } {
    // Calculate week's practice minutes
    const weekPractices = plan.practiceLog.filter((p) => {
      const practiceDate = new Date(p.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return practiceDate >= weekAgo;
    });

    const practiceMinutes = weekPractices.reduce((sum, p) => sum + p.duration, 0);

    // Calculate arousal change
    const arousalChange: ISleepArousal = {
      cognitive: plan.arousalBaseline.cognitive - plan.arousalCurrent.cognitive,
      somatic: plan.arousalBaseline.somatic - plan.arousalCurrent.somatic,
      sleepEffort: plan.arousalBaseline.sleepEffort - plan.arousalCurrent.sleepEffort,
      sleepWorry: plan.arousalBaseline.sleepWorry - plan.arousalCurrent.sleepWorry,
      rumination: plan.arousalBaseline.rumination - plan.arousalCurrent.rumination,
    };

    // Generate insights
    const keyInsights: string[] = [];

    if (plan.progress.practiceAdherence >= 0.8) {
      keyInsights.push('Отличная регулярность практики — это ключ к успеху');
    } else if (plan.progress.practiceAdherence < 0.5) {
      keyInsights.push('Постарайтесь практиковать чаще — даже 5 минут имеют значение');
    }

    if (arousalChange.cognitive > 0.1) {
      keyInsights.push('Заметное снижение когнитивного возбуждения');
    }

    if (arousalChange.sleepWorry > 0.1) {
      keyInsights.push('Уменьшается тревога о сне');
    }

    // Next week focus
    const nextSession = SESSION_TEMPLATES[Math.min(plan.currentWeek, 7)];
    const nextWeekFocus = [
      `Тема недели: ${nextSession.theme}`,
      `Основная практика: ${this.getPracticeName(nextSession.mindfulnessPractice)}`,
      ...nextSession.homeAssignment.slice(0, 2),
    ];

    return {
      practiceMinutes,
      practiceAdherence: plan.progress.practiceAdherence,
      arousalChange,
      keyInsights,
      nextWeekFocus,
    };
  }

  /**
   * Scale instructions to duration
   */
  private scaleInstructions(instructions: string[], duration: number): string[] {
    if (duration < 5) {
      return instructions.slice(0, 4);
    }
    if (duration < 15) {
      return instructions;
    }
    // For longer sessions, add pauses
    const extended = [...instructions];
    extended.push('Продолжайте практику в тишине...');
    extended.push('Когда будете готовы, мягко откройте глаза.');
    return extended;
  }

  /**
   * Get Russian name for practice
   */
  private getPracticeName(practice: MindfulnessPractice): string {
    const names: Record<MindfulnessPractice, string> = {
      breath_awareness: 'Осознавание дыхания',
      body_scan: 'Сканирование тела',
      sitting_meditation: 'Сидячая медитация',
      mindful_movement: 'Осознанное движение',
      loving_kindness: 'Медитация любящей доброты',
      open_awareness: 'Открытое осознавание',
      '3_minute_breathing_space': '3-минутное пространство дыхания',
    };
    return names[practice];
  }
}
