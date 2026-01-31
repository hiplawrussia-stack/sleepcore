/**
 * Test Helpers for Bot Command Tests
 * ===================================
 * Provides mock factories and utilities for testing bot commands.
 */

import type { ISleepCoreContext, ICommandResult } from '../../../../src/bot/commands/interfaces/ICommand';
import type { SleepCoreAPI } from '../../../../src/SleepCoreAPI';

/**
 * Create a mock SleepCoreAPI
 */
export function createMockSleepCoreAPI(overrides: Partial<SleepCoreAPI> = {}): SleepCoreAPI {
  return {
    startSession: jest.fn().mockReturnValue({
      userId: 'test-user',
      startedAt: new Date(),
      currentPhase: 'assessment',
      weekNumber: 1,
      isiScore: 15,
      isiSeverity: 'moderate',
    }),
    getSession: jest.fn().mockReturnValue({
      userId: 'test-user',
      startedAt: new Date(),
      currentPhase: 'treatment',
      weekNumber: 2,
      isiScore: 12,
      isiSeverity: 'subthreshold',
    }),
    addDiaryEntry: jest.fn().mockReturnValue(true),
    recordISIAssessment: jest.fn(),
    enrollISISchedule: jest.fn(),
    registerForNotifications: jest.fn(),
    processNewDiaryEntry: jest.fn().mockResolvedValue({
      metrics: {
        totalSleepTime: 420,
        sleepEfficiency: 85,
        sleepOnsetLatency: 15,
        wakeAfterSleepOnset: 30,
        timeInBed: 480,
        numberOfAwakenings: 1,
      },
      entriesCount: 1,
      planCreated: false,
      intervention: null,
      message: 'Запись сохранена.',
      thirdWaveRecommendation: null,
      isNonResponding: false,
      currentWeek: 0,
    }),
    getNextIntervention: jest.fn().mockReturnValue({
      component: 'sleep_restriction',
      action: 'Ложитесь спать в 23:00, вставайте в 06:30',
      rationale: 'Оптимизация времени в постели для повышения эффективности сна',
      priority: 3,
      timing: 'tonight',
      personalizationScore: 0.85,
    }),
    getRelaxationRecommendation: jest.fn().mockReturnValue({
      technique: 'pmr',
      name: 'Прогрессивная мышечная релаксация',
      duration: 15,
      instructions: ['Напрягите мышцы ног', 'Расслабьте мышцы ног'],
    }),
    getMindfulnessPractice: jest.fn().mockReturnValue({
      type: 'body_scan',
      name: 'Сканирование тела',
      duration: 10,
      guidance: ['Сфокусируйтесь на дыхании', 'Обратите внимание на ощущения в теле'],
    }),
    getProgressReport: jest.fn().mockReturnValue({
      currentISI: 12,
      isiChange: -3,
      currentSleepEfficiency: 82,
      sleepEfficiencyChange: 5,
      currentWeek: 2,
      overallAdherence: 85,
      achievements: ['7 дней дневника подряд', 'Улучшение SE на 5%'],
      improvements: ['Продолжайте ограничение сна'],
      responseStatus: 'responding',
    }),
    getSleepEfficiencyTrend: jest.fn().mockReturnValue([78, 80, 82, 81, 85, 84, 86]),
    getWeeklySummary: jest.fn().mockReturnValue({
      weekStartDate: '2026-01-23',
      weekEndDate: '2026-01-30',
      entriesCount: 7,
      averages: {
        timeInBed: 480,
        totalSleepTime: 408,
        sleepOnsetLatency: 18,
        wakeAfterSleepOnset: 25,
        sleepEfficiency: 85,
        numberOfAwakenings: 1,
      },
      trends: {
        sleepEfficiency: 'improving',
        totalSleepTime: 'stable',
      },
      qualityDistribution: { very_poor: 0, poor: 1, fair: 2, good: 3, excellent: 1 },
      recommendations: ['Сохраняйте стабильное время подъёма'],
    }),
    analyzePatterns: jest.fn().mockReturnValue({
      userId: 'test-user',
      analysisDate: '2026-01-30',
      dataRange: { start: '2026-01-16', end: '2026-01-30' },
      entriesAnalyzed: 14,
      patterns: {
        averageBedtime: '23:15',
        averageWakeTime: '07:00',
        bedtimeVariability: 25,
        wakeTimeVariability: 15,
        weekendShift: 45,
        estimatedChronotype: 'intermediate',
      },
      insomnia: {
        subtype: 'sleep_onset',
        severity: 'moderate',
        avgSOL: 22,
        avgWASO: 18,
        avgSE: 85,
      },
      issues: [{ id: 'var_bedtime', description: 'Нерегулярное время отхода ко сну', frequency: 40, severity: 'medium' }],
    }),
    explainCurrentIntervention: jest.fn().mockResolvedValue(null),
    assessChronotypeFromMEQ: jest.fn().mockReturnValue({
      chronotype: 'owl',
      chronotypeCategory: 'moderate_evening',
      meqScore: 35,
      estimatedDLMO: '22:30',
      dlmoConfidence: 0.7,
      optimalSleepWindow: { bedtime: '23:30', wakeTime: '07:30' },
      estimatedSleepNeed: 8,
      socialJetlag: 1.5,
      socialJetlagSeverity: 'moderate',
      riskFactors: [],
    }),
    storeCircadianAssessment: jest.fn(),
    initializeMCT: jest.fn().mockReturnValue({
      startDate: '2026-01-30',
      currentSession: 1,
      totalSessions: 8,
      focus: 'metacognitive_strategies',
    }),
    getWorryPostponementExercise: jest.fn().mockReturnValue({
      instructions: [
        'Заметьте тревожную мысль',
        'Скажите себе: "Я подумаю об этом позже"',
        'Запишите мысль кратко',
        'Вернитесь к текущей деятельности',
      ],
      postponeToTime: '18:00',
      worryPeriodDuration: 15,
      tips: [
        'Выберите фиксированное время для беспокойства',
        'Ограничьте период беспокойства 15 минутами',
        'Не анализируйте мысли вне этого периода',
      ],
    }),
    getDetachedMindfulnessExercise: jest.fn().mockReturnValue({
      instructions: [
        'Займите удобное положение',
        'Наблюдайте за мыслями как за облаками',
        'Не пытайтесь контролировать или оценивать мысли',
        'Просто отмечайте их появление и исчезновение',
      ],
      metaphor: 'Представьте, что ваш ум — это небо, а мысли — облака. Они приходят и уходят, но небо остаётся неизменным.',
      duration: 10,
    }),
    getATTSession: jest.fn().mockReturnValue({
      instructions: [
        'Сосредоточьтесь на одном звуке',
        'Удерживайте внимание на этом звуке 2 минуты',
        'Замечайте, когда внимание отвлекается',
        'Мягко возвращайте внимание к звуку',
      ],
      tips: [
        'Начинайте с коротких сессий по 5 минут',
        'Практикуйте в тихом месте',
        'Увеличивайте длительность постепенно',
      ],
    }),
    getMCTSessionSummary: jest.fn().mockReturnValue({
      keyTakeaways: [
        'Мысли — это просто мысли, а не факты',
        'Беспокойство можно отложить на определённое время',
      ],
      homeExperiments: [
        'Практикуйте откладывание беспокойства 3 раза в день',
        'Наблюдайте за мыслями 5 минут перед сном',
      ],
      nextSessionPreview: 'Следующая сессия: углублённая практика отстранённой осознанности',
      progressHighlights: [
        'Освоена техника откладывания беспокойства',
        'Начато знакомство с отстранённой осознанностью',
      ],
    }),
    initializeACTI: jest.fn().mockReturnValue({
      userId: 'test-user',
      startDate: '2026-01-30',
      currentSession: 1,
      totalSessions: 6,
      sessionDetails: {
        sessionId: 'acti_s1',
        sessionNumber: 1,
        theme: 'Понимание ловушки контроля',
        primaryProcess: 'acceptance',
      },
      completedSessions: [],
      unwantedExperiences: [],
      defusionPractice: [],
      values: null,
      committedActions: [],
      flexibility: {
        acceptanceBaseline: 0.3,
        acceptanceCurrent: 0.3,
        defusionBaseline: 0.4,
        defusionCurrent: 0.4,
        valuesClarity: 0.6,
        committedActionAdherence: 0,
      },
      sleepWillingness: { baseline: 0.3, current: 0.3 },
      progress: { flexibilityChange: 0, isiChange: 0, qualityOfLifeChange: 0 },
    }),
    getAcceptanceExercise: jest.fn().mockReturnValue({
      exercise: 'Готовность к бодрствованию',
      instructions: [
        'Вместо того чтобы пытаться уснуть, попробуйте быть готовым к бодрствованию.',
        'Скажите себе: "Я готов быть бодрым столько, сколько нужно."',
        'Это не означает, что вы хотите бодрствовать — лишь что вы не боретесь.',
        'Парадокс: готовность к бодрствованию часто приводит ко сну.',
        'Отпустите повестку "я должен уснуть" — просто будьте.',
      ],
      metaphor: 'Зыбучие пески: чем больше боретесь, тем глубже тонете. Расслабьтесь и позвольте себе всплыть.',
    }),
    getDefusionTechnique: jest.fn().mockReturnValue({
      id: 'def_notice',
      name: 'Я замечаю мысль...',
      description: 'Добавление фразы "Я замечаю, что у меня есть мысль..." перед мыслью',
      instructions: [
        'Когда появляется тревожная мысль о сне, не погружайтесь в неё.',
        'Скажите себе: "Я замечаю, что у меня есть мысль..."',
        'Затем озвучьте мысль: "...что я не смогу уснуть"',
        'Заметьте дистанцию между вами и мыслью.',
      ],
      targetExperiences: ['thought'],
      difficulty: 'beginner',
      duration: 2,
    }),
    identifyUnwantedExperiences: jest.fn().mockReturnValue([
      {
        id: 'exp_1',
        type: 'thought',
        content: 'Я не смогу уснуть',
        context: 'pre_sleep',
        frequency: 0.7,
        distress: 0.6,
        fusionLevel: 0.7,
        avoidanceBehaviors: [],
      },
      {
        id: 'exp_2',
        type: 'feeling',
        content: 'Тревога о сне',
        context: 'pre_sleep',
        frequency: 0.6,
        distress: 0.7,
        fusionLevel: 0.6,
        avoidanceBehaviors: [],
      },
    ]),
    getACTISessionSummary: jest.fn().mockReturnValue({
      keyTakeaways: [
        'Борьба с бессонницей усиливает её',
        'Готовность — это не желание, а открытость опыту',
      ],
      practiceExercises: [
        'Заметить все попытки контролировать сон',
        'Практика "отпускания" в одной ситуации',
      ],
      nextSessionPreview: 'Следующая сессия: Мысли — это только мысли',
    }),
    generateChronotherapyPlan: jest.fn().mockReturnValue({
      optimalSessionTimes: ['10:00', '15:00'],
      sleepRestrictionAdjustments: {
        initialBedtime: '23:30',
        initialWakeTime: '07:00',
        rationale: 'Учитывает ваш хронотип',
      },
      lightTherapy: {
        recommended: true,
        timing: '07:00',
        duration: 30,
        intensity: 10000,
        rationale: 'Для сдвига циркадного ритма',
      },
      melatoninTiming: {
        recommended: false,
        timing: '',
        dose: '',
        rationale: '',
      },
      lifestyleRecommendations: [
        'Избегайте яркого света вечером',
        'Получайте утренний свет',
      ],
    }),
    assessChronotypeFromMCTQ: jest.fn().mockReturnValue({
      chronotype: 'owl',
      chronotypeCategory: 'moderate_evening',
      meqScore: 35,
      estimatedDLMO: '22:30',
      dlmoConfidence: 0.7,
      optimalSleepWindow: { bedtime: '23:30', wakeTime: '07:30' },
      estimatedSleepNeed: 8,
      socialJetlag: 1.5,
      socialJetlagSeverity: 'moderate',
      riskFactors: [],
    }),
    getChronotype: jest.fn().mockReturnValue('moderate_evening'),
    getSocialJetlag: jest.fn().mockReturnValue({
      hours: 1.5,
      severity: 'moderate',
      recommendation: 'Умеренный социальный джетлаг. Старайтесь не отклоняться от графика более чем на 1 час в выходные.',
    }),
    getTreatmentRecommendations: jest.fn().mockReturnValue([
      {
        id: 'rec_cbti',
        category: 'treatment',
        text: 'CBT-I is recommended as first-line treatment',
        textRu: 'КПТ-И рекомендуется как терапия первой линии',
        evidenceGrade: 'A',
        strength: 'strong',
        isNew2023: false,
        source: 'Riemann et al., 2023',
      },
      {
        id: 'rec_dcbti',
        category: 'treatment',
        text: 'Digital CBT-I is effective',
        textRu: 'Цифровая КПТ-И эффективна',
        evidenceGrade: 'A',
        strength: 'strong',
        isNew2023: true,
        source: 'Riemann et al., 2023',
      },
    ]),
    getNew2023Recommendations: jest.fn().mockReturnValue([
      {
        id: 'new_dcbti',
        category: 'treatment',
        text: 'Digital CBT-I recommended',
        textRu: 'Цифровая КПТ-И рекомендуется как альтернатива очной терапии',
        evidenceGrade: 'A',
        strength: 'strong',
        isNew2023: true,
        source: 'Riemann et al., 2023',
      },
      {
        id: 'new_pharma',
        category: 'pharmacological',
        text: 'Pharmacological update',
        textRu: 'Обновление фармакологических рекомендаций',
        evidenceGrade: 'B',
        strength: 'conditional',
        isNew2023: true,
        source: 'Riemann et al., 2023',
      },
    ]),
    getCBTIComponentEvidence: jest.fn().mockReturnValue([
      {
        component: 'multicomponent_cbti',
        effectSize: 0.84,
        effectSizeCI: [0.72, 0.96],
        nStudies: 87,
        nParticipants: 9475,
        quality: 'high',
        recommendation: 'Strongly recommended',
      },
      {
        component: 'sleep_restriction',
        effectSize: 0.45,
        effectSizeCI: [0.29, 0.61],
        nStudies: 12,
        nParticipants: 890,
        quality: 'high',
        recommendation: 'Recommended',
      },
    ]),
    getMostEffectiveCBTIComponents: jest.fn().mockReturnValue([
      {
        component: 'multicomponent_cbti',
        effectSize: 0.84,
        effectSizeCI: [0.72, 0.96],
        nStudies: 87,
        nParticipants: 9475,
        quality: 'high',
        recommendation: 'Strongly recommended',
      },
      {
        component: 'sleep_restriction',
        effectSize: 0.45,
        effectSizeCI: [0.29, 0.61],
        nStudies: 12,
        nParticipants: 890,
        quality: 'high',
        recommendation: 'Recommended',
      },
      {
        component: 'stimulus_control',
        effectSize: 0.41,
        effectSizeCI: [0.25, 0.57],
        nStudies: 10,
        nParticipants: 750,
        quality: 'moderate',
        recommendation: 'Recommended',
      },
      {
        component: 'cognitive_restructuring',
        effectSize: 0.32,
        effectSizeCI: [0.18, 0.46],
        nStudies: 8,
        nParticipants: 620,
        quality: 'moderate',
        recommendation: 'Recommended',
      },
    ]),
    ...overrides,
  } as unknown as SleepCoreAPI;
}

