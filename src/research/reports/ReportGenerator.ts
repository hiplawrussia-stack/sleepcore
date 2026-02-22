/**
 * @fileoverview Research Report Generator
 * @module research/reports/ReportGenerator
 * @description Генератор отчётов об исследованиях
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchResult,
  IResearchReport,
  IWeeklyDigest,
  IDigestItem,
  IBreakthrough,
  ITrend,
  IClinicalTrial,
  IPatent,
  ICompetitorUpdate,
  IRecommendation,
  ResearchSource,
  ResearchCategory,
} from '../types';

/**
 * Опции генерации отчёта
 */
interface ReportOptions {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateFrom: Date;
  dateTo: Date;
  includeBreakthroughs?: boolean;
  includeTrends?: boolean;
  includeCompetitors?: boolean;
  includeClinicalTrials?: boolean;
  includeRecommendations?: boolean;
  maxResults?: number;
}

/**
 * Генератор отчётов
 */
export class ReportGenerator {
  /**
   * Генерировать полный отчёт
   */
  generateReport(
    results: IResearchResult[],
    breakthroughs: IBreakthrough[],
    trends: ITrend[],
    competitorUpdates: ICompetitorUpdate[],
    clinicalTrials: IClinicalTrial[],
    patents: IPatent[],
    options: ReportOptions
  ): IResearchReport {
    const id = `report_${options.type}_${Date.now()}`;

    // Фильтрация по дате
    const filteredResults = results.filter(
      r => r.publishedAt >= options.dateFrom && r.publishedAt <= options.dateTo
    );

    // Статистика
    const statistics = this.calculateStatistics(filteredResults);

    // Рекомендации
    const recommendations = options.includeRecommendations !== false
      ? this.generateRecommendations(breakthroughs, trends, competitorUpdates)
      : [];

    // Executive Summary
    const executiveSummary = this.generateExecutiveSummary(
      filteredResults,
      breakthroughs,
      trends,
      competitorUpdates,
      statistics
    );

    return {
      id,
      generatedAt: new Date(),
      period: {
        from: options.dateFrom,
        to: options.dateTo,
      },
      type: options.type,
      executiveSummary,
      breakthroughs: options.includeBreakthroughs !== false ? breakthroughs : [],
      competitorUpdates: options.includeCompetitors !== false ? competitorUpdates : [],
      clinicalTrials: options.includeClinicalTrials !== false ? clinicalTrials : [],
      patents,
      trends: options.includeTrends !== false ? trends : [],
      recommendations,
      allResults: options.maxResults
        ? filteredResults.slice(0, options.maxResults)
        : filteredResults,
      statistics,
    };
  }

  /**
   * Генерировать недельный дайджест
   */
  generateWeeklyDigest(
    results: IResearchResult[],
    breakthroughs: IBreakthrough[],
    trends: ITrend[]
  ): IWeeklyDigest {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Фильтрация за неделю
    const weekResults = results.filter(r => r.publishedAt >= weekAgo);

    // Топ-история
    const topStory = this.selectTopStory(weekResults, breakthroughs);

    // Highlights (3-5)
    const highlights = this.selectHighlights(weekResults, breakthroughs, 5);

    // По категориям
    const byCategory = this.groupByCategory(weekResults);

    // Импликации для SleepCore
    const sleepCoreImplications = this.generateImplications(breakthroughs, trends);

    // Action items на неделю
    const weeklyActionItems = this.generateWeeklyActions(breakthroughs, trends);

    return {
      weekOf: weekAgo,
      topStory,
      highlights,
      byCategory,
      sleepCoreImplications,
      weeklyActionItems,
    };
  }

