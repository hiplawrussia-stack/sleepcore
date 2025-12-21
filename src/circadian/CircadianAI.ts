/**
 * CircadianAI - Chronotype-Based Sleep Personalization Engine
 * ============================================================
 *
 * AI-powered circadian rhythm assessment and personalization for
 * optimizing CBT-I intervention timing and content.
 *
 * Scientific Foundation:
 * - Munich Chronotype Questionnaire (MCTQ) - Roenneberg & Merrow, 2002
 * - Morningness-Eveningness Questionnaire (MEQ) - Horne & Östberg, 1976
 * - DLMO prediction algorithms - PMC8474125
 * - Social jetlag concept - Wittmann et al., 2006
 * - Chronotype-mood links - Nature Scientific Reports, 2025
 *
 * Key Features:
 * 1. MEQ/MCTQ-based chronotype assessment
 * 2. Social jetlag calculation
 * 3. DLMO estimation from sleep timing
 * 4. Personalized sleep window recommendations
 * 5. Optimal intervention timing
 * 6. Light therapy scheduling
 *
 * @packageDocumentation
 * @module @sleepcore/circadian
 */

import type { ISleepState, Chronotype } from '../sleep/interfaces/ISleepState';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Detailed chronotype categories
 */
export type ChronotypeCategory =
  | 'extreme_morning'    // Very early bird (MEQ 70-86)
  | 'moderate_morning'   // Morning type (MEQ 59-69)
  | 'intermediate'       // Neither type (MEQ 42-58)
  | 'moderate_evening'   // Evening type (MEQ 31-41)
  | 'extreme_evening';   // Very late owl (MEQ 16-30)

/**
 * MEQ (Morningness-Eveningness Questionnaire) response
 */
export interface IMEQResponse {
  readonly userId: string;
  readonly date: string;

  /** Q1: Preferred wake time if free day */
  readonly q1_wakePreference: number; // 1-5

  /** Q2: Tiredness in first 30 min after waking */
  readonly q2_morningTiredness: number; // 1-4

  /** Q3: Time of going to bed if work next day */
  readonly q3_bedtimeWork: number; // 1-4

  /** Q4: Peak performance time */
  readonly q4_peakPerformance: number; // 1-5

  /** Q5: Self-rating as morning/evening type */
  readonly q5_selfRating: number; // 1-6

  /** Additional items for full 19-item MEQ */
  readonly additionalItems?: number[];
}

/**
 * MCTQ (Munich Chronotype Questionnaire) response
 * Simplified 6-item version (µMCTQ)
 */
export interface IMCTQResponse {
  readonly userId: string;
  readonly date: string;

  /** Workdays */
  readonly work: {
    readonly bedtime: string;         // e.g., "23:00"
    readonly sleepOnset: string;      // Time actually fell asleep
    readonly wakeTime: string;        // e.g., "07:00"
    readonly useAlarm: boolean;
  };

  /** Free days */
  readonly free: {
    readonly bedtime: string;
    readonly sleepOnset: string;
    readonly wakeTime: string;
    readonly useAlarm: boolean;
  };
}

/**
 * Circadian assessment result
 */
export interface ICircadianAssessment {
  /** MEQ-based chronotype (if available) */
  readonly meqScore?: number;
  readonly meqCategory?: ChronotypeCategory;

  /** MCTQ-based chronotype */
  readonly msfsc?: string;           // Corrected midsleep on free days (chronotype marker)
  readonly chronotype: Chronotype;
  readonly chronotypeCategory: ChronotypeCategory;

  /** Social jetlag */
  readonly socialJetlag: number;     // hours
  readonly socialJetlagSeverity: 'none' | 'mild' | 'moderate' | 'severe';

  /** Estimated DLMO */
  readonly estimatedDLMO: string;    // e.g., "21:30"
  readonly dlmoConfidence: number;   // 0-1

