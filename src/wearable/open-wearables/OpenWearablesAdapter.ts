/**
 * Open Wearables Data Adapter
 *
 * Normalizes data from Open Wearables API to SleepCore internal format.
 * Handles data from 200+ wearable devices through a unified interface.
 *
 * @packageDocumentation
 * @module wearable/open-wearables
 *
 * Data flow:
 * 1. OpenWearablesClient fetches raw data from API
 * 2. OpenWearablesAdapter normalizes to IWearableSleepData
 * 3. WearableIngestionService validates and processes
 * 4. Data integrates with PAT for phenotyping
 *
 * Provider-specific handling:
 * - Fitbit: RMSSD from heart rate variability API
 * - Garmin: Sleep stages + HRV from Connect API
 * - Oura: High-quality HRV + temperature
 * - WHOOP: Recovery metrics + strain
 * - Polar: Training-focused HRV
 *
 * @since 2026-02
 */

import {
  IOpenWearablesSleepSession,
  IOpenWearablesSleepStage,
  IOpenWearablesHRVRecord,
  IOpenWearablesHeartRateRecord,
  IOpenWearablesSpO2Record,
  IOpenWearablesRespirationRecord,
  IOpenWearablesTemperatureRecord,
  OpenWearablesProvider,
} from './types';

import {
  IWearableSleepData,
  IWearableSleepStage,
  IWearableHRVRecord,
  IWearableHeartRateRecord,
  WearableSource,
  WearableSleepStage,
} from '../types';

/**
 * Mapping from Open Wearables provider to SleepCore source
 */
const PROVIDER_TO_SOURCE: Record<OpenWearablesProvider, WearableSource> = {
  fitbit: 'fitbit',
  garmin: 'garmin',
  oura: 'oura',
  polar: 'polar',
  whoop: 'whoop',
  withings: 'manual',        // Map to manual as closest match
  apple_health: 'apple_health',
  google_fit: 'google_fit',
  samsung_health: 'samsung_health',
  huawei_health: 'manual',   // Map to manual
  xiaomi_mi_fitness: 'manual',
  amazfit: 'manual',
  suunto: 'manual',
  coros: 'manual',
  eight_sleep: 'manual',
  dreem: 'manual',
  muse: 'manual',
  biostrap: 'manual',
  ouraring: 'oura',
  custom: 'manual',
};

/**
 * Mapping from Open Wearables stage to SleepCore stage
 */
const STAGE_MAPPING: Record<IOpenWearablesSleepStage['type'], WearableSleepStage> = {
  awake: 'awake',
  light: 'light',
  deep: 'deep',
  rem: 'rem',
  unknown: 'unknown',
};

/**
 * Provider-specific configuration
 */
interface IProviderConfig {
  /** Whether provider provides reliable HRV */
  hasReliableHRV: boolean;
  /** Whether provider provides sleep stages */
  hasStages: boolean;
  /** Whether provider provides SpO2 */
  hasSpO2: boolean;
  /** Whether provider provides skin temperature */
  hasTemperature: boolean;
  /** HRV metric type (RMSSD vs SDNN) */
  hrvMetricType: 'rmssd' | 'sdnn' | 'both';
  /** Confidence weight for this provider (0-1) */
  confidenceWeight: number;
}

/**
 * Provider capabilities and confidence levels
 *
 * Based on validation studies (2024-2025):
 * - Oura Gen 4: CCC = 0.99 for HRV vs ECG
 * - WHOOP 4.0: CCC = 0.94 for HRV
 * - Garmin: r = 0.85-0.92 for HRV
 * - Fitbit: Lower HRV accuracy but good sleep staging
 */
const PROVIDER_CONFIG: Record<OpenWearablesProvider, IProviderConfig> = {
  oura: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: true,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.95,
  },
  whoop: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.92,
  },
  garmin: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.88,
  },
  polar: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'both',
    confidenceWeight: 0.90,
  },
  fitbit: {
    hasReliableHRV: false,  // Lower accuracy
    hasStages: true,
    hasSpO2: true,
    hasTemperature: true,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.75,
  },
  apple_health: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'sdnn',  // Apple uses SDNN
    confidenceWeight: 0.85,
  },
  samsung_health: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: true,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.82,
  },
  withings: {
    hasReliableHRV: false,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.70,
  },
  google_fit: {
    hasReliableHRV: false,
    hasStages: false,
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.50,
  },
  huawei_health: {
    hasReliableHRV: false,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.70,
  },
  xiaomi_mi_fitness: {
    hasReliableHRV: false,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.65,
  },
  amazfit: {
    hasReliableHRV: false,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.65,
  },
  suunto: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.85,
  },
  coros: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.80,
  },
  eight_sleep: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: false,
    hasTemperature: true,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.85,
  },
  dreem: {
    hasReliableHRV: false,
    hasStages: true,  // EEG-based, very accurate
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.95,  // High for stages
  },
  muse: {
    hasReliableHRV: false,
    hasStages: false,
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.50,
  },
  biostrap: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.80,
  },
  ouraring: {
    hasReliableHRV: true,
    hasStages: true,
    hasSpO2: true,
    hasTemperature: true,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.95,
  },
  custom: {
    hasReliableHRV: false,
    hasStages: false,
    hasSpO2: false,
    hasTemperature: false,
    hrvMetricType: 'rmssd',
    confidenceWeight: 0.50,
  },
};

