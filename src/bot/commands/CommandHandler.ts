/**
 * SleepCore Command Handler
 * =========================
 * Registers and manages all bot commands.
 * Integrates with Grammy for Telegram bot functionality.
 *
 * Features:
 * - Command registration with BotFather format
 * - Alias support
 * - Session management
 * - Callback query routing
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import { Bot, Context } from 'grammy';
import type { ICommand, ICommandRegistry, ISleepCoreContext, IUserSession } from './interfaces/ICommand';
import { SleepCoreAPI } from '../../SleepCoreAPI';

// Import all commands
import { startCommand } from './StartCommand';
import { diaryCommand } from './DiaryCommand';
import { todayCommand } from './TodayCommand';
import { relaxCommand } from './RelaxCommand';
import { mindfulCommand } from './MindfulCommand';
import { progressCommand } from './ProgressCommand';
import { sosCommand } from './SosCommand';
import { helpCommand } from './HelpCommand';
// Gamification commands (Sprint 7)
import { profileCommand } from './ProfileCommand';
import { questCommand } from './QuestCommand';
import { badgeCommand } from './BadgeCommand';
import { evolutionCommand } from './EvolutionCommand';
// Phase 6.1: Content Library Integration
import { smartTipsCommand } from './SmartTipsCommand';

/**
 * Command Handler implementation
 */
export class CommandHandler implements ICommandRegistry {
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private sessions: Map<string, IUserSession> = new Map();
  private sleepCore: SleepCoreAPI;

  constructor(sleepCore?: SleepCoreAPI) {
    this.sleepCore = sleepCore || new SleepCoreAPI();
    this.registerDefaultCommands();
  }

  // ==================== ICommandRegistry Implementation ====================