  /**
   * Вычислить статистику
   */
  private calculateStatistics(results: IResearchResult[]): IResearchReport['statistics'] {
    const resultsBySource: Record<ResearchSource, number> = {
      // Scientific Publications
      [ResearchSource.PUBMED]: 0,
      [ResearchSource.ARXIV]: 0,
      [ResearchSource.MEDRXIV]: 0,
      [ResearchSource.BIORXIV]: 0,

      // Aggregators (NEW 2025-2026)
      [ResearchSource.SEMANTIC_SCHOLAR]: 0,
      [ResearchSource.OPENALEX]: 0,

      // Clinical Trials
      [ResearchSource.CLINICAL_TRIALS]: 0,
      [ResearchSource.ICTRP]: 0,
      [ResearchSource.EUCTR]: 0,
      [ResearchSource.JRCT]: 0,
      [ResearchSource.CHICTR]: 0,
      [ResearchSource.CRIS]: 0,

      // Regulatory
      [ResearchSource.FDA]: 0,
      [ResearchSource.DIGA]: 0,
      [ResearchSource.CE_MARK]: 0,

      // Intelligence
      [ResearchSource.COMPETITORS]: 0,
      [ResearchSource.NEWS]: 0,
      [ResearchSource.PATENTS]: 0,
      [ResearchSource.GITHUB]: 0,

      // Regional Academic
      [ResearchSource.CNKI]: 0,
      [ResearchSource.ELIBRARY]: 0,
      [ResearchSource.JSTAGE]: 0,
      [ResearchSource.KOREAMED]: 0,
    };

    const resultsByCategory: Partial<Record<ResearchCategory, number>> = {};

    let totalRelevance = 0;
    let breakthroughsDetected = 0;

    for (const result of results) {
      // По источнику
      resultsBySource[result.source] = (resultsBySource[result.source] || 0) + 1;

      // По категориям
      for (const cat of result.categories) {
        resultsByCategory[cat] = (resultsByCategory[cat] || 0) + 1;
      }

      // Релевантность
      totalRelevance += result.relevanceScore;

      // Прорывы
      if (result.breakthroughScore >= 60) {
        breakthroughsDetected++;
      }
    }

    return {
      totalResultsFound: results.length,
      resultsBySource,
      resultsByCategory: resultsByCategory as Record<ResearchCategory, number>,
      averageRelevanceScore: results.length > 0
        ? Math.round(totalRelevance / results.length)
        : 0,
      breakthroughsDetected,
    };
  }

