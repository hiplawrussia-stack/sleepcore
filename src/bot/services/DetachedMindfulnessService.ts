/**
 * DetachedMindfulnessService (Sprint 7 - MCT Module)
 * ===================================================
 * Implements Detached Mindfulness (DM) techniques from Metacognitive Therapy.
 *
 * Research Foundation:
 * - Wells (2005): Detached mindfulness as a core MCT strategy
 * - Wells (2009): MCT for Anxiety and Depression
 * - Distinction from meditation-based mindfulness
 *
 * Key Principles:
 * - Detached Mindfulness is NOT meditation
 * - Observing thoughts without engagement or reaction
 * - "Strategy of non-action" - not a coping strategy
 * - Mета-awareness: knowing you're thinking
 * - Cognitive decentering: thoughts as events, not facts
 *
 * Core Exercises:
 * - Tiger exercise: Observe mental imagery passively
 * - Metaphors: Clouds, Leaves on river, Train station, Radio
 * - Quick 3-minute DM practice
 * - Free Association Task
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * DM exercise types
 */
export type DMExerciseType =
  | 'tiger'
  | 'clouds'
  | 'leaves_river'
  | 'train_station'
  | 'radio'
  | 'quick_dm'
  | 'free_association'
  | 'labeling';

/**
 * DM exercise definition
 */
export interface IDMExercise {
  /** Exercise type */
  readonly type: DMExerciseType;
  /** Russian name */
  readonly nameRu: string;
  /** English name */
  readonly nameEn: string;
  /** Duration in minutes */
  readonly duration: number;
  /** Difficulty level */
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Best for which situations */
  readonly bestFor: string[];
  /** Step-by-step instructions (Russian) */
  readonly instructionsRu: string[];
  /** Key insight to communicate */
  readonly keyInsightRu: string;
  /** Reflection questions */
  readonly reflectionQuestionsRu: string[];
}

/**
 * DM practice session record
 */
export interface IDMSessionRecord {
  /** Session ID */
  readonly id: string;
  /** User ID */
  readonly userId: string;
  /** Exercise type */
  readonly exerciseType: DMExerciseType;
  /** Timestamp */
  readonly timestamp: Date;
  /** Duration (actual, in seconds) */
  readonly duration: number;
  /** Completed */
  readonly completed: boolean;
  /** User's insight/reflection */
  readonly userReflection?: string;
  /** Detachment rating (0-10) */
  readonly detachmentRating?: number;
  /** Context (when practiced) */
  readonly context: 'daytime' | 'pre_sleep' | 'during_night' | 'on_demand';
  /** Trigger (what prompted practice) */
  readonly trigger?: 'worry' | 'rumination' | 'racing_thoughts' | 'sleep_anxiety' | 'practice';
}

/**
 * User's DM skill level
 */
export interface IDMSkillLevel {
  /** Overall skill (0-1) */
  readonly overall: number;
  /** Sessions completed */
  readonly sessionsCompleted: number;
  /** Average detachment rating */
  readonly avgDetachmentRating: number;
  /** Exercises mastered (completed 5+ times with rating >= 7) */
  readonly masteredExercises: DMExerciseType[];
  /** Current recommended exercise */
  readonly recommendedExercise: DMExerciseType;
  /** Trend */
  readonly trend: 'improving' | 'stable' | 'needs_practice';
}

/**
 * DM configuration
 */
