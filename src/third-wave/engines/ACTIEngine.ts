/**
 * ACTIEngine - Acceptance and Commitment Therapy for Insomnia
 * ============================================================
 * Implementation of ACT-I protocol based on:
 * - Guy Meadows "The Sleep Book" (2014)
 * - Lundh & Broman (2000) - Insomnia as Problem Solving
 * - Hayes et al. (1999) - ACT Framework
 *
 * Core ACT Processes (Hexaflex):
 * 1. Acceptance - Willingness to experience
 * 2. Cognitive Defusion - Thoughts are just thoughts
 * 3. Present Moment - Here and now awareness
 * 4. Self-as-Context - Observer perspective
 * 5. Values - What matters most
 * 6. Committed Action - Behavior aligned with values
 *
 * ACT-I Key Concepts:
 * - Sleep is not a performance
 * - Struggling against sleeplessness maintains it
 * - Willingness to be awake paradoxically enables sleep
 * - Focus on valued living, not just sleep quantity
 *
 * Scientific Evidence:
 * - Dalrymple et al. (2010): ACT-I protocol
 * - Hertenstein et al. (2022): Meta-analysis
 * - Meadows et al. (2024): Session-by-session guide
 *
 * @packageDocumentation
 * @module @sleepcore/third-wave
 */

import type {
  IACTIEngine,
  IACTIPlan,
  IACTISession,
  IUnwantedExperience,
  IDefusionTechnique,
  IValuesAssessment,
  ICommittedAction,
  ACTProcess,
  SessionLevel,
} from '../interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * ACT-I Session Templates (5-6 sessions)
 */
const SESSION_TEMPLATES: IACTISession[] = [
  {
    sessionId: 'acti_s1',
    sessionNumber: 1,
    theme: 'Понимание ловушки контроля',
    primaryProcess: 'acceptance',
    secondaryProcesses: ['present_moment'],
    exercises: [
      'Анализ стратегий контроля сна',
      'Упражнение "Что вы пробовали?"',
      'Введение в "готовность"',
    ],
    metaphors: [
      'Quicksand (Зыбучие пески) - борьба углубляет проблему',
      'Unwanted party guest (Незваный гость) - сопротивление усиливает присутствие',
    ],
    homeExperiments: [
      'Заметить все попытки контролировать сон',
      'Практика "отпускания" в одной ситуации',
    ],
    duration: 60,
  },
  {
    sessionId: 'acti_s2',
    sessionNumber: 2,
    theme: 'Мысли — это только мысли',
    primaryProcess: 'cognitive_defusion',
    secondaryProcesses: ['present_moment', 'self_as_context'],
    exercises: [
      'Идентификация мыслей о сне',
      'Техника "Я замечаю мысль..."',
      'Пение мыслей глупым голосом',
      'Визуализация мыслей как облаков',
    ],
    metaphors: [
      'Passengers on the bus (Пассажиры в автобусе) - мысли не управляют вами',
      'Leaves on a stream (Листья на ручье) - мысли приходят и уходят',
    ],
    homeExperiments: [
      'Записать 5 повторяющихся мыслей о сне',
      'Применить технику дефузии к каждой',
      'Заметить, как меняется влияние мыслей',
    ],
    duration: 60,
  },
  {
    sessionId: 'acti_s3',
    sessionNumber: 3,
    theme: 'Принятие неприятных ощущений',
    primaryProcess: 'acceptance',
    secondaryProcesses: ['present_moment'],
    exercises: [
      'Исследование телесных ощущений бессонницы',
      'Упражнение "Расширение" (Expansion)',
      'Дыхание в ощущение',
    ],
    metaphors: [
      'Struggle switch (Переключатель борьбы)',
      'Clean vs dirty discomfort (Чистый и грязный дискомфорт)',
    ],
    homeExperiments: [
      'При бессоннице — исследовать ощущения с любопытством',
      'Практика расширения 5 мин перед сном',
      'Отметить разницу между ощущением и реакцией на него',
    ],
    duration: 60,
  },
  {
    sessionId: 'acti_s4',
    sessionNumber: 4,
    theme: 'Ценности и смысл',
    primaryProcess: 'values',
    secondaryProcesses: ['committed_action'],
    exercises: [
      'Оценка жизненных ценностей',
      'Как бессонница влияет на ценности',
      'Что бы вы делали, если бы спали идеально?',
    ],
    metaphors: [
      'Compass vs goals (Компас vs цели)',
      'Gardening (Садоводство) - ценности как направление роста',
    ],
    homeExperiments: [
      'Сделать одно ценностное действие несмотря на усталость',
      'Заметить моменты, когда бессонница "диктует" поведение',
      'Написать 3 ценности, страдающие от фокуса на сне',
    ],
    duration: 60,
  },
  {
    sessionId: 'acti_s5',
    sessionNumber: 5,
    theme: 'Готовность и осознанные ночи',
    primaryProcess: 'acceptance',
    secondaryProcesses: ['present_moment', 'committed_action'],
    exercises: [
      'Упражнение "Готовность к бодрствованию"',
      'Осознанное бодрствование ночью',
      'Позиция наблюдателя',
    ],
    metaphors: [
      'Tug of war with a monster (Перетягивание каната с монстром) - отпустить канат',
      'Two scales (Две шкалы) - готовность и дискомфорт',
    ],
    homeExperiments: [
      'При ночном пробуждении — практиковать открытость',
      'Вместо "пытаться уснуть" — позволить сну прийти',
      'Заметить, как меняется опыт ночи',
    ],
    duration: 60,
  },
  {
    sessionId: 'acti_s6',
    sessionNumber: 6,
    theme: 'Жизнь в соответствии с ценностями',
    primaryProcess: 'committed_action',
    secondaryProcesses: ['values', 'acceptance'],
    exercises: [
      'План осмысленных действий',
      'Преодоление барьеров',
      'Профилактика рецидивов',
    ],
    metaphors: [
      'Chess board (Шахматная доска) - вы не фигуры, вы доска',
      'Hands as thoughts (Руки как мысли) - дефузия в действии',
    ],
    homeExperiments: [
      'Еженедельно — одно значимое действие',
      'Применять ACT-навыки к другим областям жизни',
      'Вести журнал готовности',
    ],
    duration: 60,
  },
];

