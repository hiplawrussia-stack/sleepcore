/**
 * Callback Handlers Module
 * ========================
 * Modular callback handler architecture for SleepCore Telegram bot.
 *
 * Architecture based on research (2025-2026):
 * - grammY Router plugin pattern
 * - Clean Architecture / Hexagonal Architecture
 * - Strategy Pattern for handler selection
 * - IEC 62304 modular design requirements
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers
 */

// Types
export * from './types';

// Router
export { CallbackRouter, createCallbackRouter } from './CallbackRouter';

// Base Handler
export { BaseCallbackHandler } from './BaseCallbackHandler';

// Individual Handlers (added as implemented)
export { MenuCallbackHandler } from './MenuCallbackHandler';
export { SettingsCallbackHandler } from './SettingsCallbackHandler';
export { TodayCallbackHandler } from './TodayCallbackHandler';
export { MoodCallbackHandler } from './MoodCallbackHandler';
export { HubCallbackHandler } from './HubCallbackHandler';
export { CmdCallbackHandler } from './CmdCallbackHandler';
export { PixelsCallbackHandler } from './PixelsCallbackHandler';
export { GamificationCallbackHandler } from './GamificationCallbackHandler';
export { StartCallbackHandler } from './StartCallbackHandler';
export { DiaryCallbackHandler } from './DiaryCallbackHandler';
export { TherapyCallbackHandler } from './TherapyCallbackHandler';

// Factory
export { createAllHandlers, registerAllHandlers, createRouterWithHandlers, listHandlerCommands } from './factory';

// Integration utilities
export { createCallbackProcessor, buildKeyboard, sendCommandResult } from './integration';
export type { IProcessorResult, CallbackProcessor } from './integration';
