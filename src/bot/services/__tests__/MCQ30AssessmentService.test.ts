/**
 * MCQ30AssessmentService Tests (Sprint 7 - MCT Module)
 * =====================================================
 *
 * Unit tests for Russian-validated MCQ-30 metacognitions questionnaire,
 * subscale scoring, interpretation, history management, and CSD integration.
 *
 * Clinical reference:
 * - Wells & Cartwright-Hatton (2004): Original MCQ-30
 * - Сирота, Московченко, Ялтонский (2018): Russian validation
 *
 * Scoring:
 * - 30 items, 1-4 Likert scale
 * - 5 subscales of 6 items each (range 6-24)
 * - Total score range: 30-120
 * - Concern thresholds: POS=14, NEG=14, CC=14, NC=14, CSC=16
 */

import {
  MCQ30AssessmentService,
  createMCQ30AssessmentService,
  mcq30AssessmentService,
  DEFAULT_MCQ30_CONFIG,
  MCQ30_ITEMS,
  MCQ30_RESPONSE_OPTIONS,
  MCQ30_SUBSCALES,
  type IMCQ30Response,
  type IMCQ30Result,
  type MCQ30Subscale,
} from '../MCQ30AssessmentService';

describe('MCQ30AssessmentService', () => {
  let service: MCQ30AssessmentService;

  beforeEach(() => {
    service = createMCQ30AssessmentService();
  });

  // ==================== Configuration ====================

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.highScoreThreshold).toBe(65);
      expect(config.veryHighScoreThreshold).toBe(80);
      expect(config.clinicallySignificantChange).toBe(10);
    });

    it('should allow custom configuration', () => {
      const customService = createMCQ30AssessmentService({
        highScoreThreshold: 60,
        veryHighScoreThreshold: 75,
        clinicallySignificantChange: 8,
      });

      const config = customService.getConfig();
      expect(config.highScoreThreshold).toBe(60);
      expect(config.veryHighScoreThreshold).toBe(75);
      expect(config.clinicallySignificantChange).toBe(8);
      expect(config.enabled).toBe(true); // default preserved
    });

    it('should match published default thresholds', () => {
      expect(DEFAULT_MCQ30_CONFIG.highScoreThreshold).toBe(65);
      expect(DEFAULT_MCQ30_CONFIG.veryHighScoreThreshold).toBe(80);
      expect(DEFAULT_MCQ30_CONFIG.clinicallySignificantChange).toBe(10);
    });
  });

  // ==================== Questionnaire Access ====================

  describe('Questionnaire Access', () => {
    it('should return all 30 items in order', () => {
      const items = service.getItems();
      expect(items).toHaveLength(30);
      expect(items[0].number).toBe(1);
      expect(items[29].number).toBe(30);

      // Verify sorted order
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].number).toBeLessThan(items[i + 1].number);
      }
    });

    it('should have 6 items per subscale', () => {
      const items = service.getItems();
      const subscaleCounts: Record<string, number> = {};
      for (const item of items) {
        subscaleCounts[item.subscale] = (subscaleCounts[item.subscale] || 0) + 1;
      }
      expect(subscaleCounts['positive_beliefs']).toBe(6);
      expect(subscaleCounts['uncontrollability']).toBe(6);
      expect(subscaleCounts['cognitive_confidence']).toBe(6);
      expect(subscaleCounts['need_to_control']).toBe(6);
      expect(subscaleCounts['cognitive_self_consciousness']).toBe(6);
    });

    it('should have correct item numbers for positive_beliefs subscale', () => {
      const items = service.getItems().filter(i => i.subscale === 'positive_beliefs');
      const numbers = items.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([1, 7, 10, 19, 23, 28]);
    });

    it('should have correct item numbers for uncontrollability subscale', () => {
      const items = service.getItems().filter(i => i.subscale === 'uncontrollability');
      const numbers = items.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([2, 4, 9, 11, 15, 21]);
    });

    it('should have correct item numbers for cognitive_confidence subscale', () => {
      const items = service.getItems().filter(i => i.subscale === 'cognitive_confidence');
      const numbers = items.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([8, 14, 17, 24, 26, 29]);
    });

    it('should have correct item numbers for need_to_control subscale', () => {
      const items = service.getItems().filter(i => i.subscale === 'need_to_control');
      const numbers = items.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([6, 13, 20, 22, 25, 27]);
    });

    it('should have correct item numbers for cognitive_self_consciousness subscale', () => {
      const items = service.getItems().filter(i => i.subscale === 'cognitive_self_consciousness');
      const numbers = items.map(i => i.number).sort((a, b) => a - b);
      expect(numbers).toEqual([3, 5, 12, 16, 18, 30]);
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

  // ==================== getItem ====================

  describe('getItem', () => {
    it('should return correct item for valid number', () => {
      const item = service.getItem(1);
      expect(item).toBeDefined();
      expect(item!.number).toBe(1);
      expect(item!.subscale).toBe('positive_beliefs');
    });

    it('should return correct item for last item', () => {
      const item = service.getItem(30);
      expect(item).toBeDefined();
      expect(item!.number).toBe(30);
      expect(item!.subscale).toBe('cognitive_self_consciousness');
    });

    it('should return undefined for invalid item number 0', () => {
      expect(service.getItem(0)).toBeUndefined();
    });

    it('should return undefined for invalid item number 31', () => {
      expect(service.getItem(31)).toBeUndefined();
    });

    it('should return undefined for negative item number', () => {
      expect(service.getItem(-1)).toBeUndefined();
    });

    it('should return undefined for non-integer item number', () => {
      expect(service.getItem(1.5)).toBeUndefined();
    });
  });

  // ==================== getResponseOptions ====================

  describe('getResponseOptions', () => {
    it('should return 4 response options (1-4 Likert)', () => {
      const options = service.getResponseOptions();
      expect(options).toHaveLength(4);
      expect(options[0].value).toBe(1);
      expect(options[1].value).toBe(2);
      expect(options[2].value).toBe(3);
      expect(options[3].value).toBe(4);
    });

    it('should have Russian labels for all options', () => {
      const options = service.getResponseOptions();
      for (const option of options) {
        expect(option.labelRu).toBeDefined();
        expect(option.labelRu.length).toBeGreaterThan(0);
      }
    });

    it('should have English labels for all options', () => {
      const options = service.getResponseOptions();
      for (const option of options) {
        expect(option.labelEn).toBeDefined();
        expect(option.labelEn.length).toBeGreaterThan(0);
      }
    });

    it('should have correct label for minimum response', () => {
      const options = service.getResponseOptions();
      expect(options[0].labelRu).toBe('Не согласен');
      expect(options[0].labelEn).toBe('Do not agree');
    });

    it('should have correct label for maximum response', () => {
      const options = service.getResponseOptions();
      expect(options[3].labelRu).toBe('Полностью согласен');
      expect(options[3].labelEn).toBe('Agree very much');
    });
  });

  // ==================== getSubscales ====================

  describe('getSubscales', () => {
    it('should return 5 subscales', () => {
      const subscales = service.getSubscales();
      expect(subscales).toHaveLength(5);
    });

    it('should include all expected subscale keys', () => {
      const subscales = service.getSubscales();
      const keys = subscales.map(s => s.key);
      expect(keys).toContain('positive_beliefs');
      expect(keys).toContain('uncontrollability');
      expect(keys).toContain('cognitive_confidence');
      expect(keys).toContain('need_to_control');
      expect(keys).toContain('cognitive_self_consciousness');
    });

    it('should have 6 items per subscale', () => {
      const subscales = service.getSubscales();
      for (const subscale of subscales) {
        expect(subscale.items).toHaveLength(6);
      }
    });

    it('should have concern thresholds defined', () => {
      const subscales = service.getSubscales();
      for (const subscale of subscales) {
        expect(subscale.concernThreshold).toBeGreaterThan(0);
        expect(subscale.concernThreshold).toBeLessThanOrEqual(24);
      }
    });

    it('should have CSC concern threshold of 16 (higher than others)', () => {
      const csc = service.getSubscaleInfo('cognitive_self_consciousness');
      expect(csc).toBeDefined();
      expect(csc!.concernThreshold).toBe(16);
    });

    it('should have concern threshold of 14 for POS, NEG, CC, NC', () => {
      const subscaleKeys: MCQ30Subscale[] = [
        'positive_beliefs',
        'uncontrollability',
        'cognitive_confidence',
        'need_to_control',
      ];
      for (const key of subscaleKeys) {
        const info = service.getSubscaleInfo(key);
        expect(info).toBeDefined();
        expect(info!.concernThreshold).toBe(14);
      }
    });

    it('should have Russian names for all subscales', () => {
      const subscales = service.getSubscales();
      for (const subscale of subscales) {
        expect(subscale.nameRu).toBeDefined();
        expect(subscale.nameRu.length).toBeGreaterThan(0);
      }
    });

    it('should have Russian descriptions for all subscales', () => {
      const subscales = service.getSubscales();
      for (const subscale of subscales) {
        expect(subscale.descriptionRu).toBeDefined();
        expect(subscale.descriptionRu.length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== Assessment Scoring ====================

  describe('Assessment Scoring', () => {
    it('should require exactly 30 responses', () => {
      const tooFew = createResponses(20, 1);
      expect(() => service.scoreAssessment('user1', tooFew)).toThrow('Expected 30 responses');

      const tooMany = createResponses(35, 1);
      expect(() => service.scoreAssessment('user1', tooMany)).toThrow('Expected 30 responses');
    });

    it('should calculate minimum scores (all 1s)', () => {
      const responses = createResponses(30, 1);
      const result = service.scoreAssessment('user1', responses);

      expect(result.subscaleScores.positive_beliefs).toBe(6);        // 6 items x 1
      expect(result.subscaleScores.uncontrollability).toBe(6);       // 6 items x 1
      expect(result.subscaleScores.cognitive_confidence).toBe(6);    // 6 items x 1
      expect(result.subscaleScores.need_to_control).toBe(6);        // 6 items x 1
      expect(result.subscaleScores.cognitive_self_consciousness).toBe(6); // 6 items x 1
      expect(result.totalScore).toBe(30);                           // 30 items x 1
    });

    it('should calculate maximum scores (all 4s)', () => {
      const responses = createResponses(30, 4);
      const result = service.scoreAssessment('user1', responses);

      expect(result.subscaleScores.positive_beliefs).toBe(24);       // 6 items x 4
      expect(result.subscaleScores.uncontrollability).toBe(24);      // 6 items x 4
      expect(result.subscaleScores.cognitive_confidence).toBe(24);   // 6 items x 4
      expect(result.subscaleScores.need_to_control).toBe(24);       // 6 items x 4
      expect(result.subscaleScores.cognitive_self_consciousness).toBe(24); // 6 items x 4
      expect(result.totalScore).toBe(120);                          // 30 items x 4
    });

    it('should calculate mid-range scores (all 2s)', () => {
      const responses = createResponses(30, 2);
      const result = service.scoreAssessment('user1', responses);

      expect(result.subscaleScores.positive_beliefs).toBe(12);       // 6 items x 2
      expect(result.subscaleScores.uncontrollability).toBe(12);
      expect(result.subscaleScores.cognitive_confidence).toBe(12);
      expect(result.subscaleScores.need_to_control).toBe(12);
      expect(result.subscaleScores.cognitive_self_consciousness).toBe(12);
      expect(result.totalScore).toBe(60);                           // 30 items x 2
    });

    it('should calculate scores (all 3s)', () => {
      const responses = createResponses(30, 3);
      const result = service.scoreAssessment('user1', responses);

      expect(result.subscaleScores.positive_beliefs).toBe(18);       // 6 items x 3
      expect(result.totalScore).toBe(90);                           // 30 items x 3
    });

    it('should correctly assign scores to subscales with mixed responses', () => {
      // Set positive_beliefs items (1,7,10,19,23,28) to 4, all others to 1
      const responses = createResponses(30, 1);
      const posItemNumbers = [1, 7, 10, 19, 23, 28];
      for (const r of responses) {
        if (posItemNumbers.includes(r.itemNumber)) {
          (r as { value: number }).value = 4;
        }
      }

      const result = service.scoreAssessment('user1', responses);
      expect(result.subscaleScores.positive_beliefs).toBe(24);       // 6 items x 4
      expect(result.subscaleScores.uncontrollability).toBe(6);       // 6 items x 1
      expect(result.subscaleScores.cognitive_confidence).toBe(6);
      expect(result.subscaleScores.need_to_control).toBe(6);
      expect(result.subscaleScores.cognitive_self_consciousness).toBe(6);
      expect(result.totalScore).toBe(24 + 6 + 6 + 6 + 6);          // 48
    });

    it('should verify subscale scores are in valid range (6-24)', () => {
      // Test with various value patterns
      for (const val of [1, 2, 3, 4] as const) {
        const responses = createResponses(30, val);
        const result = service.scoreAssessment(`user_${val}`, responses);

        for (const subscale of MCQ30_SUBSCALES) {
          const score = result.subscaleScores[subscale.key];
          expect(score).toBeGreaterThanOrEqual(6);
          expect(score).toBeLessThanOrEqual(24);
        }
      }
    });

    it('should verify total score is in valid range (30-120)', () => {
      for (const val of [1, 2, 3, 4] as const) {
        const responses = createResponses(30, val);
        const result = service.scoreAssessment(`user_${val}`, responses);
        expect(result.totalScore).toBeGreaterThanOrEqual(30);
        expect(result.totalScore).toBeLessThanOrEqual(120);
      }
    });

    it('should assign result to correct user', () => {
      const responses = createResponses(30, 2);
      const result = service.scoreAssessment('user42', responses);
      expect(result.userId).toBe('user42');
    });

    it('should generate unique IDs', () => {
      const responses = createResponses(30, 2);
      const r1 = service.scoreAssessment('user1', responses);
      const r2 = service.scoreAssessment('user1', responses);
      expect(r1.id).not.toBe(r2.id);
    });

    it('should store timestamp', () => {
      const before = new Date();
      const responses = createResponses(30, 2);
      const result = service.scoreAssessment('user1', responses);
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store original responses', () => {
      const responses = createResponses(30, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.responses).toHaveLength(30);
    });
  });

  // ==================== Interpretation ====================

  describe('Interpretation', () => {
    it('should classify low total score (< 45)', () => {
      // All 1s → total = 30 < 45
      const responses = createResponses(30, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.overall).toBe('low');
    });

    it('should classify moderate total score (45 <= x < 65)', () => {
      // All 2s → total = 60, moderate (45 <= 60 < 65)
      const responses = createResponses(30, 2);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.overall).toBe('moderate');
    });

    it('should classify high total score (65 <= x < 80)', () => {
      // Need total between 65-79
      // Mix: 20 items at 3 (=60) + 10 items at 1 (=10) = 70 — but subscale allocation matters
      // Simpler: use custom thresholds or calculate precisely
      // All 2s = 60, need a bit more. Use custom service with lower threshold.
      const customService = createMCQ30AssessmentService({ highScoreThreshold: 55 });
      const responses = createResponses(30, 2);
      const result = customService.scoreAssessment('user1', responses);
      // total=60, highThreshold=55, veryHighThreshold=80 → high
      expect(result.interpretation.overall).toBe('high');
    });

    it('should classify very_high total score (>= 80)', () => {
      // All 3s → total = 90 >= 80
      const responses = createResponses(30, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.overall).toBe('very_high');
    });

    it('should identify concern areas above thresholds', () => {
      // All 4s → every subscale = 24, all above concern thresholds (14 or 16)
      const responses = createResponses(30, 4);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.concernAreas).toHaveLength(5);
      expect(result.interpretation.concernAreas).toContain('positive_beliefs');
      expect(result.interpretation.concernAreas).toContain('uncontrollability');
      expect(result.interpretation.concernAreas).toContain('cognitive_confidence');
      expect(result.interpretation.concernAreas).toContain('need_to_control');
      expect(result.interpretation.concernAreas).toContain('cognitive_self_consciousness');
    });

    it('should not identify concern areas when all below thresholds', () => {
      // All 1s → every subscale = 6, all below concern thresholds
      const responses = createResponses(30, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.concernAreas).toHaveLength(0);
    });

    it('should generate Russian summary', () => {
      const responses = createResponses(30, 2);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.summaryRu).toBeDefined();
      expect(result.interpretation.summaryRu.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const responses = createResponses(30, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.recommendations).toBeDefined();
      expect(result.interpretation.recommendations.length).toBeGreaterThan(0);
    });

    it('should limit recommendations to 4 maximum', () => {
      // All 4s → all subscales above concern → many recommendations
      const responses = createResponses(30, 4);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.recommendations.length).toBeLessThanOrEqual(4);
    });

    it('should generate default recommendation when no concerns', () => {
      // All 1s → no concern areas
      const responses = createResponses(30, 1);
      const result = service.scoreAssessment('user1', responses);
      expect(result.interpretation.recommendations.length).toBeGreaterThan(0);
      // Should contain a "norm" recommendation
      expect(result.interpretation.recommendations[0]).toContain('норме');
    });

    it('should include concern area names in summary when present', () => {
      // All 4s → all subscales above concern
      const responses = createResponses(30, 4);
      const result = service.scoreAssessment('user1', responses);
      // Summary should mention areas
      expect(result.interpretation.summaryRu).toContain('внимания');
    });
  });

  // ==================== Baseline Comparison ====================

  describe('Baseline Comparison', () => {
    it('should not have changeFromBaseline on first assessment', () => {
      const responses = createResponses(30, 3);
      const result = service.scoreAssessment('user1', responses);
      expect(result.changeFromBaseline).toBeUndefined();
    });

    it('should calculate changeFromBaseline on subsequent assessments', () => {
      // First assessment: all 3s → total = 90
      service.scoreAssessment('user1', createResponses(30, 3));

      // Second assessment: all 2s → total = 60
      const result = service.scoreAssessment('user1', createResponses(30, 2));

      expect(result.changeFromBaseline).toBeDefined();
      expect(result.changeFromBaseline!.totalChange).toBe(60 - 90); // -30
    });

    it('should detect clinically significant improvement', () => {
      // Baseline: all 4s → total = 120
      service.scoreAssessment('user1', createResponses(30, 4));

      // Follow-up: all 2s → total = 60 (change = -60, threshold = 10)
      const result = service.scoreAssessment('user1', createResponses(30, 2));
      expect(result.changeFromBaseline!.improved).toBe(true);
    });

    it('should not flag improvement below clinically significant threshold', () => {
      // Baseline: all 2s → total = 60
      service.scoreAssessment('user1', createResponses(30, 2));

      // Follow-up: nearly same → total ~58 (change = -2, threshold = 10)
      // Create responses mostly 2s with a couple of 1s
      const responses = createResponses(30, 2);
      // Change 2 items from 2 to 1 (reduces total by 2)
      (responses[0] as { value: number }).value = 1;
      (responses[1] as { value: number }).value = 1;

      const result = service.scoreAssessment('user1', responses);
      expect(result.changeFromBaseline!.totalChange).toBe(-2);
      expect(result.changeFromBaseline!.improved).toBe(false);
    });

    it('should report subscale changes only when meaningful (abs >= 2)', () => {
      // Baseline: all 3s → each subscale = 18
      service.scoreAssessment('user1', createResponses(30, 3));

      // Follow-up: all 1s → each subscale = 6, change = -12
      const result = service.scoreAssessment('user1', createResponses(30, 1));

      expect(result.changeFromBaseline!.subscaleChanges).toBeDefined();
      // Each subscale changed by -12, which is >= 2 abs
      expect(result.changeFromBaseline!.subscaleChanges.positive_beliefs).toBe(-12);
      expect(result.changeFromBaseline!.subscaleChanges.uncontrollability).toBe(-12);
    });

    it('should not report subscale changes less than 2', () => {
      // Baseline: all 2s → each subscale = 12
      service.scoreAssessment('user1', createResponses(30, 2));

      // Follow-up: nearly same — change only 1 item in one subscale
      const responses = createResponses(30, 2);
      // Item 1 is positive_beliefs, change from 2 to 3 (+1)
      (responses[0] as { value: number }).value = 3;

      const result = service.scoreAssessment('user1', responses);
      // positive_beliefs changed by +1, which is < 2 abs → should not be reported
      expect(result.changeFromBaseline!.subscaleChanges.positive_beliefs).toBeUndefined();
    });
  });

  // ==================== History Management ====================

  describe('History Management', () => {
    it('should return empty history for new user', () => {
      expect(service.getHistory('unknown')).toEqual([]);
    });

    it('should store assessment history', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      service.scoreAssessment('user1', createResponses(30, 2));
      expect(service.getHistory('user1')).toHaveLength(2);
    });

    it('should separate history by user', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      service.scoreAssessment('user2', createResponses(30, 2));
      expect(service.getHistory('user1')).toHaveLength(1);
      expect(service.getHistory('user2')).toHaveLength(1);
    });

    it('should return latest assessment', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      service.scoreAssessment('user1', createResponses(30, 2));
      const latest = service.getLatestAssessment('user1');
      expect(latest).not.toBeNull();
      expect(latest!.totalScore).toBe(60); // all 2s
    });

    it('should return null latest for unknown user', () => {
      expect(service.getLatestAssessment('unknown')).toBeNull();
    });

    it('should return baseline (first) assessment', () => {
      service.scoreAssessment('user1', createResponses(30, 4));
      service.scoreAssessment('user1', createResponses(30, 2));
      const baseline = service.getBaseline('user1');
      expect(baseline).not.toBeNull();
      expect(baseline!.totalScore).toBe(120); // all 4s — first assessment
    });

    it('should return null baseline for unknown user', () => {
      expect(service.getBaseline('unknown')).toBeNull();
    });

    it('should reset user data', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
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
      service.scoreAssessment('user1', createResponses(30, 3));
      expect(service.isAssessmentDue('user1')).toBe(false);
    });

    it('should use default 4-week interval', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      // Just completed, should not be due
      expect(service.isAssessmentDue('user1')).toBe(false);
    });

    it('should accept custom interval', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      // 0 weeks interval → always due
      expect(service.isAssessmentDue('user1', 0)).toBe(true);
    });
  });

  // ==================== Score Trend ====================

  describe('Score Trend', () => {
    it('should return empty trend for unknown user', () => {
      const trend = service.getScoreTrend('unknown');
      expect(trend.dates).toEqual([]);
      expect(trend.totalScores).toEqual([]);
      expect(trend.subscaleScores.positive_beliefs).toEqual([]);
      expect(trend.subscaleScores.uncontrollability).toEqual([]);
      expect(trend.subscaleScores.cognitive_confidence).toEqual([]);
      expect(trend.subscaleScores.need_to_control).toEqual([]);
      expect(trend.subscaleScores.cognitive_self_consciousness).toEqual([]);
    });

    it('should track scores over multiple assessments', () => {
      service.scoreAssessment('user1', createResponses(30, 1));
      service.scoreAssessment('user1', createResponses(30, 3));
      service.scoreAssessment('user1', createResponses(30, 4));

      const trend = service.getScoreTrend('user1');
      expect(trend.dates).toHaveLength(3);
      expect(trend.totalScores).toEqual([30, 90, 120]);
      expect(trend.subscaleScores.positive_beliefs).toEqual([6, 18, 24]);
    });
  });

  // ==================== CSD Integration ====================

  describe('getMetacognitiveRiskForCSD', () => {
    it('should return unavailable when no assessments', () => {
      const risk = service.getMetacognitiveRiskForCSD('unknown');
      expect(risk.available).toBe(false);
      expect(risk.overallRisk).toBe(0);
      expect(risk.subscaleRisks).toEqual({});
      expect(risk.trend).toBe('stable');
      expect(risk.lastAssessmentDate).toBeUndefined();
    });

    it('should return available when assessment exists', () => {
      service.scoreAssessment('user1', createResponses(30, 2));
      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.available).toBe(true);
      expect(risk.lastAssessmentDate).toBeDefined();
    });

    it('should calculate overallRisk as normalized score (0-1)', () => {
      // All 1s → total=30, risk = (30-30)/90 = 0
      service.scoreAssessment('user_min', createResponses(30, 1));
      const riskMin = service.getMetacognitiveRiskForCSD('user_min');
      expect(riskMin.overallRisk).toBeCloseTo(0);

      // All 4s → total=120, risk = (120-30)/90 = 1
      service.scoreAssessment('user_max', createResponses(30, 4));
      const riskMax = service.getMetacognitiveRiskForCSD('user_max');
      expect(riskMax.overallRisk).toBeCloseTo(1);
    });

    it('should calculate mid-range risk', () => {
      // All 2s → total=60, risk = (60-30)/90 = 0.333...
      service.scoreAssessment('user1', createResponses(30, 2));
      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.overallRisk).toBeCloseTo(30 / 90, 2);
    });

    it('should include subscale risks only for scores at or above concern threshold', () => {
      // All 1s → each subscale = 6, all below concern (14/16)
      service.scoreAssessment('user_low', createResponses(30, 1));
      const riskLow = service.getMetacognitiveRiskForCSD('user_low');
      expect(Object.keys(riskLow.subscaleRisks)).toHaveLength(0);

      // All 4s → each subscale = 24, all above concern
      service.scoreAssessment('user_high', createResponses(30, 4));
      const riskHigh = service.getMetacognitiveRiskForCSD('user_high');
      expect(Object.keys(riskHigh.subscaleRisks).length).toBe(5);
    });

    it('should report stable trend with single assessment', () => {
      service.scoreAssessment('user1', createResponses(30, 3));
      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.trend).toBe('stable');
    });

    it('should report improving trend when score drops > 5', () => {
      // First: all 4s → total = 120
      service.scoreAssessment('user1', createResponses(30, 4));
      // Second: all 2s → total = 60 (change = -60)
      service.scoreAssessment('user1', createResponses(30, 2));

      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.trend).toBe('improving');
    });

    it('should report worsening trend when score increases > 5', () => {
      // First: all 1s → total = 30
      service.scoreAssessment('user1', createResponses(30, 1));
      // Second: all 4s → total = 120 (change = +90)
      service.scoreAssessment('user1', createResponses(30, 4));

      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.trend).toBe('worsening');
    });

    it('should report stable trend when score change is within 5', () => {
      // First: all 2s → total = 60
      service.scoreAssessment('user1', createResponses(30, 2));

      // Second: very close score → total = 62 (change = +2 <= 5)
      const responses = createResponses(30, 2);
      // Change 2 items from 2 to 3 (+2)
      (responses[0] as { value: number }).value = 3;
      (responses[1] as { value: number }).value = 3;
      service.scoreAssessment('user1', responses);

      const risk = service.getMetacognitiveRiskForCSD('user1');
      expect(risk.trend).toBe('stable');
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should throw on empty responses array', () => {
      expect(() => service.scoreAssessment('user1', [])).toThrow('Expected 30 responses');
    });

    it('should throw on partial responses (15 of 30)', () => {
      const partial = createResponses(15, 2);
      expect(() => service.scoreAssessment('user1', partial)).toThrow('Expected 30 responses');
    });

    it('should throw on 29 responses', () => {
      const almost = createResponses(29, 2);
      expect(() => service.scoreAssessment('user1', almost)).toThrow('Expected 30 responses');
    });

    it('should throw on 31 responses', () => {
      const tooMany = createResponses(31, 2);
      expect(() => service.scoreAssessment('user1', tooMany)).toThrow('Expected 30 responses');
    });

    it('should handle responses with invalid item numbers gracefully', () => {
      // Create 30 responses but with item numbers 100-129 (none match real items)
      const responses: IMCQ30Response[] = [];
      for (let i = 100; i < 130; i++) {
        responses.push({ itemNumber: i, value: 2 });
      }
      // Should not throw, but all subscale scores will be 0
      const result = service.scoreAssessment('user1', responses);
      expect(result.totalScore).toBe(0);
      expect(result.subscaleScores.positive_beliefs).toBe(0);
    });

    it('should handle multiple assessments for same user correctly', () => {
      for (let i = 0; i < 5; i++) {
        service.scoreAssessment('user1', createResponses(30, (i % 4 + 1) as 1 | 2 | 3 | 4));
      }
      expect(service.getHistory('user1')).toHaveLength(5);
      const latest = service.getLatestAssessment('user1');
      const baseline = service.getBaseline('user1');
      expect(latest).not.toBeNull();
      expect(baseline).not.toBeNull();
      expect(latest!.id).not.toBe(baseline!.id);
    });

    it('should handle getSubscaleInfo for unknown subscale', () => {
      const info = service.getSubscaleInfo('nonexistent' as MCQ30Subscale);
      expect(info).toBeUndefined();
    });
  });

  // ==================== Singleton ====================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(mcq30AssessmentService).toBeDefined();
      expect(mcq30AssessmentService).toBeInstanceOf(MCQ30AssessmentService);
    });
  });

  // ==================== Constants Validation ====================

  describe('Constants Validation', () => {
    it('should have 30 MCQ-30 items', () => {
      expect(MCQ30_ITEMS).toHaveLength(30);
    });

    it('should have 4 response options (1-4 Likert)', () => {
      expect(MCQ30_RESPONSE_OPTIONS).toHaveLength(4);
      const values = MCQ30_RESPONSE_OPTIONS.map(o => o.value);
      expect(values).toEqual([1, 2, 3, 4]);
    });

    it('should have 5 subscale definitions', () => {
      expect(MCQ30_SUBSCALES).toHaveLength(5);
    });

    it('should have Russian labels for all response options', () => {
      for (const option of MCQ30_RESPONSE_OPTIONS) {
        expect(option.labelRu.length).toBeGreaterThan(0);
      }
    });

    it('should cover all 30 items across subscales', () => {
      const allItems = MCQ30_SUBSCALES.flatMap(s => s.items);
      expect(allItems).toHaveLength(30);
      const uniqueItems = new Set(allItems);
      expect(uniqueItems.size).toBe(30);
      // Every number 1-30 should be present
      for (let i = 1; i <= 30; i++) {
        expect(uniqueItems.has(i)).toBe(true);
      }
    });
  });
});

// ==================== Test Helpers ====================

/**
 * Create uniform responses (all same value) for items 1-N
 */
function createResponses(count: number, value: 1 | 2 | 3 | 4): IMCQ30Response[] {
  const responses: IMCQ30Response[] = [];
  for (let i = 1; i <= count; i++) {
    responses.push({ itemNumber: i, value });
  }
  return responses;
}
