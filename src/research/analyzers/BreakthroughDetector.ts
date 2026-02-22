/**
 * @fileoverview Breakthrough Detection Analyzer
 * @module research/analyzers/BreakthroughDetector
 * @description Детектор прорывных исследований и технологий в области сна
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchResult,
  IBreakthrough,
  ResearchCategory,
  ConfidenceLevel,
} from '../types';

/**
 * Критерии прорыва
 */
interface BreakthroughCriteria {
  /** Минимальный breakthrough score */
  minScore: number;

  /** Веса для разных типов источников */
  sourceWeights: Record<string, number>;

  /** Индикаторы прорыва */
  indicators: Array<{
    pattern: RegExp;
    weight: number;
    category?: ResearchCategory;
  }>;
}

/**
 * Детектор прорывных исследований
 */
export class BreakthroughDetector {
  private readonly criteria: BreakthroughCriteria = {
    minScore: 60,
    sourceWeights: {
      pubmed: 1.2,        // Peer-reviewed = выше доверие
      clinical_trials: 1.3, // Клинические данные
      arxiv: 0.8,         // Препринты = ниже
      competitors: 0.9,
      news: 0.6,
    },
    indicators: [
      // Методологические прорывы
      { pattern: /first(-|\s)in(-|\s)class/i, weight: 25, category: ResearchCategory.PHARMACOLOGICAL },
      { pattern: /paradigm\s+shift/i, weight: 20 },
      { pattern: /breakthrough\s+therapy/i, weight: 25 },
      { pattern: /novel\s+mechanism/i, weight: 20 },

      // Статистические индикаторы
      { pattern: /effect\s+size[^.]*d\s*[=>]\s*1/i, weight: 25, category: ResearchCategory.CBT_I },
      { pattern: /remission\s+rate[^.]*[89]\d%/i, weight: 22, category: ResearchCategory.CBT_I },
      { pattern: /significant(ly)?\s+(superior|better|improved)/i, weight: 15 },
      { pattern: /outperform(ed|s)?\s+(?:all|every|standard)/i, weight: 18 },

      // AI/ML прорывы
      { pattern: /state(-|\s)of(-|\s)(the(-|\s))?art/i, weight: 18, category: ResearchCategory.AI_ML },
      { pattern: /foundation\s+model/i, weight: 20, category: ResearchCategory.AI_ML },
      { pattern: /digital\s+twin/i, weight: 22, category: ResearchCategory.DIGITAL_TWIN },
      { pattern: /precision\s+(medicine|therapy)/i, weight: 18 },
      { pattern: /personalized\s+(AI|algorithm|model)/i, weight: 18, category: ResearchCategory.AI_ML },

      // Регуляторные прорывы
      { pattern: /FDA\s+(cleared|approved|breakthrough)/i, weight: 25, category: ResearchCategory.REGULATORY },
      { pattern: /CE\s+mark(ed)?/i, weight: 20, category: ResearchCategory.REGULATORY },
      { pattern: /DiGA\s+(listed|approved)/i, weight: 22, category: ResearchCategory.REGULATORY },

      // Бизнес прорывы
      { pattern: /\$\d+\s*(million|billion|M|B)/i, weight: 15, category: ResearchCategory.FUNDING },
      { pattern: /series\s+[C-Z]/i, weight: 18, category: ResearchCategory.FUNDING },
      { pattern: /IPO/i, weight: 20, category: ResearchCategory.FUNDING },
      { pattern: /acquisition/i, weight: 15, category: ResearchCategory.MARKET },

      // Научные прорывы
      { pattern: /first\s+(evidence|demonstration|proof)/i, weight: 20 },
      { pattern: /new\s+biomarker/i, weight: 22, category: ResearchCategory.BIOMARKERS },
      { pattern: /discovered\s+(gene|mutation|pathway)/i, weight: 22, category: ResearchCategory.GENETICS },
    ],
  };

  /**
   * Анализировать результаты на прорывы
   */
  detectBreakthroughs(results: IResearchResult[]): IBreakthrough[] {
    const breakthroughs: IBreakthrough[] = [];

    for (const result of results) {
      const analysis = this.analyzeForBreakthrough(result);

      if (analysis.isBreakthrough) {
        breakthroughs.push(this.createBreakthrough(result, analysis));
      }
    }

    // Сортировка по impact score
    breakthroughs.sort((a, b) => b.impactScore - a.impactScore);

    // Группировка связанных прорывов
    return this.groupRelatedBreakthroughs(breakthroughs);
  }