export interface IDMConfig {
  /** Enable service */
  readonly enabled: boolean;
  /** Sessions needed to "master" an exercise */
  readonly masteryThreshold: number;
  /** Rating threshold for mastery */
  readonly masteryRatingThreshold: number;
  /** Minimum sessions for skill assessment */
  readonly minSessionsForAssessment: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_DM_CONFIG: IDMConfig = {
  enabled: true,
  masteryThreshold: 5,
  masteryRatingThreshold: 7,
  minSessionsForAssessment: 3,
};

/**
 * All DM exercises
 */
export const DM_EXERCISES: IDMExercise[] = [
  // Tiger Exercise (Beginner)
  {
    type: 'tiger',
    nameRu: 'Упражнение "Тигр"',
    nameEn: 'Tiger Exercise',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['Первое знакомство с DM', 'Понимание концепции наблюдения'],
    instructionsRu: [
      '1. Закройте глаза',
      '2. Сформируйте образ тигра',
      '3. НЕ пытайтесь влиять на образ или изменять его',
      '4. Просто наблюдайте за образом и поведением тигра',
      '',
      '   • Тигр может двигаться — но не заставляйте его',
      '   • Тигр может моргнуть — но не заставляйте',
      '   • Тигр может махнуть хвостом — но не заставляйте',
      '',
      '5. Наблюдайте, как тигр имеет собственное поведение',
      '6. Ничего не делайте, просто наблюдайте 1-2 минуты',
    ],
    keyInsightRu: 'Образы (и мысли) имеют собственную жизнь. Мы можем просто наблюдать, не вмешиваясь.',
    reflectionQuestionsRu: [
      'Двигался ли тигр сам, без вашего контроля?',
      'Как это соотносится с вашими ночными мыслями?',
      'Что будет, если так же наблюдать за тревожными мыслями?',
    ],
  },

  // Clouds Metaphor (Beginner)
  {
    type: 'clouds',
    nameRu: 'Метафора "Облака в небе"',
    nameEn: 'Clouds in the Sky',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['Работа с беспокойством', 'Мягкое отстранение'],
    instructionsRu: [
      '1. Закройте глаза или зафиксируйте взгляд',
      '2. Представьте, что ваш ум — это небо',
      '   Безграничное, спокойное, всегда присутствующее',
      '',
      '3. Мысли — это облака, проплывающие мимо',
      '   • Они приходят сами',
      '   • Они меняют форму',
      '   • Они уходят сами',
      '',
      '4. Вы — небо, а не облака',
      '   Облака не меняют природу неба',
      '',
      '5. Не нужно останавливать облака или разгонять их',
      '   Просто наблюдайте, как они проплывают',
    ],
    keyInsightRu: 'Вы — не ваши мысли. Мысли приходят и уходят, а вы остаётесь наблюдателем.',
    reflectionQuestionsRu: [
      'Удалось ли почувствовать себя "небом"?',
      'Уходили ли мысли-облака сами?',
      'Как это можно применить ночью?',
    ],
  },

  // Leaves on River (Beginner)
  {
    type: 'leaves_river',
    nameRu: 'Метафора "Листья на реке"',
    nameEn: 'Leaves on a River',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['Отпускание мыслей', 'Работа с руминацией'],
    instructionsRu: [
      '1. Представьте, что сидите на берегу реки',
      '   Река плавно течёт мимо вас',
      '',
      '2. Когда появляется мысль — положите её на лист',
      '   • Не анализируйте мысль',
      '   • Не оценивайте её',
      '   • Просто положите на лист',
      '',
      '3. Наблюдайте, как лист уплывает вниз по течению',
      '',
      '4. Не пытайтесь остановить лист или изменить его путь',
      '   Позвольте реке унести его',
      '',
      '5. Если появилась новая мысль — возьмите новый лист',
      '   Повторите процесс',
    ],
    keyInsightRu: 'Мысли можно отпускать. Они уходят сами, если не хвататься за них.',
    reflectionQuestionsRu: [
      'Какие мысли-листья было сложнее отпустить?',
      'Что происходило, когда лист уплывал?',
      'Возвращались ли какие-то мысли?',
    ],
  },

  // Train Station (Intermediate)
  {
    type: 'train_station',
    nameRu: 'Метафора "Поезда на станции"',
    nameEn: 'Trains at a Station',
    duration: 4,
    difficulty: 'intermediate',
    bestFor: ['Навязчивые мысли', 'Мысли, которые "цепляют"'],
    instructionsRu: [
      '1. Представьте, что сидите на платформе вокзала',
      '',
      '2. Мысли — это поезда, прибывающие и отправляющиеся',
      '   • Каждый поезд имеет своё направление',
      '   • Каждый поезд уходит по расписанию',
      '',
      '3. Вам НЕ нужно садиться на каждый поезд',
      '   • Вы можете видеть поезд',
      '   • Вы можете слышать объявление о нём',
      '   • Но вы остаётесь на платформе',
      '',
      '4. Заметьте мысль: "Вот прибыл поезд беспокойства"',
      '   Наблюдайте, как он стоит, затем отправляется',
      '',
      '5. Вы — пассажир, который ВЫБИРАЕТ, на какой поезд сесть',
      '   Большинство поездов можно пропустить',
    ],
    keyInsightRu: 'Вы не обязаны "садиться" на каждую мысль. Можно наблюдать и отпускать.',
    reflectionQuestionsRu: [
      'На какие "поезда мыслей" вы обычно садитесь автоматически?',
      'Каково было наблюдать, как поезд уходит без вас?',
      'Какие поезда сложнее всего пропустить?',
    ],
  },

  // Radio Metaphor (Intermediate)
  {
    type: 'radio',
    nameRu: 'Метафора "Радио в соседней комнате"',
    nameEn: 'Radio in the Next Room',
    duration: 3,
    difficulty: 'intermediate',
    bestFor: ['Фоновая тревога', 'Постоянный внутренний диалог'],
    instructionsRu: [
      '1. Представьте, что в соседней комнате играет радио',
      '',
      '2. Вы слышите его, но не обязаны слушать внимательно',
      '   • Звук есть',
      '   • Можно различить слова',
      '   • Но можно заниматься своим делом',
      '',
      '3. Мысли — как это фоновое радио',
      '   • Можно осознавать их присутствие',
      '   • Не вовлекаясь в содержание',
      '',
      '4. Громкость может меняться',
      '   Но это не требует вашего внимания или действий',
      '',
      '5. Позвольте "радио" играть',
      '   Продолжайте заниматься тем, что важно',
    ],
    keyInsightRu: 'Мысли могут присутствовать как фон, не требуя вовлечения.',
    reflectionQuestionsRu: [
      'Удалось ли воспринять мысли как "фоновый шум"?',
      'Что изменилось, когда вы перестали "слушать внимательно"?',
      'Как это применить ночью, когда мысли громкие?',
    ],
  },

  // Quick DM (Intermediate)
  {
    type: 'quick_dm',
    nameRu: 'Быстрое отстранённое осознавание',
    nameEn: 'Quick Detached Mindfulness',
    duration: 3,
    difficulty: 'intermediate',
    bestFor: ['Острое беспокойство', 'Быстрая помощь в моменте'],
    instructionsRu: [
      '1. ЗАЗЕМЛЕНИЕ (30 секунд)',
      '   Почувствуйте стопы на полу',
      '   Заметьте дыхание',
      '',
      '2. МАРКИРОВКА (60 секунд)',
      '   Когда появляется мысль, мягко отметьте: "думание"',
      '   Или более точно: "беспокойство", "планирование"',
      '   Просто маркируйте, не анализируйте',
      '',
      '3. ОТДАЛЕНИЕ (45 секунд)',
      '   Представьте мысль как текст в "облачке" из комикса',
      '   Наблюдайте, как облачко проплывает мимо',
      '',
      '4. ВОЗВРАТ (45 секунд)',
      '   Верните внимание к текущему действию',
      '   Определите один маленький следующий шаг',
      '',
      'СОВЕТ: Если мысль важна — запишите её для "времени беспокойства"',
    ],
    keyInsightRu: 'За 3 минуты можно изменить отношение к мыслям, не меняя сами мысли.',
    reflectionQuestionsRu: [
      'Какую маркировку вы использовали чаще всего?',
      'Помогло ли отдаление снизить "захваченность" мыслью?',
      'Что было следующим маленьким шагом?',
    ],
  },

  // Labeling (Advanced)
  {
    type: 'labeling',
    nameRu: 'Техника маркировки мыслей',
    nameEn: 'Thought Labeling',
    duration: 5,
    difficulty: 'advanced',
    bestFor: ['Различные типы мыслей', 'Мета-осознание'],
    instructionsRu: [
      '1. Сядьте удобно, закройте глаза',
      '',
      '2. Наблюдайте за потоком мыслей',
      '',
      '3. Для каждой мысли используйте маркировку:',
      '   • "планирование" — о будущем',
      '   • "воспоминание" — о прошлом',
      '   • "беспокойство" — что если...',
      '   • "оценивание" — хорошо/плохо',
      '   • "фантазирование" — представления',
      '   • "самокритика" — о себе негативно',
      '',
      '4. Не задерживайтесь на мысли после маркировки',
      '   Отмечаете — и отпускаете',
      '',
      '5. Если "захватило" — отметьте: "захваченность"',
      '   И мягко вернитесь к наблюдению',
    ],
    keyInsightRu: 'Маркировка создаёт дистанцию между вами и мыслью.',
    reflectionQuestionsRu: [
      'Какой тип мыслей встречался чаще?',
      'Помогала ли маркировка не "садиться" на мысль?',
      'Что вы заметили о своих паттернах мышления?',
    ],
  },

  // Free Association (Advanced)
  {
    type: 'free_association',
    nameRu: 'Свободная ассоциация с наблюдением',
    nameEn: 'Free Association with Observation',
    duration: 5,
    difficulty: 'advanced',
    bestFor: ['Понимание паттернов', 'Глубокая практика'],
    instructionsRu: [
      '1. Закройте глаза',
      '',
      '2. Позвольте уму свободно блуждать',
      '   Не направляйте мысли',
      '   Не останавливайте их',
      '',
      '3. Наблюдайте, как одна мысль переходит в другую',
      '   • Заметьте связи (или их отсутствие)',
      '   • Заметьте эмоции, которые приходят с мыслями',
      '   • Заметьте образы',
      '',
      '4. Оставайтесь наблюдателем',
      '   Вы смотрите фильм своего ума',
      '   Интересный, но вы — не в нём',
      '',
      '5. Если ум "пустой" — наблюдайте пустоту',
      '   Это тоже состояние ума',
    ],
    keyInsightRu: 'Ум постоянно производит мысли. Это его работа. Вы можете просто наблюдать.',
    reflectionQuestionsRu: [
      'Были ли моменты "пустоты"?',
      'Как ум переходил от мысли к мысли?',
      'Что вы чувствовали, наблюдая со стороны?',
    ],
  },
];

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * DetachedMindfulnessService
 * Manages Detached Mindfulness exercises for MCT
 */
export class DetachedMindfulnessService {
  private readonly config: IDMConfig;
  private readonly sessions: Map<string, IDMSessionRecord[]> = new Map();
  private mctRepo?: import('../../infrastructure/database/repositories/MCTRepository').MCTRepository;

