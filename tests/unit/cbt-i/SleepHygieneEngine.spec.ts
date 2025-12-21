/**
 * SleepHygieneEngine Unit Tests
 * Tests sleep hygiene assessment and recommendations
 */

import { SleepHygieneEngine } from '../../../src/cbt-i/engines/SleepHygieneEngine';
import type { ISleepHygieneAssessment, SleepHygieneCategory } from '../../../src/cbt-i/interfaces/ICBTIComponents';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('SleepHygieneEngine', () => {
  let engine: SleepHygieneEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    caffeineDaily: number;
    caffeineHoursBeforeBed: number;
    alcoholDrinks: number;
    exerciseHoursBeforeBed: number;
    exerciseDurationMinutes: number;
    didExercise: boolean;
    screenTimeBeforeBed: number;
    temperatureCelsius: number;
    isQuiet: boolean;
    isDark: boolean;
    isComfortable: boolean;
    circadianStable: boolean;
    socialJetLag: number;
    sleepAnxiety: number;
    preSleepArousal: number;
    sleepSelfEfficacy: number;
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 400,
        sleepOnsetLatency: 30,
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
        socialJetLag: overrides.socialJetLag ?? 0.5,
        isStable: overrides.circadianStable ?? true,
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
        caffeine: {
          dailyMg: overrides.caffeineDaily ?? 100,
          lastIntakeTime: '14:00',
          hoursBeforeBed: overrides.caffeineHoursBeforeBed ?? 9,
        },
        alcohol: { drinksToday: overrides.alcoholDrinks ?? 0, lastDrinkTime: '' },
        screenTimeBeforeBed: overrides.screenTimeBeforeBed ?? 30,
        exercise: {
          didExercise: overrides.didExercise ?? true,
          durationMinutes: overrides.exerciseDurationMinutes ?? 30,
          hoursBeforeBed: overrides.exerciseHoursBeforeBed ?? 6,
        },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: {
          temperatureCelsius: overrides.temperatureCelsius ?? 18,
          isQuiet: overrides.isQuiet ?? true,
          isDark: overrides.isDark ?? true,
          isComfortable: overrides.isComfortable ?? true,
        },
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
        sleepAnxiety: overrides.sleepAnxiety ?? 0.2,
        preSleepArousal: overrides.preSleepArousal ?? 0.3,
        sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.8,
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
    engine = new SleepHygieneEngine();
  });

  describe('assess()', () => {
    it('should return assessment with all categories', () => {
      const state = createTestSleepState();
      const assessment = engine.assess(state);

      const categories: SleepHygieneCategory[] = [
        'caffeine', 'alcohol', 'nicotine', 'exercise',
        'diet', 'environment', 'screen_time', 'routine', 'stress'
      ];

      for (const category of categories) {
        expect(assessment.scores).toHaveProperty(category);
        expect(assessment.scores[category]).toBeGreaterThanOrEqual(0);
        expect(assessment.scores[category]).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate overall score', () => {
      const state = createTestSleepState();
      const assessment = engine.assess(state);

      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(1);
    });

    it('should identify top issues (scores < 0.6)', () => {
      // Create state with poor hygiene
      const poorState = createTestSleepState({
        caffeineDaily: 500,
        caffeineHoursBeforeBed: 2,
        alcoholDrinks: 4,
        screenTimeBeforeBed: 120,
      });

      const assessment = engine.assess(poorState);

      expect(assessment.topIssues.length).toBeGreaterThan(0);
    });

    it('should penalize high caffeine intake', () => {
      const lowCaffeine = createTestSleepState({ caffeineDaily: 100, caffeineHoursBeforeBed: 10 });
      const highCaffeine = createTestSleepState({ caffeineDaily: 500, caffeineHoursBeforeBed: 2 });

      const lowScore = engine.assess(lowCaffeine).scores.caffeine;
      const highScore = engine.assess(highCaffeine).scores.caffeine;

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it('should penalize alcohol consumption', () => {
      const noAlcohol = createTestSleepState({ alcoholDrinks: 0 });
      const someAlcohol = createTestSleepState({ alcoholDrinks: 3 });

      const noScore = engine.assess(noAlcohol).scores.alcohol;
      const someScore = engine.assess(someAlcohol).scores.alcohol;

      expect(noScore).toBeGreaterThan(someScore);
    });

    it('should reward exercise but penalize late exercise', () => {
      const earlyExercise = createTestSleepState({ didExercise: true, exerciseHoursBeforeBed: 6, exerciseDurationMinutes: 45 });
      const lateExercise = createTestSleepState({ didExercise: true, exerciseHoursBeforeBed: 1, exerciseDurationMinutes: 45 });
      const noExercise = createTestSleepState({ didExercise: false });

      const earlyScore = engine.assess(earlyExercise).scores.exercise;
      const lateScore = engine.assess(lateExercise).scores.exercise;
      const noScore = engine.assess(noExercise).scores.exercise;

      expect(earlyScore).toBeGreaterThan(noScore);
      expect(earlyScore).toBeGreaterThan(lateScore);
    });

    it('should reward optimal bedroom environment', () => {
      const goodEnv = createTestSleepState({
        temperatureCelsius: 18,
        isQuiet: true,
        isDark: true,
        isComfortable: true,
      });
      const poorEnv = createTestSleepState({
        temperatureCelsius: 25,
        isQuiet: false,
        isDark: false,
        isComfortable: false,
      });

      const goodScore = engine.assess(goodEnv).scores.environment;
      const poorScore = engine.assess(poorEnv).scores.environment;

      expect(goodScore).toBeGreaterThan(poorScore);
    });

    it('should penalize high screen time', () => {
      const noScreen = createTestSleepState({ screenTimeBeforeBed: 0 });
      const highScreen = createTestSleepState({ screenTimeBeforeBed: 120 });

      const noScore = engine.assess(noScreen).scores.screen_time;
      const highScore = engine.assess(highScreen).scores.screen_time;

      expect(noScore).toBeGreaterThan(highScore);
    });

    it('should assess routine based on circadian stability', () => {
      const stableRoutine = createTestSleepState({ circadianStable: true, socialJetLag: 0.5 });
      const unstableRoutine = createTestSleepState({ circadianStable: false, socialJetLag: 3 });

      const stableScore = engine.assess(stableRoutine).scores.routine;
      const unstableScore = engine.assess(unstableRoutine).scores.routine;

      expect(stableScore).toBeGreaterThan(unstableScore);
    });

    it('should assess stress from cognitions', () => {
      const lowStress = createTestSleepState({
        sleepAnxiety: 0.1,
        preSleepArousal: 0.1,
        sleepSelfEfficacy: 0.9,
      });
      const highStress = createTestSleepState({
        sleepAnxiety: 0.9,
        preSleepArousal: 0.9,
        sleepSelfEfficacy: 0.2,
      });

      const lowScore = engine.assess(lowStress).scores.stress;
      const highScore = engine.assess(highStress).scores.stress;

      expect(lowScore).toBeGreaterThan(highScore);
    });
  });

  describe('generateRecommendations()', () => {
    it('should generate recommendations for top issues', () => {
      const assessment: ISleepHygieneAssessment = {
        userId: 'test',
        date: '2025-01-01',
        scores: {
          caffeine: 0.3,
          alcohol: 0.9,
          nicotine: 0.9,
          exercise: 0.8,
          diet: 0.7,
          environment: 0.9,
          screen_time: 0.4,
          routine: 0.8,
          stress: 0.7,
        },
        overallScore: 0.7,
        topIssues: ['caffeine', 'screen_time'],
        recommendations: [],
      };

      const recommendations = engine.generateRecommendations(assessment);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize high-severity issues', () => {
      const assessment: ISleepHygieneAssessment = {
        userId: 'test',
        date: '2025-01-01',
        scores: {
          caffeine: 0.2, // High priority (< 0.4)
          alcohol: 0.5,  // Medium priority
          nicotine: 0.9,
          exercise: 0.8,
          diet: 0.7,
          environment: 0.9,
          screen_time: 0.5,
          routine: 0.8,
          stress: 0.7,
        },
        overallScore: 0.65,
        topIssues: ['caffeine', 'alcohol', 'screen_time'],
        recommendations: [],
      };

      const recommendations = engine.generateRecommendations(assessment);

      // High priority issues should get 2 recommendations
      const caffeineRecs = recommendations.filter(r => r.category === 'caffeine');
      expect(caffeineRecs.length).toBe(2);
    });

    it('should not repeat previous recommendations', () => {
      const assessment: ISleepHygieneAssessment = {
        userId: 'test',
        date: '2025-01-01',
        scores: {
          caffeine: 0.3,
          alcohol: 0.9,
          nicotine: 0.9,
          exercise: 0.8,
          diet: 0.7,
          environment: 0.9,
          screen_time: 0.4,
          routine: 0.8,
          stress: 0.7,
        },
        overallScore: 0.7,
        topIssues: ['caffeine', 'screen_time'],
        recommendations: [],
      };

      const firstRecs = engine.generateRecommendations(assessment);
      const secondRecs = engine.generateRecommendations(assessment, firstRecs);

      // Second batch should not include first batch IDs
      const firstIds = new Set(firstRecs.map(r => r.id));
      const overlap = secondRecs.filter(r => firstIds.has(r.id));

      expect(overlap.length).toBe(0);
    });
  });

  describe('getEducationalContent()', () => {
    const categories: SleepHygieneCategory[] = [
      'caffeine', 'alcohol', 'nicotine', 'exercise',
      'diet', 'environment', 'screen_time', 'routine', 'stress'
    ];

    it.each(categories)('should return content for %s category', (category) => {
      const content = engine.getEducationalContent(category);

      expect(content).toHaveProperty('title');
      expect(content).toHaveProperty('content');
      expect(content).toHaveProperty('tips');
      expect(content).toHaveProperty('myths');

      expect(content.title.length).toBeGreaterThan(0);
      expect(content.tips.length).toBeGreaterThan(0);
    });

    it('should return Russian-language content', () => {
      const content = engine.getEducationalContent('caffeine');

      const hasCyrillic = /[а-яёА-ЯЁ]/.test(content.title);
      expect(hasCyrillic).toBe(true);
    });
  });

  describe('trackImprovement()', () => {
    it('should return empty for insufficient history', () => {
      const result = engine.trackImprovement([]);

      expect(result.improved).toEqual([]);
      expect(result.declined).toEqual([]);
    });

    it('should detect improved categories', () => {
      const history: ISleepHygieneAssessment[] = [
        {
          userId: 'test',
          date: '2025-01-01',
          scores: {
            caffeine: 0.3,
            alcohol: 0.5,
            nicotine: 0.8,
            exercise: 0.5,
            diet: 0.7,
            environment: 0.8,
            screen_time: 0.4,
            routine: 0.6,
            stress: 0.5,
          },
          overallScore: 0.55,
          topIssues: ['caffeine', 'screen_time'],
          recommendations: [],
        },
        {
          userId: 'test',
          date: '2025-01-08',
          scores: {
            caffeine: 0.7, // Improved by 0.4
            alcohol: 0.5,
            nicotine: 0.8,
            exercise: 0.5,
            diet: 0.7,
            environment: 0.8,
            screen_time: 0.7, // Improved by 0.3
            routine: 0.6,
            stress: 0.5,
          },
          overallScore: 0.65,
          topIssues: [],
          recommendations: [],
        },
      ];

      const result = engine.trackImprovement(history);

      expect(result.improved).toContain('caffeine');
      expect(result.improved).toContain('screen_time');
    });

    it('should detect declined categories', () => {
      const history: ISleepHygieneAssessment[] = [
        {
          userId: 'test',
          date: '2025-01-01',
          scores: {
            caffeine: 0.8,
            alcohol: 0.8,
            nicotine: 0.8,
            exercise: 0.8,
            diet: 0.7,
            environment: 0.8,
            screen_time: 0.8,
            routine: 0.8,
            stress: 0.8,
          },
          overallScore: 0.8,
          topIssues: [],
          recommendations: [],
        },
        {
          userId: 'test',
          date: '2025-01-08',
          scores: {
            caffeine: 0.4, // Declined by 0.4
            alcohol: 0.8,
            nicotine: 0.8,
            exercise: 0.8,
            diet: 0.7,
            environment: 0.8,
            screen_time: 0.8,
            routine: 0.8,
            stress: 0.8,
          },
          overallScore: 0.75,
          topIssues: ['caffeine'],
          recommendations: [],
        },
      ];

      const result = engine.trackImprovement(history);

      expect(result.declined).toContain('caffeine');
    });
  });
});
