/**
 * Hyperarousal-Aware Sleep Restriction Therapy
 * =============================================
 * Enhanced SRT that integrates EEG hyperarousal research findings.
 *
 * Scientific Foundation (2024-2026):
 * - Sforza, Morin, Dang-Vu et al. (2026): Delta/Beta ratio as hyperarousal biomarker
 * - Riemann, Dressle, Spiegelhalder (2025): 24-hour hyperarousal model
 * - Harvey et al. (2015): CBT-iBD modifications for bipolar (TIB ≥ 6.5h)
 * - Vgontzas et al. (2013): ISSD vs INSD phenotypes
 *
 * Key Enhancements:
 * 1. Contraindication screening (bipolar, epilepsy, driving risk)
 * 2. ISSD/INSD phenotype-specific adjustments
 * 3. PSAS-based arousal assessment integration
 * 4. HRV-derived hyperarousal estimation (wearable proxy)
 * 5. Conservative mode for high-arousal patients
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i/engines
 */

import type { ISleepMetrics } from '../../sleep/interfaces/ISleepState';
import type { ISleepRestrictionPrescription, ISleepRestrictionRules } from '../interfaces/ICBTIComponents';
import { SleepRestrictionEngine } from './SleepRestrictionEngine';
import { TIB_LIMITS, SE_THRESHOLDS, TIB_ADJUSTMENT } from '../constants';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Insomnia phenotype based on objective sleep duration
 * Per Vgontzas et al. (2013), Fernandez-Mendoza et al. (2012)
 */
export type InsomniaPhenotype = 'ISSD' | 'INSD' | 'unknown';

/**
 * SRT Contraindication category
 * Based on AASM guidelines and Harvey et al. (2015) CBT-iBD
 */
export type SRTContraindication =
  | 'bipolar_disorder'
  | 'epilepsy'
  | 'high_fall_risk'
  | 'parasomnia'
  | 'safety_critical_occupation'
  | 'untreated_sleep_apnea'
  | 'severe_medical_condition';

/**
 * Hyperarousal level derived from assessments
 */
export type HyperarousalLevel = 'low' | 'moderate' | 'high' | 'very_high';

/**
 * SRT safety screening result
 */
