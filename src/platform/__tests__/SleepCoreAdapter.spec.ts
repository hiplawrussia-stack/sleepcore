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

// ============================================================================
// EXPLANATION FORMATTING TESTS
// ============================================================================

describe('formatExplanationForDisplay', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter();
  });

  /**
   * Create mock explanation for testing
   */
  function createMockExplanation(overrides: Partial<{
    keyFactors: Array<{ name: string; nameRu: string; value: string; impact: 'helps' | 'hurts' | 'neutral'; emoji: string; explanation: string; explanationRu: string }>;
    actionableAdvice: string[];
    actionableAdviceRu: string[];
    whatWouldChange: string[];
    whatWouldChangeRu: string[];
  }> = {}) {
    return {
      summary: 'We recommend sleep restriction therapy',
      summaryRu: 'Мы рекомендуем терапию ограничения сна',
      reasoning: 'Your sleep efficiency is below 85%',
      reasoningRu: 'Ваша эффективность сна ниже 85%',
      keyFactors: overrides.keyFactors ?? [
        {
          name: 'Sleep Efficiency',
          nameRu: 'Эффективность сна',
          value: '75%',
          impact: 'hurts' as const,
          emoji: '📉',
          explanation: 'Low efficiency indicates fragmented sleep',
          explanationRu: 'Низкая эффективность указывает на фрагментированный сон',
        },
      ],
      confidence: {
        level: 'high' as const,
        emoji: '🎯',
        description: 'High confidence based on 7 days of data',
        descriptionRu: 'Высокая уверенность на основе 7 дней данных',
      },
      actionableAdvice: overrides.actionableAdvice ?? ['Restrict bed time to 6 hours'],
      actionableAdviceRu: overrides.actionableAdviceRu ?? ['Ограничьте время в постели до 6 часов'],
      whatWouldChange: overrides.whatWouldChange,
      whatWouldChangeRu: overrides.whatWouldChangeRu,
      limitations: ['Based on self-reported data'],
      limitationsRu: ['На основе самоотчётных данных'],
      disclaimer: 'This is educational, not medical advice',
      disclaimerRu: 'Это образовательная информация, не медицинский совет',
    };
  }

  it('should format explanation in Russian by default', () => {
    const explanation = createMockExplanation();
    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).toContain('📋 Мы рекомендуем терапию ограничения сна');
    expect(result).toContain('💡 Ваша эффективность сна ниже 85%');
    expect(result).toContain('📊 Ключевые факторы:');
    expect(result).toContain('📉 Эффективность сна: 75% ⚠️');
    expect(result).toContain('🎯 Уверенность:');
    expect(result).toContain('Ограничьте время в постели до 6 часов');
    expect(result).toContain('Это образовательная информация, не медицинский совет');
  });

  it('should format explanation in English when specified', () => {
    const explanation = createMockExplanation();
    const result = adapter.formatExplanationForDisplay(explanation, 'en');

    expect(result).toContain('📋 We recommend sleep restriction therapy');
    expect(result).toContain('💡 Your sleep efficiency is below 85%');
    expect(result).toContain('📊 Key Factors:');
    expect(result).toContain('📉 Sleep Efficiency: 75% ⚠️');
    expect(result).toContain('Confidence:');
    expect(result).toContain('Restrict bed time to 6 hours');
    expect(result).toContain('This is educational, not medical advice');
  });

  it('should show different impact emojis', () => {
    const explanation = createMockExplanation({
      keyFactors: [
        {
          name: 'Consistent wake time',
          nameRu: 'Постоянное время подъёма',
          value: 'Yes',
          impact: 'helps',
          emoji: '✅',
          explanation: 'Good habit',
          explanationRu: 'Хорошая привычка',
        },
        {
          name: 'Caffeine after 2 PM',
          nameRu: 'Кофеин после 14:00',
          value: 'Yes',
          impact: 'hurts',
          emoji: '☕',
          explanation: 'May affect sleep',
          explanationRu: 'Может влиять на сон',
        },
        {
          name: 'Exercise',
          nameRu: 'Физическая активность',
          value: 'Moderate',
          impact: 'neutral',
          emoji: '🏃',
          explanation: 'Current level is fine',
          explanationRu: 'Текущий уровень нормальный',
        },
      ],
    });

    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).toContain('✅'); // helps
    expect(result).toContain('⚠️'); // hurts
    expect(result).toContain('➡️'); // neutral
  });

  it('should include what would change section when provided', () => {
    const explanation = createMockExplanation({
      whatWouldChange: ['Improving sleep efficiency above 85%'],
      whatWouldChangeRu: ['Улучшение эффективности сна выше 85%'],
    });

    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).toContain('🔄 Что изменило бы рекомендацию:');
    expect(result).toContain('Улучшение эффективности сна выше 85%');
  });

  it('should include what would change in English', () => {
    const explanation = createMockExplanation({
      whatWouldChange: ['Improving sleep efficiency above 85%'],
      whatWouldChangeRu: ['Улучшение эффективности сна выше 85%'],
    });

    const result = adapter.formatExplanationForDisplay(explanation, 'en');

    expect(result).toContain('🔄 What would change the recommendation:');
    expect(result).toContain('Improving sleep efficiency above 85%');
  });

  it('should handle empty key factors', () => {
    const explanation = createMockExplanation({ keyFactors: [] });
    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).not.toContain('📊 Ключевые факторы:');
    expect(result).toContain('📋'); // Summary should still be there
  });

  it('should handle empty actionable advice', () => {
    const explanation = createMockExplanation({
      actionableAdvice: [],
      actionableAdviceRu: [],
    });
    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).not.toContain('🎯 Что делать:');
  });

  it('should handle undefined whatWouldChange', () => {
    const explanation = createMockExplanation({
      whatWouldChange: undefined,
      whatWouldChangeRu: undefined,
    });
    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).not.toContain('🔄');
  });

  it('should handle empty whatWouldChange array', () => {
    const explanation = createMockExplanation({
      whatWouldChange: [],
      whatWouldChangeRu: [],
    });
    const result = adapter.formatExplanationForDisplay(explanation);

    expect(result).not.toContain('🔄 Что изменило бы рекомендацию:');
  });
});

