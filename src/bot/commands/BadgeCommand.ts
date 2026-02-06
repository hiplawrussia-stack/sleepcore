/**
 * /badges Command - Achievement Badge System
 * ==========================================
 * View and manage user badges and achievements.
 *
 * Research basis (Sprint 8 - 2025):
 * - 91% employers actively look for digital credentials
 * - Badge rarity system based on Diablo color hierarchy
 * - White Hat Gamification: meaning, accomplishment, empowerment
 * - SDT alignment: autonomy and relatedness focus
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
// P2-1 fix: Gamification now routed through SleepCoreAPI facade
import type { IBadge, BadgeCategory, BadgeRarity } from '../../modules/quests';

/**
 * /badges Command Implementation
 * Migrated to GamificationEngine for SQLite persistence
 */
export class BadgeCommand implements IConversationCommand {
  readonly name = 'badges';
  readonly description = 'Твои бейджи и достижения';
  readonly aliases = ['badge', 'achievements', 'достижения'];
  readonly requiresSession = false;
  readonly steps = ['list', 'category', 'details'];

  /**
   * Execute the command - show badge collection
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      // Handle subcommands
      const [subcommand] = args.split(' ');
      switch (subcommand) {
        case 'all':
          return this.showAllBadges(ctx);
        case 'progress':
          return this.showProgress(ctx);
        default:
          // Try to interpret as category
          return this.showCategory(ctx, subcommand as BadgeCategory);
      }
    }

    return this.showBadgeCollection(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step) {
      case 'list':
        return this.showBadgeCollection(ctx);
      case 'category':
        return this.showCategory(ctx, data.category as BadgeCategory);
      case 'details':
        return this.showBadgeDetails(ctx, data.badgeId as string);
      default:
        return this.showBadgeCollection(ctx);
    }
  }

  /**
   * Handle callback query
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const [, action, param] = callbackData.split(':');

    switch (action) {
      case 'list':
        return this.showBadgeCollection(ctx);
      case 'all':
        return this.showAllBadges(ctx);
      case 'progress':
        return this.showProgress(ctx);
      case 'category':
        return this.showCategory(ctx, param as BadgeCategory);
      case 'details':
        return this.showBadgeDetails(ctx, param);
      case 'new':
        return this.showNewBadges(ctx);
      default:
        return this.showBadgeCollection(ctx);
    }
  }

  // ==================== Response Handlers ====================

  /**
   * Show badge collection (main view)
   */
  private async showBadgeCollection(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const userBadges = await ctx.sleepCore.getUserBadges(userId);
    const allBadges = await ctx.sleepCore.getAllBadges();
    const totalVisible = allBadges.filter((b) => !b.hidden).length;
    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const newBadges = userBadges.filter((ub) => ub.isNew);

    // Group user badges by category
    const badgesByCategory = new Map<BadgeCategory, number>();
    for (const ub of userBadges) {
      const badge = allBadges.find((b) => b.id === ub.badgeId);
      if (badge) {
        const count = badgesByCategory.get(badge.category) || 0;
        badgesByCategory.set(badge.category, count + 1);
      }
    }

    // Category stats
    const categoryStats: string[] = [];
    const categories: { id: BadgeCategory; name: string; icon: string }[] = [
      { id: 'achievement', name: 'Достижения', icon: '🎯' },
      { id: 'streak', name: 'Серии', icon: '🔥' },
      { id: 'milestone', name: 'Вехи', icon: '📍' },
      { id: 'evolution', name: 'Эволюция', icon: '🌱' },
      { id: 'special', name: 'Особые', icon: '✨' },
    ];

    for (const cat of categories) {
      const userCount = badgesByCategory.get(cat.id) || 0;
      const totalInCategory = allBadges.filter((b) => b.category === cat.id && !b.hidden).length;
      if (totalInCategory > 0) {
        categoryStats.push(`${cat.icon} ${cat.name}: ${userCount}/${totalInCategory}`);
      }
    }

    // Rarity distribution
    const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const ub of userBadges) {
      const badge = allBadges.find((b) => b.id === ub.badgeId);
      if (badge) {
        rarityCount[badge.rarity]++;
      }
    }

