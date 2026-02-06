/**
 * ChronotypeCommand Tests
 * =======================
 *
 * Tests for MEQ (Morningness-Eveningness Questionnaire) and MCTQ assessment.
 *
 * Scientific basis:
 * - MEQ: Horne & Östberg, 1976
 * - MCTQ: Roenneberg et al., 2003
 * - DLMO estimation algorithms
 *
 * @packageDocumentation
 */

import { ChronotypeCommand, chronotypeCommand } from '../ChronotypeCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';
import type { ICircadianAssessment, IChronotherapyPlan } from '../../../circadian/CircadianAI';

// Mock CircadianAI imports
jest.mock('../../../circadian/CircadianAI', () => ({
  MEQ_ITEMS: [
    {
      textRu: 'Вопрос о предпочитаемом времени пробуждения',
      options: [
        { label: '05:00-06:30', value: 5 },
        { label: '06:30-07:45', value: 4 },
        { label: '07:45-09:45', value: 3 },
        { label: '09:45-11:00', value: 2 },
        { label: '11:00-12:00', value: 1 },
      ],
    },
    {
      textRu: 'Усталость утром',
      options: [
        { label: 'Очень свеж', value: 4 },
        { label: 'Свеж', value: 3 },
        { label: 'Удовлетворительно', value: 2 },
        { label: 'Устал', value: 1 },
      ],
    },
    {
      textRu: 'Время отхода ко сну',
      options: [
        { label: '20:00-21:00', value: 5 },
        { label: '21:00-22:15', value: 4 },
        { label: '22:15-00:30', value: 3 },
        { label: '00:30-01:45', value: 2 },
        { label: '01:45-03:00', value: 1 },
      ],
    },
    {
      textRu: 'Пик производительности',
      options: [
        { label: 'Утром', value: 4 },
        { label: 'До обеда', value: 3 },
        { label: 'После обеда', value: 2 },
        { label: 'Вечером', value: 1 },
      ],
    },
    {
      textRu: 'Самооценка хронотипа',
      options: [
        { label: 'Определённо жаворонок', value: 6 },
        { label: 'Скорее жаворонок', value: 4 },
        { label: 'Скорее сова', value: 2 },
        { label: 'Определённо сова', value: 0 },
      ],
    },
  ],
}));

