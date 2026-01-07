/**
 * JsonContentRepository
 * =====================
 * Repository implementation that loads content from JSON files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  IContentItem,
  ContentCategory,
  ContentSubcategory,
  AgeGroup,
  DifficultyLevel,
  EmotionalState,
} from '../../domain/entities/ContentItem';
import {
  IContentRepository,
  IContentQuery,
  IRandomContentOptions,
  IContentStats,
} from '../../domain/interfaces/IContentRepository';

/**
 * JSON-based content repository
 */
export class JsonContentRepository implements IContentRepository {
  private content: Map<string, IContentItem> = new Map();
  private dataPath: string;
  private loaded: boolean = false;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data');
  }

  /**
   * Initialize repository by loading all content
   */
  async initialize(): Promise<void> {
    if (!this.loaded) {
      await this.loadAllContent();
      this.loaded = true;
    }
  }

  /**
   * Load all JSON content files recursively
   */
  private async loadAllContent(): Promise<void> {
    this.content.clear();
    await this.loadDirectory(this.dataPath);
  }

  /**
   * Recursively load content from directory
   */
  private async loadDirectory(dirPath: string): Promise<void> {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.loadDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          await this.loadFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error loading content from ${dirPath}:`, error);
    }
  }

  /**
   * Load single JSON file
   */
  private async loadFile(filePath: string): Promise<void> {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const item: IContentItem = JSON.parse(data);

      if (item.id && item.isActive !== false) {
        this.content.set(item.id, item);
      }
    } catch (error) {
      console.error(`Error loading content file ${filePath}:`, error);
    }
  }

  /**
   * Get content by ID
   */
  async getById(id: string): Promise<IContentItem | null> {
    await this.initialize();
    return this.content.get(id) || null;
  }

  /**
   * Query content with filters
   */
  async query(options: IContentQuery): Promise<IContentItem[]> {
    await this.initialize();

    let results = Array.from(this.content.values());

    // Apply filters
    if (options.category) {
      results = results.filter(item => item.category === options.category);
    }

    if (options.subcategory) {
      results = results.filter(item => item.subcategory === options.subcategory);
    }

    if (options.type) {
      results = results.filter(item => item.type === options.type);
    }

    if (options.ageGroup) {
      results = results.filter(item => item.ageGroups.includes(options.ageGroup!));
    }

    if (options.difficulty) {
      results = results.filter(item => item.difficulty === options.difficulty);
    }

    if (options.emotionalState) {
      results = results.filter(item =>
        item.emotionalStates.includes(options.emotionalState!)
      );
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(item =>
        options.tags!.some(tag => item.tags.includes(tag))
      );
    }

    if (options.keywords && options.keywords.length > 0) {
      const lowerKeywords = options.keywords.map(k => k.toLowerCase());
      results = results.filter(item =>
        lowerKeywords.some(
          kw =>
            item.keywords.some(k => k.toLowerCase().includes(kw)) ||
            item.title.toLowerCase().includes(kw) ||
            item.shortDescription.toLowerCase().includes(kw)
        )
      );
    }

    if (options.maxDurationMinutes) {
      results = results.filter(
        item => item.durationMinutes <= options.maxDurationMinutes!
      );
    }

    if (options.minDurationMinutes) {
      results = results.filter(
        item => item.durationMinutes >= options.minDurationMinutes!
      );
    }

    if (options.isActive !== undefined) {
      results = results.filter(item => item.isActive === options.isActive);
    }

    // Apply sorting
    const orderBy = options.orderBy || 'order';
    const direction = options.orderDirection || 'asc';

    results.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (orderBy) {
        case 'order':
          aVal = a.order;
          bVal = b.order;
          break;
        case 'durationMinutes':
          aVal = a.durationMinutes;
          bVal = b.durationMinutes;
          break;
        case 'difficulty':
          const diffOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          aVal = diffOrder[a.difficulty];
          bVal = diffOrder[b.difficulty];
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }

      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Apply pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get content by category
   */
  async getByCategory(category: ContentCategory): Promise<IContentItem[]> {
    return this.query({ category });
  }

  /**
   * Get content by subcategory
   */
  async getBySubcategory(
    category: ContentCategory,
    subcategory: ContentSubcategory
  ): Promise<IContentItem[]> {
    return this.query({ category, subcategory });
  }

  /**
   * Get content suitable for age group
   */
  async getForAgeGroup(ageGroup: AgeGroup): Promise<IContentItem[]> {
    return this.query({ ageGroup });
  }

  /**
   * Get content for emotional state
   */
  async getForEmotionalState(state: EmotionalState): Promise<IContentItem[]> {
    return this.query({ emotionalState: state });
  }

  /**
   * Get random content
   */
  async getRandom(options?: IRandomContentOptions): Promise<IContentItem[]> {
    await this.initialize();

    let candidates = Array.from(this.content.values());

    if (options?.category) {
      candidates = candidates.filter(item => item.category === options.category);
    }

    if (options?.subcategory) {
      candidates = candidates.filter(
        item => item.subcategory === options.subcategory
      );
    }

    if (options?.ageGroup) {
      candidates = candidates.filter(item =>
        item.ageGroups.includes(options.ageGroup!)
      );
    }

    if (options?.emotionalState) {
      candidates = candidates.filter(item =>
        item.emotionalStates.includes(options.emotionalState!)
      );
    }

    if (options?.excludeIds && options.excludeIds.length > 0) {
      candidates = candidates.filter(
        item => !options.excludeIds!.includes(item.id)
      );
    }

    // Shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const count = options?.count || 1;
    return candidates.slice(0, count);
  }

  /**
   * Get quick content (under specified minutes)
   */
  async getQuickContent(
    maxMinutes: number,
    ageGroup?: AgeGroup
  ): Promise<IContentItem[]> {
    const query: IContentQuery = {
      maxDurationMinutes: maxMinutes,
      orderBy: 'durationMinutes',
      orderDirection: 'asc',
    };

    if (ageGroup) {
      query.ageGroup = ageGroup;
    }

    return this.query(query);
  }

  /**
   * Get crisis intervention content
   */
  async getCrisisContent(): Promise<IContentItem[]> {
    return this.query({ category: 'crisis' });
  }

  /**
   * Search content by keyword
   */
  async search(keyword: string): Promise<IContentItem[]> {
    await this.initialize();

    const lowerKeyword = keyword.toLowerCase();

    return Array.from(this.content.values()).filter(
      item =>
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.shortDescription.toLowerCase().includes(lowerKeyword) ||
        item.fullContent.toLowerCase().includes(lowerKeyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        item.keywords.some(kw => kw.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Get content statistics
   */
  async getStats(): Promise<IContentStats> {
    await this.initialize();

    const items = Array.from(this.content.values());

    const stats: IContentStats = {
      totalCount: items.length,
      byCategory: {} as Record<ContentCategory, number>,
      byAgeGroup: {} as Record<AgeGroup, number>,
      byDifficulty: {} as Record<DifficultyLevel, number>,
      byEmotionalState: {} as Partial<Record<EmotionalState, number>>,
    };

    // Count by category
    const categories: ContentCategory[] = [
      'relaxation',
      'mindfulness',
      'sleep',
      'crisis',
      'emotional-regulation',
      'positive-psychology',
      'movement',
      'digital-wellness',
    ];

    for (const cat of categories) {
      stats.byCategory[cat] = items.filter(item => item.category === cat).length;
    }

    // Count by age group
    const ageGroups: AgeGroup[] = ['child', 'teen', 'adult'];
    for (const ag of ageGroups) {
      stats.byAgeGroup[ag] = items.filter(item =>
        item.ageGroups.includes(ag)
      ).length;
    }

    // Count by difficulty
    const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
    for (const diff of difficulties) {
      stats.byDifficulty[diff] = items.filter(
        item => item.difficulty === diff
      ).length;
    }

    // Count by emotional state
    const emotions: EmotionalState[] = [
      'anxiety',
      'stress',
      'depression',
      'anger',
      'fear',
      'panic',
      'sadness',
      'overwhelm',
      'insomnia',
      'crisis',
    ];

    for (const emotion of emotions) {
      const count = items.filter(item =>
        item.emotionalStates.includes(emotion)
      ).length;
      if (count > 0) {
        stats.byEmotionalState[emotion] = count;
      }
    }

    return stats;
  }

  /**
   * Get all content items
   */
  async getAll(): Promise<IContentItem[]> {
    await this.initialize();
    return Array.from(this.content.values());
  }

  /**
   * Get content count
   */
  async count(options?: Partial<IContentQuery>): Promise<number> {
    if (!options || Object.keys(options).length === 0) {
      await this.initialize();
      return this.content.size;
    }
    const items = await this.query(options as IContentQuery);
    return items.length;
  }

  /**
   * Reload content from source
   */
  async reload(): Promise<void> {
    this.loaded = false;
    await this.initialize();
  }
}

// Singleton instance
let instance: JsonContentRepository | null = null;

/**
 * Get singleton repository instance
 */
export function getContentRepository(dataPath?: string): JsonContentRepository {
  if (!instance) {
    instance = new JsonContentRepository(dataPath);
  }
  return instance;
}
