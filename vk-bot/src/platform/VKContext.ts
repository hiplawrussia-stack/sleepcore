/**
 * VK Context Implementation
 * =========================
 * Implements ISleepCoreContext interface for VK platform.
 * Provides platform-agnostic access to bot functionality.
 *
 * Key mappings:
 * - ctx.reply() → ctx.send() in VK
 * - ctx.callbackQuery.data → ctx.eventPayload in VK
 * - ctx.from.id → ctx.senderId in VK
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/platform
 */

import type { MessageContext, CallbackQueryContext } from 'vk-io';
import type { SleepCoreAPI } from '../../../src/SleepCoreAPI';
import type {
  IVKSleepCoreContext,
  VKReplyOptions,
  VKUser,
  VKSessionData,
} from './types';
import type { ICommandResult } from '../../../src/bot/commands/interfaces/ICommand';
import {
  convertToVKInlineKeyboard,
  convertToVKReplyKeyboard,
  createEmptyKeyboard,
} from './VKKeyboard';

/**
 * VK Context wrapper that implements ISleepCoreContext
 * Allows reusing command logic across platforms
 */
export class VKSleepCoreContext implements IVKSleepCoreContext {
  private _vkContext: MessageContext;
  private _sleepCore: SleepCoreAPI;
  private _user: VKUser | null = null;
  private _languageCode: string = 'ru';

  constructor(
    vkContext: MessageContext,
    sleepCore: SleepCoreAPI,
    user?: VKUser
  ) {
    this._vkContext = vkContext;
    this._sleepCore = sleepCore;
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
   * SleepCore API instance
   */
  get sleepCore(): SleepCoreAPI {
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
   */
  async reply(text: string, options?: VKReplyOptions): Promise<void> {
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

    const options: VKReplyOptions = {};

    // Handle inline keyboard
    if (result.keyboard && result.keyboard.length > 0) {
      const keyboard = convertToVKInlineKeyboard(result.keyboard);
      options.keyboard = keyboard as unknown as VKReplyOptions['keyboard'];
    }

    // Handle reply keyboard
    if (result.replyKeyboard && result.replyKeyboard.length > 0) {
      const keyboard = convertToVKReplyKeyboard(result.replyKeyboard);
      options.keyboard = keyboard as unknown as VKReplyOptions['keyboard'];
    }

    // Handle remove keyboard
    if (result.removeKeyboard) {
      const keyboard = createEmptyKeyboard();
      options.keyboard = keyboard as unknown as VKReplyOptions['keyboard'];
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
   */
  async editMessage(text: string, options?: VKReplyOptions): Promise<void> {
    const conversationMessageId = this._vkContext.conversationMessageId;
    if (!conversationMessageId) {
      // Can't edit, send new message
      await this.reply(text, options);
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

      await this._vkContext.api.messages.edit(
        editOptions as Parameters<typeof this._vkContext.api.messages.edit>[0]
      );
    } catch {
      // Edit failed, send new message
      await this.reply(text, options);
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId?: number): Promise<void> {
    try {
      const msgId = messageId || this._vkContext.conversationMessageId;
      if (msgId) {
        await this._vkContext.api.messages.delete({
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
 */
export async function createVKContext(
  vkContext: MessageContext,
  sleepCore: SleepCoreAPI,
  api: { users: { get: (params: { user_ids: number[] }) => Promise<VKUser[]> } }
): Promise<VKSleepCoreContext> {
  const ctx = new VKSleepCoreContext(vkContext, sleepCore);

  // Fetch user info from VK API
  try {
    const [user] = await api.users.get({
      user_ids: [vkContext.senderId],
    });
    if (user) {
      ctx.setUser(user);
    }
  } catch {
    // User info not available, continue with defaults
  }

  return ctx;
}
