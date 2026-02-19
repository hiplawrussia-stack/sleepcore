/**
 * Seasonal Patterns Types
 * =======================
 * Type definitions for seasonal sleep pattern analysis and SAD risk assessment.
 *
 * Clinical basis: Seasonal Affective Disorder affects 10-20% of population
 * in northern latitudes (>50°N). Light therapy shows d=0.6-1.0 effect size.
 *
 * @packageDocumentation
 * @module @sleepcore/seasonal
 */

/**
 * Season classification
 */
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/**
 * SAD (Seasonal Affective Disorder) risk level
 */
export type SADRiskLevel = 'low' | 'moderate' | 'high';

/**
 * Evidence level for seasonal tips (per CLAUDE.md §4)
 */
export type EvidenceLevel = 'A' | 'B' | 'C' | 'Expert';

/**
 * Seasonal context for a user based on their location and date
 */
export interface SeasonalContext {
  readonly latitude: number;
  readonly longitude?: number;
  readonly date: Date;
  readonly daylightHours: number;
  readonly season: Season;
  readonly sadRiskLevel: SADRiskLevel;
  readonly sunriseTime: string; // "HH:mm"
  readonly sunsetTime: string; // "HH:mm"
}

/**
 * Light therapy recommendation based on seasonal context
 */
export interface LightRecommendation {
  readonly morningLightMinutes: number;
  readonly optimalLightTime: string; // "HH:mm" - best time for light exposure
  readonly eveningDimStart: string; // "HH:mm" - when to start dimming lights
  readonly lightboxRecommended: boolean;
  readonly lightboxLux: number; // Recommended lux (typically 10000)
  readonly lightboxDurationMinutes: number;
  readonly reason: string;
  readonly evidenceLevel: EvidenceLevel;
}

/**
 * Seasonal tip for sleep improvement
 */
export interface SeasonalTip {
  readonly id: string;
  readonly category: 'light' | 'temperature' | 'activity' | 'nutrition' | 'circadian';
  readonly content: string;
  readonly seasons: Season[];
  readonly sadRiskLevels: SADRiskLevel[];
  readonly evidenceLevel: EvidenceLevel;
  readonly source?: string;
}

/**
 * TIB adjustment recommendation based on seasonal factors
 */
export interface SeasonalTIBAdjustment {
  readonly adjustmentMinutes: number; // Positive = increase, negative = decrease
  readonly reason: string;
  readonly confidence: 'low' | 'medium' | 'high';
}

/**
 * Interface for SeasonalEngine
 */
export interface ISeasonalEngine {
  /**
   * Calculate daylight hours for a given latitude and date
   */
  getDaylightHours(latitude: number, date: Date): number;

  /**
   * Get sunrise and sunset times for a location
   */
  getSunTimes(latitude: number, longitude: number, date: Date): {
    sunrise: string;
    sunset: string;
  };

  /**
   * Determine the season for a given date (Northern hemisphere)
   */
  getSeason(date: Date): Season;

  /**
   * Assess SAD risk based on latitude and date
   */
  getSADRiskLevel(latitude: number, date: Date): SADRiskLevel;

  /**
   * Get complete seasonal context for a user
   */
  getSeasonalContext(latitude: number, date: Date, longitude?: number): SeasonalContext;

  /**
   * Get light therapy recommendation based on context
   */
  getLightRecommendation(context: SeasonalContext): LightRecommendation;

  /**
   * Get seasonal tips relevant to the current context
   */
  getSeasonalTips(context: SeasonalContext, limit?: number): SeasonalTip[];

  /**
   * Calculate TIB adjustment suggestion based on seasonal factors
   * NOTE: This is advisory only - final TIB must respect MIN_TIB (300 min)
   */
  suggestTIBAdjustment(context: SeasonalContext): SeasonalTIBAdjustment;
}

/**
 * User location for seasonal calculations
 */
export interface UserLocation {
  readonly city?: string;
  readonly latitude: number;
  readonly longitude?: number;
  readonly timezone?: string;
}
