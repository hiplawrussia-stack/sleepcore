/**
 * Adaptive Keyboard Module
 * ========================
 *
 * Provides personalized Telegram keyboard generation based on
 * user behavior, time context, and therapy phase.
 *
 * Components:
 * - UserInteractionRepository: Tracks user interactions
 * - RuleEngine: Applies personalization rules
 * - AdaptiveKeyboardService: Generates adaptive keyboards
 *
 * @packageDocumentation
 * @module @sleepcore/modules/adaptive-keyboard
 */

export {
  UserInteractionRepository,
  userInteractionRepository,
  type IUserInteraction,
  type ICommandStats,
  type IUserBehaviorContext,
} from './UserInteractionRepository';

export {
  RuleEngine,
  ruleEngine,
  RulePriority,
  DEFAULT_RULES,
  type KeyboardAction,
  type IAdaptationRule,
  type IRuleResult,
  type IAdaptedCommand,
} from './RuleEngine';

export {
  AdaptiveKeyboardService,
  adaptiveKeyboardService,
  DEFAULT_COMMANDS,
  type IKeyboardCommand,
  type IKeyboardLayout,
} from './AdaptiveKeyboardService';
