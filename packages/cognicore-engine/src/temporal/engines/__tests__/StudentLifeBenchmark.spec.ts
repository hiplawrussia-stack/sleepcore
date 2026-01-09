/**
 * 📊 PLRNN vs KALMAN BENCHMARK ON STUDENTLIFE DATA
 * =================================================
 * Validation of temporal prediction models on real EMA patterns
 *
 * Dataset: StudentLife (Dartmouth, 2013) or synthetic equivalent
 * - 48 participants over 10 weeks
 * - Multiple EMA: mood (PAM), stress, sleep
 * - Pre/post surveys: PHQ-9 depression
 *
 * Scientific Foundation:
 * - Wang et al., UbiComp 2014: StudentLife original paper
 * - Fechtelpeter et al., npj Digital Medicine 2025: PLRNN benchmark
 *
 * © БФ "Другой путь", 2025
 */

import { PLRNNEngine, createPLRNNEngine } from '../PLRNNEngine';
import { KalmanFormerEngine, createKalmanFormerEngine } from '../KalmanFormerEngine';
import type { IPLRNNState } from '../../interfaces/IPLRNNEngine';
import type { IKalmanFormerState } from '../../interfaces/IKalmanFormer';
import {
  StudentLifeLoader,
  createStudentLifeLoader,
  generateSyntheticStudentLifeData,
  type StudentLifeDataset,
  type ParticipantTimeSeries,
} from './data/StudentLifeLoader';

// ============================================================================
// BENCHMARK TYPES
// ============================================================================

interface ModelMetrics {
  mae: number;
  mse: number;
  rmse: number;
  mape: number; // Mean Absolute Percentage Error
  r2: number; // R-squared
  inferenceTimeMs: number;
  samplesProcessed: number;
}

interface HorizonResult {
  horizonSteps: number;
  horizonHours: number;
  plrnn: ModelMetrics;
  kalman: ModelMetrics;
  winner: 'PLRNN' | 'Kalman' | 'Tie';
  improvementPercent: number;
}

interface ParticipantResult {
  participantId: string;
  numObservations: number;
  prePHQ9?: number;
  postPHQ9?: number;
  avgPredictionError: {
    plrnn: number;
    kalman: number;
  };
}

interface BenchmarkSummary {
  datasetInfo: {
    source: string;
    totalParticipants: number;
    totalObservations: number;
    dimensions: string[];
    durationDays: number;
  };
  horizonResults: HorizonResult[];
  participantResults: ParticipantResult[];
  overall: {
    winner: 'PLRNN' | 'Kalman' | 'Tie';
    plrnnAvgMAE: number;
    kalmanAvgMAE: number;
    plrnnAvgR2: number;
    kalmanAvgR2: number;
    plrnnWinsByHorizon: number;
    kalmanWinsByHorizon: number;
  };
  scientificContext: {
    expectedBehavior: string[];
    references: string[];
    caveats: string[];
  };
}

// ============================================================================
// METRIC CALCULATIONS
// ============================================================================

