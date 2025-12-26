/**
 * 🧠 COGNITIVE STATE INTERFACE
 * ============================
 * Beck's Cognitive Model + Bayesian Belief Tracking
 * Deep Cognitive Mirror - первый в мире когнитивный трекер
 *
 * Scientific Foundation:
 * - Beck's Cognitive Triad (1967, 1979)
 * - Cognitive Distortion Theory (Burns, 1980)
 * - Bayesian Cognitive Modeling (Tenenbaum, 2011)
 * - Predictive Processing Framework (Clark, 2013)
 *
 * Unique Innovation:
 * - Real-time cognitive distortion detection
 * - Bayesian belief update tracking
 * - Core belief trajectory prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import type { EmotionType } from './IEmotionalState';

/**
 * Beck's Cognitive Triad dimensions
 * Core beliefs about self, world, and future
 * Scale: -1.0 (extremely negative) to +1.0 (extremely positive)
 */
export interface CognitiveTriad {
  /**
   * Self-view: How the person perceives themselves
   * -1.0 = "I am worthless, incompetent, unlovable"
   * +1.0 = "I am valuable, capable, lovable"
   */
  readonly selfView: number;

  /**
   * World-view: How the person perceives the world/others
   * -1.0 = "The world is hostile, unfair, dangerous"
   * +1.0 = "The world is supportive, fair, safe"
   */
  readonly worldView: number;

  /**
   * Future-view: How the person perceives the future
   * -1.0 = "The future is hopeless, nothing will change"
   * +1.0 = "The future is hopeful, things will improve"
   */
  readonly futureView: number;

  /**
   * Confidence in each belief (0.0 - 1.0)
   */
  readonly confidence: {
    readonly self: number;
    readonly world: number;
    readonly future: number;
  };
}

/**
 * Cognitive distortion types (Burns, 1980 + extensions)
 */
export type CognitiveDistortionType =
  // Classic Burns distortions
  | 'all_or_nothing'          // Black-and-white thinking
  | 'black_and_white'         // Alias for all_or_nothing
  | 'overgeneralization'      // One event = always
  | 'mental_filter'           // Focus only on negative
  | 'disqualifying_positive'  // Positive doesn't count
  | 'jumping_to_conclusions'  // Mind reading / fortune telling
  | 'magnification'           // Catastrophizing (alias: catastrophizing)
  | 'catastrophizing'         // Alias for magnification
  | 'minimization'            // Downplaying positives
  | 'emotional_reasoning'     // I feel it, so it's true
  | 'should_statements'       // Rigid expectations
  | 'labeling'                // Global negative labels
  | 'personalization'         // Everything is my fault
  | 'blame'                   // Everything is others' fault
  // Extended distortions for digital context
  | 'comparison'              // Social media comparison
  | 'fomo'                    // Fear of missing out
  | 'imposter_syndrome'       // Feeling like a fraud
  | 'perfectionism'           // Nothing is good enough
  | 'mind_reading'            // Assuming others' thoughts
  | 'fortune_telling'         // Predicting negative outcomes
  | 'filtering'               // Selective attention
  | 'splitting'               // Idealizing or devaluing
  | 'control_fallacy';        // Over/under control beliefs

/**
 * Detected cognitive distortion
 */
export interface CognitiveDistortion {
  readonly type: CognitiveDistortionType;
  readonly confidence: number;        // 0.0 - 1.0
  readonly intensity: number;         // 0.0 - 1.0
  readonly triggeredBy: string;       // What text triggered detection
  readonly associatedEmotion?: EmotionType;
  readonly correctionSuggestion?: string;
  readonly detectedAt: Date;
}

/**
 * Attentional bias patterns
 * Where attention is primarily directed
 */
export type AttentionalBias =
  | 'threat'     // Focus on potential dangers
  | 'reward'     // Focus on potential gains
  | 'neutral'    // Balanced attention
  | 'avoidant'   // Actively avoiding certain stimuli
  | 'rumination' // Stuck on past events
  | 'worry';     // Focused on future problems

/**
 * Thinking style assessment
 */
export interface ThinkingStyle {
  /**
   * Analytical vs Intuitive (0 = intuitive, 1 = analytical)
   */
  readonly analyticalVsIntuitive: number;

  /**
   * Abstract vs Concrete (0 = concrete, 1 = abstract)
   */
  readonly abstractVsConcrete: number;

