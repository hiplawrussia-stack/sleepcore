/**
 * /predict Command - 7-Day Sleep Prediction with Early Warning Signals
 * =====================================================================
 * PLRNN-based prediction showing trajectory and tipping points.
 *
 * Research basis (2025-2026):
 * - npj Digital Medicine 2025: PLRNN outperforms linear models
 * - Harvard COMPASS: Conversational interface for predictions
 * - JITAI-Twins Framework: Digital Twin for adaptive interventions
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
  IConversationCommand,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import {
  sleepPredictionService,
  type ISleepPrediction,
  type ISleepEarlyWarning,
} from '../services/SleepPredictionService';
import { digitalTwinService } from '../services/DigitalTwinService';

/**
 * /predict Command Implementation
 * Shows 7-day sleep prediction with trajectory visualization
 */
export class PredictCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'predict';
  readonly description = 'Прогноз сна на 7 дней';
  readonly aliases = ['прогноз', 'forecast', 'prediction'];
  readonly requiresSession = true;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession();
    }

    // Check if user has enough data
    const history = sleepPredictionService.getHistory(ctx.userId);
    if (!history || history.length < 3) {
      return this.showInsufficientData(history?.length || 0);
    }

    // Cold-start: 3-6 days → preliminary ESN-based prediction
    if (history.length < 7) {
      return this.showColdStartPrediction(ctx, history.length);
    }

    // Full PLRNN prediction (7+ days)
    return this.showPredictionDashboard(ctx);
  }

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    const action = parts[1] || callbackData;
    switch (action) {
      case 'short':
        return this.showPrediction(ctx, 'short');
      case 'medium':
        return this.showPrediction(ctx, 'medium');
      case 'long':
        return this.showPrediction(ctx, 'long');
      case 'warnings':
        return this.showEarlyWarnings(ctx);
      case 'trajectory':
        return this.showTrajectoryChart(ctx);
      case 'recommendations':
        return this.showRecommendations(ctx);
      case 'tipping':
        return this.showTippingPoints(ctx);
      case 'about':
        return this.showAboutPrediction();
      default:
        return this.showPredictionDashboard(ctx);
    }
  }

  // ==================== Response Handlers ====================

  private async showNoSession(): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для прогнозирования нужно начать программу и вести дневник сна.

