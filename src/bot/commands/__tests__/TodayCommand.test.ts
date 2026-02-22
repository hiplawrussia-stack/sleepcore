/**
 * TodayCommand Tests
 * ==================
 *
 * Daily CBT-I Intervention tests with POMDP integration
 *
 * Tests verify:
 * - Session and intervention state handling
 * - Time-of-day awareness for personalized greetings
 * - Early Warning Signals (EWS) from PLRNN predictions
 * - Proactive JITAI insights
 * - XAI explanation (handleWhyExplanation)
 * - Intervention completion with adherence tracking
 * - Component help from centralized ClinicalContent
 * - Alternative intervention request
 *
 * Research basis:
 * - Spielman et al. (1987): Sleep Restriction Therapy
 * - JITAI meta-analysis: g=0.15 effect (van Genugten 2025)
 * - XAI improves patient trust (Lundberg 2020)
 *
 * @packageDocumentation
 */

import { TodayCommand, todayCommand } from '../TodayCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock ClinicalContent module
jest.mock('../../../modules/content/clinical/ClinicalContent', () => ({
  getCBTIComponentHelp: jest.fn((component: string) => {
    if (component === 'sleep_restriction') {
      return 'Sleep restriction помогает повысить эффективность сна. Начните с TIB = TST + 30 мин.';
    }
    return 'Общая помощь по компоненту';
  }),
  CBTI_COMPONENT_NAMES: {
    sleep_restriction: 'Ограничение сна',
    stimulus_control: 'Контроль стимулов',
    cognitive_restructuring: 'Когнитивная реструктуризация',
    sleep_hygiene: 'Гигиена сна',
    relaxation: 'Релаксация',
  },
  CBTI_COMPONENT_ICONS: {
    sleep_restriction: '🛏️',
    stimulus_control: '🚪',
    cognitive_restructuring: '🧠',
    sleep_hygiene: '🧹',
    relaxation: '🧘',
  },
  CBTI_COMPONENT_SELECTION_REASONS: {
    sleep_restriction: 'Анализ твоего дневника показал, что эффективность сна ниже 85%. Ограничение времени в постели поможет консолидировать сон.',
    stimulus_control: 'Ты проводишь много времени в постели без сна. Важно укрепить ассоциацию кровать = сон.',
    cognitive_restructuring: 'Замечены тревожные мысли о сне. Работа с когнициями поможет снизить напряжение.',
    sleep_hygiene: 'Базовые правила гигиены сна создают основу для здорового сна.',
    relaxation: 'Высокий уровень напряжения перед сном. Техники релаксации помогут подготовиться ко сну.',
  },
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    greet: () => ({ emoji: '🦉', text: 'Привет! Как дела?' }),
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    warning: (text: string) => `⚠️ ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    tip: (text: string) => `💡 ${text}`,
  },
}));

describe('TodayCommand', () => {
  let command: TodayCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetNextIntervention: jest.Mock;
  let mockGetSleepPrediction: jest.Mock;
  let mockGetBeliefState: jest.Mock;
  let mockAdaptMessageToneWithContext: jest.Mock;
  let mockTrackStimulusControlAdherence: jest.Mock;
  let mockGetSleepStates: jest.Mock;
  let mockRunProactiveAnalysis: jest.Mock;

  const mockIntervention = {
    component: 'sleep_restriction',
    action: 'Сократите время в постели до 6 часов. Ложитесь в 00:00, вставайте в 06:00.',
    rationale: 'Это поможет консолидировать сон и повысить его эффективность до 85%+.',
    priority: 3,
    timing: 'tonight' as const,
    personalizationScore: 0.85,
  };

  const mockPrediction = {
    trend: 'stable' as const,
    deteriorationRisk: 0.2,
    earlyWarnings: [],
    predictedSleepEfficiency: { value: 82, lower95: 75, upper95: 89, confidence: 0.85 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    command = new TodayCommand();

    mockGetSession = jest.fn().mockReturnValue({
      userId: '12345',
      currentWeek: 2,
    });

    mockGetNextIntervention = jest.fn().mockResolvedValue(mockIntervention);

    mockGetSleepPrediction = jest.fn().mockReturnValue({
      predict: jest.fn().mockReturnValue(mockPrediction),
    });

    mockGetBeliefState = jest.fn().mockReturnValue({});

    mockAdaptMessageToneWithContext = jest.fn().mockResolvedValue('Привет! Как себя чувствуешь?');

    mockTrackStimulusControlAdherence = jest.fn().mockReturnValue({
      overallAdherence: 0.85,
    });

    mockGetSleepStates = jest.fn().mockReturnValue([]);

    mockRunProactiveAnalysis = jest.fn().mockResolvedValue({
      insights: [],
      riskAlerts: [],
    });

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getNextIntervention: mockGetNextIntervention,
        getSleepPrediction: mockGetSleepPrediction,
        getBeliefState: mockGetBeliefState,
        adaptMessageToneWithContext: mockAdaptMessageToneWithContext,
        trackStimulusControlAdherence: mockTrackStimulusControlAdherence,
        getSleepStates: mockGetSleepStates,
        runProactiveAnalysis: mockRunProactiveAnalysis,
        getSeasonalContext: jest.fn().mockReturnValue(null),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('today');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Задание на сегодня');
    });

    it('should have helpful aliases', () => {
      expect(command.aliases).toContain('daily');
      expect(command.aliases).toContain('task');
      expect(command.aliases).toContain('сегодня');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should have initial step', () => {
      expect(command.steps).toContain('initial');
    });
  });

  // ==========================================================================
  // EXECUTE - NO SESSION
  // ==========================================================================
  describe('Execute - No Session', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue(null);
    });

    it('should show no session message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
    });

    it('should suggest starting program', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/start');
      expect(result.message).toContain('7 дней');
    });

    it('should have start and diary buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'start:begin');
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать программу');
      expect(diaryButton).toBeDefined();
    });
  });

  // ==========================================================================
  // EXECUTE - NO INTERVENTION
  // ==========================================================================
  describe('Execute - No Intervention', () => {
    beforeEach(() => {
      mockGetNextIntervention.mockResolvedValue(null);
    });

    it('should show data collection message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Собираем данные');
    });

    it('should mention 7 days requirement', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('7 дней');
    });

    it('should suggest alternative activities', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/diary');
      expect(result.message).toContain('/relax');
      expect(result.message).toContain('/mindful');
    });

    it('should have diary and relax buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');
      const relaxButton = buttons.find(b => b.callbackData === 'relax:start');

      expect(diaryButton).toBeDefined();
      expect(relaxButton).toBeDefined();
    });
  });

  // ==========================================================================
  // EXECUTE - SHOW INTERVENTION
  // ==========================================================================
  describe('Execute - Show Intervention', () => {
    it('should show intervention successfully', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Соня');
      expect(result.message).toContain('Задание на сегодня');
    });

    it('should show component name and icon', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🛏️');
      expect(result.message).toContain('Ограничение сна');
    });

    it('should show timing', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🌙');
      expect(result.message).toContain('Сегодня вечером');
    });

    it('should show priority stars', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('⭐⭐⭐'); // priority = 3
    });

    it('should show action text', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Сократите время в постели до 6 часов');
    });

    it('should show rationale', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('консолидировать сон');
    });

    it('should have action buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const doneButton = buttons.find(b => b.callbackData === 'today:done');
      const whyButton = buttons.find(b => b.callbackData === 'today:why');
      const helpButton = buttons.find(b => b.callbackData === 'today:help');
      const altButton = buttons.find(b => b.callbackData === 'today:alternative');

      expect(doneButton).toBeDefined();
      expect(doneButton?.text).toContain('Выполнено');
      expect(whyButton).toBeDefined();
      expect(whyButton?.text).toContain('Почему');
      expect(helpButton).toBeDefined();
      expect(helpButton?.text).toContain('помощь');
      expect(altButton).toBeDefined();
      expect(altButton?.text).toContain('Другое');
    });

    it('should include metadata with intervention', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata?.lastIntervention).toEqual(mockIntervention);
      expect(result.metadata?.prediction).toEqual(mockPrediction);
    });

    it('should adapt greeting tone with AdaptivePersona', async () => {
      await command.execute(mockContext);

      expect(mockAdaptMessageToneWithContext).toHaveBeenCalledWith(
        '12345',
        'Привет! Как дела?'
      );
    });

    it('should handle tone adaptation failure gracefully', async () => {
      mockAdaptMessageToneWithContext.mockRejectedValue(new Error('Service error'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Привет! Как дела?'); // Falls back to base greeting
    });
  });

  // ==========================================================================
  // TIME-OF-DAY AWARENESS
  // ==========================================================================
  describe('Time-of-Day Awareness', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should detect morning (6-12)', async () => {
      const mockDate = class extends Date {
        getHours() { return 8; }
      };
      global.Date = mockDate as DateConstructor;

      const freshCommand = new TodayCommand();
      await freshCommand.execute(mockContext);

      // Check that greet was called with morning context
      expect(mockContext.sleepCore.adaptMessageToneWithContext).toHaveBeenCalled();
    });

    it('should support immediate timing', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        timing: 'immediate',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('⚡');
      expect(result.message).toContain('Сейчас');
    });

    it('should support this_week timing', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        timing: 'this_week',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('📅');
      expect(result.message).toContain('На этой неделе');
    });
  });

  // ==========================================================================
  // EARLY WARNING SIGNALS
  // ==========================================================================
  describe('Early Warning Signals', () => {
    it('should not show EWS when no warnings', async () => {
      const result = await command.execute(mockContext);

      // No EWS block when earlyWarnings is empty
      expect(result.message).not.toContain('Важное наблюдение');
    });

    it('should show high severity warnings', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: jest.fn().mockReturnValue({
          ...mockPrediction,
          trend: 'declining',
          earlyWarnings: [
            {
              severity: 'high',
              strength: 0.8,
              messageRu: 'Обнаружено ухудшение качества сна',
              recommendation: 'Строго соблюдайте время подъёма',
            },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Важное наблюдение');
      expect(result.message).toContain('ухудшение качества сна');
      expect(result.message).toContain('Строго соблюдайте');
    });

    it('should show critical warnings with red icon', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: jest.fn().mockReturnValue({
          ...mockPrediction,
          trend: 'critical',
          earlyWarnings: [
            {
              severity: 'critical',
              strength: 0.9,
              messageRu: 'Критическое снижение эффективности сна',
              recommendation: 'Немедленно обратитесь к специалисту',
            },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Критическое снижение');
    });

    it('should show deterioration risk message when high', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: jest.fn().mockReturnValue({
          ...mockPrediction,
          deteriorationRisk: 0.75,
          earlyWarnings: [
            {
              severity: 'high',
              strength: 0.7,
              messageRu: 'Повышенный риск ухудшения',
            },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Сегодня особенно важно следовать программе');
    });

    it('should handle null prediction gracefully', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: jest.fn().mockReturnValue(null),
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should not crash, just no EWS section
    });
  });

  // ==========================================================================
  // PROACTIVE INSIGHTS (JITAI)
  // ==========================================================================
  describe('Proactive Insights (JITAI)', () => {
    it('should not show insights when insufficient data', async () => {
      mockGetSleepStates.mockReturnValue([{}, {}]); // Less than 3 days

      const result = await command.execute(mockContext);

      expect(mockRunProactiveAnalysis).not.toHaveBeenCalled();
    });

    it('should show today-urgency insights', async () => {
      mockGetSleepStates.mockReturnValue([{}, {}, {}, {}]); // 4 days
      mockRunProactiveAnalysis.mockResolvedValue({
        insights: [
          {
            urgency: 'today',
            titleRu: 'Важно сегодня',
            messageRu: 'Постарайтесь лечь вовремя',
          },
        ],
        riskAlerts: [],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Важно сегодня');
      expect(result.message).toContain('Постарайтесь лечь вовремя');
    });

    it('should show immediate insights with lightning icon', async () => {
      mockGetSleepStates.mockReturnValue([{}, {}, {}, {}]);
      mockRunProactiveAnalysis.mockResolvedValue({
        insights: [
          {
            urgency: 'immediate',
            titleRu: 'Срочное внимание',
            messageRu: 'Требуется немедленное действие',
          },
        ],
        riskAlerts: [],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('⚡');
      expect(result.message).toContain('Срочное внимание');
    });

    it('should show critical risk alerts', async () => {
      mockGetSleepStates.mockReturnValue([{}, {}, {}, {}]);
      mockRunProactiveAnalysis.mockResolvedValue({
        insights: [],
        riskAlerts: [
          {
            severity: 'critical',
            messageRu: 'Критический уровень утомления',
          },
        ],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Критический уровень утомления');
    });

    it('should handle proactive analysis failure gracefully', async () => {
      mockGetSleepStates.mockReturnValue([{}, {}, {}, {}]);
      mockRunProactiveAnalysis.mockRejectedValue(new Error('Analysis failed'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should not crash, just no proactive section
    });
  });

  // ==========================================================================
  // CALLBACK: WHY (XAI)
  // ==========================================================================
  describe('Callback: Why (XAI Explanation)', () => {
    it('should show explanation with rationale', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:why',
        { lastIntervention: mockIntervention }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Почему именно это задание');
    });

    it('should explain sleep restriction component', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:why',
        { lastIntervention: mockIntervention }
      );

      expect(result.message).toContain('эффективность сна');
      expect(result.message).toContain('85%');
    });

    it('should show algorithm confidence', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:why',
        { lastIntervention: mockIntervention }
      );

      expect(result.message).toContain('Уверенность алгоритма');
      expect(result.message).toContain('данных дневника сна');
    });

    it('should have understood and back buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:why',
        { lastIntervention: mockIntervention }
      );

      const buttons = result.keyboard?.flat() ?? [];
      const understoodButton = buttons.find(b => b.callbackData === 'today:understood');
      const backButton = buttons.find(b => b.callbackData === 'today:show');

      expect(understoodButton).toBeDefined();
      expect(backButton).toBeDefined();
    });

    it('should handle missing intervention gracefully', async () => {
      mockGetNextIntervention.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'today:why',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Нет активной рекомендации');
    });

    it('should handle missing session', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.handleCallback(
        mockContext,
        'today:why',
        { lastIntervention: mockIntervention }
      );

      expect(result.message).toContain('Сессия не найдена');
    });
  });

  // ==========================================================================
  // CALLBACK: DONE
  // ==========================================================================
  describe('Callback: Done (Completion)', () => {
    it('should mark intervention as done', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:done',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Отлично');
      expect(result.message).toContain('выполненное');
    });

    it('should track stimulus control adherence', async () => {
      await command.handleCallback(mockContext, 'today:done', {});

      expect(mockTrackStimulusControlAdherence).toHaveBeenCalledWith('12345');
    });

    it('should show adherence percentage', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:done',
        {}
      );

      expect(result.message).toContain('85%');
    });

    it('should have diary and progress buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:done',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');
      const progressButton = buttons.find(b => b.callbackData === 'progress:show');

      expect(diaryButton).toBeDefined();
      expect(progressButton).toBeDefined();
    });

    it('should include completion metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:done',
        {}
      );

      expect(result.metadata?.interventionCompleted).toBe(true);
    });

    it('should handle no adherence report', async () => {
      mockTrackStimulusControlAdherence.mockReturnValue(null);

      const result = await command.handleCallback(
        mockContext,
        'today:done',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Приверженность');
    });
  });

  // ==========================================================================
  // CALLBACK: HELP
  // ==========================================================================
  describe('Callback: Help', () => {
    it('should show component-specific help', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:help',
        { lastIntervention: mockIntervention }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sleep restriction');
      expect(result.message).toContain('TIB = TST + 30');
    });

    it('should use centralized ClinicalContent', async () => {
      const { getCBTIComponentHelp } = require('../../../modules/content/clinical/ClinicalContent');

      await command.handleCallback(
        mockContext,
        'today:help',
        { lastIntervention: mockIntervention }
      );

      expect(getCBTIComponentHelp).toHaveBeenCalledWith('sleep_restriction');
    });

    it('should show default help for unknown component', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:help',
        { lastIntervention: { component: 'unknown_component' } }
      );

      expect(result.message).toContain('Общая помощь');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:help',
        { lastIntervention: mockIntervention }
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'today:show');

      expect(backButton).toBeDefined();
    });

    it('should invite user to describe difficulties', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:help',
        {}
      );

      expect(result.message).toContain('Напишите');
      expect(result.message).toContain('трудности');
    });
  });

  // ==========================================================================
  // CALLBACK: ALTERNATIVE
  // ==========================================================================
  describe('Callback: Alternative', () => {
    it('should request alternative intervention', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:alternative',
        {}
      );

      expect(result.success).toBe(true);
      // Should re-execute and show new intervention
      expect(mockGetNextIntervention).toHaveBeenCalled();
    });

    it('should show no alternatives when none available', async () => {
      mockGetNextIntervention.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'today:alternative',
        {}
      );

      expect(result.message).toContain('Альтернатив пока нет');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should reject invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should reject unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'today:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('HandleStep', () => {
    it('should execute on initial step', async () => {
      const result = await command.handleStep(
        mockContext,
        'initial',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Задание на сегодня');
    });

    it('should reject unknown step', async () => {
      const result = await command.handleStep(
        mockContext,
        'unknown_step',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });
  });

  // ==========================================================================
  // DIFFERENT CBT-I COMPONENTS
  // ==========================================================================
  describe('Different CBT-I Components', () => {
    it('should show stimulus control intervention', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        component: 'stimulus_control',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🚪');
      expect(result.message).toContain('Контроль стимулов');
    });

    it('should show cognitive restructuring intervention', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        component: 'cognitive_restructuring',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🧠');
      expect(result.message).toContain('Когнитивная реструктуризация');
    });

    it('should show sleep hygiene intervention', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        component: 'sleep_hygiene',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🧹');
      expect(result.message).toContain('Гигиена сна');
    });

    it('should show relaxation intervention', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        component: 'relaxation',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🧘');
      expect(result.message).toContain('Релаксация');
    });

    it('should handle unknown component gracefully', async () => {
      mockGetNextIntervention.mockResolvedValue({
        ...mockIntervention,
        component: 'future_component',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('📋'); // Default icon
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(todayCommand).toBeInstanceOf(TodayCommand);
    });

    it('should have correct name', () => {
      expect(todayCommand.name).toBe('today');
    });
  });
});
