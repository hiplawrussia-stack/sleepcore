/**
 * Readiness Score Calculator
 * ==========================
 * Computes composite readiness/recovery scores from wearable data.
 *
 * Similar to:
 * - Oura Readiness Score
 * - WHOOP Recovery Score
 * - Garmin Body Battery
 *
 * Scientific foundation:
 * - HRV as recovery indicator (Buchheit 2014)
 * - Sleep quality metrics (Buysse 2014)
 * - Sleep stage distribution norms (Ohayon 2004)
 *
 * @packageDocumentation
 * @module wearable
 * @since 2025-02
 */

import {
  IWearableSleepMetrics,
  IWearableReadinessScore,
} from './types';

/**
 * Configuration for readiness score calculation
 */
export interface IReadinessScoreConfig {
  /**
   * Weight for HRV component (default 0.30)
   */
  hrvWeight: number;

  /**
   * Weight for sleep quality component (default 0.25)
   */
  sleepQualityWeight: number;

  /**
   * Weight for sleep duration component (default 0.20)
   */
  sleepDurationWeight: number;

  /**
   * Weight for recovery (deep + REM) component (default 0.15)
   */
  recoveryWeight: number;

  /**
   * Weight for respiratory component (default 0.10)
   */
  respiratoryWeight: number;

  /**
   * User's personal HRV baseline (RMSSD in ms)
   * If not provided, uses population average
   */
  personalHrvBaseline?: number;

  /**
   * User's optimal sleep duration (minutes)
   * Default: 450 (7.5 hours)
   */
  optimalSleepDuration: number;
}

const DEFAULT_CONFIG: IReadinessScoreConfig = {
  hrvWeight: 0.30,
  sleepQualityWeight: 0.25,
  sleepDurationWeight: 0.20,
  recoveryWeight: 0.15,
  respiratoryWeight: 0.10,
  optimalSleepDuration: 450, // 7.5 hours
};

// Population norms for normalization
const POPULATION_NORMS = {
  // HRV RMSSD norms by age (simplified)
  hrvRmssdAverage: 42, // ms, healthy adult average
  hrvRmssdMin: 10,     // ms, lower bound
  hrvRmssdMax: 100,    // ms, high performers

  // Sleep efficiency norms
  seOptimal: 85,       // %
  seExcellent: 90,     // %

  // Sleep duration norms (minutes)
  tstMin: 300,         // 5 hours minimum
  tstOptimal: 450,     // 7.5 hours
  tstMax: 540,         // 9 hours

  // Stage distribution norms (% of TST)
  deepOptimal: 20,     // 15-25% is healthy
  remOptimal: 25,      // 20-25% is healthy

  // SpO2 norms
  spo2Normal: 95,      // % minimum normal
  spo2Optimal: 97,     // % optimal
};

/**
 * Calculate readiness score from wearable sleep metrics
 */
