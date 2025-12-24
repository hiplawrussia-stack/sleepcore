/**
 * IContentService Interface
 * =========================
 * Service contract for content personalization and delivery.
 */

import {
  IContentItem,
  ContentCategory,
  AgeGroup,
  EmotionalState,
} from '../entities/ContentItem';

/**
 * Context for content personalization
 */
export interface IContentContext {
  userId: number;
  ageGroup: AgeGroup;
  currentEmotion?: EmotionalState;
  emotionIntensity?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  previousContentIds?: string[];
  preferredDuration?: number;
  preferredCategories?: ContentCategory[];
}

/**
 * Personalized content recommendation
 */
export interface IContentRecommendation {
  content: IContentItem;
  relevanceScore: number;
  reason: string;
}

/**
 * Content completion record
 */
export interface IContentCompletion {
  contentId: string;
  userId: number;
  completedAt: Date;
  rating?: number;
  feedback?: string;
  xpEarned: number;
}

/**
 * Daily content suggestion
 */
export interface IDailyContent {
  morning?: IContentItem;
  afternoon?: IContentItem;
  evening?: IContentItem;
  crisis?: IContentItem;
}

/**
 * Content service interface
 */
export interface IContentService {
  /**
   * Get personalized content recommendations
   */
  getRecommendations(
    context: IContentContext,
    limit?: number
  ): Promise<IContentRecommendation[]>;

  /**
   * Get content for specific emotional state
   */
  getContentForEmotion(
    emotion: EmotionalState,
    ageGroup: AgeGroup,
    intensity?: number
  ): Promise<IContentItem[]>;

  /**
   * Get quick relief content (under 5 minutes)
   */
  getQuickRelief(context: IContentContext): Promise<IContentItem[]>;

  /**
   * Get crisis intervention content
   */
  getCrisisIntervention(ageGroup: AgeGroup): Promise<IContentItem[]>;

  /**
   * Get sleep improvement content
   */
  getSleepContent(ageGroup: AgeGroup): Promise<IContentItem[]>;

  /**
   * Get relaxation content
   */
  getRelaxationContent(
    ageGroup: AgeGroup,
    duration?: number
  ): Promise<IContentItem[]>;

  /**
   * Get mindfulness content
   */
  getMindfulnessContent(
    ageGroup: AgeGroup,
    duration?: number
  ): Promise<IContentItem[]>;

  /**
   * Get daily content suggestions
   */
  getDailyContent(context: IContentContext): Promise<IDailyContent>;

  /**
   * Record content completion
   */
  recordCompletion(completion: IContentCompletion): Promise<void>;

  /**
   * Get user's content history
   */
  getContentHistory(userId: number, limit?: number): Promise<IContentCompletion[]>;

  /**
   * Get content by ID with personalization
   */
  getContent(id: string, context?: IContentContext): Promise<IContentItem | null>;

  /**
   * Get content by category
   */
  getByCategory(
    category: ContentCategory,
    context?: IContentContext
  ): Promise<IContentItem[]>;

  /**
   * Search content
   */
  search(query: string, context?: IContentContext): Promise<IContentItem[]>;

  /**
   * Format content for Telegram display
   */
  formatForTelegram(content: IContentItem): string;

  /**
   * Format content steps for Telegram
   */
  formatStepsForTelegram(content: IContentItem): string;
}
