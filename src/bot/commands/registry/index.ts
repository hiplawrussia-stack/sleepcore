/**
 * Command Registry Module
 * =======================
 * Exports for config-driven command management and context-aware menus.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands/registry
 */

// ==================== Command Registry ====================
export {
  CommandRegistry,
  commandRegistry,
  DEFAULT_COMMAND_CONFIGS,
  getTimeOfDay,
  getCurrentTimeOfDay,
  getMoscowHour,
} from './CommandRegistry';

export type {
  TimeOfDay,
  TherapyPhase,
  ICommandContext,
  ICommandConfig,
  IRegisteredCommand,
} from './CommandRegistry';

// ==================== Context-Aware Menu Service ====================
export {
  ContextAwareMenuService,
  createContextAwareMenuService,
} from './ContextAwareMenuService';

export type {
  IMenuLayout,
  IContextualGreeting,
  IJITAIContext,
} from './ContextAwareMenuService';
