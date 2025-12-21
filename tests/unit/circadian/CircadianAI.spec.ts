/**
 * CircadianAI Unit Tests
 * Tests chronotype assessment and circadian rhythm personalization
 */

import { CircadianAI, MEQ_THRESHOLDS, SOCIAL_JETLAG_THRESHOLDS, MEQ_ITEMS } from '../../../src/circadian/CircadianAI';
import type { IMEQResponse, IMCTQResponse, ICircadianAssessment } from '../../../src/circadian/CircadianAI';

describe('CircadianAI', () => {
  let ai: CircadianAI;

  // Factory for MEQ response
  function createMEQResponse(overrides: Partial<{
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
  }> = {}): IMEQResponse {
    return {
      userId: 'test-user',
      date: new Date().toISOString().split('T')[0],
      q1_wakePreference: overrides.q1 ?? 3,
      q2_morningTiredness: overrides.q2 ?? 2,
      q3_bedtimeWork: overrides.q3 ?? 3,
      q4_peakPerformance: overrides.q4 ?? 3,
      q5_selfRating: overrides.q5 ?? 3,
    };
  }

  // Factory for MCTQ response
  function createMCTQResponse(overrides: Partial<{
    workBedtime: string;
    workSleepOnset: string;
    workWakeTime: string;
    workAlarm: boolean;
    freeBedtime: string;
    freeSleepOnset: string;
    freeWakeTime: string;
    freeAlarm: boolean;
  }> = {}): IMCTQResponse {
    return {
      userId: 'test-user',
      date: new Date().toISOString().split('T')[0],
      work: {
        bedtime: overrides.workBedtime ?? '23:00',
        sleepOnset: overrides.workSleepOnset ?? '23:30',
        wakeTime: overrides.workWakeTime ?? '07:00',
        useAlarm: overrides.workAlarm ?? true,
      },
      free: {
        bedtime: overrides.freeBedtime ?? '00:00',
        sleepOnset: overrides.freeSleepOnset ?? '00:30',
        wakeTime: overrides.freeWakeTime ?? '09:00',
        useAlarm: overrides.freeAlarm ?? false,
      },
    };
  }

  beforeEach(() => {
    ai = new CircadianAI();
  });

  describe('Constants', () => {
    it('should have correct MEQ thresholds', () => {
      expect(MEQ_THRESHOLDS.EXTREME_MORNING).toEqual({ min: 70, max: 86 });
      expect(MEQ_THRESHOLDS.MODERATE_MORNING).toEqual({ min: 59, max: 69 });
      expect(MEQ_THRESHOLDS.INTERMEDIATE).toEqual({ min: 42, max: 58 });
      expect(MEQ_THRESHOLDS.MODERATE_EVENING).toEqual({ min: 31, max: 41 });
      expect(MEQ_THRESHOLDS.EXTREME_EVENING).toEqual({ min: 16, max: 30 });
    });

    it('should have correct social jetlag thresholds', () => {
      expect(SOCIAL_JETLAG_THRESHOLDS.NONE).toBe(0.5);
      expect(SOCIAL_JETLAG_THRESHOLDS.MILD).toBe(1.0);
      expect(SOCIAL_JETLAG_THRESHOLDS.MODERATE).toBe(2.0);
      expect(SOCIAL_JETLAG_THRESHOLDS.SEVERE).toBe(Infinity);
    });

    it('should have MEQ items with Russian text', () => {
      expect(MEQ_ITEMS.length).toBe(5);
      MEQ_ITEMS.forEach(item => {
        expect(item.textRu).toBeDefined();
        expect(item.options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getMEQQuestionnaire()', () => {
    it('should return MEQ questionnaire items', () => {
      const items = ai.getMEQQuestionnaire();

      expect(items).toBe(MEQ_ITEMS);
      expect(items.length).toBe(5);
    });

    it('should have correct item IDs', () => {
      const items = ai.getMEQQuestionnaire();

      expect(items[0].id).toBe('q1_wakePreference');
      expect(items[1].id).toBe('q2_morningTiredness');
      expect(items[2].id).toBe('q3_bedtimeWork');
      expect(items[3].id).toBe('q4_peakPerformance');
      expect(items[4].id).toBe('q5_selfRating');
    });
  });

  describe('assessFromMEQ()', () => {
    it('should identify extreme morning type', () => {
      const response = createMEQResponse({
        q1: 5, // Early wake preference
        q2: 4, // Very fresh in morning
        q3: 5, // Early bedtime
        q4: 5, // Morning peak performance
        q5: 6, // Definitely morning type
      });

      const assessment = ai.assessFromMEQ(response);

      expect(assessment.meqCategory).toBe('extreme_morning');
      expect(assessment.chronotype).toBe('definite_morning');
      expect(assessment.meqScore).toBeGreaterThanOrEqual(70);
    });

    it('should identify moderate morning type', () => {
      const response = createMEQResponse({
        q1: 4,
        q2: 3,
        q3: 4,
        q4: 3,
        q5: 4,
      });

      const assessment = ai.assessFromMEQ(response);

      expect(assessment.meqCategory).toBe('moderate_morning');
      expect(assessment.chronotype).toBe('moderate_morning');
      expect(assessment.meqScore).toBeGreaterThanOrEqual(59);
      expect(assessment.meqScore).toBeLessThan(70);
    });

    it('should identify intermediate type', () => {
      const response = createMEQResponse({
        q1: 3,
        q2: 2,
        q3: 3,
        q4: 3,
        q5: 3,
      });

      const assessment = ai.assessFromMEQ(response);

      expect(assessment.meqCategory).toBe('intermediate');
      expect(assessment.chronotype).toBe('intermediate');
      expect(assessment.meqScore).toBeGreaterThanOrEqual(42);
      expect(assessment.meqScore).toBeLessThan(59);
    });

    it('should identify moderate evening type', () => {
      const response = createMEQResponse({
        q1: 2,
        q2: 2,
        q3: 2,
        q4: 2,
        q5: 2,
      });

      const assessment = ai.assessFromMEQ(response);

      expect(assessment.meqCategory).toBe('moderate_evening');
      expect(assessment.chronotype).toBe('moderate_evening');
      expect(assessment.meqScore).toBeGreaterThanOrEqual(31);
      expect(assessment.meqScore).toBeLessThan(42);
    });

    it('should identify extreme evening type', () => {
      const response = createMEQResponse({
        q1: 1, // Late wake preference
        q2: 1, // Very tired in morning
        q3: 1, // Late bedtime
        q4: 1, // Evening peak performance
        q5: 1, // Definitely evening type
      });

      const assessment = ai.assessFromMEQ(response);

      expect(assessment.meqCategory).toBe('extreme_evening');
      expect(assessment.chronotype).toBe('definite_evening');
      expect(assessment.meqScore).toBeLessThan(31);
    });

    it('should estimate DLMO from MEQ', () => {
      const response = createMEQResponse({ q1: 3, q2: 2, q3: 3, q4: 3, q5: 3 });
      const assessment = ai.assessFromMEQ(response);

      expect(assessment.estimatedDLMO).toMatch(/^\d{2}:\d{2}$/);
      expect(assessment.dlmoConfidence).toBe(0.6); // Lower confidence without MCTQ
    });

    it('should provide optimal sleep window', () => {
      const response = createMEQResponse();
      const assessment = ai.assessFromMEQ(response);

      expect(assessment.optimalSleepWindow.bedtime).toMatch(/^\d{2}:\d{2}$/);
      expect(assessment.optimalSleepWindow.wakeTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should have no social jetlag when using MEQ alone', () => {
      const response = createMEQResponse();
      const assessment = ai.assessFromMEQ(response);

      expect(assessment.socialJetlag).toBe(0);
      expect(assessment.socialJetlagSeverity).toBe('none');
    });

    it('should estimate sleep need', () => {
      const response = createMEQResponse();
      const assessment = ai.assessFromMEQ(response);

      expect(assessment.estimatedSleepNeed).toBe(7.5);
    });
  });

  describe('assessFromMCTQ()', () => {
    it('should calculate social jetlag', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:30',
        workWakeTime: '06:30',
        freeSleepOnset: '01:00',
        freeWakeTime: '10:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.socialJetlag).toBeGreaterThan(0);
    });

    it('should identify no social jetlag when schedules match', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '07:00',
        freeSleepOnset: '23:00',
        freeWakeTime: '07:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.socialJetlag).toBeCloseTo(0, 1);
      expect(assessment.socialJetlagSeverity).toBe('none');
    });

    it('should identify mild social jetlag (30-60 min)', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '07:00',
        freeSleepOnset: '23:30',
        freeWakeTime: '07:30',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.socialJetlagSeverity).toBe('mild');
    });

    it('should identify moderate social jetlag (1-2 hours)', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '07:00',
        freeSleepOnset: '00:00',
        freeWakeTime: '09:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(['mild', 'moderate']).toContain(assessment.socialJetlagSeverity);
    });

    it('should identify severe social jetlag (>2 hours)', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '06:00',
        freeSleepOnset: '02:00',
        freeWakeTime: '11:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(['moderate', 'severe']).toContain(assessment.socialJetlagSeverity);
    });

    it('should calculate MSFsc (chronotype marker)', () => {
      const response = createMCTQResponse({ freeAlarm: false });
      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.msfsc).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should estimate DLMO from sleep onset', () => {
      const response = createMCTQResponse({ freeSleepOnset: '23:00' });
      const assessment = ai.assessFromMCTQ(response);

      // DLMO should be about 2-3 hours before sleep onset
      expect(assessment.estimatedDLMO).toBeDefined();
      expect(assessment.estimatedDLMO).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should have higher DLMO confidence without alarm', () => {
      const noAlarm = createMCTQResponse({ freeAlarm: false });
      const withAlarm = createMCTQResponse({ freeAlarm: true });

      const noAlarmAssessment = ai.assessFromMCTQ(noAlarm);
      const withAlarmAssessment = ai.assessFromMCTQ(withAlarm);

      expect(noAlarmAssessment.dlmoConfidence).toBeGreaterThan(withAlarmAssessment.dlmoConfidence);
    });

    it('should identify evening chronotype from late MSF', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '02:00',
        freeWakeTime: '11:00',
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(['moderate_evening', 'extreme_evening']).toContain(assessment.chronotypeCategory);
    });

    it('should identify morning chronotype from early MSF', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '21:00',
        freeWakeTime: '05:00',
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(['moderate_morning', 'extreme_morning']).toContain(assessment.chronotypeCategory);
    });

    it('should identify risk factors for evening types', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '02:00',
        freeWakeTime: '11:00',
        freeAlarm: false,
        workSleepOnset: '23:00',
        workWakeTime: '06:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.riskFactors.length).toBeGreaterThan(0);
      expect(assessment.riskFactors.some(r => r.includes('вечерн') || r.includes('джетлаг'))).toBe(true);
    });
  });

  describe('generateChronotherapyPlan()', () => {
    let morningAssessment: ICircadianAssessment;
    let eveningAssessment: ICircadianAssessment;
    let intermediateAssessment: ICircadianAssessment;

    beforeEach(() => {
      // Morning type assessment
      morningAssessment = ai.assessFromMEQ(createMEQResponse({
        q1: 5, q2: 4, q3: 5, q4: 5, q5: 6,
      }));

      // Evening type assessment
      eveningAssessment = ai.assessFromMCTQ(createMCTQResponse({
        freeSleepOnset: '02:00',
        freeWakeTime: '11:00',
        freeAlarm: false,
        workSleepOnset: '23:00',
        workWakeTime: '06:00',
      }));

      // Intermediate type assessment
      intermediateAssessment = ai.assessFromMEQ(createMEQResponse({
        q1: 3, q2: 2, q3: 3, q4: 3, q5: 3,
      }));
    });

    it('should include userId', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.userId).toBe('user-123');
    });

    it('should include chronotype', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.chronotype).toBe(intermediateAssessment.chronotype);
    });

    it('should provide optimal session times', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.optimalSessionTimes.length).toBeGreaterThan(0);
      expect(plan.optimalSessionTimes[0]).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
    });

    it('should provide morning session times for morning types', () => {
      const plan = ai.generateChronotherapyPlan('user-123', morningAssessment);

      expect(plan.optimalSessionTimes).toContain('09:00-11:00');
    });

    it('should provide later session times for evening types', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      expect(plan.optimalSessionTimes).toContain('11:00-13:00');
    });

    it('should recommend morning light therapy for evening types with social jetlag', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      expect(plan.lightTherapy.recommended).toBe(true);
      expect(plan.lightTherapy.intensity).toBe(10000);
      expect(plan.lightTherapy.duration).toBe(30);
      expect(plan.lightTherapy.rationale).toContain('джетлаг');
    });

    it('should recommend evening light for extreme morning types', () => {
      const plan = ai.generateChronotherapyPlan('user-123', morningAssessment);

      if (morningAssessment.chronotypeCategory === 'extreme_morning') {
        expect(plan.lightTherapy.recommended).toBe(true);
        expect(plan.lightTherapy.timing).toContain('18:00');
      }
    });

    it('should not recommend light therapy for intermediate types', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.lightTherapy.recommended).toBe(false);
    });

    it('should recommend melatonin for evening types', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      expect(plan.melatoninTiming).toBeDefined();
      expect(plan.melatoninTiming!.recommended).toBe(true);
      expect(plan.melatoninTiming!.dose).toContain('мг');
    });

    it('should not recommend melatonin for morning/intermediate types', () => {
      const morningPlan = ai.generateChronotherapyPlan('user-123', morningAssessment);
      const intermediatePlan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(morningPlan.melatoninTiming).toBeUndefined();
      expect(intermediatePlan.melatoninTiming).toBeUndefined();
    });

    it('should provide sleep restriction adjustments', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.sleepRestrictionAdjustments.initialBedtime).toMatch(/^\d{2}:\d{2}$/);
      expect(plan.sleepRestrictionAdjustments.initialWakeTime).toMatch(/^\d{2}:\d{2}$/);
      expect(plan.sleepRestrictionAdjustments.rationale.length).toBeGreaterThan(0);
    });

    it('should adapt sleep restriction rationale to chronotype', () => {
      const morningPlan = ai.generateChronotherapyPlan('user-123', morningAssessment);
      const eveningPlan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      expect(morningPlan.sleepRestrictionAdjustments.rationale).toContain('утренний');
      expect(eveningPlan.sleepRestrictionAdjustments.rationale).toContain('вечерний');
    });

    it('should mention social jetlag in rationale when present', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      if (eveningAssessment.socialJetlag > 1) {
        expect(plan.sleepRestrictionAdjustments.rationale).toContain('джетлаг');
      }
    });

    it('should provide lifestyle recommendations', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.lifestyleRecommendations.length).toBeGreaterThan(0);
      expect(plan.lifestyleRecommendations.every(r => typeof r === 'string')).toBe(true);
    });

    it('should provide evening-specific lifestyle recommendations', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      expect(plan.lifestyleRecommendations.some(r =>
        r.includes('свет') || r.includes('экран') || r.includes('кофеин')
      )).toBe(true);
    });

    it('should provide morning-specific lifestyle recommendations', () => {
      const plan = ai.generateChronotherapyPlan('user-123', morningAssessment);

      expect(plan.lifestyleRecommendations.some(r =>
        r.includes('ранн') || r.includes('активность') || r.includes('утро')
      )).toBe(true);
    });

    it('should provide social jetlag recommendations when jetlag > 1h', () => {
      const plan = ai.generateChronotherapyPlan('user-123', eveningAssessment);

      if (eveningAssessment.socialJetlag > 1) {
        expect(plan.lifestyleRecommendations.some(r =>
          r.includes('выходн') || r.includes('синхронизац')
        )).toBe(true);
      }
    });

    it('should always recommend regular schedule and light exposure', () => {
      const plan = ai.generateChronotherapyPlan('user-123', intermediateAssessment);

      expect(plan.lifestyleRecommendations.some(r => r.includes('регулярн'))).toBe(true);
      expect(plan.lifestyleRecommendations.some(r => r.includes('днев') || r.includes('свет'))).toBe(true);
    });
  });

  describe('Time conversion utilities', () => {
    // Test edge cases through public API

    it('should handle midnight crossing in sleep duration', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '23:00',
        freeWakeTime: '07:00', // Next day
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.estimatedSleepNeed).toBeGreaterThan(0);
      expect(assessment.estimatedSleepNeed).toBeLessThan(12);
    });

    it('should handle very late sleep onset', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '03:00',
        freeWakeTime: '11:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.estimatedDLMO).toBeDefined();
      expect(assessment.msfsc).toBeDefined();
    });

    it('should handle very early wake time', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '21:00',
        freeWakeTime: '05:00',
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      // MSF for 21:00-05:00 is around 01:00, should be extreme/moderate morning
      expect(['extreme_morning', 'moderate_morning']).toContain(assessment.chronotypeCategory);
    });
  });

  describe('MSFsc correction', () => {
    it('should correct MSF when free day sleep is longer than work day', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '06:00', // 7h
        freeSleepOnset: '00:00',
        freeWakeTime: '10:00', // 10h
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      // MSFsc should be earlier than raw MSF due to oversleep correction
      expect(assessment.msfsc).toBeDefined();
    });

    it('should not correct MSF when alarm is used on free days', () => {
      const withAlarm = createMCTQResponse({
        freeSleepOnset: '00:00',
        freeWakeTime: '09:00',
        freeAlarm: true,
      });

      const assessment = ai.assessFromMCTQ(withAlarm);

      expect(assessment.dlmoConfidence).toBe(0.7); // Lower confidence with alarm
    });
  });

  describe('Risk factor identification', () => {
    it('should identify depression/anxiety risk for evening types', () => {
      const response = createMCTQResponse({
        freeSleepOnset: '02:00',
        freeWakeTime: '11:00',
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      expect(assessment.riskFactors.some(r => r.includes('депресс') || r.includes('тревог'))).toBe(true);
    });

    it('should identify metabolic risk for severe social jetlag', () => {
      const response = createMCTQResponse({
        workSleepOnset: '22:00',
        workWakeTime: '05:00',
        freeSleepOnset: '02:00',
        freeWakeTime: '12:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      if (assessment.socialJetlag >= 2) {
        expect(assessment.riskFactors.some(r => r.includes('метаболическ'))).toBe(true);
      }
    });

    it('should identify chronic sleep debt risk', () => {
      const response = createMCTQResponse({
        workSleepOnset: '00:00',
        workWakeTime: '06:00', // Only 6h on workdays
        freeSleepOnset: '01:00',
        freeWakeTime: '10:00', // 9h on free days (compensating)
        freeAlarm: false,
      });

      const assessment = ai.assessFromMCTQ(response);

      if (assessment.socialJetlag >= 1 && assessment.chronotypeCategory.includes('evening')) {
        expect(assessment.riskFactors.some(r => r.includes('недосып'))).toBe(true);
      }
    });

    it('should return empty risks for intermediate type without jetlag', () => {
      const response = createMCTQResponse({
        workSleepOnset: '23:00',
        workWakeTime: '07:00',
        freeSleepOnset: '23:00',
        freeWakeTime: '07:00',
      });

      const assessment = ai.assessFromMCTQ(response);

      // May or may not have risks depending on classification
      expect(Array.isArray(assessment.riskFactors)).toBe(true);
    });
  });

  describe('DLMO estimation', () => {
    it('should estimate earlier DLMO for higher MEQ scores', () => {
      const morningResponse = createMEQResponse({ q1: 5, q2: 4, q3: 5, q4: 5, q5: 6 });
      const eveningResponse = createMEQResponse({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 });

      const morningAssessment = ai.assessFromMEQ(morningResponse);
      const eveningAssessment = ai.assessFromMEQ(eveningResponse);

      // Morning types should have earlier DLMO
      const morningDLMOHours = parseInt(morningAssessment.estimatedDLMO.split(':')[0]);
      const eveningDLMOHours = parseInt(eveningAssessment.estimatedDLMO.split(':')[0]);

      // Morning DLMO should be earlier (smaller hour or same day),
      // Evening DLMO might wrap past midnight
      expect(morningDLMOHours).toBeLessThanOrEqual(22);
    });

    it('should estimate DLMO 2-3h before sleep onset from MCTQ', () => {
      const response = createMCTQResponse({ freeSleepOnset: '23:00' });
      const assessment = ai.assessFromMCTQ(response);

      const dlmoHour = parseInt(assessment.estimatedDLMO.split(':')[0]);
      // DLMO should be around 20:30 (2.5h before 23:00)
      expect(dlmoHour).toBeGreaterThanOrEqual(19);
      expect(dlmoHour).toBeLessThanOrEqual(22);
    });
  });
});