  /** Sleep need estimation */
  readonly estimatedSleepNeed: number; // hours
  readonly optimalSleepWindow: {
    readonly bedtime: string;
    readonly wakeTime: string;
  };

  /** Risk factors */
  readonly riskFactors: string[];
}

/**
 * Personalized intervention timing
 */
export interface IChronotherapyPlan {
  readonly userId: string;
  readonly chronotype: Chronotype;

  /** Optimal CBT-I session times */
  readonly optimalSessionTimes: string[];

  /** Light therapy schedule */
  readonly lightTherapy: {
    readonly recommended: boolean;
    readonly timing: string;
    readonly duration: number;    // minutes
    readonly intensity: number;   // lux
    readonly rationale: string;
  };

  /** Melatonin timing (if applicable) */
  readonly melatoninTiming?: {
    readonly recommended: boolean;
    readonly timing: string;
    readonly dose: string;
    readonly rationale: string;
  };

  /** Sleep restriction adjustments */
  readonly sleepRestrictionAdjustments: {
    readonly initialBedtime: string;
    readonly initialWakeTime: string;
    readonly rationale: string;
  };

  /** Lifestyle recommendations */
  readonly lifestyleRecommendations: string[];
}

/**
 * MEQ scoring thresholds
 */
export const MEQ_THRESHOLDS = {
  EXTREME_MORNING: { min: 70, max: 86 },
  MODERATE_MORNING: { min: 59, max: 69 },
  INTERMEDIATE: { min: 42, max: 58 },
  MODERATE_EVENING: { min: 31, max: 41 },
  EXTREME_EVENING: { min: 16, max: 30 },
} as const;

/**
 * Social jetlag severity thresholds
 */
export const SOCIAL_JETLAG_THRESHOLDS = {
  NONE: 0.5,       // <30 min
  MILD: 1.0,       // 30-60 min
  MODERATE: 2.0,   // 1-2 hours
  SEVERE: Infinity, // >2 hours
} as const;

// =============================================================================
// MEQ QUESTIONNAIRE (REDUCED 5-ITEM VERSION)
// =============================================================================

/**
 * MEQ items (reduced version for screening)
 */
export const MEQ_ITEMS = [
  {
    id: 'q1_wakePreference',
    textRu: 'Если бы вы были полностью свободны в планировании своего дня и руководствовались только своими желаниями, в какое время вы бы вставали?',
    options: [
      { value: 5, label: '05:00-06:30' },
      { value: 4, label: '06:30-07:45' },
      { value: 3, label: '07:45-09:45' },
      { value: 2, label: '09:45-11:00' },
      { value: 1, label: '11:00-12:00' },
    ],
  },
  {
    id: 'q2_morningTiredness',
    textRu: 'В первые полчаса после пробуждения утром вы чувствуете себя усталым?',
    options: [
      { value: 1, label: 'Очень усталым' },
      { value: 2, label: 'Довольно усталым' },
      { value: 3, label: 'Довольно свежим' },
      { value: 4, label: 'Очень свежим' },
    ],
  },
  {
    id: 'q3_bedtimeWork',
    textRu: 'В какое время вечером вы чувствуете себя уставшим и готовым ко сну?',
    options: [
      { value: 5, label: '20:00-21:00' },
      { value: 4, label: '21:00-22:15' },
      { value: 3, label: '22:15-00:30' },
      { value: 2, label: '00:30-01:45' },
      { value: 1, label: '01:45-03:00' },
    ],
  },
  {
    id: 'q4_peakPerformance',
    textRu: 'В какое время суток вы чувствуете себя на пике умственной активности?',
    options: [
      { value: 5, label: '08:00-10:00' },
      { value: 4, label: '10:00-13:00' },
      { value: 3, label: '13:00-17:00' },
      { value: 2, label: '17:00-21:00' },
      { value: 1, label: '21:00-05:00' },
    ],
  },
  {
    id: 'q5_selfRating',
    textRu: 'К какому типу вы себя относите?',
    options: [
      { value: 6, label: 'Определённо жаворонок' },
      { value: 5, label: 'Скорее жаворонок' },
      { value: 4, label: 'Скорее жаворонок, чем сова' },
      { value: 3, label: 'Скорее сова, чем жаворонок' },
      { value: 2, label: 'Скорее сова' },
      { value: 1, label: 'Определённо сова' },
    ],
  },
] as const;

