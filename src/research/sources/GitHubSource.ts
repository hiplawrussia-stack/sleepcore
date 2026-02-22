/**
 * @fileoverview GitHub Research Source
 * @module research/sources/GitHubSource
 * @description Мониторинг GitHub репозиториев для sleep/insomnia разработок
 *
 * Отслеживает:
 * - Open source проекты по анализу сна
 * - ML модели для sleep stage classification
 * - Digital therapeutics frameworks
 * - Wearable integrations (Fitbit, Garmin, Oura)
 * - CBT-I implementations
 * - Circadian rhythm tools
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
 * GitHub Repository
 */
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license: {
    key: string;
    name: string;
  } | null;
  owner: {
    login: string;
    type: string;
    html_url: string;
  };
  open_issues_count: number;
  default_branch: string;
}

/**
 * GitHub Search Response
 */
interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

/**
 * GitHub Release
 */
interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  created_at: string;
  published_at: string;
  html_url: string;
  author: {
    login: string;
  };
}

/**
 * Отслеживаемые репозитории
 */
interface TrackedRepo {
  owner: string;
  repo: string;
  category: ResearchCategory;
  relevance: string;
}

/**
 * GitHub Source Implementation
 */
export class GitHubSource extends BaseResearchSource {
  readonly name = ResearchSource.PATENTS; // Reusing enum, could add GITHUB to enum
  readonly displayName = 'GitHub';
  readonly description = 'Open source sleep/insomnia projects on GitHub';
  readonly baseUrl = 'https://api.github.com';

  private readonly token?: string;

  /**
   * Ключевые репозитории для мониторинга
   */
  private readonly trackedRepos: TrackedRepo[] = [
    // Sleep Analysis & ML
    { owner: 'stanford-stages', repo: 'stanford-stages', category: ResearchCategory.AI_ML, relevance: 'Sleep stage classification ML' },
    { owner: 'raphaelvallat', repo: 'yasa', category: ResearchCategory.AI_ML, relevance: 'Yet Another Spindle Algorithm - sleep analysis' },
    { owner: 'mne-tools', repo: 'mne-python', category: ResearchCategory.NEUROSCIENCE, relevance: 'EEG/MEG analysis including sleep' },

    // Wearables
    { owner: 'Fitbit', repo: 'fitbit-sdk-toolchain', category: ResearchCategory.WEARABLES, relevance: 'Fitbit SDK for sleep apps' },
    { owner: 'garmin', repo: 'connectiq-apps', category: ResearchCategory.WEARABLES, relevance: 'Garmin Connect IQ apps' },

    // Digital Health
    { owner: 'ohdsi', repo: 'CommonDataModel', category: ResearchCategory.REGULATORY, relevance: 'OMOP CDM for health data' },
    { owner: 'smart-on-fhir', repo: 'client-js', category: ResearchCategory.REGULATORY, relevance: 'FHIR client for health apps' },

    // Circadian
    { owner: 'circadian-research', repo: 'circadian', category: ResearchCategory.CHRONOBIOLOGY, relevance: 'Circadian rhythm analysis' },
  ];

  /**
   * Поисковые запросы для обнаружения новых проектов
   */
  private readonly searchQueries = [
    'sleep analysis machine learning',
    'insomnia app',
    'CBT-I digital',
    'sleep stage classification',
    'circadian rhythm tracker',
    'polysomnography python',
    'actigraphy analysis',
    'sleep diary app',
    'digital therapeutics mental health',
    'wearable sleep tracking',
    'HRV sleep',
    'EEG sleep staging',
  ];

  constructor(token?: string) {
    super();
    this.token = token || process.env.GITHUB_TOKEN;
  }

  /**
   * Проверить доступность API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/rate_limit`,
        this.getHeaders(),
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Поиск репозиториев
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    // 1. Поиск по ключевым словам
    for (const searchQuery of this.searchQueries.slice(0, 5)) {
      try {
        const repos = await this.searchRepositories(searchQuery, 10);
        const mapped = repos.map(repo => this.mapToResearchResult(repo, query));
        results.push(...mapped);
      } catch (error) {
        console.warn(`GitHub search failed for "${searchQuery}":`, error);
      }
    }

    // 2. Проверить обновления отслеживаемых репозиториев
    for (const tracked of this.trackedRepos) {
      try {
        const releases = await this.getRecentReleases(tracked.owner, tracked.repo);
        for (const release of releases) {
          const result = this.mapReleaseToResult(release, tracked, query);
          if (result) {
            results.push(result);
          }
        }
      } catch {
        // Repo may not exist or no releases
      }
    }

    // Убрать дубликаты и отфильтровать по дате
    const uniqueResults = this.deduplicateResults(results);
    const filteredResults = uniqueResults.filter(
      r => r.publishedAt >= query.dateRange.from && r.publishedAt <= query.dateRange.to
    );

    // Сортировка по релевантности
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return filteredResults.slice(0, query.maxResultsPerSource || 30);
  }

  /**
   * Получить последние обновления
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'sleep insomnia',
      sources: [ResearchSource.PATENTS], // Using as GitHub
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['sleep', 'insomnia'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить репозиторий по ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    const repoPath = id.replace('github:', '');
    const [owner, repo] = repoPath.split('/');

    if (!owner || !repo) return null;

    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/repos/${owner}/${repo}`,
        this.getHeaders()
      );

      if (!response.ok) return null;

      const repoData: GitHubRepo = await response.json();
      return this.mapToResearchResult(repoData, {
        topic: '',
        sources: [],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      });
    } catch {
      return null;
    }
  }

  /**
   * Поиск репозиториев через GitHub Search API
   */
  private async searchRepositories(query: string, limit: number): Promise<GitHubRepo[]> {
    const params = new URLSearchParams({
      q: `${query} in:name,description,readme`,
      sort: 'updated',
      order: 'desc',
      per_page: String(limit),
    });

    const response = await this.safeFetch(
      `${this.baseUrl}/search/repositories?${params}`,
      this.getHeaders()
    );

    if (!response.ok) {
      throw new Error(`GitHub search failed: ${response.status}`);
    }

    const data: GitHubSearchResponse = await response.json();
    return data.items;
  }