  constructor(config: Partial<IDMConfig> = {}) {
    this.config = { ...DEFAULT_DM_CONFIG, ...config };
  }

  async setRepository(repo: import('../../infrastructure/database/repositories/MCTRepository').MCTRepository): Promise<void> {
    this.mctRepo = repo;
    await this.loadFromDB();
  }

  private async loadFromDB(): Promise<void> {
    if (!this.mctRepo) return;
    try {
      const entries = await this.mctRepo.getAllSessionsForService('dm');
      for (const { userId, sessions } of entries) {
        this.sessions.set(userId, sessions as IDMSessionRecord[]);
      }
      console.log(`[DetachedMindfulness] Loaded ${entries.length} user session records from DB`);
    } catch (err) {
      console.error('[DetachedMindfulness] DB load failed:', err);
    }
  }

  private persistSession(userId: string, session: IDMSessionRecord): void {
    if (!this.mctRepo) return;
    this.mctRepo.addSession(userId, 'dm', session, session.timestamp).catch(err => {
      console.error(`[DetachedMindfulness] Failed to persist session for ${userId}:`, err);
    });
  }

  /**
   * Get configuration
   */
  getConfig(): IDMConfig {
    return this.config;
  }

  // ==========================================================================
  // EXERCISE ACCESS
  // ==========================================================================