// =============================================================================
// CIRCADIAN AI ENGINE
// =============================================================================

/**
 * Circadian AI Engine for chronotype personalization
 */
export class CircadianAI {
  /**
   * Assess chronotype from MEQ response
   */
  assessFromMEQ(response: IMEQResponse): ICircadianAssessment {
    const meqScore = this.calculateMEQScore(response);
    const meqCategory = this.getMEQCategory(meqScore);
    const chronotype = this.meqToChronotype(meqCategory);

    // Estimate DLMO from MEQ
    const estimatedDLMO = this.estimateDLMOFromMEQ(meqScore);

    // Estimate optimal sleep window
    const optimalWindow = this.calculateOptimalSleepWindow(chronotype, estimatedDLMO);

    return {
      meqScore,
      meqCategory,
      chronotype,
      chronotypeCategory: meqCategory,
      socialJetlag: 0, // Cannot calculate without MCTQ
      socialJetlagSeverity: 'none',
      estimatedDLMO,
      dlmoConfidence: 0.6, // Lower confidence without MCTQ
      estimatedSleepNeed: 7.5,
      optimalSleepWindow: optimalWindow,
      riskFactors: this.identifyRiskFactors(meqCategory, 0),
    };
  }

  /**
   * Assess chronotype from MCTQ response
   */
  assessFromMCTQ(response: IMCTQResponse): ICircadianAssessment {
    // Calculate midsleep on free days (MSF)
    const msf = this.calculateMSF(response.free);

    // Calculate sleep duration on work and free days
    const sdw = this.calculateSleepDuration(response.work);
    const sdf = this.calculateSleepDuration(response.free);

    // Calculate corrected MSF (MSFsc) - the chronotype marker
    const msfsc = this.calculateMSFsc(msf, sdf, sdw, response.free.useAlarm);

    // Calculate social jetlag
    const msw = this.calculateMSF(response.work);
    const socialJetlag = Math.abs(this.timeToHours(msf) - this.timeToHours(msw));

    // Determine chronotype category
    const chronotypeCategory = this.msfscToCategory(msfsc);
    const chronotype = this.categoryToChronotype(chronotypeCategory);

    // Estimate DLMO (typically 2-3 hours before sleep onset)
    const estimatedDLMO = this.estimateDLMOFromSleepOnset(response.free.sleepOnset);

    return {
      msfsc,
      chronotype,
      chronotypeCategory,
      socialJetlag,
      socialJetlagSeverity: this.getSocialJetlagSeverity(socialJetlag),
      estimatedDLMO,
      dlmoConfidence: response.free.useAlarm ? 0.7 : 0.85,
      estimatedSleepNeed: (sdw + sdf) / 2,
      optimalSleepWindow: {
        bedtime: response.free.bedtime,
        wakeTime: response.free.wakeTime,
      },
      riskFactors: this.identifyRiskFactors(chronotypeCategory, socialJetlag),
    };
  }

