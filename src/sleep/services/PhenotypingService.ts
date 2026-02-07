/**
 * Sleep Phenotyping Service
 * ==========================
 * Integrates PAT predictions with PLRNN-based sleep prediction for enhanced accuracy.
 *
 * Scientific Foundation:
 * - Ensemble methods improve prediction accuracy (Steinmetz et al., 2023)
 * - Sleep phenotypes inform personalized CBT-I (Spielman et al., 1987)
 * - Foundation models provide transfer learning benefits (Ruan et al., 2024)
 *
 * Architecture:
 * - Uses PAT for phenotype classification and actigraphy-based features
 * - Uses PLRNN (SleepPredictionService) for temporal dynamics
 * - Combines via weighted ensemble for final predictions
 *
 * @packageDocumentation
 * @module @sleepcore/sleep/services
 */

import {
  PATAdapter,
  createPATAdapter,
  type IPATConfig,
} from './PATAdapter';

import type {
  IActigraphySession,
  IPATPrediction,
  ISleepPhenotype,
  SleepPhenotypeClass,
} from '../interfaces/IActigraphy';

import type { ISleepMetrics } from '../interfaces/ISleepState';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Phenotyping service configuration
 */
export interface IPhenotypingConfig {
  /** PAT configuration */
  readonly patConfig?: Partial<IPATConfig>;
  /** Ensemble weights (PAT vs PLRNN) */
  readonly ensembleWeights: {
    readonly pat: number;
    readonly plrnn: number;
  };
  /** Minimum confidence for phenotype assignment */
  readonly minPhenotypeConfidence: number;
  /** Enable phenotype-based therapy recommendations */
  readonly enableTherapyRecommendations: boolean;
  /** Cache phenotype results (seconds) */
  readonly cacheTTL: number;
}

/**
 * Default phenotyping configuration
 */
export const DEFAULT_PHENOTYPING_CONFIG: IPhenotypingConfig = {
  ensembleWeights: {
    pat: 0.4,   // PAT contributes 40%
    plrnn: 0.6, // PLRNN contributes 60%
  },
  minPhenotypeConfidence: 0.5,
  enableTherapyRecommendations: true,
  cacheTTL: 3600, // 1 hour
};

/**
 * User sleep profile (comprehensive phenotyping result)
 */
export interface ISleepProfile {
  /** User ID */
  readonly userId: string;
  /** Profile creation timestamp */
  readonly timestamp: Date;
  /** PAT-derived phenotype */
  readonly phenotype: ISleepPhenotype;
  /** Therapy recommendations based on phenotype */
  readonly therapyRecommendations: ITherapyRecommendation[];
  /** Risk assessment */
  readonly riskAssessment: IRiskAssessment;
  /** Circadian profile */
  readonly circadianProfile: ICircadianProfile;
  /** Behavioral patterns */
  readonly behavioralPatterns: IBehavioralPatterns;
  /** Profile confidence */
  readonly confidence: number;
  /** Data quality indicator */
  readonly dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  /** Next assessment recommended date */
  readonly nextAssessmentDate: Date;
}

/**
 * Therapy recommendation based on phenotype
 */
export interface ITherapyRecommendation {
  /** Therapy component */
  readonly component: TherapyComponent;
  /** Priority (1-5, 1 = highest) */
  readonly priority: number;
  /** Rationale for recommendation */
  readonly rationale: string;
  /** Contraindications (if any) */
  readonly contraindications: string[];
  /** Expected effect size (Cohen's d) */
  readonly expectedEffectSize: number;
  /** Confidence in recommendation */
  readonly confidence: number;
}

/**
 * Therapy components
 */
export type TherapyComponent =
  | 'sleep_restriction'
  | 'stimulus_control'
  | 'cognitive_restructuring'
  | 'sleep_hygiene'
  | 'relaxation_pmr'
  | 'relaxation_breathing'
  | 'relaxation_imagery'
  | 'mbti'               // Mindfulness-Based Therapy for Insomnia
  | 'acti'               // Acceptance and Commitment Therapy for Insomnia
  | 'mct'                // Metacognitive Therapy
  | 'light_therapy'
  | 'chronotherapy';

