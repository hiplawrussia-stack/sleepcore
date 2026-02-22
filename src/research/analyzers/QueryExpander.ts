/**
 * @fileoverview Query Expansion for Research Agent
 * @module research/analyzers/QueryExpander
 * @description Расширение поисковых запросов с использованием медицинской терминологии
 *
 * Реализует паттерны Agentic RAG 2025:
 * - Synonym expansion (MeSH, SNOMED CT терминология)
 * - Query decomposition (разбиение сложных запросов)
 * - Context-aware reformulation
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { IResearchQuery, ResearchCategory } from '../types';

/**
 * Expanded query result
 */
export interface IExpandedQuery {
  /** Original query */
  original: string;

  /** Expanded terms */
  expanded: string[];

  /** MeSH terms for PubMed */
  meshTerms: string[];

  /** Semantic variants */
  semanticVariants: string[];

  /** Related concepts */
  relatedConcepts: string[];

  /** Suggested filters */
  suggestedFilters: {
    categories?: ResearchCategory[];
    publicationTypes?: string[];
    dateRange?: { from: Date; to: Date };
  };
}

/**
 * Medical terminology mappings
 */
const MEDICAL_SYNONYMS: Record<string, string[]> = {
  // Sleep disorders
  'insomnia': [
    'sleep initiation disorder',
    'sleep maintenance disorder',
    'sleeplessness',
    'sleep disturbance',
    'sleep onset latency',
    'wakefulness after sleep onset',
  ],
  'cbt-i': [
    'cognitive behavioral therapy for insomnia',
    'CBT insomnia',
    'behavioral sleep medicine',
    'non-pharmacological insomnia treatment',
  ],
  'sleep restriction': [
    'sleep restriction therapy',
    'SRT',
    'time in bed restriction',
    'sleep compression',
    'bedtime restriction',
  ],
  'stimulus control': [
    'stimulus control therapy',
    'stimulus control instructions',
    'sleep hygiene education',
    'bed-sleep association',
  ],

  // Third-wave therapies
  'mindfulness': [
    'mindfulness-based therapy',
    'MBSR',
    'mindfulness-based stress reduction',
    'mindfulness meditation',
    'MBT-I',
    'mindfulness-based therapy for insomnia',
  ],
  'acceptance': [
    'acceptance and commitment therapy',
    'ACT',
    'ACT-I',
    'psychological flexibility',
  ],
  'metacognitive': [
    'metacognitive therapy',
    'MCT',
    'worry postponement',
    'attention training',
    'detached mindfulness',
  ],

  // Digital health
  'digital therapeutics': [
    'DTx',
    'digital therapy',
    'mobile health',
    'mHealth',
    'eHealth',
    'internet-delivered therapy',
    'app-based therapy',
    'computerized therapy',
  ],
  'digital twin': [
    'computational model',
    'personalized simulation',
    'patient simulation',
    'virtual patient',
    'in silico model',
  ],

  // AI/ML
  'machine learning': [
    'ML',
    'artificial intelligence',
    'AI',
    'deep learning',
    'neural network',
    'predictive model',
    'reinforcement learning',
  ],
  'wearable': [
    'wearable device',
    'fitness tracker',
    'smartwatch',
    'actigraphy',
    'accelerometer',
    'sleep tracker',
  ],

  // Outcomes
  'sleep quality': [
    'sleep efficiency',
    'sleep architecture',
    'sleep stages',
    'restorative sleep',
    'subjective sleep quality',
    'PSQI',
    'Pittsburgh Sleep Quality Index',
  ],
  'sleep efficiency': [
    'SE',
    'time asleep ratio',
    'sleep percentage',
  ],
};

/**
 * MeSH term mappings for PubMed
 */
