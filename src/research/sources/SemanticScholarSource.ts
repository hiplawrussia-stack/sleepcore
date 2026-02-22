/**
 * @fileoverview Semantic Scholar Research Source
 * @module research/sources/SemanticScholarSource
 * @description Интеграция с Semantic Scholar API (200M+ papers, 2.4B+ citations)
 *
 * API Features:
 * - Paper search with relevance ranking
 * - Citation graphs and references
 * - AI-generated TLDR summaries
 * - Embedding vectors for similarity
 *
 * Rate Limits:
 * - 100 requests per 5 minutes (without API key)
 * - Higher limits with API key
 *
 * @see https://api.semanticscholar.org/
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
 * Semantic Scholar Paper Response
 */
interface S2Paper {
  paperId: string;
  corpusId?: number;
  url?: string;
  title: string;
  abstract?: string;
  venue?: string;
  publicationVenue?: {
    id: string;
    name: string;
    type: string;
    issn?: string;
  };
  year?: number;
  referenceCount?: number;
  citationCount?: number;
  influentialCitationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: {
    url: string;
    status: string;
  };
  fieldsOfStudy?: string[];
  s2FieldsOfStudy?: Array<{
    category: string;
    source: string;
  }>;
  publicationTypes?: string[];
  publicationDate?: string;
  journal?: {
    name: string;
    volume?: string;
    pages?: string;
  };
  authors?: Array<{
    authorId: string;
    name: string;
  }>;
  tldr?: {
    model: string;
    text: string;
  };
  embedding?: {
    model: string;
    vector: number[];
  };
  externalIds?: {
    DOI?: string;
    PubMed?: string;
    ArXiv?: string;
  };
}

/**
 * Semantic Scholar Search Response
 */
interface S2SearchResponse {
  total: number;
  offset: number;
  next?: number;
  data: S2Paper[];
}

/**
 * Semantic Scholar Source Implementation
 */
export class SemanticScholarSource extends BaseResearchSource {
  readonly name = ResearchSource.SEMANTIC_SCHOLAR;
  readonly displayName = 'Semantic Scholar';
  readonly description = 'AI-powered research tool with 200M+ papers and citation analysis';
  readonly baseUrl = 'https://api.semanticscholar.org/graph/v1';

  private apiKey?: string;
  private readonly defaultFields = [
    'paperId',
    'corpusId',
    'url',
    'title',
    'abstract',
    'venue',
    'publicationVenue',
    'year',
    'referenceCount',
    'citationCount',
    'influentialCitationCount',
    'isOpenAccess',
    'openAccessPdf',
    'fieldsOfStudy',
    's2FieldsOfStudy',
    'publicationTypes',
    'publicationDate',
    'journal',
    'authors',
    'tldr',
    'externalIds',
  ].join(',');

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  /**
   * Check if Semantic Scholar API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/paper/search?query=test&limit=1&fields=paperId`,
        this.getHeaders(),
        10000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Search papers by query
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const searchQuery = this.buildSearchQuery(query);
    const limit = query.maxResultsPerSource || 50;

    try {
      const url = new URL(`${this.baseUrl}/paper/search`);
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('limit', String(Math.min(limit, 100)));
      url.searchParams.set('fields', this.defaultFields);

      // Date filtering via year parameter
      if (query.dateRange.from) {
        url.searchParams.set('year', `${query.dateRange.from.getFullYear()}-`);
      }

      // Fields of study filter for better relevance
      url.searchParams.set('fieldsOfStudy', 'Medicine,Psychology,Computer Science');

      const response = await this.safeFetch(url.toString(), this.getHeaders());

      if (!response.ok) {
        console.error(`[SemanticScholar] Search failed: ${response.status}`);
        return [];
      }

      const data: S2SearchResponse = await response.json();

      return data.data
        .filter(paper => paper.title && paper.abstract)
        .map(paper => this.mapToResearchResult(paper, query));
    } catch (error) {
      console.error('[SemanticScholar] Search error:', error);
      return [];
    }
  }

  /**
   * Get recent papers
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'insomnia CBT-I digital therapeutics sleep disorders',
      sources: [ResearchSource.SEMANTIC_SCHOLAR],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['insomnia', 'CBT-I', 'sleep therapy', 'digital therapeutics'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Get paper by Semantic Scholar ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    try {
      const url = `${this.baseUrl}/paper/${id}?fields=${this.defaultFields}`;
      const response = await this.safeFetch(url, this.getHeaders());

      if (!response.ok) {
        return null;
      }

      const paper: S2Paper = await response.json();

      return this.mapToResearchResult(paper, {
        topic: '',
        sources: [ResearchSource.SEMANTIC_SCHOLAR],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      });
    } catch {
      return null;
    }
  }

  /**
   * Get citations for a paper
   */
  async getCitations(paperId: string, limit: number = 50): Promise<IResearchResult[]> {
    try {
      const url = `${this.baseUrl}/paper/${paperId}/citations?fields=${this.defaultFields}&limit=${limit}`;
      const response = await this.safeFetch(url, this.getHeaders());

      if (!response.ok) {
        return [];
      }

      const data: { data: Array<{ citingPaper: S2Paper }> } = await response.json();

      return data.data
        .map(item => item.citingPaper)
        .filter(paper => paper.title && paper.abstract)
        .map(paper => this.mapToResearchResult(paper, {
          topic: '',
          sources: [ResearchSource.SEMANTIC_SCHOLAR],
          dateRange: { from: new Date(0), to: new Date() },
          keywords: [],
        }));
    } catch {
      return [];
    }
  }

