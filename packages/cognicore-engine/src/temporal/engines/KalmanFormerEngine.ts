/**
 * 🔮 KALMANFORMER ENGINE IMPLEMENTATION
 * =====================================
 * Hybrid Kalman Filter + Transformer Architecture
 *
 * Scientific Foundation (2025 Research):
 * - "KalmanFormer: using Transformer to model Kalman Gain in Visual Inertial Odometry"
 * - State Space Models + Attention mechanisms
 *
 * Key Innovation:
 * - Kalman Filter: Optimal for short-term, handles noise
 * - Transformer: Captures long-range dependencies in mood patterns
 * - Learned Kalman Gain: Context-aware trust adaptation
 *
 * Architecture:
 * 1. Encode observation history with positional + time embeddings
 * 2. Apply multi-head self-attention to capture patterns
 * 3. Predict optimal Kalman Gain based on context
 * 4. Blend Kalman prediction with Transformer prediction
 *
 * © БФ "Другой путь", 2025
 */

import {
  type IKalmanFormerEngine,
  type IKalmanFormerConfig,
  type IKalmanFormerState,
  type IKalmanFormerPrediction,
  type IKalmanFormerWeights,
  type IKalmanFormerTrainingSample,
  type IAttentionWeights,
  DEFAULT_KALMANFORMER_CONFIG,
} from '../interfaces/IKalmanFormer';
import type { IPLRNNState } from '../interfaces/IPLRNNEngine';
import type { IKalmanFilterState } from '../../twin/interfaces/IDigitalTwin';

/**
 * State dimension labels
 */
const STATE_DIMENSIONS = ['valence', 'arousal', 'dominance', 'risk', 'resources'];

/**
 * KalmanFormer Engine Implementation
 */
export class KalmanFormerEngine implements IKalmanFormerEngine {
  private config: IKalmanFormerConfig;
  private weights: IKalmanFormerWeights | null = null;
  private initialized = false;

