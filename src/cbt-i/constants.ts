/**
 * CBT-I Clinical Constants
 * ========================
 *
 * Centralized clinical thresholds and parameters for CBT-I therapy.
 * All values are based on validated clinical research.
 *
 * IMPORTANT: Changes to these values require clinical review.
 * Per CLAUDE.md §2.1, TIB minimum (5 hours) is a RED LINE.
 *
 * Sources:
 * - Spielman et al. (1987): Sleep Restriction Therapy
 * - AASM 2021 (Edinger et al.): CBT-I Guidelines
 * - European Insomnia Guideline 2023 (Riemann et al.)
 * - Morin et al. (2011): ISI Validation
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i/constants
 */

// =============================================================================
// SLEEP RESTRICTION THERAPY (SRT) CONSTANTS
// =============================================================================

/**
 * Sleep Efficiency thresholds for TIB adjustment
 * Based on Spielman 1987, AASM 2021
 */
export const SE_THRESHOLDS = {
  /** SE ≥ 90% → Increase TIB by adjustment step */
  INCREASE: 90,

  /** SE 85-89% → Maintain current TIB */
  MAINTAIN_MIN: 85,
  MAINTAIN_MAX: 89.9,

  /** SE < 85% → Decrease TIB (or maintain if at minimum) */
  DECREASE: 85,

  /** SE ≥ 80% → Close to target (for UI feedback) */
  CLOSE_TO_TARGET: 80,
} as const;

/**
 * Time In Bed (TIB) limits in minutes
 * Based on clinical safety guidelines
 */
export const TIB_LIMITS = {
  /**
   * Minimum TIB = 5 hours (300 minutes)
   * RED LINE per CLAUDE.md §2.1 - NEVER go below this value
   */
  MINIMUM: 300,

  /** Maximum TIB = 9 hours (540 minutes) */
  MAXIMUM: 540,
} as const;

/**
 * TIB adjustment parameters
 */
export const TIB_ADJUSTMENT = {
  /** Weekly TIB adjustment step in minutes */
  STEP: 15,

  /** Wake time tolerance for adherence calculation in minutes */
  WAKE_TIME_TOLERANCE: 15,
} as const;

/**
 * Evaluation period in days
 */
export const EVALUATION_PERIOD = 7;

// =============================================================================
// ADHERENCE THRESHOLDS
// =============================================================================

/**
 * Adherence thresholds for therapy compliance
 * Based on CBT-I outcome research
 */
export const ADHERENCE_THRESHOLDS = {
  /** Excellent adherence: ≥ 80% compliance */
  EXCELLENT: 80,

  /** Good adherence: ≥ 60% compliance */
  GOOD: 60,

  /** Poor adherence: < 60% compliance */
  POOR: 60,
} as const;

// =============================================================================
// ISI (INSOMNIA SEVERITY INDEX) THRESHOLDS
// =============================================================================

/**
 * ISI severity cutoffs
 * Based on Morin et al. (2011), Bastien et al. (2001)
 */
export const ISI_THRESHOLDS = {
  /** No clinically significant insomnia: 0-7 */
  REMISSION: 7,

  /** Subthreshold insomnia: 8-14 */
  SUBTHRESHOLD: 14,

  /** Moderate clinical insomnia: 15-21 */
  MODERATE: 21,

  /** Severe clinical insomnia: 22-28 → Requires specialist referral */
  SEVERE: 22,

  /** Minimum clinically important difference */
  MCID: 6,

  /** Response threshold (≥ 8 point drop) */
  RESPONSE: 8,
} as const;

// =============================================================================
// CLINICAL TARGETS
// =============================================================================

/**
 * Clinical outcome targets
 * Based on European Insomnia Guideline 2023
 */
export const CLINICAL_TARGETS = {
  /** Target Sleep Efficiency */
  SLEEP_EFFICIENCY: 85,

  /** Excellent Sleep Efficiency */
  SLEEP_EFFICIENCY_EXCELLENT: 90,

  /** Target Sleep Onset Latency in minutes */
  SOL: 20,

  /** Target Wake After Sleep Onset in minutes */
  WASO: 30,

  /** Target ISI for remission */
  ISI_REMISSION: 7,
} as const;

// =============================================================================
// SLEEP RESTRICTION RULES INTERFACE
// =============================================================================

/**
 * Sleep Restriction Rules configuration
 * For backwards compatibility with existing engine
 */
export interface ISleepRestrictionRulesConfig {
  increaseThreshold: number;
  maintainRange: { min: number; max: number };
  decreaseThreshold: number;
  increaseAmount: number;
  decreaseAmount: number;
}

/**
 * Default Sleep Restriction Rules
 * Based on clinical guidelines
 */
export const DEFAULT_SRT_RULES: ISleepRestrictionRulesConfig = {
  increaseThreshold: SE_THRESHOLDS.INCREASE,
  maintainRange: {
    min: SE_THRESHOLDS.MAINTAIN_MIN,
    max: SE_THRESHOLDS.MAINTAIN_MAX,
  },
  decreaseThreshold: SE_THRESHOLDS.DECREASE,
  increaseAmount: TIB_ADJUSTMENT.STEP,
  decreaseAmount: TIB_ADJUSTMENT.STEP,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get SE status based on threshold
 */
export function getSEStatus(se: number): 'increase' | 'maintain' | 'decrease' {
  if (se >= SE_THRESHOLDS.INCREASE) return 'increase';
  if (se >= SE_THRESHOLDS.MAINTAIN_MIN) return 'maintain';
  return 'decrease';
}

/**
 * Get ISI severity label
 */
export function getISISeverityLabel(isi: number): string {
  if (isi <= ISI_THRESHOLDS.REMISSION) return 'норма';
  if (isi <= ISI_THRESHOLDS.SUBTHRESHOLD) return 'субклиническая';
  if (isi <= ISI_THRESHOLDS.MODERATE) return 'умеренная';
  return 'тяжёлая';
}

/**
 * Check if ISI indicates remission
 */
export function isRemission(isi: number): boolean {
  return isi <= ISI_THRESHOLDS.REMISSION;
}

/**
 * Check if ISI change indicates response
 */
export function isResponse(isiChange: number): boolean {
  return isiChange >= ISI_THRESHOLDS.RESPONSE;
}

/**
 * Check if ISI requires specialist referral
 */
export function requiresSpecialistReferral(isi: number): boolean {
  return isi >= ISI_THRESHOLDS.SEVERE;
}
