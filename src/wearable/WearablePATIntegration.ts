/**
 * Wearable PAT Integration
 *
 * Bridges wearable data (Health Connect) with PAT adapter
 * for phenotyping using real HRV and sleep stage data.
 *
 * @packageDocumentation
 * @module wearable
 *
 * Scientific foundation:
 * - Consumer wearable HRV validation studies (2024-2025)
 * - Blanken et al. 2019 five-class insomnia phenotype model
 */

import {
  IWearableSleepData,
  IWearableSleepMetrics,
  IWearableHRVMetrics,
  IWearableStageDistribution,
} from './types';
/**
 * Wearable-derived actigraphy session
 * Simplified version compatible with PAT adapter
 */
export interface IWearableActigraphySession {
  userId: string;
  sessionId: string;
  deviceId: string;
  startTime: Date;
  endTime: Date;
  epochs: Array<{
    timestamp: Date;
    count: number;
    epochLength: number;
    isWorn: boolean;
  }>;
  metadata: {
    source: string;
    hasHRV: boolean;
    hasStages: boolean;
  };
}

/**
 * HRV features for phenotyping
 */
export interface IWearableHRVFeatures {
  /** Mean RMSSD over collection period (ms) */
  meanRMSSD: number;

  /** RMSSD standard deviation (ms) */
  sdRMSSD: number;

  /** 7-day trend coefficient (positive = improving) */
  trend: number;

  /** Number of nights with data */
  nightsWithData: number;

  /** Autonomic status classification */
  autonomicStatus: 'low' | 'normal' | 'high';
}

/**
 * Sleep features for phenotyping
 */
export interface IWearableSleepFeatures {
  /** Average sleep efficiency (%) */
  averageSE: number;

  /** Average total sleep time (minutes) */
  averageTST: number;

  /** Average WASO (minutes) */
  averageWASO: number;

  /** Average SOL (minutes) */
  averageSOL: number;

  /** Sleep efficiency variability (SD) */
  seVariability: number;

  /** Average stage distribution */
  stageDistribution: IWearableStageDistribution | null;
}

/**
 * Blanken phenotype hints from wearable data
 */
export interface IBlankenPhenotypeHints {
  /** Estimated phenotype (1-5) */
  estimatedType: 1 | 2 | 3 | 4 | 5 | null;

  /** Confidence in estimate (0-1) */
  confidence: number;

  /** Evidence supporting classification */
  evidence: string[];

  /** HRV-based indicators */
  hrvIndicators: {
    lowParasympathetic: boolean;
    highVariability: boolean;
    negativeTrend: boolean;
  };

  /** Sleep-based indicators */
  sleepIndicators: {
    poorEfficiency: boolean;
    longSOL: boolean;
    highWASO: boolean;
    fragmentedSleep: boolean;
  };
}

/**
 * Wearable data to PAT integration service
 */
export class WearablePATIntegration {
  /**
   * Extract HRV features from wearable data history
   *
   * @param sleepSessions - Array of sleep sessions (7+ days recommended)
   */
  extractHRVFeatures(sleepSessions: IWearableSleepData[]): IWearableHRVFeatures | null {
    // Filter sessions with HRV data
    const sessionsWithHRV = sleepSessions.filter(
      (s) => s.hrv && s.hrv.length > 0
    );

    if (sessionsWithHRV.length === 0) {
      return null;
    }

    // Calculate nightly mean RMSSD for each session
    const nightlyMeans: { date: Date; meanRMSSD: number }[] = [];

    for (const session of sessionsWithHRV) {
      if (!session.hrv || session.hrv.length === 0) continue;

      const validHRV = session.hrv.filter(
        (h) => h.rmssd >= 10 && h.rmssd <= 200
      );

      if (validHRV.length > 0) {
        const mean =
          validHRV.reduce((sum, h) => sum + h.rmssd, 0) / validHRV.length;
        nightlyMeans.push({
          date: new Date(session.startTime),
          meanRMSSD: mean,
        });
      }
    }

    if (nightlyMeans.length === 0) {
      return null;
    }

    // Sort by date
    nightlyMeans.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate aggregate metrics
    const allMeans = nightlyMeans.map((n) => n.meanRMSSD);
    const meanRMSSD = allMeans.reduce((a, b) => a + b, 0) / allMeans.length;
    const variance =
      allMeans.reduce((sum, v) => sum + Math.pow(v - meanRMSSD, 2), 0) /
      allMeans.length;
    const sdRMSSD = Math.sqrt(variance);

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(nightlyMeans.map((n) => n.meanRMSSD));

    // Classify autonomic status
    let autonomicStatus: 'low' | 'normal' | 'high';
    if (meanRMSSD < 25) {
      autonomicStatus = 'low';
    } else if (meanRMSSD > 60) {
      autonomicStatus = 'high';
    } else {
      autonomicStatus = 'normal';
    }

    return {
      meanRMSSD,
      sdRMSSD,
      trend,
      nightsWithData: nightlyMeans.length,
      autonomicStatus,
    };
  }

