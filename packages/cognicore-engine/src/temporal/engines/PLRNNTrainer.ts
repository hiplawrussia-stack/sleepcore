/**
 * PLRNN Trainer with Truncated BPTT
 * ==================================
 * Trains PLRNN on EMA (Ecological Momentary Assessment) time series data
 *
 * Features:
 * - Truncated Backpropagation Through Time (BPTT)
 * - Multi-horizon loss for better long-term predictions
 * - Early stopping with validation
 * - Learning rate scheduling (cosine annealing)
 * - EMA-specific: handles irregular sampling, per-participant normalization
 *
 * Scientific Foundation:
 * - Williams & Peng, 1990: Truncated BPTT
 * - Durstewitz et al., PLOS Comp Bio 2017: PLRNN for dynamics
 * - Fechtelpeter et al., npj Digital Medicine 2025: PLRNN benchmark
 */

import { PLRNNEngine } from './PLRNNEngine';
import type { IPLRNNState } from '../interfaces/IPLRNNEngine';
import type {
  IPLRNNTrainingConfig,
  IEMATrainingResult,
  IPLRNNTrainingHistory,
  ITrainingMetrics,
  ITrainingSequence,
  INormalizationStats,
  IEpochResult,
  IGradientAccumulator,
} from '../interfaces/IPLRNNTrainer';
import type { StudentLifeDataset } from './__tests__/data/StudentLifeLoader';

// Re-export configs
export { DEFAULT_TRAINING_CONFIG, TUNED_TRAINING_CONFIG } from '../interfaces/IPLRNNTrainer';

/**
 * PLRNN Trainer
 * Implements truncated BPTT training for EMA data
 */
export class PLRNNTrainer {
  private engine: PLRNNEngine;
  private config: IPLRNNTrainingConfig;

  constructor(engine: PLRNNEngine, config?: Partial<IPLRNNTrainingConfig>) {
    this.engine = engine;
    this.config = {
      // BPTT
      bpttTruncationWindow: 20,
      bpttOverlapSteps: 5,
      // Epochs
      epochs: 100,
      batchSize: 8,
      // Train/val
      validationSplit: 0.2,
      shuffleData: true,
      // Early stopping
      earlyStoppingPatience: 15,
      earlyStoppingMinDelta: 0.001,
      // Learning rate
      learningRate: 0.001,
      lrSchedule: 'cosine',
      lrDecayFactor: 0.5,
      lrDecaySteps: 30,
      lrMin: 1e-6,
      // Multi-horizon
      horizons: [1, 3, 6, 12],
      horizonWeights: [1.0, 0.5, 0.25, 0.125],
      // EMA-specific
      handleIrregularSampling: true,
      perParticipantNormalization: true,
      targetIntervalHours: 4,
      // Regularization
      l1Regularization: 0.01,
      l2Regularization: 0.0001,
      gradientClip: 1.0,
      // Teacher forcing
      teacherForcingRatio: 0.5,
      teacherForcingDecay: 0.98,
      // Logging
      logEveryEpochs: 10,
      verbose: false,
      ...config,
    };
  }

  /**
   * Get current training configuration
   */
  getConfig(): IPLRNNTrainingConfig {
    return { ...this.config };
  }

  // ============================================================================
  // PUBLIC METHODS FOR TESTING
  // ============================================================================

  /**
   * Prepare training sequences from dataset (public for testing)
   */
  prepareTrainingData(dataset: StudentLifeDataset): ITrainingSequence[] {
    const { train, validation } = this.prepareTrainingDataInternal(dataset);
    return [...train, ...validation];
  }

