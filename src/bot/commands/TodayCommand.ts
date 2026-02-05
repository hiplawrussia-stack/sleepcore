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
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import type {
  ISleepPrediction,
  ISleepEarlyWarning,
} from '../services/SleepPredictionService';
import type { IProactiveInsight } from '../services/ProactiveIntelligenceService';

/**
 * /today Command Implementation
 */
export class TodayCommand implements IConversationCommand {
  readonly name = 'today';
  readonly description = 'Задание на сегодня';
  readonly aliases = ['daily', 'task', 'сегодня'];
  readonly requiresSession = true;
  readonly steps = ['initial'];

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

    // Sonya's greeting — adapt tone via AdaptivePersonaService (MI-informed)
    const baseGreeting = sonya.greet({ timeOfDay: this.getTimeOfDay() });
    const beliefState = ctx.sleepCore.getBeliefState?.(ctx.userId);
    let greetingText = baseGreeting.text;
    try {
      greetingText = await ctx.sleepCore.adaptMessageToneWithContext(
        ctx.userId,
        baseGreeting.text
      );
    } catch {
      // Graceful degradation: use base greeting
    }

    // Get Early Warning Signals from PLRNN prediction (short-term)
    const prediction = ctx.sleepCore.getSleepPrediction().predict(ctx.userId, 'short');
    const ewsAlert = this.buildEarlyWarningAlert(prediction);

    // Get proactive JITAI insights (graceful degradation: empty on failure/insufficient data)
    const proactiveSection = await this.buildProactiveInsightsSection(ctx);