  /**
   * Internal vs External locus of control
   */
  readonly locusOfControl: 'internal' | 'external' | 'balanced';

  /**
   * Flexibility of thinking (0 = rigid, 1 = flexible)
   */
  readonly flexibility: number;
}

/**
 * Bayesian belief update record
 * Tracks how beliefs change over time
 */
export interface BeliefUpdate {
  readonly beliefType: 'self' | 'world' | 'future';
  readonly priorValue: number;
  readonly posteriorValue: number;
  readonly evidenceStrength: number;   // 0.0 - 1.0
  readonly evidenceType: 'message' | 'behavior' | 'self_report' | 'inference';
  readonly updatedAt: Date;
}

/**
 * Core belief pattern (intermediate beliefs)
 */
export interface CoreBeliefPattern {
  readonly id: string;
  readonly category: 'unlovability' | 'worthlessness' | 'helplessness' | 'defectiveness' | 'vulnerability' | 'incompetence';
  readonly strength: number;          // 0.0 - 1.0
  readonly evidence: string[];        // Supporting evidence from messages
  readonly counterEvidence: string[]; // Contradicting evidence
  readonly associatedRules: string[]; // "If-then" rules (e.g., "If I fail, I'm worthless")
  readonly formationContext?: string; // Inferred origin
}

/**
 * Cognitive load indicator
 */
export interface CognitiveLoad {
  /**
   * Current mental load (0.0 - 1.0)
   * High = reduced capacity for processing
   */
  readonly current: number;

  /**
   * Factors contributing to load
   */
  readonly factors: Array<{
    readonly factor: 'stress' | 'fatigue' | 'multitasking' | 'emotional' | 'decision_fatigue' | 'information_overload';
    readonly contribution: number;  // 0.0 - 1.0
  }>;

  /**
   * Available cognitive resources (0.0 - 1.0)
   */
  readonly availableResources: number;
}

/**
 * Metacognition assessment
 * Thinking about thinking
 */
export interface Metacognition {
  /**
   * Awareness of own cognitive patterns
   */
  readonly selfAwareness: number;   // 0.0 - 1.0

  /**
   * Ability to step back and observe thoughts
   */
  readonly defusion: number;        // 0.0 - 1.0

  /**
   * Belief in ability to change thought patterns
   */
  readonly changeBeliefs: number;   // 0.0 - 1.0

  /**
   * Worry about worry (meta-worry)
   */
  readonly metaWorry: number;       // 0.0 - 1.0
}

/**
 * 🧠 Main Cognitive State Interface
 * Core component of State Vector S_t (c_t)
 */
export interface ICognitiveState {
  /**
   * Beck's Cognitive Triad assessment
   */
  readonly coreBeliefs: CognitiveTriad;

  /**
   * Active cognitive distortions
   * Sorted by intensity (highest first)
   */
  readonly activeDistortions: CognitiveDistortion[];

  /**
   * Overall distortion intensity (0.0 - 1.0)
   * Aggregate of all active distortions
   */
  readonly distortionIntensity: number;

  /**
   * Uncertainty in belief assessments
   * High = beliefs may not be accurate
   */
  readonly beliefUncertainty: number;

  /**
   * Current attentional bias
   */
  readonly attentionalBias: AttentionalBias;

  /**
   * Thinking style characteristics
   */
  readonly thinkingStyle: ThinkingStyle;

  /**
   * Identified core belief patterns
   */
  readonly coreBeliefPatterns: CoreBeliefPattern[];

  /**
   * Current cognitive load
   */
  readonly cognitiveLoad: CognitiveLoad;

  /**
   * Metacognitive abilities
   */
  readonly metacognition: Metacognition;

  /**
   * Recent belief updates (for trajectory tracking)
   */
  readonly recentUpdates: BeliefUpdate[];

  /**
   * Timestamp of this cognitive state
   */
  readonly timestamp: Date;

  /**
   * Confidence in overall assessment
   */
  readonly confidence: number;

  /**
   * Data quality (0.0 - 1.0)
   */
  readonly dataQuality: number;
}

/**
 * Cognitive State Builder
 */
