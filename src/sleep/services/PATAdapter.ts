/**
 * PAT (Pretrained Actigraphy Transformer) Adapter
 * ================================================
 * Adapter for the Pretrained Actigraphy Transformer foundation model.
 *
 * Scientific Foundation:
 * - Ruan et al. "Foundation Models for Wearable Movement Data in Mental Health Research"
 *   arXiv:2411.15240 (2024), updated June 2025
 * - PAT achieves 7% AUC improvement over CNN baselines (0.767 vs 0.697)
 * - Pretrained on 29,307 NHANES participants
 *
 * Model Architecture (PAT-L):
 * - 4 encoder layers, 12 attention heads
 * - 96-dimensional embeddings
 * - Patch size: 9 (minutes)
 * - <2M parameters
 *
 * Integration Options:
 * 1. TensorFlow.js (tfjs) - Direct loading of converted weights
 * 2. ONNX Runtime Web - Cross-platform inference
 * 3. Remote API - Server-side inference (recommended for production)
 *
 * @packageDocumentation
 * @module @sleepcore/sleep/services
 */

import type {
  IActivityCount,
  IActigraphySession,
  IPATInput,
  IPATPrediction,
  ISleepPhenotype,
  SleepPhenotypeClass,
  IActigraphyPreprocessingConfig,
  IActigraphyAttribution,
} from '../interfaces/IActigraphy';
import {
  DEFAULT_ACTIGRAPHY_PREPROCESSING,
} from '../interfaces/IActigraphy';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * PAT model variant
 */
export type PATModelVariant = 'PAT-S' | 'PAT-M' | 'PAT-L';

/**
 * PAT model configuration
 */
export interface IPATConfig {
  /** Model variant (S, M, L) */
  readonly variant: PATModelVariant;
  /** Inference backend */
  readonly backend: 'tfjs' | 'onnx' | 'remote' | 'simulated';
  /** Remote API URL (if backend = 'remote') */
  readonly remoteUrl?: string;
  /** Model weights path (if backend = 'tfjs' or 'onnx') */
  readonly weightsPath?: string;
  /** Preprocessing configuration */
  readonly preprocessing: IActigraphyPreprocessingConfig;
  /** Minimum sequence length (minutes) */
  readonly minSequenceLength: number;
  /** Maximum sequence length (minutes) - PAT handles variable length */
  readonly maxSequenceLength: number;
  /** Patch size for transformer (minutes) */
  readonly patchSize: number;
  /** Batch size for inference */
  readonly batchSize: number;
  /** Use attention for explainability */
  readonly returnAttention: boolean;
}

/**
 * PAT model architecture parameters
 * Based on paper specifications
 */
export const PAT_ARCHITECTURES: Record<PATModelVariant, {
  encoderLayers: number;
  attentionHeads: number;
  embeddingDim: number;
  ffDim: number;
  patchSize: number;
  dropout: number;
  parameters: number;
}> = {
  'PAT-S': {
    encoderLayers: 1,
    attentionHeads: 6,
    embeddingDim: 96,
    ffDim: 256,
    patchSize: 18,
    dropout: 0.1,
    parameters: 500000,
  },
  'PAT-M': {
    encoderLayers: 2,
    attentionHeads: 12,
    embeddingDim: 96,
    ffDim: 256,
    patchSize: 18,
    dropout: 0.1,
    parameters: 1000000,
  },
  'PAT-L': {
    encoderLayers: 4,
    attentionHeads: 12,
    embeddingDim: 96,
    ffDim: 256,
    patchSize: 9,
    dropout: 0.1,
    parameters: 1900000,
  },
};

/**
 * Default PAT configuration
 */
export const DEFAULT_PAT_CONFIG: IPATConfig = {
  variant: 'PAT-M',
  backend: 'simulated', // Use simulated until real weights integrated
  preprocessing: DEFAULT_ACTIGRAPHY_PREPROCESSING,
  minSequenceLength: 60,      // 1 hour minimum
  maxSequenceLength: 10080,   // 7 days maximum
  patchSize: 18,
  batchSize: 1,
  returnAttention: true,
};

// ============================================================================
// PAT ADAPTER CLASS
// ============================================================================

/**
 * PAT Adapter Service
 * Wraps the Pretrained Actigraphy Transformer for SleepCore integration
 */
export class PATAdapter {
  private config: IPATConfig;
  private initialized = false;
  private modelLoaded = false;
  private modelVersion = '1.0.0-simulated';

