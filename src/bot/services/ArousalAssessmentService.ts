/**
 * ArousalAssessmentService (Wave 2 - Arousal-Based Therapy Selection)
 * ====================================================================
 * PSAS-inspired pre-sleep arousal assessment with cognitive/somatic subscales
 * and evidence-based third-wave therapy recommendation logic.
 *
 * Research Foundation:
 * - Nicassio et al. (1985): Pre-Sleep Arousal Scale (PSAS) — original instrument
 *   16 items, 2 subscales (cognitive 8 + somatic 8), 1-5 Likert
 * - Jansson-Fröjmark & Norell-Clarke (2012): Meta-analysis α=0.88
 * - Clinical cutoffs: cognitive ≥20, somatic ≥14 (Nicassio et al., 1985)
 * - Ong et al. (2014): MBT-I d=0.95 for cognitive arousal reduction
 * - Dalrymple et al. (2010): ACT-I acceptance-based arousal approach
 * - Wells (2009): MCT for rumination-driven arousal
 *
 * Third-Wave Therapy Selection Logic:
 * - High cognitive arousal (≥20) → MBT-I (strongest evidence for cognitive arousal, d=0.95)
 * - High somatic arousal (≥14) → Relaxation-focused + MBT-I body scan
 * - Both elevated → ACT-I (addresses both via psychological flexibility)
 * - Rumination pattern (cognitive ≫ somatic) → MCT
 *
 * NOTE: No published Russian PSAS validation was found as of Jan 2026.
 * Items translated for clinical use; formal validation is pending.
 * This is noted as a limitation and should be addressed in future research.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepState } from '../../sleep/interfaces/ISleepState';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * PSAS subscale type
 */
export type ArousalSubscale = 'cognitive' | 'somatic';

/**
 * Arousal severity level
 */
export type ArousalSeverity = 'low' | 'moderate' | 'high' | 'very_high';

/**
 * Third-wave therapy recommendation
 */
export type ThirdWaveRecommendation = 'mbti' | 'acti' | 'mct' | 'relaxation_focused';

/**
 * Individual PSAS-inspired item
 */
export interface IArousalItem {
  readonly number: number;
  readonly textRu: string;
  readonly textEn: string;
  readonly subscale: ArousalSubscale;
}

/**
 * User response to arousal item
 */
export interface IArousalResponse {
  readonly itemNumber: number;
  /** Response value (1-5): 1=Not at all, 5=Extremely */
  readonly value: 1 | 2 | 3 | 4 | 5;
}

/**
 * Arousal assessment result
 */
export interface IArousalResult {
  readonly id: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly responses: IArousalResponse[];
  readonly cognitiveScore: number;
  readonly somaticScore: number;
  readonly totalScore: number;
  readonly cognitiveSeverity: ArousalSeverity;
  readonly somaticSeverity: ArousalSeverity;
  readonly dominantArousal: ArousalSubscale | 'balanced';
  readonly recommendation: ITherapyRecommendation;
  readonly changeFromBaseline?: {
    readonly cognitiveChange: number;
    readonly somaticChange: number;
    readonly totalChange: number;
    readonly improved: boolean;
  };
}

/**
 * Therapy recommendation based on arousal profile
 */