export interface ICognitiveStateBuilder {
  setCoreBeliefs(selfView: number, worldView: number, futureView: number): this;
  setBeliefConfidence(self: number, world: number, future: number): this;
  addDistortion(distortion: CognitiveDistortion): this;
  setAttentionalBias(bias: AttentionalBias): this;
  setThinkingStyle(style: ThinkingStyle): this;
  addCoreBeliefPattern(pattern: CoreBeliefPattern): this;
  setCognitiveLoad(load: CognitiveLoad): this;
  setMetacognition(meta: Metacognition): this;
  addBeliefUpdate(update: BeliefUpdate): this;
  build(): ICognitiveState;
}

/**
 * Cognitive State Factory
 */
export interface ICognitiveStateFactory {
  /**
   * Analyze text for cognitive patterns
   */
  fromTextAnalysis(
    text: string,
    previousState?: ICognitiveState
  ): Promise<ICognitiveState>;

  /**
   * Create from structured assessment
   */
  fromAssessment(
    triad: Partial<CognitiveTriad>,
    distortions: CognitiveDistortionType[]
  ): ICognitiveState;

  /**
   * Apply Bayesian update to existing state
   */
  applyBayesianUpdate(
    currentState: ICognitiveState,
    newEvidence: {
      text: string;
      emotionalContext?: EmotionType;
    }
  ): ICognitiveState;

  /**
   * Create neutral/baseline state
   */
  createNeutral(): ICognitiveState;
}

/**
 * Cognitive Distortion Detector Interface
 */
export interface ICognitiveDistortionDetector {
  /**
   * Detect distortions in text
   */
  detect(text: string): Promise<CognitiveDistortion[]>;

  /**
   * Get correction suggestion for distortion
   */
  suggestCorrection(
    distortion: CognitiveDistortion,
    context: string
  ): string;

  /**
   * Get therapeutic intervention for distortion pattern
   */
  getIntervention(
    distortionType: CognitiveDistortionType
  ): {
    name: string;
    technique: string;
    steps: string[];
    duration: number;
  };
}

/**
 * Distortion patterns for detection (Russian language)
 */