  /**
   * Анализ одного результата
   */
  private analyzeForBreakthrough(result: IResearchResult): {
    isBreakthrough: boolean;
    score: number;
    matchedIndicators: string[];
    suggestedCategory: ResearchCategory | null;
  } {
    const text = `${result.title} ${result.summary}`.toLowerCase();
    let score = result.breakthroughScore;
    const matchedIndicators: string[] = [];
    const categoryVotes: Map<ResearchCategory, number> = new Map();

    // Применить индикаторы
    for (const indicator of this.criteria.indicators) {
      if (indicator.pattern.test(text)) {
        score += indicator.weight;
        matchedIndicators.push(indicator.pattern.source);

        if (indicator.category) {
          const current = categoryVotes.get(indicator.category) || 0;
          categoryVotes.set(indicator.category, current + indicator.weight);
        }
      }
    }

    // Применить вес источника
    const sourceWeight = this.criteria.sourceWeights[result.source] || 1;
    score = Math.round(score * sourceWeight);

    // Определить основную категорию
    let suggestedCategory: ResearchCategory | null = null;
    let maxVotes = 0;
    for (const [cat, votes] of categoryVotes) {
      if (votes > maxVotes) {
        maxVotes = votes;
        suggestedCategory = cat;
      }
    }

    return {
      isBreakthrough: score >= this.criteria.minScore,
      score: Math.min(100, score),
      matchedIndicators,
      suggestedCategory,
    };
  }

  /**
   * Создать объект прорыва
   */
  private createBreakthrough(
    result: IResearchResult,
    analysis: {
      score: number;
      matchedIndicators: string[];
      suggestedCategory: ResearchCategory | null;
    }
  ): IBreakthrough {
    const category = analysis.suggestedCategory ||
                     result.categories[0] ||
                     ResearchCategory.CBT_I;

    return {
      title: result.title,
      description: result.summary,
      whyBreakthrough: this.generateWhyBreakthrough(result, analysis),
      category,
      impactScore: Math.round(analysis.score / 10), // 1-10 scale
      timeToAdoption: this.estimateTimeToAdoption(result, category),
      sleepCoreApplicability: this.assessSleepCoreApplicability(result, category),
      actionItems: this.generateActionItems(result, category),
      sources: [result],
      confidenceLevel: this.determineConfidence(result, analysis),
    };
  }

