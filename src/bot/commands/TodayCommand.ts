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
import { sonya } from '../persona';
import {
  sleepPredictionService,
  type ISleepPrediction,
  type ISleepEarlyWarning,
} from '../services/SleepPredictionService';

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

    // Get next intervention (now async with CogniCore Thompson Sampling)
    const intervention = await ctx.sleepCore.getNextIntervention(ctx.userId);
    if (!intervention) {
      return this.showNoIntervention(ctx);
    }

    return this.showIntervention(ctx, intervention);
  }

  // ==================== Response Handlers ====================

  private async showNoSession(_ctx: ISleepCoreContext): Promise<ICommandResult> {
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

  private async showNoIntervention(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.info('Собираем данные')}

Для персональных рекомендаций нужно минимум *7 дней* дневника сна.

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

    // Sonya's greeting
    const greeting = sonya.greet({ timeOfDay: this.getTimeOfDay() });

    // Get Early Warning Signals from PLRNN prediction (short-term)
    const prediction = sleepPredictionService.predict(ctx.userId, 'short');
    const ewsAlert = this.buildEarlyWarningAlert(prediction);

    const message = `
${sonya.emoji} *${sonya.name}*

${greeting.text}
${ewsAlert}
${formatter.header('Задание на сегодня')}

${icon} *${name}*
${timing} | Приоритет: ${priorityStars}

${formatter.divider()}

*Что делать:*
${intervention.action}

${formatter.divider()}

_💡 ${intervention.rationale}_

${sonya.tip('Выполняй задания последовательно для лучшего результата')}
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
      metadata: { intervention, prediction },
    };
  }

  // ==================== Helpers ====================

  private getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'day';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  // ==================== Early Warning Signals ====================

  /**
   * Build Early Warning Signals alert for /today command
   *
   * Research-informed design (2025-2026):
   * - Critical Slowing Down (CSD) is key EWS theory (HIGH confidence, Karger 2016, PNAS 2014)
   * - DON'T use "Critical Slowing Down" terminology with patients
   * - Use actionable, understandable language
   * - Color-code by severity (🟢🟡🟠🔴)
   */
  private buildEarlyWarningAlert(prediction: ISleepPrediction | null): string {
    if (!prediction) {
      return ''; // No prediction available
    }

    // Filter significant warnings (high/critical or high strength)
    const significantWarnings = prediction.earlyWarnings.filter(
      (w) => w.severity === 'high' || w.severity === 'critical' || w.strength > 0.7
    );

    if (significantWarnings.length === 0) {
      return ''; // No significant warnings
    }

    // Build alert block
    const lines: string[] = [];
    lines.push('');
    lines.push(formatter.divider());

    // Show trend context
    const trendIcon = this.getTrendIcon(prediction.trend);
    if (prediction.trend === 'declining' || prediction.trend === 'critical') {
      lines.push(`${trendIcon} *Важное наблюдение:*`);
    } else {
      lines.push(`${trendIcon} *Обратите внимание:*`);
    }

    // Show top 2 warnings with patient-friendly language
    const topWarnings = significantWarnings.slice(0, 2);
    for (const warning of topWarnings) {
      const icon = this.getWarningSeverityIcon(warning.severity);
      // Use Russian message which is already patient-friendly
      lines.push(`${icon} ${warning.messageRu}`);

      // Add actionable recommendation
      if (warning.recommendation && warning.severity !== 'low') {
        lines.push(`   _→ ${warning.recommendation}_`);
      }
    }

    // Add overall risk context if high
    if (prediction.deteriorationRisk > 0.5) {
      lines.push('');
      const riskIcon = prediction.deteriorationRisk > 0.7 ? '🔴' : '🟠';
      lines.push(`${riskIcon} _Сегодня особенно важно следовать программе_`);
    }

    lines.push(formatter.divider());
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get trend icon
   */
  private getTrendIcon(trend: ISleepPrediction['trend']): string {
    switch (trend) {
      case 'improving': return '🟢';
      case 'stable': return '🟡';
      case 'declining': return '🟠';
      case 'critical': return '🔴';
    }
  }

  /**
   * Get warning severity icon
   */
  private getWarningSeverityIcon(severity: ISleepEarlyWarning['severity']): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'moderate': return '🟡';
      default: return '⚪';
    }
  }
}

// Export singleton
export const todayCommand = new TodayCommand();
