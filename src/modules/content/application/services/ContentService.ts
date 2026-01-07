/**
 * ContentService
 * ==============
 * Service for content personalization and delivery.
 */

import {
  IContentItem,
  ContentCategory,
  AgeGroup,
  EmotionalState,
} from '../../domain/entities/ContentItem';
import {
  IContentService,
  IContentContext,
  IContentRecommendation,
  IContentCompletion,
  IDailyContent,
} from '../../domain/interfaces/IContentService';
import { IContentRepository, IContentQuery } from '../../domain/interfaces/IContentRepository';
import { getContentRepository } from '../../infrastructure/repositories/JsonContentRepository';

/**
 * ContentService implementation
 */
export class ContentService implements IContentService {
  private repository: IContentRepository;
  private completionHistory: Map<number, IContentCompletion[]> = new Map();

  constructor(repository?: IContentRepository) {
    this.repository = repository || getContentRepository();
  }

  /**
   * Get personalized content recommendations
   */
  async getRecommendations(
    context: IContentContext,
    limit: number = 5
  ): Promise<IContentRecommendation[]> {
    const candidates = await this.repository.getForAgeGroup(context.ageGroup);
    const recommendations: IContentRecommendation[] = [];

    for (const content of candidates) {
      let score = 0;
      let reason = '';

      // Score based on emotional state match
      if (
        context.currentEmotion &&
        content.emotionalStates.includes(context.currentEmotion)
      ) {
        score += 30;
        reason = `Подходит для твоего состояния`;
      }

      // Score based on time of day
      if (context.timeOfDay) {
        if (
          context.timeOfDay === 'night' &&
          (content.category === 'sleep' || content.subcategory === 'breathing')
        ) {
          score += 20;
          reason = reason || 'Идеально для вечера';
        }

        if (
          context.timeOfDay === 'morning' &&
          content.category === 'positive-psychology'
        ) {
          score += 15;
          reason = reason || 'Отличное начало дня';
        }
      }

      // Score based on duration preference
      if (context.preferredDuration) {
        const diff = Math.abs(content.durationMinutes - context.preferredDuration);
        if (diff <= 2) {
          score += 15;
        } else if (diff <= 5) {
          score += 10;
        }
      }

      // Score based on preferred categories
      if (
        context.preferredCategories &&
        context.preferredCategories.includes(content.category)
      ) {
        score += 10;
      }

      // Penalize if recently completed
      if (
        context.previousContentIds &&
        context.previousContentIds.includes(content.id)
      ) {
        score -= 20;
      }

      // Bonus for high evidence level
      if (content.evidenceLevel === 'A') {
        score += 5;
      }

      // Bonus for beginner content for new users
      if (content.difficulty === 'beginner') {
        score += 5;
      }

      if (score > 0) {
        recommendations.push({
          content,
          relevanceScore: score,
          reason: reason || 'Рекомендуется для тебя',
        });
      }
    }

    // Sort by relevance score
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return recommendations.slice(0, limit);
  }

  /**
   * Get content for specific emotional state
   */
  async getContentForEmotion(
    emotion: EmotionalState,
    ageGroup: AgeGroup,
    intensity?: number
  ): Promise<IContentItem[]> {
    let content = await this.repository.query({
      emotionalState: emotion,
      ageGroup,
      orderBy: 'order',
    });

    // For high intensity, prioritize quick techniques
    if (intensity && intensity > 0.7) {
      content = content.filter(item => item.durationMinutes <= 5);
    }

    // For crisis, always include crisis content
    if (emotion === 'crisis' || emotion === 'panic') {
      const crisisContent = await this.repository.getCrisisContent();
      content = [...crisisContent, ...content];
    }

    return content;
  }

  /**
   * Get quick relief content (under 5 minutes)
   */
  async getQuickRelief(context: IContentContext): Promise<IContentItem[]> {
    return this.repository.query({
      ageGroup: context.ageGroup,
      maxDurationMinutes: 5,
      emotionalState: context.currentEmotion,
      orderBy: 'durationMinutes',
      orderDirection: 'asc',
    });
  }

  /**
   * Get crisis intervention content
   */
  async getCrisisIntervention(ageGroup: AgeGroup): Promise<IContentItem[]> {
    const crisisContent = await this.repository.getCrisisContent();
    return crisisContent.filter(item => item.ageGroups.includes(ageGroup));
  }

  /**
   * Get sleep improvement content
   */
  async getSleepContent(ageGroup: AgeGroup): Promise<IContentItem[]> {
    return this.repository.query({
      category: 'sleep',
      ageGroup,
      orderBy: 'order',
    });
  }

  /**
   * Get relaxation content
   */
  async getRelaxationContent(
    ageGroup: AgeGroup,
    duration?: number
  ): Promise<IContentItem[]> {
    const query: IContentQuery = {
      category: 'relaxation',
      ageGroup,
      orderBy: 'order',
    };

    if (duration) {
      query.maxDurationMinutes = duration;
    }

    return this.repository.query(query);
  }

