/**
 * /today Command - Daily CBT-I Intervention
 * ==========================================
 * Provides personalized daily intervention based on POMDP recommendations.
 *
 * Uses SleepCoreAPI.getNextIntervention() for:
 * - Sleep restriction adjustments
 * - Stimulus control reminders
 * - Cognitive restructuring exercises
 * - Sleep hygiene tips
 * - Relaxation recommendations
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';

/**
 * /today Command Implementation
 */
export class TodayCommand implements ICommand {
  readonly name = 'today';
  readonly description = 'Задание на сегодня';
  readonly aliases = ['daily', 'task', 'сегодня'];
  readonly requiresSession = true;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get session
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession(ctx);
    }

    // Get next intervention
    const intervention = ctx.sleepCore.getNextIntervention(ctx.userId);
    if (!intervention) {
      return this.showNoIntervention(ctx);
    }

    return this.showIntervention(ctx, intervention);
  }

  // ==================== Response Handlers ====================

  private async showNoSession(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для получения персональных рекомендаций нужно:
1. Пройти оценку сна (/start)
2. Вести дневник минимум 7 дней

${formatter.tip('Начните с /diary — записывайте сон каждое утро')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showNoIntervention(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.info('Собираем данные')}

Для персональных рекомендаций нужно минимум <b>7 дней</b> дневника сна.

Пока вы можете:
• Продолжать вести дневник (/diary)
• Изучить техники релаксации (/relax)
• Практиковать осознанность (/mindful)

${formatter.tip('Чем больше данных, тем точнее рекомендации POMDP-алгоритма')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
      [{ text: '🧘 Релаксация', callbackData: 'relax:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showIntervention(
    ctx: ISleepCoreContext,
    intervention: {
      readonly component: string;
      readonly action: string;
      readonly rationale: string;
      readonly priority: number;
      readonly timing: 'immediate' | 'tonight' | 'this_week';
      readonly personalizationScore: number;
    }
  ): Promise<ICommandResult> {
    const componentIcons: Record<string, string> = {
      sleep_restriction: '🛏',
      stimulus_control: '🚪',
      cognitive_restructuring: '🧠',
      sleep_hygiene: '🌙',
      relaxation: '🧘',
    };

    const componentNames: Record<string, string> = {
      sleep_restriction: 'Ограничение сна',
      stimulus_control: 'Контроль стимулов',
      cognitive_restructuring: 'Когнитивная работа',
      sleep_hygiene: 'Гигиена сна',
      relaxation: 'Релаксация',
    };

    const timingLabels: Record<string, string> = {
      immediate: '⚡ Сейчас',
      tonight: '🌙 Сегодня вечером',
      this_week: '📅 На этой неделе',
    };

    const icon = componentIcons[intervention.component] || '📋';
    const name = componentNames[intervention.component] || intervention.component;
    const timing = timingLabels[intervention.timing] || intervention.timing;
    const priorityStars = '⭐'.repeat(intervention.priority);

    const message = `
${formatter.header('Задание на сегодня')}

${icon} <b>${name}</b>
${timing} | Приоритет: ${priorityStars}

${formatter.divider()}

<b>Что делать:</b>
${intervention.action}

${formatter.divider()}

<i>💡 ${intervention.rationale}</i>

${formatter.tip('Выполняйте задания последовательно для лучшего результата')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✅ Выполнено', callbackData: 'today:done' }],
      [{ text: '❓ Нужна помощь', callbackData: 'today:help' }],
      [{ text: '🔄 Другое задание', callbackData: 'today:alternative' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { intervention },
    };
  }
}

// Export singleton
export const todayCommand = new TodayCommand();
