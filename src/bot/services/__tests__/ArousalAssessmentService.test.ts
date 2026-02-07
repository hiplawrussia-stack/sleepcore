/**
 * ArousalAssessmentService Tests (Wave 2)
 * ========================================
 *
 * Unit tests for PSAS-inspired arousal assessment, subscale scoring,
 * severity classification, therapy recommendations, profile estimation,
 * and history management.
 *
 * Clinical cutoffs tested:
 * - Cognitive ≥20 (Fernandez-Mendoza et al., 2019; Nicassio et al., 1985)
 * - Somatic ≥14 (Fernandez-Mendoza et al., 2019; Nicassio et al., 1985)
 *
 * Meta-analysis reliability: α=0.88 total, α=0.89 cognitive, α=0.80 somatic
 * (Correia et al., 2025, Sleep Medicine)
 */

import {
  ArousalAssessmentService,
  createArousalAssessmentService,
  arousalAssessmentService,
  DEFAULT_AROUSAL_CONFIG,
  AROUSAL_ITEMS,
  AROUSAL_RESPONSE_OPTIONS,
  type IArousalResponse,
} from '../ArousalAssessmentService';
import type { ISleepState } from '../../../sleep/interfaces/ISleepState';

describe('ArousalAssessmentService', () => {
  let service: ArousalAssessmentService;

  beforeEach(() => {
    service = createArousalAssessmentService();
  });

  // ==================== Configuration ====================

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.cognitiveCutoff).toBe(20);
      expect(config.somaticCutoff).toBe(14);
      expect(config.clinicallySignificantChange).toBe(5);
      expect(config.minDaysForProfile).toBe(7);
    });

    it('should allow custom configuration', () => {
      const customService = createArousalAssessmentService({
        cognitiveCutoff: 18,
        somaticCutoff: 13,
        clinicallySignificantChange: 4,
      });

      const config = customService.getConfig();
      expect(config.cognitiveCutoff).toBe(18);
      expect(config.somaticCutoff).toBe(13);
      expect(config.clinicallySignificantChange).toBe(4);
      expect(config.enabled).toBe(true); // default preserved
    });

    it('should match published clinical cutoffs', () => {
      // Fernandez-Mendoza et al. (2019): cognitive ~20, somatic ~14
      expect(DEFAULT_AROUSAL_CONFIG.cognitiveCutoff).toBe(20);
      expect(DEFAULT_AROUSAL_CONFIG.somaticCutoff).toBe(14);
    });
  });

  // ==================== Questionnaire Access ====================

  describe('Questionnaire Access', () => {
    it('should return all 16 items in order', () => {
      const items = service.getItems();
      expect(items).toHaveLength(16);
      expect(items[0].number).toBe(1);
      expect(items[15].number).toBe(16);
    });

    it('should have 8 cognitive and 8 somatic items', () => {
      const cognitive = service.getItemsBySubscale('cognitive');
      const somatic = service.getItemsBySubscale('somatic');
      expect(cognitive).toHaveLength(8);
      expect(somatic).toHaveLength(8);
    });

    it('should have cognitive items numbered 1-8', () => {
      const cognitive = service.getItemsBySubscale('cognitive');
      const numbers = cognitive.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should have somatic items numbered 9-16', () => {
      const somatic = service.getItemsBySubscale('somatic');
      const numbers = somatic.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    });

    it('should provide 5-point response options (Likert)', () => {
      const options = service.getResponseOptions();
      expect(options).toHaveLength(5);
      expect(options[0].value).toBe(1);
      expect(options[4].value).toBe(5);
    });

    it('should have Russian and English text for all items', () => {
      const items = service.getItems();
      for (const item of items) {
        expect(item.textRu).toBeDefined();
        expect(item.textRu.length).toBeGreaterThan(0);
        expect(item.textEn).toBeDefined();
        expect(item.textEn.length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== Assessment Scoring ====================

  describe('Assessment Scoring', () => {
    it('should require exactly 16 responses', () => {
      const tooFew = createResponses(10, 1);
      expect(() => service.scoreAssessment('user1', tooFew)).toThrow('Expected 16 responses');

      const tooMany = createResponses(20, 1);
      expect(() => service.scoreAssessment('user1', tooMany)).toThrow('Expected 16 responses');
    });

    it('should calculate minimum scores (all 1s)', () => {
      const responses = createResponses(16, 1);
      const result = service.scoreAssessment('user1', responses);

      expect(result.cognitiveScore).toBe(8);   // 8 items × 1
      expect(result.somaticScore).toBe(8);     // 8 items × 1
      expect(result.totalScore).toBe(16);      // 16 items × 1
    });

    it('should calculate maximum scores (all 5s)', () => {
      const responses = createResponses(16, 5);
      const result = service.scoreAssessment('user1', responses);

      expect(result.cognitiveScore).toBe(40);  // 8 items × 5
      expect(result.somaticScore).toBe(40);    // 8 items × 5
      expect(result.totalScore).toBe(80);      // 16 items × 5
    });

    it('should correctly separate cognitive and somatic scores', () => {
      // Cognitive items (1-8) at 4, somatic items (9-16) at 2
      const responses: IArousalResponse[] = [];
      for (let i = 1; i <= 8; i++) {
        responses.push({ itemNumber: i, value: 4 });
      }
      for (let i = 9; i <= 16; i++) {
        responses.push({ itemNumber: i, value: 2 });
      }

      const result = service.scoreAssessment('user1', responses);
      expect(result.cognitiveScore).toBe(32);  // 8 × 4
      expect(result.somaticScore).toBe(16);    // 8 × 2
      expect(result.totalScore).toBe(48);
    });

    it('should assign result to correct user', () => {
      const responses = createResponses(16, 3);
      const result = service.scoreAssessment('user42', responses);
      expect(result.userId).toBe('user42');
    });

    it('should generate unique IDs', () => {
      const responses = createResponses(16, 3);
      const r1 = service.scoreAssessment('user1', responses);
      const r2 = service.scoreAssessment('user1', responses);
      expect(r1.id).not.toBe(r2.id);
    });

    it('should store timestamp', () => {
      const before = new Date();
      const responses = createResponses(16, 3);
      const result = service.scoreAssessment('user1', responses);
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store original responses', () => {
      const responses = createResponses(16, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.responses).toHaveLength(16);
    });
  });

  // ==================== Severity Classification ====================

  describe('Severity Classification', () => {
    it('should classify low cognitive arousal (score < cutoff×0.7 = 14)', () => {
      // Cognitive items at 1 → score=8 < 14
      const responses = createMixedResponses(1, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.cognitiveSeverity).toBe('low');
    });

    it('should classify moderate cognitive arousal (14 ≤ score < 20)', () => {
      // Cognitive items at 2 → score=16, moderate (14 ≤ 16 < 20)
      const responses = createMixedResponses(2, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.cognitiveSeverity).toBe('moderate');
    });

    it('should classify high cognitive arousal (20 ≤ score < 30)', () => {
      // Cognitive items at 3 → score=24, high (20 ≤ 24 < 30)
      const responses = createMixedResponses(3, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.cognitiveSeverity).toBe('high');
    });

    it('should classify very high cognitive arousal (score ≥ 30)', () => {
      // Cognitive items at 4 → score=32, very_high (≥ 30)
      const responses = createMixedResponses(4, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.cognitiveSeverity).toBe('very_high');
    });

    it('should classify low somatic arousal (score < cutoff×0.7 ≈ 9.8)', () => {
      // Somatic items at 1 → score=8 < 9.8
      const responses = createMixedResponses(3, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.somaticSeverity).toBe('low');
    });

    it('should classify high somatic arousal (14 ≤ score < 21)', () => {
      // Somatic items at 2 → score=16, high (14 ≤ 16 < 21)
      const responses = createMixedResponses(1, 2);
      const result = service.scoreAssessment('user1', responses);
      expect(result.somaticSeverity).toBe('high');
    });

    it('should classify very high somatic arousal (score ≥ 21)', () => {
      // Somatic items at 3 → score=24, very_high (≥ 21)
      const responses = createMixedResponses(1, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.somaticSeverity).toBe('very_high');
    });
  });

  // ==================== Dominant Arousal Type ====================

  describe('Dominant Arousal Type', () => {
    it('should detect cognitive dominant arousal', () => {
      // High cognitive (4→32), low somatic (1→8)
      const responses = createMixedResponses(4, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.dominantArousal).toBe('cognitive');
    });

    it('should detect somatic dominant arousal', () => {
      // Low cognitive (1→8), high somatic (4→32)
      const responses = createMixedResponses(1, 4);
      const result = service.scoreAssessment('user1', responses);
      expect(result.dominantArousal).toBe('somatic');
    });

    it('should detect balanced arousal', () => {
      // Equal scores: both at 3 → cognitive=24, somatic=24
      // Normalized: cog/20=1.2, som/14=1.71 → diff=0.51 → somatic dominant
      // To get balanced, need proportional: cog ~20, som ~14
      const responses: IArousalResponse[] = [];
      // Cognitive: need ~20 → avg 2.5 per item
      for (let i = 1; i <= 4; i++) responses.push({ itemNumber: i, value: 3 });
      for (let i = 5; i <= 8; i++) responses.push({ itemNumber: i, value: 2 });
      // Somatic: need ~14 → avg 1.75 per item
      for (let i = 9; i <= 12; i++) responses.push({ itemNumber: i, value: 2 });
      for (let i = 13; i <= 16; i++) responses.push({ itemNumber: i, value: 1 });

      const result = service.scoreAssessment('user1', responses);
      // cog=20, som=12 → norm: 20/20=1.0, 12/14=0.857 → diff=0.143 < 0.2
      expect(result.dominantArousal).toBe('balanced');
    });
  });

  // ==================== Therapy Recommendations ====================

  describe('Therapy Recommendations', () => {
    it('should recommend MCT for very high cognitive arousal (≥30)', () => {
      // Cognitive at 4 → 32 ≥ 30 (cutoff×1.5)
      const responses = createMixedResponses(4, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.primary).toBe('mct');
      expect(result.recommendation.secondary).toBe('mbti');
      expect(result.recommendation.confidence).toBe('high');
    });

    it('should recommend ACT-I when both subscales above cutoffs', () => {
      // Both above cutoffs: cognitive ≥20, somatic ≥14
      // Cognitive at 3 → 24 ≥ 20, Somatic at 2 → 16 ≥ 14
      // But 24 < 30 (not very high) so MCT won't trigger
      const responses = createMixedResponses(3, 2);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.primary).toBe('acti');
      expect(result.recommendation.confidence).toBe('high');
    });

    it('should recommend MBT-I for cognitive dominant above cutoff', () => {
      // Cognitive at 3 → 24 ≥ 20, somatic at 1 → 8 < 14
      const responses = createMixedResponses(3, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.primary).toBe('mbti');
      expect(result.recommendation.secondary).toBe('mct');
      expect(result.recommendation.confidence).toBe('high');
    });

    it('should recommend relaxation for somatic dominant above cutoff', () => {
      // Need somatic above cutoff (14) and somatic dominant
      // Cognitive low, somatic high: cog 1→8, som 3→24
      const responses = createMixedResponses(1, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.primary).toBe('relaxation_focused');
      expect(result.recommendation.secondary).toBe('mbti');
      expect(result.recommendation.confidence).toBe('medium');
    });

    it('should recommend MBT-I below cutoffs with low confidence', () => {
      // All responses at 1 → cog=8 < 20, som=8 < 14
      const responses = createResponses(16, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.primary).toBe('mbti');
      expect(result.recommendation.confidence).toBe('low');
    });

    it('should include Russian rationale in all recommendations', () => {
      const responses = createResponses(16, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.recommendation.rationaleRu).toBeDefined();
      expect(result.recommendation.rationaleRu.length).toBeGreaterThan(0);
    });
  });

  // ==================== Baseline Comparison ====================

  describe('Baseline Comparison', () => {
    it('should not have changeFromBaseline on first assessment', () => {
      const responses = createResponses(16, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.changeFromBaseline).toBeUndefined();
    });

    it('should calculate changeFromBaseline on subsequent assessments', () => {
      // First assessment: all 3s → total = 48
      const r1 = createResponses(16, 3);
      service.scoreAssessment('user1', r1);

      // Second assessment: all 2s → total = 32
      const r2 = createResponses(16, 2);
      const result = service.scoreAssessment('user1', r2);

      expect(result.changeFromBaseline).toBeDefined();
      expect(result.changeFromBaseline!.cognitiveChange).toBe(16 - 24); // -8
      expect(result.changeFromBaseline!.somaticChange).toBe(16 - 24);  // -8
      expect(result.changeFromBaseline!.totalChange).toBe(32 - 48);    // -16
    });

    it('should detect clinically significant improvement', () => {
      // Baseline: all 4s → total = 64
      service.scoreAssessment('user1', createResponses(16, 4));

      // Follow-up: all 2s → total = 32 (change = -32, threshold = 5)
      const result = service.scoreAssessment('user1', createResponses(16, 2));
      expect(result.changeFromBaseline!.improved).toBe(true);
    });

    it('should not flag improvement below threshold', () => {
      // Baseline: all 3s → total = 48
      service.scoreAssessment('user1', createResponses(16, 3));

      // Follow-up: slightly lower → total = 46 (change = -2, threshold = 5)
      const responses: IArousalResponse[] = [];
      for (let i = 1; i <= 14; i++) responses.push({ itemNumber: i, value: 3 });
      responses.push({ itemNumber: 15, value: 2 });
      responses.push({ itemNumber: 16, value: 2 });
      const result = service.scoreAssessment('user1', responses);
      expect(result.changeFromBaseline!.improved).toBe(false);
    });
  });

  // ==================== Profile Estimation ====================

  describe('Profile Estimation from Sleep History', () => {
    it('should return unavailable with insufficient history', () => {
      const shortHistory = createSleepHistory(5, 0.3, 20);
      const profile = service.estimateArousalProfile(shortHistory);
      expect(profile.available).toBe(false);
      expect(profile.recommendation).toBeNull();
    });

    it('should estimate profile from 7+ days of history', () => {
      const history = createSleepHistory(10, 0.5, 30);
      const profile = service.estimateArousalProfile(history);
      expect(profile.available).toBe(true);
      expect(profile.estimatedCognitive).toBeGreaterThanOrEqual(8);
      expect(profile.estimatedCognitive).toBeLessThanOrEqual(40);
      expect(profile.estimatedSomatic).toBeGreaterThanOrEqual(8);
      expect(profile.estimatedSomatic).toBeLessThanOrEqual(40);
    });

    it('should map 0-1 ISleepState range to 8-40 PSAS range', () => {
      // preSleepArousal=0, sleepAnxiety=0 → proxy=0 → estimated=8
      const lowHistory = createSleepHistory(7, 0.0, 5);
      const lowProfile = service.estimateArousalProfile(lowHistory);
      expect(lowProfile.estimatedCognitive).toBe(8);

      // preSleepArousal=1.0, sleepAnxiety=1.0 → proxy=1.0 → estimated=40
      const highHistory = createSleepHistory(7, 1.0, 60);
      const highProfile = service.estimateArousalProfile(highHistory);
      expect(highProfile.estimatedCognitive).toBe(40);
    });

    it('should generate recommendation when above cutoffs', () => {
      // High arousal values
      const history = createSleepHistory(10, 0.8, 45);
      const profile = service.estimateArousalProfile(history);
      expect(profile.recommendation).not.toBeNull();
      expect(profile.recommendation!.primary).toBeDefined();
    });

    it('should not generate recommendation when below cutoffs', () => {
      // Low arousal values
      const history = createSleepHistory(10, 0.1, 10);
      const profile = service.estimateArousalProfile(history);
      expect(profile.recommendation).toBeNull();
    });

    it('should calculate improving trend when arousal decreases', () => {
      const history: ISleepState[] = [];
      // First half: high arousal
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, 0.8, 30));
      }
      // Second half: low arousal
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 6}`, 0.2, 10));
      }
      const profile = service.estimateArousalProfile(history);
      expect(profile.trend).toBe('improving');
    });

    it('should calculate worsening trend when arousal increases', () => {
      const history: ISleepState[] = [];
      // First half: low arousal
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, 0.2, 10));
      }
      // Second half: high arousal
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 6}`, 0.8, 30));
      }
      const profile = service.estimateArousalProfile(history);
      expect(profile.trend).toBe('worsening');
    });

    it('should calculate stable trend when arousal stays constant', () => {
      const history = createSleepHistory(10, 0.5, 25);
      const profile = service.estimateArousalProfile(history);
      expect(profile.trend).toBe('stable');
    });
  });

  // ==================== History Management ====================

  describe('History Management', () => {
    it('should return empty history for new user', () => {
      expect(service.getHistory('unknown')).toEqual([]);
    });

    it('should store assessment history', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      service.scoreAssessment('user1', createResponses(16, 2));
      expect(service.getHistory('user1')).toHaveLength(2);
    });

    it('should separate history by user', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      service.scoreAssessment('user2', createResponses(16, 2));
      expect(service.getHistory('user1')).toHaveLength(1);
      expect(service.getHistory('user2')).toHaveLength(1);
    });

    it('should return latest assessment', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      service.scoreAssessment('user1', createResponses(16, 2));
      const latest = service.getLatestAssessment('user1');
      expect(latest).not.toBeNull();
      expect(latest!.totalScore).toBe(32); // all 2s
    });

    it('should return null latest for unknown user', () => {
      expect(service.getLatestAssessment('unknown')).toBeNull();
    });

    it('should return baseline (first) assessment', () => {
      service.scoreAssessment('user1', createResponses(16, 4));
      service.scoreAssessment('user1', createResponses(16, 2));
      const baseline = service.getBaseline('user1');
      expect(baseline).not.toBeNull();
      expect(baseline!.totalScore).toBe(64); // all 4s — first assessment
    });

    it('should return null baseline for unknown user', () => {
      expect(service.getBaseline('unknown')).toBeNull();
    });

    it('should reset user data', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      expect(service.getHistory('user1')).toHaveLength(1);
      service.resetUserData('user1');
      expect(service.getHistory('user1')).toEqual([]);
    });
  });

  // ==================== Assessment Due Logic ====================

  describe('Assessment Due Logic', () => {
    it('should be due for new user (no assessments)', () => {
      expect(service.isAssessmentDue('unknown')).toBe(true);
    });

    it('should not be due immediately after assessment', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      expect(service.isAssessmentDue('user1')).toBe(false);
    });

    it('should accept custom interval', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      // 0 weeks interval → always due
      expect(service.isAssessmentDue('user1', 0)).toBe(true);
    });
  });

  // ==================== Score Trend ====================

  describe('Score Trend', () => {
    it('should return empty trend for unknown user', () => {
      const trend = service.getScoreTrend('unknown');
      expect(trend.dates).toEqual([]);
      expect(trend.cognitiveScores).toEqual([]);
      expect(trend.somaticScores).toEqual([]);
      expect(trend.totalScores).toEqual([]);
    });

    it('should track scores over multiple assessments', () => {
      service.scoreAssessment('user1', createResponses(16, 3));
      service.scoreAssessment('user1', createResponses(16, 2));
      service.scoreAssessment('user1', createResponses(16, 4));

      const trend = service.getScoreTrend('user1');
      expect(trend.dates).toHaveLength(3);
      expect(trend.totalScores).toEqual([48, 32, 64]);
      expect(trend.cognitiveScores).toEqual([24, 16, 32]);
      expect(trend.somaticScores).toEqual([24, 16, 32]);
    });
  });

  // ==================== Singleton ====================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(arousalAssessmentService).toBeDefined();
      expect(arousalAssessmentService).toBeInstanceOf(ArousalAssessmentService);
    });
  });

  // ==================== Constants Validation ====================

  describe('Constants Validation', () => {
    it('should have 16 PSAS items', () => {
      expect(AROUSAL_ITEMS).toHaveLength(16);
    });

    it('should have 5 response options (1-5 Likert)', () => {
      expect(AROUSAL_RESPONSE_OPTIONS).toHaveLength(5);
      const values = AROUSAL_RESPONSE_OPTIONS.map(o => o.value);
      expect(values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have Russian labels for all response options', () => {
      for (const option of AROUSAL_RESPONSE_OPTIONS) {
        expect(option.labelRu.length).toBeGreaterThan(0);
      }
    });
  });
});