/**
 * Risk assessment
 */
export interface IRiskAssessment {
  /** Overall risk level */
  readonly overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  /** Individual risk scores */
  readonly scores: {
    readonly insomniaRisk: number;
    readonly sleepApneaRisk: number;
    readonly circadianDisruptionRisk: number;
    readonly sleepDeprivationRisk: number;
    readonly depressionRisk: number;
    readonly anxietyRisk: number;
  };
  /** Flags requiring clinical attention */
  readonly clinicalFlags: string[];
  /** Recommended actions */
  readonly recommendedActions: string[];
}

/**
 * Circadian profile
 */
export interface ICircadianProfile {
  /** Estimated chronotype */
  readonly chronotype: 'morning' | 'intermediate' | 'evening';
  /** Chronotype strength (0-1) */
  readonly chronotypeStrength: number;
  /** Estimated DLMO (Dim Light Melatonin Onset) */
  readonly estimatedDLMO: string;
  /** Optimal sleep window */
  readonly optimalSleepWindow: {
    readonly bedtime: string;
    readonly wakeTime: string;
  };
  /** Social jet lag (hours) */
  readonly socialJetLag: number;
  /** Circadian stability score (0-1) */
  readonly stabilityScore: number;
}

/**
 * Behavioral patterns from actigraphy
 */
export interface IBehavioralPatterns {
  /** Activity level category */
  readonly activityLevel: 'sedentary' | 'low' | 'moderate' | 'high' | 'very_high';
  /** Activity timing consistency */
  readonly timingConsistency: number;
  /** Weekend vs weekday difference */
  readonly weekendEffect: number;
  /** Evening activity trend */
  readonly eveningActivityTrend: 'increasing' | 'stable' | 'decreasing';
  /** Rest-activity rhythm regularity */
  readonly rhythmRegularity: number;
}

/**
 * Ensemble prediction result
 */
export interface IEnsemblePrediction {
  /** User ID */
  readonly userId: string;
  /** Prediction timestamp */
  readonly timestamp: Date;
  /** PAT contribution */
  readonly patPrediction: IPATPrediction | null;
  /** PLRNN contribution (from SleepPredictionService) */
  readonly plrnnPrediction: {
    readonly sleepEfficiency: number;
    readonly trend: 'improving' | 'stable' | 'declining' | 'critical';
    readonly confidence: number;
  } | null;
  /** Final ensemble prediction */
  readonly ensemble: {
    readonly sleepEfficiency: number;
    readonly sleepDuration: number;
    readonly sleepOnset: string;
    readonly wakeTime: string;
    readonly confidence: number;
  };
  /** Weights used */
  readonly weights: {
    readonly pat: number;
    readonly plrnn: number;
  };
}

// ============================================================================
// PHENOTYPING SERVICE
// ============================================================================

/**
 * Sleep Phenotyping Service
 * Combines PAT and PLRNN for comprehensive sleep profiling
 */
export class PhenotypingService {
  private config: IPhenotypingConfig;
  private patAdapter: PATAdapter;
  private profileCache: Map<string, { profile: ISleepProfile; expiry: number }> = new Map();
  private initialized = false;

  constructor(config: Partial<IPhenotypingConfig> = {}) {
    this.config = { ...DEFAULT_PHENOTYPING_CONFIG, ...config };
    this.patAdapter = createPATAdapter(this.config.patConfig);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the phenotyping service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.patAdapter.initialize();
    this.initialized = true;

    console.info('[PhenotypingService] Initialized with config:', {
      ensembleWeights: this.config.ensembleWeights,
      patModel: this.patAdapter.getModelInfo().variant,
    });
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && this.patAdapter.isReady();
  }

  // ==========================================================================
  // PROFILE GENERATION
  // ==========================================================================

