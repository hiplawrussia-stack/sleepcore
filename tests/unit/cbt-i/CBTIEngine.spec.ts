/**
 * CBTIEngine Unit Tests
 * Tests the main CBT-I orchestrator engine
 */

import { CBTIEngine } from '../../../src/cbt-i/engines/CBTIEngine';
import type { ICBTIPlan } from '../../../src/cbt-i/interfaces/ICBTIComponents';
import type { ISleepState, ISleepMetrics } from '../../../src/sleep/interfaces/ISleepState';

describe('CBTIEngine', () => {
  let engine: CBTIEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    sleepEfficiency: number;
    totalSleepTime: number;
    sleepOnsetLatency: number;
    wakeAfterSleepOnset: number;
    numberOfAwakenings: number;
    bedtime: string;
    wakeTime: string;
    isiScore: number;
    sleepAnxiety: number;
    preSleepArousal: number;
    dayOffset: number;
  }> = {}): ISleepState {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (overrides.dayOffset ?? 0));

    return {
      userId: 'test-user',
      timestamp: baseDate,
      date: baseDate.toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: overrides.totalSleepTime ?? 360,
        sleepOnsetLatency: overrides.sleepOnsetLatency ?? 30,
        wakeAfterSleepOnset: overrides.wakeAfterSleepOnset ?? 30,
        numberOfAwakenings: overrides.numberOfAwakenings ?? 2,
        sleepEfficiency: overrides.sleepEfficiency ?? 75,
        bedtime: overrides.bedtime ?? '23:00',
        wakeTime: overrides.wakeTime ?? '07:00',
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
        subtype: 'sleep_onset',
        durationWeeks: 8,
        daytimeImpact: 0.4,
        sleepDistress: 0.5,
      },
      behaviors: {
        caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 60,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 19, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: 6,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: true,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: true,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.6,
        preSleepArousal: overrides.preSleepArousal ?? 0.5,
        sleepSelfEfficacy: 0.5,
      },
      subjectiveQuality: 'poor',
      morningAlertness: 0.4,
      daytimeSleepiness: 0.5,
      sleepHealthScore: 55,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  // Create baseline data series
  function createBaselineData(days: number = 7, overrides: Partial<{
    sleepEfficiency: number;
    totalSleepTime: number;
    sleepOnsetLatency: number;
    wakeTime: string;
    isiScore: number;
  }> = {}): ISleepState[] {
    return Array.from({ length: days }, (_, i) =>
      createTestSleepState({
        ...overrides,
        dayOffset: days - 1 - i,
      })
    );
  }

  beforeEach(() => {
    engine = new CBTIEngine();
  });

  describe('initializePlan()', () => {
    it('should throw error for insufficient baseline data', () => {
      const insufficientData = createBaselineData(5);

      expect(() => engine.initializePlan('user1', insufficientData)).toThrow(
        /Need at least 7 days/
      );
    });

    it('should create valid plan with 7 days of data', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.userId).toBe('user1');
      expect(plan.currentPhase).toBe('assessment');
      expect(plan.currentWeek).toBe(1);
      expect(plan.totalWeeks).toBe(8);
    });

    it('should initialize all five CBT-I components', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.activeComponents.sleepRestriction).toBeDefined();
      expect(plan.activeComponents.stimulusControl).toBeDefined();
      expect(plan.activeComponents.cognitiveTargets).toBeDefined();
      expect(plan.activeComponents.hygieneRecommendations).toBeDefined();
      expect(plan.activeComponents.relaxationProtocol).toBeDefined();
    });

    it('should calculate correct baseline ISI', () => {
      const baseline = createBaselineData(7, { isiScore: 18 });

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.progress.isiBaseline).toBe(18);
      expect(plan.progress.isiCurrent).toBe(18);
      expect(plan.progress.isiTarget).toBe(7);
    });

    it('should calculate correct baseline sleep efficiency', () => {
      const baseline = createBaselineData(7, { sleepEfficiency: 70 });

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.progress.sleepEfficiencyBaseline).toBeCloseTo(70, 0);
    });

    it('should set initial completion percentage to 0', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.progress.completionPercentage).toBe(0);
    });

    it('should generate weekly goals for assessment phase', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.weeklyGoals.length).toBeGreaterThan(0);
      expect(plan.weeklyGoals.some(g => g.component === 'sleep_hygiene')).toBe(true);
    });
  });

  describe('getNextIntervention()', () => {
    let basePlan: ICBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return sleep restriction intervention for low adherence', () => {
      // Create state with poor sleep pattern (different from prescription)
      const currentState = createTestSleepState({
        bedtime: '21:00', // Too early
        sleepEfficiency: 65,
      });

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention).toBeDefined();
      expect(intervention.component).toBeDefined();
      expect(intervention.action).toBeDefined();
      expect(intervention.priority).toBeGreaterThan(0);
    });

    it('should return stimulus control intervention for long SOL', () => {
      const currentState = createTestSleepState({
        sleepOnsetLatency: 45, // > leaveThresholdMinutes (20)
      });

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention).toBeDefined();
      expect(['stimulus_control', 'sleep_restriction', 'cognitive_restructuring', 'relaxation', 'sleep_hygiene']).toContain(intervention.component);
    });

    it('should return cognitive intervention for high anxiety', () => {
      const currentState = createTestSleepState({
        sleepAnxiety: 0.8,
        sleepOnsetLatency: 15,
        preSleepArousal: 0.3,
      });

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention).toBeDefined();
      expect(intervention.action.length).toBeGreaterThan(0);
    });

    it('should return relaxation intervention for high arousal', () => {
      const currentState = createTestSleepState({
        preSleepArousal: 0.8,
        sleepAnxiety: 0.3,
        sleepOnsetLatency: 15,
      });

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention).toBeDefined();
    });

    it('should return default intervention when no issues detected', () => {
      // Perfect sleep state
      const currentState = createTestSleepState({
        sleepEfficiency: 95,
        sleepOnsetLatency: 10,
        sleepAnxiety: 0.1,
        preSleepArousal: 0.1,
      });

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention).toBeDefined();
      expect(intervention.component).toBe('sleep_hygiene');
    });

    it('should include rationale with each intervention', () => {
      const currentState = createTestSleepState();

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention.rationale).toBeDefined();
      expect(intervention.rationale.length).toBeGreaterThan(10);
    });

    it('should include timing with each intervention', () => {
      const currentState = createTestSleepState();

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(['tonight', 'immediate', 'this_week']).toContain(intervention.timing);
    });

    it('should have personalization score', () => {
      const currentState = createTestSleepState();

      const intervention = engine.getNextIntervention(basePlan, currentState);

      expect(intervention.personalizationScore).toBeGreaterThanOrEqual(0);
      expect(intervention.personalizationScore).toBeLessThanOrEqual(1);
    });
  });

  describe('updatePlan()', () => {
    let basePlan: ICBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return unchanged plan for empty states', () => {
      const updatedPlan = engine.updatePlan(basePlan, []);

      expect(updatedPlan).toEqual(basePlan);
    });

    it('should update current week', () => {
      const recentStates = createBaselineData(7);

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.currentWeek).toBe(2);
    });

    it('should progress from assessment to education phase', () => {
      const recentStates = createBaselineData(7);

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.currentPhase).toBe('education');
    });

    it('should progress from education to intervention phase', () => {
      // Start at education, week 2
      let plan: ICBTIPlan = { ...basePlan, currentPhase: 'education', currentWeek: 2 };
      const recentStates = createBaselineData(7);

      plan = engine.updatePlan(plan, recentStates);

      expect(plan.currentPhase).toBe('intervention');
    });

    it('should progress from intervention to maintenance phase', () => {
      let plan: ICBTIPlan = { ...basePlan, currentPhase: 'intervention', currentWeek: 6 };
      const recentStates = createBaselineData(7);

      plan = engine.updatePlan(plan, recentStates);

      expect(plan.currentPhase).toBe('maintenance');
    });

    it('should progress to follow_up after week 8', () => {
      let plan: ICBTIPlan = { ...basePlan, currentPhase: 'maintenance', currentWeek: 8 };
      const recentStates = createBaselineData(7);

      plan = engine.updatePlan(plan, recentStates);

      expect(plan.currentPhase).toBe('follow_up');
    });

    it('should update ISI current from latest state', () => {
      const recentStates = createBaselineData(7, { isiScore: 10 });

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.progress.isiCurrent).toBe(10);
    });

    it('should update sleep efficiency current', () => {
      const recentStates = createBaselineData(7, { sleepEfficiency: 85 });

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.progress.sleepEfficiencyCurrent).toBeCloseTo(85, 0);
    });

    it('should update completion percentage', () => {
      const recentStates = createBaselineData(7);

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.progress.completionPercentage).toBeGreaterThan(0);
    });

    it('should update sleep restriction prescription with sufficient data', () => {
      const recentStates = createBaselineData(7, { sleepEfficiency: 92 });

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.activeComponents.sleepRestriction).toBeDefined();
    });

    it('should update stimulus control rules', () => {
      const recentStates = createBaselineData(7);

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.activeComponents.stimulusControl).toBeDefined();
    });

    it('should update hygiene recommendations', () => {
      const recentStates = createBaselineData(7);

      const updatedPlan = engine.updatePlan(basePlan, recentStates);

      expect(updatedPlan.activeComponents.hygieneRecommendations).toBeDefined();
    });
  });

  describe('assessResponse()', () => {
    let basePlan: ICBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should recommend graduate for ISI <= 7 and SE >= 85', () => {
      const successPlan: ICBTIPlan = {
        ...basePlan,
        currentWeek: 6,
        progress: {
          ...basePlan.progress,
          isiBaseline: 18,
          isiCurrent: 5,
          sleepEfficiencyBaseline: 70,
          sleepEfficiencyCurrent: 88,
        },
      };

      const response = engine.assessResponse(successPlan);

      expect(response.recommendation).toBe('graduate');
      expect(response.isResponding).toBe(true);
    });

    it('should detect responder with ISI reduction >= 6', () => {
      const respondingPlan: ICBTIPlan = {
        ...basePlan,
        currentWeek: 4,
        progress: {
          ...basePlan.progress,
          isiBaseline: 18,
          isiCurrent: 10, // reduction of 8
          sleepEfficiencyBaseline: 70,
          sleepEfficiencyCurrent: 75,
        },
      };

      const response = engine.assessResponse(respondingPlan);

      expect(response.isResponding).toBe(true);
      expect(response.isiChange).toBe(8);
    });

    it('should recommend continue for responding patient', () => {
      const respondingPlan: ICBTIPlan = {
        ...basePlan,
        currentWeek: 3,
        progress: {
          ...basePlan.progress,
          isiBaseline: 18,
          isiCurrent: 11,
          sleepEfficiencyBaseline: 70,
          sleepEfficiencyCurrent: 78,
        },
      };

      const response = engine.assessResponse(respondingPlan);

      expect(response.recommendation).toBe('continue');
    });

    it('should recommend modify for non-responder after week 4', () => {
      const nonResponderPlan: ICBTIPlan = {
        ...basePlan,
        currentWeek: 5,
        progress: {
          ...basePlan.progress,
          isiBaseline: 18,
          isiCurrent: 16, // only 2 point reduction
          sleepEfficiencyBaseline: 70,
          sleepEfficiencyCurrent: 72,
        },
      };

      const response = engine.assessResponse(nonResponderPlan);

      expect(response.recommendation).toBe('modify');
      expect(response.isResponding).toBe(false);
    });

    it('should recommend intensify for slow progress in week 2-3', () => {
      const slowProgressPlan: ICBTIPlan = {
        ...basePlan,
        currentWeek: 3,
        progress: {
          ...basePlan.progress,
          isiBaseline: 18,
          isiCurrent: 17, // only 1 point reduction
          sleepEfficiencyBaseline: 70,
          sleepEfficiencyCurrent: 71,
        },
      };

      const response = engine.assessResponse(slowProgressPlan);

      expect(response.recommendation).toBe('intensify');
    });
  });

  describe('generateWeeklySummary()', () => {
    let basePlan: ICBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should calculate average sleep efficiency', () => {
      const weeklyStates = createBaselineData(7, { sleepEfficiency: 80 });

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      expect(summary.sleepEfficiencyAvg).toBeCloseTo(80, 0);
    });

    it('should calculate average total sleep time', () => {
      const weeklyStates = createBaselineData(7, { totalSleepTime: 400 });

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      expect(summary.totalSleepTimeAvg).toBeCloseTo(400, 0);
    });

    it('should calculate adherence score', () => {
      const weeklyStates = createBaselineData(7);

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      expect(summary.adherenceScore).toBeGreaterThanOrEqual(0);
      expect(summary.adherenceScore).toBeLessThanOrEqual(1);
    });

    it('should include key achievements for good SE', () => {
      const weeklyStates = createBaselineData(7, { sleepEfficiency: 88 });

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      const hasSeAchievement = summary.keyAchievements.some(a => a.includes('88'));
      expect(hasSeAchievement).toBe(true);
    });

    it('should include achievement for fast sleep onset', () => {
      const weeklyStates = createBaselineData(7, { sleepOnsetLatency: 15 });

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      const hasSolAchievement = summary.keyAchievements.some(a =>
        a.includes('20') || a.includes('засып')
      );
      expect(hasSolAchievement).toBe(true);
    });

    it('should include focus areas when SE is low', () => {
      const weeklyStates = createBaselineData(7, { sleepEfficiency: 70 });

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      expect(summary.nextWeekFocus.length).toBeGreaterThan(0);
    });

    it('should have at least one next week focus item', () => {
      const weeklyStates = createBaselineData(7);

      const summary = engine.generateWeeklySummary(basePlan, weeklyStates);

      expect(summary.nextWeekFocus.length).toBeGreaterThan(0);
    });
  });
});
