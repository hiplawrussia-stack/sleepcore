/**
 * @fileoverview Research Agent Types
 * @module research/types
 * @description Типы для AI агента исследований инсомнии
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ResearchSource {
  // Scientific Publications
  PUBMED = 'pubmed',
  ARXIV = 'arxiv',
  MEDRXIV = 'medrxiv',
  BIORXIV = 'biorxiv',

  // Aggregators (NEW 2025-2026)
  SEMANTIC_SCHOLAR = 'semantic_scholar',  // 200M+ papers, citations, AI TLDR
  OPENALEX = 'openalex',                  // 250M+ works, fully open

  // Clinical Trials
  CLINICAL_TRIALS = 'clinical_trials',
  ICTRP = 'ictrp',              // WHO International
  EUCTR = 'euctr',              // Europe
  JRCT = 'jrct',                // Japan
  CHICTR = 'chictr',            // China
  CRIS = 'cris',                // Korea

  // Regulatory
  FDA = 'fda',
  DIGA = 'diga',
  CE_MARK = 'ce_mark',

  // Intelligence
  COMPETITORS = 'competitors',
  NEWS = 'news',
  PATENTS = 'patents',
  GITHUB = 'github',

  // Regional Academic
  CNKI = 'cnki',                // China
  ELIBRARY = 'elibrary',        // Russia
  JSTAGE = 'jstage',            // Japan
  KOREAMED = 'koreamed',        // Korea
}

export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNKNOWN = 'unknown',
}

export enum ResearchCategory {
  // Методы лечения
  CBT_I = 'cbt_i',
  THIRD_WAVE = 'third_wave',
  PHARMACOLOGICAL = 'pharmacological',
  DEVICE_BASED = 'device_based',

  // Технологии
  AI_ML = 'ai_ml',
  DIGITAL_TWIN = 'digital_twin',
  WEARABLES = 'wearables',
  BIOMARKERS = 'biomarkers',

  // Бизнес
  COMPETITORS = 'competitors',
  MARKET = 'market',
  REGULATORY = 'regulatory',
  FUNDING = 'funding',

  // Наука
  NEUROSCIENCE = 'neuroscience',
  CHRONOBIOLOGY = 'chronobiology',
  GENETICS = 'genetics',
  MICROBIOME = 'microbiome',
}

// ============================================================================
// INTERFACES - QUERIES
// ============================================================================

export interface IResearchQuery {
  /** Основная тема исследования */
  topic: string;

  /** Источники для поиска */
  sources: ResearchSource[];

  /** Период поиска */
  dateRange: {
    from: Date;
    to: Date;
  };

  /** Ключевые слова (AND логика) */
  keywords: string[];

  /** Исключить ключевые слова */
  excludeKeywords?: string[];

  /** Категории для фильтрации */
  categories?: ResearchCategory[];

  /** Максимум результатов на источник */
  maxResultsPerSource?: number;

  /** Минимальный relevance score */
  minRelevanceScore?: number;

  /** Язык (default: en, ru) */
  languages?: string[];
}

export interface ICompetitorQuery {
  /** Список конкурентов для мониторинга */
  competitors: string[];

  /** Что отслеживать */
  track: {
    products: boolean;
    funding: boolean;
    partnerships: boolean;
    regulatory: boolean;
    publications: boolean;
  };
}

// ============================================================================
// INTERFACES - RESULTS
// ============================================================================

export interface IResearchResult {
  /** Уникальный ID */
  id: string;

  /** Источник */
  source: ResearchSource;

  /** Заголовок */
  title: string;

  /** Краткое содержание */
  summary: string;

  /** Полный текст (если доступен) */
  fullText?: string;

  /** URL источника */
  url: string;

  /** Дата публикации */
  publishedAt: Date;

  /** Дата обнаружения агентом */
  discoveredAt: Date;

  /** Авторы */
  authors?: string[];

  /** Организации */
  organizations?: string[];

  /** Релевантность для SleepCore (0-100) */
  relevanceScore: number;

  /** Насколько прорывное (0-100) */
  breakthroughScore: number;

  /** Уровень уверенности в оценке */
  confidenceLevel: ConfidenceLevel;

  /** Категории */
  categories: ResearchCategory[];

  /** Теги */
  tags: string[];

  /** Связь с компонентами SleepCore */
  relatedSleepCoreComponents: string[];

  /** Ключевые выводы */
  keyFindings?: string[];

  /** Рекомендации для SleepCore */
  recommendations?: string[];

  /** Метаданные источника */
  metadata?: Record<string, unknown>;
}

export interface IClinicalTrial {
  /** NCT ID */
  nctId: string;

