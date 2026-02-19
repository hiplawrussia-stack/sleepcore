/**
 * Seasonal Patterns Engine
 * ========================
 * Engine for analyzing seasonal sleep patterns and providing CBT-I recommendations
 * adjusted for daylight hours, SAD risk, and seasonal factors.
 *
 * Clinical basis:
 * - SAD affects 10-20% of population in northern latitudes (>55°N)
 * - Light therapy shows effect size d=0.6-1.0 for SAD
 * - Daylight exposure significantly impacts circadian rhythm and melatonin production
 *
 * Algorithm:
 * 1. Calculate daylight hours using solar declination formula
 * 2. Assess SAD risk based on latitude + daylight hours + season
 * 3. Generate light therapy and seasonal recommendations
 *
 * References:
 * - European Insomnia Guideline 2023
 * - Terman & Terman, 2005 (Light therapy)
 * - Rosenthal et al., 1984 (SAD criteria)
 *
 * @packageDocumentation
 * @module @sleepcore/seasonal
 */

import type {
  ISeasonalEngine,
  Season,
  SADRiskLevel,
  SeasonalContext,
  LightRecommendation,
  SeasonalTip,
  SeasonalTIBAdjustment,
} from './types';

import {
  SAD_THRESHOLDS,
  LIGHT_THERAPY,
  SEASON_BOUNDARIES,
  SEASONAL_TIB,
  SEASONAL_TIPS,
  getSeasonForMonth,
} from './constants';

/**
 * Degrees to radians conversion
 */
const DEG_TO_RAD = Math.PI / 180;

/**
 * Radians to degrees conversion
 */
const RAD_TO_DEG = 180 / Math.PI;

/**
 * SeasonalEngine - Analyzes seasonal patterns and provides CBT-I adjustments
 */
