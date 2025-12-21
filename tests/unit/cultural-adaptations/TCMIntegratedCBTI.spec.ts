/**
 * TCMIntegratedCBTI Unit Tests
 * Tests Traditional Chinese Medicine integration with CBT-I
 */

import {
  TCMIntegratedCBTIEngine,
  INSOMNIA_ACUPOINTS,
  HERBAL_FORMULAS,
  TAI_CHI_PROTOCOL,
  QIGONG_PROTOCOL,
  type ITCMAssessment,
  type TCMInsomniaPattern,
  type TCMConstitution,
} from '../../../src/cultural-adaptations/asia/TCMIntegratedCBTI';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';
import type { ICBTIPlan } from '../../../src/cbt-i/interfaces/ICBTIComponents';

describe('TCMIntegratedCBTIEngine', () => {
  let engine: TCMIntegratedCBTIEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    sleepEfficiency: number;
    isiScore: number;
    sleepOnsetLatency: number;
    wakeAfterSleepOnset: number;
    preSleepArousal: number;
    sleepAnxiety: number;
    sleepSelfEfficacy: number;
    daytimeSleepiness: number;
    morningAlertness: number;
    caffeineMg: number;
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 360,
        sleepOnsetLatency: overrides.sleepOnsetLatency ?? 25,
        wakeAfterSleepOnset: overrides.wakeAfterSleepOnset ?? 30,
        numberOfAwakenings: 2,
        sleepEfficiency: overrides.sleepEfficiency ?? 75,
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:00',
      },
      circadian: {
        chronotype: 'intermediate',
        circadianPhase: 0,
        phaseDeviation: 0,
        lightExposure: 10000,
        estimatedMelatoninOnset: '21:00',
        socialJetLag: 0.5,
        isStable: true,
      },
      homeostasis: {
        sleepDebt: 0,
        debtDuration: 0,
        homeostaticPressure: 0.5,
        optimalSleepDuration: 8,
        isRecoverable: true,
      },
      insomnia: {
        isiScore: overrides.isiScore ?? 15,
        severity: 'moderate',
        subtype: 'mixed',
        durationWeeks: 12,
        daytimeImpact: 0.5,
        sleepDistress: 0.5,
      },
      behaviors: {
        caffeine: { dailyMg: overrides.caffeineMg ?? 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 45,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 18, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: 4,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.4,
        preSleepArousal: overrides.preSleepArousal ?? 0.4,
        sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.6,
      },
      subjectiveQuality: 'fair',
      morningAlertness: overrides.morningAlertness ?? 0.5,
      daytimeSleepiness: overrides.daytimeSleepiness ?? 0.4,
      sleepHealthScore: 60,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  // Factory for mock CBT-I plan
  function createMockCBTIPlan(): ICBTIPlan {
    return {
      userId: 'test-user',
      startDate: new Date().toISOString().split('T')[0],
      currentWeek: 1,
      currentPhase: 'assessment',
      totalWeeks: 8,
      progress: {
        isiBaseline: 15,
        isiCurrent: 15,
        isiTarget: 7,
        sleepEfficiencyBaseline: 75,
        sleepEfficiencyCurrent: 75,
        completionPercentage: 0,
      },
      activeComponents: {
        sleepRestriction: null,
        stimulusControl: {
          goToBedWhenSleepy: true,
          bedOnlyForSleep: true,
          leaveIfAwake: true,
          leaveThresholdMinutes: 20,
          returnWhenSleepy: true,
          fixedWakeTime: true,
          wakeTime: '07:00',
          noNapping: true,
        },
        cognitiveTargets: [],
        hygieneRecommendations: [],
        relaxationProtocol: {
          id: 'basic-protocol',
          name: 'Basic Relaxation',
          techniques: ['progressive_muscle_relaxation'],
          totalDuration: 15,
          targetContext: 'bedtime',
          difficulty: 'beginner',
        },
      },
      weeklyGoals: [],
    };
  }

  beforeEach(() => {
    engine = new TCMIntegratedCBTIEngine();
  });

  describe('Constants', () => {
    it('should have insomnia acupoints defined', () => {
      expect(INSOMNIA_ACUPOINTS.length).toBeGreaterThan(0);
      expect(INSOMNIA_ACUPOINTS.some(p => p.code === 'HT7')).toBe(true);
      expect(INSOMNIA_ACUPOINTS.some(p => p.code === 'SP6')).toBe(true);
    });

    it('should have herbal formulas defined', () => {
      expect(HERBAL_FORMULAS.length).toBeGreaterThan(0);
    });

    it('should have Tai Chi protocol defined', () => {
      expect(TAI_CHI_PROTOCOL).toBeDefined();
      expect(TAI_CHI_PROTOCOL.type).toBe('tai_chi');
      expect(TAI_CHI_PROTOCOL.movements.length).toBeGreaterThan(0);
    });

    it('should have Qigong protocol defined', () => {
      expect(QIGONG_PROTOCOL).toBeDefined();
      expect(QIGONG_PROTOCOL.type).toBe('qigong');
    });

    it('should have acupoints with Chinese and English names', () => {
      const ht7 = INSOMNIA_ACUPOINTS.find(p => p.code === 'HT7');
      expect(ht7).toBeDefined();
      expect(ht7!.nameCn).toBe('神门');
      expect(ht7!.nameEn).toBe('Shenmen');
      expect(ht7!.namePinyin).toBeDefined();
    });
  });

  describe('assessTCMProfile()', () => {
    it('should return TCM assessment', () => {
      const sleepState = createTestSleepState();
      const assessment = engine.assessTCMProfile(sleepState);

      expect(assessment.constitution).toBeDefined();
      expect(assessment.insomniaPattern).toBeDefined();
      expect(assessment.recommendedTherapies.length).toBeGreaterThan(0);
      expect(assessment.integrationMode).toBeDefined();
      expect(assessment.rationale).toBeTruthy();
    });

    it('should identify qi_stagnation for high anxiety', () => {
      const anxiousState = createTestSleepState({
        sleepAnxiety: 0.8,
        preSleepArousal: 0.7,
      });

      const assessment = engine.assessTCMProfile(anxiousState);

      expect(assessment.constitution).toBe('qi_stagnation');
    });

    it('should identify qi_deficiency for severe fatigue', () => {
      const fatiguedState = createTestSleepState({
        isiScore: 23,
        daytimeSleepiness: 0.7,
      });

      const assessment = engine.assessTCMProfile(fatiguedState);

      expect(assessment.constitution).toBe('qi_deficiency');
    });

    it('should identify yin_deficiency for night waking', () => {
      const nightWakingState = createTestSleepState({
        wakeAfterSleepOnset: 60,
        sleepAnxiety: 0.4,
        preSleepArousal: 0.4,
      });

      const assessment = engine.assessTCMProfile(nightWakingState);

      expect(assessment.constitution).toBe('yin_deficiency');
    });

    it('should identify yang_deficiency for morning sluggishness', () => {
      const sluggishState = createTestSleepState({
        morningAlertness: 0.3,
        caffeineMg: 350,
        sleepAnxiety: 0.3,
        preSleepArousal: 0.3,
        wakeAfterSleepOnset: 20,
        isiScore: 12,
      });

      const assessment = engine.assessTCMProfile(sluggishState);

      expect(assessment.constitution).toBe('yang_deficiency');
    });

    it('should identify balanced for normal state', () => {
      const normalState = createTestSleepState({
        sleepAnxiety: 0.3,
        preSleepArousal: 0.3,
        wakeAfterSleepOnset: 20,
        morningAlertness: 0.6,
        caffeineMg: 100,
        isiScore: 10,
        daytimeSleepiness: 0.3,
      });

      const assessment = engine.assessTCMProfile(normalState);

      expect(assessment.constitution).toBe('balanced');
    });

    it('should identify heart_spleen_deficiency pattern for long SOL with low efficacy', () => {
      const state = createTestSleepState({
        sleepOnsetLatency: 50,
        sleepSelfEfficacy: 0.3,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.insomniaPattern).toBe('heart_spleen_deficiency');
    });

    it('should identify liver_fire for high arousal with short WASO', () => {
      const state = createTestSleepState({
        preSleepArousal: 0.8,
        wakeAfterSleepOnset: 20,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.insomniaPattern).toBe('liver_fire');
    });

    it('should identify yin_deficiency_fire for high WASO with anxiety', () => {
      const state = createTestSleepState({
        wakeAfterSleepOnset: 60,
        sleepAnxiety: 0.6,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.insomniaPattern).toBe('yin_deficiency_fire');
    });

    it('should identify heart_kidney_disharmony for both SOL and WASO issues', () => {
      const state = createTestSleepState({
        sleepOnsetLatency: 40,
        wakeAfterSleepOnset: 45,
        sleepSelfEfficacy: 0.5,
        sleepAnxiety: 0.4,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.insomniaPattern).toBe('heart_kidney_disharmony');
    });

    it('should recommend cbti_primary for severe insomnia', () => {
      const severeState = createTestSleepState({ isiScore: 24 });

      const assessment = engine.assessTCMProfile(severeState);

      expect(assessment.integrationMode).toBe('cbti_primary');
    });

    it('should recommend parallel for high anxiety', () => {
      const anxiousState = createTestSleepState({
        sleepAnxiety: 0.7,
        isiScore: 15,
      });

      const assessment = engine.assessTCMProfile(anxiousState);

      expect(assessment.integrationMode).toBe('parallel');
    });

    it('should recommend tcm_primary for mild heart_spleen_deficiency', () => {
      const mildState = createTestSleepState({
        sleepOnsetLatency: 50,
        sleepSelfEfficacy: 0.3,
        isiScore: 12,
        sleepAnxiety: 0.4,
      });

      const assessment = engine.assessTCMProfile(mildState);

      expect(assessment.integrationMode).toBe('tcm_primary');
    });

    it('should always include acupuncture in recommendations', () => {
      const state = createTestSleepState();

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.recommendedTherapies).toContain('acupuncture');
    });

    it('should include tai_chi/qigong for qi stagnation', () => {
      const state = createTestSleepState({
        sleepAnxiety: 0.8,
        preSleepArousal: 0.8,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(
        assessment.recommendedTherapies.includes('tai_chi') ||
        assessment.recommendedTherapies.includes('qigong')
      ).toBe(true);
    });

    it('should include herbal_medicine for deficiency patterns', () => {
      const state = createTestSleepState({
        sleepOnsetLatency: 50,
        sleepSelfEfficacy: 0.3,
      });

      const assessment = engine.assessTCMProfile(state);

      // heart_spleen_deficiency should recommend herbal
      if (assessment.insomniaPattern === 'heart_spleen_deficiency') {
        expect(assessment.recommendedTherapies).toContain('herbal_medicine');
      }
    });
  });

  describe('createIntegratedPlan()', () => {
    it('should create integrated plan', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_stagnation',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture', 'tai_chi'],
        integrationMode: 'cbti_primary',
        rationale: 'Test rationale',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.userId).toBe('user-123');
      expect(plan.cbtiPlan).toBeDefined();
      expect(plan.tcmAssessment).toBe(assessment);
      expect(plan.acupoints.length).toBeGreaterThan(0);
      expect(plan.schedule).toBeDefined();
    });

    it('should include HT7 and Anmian acupoints for all patterns', () => {
      const assessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.acupoints.some(p => p.code === 'HT7')).toBe(true);
      expect(plan.acupoints.some(p => p.code === 'Anmian')).toBe(true);
    });

    it('should include SP6 for heart_spleen_deficiency', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_deficiency',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.acupoints.some(p => p.code === 'SP6')).toBe(true);
    });

    it('should include PC6 for liver_fire', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_stagnation',
        insomniaPattern: 'liver_fire',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.acupoints.some(p => p.code === 'PC6')).toBe(true);
    });

    it('should include KI3 for yin_deficiency_fire', () => {
      const assessment: ITCMAssessment = {
        constitution: 'yin_deficiency',
        insomniaPattern: 'yin_deficiency_fire',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.acupoints.some(p => p.code === 'KI3')).toBe(true);
    });

    it('should include herbal formula', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_deficiency',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture', 'herbal_medicine'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.herbalFormula).toBeDefined();
    });

    it('should include Qigong for qi_deficiency constitution', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_deficiency',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture', 'qigong'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.mindBodyProtocol).toBeDefined();
      expect(plan.mindBodyProtocol!.type).toBe('qigong');
    });

    it('should include Tai Chi for other constitutions', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_stagnation',
        insomniaPattern: 'liver_fire',
        recommendedTherapies: ['acupuncture', 'tai_chi'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.mindBodyProtocol).toBeDefined();
      expect(plan.mindBodyProtocol!.type).toBe('tai_chi');
    });

    it('should create different schedules based on integration mode', () => {
      const tcmPrimaryAssessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'tcm_primary',
        rationale: '',
      };

      const cbtiPrimaryAssessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const tcmPrimaryPlan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), tcmPrimaryAssessment);
      const cbtiPrimaryPlan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), cbtiPrimaryAssessment);

      // Should have different schedules
      expect(tcmPrimaryPlan.schedule.tcmSessions.length).toBeGreaterThanOrEqual(
        tcmPrimaryPlan.schedule.cbtiSessions.length
      );
      expect(cbtiPrimaryPlan.schedule.cbtiSessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should initialize progress tracking', () => {
      const assessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'cbti_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.progress.cbtiAdherence).toBe(0);
      expect(plan.progress.tcmAdherence).toBe(0);
      expect(plan.progress.combinedEffectiveness).toBe(0);
    });
  });

  describe('getAcupressureInstructions()', () => {
    it('should return instructions array', () => {
      const acupoints = INSOMNIA_ACUPOINTS.slice(0, 2);
      const instructions = engine.getAcupressureInstructions(acupoints);

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should include general rules', () => {
      const acupoints = INSOMNIA_ACUPOINTS.slice(0, 1);
      const instructions = engine.getAcupressureInstructions(acupoints);

      expect(instructions.some(i => i.includes('правила') || i.includes('Общие'))).toBe(true);
      expect(instructions.some(i => i.includes('минут') || i.includes('сна'))).toBe(true);
    });

    it('should include instructions for each acupoint', () => {
      const acupoints = [
        INSOMNIA_ACUPOINTS.find(p => p.code === 'HT7')!,
        INSOMNIA_ACUPOINTS.find(p => p.code === 'SP6')!,
      ];

      const instructions = engine.getAcupressureInstructions(acupoints);

      expect(instructions.some(i => i.includes('神门') || i.includes('Shenmen'))).toBe(true);
      expect(instructions.some(i => i.includes('三阴交') || i.includes('Sanyinjiao'))).toBe(true);
    });

    it('should include location and indication for points', () => {
      const acupoints = [INSOMNIA_ACUPOINTS.find(p => p.code === 'HT7')!];
      const instructions = engine.getAcupressureInstructions(acupoints);

      expect(instructions.some(i => i.includes('Расположение'))).toBe(true);
      expect(instructions.some(i => i.includes('Действие'))).toBe(true);
    });

    it('should include massage technique', () => {
      const acupoints = [INSOMNIA_ACUPOINTS.find(p => p.code === 'HT7')!];
      const instructions = engine.getAcupressureInstructions(acupoints);

      expect(instructions.some(i => i.includes('круговые') || i.includes('Техника'))).toBe(true);
    });
  });

  describe('Integration modes', () => {
    it('should create tcm_primary schedule', () => {
      const assessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'tcm_primary',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.schedule.tcmSessions.length).toBeGreaterThan(0);
      expect(plan.schedule.mindBodyPractice.length).toBeGreaterThan(0);
    });

    it('should create parallel schedule', () => {
      const assessment: ITCMAssessment = {
        constitution: 'qi_stagnation',
        insomniaPattern: 'liver_fire',
        recommendedTherapies: ['acupuncture', 'tai_chi'],
        integrationMode: 'parallel',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.schedule.cbtiSessions.length).toBeGreaterThan(0);
      expect(plan.schedule.tcmSessions.length).toBeGreaterThan(0);
    });

    it('should create sequential schedule', () => {
      const assessment: ITCMAssessment = {
        constitution: 'balanced',
        insomniaPattern: 'heart_spleen_deficiency',
        recommendedTherapies: ['acupuncture'],
        integrationMode: 'sequential',
        rationale: '',
      };

      const plan = engine.createIntegratedPlan('user-123', createMockCBTIPlan(), assessment);

      expect(plan.schedule.cbtiSessions.some(s => s.includes('Недел'))).toBe(true);
      expect(plan.schedule.tcmSessions.some(s => s.includes('Недел'))).toBe(true);
    });
  });

  describe('Rationale generation', () => {
    it('should include pattern name in rationale', () => {
      const state = createTestSleepState({
        sleepOnsetLatency: 50,
        sleepSelfEfficacy: 0.3,
      });

      const assessment = engine.assessTCMProfile(state);

      expect(assessment.rationale).toContain('Сердц');
    });

    it('should mention integration approach', () => {
      const state = createTestSleepState({ isiScore: 24 });
      const assessment = engine.assessTCMProfile(state);

      expect(assessment.rationale).toContain('КПТ-И');
    });

    it('should reference evidence', () => {
      const state = createTestSleepState();
      const assessment = engine.assessTCMProfile(state);

      const hasEvidence =
        assessment.rationale.includes('исследован') ||
        assessment.rationale.includes('2023') ||
        assessment.rationale.includes('2025');
      expect(hasEvidence).toBe(true);
    });
  });
});
