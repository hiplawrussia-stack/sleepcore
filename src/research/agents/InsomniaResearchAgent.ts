/**
 * @fileoverview Insomnia Research Agent
 * @module research/agents/InsomniaResearchAgent
 * @description AI агент для исследований инсомнии и прорывных технологий
 *
 * Функции:
 * - Мониторинг научных публикаций (PubMed, arXiv)
 * - Отслеживание клинических исследований (ClinicalTrials.gov)
 * - Анализ конкурентов (Big Health, Pear, etc.)
 * - Детекция прорывных технологий
 * - Анализ трендов
 * - Генерация отчётов
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchQuery,
  IResearchResult,
  IResearchReport,
  IWeeklyDigest,
  IBreakthrough,
  ITrend,
  IClinicalTrial,
  ICompetitorUpdate,
  IResearchAgentConfig,
  ResearchSource,
  DEFAULT_RESEARCH_CONFIG,
} from '../types';

import {
  IResearchSource,
  PubMedSource,
  ClinicalTrialsSource,
  ArxivSource,
  CompetitorSource,
  SemanticScholarSource,
  OpenAlexSource,
} from '../sources';

import {
  BreakthroughDetector,
  TrendAnalyzer,
  QueryExpander,
  CitationAnalyzer,
  type IExpandedQuery,
  type ICitationAnalysis,
} from '../analyzers';
import { ResearchRepository } from '../storage';
import { ReportGenerator } from '../reports';
import { AgenticSearchStrategy, type IAgenticSearchResult } from '../strategies';
import { ResultCache, resultCache } from '../cache';
import { ParallelSearchExecutor, type IParallelSearchResult } from '../executors';
import {
  GraphRAGEngine,
  IGraphQuery,
  IGraphQueryResult,
  QueryType,
} from '../graphrag';

/**
 * Результат поиска
 */
interface SearchResult {
  results: IResearchResult[];
  breakthroughs: IBreakthrough[];
  newCount: number;
  totalCount: number;
  errors: Array<{ source: ResearchSource; error: string }>;
}

/**
 * Результат анализа
 */
interface AnalysisResult {
  breakthroughs: IBreakthrough[];
  trends: ITrend[];
  competitorUpdates: ICompetitorUpdate[];
  clinicalTrials: IClinicalTrial[];
  recommendations: string[];
}

/**
 * AI Агент исследований инсомнии
 */
export class InsomniaResearchAgent {
  private readonly config: IResearchAgentConfig;
  private readonly sources: Map<ResearchSource, IResearchSource>;
  private readonly breakthroughDetector: BreakthroughDetector;
  private readonly trendAnalyzer: TrendAnalyzer;
  private readonly queryExpander: QueryExpander;
  private readonly citationAnalyzer: CitationAnalyzer;
  private readonly repository: ResearchRepository;
  private readonly reportGenerator: ReportGenerator;

  // NEW 2025-2026: Advanced components
  private readonly agenticStrategy: AgenticSearchStrategy;
  private readonly cache: ResultCache;
  private readonly parallelExecutor: ParallelSearchExecutor;

  // NEW 2025-2026: GraphRAG
  private readonly graphRAGEngine: GraphRAGEngine;
  private graphInitialized: boolean = false;

  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;

  constructor(config: Partial<IResearchAgentConfig> = {}) {
    this.config = { ...DEFAULT_RESEARCH_CONFIG, ...config };

    // Инициализация источников
    this.sources = new Map();
    this.initializeSources();

    // Инициализация анализаторов
    this.breakthroughDetector = new BreakthroughDetector();
    this.trendAnalyzer = new TrendAnalyzer();
    this.queryExpander = new QueryExpander();
    this.citationAnalyzer = new CitationAnalyzer();

    // Хранилище
    this.repository = new ResearchRepository();

    // Генератор отчётов
    this.reportGenerator = new ReportGenerator();

    // NEW 2025-2026: Advanced components
    this.cache = resultCache;
    this.agenticStrategy = new AgenticSearchStrategy(this.sources, {
      maxIterations: 3,
      enableQueryExpansion: true,
      enableFollowUp: true,
    });
    this.parallelExecutor = new ParallelSearchExecutor(this.sources, this.cache, {
      maxConcurrency: 5,
      timeoutMs: 30000,
      enableCache: true,
    });

    // NEW 2025-2026: GraphRAG
    this.graphRAGEngine = new GraphRAGEngine();
  }

