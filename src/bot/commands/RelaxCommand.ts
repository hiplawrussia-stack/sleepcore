/**
 * /relax Command - Relaxation Techniques
 * =======================================
 * Provides guided relaxation exercises based on CBT-I relaxation component.
 *
 * Integrated with Content Library (Phase 6.1):
 * - Dynamic content from JSON files
 * - Age-adaptive recommendations
 * - Evidence-based techniques (European Guideline 2023)
 * - JITAI pattern for just-in-time delivery
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
  AgeGroup,
} from '../../modules/content';

/**
 * /relax Command Implementation
 * Now integrated with Content Library for dynamic, evidence-based content
 */
export class RelaxCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'relax';
  readonly description = 'Техники релаксации';
  readonly aliases = ['relaxation', 'calm', 'расслабление'];
  readonly requiresSession = false;
  readonly steps = ['menu', 'show', 'more', 'done', 'timer'];

  private contentService = getContentService();

  /**
   * Execute the command
   * Uses Content Library for dynamic content delivery
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    // Determine user's age group (default to adult)
    const ageGroup = this.getUserAgeGroup(ctx);

    if (args) {
      // Show specific technique by ID
      const content = await this.contentService.getContent(args.toLowerCase());
      if (content) {
        return this.showTechnique(ctx, content);
      }
    }

    // Show technique menu with personalized recommendations
    return this.showMenu(ctx, ageGroup);
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

  // ==================== Response Handlers ====================

  private async showMenu(
    ctx: ISleepCoreContext,
    ageGroup: AgeGroup
  ): Promise<ICommandResult> {
    // Fetch relaxation content from Content Library
    const content = await this.contentService.getRelaxationContent(ageGroup);

    // Get personalized recommendation if available
    let recommendation = '';
    try {
      const rec = ctx.sleepCore.getRelaxationRecommendation(ctx.userId, 'bedtime');
      recommendation = `\n${sonya.tip(`Рекомендую: ${rec.technique}`)}`;
    } catch {
      // No personalized recommendation available
    }

    // Build content list (max 5 for progressive disclosure)
    const displayContent = content.slice(0, 5);
    const contentList = displayContent
      .map(item => `${item.icon} *${item.title}* — ${item.durationMinutes} мин`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

Расслабление — важная часть подготовки ко сну.

${formatter.header('Техники релаксации')}

Выбери технику для практики:

${contentList}
${recommendation}

${sonya.tip('Практикуй за 30-60 минут до сна')}
    `.trim();

    // Build keyboard dynamically (max 2 buttons per row)
    const keyboard: IInlineButton[][] = [];
    for (let i = 0; i < displayContent.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${displayContent[i].icon} ${this.shortenTitle(displayContent[i].title)} (${displayContent[i].durationMinutes}м)`,
        callbackData: `relax:show:${displayContent[i].id}`,
      });
      if (displayContent[i + 1]) {
        row.push({
          text: `${displayContent[i + 1].icon} ${this.shortenTitle(displayContent[i + 1].title)} (${displayContent[i + 1].durationMinutes}м)`,
          callbackData: `relax:show:${displayContent[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    // Add "More content" button if there's more available
    if (content.length > 5) {
      keyboard.push([{ text: '📚 Больше техник', callbackData: 'relax:more' }]);
    }

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show specific technique from Content Library
   */
  private async showTechnique(
    ctx: ISleepCoreContext,
    content: IContentItem
  ): Promise<ICommandResult> {
    // Use ContentService's built-in formatting if steps exist
    const formattedContent = content.steps && content.steps.length > 0
      ? this.contentService.formatStepsForTelegram(content)
      : this.contentService.formatForTelegram(content);

    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Отличный выбор! Начинаем практику.')}

${formattedContent}

${formatter.divider()}

${sonya.tip('Используй эту технику каждый вечер для закрепления навыка')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `relax:timer:${content.id}:${content.durationMinutes}` }],
      [{ text: '✅ Выполнено', callbackData: `relax:done:${content.id}` }],
      [{ text: '◀️ К списку', callbackData: 'relax:menu' }],
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
   * Shorten title for button display (max 12 chars)
   */
  private shortenTitle(title: string): string {
    if (title.length <= 12) return title;
    return title.slice(0, 10) + '...';
  }

  // ==================== Callback Handlers ====================

  /**
   * Handle callback queries for relax command
   * Callbacks: relax:menu, relax:show:{id}, relax:more, relax:done:{id}, relax:timer:{id}:{duration}
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    const action = parts[1];
    const ageGroup = this.getUserAgeGroup(ctx);

    switch (action) {
      case 'menu':
        return this.showMenu(ctx, ageGroup);

      case 'show': {
        const contentId = parts[2];
        const content = await this.contentService.getContent(contentId);
        if (content) {
          return this.showTechnique(ctx, content);
        }
        return { success: false, error: 'Техника не найдена' };
      }

      case 'more':
        return this.showMoreContent(ctx, ageGroup);

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
   * Show more content (beyond first 5)
   */
  private async showMoreContent(
    ctx: ISleepCoreContext,
    ageGroup: AgeGroup
  ): Promise<ICommandResult> {
    const content = await this.contentService.getRelaxationContent(ageGroup);

    const contentList = content
      .map(item => `${item.icon} *${item.title}* — ${item.durationMinutes} мин`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Все техники релаксации')}

${contentList}

${sonya.tip('Выбери технику для практики')}
    `.trim();

    // Build keyboard with all content
    const keyboard: IInlineButton[][] = [];
    for (let i = 0; i < content.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${content[i].icon} ${this.shortenTitle(content[i].title)}`,
        callbackData: `relax:show:${content[i].id}`,
      });
      if (content[i + 1]) {
        row.push({
          text: `${content[i + 1].icon} ${this.shortenTitle(content[i + 1].title)}`,
          callbackData: `relax:show:${content[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: '◀️ Назад', callbackData: 'relax:menu' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Handle technique completion
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

${sonya.say('Отлично! Регулярная практика — ключ к успеху.')}

${sonya.tip('Попробуй использовать эту технику каждый вечер')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔄 Другая техника', callbackData: 'relax:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { xpEarned: xp, contentId },
    };
  }

  /**
   * Start timer for technique
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

${content?.icon || '🧘'} ${content?.title || 'Практика'}

${sonya.say('Сосредоточься на практике. Я напомню, когда время закончится.')}

${formatter.divider()}

_Таймер работает в фоне. Расслабься и практикуй._
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Завершить раньше', callbackData: `relax:done:${contentId}` }],
      [{ text: '❌ Отменить', callbackData: 'relax:menu' }],
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
export const relaxCommand = new RelaxCommand();
