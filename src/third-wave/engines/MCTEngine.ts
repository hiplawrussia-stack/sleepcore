/**
 * MCTEngine - Metacognitive Therapy for Insomnia
 * ================================================
 * Implementation of Adrian Wells' Metacognitive Therapy adapted for insomnia.
 *
 * Research Foundation (2025-2026):
 * - Wells (2009): Metacognitive Therapy for Anxiety and Depression
 * - Palagini et al. (2017): Metacognitive beliefs in insomnia
 * - Ong & Moore (2020): Metacognitive processes in sleep
 * - Harvey (2002): Cognitive model of insomnia (metacognitive elements)
 *
 * Key MCT Principles:
 * 1. Problem is not thoughts, but relationship to thoughts
 * 2. Worry/rumination are strategies, not automatic processes
 * 3. Metacognitive beliefs maintain the problem
 * 4. Detached mindfulness ≠ meditation mindfulness
 *
 * Core Techniques:
 * - Worry Postponement: Schedule worry for later
 * - Detached Mindfulness: Observe thoughts without engagement
 * - Attention Training Technique (ATT): Strengthen attention flexibility
 * - Challenging Metacognitions: Target beliefs about thoughts
 *
 * © БФ "Другой путь", 2025-2026
 *
 * @packageDocumentation
 * @module @sleepcore/third-wave
 */

import type {
  IMCTEngine,
  IMCTPlan,
  IMCTSession,
  IMetacognitiveBeliefs,
  IWorryPattern,
  IWorryPostponementRecord,
  IATTSession,
  MCTTechnique,
} from '../interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * MCT session protocol
 * Adapted from Wells' generalized protocol for insomnia
 */