export interface ISRTScreeningResult {
  /** Whether SRT is safe to proceed */
  readonly eligible: boolean;
  /** Identified contraindications */
  readonly contraindications: SRTContraindication[];
  /** Required modifications to standard protocol */
  readonly modifications: ISRTModification[];
  /** Warning messages for user/clinician */
  readonly warnings: string[];
  /** Recommended minimum TIB (may be > 5h for certain conditions) */
  readonly minimumTIB: number;
  /** Confidence in eligibility assessment */
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Modification to SRT protocol
 */
export interface ISRTModification {
  /** Modification type */
  readonly type: 'minimum_tib' | 'adjustment_step' | 'evaluation_period' | 'add_component';
  /** New value */
  readonly value: number | string;
  /** Rationale */
  readonly rationale: string;
  /** Scientific source */
  readonly source: string;
}

/**
 * Hyperarousal profile for SRT personalization
 */
export interface IHyperarousalProfile {
  /** Estimated hyperarousal level */
  readonly level: HyperarousalLevel;
  /** Cognitive arousal score (PSAS-based, 8-40) */
  readonly cognitiveScore: number;
  /** Somatic arousal score (PSAS-based, 8-40) */
  readonly somaticScore: number;
  /** Dominant arousal type */
  readonly dominantType: 'cognitive' | 'somatic' | 'balanced';
  /** HRV-derived estimate (if available from wearables) */
  readonly hrvEstimate?: {
    /** RMSSD (ms) - lower indicates higher sympathetic arousal */
    readonly rmssd: number;
    /** Normalized arousal score (0-1) */
    readonly normalizedArousal: number;
  };
  /** Insomnia phenotype */
  readonly phenotype: InsomniaPhenotype;
  /** Average TST from baseline (minutes) */
  readonly averageTST: number;
  /** Recommendation for SRT approach */
  readonly recommendation: 'standard' | 'conservative' | 'contraindicated';
}

/**
 * Extended SRT prescription with hyperarousal context
 */
export interface IHyperarousalAwarePrescription extends ISleepRestrictionPrescription {
  /** Hyperarousal profile used for personalization */
  readonly hyperarousalProfile?: IHyperarousalProfile;
  /** Applied modifications */
  readonly appliedModifications: ISRTModification[];
  /** Recommended complementary therapies */
  readonly complementaryTherapies: string[];
  /** Safety warnings */
  readonly safetyWarnings: string[];
}

/**
 * Configuration for Hyperarousal-Aware SRT
 */
export interface IHyperarousalSRTConfig {
  /** Enable hyperarousal integration */
  readonly enabled: boolean;
  /** ISSD threshold (TST < this = short sleep phenotype) */
  readonly issdThresholdMinutes: number;
  /** PSAS cognitive cutoff for high arousal */
  readonly psasCognitiveCutoff: number;
  /** PSAS somatic cutoff for high arousal */
  readonly psasSomaticCutoff: number;
  /** HRV RMSSD threshold for high arousal (ms) */
  readonly hrvRmssdThreshold: number;
  /** Minimum TIB for bipolar patients (Harvey CBT-iBD) */
  readonly bipolarMinimumTIB: number;
  /** Conservative adjustment step (vs standard 15 min) */
  readonly conservativeAdjustmentStep: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_HYPERAROUSAL_SRT_CONFIG: IHyperarousalSRTConfig = {
  enabled: true,
  issdThresholdMinutes: 360, // 6 hours per Vgontzas et al.
  psasCognitiveCutoff: 20,   // Nicassio et al. (1985)
  psasSomaticCutoff: 14,     // Nicassio et al. (1985)
  hrvRmssdThreshold: 25,     // Below this = elevated sympathetic tone
  bipolarMinimumTIB: 390,    // 6.5 hours per Harvey CBT-iBD
  conservativeAdjustmentStep: 10, // 10 min instead of 15 min
};

/**
 * Contraindication messages (bilingual)
 */
const CONTRAINDICATION_MESSAGES: Record<SRTContraindication, { en: string; ru: string }> = {
  bipolar_disorder: {
    en: 'Bipolar disorder: Sleep deprivation may trigger manic episode. Using modified CBT-iBD protocol (TIB ≥ 6.5h).',
    ru: 'Биполярное расстройство: депривация сна может спровоцировать маниакальный эпизод. Используем модифицированный протокол CBT-iBD (TIB ≥ 6.5ч).',
  },
  epilepsy: {
    en: 'Epilepsy: Sleep restriction increases seizure risk via elevated sleep drive. SRT is contraindicated.',
    ru: 'Эпилепсия: ограничение сна повышает риск судорог. SRT противопоказана.',
  },
  high_fall_risk: {
    en: 'High fall risk: Daytime sleepiness from SRT may increase fall risk. Consider modified protocol.',
    ru: 'Высокий риск падений: дневная сонливость от SRT может увеличить риск. Рассмотрите модифицированный протокол.',
  },
  parasomnia: {
    en: 'Parasomnia: Sleep restriction may exacerbate sleepwalking, night terrors. SRT is contraindicated.',
    ru: 'Парасомния: ограничение сна может усилить лунатизм, ночные ужасы. SRT противопоказана.',
  },
  safety_critical_occupation: {
    en: 'Safety-critical occupation: Transient sleepiness poses risk. Enhanced monitoring required.',
    ru: 'Работа с повышенной опасностью: транзиторная сонливость создаёт риск. Требуется усиленный мониторинг.',
  },
  untreated_sleep_apnea: {
    en: 'Untreated sleep apnea: Address apnea before SRT. PAP therapy recommended first.',
    ru: 'Нелеченное апноэ сна: сначала лечение апноэ. Рекомендуется CPAP-терапия.',
  },
  severe_medical_condition: {
    en: 'Severe medical condition: SRT requires clinical supervision for this condition.',
    ru: 'Тяжёлое соматическое заболевание: SRT требует клинического наблюдения.',
  },
};

// ============================================================================
// HYPERAROUSAL-AWARE SRT ENGINE
// ============================================================================

/**
 * Hyperarousal-Aware Sleep Restriction Therapy Engine
 *
 * Extends standard SRT with:
 * - Contraindication screening
 * - ISSD/INSD phenotype detection
 * - PSAS-based arousal assessment
 * - HRV proxy for hyperarousal
 * - Conservative mode for high-arousal patients
 */
export class HyperarousalAwareSRT {
  private readonly config: IHyperarousalSRTConfig;
  private readonly baseEngine: SleepRestrictionEngine;