export interface ITherapyRecommendation {
  readonly primary: ThirdWaveRecommendation;
  readonly secondary?: ThirdWaveRecommendation;
  readonly rationale: string;
  readonly rationaleRu: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Arousal profile derived from sleep history (without full questionnaire)
 */
export interface IArousalProfile {
  readonly available: boolean;
  readonly estimatedCognitive: number;
  readonly estimatedSomatic: number;
  readonly dominantArousal: ArousalSubscale | 'balanced';
  readonly trend: 'improving' | 'stable' | 'worsening';
  readonly recommendation: ITherapyRecommendation | null;
}

/**
 * Service configuration
 */
export interface IArousalAssessmentConfig {
  readonly enabled: boolean;
  /** Cognitive subscale clinical cutoff (Nicassio et al., 1985) */
  readonly cognitiveCutoff: number;
  /** Somatic subscale clinical cutoff (Nicassio et al., 1985) */
  readonly somaticCutoff: number;
  /** Clinically significant change threshold */
  readonly clinicallySignificantChange: number;
  /** Minimum sleep history days for profile estimation */
  readonly minDaysForProfile: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_AROUSAL_CONFIG: IArousalAssessmentConfig = {
  enabled: true,
  cognitiveCutoff: 20,
  somaticCutoff: 14,
  clinicallySignificantChange: 5,
  minDaysForProfile: 7,
};

/**
 * Response options
 */
export const AROUSAL_RESPONSE_OPTIONS = [
  { value: 1 as const, labelRu: 'Совсем нет', labelEn: 'Not at all' },
  { value: 2 as const, labelRu: 'Слегка', labelEn: 'Slightly' },
  { value: 3 as const, labelRu: 'Умеренно', labelEn: 'Moderately' },
  { value: 4 as const, labelRu: 'Значительно', labelEn: 'A lot' },
  { value: 5 as const, labelRu: 'Чрезвычайно', labelEn: 'Extremely' },
];

/**
 * PSAS-inspired items (16 items: 8 cognitive + 8 somatic)
 * Based on Nicassio et al. (1985)
 * NOTE: Russian translation not formally validated — see module docstring
 */
export const AROUSAL_ITEMS: IArousalItem[] = [
  // Cognitive subscale (8 items)
  { number: 1, subscale: 'cognitive', textRu: 'Не могу перестать думать', textEn: 'Can\'t shut off my thoughts' },
  { number: 2, subscale: 'cognitive', textRu: 'Беспокоюсь о проблемах', textEn: 'Worry about problems' },
  { number: 3, subscale: 'cognitive', textRu: 'Думаю о событиях дня', textEn: 'Review or ponder events of the day' },
  { number: 4, subscale: 'cognitive', textRu: 'Тревожусь о засыпании', textEn: 'Worry about falling asleep' },
  { number: 5, subscale: 'cognitive', textRu: 'Думаю о завтрашних делах', textEn: 'Think about things I need to do' },
  { number: 6, subscale: 'cognitive', textRu: 'Угнетён или расстроен', textEn: 'Depressed or anxious' },
  { number: 7, subscale: 'cognitive', textRu: 'Мысли скачут и не контролируются', textEn: 'Racing, uncontrollable thoughts' },
  { number: 8, subscale: 'cognitive', textRu: 'Мысленно активен, ум не успокаивается', textEn: 'Mentally alert, active mind' },

  // Somatic subscale (8 items)
  { number: 9, subscale: 'somatic', textRu: 'Учащённое сердцебиение', textEn: 'Heart beating fast' },
  { number: 10, subscale: 'somatic', textRu: 'Напряжение в мышцах', textEn: 'A tense, tight feeling in muscles' },
  { number: 11, subscale: 'somatic', textRu: 'Чувство нервозности в теле', textEn: 'A jittery, nervous feeling in body' },
  { number: 12, subscale: 'somatic', textRu: 'Одышка или затруднённое дыхание', textEn: 'Shortness of breath' },
  { number: 13, subscale: 'somatic', textRu: 'Холодные руки или ноги', textEn: 'Cold feeling in hands, feet, or body' },
  { number: 14, subscale: 'somatic', textRu: 'Дискомфорт в желудке', textEn: 'Have an upset stomach' },
  { number: 15, subscale: 'somatic', textRu: 'Потливость ладоней или тела', textEn: 'Perspiration in palms or body' },
  { number: 16, subscale: 'somatic', textRu: 'Сухость во рту', textEn: 'Dry feeling in mouth or throat' },
];

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * ArousalAssessmentService
 *
 * Provides PSAS-inspired pre-sleep arousal assessment and
 * evidence-based third-wave therapy recommendations.
 */
export class ArousalAssessmentService {
  private readonly config: IArousalAssessmentConfig;
  private readonly assessments: Map<string, IArousalResult[]> = new Map();