const MCT_SESSION_PROTOCOL: Omit<IMCTSession, 'sessionId'>[] = [
  {
    sessionNumber: 1,
    theme: 'Знакомство с метакогнитивной моделью',
    objectives: [
      'Понять разницу между мыслями и метакогнициями',
      'Идентифицировать паттерны беспокойства о сне',
      'Установить базовые метакогнитивные убеждения',
    ],
    primaryTechnique: 'metacognitive_awareness',
    secondaryTechniques: [],
    exercises: [
      'Вечерний мониторинг беспокойства',
      'Различение мыслей и метамыслей',
    ],
    homeExperiments: [
      'Записывать триггеры беспокойства перед сном',
      'Отмечать убеждения о необходимости беспокоиться',
    ],
    duration: 50,
  },
  {
    sessionNumber: 2,
    theme: 'Откладывание беспокойства',
    objectives: [
      'Освоить технику откладывания беспокойства',
      'Понять, что беспокойство — это стратегия, а не автоматизм',
      'Начать практику откладывания',
    ],
    primaryTechnique: 'worry_postponement',
    secondaryTechniques: ['metacognitive_awareness'],
    exercises: [
      'Откладывание беспокойства на "время для беспокойства"',
      'Установка фиксированного времени для беспокойства днём',
    ],
    homeExperiments: [
      'Практиковать откладывание всех ночных беспокойств',
      'Вести дневник откладывания беспокойства',
    ],
    duration: 50,
  },
  {
    sessionNumber: 3,
    theme: 'Отстранённая осознанность',
    objectives: [
      'Освоить отстранённую осознанность (detached mindfulness)',
      'Научиться наблюдать мысли без вовлечения',
      'Применять к мыслям о сне',
    ],
    primaryTechnique: 'detached_mindfulness',
    secondaryTechniques: ['worry_postponement'],
    exercises: [
      'Метафора "облака в небе"',
      'Наблюдение за мыслями как за поездом',
      'Практика "позволения" мыслям быть',
    ],
    homeExperiments: [
      'Применять отстранённую осознанность к ночным мыслям',
      'Практиковать днём на нейтральных мыслях',
    ],
    duration: 50,
  },
  {
    sessionNumber: 4,
    theme: 'Тренировка внимания (ATT)',
    objectives: [
      'Освоить технику тренировки внимания',
      'Развить гибкость внимания',
      'Уменьшить фиксацию на мыслях о сне',
    ],
    primaryTechnique: 'attention_training',
    secondaryTechniques: ['detached_mindfulness'],
    exercises: [
      'Селективное внимание к звукам',
      'Переключение внимания между источниками',
      'Разделённое внимание',
    ],
    homeExperiments: [
      'Ежедневная практика ATT 12-15 минут',
      'Применять гибкость внимания при засыпании',
    ],
    duration: 50,
  },
  {
    sessionNumber: 5,
    theme: 'Работа с метакогнитивными убеждениями',
    objectives: [
      'Идентифицировать метакогнитивные убеждения о беспокойстве',
      'Оспорить убеждения через эксперименты',
      'Сформировать новые метакогнитивные установки',
    ],
    primaryTechnique: 'challenging_metacognitions',
    secondaryTechniques: ['worry_postponement', 'detached_mindfulness'],
    exercises: [
      'Сократовский диалог о пользе беспокойства',
      'Эксперимент: что будет, если не буду беспокоиться?',
      'Анализ преимуществ и недостатков беспокойства',
    ],
    homeExperiments: [
      'Поведенческий эксперимент с отказом от беспокойства',
      'Записывать доказательства против метакогнитивных убеждений',
    ],
    duration: 50,
  },
  {
    sessionNumber: 6,
    theme: 'Работа с руминацией',
    objectives: [
      'Различать беспокойство и руминацию',
      'Применять MCT-техники к руминации',
      'Уменьшить утреннюю руминацию о качестве сна',
    ],
    primaryTechnique: 'rumination_postponement',
    secondaryTechniques: ['detached_mindfulness', 'attention_training'],
    exercises: [
      'Откладывание руминации',
      'Метакогнитивный анализ руминации',
      'Переключение с "анализа" на "действие"',
    ],
    homeExperiments: [
      'Практиковать откладывание утренней руминации о сне',
      'Заменять руминацию конкретными действиями',
    ],
    duration: 50,
  },
  {
    sessionNumber: 7,
    theme: 'Интеграция и закрепление',
    objectives: [
      'Интегрировать все техники',
      'Создать персональный план управления',
      'Подготовиться к самостоятельной практике',
    ],
    primaryTechnique: 'metacognitive_awareness',
    secondaryTechniques: ['worry_postponement', 'detached_mindfulness', 'attention_training'],
    exercises: [
      'Обзор прогресса',
      'Создание "плана на рецидив"',
      'Практика полного цикла техник',
    ],
    homeExperiments: [
      'Самостоятельное применение техник',
      'Мониторинг без терапевтической поддержки',
    ],
    duration: 50,
  },
  {
    sessionNumber: 8,
    theme: 'Профилактика рецидива',
    objectives: [
      'Закрепить навыки',
      'Обсудить стратегии при ухудшении',
      'Завершить терапию',
    ],
    primaryTechnique: 'metacognitive_awareness',
    secondaryTechniques: ['challenging_metacognitions'],
    exercises: [
      'Ревизия метакогнитивных изменений',
      'План действий при возвращении симптомов',
      'Закрепление нового отношения к мыслям',
    ],
    homeExperiments: [
      'Продолжать ATT как профилактику',
      'Применять техники при первых признаках беспокойства',
    ],
    duration: 50,
  },
];

/**
 * Detached mindfulness metaphors (Russian)
 */