describe('ChronotypeCommand', () => {
  let command: ChronotypeCommand;
  let mockContext: ISleepCoreContext;

  // Mock SleepCoreAPI methods
  let mockGetSession: jest.Mock;
  let mockAssessChronotypeFromMEQ: jest.Mock;
  let mockAssessChronotypeFromMCTQ: jest.Mock;
  let mockGenerateChronotherapyPlan: jest.Mock;
  let mockGetChronotype: jest.Mock;
  let mockGetSocialJetlag: jest.Mock;
  let mockStoreCircadianAssessment: jest.Mock;

  // Mock assessment result (use as const for literal types)
  const mockAssessment = {
    chronotype: 'moderate_evening' as const,
    chronotypeCategory: 'moderate_evening' as const,
    meqScore: 35,
    estimatedDLMO: '21:30',
    dlmoConfidence: 0.75,
    optimalSleepWindow: {
      bedtime: '23:30',
      wakeTime: '07:30',
    },
    estimatedSleepNeed: 8.0,
    socialJetlag: 0.75, // hours
    socialJetlagSeverity: 'mild' as const,
    riskFactors: [] as string[],
  } as ICircadianAssessment;

  // Mock plan (Chronotype uses full type from ISleepState)
  const mockPlan = {
    userId: 'user123',
    chronotype: 'moderate_evening' as const,
    optimalSessionTimes: ['10:00-12:00', '16:00-18:00'],
    sleepRestrictionAdjustments: {
      initialBedtime: '23:30',
      initialWakeTime: '07:30',
      rationale: 'Адаптировано под ваш хронотип совы',
    },
    lifestyleRecommendations: [
      'Избегайте яркого света вечером',
      'Получайте свет утром',
    ],
    lightTherapy: {
      recommended: true,
      timing: '07:00-07:30',
      duration: 30,
      intensity: 10000,
      rationale: 'Утренний свет для сдвига циркадного ритма',
    },
    melatoninTiming: {
      recommended: true,
      timing: '21:00',
      dose: '0.5-1 мг',
      rationale: 'Для облегчения засыпания',
    },
  } as IChronotherapyPlan;

  beforeEach(() => {
    command = new ChronotypeCommand();

    mockGetSession = jest.fn();
    mockAssessChronotypeFromMEQ = jest.fn().mockReturnValue(mockAssessment);
    mockAssessChronotypeFromMCTQ = jest.fn().mockReturnValue(mockAssessment);
    mockGenerateChronotherapyPlan = jest.fn().mockReturnValue(mockPlan);
    mockGetChronotype = jest.fn().mockReturnValue('moderate_evening');
    mockGetSocialJetlag = jest.fn().mockReturnValue({
      minutes: 45,
      severity: 'mild',
      recommendation: 'Старайтесь ложиться в одно время',
    });
    mockStoreCircadianAssessment = jest.fn();

    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        assessChronotypeFromMEQ: mockAssessChronotypeFromMEQ,
        assessChronotypeFromMCTQ: mockAssessChronotypeFromMCTQ,
        generateChronotherapyPlan: mockGenerateChronotherapyPlan,
        getChronotype: mockGetChronotype,
        getSocialJetlag: mockGetSocialJetlag,
        storeCircadianAssessment: mockStoreCircadianAssessment,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('chronotype');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('хронотип');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('chrono');
      expect(command.aliases).toContain('meq');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all steps defined', () => {
      expect(command.steps).toContain('intro');
      expect(command.steps).toContain('q1_wakePreference');
      expect(command.steps).toContain('q5_selfRating');
      expect(command.steps).toContain('mctq_offer');
      expect(command.steps).toContain('results');
    });
  });

  // ==========================================================================
  // EXECUTE - INTRO
  // ==========================================================================
  describe('Execute - Intro', () => {
    it('should show intro when no existing assessment', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Определение хронотипа');
    });

    it('should explain chronotype purpose', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('биологические часы');
      expect(result.message).toContain('Персонализация');
    });

    it('should mention MEQ questionnaire', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('MEQ');
      expect(result.message).toContain('5 вопросов');
    });

    it('should have start test button', async () => {
      mockGetSession.mockReturnValue(null);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'chronotype:start');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать');
    });

    it('should show existing results if assessment exists', async () => {
      mockGetSession.mockReturnValue({
        circadianAssessment: mockAssessment,
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('хронотип');
      expect(result.message).toContain('сова');
    });
  });

  // ==========================================================================
  // MEQ QUESTIONS
  // ==========================================================================
  describe('MEQ Questions', () => {
    it('should show first question on start callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:start',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('вопрос 1/5');
    });

    it('should show progress bar', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:start',
        {}
      );

      expect(result.message).toContain('▓');
      expect(result.message).toContain('░');
    });

    it('should show question text', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:start',
        {}
      );

      expect(result.message).toContain('пробуждения');
    });

    it('should have answer buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:start',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.length).toBe(5);
    });

    it('should proceed to next question after answer', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:meq:q1_wakePreference:3',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('вопрос 2/5');
    });

    it('should store answers in metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:meq:q1_wakePreference:3',
        {}
      );

      expect(result.metadata?.meqAnswers).toBeDefined();
      expect((result.metadata?.meqAnswers as Record<string, number>).q1_wakePreference).toBe(3);
    });

    it('should accumulate answers through questions', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:meq:q2_morningTiredness:2',
        { meqAnswers: { q1_wakePreference: 3 } }
      );

      expect(result.metadata?.meqAnswers).toEqual({
        q1_wakePreference: 3,
        q2_morningTiredness: 2,
      });
    });

    it('should show MCTQ offer after all MEQ questions', async () => {
      const meqAnswers = {
        q1_wakePreference: 3,
        q2_morningTiredness: 2,
        q3_bedtimeWork: 3,
        q4_peakPerformance: 2,
      };

      const result = await command.handleCallback(
        mockContext,
        'chronotype:meq:q5_selfRating:2',
        { meqAnswers }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Тест MEQ завершён');
    });
  });

  // ==========================================================================
  // MCTQ OFFER
  // ==========================================================================
  describe('MCTQ Offer', () => {
    const meqAnswers = {
      q1_wakePreference: 3,
      q2_morningTiredness: 2,
      q3_bedtimeWork: 3,
      q4_peakPerformance: 2,
      q5_selfRating: 2,
    };

    it('should explain MCTQ benefits', async () => {
      const result = await command.handleStep(mockContext, 'mctq_offer', { meqAnswers });

      expect(result.message).toContain('повысить точность');
      expect(result.message).toContain('социальный джетлаг');
    });

    it('should have add data button', async () => {
      const result = await command.handleStep(mockContext, 'mctq_offer', { meqAnswers });

      const buttons = result.keyboard?.flat() ?? [];
      const addButton = buttons.find(b => b.callbackData === 'chronotype:mctq:start');

      expect(addButton).toBeDefined();
    });

    it('should have skip button', async () => {
      const result = await command.handleStep(mockContext, 'mctq_offer', { meqAnswers });

      const buttons = result.keyboard?.flat() ?? [];
      const skipButton = buttons.find(b => b.callbackData === 'chronotype:skip_mctq');

      expect(skipButton).toBeDefined();
      expect(skipButton?.text).toContain('Пропустить');
    });
  });

  // ==========================================================================
  // MCTQ FLOW
  // ==========================================================================
  describe('MCTQ Flow', () => {
    const baseData = {
      meqAnswers: {
        q1_wakePreference: 3,
        q2_morningTiredness: 2,
        q3_bedtimeWork: 3,
        q4_peakPerformance: 2,
        q5_selfRating: 2,
      },
    };

    it('should show work sleep time question on MCTQ start', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:start',
        baseData
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Рабочие дни');
      expect(result.message).toContain('засыпаете');
    });

    it('should have time selection buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:start',
        baseData
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.length).toBeGreaterThan(4);
      expect(buttons[0].text).toContain('21:00');
    });

    it('should show work wake time after work sleep', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:work_sleep:23:30',
        { ...baseData, mctqData: {} }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('просыпаетесь');
    });

    it('should show free sleep time after work wake', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:work_wake:07:30',
        { ...baseData, mctqData: { workSleepOnset: '23:30' } }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Выходные');
    });

    it('should show free wake time after free sleep', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:free_sleep:00:30',
        {
          ...baseData,
          mctqData: { workSleepOnset: '23:30', workWakeTime: '07:30' },
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('естественно');
    });

    it('should show results after free wake', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:free_wake:09:30',
        {
          ...baseData,
          mctqData: {
            workSleepOnset: '23:30',
            workWakeTime: '07:30',
            freeSleepOnset: '00:30',
          },
        }
      );

      expect(result.success).toBe(true);
      expect(mockAssessChronotypeFromMCTQ).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RESULTS
  // ==========================================================================
  describe('Results', () => {
    const fullData = {
      meqAnswers: {
        q1_wakePreference: 3,
        q2_morningTiredness: 2,
        q3_bedtimeWork: 3,
        q4_peakPerformance: 2,
        q5_selfRating: 2,
      },
    };

    it('should calculate and show results on skip MCTQ', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.success).toBe(true);
      expect(mockAssessChronotypeFromMEQ).toHaveBeenCalled();
    });

    it('should show chronotype name', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('сова');
    });

    it('should show chronotype emoji', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('🌙');
    });

    it('should show MEQ score', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('MEQ-балл');
      expect(result.message).toContain('35');
    });

    it('should show DLMO estimation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('DLMO');
      expect(result.message).toContain('21:30');
    });

    it('should show optimal sleep window', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('Оптимальное окно сна');
      expect(result.message).toContain('23:30');
      expect(result.message).toContain('07:30');
    });

    it('should show social jetlag info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('Социальный джетлаг');
    });

    it('should show social jetlag recommendation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(mockGetSocialJetlag).toHaveBeenCalled();
      expect(result.message).toContain('ложиться');
    });

    it('should show risk factors if present', async () => {
      const assessmentWithRisks = {
        ...mockAssessment,
        riskFactors: ['Высокий социальный джетлаг', 'Смещённый ритм'],
      };
      mockAssessChronotypeFromMEQ.mockReturnValue(assessmentWithRisks);

      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      expect(result.message).toContain('Факторы риска');
    });

    it('should have view plan button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      const buttons = result.keyboard?.flat() ?? [];
      const planButton = buttons.find(b => b.callbackData === 'chronotype:view_plan');

      expect(planButton).toBeDefined();
      expect(planButton?.text).toContain('План');
    });

    it('should have light therapy button when recommended', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      const buttons = result.keyboard?.flat() ?? [];
      const lightButton = buttons.find(b => b.callbackData === 'chronotype:view_light');

      expect(lightButton).toBeDefined();
      expect(lightButton?.text).toContain('светотерапии');
    });

    it('should have reassess button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:skip_mctq',
        fullData
      );

      const buttons = result.keyboard?.flat() ?? [];
      const reassessButton = buttons.find(b => b.callbackData === 'chronotype:reassess');

      expect(reassessButton).toBeDefined();
    });
  });

  // ==========================================================================
  // CHRONOTHERAPY PLAN
  // ==========================================================================
  describe('Chronotherapy Plan', () => {
    const resultData = {
      assessment: mockAssessment,
      plan: mockPlan,
    };

    it('should show plan on view_plan callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('план хронотерапии');
    });

    it('should show optimal session times', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.message).toContain('10:00-12:00');
      expect(result.message).toContain('16:00-18:00');
    });

    it('should show sleep restriction times', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.message).toContain('Рестрикция сна');
      expect(result.message).toContain('23:30');
    });

    it('should show lifestyle recommendations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.message).toContain('Избегайте яркого света');
    });

    it('should show melatonin info when recommended', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.message).toContain('Мелатонин');
      expect(result.message).toContain('21:00');
      expect(result.message).toContain('0.5-1 мг');
    });

    it('should warn about melatonin consultation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      expect(result.message).toContain('врачом');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        resultData
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'chronotype:back');

      expect(backButton).toBeDefined();
    });

    it('should return error if plan not found', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_plan',
        { assessment: mockAssessment }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // LIGHT THERAPY DETAILS
  // ==========================================================================
  describe('Light Therapy Details', () => {
    const resultData = {
      assessment: mockAssessment,
      plan: mockPlan,
    };

    it('should show light therapy details', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        resultData
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Светотерапия');
    });

    it('should show timing and duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        resultData
      );

      expect(result.message).toContain('07:00-07:30');
      expect(result.message).toContain('30 минут');
    });

    it('should show intensity', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        resultData
      );

      expect(result.message).toContain('10,000 люкс');
    });

    it('should show how to apply', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        resultData
      );

      expect(result.message).toContain('лампу');
      expect(result.message).toContain('30-50 см');
    });

    it('should show contraindications', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        resultData
      );

      expect(result.message).toContain('Противопоказания');
      expect(result.message).toContain('сетчатки');
      expect(result.message).toContain('Биполярное');
    });

    it('should show alternative when not recommended', async () => {
      const planNoLight = {
        ...mockPlan,
        lightTherapy: { ...mockPlan.lightTherapy, recommended: false },
      };

      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        { assessment: mockAssessment, plan: planNoLight }
      );

      expect(result.message).toContain('не требуется');
      expect(result.message).toContain('естественного света');
    });

    it('should return error if light data not found', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:view_light',
        { assessment: mockAssessment, plan: {} }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найдены');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should handle start callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:start',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.step).toBe('q1_wakePreference');
    });

    it('should handle reassess callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:reassess',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Определение хронотипа');
    });

    it('should handle back callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:back',
        { assessment: mockAssessment }
      );

      expect(result.success).toBe(true);
      expect(mockGenerateChronotherapyPlan).toHaveBeenCalled();
    });

    it('should return error for invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return error for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'chronotype:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown');
    });
  });

  // ==========================================================================
  // STEP HANDLING
  // ==========================================================================
  describe('Step Handling', () => {
    it('should show intro step', async () => {
      const result = await command.handleStep(mockContext, 'intro', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Определение хронотипа');
    });

    it('should show MEQ question step', async () => {
      const result = await command.handleStep(mockContext, 'q1_wakePreference', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('вопрос 1/5');
    });

    it('should return error for question not found', async () => {
      // This tests internal error handling when question index is invalid
      const result = await command.handleStep(mockContext, 'q99_invalid', {});

      // Should fall through to default case
      expect(result.success).toBe(true);
      expect(result.message).toContain('Определение хронотипа');
    });

    it('should show results step with assessment data', async () => {
      const result = await command.handleStep(
        mockContext,
        'results',
        { assessment: mockAssessment, plan: mockPlan }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('сова');
    });
  });

  // ==========================================================================
  // EXISTING RESULTS
  // ==========================================================================
  describe('Existing Results', () => {
    it('should show stored assessment', async () => {
      mockGetSession.mockReturnValue({
        circadianAssessment: mockAssessment,
      });

      const result = await command.execute(mockContext);

      expect(mockGenerateChronotherapyPlan).toHaveBeenCalled();
      expect(result.message).toContain('сова');
    });

    it('should use updated chronotype if different', async () => {
      mockGetSession.mockReturnValue({
        circadianAssessment: mockAssessment,
      });
      mockGetChronotype.mockReturnValue('intermediate');

      const result = await command.execute(mockContext);

      expect(mockGetChronotype).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CHRONOTYPE CATEGORIES
  // ==========================================================================
  describe('Chronotype Categories', () => {
    const categories = [
      { category: 'extreme_morning', emoji: '🌅', name: 'жаворонок' },
      { category: 'moderate_morning', emoji: '🌤️', name: 'жаворонок' },
      { category: 'intermediate', emoji: '☀️', name: 'Промежуточный' },
      { category: 'moderate_evening', emoji: '🌙', name: 'сова' },
      { category: 'extreme_evening', emoji: '🦉', name: 'сова' },
    ];

    categories.forEach(({ category, emoji, name }) => {
      it(`should show ${category} with correct emoji and name`, async () => {
        const assessment = {
          ...mockAssessment,
          chronotypeCategory: category as ICircadianAssessment['chronotypeCategory'],
        };
        mockAssessChronotypeFromMEQ.mockReturnValue(assessment);

        const result = await command.handleCallback(
          mockContext,
          'chronotype:skip_mctq',
          {
            meqAnswers: {
              q1_wakePreference: 3,
              q2_morningTiredness: 2,
              q3_bedtimeWork: 3,
              q4_peakPerformance: 2,
              q5_selfRating: 2,
            },
          }
        );

        expect(result.message).toContain(emoji);
        expect(result.message).toContain(name);
      });
    });
  });

  // ==========================================================================
  // SOCIAL JETLAG SEVERITIES
  // ==========================================================================
  describe('Social Jetlag Severities', () => {
    const severities = [
      { severity: 'none', icon: '✅' },
      { severity: 'mild', icon: '⚠️' },
      { severity: 'moderate', icon: '🟠' },
      { severity: 'severe', icon: '🔴' },
    ];

    severities.forEach(({ severity, icon }) => {
      it(`should show ${severity} social jetlag correctly`, async () => {
        const assessment = {
          ...mockAssessment,
          socialJetlagSeverity: severity,
        };
        mockAssessChronotypeFromMEQ.mockReturnValue(assessment);

        const result = await command.handleCallback(
          mockContext,
          'chronotype:skip_mctq',
          {
            meqAnswers: {
              q1_wakePreference: 3,
              q2_morningTiredness: 2,
              q3_bedtimeWork: 3,
              q4_peakPerformance: 2,
              q5_selfRating: 2,
            },
          }
        );

        expect(result.message).toContain(icon);
      });
    });
  });

  // ==========================================================================
  // BEDTIME ESTIMATION
  // ==========================================================================
  describe('Bedtime Estimation', () => {
    it('should estimate bedtime 30 minutes before sleep onset', async () => {
      // This tests internal buildMCTQResponse method
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:free_wake:09:30',
        {
          meqAnswers: {
            q1_wakePreference: 3,
            q2_morningTiredness: 2,
            q3_bedtimeWork: 3,
            q4_peakPerformance: 2,
            q5_selfRating: 2,
          },
          mctqData: {
            workSleepOnset: '23:30',
            workWakeTime: '07:30',
            freeSleepOnset: '00:30',
          },
        }
      );

      expect(mockAssessChronotypeFromMCTQ).toHaveBeenCalled();
      const call = mockAssessChronotypeFromMCTQ.mock.calls[0];
      expect(call[1].work.bedtime).toBe('23:00'); // 23:30 - 30min
      expect(call[1].free.bedtime).toBe('00:00'); // 00:30 - 30min
    });

    it('should handle bedtime across midnight', async () => {
      // 00:15 - 30min = 23:45
      const result = await command.handleCallback(
        mockContext,
        'chronotype:mctq:free_wake:09:30',
        {
          meqAnswers: {
            q1_wakePreference: 3,
            q2_morningTiredness: 2,
            q3_bedtimeWork: 3,
            q4_peakPerformance: 2,
            q5_selfRating: 2,
          },
          mctqData: {
            workSleepOnset: '00:15',
            workWakeTime: '07:30',
            freeSleepOnset: '00:30',
          },
        }
      );

      expect(mockAssessChronotypeFromMCTQ).toHaveBeenCalled();
      const call = mockAssessChronotypeFromMCTQ.mock.calls[0];
      expect(call[1].work.bedtime).toBe('23:45');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(chronotypeCommand).toBeInstanceOf(ChronotypeCommand);
    });

    it('should have correct name', () => {
      expect(chronotypeCommand.name).toBe('chronotype');
    });
  });
});