  /**
   * BPTT forward pass on sequence (public for testing)
   */
  bpttForward(sequence: number[][]): {
    states: IPLRNNState[];
    predictions: number[][];
    losses: number[];
    totalLoss: number;
  } {
    const states: IPLRNNState[] = [];
    const predictions: number[][] = [];
    const losses: number[] = [];

    // Initialize state from first observation (or zeros if empty)
    const firstObs = sequence[0] ?? Array(this.engine.getLatentDim()).fill(0);
    let state = this.engine.createState(firstObs as number[]);
    let totalLoss = 0;

    for (let t = 0; t < sequence.length; t++) {
      const target = sequence[t]!;
      const nextState = this.engine.forward(state);
      states.push(nextState);
      predictions.push([...nextState.observedState]);

      // Compute MSE loss
      let loss = 0;
      for (let d = 0; d < target.length; d++) {
        const diff = (nextState.observedState[d] ?? 0) - (target[d] ?? 0);
        loss += diff * diff;
      }
      loss /= target.length;
      losses.push(loss);
      totalLoss += loss;

      state = nextState;
    }

    return { states, predictions, losses, totalLoss };
  }

  /**
   * BPTT backward pass (public for testing)
   */
  bpttBackward(
    sequence: number[][],
    forwardResult: { states: IPLRNNState[]; predictions: number[][] }
  ): {
    gradients: IGradientAccumulator;
    finalError: number[];
  } {
    const n = this.engine.getLatentDim();
    const gradients: IGradientAccumulator = {
      dA: Array(n).fill(0) as number[],
      dW: Array(n).fill(null).map(() => Array(n).fill(0) as number[]),
      dB: Array(n).fill(null).map(() => Array(n).fill(0) as number[]),
      dBiasLatent: Array(n).fill(0) as number[],
      dBiasObserved: Array(n).fill(0) as number[],
      numSamples: 0,
    };

    let errorSignal = Array(n).fill(0) as number[];

    // Backward through time
    const defaultObs = sequence[0] ?? Array(this.engine.getLatentDim()).fill(0);
    for (let t = sequence.length - 1; t > 0; t--) {
      const target = sequence[t]!;
      const currentState = forwardResult.states[t]!;
      const prevState = forwardResult.states[t - 1] ?? this.engine.createState(defaultObs as number[]);

      const grads = this.engine.computeStepGradients(
        prevState,
        currentState,
        target,
        errorSignal.some(e => e !== 0) ? errorSignal : undefined
      );

      // Accumulate
      for (let i = 0; i < n; i++) {
        const dAi = gradients.dA[i];
        if (dAi !== undefined) gradients.dA[i] = dAi + (grads.dA[i] ?? 0);
        const dBLi = gradients.dBiasLatent[i];
        if (dBLi !== undefined) gradients.dBiasLatent[i] = dBLi + (grads.dBiasLatent[i] ?? 0);
        const dBOi = gradients.dBiasObserved[i];
        if (dBOi !== undefined) gradients.dBiasObserved[i] = dBOi + (grads.dBiasObserved[i] ?? 0);
        for (let j = 0; j < n; j++) {
          const dWRow = gradients.dW[i];
          const gradsWRow = grads.dW[i];
          if (dWRow && gradsWRow) {
            const dWij = dWRow[j];
            if (dWij !== undefined) dWRow[j] = dWij + (gradsWRow[j] ?? 0);
          }
          const dBRow = gradients.dB[i];
          const gradsBRow = grads.dB[i];
          if (dBRow && gradsBRow) {
            const dBij = dBRow[j];
            if (dBij !== undefined) dBRow[j] = dBij + (gradsBRow[j] ?? 0);
          }
        }
      }

      errorSignal = grads.latentError;
      gradients.numSamples++;
    }

    return { gradients, finalError: errorSignal };
  }

  /**
   * Train on single sequence (public for testing)
   */
  async trainOnSequence(sequence: ITrainingSequence, learningRate?: number): Promise<number> {
    const result = this.trainOnSequenceInternal(sequence, false, learningRate ?? this.config.learningRate, 0);
    return result.loss;
  }

  // ============================================================================
  // MAIN TRAINING ENTRY POINT
  // ============================================================================

