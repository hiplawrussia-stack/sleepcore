/**
 * CBT-I Services
 * ===============
 * High-level services for CBT-I therapy delivery.
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i/services
 */

// Adaptive Sleep Restriction Service
export {
  AdaptiveSleepRestrictionService,
  createAdaptiveSleepRestrictionService,
  adaptiveSleepRestrictionService,
  DEFAULT_ADAPTIVE_CONFIG,
} from './AdaptiveSleepRestrictionService';

export type {
  Chronotype,
  SleepNeedCategory,
  ISleepNeedQuestionnaire,
  ISleepProfile,
  IJITAIDecisionPoint,
  IAdaptiveTIBAdjustment,
  IAdaptiveServiceConfig,
} from './AdaptiveSleepRestrictionService';