  /**
   * Получить последние релизы
   */
  private async getRecentReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
    const response = await this.safeFetch(
      `${this.baseUrl}/repos/${owner}/${repo}/releases?per_page=5`,
      this.getHeaders()
    );

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * HTTP заголовки
   */
  private getHeaders(): RequestInit {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SleepCore-Research-Agent',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return { headers };
  }

  /**
   * Преобразовать репозиторий в IResearchResult
   */
  private mapToResearchResult(
    repo: GitHubRepo,
    query: IResearchQuery
  ): IResearchResult {
    const relevanceScore = this.calculateRelevance(repo, query);
    const breakthroughScore = this.calculateBreakthroughScore(repo);
    const categories = this.detectCategories(repo);

    const base = this.createBaseResult(
      `github:${repo.full_name}`,
      repo.name,
      repo.description || 'No description',
      repo.html_url,
      new Date(repo.pushed_at)
    );

    return {
      ...base,
      authors: [repo.owner.login],
      organizations: repo.owner.type === 'Organization' ? [repo.owner.login] : [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags: this.extractTags(repo),
      relatedSleepCoreComponents: this.detectSleepCoreComponents(repo),
      confidenceLevel: ConfidenceLevel.LOW, // Open source = needs validation
      metadata: {
        repoFullName: repo.full_name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics,
        license: repo.license?.name,
        openIssues: repo.open_issues_count,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      },
    };
  }

  /**
   * Преобразовать релиз в IResearchResult
   */
  private mapReleaseToResult(
    release: GitHubRelease,
    tracked: TrackedRepo,
    query: IResearchQuery
  ): IResearchResult | null {
    const publishedAt = new Date(release.published_at);

    // Фильтр по дате
    if (publishedAt < query.dateRange.from || publishedAt > query.dateRange.to) {
      return null;
    }

    const base = this.createBaseResult(
      `github:${tracked.owner}/${tracked.repo}:${release.tag_name}`,
      `${tracked.repo} ${release.tag_name}: ${release.name || 'New Release'}`,
      release.body?.slice(0, 500) || 'New release',
      release.html_url,
      publishedAt
    );

    return {
      ...base,
      authors: [release.author.login],
      organizations: [tracked.owner],
      relevanceScore: 70, // Tracked repos are relevant
      breakthroughScore: this.assessReleaseBreakthrough(release),
      categories: [tracked.category],
      tags: ['release', 'open-source', tracked.category],
      relatedSleepCoreComponents: [],
      confidenceLevel: ConfidenceLevel.MEDIUM,
      metadata: {
        repoFullName: `${tracked.owner}/${tracked.repo}`,
        tagName: release.tag_name,
        isRelease: true,
        relevanceNote: tracked.relevance,
      },
    };
  }

  /**
   * Вычислить релевантность
   */
  private calculateRelevance(repo: GitHubRepo, query: IResearchQuery): number {
    let score = 0;

    const text = `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();

    // Ключевые слова SleepCore
    const keywords = [
      { term: 'sleep', weight: 15 },
      { term: 'insomnia', weight: 20 },
      { term: 'cbt-i', weight: 25 },
      { term: 'circadian', weight: 15 },
      { term: 'actigraphy', weight: 18 },
      { term: 'polysomnography', weight: 18 },
      { term: 'eeg', weight: 12 },
      { term: 'digital therapeutic', weight: 20 },
      { term: 'sleep stage', weight: 18 },
      { term: 'wearable', weight: 12 },
      { term: 'fitbit', weight: 10 },
      { term: 'garmin', weight: 10 },
      { term: 'oura', weight: 10 },
      { term: 'hrv', weight: 12 },
      { term: 'machine learning', weight: 10 },
      { term: 'deep learning', weight: 10 },
    ];

    for (const { term, weight } of keywords) {
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

    // Популярность (stars, forks)
    if (repo.stargazers_count >= 100) score += 10;
    if (repo.stargazers_count >= 500) score += 10;
    if (repo.stargazers_count >= 1000) score += 10;
    if (repo.forks_count >= 50) score += 5;

    // Активность (обновлялся недавно)
    const daysSinceUpdate = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 10;
    if (daysSinceUpdate < 7) score += 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность
   */
  private calculateBreakthroughScore(repo: GitHubRepo): number {
    let score = 0;

    const text = `${repo.name} ${repo.description || ''}`.toLowerCase();

    // Индикаторы инноваций
    const indicators = [
      { term: 'novel', weight: 12 },
      { term: 'state-of-the-art', weight: 15 },
      { term: 'sota', weight: 15 },
      { term: 'first', weight: 10 },
      { term: 'new approach', weight: 12 },
      { term: 'transformer', weight: 10 },
      { term: 'foundation model', weight: 15 },
      { term: 'breakthrough', weight: 15 },
    ];

    for (const { term, weight } of indicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Высокая популярность = потенциально важный проект
    if (repo.stargazers_count >= 500) score += 15;
    if (repo.stargazers_count >= 2000) score += 15;

    // Много форков = активное развитие
    if (repo.forks_count >= 100) score += 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность релиза
   */
  private assessReleaseBreakthrough(release: GitHubRelease): number {
    let score = 20; // Базовый score для релиза

    const text = `${release.name || ''} ${release.body || ''}`.toLowerCase();

    if (text.includes('major')) score += 15;
    if (text.includes('breaking')) score += 10;
    if (text.includes('new feature')) score += 10;
    if (text.includes('performance')) score += 8;
    if (release.tag_name.startsWith('v1.0') || release.tag_name.startsWith('1.0')) score += 15;

    return Math.min(100, score);
  }

  /**
   * Определить категории
   */
  private detectCategories(repo: GitHubRepo): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const text = `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();

    if (text.includes('machine learning') || text.includes('ml') || text.includes('deep learning')) {
      categories.push(ResearchCategory.AI_ML);
    }
    if (text.includes('eeg') || text.includes('polysomnography') || text.includes('brain')) {
      categories.push(ResearchCategory.NEUROSCIENCE);
    }
    if (text.includes('wearable') || text.includes('fitbit') || text.includes('garmin') || text.includes('actigraphy')) {
      categories.push(ResearchCategory.WEARABLES);
    }
    if (text.includes('hrv') || text.includes('biomarker') || text.includes('heart rate')) {
      categories.push(ResearchCategory.BIOMARKERS);
    }
    if (text.includes('circadian') || text.includes('chronotype')) {
      categories.push(ResearchCategory.CHRONOBIOLOGY);
    }
    if (text.includes('cbt') || text.includes('therapy') || text.includes('intervention')) {
      categories.push(ResearchCategory.CBT_I);
    }
    if (text.includes('fhir') || text.includes('hipaa') || text.includes('compliance')) {
      categories.push(ResearchCategory.REGULATORY);
    }

    // Default
    if (categories.length === 0) {
      categories.push(ResearchCategory.AI_ML);
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(repo: GitHubRepo): string[] {
    const tags: string[] = ['open-source'];

    // Язык программирования
    if (repo.language) {
      tags.push(repo.language.toLowerCase());
    }

    // Topics
    tags.push(...repo.topics.slice(0, 5));

    // Лицензия
    if (repo.license) {
      tags.push(repo.license.key);
    }

    return [...new Set(tags)];
  }

  /**
   * Определить связь с компонентами SleepCore
   */
  private detectSleepCoreComponents(repo: GitHubRepo): string[] {
    const components: string[] = [];
    const text = `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();

    if (text.includes('sleep stage') || text.includes('classification')) {
      components.push('SleepPredictionService');
    }
    if (text.includes('prediction') || text.includes('forecast')) {
      components.push('SleepPredictionService');
    }
    if (text.includes('wearable') || text.includes('fitbit') || text.includes('garmin')) {
      components.push('WearableIntegrationService');
    }
    if (text.includes('digital twin') || text.includes('simulation')) {
      components.push('DigitalTwinService');
    }
    if (text.includes('hrv') || text.includes('heart')) {
      components.push('BiomarkerService');
    }
    if (text.includes('circadian')) {
      components.push('ChronotypeService');
    }

    return components;
  }

  /**
   * Убрать дубликаты
   */
  private deduplicateResults(results: IResearchResult[]): IResearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      // Используем full_name репозитория как ключ
      const key = result.metadata?.repoFullName as string || result.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Получить trending репозитории
   */
  async getTrending(language?: string): Promise<IResearchResult[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateStr = weekAgo.toISOString().split('T')[0];

    let query = `sleep OR insomnia OR circadian created:>${dateStr}`;
    if (language) {
      query += ` language:${language}`;
    }

    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: '20',
    });

    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/search/repositories?${params}`,
        this.getHeaders()
      );

      if (!response.ok) {
        return [];
      }

      const data: GitHubSearchResponse = await response.json();
      return data.items.map(repo => this.mapToResearchResult(repo, {
        topic: '',
        sources: [],
        dateRange: { from: weekAgo, to: new Date() },
        keywords: [],
      }));
    } catch {
      return [];
    }
  }
}
