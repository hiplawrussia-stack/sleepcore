/**
 * @fileoverview MedRxiv/BioRxiv Research Source
 * @module research/sources/MedRxivSource
 * @description Медицинские препринты (появляются на 6-12 месяцев раньше PubMed)
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchQuery,
  IResearchResult,
  ResearchSource,
  ResearchCategory,
  ConfidenceLevel,
} from '../types';
import { BaseResearchSource } from './IResearchSource';

/**
 * MedRxiv/BioRxiv Article
 */
interface MedRxivArticle {
  doi: string;
  title: string;
  authors: string;
  author_corresponding: string;
  author_corresponding_institution: string;
  date: string;
  version: string;
  type: string;
  license: string;
  category: string;
  jatsxml: string;
  abstract: string;
  published: string;
  server: 'medrxiv' | 'biorxiv';
}

/**
 * MedRxiv API Response
 */
interface MedRxivResponse {
  messages: Array<{ status: string; count: number }>;
  collection: MedRxivArticle[];
}

/**
 * MedRxiv/BioRxiv Source Implementation
 */
export class MedRxivSource extends BaseResearchSource {
  readonly name = ResearchSource.PUBMED; // Reusing, could add MEDRXIV to enum
  readonly displayName = 'MedRxiv/BioRxiv';
  readonly description = 'Medical and biology preprint servers';
  readonly baseUrl = 'https://api.medrxiv.org';

  /**
   * Проверить доступность API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/details/medrxiv/2024-01-01/2024-01-02/json`,
        {},
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Поиск препринтов
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    // Поиск в MedRxiv
    const medrxivResults = await this.searchServer('medrxiv', query);
    results.push(...medrxivResults);

    // Поиск в BioRxiv
    const biorxivResults = await this.searchServer('biorxiv', query);
    results.push(...biorxivResults);

    // Фильтрация по ключевым словам и релевантности
    const filteredResults = results.filter(r => {
      const text = `${r.title} ${r.summary}`.toLowerCase();

      // Должен содержать хотя бы одно sleep-related слово
      const sleepKeywords = ['sleep', 'insomnia', 'circadian', 'melatonin', 'polysomnography', 'actigraphy'];
      return sleepKeywords.some(kw => text.includes(kw));
    });

    // Сортировка по релевантности
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return filteredResults.slice(0, query.maxResultsPerSource || 30);
  }

  /**
   * Поиск на конкретном сервере
   */
  private async searchServer(
    server: 'medrxiv' | 'biorxiv',
    query: IResearchQuery
  ): Promise<IResearchResult[]> {
    const fromDate = this.formatDate(query.dateRange.from);
    const toDate = this.formatDate(query.dateRange.to);

    // MedRxiv API: /details/{server}/{from}/{to}/json
    const url = `${this.baseUrl}/details/${server}/${fromDate}/${toDate}/json`;

    try {
      const response = await this.safeFetch(url, {}, 30000);

      if (!response.ok) {
        console.warn(`${server} API returned ${response.status}`);
        return [];
      }

      const data = await response.json() as MedRxivResponse;

      if (!data.collection) {
        return [];
      }

      // Фильтрация по категориям, связанным со сном
      const relevantCategories = [
        'neurology',
        'psychiatry and clinical psychology',
        'health informatics',
        'public and global health',
        'epidemiology',
        'genetics',
        'neuroscience',
      ];

      const relevantArticles = data.collection.filter(article => {
        const category = article.category.toLowerCase();
        return relevantCategories.some(rc => category.includes(rc)) ||
               this.isSleepRelated(article);
      });

      return relevantArticles.map(article =>
        this.mapToResearchResult(article, server, query)
      );
    } catch (error) {
      console.error(`Error fetching from ${server}:`, error);
      return [];
    }
  }

