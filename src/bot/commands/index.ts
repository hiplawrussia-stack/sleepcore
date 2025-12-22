/**
 * SleepCore Bot Commands Module
 * =============================
 * Exports all bot commands and handlers.
 *
 * Commands:
 * - /start - Onboarding + ISI assessment
 * - /diary - 3-tap sleep diary
 * - /today - Daily CBT-I intervention
 * - /relax - Relaxation techniques
 * - /mindful - MBT-I/ACT-I practices
 * - /progress - Weekly progress report
 * - /sos - Crisis intervention
 * - /help - Command reference
 * - /rehearsal - Pre-sleep mental rehearsal (Smart Memory Window)
 * - /recall - Morning memory quiz (Smart Memory Window)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

// ==================== Interfaces ====================
export type {
  ICommand,
  IConversationCommand,
  ICommandRegistry,
  ICommandResult,
  ISleepCoreContext,
  IUserSession,
  IInlineButton,
  IReplyButton,
  IMessageFormatter,
} from './interfaces/ICommand';

// ==================== Utils ====================
export { MessageFormatter, formatter } from './utils/MessageFormatter';
export type { ISISeverity, SEStatus } from './utils/MessageFormatter';

// ==================== Commands ====================
export { StartCommand, startCommand } from './StartCommand';
export { DiaryCommand, diaryCommand } from './DiaryCommand';
export { TodayCommand, todayCommand } from './TodayCommand';
export { RelaxCommand, relaxCommand } from './RelaxCommand';
export { MindfulCommand, mindfulCommand } from './MindfulCommand';
export { ProgressCommand, progressCommand } from './ProgressCommand';
export { SosCommand, sosCommand } from './SosCommand';
export { HelpCommand, helpCommand } from './HelpCommand';
export { RehearsalCommand, rehearsalCommand } from './RehearsalCommand';
export { RecallCommand, recallCommand } from './RecallCommand';

// ==================== Handler ====================
export { CommandHandler, createCommandHandler } from './CommandHandler';

// ==================== All Commands Array ====================
import { startCommand } from './StartCommand';
import { diaryCommand } from './DiaryCommand';
import { todayCommand } from './TodayCommand';
import { relaxCommand } from './RelaxCommand';
import { mindfulCommand } from './MindfulCommand';
import { progressCommand } from './ProgressCommand';
import { sosCommand } from './SosCommand';
import { helpCommand } from './HelpCommand';
import { rehearsalCommand } from './RehearsalCommand';
import { recallCommand } from './RecallCommand';

/**
 * All registered commands
 */
export const allCommands = [
  startCommand,
  diaryCommand,
  todayCommand,
  relaxCommand,
  mindfulCommand,
  progressCommand,
  sosCommand,
  helpCommand,
  rehearsalCommand,
  recallCommand,
] as const;

/**
 * Command names for BotFather registration
 */
export const commandDescriptions = allCommands.map((cmd) => ({
  command: cmd.name,
  description: cmd.description,
}));
