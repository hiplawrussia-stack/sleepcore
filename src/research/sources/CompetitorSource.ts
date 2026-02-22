/**
 * @fileoverview Competitor Monitoring Source
 * @module research/sources/CompetitorSource
 * @description Мониторинг конкурентов через веб-поиск и новости
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchQuery,
  IResearchResult,
  ICompetitorUpdate,
  ResearchSource,
  ResearchCategory,
  ConfidenceLevel,
} from '../types';
import { BaseResearchSource } from './IResearchSource';

/**
 * Данные о конкурентах
 */
interface CompetitorInfo {
  name: string;
  aliases: string[];
  products: string[];
  keywords: string[];
  website?: string;
}

/**
 * Competitor Source Implementation
 *
 * Мониторит:
 * - Big Health (Sleepio, SleepioRx)
 * - Pear Therapeutics (Somryst)
 * - Nox Health
 * - SleepScore Labs
 * - Stellar Sleep
 * - Calm, Headspace (wellness)
 */
export class CompetitorSource extends BaseResearchSource {
  readonly name = ResearchSource.COMPETITORS;
  readonly displayName = 'Competitor Intelligence';
  readonly description = 'Monitoring DTx and sleep health competitors';
  readonly baseUrl = 'https://news.google.com/rss/search';

  /**
   * База данных конкурентов
   */
  private readonly competitors: CompetitorInfo[] = [
    {
      name: 'Big Health',
      aliases: ['BigHealth'],
      products: ['Sleepio', 'SleepioRx', 'Daylight'],
      keywords: ['digital therapeutic', 'insomnia', 'CBT-I', 'NHS'],
      website: 'https://www.bighealth.com',
    },
    {
      name: 'Pear Therapeutics',
      aliases: ['Pear'],
      products: ['Somryst', 'reSET', 'reSET-O'],
      keywords: ['FDA cleared', 'prescription digital therapeutic', 'PDT'],
      website: 'https://peartherapeutics.com',
    },
    {
      name: 'Nox Health',
      aliases: ['Nox Medical', 'NoxHealth'],
      products: ['NightOwl', 'Nox T3'],
      keywords: ['sleep diagnostics', 'home sleep test', 'apnea'],
      website: 'https://noxhealth.com',
    },
    {
      name: 'SleepScore Labs',
      aliases: ['SleepScore'],
      products: ['SleepScore', 'SleepScore Max', 'SleepScore App'],
      keywords: ['sleep tracking', 'sleep improvement', 'sonar'],
      website: 'https://www.sleepscore.com',
    },
    {
      name: 'Stellar Sleep',
      aliases: ['StellarSleep'],
      products: ['Stellar Sleep App'],
      keywords: ['CBT-I', 'insomnia app', 'sleep coaching'],
      website: 'https://stellarsleep.com',
    },
    {
      name: 'Calm',
      aliases: [],
      products: ['Calm App', 'Calm Health', 'Calm Business'],
      keywords: ['meditation', 'sleep stories', 'relaxation'],
      website: 'https://www.calm.com',
    },
    {
      name: 'Headspace',
      aliases: ['Headspace Health'],
      products: ['Headspace App', 'Headspace Care', 'Ginger'],
      keywords: ['meditation', 'mindfulness', 'mental health'],
      website: 'https://www.headspace.com',
    },
    {
      name: 'Happify Health',
      aliases: ['Happify'],
      products: ['Happify', 'Ensemble'],
      keywords: ['mental health', 'digital therapeutic', 'behavioral health'],
      website: 'https://www.happify.com',
    },
    {
      name: 'Teladoc Health',
      aliases: ['Teladoc', 'Livongo'],
      products: ['BetterHelp', 'Livongo'],
      keywords: ['telehealth', 'virtual care', 'chronic condition'],
      website: 'https://www.teladochealth.com',
    },
    {
      name: 'Oura',
      aliases: ['Oura Health'],
      products: ['Oura Ring', 'Oura App'],
      keywords: ['sleep tracking', 'wearable', 'recovery', 'readiness'],
      website: 'https://ouraring.com',
    },
  ];