  /**
   * Train PLRNN on EMA dataset
   */
  async trainOnEMAData(
    dataset: StudentLifeDataset,
    config?: Partial<IPLRNNTrainingConfig>
  ): Promise<IEMATrainingResult> {
    // Merge config
    const cfg = { ...this.config, ...config };
    this.config = cfg;

    // Reset optimizer state
    this.engine.resetAdamState();

    // Prepare data
    const { train, validation } = this.prepareTrainingDataInternal(dataset);

    if (train.length === 0) {
      throw new Error('No training sequences after preparation');
    }

    // Initialize tracking
    const history: IPLRNNTrainingHistory = {
      epochLosses: [],
      epochValidationLosses: [],
      horizonLosses: new Map(),
      learningRates: [],
      bestEpoch: 0,
      bestValidationLoss: Infinity,
      totalTrainingTime: 0,
      converged: false,
    };

    let bestWeights = this.engine.getWeights();
    let patienceCounter = 0;
    const startTime = Date.now();

    // Training loop
    for (let epoch = 0; epoch < cfg.epochs; epoch++) {
      // Shuffle training data
      if (cfg.shuffleData) {
        this.shuffleArray(train);
      }

      // Update learning rate
      const lr = this.computeLearningRate(epoch, cfg);
      history.learningRates.push(lr);

      // Update teacher forcing ratio
      const tfRatio = cfg.teacherForcingRatio * Math.pow(cfg.teacherForcingDecay, epoch);

      // Training epoch
      const trainResult = this.runEpoch(train, false, lr, tfRatio);
      history.epochLosses.push(trainResult.avgLoss);

      // Validation epoch (no gradient updates)
      const valResult = this.runEpoch(validation, true, lr, 0);
      history.epochValidationLosses.push(valResult.avgLoss);

      // Track per-horizon losses
      for (const [h, loss] of valResult.horizonLosses) {
        if (!history.horizonLosses.has(h)) {
          history.horizonLosses.set(h, []);
        }
        history.horizonLosses.get(h)!.push(loss);
      }

      // Check for improvement
      if (valResult.avgLoss < history.bestValidationLoss - cfg.earlyStoppingMinDelta) {
        history.bestValidationLoss = valResult.avgLoss;
        history.bestEpoch = epoch;
        bestWeights = this.engine.getWeights();
        patienceCounter = 0;
      } else {
        patienceCounter++;
      }

      // Logging
      if (cfg.verbose || (epoch % cfg.logEveryEpochs === 0)) {
        console.log(
          `Epoch ${epoch}: train=${trainResult.avgLoss.toFixed(4)}, ` +
          `val=${valResult.avgLoss.toFixed(4)}, lr=${lr.toFixed(6)}, patience=${patienceCounter}`
        );
      }

      // Early stopping
      if (patienceCounter >= cfg.earlyStoppingPatience) {
        history.converged = true;
        history.earlyStopReason = `No improvement for ${cfg.earlyStoppingPatience} epochs`;
        if (cfg.verbose) {
          console.log(`Early stopping at epoch ${epoch}: ${history.earlyStopReason}`);
        }
        break;
      }
    }

    // Restore best weights
    this.engine.loadWeights(bestWeights);

    history.totalTrainingTime = Date.now() - startTime;

    // Compute final metrics
    const metrics = this.computeFinalMetrics(validation, cfg.horizons);

    // Set final training loss from history
    const lastEpochLoss = history.epochLosses[history.epochLosses.length - 1];
    metrics.finalTrainingLoss = lastEpochLoss ?? 0;

    return {
      trainedWeights: bestWeights,
      history,
      metrics,
      config: cfg,
    };
  }

  // ============================================================================
  // EPOCH EXECUTION
  // ============================================================================