  /**
   * Get all exercises
   */
  getExercises(): IDMExercise[] {
    return [...DM_EXERCISES];
  }

  /**
   * Get exercise by type
   */
  getExercise(type: DMExerciseType): IDMExercise | undefined {
    return DM_EXERCISES.find(e => e.type === type);
  }

  /**
   * Get exercises by difficulty
   */
  getExercisesByDifficulty(difficulty: IDMExercise['difficulty']): IDMExercise[] {
    return DM_EXERCISES.filter(e => e.difficulty === difficulty);
  }

  /**
   * Get recommended exercise for user
   */
  getRecommendedExercise(
    userId: string,
    trigger?: IDMSessionRecord['trigger']
  ): IDMExercise {
    const history = this.sessions.get(userId) ?? [];

    // For beginners, start with Tiger
    if (history.length === 0) {
      return this.getExercise('tiger')!;
    }

    // Calculate skill level locally to avoid circular dependency
    const completedSessions = history.filter(s => s.completed);
    const sessionsWithRating = completedSessions.filter(s => s.detachmentRating !== undefined);
    const avgDetachmentRating = sessionsWithRating.length > 0
      ? sessionsWithRating.reduce((sum, s) => sum + s.detachmentRating!, 0) / sessionsWithRating.length
      : 0;

    // Determine mastered exercises
    const masteredExercises: DMExerciseType[] = [];
    for (const exercise of DM_EXERCISES) {
      const exerciseSessions = completedSessions.filter(
        s => s.exerciseType === exercise.type &&
             s.detachmentRating !== undefined &&
             s.detachmentRating >= this.config.masteryRatingThreshold
      );
      if (exerciseSessions.length >= this.config.masteryThreshold) {
        masteredExercises.push(exercise.type);
      }
    }

    // Calculate overall skill (0-1)
    const overall = Math.min(1, (
      (completedSessions.length / 20) * 0.3 +
      (avgDetachmentRating / 10) * 0.4 +
      (masteredExercises.length / DM_EXERCISES.length) * 0.3
    ));

    // If specific trigger, recommend appropriate exercise
    if (trigger) {
      const triggerRecommendations: Record<string, DMExerciseType> = {
        worry: 'clouds',
        rumination: 'leaves_river',
        racing_thoughts: 'train_station',
        sleep_anxiety: 'quick_dm',
        // 'practice' trigger will fall through to the normal recommendation below
      };

      if (trigger !== 'practice') {
        const recommended = triggerRecommendations[trigger];
        if (recommended) {
          return this.getExercise(recommended)!;
        }
      }
    }

    // Get least practiced exercise at appropriate level
    const appropriateLevel = overall < 0.3 ? 'beginner' :
                            overall < 0.6 ? 'intermediate' : 'advanced';

    const candidateExercises = DM_EXERCISES.filter(e =>
      e.difficulty === appropriateLevel ||
      (appropriateLevel === 'intermediate' && e.difficulty === 'beginner') ||
      (appropriateLevel === 'advanced' && e.difficulty !== 'beginner')
    );

    // Count practice sessions for each
    const exerciseCounts = new Map<DMExerciseType, number>();
    for (const exercise of candidateExercises) {
      const count = history.filter(s => s.exerciseType === exercise.type).length;
      exerciseCounts.set(exercise.type, count);
    }

    // Return least practiced
    let minCount = Infinity;
    let recommended = candidateExercises[0];

    for (const exercise of candidateExercises) {
      const count = exerciseCounts.get(exercise.type) ?? 0;
      if (count < minCount) {
        minCount = count;
        recommended = exercise;
      }
    }

    return recommended;
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Start DM session
   */
  startSession(
    userId: string,
    exerciseType: DMExerciseType,
    context: IDMSessionRecord['context'],
    trigger?: IDMSessionRecord['trigger']
  ): IDMSessionRecord {
    const session: IDMSessionRecord = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      exerciseType,
      timestamp: new Date(),
      duration: 0,
      completed: false,
      context,
      trigger,
    };

    return session;
  }

