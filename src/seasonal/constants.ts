/**
 * Seasonal Patterns Constants
 * ===========================
 * Constants for seasonal sleep pattern analysis and SAD risk assessment.
 *
 * @packageDocumentation
 * @module @sleepcore/seasonal
 */

import type { Season, SeasonalTip } from './types';

/**
 * Latitude coordinates for major Russian cities
 */
export const CITY_LATITUDES: Readonly<Record<string, number>> = {
  // Major Russian cities
  'moscow': 55.75,
  'spb': 59.93,
  'saint-petersburg': 59.93,
  'novosibirsk': 55.03,
  'ekaterinburg': 56.84,
  'kazan': 55.79,
  'nizhny-novgorod': 56.33,
  'chelyabinsk': 55.16,
  'samara': 53.20,
  'omsk': 54.99,
  'rostov-on-don': 47.24,
  'ufa': 54.74,
  'krasnoyarsk': 56.01,
  'voronezh': 51.67,
  'perm': 58.01,
  'volgograd': 48.72,
  'krasnodar': 45.04,
  'sochi': 43.59,
  'murmansk': 68.97,
  'arkhangelsk': 64.54,
  'yakutsk': 62.03,

  // International reference cities
  'london': 51.51,
  'paris': 48.86,
  'berlin': 52.52,
  'new-york': 40.71,
  'los-angeles': 34.05,
  'tokyo': 35.68,
  'sydney': -33.87,
  'helsinki': 60.17,
  'oslo': 59.91,
  'stockholm': 59.33,
  'reykjavik': 64.15,
} as const;

/**
 * City longitude coordinates for sun time calculations
 */
export const CITY_LONGITUDES: Readonly<Record<string, number>> = {
  'moscow': 37.62,
  'spb': 30.31,
  'saint-petersburg': 30.31,
  'novosibirsk': 82.93,
  'ekaterinburg': 60.61,
  'kazan': 49.12,
  'nizhny-novgorod': 43.94,
  'chelyabinsk': 61.40,
  'samara': 50.10,
  'omsk': 73.37,
  'rostov-on-don': 39.72,
  'ufa': 55.97,
  'krasnoyarsk': 92.87,
  'voronezh': 39.18,
  'perm': 56.25,
  'volgograd': 44.51,
  'krasnodar': 38.98,
  'sochi': 39.73,
  'murmansk': 33.05,
  'arkhangelsk': 40.54,
  'yakutsk': 129.73,
  'london': -0.13,
  'paris': 2.35,
  'berlin': 13.40,
  'new-york': -74.01,
  'los-angeles': -118.24,
  'tokyo': 139.69,
  'sydney': 151.21,
  'helsinki': 24.94,
  'oslo': 10.75,
  'stockholm': 18.07,
  'reykjavik': -21.90,
} as const;

/**
 * SAD (Seasonal Affective Disorder) thresholds
 */
export const SAD_THRESHOLDS = {
  /** Latitude above which SAD risk is elevated */
  HIGH_RISK_LATITUDE: 55,

  /** Latitude above which SAD risk is very high */
  VERY_HIGH_RISK_LATITUDE: 60,

  /** Critical daylight hours threshold (below = high risk) */
  CRITICAL_DAYLIGHT_HOURS: 8,

  /** Moderate risk daylight hours threshold */
  MODERATE_DAYLIGHT_HOURS: 10,

  /** Winter months with highest SAD risk (0 = January) */
  WINTER_MONTHS: [10, 11, 0, 1] as readonly number[], // Nov, Dec, Jan, Feb

  /** Peak SAD risk months */
  PEAK_SAD_MONTHS: [11, 0, 1] as readonly number[], // Dec, Jan, Feb
} as const;

/**
 * Light therapy parameters
 */
