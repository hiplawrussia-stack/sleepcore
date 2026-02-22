/**
 * @sleepcore/core/interfaces
 * ==========================
 * Platform-independent interfaces for SleepCore.
 *
 * @packageDocumentation
 */

export type {
  // Context
  ISleepCoreContext,
  ISleepCoreAPI,
  IReplyOptions,

  // Commands
  ICommand,
  IConversationCommand,
  ICommandResult,
  ICommandMetadata,
  ICommandRegistry,

  // Keyboard
  IInlineButton,
  IReplyButton,

  // Session
  IUserSession,

  // Crisis
  ICrisisDetectionService,
  ICrisisEscalationService,
  ICrisisResponse,
  ICrisisEvent,
} from './ICommand';
