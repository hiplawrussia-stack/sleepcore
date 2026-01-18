/**
 * /insights Command - Personalized Causal Insights
 * ==================================================
 * Shows "Why am I sleeping poorly?" with causal graph visualization.
 *
 * Research basis (2025-2026):
 * - Bayesian Network Analysis for insomnia (BMC Psychiatry 2024)
 * - Graph-Augmented LLMs for health insights (arXiv 2024)
 * - NarrativeGenerator for explainability (FDA XAI requirements 2025)
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
  causalInsightsService,
  type ICausalGraph,
  type IPersonalizedInsight,
  type IInterventionTarget,
  type ICausalFactor,
} from '../services/CausalInsightsService';
import { sleepPredictionService } from '../services/SleepPredictionService';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * Convert sleep history entry to minimal ISleepState for causal analysis
 */
function convertToSleepState(
  entry: ReturnType<typeof sleepPredictionService.getHistory>[0]
): ISleepState {
  return {
    userId: entry.userId,
    timestamp: entry.date,
    date: entry.date.toISOString().split('T')[0],
    metrics: entry.metrics,
    circadian: {
      chronotype: 'intermediate',
      circadianPhase: 12,
      phaseDeviation: 0,
      lightExposure: 0,
      estimatedMelatoninOnset: '21:00',
      socialJetLag: 0,
    },
    homeostasis: {
      sleepDebt: 0,
      sleepPressure: 0.5,
      averageSOL: entry.metrics.sleepOnsetLatency,
      averageWASO: entry.metrics.wakeAfterSleepOnset,
      recentSEHistory: [entry.metrics.sleepEfficiency],
      seVariability: 0,
    },
    insomnia: {
      subtype: 'none',
      isiScore: 7,
      severity: 'none',
      duration: 'acute',
      primaryMaintainingFactor: 'none',
      comorbidities: [],
    },
    behaviors: {
      bedtimeConsistency: 0.8,
      wakeTimeConsistency: 0.8,
      preSleepActivities: [],
      caffeineIntake: { lastIntakeHoursBeforeBed: 6, dailyMgTotal: 100 },
      alcoholIntake: { lastIntakeHoursBeforeBed: 4, standardDrinks: 0 },
      exerciseToday: false,
      screenTimeBeforeBed: 30,
      napsToday: [],
      bedroomUsage: ['sleep'],
    },
    cognitions: {
      dysfunctionalBeliefs: { dbas16Score: 30, dominantBeliefs: [] },
      sleepAnxiety: 0.3,
      rumination: 0.3,
      catastrophizing: 0.2,
      performanceAnxiety: 0.2,
      controlBeliefs: 0.5,
    },
    subjectiveQuality: 'fair',
    daytimeFunctioning: {
      fatigue: 0.3,
      sleepiness: 0.3,
      concentration: 0.7,
      mood: 0.7,
      physicalEnergy: 0.7,
      socialFunctioning: 0.8,
    },
    morningAlertness: 0.7,
    daytimeSleepiness: 0.3,
    sleepHealthScore: entry.metrics.sleepEfficiency,
    trend: 'stable' as const,
    interventionHistory: [],
    lastISIAssessment: null,
  } as unknown as ISleepState;
}

/**
 * /insights Command Implementation
 * Provides personalized causal analysis of sleep problems
 */