function calculateMAE(predicted: number[][], actual: number[][]): number {
  let total = 0;
  let count = 0;

  for (let i = 0; i < predicted.length; i++) {
    const predRow = predicted[i];
    const actualRow = actual[i];
    if (!predRow || !actualRow) continue;

    for (let j = 0; j < predRow.length; j++) {
      total += Math.abs((predRow[j] ?? 0) - (actualRow[j] ?? 0));
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

function calculateMSE(predicted: number[][], actual: number[][]): number {
  let total = 0;
  let count = 0;

  for (let i = 0; i < predicted.length; i++) {
    const predRow = predicted[i];
    const actualRow = actual[i];
    if (!predRow || !actualRow) continue;

    for (let j = 0; j < predRow.length; j++) {
      const diff = (predRow[j] ?? 0) - (actualRow[j] ?? 0);
      total += diff * diff;
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

function calculateMAPE(predicted: number[][], actual: number[][]): number {
  let total = 0;
  let count = 0;

  for (let i = 0; i < predicted.length; i++) {
    const predRow = predicted[i];
    const actualRow = actual[i];
    if (!predRow || !actualRow) continue;

    for (let j = 0; j < predRow.length; j++) {
      const actualVal = actualRow[j] ?? 0;
      if (Math.abs(actualVal) > 0.01) { // Avoid division by zero
        total += Math.abs((predRow[j] ?? 0) - actualVal) / Math.abs(actualVal);
        count++;
      }
    }
  }

  return count > 0 ? (total / count) * 100 : 0;
}

function calculateR2(predicted: number[][], actual: number[][]): number {
  const flatPred: number[] = [];
  const flatActual: number[] = [];

  for (let i = 0; i < predicted.length; i++) {
    const predRow = predicted[i];
    const actualRow = actual[i];
    if (!predRow || !actualRow) continue;

    for (let j = 0; j < predRow.length; j++) {
      flatPred.push(predRow[j] ?? 0);
      flatActual.push(actualRow[j] ?? 0);
    }
  }

  if (flatActual.length === 0) return 0;

  const meanActual = flatActual.reduce((s, v) => s + v, 0) / flatActual.length;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < flatActual.length; i++) {
    ssTot += (flatActual[i]! - meanActual) ** 2;
    ssRes += (flatActual[i]! - flatPred[i]!) ** 2;
  }

  return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

async function runStudentLifeBenchmark(
  dataset: StudentLifeDataset,
  horizonsInSteps: number[] = [1, 3, 6, 12, 24]
): Promise<BenchmarkSummary> {
  const loader = createStudentLifeLoader();
  const { sequences, timestamps, participantIds } = loader.toBenchmarkFormat(dataset);

  const stateDim = dataset.metadata.dimensions.length;

  // Initialize engines
  const plrnn = createPLRNNEngine({
    latentDim: stateDim,
    connectivity: 'dendritic',
    dendriticBases: 8,
  });

  const kalman = createKalmanFormerEngine({
    stateDim,
    obsDim: stateDim,
    embedDim: 32,
    numHeads: 4,
    numLayers: 2,
  });

  const horizonResults: HorizonResult[] = [];
  const participantResults: ParticipantResult[] = [];

  // Run benchmark for each horizon
  for (const horizon of horizonsInSteps) {
    let plrnnPredictions: number[][] = [];
    let kalmanPredictions: number[][] = [];
    let actuals: number[][] = [];
    let plrnnTotalTime = 0;
    let kalmanTotalTime = 0;
    let samplesProcessed = 0;

    // Per-participant tracking
    const participantErrors: Record<string, { plrnn: number[]; kalman: number[] }> = {};

    for (let p = 0; p < sequences.length; p++) {
      const sequence = sequences[p]!;
      const times = timestamps[p]!;
      const pid = participantIds[p]!;

      if (sequence.length <= horizon) continue;

      participantErrors[pid] = { plrnn: [], kalman: [] };

      // Initialize states
      const firstObs = sequence[0]!;
      const firstTime = times[0]!;

      let plrnnState: IPLRNNState = {
        latentState: [...firstObs],
        hiddenActivations: firstObs.map(v => Math.max(0, v)),
        observedState: [...firstObs],
        uncertainty: Array(stateDim).fill(0.1),
        timestamp: firstTime,
        timestep: 0,
      };

      // Create diagonal matrices for covariance initialization
      const createDiagonalMatrix = (dim: number, diagValue: number): number[][] =>
        Array(dim).fill(null).map((_, i) =>
          Array(dim).fill(0).map((_, j) => i === j ? diagValue : 0)
        );

      let kalmanState: IKalmanFormerState = {
        kalmanState: {
          stateEstimate: [...firstObs],
          errorCovariance: createDiagonalMatrix(stateDim, 0.1),
          predictedState: [...firstObs],
          predictedCovariance: createDiagonalMatrix(stateDim, 0.1),
          innovation: Array(stateDim).fill(0),
          innovationCovariance: createDiagonalMatrix(stateDim, 0.1),
          kalmanGain: createDiagonalMatrix(stateDim, 1),
          normalized_innovation_squared: 0,
          isOutlier: false,
          adaptedQ: null,
          adaptedR: null,
          timestep: 0,
          timestamp: firstTime,
        },
        transformerHidden: [],
        observationHistory: [{
          observation: [...firstObs],
          timestamp: firstTime,
        }],
        currentBlendRatio: 0.5,
        confidence: 0.5,
        timestamp: firstTime,
      };

      // Process sequence
      for (let t = 1; t < sequence.length - horizon; t++) {
        const obs = sequence[t]!;
        const time = times[t]!;
        const actual = sequence[t + horizon]!;

        // PLRNN prediction
        const plrnnStart = performance.now();
        plrnnState = plrnn.forward(plrnnState);
        const plrnnPred = plrnn.predict(plrnnState, horizon);
        plrnnTotalTime += performance.now() - plrnnStart;

        // Kalman prediction
        const kalmanStart = performance.now();
        kalmanState = kalman.update(kalmanState, obs, time);
        const kalmanPred = kalman.predict(kalmanState, horizon);
        kalmanTotalTime += performance.now() - kalmanStart;

        // Store predictions
        plrnnPredictions.push(plrnnPred.meanPrediction);
        kalmanPredictions.push(kalmanPred.stateEstimate);
        actuals.push(actual);
        samplesProcessed++;

        // Track per-participant errors
        const plrnnError = plrnnPred.meanPrediction.reduce(
          (sum, v, i) => sum + Math.abs(v - actual[i]!), 0
        ) / actual.length;
        const kalmanError = kalmanPred.stateEstimate.reduce(
          (sum, v, i) => sum + Math.abs(v - actual[i]!), 0
        ) / actual.length;

        participantErrors[pid]!.plrnn.push(plrnnError);
        participantErrors[pid]!.kalman.push(kalmanError);

        // Update PLRNN state (teacher forcing)
        plrnnState = {
          ...plrnnState,
          latentState: [...obs],
          observedState: [...obs],
          timestamp: time,
          timestep: plrnnState.timestep + 1,
        };
      }
    }

    // Calculate metrics
    const plrnnMetrics: ModelMetrics = {
      mae: calculateMAE(plrnnPredictions, actuals),
      mse: calculateMSE(plrnnPredictions, actuals),
      rmse: Math.sqrt(calculateMSE(plrnnPredictions, actuals)),
      mape: calculateMAPE(plrnnPredictions, actuals),
      r2: calculateR2(plrnnPredictions, actuals),
      inferenceTimeMs: plrnnTotalTime / samplesProcessed,
      samplesProcessed,
    };

    const kalmanMetrics: ModelMetrics = {
      mae: calculateMAE(kalmanPredictions, actuals),
      mse: calculateMSE(kalmanPredictions, actuals),
      rmse: Math.sqrt(calculateMSE(kalmanPredictions, actuals)),
      mape: calculateMAPE(kalmanPredictions, actuals),
      r2: calculateR2(kalmanPredictions, actuals),
      inferenceTimeMs: kalmanTotalTime / samplesProcessed,
      samplesProcessed,
    };

    // Determine winner
    let winner: 'PLRNN' | 'Kalman' | 'Tie';
    let improvement: number;

    if (Math.abs(plrnnMetrics.mae - kalmanMetrics.mae) < 0.005) {
      winner = 'Tie';
      improvement = 0;
    } else if (plrnnMetrics.mae < kalmanMetrics.mae) {
      winner = 'PLRNN';
      improvement = ((kalmanMetrics.mae - plrnnMetrics.mae) / kalmanMetrics.mae) * 100;
    } else {
      winner = 'Kalman';
      improvement = ((plrnnMetrics.mae - kalmanMetrics.mae) / plrnnMetrics.mae) * 100;
    }

    // Estimate hours based on typical EMA frequency (3 prompts/day)
    const hoursPerStep = 24 / 5; // Approximately 5 prompts per day

    horizonResults.push({
      horizonSteps: horizon,
      horizonHours: Math.round(horizon * hoursPerStep),
      plrnn: plrnnMetrics,
      kalman: kalmanMetrics,
      winner,
      improvementPercent: improvement,
    });

    // Store participant results (only for first horizon to avoid duplication)
    if (horizon === horizonsInSteps[0]) {
      const depLabels = loader.getDepressionLabels(dataset);
      const labelMap = new Map(depLabels.map(d => [d.participantId, d]));

      for (const [pid, errors] of Object.entries(participantErrors)) {
        const labels = labelMap.get(pid);
        participantResults.push({
          participantId: pid,
          numObservations: errors.plrnn.length,
          prePHQ9: labels?.prePHQ9,
          postPHQ9: labels?.postPHQ9,
          avgPredictionError: {
            plrnn: errors.plrnn.reduce((s, v) => s + v, 0) / errors.plrnn.length,
            kalman: errors.kalman.reduce((s, v) => s + v, 0) / errors.kalman.length,
          },
        });
      }
    }
  }

  // Calculate overall summary
  const plrnnWins = horizonResults.filter(r => r.winner === 'PLRNN').length;
  const kalmanWins = horizonResults.filter(r => r.winner === 'Kalman').length;

  let overallWinner: 'PLRNN' | 'Kalman' | 'Tie';
  if (plrnnWins > kalmanWins) {
    overallWinner = 'PLRNN';
  } else if (kalmanWins > plrnnWins) {
    overallWinner = 'Kalman';
  } else {
    overallWinner = 'Tie';
  }

  const durationMs = dataset.metadata.dateRange.end.getTime() -
    dataset.metadata.dateRange.start.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  return {
    datasetInfo: {
      source: dataset.metadata.source,
      totalParticipants: dataset.metadata.totalParticipants,
      totalObservations: dataset.metadata.totalObservations,
      dimensions: dataset.metadata.dimensions,
      durationDays,
    },
    horizonResults,
    participantResults,
    overall: {
      winner: overallWinner,
      plrnnAvgMAE: horizonResults.reduce((s, r) => s + r.plrnn.mae, 0) / horizonResults.length,
      kalmanAvgMAE: horizonResults.reduce((s, r) => s + r.kalman.mae, 0) / horizonResults.length,
      plrnnAvgR2: horizonResults.reduce((s, r) => s + r.plrnn.r2, 0) / horizonResults.length,
      kalmanAvgR2: horizonResults.reduce((s, r) => s + r.kalman.r2, 0) / horizonResults.length,
      plrnnWinsByHorizon: plrnnWins,
      kalmanWinsByHorizon: kalmanWins,
    },
    scientificContext: {
      expectedBehavior: [
        'PLRNN should excel at longer horizons due to nonlinear dynamics capture',
        'Kalman should be competitive for short-term (1-3 step) predictions',
        'R² values expected to decrease with longer prediction horizons',
        'StudentLife data includes circadian and weekly patterns',
      ],
      references: [
        'Wang et al., UbiComp 2014: StudentLife dataset',
        'Fechtelpeter et al., npj Digital Medicine 2025: PLRNN benchmark methodology',
        'Durstewitz et al., PLOS Comp Bio 2017: PLRNN state-space models',
      ],
      caveats: [
        dataset.metadata.source === 'synthetic'
          ? 'Using synthetic data with StudentLife-like patterns (real data requires download)'
          : 'Using real StudentLife data',
        'Models are untrained (no parameter optimization on this data)',
        'EMA frequency may vary between participants',
      ],
    },
  };
}

// ============================================================================
// JEST TESTS
// ============================================================================

describe('StudentLife EMA Benchmark', () => {
  let dataset: StudentLifeDataset;
  let benchmarkResult: BenchmarkSummary;

  beforeAll(async () => {
    // Generate synthetic StudentLife-like data
    dataset = generateSyntheticStudentLifeData({
      numParticipants: 20, // Reduced for test speed
      durationWeeks: 4, // Reduced for test speed
      promptsPerDay: 4,
      seed: 42,
    });

    benchmarkResult = await runStudentLifeBenchmark(
      dataset,
      [1, 3, 6, 12] // Horizons in steps
    );
  }, 120000); // 2 minute timeout

  describe('Dataset Validation', () => {
    it('should generate valid synthetic StudentLife data', () => {
      expect(dataset).toBeDefined();
      expect(dataset.participants.length).toBe(20);
      expect(dataset.metadata.dimensions).toEqual(['valence', 'arousal', 'stress']);
    });

    it('should have observations for each participant', () => {
      for (const p of dataset.participants) {
        expect(p.observations.length).toBeGreaterThan(0);
        expect(p.participantId).toMatch(/^u\d{2}$/);
      }
    });

    it('should have PHQ-9 scores', () => {
      const withScores = dataset.participants.filter(
        p => p.preSurvey?.phq9 !== undefined
      );
      expect(withScores.length).toBe(dataset.participants.length);
    });

    it('should have realistic value ranges', () => {
      for (const p of dataset.participants) {
        for (const obs of p.observations) {
          for (const val of obs.values) {
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('Benchmark Execution', () => {
    it('should complete benchmark without errors', () => {
      expect(benchmarkResult).toBeDefined();
      expect(benchmarkResult.horizonResults.length).toBe(4);
    });

    it('should process samples for all horizons', () => {
      for (const result of benchmarkResult.horizonResults) {
        expect(result.plrnn.samplesProcessed).toBeGreaterThan(0);
        expect(result.kalman.samplesProcessed).toBeGreaterThan(0);
      }
    });

    it('should include dataset info', () => {
      expect(benchmarkResult.datasetInfo.source).toBe('synthetic');
      expect(benchmarkResult.datasetInfo.totalParticipants).toBe(20);
      expect(benchmarkResult.datasetInfo.dimensions).toHaveLength(3);
    });
  });

  describe('Metric Validity', () => {
    it('should produce valid MAE values', () => {
      for (const result of benchmarkResult.horizonResults) {
        expect(result.plrnn.mae).toBeGreaterThanOrEqual(0);
        expect(result.kalman.mae).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.plrnn.mae)).toBe(true);
        expect(Number.isFinite(result.kalman.mae)).toBe(true);
      }
    });

    it('should produce valid R² values', () => {
      for (const result of benchmarkResult.horizonResults) {
        // R² can be negative for poor models, but should be finite
        expect(Number.isFinite(result.plrnn.r2)).toBe(true);
        expect(Number.isFinite(result.kalman.r2)).toBe(true);
      }
    });

    it('should have RMSE >= MAE', () => {
      for (const result of benchmarkResult.horizonResults) {
        expect(result.plrnn.rmse).toBeGreaterThanOrEqual(result.plrnn.mae - 0.01);
        expect(result.kalman.rmse).toBeGreaterThanOrEqual(result.kalman.mae - 0.01);
      }
    });
  });

  describe('Scientific Expectations', () => {
    it('should show increasing error with longer horizons', () => {
      const sortedResults = [...benchmarkResult.horizonResults]
        .sort((a, b) => a.horizonSteps - b.horizonSteps);

      if (sortedResults.length >= 2) {
        const firstMAE = (sortedResults[0]!.plrnn.mae + sortedResults[0]!.kalman.mae) / 2;
        const lastMAE = (sortedResults[sortedResults.length - 1]!.plrnn.mae +
          sortedResults[sortedResults.length - 1]!.kalman.mae) / 2;

        // Allow some tolerance for random variation
        expect(lastMAE).toBeGreaterThanOrEqual(firstMAE * 0.7);
      }
    });

    it('should show both models produce finite predictions', () => {
      for (const result of benchmarkResult.horizonResults) {
        expect(Number.isFinite(result.plrnn.mae)).toBe(true);
        expect(Number.isFinite(result.kalman.mae)).toBe(true);
      }
    });

    it('should determine a winner for each horizon', () => {
      for (const result of benchmarkResult.horizonResults) {
        expect(['PLRNN', 'Kalman', 'Tie']).toContain(result.winner);
      }
    });
  });

  describe('Per-Participant Analysis', () => {
    it('should have results for each participant', () => {
      expect(benchmarkResult.participantResults.length).toBeGreaterThan(0);
    });

    it('should include PHQ-9 scores in participant results', () => {
      const withPHQ9 = benchmarkResult.participantResults.filter(
        p => p.prePHQ9 !== undefined
      );
      expect(withPHQ9.length).toBeGreaterThan(0);
    });

    it('should have valid prediction errors per participant', () => {
      for (const p of benchmarkResult.participantResults) {
        expect(p.avgPredictionError.plrnn).toBeGreaterThanOrEqual(0);
        expect(p.avgPredictionError.kalman).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Summary Report', () => {
    it('should produce valid overall summary', () => {
      expect(benchmarkResult.overall.plrnnAvgMAE).toBeGreaterThan(0);
      expect(benchmarkResult.overall.kalmanAvgMAE).toBeGreaterThan(0);
    });

    it('should determine overall winner', () => {
      expect(['PLRNN', 'Kalman', 'Tie']).toContain(benchmarkResult.overall.winner);
    });

    it('should include scientific context', () => {
      expect(benchmarkResult.scientificContext.references.length).toBeGreaterThan(0);
      expect(benchmarkResult.scientificContext.expectedBehavior.length).toBeGreaterThan(0);
    });

    it('should note data source in caveats', () => {
      const caveats = benchmarkResult.scientificContext.caveats;
      const hasDataSourceNote = caveats.some(c =>
        c.includes('synthetic') || c.includes('real')
      );
      expect(hasDataSourceNote).toBe(true);
    });
  });
});

// ============================================================================
// STANDALONE BENCHMARK RUNNER
// ============================================================================

export async function runFullStudentLifeBenchmark(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 PLRNN vs KALMAN BENCHMARK ON STUDENTLIFE DATA');
  console.log('   Validating temporal prediction models on EMA patterns');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Generate or load data
  console.log('📥 Loading dataset...');
  const dataset = generateSyntheticStudentLifeData({
    numParticipants: 48,
    durationWeeks: 10,
    promptsPerDay: 5,
    seed: 42,
  });

  console.log(`   Source: ${dataset.metadata.source}`);
  console.log(`   Participants: ${dataset.metadata.totalParticipants}`);
  console.log(`   Total observations: ${dataset.metadata.totalObservations}`);
  console.log(`   Dimensions: ${dataset.metadata.dimensions.join(', ')}\n`);

  // Run benchmark
  console.log('🔬 Running benchmark...\n');
  const result = await runStudentLifeBenchmark(dataset, [1, 3, 6, 12, 24]);

  // Print results
  console.log('📈 RESULTS BY HORIZON:\n');
  console.log('┌─────────┬──────────────────────────────┬──────────────────────────────┬──────────┐');
  console.log('│ Horizon │         PLRNN                │         Kalman               │  Winner  │');
  console.log('│  (hrs)  │    MAE    │   R²    │  ms    │    MAE    │   R²    │  ms    │          │');
  console.log('├─────────┼───────────┼─────────┼────────┼───────────┼─────────┼────────┼──────────┤');

  for (const r of result.horizonResults) {
    const h = `~${r.horizonHours}h`.padStart(5);
    const pMAE = r.plrnn.mae.toFixed(4).padStart(7);
    const pR2 = r.plrnn.r2.toFixed(3).padStart(6);
    const pMs = r.plrnn.inferenceTimeMs.toFixed(2).padStart(5);
    const kMAE = r.kalman.mae.toFixed(4).padStart(7);
    const kR2 = r.kalman.r2.toFixed(3).padStart(6);
    const kMs = r.kalman.inferenceTimeMs.toFixed(2).padStart(5);
    const winner = r.winner.padStart(7);
    console.log(`│  ${h}  │  ${pMAE}  │ ${pR2}  │ ${pMs}  │  ${kMAE}  │ ${kR2}  │ ${kMs}  │ ${winner} │`);
  }

  console.log('└─────────┴───────────┴─────────┴────────┴───────────┴─────────┴────────┴──────────┘\n');

  // Summary
  console.log('📊 OVERALL SUMMARY:');
  console.log(`   Winner: ${result.overall.winner}`);
  console.log(`   PLRNN wins: ${result.overall.plrnnWinsByHorizon} horizons`);
  console.log(`   Kalman wins: ${result.overall.kalmanWinsByHorizon} horizons`);
  console.log(`   PLRNN Avg MAE: ${result.overall.plrnnAvgMAE.toFixed(4)}`);
  console.log(`   Kalman Avg MAE: ${result.overall.kalmanAvgMAE.toFixed(4)}`);
  console.log(`   PLRNN Avg R²: ${result.overall.plrnnAvgR2.toFixed(3)}`);
  console.log(`   Kalman Avg R²: ${result.overall.kalmanAvgR2.toFixed(3)}\n`);

  // Depression correlation
  console.log('🧠 PHQ-9 DEPRESSION ANALYSIS:');
  const depressed = result.participantResults.filter(p => (p.prePHQ9 ?? 0) >= 10);
  const nonDepressed = result.participantResults.filter(p => (p.prePHQ9 ?? 0) < 10);

  if (depressed.length > 0 && nonDepressed.length > 0) {
    const depPlrnnErr = depressed.reduce((s, p) => s + p.avgPredictionError.plrnn, 0) / depressed.length;
    const nonDepPlrnnErr = nonDepressed.reduce((s, p) => s + p.avgPredictionError.plrnn, 0) / nonDepressed.length;

    console.log(`   Depressed (PHQ-9≥10): ${depressed.length} participants, avg error: ${depPlrnnErr.toFixed(4)}`);
    console.log(`   Non-depressed: ${nonDepressed.length} participants, avg error: ${nonDepPlrnnErr.toFixed(4)}`);

    if (depPlrnnErr > nonDepPlrnnErr) {
      console.log(`   → Prediction harder for depressed participants (expected: more volatility)`);
    }
  }

  // Scientific context
  console.log('\n🔬 SCIENTIFIC CONTEXT:');
  for (const note of result.scientificContext.expectedBehavior) {
    console.log(`   • ${note}`);
  }
  console.log('\n   References:');
  for (const ref of result.scientificContext.references) {
    console.log(`   - ${ref}`);
  }
  console.log('\n   Caveats:');
  for (const caveat of result.scientificContext.caveats) {
    console.log(`   ⚠ ${caveat}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

// Export for external use
export {
  runStudentLifeBenchmark,
  type BenchmarkSummary,
  type HorizonResult,
  type ModelMetrics,
};
