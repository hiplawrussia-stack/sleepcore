/**
 * 🧠 ADAPTIVE SLEEP RESTRICTION SERVICE
 * ======================================
 * AI-driven personalization for Sleep Restriction Therapy using
 * digital phenotyping and predictive modeling.
 *
 * Scientific Foundation (2025 Research):
 * - npj Digital Medicine 2025: PLRNN for mental health prediction
 * - JITAI Framework (Nahum-Shani 2018): Just-In-Time Adaptive Interventions
 * - Munich Chronotype Questionnaire (Roenneberg 2003): Sleep need assessment
 * - Digital Phenotyping (Insel 2017): Behavioral pattern extraction
 *
 * Key Features:
 * 1. PLRNN-based prediction for proactive TIB adjustment
 * 2. Sleep Need Questionnaire for individual baseline tuning
 * 3. JITAI adaptive scheduling with optimal intervention timing
 * 4. Confidence-aware decision making
 *
 * © БФ "Другой путь", 2025-2026
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i/services
 */

import { SleepRestrictionEngine } from '../engines/SleepRestrictionEngine';
import {
  SleepPredictionService,
  createSleepPredictionService,
  type ISleepPrediction,
  type ISleepHistoryEntry,
} from '../../bot/services/SleepPredictionService';
import type {
  ISleepRestrictionPrescription,
  ISleepRestrictionRules,
} from '../interfaces/ICBTIComponents';
import type { ISleepMetrics } from '../../sleep/interfaces/ISleepState';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Chronotype classification based on MEQ and circadian patterns
 */
export type Chronotype = 'definite_morning' | 'moderate_morning' | 'intermediate' | 'moderate_evening' | 'definite_evening';

/**
 * Sleep need category based on population norms
 */
export type SleepNeedCategory = 'short_sleeper' | 'average' | 'long_sleeper';

/**
 * Sleep Need Questionnaire responses
 */
export interface ISleepNeedQuestionnaire {
  /** Preferred wake time on free days without alarm (HH:MM) */
  readonly freeWakeTime: string;

  /** Preferred bedtime on free days (HH:MM) */
  readonly freeBedtime: string;

  /** How many hours of sleep do you need to feel fully rested? */
  readonly subjectiveSleepNeed: number;

  /** How alert do you feel 30 min after waking on weekdays? (1-5) */
  readonly morningAlertness: 1 | 2 | 3 | 4 | 5;

  /** How difficult is it for you to wake up in the morning? (1-5) */
  readonly wakingDifficulty: 1 | 2 | 3 | 4 | 5;

  /** At what time would you prefer to do mentally demanding work? */
  readonly peakPerformanceTime: 'early_morning' | 'late_morning' | 'afternoon' | 'evening' | 'night';

  /** If you had to go to bed at 23:00, how easy would falling asleep be? (1-5) */
  readonly sleepOnsetEase: 1 | 2 | 3 | 4 | 5;

  /** How tired do you feel during the day on average? (1-5) */
  readonly daytimeFatigue: 1 | 2 | 3 | 4 | 5;

  /** Do you usually sleep longer on weekends/free days? */
  readonly weekendOversleep: boolean;

  /** Average extra sleep on free days (minutes) */
  readonly socialJetLag: number;
}

/**
 * Individual sleep profile derived from questionnaire and data
 */
export interface ISleepProfile {
  /** User ID */
  readonly userId: string;

  /** Chronotype classification */
  readonly chronotype: Chronotype;

  /** MEQ-equivalent score (16-86 range) */
  readonly chronotypeScore: number;

  /** Estimated biological sleep need (minutes) */
  readonly estimatedSleepNeed: number;

  /** Sleep need category */
  readonly sleepNeedCategory: SleepNeedCategory;

  /** Optimal wake time based on chronotype */
  readonly optimalWakeTime: string;

  /** Optimal bedtime based on chronotype */
  readonly optimalBedtime: string;

  /** Social jet lag in minutes (workday-freeday midsleep difference) */
  readonly socialJetLag: number;

  /** Sleep debt accumulated (minutes) */
  readonly accumulatedSleepDebt: number;

  /** Profile creation date */
  readonly createdAt: Date;

  /** Last update date */
  readonly updatedAt: Date;
}

/**
 * JITAI decision point for intervention timing
 */
export interface IJITAIDecisionPoint {
  /** Decision point ID */
  readonly id: string;

  /** User ID */
  readonly userId: string;

  /** Timestamp */
  readonly timestamp: Date;