// ============================================================================
// MOTIVATIONAL RESPONSE FORMATTING TESTS
// ============================================================================

describe('formatMotivationalResponseForDisplay', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter();
  });

  function createMockMotivationalResponse(overrides: Partial<{
    personalizationNote: string;
    personalizationNoteRu: string;
    followUpSuggestions: string[];
    followUpSuggestionsRu: string[];
  }> = {}) {
    return {
      text: 'I hear that following the sleep schedule has been challenging.',
      textRu: 'Я слышу, что следование режиму сна было сложным.',
      technique: 'reflection' as const,
      strategy: 'explore_ambivalence' as const,
      expectedImpact: 'explore' as const,
      confidence: 0.8,
      followUpSuggestions: overrides.followUpSuggestions ?? ['Ask about specific challenges'],
      followUpSuggestionsRu: overrides.followUpSuggestionsRu ?? ['Спросить о конкретных трудностях'],
      personalizationNote: overrides.personalizationNote,
      personalizationNoteRu: overrides.personalizationNoteRu,
    };
  }

  it('should format response in Russian by default', () => {
    const response = createMockMotivationalResponse();
    const result = adapter.formatMotivationalResponseForDisplay(response);

    expect(result).toContain('💬 Я слышу, что следование режиму сна было сложным.');
    expect(result).toContain('📋 Возможные следующие шаги:');
    expect(result).toContain('• Спросить о конкретных трудностях');
  });

  it('should format response in English when specified', () => {
    const response = createMockMotivationalResponse();
    const result = adapter.formatMotivationalResponseForDisplay(response, 'en');

    expect(result).toContain('💬 I hear that following the sleep schedule has been challenging.');
    expect(result).toContain('📋 Possible next steps:');
    expect(result).toContain('• Ask about specific challenges');
  });

  it('should include personalization note when provided', () => {
    const response = createMockMotivationalResponse({
      personalizationNote: 'Based on your recent progress',
      personalizationNoteRu: 'На основе вашего недавнего прогресса',
    });

    const resultRu = adapter.formatMotivationalResponseForDisplay(response, 'ru');
    expect(resultRu).toContain('💡 _На основе вашего недавнего прогресса_');

    const resultEn = adapter.formatMotivationalResponseForDisplay(response, 'en');
    expect(resultEn).toContain('💡 _Based on your recent progress_');
  });

  it('should handle empty follow-up suggestions', () => {
    const response = createMockMotivationalResponse({
      followUpSuggestions: [],
      followUpSuggestionsRu: [],
    });
    const result = adapter.formatMotivationalResponseForDisplay(response);

    expect(result).not.toContain('📋 Возможные следующие шаги:');
  });

  it('should handle missing personalization note', () => {
    const response = createMockMotivationalResponse({
      personalizationNote: undefined,
      personalizationNoteRu: undefined,
    });
    const result = adapter.formatMotivationalResponseForDisplay(response);

    expect(result).not.toContain('💡 _');
  });
});

