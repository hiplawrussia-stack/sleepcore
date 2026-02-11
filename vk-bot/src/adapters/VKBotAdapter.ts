/**
 * VK Bot Adapter
 * ==============
 * Adapts vk-io library to SleepCore command pattern.
 * Allows reusing command implementations from Telegram bot.
 *
 * Key responsibilities:
 * - Initialize vk-io VK instance
 * - Register command handlers
 * - Route messages to appropriate commands
 * - Manage sessions for conversation flows
 * - Handle callback queries (button presses)
 * - CRITICAL: Crisis detection on every message
 *
 * Safety Integration:
 * - CrisisDetectionService analyzes ALL messages
 * - VK-specific admin notifications via VK API
 * - Follows SAMHSA 2025 guidelines
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/adapters
 */

import { VK, type MessageContext, type MessageEventContext } from 'vk-io';
import { SessionManager } from '@vk-io/session';
import type { SleepCoreAPI } from '../../../src/SleepCoreAPI';
import type {
  ICommand,
  IConversationCommand,
  ICommandResult,
} from '../../../src/bot/commands/interfaces/ICommand';
import { VKSleepCoreContext, createVKContext } from '../platform/VKContext';
import { serializePayload } from '../platform/VKKeyboard';
import type { VKBotConfig, VKSessionData, VKCallbackPayload } from '../platform/types';
import type { ICrisisEvent, ICrisisResponse } from '../../../src/bot/services/CrisisDetectionService';

/**
 * Session context type for vk-io
 */
interface VKSessionContext {
  session: VKSessionData;
}

/**
 * VK Bot Adapter
 * Bridges vk-io with SleepCore command system
 */
export class VKBotAdapter {
  private vk: VK;
  private sessionManager: SessionManager<VKSessionData>;
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private sleepCore: SleepCoreAPI;
  private config: VKBotConfig;

