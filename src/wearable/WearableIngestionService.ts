/**
 * Wearable Data Ingestion Service
 *
 * Processes incoming wearable sleep and HRV data from Health Connect
 * and other sources, validates quality, calculates metrics, and
 * integrates with PAT adapter for phenotyping.
 *
 * @packageDocumentation
 * @module wearable
 *
 * Safety considerations:
 * - Data quality validation before use
 * - Outlier detection for HRV
 * - Cross-validation with user diary when available
 *
 * Scientific foundation:
 * - Consumer wearable HRV validation studies (2024-2025)
 * - Health Connect API data types
 */

import {
  IWearableSleepData,
  IWearableSleepMetrics,
  IWearableHRVMetrics,
  IWearableStageDistribution,
  IWearableDataQuality,
  IWearableSyncPayload,
  IWearableSyncResponse,
  IWearableSleepStage,
  IWearableHRVRecord,
  STAGE_MAPPING,
  SleepCoreStage
} from './types';

/**
 * Configuration for wearable ingestion
 */
export interface IWearableIngestionConfig {
  /** Minimum RMSSD value to accept (ms) */
  minRMSSD: number;

  /** Maximum RMSSD value to accept (ms) */
  maxRMSSD: number;

  /** Minimum samples for valid HRV calculation */
  minHRVSamples: number;

  /** Minimum session duration (minutes) */
  minSessionDuration: number;

  /** Maximum session duration (minutes) */
  maxSessionDuration: number;

  /** Enable outlier filtering */
  filterOutliers: boolean;
}

/**
 * Default configuration based on physiological norms
 */
const DEFAULT_CONFIG: IWearableIngestionConfig = {
  minRMSSD: 10,           // Below 10ms is artifact or severe pathology
  maxRMSSD: 200,          // Above 200ms is likely artifact
  minHRVSamples: 10,      // Need at least 10 samples for meaningful average
  minSessionDuration: 60, // Less than 1 hour is likely nap or error
  maxSessionDuration: 840, // More than 14 hours is error
  filterOutliers: true
};

/**
 * Service for ingesting and processing wearable sleep data
 */
export class WearableIngestionService {
  private config: IWearableIngestionConfig;