    const message = `
🏅 *Твои бейджи*

${userBadges.length === 0 ? `${formatter.info('Пока нет бейджей')}\n\nВыполняй квесты и задания чтобы получить первый бейдж!` : `
📊 *Собрано:* ${userBadges.length}/${totalVisible}
💎 *Всего XP от бейджей:* ${profile.totalBadgeXp}
${newBadges.length > 0 ? `🆕 *Новых:* ${newBadges.length}` : ''}

${formatter.divider()}

*По категориям:*
${categoryStats.join('\n')}

${formatter.divider()}

*По редкости:*
⬜ Обычные: ${rarityCount.common}
🟦 Редкие: ${rarityCount.rare}
🟪 Эпические: ${rarityCount.epic}
🟨 Легендарные: ${rarityCount.legendary}
`}

${formatter.tip('Выбери категорию для подробностей')}
    `.trim();

    const keyboard: IInlineButton[][] = [];

    // New badges button if any
    if (newBadges.length > 0) {
      keyboard.push([{ text: `🆕 Новые бейджи (${newBadges.length})`, callbackData: 'badge:new' }]);
    }

    // Category buttons
    keyboard.push([
      { text: '🎯 Достижения', callbackData: 'badge:category:achievement' },
      { text: '🔥 Серии', callbackData: 'badge:category:streak' },
    ]);
    keyboard.push([
      { text: '📍 Вехи', callbackData: 'badge:category:milestone' },
      { text: '✨ Особые', callbackData: 'badge:category:special' },
    ]);

    keyboard.push([
      { text: '📊 Прогресс', callbackData: 'badge:progress' },
      { text: '📋 Все бейджи', callbackData: 'badge:all' },
    ]);