export const DISTORTION_PATTERNS: Record<CognitiveDistortionType, {
  keywords: string[];
  phrases: string[];
  description: string;
  correction: string;
}> = {
  all_or_nothing: {
    keywords: ['всегда', 'никогда', 'полностью', 'абсолютно', 'только', 'всё или ничего'],
    phrases: ['всё плохо', 'ничего не получается', 'никто не поймёт'],
    description: 'Чёрно-белое мышление без оттенков',
    correction: 'Попробуй найти оттенки серого. Что между "всегда" и "никогда"?'
  },
  overgeneralization: {
    keywords: ['всегда', 'никогда', 'все', 'каждый раз'],
    phrases: ['со мной так всегда', 'у меня никогда', 'все против меня'],
    description: 'Один случай = вечная закономерность',
    correction: 'Это один случай или действительно закономерность? Были исключения?'
  },
  mental_filter: {
    keywords: ['только плохое', 'опять', 'снова'],
    phrases: ['вижу только плохое', 'замечаю только негатив'],
    description: 'Фокус только на негативе',
    correction: 'Что хорошего произошло сегодня? Даже маленькое.'
  },
  disqualifying_positive: {
    keywords: ['не считается', 'это случайность', 'повезло', 'просто'],
    phrases: ['это не в счёт', 'просто повезло', 'любой бы справился'],
    description: 'Обесценивание позитивного опыта',
    correction: 'Почему хорошее "не считается"? Кто решил эти правила?'
  },
  jumping_to_conclusions: {
    keywords: ['точно', 'наверняка', 'скорее всего'],
    phrases: ['он думает что', 'она считает меня', 'это закончится'],
    description: 'Выводы без достаточных оснований',
    correction: 'Какие факты подтверждают эту мысль? Есть другие объяснения?'
  },
  magnification: {
    keywords: ['катастрофа', 'ужас', 'кошмар', 'конец'],
    phrases: ['это конец', 'всё пропало', 'жизнь разрушена'],
    description: 'Преувеличение негативного',
    correction: 'Насколько это будет важно через год? Через 5 лет?'
  },
  minimization: {
    keywords: ['всего лишь', 'подумаешь', 'ерунда'],
    phrases: ['ничего особенного', 'могло быть хуже'],
    description: 'Преуменьшение позитивного',
    correction: 'Представь, что друг это сделал. Как бы ты оценил его достижение?'
  },
  emotional_reasoning: {
    keywords: ['чувствую', 'ощущаю', 'мне кажется'],
    phrases: ['чувствую себя глупым - значит я глупый', 'мне плохо - значит всё плохо'],
    description: 'Эмоции = факты',
    correction: 'Чувства важны, но они не всегда отражают реальность. Какие факты?'
  },
  should_statements: {
    keywords: ['должен', 'обязан', 'надо', 'следует'],
    phrases: ['я должен', 'мне следует', 'нужно было'],
    description: 'Жёсткие требования к себе/другим',
    correction: 'Кто установил это "должен"? Что будет, если по-другому?'
  },
  labeling: {
    keywords: ['неудачник', 'тупой', 'бесполезный', 'никчёмный'],
    phrases: ['я - неудачник', 'я тупой', 'я бесполезен'],
    description: 'Глобальные негативные ярлыки',
    correction: 'Ты = одно действие? Или ты больше, чем одна ошибка?'
  },
  personalization: {
    keywords: ['из-за меня', 'моя вина', 'я виноват'],
    phrases: ['это всё из-за меня', 'если бы я', 'моя ответственность'],
    description: 'Всё - моя вина',
    correction: 'Какие факторы не зависели от тебя? Что было вне твоего контроля?'
  },
  blame: {
    keywords: ['из-за него', 'они виноваты', 'их вина'],
    phrases: ['это всё из-за них', 'они должны были'],
    description: 'Всё - вина других',
    correction: 'Что ты можешь контролировать в этой ситуации?'
  },
  comparison: {
    keywords: ['лучше меня', 'хуже чем', 'как у других'],
    phrases: ['у всех лучше', 'я хуже других', 'почему у них'],
    description: 'Постоянное сравнение с другими',
    correction: 'Ты видишь только "витрину" других. Что ты не знаешь о их жизни?'
  },
  fomo: {
    keywords: ['пропускаю', 'упускаю', 'без меня'],
    phrases: ['все веселятся без меня', 'я что-то пропускаю'],
    description: 'Страх упустить что-то важное',
    correction: 'Что важного происходит ЗДЕСЬ и СЕЙЧАС в твоей жизни?'
  },
  imposter_syndrome: {
    keywords: ['не заслуживаю', 'обман', 'разоблачат'],
    phrases: ['скоро поймут что я', 'не заслужил', 'притворяюсь'],
    description: 'Ощущение себя обманщиком',
    correction: 'Какие конкретные достижения подтверждают твою компетентность?'
  },
  perfectionism: {
    keywords: ['идеально', 'безупречно', 'недостаточно хорошо'],
    phrases: ['должно быть идеально', 'недостаточно', 'могло быть лучше'],
    description: 'Ничто не достаточно хорошо',
    correction: 'Что значит "достаточно хорошо"? Кто устанавливает стандарт?'
  },
  mind_reading: {
    keywords: ['он думает', 'она считает', 'они уверены'],
    phrases: ['знаю что думают', 'уверен что считает'],
    description: 'Уверенность в мыслях других',
    correction: 'Откуда ты знаешь их мысли? Ты спрашивал?'
  },
  fortune_telling: {
    keywords: ['точно будет', 'обязательно случится', 'никогда не'],
    phrases: ['это закончится плохо', 'ничего не выйдет'],
    description: 'Предсказание негативного будущего',
    correction: 'Сколько раз твои "предсказания" сбывались? А не сбывались?'
  },
  filtering: {
    keywords: ['только это', 'именно это'],
    phrases: ['запомнил только', 'заметил только'],
    description: 'Избирательное внимание',
    correction: 'Что ещё было в этой ситуации? Что ты не заметил?'
  },
  splitting: {
    keywords: ['идеальный', 'ужасный', 'лучший', 'худший'],
    phrases: ['он идеален', 'она ужасна', 'самый лучший'],
    description: 'Крайности в оценке людей',
    correction: 'Люди = смесь качеств. Какие качества ты не учитываешь?'
  },
  control_fallacy: {
    keywords: ['контроль', 'не могу повлиять', 'всё зависит от меня'],
    phrases: ['я ничего не могу сделать', 'всё в моих руках'],
    description: 'Иллюзия контроля или беспомощности',
    correction: 'Что реально в твоём контроле? Что нет?'
  },
  // Aliases (Phase 6 - type compatibility)
  black_and_white: {
    keywords: ['всегда', 'никогда', 'полностью', 'абсолютно', 'только', 'всё или ничего'],
    phrases: ['всё плохо', 'ничего не получается', 'никто не поймёт'],
    description: 'Чёрно-белое мышление без оттенков (алиас all_or_nothing)',
    correction: 'Попробуй найти оттенки серого. Что между "всегда" и "никогда"?'
  },
  catastrophizing: {
    keywords: ['катастрофа', 'ужас', 'кошмар', 'конец'],
    phrases: ['это конец', 'всё пропало', 'жизнь разрушена'],
    description: 'Преувеличение негативного (алиас magnification)',
    correction: 'Насколько это будет важно через год? Через 5 лет?'
  }
};