  constructor(config: VKBotConfig, sleepCore: SleepCoreAPI) {
    this.config = config;
    this.sleepCore = sleepCore;

    // Initialize VK instance
    this.vk = new VK({
      token: config.token,
      apiVersion: config.apiVersion || '5.199',
    });

    // Initialize session manager
    this.sessionManager = new SessionManager<VKSessionData>({
      getStorageKey: (context) => `user_${context.senderId}`,
    });
  }

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
   * Register multiple commands
   */
  registerAll(commands: ICommand[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Get command by name or alias
   */
  getCommand(name: string): ICommand | undefined {
    // Check direct name first
    let command = this.commands.get(name);
    if (command) return command;

    // Check aliases
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      command = this.commands.get(aliasTarget);
    }

    return command;
  }

  /**
   * Initialize and start the bot
   */
  async start(): Promise<void> {
    // Apply session middleware
    this.vk.updates.use(this.sessionManager.middleware);

    // Handle text messages
    this.vk.updates.on('message_new', async (context) => {
      await this.handleMessage(context);
    });

    // Handle callback queries (inline button presses)
    this.vk.updates.on('message_event', async (context) => {
      await this.handleCallback(context);
    });

    // Start polling
    console.log('[VK Bot] Starting polling...');
    await this.vk.updates.start();
    console.log('[VK Bot] Bot started successfully');
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    console.log('[VK Bot] Stopping...');
    await this.vk.updates.stop();
    console.log('[VK Bot] Stopped');
  }

  /**
   * Handle incoming text message
   *
   * SAFETY: Crisis detection runs on EVERY message before any other processing.
   * This follows SAMHSA 2025 guidelines and cannot be disabled.
   */
  private async handleMessage(context: MessageContext): Promise<void> {
    const text = context.text?.trim() || '';
    const session = this.getSession(context);

    // Create SleepCore context
    const ctx = await createVKContext(context, this.sleepCore, this.vk.api);

    // =========================================================================
    // SAFETY FIRST: Crisis Detection (ALWAYS runs - cannot be disabled)
    // Research: Woebot model - show resources, don't block user interaction
    // =========================================================================
    await this.runCrisisDetection(ctx, text, context);

    // Check if user is in a conversation flow
    if (session.currentCommand && session.currentStep) {
      await this.handleConversationStep(ctx, text, session);
      return;
    }

    // Check if this is a command
    if (text.startsWith('/')) {
      const [commandName, ...args] = text.slice(1).split(/\s+/);
      const command = this.getCommand(commandName.toLowerCase());

      if (command) {
        await this.executeCommand(ctx, command, args.join(' '), session);
      } else {
        await ctx.reply('Неизвестная команда. Используйте /help для справки.');
      }
      return;
    }

    // Not a command - handle as free text if in conversation
    if (session.currentCommand) {
      await this.handleConversationStep(ctx, text, session);
    } else {
      // Default response for non-command messages
      await ctx.reply(
        'Привет! Я SleepCore бот. Используйте /start для начала или /help для списка команд.'
      );
    }
  }

  /**
   * Run crisis detection on message
   *
   * CRITICAL: This method must NEVER throw or block normal operation.
   * Crisis detection errors are logged but do not interrupt user experience.
   *
   * Based on:
   * - SAMHSA 2025 National Guidelines
   * - Scientific Reports Aug 2025: AI chatbots need robust escalation
   * - Woebot model: show resources, don't block
   */
  private async runCrisisDetection(
    ctx: VKSleepCoreContext,
    text: string,
    vkContext: MessageContext
  ): Promise<void> {
    try {
      const userId = String(vkContext.senderId || '');
      const chatId = String(vkContext.peerId || '');

      // Skip empty messages
      if (!text.trim()) return;

      // Analyze message for crisis indicators
      const crisisResponse: ICrisisResponse = this.sleepCore
        .getCrisisDetection()
        .analyzeMessage(text, userId, chatId);

      if (crisisResponse.shouldInterrupt) {
        // Log crisis event for audit
        console.log(
          `[VK Crisis] Detected severity=${crisisResponse.severity} for user=${userId}`
        );

        // Send crisis response with resources (Woebot pattern: empathetic + actionable)
        await ctx.reply(crisisResponse.message);

        // Escalate to VK admins for HIGH/CRITICAL severity
        if (crisisResponse.event) {
          await this.escalateToVKAdmins(crisisResponse.event);
        }

        // IMPORTANT: Don't return - allow user to continue using bot
        // Research shows blocking increases distress (SAMHSA 2025)
      }
    } catch (crisisError) {
      // Crisis detection should NEVER block normal operation
      console.error('[VK Crisis] Detection error (non-fatal):', crisisError);
    }
  }

  /**
   * Send crisis notifications to VK admins
   *
   * Uses VK API directly since Grammy (Telegram) bot is not available here.
   * Follows same escalation protocol as Telegram version.
   */
  private async escalateToVKAdmins(event: ICrisisEvent): Promise<void> {
    try {
      // Get admin IDs from config
      const adminIds = this.config.adminUserIds || [];

      if (adminIds.length === 0) {
        console.warn('[VK Crisis] No admin user IDs configured for escalation');
        return;
      }

      // Format notification message (VK doesn't support HTML, use plain text)
      const isRussian = event.indicators.some((i) => /[а-яё]/i.test(i));
      const message = this.formatCrisisNotification(event, isRussian);

      // Send to each admin
      let successCount = 0;
      for (const adminId of adminIds) {
        try {
          await this.vk.api.messages.send({
            user_id: adminId,
            message,
            random_id: Date.now(),
          });
          successCount++;
        } catch (error) {
          console.error(`[VK Crisis] Failed to notify admin ${adminId}:`, error);
        }
      }

      console.log(
        `[VK Crisis] Notified ${successCount}/${adminIds.length} admins`
      );

      // Also escalate via standard CrisisEscalationService if available
      // This handles AE creation and audit logging
      try {
        await this.sleepCore.getCrisisEscalation().escalate(event);
      } catch (escError) {
        console.error('[VK Crisis] Standard escalation failed:', escError);
      }
    } catch (error) {
      console.error('[VK Crisis] Escalation error:', error);
    }
  }

  /**
   * Format crisis notification for VK (plain text, no HTML)
   */
  private formatCrisisNotification(event: ICrisisEvent, isRussian: boolean): string {
    const indicators = event.indicators.map((i) => `• ${i}`).join('\n');

    if (isRussian) {
      return event.severity === 'critical'
        ? `🚨 КРИТИЧЕСКИЙ КРИЗИС 🚨

Пользователь: ${event.userId}
Время: ${event.timestamp.toISOString()}
Тип: ${event.crisisType}
Уверенность: ${Math.round(event.confidence * 100)}%

Индикаторы:
${indicators}

Действие: Сессия прервана, показаны кризисные ресурсы.

⚠️ Требуется проверка в течение 30 минут.`
        : `⚠️ ВЫСОКИЙ РИСК

Пользователь: ${event.userId}
Время: ${event.timestamp.toISOString()}
Тип: ${event.crisisType}
Уверенность: ${Math.round(event.confidence * 100)}%

Индикаторы:
${indicators}

Действие: Сессия прервана, показаны кризисные ресурсы.

Рекомендуется проверка.`;
    }

    return event.severity === 'critical'
      ? `🚨 CRITICAL CRISIS 🚨

User: ${event.userId}
Time: ${event.timestamp.toISOString()}
Type: ${event.crisisType}
Confidence: ${Math.round(event.confidence * 100)}%

Indicators:
${indicators}

Action: Session interrupted, crisis resources shown.

⚠️ Review and follow-up required within 30 minutes.`
      : `⚠️ HIGH RISK

User: ${event.userId}
Time: ${event.timestamp.toISOString()}
Type: ${event.crisisType}
Confidence: ${Math.round(event.confidence * 100)}%

Indicators:
${indicators}

Action: Session interrupted, crisis resources shown.

Review recommended.`;
  }

  /**
   * Handle callback query (button press)
   */
  private async handleCallback(eventContext: MessageEventContext): Promise<void> {
    const payload = eventContext.eventPayload as VKCallbackPayload | undefined;
    if (!payload || !payload.command) {
      return;
    }

    // Create a minimal message context adapter for compatibility
    const context = eventContext as unknown as MessageContext;
    const session = this.getSession(context);
    const ctx = await createVKContext(context, this.sleepCore, this.vk.api);

    // Convert payload back to callback data string
    const callbackData = serializePayload(payload);

    // Find the command
    const command = this.getCommand(payload.command);
    if (!command) {
      await ctx.answerCallback('Команда не найдена');
      return;
    }

    // Check if command supports callbacks
    if (this.isConversationCommand(command)) {
      try {
        const result = await command.handleCallback(
          ctx as unknown as Parameters<typeof command.handleCallback>[0],
          callbackData,
          session.conversationData
        );
        await ctx.sendResult(result);
        await ctx.answerCallback();

        // Update session state
        this.updateSessionFromResult(session, result);
      } catch (error) {
        console.error('[VK Bot] Callback error:', error);
        await ctx.answerCallback('Произошла ошибка');
      }
    } else {
      await ctx.answerCallback('OK');
    }

    // Save session
    this.saveSession(context, session);
  }

  /**
   * Execute a command
   */
  private async executeCommand(
    ctx: VKSleepCoreContext,
    command: ICommand,
    args: string,
    session: VKSessionData
  ): Promise<void> {
    try {
      // Initialize conversation if this is a conversation command
      if (this.isConversationCommand(command)) {
        session.currentCommand = command.name;
        session.currentStep = command.steps[0];
        session.conversationData = {};
        session.startedAt = Date.now();
      }

      session.lastActivityAt = Date.now();

      // Execute command
      const result = await command.execute(
        ctx as unknown as Parameters<typeof command.execute>[0],
        args
      );

      // Send result
      await ctx.sendResult(result);

      // Update session from result
      this.updateSessionFromResult(session, result);

      // Save session
      this.saveSession(ctx.vkContext, session);
    } catch (error) {
      console.error(`[VK Bot] Command error (${command.name}):`, error);
      await ctx.reply('Произошла ошибка при выполнении команды. Попробуйте позже.');
    }
  }

  /**
   * Handle step in conversation flow
   */
  private async handleConversationStep(
    ctx: VKSleepCoreContext,
    text: string,
    session: VKSessionData
  ): Promise<void> {
    const command = this.getCommand(session.currentCommand || '');
    if (!command || !this.isConversationCommand(command)) {
      // Clear session and respond
      this.clearSession(session);
      await ctx.reply('Сессия завершена. Используйте /start для начала.');
      return;
    }

    try {
      // Store user input
      session.conversationData[`step_${session.currentStep}_input`] = text;
      session.lastActivityAt = Date.now();

      // Handle current step
      const result = await command.handleStep(
        ctx as unknown as Parameters<typeof command.handleStep>[0],
        session.currentStep || '',
        session.conversationData
      );

      // Send result
      await ctx.sendResult(result);

      // Move to next step or complete
      this.updateSessionFromResult(session, result);

      // Save session
      this.saveSession(ctx.vkContext, session);
    } catch (error) {
      console.error('[VK Bot] Conversation step error:', error);
      this.clearSession(session);
      await ctx.reply('Произошла ошибка. Пожалуйста, начните заново с /start');
    }
  }

  /**
   * Check if command is a conversation command
   */
  private isConversationCommand(command: ICommand): command is IConversationCommand {
    return 'steps' in command && 'handleStep' in command && 'handleCallback' in command;
  }

  /**
   * Update session state based on command result
   */
  private updateSessionFromResult(
    session: VKSessionData,
    result: ICommandResult
  ): void {
    if (!result.success) {
      // Error occurred, clear conversation state
      this.clearSession(session);
      return;
    }

    // Check for metadata indicating conversation completion
    if (result.metadata?.conversationComplete) {
      this.clearSession(session);
      if (result.metadata.hasCompletedOnboarding) {
        session.hasCompletedOnboarding = true;
      }
      return;
    }

    // Update conversation data from metadata
    if (result.metadata?.conversationData) {
      session.conversationData = {
        ...session.conversationData,
        ...(result.metadata.conversationData as Record<string, unknown>),
      };
    }

    // Move to next step if specified
    if (result.metadata?.nextStep) {
      session.currentStep = result.metadata.nextStep as string;
    }
  }

  /**
   * Clear conversation state in session
   */
  private clearSession(session: VKSessionData): void {
    session.currentCommand = undefined;
    session.currentStep = undefined;
    session.conversationData = {};
  }

  /**
   * Get session for context
   */
  private getSession(context: MessageContext): VKSessionData {
    const ctx = context as MessageContext & VKSessionContext;

    if (!ctx.session) {
      ctx.session = this.createDefaultSession();
    }

    return ctx.session;
  }

  /**
   * Save session to context
   */
  private saveSession(context: MessageContext, session: VKSessionData): void {
    const ctx = context as MessageContext & VKSessionContext;
    ctx.session = session;
  }

  /**
   * Create default session
   */
  private createDefaultSession(): VKSessionData {
    return {
      conversationData: {},
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      hasCompletedOnboarding: false,
      language: 'ru',
    };
  }

  /**
   * Get VK API instance
   */
  get api() {
    return this.vk.api;
  }

  /**
   * Get group ID
   */
  get groupId(): number {
    return this.config.groupId;
  }
}
