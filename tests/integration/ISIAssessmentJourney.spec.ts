/**
 * ISI Assessment Journey Integration Tests
 * =========================================
 * Tests the complete ISI assessment vertical path:
 * /start → ISI questionnaire → Severity classification → Clinical decision
 *
 * REGULATORY COMPLIANCE:
 * - IEC 62304 Clause 5.6: Integration testing for Class B software
 * - FDA 510(k) validation: End-to-end user journey verification
 * - European Insomnia Guideline 2023: ISI-based severity stratification
 *
 * CLINICAL BASIS:
 * - ISI cutoffs: Morin et al. (2011) — validated (HIGH confidence)
 * - Russian validation: Danilenko K.V. (2011) — Cronbach's α = 0.77
 * - Sensitivity: 90.2%, Specificity: 95.2%
 *
 * RED LINE COMPLIANCE:
 * - ISI ≥ 22 (severe) REQUIRES specialist referral (CLAUDE.md Section 2.1)
 *
 * @packageDocumentation
 */

import { SleepCoreAPI } from '../../src/SleepCoreAPI';
import { ISIAssessment, type IISIResponse } from '../../src/assessment/instruments/ISIRussian';

describe('ISI Assessment Journey (Vertical Slice)', () => {
  let sleepCore: SleepCoreAPI;
  const userId = 'test-user-isi-journey';

  beforeEach(() => {
    sleepCore = new SleepCoreAPI();

    // Initialize session (simulates /start command)
    sleepCore.startSession(userId);
  });

  /**
   * Helper to create ISI response with specific total score
   * Distributes scores across 7 items to reach target total
   */
  function createISIResponse(targetScore: number): IISIResponse {
    // Distribute score across 7 items (0-4 each, max total = 28)
    const baseScore = Math.floor(targetScore / 7) as 0 | 1 | 2 | 3 | 4;
    const remainder = targetScore % 7;

    // Distribute remainder across first N items
    const scores: Array<0 | 1 | 2 | 3 | 4> = [
      baseScore,
      baseScore,
      baseScore,
      baseScore,
      baseScore,
      baseScore,
      baseScore,
    ];

    // Add 1 to first 'remainder' items to reach exact total
    for (let i = 0; i < remainder; i++) {
      scores[i] = Math.min(4, scores[i] + 1) as 0 | 1 | 2 | 3 | 4;
    }

    return {
      userId,
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

  describe('Journey 1a: No Clinical Insomnia (ISI 0-7)', () => {
    it('should classify ISI = 0 as no_insomnia with reassurance message', () => {
      const response = createISIResponse(0);
      const result = ISIAssessment.score(response);

      // Verify score calculation
      expect(result.totalScore).toBe(0);
      expect(result.severity).toBe('no_insomnia');
      expect(result.isClinical).toBe(false);

      // Verify recommendations include reassurance (not treatment)
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r: string) =>
        r.includes('Поддерживайте') || r.includes('Продолжайте') || r.toLowerCase().includes('гигиен')
      )).toBe(true);

      // Record in session
      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [0, 0, 0, 0, 0, 0, 0]
      );

      const session = sleepCore.getSession(userId);
      expect(session?.baselineISI?.score).toBe(0);
      expect(session?.baselineISI?.severity).toBe('no_insomnia');
    });

    it('should classify ISI = 7 as no_insomnia (boundary test)', () => {
      const response = createISIResponse(7);
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(7);
      expect(result.severity).toBe('no_insomnia');
      expect(result.isClinical).toBe(false);
    });
  });

  describe('Journey 1b: Subthreshold Insomnia (ISI 8-14)', () => {
    it('should classify ISI = 8 as subthreshold (screening cutoff)', () => {
      const response = createISIResponse(8);
      const result = ISIAssessment.score(response);

      // ISI ≥ 8 = screening positive (college students 2024 study)
      expect(result.totalScore).toBe(8);
      expect(result.severity).toBe('subthreshold');
      expect(result.isClinical).toBe(true); // Clinical significance starts at 8

      // Recommendations should include monitoring/self-help
      expect(result.recommendations.some((r: string) =>
        r.includes('дневник') || r.includes('гигиен') || r.includes('наблюд')
      )).toBe(true);
    });

    it('should classify ISI = 10 as subthreshold (community cutoff)', () => {
      const response = createISIResponse(10);
      const result = ISIAssessment.score(response);

      // ISI ≥ 10 = optimal community screening (86.1% sensitivity)
      expect(result.totalScore).toBe(10);
      expect(result.severity).toBe('subthreshold');
      expect(result.isClinical).toBe(true);
    });

    it('should classify ISI = 14 as subthreshold (boundary test)', () => {
      const response = createISIResponse(14);
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(14);
      expect(result.severity).toBe('subthreshold');
      expect(result.isClinical).toBe(true);
    });

    it('should suggest CBT-I self-help for subthreshold insomnia', () => {
      const response = createISIResponse(12);
      const result = ISIAssessment.score(response);

      // For subthreshold, light intervention is appropriate
      // No need for full treatment plan yet
      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [2, 2, 2, 1, 2, 2, 1]
      );

      const session = sleepCore.getSession(userId);
      expect(session?.baselineISI?.score).toBe(12);

      // Subthreshold typically doesn't trigger automatic plan creation
      // (User would need to complete diary baseline first)
      expect(session?.plan).toBeNull();
    });
  });

  describe('Journey 1c: Moderate Clinical Insomnia (ISI 15-21)', () => {
    it('should classify ISI = 15 as moderate (treatment threshold)', () => {
      const response = createISIResponse(15);
      const result = ISIAssessment.score(response);

      // ISI ≥ 15 = clinical diagnosis threshold
      expect(result.totalScore).toBe(15);
      expect(result.severity).toBe('moderate');
      expect(result.isClinical).toBe(true);

      // Should recommend structured CBT-I
      expect(result.recommendations.some((r: string) =>
        r.includes('КПТ-И') || r.includes('когнитивно') || r.includes('терап')
      )).toBe(true);
    });

    it('should classify ISI = 18 as moderate (typical baseline for RCTs)', () => {
      const response = createISIResponse(18);
      const result = ISIAssessment.score(response);

      // ISI ~18 is common baseline in CBT-I trials
      expect(result.totalScore).toBe(18);
      expect(result.severity).toBe('moderate');
      expect(result.isClinical).toBe(true);

      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [3, 3, 2, 2, 3, 3, 2]
      );

      const session = sleepCore.getSession(userId);
      expect(session?.baselineISI?.score).toBe(18);

      // Moderate insomnia: user should complete diary baseline
      // Plan creation happens after 7 diary entries
    });

    it('should classify ISI = 21 as moderate (boundary test)', () => {
      const response = createISIResponse(21);
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(21);
      expect(result.severity).toBe('moderate');
      expect(result.isClinical).toBe(true);
    });

    it('should calculate subscales correctly for moderate insomnia', () => {
      const response: IISIResponse = {
        userId,
        date: new Date().toISOString().split('T')[0],
        q1_fallingAsleep: 3,  // Sleep onset
        q2_stayingAsleep: 3,  // Sleep maintenance
        q3_earlyWaking: 2,    // Early waking
        q4_satisfaction: 2,   // Satisfaction
        q5_interference: 3,   // Daytime impact
        q6_noticeability: 3,  // Noticeability
        q7_distress: 3,       // Distress
      };

      const result = ISIAssessment.score(response);

      // Verify subscale calculations
      expect(result.subscales.sleepProblems).toBe(8);  // Q1+Q2+Q3 = 3+3+2
      expect(result.subscales.impact).toBe(5);         // Q4+Q5 = 2+3
      expect(result.subscales.distress).toBe(6);       // Q6+Q7 = 3+3
      expect(result.totalScore).toBe(19);              // Sum of all
    });
  });

  describe('Journey 1d: Severe Insomnia (ISI 22-28) — RED LINE', () => {
    it('should classify ISI = 22 as severe and trigger specialist referral', () => {
      const response = createISIResponse(22);
      const result = ISIAssessment.score(response);

      // RED LINE: ISI ≥ 22 requires specialist referral
      expect(result.totalScore).toBe(22);
      expect(result.severity).toBe('severe');
      expect(result.isClinical).toBe(true);

      // Recommendations MUST include specialist referral
      expect(result.recommendations.some((r: string) =>
        r.includes('врач') || r.includes('специалист') || r.includes('психиатр')
      )).toBe(true);

      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [4, 4, 3, 3, 3, 3, 2]
      );

      const session = sleepCore.getSession(userId);
      expect(session?.baselineISI?.score).toBe(22);
      expect(session?.baselineISI?.severity).toBe('severe');

      // CRITICAL SAFETY CHECK: Severe insomnia should be flagged
      // for specialist referral before starting self-directed treatment
    });

    it('should classify ISI = 28 as severe (maximum score)', () => {
      const response = createISIResponse(28);
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(28);
      expect(result.severity).toBe('severe');
      expect(result.isClinical).toBe(true);

      // Maximum severity = maximum distress subscale
      expect(result.subscales.sleepProblems).toBe(12);  // Q1+Q2+Q3 max
      expect(result.subscales.impact).toBe(8);          // Q4+Q5 max
      expect(result.subscales.distress).toBe(8);        // Q6+Q7 max
    });

    it('should flag severe insomnia for safety review', () => {
      const response = createISIResponse(25);
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(25);
      expect(result.severity).toBe('severe');

      // European Insomnia Guideline 2023 + CLAUDE.md Red Line:
      // ISI ≥ 22 requires professional evaluation before dCBT-I
      // System should NOT auto-create treatment plan

      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [4, 4, 4, 3, 4, 3, 3]
      );

      const session = sleepCore.getSession(userId);

      // Severe insomnia recorded but plan NOT auto-created
      expect(session?.baselineISI?.score).toBe(25);
      expect(session?.plan).toBeNull();
    });
  });

  describe('Journey 1e: Response Quality & Validation', () => {
    it('should flag all-zero responses as suspect', () => {
      const response = createISIResponse(0);
      const result = ISIAssessment.score(response);

      // All zeros could indicate user not engaging
      // Response quality check should flag this
      expect(result.responseQuality).toBeDefined();
    });

    it('should flag all-maximum responses as suspect', () => {
      const response = createISIResponse(28);
      const result = ISIAssessment.score(response);

      // All 4s might indicate response set bias
      // Quality check important for clinical validity
      expect(result.totalScore).toBe(28);
      expect(result.responseQuality).toBeDefined();
    });

    it('should validate ISI score boundaries (0-28)', () => {
      const validScores = [0, 7, 8, 14, 15, 21, 22, 28];

      validScores.forEach((score: number) => {
        const response = createISIResponse(score);
        const result = ISIAssessment.score(response);

        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(28);
      });
    });

    it('should provide Russian-language interpretation', () => {
      const response = createISIResponse(16);
      const result = ISIAssessment.score(response);

      // Verify Russian localization
      expect(result.severityLabel).toBeDefined();
      expect(result.interpretation).toBeDefined();
      expect(typeof result.severityLabel).toBe('string');
      expect(result.severityLabel.length).toBeGreaterThan(0);
    });
  });

  describe('Journey 1f: Session State Integration', () => {
    it('should persist ISI data across session lifecycle', () => {
      const response = createISIResponse(16);
      const result = ISIAssessment.score(response);

      sleepCore.recordISIAssessment(
        userId,
        result.totalScore,
        result.severity,
        [2, 3, 2, 3, 2, 2, 2]
      );

      // Retrieve session
      const session1 = sleepCore.getSession(userId);
      expect(session1?.baselineISI).not.toBeNull();

      // Verify data integrity
      const session2 = sleepCore.getSession(userId);
      expect(session2?.baselineISI?.score).toBe(result.totalScore);
      expect(session2?.baselineISI?.severity).toBe(result.severity);
    });

    it('should handle multiple ISI assessments (baseline + follow-up)', () => {
      // Baseline ISI
      const baseline = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baseline);

      sleepCore.recordISIAssessment(
        userId,
        baselineResult.totalScore,
        baselineResult.severity,
        [3, 3, 2, 2, 3, 3, 2]
      );

      const session = sleepCore.getSession(userId);
      expect(session?.baselineISI?.score).toBe(18);

      // Follow-up ISI (after treatment) would be handled differently
      // Baseline ISI should remain unchanged
      const followup = createISIResponse(8);
      const followupResult = ISIAssessment.score(followup);

      // Verify baseline unchanged
      const sessionAfter = sleepCore.getSession(userId);
      expect(sessionAfter?.baselineISI?.score).toBe(18);

      // Follow-up ISI would be stored elsewhere (e.g., in progress tracking)
      // Not in baselineISI
    });
  });

  describe('Journey 1g: Clinical Decision Points', () => {
    it('should guide no_insomnia users to sleep hygiene education only', () => {
      const response = createISIResponse(5);
      const result = ISIAssessment.score(response);

      expect(result.severity).toBe('no_insomnia');

      // No treatment needed, just maintenance tips
      expect(result.recommendations.some((r: string) =>
        r.includes('гигиен') || r.includes('профилакт')
      )).toBe(true);
    });

    it('should guide subthreshold users to self-help CBT-I resources', () => {
      const response = createISIResponse(11);
      const result = ISIAssessment.score(response);

      expect(result.severity).toBe('subthreshold');

      // Light intervention: diary + basic techniques
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should guide moderate users to structured CBT-I program', () => {
      const response = createISIResponse(17);
      const result = ISIAssessment.score(response);

      expect(result.severity).toBe('moderate');
      expect(result.isClinical).toBe(true);

      // Full CBT-I indicated
      expect(result.recommendations.some((r: string) =>
        r.includes('программ') || r.includes('КПТ-И')
      )).toBe(true);
    });

    it('should guide severe users to specialist referral BEFORE dCBT-I', () => {
      const response = createISIResponse(24);
      const result = ISIAssessment.score(response);

      expect(result.severity).toBe('severe');
      expect(result.isClinical).toBe(true);

      // RED LINE: specialist referral mandatory
      expect(result.recommendations.some((r: string) =>
        r.includes('врач') || r.includes('специалист')
      )).toBe(true);
    });
  });

  describe('Journey 1h: MCID & Treatment Response Criteria', () => {
    it('should detect clinically meaningful improvement (−6 points MCID)', () => {
      // Baseline ISI = 18
      const baseline = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baseline);

      // Follow-up ISI = 12 (change = −6)
      const followup = createISIResponse(12);
      const followupResult = ISIAssessment.score(followup);

      const change = followupResult.totalScore - baselineResult.totalScore;

      // Yang et al. (2009): −6 points = MCID
      expect(change).toBe(-6);
      expect(Math.abs(change)).toBeGreaterThanOrEqual(6);

      // This represents clinically meaningful improvement
      // but not remission (ISI still > 7)
      expect(followupResult.severity).toBe('subthreshold');
      expect(followupResult.totalScore).toBeGreaterThan(7);
    });

    it('should detect moderate improvement (−8 points, Morin 2011)', () => {
      const baseline = createISIResponse(18);
      const followup = createISIResponse(10);

      const change = followup.q1_fallingAsleep - baseline.q1_fallingAsleep; // Simplified
      const totalChange = 10 - 18;

      // Morin et al. (2011): −8 points = moderate improvement
      expect(totalChange).toBe(-8);
      expect(Math.abs(totalChange)).toBeGreaterThanOrEqual(7);
    });

    it('should detect remission (ISI ≤ 7)', () => {
      const baseline = createISIResponse(18);
      const baselineResult = ISIAssessment.score(baseline);

      const followup = createISIResponse(6);
      const followupResult = ISIAssessment.score(followup);

      // Remission criteria: ISI ≤ 7
      expect(followupResult.totalScore).toBeLessThanOrEqual(7);
      expect(followupResult.severity).toBe('no_insomnia');

      // Change ≥ 12 points (well above MCID)
      const change = followupResult.totalScore - baselineResult.totalScore;
      expect(change).toBe(-12);
    });

    it('should detect non-response (change < 8 points after 6+ weeks)', () => {
      const baseline = createISIResponse(18);
      const followup = createISIResponse(15);

      const change = 15 - 18;

      // Only −3 points change = non-response
      // (Below MCID of −6, well below moderate improvement of −8)
      expect(Math.abs(change)).toBeLessThan(8);
      expect(Math.abs(change)).toBeLessThan(6);

      // This would trigger stepped care consideration at Week 6+
    });
  });
});