  /**
   * Generate personalized chronotherapy plan
   */
  generateChronotherapyPlan(
    userId: string,
    assessment: ICircadianAssessment,
    sleepState?: ISleepState
  ): IChronotherapyPlan {
    const { chronotype, estimatedDLMO, socialJetlag, chronotypeCategory } = assessment;

    // Determine light therapy needs
    const lightTherapy = this.calculateLightTherapy(chronotypeCategory, socialJetlag);

    // Determine melatonin timing if applicable
    const melatoninTiming = this.calculateMelatoninTiming(chronotypeCategory, estimatedDLMO);

    // Calculate optimal CBT-I session times
    const optimalSessionTimes = this.calculateOptimalSessionTimes(chronotype);

    // Calculate sleep restriction parameters
    const sleepRestriction = this.calculateSleepRestriction(assessment, sleepState);

    // Generate lifestyle recommendations
    const lifestyle = this.generateLifestyleRecommendations(chronotypeCategory, socialJetlag);

    return {
      userId,
      chronotype,
      optimalSessionTimes,
      lightTherapy,
      melatoninTiming,
      sleepRestrictionAdjustments: sleepRestriction,
      lifestyleRecommendations: lifestyle,
    };
  }

  /**
   * Calculate MEQ score
   */
  private calculateMEQScore(response: IMEQResponse): number {
    // Reduced 5-item MEQ scoring (scale to full range)
    const rawScore = response.q1_wakePreference +
                    response.q2_morningTiredness +
                    response.q3_bedtimeWork +
                    response.q4_peakPerformance +
                    response.q5_selfRating;

    // Scale from 5-24 to 16-86
    return Math.round(16 + (rawScore - 5) * (70 / 19));
  }

  /**
   * Get MEQ category
   */
  private getMEQCategory(score: number): ChronotypeCategory {
    if (score >= MEQ_THRESHOLDS.EXTREME_MORNING.min) return 'extreme_morning';
    if (score >= MEQ_THRESHOLDS.MODERATE_MORNING.min) return 'moderate_morning';
    if (score >= MEQ_THRESHOLDS.INTERMEDIATE.min) return 'intermediate';
    if (score >= MEQ_THRESHOLDS.MODERATE_EVENING.min) return 'moderate_evening';
    return 'extreme_evening';
  }

  /**
   * Convert MEQ category to chronotype
   */
  private meqToChronotype(category: ChronotypeCategory): Chronotype {
    switch (category) {
      case 'extreme_morning':
        return 'definite_morning';
      case 'moderate_morning':
        return 'moderate_morning';
      case 'extreme_evening':
        return 'definite_evening';
      case 'moderate_evening':
        return 'moderate_evening';
      default:
        return 'intermediate';
    }
  }

  /**
   * Calculate midsleep from sleep times
   */
  private calculateMSF(times: { sleepOnset: string; wakeTime: string }): string {
    const soHours = this.timeToHours(times.sleepOnset);
    const weHours = this.timeToHours(times.wakeTime);

    // Handle crossing midnight
    let duration = weHours - soHours;
    if (duration < 0) duration += 24;

    const midpoint = soHours + duration / 2;
    return this.hoursToTime(midpoint % 24);
  }

  /**
   * Calculate sleep duration in hours
   */
  private calculateSleepDuration(times: { sleepOnset: string; wakeTime: string }): number {
    const soHours = this.timeToHours(times.sleepOnset);
    const weHours = this.timeToHours(times.wakeTime);

    let duration = weHours - soHours;
    if (duration < 0) duration += 24;

    return duration;
  }

  /**
   * Calculate corrected MSFsc (chronotype marker)
   */
  private calculateMSFsc(
    msf: string,
    sdf: number,
    sdw: number,
    usesAlarm: boolean
  ): string {
    if (usesAlarm) {
      // Cannot use MSF directly if alarm is used
      return msf;
    }

    const msfHours = this.timeToHours(msf);

    // If sleep on free days is longer, correct for oversleep
    if (sdf > sdw) {
      const correction = (sdf - sdw) / 2;
      const correctedHours = msfHours - correction;
      return this.hoursToTime((correctedHours + 24) % 24);
    }

    return msf;
  }

  /**
   * Convert MSFsc to chronotype category
   */
  private msfscToCategory(msfsc: string): ChronotypeCategory {
    const hours = this.timeToHours(msfsc);

    if (hours < 2.5) return 'extreme_morning';
    if (hours < 3.5) return 'moderate_morning';
    if (hours < 5.0) return 'intermediate';
    if (hours < 6.5) return 'moderate_evening';
    return 'extreme_evening';
  }

