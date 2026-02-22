/**
 * @fileoverview International Clinical Trials Source
 * @module research/sources/InternationalTrialsSource
 * @description Международные реестры клинических исследований
 *
 * Охват:
 * - ICTRP (WHO) — агрегатор всех региональных реестров
 * - EU CTR — Европейский реестр
 * - JRCT — Япония
 * - ChiCTR — Китай
 * - CRIS — Корея
 * - CTRI — Индия
 * - ANZCTR — Австралия/Новая Зеландия
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IResearchQuery,
  IResearchResult,
  IClinicalTrial,
  ResearchSource,
  ResearchCategory,
  ConfidenceLevel,
} from '../types';
import { BaseResearchSource } from './IResearchSource';

/**
 * Региональный реестр
 */
interface RegionalRegistry {
  id: string;
  name: string;
  country: string;
  region: 'asia' | 'europe' | 'americas' | 'oceania' | 'africa';
  baseUrl: string;
  searchUrl: string;
  language: string;
  idPrefix: string;
  priority: number;
}

/**
 * International Clinical Trials Source
 */
export class InternationalTrialsSource extends BaseResearchSource {
  readonly name = ResearchSource.CLINICAL_TRIALS;
  readonly displayName = 'International Clinical Trials';
  readonly description = 'WHO ICTRP and regional clinical trial registries';
  readonly baseUrl = 'https://trialsearch.who.int';

  /**
   * Региональные реестры
   */
  private readonly registries: RegionalRegistry[] = [
    // АЗИЯ
    {
      id: 'jrct',
      name: 'Japan Registry of Clinical Trials',
      country: 'Japan',
      region: 'asia',
      baseUrl: 'https://jrct.niph.go.jp',
      searchUrl: 'https://jrct.niph.go.jp/en-latest',
      language: 'ja',
      idPrefix: 'jRCT',
      priority: 1,
    },
    {
      id: 'chictr',
      name: 'Chinese Clinical Trial Registry',
      country: 'China',
      region: 'asia',
      baseUrl: 'https://www.chictr.org.cn',
      searchUrl: 'https://www.chictr.org.cn/searchprojen.html',
      language: 'zh',
      idPrefix: 'ChiCTR',
      priority: 1,
    },
    {
      id: 'cris',
      name: 'Clinical Research Information Service',
      country: 'South Korea',
      region: 'asia',
      baseUrl: 'https://cris.nih.go.kr',
      searchUrl: 'https://cris.nih.go.kr/cris/search/search_result_st01_en.jsp',
      language: 'ko',
      idPrefix: 'KCT',
      priority: 2,
    },
    {
      id: 'ctri',
      name: 'Clinical Trials Registry - India',
      country: 'India',
      region: 'asia',
      baseUrl: 'http://ctri.nic.in',
      searchUrl: 'http://ctri.nic.in/Clinicaltrials/advancesearchmain.php',
      language: 'en',
      idPrefix: 'CTRI',
      priority: 2,
    },
    {
      id: 'tctr',
      name: 'Thai Clinical Trials Registry',
      country: 'Thailand',
      region: 'asia',
      baseUrl: 'https://www.thaiclinicaltrials.org',
      searchUrl: 'https://www.thaiclinicaltrials.org',
      language: 'th',
      idPrefix: 'TCTR',
      priority: 3,
    },

    // ЕВРОПА
    {
      id: 'euctr',
      name: 'EU Clinical Trials Register',
      country: 'European Union',
      region: 'europe',
      baseUrl: 'https://www.clinicaltrialsregister.eu',
      searchUrl: 'https://www.clinicaltrialsregister.eu/ctr-search/search',
      language: 'en',
      idPrefix: 'EUCTR',
      priority: 1,
    },
    {
      id: 'drks',
      name: 'German Clinical Trials Register',
      country: 'Germany',
      region: 'europe',
      baseUrl: 'https://www.drks.de',
      searchUrl: 'https://www.drks.de/drks_web/navigate.do?navigationId=search',
      language: 'de',
      idPrefix: 'DRKS',
      priority: 1,
    },
    {
      id: 'isrctn',
      name: 'ISRCTN Registry',
      country: 'UK',
      region: 'europe',
      baseUrl: 'https://www.isrctn.com',
      searchUrl: 'https://www.isrctn.com/search',
      language: 'en',
      idPrefix: 'ISRCTN',
      priority: 1,
    },
    {
      id: 'ntr',
      name: 'Netherlands Trial Register',
      country: 'Netherlands',
      region: 'europe',
      baseUrl: 'https://www.trialregister.nl',
      searchUrl: 'https://www.trialregister.nl/trials',
      language: 'en',
      idPrefix: 'NTR',
      priority: 2,
    },

    // ОКЕАНИЯ
    {
      id: 'anzctr',
      name: 'Australian New Zealand Clinical Trials Registry',
      country: 'Australia/New Zealand',
      region: 'oceania',
      baseUrl: 'https://www.anzctr.org.au',
      searchUrl: 'https://www.anzctr.org.au/TrialSearch.aspx',
      language: 'en',
      idPrefix: 'ACTRN',
      priority: 1,
    },

    // АМЕРИКА (кроме США — он в ClinicalTrialsSource)
    {
      id: 'rebec',
      name: 'Brazilian Clinical Trials Registry',
      country: 'Brazil',
      region: 'americas',
      baseUrl: 'https://ensaiosclinicos.gov.br',
      searchUrl: 'https://ensaiosclinicos.gov.br/pesquisa_avancada',
      language: 'pt',
      idPrefix: 'RBR',
      priority: 2,
    },

    // АФРИКА
    {
      id: 'pactr',
      name: 'Pan African Clinical Trials Registry',
      country: 'Africa',
      region: 'africa',
      baseUrl: 'https://pactr.samrc.ac.za',
      searchUrl: 'https://pactr.samrc.ac.za/Search.aspx',
      language: 'en',
      idPrefix: 'PACTR',
      priority: 3,
    },
  ];