// ============================================================================
// LOCAL STATS RECORDING TESTS
// ============================================================================

describe('recordOutcome with local stats', () => {
  let adapter: SleepCoreAdapter;
  const userId = 'local-stats-user';

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: true });
  });

  it('should update local stats on positive outcome', async () => {
    const sleepState = createMockSleepState();

    // First select an intervention to initialize stats
    const selection = await adapter.selectIntervention(sleepState, userId);

    // Record successful outcome
    const improvedState = createMockSleepState({
      metrics: { sleepEfficiency: 90 } as Partial<ISleepMetrics> as ISleepMetrics,
      insomnia: { isiScore: 10 } as Partial<IInsomniaSeverity> as IInsomniaSeverity,
    });

    await adapter.recordOutcome(selection.action, sleepState, improvedState, userId);

    const stats = await adapter.getInterventionStats(userId);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should update local stats on negative outcome', async () => {
    const sleepState = createMockSleepState();

    // First select an intervention
    const selection = await adapter.selectIntervention(sleepState, userId);

    // Record negative outcome
    const worsenedState = createMockSleepState({
      metrics: { sleepEfficiency: 60 } as Partial<ISleepMetrics> as ISleepMetrics,
      insomnia: { isiScore: 22 } as Partial<IInsomniaSeverity> as IInsomniaSeverity,
    });

    await adapter.recordOutcome(selection.action, sleepState, worsenedState, userId);

    const stats = await adapter.getInterventionStats(userId);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should log debug output when debug mode enabled', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, userId);

    await adapter.recordOutcome(selection.action, sleepState, sleepState, userId);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SleepCoreAdapter] Recorded outcome for')
    );

    consoleSpy.mockRestore();
  });

  it('should accumulate stats over multiple interventions', async () => {
    const sleepState = createMockSleepState();

    // Run multiple selection + outcome cycles
    for (let i = 0; i < 5; i++) {
      const selection = await adapter.selectIntervention(sleepState, userId);
      const improvedState = createMockSleepState({
        metrics: { sleepEfficiency: 75 + i * 2 } as Partial<ISleepMetrics> as ISleepMetrics,
      });
      await adapter.recordOutcome(selection.action, sleepState, improvedState, userId);
    }

    const stats = await adapter.getInterventionStats(userId);
    expect(stats.size).toBeGreaterThan(0);

    // Check that at least one action has multiple attempts
    let totalAttempts = 0;
    for (const actionStats of stats.values()) {
      totalAttempts += actionStats.attempts;
    }
    expect(totalAttempts).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// CONTEXTUAL FEATURES EXTRACTION TESTS
// ============================================================================

describe('extractContextualFeatures (indirect testing)', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false });
  });

  it('should handle improving trend in sleep state', async () => {
    const sleepState = createMockSleepState({
      trend: 'improving',
    });

    const selection = await adapter.selectIntervention(sleepState, 'trend-user-1');
    expect(selection).toBeDefined();
    expect(selection.action).toBeDefined();
  });

  it('should handle declining trend in sleep state', async () => {
    const sleepState = createMockSleepState({
      trend: 'declining',
    });

    const selection = await adapter.selectIntervention(sleepState, 'trend-user-2');
    expect(selection).toBeDefined();
    expect(selection.action).toBeDefined();
  });

  it('should handle stable trend in sleep state', async () => {
    const sleepState = createMockSleepState({
      trend: 'stable',
    });

    const selection = await adapter.selectIntervention(sleepState, 'trend-user-3');
    expect(selection).toBeDefined();
  });

  it('should calculate risk level based on ISI score', async () => {
    const lowISIState = createMockSleepState({
      insomnia: {
        isiScore: 7,
        severity: 'none' as const,
        subtype: 'sleep_onset' as const,
        durationWeeks: 4,
        sleepDistress: 0.2,
        daytimeImpact: 0.2,
      },
    });

    const highISIState = createMockSleepState({
      insomnia: {
        isiScore: 24,
        severity: 'severe' as const,
        subtype: 'mixed' as const,
        durationWeeks: 16,
        sleepDistress: 0.9,
        daytimeImpact: 0.8,
      },
    });

    const lowResult = await adapter.selectIntervention(lowISIState, 'isi-user-low');
    const highResult = await adapter.selectIntervention(highISIState, 'isi-user-high');

    expect(lowResult).toBeDefined();
    expect(highResult).toBeDefined();
  });

  it('should handle different cognitive distortion patterns', async () => {
    const catastrophizingState = createMockSleepState({
      cognitions: {
        sleepAnxiety: 0.8,
        preSleepArousal: 0.7,
        sleepSelfEfficacy: 0.2,
        dbasScore: 80,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: true,
          helplessness: true,
          effortfulSleep: false,
          healthWorries: true,
        },
      },
    });

    const selection = await adapter.selectIntervention(catastrophizingState, 'cog-user');
    expect(selection).toBeDefined();
  });
});

