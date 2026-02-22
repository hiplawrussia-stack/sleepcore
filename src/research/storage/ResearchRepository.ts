/**
 * @fileoverview Research Repository
 * @module research/storage/ResearchRepository
 * @description Хранилище результатов исследований
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchResult,
  IResearchReport,
  IStoredResearch,
  ResearchSource,
  ResearchCategory,
} from '../types';

/**
 * Опции фильтрации
 */
interface FilterOptions {
  sources?: ResearchSource[];
  categories?: ResearchCategory[];
  dateFrom?: Date;
  dateTo?: Date;
  minRelevance?: number;
  isStarred?: boolean;
  status?: IStoredResearch['status'];
  searchText?: string;
}

/**
 * Статистика репозитория
 */
interface RepositoryStats {
  totalResults: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentlyAdded: number;
  starredCount: number;
}

/**
 * In-memory репозиторий исследований
 *
 * В production использовать PostgreSQL/Redis
 */
export class ResearchRepository {
  private results: Map<string, IStoredResearch> = new Map();
  private reports: Map<string, IResearchReport> = new Map();

  /**
   * Сохранить результат исследования
   */
  async save(result: IResearchResult): Promise<void> {
    const stored: IStoredResearch = {
      result,
      storedAt: new Date(),
      isRead: false,
      isStarred: false,
      status: 'new',
    };

    this.results.set(result.id, stored);
  }

  /**
   * Сохранить несколько результатов
   */
  async saveMany(results: IResearchResult[]): Promise<number> {
    let saved = 0;

    for (const result of results) {
      // Не перезаписывать существующие
      if (!this.results.has(result.id)) {
        await this.save(result);
        saved++;
      }
    }

    return saved;
  }

  /**
   * Получить результат по ID
   */
  async getById(id: string): Promise<IStoredResearch | null> {
    return this.results.get(id) || null;
  }

  /**
   * Получить все результаты с фильтрацией
   */
  async find(options: FilterOptions = {}): Promise<IStoredResearch[]> {
    let results = [...this.results.values()];

    // Фильтр по источникам
    if (options.sources && options.sources.length > 0) {
      results = results.filter(r => options.sources!.includes(r.result.source));
    }

    // Фильтр по категориям
    if (options.categories && options.categories.length > 0) {
      results = results.filter(r =>
        r.result.categories.some(c => options.categories!.includes(c))
      );
    }

    // Фильтр по дате
    if (options.dateFrom) {
      results = results.filter(r => r.result.publishedAt >= options.dateFrom!);
    }
    if (options.dateTo) {
      results = results.filter(r => r.result.publishedAt <= options.dateTo!);
    }

    // Фильтр по релевантности
    if (options.minRelevance !== undefined) {
      results = results.filter(r => r.result.relevanceScore >= options.minRelevance!);
    }

    // Фильтр по starred
    if (options.isStarred !== undefined) {
      results = results.filter(r => r.isStarred === options.isStarred);
    }

    // Фильтр по статусу
    if (options.status) {
      results = results.filter(r => r.status === options.status);
    }

    // Поиск по тексту
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      results = results.filter(r => {
        const text = `${r.result.title} ${r.result.summary}`.toLowerCase();
        return text.includes(searchLower);
      });
    }

    // Сортировка по дате (новые первые)
    results.sort((a, b) => b.result.publishedAt.getTime() - a.result.publishedAt.getTime());

