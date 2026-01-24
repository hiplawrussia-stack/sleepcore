/**
 * /explain Command - XAI Explanations for Recommendations
 * ========================================================
 * Provides FDA-compliant explainability for all AI recommendations.
 *
 * Research basis (2025-2026):
 * - FDA AI Guidance 2025: Explainability requirements
 * - NarrativeGenerator for human-readable explanations
 * - Feature attribution for transparency
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

/**
 * Explanation types
 */
type ExplanationType = 'recommendation' | 'prediction' | 'intervention' | 'twin' | 'general';

/**
 * /explain Command Implementation
 * Provides transparent explanations for AI decisions
 */
export class ExplainCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'explain';
  readonly description = 'Объяснение рекомендаций AI';
  readonly aliases = ['почему_так', 'объясни', 'explainability'];
  readonly requiresSession = false;

  // Store last explanation context per user
  private lastContext: Map<string, { type: ExplanationType; data: Record<string, unknown> }> = new Map();

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Check if there's a recent context to explain
    const lastCtx = this.lastContext.get(ctx.userId);

    if (lastCtx) {
      return this.explainContext(ctx, lastCtx.type, lastCtx.data);
    }

    // Show explanation menu
    return this.showExplanationMenu(ctx);
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
    const params = parts.slice(2);

    switch (action) {
      case 'recommendation':
        return this.explainRecommendation(ctx, params[0]);
      case 'prediction':
        return this.explainPrediction(ctx);
      case 'twin':
        return this.explainDigitalTwin(ctx);
      case 'how_ai_works':
        return this.explainHowAIWorks(ctx);
      case 'data_usage':
        return this.explainDataUsage(ctx);
      case 'safety':
        return this.explainSafetyMeasures(ctx);
      case 'limitations':
        return this.explainLimitations(ctx);
      default:
        return this.showExplanationMenu(ctx);
    }
  }

  /**
   * Set context for next explanation
   */
  setContext(userId: string, type: ExplanationType, data: Record<string, unknown>): void {
    this.lastContext.set(userId, { type, data });
  }

  // ==================== Response Handlers ====================

  private async showExplanationMenu(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🔍 Объяснения AI (XAI)')}

Здесь вы можете узнать, как работают рекомендации и почему AI предлагает именно это.

*Выберите тему:*

📊 *Рекомендации* — почему AI советует именно это
🔮 *Прогнозы* — как строятся предсказания
👤 *Цифровой двойник* — что это и как работает
🧠 *Как работает AI* — общие принципы
🔒 *Данные* — как используются ваши данные
⚠️ *Ограничения* — что AI не может

${formatter.divider()}

${sonya.tip('Прозрачность — основа доверия. Спрашивай о чём угодно!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📊 Рекомендации', callbackData: 'explain:recommendation:general' },
        { text: '🔮 Прогнозы', callbackData: 'explain:prediction' },
      ],
      [
        { text: '👤 Цифровой двойник', callbackData: 'explain:twin' },
        { text: '🧠 Как работает AI', callbackData: 'explain:how_ai_works' },
      ],
      [
        { text: '🔒 Использование данных', callbackData: 'explain:data_usage' },
        { text: '⚠️ Ограничения', callbackData: 'explain:limitations' },
      ],
    ];

    return { success: true, message, keyboard };
  }

  private async explainContext(
    ctx: ISleepCoreContext,
    type: ExplanationType,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (type) {
      case 'recommendation':
        return this.explainRecommendation(ctx, data.recommendationId as string);
      case 'prediction':
        return this.explainPrediction(ctx);
      case 'twin':
        return this.explainDigitalTwin(ctx);
      default:
        return this.showExplanationMenu(ctx);
    }
  }

  private async explainRecommendation(
    _ctx: ISleepCoreContext,
    _recommendationId?: string
  ): Promise<ICommandResult> {
    const message = `
${formatter.header('📊 Как формируются рекомендации')}

Каждая рекомендация SleepCore основана на:

*1. Ваших данных:*
• Дневник сна (время, качество, пробуждения)
• Ответы на опросники (ISI, DBAS)
• История взаимодействия с программой

*2. Клинических протоколов CBT-I:*
• Sleep Restriction Therapy (SRT)
• Stimulus Control Therapy (SCT)
• Cognitive Restructuring
• Relaxation Training
• Sleep Hygiene Education

*3. Персонализации через AI:*
• Thompson Sampling для выбора интервенций
• PLRNN для прогнозирования эффекта
• Digital Twin для симуляции сценариев

${formatter.divider()}

*Пример объяснения рекомендации:*

📋 *"Сократить время в кровати до 6.5 часов"*

→ *Почему:* Ваша эффективность сна 72% показывает, что вы проводите время в кровати без сна.

→ *Факторы (вес):*
  • Низкая SE (72%) — 40%
  • Долгое засыпание (45 мин) — 30%
  • Частые пробуждения — 20%
  • Неделя программы (2) — 10%

→ *Ожидаемый эффект:* SE ↑ до 85% за 2 недели

→ *Доказательная база:* Spielman et al. (1987), Morin (2006)

${formatter.divider()}

${sonya.tip('Каждая рекомендация — это не догадка, а расчёт на основе данных и науки!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔮 Как строятся прогнозы?', callbackData: 'explain:prediction' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainPrediction(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🔮 Как строятся прогнозы')}

Прогнозы SleepCore используют *PLRNN* (Piecewise Linear Recurrent Neural Network) — нейросеть, специально созданную для временных рядов в психиатрии.

*Как это работает:*

1️⃣ *Сбор данных*
   Ваш дневник сна → 5D вектор состояния:
   • Эффективность сна (SE)
   • Время засыпания (SOL)
   • Пробуждения ночью (WASO)
   • Общее время сна (TST)
   • Субъективное качество

2️⃣ *Обучение модели*
   PLRNN учится на ваших паттернах:
   • Как SE зависит от SOL
   • Какие дни недели хуже/лучше
   • Как действуют интервенции

3️⃣ *Прогнозирование*
   Модель предсказывает траекторию на 1-7 дней:
   • Точечный прогноз
   • Доверительный интервал 95%
   • Ранние предупреждения

4️⃣ *Калибровка*
   Уверенность модели корректируется:
   • Больше данных → выше уверенность
   • Стабильные паттерны → точнее прогноз

${formatter.divider()}

*Научная основа:*
• npj Digital Medicine 2025: "PLRNNs outperform linear models"
• Durstewitz Lab: dendPLRNN для интерпретируемости

${sonya.tip('Прогноз — это не гадание, а математика на основе твоих реальных данных!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '👤 Цифровой двойник', callbackData: 'explain:twin' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainDigitalTwin(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('👤 Цифровой двойник (Digital Twin)')}

Цифровой двойник — это виртуальная модель вашего сна, которая позволяет:

*🎯 Симулировать сценарии "Что если...":*
• Что если лечь раньше на час?
• Что если добавить релаксацию?
• Что если исключить кофе?

*📈 Отслеживать траекторию:*
• Как меняется сон со временем
• Где находятся "точки перелома"
• Когда ожидать улучшения

*⚠️ Предупреждать о рисках:*
• Раннее обнаружение ухудшения
• Bifurcation analysis (теория хаоса)
• Персональные триггеры

${formatter.divider()}

*Как строится двойник:*

\`\`\`
Ваши данные → Kalman Filter → State Vector
                    ↓
              Monte Carlo → Симуляции
                    ↓
           Bifurcation → Tipping Points
\`\`\`

*Компоненты:*
• KalmanFilterEngine — фильтрация шума
• MonteCarloEngine — симуляция сценариев
• BifurcationEngine — детекция переломов

${formatter.divider()}

*Научная основа:*
• Harvard COMPASS (2025): Interactive patient twins
• JITAI-Twins Framework (MassAITC 2025)

${sonya.tip('Твой цифровой двойник — это зеркало твоего сна, которое видит будущее!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Попробовать /whatif', callbackData: 'whatif:menu' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainHowAIWorks(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🧠 Как работает AI в SleepCore')}

SleepCore использует несколько AI-систем:

*1. CogniCore Engine*
Ядро AI, включающее:
• Thompson Sampling — адаптивный выбор интервенций
• PLRNN — прогнозирование временных рядов
• Causal Discovery — анализ причин
• Explainability — объяснение решений

*2. Constitutional AI*
Этический слой:
• Проверка всех ответов на безопасность
• Предотвращение вредных рекомендаций
• Эскалация к человеку при кризисе

*3. Motivational Interviewing Engine*
Мотивационное интервью:
• Анализ "Change Talk" vs "Sustain Talk"
• Адаптация стиля общения
• MITI 4.2 fidelity tracking

*4. Third-Wave Therapies*
Современные терапии:
• MBT-I (Mindfulness)
• ACT-I (Acceptance)
• MCT (Metacognitive)

${formatter.divider()}

*Принципы работы:*
✅ Все решения основаны на данных
✅ Прозрачность и объяснимость
✅ Безопасность на первом месте
✅ Человек всегда может вмешаться

${sonya.tip('AI — это инструмент, а не замена врача. Он помогает, но не заменяет!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔒 Данные', callbackData: 'explain:data_usage' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainDataUsage(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🔒 Использование ваших данных')}

*Какие данные мы собираем:*
• Дневник сна (время, качество)
• Ответы на опросники
• Взаимодействие с ботом
• Голосовые сообщения (если отправляете)

*Как данные используются:*
✅ Персонализация рекомендаций
✅ Прогнозирование и анализ
✅ Улучшение программы
✅ Научные исследования (анонимно)

*Как данные защищены:*
🔐 Шифрование при передаче и хранении
🔐 Псевдонимизация для исследований
🔐 Соответствие GDPR/ФЗ-152
🔐 Минимизация данных

*Ваши права:*
📋 Запросить копию своих данных
✏️ Исправить неточности
🗑️ Удалить все данные
📤 Экспортировать в формате JSON

${formatter.divider()}

*Кто имеет доступ:*
• Вы — полный доступ
• AI-системы — обработка
• Администраторы — только при кризисе
• Исследователи — только анонимизированно

${sonya.tip('Твои данные — твоя собственность. Мы только храним и обрабатываем их для тебя!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📤 Экспорт данных', callbackData: 'profile:export' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainLimitations(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('⚠️ Ограничения AI')}

Важно понимать, что AI не может:

*❌ Заменить врача:*
• Не ставит диагнозы
• Не назначает лекарства
• Не заменяет очную консультацию

*❌ Гарантировать результат:*
• Эффективность CBT-I ~70-80%
• Индивидуальный ответ варьируется
• Требуется активное участие

*❌ Работать без данных:*
• Нужно минимум 7 дней дневника
• Точность растёт с объёмом данных
• Пропуски снижают качество

*❌ Помочь в кризисе:*
• При суицидальных мыслях — звоните 8-800-2000-122
• AI не заменяет экстренную помощь
• Эскалация к человеку автоматическая

${formatter.divider()}

*Когда обратиться к врачу:*
🚨 Бессонница более 3 месяцев
🚨 Подозрение на апноэ (храп, остановки дыхания)
🚨 Синдром беспокойных ног
🚨 Нарколепсия или другие расстройства
🚨 Сопутствующие заболевания

${formatter.divider()}

${sonya.say('Я — помощник, не врач. Но я делаю всё возможное в своих пределах!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🆘 SOS / Кризис', callbackData: 'sos:menu' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async explainSafetyMeasures(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('🛡️ Меры безопасности')}

SleepCore использует многоуровневую защиту:

*1. Constitutional AI Layer:*
• Все ответы проверяются на безопасность
• Блокировка потенциально вредных советов
• Соблюдение этических принципов

*2. Crisis Detection:*
• Автоматическое обнаружение кризиса
• Ключевые слова + контекстный анализ
• Немедленная эскалация

*3. Human Escalation:*
• При высоком риске — уведомление админа
• Связь с профессионалами
• Горячие линии в ответах

*4. Adverse Event Reporting:*
• Отслеживание побочных эффектов
• CIOMS-совместимая отчётность
• Проактивный мониторинг

${formatter.divider()}

${sonya.tip('Безопасность — приоритет. Если что-то не так, я сразу предупрежу!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🆘 Экстренная помощь', callbackData: 'sos:menu' }],
      [{ text: '← Назад', callbackData: 'explain:menu' }],
    ];

    return { success: true, message, keyboard };
  }
}

// Singleton export
export const explainCommand = new ExplainCommand();
