/**
 * SleepCoreAdapter Unit Tests
 * ===========================
 * Tests for the bridge between SleepCore and CogniCore Engine
 *
 * @module @sleepcore/platform/__tests__
 */

import {
  SleepCoreAdapter,
  createSleepCoreAdapter,
  SLEEP_ACTION_TO_INTERVENTION_ID,
  INTERVENTION_ID_TO_SLEEP_ACTION,
  SLEEP_ACTION_TO_COMPONENT,
  COMPONENT_TO_CATEGORY,
  type CBTIComponent,
} from '../SleepCoreAdapter';

import type { ISleepState, ISleepMetrics, IInsomniaSeverity } from '../../sleep/interfaces/ISleepState';
import type { SleepAction } from '../SleepCorePOMDP';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock sleep state for testing
 */
function createMockSleepState(overrides: Partial<ISleepState> = {}): ISleepState {
  const baseMetrics: ISleepMetrics = {
    bedtime: '23:00',
    wakeTime: '07:00',
    finalAwakening: '06:45',
    outOfBedTime: '07:15',
    timeInBed: 480, // 8 hours
    totalSleepTime: 360, // 6 hours
    sleepOnsetLatency: 45, // 45 min to fall asleep
    wakeAfterSleepOnset: 60, // 1 hour awake during night
    numberOfAwakenings: 3,
    sleepEfficiency: 75, // 75%
  };

  return {
    userId: 'test-user-123',
    timestamp: new Date(),
    date: '2025-01-15',
    source: 'diary',
    dataQuality: 0.85,
    trend: 'stable',
    daytimeSleepiness: 0.4,
    morningAlertness: 0.5,
    subjectiveQuality: 'fair' as const,
    sleepHealthScore: 65,

    metrics: {
      ...baseMetrics,
      ...(overrides.metrics || {}),
    },

    cognitions: {
      sleepAnxiety: 0.6,
      preSleepArousal: 0.5,
      sleepSelfEfficacy: 0.4,
      dbasScore: 65,
      beliefs: {
        unrealisticExpectations: true,
        catastrophizing: true,
        helplessness: false,
        effortfulSleep: true,
        healthWorries: false,
      },
      ...(overrides.cognitions || {}),
    },

    insomnia: {
      isiScore: 18,
      severity: 'moderate' as const,
      subtype: 'mixed' as const,
      durationWeeks: 8,
      sleepDistress: 0.6,
      daytimeImpact: 0.5,
      ...(overrides.insomnia || {}),
    },

    circadian: {
      chronotype: 'intermediate' as const,
      circadianPhase: 3,
      socialJetLag: 1.5,
      phaseDeviation: 0.5,
      lightExposure: 5000,
      estimatedMelatoninOnset: '21:30',
      isStable: true,
      ...(overrides.circadian || {}),
    },

    homeostasis: {
      sleepDebt: -2,
      debtDuration: 3,
      homeostaticPressure: 0.6,
      optimalSleepDuration: 7.5,
      isRecoverable: true,
      ...(overrides.homeostasis || {}),
    },

    behaviors: {
      caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
      alcohol: { drinksToday: 0, lastDrinkTime: '' },
      screenTimeBeforeBed: 60,
      exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
      naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
      environment: { temperatureCelsius: 20, isQuiet: true, isDark: true, isComfortable: true },
      ...(overrides.behaviors || {}),
    },

    ...overrides,
  } as ISleepState;
}

// ============================================================================
// MAPPING CONSTANTS TESTS
// ============================================================================

