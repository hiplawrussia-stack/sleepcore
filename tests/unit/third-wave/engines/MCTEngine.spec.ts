/**
 * MCTEngine Unit Tests
 * ====================
 * Tests for Metacognitive Therapy for Insomnia implementation.
 *
 * @module @sleepcore/third-wave/engines
 */

import { MCTEngine, mctEngine } from '../../../../src/third-wave/engines/MCTEngine';
import type { ISleepState } from '../../../../src/sleep/interfaces/ISleepState';
import type {
  IMCTPlan,
  IWorryPattern,
  IWorryPostponementRecord,
  IATTSession,
} from '../../../../src/third-wave/interfaces/IThirdWaveTherapies';

/**
 * Create a mock sleep state for testing
 */
function createMockSleepState(overrides: Partial<{
  preSleepArousal: number;
  sleepAnxiety: number;
  sleepSelfEfficacy: number;
  catastrophizing: boolean;
  helplessness: boolean;
  effortfulSleep: boolean;
}>): ISleepState {
  return {
    userId: 'test-user',
    timestamp: new Date(),
    date: '2025-01-20',
    metrics: {
      timeInBed: 480,
      totalSleepTime: 360,
      sleepOnsetLatency: 45,
      wakeAfterSleepOnset: 75,
      numberOfAwakenings: 3,
      sleepEfficiency: 75,
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:30',
      outOfBedTime: '07:00',
    },
    circadian: {
      chronotype: 'intermediate',
      circadianPhase: 12,
      phaseDeviation: 0,
      lightExposure: 5000,
      estimatedMelatoninOnset: '21:30',
      socialJetLag: 1,
      isStable: true,
    },
    homeostasis: {
      sleepDebt: -2,
      debtDuration: 3,
      homeostaticPressure: 0.7,
      optimalSleepDuration: 7.5,
      isRecoverable: true,
    },
    insomnia: {
      isiScore: 16,
      severity: 'moderate',
      subtype: 'mixed',
      durationWeeks: 12,
      daytimeImpact: 0.6,
      sleepDistress: 0.7,
    },
    behaviors: {
      caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
      alcohol: { drinksToday: 0, lastDrinkTime: '' },
      screenTimeBeforeBed: 60,
      exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 8 },
      naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
      environment: {
        temperatureCelsius: 19,
        isQuiet: true,
        isDark: true,
        isComfortable: true,
      },
    },
    cognitions: {
      dbasScore: 5.5,
      beliefs: {
        unrealisticExpectations: true,
        catastrophizing: overrides.catastrophizing ?? true,
        helplessness: overrides.helplessness ?? false,
        effortfulSleep: overrides.effortfulSleep ?? true,
        healthWorries: false,
      },
      sleepAnxiety: overrides.sleepAnxiety ?? 0.6,
      preSleepArousal: overrides.preSleepArousal ?? 0.7,
      sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.4,
    },
    subjectiveQuality: 'poor',
    morningAlertness: 0.4,
    daytimeSleepiness: 0.6,
    mood: { score: 0.5, trend: 'stable' },
    energy: { level: 0.4, pattern: 'fluctuating' },
    sleepHealthScore: 55,
    trend: 'stable',
    dataQuality: 0.85,
    source: 'diary',
  } as ISleepState;
}

