/**
 * @fileoverview arXiv Research Source
 * @module research/sources/ArxivSource
 * @description Интеграция с arXiv API для поиска препринтов (AI/ML, cs.LG, q-bio)
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
 * arXiv Entry from Atom feed
 */
interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: string[];
  categories: string[];
  links: Array<{ href: string; rel: string; type?: string }>;
  comment?: string;
  primaryCategory: string;
}

/**
 * arXiv Source Implementation
 */
export class ArxivSource extends BaseResearchSource {
  readonly name = ResearchSource.ARXIV;
  readonly displayName = 'arXiv';
  readonly description = 'arXiv preprint server for scientific papers';
  readonly baseUrl = 'https://export.arxiv.org/api/query';

  /**
   * Проверить доступность API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}?search_query=all:test&max_results=1`,
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
    const searchQuery = this.buildSearchQuery(query);
    const maxResults = query.maxResultsPerSource || 20;

    const response = await this.safeFetch(
      `${this.baseUrl}?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`
    );

    if (!response.ok) {
      throw new Error(`arXiv search failed: ${response.status}`);
    }

    const xml = await response.text();
    const entries = this.parseAtomFeed(xml);

    // Фильтр по дате
    const filteredEntries = entries.filter(entry => {
      const publishedDate = new Date(entry.published);
      return publishedDate >= query.dateRange.from && publishedDate <= query.dateRange.to;
    });

    return filteredEntries.map(entry => this.mapToResearchResult(entry, query));
  }

  /**
   * Получить последние препринты
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'insomnia OR sleep',
      sources: [ResearchSource.ARXIV],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['sleep', 'insomnia', 'circadian'],
      categories: [ResearchCategory.AI_ML],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить препринт по ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    const arxivId = id.replace('arxiv:', '');

    const response = await this.safeFetch(
      `${this.baseUrl}?id_list=${arxivId}`
    );

    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    const entries = this.parseAtomFeed(xml);

    if (entries.length === 0) {
      return null;
    }

    return this.mapToResearchResult(entries[0], {
      topic: '',
      sources: [ResearchSource.ARXIV],
      dateRange: { from: new Date(0), to: new Date() },
      keywords: [],
    });
  }

  /**
   * Построить поисковый запрос
   */
  private buildSearchQuery(query: IResearchQuery): string {
    // Простой запрос: sleep OR insomnia в любом поле
    // arXiv не имеет много статей о сне, поэтому упрощаем
    const coreTerms = [
      'sleep',
      'insomnia',
      'circadian',
      'actigraphy',
      'polysomnography',
    ];

    // Используем простой OR запрос для широкого охвата
    const searchTerms = coreTerms.map(kw => `all:${kw}`).join(' OR ');

    return searchTerms;
  }

  /**
   * Парсинг Atom feed
   */
  private parseAtomFeed(xml: string): ArxivEntry[] {
    const entries: ArxivEntry[] = [];

    // Найти все <entry> элементы
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];

      const entry: ArxivEntry = {
        id: this.extractTag(entryXml, 'id') || '',
        title: this.extractTag(entryXml, 'title')?.replace(/\s+/g, ' ').trim() || '',
        summary: this.extractTag(entryXml, 'summary')?.replace(/\s+/g, ' ').trim() || '',
        published: this.extractTag(entryXml, 'published') || '',
        updated: this.extractTag(entryXml, 'updated') || '',
        authors: this.extractAuthors(entryXml),
        categories: this.extractCategories(entryXml),
        links: this.extractLinks(entryXml),
        comment: this.extractTag(entryXml, 'arxiv:comment'),
        primaryCategory: this.extractPrimaryCategory(entryXml),
      };

      if (entry.id) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Извлечь значение тега
   */
  private extractTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Извлечь авторов
   */
  private extractAuthors(xml: string): string[] {
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    let match;

    while ((match = authorRegex.exec(xml)) !== null) {
      authors.push(match[1].trim());
    }

    return authors;
  }

