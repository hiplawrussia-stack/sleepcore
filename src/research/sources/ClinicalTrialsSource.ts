/**
 * @fileoverview ClinicalTrials.gov Research Source
 * @module research/sources/ClinicalTrialsSource
 * @description Интеграция с ClinicalTrials.gov API для поиска клинических исследований
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
 * ClinicalTrials.gov API Response
 */
interface CTGovStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
      organization?: {
        fullName: string;
      };
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: {
        date: string;
      };
      primaryCompletionDateStruct?: {
        date: string;
      };
      completionDateStruct?: {
        date: string;
      };
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions: string[];
      keywords?: string[];
    };
    designModule?: {
      studyType: string;
      phases?: string[];
      designInfo?: {
        allocation?: string;
        interventionModel?: string;
        primaryPurpose?: string;
        maskingInfo?: {
          masking?: string;
        };
      };
      enrollmentInfo?: {
        count: number;
        type: string;
      };
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type: string;
        name: string;
        description?: string;
      }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name: string;
        class: string;
      };
      collaborators?: Array<{
        name: string;
        class: string;
      }>;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility: string;
        city: string;
        country: string;
      }>;
    };
  };
}

interface CTGovSearchResponse {
  studies: CTGovStudy[];
  totalCount: number;
  nextPageToken?: string;
}

/**
 * ClinicalTrials.gov Source Implementation
 */
export class ClinicalTrialsSource extends BaseResearchSource {
  readonly name = ResearchSource.CLINICAL_TRIALS;
  readonly displayName = 'ClinicalTrials.gov';
  readonly description = 'US National Library of Medicine clinical trials registry';
  readonly baseUrl = 'https://clinicaltrials.gov/api/v2';

  /**
   * Проверить доступность API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/stats/size`,
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
    const searchParams = this.buildSearchParams(query);
    const studies = await this.fetchStudies(searchParams, query.maxResultsPerSource || 20);

    return studies.map(study => this.mapToResearchResult(study, query));
  }

  /**
   * Получить последние исследования
   */
  async getRecent(limit: number, daysBack: number): Promise<IResearchResult[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const query: IResearchQuery = {
      topic: 'insomnia',
      sources: [ResearchSource.CLINICAL_TRIALS],
      dateRange: {
        from: fromDate,
        to: new Date(),
      },
      keywords: ['insomnia', 'sleep disorder', 'CBT-I'],
      maxResultsPerSource: limit,
    };

    return this.search(query);
  }

  /**
   * Получить исследование по NCT ID
   */
  async getById(id: string): Promise<IResearchResult | null> {
    const nctId = id.replace('ct:', '');

    try {
      const response = await this.safeFetch(
        `${this.baseUrl}/studies/${nctId}`
      );

      if (!response.ok) {
        return null;
      }

      const study: CTGovStudy = await response.json();
      return this.mapToResearchResult(study, {
        topic: '',
        sources: [ResearchSource.CLINICAL_TRIALS],
        dateRange: { from: new Date(0), to: new Date() },
        keywords: [],
      });
    } catch {
      return null;
    }
  }

  /**
   * Поиск с возвратом IClinicalTrial
   */
  async searchTrials(query: IResearchQuery): Promise<IClinicalTrial[]> {
    const searchParams = this.buildSearchParams(query);
    const studies = await this.fetchStudies(searchParams, query.maxResultsPerSource || 20);

    return studies.map(study => this.mapToClinicalTrial(study, query));
  }

  /**
   * Построить параметры поиска
   */
  private buildSearchParams(query: IResearchQuery): URLSearchParams {
    const params = new URLSearchParams();

    // Простой поиск по условию - insomnia
    params.append('query.cond', 'insomnia');

    // Добавляем ключевое слово для поиска если есть
    if (query.keywords.length > 0) {
      // Берём только первые 3 ключевых слова, чтобы не переусложнять запрос
      const terms = query.keywords.slice(0, 3).join(' ');
      params.append('query.term', terms);
    }

    // Формат ответа
    params.append('format', 'json');

    return params;
  }