  /**
   * Complete DM session
   */
  completeSession(
    userId: string,
    sessionId: string,
    exerciseType: DMExerciseType,
    duration: number,
    context: IDMSessionRecord['context'],
    detachmentRating?: number,
    userReflection?: string,
    trigger?: IDMSessionRecord['trigger']
  ): IDMSessionRecord {
    const session: IDMSessionRecord = {
      id: sessionId,
      userId,
      exerciseType,
      timestamp: new Date(),
      duration,
      completed: true,
      context,
      trigger,
      detachmentRating,
      userReflection,
    };

    const userSessions = this.sessions.get(userId) ?? [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);
    this.persistSession(userId, session);

    return session;
  }

  /**
   * Record incomplete session
   */
  recordIncompleteSession(
    userId: string,
    exerciseType: DMExerciseType,
    duration: number,
    context: IDMSessionRecord['context']
  ): IDMSessionRecord {
    const session: IDMSessionRecord = {
      id: `dm_incomplete_${Date.now()}`,
      userId,
      exerciseType,
      timestamp: new Date(),
      duration,
      completed: false,
      context,
    };

    const userSessions = this.sessions.get(userId) ?? [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);
    this.persistSession(userId, session);

    return session;
  }

  // ==========================================================================
  // SKILL ASSESSMENT
  // ==========================================================================

