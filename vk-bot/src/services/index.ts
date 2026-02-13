/**
 * VK Bot Services Module
 * ======================
 * Exports for VK bot-specific services.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/services
 */

// ==================== AI Disclosure (NY Law / CA SB-243 Compliance) ====================
export {
  AIDisclosureService,
  createAIDisclosureService,
  aiDisclosureService,
  DEFAULT_AI_DISCLOSURE_CONFIG,
  DISCLOSURE_INTERVAL_MS,
  DISCLOSURE_INTERVAL_HOURS,
} from './AIDisclosureService';

export type {
  IAIDisclosureEvent,
  IAIDisclosureConfig,
  IDisclosureCheckResult,
} from './AIDisclosureService';
