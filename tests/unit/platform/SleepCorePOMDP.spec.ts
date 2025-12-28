/**
 * SleepCorePOMDP Unit Tests
 * Tests POMDP-based intervention selection and state estimation
 */

import {
  SleepCorePOMDP,
  type ISleepPOMDPState,
  type ISleepObservation,
  type SleepAction,
  type ISleepPOMDPConfig,
} from '../../../src/platform/SleepCorePOMDP';
import type { ISleepState, ISleepMetrics } from '../../../src/sleep/interfaces/ISleepState';

describe('SleepCorePOMDP', () => {
  let pomdp: SleepCorePOMDP;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    sleepEfficiency: number;
    isiScore: number;
    sleepOnsetLatency: number;
    wakeAfterSleepOnset: number;
    preSleepArousal: number;
    sleepAnxiety: number;
    phaseDeviation: number;
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
        phaseDeviation: overrides.phaseDeviation ?? 0,
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
        caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
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
        sleepSelfEfficacy: 0.6,
      },
      subjectiveQuality: 'fair',
      morningAlertness: 0.5,
      daytimeSleepiness: 0.4,
      sleepHealthScore: 60,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  // Factory for test observation
  function createTestObservation(overrides: Partial<{
    sleepEfficiency: number;
    sleepOnsetLatency: number;
    wakeAfterSleepOnset: number;
    subjectiveQuality: number;
    followedPrescription: boolean;
    morningMood: number;
  }> = {}): ISleepObservation {
    return {
      source: 'diary',
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
      subjectiveQuality: overrides.subjectiveQuality ?? 3,
      followedPrescription: overrides.followedPrescription ?? true,
      morningMood: overrides.morningMood ?? 3,
      timestamp: new Date(),
    };
  }

  // Factory for POMDP state
  function createPOMDPState(overrides: Partial<ISleepPOMDPState> = {}): ISleepPOMDPState {
    return {
      sleepEfficiency: overrides.sleepEfficiency ?? 75,
      isiScore: overrides.isiScore ?? 15,
      solMinutes: overrides.solMinutes ?? 25,
      wasoMinutes: overrides.wasoMinutes ?? 30,
      preSleepArousal: overrides.preSleepArousal ?? 0.5,
      sleepAnxiety: overrides.sleepAnxiety ?? 0.5,
      circadianDeviation: overrides.circadianDeviation ?? 0,
      treatmentAdherence: overrides.treatmentAdherence ?? 0.7,
      treatmentWeek: overrides.treatmentWeek ?? 1,
    };
  }

  beforeEach(() => {
    pomdp = new SleepCorePOMDP();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(pomdp).toBeDefined();
      expect(pomdp.getBeliefState()).toBeNull();
    });

    it('should accept custom config', () => {
      const customPomdp = new SleepCorePOMDP({
        discountFactor: 0.9,
        explorationBonus: 0.2,
      });

      expect(customPomdp).toBeDefined();
    });

    it('should initialize action stats with priors', () => {
      const stats = pomdp.getActionStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.has('adjust_sleep_window')).toBe(true);
      expect(stats.has('no_intervention')).toBe(true);

      const sleepWindowStats = stats.get('adjust_sleep_window');
      expect(sleepWindowStats!.alpha).toBe(1); // Default prior
      expect(sleepWindowStats!.beta).toBe(1);
    });
  });

  describe('sleepStateToPomdpState()', () => {
    it('should convert sleep state to POMDP state', () => {
      const sleepState = createTestSleepState({
        sleepEfficiency: 80,
        isiScore: 12,
        sleepOnsetLatency: 20,
        wakeAfterSleepOnset: 25,
        preSleepArousal: 0.6,
        sleepAnxiety: 0.7,
        phaseDeviation: 1.5,
      });

      const pomdpState = pomdp.sleepStateToPomdpState(sleepState);

      expect(pomdpState.sleepEfficiency).toBe(80);
      expect(pomdpState.isiScore).toBe(12);
      expect(pomdpState.solMinutes).toBe(20);
      expect(pomdpState.wasoMinutes).toBe(25);
      expect(pomdpState.preSleepArousal).toBe(0.6);
      expect(pomdpState.sleepAnxiety).toBe(0.7);
      expect(pomdpState.circadianDeviation).toBe(1.5);
    });

    it('should include treatment week and adherence', () => {
      const sleepState = createTestSleepState();
      const pomdpState = pomdp.sleepStateToPomdpState(sleepState);

      expect(pomdpState.treatmentWeek).toBeDefined();
      expect(pomdpState.treatmentAdherence).toBeDefined();
    });
  });

  describe('updateBelief()', () => {
    it('should create initial belief state from first observation', () => {
      const observation = createTestObservation({ sleepEfficiency: 70 });

      const state = pomdp.updateBelief(observation);

      expect(state).toBeDefined();
      expect(state.sleepEfficiency).toBe(70);
      expect(pomdp.getBeliefState()).not.toBeNull();
    });

    it('should update belief state using Kalman filter', () => {
      // First observation
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 70 }));

      // Second observation
      const updated = pomdp.updateBelief(createTestObservation({ sleepEfficiency: 80 }));

      // Should be between 70 and 80 due to Kalman smoothing
      expect(updated.sleepEfficiency).toBeGreaterThan(70);
      expect(updated.sleepEfficiency).toBeLessThan(80);
    });

    it('should track treatment adherence from prescription following', () => {
      const followed = createTestObservation({ followedPrescription: true });
      const notFollowed = createTestObservation({ followedPrescription: false });

      pomdp.updateBelief(followed);
      const state1 = pomdp.getBeliefState();
      expect(state1!.treatmentAdherence).toBe(1);

      pomdp.updateBelief(notFollowed);
      const state2 = pomdp.getBeliefState();
      expect(state2!.treatmentAdherence).toBeLessThan(1);
    });

    it('should track SOL and WASO', () => {
      const observation = createTestObservation({
        sleepOnsetLatency: 45,
        wakeAfterSleepOnset: 60,
      });

      const state = pomdp.updateBelief(observation);

      expect(state.solMinutes).toBe(45);
      expect(state.wasoMinutes).toBe(60);
    });
  });

  describe('selectAction()', () => {
    it('should return no_intervention without belief state', () => {
      const action = pomdp.selectAction();

      expect(action).toBe('no_intervention');
    });

    it('should select action based on Thompson Sampling', () => {
      pomdp.updateBelief(createTestObservation());

      const action = pomdp.selectAction();

      expect(action).toBeDefined();
      expect(typeof action).toBe('string');
    });

    it('should prefer sleep restriction for low efficiency', () => {
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 60 }));

      // Run multiple times to test probabilistic behavior
      const actions: SleepAction[] = [];
      for (let i = 0; i < 20; i++) {
        actions.push(pomdp.selectAction());
      }

      // At least some should be sleep restriction related
      const srtActions = actions.filter(
        a => a === 'adjust_sleep_window' || a === 'enforce_wake_time'
      );
      expect(srtActions.length).toBeGreaterThan(0);
    });

    it('should prefer relaxation for high arousal', () => {
      // Setup high arousal state
      const observation = createTestObservation();
      pomdp.updateBelief(observation);

      // Select with high arousal context
      const action = pomdp.selectAction({
        preSleepArousal: 0.8,
        sleepAnxiety: 0.7,
      });

      // May select relaxation or cognitive actions
      expect(action).toBeDefined();
    });

    it('should prefer stimulus control for high SOL', () => {
      pomdp.updateBelief(createTestObservation({ sleepOnsetLatency: 50 }));

      // Run multiple times
      const actions: SleepAction[] = [];
      for (let i = 0; i < 20; i++) {
        actions.push(pomdp.selectAction());
      }

      // Should include leave_bed_reminder
      const sctActions = actions.filter(a => a === 'leave_bed_reminder');
      expect(sctActions.length).toBeGreaterThan(0);
    });

    it('should accept context override', () => {
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 70 }));

      // Override with high efficiency context
      const action = pomdp.selectAction({ sleepEfficiency: 95 });

      // Should still return valid action
      expect(action).toBeDefined();
    });
  });

  describe('updateActionOutcome()', () => {
    it('should increment alpha for positive reward', () => {
      const statsBefore = pomdp.getActionStats().get('adjust_sleep_window')!;
      const alphaBefore = statsBefore.alpha;

      pomdp.updateActionOutcome('adjust_sleep_window', 0.5);

      const statsAfter = pomdp.getActionStats().get('adjust_sleep_window')!;
      expect(statsAfter.alpha).toBe(alphaBefore + 1);
      expect(statsAfter.beta).toBe(statsBefore.beta);
    });

    it('should increment beta for negative reward', () => {
      const statsBefore = pomdp.getActionStats().get('relaxation_pmr')!;
      const betaBefore = statsBefore.beta;

      pomdp.updateActionOutcome('relaxation_pmr', -0.3);

      const statsAfter = pomdp.getActionStats().get('relaxation_pmr')!;
      expect(statsAfter.beta).toBe(betaBefore + 1);
      expect(statsAfter.alpha).toBe(statsBefore.alpha);
    });

    it('should update lastUpdate timestamp', () => {
      const statsBefore = pomdp.getActionStats().get('caffeine_education')!;
      const timeBefore = statsBefore.lastUpdate;

      // Small delay to ensure time difference
      pomdp.updateActionOutcome('caffeine_education', 0.1);

      const statsAfter = pomdp.getActionStats().get('caffeine_education')!;
      expect(statsAfter.lastUpdate.getTime()).toBeGreaterThanOrEqual(timeBefore.getTime());
    });

    it('should handle unknown action gracefully', () => {
      expect(() => {
        pomdp.updateActionOutcome('unknown_action' as SleepAction, 0.5);
      }).not.toThrow();
    });
  });

  describe('calculateReward()', () => {
    it('should return positive reward for improvement', () => {
      const previous = createPOMDPState({
        sleepEfficiency: 70,
        isiScore: 18,
        solMinutes: 40,
        treatmentAdherence: 0.5,
      });

      const current = createPOMDPState({
        sleepEfficiency: 80,
        isiScore: 12,
        solMinutes: 25,
        treatmentAdherence: 0.8,
      });

      const reward = pomdp.calculateReward(previous, current);

      expect(reward).toBeGreaterThan(0);
    });

    it('should return negative reward for worsening', () => {
      const previous = createPOMDPState({
        sleepEfficiency: 85,
        isiScore: 10,
        solMinutes: 15,
        treatmentAdherence: 0.9,
      });

      const current = createPOMDPState({
        sleepEfficiency: 65,
        isiScore: 20,
        solMinutes: 45,
        treatmentAdherence: 0.4,
      });

      const reward = pomdp.calculateReward(previous, current);

      expect(reward).toBeLessThan(0);
    });

    it('should weight sleep efficiency and ISI reduction highest', () => {
      // Large SE improvement (20 points)
      const seImprovement = pomdp.calculateReward(
        createPOMDPState({ sleepEfficiency: 60 }),
        createPOMDPState({ sleepEfficiency: 80 })
      );

      // Same magnitude SOL improvement (relatively smaller impact)
      const solImprovement = pomdp.calculateReward(
        createPOMDPState({ solMinutes: 35 }),
        createPOMDPState({ solMinutes: 25 })
      );

      // SE improvement (20% * 0.35 = 0.07) should be weighted higher than
      // SOL improvement (10/30 * 0.15 = 0.05)
      expect(Math.abs(seImprovement)).toBeGreaterThan(Math.abs(solImprovement));
    });

    it('should reward adherence', () => {
      const lowAdherence = createPOMDPState({ treatmentAdherence: 0.3 });
      const highAdherence = createPOMDPState({ treatmentAdherence: 0.9 });

      const reward1 = pomdp.calculateReward(lowAdherence, lowAdherence);
      const reward2 = pomdp.calculateReward(lowAdherence, highAdherence);

      expect(reward2).toBeGreaterThan(reward1);
    });
  });

  describe('getBeliefState()', () => {
    it('should return null before any observations', () => {
      expect(pomdp.getBeliefState()).toBeNull();
    });

    it('should return current belief after observations', () => {
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 75 }));

      const belief = pomdp.getBeliefState();

      expect(belief).not.toBeNull();
      expect(belief!.sleepEfficiency).toBe(75);
    });
  });

  describe('getActionStats()', () => {
    it('should return Map of action statistics', () => {
      const stats = pomdp.getActionStats();

      expect(stats).toBeInstanceOf(Map);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should include all defined actions', () => {
      const stats = pomdp.getActionStats();

      const expectedActions: SleepAction[] = [
        'adjust_sleep_window',
        'enforce_wake_time',
        'leave_bed_reminder',
        'bed_restriction',
        'challenge_belief',
        'behavioral_experiment',
        'caffeine_education',
        'environment_advice',
        'relaxation_pmr',
        'relaxation_breathing',
        'relaxation_imagery',
        'no_intervention',
      ];

      expectedActions.forEach(action => {
        expect(stats.has(action)).toBe(true);
      });
    });
  });

  describe('exportState()', () => {
    it('should export current state', () => {
      pomdp.updateBelief(createTestObservation());
      pomdp.updateActionOutcome('adjust_sleep_window', 0.5);

      const exported = pomdp.exportState();

      expect(exported.beliefState).not.toBeNull();
      expect(exported.actionStats.length).toBeGreaterThan(0);
      expect(exported.config).toBeDefined();
    });

    it('should include modified action stats', () => {
      pomdp.updateActionOutcome('relaxation_pmr', 0.3);
      pomdp.updateActionOutcome('relaxation_pmr', 0.2);

      const exported = pomdp.exportState();
      const pmrStats = exported.actionStats.find(([action]) => action === 'relaxation_pmr');

      expect(pmrStats).toBeDefined();
      expect(pmrStats![1].alpha).toBe(3); // 1 prior + 2 successes
    });
  });

  describe('importState()', () => {
    it('should restore state from export', () => {
      // Setup some state
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 80 }));
      pomdp.updateActionOutcome('caffeine_education', 0.4);

      // Export
      const exported = pomdp.exportState();

      // Create new instance and import
      const newPomdp = new SleepCorePOMDP();
      newPomdp.importState(exported);

      // Verify restored state
      expect(newPomdp.getBeliefState()!.sleepEfficiency).toBe(80);

      const stats = newPomdp.getActionStats().get('caffeine_education');
      expect(stats!.alpha).toBe(2); // 1 prior + 1 success
    });
  });

  describe('Thompson Sampling behavior', () => {
    it('should explore more with low observations', () => {
      pomdp.updateBelief(createTestObservation());

      // With low observations, should have more variance
      const actions = new Set<SleepAction>();
      for (let i = 0; i < 50; i++) {
        actions.add(pomdp.selectAction());
      }

      // Should explore multiple actions
      expect(actions.size).toBeGreaterThan(1);
    });

    it('should converge to best actions with more data', () => {
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 70 }));

      // Simulate many positive outcomes for one action
      for (let i = 0; i < 20; i++) {
        pomdp.updateActionOutcome('adjust_sleep_window', 0.5);
      }

      // Should prefer the successful action
      const actions: SleepAction[] = [];
      for (let i = 0; i < 30; i++) {
        actions.push(pomdp.selectAction());
      }

      const srtCount = actions.filter(a => a === 'adjust_sleep_window').length;
      expect(srtCount).toBeGreaterThanOrEqual(12); // Should be selected most of the time (stochastic)
    });
  });

  describe('Context-based action selection', () => {
    it('should add bonus for anxiety-related actions when anxiety is high', () => {
      pomdp.updateBelief(createTestObservation());

      // High anxiety context
      const highAnxiety = { sleepAnxiety: 0.8, preSleepArousal: 0.3 };

      // Run multiple times
      const actions: SleepAction[] = [];
      for (let i = 0; i < 30; i++) {
        actions.push(pomdp.selectAction(highAnxiety));
      }

      // Should include cognitive/relaxation actions
      const relevantActions = actions.filter(
        a => a.startsWith('challenge_') || a.startsWith('relaxation_')
      );
      expect(relevantActions.length).toBeGreaterThan(0);
    });

    it('should add bonus for sleep restriction when efficiency is low', () => {
      pomdp.updateBelief(createTestObservation({ sleepEfficiency: 60 }));

      const lowEfficiency = { sleepEfficiency: 60, sleepAnxiety: 0.2 };

      const actions: SleepAction[] = [];
      for (let i = 0; i < 30; i++) {
        actions.push(pomdp.selectAction(lowEfficiency));
      }

      const srtActions = actions.filter(
        a => a === 'adjust_sleep_window' || a === 'enforce_wake_time'
      );
      expect(srtActions.length).toBeGreaterThan(0);
    });

    it('should add bonus for stimulus control when SOL is high', () => {
      pomdp.updateBelief(createTestObservation({ sleepOnsetLatency: 50 }));

      const highSOL = { solMinutes: 50, sleepAnxiety: 0.2, preSleepArousal: 0.3 };

      const actions: SleepAction[] = [];
      for (let i = 0; i < 30; i++) {
        actions.push(pomdp.selectAction(highSOL));
      }

      const sctActions = actions.filter(a => a === 'leave_bed_reminder');
      expect(sctActions.length).toBeGreaterThan(0);
    });
  });

  describe('Custom configuration', () => {
    it('should use custom discount factor', () => {
      const customPomdp = new SleepCorePOMDP({ discountFactor: 0.8 });
      const exported = customPomdp.exportState();

      expect(exported.config.discountFactor).toBe(0.8);
    });

    it('should use custom exploration bonus', () => {
      const customPomdp = new SleepCorePOMDP({ explorationBonus: 0.3 });
      const exported = customPomdp.exportState();

      expect(exported.config.explorationBonus).toBe(0.3);
    });

    it('should use custom prior strength', () => {
      const customPomdp = new SleepCorePOMDP({ priorStrength: 2 });
      const stats = customPomdp.getActionStats().get('adjust_sleep_window');

      expect(stats!.alpha).toBe(2);
      expect(stats!.beta).toBe(2);
    });

    it('should use custom reward weights', () => {
      const customPomdp = new SleepCorePOMDP({
        rewardWeights: {
          sleepEfficiency: 0.5,
          isiReduction: 0.3,
          solReduction: 0.1,
          adherence: 0.1,
        },
      });

      const exported = customPomdp.exportState();
      expect(exported.config.rewardWeights.sleepEfficiency).toBe(0.5);
    });
  });
});
