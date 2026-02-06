/**
 * SleepRules Unit Tests
 * =====================
 * Tests for CBT-I sleep rules utility functions.
 *
 * @module @sleepcore/cognitive/data
 */

import {
  SLEEP_RULES,
  getRulesByCategory,
  getRuleById,
  getRelatedRules,
  getRulesByDifficulty,
  getBeginnerRules,
  getCategoryStats,
} from '../../../../src/cognitive/data/SleepRules';
import type { SleepRuleCategory } from '../../../../src/cognitive/interfaces/ICognitiveConsolidation';

describe('SleepRules', () => {
  describe('SLEEP_RULES constant', () => {
    it('should contain all expected categories', () => {
      const categories = new Set(SLEEP_RULES.map((r) => r.category));

      expect(categories.has('stimulus_control')).toBe(true);
      expect(categories.has('sleep_restriction')).toBe(true);
      expect(categories.has('sleep_hygiene')).toBe(true);
      expect(categories.has('cognitive')).toBe(true);
      expect(categories.has('relaxation')).toBe(true);
    });

    it('should have unique IDs for all rules', () => {
      const ids = SLEEP_RULES.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid difficulty levels (1-5)', () => {
      for (const rule of SLEEP_RULES) {
        expect(rule.difficulty).toBeGreaterThanOrEqual(1);
        expect(rule.difficulty).toBeLessThanOrEqual(5);
      }
    });

    it('should have non-empty required fields', () => {
      for (const rule of SLEEP_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.statement).toBeTruthy();
        expect(rule.explanation).toBeTruthy();
        expect(rule.visualizationPrompt).toBeTruthy();
        expect(rule.rationale).toBeTruthy();
      }
    });

    it('should have valid relatedRuleIds pointing to existing rules', () => {
      const allIds = new Set(SLEEP_RULES.map((r) => r.id));

      for (const rule of SLEEP_RULES) {
        for (const relatedId of rule.relatedRuleIds) {
          expect(allIds.has(relatedId)).toBe(true);
        }
      }
    });
  });

  describe('getRulesByCategory', () => {
    it('should return stimulus_control rules', () => {
      const rules = getRulesByCategory('stimulus_control');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === 'stimulus_control')).toBe(true);
    });

    it('should return sleep_restriction rules', () => {
      const rules = getRulesByCategory('sleep_restriction');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === 'sleep_restriction')).toBe(true);
    });

    it('should return sleep_hygiene rules', () => {
      const rules = getRulesByCategory('sleep_hygiene');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === 'sleep_hygiene')).toBe(true);
    });

    it('should return cognitive rules', () => {
      const rules = getRulesByCategory('cognitive');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === 'cognitive')).toBe(true);
    });

    it('should return relaxation rules', () => {
      const rules = getRulesByCategory('relaxation');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === 'relaxation')).toBe(true);
    });

    it('should return empty array for invalid category', () => {
      const rules = getRulesByCategory('invalid_category' as SleepRuleCategory);

      expect(rules).toEqual([]);
    });
  });

  describe('getRuleById', () => {
    it('should return rule by valid ID', () => {
      const rule = getRuleById('sc-01');

      expect(rule).toBeDefined();
      expect(rule?.id).toBe('sc-01');
      expect(rule?.category).toBe('stimulus_control');
    });

    it('should return different rules for different IDs', () => {
      const rule1 = getRuleById('sc-01');
      const rule2 = getRuleById('sr-01');

      expect(rule1).toBeDefined();
      expect(rule2).toBeDefined();
      expect(rule1?.id).not.toBe(rule2?.id);
    });

    it('should return undefined for non-existent ID', () => {
      const rule = getRuleById('non-existent-id');

      expect(rule).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const rule = getRuleById('');

      expect(rule).toBeUndefined();
    });
  });

  describe('getRelatedRules', () => {
    it('should return related rules for a rule with relations', () => {
      const rule = getRuleById('sc-01');
      expect(rule).toBeDefined();

      const relatedRules = getRelatedRules(rule!);

      expect(relatedRules.length).toBeGreaterThan(0);
      expect(relatedRules.every((r) => rule!.relatedRuleIds.includes(r.id))).toBe(true);
    });

    it('should return correct rules matching relatedRuleIds', () => {
      const rule = getRuleById('sc-03');
      expect(rule).toBeDefined();

      const relatedRules = getRelatedRules(rule!);
      const relatedIds = relatedRules.map((r) => r.id);

      for (const expectedId of rule!.relatedRuleIds) {
        expect(relatedIds).toContain(expectedId);
      }
    });

    it('should filter out undefined for invalid relatedRuleIds', () => {
      // Create a mock rule with an invalid related ID
      const mockRule = {
        id: 'test-rule',
        category: 'cognitive' as const,
        statement: 'Test',
        explanation: 'Test',
        visualizationPrompt: 'Test',
        rationale: 'Test',
        difficulty: 1,
        relatedRuleIds: ['sc-01', 'non-existent-id'],
      };

      const relatedRules = getRelatedRules(mockRule);

      // Should only return sc-01, not the non-existent one
      expect(relatedRules.length).toBe(1);
      expect(relatedRules[0].id).toBe('sc-01');
    });

    it('should return empty array for rule with no relations', () => {
      const mockRule = {
        id: 'test-rule',
        category: 'cognitive' as const,
        statement: 'Test',
        explanation: 'Test',
        visualizationPrompt: 'Test',
        rationale: 'Test',
        difficulty: 1,
        relatedRuleIds: [],
      };

      const relatedRules = getRelatedRules(mockRule);

      expect(relatedRules).toEqual([]);
    });
  });

  describe('getRulesByDifficulty', () => {
    it('should return rules sorted by difficulty ascending by default', () => {
      const rules = getRulesByDifficulty();

      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].difficulty).toBeGreaterThanOrEqual(rules[i - 1].difficulty);
      }
    });

    it('should return rules sorted by difficulty ascending when true', () => {
      const rules = getRulesByDifficulty(true);

      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].difficulty).toBeGreaterThanOrEqual(rules[i - 1].difficulty);
      }
    });

    it('should return rules sorted by difficulty descending when false', () => {
      const rules = getRulesByDifficulty(false);

      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].difficulty).toBeLessThanOrEqual(rules[i - 1].difficulty);
      }
    });

    it('should return all rules', () => {
      const rules = getRulesByDifficulty();

      expect(rules.length).toBe(SLEEP_RULES.length);
    });

    it('should not modify the original SLEEP_RULES array', () => {
      const originalFirst = SLEEP_RULES[0];

      getRulesByDifficulty(false); // Sort descending

      expect(SLEEP_RULES[0]).toBe(originalFirst);
    });
  });

  describe('getBeginnerRules', () => {
    it('should return only rules with difficulty 1 or 2', () => {
      const rules = getBeginnerRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.difficulty <= 2)).toBe(true);
    });

    it('should not include rules with difficulty > 2', () => {
      const beginnerRules = getBeginnerRules();
      const beginnerIds = new Set(beginnerRules.map((r) => r.id));

      const advancedRules = SLEEP_RULES.filter((r) => r.difficulty > 2);

      for (const advancedRule of advancedRules) {
        expect(beginnerIds.has(advancedRule.id)).toBe(false);
      }
    });

    it('should include all difficulty 1 rules', () => {
      const beginnerRules = getBeginnerRules();
      const difficulty1Rules = SLEEP_RULES.filter((r) => r.difficulty === 1);

      for (const rule of difficulty1Rules) {
        expect(beginnerRules.some((r) => r.id === rule.id)).toBe(true);
      }
    });

    it('should include all difficulty 2 rules', () => {
      const beginnerRules = getBeginnerRules();
      const difficulty2Rules = SLEEP_RULES.filter((r) => r.difficulty === 2);

      for (const rule of difficulty2Rules) {
        expect(beginnerRules.some((r) => r.id === rule.id)).toBe(true);
      }
    });
  });

  describe('getCategoryStats', () => {
    it('should return counts for all categories', () => {
      const stats = getCategoryStats();

      expect(stats).toHaveProperty('stimulus_control');
      expect(stats).toHaveProperty('sleep_restriction');
      expect(stats).toHaveProperty('sleep_hygiene');
      expect(stats).toHaveProperty('cognitive');
      expect(stats).toHaveProperty('relaxation');
    });

    it('should return positive counts for each category', () => {
      const stats = getCategoryStats();

      expect(stats.stimulus_control).toBeGreaterThan(0);
      expect(stats.sleep_restriction).toBeGreaterThan(0);
      expect(stats.sleep_hygiene).toBeGreaterThan(0);
      expect(stats.cognitive).toBeGreaterThan(0);
      expect(stats.relaxation).toBeGreaterThan(0);
    });

    it('should return correct total count matching SLEEP_RULES length', () => {
      const stats = getCategoryStats();
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

      expect(total).toBe(SLEEP_RULES.length);
    });

    it('should match actual counts from getRulesByCategory', () => {
      const stats = getCategoryStats();

      expect(stats.stimulus_control).toBe(getRulesByCategory('stimulus_control').length);
      expect(stats.sleep_restriction).toBe(getRulesByCategory('sleep_restriction').length);
      expect(stats.sleep_hygiene).toBe(getRulesByCategory('sleep_hygiene').length);
      expect(stats.cognitive).toBe(getRulesByCategory('cognitive').length);
      expect(stats.relaxation).toBe(getRulesByCategory('relaxation').length);
    });
  });
});