  /** Название */
  title: string;

  /** Статус */
  status: 'recruiting' | 'active' | 'completed' | 'terminated' | 'unknown';

  /** Фаза */
  phase?: string;

  /** Интервенция */
  intervention: string;

  /** Размер выборки */
  sampleSize?: number;

  /** Primary outcome */
  primaryOutcome?: string;

  /** Спонсор */
  sponsor?: string;

  /** Локации */
  locations?: string[];

  /** Дата начала */
  startDate?: Date;

  /** Ожидаемая дата завершения */
  expectedCompletionDate?: Date;

  /** URL */
  url: string;

  /** Релевантность */
  relevanceScore: number;
}

export interface ICompetitorUpdate {
  /** Название компании */
  company: string;

  /** Продукт */
  product?: string;

  /** Тип обновления */
  updateType: 'product' | 'funding' | 'partnership' | 'regulatory' | 'publication' | 'other';

  /** Описание */
  description: string;

  /** Дата */
  date: Date;

  /** Источник */
  sourceUrl: string;

  /** Влияние на SleepCore */
  impactAssessment?: string;

  /** Рекомендуемые действия */
  recommendedActions?: string[];
}

export interface IPatent {
  /** Patent ID */
  patentId: string;

  /** Название */
  title: string;

  /** Абстракт */
  abstract: string;

  /** Заявитель */
  assignee: string;

  /** Изобретатели */
  inventors: string[];

  /** Дата подачи */
  filingDate: Date;

  /** Дата публикации */
  publicationDate?: Date;

  /** Статус */
  status: 'pending' | 'granted' | 'expired';

  /** Страна */
  country: string;

  /** URL */
  url: string;

  /** Релевантность */
  relevanceScore: number;

  /** Категории */
  categories: ResearchCategory[];
}

// ============================================================================
// INTERFACES - ANALYSIS
// ============================================================================

export interface ITrend {
  /** Название тренда */
  name: string;

  /** Описание */
  description: string;

  /** Категория */
  category: ResearchCategory;

  /** Сила тренда (растущий, стабильный, угасающий) */
  strength: 'rising' | 'stable' | 'declining';

  /** Уровень зрелости */
  maturity: 'emerging' | 'growing' | 'mature' | 'declining';

  /** Количество упоминаний */
  mentionCount: number;

  /** Ключевые игроки */
  keyPlayers: string[];

  /** Релевантность для SleepCore */
  sleepCoreRelevance: string;

  /** Рекомендации */
  recommendations: string[];

  /** Подтверждающие источники */
  sources: string[];
}

export interface IBreakthrough {
  /** Название */
  title: string;

  /** Описание */
  description: string;

  /** Почему это прорыв */
  whyBreakthrough: string;

  /** Категория */
  category: ResearchCategory;

  /** Оценка влияния (1-10) */
  impactScore: number;

  /** Временной горизонт применения */
  timeToAdoption: 'immediate' | '1-2 years' | '3-5 years' | '5+ years';

  /** Применимость к SleepCore */
  sleepCoreApplicability: string;

  /** Конкретные рекомендации */
  actionItems: string[];

  /** Источники */
  sources: IResearchResult[];

  /** Уровень уверенности */
  confidenceLevel: ConfidenceLevel;
}

export interface IRecommendation {
  /** ID */
  id: string;

  /** Заголовок */
  title: string;

  /** Описание */
  description: string;

  /** Приоритет */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Категория */
  category: ResearchCategory;

  /** На основе каких данных */
  basedOn: string[];

  /** Конкретные действия */
  actionItems: string[];

  /** Ожидаемый эффект */
  expectedImpact: string;

  /** Сложность реализации */
  implementationComplexity: 'low' | 'medium' | 'high';

  /** Связанные компоненты SleepCore */
  relatedComponents: string[];
}

// ============================================================================
// INTERFACES - REPORTS
// ============================================================================

export interface IResearchReport {
  /** ID отчёта */
  id: string;

  /** Дата генерации */
  generatedAt: Date;

  /** Период */
  period: {
    from: Date;
    to: Date;
  };

  /** Тип отчёта */
  type: 'daily' | 'weekly' | 'monthly' | 'custom';

  /** Executive Summary */
  executiveSummary: string;

  /** Ключевые прорывы */
  breakthroughs: IBreakthrough[];

  /** Обновления конкурентов */
  competitorUpdates: ICompetitorUpdate[];

  /** Новые клинические исследования */
  clinicalTrials: IClinicalTrial[];

  /** Новые патенты */
  patents: IPatent[];

  /** Тренды */
  trends: ITrend[];