/**
 * Therapeutic interventions for each distortion
 */
export const DISTORTION_INTERVENTIONS: Record<CognitiveDistortionType, {
  technique: string;
  description: string;
  steps: string[];
  durationMinutes: number;
}> = {
  all_or_nothing: {
    technique: 'Континуум мышления',
    description: 'Поиск оттенков между крайностями',
    steps: [
      'Определи крайние точки (0% и 100%)',
      'Найди точку посередине (50%)',
      'Определи, где находится реальная ситуация',
      'Запиши нюансы, которые раньше не замечал'
    ],
    durationMinutes: 5
  },
  overgeneralization: {
    technique: 'Проверка исключений',
    description: 'Поиск случаев, когда было по-другому',
    steps: [
      'Запиши своё обобщение',
      'Вспомни хотя бы 3 исключения',
      'Переформулируй мысль более точно',
      'Заметь, как меняется ощущение'
    ],
    durationMinutes: 5
  },
  mental_filter: {
    technique: 'Расширение фокуса',
    description: 'Намеренный поиск позитивного',
    steps: [
      'Запиши негативное, на чём сфокусирован',
      'Намеренно найди 3 нейтральных факта',
      'Найди хотя бы 1 позитивный момент',
      'Посмотри на полную картину'
    ],
    durationMinutes: 5
  },
  disqualifying_positive: {
    technique: 'Валидация достижений',
    description: 'Признание своих заслуг',
    steps: [
      'Запиши достижение, которое обесцениваешь',
      'Представь, что это сделал друг',
      'Как бы ты оценил ЕГО достижение?',
      'Примени тот же стандарт к себе'
    ],
    durationMinutes: 5
  },
  jumping_to_conclusions: {
    technique: 'Сбор доказательств',
    description: 'Проверка фактами',
    steps: [
      'Запиши свой вывод',
      'Какие факты ЗА этот вывод?',
      'Какие факты ПРОТИВ?',
      'Какие альтернативные объяснения возможны?'
    ],
    durationMinutes: 7
  },
  magnification: {
    technique: 'Масштабирование',
    description: 'Оценка реального масштаба',
    steps: [
      'Оцени проблему по шкале 1-10 сейчас',
      'Как оценишь через неделю?',
      'Через месяц?',
      'Через год?',
      'Что реально изменится?'
    ],
    durationMinutes: 5
  },
  minimization: {
    technique: 'Признание значимости',
    description: 'Оценка реального вклада',
    steps: [
      'Запиши то, что преуменьшаешь',
      'Какие усилия потребовались?',
      'Какие навыки ты применил?',
      'Что это говорит о тебе?'
    ],
    durationMinutes: 5
  },
  emotional_reasoning: {
    technique: 'Разделение чувств и фактов',
    description: 'Различение эмоций и реальности',
    steps: [
      'Запиши: "Я чувствую..."',
      'Запиши: "Факты говорят..."',
      'Сравни эти два утверждения',
      'Что более точно описывает реальность?'
    ],
    durationMinutes: 5
  },
  should_statements: {
    technique: 'Гибкие предпочтения',
    description: 'Замена "должен" на "хотел бы"',
    steps: [
      'Запиши своё "должен"',
      'Замени на "было бы хорошо, если..."',
      'Или на "я предпочёл бы..."',
      'Как меняется ощущение?'
    ],
    durationMinutes: 3
  },
  labeling: {
    technique: 'Описание вместо ярлыка',
    description: 'Конкретное описание поведения',
    steps: [
      'Запиши ярлык, который используешь',
      'Опиши конкретное поведение без ярлыка',
      'Ты = сумма всех действий, не одного',
      'Какие противоположные примеры есть?'
    ],
    durationMinutes: 5
  },
  personalization: {
    technique: 'Анализ ответственности',
    description: 'Распределение факторов влияния',
    steps: [
      'Запиши ситуацию',
      'Перечисли ВСЕ факторы, которые повлияли',
      'Какой % твоего реального влияния?',
      'Что было вне твоего контроля?'
    ],
    durationMinutes: 5
  },
  blame: {
    technique: 'Круг влияния',
    description: 'Фокус на том, что можешь контролировать',
    steps: [
      'Что ты можешь изменить в ситуации?',
      'Что зависит от других?',
      'Сфокусируйся на своём круге влияния',
      'Какой первый маленький шаг?'
    ],
    durationMinutes: 5
  },
  comparison: {
    technique: 'Сравнение с собой',
    description: 'Фокус на личном прогрессе',
    steps: [
      'Сравни себя сейчас с собой год назад',
      'Какой прогресс ты сделал?',
      'У других свой путь, у тебя свой',
      'Что уникального в твоём пути?'
    ],
    durationMinutes: 5
  },
  fomo: {
    technique: 'JOMO - Joy of Missing Out',
    description: 'Радость от того, что есть',
    steps: [
      'Что хорошего в твоей текущей ситуации?',
      'Что ты ПОЛУЧАЕШЬ, не участвуя?',
      'Время, энергию, спокойствие?',
      'Что важного ты можешь сделать сейчас?'
    ],
    durationMinutes: 5
  },
  imposter_syndrome: {
    technique: 'Файл достижений',
    description: 'Сбор доказательств компетентности',
    steps: [
      'Запиши 5 своих достижений',
      'Какие навыки они демонстрируют?',
      'Что говорили о тебе другие?',
      'Сохрани этот список и перечитывай'
    ],
    durationMinutes: 10
  },
  perfectionism: {
    technique: 'Достаточно хорошо',
    description: 'Определение реалистичного стандарта',
    steps: [
      'Что значит "идеально" для тебя?',
      'Что значит "достаточно хорошо"?',
      'Какова цена идеализма?',
      'Попробуй "достаточно хорошо" один раз'
    ],
    durationMinutes: 5
  },
  mind_reading: {
    technique: 'Проверка реальности',
    description: 'Спросить вместо угадывать',
    steps: [
      'Что ты думаешь о мыслях другого?',
      'Какие есть альтернативные объяснения?',
      'Можешь ли ты спросить напрямую?',
      'Что самое вероятное объяснение?'
    ],
    durationMinutes: 5
  },
  fortune_telling: {
    technique: 'Проверка предсказаний',
    description: 'Анализ прошлых "предсказаний"',
    steps: [
      'Запиши своё предсказание',
      'Вспомни 3 случая, когда ты ошибался',
      'Какой % предсказаний сбывался?',
      'Какой наиболее вероятный исход?'
    ],
    durationMinutes: 5
  },
  filtering: {
    technique: 'Полная картина',
    description: 'Намеренный сбор всей информации',
    steps: [
      'Что негативного ты заметил?',
      'Что нейтрального было?',
      'Что позитивного было?',
      'Как выглядит полная картина?'
    ],
    durationMinutes: 5
  },
  splitting: {
    technique: 'Интеграция',
    description: 'Видение человека целиком',
    steps: [
      '3 положительных качества человека',
      '3 отрицательных качества',
      'Люди = сложные существа',
      'Как это меняет твоё отношение?'
    ],
    durationMinutes: 5
  },
  control_fallacy: {
    technique: 'Круги контроля',
    description: 'Разграничение зон влияния',
    steps: [
      'Нарисуй 3 круга: контроль, влияние, вне контроля',
      'Распредели факторы ситуации по кругам',
      'Сфокусируйся на первом круге',
      'Прими то, что в третьем круге'
    ],
    durationMinutes: 7
  },
  // Aliases (Phase 6 - type compatibility)
  black_and_white: {
    technique: 'Континуум мышления',
    description: 'Поиск оттенков между крайностями (алиас all_or_nothing)',
    steps: [
      'Определи крайние точки (0% и 100%)',
      'Найди точку посередине (50%)',
      'Определи, где находится реальная ситуация',
      'Запиши нюансы, которые раньше не замечал'
    ],
    durationMinutes: 5
  },
  catastrophizing: {
    technique: 'Масштабирование',
    description: 'Оценка реального масштаба (алиас magnification)',
    steps: [
      'Оцени проблему по шкале 1-10 сейчас',
      'Как оценишь через неделю?',
      'Через месяц?',
      'Через год?',
      'Что реально изменится?'
    ],
    durationMinutes: 5
  }
};