export const LIGHT_THERAPY = {
  /** Standard lightbox lux for SAD treatment */
  STANDARD_LUX: 10000,

  /** Minimum effective lux */
  MINIMUM_LUX: 2500,

  /** Standard session duration in minutes */
  STANDARD_DURATION: 30,

  /** Maximum session duration */
  MAX_DURATION: 60,

  /** Minimum session duration */
  MIN_DURATION: 15,

  /** Optimal time window after waking (minutes) */
  OPTIMAL_WINDOW_AFTER_WAKE: 60,

  /** Hours before bed to start dimming lights */
  DIM_HOURS_BEFORE_BED: 2,
} as const;

/**
 * Season date boundaries (Northern hemisphere)
 */
export const SEASON_BOUNDARIES = {
  /** Spring equinox (approx March 20) */
  SPRING_START: { month: 2, day: 20 },

  /** Summer solstice (approx June 21) */
  SUMMER_START: { month: 5, day: 21 },

  /** Autumn equinox (approx September 22) */
  AUTUMN_START: { month: 8, day: 22 },

  /** Winter solstice (approx December 21) */
  WINTER_START: { month: 11, day: 21 },
} as const;

/**
 * Seasonal TIB adjustment parameters
 * NOTE: These are suggestions only - MIN_TIB (300 min) must always be respected
 */
export const SEASONAL_TIB = {
  /** Maximum winter TIB increase in minutes */
  MAX_WINTER_INCREASE: 30,

  /** Maximum summer TIB decrease in minutes */
  MAX_SUMMER_DECREASE: 15,

  /** Minimum confidence required for adjustment */
  MIN_CONFIDENCE_FOR_ADJUSTMENT: 'medium' as const,
} as const;

/**
 * Pre-verified seasonal tips library
 * All tips are from verified sources per CLAUDE.md §24
 */