  /**
   * Проверить связь со сном
   */
  private isSleepRelated(article: MedRxivArticle): boolean {
    const text = `${article.title} ${article.abstract}`.toLowerCase();
    const keywords = [
      'sleep', 'insomnia', 'circadian', 'melatonin',
      'polysomnography', 'actigraphy', 'chronotype',
      'arousal', 'wakefulness', 'drowsiness',
      'cbt-i', 'cognitive behavioral therapy',
      'sleep disorder', 'sleep quality', 'sleep efficiency',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Получить последние препринты
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'sleep insomnia',
      sources: [ResearchSource.PUBMED],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['sleep', 'insomnia', 'circadian'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить по DOI
   */
  async getById(id: string): Promise<IResearchResult | null> {
    const doi = id.replace('medrxiv:', '').replace('biorxiv:', '');

    try {
      // Попробовать MedRxiv
      const medrxivUrl = `${this.baseUrl}/details/medrxiv/${doi}/na/json`;
      let response = await this.safeFetch(medrxivUrl);

      if (!response.ok) {
        // Попробовать BioRxiv
        const biorxivUrl = `${this.baseUrl}/details/biorxiv/${doi}/na/json`;
        response = await this.safeFetch(biorxivUrl);
      }

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as MedRxivResponse;
      if (!data.collection || data.collection.length === 0) {
        return null;
      }

      const article = data.collection[0];
      return this.mapToResearchResult(
        article,
        article.server,
        { topic: '', sources: [], dateRange: { from: new Date(0), to: new Date() }, keywords: [] }
      );
    } catch {
      return null;
    }
  }

  /**
   * Преобразовать в IResearchResult
   */
  private mapToResearchResult(
    article: MedRxivArticle,
    server: 'medrxiv' | 'biorxiv',
    query: IResearchQuery
  ): IResearchResult {
    const publishedAt = new Date(article.date);
    const url = `https://www.${server}.org/content/${article.doi}`;

    // Парсинг авторов
    const authors = article.authors
      .split(';')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const relevanceScore = this.calculateRelevance(article, query);
    const breakthroughScore = this.calculateBreakthroughScore(article);
    const categories = this.detectCategories(article);

    const base = this.createBaseResult(
      `${server}:${article.doi}`,
      article.title,
      article.abstract,
      url,
      publishedAt
    );

    return {
      ...base,
      authors,
      organizations: article.author_corresponding_institution
        ? [article.author_corresponding_institution]
        : [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags: this.extractTags(article, server),
      relatedSleepCoreComponents: this.detectSleepCoreComponents(article.abstract),
      confidenceLevel: ConfidenceLevel.LOW, // Препринт = низкая уверенность (не peer-reviewed)
      metadata: {
        doi: article.doi,
        server,
        version: article.version,
        category: article.category,
        license: article.license,
        correspondingAuthor: article.author_corresponding,
        correspondingInstitution: article.author_corresponding_institution,
      },
    };
  }

  /**
   * Вычислить релевантность
   */
  private calculateRelevance(article: MedRxivArticle, query: IResearchQuery): number {
    let score = 0;
    const text = `${article.title} ${article.abstract}`.toLowerCase();

    // Ключевые слова SleepCore
    const sleepCoreKeywords = [
      { term: 'insomnia', weight: 20 },
      { term: 'cbt-i', weight: 25 },
      { term: 'cognitive behavioral therapy', weight: 20 },
      { term: 'sleep restriction', weight: 18 },
      { term: 'stimulus control', weight: 15 },
      { term: 'digital therapeutic', weight: 22 },
      { term: 'sleep disorder', weight: 15 },
      { term: 'sleep quality', weight: 12 },
      { term: 'sleep efficiency', weight: 15 },
      { term: 'polysomnography', weight: 12 },
      { term: 'actigraphy', weight: 15 },
      { term: 'circadian', weight: 12 },
      { term: 'melatonin', weight: 10 },
      { term: 'machine learning', weight: 12 },
      { term: 'wearable', weight: 12 },
      { term: 'mobile health', weight: 15 },
      { term: 'digital twin', weight: 20 },
      { term: 'personalized', weight: 12 },
    ];

    for (const { term, weight } of sleepCoreKeywords) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Ключевые слова запроса
    for (const kw of query.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 5;
      }
    }

    // Категория статьи
    const category = article.category.toLowerCase();
    if (category.includes('neurology')) score += 8;
    if (category.includes('psychiatry')) score += 10;
    if (category.includes('health informatics')) score += 12;

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность
   */
  private calculateBreakthroughScore(article: MedRxivArticle): number {
    let score = 0;
    const text = `${article.title} ${article.abstract}`.toLowerCase();

    const indicators = [
      { term: 'novel', weight: 12 },
      { term: 'first', weight: 10 },
      { term: 'breakthrough', weight: 15 },
      { term: 'significant', weight: 8 },
      { term: 'superior', weight: 10 },
      { term: 'outperform', weight: 12 },
      { term: 'state-of-the-art', weight: 15 },
      { term: 'randomized controlled trial', weight: 15 },
      { term: 'rct', weight: 12 },
      { term: 'large-scale', weight: 10 },
      { term: 'unprecedented', weight: 15 },
      { term: 'paradigm', weight: 12 },
    ];

    for (const { term, weight } of indicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Определить категории
   */
  private detectCategories(article: MedRxivArticle): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const text = `${article.title} ${article.abstract} ${article.category}`.toLowerCase();

    if (text.includes('cbt') || text.includes('cognitive behavioral')) {
      categories.push(ResearchCategory.CBT_I);
    }
    if (text.includes('mindfulness') || text.includes('acceptance') || text.includes('metacognitive')) {
      categories.push(ResearchCategory.THIRD_WAVE);
    }
    if (text.includes('machine learning') || text.includes('ai') || text.includes('deep learning')) {
      categories.push(ResearchCategory.AI_ML);
    }
    if (text.includes('wearable') || text.includes('actigraphy') || text.includes('fitbit')) {
      categories.push(ResearchCategory.WEARABLES);
    }
    if (text.includes('biomarker') || text.includes('hrv') || text.includes('cortisol')) {
      categories.push(ResearchCategory.BIOMARKERS);
    }
    if (text.includes('circadian') || text.includes('chronotype') || text.includes('melatonin')) {
      categories.push(ResearchCategory.CHRONOBIOLOGY);
    }
    if (text.includes('gene') || text.includes('genetic') || text.includes('polymorphism')) {
      categories.push(ResearchCategory.GENETICS);
    }
    if (text.includes('eeg') || text.includes('brain') || text.includes('neural')) {
      categories.push(ResearchCategory.NEUROSCIENCE);
    }
    if (text.includes('drug') || text.includes('pharmacological') || text.includes('medication')) {
      categories.push(ResearchCategory.PHARMACOLOGICAL);
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(article: MedRxivArticle, server: string): string[] {
    const tags: string[] = [
      'preprint',
      server,
      article.category.toLowerCase().replace(/\s+/g, '-'),
    ];

    const text = `${article.title} ${article.abstract}`.toLowerCase();

    if (text.includes('randomized')) tags.push('RCT');
    if (text.includes('meta-analysis')) tags.push('meta-analysis');
    if (text.includes('systematic review')) tags.push('systematic-review');
    if (text.includes('cohort')) tags.push('cohort');
    if (text.includes('longitudinal')) tags.push('longitudinal');

    return [...new Set(tags)];
  }

  /**
   * Определить связь с компонентами SleepCore
   */
  private detectSleepCoreComponents(abstract: string): string[] {
    const components: string[] = [];
    const text = abstract.toLowerCase();

    if (text.includes('sleep restriction')) components.push('SleepRestrictionEngine');
    if (text.includes('stimulus control')) components.push('StimulusControlEngine');
    if (text.includes('cognitive')) components.push('CognitiveRestructuringEngine');
    if (text.includes('relaxation')) components.push('RelaxationEngine');
    if (text.includes('mindfulness')) components.push('MBTIEngine');
    if (text.includes('acceptance')) components.push('ACTIEngine');
    if (text.includes('metacognitive')) components.push('MCTEngine');
    if (text.includes('prediction') || text.includes('forecast')) components.push('SleepPredictionService');
    if (text.includes('digital twin') || text.includes('simulation')) components.push('DigitalTwinService');
    if (text.includes('wearable') || text.includes('fitbit')) components.push('WearableIntegrationService');

    return components;
  }
}