  /**
   * Get user's DM skill level
   */
  getSkillLevel(userId: string): IDMSkillLevel {
    const sessions = this.sessions.get(userId) ?? [];
    const completedSessions = sessions.filter(s => s.completed);

    // Calculate average detachment rating
    const sessionsWithRating = completedSessions.filter(s => s.detachmentRating !== undefined);
    const avgDetachmentRating = sessionsWithRating.length > 0
      ? sessionsWithRating.reduce((sum, s) => sum + s.detachmentRating!, 0) / sessionsWithRating.length
      : 0;

    // Determine mastered exercises
    const masteredExercises: DMExerciseType[] = [];
    for (const exercise of DM_EXERCISES) {
      const exerciseSessions = completedSessions.filter(
        s => s.exerciseType === exercise.type &&
             s.detachmentRating !== undefined &&
             s.detachmentRating >= this.config.masteryRatingThreshold
      );

      if (exerciseSessions.length >= this.config.masteryThreshold) {
        masteredExercises.push(exercise.type);
      }
    }

    // Calculate overall skill (0-1)
    const overall = Math.min(1, (
      (completedSessions.length / 20) * 0.3 +  // Sessions completed
      (avgDetachmentRating / 10) * 0.4 +        // Average rating
      (masteredExercises.length / DM_EXERCISES.length) * 0.3  // Mastery
    ));

    // Determine trend
    let trend: 'improving' | 'stable' | 'needs_practice' = 'stable';
    if (sessionsWithRating.length >= 4) {
      const recentAvg = sessionsWithRating.slice(-4).reduce((s, r) => s + r.detachmentRating!, 0) / 4;
      const olderAvg = sessionsWithRating.slice(0, -4).reduce((s, r) => s + r.detachmentRating!, 0) /
        Math.max(1, sessionsWithRating.length - 4);

      if (recentAvg > olderAvg + 1) trend = 'improving';
      else if (recentAvg < olderAvg - 1) trend = 'needs_practice';
    }

    // Recommend next exercise (inline to avoid circular call to getRecommendedExercise)
    let recommendedExercise: DMExerciseType = 'tiger';

    if (sessions.length > 0) {
      // Get least practiced exercise at appropriate level
      const appropriateLevel = overall < 0.3 ? 'beginner' :
                              overall < 0.6 ? 'intermediate' : 'advanced';

      const candidateExercises = DM_EXERCISES.filter(e =>
        e.difficulty === appropriateLevel ||
        (appropriateLevel === 'intermediate' && e.difficulty === 'beginner') ||
        (appropriateLevel === 'advanced' && e.difficulty !== 'beginner')
      );

      // Count practice sessions for each
      const exerciseCounts = new Map<DMExerciseType, number>();
      for (const exercise of candidateExercises) {
        const count = sessions.filter(s => s.exerciseType === exercise.type).length;
        exerciseCounts.set(exercise.type, count);
      }

      // Find least practiced
      let minCount = Infinity;
      for (const exercise of candidateExercises) {
        const count = exerciseCounts.get(exercise.type) ?? 0;
        if (count < minCount) {
          minCount = count;
          recommendedExercise = exercise.type;
        }
      }
    }

    return {
      overall,
      sessionsCompleted: completedSessions.length,
      avgDetachmentRating,
      masteredExercises,
      recommendedExercise,
      trend,
    };
  }

  // ==========================================================================
  // INSTRUCTIONS AND GUIDANCE
  // ==========================================================================

  /**
   * Get core DM principles (Russian)
   */
  getCorePrinciples(): string[] {
    return [
      'Отстранённая осознанность — это НЕ:',
      '• Медитация или релаксация',
      '• Способ избавиться от мыслей',
      '• Копинг-стратегия',
      '• Подавление мыслей',
      '',
      'Отстранённая осознанность — это:',
      '• Наблюдение за мыслями без вмешательства',
      '• "Стратегия бездействия"',
      '• Мета-осознание: знать, что думаешь',
      '• Позволение мыслям быть',
      '',
      'Ключевая идея:',
      '"Мысль — это событие в уме, а не факт о реальности"',
    ];
  }