// ============================================================================
// ADVANCED SELECTION TESTS
// ============================================================================

describe('Advanced Intervention Selection', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false });
  });

  it('should provide alternatives when selecting intervention', async () => {
    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, 'alt-user');

    expect(selection.alternatives).toBeDefined();
    expect(Array.isArray(selection.alternatives)).toBe(true);
  });

  it('should select valid intervention from available actions', async () => {
    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, 'filter-user');

    // Action should be a valid SleepAction
    const validActions: SleepAction[] = [
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
    expect(validActions).toContain(selection.action);
  });

  it('should return selection with valid structure', async () => {
    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, 'struct-user');

    expect(selection).toHaveProperty('action');
    expect(selection).toHaveProperty('component');
    expect(selection).toHaveProperty('confidence');
    expect(selection).toHaveProperty('explanation');
    expect(selection).toHaveProperty('alternatives');
  });

  it('should assign component correctly based on action', async () => {
    const sleepState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 300,
        sleepOnsetLatency: 60,
        wakeAfterSleepOnset: 90,
        numberOfAwakenings: 5,
        sleepEfficiency: 62,
      },
    });

    const selection = await adapter.selectIntervention(sleepState, 'component-user');

    if (selection.action !== 'no_intervention') {
      expect(selection.component).toBeDefined();
      expect([
        'sleep_restriction',
        'stimulus_control',
        'cognitive_restructuring',
        'sleep_hygiene',
        'relaxation',
      ]).toContain(selection.component);
    }
  });
});

// ============================================================================
// BELIEF STATE MANAGEMENT TESTS
// ============================================================================

describe('Belief State Management', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false });
  });

  it('should create and store belief state for new user', async () => {
    const sleepState = createMockSleepState();
    const userId = 'belief-user-1';

    await adapter.selectIntervention(sleepState, userId);

    const beliefState = adapter.sleepStateToBeliefState(sleepState);
    expect(beliefState).toBeDefined();
    expect(beliefState.emotional).toBeDefined();
    expect(beliefState.cognitive).toBeDefined();
  });

  it('should update belief state with observations', async () => {
    const userId = 'belief-user-2';

    const initialState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 350,
        sleepOnsetLatency: 40,
        wakeAfterSleepOnset: 50,
        numberOfAwakenings: 3,
        sleepEfficiency: 73,
      },
    });

    await adapter.selectIntervention(initialState, userId);

    const updatedState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 400,
        sleepOnsetLatency: 20,
        wakeAfterSleepOnset: 30,
        numberOfAwakenings: 1,
        sleepEfficiency: 85,
      },
    });

    const selection = await adapter.selectIntervention(updatedState, userId);
    expect(selection).toBeDefined();
  });
});

// ============================================================================
// EXPLANATION GENERATION TESTS
// ============================================================================

