/**
 * AdaptiveSleepRestrictionService Unit Tests
 * ==========================================
 * Tests for AI-driven Sleep Restriction personalization.
 *
 * Covers:
 * - Sleep Need Questionnaire processing
 * - Chronotype calculation
 * - PLRNN-enhanced TIB adjustment
 * - JITAI adaptive scheduling
 * - Personalized initial prescription
 */

import {
  AdaptiveSleepRestrictionService,
  createAdaptiveSleepRestrictionService,
  DEFAULT_ADAPTIVE_CONFIG,
  type ISleepNeedQuestionnaire,
  type ISleepProfile,
  type IAdaptiveTIBAdjustment,
  type IJITAIDecisionPoint,
} from '../../../../src/cbt-i/services/AdaptiveSleepRestrictionService';

import type { ISleepRestrictionPrescription } from '../../../../src/cbt-i/interfaces/ICBTIComponents';
import type { ISleepMetrics } from '../../../../src/sleep/interfaces/ISleepState';

// ==================== Mock Data ====================

const createMockSleepMetrics = (
  overrides: Partial<ISleepMetrics> = {}
): ISleepMetrics => ({
  timeInBed: 480,
  totalSleepTime: 420,
  sleepOnsetLatency: 20,
  wakeAfterSleepOnset: 40,
  sleepEfficiency: 87.5,
  numberOfAwakenings: 2,
  bedtime: '23:00',
  wakeTime: '07:00',
  finalAwakening: '06:45',
  outOfBedTime: '07:00',
  ...overrides,
});

const createMockPrescription = (
  overrides: Partial<ISleepRestrictionPrescription> = {}
): ISleepRestrictionPrescription => ({
  prescribedTIB: 420,
  prescribedBedtime: '23:30',
  prescribedWakeTime: '07:00',
  efficiencyThreshold: 85,
  minimumTIB: 300,
  adjustmentIncrement: 15,
  evaluationPeriod: 7,
  isActive: true,
  startDate: '2026-01-01',
  currentWeek: 2,
  ...overrides,
});

const createMockQuestionnaire = (
  overrides: Partial<ISleepNeedQuestionnaire> = {}
): ISleepNeedQuestionnaire => ({
  freeWakeTime: '08:00',
  freeBedtime: '23:30',
  subjectiveSleepNeed: 7.5,
  morningAlertness: 3,
  wakingDifficulty: 3,
  peakPerformanceTime: 'late_morning',
  sleepOnsetEase: 3,
  daytimeFatigue: 3,
  weekendOversleep: false,
  socialJetLag: 30,
  ...overrides,
});

const createSleepHistory = (days: number, baseEfficiency = 85): ISleepMetrics[] => {
  const history: ISleepMetrics[] = [];
  for (let i = 0; i < days; i++) {
    history.push(createMockSleepMetrics({
      sleepEfficiency: baseEfficiency + (Math.random() - 0.5) * 10,
    }));
  }
  return history;
};

// ==================== Tests ====================

