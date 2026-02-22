/**
 * @fileoverview Trend Analysis
 * @module research/analyzers/TrendAnalyzer
 * @description Анализ трендов в исследованиях инсомнии
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchResult,
  ITrend,
  ResearchCategory,
} from '../types';

/**
 * Точка данных для тренда
 */
interface TrendDataPoint {
  date: Date;
  count: number;
  results: IResearchResult[];
}

/**
 * Сырой тренд для анализа
 */
interface RawTrend {
  keyword: string;
  category: ResearchCategory;
  dataPoints: TrendDataPoint[];
  totalMentions: number;
  recentMentions: number;
  growthRate: number;
}

/**
 * Анализатор трендов
 */
export class TrendAnalyzer {
  /**
   * Ключевые темы для отслеживания
   */
  private readonly trackedTopics: Array<{
    keyword: string;
    aliases: string[];
    category: ResearchCategory;
    sleepCoreRelevance: string;
  }> = [
    // CBT-I
    {
      keyword: 'digital CBT-I',
      aliases: ['dCBT-I', 'internet CBT-I', 'iCBT-I', 'online CBT'],
      category: ResearchCategory.CBT_I,
      sleepCoreRelevance: 'Core therapy delivery method',
    },
    {
      keyword: 'sleep restriction therapy',
      aliases: ['SRT', 'time in bed restriction', 'TIB restriction'],
      category: ResearchCategory.CBT_I,
      sleepCoreRelevance: 'Primary CBT-I component (SleepRestrictionEngine)',
    },
    {
      keyword: 'stimulus control',
      aliases: ['sleep stimulus', 'bed association'],
      category: ResearchCategory.CBT_I,
      sleepCoreRelevance: 'Primary CBT-I component (StimulusControlEngine)',
    },

    // Third-Wave
    {
      keyword: 'mindfulness insomnia',
      aliases: ['MBT-I', 'MBSR sleep', 'mindfulness sleep'],
      category: ResearchCategory.THIRD_WAVE,
      sleepCoreRelevance: 'Third-wave therapy (MBTIEngine)',
    },
    {
      keyword: 'ACT insomnia',
      aliases: ['acceptance commitment therapy sleep', 'ACT-I'],
      category: ResearchCategory.THIRD_WAVE,
      sleepCoreRelevance: 'Third-wave therapy (ACTIEngine)',
    },
    {
      keyword: 'metacognitive therapy',
      aliases: ['MCT sleep', 'MCT insomnia', 'metacognition'],
      category: ResearchCategory.THIRD_WAVE,
      sleepCoreRelevance: 'Third-wave therapy (MCTEngine)',
    },

    // AI/ML
    {
      keyword: 'machine learning sleep',
      aliases: ['ML sleep', 'AI sleep', 'deep learning sleep'],
      category: ResearchCategory.AI_ML,
      sleepCoreRelevance: 'Prediction models (SleepPredictionService)',
    },
    {
      keyword: 'digital twin health',
      aliases: ['patient digital twin', 'personalized simulation'],
      category: ResearchCategory.DIGITAL_TWIN,
      sleepCoreRelevance: 'Core differentiator (DigitalTwinService)',
    },
    {
      keyword: 'reinforcement learning therapy',
      aliases: ['RL adaptive', 'bandit therapy', 'adaptive intervention'],
      category: ResearchCategory.AI_ML,
      sleepCoreRelevance: 'POMDP + Thompson Sampling approach',
    },
    {
      keyword: 'just-in-time adaptive intervention',
      aliases: ['JITAI', 'micro-intervention'],
      category: ResearchCategory.AI_ML,
      sleepCoreRelevance: 'Proactive notification system',
    },

    // Wearables & Biomarkers
    {
      keyword: 'wearable sleep',
      aliases: ['smartwatch sleep', 'fitness tracker sleep', 'actigraphy'],
      category: ResearchCategory.WEARABLES,
      sleepCoreRelevance: 'Data input (WearableIntegrationService)',
    },
    {
      keyword: 'HRV sleep',
      aliases: ['heart rate variability', 'cardiac sleep'],
      category: ResearchCategory.BIOMARKERS,
      sleepCoreRelevance: 'Potential biomarker integration',
    },
    {
      keyword: 'sleep EEG',
      aliases: ['polysomnography', 'sleep stage classification'],
      category: ResearchCategory.NEUROSCIENCE,
      sleepCoreRelevance: 'Sleep stage prediction algorithms',
    },

    // Digital Therapeutics
    {
      keyword: 'digital therapeutics',
      aliases: ['DTx', 'prescription digital therapeutic', 'PDT'],
      category: ResearchCategory.MARKET,
      sleepCoreRelevance: 'Market category for SleepCore',
    },
    {
      keyword: 'DiGA',
      aliases: ['Digitale Gesundheitsanwendungen', 'German DTx'],
      category: ResearchCategory.REGULATORY,
      sleepCoreRelevance: 'European regulatory pathway',
    },

    // Chronobiology
    {
      keyword: 'circadian rhythm',
      aliases: ['circadian', 'chronotype', 'internal clock'],
      category: ResearchCategory.CHRONOBIOLOGY,
      sleepCoreRelevance: 'ChronotypeService for personalization',
    },
    {
      keyword: 'light therapy sleep',
      aliases: ['bright light therapy', 'phototherapy'],
      category: ResearchCategory.CHRONOBIOLOGY,
      sleepCoreRelevance: 'Potential intervention recommendation',
    },
  ];

