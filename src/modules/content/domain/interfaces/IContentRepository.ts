/**
 * IContentRepository Interface
 * ============================
 * Repository contract for accessing therapeutic content.
 */

import {
  IContentItem,
  ContentCategory,
  ContentSubcategory,
  AgeGroup,
  DifficultyLevel,
  EmotionalState,
  ContentType,
} from '../entities/ContentItem';

/**
 * Query options for filtering content
 */
export interface IContentQuery {
  category?: ContentCategory;
  subcategory?: ContentSubcategory;
  type?: ContentType;
  ageGroup?: AgeGroup;
  difficulty?: DifficultyLevel;
  emotionalState?: EmotionalState;
  tags?: string[];
  keywords?: string[];
  maxDurationMinutes?: number;
  minDurationMinutes?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'order' | 'durationMinutes' | 'difficulty' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Random selection options
 */
export interface IRandomContentOptions {
  category?: ContentCategory;
  subcategory?: ContentSubcategory;
  ageGroup?: AgeGroup;
  emotionalState?: EmotionalState;
  excludeIds?: string[];
  count?: number;
}

/**
 * Content statistics
 */
export interface IContentStats {
  totalCount: number;
  byCategory: Record<ContentCategory, number>;
  byAgeGroup: Record<AgeGroup, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byEmotionalState: Partial<Record<EmotionalState, number>>;
}

/**
 * Repository interface for content access
 */
export interface IContentRepository {
  /**
   * Get content item by ID
   */
  getById(id: string): Promise<IContentItem | null>;

  /**
   * Get all content items matching query
   */
  query(options: IContentQuery): Promise<IContentItem[]>;

  /**
   * Get content by category
   */
  getByCategory(category: ContentCategory): Promise<IContentItem[]>;

  /**
   * Get content by subcategory
   */
  getBySubcategory(
    category: ContentCategory,
    subcategory: ContentSubcategory
  ): Promise<IContentItem[]>;

  /**
   * Get content suitable for age group
   */
  getForAgeGroup(ageGroup: AgeGroup): Promise<IContentItem[]>;

  /**
   * Get content for emotional state
   */
  getForEmotionalState(state: EmotionalState): Promise<IContentItem[]>;

  /**
   * Get random content with optional filters
   */
  getRandom(options?: IRandomContentOptions): Promise<IContentItem[]>;

  /**
   * Get quick content (under specified minutes)
   */
  getQuickContent(maxMinutes: number, ageGroup?: AgeGroup): Promise<IContentItem[]>;

  /**
   * Get crisis intervention content
   */
  getCrisisContent(): Promise<IContentItem[]>;

  /**
   * Search content by keyword
   */
  search(keyword: string): Promise<IContentItem[]>;

  /**
   * Get content statistics
   */
  getStats(): Promise<IContentStats>;

  /**
   * Get all content items
   */
  getAll(): Promise<IContentItem[]>;

  /**
   * Get content count
   */
  count(options?: Partial<IContentQuery>): Promise<number>;

  /**
   * Reload content from source
   */
  reload(): Promise<void>;
}