  constructor(config: Partial<IWearableIngestionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a sync payload from companion app
   */
  async processSyncPayload(
    payload: IWearableSyncPayload
  ): Promise<IWearableSyncResponse> {
    const errors: Array<{ sessionId: string; error: string }> = [];
    let sessionsProcessed = 0;

    for (const session of payload.sleepSessions) {
      try {
        // Validate data quality
        const quality = this.validateDataQuality(session);

        if (quality.errors.length > 0) {
          errors.push({
            sessionId: session.sessionId,
            error: quality.errors.join('; ')
          });
          continue;
        }

        // Calculate metrics
        const metrics = this.calculateMetrics(session);

        // Store session (implementation would save to database)
        await this.storeSession(payload.userId, session, metrics, quality);

        sessionsProcessed++;
      } catch (error) {
        errors.push({
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: errors.length === 0,
      sessionsProcessed,
      errors: errors.length > 0 ? errors : undefined,
      nextSyncIn: 'PT15M' // 15 minutes (Health Connect background limit)
    };
  }

  /**
   * Validate data quality before processing
   */
  validateDataQuality(data: IWearableSleepData): IWearableDataQuality {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check session duration
    const durationMinutes = this.calculateDurationMinutes(
      data.startTime,
      data.endTime
    );

    const durationValid =
      durationMinutes >= this.config.minSessionDuration &&
      durationMinutes <= this.config.maxSessionDuration;

    if (!durationValid) {
      if (durationMinutes < this.config.minSessionDuration) {
        errors.push(
          `Session too short: ${durationMinutes} min (min: ${this.config.minSessionDuration})`
        );
      } else {
        errors.push(
          `Session too long: ${durationMinutes} min (max: ${this.config.maxSessionDuration})`
        );
      }
    }

    // Check HRV data quality
    let hrvValid = true;
    let sufficientSamples = true;

    if (data.hrv && data.hrv.length > 0) {
      sufficientSamples = data.hrv.length >= this.config.minHRVSamples;

      if (!sufficientSamples) {
        warnings.push(
          `Low HRV sample count: ${data.hrv.length} (recommended: ${this.config.minHRVSamples}+)`
        );
      }

      // Check for out-of-range values
      const invalidHRV = data.hrv.filter(
        (h) => h.rmssd < this.config.minRMSSD || h.rmssd > this.config.maxRMSSD
      );

      if (invalidHRV.length > data.hrv.length * 0.5) {
        hrvValid = false;
        errors.push(
          `Too many invalid HRV values: ${invalidHRV.length}/${data.hrv.length}`
        );
      } else if (invalidHRV.length > 0) {
        warnings.push(
          `Some HRV values out of range: ${invalidHRV.length}/${data.hrv.length} (will be filtered)`
        );
      }
    }

    // Check for data continuity (gaps)
    let continuousData = true;
    if (data.stages && data.stages.length > 1) {
      const gaps = this.findGaps(data.stages);
      if (gaps.totalGapMinutes > 30) {
        warnings.push(`Data gaps detected: ${gaps.totalGapMinutes} minutes`);
        continuousData = false;
      }
    }

    // Calculate overall quality score
    const overallScore = this.calculateQualityScore({
      durationValid,
      hrvValid,
      sufficientSamples,
      continuousData
    });

    return {
      overallScore,
      checks: {
        durationValid,
        hrvValid,
        sufficientSamples,
        continuousData
      },
      warnings,
      errors
    };
  }

  /**
   * Calculate sleep metrics from wearable data
   */
  calculateMetrics(data: IWearableSleepData): IWearableSleepMetrics {
    const tib = this.calculateDurationMinutes(data.startTime, data.endTime);

    // Calculate TST and stage metrics
    let tst: number;
    let waso: number;
    let sol: number;
    let awakenings: number;
    let stageDistribution: IWearableStageDistribution | undefined;

    if (data.stages && data.stages.length > 0) {
      const stageMetrics = this.calculateStageMetrics(data.stages, data.startTime);
      tst = stageMetrics.tst;
      waso = stageMetrics.waso;
      sol = stageMetrics.sol;
      awakenings = stageMetrics.awakenings;
      stageDistribution = stageMetrics.distribution;
    } else {
      // No staging data - estimate from total session
      // Conservative: assume 85% sleep efficiency (typical for insomnia patients)
      tst = tib * 0.85;
      waso = tib * 0.10;
      sol = tib * 0.05;
      awakenings = 0; // Unknown
    }

    // Sleep efficiency
    const se = tib > 0 ? (tst / tib) * 100 : 0;

    // HRV metrics
    let hrvMetrics: IWearableHRVMetrics | undefined;
    if (data.hrv && data.hrv.length > 0) {
      hrvMetrics = this.calculateHRVMetrics(data.hrv);
    }

    return {
      tst,
      tib,
      se,
      waso,
      sol,
      awakenings,
      hrvMetrics,
      stageDistribution
    };
  }

  /**
   * Calculate metrics from sleep stages
   */
  private calculateStageMetrics(
    stages: IWearableSleepStage[],
    sessionStart: Date
  ): {
    tst: number;
    waso: number;
    sol: number;
    awakenings: number;
    distribution: IWearableStageDistribution;
  } {
    let wakeMinutes = 0;
    let lightMinutes = 0;
    let deepMinutes = 0;
    let remMinutes = 0;
    let awakenings = 0;
    let sol = 0;
    let firstSleepFound = false;
    let wasAsleep = false;

    // Sort stages by start time
    const sortedStages = [...stages].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (const stage of sortedStages) {
      const duration = this.calculateDurationMinutes(
        stage.startTime,
        stage.endTime
      );

      const coreStage = STAGE_MAPPING[stage.type];

      if (coreStage === 'wake') {
        wakeMinutes += duration;

        if (!firstSleepFound) {
          // This is sleep onset latency
          sol += duration;
        } else {
          // This is WASO
          if (wasAsleep) {
            awakenings++;
          }
        }
        wasAsleep = false;
      } else if (coreStage === 'light') {
        lightMinutes += duration;
        firstSleepFound = true;
        wasAsleep = true;
      } else if (coreStage === 'deep') {
        deepMinutes += duration;
        firstSleepFound = true;
        wasAsleep = true;
      } else if (coreStage === 'rem') {
        remMinutes += duration;
        firstSleepFound = true;
        wasAsleep = true;
      }
    }

    const totalSleepMinutes = lightMinutes + deepMinutes + remMinutes;
    const totalMinutes = wakeMinutes + totalSleepMinutes;
    const waso = firstSleepFound ? wakeMinutes - sol : 0;

    // Calculate distribution percentages
    const distribution: IWearableStageDistribution = {
      wake: totalMinutes > 0 ? (wakeMinutes / totalMinutes) * 100 : 0,
      light: totalMinutes > 0 ? (lightMinutes / totalMinutes) * 100 : 0,
      deep: totalMinutes > 0 ? (deepMinutes / totalMinutes) * 100 : 0,
      rem: totalMinutes > 0 ? (remMinutes / totalMinutes) * 100 : 0
    };

    return {
      tst: totalSleepMinutes,
      waso: Math.max(0, waso),
      sol,
      awakenings,
      distribution
    };
  }

  /**
   * Calculate HRV metrics from records
   */
  private calculateHRVMetrics(records: IWearableHRVRecord[]): IWearableHRVMetrics {
    // Filter to valid range
    let validRecords = records.filter(
      (r) => r.rmssd >= this.config.minRMSSD && r.rmssd <= this.config.maxRMSSD
    );

    // Apply outlier filtering if enabled
    if (this.config.filterOutliers && validRecords.length > 4) {
      validRecords = this.filterOutliersIQR(validRecords);
    }

    if (validRecords.length === 0) {
      return {
        meanRMSSD: 0,
        sdRMSSD: 0,
        minRMSSD: 0,
        maxRMSSD: 0,
        sampleCount: 0
      };
    }

    const values = validRecords.map((r) => r.rmssd);

    const meanRMSSD = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - meanRMSSD, 2), 0) /
      values.length;
    const sdRMSSD = Math.sqrt(variance);
    const minRMSSD = Math.min(...values);
    const maxRMSSD = Math.max(...values);

    return {
      meanRMSSD,
      sdRMSSD,
      minRMSSD,
      maxRMSSD,
      sampleCount: validRecords.length
    };
  }

  /**
   * Filter outliers using IQR method
   */
  private filterOutliersIQR(records: IWearableHRVRecord[]): IWearableHRVRecord[] {
    const values = records.map((r) => r.rmssd).sort((a, b) => a - b);

    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);

    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return records.filter(
      (r) => r.rmssd >= lowerBound && r.rmssd <= upperBound
    );
  }

  /**
   * Find gaps in sleep stage data
   */
  private findGaps(stages: IWearableSleepStage[]): {
    gaps: Array<{ start: Date; end: Date; minutes: number }>;
    totalGapMinutes: number;
  } {
    const gaps: Array<{ start: Date; end: Date; minutes: number }> = [];
    let totalGapMinutes = 0;

    const sorted = [...stages].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(sorted[i - 1].endTime);
      const currStart = new Date(sorted[i].startTime);

      const gapMinutes = this.calculateDurationMinutes(prevEnd, currStart);

      if (gapMinutes > 5) {
        // More than 5 minute gap
        gaps.push({
          start: prevEnd,
          end: currStart,
          minutes: gapMinutes
        });
        totalGapMinutes += gapMinutes;
      }
    }

    return { gaps, totalGapMinutes };
  }

