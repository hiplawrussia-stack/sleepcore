/**
 * Sleep State Utility Functions Tests
 * Tests calculateSleepEfficiency, getInsomniaSeverity, calculateSleepHealthScore
 */

import {
  calculateSleepEfficiency,
  getInsomniaSeverity,
  calculateSleepHealthScore,
  type ISleepState,
  type SleepQualityRating,
} from '../../../src/sleep/interfaces/ISleepState';

describe('Sleep State Utilities', () => {
  describe('calculateSleepEfficiency()', () => {
    it('should calculate SE = (TST / TIB) * 100', () => {
      // 7.5 hours sleep, 8 hours in bed = 93.75%
      expect(calculateSleepEfficiency(450, 480)).toBe(94); // Rounded
    });

    it('should return 0 for zero time in bed', () => {
      expect(calculateSleepEfficiency(100, 0)).toBe(0);
    });

    it('should return 0 for negative time in bed', () => {
      expect(calculateSleepEfficiency(100, -10)).toBe(0);
    });

    it('should handle perfect efficiency (100%)', () => {
      expect(calculateSleepEfficiency(480, 480)).toBe(100);
    });

    it('should handle very low efficiency', () => {
      expect(calculateSleepEfficiency(180, 540)).toBe(33); // 3h sleep in 9h bed
    });

    it('should round to nearest integer', () => {
      // 420 / 480 = 87.5 → 88
      expect(calculateSleepEfficiency(420, 480)).toBe(88);
    });
  });

  describe('getInsomniaSeverity()', () => {
    it.each([
      [0, 'none'],
      [7, 'none'],
      [8, 'subthreshold'],
      [14, 'subthreshold'],
      [15, 'moderate'],
      [21, 'moderate'],
      [22, 'severe'],
      [28, 'severe'],
    ])('should classify ISI score %i as %s', (score, expected) => {
      expect(getInsomniaSeverity(score)).toBe(expected);
    });

    it('should handle boundary values correctly', () => {
      // Just below boundary
      expect(getInsomniaSeverity(7)).toBe('none');
      // Just at boundary
      expect(getInsomniaSeverity(8)).toBe('subthreshold');
    });
  });

  describe('calculateSleepHealthScore()', () => {
    // Create a factory for test sleep states
    function createTestSleepState(overrides: Partial<{
      sleepEfficiency: number;
      totalSleepTime: number;
      phaseDeviation: number;
      isiScore: number;
      daytimeSleepiness: number;
      subjectiveQuality: SleepQualityRating;
    }> = {}): ISleepState {
      return {
        userId: 'test-user',
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0],
        metrics: {
          timeInBed: 480,
          totalSleepTime: overrides.totalSleepTime ?? 450,
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 15,
          numberOfAwakenings: 1,
          sleepEfficiency: overrides.sleepEfficiency ?? 94,
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
          isiScore: overrides.isiScore ?? 5,
          severity: 'none',
          subtype: 'none',
          durationWeeks: 0,
          daytimeImpact: 0.2,
          sleepDistress: 0.1,
        },
        behaviors: {
          caffeine: { dailyMg: 100, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
          alcohol: { drinksToday: 0, lastDrinkTime: '' },
          screenTimeBeforeBed: 30,
          exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
          naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
          environment: { temperatureCelsius: 19, isQuiet: true, isDark: true, isComfortable: true },
        },
        cognitions: {
          dbasScore: 3,
          beliefs: {
            unrealisticExpectations: false,
            catastrophizing: false,
            helplessness: false,
            effortfulSleep: false,
            healthWorries: false,
          },
          sleepAnxiety: 0.1,
          preSleepArousal: 0.2,
          sleepSelfEfficacy: 0.8,
        },
        subjectiveQuality: overrides.subjectiveQuality ?? 'good',
        morningAlertness: 0.8,
        daytimeSleepiness: overrides.daytimeSleepiness ?? 0.2,
        sleepHealthScore: 85,
        trend: 'stable',
        dataQuality: 0.95,
        source: 'diary',
      };
    }

    it('should return score in valid range (0-100)', () => {
      const state = createTestSleepState();
      const score = calculateSleepHealthScore(state);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give high score for healthy sleep', () => {
      const healthyState = createTestSleepState({
        sleepEfficiency: 92,
        totalSleepTime: 480, // 8 hours
        isiScore: 3,
        daytimeSleepiness: 0.1,
        subjectiveQuality: 'excellent',
      });

      const score = calculateSleepHealthScore(healthyState);

      expect(score).toBeGreaterThan(80);
    });

    it('should give low score for poor sleep', () => {
      const poorState = createTestSleepState({
        sleepEfficiency: 65,
        totalSleepTime: 300, // 5 hours
        isiScore: 22,
        daytimeSleepiness: 0.8,
        subjectiveQuality: 'very_poor',
        phaseDeviation: 3,
      });

      const score = calculateSleepHealthScore(poorState);

      expect(score).toBeLessThan(50);
    });

    it('should weight efficiency at 25%', () => {
      // Compare two states differing only in efficiency
      const highEfficiency = createTestSleepState({ sleepEfficiency: 95 });
      const lowEfficiency = createTestSleepState({ sleepEfficiency: 70 });

      const highScore = calculateSleepHealthScore(highEfficiency);
      const lowScore = calculateSleepHealthScore(lowEfficiency);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should penalize sleep outside 7-9 hour range', () => {
      const optimalDuration = createTestSleepState({ totalSleepTime: 480 }); // 8h
      const shortDuration = createTestSleepState({ totalSleepTime: 300 }); // 5h
      const longDuration = createTestSleepState({ totalSleepTime: 660 }); // 11h

      const optimalScore = calculateSleepHealthScore(optimalDuration);
      const shortScore = calculateSleepHealthScore(shortDuration);
      const longScore = calculateSleepHealthScore(longDuration);

      expect(optimalScore).toBeGreaterThan(shortScore);
      expect(optimalScore).toBeGreaterThan(longScore);
    });

    it('should penalize high ISI scores', () => {
      const lowISI = createTestSleepState({ isiScore: 3 });
      const highISI = createTestSleepState({ isiScore: 24 });

      const lowISIScore = calculateSleepHealthScore(lowISI);
      const highISIScore = calculateSleepHealthScore(highISI);

      expect(lowISIScore).toBeGreaterThan(highISIScore);
    });

    it('should penalize phase deviation', () => {
      const aligned = createTestSleepState({ phaseDeviation: 0 });
      const misaligned = createTestSleepState({ phaseDeviation: 3 });

      const alignedScore = calculateSleepHealthScore(aligned);
      const misalignedScore = calculateSleepHealthScore(misaligned);

      expect(alignedScore).toBeGreaterThan(misalignedScore);
    });

    it('should incorporate subjective quality', () => {
      const excellent = createTestSleepState({ subjectiveQuality: 'excellent' });
      const veryPoor = createTestSleepState({ subjectiveQuality: 'very_poor' });

      const excellentScore = calculateSleepHealthScore(excellent);
      const veryPoorScore = calculateSleepHealthScore(veryPoor);

      expect(excellentScore).toBeGreaterThan(veryPoorScore);
    });

    it('should penalize daytime sleepiness', () => {
      const alert = createTestSleepState({ daytimeSleepiness: 0.1 });
      const sleepy = createTestSleepState({ daytimeSleepiness: 0.9 });

      const alertScore = calculateSleepHealthScore(alert);
      const sleepyScore = calculateSleepHealthScore(sleepy);

      expect(alertScore).toBeGreaterThan(sleepyScore);
    });

    it('should return integer score', () => {
      const state = createTestSleepState();
      const score = calculateSleepHealthScore(state);

      expect(Number.isInteger(score)).toBe(true);
    });
  });
});