/**
 * Create a mock ISleepCoreContext
 */
export function createMockContext(overrides: Partial<ISleepCoreContext> = {}): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI();

  return {
    userId: 'test-user-123',
    chatId: 12345,
    displayName: 'Test User',
    languageCode: 'ru',
    sleepCore: mockSleepCore,
    from: {
      id: 123,
      is_bot: false,
      first_name: 'Test',
    },
    chat: {
      id: 12345,
      type: 'private',
    },
    message: {
      message_id: 1,
      date: Date.now() / 1000,
      chat: { id: 12345, type: 'private' },
      text: '/test',
    },
    reply: jest.fn(),
    editMessageText: jest.fn(),
    answerCallbackQuery: jest.fn(),
    ...overrides,
  } as unknown as ISleepCoreContext;
}

/**
 * Create a mock context with no session
 */
export function createMockContextNoSession(): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI({
    getSession: jest.fn().mockReturnValue(null),
  });

  return createMockContext({ sleepCore: mockSleepCore });
}

/**
 * Create a mock context with no intervention available
 */
export function createMockContextNoIntervention(): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI({
    getNextIntervention: jest.fn().mockReturnValue(null),
  });

  return createMockContext({ sleepCore: mockSleepCore });
}

/**
 * Assert that result is successful with a message
 */
export function assertSuccessWithMessage(result: ICommandResult): void {
  expect(result.success).toBe(true);
  expect(result.message).toBeDefined();
  expect(result.message!.length).toBeGreaterThan(0);
}

/**
 * Assert that result has keyboard buttons
 */
export function assertHasKeyboard(result: ICommandResult, minRows = 1): void {
  expect(result.keyboard).toBeDefined();
  expect(result.keyboard!.length).toBeGreaterThanOrEqual(minRows);
}

/**
 * Assert that result contains specific text
 */
export function assertContainsText(result: ICommandResult, text: string): void {
  expect(result.message).toContain(text);
}

/**
 * Assert callback data format
 */
export function assertCallbackData(
  result: ICommandResult,
  prefix: string
): void {
  expect(result.keyboard).toBeDefined();
  const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
  const matchingCallbacks = allCallbacks.filter(cb => cb?.startsWith(prefix));
  expect(matchingCallbacks.length).toBeGreaterThan(0);
}
