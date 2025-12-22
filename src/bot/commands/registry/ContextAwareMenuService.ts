/**
 * Context-Aware Menu Service
 * ==========================
 * Dynamic menu generation based on user context, time, and therapy phase.
 * Now integrated with Sonya persona and emotion-aware UI.
 *
 * Research basis (2025):
 * - Context-Aware UI reduces cognitive load (NNGroup 2025)
 * - Progressive Disclosure: 12-20% dropout vs 33-49% (Sleepio/Somryst PMC 7999422)
 * - Time-based prompts increase adherence (JMIR 2025)
 * - Character persona (The Prof) reduces dropout 20-30% (PMC 7999422)
 * - Emotion-aware responses increase retention 35% (Grocito 2025)
 * - JITAI: Just-in-time adaptive intervention (Frontiers 2025)
 * - Re-engagement effective after 7 days, not 2 (PMC 9092233)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands/registry
 */

import {
  CommandRegistry,
  type ICommandContext,
  type IRegisteredCommand,
  type TimeOfDay,
  getCurrentTimeOfDay,
  getMoscowHour,
} from './CommandRegistry';
import type { IInlineButton } from '../interfaces/ICommand';
import { sonya, type EmotionalState } from '../../persona';
import { sentimentAnalysis } from '../../services';

// ==================== Types ====================

/**
 * Extended context with JITAI sleep data
 */
export interface IJITAIContext extends ICommandContext {
  /** Last sleep efficiency (0-100) */
  lastSleepEfficiency?: number;
  /** Sleep efficiency trend */
  sleepEfficiencyTrend?: 'improving' | 'stable' | 'declining';
  /** Hours since last sleep */
  hoursSinceWakeup?: number;
  /** User's detected emotional state */
  emotionalState?: EmotionalState;
  /** User's last message for sentiment analysis */
  lastMessage?: string;
}

/**
 * Menu layout configuration
 */
export interface IMenuLayout {
  /** Title for the menu */
  title: string;
  /** Subtitle/hint text */
  subtitle?: string;
  /** Main action buttons (max 3) */
  primaryActions: IInlineButton[];
  /** Secondary actions (collapsed by default) */
  secondaryActions?: IInlineButton[];
  /** Quick access buttons (always visible) */
  quickAccess?: IInlineButton[];
  /** Proactive suggestion if any */
  proactiveSuggestion?: {
    message: string;
    button: IInlineButton;
  };
  /** Sonya's personalized message */
  sonyaMessage?: string;
}

/**
 * Contextual greeting based on time
 */
export interface IContextualGreeting {
  emoji: string;
  greeting: string;
  suggestion: string;
}

// ==================== JITAI Thresholds (Research-Based) ====================

/**
 * JITAI thresholds for adaptive interventions
 * Based on Frontiers 2025 and PMC 5981058 (iREST system)
 */
const JITAI_THRESHOLDS = {
  /** Sleep efficiency below this is "vulnerable state" */
  lowSleepEfficiency: 75,
  /** Hours awake that suggest fatigue */
  fatigueHours: 14,
  /** Declining efficiency triggers extra support */
  decliningThreshold: 3, // 3+ consecutive worse nights
} as const;

// ==================== Greetings ====================

/**
 * Time-based greetings with Sonya personality
 */
const GREETINGS: Record<TimeOfDay, IContextualGreeting> = {
  morning: {
    emoji: '🌅',
    greeting: 'Доброе утро!',
    suggestion: 'Как прошла ночь? Давайте заполним дневник сна.',
  },
  day: {
    emoji: '☀️',
    greeting: 'Добрый день!',
    suggestion: 'Отличное время для проверки прогресса.',
  },
  evening: {
    emoji: '🌆',
    greeting: 'Добрый вечер!',
    suggestion: 'Пора подготовиться ко сну. Попробуйте расслабление.',
  },
  night: {
    emoji: '🌙',
    greeting: 'Доброй ночи!',
    suggestion: 'Проблемы со сном? Я здесь, чтобы помочь.',
  },
};

// ==================== Context-Aware Menu Service ====================

/**
 * Context-Aware Menu Service
 * Generates dynamic menus with Sonya persona and emotion-aware UI
 */
export class ContextAwareMenuService {
  private registry: CommandRegistry;

  constructor(registry: CommandRegistry) {
    this.registry = registry;
  }

