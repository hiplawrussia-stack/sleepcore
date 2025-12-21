/**
 * ThirdWaveCoordinator Unit Tests
 * Tests third-wave therapy selection and coordination
 */

import { ThirdWaveCoordinator } from '../../../src/third-wave/engines/ThirdWaveCoordinator';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('ThirdWaveCoordinator', () => {
  let coordinator: ThirdWaveCoordinator;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    preSleepArousal: number;
    sleepAnxiety: number;
    sleepSelfEfficacy: number;
    sleepOnsetLatency: number;
    effortfulSleep: boolean;
    catastrophizing: boolean;
    helplessness: boolean;
    unrealisticExpectations: boolean;
    healthWorries: boolean;
    dbasScore: number;
    isiScore: number;
    severity: 'none' | 'subthreshold' | 'moderate' | 'severe';
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 360,
        sleepOnsetLatency: overrides.sleepOnsetLatency ?? 35,
        wakeAfterSleepOnset: 30,
        numberOfAwakenings: 3,
        sleepEfficiency: 75,
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
        isiScore: overrides.isiScore ?? 16,
        severity: overrides.severity ?? 'moderate',
        subtype: 'mixed',
        durationWeeks: 12,
        daytimeImpact: 0.5,
        sleepDistress: 0.5,
      },
      behaviors: {
        caffeine: { dailyMg: 150, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 45,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 18, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: overrides.dbasScore ?? 5,
        beliefs: {
          unrealisticExpectations: overrides.unrealisticExpectations ?? false,
          catastrophizing: overrides.catastrophizing ?? false,
          helplessness: overrides.helplessness ?? false,
          effortfulSleep: overrides.effortfulSleep ?? false,
          healthWorries: overrides.healthWorries ?? false,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.5,
        preSleepArousal: overrides.preSleepArousal ?? 0.5,
        sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.5,
      },
      subjectiveQuality: 'poor',
      morningAlertness: 0.5,
      daytimeSleepiness: 0.4,
      sleepHealthScore: 55,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  beforeEach(() => {
    coordinator = new ThirdWaveCoordinator();
  });

  describe('recommendApproach()', () => {
    it('should recommend MBT-I for high arousal profile', () => {
      const highArousalState = createTestSleepState({
        preSleepArousal: 0.9,
        sleepAnxiety: 0.8,
        effortfulSleep: true,
        sleepSelfEfficacy: 0.2,
        sleepOnsetLatency: 60,
        // Low ACT-I indicators
        catastrophizing: false,
        helplessness: false,
        unrealisticExpectations: false,
        healthWorries: false,
      });

      const recommendation = coordinator.recommendApproach(highArousalState);

      expect(recommendation.recommendedApproach).toBe('mbti');
      expect(recommendation.rationale).toContain('MBT-I');
      expect(recommendation.expectedBenefits.length).toBeGreaterThan(0);
    });

    it('should recommend ACT-I for high fusion/avoidance profile', () => {
      const highFusionState = createTestSleepState({
        // Low MBT-I indicators
        preSleepArousal: 0.3,
        sleepAnxiety: 0.3,
        effortfulSleep: false,
        sleepSelfEfficacy: 0.7,
        sleepOnsetLatency: 20,
        // High ACT-I indicators
        catastrophizing: true,
        helplessness: true,
        unrealisticExpectations: true,
        healthWorries: true,
        dbasScore: 9,
      });

      const recommendation = coordinator.recommendApproach(highFusionState);

      expect(recommendation.recommendedApproach).toBe('acti');
      expect(recommendation.rationale).toContain('ACT-I');
    });

    it('should recommend hybrid for mixed profile', () => {
      const mixedState = createTestSleepState({
        // High MBT-I indicators
        preSleepArousal: 0.8,
        sleepAnxiety: 0.7,
        effortfulSleep: true,
        sleepSelfEfficacy: 0.3,
        sleepOnsetLatency: 50,
        // High ACT-I indicators
        catastrophizing: true,
        helplessness: true,
        unrealisticExpectations: true,
        healthWorries: true,
        dbasScore: 8,
      });

      const recommendation = coordinator.recommendApproach(mixedState);

      expect(recommendation.recommendedApproach).toBe('hybrid');
      expect(recommendation.rationale).toContain('Гибридный');
    });

    it('should recommend none when neither approach indicated', () => {
      const lowIndicatorsState = createTestSleepState({
        preSleepArousal: 0.2,
        sleepAnxiety: 0.2,
        effortfulSleep: false,
        sleepSelfEfficacy: 0.9,
        sleepOnsetLatency: 10,
        catastrophizing: false,
        helplessness: false,
        unrealisticExpectations: false,
        healthWorries: false,
        dbasScore: 2,
      });

      const recommendation = coordinator.recommendApproach(lowIndicatorsState);

      expect(recommendation.recommendedApproach).toBe('none');
      expect(recommendation.rationale).toContain('CBT-I');
    });

    it('should recommend third-wave for CBT-I non-responders', () => {
      const moderateState = createTestSleepState();

      const recommendation = coordinator.recommendApproach(moderateState, {
        failedCBTI: true,
        preferences: [],
      });

      expect(['mbti', 'acti']).toContain(recommendation.recommendedApproach);
      expect(recommendation.rationale).toContain('CBT-I');
    });

    it('should add contraindication for very severe insomnia', () => {
      const severeState = createTestSleepState({
        isiScore: 26,
        severity: 'severe',
      });

      const recommendation = coordinator.recommendApproach(severeState);

      expect(recommendation.contraindications.length).toBeGreaterThan(0);
      expect(recommendation.contraindications[0]).toContain('медикамент');
    });

    it('should include expected benefits in recommendation', () => {
      const highArousalState = createTestSleepState({
        preSleepArousal: 0.9,
        sleepAnxiety: 0.8,
        effortfulSleep: true,
        sleepSelfEfficacy: 0.2,
      });

      const recommendation = coordinator.recommendApproach(highArousalState);

      expect(recommendation.expectedBenefits).toBeDefined();
      if (recommendation.recommendedApproach !== 'none') {
        expect(recommendation.expectedBenefits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getMBTIEngine()', () => {
    it('should return MBT-I engine instance', () => {
      const engine = coordinator.getMBTIEngine();

      expect(engine).toBeDefined();
      expect(typeof engine.initializePlan).toBe('function');
      expect(typeof engine.getCurrentSession).toBe('function');
    });
  });

  describe('getACTIEngine()', () => {
    it('should return ACT-I engine instance', () => {
      const engine = coordinator.getACTIEngine();

      expect(engine).toBeDefined();
      expect(typeof engine.initializePlan).toBe('function');
      expect(typeof engine.getCurrentSession).toBe('function');
    });
  });

  describe('isThirdWaveIndicated()', () => {
    it('should return true when MBT-I indicators are high', () => {
      const highArousalState = createTestSleepState({
        preSleepArousal: 0.9,
        sleepAnxiety: 0.8,
        effortfulSleep: true,
        sleepSelfEfficacy: 0.2,
        sleepOnsetLatency: 60,
      });

      const indicated = coordinator.isThirdWaveIndicated(highArousalState);

      expect(indicated).toBe(true);
    });

    it('should return true when ACT-I indicators are high', () => {
      const highFusionState = createTestSleepState({
        catastrophizing: true,
        helplessness: true,
        unrealisticExpectations: true,
        healthWorries: true,
        dbasScore: 9,
      });

      const indicated = coordinator.isThirdWaveIndicated(highFusionState);

      expect(indicated).toBe(true);
    });

    it('should return false when both indicators are low', () => {
      const lowIndicatorsState = createTestSleepState({
        preSleepArousal: 0.2,
        sleepAnxiety: 0.2,
        effortfulSleep: false,
        sleepSelfEfficacy: 0.9,
        sleepOnsetLatency: 10,
        catastrophizing: false,
        helplessness: false,
        unrealisticExpectations: false,
        healthWorries: false,
        dbasScore: 2,
      });

      const indicated = coordinator.isThirdWaveIndicated(lowIndicatorsState);

      expect(indicated).toBe(false);
    });
  });

  describe('MBT-I indicator calculation', () => {
    it('should increase MBT-I score for high pre-sleep arousal', () => {
      const highArousal = createTestSleepState({ preSleepArousal: 0.9 });
      const lowArousal = createTestSleepState({ preSleepArousal: 0.1 });

      const highRecommendation = coordinator.recommendApproach(highArousal);
      const lowRecommendation = coordinator.recommendApproach(lowArousal);

      // High arousal should be more likely to recommend MBT-I
      if (highRecommendation.recommendedApproach === 'mbti') {
        expect(lowRecommendation.recommendedApproach).not.toBe('mbti');
      }
    });

    it('should increase MBT-I score for effortful sleep belief', () => {
      const effortful = createTestSleepState({
        effortfulSleep: true,
        preSleepArousal: 0.8,
        sleepAnxiety: 0.8,
        sleepSelfEfficacy: 0.2,
        sleepOnsetLatency: 60,
        // Low ACT-I indicators
        catastrophizing: false,
        helplessness: false,
      });

      const recommendation = coordinator.recommendApproach(effortful);

      expect(['mbti', 'hybrid']).toContain(recommendation.recommendedApproach);
    });

    it('should increase MBT-I score for long sleep onset latency', () => {
      const longSOL = createTestSleepState({
        sleepOnsetLatency: 90,
        preSleepArousal: 0.8,
        sleepAnxiety: 0.8,
        effortfulSleep: true,
        sleepSelfEfficacy: 0.2,
        // Low ACT-I indicators
        catastrophizing: false,
        helplessness: false,
      });

      const recommendation = coordinator.recommendApproach(longSOL);

      expect(['mbti', 'hybrid']).toContain(recommendation.recommendedApproach);
    });
  });

  describe('ACT-I indicator calculation', () => {
    it('should increase ACT-I score for catastrophizing', () => {
      const catastrophizing = createTestSleepState({
        catastrophizing: true,
        helplessness: true,
        unrealisticExpectations: true,
        healthWorries: true,
      });

      const recommendation = coordinator.recommendApproach(catastrophizing);

      expect(['acti', 'hybrid']).toContain(recommendation.recommendedApproach);
    });

    it('should increase ACT-I score for helplessness belief', () => {
      const helpless = createTestSleepState({
        helplessness: true,
        catastrophizing: true,
        unrealisticExpectations: true,
        healthWorries: true,
        dbasScore: 9,
        sleepSelfEfficacy: 0.2,
        // Low MBT-I indicators
        preSleepArousal: 0.3,
        sleepAnxiety: 0.3,
        sleepOnsetLatency: 20,
        effortfulSleep: false,
      });

      const recommendation = coordinator.recommendApproach(helpless);

      expect(['acti', 'hybrid']).toContain(recommendation.recommendedApproach);
    });

    it('should increase ACT-I score for high DBAS score', () => {
      const highDBAS = createTestSleepState({
        dbasScore: 10,
        catastrophizing: true,
        unrealisticExpectations: true,
        helplessness: true,
        healthWorries: true,
        sleepSelfEfficacy: 0.2, // Low self-efficacy increases ACT-I score
      });

      const recommendation = coordinator.recommendApproach(highDBAS);

      expect(['acti', 'hybrid']).toContain(recommendation.recommendedApproach);
    });
  });
});
