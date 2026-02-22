/**
 * @fileoverview PubMed Research Source
 * @module research/sources/PubMedSource
 * @description Интеграция с NCBI E-utilities API для поиска научных публикаций
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
 * PubMed Article Response
 */
interface PubMedArticle {
  uid: string;
  pubdate: string;
  epubdate?: string;
  source: string;
  authors: Array<{ name: string }>;
  title: string;
  sorttitle: string;
  volume?: string;
  issue?: string;
  pages?: string;
  lang: string[];
  nlmuniqueid?: string;
  issn?: string;
  essn?: string;
  pubtype: string[];
  recordstatus: string;
  pubstatus: string;
  articleids: Array<{ idtype: string; value: string }>;
  history: Array<{ pubstatus: string; date: string }>;
  fulljournalname?: string;
  elocationid?: string;
  doctype?: string;
  booktitle?: string;
  medium?: string;
  edition?: string;
  publisherlocation?: string;
  publishername?: string;
  srcdate?: string;
  reportnumber?: string;
  availablefromurl?: string;
  locationlabel?: string;
  doccontriblist?: string[];
  docdate?: string;
  bookname?: string;
  chapter?: string;
  sortpubdate?: string;
  sortfirstauthor?: string;
  vernaculartitle?: string;
}

/**
 * PubMed Search Response
 */
interface PubMedSearchResult {
  header: {
    type: string;
    version: string;
  };
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    translationset: Array<{ from: string; to: string }>;
    querytranslation: string;
  };
}

/**
 * PubMed Summary Response
 */
interface PubMedSummaryResult {
  header: {
    type: string;
    version: string;
  };
  result: {
    uids: string[];
    [key: string]: PubMedArticle | string[];
  };
}

/**
 * PubMed Abstract Response
 */
interface PubMedAbstractResult {
  PubmedArticleSet?: {
    PubmedArticle?: Array<{
      MedlineCitation?: {
        Article?: {
          Abstract?: {
            AbstractText?: string | string[];
          };
        };
      };
    }>;
  };
}

/**
 * PubMed Source Implementation
 */