const MESH_MAPPINGS: Record<string, string[]> = {
  'insomnia': [
    '"Sleep Initiation and Maintenance Disorders"[MeSH]',
    '"Insomnia"[MeSH]',
  ],
  'cbt-i': [
    '"Cognitive Behavioral Therapy"[MeSH]',
    '"Behavior Therapy"[MeSH]',
  ],
  'sleep': [
    '"Sleep"[MeSH]',
    '"Sleep Stages"[MeSH]',
    '"Sleep Quality"[MeSH]',
  ],
  'digital therapeutics': [
    '"Telemedicine"[MeSH]',
    '"Mobile Applications"[MeSH]',
    '"Therapy, Computer-Assisted"[MeSH]',
  ],
  'machine learning': [
    '"Machine Learning"[MeSH]',
    '"Artificial Intelligence"[MeSH]',
    '"Deep Learning"[MeSH]',
  ],
  'mindfulness': [
    '"Mindfulness"[MeSH]',
    '"Meditation"[MeSH]',
  ],
  'wearable': [
    '"Wearable Electronic Devices"[MeSH]',
    '"Actigraphy"[MeSH]',
    '"Fitness Trackers"[MeSH]',
  ],
};

/**
 * Related concepts for semantic expansion
 */
const RELATED_CONCEPTS: Record<string, string[]> = {
  'insomnia': ['circadian rhythm', 'sleep hygiene', 'hyperarousal', 'sleep onset', 'awakening'],
  'cbt-i': ['behavioral intervention', 'psychological treatment', 'sleep therapy', 'non-drug therapy'],
  'digital therapeutics': ['prescription digital', 'FDA cleared', 'CE marked', 'evidence-based app'],
  'machine learning': ['prediction model', 'classification', 'personalization', 'adaptive algorithm'],
};

/**
 * Query Expander for research searches
 */
export class QueryExpander {
  /**
   * Expand a research query
   */
  expand(query: IResearchQuery): IExpandedQuery {
    const originalTerms = this.extractTerms(query);
    const expanded: string[] = [];
    const meshTerms: string[] = [];
    const semanticVariants: string[] = [];
    const relatedConcepts: string[] = [];

    for (const term of originalTerms) {
      const termLower = term.toLowerCase();

      // Add synonyms
      const synonyms = MEDICAL_SYNONYMS[termLower];
      if (synonyms) {
        expanded.push(...synonyms.slice(0, 3)); // Limit to avoid query explosion
      }

      // Add MeSH terms
      const mesh = MESH_MAPPINGS[termLower];
      if (mesh) {
        meshTerms.push(...mesh);
      }

      // Add related concepts
      const related = RELATED_CONCEPTS[termLower];
      if (related) {
        relatedConcepts.push(...related);
      }
    }

    // Generate semantic variants
    semanticVariants.push(...this.generateSemanticVariants(originalTerms));

    // Suggest filters based on query
    const suggestedFilters = this.suggestFilters(query, originalTerms);

    return {
      original: originalTerms.join(' '),
      expanded: [...new Set(expanded)],
      meshTerms: [...new Set(meshTerms)],
      semanticVariants: [...new Set(semanticVariants)],
      relatedConcepts: [...new Set(relatedConcepts)],
      suggestedFilters,
    };
  }

  /**
   * Build optimized search string for general sources
   */
  buildGeneralSearchString(expanded: IExpandedQuery): string {
    const terms: string[] = [expanded.original];

    // Add top expanded terms
    terms.push(...expanded.expanded.slice(0, 5));

    // Add semantic variants
    terms.push(...expanded.semanticVariants.slice(0, 3));

    return terms.join(' OR ');
  }

  /**
   * Build optimized search string for PubMed
   */
  buildPubMedSearchString(expanded: IExpandedQuery): string {
    const parts: string[] = [];

    // Original terms in Title/Abstract
    const originalSearch = expanded.original
      .split(' ')
      .filter(t => t.length > 2)
      .map(t => `"${t}"[Title/Abstract]`)
      .join(' AND ');

    if (originalSearch) {
      parts.push(`(${originalSearch})`);
    }

    // MeSH terms
    if (expanded.meshTerms.length > 0) {
      parts.push(`(${expanded.meshTerms.join(' OR ')})`);
    }

    return parts.join(' OR ');
  }