  /**
   * Run a single epoch (training or validation)
   */
  private runEpoch(
    sequences: ITrainingSequence[],
    isValidation: boolean,
    learningRate: number,
    teacherForcingRatio: number
  ): IEpochResult {
    const startTime = Date.now();
    let totalLoss = 0;
    let totalSamples = 0;
    const horizonLosses = new Map<number, number>();
    const horizonCounts = new Map<number, number>();

    // Initialize horizon tracking
    for (const h of this.config.horizons) {
      horizonLosses.set(h, 0);
      horizonCounts.set(h, 0);
    }

    // Process each sequence
    for (const seq of sequences) {
      const result = this.trainOnSequenceInternal(seq, isValidation, learningRate, teacherForcingRatio);
      totalLoss += result.loss * result.samples;
      totalSamples += result.samples;

      // Accumulate horizon losses
      for (const [h, loss] of result.horizonLosses) {
        horizonLosses.set(h, (horizonLosses.get(h) ?? 0) + loss);
        horizonCounts.set(h, (horizonCounts.get(h) ?? 0) + 1);
      }
    }

    // Average horizon losses
    for (const h of this.config.horizons) {
      const count = horizonCounts.get(h) ?? 1;
      horizonLosses.set(h, (horizonLosses.get(h) ?? 0) / count);
    }

    return {
      avgLoss: totalSamples > 0 ? totalLoss / totalSamples : 0,
      horizonLosses,
      numSequences: sequences.length,
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // SEQUENCE TRAINING WITH TRUNCATED BPTT
  // ============================================================================

  /**
   * Train on a single sequence using truncated BPTT
   */
  private trainOnSequenceInternal(
    sequence: ITrainingSequence,
    isValidation: boolean,
    learningRate: number,
    teacherForcingRatio: number
  ): { loss: number; samples: number; horizonLosses: Map<number, number> } {
    const values = sequence.values;
    const n = this.engine.getLatentDim();
    const windowSize = this.config.bpttTruncationWindow;
    const overlap = this.config.bpttOverlapSteps;

    if (values.length < windowSize + 1) {
      return { loss: 0, samples: 0, horizonLosses: new Map() };
    }

    let totalLoss = 0;
    let totalSamples = 0;
    const horizonLosses = new Map<number, number>();
    for (const h of this.config.horizons) {
      horizonLosses.set(h, 0);
    }

    // Initialize state from first observation
    let state = this.engine.createState(values[0]!, sequence.timestamps[0]);

    // Process windows
    const step = windowSize - overlap;
    for (let windowStart = 0; windowStart + windowSize < values.length; windowStart += step) {
      const windowEnd = Math.min(windowStart + windowSize, values.length - 1);

      // Forward pass through window, storing states
      const states: IPLRNNState[] = [state];
      const predictions: number[][] = [];

      for (let t = windowStart; t < windowEnd; t++) {
        const nextState = this.engine.forward(state);
        states.push(nextState);
        predictions.push(nextState.observedState);

        // Teacher forcing: use actual value instead of prediction
        if (!isValidation && Math.random() < teacherForcingRatio) {
          state = this.engine.createState(values[t + 1]!, sequence.timestamps[t + 1]);
          state.timestep = nextState.timestep;
        } else {
          state = nextState;
        }
      }

      // Compute loss and gradients (backward pass)
      if (!isValidation) {
        const gradAccum = this.initGradientAccumulator(n);

        // Backward through time
        let errorSignal: number[] | undefined;

        for (let t = windowEnd - 1; t >= windowStart; t--) {
          const stateIdx = t - windowStart;
          const prevState = states[stateIdx]!;
          const currentState = states[stateIdx + 1]!;
          const target = values[t + 1]!;

          // Compute step loss
          const stepLoss = this.mse(currentState.observedState, target);
          totalLoss += stepLoss;
          totalSamples++;

          // Compute gradients
          const grads = this.engine.computeStepGradients(
            prevState,
            currentState,
            target,
            errorSignal
          );

          // Accumulate gradients
          this.accumulateGradients(gradAccum, grads);

          // Propagate error for next backward step
          errorSignal = grads.latentError;
        }

        // Multi-horizon loss
        const lastState = states[states.length - 1]!;
        const lastIdx = windowEnd;
        for (let hi = 0; hi < this.config.horizons.length; hi++) {
          const h = this.config.horizons[hi]!;
          const weight = this.config.horizonWeights[hi] ?? 0.5;

          if (lastIdx + h < values.length) {
            // Multi-step prediction
            let predState = lastState;
            for (let s = 0; s < h; s++) {
              predState = this.engine.forward(predState);
            }

            const hTarget = values[lastIdx + h]!;
            const hLoss = this.mse(predState.observedState, hTarget);

            horizonLosses.set(h, (horizonLosses.get(h) ?? 0) + hLoss);
            totalLoss += weight * hLoss;
            totalSamples++;
          }
        }

        // Apply gradients (normalized by window size)
        this.normalizeGradients(gradAccum);
        this.engine.applyGradients(
          gradAccum,
          learningRate,
          this.config.l1Regularization,
          this.config.l2Regularization,
          this.config.gradientClip
        );
      } else {
        // Validation: just compute loss
        for (let t = windowStart; t < windowEnd; t++) {
          const stateIdx = t - windowStart + 1;
          const pred = states[stateIdx]!.observedState;
          const target = values[t + 1]!;
          totalLoss += this.mse(pred, target);
          totalSamples++;
        }

        // Multi-horizon validation loss
        const lastState = states[states.length - 1]!;
        const lastIdx = windowEnd;
        for (const h of this.config.horizons) {
          if (lastIdx + h < values.length) {
            let predState = lastState;
            for (let s = 0; s < h; s++) {
              predState = this.engine.forward(predState);
            }
            const hTarget = values[lastIdx + h]!;
            const hLoss = this.mse(predState.observedState, hTarget);
            horizonLosses.set(h, (horizonLosses.get(h) ?? 0) + hLoss);
          }
        }
      }

      // Carry forward state for next window
      state = states[states.length - 1]!;
    }

    return {
      loss: totalSamples > 0 ? totalLoss / totalSamples : 0,
      samples: totalSamples,
      horizonLosses,
    };
  }

  // ============================================================================
  // GRADIENT MANAGEMENT
  // ============================================================================

  private initGradientAccumulator(n: number): IGradientAccumulator {
    return {
      dA: Array(n).fill(0),
      dW: Array(n).fill(null).map(() => Array(n).fill(0)),
      dB: Array(n).fill(null).map(() => Array(n).fill(0)),
      dBiasLatent: Array(n).fill(0),
      dBiasObserved: Array(n).fill(0),
      numSamples: 0,
    };
  }

  private accumulateGradients(
    accum: IGradientAccumulator,
    grads: {
      dA: number[];
      dW: number[][];
      dB: number[][];
      dBiasLatent: number[];
      dBiasObserved: number[];
    }
  ): void {
    const n = accum.dA.length;

    for (let i = 0; i < n; i++) {
      const dAi = accum.dA[i];
      const dBLi = accum.dBiasLatent[i];
      const dBOi = accum.dBiasObserved[i];
      if (dAi !== undefined) accum.dA[i] = dAi + (grads.dA[i] ?? 0);
      if (dBLi !== undefined) accum.dBiasLatent[i] = dBLi + (grads.dBiasLatent[i] ?? 0);
      if (dBOi !== undefined) accum.dBiasObserved[i] = dBOi + (grads.dBiasObserved[i] ?? 0);

      const dWRow = accum.dW[i];
      const dBRow = accum.dB[i];
      if (dWRow && dBRow) {
        for (let j = 0; j < n; j++) {
          const dWij = dWRow[j];
          const dBij = dBRow[j];
          if (dWij !== undefined) dWRow[j] = dWij + (grads.dW[i]?.[j] ?? 0);
          if (dBij !== undefined) dBRow[j] = dBij + (grads.dB[i]?.[j] ?? 0);
        }
      }
    }

    accum.numSamples++;
  }

  private normalizeGradients(accum: IGradientAccumulator): void {
    if (accum.numSamples <= 1) return;

    const n = accum.dA.length;
    const scale = 1 / accum.numSamples;

    for (let i = 0; i < n; i++) {
      const dAi = accum.dA[i];
      const dBLi = accum.dBiasLatent[i];
      const dBOi = accum.dBiasObserved[i];
      if (dAi !== undefined) accum.dA[i] = dAi * scale;
      if (dBLi !== undefined) accum.dBiasLatent[i] = dBLi * scale;
      if (dBOi !== undefined) accum.dBiasObserved[i] = dBOi * scale;

      const dWRow = accum.dW[i];
      const dBRow = accum.dB[i];
      if (dWRow && dBRow) {
        for (let j = 0; j < n; j++) {
          const dWij = dWRow[j];
          const dBij = dBRow[j];
          if (dWij !== undefined) dWRow[j] = dWij * scale;
          if (dBij !== undefined) dBRow[j] = dBij * scale;
        }
      }
    }
  }

  // ============================================================================
  // DATA PREPARATION
  // ============================================================================

  /**
   * Prepare training and validation sequences from dataset
   */
  private prepareTrainingDataInternal(dataset: StudentLifeDataset): {
    train: ITrainingSequence[];
    validation: ITrainingSequence[];
  } {
    const allSequences: ITrainingSequence[] = [];

    for (const participant of dataset.participants) {
      if (participant.observations.length < this.config.bpttTruncationWindow + 1) {
        continue; // Skip short sequences
      }

      let values = participant.observations.map(o => [...o.values]);
      let timestamps = participant.observations.map(o => o.timestamp);
      let wasInterpolated = false;
      let normStats: INormalizationStats | undefined;

      // Handle irregular sampling
      if (this.config.handleIrregularSampling) {
        const regularized = this.regularizeTimesteps(
          values,
          timestamps,
          this.config.targetIntervalHours
        );
        values = regularized.values;
        timestamps = regularized.timestamps;
        wasInterpolated = regularized.wasInterpolated;
      }

      // Per-participant normalization
      if (this.config.perParticipantNormalization) {
        const normalized = this.normalizeSequence(values);
        values = normalized.values;
        normStats = normalized.stats;
      }

      allSequences.push({
        participantId: participant.participantId,
        values,
        timestamps,
        wasInterpolated,
        normStats,
      });
    }

    // Split into train/validation
    this.shuffleArray(allSequences);
    const splitIdx = Math.floor(allSequences.length * (1 - this.config.validationSplit));

    return {
      train: allSequences.slice(0, splitIdx),
      validation: allSequences.slice(splitIdx),
    };
  }

  /**
   * Regularize irregular time series to fixed intervals
   */
  private regularizeTimesteps(
    values: number[][],
    timestamps: Date[],
    targetIntervalHours: number
  ): { values: number[][]; timestamps: Date[]; wasInterpolated: boolean } {
    if (values.length < 2) {
      return { values, timestamps, wasInterpolated: false };
    }

    const firstTime = timestamps[0]!.getTime();
    const lastTime = timestamps[timestamps.length - 1]!.getTime();
    const totalHours = (lastTime - firstTime) / 3600000;
    const numSteps = Math.ceil(totalHours / targetIntervalHours);
    const targetInterval = targetIntervalHours * 3600000;

    const regularValues: number[][] = [];
    const regularTimestamps: Date[] = [];

    for (let i = 0; i < numSteps; i++) {
      const targetTime = firstTime + i * targetInterval;

      // Find surrounding observations for interpolation
      let beforeIdx = -1;
      let afterIdx = -1;

      for (let j = 0; j < timestamps.length; j++) {
        const obsTime = timestamps[j]!.getTime();
        if (obsTime <= targetTime) {
          beforeIdx = j;
        }
        if (obsTime >= targetTime && afterIdx === -1) {
          afterIdx = j;
        }
      }

      if (beforeIdx >= 0 && afterIdx >= 0 && beforeIdx !== afterIdx) {
        // Linear interpolation
        const beforeTime = timestamps[beforeIdx]!.getTime();
        const afterTime = timestamps[afterIdx]!.getTime();
        const t = (targetTime - beforeTime) / (afterTime - beforeTime);

        const interpolated = values[beforeIdx]!.map((v, dim) =>
          v * (1 - t) + (values[afterIdx]![dim] ?? v) * t
        );
        regularValues.push(interpolated);
        regularTimestamps.push(new Date(targetTime));
      } else if (beforeIdx >= 0) {
        regularValues.push([...values[beforeIdx]!]);
        regularTimestamps.push(new Date(targetTime));
      } else if (afterIdx >= 0) {
        regularValues.push([...values[afterIdx]!]);
        regularTimestamps.push(new Date(targetTime));
      }
    }

    return {
      values: regularValues,
      timestamps: regularTimestamps,
      wasInterpolated: true,
    };
  }

  /**
   * Z-score normalization per sequence
   */
  private normalizeSequence(values: number[][]): {
    values: number[][];
    stats: INormalizationStats;
  } {
    if (values.length === 0) {
      return { values, stats: { means: [], stds: [] } };
    }

    const numDims = values[0]!.length;
    const means: number[] = Array(numDims).fill(0) as number[];
    const stds: number[] = Array(numDims).fill(0) as number[];

    // Compute means
    for (const obs of values) {
      for (let d = 0; d < numDims; d++) {
        const currentMean = means[d] ?? 0;
        means[d] = currentMean + (obs[d] ?? 0);
      }
    }
    for (let d = 0; d < numDims; d++) {
      const currentMean = means[d] ?? 0;
      means[d] = currentMean / values.length;
    }

    // Compute standard deviations
    for (const obs of values) {
      for (let d = 0; d < numDims; d++) {
        const diff = (obs[d] ?? 0) - (means[d] ?? 0);
        const currentStd = stds[d] ?? 0;
        stds[d] = currentStd + diff * diff;
      }
    }
    for (let d = 0; d < numDims; d++) {
      const currentStd = stds[d] ?? 0;
      stds[d] = Math.sqrt(currentStd / (values.length - 1)) || 1;
    }

    // Normalize
    const normalized = values.map(obs =>
      obs.map((v, d) => ((v ?? 0) - means[d]!) / stds[d]!)
    );

    return {
      values: normalized,
      stats: { means, stds },
    };
  }

  // ============================================================================
  // LEARNING RATE SCHEDULING
  // ============================================================================

  private computeLearningRate(epoch: number, config: IPLRNNTrainingConfig): number {
    const { learningRate, lrSchedule, lrDecayFactor, lrDecaySteps, lrMin, epochs } = config;

    // Learning rate warmup (first 5 epochs, but only if we have enough epochs)
    // Based on research: warmup prevents early divergence
    const warmupEpochs = Math.min(5, Math.floor(epochs / 4));
    let warmupFactor = 1.0;
    if (warmupEpochs > 0 && epoch < warmupEpochs) {
      warmupFactor = (epoch + 1) / warmupEpochs;
    }

    let baseLR: number;

    switch (lrSchedule) {
      case 'step':
        baseLR = Math.max(lrMin, learningRate * Math.pow(lrDecayFactor, Math.floor(epoch / lrDecaySteps)));
        break;

      case 'exponential':
        baseLR = Math.max(lrMin, learningRate * Math.pow(lrDecayFactor, epoch / lrDecaySteps));
        break;

      case 'cosine': {
        // Cosine annealing with warmup
        const effectiveEpochs = Math.max(1, epochs - warmupEpochs);
        const adjustedEpoch = Math.max(0, epoch - warmupEpochs);
        const progress = adjustedEpoch / effectiveEpochs;
        baseLR = lrMin + (learningRate - lrMin) * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, progress)));
        break;
      }

      case 'constant':
      default:
        baseLR = learningRate;
    }

