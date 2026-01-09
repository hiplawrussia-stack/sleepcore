/**
 * 🧠 BELIEF MODULE
 * =================
 * Bayesian Belief Update Engine - POMDP State Management
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

// Interfaces
export * from './IBeliefUpdate';

// Phase 1 Integration Adapter (2025)
// Bridges BeliefUpdateEngine with PLRNN/KalmanFormer nonlinear engines
export {
  BeliefStateAdapter,
  createBeliefStateAdapter,
  beliefStateToObservation,
  beliefStateToUncertainty,
  beliefStateToPLRNNState,
  beliefStateToKalmanFormerState,
  plrnnStateToBeliefUpdate,
  kalmanFormerStateToBeliefUpdate,
  mergeHybridPredictions,
  DIMENSION_MAPPING,
  DIMENSION_INDEX,
} from './BeliefStateAdapter';

export type { IHybridPrediction } from './BeliefStateAdapter';

// Implementation
// DEPRECATED: BeliefUpdateEngine needs refactoring for new ICognitiveState interface (Phase 6)
// BeliefUpdateEngine.ts has 7 TypeScript errors due to interface mismatch
// Tests for BeliefUpdateEngine are skipped pending interface reconciliation
// export { BeliefUpdateEngine, createBeliefUpdateEngine } from './BeliefUpdateEngine';
