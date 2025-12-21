/**
 * MBTIEngine Unit Tests
 * Tests Mindfulness-Based Therapy for Insomnia implementation
 */

import { MBTIEngine } from '../../../src/third-wave/engines/MBTIEngine';
import type { IMBTIPlan, IMindfulnessSession } from '../../../src/third-wave/interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('MBTIEngine', () => {
  let engine: MBTIEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    preSleepArousal: number;
    sleepAnxiety: number;
    sleepSelfEfficacy: number;
    effortfulSleep: boolean;
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
        sleepOnsetLatency: 40,
        wakeAfterSleepOnset: 35,
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
        isiScore: overrides.isiScore ?? 15,
        severity: 'moderate',
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
        dbasScore: 6,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: overrides.effortfulSleep ?? true,
          healthWorries: true,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.6,
        preSleepArousal: overrides.preSleepArousal ?? 0.7,
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

  function createBaselineData(days: number = 7): ISleepState[] {
    return Array.from({ length: days }, (_, i) =>
      createTestSleepState({ dayOffset: days - 1 - i })
    );
  }

  function createMindfulnessSession(overrides: Partial<{
    practice: string;
    duration: number;
    preArousalLevel: number;
    postArousalLevel: number;
    preMindfulness: number;
    postMindfulness: number;
    daysAgo: number;
  }> = {}): IMindfulnessSession {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - (overrides.daysAgo ?? 0));

    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      practice: (overrides.practice ?? 'breath_awareness') as IMindfulnessSession['practice'],
      duration: overrides.duration ?? 20,
      completed: true,
      preArousalLevel: overrides.preArousalLevel ?? 0.7,
      postArousalLevel: overrides.postArousalLevel ?? 0.4,
      preMindfulness: overrides.preMindfulness ?? 0.4,
      postMindfulness: overrides.postMindfulness ?? 0.6,
      instructions: ['Найдите удобное положение', 'Сосредоточьтесь на дыхании'],
      userRating: 4,
    };
  }

  beforeEach(() => {
    engine = new MBTIEngine();
  });

  describe('initializePlan()', () => {
    it('should create valid MBT-I plan', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.userId).toBe('user1');
      expect(plan.currentWeek).toBe(1);
      expect(plan.totalWeeks).toBe(8);
    });

    it('should set daily practice target', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.dailyPracticeTarget).toBe(20);
    });

    it('should assess baseline arousal', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.arousalBaseline).toBeDefined();
      expect(plan.arousalBaseline.cognitive).toBeGreaterThanOrEqual(0);
      expect(plan.arousalBaseline.sleepWorry).toBeGreaterThanOrEqual(0);
    });

    it('should enable behavioral components by default', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.useSleepRestriction).toBe(true);
      expect(plan.useStimulusControl).toBe(true);
    });

    it('should allow disabling behavioral components', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline, { useBehavioralComponents: false });

      expect(plan.useSleepRestriction).toBe(false);
      expect(plan.useStimulusControl).toBe(false);
    });

    it('should initialize first session', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.currentSession).toBeDefined();
      expect(plan.currentSession.weekNumber).toBe(1);
      expect(plan.currentSession.mindfulnessPractice).toBe('breath_awareness');
    });

    it('should initialize progress to zero', () => {
      const baseline = createBaselineData(7);

      const plan = engine.initializePlan('user1', baseline);

      expect(plan.progress.practiceAdherence).toBe(0);
      expect(plan.progress.arousalReduction).toBe(0);
      expect(plan.progress.mindfulnessIncrease).toBe(0);
      expect(plan.progress.isiChange).toBe(0);
    });
  });

  describe('getCurrentSession()', () => {
    it('should return first session for week 1', () => {
      const baseline = createBaselineData(7);
      const plan = engine.initializePlan('user1', baseline);

      const session = engine.getCurrentSession(plan);

      expect(session.weekNumber).toBe(1);
      expect(session.theme).toContain('осознанност');
    });

    it('should return correct session for each week', () => {
      const baseline = createBaselineData(7);
      const basePlan = engine.initializePlan('user1', baseline);

      for (let week = 1; week <= 8; week++) {
        const plan: IMBTIPlan = { ...basePlan, currentWeek: week };
        const session = engine.getCurrentSession(plan);

        expect(session.weekNumber).toBeLessThanOrEqual(8);
      }
    });

    it('should not exceed last session for high week numbers', () => {
      const baseline = createBaselineData(7);
      const plan: IMBTIPlan = {
        ...engine.initializePlan('user1', baseline),
        currentWeek: 12,
      };

      const session = engine.getCurrentSession(plan);

      expect(session).toBeDefined();
      expect(session.weekNumber).toBeLessThanOrEqual(8);
    });
  });

  describe('getPractice()', () => {
    let basePlan: IMBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return breath awareness for bedtime in week 1', () => {
      const practice = engine.getPractice(basePlan, 'bedtime', 10);

      expect(practice.practice).toBe('breath_awareness');
      expect(practice.instructions.length).toBeGreaterThan(0);
    });

    it('should return body scan for bedtime in week 2+', () => {
      const plan: IMBTIPlan = { ...basePlan, currentWeek: 2 };

      const practice = engine.getPractice(plan, 'bedtime', 15);

      expect(practice.practice).toBe('body_scan');
    });

    it('should return 3-minute breathing space for night awakening', () => {
      const practice = engine.getPractice(basePlan, 'night_awakening', 5);

      expect(practice.practice).toBe('3_minute_breathing_space');
    });

    it('should return current week practice for daytime', () => {
      const practice = engine.getPractice(basePlan, 'daytime', 20);

      expect(practice.practice).toBe(basePlan.currentSession.mindfulnessPractice);
    });

    it('should scale instructions based on duration', () => {
      const shortPractice = engine.getPractice(basePlan, 'daytime', 3);
      const longPractice = engine.getPractice(basePlan, 'daytime', 20);

      expect(shortPractice.instructions.length).toBeLessThanOrEqual(4);
      expect(longPractice.instructions.length).toBeGreaterThan(shortPractice.instructions.length);
    });
  });

  describe('recordPractice()', () => {
    let basePlan: IMBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should add practice to log', () => {
      const session = createMindfulnessSession();

      const updated = engine.recordPractice(basePlan, session);

      expect(updated.practiceLog.length).toBe(1);
    });

    it('should calculate practice adherence', () => {
      // Add several practice sessions
      let plan = basePlan;
      for (let i = 0; i < 5; i++) {
        plan = engine.recordPractice(plan, createMindfulnessSession({ daysAgo: i }));
      }

      expect(plan.progress.practiceAdherence).toBeGreaterThan(0);
    });

    it('should calculate arousal reduction from recent practices', () => {
      const session = createMindfulnessSession({
        preArousalLevel: 0.8,
        postArousalLevel: 0.3,
      });

      const updated = engine.recordPractice(basePlan, session);

      expect(updated.progress.arousalReduction).toBeGreaterThan(0);
    });

    it('should calculate mindfulness increase', () => {
      const session = createMindfulnessSession({
        preMindfulness: 0.3,
        postMindfulness: 0.7,
      });

      const updated = engine.recordPractice(basePlan, session);

      expect(updated.progress.mindfulnessIncrease).toBeGreaterThan(0);
    });

    it('should maintain previous sessions in log', () => {
      const session1 = createMindfulnessSession({ daysAgo: 2 });
      const session2 = createMindfulnessSession({ daysAgo: 1 });

      let plan = engine.recordPractice(basePlan, session1);
      plan = engine.recordPractice(plan, session2);

      expect(plan.practiceLog.length).toBe(2);
    });
  });

  describe('assessArousal()', () => {
    it('should return all arousal components', () => {
      const state = createTestSleepState();

      const arousal = engine.assessArousal(state);

      expect(arousal.cognitive).toBeDefined();
      expect(arousal.somatic).toBeDefined();
      expect(arousal.sleepEffort).toBeDefined();
      expect(arousal.sleepWorry).toBeDefined();
      expect(arousal.rumination).toBeDefined();
    });

    it('should map pre-sleep arousal to cognitive arousal', () => {
      const highArousal = createTestSleepState({ preSleepArousal: 0.9 });
      const lowArousal = createTestSleepState({ preSleepArousal: 0.2 });

      const highResult = engine.assessArousal(highArousal);
      const lowResult = engine.assessArousal(lowArousal);

      expect(highResult.cognitive).toBeGreaterThan(lowResult.cognitive);
    });

    it('should map sleep anxiety to sleep worry', () => {
      const highAnxiety = createTestSleepState({ sleepAnxiety: 0.9 });
      const lowAnxiety = createTestSleepState({ sleepAnxiety: 0.2 });

      const highResult = engine.assessArousal(highAnxiety);
      const lowResult = engine.assessArousal(lowAnxiety);

      expect(highResult.sleepWorry).toBeGreaterThan(lowResult.sleepWorry);
    });

    it('should set high sleep effort for effortful sleep belief', () => {
      const effortful = createTestSleepState({ effortfulSleep: true });
      const notEffortful = createTestSleepState({ effortfulSleep: false });

      const effortfulResult = engine.assessArousal(effortful);
      const notEffortfulResult = engine.assessArousal(notEffortful);

      expect(effortfulResult.sleepEffort).toBeGreaterThan(notEffortfulResult.sleepEffort);
    });
  });

  describe('updatePlan()', () => {
    let basePlan: IMBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return unchanged plan for empty states', () => {
      const updated = engine.updatePlan(basePlan, []);

      expect(updated).toEqual(basePlan);
    });

    it('should update arousal current', () => {
      const recentStates = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          preSleepArousal: i === 6 ? 0.3 : 0.7, // Last one has low arousal
          dayOffset: 6 - i,
        })
      );

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.arousalCurrent.cognitive).not.toBe(basePlan.arousalCurrent.cognitive);
    });

    it('should calculate ISI change', () => {
      const recentStates = Array.from({ length: 7 }, (_, i) =>
        createTestSleepState({
          isiScore: i === 0 ? 18 : (i === 6 ? 10 : 14),
          dayOffset: 6 - i,
        })
      );

      const updated = engine.updatePlan(basePlan, recentStates);

      expect(updated.progress.isiChange).toBe(8);
    });
  });

  describe('generateWeeklySummary()', () => {
    let basePlan: IMBTIPlan;

    beforeEach(() => {
      const baseline = createBaselineData(7);
      basePlan = engine.initializePlan('user1', baseline);
    });

    it('should return practice minutes', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      expect(summary.practiceMinutes).toBeDefined();
      expect(summary.practiceMinutes).toBe(0); // No practices yet
    });

    it('should count recent practice minutes', () => {
      let plan = basePlan;
      plan = engine.recordPractice(plan, createMindfulnessSession({ duration: 20, daysAgo: 1 }));
      plan = engine.recordPractice(plan, createMindfulnessSession({ duration: 15, daysAgo: 2 }));

      const summary = engine.generateWeeklySummary(plan);

      expect(summary.practiceMinutes).toBe(35);
    });

    it('should return practice adherence', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      expect(summary.practiceAdherence).toBeDefined();
    });

    it('should return arousal change', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      expect(summary.arousalChange).toBeDefined();
      expect(summary.arousalChange.cognitive).toBeDefined();
      expect(summary.arousalChange.sleepWorry).toBeDefined();
    });

    it('should return key insights', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      expect(summary.keyInsights).toBeDefined();
      expect(Array.isArray(summary.keyInsights)).toBe(true);
    });

    it('should include insight for low practice adherence', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      const hasAdherenceInsight = summary.keyInsights.some(i =>
        i.includes('практик') || i.includes('мин')
      );
      expect(hasAdherenceInsight).toBe(true);
    });

    it('should return next week focus', () => {
      const summary = engine.generateWeeklySummary(basePlan);

      expect(summary.nextWeekFocus).toBeDefined();
      expect(summary.nextWeekFocus.length).toBeGreaterThan(0);
      expect(summary.nextWeekFocus[0]).toContain('Тема недели');
    });
  });
});
