/**
 * VK Context Implementation
 * =========================
 * Implements ISleepCoreContext interface from @sleepcore/core for VK platform.
 * Provides platform-agnostic access to bot functionality.
 *
 * Key mappings:
 * - ctx.reply() → ctx.send() in VK
 * - ctx.callbackQuery.data → ctx.eventPayload in VK
 * - ctx.from.id → ctx.senderId in VK
 *
 * Phase 3: Uses platform-independent interfaces from @sleepcore/core
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/platform
 */

import type { MessageContext, API } from 'vk-io';
import type {
  ISleepCoreAPI,
  ISleepCoreContext,
  ICommandResult,
  IReplyOptions,
  VKReplyOptions,
  VKUser,
} from './types';
import {
  convertToVKInlineKeyboard,
  convertToVKReplyKeyboard,
  createEmptyKeyboard,
} from './VKKeyboard';

/**
 * VK Context wrapper that implements ISleepCoreContext from @sleepcore/core.
 * Allows reusing command logic across platforms (Telegram, VK, etc.)
 *
 * This class provides:
 * - Platform-independent interface for commands
 * - Automatic keyboard conversion (IInlineButton → VK Keyboard)
 * - Message formatting (Markdown → plain text for VK)
 * - Access to underlying VK context when needed
 */
export class VKSleepCoreContext implements ISleepCoreContext {
  private _vkContext: MessageContext;
  private _sleepCore: ISleepCoreAPI;
  private _api: API;
  private _user: VKUser | null = null;
  private _languageCode: string = 'ru';

  constructor(
    vkContext: MessageContext,
    sleepCore: ISleepCoreAPI,
    api: API,
    user?: VKUser
  ) {
    this._vkContext = vkContext;
    this._sleepCore = sleepCore;
    this._api = api;
    this._user = user || null;
  }

  /**
   * User ID from VK (as string for compatibility)
   */
  get userId(): string {
    return String(this._vkContext.senderId);
  }

  /**
   * Chat/peer ID
   */
  get chatId(): number {
    return this._vkContext.peerId;
  }

  /**
   * User's display name
   */
  get displayName(): string {
    if (this._user) {
      const parts = [this._user.first_name];
      if (this._user.last_name) {
        parts.push(this._user.last_name);
      }
      return parts.join(' ');
    }
    // Fallback: use senderId
    return `User ${this._vkContext.senderId}`;
  }

  /**
   * Language code (default 'ru' for VK users)
   */
  get languageCode(): string {
    return this._languageCode;
  }

  /**
   * Set language code
   */
  setLanguageCode(code: string): void {
    this._languageCode = code;
  }

  /**
   * SleepCore API instance (platform-independent interface)
   */
  get sleepCore(): ISleepCoreAPI {
    return this._sleepCore;
  }

  /**
   * Original VK context
   */
  get vkContext(): MessageContext {
    return this._vkContext;
  }

  /**
   * Set user info from VK API
   */
  setUser(user: VKUser): void {
    this._user = user;
  }

  /**
   * Reply to user with text message
   * Implements ISleepCoreContext.reply() with platform-independent IReplyOptions
   */
  async reply(text: string, options?: IReplyOptions): Promise<void> {
    const sendOptions: Record<string, unknown> = {
      message: this.convertMarkdown(text),
    };

    // Handle inline keyboard
    if (options?.keyboard && options.keyboard.length > 0) {
      const keyboard = convertToVKInlineKeyboard(options.keyboard);
      sendOptions.keyboard = keyboard;
    }

    // Handle reply keyboard
    if (options?.replyKeyboard && options.replyKeyboard.length > 0) {
      const keyboard = convertToVKReplyKeyboard(options.replyKeyboard);
      sendOptions.keyboard = keyboard;
    }

    // Handle remove keyboard
    if (options?.removeKeyboard) {
      const keyboard = createEmptyKeyboard();
      sendOptions.keyboard = keyboard;
    }

    await this._vkContext.send(sendOptions);
  }

  /**
   * Reply with VK-specific options (for internal use)
   * @internal
   */
  async replyVK(text: string, options?: VKReplyOptions): Promise<void> {
    const sendOptions: Record<string, unknown> = {
      message: this.convertMarkdown(text),
    };

    if (options?.keyboard) {
      sendOptions.keyboard = options.keyboard;
    }

    if (options?.attachments) {
      sendOptions.attachment = options.attachments.join(',');
    }

    if (options?.disableMentions) {
      sendOptions.disable_mentions = true;
    }

    await this._vkContext.send(sendOptions);
  }

