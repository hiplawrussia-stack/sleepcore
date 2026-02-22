/**
 * @fileoverview Research Source Interface
 * @module research/sources/IResearchSource
 */

import {
  IResearchQuery,
  IResearchResult,
  ResearchSource,
  ConfidenceLevel,
} from '../types';

/**
 * Интерфейс для источника данных исследований
 */
export interface IResearchSource {
  /** Название источника */
  readonly name: ResearchSource;

  /** Человекочитаемое название */
  readonly displayName: string;

  /** Описание */
  readonly description: string;

  /** URL базового API */
  readonly baseUrl: string;

  /** Доступен ли источник */
  isAvailable(): Promise<boolean>;

  /** Поиск по запросу */
  search(query: IResearchQuery): Promise<IResearchResult[]>;

  /** Получить последние публикации */
  getRecent(limit: number, daysBack: number): Promise<IResearchResult[]>;

  /** Получить детали по ID */
  getById(id: string): Promise<IResearchResult | null>;
}

/**
 * Базовый класс для источников
 */
export abstract class BaseResearchSource implements IResearchSource {
  abstract readonly name: ResearchSource;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly baseUrl: string;

  abstract isAvailable(): Promise<boolean>;
  abstract search(query: IResearchQuery): Promise<IResearchResult[]>;
  abstract getRecent(limit: number, daysBack: number): Promise<IResearchResult[]>;
  abstract getById(id: string): Promise<IResearchResult | null>;

  /**
   * Создать базовый результат
   */
  protected createBaseResult(
    id: string,
    title: string,
    summary: string,
    url: string,
    publishedAt: Date
  ): Omit<IResearchResult, 'relevanceScore' | 'breakthroughScore' | 'categories' | 'tags' | 'relatedSleepCoreComponents'> {
    return {
      id,
      source: this.name,
      title,
      summary,
      url,
      publishedAt,
      discoveredAt: new Date(),
      confidenceLevel: ConfidenceLevel.MEDIUM,
    };
  }

  /**
   * Форматировать дату для API
   */
  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Безопасный fetch с таймаутом
   */
  protected async safeFetch(
    url: string,
    options?: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