  /** Type of decision */
  readonly decisionType: 'reminder' | 'adjustment' | 'encouragement' | 'warning';

  /** Tailoring variables (context) */
  readonly tailoringVariables: {
    /** Current time relative to bedtime (minutes) */
    readonly minutesToBedtime: number;

    /** Predicted SE for tonight */
    readonly predictedSE: number;

    /** Confidence in prediction (0-1) */
    readonly predictionConfidence: number;

    /** Recent adherence score (0-1) */
    readonly recentAdherence: number;

    /** Days in treatment */
    readonly daysInTreatment: number;

    /** Current trend */
    readonly trend: 'improving' | 'stable' | 'declining' | 'critical';

    /** Is weekend/free day */
    readonly isFreeDay: boolean;
  };

  /** Selected intervention option */
  readonly selectedIntervention: string | null;

  /** Intervention options considered */
  readonly interventionOptions: readonly string[];

  /** Reason for selection */
  readonly selectionReason: string;
}

/**
 * Adaptive TIB adjustment recommendation
 */
export interface IAdaptiveTIBAdjustment {
  /** Recommended TIB change (minutes, positive = increase, negative = decrease) */
  readonly recommendedChange: number;

  /** Confidence in recommendation (0-1) */
  readonly confidence: number;

  /** Current TIB (minutes) */
  readonly currentTIB: number;

  /** Proposed new TIB (minutes) */
  readonly proposedTIB: number;

  /** Predicted SE at proposed TIB */
  readonly predictedSE: number;

  /** Predicted SE confidence interval */
  readonly predictedSERange: {
    readonly lower: number;
    readonly upper: number;
  };

  /** Basis for recommendation */
  readonly basis: 'plrnn_prediction' | 'rule_based' | 'hybrid' | 'safety_override';

  /** Explanation in Russian */
  readonly explanationRu: string;

  /** Explanation in English */
  readonly explanationEn: string;

  /** Risk factors identified */
  readonly riskFactors: readonly string[];

  /** Protective factors identified */
  readonly protectiveFactors: readonly string[];
}

/**
 * Adaptive service configuration
 */
export interface IAdaptiveServiceConfig {
  /** Enable PLRNN-based adjustments */
  readonly enablePLRNNAdjustment: boolean;

  /** Minimum confidence for PLRNN-based decision */
  readonly minPredictionConfidence: number;

  /** Enable JITAI adaptive scheduling */
  readonly enableJITAI: boolean;

  /** JITAI reminder windows (minutes before bedtime) */
  readonly jitaiReminderWindows: readonly number[];

  /** Enable chronotype personalization */
  readonly enableChronotypePersonalization: boolean;

  /** Sleep need adjustment range (minutes) */
  readonly sleepNeedAdjustmentRange: {
    readonly min: number;
    readonly max: number;
  };

  /** Conservative mode: prioritize safety over speed */
  readonly conservativeMode: boolean;

  /** Minimum data days for personalization */
  readonly minDataDays: number;
}

/**
 * Default configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: IAdaptiveServiceConfig = {
  enablePLRNNAdjustment: true,
  minPredictionConfidence: 0.6,
  enableJITAI: true,
  jitaiReminderWindows: [120, 60, 30], // 2h, 1h, 30min before bedtime
  enableChronotypePersonalization: true,
  sleepNeedAdjustmentRange: {
    min: -60, // Can reduce sleep need estimate by up to 1 hour
    max: 60,  // Can increase sleep need estimate by up to 1 hour
  },
  conservativeMode: true,
  minDataDays: 7,
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

/**
 * Adaptive Sleep Restriction Service
 * Enhances standard SRT with AI-driven personalization
 */
export class AdaptiveSleepRestrictionService {
  private readonly config: IAdaptiveServiceConfig;
  private readonly baseEngine: SleepRestrictionEngine;
  private readonly predictionService: SleepPredictionService;
  private readonly userProfiles: Map<string, ISleepProfile> = new Map();
  private readonly decisionHistory: Map<string, IJITAIDecisionPoint[]> = new Map();

