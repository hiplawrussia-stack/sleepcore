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
import {
  sleepPredictionService,
  type ISleepPrediction,
  type ISleepEarlyWarning,
} from '../services/SleepPredictionService';

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

    // Get PLRNN-based 7-day prediction
    const prediction = sleepPredictionService.predict(ctx.userId, 'long');
    const predictionSection = this.buildPredictionSection(prediction);

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

${predictionSection}

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

  // ==================== PLRNN Prediction Section ====================

  /**
   * Build PLRNN prediction visualization section
   * Research-informed design (2025-2026):
   * - Color coding improves risk understanding (HIGH confidence)
   * - Patients prefer simple formats over confidence intervals (HIGH confidence)
   * - Trend emoji provides quick understanding
   */
  private buildPredictionSection(prediction: ISleepPrediction | null): string {
    if (!prediction) {
      return ''; // No prediction available yet
    }

    const lines: string[] = [];
    lines.push(`${formatter.divider()}`);
    lines.push('');
    lines.push('*🔮 Прогноз на 7 дней:*');

    // Trend emoji and color
    const trendInfo = this.getTrendInfo(prediction.trend);
    lines.push(`${trendInfo.icon} Тренд: *${trendInfo.label}*`);

    // Predicted Sleep Efficiency trajectory (simplified, no CI per research)
    lines.push('');
    lines.push('_Прогнозируемая эффективность сна:_');
    lines.push(this.buildPredictionTrajectory(prediction.sleepEfficiencyTrajectory));

    // Show deterioration risk if significant
    if (prediction.deteriorationRisk > 0.3) {
      const riskInfo = this.getRiskInfo(prediction.deteriorationRisk);
      lines.push('');
      lines.push(`${riskInfo.icon} _${riskInfo.label}_`);
    }

    // Early warnings summary (if any)
    if (prediction.earlyWarnings.length > 0) {
      const warningsSummary = this.buildWarningsSummary(prediction.earlyWarnings);
      if (warningsSummary) {
        lines.push('');
        lines.push(warningsSummary);
      }
    }

    // Top recommendation from prediction
    if (prediction.recommendations.length > 0) {
      lines.push('');
      lines.push(`💡 ${prediction.recommendations[0]}`);
    }

    return lines.join('\n');
  }

  /**
   * Get trend information with emoji and label
   */
  private getTrendInfo(trend: ISleepPrediction['trend']): {
    icon: string;
    label: string;
  } {
    switch (trend) {
      case 'improving':
        return { icon: '🟢📈', label: 'Улучшение' };
      case 'stable':
        return { icon: '🟡➡️', label: 'Стабильно' };
      case 'declining':
        return { icon: '🟠📉', label: 'Снижение' };
      case 'critical':
        return { icon: '🔴⚠️', label: 'Требует внимания' };
    }
  }

  /**
   * Get risk level information
   */
  private getRiskInfo(risk: number): {
    icon: string;
    label: string;
  } {
    if (risk >= 0.7) {
      return { icon: '🔴', label: 'Высокий риск ухудшения сна — рекомендуем усилить режим' };
    }
    if (risk >= 0.5) {
      return { icon: '🟠', label: 'Умеренный риск — следите за режимом сна' };
    }
    return { icon: '🟡', label: 'Небольшой риск — продолжайте программу' };
  }

  /**
   * Build simplified prediction trajectory visualization
   * Uses emoji bar instead of numbers with confidence intervals
   * (Research: patients don't like confidence intervals)
   */
  private buildPredictionTrajectory(
    trajectory: ISleepPrediction['sleepEfficiencyTrajectory']
  ): string {
    if (trajectory.length === 0) return 'Недостаточно данных';

    const days = ['Д1', 'Д2', 'Д3', 'Д4', 'Д5', 'Д6', 'Д7'];
    const lines: string[] = [];

    trajectory.slice(0, 7).forEach((point, i) => {
      const dayLabel = days[i] || `Д${i + 1}`;
      const valueRounded = Math.round(point.predicted);
      const seEmoji = this.getSEEmoji(valueRounded);
      const miniBar = this.miniBar(valueRounded);

      lines.push(`${dayLabel}: ${miniBar} ${seEmoji} ${valueRounded}%`);
    });

    return lines.join('\n');
  }

  /**
   * Get SE level emoji indicator
   */
  private getSEEmoji(se: number): string {
    if (se >= 85) return '🟢';
    if (se >= 75) return '🟡';
    if (se >= 65) return '🟠';
    return '🔴';
  }

  /**
   * Build early warnings summary (simplified for patients)
   * Research: Don't use "Critical Slowing Down" terminology
   */
  private buildWarningsSummary(warnings: ISleepEarlyWarning[]): string {
    // Filter to show only significant warnings
    const significantWarnings = warnings.filter(
      w => w.severity === 'high' || w.severity === 'critical' || w.strength > 0.6
    );

    if (significantWarnings.length === 0) return '';

    const lines: string[] = [];
    lines.push('⚠️ *На что обратить внимание:*');

    // Show top 2 warnings max
    significantWarnings.slice(0, 2).forEach(warning => {
      const severityIcon = this.getWarningSeverityIcon(warning.severity);
      lines.push(`${severityIcon} ${warning.messageRu}`);
    });

    return lines.join('\n');
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
export const progressCommand = new ProgressCommand();
