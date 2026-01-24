/**
 * MCQ30AssessmentService (Sprint 7 - MCT Module)
 * ================================================
 * Implements the Russian-validated Metacognitions Questionnaire (MCQ-30).
 *
 * Research Foundation:
 * - Wells & Cartwright-Hatton (2004): Original MCQ-30
 * - Сирота, Московченко, Ялтонский (2018): Russian validation
 *   Published in: "Психология. Журнал ВШЭ", 2018, №2
 *
 * Five Subscales:
 * 1. Positive Beliefs about Worry (POS) - Items 1, 7, 10, 19, 23, 28
 * 2. Negative Beliefs (Uncontrollability/Danger) (NEG) - Items 2, 4, 9, 11, 15, 21
 * 3. Cognitive Confidence (CC) - Items 8, 14, 17, 24, 26, 29
 * 4. Need to Control Thoughts (NC) - Items 6, 13, 20, 22, 25, 27
 * 5. Cognitive Self-Consciousness (CSC) - Items 3, 5, 12, 16, 18, 30
 *
 * Scoring: Each item 1-4 (Do not agree - Agree very much)
 * Subscale scores: Sum of items (range 6-24)
 * Total score: Sum of all subscales (range 30-120)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * MCQ-30 subscale names
 */
export type MCQ30Subscale =
  | 'positive_beliefs'       // POS
  | 'uncontrollability'      // NEG
  | 'cognitive_confidence'   // CC
  | 'need_to_control'        // NC
  | 'cognitive_self_consciousness'; // CSC

/**
 * Individual MCQ-30 item
 */
export interface IMCQ30Item {
  /** Item number (1-30) */
  readonly number: number;
  /** Russian text */
  readonly textRu: string;
  /** Original English text */
  readonly textEn: string;
  /** Which subscale this item belongs to */
  readonly subscale: MCQ30Subscale;
}

/**
 * User response to MCQ-30 item
 */
export interface IMCQ30Response {
  /** Item number */
  readonly itemNumber: number;
  /** Response value (1-4) */
  readonly value: 1 | 2 | 3 | 4;
}

/**
 * MCQ-30 assessment result
 */
export interface IMCQ30Result {
  /** Assessment ID */
  readonly id: string;
  /** User ID */
  readonly userId: string;
  /** Timestamp */
  readonly timestamp: Date;
  /** All responses */
  readonly responses: IMCQ30Response[];
  /** Subscale scores */
  readonly subscaleScores: Record<MCQ30Subscale, number>;
  /** Total score */
  readonly totalScore: number;
  /** Interpretation */
  readonly interpretation: {
    readonly overall: 'low' | 'moderate' | 'high' | 'very_high';
    readonly concernAreas: MCQ30Subscale[];
    readonly summaryRu: string;
    readonly recommendations: string[];
  };
  /** Comparison to baseline (if available) */
  readonly changeFromBaseline?: {
    readonly totalChange: number;
    readonly subscaleChanges: Partial<Record<MCQ30Subscale, number>>;
    readonly improved: boolean;
  };
}

/**
 * Subscale information
 */
export interface ISubscaleInfo {
  /** Subscale key */
  readonly key: MCQ30Subscale;
  /** Russian name */
  readonly nameRu: string;
  /** English name */
  readonly nameEn: string;
  /** Item numbers in this subscale */
  readonly items: number[];
  /** Threshold for concern */
  readonly concernThreshold: number;
  /** Description */
  readonly descriptionRu: string;
}

/**
 * MCQ-30 configuration
 */
