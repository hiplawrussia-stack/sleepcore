/**
 * @fileoverview Regional Research Sources Configuration
 * @module research/sources/RegionalSourcesConfig
 * @description Конфигурация региональных источников исследований
 *
 * Охват по регионам:
 * - США/Европа: PubMed, ClinicalTrials.gov, arXiv
 * - Китай: CNKI, Wanfang, ChinaXiv
 * - Япония: J-STAGE, CiNii
 * - Германия: DiGA Directory, DIMDI
 * - Россия/СНГ: eLibrary, CyberLeninka
 * - Корея: KoreaMed, RISS
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

/**
 * Региональный источник
 */
export interface RegionalSource {
  /** Идентификатор */
  id: string;

  /** Название */
  name: string;

  /** Страна/Регион */
  region: string;

  /** Язык */
  language: string;

  /** Базовый URL */
  baseUrl: string;

  /** Тип (academic, regulatory, clinical) */
  type: 'academic' | 'regulatory' | 'clinical' | 'patents' | 'news';

  /** Описание */
  description: string;

  /** Приоритет для SleepCore */
  priority: 'high' | 'medium' | 'low';

  /** Требует API ключ */
  requiresApiKey: boolean;

  /** Поисковые термины на языке региона */
  localizedKeywords: string[];
}

/**
 * Конфигурация региональных источников
 */