const DETACHED_MINDFULNESS_METAPHORS: Record<string, { metaphor: string; instructions: string[] }> = {
  clouds: {
    metaphor: 'Облака в небе',
    instructions: [
      'Представь своё сознание как небо — безграничное и спокойное',
      'Мысли — это облака, которые проплывают мимо',
      'Ты не небо становишься облаком, и облако не меняет небо',
      'Просто наблюдай, как мысли появляются и уходят',
      'Не нужно останавливать облака или разгонять их — они уйдут сами',
    ],
  },
  train: {
    metaphor: 'Поезд на станции',
    instructions: [
      'Представь, что ты на платформе вокзала',
      'Мысли — это поезда, которые прибывают и отбывают',
      'Ты можешь видеть поезд, не садясь в него',
      'Заметь мысль: "Вот поезд беспокойства прибыл"',
      'Позволь ему уехать, оставаясь на платформе',
    ],
  },
  river: {
    metaphor: 'Листья на реке',
    instructions: [
      'Представь, что сидишь на берегу реки',
      'Мысли — это листья, плывущие по воде',
      'Положи каждую мысль на лист',
      'Наблюдай, как она уплывает вниз по течению',
      'Не нужно ловить листья или останавливать реку',
    ],
  },
  radio: {
    metaphor: 'Радио в соседней комнате',
    instructions: [
      'Представь, что в соседней комнате играет радио',
      'Ты слышишь его, но не обязан слушать внимательно',
      'Мысли — как это фоновое радио',
      'Можно осознавать их присутствие, не вовлекаясь',
      'Громкость может меняться, но это не требует твоего внимания',
    ],
  },
};

/**
 * ATT instructions by phase
 */
const ATT_INSTRUCTIONS: Record<'selective' | 'switching' | 'divided', string[]> = {
  selective: [
    'Сядь удобно, закрой глаза',
    'Выбери один звук в комнате и сосредоточься только на нём',
    'Удерживай внимание на этом звуке 2-3 минуты',
    'Если внимание уходит — мягко верни его к выбранному звуку',
    'Постарайся слышать этот звук максимально детально',
  ],
  switching: [
    'Теперь переключай внимание между разными звуками',
    'Выбери 3-4 источника звука',
    'Удерживай внимание на каждом по 10-15 секунд',
    'Затем переключайся на следующий звук',
    'Практикуй плавное, контролируемое переключение',
  ],
  divided: [
    'Теперь попробуй удерживать внимание на всех звуках одновременно',
    'Расширь своё внимание, охватывая всё звуковое пространство',
    'Слушай все звуки вместе, как оркестр',
    'Это самая сложная часть — будь терпелив',
    'Практикуй широкое, панорамное внимание',
  ],
};

// ============================================================================
// MCT ENGINE IMPLEMENTATION
// ============================================================================

/**
 * MCT Engine Implementation
 */
export class MCTEngine implements IMCTEngine {
  /**
   * Initialize MCT treatment plan
   */
  initializePlan(userId: string, baselineAssessment: ISleepState[]): IMCTPlan {
    const latestState = baselineAssessment[baselineAssessment.length - 1];
    const beliefsBaseline = this.assessMetacognitiveBeliefs(latestState);
    const firstSession = this.createSession(1);

    return {
      userId,
      startDate: new Date().toISOString(),
      currentSession: 1,
      totalSessions: 8,
      sessionDetails: firstSession,
      completedSessions: [],
      beliefsBaseline,
      beliefsCurrent: beliefsBaseline,
      worryPatterns: [],
      worryPostponementLog: [],
      attLog: [],
      detachedMindfulnessLevel: 0.2, // Initial low level
      progress: {
        metacognitiveAwarenessChange: 0,
        worryReduction: 0,
        ruminationReduction: 0,
        isiChange: 0,
        sleepEfficiencyChange: 0,
      },
    };
  }

  /**
   * Get current session
   */
  getCurrentSession(plan: IMCTPlan): IMCTSession {
    return plan.sessionDetails;
  }

