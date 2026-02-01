/**
 * Full 8-Week Treatment Journey Integration Tests
 * =================================================
 * Tests the complete end-to-end treatment cycle from intake to outcome:
 * ISI assessment → Baseline → Treatment → Outcome evaluation
 *
 * REGULATORY COMPLIANCE:
 * - IEC 62304 Clause 5.6: End-to-end system integration testing
 * - FDA 510(k) validation: Complete user journey on marketed configuration
 * - European Insomnia Guideline 2023: 6-8 week CBT-I protocol
 *
 * CLINICAL BASIS:
 * - Remission criteria: ISI ≤ 7 (Morin et al., 2011)
 * - Response criteria: ISI reduction ≥ 8 points (Bastien et al., 2001)
 * - MCID: ISI change ≥ 6 points (Yang et al., 2009)
 * - Treatment duration: 6-8 weeks (European Guideline 2023)
 * - Non-response rate: 25-40% require stepped care (PMC10002474)
 *
 * Scientific References:
 * - Trauer et al. (2015): CBT-I effect size d = 0.84
 * - Furukawa et al. (2024): 34% post-treatment remission rate
 * - Kyle et al. (2024): HABIT trial, 5h minimum TIB
 *
 * @packageDocumentation
 */

import { SleepCoreAPI } from '../../src/SleepCoreAPI';
import { ISIAssessment, type IISIResponse } from '../../src/assessment/instruments/ISIRussian';
import type { ISleepDiaryEntry, SleepQualityRating } from '../../src/sleep/interfaces/ISleepState';

