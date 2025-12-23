/**
 * AdaptiveKeyboardService - Dynamic Keyboard Generation
 * ======================================================
 *
 * Generates personalized Telegram inline keyboards based on user behavior,
 * time context, and therapy phase. Integrates UserInteractionRepository
 * and RuleEngine for intelligent adaptation.
 *
 * Research basis:
 * - Personalization increases retention 25-40% (Global Wellness Institute)
 * - Progressive Disclosure: show 3 primary + 3 secondary actions
 * - Quick Access: SOS/Help always visible (safety-first)
 * - Adaptive UI: hide ignored commands, promote frequent ones
 *
 * @packageDocumentation
 * @module @sleepcore/modules/adaptive-keyboard
 */

import { InlineKeyboard } from 'grammy';
import {
  UserInteractionRepository,
  userInteractionRepository,
  type IUserBehaviorContext,
} from './UserInteractionRepository';
import { RuleEngine, ruleEngine, type IAdaptedCommand } from './RuleEngine';
import { getCurrentTimeOfDay, type TimeOfDay } from '../../bot/commands/registry';

/**
 * Command definition for keyboard
 */
export interface IKeyboardCommand {
  name: string;
  label: string;
  icon: string;
  callbackData: string;
  category: 'primary' | 'secondary' | 'quick-access';
}

/**
 * Keyboard layout configuration
 */
export interface IKeyboardLayout {
  primaryActions: IKeyboardCommand[];
  secondaryActions: IKeyboardCommand[];
  quickAccess: IKeyboardCommand[];
  hiddenCommands: string[];
  highlightedCommands: string[];
}

/**
 * Default commands available in SleepCore
 */
const DEFAULT_COMMANDS: IKeyboardCommand[] = [
  // Primary actions
  { name: 'diary', label: 'Дневник сна', icon: '📔', callbackData: 'menu:diary', category: 'primary' },
  { name: 'progress', label: 'Прогресс', icon: '📊', callbackData: 'menu:progress', category: 'primary' },
  { name: 'today', label: 'Сегодня', icon: '📅', callbackData: 'menu:today', category: 'primary' },

  // Secondary actions
  { name: 'relax', label: 'Расслабление', icon: '🧘', callbackData: 'menu:relax', category: 'secondary' },
  { name: 'mindful', label: 'Осознанность', icon: '🧠', callbackData: 'menu:mindful', category: 'secondary' },
  { name: 'rehearsal', label: 'Репетиция сна', icon: '🎭', callbackData: 'menu:rehearsal', category: 'secondary' },
  { name: 'recall', label: 'Тест памяти', icon: '🎯', callbackData: 'menu:recall', category: 'secondary' },

  // Quick access (always visible)
  { name: 'help', label: 'Справка', icon: '❓', callbackData: 'menu:help', category: 'quick-access' },
  { name: 'sos', label: 'SOS', icon: '🆘', callbackData: 'menu:sos', category: 'quick-access' },
];

/**
 * AdaptiveKeyboardService - Generates personalized keyboards
 */
export class AdaptiveKeyboardService {
  private commands: IKeyboardCommand[];

  constructor(
    private interactionRepo: UserInteractionRepository = userInteractionRepository,
    private rules: RuleEngine = ruleEngine,
    customCommands?: IKeyboardCommand[]
  ) {
    this.commands = customCommands || [...DEFAULT_COMMANDS];
  }

  /**
   * Generate adaptive keyboard for user
   */
  async generateKeyboard(
    userId: string,
    sessionId?: string
  ): Promise<InlineKeyboard> {
    const layout = await this.generateLayout(userId, sessionId);
    return this.buildKeyboard(layout);
  }

  /**
   * Generate keyboard layout based on user context
   */
  async generateLayout(
    userId: string,
    sessionId?: string
  ): Promise<IKeyboardLayout> {
    const timeOfDay = getCurrentTimeOfDay();
    const dayOfWeek = new Date().getDay();

    // Build user behavior context
    const context = await this.interactionRepo.buildBehaviorContext(
      userId,
      timeOfDay,
      dayOfWeek
    );

    // Apply rules to commands
    const commandNames = this.commands.map((c) => c.name);
    const adaptedCommands = this.rules.applyRules(commandNames, context);

    // Record that commands were shown
    await this.recordCommandsShown(userId, adaptedCommands, timeOfDay, dayOfWeek, sessionId);

    // Build layout from adapted commands
    return this.buildLayout(adaptedCommands, context);
  }

  /**
   * Record that commands were shown to user
   */
  private async recordCommandsShown(
    userId: string,
    adaptedCommands: IAdaptedCommand[],
    timeOfDay: TimeOfDay,
    dayOfWeek: number,
    sessionId?: string
  ): Promise<void> {
    for (const adapted of adaptedCommands) {
      if (adapted.visible) {
        await this.interactionRepo.recordCommandShown(userId, adapted.command, {
          timeOfDay,
          dayOfWeek,
          sessionId,
        });
      }
    }
  }

  /**
   * Record that user clicked a command
   */
  async recordCommandClick(
    userId: string,
    command: string,
    sessionId?: string
  ): Promise<void> {
    const timeOfDay = getCurrentTimeOfDay();
    const dayOfWeek = new Date().getDay();

    await this.interactionRepo.recordCommandClicked(userId, command, {
      timeOfDay,
      dayOfWeek,
      sessionId,
    });
  }

