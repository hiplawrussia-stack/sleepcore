/**
 * 📖 NARRATIVE STATE INTERFACE
 * ============================
 * Personal Story Arc Tracking - WORLD-FIRST Innovation
 * Человек как герой собственной истории изменений
 *
 * Scientific Foundation:
 * - Transtheoretical Model of Change (Prochaska & DiClemente, 1983)
 * - Narrative Identity Theory (McAdams, 2001)
 * - Hero's Journey (Campbell, 1949)
 * - Narrative Therapy (White & Epston, 1990)
 *
 * Unique Innovation:
 * - Tracking personal transformation journey
 * - Role evolution (victim → survivor → hero)
 * - Breakthrough/setback momentum
 * - Story arc prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

/**
 * Stages of Change (Transtheoretical Model)
 * Enhanced with therapeutic context
 */
export type ChangeStage =
  | 'precontemplation'  // Not aware of problem / not ready
  | 'contemplation'     // Aware, considering change
  | 'preparation'       // Ready to take action
  | 'action'            // Actively making changes
  | 'maintenance'       // Sustaining new behavior
  | 'relapse';          // Returned to old patterns

/**
 * Narrative role in personal story
 * Based on archetypal journey
 */
export type NarrativeRole =
  | 'victim'      // Feeling powerless, things happen TO them
  | 'survivor'    // Enduring, coping, getting through
  | 'explorer'    // Seeking new paths, curious
  | 'hero'        // Taking active control, overcoming
  | 'mentor';     // Helping others, wisdom gained

/**
 * Significant moment in the narrative
 */
export interface NarrativeMoment {
  readonly id: string;
  readonly type: 'breakthrough' | 'setback' | 'insight' | 'challenge' | 'milestone';
  readonly description: string;
  readonly emotionalImpact: number;     // -1.0 to +1.0
  readonly significance: number;        // 0.0 to 1.0
  readonly timestamp: Date;
  readonly triggeredBy?: string;        // What caused this moment
  readonly lessonsLearned?: string[];   // User's reflections
  readonly linkedToStage?: ChangeStage; // Which stage it affected
}

/**
 * Story chapter (time period)
 */
export interface NarrativeChapter {
  readonly id: string;
  readonly title: string;              // Auto-generated or user-defined
  readonly startDate: Date;
  readonly endDate?: Date;             // null = current chapter
  readonly dominantStage: ChangeStage;
  readonly dominantRole: NarrativeRole;
  readonly keyMoments: NarrativeMoment[];
  readonly overallTone: 'dark' | 'struggling' | 'neutral' | 'hopeful' | 'triumphant';
  readonly summary?: string;           // AI-generated summary
}

/**
 * Personal values and meaning
 */
export interface PersonalValues {
  readonly identified: Array<{
    readonly value: string;
    readonly importance: number;      // 0.0 - 1.0
    readonly currentAlignment: number; // How aligned actions are with value
    readonly examples: string[];      // Moments demonstrating value
  }>;
  readonly meaningSource: 'relationships' | 'achievement' | 'growth' | 'contribution' | 'experience' | 'mixed';
  readonly purposeClarity: number;    // 0.0 - 1.0
}

/**
 * Narrative themes (recurring patterns)
 */
export interface NarrativeTheme {
  readonly theme: string;
  readonly frequency: number;         // How often appears
  readonly valence: number;           // -1.0 to +1.0
  readonly evolution: 'intensifying' | 'stable' | 'resolving' | 'dormant';
  readonly examples: string[];
}

/**
 * Future projection (where story is heading)
 */
export interface NarrativeProjection {
  readonly predictedStage: ChangeStage;
  readonly predictedRole: NarrativeRole;
  readonly confidence: number;
  readonly timeframe: 'short' | 'medium' | 'long';  // weeks / months / quarters
  readonly optimisticScenario: string;
  readonly realisticScenario: string;
  readonly pessimisticScenario: string;
  readonly keyFactors: string[];      // What will determine outcome
}

/**
 * Momentum indicator
 */
export interface NarrativeMomentum {
  /**
   * Overall direction of change (-1.0 to +1.0)
   * Negative = moving toward relapse
   * Positive = moving toward growth
   */
  readonly direction: number;

  /**
   * Speed of change (0.0 to 1.0)
   * Low = slow, gradual
   * High = rapid transformation
   */
  readonly velocity: number;

  /**
   * Stability of momentum (0.0 to 1.0)
   * Low = erratic, unpredictable
   * High = consistent trajectory
   */
  readonly stability: number;