  constructor(config: Partial<IHyperarousalSRTConfig> = {}) {
    this.config = { ...DEFAULT_HYPERAROUSAL_SRT_CONFIG, ...config };
    this.baseEngine = new SleepRestrictionEngine();
  }

  // ==========================================================================
  // SAFETY SCREENING
  // ==========================================================================

  /**
   * Screen patient for SRT eligibility
   *
   * Must be called before initiating SRT.
   * Per AASM guidelines and research evidence.
   *
   * @param conditions - Self-reported conditions
   * @param occupation - Occupation type
   * @param medications - Current medications
   */
  screenForEligibility(
    conditions: {
      hasBipolar?: boolean;
      hasEpilepsy?: boolean;
      hasParasomnia?: boolean;
      hasSleepApnea?: boolean;
      isSleepApneaTreated?: boolean;
      hasFallRisk?: boolean;
      hasSevereCondition?: boolean;
    },
    occupation?: {
      isSafetyCritical: boolean;
      involvesDriving: boolean;
      involvesHeavyMachinery: boolean;
    }
  ): ISRTScreeningResult {
    const contraindications: SRTContraindication[] = [];
    const modifications: ISRTModification[] = [];
    const warnings: string[] = [];
    let minimumTIB: number = TIB_LIMITS.MINIMUM; // 300 min (5h)

    // Absolute contraindications
    if (conditions.hasEpilepsy) {
      contraindications.push('epilepsy');
    }

    if (conditions.hasParasomnia) {
      contraindications.push('parasomnia');
    }

    if (conditions.hasSleepApnea && !conditions.isSleepApneaTreated) {
      contraindications.push('untreated_sleep_apnea');
    }

    // Relative contraindications (require modification)
    if (conditions.hasBipolar) {
      contraindications.push('bipolar_disorder');
      minimumTIB = this.config.bipolarMinimumTIB; // 6.5 hours
      modifications.push({
        type: 'minimum_tib',
        value: this.config.bipolarMinimumTIB,
        rationale: 'Prevents mania trigger from sleep deprivation',
        source: 'Harvey et al. (2015) CBT-iBD',
      });
      warnings.push(CONTRAINDICATION_MESSAGES.bipolar_disorder.en);
    }

    if (conditions.hasFallRisk) {
      contraindications.push('high_fall_risk');
      modifications.push({
        type: 'adjustment_step',
        value: this.config.conservativeAdjustmentStep,
        rationale: 'Reduces daytime sleepiness impact',
        source: 'Clinical guidelines',
      });
      warnings.push(CONTRAINDICATION_MESSAGES.high_fall_risk.en);
    }

    if (occupation?.isSafetyCritical || occupation?.involvesDriving || occupation?.involvesHeavyMachinery) {
      contraindications.push('safety_critical_occupation');
      warnings.push(CONTRAINDICATION_MESSAGES.safety_critical_occupation.en);
      modifications.push({
        type: 'evaluation_period',
        value: 5, // More frequent check-ins
        rationale: 'Enhanced monitoring for safety-critical roles',
        source: 'Clinical practice',
      });
    }

    if (conditions.hasSevereCondition) {
      contraindications.push('severe_medical_condition');
      warnings.push(CONTRAINDICATION_MESSAGES.severe_medical_condition.en);
    }

    // Determine eligibility
    const absoluteContraindications = ['epilepsy', 'parasomnia', 'untreated_sleep_apnea'];
    const hasAbsoluteContraindication = contraindications.some(c =>
      absoluteContraindications.includes(c)
    );

    const eligible = !hasAbsoluteContraindication;

    // Confidence based on completeness of screening
    const screenedItems = Object.values(conditions).filter(v => v !== undefined).length;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (screenedItems >= 5) confidence = 'high';
    else if (screenedItems >= 3) confidence = 'medium';

    return {
      eligible,
      contraindications,
      modifications,
      warnings,
      minimumTIB,
      confidence,
    };
  }