// ==================== Test Helpers ====================

/**
 * Create uniform responses (all same value)
 */
function createResponses(count: number, value: 1 | 2 | 3 | 4 | 5): IArousalResponse[] {
  const responses: IArousalResponse[] = [];
  for (let i = 1; i <= count; i++) {
    responses.push({ itemNumber: i, value });
  }
  return responses;
}

/**
 * Create mixed responses: cognitive at one value, somatic at another
 */
function createMixedResponses(
  cognitiveValue: 1 | 2 | 3 | 4 | 5,
  somaticValue: 1 | 2 | 3 | 4 | 5
): IArousalResponse[] {
  const responses: IArousalResponse[] = [];
  for (let i = 1; i <= 8; i++) {
    responses.push({ itemNumber: i, value: cognitiveValue });
  }
  for (let i = 9; i <= 16; i++) {
    responses.push({ itemNumber: i, value: somaticValue });
  }
  return responses;
}

/**
 * Create mock ISleepState
 */
function createMockSleepState(
  date: string,
  arousal: number,
  solMinutes: number
): ISleepState {
  return {
    date,
    userId: 'test',
    timestamp: new Date(date).getTime(),
    metrics: {
      sleepOnsetLatency: solMinutes,
      wakeAfterSleepOnset: 30,
      totalSleepTime: 360,
      timeInBed: 480,
      sleepEfficiency: 75,
      numberOfAwakenings: 2,
      earlyMorningWaking: 0,
      sleepQuality: 3,
    },
    cognitions: {
      dbasScore: 4.0,
      beliefs: {
        unrealisticExpectations: false,
        catastrophizing: false,
        helplessness: false,
        effortfulSleep: false,
        healthWorries: false,
      },
      sleepAnxiety: arousal,
      preSleepArousal: arousal,
      sleepSelfEfficacy: 0.5,
    },
    behaviors: {
      bedtimeConsistency: 0.7,
      wakeTimeConsistency: 0.7,
      stimulusControlAdherence: 0.5,
      sleepHygieneScore: 0.6,
      screenTimeBeforeBed: 30,
      caffeineIntake: 1,
      alcoholIntake: 0,
      exerciseMinutes: 30,
      napping: false,
      napDuration: 0,
    },
    circadian: {
      chronotype: 'intermediate',
      socialJetLag: 0.5,
      lightExposure: 60,
      melatoninOnsetEstimate: 22,
    },
    homeostasis: {
      sleepPressure: 0.5,
      sleepDebt: 60,
      recoveryRate: 0.5,
    },
    insomnia: {
      isiScore: 15,
      isiSeverity: 'moderate',
      insomniaSubtype: 'sleep_onset',
      chronicityWeeks: 12,
    },
    treatment: {
      currentWeek: 2,
      phase: 'active',
      adherenceRate: 0.7,
      responseStatus: 'responding',
    },
  } as unknown as ISleepState;
}

/**
 * Create sleep history with consistent values
 */
function createSleepHistory(
  days: number,
  arousal: number,
  solMinutes: number
): ISleepState[] {
  const history: ISleepState[] = [];
  for (let i = 0; i < days; i++) {
    const day = String(i + 1).padStart(2, '0');
    history.push(createMockSleepState(`2024-01-${day}`, arousal, solMinutes));
  }
  return history;
}
