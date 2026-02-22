/**
 * @fileoverview Agentic Search Strategy
 * @module research/strategies/AgenticSearchStrategy
 * @description Итеративный поиск с автоматическим уточнением запросов
 *
 * Реализует паттерн Agentic RAG (2025-2026):
 * - Multi-step reasoning
 * - Query refinement based on results
 * - Automatic follow-up queries
 * - Result synthesis
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
import { IResearchSource } from '../sources/IResearchSource';
import { QueryExpander, IExpandedQuery } from '../analyzers/QueryExpander';

/**
 * Search iteration result
 */
interface ISearchIteration {
  /** Iteration number */
  iteration: number;

  /** Query used */
  query: IResearchQuery;

  /** Expanded query */
  expandedQuery?: IExpandedQuery;

  /** Results found */
  results: IResearchResult[];

  /** Reasoning for next step */
  reasoning: string;

  /** Should continue searching? */
  shouldContinue: boolean;

  /** Suggested follow-up queries */
  followUpQueries: string[];
}

/**
 * Agentic search result
 */
export interface IAgenticSearchResult {
  /** All iterations performed */
  iterations: ISearchIteration[];

  /** Final merged results */
  results: IResearchResult[];

  /** Total unique results */
  totalUnique: number;

  /** Search path summary */
  searchPath: string;

  /** Key findings across iterations */
  keyFindings: string[];

  /** Confidence in completeness */
  completenessConfidence: ConfidenceLevel;

  /** Suggested further research */
  suggestedFurtherResearch: string[];
}

/**
 * Strategy configuration
 */
interface IAgenticStrategyConfig {
  /** Maximum iterations */
  maxIterations: number;

  /** Minimum results before stopping */
  minResultsToStop: number;

  /** Maximum results per iteration */
  maxResultsPerIteration: number;

  /** Enable query expansion */
  enableQueryExpansion: boolean;

  /** Enable automatic follow-up */
  enableFollowUp: boolean;

  /** Result deduplication threshold (0-1) */
  deduplicationThreshold: number;
}

const DEFAULT_CONFIG: IAgenticStrategyConfig = {
  maxIterations: 3,
  minResultsToStop: 20,
  maxResultsPerIteration: 50,
  enableQueryExpansion: true,
  enableFollowUp: true,
  deduplicationThreshold: 0.8,
};

/**
 * Agentic Search Strategy
 *
 * Implements iterative, self-refining search with:
 * - Automatic query expansion
 * - Result-driven query refinement
 * - Multi-source aggregation
 * - Intelligent stopping criteria
 */
export class AgenticSearchStrategy {
  private sources: Map<ResearchSource, IResearchSource>;
  private queryExpander: QueryExpander;
  private config: IAgenticStrategyConfig;

  constructor(
    sources: Map<ResearchSource, IResearchSource>,
    config: Partial<IAgenticStrategyConfig> = {}
  ) {
    this.sources = sources;
    this.queryExpander = new QueryExpander();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute agentic search
   */
  async search(initialQuery: IResearchQuery): Promise<IAgenticSearchResult> {
    const iterations: ISearchIteration[] = [];
    const allResults: IResearchResult[] = [];
    const seenIds = new Set<string>();

    let currentQuery = initialQuery;
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      iteration++;

      // Execute search iteration
      const iterResult = await this.executeIteration(
        currentQuery,
        iteration,
        allResults
      );

      // Deduplicate and add new results
      for (const result of iterResult.results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          allResults.push(result);
        }
      }

      iterations.push(iterResult);

      // Check stopping criteria
      if (!iterResult.shouldContinue) {
        break;
      }

      // Have enough results?
      if (allResults.length >= this.config.minResultsToStop) {
        break;
      }

      // Generate next query from follow-ups
      if (iterResult.followUpQueries.length > 0 && this.config.enableFollowUp) {
        currentQuery = this.createFollowUpQuery(
          initialQuery,
          iterResult.followUpQueries[0]
        );
      } else {
        break;
      }
    }