  /**
   * Category to chronotype
   */
  private categoryToChronotype(category: ChronotypeCategory): Chronotype {
    switch (category) {
      case 'extreme_morning':
        return 'definite_morning';
      case 'moderate_morning':
        return 'moderate_morning';
      case 'extreme_evening':
        return 'definite_evening';
      case 'moderate_evening':
        return 'moderate_evening';
      default:
        return 'intermediate';
    }
  }

  /**
   * Get social jetlag severity
   */
  private getSocialJetlagSeverity(hours: number): 'none' | 'mild' | 'moderate' | 'severe' {
    if (hours < SOCIAL_JETLAG_THRESHOLDS.NONE) return 'none';
    if (hours < SOCIAL_JETLAG_THRESHOLDS.MILD) return 'mild';
    if (hours < SOCIAL_JETLAG_THRESHOLDS.MODERATE) return 'moderate';
    return 'severe';
  }

  /**
   * Estimate DLMO from MEQ score
   */
  private estimateDLMOFromMEQ(meqScore: number): string {
    // Linear approximation: higher MEQ = earlier DLMO
    // MEQ 86 → DLMO ~19:30, MEQ 16 → DLMO ~01:00
    const hours = 19.5 + (86 - meqScore) * (5.5 / 70);
    return this.hoursToTime(hours % 24);
  }

  /**
   * Estimate DLMO from sleep onset
   */
  private estimateDLMOFromSleepOnset(sleepOnset: string): string {
    // DLMO typically 2-3 hours before sleep onset
    const soHours = this.timeToHours(sleepOnset);
    const dlmoHours = soHours - 2.5;
    return this.hoursToTime((dlmoHours + 24) % 24);
  }

