/**
 * ChronotypeCommand Unit Tests
 * =============================
 * Tests for /chronotype command - MEQ questionnaire and chronotype assessment.
 */

import { ChronotypeCommand, chronotypeCommand } from '../../../../src/bot/commands/ChronotypeCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock CircadianAI module (MEQ_ITEMS used by ChronotypeCommand for questionnaire)
jest.mock('../../../../src/circadian/CircadianAI', () => ({
  MEQ_ITEMS: [
    {
      id: 'q1_wakePreference',
      textRu: 'В какое время вы бы предпочли вставать?',
      options: [
        { label: '05:00-06:30', value: 5 },
        { label: '06:30-07:45', value: 4 },
        { label: '07:45-09:45', value: 3 },
        { label: '09:45-11:00', value: 2 },
        { label: '11:00-12:00', value: 1 },
      ],
    },
    {
      id: 'q2_morningTiredness',
      textRu: 'Насколько вы чувствуете себя уставшим утром?',
      options: [
        { label: 'Совсем не устал', value: 4 },
        { label: 'Слегка устал', value: 3 },
        { label: 'Достаточно устал', value: 2 },
        { label: 'Очень устал', value: 1 },
      ],
    },
    {
      id: 'q3_bedtimeWork',
      textRu: 'В какое время вы бы легли спать?',
      options: [
        { label: '20:00-21:00', value: 5 },
        { label: '21:00-22:15', value: 4 },
        { label: '22:15-00:30', value: 3 },
        { label: '00:30-01:45', value: 2 },
        { label: '01:45-03:00', value: 1 },
      ],
    },
    {
      id: 'q4_peakPerformance',
      textRu: 'Когда вы находитесь в лучшей форме?',
      options: [
        { label: 'Утром', value: 4 },
        { label: 'Днём', value: 3 },
        { label: 'Вечером', value: 2 },
        { label: 'Ночью', value: 1 },
      ],
    },
    {
      id: 'q5_selfRating',
      textRu: 'К какому типу вы себя относите?',
      options: [
        { label: 'Определённо утренний', value: 6 },
        { label: 'Скорее утренний', value: 4 },
        { label: 'Ни то, ни другое', value: 2 },
        { label: 'Скорее вечерний', value: 0 },
      ],
    },
  ],
}));