  /**
   * Генерировать Executive Summary
   */
  private generateExecutiveSummary(
    results: IResearchResult[],
    breakthroughs: IBreakthrough[],
    trends: ITrend[],
    competitorUpdates: ICompetitorUpdate[],
    statistics: IResearchReport['statistics']
  ): string {
    const lines: string[] = [];

    // Обзор
    lines.push(`## Research Summary\n`);
    lines.push(`This report covers ${statistics.totalResultsFound} research items with an average relevance score of ${statistics.averageRelevanceScore}/100.\n`);

    // Прорывы
    if (breakthroughs.length > 0) {
      lines.push(`\n### Key Breakthroughs (${breakthroughs.length})\n`);
      for (const bt of breakthroughs.slice(0, 3)) {
        lines.push(`- **${bt.title}** (Impact: ${bt.impactScore}/10)`);
        lines.push(`  ${bt.whyBreakthrough}`);
      }
    }

    // Тренды
    const risingTrends = trends.filter(t => t.strength === 'rising');
    if (risingTrends.length > 0) {
      lines.push(`\n### Rising Trends (${risingTrends.length})\n`);
      for (const trend of risingTrends.slice(0, 3)) {
        lines.push(`- **${trend.name}** (${trend.mentionCount} mentions) - ${trend.maturity}`);
      }
    }

    // Конкуренты
    const significantUpdates = competitorUpdates.filter(
      u => u.updateType === 'funding' || u.updateType === 'regulatory'
    );
    if (significantUpdates.length > 0) {
      lines.push(`\n### Competitor Activity (${significantUpdates.length} significant)\n`);
      for (const update of significantUpdates.slice(0, 3)) {
        lines.push(`- **${update.company}**: ${update.updateType} - ${update.description.slice(0, 100)}...`);
      }
    }

    // Распределение по источникам
    lines.push(`\n### Sources Distribution\n`);
    for (const [source, count] of Object.entries(statistics.resultsBySource)) {
      if (count > 0) {
        lines.push(`- ${source}: ${count}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Генерировать рекомендации
   */
  private generateRecommendations(
    breakthroughs: IBreakthrough[],
    trends: ITrend[],
    competitorUpdates: ICompetitorUpdate[]
  ): IRecommendation[] {
    const recommendations: IRecommendation[] = [];
    let idCounter = 1;

    // Рекомендации из прорывов
    for (const bt of breakthroughs.slice(0, 3)) {
      recommendations.push({
        id: `rec_${idCounter++}`,
        title: `Evaluate: ${bt.title.slice(0, 50)}...`,
        description: bt.sleepCoreApplicability,
        priority: bt.impactScore >= 8 ? 'critical' : bt.impactScore >= 6 ? 'high' : 'medium',
        category: bt.category,
        basedOn: bt.sources.map(s => s.url),
        actionItems: bt.actionItems,
        expectedImpact: `Time to adoption: ${bt.timeToAdoption}`,
        implementationComplexity: bt.category === ResearchCategory.AI_ML ? 'high' : 'medium',
        relatedComponents: bt.sources.flatMap(s => s.relatedSleepCoreComponents),
      });
    }

    // Рекомендации из трендов
    const highPriorityTrends = trends.filter(
      t => t.strength === 'rising' && t.maturity === 'emerging'
    );
    for (const trend of highPriorityTrends.slice(0, 2)) {
      recommendations.push({
        id: `rec_${idCounter++}`,
        title: `Monitor emerging trend: ${trend.name}`,
        description: trend.description,
        priority: 'medium',
        category: trend.category,
        basedOn: trend.sources,
        actionItems: trend.recommendations,
        expectedImpact: trend.sleepCoreRelevance,
        implementationComplexity: 'low',
        relatedComponents: [],
      });
    }

    // Рекомендации из конкурентов
    const criticalUpdates = competitorUpdates.filter(
      u => u.impactAssessment?.startsWith('HIGH')
    );
    for (const update of criticalUpdates.slice(0, 2)) {
      recommendations.push({
        id: `rec_${idCounter++}`,
        title: `Competitive response: ${update.company}`,
        description: update.description,
        priority: 'high',
        category: ResearchCategory.COMPETITORS,
        basedOn: [update.sourceUrl],
        actionItems: update.recommendedActions || [],
        expectedImpact: update.impactAssessment || 'Competitive positioning',
        implementationComplexity: 'medium',
        relatedComponents: [],
      });
    }

    // Сортировка по приоритету
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Выбрать топ-историю недели
   */
  private selectTopStory(
    results: IResearchResult[],
    breakthroughs: IBreakthrough[]
  ): IDigestItem | undefined {
    // Приоритет: прорыв с высоким impact
    if (breakthroughs.length > 0) {
      const topBt = breakthroughs.sort((a, b) => b.impactScore - a.impactScore)[0];
      return {
        title: topBt.title,
        summary: topBt.whyBreakthrough,
        category: topBt.category,
        importance: 'breaking',
        url: topBt.sources[0]?.url,
        actionRequired: topBt.actionItems[0],
      };
    }

    // Fallback: результат с высокой релевантностью
    const topResult = results.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
    if (topResult) {
      return {
        title: topResult.title,
        summary: topResult.summary.slice(0, 200) + '...',
        category: topResult.categories[0] || ResearchCategory.CBT_I,
        importance: 'important',
        url: topResult.url,
      };
    }

    return undefined;
  }

  /**
   * Выбрать highlights
   */
  private selectHighlights(
    results: IResearchResult[],
    breakthroughs: IBreakthrough[],
    limit: number
  ): IDigestItem[] {
    const items: IDigestItem[] = [];

    // Добавить прорывы
    for (const bt of breakthroughs.slice(0, Math.min(3, limit))) {
      items.push({
        title: bt.title,
        summary: bt.description.slice(0, 150) + '...',
        category: bt.category,
        importance: bt.impactScore >= 8 ? 'breaking' : 'important',
        url: bt.sources[0]?.url,
        actionRequired: bt.actionItems[0],
      });
    }

    // Добавить топ результаты
    const remaining = limit - items.length;
    const topResults = results
      .filter(r => !items.some(i => i.url === r.url))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, remaining);

    for (const result of topResults) {
      items.push({
        title: result.title,
        summary: result.summary.slice(0, 150) + '...',
        category: result.categories[0] || ResearchCategory.CBT_I,
        importance: result.relevanceScore >= 80 ? 'important' : 'notable',
        url: result.url,
      });
    }

    return items;
  }

  /**
   * Группировать по категориям
   */
  private groupByCategory(results: IResearchResult[]): Record<ResearchCategory, IDigestItem[]> {
    const grouped: Partial<Record<ResearchCategory, IDigestItem[]>> = {};

    for (const result of results) {
      for (const category of result.categories) {
        if (!grouped[category]) {
          grouped[category] = [];
        }

        // Ограничение 5 на категорию
        if (grouped[category]!.length < 5) {
          grouped[category]!.push({
            title: result.title,
            summary: result.summary.slice(0, 100) + '...',
            category,
            importance: result.relevanceScore >= 80 ? 'important' : 'notable',
            url: result.url,
          });
        }
      }
    }

    return grouped as Record<ResearchCategory, IDigestItem[]>;
  }

  /**
   * Генерировать импликации для SleepCore
   */
  private generateImplications(
    breakthroughs: IBreakthrough[],
    trends: ITrend[]
  ): string {
    const implications: string[] = [];

    // Из прорывов
    const directlyApplicable = breakthroughs.filter(
      bt => bt.sleepCoreApplicability.includes('Directly') ||
            bt.sleepCoreApplicability.includes('HIGH')
    );

    if (directlyApplicable.length > 0) {
      implications.push(
        `${directlyApplicable.length} breakthrough(s) directly applicable to SleepCore components.`
      );
    }

    // Из трендов
    const risingTrends = trends.filter(t => t.strength === 'rising');
    if (risingTrends.length > 0) {
      const topTrend = risingTrends[0];
      implications.push(
        `Rising trend in "${topTrend.name}" - ${topTrend.sleepCoreRelevance}`
      );
    }

    // Digital Twin специально
    const dtBreakthroughs = breakthroughs.filter(
      bt => bt.category === ResearchCategory.DIGITAL_TWIN
    );
    if (dtBreakthroughs.length > 0) {
      implications.push(
        `Digital Twin advances detected - review DigitalTwinService architecture alignment.`
      );
    }

    if (implications.length === 0) {
      return 'No critical implications this week. Continue monitoring.';
    }

    return implications.join(' ');
  }

  /**
   * Генерировать action items на неделю
   */
  private generateWeeklyActions(
    breakthroughs: IBreakthrough[],
    trends: ITrend[]
  ): string[] {
    const actions: string[] = [];

    // Из прорывов
    for (const bt of breakthroughs.slice(0, 2)) {
      actions.push(bt.actionItems[0]);
    }

    // Из трендов
    const risingTrends = trends.filter(t => t.strength === 'rising');
    for (const trend of risingTrends.slice(0, 2)) {
      actions.push(trend.recommendations[0]);
    }

    // Стандартные действия
    if (actions.length < 3) {
      actions.push('Review competitive landscape for any missed updates');
    }

    return [...new Set(actions)].slice(0, 5);
  }

  /**
   * Экспорт отчёта в Markdown
   */
  exportToMarkdown(report: IResearchReport): string {
    const lines: string[] = [];

    // Заголовок
    lines.push(`# SleepCore Research Report`);
    lines.push(`**Type:** ${report.type}`);
    lines.push(`**Period:** ${report.period.from.toISOString().split('T')[0]} - ${report.period.to.toISOString().split('T')[0]}`);
    lines.push(`**Generated:** ${report.generatedAt.toISOString()}`);
    lines.push('');

    // Executive Summary
    lines.push(report.executiveSummary);
    lines.push('');

    // Breakthroughs
    if (report.breakthroughs.length > 0) {
      lines.push('## Breakthroughs');
      for (const bt of report.breakthroughs) {
        lines.push(`### ${bt.title}`);
        lines.push(`- **Impact Score:** ${bt.impactScore}/10`);
        lines.push(`- **Category:** ${bt.category}`);
        lines.push(`- **Why Breakthrough:** ${bt.whyBreakthrough}`);
        lines.push(`- **Time to Adoption:** ${bt.timeToAdoption}`);
        lines.push(`- **SleepCore Applicability:** ${bt.sleepCoreApplicability}`);
        lines.push('');
      }
    }

    // Trends
    if (report.trends.length > 0) {
      lines.push('## Trends');
      for (const trend of report.trends) {
        lines.push(`### ${trend.name}`);
        lines.push(`- **Strength:** ${trend.strength}`);
        lines.push(`- **Maturity:** ${trend.maturity}`);
        lines.push(`- **Mentions:** ${trend.mentionCount}`);
        lines.push(`- **SleepCore Relevance:** ${trend.sleepCoreRelevance}`);
        lines.push('');
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      for (const rec of report.recommendations) {
        lines.push(`### [${rec.priority.toUpperCase()}] ${rec.title}`);
        lines.push(rec.description);
        lines.push(`- **Action Items:**`);
        for (const action of rec.actionItems) {
          lines.push(`  - ${action}`);
        }
        lines.push('');
      }
    }

    // Statistics
    lines.push('## Statistics');
    lines.push(`- **Total Results:** ${report.statistics.totalResultsFound}`);
    lines.push(`- **Average Relevance:** ${report.statistics.averageRelevanceScore}/100`);
    lines.push(`- **Breakthroughs Detected:** ${report.statistics.breakthroughsDetected}`);

    return lines.join('\n');
  }
}