  /**
   * Assess metacognitive beliefs from sleep state
   */
  assessMetacognitiveBeliefs(sleepState: ISleepState): IMetacognitiveBeliefs {
    const cognitions = sleepState.cognitions;

    // Map sleep cognitions to metacognitive beliefs
    // These are approximations based on available data
    return {
      // Positive worry beliefs: "I need to worry to prepare for bad sleep"
      positiveWorryBeliefs: Math.min(1, cognitions.preSleepArousal * 0.8 + 0.1),

      // Uncontrollability/danger: "My thoughts about sleep are uncontrollable"
      uncontrollabilityDanger: Math.min(1,
        (cognitions.beliefs.catastrophizing ? 0.4 : 0) +
        (cognitions.beliefs.helplessness ? 0.4 : 0) +
        (1 - cognitions.sleepSelfEfficacy) * 0.2
      ),

      // Cognitive confidence: inverse of self-efficacy
      cognitiveConfidence: 1 - cognitions.sleepSelfEfficacy,

      // Need to control thoughts: effort-based thinking
      needToControl: cognitions.beliefs.effortfulSleep ? 0.8 : 0.3,

      // Cognitive self-consciousness: monitoring thoughts
      cognitiveSelfConsciousness: cognitions.sleepAnxiety,
    };
  }

  /**
   * Identify worry patterns from user text
   */
  identifyWorryPatterns(
    userText: string,
    context: 'pre_sleep' | 'during_night' | 'morning' | 'daytime'
  ): IWorryPattern[] {
    const patterns: IWorryPattern[] = [];
    const lowerText = userText.toLowerCase();

    // Worry indicators
    const worryKeywords = [
      'а вдруг', 'что если', 'беспокоюсь', 'волнуюсь', 'боюсь',
      'не смогу', 'завтра', 'работа', 'устану',
    ];

    // Rumination indicators
    const ruminationKeywords = [
      'почему', 'опять', 'всегда', 'никогда', 'что не так',
      'как обычно', 'снова', 'вчера',
    ];

    // Check for worry
    const isWorry = worryKeywords.some(kw => lowerText.includes(kw));
    const isRumination = ruminationKeywords.some(kw => lowerText.includes(kw));

    if (isWorry) {
      patterns.push({
        content: userText,
        context,
        frequency: 1,
        duration: 15,
        controllability: 0.3,
        distress: 0.6,
        type: 'worry',
      });
    }

    if (isRumination) {
      patterns.push({
        content: userText,
        context,
        frequency: 1,
        duration: 20,
        controllability: 0.2,
        distress: 0.5,
        type: 'rumination',
      });
    }

    // Default if no specific pattern found
    if (patterns.length === 0 && userText.length > 10) {
      patterns.push({
        content: userText,
        context,
        frequency: 1,
        duration: 10,
        controllability: 0.5,
        distress: 0.4,
        type: 'worry',
      });
    }

    return patterns;
  }

  /**
   * Get worry postponement exercise
   */
  getWorryPostponementExercise(worryPattern: IWorryPattern): {
    instructions: string[];
    postponeToTime: string;
    worryPeriodDuration: number;
    tips: string[];
  } {
    // Calculate postpone time (next day 18:00 if night, same day 18:00 if day)
    const now = new Date();
    const postponeDate = new Date(now);

    if (worryPattern.context === 'pre_sleep' || worryPattern.context === 'during_night') {
      postponeDate.setDate(postponeDate.getDate() + 1);
    }
    postponeDate.setHours(18, 0, 0, 0);

    return {
      instructions: [
        `Заметь беспокойство: "${worryPattern.content.slice(0, 50)}..."`,
        'Скажи себе: "Это беспокойство. Я замечаю его."',
        'Отложи его: "Я подумаю об этом в своё время для беспокойства"',
        `Запиши кратко в блокнот, чтобы не забыть`,
        'Верни внимание к настоящему моменту',
        'Если беспокойство возвращается — повтори процесс',
      ],
      postponeToTime: postponeDate.toISOString(),
      worryPeriodDuration: 15, // 15-minute worry period
      tips: [
        'Не борись с беспокойством — просто откладывай',
        'Фиксированное время для беспокойства даёт контроль',
        'Многие беспокойства теряют силу к назначенному времени',
        'Если в "время для беспокойства" тема не важна — это успех!',
      ],
    };
  }

