/**
 * /smart_tips Command - Context-Aware Content Recommendations
 * ============================================================
 * Provides personalized content recommendations using JITAI pattern.
 *
 * Features (based on 2025 research):
 * - Just-In-Time Adaptive Interventions (JITAI)
 * - Time-of-day context awareness
 * - Emotional state personalization
 * - Age-adaptive content selection
 * - Progressive disclosure UX pattern
 *
 * Research basis:
 * - Nahum-Shani et al. (2018): JITAI in mental health
 * - Woebot/Wysa patterns: 34-42% symptom reduction
 * - Limbic Care: 3x engagement with personalization
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import {
  getContentService,
  IContentItem,
  IContentContext,
  IContentRecommendation,
  AgeGroup,
  EmotionalState,
} from '../../modules/content';

/**
 * Time of day for context-aware recommendations
 */
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * /smart_tips Command Implementation
 * Uses JITAI pattern for just-in-time adaptive interventions
 */
export class SmartTipsCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'smart_tips';
  readonly description = 'Умные рекомендации';
  readonly aliases = ['tips', 'recommend', 'советы'];
  readonly requiresSession = false;
  readonly steps = ['menu', 'show', 'filter', 'done', 'timer'];

  private contentService = getContentService();

  /**
   * Execute the command
   * Analyzes context and provides personalized recommendations
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    const ageGroup = this.getUserAgeGroup(ctx);
    const timeOfDay = this.getTimeOfDay();
    const emotion = this.parseEmotionArg(args);

    // Build context for recommendations
    const context: IContentContext = {
      userId: parseInt(ctx.userId),
      ageGroup,
      timeOfDay,
      currentEmotion: emotion,
    };

    // Handle specific content request
    if (args && !emotion) {
      const content = await this.contentService.getContent(args.toLowerCase());
      if (content) {
        return this.showContent(ctx, content);
      }
    }

    // Get personalized recommendations
    const recommendations = await this.contentService.getRecommendations(context, 5);

    if (recommendations.length === 0) {
      return this.showNoRecommendations(ctx);
    }

    return this.showRecommendations(ctx, recommendations, timeOfDay, emotion);
  }

  // ==================== Helper Methods ====================

  /**
   * Get user's age group from context
   * Falls back to 'adult' if not available in session
   */
  private getUserAgeGroup(ctx: ISleepCoreContext): AgeGroup {
    try {
      const session = ctx.sleepCore.getSession(ctx.userId);
      // Session may have extended properties from user profile
      const sessionData = session as unknown as Record<string, unknown>;
      if (sessionData?.ageGroup && typeof sessionData.ageGroup === 'string') {
        return sessionData.ageGroup as AgeGroup;
      }
      return 'adult';
    } catch {
      return 'adult';
    }
  }

  /**
   * Determine time of day for context-aware recommendations
   */
  private getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Parse emotional state from command arguments
   */
  private parseEmotionArg(args?: string): EmotionalState | undefined {
    if (!args) return undefined;

    const emotionMap: Record<string, EmotionalState> = {
      // Russian keywords
      'тревога': 'anxiety',
      'тревожность': 'anxiety',
      'стресс': 'stress',
      'напряжение': 'stress',
      'грусть': 'sadness',
      'печаль': 'sadness',
      'депрессия': 'depression',
      'злость': 'anger',
      'гнев': 'anger',
      'страх': 'fear',
      'паника': 'panic',
      'бессонница': 'insomnia',
      'кризис': 'crisis',
      // English keywords
      'anxiety': 'anxiety',
      'stress': 'stress',
      'sadness': 'sadness',
      'depression': 'depression',
      'anger': 'anger',
      'fear': 'fear',
      'panic': 'panic',
      'insomnia': 'insomnia',
      'crisis': 'crisis',
    };

    const lowerArgs = args.toLowerCase();
    return emotionMap[lowerArgs];
  }

  // ==================== Response Handlers ====================

  /**
   * Show personalized recommendations
   */
  private async showRecommendations(
    ctx: ISleepCoreContext,
    recommendations: IContentRecommendation[],
    timeOfDay: TimeOfDay,
    emotion?: EmotionalState
  ): Promise<ICommandResult> {
    const timeLabels: Record<TimeOfDay, string> = {
      morning: 'Доброе утро',
      afternoon: 'Добрый день',
      evening: 'Добрый вечер',
      night: 'Доброй ночи',
    };

    const contextTip = this.getContextTip(timeOfDay, emotion);

    // Build recommendation list
    const recList = recommendations
      .map((rec, i) => {
        const priority = i === 0 ? '⭐ ' : '';
        return `${priority}${rec.content.icon} *${rec.content.title}* — ${rec.content.durationMinutes} мин\n   _${rec.reason}_`;
      })
      .join('\n\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${timeLabels[timeOfDay]}! Вот что я рекомендую:

${formatter.header('Персональные рекомендации')}

${recList}

${formatter.divider()}

${contextTip}
    `.trim();

    // Build keyboard with recommendations
    const keyboard: IInlineButton[][] = [];

    // First recommendation as primary button
    if (recommendations.length > 0) {
      const first = recommendations[0];
      keyboard.push([{
        text: `⭐ ${first.content.icon} ${this.shortenTitle(first.content.title)} (Топ)`,
        callbackData: `tips:show:${first.content.id}`,
      }]);
    }

    // Other recommendations
    for (let i = 1; i < recommendations.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${recommendations[i].content.icon} ${this.shortenTitle(recommendations[i].content.title)}`,
        callbackData: `tips:show:${recommendations[i].content.id}`,
      });
      if (recommendations[i + 1]) {
        row.push({
          text: `${recommendations[i + 1].content.icon} ${this.shortenTitle(recommendations[i + 1].content.title)}`,
          callbackData: `tips:show:${recommendations[i + 1].content.id}`,
        });
      }
      keyboard.push(row);
    }

    // Quick filters
    keyboard.push([
      { text: '🚀 Быстрые (5 мин)', callbackData: 'tips:filter:quick' },
      { text: '😴 Для сна', callbackData: 'tips:filter:sleep' },
    ]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        timeOfDay,
        emotion,
        recommendationCount: recommendations.length,
      },
    };
  }

  /**
   * Show specific content from recommendation
   */
  private async showContent(
    ctx: ISleepCoreContext,
    content: IContentItem
  ): Promise<ICommandResult> {
    const formattedContent = content.steps && content.steps.length > 0
      ? this.contentService.formatStepsForTelegram(content)
      : this.contentService.formatForTelegram(content);

    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Отличный выбор! Давай начнём.')}

${formattedContent}

${formatter.divider()}

${sonya.tip('Регулярная практика — ключ к результату')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `tips:timer:${content.id}:${content.durationMinutes}` }],
      [{ text: '✅ Выполнено', callbackData: `tips:done:${content.id}` }],
      [{ text: '◀️ К рекомендациям', callbackData: 'tips:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        contentId: content.id,
        category: content.category,
        xpReward: content.reward.xp,
      },
    };
  }

  /**
   * Show message when no recommendations available
   */
  private async showNoRecommendations(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Пока у меня нет персональных рекомендаций для тебя.')}

Попробуй:
• /relax — техники релаксации
• /mindful — практики осознанности

${sonya.tip('Чем больше ты взаимодействуешь со мной, тем точнее рекомендации!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '🧘 Релаксация', callbackData: 'relax:menu' },
        { text: '🧠 Осознанность', callbackData: 'mindful:menu' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Get context-aware tip based on time and emotion
   */
  private getContextTip(timeOfDay: TimeOfDay, emotion?: EmotionalState): string {
    if (emotion === 'crisis' || emotion === 'panic') {
      return sonya.tip('Если тебе очень плохо — напиши /sos для экстренной помощи');
    }

    if (emotion === 'insomnia' && timeOfDay === 'night') {
      return sonya.tip('Не смотри на часы. Если не спится 20 минут — встань, сделай практику');
    }

    if (emotion === 'anxiety' || emotion === 'stress') {
      return sonya.tip('Начни с дыхания — это самый быстрый способ успокоить нервную систему');
    }

    const timeTips: Record<TimeOfDay, string> = {
      morning: 'Утренняя практика задаёт тон всему дню',
      afternoon: 'Короткая пауза на практику повышает продуктивность',
      evening: 'Вечер — время для подготовки ко сну',
      night: 'Выбирай спокойные практики перед сном',
    };

    return sonya.tip(timeTips[timeOfDay]);
  }

  /**
   * Shorten title for button display (max 12 chars)
   */
  private shortenTitle(title: string): string {
    if (title.length <= 12) return title;
    return title.slice(0, 10) + '...';
  }

  // ==================== Callback Handlers ====================

  /**
   * Handle callback queries for tips command
   * Callbacks: tips:menu, tips:show:{id}, tips:filter:{type}, tips:done:{id}, tips:timer:{id}:{duration}
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    const action = parts[1];
    const ageGroup = this.getUserAgeGroup(ctx);
    const timeOfDay = this.getTimeOfDay();

    switch (action) {
      case 'menu': {
        const context: IContentContext = {
          userId: parseInt(ctx.userId),
          ageGroup,
          timeOfDay,
        };
        const recommendations = await this.contentService.getRecommendations(context, 5);
        if (recommendations.length === 0) {
          return this.showNoRecommendations(ctx);
        }
        return this.showRecommendations(ctx, recommendations, timeOfDay);
      }

      case 'show': {
        const contentId = parts[2];
        const content = await this.contentService.getContent(contentId);
        if (content) {
          return this.showContent(ctx, content);
        }
        return { success: false, error: 'Контент не найден' };
      }

      case 'filter': {
        const filterType = parts[2];
        return this.showFilteredContent(ctx, ageGroup, filterType);
      }

      case 'done': {
        const contentId = parts[2];
        return this.handleCompletion(ctx, contentId);
      }

      case 'timer': {
        const contentId = parts[2];
        const duration = parseInt(parts[3]) || 5;
        return this.startTimer(ctx, contentId, duration);
      }

      default:
        return { success: false, error: 'Неизвестное действие' };
    }
  }

  /**
   * Show filtered content by type (quick, sleep)
   */
  private async showFilteredContent(
    ctx: ISleepCoreContext,
    ageGroup: AgeGroup,
    filterType: string
  ): Promise<ICommandResult> {
    let content: IContentItem[];
    let title: string;

    if (filterType === 'quick') {
      content = await this.contentService.getQuickRelief({
        userId: parseInt(ctx.userId),
        ageGroup,
      });
      title = 'Быстрые техники (до 5 минут)';
    } else if (filterType === 'sleep') {
      content = await this.contentService.getSleepContent(ageGroup);
      title = 'Техники для сна';
    } else {
      return { success: false, error: 'Неизвестный фильтр' };
    }

    if (content.length === 0) {
      return {
        success: true,
        message: `${sonya.emoji} Нет контента по этому фильтру`,
        keyboard: [[{ text: '◀️ Назад', callbackData: 'tips:menu' }]],
      };
    }

    const contentList = content
      .map(item => `${item.icon} *${item.title}* — ${item.durationMinutes} мин`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header(title)}

${contentList}

${sonya.tip('Выбери практику для начала')}
    `.trim();

    const keyboard: IInlineButton[][] = [];
    for (let i = 0; i < Math.min(content.length, 6); i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${content[i].icon} ${this.shortenTitle(content[i].title)}`,
        callbackData: `tips:show:${content[i].id}`,
      });
      if (content[i + 1]) {
        row.push({
          text: `${content[i + 1].icon} ${this.shortenTitle(content[i + 1].title)}`,
          callbackData: `tips:show:${content[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: '◀️ К рекомендациям', callbackData: 'tips:menu' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Handle content completion
   */
  private async handleCompletion(
    ctx: ISleepCoreContext,
    contentId: string
  ): Promise<ICommandResult> {
    const content = await this.contentService.getContent(contentId);
    const xp = content?.reward.xp || 15;

    // Record completion
    await this.contentService.recordCompletion({
      contentId,
      userId: parseInt(ctx.userId),
      completedAt: new Date(),
      xpEarned: xp,
    });

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.success('Практика завершена!')}

✨ +${xp} XP заработано

${sonya.say('Отлично! Каждая практика приближает тебя к цели.')}

${sonya.tip('Регулярность важнее продолжительности')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔄 Ещё рекомендации', callbackData: 'tips:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { xpEarned: xp, contentId },
    };
  }

  /**
   * Start timer for content
   */
  private async startTimer(
    ctx: ISleepCoreContext,
    contentId: string,
    duration: number
  ): Promise<ICommandResult> {
    const content = await this.contentService.getContent(contentId);

    const message = `
${sonya.emoji} *${sonya.name}*

⏱ *Таймер запущен: ${duration} минут*

${content?.icon || '✨'} ${content?.title || 'Практика'}

${sonya.say('Сосредоточься на практике. Я дам знать, когда время выйдет.')}

${formatter.divider()}

_Расслабься и следуй инструкциям._
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Завершить раньше', callbackData: `tips:done:${contentId}` }],
      [{ text: '❌ Отменить', callbackData: 'tips:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { timer: duration, contentId },
    };
  }
}

// Export singleton
export const smartTipsCommand = new SmartTipsCommand();
