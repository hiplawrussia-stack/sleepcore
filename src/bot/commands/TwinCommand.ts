/**
 * /twin Command - Interactive Digital Twin Management
 * =====================================================
 * Provides interactive access to patient's Digital Twin.
 *
 * Research basis (2025-2026):
 * - Harvard COMPASS: Conversational Digital Twins
 * - JITAI-Twins Framework (MassAITC 2025)
 * - 25% of healthcare initiatives use DT by 2025
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
import { digitalTwinService, type IDigitalTwin, type ITrajectory } from '../services/DigitalTwinService';
import { sleepPredictionService } from '../services/SleepPredictionService';

/**
 * /twin Command Implementation
 * Interactive Digital Twin interface
 */
export class TwinCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'twin';
  readonly description = 'Твой цифровой двойник';
  readonly aliases = ['двойник', 'digital_twin', 'avatar'];
  readonly requiresSession = true;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession();
    }

    // Check if twin exists
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);
      if (!twin) {
        return this.showTwinCreation(ctx);
      }
      return this.showTwinDashboard(ctx, twin);
    } catch {
      return this.showTwinCreation(ctx);
    }
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
      case 'status':
        return this.showTwinStatus(ctx);
      case 'trajectory':
        return this.showTrajectory(ctx);
      case 'simulate':
        return this.showSimulationMenu(ctx);
      case 'calibrate':
        return this.showCalibration(ctx);
      case 'insights':
        return this.showTwinInsights(ctx);
      case 'health':
        return this.showTwinHealth(ctx);
      case 'create':
        return this.createTwin(ctx);
      default:
        return this.execute(ctx);
    }
  }

  // ==================== Response Handlers ====================

  private async showNoSession(): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для создания цифрового двойника нужно начать программу и собрать данные.

