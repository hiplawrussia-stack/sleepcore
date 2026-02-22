/**
 * @sleepcore/core
 * ================
 * Platform-independent core for SleepCore digital therapeutic.
 *
 * This package contains:
 * - Command interfaces (ICommand, IConversationCommand)
 * - Context interfaces (ISleepCoreContext)
 * - Crisis detection/escalation interfaces
 * - Shared services (platform-independent)
 *
 * Platform adapters (Telegram, VK, etc.) implement ISleepCoreContext
 * to provide platform-specific functionality.
 *
 * @example
 * ```typescript
 * import {
 *   ICommand,
 *   ISleepCoreContext,
 *   ICommandResult
 * } from '@sleepcore/core';
 *
 * class MyCommand implements ICommand {
 *   name = 'mycommand';
 *   description = 'My custom command';
 *
 *   async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
 *     return {
 *       success: true,
 *       message: `Hello, ${ctx.displayName}!`
 *     };
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/core
 */

// =============================================================================
// VERSION INFO
// =============================================================================

export const SLEEPCORE_CORE_VERSION = {
  version: '1.0.0-alpha.1',
  name: '@sleepcore/core',
  description: 'Platform-independent core for SleepCore digital therapeutic',
  buildDate: '2026-02-13',
};

// =============================================================================
// INTERFACES
// =============================================================================

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
} from './interfaces';

// =============================================================================
// SERVICES
// =============================================================================

export { SERVICES_VERSION } from './services';

// =============================================================================
// RE-EXPORTS FROM @cognicore/engine
// =============================================================================

// Crisis detection types from CogniCore
export type {
  CrisisDetectionResult,
  CrisisSeverity,
  CrisisType,
} from '@cognicore/engine';