export class PubMedSource extends BaseResearchSource {
  readonly name = ResearchSource.PUBMED;
  readonly displayName = 'PubMed';
  readonly description = 'NCBI PubMed database for biomedical literature';
  readonly baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  private apiKey?: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.NCBI_API_KEY;
  }

  /**
   * Проверить доступность PubMed API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/einfo.fcgi?db=pubmed&retmode=json`,
        {},
        15000  // Увеличен таймаут до 15 сек
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Поиск публикаций по запросу
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const searchTerm = this.buildSearchTerm(query);
    const ids = await this.searchIds(searchTerm, query.maxResultsPerSource || 20);

    if (ids.length === 0) {
      return [];
    }

    const articles = await this.fetchArticles(ids);
    const abstracts = await this.fetchAbstracts(ids);

    return articles.map((article, index) =>
      this.mapToResearchResult(article, abstracts[index], query)
    );
  }

  /**
   * Получить последние публикации
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'insomnia OR sleep disorders OR CBT-I',
      sources: [ResearchSource.PUBMED],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['insomnia', 'sleep', 'CBT-I'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить публикацию по PMID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    const articles = await this.fetchArticles([id]);
    const abstracts = await this.fetchAbstracts([id]);

    if (articles.length === 0) {
      return null;
    }

    return this.mapToResearchResult(articles[0], abstracts[0], {
      topic: '',
      sources: [ResearchSource.PUBMED],
      dateRange: { from: new Date(0), to: new Date() },
      keywords: [],
    });
  }

  /**
   * Построить поисковый запрос для PubMed
   */
  private buildSearchTerm(query: IResearchQuery): string {
    // Простой запрос для широкого охвата
    const coreTerms = [
      'insomnia',
      'CBT-I',
      'sleep disorder',
      'cognitive behavioral therapy sleep',
    ];

    // Используем OR для ключевых терминов
    const searchTerms = coreTerms.map(t => `"${t}"[Title/Abstract]`).join(' OR ');

    // Форматируем даты в формате PubMed (YYYY/MM/DD)
    const fromDate = this.formatPubMedDate(query.dateRange.from);
    const toDate = this.formatPubMedDate(query.dateRange.to);

    // Комбинируем поиск с датами
    return `(${searchTerms}) AND ("${fromDate}"[Date - Publication] : "${toDate}"[Date - Publication])`;
  }

  /**
   * Форматировать дату для PubMed API (YYYY/MM/DD)
   */
  private formatPubMedDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Конвертировать категории в MeSH термины
   */
  private categoriesToMeSH(categories: ResearchCategory[]): string[] {
    const meshMap: Partial<Record<ResearchCategory, string[]>> = {
      [ResearchCategory.CBT_I]: [
        '"Cognitive Behavioral Therapy"[MeSH]',
        '"Sleep Initiation and Maintenance Disorders/therapy"[MeSH]',
      ],
      [ResearchCategory.THIRD_WAVE]: [
        '"Mindfulness"[MeSH]',
        '"Acceptance and Commitment Therapy"[MeSH]',
      ],
      [ResearchCategory.AI_ML]: [
        '"Machine Learning"[MeSH]',
        '"Artificial Intelligence"[MeSH]',
        '"Deep Learning"[MeSH]',
      ],
      [ResearchCategory.WEARABLES]: [
        '"Wearable Electronic Devices"[MeSH]',
        '"Actigraphy"[MeSH]',
      ],
      [ResearchCategory.BIOMARKERS]: [
        '"Biomarkers"[MeSH]',
        '"Heart Rate"[MeSH]',
      ],
      [ResearchCategory.NEUROSCIENCE]: [
        '"Neurosciences"[MeSH]',
        '"Brain"[MeSH]',
      ],
      [ResearchCategory.CHRONOBIOLOGY]: [
        '"Circadian Rhythm"[MeSH]',
        '"Chronobiology Disorders"[MeSH]',
      ],
      [ResearchCategory.PHARMACOLOGICAL]: [
        '"Hypnotics and Sedatives"[MeSH]',
        '"Sleep Aids, Pharmaceutical"[MeSH]',
      ],
    };

    const terms: string[] = [];
    for (const category of categories) {
      const mesh = meshMap[category];
      if (mesh) {
        terms.push(...mesh);
      }
    }
    return terms;
  }

  /**
   * Поиск ID публикаций
   */
  private async searchIds(term: string, limit: number): Promise<string[]> {
    const params = new URLSearchParams({
      db: 'pubmed',
      term,
      retmax: String(limit),
      retmode: 'json',
      sort: 'date',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const response = await this.safeFetch(
      `${this.baseUrl}/esearch.fcgi?${params}`
    );

    if (!response.ok) {
      throw new Error(`PubMed search failed: ${response.status}`);
    }

    const data = await response.json() as PubMedSearchResult;
    return data.esearchresult.idlist;
  }

  /**
   * Получить метаданные статей
   */
  private async fetchArticles(ids: string[]): Promise<PubMedArticle[]> {
    if (ids.length === 0) return [];

    const params = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const response = await this.safeFetch(
      `${this.baseUrl}/esummary.fcgi?${params}`
    );

    if (!response.ok) {
      throw new Error(`PubMed summary failed: ${response.status}`);
    }

    const data = await response.json() as PubMedSummaryResult;

    return ids.map(id => data.result[id] as PubMedArticle).filter(Boolean);
  }

  /**
   * Получить абстракты
   */
  private async fetchAbstracts(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];

    const params = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/efetch.fcgi?${params}`
      );

      if (!response.ok) {
        return ids.map(() => '');
      }

      const xml = await response.text();
      return this.parseAbstracts(xml, ids.length);
    } catch {
      return ids.map(() => '');
    }
  }

  /**
   * Парсинг абстрактов из XML
   */
  private parseAbstracts(xml: string, expectedCount: number): string[] {
    const abstracts: string[] = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;

    // Разделяем по статьям
    const articles = xml.split('<PubmedArticle>');

    for (let i = 1; i <= expectedCount && i < articles.length; i++) {
      const article = articles[i] || '';
      const matches = [...article.matchAll(abstractRegex)];

      if (matches.length > 0) {
        const fullAbstract = matches
          .map(m => m[1].trim())
          .join(' ')
          .replace(/<[^>]+>/g, ''); // Убрать XML теги
        abstracts.push(fullAbstract);
      } else {
        abstracts.push('');
      }
    }

    // Заполнить недостающие
    while (abstracts.length < expectedCount) {
      abstracts.push('');
    }

    return abstracts;
  }

  /**
   * Преобразовать в IResearchResult
   */
  private mapToResearchResult(
    article: PubMedArticle,
    abstract: string,
    query: IResearchQuery
  ): IResearchResult {
    const pmid = article.uid;
    const publishedAt = this.parseDate(article.pubdate || article.epubdate || '');

    // Вычислить релевантность
    const relevanceScore = this.calculateRelevance(article, abstract, query);

    // Вычислить прорывность
    const breakthroughScore = this.calculateBreakthroughScore(article, abstract);

    // Определить категории
    const categories = this.detectCategories(article.title, abstract);

    // Извлечь теги
    const tags = this.extractTags(article, abstract);

    const base = this.createBaseResult(
      `pubmed:${pmid}`,
      article.title,
      abstract || 'Abstract not available',
      `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      publishedAt
    );

    return {
      ...base,
      authors: article.authors?.map(a => a.name) || [],
      organizations: article.fulljournalname ? [article.fulljournalname] : [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags,
      relatedSleepCoreComponents: this.detectSleepCoreComponents(abstract),
      confidenceLevel: abstract ? ConfidenceLevel.MEDIUM : ConfidenceLevel.LOW,
      metadata: {
        pmid,
        journal: article.fulljournalname || article.source,
        volume: article.volume,
        issue: article.issue,
        pages: article.pages,
        pubtype: article.pubtype,
        doi: article.articleids?.find(a => a.idtype === 'doi')?.value,
      },
    };
  }

  /**
   * Вычислить релевантность для SleepCore
   */
  private calculateRelevance(
    article: PubMedArticle,
    abstract: string,
    query: IResearchQuery
  ): number {
    let score = 0;
    const text = `${article.title} ${abstract}`.toLowerCase();

    // Ключевые слова SleepCore (высокий приоритет)
    const sleepCoreKeywords = [
      { term: 'cbt-i', weight: 20 },
      { term: 'cognitive behavioral therapy insomnia', weight: 20 },
      { term: 'sleep restriction', weight: 15 },
      { term: 'stimulus control', weight: 15 },
      { term: 'digital therapeutics', weight: 18 },
      { term: 'dtx', weight: 15 },
      { term: 'mobile health', weight: 12 },
      { term: 'mhealth insomnia', weight: 15 },
      { term: 'digital twin', weight: 20 },
      { term: 'personalized therapy', weight: 15 },
      { term: 'adaptive intervention', weight: 15 },
      { term: 'machine learning sleep', weight: 15 },
      { term: 'reinforcement learning', weight: 12 },
      { term: 'mindfulness insomnia', weight: 12 },
      { term: 'act insomnia', weight: 12 },
      { term: 'metacognitive therapy', weight: 15 },
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

    // Тип публикации (RCT, meta-analysis = высокая релевантность)
    const pubTypes = article.pubtype?.map(p => p.toLowerCase()) || [];
    if (pubTypes.some(p => p.includes('randomized controlled trial'))) {
      score += 15;
    }
    if (pubTypes.some(p => p.includes('meta-analysis'))) {
      score += 20;
    }
    if (pubTypes.some(p => p.includes('systematic review'))) {
      score += 18;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность исследования
   */
  private calculateBreakthroughScore(
    article: PubMedArticle,
    abstract: string
  ): number {
    let score = 0;
    const text = `${article.title} ${abstract}`.toLowerCase();

    // Индикаторы прорыва
    const breakthroughIndicators = [
      { term: 'first', weight: 10 },
      { term: 'novel', weight: 12 },
      { term: 'breakthrough', weight: 15 },
      { term: 'significantly improved', weight: 10 },
      { term: 'superior to', weight: 10 },
      { term: 'outperformed', weight: 10 },
      { term: 'paradigm', weight: 12 },
      { term: 'revolutionary', weight: 12 },
      { term: 'unprecedented', weight: 15 },
      { term: 'state-of-the-art', weight: 10 },
      { term: 'new mechanism', weight: 12 },
      { term: 'newly discovered', weight: 12 },
      { term: 'large effect size', weight: 15 },
      { term: 'd = 1', weight: 12 },
      { term: 'remission rate', weight: 10 },
    ];

    for (const { term, weight } of breakthroughIndicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Тип публикации
    const pubTypes = article.pubtype?.map(p => p.toLowerCase()) || [];
    if (pubTypes.some(p => p.includes('meta-analysis'))) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Определить категории по тексту
   */
  private detectCategories(title: string, abstract: string): ResearchCategory[] {
    const text = `${title} ${abstract}`.toLowerCase();
    const categories: ResearchCategory[] = [];

    const categoryKeywords: Record<ResearchCategory, string[]> = {
      [ResearchCategory.CBT_I]: ['cbt-i', 'cognitive behavioral', 'sleep restriction', 'stimulus control'],
      [ResearchCategory.THIRD_WAVE]: ['mindfulness', 'acceptance', 'act ', 'metacognitive', 'mbti', 'mbt-i'],
      [ResearchCategory.PHARMACOLOGICAL]: ['drug', 'medication', 'pharmacological', 'sedative', 'hypnotic'],
      [ResearchCategory.DEVICE_BASED]: ['device', 'neurostimulation', 'tms', 'tdcs'],
      [ResearchCategory.AI_ML]: ['machine learning', 'artificial intelligence', 'deep learning', 'neural network'],
      [ResearchCategory.DIGITAL_TWIN]: ['digital twin', 'simulation', 'personalized model'],
      [ResearchCategory.WEARABLES]: ['wearable', 'actigraphy', 'smartwatch', 'fitness tracker'],
      [ResearchCategory.BIOMARKERS]: ['biomarker', 'hrv', 'heart rate variability', 'cortisol'],
      [ResearchCategory.COMPETITORS]: ['sleepio', 'somryst', 'stellar sleep', 'calm', 'headspace'],
      [ResearchCategory.MARKET]: ['market', 'economic', 'cost-effective', 'healthcare cost'],
      [ResearchCategory.REGULATORY]: ['fda', 'ce mark', 'regulatory', 'approval'],
      [ResearchCategory.FUNDING]: ['funding', 'investment', 'venture', 'grant'],
      [ResearchCategory.NEUROSCIENCE]: ['brain', 'neural', 'neuroscience', 'eeg', 'fmri'],
      [ResearchCategory.CHRONOBIOLOGY]: ['circadian', 'chronotype', 'melatonin', 'light therapy'],
      [ResearchCategory.GENETICS]: ['genetic', 'gene', 'polymorphism', 'gwas'],
      [ResearchCategory.MICROBIOME]: ['microbiome', 'gut-brain', 'probiotics'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        categories.push(category as ResearchCategory);
      }
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(article: PubMedArticle, abstract: string): string[] {
    const tags: string[] = [];
    const text = `${article.title} ${abstract}`.toLowerCase();

    // Типы исследований
    if (article.pubtype) {
      tags.push(...article.pubtype.slice(0, 3));
    }

    // Методологические теги
    if (text.includes('randomized')) tags.push('RCT');
    if (text.includes('meta-analysis')) tags.push('meta-analysis');
    if (text.includes('systematic review')) tags.push('systematic-review');
    if (text.includes('pilot')) tags.push('pilot');
    if (text.includes('feasibility')) tags.push('feasibility');

    // Популяция
    if (text.includes('older adult') || text.includes('elderly')) tags.push('elderly');
    if (text.includes('adolescent') || text.includes('teen')) tags.push('adolescent');
    if (text.includes('comorbid')) tags.push('comorbidity');

    return [...new Set(tags)];
  }

  /**
   * Определить связь с компонентами SleepCore
   */
  private detectSleepCoreComponents(abstract: string): string[] {
    const text = abstract.toLowerCase();
    const components: string[] = [];

    const componentKeywords: Record<string, string[]> = {
      'SleepRestrictionEngine': ['sleep restriction', 'time in bed', 'tib', 'sleep efficiency'],
      'StimulusControlEngine': ['stimulus control', 'bed for sleep', 'sleep association'],
      'CognitiveRestructuringEngine': ['cognitive restructuring', 'sleep beliefs', 'dysfunctional beliefs'],
      'RelaxationEngine': ['relaxation', 'progressive muscle', 'breathing', 'autogenic'],
      'SleepHygieneEngine': ['sleep hygiene', 'sleep environment', 'caffeine', 'alcohol'],
      'DigitalTwinService': ['digital twin', 'simulation', 'prediction model', 'personalized'],
      'MBTIEngine': ['mindfulness', 'meditation', 'awareness'],
      'ACTIEngine': ['acceptance', 'act ', 'psychological flexibility'],
      'MCTEngine': ['metacognitive', 'worry', 'rumination'],
      'CrisisDetectionService': ['suicide', 'crisis', 'emergency', 'self-harm'],
    };

    for (const [component, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Парсинг даты публикации
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Форматы: "2024 Jan", "2024 Jan 15", "2024"
    const parts = dateStr.split(' ');
    const year = parseInt(parts[0], 10);

    if (isNaN(year)) return new Date();

    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
    };

    const month = parts[1] ? (monthMap[parts[1]] ?? 0) : 0;
    const day = parts[2] ? parseInt(parts[2], 10) : 1;

    return new Date(year, month, day);
  }
}