  /**
   * Форматировать дату для CT.gov API
   */
  private formatDateForCT(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Получить исследования
   */
  private async fetchStudies(params: URLSearchParams, limit: number): Promise<CTGovStudy[]> {
    params.append('pageSize', String(Math.min(limit, 100)));

    const response = await this.safeFetch(
      `${this.baseUrl}/studies?${params}`
    );

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov search failed: ${response.status}`);
    }

    const data: CTGovSearchResponse = await response.json();
    return data.studies || [];
  }

  /**
   * Преобразовать в IResearchResult
   */
  private mapToResearchResult(
    study: CTGovStudy,
    query: IResearchQuery
  ): IResearchResult {
    const protocol = study.protocolSection;
    const nctId = protocol.identificationModule.nctId;

    const title = protocol.identificationModule.officialTitle ||
                  protocol.identificationModule.briefTitle;

    const summary = protocol.descriptionModule?.briefSummary || '';

    const publishedAt = this.parseDate(
      protocol.statusModule.startDateStruct?.date || ''
    );

    const interventions = protocol.armsInterventionsModule?.interventions || [];
    const interventionNames = interventions.map(i => i.name).join(', ');

    const relevanceScore = this.calculateRelevance(study, query);
    const breakthroughScore = this.calculateBreakthroughScore(study);
    const categories = this.detectCategories(study);

    const base = this.createBaseResult(
      `ct:${nctId}`,
      title,
      summary,
      `https://clinicaltrials.gov/study/${nctId}`,
      publishedAt
    );

    return {
      ...base,
      authors: [],
      organizations: protocol.sponsorCollaboratorsModule?.leadSponsor
        ? [protocol.sponsorCollaboratorsModule.leadSponsor.name]
        : [],
      relevanceScore,
      breakthroughScore,
      categories,
      tags: this.extractTags(study),
      relatedSleepCoreComponents: this.detectSleepCoreComponents(study),
      confidenceLevel: ConfidenceLevel.MEDIUM,
      metadata: {
        nctId,
        status: protocol.statusModule.overallStatus,
        phase: protocol.designModule?.phases?.join(', ') || 'N/A',
        studyType: protocol.designModule?.studyType,
        enrollment: protocol.designModule?.enrollmentInfo?.count,
        interventions: interventionNames,
        sponsor: protocol.sponsorCollaboratorsModule?.leadSponsor?.name,
        primaryOutcome: protocol.outcomesModule?.primaryOutcomes?.[0]?.measure,
        locations: protocol.contactsLocationsModule?.locations?.map(
          l => `${l.city}, ${l.country}`
        ),
      },
    };
  }

  /**
   * Преобразовать в IClinicalTrial
   */
  private mapToClinicalTrial(
    study: CTGovStudy,
    query: IResearchQuery
  ): IClinicalTrial {
    const protocol = study.protocolSection;
    const nctId = protocol.identificationModule.nctId;

    const interventions = protocol.armsInterventionsModule?.interventions || [];
    const interventionNames = interventions.map(i => i.name).join(', ');

    const statusMap: Record<string, IClinicalTrial['status']> = {
      'RECRUITING': 'recruiting',
      'ACTIVE_NOT_RECRUITING': 'active',
      'COMPLETED': 'completed',
      'TERMINATED': 'terminated',
      'SUSPENDED': 'terminated',
      'WITHDRAWN': 'terminated',
    };

    return {
      nctId,
      title: protocol.identificationModule.officialTitle ||
             protocol.identificationModule.briefTitle,
      status: statusMap[protocol.statusModule.overallStatus] || 'unknown',
      phase: protocol.designModule?.phases?.join(', '),
      intervention: interventionNames || 'Unknown',
      sampleSize: protocol.designModule?.enrollmentInfo?.count,
      primaryOutcome: protocol.outcomesModule?.primaryOutcomes?.[0]?.measure,
      sponsor: protocol.sponsorCollaboratorsModule?.leadSponsor?.name,
      locations: protocol.contactsLocationsModule?.locations?.map(
        l => `${l.city}, ${l.country}`
      ),
      startDate: this.parseDate(protocol.statusModule.startDateStruct?.date || ''),
      expectedCompletionDate: this.parseDate(
        protocol.statusModule.primaryCompletionDateStruct?.date ||
        protocol.statusModule.completionDateStruct?.date || ''
      ),
      url: `https://clinicaltrials.gov/study/${nctId}`,
      relevanceScore: this.calculateRelevance(study, query),
    };
  }