  /**
   * Get detached mindfulness exercise
   */
  getDetachedMindfulnessExercise(
    trigger: 'racing_thoughts' | 'worry' | 'rumination' | 'sleep_anxiety'
  ): {
    instructions: string[];
    metaphor: string;
    duration: number;
  } {
    // Select appropriate metaphor based on trigger
    const metaphorKey = trigger === 'racing_thoughts' ? 'train' :
                       trigger === 'worry' ? 'clouds' :
                       trigger === 'rumination' ? 'river' : 'radio';

    const metaphorData = DETACHED_MINDFULNESS_METAPHORS[metaphorKey];

    const baseInstructions = [
      'Отстранённая осознанность — это НЕ медитация',
      'Цель — наблюдать мысли, не вовлекаясь в них',
      'Не нужно расслабляться или менять мысли',
      '',
      `Метафора: ${metaphorData.metaphor}`,
      '',
      ...metaphorData.instructions,
      '',
      'Помни: ты — наблюдатель, а не участник',
    ];

    return {
      instructions: baseInstructions,
      metaphor: metaphorData.metaphor,
      duration: 5,
    };
  }

  /**
   * Get ATT session
   */
  getATTSession(
    phase: 'selective' | 'switching' | 'divided',
    _duration: number
  ): {
    instructions: string[];
    audioUrl?: string;
    tips: string[];
  } {
    const phaseInstructions = ATT_INSTRUCTIONS[phase];

    const introduction = [
      'Тренировка внимания (ATT) развивает гибкость внимания',
      'Это не релаксация — это упражнение для "мышц" внимания',
      `Фаза: ${phase === 'selective' ? 'Селективное внимание' :
              phase === 'switching' ? 'Переключение внимания' : 'Разделённое внимание'}`,
      '',
    ];

    return {
      instructions: [...introduction, ...phaseInstructions],
      tips: [
        'Практикуй ежедневно по 12-15 минут',
        'Лучшее время — днём, не перед сном',
        'Отвлечение — это нормально, просто возвращай внимание',
        'Со временем гибкость внимания улучшится',
        'Это поможет "отпускать" мысли о сне',
      ],
    };
  }

  /**
   * Record worry postponement practice
   */
  recordWorryPostponement(
    plan: IMCTPlan,
    record: IWorryPostponementRecord
  ): IMCTPlan {
    const newLog = [...plan.worryPostponementLog, record];

    // Calculate worry reduction based on practice
    const successfulPostponements = newLog.filter(r => r.completed).length;
    const worryReduction = Math.min(0.8, successfulPostponements * 0.1);

    return {
      ...plan,
      worryPostponementLog: newLog,
      progress: {
        ...plan.progress,
        worryReduction: worryReduction * 100,
      },
    };
  }

  /**
   * Record ATT session
   */
  recordATTSession(plan: IMCTPlan, session: IATTSession): IMCTPlan {
    const newLog = [...plan.attLog, session];

    // Calculate metacognitive awareness improvement
    const completedSessions = newLog.filter(s => s.completedSuccessfully).length;
    const awarenessChange = Math.min(0.6, completedSessions * 0.05);

    return {
      ...plan,
      attLog: newLog,
      progress: {
        ...plan.progress,
        metacognitiveAwarenessChange: awarenessChange * 100,
      },
    };
  }

