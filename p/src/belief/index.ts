/**
 * 🧠 BELIEF MODULE
 * =================
 * Bayesian Belief Update Engine - POMDP State Management
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

// Interfaces
export * from './IBeliefUpdate';

// Implementation
// DEPRECATED: BeliefUpdateEngine needs refactoring for new ICognitiveState interface (Phase 6)
// BeliefUpdateEngine.ts has 7 TypeScript errors due to interface mismatch
// Tests for BeliefUpdateEngine are skipped pending interface reconciliation
// export { BeliefUpdateEngine, createBeliefUpdateEngine } from './BeliefUpdateEngine';