  /**
   * Вычислить релевантность
   */
  private calculateRelevance(study: CTGovStudy, query: IResearchQuery): number {
    let score = 0;
    const protocol = study.protocolSection;

    const text = [
      protocol.identificationModule.briefTitle,
      protocol.identificationModule.officialTitle,
      protocol.descriptionModule?.briefSummary,
      protocol.descriptionModule?.detailedDescription,
      ...(protocol.conditionsModule?.conditions || []),
      ...(protocol.conditionsModule?.keywords || []),
    ].join(' ').toLowerCase();

    // Ключевые слова SleepCore
    const sleepCoreKeywords = [
      { term: 'cbt-i', weight: 20 },
      { term: 'cognitive behavioral therapy', weight: 18 },
      { term: 'sleep restriction', weight: 15 },
      { term: 'digital', weight: 12 },
      { term: 'app', weight: 10 },
      { term: 'mobile', weight: 10 },
      { term: 'internet', weight: 10 },
      { term: 'mindfulness', weight: 12 },
      { term: 'acceptance', weight: 12 },
      { term: 'metacognitive', weight: 15 },
      { term: 'personalized', weight: 12 },
      { term: 'adaptive', weight: 12 },
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

    // Тип исследования (RCT = высокая релевантность)
    const allocation = protocol.designModule?.designInfo?.allocation?.toLowerCase();
    if (allocation?.includes('randomized')) {
      score += 15;
    }

    // Размер выборки
    const enrollment = protocol.designModule?.enrollmentInfo?.count || 0;
    if (enrollment >= 100) score += 10;
    if (enrollment >= 500) score += 10;

    // Фаза
    const phases = protocol.designModule?.phases || [];
    if (phases.some(p => p.includes('3') || p.includes('4'))) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Оценить прорывность
   */
  private calculateBreakthroughScore(study: CTGovStudy): number {
    let score = 0;
    const protocol = study.protocolSection;

    const text = [
      protocol.identificationModule.briefTitle,
      protocol.descriptionModule?.briefSummary,
    ].join(' ').toLowerCase();

    // Индикаторы инноваций
    const innovationIndicators = [
      { term: 'novel', weight: 12 },
      { term: 'first', weight: 10 },
      { term: 'new', weight: 8 },
      { term: 'innovative', weight: 12 },
      { term: 'digital twin', weight: 20 },
      { term: 'machine learning', weight: 15 },
      { term: 'ai ', weight: 15 },
      { term: 'artificial intelligence', weight: 15 },
      { term: 'personalized', weight: 12 },
      { term: 'adaptive', weight: 12 },
      { term: 'precision', weight: 10 },
    ];

    for (const { term, weight } of innovationIndicators) {
      if (text.includes(term)) {
        score += weight;
      }
    }

    // Интервенции
    const interventions = protocol.armsInterventionsModule?.interventions || [];
    for (const intervention of interventions) {
      const intText = `${intervention.name} ${intervention.description || ''}`.toLowerCase();
      if (intText.includes('app') || intText.includes('digital')) score += 10;
      if (intText.includes('wearable') || intText.includes('sensor')) score += 12;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Определить категории
   */
  private detectCategories(study: CTGovStudy): ResearchCategory[] {
    const categories: ResearchCategory[] = [];
    const protocol = study.protocolSection;

    const text = [
      protocol.identificationModule.briefTitle,
      protocol.descriptionModule?.briefSummary,
      ...(protocol.conditionsModule?.keywords || []),
    ].join(' ').toLowerCase();

    const interventions = protocol.armsInterventionsModule?.interventions || [];
    const interventionText = interventions
      .map(i => `${i.type} ${i.name} ${i.description || ''}`)
      .join(' ')
      .toLowerCase();

    const fullText = `${text} ${interventionText}`;

    if (fullText.includes('cbt') || fullText.includes('cognitive behavioral')) {
      categories.push(ResearchCategory.CBT_I);
    }
    if (fullText.includes('mindfulness') || fullText.includes('acceptance') || fullText.includes('metacognitive')) {
      categories.push(ResearchCategory.THIRD_WAVE);
    }
    if (fullText.includes('drug') || fullText.includes('pharmacological')) {
      categories.push(ResearchCategory.PHARMACOLOGICAL);
    }
    if (fullText.includes('device') || fullText.includes('neurostimulation')) {
      categories.push(ResearchCategory.DEVICE_BASED);
    }
    if (fullText.includes('machine learning') || fullText.includes('artificial intelligence')) {
      categories.push(ResearchCategory.AI_ML);
    }
    if (fullText.includes('wearable') || fullText.includes('actigraphy')) {
      categories.push(ResearchCategory.WEARABLES);
    }
    if (fullText.includes('biomarker') || fullText.includes('hrv')) {
      categories.push(ResearchCategory.BIOMARKERS);
    }

    return categories;
  }

  /**
   * Извлечь теги
   */
  private extractTags(study: CTGovStudy): string[] {
    const tags: string[] = [];
    const protocol = study.protocolSection;

    // Статус
    tags.push(protocol.statusModule.overallStatus.toLowerCase().replace(/_/g, '-'));

    // Фазы
    const phases = protocol.designModule?.phases || [];
    tags.push(...phases.map(p => p.toLowerCase()));

    // Тип исследования
    if (protocol.designModule?.studyType) {
      tags.push(protocol.designModule.studyType.toLowerCase());
    }

    // Ослепление
    const masking = protocol.designModule?.designInfo?.maskingInfo?.masking;
    if (masking) {
      tags.push(masking.toLowerCase());
    }

    return tags;
  }

  /**
   * Определить связь с компонентами SleepCore
   */
  private detectSleepCoreComponents(study: CTGovStudy): string[] {
    const components: string[] = [];
    const protocol = study.protocolSection;

    const text = [
      protocol.identificationModule.briefTitle,
      protocol.descriptionModule?.briefSummary,
    ].join(' ').toLowerCase();

    const interventions = protocol.armsInterventionsModule?.interventions || [];
    const interventionText = interventions
      .map(i => `${i.name} ${i.description || ''}`)
      .join(' ')
      .toLowerCase();

    const fullText = `${text} ${interventionText}`;

    if (fullText.includes('sleep restriction')) components.push('SleepRestrictionEngine');
    if (fullText.includes('stimulus control')) components.push('StimulusControlEngine');
    if (fullText.includes('cognitive')) components.push('CognitiveRestructuringEngine');
    if (fullText.includes('relaxation')) components.push('RelaxationEngine');
    if (fullText.includes('mindfulness')) components.push('MBTIEngine');
    if (fullText.includes('acceptance')) components.push('ACTIEngine');
    if (fullText.includes('metacognitive')) components.push('MCTEngine');
    if (fullText.includes('digital') || fullText.includes('app')) components.push('DigitalTwinService');

    return components;
  }

  /**
   * Парсинг даты
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Форматы: "2024-01-15", "January 2024", "2024"
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(dateStr);
    }

    const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
    if (monthYearMatch) {
      return new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
    }

    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1], 10), 0, 1);
    }

    return new Date();
  }
}
