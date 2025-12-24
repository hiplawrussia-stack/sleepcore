/**
 * ContentItem Entity
 * ==================
 * Core entity representing a single piece of therapeutic content.
 * Based on 2025 evidence-based research across global wellness traditions.
 */

/**
 * Content categories based on therapeutic domains
 */
export type ContentCategory =
  | 'relaxation'
  | 'mindfulness'
  | 'sleep'
  | 'crisis'
  | 'emotional-regulation'
  | 'positive-psychology'
  | 'movement'
  | 'digital-wellness';

/**
 * Content subcategories for detailed organization
 */
export type ContentSubcategory =
  // Relaxation
  | 'breathing'
  | 'pmr'
  | 'guided-imagery'
  // Mindfulness
  | 'grounding'
  | 'meditation'
  | 'self-compassion'
  // Sleep
  | 'hygiene'
  | 'techniques'
  | 'cbt-i'
  // Crisis
  | 'tipp-skills'
  | 'resources'
  | 'safety-planning'
  // Emotional Regulation
  | 'dbt-skills'
  | 'journaling'
  | 'coping'
  // Positive Psychology
  | 'gratitude'
  | 'strengths'
  | 'savoring'
  // Movement
  | 'yoga'
  | 'stretching'
  | 'gentle-exercise'
  // Digital Wellness
  | 'boundaries'
  | 'detox'
  | 'nature';

/**
 * Content type classification
 */
export type ContentType =
  | 'exercise'      // Interactive practice
  | 'technique'     // Step-by-step method
  | 'article'       // Educational content
  | 'resource'      // External resources/hotlines
  | 'tip'           // Quick advice
  | 'meditation'    // Guided meditation script
  | 'visualization' // Guided imagery script
  | 'checklist';    // Action items

/**
 * Age groups for content personalization
 * Based on developmental psychology research
 */
export type AgeGroup = 'child' | 'teen' | 'adult';

/**
 * Difficulty levels for progressive learning
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Evidence level classification
 * A: Multiple RCTs, meta-analyses
 * B: RCTs with positive results
 * C: Promising preliminary evidence
 */
export type EvidenceLevel = 'A' | 'B' | 'C';

/**
 * Emotional states the content addresses
 * Based on EnhancedEmotionalRecognitionService categories
 */
export type EmotionalState =
  | 'anxiety'
  | 'stress'
  | 'depression'
  | 'anger'
  | 'fear'
  | 'panic'
  | 'sadness'
  | 'overwhelm'
  | 'insomnia'
  | 'crisis'
  | 'loneliness'
  | 'fatigue'
  | 'neutral'
  | 'positive';

/**
 * Content step for multi-step exercises
 */
export interface IContentStep {
  order: number;
  instruction: string;
  duration?: number; // seconds
  tip?: string;
}

/**
 * Scientific source reference
 */
export interface IContentSource {
  title: string;
  authors?: string;
  year: number;
  url?: string;
  doi?: string;
}

/**
 * Gamification reward for completing content
 */
export interface IContentReward {
  xp: number;
  relatedQuestIds?: string[];
  relatedBadgeIds?: string[];
}

/**
 * Main ContentItem interface
 */
export interface IContentItem {
  // Identity
  id: string;
  version: number;

  // Classification
  category: ContentCategory;
  subcategory: ContentSubcategory;
  type: ContentType;

  // Content - Russian
  title: string;
  shortDescription: string;
  fullContent: string;
  steps?: IContentStep[];

  // Personalization metadata
  ageGroups: AgeGroup[];
  difficulty: DifficultyLevel;
  durationMinutes: number;

  // Targeting
  tags: string[];
  emotionalStates: EmotionalState[];
  keywords: string[];

  // Evidence
  evidenceLevel: EvidenceLevel;
  sources?: IContentSource[];

  // Gamification
  reward: IContentReward;

  // Display
  icon: string;
  order: number;
  isActive: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * ContentItem class implementation
 */
export class ContentItem implements IContentItem {
  id: string;
  version: number;
  category: ContentCategory;
  subcategory: ContentSubcategory;
  type: ContentType;
  title: string;
  shortDescription: string;
  fullContent: string;
  steps?: IContentStep[];
  ageGroups: AgeGroup[];
  difficulty: DifficultyLevel;
  durationMinutes: number;
  tags: string[];
  emotionalStates: EmotionalState[];
  keywords: string[];
  evidenceLevel: EvidenceLevel;
  sources?: IContentSource[];
  reward: IContentReward;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(data: IContentItem) {
    this.id = data.id;
    this.version = data.version;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.type = data.type;
    this.title = data.title;
    this.shortDescription = data.shortDescription;
    this.fullContent = data.fullContent;
    this.steps = data.steps;
    this.ageGroups = data.ageGroups;
    this.difficulty = data.difficulty;
    this.durationMinutes = data.durationMinutes;
    this.tags = data.tags;
    this.emotionalStates = data.emotionalStates;
    this.keywords = data.keywords;
    this.evidenceLevel = data.evidenceLevel;
    this.sources = data.sources;
    this.reward = data.reward;
    this.icon = data.icon;
    this.order = data.order;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Check if content is suitable for age group
   */
  isSuitableFor(ageGroup: AgeGroup): boolean {
    return this.ageGroups.includes(ageGroup);
  }

  /**
   * Check if content addresses emotional state
   */
  addressesEmotion(emotion: EmotionalState): boolean {
    return this.emotionalStates.includes(emotion);
  }

  /**
   * Get formatted duration string
   */
  getFormattedDuration(): string {
    if (this.durationMinutes < 1) {
      return 'меньше минуты';
    }
    if (this.durationMinutes === 1) {
      return '1 минута';
    }
    if (this.durationMinutes < 5) {
      return `${this.durationMinutes} минуты`;
    }
    return `${this.durationMinutes} минут`;
  }

  /**
   * Get difficulty label in Russian
   */
  getDifficultyLabel(): string {
    const labels: Record<DifficultyLevel, string> = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
    };
    return labels[this.difficulty];
  }

  /**
   * Get evidence level description
   */
  getEvidenceDescription(): string {
    const descriptions: Record<EvidenceLevel, string> = {
      A: 'Высокий уровень доказательности (мета-анализы)',
      B: 'Доказано РКИ',
      C: 'Перспективные данные',
    };
    return descriptions[this.evidenceLevel];
  }
}