  /** Рекомендации */
  recommendations: IRecommendation[];

  /** Все найденные результаты */
  allResults: IResearchResult[];

  /** Статистика */
  statistics: {
    totalResultsFound: number;
    resultsBySource: Record<ResearchSource, number>;
    resultsByCategory: Record<ResearchCategory, number>;
    averageRelevanceScore: number;
    breakthroughsDetected: number;
  };
}

export interface IDigestItem {
  /** Заголовок */
  title: string;

  /** Краткое описание */
  summary: string;

  /** Категория */
  category: ResearchCategory;

  /** Важность */
  importance: 'breaking' | 'important' | 'notable' | 'fyi';

  /** URL */
  url?: string;

  /** Действие для SleepCore */
  actionRequired?: string;
}

export interface IWeeklyDigest {
  /** Период */
  weekOf: Date;

  /** Главная новость недели */
  topStory?: IDigestItem;

  /** Ключевые пункты (3-5) */
  highlights: IDigestItem[];

  /** По категориям */
  byCategory: Record<ResearchCategory, IDigestItem[]>;

  /** Что это значит для SleepCore */
  sleepCoreImplications: string;

  /** Рекомендуемые действия на неделю */
  weeklyActionItems: string[];
}

// ============================================================================
// INTERFACES - STORAGE
// ============================================================================

export interface IStoredResearch {
  /** Результат исследования */
  result: IResearchResult;

  /** Когда сохранено */
  storedAt: Date;

  /** Прочитано */
  isRead: boolean;

  /** Отмечено как важное */
  isStarred: boolean;

  /** Заметки */
  notes?: string;

  /** Статус обработки */
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
}

// ============================================================================
// INTERFACES - AGENT CONFIG
// ============================================================================

export interface IResearchAgentConfig {
  /** Включённые источники */
  enabledSources: ResearchSource[];

  /** Автоматический запуск */
  autoRun: {
    enabled: boolean;
    schedule: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:MM
  };

  /** Ключевые слова для мониторинга */
  monitorKeywords: string[];

  /** Конкуренты для отслеживания */
  competitors: string[];

  /** Минимальный relevance score для включения */
  minRelevanceScore: number;

  /** Минимальный breakthrough score для алерта */
  breakthroughAlertThreshold: number;

  /** Уведомления */
  notifications: {
    onBreakthrough: boolean;
    onCompetitorUpdate: boolean;
    onDigest: boolean;
    channels: ('telegram' | 'email' | 'webhook')[];
  };

  /** Лимиты */
  limits: {
    maxResultsPerQuery: number;
    maxStoredResults: number;
    retentionDays: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_RESEARCH_CONFIG: IResearchAgentConfig = {
  enabledSources: [
    ResearchSource.PUBMED,
    ResearchSource.SEMANTIC_SCHOLAR,  // NEW: 200M+ papers with AI summaries
    ResearchSource.OPENALEX,          // NEW: 250M+ works, fully open
    ResearchSource.CLINICAL_TRIALS,
    ResearchSource.ARXIV,
    ResearchSource.COMPETITORS,
  ],

  autoRun: {
    enabled: true,
    schedule: 'weekly',
    dayOfWeek: 1, // Monday
    time: '09:00',
  },

  monitorKeywords: [
    // CBT-I
    'CBT-I', 'cognitive behavioral therapy insomnia',
    'sleep restriction therapy', 'stimulus control',

    // Digital Therapeutics
    'digital therapeutics insomnia', 'DTx sleep',
    'mobile health insomnia', 'mHealth sleep',

    // AI/ML
    'machine learning sleep', 'AI insomnia',
    'digital twin sleep', 'reinforcement learning therapy',
    'personalized sleep therapy',

    // Third-Wave
    'mindfulness insomnia', 'ACT insomnia',
    'metacognitive therapy sleep', 'MBT-I',

    // Biomarkers
    'sleep biomarkers', 'HRV sleep',
    'wearable sleep tracking', 'actigraphy',

    // Products
    'Sleepio', 'Somryst', 'SleepioRx',
  ],

  competitors: [
    'Big Health',
    'Pear Therapeutics',
    'Nox Health',
    'SleepScore Labs',
    'Calm',
    'Headspace',
    'Stellar Sleep',
  ],

  minRelevanceScore: 50,
  breakthroughAlertThreshold: 80,

  notifications: {
    onBreakthrough: true,
    onCompetitorUpdate: true,
    onDigest: true,
    channels: ['telegram'],
  },

  limits: {
    maxResultsPerQuery: 100,
    maxStoredResults: 10000,
    retentionDays: 365,
  },
};