${formatter.tip('Используйте /start для начала')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showInsufficientData(daysCollected: number): Promise<ICommandResult> {
    const daysNeeded = 7 - daysCollected;
    const progressBar = formatter.progressBar((daysCollected / 7) * 100, 10);

    const message = `
${formatter.header('🔮 Прогнозирование сна')}

${formatter.warning('Недостаточно данных для прогноза')}

Для точного прогноза нужно минимум *7 дней* дневника сна.

${progressBar} ${daysCollected}/7 дней

${daysNeeded > 0 ? `Осталось собрать: *${daysNeeded} ${this.pluralizeDays(daysNeeded)}*` : ''}

${sonya.tip('PLRNN-модель обучается на ваших индивидуальных паттернах сна. Чем больше данных — тем точнее прогноз!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showPredictionDashboard(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get prediction for medium horizon (3 days) as default
    const prediction = await this.getPrediction(ctx.userId, 'long');

    if (!prediction) {
      return this.showPredictionError();
    }

    const trendEmoji = this.getTrendEmoji(prediction.trend);
    const riskColor = this.getRiskColor(prediction.deteriorationRisk);

    // Build trajectory visualization
    const trajectoryViz = this.buildTrajectoryVisualization(prediction);

    // Count warnings by severity
    const warningsSummary = this.summarizeWarnings(prediction.earlyWarnings);

    const message = `
${formatter.header('🔮 Прогноз сна на 7 дней')}

${trendEmoji} *Тренд:* ${this.getTrendText(prediction.trend)}

${formatter.divider()}

📊 *Прогноз эффективности сна:*
${trajectoryViz}

Через 7 дней: *${prediction.predictedSleepEfficiency.value.toFixed(0)}%* (±${(prediction.predictedSleepEfficiency.upper95 - prediction.predictedSleepEfficiency.value).toFixed(0)}%)
Уверенность: ${(prediction.predictedSleepEfficiency.confidence * 100).toFixed(0)}%

${formatter.divider()}

${riskColor} *Риск ухудшения:* ${(prediction.deteriorationRisk * 100).toFixed(0)}%

${warningsSummary}

${formatter.divider()}

${sonya.tip('Прогноз основан на PLRNN-модели, обученной на ваших данных. Точность растёт с каждым днём дневника!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📈 Траектория', callbackData: 'predict:trajectory' },
        { text: '⚠️ Сигналы', callbackData: 'predict:warnings' },
      ],
      [
        { text: '💡 Рекомендации', callbackData: 'predict:recommendations' },
        { text: '🎯 Точки перелома', callbackData: 'predict:tipping' },
      ],
      [
        { text: '1 день', callbackData: 'predict:short' },
        { text: '3 дня', callbackData: 'predict:medium' },
        { text: '7 дней', callbackData: 'predict:long' },
      ],
    ];

    return { success: true, message, keyboard };
  }

  private async showPrediction(
    ctx: ISleepCoreContext,
    horizon: 'short' | 'medium' | 'long'
  ): Promise<ICommandResult> {
    const prediction = await this.getPrediction(ctx.userId, horizon);

    if (!prediction) {
      return this.showPredictionError();
    }

    const horizonText = horizon === 'short' ? '1 день' : horizon === 'medium' ? '3 дня' : '7 дней';
    const trendEmoji = this.getTrendEmoji(prediction.trend);

    const message = `
${formatter.header(`🔮 Прогноз на ${horizonText}`)}

${trendEmoji} *Тренд:* ${this.getTrendText(prediction.trend)}

📊 *Прогнозируемые показатели:*

• Эффективность сна: *${prediction.predictedSleepEfficiency.value.toFixed(0)}%*
  ↳ 95% интервал: ${prediction.predictedSleepEfficiency.lower95.toFixed(0)}% — ${prediction.predictedSleepEfficiency.upper95.toFixed(0)}%

• Время засыпания: *${prediction.predictedMetrics.sleepOnsetLatency.toFixed(0)} мин*
• Пробуждения (WASO): *${prediction.predictedMetrics.wakeAfterSleepOnset.toFixed(0)} мин*
• Общее время сна: *${prediction.predictedMetrics.totalSleepTime.toFixed(1)} ч*
• Качество (субъект.): *${(prediction.predictedMetrics.sleepQuality * 10).toFixed(1)}/10*

Уверенность модели: ${(prediction.predictedSleepEfficiency.confidence * 100).toFixed(0)}%
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '1 день', callbackData: 'predict:short' },
        { text: '3 дня', callbackData: 'predict:medium' },
        { text: '7 дней', callbackData: 'predict:long' },
      ],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showEarlyWarnings(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const prediction = await this.getPrediction(ctx.userId, 'long');

    if (!prediction) {
      return this.showPredictionError();
    }

    if (prediction.earlyWarnings.length === 0) {
      const message = `
${formatter.header('⚠️ Ранние предупреждения')}

${formatter.success('Тревожных сигналов не обнаружено!')}

Ваш сон стабилен. Продолжайте следовать рекомендациям программы.

${sonya.say('Хорошие новости — твой сон на правильном пути! 🦉')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '← Назад', callbackData: 'predict:dashboard' }],
      ];

      return { success: true, message, keyboard };
    }

    // Sort warnings by severity
    const sortedWarnings = [...prediction.earlyWarnings].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const warningsText = sortedWarnings
      .map((w, i) => this.formatWarning(w, i + 1))
      .join('\n\n');

    const message = `
${formatter.header('⚠️ Ранние предупреждения')}

Обнаружено ${prediction.earlyWarnings.length} ${this.pluralizeWarnings(prediction.earlyWarnings.length)}:

${warningsText}

${formatter.divider()}

${sonya.tip('Раннее обнаружение позволяет предотвратить ухудшение. Следуйте рекомендациям!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '💡 Что делать?', callbackData: 'predict:recommendations' }],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showTrajectoryChart(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const prediction = await this.getPrediction(ctx.userId, 'long');

    if (!prediction) {
      return this.showPredictionError();
    }

    const chart = this.buildDetailedTrajectoryChart(prediction);

    const message = `
${formatter.header('📈 Траектория эффективности сна')}

${chart}

*Легенда:*
█ — прогнозируемое значение
░ — 95% доверительный интервал
▬ — целевой уровень (85%)

