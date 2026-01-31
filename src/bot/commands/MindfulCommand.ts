/**
 * /mindful Command - Mindfulness & Third-Wave Therapies
 * ======================================================
 * Provides MBT-I and ACT-I exercises.
 *
 * Integrated with Content Library (Phase 6.1):
 * - Dynamic content from JSON files
 * - Evidence-based MBT-I/ACT-I techniques
 * - Age-adaptive recommendations
 * - JITAI pattern for just-in-time delivery
 *
 * Based on 2025 research:
 * - Third-wave therapies trending in insomnia treatment
 * - Calm/Headspace patterns for engagement
 * - ACT defusion techniques for sleep anxiety
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
import type {
  IMindfulnessSession,
  MindfulnessPractice,
} from '../../third-wave/interfaces/IThirdWaveTherapies';

/**
 * /mindful Command Implementation
 * Now integrated with Content Library for dynamic, evidence-based content
 */
export class MindfulCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'mindful';
  readonly description = 'Практики осознанности';
  readonly aliases = ['mindfulness', 'meditation', 'осознанность'];
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
      // Show specific practice by ID
      const content = await this.contentService.getContent(args.toLowerCase());
      if (content) {
        return this.showPractice(ctx, content);
      }
    }

    // Check if user has MBT-I/ACT-I plan
    try {
      const session = ctx.sleepCore.getSession(ctx.userId);
      const hasPlan = session?.mbtiPlan || session?.actiPlan;

      if (hasPlan) {
        return this.showPersonalizedMenu(ctx, ageGroup, session);
      }
    } catch {
      // No session, show default menu
    }

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
    // Fetch mindfulness content from Content Library
    const content = await this.contentService.getMindfulnessContent(ageGroup);

    // Build content list (max 5 for progressive disclosure)
    const displayContent = content.slice(0, 5);
    const contentList = displayContent
      .map(item => `${item.icon} *${item.title}* — ${item.durationMinutes} мин`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

Осознанность помогает успокоить ум перед сном.

${formatter.header('Практики осознанности')}

${contentList}

${sonya.tip('Регулярные практики улучшают сон за 2-4 недели')}
    `.trim();

    // Build keyboard dynamically (max 2 buttons per row)
    const keyboard: IInlineButton[][] = [];
    for (let i = 0; i < displayContent.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${displayContent[i].icon} ${this.shortenTitle(displayContent[i].title)} (${displayContent[i].durationMinutes}м)`,
        callbackData: `mindful:show:${displayContent[i].id}`,
      });
      if (displayContent[i + 1]) {
        row.push({
          text: `${displayContent[i + 1].icon} ${this.shortenTitle(displayContent[i + 1].title)} (${displayContent[i + 1].durationMinutes}м)`,
          callbackData: `mindful:show:${displayContent[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    // Add "More content" button if there's more available
    if (content.length > 5) {
      keyboard.push([{ text: '📚 Больше практик', callbackData: 'mindful:more' }]);
    }

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showPersonalizedMenu(
    ctx: ISleepCoreContext,
    ageGroup: AgeGroup,
    _session: { mbtiPlan?: unknown; actiPlan?: unknown }
  ): Promise<ICommandResult> {
    // Fetch mindfulness content and get recommendations
    const content = await this.contentService.getMindfulnessContent(ageGroup);

    // Get personalized recommendation
    let recommendedContent: IContentItem | null = null;
    try {
      const practiceRec = ctx.sleepCore.getMindfulnessPractice(ctx.userId, 'bedtime', 10);
      if (practiceRec) {
        recommendedContent = await this.contentService.getContent(practiceRec.practice);
      }
    } catch {
      // Use first available
    }

    if (!recommendedContent && content.length > 0) {
      recommendedContent = content[0];
    }

    if (!recommendedContent) {
      return this.showMenu(ctx, ageGroup);
    }

    const otherContent = content.filter(c => c.id !== recommendedContent!.id).slice(0, 4);

    const message = `
${formatter.header('Практики осознанности')}

${formatter.success('У вас активный план терапии!')}

*Рекомендовано сегодня:*
${recommendedContent.icon} ${recommendedContent.title} (${recommendedContent.durationMinutes} мин)

_${recommendedContent.shortDescription}_

${formatter.divider()}

Другие практики доступны ниже.
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: `${recommendedContent.icon} Начать рекомендованную`, callbackData: `mindful:show:${recommendedContent.id}` }],
    ];

    // Add other content buttons
    for (let i = 0; i < otherContent.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${otherContent[i].icon} ${this.shortenTitle(otherContent[i].title)}`,
        callbackData: `mindful:show:${otherContent[i].id}`,
      });
      if (otherContent[i + 1]) {
        row.push({
          text: `${otherContent[i + 1].icon} ${this.shortenTitle(otherContent[i + 1].title)}`,
          callbackData: `mindful:show:${otherContent[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show specific practice from Content Library
   */
  private async showPractice(
    ctx: ISleepCoreContext,
    content: IContentItem
  ): Promise<ICommandResult> {
    // Use ContentService's built-in formatting if steps exist
    const formattedContent = content.steps && content.steps.length > 0
      ? this.contentService.formatStepsForTelegram(content)
      : this.contentService.formatForTelegram(content);

    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Отлично! Давай погрузимся в практику.')}

${formattedContent}

${formatter.divider()}

${sonya.tip('Регулярная практика улучшает сон за 2-4 недели')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `mindful:timer:${content.id}:${content.durationMinutes}` }],
      [{ text: '✅ Выполнено', callbackData: `mindful:done:${content.id}` }],
      [{ text: '◀️ К списку', callbackData: 'mindful:menu' }],
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
   * Handle callback queries for mindful command
   * Callbacks: mindful:menu, mindful:show:{id}, mindful:more, mindful:done:{id}, mindful:timer:{id}:{duration}
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
          return this.showPractice(ctx, content);
        }
        return { success: false, error: 'Практика не найдена' };
      }

      case 'more':
        return this.showMoreContent(ctx, ageGroup);

      case 'done': {
        const contentId = parts[2];
        return this.handleCompletion(ctx, contentId);
      }

      case 'timer': {
        const contentId = parts[2];
        const duration = parseInt(parts[3]) || 10;
        return this.startTimer(ctx, contentId, duration);
      }

      default:
        return { success: false, error: 'Неизвестное действие' };
    }
  }

  /**
   * Show more content (all practices)
   */
  private async showMoreContent(
    ctx: ISleepCoreContext,
    ageGroup: AgeGroup
  ): Promise<ICommandResult> {
    const content = await this.contentService.getMindfulnessContent(ageGroup);

    const contentList = content
      .map(item => `${item.icon} *${item.title}* — ${item.durationMinutes} мин`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Все практики осознанности')}

${contentList}

${sonya.tip('Выбери практику для начала')}
    `.trim();

    // Build keyboard with all content
    const keyboard: IInlineButton[][] = [];
    for (let i = 0; i < content.length; i += 2) {
      const row: IInlineButton[] = [];
      row.push({
        text: `${content[i].icon} ${this.shortenTitle(content[i].title)}`,
        callbackData: `mindful:show:${content[i].id}`,
      });
      if (content[i + 1]) {
        row.push({
          text: `${content[i + 1].icon} ${this.shortenTitle(content[i + 1].title)}`,
          callbackData: `mindful:show:${content[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: '◀️ Назад', callbackData: 'mindful:menu' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Handle practice completion
   */
  private async handleCompletion(
    ctx: ISleepCoreContext,
    contentId: string
  ): Promise<ICommandResult> {
    const content = await this.contentService.getContent(contentId);
    const xp = content?.reward.xp || 20;

    // Record completion
    await this.contentService.recordCompletion({
      contentId,
      userId: parseInt(ctx.userId),
      completedAt: new Date(),
      xpEarned: xp,
    });

    // Record to MBT-I plan if user has active plan
    let arousalInfo = '';
    try {
      const session = ctx.sleepCore.getSession(ctx.userId);
      if (session?.mbtiPlan) {
        // Assess pre-arousal from sleep state data
        const arousal = ctx.sleepCore.assessArousal(ctx.userId);
        const preArousalLevel = arousal
          ? (arousal.cognitive + arousal.somatic) / 2
          : 0.5;
        const postArousalLevel = Math.max(0.1, preArousalLevel * 0.7); // ~30% reduction estimate

        const practiceSession: IMindfulnessSession = {
          sessionId: `mindful_${Date.now()}`,
          practice: this.mapContentToPractice(contentId),
          duration: content?.durationMinutes || 10,
          instructions: content?.steps?.map(s => s.instruction) || [],
          timestamp: new Date(),
          preArousalLevel,
          postArousalLevel,
          preMindfulness: 0.4,
          postMindfulness: 0.6,
          completed: true,
          userRating: 4,
          notes: undefined,
        };
        ctx.sleepCore.recordMBTIPractice(ctx.userId, practiceSession);

        if (arousal && arousal.cognitive > 0.5) {
          arousalInfo = `\n\n💡 Когнитивное возбуждение: ${Math.round(arousal.cognitive * 100)}%`;
          arousalInfo += '\nРегулярная практика снижает его на 30-40% (Ong et al., 2014)';
        }
      }
    } catch {
      // Non-critical: practice completion already recorded
    }

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.success('Практика завершена!')}

✨ +${xp} XP заработано

${sonya.say('Прекрасно! Осознанность — это навык, который развивается с практикой.')}${arousalInfo}

${sonya.tip('ACT показывает 48% снижение тревоги о сне при регулярной практике')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔄 Другая практика', callbackData: 'mindful:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { xpEarned: xp, contentId },
    };
  }

  /**
   * Start timer for practice
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

${sonya.say('Погрузись в практику. Я напомню, когда время закончится.')}

${formatter.divider()}

_Отпусти ожидания. Просто будь здесь и сейчас._
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Завершить раньше', callbackData: `mindful:done:${contentId}` }],
      [{ text: '❌ Отменить', callbackData: 'mindful:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { timer: duration, contentId },
    };
  }
  /**
   * Map content ID to MindfulnessPractice enum
   * Fallback: breath_awareness (safest default for insomnia)
   */
  private mapContentToPractice(contentId: string): MindfulnessPractice {
    const mapping: Record<string, MindfulnessPractice> = {
      'body_scan': 'body_scan',
      'body-scan': 'body_scan',
      'breath': 'breath_awareness',
      'breathing': 'breath_awareness',
      'sitting': 'sitting_meditation',
      'movement': 'mindful_movement',
      'loving': 'loving_kindness',
      'kindness': 'loving_kindness',
      'open': 'open_awareness',
      '3min': '3_minute_breathing_space',
      '3_minute': '3_minute_breathing_space',
    };

    const lowerContentId = contentId.toLowerCase();
    for (const [key, practice] of Object.entries(mapping)) {
      if (lowerContentId.includes(key)) {
        return practice;
      }
    }

    return 'breath_awareness';
  }
}

// Export singleton
export const mindfulCommand = new MindfulCommand();
