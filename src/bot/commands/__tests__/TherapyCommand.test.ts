/**
 * TherapyCommand Tests - Treatment Delivery Module
 * =================================================
 *
 * IEC 62304 Class B - Treatment delivery
 * AASM Clinical Practice Guideline 2025 - CBT-I structure
 *
 * Tests verify:
 * - 6-core CBT-I session structure (SHUTi/Somryst model)
 * - Session unlock progression (week-based)
 * - Third-wave therapy menu for non-responders (Week 6+)
 * - SRT weekly review integration
 * - Evidence-based guidelines display
 *
 * CRITICAL: Treatment adherence depends on correct session sequencing
 *
 * @packageDocumentation
 */

import { TherapyCommand, therapyCommand } from '../TherapyCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    greet: (opts?: { userName?: string }) => ({
      emoji: '🦉',
      text: `Привет, ${opts?.userName || 'друг'}!`,
    }),
    tip: (text: string) => `💡 ${text}`,
  },
}));

jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    progressBar: (percent: number, _total: number) =>
      `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}]`,
  },
}));

jest.mock('../../../modules/content/clinical/ClinicalContent', () => ({
  getThirdWaveTherapies: () => [
    {
      id: 'mbti',
      title: 'MBT-I',
      titleRu: 'Терапия осознанности',
      icon: '🧘',
      sessions: 8,
      description: 'Mindfulness-based therapy for insomnia',
      bestFor: ['High arousal', 'Sleep effort'],
      contraindications: ['Active psychosis'],
    },
    {
      id: 'acti',
      title: 'ACT-I',
      titleRu: 'Терапия принятия',
      icon: '🌿',
      sessions: 6,
      description: 'Acceptance and commitment therapy for insomnia',
      bestFor: ['Experiential avoidance', 'Catastrophizing'],
      contraindications: ['Severe dissociation'],
    },
    {
      id: 'mct',
      title: 'MCT',
      titleRu: 'Метакогнитивная терапия',
      icon: '🧠',
      sessions: 8,
      description: 'Metacognitive therapy for insomnia',
      bestFor: ['Rumination', 'Worry'],
      contraindications: ['Cognitive impairment'],
    },
  ],
  CBTI_COMPONENT_NAMES: {},
  CBTI_COMPONENT_ICONS: {},
  // Core sessions for 6-week CBT-I program (CLAUDE.md §13.4)
  CORE_SESSIONS: [
    { id: 'overview', weekNumber: 1, title: 'Overview', titleRu: 'Обзор программы', duration: '30-45 мин', icon: '📚', objectives: [], components: [], homework: [] },
    { id: 'sleep_behavior_1', weekNumber: 2, title: 'Sleep Behavior I', titleRu: 'Ограничение сна', duration: '45-60 мин', icon: '🛏️', objectives: [], components: ['Минимальный безопасный TIB: 5.5 часов'], homework: [] },
    { id: 'sleep_behavior_2', weekNumber: 3, title: 'Sleep Behavior II', titleRu: 'Поведенческая практика', duration: '30-45 мин', icon: '🔄', objectives: [], components: [], homework: [] },
    { id: 'sleep_education', weekNumber: 4, title: 'Sleep Education', titleRu: 'Гигиена сна', duration: '30-45 мин', icon: '🌙', objectives: [], components: [], homework: [] },
    { id: 'sleep_thoughts', weekNumber: 5, title: 'Sleep Thoughts', titleRu: 'Когнитивная терапия', duration: '45-60 мин', icon: '🧠', objectives: [], components: [], homework: [] },
    { id: 'problem_prevention', weekNumber: 6, title: 'Problem Prevention', titleRu: 'Профилактика рецидива', duration: '30-45 мин', icon: '🛡️', objectives: [], components: [], homework: [] },
  ],
  getCoreContent: (sessionId: string) => `Mock content for ${sessionId}`,
  getCoreExercise: (sessionId: string) => sessionId === 'sleep_behavior_1' ? 'Mock exercise with 5.5 hours safety floor' : `Mock exercise for ${sessionId}`,
}));

