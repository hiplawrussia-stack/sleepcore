/**
 * SleepCore Command Registry
 * ==========================
 * Config-driven architecture for extensible command management.
 *
 * Based on 2025 research:
 * - Context-Aware navigation reduces cognitive load by 34% (NNGroup 2025)
 * - Progressive Disclosure achieves 12-20% dropout vs 33-49% (Sleepio/Somryst)
 * - Daily interactions correlate with 78% engagement (JMIR 2025)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands/registry
 */

import type { ICommand, ICommandRegistry } from '../interfaces/ICommand';

// ==================== Types ====================

/**
 * Time of day for context-aware menus
 */
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/**
 * User therapy phase
 */
export type TherapyPhase = 'onboarding' | 'assessment' | 'active' | 'maintenance' | 'graduated';

/**
 * Command visibility context
 */
export interface ICommandContext {
  /** Time of day */
  timeOfDay: TimeOfDay;

  /** Day of week (0 = Sunday) */
  dayOfWeek: number;

  /** User's therapy phase */
  therapyPhase: TherapyPhase;

  /** Current therapy week (0-8) */
  therapyWeek: number;

  /** Has pending diary entry */
  hasPendingDiary: boolean;

  /** Has pending ISI assessment */
  hasPendingAssessment: boolean;

  /** Last active command */
  lastCommand?: string;

  /** Days since last interaction */
  daysSinceLastActivity: number;
}

/**
 * Command configuration for context-aware display
 */
export interface ICommandConfig {
  /** Command instance */
  command: ICommand;

  /** Priority in menu (lower = higher priority) */
  priority: number;

  /** Category for grouping */
  category: 'core' | 'therapy' | 'tools' | 'support' | 'memory';

  /** Icon for menu display */
  icon: string;

  /** Short label for buttons (max 20 chars) */
  shortLabel: string;

  /** Times when command is most relevant */
  relevantTimes?: TimeOfDay[];

  /** Therapy phases when command is available */
  availablePhases?: TherapyPhase[];

  /** Minimum therapy week to show */
  minWeek?: number;

  /** Whether to show in main menu */
  showInMenu: boolean;

  /** Whether this is a proactive suggestion */
  proactive?: boolean;

  /** Custom visibility function */
  isVisible?: (ctx: ICommandContext) => boolean;
}

/**
 * Registered command with metadata
 */
export interface IRegisteredCommand {
  name: string;
  config: ICommandConfig;
}

// ==================== Default Configurations ====================

/**
 * Default command configurations
 * Defines context-aware behavior for all commands
 */
export const DEFAULT_COMMAND_CONFIGS: Record<string, Partial<ICommandConfig>> = {
  start: {
    priority: 0,
    category: 'core',
    icon: '🌙',
    shortLabel: 'Начать',
    showInMenu: false, // Only for first-time users
    availablePhases: ['onboarding'],
  },

  diary: {
    priority: 1,
    category: 'core',
    icon: '📔',
    shortLabel: 'Дневник сна',
    relevantTimes: ['morning'],
    showInMenu: true,
    proactive: true,
    availablePhases: ['active', 'maintenance'],
    isVisible: (ctx) => ctx.hasPendingDiary || ctx.timeOfDay === 'morning',
  },

  today: {
    priority: 2,
    category: 'therapy',
    icon: '💡',
    shortLabel: 'Рекомендация',
    relevantTimes: ['day', 'evening'],
    showInMenu: true,
    availablePhases: ['active', 'maintenance'],
    minWeek: 1,
  },

  relax: {
    priority: 3,
    category: 'therapy',
    icon: '🧘',
    shortLabel: 'Расслабление',
    relevantTimes: ['evening', 'night'],
    showInMenu: true,
    availablePhases: ['assessment', 'active', 'maintenance'],
  },

  mindful: {
    priority: 4,
    category: 'therapy',
    icon: '🧠',
    shortLabel: 'Осознанность',
    relevantTimes: ['evening', 'night'],
    showInMenu: true,
    availablePhases: ['active', 'maintenance'],
    minWeek: 2,
  },

  rehearsal: {
    priority: 5,
    category: 'memory',
    icon: '🎭',
    shortLabel: 'Репетиция',
    relevantTimes: ['evening', 'night'],
    showInMenu: true,
    proactive: true,
    availablePhases: ['active', 'maintenance'],
    minWeek: 1,
  },

  recall: {
    priority: 6,
    category: 'memory',
    icon: '🎯',
    shortLabel: 'Тест памяти',
    relevantTimes: ['morning'],
    showInMenu: true,
    proactive: true,
    availablePhases: ['active', 'maintenance'],
    minWeek: 1,
    isVisible: (ctx) => ctx.timeOfDay === 'morning',
  },

  progress: {
    priority: 7,
    category: 'tools',
    icon: '📊',
    shortLabel: 'Прогресс',
    relevantTimes: ['day'],
    showInMenu: true,
    availablePhases: ['active', 'maintenance', 'graduated'],
    minWeek: 1,
  },

  sos: {
    priority: 8,
    category: 'support',
    icon: '🆘',
    shortLabel: 'Экстренная помощь',
    showInMenu: true,
    availablePhases: ['onboarding', 'assessment', 'active', 'maintenance', 'graduated'],
  },

  help: {
    priority: 9,
    category: 'support',
    icon: '❓',
    shortLabel: 'Справка',
    showInMenu: true,
    availablePhases: ['onboarding', 'assessment', 'active', 'maintenance', 'graduated'],
  },

  settings: {
    priority: 10,
    category: 'tools',
    icon: '⚙️',
    shortLabel: 'Настройки',
    showInMenu: false, // Available but not prominent
    availablePhases: ['assessment', 'active', 'maintenance', 'graduated'],
  },

  // Phase 6.1: Content Library Integration
  smart_tips: {
    priority: 2,
    category: 'therapy',
    icon: '✨',
    shortLabel: 'Умные советы',
    relevantTimes: ['morning', 'day', 'evening', 'night'], // Always relevant
    showInMenu: true,
    proactive: true,
    availablePhases: ['assessment', 'active', 'maintenance', 'graduated'],
  },
};