  /**
   * Инициализация источников данных
   */
  private initializeSources(): void {
    // PubMed - primary biomedical literature
    if (this.config.enabledSources.includes(ResearchSource.PUBMED)) {
      this.sources.set(ResearchSource.PUBMED, new PubMedSource());
    }

    // Semantic Scholar - 200M+ papers with AI TLDR (NEW 2025)
    if (this.config.enabledSources.includes(ResearchSource.SEMANTIC_SCHOLAR)) {
      this.sources.set(ResearchSource.SEMANTIC_SCHOLAR, new SemanticScholarSource());
    }

    // OpenAlex - 250M+ works, fully open (NEW 2025)
    if (this.config.enabledSources.includes(ResearchSource.OPENALEX)) {
      this.sources.set(ResearchSource.OPENALEX, new OpenAlexSource());
    }

    // ClinicalTrials.gov
    if (this.config.enabledSources.includes(ResearchSource.CLINICAL_TRIALS)) {
      this.sources.set(ResearchSource.CLINICAL_TRIALS, new ClinicalTrialsSource());
    }

    // arXiv
    if (this.config.enabledSources.includes(ResearchSource.ARXIV)) {
      this.sources.set(ResearchSource.ARXIV, new ArxivSource());
    }

    // Competitors
    if (this.config.enabledSources.includes(ResearchSource.COMPETITORS)) {
      this.sources.set(ResearchSource.COMPETITORS, new CompetitorSource());
    }
  }

  /**
   * Запустить полный цикл исследований
   */
  async run(): Promise<SearchResult> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;