  /**
   * Extract sleep features from wearable data history
   */
  extractSleepFeatures(
    sleepSessions: IWearableSleepData[],
    metrics: IWearableSleepMetrics[]
  ): IWearableSleepFeatures | null {
    if (metrics.length === 0) {
      return null;
    }

    // Calculate averages
    const seValues = metrics.map((m) => m.se);
    const tstValues = metrics.map((m) => m.tst);
    const wasoValues = metrics.map((m) => m.waso);
    const solValues = metrics.map((m) => m.sol);

    const averageSE = seValues.reduce((a, b) => a + b, 0) / seValues.length;
    const averageTST = tstValues.reduce((a, b) => a + b, 0) / tstValues.length;
    const averageWASO = wasoValues.reduce((a, b) => a + b, 0) / wasoValues.length;
    const averageSOL = solValues.reduce((a, b) => a + b, 0) / solValues.length;

    // Calculate SE variability
    const seMean = averageSE;
    const seVariance =
      seValues.reduce((sum, v) => sum + Math.pow(v - seMean, 2), 0) /
      seValues.length;
    const seVariability = Math.sqrt(seVariance);

    // Aggregate stage distribution
    let stageDistribution: IWearableStageDistribution | null = null;
    const sessionsWithStages = metrics.filter((m) => m.stageDistribution);
    if (sessionsWithStages.length > 0) {
      const dists = sessionsWithStages.map((m) => m.stageDistribution!);
      stageDistribution = {
        wake: dists.reduce((a, d) => a + d.wake, 0) / dists.length,
        light: dists.reduce((a, d) => a + d.light, 0) / dists.length,
        deep: dists.reduce((a, d) => a + d.deep, 0) / dists.length,
        rem: dists.reduce((a, d) => a + d.rem, 0) / dists.length,
      };
    }

    return {
      averageSE,
      averageTST,
      averageWASO,
      averageSOL,
      seVariability,
      stageDistribution,
    };
  }

  /**
   * Estimate Blanken phenotype from wearable features
   *
   * Scientific basis:
   * - Blanken et al. 2019, Lancet Psychiatry
   * - HRV correlation with phenotypes (Jarrin et al. 2020)
   *
   * Note: This is an ESTIMATION based on limited wearable data.
   * Full phenotyping requires questionnaire data (personality, affect).
   */
  estimateBlankenPhenotype(
    hrvFeatures: IWearableHRVFeatures | null,
    sleepFeatures: IWearableSleepFeatures | null
  ): IBlankenPhenotypeHints {
    const evidence: string[] = [];
    const hrvIndicators = {
      lowParasympathetic: false,
      highVariability: false,
      negativeTrend: false,
    };
    const sleepIndicators = {
      poorEfficiency: false,
      longSOL: false,
      highWASO: false,
      fragmentedSleep: false,
    };

    // Analyze HRV indicators
    if (hrvFeatures) {
      if (hrvFeatures.autonomicStatus === 'low') {
        hrvIndicators.lowParasympathetic = true;
        evidence.push('Low parasympathetic tone (RMSSD < 25ms)');
      }
      if (hrvFeatures.sdRMSSD > 20) {
        hrvIndicators.highVariability = true;
        evidence.push('High HRV variability across nights');
      }
      if (hrvFeatures.trend < -0.5) {
        hrvIndicators.negativeTrend = true;
        evidence.push('Declining HRV trend over measurement period');
      }
    }

    // Analyze sleep indicators
    if (sleepFeatures) {
      if (sleepFeatures.averageSE < 85) {
        sleepIndicators.poorEfficiency = true;
        evidence.push(`Low sleep efficiency: ${sleepFeatures.averageSE.toFixed(1)}%`);
      }
      if (sleepFeatures.averageSOL > 30) {
        sleepIndicators.longSOL = true;
        evidence.push(`Long sleep latency: ${sleepFeatures.averageSOL.toFixed(0)} min`);
      }
      if (sleepFeatures.averageWASO > 45) {
        sleepIndicators.highWASO = true;
        evidence.push(`High WASO: ${sleepFeatures.averageWASO.toFixed(0)} min`);
      }
      if (
        sleepFeatures.stageDistribution &&
        sleepFeatures.stageDistribution.wake > 15
      ) {
        sleepIndicators.fragmentedSleep = true;
        evidence.push('Fragmented sleep (high wake percentage)');
      }
    }

    // Phenotype estimation logic
    // Based on Blanken model + HRV correlates
    let estimatedType: 1 | 2 | 3 | 4 | 5 | null = null;
    let confidence = 0;

    // Type 4 (High-Reactive): Low HRV + high variability
    if (hrvIndicators.lowParasympathetic && hrvIndicators.highVariability) {
      estimatedType = 4;
      confidence = 0.6;
      evidence.push('→ Matches Type 4 (High-Reactive) profile');
    }
    // Type 1 (Highly Distressed): Low HRV + poor efficiency + long SOL
    else if (
      hrvIndicators.lowParasympathetic &&
      sleepIndicators.poorEfficiency &&
      sleepIndicators.longSOL
    ) {
      estimatedType = 1;
      confidence = 0.55;
      evidence.push('→ Matches Type 1 (Highly Distressed) profile');
    }
    // Type 3 (Reward-Insensitive): Moderate issues, no HRV extremes
    else if (
      sleepIndicators.poorEfficiency &&
      !hrvIndicators.lowParasympathetic &&
      !hrvIndicators.highVariability
    ) {
      estimatedType = 3;
      confidence = 0.45;
      evidence.push('→ Matches Type 3 (Reward-Insensitive) profile');
    }
    // Type 5 (Low-Reactive): Good HRV, mild sleep issues
    else if (
      hrvFeatures &&
      hrvFeatures.autonomicStatus !== 'low' &&
      sleepFeatures &&
      sleepFeatures.seVariability < 8
    ) {
      estimatedType = 5;
      confidence = 0.5;
      evidence.push('→ Matches Type 5 (Low-Reactive) profile');
    }
    // Type 2 (Reward-Sensitive): Variable patterns
    else if (hrvIndicators.highVariability && sleepFeatures && sleepFeatures.seVariability > 10) {
      estimatedType = 2;
      confidence = 0.4;
      evidence.push('→ Possible Type 2 (Reward-Sensitive) profile');
    }

    // Reduce confidence if data is limited
    if (
      !hrvFeatures ||
      hrvFeatures.nightsWithData < 5 ||
      !sleepFeatures ||
      sleepFeatures.averageTST === 0
    ) {
      confidence *= 0.7;
      evidence.push('Note: Limited data reduces confidence');
    }

    return {
      estimatedType,
      confidence,
      evidence,
      hrvIndicators,
      sleepIndicators,
    };
  }

