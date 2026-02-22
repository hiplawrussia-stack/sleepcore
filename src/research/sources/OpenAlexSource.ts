/**
 * @fileoverview OpenAlex Research Source
 * @module research/sources/OpenAlexSource
 * @description Интеграция с OpenAlex API (250M+ works, fully open)
 *
 * API Features:
 * - 250M+ scholarly works
 * - Fully open, no API key required
 * - No rate limits (polite pool)
 * - Automatic concept/topic classification
 * - Institution and author disambiguation
 *
 * @see https://docs.openalex.org/
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
 * OpenAlex Work Response
 */
interface OpenAlexWork {
  id: string;
  doi?: string;
  title?: string;
  display_name: string;
  publication_year?: number;
  publication_date?: string;
  type?: string;
  type_crossref?: string;
  open_access?: {
    is_oa: boolean;
    oa_status: string;
    oa_url?: string;
  };
  authorships?: Array<{
    author_position: string;
    author: {
      id: string;
      display_name: string;
      orcid?: string;
    };
    institutions?: Array<{
      id: string;
      display_name: string;
      country_code?: string;
    }>;
  }>;
  cited_by_count?: number;
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  is_retracted?: boolean;
  is_paratext?: boolean;
  concepts?: Array<{
    id: string;
    wikidata?: string;
    display_name: string;
    level: number;
    score: number;
  }>;
  topics?: Array<{
    id: string;
    display_name: string;
    score: number;
    subfield?: {
      id: string;
      display_name: string;
    };
    field?: {
      id: string;
      display_name: string;
    };
    domain?: {
      id: string;
      display_name: string;
    };
  }>;
  primary_location?: {
    source?: {
      id: string;
      display_name: string;
      issn_l?: string;
      is_oa?: boolean;
      type?: string;
    };
    landing_page_url?: string;
    pdf_url?: string;
  };
  best_oa_location?: {
    landing_page_url?: string;
    pdf_url?: string;
  };
  abstract_inverted_index?: Record<string, number[]>;
  referenced_works?: string[];
  related_works?: string[];
  counts_by_year?: Array<{
    year: number;
    cited_by_count: number;
  }>;
  updated_date?: string;
  created_date?: string;
}

/**
 * OpenAlex Search Response
 */
interface OpenAlexSearchResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
  };
  results: OpenAlexWork[];
}

/**
 * OpenAlex Source Implementation
 */
export class OpenAlexSource extends BaseResearchSource {
  readonly name = ResearchSource.OPENALEX;
  readonly displayName = 'OpenAlex';
  readonly description = 'Open catalog of 250M+ scholarly works with automatic topic classification';
  readonly baseUrl = 'https://api.openalex.org';

  private readonly userAgent: string;

  constructor(email?: string) {
    super();
    // OpenAlex asks for email in User-Agent for polite pool (faster responses)
    const contactEmail = email || process.env.OPENALEX_EMAIL || 'sleepcore@example.com';
    this.userAgent = `SleepCore-ResearchAgent/1.0 (mailto:${contactEmail})`;
  }