export const REGIONAL_SOURCES: RegionalSource[] = [
  // ============================================================================
  // США / МЕЖДУНАРОДНЫЕ (АНГЛИЙСКИЙ)
  // ============================================================================
  {
    id: 'pubmed',
    name: 'PubMed',
    region: 'International',
    language: 'en',
    baseUrl: 'https://pubmed.ncbi.nlm.nih.gov',
    type: 'academic',
    description: 'NCBI biomedical literature database',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['insomnia', 'CBT-I', 'sleep disorder', 'digital therapeutics'],
  },
  {
    id: 'clinicaltrials',
    name: 'ClinicalTrials.gov',
    region: 'International',
    language: 'en',
    baseUrl: 'https://clinicaltrials.gov',
    type: 'clinical',
    description: 'US clinical trials registry',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['insomnia treatment', 'sleep intervention', 'CBT-I trial'],
  },
  {
    id: 'fda',
    name: 'FDA',
    region: 'USA',
    language: 'en',
    baseUrl: 'https://www.fda.gov',
    type: 'regulatory',
    description: 'US FDA approvals and guidance',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['digital therapeutic', 'software as medical device', 'SaMD'],
  },

  // ============================================================================
  // ЕВРОПА
  // ============================================================================
  {
    id: 'diga',
    name: 'DiGA Directory',
    region: 'Germany',
    language: 'de',
    baseUrl: 'https://diga.bfarm.de',
    type: 'regulatory',
    description: 'German Digital Health Applications directory',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['Schlafstörung', 'Insomnie', 'digitale Gesundheitsanwendung', 'KVT-I'],
  },
  {
    id: 'euctr',
    name: 'EU Clinical Trials Register',
    region: 'Europe',
    language: 'en',
    baseUrl: 'https://www.clinicaltrialsregister.eu',
    type: 'clinical',
    description: 'European clinical trials registry',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['insomnia', 'sleep disorder', 'cognitive behavioral therapy'],
  },
  {
    id: 'nice',
    name: 'NICE',
    region: 'UK',
    language: 'en',
    baseUrl: 'https://www.nice.org.uk',
    type: 'regulatory',
    description: 'UK National Institute for Health and Care Excellence',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['insomnia guideline', 'sleep disorder', 'digital health'],
  },

  // ============================================================================
  // КИТАЙ
  // ============================================================================
  {
    id: 'cnki',
    name: 'CNKI (中国知网)',
    region: 'China',
    language: 'zh',
    baseUrl: 'https://www.cnki.net',
    type: 'academic',
    description: 'China National Knowledge Infrastructure',
    priority: 'high',
    requiresApiKey: true,
    localizedKeywords: ['失眠', '认知行为疗法', '睡眠障碍', '数字疗法', '人工智能睡眠'],
  },
  {
    id: 'wanfang',
    name: 'Wanfang (万方)',
    region: 'China',
    language: 'zh',
    baseUrl: 'https://www.wanfangdata.com',
    type: 'academic',
    description: 'Wanfang Data academic database',
    priority: 'medium',
    requiresApiKey: true,
    localizedKeywords: ['失眠治疗', '睡眠医学', '数字健康'],
  },
  {
    id: 'chinaxiv',
    name: 'ChinaXiv',
    region: 'China',
    language: 'zh',
    baseUrl: 'http://www.chinaxiv.org',
    type: 'academic',
    description: 'Chinese preprint server',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['深度学习睡眠', '可穿戴设备', '生物标志物'],
  },
  {
    id: 'chictr',
    name: 'ChiCTR',
    region: 'China',
    language: 'zh',
    baseUrl: 'https://www.chictr.org.cn',
    type: 'clinical',
    description: 'Chinese Clinical Trial Registry',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['失眠临床试验', 'CBT-I'],
  },

  // ============================================================================
  // ЯПОНИЯ
  // ============================================================================
  {
    id: 'jstage',
    name: 'J-STAGE',
    region: 'Japan',
    language: 'ja',
    baseUrl: 'https://www.jstage.jst.go.jp',
    type: 'academic',
    description: 'Japan Science and Technology electronic journal platform',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['不眠症', '睡眠障害', '認知行動療法', 'デジタル治療'],
  },
  {
    id: 'cinii',
    name: 'CiNii',
    region: 'Japan',
    language: 'ja',
    baseUrl: 'https://ci.nii.ac.jp',
    type: 'academic',
    description: 'Japanese academic information database',
    priority: 'low',
    requiresApiKey: false,
    localizedKeywords: ['睡眠', '不眠', 'ウェアラブル'],
  },
  {
    id: 'jrct',
    name: 'jRCT',
    region: 'Japan',
    language: 'ja',
    baseUrl: 'https://jrct.niph.go.jp',
    type: 'clinical',
    description: 'Japan Registry of Clinical Trials',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['不眠症治療', '睡眠介入'],
  },

  // ============================================================================
  // КОРЕЯ
  // ============================================================================
  {
    id: 'koreamed',
    name: 'KoreaMed',
    region: 'South Korea',
    language: 'ko',
    baseUrl: 'https://koreamed.org',
    type: 'academic',
    description: 'Korean medical literature database',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['불면증', '수면장애', '인지행동치료', '디지털치료제'],
  },
  {
    id: 'riss',
    name: 'RISS',
    region: 'South Korea',
    language: 'ko',
    baseUrl: 'http://www.riss.kr',
    type: 'academic',
    description: 'Research Information Sharing Service',
    priority: 'low',
    requiresApiKey: false,
    localizedKeywords: ['수면', '불면', '웨어러블'],
  },
  {
    id: 'cris',
    name: 'CRIS',
    region: 'South Korea',
    language: 'ko',
    baseUrl: 'https://cris.nih.go.kr',
    type: 'clinical',
    description: 'Clinical Research Information Service Korea',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['불면증 임상시험'],
  },

  // ============================================================================
  // РОССИЯ / СНГ
  // ============================================================================
  {
    id: 'elibrary',
    name: 'eLibrary.ru',
    region: 'Russia',
    language: 'ru',
    baseUrl: 'https://elibrary.ru',
    type: 'academic',
    description: 'Russian scientific electronic library',
    priority: 'high',
    requiresApiKey: true,
    localizedKeywords: ['бессонница', 'инсомния', 'когнитивно-поведенческая терапия', 'нарушения сна', 'цифровая терапия'],
  },
  {
    id: 'cyberleninka',
    name: 'КиберЛенинка',
    region: 'Russia',
    language: 'ru',
    baseUrl: 'https://cyberleninka.ru',
    type: 'academic',
    description: 'Open science library (free access)',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['бессонница', 'расстройства сна', 'КПТ-И', 'мобильное здоровье'],
  },
  {
    id: 'roszdravnadzor',
    name: 'Росздравнадзор',
    region: 'Russia',
    language: 'ru',
    baseUrl: 'https://roszdravnadzor.gov.ru',
    type: 'regulatory',
    description: 'Russian healthcare regulatory agency',
    priority: 'high',
    requiresApiKey: false,
    localizedKeywords: ['медицинское изделие', 'программное обеспечение', 'регистрация'],
  },
  {
    id: 'grls',
    name: 'ГРЛС',
    region: 'Russia',
    language: 'ru',
    baseUrl: 'https://grls.rosminzdrav.ru',
    type: 'regulatory',
    description: 'State Register of Medicines',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['снотворные', 'седативные'],
  },

  // ============================================================================
  // ИНДИЯ
  // ============================================================================
  {
    id: 'ctri',
    name: 'CTRI',
    region: 'India',
    language: 'en',
    baseUrl: 'http://ctri.nic.in',
    type: 'clinical',
    description: 'Clinical Trials Registry - India',
    priority: 'low',
    requiresApiKey: false,
    localizedKeywords: ['insomnia', 'sleep disorder', 'yoga sleep'],
  },

  // ============================================================================
  // АВСТРАЛИЯ
  // ============================================================================
  {
    id: 'anzctr',
    name: 'ANZCTR',
    region: 'Australia/NZ',
    language: 'en',
    baseUrl: 'https://www.anzctr.org.au',
    type: 'clinical',
    description: 'Australian New Zealand Clinical Trials Registry',
    priority: 'low',
    requiresApiKey: false,
    localizedKeywords: ['insomnia', 'sleep', 'CBT-I'],
  },

  // ============================================================================
  // ИЗРАИЛЬ
  // ============================================================================
  {
    id: 'israel_moh',
    name: 'Israel MOH',
    region: 'Israel',
    language: 'he',
    baseUrl: 'https://www.health.gov.il',
    type: 'regulatory',
    description: 'Israel Ministry of Health - digital health hub',
    priority: 'medium',
    requiresApiKey: false,
    localizedKeywords: ['נדודי שינה', 'בריאות דיגיטלית'],
  },
];