/**
 * Adapter result with metadata
 */
export interface IAdaptedSleepData {
  /** Normalized sleep data */
  data: IWearableSleepData;

  /** Provider configuration */
  providerConfig: IProviderConfig;

  /** Data quality score (0-1) */
  qualityScore: number;

  /** Warnings during adaptation */
  warnings: string[];
}

/**
 * Open Wearables Data Adapter
 *
 * Converts Open Wearables API responses to SleepCore internal format
 */
export class OpenWearablesAdapter {
  /**
   * Adapt a single sleep session
   *
   * @param session - Open Wearables sleep session
   * @returns Adapted sleep data with metadata
   */
  adaptSleepSession(session: IOpenWearablesSleepSession): IAdaptedSleepData {
    const warnings: string[] = [];
    const providerConfig = PROVIDER_CONFIG[session.provider] || PROVIDER_CONFIG.custom;

    // Map provider to source
    const source = PROVIDER_TO_SOURCE[session.provider] || 'manual';

    // Adapt stages
    let stages: IWearableSleepStage[] | undefined;
    if (session.stages && session.stages.length > 0) {
      stages = this.adaptStages(session.stages);
    } else if (providerConfig.hasStages) {
      warnings.push(`Provider ${session.provider} should have stages but none provided`);
    }

    // Adapt HRV
    let hrv: IWearableHRVRecord[] | undefined;
    if (session.hrv && session.hrv.length > 0) {
      hrv = this.adaptHRV(session.hrv, session.provider);
      if (!providerConfig.hasReliableHRV) {
        warnings.push(`HRV from ${session.provider} has lower accuracy`);
      }
    }

    // Adapt heart rate
    let heartRate: IWearableHeartRateRecord[] | undefined;
    if (session.heartRate && session.heartRate.length > 0) {
      heartRate = this.adaptHeartRate(session.heartRate);
    }

    // Adapt SpO2
    let spo2: number | undefined;
    let spo2Min: number | undefined;
    if (session.spo2 && session.spo2.length > 0) {
      const spo2Stats = this.calculateSpO2Stats(session.spo2);
      spo2 = spo2Stats.mean;
      spo2Min = spo2Stats.min;
    }

    // Adapt respiration
    let respirationRate: number | undefined;
    let breathingDisturbances: number | undefined;
    if (session.respiration && session.respiration.length > 0) {
      const respStats = this.calculateRespirationStats(session.respiration);
      respirationRate = respStats.meanRate;
      // Breathing disturbances would need specific detection logic
      // For now, estimate from rate variability
      if (respStats.rateVariability > 5) {
        breathingDisturbances = Math.round(respStats.rateVariability * 2);
      }
    }

    // Adapt temperature
    let skinTemperature: number | undefined;
    if (session.skinTemperature && session.skinTemperature.length > 0) {
      skinTemperature = this.calculateTemperatureDeviation(session.skinTemperature);
    }

    // Calculate resting heart rate
    let restingHeartRate: number | undefined;
    if (heartRate && heartRate.length > 0) {
      restingHeartRate = this.calculateRestingHeartRate(heartRate);
    }

    // Build adapted data
    const data: IWearableSleepData = {
      source,
      deviceId: `ow_${session.provider}_${session.userId}`,
      sessionId: session.id,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      stages,
      hrv,
      heartRate,
      restingHeartRate,
      spo2,
      spo2Min,
      respirationRate,
      breathingDisturbances,
      skinTemperature,
    };

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(data, providerConfig, session);

    return {
      data,
      providerConfig,
      qualityScore,
      warnings,
    };
  }

  /**
   * Adapt multiple sleep sessions
   *
   * @param sessions - Open Wearables sleep sessions
   * @returns Adapted sleep data array
   */
  adaptSleepSessions(sessions: IOpenWearablesSleepSession[]): IAdaptedSleepData[] {
    return sessions.map(session => this.adaptSleepSession(session));
  }

  /**
   * Adapt sleep stages
   */
  private adaptStages(stages: IOpenWearablesSleepStage[]): IWearableSleepStage[] {
    return stages.map(stage => ({
      type: STAGE_MAPPING[stage.type],
      startTime: new Date(stage.startTime),
      endTime: new Date(stage.endTime),
    }));
  }