  /**
   * Convert wearable data to actigraphy session format for PAT
   *
   * This enables using PAT's phenotyping on wearable-derived data
   */
  convertToActigraphySession(
    userId: string,
    sleepSession: IWearableSleepData
  ): IWearableActigraphySession {
    // Create epoch-level activity counts from sleep stages
    const epochs: IWearableActigraphySession['epochs'] = [];
    const startTime = new Date(sleepSession.startTime);
    const endTime = new Date(sleepSession.endTime);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    if (sleepSession.stages && sleepSession.stages.length > 0) {
      // Use stages to create activity pattern
      for (const stage of sleepSession.stages) {
        const stageStart = new Date(stage.startTime);
        const stageEnd = new Date(stage.endTime);
        const stageDurationMin = (stageEnd.getTime() - stageStart.getTime()) / (1000 * 60);

        // Activity count based on sleep stage
        let activityCount: number;
        switch (stage.type) {
          case 'awake':
          case 'awake_in_bed':
          case 'out_of_bed':
            activityCount = 500 + Math.random() * 500; // High activity
            break;
          case 'light':
            activityCount = 50 + Math.random() * 100; // Low activity
            break;
          case 'deep':
            activityCount = 10 + Math.random() * 30; // Very low activity
            break;
          case 'rem':
            activityCount = 30 + Math.random() * 70; // Low-moderate (eye movement)
            break;
          default:
            activityCount = 100; // Unknown
        }

        // Create epochs for this stage (1-minute resolution)
        for (let m = 0; m < stageDurationMin; m++) {
          const epochTime = new Date(stageStart.getTime() + m * 60 * 1000);
          epochs.push({
            timestamp: epochTime,
            count: Math.round(activityCount * (0.8 + Math.random() * 0.4)),
            epochLength: 60,
            isWorn: true,
          });
        }
      }
    } else {
      // No stages - create uniform sleep pattern
      for (let m = 0; m < durationMinutes; m++) {
        const epochTime = new Date(startTime.getTime() + m * 60 * 1000);
        epochs.push({
          timestamp: epochTime,
          count: Math.round(50 + Math.random() * 50),
          epochLength: 60,
          isWorn: true,
        });
      }
    }

    return {
      userId,
      sessionId: sleepSession.sessionId,
      deviceId: sleepSession.deviceId,
      startTime,
      endTime,
      epochs,
      metadata: {
        source: sleepSession.source,
        hasHRV: !!sleepSession.hrv && sleepSession.hrv.length > 0,
        hasStages: !!sleepSession.stages && sleepSession.stages.length > 0,
      },
    };
  }

  /**
   * Calculate trend from time series (simple linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }
}

/**
 * Create integration instance
 */
export function createWearablePATIntegration(): WearablePATIntegration {
  return new WearablePATIntegration();
}
