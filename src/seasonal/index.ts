/**
 * Seasonal Patterns Module
 * ========================
 * Exports for seasonal sleep pattern analysis and SAD risk assessment.
 *
 * @packageDocumentation
 * @module @sleepcore/seasonal
 */

export { SeasonalEngine, seasonalEngine } from './SeasonalEngine';
export * from './types';
export {
  CITY_LATITUDES,
  CITY_LONGITUDES,
  SAD_THRESHOLDS,
  LIGHT_THERAPY,
  SEASON_BOUNDARIES,
  SEASONAL_TIB,
  SEASONAL_TIPS,
  getCityLatitude,
  getCityLongitude,
  getSeasonForMonth,
} from './constants';