  /**
   * Calculate optimal sleep window
   */
  private calculateOptimalSleepWindow(
    chronotype: Chronotype,
    dlmo: string
  ): { bedtime: string; wakeTime: string } {
    const dlmoHours = this.timeToHours(dlmo);

    // Optimal bedtime: 2-3 hours after DLMO
    const optimalBedtimeHours = (dlmoHours + 2.5) % 24;

    // Assume 7.5 hours sleep need
    const optimalWakeHours = (optimalBedtimeHours + 7.5) % 24;

    return {
      bedtime: this.hoursToTime(optimalBedtimeHours),
      wakeTime: this.hoursToTime(optimalWakeHours),
    };
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(category: ChronotypeCategory, socialJetlag: number): string[] {
    const risks: string[] = [];

    if (category === 'extreme_evening' || category === 'moderate_evening') {
      risks.push('Повышенный риск депрессии и тревоги у вечерних хронотипов');
      risks.push('Склонность к социальному джетлагу');
    }

    if (socialJetlag >= 2) {
      risks.push('Значительный социальный джетлаг (>2 часов) — риск метаболических нарушений');
    }

    if (socialJetlag >= 1 && category.includes('evening')) {
      risks.push('Хроническое недосыпание в рабочие дни');
    }

    return risks;
  }

  /**
   * Calculate light therapy recommendation
   */
  private calculateLightTherapy(
    category: ChronotypeCategory,
    socialJetlag: number
  ): IChronotherapyPlan['lightTherapy'] {
    if (category.includes('evening') && socialJetlag > 1) {
      return {
        recommended: true,
        timing: '07:00-08:00 (сразу после пробуждения)',
        duration: 30,
        intensity: 10000,
        rationale: 'Утренняя светотерапия поможет сдвинуть циркадные ритмы раньше и уменьшить социальный джетлаг',
      };
    }

    if (category === 'extreme_morning') {
      return {
        recommended: true,
        timing: '18:00-19:00',
        duration: 30,
        intensity: 2500,
        rationale: 'Вечерний свет поможет предотвратить слишком ранний отход ко сну',
      };
    }

    return {
      recommended: false,
      timing: '',
      duration: 0,
      intensity: 0,
      rationale: 'Светотерапия не показана при данном хронотипе',
    };
  }

  /**
   * Calculate melatonin timing
   */
  private calculateMelatoninTiming(
    category: ChronotypeCategory,
    estimatedDLMO: string
  ): IChronotherapyPlan['melatoninTiming'] {
    if (category === 'extreme_evening' || category === 'moderate_evening') {
      const dlmoHours = this.timeToHours(estimatedDLMO);
      const melatoninHours = (dlmoHours - 4 + 24) % 24; // 4-5 hours before DLMO

      return {
        recommended: true,
        timing: this.hoursToTime(melatoninHours),
        dose: '0.5-3 мг',
        rationale: 'Низкая доза мелатонина за 4-5 часов до DLMO поможет сдвинуть ритмы раньше',
      };
    }

    return undefined;
  }

  /**
   * Calculate optimal CBT-I session times
   */
  private calculateOptimalSessionTimes(chronotype: Chronotype): string[] {
    if (chronotype === 'definite_morning' || chronotype === 'moderate_morning') {
      return ['09:00-11:00', '14:00-16:00'];
    }
    if (chronotype === 'definite_evening' || chronotype === 'moderate_evening') {
      return ['11:00-13:00', '16:00-18:00'];
    }
    return ['10:00-12:00', '14:00-16:00'];
  }

  /**
   * Calculate sleep restriction adjustments
   */
  private calculateSleepRestriction(
    assessment: ICircadianAssessment,
    sleepState?: ISleepState
  ): IChronotherapyPlan['sleepRestrictionAdjustments'] {
    const { chronotype, optimalSleepWindow } = assessment;

    const isMorning = chronotype === 'definite_morning' || chronotype === 'moderate_morning';
    const isEvening = chronotype === 'definite_evening' || chronotype === 'moderate_evening';
    let rationale = `Начальное окно сна адаптировано под ${isMorning ? 'утренний' : isEvening ? 'вечерний' : 'промежуточный'} хронотип. `;

    if (assessment.socialJetlag > 1) {
      rationale += 'При наличии социального джетлага рекомендуется постепенное смещение графика.';
    }

    return {
      initialBedtime: optimalSleepWindow.bedtime,
      initialWakeTime: optimalSleepWindow.wakeTime,
      rationale,
    };
  }

  /**
   * Generate lifestyle recommendations
   */
  private generateLifestyleRecommendations(
    category: ChronotypeCategory,
    socialJetlag: number
  ): string[] {
    const recommendations: string[] = [];

    if (category.includes('evening')) {
      recommendations.push('Получайте яркий свет утром (выходите на улицу или используйте светотерапию)');
      recommendations.push('Избегайте яркого света и экранов вечером');
      recommendations.push('Ограничьте кофеин после 14:00');
      recommendations.push('Планируйте важные задачи на вторую половину дня');
    }

    if (category.includes('morning')) {
      recommendations.push('Избегайте слишком раннего отхода ко сну');
      recommendations.push('Поддерживайте активность вечером');
      recommendations.push('Планируйте важные задачи на утро');
    }

    if (socialJetlag > 1) {
      recommendations.push('Старайтесь просыпаться в выходные не более чем на 1 час позже будней');
      recommendations.push('Используйте световую терапию для синхронизации ритмов');
    }

    recommendations.push('Поддерживайте регулярный график сна 7 дней в неделю');
    recommendations.push('Получайте достаточно дневного света (30+ минут на улице)');

    return recommendations;
  }

  /**
   * Convert time string to hours
   */
  private timeToHours(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Convert hours to time string
   */
  private hoursToTime(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Get MEQ questionnaire items
   */
  getMEQQuestionnaire(): typeof MEQ_ITEMS {
    return MEQ_ITEMS;
  }
}

/**
 * Export singleton
 */
export const circadianAI = new CircadianAI();