  // ==========================================================================
  // HYPERAROUSAL PROFILING
  // ==========================================================================

  /**
   * Create hyperarousal profile from available data
   *
   * @param psasScores - PSAS cognitive and somatic scores (optional)
   * @param sleepHistory - Recent sleep metrics
   * @param hrvData - HRV data from wearables (optional)
   */
  createHyperarousalProfile(
    psasScores?: { cognitive: number; somatic: number },
    sleepHistory?: ISleepMetrics[],
    hrvData?: { rmssd: number; avgHR: number }
  ): IHyperarousalProfile {
    // Calculate average TST
    const avgTST = sleepHistory && sleepHistory.length > 0
      ? sleepHistory.reduce((sum, m) => sum + m.totalSleepTime, 0) / sleepHistory.length
      : 0;

    // Determine phenotype
    let phenotype: InsomniaPhenotype = 'unknown';
    if (avgTST > 0) {
      phenotype = avgTST < this.config.issdThresholdMinutes ? 'ISSD' : 'INSD';
    }

    // Calculate hyperarousal scores
    let cognitiveScore = 16; // Midpoint default
    let somaticScore = 16;

    if (psasScores) {
      cognitiveScore = psasScores.cognitive;
      somaticScore = psasScores.somatic;
    } else if (sleepHistory && sleepHistory.length >= 5) {
      // Estimate from sleep metrics if PSAS not available
      // Long SOL often correlates with cognitive arousal
      const avgSOL = sleepHistory.reduce((sum, m) => sum + m.sleepOnsetLatency, 0) / sleepHistory.length;
      const avgWASO = sleepHistory.reduce((sum, m) => sum + m.wakeAfterSleepOnset, 0) / sleepHistory.length;

      // Estimate cognitive score from SOL (higher SOL = more racing thoughts)
      cognitiveScore = Math.min(40, 8 + Math.round(avgSOL / 60 * 16));

      // Estimate somatic from WASO (multiple awakenings = physical discomfort)
      somaticScore = Math.min(40, 8 + Math.round(avgWASO / 60 * 12));
    }

    // Determine dominant type
    let dominantType: 'cognitive' | 'somatic' | 'balanced' = 'balanced';
    const cogNorm = cognitiveScore / this.config.psasCognitiveCutoff;
    const somNorm = somaticScore / this.config.psasSomaticCutoff;
    if (Math.abs(cogNorm - somNorm) > 0.2) {
      dominantType = cogNorm > somNorm ? 'cognitive' : 'somatic';
    }

    // Determine level
    const totalScore = cognitiveScore + somaticScore;
    let level: HyperarousalLevel = 'low';
    if (totalScore >= 56) level = 'very_high'; // ~70th percentile
    else if (totalScore >= 44) level = 'high';
    else if (totalScore >= 32) level = 'moderate';

    // HRV estimate
    let hrvEstimate: IHyperarousalProfile['hrvEstimate'] | undefined;
    if (hrvData) {
      // Lower RMSSD = higher sympathetic arousal
      const normalizedArousal = Math.max(0, Math.min(1,
        1 - (hrvData.rmssd - 10) / 50
      ));
      hrvEstimate = {
        rmssd: hrvData.rmssd,
        normalizedArousal,
      };

      // Adjust level based on HRV if very discrepant
      if (hrvData.rmssd < this.config.hrvRmssdThreshold && level === 'low') {
        level = 'moderate'; // HRV suggests higher arousal than questionnaire
      }
    }

    // Recommendation
    let recommendation: IHyperarousalProfile['recommendation'] = 'standard';
    if (level === 'very_high') {
      recommendation = 'conservative';
    }
    if (phenotype === 'ISSD' && level === 'high') {
      // ISSD with high arousal may benefit more from relaxation first
      recommendation = 'conservative';
    }

    return {
      level,
      cognitiveScore,
      somaticScore,
      dominantType,
      hrvEstimate,
      phenotype,
      averageTST: avgTST,
      recommendation,
    };
  }

  // ==========================================================================
  // PRESCRIPTION GENERATION
  // ==========================================================================