  // Placeholder for actual model (tfjs, onnx, or remote client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;

  constructor(config: Partial<IPATConfig> = {}) {
    this.config = { ...DEFAULT_PAT_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the PAT adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.info('[PATAdapter] Initializing with config:', {
      variant: this.config.variant,
      backend: this.config.backend,
    });

    switch (this.config.backend) {
      case 'tfjs':
        await this.loadTFJSModel();
        break;
      case 'onnx':
        await this.loadONNXModel();
        break;
      case 'remote':
        this.validateRemoteConfig();
        break;
      case 'simulated':
        this.initializeSimulated();
        break;
    }

    this.initialized = true;
    console.info('[PATAdapter] Initialized successfully');
  }

  /**
   * Load TensorFlow.js model
   */
  private async loadTFJSModel(): Promise<void> {
    // TODO: Implement TensorFlow.js model loading
    // Requires: npm install @tensorflow/tfjs
    // Weights: Convert H5 → TensorFlow.js format
    //
    // const tf = await import('@tensorflow/tfjs');
    // this.model = await tf.loadLayersModel(this.config.weightsPath);

    console.warn('[PATAdapter] TensorFlow.js backend not yet implemented');
    this.initializeSimulated();
  }

  /**
   * Load ONNX Runtime model
   */
  private async loadONNXModel(): Promise<void> {
    // TODO: Implement ONNX Runtime loading
    // Requires: npm install onnxruntime-web
    // Weights: Convert H5 → ONNX format
    //
    // const ort = await import('onnxruntime-web');
    // this.model = await ort.InferenceSession.create(this.config.weightsPath);

    console.warn('[PATAdapter] ONNX Runtime backend not yet implemented');
    this.initializeSimulated();
  }

  /**
   * Validate remote API configuration
   */
  private validateRemoteConfig(): void {
    if (!this.config.remoteUrl) {
      throw new Error('[PATAdapter] Remote backend requires remoteUrl config');
    }
    this.modelLoaded = true;
    this.modelVersion = '1.0.0-remote';
  }

  /**
   * Initialize simulated backend (for development/testing)
   */
  private initializeSimulated(): void {
    this.modelLoaded = true;
    this.modelVersion = '1.0.0-simulated';
    console.info('[PATAdapter] Using simulated backend for development');
  }

  /**
   * Check if adapter is ready
   */
  isReady(): boolean {
    return this.initialized && this.modelLoaded;
  }

  // ==========================================================================
  // PREPROCESSING
  // ==========================================================================

  /**
   * Preprocess actigraphy session to PAT input format
   */
  preprocessSession(session: IActigraphySession): IPATInput {
    const epochs = this.preprocessEpochs(session.epochs);
    const sequenceLength = epochs.length;

    // Create normalized activity sequence
    const activitySequence = this.normalizeActivity(epochs);

    // Create validity mask
    const validMask = epochs.map(e => e.isWorn ? 1 : 0);

    // Create time encodings
    const timeOfDayEncoding: number[] = [];
    const dayOfWeekEncoding: number[] = [];

    for (const epoch of epochs) {
      const date = new Date(epoch.timestamp);
      const minuteOfDay = date.getHours() * 60 + date.getMinutes();
      timeOfDayEncoding.push(minuteOfDay / 1440); // Normalize to 0-1
      dayOfWeekEncoding.push(date.getDay() / 6);   // Normalize to 0-1
    }

    return {
      userId: session.userId,
      activitySequence,
      sequenceLength,
      startTime: session.startTime,
      endTime: session.endTime,
      validMask,
      timeOfDayEncoding,
      dayOfWeekEncoding,
    };
  }

  /**
   * Preprocess epochs (resample, clean, filter)
   */
  private preprocessEpochs(epochs: IActivityCount[]): IActivityCount[] {
    if (epochs.length === 0) return [];

    const config = this.config.preprocessing;
    let processed = [...epochs];

    // 1. Apply non-wear detection
    if (config.nonWearAlgorithm !== 'none') {
      processed = this.applyNonWearDetection(processed, config);
    }

    // 2. Handle outliers
    if (config.outlierPercentile < 100) {
      processed = this.removeOutliers(processed, config.outlierPercentile);
    }

    // 3. Handle missing data
    if (config.missingDataStrategy === 'interpolate') {
      processed = this.interpolateMissing(processed);
    }

    // 4. Apply smoothing
    if (config.smoothingWindow > 1) {
      processed = this.applySmoothing(processed, config.smoothingWindow);
    }

    return processed;
  }

  /**
   * Apply non-wear detection (Choi algorithm)
   */
  private applyNonWearDetection(
    epochs: IActivityCount[],
    config: IActigraphyPreprocessingConfig
  ): IActivityCount[] {
    // Choi algorithm: 90+ consecutive minutes of zero counts
    const threshold = config.nonWearThreshold;
    let zeroStreak = 0;
    const nonWearIndices = new Set<number>();

    for (let i = 0; i < epochs.length; i++) {
      const epoch = epochs[i];
      if (epoch && epoch.count === 0) {
        zeroStreak++;
      } else {
        if (zeroStreak >= threshold) {
          // Mark all indices in streak as non-wear
          for (let j = i - zeroStreak; j < i; j++) {
            nonWearIndices.add(j);
          }
        }
        zeroStreak = 0;
      }
    }

    return epochs.map((e, i) => ({
      ...e,
      // Preserve original isWorn=false AND detect non-wear from Choi algorithm
      isWorn: e.isWorn && !nonWearIndices.has(i),
    }));
  }

  /**
   * Remove outliers based on percentile
   */
  private removeOutliers(
    epochs: IActivityCount[],
    percentile: number
  ): IActivityCount[] {
    const counts = epochs.map(e => e.count).sort((a, b) => a - b);
    const idx = Math.floor(counts.length * (percentile / 100));
    const threshold = counts[idx] ?? counts[counts.length - 1] ?? 10000;

    return epochs.map(e => ({
      ...e,
      count: Math.min(e.count, threshold ?? 10000),
    }));
  }

  /**
   * Interpolate missing values
   */
  private interpolateMissing(epochs: IActivityCount[]): IActivityCount[] {
    const result = [...epochs];

    for (let i = 0; i < result.length; i++) {
      const epoch = result[i];
      if (epoch && !epoch.isWorn) {
        // Find nearest worn epochs
        let prevIdx = i - 1;
        let nextIdx = i + 1;

        while (prevIdx >= 0 && !result[prevIdx]?.isWorn) prevIdx--;
        while (nextIdx < result.length && !result[nextIdx]?.isWorn) nextIdx++;

        const prevEpoch = result[prevIdx];
        const nextEpoch = result[nextIdx];

        if (prevEpoch && nextEpoch) {
          // Linear interpolation
          const weight = (i - prevIdx) / (nextIdx - prevIdx);
          const interpolatedCount = Math.round(
            prevEpoch.count * (1 - weight) + nextEpoch.count * weight
          );
          result[i] = {
            ...epoch,
            count: interpolatedCount,
          };
        }
      }
    }

    return result;
  }

  /**
   * Apply moving average smoothing
   */
  private applySmoothing(
    epochs: IActivityCount[],
    windowSize: number
  ): IActivityCount[] {
    const halfWindow = Math.floor(windowSize / 2);
    return epochs.map((epoch, i) => {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(epochs.length, i + halfWindow + 1);
      const window = epochs.slice(start, end);
      const avgCount = window.reduce((sum, e) => sum + e.count, 0) / window.length;

      return {
        ...epoch,
        count: Math.round(avgCount),
      };
    });
  }

  /**
   * Normalize activity counts to 0-1 range
   */
  private normalizeActivity(epochs: IActivityCount[]): number[] {
    const config = this.config.preprocessing;
    const counts = epochs.map(e => e.count);

    switch (config.normalization) {
      case 'minmax': {
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const range = max - min || 1;
        return counts.map(c => (c - min) / range);
      }
      case 'zscore': {
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const std = Math.sqrt(
          counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length
        ) || 1;
        // Clip to -3, 3 and rescale to 0-1
        return counts.map(c => {
          const z = (c - mean) / std;
          const clipped = Math.max(-3, Math.min(3, z));
          return (clipped + 3) / 6;
        });
      }
      case 'log': {
        const logCounts = counts.map(c => Math.log1p(c));
        const max = Math.max(...logCounts) || 1;
        return logCounts.map(lc => lc / max);
      }
      default:
        // No normalization - scale to approximate 0-1
        const max = Math.max(...counts) || 1;
        return counts.map(c => c / max);
    }
  }

  // ==========================================================================
  // INFERENCE
  // ==========================================================================

  /**
   * Run PAT inference on actigraphy session
   */
  async predict(session: IActigraphySession): Promise<IPATPrediction> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Preprocess input
    const input = this.preprocessSession(session);

    // Validate input length
    if (input.sequenceLength < this.config.minSequenceLength) {
      throw new Error(
        `[PATAdapter] Insufficient data: ${input.sequenceLength} minutes ` +
        `(minimum: ${this.config.minSequenceLength})`
      );
    }

    // Run inference based on backend
    switch (this.config.backend) {
      case 'tfjs':
        return this.inferTFJS(input, session.userId);
      case 'onnx':
        return this.inferONNX(input, session.userId);
      case 'remote':
        return this.inferRemote(input, session.userId);
      case 'simulated':
      default:
        return this.inferSimulated(input, session.userId);
    }
  }