  /**
   * Build layout from adapted commands
   */
  private buildLayout(
    adaptedCommands: IAdaptedCommand[],
    context: IUserBehaviorContext
  ): IKeyboardLayout {
    const visibleCommands = adaptedCommands.filter((c) => c.visible);
    const hiddenCommands = adaptedCommands.filter((c) => !c.visible).map((c) => c.command);
    const highlightedCommands = adaptedCommands
      .filter((c) => c.visible && c.highlighted)
      .map((c) => c.command);

    // Sort commands: promoted first, then normal, then demoted
    const sortedCommands = this.rules.getSortedCommands(adaptedCommands);

    // Map back to full command objects
    const sortedFullCommands = sortedCommands
      .map((name) => this.commands.find((c) => c.name === name))
      .filter(Boolean) as IKeyboardCommand[];

    // Separate by category, respecting sorting
    const quickAccess = sortedFullCommands.filter((c) => c.category === 'quick-access');

    // For primary/secondary, use sorted order but respect category limits
    const nonQuickAccess = sortedFullCommands.filter((c) => c.category !== 'quick-access');

    // Primary: top 3 non-quick-access commands
    const primaryActions = nonQuickAccess.slice(0, 3);

    // Secondary: next 3-4 commands
    const secondaryActions = nonQuickAccess.slice(3, 7);

    return {
      primaryActions,
      secondaryActions,
      quickAccess,
      hiddenCommands,
      highlightedCommands,
    };
  }

  /**
   * Build InlineKeyboard from layout
   */
  private buildKeyboard(layout: IKeyboardLayout): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Primary actions (2 per row for better touch targets)
    for (let i = 0; i < layout.primaryActions.length; i += 2) {
      const row = layout.primaryActions.slice(i, i + 2);
      for (const cmd of row) {
        const label = this.formatLabel(cmd, layout.highlightedCommands);
        keyboard.text(label, cmd.callbackData);
      }
      keyboard.row();
    }

    // Secondary actions (2-3 per row)
    if (layout.secondaryActions.length > 0) {
      for (let i = 0; i < layout.secondaryActions.length; i += 2) {
        const row = layout.secondaryActions.slice(i, i + 2);
        for (const cmd of row) {
          const label = this.formatLabel(cmd, layout.highlightedCommands);
          keyboard.text(label, cmd.callbackData);
        }
        keyboard.row();
      }
    }

    // Quick access always at bottom
    for (const cmd of layout.quickAccess) {
      const label = this.formatLabel(cmd, layout.highlightedCommands);
      keyboard.text(label, cmd.callbackData);
    }

    return keyboard;
  }

  /**
   * Format button label with icon and optional highlight
   */
  private formatLabel(
    command: IKeyboardCommand,
    highlightedCommands: string[]
  ): string {
    const isHighlighted = highlightedCommands.includes(command.name);
    const prefix = isHighlighted ? '✨ ' : '';
    return `${prefix}${command.icon} ${command.label}`;
  }

  /**
   * Get keyboard explanation for debugging
   */
  async getKeyboardExplanation(userId: string): Promise<string> {
    const timeOfDay = getCurrentTimeOfDay();
    const dayOfWeek = new Date().getDay();
    const context = await this.interactionRepo.buildBehaviorContext(
      userId,
      timeOfDay,
      dayOfWeek
    );

    const commandNames = this.commands.map((c) => c.name);
    const adaptedCommands = this.rules.applyRules(commandNames, context);

    const lines: string[] = [
      `**Keyboard Explanation for User ${userId}**`,
      `Time: ${timeOfDay}, Day: ${dayOfWeek}`,
      `Total interactions: ${context.totalInteractions}`,
      `Days active: ${context.daysActive}`,
      '',
      '**Commands:**',
    ];

    for (const adapted of adaptedCommands) {
      const status = adapted.visible
        ? adapted.promoted
          ? '⬆️ promoted'
          : adapted.demoted
          ? '⬇️ demoted'
          : '✅ visible'
        : '❌ hidden';

      const highlight = adapted.highlighted ? ' ✨highlighted' : '';
      const rules = adapted.appliedRules.length > 0
        ? ` (${adapted.appliedRules.join(', ')})`
        : '';

      lines.push(`  ${adapted.command}: ${status}${highlight}${rules}`);
    }

    return lines.join('\n');
  }

  /**
   * Add custom command
   */
  addCommand(command: IKeyboardCommand): void {
    this.commands.push(command);
  }

  /**
   * Remove command
   */
  removeCommand(name: string): boolean {
    const index = this.commands.findIndex((c) => c.name === name);
    if (index !== -1) {
      this.commands.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all available commands
   */
  getCommands(): IKeyboardCommand[] {
    return [...this.commands];
  }

  /**
   * Get user behavior context (for external use)
   */
  async getUserContext(userId: string): Promise<IUserBehaviorContext> {
    const timeOfDay = getCurrentTimeOfDay();
    const dayOfWeek = new Date().getDay();
    return this.interactionRepo.buildBehaviorContext(userId, timeOfDay, dayOfWeek);
  }
}

// Singleton instance
export const adaptiveKeyboardService = new AdaptiveKeyboardService();

// Export default commands for customization
export { DEFAULT_COMMANDS };