  /**
   * Decompose complex query into sub-queries
   */
  decomposeQuery(query: IResearchQuery): IResearchQuery[] {
    const subQueries: IResearchQuery[] = [];
    const topic = query.topic.toLowerCase();

    // Check for compound topics
    if (topic.includes(' and ') || topic.includes(' vs ') || topic.includes(' versus ')) {
      const parts = topic.split(/\s+(?:and|vs|versus)\s+/i);
      for (const part of parts) {
        subQueries.push({
          ...query,
          topic: part.trim(),
          keywords: [...query.keywords, part.trim()],
        });
      }
    }

    // Check for multiple aspects
    if (topic.includes('efficacy') && topic.includes('safety')) {
      subQueries.push(
        { ...query, topic: topic.replace('safety', '').trim(), keywords: [...query.keywords, 'efficacy', 'effectiveness'] },
        { ...query, topic: topic.replace('efficacy', '').trim(), keywords: [...query.keywords, 'safety', 'adverse events'] }
      );
    }

    // If no decomposition needed, return original
    if (subQueries.length === 0) {
      subQueries.push(query);
    }

    return subQueries;
  }

  /**
   * Extract meaningful terms from query
   */
  private extractTerms(query: IResearchQuery): string[] {
    const terms: string[] = [];

    // From topic
    if (query.topic) {
      terms.push(...query.topic.split(/\s+/).filter(t => t.length > 2));
    }

    // From keywords
    terms.push(...query.keywords);

    // Deduplicate and filter stopwords
    const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were']);
    return [...new Set(terms)].filter(t => !stopwords.has(t.toLowerCase()));
  }

  /**
   * Generate semantic variants of terms
   */
  private generateSemanticVariants(terms: string[]): string[] {
    const variants: string[] = [];

    for (const term of terms) {
      // Hyphenation variants
      if (term.includes('-')) {
        variants.push(term.replace(/-/g, ' '));
        variants.push(term.replace(/-/g, ''));
      } else if (term.length > 6) {
        // Try adding hyphen for compound words
        const mid = Math.floor(term.length / 2);
        variants.push(`${term.slice(0, mid)}-${term.slice(mid)}`);
      }

      // British/American spelling
      if (term.includes('ize')) {
        variants.push(term.replace('ize', 'ise'));
      }
      if (term.includes('ization')) {
        variants.push(term.replace('ization', 'isation'));
      }

      // Plural/singular
      if (term.endsWith('s') && term.length > 3) {
        variants.push(term.slice(0, -1));
      } else if (!term.endsWith('s')) {
        variants.push(term + 's');
      }
    }

    return variants;
  }

  /**
   * Suggest filters based on query content
   */
  private suggestFilters(query: IResearchQuery, terms: string[]): IExpandedQuery['suggestedFilters'] {
    const filters: IExpandedQuery['suggestedFilters'] = {};
    const text = terms.join(' ').toLowerCase();

    // Suggest categories
    const categories: ResearchCategory[] = [];
    if (text.includes('cbt') || text.includes('cognitive') || text.includes('behavioral')) {
      categories.push(ResearchCategory.CBT_I);
    }
    if (text.includes('mindfulness') || text.includes('acceptance') || text.includes('metacognitive')) {
      categories.push(ResearchCategory.THIRD_WAVE);
    }
    if (text.includes('machine learning') || text.includes('ai') || text.includes('algorithm')) {
      categories.push(ResearchCategory.AI_ML);
    }
    if (text.includes('digital twin') || text.includes('simulation')) {
      categories.push(ResearchCategory.DIGITAL_TWIN);
    }
    if (text.includes('wearable') || text.includes('actigraphy') || text.includes('tracker')) {
      categories.push(ResearchCategory.WEARABLES);
    }

    if (categories.length > 0) {
      filters.categories = categories;
    }

    // Suggest publication types
    const pubTypes: string[] = [];
    if (text.includes('review') || text.includes('meta')) {
      pubTypes.push('Review', 'Meta-Analysis', 'Systematic Review');
    }
    if (text.includes('trial') || text.includes('rct')) {
      pubTypes.push('Randomized Controlled Trial', 'Clinical Trial');
    }

    if (pubTypes.length > 0) {
      filters.publicationTypes = pubTypes;
    }

    return filters;
  }
}

/**
 * Singleton instance
 */
export const queryExpander = new QueryExpander();
