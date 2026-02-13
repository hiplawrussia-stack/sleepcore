/**
 * VK Platform Types
 * =================
 * Type definitions for VK Bot platform integration.
 * Maps VK concepts to SleepCore abstractions.
 *
 * Uses @sleepcore/core for shared interfaces.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/platform
 */

import type { MessageContext } from 'vk-io';
import type { ISleepCoreContext as CoreSleepCoreContext } from '@sleepcore/core';

// ============================================================================
// Re-export shared types from @sleepcore/core
// ============================================================================

export type {
  ICommand,
  IConversationCommand,
  ICommandResult,
  ICommandMetadata,
  IInlineButton,
  IReplyButton,
  IReplyOptions,
  ISleepCoreAPI,
  ISleepCoreContext,
  ICrisisResponse,
  ICrisisEvent,
} from '@sleepcore/core';

// Alias for backwards compatibility (deprecated)
export type { ISleepCoreAPI as SleepCoreAPI } from '@sleepcore/core';

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
 *
 * @deprecated Use ISleepCoreContext from @sleepcore/core instead.
 * VKSleepCoreContext now implements ISleepCoreContext directly.
 * This interface is kept for backward compatibility only.
 */
export interface IVKSleepCoreContext extends CoreSleepCoreContext {
  /** Original VK context (VK-specific extension) */
  readonly vkContext: MessageContext;

  /**
   * Reply with VK-specific options
   * @deprecated Use reply(text, IReplyOptions) instead
   */
  replyVK?(text: string, options?: VKReplyOptions): Promise<void>;
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

  /**
   * Last AI disclosure timestamp (NY Law / CA SB-243 compliance)
   * Disclosure required at start + every 3 hours
   */
  lastAiDisclosureAt?: number;
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

  /**
   * Redis URL for persistent sessions
   * If not provided, falls back to REDIS_URL env variable
   * If neither available, uses in-memory storage
   * @example 'redis://localhost:6379'
   */
  redisUrl?: string;
}
