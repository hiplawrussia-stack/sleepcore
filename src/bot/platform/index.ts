/**
 * SleepCore Bot Platform Module
 * =============================
 * Platform adapters for different messaging platforms.
 *
 * Currently supported:
 * - Telegram (Grammy)
 *
 * Planned:
 * - VK (vk-io)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/platform
 */

export {
  TelegramSleepCoreContext,
  createTelegramContext,
  isTelegramContext,
  getGrammyContextOrThrow,
  type TelegramSessionData,
  type TelegramContext,
} from './TelegramSleepCoreContext';