  /**
   * Adapt HRV records
   *
   * Handles provider-specific HRV metric differences
   */
  private adaptHRV(
    records: IOpenWearablesHRVRecord[],
    provider: OpenWearablesProvider
  ): IWearableHRVRecord[] {
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.custom;

    return records.map(record => {
      let rmssd = record.rmssd;

      // Apple uses SDNN, need to estimate RMSSD
      // RMSSD is typically ~0.7-0.9 of SDNN during sleep
      if (config.hrvMetricType === 'sdnn' && record.sdnn && !record.rmssd) {
        rmssd = record.sdnn * 0.8;
      }

      return {
        timestamp: new Date(record.timestamp),
        rmssd,
        sdnn: record.sdnn,
        quality: record.quality ? record.quality / 100 : undefined,
      };
    });
  }

  /**
   * Adapt heart rate records
   */
  private adaptHeartRate(records: IOpenWearablesHeartRateRecord[]): IWearableHeartRateRecord[] {
    return records.map(record => ({
      timestamp: new Date(record.timestamp),
      bpm: record.bpm,
    }));
  }

  /**
   * Calculate SpO2 statistics
   */
  private calculateSpO2Stats(records: IOpenWearablesSpO2Record[]): {
    mean: number;
    min: number;
    timeBelow90: number;
  } {
    const values = records.map(r => r.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);

    // Calculate time below 90%
    let timeBelow90 = 0;
    for (let i = 1; i < records.length; i++) {
      if (records[i - 1].value < 90) {
        const duration = new Date(records[i].timestamp).getTime() -
          new Date(records[i - 1].timestamp).getTime();
        timeBelow90 += duration / (1000 * 60); // Convert to minutes
      }
    }

    return { mean, min, timeBelow90 };
  }

  /**
   * Calculate respiration statistics
   */
  private calculateRespirationStats(records: IOpenWearablesRespirationRecord[]): {
    meanRate: number;
    rateVariability: number;
  } {
    const rates = records.map(r => r.rate);
    const meanRate = rates.reduce((a, b) => a + b, 0) / rates.length;

    // Calculate standard deviation as variability measure
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - meanRate, 2), 0) / rates.length;
    const rateVariability = Math.sqrt(variance);

    return { meanRate, rateVariability };
  }

  /**
   * Calculate temperature deviation from baseline
   */
  private calculateTemperatureDeviation(records: IOpenWearablesTemperatureRecord[]): number {
    // Find deviation records
    const deviations = records.filter(r => r.isDeviation);

    if (deviations.length > 0) {
      // Average deviation
      return deviations.reduce((a, b) => a + b.value, 0) / deviations.length;
    }

    // If no deviation records, calculate from raw values
    // Assume baseline of 33C for skin temperature during sleep
    const BASELINE_TEMP = 33.0;
    const temps = records.map(r => {
      const value = r.unit === 'fahrenheit' ? (r.value - 32) * 5 / 9 : r.value;
      return value;
    });

    const meanTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    return meanTemp - BASELINE_TEMP;
  }

  /**
   * Calculate resting heart rate from sleep data
   */
  private calculateRestingHeartRate(records: IWearableHeartRateRecord[]): number {
    // Sort by BPM and take 10th percentile as RHR
    const sorted = [...records].sort((a, b) => a.bpm - b.bpm);
    const p10Index = Math.floor(sorted.length * 0.1);
    return sorted[p10Index].bpm;
  }

  /**
   * Calculate quality score for adapted data
   */
  private calculateQualityScore(
    data: IWearableSleepData,
    config: IProviderConfig,
    session: IOpenWearablesSleepSession
  ): number {
    let score = config.confidenceWeight;

    // Reduce score if expected data is missing
    if (config.hasStages && !data.stages) {
      score *= 0.8;
    }
    if (config.hasReliableHRV && !data.hrv) {
      score *= 0.85;
    }

    // Use provider's quality score if available
    if (session.quality?.score) {
      score *= session.quality.score / 100;
    }

    // Ensure score is in 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: OpenWearablesProvider): IProviderConfig {
    return PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.custom;
  }

  /**
   * Check if provider is supported with good quality
   */
  isHighQualityProvider(provider: OpenWearablesProvider): boolean {
    const config = PROVIDER_CONFIG[provider];
    return config ? config.confidenceWeight >= 0.80 : false;
  }

  /**
   * Get list of high-quality providers
   */
  getHighQualityProviders(): OpenWearablesProvider[] {
    return (Object.entries(PROVIDER_CONFIG) as [OpenWearablesProvider, IProviderConfig][])
      .filter(([_, config]) => config.confidenceWeight >= 0.80)
      .map(([provider]) => provider);
  }
}

/**
 * Factory function for creating adapter
 */
export function createOpenWearablesAdapter(): OpenWearablesAdapter {
  return new OpenWearablesAdapter();
}