  /**
   * Get references for a paper
   */
  async getReferences(paperId: string, limit: number = 50): Promise<IResearchResult[]> {
    try {
      const url = `${this.baseUrl}/paper/${paperId}/references?fields=${this.defaultFields}&limit=${limit}`;
      const response = await this.safeFetch(url, this.getHeaders());

      if (!response.ok) {
        return [];
      }

      const data: { data: Array<{ citedPaper: S2Paper }> } = await response.json();

      return data.data
        .map(item => item.citedPaper)
        .filter(paper => paper.title && paper.abstract)
        .map(paper => this.mapToResearchResult(paper, {
          topic: '',
          sources: [ResearchSource.SEMANTIC_SCHOLAR],
          dateRange: { from: new Date(0), to: new Date() },
          keywords: [],
        }));
    } catch {
      return [];
    }
  }

  /**
   * Find similar papers using S2 recommendations
   */
  async findSimilar(paperId: string, limit: number = 20): Promise<IResearchResult[]> {
    try {
      const url = `${this.baseUrl}/recommendations/v1/papers/forpaper/${paperId}?fields=${this.defaultFields}&limit=${limit}`;
      const response = await this.safeFetch(url, this.getHeaders());

      if (!response.ok) {
        return [];
      }

      const data: { recommendedPapers: S2Paper[] } = await response.json();

      return data.recommendedPapers
        .filter(paper => paper.title && paper.abstract)
        .map(paper => this.mapToResearchResult(paper, {
          topic: '',
          sources: [ResearchSource.SEMANTIC_SCHOLAR],
          dateRange: { from: new Date(0), to: new Date() },
          keywords: [],
        }));
    } catch {
      return [];
    }
  }

  /**
   * Build search query from IResearchQuery
   */
  private buildSearchQuery(query: IResearchQuery): string {
    const terms: string[] = [];

    // Main topic
    if (query.topic) {
      terms.push(query.topic);
    }

    // Keywords (limit to avoid too complex queries)
    if (query.keywords.length > 0) {
      terms.push(...query.keywords.slice(0, 5));
    }

    return terms.join(' ');
  }

  /**
   * Get request headers
   */
  private getHeaders(): RequestInit {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return { headers };
  }