    try {
      // 1. Поиск новых публикаций
      const searchResult = await this.searchAllSources();

      // 2. Сохранение в репозиторий
      const newCount = await this.repository.saveMany(searchResult.results);

      // 3. Детекция прорывов
      const breakthroughs = this.breakthroughDetector.detectBreakthroughs(
        searchResult.results
      );

      this.lastRunAt = new Date();

      return {
        results: searchResult.results,
        breakthroughs,
        newCount,
        totalCount: searchResult.results.length,
        errors: searchResult.errors,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Поиск по всем источникам
   */
  private async searchAllSources(): Promise<{
    results: IResearchResult[];
    errors: Array<{ source: ResearchSource; error: string }>;
  }> {
    const results: IResearchResult[] = [];
    const errors: Array<{ source: ResearchSource; error: string }> = [];

    const query = this.buildDefaultQuery();

    // Известные стабильные источники - пропускаем проверку доступности
    const knownStableSources = [
      ResearchSource.PUBMED,
      ResearchSource.SEMANTIC_SCHOLAR,
      ResearchSource.OPENALEX,
      ResearchSource.CLINICAL_TRIALS,
      ResearchSource.ARXIV,
      ResearchSource.COMPETITORS,
    ];

    // Параллельный поиск по всем источникам
    const searchPromises = [...this.sources.entries()].map(
      async ([source, sourceImpl]) => {
        try {
          // Для известных источников пропускаем проверку доступности
          // чтобы избежать таймаутов при параллельных запросах
          if (!knownStableSources.includes(source)) {
            const isAvailable = await sourceImpl.isAvailable();
            if (!isAvailable) {
              errors.push({ source, error: 'Source not available' });
              return [];
            }
          }

          // Поиск
          const sourceResults = await sourceImpl.search(query);
          return sourceResults;
        } catch (error) {
          errors.push({
            source,
            error: error instanceof Error ? error.message : String(error),
          });
          return [];
        }
      }
    );

    const allResults = await Promise.all(searchPromises);

    for (const sourceResults of allResults) {
      results.push(...sourceResults);
    }

    // Фильтрация по минимальной релевантности
    const filteredResults = results.filter(
      r => r.relevanceScore >= this.config.minRelevanceScore
    );

    // Сортировка по релевантности
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { results: filteredResults, errors };
  }

  /**
   * Построить запрос по умолчанию
   */
  private buildDefaultQuery(): IResearchQuery {
    const now = new Date();
    // Используем 30 дней для лучшего охвата публикаций
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      topic: 'insomnia treatment digital therapeutic',
      sources: this.config.enabledSources,
      dateRange: {
        from: monthAgo,
        to: now,
      },
      keywords: this.config.monitorKeywords.slice(0, 10), // Топ-10 ключевых слов
      maxResultsPerSource: this.config.limits.maxResultsPerQuery,
    };
  }

  /**
   * Поиск с пользовательским запросом
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    for (const source of query.sources) {
      const sourceImpl = this.sources.get(source);
      if (!sourceImpl) continue;

      try {
        const sourceResults = await sourceImpl.search(query);
        results.push(...sourceResults);
      } catch (error) {
        console.error(`Search error for ${source}:`, error);
      }
    }

    // Сохранение
    await this.repository.saveMany(results);

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Получить последние публикации
   */
  async getRecent(
    daysBack: number = 7,
    limit: number = 50
  ): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    for (const sourceImpl of this.sources.values()) {
      try {
        const sourceResults = await sourceImpl.getRecent(
          Math.ceil(limit / this.sources.size),
          daysBack
        );
        results.push(...sourceResults);
      } catch (error) {
        console.error('getRecent error:', error);
      }
    }

    return results
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Анализ накопленных данных
   */
  async analyze(daysBack: number = 30): Promise<AnalysisResult> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    // Получить данные из репозитория
    const storedResults = await this.repository.find({
      dateFrom: fromDate,
    });

    const results = storedResults.map(sr => sr.result);

    // Детекция прорывов
    const breakthroughs = this.breakthroughDetector.detectBreakthroughs(results);

    // Анализ трендов
    const trends = this.trendAnalyzer.analyzeTrends(results, daysBack);

    // Обновления конкурентов
    const competitorResults = results.filter(
      r => r.source === ResearchSource.COMPETITORS
    );
    const competitorUpdates: ICompetitorUpdate[] = competitorResults.map(r => ({
      company: (r.metadata?.competitor as string) || 'Unknown',
      updateType: 'other' as const,
      description: r.summary,
      date: r.publishedAt,
      sourceUrl: r.url,
    }));

    // Клинические исследования
    const ctSource = this.sources.get(ResearchSource.CLINICAL_TRIALS) as ClinicalTrialsSource | undefined;
    let clinicalTrials: IClinicalTrial[] = [];
    if (ctSource) {
      try {
        clinicalTrials = await ctSource.searchTrials(this.buildDefaultQuery());
      } catch {
        // Ignore errors
      }
    }

    // Генерация рекомендаций
    const recommendations = this.generateQuickRecommendations(
      breakthroughs,
      trends,
      competitorUpdates
    );

    return {
      breakthroughs,
      trends,
      competitorUpdates,
      clinicalTrials,
      recommendations,
    };
  }

  /**
   * Быстрые рекомендации
   */
  private generateQuickRecommendations(
    breakthroughs: IBreakthrough[],
    trends: ITrend[],
    _competitorUpdates: ICompetitorUpdate[]
  ): string[] {
    const recommendations: string[] = [];

    // Из прорывов
    for (const bt of breakthroughs.filter(b => b.impactScore >= 7).slice(0, 3)) {
      recommendations.push(`Review breakthrough: ${bt.title.slice(0, 50)}...`);
    }

    // Из растущих трендов
    for (const trend of trends.filter(t => t.strength === 'rising').slice(0, 2)) {
      recommendations.push(`Monitor rising trend: ${trend.name}`);
    }

    return recommendations;
  }

  /**
   * Генерировать недельный отчёт
   */
  async generateWeeklyReport(): Promise<IResearchReport> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Получить данные
    const storedResults = await this.repository.find({
      dateFrom: weekAgo,
    });
    const results = storedResults.map(sr => sr.result);

    // Анализ
    const analysis = await this.analyze(7);