  /**
   * Анализировать тренды
   */
  analyzeTrends(
    results: IResearchResult[],
    periodDays: number = 30
  ): ITrend[] {
    const rawTrends = this.extractRawTrends(results, periodDays);
    const filteredTrends = this.filterSignificantTrends(rawTrends);
    return filteredTrends.map(rt => this.convertToTrend(rt, results));
  }

  /**
   * Извлечь сырые данные трендов
   */
  private extractRawTrends(
    results: IResearchResult[],
    periodDays: number
  ): RawTrend[] {
    const rawTrends: RawTrend[] = [];
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const halfPeriod = new Date(now.getTime() - (periodDays / 2) * 24 * 60 * 60 * 1000);

    for (const topic of this.trackedTopics) {
      const allTerms = [topic.keyword, ...topic.aliases];

      // Найти все упоминания
      const mentions = results.filter(r => {
        const text = `${r.title} ${r.summary}`.toLowerCase();
        return allTerms.some(term => text.includes(term.toLowerCase()));
      });

      if (mentions.length === 0) continue;

      // Разбить на временные периоды
      const recentMentions = mentions.filter(m => m.publishedAt >= periodStart);
      const firstHalf = recentMentions.filter(m => m.publishedAt < halfPeriod);
      const secondHalf = recentMentions.filter(m => m.publishedAt >= halfPeriod);

      // Вычислить рост
      const firstHalfCount = firstHalf.length || 0.5; // Avoid division by zero
      const secondHalfCount = secondHalf.length;
      const growthRate = (secondHalfCount - firstHalfCount) / firstHalfCount;

      // Создать data points по неделям
      const dataPoints = this.createWeeklyDataPoints(recentMentions, periodDays);

      rawTrends.push({
        keyword: topic.keyword,
        category: topic.category,
        dataPoints,
        totalMentions: mentions.length,
        recentMentions: recentMentions.length,
        growthRate,
      });
    }

    return rawTrends;
  }

  /**
   * Создать недельные точки данных
   */
  private createWeeklyDataPoints(
    results: IResearchResult[],
    periodDays: number
  ): TrendDataPoint[] {
    const points: TrendDataPoint[] = [];
    const now = new Date();
    const weeksCount = Math.ceil(periodDays / 7);

    for (let i = 0; i < weeksCount; i++) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekResults = results.filter(
        r => r.publishedAt >= weekStart && r.publishedAt < weekEnd
      );

      points.unshift({
        date: weekStart,
        count: weekResults.length,
        results: weekResults,
      });
    }