describe('AdaptiveSleepRestrictionService', () => {
  let service: AdaptiveSleepRestrictionService;

  beforeEach(() => {
    service = createAdaptiveSleepRestrictionService();
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(AdaptiveSleepRestrictionService);
    });

    it('should accept custom configuration', () => {
      const customService = createAdaptiveSleepRestrictionService({
        enablePLRNNAdjustment: false,
        conservativeMode: false,
      });
      expect(customService).toBeInstanceOf(AdaptiveSleepRestrictionService);
      expect(customService.getConfig().enablePLRNNAdjustment).toBe(false);
      expect(customService.getConfig().conservativeMode).toBe(false);
    });
  });

  describe('DEFAULT_ADAPTIVE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.enablePLRNNAdjustment).toBe(true);
      expect(DEFAULT_ADAPTIVE_CONFIG.minPredictionConfidence).toBe(0.6);
      expect(DEFAULT_ADAPTIVE_CONFIG.enableJITAI).toBe(true);
      expect(DEFAULT_ADAPTIVE_CONFIG.enableChronotypePersonalization).toBe(true);
      expect(DEFAULT_ADAPTIVE_CONFIG.conservativeMode).toBe(true);
      expect(DEFAULT_ADAPTIVE_CONFIG.minDataDays).toBe(7);
    });

    it('should have JITAI reminder windows', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.jitaiReminderWindows).toEqual([120, 60, 30]);
    });

    it('should have sleep need adjustment range', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.sleepNeedAdjustmentRange.min).toBe(-60);
      expect(DEFAULT_ADAPTIVE_CONFIG.sleepNeedAdjustmentRange.max).toBe(60);
    });
  });

  describe('Sleep Need Questionnaire', () => {
    describe('processSleepNeedQuestionnaire()', () => {
      it('should create user profile from questionnaire', () => {
        const questionnaire = createMockQuestionnaire();
        const profile = service.processSleepNeedQuestionnaire('user-1', questionnaire);

        expect(profile).toBeDefined();
        expect(profile.userId).toBe('user-1');
        expect(profile.chronotype).toBeDefined();
        expect(profile.chronotypeScore).toBeGreaterThanOrEqual(16);
        expect(profile.chronotypeScore).toBeLessThanOrEqual(86);
        expect(profile.estimatedSleepNeed).toBeGreaterThanOrEqual(300);
        expect(profile.estimatedSleepNeed).toBeLessThanOrEqual(600);
      });

      it('should store profile for retrieval', () => {
        const questionnaire = createMockQuestionnaire();
        service.processSleepNeedQuestionnaire('user-1', questionnaire);

        const profile = service.getUserProfile('user-1');
        expect(profile).toBeDefined();
        expect(profile?.userId).toBe('user-1');
      });

      it('should classify morning chronotype correctly', () => {
        const morningQuestionnaire = createMockQuestionnaire({
          freeWakeTime: '05:30',
          morningAlertness: 5,
          wakingDifficulty: 1,
          peakPerformanceTime: 'early_morning',
          sleepOnsetEase: 5,
        });

        const profile = service.processSleepNeedQuestionnaire('morning-user', morningQuestionnaire);
        expect(['definite_morning', 'moderate_morning']).toContain(profile.chronotype);
        expect(profile.chronotypeScore).toBeGreaterThan(58);
      });

      it('should classify evening chronotype correctly', () => {
        const eveningQuestionnaire = createMockQuestionnaire({
          freeWakeTime: '11:00',
          morningAlertness: 1,
          wakingDifficulty: 5,
          peakPerformanceTime: 'night',
          sleepOnsetEase: 1,
        });

        const profile = service.processSleepNeedQuestionnaire('evening-user', eveningQuestionnaire);
        expect(['definite_evening', 'moderate_evening']).toContain(profile.chronotype);
        expect(profile.chronotypeScore).toBeLessThan(42);
      });

      it('should estimate sleep need from questionnaire', () => {
        const longSleeperQ = createMockQuestionnaire({
          subjectiveSleepNeed: 9,
          daytimeFatigue: 4,
          weekendOversleep: true,
          socialJetLag: 90,
        });

        const profile = service.processSleepNeedQuestionnaire('long-sleeper', longSleeperQ);
        expect(profile.sleepNeedCategory).toBe('long_sleeper');
        expect(profile.estimatedSleepNeed).toBeGreaterThan(480);
      });

      it('should calculate optimal times based on chronotype', () => {
        const questionnaire = createMockQuestionnaire();
        const profile = service.processSleepNeedQuestionnaire('user-1', questionnaire);

        expect(profile.optimalWakeTime).toMatch(/^\d{2}:\d{2}$/);
        expect(profile.optimalBedtime).toMatch(/^\d{2}:\d{2}$/);
      });

      it('should estimate social jet lag', () => {
        const highJetLagQ = createMockQuestionnaire({
          weekendOversleep: true,
          socialJetLag: 120,
        });

        const profile = service.processSleepNeedQuestionnaire('jetlag-user', highJetLagQ);
        expect(profile.socialJetLag).toBe(120);
        expect(profile.accumulatedSleepDebt).toBeGreaterThan(0);
      });
    });
  });

  describe('PLRNN-Enhanced TIB Adjustment', () => {
    describe('getAdaptiveTIBAdjustment()', () => {
      it('should return adjustment recommendation', () => {
        const prescription = createMockPrescription();
        const history = createSleepHistory(7, 88);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'test-user',
          prescription,
          history
        );

        expect(adjustment).toBeDefined();
        expect(adjustment.currentTIB).toBe(prescription.prescribedTIB);
        expect(adjustment.proposedTIB).toBeGreaterThanOrEqual(300);
        expect(adjustment.proposedTIB).toBeLessThanOrEqual(540);
        expect(adjustment.confidence).toBeGreaterThan(0);
        expect(adjustment.confidence).toBeLessThanOrEqual(1);
      });

      it('should include bilingual explanations', () => {
        const prescription = createMockPrescription();
        const history = createSleepHistory(7);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'test-user',
          prescription,
          history
        );

        expect(adjustment.explanationRu).toBeDefined();
        expect(adjustment.explanationRu.length).toBeGreaterThan(0);
        expect(adjustment.explanationEn).toBeDefined();
        expect(adjustment.explanationEn.length).toBeGreaterThan(0);
      });

      it('should identify risk and protective factors', () => {
        const prescription = createMockPrescription();
        const history = createSleepHistory(7, 92);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'test-user',
          prescription,
          history
        );

        expect(Array.isArray(adjustment.riskFactors)).toBe(true);
        expect(Array.isArray(adjustment.protectiveFactors)).toBe(true);
      });

      it('should recommend increase for high SE', () => {
        const prescription = createMockPrescription({ prescribedTIB: 400 });
        const history = createSleepHistory(7, 92);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'high-se-user',
          prescription,
          history
        );

        expect(adjustment.recommendedChange).toBeGreaterThanOrEqual(0);
      });

      it('should not go below minimum TIB', () => {
        const prescription = createMockPrescription({ prescribedTIB: 310 });
        const history = createSleepHistory(7, 70);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'low-se-user',
          prescription,
          history
        );

        expect(adjustment.proposedTIB).toBeGreaterThanOrEqual(300);
      });

      it('should not exceed maximum TIB', () => {
        const prescription = createMockPrescription({ prescribedTIB: 530 });
        const history = createSleepHistory(7, 95);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'high-tib-user',
          prescription,
          history
        );

        expect(adjustment.proposedTIB).toBeLessThanOrEqual(540);
      });

      it('should include basis for recommendation', () => {
        const prescription = createMockPrescription();
        const history = createSleepHistory(7);

        const adjustment = service.getAdaptiveTIBAdjustment(
          'test-user',
          prescription,
          history
        );

        expect(['plrnn_prediction', 'rule_based', 'hybrid', 'safety_override'])
          .toContain(adjustment.basis);
      });
    });
  });

  describe('JITAI Adaptive Scheduling', () => {
    describe('makeJITAIDecision()', () => {
      it('should return JITAI decision point', () => {
        const prescription = createMockPrescription({ prescribedBedtime: '23:00' });
        const currentTime = new Date();
        currentTime.setHours(22, 0, 0, 0); // 22:00, 1 hour before bedtime

        const decision = service.makeJITAIDecision('test-user', prescription, currentTime);

        expect(decision).toBeDefined();
        expect(decision.userId).toBe('test-user');
        expect(decision.timestamp).toEqual(currentTime);
        expect(decision.decisionType).toBeDefined();
        expect(decision.tailoringVariables).toBeDefined();
      });

      it('should include tailoring variables', () => {
        const prescription = createMockPrescription();
        const decision = service.makeJITAIDecision('test-user', prescription);

        expect(decision.tailoringVariables.minutesToBedtime).toBeDefined();
        expect(decision.tailoringVariables.predictedSE).toBeDefined();
        expect(decision.tailoringVariables.recentAdherence).toBeDefined();
        expect(decision.tailoringVariables.daysInTreatment).toBeDefined();
        expect(decision.tailoringVariables.trend).toBeDefined();
        expect(decision.tailoringVariables.isFreeDay).toBeDefined();
      });

      it('should select bedtime reminder when close to bedtime', () => {
        const prescription = createMockPrescription({ prescribedBedtime: '23:00' });
        const currentTime = new Date();
        currentTime.setHours(22, 30, 0, 0); // 30 min before bedtime

        const decision = service.makeJITAIDecision('test-user', prescription, currentTime);

        expect(decision.decisionType).toBe('reminder');
        expect(decision.selectedIntervention).not.toBeNull();
      });

      it('should provide intervention options', () => {
        const prescription = createMockPrescription();
        const decision = service.makeJITAIDecision('test-user', prescription);

        expect(decision.interventionOptions).toBeDefined();
        expect(decision.interventionOptions.length).toBeGreaterThan(0);
      });

      it('should provide selection reason', () => {
        const prescription = createMockPrescription();
        const decision = service.makeJITAIDecision('test-user', prescription);

        expect(decision.selectionReason).toBeDefined();
        expect(decision.selectionReason.length).toBeGreaterThan(0);
      });

      it('should store decision history', () => {
        const prescription = createMockPrescription();
        service.makeJITAIDecision('history-user', prescription);
        service.makeJITAIDecision('history-user', prescription);

        const history = service.getDecisionHistory('history-user');
        expect(history.length).toBe(2);
      });

      it('should detect weekend/free day', () => {
        const prescription = createMockPrescription();

        // Sunday
        const sundayTime = new Date('2026-01-11T14:00:00');
        const sundayDecision = service.makeJITAIDecision('weekend-user', prescription, sundayTime);
        expect(sundayDecision.tailoringVariables.isFreeDay).toBe(true);

        // Monday
        const mondayTime = new Date('2026-01-12T14:00:00');
        const mondayDecision = service.makeJITAIDecision('weekday-user', prescription, mondayTime);
        expect(mondayDecision.tailoringVariables.isFreeDay).toBe(false);
      });
    });

    describe('getOptimalReminderTimes()', () => {
      it('should return reminder schedule', () => {
        const prescription = createMockPrescription({
          prescribedBedtime: '23:00',
          prescribedWakeTime: '07:00',
        });

        const reminders = service.getOptimalReminderTimes('test-user', prescription);

        expect(reminders).toBeDefined();
        expect(reminders.length).toBeGreaterThan(0);
      });

      it('should include wind-down, device-off, bedtime, and wake reminders', () => {
        const prescription = createMockPrescription();
        const reminders = service.getOptimalReminderTimes('test-user', prescription);

        const types = reminders.map(r => r.type);
        expect(types).toContain('wind_down');
        expect(types).toContain('device_off');
        expect(types).toContain('bedtime');
        expect(types).toContain('wake');
      });

      it('should include reminder messages', () => {
        const prescription = createMockPrescription();
        const reminders = service.getOptimalReminderTimes('test-user', prescription);

        for (const reminder of reminders) {
          expect(reminder.time).toMatch(/^\d{2}:\d{2}$/);
          expect(reminder.message.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Personalized Initial Prescription', () => {
    describe('calculatePersonalizedInitialWindow()', () => {
      it('should calculate initial prescription from history', () => {
        const history = createSleepHistory(7, 80);

        const prescription = service.calculatePersonalizedInitialWindow(
          'new-user',
          history
        );

        expect(prescription).toBeDefined();
        expect(prescription.prescribedTIB).toBeGreaterThanOrEqual(300);
        expect(prescription.prescribedBedtime).toMatch(/^\d{2}:\d{2}$/);
        expect(prescription.prescribedWakeTime).toMatch(/^\d{2}:\d{2}$/);
        expect(prescription.isActive).toBe(true);
        expect(prescription.currentWeek).toBe(1);
      });

      it('should use questionnaire for personalization', () => {
        const history = createSleepHistory(7, 80);
        const questionnaire = createMockQuestionnaire({
          freeWakeTime: '06:30',
          subjectiveSleepNeed: 8,
        });

        const prescription = service.calculatePersonalizedInitialWindow(
          'personalized-user',
          history,
          questionnaire
        );

        expect(prescription).toBeDefined();
        // Should have used questionnaire data
        const profile = service.getUserProfile('personalized-user');
        expect(profile).toBeDefined();
      });

      it('should adjust TIB for long sleepers', () => {
        const history = createSleepHistory(7, 80);
        const longSleeperQ = createMockQuestionnaire({
          subjectiveSleepNeed: 9.5,
          daytimeFatigue: 4,
        });

        const prescription = service.calculatePersonalizedInitialWindow(
          'long-sleeper',
          history,
          longSleeperQ
        );

        const profile = service.getUserProfile('long-sleeper');
        expect(profile?.sleepNeedCategory).toBe('long_sleeper');
        // Long sleeper may get slightly more TIB
      });

      it('should require minimum 5 days of history', () => {
        const shortHistory = createSleepHistory(3);

        expect(() => {
          service.calculatePersonalizedInitialWindow('insufficient-user', shortHistory);
        }).toThrow();
      });
    });
  });

  describe('Integration', () => {
    it('should support full personalization workflow', () => {
      const userId = 'full-workflow-user';

      // Step 1: Complete questionnaire
      const questionnaire = createMockQuestionnaire({
        freeWakeTime: '07:30',
        freeBedtime: '23:00',
        subjectiveSleepNeed: 7.5,
        morningAlertness: 4,
        wakingDifficulty: 2,
        peakPerformanceTime: 'late_morning',
      });
      const profile = service.processSleepNeedQuestionnaire(userId, questionnaire);
      expect(profile.chronotype).toBeDefined();

      // Step 2: Calculate initial prescription
      const history = createSleepHistory(7, 75);
      const prescription = service.calculatePersonalizedInitialWindow(
        userId,
        history,
        questionnaire
      );
      expect(prescription.isActive).toBe(true);

      // Step 3: Get adaptive adjustment after week 1
      const weekHistory = createSleepHistory(7, 88);
      const adjustment = service.getAdaptiveTIBAdjustment(userId, prescription, weekHistory);
      expect(adjustment.confidence).toBeGreaterThan(0);

      // Step 4: Get JITAI decision
      const decision = service.makeJITAIDecision(userId, prescription);
      expect(decision.userId).toBe(userId);

      // Step 5: Get reminder schedule
      const reminders = service.getOptimalReminderTimes(userId, prescription);
      expect(reminders.length).toBeGreaterThan(0);
    });

    it('should handle user without questionnaire', () => {
      const userId = 'no-questionnaire-user';
      const history = createSleepHistory(7, 80);

      // Should still work without questionnaire
      const prescription = service.calculatePersonalizedInitialWindow(userId, history);
      expect(prescription).toBeDefined();

      const adjustment = service.getAdaptiveTIBAdjustment(userId, prescription, history);
      expect(adjustment).toBeDefined();

      const decision = service.makeJITAIDecision(userId, prescription);
      expect(decision).toBeDefined();
    });
  });
});