export class InsightsCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'insights';
  readonly description = 'Почему я плохо сплю? — персональный анализ';
  readonly aliases = ['why', 'почему', 'причины', 'анализ'];
  readonly requiresSession = true;

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const session = ctx.sleepCore.getSession(ctx.userId);
    if (!session) {
      return this.showNoSession();
    }

    // Check if user has enough data (14 days minimum for causal analysis)
    const rawHistory = sleepPredictionService.getHistory(ctx.userId);
    if (!rawHistory || rawHistory.length < 14) {
      return this.showInsufficientData(rawHistory?.length || 0);
    }

    return this.showInsightsDashboard(ctx);
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
      case 'causes':
        return this.showTopCauses(ctx);
      case 'graph':
        return this.showCausalGraph(ctx);
      case 'patterns':
        return this.showPatterns(ctx);
      case 'target':
        return this.showInterventionTarget(ctx);
      case 'factor':
        return this.showFactorDetail(ctx, params[0]);
      default:
        return this.showInsightsDashboard(ctx);
    }
  }

  // ==================== Response Handlers ====================

  private async showNoSession(): Promise<ICommandResult> {
    const message = `
${formatter.warning('Сессия не найдена')}

Для анализа причин нарушения сна нужно начать программу и вести дневник.

${formatter.tip('Используйте /start для начала')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🚀 Начать программу', callbackData: 'start:begin' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showInsufficientData(daysCollected: number): Promise<ICommandResult> {
    const daysNeeded = 14 - daysCollected;
    const progressBar = formatter.progressBar((daysCollected / 14) * 100, 10);

    const message = `
${formatter.header('🔍 Анализ причин')}

${formatter.warning('Недостаточно данных для каузального анализа')}

Для выявления индивидуальных причин нужно минимум *14 дней* дневника сна.

${progressBar} ${daysCollected}/14 дней

${daysNeeded > 0 ? `Осталось: *${daysNeeded} ${this.pluralizeDays(daysNeeded)}*` : ''}

*Почему 14 дней?*
• Нужно выявить паттерны, а не случайные совпадения
• Требуется достаточно данных для статистики
• Важно охватить разные условия (будни/выходные)

${sonya.tip('Продолжай вести дневник — скоро я смогу сказать, что именно мешает твоему сну!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Записать сон', callbackData: 'diary:start' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showInsightsDashboard(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history) {
      return this.showInsufficientData(0);
    }

    // Generate insights
    let insights: IPersonalizedInsight[] = [];
    let target: IInterventionTarget | null = null;

    try {
      insights = await causalInsightsService.generateInsights(ctx.userId, history);
      target = await causalInsightsService.suggestInterventionTarget(ctx.userId, history);
    } catch (error) {
      return this.showAnalysisError();
    }

    // Get top 3 insights
    const topInsights = insights.slice(0, 3);

    // Format insights summary
    const insightsSummary = topInsights.length > 0
      ? topInsights.map((insight, i) => this.formatInsightBrief(insight, i + 1)).join('\n\n')
      : 'Пока недостаточно данных для выводов.';

    // Target recommendation
    const targetText = target
      ? `\n${formatter.divider()}\n\n🎯 *Главная точка воздействия:*\n${this.formatTargetBrief(target)}`
      : '';

    const message = `
${formatter.header('🔍 Почему я плохо сплю?')}

${formatter.info(`Анализ на основе ${history.length} дней данных`)}

*Ключевые находки:*

${insightsSummary}
${targetText}

${formatter.divider()}

${sonya.say('Это персональный анализ твоих данных. Нажми на кнопки ниже для подробностей!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📊 Причины', callbackData: 'insights:causes' },
        { text: '🕸️ Граф связей', callbackData: 'insights:graph' },
      ],
      [
        { text: '🔄 Паттерны', callbackData: 'insights:patterns' },
        { text: '🎯 Точка воздействия', callbackData: 'insights:target' },
      ],
      [{ text: '🎯 Что если...', callbackData: 'whatif:menu' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showTopCauses(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history) {
      return this.showInsufficientData(0);
    }

    let causes: ICausalFactor[] = [];
    try {
      causes = await causalInsightsService.getTopCauses(ctx.userId, history, 'poor_efficiency');
    } catch {
      return this.showAnalysisError();
    }

    if (causes.length === 0) {
      const message = `
${formatter.header('📊 Причины проблем со сном')}

${formatter.success('Явных причин не выявлено!')}

Ваши данные не показывают сильных негативных факторов. Это хороший знак!

${sonya.tip('Продолжайте следовать программе для закрепления результата.')}
      `.trim();

      return { success: true, message, keyboard: [[{ text: '← Назад', callbackData: 'insights:dashboard' }]] };
    }

    const causesText = causes
      .slice(0, 5)
      .map((cause, i) => this.formatCauseFull(cause, i + 1))
      .join('\n\n');

    const message = `
${formatter.header('📊 Топ причин проблем со сном')}

На основе анализа ${history.length} дней выявлено:

${causesText}

${formatter.divider()}

*Как читать:*
• Сила влияния показывает связь с качеством сна
• Уверенность — надёжность вывода
• 📈/📉 — положительное/отрицательное влияние

${sonya.tip('Нажми на причину для подробностей и рекомендаций!')}
    `.trim();

    const buttons: IInlineButton[][] = causes.slice(0, 5).map(cause => [
      { text: `${cause.emoji} ${cause.nameRu}`, callbackData: `insights:factor:${cause.id}` },
    ]);
    buttons.push([{ text: '← Назад', callbackData: 'insights:dashboard' }]);

    return { success: true, message, keyboard: buttons };
  }

  private async showCausalGraph(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history) {
      return this.showInsufficientData(0);
    }

    let graph: ICausalGraph | null = null;
    try {
      graph = await causalInsightsService.discoverCausalGraph(ctx.userId, history);
    } catch {
      return this.showAnalysisError();
    }

    if (!graph) {
      return this.showAnalysisError();
    }

    // Build ASCII visualization of the graph
    const graphViz = this.buildGraphVisualization(graph);

    const message = `
${formatter.header('🕸️ Граф причинно-следственных связей')}

${graphViz}

*Легенда:*
→ = влияет на
⇄ = взаимное влияние
━ = сильная связь
─ = слабая связь

*Качество данных:*
• Дней: ${graph.dataQuality.totalDays}
• Полнота: ${(graph.dataQuality.completeness * 100).toFixed(0)}%
• Достаточно: ${graph.dataQuality.sufficientData ? '✅' : '⚠️'}

${formatter.divider()}

${sonya.tip('Граф показывает, как факторы влияют друг на друга. Ищи ключевые узлы!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📊 Причины', callbackData: 'insights:causes' }],
      [{ text: '← Назад', callbackData: 'insights:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showPatterns(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history) {
      return this.showInsufficientData(0);
    }

    let insights: IPersonalizedInsight[] = [];
    try {
      insights = await causalInsightsService.generateInsights(ctx.userId, history);
    } catch {
      return this.showAnalysisError();
    }

    const patterns = insights.filter(i => i.category === 'pattern');

    if (patterns.length === 0) {
      const message = `
${formatter.header('🔄 Паттерны сна')}

${formatter.info('Явных паттернов пока не выявлено')}

Для обнаружения устойчивых паттернов нужно больше данных и времени.

${sonya.tip('Продолжай вести дневник — паттерны проявятся!')}
      `.trim();

      return { success: true, message, keyboard: [[{ text: '← Назад', callbackData: 'insights:dashboard' }]] };
    }

    const patternsText = patterns
      .slice(0, 4)
      .map((p, i) => this.formatPatternFull(p, i + 1))
      .join('\n\n');

    const message = `
${formatter.header('🔄 Выявленные паттерны')}

${patternsText}

${formatter.divider()}

*Что такое паттерн?*
Паттерн — это устойчивая закономерность в ваших данных, которая повторяется регулярно.

${sonya.tip('Понимание паттернов помогает предсказывать и управлять сном!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '← Назад', callbackData: 'insights:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showInterventionTarget(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history) {
      return this.showInsufficientData(0);
    }

    let target: IInterventionTarget | null = null;
    try {
      target = await causalInsightsService.suggestInterventionTarget(ctx.userId, history);
    } catch {
      return this.showAnalysisError();
    }

    if (!target) {
      const message = `
${formatter.header('🎯 Точка воздействия')}

${formatter.info('Пока не удалось определить оптимальную точку')}

Возможные причины:
• Данных недостаточно для уверенного вывода
• Несколько факторов имеют равное влияние

${sonya.tip('Продолжай программу — анализ станет точнее!')}
      `.trim();

      return { success: true, message, keyboard: [[{ text: '← Назад', callbackData: 'insights:dashboard' }]] };
    }

    // Calculate difficulty from modifiability (inverse relationship)
    const difficulty = target.modifiability > 0.7 ? 'easy' : target.modifiability > 0.4 ? 'medium' : 'hard';
    const difficultyEmoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
    const factorEmoji = this.getFactorEmoji(target.factorId);
    const factorName = this.getFactorName(target.factorId);

    const message = `
${formatter.header('🎯 Главная точка воздействия')}

${factorEmoji} *${factorName}*

Именно на этот фактор стоит обратить внимание в первую очередь!

${formatter.divider()}

*Почему именно это?*
• Ожидаемое улучшение SE: *+${(target.expectedImpact * 100).toFixed(0)}%*
• Изменяемость: ${(target.modifiability * 100).toFixed(0)}% (насколько легко изменить)
• ${difficultyEmoji} Сложность: ${this.getDifficultyText(difficulty)}
• Приоритет: ${(target.priorityScore * 100).toFixed(0)}%

${formatter.divider()}

*Рекомендация:*
${target.interventionRu}

${formatter.divider()}

${sonya.say('Фокусируйся на одном факторе за раз — это эффективнее, чем менять всё сразу!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Смоделировать', callbackData: `whatif:scenario:${target.factorId}` }],
      [{ text: '← Назад', callbackData: 'insights:dashboard' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showFactorDetail(ctx: ISleepCoreContext, factorId: string): Promise<ICommandResult> {
    const history = sleepPredictionService.getHistory(ctx.userId).map(convertToSleepState);
    if (!history || !factorId) {
      return this.showInsightsDashboard(ctx);
    }

    let graph: ICausalGraph | null = null;
    try {
      graph = await causalInsightsService.discoverCausalGraph(ctx.userId, history);
    } catch {
      return this.showAnalysisError();
    }

    if (!graph) {
      return this.showAnalysisError();
    }

    const factor = graph.nodes.find(n => n.id === factorId);
    if (!factor) {
      return this.showInsightsDashboard(ctx);
    }

    // Find connected factors
    const connectedEdges = graph.edges.filter(e => e.from === factorId || e.to === factorId);
    const connectedFactors = connectedEdges.map(e => {
      const otherId = e.from === factorId ? e.to : e.from;
      const otherFactor = graph!.nodes.find(n => n.id === otherId);
      return {
        factor: otherFactor,
        edge: e,
        direction: e.from === factorId ? 'outgoing' : 'incoming',
      };
    }).filter(c => c.factor);

    const impactEmoji = factor.impact > 0 ? '📈' : factor.impact < 0 ? '📉' : '➡️';
    const impactText = factor.impact > 0 ? 'Положительное' : factor.impact < 0 ? 'Отрицательное' : 'Нейтральное';

    const connectionsText = connectedFactors.length > 0
      ? connectedFactors.map(c => {
          const arrow = c.direction === 'outgoing' ? '→' : '←';
          return `  ${arrow} ${c.factor!.emoji} ${c.factor!.nameRu} (${(c.edge.strength * 100).toFixed(0)}%)`;
        }).join('\n')
      : '  Прямых связей не обнаружено';

    const message = `
${formatter.header(`${factor.emoji} ${factor.nameRu}`)}

*Категория:* ${this.getCategoryText(factor.category)}
*Тип влияния:* ${impactEmoji} ${impactText}

${formatter.divider()}

*Статистика:*
• Сила влияния: ${(Math.abs(factor.impact) * 100).toFixed(0)}%
• Статистическая связь: ${(factor.strength * 100).toFixed(0)}%
• Временная уверенность: ${(factor.temporalConfidence * 100).toFixed(0)}%
• Тип доказательства: ${this.getEvidenceTypeText(factor.evidenceType)}

${formatter.divider()}

*Связи с другими факторами:*
${connectionsText}

${formatter.divider()}

${sonya.tip('Понимание связей помогает выбрать, на что воздействовать!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 Смоделировать изменение', callbackData: `whatif:scenario:${factorId}` }],
      [{ text: '← К причинам', callbackData: 'insights:causes' }],
    ];

    return { success: true, message, keyboard };
  }

  private async showAnalysisError(): Promise<ICommandResult> {
    const message = `
${formatter.warning('Ошибка анализа')}

Не удалось выполнить каузальный анализ. Возможные причины:
• Данные требуют больше разнообразия
• Временная техническая проблема

Попробуйте позже или продолжите вести дневник.

${formatter.tip('Используйте /diary для добавления записей')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Дневник сна', callbackData: 'diary:start' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Formatting Helpers ====================

  private formatInsightBrief(insight: IPersonalizedInsight, index: number): string {
    const confidenceEmoji = insight.confidence === 'high' ? '🟢' :
                            insight.confidence === 'medium' ? '🟡' : '🟠';

    return `${index}. ${confidenceEmoji} *${insight.titleRu}*
   ${insight.explanationRu.slice(0, 80)}${insight.explanationRu.length > 80 ? '...' : ''}`;
  }

  private formatTargetBrief(target: IInterventionTarget): string {
    const emoji = this.getFactorEmoji(target.factorId);
    const name = this.getFactorName(target.factorId);
    return `${emoji} *${name}*
Ожидаемое улучшение: +${(target.expectedImpact * 100).toFixed(0)}% SE`;
  }

  private getFactorEmoji(factorId: string): string {
    const emojiMap: Record<string, string> = {
      'bedtime_variability': '🕐',
      'screen_time': '📱',
      'caffeine': '☕',
      'alcohol': '🍷',
      'exercise': '🏃',
      'stress': '😰',
      'naps': '😴',
      'sleep_environment': '🛏️',
      'sleep_anxiety': '😟',
      'rumination': '🔄',
      'default': '📊',
    };
    return emojiMap[factorId] || emojiMap['default'];
  }

  private getFactorName(factorId: string): string {
    const nameMap: Record<string, string> = {
      'bedtime_variability': 'Нерегулярное время сна',
      'screen_time': 'Экранное время перед сном',
      'caffeine': 'Кофеин',
      'alcohol': 'Алкоголь',
      'exercise': 'Физическая активность',
      'stress': 'Стресс',
      'naps': 'Дневной сон',
      'sleep_environment': 'Окружение для сна',
      'sleep_anxiety': 'Тревога о сне',
      'rumination': 'Руминация',
      'default': 'Фактор сна',
    };
    return nameMap[factorId] || nameMap['default'];
  }

  private formatCauseFull(cause: ICausalFactor, index: number): string {
    const impactBar = this.buildImpactBar(cause.impact);
    const strengthBar = formatter.progressBar(cause.strength * 100, 8);

    return `${index}. ${cause.emoji} *${cause.nameRu}*
   Влияние: ${impactBar}
   Сила связи: ${strengthBar} ${(cause.strength * 100).toFixed(0)}%
   Уверенность: ${(cause.temporalConfidence * 100).toFixed(0)}%`;
  }

  private formatPatternFull(pattern: IPersonalizedInsight, index: number): string {
    const confidenceEmoji = pattern.confidence === 'high' ? '🟢' :
                            pattern.confidence === 'medium' ? '🟡' : '🟠';

    return `${index}. ${confidenceEmoji} *${pattern.titleRu}*

${pattern.explanationRu}

${pattern.recommendationRu ? `💡 ${pattern.recommendationRu}` : ''}`;
  }

  private buildImpactBar(impact: number): string {
    const absImpact = Math.abs(impact);
    const bars = Math.round(absImpact * 5);
    const char = impact > 0 ? '📈' : '📉';

    if (bars === 0) return '➡️ нейтральное';
    return `${char} ${'█'.repeat(bars)}${'░'.repeat(5 - bars)} ${impact > 0 ? '+' : ''}${(impact * 100).toFixed(0)}%`;
  }

  private buildGraphVisualization(graph: ICausalGraph): string {
    // Simplified ASCII graph visualization
    const lines: string[] = [];

    // Group nodes by category
    const byCategory = new Map<string, ICausalFactor[]>();
    for (const node of graph.nodes.slice(0, 8)) {
      const cat = node.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(node);
    }

    // Build simplified representation
    lines.push('```');

    // Core: Sleep Efficiency
    lines.push('          ┌─────────────┐');
    lines.push('          │ 😴 СОН      │');
    lines.push('          │ Эффект-ть   │');
    lines.push('          └──────┬──────┘');
    lines.push('                 │');

    // Show top influences
    const topNodes = graph.nodes
      .filter(n => Math.abs(n.impact) > 0.1)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 4);

    if (topNodes.length > 0) {
      const nodeStr = topNodes.map(n => `${n.emoji}`).join('  ');
      lines.push(`    ┌────┬────┬────┬────┐`);
      lines.push(`    ${nodeStr}`);

      const namesStr = topNodes.map(n => n.nameRu.slice(0, 6).padEnd(6)).join(' ');
      lines.push(`    ${namesStr}`);
    }

    lines.push('```');

    return lines.join('\n');
  }

  private getCategoryText(category: string): string {
    const map: Record<string, string> = {
      behavior: '🎯 Поведение',
      cognition: '🧠 Мышление',
      environment: '🏠 Окружение',
      physiology: '💓 Физиология',
      timing: '⏰ Время',
    };
    return map[category] || category;
  }

  private getEvidenceTypeText(type: string): string {
    const map: Record<string, string> = {
      correlation: 'Корреляция',
      temporal: 'Временная связь',
      domain_knowledge: 'Экспертные знания',
    };
    return map[type] || type;
  }

  private getDifficultyText(difficulty: string): string {
    const map: Record<string, string> = {
      easy: 'Легко',
      medium: 'Средне',
      hard: 'Сложно',
    };
    return map[difficulty] || difficulty;
  }

  private pluralizeDays(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
    if (lastDigit === 1) return 'день';
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
    return 'дней';
  }
}

// Singleton export
export const insightsCommand = new InsightsCommand();