/**
 * Получить источники по региону
 */
export function getSourcesByRegion(region: string): RegionalSource[] {
  return REGIONAL_SOURCES.filter(s => s.region.toLowerCase() === region.toLowerCase());
}

/**
 * Получить источники по типу
 */
export function getSourcesByType(type: RegionalSource['type']): RegionalSource[] {
  return REGIONAL_SOURCES.filter(s => s.type === type);
}

/**
 * Получить высокоприоритетные источники
 */
export function getHighPrioritySourcesForRegion(region: string): RegionalSource[] {
  return REGIONAL_SOURCES.filter(
    s => (s.region.toLowerCase() === region.toLowerCase() || s.region === 'International') &&
         s.priority === 'high'
  );
}

/**
 * Получить ключевые слова для языка
 */
export function getKeywordsForLanguage(language: string): string[] {
  const sources = REGIONAL_SOURCES.filter(s => s.language === language);
  const keywords = new Set<string>();

  for (const source of sources) {
    for (const kw of source.localizedKeywords) {
      keywords.add(kw);
    }
  }

  return [...keywords];
}

/**
 * Поддерживаемые регионы
 */
export const SUPPORTED_REGIONS = [
  { code: 'us', name: 'United States', languages: ['en'] },
  { code: 'eu', name: 'Europe', languages: ['en', 'de', 'fr'] },
  { code: 'uk', name: 'United Kingdom', languages: ['en'] },
  { code: 'de', name: 'Germany', languages: ['de', 'en'] },
  { code: 'cn', name: 'China', languages: ['zh', 'en'] },
  { code: 'jp', name: 'Japan', languages: ['ja', 'en'] },
  { code: 'kr', name: 'South Korea', languages: ['ko', 'en'] },
  { code: 'ru', name: 'Russia', languages: ['ru', 'en'] },
  { code: 'in', name: 'India', languages: ['en', 'hi'] },
  { code: 'au', name: 'Australia', languages: ['en'] },
  { code: 'il', name: 'Israel', languages: ['he', 'en'] },
];

/**
 * SleepCore-специфичные ключевые слова по языкам
 */
export const SLEEPCORE_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: [
    'insomnia', 'CBT-I', 'cognitive behavioral therapy insomnia',
    'sleep restriction', 'stimulus control', 'digital therapeutics',
    'sleep disorder', 'sleep efficiency', 'sleep diary',
    'mindfulness sleep', 'ACT insomnia', 'metacognitive therapy',
    'digital twin health', 'machine learning sleep', 'wearable sleep',
  ],
  de: [
    'Insomnie', 'Schlafstörung', 'KVT-I',
    'kognitive Verhaltenstherapie', 'Schlafrestriktion',
    'digitale Gesundheitsanwendung', 'DiGA', 'Schlaftagebuch',
  ],
  zh: [
    '失眠', '认知行为疗法', '睡眠障碍', '数字疗法',
    '睡眠限制', '刺激控制', '深度学习', '可穿戴设备',
    '睡眠日记', '正念睡眠', '人工智能医疗',
  ],
  ja: [
    '不眠症', '睡眠障害', '認知行動療法', 'CBT-I',
    '睡眠制限療法', 'デジタル治療', '睡眠日誌',
    'ウェアラブル', '機械学習', 'マインドフルネス',
  ],
  ko: [
    '불면증', '수면장애', '인지행동치료', '디지털치료제',
    '수면제한요법', '자극조절', '수면일기',
    '웨어러블', '머신러닝', '마음챙김',
  ],
  ru: [
    'бессонница', 'инсомния', 'когнитивно-поведенческая терапия',
    'КПТ-И', 'нарушения сна', 'цифровая терапия',
    'ограничение сна', 'контроль стимулов', 'дневник сна',
    'майндфулнесс', 'машинное обучение', 'носимые устройства',
  ],
};