  /**
   * Map S2 paper to IResearchResult
   */
  private mapToResearchResult(paper: S2Paper, query: IResearchQuery): IResearchResult {
    const publishedAt = paper.publicationDate
      ? new Date(paper.publicationDate)
      : paper.year
        ? new Date(paper.year, 0, 1)
        : new Date();

    // Use TLDR if available, otherwise use abstract
    const summary = paper.tldr?.text || paper.abstract || 'No abstract available';

    // Calculate relevance
    const relevanceScore = this.calculateRelevance(paper, query);

    // Calculate breakthrough score
    const breakthroughScore = this.calculateBreakthroughScore(paper);

    // Detect categories
    const categories = this.detectCategories(paper);

    // Extract tags
    const tags = this.extractTags(paper);

    const url = paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`;

    const base = this.createBaseResult(
      `s2:${paper.paperId}`,
      paper.title,
      summary,
      url,
      publishedAt
    );

    return {
      ...base,
      authors: paper.authors?.map(a => a.name) || [],
      organizations: paper.publicationVenue?.name ? [paper.publicationVenue.name] : [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags,
      relatedSleepCoreComponents: this.detectSleepCoreComponents(paper.abstract || ''),
      confidenceLevel: this.determineConfidence(paper),
      keyFindings: paper.tldr ? [paper.tldr.text] : undefined,
      metadata: {
        paperId: paper.paperId,
        corpusId: paper.corpusId,
        citationCount: paper.citationCount,
        influentialCitationCount: paper.influentialCitationCount,
        referenceCount: paper.referenceCount,
        isOpenAccess: paper.isOpenAccess,
        openAccessPdf: paper.openAccessPdf?.url,
        doi: paper.externalIds?.DOI,
        pmid: paper.externalIds?.PubMed,
        arxivId: paper.externalIds?.ArXiv,
        venue: paper.venue,
        journal: paper.journal?.name,
        fieldsOfStudy: paper.fieldsOfStudy,
        hasTldr: !!paper.tldr,
      },
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(paper: S2Paper, query: IResearchQuery): number {
    let score = 0;
    const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();

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
      { term: 'mindfulness', weight: 10 },
      { term: 'metacognitive', weight: 15 },
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

    // Citation impact (highly cited = more relevant for field overview)
    if (paper.citationCount) {
      if (paper.citationCount > 100) score += 15;
      else if (paper.citationCount > 50) score += 10;
      else if (paper.citationCount > 20) score += 5;
    }

    // Influential citations (quality indicator)
    if (paper.influentialCitationCount && paper.influentialCitationCount > 10) {
      score += 10;
    }

    // Open access bonus
    if (paper.isOpenAccess) {
      score += 5;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate breakthrough score
   */
  private calculateBreakthroughScore(paper: S2Paper): number {
    let score = 0;
    const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();

    // Breakthrough indicators
    const indicators = [
      { term: 'novel', weight: 12 },
      { term: 'first', weight: 10 },
      { term: 'breakthrough', weight: 15 },
      { term: 'state-of-the-art', weight: 12 },
      { term: 'outperform', weight: 10 },
      { term: 'significant improvement', weight: 10 },
      { term: 'paradigm', weight: 12 },
      { term: 'revolutionary', weight: 12 },
    ];

    for (const { term, weight } of indicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // High influential citations = recognized breakthrough
    if (paper.influentialCitationCount) {
      if (paper.influentialCitationCount > 50) score += 20;
      else if (paper.influentialCitationCount > 20) score += 15;
      else if (paper.influentialCitationCount > 10) score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Detect research categories
   */
  private detectCategories(paper: S2Paper): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
    const fields = paper.fieldsOfStudy?.map(f => f.toLowerCase()) || [];

    // Category detection rules
    const rules: Array<{ category: ResearchCategory; patterns: string[] }> = [
      { category: ResearchCategory.CBT_I, patterns: ['cbt-i', 'cognitive behavioral', 'sleep restriction'] },
      { category: ResearchCategory.THIRD_WAVE, patterns: ['mindfulness', 'acceptance', 'metacognitive', 'act '] },
      { category: ResearchCategory.AI_ML, patterns: ['machine learning', 'deep learning', 'artificial intelligence', 'neural network'] },
      { category: ResearchCategory.DIGITAL_TWIN, patterns: ['digital twin', 'simulation', 'personalized model'] },
      { category: ResearchCategory.WEARABLES, patterns: ['wearable', 'actigraphy', 'smartwatch', 'fitbit'] },
      { category: ResearchCategory.BIOMARKERS, patterns: ['biomarker', 'hrv', 'heart rate variability'] },
      { category: ResearchCategory.NEUROSCIENCE, patterns: ['brain', 'neural', 'eeg', 'fmri'] },
      { category: ResearchCategory.CHRONOBIOLOGY, patterns: ['circadian', 'chronotype', 'melatonin'] },
    ];

    for (const { category, patterns } of rules) {
      if (patterns.some(p => text.includes(p))) {
        categories.push(category);
      }
    }

    // Fields of study mapping
    if (fields.includes('computer science')) {
      if (!categories.includes(ResearchCategory.AI_ML)) {
        categories.push(ResearchCategory.AI_ML);
      }
    }

    return categories;
  }

  /**
   * Extract tags from paper
   */
  private extractTags(paper: S2Paper): string[] {
    const tags: string[] = [];

    // Publication types
    if (paper.publicationTypes) {
      tags.push(...paper.publicationTypes.slice(0, 3));
    }

    // Fields of study
    if (paper.fieldsOfStudy) {
      tags.push(...paper.fieldsOfStudy.slice(0, 3));
    }

    // Special tags
    if (paper.isOpenAccess) tags.push('open-access');
    if (paper.tldr) tags.push('has-tldr');
    if (paper.citationCount && paper.citationCount > 100) tags.push('highly-cited');
    if (paper.influentialCitationCount && paper.influentialCitationCount > 10) tags.push('influential');

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
      'RelaxationEngine': ['relaxation', 'progressive muscle', 'breathing'],
      'DigitalTwinService': ['digital twin', 'simulation', 'personalized'],
      'MBTIEngine': ['mindfulness', 'meditation'],
      'ACTIEngine': ['acceptance', 'psychological flexibility'],
      'MCTEngine': ['metacognitive', 'worry', 'rumination'],
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
  private determineConfidence(paper: S2Paper): ConfidenceLevel {
    // Peer-reviewed with high citations = high confidence
    if (paper.citationCount && paper.citationCount > 50) {
      return ConfidenceLevel.HIGH;
    }

    // Has venue (published somewhere)
    if (paper.venue || paper.journal) {
      return ConfidenceLevel.MEDIUM;
    }

    // Preprint or unknown
    return ConfidenceLevel.LOW;
  }
}