  /**
   * Проверить доступность
   */
  async isAvailable(): Promise<boolean> {
    // Google News RSS всегда доступен
    return true;
  }

  /**
   * Поиск обновлений конкурентов
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    // Определить каких конкурентов искать
    const targetCompetitors = this.getTargetCompetitors(query);

    for (const competitor of targetCompetitors) {
      try {
        const competitorResults = await this.searchCompetitor(competitor, query);
        results.push(...competitorResults);
      } catch (error) {
        console.warn(`Failed to search competitor ${competitor.name}:`, error);
      }
    }

    // Сортировка по дате
    results.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return results.slice(0, query.maxResultsPerSource || 50);
  }

  /**
   * Получить последние обновления
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'sleep digital therapeutic',
      sources: [ResearchSource.COMPETITORS],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: [],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить по ID (не применимо для этого источника)
   */
  async getById(_id: string): Promise<IResearchResult | null> {
    return null;
  }

  /**
   * Поиск обновлений с типизацией ICompetitorUpdate
   */
  async searchCompetitorUpdates(query: IResearchQuery): Promise<ICompetitorUpdate[]> {
    const results = await this.search(query);

    return results.map(result => this.mapToCompetitorUpdate(result));
  }

  /**
   * Определить целевых конкурентов
   */
  private getTargetCompetitors(query: IResearchQuery): CompetitorInfo[] {
    // Если в запросе указаны конкретные конкуренты
    if (query.keywords.length > 0) {
      const specified = this.competitors.filter(c =>
        query.keywords.some(kw =>
          c.name.toLowerCase().includes(kw.toLowerCase()) ||
          c.aliases.some(a => a.toLowerCase().includes(kw.toLowerCase())) ||
          c.products.some(p => p.toLowerCase().includes(kw.toLowerCase()))
        )
      );

      if (specified.length > 0) {
        return specified;
      }
    }

    // Вернуть всех конкурентов
    return this.competitors;
  }

  /**
   * Поиск новостей по конкретному конкуренту
   */
  private async searchCompetitor(
    competitor: CompetitorInfo,
    query: IResearchQuery
  ): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    // Поиск по названию компании
    const companyNews = await this.searchGoogleNews(
      `"${competitor.name}" (sleep OR insomnia OR health OR therapeutic)`,
      query
    );
    results.push(...companyNews.map(n => this.enrichWithCompetitor(n, competitor)));

    // Поиск по продуктам
    for (const product of competitor.products.slice(0, 2)) { // Лимит для скорости
      const productNews = await this.searchGoogleNews(
        `"${product}" (sleep OR health)`,
        query
      );
      results.push(...productNews.map(n => this.enrichWithCompetitor(n, competitor)));
    }

    // Убрать дубликаты
    const uniqueResults = this.deduplicateResults(results);