/**
 * Defusion techniques
 */
const DEFUSION_TECHNIQUES: IDefusionTechnique[] = [
  {
    id: 'def_notice',
    name: 'Я замечаю мысль...',
    description: 'Добавление фразы "Я замечаю, что у меня есть мысль..." перед мыслью',
    instructions: [
      'Когда появляется тревожная мысль о сне, не погружайтесь в неё.',
      'Скажите себе: "Я замечаю, что у меня есть мысль..."',
      'Затем озвучьте мысль: "...что я не смогу уснуть"',
      'Заметьте дистанцию между вами и мыслью.',
      'Вы — тот, кто замечает мысль, а не сама мысль.',
    ],
    targetExperiences: ['thought'],
    difficulty: 'beginner',
    duration: 2,
  },
  {
    id: 'def_singing',
    name: 'Пропеть мысль',
    description: 'Пропеть тревожную мысль на мотив "Happy Birthday"',
    instructions: [
      'Возьмите беспокоящую мысль о сне.',
      'Пропойте её на мотив "Happy Birthday" или другой мелодии.',
      'Заметьте, как меняется ваше отношение к мысли.',
      'Мысль остаётся, но её власть уменьшается.',
    ],
    targetExperiences: ['thought'],
    difficulty: 'beginner',
    duration: 2,
  },
  {
    id: 'def_leaves',
    name: 'Листья на ручье',
    description: 'Визуализация мыслей как листьев, плывущих по ручью',
    instructions: [
      'Закройте глаза и представьте медленный ручей.',
      'Листья падают с деревьев и плывут по воде.',
      'Когда появляется мысль — положите её на лист.',
      'Наблюдайте, как лист уплывает вниз по течению.',
      'Не пытайтесь ускорить или остановить листья.',
      'Просто наблюдайте поток мыслей.',
    ],
    targetExperiences: ['thought', 'feeling'],
    difficulty: 'intermediate',
    duration: 10,
  },
  {
    id: 'def_thankmind',
    name: 'Спасибо, ум!',
    description: 'Поблагодарить ум за мысль и отпустить',
    instructions: [
      'Когда ум выдаёт тревожную мысль, скажите:',
      '"Спасибо, ум, за эту мысль!"',
      '"Спасибо, что пытаешься меня защитить."',
      '"Я ценю твою заботу, но сейчас я в порядке."',
      'Отпустите мысль с благодарностью.',
    ],
    targetExperiences: ['thought'],
    difficulty: 'beginner',
    duration: 1,
  },
  {
    id: 'def_expansion',
    name: 'Расширение (Expansion)',
    description: 'Создание пространства для неприятных ощущений',
    instructions: [
      'Найдите неприятное ощущение в теле.',
      'Наблюдайте его с любопытством: форма, размер, текстура.',
      'Дышите в это ощущение — представьте, что дыхание обтекает его.',
      'Позвольте ощущению быть, создавая пространство вокруг.',
      'Не пытайтесь изменить или убрать — просто позвольте.',
      'Заметьте: вы больше, чем это ощущение.',
    ],
    targetExperiences: ['sensation', 'feeling'],
    difficulty: 'intermediate',
    duration: 10,
  },
  {
    id: 'def_urge_surfing',
    name: 'Серфинг на волне',
    description: 'Наблюдение за побуждением без следования ему',
    instructions: [
      'Когда возникает побуждение (встать, проверить время, переживать)...',
      'Представьте его как волну в океане.',
      'Волна поднимается, достигает пика, опускается.',
      'Ваша задача — "оседлать" волну, не падая.',
      'Наблюдайте интенсивность: она растёт, потом падает.',
      'Побуждения временны — они проходят, если не бороться.',
    ],
    targetExperiences: ['urge'],
    difficulty: 'intermediate',
    duration: 5,
  },
];