  /**
   * Generate comprehensive sleep profile from actigraphy data
   */
  async generateProfile(
    userId: string,
    actigraphySession: IActigraphySession,
    supplementaryData?: {
      recentSleepMetrics?: ISleepMetrics[];
      isiScore?: number;
      dbasScore?: number;
    }
  ): Promise<ISleepProfile> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache
    const cached = this.getCachedProfile(userId);
    if (cached) {
      return cached;
    }

    // Get PAT prediction
    const patPrediction = await this.patAdapter.predict(actigraphySession);

    // Generate profile components
    const phenotype = patPrediction.phenotype;
    const therapyRecommendations = this.generateTherapyRecommendations(
      phenotype,
      supplementaryData
    );
    const riskAssessment = this.generateRiskAssessment(
      patPrediction,
      supplementaryData
    );
    const circadianProfile = this.generateCircadianProfile(patPrediction);
    const behavioralPatterns = this.generateBehavioralPatterns(
      actigraphySession,
      patPrediction
    );

    // Calculate data quality
    const validRatio = actigraphySession.epochs.filter(e => e.isWorn).length /
      actigraphySession.epochs.length;
    const daysOfData = actigraphySession.dailySummaries.length;

    let dataQuality: ISleepProfile['dataQuality'] = 'poor';
    if (validRatio > 0.9 && daysOfData >= 7) dataQuality = 'excellent';
    else if (validRatio > 0.8 && daysOfData >= 5) dataQuality = 'good';
    else if (validRatio > 0.7 && daysOfData >= 3) dataQuality = 'fair';

    // Calculate next assessment date (1 week for unstable, 2 weeks for stable)
    const nextAssessmentDays = phenotype.stability === 'stable' ? 14 : 7;
    const nextAssessmentDate = new Date();
    nextAssessmentDate.setDate(nextAssessmentDate.getDate() + nextAssessmentDays);

    const profile: ISleepProfile = {
      userId,
      timestamp: new Date(),
      phenotype,
      therapyRecommendations,
      riskAssessment,
      circadianProfile,
      behavioralPatterns,
      confidence: patPrediction.confidence,
      dataQuality,
      nextAssessmentDate,
    };

    // Cache profile
    this.cacheProfile(userId, profile);

