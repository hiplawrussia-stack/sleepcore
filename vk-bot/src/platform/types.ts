/**
 * VK Platform Types
 * =================
 * Type definitions for VK Bot platform integration.
 * Maps VK concepts to SleepCore abstractions.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/platform
 */

import type { MessageContext } from 'vk-io';

// ============================================================================
// Shared Types (copied from main bot for standalone build)
// ============================================================================

/**
 * SleepCore API interface (minimal for VK Bot)
 */
export interface SleepCoreAPI {
  // Add methods as needed by VK Bot
  [key: string]: unknown;
}

/**
 * Inline button for keyboards
 */
export interface IInlineButton {
  text: string;
  callbackData?: string;
  url?: string;
}

/**
 * Command result returned by command handlers
 */
export interface ICommandResult {
  /** Whether command executed successfully */
  success?: boolean;
  /** Message to send to user */
  message?: string;
  /** Inline keyboard buttons */
  keyboard?: IInlineButton[][];
  /** Reply keyboard buttons */
  replyKeyboard?: string[][];
  /** Remove current keyboard */
  removeKeyboard?: boolean;
  /** Next step in conversation */
  nextStep?: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Command metadata */
  metadata?: {
    conversationComplete?: boolean;
    hasCompletedOnboarding?: boolean;
    conversationData?: Record<string, unknown>;
    nextStep?: string;
    [key: string]: unknown;
  };
}

/**
 * Base command interface
 */
export interface ICommand {
  name: string;
  description: string;
  aliases?: string[];
  execute(ctx: unknown, args?: string): Promise<ICommandResult>;
}

/**
 * Conversation command with multi-step flow
 */
export interface IConversationCommand extends ICommand {
  steps: string[];
  handleStep(ctx: unknown, step: string, data: Record<string, unknown>): Promise<ICommandResult>;
  handleCallback(ctx: unknown, callbackData: string, data: Record<string, unknown>): Promise<ICommandResult>;
}

// ============================================================================
// VK-specific Types
// ============================================================================

/**
 * VK user information from API
 */
export interface VKUser {
  id: number;
  first_name: string;
  last_name?: string;
  screen_name?: string;
  sex?: 0 | 1 | 2;
  photo_50?: string;
  photo_100?: string;
  is_closed: boolean;
}

/**
 * Extended VK context for SleepCore commands
 * Platform-agnostic interface matching ISleepCoreContext
 */
export interface IVKSleepCoreContext {
  /** User ID (VK user ID as string) */
  readonly userId: string;

  /** Peer ID (chat/conversation ID) */
  readonly chatId: number;

  /** User's display name */
  readonly displayName: string;

  /** User's language code (default 'ru' for VK) */
  readonly languageCode: string;

  /** SleepCore API instance */
  readonly sleepCore: SleepCoreAPI;

  /** Original VK context */
  readonly vkContext: MessageContext;

  /**
   * Reply to user message
   */
  reply(text: string, options?: VKReplyOptions): Promise<void>;
}

/**
 * Reply options for VK messages
 */
export interface VKReplyOptions {
  /** Inline keyboard */
  keyboard?: VKKeyboard;

  /** Parse mode (not used in VK, but kept for compatibility) */
  parseMode?: 'text' | 'markdown';

  /** Attachments */
  attachments?: string[];

  /** Disable mentions */
  disableMentions?: boolean;
}

/**
 * VK Keyboard structure
 */
export interface VKKeyboard {
  one_time: boolean;
  inline: boolean;
  buttons: VKKeyboardButton[][];
}

/**
 * VK Keyboard button
 */
export interface VKKeyboardButton {
  action: {
    type: 'text' | 'callback' | 'open_link';
    label?: string;
    payload?: string;
    link?: string;
  };
  color?: 'primary' | 'secondary' | 'positive' | 'negative';
}

/**
 * VK callback payload format
 */
export interface VKCallbackPayload {
  command: string;
  action: string;
  data?: Record<string, unknown>;
}

/**
 * VK session data structure
 */
export interface VKSessionData {
  /** Current command being executed */
  currentCommand?: string;

  /** Current step in multi-step command */
  currentStep?: string;

  /** Conversation data accumulated during flow */
  conversationData: Record<string, unknown>;

  /** Session start time */
  startedAt: number;

  /** Last activity time */
  lastActivityAt: number;

  /** Whether user has completed onboarding */
  hasCompletedOnboarding: boolean;

  /** User's preferred language */
  language: 'ru' | 'en';
}

/**
 * VK Bot configuration
 */
export interface VKBotConfig {
  /** VK community token */
  token: string;

  /** VK group ID */
  groupId: number;

  /** API version */
  apiVersion?: string;

  /** Polling options */
  pollingOptions?: {
    /** Timeout in seconds */
    timeout?: number;
  };

  /** Admin VK user IDs for crisis escalation */
  adminUserIds?: number[];
}