/**
 * Acceptance exercises for sleep struggles
 */
const ACCEPTANCE_EXERCISES: Record<
  'cant_sleep' | 'anxious' | 'frustrated' | 'exhausted',
  { exercise: string; instructions: string[]; metaphor: string }
> = {
  cant_sleep: {
    exercise: 'Готовность к бодрствованию',
    instructions: [
      'Вместо того чтобы пытаться уснуть, попробуйте быть готовым к бодрствованию.',
      'Скажите себе: "Я готов быть бодрым столько, сколько нужно."',
      'Это не означает, что вы хотите бодрствовать — лишь что вы не боретесь.',
      'Парадокс: готовность к бодрствованию часто приводит ко сну.',
      'Отпустите повестку "я должен уснуть" — просто будьте.',
    ],
    metaphor:
      'Зыбучие пески: чем больше боретесь, тем глубже тонете. Расслабьтесь и позвольте себе всплыть.',
  },
  anxious: {
    exercise: 'Дыхание в тревогу',
    instructions: [
      'Найдите, где в теле живёт тревога.',
      'Направьте туда мягкое, любопытное внимание.',
      'Дышите так, будто дыхание обтекает это место.',
      'Не пытайтесь убрать тревогу — создайте для неё пространство.',
      'Скажите: "Здесь есть тревога, и я могу её вместить."',
    ],
    metaphor:
      'Незваный гость: чем больше пытаетесь вытолкнуть за дверь, тем громче он стучит. Впустите — и он успокоится.',
  },
  frustrated: {
    exercise: 'Наблюдатель разочарования',
    instructions: [
      'Заметьте разочарование как опыт, а не как факт.',
      'Кто наблюдает разочарование? Это "вы-наблюдатель".',
      'Вы — шире любой эмоции, которую испытываете.',
      'Спросите: "Если бы я был наблюдателем этого момента, что бы я увидел?"',
      'Разочарование — это гость, а вы — хозяин дома.',
    ],
    metaphor:
      'Шахматная доска: вы не чёрные и не белые фигуры. Вы — доска, на которой разворачивается игра.',
  },
  exhausted: {
    exercise: 'Усталость как компас',
    instructions: [
      'Усталость говорит, что вы живой человек с потребностями.',
      'Вместо борьбы с усталостью — послушайте её.',
      'Спросите: "Что сейчас действительно важно для меня?"',
      'Можете ли вы сделать что-то ценное, несмотря на усталость?',
      'Усталость не должна диктовать вашу жизнь.',
    ],
    metaphor:
      'Компас: усталость указывает на потребность, но не определяет направление. Ваши ценности — вот истинный компас.',
  },
};