  /**
   * Get guidance for sleep context
   */
  getSleepContextGuidance(): string[] {
    return [
      'Применение DM для улучшения сна:',
      '',
      'Перед сном:',
      '• Если появляются беспокойства — наблюдайте их как "облака"',
      '• Не боритесь с мыслями, позвольте им быть',
      '',
      'Ночью (при пробуждении):',
      '• Заметьте мысли: "А, это ночные мысли"',
      '• Не анализируйте, не решайте проблемы',
      '• Используйте метафору "радио в соседней комнате"',
      '',
      'Утром:',
      '• Если началась руминация о качестве сна — маркируйте',
      '• "Это анализ", "Это оценивание"',
      '• Отпустите и начните день',
    ];
  }

  /**
   * Get tips based on trigger
   */
  getTipsForTrigger(trigger: IDMSessionRecord['trigger']): string[] {
    switch (trigger) {
      case 'worry':
        return [
          'Беспокойство — это мысли о будущем.',
          'Вы можете видеть "поезд беспокойства" и не садиться на него.',
          'Попробуйте метафору облаков или поезда.',
        ];

      case 'rumination':
        return [
          'Руминация — это "пережёвывание" прошлого.',
          'Мысль возвращается? Снова положите её на лист.',
          'Река всё равно унесёт её.',
        ];

      case 'racing_thoughts':
        return [
          'Много мыслей — нормально для ума.',
          'Не нужно останавливать "поезда" — просто наблюдайте.',
          'Они уйдут сами.',
        ];

      case 'sleep_anxiety':
        return [
          'Тревога о сне — частый гость.',
          'Примите её как "радио" — можно не вслушиваться.',
          'Ваша задача — не спать, а позволить себе отдохнуть.',
        ];

      default:
        return [
          'Мысли — это просто мысли.',
          'Наблюдайте их с любопытством.',
          'Они приходят и уходят сами.',
        ];
    }
  }

  // ==========================================================================
  // HISTORY AND STATISTICS
  // ==========================================================================

  /**
   * Get session history
   */
  getHistory(userId: string, limit?: number): IDMSessionRecord[] {
    const sessions = this.sessions.get(userId) ?? [];
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get statistics by exercise
   */
  getExerciseStatistics(userId: string): Map<DMExerciseType, {
    sessionsCompleted: number;
    avgRating: number;
    lastPracticed?: Date;
  }> {
    const sessions = this.sessions.get(userId) ?? [];
    const stats = new Map<DMExerciseType, { sessionsCompleted: number; avgRating: number; lastPracticed?: Date }>();

    for (const exercise of DM_EXERCISES) {
      const exerciseSessions = sessions.filter(
        s => s.exerciseType === exercise.type && s.completed
      );

      const ratings = exerciseSessions
        .map(s => s.detachmentRating)
        .filter((r): r is number => r !== undefined);

      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      const lastPracticed = exerciseSessions.length > 0
        ? new Date(Math.max(...exerciseSessions.map(s => new Date(s.timestamp).getTime())))
        : undefined;

      stats.set(exercise.type, {
        sessionsCompleted: exerciseSessions.length,
        avgRating,
        lastPracticed,
      });
    }

    return stats;
  }

  // ==========================================================================
  // CSD INTEGRATION
  // ==========================================================================

  /**
   * Get CSD integration data
   */
  getCSDIntegrationData(userId: string): {
    available: boolean;
    detachmentSkill: number;
    recentPractice: boolean;
    trend: 'improving' | 'stable' | 'needs_practice';
  } {
    const sessions = this.sessions.get(userId) ?? [];

    if (sessions.length < this.config.minSessionsForAssessment) {
      return {
        available: false,
        detachmentSkill: 0,
        recentPractice: false,
        trend: 'stable',
      };
    }

    const skillLevel = this.getSkillLevel(userId);

    // Check recent practice (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPractice = sessions.some(
      s => new Date(s.timestamp).getTime() > weekAgo
    );

    return {
      available: true,
      detachmentSkill: skillLevel.overall,
      recentPractice,
      trend: skillLevel.trend,
    };
  }

  /**
   * Reset user data
   */
  resetUserData(userId: string): void {
    this.sessions.delete(userId);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create DetachedMindfulnessService instance
 */
export function createDetachedMindfulnessService(
  config?: Partial<IDMConfig>
): DetachedMindfulnessService {
  return new DetachedMindfulnessService(config);
}

/**
 * Singleton instance
 */
export const detachedMindfulnessService = new DetachedMindfulnessService();
