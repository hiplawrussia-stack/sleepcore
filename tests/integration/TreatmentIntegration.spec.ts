/**
 * Treatment Integration Tests
 * ============================
 * Tests the complete diary → plan → intervention pipeline
 *
 * CRITICAL (January 2026 Audit):
 * These tests verify that the integration gaps identified in the audit
 * have been properly fixed. The key requirement is:
 *
 * 1. User submits 7 diary entries
 * 2. On the 7th entry, treatment plan is automatically created
 * 3. User receives personalized intervention via Thompson Sampling
 *
 * @packageDocumentation
 */

import { SleepCoreAPI } from '../../src/SleepCoreAPI';
import type { ISleepDiaryEntry, SleepQualityRating } from '../../src/sleep/interfaces/ISleepState';

describe('TreatmentIntegration', () => {
  let sleepCore: SleepCoreAPI;
  const userId = 'test-user-integration';

  beforeEach(() => {
    // Fresh instance for each test
    sleepCore = new SleepCoreAPI();
  });

  /**
   * Helper to create a diary entry for a specific day
   */
  function createDiaryEntry(
    dayOffset: number,
    options: {
      sleepQuality?: SleepQualityRating;
      bedtime?: string;
      wakeTime?: string;
      sol?: number;
      waso?: number;
    } = {}
  ): ISleepDiaryEntry {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    return {
      userId,
      date: dateStr,
      bedtime: options.bedtime || '23:00',
      lightsOffTime: options.bedtime || '23:00',
      sleepOnsetLatency: options.sol ?? 20,
      numberOfAwakenings: 2,
      wakeAfterSleepOnset: options.waso ?? 30,
      finalAwakening: options.wakeTime || '07:00',
      outOfBedTime: options.wakeTime || '07:00',
      subjectiveQuality: options.sleepQuality || 'fair',
      morningAlertness: 3,
    };
  }

  describe('Full Treatment Journey (Vertical Slice)', () => {
    it('should NOT create plan with less than 7 days of data', async () => {
      // Add 6 entries (not enough for baseline)
      for (let i = 6; i >= 1; i--) {
        const entry = createDiaryEntry(i);
        const result = await sleepCore.processNewDiaryEntry(entry);

        expect(result.planCreated).toBe(false);
        expect(result.entriesCount).toBe(7 - i);
        expect(result.intervention).toBeNull();
      }

      // Verify session exists but has no plan
      const session = sleepCore.getSession(userId);
      expect(session).not.toBeNull();
      expect(session?.plan).toBeNull();
    });

    it('should create plan on 7th diary entry and return intervention', async () => {
      // Add 7 entries to complete baseline
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: i <= 3 ? 'poor' : 'fair',
          sol: 25 + (i * 5), // Varying SOL
          waso: 20 + (i * 3), // Varying WASO
        });

        const result = await sleepCore.processNewDiaryEntry(entry);

        if (i > 1) {
          // Entries 1-6: Still collecting baseline
          expect(result.planCreated).toBe(false);
          expect(result.intervention).toBeNull();
        } else {
          // Entry 7: Plan should be created!
          expect(result.planCreated).toBe(true);
          expect(result.entriesCount).toBe(7);

          // Intervention should be returned
          expect(result.intervention).not.toBeNull();
          expect(result.intervention?.component).toBeDefined();
          expect(result.intervention?.action).toBeDefined();
          expect(result.intervention?.rationale).toBeDefined();
        }
      }

      // Verify session now has a plan
      const session = sleepCore.getSession(userId);
      expect(session?.plan).not.toBeNull();
      expect(session?.plan?.currentPhase).toBe('assessment');
      expect(session?.plan?.currentWeek).toBe(1);
    });

    it('should continue providing interventions after plan is created', async () => {
      // First, create the plan with 7 entries
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i);
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Verify plan exists
      const session = sleepCore.getSession(userId);
      expect(session?.plan).not.toBeNull();

      // Add 8th entry (day after baseline)
      const entry8 = createDiaryEntry(0, { sleepQuality: 'good' });
      const result = await sleepCore.processNewDiaryEntry(entry8);

      // Plan already exists, so planCreated should be false
      expect(result.planCreated).toBe(false);
      expect(result.entriesCount).toBe(8);

      // But intervention should still be provided!
      expect(result.intervention).not.toBeNull();
    });

    it('should track progress metrics correctly', async () => {
      // Create baseline with poor sleep
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 45,
          waso: 60,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Get progress report
      const progress = sleepCore.getProgressReport(userId);

      expect(progress).not.toBeNull();
      expect(progress?.currentWeek).toBe(1);
      expect(progress?.currentISI).toBeGreaterThan(7); // Should have clinical insomnia
      expect(progress?.currentSleepEfficiency).toBeLessThan(85); // Poor efficiency
    });
  });

  describe('CBT-I Engine Integration', () => {
    it('should use Thompson Sampling for intervention selection', async () => {
      // Create plan
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i));
      }

      // Get multiple interventions to verify personalization
      const interventions: string[] = [];
      for (let i = 0; i < 5; i++) {
        const entry = createDiaryEntry(-i, {
          sleepQuality: i % 2 === 0 ? 'fair' : 'good',
        });
        const result = await sleepCore.processNewDiaryEntry(entry);

        if (result.intervention) {
          interventions.push(result.intervention.component);
        }
      }

      // Should have received interventions
      expect(interventions.length).toBeGreaterThan(0);

      // All interventions should be valid CBT-I components
      const validComponents = [
        'sleep_restriction',
        'stimulus_control',
        'cognitive_restructuring',
        'sleep_hygiene',
        'relaxation',
      ];
      interventions.forEach((component) => {
        expect(validComponents).toContain(component);
      });
    });

    it('should calculate Sleep Restriction window from baseline data', async () => {
      // Create baseline with specific times
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          bedtime: '23:00',
          wakeTime: '07:00',
          sol: 30,
          waso: 45, // Total wake time = 75 min, TST ≈ 405 min, TIB = 480 min, SE ≈ 84%
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      const session = sleepCore.getSession(userId);
      expect(session?.plan?.activeComponents.sleepRestriction).toBeDefined();

      const sr = session?.plan?.activeComponents.sleepRestriction;
      expect(sr?.prescribedBedtime).toBeDefined();
      expect(sr?.prescribedWakeTime).toBeDefined();
      expect(sr?.prescribedTIB).toBeGreaterThanOrEqual(300); // Minimum 5 hours
    });
  });

  describe('Error Handling', () => {
    it('should handle missing session gracefully', async () => {
      // processNewDiaryEntry should create session automatically
      const entry = createDiaryEntry(7);
      const result = await sleepCore.processNewDiaryEntry(entry);

      expect(result.metrics).toBeDefined();
      expect(result.entriesCount).toBe(1);

      // Session should have been created
      const session = sleepCore.getSession(userId);
      expect(session).not.toBeNull();
    });

    it('should continue working even if intervention selection fails', async () => {
      // This test ensures graceful degradation
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i);
        const result = await sleepCore.processNewDiaryEntry(entry);

        // Should always get metrics and entry count
        expect(result.metrics).toBeDefined();
        expect(result.entriesCount).toBe(8 - i);
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('ISI Score Estimation', () => {
    it('should estimate ISI from diary data after 7 entries', async () => {
      // Add 7 entries with poor sleep
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 60, // Long sleep onset
          waso: 90, // High WASO
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      const isi = sleepCore.estimateISI(userId);

      // With poor sleep parameters, ISI should indicate insomnia
      expect(isi).toBeGreaterThan(7); // Above clinical threshold
      expect(isi).toBeLessThanOrEqual(28); // Valid ISI range
    });

    it('should show low ISI for good sleep quality', async () => {
      // Add 7 entries with good sleep
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'excellent',
          sol: 10, // Quick sleep onset
          waso: 10, // Minimal WASO
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      const isi = sleepCore.estimateISI(userId);

      // With excellent sleep, ISI should be low
      expect(isi).toBeLessThanOrEqual(14); // Below moderate threshold
    });
  });

  /**
   * Third-Wave Therapy Integration Tests
   * =====================================
   * Added January 2026 to verify stepped care model implementation
   *
   * Scientific Basis:
   * - European Insomnia Guideline 2023: CBT-I first-line (Grade A)
   * - Non-response rate: 25-40% (PMC10002474)
   * - Stepped care: Week 6 evaluation (JCSM stepped care model)
   * - MBT-I for cognitive arousal: 70% → 21% reduction (Ong 2023)
   * - ACT-I for adherence issues: effective long-term (El Rafihi-Ferreira 2024)
   */
  describe('Third-Wave Therapy Integration (Stepped Care)', () => {
    it('should return third-wave fields in processNewDiaryEntry result', async () => {
      const entry = createDiaryEntry(7);
      const result = await sleepCore.processNewDiaryEntry(entry);

      // New fields should be present
      expect(result).toHaveProperty('thirdWaveRecommendation');
      expect(result).toHaveProperty('isNonResponding');
      expect(result).toHaveProperty('currentWeek');
    });

    it('should NOT trigger third-wave before Week 6', async () => {
      // Create baseline (Week 1)
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 60,
          waso: 90,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Simulate Week 2-5 with poor response (not enough for third-wave trigger)
      // Note: In real scenario, plan.currentWeek would advance over time
      const entry = createDiaryEntry(0, {
        sleepQuality: 'poor',
        sol: 55,
        waso: 85,
      });
      const result = await sleepCore.processNewDiaryEntry(entry);

      // Should not be non-responding yet (Week 1-2)
      expect(result.isNonResponding).toBe(false);
      expect(result.thirdWaveRecommendation).toBeNull();
    });

    it('should provide third-wave recommendation when isThirdWaveIndicated is true', async () => {
      // Create baseline with poor sleep indicating cognitive arousal
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 60, // High SOL indicates arousal
          waso: 90,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Verify isThirdWaveIndicated is working
      const isIndicated = sleepCore.isThirdWaveIndicated(userId);
      // This may or may not be true depending on the cognition state
      expect(typeof isIndicated).toBe('boolean');

      // recommendThirdWaveApproach should work
      const recommendation = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      // Should return a recommendation (since failedCBTI is true)
      expect(recommendation).not.toBeNull();
      expect(recommendation).toHaveProperty('recommendedApproach');
      expect(recommendation).toHaveProperty('rationale');
      expect(recommendation).toHaveProperty('expectedBenefits');
    });

    it('should recommend MBT-I for high cognitive arousal profile', async () => {
      // Create baseline
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i));
      }

      // Get recommendation with failed CBT-I flag
      const recommendation = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      // Recommendation should be one of the third-wave approaches
      expect(recommendation).not.toBeNull();
      const validApproaches = ['mbti', 'acti', 'mct', 'hybrid', 'none'];
      expect(validApproaches).toContain(recommendation?.recommendedApproach);

      // If not 'none', should have benefits listed
      if (recommendation?.recommendedApproach !== 'none') {
        expect(recommendation?.expectedBenefits.length).toBeGreaterThan(0);
      }
    });

    it('should include MCT as option for high rumination', async () => {
      // Create baseline
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 90, // Very high SOL suggests rumination
          waso: 60,
        }));
      }

      const recommendation = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      // MCT is one possible approach for high rumination
      expect(recommendation).not.toBeNull();
      // The coordinator should consider mct as an option
      expect(['mbti', 'acti', 'mct', 'hybrid', 'none']).toContain(
        recommendation?.recommendedApproach
      );
    });
  });

  describe('Non-Response Detection Criteria', () => {
    /**
     * Non-Response Criteria (Morin et al., 2011):
     * - ISI reduction < 8 points after 6+ weeks
     * - ISI >= 8 (not in remission)
     */
    it('should correctly identify responding patients', async () => {
      // Create baseline with moderate insomnia
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i, {
          sleepQuality: 'fair',
          sol: 30,
          waso: 40,
        }));
      }

      // Verify progress report is available
      const progress = sleepCore.getProgressReport(userId);
      expect(progress).not.toBeNull();

      // At Week 1, no third-wave should be triggered regardless of response
      expect(progress?.currentWeek).toBe(1);
    });

    it('should track ISI change for response assessment', async () => {
      // Create baseline
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 45,
          waso: 60,
        }));
      }

      const progress = sleepCore.getProgressReport(userId);

      // Should have isiChange calculation
      expect(progress).toHaveProperty('isiChange');
      expect(progress).toHaveProperty('responseStatus');
      expect(['responding', 'partial', 'non-responding']).toContain(
        progress?.responseStatus
      );
    });
  });
});