/**
 * ACT-I Engine Implementation
 */
export class ACTIEngine implements IACTIEngine {
  /**
   * Initialize ACT-I treatment plan
   */
  initializePlan(userId: string, baselineAssessment: ISleepState[]): IACTIPlan {
    const lastState = baselineAssessment[baselineAssessment.length - 1];
    const flexibility = this.assessFlexibility(lastState);

    return {
      userId,
      startDate: new Date().toISOString().split('T')[0],
      currentSession: 1,
      totalSessions: 6,

      sessionDetails: SESSION_TEMPLATES[0],
      completedSessions: [],

      unwantedExperiences: [],
      defusionPractice: [],
      values: null,
      committedActions: [],

      flexibility: {
        acceptanceBaseline: flexibility.acceptance,
        acceptanceCurrent: flexibility.acceptance,
        defusionBaseline: flexibility.defusion,
        defusionCurrent: flexibility.defusion,
        valuesClarity: flexibility.valuesClarity,
        committedActionAdherence: 0,
      },

      sleepWillingness: {
        baseline: lastState.cognitions.beliefs.effortfulSleep ? 0.3 : 0.7,
        current: lastState.cognitions.beliefs.effortfulSleep ? 0.3 : 0.7,
      },

      progress: {
        flexibilityChange: 0,
        isiChange: 0,
        qualityOfLifeChange: 0,
      },
    };
  }

  /**
   * Get current session
   */
  getCurrentSession(plan: IACTIPlan): IACTISession {
    const sessionIndex = Math.min(plan.currentSession - 1, SESSION_TEMPLATES.length - 1);
    return SESSION_TEMPLATES[sessionIndex];
  }

  /**
   * Identify unwanted experiences from user input
   */
  identifyUnwantedExperiences(
    userText: string,
    context: 'pre_sleep' | 'during_night' | 'morning' | 'daytime'
  ): IUnwantedExperience[] {
    const experiences: IUnwantedExperience[] = [];
    const lowerText = userText.toLowerCase();

    // Detect thought patterns
    const thoughtPatterns = [
      { keywords: ['не смогу', 'не засну', 'опять'], content: 'Я не смогу уснуть' },
      { keywords: ['завтра', 'ужасный', 'справлюсь'], content: 'Завтра будет ужасный день' },
      { keywords: ['всегда', 'никогда', 'нормально'], content: 'Я никогда не буду нормально спать' },
      { keywords: ['сломался', 'разучился', 'забыл'], content: 'Мой сон сломался' },
    ];

    for (const pattern of thoughtPatterns) {
      if (pattern.keywords.some((kw) => lowerText.includes(kw))) {
        experiences.push({
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'thought',
          content: pattern.content,
          context,
          frequency: 0.7,
          distress: 0.6,
          fusionLevel: 0.7,
          avoidanceBehaviors: [],
        });
      }
    }

    // Detect feelings
    const feelingPatterns = [
      { keywords: ['тревог', 'беспокой', 'страх'], content: 'Тревога о сне' },
      { keywords: ['злость', 'раздраж', 'бесит'], content: 'Разочарование в бессоннице' },
      { keywords: ['безнадёж', 'отчаян', 'бесполезно'], content: 'Безнадёжность' },
    ];

    for (const pattern of feelingPatterns) {
      if (pattern.keywords.some((kw) => lowerText.includes(kw))) {
        experiences.push({
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'feeling',
          content: pattern.content,
          context,
          frequency: 0.6,
          distress: 0.7,
          fusionLevel: 0.6,
          avoidanceBehaviors: [],
        });
      }
    }

    // Detect sensations
    if (lowerText.includes('напряж') || lowerText.includes('сердце') || lowerText.includes('тело')) {
      experiences.push({
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'sensation',
        content: 'Телесное напряжение',
        context,
        frequency: 0.5,
        distress: 0.5,
        fusionLevel: 0.5,
        avoidanceBehaviors: [],
      });
    }

    return experiences;
  }