  /**
   * Factors accelerating positive change
   */
  readonly accelerators: string[];

  /**
   * Factors slowing or reversing progress
   */
  readonly barriers: string[];
}

/**
 * Stage transition probability
 */
export interface StageTransition {
  readonly fromStage: ChangeStage;
  readonly toStage: ChangeStage;
  readonly probability: number;       // 0.0 - 1.0
  readonly estimatedTimeframe: number; // days
  readonly requiredConditions: string[];
  readonly riskFactors: string[];
}

/**
 * 📖 Main Narrative State Interface
 * Core component of State Vector S_t (n_t)
 */
export interface INarrativeState {
  /**
   * Current stage in change process
   */
  readonly stage: ChangeStage;

  /**
   * Days spent in current stage
   */
  readonly daysInCurrentStage: number;

  /**
   * Stage transition history
   */
  readonly stageHistory: Array<{
    readonly stage: ChangeStage;
    readonly enteredAt: Date;
    readonly exitedAt?: Date;
    readonly duration: number;  // days
  }>;

  /**
   * Current narrative role
   */
  readonly role: NarrativeRole;

  /**
   * Role evolution history
   */
  readonly roleHistory: Array<{
    readonly role: NarrativeRole;
    readonly startedAt: Date;
    readonly endedAt?: Date;
    readonly trigger?: string;
  }>;

  /**
   * Overall progress percentage (0-100)
   * Composite of stage progress and role evolution
   */
  readonly progressPercent: number;

  /**
   * Key breakthrough moments
   */
  readonly breakthroughs: NarrativeMoment[];

  /**
   * Setback moments
   */
  readonly setbacks: NarrativeMoment[];

  /**
   * Current narrative momentum
   */
  readonly momentum: NarrativeMomentum;

  /**
   * Story chapters (major periods)
   */
  readonly chapters: NarrativeChapter[];

  /**
   * Current chapter
   */
  readonly currentChapter: NarrativeChapter;

  /**
   * Recurring themes in narrative
   */
  readonly themes: NarrativeTheme[];

  /**
   * Personal values and meaning
   */
  readonly values: PersonalValues;

  /**
   * Future projections
   */
  readonly projections: NarrativeProjection[];

  /**
   * Likely stage transitions
   */
  readonly possibleTransitions: StageTransition[];

  /**
   * Timestamp of this state
   */
  readonly timestamp: Date;

  /**
   * Confidence in assessment
   */
  readonly confidence: number;

  /**
   * Data quality
   */
  readonly dataQuality: number;
}

/**
 * Narrative State Builder
 */
export interface INarrativeStateBuilder {
  setStage(stage: ChangeStage, daysIn: number): this;
  setRole(role: NarrativeRole): this;
  addBreakthrough(moment: NarrativeMoment): this;
  addSetback(moment: NarrativeMoment): this;
  setMomentum(momentum: NarrativeMomentum): this;
  addChapter(chapter: NarrativeChapter): this;
  addTheme(theme: NarrativeTheme): this;
  setValues(values: PersonalValues): this;
  addProjection(projection: NarrativeProjection): this;
  build(): INarrativeState;
}

/**
 * Narrative State Factory
 */
export interface INarrativeStateFactory {
  /**
   * Create from conversation history analysis
   */
  fromConversationHistory(
    messages: Array<{ text: string; timestamp: Date }>,
    previousState?: INarrativeState
  ): Promise<INarrativeState>;

  /**
   * Create from self-reported stage
   */
  fromSelfReport(
    reportedStage: ChangeStage,
    previousState?: INarrativeState
  ): Promise<INarrativeState>;

  /**
   * Create initial state for new user
   */
  createInitial(): INarrativeState;

  /**
   * Record breakthrough moment
   */
  recordBreakthrough(
    currentState: INarrativeState,
    description: string,
    emotionalImpact: number
  ): INarrativeState;

  /**
   * Record setback moment
   */
  recordSetback(
    currentState: INarrativeState,
    description: string,
    emotionalImpact: number
  ): INarrativeState;

  /**
   * Update stage based on new evidence
   */
  updateStage(
    currentState: INarrativeState,
    evidenceForChange: string[]
  ): INarrativeState;
}

/**
 * Narrative Analyzer Interface
 */
export interface INarrativeAnalyzer {
  /**
   * Detect stage from text
   */
  detectStage(text: string): Promise<{
    stage: ChangeStage;
    confidence: number;
    evidence: string[];
  }>;

  /**
   * Detect role from text
   */
  detectRole(text: string): Promise<{
    role: NarrativeRole;
    confidence: number;
    evidence: string[];
  }>;