  /**
   * Update plan based on progress
   */
  updatePlan(plan: IMCTPlan, recentStates: ISleepState[]): IMCTPlan {
    if (recentStates.length === 0) return plan;

    const latestState = recentStates[recentStates.length - 1];
    const beliefsCurrent = this.assessMetacognitiveBeliefs(latestState);

    // Calculate changes
    const beliefChange = this.calculateBeliefChange(plan.beliefsBaseline, beliefsCurrent);
    const isiChange = plan.beliefsBaseline.uncontrollabilityDanger > beliefsCurrent.uncontrollabilityDanger
      ? -Math.round((plan.beliefsBaseline.uncontrollabilityDanger - beliefsCurrent.uncontrollabilityDanger) * 10)
      : 0;

    // Advance session if current is complete
    const shouldAdvance = plan.completedSessions.length >= plan.currentSession;
    const nextSession = shouldAdvance && plan.currentSession < plan.totalSessions
      ? plan.currentSession + 1
      : plan.currentSession;

    return {
      ...plan,
      beliefsCurrent,
      currentSession: nextSession,
      sessionDetails: this.createSession(nextSession),
      detachedMindfulnessLevel: Math.min(1, plan.detachedMindfulnessLevel + beliefChange * 0.1),
      progress: {
        ...plan.progress,
        metacognitiveAwarenessChange: beliefChange * 100,
        isiChange,
      },
    };
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(plan: IMCTPlan): {
    keyTakeaways: string[];
    homeExperiments: string[];
    nextSessionPreview: string;
    progressHighlights: string[];
  } {
    const session = plan.sessionDetails;
    const progress = plan.progress;

    const keyTakeaways = [
      `Сессия ${session.sessionNumber}: ${session.theme}`,
      `Основная техника: ${this.getTechniqueNameRu(session.primaryTechnique)}`,
      ...session.objectives.slice(0, 2),
    ];

    const progressHighlights: string[] = [];
    if (progress.worryReduction > 0) {
      progressHighlights.push(`Снижение беспокойства: ${Math.round(progress.worryReduction)}%`);
    }
    if (progress.metacognitiveAwarenessChange > 0) {
      progressHighlights.push(`Рост метакогнитивного осознавания: ${Math.round(progress.metacognitiveAwarenessChange)}%`);
    }
    if (plan.worryPostponementLog.length > 0) {
      const successful = plan.worryPostponementLog.filter(r => r.completed).length;
      progressHighlights.push(`Успешных откладываний беспокойства: ${successful}`);
    }
    if (plan.attLog.length > 0) {
      progressHighlights.push(`Сессий ATT: ${plan.attLog.length}`);
    }

    const nextSession = plan.currentSession < plan.totalSessions
      ? MCT_SESSION_PROTOCOL[plan.currentSession]
      : null;

    return {
      keyTakeaways,
      homeExperiments: session.homeExperiments,
      nextSessionPreview: nextSession
        ? `Следующая сессия: ${nextSession.theme}`
        : 'Это последняя сессия курса',
      progressHighlights: progressHighlights.length > 0
        ? progressHighlights
        : ['Продолжайте практику — прогресс накапливается постепенно'],
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Create session from protocol
   */
  private createSession(sessionNumber: number): IMCTSession {
    const protocol = MCT_SESSION_PROTOCOL[sessionNumber - 1] || MCT_SESSION_PROTOCOL[0];
    return {
      sessionId: `mct-session-${sessionNumber}-${Date.now()}`,
      ...protocol,
    };
  }

  /**
   * Calculate belief change score
   */
  private calculateBeliefChange(
    baseline: IMetacognitiveBeliefs,
    current: IMetacognitiveBeliefs
  ): number {
    const changes = [
      baseline.positiveWorryBeliefs - current.positiveWorryBeliefs,
      baseline.uncontrollabilityDanger - current.uncontrollabilityDanger,
      baseline.needToControl - current.needToControl,
      current.cognitiveConfidence - baseline.cognitiveConfidence, // Higher is better here
    ];

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.max(0, avgChange);
  }

  /**
   * Get technique name in Russian
   */
  private getTechniqueNameRu(technique: MCTTechnique): string {
    const names: Record<MCTTechnique, string> = {
      worry_postponement: 'Откладывание беспокойства',
      detached_mindfulness: 'Отстранённая осознанность',
      attention_training: 'Тренировка внимания (ATT)',
      metacognitive_awareness: 'Метакогнитивное осознавание',
      challenging_metacognitions: 'Оспаривание метакогниций',
      rumination_postponement: 'Откладывание руминации',
    };
    return names[technique] || technique;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Singleton instance
 */
export const mctEngine = new MCTEngine();