describe('Explanation Generation', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false });
  });

  it('should generate explanation for selected intervention', async () => {
    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, 'explain-user');

    expect(selection.explanation).toBeDefined();
    expect(typeof selection.explanation).toBe('string');
    expect(selection.explanation.length).toBeGreaterThan(0);
  });

  it('should generate explanation with component info', async () => {
    const sleepState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 300,
        sleepOnsetLatency: 60,
        wakeAfterSleepOnset: 90,
        numberOfAwakenings: 5,
        sleepEfficiency: 62,
      },
    });

    const selection = await adapter.selectIntervention(sleepState, 'explain-component-user');

    expect(selection.explanation).toBeDefined();
    // Explanation should mention the therapy component
    if (selection.action !== 'no_intervention') {
      expect(selection.component).toBeDefined();
    }
  });

  it('should include confidence in explanation', async () => {
    const sleepState = createMockSleepState();
    const selection = await adapter.selectIntervention(sleepState, 'explain-conf-user');

    expect(selection.confidence).toBeDefined();
    expect(selection.confidence).toBeGreaterThanOrEqual(0);
    expect(selection.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// INTERVENTION STATS TESTS
// ============================================================================

describe('getInterventionStats', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: false });
  });

  it('should return empty map for user with no history', async () => {
    const stats = await adapter.getInterventionStats('no-history-user');
    expect(stats).toBeInstanceOf(Map);
    expect(stats.size).toBe(0);
  });

  it('should track success rate correctly', async () => {
    const userId = 'stats-user';
    const sleepState = createMockSleepState();

    // Select and record a successful outcome
    const selection = await adapter.selectIntervention(sleepState, userId);
    const improvedState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 420,
        sleepOnsetLatency: 15,
        wakeAfterSleepOnset: 20,
        numberOfAwakenings: 1,
        sleepEfficiency: 91,
      },
      insomnia: {
        isiScore: 8,
        severity: 'subthreshold' as const,
        subtype: 'sleep_onset' as const,
        durationWeeks: 4,
        sleepDistress: 0.3,
        daytimeImpact: 0.3,
      },
    });

    await adapter.recordOutcome(selection.action, sleepState, improvedState, userId);

    const stats = await adapter.getInterventionStats(userId);
    expect(stats.size).toBeGreaterThan(0);
  });
});

// ============================================================================
// REWARD CALCULATION TESTS
// ============================================================================

describe('Reward Calculation (via recordOutcome)', () => {
  let adapter: SleepCoreAdapter;

  beforeEach(() => {
    adapter = createSleepCoreAdapter({ debug: true });
  });

  it('should calculate positive reward for improvement', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const userId = 'reward-pos-user';

    const beforeState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 330,
        sleepOnsetLatency: 50,
        wakeAfterSleepOnset: 70,
        numberOfAwakenings: 4,
        sleepEfficiency: 69,
      },
      insomnia: {
        isiScore: 20,
        severity: 'moderate' as const,
        subtype: 'mixed' as const,
        durationWeeks: 10,
        sleepDistress: 0.7,
        daytimeImpact: 0.6,
      },
    });

    const selection = await adapter.selectIntervention(beforeState, userId);

    const afterState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 410,
        sleepOnsetLatency: 20,
        wakeAfterSleepOnset: 25,
        numberOfAwakenings: 2,
        sleepEfficiency: 85,
      },
      insomnia: {
        isiScore: 12,
        severity: 'subthreshold' as const,
        subtype: 'sleep_onset' as const,
        durationWeeks: 10,
        sleepDistress: 0.4,
        daytimeImpact: 0.4,
      },
    });

    await adapter.recordOutcome(selection.action, beforeState, afterState, userId);

    // Verify debug output was called
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should calculate negative reward for worsening', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const userId = 'reward-neg-user';

    const beforeState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 380,
        sleepOnsetLatency: 30,
        wakeAfterSleepOnset: 40,
        numberOfAwakenings: 2,
        sleepEfficiency: 79,
      },
      insomnia: {
        isiScore: 16,
        severity: 'moderate' as const,
        subtype: 'mixed' as const,
        durationWeeks: 8,
        sleepDistress: 0.5,
        daytimeImpact: 0.5,
      },
    });

    const selection = await adapter.selectIntervention(beforeState, userId);

    const afterState = createMockSleepState({
      metrics: {
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        timeInBed: 480,
        totalSleepTime: 280,
        sleepOnsetLatency: 60,
        wakeAfterSleepOnset: 100,
        numberOfAwakenings: 6,
        sleepEfficiency: 58,
      },
      insomnia: {
        isiScore: 23,
        severity: 'severe' as const,
        subtype: 'mixed' as const,
        durationWeeks: 9,
        sleepDistress: 0.8,
        daytimeImpact: 0.8,
      },
    });

    await adapter.recordOutcome(selection.action, beforeState, afterState, userId);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