    // Synthesize final result
    return this.synthesizeResult(iterations, allResults);
  }

  /**
   * Execute single search iteration
   */
  private async executeIteration(
    query: IResearchQuery,
    iterationNum: number,
    previousResults: IResearchResult[]
  ): Promise<ISearchIteration> {
    // Expand query if enabled
    let expandedQuery: IExpandedQuery | undefined;
    let searchQuery = query;

    if (this.config.enableQueryExpansion && iterationNum === 1) {
      expandedQuery = this.queryExpander.expand(query);
      searchQuery = {
        ...query,
        keywords: [
          ...query.keywords,
          ...expandedQuery.expanded.slice(0, 5),
        ],
      };
    }

    // Search across sources
    const results = await this.searchSources(searchQuery);

    // Analyze results for follow-up queries
    const analysis = this.analyzeResultsForFollowUp(results, previousResults);

    return {
      iteration: iterationNum,
      query: searchQuery,
      expandedQuery,
      results,
      reasoning: analysis.reasoning,
      shouldContinue: analysis.shouldContinue,
      followUpQueries: analysis.followUpQueries,
    };
  }

  /**
   * Search across all available sources
   */
  private async searchSources(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];
    const searchPromises: Promise<IResearchResult[]>[] = [];

    // Filter to enabled sources
    const enabledSources = query.sources.filter(s => this.sources.has(s));

    for (const sourceType of enabledSources) {
      const source = this.sources.get(sourceType);
      if (source) {
        const limitedQuery = {
          ...query,
          maxResultsPerSource: this.config.maxResultsPerIteration,
        };

        searchPromises.push(
          source.search(limitedQuery).catch(err => {
            console.warn(`Search failed for ${sourceType}:`, err.message);
            return [];
          })
        );
      }
    }

    // Execute in parallel
    const searchResults = await Promise.all(searchPromises);

    for (const sourceResults of searchResults) {
      results.push(...sourceResults);
    }

    return results;
  }

  /**
   * Analyze results to determine follow-up queries
   */
  private analyzeResultsForFollowUp(
    currentResults: IResearchResult[],
    previousResults: IResearchResult[]
  ): {
    reasoning: string;
    shouldContinue: boolean;
    followUpQueries: string[];
  } {
    const followUpQueries: string[] = [];
    let reasoning: string;
    let shouldContinue = true;

    // Not enough results - suggest broadening
    if (currentResults.length < 5) {
      reasoning = 'Few results found, suggesting broader search terms';
      followUpQueries.push('digital therapeutics sleep');
      followUpQueries.push('insomnia treatment technology');
    }
    // Good results - extract themes for deeper search
    else if (currentResults.length >= 5) {
      const themes = this.extractThemes(currentResults);

      if (themes.length > 0) {
        reasoning = `Found ${currentResults.length} results. Identified themes: ${themes.join(', ')}`;

        // Generate follow-up queries from themes not yet explored
        const previousThemes = this.extractThemes(previousResults);
        const newThemes = themes.filter(t => !previousThemes.includes(t));

        for (const theme of newThemes.slice(0, 2)) {
          followUpQueries.push(`${theme} insomnia treatment`);
        }
      } else {
        reasoning = `Found ${currentResults.length} results. No new themes identified.`;
        shouldContinue = false;
      }
    }

    // High overlap with previous results - stop
    if (previousResults.length > 0) {
      const overlap = this.calculateOverlap(currentResults, previousResults);
      if (overlap > this.config.deduplicationThreshold) {
        reasoning = `High overlap (${Math.round(overlap * 100)}%) with previous results. Stopping.`;
        shouldContinue = false;
      }
    }

    return { reasoning, shouldContinue, followUpQueries };
  }

  /**
   * Extract themes from results
   */
  private extractThemes(results: IResearchResult[]): string[] {
    const themeCounts = new Map<string, number>();

    for (const result of results) {
      // Count categories
      for (const category of result.categories) {
        themeCounts.set(category, (themeCounts.get(category) || 0) + 1);
      }

      // Count tags
      for (const tag of result.tags.slice(0, 3)) {
        const normalizedTag = tag.toLowerCase();
        themeCounts.set(normalizedTag, (themeCounts.get(normalizedTag) || 0) + 1);
      }
    }

    // Return top themes (appearing in >20% of results)
    const threshold = results.length * 0.2;
    const themes: string[] = [];

    for (const [theme, count] of Array.from(themeCounts.entries())) {
      if (count >= threshold) {
        themes.push(theme);
      }
    }

    return themes.slice(0, 5);
  }

  /**
   * Calculate overlap between result sets
   */
  private calculateOverlap(
    current: IResearchResult[],
    previous: IResearchResult[]
  ): number {
    if (current.length === 0) return 0;

    const previousIds = new Set(previous.map(r => r.id));
    let overlapCount = 0;

    for (const result of current) {
      if (previousIds.has(result.id)) {
        overlapCount++;
      }
    }

    return overlapCount / current.length;
  }

  /**
   * Create follow-up query
   */
  private createFollowUpQuery(
    original: IResearchQuery,
    followUpTopic: string
  ): IResearchQuery {
    return {
      ...original,
      topic: followUpTopic,
      keywords: followUpTopic.split(' ').filter(w => w.length > 2),
    };
  }

  /**
   * Synthesize final result from all iterations
   */
  private synthesizeResult(
    iterations: ISearchIteration[],
    allResults: IResearchResult[]
  ): IAgenticSearchResult {
    // Sort by relevance
    const sortedResults = allResults.sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    // Build search path description
    const searchPath = iterations
      .map(i => `[${i.iteration}] ${i.query.topic} → ${i.results.length} results`)
      .join(' → ');

    // Extract key findings
    const keyFindings = this.extractKeyFindings(sortedResults);

    // Determine completeness confidence
    const completenessConfidence = this.assessCompleteness(iterations, allResults);

    // Suggest further research
    const suggestedFurtherResearch = this.suggestFurtherResearch(
      iterations,
      allResults
    );

    return {
      iterations,
      results: sortedResults,
      totalUnique: allResults.length,
      searchPath,
      keyFindings,
      completenessConfidence,
      suggestedFurtherResearch,
    };
  }

  /**
   * Extract key findings from results
   */
  private extractKeyFindings(results: IResearchResult[]): string[] {
    const findings: string[] = [];

    // Top results by relevance
    const topResults = results.slice(0, 5);
    for (const result of topResults) {
      if (result.keyFindings && result.keyFindings.length > 0) {
        findings.push(result.keyFindings[0]);
      }
    }

    // High breakthrough score items
    const breakthroughs = results
      .filter(r => r.breakthroughScore >= 70)
      .slice(0, 3);

    for (const bt of breakthroughs) {
      findings.push(`BREAKTHROUGH: ${bt.title.slice(0, 100)}`);
    }

    return findings.slice(0, 10);
  }

  /**
   * Assess search completeness
   */
  private assessCompleteness(
    iterations: ISearchIteration[],
    results: IResearchResult[]
  ): ConfidenceLevel {
    // Multiple successful iterations with good results
    if (iterations.length >= 2 && results.length >= 30) {
      return ConfidenceLevel.HIGH;
    }

    // At least one good iteration
    if (results.length >= 10) {
      return ConfidenceLevel.MEDIUM;
    }

    // Few results
    if (results.length >= 3) {
      return ConfidenceLevel.LOW;
    }

    return ConfidenceLevel.UNKNOWN;
  }

  /**
   * Suggest areas for further research
   */
  private suggestFurtherResearch(
    iterations: ISearchIteration[],
    results: IResearchResult[]
  ): string[] {
    const suggestions: string[] = [];

    // Categories with few results
    const categoryCounts = new Map<ResearchCategory, number>();
    for (const result of results) {
      for (const cat of result.categories) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
    }

    // Find underrepresented categories
    const allCategories = Object.values(ResearchCategory);
    for (const cat of allCategories) {
      if ((categoryCounts.get(cat) || 0) < 2) {
        suggestions.push(`Explore more: ${cat}`);
      }
    }

    // Suggest from last iteration follow-ups
    const lastIteration = iterations[iterations.length - 1];
    if (lastIteration && lastIteration.followUpQueries.length > 0) {
      for (const fq of lastIteration.followUpQueries) {
        suggestions.push(`Follow-up query: ${fq}`);
      }
    }

    return suggestions.slice(0, 5);
  }
}
