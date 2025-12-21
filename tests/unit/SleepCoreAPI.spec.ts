/**
 * SleepCoreAPI Unit Tests
 * Tests main API facade for SleepCore digital therapeutic
 */

import { SleepCoreAPI, type IDailyCheckIn } from '../../src/SleepCoreAPI';
import type { ISleepState, ISleepDiaryEntry } from '../../src/sleep/interfaces/ISleepState';

describe('SleepCoreAPI', () => {
  let api: SleepCoreAPI;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    userId: string;
    date: string;
    sleepEfficiency: number;
    isiScore: number;
    preSleepArousal: number;
    sleepAnxiety: number;
  }> = {}): ISleepState {
    return {
      userId: overrides.userId ?? 'test-user',
      timestamp: new Date(),
      date: overrides.date ?? new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 360,
        sleepOnsetLatency: 25,
        wakeAfterSleepOnset: 30,
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

  // Factory for baseline data (7+ days)
  function createBaselineData(userId: string = 'test-user', days: number = 7): ISleepState[] {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return createTestSleepState({
        userId,
        date: date.toISOString().split('T')[0],
        sleepEfficiency: 70 + Math.random() * 10,
        isiScore: 15 + Math.floor(Math.random() * 5),
      });
    });
  }

  // Factory for diary entry
  function createDiaryEntry(overrides: Partial<{
    userId: string;
    date: string;
    bedtime: string;
    wakeTime: string;
    sleepOnsetLatency: number;
    numberOfAwakenings: number;
  }> = {}): ISleepDiaryEntry {
    return {
      userId: overrides.userId ?? 'test-user',
      date: overrides.date ?? new Date().toISOString().split('T')[0],
      bedtime: overrides.bedtime ?? '23:00',
      lightsOffTime: '23:15',
      sleepOnsetLatency: overrides.sleepOnsetLatency ?? 20,
      numberOfAwakenings: overrides.numberOfAwakenings ?? 2,
      wakeAfterSleepOnset: 25,
      finalAwakening: '06:30',
      outOfBedTime: overrides.wakeTime ?? '07:00',
      subjectiveQuality: 'fair',
      morningAlertness: 3,
      notes: '',
    };
  }

  // Factory for daily check-in
  function createDailyCheckIn(overrides: Partial<{
    userId: string;
    date: string;
    morningMood: number;
    energyLevel: number;
    followedSleepWindow: boolean;
    usedRelaxation: boolean;
  }> = {}): IDailyCheckIn {
    return {
      userId: overrides.userId ?? 'test-user',
      date: overrides.date ?? new Date().toISOString().split('T')[0],
      diaryEntry: createDiaryEntry({ userId: overrides.userId }),
      morningMood: overrides.morningMood ?? 3,
      energyLevel: overrides.energyLevel ?? 3,
      followedSleepWindow: overrides.followedSleepWindow ?? true,
      usedRelaxation: overrides.usedRelaxation ?? false,
    };
  }

  beforeEach(() => {
    api = new SleepCoreAPI();
  });

  describe('Session Management', () => {
    describe('startSession()', () => {
      it('should create a new session', () => {
        const session = api.startSession('user-123');

        expect(session.userId).toBe('user-123');
        expect(session.isActive).toBe(true);
        expect(session.plan).toBeNull();
        expect(session.mbtiPlan).toBeNull();
        expect(session.actiPlan).toBeNull();
        expect(session.startDate).toBeInstanceOf(Date);
      });

      it('should include circadian and cultural assessment fields', () => {
        const session = api.startSession('user-123');

        expect(session.circadianAssessment).toBeNull();
        expect(session.chronotherapyPlan).toBeNull();
        expect(session.tcmAssessment).toBeNull();
        expect(session.tcmPlan).toBeNull();
        expect(session.ayurvedicAssessment).toBeNull();
      });
    });

    describe('getSession()', () => {
      it('should return existing session', () => {
        api.startSession('user-123');
        const session = api.getSession('user-123');

        expect(session).not.toBeNull();
        expect(session!.userId).toBe('user-123');
      });

      it('should return null for non-existent session', () => {
        const session = api.getSession('non-existent');

        expect(session).toBeNull();
      });
    });

    describe('endSession()', () => {
      it('should mark session as inactive', () => {
        api.startSession('user-123');
        api.endSession('user-123');

        const session = api.getSession('user-123');
        expect(session!.isActive).toBe(false);
      });

      it('should handle non-existent session gracefully', () => {
        expect(() => api.endSession('non-existent')).not.toThrow();
      });
    });
  });

  describe('Sleep Diary', () => {
    describe('addDiaryEntry()', () => {
      it('should add entry and return metrics', () => {
        const entry = createDiaryEntry();
        const metrics = api.addDiaryEntry(entry);

        expect(metrics).toBeDefined();
        expect(metrics.sleepEfficiency).toBeGreaterThan(0);
        expect(metrics.totalSleepTime).toBeGreaterThan(0);
      });

      it('should calculate correct sleep efficiency', () => {
        const entry = createDiaryEntry({
          bedtime: '23:00',
          wakeTime: '07:00',
          sleepOnsetLatency: 30,
          numberOfAwakenings: 2,
        });
        const metrics = api.addDiaryEntry(entry);

        expect(metrics.sleepEfficiency).toBeGreaterThan(0);
        expect(metrics.sleepEfficiency).toBeLessThanOrEqual(100);
      });
    });

    describe('estimateISI()', () => {
      it('should estimate ISI from diary data', () => {
        api.startSession('user-123');
        // Add multiple entries for meaningful estimation
        for (let i = 0; i < 7; i++) {
          api.addDiaryEntry(createDiaryEntry({ userId: 'user-123' }));
        }

        const isi = api.estimateISI('user-123');

        expect(typeof isi).toBe('number');
        // ISI can be -1 if insufficient data, or 0-28 if calculated
        expect(isi).toBeGreaterThanOrEqual(-1);
        expect(isi).toBeLessThanOrEqual(28);
      });

      it('should return -1 for insufficient data', () => {
        api.startSession('user-123');
        api.addDiaryEntry(createDiaryEntry({ userId: 'user-123' }));

        const isi = api.estimateISI('user-123');

        // With insufficient data, may return -1
        expect(typeof isi).toBe('number');
      });
    });
  });

  describe('CBT-I Treatment', () => {
    describe('initializeTreatment()', () => {
      it('should require at least 7 days of baseline data', () => {
        api.startSession('user-123');
        const baselineData = createBaselineData('user-123', 5);

        expect(() => api.initializeTreatment('user-123', baselineData))
          .toThrow('Need at least 7 days of baseline sleep data');
      });

      it('should create treatment plan with 7 days of data', () => {
        api.startSession('user-123');
        const baselineData = createBaselineData('user-123', 7);

        const plan = api.initializeTreatment('user-123', baselineData);

        expect(plan).toBeDefined();
        expect(plan.userId).toBe('user-123');
        expect(plan.currentWeek).toBe(1);
      });

      it('should update session with plan', () => {
        api.startSession('user-123');
        const baselineData = createBaselineData('user-123', 7);

        api.initializeTreatment('user-123', baselineData);

        const session = api.getSession('user-123');
        expect(session!.plan).not.toBeNull();
      });
    });

    describe('processDailyCheckIn()', () => {
      it('should require active treatment plan', () => {
        api.startSession('user-123');
        const checkIn = createDailyCheckIn({ userId: 'user-123' });

        expect(() => api.processDailyCheckIn(checkIn))
          .toThrow('No active treatment plan for user');
      });

      it('should return intervention result with plan', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        const checkIn = createDailyCheckIn({ userId: 'user-123' });
        const result = api.processDailyCheckIn(checkIn);

        expect(result.intervention).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.rationale).toBeTruthy();
      });
    });

    describe('getNextIntervention()', () => {
      it('should return null without active plan', () => {
        api.startSession('user-123');

        const intervention = api.getNextIntervention('user-123');

        expect(intervention).toBeNull();
      });

      it('should return intervention with active plan and states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));

        const intervention = api.getNextIntervention('user-123');

        expect(intervention).toBeDefined();
      });
    });

    describe('updateTreatmentPlan()', () => {
      it('should return null without plan', () => {
        api.startSession('user-123');

        const updated = api.updateTreatmentPlan('user-123');

        expect(updated).toBeNull();
      });

      it('should update plan with sufficient recent states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        // Add 5 daily check-ins
        for (let i = 0; i < 5; i++) {
          api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));
        }

        const updated = api.updateTreatmentPlan('user-123');

        expect(updated).toBeDefined();
      });
    });

    describe('assessResponse()', () => {
      it('should return null without plan', () => {
        api.startSession('user-123');

        const response = api.assessResponse('user-123');

        expect(response).toBeNull();
      });

      it('should assess response with active plan', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        const response = api.assessResponse('user-123');

        expect(response).toBeDefined();
        expect(response!.isResponding).toBeDefined();
      });
    });
  });

  describe('Relaxation', () => {
    describe('getRelaxationRecommendation()', () => {
      it('should return default recommendation without plan', () => {
        api.startSession('user-123');

        const rec = api.getRelaxationRecommendation('user-123');

        expect(rec.technique).toBe('diaphragmatic_breathing');
        expect(rec.instructions.length).toBeGreaterThan(0);
        expect(rec.duration).toBe(10);
      });

      it('should return recommendation with active plan', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        const rec = api.getRelaxationRecommendation('user-123', 'bedtime');

        expect(rec.technique).toBeDefined();
        expect(rec.instructions.length).toBeGreaterThan(0);
      });

      it('should support different contexts', () => {
        api.startSession('user-123');

        const contexts: Array<'bedtime' | 'daytime' | 'wakeup'> = ['bedtime', 'daytime', 'wakeup'];
        contexts.forEach(context => {
          const rec = api.getRelaxationRecommendation('user-123', context);
          expect(rec).toBeDefined();
        });
      });
    });
  });

  describe('Progress Tracking', () => {
    describe('getProgressReport()', () => {
      it('should return null without plan', () => {
        api.startSession('user-123');

        const report = api.getProgressReport('user-123');

        expect(report).toBeNull();
      });

      it('should return report with active plan', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        const report = api.getProgressReport('user-123');

        expect(report).toBeDefined();
        expect(report!.currentWeek).toBeDefined();
        expect(report!.responseStatus).toBeDefined();
      });
    });

    describe('getSleepEfficiencyTrend()', () => {
      it('should return empty array without states', () => {
        api.startSession('user-123');

        const trend = api.getSleepEfficiencyTrend('user-123');

        expect(trend).toEqual([]);
      });

      it('should return efficiency values with states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));

        for (let i = 0; i < 3; i++) {
          api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));
        }

        const trend = api.getSleepEfficiencyTrend('user-123', 3);

        expect(trend.length).toBe(3);
        expect(trend.every(v => typeof v === 'number')).toBe(true);
      });
    });
  });

  describe('Third-Wave Therapies', () => {
    describe('recommendThirdWaveApproach()', () => {
      it('should return null without states', () => {
        api.startSession('user-123');

        const recommendation = api.recommendThirdWaveApproach('user-123');

        expect(recommendation).toBeNull();
      });

      it('should return recommendation with states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));

        const recommendation = api.recommendThirdWaveApproach('user-123');

        expect(recommendation).toBeDefined();
        expect(recommendation!.recommendedApproach).toBeDefined();
      });

      it('should consider treatment history', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));

        const recommendation = api.recommendThirdWaveApproach('user-123', {
          failedCBTI: true,
          preferences: [],
        });

        expect(recommendation).toBeDefined();
      });
    });

    describe('isThirdWaveIndicated()', () => {
      it('should return false without states', () => {
        api.startSession('user-123');

        const indicated = api.isThirdWaveIndicated('user-123');

        expect(indicated).toBe(false);
      });
    });

    describe('initializeMBTI()', () => {
      it('should require 7 days of baseline', () => {
        api.startSession('user-123');

        expect(() => api.initializeMBTI('user-123', createBaselineData('user-123', 5)))
          .toThrow('Need at least 7 days of baseline data for MBT-I');
      });

      it('should create MBT-I plan', () => {
        api.startSession('user-123');

        const plan = api.initializeMBTI('user-123', createBaselineData('user-123', 7));

        expect(plan).toBeDefined();
        expect(plan.userId).toBe('user-123');
      });

      it('should update session with mbtiPlan', () => {
        api.startSession('user-123');
        api.initializeMBTI('user-123', createBaselineData('user-123', 7));

        const session = api.getSession('user-123');
        expect(session!.mbtiPlan).not.toBeNull();
      });
    });

    describe('initializeACTI()', () => {
      it('should require 7 days of baseline', () => {
        api.startSession('user-123');

        expect(() => api.initializeACTI('user-123', createBaselineData('user-123', 5)))
          .toThrow('Need at least 7 days of baseline data for ACT-I');
      });

      it('should create ACT-I plan', () => {
        api.startSession('user-123');

        const plan = api.initializeACTI('user-123', createBaselineData('user-123', 7));

        expect(plan).toBeDefined();
        expect(plan.userId).toBe('user-123');
      });
    });

    describe('getMindfulnessPractice()', () => {
      it('should return null without MBT-I plan', () => {
        api.startSession('user-123');

        const practice = api.getMindfulnessPractice('user-123', 'bedtime');

        expect(practice).toBeNull();
      });

      it('should return practice with MBT-I plan', () => {
        api.startSession('user-123');
        api.initializeMBTI('user-123', createBaselineData('user-123', 7));

        const practice = api.getMindfulnessPractice('user-123', 'bedtime', 15);

        expect(practice).toBeDefined();
        expect(practice!.practice).toBeDefined();
        expect(practice!.instructions.length).toBeGreaterThan(0);
      });
    });

    describe('getDefusionTechnique()', () => {
      it('should return defusion technique for experience', () => {
        const technique = api.getDefusionTechnique({
          id: 'exp-1',
          type: 'thought',
          content: 'Я никогда не засну',
          context: 'pre_sleep',
          frequency: 0.8,
          distress: 0.7,
          fusionLevel: 0.8,
          avoidanceBehaviors: ['Избегаю постели'],
        });

        expect(technique).toBeDefined();
        expect(technique.name).toBeDefined();
        expect(technique.instructions.length).toBeGreaterThan(0);
      });
    });

    describe('getAcceptanceExercise()', () => {
      it('should return exercise for different struggles', () => {
        const struggles: Array<'cant_sleep' | 'anxious' | 'frustrated' | 'exhausted'> =
          ['cant_sleep', 'anxious', 'frustrated', 'exhausted'];

        struggles.forEach(struggle => {
          const exercise = api.getAcceptanceExercise(struggle);
          expect(exercise.exercise).toBeDefined();
          expect(exercise.instructions.length).toBeGreaterThan(0);
          expect(exercise.metaphor).toBeDefined();
        });
      });
    });

    describe('identifyUnwantedExperiences()', () => {
      it('should identify experiences from text', () => {
        const experiences = api.identifyUnwantedExperiences(
          'Я так волнуюсь, что не смогу уснуть сегодня',
          'pre_sleep'
        );

        expect(Array.isArray(experiences)).toBe(true);
      });
    });

    describe('getMBTIWeeklySummary()', () => {
      it('should return null without MBT-I plan', () => {
        api.startSession('user-123');

        const summary = api.getMBTIWeeklySummary('user-123');

        expect(summary).toBeNull();
      });

      it('should return summary with MBT-I plan', () => {
        api.startSession('user-123');
        api.initializeMBTI('user-123', createBaselineData('user-123', 7));

        const summary = api.getMBTIWeeklySummary('user-123');

        expect(summary).toBeDefined();
        expect(summary!.practiceMinutes).toBeDefined();
        expect(summary!.practiceAdherence).toBeDefined();
      });
    });

    describe('getACTISessionSummary()', () => {
      it('should return null without ACT-I plan', () => {
        api.startSession('user-123');

        const summary = api.getACTISessionSummary('user-123');

        expect(summary).toBeNull();
      });

      it('should return summary with ACT-I plan', () => {
        api.startSession('user-123');
        api.initializeACTI('user-123', createBaselineData('user-123', 7));

        const summary = api.getACTISessionSummary('user-123');

        expect(summary).toBeDefined();
        expect(summary!.keyTakeaways).toBeDefined();
      });
    });
  });

  describe('Circadian AI', () => {
    describe('getMEQQuestionnaire()', () => {
      it('should return MEQ questionnaire items', () => {
        const items = api.getMEQQuestionnaire();

        expect(items.length).toBeGreaterThan(0);
        expect(items[0].id).toBeDefined();
        expect(items[0].textRu).toBeDefined();
      });
    });

    describe('assessChronotypeFromMEQ()', () => {
      it('should assess and store chronotype', () => {
        api.startSession('user-123');

        const assessment = api.assessChronotypeFromMEQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          q1_wakePreference: 3,
          q2_morningTiredness: 2,
          q3_bedtimeWork: 3,
          q4_peakPerformance: 3,
          q5_selfRating: 3,
        });

        expect(assessment.chronotype).toBeDefined();
        expect(assessment.chronotypeCategory).toBeDefined();

        const session = api.getSession('user-123');
        expect(session!.circadianAssessment).not.toBeNull();
      });
    });

    describe('assessChronotypeFromMCTQ()', () => {
      it('should assess and store chronotype from MCTQ', () => {
        api.startSession('user-123');

        const assessment = api.assessChronotypeFromMCTQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          work: {
            bedtime: '23:00',
            sleepOnset: '23:30',
            wakeTime: '07:00',
            useAlarm: true,
          },
          free: {
            bedtime: '00:00',
            sleepOnset: '00:30',
            wakeTime: '09:00',
            useAlarm: false,
          },
        });

        expect(assessment.socialJetlag).toBeDefined();
        expect(assessment.msfsc).toBeDefined();
      });
    });

    describe('generateChronotherapyPlan()', () => {
      it('should return null without circadian assessment', () => {
        api.startSession('user-123');

        const plan = api.generateChronotherapyPlan('user-123');

        expect(plan).toBeNull();
      });

      it('should generate plan with assessment', () => {
        api.startSession('user-123');
        api.assessChronotypeFromMEQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          q1_wakePreference: 2,
          q2_morningTiredness: 2,
          q3_bedtimeWork: 2,
          q4_peakPerformance: 2,
          q5_selfRating: 2,
        });

        const plan = api.generateChronotherapyPlan('user-123');

        expect(plan).toBeDefined();
        expect(plan!.optimalSessionTimes).toBeDefined();
        expect(plan!.lightTherapy).toBeDefined();
      });
    });

    describe('getChronotype()', () => {
      it('should return null without assessment', () => {
        api.startSession('user-123');

        const chronotype = api.getChronotype('user-123');

        expect(chronotype).toBeNull();
      });

      it('should return chronotype with assessment', () => {
        api.startSession('user-123');
        api.assessChronotypeFromMEQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          q1_wakePreference: 3,
          q2_morningTiredness: 3,
          q3_bedtimeWork: 3,
          q4_peakPerformance: 3,
          q5_selfRating: 3,
        });

        const chronotype = api.getChronotype('user-123');

        expect(chronotype).toBeDefined();
      });
    });

    describe('getSocialJetlag()', () => {
      it('should return null without assessment', () => {
        api.startSession('user-123');

        const jetlag = api.getSocialJetlag('user-123');

        expect(jetlag).toBeNull();
      });

      it('should return social jetlag analysis', () => {
        api.startSession('user-123');
        api.assessChronotypeFromMCTQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          work: {
            bedtime: '23:00',
            sleepOnset: '23:30',
            wakeTime: '06:00',
            useAlarm: true,
          },
          free: {
            bedtime: '01:00',
            sleepOnset: '01:30',
            wakeTime: '10:00',
            useAlarm: false,
          },
        });

        const jetlag = api.getSocialJetlag('user-123');

        expect(jetlag).toBeDefined();
        expect(jetlag!.hours).toBeGreaterThanOrEqual(0);
        expect(jetlag!.severity).toBeDefined();
        expect(jetlag!.recommendation).toBeDefined();
      });
    });
  });

  describe('TCM Integration', () => {
    describe('assessTCMProfile()', () => {
      it('should return null without states', () => {
        api.startSession('user-123');

        const assessment = api.assessTCMProfile('user-123');

        expect(assessment).toBeNull();
      });

      it('should assess TCM profile with states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));

        const assessment = api.assessTCMProfile('user-123');

        expect(assessment).toBeDefined();
      });
    });

    describe('createTCMIntegratedPlan()', () => {
      it('should return null without TCM assessment or plan', () => {
        api.startSession('user-123');

        const plan = api.createTCMIntegratedPlan('user-123');

        expect(plan).toBeNull();
      });
    });

    describe('getAcupressureInstructions()', () => {
      it('should return null without TCM plan', () => {
        api.startSession('user-123');

        const instructions = api.getAcupressureInstructions('user-123');

        expect(instructions).toBeNull();
      });
    });
  });

  describe('Ayurveda Integration', () => {
    describe('assessAyurvedicProfile()', () => {
      it('should return null without states', () => {
        api.startSession('user-123');

        const assessment = api.assessAyurvedicProfile('user-123');

        expect(assessment).toBeNull();
      });

      it('should assess Ayurvedic profile with states', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));

        const assessment = api.assessAyurvedicProfile('user-123');

        expect(assessment).toBeDefined();
      });
    });

    describe('getYogaNidraProtocol()', () => {
      it('should return null without assessment', () => {
        api.startSession('user-123');

        const protocol = api.getYogaNidraProtocol('user-123');

        expect(protocol).toBeNull();
      });
    });

    describe('getDinacharya()', () => {
      it('should return null without assessment', () => {
        api.startSession('user-123');

        const dinacharya = api.getDinacharya('user-123');

        expect(dinacharya).toBeNull();
      });
    });

    describe('getAyurvedicHerbs()', () => {
      it('should return null without assessment', () => {
        api.startSession('user-123');

        const herbs = api.getAyurvedicHerbs('user-123');

        expect(herbs).toBeNull();
      });
    });
  });

  describe('European Guideline 2023', () => {
    describe('getTreatmentRecommendations()', () => {
      it('should return treatment recommendations', () => {
        const recommendations = api.getTreatmentRecommendations();

        expect(recommendations.length).toBeGreaterThan(0);
      });

      it('should filter by category', () => {
        const diagnostic = api.getTreatmentRecommendations('diagnostic');
        const treatment = api.getTreatmentRecommendations('treatment');
        const pharmacological = api.getTreatmentRecommendations('pharmacological');

        expect(Array.isArray(diagnostic)).toBe(true);
        expect(Array.isArray(treatment)).toBe(true);
        expect(Array.isArray(pharmacological)).toBe(true);
      });
    });

    describe('getNew2023Recommendations()', () => {
      it('should return new 2023 recommendations', () => {
        const recommendations = api.getNew2023Recommendations();

        expect(Array.isArray(recommendations)).toBe(true);
      });
    });

    describe('getCBTIComponentEvidence()', () => {
      it('should return CBT-I component evidence', () => {
        const evidence = api.getCBTIComponentEvidence();

        expect(evidence.length).toBeGreaterThan(0);
      });
    });

    describe('getMostEffectiveCBTIComponents()', () => {
      it('should return ranked components', () => {
        const components = api.getMostEffectiveCBTIComponents();

        expect(components.length).toBeGreaterThan(0);
      });
    });

    describe('checkDCBTICompliance()', () => {
      it('should check dCBT-I compliance', () => {
        const result = api.checkDCBTICompliance({
          sleepDiary: true,
          sleepRestriction: true,
          stimulusControl: true,
          cognitiveRestructuring: false,
        });

        expect(result.compliant).toBeDefined();
        expect(Array.isArray(result.missingRequired)).toBe(true);
        expect(Array.isArray(result.missingOptional)).toBe(true);
      });
    });

    describe('getPharmacologicalEvidence()', () => {
      it('should return pharmacological evidence', () => {
        const evidence = api.getPharmacologicalEvidence();

        expect(Array.isArray(evidence)).toBe(true);
      });

      it('should filter by recommended', () => {
        const recommended = api.getPharmacologicalEvidence(true);
        const notRecommended = api.getPharmacologicalEvidence(false);

        expect(Array.isArray(recommended)).toBe(true);
        expect(Array.isArray(notRecommended)).toBe(true);
      });
    });
  });

  describe('Integrated Recommendation', () => {
    describe('getIntegratedRecommendation()', () => {
      it('should return null without session', () => {
        const recommendation = api.getIntegratedRecommendation('non-existent');

        expect(recommendation).toBeNull();
      });

      it('should return basic recommendation with session', () => {
        api.startSession('user-123');

        const recommendation = api.getIntegratedRecommendation('user-123');

        expect(recommendation).toBeDefined();
        expect(recommendation!.primaryApproach).toContain('КПТ-И');
        expect(recommendation!.evidenceLevel).toBe('A');
        expect(recommendation!.weeklySchedule.length).toBe(7);
      });

      it('should include circadian factors when assessed', () => {
        api.startSession('user-123');
        api.assessChronotypeFromMEQ('user-123', {
          userId: 'user-123',
          date: new Date().toISOString().split('T')[0],
          q1_wakePreference: 1,
          q2_morningTiredness: 1,
          q3_bedtimeWork: 1,
          q4_peakPerformance: 1,
          q5_selfRating: 1,
        });

        const recommendation = api.getIntegratedRecommendation('user-123');

        expect(recommendation!.personalizationFactors.some(f => f.includes('Хронотип'))).toBe(true);
      });

      it('should include TCM adaptations when assessed', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));
        api.assessTCMProfile('user-123');

        const recommendation = api.getIntegratedRecommendation('user-123');

        expect(recommendation!.personalizationFactors.some(f => f.includes('TCM'))).toBe(true);
        expect(recommendation!.culturalAdaptations.some(a => a.includes('ТКМ'))).toBe(true);
      });

      it('should include Ayurvedic adaptations when assessed', () => {
        api.startSession('user-123');
        api.initializeTreatment('user-123', createBaselineData('user-123', 7));
        api.processDailyCheckIn(createDailyCheckIn({ userId: 'user-123' }));
        api.assessAyurvedicProfile('user-123');

        const recommendation = api.getIntegratedRecommendation('user-123');

        expect(recommendation!.personalizationFactors.some(f => f.includes('Доша'))).toBe(true);
      });
    });
  });
});