describe('MCTEngine', () => {
  let engine: MCTEngine;

  beforeEach(() => {
    engine = new MCTEngine();
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(mctEngine).toBeInstanceOf(MCTEngine);
    });
  });

  describe('initializePlan', () => {
    it('should create an MCT plan with baseline assessment', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      expect(plan.userId).toBe('user-123');
      expect(plan.currentSession).toBe(1);
      expect(plan.totalSessions).toBe(8);
      expect(plan.completedSessions).toEqual([]);
      expect(plan.worryPatterns).toEqual([]);
      expect(plan.worryPostponementLog).toEqual([]);
      expect(plan.attLog).toEqual([]);
    });

    it('should set baseline metacognitive beliefs', () => {
      const sleepStates = [createMockSleepState({ preSleepArousal: 0.8 })];
      const plan = engine.initializePlan('user-123', sleepStates);

      expect(plan.beliefsBaseline).toBeDefined();
      expect(plan.beliefsBaseline.positiveWorryBeliefs).toBeGreaterThanOrEqual(0);
      expect(plan.beliefsBaseline.positiveWorryBeliefs).toBeLessThanOrEqual(1);
    });

    it('should initialize session details for session 1', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      expect(plan.sessionDetails).toBeDefined();
      expect(plan.sessionDetails.sessionNumber).toBe(1);
      expect(plan.sessionDetails.theme).toContain('метакогнитивн');
    });

    it('should set initial detached mindfulness level', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      expect(plan.detachedMindfulnessLevel).toBe(0.2);
    });

    it('should initialize progress metrics at zero', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      expect(plan.progress.metacognitiveAwarenessChange).toBe(0);
      expect(plan.progress.worryReduction).toBe(0);
      expect(plan.progress.ruminationReduction).toBe(0);
      expect(plan.progress.isiChange).toBe(0);
      expect(plan.progress.sleepEfficiencyChange).toBe(0);
    });
  });

  describe('getCurrentSession', () => {
    it('should return the current session from plan', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const session = engine.getCurrentSession(plan);

      expect(session).toBe(plan.sessionDetails);
      expect(session.sessionNumber).toBe(1);
    });
  });

  describe('assessMetacognitiveBeliefs', () => {
    it('should assess positive worry beliefs based on pre-sleep arousal', () => {
      const sleepState = createMockSleepState({ preSleepArousal: 0.9 });
      const beliefs = engine.assessMetacognitiveBeliefs(sleepState);

      expect(beliefs.positiveWorryBeliefs).toBeGreaterThan(0.5);
    });

    it('should assess uncontrollability/danger based on catastrophizing and helplessness', () => {
      const sleepState = createMockSleepState({
        catastrophizing: true,
        helplessness: true,
        sleepSelfEfficacy: 0.2,
      });
      const beliefs = engine.assessMetacognitiveBeliefs(sleepState);

      expect(beliefs.uncontrollabilityDanger).toBeGreaterThan(0.6);
    });

    it('should assess cognitive confidence as inverse of self-efficacy', () => {
      const sleepState = createMockSleepState({ sleepSelfEfficacy: 0.3 });
      const beliefs = engine.assessMetacognitiveBeliefs(sleepState);

      expect(beliefs.cognitiveConfidence).toBeCloseTo(0.7, 1);
    });

    it('should assess need to control based on effortful sleep belief', () => {
      const sleepStateWithEffort = createMockSleepState({ effortfulSleep: true });
      const sleepStateWithoutEffort = createMockSleepState({ effortfulSleep: false });

      const beliefsWithEffort = engine.assessMetacognitiveBeliefs(sleepStateWithEffort);
      const beliefsWithoutEffort = engine.assessMetacognitiveBeliefs(sleepStateWithoutEffort);

      expect(beliefsWithEffort.needToControl).toBe(0.8);
      expect(beliefsWithoutEffort.needToControl).toBe(0.3);
    });

    it('should assess cognitive self-consciousness from sleep anxiety', () => {
      const sleepState = createMockSleepState({ sleepAnxiety: 0.75 });
      const beliefs = engine.assessMetacognitiveBeliefs(sleepState);

      expect(beliefs.cognitiveSelfConsciousness).toBe(0.75);
    });

    it('should cap beliefs at 1.0', () => {
      const sleepState = createMockSleepState({
        preSleepArousal: 1.0,
        catastrophizing: true,
        helplessness: true,
        sleepSelfEfficacy: 0.0,
      });
      const beliefs = engine.assessMetacognitiveBeliefs(sleepState);

      expect(beliefs.positiveWorryBeliefs).toBeLessThanOrEqual(1);
      expect(beliefs.uncontrollabilityDanger).toBeLessThanOrEqual(1);
    });
  });

  describe('identifyWorryPatterns', () => {
    it('should identify worry patterns from text with worry keywords', () => {
      const text = 'Что если я завтра не смогу сосредоточиться на работе?';
      const patterns = engine.identifyWorryPatterns(text, 'pre_sleep');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('worry');
      expect(patterns[0].context).toBe('pre_sleep');
    });

    it('should identify rumination patterns from text', () => {
      const text = 'Почему я опять не могу уснуть, как всегда?';
      const patterns = engine.identifyWorryPatterns(text, 'during_night');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'rumination')).toBe(true);
    });

    it('should identify both worry and rumination in mixed text', () => {
      const text = 'А вдруг завтра снова будет так же плохо, как вчера?';
      const patterns = engine.identifyWorryPatterns(text, 'pre_sleep');

      expect(patterns.length).toBe(2);
      expect(patterns.some(p => p.type === 'worry')).toBe(true);
      expect(patterns.some(p => p.type === 'rumination')).toBe(true);
    });

    it('should return default worry pattern for unrecognized text', () => {
      const text = 'Не могу расслабиться сегодня вечером.';
      const patterns = engine.identifyWorryPatterns(text, 'pre_sleep');

      expect(patterns.length).toBe(1);
      expect(patterns[0].type).toBe('worry');
      expect(patterns[0].controllability).toBe(0.5);
    });

    it('should return empty array for very short text', () => {
      const text = 'Ок';
      const patterns = engine.identifyWorryPatterns(text, 'daytime');

      expect(patterns).toEqual([]);
    });

    it('should set correct context for different situations', () => {
      const contexts: Array<'pre_sleep' | 'during_night' | 'morning' | 'daytime'> = [
        'pre_sleep', 'during_night', 'morning', 'daytime',
      ];

      for (const context of contexts) {
        const patterns = engine.identifyWorryPatterns('Что если не высплюсь?', context);
        expect(patterns[0].context).toBe(context);
      }
    });
  });

  describe('getWorryPostponementExercise', () => {
    it('should return instructions for worry postponement', () => {
      const worryPattern: IWorryPattern = {
        content: 'Что если завтра будет плохой день?',
        context: 'pre_sleep',
        frequency: 1,
        duration: 15,
        controllability: 0.3,
        distress: 0.6,
        type: 'worry',
      };

      const exercise = engine.getWorryPostponementExercise(worryPattern);

      expect(exercise.instructions.length).toBeGreaterThan(0);
      expect(exercise.worryPeriodDuration).toBe(15);
      expect(exercise.tips.length).toBeGreaterThan(0);
    });

    it('should schedule postponement to next day for night context', () => {
      const worryPattern: IWorryPattern = {
        content: 'Test worry',
        context: 'during_night',
        frequency: 1,
        duration: 10,
        controllability: 0.5,
        distress: 0.5,
        type: 'worry',
      };

      const exercise = engine.getWorryPostponementExercise(worryPattern);
      const postponeDate = new Date(exercise.postponeToTime);

      expect(postponeDate.getHours()).toBe(18);
      expect(postponeDate.getMinutes()).toBe(0);
    });

    it('should include worry content snippet in instructions', () => {
      const worryPattern: IWorryPattern = {
        content: 'Очень длинное беспокойство о работе и жизни',
        context: 'daytime',
        frequency: 1,
        duration: 10,
        controllability: 0.5,
        distress: 0.5,
        type: 'worry',
      };

      const exercise = engine.getWorryPostponementExercise(worryPattern);

      expect(exercise.instructions[0]).toContain('Очень длинное');
    });
  });

  describe('getDetachedMindfulnessExercise', () => {
    it('should return train metaphor for racing thoughts', () => {
      const exercise = engine.getDetachedMindfulnessExercise('racing_thoughts');

      expect(exercise.metaphor).toBe('Поезд на станции');
      expect(exercise.instructions.length).toBeGreaterThan(0);
    });

    it('should return clouds metaphor for worry', () => {
      const exercise = engine.getDetachedMindfulnessExercise('worry');

      expect(exercise.metaphor).toBe('Облака в небе');
    });

    it('should return river metaphor for rumination', () => {
      const exercise = engine.getDetachedMindfulnessExercise('rumination');

      expect(exercise.metaphor).toBe('Листья на реке');
    });

    it('should return radio metaphor for sleep anxiety', () => {
      const exercise = engine.getDetachedMindfulnessExercise('sleep_anxiety');

      expect(exercise.metaphor).toBe('Радио в соседней комнате');
    });

    it('should set duration to 5 minutes', () => {
      const exercise = engine.getDetachedMindfulnessExercise('worry');

      expect(exercise.duration).toBe(5);
    });

    it('should include instructions about detached mindfulness not being meditation', () => {
      const exercise = engine.getDetachedMindfulnessExercise('worry');

      expect(exercise.instructions.some(i => i.includes('НЕ медитация'))).toBe(true);
    });
  });

  describe('getATTSession', () => {
    it('should return selective attention instructions', () => {
      const session = engine.getATTSession('selective', 12);

      expect(session.instructions.length).toBeGreaterThan(0);
      expect(session.instructions.some(i => i.includes('Селективное'))).toBe(true);
    });

    it('should return switching attention instructions', () => {
      const session = engine.getATTSession('switching', 12);

      expect(session.instructions.some(i => i.includes('Переключение'))).toBe(true);
    });

    it('should return divided attention instructions', () => {
      const session = engine.getATTSession('divided', 12);

      expect(session.instructions.some(i => i.includes('Разделённое'))).toBe(true);
    });

    it('should include tips for ATT practice', () => {
      const session = engine.getATTSession('selective', 12);

      expect(session.tips.length).toBeGreaterThan(0);
      expect(session.tips.some(t => t.includes('12-15'))).toBe(true);
    });
  });

  describe('recordWorryPostponement', () => {
    it('should add record to worry postponement log', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const record: IWorryPostponementRecord = {
        date: new Date(),
        worryContent: 'Test worry',
        triggerTime: new Date(),
        postponedTo: new Date(),
        actualWorryTime: null,
        worryDuration: 10,
        distressBefore: 7,
        distressAfter: 4,
        completed: true,
      };

      const updatedPlan = engine.recordWorryPostponement(plan, record);

      expect(updatedPlan.worryPostponementLog.length).toBe(1);
      expect(updatedPlan.worryPostponementLog[0]).toEqual(record);
    });

    it('should update worry reduction based on successful postponements', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Add multiple successful postponements
      for (let i = 0; i < 5; i++) {
        const record: IWorryPostponementRecord = {
          date: new Date(),
          worryContent: `Worry ${i}`,
          triggerTime: new Date(),
          postponedTo: new Date(),
          actualWorryTime: null,
          worryDuration: 10,
          distressBefore: 7,
          distressAfter: 4,
          completed: true,
        };
        plan = engine.recordWorryPostponement(plan, record);
      }

      expect(plan.progress.worryReduction).toBe(50); // 5 * 10% = 50%
    });

    it('should not count incomplete postponements', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      const incompleteRecord: IWorryPostponementRecord = {
        date: new Date(),
        worryContent: 'Test worry',
        triggerTime: new Date(),
        postponedTo: new Date(),
        actualWorryTime: null,
        worryDuration: 10,
        distressBefore: 7,
        distressAfter: 7,
        completed: false,
      };

      plan = engine.recordWorryPostponement(plan, incompleteRecord);

      expect(plan.progress.worryReduction).toBe(0);
    });

    it('should cap worry reduction at 80%', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Add many successful postponements
      for (let i = 0; i < 10; i++) {
        const record: IWorryPostponementRecord = {
          date: new Date(),
          worryContent: `Worry ${i}`,
          triggerTime: new Date(),
          postponedTo: new Date(),
          actualWorryTime: null,
          worryDuration: 10,
          distressBefore: 7,
          distressAfter: 4,
          completed: true,
        };
        plan = engine.recordWorryPostponement(plan, record);
      }

      expect(plan.progress.worryReduction).toBe(80); // Capped at 80%
    });
  });

  describe('recordATTSession', () => {
    it('should add ATT session to log', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const attSession: IATTSession = {
        date: new Date(),
        duration: 12,
        phase: 'selective',
        completedSuccessfully: true,
        attentionRating: 7,
        difficultyRating: 5,
      };

      const updatedPlan = engine.recordATTSession(plan, attSession);

      expect(updatedPlan.attLog.length).toBe(1);
      expect(updatedPlan.attLog[0]).toEqual(attSession);
    });

    it('should update metacognitive awareness based on completed sessions', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Add multiple successful ATT sessions
      for (let i = 0; i < 5; i++) {
        const attSession: IATTSession = {
          date: new Date(),
          duration: 12,
          phase: 'selective',
          completedSuccessfully: true,
          attentionRating: 7,
          difficultyRating: 5,
        };
        plan = engine.recordATTSession(plan, attSession);
      }

      expect(plan.progress.metacognitiveAwarenessChange).toBe(25); // 5 * 5% = 25%
    });

    it('should not count unsuccessful sessions', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      const unsuccessfulSession: IATTSession = {
        date: new Date(),
        duration: 5,
        phase: 'selective',
        completedSuccessfully: false,
        attentionRating: 3,
        difficultyRating: 8,
      };

      plan = engine.recordATTSession(plan, unsuccessfulSession);

      expect(plan.progress.metacognitiveAwarenessChange).toBe(0);
    });

    it('should cap awareness change at 60%', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Add many successful sessions
      for (let i = 0; i < 15; i++) {
        const attSession: IATTSession = {
          date: new Date(),
          duration: 12,
          phase: 'selective',
          completedSuccessfully: true,
          attentionRating: 8,
          difficultyRating: 4,
        };
        plan = engine.recordATTSession(plan, attSession);
      }

      expect(plan.progress.metacognitiveAwarenessChange).toBe(60); // Capped at 60%
    });
  });

  describe('updatePlan', () => {
    it('should return unchanged plan for empty states array', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const updatedPlan = engine.updatePlan(plan, []);

      expect(updatedPlan).toEqual(plan);
    });

    it('should update current beliefs from recent states', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const newStates = [createMockSleepState({
        preSleepArousal: 0.3,
        sleepSelfEfficacy: 0.8,
      })];

      const updatedPlan = engine.updatePlan(plan, newStates);

      expect(updatedPlan.beliefsCurrent).toBeDefined();
      expect(updatedPlan.beliefsCurrent.positiveWorryBeliefs).toBeLessThan(
        plan.beliefsBaseline.positiveWorryBeliefs
      );
    });

    it('should advance session when current session is completed', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Mark session as completed
      plan = {
        ...plan,
        completedSessions: [plan.sessionDetails],
      };

      const updatedPlan = engine.updatePlan(plan, sleepStates);

      expect(updatedPlan.currentSession).toBe(2);
      expect(updatedPlan.sessionDetails.sessionNumber).toBe(2);
    });

    it('should not advance past total sessions', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Set to last session with all completed
      plan = {
        ...plan,
        currentSession: 8,
        completedSessions: Array(8).fill(plan.sessionDetails),
      };

      const updatedPlan = engine.updatePlan(plan, sleepStates);

      expect(updatedPlan.currentSession).toBe(8);
    });

    it('should increase detached mindfulness level on improvement', () => {
      // Use same sleepSelfEfficacy to avoid cognitiveConfidence inversion issue
      // Focus on preSleepArousal improvement which directly affects positiveWorryBeliefs
      const sleepStates = [createMockSleepState({
        preSleepArousal: 0.9,
        sleepSelfEfficacy: 0.5,
      })];
      const plan = engine.initializePlan('user-123', sleepStates);

      const improvedStates = [createMockSleepState({
        preSleepArousal: 0.2,
        sleepSelfEfficacy: 0.5,
      })];

      const updatedPlan = engine.updatePlan(plan, improvedStates);

      expect(updatedPlan.detachedMindfulnessLevel).toBeGreaterThan(plan.detachedMindfulnessLevel);
    });
  });

  describe('generateSessionSummary', () => {
    it('should include key takeaways with session info', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.keyTakeaways.length).toBeGreaterThan(0);
      expect(summary.keyTakeaways[0]).toContain('Сессия 1');
    });

    it('should include home experiments', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.homeExperiments.length).toBeGreaterThan(0);
    });

    it('should preview next session when not on last session', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.nextSessionPreview).toContain('Следующая сессия');
    });

    it('should indicate last session when on session 8', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      plan = { ...plan, currentSession: 8 };
      plan = engine.updatePlan(plan, sleepStates);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.nextSessionPreview).toContain('последняя');
    });

    it('should include progress highlights when progress exists', () => {
      const sleepStates = [createMockSleepState({})];
      let plan = engine.initializePlan('user-123', sleepStates);

      // Add some progress
      const record: IWorryPostponementRecord = {
        date: new Date(),
        worryContent: 'Test',
        triggerTime: new Date(),
        postponedTo: new Date(),
        actualWorryTime: null,
        worryDuration: 10,
        distressBefore: 7,
        distressAfter: 4,
        completed: true,
      };
      plan = engine.recordWorryPostponement(plan, record);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.progressHighlights.length).toBeGreaterThan(0);
      expect(summary.progressHighlights.some(h => h.includes('откладываний'))).toBe(true);
    });

    it('should show default message when no progress yet', () => {
      const sleepStates = [createMockSleepState({})];
      const plan = engine.initializePlan('user-123', sleepStates);

      const summary = engine.generateSessionSummary(plan);

      expect(summary.progressHighlights.some(h => h.includes('постепенно'))).toBe(true);
    });
  });
});