  /**
   * Identify narrative themes
   */
  identifyThemes(
    texts: string[]
  ): Promise<NarrativeTheme[]>;

  /**
   * Predict next stage transition
   */
  predictTransition(
    currentState: INarrativeState
  ): Promise<StageTransition[]>;

  /**
   * Generate chapter summary
   */
  generateChapterSummary(
    moments: NarrativeMoment[],
    timeframe: { start: Date; end: Date }
  ): Promise<string>;
}

/**
 * Stage characteristics and indicators
 */
export const STAGE_CHARACTERISTICS: Record<ChangeStage, {
  description: string;
  typicalDuration: { min: number; max: number };  // days
  indicators: string[];
  languagePatterns: string[];
  therapeuticFocus: string[];
  movingForward: string[];
  riskOfStagnation: string[];
}> = {
  precontemplation: {
    description: 'Не осознаёт проблему или не готов к изменениям',
    typicalDuration: { min: 30, max: 180 },
    indicators: [
      'Отрицание проблемы',
      'Защитные реакции',
      'Внешняя атрибуция',
      'Нежелание обсуждать тему'
    ],
    languagePatterns: [
      'у меня нет проблем',
      'всё нормально',
      'это не моё дело',
      'другие преувеличивают'
    ],
    therapeuticFocus: [
      'Повышение осознанности',
      'Мотивационное интервью',
      'Информирование без давления'
    ],
    movingForward: [
      'Признание небольших трудностей',
      'Интерес к информации',
      'Снижение защит'
    ],
    riskOfStagnation: [
      'Социальная изоляция',
      'Отсутствие внешней обратной связи',
      'Подкрепление проблемного поведения'
    ]
  },
  contemplation: {
    description: 'Осознаёт проблему, рассматривает возможность изменений',
    typicalDuration: { min: 30, max: 120 },
    indicators: [
      'Амбивалентность',
      'Взвешивание за и против',
      'Интерес к опыту других',
      'Самоанализ'
    ],
    languagePatterns: [
      'может быть',
      'не уверен',
      'с одной стороны... с другой',
      'думаю об этом'
    ],
    therapeuticFocus: [
      'Решение амбивалентности',
      'Усиление мотивации',
      'Работа с ценностями'
    ],
    movingForward: [
      'Снижение амбивалентности',
      'Формирование намерения',
      'Поиск ресурсов'
    ],
    riskOfStagnation: [
      'Хроническое размышление',
      'Страх изменений',
      'Отсутствие поддержки'
    ]
  },
  preparation: {
    description: 'Готов к действию, планирует изменения',
    typicalDuration: { min: 7, max: 30 },
    indicators: [
      'Конкретное планирование',
      'Поиск ресурсов',
      'Маленькие шаги',
      'Публичные обязательства'
    ],
    languagePatterns: [
      'собираюсь',
      'планирую',
      'на следующей неделе',
      'нужно найти'
    ],
    therapeuticFocus: [
      'Конкретизация плана',
      'Устранение барьеров',
      'Мобилизация ресурсов'
    ],
    movingForward: [
      'Первые конкретные шаги',
      'Поддержка окружения',
      'Ясный план'
    ],
    riskOfStagnation: [
      'Перфекционизм в планировании',
      'Откладывание',
      'Отсутствие конкретности'
    ]
  },
  action: {
    description: 'Активно меняет поведение',
    typicalDuration: { min: 90, max: 180 },
    indicators: [
      'Видимые изменения поведения',
      'Преодоление трудностей',
      'Активное использование стратегий',
      'Энтузиазм'
    ],
    languagePatterns: [
      'я делаю',
      'получается',
      'сложно, но',
      'сегодня я'
    ],
    therapeuticFocus: [
      'Поддержка изменений',
      'Предотвращение рецидива',
      'Укрепление новых привычек'
    ],
    movingForward: [
      'Стабильность изменений',
      'Снижение усилий',
      'Автоматизация'
    ],
    riskOfStagnation: [
      'Выгорание',
      'Нереалистичные ожидания',
      'Отсутствие поддержки'
    ]
  },
  maintenance: {
    description: 'Поддерживает изменения, предотвращает возврат',
    typicalDuration: { min: 180, max: 730 },
    indicators: [
      'Стабильное новое поведение',
      'Уверенность',
      'Снижение соблазнов',
      'Интеграция в жизнь'
    ],
    languagePatterns: [
      'привык',
      'теперь это моё',
      'уже не представляю иначе',
      'помогает мне'
    ],
    therapeuticFocus: [
      'Профилактика рецидива',
      'Углубление изменений',
      'Расширение на другие области'
    ],
    movingForward: [
      'Помощь другим',
      'Новые цели',
      'Глубокая трансформация'
    ],
    riskOfStagnation: [
      'Самоуспокоенность',
      'Стресс',
      'Жизненные кризисы'
    ]
  },
  relapse: {
    description: 'Возврат к прежнему поведению',
    typicalDuration: { min: 7, max: 90 },
    indicators: [
      'Возврат старых паттернов',
      'Разочарование',
      'Самокритика',
      'Избегание'
    ],
    languagePatterns: [
      'сорвался',
      'не получилось',
      'бесполезно',
      'снова'
    ],
    therapeuticFocus: [
      'Нормализация',
      'Анализ без осуждения',
      'Быстрое возвращение к действию'
    ],
    movingForward: [
      'Принятие как части процесса',
      'Анализ триггеров',
      'Возобновление действий'
    ],
    riskOfStagnation: [
      'Стыд и самообвинение',
      'Отказ от попыток',
      'Потеря надежды'
    ]
  }
};