  /**
   * Calculate initial sleep window with hyperarousal awareness
   *
   * @param sleepHistory - At least 5 days of sleep data
   * @param preferredWakeTime - Fixed wake time anchor
   * @param screening - Eligibility screening result
   * @param profile - Hyperarousal profile
   */
  calculateInitialWindow(
    sleepHistory: ISleepMetrics[],
    preferredWakeTime: string,
    screening: ISRTScreeningResult,
    profile: IHyperarousalProfile
  ): IHyperarousalAwarePrescription {
    if (!screening.eligible) {
      throw new Error('Patient is not eligible for SRT. Address contraindications first.');
    }

    // Get base prescription
    const basePrescription = this.baseEngine.calculateInitialWindow(
      sleepHistory,
      preferredWakeTime
    );

    // Apply modifications from screening
    let prescribedTIB = basePrescription.prescribedTIB;
    let adjustmentIncrement = basePrescription.adjustmentIncrement;
    let evaluationPeriod = basePrescription.evaluationPeriod;
    const appliedModifications: ISRTModification[] = [];
    const complementaryTherapies: string[] = [];
    const safetyWarnings: string[] = [...screening.warnings];

    // Apply screening modifications
    for (const mod of screening.modifications) {
      appliedModifications.push(mod);
      switch (mod.type) {
        case 'minimum_tib':
          prescribedTIB = Math.max(prescribedTIB, mod.value as number);
          break;
        case 'adjustment_step':
          adjustmentIncrement = mod.value as number;
          break;
        case 'evaluation_period':
          evaluationPeriod = mod.value as number;
          break;
      }
    }

    // Apply hyperarousal-based modifications
    if (profile.recommendation === 'conservative') {
      // Conservative approach for high arousal
      if (adjustmentIncrement > this.config.conservativeAdjustmentStep) {
        adjustmentIncrement = this.config.conservativeAdjustmentStep;
        appliedModifications.push({
          type: 'adjustment_step',
          value: this.config.conservativeAdjustmentStep,
          rationale: 'High hyperarousal requires gentler TIB adjustments',
          source: 'Riemann et al. (2025) hyperarousal model',
        });
      }
    }

    // Phenotype-specific modifications
    if (profile.phenotype === 'ISSD') {
      // ISSD may need more cautious approach - they already have short sleep
      safetyWarnings.push(
        'ISSD phenotype: Patient shows objective short sleep duration (<6h). ' +
        'Consider biological interventions (e.g., trazodone) if response is suboptimal.'
      );
      complementaryTherapies.push('relaxation_pmr');
      complementaryTherapies.push('mbti'); // MBT-I for arousal reduction
    }

    // Recommend complementary therapies based on arousal profile
    if (profile.level === 'high' || profile.level === 'very_high') {
      if (profile.dominantType === 'cognitive') {
        complementaryTherapies.push('mbti');
        complementaryTherapies.push('mct');
      } else if (profile.dominantType === 'somatic') {
        complementaryTherapies.push('relaxation_pmr');
        complementaryTherapies.push('diaphragmatic_breathing');
      } else {
        complementaryTherapies.push('acti'); // ACT-I for balanced arousal
      }
    }

    // Ensure TIB meets screening minimum
    prescribedTIB = Math.max(prescribedTIB, screening.minimumTIB);

    // Recalculate bedtime if TIB changed
    const prescribedBedtime = this.calculateBedtime(preferredWakeTime, prescribedTIB);

    return {
      ...basePrescription,
      prescribedTIB,
      prescribedBedtime,
      adjustmentIncrement,
      evaluationPeriod,
      minimumTIB: screening.minimumTIB,
      hyperarousalProfile: profile,
      appliedModifications,
      complementaryTherapies: Array.from(new Set(complementaryTherapies)), // Dedupe
      safetyWarnings,
    };
  }