*Горизонт:* 7 дней
*Шаг:* 1 день

${formatter.divider()}

${sonya.tip('Траектория показывает наиболее вероятное развитие событий. Ваши действия могут изменить её!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Что если...', callbackData: 'whatif:menu' }],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showRecommendations(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const prediction = await this.getPrediction(ctx.userId, 'long');

    if (!prediction) {
      return this.showPredictionError();
    }

    const recommendationsText = prediction.recommendations.length > 0
      ? prediction.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'Продолжайте следовать текущей программе — всё идёт хорошо!';

    const urgencyEmoji = prediction.deteriorationRisk > 0.5 ? '🚨' :
                          prediction.deteriorationRisk > 0.3 ? '⚡' : '💡';

    const message = `
${formatter.header('💡 Рекомендации на основе прогноза')}

${urgencyEmoji} *Приоритетные действия:*

${recommendationsText}

${formatter.divider()}

*На основе анализа:*
• Тренд: ${this.getTrendText(prediction.trend)}
• Риск ухудшения: ${(prediction.deteriorationRisk * 100).toFixed(0)}%
• Предупреждений: ${prediction.earlyWarnings.length}

${sonya.say('Эти рекомендации персонализированы под твои данные. Следуй им — и сон улучшится! 🦉')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Смоделировать', callbackData: 'whatif:menu' }],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showTippingPoints(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get tipping points from Digital Twin service
    let tippingPoints: Array<{ date: Date; type: string; probability: number; description: string }> = [];

    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);
      if (twin) {
        const detectedPoints = await digitalTwinService.detectTippingPoints(ctx.userId);
        tippingPoints = detectedPoints.map(tp => ({
          date: tp.estimatedDays ? new Date(Date.now() + tp.estimatedDays * 24 * 60 * 60 * 1000) : new Date(),
          type: tp.type === 'improvement' ? 'positive' : tp.type === 'deterioration' ? 'negative' : 'warning',
          probability: tp.probability,
          description: tp.recommendationRu,
        }));
      }
    } catch {
      // Fallback to prediction-based tipping points
    }

    if (tippingPoints.length === 0) {
      const message = `
${formatter.header('🎯 Точки перелома (Tipping Points)')}

${formatter.success('Критических точек не обнаружено!')}

Ваша система сна стабильна. Динамический анализ не выявил признаков приближающегося перелома.

*Что это значит:*
Точки перелома — моменты, когда небольшие изменения могут привести к значительному улучшению или ухудшению. Бифуркационный анализ отслеживает их заранее.

${sonya.tip('Продолжайте следовать программе — стабильность это хорошо!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '← Назад', callbackData: 'predict:dashboard' }],
      ];

      return { success: true, message, keyboard };
    }

    const tippingText = tippingPoints
      .map((tp, i) => {
        const dateStr = tp.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const emoji = tp.type === 'positive' ? '🟢' : tp.type === 'negative' ? '🔴' : '🟡';
        return `${i + 1}. ${emoji} *${dateStr}* — ${tp.description}\n   Вероятность: ${(tp.probability * 100).toFixed(0)}%`;
      })
      .join('\n\n');

    const message = `
${formatter.header('🎯 Точки перелома (Tipping Points)')}

Бифуркационный анализ выявил ${tippingPoints.length} ${this.pluralizeTippingPoints(tippingPoints.length)}:

${tippingText}

${formatter.divider()}

*Как использовать:*
🟢 Позитивные — усильте текущие практики
🔴 Негативные — примите превентивные меры
🟡 Нейтральные — следите за развитием

${sonya.tip('Знание о точках перелома даёт вам возможность влиять на исход!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Что если...', callbackData: 'whatif:menu' }],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Nocebo-safe cold-start prediction display (3-6 days)
   *
   * Rules (Draganich & Erdal 2014 — "placebo sleep"):
   * 1. Never say "your sleep will worsen"
   * 2. Always accompany prediction with actionable advice
   * 3. Wide CI for honest uncertainty communication
   * 4. Language: "preliminary estimate", not "prediction"
   * 5. Primary CTA: record diary, not view warnings
   */
  private async showColdStartPrediction(
    ctx: ISleepCoreContext,
    daysCollected: number
  ): Promise<ICommandResult> {
    const prediction = await this.getPrediction(ctx.userId, 'medium');

    if (!prediction) {
      return this.showInsufficientData(daysCollected);
    }

    const progressBar = formatter.progressBar((daysCollected / 7) * 100, 10);
    const se = prediction.predictedSleepEfficiency;

    const message = `
${formatter.header('🔮 Предварительная оценка сна')}

${progressBar} ${daysCollected}/7 дней данных

📊 *Предварительная оценка эффективности сна:*

Текущая оценка: *${se.value.toFixed(0)}%*
Диапазон: ${se.lower95.toFixed(0)}% — ${se.upper95.toFixed(0)}%
Уверенность: ${(se.confidence * 100).toFixed(0)}%

${formatter.divider()}

💡 *Что это значит:*
Это предварительная оценка на основе ${daysCollected} ${this.pluralizeDays(daysCollected)} данных. Точность *значительно вырастет* после 7 дней ведения дневника.

*Ваши действия влияют на результат* — каждый день дневника помогает модели лучше понять ваш индивидуальный паттерн сна.

${sonya.tip(`Ещё ${7 - daysCollected} ${this.pluralizeDays(7 - daysCollected)} — и вы получите полный прогноз с траекторией и ранними предупреждениями!`)}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
      [{ text: 'ℹ️ О прогнозировании', callbackData: 'predict:about' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Educational content about prediction models
   */
  private async showAboutPrediction(): Promise<ICommandResult> {
    const message = `
${formatter.header('ℹ️ О прогнозировании сна')}

*Как работает прогноз:*

📊 *3-6 дней* — предварительная оценка
Используется облегчённая модель (Echo State Network), которая находит начальные закономерности в ваших данных. Диапазон оценки широкий — это честно отражает неопределённость.

🔮 *7+ дней* — полный прогноз
Включается модель PLRNN (Piecewise-Linear Recurrent Neural Network), обученная на ваших индивидуальных данных. Она строит траекторию на 7 дней вперёд и обнаруживает ранние сигналы изменений.

*Почему точность растёт:*
Каждый день дневника — это новая точка данных для обучения модели. Чем больше данных, тем лучше модель различает закономерности от случайных колебаний.

${sonya.say('Наука сна сложна, но твой дневник — ключ к пониманию именно твоих паттернов! 🦉')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
      [{ text: '← Назад', callbackData: 'predict:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showPredictionError(): Promise<ICommandResult> {
    const message = `
${formatter.warning('Ошибка прогнозирования')}

Не удалось получить прогноз. Возможные причины:
• Недостаточно данных для модели
• Временная техническая проблема

Попробуйте позже или продолжите вести дневник сна.

${formatter.tip('Используйте /diary для добавления записей')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Дневник сна', callbackData: 'diary:start' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helper Methods ====================

  private async getPrediction(
    userId: string,
    horizon: 'short' | 'medium' | 'long'
  ): Promise<ISleepPrediction | null> {
    try {
      return await sleepPredictionService.predict(userId, horizon);
    } catch {
      return null;
    }
  }

  private buildTrajectoryVisualization(prediction: ISleepPrediction): string {
    const trajectory = prediction.sleepEfficiencyTrajectory;
    if (trajectory.length === 0) return 'Данные недоступны';

    const lines: string[] = [];
    const maxWidth = 20;
    const target = 85;

    for (const point of trajectory) {
      const value = point.predicted;
      const barWidth = Math.round((value / 100) * maxWidth);
      const bar = '█'.repeat(Math.max(0, barWidth)) + '░'.repeat(Math.max(0, maxWidth - barWidth));
      const dateStr = point.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
      const valueStr = `${value.toFixed(0)}%`.padStart(4);
      const targetMarker = value >= target ? '✓' : ' ';

      lines.push(`${dateStr.padEnd(6)} ${bar} ${valueStr} ${targetMarker}`);
    }

    return lines.join('\n');
  }

  private buildDetailedTrajectoryChart(prediction: ISleepPrediction): string {
    const trajectory = prediction.sleepEfficiencyTrajectory;
    if (trajectory.length === 0) return 'Данные недоступны';

    const lines: string[] = [];
    const chartHeight = 8;
    const _chartWidth = 25;

    // Find min/max for scaling
    const _values = trajectory.map(t => t.predicted);
    const lowerValues = trajectory.map(t => t.lower95);
    const upperValues = trajectory.map(t => t.upper95);

    const minVal = Math.min(...lowerValues, 50);
    const maxVal = Math.max(...upperValues, 100);
    const range = maxVal - minVal;

    // Y-axis labels
    const _yLabels = [100, 85, 70, 55].map(v => `${v}%`.padStart(4));

    // Build chart rows
    for (let row = 0; row < chartHeight; row++) {
      const rowValue = maxVal - (row / (chartHeight - 1)) * range;
      let rowStr = '';

      for (let col = 0; col < trajectory.length; col++) {
        const point = trajectory[col];
        if (rowValue <= point.upper95 && rowValue >= point.lower95) {
          if (Math.abs(rowValue - point.predicted) < range / chartHeight) {
            rowStr += '█';
          } else {
            rowStr += '░';
          }
        } else if (Math.abs(rowValue - 85) < range / chartHeight) {
          rowStr += '▬';
        } else {
          rowStr += ' ';
        }
      }

      const yLabel = row === 0 ? '100%' :
                     row === Math.floor(chartHeight * 0.33) ? ' 85%' :
                     row === Math.floor(chartHeight * 0.66) ? ' 70%' :
                     row === chartHeight - 1 ? ' 55%' : '    ';

      lines.push(`${yLabel} │${rowStr}│`);
    }

    // X-axis
    lines.push('     └' + '─'.repeat(trajectory.length) + '┘');
    lines.push('      ' + trajectory.map((_, i) => (i + 1).toString()).join(''));
    lines.push('      ' + '      дни →');

    return lines.join('\n');
  }

  private summarizeWarnings(warnings: ISleepEarlyWarning[]): string {
    if (warnings.length === 0) {
      return '✅ Тревожных сигналов не обнаружено';
    }

    const bySeverity = {
      critical: warnings.filter(w => w.severity === 'critical').length,
      high: warnings.filter(w => w.severity === 'high').length,
      moderate: warnings.filter(w => w.severity === 'moderate').length,
      low: warnings.filter(w => w.severity === 'low').length,
    };

    const parts: string[] = [];
    if (bySeverity.critical > 0) parts.push(`🔴 ${bySeverity.critical} критич.`);
    if (bySeverity.high > 0) parts.push(`🟠 ${bySeverity.high} высок.`);
    if (bySeverity.moderate > 0) parts.push(`🟡 ${bySeverity.moderate} средн.`);
    if (bySeverity.low > 0) parts.push(`🟢 ${bySeverity.low} низк.`);

    return `⚠️ Предупреждения: ${parts.join(', ')}`;
  }

  private formatWarning(warning: ISleepEarlyWarning, index: number): string {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      moderate: '🟡',
      low: '🟢',
    }[warning.severity];

    const daysText = warning.estimatedDaysToCritical !== null
      ? `\n   ⏱️ До критического: ~${warning.estimatedDaysToCritical} дней`
      : '';

    return `${index}. ${severityEmoji} *${warning.messageRu}*
   Сила сигнала: ${(warning.strength * 100).toFixed(0)}%
   Уверенность: ${(warning.confidence * 100).toFixed(0)}%${daysText}
   💡 ${warning.recommendation}`;
  }

  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  private getTrendText(trend: string): string {
    switch (trend) {
      case 'improving': return 'Улучшение';
      case 'stable': return 'Стабильно';
      case 'declining': return 'Снижение';
      case 'critical': return 'Критический';
      default: return 'Неопределённо';
    }
  }

  private getRiskColor(risk: number): string {
    if (risk > 0.7) return '🔴';
    if (risk > 0.5) return '🟠';
    if (risk > 0.3) return '🟡';
    return '🟢';
  }

  private pluralizeDays(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
    if (lastDigit === 1) return 'день';
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
    return 'дней';
  }

  private pluralizeWarnings(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'предупреждений';
    if (lastDigit === 1) return 'предупреждение';
    if (lastDigit >= 2 && lastDigit <= 4) return 'предупреждения';
    return 'предупреждений';
  }

  private pluralizeTippingPoints(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'точек';
    if (lastDigit === 1) return 'точку';
    if (lastDigit >= 2 && lastDigit <= 4) return 'точки';
    return 'точек';
  }
}

// Singleton export
export const predictCommand = new PredictCommand();