    return results;
  }

  /**
   * Получить топ по релевантности
   */
  async getTopRelevant(limit: number = 10): Promise<IStoredResearch[]> {
    const results = [...this.results.values()];

    return results
      .sort((a, b) => b.result.relevanceScore - a.result.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Получить топ по прорывности
   */
  async getTopBreakthroughs(limit: number = 10): Promise<IStoredResearch[]> {
    const results = [...this.results.values()];

    return results
      .sort((a, b) => b.result.breakthroughScore - a.result.breakthroughScore)
      .slice(0, limit);
  }

  /**
   * Получить непрочитанные
   */
  async getUnread(limit: number = 50): Promise<IStoredResearch[]> {
    const results = [...this.results.values()];

    return results
      .filter(r => !r.isRead && r.status === 'new')
      .sort((a, b) => b.result.relevanceScore - a.result.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Пометить как прочитанное
   */
  async markAsRead(id: string): Promise<void> {
    const stored = this.results.get(id);
    if (stored) {
      stored.isRead = true;
    }
  }

  /**
   * Пометить звёздочкой
   */
  async toggleStar(id: string): Promise<boolean> {
    const stored = this.results.get(id);
    if (stored) {
      stored.isStarred = !stored.isStarred;
      return stored.isStarred;
    }
    return false;
  }

  /**
   * Обновить статус
   */
  async updateStatus(id: string, status: IStoredResearch['status']): Promise<void> {
    const stored = this.results.get(id);
    if (stored) {
      stored.status = status;
      if (status === 'reviewed' || status === 'implemented' || status === 'dismissed') {
        stored.isRead = true;
      }
    }
  }

  /**
   * Добавить заметку
   */
  async addNote(id: string, note: string): Promise<void> {
    const stored = this.results.get(id);
    if (stored) {
      stored.notes = note;
    }
  }

  /**
   * Удалить результат
   */
  async delete(id: string): Promise<boolean> {
    return this.results.delete(id);
  }

  /**
   * Очистить старые результаты
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    let deleted = 0;
    for (const [id, stored] of this.results) {
      if (stored.storedAt < cutoff && !stored.isStarred) {
        this.results.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Сохранить отчёт
   */
  async saveReport(report: IResearchReport): Promise<void> {
    this.reports.set(report.id, report);
  }

  /**
   * Получить отчёт по ID
   */
  async getReport(id: string): Promise<IResearchReport | null> {
    return this.reports.get(id) || null;
  }

  /**
   * Получить последние отчёты
   */
  async getRecentReports(limit: number = 10): Promise<IResearchReport[]> {
    const reports = [...this.reports.values()];

    return reports
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<RepositoryStats> {
    const results = [...this.results.values()];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const stored of results) {
      // По источнику
      bySource[stored.result.source] = (bySource[stored.result.source] || 0) + 1;

      // По категориям
      for (const cat of stored.result.categories) {
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }

      // По статусу
      byStatus[stored.status] = (byStatus[stored.status] || 0) + 1;
    }

    return {
      totalResults: results.length,
      bySource,
      byCategory,
      byStatus,
      recentlyAdded: results.filter(r => r.storedAt >= weekAgo).length,
      starredCount: results.filter(r => r.isStarred).length,
    };
  }

  /**
   * Проверить существование
   */
  async exists(id: string): Promise<boolean> {
    return this.results.has(id);
  }

  /**
   * Получить количество
   */
  async count(options: FilterOptions = {}): Promise<number> {
    const results = await this.find(options);
    return results.length;
  }

  /**
   * Экспорт в JSON
   */
  async export(): Promise<{
    results: IStoredResearch[];
    reports: IResearchReport[];
    exportedAt: Date;
  }> {
    return {
      results: [...this.results.values()],
      reports: [...this.reports.values()],
      exportedAt: new Date(),
    };
  }

  /**
   * Импорт из JSON
   */
  async import(data: {
    results: IStoredResearch[];
    reports: IResearchReport[];
  }): Promise<{ resultsImported: number; reportsImported: number }> {
    let resultsImported = 0;
    let reportsImported = 0;

    for (const stored of data.results) {
      if (!this.results.has(stored.result.id)) {
        this.results.set(stored.result.id, stored);
        resultsImported++;
      }
    }

    for (const report of data.reports) {
      if (!this.reports.has(report.id)) {
        this.reports.set(report.id, report);
        reportsImported++;
      }
    }

    return { resultsImported, reportsImported };
  }

  /**
   * Очистить всё
   */
  async clear(): Promise<void> {
    this.results.clear();
    this.reports.clear();
  }
}