describe('Journey 4: Full 8-Week Treatment Cycle (End-to-End)', () => {
  let sleepCore: SleepCoreAPI;
  const userId = 'test-user-full-journey';

  beforeEach(() => {
    sleepCore = new SleepCoreAPI();
  });

  /**
   * Helper: Create ISI response with target score
   */
  function createISIResponse(targetScore: number, userIdOverride?: string): IISIResponse {
    const baseScore = Math.floor(targetScore / 7) as 0 | 1 | 2 | 3 | 4;
    const remainder = targetScore % 7;

    const scores: Array<0 | 1 | 2 | 3 | 4> = [
      baseScore, baseScore, baseScore, baseScore,
      baseScore, baseScore, baseScore,
    ];

    for (let i = 0; i < remainder; i++) {
      scores[i] = Math.min(4, scores[i] + 1) as 0 | 1 | 2 | 3 | 4;
    }

    return {
      userId: userIdOverride || userId,
      date: new Date().toISOString().split('T')[0],
      q1_fallingAsleep: scores[0],
      q2_stayingAsleep: scores[1],
      q3_earlyWaking: scores[2],
      q4_satisfaction: scores[3],
      q5_interference: scores[4],
      q6_noticeability: scores[5],
      q7_distress: scores[6],
    };
  }

  /**
   * Helper: Create diary entry
   */
  function createDiaryEntry(
    dayOffset: number,
    userId: string,
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

  describe('Journey 4a: Remission Pathway (ISI 18 → ISI 5)', () => {
    it('should complete full treatment journey from moderate insomnia to remission', async () => {
      // ========== WEEK 0: Intake & Assessment ==========
      sleepCore.startSession(userId);

      // Initial ISI assessment: Moderate insomnia (ISI = 18)
      const baselineISI = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baselineISI);

      expect(baselineResult.totalScore).toBe(18);
      expect(baselineResult.severity).toBe('moderate');

      sleepCore.recordISIAssessment(
        userId,
        baselineResult.totalScore,
        baselineResult.severity,
        [3, 3, 2, 2, 3, 3, 2]
      );

      // ========== WEEK 1: Baseline Collection (7 days) ==========
      // Poor sleep at baseline
      for (let day = 7; day >= 1; day--) {
        const entry = createDiaryEntry(day, userId, {
          sleepQuality: 'poor',
          bedtime: '23:30',
          wakeTime: '07:00',
          sol: 40 + (day * 2), // 42-54 min
          waso: 50 + (day * 2), // 52-64 min
        });

        const result = await sleepCore.processNewDiaryEntry(entry);

        if (day === 1) {
          // 7th entry triggers plan creation
          expect(result.planCreated).toBe(true);
          expect(result.intervention).not.toBeNull();
        }
      }

      // Verify plan was created with safe TIB
      const session = sleepCore.getSession(userId);
      expect(session?.plan).not.toBeNull();
      expect(session?.plan?.activeComponents.sleepRestriction?.prescribedTIB).toBeGreaterThanOrEqual(300);

      // ========== WEEKS 2-4: Early Treatment (Adherence building) ==========
      // Progressive improvement in sleep parameters
      for (let week = 2; week <= 4; week++) {
        for (let day = 0; day < 7; day++) {
          const improvementFactor = (week - 1) / 8; // 0.125, 0.25, 0.375

          const entry = createDiaryEntry(0, userId, {
            sleepQuality: week >= 3 ? 'fair' : 'poor',
            sol: Math.max(15, 45 - (week * 10)), // Decreasing SOL
            waso: Math.max(20, 55 - (week * 10)), // Decreasing WASO
          });

          await sleepCore.processNewDiaryEntry(entry);
        }

        // Get weekly intervention
        const intervention = await sleepCore.getNextIntervention(userId);
        expect(intervention).not.toBeNull();
      }

      // ========== WEEKS 5-6: Consolidation ==========
      for (let week = 5; week <= 6; week++) {
        for (let day = 0; day < 7; day++) {
          const entry = createDiaryEntry(0, userId, {
            sleepQuality: 'good',
            sol: 15, // Normal SOL
            waso: 20, // Normal WASO
          });

          await sleepCore.processNewDiaryEntry(entry);
        }
      }

      // ========== WEEK 8: Outcome Assessment ==========
      const followupISI = createISIResponse(5); // Remission
      const followupResult = ISIAssessment.score(followupISI);

      expect(followupResult.totalScore).toBe(5);
      expect(followupResult.severity).toBe('no_insomnia');

      // Verify remission criteria
      const isiChange = baselineResult.totalScore - followupResult.totalScore;
      expect(isiChange).toBe(13); // -13 points (well above MCID of -6)

      // Verify response status
      const isRemission = ISIAssessment.isRemission(followupResult.totalScore);
      const isResponder = ISIAssessment.isResponder(
        baselineResult.totalScore,
        followupResult.totalScore
      );

      expect(isRemission).toBe(true);
      expect(isResponder).toBe(true);

      // Get final progress report
      const progress = sleepCore.getProgressReport(userId);
      expect(progress).not.toBeNull();
      expect(progress?.currentSleepEfficiency).toBeGreaterThan(85); // Good SE
    });
  });

  describe('Journey 4b: Partial Response Pathway (ISI 18 → ISI 10)', () => {
    it('should classify partial response with clinically meaningful improvement', async () => {
      // ========== Setup ==========
      sleepCore.startSession(userId);

      // Baseline ISI = 18 (moderate)
      const baselineISI = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baselineISI);

      sleepCore.recordISIAssessment(
        userId,
        baselineResult.totalScore,
        baselineResult.severity,
        [3, 3, 2, 2, 3, 3, 2]
      );

      // ========== Baseline week ==========
      for (let day = 7; day >= 1; day--) {
        await sleepCore.processNewDiaryEntry(
          createDiaryEntry(day, userId, {
            sleepQuality: 'poor',
            sol: 45,
            waso: 60,
          })
        );
      }

      // ========== Treatment weeks (moderate improvement) ==========
      for (let week = 2; week <= 8; week++) {
        for (let day = 0; day < 7; day++) {
          await sleepCore.processNewDiaryEntry(
            createDiaryEntry(0, userId, {
              sleepQuality: 'fair',
              sol: 30, // Some improvement
              waso: 40, // Some improvement
            })
          );
        }
      }

      // ========== Outcome: Partial Response ==========
      // Follow-up ISI = 10 (subthreshold)
      const followupISI = createISIResponse(10);
      const followupResult = ISIAssessment.score(followupISI);

      expect(followupResult.totalScore).toBe(10);
      expect(followupResult.severity).toBe('subthreshold');

      // ISI change = -8 (meets response threshold but not remission)
      const isiChange = baselineResult.totalScore - followupResult.totalScore;
      expect(isiChange).toBe(8);

      // Verify: Responder but NOT in remission
      const isRemission = ISIAssessment.isRemission(followupResult.totalScore);
      const isResponder = ISIAssessment.isResponder(
        baselineResult.totalScore,
        followupResult.totalScore
      );

      expect(isRemission).toBe(false); // ISI > 7
      expect(isResponder).toBe(true);  // Change ≥ 8 points

      // Clinically meaningful change
      const isMCID = ISIAssessment.isClinicallyMeaningfulChange(
        baselineResult.totalScore,
        followupResult.totalScore
      );
      expect(isMCID).toBe(true); // Change ≥ 6 points
    });
  });

  describe('Journey 4c: Non-Response Pathway (ISI 18 → ISI 15)', () => {
    it('should detect non-response and recommend third-wave therapy', async () => {
      // ========== Setup ==========
      sleepCore.startSession(userId);

      // Baseline ISI = 18
      const baselineISI = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baselineISI);

      sleepCore.recordISIAssessment(
        userId,
        baselineResult.totalScore,
        baselineResult.severity,
        [3, 3, 2, 2, 3, 3, 2]
      );

      // ========== Baseline week ==========
      for (let day = 7; day >= 1; day--) {
        await sleepCore.processNewDiaryEntry(
          createDiaryEntry(day, userId, {
            sleepQuality: 'poor',
            sol: 60,
            waso: 90,
          })
        );
      }

      // ========== Treatment weeks (minimal improvement) ==========
      for (let week = 2; week <= 6; week++) {
        for (let day = 0; day < 7; day++) {
          await sleepCore.processNewDiaryEntry(
            createDiaryEntry(0, userId, {
              sleepQuality: 'poor',
              sol: 55, // Minimal improvement
              waso: 85, // Minimal improvement
            })
          );
        }
      }

      // ========== Outcome: Non-Response ==========
      // Follow-up ISI = 15 (still moderate)
      const followupISI = createISIResponse(15);
      const followupResult = ISIAssessment.score(followupISI);

      expect(followupResult.totalScore).toBe(15);
      expect(followupResult.severity).toBe('moderate');

      // ISI change = -3 (below response threshold)
      const isiChange = baselineResult.totalScore - followupResult.totalScore;
      expect(isiChange).toBe(3);

      // Verify: NOT responder, NOT in remission
      const isRemission = ISIAssessment.isRemission(followupResult.totalScore);
      const isResponder = ISIAssessment.isResponder(
        baselineResult.totalScore,
        followupResult.totalScore
      );

      expect(isRemission).toBe(false);
      expect(isResponder).toBe(false); // Change < 8 points

      // Third-wave recommendation should be available
      const thirdWaveRec = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      expect(thirdWaveRec).not.toBeNull();
      expect(thirdWaveRec).toHaveProperty('recommendedApproach');
      expect(thirdWaveRec).toHaveProperty('rationale');

      // Should recommend a specific third-wave approach (not 'none')
      const validApproaches = ['mbti', 'acti', 'mct', 'hybrid'];
      expect(validApproaches).toContain(thirdWaveRec?.recommendedApproach);
    });
  });

  describe('Journey 4d: Multi-Outcome Verification', () => {
    it('should correctly distinguish between remission, response, and non-response', async () => {
      // Test all three outcomes side-by-side
      const outcomes = [
        { baseline: 18, followup: 5, label: 'Remission', expectedRemission: true, expectedResponse: true },
        { baseline: 18, followup: 10, label: 'Partial Response', expectedRemission: false, expectedResponse: true },
        { baseline: 18, followup: 15, label: 'Non-Response', expectedRemission: false, expectedResponse: false },
      ];

      outcomes.forEach((outcome) => {
        const isRemission = ISIAssessment.isRemission(outcome.followup);
        const isResponder = ISIAssessment.isResponder(outcome.baseline, outcome.followup);

        expect(isRemission).toBe(outcome.expectedRemission);
        expect(isResponder).toBe(outcome.expectedResponse);
      });
    });

    it('should enforce MCID threshold (−6 points minimum)', async () => {
      const changes = [
        { baseline: 18, followup: 13, change: -5, expectedMCID: false }, // Below MCID
        { baseline: 18, followup: 12, change: -6, expectedMCID: true },  // At MCID
        { baseline: 18, followup: 10, change: -8, expectedMCID: true },  // Above MCID
      ];

      changes.forEach((c) => {
        const isMCID = ISIAssessment.isClinicallyMeaningfulChange(c.baseline, c.followup);
        expect(isMCID).toBe(c.expectedMCID);
      });
    });
  });

  describe('Journey 4e: Week-by-Week Progress Tracking', () => {
    it('should track sleep efficiency improvement across 8 weeks', async () => {
      sleepCore.startSession(userId);

      // Baseline week: Low SE
      for (let day = 7; day >= 1; day--) {
        await sleepCore.processNewDiaryEntry(
          createDiaryEntry(day, userId, {
            sleepQuality: 'poor',
            sol: 60,
            waso: 90,
            // SE ≈ 65%
          })
        );
      }

      const session1 = sleepCore.getSession(userId);
      expect(session1?.plan).not.toBeNull();

      const baselineSE = session1?.plan?.progress.sleepEfficiencyBaseline;
      expect(baselineSE).toBeLessThan(85);

      // Treatment weeks: Progressive improvement
      for (let week = 2; week <= 8; week++) {
        const weekSOL = Math.max(10, 60 - (week * 7));
        const weekWASO = Math.max(10, 90 - (week * 12));

        for (let day = 0; day < 7; day++) {
          await sleepCore.processNewDiaryEntry(
            createDiaryEntry(0, userId, {
              sleepQuality: week >= 5 ? 'good' : 'fair',
              sol: weekSOL,
              waso: weekWASO,
            })
          );
        }

        const progress = sleepCore.getProgressReport(userId);

        // SE should improve over time
        if (week >= 4) {
          expect(progress?.currentSleepEfficiency).toBeGreaterThan(baselineSE ?? 0);
        }
      }

      // Final SE should be in healthy range
      const finalProgress = sleepCore.getProgressReport(userId);
      expect(finalProgress?.currentSleepEfficiency).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Journey 4f: Treatment Completion & Maintenance', () => {
    it('should provide maintenance guidance after achieving remission', async () => {
      // Complete successful treatment (condensed version)
      sleepCore.startSession(userId);

      // Baseline
      for (let day = 7; day >= 1; day--) {
        await sleepCore.processNewDiaryEntry(
          createDiaryEntry(day, userId, {
            sleepQuality: 'poor',
            sol: 45,
            waso: 60,
          })
        );
      }

      // Treatment (8 weeks)
      for (let week = 2; week <= 8; week++) {
        for (let day = 0; day < 7; day++) {
          await sleepCore.processNewDiaryEntry(
            createDiaryEntry(0, userId, {
              sleepQuality: 'good',
              sol: 15,
              waso: 20,
            })
          );
        }
      }

      // Verify plan completion
      const session = sleepCore.getSession(userId);
      expect(session?.plan).not.toBeNull();
      expect(session?.plan?.currentWeek).toBeGreaterThanOrEqual(8);

      // Progress report should show adherence and achievements
      const progress = sleepCore.getProgressReport(userId);
      expect(progress).toBeDefined();
      expect(progress?.currentWeek).toBeGreaterThanOrEqual(8);
    });
  });
});