  /**
   * Check if OpenAlex API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/works?filter=title.search:test&per_page=1`,
        this.getHeaders(),
        10000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Search works by query
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const limit = query.maxResultsPerSource || 50;

    try {
      const url = new URL(`${this.baseUrl}/works`);

      // Build filter
      const filters: string[] = [];

      // Search in title and abstract
      const searchTerms = this.buildSearchTerms(query);
      if (searchTerms) {
        filters.push(`title_and_abstract.search:${searchTerms}`);
      }

      // Date filter
      if (query.dateRange.from) {
        filters.push(`publication_date:>${this.formatDate(query.dateRange.from)}`);
      }
      if (query.dateRange.to) {
        filters.push(`publication_date:<${this.formatDate(query.dateRange.to)}`);
      }

      // Type filter - prefer journal articles
      filters.push('type:article');

      // Exclude retracted
      filters.push('is_retracted:false');

      url.searchParams.set('filter', filters.join(','));
      url.searchParams.set('per_page', String(Math.min(limit, 200)));
      url.searchParams.set('sort', 'relevance_score:desc');

      // Select fields to reduce response size
      url.searchParams.set('select', [
        'id',
        'doi',
        'display_name',
        'publication_year',
        'publication_date',
        'type',
        'open_access',
        'authorships',
        'cited_by_count',
        'concepts',
        'topics',
        'primary_location',
        'best_oa_location',
        'abstract_inverted_index',
      ].join(','));

      const response = await this.safeFetch(url.toString(), this.getHeaders());

      if (!response.ok) {
        console.error(`[OpenAlex] Search failed: ${response.status}`);
        return [];
      }

      const data: OpenAlexSearchResponse = await response.json();

      return data.results
        .filter(work => work.display_name)
        .map(work => this.mapToResearchResult(work, query));
    } catch (error) {
      console.error('[OpenAlex] Search error:', error);
      return [];
    }
  }

  /**
   * Get recent works
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'insomnia cognitive behavioral therapy sleep disorders',
      sources: [ResearchSource.OPENALEX],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['insomnia', 'CBT-I', 'sleep therapy'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Get work by OpenAlex ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    try {
      // Handle different ID formats
      let url: string;
      if (id.startsWith('https://')) {
        url = id;
      } else if (id.startsWith('W')) {
        url = `${this.baseUrl}/works/${id}`;
      } else {
        url = `${this.baseUrl}/works/https://openalex.org/${id}`;
      }

      const response = await this.safeFetch(url, this.getHeaders());

      if (!response.ok) {
        return null;
      }

      const work: OpenAlexWork = await response.json();

      return this.mapToResearchResult(work, {
        topic: '',
        sources: [ResearchSource.OPENALEX],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      });
    } catch {
      return null;
    }
  }

  /**
   * Get related works
   */
  async getRelated(workId: string, limit: number = 20): Promise<IResearchResult[]> {
    try {
      const work = await this.getById(workId);
      if (!work) return [];

      // Use OpenAlex related_works
      const url = new URL(`${this.baseUrl}/works`);
      url.searchParams.set('filter', `related_to:${workId}`);
      url.searchParams.set('per_page', String(limit));

      const response = await this.safeFetch(url.toString(), this.getHeaders());

      if (!response.ok) {
        return [];
      }

      const data: OpenAlexSearchResponse = await response.json();

      return data.results.map(w => this.mapToResearchResult(w, {
        topic: '',
        sources: [ResearchSource.OPENALEX],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get works citing a specific work
   */
  async getCitations(workId: string, limit: number = 50): Promise<IResearchResult[]> {
    try {
      const url = new URL(`${this.baseUrl}/works`);
      url.searchParams.set('filter', `cites:${workId}`);
      url.searchParams.set('per_page', String(limit));
      url.searchParams.set('sort', 'cited_by_count:desc');

      const response = await this.safeFetch(url.toString(), this.getHeaders());

      if (!response.ok) {
        return [];
      }

      const data: OpenAlexSearchResponse = await response.json();

      return data.results.map(w => this.mapToResearchResult(w, {
        topic: '',
        sources: [ResearchSource.OPENALEX],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Build search terms from query
   */
  private buildSearchTerms(query: IResearchQuery): string {
    const terms: string[] = [];

    if (query.topic) {
      terms.push(query.topic);
    }

    if (query.keywords.length > 0) {
      terms.push(...query.keywords.slice(0, 5));
    }

    return terms.join(' ');
  }

  /**
   * Get request headers
   */
  private getHeaders(): RequestInit {
    return {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent,
      },
    };
  }

  /**
   * Reconstruct abstract from inverted index
   */
  private reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
    if (!invertedIndex) return '';

    const words: Array<[string, number]> = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words.push([word, pos]);
      }
    }

    // Sort by position and join
    words.sort((a, b) => a[1] - b[1]);
    return words.map(w => w[0]).join(' ');
  }

  /**
   * Map OpenAlex work to IResearchResult
   */
  private mapToResearchResult(work: OpenAlexWork, query: IResearchQuery): IResearchResult {
    const publishedAt = work.publication_date
      ? new Date(work.publication_date)
      : work.publication_year
        ? new Date(work.publication_year, 0, 1)
        : new Date();

    // Reconstruct abstract
    const abstract = this.reconstructAbstract(work.abstract_inverted_index);
    const summary = abstract || 'No abstract available';

    // Get URL
    const url = work.primary_location?.landing_page_url
      || work.best_oa_location?.landing_page_url
      || work.doi
        ? `https://doi.org/${work.doi}`
        : `https://openalex.org/${work.id.split('/').pop()}`;

    // Calculate scores
    const relevanceScore = this.calculateRelevance(work, abstract, query);
    const breakthroughScore = this.calculateBreakthroughScore(work, abstract);

    // Detect categories
    const categories = this.detectCategories(work, abstract);

    // Extract tags
    const tags = this.extractTags(work);

    // Authors
    const authors = work.authorships?.map(a => a.author.display_name) || [];

    // Institutions
    const organizations = work.authorships
      ?.flatMap(a => a.institutions?.map(i => i.display_name) || [])
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 5) || [];

    const base = this.createBaseResult(
      `openalex:${work.id.split('/').pop()}`,
      work.display_name,
      summary,
      url,
      publishedAt
    );

    return {
      ...base,
      authors,
      organizations,
      relevanceScore,
      breakthroughScore,
      categories,
      tags,
      relatedSleepCoreComponents: this.detectSleepCoreComponents(abstract),
      confidenceLevel: this.determineConfidence(work),
      metadata: {
        openalexId: work.id,
        doi: work.doi,
        citationCount: work.cited_by_count,
        type: work.type,
        isOpenAccess: work.open_access?.is_oa,
        oaStatus: work.open_access?.oa_status,
        pdfUrl: work.best_oa_location?.pdf_url,
        source: work.primary_location?.source?.display_name,
        concepts: work.concepts?.slice(0, 5).map(c => c.display_name),
        topics: work.topics?.slice(0, 3).map(t => t.display_name),
      },
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(work: OpenAlexWork, abstract: string, query: IResearchQuery): number {
    let score = 0;
    const text = `${work.display_name} ${abstract}`.toLowerCase();

    // SleepCore keywords
    const sleepCoreKeywords = [
      { term: 'cbt-i', weight: 20 },
      { term: 'cognitive behavioral therapy', weight: 18 },
      { term: 'insomnia', weight: 15 },
      { term: 'sleep restriction', weight: 15 },
      { term: 'stimulus control', weight: 15 },
      { term: 'digital therapeutics', weight: 18 },
      { term: 'digital twin', weight: 20 },
      { term: 'personalized', weight: 10 },
      { term: 'machine learning', weight: 12 },
    ];

    for (const { term, weight } of sleepCoreKeywords) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Query keywords
    for (const keyword of query.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Concept matching
    const relevantConcepts = ['sleep', 'insomnia', 'therapy', 'psychology', 'psychiatry'];
    for (const concept of work.concepts || []) {
      const conceptLower = concept.display_name.toLowerCase();
      if (relevantConcepts.some(rc => conceptLower.includes(rc))) {
        score += concept.score * 10; // Score is 0-1
      }
    }

    // Citation impact
    if (work.cited_by_count) {
      if (work.cited_by_count > 100) score += 15;
      else if (work.cited_by_count > 50) score += 10;
      else if (work.cited_by_count > 20) score += 5;
    }

    // Open access bonus
    if (work.open_access?.is_oa) {
      score += 5;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate breakthrough score
   */
  private calculateBreakthroughScore(work: OpenAlexWork, abstract: string): number {
    let score = 0;
    const text = `${work.display_name} ${abstract}`.toLowerCase();

    // Breakthrough indicators
    const indicators = [
      { term: 'novel', weight: 12 },
      { term: 'first', weight: 10 },
      { term: 'breakthrough', weight: 15 },
      { term: 'state-of-the-art', weight: 12 },
      { term: 'outperform', weight: 10 },
      { term: 'significant', weight: 8 },
    ];

    for (const { term, weight } of indicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // High citations relative to age
    if (work.cited_by_count && work.publication_year) {
      const age = new Date().getFullYear() - work.publication_year;
      const citationsPerYear = work.cited_by_count / Math.max(1, age);
      if (citationsPerYear > 50) score += 20;
      else if (citationsPerYear > 20) score += 15;
      else if (citationsPerYear > 10) score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Detect research categories
   */
  private detectCategories(work: OpenAlexWork, abstract: string): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const text = `${work.display_name} ${abstract}`.toLowerCase();

    // Category rules
    const rules: Array<{ category: ResearchCategory; patterns: string[] }> = [
      { category: ResearchCategory.CBT_I, patterns: ['cbt-i', 'cognitive behavioral', 'sleep restriction'] },
      { category: ResearchCategory.THIRD_WAVE, patterns: ['mindfulness', 'acceptance', 'metacognitive'] },
      { category: ResearchCategory.AI_ML, patterns: ['machine learning', 'deep learning', 'artificial intelligence'] },
      { category: ResearchCategory.DIGITAL_TWIN, patterns: ['digital twin', 'simulation model'] },
      { category: ResearchCategory.WEARABLES, patterns: ['wearable', 'actigraphy', 'smartwatch'] },
      { category: ResearchCategory.BIOMARKERS, patterns: ['biomarker', 'hrv', 'cortisol'] },
      { category: ResearchCategory.NEUROSCIENCE, patterns: ['brain', 'neural', 'eeg'] },
    ];

    for (const { category, patterns } of rules) {
      if (patterns.some(p => text.includes(p))) {
        categories.push(category);
      }
    }

    // From OpenAlex concepts
    for (const concept of work.concepts || []) {
      const name = concept.display_name.toLowerCase();
      if (name.includes('machine learning') && !categories.includes(ResearchCategory.AI_ML)) {
        categories.push(ResearchCategory.AI_ML);
      }
      if (name.includes('neuroscience') && !categories.includes(ResearchCategory.NEUROSCIENCE)) {
        categories.push(ResearchCategory.NEUROSCIENCE);
      }
    }

    return categories;
  }

  /**
   * Extract tags from work
   */
  private extractTags(work: OpenAlexWork): string[] {
    const tags: string[] = [];

    // Type
    if (work.type) {
      tags.push(work.type);
    }

    // Top concepts
    for (const concept of (work.concepts || []).slice(0, 3)) {
      if (concept.score > 0.5) {
        tags.push(concept.display_name);
      }
    }

    // Special tags
    if (work.open_access?.is_oa) tags.push('open-access');
    if (work.cited_by_count && work.cited_by_count > 100) tags.push('highly-cited');

    return [...new Set(tags)];
  }

  /**
   * Detect SleepCore component relevance
   */
  private detectSleepCoreComponents(abstract: string): string[] {
    const text = abstract.toLowerCase();
    const components: string[] = [];

    const componentKeywords: Record<string, string[]> = {
      'SleepRestrictionEngine': ['sleep restriction', 'time in bed', 'sleep efficiency'],
      'StimulusControlEngine': ['stimulus control', 'bed for sleep'],
      'CognitiveRestructuringEngine': ['cognitive restructuring', 'sleep beliefs'],
      'RelaxationEngine': ['relaxation', 'breathing', 'progressive muscle'],
      'DigitalTwinService': ['digital twin', 'simulation', 'personalized'],
      'MBTIEngine': ['mindfulness', 'meditation'],
      'ACTIEngine': ['acceptance', 'act '],
      'MCTEngine': ['metacognitive', 'worry'],
    };

    for (const [component, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Determine confidence level
   */
  private determineConfidence(work: OpenAlexWork): ConfidenceLevel {
    // Highly cited = high confidence
    if (work.cited_by_count && work.cited_by_count > 50) {
      return ConfidenceLevel.HIGH;
    }

    // Published in journal
    if (work.primary_location?.source?.type === 'journal') {
      return ConfidenceLevel.MEDIUM;
    }

    // Preprint or other
    return ConfidenceLevel.LOW;
  }
}