    keyboard.push([{ text: '🎯 К квестам', callbackData: 'quest:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Show new badges
   */
  private async showNewBadges(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const userBadges = await ctx.sleepCore.getUserBadges(userId);
    const allBadges = await ctx.sleepCore.getAllBadges();
    const newBadges = userBadges.filter((ub) => ub.isNew);

    if (newBadges.length === 0) {
      return this.showBadgeCollection(ctx);
    }

    let badgesText = '';

    for (const ub of newBadges) {
      const badge = allBadges.find((b) => b.id === ub.badgeId);
      if (!badge) continue;

      const rarityLabel = this.getRarityLabel(badge.rarity);

      badgesText += `
${badge.icon} *${badge.name}* 🆕
${badge.description}
${rarityLabel} • +${badge.reward?.xp || 0} XP
      `.trim() + '\n\n';

      // Mark as seen via checkAndAwardBadges (will update notified flag)
      // Note: In a full implementation, we'd have a dedicated markSeen method
    }

    const message = `
🎉 *Новые бейджи!*

${sonya.emoji} _Поздравляю! Ты заработал новые награды!_

${formatter.divider()}

${badgesText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🏅 Все бейджи', callbackData: 'badge:list' }],
      [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badges by category
   */
  private async showCategory(ctx: ISleepCoreContext, category: BadgeCategory): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const allBadges = await ctx.sleepCore.getAllBadges();
    const allInCategory = allBadges.filter((b) => b.category === category && !b.hidden);
    const userBadges = await ctx.sleepCore.getUserBadges(userId);
    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

    const categoryNames: Record<BadgeCategory, string> = {
      achievement: '🎯 Достижения',
      streak: '🔥 Серии',
      milestone: '📍 Вехи',
      evolution: '🌱 Эволюция',
      special: '✨ Особые',
    };

    const categoryDescriptions: Record<BadgeCategory, string> = {
      achievement: 'Награды за выполнение квестов',
      streak: 'Награды за постоянство',
      milestone: 'Отметки о прогрессе',
      evolution: 'Этапы развития Сони',
      special: 'Скрытые и особые награды',
    };

    let badgesText = '';
    const earnedCount = allInCategory.filter((b) => earnedIds.has(b.id)).length;

    for (const badge of allInCategory) {
      const earned = earnedIds.has(badge.id);
      const status = earned ? '✅' : '⬜';
      badgesText += `${status} ${badge.icon} ${badge.name}\n`;
    }

    const message = `
${categoryNames[category]}

_${categoryDescriptions[category]}_

📊 Собрано: ${earnedCount}/${allInCategory.length}

${formatter.divider()}

${badgesText}

${formatter.tip('Нажми на бейдж для подробностей')}
    `.trim();

    // Create buttons for each badge
    const keyboard: IInlineButton[][] = allInCategory.slice(0, 6).map((badge) => {
      const earned = earnedIds.has(badge.id);
      return [{ text: `${earned ? '✅' : '⬜'} ${badge.icon} ${badge.name}`, callbackData: `badge:details:${badge.id}` }];
    });

    keyboard.push([{ text: '◀️ Назад', callbackData: 'badge:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Show all badges
   */
  private async showAllBadges(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const allBadges = (await ctx.sleepCore.getAllBadges()).filter((b) => !b.hidden);
    const userBadges = await ctx.sleepCore.getUserBadges(userId);
    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

    // Group by rarity
    const byRarity: Record<BadgeRarity, IBadge[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };

    for (const badge of allBadges) {
      byRarity[badge.rarity].push(badge);
    }

    let badgesText = '';

    if (byRarity.legendary.length > 0) {
      badgesText += '*🟨 Легендарные:*\n';
      for (const badge of byRarity.legendary) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.epic.length > 0) {
      badgesText += '*🟪 Эпические:*\n';
      for (const badge of byRarity.epic) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.rare.length > 0) {
      badgesText += '*🟦 Редкие:*\n';
      for (const badge of byRarity.rare.slice(0, 5)) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      if (byRarity.rare.length > 5) {
        badgesText += `_...и ещё ${byRarity.rare.length - 5}_\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.common.length > 0) {
      badgesText += '*⬜ Обычные:*\n';
      for (const badge of byRarity.common.slice(0, 5)) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      if (byRarity.common.length > 5) {
        badgesText += `_...и ещё ${byRarity.common.length - 5}_\n`;
      }
    }

    const message = `
📋 *Все бейджи* (${userBadges.length}/${allBadges.length})

${badgesText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badge progress
   */
  private async showProgress(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const allBadges = await ctx.sleepCore.getAllBadges();
    const userBadges = await ctx.sleepCore.getUserBadges(userId);
    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

    // Find badges not yet earned and calculate progress
    // For now, show badges that are close based on profile data
    const unearnedBadges = allBadges.filter((b) => !earnedIds.has(b.id) && !b.hidden);

    // Calculate progress for streak-based badges
    const closeToComplete: { badge: IBadge; progress: number; current: number; target: number }[] = [];

    for (const badge of unearnedBadges) {
      // Check if badge has criteria we can track
      if (badge.criteria) {
        const criteria = badge.criteria;
        let current = 0;
        let target = criteria.value || 1;

        // Match criteria type to profile data
        if (criteria.type === 'streak' && criteria.metric === 'diary_streak') {
          const diaryStreak = profile.streaks.find((s) => s.type === 'sleep_diary');
          current = diaryStreak?.currentCount || 0;
        } else if (criteria.type === 'count' && criteria.metric === 'quests_completed') {
          current = profile.completedQuestCount;
        } else if (criteria.type === 'count' && criteria.metric === 'total_xp') {
          current = profile.totalXp;
          target = criteria.value || 1000;
        } else if (criteria.type === 'count' && criteria.metric === 'days_active') {
          current = profile.totalDaysActive;
        }

        const percentage = Math.min(100, Math.round((current / target) * 100));

        if (percentage >= 30 && percentage < 100) {
          closeToComplete.push({
            badge,
            progress: percentage,
            current,
            target,
          });
        }
      }
    }

    // Sort by progress descending
    closeToComplete.sort((a, b) => b.progress - a.progress);

    if (closeToComplete.length === 0) {
      const message = `
📊 *Прогресс к бейджам*

${formatter.info('Пока нет бейджей близких к получению')}

Продолжай выполнять задания, чтобы приблизиться к наградам!
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
        [{ text: '◀️ Назад', callbackData: 'badge:list' }],
      ];

      return { success: true, message, keyboard };
    }

    let progressText = '';

    for (const item of closeToComplete.slice(0, 5)) {
      const progressBar = formatter.progressBar(item.progress, 8);
      progressText += `
${item.badge.icon} *${item.badge.name}*
${progressBar} ${item.current}/${item.target} (${item.progress}%)
      `.trim() + '\n\n';
    }

    const message = `
📊 *Скоро получишь*

${progressText}

${formatter.tip('Продолжай — ты близко к цели!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
      [{ text: '◀️ Назад', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badge details
   */
  private async showBadgeDetails(ctx: ISleepCoreContext, badgeId: string): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const allBadges = await ctx.sleepCore.getAllBadges();
    const badge = allBadges.find((b) => b.id === badgeId);

    if (!badge) {
      return {
        success: false,
        error: 'Бейдж не найден',
      };
    }

    const hasBadge = await ctx.sleepCore.hasBadge(userId, badgeId);
    const rarityLabel = this.getRarityLabel(badge.rarity);
    const categoryLabel = this.getCategoryLabel(badge.category);

    // Get progress if not earned
    let progressText = '';
    if (!hasBadge && badge.criteria) {
      const profile = await ctx.sleepCore.getPlayerProfile(userId);
      const criteria = badge.criteria;
      let current = 0;
      const target = criteria.value || 1;

      // Match criteria type to profile data
      if (criteria.type === 'streak' && criteria.metric === 'diary_streak') {
        const diaryStreak = profile.streaks.find((s) => s.type === 'sleep_diary');
        current = diaryStreak?.currentCount || 0;
      } else if (criteria.type === 'count' && criteria.metric === 'quests_completed') {
        current = profile.completedQuestCount;
      } else if (criteria.type === 'count' && criteria.metric === 'total_xp') {
        current = profile.totalXp;
      } else if (criteria.type === 'count' && criteria.metric === 'days_active') {
        current = profile.totalDaysActive;
      }

      if (target > 1) {
        const percentage = Math.min(100, Math.round((current / target) * 100));
        const progressBar = formatter.progressBar(percentage, 10);
        progressText = `
${formatter.divider()}

*Прогресс:*
${progressBar} ${current}/${target} (${percentage}%)
        `.trim();
      }
    }

    const message = `
${badge.icon} *${badge.name}* ${hasBadge ? '✅' : ''}

${badge.description}

${formatter.divider()}

📁 ${categoryLabel}
${rarityLabel}
💎 +${badge.reward?.xp || 0} XP
${badge.reward?.title ? `🏆 Титул: "${badge.reward.title}"` : ''}

${hasBadge ? `\n${sonya.emoji} _Этот бейдж у тебя есть!_` : progressText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: `badge:category:${badge.category}` }],
      [{ text: '🏅 Все бейджи', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helpers ====================

  /**
   * Get rarity label with emoji
   */
  private getRarityLabel(rarity: BadgeRarity): string {
    const labels: Record<BadgeRarity, string> = {
      common: '⬜ Обычный',
      rare: '🟦 Редкий',
      epic: '🟪 Эпический',
      legendary: '🟨 Легендарный',
    };
    return labels[rarity];
  }

  /**
   * Get category label
   */
  private getCategoryLabel(category: BadgeCategory): string {
    const labels: Record<BadgeCategory, string> = {
      achievement: '🎯 Достижение',
      streak: '🔥 Серия',
      milestone: '📍 Веха',
      evolution: '🌱 Эволюция',
      special: '✨ Особый',
    };
    return labels[category];
  }
}

// Export singleton
export const badgeCommand = new BadgeCommand();