describe('Mapping Constants', () => {
  describe('SLEEP_ACTION_TO_INTERVENTION_ID', () => {
    it('should map all 12 sleep actions', () => {
      const actions: SleepAction[] = [
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

      for (const action of actions) {
        expect(SLEEP_ACTION_TO_INTERVENTION_ID[action]).toBeDefined();
        expect(typeof SLEEP_ACTION_TO_INTERVENTION_ID[action]).toBe('string');
      }
    });
  });

  describe('INTERVENTION_ID_TO_SLEEP_ACTION', () => {
    it('should be the inverse of SLEEP_ACTION_TO_INTERVENTION_ID', () => {
      for (const [action, interventionId] of Object.entries(SLEEP_ACTION_TO_INTERVENTION_ID)) {
        expect(INTERVENTION_ID_TO_SLEEP_ACTION[interventionId]).toBe(action);
      }
    });
  });

  describe('SLEEP_ACTION_TO_COMPONENT', () => {
    it('should map sleep restriction actions correctly', () => {
      expect(SLEEP_ACTION_TO_COMPONENT['adjust_sleep_window']).toBe('sleep_restriction');
      expect(SLEEP_ACTION_TO_COMPONENT['enforce_wake_time']).toBe('sleep_restriction');
    });

    it('should map stimulus control actions correctly', () => {
      expect(SLEEP_ACTION_TO_COMPONENT['leave_bed_reminder']).toBe('stimulus_control');
      expect(SLEEP_ACTION_TO_COMPONENT['bed_restriction']).toBe('stimulus_control');
    });

    it('should map cognitive restructuring actions correctly', () => {
      expect(SLEEP_ACTION_TO_COMPONENT['challenge_belief']).toBe('cognitive_restructuring');
      expect(SLEEP_ACTION_TO_COMPONENT['behavioral_experiment']).toBe('cognitive_restructuring');
    });

    it('should map relaxation actions correctly', () => {
      expect(SLEEP_ACTION_TO_COMPONENT['relaxation_pmr']).toBe('relaxation');
      expect(SLEEP_ACTION_TO_COMPONENT['relaxation_breathing']).toBe('relaxation');
      expect(SLEEP_ACTION_TO_COMPONENT['relaxation_imagery']).toBe('relaxation');
    });
  });

  describe('COMPONENT_TO_CATEGORY', () => {
    it('should map all CBT-I components to CogniCore categories', () => {
      const components: CBTIComponent[] = [
        'sleep_restriction',
        'stimulus_control',
        'cognitive_restructuring',
        'sleep_hygiene',
        'relaxation',
      ];

      for (const component of components) {
        expect(COMPONENT_TO_CATEGORY[component]).toBeDefined();
      }
    });
  });
});

// ============================================================================
// SLEEP CORE ADAPTER TESTS
// ============================================================================

describe('SleepCoreAdapter', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false, language: 'en' });
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const defaultAdapter = new SleepCoreAdapter();
      expect(defaultAdapter).toBeInstanceOf(SleepCoreAdapter);
    });

    it('should accept custom config', () => {
      const customAdapter = new SleepCoreAdapter({
        enableExploration: false,
        explorationTemperature: 0.5,
        language: 'ru',
      });
      expect(customAdapter).toBeInstanceOf(SleepCoreAdapter);
    });
  });

  describe('sleepStateToBeliefState', () => {
    it('should convert sleep state to belief state', () => {
      const sleepState = createMockSleepState();
      const beliefState = adapter.sleepStateToBeliefState(sleepState);

      expect(beliefState).toBeDefined();
      expect(beliefState.userId).toBe(sleepState.userId);
      expect(beliefState.timestamp).toBeInstanceOf(Date);
    });

    it('should map emotional dimensions correctly', () => {
      const sleepState = createMockSleepState({
        cognitions: {
          sleepAnxiety: 0.7,
          preSleepArousal: 0.6,
          sleepSelfEfficacy: 0.3,
          dbasScore: 70,
          beliefs: {
            unrealisticExpectations: false,
            catastrophizing: false,
            helplessness: false,
            effortfulSleep: false,
            healthWorries: false,
          },
        },
      } as Partial<ISleepState>);

      const beliefState = adapter.sleepStateToBeliefState(sleepState);

      // Valence = 1 - sleepAnxiety = 0.3
      expect(beliefState.emotional.valence.posterior.mean).toBeCloseTo(0.3, 1);
      // Arousal = preSleepArousal = 0.6
      expect(beliefState.emotional.arousal.posterior.mean).toBeCloseTo(0.6, 1);
      // Dominance = sleepSelfEfficacy = 0.3
      expect(beliefState.emotional.dominance.posterior.mean).toBeCloseTo(0.3, 1);
    });

    it('should map risk dimensions from ISI score', () => {
      const sleepState = createMockSleepState({
        insomnia: {
          isiScore: 21, // 21/28 = 0.75
          severity: 'severe',
          sleepDistress: 0.8,
          daytimeImpact: 0.7,
        },
      } as Partial<ISleepState>);

      const beliefState = adapter.sleepStateToBeliefState(sleepState);

      // Risk = isiScore / 28 = 0.75
      expect(beliefState.risk.overallRisk.posterior.mean).toBeCloseTo(0.75, 1);
    });
  });

  describe('metricsToObservation', () => {
    it('should convert metrics to observation', () => {
      const metrics: ISleepMetrics = {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 360,
        sleepOnsetLatency: 30,
        wakeAfterSleepOnset: 60,
        numberOfAwakenings: 2,
        sleepEfficiency: 80,
      };

      const observation = adapter.metricsToObservation(metrics, 'diary');

      expect(observation.id).toContain('sleep-');
      expect(observation.type).toBe('behavioral');
      expect(observation.reliability).toBe(0.75); // diary reliability
      expect(observation.informsComponents).toContain('emotional');
    });

    it('should adjust reliability based on source', () => {
      const metrics: ISleepMetrics = {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 360,
        sleepOnsetLatency: 30,
        wakeAfterSleepOnset: 60,
        numberOfAwakenings: 2,
        sleepEfficiency: 80,
      };

      const diaryObs = adapter.metricsToObservation(metrics, 'diary');
      const wearableObs = adapter.metricsToObservation(metrics, 'wearable');
      const hybridObs = adapter.metricsToObservation(metrics, 'hybrid');

      expect(diaryObs.reliability).toBe(0.75);
      expect(wearableObs.reliability).toBe(0.85);
      expect(hybridObs.reliability).toBe(0.9);
    });
  });

  describe('selectIntervention', () => {
    it('should select an intervention', async () => {
      const sleepState = createMockSleepState();
      const selection = await adapter.selectIntervention(sleepState);

      expect(selection).toBeDefined();
      expect(selection.action).toBeDefined();
      expect(selection.component).toBeDefined();
      expect(selection.confidence).toBeGreaterThanOrEqual(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);
      expect(selection.explanation).toBeDefined();
    });

    it('should recommend sleep restriction when efficiency is low', async () => {
      const sleepState = createMockSleepState({
        metrics: {
          sleepEfficiency: 65, // Very low
          sleepOnsetLatency: 15, // Normal
          totalSleepTime: 300,
          timeInBed: 480,
          wakeAfterSleepOnset: 30,
          numberOfAwakenings: 1,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:15',
        },
        cognitions: {
          sleepAnxiety: 0.2, // Low
          preSleepArousal: 0.2, // Low
          sleepSelfEfficacy: 0.7,
          dbasScore: 30,
          beliefs: {
            unrealisticExpectations: false,
            catastrophizing: false,
            helplessness: false,
            effortfulSleep: false,
            healthWorries: false,
          },
        },
      } as Partial<ISleepState>);

      // Run multiple times to check if sleep restriction is recommended
      let sleepRestrictionCount = 0;
      for (let i = 0; i < 10; i++) {
        const selection = await adapter.selectIntervention(sleepState);
        if (selection.component === 'sleep_restriction') {
          sleepRestrictionCount++;
        }
      }

      // Should recommend sleep restriction at least sometimes
      expect(sleepRestrictionCount).toBeGreaterThan(0);
    });

    it('should recommend relaxation when arousal is high', async () => {
      const sleepState = createMockSleepState({
        metrics: {
          sleepEfficiency: 90, // Good
          sleepOnsetLatency: 10,
          totalSleepTime: 420,
          timeInBed: 480,
          wakeAfterSleepOnset: 20,
          numberOfAwakenings: 1,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:50',
          outOfBedTime: '07:10',
        },
        cognitions: {
          sleepAnxiety: 0.3,
          preSleepArousal: 0.8, // High arousal
          sleepSelfEfficacy: 0.6,
          dbasScore: 40,
          beliefs: {
            unrealisticExpectations: false,
            catastrophizing: false,
            helplessness: false,
            effortfulSleep: false,
            healthWorries: false,
          },
        },
      } as Partial<ISleepState>);

      // Run multiple times (increased to reduce flakiness from Thompson Sampling randomness)
      let relaxationCount = 0;
      for (let i = 0; i < 30; i++) {
        const selection = await adapter.selectIntervention(sleepState);
        if (selection.component === 'relaxation') {
          relaxationCount++;
        }
      }

      // With high arousal (0.8), relaxation should be selected at least once in 30 tries
      expect(relaxationCount).toBeGreaterThan(0);
    });

    it('should include alternatives in selection', async () => {
      const sleepState = createMockSleepState();
      const selection = await adapter.selectIntervention(sleepState);

      expect(selection.alternatives).toBeDefined();
      expect(Array.isArray(selection.alternatives)).toBe(true);
    });
  });

  describe('recordOutcome', () => {
    it('should record positive outcome', async () => {
      const previousState = createMockSleepState({
        metrics: { sleepEfficiency: 70 } as Partial<ISleepMetrics> as ISleepMetrics,
        insomnia: { isiScore: 18 } as Partial<IInsomniaSeverity> as IInsomniaSeverity,
      });

      const currentState = createMockSleepState({
        metrics: { sleepEfficiency: 80 } as Partial<ISleepMetrics> as ISleepMetrics, // Improved
        insomnia: { isiScore: 14 } as Partial<IInsomniaSeverity> as IInsomniaSeverity, // Improved
      });

      // Should not throw
      await expect(
        adapter.recordOutcome('adjust_sleep_window', previousState, currentState)
      ).resolves.not.toThrow();
    });

    it('should record negative outcome', async () => {
      const previousState = createMockSleepState({
        metrics: { sleepEfficiency: 80 } as Partial<ISleepMetrics> as ISleepMetrics,
        insomnia: { isiScore: 14 } as Partial<IInsomniaSeverity> as IInsomniaSeverity,
      });

      const currentState = createMockSleepState({
        metrics: { sleepEfficiency: 70 } as Partial<ISleepMetrics> as ISleepMetrics, // Declined
        insomnia: { isiScore: 18 } as Partial<IInsomniaSeverity> as IInsomniaSeverity, // Worsened
      });

      await expect(
        adapter.recordOutcome('adjust_sleep_window', previousState, currentState)
      ).resolves.not.toThrow();
    });
  });

  describe('getInterventionStats', () => {
    it('should return empty stats for new user', async () => {
      const stats = await adapter.getInterventionStats('new-user');
      expect(stats).toBeDefined();
      expect(stats.size).toBe(0);
    });

    it('should track stats after interventions', async () => {
      const sleepState = createMockSleepState();
      const userId = 'stats-test-user';

      // Select and record a few interventions
      for (let i = 0; i < 3; i++) {
        const selection = await adapter.selectIntervention(sleepState, userId);
        await adapter.recordOutcome(
          selection.action,
          sleepState,
          createMockSleepState({ metrics: { sleepEfficiency: 80 + i } as Partial<ISleepMetrics> as ISleepMetrics })
        );
      }

      const stats = await adapter.getInterventionStats(userId);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('getInterventions', () => {
    it('should return registered interventions', () => {
      const interventions = adapter.getInterventions();

      expect(interventions).toBeDefined();
      expect(Array.isArray(interventions)).toBe(true);
      expect(interventions.length).toBe(12); // 12 sleep interventions
    });

    it('should include all CBT-I components', () => {
      const interventions = adapter.getInterventions();
      const ids = interventions.map(i => i.id);

      expect(ids).toContain('sleep_restriction_adjust');
      expect(ids).toContain('stimulus_control_leave');
      expect(ids).toContain('cognitive_challenge');
      expect(ids).toContain('hygiene_caffeine');
      expect(ids).toContain('relaxation_pmr');
    });
  });

  describe('Language support', () => {
    it('should generate Russian explanations', async () => {
      const ruAdapter = createSleepCoreAdapter({ language: 'ru' });
      const sleepState = createMockSleepState();

      const selection = await ruAdapter.selectIntervention(sleepState);

      // Russian text should contain Cyrillic characters
      expect(selection.explanation).toMatch(/[а-яА-ЯёЁ]/);
    });

    it('should generate English explanations', async () => {
      const enAdapter = createSleepCoreAdapter({ language: 'en' });
      const sleepState = createMockSleepState();

      const selection = await enAdapter.selectIntervention(sleepState);

      // English text should not contain Cyrillic
      expect(selection.explanation).not.toMatch(/[а-яА-ЯёЁ]/);
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('createSleepCoreAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = createSleepCoreAdapter();
    expect(adapter).toBeInstanceOf(SleepCoreAdapter);
  });

  it('should accept partial config', () => {
    const adapter = createSleepCoreAdapter({
      enableExploration: false,
    });
    expect(adapter).toBeInstanceOf(SleepCoreAdapter);
  });
});