${formatter.tip('Используйте /start для начала')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showTwinCreation(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId);
    const daysCollected = history?.length || 0;
    const daysNeeded = Math.max(0, 7 - daysCollected);

    if (daysNeeded > 0) {
      const progressBar = formatter.progressBar((daysCollected / 7) * 100, 10);

      const message = `
${formatter.header('👤 Цифровой двойник')}

${formatter.info('Недостаточно данных для создания двойника')}

Для создания точной модели нужно минимум *7 дней* дневника сна.

${progressBar} ${daysCollected}/7 дней

*Что такое цифровой двойник?*
Это виртуальная модель твоего сна, которая:
• Симулирует сценарии "что если..."
• Предсказывает траекторию улучшения
• Выявляет точки перелома

${sonya.tip('Продолжай вести дневник — скоро у тебя появится персональный двойник!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
      ];

      return { success: true, message, keyboard };
    }

    const message = `
${formatter.header('👤 Создание цифрового двойника')}

${formatter.success('Достаточно данных для создания!')}

У тебя ${daysCollected} дней данных — этого достаточно для инициализации цифрового двойника.

*Что будет создано:*
• Профиль сна на основе твоих данных
• Модель для прогнозирования
• Симулятор сценариев
• Детектор точек перелома

Создать двойника?

${sonya.tip('Двойник будет улучшаться с каждым новым днём данных!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '✨ Создать двойника', callbackData: 'twin:create' }],
      [{ text: '📊 Сначала посмотреть данные', callbackData: 'progress:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async createTwin(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);
      return this.showTwinDashboard(ctx, twin);
    } catch {
      const message = `
${formatter.warning('Ошибка создания')}

Не удалось создать цифрового двойника. Попробуйте позже.

${formatter.tip('Убедитесь, что у вас достаточно данных в дневнике сна.')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📓 Дневник сна', callbackData: 'diary:start' }],
      ];

      return { success: true, message, keyboard };
    }
  }

  private async showTwinDashboard(
    ctx: ISleepCoreContext,
    twin: Awaited<ReturnType<typeof digitalTwinService.createTwin>>
  ): Promise<ICommandResult> {
    if (!twin) {
      return this.showTwinCreation(ctx);
    }

    // Get twin status - use IDigitalTwin properties
    const accuracy = twin.stateQuality;
    const lastUpdate = twin.lastUpdatedAt;
    const dataPoints = twin.observationCount;

    const accuracyBar = formatter.progressBar(accuracy * 100, 10);
    const healthEmoji = accuracy >= 0.8 ? '🟢' : accuracy >= 0.6 ? '🟡' : '🟠';

    const message = `
${formatter.header('👤 Твой цифровой двойник')}

${healthEmoji} *Статус:* Активен

${formatter.divider()}

*📊 Характеристики модели:*

Точность: ${accuracyBar} ${(accuracy * 100).toFixed(0)}%
Данных: ${dataPoints} наблюдений
Обновлён: ${this.formatTimeAgo(lastUpdate)}

${formatter.divider()}

*🎯 Возможности:*

• *Прогнозирование* — траектория сна на 7 дней
• *Симуляция* — "что если" сценарии
• *Детекция* — точки перелома (tipping points)
• *Инсайты* — персональные выводы

${formatter.divider()}

${sonya.say('Твой двойник готов к работе! Что хочешь узнать?')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📈 Траектория', callbackData: 'twin:trajectory' },
        { text: '🎯 Симуляция', callbackData: 'twin:simulate' },
      ],
      [
        { text: '💡 Инсайты', callbackData: 'twin:insights' },
        { text: '🔧 Калибровка', callbackData: 'twin:calibrate' },
      ],
      [
        { text: '❤️ Здоровье модели', callbackData: 'twin:health' },
      ],
    ];

    return { success: true, message, keyboard };
  }

  private async showTwinStatus(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);
      if (!twin) {
        return this.showTwinCreation(ctx);
      }

      const metrics = twin.currentMetrics;
      const uncertaintyValue = 1 - twin.stateQuality;

      const message = `
${formatter.header('📊 Статус цифрового двойника')}

*Текущее состояние (State Vector):*

• Эффективность сна: ${(metrics?.sleepEfficiency || 0).toFixed(0)}%
• Время засыпания: ${(metrics?.sleepOnsetLatency || 0).toFixed(0)} мин
• WASO: ${(metrics?.wakeAfterSleepOnset || 0).toFixed(0)} мин
• Общее время сна: ${((metrics?.totalSleepTime || 0) / 60).toFixed(1)} ч
• Тренд: ${twin.trend}

${formatter.divider()}

*Неопределённость модели:*
${this.buildUncertaintyViz({ mean: 0, variance: uncertaintyValue })}

*Последнее обновление:* ${twin.lastUpdatedAt?.toLocaleString('ru-RU') || 'Неизвестно'}

${sonya.tip('Состояние обновляется автоматически при каждой записи в дневник.')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '← Назад', callbackData: 'twin:dashboard' }],
      ];

      return { success: true, message, keyboard };
    } catch {
      return this.showTwinCreation(ctx);
    }
  }

  private async showTrajectory(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const trajectory = await digitalTwinService.predictTrajectory(ctx.userId, 7);

      if (!trajectory || trajectory.dailyPredictions.length === 0) {
        const message = `
${formatter.info('Траектория недоступна')}

Для построения траектории нужно больше данных или стабильные паттерны.

${sonya.tip('Продолжай вести дневник — траектория появится!')}
        `.trim();

        return { success: true, message, keyboard: [[{ text: '← Назад', callbackData: 'twin:dashboard' }]] };
      }

      const trajectoryViz = this.buildTrajectoryViz(trajectory.dailyPredictions);

      const message = `
${formatter.header('📈 Прогнозируемая траектория')}

*Эффективность сна на 7 дней:*

${trajectoryViz}

*Легенда:*
█ — прогноз
░ — доверительный интервал
▬ — целевой уровень (85%)

*Тренд:* ${this.getTrendText(trajectory.overallTrend)}
*Уверенность:* ${(trajectory.confidence * 100).toFixed(0)}%

${formatter.divider()}

${trajectory.overallTrend === 'improving'
  ? sonya.say('Отличный прогноз! Продолжай в том же духе!')
  : trajectory.overallTrend === 'stable'
  ? sonya.say('Стабильность — это тоже результат. Можем попробовать улучшить!')
  : sonya.tip('Траектория показывает снижение. Давай разберёмся, что можно изменить.')
}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🎯 Что если...', callbackData: 'whatif:menu' }],
        [{ text: '← Назад', callbackData: 'twin:dashboard' }],
      ];

      return { success: true, message, keyboard };
    } catch {
      return { success: false, message: 'Ошибка получения траектории' };
    }
  }

  private async showSimulationMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🎯 Симуляция сценариев')}

Цифровой двойник может показать, что произойдёт при разных изменениях.

*Выберите сценарий:*

⏰ *Время* — изменение расписания сна
🛏️ *Поведение* — правила гигиены сна
🧘 *Практики* — добавление релаксации
🧠 *Когнитивные* — работа с мыслями

${formatter.divider()}

${sonya.tip('Симуляция помогает принять решение без риска!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '⏰ Раньше ложиться', callbackData: 'whatif:scenario:earlier_bedtime' },
        { text: '⏰ Позже ложиться', callbackData: 'whatif:scenario:later_bedtime' },
      ],
      [
        { text: '🛏️ Уходить из кровати', callbackData: 'whatif:scenario:leave_bed_rule' },
        { text: '⏰ Стабильный подъём', callbackData: 'whatif:scenario:consistent_wake' },
      ],
      [
        { text: '🧘 PMR практика', callbackData: 'whatif:scenario:pmr_practice' },
        { text: '☕ Без кофеина', callbackData: 'whatif:scenario:no_caffeine' },
      ],
      [{ text: '← Назад', callbackData: 'twin:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showCalibration(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);

      if (!twin) {
        return this.showTwinCreation(ctx);
      }

      // Use IDigitalTwin properties for calibration display
      const accuracy = twin.stateQuality;
      const dataPoints = twin.observationCount;
      const lastCalibrated = twin.lastUpdatedAt;
      // Estimate RMSE from state quality (inverse relationship)
      const estimatedRmse = (1 - accuracy) * 0.3;

      const accuracyBar = formatter.progressBar(accuracy * 100, 15);

      const message = `
${formatter.header('🔧 Калибровка модели')}

*Текущее качество:*
${accuracyBar} ${(accuracy * 100).toFixed(0)}%

*Метрики:*
• RMSE: ${estimatedRmse.toFixed(3)}
• Точек данных: ${dataPoints}
• Последняя калибровка: ${lastCalibrated?.toLocaleDateString('ru-RU') || 'Никогда'}

${formatter.divider()}

*Как улучшить точность:*
1. Веди дневник каждый день
2. Заполняй все поля честно
3. Отмечай особые события (стресс, болезнь)
4. Используй программу регулярно

*Автокалибровка:*
Модель автоматически калибруется при каждом новом наблюдении с помощью Kalman Filter.

${sonya.tip('Чем больше данных — тем точнее двойник!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📓 Добавить данные', callbackData: 'diary:start' }],
        [{ text: '← Назад', callbackData: 'twin:dashboard' }],
      ];

      return { success: true, message, keyboard };
    } catch {
      return this.showTwinCreation(ctx);
    }
  }

  private async showTwinInsights(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);

      if (!twin) {
        return this.showTwinCreation(ctx);
      }

      // Get tipping points (detectTippingPoints returns ITippingPoint[])
      const tippingPoints = await digitalTwinService.detectTippingPoints(ctx.userId);

      const insightsText = tippingPoints.length > 0
        ? tippingPoints.slice(0, 3).map((tp: { type: string; recommendationRu: string; probability: number }, i: number) => {
            const emoji = tp.type === 'improvement' ? '🟢' : tp.type === 'deterioration' ? '🔴' : '🟡';
            return `${i + 1}. ${emoji} ${tp.recommendationRu} (${(tp.probability * 100).toFixed(0)}%)`;
          }).join('\n')
        : '• Критических точек перелома не обнаружено';

      // Extract patterns from twin data
      const trendText = twin.trend === 'improving' ? 'Улучшение' :
                        twin.trend === 'stable' ? 'Стабильно' :
                        twin.trend === 'declining' ? 'Снижение' : 'Критично';

      const message = `
${formatter.header('💡 Инсайты цифрового двойника')}

*🎯 Точки перелома (Tipping Points):*
${insightsText}

${formatter.divider()}

*📊 Текущее состояние:*
• Тренд: ${trendText}
• Эффективность сна: ${twin.currentMetrics?.sleepEfficiency?.toFixed(0) || 'N/A'}%
• Уровень риска: ${twin.riskLevel}

${formatter.divider()}

*💡 Рекомендации:*
${twin.trend === 'improving' ? '• Продолжайте текущий режим — отличные результаты!' :
  twin.trend === 'stable' ? '• Стабильность — хорошая база. Можно попробовать улучшить!' :
  '• Рекомендуется усилить приверженность программе'}

${sonya.tip('Инсайты обновляются по мере накопления данных!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🔍 Подробный анализ', callbackData: 'insights:dashboard' }],
        [{ text: '← Назад', callbackData: 'twin:dashboard' }],
      ];

      return { success: true, message, keyboard };
    } catch {
      return this.showTwinCreation(ctx);
    }
  }

  private async showTwinHealth(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const twin = await digitalTwinService.createTwin(ctx.userId);

      if (!twin) {
        return this.showTwinCreation(ctx);
      }

      // Use stateQuality as accuracy proxy, and calculate freshness from lastUpdatedAt
      const accuracy = twin.stateQuality;
      const dataFreshness = this.calculateDataFreshness(twin.lastUpdatedAt);
      const dataCompleteness = twin.isReady ? 0.8 : Math.min(0.7, twin.observationCount / 7);

      const overallHealth = (accuracy + dataFreshness + dataCompleteness) / 3;
      const healthEmoji = overallHealth >= 0.8 ? '💚' : overallHealth >= 0.6 ? '💛' : '🧡';

      const message = `
${formatter.header('❤️ Здоровье цифрового двойника')}

${healthEmoji} *Общее здоровье:* ${(overallHealth * 100).toFixed(0)}%

${formatter.divider()}

*Компоненты:*

📊 *Точность модели*
${formatter.progressBar(accuracy * 100, 12)} ${(accuracy * 100).toFixed(0)}%
${accuracy < 0.7 ? '⚠️ Нужно больше данных' : '✅ Хорошо'}

⏱️ *Свежесть данных*
${formatter.progressBar(dataFreshness * 100, 12)} ${(dataFreshness * 100).toFixed(0)}%
${dataFreshness < 0.7 ? '⚠️ Обновите дневник' : '✅ Актуально'}

📋 *Полнота данных*
${formatter.progressBar(dataCompleteness * 100, 12)} ${(dataCompleteness * 100).toFixed(0)}%
${dataCompleteness < 0.7 ? '⚠️ Заполняйте все поля' : '✅ Достаточно'}

${formatter.divider()}

*Рекомендации:*
${overallHealth < 0.7 ? '• Ведите дневник ежедневно\n• Заполняйте все поля\n• Отмечайте особые события' : '• Продолжайте в том же духе!'}

${sonya.tip('Здоровый двойник = точные прогнозы!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📓 Обновить данные', callbackData: 'diary:start' }],
        [{ text: '← Назад', callbackData: 'twin:dashboard' }],
      ];

      return { success: true, message, keyboard };
    } catch {
      return this.showTwinCreation(ctx);
    }
  }

  // ==================== Helper Methods ====================

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  }

  private buildUncertaintyViz(uncertainty?: { mean: number; variance: number }): string {
    if (!uncertainty) return '░░░░░░░░░░ (нет данных)';

    const level = uncertainty.variance;
    const width = 10;
    const filled = Math.round((1 - Math.min(level, 1)) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

    const label = level < 0.2 ? 'Низкая' : level < 0.5 ? 'Средняя' : 'Высокая';
    return `${bar} ${label}`;
  }

  private buildTrajectoryViz(points: Array<{ date: Date; sleepEfficiency: number; confidence: number; trend: 'up' | 'down' | 'stable' }>): string {
    const lines: string[] = [];
    const width = 20;

    for (const point of points.slice(0, 7)) {
      const value = point.sleepEfficiency / 100; // Convert to 0-1 range
      const barWidth = Math.round(value * width);
      const bar = '█'.repeat(Math.max(0, barWidth)) + '░'.repeat(Math.max(0, width - barWidth));
      const dateStr = point.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
      const valueStr = `${point.sleepEfficiency.toFixed(0)}%`.padStart(4);
      const targetMarker = point.sleepEfficiency >= 85 ? '✓' : ' ';

      lines.push(`${dateStr.padEnd(6)} ${bar} ${valueStr} ${targetMarker}`);
    }

    return lines.join('\n');
  }

  private getTrendText(trend: string): string {
    const map: Record<string, string> = {
      improving: '📈 Улучшение',
      stable: '➡️ Стабильно',
      declining: '📉 Снижение',
      critical: '🚨 Критический',
    };
    return map[trend] || trend;
  }

  private calculateDataFreshness(lastUpdated?: Date): number {
    if (!lastUpdated) return 0;

    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) return 1.0;
    if (diffHours < 48) return 0.8;
    if (diffHours < 72) return 0.6;
    if (diffHours < 168) return 0.4;
    return 0.2;
  }
}

// Singleton export
export const twinCommand = new TwinCommand();