  /**
   * Get mindfulness content
   */
  async getMindfulnessContent(
    ageGroup: AgeGroup,
    duration?: number
  ): Promise<IContentItem[]> {
    const query: IContentQuery = {
      category: 'mindfulness',
      ageGroup,
      orderBy: 'order',
    };

    if (duration) {
      query.maxDurationMinutes = duration;
    }

    return this.repository.query(query);
  }

  /**
   * Get daily content suggestions
   */
  async getDailyContent(context: IContentContext): Promise<IDailyContent> {
    const result: IDailyContent = {};

    // Morning: positive psychology or gratitude
    const morning = await this.repository.query({
      category: 'positive-psychology',
      ageGroup: context.ageGroup,
      limit: 1,
    });
    if (morning.length > 0) {
      result.morning = morning[0];
    }

    // Afternoon: mindfulness or quick relaxation
    const afternoon = await this.repository.query({
      category: 'mindfulness',
      ageGroup: context.ageGroup,
      maxDurationMinutes: 10,
      limit: 1,
    });
    if (afternoon.length > 0) {
      result.afternoon = afternoon[0];
    }

    // Evening: sleep preparation
    const evening = await this.repository.query({
      category: 'sleep',
      ageGroup: context.ageGroup,
      limit: 1,
    });
    if (evening.length > 0) {
      result.evening = evening[0];
    }

    // Crisis: always available
    const crisis = await this.repository.query({
      category: 'crisis',
      subcategory: 'tipp-skills',
      ageGroup: context.ageGroup,
      limit: 1,
    });
    if (crisis.length > 0) {
      result.crisis = crisis[0];
    }

    return result;
  }

  /**
   * Record content completion
   */
  async recordCompletion(completion: IContentCompletion): Promise<void> {
    const userHistory = this.completionHistory.get(completion.userId) || [];
    userHistory.push(completion);

    // Keep last 100 completions
    if (userHistory.length > 100) {
      userHistory.shift();
    }

    this.completionHistory.set(completion.userId, userHistory);
  }

  /**
   * Get user's content history
   */
  async getContentHistory(
    userId: number,
    limit: number = 20
  ): Promise<IContentCompletion[]> {
    const history = this.completionHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get content by ID with personalization
   */
  async getContent(
    id: string,
    context?: IContentContext
  ): Promise<IContentItem | null> {
    return this.repository.getById(id);
  }

  /**
   * Get content by category
   */
  async getByCategory(
    category: ContentCategory,
    context?: IContentContext
  ): Promise<IContentItem[]> {
    const query: IContentQuery = { category, orderBy: 'order' };

    if (context?.ageGroup) {
      query.ageGroup = context.ageGroup;
    }

    return this.repository.query(query);
  }

  /**
   * Search content
   */
  async search(
    query: string,
    context?: IContentContext
  ): Promise<IContentItem[]> {
    let results = await this.repository.search(query);

    if (context?.ageGroup) {
      results = results.filter(item =>
        item.ageGroups.includes(context.ageGroup)
      );
    }

    return results;
  }

  /**
   * Format content for Telegram display
   */
  formatForTelegram(content: IContentItem): string {
    const lines: string[] = [];

    // Header
    lines.push(`${content.icon} *${content.title}*`);
    lines.push('');

    // Duration and difficulty
    const diffLabels: Record<string, string> = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
    };
    lines.push(
      `⏱ ${content.durationMinutes} мин · 📊 ${diffLabels[content.difficulty]}`
    );
    lines.push('');

    // Description
    lines.push(content.shortDescription);
    lines.push('');

    // Full content
    lines.push(content.fullContent);

    // XP reward
    if (content.reward.xp > 0) {
      lines.push('');
      lines.push(`✨ +${content.reward.xp} XP за выполнение`);
    }

    return lines.join('\n');
  }

  /**
   * Format content steps for Telegram
   */
  formatStepsForTelegram(content: IContentItem): string {
    if (!content.steps || content.steps.length === 0) {
      return this.formatForTelegram(content);
    }

    const lines: string[] = [];

    // Header
    lines.push(`${content.icon} *${content.title}*`);
    lines.push('');
    lines.push(content.shortDescription);
    lines.push('');
    lines.push('*Шаги:*');
    lines.push('');

    // Steps
    for (const step of content.steps) {
      const stepNum = this.getStepEmoji(step.order);
      lines.push(`${stepNum} ${step.instruction}`);

      if (step.tip) {
        lines.push(`   💡 _${step.tip}_`);
      }

      if (step.duration && step.duration > 10) {
        lines.push(`   ⏱ ${Math.round(step.duration / 60) || 1} мин`);
      }

      lines.push('');
    }

    // XP reward
    if (content.reward.xp > 0) {
      lines.push(`✨ +${content.reward.xp} XP за выполнение`);
    }

    return lines.join('\n');
  }

  /**
   * Get emoji for step number
   */
  private getStepEmoji(num: number): string {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[num - 1] || `${num}.`;
  }
}

// Singleton instance
let serviceInstance: ContentService | null = null;

/**
 * Get singleton service instance
 */
export function getContentService(): ContentService {
  if (!serviceInstance) {
    serviceInstance = new ContentService();
  }
  return serviceInstance;
}