    // Ensure we never return NaN or negative
    const finalLR = baseLR * warmupFactor;
    if (!Number.isFinite(finalLR) || finalLR < 0) {
      return lrMin;
    }

    return finalLR;
  }

  // ============================================================================
  // METRICS COMPUTATION
  // ============================================================================

  private computeFinalMetrics(
    validationSequences: ITrainingSequence[],
    horizons: number[]
  ): ITrainingMetrics {
    const perHorizonMAE = new Map<number, number>();
    const perHorizonRMSE = new Map<number, number>();
    const perHorizonR2 = new Map<number, number>();
    const perHorizonPersistence = new Map<number, number>();

    for (const h of horizons) {
      let sumAbsError = 0;
      let sumSqError = 0;
      let sumPersistError = 0;
      let sumSqActual = 0;
      let meanActual = 0;
      let count = 0;

      // First pass: compute mean
      for (const seq of validationSequences) {
        for (let t = 0; t < seq.values.length - h; t++) {
          const actual = seq.values[t + h]!;
          for (const v of actual) {
            meanActual += v;
            count++;
          }
        }
      }
      meanActual = count > 0 ? meanActual / count : 0;
      count = 0;

      // Second pass: compute metrics
      for (const seq of validationSequences) {
        let state = this.engine.createState(seq.values[0]!, seq.timestamps[0]);

        for (let t = 0; t < seq.values.length - h - 1; t++) {
          state = this.engine.forward(state);

          // Multi-step prediction
          let predState = state;
          for (let s = 1; s < h; s++) {
            predState = this.engine.forward(predState);
          }

          const pred = predState.observedState;
          const actual = seq.values[t + h]!;
          const current = seq.values[t]!;

          for (let d = 0; d < actual.length; d++) {
            const p = pred[d] ?? 0;
            const a = actual[d] ?? 0;
            const c = current[d] ?? 0;

            sumAbsError += Math.abs(p - a);
            sumSqError += (p - a) ** 2;
            sumPersistError += Math.abs(c - a);
            sumSqActual += (a - meanActual) ** 2;
            count++;
          }

          // Teacher forcing for next step
          state = this.engine.createState(seq.values[t + 1]!, seq.timestamps[t + 1]);
          state.timestep = predState.timestep;
        }
      }

      if (count > 0) {
        perHorizonMAE.set(h, sumAbsError / count);
        perHorizonRMSE.set(h, Math.sqrt(sumSqError / count));
        perHorizonR2.set(h, 1 - sumSqError / (sumSqActual || 1));
        perHorizonPersistence.set(h, sumPersistError / count);
      }
    }

    // Compute overall improvement
    let totalMAE = 0;
    let totalPersist = 0;
    for (const h of horizons) {
      totalMAE += perHorizonMAE.get(h) ?? 0;
      totalPersist += perHorizonPersistence.get(h) ?? 0;
    }
    const avgMAE = totalMAE / horizons.length;
    const avgPersist = totalPersist / horizons.length;

    const improvementOverPersistence = avgPersist > 0
      ? ((avgPersist - avgMAE) / avgPersist) * 100
      : 0;

    return {
      finalTrainingLoss: 0, // Set by caller
      finalValidationLoss: avgMAE,
      perHorizonMAE,
      perHorizonRMSE,
      perHorizonR2,
      improvementOverPersistence,
      improvementOverUntrained: 0, // Would need untrained baseline
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mse(pred: number[], target: number[]): number {
    let sum = 0;
    const n = Math.min(pred.length, target.length);
    for (let i = 0; i < n; i++) {
      const diff = (pred[i] ?? 0) - (target[i] ?? 0);
      sum += diff * diff;
    }
    return n > 0 ? sum / n : 0;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
  }
}

/**
 * Factory function to create trainer
 */
export function createPLRNNTrainer(
  engine: PLRNNEngine,
  config?: Partial<IPLRNNTrainingConfig>
): PLRNNTrainer {
  return new PLRNNTrainer(engine, config);
}
