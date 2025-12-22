/**
 * Cognitive Memory Consolidation Module
 * ======================================
 *
 * Smart Memory Window system for leveraging sleep-dependent
 * memory consolidation to reinforce CBT-I behavior changes.
 *
 * Features:
 * - Pre-sleep mental rehearsal of sleep rules
 * - Morning recall quiz (testing effect)
 * - Adaptive spaced repetition
 * - Progress analytics
 *
 * Scientific Foundation:
 * - Neuron 2025: cAMP oscillations during NREM optimize plasticity
 * - Science Advances: Rehearsal + sleep = long-term memory
 * - Nature npj: Targeted Memory Reactivation research
 * - Roediger & Karpicke: Testing effect enhances retention
 *
 * @packageDocumentation
 * @module @sleepcore/cognitive
 */

// Interfaces
export type {
  SleepRuleCategory,
  ISleepRule,
  IRuleConsolidationState,
  IRehearsalSession,
  IRecallQuestion,
  IRecallAnswer,
  IRecallSession,
  IConsolidationAnalytics,
  IAdaptiveLearningConfig,
  IRehearsalEngine,
  IRecallEngine,
  IConsolidationAnalyticsEngine,
  ISmartMemoryWindowEngine,
} from './interfaces/ICognitiveConsolidation';

export { DEFAULT_ADAPTIVE_CONFIG } from './interfaces/ICognitiveConsolidation';

// Data
export {
  SLEEP_RULES,
  getRuleById,
  getRulesByCategory,
  getRelatedRules,
  getRulesByDifficulty,
  getBeginnerRules,
  getCategoryStats,
} from './data/SleepRules';

// Engines
export {
  RehearsalEngine,
  RecallEngine,
  ConsolidationAnalyticsEngine,
  SmartMemoryWindowEngine,
  createSmartMemoryWindowEngine,
} from './engines/SmartMemoryWindowEngine';