  /**
   * TensorFlow.js inference
   */
  private async inferTFJS(input: IPATInput, userId: string): Promise<IPATPrediction> {
    // TODO: Implement real TensorFlow.js inference
    // const tensor = tf.tensor2d([input.activitySequence], [1, input.sequenceLength]);
    // const output = this.model.predict(tensor);
    return this.inferSimulated(input, userId);
  }

  /**
   * ONNX Runtime inference
   */
  private async inferONNX(input: IPATInput, userId: string): Promise<IPATPrediction> {
    // TODO: Implement real ONNX Runtime inference
    // const feeds = { input: new ort.Tensor('float32', input.activitySequence) };
    // const output = await this.model.run(feeds);
    return this.inferSimulated(input, userId);
  }

  /**
   * Remote API inference
   */
  private async inferRemote(input: IPATInput, userId: string): Promise<IPATPrediction> {
    if (!this.config.remoteUrl) {
      throw new Error('[PATAdapter] Remote URL not configured');
    }

    const response = await fetch(this.config.remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`[PATAdapter] Remote inference failed: ${response.statusText}`);
    }

    return response.json() as Promise<IPATPrediction>;
  }

  /**
   * Simulated inference (for development/testing)
   * Uses heuristic rules based on actigraphy features
   */
  private inferSimulated(input: IPATInput, userId: string): IPATPrediction {
    // Extract features from actigraphy
    const features = this.extractFeatures(input);

    // Classify phenotype based on features
    const phenotype = this.classifyPhenotype(features);

    // Predict metrics based on features
    const predictedMetrics = this.predictMetrics(features);

    // Calculate risk scores
    const riskScores = this.calculateRiskScores(features);

    // Generate attributions
    const attributions = this.config.returnAttention
      ? this.generateAttributions(input, features)
      : undefined;

    return {
      userId,
      timestamp: new Date(),
      phenotype,
      predictedMetrics,
      riskScores,
      attributions,
      confidence: 0.75, // Simulated confidence
      modelVersion: this.modelVersion,
    };
  }

  // ==========================================================================
  // FEATURE EXTRACTION (for simulated backend)
  // ==========================================================================

  /**
   * Extract features from actigraphy for heuristic classification
   */
  private extractFeatures(input: IPATInput): IActigraphyFeatures {
    const activity = input.activitySequence;
    const timeOfDay = input.timeOfDayEncoding;
    const validMask = input.validMask;

    // Basic statistics
    const validActivity = activity.filter((_, i) => validMask[i] === 1);
    const mean = validActivity.reduce((a, b) => a + b, 0) / validActivity.length;
    const variance = validActivity.reduce((s, v) => s + (v - mean) ** 2, 0) / validActivity.length;
    const std = Math.sqrt(variance);

    // Time-based features
    const nightActivity = activity.filter((_, i) => {
      const tod = timeOfDay[i] ?? 0;
      return tod < 0.25 || tod > 0.917; // 0:00-6:00 or 22:00-24:00
    });
    const nightMean = nightActivity.length > 0
      ? nightActivity.reduce((a, b) => a + b, 0) / nightActivity.length
      : 0;

    const dayActivity = activity.filter((_, i) => {
      const tod = timeOfDay[i] ?? 0;
      return tod >= 0.333 && tod <= 0.75; // 8:00-18:00
    });
    const dayMean = dayActivity.length > 0
      ? dayActivity.reduce((a, b) => a + b, 0) / dayActivity.length
      : mean;

    // Activity onset/offset
    const threshold = mean * 0.3;
    let activityOnset = 0;
    let activityOffset = 0;

    for (let i = 0; i < activity.length; i++) {
      const tod = timeOfDay[i] ?? 0;
      if (tod >= 0.25 && tod <= 0.5 && (activity[i] ?? 0) > threshold) {
        activityOnset = i;
        break;
      }
    }

    for (let i = activity.length - 1; i >= 0; i--) {
      const tod = timeOfDay[i] ?? 0;
      if (tod >= 0.75 && tod <= 1.0 && (activity[i] ?? 0) > threshold) {
        activityOffset = i;
        break;
      }
    }

    // Fragmentation (number of transitions)
    let transitions = 0;
    for (let i = 1; i < activity.length; i++) {
      const prev = (activity[i - 1] ?? 0) > threshold;
      const curr = (activity[i] ?? 0) > threshold;
      if (prev !== curr) transitions++;
    }
    const fragmentation = transitions / activity.length;

    // Day-to-day variability
    const days = Math.floor(input.sequenceLength / 1440);
    let variability = 0;
    if (days >= 2) {
      const dailyMeans: number[] = [];
      for (let d = 0; d < days; d++) {
        const dayStart = d * 1440;
        const dayEnd = Math.min((d + 1) * 1440, activity.length);
        const daySlice = activity.slice(dayStart, dayEnd);
        const dayMeanCalc = daySlice.reduce((a, b) => a + b, 0) / daySlice.length;
        dailyMeans.push(dayMeanCalc);
      }
      const dailyMean = dailyMeans.reduce((a, b) => a + b, 0) / dailyMeans.length;
      variability = Math.sqrt(
        dailyMeans.reduce((s, v) => s + (v - dailyMean) ** 2, 0) / dailyMeans.length
      ) / (dailyMean || 1);
    }

    return {
      mean,
      std,
      nightMean,
      dayMean,
      restActivityRatio: nightMean / (dayMean || 1),
      activityOnsetHour: (timeOfDay[activityOnset] ?? 0) * 24,
      activityOffsetHour: (timeOfDay[activityOffset] ?? 0.75) * 24,
      fragmentation,
      dayToVariability: variability,
      validDataRatio: validMask.filter(v => v === 1).length / validMask.length,
      sequenceLengthDays: input.sequenceLength / 1440,
    };
  }

  /**
   * Classify sleep phenotype from features (heuristic)
   */
  private classifyPhenotype(features: IActigraphyFeatures): ISleepPhenotype {
    const probabilities: Record<SleepPhenotypeClass, number> = {
      healthy_sleeper: 0.1,
      short_sleeper: 0.1,
      long_sleeper: 0.1,
      delayed_phase: 0.1,
      advanced_phase: 0.1,
      irregular: 0.1,
      fragmented: 0.1,
      social_jetlag: 0.1,
      shift_worker: 0.1,
    };

    // Adjust probabilities based on features
    if (features.restActivityRatio < 0.15 && features.fragmentation < 0.1) {
      probabilities.healthy_sleeper += 0.4;
    }

    if (features.activityOnsetHour > 9) {
      probabilities.delayed_phase += 0.3;
    }

    if (features.activityOnsetHour < 5) {
      probabilities.advanced_phase += 0.3;
    }

    if (features.fragmentation > 0.2) {
      probabilities.fragmented += 0.35;
    }

    // High nocturnal activity also indicates fragmented sleep
    if (features.restActivityRatio > 0.15) {
      probabilities.fragmented += 0.25;
    }

    if (features.dayToVariability > 0.3) {
      probabilities.irregular += 0.3;
      probabilities.social_jetlag += 0.2;
    }

    if (features.restActivityRatio > 0.3) {
      probabilities.short_sleeper += 0.2;
    }

    // Normalize probabilities
    const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(probabilities) as SleepPhenotypeClass[]) {
      probabilities[key] = probabilities[key] / total;
    }

    // Find primary phenotype
    let primary: SleepPhenotypeClass = 'healthy_sleeper';
    let maxProb = 0;
    for (const [phenotype, prob] of Object.entries(probabilities)) {
      if (prob > maxProb) {
        maxProb = prob;
        primary = phenotype as SleepPhenotypeClass;
      }
    }

    // Determine stability
    let stability: 'stable' | 'transitioning' | 'variable' = 'stable';
    if (features.dayToVariability > 0.4) {
      stability = 'variable';
    } else if (features.dayToVariability > 0.2) {
      stability = 'transitioning';
    }

    return {
      primaryPhenotype: primary,
      probabilities,
      confidence: maxProb,
      stability,
    };
  }

  /**
   * Predict sleep metrics from features (heuristic)
   */
  private predictMetrics(features: IActigraphyFeatures): IPATPrediction['predictedMetrics'] {
    // Estimate sleep onset from activity offset
    const sleepOnsetHour = Math.min(23.5, features.activityOffsetHour + 1.5);
    const wakeHour = Math.max(5, features.activityOnsetHour - 0.5);

    // Calculate duration
    let duration = (wakeHour + 24 - sleepOnsetHour) % 24;
    if (duration < 4) duration += 24;
    duration = Math.min(12, duration);

    // Estimate efficiency from fragmentation
    const efficiency = Math.max(60, Math.min(95, 90 - features.fragmentation * 100));

    return {
      sleepDuration: Math.round(duration * 60),
      sleepEfficiency: Math.round(efficiency),
      sleepOnset: this.hourToTimeString(sleepOnsetHour),
      wakeTime: this.hourToTimeString(wakeHour),
      fragmentation: features.fragmentation,
    };
  }

  /**
   * Calculate risk scores from features (heuristic)
   */
  private calculateRiskScores(features: IActigraphyFeatures): IPATPrediction['riskScores'] {
    return {
      insomniaRisk: Math.min(1, features.fragmentation * 2 + features.restActivityRatio),
      sleepApneaRisk: Math.min(1, features.fragmentation * 1.5),
      circadianDisruptionRisk: Math.min(1,
        Math.abs(features.activityOnsetHour - 7) / 4 +
        features.dayToVariability
      ),
      sleepDeprivationRisk: Math.min(1,
        features.restActivityRatio * 2 +
        (features.dayMean > 0.6 ? 0.2 : 0)
      ),
    };
  }

  /**
   * Generate feature attributions (for explainability)
   */
  private generateAttributions(
    input: IPATInput,
    features: IActigraphyFeatures
  ): IActigraphyAttribution[] {
    const attributions: IActigraphyAttribution[] = [];

    // High-activity periods (positive contribution to health)
    const dayActivityPeriod: IActigraphyAttribution = {
      startMinute: Math.round(features.activityOnsetHour * 60),
      endMinute: Math.round(features.activityOffsetHour * 60),
      score: features.dayMean,
      interpretation: 'Daytime activity period - positive for circadian rhythm',
      dayOfWeek: new Date(input.startTime).getDay(),
      timeOfDay: this.hourToTimeString(features.activityOnsetHour),
    };
    attributions.push(dayActivityPeriod);

    // Night activity (negative contribution - indicates poor sleep)
    if (features.nightMean > 0.1) {
      const nightActivityPeriod: IActigraphyAttribution = {
        startMinute: 0,
        endMinute: 360, // 0:00-6:00
        score: -features.nightMean,
        interpretation: 'Nocturnal activity - may indicate sleep fragmentation',
        dayOfWeek: new Date(input.startTime).getDay(),
        timeOfDay: '03:00',
      };
      attributions.push(nightActivityPeriod);
    }

    return attributions;
  }

  /**
   * Convert hour (decimal) to time string
   */
  private hourToTimeString(hour: number): string {
    const h = Math.floor(hour) % 24;
    const m = Math.round((hour - Math.floor(hour)) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get model information
   */
  getModelInfo(): {
    variant: PATModelVariant;
    backend: string;
    version: string;
    architecture: typeof PAT_ARCHITECTURES[PATModelVariant];
    isReady: boolean;
  } {
    return {
      variant: this.config.variant,
      backend: this.config.backend,
      version: this.modelVersion,
      architecture: PAT_ARCHITECTURES[this.config.variant],
      isReady: this.isReady(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): IPATConfig {
    return { ...this.config };
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface IActigraphyFeatures {
  mean: number;
  std: number;
  nightMean: number;
  dayMean: number;
  restActivityRatio: number;
  activityOnsetHour: number;
  activityOffsetHour: number;
  fragmentation: number;
  dayToVariability: number;
  validDataRatio: number;
  sequenceLengthDays: number;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Create PAT adapter instance
 */
export function createPATAdapter(config?: Partial<IPATConfig>): PATAdapter {
  return new PATAdapter(config);
}

/**
 * Singleton instance for convenience
 */
export const patAdapter = createPATAdapter();