  /**
   * Calculate duration between two times in minutes
   */
  private calculateDurationMinutes(start: Date | string, end: Date | string): number {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return Math.max(0, (endMs - startMs) / (1000 * 60));
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(checks: {
    durationValid: boolean;
    hrvValid: boolean;
    sufficientSamples: boolean;
    continuousData: boolean;
  }): number {
    const weights = {
      durationValid: 0.3,
      hrvValid: 0.3,
      sufficientSamples: 0.2,
      continuousData: 0.2
    };

    let score = 0;
    if (checks.durationValid) score += weights.durationValid;
    if (checks.hrvValid) score += weights.hrvValid;
    if (checks.sufficientSamples) score += weights.sufficientSamples;
    if (checks.continuousData) score += weights.continuousData;

    return score;
  }

  /**
   * Store session in database (placeholder implementation)
   */
  private async storeSession(
    userId: string,
    data: IWearableSleepData,
    metrics: IWearableSleepMetrics,
    quality: IWearableDataQuality
  ): Promise<void> {
    // TODO: Implement actual database storage
    // This would use WearableRepository to persist data
    console.log(`Storing session ${data.sessionId} for user ${userId}`);
    console.log(`Metrics: TST=${metrics.tst}, SE=${metrics.se.toFixed(1)}%`);
    if (metrics.hrvMetrics) {
      console.log(`HRV: mean RMSSD=${metrics.hrvMetrics.meanRMSSD.toFixed(1)}ms`);
    }
  }
}