  /**
   * Генерировать объяснение почему это прорыв
   */
  private generateWhyBreakthrough(
    result: IResearchResult,
    analysis: { matchedIndicators: string[] }
  ): string {
    const reasons: string[] = [];

    // Анализ индикаторов
    if (analysis.matchedIndicators.some(i => i.includes('first'))) {
      reasons.push('First-of-its-kind research or approach');
    }
    if (analysis.matchedIndicators.some(i => i.includes('effect'))) {
      reasons.push('Demonstrates large effect size (d ≥ 1.0)');
    }
    if (analysis.matchedIndicators.some(i => i.includes('FDA') || i.includes('CE'))) {
      reasons.push('Achieved significant regulatory milestone');
    }
    if (analysis.matchedIndicators.some(i => i.includes('state'))) {
      reasons.push('Claims state-of-the-art performance');
    }
    if (analysis.matchedIndicators.some(i => i.includes('digital.*twin'))) {
      reasons.push('Advances digital twin / personalized modeling');
    }

    if (reasons.length === 0) {
      reasons.push('High novelty score based on content analysis');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Оценить время до adoption
   */
  private estimateTimeToAdoption(
    result: IResearchResult,
    category: ResearchCategory
  ): IBreakthrough['timeToAdoption'] {
    const text = `${result.title} ${result.summary}`.toLowerCase();

    // Уже на рынке
    if (text.includes('approved') || text.includes('cleared') || text.includes('available')) {
      return 'immediate';
    }

    // Поздние фазы клинических испытаний
    if (text.includes('phase 3') || text.includes('phase iii')) {
      return '1-2 years';
    }

    // AI/ML продукты быстрее выходят на рынок
    if (category === ResearchCategory.AI_ML || category === ResearchCategory.DIGITAL_TWIN) {
      if (text.includes('pilot') || text.includes('feasibility')) {
        return '1-2 years';
      }
      return '3-5 years';
    }

    // Фундаментальные исследования
    if (category === ResearchCategory.NEUROSCIENCE ||
        category === ResearchCategory.GENETICS ||
        category === ResearchCategory.BIOMARKERS) {
      return '5+ years';
    }

    return '3-5 years';
  }

  /**
   * Оценить применимость для SleepCore
   */
  private assessSleepCoreApplicability(
    result: IResearchResult,
    category: ResearchCategory
  ): string {
    const components = result.relatedSleepCoreComponents;

    if (components.length === 0) {
      // Общая оценка по категории
      switch (category) {
        case ResearchCategory.CBT_I:
          return 'Directly applicable to core CBT-I engines. May inform protocol updates.';
        case ResearchCategory.THIRD_WAVE:
          return 'Applicable to MBT-I, ACT-I, MCT engines for non-responders.';
        case ResearchCategory.AI_ML:
          return 'Could enhance DigitalTwinService or prediction models.';
        case ResearchCategory.DIGITAL_TWIN:
          return 'HIGH priority: Directly relevant to SleepCore Digital Twin architecture.';
        case ResearchCategory.WEARABLES:
          return 'Could improve wearable integration and sleep metrics.';
        case ResearchCategory.BIOMARKERS:
          return 'Potential new features for tracking efficacy.';
        case ResearchCategory.COMPETITORS:
          return 'Competitive intelligence for market positioning.';
        default:
          return 'Indirect relevance, may inform future features.';
      }
    }

    const componentsList = components.join(', ');
    return `Directly applicable to: ${componentsList}`;
  }

  /**
   * Генерировать action items
   */
  private generateActionItems(
    result: IResearchResult,
    category: ResearchCategory
  ): string[] {
    const actions: string[] = [];

    // Универсальные действия
    actions.push(`Review full text at ${result.url}`);

    // По категориям
    switch (category) {
      case ResearchCategory.CBT_I:
        actions.push('Evaluate protocol implications for CBT-I engines');
        actions.push('Compare effect sizes with current SleepCore outcomes');
        break;

      case ResearchCategory.THIRD_WAVE:
        actions.push('Assess integration potential for Third-Wave therapies');
        break;

      case ResearchCategory.AI_ML:
      case ResearchCategory.DIGITAL_TWIN:
        actions.push('Technical review: evaluate architecture/methodology');
        actions.push('Prototype potential: assess implementation feasibility');
        break;

      case ResearchCategory.COMPETITORS:
        actions.push('Update competitive analysis matrix');
        actions.push('Identify differentiation opportunities');
        break;

      case ResearchCategory.REGULATORY:
        actions.push('Review regulatory pathway implications');
        actions.push('Update compliance checklist if applicable');
        break;

      case ResearchCategory.FUNDING:
        actions.push('Monitor competitor resource allocation');
        break;
    }

    // Если есть связанные компоненты
    if (result.relatedSleepCoreComponents.length > 0) {
      actions.push(`Consider updates to: ${result.relatedSleepCoreComponents.join(', ')}`);
    }

    return actions;
  }

  /**
   * Определить уровень уверенности
   */
  private determineConfidence(
    result: IResearchResult,
    _analysis: { score: number }
  ): ConfidenceLevel {
    // Источник
    if (result.source === 'pubmed') {
      // Тип публикации влияет на уверенность
      const pubType = (result.metadata?.pubtype as string[]) || [];
      if (pubType.some(p => p.toLowerCase().includes('meta-analysis'))) {
        return ConfidenceLevel.HIGH;
      }
      if (pubType.some(p => p.toLowerCase().includes('randomized'))) {
        return ConfidenceLevel.HIGH;
      }
      return ConfidenceLevel.MEDIUM;
    }

    if (result.source === 'clinical_trials') {
      return ConfidenceLevel.MEDIUM;
    }

    if (result.source === 'arxiv') {
      return ConfidenceLevel.LOW; // Не peer-reviewed
    }

    if (result.source === 'competitors' || result.source === 'news') {
      return ConfidenceLevel.LOW;
    }

    return ConfidenceLevel.UNKNOWN;
  }

  /**
   * Группировать связанные прорывы
   */
  private groupRelatedBreakthroughs(breakthroughs: IBreakthrough[]): IBreakthrough[] {
    // Пока простая логика — группируем по категории
    // В будущем можно добавить NLP для semantic similarity

    const grouped = new Map<ResearchCategory, IBreakthrough[]>();

    for (const bt of breakthroughs) {
      const existing = grouped.get(bt.category) || [];
      existing.push(bt);
      grouped.set(bt.category, existing);
    }

    // Объединить очень похожие прорывы (по названию)
    const result: IBreakthrough[] = [];

    for (const [, categoryBreakthroughs] of grouped) {
      const merged = this.mergeSimialarBreakthroughs(categoryBreakthroughs);
      result.push(...merged);
    }

    // Пересортировать
    result.sort((a, b) => b.impactScore - a.impactScore);

    return result;
  }

  /**
   * Объединить похожие прорывы
   */
  private mergeSimialarBreakthroughs(breakthroughs: IBreakthrough[]): IBreakthrough[] {
    // Простая логика: если заголовки очень похожи, объединяем
    const result: IBreakthrough[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < breakthroughs.length; i++) {
      if (processed.has(i)) continue;

      const current = breakthroughs[i];
      const similar: IBreakthrough[] = [current];
      processed.add(i);

      for (let j = i + 1; j < breakthroughs.length; j++) {
        if (processed.has(j)) continue;

        const other = breakthroughs[j];
        if (this.areSimilar(current.title, other.title)) {
          similar.push(other);
          processed.add(j);
        }
      }

      if (similar.length > 1) {
        // Объединяем источники
        const merged: IBreakthrough = {
          ...current,
          sources: similar.flatMap(s => s.sources),
          impactScore: Math.max(...similar.map(s => s.impactScore)),
          actionItems: [...new Set(similar.flatMap(s => s.actionItems))],
        };
        result.push(merged);
      } else {
        result.push(current);
      }
    }

    return result;
  }

  /**
   * Проверить похожесть заголовков
   */
  private areSimilar(title1: string, title2: string): boolean {
    const words1 = new Set(title1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(title2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity > 0.5
    return intersection.length / union.size > 0.5;
  }
}
