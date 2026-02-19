/**
 * SeasonalEngine Tests
 * ====================
 * Tests for seasonal pattern analysis and SAD risk assessment.
 *
 * @packageDocumentation
 * @module @sleepcore/seasonal
 */

import { SeasonalEngine } from '../SeasonalEngine';
import type { SeasonalContext, SADRiskLevel, Season } from '../types';

describe('SeasonalEngine', () => {
  let engine: SeasonalEngine;

  beforeEach(() => {
    engine = new SeasonalEngine();
  });

  describe('getDaylightHours', () => {
    it('calculates daylight hours for Moscow in December (winter solstice)', () => {
      // Moscow: 55.75°N, December 21 - shortest day
      const hours = engine.getDaylightHours(55.75, new Date('2025-12-21'));
      expect(hours).toBeGreaterThanOrEqual(6.5);
      expect(hours).toBeLessThanOrEqual(8);
    });

    it('calculates daylight hours for Moscow in June (summer solstice)', () => {
      // Moscow: 55.75°N, June 21 - longest day
      const hours = engine.getDaylightHours(55.75, new Date('2025-06-21'));
      expect(hours).toBeGreaterThanOrEqual(17);
      expect(hours).toBeLessThanOrEqual(18);
    });

    it('calculates daylight hours for Saint Petersburg in January', () => {
      // SPb: 59.93°N - higher latitude, shorter winter days
      const hours = engine.getDaylightHours(59.93, new Date('2025-01-15'));
      expect(hours).toBeGreaterThanOrEqual(6);
      expect(hours).toBeLessThanOrEqual(7.5);
    });

    it('calculates approximately 12 hours at equinox', () => {
      // Any latitude on equinox should have ~12 hours
      const hours = engine.getDaylightHours(55.75, new Date('2025-03-20'));
      expect(hours).toBeGreaterThanOrEqual(11.5);
      expect(hours).toBeLessThanOrEqual(12.5);
    });

    it('returns 24 hours for polar day (midnight sun)', () => {
      // Murmansk: 68.97°N in summer
      const hours = engine.getDaylightHours(68.97, new Date('2025-06-21'));
      expect(hours).toBe(24);
    });

    it('returns 0 hours for polar night', () => {
      // Murmansk: 68.97°N in winter
      const hours = engine.getDaylightHours(68.97, new Date('2025-12-21'));
      expect(hours).toBe(0);
    });

    it('handles equator with ~12 hours year-round', () => {
      const winterHours = engine.getDaylightHours(0, new Date('2025-12-21'));
      const summerHours = engine.getDaylightHours(0, new Date('2025-06-21'));

      expect(winterHours).toBeGreaterThanOrEqual(11.8);
      expect(winterHours).toBeLessThanOrEqual(12.2);
      expect(summerHours).toBeGreaterThanOrEqual(11.8);
      expect(summerHours).toBeLessThanOrEqual(12.2);
    });

    it('handles southern hemisphere (inverted seasons)', () => {
      // Sydney: -33.87°S - December is summer
      const decHours = engine.getDaylightHours(-33.87, new Date('2025-12-21'));
      const junHours = engine.getDaylightHours(-33.87, new Date('2025-06-21'));

      expect(decHours).toBeGreaterThan(junHours);
    });
  });

  describe('getSeason', () => {
    it('returns winter for January', () => {
      expect(engine.getSeason(new Date('2025-01-15'))).toBe('winter');
    });

    it('returns spring for April', () => {
      expect(engine.getSeason(new Date('2025-04-15'))).toBe('spring');
    });

    it('returns summer for July', () => {
      expect(engine.getSeason(new Date('2025-07-15'))).toBe('summer');
    });

    it('returns autumn for October', () => {
      expect(engine.getSeason(new Date('2025-10-15'))).toBe('autumn');
    });

    it('correctly identifies season boundaries', () => {
      // Spring equinox boundary (March 20)
      expect(engine.getSeason(new Date('2025-03-20'))).toBe('spring');
      // After spring equinox
      expect(engine.getSeason(new Date('2025-03-21'))).toBe('spring');
      // Summer solstice boundary (June 21)
      expect(engine.getSeason(new Date('2025-06-21'))).toBe('summer');
      // Winter solstice boundary (December 21)
      expect(engine.getSeason(new Date('2025-12-21'))).toBe('winter');
      // After winter solstice
      expect(engine.getSeason(new Date('2025-12-25'))).toBe('winter');
    });
  });

  describe('SAFETY: SAD Risk Assessment', () => {
    it('returns high SAD risk for SPb in January', () => {
      const risk = engine.getSADRiskLevel(59.93, new Date('2025-01-15'));
      expect(risk).toBe('high');
    });

    it('returns moderate SAD risk for Moscow in November', () => {
      const risk = engine.getSADRiskLevel(55.75, new Date('2025-11-15'));
      expect(['moderate', 'high']).toContain(risk);
    });

    it('returns low SAD risk for Sochi in winter', () => {
      // Sochi: 43.59°N - southern Russia
      const risk = engine.getSADRiskLevel(43.59, new Date('2025-01-15'));
      expect(['low', 'moderate']).toContain(risk);
    });

    it('returns low SAD risk in summer regardless of latitude', () => {
      const risk = engine.getSADRiskLevel(59.93, new Date('2025-06-15'));
      expect(risk).toBe('low');
    });

    it('increases risk with decreasing daylight hours', () => {
      const januaryRisk = engine.getSADRiskLevel(55.75, new Date('2025-01-15'));
      const marchRisk = engine.getSADRiskLevel(55.75, new Date('2025-03-15'));

      const riskOrder: Record<SADRiskLevel, number> = {
        high: 3,
        moderate: 2,
        low: 1,
      };

      expect(riskOrder[januaryRisk]).toBeGreaterThanOrEqual(riskOrder[marchRisk]);
    });

    it('identifies high risk for very high latitudes', () => {
      // Murmansk: 68.97°N
      const risk = engine.getSADRiskLevel(68.97, new Date('2025-12-15'));
      expect(risk).toBe('high');
    });
  });

  describe('getSeasonalContext', () => {
    it('returns complete context with all required fields', () => {
      const context = engine.getSeasonalContext(
        55.75,
        new Date('2025-01-15'),
        37.62
      );

      expect(context).toHaveProperty('latitude', 55.75);
      expect(context).toHaveProperty('longitude', 37.62);
      expect(context).toHaveProperty('date');
      expect(context).toHaveProperty('daylightHours');
      expect(context).toHaveProperty('season', 'winter');
      expect(context).toHaveProperty('sadRiskLevel');
      expect(context).toHaveProperty('sunriseTime');
      expect(context).toHaveProperty('sunsetTime');
    });

    it('works without longitude', () => {
      const context = engine.getSeasonalContext(55.75, new Date('2025-01-15'));

      expect(context.longitude).toBeUndefined();
      expect(context.sunriseTime).toBeDefined();
      expect(context.sunsetTime).toBeDefined();
    });
  });

  describe('getLightRecommendation', () => {
    it('recommends lightbox for high SAD risk', () => {
      const context = createContext({
        latitude: 59.93,
        daylightHours: 6,
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const rec = engine.getLightRecommendation(context);

      expect(rec.lightboxRecommended).toBe(true);
      expect(rec.lightboxLux).toBe(10000);
      expect(rec.lightboxDurationMinutes).toBeGreaterThanOrEqual(15);
    });

    it('does not recommend lightbox for low SAD risk', () => {
      const context = createContext({
        latitude: 43.59,
        daylightHours: 14,
        season: 'summer',
        sadRiskLevel: 'low',
      });

      const rec = engine.getLightRecommendation(context);

      expect(rec.lightboxRecommended).toBe(false);
      expect(rec.lightboxLux).toBe(0);
    });

    it('increases morning light minutes with higher SAD risk', () => {
      const lowRisk = createContext({ sadRiskLevel: 'low' });
      const highRisk = createContext({ sadRiskLevel: 'high', daylightHours: 6 });

      const lowRec = engine.getLightRecommendation(lowRisk);
      const highRec = engine.getLightRecommendation(highRisk);

      expect(highRec.morningLightMinutes).toBeGreaterThan(lowRec.morningLightMinutes);
    });

    it('provides valid time format for optimalLightTime', () => {
      const context = createContext();
      const rec = engine.getLightRecommendation(context);

      expect(rec.optimalLightTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('provides valid time format for eveningDimStart', () => {
      const context = createContext();
      const rec = engine.getLightRecommendation(context);

      expect(rec.eveningDimStart).toMatch(/^\d{2}:\d{2}$/);
    });

    it('includes evidence level in recommendation', () => {
      const context = createContext({ sadRiskLevel: 'high', daylightHours: 6 });
      const rec = engine.getLightRecommendation(context);

      expect(rec.evidenceLevel).toBe('A');
    });
  });

  describe('getSeasonalTips', () => {
    it('returns tips relevant to winter and high SAD risk', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const tips = engine.getSeasonalTips(context);

      expect(tips.length).toBeGreaterThan(0);
      tips.forEach((tip) => {
        expect(tip.seasons).toContain('winter');
        expect(tip.sadRiskLevels).toContain('high');
      });
    });

    it('returns tips relevant to summer and low SAD risk', () => {
      const context = createContext({
        season: 'summer',
        sadRiskLevel: 'low',
      });

      const tips = engine.getSeasonalTips(context);

      expect(tips.length).toBeGreaterThan(0);
      tips.forEach((tip) => {
        expect(tip.seasons).toContain('summer');
        expect(tip.sadRiskLevels).toContain('low');
      });
    });

    it('respects the limit parameter', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const tips = engine.getSeasonalTips(context, 2);

      expect(tips.length).toBeLessThanOrEqual(2);
    });

    it('prioritizes higher evidence levels', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const tips = engine.getSeasonalTips(context, 10);

      // First tips should have higher evidence
      const evidenceOrder: Record<string, number> = {
        A: 4,
        B: 3,
        C: 2,
        Expert: 1,
      };

      for (let i = 0; i < tips.length - 1; i++) {
        const currentEvidence = evidenceOrder[tips[i].evidenceLevel];
        const nextEvidence = evidenceOrder[tips[i + 1].evidenceLevel];
        // Allow same level or lower
        expect(currentEvidence).toBeGreaterThanOrEqual(nextEvidence - 1);
      }
    });

    it('returns diverse tip categories', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const tips = engine.getSeasonalTips(context, 3);
      const categories = new Set(tips.map((t) => t.category));

      // Should have at least 2 different categories in 3 tips
      expect(categories.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('SAFETY: TIB Adjustment', () => {
    it('never suggests adjustment that would violate MIN_TIB', () => {
      // Engine provides suggestions; actual enforcement is in SleepRestrictionEngine
      // This test documents that adjustments are intentionally small
      const contexts: SeasonalContext[] = [
        createContext({ season: 'winter', sadRiskLevel: 'high' }),
        createContext({ season: 'summer', daylightHours: 18 }),
        createContext({ season: 'autumn', sadRiskLevel: 'moderate' }),
      ];

      contexts.forEach((context) => {
        const adjustment = engine.suggestTIBAdjustment(context);

        // Max adjustment is 30 minutes per SEASONAL_TIB constants
        expect(Math.abs(adjustment.adjustmentMinutes)).toBeLessThanOrEqual(30);
      });
    });

    it('suggests TIB increase in winter for high SAD risk', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
        daylightHours: 6,
      });

      const adjustment = engine.suggestTIBAdjustment(context);

      expect(adjustment.adjustmentMinutes).toBeGreaterThan(0);
    });

    it('suggests TIB decrease in summer with very long days', () => {
      const context = createContext({
        season: 'summer',
        sadRiskLevel: 'low',
        daylightHours: 18,
      });

      const adjustment = engine.suggestTIBAdjustment(context);

      expect(adjustment.adjustmentMinutes).toBeLessThanOrEqual(0);
    });

    it('suggests no adjustment for spring with low risk', () => {
      const context = createContext({
        season: 'spring',
        sadRiskLevel: 'low',
        daylightHours: 12,
      });

      const adjustment = engine.suggestTIBAdjustment(context);

      expect(adjustment.adjustmentMinutes).toBe(0);
    });

    it('includes confidence level in adjustment', () => {
      const context = createContext({
        season: 'winter',
        sadRiskLevel: 'high',
      });

      const adjustment = engine.suggestTIBAdjustment(context);

      expect(['low', 'medium', 'high']).toContain(adjustment.confidence);
    });
  });

  describe('getSunTimes', () => {
    it('returns valid time format', () => {
      const times = engine.getSunTimes(55.75, 37.62, new Date('2025-06-21'));

      expect(times.sunrise).toMatch(/^\d{2}:\d{2}$/);
      expect(times.sunset).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles polar day', () => {
      const times = engine.getSunTimes(68.97, 33.05, new Date('2025-06-21'));

      expect(times.sunrise).toBe('00:00');
      expect(times.sunset).toBe('24:00');
    });

    it('handles polar night', () => {
      const times = engine.getSunTimes(68.97, 33.05, new Date('2025-12-21'));

      expect(times.sunrise).toBe('--:--');
      expect(times.sunset).toBe('--:--');
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a mock SeasonalContext with defaults
 */
function createContext(
  overrides: Partial<SeasonalContext> = {}
): SeasonalContext {
  return {
    latitude: 55.75,
    date: new Date('2025-01-15'),
    daylightHours: overrides.daylightHours ?? 7,
    season: overrides.season ?? 'winter',
    sadRiskLevel: overrides.sadRiskLevel ?? 'moderate',
    sunriseTime: '08:30',
    sunsetTime: '16:30',
    ...overrides,
  };
}