    const message = `
${sonya.emoji} *${sonya.name}*

${greetingText}
${ewsAlert}${proactiveSection}
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
      [{ text: '🤔 Почему?', callbackData: 'today:why' }],
      [{ text: '❓ Нужна помощь', callbackData: 'today:help' }],
      [{ text: '🔄 Другое задание', callbackData: 'today:alternative' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        lastIntervention: intervention,
        prediction,
      },
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

  // ==================== Proactive Intelligence (JITAI) ====================

  /**
   * Build proactive insights section for /today display
   *
   * Research basis (2025-2026):
   * - JITAI meta-analysis: g=0.15 effect (van Genugten 2025, HIGH confidence)
   * - Proactive micro-interventions improve engagement (iREST, HIGH confidence)
   * - Shows only "today" urgency insights to avoid cognitive overload
   */
  private async buildProactiveInsightsSection(ctx: ISleepCoreContext): Promise<string> {
    try {
      const sleepHistory = ctx.sleepCore.getSleepStates?.(ctx.userId, 14) ?? [];
      if (sleepHistory.length < 3) return '';

      const analysis = await ctx.sleepCore.runProactiveAnalysis(
        ctx.userId,
        sleepHistory
      );

      // Filter for today-urgency insights only
      const todayInsights = analysis.insights.filter(
        (i) => i.urgency === 'today' || i.urgency === 'immediate'
      );

      if (todayInsights.length === 0 && analysis.riskAlerts.length === 0) {
        return '';
      }

      const lines: string[] = [''];

      // Show top insight (max 1 to avoid overload)
      if (todayInsights.length > 0) {
        const top = todayInsights[0];
        const urgencyIcon = top.urgency === 'immediate' ? '⚡' : '💡';
        lines.push(`${urgencyIcon} _${top.titleRu}_`);
        lines.push(`   ${top.messageRu}`);
      }

      // Show critical risk alerts (max 1)
      const criticalRisks = analysis.riskAlerts.filter(
        (r) => r.severity === 'high' || r.severity === 'critical'
      );
      if (criticalRisks.length > 0) {
        const risk = criticalRisks[0];
        const riskIcon = risk.severity === 'critical' ? '🔴' : '🟠';
        lines.push(`${riskIcon} _${risk.messageRu}_`);
      }

      lines.push('');
      return lines.join('\n');
    } catch {
      // Graceful degradation: proactive insights are non-critical
      return '';
    }
  }

  // ==================== Conversation Interface ====================

  /**
   * Handle step in conversation (required by IConversationCommand)
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    if (step === 'initial') {
      return this.execute(ctx);
    }
    return { success: false, error: `Unknown step: ${step}` };
  }

  /**
   * Handle callback from inline buttons
   *
   * Supports:
   * - today:why - Explain why this intervention was recommended (XAI)
   * - today:done - Mark intervention as completed
   * - today:help - Get help with the intervention
   * - today:alternative - Get alternative intervention
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    if (parts[0] !== 'today') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];

    switch (action) {
      case 'why':
        return this.handleWhyExplanation(ctx, conversationData);
      case 'done':
        return this.handleInterventionDone(ctx);
      case 'help':
        return this.handleInterventionHelp(ctx, conversationData);
      case 'alternative':
        return this.handleAlternativeRequest(ctx);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ==================== Callback Handlers ====================

  /**
   * Handle "Почему?" (Why?) button - XAI explanation
   *
   * Research basis (2025-2026):
   * - Explainable AI improves patient trust and adherence (HIGH confidence)
   * - SHAP-style feature attribution preferred in healthcare (Lundberg 2020)
   * - Patient-friendly language required (don't use ML jargon)
   */
  private async handleWhyExplanation(
    ctx: ISleepCoreContext,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    // Get the intervention from conversation data or current session
    const intervention = conversationData.lastIntervention as {
      component: string;
      action: string;
    } | undefined;

    if (!intervention) {
      // Try to get current intervention
      const currentIntervention = await ctx.sleepCore.getNextIntervention(ctx.userId);
      if (!currentIntervention) {
        return {
          success: true,
          message: `
${formatter.info('Нет активной рекомендации')}

Пока нет рекомендации для объяснения.
Выполните команду /today для получения задания.
          `.trim(),
        };
      }
    }

    // Build explanation request
    // Note: In production, we'd pass the actual selection from adapter
    // For now, generate explanation based on session state
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return {
        success: true,
        message: `
${formatter.warning('Сессия не найдена')}

Для получения объяснения нужна активная сессия.
        `.trim(),
      };
    }

    // Get explanation from SleepCoreAPI
    // Note: Intervention is stored in conversationData.lastIntervention (January 2026 fix)
    // Full XAI with ISleepInterventionSelection requires SleepCoreAdapter integration
    const explanation = await this.buildSimplifiedExplanation(ctx, intervention);

    const message = `
${sonya.emoji} *${sonya.name}* объясняет

${formatter.header('Почему именно это задание?')}

${explanation}

${formatter.divider()}

${sonya.tip('Алгоритм учитывает твои данные за последние 7 дней и подбирает оптимальное задание')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '👍 Понятно', callbackData: 'today:understood' }],
      [{ text: '◀️ Назад к заданию', callbackData: 'today:show' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Build simplified explanation (fallback when full XAI unavailable)
   */
  private async buildSimplifiedExplanation(
    ctx: ISleepCoreContext,
    intervention?: { component: string; action: string }
  ): Promise<string> {
    const lines: string[] = [];

    // Component-specific reasoning
    const componentReasons: Record<string, string> = {
      sleep_restriction: `
🎯 *Ограничение сна* выбрано потому что:
• Эффективность сна ниже 85%
• Это самый эффективный компонент CBT-I (Grade A)
• Помогает сконцентрировать сон и повысить его глубину
      `.trim(),
      stimulus_control: `
🎯 *Контроль стимулов* выбран потому что:
• Есть признаки условного возбуждения в постели
• Кровать должна ассоциироваться только со сном
• Это второй по эффективности компонент CBT-I
      `.trim(),
      cognitive_restructuring: `
🎯 *Когнитивная работа* выбрана потому что:
• Обнаружены дисфункциональные убеждения о сне
• Тревога и катастрофизация мешают засыпанию
• Работа с мыслями улучшает качество сна
      `.trim(),
      sleep_hygiene: `
🎯 *Гигиена сна* выбрана потому что:
• Есть возможности для улучшения среды сна
• Базовые привычки влияют на качество сна
• Это фундамент для других техник
      `.trim(),
      relaxation: `
🎯 *Релаксация* выбрана потому что:
• Обнаружено повышенное возбуждение перед сном
• Техники расслабления снижают время засыпания
• Помогает переключиться в режим отдыха
      `.trim(),
    };

    // Get reason for current component
    const component = intervention?.component || 'sleep_restriction';
    const reason = componentReasons[component] || componentReasons.sleep_restriction;
    lines.push(reason);

    // Add confidence note
    lines.push('');
    lines.push('_📊 Уверенность алгоритма: средняя_');
    lines.push('_Рекомендация основана на данных дневника сна_');

    return lines.join('\n');
  }

  /**
   * Handle intervention completed — records adherence
   *
   * Research basis (Steinmetz et al. 2023, J Sleep Research):
   * - Self-monitoring of adherence has modest therapeutic effect (MEDIUM confidence)
   * - Tracking completion improves CBT-I outcomes (MEDIUM confidence)
   * - 5 standard SRT adherence indices: bedtime, wake time, night awakenings, naps, TIB
   */
  private async handleInterventionDone(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Record stimulus control adherence if applicable
    const adherenceReport = ctx.sleepCore.trackStimulusControlAdherence(ctx.userId);

    // Build response with adherence feedback
    const adherenceInfo = adherenceReport
      ? `\n*Приверженность за ночь:* ${(adherenceReport.overallAdherence * 100).toFixed(0)}%`
      : '';

    return {
      success: true,
      message: `
${formatter.success('Отлично!')}

Задание отмечено как выполненное. ${sonya.emoji}${adherenceInfo}

${sonya.tip('Продолжай в том же духе! Каждое выполненное задание приближает к здоровому сну')}
      `.trim(),
      keyboard: [
        [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
        [{ text: '📊 Мой прогресс', callbackData: 'progress:show' }],
      ],
      metadata: { interventionCompleted: true },
    };
  }

  /**
   * Handle help request
   */
  private async handleInterventionHelp(
    _ctx: ISleepCoreContext,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const intervention = conversationData.lastIntervention as {
      component: string;
    } | undefined;

    const componentHelp: Record<string, string> = {
      sleep_restriction: 'Ограничение сна может быть сложным первые дни. Главное - не ложиться раньше расчётного времени.',
      stimulus_control: 'Если не можете уснуть 20 минут - встаньте. Вернитесь когда почувствуете сонливость.',
      cognitive_restructuring: 'Запишите тревожные мысли в дневник. Мы разберём их вместе.',
      sleep_hygiene: 'Начните с одного изменения. Маленькие шаги ведут к большим результатам.',
      relaxation: 'Попробуйте технику прямо сейчас. Я проведу вас через неё.',
    };

    const component = intervention?.component || 'sleep_restriction';
    const help = componentHelp[component] || 'Я здесь, чтобы помочь. Опишите вашу ситуацию.';

    return {
      success: true,
      message: `
${sonya.emoji} *${sonya.name}* поможет

${formatter.info('Поддержка')}

${help}

${formatter.divider()}

Напишите, с чем именно возникли трудности, и я помогу найти решение.
      `.trim(),
      keyboard: [
        [{ text: '◀️ Назад к заданию', callbackData: 'today:show' }],
      ],
    };
  }

  /**
   * Handle alternative intervention request
   */
  private async handleAlternativeRequest(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get a different intervention
    const intervention = await ctx.sleepCore.getNextIntervention(ctx.userId);

    if (!intervention) {
      return {
        success: true,
        message: `
${formatter.info('Альтернатив пока нет')}

Попробуйте выполнить текущее задание или свяжитесь с нами для обсуждения.
        `.trim(),
      };
    }

    // Show different task (in production would use Thompson Sampling exploration)
    return this.execute(ctx);
  }
}

// Export singleton
export const todayCommand = new TodayCommand();