  /**
   * Build context from session data with JITAI extensions
   */
  buildContext(sessionData: {
    therapyWeek?: number;
    lastDiaryDate?: string;
    lastAssessmentDate?: string;
    lastActivityAt?: Date;
    hasCompletedOnboarding?: boolean;
    lastSleepEfficiency?: number;
    sleepEfficiencyTrend?: 'improving' | 'stable' | 'declining';
    lastMessage?: string;
  }): IJITAIContext {
    const now = new Date();
    const timeOfDay = getCurrentTimeOfDay();

    // Calculate days since last activity
    const lastActivity = sessionData.lastActivityAt || now;
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check pending diary (not filled today)
    const today = now.toISOString().split('T')[0];
    const hasPendingDiary = sessionData.lastDiaryDate !== today;

    // Check pending assessment (weekly ISI)
    const lastAssessment = sessionData.lastAssessmentDate;
    const daysSinceAssessment = lastAssessment
      ? Math.floor((now.getTime() - new Date(lastAssessment).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const hasPendingAssessment = daysSinceAssessment >= 7;

    // Determine therapy phase
    const therapyWeek = sessionData.therapyWeek || 0;
    let therapyPhase: ICommandContext['therapyPhase'] = 'onboarding';

    if (!sessionData.hasCompletedOnboarding) {
      therapyPhase = 'onboarding';
    } else if (therapyWeek < 1) {
      therapyPhase = 'assessment';
    } else if (therapyWeek < 6) {
      therapyPhase = 'active';
    } else if (therapyWeek < 8) {
      therapyPhase = 'maintenance';
    } else {
      therapyPhase = 'graduated';
    }

    // Analyze sentiment if last message provided
    let emotionalState: EmotionalState = 'neutral';
    if (sessionData.lastMessage) {
      const sentiment = sentimentAnalysis.analyze(sessionData.lastMessage, {
        timeOfDay,
        daysSinceLastInteraction: daysSinceLastActivity,
        therapyWeek,
      });
      emotionalState = sentiment.primaryEmotion;
    }

    return {
      timeOfDay,
      dayOfWeek: now.getDay(),
      therapyPhase,
      therapyWeek,
      hasPendingDiary,
      hasPendingAssessment,
      daysSinceLastActivity,
      // JITAI extensions
      lastSleepEfficiency: sessionData.lastSleepEfficiency,
      sleepEfficiencyTrend: sessionData.sleepEfficiencyTrend,
      emotionalState,
      lastMessage: sessionData.lastMessage,
    };
  }

  /**
   * Generate contextual greeting with Sonya
   */
  getGreeting(context: IJITAIContext): IContextualGreeting {
    return GREETINGS[context.timeOfDay];
  }

  /**
   * Generate dynamic main menu with Sonya persona
   * Implements Progressive Disclosure + Context-Aware + JITAI patterns
   */
  generateMainMenu(context: IJITAIContext, userName?: string): IMenuLayout {
    const greeting = this.getGreeting(context);
    const visibleCommands = this.registry.getVisibleCommands(context);
    const proactiveSuggestions = this.registry.getProactiveSuggestions(context);

    // Build title with Sonya's greeting
    const sonyaGreeting = sonya.greet({ timeOfDay: context.timeOfDay, userName });
    const title = `${sonya.emoji} *${sonya.name}*\n\n${sonyaGreeting.text}`;

    // Generate Sonya's personalized message based on emotion
    let sonyaMessage: string | undefined;
    if (context.emotionalState && context.emotionalState !== 'neutral') {
      const emotionResponse = sonya.respondToEmotion(context.emotionalState);
      sonyaMessage = emotionResponse.text;
    }

    // JITAI: Check for vulnerable state and adjust suggestions
    const isVulnerable = this.isVulnerableState(context);

    // Primary actions: top 3 relevant commands (JITAI-adjusted)
    let primaryCommands = visibleCommands.slice(0, 3);
    if (isVulnerable) {
      // In vulnerable state, prioritize relaxation and support
      primaryCommands = this.prioritizeForVulnerableState(visibleCommands);
    }

    const primaryActions: IInlineButton[] = primaryCommands.map((reg) => ({
      text: `${reg.config.icon} ${reg.config.shortLabel}`,
      callbackData: `menu:${reg.name}`,
    }));

    // Secondary actions: remaining commands
    const secondaryCommands = visibleCommands.slice(3, 6);
    const secondaryActions: IInlineButton[] = secondaryCommands.map((reg) => ({
      text: `${reg.config.icon} ${reg.config.shortLabel}`,
      callbackData: `menu:${reg.name}`,
    }));

    // Quick access: SOS always visible
    const quickAccess: IInlineButton[] = [
      { text: '❓ Справка', callbackData: 'menu:help' },
      { text: '🆘 SOS', callbackData: 'menu:sos' },
    ];

    // Proactive suggestion with Sonya's voice
    let proactiveSuggestion: IMenuLayout['proactiveSuggestion'];
    if (proactiveSuggestions.length > 0) {
      const suggestion = proactiveSuggestions[0];
      proactiveSuggestion = {
        message: this.getProactiveMessage(suggestion, context),
        button: {
          text: `${suggestion.config.icon} ${suggestion.config.shortLabel}`,
          callbackData: `menu:${suggestion.name}`,
        },
      };
    }

    return {
      title,
      subtitle: greeting.suggestion,
      primaryActions,
      secondaryActions: secondaryActions.length > 0 ? secondaryActions : undefined,
      quickAccess,
      proactiveSuggestion,
      sonyaMessage,
    };
  }

  /**
   * Check if user is in "vulnerable state" (JITAI concept)
   * Triggers more supportive intervention
   */
  private isVulnerableState(context: IJITAIContext): boolean {
    // Low sleep efficiency
    if (
      context.lastSleepEfficiency !== undefined &&
      context.lastSleepEfficiency < JITAI_THRESHOLDS.lowSleepEfficiency
    ) {
      return true;
    }

    // Declining sleep trend
    if (context.sleepEfficiencyTrend === 'declining') {
      return true;
    }

    // Negative emotional state
    if (
      context.emotionalState &&
      ['frustrated', 'anxious', 'discouraged'].includes(context.emotionalState)
    ) {
      return true;
    }

    // Late night usage (might indicate sleep problems)
    if (context.timeOfDay === 'night') {
      return true;
    }

    return false;
  }

  /**
   * Prioritize commands for vulnerable state
   */
  private prioritizeForVulnerableState(
    commands: IRegisteredCommand[]
  ): IRegisteredCommand[] {
    const priorityOrder = ['sos', 'relax', 'mindful', 'diary'];

    const sorted = [...commands].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.name);
      const bIndex = priorityOrder.indexOf(b.name);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    return sorted.slice(0, 3);
  }

  /**
   * Generate proactive message with Sonya's voice
   */
  private getProactiveMessage(command: IRegisteredCommand, context: IJITAIContext): string {
    const messages: Record<string, Record<TimeOfDay, string>> = {
      diary: {
        morning: `${sonya.emoji} _Утренний дневник — ключ к пониманию твоего сна!_`,
        day: `${sonya.emoji} _Не забудь про дневник сна — это важно для анализа._`,
        evening: `${sonya.emoji} _Пора записать, как прошла прошлая ночь._`,
        night: `${sonya.emoji} _Дневник поможет отследить твой прогресс._`,
      },
      rehearsal: {
        morning: `${sonya.emoji} _Вечером попробуй мысленную репетицию сна._`,
        day: `${sonya.emoji} _Подготовься к вечерней репетиции хорошего сна._`,
        evening: `${sonya.emoji} _Идеальное время для мысленной репетиции!_`,
        night: `${sonya.emoji} _Представь качественный сон перед засыпанием._`,
      },
      recall: {
        morning: `${sonya.emoji} _Утренний тест закрепляет знания о сне!_`,
        day: `${sonya.emoji} _Проверь, что запомнил(а) вчера._`,
        evening: `${sonya.emoji} _Завтра утром — тест памяти._`,
        night: `${sonya.emoji} _Консолидация знаний происходит во сне._`,
      },
      relax: {
        morning: `${sonya.emoji} _Расслабление можно практиковать в любое время._`,
        day: `${sonya.emoji} _Техники расслабления снижают дневной стресс._`,
        evening: `${sonya.emoji} _Вечернее расслабление улучшает сон на 23%!_`,
        night: `${sonya.emoji} _Расслабление поможет уснуть быстрее._`,
      },
    };

    return (
      messages[command.name]?.[context.timeOfDay] ||
      `${sonya.emoji} _${command.config.shortLabel}_`
    );
  }

  /**
   * Format menu as Telegram message with Sonya's personality
   */
  formatMenuMessage(layout: IMenuLayout): string {
    let message = layout.title;

    if (layout.sonyaMessage) {
      message += `\n\n${layout.sonyaMessage}`;
    }

    if (layout.subtitle) {
      message += `\n\n${layout.subtitle}`;
    }

    if (layout.proactiveSuggestion) {
      message += `\n\n💡 ${layout.proactiveSuggestion.message}`;
    }

    return message;
  }

  /**
   * Build keyboard from menu layout
   */
  buildMenuKeyboard(layout: IMenuLayout): IInlineButton[][] {
    const keyboard: IInlineButton[][] = [];

    // Proactive suggestion at top
    if (layout.proactiveSuggestion) {
      keyboard.push([layout.proactiveSuggestion.button]);
    }

    // Primary actions (3 per row max, typically 1-2 per row for readability)
    if (layout.primaryActions.length <= 2) {
      keyboard.push([...layout.primaryActions]);
    } else {
      keyboard.push([layout.primaryActions[0], layout.primaryActions[1]]);
      keyboard.push([layout.primaryActions[2]]);
    }

    // Secondary actions (2 per row)
    if (layout.secondaryActions) {
      for (let i = 0; i < layout.secondaryActions.length; i += 2) {
        const row = layout.secondaryActions.slice(i, i + 2);
        keyboard.push(row);
      }
    }

    // Quick access always at bottom
    if (layout.quickAccess) {
      keyboard.push(layout.quickAccess);
    }

    return keyboard;
  }

  /**
   * Generate time-specific proactive notification with Sonya
   * For cron-based push messages
   */
  generateProactiveNotification(
    context: IJITAIContext,
    userName?: string
  ): { message: string; keyboard: IInlineButton[][] } | null {
    const hour = getMoscowHour();
    const suggestions = this.registry.getProactiveSuggestions(context);

    if (suggestions.length === 0) return null;

    // Morning notification (08:00)
    if (hour === 8 && context.hasPendingDiary) {
      const diaryCmd = suggestions.find((s) => s.name === 'diary');
      const recallCmd = suggestions.find((s) => s.name === 'recall');

      const greeting = sonya.greet({ timeOfDay: 'morning', userName });

      return {
        message:
          `${sonya.emoji} *${sonya.name}*\n\n` +
          `${greeting.text}\n\n` +
          `Как прошла ночь?\n\n` +
          `_Регулярное ведение дневника — основа улучшения сна (КПТ-И)_`,
        keyboard: [
          diaryCmd ? [{ text: '📔 Заполнить дневник', callbackData: 'menu:diary' }] : [],
          recallCmd ? [{ text: '🎯 Утренний тест', callbackData: 'menu:recall' }] : [],
        ].filter((row) => row.length > 0),
      };
    }

    // Evening notification (20:00 - research "golden hour")
    if (hour === 20) {
      const relaxCmd = suggestions.find((s) => s.name === 'relax');
      const rehearsalCmd = suggestions.find((s) => s.name === 'rehearsal');

      const greeting = sonya.greet({ timeOfDay: 'evening', userName });

      return {
        message:
          `${sonya.emoji} *${sonya.name}*\n\n` +
          `${greeting.text}\n\n` +
          `Пора готовиться ко сну.\n\n` +
          `_Расслабление перед сном улучшает качество сна на 23% (European Guideline 2023)_`,
        keyboard: [
          relaxCmd ? [{ text: '🧘 Расслабление', callbackData: 'menu:relax' }] : [],
          rehearsalCmd ? [{ text: '🎭 Репетиция сна', callbackData: 'menu:rehearsal' }] : [],
        ].filter((row) => row.length > 0),
      };
    }

    return null;
  }

  /**
   * Generate re-engagement message with Sonya
   * Research: effective after 7+ days, include new features (PMC 9092233)
   */
  generateReengagementMessage(
    context: IJITAIContext,
    userName?: string
  ): { message: string; keyboard: IInlineButton[][] } | null {
    // Research: re-engagement effective after 7 days, not 2
    if (context.daysSinceLastActivity < 7) return null;

    const days = context.daysSinceLastActivity;
    const name = userName || 'друг';

    let message: string;

    if (days <= 10) {
      // First re-engagement attempt (7-10 days)
      message =
        `${sonya.emoji} *${sonya.name}*\n\n` +
        `Привет, ${name}! 👋\n\n` +
        `Мы не виделись ${days} дней. Как твой сон?\n\n` +
        `_Регулярность — ключ к успеху КПТ-И. Даже короткий перерыв можно наверстать!_\n\n` +
        `${sonya.tip('Новое: теперь есть мысленная репетиция сна!')}`;
    } else if (days <= 14) {
      // Second attempt (10-14 days)
      message =
        `${sonya.emoji} *${sonya.name}*\n\n` +
        `${name}, мы скучаем! 🤗\n\n` +
        `Прошло уже ${days} дней. Давай вернёмся к работе над сном?\n\n` +
        `_78% людей улучшают сон с КПТ-И. Ты тоже можешь!_\n\n` +
        `${sonya.tip('Попробуй начать с простого — заполни дневник сна.')}`;
    } else {
      // Last attempt (14+ days - Meta's rule edge)
      message =
        `${sonya.emoji} *${sonya.name}*\n\n` +
        `С возвращением, ${name}! 💪\n\n` +
        `Готов продолжить? Сон можно улучшить в любой момент.\n\n` +
        `_КПТ-И эффективна даже после перерыва. Я верю в тебя!_`;
    }

    return {
      message,
      keyboard: [
        [{ text: '📔 Заполнить дневник', callbackData: 'menu:diary' }],
        [{ text: '📊 Мой прогресс', callbackData: 'menu:progress' }],
        [{ text: '❓ Что нового?', callbackData: 'menu:help' }],
      ],
    };
  }
}

// ==================== Factory ====================

/**
 * Create context-aware menu service with registry
 */
export function createContextAwareMenuService(
  registry: CommandRegistry
): ContextAwareMenuService {
  return new ContextAwareMenuService(registry);
}

export default ContextAwareMenuService;