  /**
   * Send command result to user
   * Maps ICommandResult to VK message format
   */
  async sendResult(result: ICommandResult): Promise<void> {
    if (!result.message) {
      return;
    }

    // Build IReplyOptions from result (now directly compatible)
    const options: IReplyOptions = {};

    if (result.keyboard) {
      options.keyboard = result.keyboard;
    }

    if (result.replyKeyboard) {
      options.replyKeyboard = result.replyKeyboard;
    }

    if (result.removeKeyboard) {
      options.removeKeyboard = result.removeKeyboard;
    }

    await this.reply(result.message, options);
  }

  /**
   * Convert Telegram Markdown to VK format
   * VK uses different formatting:
   * - No markdown support in messages
   * - Strip formatting markers
   */
  private convertMarkdown(text: string): string {
    // Remove Telegram markdown formatting
    // VK doesn't support markdown in regular messages
    return text
      // Remove bold: *text* or **text**
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      // Remove italic: _text_
      .replace(/_([^_]+)_/g, '$1')
      // Remove code: `text`
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks: ```text```
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim();
      })
      // Remove links: [text](url) → text (url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  }

  /**
   * Answer callback query (VK event)
   * VK requires sending a snackbar or message
   */
  async answerCallback(text?: string): Promise<void> {
    if (this._vkContext.eventPayload) {
      try {
        // For VK callback queries, show snackbar
        await this._vkContext.answer({
          type: 'show_snackbar',
          text: text || 'OK',
        });
      } catch {
        // Fallback: just acknowledge
      }
    }
  }

  /**
   * Edit message (not always supported in VK)
   * @internal VK-specific method
   */
  async editMessage(text: string, options?: VKReplyOptions): Promise<void> {
    const conversationMessageId = this._vkContext.conversationMessageId;
    if (!conversationMessageId) {
      // Can't edit, send new message
      await this.replyVK(text, options);
      return;
    }

    try {
      const editOptions: Record<string, unknown> = {
        peer_id: this._vkContext.peerId,
        conversation_message_id: conversationMessageId,
        message: this.convertMarkdown(text),
      };

      if (options?.keyboard) {
        editOptions.keyboard = options.keyboard;
      }

      await this._api.messages.edit(editOptions as {
        peer_id: number;
        conversation_message_id: number;
        message: string;
        keyboard?: unknown;
      });
    } catch {
      // Edit failed, send new message
      await this.replyVK(text, options);
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId?: number): Promise<void> {
    try {
      const msgId = messageId || this._vkContext.conversationMessageId;
      if (msgId) {
        await this._api.messages.delete({
          peer_id: this._vkContext.peerId,
          conversation_message_ids: [msgId],
          delete_for_all: 1,
        });
      }
    } catch {
      // Silently fail - message might already be deleted
    }
  }

  /**
   * Get message text
   */
  get messageText(): string {
    return this._vkContext.text || '';
  }

  /**
   * Get callback payload
   */
  get callbackPayload(): unknown {
    return this._vkContext.eventPayload;
  }

  /**
   * Check if this is a callback query context
   */
  get isCallback(): boolean {
    return !!this._vkContext.eventPayload;
  }
}

/**
 * Create VK context from message context
 * Factory function for VKSleepCoreContext
 *
 * @param vkContext - Original VK MessageContext
 * @param sleepCore - SleepCore API instance (implements ISleepCoreAPI)
 * @param api - VK API instance
 * @returns VKSleepCoreContext implementing ISleepCoreContext
 */
export async function createVKContext(
  vkContext: MessageContext,
  sleepCore: ISleepCoreAPI,
  api: API
): Promise<VKSleepCoreContext> {
  const ctx = new VKSleepCoreContext(vkContext, sleepCore, api);

  // Fetch user info from VK API
  try {
    const users = await api.users.get({
      user_ids: [vkContext.senderId],
    });
    const user = users[0];
    if (user) {
      ctx.setUser({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        is_closed: Boolean(user.is_closed),
        photo_100: user.photo_100,
      });
    }
  } catch {
    // User info not available, continue with defaults
  }

  return ctx;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if context is VKSleepCoreContext
 */
export function isVKContext(ctx: unknown): ctx is VKSleepCoreContext {
  return ctx instanceof VKSleepCoreContext;
}

/**
 * Get VK MessageContext from any SleepCore context (throws if not VK)
 */
export function getVKContextOrThrow(ctx: unknown): MessageContext {
  if (!isVKContext(ctx)) {
    throw new Error('Expected VKSleepCoreContext');
  }
  return ctx.vkContext;
}