  /**
   * Evaluate and adjust with hyperarousal awareness
   *
   * @param currentPrescription - Current prescription
   * @param recentMetrics - Recent sleep metrics
   * @param updatedProfile - Updated hyperarousal profile (optional)
   */
  evaluateAndAdjust(
    currentPrescription: IHyperarousalAwarePrescription,
    recentMetrics: ISleepMetrics[],
    updatedProfile?: IHyperarousalProfile
  ): IHyperarousalAwarePrescription {
    // Get base adjustment
    const baseAdjusted = this.baseEngine.evaluateAndAdjust(
      currentPrescription,
      recentMetrics
    );

    // Apply hyperarousal-aware constraints
    let newTIB = baseAdjusted.prescribedTIB;

    // Respect minimum TIB from original prescription
    newTIB = Math.max(newTIB, currentPrescription.minimumTIB);

    // Use configured adjustment step from prescription
    const profile = updatedProfile || currentPrescription.hyperarousalProfile;

    // Track if arousal is improving
    const safetyWarnings = [...(currentPrescription.safetyWarnings || [])];

    if (profile && profile.level === 'very_high') {
      // Don't decrease TIB aggressively for very high arousal
      const maxDecrease = currentPrescription.adjustmentIncrement;
      if (currentPrescription.prescribedTIB - newTIB > maxDecrease) {
        newTIB = currentPrescription.prescribedTIB - maxDecrease;
        safetyWarnings.push(
          'Limited TIB decrease due to high hyperarousal. Focus on arousal reduction therapies.'
        );
      }
    }

    const newBedtime = this.calculateBedtime(
      currentPrescription.prescribedWakeTime,
      newTIB
    );

    return {
      ...currentPrescription,
      prescribedTIB: newTIB,
      prescribedBedtime: newBedtime,
      currentWeek: currentPrescription.currentWeek + 1,
      hyperarousalProfile: profile,
      safetyWarnings,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate bedtime from wake time and TIB
   */
  private calculateBedtime(wakeTime: string, tibMinutes: number): string {
    const [hours, minutes] = wakeTime.split(':').map(Number);
    const wakeMins = hours * 60 + minutes;

    let bedMins = wakeMins - tibMinutes;
    if (bedMins < 0) bedMins += 1440;

    const bedHours = Math.floor(bedMins / 60);
    const bedMinutes = bedMins % 60;

    return `${bedHours.toString().padStart(2, '0')}:${bedMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get phenotype-specific recommendations
   */
  getPhenotypeRecommendations(phenotype: InsomniaPhenotype): {
    primaryApproach: string;
    complementaryInterventions: string[];
    expectedResponse: string;
    warnings: string[];
  } {
    switch (phenotype) {
      case 'ISSD':
        return {
          primaryApproach: 'Conservative SRT with biological support',
          complementaryInterventions: [
            'Trazodone or low-dose sedating antidepressant (consider referral)',
            'Inhibitory control training',
            'Progressive muscle relaxation',
            'HRV biofeedback',
          ],
          expectedResponse: 'Lower CBT-I response rate (~30% less than INSD). May need augmentation.',
          warnings: [
            'ISSD associated with HPA axis activation and cardiovascular risk',
            'Monitor for treatment non-response after 4 weeks',
            'Consider specialist referral if ISI does not improve',
          ],
        };

      case 'INSD':
        return {
          primaryApproach: 'Standard CBT-I protocol with emphasis on cognitive restructuring',
          complementaryInterventions: [
            'MBT-I (Mindfulness-Based Therapy for Insomnia)',
            'ACT-I for acceptance of sleep variability',
            'Cognitive restructuring for sleep misperception',
          ],
          expectedResponse: 'Good CBT-I response expected. Higher remission rates.',
          warnings: [
            'May have sleep state misperception - objective sleep often better than perceived',
            'Address cognitive arousal as primary target',
          ],
        };

      default:
        return {
          primaryApproach: 'Standard CBT-I with ongoing phenotype assessment',
          complementaryInterventions: [
            'Continue sleep diary for phenotype clarification',
            'Consider wearable for objective TST measurement',
          ],
          expectedResponse: 'Assess after 1-2 weeks of baseline data',
          warnings: [
            'Insufficient data for phenotype classification',
            'Collect at least 7 days of sleep diary data',
          ],
        };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): IHyperarousalSRTConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create Hyperarousal-Aware SRT instance
 */
export function createHyperarousalAwareSRT(
  config?: Partial<IHyperarousalSRTConfig>
): HyperarousalAwareSRT {
  return new HyperarousalAwareSRT(config);
}

/**
 * Singleton instance
 */
export const hyperarousalAwareSRT = new HyperarousalAwareSRT();