    // Генерация отчёта
    return this.reportGenerator.generateReport(
      results,
      analysis.breakthroughs,
      analysis.trends,
      analysis.competitorUpdates,
      analysis.clinicalTrials,
      [], // patents - не реализовано пока
      {
        type: 'weekly',
        dateFrom: weekAgo,
        dateTo: now,
      }
    );
  }

  /**
   * Генерировать недельный дайджест
   */
  async generateWeeklyDigest(): Promise<IWeeklyDigest> {
    const storedResults = await this.repository.find({});
    const results = storedResults.map(sr => sr.result);

    const breakthroughs = this.breakthroughDetector.detectBreakthroughs(results);
    const trends = this.trendAnalyzer.analyzeTrends(results, 7);

    return this.reportGenerator.generateWeeklyDigest(results, breakthroughs, trends);
  }

  /**
   * Мониторинг конкурентов
   */
  async monitorCompetitors(): Promise<ICompetitorUpdate[]> {
    const competitorSource = this.sources.get(ResearchSource.COMPETITORS) as CompetitorSource | undefined;

    if (!competitorSource) {
      return [];
    }

    const query = this.buildDefaultQuery();
    query.keywords = this.config.competitors;

    return competitorSource.searchCompetitorUpdates(query);
  }

  /**
   * Поиск клинических исследований
   */
  async searchClinicalTrials(topic?: string): Promise<IClinicalTrial[]> {
    const ctSource = this.sources.get(ResearchSource.CLINICAL_TRIALS) as ClinicalTrialsSource | undefined;

    if (!ctSource) {
      return [];
    }

    const query = this.buildDefaultQuery();
    if (topic) {
      query.topic = topic;
    }

    return ctSource.searchTrials(query);
  }

  /**
   * Получить статистику репозитория
   */
  async getStats(): Promise<{
    totalResults: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    lastRunAt: Date | null;
  }> {
    const stats = await this.repository.getStats();

    return {
      ...stats,
      lastRunAt: this.lastRunAt,
    };
  }

  /**
   * Получить топ прорывы
   */
  async getTopBreakthroughs(limit: number = 10): Promise<IBreakthrough[]> {
    const storedResults = await this.repository.getTopBreakthroughs(limit * 2);
    const results = storedResults.map(sr => sr.result);

    return this.breakthroughDetector
      .detectBreakthroughs(results)
      .slice(0, limit);
  }

  /**
   * Получить текущие тренды
   */
  async getCurrentTrends(): Promise<ITrend[]> {
    const storedResults = await this.repository.find({});
    const results = storedResults.map(sr => sr.result);

    return this.trendAnalyzer.analyzeTrends(results, 30);
  }

  /**
   * Экспорт данных
   */
  async exportData(): Promise<string> {
    const data = await this.repository.export();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Очистка старых данных
   */
  async cleanup(): Promise<number> {
    return this.repository.cleanup(this.config.limits.retentionDays);
  }

  /**
   * Проверить статус
   */
  getStatus(): {
    isRunning: boolean;
    lastRunAt: Date | null;
    enabledSources: ResearchSource[];
    monitoredKeywords: number;
    monitoredCompetitors: number;
  } {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      enabledSources: this.config.enabledSources,
      monitoredKeywords: this.config.monitorKeywords.length,
      monitoredCompetitors: this.config.competitors.length,
    };
  }

  // ==================== NEW 2025-2026 FEATURES ====================

  /**
   * Enhanced search with query expansion (Agentic RAG pattern)
   * Expands query with synonyms, MeSH terms, and semantic variants
   */
  async searchEnhanced(query: IResearchQuery): Promise<{
    results: IResearchResult[];
    expandedQuery: IExpandedQuery;
    citationAnalysis: ICitationAnalysis;
  }> {
    // Expand query
    const expandedQuery = this.queryExpander.expand(query);

    console.log('[Agent] Query expanded:', {
      original: expandedQuery.original,
      expandedTerms: expandedQuery.expanded.length,
      meshTerms: expandedQuery.meshTerms.length,
    });

    // Create enhanced query
    const enhancedQuery: IResearchQuery = {
      ...query,
      keywords: [
        ...query.keywords,
        ...expandedQuery.expanded.slice(0, 5),
      ],
    };

    // Search all sources
    const results = await this.search(enhancedQuery);

    // Analyze citations
    const citationAnalysis = this.citationAnalyzer.analyze(results);

    return {
      results,
      expandedQuery,
      citationAnalysis,
    };
  }

  /**
   * Analyze citation network for stored results
   */
  async analyzeCitations(daysBack: number = 90): Promise<ICitationAnalysis> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const storedResults = await this.repository.find({ dateFrom: fromDate });
    const results = storedResults.map(sr => sr.result);

    return this.citationAnalyzer.analyze(results);
  }

  /**
   * Find emerging research (high velocity, recent papers)
   */
  async findEmergingResearch(limit: number = 20): Promise<IResearchResult[]> {
    const storedResults = await this.repository.find({});
    const results = storedResults.map(sr => sr.result);

    return this.citationAnalyzer.findEmergingPapers(results).slice(0, limit);
  }

  /**
   * Find similar papers using Semantic Scholar
   * @param paperId - Semantic Scholar paper ID or DOI
   */
  async findSimilarPapers(paperId: string, limit: number = 20): Promise<IResearchResult[]> {
    const s2Source = this.sources.get(ResearchSource.SEMANTIC_SCHOLAR) as SemanticScholarSource | undefined;

    if (!s2Source) {
      console.warn('[Agent] Semantic Scholar source not enabled');
      return [];
    }

    try {
      return await s2Source.findSimilar(paperId, limit);
    } catch (error) {
      console.error('[Agent] Error finding similar papers:', error);
      return [];
    }
  }

  /**
   * Get citation network for a paper
   * @param paperId - Paper ID (Semantic Scholar format)
   */
  async getCitationNetwork(paperId: string): Promise<{
    paper: IResearchResult | null;
    citations: IResearchResult[];
    references: IResearchResult[];
  }> {
    const s2Source = this.sources.get(ResearchSource.SEMANTIC_SCHOLAR) as SemanticScholarSource | undefined;

    if (!s2Source) {
      return { paper: null, citations: [], references: [] };
    }

    try {
      const [paper, citations, references] = await Promise.all([
        s2Source.getById(paperId),
        s2Source.getCitations(paperId, 50),
        s2Source.getReferences(paperId, 50),
      ]);

      return { paper, citations, references };
    } catch (error) {
      console.error('[Agent] Error getting citation network:', error);
      return { paper: null, citations: [], references: [] };
    }
  }

  /**
   * Get query expansion suggestions
   */
  getQueryExpansion(query: IResearchQuery): IExpandedQuery {
    return this.queryExpander.expand(query);
  }

  /**
   * Decompose complex query into sub-queries
   */
  decomposeQuery(query: IResearchQuery): IResearchQuery[] {
    return this.queryExpander.decomposeQuery(query);
  }

  // ==================== NEW 2025-2026: AGENTIC & PARALLEL FEATURES ====================

  /**
   * Agentic search with automatic query refinement
   * Uses multi-step reasoning to iteratively improve search results
   */
  async searchAgentic(query: IResearchQuery): Promise<IAgenticSearchResult> {
    console.log('[Agent] Starting agentic search...');

    const result = await this.agenticStrategy.search(query);

    console.log('[Agent] Agentic search complete:', {
      iterations: result.iterations.length,
      totalResults: result.totalUnique,
      completeness: result.completenessConfidence,
    });

    // Save results to repository
    await this.repository.saveMany(result.results);

    return result;
  }

  /**
   * Parallel search across all sources with caching
   * Optimized for speed with concurrent requests
   */
  async searchParallel(query: IResearchQuery): Promise<IParallelSearchResult> {
    console.log('[Agent] Starting parallel search...');

    const result = await this.parallelExecutor.execute(query);

    console.log('[Agent] Parallel search complete:', {
      totalResults: result.totalUnique,
      duration: `${result.totalDurationMs}ms`,
      cacheHitRate: `${Math.round(result.cacheHitRate * 100)}%`,
      successful: result.successfulSources.length,
      failed: result.failedSources.length,
    });

    // Save results to repository
    await this.repository.saveMany(result.results);

    return result;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    estimatedMemoryMB: number;
  } {
    const stats = this.cache.getStats();
    return {
      totalEntries: stats.totalEntries,
      hitRate: stats.hitRate,
      estimatedMemoryMB: Math.round(stats.estimatedMemoryBytes / 1024 / 1024 * 100) / 100,
    };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[Agent] Cache cleared');
  }

  /**
   * Invalidate cache for specific source
   */
  invalidateCacheForSource(source: ResearchSource): number {
    const count = this.cache.invalidateSource(source);
    console.log(`[Agent] Invalidated ${count} cache entries for ${source}`);
    return count;
  }

  /**
   * Run comprehensive research with all new features
   * Combines agentic search, citation analysis, and breakthrough detection
   */
  async runComprehensive(): Promise<{
    searchResult: IAgenticSearchResult;
    citationAnalysis: ICitationAnalysis;
    breakthroughs: IBreakthrough[];
    trends: ITrend[];
    cacheStats: { hitRate: number };
  }> {
    console.log('[Agent] Starting comprehensive research...');

    const query = this.buildDefaultQuery();

    // Run agentic search
    const searchResult = await this.searchAgentic(query);

    // Analyze citations
    const citationAnalysis = this.citationAnalyzer.analyze(searchResult.results);

    // Detect breakthroughs
    const breakthroughs = this.breakthroughDetector.detectBreakthroughs(
      searchResult.results
    );

    // Analyze trends
    const trends = this.trendAnalyzer.analyzeTrends(searchResult.results, 30);

    // Get cache performance
    const cacheStats = this.getCacheStats();

    this.lastRunAt = new Date();

    console.log('[Agent] Comprehensive research complete:', {
      results: searchResult.totalUnique,
      breakthroughs: breakthroughs.length,
      trends: trends.length,
      emergingPapers: citationAnalysis.emerging.length,
    });

    return {
      searchResult,
      citationAnalysis,
      breakthroughs,
      trends,
      cacheStats: { hitRate: cacheStats.hitRate },
    };
  }

  /**
   * Check source availability
   */
  async checkSourceHealth(): Promise<Map<ResearchSource, boolean>> {
    return this.parallelExecutor.checkSourceAvailability();
  }

  // ==================== NEW 2025-2026: GRAPHRAG FEATURES ====================

  /**
   * Initialize GraphRAG from stored research results
   * Builds knowledge graph with entities and relationships
   */
  async initializeGraph(daysBack: number = 90): Promise<{
    nodeCount: number;
    edgeCount: number;
    communityCount: number;
  }> {
    console.log('[Agent] Initializing GraphRAG...');

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    // Get stored results
    const storedResults = await this.repository.find({ dateFrom: fromDate });
    const results = storedResults.map(sr => sr.result);

    if (results.length === 0) {
      console.warn('[Agent] No results found for GraphRAG initialization');
      return { nodeCount: 0, edgeCount: 0, communityCount: 0 };
    }

    // Initialize the engine
    this.graphRAGEngine.initialize(results);
    this.graphInitialized = true;

    const stats = this.graphRAGEngine.getStats();

    console.log('[Agent] GraphRAG initialized:', {
      nodes: stats.nodeCount,
      edges: stats.edgeCount,
      communities: stats.communityCount,
    });

    return stats;
  }

  /**
   * Query the knowledge graph using GraphRAG
   * Supports local, global, path, and neighborhood queries
   */
  async queryGraph(query: IGraphQuery): Promise<IGraphQueryResult> {
    if (!this.graphInitialized) {
      console.log('[Agent] Graph not initialized, initializing now...');
      await this.initializeGraph();
    }

    console.log('[Agent] Executing GraphRAG query:', {
      query: query.query.slice(0, 50),
      type: query.type,
    });

    const result = await this.graphRAGEngine.query(query);

    console.log('[Agent] GraphRAG query complete:', {
      nodes: result.nodes.length,
      edges: result.edges.length,
      communities: result.communities?.length || 0,
    });

    return result;
  }

  /**
   * Local search - find specific entities and their relationships
   */
  async graphLocalSearch(queryText: string, maxHops: number = 2): Promise<IGraphQueryResult> {
    const query: IGraphQuery = {
      query: queryText,
      type: QueryType.LOCAL,
      maxHops,
      includeContext: true,
    };

    return this.queryGraph(query);
  }

  /**
   * Global search - summarize themes across communities
   */
  async graphGlobalSearch(queryText: string): Promise<IGraphQueryResult> {
    const query: IGraphQuery = {
      query: queryText,
      type: QueryType.GLOBAL,
      includeContext: true,
    };

    return this.queryGraph(query);
  }

  /**
   * Find path between two entities in the knowledge graph
   */
  async graphFindPath(entity1: string, entity2: string): Promise<IGraphQueryResult> {
    const query: IGraphQuery = {
      query: `${entity1} to ${entity2}`,
      type: QueryType.PATH,
      maxHops: 5,
    };

    return this.queryGraph(query);
  }

  /**
   * Explore neighborhood of an entity
   */
  async graphExploreNeighborhood(entity: string, radius: number = 2): Promise<IGraphQueryResult> {
    const query: IGraphQuery = {
      query: entity,
      type: QueryType.NEIGHBORHOOD,
      maxHops: radius,
      includeContext: true,
    };

    return this.queryGraph(query);
  }

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    initialized: boolean;
    nodeCount: number;
    edgeCount: number;
    communityCount: number;
    nodesByType: Record<string, number>;
  } {
    if (!this.graphInitialized) {
      return {
        initialized: false,
        nodeCount: 0,
        edgeCount: 0,
        communityCount: 0,
        nodesByType: {},
      };
    }

    const stats = this.graphRAGEngine.getStats();

    return {
      initialized: true,
      ...stats,
    };
  }

  /**
   * Get communities from the knowledge graph
   */
  getGraphCommunities(): Array<{
    id: string;
    label: string;
    memberCount: number;
    level: number;
    keywords: string[];
  }> {
    if (!this.graphInitialized) {
      return [];
    }

    return this.graphRAGEngine.getCommunities().map(c => ({
      id: c.id,
      label: c.label,
      memberCount: c.properties.memberCount,
      level: c.properties.level,
      keywords: c.properties.keywords,
    }));
  }

  /**
   * Find similar entities in the knowledge graph
   */
  graphFindSimilar(nodeId: string, limit: number = 10): Array<{
    id: string;
    label: string;
    type: string;
    similarity: number;
  }> {
    if (!this.graphInitialized) {
      return [];
    }

    return this.graphRAGEngine.findSimilar(nodeId, limit);
  }

  /**
   * Get hub nodes (most connected) from the knowledge graph
   */
  getGraphHubs(limit: number = 10): Array<{
    id: string;
    label: string;
    type: string;
    degree: number;
  }> {
    if (!this.graphInitialized) {
      return [];
    }

    return this.graphRAGEngine.getHubs(limit);
  }

  /**
   * Run comprehensive research with GraphRAG
   * Combines search, graph analysis, and insights generation
   */
  async runWithGraphRAG(): Promise<{
    searchResult: IAgenticSearchResult;
    graphStats: { nodeCount: number; edgeCount: number; communityCount: number };
    communities: Array<{ label: string; memberCount: number; keywords: string[] }>;
    hubs: Array<{ label: string; degree: number }>;
    breakthroughs: IBreakthrough[];
  }> {
    console.log('[Agent] Starting comprehensive research with GraphRAG...');

    // 1. Run agentic search
    const query = this.buildDefaultQuery();
    const searchResult = await this.searchAgentic(query);

    // 2. Initialize graph with fresh results
    this.graphRAGEngine.initialize(searchResult.results);
    this.graphInitialized = true;

    // 3. Get graph stats
    const graphStats = this.graphRAGEngine.getStats();

    // 4. Get communities
    const communities = this.getGraphCommunities().slice(0, 10);

    // 5. Get hub nodes
    const hubs = this.getGraphHubs(10);

    // 6. Detect breakthroughs
    const breakthroughs = this.breakthroughDetector.detectBreakthroughs(
      searchResult.results
    ).slice(0, 10);

    this.lastRunAt = new Date();

    console.log('[Agent] Comprehensive GraphRAG research complete:', {
      results: searchResult.totalUnique,
      graphNodes: graphStats.nodeCount,
      communities: communities.length,
      breakthroughs: breakthroughs.length,
    });

    return {
      searchResult,
      graphStats,
      communities: communities.map(c => ({
        label: c.label,
        memberCount: c.memberCount,
        keywords: c.keywords,
      })),
      hubs: hubs.map(h => ({
        label: h.label,
        degree: h.degree,
      })),
      breakthroughs,
    };
  }
}