  /**
   * Register a command
   */
  register(command: ICommand): void {
    this.commands.set(command.name, command);

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
    const normalizedName = name.toLowerCase().replace(/^\//, '');

    // Try direct match
    const command = this.commands.get(normalizedName);
    if (command) return command;

    // Try alias
    const aliasTarget = this.aliases.get(normalizedName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Get all registered commands
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  // ==================== Bot Integration ====================

  /**
   * Register all commands with Grammy bot
   */
  registerWithBot(bot: Bot<Context>): void {
    // Register each command
    for (const command of this.commands.values()) {
      bot.command(command.name, async (ctx) => {
        await this.handleCommand(ctx, command);
      });

      // Register aliases
      if (command.aliases) {
        for (const alias of command.aliases) {
          bot.command(alias, async (ctx) => {
            await this.handleCommand(ctx, command);
          });
        }
      }
    }

    // Register callback query handler
    bot.on('callback_query:data', async (ctx) => {
      await this.handleCallbackQuery(ctx);
    });
  }

  /**
   * Get commands list for BotFather
   */
  getBotFatherCommands(): Array<{ command: string; description: string }> {
    return this.getAll().map((cmd) => ({
      command: cmd.name,
      description: cmd.description,
    }));
  }

  /**
   * Set commands with Telegram API
   */
  async setMyCommands(bot: Bot<Context>): Promise<void> {
    const commands = this.getBotFatherCommands();
    await bot.api.setMyCommands(commands);
  }

  // ==================== Command Handling ====================

  /**
   * Handle command execution
   */
  private async handleCommand(ctx: Context, command: ICommand): Promise<void> {
    try {
      // Build extended context
      const sleepCoreCtx = this.buildSleepCoreContext(ctx);

      // Check session requirement
      if (command.requiresSession) {
        const session = this.sleepCore.getSession(sleepCoreCtx.userId);
        if (!session) {
          await ctx.reply(
            '⚠️ Для этой команды нужно начать программу.\n\nИспользуйте /start',
            { parse_mode: 'HTML' }
          );
          return;
        }
      }

      // Extract arguments
      const args = ctx.message?.text?.split(' ').slice(1).join(' ') || undefined;

      // Execute command
      const result = await command.execute(sleepCoreCtx, args);

      // Send response
      await this.sendCommandResult(ctx, result);

      // Update session
      this.updateSession(sleepCoreCtx.userId, command.name);
    } catch (error) {
      console.error(`Command ${command.name} failed:`, error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Handle callback query
   */
  private async handleCallbackQuery(ctx: Context): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    try {
      // Parse callback data: "command:action:value"
      const parts = data.split(':');
      const commandName = parts[0];

      // Find command
      const command = this.get(commandName);
      if (!command) {
        await ctx.answerCallbackQuery({ text: 'Команда не найдена' });
        return;
      }

      // Check if command supports callbacks
      if (!('handleCallback' in command)) {
        await ctx.answerCallbackQuery({ text: 'Действие не поддерживается' });
        return;
      }

      // Build context
      const sleepCoreCtx = this.buildSleepCoreContext(ctx);

      // Get session data
      const session = this.getSession(sleepCoreCtx.userId);
      const conversationData = session?.conversationData || {};

      // Handle callback
      const result = await (command as any).handleCallback(
        sleepCoreCtx,
        data,
        conversationData
      );

      // Answer callback query
      await ctx.answerCallbackQuery();

      // Edit or send message
      if (result.message) {
        await this.editOrSendMessage(ctx, result);
      }

      // Update session
      if (result.metadata) {
        this.updateSessionData(sleepCoreCtx.userId, result.metadata);
      }
    } catch (error) {
      console.error('Callback query failed:', error);
      await ctx.answerCallbackQuery({ text: 'Ошибка обработки' });
    }
  }

  // ==================== Context Building ====================

  /**
   * Build SleepCore context from Grammy context
   */
  private buildSleepCoreContext(ctx: Context): ISleepCoreContext {
    const from = ctx.from;
    const chat = ctx.chat;

    return {
      ...ctx,
      userId: from?.id?.toString() || 'unknown',
      chatId: chat?.id || 0,
      displayName: from?.first_name || from?.username || 'пользователь',
      languageCode: from?.language_code || 'ru',
      sleepCore: this.sleepCore,
    } as ISleepCoreContext;
  }

  // ==================== Session Management ====================

  /**
   * Get user session
   */
  private getSession(userId: string): IUserSession | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Update session with current command
   */
  private updateSession(userId: string, commandName: string): void {
    const existing = this.sessions.get(userId);

    if (existing) {
      existing.currentCommand = commandName;
      existing.lastActivityAt = new Date();
    } else {
      this.sessions.set(userId, {
        userId,
        currentCommand: commandName,
        conversationData: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        hasCompletedOnboarding: false,
        language: 'ru',
      });
    }
  }

  /**
   * Update session conversation data
   */
  private updateSessionData(userId: string, data: Record<string, unknown>): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.conversationData = { ...session.conversationData, ...data };
      session.lastActivityAt = new Date();

      // Check for onboarding completion
      if (data.onboardingCompleted) {
        session.hasCompletedOnboarding = true;
      }
    }
  }

  // ==================== Response Sending ====================

  /**
   * Send command result to user
   */
  private async sendCommandResult(
    ctx: Context,
    result: { success: boolean; message?: string; keyboard?: any[][]; error?: string }
  ): Promise<void> {
    if (!result.success && result.error) {
      await ctx.reply(`❌ ${result.error}`);
      return;
    }

    if (!result.message) return;

    // Build reply options
    const options: any = {
      parse_mode: 'HTML',
    };

    // Add inline keyboard if present
    if (result.keyboard) {
      options.reply_markup = {
        inline_keyboard: result.keyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            callback_data: btn.callbackData,
            url: btn.url,
          }))
        ),
      };
    }

    await ctx.reply(result.message, options);
  }

  /**
   * Edit existing message or send new one
   */
  private async editOrSendMessage(
    ctx: Context,
    result: { message?: string; keyboard?: any[][] }
  ): Promise<void> {
    if (!result.message) return;

    const options: any = {
      parse_mode: 'HTML',
    };

    if (result.keyboard) {
      options.reply_markup = {
        inline_keyboard: result.keyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            callback_data: btn.callbackData,
            url: btn.url,
          }))
        ),
      };
    }

    try {
      // Try to edit the message
      await ctx.editMessageText(result.message, options);
    } catch {
      // If edit fails, send new message
      await ctx.reply(result.message, options);
    }
  }

  // ==================== Default Commands Registration ====================

  /**
   * Register all default commands
   */
  private registerDefaultCommands(): void {
    // Core commands
    this.register(startCommand);
    this.register(diaryCommand);
    this.register(todayCommand);
    this.register(relaxCommand);
    this.register(mindfulCommand);
    this.register(progressCommand);
    this.register(sosCommand);
    this.register(helpCommand);

    // Gamification commands (Sprint 7)
    this.register(profileCommand);
    this.register(questCommand);
    this.register(badgeCommand);
    this.register(evolutionCommand);

    // Phase 6.1: Content Library Integration
    this.register(smartTipsCommand);
  }
}

// Export factory function
export function createCommandHandler(sleepCore?: SleepCoreAPI): CommandHandler {
  return new CommandHandler(sleepCore);
}