describe('ChronotypeCommand', () => {
  let command: ChronotypeCommand;

  beforeEach(() => {
    command = new ChronotypeCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('chronotype');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('хронотип');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('chrono');
      expect(command.aliases).toContain('meq');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('intro');
      expect(command.steps).toContain('results');
    });
  });

  describe('execute()', () => {
    it('should show intro when no existing assessment', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'хронотип');
    });

    it('should have start button', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 1);
    });

    it('should include step metadata', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.metadata?.step).toBe('intro');
    });
  });

  describe('handleStep()', () => {
    it('should handle intro step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'intro', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'хронотип');
    });

    it('should handle MEQ question steps', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'q1_wakePreference', {});

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
      assertContainsText(result, '1/5');
    });

    it('should show progress in questions', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'q3_bedtimeWork', {});

      assertContainsText(result, '3/5');
    });

    it('should handle mctq_offer step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'mctq_offer', { meqAnswers: {} });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'MEQ');
    });

    it('should handle results step', async () => {
      const ctx = createMockContext();
      const assessment = {
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
      };
      const plan = {
        optimalSessionTimes: ['10:00'],
        sleepRestrictionAdjustments: {
          initialBedtime: '23:30',
          initialWakeTime: '07:00',
          rationale: 'Test',
        },
        lightTherapy: { recommended: true, timing: '07:00', duration: 30, intensity: 10000, rationale: 'Test' },
        lifestyleRecommendations: [],
      };

      const result = await command.handleStep(ctx, 'results', { assessment, plan });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'хронотип');
    });

    it('should default to intro for unknown step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'unknown_step', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'хронотип');
    });
  });

  describe('handleCallback()', () => {
    it('should handle start callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'chronotype:start', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, '1/5');
    });

    it('should handle meq answer callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(
        ctx,
        'chronotype:meq:q1_wakePreference:3',
        { meqAnswers: {} }
      );

      assertSuccessWithMessage(result);
      assertContainsText(result, '2/5');
    });

    it('should handle reassess callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'chronotype:reassess', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'хронотип');
    });

    it('should reject invalid callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'other:action', {});

      expect(result.success).toBe(false);
    });

    it('should handle unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'chronotype:unknown_action', {});

      expect(result.success).toBe(false);
    });
  });

  describe('assessment persistence', () => {
    it('should show existing results when session has circadianAssessment', async () => {
      const existingAssessment = {
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
      };
      const ctx = createMockContext();
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        circadianAssessment: existingAssessment,
      });

      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // Should show results, not intro — results contain chronotype details
      expect(ctx.sleepCore.generateChronotherapyPlan).toHaveBeenCalledWith(ctx.userId);
    });

    it('should show intro when session has no circadianAssessment', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        circadianAssessment: null,
      });

      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      expect(result.metadata?.step).toBe('intro');
    });

    it('should call assessChronotypeFromMEQ on SleepCoreAPI during assessment', async () => {
      const ctx = createMockContext();
      const meqAnswers = {
        q1_wakePreference: 3,
        q2_morningTiredness: 3,
        q3_bedtimeWork: 3,
        q4_peakPerformance: 3,
        q5_selfRating: 2,
      };

      // Trigger assessment via callback for last MEQ question + skip MCTQ
      const result = await command.handleCallback(
        ctx,
        'chronotype:skip_mctq',
        { meqAnswers }
      );

      assertSuccessWithMessage(result);
      expect(ctx.sleepCore.assessChronotypeFromMEQ).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({
          userId: ctx.userId,
          q1_wakePreference: 3,
        })
      );
      expect(ctx.sleepCore.generateChronotherapyPlan).toHaveBeenCalledWith(ctx.userId);
    });
  });

  describe('Circadian API wiring', () => {
    it('should call assessChronotypeFromMCTQ via MCTQ free_wake callback', async () => {
      const ctx = createMockContext();
      const meqAnswers = {
        q1_wakePreference: 3,
        q2_morningTiredness: 3,
        q3_bedtimeWork: 3,
        q4_peakPerformance: 3,
        q5_selfRating: 2,
      };
      const mctqData = {
        workSleepOnset: '23:30',
        workWakeTime: '07:00',
        freeSleepOnset: '00:30',
      };

      // Last MCTQ step: free_wake time triggers calculateAndShowResults with includeMCTQ=true
      const result = await command.handleCallback(
        ctx,
        'chronotype:mctq:free_wake:09:00',
        { meqAnswers, mctqData }
      );

      assertSuccessWithMessage(result);
      expect(ctx.sleepCore.assessChronotypeFromMCTQ).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({
          userId: ctx.userId,
          work: expect.objectContaining({
            sleepOnset: '23:30',
            wakeTime: '07:00',
            useAlarm: true,
          }),
          free: expect.objectContaining({
            sleepOnset: '00:30',
            wakeTime: '09:00',
            useAlarm: false,
          }),
        })
      );
    });

    it('should call getSocialJetlag in results display', async () => {
      const ctx = createMockContext();
      const assessment = {
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
      };
      const plan = {
        optimalSessionTimes: ['10:00'],
        sleepRestrictionAdjustments: {
          initialBedtime: '23:30',
          initialWakeTime: '07:00',
          rationale: 'Test',
        },
        lightTherapy: { recommended: false, timing: '', duration: 0, intensity: 0, rationale: '' },
        lifestyleRecommendations: [],
      };

      const result = await command.handleStep(ctx, 'results', { assessment, plan });

      assertSuccessWithMessage(result);
      expect(ctx.sleepCore.getSocialJetlag).toHaveBeenCalledWith(ctx.userId);
      // Social jetlag recommendation should appear in message
      assertContainsText(result, 'джетлаг');
    });

    it('should call getChronotype when showing existing results', async () => {
      const existingAssessment = {
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
      };
      const ctx = createMockContext();
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        circadianAssessment: existingAssessment,
      });

      await command.execute(ctx);

      expect(ctx.sleepCore.getChronotype).toHaveBeenCalledWith(ctx.userId);
    });

    it('should use updated chronotype when getChronotype differs from stored assessment', async () => {
      const existingAssessment = {
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
      };
      const ctx = createMockContext();
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        circadianAssessment: existingAssessment,
      });
      // Return a different chronotype from getChronotype
      (ctx.sleepCore.getChronotype as jest.Mock).mockReturnValue('definite_evening');

      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      expect(ctx.sleepCore.getChronotype).toHaveBeenCalledWith(ctx.userId);
      // Should regenerate plan with updated chronotype
      expect(ctx.sleepCore.generateChronotherapyPlan).toHaveBeenCalledWith(ctx.userId);
    });

    it('should not update chronotype when getChronotype matches stored assessment', async () => {
      const existingAssessment = {
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
      };
      const ctx = createMockContext();
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        circadianAssessment: existingAssessment,
      });
      // Same chronotype as stored
      (ctx.sleepCore.getChronotype as jest.Mock).mockReturnValue('moderate_evening');

      await command.execute(ctx);

      // Should still call generateChronotherapyPlan (normal flow)
      expect(ctx.sleepCore.generateChronotherapyPlan).toHaveBeenCalledWith(ctx.userId);
    });

    it('should handle null getSocialJetlag gracefully', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore.getSocialJetlag as jest.Mock).mockReturnValue(null);

      const assessment = {
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
      };
      const plan = {
        optimalSessionTimes: ['10:00'],
        sleepRestrictionAdjustments: {
          initialBedtime: '23:30',
          initialWakeTime: '07:00',
          rationale: 'Test',
        },
        lightTherapy: { recommended: false, timing: '', duration: 0, intensity: 0, rationale: '' },
        lifestyleRecommendations: [],
      };

      const result = await command.handleStep(ctx, 'results', { assessment, plan });
      assertSuccessWithMessage(result);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(chronotypeCommand).toBeInstanceOf(ChronotypeCommand);
      expect(chronotypeCommand.name).toBe('chronotype');
    });
  });
});