export interface IMCQ30Config {
  /** Enable service */
  readonly enabled: boolean;
  /** High score threshold (total) */
  readonly highScoreThreshold: number;
  /** Very high score threshold (total) */
  readonly veryHighScoreThreshold: number;
  /** Clinically significant change */
  readonly clinicallySignificantChange: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_MCQ30_CONFIG: IMCQ30Config = {
  enabled: true,
  highScoreThreshold: 65,
  veryHighScoreThreshold: 80,
  clinicallySignificantChange: 10,
};

/**
 * Response options (Russian)
 */
export const MCQ30_RESPONSE_OPTIONS = [
  { value: 1 as const, labelRu: 'Не согласен', labelEn: 'Do not agree' },
  { value: 2 as const, labelRu: 'Слегка согласен', labelEn: 'Agree slightly' },
  { value: 3 as const, labelRu: 'Согласен в средней степени', labelEn: 'Agree moderately' },
  { value: 4 as const, labelRu: 'Полностью согласен', labelEn: 'Agree very much' },
];

/**
 * Subscale definitions
 */
export const MCQ30_SUBSCALES: ISubscaleInfo[] = [
  {
    key: 'positive_beliefs',
    nameRu: 'Позитивные убеждения о беспокойстве',
    nameEn: 'Positive Beliefs about Worry',
    items: [1, 7, 10, 19, 23, 28],
    concernThreshold: 14,
    descriptionRu: 'Убеждения, что беспокойство помогает справляться и быть готовым.',
  },
  {
    key: 'uncontrollability',
    nameRu: 'Негативные убеждения о неконтролируемости и опасности',
    nameEn: 'Negative Beliefs (Uncontrollability/Danger)',
    items: [2, 4, 9, 11, 15, 21],
    concernThreshold: 14,
    descriptionRu: 'Убеждения, что мысли опасны и неконтролируемы.',
  },
  {
    key: 'cognitive_confidence',
    nameRu: 'Когнитивная уверенность',
    nameEn: 'Cognitive Confidence',
    items: [8, 14, 17, 24, 26, 29],
    concernThreshold: 14,
    descriptionRu: 'Уверенность в собственной памяти и внимании (низкая = проблема).',
  },
  {
    key: 'need_to_control',
    nameRu: 'Необходимость контролировать мысли',
    nameEn: 'Need to Control Thoughts',
    items: [6, 13, 20, 22, 25, 27],
    concernThreshold: 14,
    descriptionRu: 'Убеждения, что мысли нужно контролировать и подавлять.',
  },
  {
    key: 'cognitive_self_consciousness',
    nameRu: 'Когнитивное самосознание',
    nameEn: 'Cognitive Self-Consciousness',
    items: [3, 5, 12, 16, 18, 30],
    concernThreshold: 16,
    descriptionRu: 'Склонность фокусироваться на собственных мыслительных процессах.',
  },
];

/**
 * MCQ-30 Items (Russian validated version)
 * Source: Сирота, Московченко, Ялтонский (2018)
 */
export const MCQ30_ITEMS: IMCQ30Item[] = [
  // Positive Beliefs about Worry (POS)
  { number: 1, subscale: 'positive_beliefs', textRu: 'Беспокойство помогает мне избегать проблем в будущем.', textEn: 'Worrying helps me to avoid problems in the future.' },
  { number: 7, subscale: 'positive_beliefs', textRu: 'Мне нужно беспокоиться, чтобы оставаться организованным.', textEn: 'I need to worry in order to remain organized.' },
  { number: 10, subscale: 'positive_beliefs', textRu: 'Беспокойство помогает мне справляться.', textEn: 'Worrying helps me to cope.' },
  { number: 19, subscale: 'positive_beliefs', textRu: 'Беспокойство помогает мне решать проблемы.', textEn: 'Worrying helps me to solve problems.' },
  { number: 23, subscale: 'positive_beliefs', textRu: 'Беспокойство помогает мне быть готовым.', textEn: 'Worrying helps me get things sorted out in my mind.' },
  { number: 28, subscale: 'positive_beliefs', textRu: 'Мне нужно беспокоиться, чтобы хорошо работать.', textEn: 'I need to worry in order to work well.' },

  // Negative Beliefs - Uncontrollability/Danger (NEG)
  { number: 2, subscale: 'uncontrollability', textRu: 'Моё беспокойство опасно для меня.', textEn: 'My worrying is dangerous for me.' },
  { number: 4, subscale: 'uncontrollability', textRu: 'Мне трудно контролировать своё беспокойство.', textEn: 'I could make myself sick with worrying.' },
  { number: 9, subscale: 'uncontrollability', textRu: 'Моё беспокойство может свести меня с ума.', textEn: 'My worrying could make me go mad.' },
  { number: 11, subscale: 'uncontrollability', textRu: 'Я не могу игнорировать свои тревожные мысли.', textEn: 'I cannot ignore my worrying thoughts.' },
  { number: 15, subscale: 'uncontrollability', textRu: 'Моё беспокойство может повредить моему здоровью.', textEn: 'My worrying thoughts persist, no matter how I try to stop them.' },
  { number: 21, subscale: 'uncontrollability', textRu: 'Когда я начинаю беспокоиться, я не могу остановиться.', textEn: 'When I start worrying, I cannot stop.' },

  // Cognitive Confidence (CC)
  { number: 8, subscale: 'cognitive_confidence', textRu: 'У меня плохая память.', textEn: 'I have a poor memory.' },
  { number: 14, subscale: 'cognitive_confidence', textRu: 'Моя память может вводить меня в заблуждение.', textEn: 'My memory can mislead me at times.' },
  { number: 17, subscale: 'cognitive_confidence', textRu: 'У меня плохая память на слова и имена.', textEn: 'I have a poor memory for words and names.' },
  { number: 24, subscale: 'cognitive_confidence', textRu: 'Я не доверяю своей памяти.', textEn: 'I do not trust my memory.' },
  { number: 26, subscale: 'cognitive_confidence', textRu: 'У меня плохая память на места.', textEn: 'I have a poor memory for places.' },
  { number: 29, subscale: 'cognitive_confidence', textRu: 'У меня плохое внимание.', textEn: 'I have little confidence in my memory for actions.' },

  // Need to Control Thoughts (NC)
  { number: 6, subscale: 'need_to_control', textRu: 'Если я не контролирую тревожную мысль, а потом она сбудется, это будет моя вина.', textEn: 'If I did not control a worrying thought, and then it happened, it would be my fault.' },
  { number: 13, subscale: 'need_to_control', textRu: 'Я должен постоянно контролировать свои мысли.', textEn: 'I should be in control of my thoughts all of the time.' },
  { number: 20, subscale: 'need_to_control', textRu: 'Важно держать свои мысли под контролем.', textEn: 'Not being able to control my thoughts is a sign of weakness.' },
  { number: 22, subscale: 'need_to_control', textRu: 'Я буду наказан за то, что не контролирую некоторые мысли.', textEn: 'I will be punished for not controlling certain thoughts.' },
  { number: 25, subscale: 'need_to_control', textRu: 'Необходимо контролировать свои мысли.', textEn: 'It is bad to think certain thoughts.' },
  { number: 27, subscale: 'need_to_control', textRu: 'Если я не контролирую свои мысли, я не смогу функционировать.', textEn: 'If I could not control my thoughts, I would not be able to function.' },

  // Cognitive Self-Consciousness (CSC)
  { number: 3, subscale: 'cognitive_self_consciousness', textRu: 'Я много думаю о своих мыслях.', textEn: 'I think a lot about my thoughts.' },
  { number: 5, subscale: 'cognitive_self_consciousness', textRu: 'Я осознаю, как работает мой разум, когда обдумываю проблему.', textEn: 'I am aware of the way my mind works when I am thinking through a problem.' },
  { number: 12, subscale: 'cognitive_self_consciousness', textRu: 'Я контролирую свои мысли.', textEn: 'I monitor my thoughts.' },
  { number: 16, subscale: 'cognitive_self_consciousness', textRu: 'Я постоянно осознаю своё мышление.', textEn: 'I am constantly aware of my thinking.' },
  { number: 18, subscale: 'cognitive_self_consciousness', textRu: 'Я внимательно слежу за своими мыслями.', textEn: 'I pay close attention to the way my mind works.' },
  { number: 30, subscale: 'cognitive_self_consciousness', textRu: 'Я постоянно анализирую свои мысли.', textEn: 'I constantly examine my thoughts.' },
];

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * MCQ30AssessmentService
 * Administers and scores the MCQ-30 metacognitions questionnaire
 */
export class MCQ30AssessmentService {
  private readonly config: IMCQ30Config;
  private readonly assessments: Map<string, IMCQ30Result[]> = new Map();

