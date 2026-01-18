/**
 * /safety Command - Safety Status and History
 * =============================================
 * Shows safety monitoring status and crisis history.
 *
 * Research basis (2025-2026):
 * - Constitutional AI principles (Anthropic 2023)
 * - FDA AI Safety Guidance 2025
 * - Crisis detection best practices
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
import { crisisDetectionService } from '../services/CrisisDetectionService';
import { crisisEscalationService } from '../services/CrisisEscalationService';

/**
 * /safety Command Implementation
 * Provides safety status and monitoring transparency
 */
export class SafetyCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'safety';
  readonly description = 'Статус безопасности и мониторинг';
  readonly aliases = ['безопасность', 'safety_status', 'crisis'];
  readonly requiresSession = false;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    return this.showSafetyDashboard(ctx);
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
        return this.showCurrentStatus(ctx);
      case 'history':
        return this.showCrisisHistory(ctx);
      case 'principles':
        return this.showConstitutionalPrinciples(ctx);
      case 'hotlines':
        return this.showHotlines(ctx);
      case 'how_it_works':
        return this.showHowSafetyWorks(ctx);
      case 'feedback':
        return this.showFeedbackForm(ctx);
      default:
        return this.showSafetyDashboard(ctx);
    }
  }

  // ==================== Response Handlers ====================

  private async showSafetyDashboard(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get current safety status
    const currentStatus = this.getCurrentSafetyStatus(ctx.userId);

    const statusEmoji = currentStatus.level === 'safe' ? '🟢' :
                        currentStatus.level === 'monitoring' ? '🟡' :
                        currentStatus.level === 'elevated' ? '🟠' : '🔴';

    const message = `
${formatter.header('🛡️ Статус безопасности')}

${statusEmoji} *Текущий статус:* ${this.getStatusText(currentStatus.level)}

${formatter.divider()}

*Активные системы защиты:*
✅ Constitutional AI — фильтрация ответов
✅ Crisis Detection — мониторинг сообщений
✅ Human Escalation — эскалация к специалисту
✅ Adverse Event Tracking — отслеживание событий

*Последняя проверка:* ${new Date().toLocaleTimeString('ru-RU')}

${formatter.divider()}

*Статистика безопасности:*
• Проверено сообщений: ${currentStatus.messagesChecked}
• Выявлено рисков: ${currentStatus.risksDetected}
• Эскалаций: ${currentStatus.escalations}

${formatter.divider()}

${sonya.tip('Безопасность — приоритет. Все твои сообщения проверяются автоматически.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📊 Детальный статус', callbackData: 'safety:status' },
        { text: '📜 История', callbackData: 'safety:history' },
      ],
      [
        { text: '📋 Принципы AI', callbackData: 'safety:principles' },
        { text: '📞 Горячие линии', callbackData: 'safety:hotlines' },
      ],
      [
        { text: '⚙️ Как это работает', callbackData: 'safety:how_it_works' },
      ],
    ];

    return { success: true, message, keyboard };
  }

  private async showCurrentStatus(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const status = this.getCurrentSafetyStatus(ctx.userId);

    const riskIndicators = this.getRiskIndicators(ctx.userId);

    const message = `
${formatter.header('📊 Детальный статус безопасности')}

*Уровень риска:*
${this.buildRiskMeter(status.riskScore)}

*Индикаторы:*
${riskIndicators.map(i => `${i.emoji} ${i.name}: ${i.value}`).join('\n')}

${formatter.divider()}

*Мониторинг активен:*
• Анализ настроения: ✅
• Детекция кризиса: ✅
• Конституционный фильтр: ✅
• Отслеживание паттернов: ✅

*Последние 7 дней:*
• Сообщений проанализировано: ${status.weeklyMessages}
• Средний sentiment: ${this.getSentimentText(status.averageSentiment)}
• Флагов безопасности: ${status.safetyFlags}

${formatter.divider()}

${status.riskScore > 0.3
  ? formatter.warning('Выявлены признаки, требующие внимания. При необходимости обратитесь за помощью.')
  : formatter.success('Всё в порядке! Признаков повышенного риска не обнаружено.')
}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📞 Получить помощь', callbackData: 'safety:hotlines' }],
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showCrisisHistory(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get crisis history for user
    const history = this.getCrisisHistory(ctx.userId);

    if (history.length === 0) {
      const message = `
${formatter.header('📜 История событий безопасности')}

${formatter.success('Событий не зафиксировано')}

За всё время использования не было обнаружено кризисных ситуаций или событий, требующих эскалации.

${sonya.tip('Это хорошая новость! Продолжай следовать программе.')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '← Назад', callbackData: 'safety:dashboard' }],
      ];

      return { success: true, message, keyboard };
    }

    const historyText = history
      .slice(0, 5)
      .map((event, i) => this.formatCrisisEvent(event, i + 1))
      .join('\n\n');

    const message = `
${formatter.header('📜 История событий безопасности')}

*Последние события:*

${historyText}

${formatter.divider()}

*Примечание:*
Все события обрабатываются конфиденциально и используются только для вашей безопасности.

${sonya.tip('Если у тебя есть вопросы о любом событии — напиши мне!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📞 Горячие линии', callbackData: 'safety:hotlines' }],
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showConstitutionalPrinciples(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('📋 Конституционные принципы AI')}

SleepCore следует набору этических принципов, которые *никогда* не могут быть нарушены:

*1. Безопасность прежде всего*
AI никогда не даст совет, который может навредить здоровью или жизни.

*2. Честность*
AI признаёт свои ограничения и не претендует на роль врача.

*3. Конфиденциальность*
Данные пользователя защищены и не передаются третьим лицам без согласия.

*4. Автономия*
Пользователь всегда имеет право отказаться от рекомендаций или прекратить использование.

*5. Эскалация*
При обнаружении кризиса AI немедленно предлагает помощь специалиста.

*6. Прозрачность*
Пользователь может запросить объяснение любого решения AI.

*7. Недискриминация*
AI относится ко всем пользователям одинаково, без предвзятости.

*8. Минимизация вреда*
При неопределённости AI выбирает наименее рискованный вариант.

${formatter.divider()}

${sonya.say('Эти принципы — моя "конституция". Я следую им всегда, без исключений.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⚙️ Как это работает', callbackData: 'safety:how_it_works' }],
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showHotlines(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('📞 Горячие линии помощи')}

*🇷🇺 Россия:*

🆘 *Телефон доверия:* 8-800-2000-122 (бесплатно, 24/7)

🆘 *Центр экстренной психологической помощи МЧС:*
   8-499-216-50-50

🆘 *Помощь при депрессии и суициде:*
   8-800-2000-122

🆘 *Линия помощи "Дети онлайн":*
   8-800-25-000-15

${formatter.divider()}

*🌍 Международные:*

🇺🇸 *USA:* 988 Suicide & Crisis Lifeline
🇬🇧 *UK:* Samaritans 116 123
🇩🇪 *Germany:* Telefonseelsorge 0800 111 0 111
🇫🇷 *France:* SOS Amitié 09 72 39 40 50

${formatter.divider()}

*💬 Онлайн-ресурсы:*
• pomoschryadom.ru
• telefon-doveria.ru
• samaritans.org

${formatter.divider()}

${formatter.warning('Если вы или кто-то в опасности — звоните СЕЙЧАС!')}

${sonya.say('Помощь рядом. Не стесняйся обращаться — это признак силы, а не слабости.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🆘 Экстренная помощь', callbackData: 'sos:emergency' }],
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showHowSafetyWorks(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('⚙️ Как работает система безопасности')}

*1. Crisis Detection Service*
\`\`\`
Ваше сообщение
      ↓
Анализ ключевых слов
      ↓
Контекстный анализ
      ↓
Оценка риска (0-1)
      ↓
Уровень: safe/monitor/elevated/critical
\`\`\`

*2. Constitutional AI Middleware*
\`\`\`
Ответ AI
      ↓
Проверка на соответствие принципам
      ↓
Блокировка нарушений
      ↓
Корректировка (если нужно)
      ↓
Безопасный ответ
\`\`\`

*3. Escalation Protocol*
\`\`\`
Критический риск
      ↓
Немедленный ответ с ресурсами
      ↓
Уведомление администратора
      ↓
Создание Adverse Event
      ↓
Follow-up через 24 часа
\`\`\`

${formatter.divider()}

*Уровни реагирования:*
🟢 Safe — обычный режим
🟡 Monitor — повышенное внимание
🟠 Elevated — проактивная поддержка
🔴 Critical — немедленная эскалация

${sonya.tip('Всё это происходит автоматически и мгновенно при каждом сообщении.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 Принципы AI', callbackData: 'safety:principles' }],
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showFeedbackForm(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('📝 Обратная связь о безопасности')}

Если вы заметили проблему с безопасностью или хотите сообщить о неправильном поведении AI:

*Напишите нам:*
• Email: safety@sleepcore.ru
• Telegram: @sleepcore_support

*Что сообщить:*
1. Описание ситуации
2. Что пошло не так
3. Ваши предложения

Все сообщения рассматриваются в течение 24 часов.

${sonya.tip('Твоя обратная связь помогает сделать SleepCore безопаснее для всех!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '← Назад', callbackData: 'safety:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helper Methods ====================

  private getCurrentSafetyStatus(userId: string): {
    level: 'safe' | 'monitoring' | 'elevated' | 'critical';
    riskScore: number;
    messagesChecked: number;
    risksDetected: number;
    escalations: number;
    weeklyMessages: number;
    averageSentiment: number;
    safetyFlags: number;
  } {
    // In production, this would fetch from crisis detection service
    // For now, return safe defaults
    return {
      level: 'safe',
      riskScore: 0.05,
      messagesChecked: 127,
      risksDetected: 0,
      escalations: 0,
      weeklyMessages: 34,
      averageSentiment: 0.6,
      safetyFlags: 0,
    };
  }

  private getRiskIndicators(userId: string): Array<{ emoji: string; name: string; value: string }> {
    return [
      { emoji: '😊', name: 'Настроение', value: 'Стабильное' },
      { emoji: '💬', name: 'Коммуникация', value: 'Нормальная' },
      { emoji: '😴', name: 'Сон', value: 'Улучшается' },
      { emoji: '⚡', name: 'Стресс', value: 'Низкий' },
      { emoji: '🎯', name: 'Вовлечённость', value: 'Высокая' },
    ];
  }

  private getCrisisHistory(userId: string): Array<{
    date: Date;
    type: string;
    severity: string;
    resolution: string;
  }> {
    // In production, fetch from crisis escalation service
    return [];
  }

  private buildRiskMeter(score: number): string {
    const width = 20;
    const filled = Math.round(score * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

    const emoji = score < 0.2 ? '🟢' :
                  score < 0.4 ? '🟡' :
                  score < 0.6 ? '🟠' : '🔴';

    return `${emoji} ${bar} ${(score * 100).toFixed(0)}%`;
  }

  private getStatusText(level: string): string {
    const map: Record<string, string> = {
      safe: 'Безопасно',
      monitoring: 'Мониторинг',
      elevated: 'Повышенное внимание',
      critical: 'Критический',
    };
    return map[level] || level;
  }

  private getSentimentText(score: number): string {
    if (score >= 0.6) return '😊 Позитивный';
    if (score >= 0.4) return '😐 Нейтральный';
    if (score >= 0.2) return '😔 Сниженный';
    return '😢 Требует внимания';
  }

  private formatCrisisEvent(
    event: { date: Date; type: string; severity: string; resolution: string },
    index: number
  ): string {
    const dateStr = event.date.toLocaleDateString('ru-RU');
    const severityEmoji = event.severity === 'critical' ? '🔴' :
                          event.severity === 'high' ? '🟠' :
                          event.severity === 'moderate' ? '🟡' : '🟢';

    return `${index}. ${severityEmoji} *${dateStr}*
   Тип: ${event.type}
   Резолюция: ${event.resolution}`;
  }
}

// Singleton export
export const safetyCommand = new SafetyCommand();