export function calculateReadinessScore(
  metrics: IWearableSleepMetrics,
  config: Partial<IReadinessScoreConfig> = {}
): IWearableReadinessScore {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const factors: IWearableReadinessScore['contributingFactors'] = [];

  // Calculate individual components
  const hrvScore = calculateHrvComponent(metrics, cfg, factors);
  const sleepQualityScore = calculateSleepQualityComponent(metrics, factors);
  const sleepDurationScore = calculateSleepDurationComponent(metrics, cfg, factors);
  const recoveryScore = calculateRecoveryComponent(metrics, factors);
  const respiratoryScore = calculateRespiratoryComponent(metrics, factors);

  // Calculate confidence based on available data
  const confidence = calculateConfidence(metrics);

  // Adjust weights if respiratory data not available
  let effectiveWeights = { ...cfg };
  if (respiratoryScore === null) {
    // Redistribute respiratory weight to other components
    const redistribution = cfg.respiratoryWeight / 4;
    effectiveWeights = {
      ...cfg,
      hrvWeight: cfg.hrvWeight + redistribution,
      sleepQualityWeight: cfg.sleepQualityWeight + redistribution,
      sleepDurationWeight: cfg.sleepDurationWeight + redistribution,
      recoveryWeight: cfg.recoveryWeight + redistribution,
      respiratoryWeight: 0,
    };
  }

  // Calculate weighted overall score
  const overall = Math.round(
    hrvScore * effectiveWeights.hrvWeight +
    sleepQualityScore * effectiveWeights.sleepQualityWeight +
    sleepDurationScore * effectiveWeights.sleepDurationWeight +
    recoveryScore * effectiveWeights.recoveryWeight +
    (respiratoryScore ?? 0) * effectiveWeights.respiratoryWeight
  );

  // Sort factors by absolute impact
  factors.sort((a, b) => {
    const impactOrder = { negative: 0, neutral: 1, positive: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  return {
    overall: clamp(overall, 0, 100),
    components: {
      hrv: hrvScore,
      sleepQuality: sleepQualityScore,
      sleepDuration: sleepDurationScore,
      recovery: recoveryScore,
      respiratory: respiratoryScore ?? undefined,
    },
    confidence,
    contributingFactors: factors.slice(0, 5), // Top 5 factors
  };
}

/**
 * Calculate HRV component (0-100)
 */
function calculateHrvComponent(
  metrics: IWearableSleepMetrics,
  config: IReadinessScoreConfig,
  factors: IWearableReadinessScore['contributingFactors']
): number {
  if (!metrics.hrvMetrics) {
    factors.push({
      factor: 'HRV data missing',
      impact: 'neutral',
      description: 'No HRV data available for analysis',
    });
    return 50; // Neutral score
  }

  const rmssd = metrics.hrvMetrics.meanRMSSD;
  const baseline = config.personalHrvBaseline ?? POPULATION_NORMS.hrvRmssdAverage;

  // Score based on deviation from baseline
  // Above baseline = positive, below = negative
  const ratio = rmssd / baseline;

  let score: number;
  if (ratio >= 1.2) {
    score = 90 + (ratio - 1.2) * 50; // Excellent
    factors.push({
      factor: 'HRV elevated',
      impact: 'positive',
      description: 'Heart rate variability above baseline indicates good recovery',
    });
  } else if (ratio >= 1.0) {
    score = 70 + (ratio - 1.0) * 100;
    factors.push({
      factor: 'HRV normal',
      impact: 'positive',
      description: 'Heart rate variability at or above baseline',
    });
  } else if (ratio >= 0.8) {
    score = 40 + (ratio - 0.8) * 150;
    factors.push({
      factor: 'HRV below baseline',
      impact: 'negative',
      description: 'Heart rate variability below baseline suggests incomplete recovery',
    });
  } else {
    score = ratio * 50;
    factors.push({
      factor: 'HRV significantly low',
      impact: 'negative',
      description: 'Very low HRV indicates stress or poor recovery',
    });
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Calculate sleep quality component (0-100)
 */
function calculateSleepQualityComponent(
  metrics: IWearableSleepMetrics,
  factors: IWearableReadinessScore['contributingFactors']
): number {
  const { se, awakenings, waso } = metrics;

  // Sleep efficiency contribution (0-60 points)
  let seScore: number;
  if (se >= POPULATION_NORMS.seExcellent) {
    seScore = 60;
  } else if (se >= POPULATION_NORMS.seOptimal) {
    seScore = 50 + (se - POPULATION_NORMS.seOptimal) * 2;
  } else if (se >= 75) {
    seScore = 30 + (se - 75) * 2;
  } else {
    seScore = se * 0.4;
  }

  // Awakenings penalty (0-20 points deducted)
  const awakeningsPenalty = Math.min(awakenings * 3, 20);

  // WASO penalty (0-20 points deducted)
  const wasoPenalty = Math.min(waso / 3, 20);

  const score = seScore - awakeningsPenalty / 2 - wasoPenalty / 2 + 40;

  // Add factor
  if (se >= POPULATION_NORMS.seExcellent) {
    factors.push({
      factor: 'Excellent sleep efficiency',
      impact: 'positive',
      description: `Sleep efficiency of ${se.toFixed(0)}% is excellent`,
    });
  } else if (se < 75) {
    factors.push({
      factor: 'Low sleep efficiency',
      impact: 'negative',
      description: `Sleep efficiency of ${se.toFixed(0)}% indicates fragmented sleep`,
    });
  }

  if (awakenings > 5) {
    factors.push({
      factor: 'Frequent awakenings',
      impact: 'negative',
      description: `${awakenings} awakenings disrupted sleep continuity`,
    });
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Calculate sleep duration component (0-100)
 */
function calculateSleepDurationComponent(
  metrics: IWearableSleepMetrics,
  config: IReadinessScoreConfig,
  factors: IWearableReadinessScore['contributingFactors']
): number {
  const { tst } = metrics;
  const optimal = config.optimalSleepDuration;

  // Penalize both under-sleeping and over-sleeping
  const deviation = Math.abs(tst - optimal);
  const hours = tst / 60;

  let score: number;
  if (tst >= optimal && tst <= POPULATION_NORMS.tstMax) {
    score = 100 - (tst - optimal) / 3;
  } else if (tst >= POPULATION_NORMS.tstMin && tst < optimal) {
    score = 60 + ((tst - POPULATION_NORMS.tstMin) / (optimal - POPULATION_NORMS.tstMin)) * 40;
  } else if (tst < POPULATION_NORMS.tstMin) {
    score = (tst / POPULATION_NORMS.tstMin) * 60;
    factors.push({
      factor: 'Insufficient sleep',
      impact: 'negative',
      description: `Only ${hours.toFixed(1)} hours of sleep is below recommended minimum`,
    });
  } else {
    score = 70; // Oversleeping
    factors.push({
      factor: 'Extended sleep',
      impact: 'neutral',
      description: `${hours.toFixed(1)} hours may indicate sleep debt recovery`,
    });
  }

  if (tst >= optimal && tst <= POPULATION_NORMS.tstMax) {
    factors.push({
      factor: 'Optimal sleep duration',
      impact: 'positive',
      description: `${hours.toFixed(1)} hours is within optimal range`,
    });
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Calculate recovery component (deep + REM) (0-100)
 */
function calculateRecoveryComponent(
  metrics: IWearableSleepMetrics,
  factors: IWearableReadinessScore['contributingFactors']
): number {
  if (!metrics.stageDistribution) {
    return 50; // Neutral if no staging data
  }

  const { deep, rem } = metrics.stageDistribution;

  // Deep sleep contribution (0-50 points)
  let deepScore: number;
  if (deep >= POPULATION_NORMS.deepOptimal) {
    deepScore = 50;
    factors.push({
      factor: 'Excellent deep sleep',
      impact: 'positive',
      description: `${deep.toFixed(0)}% deep sleep supports physical recovery`,
    });
  } else if (deep >= 15) {
    deepScore = 30 + (deep - 15) * 4;
  } else {
    deepScore = deep * 2;
    factors.push({
      factor: 'Low deep sleep',
      impact: 'negative',
      description: `Only ${deep.toFixed(0)}% deep sleep may limit physical recovery`,
    });
  }

  // REM contribution (0-50 points)
  let remScore: number;
  if (rem >= POPULATION_NORMS.remOptimal) {
    remScore = 50;
    factors.push({
      factor: 'Excellent REM sleep',
      impact: 'positive',
      description: `${rem.toFixed(0)}% REM sleep supports cognitive recovery`,
    });
  } else if (rem >= 18) {
    remScore = 30 + (rem - 18) * 2.85;
  } else {
    remScore = rem * 1.67;
    factors.push({
      factor: 'Low REM sleep',
      impact: 'negative',
      description: `Only ${rem.toFixed(0)}% REM may limit cognitive recovery`,
    });
  }

  return clamp(Math.round(deepScore + remScore), 0, 100);
}

/**
 * Calculate respiratory component (0-100)
 */
function calculateRespiratoryComponent(
  metrics: IWearableSleepMetrics,
  factors: IWearableReadinessScore['contributingFactors']
): number | null {
  if (!metrics.spo2Metrics && !metrics.respiratoryMetrics) {
    return null; // No respiratory data
  }

  let score = 100;

  // SpO2 contribution
  if (metrics.spo2Metrics) {
    const { meanSpO2, minSpO2, desaturationEvents } = metrics.spo2Metrics;

    if (meanSpO2 < POPULATION_NORMS.spo2Normal) {
      score -= (POPULATION_NORMS.spo2Normal - meanSpO2) * 5;
      factors.push({
        factor: 'Low blood oxygen',
        impact: 'negative',
        description: `Mean SpO2 of ${meanSpO2.toFixed(0)}% is below normal`,
      });
    }

    if (minSpO2 < 90) {
      score -= (90 - minSpO2) * 3;
      factors.push({
        factor: 'SpO2 desaturation',
        impact: 'negative',
        description: `SpO2 dropped to ${minSpO2.toFixed(0)}% during sleep`,
      });
    }

    if (desaturationEvents > 5) {
      score -= Math.min(desaturationEvents * 2, 20);
    }
  }

  // Breathing disturbances
  if (metrics.respiratoryMetrics?.breathingDisturbanceIndex) {
    const bdi = metrics.respiratoryMetrics.breathingDisturbanceIndex;
    if (bdi >= 15) {
      score -= 30;
      factors.push({
        factor: 'Elevated breathing disturbances',
        impact: 'negative',
        description: 'Consider consulting a sleep specialist',
      });
    } else if (bdi >= 5) {
      score -= 15;
    }
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Calculate confidence level based on available data
 */
function calculateConfidence(metrics: IWearableSleepMetrics): number {
  let dataPoints = 0;
  const maxPoints = 5;

  // Check what data is available
  if (metrics.hrvMetrics && metrics.hrvMetrics.sampleCount >= 3) {
    dataPoints += 1;
  }
  if (metrics.stageDistribution) {
    dataPoints += 1;
  }
  if (metrics.tst > 0 && metrics.tib > 0) {
    dataPoints += 1;
  }
  if (metrics.spo2Metrics) {
    dataPoints += 1;
  }
  if (metrics.respiratoryMetrics) {
    dataPoints += 1;
  }

  return dataPoints / maxPoints;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get readiness category from score
 */
export function getReadinessCategory(score: number): {
  category: 'poor' | 'moderate' | 'good' | 'excellent';
  recommendation: string;
} {
  if (score >= 81) {
    return {
      category: 'excellent',
      recommendation: 'Great recovery! You are ready for high-intensity activities.',
    };
  } else if (score >= 61) {
    return {
      category: 'good',
      recommendation: 'Good recovery. Normal activities are fine.',
    };
  } else if (score >= 31) {
    return {
      category: 'moderate',
      recommendation: 'Moderate recovery. Consider lighter activities today.',
    };
  } else {
    return {
      category: 'poor',
      recommendation: 'Poor recovery. Prioritize rest and recovery today.',
    };
  }
}