  /**
   * Извлечь категории
   */
  private extractCategories(xml: string): string[] {
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"[^>]*\/>/g;
    let match;

    while ((match = catRegex.exec(xml)) !== null) {
      categories.push(match[1]);
    }

    return categories;
  }

  /**
   * Извлечь основную категорию
   */
  private extractPrimaryCategory(xml: string): string {
    const match = xml.match(/<arxiv:primary_category[^>]*term="([^"]+)"[^>]*\/>/);
    return match ? match[1] : '';
  }

  /**
   * Извлечь ссылки
   */
  private extractLinks(xml: string): ArxivEntry['links'] {
    const links: ArxivEntry['links'] = [];
    const linkRegex = /<link[^>]*href="([^"]+)"[^>]*(?:rel="([^"]*)")?[^>]*(?:type="([^"]*)")?[^>]*\/>/g;
    let match;

    while ((match = linkRegex.exec(xml)) !== null) {
      links.push({
        href: match[1],
        rel: match[2] || '',
        type: match[3],
      });
    }

    return links;
  }

  /**
   * Преобразовать в IResearchResult
   */
  private mapToResearchResult(
    entry: ArxivEntry,
    query: IResearchQuery
  ): IResearchResult {
    // Извлечь arXiv ID из URL
    const arxivIdMatch = entry.id.match(/abs\/(.+)$/);
    const arxivId = arxivIdMatch ? arxivIdMatch[1] : entry.id;

    const publishedAt = new Date(entry.published);
    const pdfLink = entry.links.find(l => l.type === 'application/pdf')?.href ||
                    entry.id.replace('/abs/', '/pdf/');

    const relevanceScore = this.calculateRelevance(entry, query);
    const breakthroughScore = this.calculateBreakthroughScore(entry);
    const categories = this.detectCategories(entry);

    const base = this.createBaseResult(
      `arxiv:${arxivId}`,
      entry.title,
      entry.summary,
      entry.id,
      publishedAt
    );

    return {
      ...base,
      authors: entry.authors,
      organizations: [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags: this.extractTags(entry),
      relatedSleepCoreComponents: this.detectSleepCoreComponents(entry.summary),
      confidenceLevel: ConfidenceLevel.LOW, // Препринты = низкая уверенность (не peer-reviewed)
      metadata: {
        arxivId,
        primaryCategory: entry.primaryCategory,
        allCategories: entry.categories,
        pdfUrl: pdfLink,
        comment: entry.comment,
        updatedAt: entry.updated,
      },
    };
  }

  /**
   * Вычислить релевантность
   */
  private calculateRelevance(entry: ArxivEntry, query: IResearchQuery): number {
    let score = 0;
    const text = `${entry.title} ${entry.summary}`.toLowerCase();

    // Ключевые слова SleepCore
    const sleepCoreKeywords = [
      { term: 'insomnia', weight: 20 },
      { term: 'sleep disorder', weight: 18 },
      { term: 'sleep quality', weight: 15 },
      { term: 'cbt-i', weight: 25 },
      { term: 'cognitive behavioral', weight: 15 },
      { term: 'digital therapeutic', weight: 20 },
      { term: 'sleep stage', weight: 12 },
      { term: 'circadian', weight: 12 },
      { term: 'actigraphy', weight: 15 },
      { term: 'wearable', weight: 12 },
      { term: 'personalized', weight: 12 },
      { term: 'reinforcement learning', weight: 15 },
      { term: 'digital twin', weight: 20 },
      { term: 'time series', weight: 8 },
      { term: 'health monitoring', weight: 10 },
    ];

    for (const { term, weight } of sleepCoreKeywords) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Ключевые слова запроса
    for (const keyword of query.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Категории arXiv
    const highValueCategories = ['cs.LG', 'cs.AI', 'q-bio.NC'];
    for (const cat of entry.categories) {
      if (highValueCategories.includes(cat)) {
        score += 5;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность
   */
  private calculateBreakthroughScore(entry: ArxivEntry): number {
    let score = 0;
    const text = `${entry.title} ${entry.summary}`.toLowerCase();

    const breakthroughIndicators = [
      { term: 'state-of-the-art', weight: 15 },
      { term: 'sota', weight: 15 },
      { term: 'outperform', weight: 12 },
      { term: 'novel', weight: 10 },
      { term: 'first', weight: 8 },
      { term: 'breakthrough', weight: 15 },
      { term: 'significant improvement', weight: 12 },
      { term: 'new architecture', weight: 12 },
      { term: 'new method', weight: 10 },
      { term: 'transformer', weight: 8 },
      { term: 'foundation model', weight: 15 },
      { term: 'large language model', weight: 10 },
      { term: 'diffusion', weight: 8 },
    ];

    for (const { term, weight } of breakthroughIndicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Комментарии (accepted at NeurIPS, ICML, etc.)
    const comment = entry.comment?.toLowerCase() || '';
    const topVenues = ['neurips', 'icml', 'iclr', 'aaai', 'ijcai', 'cvpr', 'nature', 'science'];
    for (const venue of topVenues) {
      if (comment.includes(venue)) {
        score += 20;
        break;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Определить категории
   */
  private detectCategories(entry: ArxivEntry): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const text = `${entry.title} ${entry.summary}`.toLowerCase();

    // Всегда AI/ML для arXiv
    categories.push(ResearchCategory.AI_ML);

    if (text.includes('wearable') || text.includes('actigraphy') || text.includes('sensor')) {
      categories.push(ResearchCategory.WEARABLES);
    }
    if (text.includes('biomarker') || text.includes('hrv') || text.includes('heart rate')) {
      categories.push(ResearchCategory.BIOMARKERS);
    }
    if (text.includes('digital twin') || text.includes('simulation')) {
      categories.push(ResearchCategory.DIGITAL_TWIN);
    }
    if (text.includes('circadian') || text.includes('chronotype')) {
      categories.push(ResearchCategory.CHRONOBIOLOGY);
    }
    if (text.includes('eeg') || text.includes('brain') || text.includes('neural')) {
      categories.push(ResearchCategory.NEUROSCIENCE);
    }
    if (text.includes('cbt') || text.includes('cognitive behavioral')) {
      categories.push(ResearchCategory.CBT_I);
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(entry: ArxivEntry): string[] {
    const tags: string[] = [];

    // arXiv категории как теги
    tags.push(...entry.categories.slice(0, 3));

    // Методологические теги из текста
    const text = `${entry.title} ${entry.summary}`.toLowerCase();

    if (text.includes('deep learning')) tags.push('deep-learning');
    if (text.includes('transformer')) tags.push('transformer');
    if (text.includes('cnn') || text.includes('convolutional')) tags.push('CNN');
    if (text.includes('lstm') || text.includes('rnn')) tags.push('RNN');
    if (text.includes('reinforcement learning')) tags.push('RL');
    if (text.includes('supervised')) tags.push('supervised');
    if (text.includes('unsupervised')) tags.push('unsupervised');
    if (text.includes('self-supervised')) tags.push('self-supervised');

    return [...new Set(tags)];
  }

  /**
   * Определить связь с компонентами SleepCore
   */
  private detectSleepCoreComponents(summary: string): string[] {
    const components: string[] = [];
    const text = summary.toLowerCase();

    if (text.includes('prediction') || text.includes('forecasting')) {
      components.push('SleepPredictionService');
    }
    if (text.includes('digital twin') || text.includes('simulation') || text.includes('personalized model')) {
      components.push('DigitalTwinService');
    }
    if (text.includes('reinforcement learning') || text.includes('adaptive')) {
      components.push('AdaptiveTherapyEngine');
    }
    if (text.includes('time series') || text.includes('sequential')) {
      components.push('ESNColdStartPredictor');
    }
    if (text.includes('causal') || text.includes('intervention')) {
      components.push('CausalInsightsService');
    }
    if (text.includes('classification') || text.includes('detection')) {
      components.push('CrisisDetectionService');
    }

    return components;
  }
}