  constructor(
    config: Partial<IAdaptiveServiceConfig> = {},
    customRules?: ISleepRestrictionRules
  ) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.baseEngine = new SleepRestrictionEngine(customRules);
    this.predictionService = createSleepPredictionService();
  }

  // ==========================================================================
  // SLEEP NEED QUESTIONNAIRE
  // ==========================================================================

  /**
   * Process Sleep Need Questionnaire and create user profile
   */
  processSleepNeedQuestionnaire(
    userId: string,
    responses: ISleepNeedQuestionnaire
  ): ISleepProfile {
    // Calculate chronotype score (MEQ-equivalent, range 16-86)
    const chronotypeScore = this.calculateChronotypeScore(responses);
    const chronotype = this.classifyChronotype(chronotypeScore);

    // Estimate sleep need
    const estimatedSleepNeed = this.estimateSleepNeed(responses);
    const sleepNeedCategory = this.categorizeSleepNeed(estimatedSleepNeed);

    // Calculate optimal times based on chronotype
    const { optimalWakeTime, optimalBedtime } = this.calculateOptimalTimes(
      chronotype,
      estimatedSleepNeed,
      responses.freeWakeTime
    );

    const profile: ISleepProfile = {
      userId,
      chronotype,
      chronotypeScore,
      estimatedSleepNeed,
      sleepNeedCategory,
      optimalWakeTime,
      optimalBedtime,
      socialJetLag: responses.socialJetLag,
      accumulatedSleepDebt: this.estimateSleepDebt(responses),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Calculate chronotype score (MEQ-equivalent)
   * Range: 16-86 (higher = more morning-type)
   */
  private calculateChronotypeScore(responses: ISleepNeedQuestionnaire): number {
    let score = 50; // Base score (intermediate)

    // Wake time contribution (earlier = higher score)
    const freeWakeMins = this.timeToMinutes(responses.freeWakeTime);
    if (freeWakeMins < 360) score += 15; // Before 6:00
    else if (freeWakeMins < 420) score += 10; // 6:00-7:00
    else if (freeWakeMins < 480) score += 5; // 7:00-8:00
    else if (freeWakeMins < 540) score += 0; // 8:00-9:00
    else if (freeWakeMins < 600) score -= 5; // 9:00-10:00
    else if (freeWakeMins < 720) score -= 10; // 10:00-12:00
    else score -= 15; // After 12:00

    // Morning alertness contribution
    score += (responses.morningAlertness - 3) * 4;

    // Waking difficulty contribution (inversed)
    score -= (responses.wakingDifficulty - 3) * 3;

    // Peak performance time
    const perfTimeScores: Record<string, number> = {
      'early_morning': 12,
      'late_morning': 6,
      'afternoon': 0,
      'evening': -6,
      'night': -12,
    };
    score += perfTimeScores[responses.peakPerformanceTime] ?? 0;

    // Sleep onset ease at 23:00
    score += (responses.sleepOnsetEase - 3) * 2;

    // Clamp to valid range
    return Math.max(16, Math.min(86, Math.round(score)));
  }

  /**
   * Classify chronotype based on MEQ score
   */
  private classifyChronotype(score: number): Chronotype {
    if (score >= 70) return 'definite_morning';
    if (score >= 59) return 'moderate_morning';
    if (score >= 42) return 'intermediate';
    if (score >= 31) return 'moderate_evening';
    return 'definite_evening';
  }

  /**
   * Estimate individual sleep need in minutes
   */
  private estimateSleepNeed(responses: ISleepNeedQuestionnaire): number {
    // Start with subjective sleep need
    let estimate = responses.subjectiveSleepNeed * 60;

    // Adjust based on daytime fatigue
    if (responses.daytimeFatigue >= 4) {
      estimate += 30; // High fatigue suggests need more sleep
    } else if (responses.daytimeFatigue <= 2) {
      estimate -= 15; // Low fatigue suggests adequate sleep
    }

    // Adjust based on weekend oversleep
    if (responses.weekendOversleep && responses.socialJetLag > 60) {
      // Significant catch-up sleep suggests sleep debt
      estimate += Math.min(responses.socialJetLag / 2, 45);
    }

    // Calculate from free day sleep duration
    const freeSleepDuration = this.calculateDuration(
      responses.freeBedtime,
      responses.freeWakeTime
    );
    // Weight average between subjective and behavioral
    estimate = (estimate * 0.4 + freeSleepDuration * 0.6);

    // Clamp to reasonable range (5-10 hours)
    return Math.max(300, Math.min(600, Math.round(estimate)));
  }

  /**
   * Categorize sleep need
   */
  private categorizeSleepNeed(needMinutes: number): SleepNeedCategory {
    const needHours = needMinutes / 60;
    if (needHours < 6.5) return 'short_sleeper';
    if (needHours > 9) return 'long_sleeper';
    return 'average';
  }

  /**
   * Calculate optimal wake/bedtime based on chronotype
   */
  private calculateOptimalTimes(
    chronotype: Chronotype,
    sleepNeed: number,
    freeWakeTime: string
  ): { optimalWakeTime: string; optimalBedtime: string } {
    // Use free wake time as base, adjusted for chronotype
    const chronotypeOffsets: Record<Chronotype, number> = {
      'definite_morning': -60, // Wake 1h earlier than free day preference
      'moderate_morning': -30,
      'intermediate': 0,
      'moderate_evening': 30,
      'definite_evening': 60,
    };

    // For SRT, we anchor to a realistic wake time (not too late)
    let wakeMinutes = this.timeToMinutes(freeWakeTime);
    wakeMinutes += chronotypeOffsets[chronotype];

    // Clamp wake time to reasonable range (5:00 - 10:00)
    wakeMinutes = Math.max(300, Math.min(600, wakeMinutes));

    // Calculate bedtime from wake time and sleep need
    let bedMinutes = wakeMinutes - sleepNeed;
    if (bedMinutes < 0) bedMinutes += 1440;

    return {
      optimalWakeTime: this.minutesToTime(wakeMinutes),
      optimalBedtime: this.minutesToTime(bedMinutes),
    };
  }

  /**
   * Estimate accumulated sleep debt
   */
  private estimateSleepDebt(responses: ISleepNeedQuestionnaire): number {
    if (!responses.weekendOversleep) return 0;

    // Social jet lag correlates with chronic sleep debt
    // Rough estimate: 5 workdays × (weekend oversleep / 2)
    return Math.round(responses.socialJetLag * 2.5);
  }

  // ==========================================================================
  // PLRNN-ENHANCED TIB ADJUSTMENT
  // ==========================================================================

  /**
   * Get adaptive TIB adjustment recommendation
   * Uses PLRNN predictions for proactive adjustment
   */
  getAdaptiveTIBAdjustment(
    userId: string,
    currentPrescription: ISleepRestrictionPrescription,
    recentMetrics: ISleepMetrics[]
  ): IAdaptiveTIBAdjustment {
    // Convert metrics to history entries for prediction service
    for (const metric of recentMetrics) {
      const entry: ISleepHistoryEntry = {
        userId,
        date: new Date(), // Will be overwritten in real implementation
        metrics: metric,
        subjectiveQuality: metric.sleepEfficiency / 100,
      };
      this.predictionService.addSleepEntry(entry);
    }

    // Get PLRNN prediction
    const prediction = this.predictionService.predict(userId, 'short');

    // Fallback to rule-based if insufficient data or low confidence
    if (!prediction || !this.config.enablePLRNNAdjustment) {
      return this.getRuleBasedAdjustment(currentPrescription, recentMetrics);
    }

    // Check prediction confidence
    const confidence = prediction.predictedSleepEfficiency.confidence;
    if (confidence < this.config.minPredictionConfidence) {
      return this.getHybridAdjustment(currentPrescription, recentMetrics, prediction);
    }

    // PLRNN-based adjustment
    return this.getPLRNNBasedAdjustment(currentPrescription, recentMetrics, prediction);
  }

  /**
   * Rule-based adjustment (fallback)
   */
  private getRuleBasedAdjustment(
    prescription: ISleepRestrictionPrescription,
    metrics: ISleepMetrics[]
  ): IAdaptiveTIBAdjustment {
    const newPrescription = this.baseEngine.evaluateAndAdjust(prescription, metrics);
    const change = newPrescription.prescribedTIB - prescription.prescribedTIB;
    const avgSE = metrics.reduce((s, m) => s + m.sleepEfficiency, 0) / metrics.length;

    let explanationRu = 'Стандартная корректировка на основе средней эффективности сна.';
    let explanationEn = 'Standard adjustment based on average sleep efficiency.';

    if (change > 0) {
      explanationRu = `Эффективность сна ${avgSE.toFixed(1)}% ≥ 90%. Увеличиваем время в постели на ${change} минут.`;
      explanationEn = `Sleep efficiency ${avgSE.toFixed(1)}% ≥ 90%. Increasing time in bed by ${change} minutes.`;
    } else if (change < 0) {
      explanationRu = `Эффективность сна ${avgSE.toFixed(1)}% < 85%. Сокращаем время в постели на ${Math.abs(change)} минут.`;
      explanationEn = `Sleep efficiency ${avgSE.toFixed(1)}% < 85%. Reducing time in bed by ${Math.abs(change)} minutes.`;
    } else {
      explanationRu = `Эффективность сна ${avgSE.toFixed(1)}% в целевом диапазоне. Сохраняем текущее расписание.`;
      explanationEn = `Sleep efficiency ${avgSE.toFixed(1)}% within target range. Maintaining current schedule.`;
    }

    return {
      recommendedChange: change,
      confidence: 0.7, // Fixed confidence for rule-based
      currentTIB: prescription.prescribedTIB,
      proposedTIB: newPrescription.prescribedTIB,
      predictedSE: avgSE, // Use recent average as "prediction"
      predictedSERange: {
        lower: avgSE - 5,
        upper: avgSE + 5,
      },
      basis: 'rule_based',
      explanationRu,
      explanationEn,
      riskFactors: [],
      protectiveFactors: avgSE >= 85 ? ['Хорошая базовая эффективность'] : [],
    };
  }

  /**
   * PLRNN-based adjustment (high confidence)
   */
  private getPLRNNBasedAdjustment(
    prescription: ISleepRestrictionPrescription,
    metrics: ISleepMetrics[],
    prediction: ISleepPrediction
  ): IAdaptiveTIBAdjustment {
    const currentTIB = prescription.prescribedTIB;
    const predictedSE = prediction.predictedSleepEfficiency.value;
    const lower95 = prediction.predictedSleepEfficiency.lower95;
    const upper95 = prediction.predictedSleepEfficiency.upper95;
    const trend = prediction.trend;
    const confidence = prediction.predictedSleepEfficiency.confidence;

    let change = 0;
    const riskFactors: string[] = [];
    const protectiveFactors: string[] = [];

    // Decision based on predicted trajectory
    if (trend === 'improving' && predictedSE >= 90) {
      // Strong improvement predicted - increase TIB
      change = 15;
      if (lower95 >= 85) {
        change = 20; // Extra aggressive if confident
        protectiveFactors.push('Высокая уверенность в улучшении');
      }
    } else if (trend === 'declining' || predictedSE < 80) {
      // Decline predicted - be conservative
      if (this.config.conservativeMode) {
        change = 0; // Hold steady in conservative mode
        riskFactors.push('Прогнозируется снижение эффективности');
      } else {
        change = -15;
      }
    } else if (predictedSE >= 85 && predictedSE < 90) {
      // Stable in target range
      change = 0;
      protectiveFactors.push('Стабильная эффективность в целевом диапазоне');
    } else if (predictedSE >= 90) {
      // Good predicted SE
      change = 15;
    }

    // Safety checks
    if (currentTIB + change < 300) {
      change = 300 - currentTIB;
      riskFactors.push('Достигнут минимальный предел TIB');
    }
    if (currentTIB + change > 540) {
      change = 540 - currentTIB;
      protectiveFactors.push('Достигнут максимальный TIB');
    }

    // Early warnings as risk factors
    for (const warning of prediction.earlyWarnings) {
      if (warning.severity === 'high' || warning.severity === 'critical') {
        riskFactors.push(warning.messageRu);
      }
    }

    const proposedTIB = currentTIB + change;

    let explanationRu: string;
    let explanationEn: string;

    if (change > 0) {
      explanationRu = `PLRNN прогнозирует эффективность ${predictedSE.toFixed(1)}% (тренд: ${trend}). ` +
        `Рекомендуем увеличить TIB на ${change} минут до ${proposedTIB} минут.`;
      explanationEn = `PLRNN predicts efficiency ${predictedSE.toFixed(1)}% (trend: ${trend}). ` +
        `Recommending TIB increase by ${change} minutes to ${proposedTIB} minutes.`;
    } else if (change < 0) {
      explanationRu = `PLRNN прогнозирует эффективность ${predictedSE.toFixed(1)}% (тренд: ${trend}). ` +
        `Рекомендуем сократить TIB на ${Math.abs(change)} минут до ${proposedTIB} минут.`;
      explanationEn = `PLRNN predicts efficiency ${predictedSE.toFixed(1)}% (trend: ${trend}). ` +
        `Recommending TIB decrease by ${Math.abs(change)} minutes to ${proposedTIB} minutes.`;
    } else {
      explanationRu = `PLRNN прогнозирует эффективность ${predictedSE.toFixed(1)}% (тренд: ${trend}). ` +
        `Рекомендуем сохранить текущий TIB ${currentTIB} минут.`;
      explanationEn = `PLRNN predicts efficiency ${predictedSE.toFixed(1)}% (trend: ${trend}). ` +
        `Recommending maintaining current TIB of ${currentTIB} minutes.`;
    }

    return {
      recommendedChange: change,
      confidence,
      currentTIB,
      proposedTIB,
      predictedSE,
      predictedSERange: { lower: lower95, upper: upper95 },
      basis: 'plrnn_prediction',
      explanationRu,
      explanationEn,
      riskFactors,
      protectiveFactors,
    };
  }

  /**
   * Hybrid adjustment (medium confidence)
   */
  private getHybridAdjustment(
    prescription: ISleepRestrictionPrescription,
    metrics: ISleepMetrics[],
    prediction: ISleepPrediction
  ): IAdaptiveTIBAdjustment {
    const ruleBased = this.getRuleBasedAdjustment(prescription, metrics);
    const plrnnBased = this.getPLRNNBasedAdjustment(prescription, metrics, prediction);

    // Weight by confidence
    const plrnnWeight = prediction.predictedSleepEfficiency.confidence;
    const ruleWeight = 1 - plrnnWeight;

    const hybridChange = Math.round(
      ruleBased.recommendedChange * ruleWeight +
      plrnnBased.recommendedChange * plrnnWeight
    );

    const hybridConfidence = (ruleBased.confidence + plrnnBased.confidence) / 2;

    return {
      ...plrnnBased,
      recommendedChange: hybridChange,
      proposedTIB: prescription.prescribedTIB + hybridChange,
      confidence: hybridConfidence,
      basis: 'hybrid',
      explanationRu: `Гибридная рекомендация (правила: ${(ruleWeight * 100).toFixed(0)}%, PLRNN: ${(plrnnWeight * 100).toFixed(0)}%). ` +
        plrnnBased.explanationRu,
      explanationEn: `Hybrid recommendation (rules: ${(ruleWeight * 100).toFixed(0)}%, PLRNN: ${(plrnnWeight * 100).toFixed(0)}%). ` +
        plrnnBased.explanationEn,
    };
  }

  // ==========================================================================
  // JITAI ADAPTIVE SCHEDULING
  // ==========================================================================

  /**
   * Make JITAI decision for current moment
   * Returns intervention recommendation based on context
   */
  makeJITAIDecision(
    userId: string,
    prescription: ISleepRestrictionPrescription,
    currentTime: Date = new Date()
  ): IJITAIDecisionPoint {
    const minutesToBedtime = this.getMinutesToBedtime(prescription.prescribedBedtime, currentTime);
    const prediction = this.predictionService.predict(userId, 'short');
    const history = this.predictionService.getHistory(userId);
    const recentAdherence = history.length > 0
      ? this.baseEngine.calculateAdherence(prescription, history.map(h => h.metrics))
      : 0.5;

    // Determine if it's a free day (weekend in most cases)
    const dayOfWeek = currentTime.getDay();
    const isFreeDay = dayOfWeek === 0 || dayOfWeek === 6;

    const tailoringVariables = {
      minutesToBedtime,
      predictedSE: prediction?.predictedSleepEfficiency.value ?? 85,
      predictionConfidence: prediction?.predictedSleepEfficiency.confidence ?? 0.5,
      recentAdherence,
      daysInTreatment: prescription.currentWeek * 7,
      trend: prediction?.trend ?? 'stable',
      isFreeDay,
    };

    // Determine decision type and intervention options
    const { decisionType, interventionOptions, selectedIntervention, selectionReason } =
      this.selectJITAIIntervention(tailoringVariables, prescription);

    const decision: IJITAIDecisionPoint = {
      id: `jitai_${userId}_${Date.now()}`,
      userId,
      timestamp: currentTime,
      decisionType,
      tailoringVariables,
      selectedIntervention,
      interventionOptions,
      selectionReason,
    };

    // Store decision for learning
    const userDecisions = this.decisionHistory.get(userId) ?? [];
    userDecisions.push(decision);
    this.decisionHistory.set(userId, userDecisions);

    return decision;
  }

  /**
   * Select optimal JITAI intervention
   */
  private selectJITAIIntervention(
    variables: IJITAIDecisionPoint['tailoringVariables'],
    prescription: ISleepRestrictionPrescription
  ): {
    decisionType: IJITAIDecisionPoint['decisionType'];
    interventionOptions: readonly string[];
    selectedIntervention: string | null;
    selectionReason: string;
  } {
    const { minutesToBedtime, recentAdherence, trend, isFreeDay, predictedSE } = variables;

    // Bedtime reminder window
    if (minutesToBedtime > 0 && minutesToBedtime <= 120) {
      const options = [
        'bedtime_reminder_gentle',
        'bedtime_reminder_firm',
        'wind_down_prompt',
        'relaxation_exercise',
        'no_intervention',
      ];

      if (recentAdherence < 0.6) {
        return {
          decisionType: 'reminder',
          interventionOptions: options,
          selectedIntervention: 'bedtime_reminder_firm',
          selectionReason: `Low adherence (${(recentAdherence * 100).toFixed(0)}%) requires firmer reminder`,
        };
      }

      if (minutesToBedtime <= 30) {
        return {
          decisionType: 'reminder',
          interventionOptions: options,
          selectedIntervention: 'wind_down_prompt',
          selectionReason: 'Close to bedtime, prompt wind-down routine',
        };
      }

      return {
        decisionType: 'reminder',
        interventionOptions: options,
        selectedIntervention: 'bedtime_reminder_gentle',
        selectionReason: 'Standard gentle reminder appropriate',
      };
    }

    // Weekend/free day special handling
    if (isFreeDay && minutesToBedtime > 120) {
      const options = [
        'weekend_consistency_reminder',
        'social_jet_lag_warning',
        'flexible_schedule_allowed',
        'no_intervention',
      ];

      const profile = this.userProfiles.get(prescription.prescribedWakeTime);
      if (profile && profile.socialJetLag > 60) {
        return {
          decisionType: 'warning',
          interventionOptions: options,
          selectedIntervention: 'social_jet_lag_warning',
          selectionReason: `High social jet lag (${profile.socialJetLag}min) detected`,
        };
      }

      return {
        decisionType: 'reminder',
        interventionOptions: options,
        selectedIntervention: 'weekend_consistency_reminder',
        selectionReason: 'Weekend - remind about schedule consistency',
      };
    }

    // Trend-based encouragement/warning
    if (trend === 'improving') {
      return {
        decisionType: 'encouragement',
        interventionOptions: ['progress_celebration', 'maintain_momentum', 'no_intervention'],
        selectedIntervention: 'progress_celebration',
        selectionReason: 'Positive trend detected - reinforce behavior',
      };
    }

    if (trend === 'declining' || trend === 'critical') {
      return {
        decisionType: 'warning',
        interventionOptions: ['decline_alert', 'adherence_check', 'therapist_referral', 'no_intervention'],
        selectedIntervention: predictedSE < 75 ? 'adherence_check' : 'decline_alert',
        selectionReason: `Concerning trend (${trend}) requires intervention`,
      };
    }

    // Default: no intervention needed
    return {
      decisionType: 'reminder',
      interventionOptions: ['no_intervention'],
      selectedIntervention: 'no_intervention',
      selectionReason: 'Stable state, no intervention needed',
    };
  }

  /**
   * Get optimal reminder times for a user
   * Based on chronotype and current prescription
   */
  getOptimalReminderTimes(
    userId: string,
    prescription: ISleepRestrictionPrescription
  ): { time: string; type: string; message: string }[] {
    const profile = this.userProfiles.get(userId);
    const bedtimeMins = this.timeToMinutes(prescription.prescribedBedtime);
    const reminders: { time: string; type: string; message: string }[] = [];

    // Wind-down reminder (2 hours before)
    const windDownMins = (bedtimeMins - 120 + 1440) % 1440;
    reminders.push({
      time: this.minutesToTime(windDownMins),
      type: 'wind_down',
      message: profile?.chronotype.includes('evening')
        ? 'Начните готовиться ко сну. Ваш хронотип предполагает более длительное засыпание.'
        : 'Начните готовиться ко сну.',
    });

    // Device-off reminder (1 hour before)
    const deviceOffMins = (bedtimeMins - 60 + 1440) % 1440;
    reminders.push({
      time: this.minutesToTime(deviceOffMins),
      type: 'device_off',
      message: 'Отложите устройства. Синий свет мешает выработке мелатонина.',
    });

    // Bedtime reminder (15 min before)
    const bedtimeReminderMins = (bedtimeMins - 15 + 1440) % 1440;
    reminders.push({
      time: this.minutesToTime(bedtimeReminderMins),
      type: 'bedtime',
      message: `Время ложиться спать. Ваше предписанное время: ${prescription.prescribedBedtime}.`,
    });

    // Morning reminder (at wake time)
    reminders.push({
      time: prescription.prescribedWakeTime,
      type: 'wake',
      message: 'Время вставать! Не оставайтесь в постели дольше 15 минут.',
    });

    return reminders;
  }

  // ==========================================================================
  // PERSONALIZED INITIAL PRESCRIPTION
  // ==========================================================================

  /**
   * Calculate personalized initial prescription
   * Uses sleep profile and questionnaire data for fine-tuning
   */
  calculatePersonalizedInitialWindow(
    userId: string,
    sleepHistory: ISleepMetrics[],
    questionnaireResponses?: ISleepNeedQuestionnaire
  ): ISleepRestrictionPrescription {
    // Process questionnaire if provided
    if (questionnaireResponses) {
      this.processSleepNeedQuestionnaire(userId, questionnaireResponses);
    }

    const profile = this.userProfiles.get(userId);

    // Determine preferred wake time
    let preferredWakeTime: string;
    if (profile) {
      preferredWakeTime = profile.optimalWakeTime;
    } else {
      // Extract from sleep history
      const avgWakeTime = this.calculateAverageTime(sleepHistory.map(m => m.wakeTime));
      preferredWakeTime = avgWakeTime;
    }

    // Get base prescription
    const basePrescription = this.baseEngine.calculateInitialWindow(
      sleepHistory,
      preferredWakeTime
    );

    // Personalize based on profile
    if (!profile || !this.config.enableChronotypePersonalization) {
      return basePrescription;
    }

    // Adjust TIB based on estimated sleep need
    let personalizedTIB = basePrescription.prescribedTIB;

    // If profile suggests higher sleep need, allow slightly more TIB
    if (profile.sleepNeedCategory === 'long_sleeper') {
      personalizedTIB = Math.min(
        personalizedTIB + 30,
        profile.estimatedSleepNeed * 0.9, // Still restrict to 90% of estimated need
        540 // Max TIB
      );
    }

    // If short sleeper, can be more aggressive
    if (profile.sleepNeedCategory === 'short_sleeper') {
      personalizedTIB = Math.max(
        personalizedTIB - 15,
        300 // Min TIB
      );
    }

    // Calculate personalized bedtime
    const personalizedBedtime = this.calculateBedtimeFromWakeTime(
      preferredWakeTime,
      personalizedTIB
    );

    return {
      ...basePrescription,
      prescribedTIB: Math.round(personalizedTIB),
      prescribedBedtime: personalizedBedtime,
      prescribedWakeTime: preferredWakeTime,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(mins: number): string {
    const normalizedMins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(normalizedMins / 60);
    const m = normalizedMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private calculateDuration(bedtime: string, wakeTime: string): number {
    const bedMins = this.timeToMinutes(bedtime);
    const wakeMins = this.timeToMinutes(wakeTime);
    let duration = wakeMins - bedMins;
    if (duration < 0) duration += 1440; // Crosses midnight
    return duration;
  }

  private getMinutesToBedtime(prescribedBedtime: string, currentTime: Date): number {
    const bedtimeMins = this.timeToMinutes(prescribedBedtime);
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    let diff = bedtimeMins - currentMins;
    if (diff < -720) diff += 1440; // Already past bedtime (tomorrow)
    return diff;
  }

  private calculateAverageTime(times: string[]): string {
    if (times.length === 0) return '07:00';

    // Convert to unit circle to handle midnight wrap
    let sinSum = 0;
    let cosSum = 0;
    for (const time of times) {
      const mins = this.timeToMinutes(time);
      const angle = (mins / 1440) * 2 * Math.PI;
      sinSum += Math.sin(angle);
      cosSum += Math.cos(angle);
    }

    const avgAngle = Math.atan2(sinSum, cosSum);
    let avgMins = (avgAngle / (2 * Math.PI)) * 1440;
    if (avgMins < 0) avgMins += 1440;

    return this.minutesToTime(Math.round(avgMins));
  }

  private calculateBedtimeFromWakeTime(wakeTime: string, tibMinutes: number): string {
    const wakeMins = this.timeToMinutes(wakeTime);
    let bedMins = wakeMins - tibMinutes;
    if (bedMins < 0) bedMins += 1440;
    return this.minutesToTime(bedMins);
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getUserProfile(userId: string): ISleepProfile | undefined {
    return this.userProfiles.get(userId);
  }

  getDecisionHistory(userId: string): readonly IJITAIDecisionPoint[] {
    return this.decisionHistory.get(userId) ?? [];
  }

  getConfig(): IAdaptiveServiceConfig {
    return this.config;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create AdaptiveSleepRestrictionService instance
 */
export function createAdaptiveSleepRestrictionService(
  config?: Partial<IAdaptiveServiceConfig>,
  customRules?: ISleepRestrictionRules
): AdaptiveSleepRestrictionService {
  return new AdaptiveSleepRestrictionService(config, customRules);
}

/**
 * Default service instance
 */
export const adaptiveSleepRestrictionService = createAdaptiveSleepRestrictionService();