export class SeasonalEngine implements ISeasonalEngine {
  /**
   * Calculate daylight hours for a given latitude and date
   * Uses astronomical formula based on solar declination
   *
   * @param latitude - Latitude in degrees (-90 to 90)
   * @param date - Date to calculate for
   * @returns Number of daylight hours
   */
  getDaylightHours(latitude: number, date: Date): number {
    // Validate latitude
    const clampedLat = Math.max(-90, Math.min(90, latitude));

    // Calculate day of year (1-366)
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Calculate solar declination (angle of sun relative to equator)
    // Formula: declination = 23.45 * sin(360/365 * (dayOfYear - 81))
    const declination = 23.45 * Math.sin(DEG_TO_RAD * (360 / 365) * (dayOfYear - 81));

    // Calculate hour angle at sunrise/sunset
    // Formula: cos(hourAngle) = -tan(latitude) * tan(declination)
    const latRad = clampedLat * DEG_TO_RAD;
    const decRad = declination * DEG_TO_RAD;

    const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

    // Handle polar day (24h daylight) and polar night (0h daylight)
    if (cosHourAngle < -1) {
      return 24; // Polar day (midnight sun)
    }
    if (cosHourAngle > 1) {
      return 0; // Polar night
    }

    // Calculate hour angle in degrees, then convert to hours
    const hourAngleDeg = Math.acos(cosHourAngle) * RAD_TO_DEG;
    const daylightHours = (2 * hourAngleDeg) / 15; // 15 degrees per hour

    return Math.round(daylightHours * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get sunrise and sunset times for a location
   *
   * @param latitude - Latitude in degrees
   * @param longitude - Longitude in degrees
   * @param date - Date to calculate for
   * @returns Object with sunrise and sunset times in "HH:mm" format
   */
  getSunTimes(
    latitude: number,
    longitude: number,
    date: Date
  ): { sunrise: string; sunset: string } {
    const daylightHours = this.getDaylightHours(latitude, date);

    // Handle polar conditions
    if (daylightHours >= 24) {
      return { sunrise: '00:00', sunset: '24:00' };
    }
    if (daylightHours <= 0) {
      return { sunrise: '--:--', sunset: '--:--' };
    }

    // Calculate solar noon based on longitude
    // Solar noon occurs when the sun is highest, offset by timezone
    const solarNoonOffset = longitude / 15; // Hours from UTC
    const baseSolarNoon = 12; // UTC noon

    // Approximate timezone offset (rough estimate)
    const timezoneOffset = Math.round(longitude / 15);
    const localSolarNoon = baseSolarNoon + (timezoneOffset - solarNoonOffset);

    // Calculate sunrise and sunset
    const halfDaylight = daylightHours / 2;
    const sunriseHours = localSolarNoon - halfDaylight;
    const sunsetHours = localSolarNoon + halfDaylight;

    return {
      sunrise: this.formatTime(sunriseHours),
      sunset: this.formatTime(sunsetHours),
    };
  }

  /**
   * Determine the season for a given date (Northern hemisphere)
   *
   * @param date - Date to check
   * @returns Season classification
   */
  getSeason(date: Date): Season {
    const month = date.getMonth();
    const day = date.getDate();

    // Check boundaries for precise season determination
    if (
      month === SEASON_BOUNDARIES.SPRING_START.month &&
      day >= SEASON_BOUNDARIES.SPRING_START.day
    ) {
      return 'spring';
    }
    if (
      month === SEASON_BOUNDARIES.SUMMER_START.month &&
      day >= SEASON_BOUNDARIES.SUMMER_START.day
    ) {
      return 'summer';
    }
    if (
      month === SEASON_BOUNDARIES.AUTUMN_START.month &&
      day >= SEASON_BOUNDARIES.AUTUMN_START.day
    ) {
      return 'autumn';
    }
    if (
      month === SEASON_BOUNDARIES.WINTER_START.month &&
      day >= SEASON_BOUNDARIES.WINTER_START.day
    ) {
      return 'winter';
    }

    // Use month-based approximation for days before boundary
    return getSeasonForMonth(month);
  }

  /**
   * Assess SAD risk based on latitude and date
   *
   * Risk factors:
   * - Latitude > 55°N: elevated risk
   * - Latitude > 60°N: high baseline risk
   * - Daylight < 8h: high risk
   * - Winter months (Nov-Feb): elevated risk
   *
   * @param latitude - Latitude in degrees
   * @param date - Date to assess
   * @returns SAD risk level
   */
  getSADRiskLevel(latitude: number, date: Date): SADRiskLevel {
    const daylightHours = this.getDaylightHours(latitude, date);
    const month = date.getMonth();
    const absLatitude = Math.abs(latitude);

    // Score-based assessment
    let riskScore = 0;

    // Latitude factor
    if (absLatitude >= SAD_THRESHOLDS.VERY_HIGH_RISK_LATITUDE) {
      riskScore += 3;
    } else if (absLatitude >= SAD_THRESHOLDS.HIGH_RISK_LATITUDE) {
      riskScore += 2;
    } else if (absLatitude >= 45) {
      riskScore += 1;
    }

    // Daylight hours factor
    if (daylightHours < SAD_THRESHOLDS.CRITICAL_DAYLIGHT_HOURS) {
      riskScore += 3;
    } else if (daylightHours < SAD_THRESHOLDS.MODERATE_DAYLIGHT_HOURS) {
      riskScore += 2;
    } else if (daylightHours < 12) {
      riskScore += 1;
    }

    // Season factor
    if (SAD_THRESHOLDS.PEAK_SAD_MONTHS.includes(month)) {
      riskScore += 2;
    } else if (SAD_THRESHOLDS.WINTER_MONTHS.includes(month)) {
      riskScore += 1;
    }

    // Convert score to risk level
    if (riskScore >= 6) {
      return 'high';
    }
    if (riskScore >= 3) {
      return 'moderate';
    }
    return 'low';
  }

  /**
   * Get complete seasonal context for a user
   *
   * @param latitude - User's latitude
   * @param date - Current date
   * @param longitude - Optional longitude for sun times
   * @returns Complete seasonal context
   */
  getSeasonalContext(
    latitude: number,
    date: Date,
    longitude?: number
  ): SeasonalContext {
    const daylightHours = this.getDaylightHours(latitude, date);
    const season = this.getSeason(date);
    const sadRiskLevel = this.getSADRiskLevel(latitude, date);

    const sunTimes = longitude !== undefined
      ? this.getSunTimes(latitude, longitude, date)
      : { sunrise: '06:00', sunset: this.formatTime(6 + daylightHours) };

    return {
      latitude,
      longitude,
      date,
      daylightHours,
      season,
      sadRiskLevel,
      sunriseTime: sunTimes.sunrise,
      sunsetTime: sunTimes.sunset,
    };
  }

  /**
   * Get light therapy recommendation based on seasonal context
   *
   * @param context - Seasonal context
   * @returns Light therapy recommendation
   */
  getLightRecommendation(context: SeasonalContext): LightRecommendation {
    const { daylightHours, sadRiskLevel, season, sunriseTime } = context;

    // Calculate optimal light exposure time (shortly after sunrise or wake)
    const sunriseHours = this.parseTime(sunriseTime);
    const optimalLightTime = this.formatTime(
      Math.max(sunriseHours, 6) + 0.5 // 30 min after sunrise or 6:30 AM
    );

    // Calculate evening dim start (based on sunset or standard bedtime)
    const sunsetHours = this.parseTime(context.sunsetTime);
    const eveningDimStart = this.formatTime(
      Math.min(sunsetHours - 0.5, 22 - LIGHT_THERAPY.DIM_HOURS_BEFORE_BED)
    );

    // Determine morning light minutes based on SAD risk
    let morningLightMinutes: number;
    let lightboxRecommended: boolean;
    let lightboxDurationMinutes: number;
    let reason: string;

    if (sadRiskLevel === 'high') {
      morningLightMinutes = 45;
      lightboxRecommended = daylightHours < SAD_THRESHOLDS.CRITICAL_DAYLIGHT_HOURS;
      lightboxDurationMinutes = LIGHT_THERAPY.STANDARD_DURATION;
      reason =
        'Высокий риск сезонного снижения настроения. Рекомендуется максимальное воздействие утреннего света.';
    } else if (sadRiskLevel === 'moderate') {
      morningLightMinutes = 30;
      lightboxRecommended = daylightHours < SAD_THRESHOLDS.MODERATE_DAYLIGHT_HOURS;
      lightboxDurationMinutes = LIGHT_THERAPY.MIN_DURATION;
      reason =
        'Умеренный риск. Старайтесь получать естественный свет утром для поддержания циркадных ритмов.';
    } else {
      morningLightMinutes = 15;
      lightboxRecommended = false;
      lightboxDurationMinutes = 0;
      reason =
        season === 'summer'
          ? 'Достаточно естественного света. Следите за затемнением вечером.'
          : 'Низкий риск. Поддерживайте обычный режим светового воздействия.';
    }

    return {
      morningLightMinutes,
      optimalLightTime,
      eveningDimStart,
      lightboxRecommended,
      lightboxLux: lightboxRecommended ? LIGHT_THERAPY.STANDARD_LUX : 0,
      lightboxDurationMinutes,
      reason,
      evidenceLevel: sadRiskLevel === 'high' ? 'A' : 'B',
    };
  }

  /**
   * Get seasonal tips relevant to the current context
   *
   * @param context - Seasonal context
   * @param limit - Maximum number of tips to return (default: 3)
   * @returns Array of relevant seasonal tips
   */
  getSeasonalTips(context: SeasonalContext, limit: number = 3): SeasonalTip[] {
    const { season, sadRiskLevel } = context;

    // Filter tips by season and SAD risk level
    const relevantTips = SEASONAL_TIPS.filter(
      (tip) =>
        tip.seasons.includes(season) && tip.sadRiskLevels.includes(sadRiskLevel)
    );

    // Sort by evidence level (A > B > C > Expert)
    const evidenceOrder: Record<string, number> = {
      A: 4,
      B: 3,
      C: 2,
      Expert: 1,
    };

    const sortedTips = [...relevantTips].sort((a, b) => {
      // Prioritize by evidence level
      const evidenceDiff =
        evidenceOrder[b.evidenceLevel] - evidenceOrder[a.evidenceLevel];
      if (evidenceDiff !== 0) return evidenceDiff;

      // Then by category priority for current context
      const categoryPriority: Record<string, number> = {
        light: sadRiskLevel === 'high' ? 5 : 3,
        circadian: 4,
        temperature: season === 'summer' || season === 'winter' ? 3 : 2,
        activity: 2,
        nutrition: 1,
      };

      return (
        (categoryPriority[b.category] || 0) -
        (categoryPriority[a.category] || 0)
      );
    });

    // Return limited number of diverse tips (different categories preferred)
    const selectedTips: SeasonalTip[] = [];
    const usedCategories = new Set<string>();

    for (const tip of sortedTips) {
      if (selectedTips.length >= limit) break;

      // Prefer diverse categories
      if (!usedCategories.has(tip.category) || selectedTips.length < limit / 2) {
        selectedTips.push(tip);
        usedCategories.add(tip.category);
      }
    }

    return selectedTips;
  }

  /**
   * Calculate TIB adjustment suggestion based on seasonal factors
   *
   * NOTE: This is advisory only. The final TIB calculation in SleepRestrictionEngine
   * will enforce MIN_TIB (300 min) per CLAUDE.md §2.1
   *
   * @param context - Seasonal context
   * @returns TIB adjustment suggestion
   */
  suggestTIBAdjustment(context: SeasonalContext): SeasonalTIBAdjustment {
    const { season, daylightHours, sadRiskLevel } = context;

    // No adjustment for low risk or moderate seasons
    if (sadRiskLevel === 'low' && (season === 'spring' || season === 'autumn')) {
      return {
        adjustmentMinutes: 0,
        reason: 'Сезонная коррекция не требуется.',
        confidence: 'high',
      };
    }

    // Winter: consider slight TIB increase due to longer melatonin production
    if (season === 'winter' || (season === 'autumn' && daylightHours < 10)) {
      const adjustment = Math.min(
        SEASONAL_TIB.MAX_WINTER_INCREASE,
        sadRiskLevel === 'high' ? 30 : 15
      );

      return {
        adjustmentMinutes: adjustment,
        reason: `В темное время года естественная потребность во сне может увеличиваться на ${adjustment} минут.`,
        confidence: sadRiskLevel === 'high' ? 'medium' : 'low',
      };
    }

    // Summer with long days: consider slight TIB decrease
    if (season === 'summer' && daylightHours > 16) {
      return {
        adjustmentMinutes: -SEASONAL_TIB.MAX_SUMMER_DECREASE,
        reason: `Длинные дни лета могут снижать потребность во сне. Возможна коррекция на ${SEASONAL_TIB.MAX_SUMMER_DECREASE} минут.`,
        confidence: 'low',
      };
    }

    return {
      adjustmentMinutes: 0,
      reason: 'Стандартный режим без сезонной коррекции.',
      confidence: 'medium',
    };
  }

  /**
   * Format hours (decimal) to "HH:mm" string
   */
  private formatTime(hours: number): string {
    // Normalize to 0-24 range
    const normalizedHours = ((hours % 24) + 24) % 24;
    const h = Math.floor(normalizedHours);
    const m = Math.round((normalizedHours - h) * 60);

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Parse "HH:mm" string to decimal hours
   */
  private parseTime(time: string): number {
    if (time === '--:--') return 12; // Default to noon for polar night

    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }
}

/**
 * Singleton instance for convenience
 */
export const seasonalEngine = new SeasonalEngine();