  /**
   * Get defusion technique for experience
   */
  getDefusionTechnique(
    experience: IUnwantedExperience,
    userLevel: SessionLevel
  ): IDefusionTechnique {
    // Filter by experience type and difficulty
    const suitable = DEFUSION_TECHNIQUES.filter(
      (t) =>
        t.targetExperiences.includes(experience.type) &&
        (userLevel === 'advanced' || t.difficulty !== 'advanced') &&
        (userLevel !== 'beginner' || t.difficulty === 'beginner')
    );

    if (suitable.length === 0) {
      return DEFUSION_TECHNIQUES[0]; // Fallback to "I notice..."
    }

    // Return random suitable technique
    return suitable[Math.floor(Math.random() * suitable.length)];
  }

  /**
   * Conduct values assessment
   */
  conductValuesAssessment(
    userId: string,
    responses: Record<string, number>
  ): IValuesAssessment {
    return {
      userId,
      date: new Date().toISOString().split('T')[0],
      domains: {
        health: {
          importance: responses.health_importance || 8,
          currentAction: responses.health_action || 4,
        },
        relationships: {
          importance: responses.relationships_importance || 9,
          currentAction: responses.relationships_action || 5,
        },
        work: {
          importance: responses.work_importance || 7,
          currentAction: responses.work_action || 4,
        },
        leisure: {
          importance: responses.leisure_importance || 6,
          currentAction: responses.leisure_action || 3,
        },
        personal_growth: {
          importance: responses.growth_importance || 7,
          currentAction: responses.growth_action || 4,
        },
      },
      insomniaImpact: [
        'Меньше энергии на близких',
        'Снижена продуктивность',
        'Избегаю социальных мероприятий',
      ],
      sleepGoals: [
        'Просыпаться с достаточной энергией для важных дел',
        'Не позволять мыслям о сне управлять моей жизнью',
      ],
    };
  }

  /**
   * Generate committed actions from values
   */
  generateCommittedActions(
    values: IValuesAssessment,
    sleepState: ISleepState
  ): ICommittedAction[] {
    const actions: ICommittedAction[] = [];

    // Find domains with biggest gap (high importance, low action)
    const gaps = Object.entries(values.domains)
      .map(([domain, scores]) => ({
        domain,
        gap: scores.importance - scores.currentAction,
        importance: scores.importance,
      }))
      .sort((a, b) => b.gap - a.gap);

    // Generate action for top 2 gaps
    for (const { domain, importance } of gaps.slice(0, 2)) {
      const action = this.generateActionForDomain(domain, importance);
      actions.push(action);
    }

    // Add a sleep-specific committed action
    actions.push({
      id: `action_sleep_${Date.now()}`,
      action: 'Практиковать готовность к бодрствованию вместо попыток уснуть',
      linkedValue: 'Психологическое здоровье',
      frequency: 'daily',
      startDate: new Date().toISOString().split('T')[0],
      completed: [],
      barriers: ['Привычка бороться', 'Страх усталости'],
      adjustments: [],
    });

    return actions;
  }

  /**
   * Get acceptance exercise for sleep struggle
   */
  getAcceptanceExercise(
    struggle: 'cant_sleep' | 'anxious' | 'frustrated' | 'exhausted'
  ): { exercise: string; instructions: string[]; metaphor: string } {
    return ACCEPTANCE_EXERCISES[struggle];
  }

  /**
   * Update plan based on progress
   */
  updatePlan(plan: IACTIPlan, recentStates: ISleepState[]): IACTIPlan {
    if (recentStates.length === 0) return plan;

    const lastState = recentStates[recentStates.length - 1];
    const flexibility = this.assessFlexibility(lastState);

    // Calculate flexibility change
    const flexibilityChange =
      ((flexibility.overall -
        (plan.flexibility.acceptanceBaseline + plan.flexibility.defusionBaseline) / 2) /
        ((plan.flexibility.acceptanceBaseline + plan.flexibility.defusionBaseline) / 2)) *
      100;

    // Calculate ISI change
    const isiBaseline = recentStates[0]?.insomnia.isiScore || 15;
    const isiCurrent = lastState.insomnia.isiScore;
    const isiChange = isiBaseline - isiCurrent;

    // Update sleep willingness based on sleep effort belief
    const currentWillingness = lastState.cognitions.beliefs.effortfulSleep ? 0.3 : 0.7;

    return {
      ...plan,
      flexibility: {
        ...plan.flexibility,
        acceptanceCurrent: flexibility.acceptance,
        defusionCurrent: flexibility.defusion,
        valuesClarity: flexibility.valuesClarity,
      },
      sleepWillingness: {
        ...plan.sleepWillingness,
        current: currentWillingness,
      },
      progress: {
        flexibilityChange,
        isiChange,
        qualityOfLifeChange: 0, // Would need QoL measure
      },
    };
  }

