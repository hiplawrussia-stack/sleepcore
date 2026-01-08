/**
 * /progress Command - Weekly Progress Report
 * ==========================================
 * Shows comprehensive progress tracking with visualizations.
 *
 * Research basis:
 * - Weekly progress reports reduce dropout to 12-20% (Sleepio study)
 * - Visual feedback increases engagement (JMIR 2025)
 * - Traffic light indicators (KANOPEE pattern)
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

/**
 * /progress Command Implementation
 */
export class ProgressCommand implements ICommand {
  readonly name = 'progress';
  readonly description = 'Ваш прогресс за неделю';
  readonly aliases = ['stats', 'report', 'прогресс'];
  readonly requiresSession = true;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession(ctx);
    }

    const report = ctx.sleepCore.getProgressReport(ctx.userId);
    if (!report) {
      return this.showInsufficientData(ctx);
    }

    return this.showReport(ctx, report);
  }

  // ==================== Response Handlers ====================

  private async showNoSession(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для отслеживания прогресса нужно начать программу.

${formatter.tip('Используйте /start для начала')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showInsufficientData(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.info('Недостаточно данных')}

Для формирования отчёта нужно минимум *7 дней* дневника сна.

Продолжайте вести дневник каждый день!

${formatter.tip('Чем больше данных, тем точнее аналитика')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showReport(
    ctx: ISleepCoreContext,
    report: {
      currentISI: number;
      isiChange: number;
      currentSleepEfficiency: number;
      sleepEfficiencyChange: number;
      currentWeek: number;
      overallAdherence: number;
      achievements: string[];
      improvements: string[];
      responseStatus: 'responding' | 'partial' | 'non-responding';
    }
  ): Promise<ICommandResult> {
    // Build sleep efficiency trend visualization
    const seTrend = ctx.sleepCore.getSleepEfficiencyTrend(ctx.userId, 7);
    const trendChart = this.buildTrendChart(seTrend);

    // Response status indicator
    const statusInfo = this.getResponseStatusInfo(report.responseStatus);

    // Sonya's encouragement based on therapy week and response
    const weekMessage = sonya.encourageByWeek(report.currentWeek);
    const emotionalResponse = report.responseStatus === 'responding'
      ? sonya.respondToEmotion('positive')
      : report.responseStatus === 'partial'
        ? sonya.respondToEmotion('hopeful')
        : sonya.respondToEmotion('discouraged');

    // ISI change direction
    const isiDirection = report.isiChange > 0 ? '↓' : report.isiChange < 0 ? '↑' : '→';
    const isiChangeText = Math.abs(report.isiChange) > 0
      ? `(${isiDirection}${Math.abs(report.isiChange).toFixed(1)})`
      : '';

    // SE change direction
    const seDirection = report.sleepEfficiencyChange > 0 ? '↑' : report.sleepEfficiencyChange < 0 ? '↓' : '→';
    const seChangeText = Math.abs(report.sleepEfficiencyChange) > 0
      ? `(${seDirection}${Math.abs(report.sleepEfficiencyChange).toFixed(1)}%)`
      : '';

    // Achievements list
    const achievementsList = report.achievements.length > 0
      ? formatter.bulletList(report.achievements.slice(0, 3))
      : 'Пока нет достижений';

    // Improvements list
    const improvementsList = report.improvements.length > 0
      ? formatter.bulletList(report.improvements.slice(0, 3))
      : 'Всё идёт хорошо!';

    const message = `
${sonya.emoji} *${sonya.name}*

${weekMessage.text}

${emotionalResponse.text}

${formatter.header('Еженедельный отчёт')}

${formatter.treatmentWeek(report.currentWeek)}

${formatter.divider()}

*📊 Ключевые метрики:*

${formatter.isiScore(report.currentISI)} ${isiChangeText}

${formatter.sleepEfficiency(report.currentSleepEfficiency)} ${seChangeText}

${formatter.adherence(report.overallAdherence)}

${formatter.divider()}

*📈 Эффективность сна (7 дней):*
${trendChart}

${formatter.divider()}

*🏆 Достижения:*
${achievementsList}

*🎯 Фокус на следующую неделю:*
${improvementsList}

${formatter.divider()}

${statusInfo.icon} *${statusInfo.label}*
_${statusInfo.description}_
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Подробная статистика', callbackData: 'progress:detailed' }],
      [{ text: '📅 Задание на сегодня', callbackData: 'today:show' }],
      [{ text: '📤 Экспорт для врача', callbackData: 'progress:export' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { report },
    };
  }

  // ==================== Helpers ====================

  /**
   * Build ASCII trend chart from SE values
   */
  private buildTrendChart(values: number[]): string {
    if (values.length === 0) return 'Нет данных';

    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const lines: string[] = [];

    // Add values with mini bar
    values.forEach((value, i) => {
      const dayLabel = days[i] || `Д${i + 1}`;
      const bar = this.miniBar(value);
      const valueStr = `${Math.round(value)}%`;
      lines.push(`${dayLabel}: ${bar} ${valueStr}`);
    });

    return lines.join('\n');
  }

  /**
   * Create mini progress bar
   */
  private miniBar(value: number): string {
    const blocks = Math.round(value / 10);
    const filled = '█'.repeat(Math.min(blocks, 10));
    const empty = '░'.repeat(Math.max(10 - blocks, 0));
    return filled + empty;
  }

  /**
   * Get response status info
   */
  private getResponseStatusInfo(status: 'responding' | 'partial' | 'non-responding'): {
    icon: string;
    label: string;
    description: string;
  } {
    switch (status) {
      case 'responding':
        return {
          icon: '🟢',
          label: 'Отличный ответ на терапию',
          description: 'Продолжайте в том же духе! Ваш сон улучшается.',
        };
      case 'partial':
        return {
          icon: '🟡',
          label: 'Частичный ответ',
          description: 'Есть прогресс. Фокусируйтесь на приверженности программе.',
        };
      case 'non-responding':
        return {
          icon: '🟠',
          label: 'Требуется корректировка',
          description: 'Рассмотрим дополнительные подходы (MBT-I, ACT-I).',
        };
    }
  }
}

// Export singleton
export const progressCommand = new ProgressCommand();