  /**
   * Ключевые слова по языкам
   */
  private readonly keywordsByLanguage: Record<string, string[]> = {
    en: ['insomnia', 'sleep disorder', 'CBT-I', 'cognitive behavioral therapy'],
    ja: ['不眠症', '睡眠障害', '認知行動療法'],
    zh: ['失眠', '睡眠障碍', '认知行为疗法'],
    ko: ['불면증', '수면장애', '인지행동치료'],
    de: ['Insomnie', 'Schlafstörung', 'KVT-I'],
    pt: ['insônia', 'distúrbio do sono', 'TCC-I'],
  };

  /**
   * Проверить доступность
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/Trial2.aspx`,
        {},
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Поиск клинических исследований
   */
  async search(query: IResearchQuery): Promise<IResearchResult[]> {
    const results: IResearchResult[] = [];

    // Поиск через WHO ICTRP (агрегатор)
    const ictrpResults = await this.searchICTRP(query);
    results.push(...ictrpResults);

    // Сортировка по релевантности
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, query.maxResultsPerSource || 50);
  }

  /**
   * Поиск через WHO ICTRP
   */
  private async searchICTRP(query: IResearchQuery): Promise<IResearchResult[]> {
    // ICTRP имеет ограниченный API, используем RSS/Atom feed или scraping
    // Для MVP используем статический список ключевых исследований

    // Симуляция результатов из разных регионов
    const mockResults: IResearchResult[] = [];

    // Создаём результаты для каждого региона
    for (const registry of this.registries) {
      const regionResults = this.createRegionalResults(registry, query);
      mockResults.push(...regionResults);
    }

    return mockResults;
  }

  /**
   * Создать результаты для региона (placeholder для реального API)
   */
  private createRegionalResults(
    registry: RegionalRegistry,
    query: IResearchQuery
  ): IResearchResult[] {
    // В production здесь будет реальный API вызов
    // Сейчас возвращаем информацию о реестре для демонстрации
    const results: IResearchResult[] = [];

    // Формируем поисковый URL
    const keywords = this.keywordsByLanguage[registry.language] ||
                     this.keywordsByLanguage['en'];

    const base = this.createBaseResult(
      `${registry.idPrefix}:registry_info`,
      `${registry.name} - Sleep/Insomnia Trials`,
      `Search ${registry.name} for insomnia clinical trials. ` +
      `Language: ${registry.language}. ` +
      `Region: ${registry.country}. ` +
      `Keywords: ${keywords.join(', ')}`,
      registry.searchUrl,
      new Date()
    );

    results.push({
      ...base,
      authors: [],
      organizations: [registry.name],
      relevanceScore: registry.priority === 1 ? 70 : registry.priority === 2 ? 50 : 30,
      breakthroughScore: 0,
      categories: [ResearchCategory.CBT_I],
      tags: [registry.region, registry.country.toLowerCase(), 'clinical-trials', 'registry'],
      relatedSleepCoreComponents: [],
      confidenceLevel: ConfidenceLevel.MEDIUM,
      metadata: {
        registry: registry.id,
        region: registry.region,
        country: registry.country,
        language: registry.language,
        idPrefix: registry.idPrefix,
        searchKeywords: keywords,
      },
    });

    return results;
  }

  /**
   * Получить последние исследования
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    return this.search({
      topic: 'insomnia',
      sources: [ResearchSource.CLINICAL_TRIALS],
      dateRange: { from: fromDate, to: new Date() },
      keywords: ['insomnia', 'sleep'],
      maxResultsPerSource: limit,
    });
  }

  /**
   * Получить по ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    // Определить реестр по префиксу
    const prefix = id.split(':')[0];
    const registry = this.registries.find(r => r.idPrefix === prefix);

    if (!registry) {
      return null;
    }

    // Сформировать URL для просмотра
    const url = `${registry.baseUrl}/trial/${id}`;

    const base = this.createBaseResult(
      id,
      `Trial ${id}`,
      `Clinical trial from ${registry.name}`,
      url,
      new Date()
    );

    return {
      ...base,
      authors: [],
      organizations: [registry.name],
      relevanceScore: 50,
      breakthroughScore: 0,
      categories: [],
      tags: [registry.region, 'clinical-trial'],
      relatedSleepCoreComponents: [],
      confidenceLevel: ConfidenceLevel.MEDIUM,
      metadata: { registry: registry.id },
    };
  }

  /**
   * Получить реестры по региону
   */
  getRegistriesByRegion(region: 'asia' | 'europe' | 'americas' | 'oceania' | 'africa'): RegionalRegistry[] {
    return this.registries.filter(r => r.region === region);
  }

  /**
   * Получить все реестры
   */
  getAllRegistries(): RegionalRegistry[] {
    return this.registries;
  }

  /**
   * Поиск по конкретному региону
   */
  async searchByRegion(
    region: 'asia' | 'europe' | 'americas' | 'oceania' | 'africa',
    query: IResearchQuery
  ): Promise<IResearchResult[]> {
    const regionRegistries = this.getRegistriesByRegion(region);
    const results: IResearchResult[] = [];

    for (const registry of regionRegistries) {
      const regionResults = this.createRegionalResults(registry, query);
      results.push(...regionResults);
    }

    return results;
  }

  /**
   * Статистика по регионам
   */
  getRegionStats(): Record<string, { registries: number; countries: string[] }> {
    const stats: Record<string, { registries: number; countries: string[] }> = {};

    for (const registry of this.registries) {
      if (!stats[registry.region]) {
        stats[registry.region] = { registries: 0, countries: [] };
      }
      stats[registry.region].registries++;
      if (!stats[registry.region].countries.includes(registry.country)) {
        stats[registry.region].countries.push(registry.country);
      }
    }

    return stats;
  }
}