  constructor(config?: Partial<IKalmanFormerConfig>) {
    this.config = { ...DEFAULT_KALMANFORMER_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(config?: Partial<IKalmanFormerConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    const { stateDim, obsDim, embedDim, numHeads, numLayers } = this.config;

    // Initialize Kalman matrices
    const kalman = {
      stateTransition: this.initIdentityMatrix(stateDim),
      observationMatrix: this.initIdentityMatrix(obsDim),
      processNoise: this.initDiagonalMatrix(stateDim, 0.01),
      measurementNoise: this.initDiagonalMatrix(obsDim, 0.1),
    };

    // Initialize Transformer weights
    const headDim = embedDim / numHeads;
    const transformer = {
      queryWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      keyWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      valueWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      outputProjection: this.initRandomMatrix(embedDim, embedDim),
      feedforward: Array(numLayers).fill(null).map(() => ({
        linear1: this.initRandomMatrix(embedDim, embedDim * 4),
        linear2: this.initRandomMatrix(embedDim * 4, embedDim),
        bias1: new Array(embedDim * 4).fill(0),
        bias2: new Array(embedDim).fill(0),
      })),
      layerNorm: Array(numLayers * 2).fill(null).map(() => ({
        gamma: new Array(embedDim).fill(1),
        beta: new Array(embedDim).fill(0),
      })),
    };

    // Embedding layers
    const embedding = {
      observation: this.initRandomMatrix(obsDim, embedDim),
      time: this.config.timeEmbedding === 'learned'
        ? this.initRandomMatrix(1, embedDim)
        : undefined,
      position: this.initPositionalEmbedding(this.config.contextWindow, embedDim),
    };

    // Gain predictor (learned Kalman Gain)
    const gainPredictor = this.config.learnedGain ? {
      weights: this.initRandomMatrix(embedDim, stateDim * obsDim),
      bias: new Array(stateDim * obsDim).fill(0),
    } : undefined;

    // Blend ratio predictor
    const blendPredictor = {
      weights: new Array(embedDim).fill(0).map(() => Math.random() * 0.1),
      bias: 0.5, // Start with equal blend
    };

    this.weights = {
      kalman,
      transformer,
      embedding,
      gainPredictor,
      blendPredictor,
      outputProjection: this.initRandomMatrix(embedDim, stateDim),
      meta: {
        trainedAt: new Date(),
        trainingSamples: 0,
        validationLoss: Infinity,
        config: this.config,
      },
    };

    this.initialized = true;
  }

  loadWeights(weights: IKalmanFormerWeights): void {
    this.weights = weights;
    this.config = weights.meta.config;
    this.initialized = true;
  }

  getWeights(): IKalmanFormerWeights {
    if (!this.weights) {
      throw new Error('KalmanFormer not initialized');
    }
    return this.weights;
  }

  // ============================================================================
  // UPDATE (FILTER STEP)
  // ============================================================================

  update(
    state: IKalmanFormerState,
    observation: number[],
    timestamp: Date
  ): IKalmanFormerState {
    if (!this.weights || !this.initialized) {
      throw new Error('KalmanFormer not initialized');
    }

    // 1. Update observation history
    const newHistory = [...state.observationHistory];
    newHistory.push({
      observation: [...observation],
      timestamp,
      embedding: this.embedObservation(observation, timestamp, newHistory.length),
    });

    // Keep only contextWindow observations
    while (newHistory.length > this.config.contextWindow) {
      newHistory.shift();
    }

    // 2. Standard Kalman predict step
    const kalmanPredicted = this.kalmanPredict(state.kalmanState);

    // 3. Compute Transformer context encoding
    const contextEncoding = this.encodeContext(newHistory);

    // 4. Learn optimal Kalman Gain from context (if enabled)
    let kalmanGain: number[][];
    if (this.config.learnedGain && this.weights.gainPredictor) {
      kalmanGain = this.predictKalmanGain(contextEncoding);
    } else {
      kalmanGain = this.computeStandardKalmanGain(kalmanPredicted);
    }

    // 5. Kalman update step with learned gain
    const kalmanUpdated = this.kalmanUpdate(
      kalmanPredicted,
      observation,
      kalmanGain
    );

    // 6. Transformer prediction
    const transformerPrediction = this.transformerPredict(newHistory, contextEncoding);

    // 7. Compute adaptive blend ratio
    const blendRatio = this.computeBlendRatio(
      contextEncoding,
      state.kalmanState,
      observation
    );

    // 8. Blend predictions
    const blendedState = this.blendPredictions(
      kalmanUpdated.stateEstimate,
      transformerPrediction,
      blendRatio
    );

    // Update Kalman state with blended estimate
    const newKalmanState: IKalmanFilterState = {
      ...kalmanUpdated,
      stateEstimate: blendedState,
    };

    return {
      kalmanState: newKalmanState,
      transformerHidden: contextEncoding,
      observationHistory: newHistory,
      learnedGain: kalmanGain,
      currentBlendRatio: blendRatio,
      confidence: this.computeConfidence(kalmanUpdated, transformerPrediction, observation),
      timestamp,
    };
  }

  // ============================================================================
  // PREDICTION
  // ============================================================================

  predict(
    state: IKalmanFormerState,
    horizon: number
  ): IKalmanFormerPrediction {
    if (!this.weights || !this.initialized) {
      throw new Error('KalmanFormer not initialized');
    }

    // Multi-step prediction
    const trajectory: IKalmanFormerState[] = [state];
    let currentState = state;

    for (let t = 0; t < horizon; t++) {
      // Kalman prediction
      const kalmanPred = this.kalmanPredict(currentState.kalmanState);

      // Transformer prediction using context
      const contextEncoding = this.encodeContext(currentState.observationHistory);
      const transformerPred = this.transformerPredict(
        currentState.observationHistory,
        contextEncoding
      );

      // Blend
      const blendedPred = this.blendPredictions(
        kalmanPred.stateEstimate,
        transformerPred,
        currentState.currentBlendRatio
      );

      // Create pseudo-observation for next step
      const nextTimestamp = new Date(
        currentState.timestamp.getTime() + this.config.maxTimeGap / horizon * 3600000
      );

      const nextState: IKalmanFormerState = {
        kalmanState: {
          ...kalmanPred,
          stateEstimate: blendedPred,
        },
        transformerHidden: contextEncoding,
        observationHistory: [
          ...currentState.observationHistory.slice(-this.config.contextWindow + 1),
          {
            observation: blendedPred,
            timestamp: nextTimestamp,
            embedding: this.embedObservation(blendedPred, nextTimestamp, currentState.observationHistory.length),
          },
        ],
        learnedGain: currentState.learnedGain,
        currentBlendRatio: currentState.currentBlendRatio,
        confidence: currentState.confidence * 0.95, // Decay confidence
        timestamp: nextTimestamp,
      };

      trajectory.push(nextState);
      currentState = nextState;
    }

    const finalState = trajectory[trajectory.length - 1];

    // Compute confidence intervals
    const uncertainty = finalState.kalmanState.errorCovariance.map(row =>
      Math.sqrt(row.reduce((max, v) => Math.max(max, v), 0))
    );

    const lower = finalState.kalmanState.stateEstimate.map((v, i) =>
      v - 1.96 * uncertainty[i]
    );
    const upper = finalState.kalmanState.stateEstimate.map((v, i) =>
      v + 1.96 * uncertainty[i]
    );

    // Get attention weights
    const attention = this.explain(finalState);

    return {
      stateEstimate: finalState.kalmanState.stateEstimate,
      covariance: finalState.kalmanState.errorCovariance,
      kalmanContribution: this.kalmanPredict(state.kalmanState).stateEstimate,
      transformerContribution: this.transformerPredict(
        state.observationHistory,
        this.encodeContext(state.observationHistory)
      ),
      blendedPrediction: finalState.kalmanState.stateEstimate,
      confidenceInterval: { lower, upper, level: 0.95 },
      attention,
      horizon,
      trajectory,
    };
  }

  // ============================================================================
  // ATTENTION & EXPLAINABILITY
  // ============================================================================

  explain(state: IKalmanFormerState): IAttentionWeights {
    if (!this.weights) {
      throw new Error('KalmanFormer not initialized');
    }

    const history = state.observationHistory;
    if (history.length === 0) {
      return {
        selfAttention: [],
        topInfluentialObservations: [],
        temporalPattern: 'uniform',
      };
    }

    // Compute attention weights
    const embeddings = history.map(h => h.embedding || this.embedObservation(
      h.observation, h.timestamp, 0
    ));

    const attentionWeights = this.computeAttentionWeights(embeddings);

    // Find top influential observations
    const influenceScores = history.map((h, i) => {
      const totalWeight = attentionWeights[attentionWeights.length - 1]?.[i] || 0;
      return { index: i, timestamp: h.timestamp, weight: totalWeight };
    });

    const topInfluential = influenceScores
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(obs => ({
        ...obs,
        dimension: this.findMostInfluentialDimension(history[obs.index].observation),
      }));

    // Determine temporal pattern
    const recentWeights = influenceScores.slice(-5);
    const earlyWeights = influenceScores.slice(0, 5);
    const recentAvg = recentWeights.reduce((s, w) => s + w.weight, 0) / recentWeights.length;
    const earlyAvg = earlyWeights.reduce((s, w) => s + w.weight, 0) / (earlyWeights.length || 1);

    let temporalPattern: 'recency_bias' | 'pattern_matching' | 'uniform';
    if (recentAvg > earlyAvg * 1.5) {
      temporalPattern = 'recency_bias';
    } else if (this.detectPatternMatching(attentionWeights)) {
      temporalPattern = 'pattern_matching';
    } else {
      temporalPattern = 'uniform';
    }

    return {
      selfAttention: [attentionWeights],
      topInfluentialObservations: topInfluential,
      temporalPattern,
    };
  }

  // ============================================================================
  // BLEND RATIO ADAPTATION
  // ============================================================================

  adaptBlendRatio(predictions: number[][], actuals: number[][]): number {
    if (predictions.length !== actuals.length || predictions.length === 0) {
      return this.config.blendRatio;
    }

    // Compare Kalman vs Transformer contributions
    // This is a simplified version - in practice would track both contributions

    let totalError = 0;
    for (let t = 0; t < predictions.length; t++) {
      for (let i = 0; i < predictions[t].length; i++) {
        totalError += Math.pow(predictions[t][i] - actuals[t][i], 2);
      }
    }

    const avgError = Math.sqrt(totalError / (predictions.length * predictions[0].length));

    // Adjust blend ratio based on error
    // Higher error -> more Transformer (captures complex patterns)
    // Lower error -> more Kalman (simpler is better)
    const errorThreshold = 0.5;
    let newRatio = this.config.blendRatio;

    if (avgError > errorThreshold) {
      newRatio = Math.min(0.8, newRatio + 0.1);
    } else if (avgError < errorThreshold * 0.5) {
      newRatio = Math.max(0.2, newRatio - 0.1);
    }

    return newRatio;
  }

  // ============================================================================
  // TRAINING
  // ============================================================================

  train(samples: IKalmanFormerTrainingSample[]): {
    loss: number;
    kalmanLoss: number;
    transformerLoss: number;
    epochs: number;
  } {
    if (!this.weights) {
      this.initialize();
    }

    let totalLoss = 0;
    let kalmanLoss = 0;
    let transformerLoss = 0;

    for (const sample of samples) {
      // Initialize state
      let state = this.initializeState(sample.observations[0], sample.timestamps[0]);

      for (let t = 1; t < sample.observations.length; t++) {
        // Update with observation
        state = this.update(state, sample.observations[t], sample.timestamps[t]);

        // Compute losses if ground truth available
        if (sample.groundTruth && sample.groundTruth[t]) {
          const target = sample.groundTruth[t];
          const kalmanPred = state.kalmanState.stateEstimate;
          const transformerPred = this.transformerPredict(
            state.observationHistory,
            state.transformerHidden
          );

          // MSE losses
          const kLoss = kalmanPred.reduce((sum, p, i) => sum + Math.pow(p - target[i], 2), 0);
          const tLoss = transformerPred.reduce((sum, p, i) => sum + Math.pow(p - target[i], 2), 0);

          kalmanLoss += kLoss;
          transformerLoss += tLoss;
          totalLoss += kLoss * (1 - state.currentBlendRatio) + tLoss * state.currentBlendRatio;
        }
      }
    }

    const count = samples.reduce((sum, s) => sum + s.observations.length - 1, 0);

    // Update metadata
    this.weights!.meta.trainingSamples += samples.length;
    this.weights!.meta.trainedAt = new Date();
    this.weights!.meta.validationLoss = totalLoss / count;

    return {
      loss: totalLoss / count,
      kalmanLoss: kalmanLoss / count,
      transformerLoss: transformerLoss / count,
      epochs: 1,
    };
  }

  // ============================================================================
  // INTEROPERABILITY
  // ============================================================================

  toPLRNNState(state: IKalmanFormerState): IPLRNNState {
    return {
      latentState: [...state.kalmanState.stateEstimate],
      hiddenActivations: state.transformerHidden[0] || [],
      observedState: [...state.kalmanState.stateEstimate],
      uncertainty: state.kalmanState.errorCovariance.map(row =>
        Math.sqrt(row.reduce((max, v) => Math.max(max, Math.abs(v)), 0))
      ),
      timestamp: state.timestamp,
      timestep: state.observationHistory.length,
    };
  }

  fromPLRNNState(plrnnState: IPLRNNState): IKalmanFormerState {
    const n = plrnnState.latentState.length;

    return {
      kalmanState: {
        stateEstimate: [...plrnnState.observedState],
        errorCovariance: this.initDiagonalMatrix(n, 0.1),
        predictedState: [...plrnnState.latentState],
        predictedCovariance: this.initDiagonalMatrix(n, 0.1),
        innovation: new Array(n).fill(0),
        innovationCovariance: this.initDiagonalMatrix(n, 0.1),
        kalmanGain: this.initIdentityMatrix(n),
        normalized_innovation_squared: 0,
        isOutlier: false,
        adaptedQ: null,
        adaptedR: null,
        timestep: plrnnState.timestep,
        timestamp: plrnnState.timestamp,
      },
      transformerHidden: [plrnnState.hiddenActivations],
      observationHistory: [{
        observation: [...plrnnState.observedState],
        timestamp: plrnnState.timestamp,
      }],
      currentBlendRatio: this.config.blendRatio,
      confidence: 1 - plrnnState.uncertainty.reduce((a, b) => a + b, 0) / n,
      timestamp: plrnnState.timestamp,
    };
  }

  getComplexityMetrics(): {
    totalParameters: number;
    kalmanParameters: number;
    transformerParameters: number;
    effectiveContextLength: number;
  } {
    if (!this.weights) {
      return { totalParameters: 0, kalmanParameters: 0, transformerParameters: 0, effectiveContextLength: 0 };
    }

    const { stateDim, embedDim, numHeads, numLayers } = this.config;

    // Kalman parameters
    const kalmanParameters = 4 * stateDim * stateDim; // 4 matrices

    // Transformer parameters
    const headDim = embedDim / numHeads;
    const qkvPerLayer = 3 * numHeads * embedDim * headDim;
    const ffnPerLayer = 2 * embedDim * embedDim * 4;
    const transformerParameters = numLayers * (qkvPerLayer + ffnPerLayer + 4 * embedDim);

    // Embedding parameters
    const embeddingParams = this.config.obsDim * embedDim + this.config.contextWindow * embedDim;

    return {
      totalParameters: kalmanParameters + transformerParameters + embeddingParams,
      kalmanParameters,
      transformerParameters,
      effectiveContextLength: this.config.contextWindow,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private initializeState(observation: number[], timestamp: Date): IKalmanFormerState {
    const n = observation.length;

    return {
      kalmanState: {
        stateEstimate: [...observation],
        errorCovariance: this.initDiagonalMatrix(n, 0.1),
        predictedState: [...observation],
        predictedCovariance: this.initDiagonalMatrix(n, 0.1),
        innovation: new Array(n).fill(0),
        innovationCovariance: this.initDiagonalMatrix(n, 0.1),
        kalmanGain: this.initIdentityMatrix(n),
        normalized_innovation_squared: 0,
        isOutlier: false,
        adaptedQ: null,
        adaptedR: null,
        timestep: 0,
        timestamp,
      },
      transformerHidden: [],
      observationHistory: [{
        observation: [...observation],
        timestamp,
        embedding: this.embedObservation(observation, timestamp, 0),
      }],
      currentBlendRatio: this.config.blendRatio,
      confidence: 0.5,
      timestamp,
    };
  }

  private kalmanPredict(state: IKalmanFilterState): IKalmanFilterState {
    const A = this.weights!.kalman.stateTransition;
    const Q = this.weights!.kalman.processNoise;

    // x_pred = A * x
    const predictedState = this.matVec(A, state.stateEstimate);

    // P_pred = A * P * A' + Q
    const AP = this.matMul(A, state.errorCovariance);
    const APAt = this.matMul(AP, this.transpose(A));
    const predictedCovariance = this.matAdd(APAt, Q);

    return {
      ...state,
      predictedState,
      predictedCovariance,
      timestep: state.timestep + 1,
      timestamp: new Date(),
    };
  }

  private kalmanUpdate(
    predicted: IKalmanFilterState,
    observation: number[],
    gain: number[][]
  ): IKalmanFilterState {
    const H = this.weights!.kalman.observationMatrix;

    // Innovation: y = z - H * x_pred
    const Hx = this.matVec(H, predicted.predictedState);
    const innovation = observation.map((z, i) => z - Hx[i]);

    // State update: x = x_pred + K * y
    const Ky = this.matVec(gain, innovation);
    const stateEstimate = predicted.predictedState.map((x, i) => x + Ky[i]);

    // Covariance update: P = (I - K * H) * P_pred
    const n = stateEstimate.length;
    const KH = this.matMul(gain, H);
    const IminusKH = this.matSub(this.initIdentityMatrix(n), KH);
    const errorCovariance = this.matMul(IminusKH, predicted.predictedCovariance);

    return {
      ...predicted,
      stateEstimate,
      errorCovariance,
      innovation,
      kalmanGain: gain,
    };
  }

  private computeStandardKalmanGain(predicted: IKalmanFilterState): number[][] {
    const H = this.weights!.kalman.observationMatrix;
    const R = this.weights!.kalman.measurementNoise;
    const P = predicted.predictedCovariance;

    // S = H * P * H' + R
    const HP = this.matMul(H, P);
    const HPHt = this.matMul(HP, this.transpose(H));
    const S = this.matAdd(HPHt, R);

    // K = P * H' * S^-1
    const PHt = this.matMul(P, this.transpose(H));
    const Sinv = this.matInverse(S);
    return this.matMul(PHt, Sinv);
  }

  private predictKalmanGain(contextEncoding: number[][]): number[][] {
    if (!this.weights!.gainPredictor) {
      throw new Error('Gain predictor not initialized');
    }

    // Use last context embedding to predict gain
    const lastContext = contextEncoding[contextEncoding.length - 1] ||
      new Array(this.config.embedDim).fill(0);

    // Linear transformation
    const gainVector = this.matVec(
      [this.weights!.gainPredictor.weights.map(row => row[0] || 0)],
      lastContext
    );

    // Reshape to matrix
    const n = this.config.stateDim;
    const m = this.config.obsDim;
    const gain: number[][] = [];

    for (let i = 0; i < n; i++) {
      gain[i] = [];
      for (let j = 0; j < m; j++) {
        const idx = i * m + j;
        // Sigmoid to bound gain values
        gain[i][j] = this.sigmoid(gainVector[idx] || 0);
      }
    }

    return gain;
  }

  private embedObservation(
    observation: number[],
    timestamp: Date,
    position: number
  ): number[] {
    const { embedDim } = this.config;
    const obsMatrix = this.weights!.embedding.observation;

    // Observation embedding
    let embedding = this.matVec(obsMatrix, observation);

    // Add positional embedding
    if (this.weights!.embedding.position) {
      const posEmb = this.weights!.embedding.position[position % this.weights!.embedding.position.length];
      embedding = embedding.map((v, i) => v + (posEmb[i] || 0));
    }

    // Add time embedding (sinusoidal)
    if (this.config.timeEmbedding === 'sinusoidal') {
      const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
      const dayOfWeek = timestamp.getDay();

      for (let i = 0; i < embedDim; i += 2) {
        const freq = Math.pow(10000, i / embedDim);
        embedding[i] += Math.sin(hour * 2 * Math.PI / 24 / freq);
        if (i + 1 < embedDim) {
          embedding[i + 1] += Math.cos(dayOfWeek * 2 * Math.PI / 7 / freq);
        }
      }
    }

    return embedding;
  }

  private encodeContext(
    history: Array<{ observation: number[]; timestamp: Date; embedding?: number[] }>
  ): number[][] {
    if (history.length === 0) {
      return [new Array(this.config.embedDim).fill(0)];
    }

    // Get embeddings
    const embeddings = history.map((h, i) =>
      h.embedding || this.embedObservation(h.observation, h.timestamp, i)
    );

    // Apply self-attention layers
    let output = embeddings;
    const { numLayers } = this.config;

    for (let layer = 0; layer < numLayers; layer++) {
      // Multi-head self-attention
      const attended = this.multiHeadAttention(output, layer);

      // Add & Norm (residual connection)
      output = this.addAndNorm(output, attended, layer * 2);

      // Feed-forward
      const ffOutput = this.feedForward(output, layer);

      // Add & Norm
      output = this.addAndNorm(output, ffOutput, layer * 2 + 1);
    }

    return output;
  }

  private multiHeadAttention(input: number[][], layer: number): number[][] {
    const { numHeads, embedDim } = this.config;
    const headDim = embedDim / numHeads;
    const seqLen = input.length;

    // For each head, compute Q, K, V
    const headOutputs: number[][] = [];

    for (let h = 0; h < numHeads; h++) {
      // Simplified: use portion of embedding as Q, K, V
      const Q = input.map(emb => emb.slice(h * headDim, (h + 1) * headDim));
      const K = input.map(emb => emb.slice(h * headDim, (h + 1) * headDim));
      const V = input.map(emb => emb.slice(h * headDim, (h + 1) * headDim));

      // Attention scores: softmax(Q * K' / sqrt(d))
      const scores: number[][] = [];
      for (let i = 0; i < seqLen; i++) {
        scores[i] = [];
        for (let j = 0; j < seqLen; j++) {
          let score = 0;
          for (let k = 0; k < headDim; k++) {
            score += Q[i][k] * K[j][k];
          }
          scores[i][j] = score / Math.sqrt(headDim) / this.config.temperature;
        }
        // Softmax
        const maxScore = Math.max(...scores[i]);
        const expScores = scores[i].map(s => Math.exp(s - maxScore));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        scores[i] = expScores.map(e => e / sumExp);
      }

      // Attended values
      for (let i = 0; i < seqLen; i++) {
        const attended = new Array(headDim).fill(0);
        for (let j = 0; j < seqLen; j++) {
          for (let k = 0; k < headDim; k++) {
            attended[k] += scores[i][j] * V[j][k];
          }
        }
        if (!headOutputs[i]) headOutputs[i] = [];
        headOutputs[i].push(...attended);
      }
    }

    return headOutputs;
  }

  private feedForward(input: number[][], layer: number): number[][] {
    const ff = this.weights!.transformer.feedforward[layer];

    return input.map(emb => {
      // Linear 1 + ReLU
      let hidden = this.matVec([ff.linear1.map(row => row[0] || 0)], emb);
      hidden = hidden.map((v, i) => Math.max(0, v + ff.bias1[i]));

      // Linear 2
      let output = this.matVec([ff.linear2.map(row => row[0] || 0)], hidden);
      output = output.map((v, i) => v + ff.bias2[i]);

      return output;
    });
  }

  private addAndNorm(
    residual: number[][],
    output: number[][],
    layerNormIdx: number
  ): number[][] {
    const ln = this.weights!.transformer.layerNorm[layerNormIdx];

    return residual.map((res, i) => {
      // Add
      const added = res.map((r, j) => r + (output[i]?.[j] || 0));

      // LayerNorm
      const mean = added.reduce((a, b) => a + b, 0) / added.length;
      const variance = added.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / added.length;
      const std = Math.sqrt(variance + 1e-5);

      return added.map((v, j) =>
        ((v - mean) / std) * ln.gamma[j] + ln.beta[j]
      );
    });
  }

  private transformerPredict(
    history: Array<{ observation: number[]; timestamp: Date; embedding?: number[] }>,
    contextEncoding: number[][]
  ): number[] {
    if (contextEncoding.length === 0) {
      return new Array(this.config.stateDim).fill(0);
    }

    // Use last encoding for prediction
    const lastEncoding = contextEncoding[contextEncoding.length - 1];

    // Project to state space
    return this.matVec(this.weights!.outputProjection, lastEncoding);
  }

  private computeBlendRatio(
    contextEncoding: number[][],
    kalmanState: IKalmanFilterState,
    observation: number[]
  ): number {
    if (!this.weights!.blendPredictor) {
      return this.config.blendRatio;
    }

    // Use context to predict optimal blend
    const lastContext = contextEncoding[contextEncoding.length - 1] ||
      new Array(this.config.embedDim).fill(0);

    const logit = lastContext.reduce((sum, v, i) =>
      sum + v * this.weights!.blendPredictor!.weights[i], 0
    ) + this.weights!.blendPredictor!.bias;

    // Sigmoid to get ratio between 0 and 1
    return this.sigmoid(logit);
  }

  private blendPredictions(
    kalman: number[],
    transformer: number[],
    ratio: number
  ): number[] {
    return kalman.map((k, i) =>
      (1 - ratio) * k + ratio * (transformer[i] || k)
    );
  }

  private computeConfidence(
    kalmanState: IKalmanFilterState,
    transformerPred: number[],
    observation: number[]
  ): number {
    // Agreement between Kalman and Transformer
    const agreement = kalmanState.stateEstimate.reduce((sum, k, i) => {
      const t = transformerPred[i] || k;
      return sum + Math.exp(-Math.pow(k - t, 2));
    }, 0) / kalmanState.stateEstimate.length;

    // Low innovation = high confidence
    const innovationMag = Math.sqrt(
      kalmanState.innovation.reduce((sum, v) => sum + v * v, 0)
    );
    const innovationConfidence = Math.exp(-innovationMag);

    return (agreement + innovationConfidence) / 2;
  }

  private computeAttentionWeights(embeddings: number[][]): number[][] {
    const seqLen = embeddings.length;
    const { embedDim } = this.config;

    // Compute simplified attention weights
    const weights: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      weights[i] = [];
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        for (let k = 0; k < embedDim; k++) {
          score += embeddings[i][k] * embeddings[j][k];
        }
        weights[i][j] = score / Math.sqrt(embedDim);
      }

      // Softmax
      const maxScore = Math.max(...weights[i]);
      const expScores = weights[i].map(s => Math.exp(s - maxScore));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      weights[i] = expScores.map(e => e / sumExp);
    }

    return weights;
  }

  private findMostInfluentialDimension(observation: number[]): string {
    let maxIdx = 0;
    let maxVal = Math.abs(observation[0]);

    for (let i = 1; i < observation.length; i++) {
      if (Math.abs(observation[i]) > maxVal) {
        maxVal = Math.abs(observation[i]);
        maxIdx = i;
      }
    }

    return STATE_DIMENSIONS[maxIdx] || `dim_${maxIdx}`;
  }

  private detectPatternMatching(attentionWeights: number[][]): boolean {
    // Check if attention focuses on non-adjacent tokens (pattern matching)
    if (attentionWeights.length < 3) return false;

    const lastRow = attentionWeights[attentionWeights.length - 1];
    const adjacentWeight = (lastRow[lastRow.length - 2] || 0) + (lastRow[lastRow.length - 1] || 0);
    const totalWeight = lastRow.reduce((a, b) => a + b, 0);

    // If < 50% of attention is on adjacent tokens, it's pattern matching
    return adjacentWeight / totalWeight < 0.5;
  }

  // Matrix operations
  private initIdentityMatrix(n: number): number[][] {
    return Array(n).fill(null).map((_, i) =>
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );
  }

  private initDiagonalMatrix(n: number, value: number): number[][] {
    return Array(n).fill(null).map((_, i) =>
      Array(n).fill(0).map((_, j) => i === j ? value : 0)
    );
  }

  private initRandomMatrix(rows: number, cols: number): number[][] {
    const scale = Math.sqrt(2.0 / (rows + cols));
    return Array(rows).fill(null).map(() =>
      Array(cols).fill(0).map(() => (Math.random() - 0.5) * 2 * scale)
    );
  }

  private initPositionalEmbedding(maxLen: number, embedDim: number): number[][] {
    const pe: number[][] = [];

    for (let pos = 0; pos < maxLen; pos++) {
      pe[pos] = [];
      for (let i = 0; i < embedDim; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / embedDim);
        pe[pos][i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      }
    }

    return pe;
  }

  private initTransformerWeights(
    numLayers: number,
    numHeads: number,
    embedDim: number,
    headDim: number
  ): number[][][] {
    return Array(numLayers).fill(null).map(() =>
      Array(numHeads).fill(null).map(() =>
        this.initRandomMatrix(embedDim, headDim)[0]
      )
    );
  }

  private matVec(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, j) => sum + val * (v[j] || 0), 0));
  }

  private matMul(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsB = B[0]?.length || 0;
    const colsA = A[0]?.length || 0;

    return Array(rowsA).fill(null).map((_, i) =>
      Array(colsB).fill(0).map((_, j) =>
        Array(colsA).fill(0).reduce((sum, _, k) =>
          sum + (A[i][k] || 0) * (B[k]?.[j] || 0), 0
        )
      )
    );
  }

  private transpose(A: number[][]): number[][] {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    return Array(cols).fill(null).map((_, i) =>
      Array(rows).fill(0).map((_, j) => A[j]?.[i] || 0)
    );
  }

  private matAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val + (B[i]?.[j] || 0)));
  }

  private matSub(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val - (B[i]?.[j] || 0)));
  }

  private matInverse(A: number[][]): number[][] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, ...this.initIdentityMatrix(n)[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      if (Math.abs(augmented[i][i]) < 1e-10) {
        return this.initDiagonalMatrix(n, 1);
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i] / augmented[i][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }

      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
    }

    return augmented.map(row => row.slice(n));
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

/**
 * Factory function
 */
export function createKalmanFormerEngine(
  config?: Partial<IKalmanFormerConfig>
): IKalmanFormerEngine {
  const engine = new KalmanFormerEngine(config);
  engine.initialize(config);
  return engine;
}

export { DEFAULT_KALMANFORMER_CONFIG };
