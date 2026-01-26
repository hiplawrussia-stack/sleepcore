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
import type { RelaxationTechnique } from '../../cbt-i/interfaces/ICBTIComponents';

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
   * Uses Content Library + RelaxationEngine for dynamic, evidence-based content
   *
   * Research basis (2025-2026):
   * - Furukawa 2024 JAMA: Relaxation NOT effective as standalone for insomnia
   *   BUT useful for sleep onset when combined with SRT/SCT [HIGH confidence]
   * - PMR/AT most evidence-based techniques [HIGH confidence]
   * - Breathing exercises effective for acute anxiety [MEDIUM confidence]
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    // Determine user's age group (default to adult)
    const ageGroup = this.getUserAgeGroup(ctx);

    if (args) {
      // Check if requesting detailed protocol
      if (args.startsWith('protocol:')) {
        const technique = args.replace('protocol:', '') as RelaxationTechnique;
        return this.showDetailedProtocol(ctx, technique);
      }

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

    // Get personalized recommendation using enhanced RelaxationEngine
    // Uses JITAI pattern for just-in-time delivery
    let recommendation = '';
    let recommendedTechniqueId: string | null = null;
    try {
      // Determine context from time of day
      // Map to IRelaxationProtocol targetContext: 'bedtime' | 'daytime' | 'wakeup'
      const hour = new Date().getHours();
      const timeContext: 'bedtime' | 'daytime' | 'wakeup' =
        hour >= 20 || hour < 6 ? 'bedtime' : hour >= 6 && hour < 10 ? 'wakeup' : 'daytime';

      const rec = ctx.sleepCore.getRelaxationRecommendation(ctx.userId, timeContext);
      if (rec) {
        recommendedTechniqueId = this.mapTechniqueToContentId(rec.technique);
        const rationale = 'Подходит для вашего профиля';
        const icon = rec.technique === 'progressive_muscle_relaxation' ? '💪' :
                     rec.technique === 'diaphragmatic_breathing' ? '🌬️' : '🧘';
        recommendation = `
${formatter.header('Персональная рекомендация')}
${icon} *${this.getTechniqueName(rec.technique)}*
_${rationale}_
        `.trim();
      }
    } catch {
      // No personalized recommendation available
    }

    // Build content list (max 5 for progressive disclosure)
    // Mark recommended technique with ⭐ if available
    const displayContent = content.slice(0, 5);
    const contentList = displayContent
      .map(item => {
        const isRecommended = recommendedTechniqueId && item.id === recommendedTechniqueId;
        const recMark = isRecommended ? ' ⭐' : '';
        return `${item.icon} *${item.title}*${recMark} — ${item.durationMinutes} мин`;
      })
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

Расслабление помогает подготовиться ко сну.

${formatter.header('Техники релаксации')}

Выбери технику для практики:

${contentList}

${formatter.divider()}
${recommendation ? '\n' + recommendation + '\n' : ''}
${sonya.tip('Практикуй за 30-60 минут до сна')}

⚠️ _Релаксация эффективна как дополнение к SRT/SCT,
но не как самостоятельное лечение инсомнии (Furukawa 2024)._
    `.trim();

    // Build keyboard dynamically (max 2 buttons per row)
    const keyboard: IInlineButton[][] = [];

    // Add recommended technique button first if available
    if (recommendedTechniqueId) {
      const recContent = displayContent.find(c => c.id === recommendedTechniqueId);
      if (recContent) {
        keyboard.push([{
          text: `⭐ ${recContent.icon} ${this.shortenTitle(recContent.title)} (рекомендовано)`,
          callbackData: `relax:show:${recContent.id}`,
        }]);
      }
    }

    for (let i = 0; i < displayContent.length; i += 2) {
      // Skip if this is the recommended content (already added above)
      const item1 = displayContent[i];
      const item2 = displayContent[i + 1];

      if (recommendedTechniqueId && item1.id === recommendedTechniqueId && !item2) {
        continue; // Skip row if only item is recommended
      }

      const row: IInlineButton[] = [];

      // Add first item if not recommended (already shown above)
      if (!recommendedTechniqueId || item1.id !== recommendedTechniqueId) {
        row.push({
          text: `${item1.icon} ${this.shortenTitle(item1.title)} (${item1.durationMinutes}м)`,
          callbackData: `relax:show:${item1.id}`,
        });
      }

      // Add second item if exists and not recommended
      if (item2 && (!recommendedTechniqueId || item2.id !== recommendedTechniqueId)) {
        row.push({
          text: `${item2.icon} ${this.shortenTitle(item2.title)} (${item2.durationMinutes}м)`,
          callbackData: `relax:show:${item2.id}`,
        });
      }

      if (row.length > 0) {
        keyboard.push(row);
      }
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
   * Enhanced January 2026 with RelaxationEngine protocol option
   */
  private async showTechnique(
    ctx: ISleepCoreContext,
    content: IContentItem
  ): Promise<ICommandResult> {
    // Use ContentService's built-in formatting if steps exist
    const formattedContent = content.steps && content.steps.length > 0
      ? this.contentService.formatStepsForTelegram(content)
      : this.contentService.formatForTelegram(content);

    // Map content ID to technique for protocol lookup
    const techniqueId = this.mapContentIdToTechnique(content.id);

    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Отличный выбор! Начинаем практику.')}

${formattedContent}

${formatter.divider()}

${sonya.tip('Используй эту технику каждый вечер для закрепления навыка')}

⚠️ *Напоминание:* Релаксация эффективна как дополнение к SRT/SCT,
но не как самостоятельное лечение инсомнии (Furukawa 2024).
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `relax:timer:${content.id}:${content.durationMinutes}` }],
    ];

    // Add protocol button if technique is supported by RelaxationEngine
    if (techniqueId) {
      keyboard.push([{
        text: '📋 Детальный протокол',
        callbackData: `relax:protocol:${techniqueId}`,
      }]);
    }

    keyboard.push([{ text: '✅ Выполнено', callbackData: `relax:done:${content.id}` }]);
    keyboard.push([{ text: '◀️ К списку', callbackData: 'relax:menu' }]);

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        contentId: content.id,
        category: content.category,
        xpReward: content.reward.xp,
        techniqueId,
      },
    };
  }

  /**
   * Map Content Library ID to RelaxationEngine technique ID
   */
  private mapContentIdToTechnique(contentId: string): string | null {
    const mapping: Record<string, string> = {
      'pmr-progressive': 'pmr',
      'breathing-478': 'breathing',
      'autogenic-training': 'autogenic',
      'visualization-beach': 'visualization',
      'body-scan': 'body_scan',
      'mindfulness-basic': 'mindfulness',
      'biofeedback-intro': 'biofeedback',
    };
    return mapping[contentId] || null;
  }

  /**
   * Shorten title for button display (max 12 chars)
   */
  private shortenTitle(title: string): string {
    if (title.length <= 12) return title;
    return title.slice(0, 10) + '...';
  }

  /**
   * Map RelaxationEngine technique ID to Content Library ID
   */
  private mapTechniqueToContentId(technique: string): string | null {
    const mapping: Record<string, string> = {
      'pmr': 'pmr-progressive',
      'breathing': 'breathing-478',
      'autogenic': 'autogenic-training',
      'visualization': 'visualization-beach',
      'body_scan': 'body-scan',
      'mindfulness': 'mindfulness-basic',
      'biofeedback': 'biofeedback-intro',
    };
    return mapping[technique] || null;
  }

  /**
   * Get Russian technique name from ID
   */
  private getTechniqueName(technique: string): string {
    const names: Record<string, string> = {
      'pmr': 'Прогрессивная мышечная релаксация (PMR)',
      'breathing': 'Дыхательные упражнения',
      'autogenic': 'Аутогенная тренировка',
      'visualization': 'Визуализация',
      'body_scan': 'Сканирование тела',
      'mindfulness': 'Осознанность',
      'biofeedback': 'Биологическая обратная связь',
    };
    return names[technique] || technique;
  }

  /**
   * Show detailed protocol from RelaxationEngine
   * Uses SleepCoreAPI.getRelaxationProtocol() for evidence-based protocols
   *
   * Research basis (2025-2026):
   * - Jacobson PMR: 16 muscle groups → 7 groups → 4 groups progression [HIGH]
   * - 4-7-8 breathing: Evidence for acute anxiety reduction [MEDIUM]
   * - Autogenic Training: 6 standard exercises (Schultz) [HIGH]
   */
  private async showDetailedProtocol(
    ctx: ISleepCoreContext,
    technique: RelaxationTechnique
  ): Promise<ICommandResult> {
    try {
      // Get user's experience level (default to beginner)
      const session = ctx.sleepCore.getSession(ctx.userId);
      const userLevel = (session as { relaxationLevel?: string })?.relaxationLevel || 'beginner';

      // Get protocol from RelaxationEngine via SleepCoreAPI
      const protocol = ctx.sleepCore.getRelaxationProtocol(
        userLevel as 'beginner' | 'intermediate' | 'advanced',
        'bedtime'
      );

      if (!protocol) {
        return {
          success: false,
          error: 'Протокол не найден',
        };
      }

      // Get step-by-step instructions
      const instructions = ctx.sleepCore.getRelaxationTechniqueInstructions(
        technique,
        protocol.totalDuration || 15
      );

      // Build formatted protocol content
      const stepsContent = instructions.length > 0
        ? instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')
        : 'Следуйте общим инструкциям техники.';

      const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header(`Протокол: ${this.getTechniqueName(technique)}`)}

${formatter.divider()}

📋 *Уровень:* ${userLevel === 'beginner' ? 'Начальный' : userLevel === 'intermediate' ? 'Средний' : 'Продвинутый'}
⏱ *Длительность:* ${protocol.totalDuration || 15} минут

${formatter.divider()}

*Пошаговая инструкция:*

${stepsContent}

${formatter.divider()}

${sonya.tip('Практикуйте ежедневно за 30-60 минут до сна для максимального эффекта')}

⚠️ *Важно:* Релаксация наиболее эффективна в сочетании с
поведенческими техниками (SRT, SCT). Сама по себе не лечит
хроническую инсомнию (Furukawa 2024, JAMA).
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '⏱ Запустить практику', callbackData: `relax:timer:${technique}:${protocol.totalDuration || 15}` }],
        [{ text: '✅ Выполнено', callbackData: `relax:done:${technique}` }],
        [{ text: '◀️ К списку', callbackData: 'relax:menu' }],
      ];

      return {
        success: true,
        message,
        keyboard,
        metadata: {
          technique,
          level: userLevel,
          duration: protocol.totalDuration,
        },
      };
    } catch {
      // Fallback to content library if engine unavailable
      const content = await this.contentService.getContent(technique);
      if (content) {
        return this.showTechnique(ctx, content);
      }
      return {
        success: false,
        error: 'Техника не найдена',
      };
    }
  }

  // ==================== Callback Handlers ====================

  /**
   * Handle callback queries for relax command
   * Callbacks: relax:menu, relax:show:{id}, relax:more, relax:done:{id}, relax:timer:{id}:{duration}, relax:protocol:{technique}
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

      // January 2026: Enhanced protocol from RelaxationEngine
      case 'protocol': {
        const technique = parts[2] as RelaxationTechnique;
        return this.showDetailedProtocol(ctx, technique);
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