    return points;
  }

  /**
   * Фильтровать значимые тренды
   */
  private filterSignificantTrends(rawTrends: RawTrend[]): RawTrend[] {
    return rawTrends.filter(trend => {
      // Минимум 3 упоминания
      if (trend.recentMentions < 3) return false;

      // Или значительный рост
      if (trend.growthRate > 0.5) return true;

      // Или много упоминаний
      if (trend.recentMentions >= 10) return true;

      // Или стабильно упоминается
      const hasConsistentMentions = trend.dataPoints.filter(dp => dp.count > 0).length >= 3;
      if (hasConsistentMentions) return true;

      return false;
    });
  }

  /**
   * Преобразовать в ITrend
   */
  private convertToTrend(rawTrend: RawTrend, allResults: IResearchResult[]): ITrend {
    const topic = this.trackedTopics.find(t => t.keyword === rawTrend.keyword)!;

    // Определить силу тренда
    let strength: ITrend['strength'];
    if (rawTrend.growthRate > 0.3) {
      strength = 'rising';
    } else if (rawTrend.growthRate < -0.3) {
      strength = 'declining';
    } else {
      strength = 'stable';
    }

    // Определить зрелость
    let maturity: ITrend['maturity'];
    if (rawTrend.totalMentions < 10) {
      maturity = 'emerging';
    } else if (rawTrend.totalMentions < 50) {
      maturity = 'growing';
    } else if (strength === 'declining') {
      maturity = 'declining';
    } else {
      maturity = 'mature';
    }

    // Извлечь ключевых игроков (авторы/организации)
    const keyPlayers = this.extractKeyPlayers(rawTrend.dataPoints);

    // Генерировать рекомендации
    const recommendations = this.generateRecommendations(rawTrend, strength, maturity);

    // Источники (URLs)
    const sources = rawTrend.dataPoints
      .flatMap(dp => dp.results)
      .slice(0, 5)
      .map(r => r.url);

    return {
      name: rawTrend.keyword,
      description: this.generateDescription(rawTrend, strength),
      category: rawTrend.category,
      strength,
      maturity,
      mentionCount: rawTrend.recentMentions,
      keyPlayers,
      sleepCoreRelevance: topic.sleepCoreRelevance,
      recommendations,
      sources,
    };
  }

  /**
   * Извлечь ключевых игроков
   */
  private extractKeyPlayers(dataPoints: TrendDataPoint[]): string[] {
    const playerCounts = new Map<string, number>();

    for (const dp of dataPoints) {
      for (const result of dp.results) {
        // Авторы
        for (const author of result.authors || []) {
          playerCounts.set(author, (playerCounts.get(author) || 0) + 1);
        }
        // Организации
        for (const org of result.organizations || []) {
          playerCounts.set(org, (playerCounts.get(org) || 0) + 1);
        }
      }
    }

    // Топ-5 игроков
    return [...playerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  /**
   * Генерировать описание тренда
   */
  private generateDescription(rawTrend: RawTrend, strength: ITrend['strength']): string {
    const growthText = strength === 'rising'
      ? `showing ${Math.round(rawTrend.growthRate * 100)}% growth`
      : strength === 'declining'
        ? `declining by ${Math.round(Math.abs(rawTrend.growthRate) * 100)}%`
        : 'maintaining stable interest';

    return `Research activity on "${rawTrend.keyword}" is ${growthText} with ${rawTrend.recentMentions} recent publications.`;
  }

  /**
   * Генерировать рекомендации
   */
  private generateRecommendations(
    rawTrend: RawTrend,
    strength: ITrend['strength'],
    maturity: ITrend['maturity']
  ): string[] {
    const recommendations: string[] = [];

    // По силе тренда
    if (strength === 'rising') {
      recommendations.push('Prioritize tracking this trend - increasing research activity');
      if (maturity === 'emerging') {
        recommendations.push('Consider early adoption to gain competitive advantage');
      }
    } else if (strength === 'declining') {
      recommendations.push('Review whether current implementation aligns with evolving best practices');
    }

    // По категории
    switch (rawTrend.category) {
      case ResearchCategory.CBT_I:
        recommendations.push('Validate SleepCore protocols against latest evidence');
        break;
      case ResearchCategory.AI_ML:
        recommendations.push('Evaluate new algorithms for potential integration');
        break;
      case ResearchCategory.DIGITAL_TWIN:
        recommendations.push('HIGH PRIORITY: Directly relevant to SleepCore architecture');
        break;
      case ResearchCategory.COMPETITORS:
        recommendations.push('Update competitive intelligence matrix');
        break;
      case ResearchCategory.REGULATORY:
        recommendations.push('Review regulatory implications for SleepCore roadmap');
        break;
    }

    // По зрелости
    if (maturity === 'mature') {
      recommendations.push('Ensure SleepCore implementation is state-of-the-art for this topic');
    } else if (maturity === 'emerging') {
      recommendations.push('Monitor closely - may represent future standard of care');
    }

    return recommendations;
  }

  /**
   * Получить суммарную статистику трендов
   */
  getTrendSummary(trends: ITrend[]): {
    risingCount: number;
    decliningCount: number;
    emergingTopics: string[];
    matureTopics: string[];
    highPriority: ITrend[];
  } {
    const rising = trends.filter(t => t.strength === 'rising');
    const declining = trends.filter(t => t.strength === 'declining');
    const emerging = trends.filter(t => t.maturity === 'emerging').map(t => t.name);
    const mature = trends.filter(t => t.maturity === 'mature').map(t => t.name);

    // Высокий приоритет: растущие + релевантные для SleepCore
    const highPriority = trends.filter(t =>
      t.strength === 'rising' &&
      (t.category === ResearchCategory.DIGITAL_TWIN ||
       t.category === ResearchCategory.AI_ML ||
       t.category === ResearchCategory.CBT_I)
    );

    return {
      risingCount: rising.length,
      decliningCount: declining.length,
      emergingTopics: emerging,
      matureTopics: mature,
      highPriority,
    };
  }
}
