/**
 * Handler Factory
 * ===============
 * Factory functions for creating and registering callback handlers.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/factory
 */

import { CallbackRouter } from './CallbackRouter';
import type { ICallbackHandler, IHandlerDependencies } from './types';

// Handler imports
import { MenuCallbackHandler } from './MenuCallbackHandler';
import { StartCallbackHandler } from './StartCallbackHandler';
import { DiaryCallbackHandler } from './DiaryCallbackHandler';
import { TherapyCallbackHandler } from './TherapyCallbackHandler';
import { HubCallbackHandler } from './HubCallbackHandler';
import { SettingsCallbackHandler } from './SettingsCallbackHandler';
import { TodayCallbackHandler } from './TodayCallbackHandler';
import { MoodCallbackHandler } from './MoodCallbackHandler';
import { CmdCallbackHandler } from './CmdCallbackHandler';
import { PixelsCallbackHandler } from './PixelsCallbackHandler';
import { GamificationCallbackHandler } from './GamificationCallbackHandler';

/**
 * Handler constructor type
 */
type HandlerConstructor = new (deps: Partial<IHandlerDependencies>) => ICallbackHandler;

/**
 * Registry of all available handler constructors
 */
const HANDLER_REGISTRY: HandlerConstructor[] = [
  MenuCallbackHandler,
  StartCallbackHandler,
  DiaryCallbackHandler,
  TherapyCallbackHandler,
  HubCallbackHandler,
  SettingsCallbackHandler,
  TodayCallbackHandler,
  MoodCallbackHandler,
  CmdCallbackHandler,
  PixelsCallbackHandler,
  GamificationCallbackHandler,
];

/**
 * Creates all callback handlers with provided dependencies
 *
 * @param deps - Handler dependencies (commands, services, repositories)
 * @returns Array of instantiated handlers
 *
 * @example
 * ```typescript
 * const handlers = createAllHandlers({
 *   startCommand,
 *   diaryCommand,
 *   therapyCommand,
 *   assessmentRepository,
 *   sleepDiaryRepository,
 *   auditService,
 * });
 * ```
 */
export function createAllHandlers(deps: Partial<IHandlerDependencies>): ICallbackHandler[] {
  return HANDLER_REGISTRY.map(Handler => new Handler(deps));
}

/**
 * Creates and registers all handlers with a CallbackRouter
 *
 * @param deps - Handler dependencies (commands, services, repositories)
 * @returns Configured CallbackRouter with all handlers registered
 *
 * @example
 * ```typescript
 * const router = registerAllHandlers({
 *   startCommand,
 *   diaryCommand,
 *   // ... other deps
 * });
 *
 * // Use in callback_query handler
 * bot.on('callback_query:data', async (ctx) => {
 *   const result = await router.route(context);
 *   // ...
 * });
 * ```
 */
export function registerAllHandlers(deps: Partial<IHandlerDependencies>): CallbackRouter {
  const router = new CallbackRouter();
  const handlers = createAllHandlers(deps);

  for (const handler of handlers) {
    router.register(handler);
  }

  return router;
}

/**
 * Creates a CallbackRouter with selective handlers
 *
 * @param handlers - Array of handlers to register
 * @returns Configured CallbackRouter
 *
 * @example
 * ```typescript
 * const router = createRouterWithHandlers([
 *   new MenuCallbackHandler(deps),
 *   new StartCallbackHandler(deps),
 * ]);
 * ```
 */
export function createRouterWithHandlers(handlers: ICallbackHandler[]): CallbackRouter {
  const router = new CallbackRouter();

  for (const handler of handlers) {
    router.register(handler);
  }

  return router;
}

/**
 * Gets handler constructor by command name
 *
 * @param command - Command name (e.g., 'start', 'diary')
 * @returns Handler constructor or undefined
 */
export function getHandlerByCommand(command: string): HandlerConstructor | undefined {
  return HANDLER_REGISTRY.find(Handler => {
    // Create temporary instance to check command
    const instance = new Handler({});
    return instance.command === command;
  });
}

/**
 * Lists all registered handler command names
 *
 * @returns Array of command names
 */
export function listHandlerCommands(): string[] {
  return HANDLER_REGISTRY.map(Handler => {
    const instance = new Handler({});
    return instance.command;
  });
}
