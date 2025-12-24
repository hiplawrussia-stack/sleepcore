/**
 * Content Library Module
 * ======================
 * Centralized therapeutic content library based on 2025 evidence-based research.
 *
 * @module content
 */

// Domain entities
export {
  ContentItem,
  IContentItem,
  IContentStep,
  IContentSource,
  IContentReward,
  ContentCategory,
  ContentSubcategory,
  ContentType,
  AgeGroup,
  DifficultyLevel,
  EvidenceLevel,
  EmotionalState,
} from './domain/entities/ContentItem';

// Domain interfaces
export {
  IContentRepository,
  IContentQuery,
  IRandomContentOptions,
  IContentStats,
} from './domain/interfaces/IContentRepository';

export {
  IContentService,
  IContentContext,
  IContentRecommendation,
  IContentCompletion,
  IDailyContent,
} from './domain/interfaces/IContentService';

// Infrastructure
export {
  JsonContentRepository,
  getContentRepository,
} from './infrastructure/repositories/JsonContentRepository';

// Application services
export {
  ContentService,
  getContentService,
} from './application/services/ContentService';