export const SEASONAL_TIPS: readonly SeasonalTip[] = [
  // LIGHT category
  {
    id: 'light-morning-exposure',
    category: 'light',
    content: 'Постарайтесь получить 30 минут естественного света в первый час после пробуждения. Это помогает синхронизировать циркадные ритмы.',
    seasons: ['winter', 'autumn'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'A',
    source: 'European Insomnia Guideline 2023',
  },
  {
    id: 'light-lightbox',
    category: 'light',
    content: 'При недостатке естественного света рассмотрите использование светового короба (10000 люкс) утром в течение 20-30 минут.',
    seasons: ['winter'],
    sadRiskLevels: ['high'],
    evidenceLevel: 'A',
    source: 'Terman & Terman, 2005',
  },
  {
    id: 'light-evening-dim',
    category: 'light',
    content: 'За 2 часа до сна приглушите освещение и избегайте ярких экранов. Это поможет естественной выработке мелатонина.',
    seasons: ['winter', 'spring', 'summer', 'autumn'],
    sadRiskLevels: ['low', 'moderate', 'high'],
    evidenceLevel: 'A',
    source: 'CBT-I Sleep Hygiene Protocol',
  },
  {
    id: 'light-summer-blackout',
    category: 'light',
    content: 'В белые ночи используйте плотные шторы или маску для сна. Избыток света вечером может задерживать засыпание.',
    seasons: ['summer'],
    sadRiskLevels: ['low', 'moderate'],
    evidenceLevel: 'B',
    source: 'Circadian rhythm research',
  },

  // TEMPERATURE category
  {
    id: 'temp-winter-warmth',
    category: 'temperature',
    content: 'Оптимальная температура для сна — 16-19°C. Зимой проветрите комнату перед сном, но спите в тепле.',
    seasons: ['winter', 'autumn'],
    sadRiskLevels: ['low', 'moderate', 'high'],
    evidenceLevel: 'B',
    source: 'Sleep hygiene guidelines',
  },
  {
    id: 'temp-summer-cool',
    category: 'temperature',
    content: 'В жару охладите спальню заранее. Используйте легкое постельное белье и избегайте горячего душа перед сном.',
    seasons: ['summer'],
    sadRiskLevels: ['low'],
    evidenceLevel: 'B',
    source: 'Thermoregulation and sleep research',
  },
  {
    id: 'temp-warm-bath',
    category: 'temperature',
    content: 'Теплая ванна за 1-2 часа до сна помогает телу охладиться и подготовиться ко сну через механизм терморегуляции.',
    seasons: ['winter', 'spring', 'autumn'],
    sadRiskLevels: ['low', 'moderate', 'high'],
    evidenceLevel: 'B',
    source: 'Haghayegh et al., 2019',
  },

  // ACTIVITY category
  {
    id: 'activity-outdoor-winter',
    category: 'activity',
    content: 'Даже в пасмурные дни прогулка на улице дает больше света, чем помещение. 30 минут прогулки днем улучшат сон.',
    seasons: ['winter', 'autumn'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'A',
    source: 'Light exposure research',
  },
  {
    id: 'activity-morning-exercise',
    category: 'activity',
    content: 'Утренняя физическая активность помогает закрепить циркадные ритмы, особенно в темное время года.',
    seasons: ['winter', 'autumn'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'B',
    source: 'Exercise and circadian rhythm studies',
  },
  {
    id: 'activity-summer-timing',
    category: 'activity',
    content: 'Летом избегайте интенсивных тренировок в жару. Лучшее время — раннее утро или вечер (не позже чем за 3 часа до сна).',
    seasons: ['summer'],
    sadRiskLevels: ['low'],
    evidenceLevel: 'B',
    source: 'Exercise timing guidelines',
  },

  // NUTRITION category
  {
    id: 'nutrition-vitamin-d',
    category: 'nutrition',
    content: 'Зимой уровень витамина D часто снижается. Обсудите с врачом необходимость приема добавок.',
    seasons: ['winter'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'B',
    source: 'Vitamin D and seasonal depression research',
  },
  {
    id: 'nutrition-tryptophan',
    category: 'nutrition',
    content: 'Продукты с триптофаном (индейка, молоко, орехи) за 2-3 часа до сна могут помочь с засыпанием.',
    seasons: ['winter', 'spring', 'summer', 'autumn'],
    sadRiskLevels: ['low', 'moderate', 'high'],
    evidenceLevel: 'C',
    source: 'Nutritional sleep research',
  },

  // CIRCADIAN category
  {
    id: 'circadian-consistent',
    category: 'circadian',
    content: 'Поддерживайте стабильное время подъема даже в выходные. Это особенно важно в темное время года.',
    seasons: ['winter', 'autumn'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'A',
    source: 'CBT-I Stimulus Control',
  },
  {
    id: 'circadian-dawn-simulation',
    category: 'circadian',
    content: 'Симуляторы рассвета (будильники с постепенным светом) помогают проснуться естественно в темные месяцы.',
    seasons: ['winter'],
    sadRiskLevels: ['moderate', 'high'],
    evidenceLevel: 'B',
    source: 'Dawn simulation research',
  },
  {
    id: 'circadian-white-nights',
    category: 'circadian',
    content: 'В период белых ночей строго соблюдайте время отхода ко сну. Ваше тело не получит естественных сигналов темноты.',
    seasons: ['summer'],
    sadRiskLevels: ['low', 'moderate'],
    evidenceLevel: 'B',
    source: 'Northern latitude sleep research',
  },
] as const;

/**
 * Get latitude for a city name (case-insensitive)
 */
export function getCityLatitude(city: string): number | undefined {
  const normalizedCity = city.toLowerCase().trim().replace(/\s+/g, '-');
  return CITY_LATITUDES[normalizedCity];
}

/**
 * Get longitude for a city name (case-insensitive)
 */
export function getCityLongitude(city: string): number | undefined {
  const normalizedCity = city.toLowerCase().trim().replace(/\s+/g, '-');
  return CITY_LONGITUDES[normalizedCity];
}

/**
 * Get season for a given month (0-indexed, Northern hemisphere)
 */
export function getSeasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}