// ==================== Command Registry ====================

/**
 * Command Registry Implementation
 * Manages command registration and context-aware retrieval
 */
export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, IRegisteredCommand> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a command with configuration
   */
  register(command: ICommand, config?: Partial<ICommandConfig>): void {
    const defaultConfig = DEFAULT_COMMAND_CONFIGS[command.name] || {};

    const fullConfig: ICommandConfig = {
      command,
      priority: config?.priority ?? defaultConfig.priority ?? 99,
      category: config?.category ?? defaultConfig.category ?? 'tools',
      icon: config?.icon ?? defaultConfig.icon ?? '📋',
      shortLabel: config?.shortLabel ?? defaultConfig.shortLabel ?? command.name,
      relevantTimes: config?.relevantTimes ?? defaultConfig.relevantTimes,
      availablePhases: config?.availablePhases ?? defaultConfig.availablePhases,
      minWeek: config?.minWeek ?? defaultConfig.minWeek,
      showInMenu: config?.showInMenu ?? defaultConfig.showInMenu ?? true,
      proactive: config?.proactive ?? defaultConfig.proactive,
      isVisible: config?.isVisible ?? defaultConfig.isVisible,
    };

    this.commands.set(command.name, {
      name: command.name,
      config: fullConfig,
    });

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  /**
   * Get command by name or alias
   */
  get(name: string): ICommand | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName)?.config.command;
  }

  /**
   * Get command configuration
   */
  getConfig(name: string): ICommandConfig | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName)?.config;
  }

  /**
   * Get all registered commands
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values()).map((r) => r.config.command);
  }

  /**
   * Get all registered commands with configs
   */
  getAllWithConfigs(): IRegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    const commandName = this.aliases.get(name) || name;
    return this.commands.has(commandName);
  }

  /**
   * Get commands visible in current context
   * Implements Context-Aware Progressive Disclosure
   */
  getVisibleCommands(context: ICommandContext): IRegisteredCommand[] {
    return Array.from(this.commands.values())
      .filter((reg) => this.isCommandVisible(reg.config, context))
      .sort((a, b) => {
        // Sort by relevance first, then priority
        const aRelevant = this.isTimeRelevant(a.config, context);
        const bRelevant = this.isTimeRelevant(b.config, context);

        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;

        return a.config.priority - b.config.priority;
      });
  }

  /**
   * Get proactive suggestions for current context
   * Used for push notifications
   */
  getProactiveSuggestions(context: ICommandContext): IRegisteredCommand[] {
    return this.getVisibleCommands(context)
      .filter((reg) => reg.config.proactive && this.isTimeRelevant(reg.config, context))
      .slice(0, 3); // Max 3 proactive suggestions
  }

  /**
   * Get commands by category
   */
  getByCategory(category: ICommandConfig['category']): IRegisteredCommand[] {
    return Array.from(this.commands.values())
      .filter((reg) => reg.config.category === category)
      .sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Check if command is visible in context
   */
  private isCommandVisible(config: ICommandConfig, context: ICommandContext): boolean {
    // Check menu visibility
    if (!config.showInMenu) return false;

    // Check therapy phase
    if (config.availablePhases && !config.availablePhases.includes(context.therapyPhase)) {
      return false;
    }

    // Check minimum week
    if (config.minWeek !== undefined && context.therapyWeek < config.minWeek) {
      return false;
    }

    // Custom visibility function
    if (config.isVisible && !config.isVisible(context)) {
      return false;
    }

    return true;
  }

  /**
   * Check if command is time-relevant
   */
  private isTimeRelevant(config: ICommandConfig, context: ICommandContext): boolean {
    if (!config.relevantTimes) return true;
    return config.relevantTimes.includes(context.timeOfDay);
  }
}

// ==================== Time Utilities ====================

/**
 * Determine time of day from hour (Moscow timezone)
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Get current time of day in Moscow timezone
 */
export function getCurrentTimeOfDay(): TimeOfDay {
  // Get Moscow time (UTC+3)
  const now = new Date();
  const utcHour = now.getUTCHours();
  const moscowHour = (utcHour + 3) % 24;
  return getTimeOfDay(moscowHour);
}

/**
 * Get Moscow hour
 */
export function getMoscowHour(): number {
  const now = new Date();
  return (now.getUTCHours() + 3) % 24;
}

// ==================== Singleton Export ====================

/**
 * Global command registry instance
 */
export const commandRegistry = new CommandRegistry();

export default commandRegistry;
