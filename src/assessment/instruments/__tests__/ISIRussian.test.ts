/**
 * ISIRussian Tests - Safety-Critical Assessment Module
 * =====================================================
 *
 * IEC 62304 Class C - Clinical assessment instrument
 *
 * Tests verify:
 * - Correct ISI cutoff scores (0-7, 8-14, 15-21, 22-28)
 * - Scoring accuracy
 * - Severity classification
 * - Clinical thresholds (per CLAUDE.md requirements)
 *
 * References:
 * - Bastien, C.H. et al. (2001). Sleep Medicine, 2(4), 297-307
 * - Morin, C.M. et al. (2011). Sleep, 34(5), 601-608
 * - Russian validation: Danilenko K.V. (2011)
 */

import {
  ISIAssessment,
  ISI_CUTOFFS,
  ISI_MCID,
  ISI_REMISSION_CUTOFF,
  ISI_RESPONSE_THRESHOLD,
  ISI_ITEMS,
  ISI_RUSSIAN_PSYCHOMETRICS,
  type IISIResponse,
  type ISISeverity,
} from '../ISIRussian';

describe('ISIRussian Assessment', () => {
  // ==========================================================================
  // SAFETY-CRITICAL: ISI Cutoff Scores
  // ==========================================================================
  describe('SAFETY: ISI Cutoff Scores', () => {
    it('should have correct NO_INSOMNIA cutoff (0-7)', () => {
      expect(ISI_CUTOFFS.NO_INSOMNIA.min).toBe(0);
      expect(ISI_CUTOFFS.NO_INSOMNIA.max).toBe(7);
    });

    it('should have correct SUBTHRESHOLD cutoff (8-14)', () => {
      expect(ISI_CUTOFFS.SUBTHRESHOLD.min).toBe(8);
      expect(ISI_CUTOFFS.SUBTHRESHOLD.max).toBe(14);
    });

    it('should have correct MODERATE cutoff (15-21)', () => {
      expect(ISI_CUTOFFS.MODERATE.min).toBe(15);
      expect(ISI_CUTOFFS.MODERATE.max).toBe(21);
    });

    it('should have correct SEVERE cutoff (22-28)', () => {
      expect(ISI_CUTOFFS.SEVERE.min).toBe(22);
      expect(ISI_CUTOFFS.SEVERE.max).toBe(28);
    });

    it('should have contiguous ranges with no gaps', () => {
      expect(ISI_CUTOFFS.SUBTHRESHOLD.min).toBe(ISI_CUTOFFS.NO_INSOMNIA.max + 1);
      expect(ISI_CUTOFFS.MODERATE.min).toBe(ISI_CUTOFFS.SUBTHRESHOLD.max + 1);
      expect(ISI_CUTOFFS.SEVERE.min).toBe(ISI_CUTOFFS.MODERATE.max + 1);
    });

    it('should cover full score range (0-28)', () => {
      expect(ISI_CUTOFFS.NO_INSOMNIA.min).toBe(0);
      expect(ISI_CUTOFFS.SEVERE.max).toBe(28);
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Severity Classification
  // ==========================================================================
  describe('SAFETY: Severity Classification', () => {
    const testCases: Array<{ score: number; expected: ISISeverity }> = [
      // No insomnia (0-7)
      { score: 0, expected: 'no_insomnia' },
      { score: 4, expected: 'no_insomnia' },
      { score: 7, expected: 'no_insomnia' },
      // Subthreshold (8-14)
      { score: 8, expected: 'subthreshold' },
      { score: 11, expected: 'subthreshold' },
      { score: 14, expected: 'subthreshold' },
      // Moderate (15-21)
      { score: 15, expected: 'moderate' },
      { score: 18, expected: 'moderate' },
      { score: 21, expected: 'moderate' },
      // Severe (22-28)
      { score: 22, expected: 'severe' },
      { score: 25, expected: 'severe' },
      { score: 28, expected: 'severe' },
    ];

    testCases.forEach(({ score, expected }) => {
      it(`should classify score ${score} as ${expected}`, () => {
        const severity = ISIAssessment.getSeverity(score);
        expect(severity).toBe(expected);
      });
    });

    it('should correctly classify boundary score 7 (no_insomnia)', () => {
      expect(ISIAssessment.getSeverity(7)).toBe('no_insomnia');
    });

    it('should correctly classify boundary score 8 (subthreshold)', () => {
      expect(ISIAssessment.getSeverity(8)).toBe('subthreshold');
    });

    it('should correctly classify boundary score 14 (subthreshold)', () => {
      expect(ISIAssessment.getSeverity(14)).toBe('subthreshold');
    });

    it('should correctly classify boundary score 15 (moderate)', () => {
      expect(ISIAssessment.getSeverity(15)).toBe('moderate');
    });

    it('should correctly classify boundary score 21 (moderate)', () => {
      expect(ISIAssessment.getSeverity(21)).toBe('moderate');
    });

    it('should correctly classify boundary score 22 (severe)', () => {
      expect(ISIAssessment.getSeverity(22)).toBe('severe');
    });
  });

  // ==========================================================================
  // Scoring Accuracy
  // ==========================================================================
  describe('Scoring', () => {
    it('should calculate correct total score (sum of all 7 items)', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 2,
        q2_stayingAsleep: 3,
        q3_earlyWaking: 1,
        q4_satisfaction: 2,
        q5_interference: 2,
        q6_noticeability: 3,
        q7_distress: 2,
      });

      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(15); // 2+3+1+2+2+3+2 = 15
    });

    it('should calculate minimum score (0) correctly', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 0,
        q2_stayingAsleep: 0,
        q3_earlyWaking: 0,
        q4_satisfaction: 0,
        q5_interference: 0,
        q6_noticeability: 0,
        q7_distress: 0,
      });

      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(0);
      expect(result.severity).toBe('no_insomnia');
    });

    it('should calculate maximum score (28) correctly', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 4,
        q2_stayingAsleep: 4,
        q3_earlyWaking: 4,
        q4_satisfaction: 4,
        q5_interference: 4,
        q6_noticeability: 4,
        q7_distress: 4,
      });

      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(28);
      expect(result.severity).toBe('severe');
    });

    it('should calculate subscales correctly', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 2,
        q2_stayingAsleep: 3,
        q3_earlyWaking: 1,
        q4_satisfaction: 2,
        q5_interference: 3,
        q6_noticeability: 2,
        q7_distress: 3,
      });

      const result = ISIAssessment.score(response);

      expect(result.subscales.sleepProblems).toBe(6); // 2+3+1
      expect(result.subscales.impact).toBe(5); // 2+3
      expect(result.subscales.distress).toBe(5); // 2+3
    });
  });

  // ==========================================================================
  // Clinical Significance
  // ==========================================================================
  describe('Clinical Significance', () => {
    it('should mark score <= 7 as NOT clinically significant', () => {
      const response = createISIResponse({ total: 7 });
      const result = ISIAssessment.score(response);

      expect(result.isClinical).toBe(false);
    });

    it('should mark score >= 8 as clinically significant', () => {
      const response = createISIResponse({ total: 8 });
      const result = ISIAssessment.score(response);

      expect(result.isClinical).toBe(true);
    });
  });

  // ==========================================================================
  // Treatment Response and Remission
  // ==========================================================================
  describe('Treatment Response', () => {
    it('should have correct MCID threshold (6 points)', () => {
      expect(ISI_MCID).toBe(6);
    });

    it('should have correct response threshold (8 points)', () => {
      expect(ISI_RESPONSE_THRESHOLD).toBe(8);
    });

    it('should have correct remission cutoff (7 points)', () => {
      expect(ISI_REMISSION_CUTOFF).toBe(7);
    });

    it('should identify responders (reduction >= 8 points)', () => {
      expect(ISIAssessment.isResponder(20, 12)).toBe(true); // -8
      expect(ISIAssessment.isResponder(20, 10)).toBe(true); // -10
      expect(ISIAssessment.isResponder(20, 13)).toBe(false); // -7
    });

    it('should identify remission (score <= 7)', () => {
      expect(ISIAssessment.isRemission(7)).toBe(true);
      expect(ISIAssessment.isRemission(5)).toBe(true);
      expect(ISIAssessment.isRemission(8)).toBe(false);
    });

    it('should identify clinically meaningful change (>= 6 points)', () => {
      expect(ISIAssessment.isClinicallyMeaningfulChange(20, 14)).toBe(true); // -6
      expect(ISIAssessment.isClinicallyMeaningfulChange(20, 15)).toBe(false); // -5
      expect(ISIAssessment.isClinicallyMeaningfulChange(10, 16)).toBe(true); // +6 (worsening)
    });
  });

  // ==========================================================================
  // Questionnaire Structure
  // ==========================================================================
  describe('Questionnaire Structure', () => {
    it('should have exactly 7 items', () => {
      expect(ISI_ITEMS.length).toBe(7);
    });

    it('should have items numbered 1-7', () => {
      const numbers = ISI_ITEMS.map(item => item.number);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have Russian text for all items', () => {
      ISI_ITEMS.forEach(item => {
        expect(item.textRu).toBeDefined();
        expect(item.textRu.length).toBeGreaterThan(0);
      });
    });

    it('should have 5 anchors (0-4 scale) for each item', () => {
      ISI_ITEMS.forEach(item => {
        expect(item.anchorsRu.length).toBe(5);
        expect(item.anchorsEn.length).toBe(5);
      });
    });
  });

  // ==========================================================================
  // Russian Validation Psychometrics
  // ==========================================================================
  describe('Russian Validation Psychometrics', () => {
    it('should have correct translator attribution', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.translation.translator).toBe('Danilenko K.V.');
    });

    it('should have correct validation year', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.translation.date).toBe('2011-01');
    });

    it('should have documented Cronbach alpha', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.reliability.cronbachAlpha).toBe(0.77);
    });

    it('should have documented sensitivity', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.validity.sensitivity).toBe(0.902);
    });

    it('should have documented specificity', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.validity.specificity).toBe(0.952);
    });

    it('should have documented optimal cutoff', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.validity.optimalCutoff).toBe(8);
    });
  });

  // ==========================================================================
  // Response Quality
  // ==========================================================================
  describe('Response Quality Detection', () => {
    it('should flag all-same responses as suspect', () => {
      const allThrees = createISIResponse({
        q1_fallingAsleep: 3,
        q2_stayingAsleep: 3,
        q3_earlyWaking: 3,
        q4_satisfaction: 3,
        q5_interference: 3,
        q6_noticeability: 3,
        q7_distress: 3,
      });

      const result = ISIAssessment.score(allThrees);

      expect(result.responseQuality).toBe('suspect');
    });

    it('should accept all-zeros as valid (genuine no insomnia)', () => {
      const allZeros = createISIResponse({
        q1_fallingAsleep: 0,
        q2_stayingAsleep: 0,
        q3_earlyWaking: 0,
        q4_satisfaction: 0,
        q5_interference: 0,
        q6_noticeability: 0,
        q7_distress: 0,
      });

      const result = ISIAssessment.score(allZeros);

      expect(result.responseQuality).toBe('valid');
    });

    it('should flag high problems but no distress as suspect', () => {
      const inconsistent = createISIResponse({
        q1_fallingAsleep: 4,
        q2_stayingAsleep: 4,
        q3_earlyWaking: 3,
        q4_satisfaction: 2,
        q5_interference: 2,
        q6_noticeability: 0,
        q7_distress: 0,
      });

      const result = ISIAssessment.score(inconsistent);

      expect(result.responseQuality).toBe('suspect');
    });
  });

  // ==========================================================================
  // Recommendations
  // ==========================================================================
  describe('Recommendations', () => {
    it('should recommend CBT-I for moderate insomnia', () => {
      const response = createISIResponse({ total: 18 });
      const result = ISIAssessment.score(response);

      const hasCBTI = result.recommendations.some(r =>
        r.toLowerCase().includes('кпт-и') || r.toLowerCase().includes('когнитивно-поведенческ')
      );
      expect(hasCBTI).toBe(true);
    });

    it('should urgently recommend specialist for severe insomnia', () => {
      const response = createISIResponse({ total: 24 });
      const result = ISIAssessment.score(response);

      const hasUrgent = result.recommendations.some(r =>
        r.toLowerCase().includes('срочно') || r.toLowerCase().includes('обратитесь к врачу')
      );
      expect(hasUrgent).toBe(true);
    });
  });

  // ==========================================================================
  // Report Generation
  // ==========================================================================
  describe('Report Generation', () => {
    it('should generate report with all sections', () => {
      const response = createISIResponse({ total: 16 });
      const report = ISIAssessment.generateReport(response);

      expect(report).toContain('ИНДЕКС ТЯЖЕСТИ БЕССОННИЦЫ');
      expect(report).toContain('РЕЗУЛЬТАТЫ');
      expect(report).toContain('СУБШКАЛЫ');
      expect(report).toContain('ИНТЕРПРЕТАЦИЯ');
      expect(report).toContain('РЕКОМЕНДАЦИИ');
      expect(report).toContain('Danilenko K.V., 2011');
    });

    it('should include treatment response section when baseline provided', () => {
      const response = createISIResponse({ total: 10 });
      const report = ISIAssessment.generateReport(response, 20);

      expect(report).toContain('ДИНАМИКА ЛЕЧЕНИЯ');
      expect(report).toContain('Исходный балл: 20');
      expect(report).toContain('Текущий балл: 10');
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create mock ISI response
 */
function createISIResponse(
  scores: Partial<{
    q1_fallingAsleep: 0 | 1 | 2 | 3 | 4;
    q2_stayingAsleep: 0 | 1 | 2 | 3 | 4;
    q3_earlyWaking: 0 | 1 | 2 | 3 | 4;
    q4_satisfaction: 0 | 1 | 2 | 3 | 4;
    q5_interference: 0 | 1 | 2 | 3 | 4;
    q6_noticeability: 0 | 1 | 2 | 3 | 4;
    q7_distress: 0 | 1 | 2 | 3 | 4;
    total: number;
  }>
): IISIResponse {
  // If total is provided, distribute evenly
  if (scores.total !== undefined) {
    const perItem = Math.floor(scores.total / 7);
    const remainder = scores.total % 7;

    return {
      userId: 'test-user',
      date: new Date().toISOString().split('T')[0],
      q1_fallingAsleep: Math.min(4, perItem + (remainder > 0 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q2_stayingAsleep: Math.min(4, perItem + (remainder > 1 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q3_earlyWaking: Math.min(4, perItem + (remainder > 2 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q4_satisfaction: Math.min(4, perItem + (remainder > 3 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q5_interference: Math.min(4, perItem + (remainder > 4 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q6_noticeability: Math.min(4, perItem + (remainder > 5 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
      q7_distress: Math.min(4, perItem) as 0 | 1 | 2 | 3 | 4,
    };
  }

  return {
    userId: 'test-user',
    date: new Date().toISOString().split('T')[0],
    q1_fallingAsleep: scores.q1_fallingAsleep ?? 0,
    q2_stayingAsleep: scores.q2_stayingAsleep ?? 0,
    q3_earlyWaking: scores.q3_earlyWaking ?? 0,
    q4_satisfaction: scores.q4_satisfaction ?? 0,
    q5_interference: scores.q5_interference ?? 0,
    q6_noticeability: scores.q6_noticeability ?? 0,
    q7_distress: scores.q7_distress ?? 0,
  };
}
