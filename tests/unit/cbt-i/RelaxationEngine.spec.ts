/**
 * RelaxationEngine Unit Tests
 * Tests relaxation techniques and protocols
 */

import { RelaxationEngine } from '../../../src/cbt-i/engines/RelaxationEngine';
import type { IRelaxationSession, RelaxationTechnique } from '../../../src/cbt-i/interfaces/ICBTIComponents';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('RelaxationEngine', () => {
  let engine: RelaxationEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    preSleepArousal: number;
    sleepAnxiety: number;
    sleepOnsetLatency: number;
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 400,
        sleepOnsetLatency: overrides.sleepOnsetLatency ?? 20,
        wakeAfterSleepOnset: 30,
        numberOfAwakenings: 2,
        sleepEfficiency: 83,
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
        isiScore: 12,
        severity: 'subthreshold',
        subtype: 'sleep_onset',
        durationWeeks: 4,
        daytimeImpact: 0.3,
        sleepDistress: 0.3,
      },
      behaviors: {
        caffeine: { dailyMg: 100, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 30,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 18, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: 5,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.3,
        preSleepArousal: overrides.preSleepArousal ?? 0.4,
        sleepSelfEfficacy: 0.7,
      },
      subjectiveQuality: 'fair',
      morningAlertness: 0.6,
      daytimeSleepiness: 0.3,
      sleepHealthScore: 70,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  beforeEach(() => {
    engine = new RelaxationEngine();
  });

  describe('recommendTechnique()', () => {
    describe('bedtime context', () => {
      it('should recommend PMR for high arousal', () => {
        const state = createTestSleepState({ preSleepArousal: 0.8, sleepAnxiety: 0.5 });
        const technique = engine.recommendTechnique(state, 'bedtime');

        expect(technique).toBe('progressive_muscle_relaxation');
      });

      it('should recommend PMR for high anxiety', () => {
        const state = createTestSleepState({ preSleepArousal: 0.5, sleepAnxiety: 0.8 });
        const technique = engine.recommendTechnique(state, 'bedtime');

        expect(technique).toBe('progressive_muscle_relaxation');
      });

      it('should recommend breathing for moderate arousal', () => {
        const state = createTestSleepState({ preSleepArousal: 0.5, sleepAnxiety: 0.3 });
        const technique = engine.recommendTechnique(state, 'bedtime');

        expect(technique).toBe('diaphragmatic_breathing');
      });

      it('should recommend cognitive shuffle for long SOL', () => {
        const state = createTestSleepState({
          preSleepArousal: 0.2,
          sleepAnxiety: 0.2,
          sleepOnsetLatency: 45,
        });
        const technique = engine.recommendTechnique(state, 'bedtime');

        expect(technique).toBe('cognitive_shuffle');
      });

      it('should recommend guided imagery for calm state', () => {
        const state = createTestSleepState({
          preSleepArousal: 0.2,
          sleepAnxiety: 0.2,
          sleepOnsetLatency: 15,
        });
        const technique = engine.recommendTechnique(state, 'bedtime');

        expect(technique).toBe('guided_imagery');
      });
    });

    describe('daytime context', () => {
      it('should recommend breathing for anxious daytime', () => {
        const state = createTestSleepState({ sleepAnxiety: 0.7 });
        const technique = engine.recommendTechnique(state, 'daytime');

        expect(technique).toBe('diaphragmatic_breathing');
      });

      it('should recommend mindfulness for calm daytime', () => {
        const state = createTestSleepState({ sleepAnxiety: 0.2 });
        const technique = engine.recommendTechnique(state, 'daytime');

        expect(technique).toBe('mindfulness_meditation');
      });
    });

    describe('wakeup context', () => {
      it('should recommend body scan for wakeup', () => {
        const state = createTestSleepState();
        const technique = engine.recommendTechnique(state, 'wakeup');

        expect(technique).toBe('body_scan');
      });
    });
  });

  describe('getProtocol()', () => {
    it('should return beginner bedtime protocol', () => {
      const protocol = engine.getProtocol('beginner', 'bedtime');

      expect(protocol.id).toBe('beginner_bedtime');
      expect(protocol.difficulty).toBe('beginner');
      expect(protocol.targetContext).toBe('bedtime');
      expect(protocol.techniques.length).toBeGreaterThan(0);
    });

    it('should return intermediate bedtime protocol', () => {
      const protocol = engine.getProtocol('intermediate', 'bedtime');

      expect(protocol.id).toBe('intermediate_bedtime');
      expect(protocol.totalDuration).toBe(25);
    });

    it('should return advanced bedtime protocol', () => {
      const protocol = engine.getProtocol('advanced', 'bedtime');

      expect(protocol.id).toBe('advanced_bedtime');
      expect(protocol.techniques.length).toBe(3);
    });

    it('should return daytime stress protocol', () => {
      const protocol = engine.getProtocol('beginner', 'daytime');

      expect(protocol.id).toBe('daytime_stress');
      expect(protocol.totalDuration).toBe(10);
    });

    it('should return wakeup protocol', () => {
      const protocol = engine.getProtocol('beginner', 'wakeup');

      expect(protocol.id).toBe('wakeup_calm');
    });

    it('should fallback to beginner for unknown combinations', () => {
      const protocol = engine.getProtocol('advanced', 'daytime');

      expect(protocol).toBeDefined();
      expect(protocol.targetContext).toBe('daytime');
    });
  });

  describe('generateInstructions()', () => {
    const techniques: RelaxationTechnique[] = [
      'progressive_muscle_relaxation',
      'diaphragmatic_breathing',
      'body_scan',
      'guided_imagery',
      'autogenic_training',
      'mindfulness_meditation',
      'cognitive_shuffle',
    ];

    it.each(techniques)('should generate instructions for %s', (technique) => {
      const instructions = engine.generateInstructions(technique, 15);

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.every(step => typeof step === 'string')).toBe(true);
    });

    it('should truncate for short duration (<5 min)', () => {
      const shortInstructions = engine.generateInstructions('progressive_muscle_relaxation', 3);
      const normalInstructions = engine.generateInstructions('progressive_muscle_relaxation', 15);

      expect(shortInstructions.length).toBeLessThanOrEqual(5);
      expect(shortInstructions.length).toBeLessThan(normalInstructions.length);
    });

    it('should moderate for medium duration (5-10 min)', () => {
      const mediumInstructions = engine.generateInstructions('body_scan', 7);

      expect(mediumInstructions.length).toBeLessThanOrEqual(8);
    });

    it('should add extension for long duration (>20 min)', () => {
      const longInstructions = engine.generateInstructions('guided_imagery', 25);

      const hasExtension = longInstructions.some(step =>
        step.includes('Продолжайте') || step.includes('позвольте')
      );
      expect(hasExtension).toBe(true);
    });

    it('should return default for unknown technique', () => {
      const instructions = engine.generateInstructions('unknown' as RelaxationTechnique, 10);

      expect(instructions.length).toBe(1);
      expect(instructions[0]).toContain('дыш');
    });

    it('should return Russian-language instructions', () => {
      const instructions = engine.generateInstructions('diaphragmatic_breathing', 10);

      const hasCyrillic = instructions.every(step => /[а-яёА-ЯЁ]/.test(step));
      expect(hasCyrillic).toBe(true);
    });
  });

  describe('calculateEffectiveness()', () => {
    // Helper to create a session matching IRelaxationSession interface
    function createSession(overrides: Partial<{
      sessionId: string;
      technique: RelaxationTechnique;
      duration: number;
      completed: boolean;
      preAnxietyLevel: number;
      postAnxietyLevel: number;
      preTensionLevel: number;
      postTensionLevel: number;
      userRating: number;
    }> = {}): IRelaxationSession {
      return {
        sessionId: overrides.sessionId ?? 'session-1',
        technique: overrides.technique ?? 'diaphragmatic_breathing',
        duration: overrides.duration ?? 15,
        completed: overrides.completed ?? true,
        preAnxietyLevel: overrides.preAnxietyLevel ?? 0.5,
        postAnxietyLevel: overrides.postAnxietyLevel ?? 0.3,
        preTensionLevel: overrides.preTensionLevel ?? 0.5,
        postTensionLevel: overrides.postTensionLevel ?? 0.3,
        userRating: overrides.userRating ?? 4,
        timestamp: new Date(),
      };
    }

    it('should handle empty sessions', () => {
      const result = engine.calculateEffectiveness([]);

      expect(result.avgAnxietyReduction).toBe(0);
      expect(result.mostEffectiveTechnique).toBe('diaphragmatic_breathing');
    });

    it('should calculate average anxiety reduction', () => {
      const sessions: IRelaxationSession[] = [
        createSession({
          sessionId: 's1',
          technique: 'progressive_muscle_relaxation',
          duration: 15,
          completed: true,
          preAnxietyLevel: 0.8,
          postAnxietyLevel: 0.3,
          preTensionLevel: 0.7,
          postTensionLevel: 0.3,
        }),
        createSession({
          sessionId: 's2',
          technique: 'diaphragmatic_breathing',
          duration: 10,
          completed: true,
          preAnxietyLevel: 0.6,
          postAnxietyLevel: 0.2,
          preTensionLevel: 0.5,
          postTensionLevel: 0.2,
        }),
      ];

      const result = engine.calculateEffectiveness(sessions);

      // Average anxiety reduction: (0.5 + 0.4) / 2 = 0.45
      expect(result.avgAnxietyReduction).toBeCloseTo(0.45, 2);
    });

    it('should identify most effective technique', () => {
      const sessions: IRelaxationSession[] = [
        createSession({
          sessionId: 's1',
          technique: 'progressive_muscle_relaxation',
          duration: 15,
          completed: true,
          preAnxietyLevel: 0.8,
          postAnxietyLevel: 0.2, // 0.6 reduction
          preTensionLevel: 0.8,
          postTensionLevel: 0.2, // 0.6 reduction
        }),
        createSession({
          sessionId: 's2',
          technique: 'diaphragmatic_breathing',
          duration: 10,
          completed: true,
          preAnxietyLevel: 0.6,
          postAnxietyLevel: 0.4, // 0.2 reduction
          preTensionLevel: 0.5,
          postTensionLevel: 0.3, // 0.2 reduction
        }),
      ];

      const result = engine.calculateEffectiveness(sessions);

      expect(result.mostEffectiveTechnique).toBe('progressive_muscle_relaxation');
    });

    it('should only count completed sessions', () => {
      const sessions: IRelaxationSession[] = [
        createSession({
          sessionId: 's1',
          technique: 'body_scan',
          duration: 15,
          completed: true,
          preAnxietyLevel: 0.8,
          postAnxietyLevel: 0.3,
          preTensionLevel: 0.7,
          postTensionLevel: 0.3,
        }),
        createSession({
          sessionId: 's2',
          technique: 'guided_imagery',
          duration: 10,
          completed: false, // Not completed
          preAnxietyLevel: 0.9,
          postAnxietyLevel: 0.9,
          preTensionLevel: 0.9,
          postTensionLevel: 0.9,
        }),
      ];

      const result = engine.calculateEffectiveness(sessions);

      // Only s1 should count
      expect(result.avgAnxietyReduction).toBeCloseTo(0.5, 2);
    });

    it('should average multiple sessions of same technique', () => {
      const sessions: IRelaxationSession[] = [
        createSession({
          sessionId: 's1',
          technique: 'mindfulness_meditation',
          duration: 15,
          completed: true,
          preAnxietyLevel: 0.8,
          postAnxietyLevel: 0.4,
          preTensionLevel: 0.6,
          postTensionLevel: 0.3,
        }),
        createSession({
          sessionId: 's2',
          technique: 'mindfulness_meditation',
          duration: 15,
          completed: true,
          preAnxietyLevel: 0.7,
          postAnxietyLevel: 0.2,
          preTensionLevel: 0.5,
          postTensionLevel: 0.1,
        }),
      ];

      const result = engine.calculateEffectiveness(sessions);

      expect(result.mostEffectiveTechnique).toBe('mindfulness_meditation');
    });
  });
});