  /**
   * Assess psychological flexibility
   */
  assessFlexibility(sleepState: ISleepState): {
    acceptance: number;
    defusion: number;
    presentMoment: number;
    selfAsContext: number;
    valuesClarity: number;
    committedAction: number;
    overall: number;
  } {
    const cognitions = sleepState.cognitions;

    // Estimate flexibility from available data
    // Lower sleep anxiety = higher acceptance
    const acceptance = 1 - cognitions.sleepAnxiety;

    // Lower distortion presence = higher defusion
    const beliefCount = Object.values(cognitions.beliefs).filter(Boolean).length;
    const defusion = 1 - beliefCount / 5;

    // Lower arousal = better present moment
    const presentMoment = 1 - cognitions.preSleepArousal;

    // Higher self-efficacy = better self-as-context
    const selfAsContext = cognitions.sleepSelfEfficacy;

    // Estimates (would need actual values assessment)
    const valuesClarity = 0.6;
    const committedAction = 0.5;

    const overall =
      (acceptance + defusion + presentMoment + selfAsContext + valuesClarity + committedAction) / 6;

    return {
      acceptance,
      defusion,
      presentMoment,
      selfAsContext,
      valuesClarity,
      committedAction,
      overall,
    };
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(plan: IACTIPlan): {
    keyTakeaways: string[];
    practiceExercises: string[];
    nextSessionPreview: string;
  } {
    const currentSession = this.getCurrentSession(plan);
    const nextSessionIndex = Math.min(plan.currentSession, SESSION_TEMPLATES.length - 1);
    const nextSession = SESSION_TEMPLATES[nextSessionIndex];

    const keyTakeaways: string[] = [];
    const practiceExercises: string[] = [];

    // Generate takeaways based on primary process
    switch (currentSession.primaryProcess) {
      case 'acceptance':
        keyTakeaways.push('Борьба с бессонницей усиливает её');
        keyTakeaways.push('Готовность — это не желание, а открытость опыту');
        break;
      case 'cognitive_defusion':
        keyTakeaways.push('Мысли — это не факты, а просто мысли');
        keyTakeaways.push('Вы можете наблюдать мысли, не сливаясь с ними');
        break;
      case 'values':
        keyTakeaways.push('Качество жизни важнее количества сна');
        keyTakeaways.push('Ценности — это компас, а не пункт назначения');
        break;
      case 'committed_action':
        keyTakeaways.push('Действия, основанные на ценностях, придают жизни смысл');
        keyTakeaways.push('Маленькие шаги каждый день важнее больших планов');
        break;
    }

    // Add practice exercises
    practiceExercises.push(...currentSession.homeExperiments);

    return {
      keyTakeaways,
      practiceExercises,
      nextSessionPreview: `Следующая сессия: ${nextSession.theme}`,
    };
  }

  /**
   * Generate action for value domain
   */
  private generateActionForDomain(domain: string, importance: number): ICommittedAction {
    const actions: Record<string, string> = {
      health: 'Сделать 10-минутную прогулку, даже если устал',
      relationships: 'Позвонить близкому человеку, несмотря на усталость',
      work: 'Выполнить одну важную задачу с полным присутствием',
      leisure: 'Уделить 15 минут хобби без отговорок о сне',
      personal_growth: 'Прочитать 5 страниц или послушать подкаст',
    };

    return {
      id: `action_${domain}_${Date.now()}`,
      action: actions[domain] || 'Сделать что-то значимое',
      linkedValue: domain,
      frequency: 'daily',
      startDate: new Date().toISOString().split('T')[0],
      completed: [],
      barriers: [],
      adjustments: [],
    };
  }
}
