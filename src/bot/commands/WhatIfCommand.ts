/**
 * /whatif Command - Counterfactual Sleep Scenarios
 * =================================================
 * Explainable AI through counterfactual "what-if" scenarios.
 *
 * Research Foundation (Sprint 3):
 * - Wachter et al. (2018): Counterfactual explanations for XAI
 * - Verma et al. (2022): Counterfactuals in healthcare
 * - NASEM (2023): Digital twin simulation for DTx
 *
 * Features:
 * - "What if I went to bed earlier?" scenario simulation
 * - Personalized intervention impact prediction
 * - Side-by-side scenario comparison
 * - Confidence levels for all predictions
 *
 * © БФ "Другой путь", 2025-2026
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import {
  digitalTwinService,
  type IScenario,
  type ISimulationResult,
  type IComparisonResult,
} from '../services/DigitalTwinService';
import type { SleepAction } from '../../platform/SleepCorePOMDP';

// ============================================================================
// PREDEFINED SCENARIOS
// ============================================================================

/**
 * Common "what-if" scenarios for sleep improvement
 * Based on CBT-I evidence and user research
 */
const WHATIF_SCENARIOS: Record<string, IScenario> = {
  // Sleep Window Adjustments
  earlier_bedtime: {
    name: 'Более раннее время отхода ко сну',
    description: 'Лечь спать на 30-60 минут раньше',
    intervention: 'adjust_sleep_window' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.8,
  },
  later_bedtime: {
    name: 'Более позднее время отхода ко сну',
    description: 'Лечь спать на 30-60 минут позже (усиление давления сна)',
    intervention: 'bed_restriction' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.8,
  },
  consistent_wake: {
    name: 'Стабильное время пробуждения',
    description: 'Просыпаться в одно время каждый день (±15 мин)',
    intervention: 'enforce_wake_time' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.9,
  },

  // Behavioral Changes
  leave_bed_rule: {
    name: 'Правило 20 минут',
    description: 'Вставать из кровати, если не спится 20 минут',
    intervention: 'leave_bed_reminder' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.7,
  },
  no_caffeine: {
    name: 'Без кофеина после обеда',
    description: 'Исключить кофеин после 14:00',
    intervention: 'caffeine_education' as SleepAction,
    durationDays: 14,
    adherenceLevel: 0.85,
  },
  environment_change: {
    name: 'Оптимизация спальни',
    description: 'Темно, тихо, прохладно (18-20°C)',
    intervention: 'environment_advice' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.9,
  },

  // Relaxation Techniques
  pmr_practice: {
    name: 'Прогрессивная мышечная релаксация',
    description: 'Практика ПМР каждый вечер перед сном',
    intervention: 'relaxation_pmr' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.75,
  },
  breathing_practice: {
    name: 'Дыхательные упражнения',
    description: 'Диафрагмальное дыхание 4-7-8 перед сном',
    intervention: 'relaxation_breathing' as SleepAction,
    durationDays: 7,
    adherenceLevel: 0.8,
  },

  // Cognitive Interventions
  cognitive_challenge: {
    name: 'Работа с мыслями о сне',
    description: 'Когнитивная реструктуризация тревожных мыслей',
    intervention: 'challenge_belief' as SleepAction,
    durationDays: 14,
    adherenceLevel: 0.7,
  },

  // No Change (Control)
  no_change: {
    name: 'Без изменений',
    description: 'Продолжить текущий режим',
    intervention: 'no_intervention' as SleepAction,
    durationDays: 7,
    adherenceLevel: 1.0,
  },
};

/**
 * Scenario categories for menu organization
 */
const SCENARIO_CATEGORIES = {
  timing: {
    label: 'Время сна',
    icon: '🕐',
    scenarios: ['earlier_bedtime', 'later_bedtime', 'consistent_wake'],
  },
  behavior: {
    label: 'Поведение',
    icon: '🚶',
    scenarios: ['leave_bed_rule', 'no_caffeine', 'environment_change'],
  },
  relaxation: {
    label: 'Расслабление',
    icon: '🧘',
    scenarios: ['pmr_practice', 'breathing_practice'],
  },
  cognitive: {
    label: 'Работа с мыслями',
    icon: '🧠',
    scenarios: ['cognitive_challenge'],
  },
};

