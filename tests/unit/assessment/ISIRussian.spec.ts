/**
 * ISIRussian (Insomnia Severity Index) Unit Tests
 * Tests the Russian-validated ISI assessment instrument
 */

import {
  ISIAssessment,
  ISI_CUTOFFS,
  ISI_MCID,
  ISI_RESPONSE_THRESHOLD,
  ISI_REMISSION_CUTOFF,
  ISI_ITEMS,
  ISI_RUSSIAN_PSYCHOMETRICS,
} from '../../../src/assessment/instruments/ISIRussian';
import {
  createISIResponse,
  createISIResponseFromPattern,
  createISIResponseWithScore,
  calculateExpectedScore,
  getExpectedSeverity,
} from '../../helpers';

describe('ISIAssessment', () => {
  describe('score()', () => {
    it('should calculate correct total score', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 2,
        q2_stayingAsleep: 3,
        q3_earlyWaking: 1,
        q4_satisfaction: 2,
        q5_interference: 2,
        q6_noticeability: 1,
        q7_distress: 2,
      });

      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBe(13); // 2+3+1+2+2+1+2
    });

    it('should return score in valid range (0-28)', () => {
      // Test minimum
      const minResponse = createISIResponseWithScore(0);
      expect(ISIAssessment.score(minResponse).totalScore).toBe(0);

      // Test maximum
      const maxResponse = createISIResponseWithScore(28);
      expect(ISIAssessment.score(maxResponse).totalScore).toBe(28);
    });

    it('should calculate subscales correctly', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 3,
        q2_stayingAsleep: 2,
        q3_earlyWaking: 1,
        q4_satisfaction: 3,
        q5_interference: 2,
        q6_noticeability: 4,
        q7_distress: 3,
      });

      const result = ISIAssessment.score(response);

      expect(result.subscales.sleepProblems).toBe(6);  // Q1+Q2+Q3
      expect(result.subscales.impact).toBe(5);          // Q4+Q5
      expect(result.subscales.distress).toBe(7);        // Q6+Q7
    });
  });

  describe('getSeverity()', () => {
    it.each([
      [0, 'no_insomnia'],
      [7, 'no_insomnia'],
      [8, 'subthreshold'],
      [14, 'subthreshold'],
      [15, 'moderate'],
      [21, 'moderate'],
      [22, 'severe'],
      [28, 'severe'],
    ])('should classify score %i as %s', (score, expectedSeverity) => {
      expect(ISIAssessment.getSeverity(score)).toBe(expectedSeverity);
    });

    it('should match ISI_CUTOFFS constants', () => {
      // Test boundary values from cutoffs
      expect(ISIAssessment.getSeverity(ISI_CUTOFFS.NO_INSOMNIA.max)).toBe('no_insomnia');
      expect(ISIAssessment.getSeverity(ISI_CUTOFFS.SUBTHRESHOLD.min)).toBe('subthreshold');
      expect(ISIAssessment.getSeverity(ISI_CUTOFFS.MODERATE.min)).toBe('moderate');
      expect(ISIAssessment.getSeverity(ISI_CUTOFFS.SEVERE.min)).toBe('severe');
    });
  });

  describe('getSeverityLabel()', () => {
    it('should return Russian labels', () => {
      expect(ISIAssessment.getSeverityLabel('no_insomnia')).toContain('Нет');
      expect(ISIAssessment.getSeverityLabel('subthreshold')).toContain('Подпороговая');
      expect(ISIAssessment.getSeverityLabel('moderate')).toContain('Умеренная');
      expect(ISIAssessment.getSeverityLabel('severe')).toContain('Тяжёлая');
    });
  });

  describe('pattern-based scoring', () => {
    it('should score no_insomnia pattern in 0-7 range', () => {
      const response = createISIResponseFromPattern('no_insomnia');
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBeLessThanOrEqual(7);
      expect(result.severity).toBe('no_insomnia');
    });

    it('should score subthreshold pattern in 8-14 range', () => {
      const response = createISIResponseFromPattern('subthreshold');
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBeGreaterThanOrEqual(8);
      expect(result.totalScore).toBeLessThanOrEqual(14);
      expect(result.severity).toBe('subthreshold');
    });

    it('should score moderate pattern in 15-21 range', () => {
      const response = createISIResponseFromPattern('moderate');
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBeGreaterThanOrEqual(15);
      expect(result.totalScore).toBeLessThanOrEqual(21);
      expect(result.severity).toBe('moderate');
    });

    it('should score severe pattern in 22-28 range', () => {
      const response = createISIResponseFromPattern('severe');
      const result = ISIAssessment.score(response);

      expect(result.totalScore).toBeGreaterThanOrEqual(22);
      expect(result.severity).toBe('severe');
    });
  });

  describe('clinical thresholds', () => {
    it('should identify clinical insomnia (score >= 8)', () => {
      const subthreshold = createISIResponseFromPattern('subthreshold');
      const noInsomnia = createISIResponseFromPattern('no_insomnia');

      expect(ISIAssessment.score(subthreshold).isClinical).toBe(true);
      expect(ISIAssessment.score(noInsomnia).isClinical).toBe(false);
    });
  });

  describe('isResponder()', () => {
    it('should return true for reduction >= 8 points', () => {
      expect(ISIAssessment.isResponder(20, 10)).toBe(true);
      expect(ISIAssessment.isResponder(24, 16)).toBe(true);
    });

    it('should return false for reduction < 8 points', () => {
      expect(ISIAssessment.isResponder(20, 15)).toBe(false);
      expect(ISIAssessment.isResponder(15, 10)).toBe(false);
    });

    it('should match ISI_RESPONSE_THRESHOLD constant', () => {
      expect(ISI_RESPONSE_THRESHOLD).toBe(8);
      expect(ISIAssessment.isResponder(18, 10)).toBe(true); // Exactly 8
      expect(ISIAssessment.isResponder(18, 11)).toBe(false); // Only 7
    });
  });

  describe('isRemission()', () => {
    it('should return true for score <= 7', () => {
      expect(ISIAssessment.isRemission(7)).toBe(true);
      expect(ISIAssessment.isRemission(0)).toBe(true);
      expect(ISIAssessment.isRemission(5)).toBe(true);
    });

    it('should return false for score > 7', () => {
      expect(ISIAssessment.isRemission(8)).toBe(false);
      expect(ISIAssessment.isRemission(15)).toBe(false);
    });

    it('should match ISI_REMISSION_CUTOFF constant', () => {
      expect(ISI_REMISSION_CUTOFF).toBe(7);
    });
  });

  describe('isClinicallyMeaningfulChange()', () => {
    it('should return true for change >= 6 points', () => {
      expect(ISIAssessment.isClinicallyMeaningfulChange(20, 14)).toBe(true);
      expect(ISIAssessment.isClinicallyMeaningfulChange(10, 20)).toBe(true); // Worsening
    });

    it('should return false for change < 6 points', () => {
      expect(ISIAssessment.isClinicallyMeaningfulChange(20, 15)).toBe(false);
    });

    it('should match ISI_MCID constant', () => {
      expect(ISI_MCID).toBe(6);
    });
  });

  describe('checkResponseQuality()', () => {
    it('should return valid for normal responses', () => {
      const response = createISIResponseFromPattern('moderate');
      const result = ISIAssessment.score(response);

      expect(result.responseQuality).toBe('valid');
    });

    it('should return suspect for all-same responses (response set)', () => {
      const response = createISIResponse({
        q1_fallingAsleep: 3,
        q2_stayingAsleep: 3,
        q3_earlyWaking: 3,
        q4_satisfaction: 3,
        q5_interference: 3,
        q6_noticeability: 3,
        q7_distress: 3,
      });

      const result = ISIAssessment.score(response);

      expect(result.responseQuality).toBe('suspect');
    });

    it('should return valid for all-zero responses (true no insomnia)', () => {
      const response = createISIResponseWithScore(0);
      const result = ISIAssessment.score(response);

      expect(result.responseQuality).toBe('valid');
    });

    it('should return suspect for inconsistent responses', () => {
      // High problems but no distress
      const inconsistent = createISIResponse({
        q1_fallingAsleep: 4,
        q2_stayingAsleep: 4,
        q3_earlyWaking: 3,
        q4_satisfaction: 0,
        q5_interference: 0,
        q6_noticeability: 0,
        q7_distress: 0,
      });

      const result = ISIAssessment.score(inconsistent);

      expect(result.responseQuality).toBe('suspect');
    });
  });

  describe('getRecommendations()', () => {
    it('should provide recommendations for each severity level', () => {
      const patterns = ['no_insomnia', 'subthreshold', 'moderate', 'severe'] as const;

      for (const pattern of patterns) {
        const response = createISIResponseFromPattern(pattern);
        const result = ISIAssessment.score(response);

        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should recommend CBT-I for moderate insomnia', () => {
      const response = createISIResponseFromPattern('moderate');
      const result = ISIAssessment.score(response);

      const hasCBTI = result.recommendations.some(r =>
        r.toLowerCase().includes('кпт') || r.toLowerCase().includes('cbt')
      );
      expect(hasCBTI).toBe(true);
    });

    it('should urgently recommend specialist for severe insomnia', () => {
      const response = createISIResponseFromPattern('severe');
      const result = ISIAssessment.score(response);

      const hasUrgent = result.recommendations.some(r =>
        r.includes('СРОЧНО') || r.includes('сомнолог')
      );
      expect(hasUrgent).toBe(true);
    });

    it('should add subscale-specific recommendations', () => {
      // High distress
      const highDistress = createISIResponse({
        q1_fallingAsleep: 2,
        q2_stayingAsleep: 2,
        q3_earlyWaking: 2,
        q4_satisfaction: 2,
        q5_interference: 2,
        q6_noticeability: 3,
        q7_distress: 4,
      });

      const result = ISIAssessment.score(highDistress);

      const hasCognitiveRec = result.recommendations.some(r =>
        r.includes('когнитивн') || r.includes('mindfulness')
      );
      expect(hasCognitiveRec).toBe(true);
    });
  });

  describe('getPercentileRank()', () => {
    it('should return valid percentile values', () => {
      expect(ISIAssessment.getPercentileRank(5)).toBe(10);
      expect(ISIAssessment.getPercentileRank(12)).toBe(25);
      expect(ISIAssessment.getPercentileRank(18)).toBe(50);
      expect(ISIAssessment.getPercentileRank(23)).toBe(90);
      expect(ISIAssessment.getPercentileRank(27)).toBe(95);
    });
  });

  describe('generateReport()', () => {
    it('should generate Russian-language report', () => {
      const response = createISIResponseFromPattern('moderate');
      const report = ISIAssessment.generateReport(response);

      expect(report).toContain('ИНДЕКС ТЯЖЕСТИ БЕССОННИЦЫ');
      expect(report).toContain('РЕЗУЛЬТАТЫ');
      expect(report).toContain('СУБШКАЛЫ');
      expect(report).toContain('ИНТЕРПРЕТАЦИЯ');
      expect(report).toContain('РЕКОМЕНДАЦИИ');
    });

    it('should include treatment dynamics when baseline provided', () => {
      const response = createISIResponseFromPattern('subthreshold');
      const report = ISIAssessment.generateReport(response, 22);

      expect(report).toContain('ДИНАМИКА ЛЕЧЕНИЯ');
      expect(report).toContain('Исходный балл: 22');
    });

    it('should show response status in treatment dynamics', () => {
      const response = createISIResponseWithScore(10);
      const report = ISIAssessment.generateReport(response, 22);

      expect(report).toContain('Ответ на лечение: Да');
    });
  });

  describe('getQuestionnaire()', () => {
    it('should return all 7 ISI items', () => {
      const items = ISIAssessment.getQuestionnaire();

      expect(items).toHaveLength(7);
    });

    it('should have Russian and English text for each item', () => {
      const items = ISIAssessment.getQuestionnaire();

      for (const item of items) {
        expect(item.textRu).toBeDefined();
        expect(item.textEn).toBeDefined();
        expect(item.anchorsRu).toHaveLength(5);
        expect(item.anchorsEn).toHaveLength(5);
      }
    });
  });

  describe('psychometric properties', () => {
    it('should have documented validation data', () => {
      expect(ISI_RUSSIAN_PSYCHOMETRICS.reliability.cronbachAlpha).toBe(0.77);
      expect(ISI_RUSSIAN_PSYCHOMETRICS.validity.sensitivity).toBe(0.902);
      expect(ISI_RUSSIAN_PSYCHOMETRICS.validity.specificity).toBe(0.952);
    });

    it('should have all 7 items defined', () => {
      expect(ISI_ITEMS).toHaveLength(7);
    });
  });

  describe('helper function consistency', () => {
    it('calculateExpectedScore should match ISIAssessment.score', () => {
      const response = createISIResponseFromPattern('moderate');

      const expected = calculateExpectedScore(response);
      const actual = ISIAssessment.score(response).totalScore;

      expect(expected).toBe(actual);
    });

    it('getExpectedSeverity should match ISIAssessment.getSeverity', () => {
      for (let score = 0; score <= 28; score++) {
        const expected = getExpectedSeverity(score);
        const actual = ISIAssessment.getSeverity(score);

        expect(expected).toBe(actual);
      }
    });
  });
});