  constructor(config: Partial<IMCQ30Config> = {}) {
    this.config = { ...DEFAULT_MCQ30_CONFIG, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): IMCQ30Config {
    return this.config;
  }

  // ==========================================================================
  // QUESTIONNAIRE ACCESS
  // ==========================================================================

  /**
   * Get all items in order
   */
  getItems(): IMCQ30Item[] {
    return [...MCQ30_ITEMS].sort((a, b) => a.number - b.number);
  }

  /**
   * Get single item by number
   */
  getItem(itemNumber: number): IMCQ30Item | undefined {
    return MCQ30_ITEMS.find(i => i.number === itemNumber);
  }

  /**
   * Get response options
   */
  getResponseOptions(): typeof MCQ30_RESPONSE_OPTIONS {
    return MCQ30_RESPONSE_OPTIONS;
  }

  /**
   * Get subscale information
   */
  getSubscaleInfo(subscale: MCQ30Subscale): ISubscaleInfo | undefined {
    return MCQ30_SUBSCALES.find(s => s.key === subscale);
  }

  /**
   * Get all subscales
   */
  getSubscales(): ISubscaleInfo[] {
    return [...MCQ30_SUBSCALES];
  }

  // ==========================================================================
  // ASSESSMENT SCORING
  // ==========================================================================

  /**
   * Score completed assessment
   */
  scoreAssessment(userId: string, responses: IMCQ30Response[]): IMCQ30Result {
    // Validate responses
    if (responses.length !== 30) {
      throw new Error(`Expected 30 responses, got ${responses.length}`);
    }

    // Calculate subscale scores
    const subscaleScores: Record<MCQ30Subscale, number> = {
      positive_beliefs: 0,
      uncontrollability: 0,
      cognitive_confidence: 0,
      need_to_control: 0,
      cognitive_self_consciousness: 0,
    };

    for (const response of responses) {
      const item = this.getItem(response.itemNumber);
      if (item) {
        subscaleScores[item.subscale] += response.value;
      }
    }

    // Calculate total score
    const totalScore = Object.values(subscaleScores).reduce((a, b) => a + b, 0);

    // Generate interpretation
    const interpretation = this.interpretScores(subscaleScores, totalScore);

    // Check for baseline comparison
    const previousAssessments = this.assessments.get(userId) ?? [];
    const baseline = previousAssessments.length > 0 ? previousAssessments[0] : null;
    const changeFromBaseline = baseline
      ? this.calculateChange(baseline, subscaleScores, totalScore)
      : undefined;

    // Create result
    const result: IMCQ30Result = {
      id: `mcq30_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      responses,
      subscaleScores,
      totalScore,
      interpretation,
      changeFromBaseline,
    };

    // Store result
    previousAssessments.push(result);
    this.assessments.set(userId, previousAssessments);

    return result;
  }

  /**
   * Interpret scores
   */
  private interpretScores(
    subscaleScores: Record<MCQ30Subscale, number>,
    totalScore: number
  ): IMCQ30Result['interpretation'] {
    // Determine overall level
    let overall: 'low' | 'moderate' | 'high' | 'very_high';
    if (totalScore < 45) {
      overall = 'low';
    } else if (totalScore < this.config.highScoreThreshold) {
      overall = 'moderate';
    } else if (totalScore < this.config.veryHighScoreThreshold) {
      overall = 'high';
    } else {
      overall = 'very_high';
    }

    // Identify concern areas
    const concernAreas: MCQ30Subscale[] = [];
    for (const subscale of MCQ30_SUBSCALES) {
      if (subscaleScores[subscale.key] >= subscale.concernThreshold) {
        concernAreas.push(subscale.key);
      }
    }

    // Generate summary
    const summaryRu = this.generateSummary(overall, concernAreas, subscaleScores);

    // Generate recommendations
    const recommendations = this.generateRecommendations(concernAreas, subscaleScores);

    return {
      overall,
      concernAreas,
      summaryRu,
      recommendations,
    };
  }

  /**
   * Generate Russian summary
   */
  private generateSummary(
    overall: 'low' | 'moderate' | 'high' | 'very_high',
    concernAreas: MCQ30Subscale[],
    _scores: Record<MCQ30Subscale, number>
  ): string {
    const levelDescriptions = {
      low: 'Ваши метакогнитивные убеждения находятся в нормальном диапазоне.',
      moderate: 'Выявлены умеренно выраженные метакогнитивные особенности.',
      high: 'Выявлены выраженные метакогнитивные убеждения, которые могут влиять на сон.',
      very_high: 'Выявлены значительно выраженные метакогнитивные убеждения. Рекомендуется работа с этими паттернами.',
    };

    let summary = levelDescriptions[overall];

    if (concernAreas.length > 0) {
      const areaNames = concernAreas.map(area => {
        const info = MCQ30_SUBSCALES.find(s => s.key === area);
        return info?.nameRu.toLowerCase() ?? area;
      });

      if (areaNames.length === 1) {
        summary += ` Особое внимание: ${areaNames[0]}.`;
      } else {
        summary += ` Области для внимания: ${areaNames.join(', ')}.`;
      }
    }

    return summary;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(
    concernAreas: MCQ30Subscale[],
    _scores: Record<MCQ30Subscale, number>
  ): string[] {
    const recommendations: string[] = [];

    if (concernAreas.includes('positive_beliefs')) {
      recommendations.push(
        'Исследуйте: действительно ли беспокойство помогает вам решать проблемы?'
      );
      recommendations.push(
        'Попробуйте эксперимент: день без намеренного беспокойства.'
      );
    }

    if (concernAreas.includes('uncontrollability')) {
      recommendations.push(
        'Практикуйте технику откладывания беспокойства — она показывает, что беспокойство можно контролировать.'
      );
      recommendations.push(
        'Отстранённая осознанность поможет увидеть, что мысли не опасны сами по себе.'
      );
    }

    if (concernAreas.includes('cognitive_confidence')) {
      recommendations.push(
        'Низкая уверенность в памяти может вести к чрезмерной проверке. Попробуйте доверять первому воспоминанию.'
      );
    }

    if (concernAreas.includes('need_to_control')) {
      recommendations.push(
        'Попытка контролировать мысли часто усиливает их. Попробуйте позволить мыслям быть.'
      );
      recommendations.push(
        'Практикуйте отстранённую осознанность: наблюдайте мысли без вмешательства.'
      );
    }

    if (concernAreas.includes('cognitive_self_consciousness')) {
      recommendations.push(
        'Высокое самосознание о мыслях нормально, но чрезмерный мониторинг может утомлять.'
      );
      recommendations.push(
        'Техника тренировки внимания (ATT) поможет направлять внимание вовне.'
      );
    }

    // General recommendations if no specific concerns
    if (recommendations.length === 0) {
      recommendations.push(
        'Ваши метакогнитивные показатели в норме. Продолжайте практиковать техники MCT для профилактики.'
      );
    }

    return recommendations.slice(0, 4); // Max 4 recommendations
  }

  /**
   * Calculate change from baseline
   */
  private calculateChange(
    baseline: IMCQ30Result,
    currentScores: Record<MCQ30Subscale, number>,
    currentTotal: number
  ): IMCQ30Result['changeFromBaseline'] {
    const totalChange = currentTotal - baseline.totalScore;

    const subscaleChanges: Partial<Record<MCQ30Subscale, number>> = {};
    for (const subscale of MCQ30_SUBSCALES) {
      const change = currentScores[subscale.key] - baseline.subscaleScores[subscale.key];
      if (Math.abs(change) >= 2) { // Only report meaningful changes
        subscaleChanges[subscale.key] = change;
      }
    }

    const improved = totalChange < -this.config.clinicallySignificantChange;

    return {
      totalChange,
      subscaleChanges,
      improved,
    };
  }

  // ==========================================================================
  // HISTORY AND STATISTICS
  // ==========================================================================

  /**
   * Get user's assessment history
   */
  getHistory(userId: string): IMCQ30Result[] {
    return this.assessments.get(userId) ?? [];
  }

  /**
   * Get latest assessment
   */
  getLatestAssessment(userId: string): IMCQ30Result | null {
    const history = this.getHistory(userId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get baseline assessment
   */
  getBaseline(userId: string): IMCQ30Result | null {
    const history = this.getHistory(userId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Check if assessment is due (recommended every 4 weeks)
   */
  isAssessmentDue(userId: string, weeksInterval: number = 4): boolean {
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
    totalScores: number[];
    subscaleScores: Record<MCQ30Subscale, number[]>;
  } {
    const history = this.getHistory(userId);

    const result = {
      dates: [] as Date[],
      totalScores: [] as number[],
      subscaleScores: {
        positive_beliefs: [] as number[],
        uncontrollability: [] as number[],
        cognitive_confidence: [] as number[],
        need_to_control: [] as number[],
        cognitive_self_consciousness: [] as number[],
      },
    };

    for (const assessment of history) {
      result.dates.push(new Date(assessment.timestamp));
      result.totalScores.push(assessment.totalScore);

      for (const subscale of MCQ30_SUBSCALES) {
        result.subscaleScores[subscale.key].push(assessment.subscaleScores[subscale.key]);
      }
    }

    return result;
  }

  // ==========================================================================
  // CSD INTEGRATION
  // ==========================================================================

  /**
   * Get metacognitive risk score for CSD integration
   */
  getMetacognitiveRiskForCSD(userId: string): {
    available: boolean;
    overallRisk: number;
    subscaleRisks: Partial<Record<MCQ30Subscale, number>>;
    trend: 'improving' | 'stable' | 'worsening';
    lastAssessmentDate?: Date;
  } {
    const history = this.getHistory(userId);

    if (history.length === 0) {
      return {
        available: false,
        overallRisk: 0,
        subscaleRisks: {},
        trend: 'stable',
      };
    }

    const latest = history[history.length - 1];

    // Normalize total score to 0-1 risk
    const overallRisk = Math.min(1, Math.max(0, (latest.totalScore - 30) / 90));

    // Normalize subscale scores to 0-1 risk
    const subscaleRisks: Partial<Record<MCQ30Subscale, number>> = {};
    for (const subscale of MCQ30_SUBSCALES) {
      const score = latest.subscaleScores[subscale.key];
      if (score >= subscale.concernThreshold) {
        subscaleRisks[subscale.key] = Math.min(1, (score - 6) / 18);
      }
    }

    // Calculate trend
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (history.length >= 2) {
      const previous = history[history.length - 2];
      const change = latest.totalScore - previous.totalScore;

      if (change < -5) trend = 'improving';
      else if (change > 5) trend = 'worsening';
    }

    return {
      available: true,
      overallRisk,
      subscaleRisks,
      trend,
      lastAssessmentDate: new Date(latest.timestamp),
    };
  }

  /**
   * Reset user data
   */
  resetUserData(userId: string): void {
    this.assessments.delete(userId);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create MCQ30AssessmentService instance
 */
export function createMCQ30AssessmentService(
  config?: Partial<IMCQ30Config>
): MCQ30AssessmentService {
  return new MCQ30AssessmentService(config);
}

/**
 * Singleton instance
 */
export const mcq30AssessmentService = new MCQ30AssessmentService();
