/**
 * @fileoverview Parallel Search Executor
 * @module research/executors/ParallelSearchExecutor
 * @description Параллельный поиск по нескольким источникам
 *
 * Функции:
 * - Concurrent search across sources
 * - Rate limiting per source
 * - Timeout handling
 * - Result aggregation and deduplication
 * - Progress reporting
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchQuery,
  IResearchResult,
  ResearchSource,
} from '../types';
import { IResearchSource } from '../sources/IResearchSource';
import { ResultCache } from '../cache/ResultCache';

/**
 * Search result from single source
 */
interface ISourceSearchResult {
  /** Source that was searched */
  source: ResearchSource;

  /** Results found */
  results: IResearchResult[];

  /** Time taken (ms) */
  durationMs: number;

  /** Was cached? */
  fromCache: boolean;

  /** Error if failed */
  error?: string;

  /** Status */
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
}

/**
 * Parallel search result
 */
export interface IParallelSearchResult {
  /** Results from all sources */
  sourceResults: ISourceSearchResult[];

  /** Merged unique results */
  results: IResearchResult[];

  /** Total unique results */
  totalUnique: number;

  /** Total duration (ms) */
  totalDurationMs: number;

  /** Sources that succeeded */
  successfulSources: ResearchSource[];

  /** Sources that failed */
  failedSources: ResearchSource[];

  /** Cache hit rate */
  cacheHitRate: number;
}

/**
 * Executor configuration
 */
interface IExecutorConfig {
  /** Maximum concurrent requests */
  maxConcurrency: number;

  /** Timeout per source (ms) */
  timeoutMs: number;

  /** Enable caching */
  enableCache: boolean;

  /** Retry failed sources */
  retryOnFailure: boolean;

  /** Max retries */
  maxRetries: number;

  /** Rate limit delay between requests to same source (ms) */
  rateLimitDelayMs: number;

  /** Progress callback */
  onProgress?: (completed: number, total: number, source: ResearchSource) => void;
}

const DEFAULT_CONFIG: IExecutorConfig = {
  maxConcurrency: 5,
  timeoutMs: 30000,
  enableCache: true,
  retryOnFailure: true,
  maxRetries: 2,
  rateLimitDelayMs: 100,
};

/**
 * Parallel Search Executor
 *
 * Efficiently searches multiple sources in parallel with:
 * - Concurrency control
 * - Caching integration
 * - Timeout handling
 * - Automatic deduplication
 */
export class ParallelSearchExecutor {
  private sources: Map<ResearchSource, IResearchSource>;
  private cache: ResultCache;
  private config: IExecutorConfig;
  private lastRequestTime: Map<ResearchSource, number>;

  constructor(
    sources: Map<ResearchSource, IResearchSource>,
    cache: ResultCache,
    config: Partial<IExecutorConfig> = {}
  ) {
    this.sources = sources;
    this.cache = cache;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastRequestTime = new Map();
  }

  /**
   * Execute parallel search across sources
   */
  async execute(query: IResearchQuery): Promise<IParallelSearchResult> {
    const startTime = Date.now();
    const sourceResults: ISourceSearchResult[] = [];

    // Filter to available sources
    const availableSources = query.sources.filter(s => this.sources.has(s));

    // Create search tasks
    const tasks = availableSources.map(source => ({
      source,
      promise: this.searchSourceWithRetry(query, source),
    }));

    // Execute with concurrency control
    const results = await this.executeWithConcurrency(
      tasks,
      this.config.maxConcurrency
    );

    // Collect results
    let cacheHits = 0;
    for (const result of results) {
      sourceResults.push(result);
      if (result.fromCache) cacheHits++;
    }

    // Merge and deduplicate
    const mergedResults = this.mergeAndDeduplicate(sourceResults);

    // Categorize sources
    const successfulSources = sourceResults
      .filter(r => r.status === 'success')
      .map(r => r.source);

    const failedSources = sourceResults
      .filter(r => r.status !== 'success')
      .map(r => r.source);

    return {
      sourceResults,
      results: mergedResults,
      totalUnique: mergedResults.length,
      totalDurationMs: Date.now() - startTime,
      successfulSources,
      failedSources,
      cacheHitRate: availableSources.length > 0 ? cacheHits / availableSources.length : 0,
    };
  }

