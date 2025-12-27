/**
 * Breathing Patterns Tests
 * ========================
 * Tests for breathing pattern utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  BREATHING_PATTERNS,
  getPatternById,
  getPatternsByCategory,
  getFreePatterns,
  getPatternDuration,
  getTotalDuration,
  formatDuration,
  getRecommendedCycles,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '../../src/components/breathing/patterns';

describe('Breathing Patterns', () => {
  describe('BREATHING_PATTERNS', () => {
    it('should have at least 5 patterns', () => {
      expect(BREATHING_PATTERNS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique IDs', () => {
      const ids = BREATHING_PATTERNS.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have all required fields for each pattern', () => {
      BREATHING_PATTERNS.forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.nameRu).toBeDefined();
        expect(pattern.icon).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.descriptionRu).toBeDefined();
        expect(pattern.benefit).toBeDefined();
        expect(pattern.benefitRu).toBeDefined();
        expect(pattern.inhale).toBeGreaterThan(0);
        expect(pattern.hold).toBeGreaterThanOrEqual(0);
        expect(pattern.exhale).toBeGreaterThan(0);
        expect(['beginner', 'intermediate', 'advanced']).toContain(pattern.difficulty);
        expect(['sleep', 'stress', 'focus', 'energy']).toContain(pattern.category);
        expect(typeof pattern.isPremium).toBe('boolean');
      });
    });

    it('should have the 4-7-8 pattern', () => {
      const pattern = BREATHING_PATTERNS.find(p => p.id === '478');
      expect(pattern).toBeDefined();
      expect(pattern?.inhale).toBe(4);
      expect(pattern?.hold).toBe(7);
      expect(pattern?.exhale).toBe(8);
    });

    it('should have box breathing pattern', () => {
      const pattern = BREATHING_PATTERNS.find(p => p.id === 'box');
      expect(pattern).toBeDefined();
      expect(pattern?.inhale).toBe(4);
      expect(pattern?.hold).toBe(4);
      expect(pattern?.exhale).toBe(4);
      expect(pattern?.hold2).toBe(4);
    });
  });

  describe('getPatternById', () => {
    it('should return pattern by ID', () => {
      const pattern = getPatternById('478');
      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('478');
      expect(pattern?.name).toBe('4-7-8 Relaxing');
    });

    it('should return undefined for non-existent ID', () => {
      const pattern = getPatternById('non-existent');
      expect(pattern).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const pattern = getPatternById('');
      expect(pattern).toBeUndefined();
    });
  });

  describe('getPatternsByCategory', () => {
    it('should return patterns for sleep category', () => {
      const sleepPatterns = getPatternsByCategory('sleep');
      expect(sleepPatterns.length).toBeGreaterThan(0);
      sleepPatterns.forEach(p => {
        expect(p.category).toBe('sleep');
      });
    });

    it('should return patterns for stress category', () => {
      const stressPatterns = getPatternsByCategory('stress');
      expect(stressPatterns.length).toBeGreaterThan(0);
      stressPatterns.forEach(p => {
        expect(p.category).toBe('stress');
      });
    });

    it('should return patterns for focus category', () => {
      const focusPatterns = getPatternsByCategory('focus');
      expect(focusPatterns.length).toBeGreaterThan(0);
      focusPatterns.forEach(p => {
        expect(p.category).toBe('focus');
      });
    });

    it('should return patterns for energy category', () => {
      const energyPatterns = getPatternsByCategory('energy');
      expect(energyPatterns.length).toBeGreaterThan(0);
      energyPatterns.forEach(p => {
        expect(p.category).toBe('energy');
      });
    });
  });

  describe('getFreePatterns', () => {
    it('should return only non-premium patterns', () => {
      const freePatterns = getFreePatterns();
      expect(freePatterns.length).toBeGreaterThan(0);
      freePatterns.forEach(p => {
        expect(p.isPremium).toBe(false);
      });
    });

    it('should not include premium patterns', () => {
      const freePatterns = getFreePatterns();
      const hasPremium = freePatterns.some(p => p.isPremium);
      expect(hasPremium).toBe(false);
    });

    it('should include common patterns like 4-7-8', () => {
      const freePatterns = getFreePatterns();
      const has478 = freePatterns.some(p => p.id === '478');
      expect(has478).toBe(true);
    });
  });

  describe('getPatternDuration', () => {
    it('should calculate duration for 4-7-8 pattern', () => {
      const pattern = getPatternById('478')!;
      const duration = getPatternDuration(pattern);
      expect(duration).toBe(4 + 7 + 8); // 19 seconds
    });

    it('should calculate duration for box breathing with hold2', () => {
      const pattern = getPatternById('box')!;
      const duration = getPatternDuration(pattern);
      expect(duration).toBe(4 + 4 + 4 + 4); // 16 seconds
    });

    it('should calculate duration for coherent breathing without hold', () => {
      const pattern = getPatternById('coherent')!;
      const duration = getPatternDuration(pattern);
      expect(duration).toBe(5 + 0 + 5); // 10 seconds
    });

    it('should handle pattern without hold2', () => {
      const pattern = { inhale: 4, hold: 2, exhale: 6 } as any;
      const duration = getPatternDuration(pattern);
      expect(duration).toBe(12);
    });
  });

  describe('getTotalDuration', () => {
    it('should calculate total duration for multiple cycles', () => {
      const pattern = getPatternById('478')!;
      const singleCycle = getPatternDuration(pattern);
      const cycles = 5;
      const total = getTotalDuration(pattern, cycles);
      expect(total).toBe(singleCycle * cycles);
    });

    it('should return 0 for 0 cycles', () => {
      const pattern = getPatternById('478')!;
      const total = getTotalDuration(pattern, 0);
      expect(total).toBe(0);
    });

    it('should return single cycle duration for 1 cycle', () => {
      const pattern = getPatternById('box')!;
      const singleCycle = getPatternDuration(pattern);
      const total = getTotalDuration(pattern, 1);
      expect(total).toBe(singleCycle);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(30)).toBe('30 сек');
    });

    it('should format minutes only', () => {
      expect(formatDuration(60)).toBe('1 мин');
      expect(formatDuration(120)).toBe('2 мин');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1 мин 30 сек');
      expect(formatDuration(150)).toBe('2 мин 30 сек');
    });

    it('should format 0 seconds', () => {
      expect(formatDuration(0)).toBe('0 сек');
    });
  });

  describe('getRecommendedCycles', () => {
    it('should return 3 cycles for long patterns (15+ seconds)', () => {
      const pattern = getPatternById('478')!; // 19 seconds
      expect(getRecommendedCycles(pattern)).toBe(3);
    });

    it('should return 5 cycles for medium patterns (10-14 seconds)', () => {
      const pattern = getPatternById('coherent')!; // 10 seconds
      expect(getRecommendedCycles(pattern)).toBe(5);
    });

    it('should return 7 cycles for short patterns (<10 seconds)', () => {
      const pattern = getPatternById('energizing')!; // 8 seconds
      expect(getRecommendedCycles(pattern)).toBe(7);
    });
  });

  describe('CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      expect(CATEGORY_LABELS.sleep).toBe('Для сна');
      expect(CATEGORY_LABELS.stress).toBe('От стресса');
      expect(CATEGORY_LABELS.focus).toBe('Фокус');
      expect(CATEGORY_LABELS.energy).toBe('Энергия');
    });
  });

  describe('CATEGORY_ICONS', () => {
    it('should have icons for all categories', () => {
      expect(CATEGORY_ICONS.sleep).toBe('🌙');
      expect(CATEGORY_ICONS.stress).toBe('🧘');
      expect(CATEGORY_ICONS.focus).toBe('🎯');
      expect(CATEGORY_ICONS.energy).toBe('⚡');
    });
  });
});