    return profile;
  }

  // ==========================================================================
  // THERAPY RECOMMENDATIONS
  // ==========================================================================

  /**
   * Generate therapy recommendations based on phenotype
   */
  private generateTherapyRecommendations(
    phenotype: ISleepPhenotype,
    supplementaryData?: {
      isiScore?: number;
      dbasScore?: number;
    }
  ): ITherapyRecommendation[] {
    if (!this.config.enableTherapyRecommendations) {
      return [];
    }

    const recommendations: ITherapyRecommendation[] = [];
    const primary = phenotype.primaryPhenotype;

    // Base recommendations for all insomnia phenotypes
    const baseRecommendations: Partial<Record<SleepPhenotypeClass, TherapyComponent[]>> = {
      healthy_sleeper: ['sleep_hygiene'],
      short_sleeper: ['sleep_restriction', 'stimulus_control', 'cognitive_restructuring'],
      long_sleeper: ['stimulus_control', 'sleep_hygiene'],
      delayed_phase: ['chronotherapy', 'light_therapy', 'stimulus_control'],
      advanced_phase: ['chronotherapy', 'sleep_hygiene'],
      irregular: ['stimulus_control', 'sleep_restriction', 'sleep_hygiene'],
      fragmented: ['stimulus_control', 'relaxation_pmr', 'sleep_restriction'],
      social_jetlag: ['stimulus_control', 'sleep_hygiene', 'light_therapy'],
      shift_worker: ['light_therapy', 'sleep_hygiene', 'relaxation_breathing'],
    };

    const components = baseRecommendations[primary] ?? ['sleep_hygiene'];
    let priority = 1;

    for (const component of components) {
      const rec = this.createRecommendation(
        component,
        priority++,
        primary,
        supplementaryData
      );
      recommendations.push(rec);
    }

    // Add third-wave therapy if cognitive load is high
    if (supplementaryData?.dbasScore && supplementaryData.dbasScore > 50) {
      recommendations.push(this.createRecommendation(
        'cognitive_restructuring',
        priority++,
        primary,
        supplementaryData
      ));
      recommendations.push(this.createRecommendation(
        'acti',
        priority++,
        primary,
        supplementaryData
      ));
    }

    // Add mindfulness for fragmented sleepers
    if (primary === 'fragmented' || phenotype.stability === 'variable') {
      recommendations.push(this.createRecommendation(
        'mbti',
        priority++,
        primary,
        supplementaryData
      ));
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Create therapy recommendation
   */
  private createRecommendation(
    component: TherapyComponent,
    priority: number,
    phenotype: SleepPhenotypeClass,
    supplementaryData?: { isiScore?: number }
  ): ITherapyRecommendation {
    const effectSizes: Record<TherapyComponent, number> = {
      sleep_restriction: 0.45,
      stimulus_control: 0.41,
      cognitive_restructuring: 0.32,
      sleep_hygiene: 0.12,
      relaxation_pmr: 0.28,
      relaxation_breathing: 0.25,
      relaxation_imagery: 0.22,
      mbti: 1.32,
      acti: 0.68,
      mct: 0.54,
      light_therapy: 0.35,
      chronotherapy: 0.40,
    };

    const rationales: Record<TherapyComponent, string> = {
      sleep_restriction: 'Consolidates sleep and increases sleep drive',
      stimulus_control: 'Strengthens bed-sleep association',
      cognitive_restructuring: 'Addresses dysfunctional beliefs about sleep',
      sleep_hygiene: 'Optimizes sleep environment and habits',
      relaxation_pmr: 'Reduces physiological arousal',
      relaxation_breathing: 'Activates parasympathetic response',
      relaxation_imagery: 'Reduces cognitive arousal',
      mbti: 'Addresses sleep effort and pre-sleep arousal',
      acti: 'Addresses catastrophizing and avoidance behaviors',
      mct: 'Addresses rumination and metacognitive beliefs',
      light_therapy: 'Shifts circadian phase',
      chronotherapy: 'Progressively adjusts sleep timing',
    };

    const contraindications: Record<TherapyComponent, string[]> = {
      sleep_restriction: ['Severe daytime sleepiness', 'High-risk occupations', 'Bipolar disorder'],
      stimulus_control: [],
      cognitive_restructuring: [],
      sleep_hygiene: [],
      relaxation_pmr: ['Chronic pain conditions'],
      relaxation_breathing: ['Severe respiratory conditions'],
      relaxation_imagery: ['PTSD without clinical guidance'],
      mbti: [],
      acti: [],
      mct: [],
      light_therapy: ['Eye conditions', 'Photosensitivity'],
      chronotherapy: ['Severe depression', 'Bipolar disorder'],
    };

    return {
      component,
      priority,
      rationale: rationales[component],
      contraindications: contraindications[component],
      expectedEffectSize: effectSizes[component],
      confidence: Math.max(0.5, 1 - priority * 0.1),
    };
  }

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  /**
   * Generate risk assessment from PAT prediction
   */
  private generateRiskAssessment(
    patPrediction: IPATPrediction,
    supplementaryData?: { isiScore?: number }
  ): IRiskAssessment {
    const scores = {
      insomniaRisk: patPrediction.riskScores.insomniaRisk,
      sleepApneaRisk: patPrediction.riskScores.sleepApneaRisk,
      circadianDisruptionRisk: patPrediction.riskScores.circadianDisruptionRisk,
      sleepDeprivationRisk: patPrediction.riskScores.sleepDeprivationRisk,
      depressionRisk: this.estimateDepressionRisk(patPrediction),
      anxietyRisk: this.estimateAnxietyRisk(patPrediction),
    };

    // Incorporate ISI if available - ISI has significant clinical weight
    let isiSeverityBoost = 0;
    if (supplementaryData?.isiScore !== undefined) {
      const isiNormalized = supplementaryData.isiScore / 28;
      // Weight ISI more heavily (70%) as it's a validated clinical measure
      scores.insomniaRisk = scores.insomniaRisk * 0.3 + isiNormalized * 0.7;

      // ISI severity thresholds per European Guideline 2023
      // 0-7: none, 8-14: subthreshold, 15-21: moderate, 22-28: severe
      if (supplementaryData.isiScore >= 22) {
        isiSeverityBoost = 0.4; // Severe insomnia elevates overall risk
      } else if (supplementaryData.isiScore >= 15) {
        isiSeverityBoost = 0.2; // Moderate insomnia
      }
    }

    // Calculate overall risk
    const avgRisk = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    const adjustedRisk = avgRisk + isiSeverityBoost;
    let overallRisk: IRiskAssessment['overallRisk'] = 'low';
    if (adjustedRisk > 0.7) overallRisk = 'critical';
    else if (adjustedRisk > 0.5) overallRisk = 'high';
    else if (adjustedRisk > 0.3) overallRisk = 'moderate';

    // Generate clinical flags
    const clinicalFlags: string[] = [];
    if (scores.insomniaRisk > 0.7) clinicalFlags.push('High insomnia risk - consider specialist referral');
    if (scores.sleepApneaRisk > 0.5) clinicalFlags.push('Possible sleep apnea - polysomnography recommended');
    if (scores.circadianDisruptionRisk > 0.6) clinicalFlags.push('Circadian disruption - light therapy may help');
    if (scores.depressionRisk > 0.6) clinicalFlags.push('Depression screening recommended');

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (overallRisk === 'critical') {
      recommendedActions.push('Immediate clinical consultation recommended');
    }
    if (scores.sleepDeprivationRisk > 0.5) {
      recommendedActions.push('Prioritize sleep extension');
    }
    if (scores.circadianDisruptionRisk > 0.5) {
      recommendedActions.push('Stabilize sleep schedule');
    }

    return {
      overallRisk,
      scores,
      clinicalFlags,
      recommendedActions,
    };
  }

  /**
   * Estimate depression risk from sleep patterns
   */
  private estimateDepressionRisk(patPrediction: IPATPrediction): number {
    // Sleep fragmentation and early morning awakening are depression indicators
    let risk = 0;
    risk += patPrediction.predictedMetrics.fragmentation * 0.3;
    risk += patPrediction.riskScores.insomniaRisk * 0.3;

    // Long sleep can indicate depression
    if (patPrediction.predictedMetrics.sleepDuration > 540) { // >9 hours
      risk += 0.2;
    }

    // Low activity is associated with depression
    const phenotype = patPrediction.phenotype.primaryPhenotype;
    if (phenotype === 'fragmented' || phenotype === 'irregular') {
      risk += 0.2;
    }

    return Math.min(1, risk);
  }

  /**
   * Estimate anxiety risk from sleep patterns
   */
  private estimateAnxietyRisk(patPrediction: IPATPrediction): number {
    let risk = 0;

    // Sleep onset problems suggest anxiety
    // Estimate from predicted wake time relative to typical
    risk += patPrediction.riskScores.insomniaRisk * 0.4;

    // Circadian disruption associated with anxiety
    risk += patPrediction.riskScores.circadianDisruptionRisk * 0.3;

    // Short sleep associated with anxiety
    if (patPrediction.predictedMetrics.sleepDuration < 360) { // <6 hours
      risk += 0.3;
    }

    return Math.min(1, risk);
  }

  // ==========================================================================
  // CIRCADIAN PROFILE
  // ==========================================================================

  /**
   * Generate circadian profile from PAT prediction
   */
  private generateCircadianProfile(patPrediction: IPATPrediction): ICircadianProfile {
    const metrics = patPrediction.predictedMetrics;
    const phenotype = patPrediction.phenotype.primaryPhenotype;

    // Estimate chronotype from phenotype and sleep timing
    let chronotype: ICircadianProfile['chronotype'] = 'intermediate';
    let chronotypeStrength = 0.5;

    if (phenotype === 'delayed_phase') {
      chronotype = 'evening';
      chronotypeStrength = 0.8;
    } else if (phenotype === 'advanced_phase') {
      chronotype = 'morning';
      chronotypeStrength = 0.8;
    } else {
      // Infer from sleep onset time
      const onsetHour = this.timeStringToHour(metrics.sleepOnset);
      if (onsetHour < 22) {
        chronotype = 'morning';
        chronotypeStrength = 0.6;
      } else if (onsetHour > 24) {
        chronotype = 'evening';
        chronotypeStrength = 0.6;
      }
    }

    // Estimate DLMO (typically 2-3 hours before sleep onset)
    const onsetHour = this.timeStringToHour(metrics.sleepOnset);
    const dlmoHour = (onsetHour - 2.5 + 24) % 24;
    const estimatedDLMO = this.hourToTimeString(dlmoHour);

    // Optimal sleep window based on phenotype and predicted times
    const optimalBedtime = metrics.sleepOnset;
    const optimalWake = metrics.wakeTime;

    // Estimate social jet lag (would need weekday/weekend data)
    // Using circadian disruption risk as proxy
    const socialJetLag = patPrediction.riskScores.circadianDisruptionRisk * 2;

    // Stability score from phenotype stability
    const stabilityMap: Record<ISleepPhenotype['stability'], number> = {
      stable: 0.9,
      transitioning: 0.6,
      variable: 0.3,
    };
    const stabilityScore = stabilityMap[patPrediction.phenotype.stability];

    return {
      chronotype,
      chronotypeStrength,
      estimatedDLMO,
      optimalSleepWindow: {
        bedtime: optimalBedtime,
        wakeTime: optimalWake,
      },
      socialJetLag,
      stabilityScore,
    };
  }

  // ==========================================================================
  // BEHAVIORAL PATTERNS
  // ==========================================================================

  /**
   * Generate behavioral patterns from actigraphy
   */
  private generateBehavioralPatterns(
    session: IActigraphySession,
    patPrediction: IPATPrediction
  ): IBehavioralPatterns {
    // Calculate activity level from daily summaries
    const avgMVPA = session.dailySummaries.reduce((sum, d) => sum + d.mvpaMinutes, 0) /
      session.dailySummaries.length;

    let activityLevel: IBehavioralPatterns['activityLevel'] = 'moderate';
    if (avgMVPA < 15) activityLevel = 'sedentary';
    else if (avgMVPA < 30) activityLevel = 'low';
    else if (avgMVPA < 60) activityLevel = 'moderate';
    else if (avgMVPA < 90) activityLevel = 'high';
    else activityLevel = 'very_high';

    // Timing consistency from stability
    const timingConsistency = patPrediction.phenotype.stability === 'stable' ? 0.8 :
      patPrediction.phenotype.stability === 'transitioning' ? 0.5 : 0.3;

    // Weekend effect (simplified - would need day-of-week analysis)
    const weekendEffect = patPrediction.riskScores.circadianDisruptionRisk * 1.5;

    // Evening activity trend (simplified)
    const eveningActivityTrend: IBehavioralPatterns['eveningActivityTrend'] =
      patPrediction.predictedMetrics.fragmentation > 0.15 ? 'increasing' : 'stable';

    // Rhythm regularity
    const rhythmRegularity = 1 - patPrediction.predictedMetrics.fragmentation;

    return {
      activityLevel,
      timingConsistency,
      weekendEffect,
      eveningActivityTrend,
      rhythmRegularity,
    };
  }

  // ==========================================================================
  // ENSEMBLE PREDICTION
  // ==========================================================================

  /**
   * Create ensemble prediction combining PAT and PLRNN
   */
  async createEnsemblePrediction(
    userId: string,
    patPrediction: IPATPrediction | null,
    plrnnPrediction: {
      sleepEfficiency: number;
      trend: 'improving' | 'stable' | 'declining' | 'critical';
      confidence: number;
    } | null
  ): Promise<IEnsemblePrediction> {
    const weights = { ...this.config.ensembleWeights };

    // Adjust weights based on availability
    if (!patPrediction) {
      weights.pat = 0;
      weights.plrnn = 1;
    }
    if (!plrnnPrediction) {
      weights.pat = 1;
      weights.plrnn = 0;
    }

    // Normalize weights
    const totalWeight = weights.pat + weights.plrnn;
    if (totalWeight > 0) {
      weights.pat /= totalWeight;
      weights.plrnn /= totalWeight;
    }

    // Calculate ensemble prediction
    let ensembleSE = 85; // Default
    let ensembleDuration = 420; // Default 7 hours
    let ensembleOnset = '23:00';
    let ensembleWake = '07:00';
    let ensembleConfidence = 0.5;

    if (patPrediction && plrnnPrediction) {
      ensembleSE = Math.round(
        patPrediction.predictedMetrics.sleepEfficiency * weights.pat +
        plrnnPrediction.sleepEfficiency * weights.plrnn
      );
      ensembleDuration = patPrediction.predictedMetrics.sleepDuration;
      ensembleOnset = patPrediction.predictedMetrics.sleepOnset;
      ensembleWake = patPrediction.predictedMetrics.wakeTime;
      ensembleConfidence = patPrediction.confidence * weights.pat +
        plrnnPrediction.confidence * weights.plrnn;
    } else if (patPrediction) {
      ensembleSE = patPrediction.predictedMetrics.sleepEfficiency;
      ensembleDuration = patPrediction.predictedMetrics.sleepDuration;
      ensembleOnset = patPrediction.predictedMetrics.sleepOnset;
      ensembleWake = patPrediction.predictedMetrics.wakeTime;
      ensembleConfidence = patPrediction.confidence;
    } else if (plrnnPrediction) {
      ensembleSE = plrnnPrediction.sleepEfficiency;
      ensembleConfidence = plrnnPrediction.confidence;
    }

    return {
      userId,
      timestamp: new Date(),
      patPrediction,
      plrnnPrediction,
      ensemble: {
        sleepEfficiency: ensembleSE,
        sleepDuration: ensembleDuration,
        sleepOnset: ensembleOnset,
        wakeTime: ensembleWake,
        confidence: ensembleConfidence,
      },
      weights,
    };
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  /**
   * Get cached profile
   */
  private getCachedProfile(userId: string): ISleepProfile | null {
    const cached = this.profileCache.get(userId);
    if (cached && cached.expiry > Date.now()) {
      return cached.profile;
    }
    this.profileCache.delete(userId);
    return null;
  }

  /**
   * Cache profile
   */
  private cacheProfile(userId: string, profile: ISleepProfile): void {
    const expiry = Date.now() + this.config.cacheTTL * 1000;
    this.profileCache.set(userId, { profile, expiry });
  }

  /**
   * Clear cache for user
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.profileCache.delete(userId);
    } else {
      this.profileCache.clear();
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Convert time string to hour (decimal)
   */
  private timeStringToHour(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) + (m ?? 0) / 60;
  }

  /**
   * Convert hour to time string
   */
  private hourToTimeString(hour: number): string {
    const h = Math.floor(hour) % 24;
    const m = Math.round((hour - Math.floor(hour)) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Get configuration
   */
  getConfig(): IPhenotypingConfig {
    return { ...this.config };
  }

  /**
   * Get PAT adapter info
   */
  getPATInfo(): ReturnType<PATAdapter['getModelInfo']> {
    return this.patAdapter.getModelInfo();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Create phenotyping service instance
 */
export function createPhenotypingService(
  config?: Partial<IPhenotypingConfig>
): PhenotypingService {
  return new PhenotypingService(config);
}

/**
 * Singleton instance
 */
export const phenotypingService = createPhenotypingService();