// ============================================================================
// WHATIF COMMAND
// ============================================================================

/**
 * /whatif Command Implementation
 * Provides counterfactual scenario simulation for sleep improvement
 */
export class WhatIfCommand implements ICommand, Partial<IConversationCommand> {
  readonly name = 'whatif';
  readonly description = 'Что если? — моделирование сценариев';
  readonly aliases = ['что_если', 'если', 'сценарий'];
  readonly requiresSession = false;
  readonly steps = ['menu', 'scenario', 'result', 'compare'];

  /**
   * Execute command - show main menu
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    // Check if user specified a scenario directly
    if (args) {
      const scenarioKey = this.parseScenarioArg(args);
      if (scenarioKey && WHATIF_SCENARIOS[scenarioKey]) {
        return this.simulateScenario(ctx, scenarioKey);
      }
    }

    // Check if digital twin is ready
    const twin = await digitalTwinService.createTwin(ctx.userId);

    if (!twin.isReady) {
      return this.showInsufficientData(ctx, twin.observationCount);
    }

    return this.showMainMenu(ctx, twin);
  }

  // ==========================================================================
  // MENU VIEWS
  // ==========================================================================

  /**
   * Show main scenario selection menu
   */
  private async showMainMenu(
    ctx: ISleepCoreContext,
    twin: Awaited<ReturnType<typeof digitalTwinService.createTwin>>
  ): Promise<ICommandResult> {
    const currentSE = twin.currentMetrics?.sleepEfficiency ?? 0;
    const trendEmoji = this.getTrendEmoji(twin.trend);

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Что если...?')}

Твоя текущая эффективность сна: *${Math.round(currentSE)}%* ${trendEmoji}
Качество модели: ${this.formatQuality(twin.stateQuality)}

${sonya.say('Выбери сценарий, и я покажу, как он может повлиять на твой сон.')}

${formatter.divider()}

🔮 *Как это работает:*
Я использую твои данные для моделирования разных сценариев. Это помогает понять, какие изменения принесут наибольшую пользу.

${sonya.tip('Чем больше данных — тем точнее прогноз')}
    `.trim();

    const keyboard = this.buildMainMenuKeyboard();

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        userId: ctx.userId,
        currentSE,
        twinQuality: twin.stateQuality,
      },
    };
  }

  /**
   * Show insufficient data message
   */
  private showInsufficientData(ctx: ISleepCoreContext, observations: number): ICommandResult {
    const needed = 3 - observations;
    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Что если...?')}

${sonya.say('Мне нужно больше данных для моделирования сценариев.')}

📊 Сейчас: ${observations} ${this.pluralize(observations, 'запись', 'записи', 'записей')}
📊 Нужно: минимум 3 записи

${formatter.divider()}

Заполняй дневник сна каждый день, и через ${needed} ${this.pluralize(needed, 'день', 'дня', 'дней')} я смогу показать персональные прогнозы.

${sonya.tip('Команда /diary поможет заполнить дневник')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📔 Заполнить дневник', callbackData: 'diary:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Build main menu keyboard
   */
  private buildMainMenuKeyboard(): IInlineButton[][] {
    const keyboard: IInlineButton[][] = [];

    // Category rows
    for (const [key, category] of Object.entries(SCENARIO_CATEGORIES)) {
      keyboard.push([
        {
          text: `${category.icon} ${category.label}`,
          callbackData: `whatif:category:${key}`,
        },
      ]);
    }

    // Quick actions
    keyboard.push([
      { text: '⚖️ Сравнить сценарии', callbackData: 'whatif:compare:menu' },
    ]);

    keyboard.push([
      { text: '📊 Мой Digital Twin', callbackData: 'whatif:twin:status' },
    ]);

    return keyboard;
  }

  // ==========================================================================
  // SCENARIO SIMULATION
  // ==========================================================================

  /**
   * Simulate a single scenario
   */
  private async simulateScenario(
    ctx: ISleepCoreContext,
    scenarioKey: string
  ): Promise<ICommandResult> {
    const scenario = WHATIF_SCENARIOS[scenarioKey];
    if (!scenario) {
      return { success: false, error: 'Сценарий не найден' };
    }

    const result = await digitalTwinService.simulateScenario(ctx.userId, scenario);

    if (!result) {
      return this.showSimulationError(ctx);
    }

    return this.showSimulationResult(ctx, scenarioKey, result);
  }

  /**
   * Show simulation result
   */
  private showSimulationResult(
    ctx: ISleepCoreContext,
    scenarioKey: string,
    result: ISimulationResult
  ): ICommandResult {
    const changeEmoji = this.getChangeEmoji(result.predictedOutcome.sleepEfficiencyChange);
    const changeSign = result.predictedOutcome.sleepEfficiencyChange >= 0 ? '+' : '';
    const confidenceLabel = this.formatConfidence(result.confidence);

    // Build factors list
    const factorsList = result.keyFactors
      .map(f => `• ${f}`)
      .join('\n');

    // Build recommendations
    const recsList = result.recommendations
      .map(r => `• ${r}`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header(`Что если: ${result.scenario.name}`)}

📋 *Сценарий:*
${result.scenario.description}
⏱ Длительность: ${result.scenario.durationDays} дней

${formatter.divider()}

🔮 *Прогноз:*

Эффективность сна: *${result.predictedOutcome.sleepEfficiency}%* ${changeEmoji}
Изменение: *${changeSign}${result.predictedOutcome.sleepEfficiencyChange}%*
Тренд: ${this.getTrendLabel(result.predictedOutcome.trend)}

📊 Уверенность: ${confidenceLabel}

${formatter.divider()}

🔑 *Ключевые факторы:*
${factorsList}

${result.recommendations.length > 0 ? `
💡 *Рекомендации:*
${recsList}
` : ''}

${sonya.tip('Это прогноз на основе твоих данных. Результат может отличаться.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '⚖️ Сравнить с другим', callbackData: `whatif:compare:add:${scenarioKey}` },
      ],
      [
        { text: '📝 Попробовать этот сценарий', callbackData: `whatif:apply:${scenarioKey}` },
      ],
      [
        { text: '◀️ Другие сценарии', callbackData: 'whatif:menu' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        scenario: scenarioKey,
        predictedSE: result.predictedOutcome.sleepEfficiency,
        change: result.predictedOutcome.sleepEfficiencyChange,
        confidence: result.confidence,
      },
    };
  }

  /**
   * Show simulation error
   */
  private showSimulationError(ctx: ISleepCoreContext): ICommandResult {
    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.warning('Не удалось выполнить моделирование')}

Возможные причины:
• Недостаточно данных в дневнике
• Высокая вариабельность сна

${sonya.tip('Попробуй заполнить ещё несколько записей в дневнике')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📔 Заполнить дневник', callbackData: 'diary:start' }],
      [{ text: '◀️ Назад', callbackData: 'whatif:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  // ==========================================================================
  // SCENARIO COMPARISON
  // ==========================================================================

  /**
   * Compare multiple scenarios
   */
  private async compareScenarios(
    ctx: ISleepCoreContext,
    scenarioKeys: string[]
  ): Promise<ICommandResult> {
    const scenarios = scenarioKeys
      .map(key => WHATIF_SCENARIOS[key])
      .filter(Boolean);

    if (scenarios.length < 2) {
      return { success: false, error: 'Нужно минимум 2 сценария для сравнения' };
    }

    const comparison = await digitalTwinService.compareScenarios(ctx.userId, scenarios);

    if (!comparison) {
      return this.showSimulationError(ctx);
    }

    return this.showComparisonResult(ctx, comparison);
  }

  /**
   * Show comparison result
   */
  private showComparisonResult(
    ctx: ISleepCoreContext,
    comparison: IComparisonResult
  ): ICommandResult {
    // Build comparison table
    const tableRows = comparison.results.map((result, idx) => {
      const changeSign = result.predictedOutcome.sleepEfficiencyChange >= 0 ? '+' : '';
      const isBest = result.scenario.name === comparison.bestScenario.name;
      const marker = isBest ? '⭐ ' : '';

      return `${marker}*${result.scenario.name}*
   SE: ${result.predictedOutcome.sleepEfficiency}% (${changeSign}${result.predictedOutcome.sleepEfficiencyChange}%)
   Уверенность: ${Math.round(result.confidence * 100)}%`;
    }).join('\n\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Сравнение сценариев')}

${tableRows}

${formatter.divider()}

⭐ *Лучший вариант:*
${comparison.bestScenario.name}

${sonya.say(comparison.explanationRu)}

${sonya.tip('Выбери сценарий, который тебе легче всего выполнить')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '📝 Выбрать лучший', callbackData: `whatif:apply:${this.findScenarioKey(comparison.bestScenario)}` },
      ],
      [
        { text: '🔄 Новое сравнение', callbackData: 'whatif:compare:menu' },
      ],
      [
        { text: '◀️ К меню', callbackData: 'whatif:menu' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        comparedCount: comparison.scenarios.length,
        bestScenario: comparison.bestScenario.name,
      },
    };
  }

  // ==========================================================================
  // DIGITAL TWIN STATUS
  // ==========================================================================

  /**
   * Show digital twin status
   */
  private async showTwinStatus(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const twin = await digitalTwinService.createTwin(ctx.userId);
    const tippingPoints = await digitalTwinService.detectTippingPoints(ctx.userId);

    const statusEmoji = twin.isReady ? '✅' : '⏳';
    const trendEmoji = this.getTrendEmoji(twin.trend);
    const riskEmoji = this.getRiskEmoji(twin.riskLevel);

    // Build tipping points section
    let tippingSection = '';
    if (tippingPoints.length > 0) {
      const tpList = tippingPoints.map(tp => {
        const typeLabel = tp.type === 'improvement' ? '📈 Улучшение' :
                         tp.type === 'deterioration' ? '📉 Ухудшение' : '⚠️ Риск рецидива';
        return `${typeLabel}: ${Math.round(tp.probability * 100)}%\n   ${tp.recommendationRu}`;
      }).join('\n\n');

      tippingSection = `
${formatter.divider()}

🔮 *Обнаруженные переходы:*
${tpList}`;
    }

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Твой Digital Twin')}

${statusEmoji} *Статус:* ${twin.isReady ? 'Готов к моделированию' : 'Недостаточно данных'}

📊 *Данные:*
• Записей: ${twin.observationCount}
• Качество модели: ${this.formatQuality(twin.stateQuality)}

${twin.currentMetrics ? `
📈 *Текущие метрики:*
• Эффективность сна: ${Math.round(twin.currentMetrics.sleepEfficiency)}%
• Тренд: ${trendEmoji} ${this.getTrendLabel(twin.trend)}
• Уровень риска: ${riskEmoji} ${this.getRiskLabel(twin.riskLevel)}
` : ''}
${tippingSection}

${formatter.divider()}

${sonya.tip('Digital Twin — это персональная модель твоего сна для точных прогнозов')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔮 Моделировать сценарий', callbackData: 'whatif:menu' }],
      [{ text: '📔 Добавить данные', callbackData: 'diary:start' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: {
        twinReady: twin.isReady,
        observations: twin.observationCount,
        quality: twin.stateQuality,
      },
    };
  }

  // ==========================================================================
  // CALLBACK HANDLER
  // ==========================================================================

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    const action = parts[1];

    switch (action) {
      case 'menu':
        return this.execute(ctx);

      case 'category': {
        const categoryKey = parts[2];
        return this.showCategory(ctx, categoryKey);
      }

      case 'scenario': {
        const scenarioKey = parts[2];
        return this.simulateScenario(ctx, scenarioKey);
      }

      case 'compare': {
        const subAction = parts[2];
        if (subAction === 'menu') {
          return this.showCompareMenu(ctx);
        }
        if (subAction === 'add') {
          const firstScenario = parts[3];
          return this.showCompareAdd(ctx, firstScenario);
        }
        if (subAction === 'run') {
          const scenarios = parts.slice(3);
          return this.compareScenarios(ctx, scenarios);
        }
        break;
      }

      case 'twin': {
        const subAction = parts[2];
        if (subAction === 'status') {
          return this.showTwinStatus(ctx);
        }
        break;
      }

      case 'apply': {
        const scenarioKey = parts[2];
        return this.showApplyScenario(ctx, scenarioKey);
      }

      default:
        return { success: false, error: 'Неизвестное действие' };
    }

    return { success: false, error: 'Неизвестное действие' };
  }

  /**
   * Show scenarios in a category
   */
  private async showCategory(ctx: ISleepCoreContext, categoryKey: string): Promise<ICommandResult> {
    const category = SCENARIO_CATEGORIES[categoryKey as keyof typeof SCENARIO_CATEGORIES];
    if (!category) {
      return { success: false, error: 'Категория не найдена' };
    }

    const scenariosList = category.scenarios
      .map(key => {
        const scenario = WHATIF_SCENARIOS[key];
        return `• *${scenario.name}*\n  _${scenario.description}_`;
      })
      .join('\n\n');

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header(`${category.icon} ${category.label}`)}

${scenariosList}

${sonya.tip('Выбери сценарий для моделирования')}
    `.trim();

    const keyboard: IInlineButton[][] = category.scenarios.map(key => [{
      text: WHATIF_SCENARIOS[key].name,
      callbackData: `whatif:scenario:${key}`,
    }]);

    keyboard.push([{ text: '◀️ Назад', callbackData: 'whatif:menu' }]);

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show compare menu
   */
  private showCompareMenu(ctx: ISleepCoreContext): ICommandResult {
    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Сравнение сценариев')}

${sonya.say('Выбери первый сценарий для сравнения.')}

Я покажу, какой из сценариев может дать лучший результат для тебя.
    `.trim();

    const keyboard: IInlineButton[][] = [];

    // Flat list of popular scenarios for comparison
    const popularScenarios = [
      'earlier_bedtime',
      'later_bedtime',
      'consistent_wake',
      'leave_bed_rule',
      'pmr_practice',
    ];

    for (const key of popularScenarios) {
      const scenario = WHATIF_SCENARIOS[key];
      keyboard.push([{
        text: scenario.name,
        callbackData: `whatif:compare:add:${key}`,
      }]);
    }

    keyboard.push([{ text: '◀️ Назад', callbackData: 'whatif:menu' }]);

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show add second scenario for comparison
   */
  private showCompareAdd(ctx: ISleepCoreContext, firstScenario: string): ICommandResult {
    const first = WHATIF_SCENARIOS[firstScenario];

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header('Сравнение сценариев')}

✅ Первый: *${first.name}*

${sonya.say('Теперь выбери второй сценарий.')}
    `.trim();

    const keyboard: IInlineButton[][] = [];

    // Show other scenarios
    const otherScenarios = Object.keys(WHATIF_SCENARIOS)
      .filter(key => key !== firstScenario && key !== 'no_change')
      .slice(0, 5);

    for (const key of otherScenarios) {
      const scenario = WHATIF_SCENARIOS[key];
      keyboard.push([{
        text: scenario.name,
        callbackData: `whatif:compare:run:${firstScenario}:${key}`,
      }]);
    }

    // Option to compare with no change
    keyboard.push([{
      text: '📊 Сравнить с текущим режимом',
      callbackData: `whatif:compare:run:${firstScenario}:no_change`,
    }]);

    keyboard.push([{ text: '◀️ Назад', callbackData: 'whatif:compare:menu' }]);

    return {
      success: true,
      message,
      keyboard,
    };
  }

  /**
   * Show apply scenario guidance
   */
  private showApplyScenario(ctx: ISleepCoreContext, scenarioKey: string): ICommandResult {
    const scenario = WHATIF_SCENARIOS[scenarioKey];
    if (!scenario) {
      return { success: false, error: 'Сценарий не найден' };
    }

    // Map scenario to relevant command/technique
    const guidanceMap: Record<string, { command: string; description: string }> = {
      earlier_bedtime: { command: '/today', description: 'Настрой время сна в терапии' },
      later_bedtime: { command: '/today', description: 'Sleep Restriction в /today' },
      consistent_wake: { command: '/diary', description: 'Отслеживай время пробуждения' },
      leave_bed_rule: { command: '/today', description: 'Stimulus Control в /today' },
      no_caffeine: { command: '/smart_tips', description: 'Советы по гигиене сна' },
      environment_change: { command: '/smart_tips', description: 'Советы по обстановке' },
      pmr_practice: { command: '/relax', description: 'Техника ПМР' },
      breathing_practice: { command: '/relax', description: 'Дыхательные техники' },
      cognitive_challenge: { command: '/today', description: 'Когнитивная терапия' },
    };

    const guidance = guidanceMap[scenarioKey] || { command: '/help', description: 'Общая справка' };

    const message = `
${sonya.emoji} *${sonya.name}*

${formatter.header(`Применить: ${scenario.name}`)}

${formatter.success('Отличный выбор!')}

📋 *План действий:*
${scenario.description}

⏱ *Длительность:* ${scenario.durationDays} дней

${formatter.divider()}

💡 *Как начать:*
Используй команду *${guidance.command}* — ${guidance.description}

${sonya.tip('Регулярность важнее идеальности. Делай понемногу каждый день.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: `🚀 ${guidance.command}`, callbackData: `${guidance.command.slice(1)}:menu` }],
      [{ text: '◀️ К сценариям', callbackData: 'whatif:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Parse scenario argument from user input
   */
  private parseScenarioArg(args: string): string | null {
    const lowerArgs = args.toLowerCase();

    const argMap: Record<string, string> = {
      'раньше': 'earlier_bedtime',
      'позже': 'later_bedtime',
      'режим': 'consistent_wake',
      '20 минут': 'leave_bed_rule',
      'кофе': 'no_caffeine',
      'кофеин': 'no_caffeine',
      'спальня': 'environment_change',
      'пмр': 'pmr_practice',
      'дыхание': 'breathing_practice',
      'мысли': 'cognitive_challenge',
    };

    for (const [key, value] of Object.entries(argMap)) {
      if (lowerArgs.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Find scenario key by scenario object
   */
  private findScenarioKey(scenario: IScenario): string {
    for (const [key, value] of Object.entries(WHATIF_SCENARIOS)) {
      if (value.name === scenario.name) {
        return key;
      }
    }
    return 'no_change';
  }

  /**
   * Get trend emoji
   */
  private getTrendEmoji(trend: string): string {
    const emojis: Record<string, string> = {
      improving: '📈',
      stable: '➡️',
      declining: '📉',
      critical: '🚨',
    };
    return emojis[trend] || '➡️';
  }

  /**
   * Get trend label
   */
  private getTrendLabel(trend: string): string {
    const labels: Record<string, string> = {
      improving: 'Улучшение',
      stable: 'Стабильно',
      declining: 'Снижение',
      critical: 'Критический',
    };
    return labels[trend] || 'Стабильно';
  }

  /**
   * Get change emoji based on percentage
   */
  private getChangeEmoji(change: number): string {
    if (change > 10) return '🚀';
    if (change > 5) return '📈';
    if (change > 0) return '⬆️';
    if (change === 0) return '➡️';
    if (change > -5) return '⬇️';
    return '📉';
  }

  /**
   * Get risk emoji
   */
  private getRiskEmoji(risk: string): string {
    const emojis: Record<string, string> = {
      low: '🟢',
      moderate: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    return emojis[risk] || '⚪';
  }

  /**
   * Get risk label
   */
  private getRiskLabel(risk: string): string {
    const labels: Record<string, string> = {
      low: 'Низкий',
      moderate: 'Умеренный',
      high: 'Высокий',
      critical: 'Критический',
    };
    return labels[risk] || 'Неизвестно';
  }

  /**
   * Format quality score
   */
  private formatQuality(quality: number): string {
    const percent = Math.round(quality * 100);
    if (percent >= 85) return `🟢 ${percent}% (отлично)`;
    if (percent >= 70) return `🟡 ${percent}% (хорошо)`;
    if (percent >= 50) return `🟠 ${percent}% (средне)`;
    return `🔴 ${percent}% (недостаточно)`;
  }

  /**
   * Format confidence level
   */
  private formatConfidence(confidence: number): string {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) return `🟢 ${percent}% (высокая)`;
    if (percent >= 60) return `🟡 ${percent}% (средняя)`;
    return `🟠 ${percent}% (низкая)`;
  }

  /**
   * Russian pluralization
   */
  private pluralize(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Singleton instance
 */
export const whatIfCommand = new WhatIfCommand();