describe('TherapyCommand', () => {
  let command: TherapyCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetSleepStates: jest.Mock;
  let mockAdaptMessageTone: jest.Mock;
  let mockGetProactiveInsights: jest.Mock;
  let mockIsThirdWaveIndicated: jest.Mock;
  let mockRecommendThirdWaveApproach: jest.Mock;
  let mockEstimateArousalProfile: jest.Mock;
  let mockInitializeMBTI: jest.Mock;
  let mockInitializeACTI: jest.Mock;
  let mockInitializeMCT: jest.Mock;
  let mockGetACTISessionSummary: jest.Mock;
  let mockGetMBTIPlan: jest.Mock;
  let mockGetMCTSessionSummary: jest.Mock;
  let mockGetProgressReport: jest.Mock;
  let mockGetMetacognitiveEngine: jest.Mock;
  let mockGetMBTIWeeklySummary: jest.Mock;

  beforeEach(() => {
    command = new TherapyCommand();

    // Create mocks
    mockGetSession = jest.fn();
    mockGetSleepStates = jest.fn().mockReturnValue([]);
    mockAdaptMessageTone = jest.fn();
    mockGetProactiveInsights = jest.fn().mockReturnValue([]);
    mockIsThirdWaveIndicated = jest.fn().mockReturnValue(false);
    mockRecommendThirdWaveApproach = jest.fn().mockReturnValue(null);
    mockEstimateArousalProfile = jest.fn().mockReturnValue({ available: false });
    mockInitializeMBTI = jest.fn().mockReturnValue({
      startDate: '2026-02-06',
      currentWeek: 1,
      totalWeeks: 8,
      dailyPracticeTarget: 20,
    });
    mockInitializeACTI = jest.fn().mockReturnValue({
      startDate: '2026-02-06',
      currentSession: 1,
      totalSessions: 6,
    });
    mockInitializeMCT = jest.fn().mockReturnValue({
      startDate: '2026-02-06',
      currentSession: 1,
      totalSessions: 8,
    });
    mockGetACTISessionSummary = jest.fn().mockReturnValue({
      keyTakeaways: ['Принятие снижает борьбу', 'Дефузия от мыслей'],
    });
    mockGetMBTIPlan = jest.fn().mockReturnValue({
      currentWeek: 1,
      totalWeeks: 8,
      dailyPracticeTarget: 20,
    });
    mockGetMCTSessionSummary = jest.fn().mockReturnValue({
      keyTakeaways: ['Отложите беспокойство на утро', 'Наблюдайте за мыслями'],
    });
    mockGetProgressReport = jest.fn().mockReturnValue({
      weekNumber: 3,
      isiChange: -5,
      sleepEfficiencyChange: 8,
      adherence: 0.85,
    });
    mockGetMetacognitiveEngine = jest.fn().mockReturnValue({
      activateMCT: jest.fn(),
      getMCTStatus: jest.fn().mockReturnValue({
        active: true,
        currentWeek: 1,
        components: {
          worryPostponement: { sessions: 2, streak: 1 },
          att: { sessions: 1, level: 'selective' },
          detachedMindfulness: { sessions: 1, mastery: 0.3 },
          mcq30: { assessmentDue: false },
        },
        dailyRecommendations: [],
      }),
    });
    mockGetMBTIWeeklySummary = jest.fn().mockReturnValue({
      practiceMinutes: 120,
      practiceAdherence: 0.8,
      sleepQualityImprovement: 0.15,
    });

    // Create mock context
    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getSleepStates: mockGetSleepStates,
        adaptMessageTone: mockAdaptMessageTone,
        getProactiveInsights: mockGetProactiveInsights,
        isThirdWaveIndicated: mockIsThirdWaveIndicated,
        recommendThirdWaveApproach: mockRecommendThirdWaveApproach,
        estimateArousalProfile: mockEstimateArousalProfile,
        initializeMBTI: mockInitializeMBTI,
        initializeACTI: mockInitializeACTI,
        initializeMCT: mockInitializeMCT,
        getACTISessionSummary: mockGetACTISessionSummary,
        getMBTIPlan: mockGetMBTIPlan,
        getMCTSessionSummary: mockGetMCTSessionSummary,
        getProgressReport: mockGetProgressReport,
        getMetacognitiveEngine: mockGetMetacognitiveEngine,
        getMBTIWeeklySummary: mockGetMBTIWeeklySummary,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('therapy');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('КПТ-И');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('session');
      expect(command.aliases).toContain('терапия');
      expect(command.aliases).toContain('сессия');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should have all therapy steps defined', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('core_intro');
      expect(command.steps).toContain('core_content');
      expect(command.steps).toContain('core_exercise');
      expect(command.steps).toContain('core_homework');
      expect(command.steps).toContain('core_complete');
      expect(command.steps).toContain('progress_review');
    });
  });

  // ==========================================================================
  // EXECUTE (SESSION CHECK)
  // ==========================================================================
  describe('Execute', () => {
    it('should show no-session message when session missing', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
      expect(result.message).toContain('/start');
    });

    it('should show therapy menu when session exists', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('6-недельная программа');
    });
  });

  // ==========================================================================
  // THERAPY MENU
  // ==========================================================================
  describe('Therapy Menu', () => {
    beforeEach(() => {
      // Week 1 by default (no therapyWeek = 1)
      mockGetSession.mockReturnValue({ therapyWeek: 1 });
    });

    it('should show all 6 core sessions', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Core 1');
      expect(result.message).toContain('Core 2');
      expect(result.message).toContain('Core 3');
      expect(result.message).toContain('Core 4');
      expect(result.message).toContain('Core 5');
      expect(result.message).toContain('Core 6');
    });

    it('should show progress bar', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.message).toContain('Неделя');
      expect(result.message).toContain('из 8');
    });

    it('should have buttons for each session', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const sessionButtons = buttons.filter((b) => b.callbackData?.includes('start_core'));

      // Week 1 user should have 1 unlocked session
      expect(sessionButtons.length).toBeGreaterThan(0);
    });

    it('should show locked sessions', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const lockedButtons = buttons.filter((b) => b.callbackData?.includes('locked'));

      // Most sessions should be locked for week 1
      expect(lockedButtons.length).toBeGreaterThan(0);
    });

    it('should have progress review button', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const progressButton = buttons.find((b) => b.callbackData === 'therapy:progress');

      expect(progressButton).toBeDefined();
      expect(progressButton?.text).toContain('прогресс');
    });

    it('should have evidence base button', async () => {
      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const evidenceButton = buttons.find((b) => b.callbackData === 'therapy:evidence_overview');

      expect(evidenceButton).toBeDefined();
      expect(evidenceButton?.text).toContain('Доказательная');
    });
  });

  // ==========================================================================
  // SESSION UNLOCK PROGRESSION
  // ==========================================================================
  describe('Session Unlock Progression', () => {
    it('should show current session with ▶️ marker', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });

      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.message).toContain('▶️');
    });

    it('should show locked sessions with 🔒 marker', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });

      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.message).toContain('🔒');
    });
  });

  // ==========================================================================
  // THIRD-WAVE THERAPY (NON-RESPONDERS)
  // ==========================================================================
  describe('Third-Wave Therapy Menu', () => {
    it('should show third-wave option when indicated (Week 6+)', async () => {
      // getCurrentWeek reads therapyWeek directly from session
      mockGetSession.mockReturnValue({ therapyWeek: 6 });
      mockIsThirdWaveIndicated.mockReturnValue(true);

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const thirdWaveButton = buttons.find((b) =>
        b.callbackData?.includes('third_wave_menu')
      );

      expect(thirdWaveButton).toBeDefined();
      expect(thirdWaveButton?.text).toContain('Альтернативные подходы');
    });

    it('should NOT show third-wave before Week 6', async () => {
      // Week 1 by default (no therapyWeek set)
      mockGetSession.mockReturnValue({});
      mockIsThirdWaveIndicated.mockReturnValue(false);

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const thirdWaveButton = buttons.find((b) =>
        b.callbackData?.includes('third_wave_menu')
      );

      expect(thirdWaveButton).toBeUndefined();
    });

    it('should show all three third-wave options in menu', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_menu',
        {}
      );

      expect(result.success).toBe(true);
      // Check Russian titles from clinical content
      expect(result.message).toContain('Терапия осознанности');
      expect(result.message).toContain('Терапия принятия');
      expect(result.message).toContain('Метакогнитивная терапия');
    });

    it('should have buttons for each therapy type', async () => {
      mockGetSession.mockReturnValue({ plan: null });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_menu',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData?.includes('third_wave_info:mbti'))).toBeDefined();
      expect(buttons.find((b) => b.callbackData?.includes('third_wave_info:acti'))).toBeDefined();
      expect(buttons.find((b) => b.callbackData?.includes('third_wave_info:mct'))).toBeDefined();
    });

    it('should show therapy details when info requested', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_info:mbti',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Терапия осознанности');
      // Format: "📊 *Структура:* 8 сессий"
      expect(result.message).toContain('8 сессий');
    });

    it('should show contraindications for therapy', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_info:mbti',
        {}
      );

      // The header uses "⚠️ *Противопоказания*"
      expect(result.message).toMatch(/Противопоказан/i);
    });

    it('should have start button in therapy info', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_info:acti',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find((b) => b.callbackData === 'therapy:start_acti');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать');
    });
  });

  // ==========================================================================
  // THIRD-WAVE INITIALIZATION
  // ==========================================================================
  describe('Third-Wave Therapy Initialization', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });
    });

    it('should require 7 days of baseline data', async () => {
      mockGetSleepStates.mockReturnValue([1, 2, 3, 4, 5]); // Only 5 entries

      const result = await command.handleCallback(
        mockContext,
        'therapy:start_mbti',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('7');
    });

    it('should initialize MBTI when enough data', async () => {
      mockGetSleepStates.mockReturnValue([1, 2, 3, 4, 5, 6, 7, 8]);

      const result = await command.handleCallback(
        mockContext,
        'therapy:start_mbti',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockInitializeMBTI).toHaveBeenCalled();
      expect(result.message).toContain('осознанност');
    });

    it('should initialize ACT-I when enough data', async () => {
      mockGetSleepStates.mockReturnValue([1, 2, 3, 4, 5, 6, 7]);

      const result = await command.handleCallback(
        mockContext,
        'therapy:start_acti',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockInitializeACTI).toHaveBeenCalled();
    });

    it('should initialize MCT when enough data', async () => {
      mockGetSleepStates.mockReturnValue([1, 2, 3, 4, 5, 6, 7]);

      const result = await command.handleCallback(
        mockContext,
        'therapy:start_mct',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockInitializeMCT).toHaveBeenCalled();
    });

    it('should fail gracefully when session missing', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.handleCallback(
        mockContext,
        'therapy:start_mbti',
        {}
      );

      expect(result.success).toBe(false);
      // Error is returned in the error field, not message
      expect(result.error).toBeDefined();
    });
  });

  // ==========================================================================
  // WEEKLY SRT REVIEW
  // ==========================================================================
  describe('Weekly SRT Review', () => {
    it('should show SRT review button from Week 2 when plan exists', async () => {
      // therapyWeek is used by getCurrentWeek
      mockGetSession.mockReturnValue({ therapyWeek: 3, plan: {} });

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const srtButton = buttons.find((b) => b.callbackData === 'therapy:weekly_review');

      expect(srtButton).toBeDefined();
      expect(srtButton?.text).toContain('SRT');
    });

    it('should NOT show SRT review in Week 1', async () => {
      // No therapyWeek = Week 1
      mockGetSession.mockReturnValue({});

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const srtButton = buttons.find((b) => b.callbackData === 'therapy:weekly_review');

      expect(srtButton).toBeUndefined();
    });
  });

  // ==========================================================================
  // COGNITIVE THERAPY TOOLS
  // ==========================================================================
  describe('Cognitive Therapy Tools', () => {
    it('should show behavioral experiment from Week 5', async () => {
      // Use therapyWeek for getCurrentWeek
      mockGetSession.mockReturnValue({ therapyWeek: 5 });
      mockIsThirdWaveIndicated.mockReturnValue(false);

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const experimentButton = buttons.find((b) =>
        b.callbackData === 'therapy:behavioral_experiment'
      );

      expect(experimentButton).toBeDefined();
      expect(experimentButton?.text).toContain('эксперимент');
    });

    it('should show hygiene education from Week 4', async () => {
      // Use therapyWeek for getCurrentWeek
      mockGetSession.mockReturnValue({ therapyWeek: 4 });
      mockIsThirdWaveIndicated.mockReturnValue(false);

      const result = await command.handleStep(mockContext, 'menu', {});

      const buttons = result.keyboard?.flat() ?? [];
      const hygieneButton = buttons.find((b) =>
        b.callbackData === 'therapy:hygiene_education'
      );

      expect(hygieneButton).toBeDefined();
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });
    });

    it('should handle start_core callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:start_core:overview',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.currentCore).toBe('overview');
    });

    it('should handle continue callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:continue',
        { currentCore: 'overview' }
      );

      expect(result.success).toBe(true);
    });

    it('should handle menu callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:menu',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('6-недельная');
    });

    it('should handle progress callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:progress',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle locked callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:locked:sleep_behavior_2',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('заблокирован');
    });

    it('should handle invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should require core ID for start_core', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:start_core:',
        {}
      );

      // Empty string is falsy in JS, so !'' is true
      // This returns error 'Core ID required'
      expect(result.success).toBe(false);
      expect(result.error).toContain('Core ID required');
    });
  });

  // ==========================================================================
  // THIRD-WAVE THERAPY SESSION HANDLERS
  // ==========================================================================
  describe('Third-Wave Session Handlers', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });
    });

    it('should handle ACT-I hub callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:acti_hub',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('ACT-I');
    });

    it('should handle MCT hub callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:mct_hub',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('MCT');
    });

    it('should handle MBT-I hub callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'therapy:mbti_hub',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('MBT-I');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle unknown step', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });

      const result = await command.handleStep(mockContext, 'unknown_step', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });

    it('should handle therapy info for non-existent therapy', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });

      const result = await command.handleCallback(
        mockContext,
        'therapy:third_wave_info:invalid_therapy',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle unknown callback action', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 6 });
      mockGetSleepStates.mockReturnValue([1, 2, 3, 4, 5, 6, 7]);

      const result = await command.handleCallback(
        mockContext,
        'therapy:unknown_action',
        {}
      );

      // Should return error for unknown action
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ==========================================================================
  // PROACTIVE INSIGHTS
  // ==========================================================================
  describe('Proactive Insights', () => {
    it('should show insights when available', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 2 });
      mockGetProactiveInsights.mockReturnValue([
        { messageRu: 'Ваша эффективность сна улучшилась на 5%' },
      ]);

      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.message).toContain('Наблюдения Сони');
      expect(result.message).toContain('эффективность');
    });

    it('should work without insights', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });
      mockGetProactiveInsights.mockReturnValue([]);

      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Наблюдения Сони');
    });

    it('should handle insights error gracefully', async () => {
      mockGetSession.mockReturnValue({ therapyWeek: 1 });
      mockGetProactiveInsights.mockImplementation(() => {
        throw new Error('Insights service unavailable');
      });

      const result = await command.handleStep(mockContext, 'menu', {});

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(therapyCommand).toBeInstanceOf(TherapyCommand);
    });

    it('should have correct name', () => {
      expect(therapyCommand.name).toBe('therapy');
    });
  });
});