  /**
   * Search single source with retry logic
   */
  private async searchSourceWithRetry(
    query: IResearchQuery,
    sourceType: ResearchSource
  ): Promise<ISourceSearchResult> {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(query, sourceType);
      if (cached) {
        return {
          source: sourceType,
          results: cached,
          durationMs: 0,
          fromCache: true,
          status: 'success',
        };
      }
    }

    // Rate limiting
    await this.respectRateLimit(sourceType);

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= this.config.maxRetries) {
      attempts++;

      try {
        const result = await this.searchSourceWithTimeout(query, sourceType);

        // Cache successful results
        if (this.config.enableCache && result.status === 'success') {
          this.cache.set(query, sourceType, result.results);
        }

        // Report progress
        if (this.config.onProgress) {
          this.config.onProgress(1, 1, sourceType);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on timeout
        if (lastError.message.includes('timeout')) {
          break;
        }

        // Wait before retry
        if (attempts <= this.config.maxRetries && this.config.retryOnFailure) {
          await this.delay(1000 * attempts); // Exponential backoff
        }
      }
    }

    return {
      source: sourceType,
      results: [],
      durationMs: 0,
      fromCache: false,
      error: lastError?.message || 'Unknown error',
      status: 'error',
    };
  }

  /**
   * Search source with timeout
   */
  private async searchSourceWithTimeout(
    query: IResearchQuery,
    sourceType: ResearchSource
  ): Promise<ISourceSearchResult> {
    const source = this.sources.get(sourceType);
    if (!source) {
      return {
        source: sourceType,
        results: [],
        durationMs: 0,
        fromCache: false,
        error: 'Source not available',
        status: 'error',
      };
    }

    const startTime = Date.now();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), this.config.timeoutMs);
    });

    // Race between search and timeout
    try {
      const results = await Promise.race([
        source.search(query),
        timeoutPromise,
      ]);

      this.lastRequestTime.set(sourceType, Date.now());

      return {
        source: sourceType,
        results,
        durationMs: Date.now() - startTime,
        fromCache: false,
        status: 'success',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('timeout')) {
        return {
          source: sourceType,
          results: [],
          durationMs: this.config.timeoutMs,
          fromCache: false,
          error: 'Request timed out',
          status: 'timeout',
        };
      }

      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        return {
          source: sourceType,
          results: [],
          durationMs: Date.now() - startTime,
          fromCache: false,
          error: 'Rate limited',
          status: 'rate_limited',
        };
      }

      throw error;
    }
  }

  /**
   * Execute tasks with concurrency control
   */
  private async executeWithConcurrency<T>(
    tasks: Array<{ source: ResearchSource; promise: Promise<T> }>,
    maxConcurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const p = task.promise.then(result => {
        results.push(result);
      });

      executing.push(p);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const status = await Promise.race([
            executing[i].then(() => 'done'),
            Promise.resolve('pending'),
          ]);
          if (status === 'done') {
            executing.splice(i, 1);
          }
        }
      }
    }

    // Wait for remaining
    await Promise.all(executing);

    return results;
  }

  /**
   * Merge results and remove duplicates
   */
  private mergeAndDeduplicate(
    sourceResults: ISourceSearchResult[]
  ): IResearchResult[] {
    const seen = new Map<string, IResearchResult>();

    for (const sourceResult of sourceResults) {
      for (const result of sourceResult.results) {
        // Use ID or URL as deduplication key
        const key = result.id || result.url;

        if (!seen.has(key)) {
          seen.set(key, result);
        } else {
          // Keep the one with higher relevance score
          const existing = seen.get(key)!;
          if (result.relevanceScore > existing.relevanceScore) {
            seen.set(key, result);
          }
        }
      }
    }

    // Sort by relevance
    return Array.from(seen.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
  }

  /**
   * Respect rate limits between requests
   */
  private async respectRateLimit(source: ResearchSource): Promise<void> {
    const lastRequest = this.lastRequestTime.get(source);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < this.config.rateLimitDelayMs) {
        await this.delay(this.config.rateLimitDelayMs - elapsed);
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available sources
   */
  getAvailableSources(): ResearchSource[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Check source availability
   */
  async checkSourceAvailability(): Promise<Map<ResearchSource, boolean>> {
    const availability = new Map<ResearchSource, boolean>();

    const checks = Array.from(this.sources.entries()).map(async ([type, source]) => {
      try {
        const available = await Promise.race([
          source.isAvailable(),
          this.delay(5000).then(() => false),
        ]);
        availability.set(type, available as boolean);
      } catch {
        availability.set(type, false);
      }
    });

    await Promise.all(checks);
    return availability;
  }
}