  constructor(config: Partial<IArousalAssessmentConfig> = {}) {
    this.config = { ...DEFAULT_AROUSAL_CONFIG, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): IArousalAssessmentConfig {
    return this.config;
  }

  // ==========================================================================
  // QUESTIONNAIRE ACCESS
  // ==========================================================================

  /**
   * Get all items in order
   */
  getItems(): IArousalItem[] {
    return [...AROUSAL_ITEMS].sort((a, b) => a.number - b.number);
  }

  /**
   * Get items by subscale
   */
  getItemsBySubscale(subscale: ArousalSubscale): IArousalItem[] {
    return AROUSAL_ITEMS.filter(i => i.subscale === subscale);
  }

  /**
   * Get response options
   */
  getResponseOptions(): typeof AROUSAL_RESPONSE_OPTIONS {
    return AROUSAL_RESPONSE_OPTIONS;
  }

  // ==========================================================================
  // ASSESSMENT SCORING
  // ==========================================================================

  /**
   * Score completed assessment
   *
   * @param userId - User ID
   * @param responses - 16 responses (1-5 each)
   * @returns Scored result with therapy recommendation
   */
  scoreAssessment(userId: string, responses: IArousalResponse[]): IArousalResult {
    if (responses.length !== 16) {
      throw new Error(`Expected 16 responses, got ${responses.length}`);
    }

    // Calculate subscale scores
    let cognitiveScore = 0;
    let somaticScore = 0;

    for (const response of responses) {
      const item = AROUSAL_ITEMS.find(i => i.number === response.itemNumber);
      if (!item) continue;
      if (item.subscale === 'cognitive') {
        cognitiveScore += response.value;
      } else {
        somaticScore += response.value;
      }
    }

    const totalScore = cognitiveScore + somaticScore;

    // Determine severity
    const cognitiveSeverity = this.getSeverity('cognitive', cognitiveScore);
    const somaticSeverity = this.getSeverity('somatic', somaticScore);

    // Determine dominant arousal type
    const dominantArousal = this.getDominantArousal(cognitiveScore, somaticScore);

    // Generate therapy recommendation
    const recommendation = this.generateRecommendation(
      cognitiveScore, somaticScore, dominantArousal
    );

    // Check baseline comparison
    const history = this.assessments.get(userId) ?? [];
    const baseline = history.length > 0 ? history[0] : null;
    const changeFromBaseline = baseline
      ? {
          cognitiveChange: cognitiveScore - baseline.cognitiveScore,
          somaticChange: somaticScore - baseline.somaticScore,
          totalChange: totalScore - baseline.totalScore,
          improved: totalScore < baseline.totalScore - this.config.clinicallySignificantChange,
        }
      : undefined;

    const result: IArousalResult = {
      id: `arousal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      responses,
      cognitiveScore,
      somaticScore,
      totalScore,
      cognitiveSeverity,
      somaticSeverity,
      dominantArousal,
      recommendation,
      changeFromBaseline,
    };

    // Store result
    history.push(result);
    this.assessments.set(userId, history);

    return result;
  }

  // ==========================================================================
  // AROUSAL PROFILE FROM SLEEP HISTORY
  // ==========================================================================

  /**
   * Estimate arousal profile from sleep history without full questionnaire.
   * Uses ISleepState.cognitions.preSleepArousal and sleepAnxiety as proxies.
   *
   * This is a lighter-weight alternative when full PSAS is not administered.
   */
  estimateArousalProfile(sleepHistory: ISleepState[]): IArousalProfile {
    if (sleepHistory.length < this.config.minDaysForProfile) {
      return {
        available: false,
        estimatedCognitive: 0,
        estimatedSomatic: 0,
        dominantArousal: 'balanced',
        trend: 'stable',
        recommendation: null,
      };
    }

    const recent = sleepHistory.slice(-7);

    // Estimate cognitive arousal from sleep anxiety + pre-sleep arousal
    // Scale from 0-1 ISleepState range to 8-40 PSAS range
    const avgCognitiveProxy = recent.reduce(
      (sum, s) => sum + (s.cognitions.sleepAnxiety * 0.5 + s.cognitions.preSleepArousal * 0.5),
      0
    ) / recent.length;
    const estimatedCognitive = Math.round(8 + avgCognitiveProxy * 32);

    // Estimate somatic arousal from sleep onset latency and pre-sleep arousal
    // Long SOL often correlates with somatic hyperarousal
    const avgSOLNorm = Math.min(1, recent.reduce(
      (sum, s) => sum + s.metrics.sleepOnsetLatency, 0
    ) / recent.length / 60);
    const avgSomaticProxy = avgSOLNorm * 0.4 + avgCognitiveProxy * 0.3;
    const estimatedSomatic = Math.round(8 + avgSomaticProxy * 32);

    const dominantArousal = this.getDominantArousal(estimatedCognitive, estimatedSomatic);

    // Calculate trend
    const trend = this.calculateTrend(sleepHistory);

    // Generate recommendation only if above cutoffs
    const aboveCognitiveCutoff = estimatedCognitive >= this.config.cognitiveCutoff;
    const aboveSomaticCutoff = estimatedSomatic >= this.config.somaticCutoff;

    const recommendation = (aboveCognitiveCutoff || aboveSomaticCutoff)
      ? this.generateRecommendation(estimatedCognitive, estimatedSomatic, dominantArousal)
      : null;

    return {
      available: true,
      estimatedCognitive,
      estimatedSomatic,
      dominantArousal,
      trend,
      recommendation,
    };
  }

  // ==========================================================================
  // HISTORY AND STATISTICS
  // ==========================================================================

  /**
   * Get user's assessment history
   */
  getHistory(userId: string): IArousalResult[] {
    return this.assessments.get(userId) ?? [];
  }

  /**
   * Get latest assessment
   */
  getLatestAssessment(userId: string): IArousalResult | null {
    const history = this.getHistory(userId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get baseline assessment
   */
  getBaseline(userId: string): IArousalResult | null {
    const history = this.getHistory(userId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Check if assessment is due (recommended every 2 weeks)
   */
  isAssessmentDue(userId: string, weeksInterval: number = 2): boolean {
    const latest = this.getLatestAssessment(userId);
    if (!latest) return true;

    const daysSinceLatest = (Date.now() - new Date(latest.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);

    return daysSinceLatest >= weeksInterval * 7;
  }

  /**
   * Get score trend over assessments
   */
  getScoreTrend(userId: string): {
    dates: Date[];
    cognitiveScores: number[];
    somaticScores: number[];
    totalScores: number[];
  } {
    const history = this.getHistory(userId);
    return {
      dates: history.map(h => new Date(h.timestamp)),
      cognitiveScores: history.map(h => h.cognitiveScore),
      somaticScores: history.map(h => h.somaticScore),
      totalScores: history.map(h => h.totalScore),
    };
  }

  /**
   * Reset user data
   */
  resetUserData(userId: string): void {
    this.assessments.delete(userId);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Determine severity level from subscale score
   * Cognitive range: 8-40, cutoff: 20
   * Somatic range: 8-40, cutoff: 14
   */
  private getSeverity(subscale: ArousalSubscale, score: number): ArousalSeverity {
    const cutoff = subscale === 'cognitive'
      ? this.config.cognitiveCutoff
      : this.config.somaticCutoff;

    // Ranges based on distance from cutoff
    if (score < cutoff * 0.7) return 'low';
    if (score < cutoff) return 'moderate';
    if (score < cutoff * 1.5) return 'high';
    return 'very_high';
  }

  /**
   * Determine dominant arousal type
   */
  private getDominantArousal(
    cognitiveScore: number,
    somaticScore: number
  ): ArousalSubscale | 'balanced' {
    // Normalize to same scale for comparison
    const cogNorm = cognitiveScore / this.config.cognitiveCutoff;
    const somNorm = somaticScore / this.config.somaticCutoff;

    const diff = Math.abs(cogNorm - somNorm);
    if (diff < 0.2) return 'balanced';
    return cogNorm > somNorm ? 'cognitive' : 'somatic';
  }

  /**
   * Generate therapy recommendation based on arousal profile
   *
   * Evidence-based selection logic:
   * - Cognitive dominant → MBT-I (Ong et al., 2014: d=0.95 for cognitive arousal)
   * - Somatic dominant → Relaxation-focused (PMR, body scan) + MBT-I
   * - Balanced/both elevated → ACT-I (addresses both via acceptance)
   * - Rumination pattern (very high cognitive) → MCT (Wells, 2009)
   */
  private generateRecommendation(
    cognitiveScore: number,
    somaticScore: number,
    dominantArousal: ArousalSubscale | 'balanced'
  ): ITherapyRecommendation {
    const cogAboveCutoff = cognitiveScore >= this.config.cognitiveCutoff;
    const somAboveCutoff = somaticScore >= this.config.somaticCutoff;

    // Very high cognitive with racing thoughts pattern → MCT
    if (cognitiveScore >= this.config.cognitiveCutoff * 1.5) {
      return {
        primary: 'mct',
        secondary: 'mbti',
        rationale: 'Very high cognitive arousal with racing thoughts pattern. MCT targets this directly through attention training and detached mindfulness.',
        rationaleRu: 'Очень высокое когнитивное возбуждение с паттерном навязчивых мыслей. МКТ нацелена на это через тренировку внимания и отстранённую осознанность.',
        confidence: 'high',
      };
    }

    // Both elevated → ACT-I
    if (cogAboveCutoff && somAboveCutoff) {
      return {
        primary: 'acti',
        secondary: dominantArousal === 'cognitive' ? 'mbti' : 'relaxation_focused',
        rationale: 'Both cognitive and somatic arousal are elevated. ACT-I addresses both through psychological flexibility and acceptance.',
        rationaleRu: 'Когнитивное и соматическое возбуждение повышены. ACT-I работает с обоими через психологическую гибкость и принятие.',
        confidence: 'high',
      };
    }

    // Cognitive dominant → MBT-I
    if (dominantArousal === 'cognitive' && cogAboveCutoff) {
      return {
        primary: 'mbti',
        secondary: 'mct',
        rationale: 'Predominantly cognitive arousal. MBT-I shows strong effect (d=0.95) for cognitive arousal reduction through mindfulness meditation.',
        rationaleRu: 'Преимущественно когнитивное возбуждение. MBT-I показывает сильный эффект (d=0.95) снижения когнитивного возбуждения через медитацию осознанности.',
        confidence: 'high',
      };
    }

    // Somatic dominant → Relaxation + MBT-I body scan
    if (dominantArousal === 'somatic' && somAboveCutoff) {
      return {
        primary: 'relaxation_focused',
        secondary: 'mbti',
        rationale: 'Predominantly somatic arousal. Relaxation techniques (PMR, body scan) target physiological hyperarousal directly.',
        rationaleRu: 'Преимущественно соматическое возбуждение. Техники релаксации (ПМР, сканирование тела) направлены на физиологическую гиперактивацию.',
        confidence: 'medium',
      };
    }

    // Below cutoffs — general recommendation
    return {
      primary: 'mbti',
      rationale: 'Arousal levels are below clinical cutoffs. MBT-I recommended as general preventive approach.',
      rationaleRu: 'Уровни возбуждения ниже клинических порогов. MBT-I рекомендуется как общий профилактический подход.',
      confidence: 'low',
    };
  }

  /**
   * Calculate arousal trend from sleep history
   */
  private calculateTrend(sleepHistory: ISleepState[]): 'improving' | 'stable' | 'worsening' {
    if (sleepHistory.length < 7) return 'stable';

    const firstHalf = sleepHistory.slice(0, Math.floor(sleepHistory.length / 2));
    const secondHalf = sleepHistory.slice(Math.floor(sleepHistory.length / 2));

    const avgFirst = firstHalf.reduce(
      (sum, s) => sum + s.cognitions.preSleepArousal, 0
    ) / firstHalf.length;

    const avgSecond = secondHalf.reduce(
      (sum, s) => sum + s.cognitions.preSleepArousal, 0
    ) / secondHalf.length;

    const change = avgSecond - avgFirst;
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'worsening';
    return 'stable';
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create ArousalAssessmentService instance
 */
export function createArousalAssessmentService(
  config?: Partial<IArousalAssessmentConfig>
): ArousalAssessmentService {
  return new ArousalAssessmentService(config);
}

/**
 * Singleton instance
 */
export const arousalAssessmentService = new ArousalAssessmentService();