    return uniqueResults;
  }

  /**
   * Поиск в Google News RSS
   */
  private async searchGoogleNews(
    searchQuery: string,
    query: IResearchQuery
  ): Promise<IResearchResult[]> {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `${this.baseUrl}?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const response = await this.safeFetch(url, {}, 10000);

      if (!response.ok) {
        return [];
      }

      const xml = await response.text();
      return this.parseRssFeed(xml, query);
    } catch {
      return [];
    }
  }

  /**
   * Парсинг RSS feed
   */
  private parseRssFeed(xml: string, query: IResearchQuery): IResearchResult[] {
    const results: IResearchResult[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title') || '';
      const link = this.extractTag(itemXml, 'link') || '';
      const pubDate = this.extractTag(itemXml, 'pubDate') || '';
      const description = this.extractTag(itemXml, 'description') || '';
      const source = this.extractTag(itemXml, 'source') || '';

      const publishedAt = new Date(pubDate);

      // Фильтр по дате
      if (publishedAt < query.dateRange.from || publishedAt > query.dateRange.to) {
        continue;
      }

      // Очистить HTML из description
      const cleanDescription = description
        .replace(/<[^>]+>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .trim();

      const id = `comp:${this.hashString(link)}`;

      const base = this.createBaseResult(
        id,
        this.decodeHtmlEntities(title),
        cleanDescription,
        link,
        publishedAt
      );

      results.push({
        ...base,
        authors: [],
        organizations: source ? [source] : [],
        relevanceScore: this.calculateRelevance(title, cleanDescription, query),
        breakthroughScore: this.calculateBreakthroughScore(title, cleanDescription),
        categories: this.detectCategories(title, cleanDescription),
        tags: this.extractTags(title, cleanDescription),
        relatedSleepCoreComponents: [],
        confidenceLevel: ConfidenceLevel.LOW,
        metadata: {
          source,
          type: 'news',
        },
      });
    }

    return results;
  }

  /**
   * Извлечь тег из XML
   */
  private extractTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Декодировать HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
    };

    return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
  }

  /**
   * Обогатить результат информацией о конкуренте
   */
  private enrichWithCompetitor(
    result: IResearchResult,
    competitor: CompetitorInfo
  ): IResearchResult {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        competitor: competitor.name,
        competitorProducts: competitor.products,
        competitorWebsite: competitor.website,
      },
      categories: [
        ...result.categories,
        ResearchCategory.COMPETITORS,
      ],
    };
  }

  /**
   * Преобразовать в ICompetitorUpdate
   */
  private mapToCompetitorUpdate(result: IResearchResult): ICompetitorUpdate {
    const text = `${result.title} ${result.summary}`.toLowerCase();

    // Определить тип обновления
    let updateType: ICompetitorUpdate['updateType'] = 'other';

    if (text.includes('funding') || text.includes('raise') || text.includes('investment') || text.includes('million')) {
      updateType = 'funding';
    } else if (text.includes('fda') || text.includes('cleared') || text.includes('approved') || text.includes('ce mark')) {
      updateType = 'regulatory';
    } else if (text.includes('partnership') || text.includes('partner') || text.includes('collaborate') || text.includes('agreement')) {
      updateType = 'partnership';
    } else if (text.includes('launch') || text.includes('release') || text.includes('new feature') || text.includes('update')) {
      updateType = 'product';
    } else if (text.includes('study') || text.includes('research') || text.includes('clinical') || text.includes('trial')) {
      updateType = 'publication';
    }

    const competitorName = (result.metadata?.competitor as string) || 'Unknown';

    return {
      company: competitorName,
      product: (result.metadata?.competitorProducts as string[])?.[0],
      updateType,
      description: result.summary,
      date: result.publishedAt,
      sourceUrl: result.url,
      impactAssessment: this.assessImpact(result, updateType),
      recommendedActions: this.generateRecommendations(result, updateType),
    };
  }

  /**
   * Оценить влияние на SleepCore
   */
  private assessImpact(result: IResearchResult, updateType: ICompetitorUpdate['updateType']): string {
    const text = `${result.title} ${result.summary}`.toLowerCase();

    switch (updateType) {
      case 'funding':
        if (text.includes('series') || text.includes('million')) {
          return 'HIGH: Competitor received significant funding, may accelerate development';
        }
        return 'MEDIUM: Funding activity detected';

      case 'regulatory':
        if (text.includes('fda clear') || text.includes('approved')) {
          return 'HIGH: Regulatory milestone achieved, potential market expansion';
        }
        return 'MEDIUM: Regulatory activity detected';

      case 'partnership':
        if (text.includes('nhs') || text.includes('insurer') || text.includes('employer')) {
          return 'HIGH: B2B partnership with major payer/provider';
        }
        return 'MEDIUM: Partnership announced';

      case 'product':
        if (text.includes('ai') || text.includes('personalized') || text.includes('digital twin')) {
          return 'HIGH: Competitor advancing AI capabilities similar to SleepCore';
        }
        return 'LOW: Product update';

      default:
        return 'LOW: General news activity';
    }
  }

  /**
   * Сгенерировать рекомендации
   */
  private generateRecommendations(
    result: IResearchResult,
    updateType: ICompetitorUpdate['updateType']
  ): string[] {
    const recommendations: string[] = [];

    switch (updateType) {
      case 'funding':
        recommendations.push('Monitor competitor hiring and product announcements');
        recommendations.push('Review competitive differentiation strategy');
        break;

      case 'regulatory':
        recommendations.push('Analyze regulatory pathway used by competitor');
        recommendations.push('Assess implications for SleepCore regulatory strategy');
        break;

      case 'partnership':
        recommendations.push('Identify similar partnership opportunities');
        recommendations.push('Analyze partnership terms if disclosed');
        break;

      case 'product':
        recommendations.push('Conduct feature comparison analysis');
        recommendations.push('Assess competitive advantages of SleepCore');
        break;

      case 'publication':
        recommendations.push('Review study methodology and results');
        recommendations.push('Compare with SleepCore evidence base');
        break;
    }

    recommendations.push('Add to weekly competitive intelligence report');

    return recommendations;
  }

  /**
   * Вычислить релевантность
   */
  private calculateRelevance(title: string, description: string, query: IResearchQuery): number {
    let score = 30; // Базовый score для новостей конкурентов
    const text = `${title} ${description}`.toLowerCase();

    // Высокая релевантность для DTx тем
    const highValueTerms = [
      { term: 'insomnia', weight: 15 },
      { term: 'sleep', weight: 10 },
      { term: 'cbt-i', weight: 20 },
      { term: 'digital therapeutic', weight: 18 },
      { term: 'dtx', weight: 15 },
      { term: 'fda', weight: 12 },
      { term: 'clinical', weight: 10 },
      { term: 'efficacy', weight: 12 },
    ];

    for (const { term, weight } of highValueTerms) {
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

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность
   */
  private calculateBreakthroughScore(title: string, description: string): number {
    let score = 0;
    const text = `${title} ${description}`.toLowerCase();

    const indicators = [
      { term: 'first', weight: 10 },
      { term: 'breakthrough', weight: 15 },
      { term: 'revolutionary', weight: 12 },
      { term: 'fda cleared', weight: 15 },
      { term: 'approved', weight: 12 },
      { term: 'million', weight: 10 },
      { term: 'billion', weight: 15 },
      { term: 'partnership', weight: 8 },
      { term: 'acquisition', weight: 12 },
      { term: 'ipo', weight: 15 },
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
  private detectCategories(title: string, description: string): ResearchCategory[] {
    const categories: ResearchCategory[] = [ResearchCategory.COMPETITORS];
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('funding') || text.includes('invest') || text.includes('raise')) {
      categories.push(ResearchCategory.FUNDING);
    }
    if (text.includes('fda') || text.includes('regulatory') || text.includes('approved')) {
      categories.push(ResearchCategory.REGULATORY);
    }
    if (text.includes('market') || text.includes('revenue') || text.includes('growth')) {
      categories.push(ResearchCategory.MARKET);
    }
    if (text.includes('cbt') || text.includes('cognitive behavioral')) {
      categories.push(ResearchCategory.CBT_I);
    }
    if (text.includes('ai') || text.includes('machine learning')) {
      categories.push(ResearchCategory.AI_ML);
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(title: string, description: string): string[] {
    const tags: string[] = ['competitor-news'];
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('funding')) tags.push('funding');
    if (text.includes('partnership')) tags.push('partnership');
    if (text.includes('fda')) tags.push('FDA');
    if (text.includes('launch')) tags.push('product-launch');
    if (text.includes('study') || text.includes('clinical')) tags.push('clinical-evidence');

    return tags;
  }

  /**
   * Удалить дубликаты
   */
  private deduplicateResults(results: IResearchResult[]): IResearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Простой хэш строки
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