/**
 * Role characteristics
 */
export const ROLE_CHARACTERISTICS: Record<NarrativeRole, {
  description: string;
  languagePatterns: string[];
  typicalEmotions: string[];
  growthDirection: NarrativeRole;
  therapeuticApproach: string;
}> = {
  victim: {
    description: 'Ощущает себя жертвой обстоятельств',
    languagePatterns: ['со мной это случилось', 'я не могу', 'они сделали мне', 'это несправедливо'],
    typicalEmotions: ['helplessness', 'anger', 'sadness', 'resentment'],
    growthDirection: 'survivor',
    therapeuticApproach: 'Validation + empowerment'
  },
  survivor: {
    description: 'Справляется, выживает, держится',
    languagePatterns: ['справляюсь', 'держусь', 'переживу', 'терплю'],
    typicalEmotions: ['resilience', 'fatigue', 'determination', 'hope'],
    growthDirection: 'explorer',
    therapeuticApproach: 'Recognize strength + build agency'
  },
  explorer: {
    description: 'Ищет новые пути, экспериментирует',
    languagePatterns: ['пробую', 'интересно', 'может быть', 'хочу узнать'],
    typicalEmotions: ['curiosity', 'uncertainty', 'excitement', 'openness'],
    growthDirection: 'hero',
    therapeuticApproach: 'Support exploration + celebrate attempts'
  },
  hero: {
    description: 'Берёт ответственность, преодолевает',
    languagePatterns: ['я решил', 'я делаю', 'у меня получится', 'я выбираю'],
    typicalEmotions: ['empowerment', 'confidence', 'determination', 'pride'],
    growthDirection: 'mentor',
    therapeuticApproach: 'Strengthen identity + prepare for challenges'
  },
  mentor: {
    description: 'Помогает другим на основе своего опыта',
    languagePatterns: ['я понимаю', 'могу помочь', 'знаю как', 'расскажу'],
    typicalEmotions: ['wisdom', 'compassion', 'fulfillment', 'generativity'],
    growthDirection: 'mentor',  // Peak role
    therapeuticApproach: 'Support generativity + maintain growth'
  }
};

/**
 * Stage transition probabilities (empirical data)
 */
export const STAGE_TRANSITIONS: Record<ChangeStage, Record<ChangeStage, number>> = {
  precontemplation: {
    precontemplation: 0.7,
    contemplation: 0.25,
    preparation: 0.03,
    action: 0.01,
    maintenance: 0.01,
    relapse: 0.0
  },
  contemplation: {
    precontemplation: 0.1,
    contemplation: 0.5,
    preparation: 0.3,
    action: 0.08,
    maintenance: 0.01,
    relapse: 0.01
  },
  preparation: {
    precontemplation: 0.05,
    contemplation: 0.15,
    preparation: 0.3,
    action: 0.45,
    maintenance: 0.03,
    relapse: 0.02
  },
  action: {
    precontemplation: 0.05,
    contemplation: 0.1,
    preparation: 0.1,
    action: 0.35,
    maintenance: 0.25,
    relapse: 0.15
  },
  maintenance: {
    precontemplation: 0.02,
    contemplation: 0.03,
    preparation: 0.05,
    action: 0.1,
    maintenance: 0.65,
    relapse: 0.15
  },
  relapse: {
    precontemplation: 0.15,
    contemplation: 0.35,
    preparation: 0.25,
    action: 0.15,
    maintenance: 0.05,
    relapse: 0.05
  }
};
