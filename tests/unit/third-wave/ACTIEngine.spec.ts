/**
 * ACTIEngine Unit Tests
 * Tests Acceptance and Commitment Therapy for Insomnia implementation
 */

import { ACTIEngine } from '../../../src/third-wave/engines/ACTIEngine';
import type { IACTIPlan, IValuesAssessment } from '../../../src/third-wave/interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('ACTIEngine', () => {
  let engine: ACTIEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    sleepAnxiety: number;
    preSleepArousal: number;
    sleepSelfEfficacy: number;
    effortfulSleep: boolean;
    unrealisticExpectations: boolean;
    catastrophizing: boolean;
    isiScore: number;
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
        totalSleepTime: 360,
        sleepOnsetLatency: 45,
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
        severity: 'moderate',
        subtype: 'mixed',
        durationWeeks: 12,
        daytimeImpact: 0.5,
        sleepDistress: 0.6,
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
        dbasScore: 7,
        beliefs: {
          unrealisticExpectations: overrides.unrealisticExpectations ?? true,
          catastrophizing: overrides.catastrophizing ?? true,
          helplessness: false,
          effortfulSleep: overrides.effortfulSleep ?? true,
          healthWorries: true,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.7,
        preSleepArousal: overrides.preSleepArousal ?? 0.6,
        sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.4,
      },
      subjectiveQuality: 'poor',
      morningAlertness: 0.4,
      daytimeSleepiness: 0.5,
      sleepHealthScore: 50,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  function createBaselineData(days: number = 7): ISleepState[] {
    return Array.from({ length: days }, (_, i) =>
      createTestSleepState({ dayOffset: days - 1 - i })
    );
  }

  beforeEach(() => {
    engine = new ACTIEngine();
  });

  describe('initializePlan()', () => {
    it('should create valid ACT-I plan', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.userId).toBe('user1');
      expect(plan.currentSession).toBe(1);
      expect(plan.totalSessions).toBe(6);
    });

    it('should set initial flexibility scores', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.flexibility.acceptanceBaseline).toBeGreaterThanOrEqual(0);
      expect(plan.flexibility.acceptanceBaseline).toBeLessThanOrEqual(1);
      expect(plan.flexibility.defusionBaseline).toBeGreaterThanOrEqual(0);
      expect(plan.flexibility.defusionBaseline).toBeLessThanOrEqual(1);
    });

    it('should initialize sleep willingness based on effortful sleep belief', () => {
      const baseline = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          effortfulSleep: i === 6, // Last one has effortful sleep
          dayOffset: 6 - i,
        })
      );

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.sleepWillingness.baseline).toBe(0.3);
    });

    it('should set higher willingness when no effortful sleep belief', () => {
      const baseline = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          effortfulSleep: false,
          dayOffset: 6 - i,
        })
      );

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.sleepWillingness.baseline).toBe(0.7);
    });

    it('should initialize with first session details', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.sessionDetails).toBeDefined();
      expect(plan.sessionDetails.sessionNumber).toBe(1);
      expect(plan.sessionDetails.primaryProcess).toBe('acceptance');
    });

    it('should initialize empty arrays for tracking', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.unwantedExperiences).toEqual([]);
      expect(plan.defusionPractice).toEqual([]);
      expect(plan.committedActions).toEqual([]);
      expect(plan.completedSessions).toEqual([]);
    });
  });

  describe('getCurrentSession()', () => {
    it('should return first session for new plan', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);

      const session = engine.getCurrentSession(plan);

      expect(session.sessionNumber).toBe(1);
      expect(session.theme).toContain('ловушк');
    });

    it('should return second session when currentSession is 2', () => {
      const baseline = createBaselineData(7);
      const plan: IACTIPlan = {
        ...engine.initializePlan('user1', baseline),
        currentSession: 2,
      };

      const session = engine.getCurrentSession(plan);

      expect(session.sessionNumber).toBe(2);
      expect(session.primaryProcess).toBe('cognitive_defusion');
    });

    it('should not exceed template count', () => {
      const baseline = createBaselineData(7);
      const plan: IACTIPlan = {
        ...engine.initializePlan('user1', baseline),
        currentSession: 10,
      };

      const session = engine.getCurrentSession(plan);

      expect(session).toBeDefined();
    });
  });

  describe('identifyUnwantedExperiences()', () => {
    it('should identify thought patterns from text', () => {
      const text = 'Я не засну сегодня опять, как всегда';

      const experiences = engine.identifyUnwantedExperiences(text, 'pre_sleep');

      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences.some(e => e.type === 'thought')).toBe(true);
    });

    it('should identify feeling patterns from text', () => {
      const text = 'Ужасная тревога перед сном, меня беспокоит бессонница';

      const experiences = engine.identifyUnwantedExperiences(text, 'pre_sleep');

      expect(experiences.some(e => e.type === 'feeling')).toBe(true);
    });

    it('should identify sensation patterns from text', () => {
      const text = 'Сильное напряжение в теле, сердце бьётся';

      const experiences = engine.identifyUnwantedExperiences(text, 'during_night');

      expect(experiences.some(e => e.type === 'sensation')).toBe(true);
    });

    it('should return empty array for neutral text', () => {
      const text = 'Сегодня был хороший день на работе';

      const experiences = engine.identifyUnwantedExperiences(text, 'daytime');

      expect(experiences.length).toBe(0);
    });

    it('should set context correctly', () => {
      const text = 'Завтра будет ужасный день если не высплюсь';

      const experiences = engine.identifyUnwantedExperiences(text, 'morning');

      experiences.forEach(exp => {
        expect(exp.context).toBe('morning');
      });
    });

    it('should generate unique IDs for experiences', () => {
      const text = 'Не засну, не справлюсь завтра, никогда не будет нормально';

      const experiences = engine.identifyUnwantedExperiences(text, 'pre_sleep');

      const ids = experiences.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set fusion level for identified experiences', () => {
      const text = 'Я никогда не смогу нормально спать, это безнадёжно';

      const experiences = engine.identifyUnwantedExperiences(text, 'pre_sleep');

      experiences.forEach(exp => {
        expect(exp.fusionLevel).toBeGreaterThan(0);
        expect(exp.fusionLevel).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getDefusionTechnique()', () => {
    it('should return defusion technique for thought experience', () => {
      const experience = {
        id: 'exp1',
        type: 'thought' as const,
        content: 'Я не засну',
        context: 'pre_sleep' as const,
        frequency: 0.7,
        distress: 0.6,
        fusionLevel: 0.7,
        avoidanceBehaviors: [],
      };

      const technique = engine.getDefusionTechnique(experience, 'beginner');

      expect(technique).toBeDefined();
      expect(technique.name).toBeDefined();
      expect(technique.instructions).toBeDefined();
    });

    it('should return beginner-appropriate technique for beginners', () => {
      const experience = {
        id: 'exp1',
        type: 'thought' as const,
        content: 'Test thought',
        context: 'pre_sleep' as const,
        frequency: 0.5,
        distress: 0.5,
        fusionLevel: 0.5,
        avoidanceBehaviors: [],
      };

      const technique = engine.getDefusionTechnique(experience, 'beginner');

      expect(technique.difficulty).toBe('beginner');
    });

    it('should include advanced techniques for advanced users', () => {
      const experience = {
        id: 'exp1',
        type: 'feeling' as const,
        content: 'Тревога',
        context: 'pre_sleep' as const,
        frequency: 0.8,
        distress: 0.8,
        fusionLevel: 0.8,
        avoidanceBehaviors: [],
      };

      const technique = engine.getDefusionTechnique(experience, 'advanced');

      expect(technique).toBeDefined();
    });
  });

  describe('conductValuesAssessment()', () => {
    it('should create values assessment with all domains', () => {
      const responses = {
        health_importance: 8,
        health_action: 5,
        relationships_importance: 9,
        relationships_action: 6,
        work_importance: 7,
        work_action: 4,
        leisure_importance: 6,
        leisure_action: 3,
        growth_importance: 7,
        growth_action: 5,
      };

      const assessment = engine.conductValuesAssessment('user1', responses);

      expect(assessment.userId).toBe('user1');
      expect(assessment.domains.health.importance).toBe(8);
      expect(assessment.domains.relationships.importance).toBe(9);
    });

    it('should use default values when responses missing', () => {
      const assessment = engine.conductValuesAssessment('user1', {});

      expect(assessment.domains.health.importance).toBeDefined();
      expect(assessment.domains.relationships.importance).toBeDefined();
    });

    it('should include insomnia impact list', () => {
      const assessment = engine.conductValuesAssessment('user1', {});

      expect(assessment.insomniaImpact.length).toBeGreaterThan(0);
    });

    it('should include sleep goals', () => {
      const assessment = engine.conductValuesAssessment('user1', {});

      expect(assessment.sleepGoals.length).toBeGreaterThan(0);
    });
  });

  describe('generateCommittedActions()', () => {
    let valuesAssessment: IValuesAssessment;

    beforeEach(() => {
      valuesAssessment = engine.conductValuesAssessment('user1', {
        health_importance: 9,
        health_action: 3,
        relationships_importance: 8,
        relationships_action: 7,
        work_importance: 6,
        work_action: 6,
      });
    });

    it('should generate committed actions based on values gaps', () => {
      const state = createTestSleepState();

      const actions = engine.generateCommittedActions(valuesAssessment, state);

      expect(actions.length).toBeGreaterThanOrEqual(2);
    });

    it('should include sleep-specific committed action', () => {
      const state = createTestSleepState();

      const actions = engine.generateCommittedActions(valuesAssessment, state);

      const sleepAction = actions.find(a => a.action.includes('готовность'));
      expect(sleepAction).toBeDefined();
    });

    it('should set frequency for each action', () => {
      const state = createTestSleepState();

      const actions = engine.generateCommittedActions(valuesAssessment, state);

      actions.forEach(action => {
        expect(['daily', 'weekly', 'as_needed']).toContain(action.frequency);
      });
    });

    it('should link actions to values', () => {
      const state = createTestSleepState();

      const actions = engine.generateCommittedActions(valuesAssessment, state);

      actions.forEach(action => {
        expect(action.linkedValue).toBeDefined();
        expect(action.linkedValue.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAcceptanceExercise()', () => {
    const struggles = ['cant_sleep', 'anxious', 'frustrated', 'exhausted'] as const;

    it.each(struggles)('should return exercise for %s struggle', (struggle) => {
      const exercise = engine.getAcceptanceExercise(struggle);

      expect(exercise).toBeDefined();
      expect(exercise.exercise).toBeDefined();
      expect(exercise.instructions.length).toBeGreaterThan(0);
      expect(exercise.metaphor).toBeDefined();
    });
  });

  describe('updatePlan()', () => {
    let basePlan: IACTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return unchanged plan for empty states', () => {
      const updated = engine.updatePlan(basePlan, []);

      expect(updated).toEqual(basePlan);
    });

    it('should update flexibility scores', () => {
      const recentStates = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          sleepAnxiety: i === 6 ? 0.3 : 0.7, // Last one has low anxiety
          dayOffset: 6 - i,
        })
      );

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.flexibility.acceptanceCurrent).not.toBe(basePlan.flexibility.acceptanceCurrent);
    });

    it('should update sleep willingness', () => {
      const recentStates = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          effortfulSleep: false,
          dayOffset: 6 - i,
        })
      );

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.sleepWillingness.current).toBe(0.7);
    });

    it('should calculate ISI change', () => {
      const recentStates = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          isiScore: i === 0 ? 18 : (i === 6 ? 12 : 15),
          dayOffset: 6 - i,
        })
      );

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.progress.isiChange).toBe(6);
    });

    it('should calculate flexibility change', () => {
      const recentStates = createBaselineData(7);

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.progress.flexibilityChange).toBeDefined();
    });
  });

  describe('assessFlexibility()', () => {
    it('should return all six ACT processes', () => {
      const state = createTestSleepState();

      const flexibility = engine.assessFlexibility(state);

      expect(flexibility.acceptance).toBeDefined();
      expect(flexibility.defusion).toBeDefined();
      expect(flexibility.presentMoment).toBeDefined();
      expect(flexibility.selfAsContext).toBeDefined();
      expect(flexibility.valuesClarity).toBeDefined();
      expect(flexibility.committedAction).toBeDefined();
      expect(flexibility.overall).toBeDefined();
    });

    it('should return higher acceptance for lower sleep anxiety', () => {
      const lowAnxiety = createTestSleepState({ sleepAnxiety: 0.2 });
      const highAnxiety = createTestSleepState({ sleepAnxiety: 0.8 });

      const lowFlex = engine.assessFlexibility(lowAnxiety);
      const highFlex = engine.assessFlexibility(highAnxiety);

      expect(lowFlex.acceptance).toBeGreaterThan(highFlex.acceptance);
    });

    it('should return higher defusion for fewer dysfunctional beliefs', () => {
      const fewBeliefs = createTestSleepState({
        unrealisticExpectations: false,
        catastrophizing: false,
      });
      const manyBeliefs = createTestSleepState({
        unrealisticExpectations: true,
        catastrophizing: true,
      });

      const fewFlex = engine.assessFlexibility(fewBeliefs);
      const manyFlex = engine.assessFlexibility(manyBeliefs);

      expect(fewFlex.defusion).toBeGreaterThan(manyFlex.defusion);
    });

    it('should return higher present moment for lower arousal', () => {
      const lowArousal = createTestSleepState({ preSleepArousal: 0.2 });
      const highArousal = createTestSleepState({ preSleepArousal: 0.8 });

      const lowFlex = engine.assessFlexibility(lowArousal);
      const highFlex = engine.assessFlexibility(highArousal);

      expect(lowFlex.presentMoment).toBeGreaterThan(highFlex.presentMoment);
    });

    it('should return higher self-as-context for higher self-efficacy', () => {
      const highEfficacy = createTestSleepState({ sleepSelfEfficacy: 0.9 });
      const lowEfficacy = createTestSleepState({ sleepSelfEfficacy: 0.3 });

      const highFlex = engine.assessFlexibility(highEfficacy);
      const lowFlex = engine.assessFlexibility(lowEfficacy);

      expect(highFlex.selfAsContext).toBeGreaterThan(lowFlex.selfAsContext);
    });

    it('should return overall as average of six processes', () => {
      const state = createTestSleepState();

      const flexibility = engine.assessFlexibility(state);

      const expectedOverall = (
        flexibility.acceptance +
        flexibility.defusion +
        flexibility.presentMoment +
        flexibility.selfAsContext +
        flexibility.valuesClarity +
        flexibility.committedAction
      ) / 6;

      expect(flexibility.overall).toBeCloseTo(expectedOverall, 5);
    });
  });

  describe('generateSessionSummary()', () => {
    it('should return key takeaways', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.keyTakeaways.length).toBeGreaterThan(0);
    });

    it('should return practice exercises', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.practiceExercises.length).toBeGreaterThan(0);
    });

    it('should return next session preview', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.nextSessionPreview).toContain('Следующая сессия');
    });

    it('should include acceptance takeaways for acceptance session', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);
      // Session 1 is acceptance-focused

      const summary = engine.generateSessionSummary(plan);

      const hasAcceptanceTakeaway = summary.keyTakeaways.some(t =>
        t.includes('Борьба') || t.includes('Готовность')
      );
      expect(hasAcceptanceTakeaway).toBe(true);
    });

    it('should include defusion takeaways for defusion session', () => {
      const baseline = createBaselineData(7);
      const plan: IACTIPlan = {
        ...engine.initializePlan('user1', baseline),
        currentSession: 2,
      };

      const summary = engine.generateSessionSummary(plan);

      const hasDefusionTakeaway = summary.keyTakeaways.some(t =>
        t.includes('Мысл') || t.includes('наблюдать')
      );
      expect(hasDefusionTakeaway).toBe(true);
    });
  });
});
