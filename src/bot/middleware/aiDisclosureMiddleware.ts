/**
 * 🤖 AI DISCLOSURE MIDDLEWARE
 * ============================
 * Grammy middleware for mandatory AI identity disclosure per NY Law and CA SB-243.
 *
 * Legal Requirements:
 * - NY AI Companion Law (Nov 5, 2025): Disclosure at start + every 3 hours
 * - CA SB-243 (Jan 1, 2026): Disclosure at interaction start + every 3 hours
 *
 * Middleware Flow:
 * 1. Check if 3 hours have passed since last disclosure
 * 2. If yes, send disclosure message before processing
 * 3. Update lastAiDisclosureAt in session
 * 4. Continue with normal message processing
 *
 * @packageDocumentation
 * @module @sleepcore/bot/middleware
 */

import type { Context, MiddlewareFn, SessionFlavor } from 'grammy';
import {
  AIDisclosureService,
  createAIDisclosureService,
  type IAIDisclosureConfig,
} from '../services/AIDisclosureService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Session data required for AI disclosure tracking
 */
export interface AIDisclosureSessionData {
  /** Timestamp of last AI disclosure shown to user */
  lastAiDisclosureAt?: Date;

  /** User's language preference */
  preferences?: {
    language?: 'ru' | 'en';
  };
}

/**
 * Context with AI disclosure session data
 */
export type AIDisclosureContext<C extends Context> = C & SessionFlavor<AIDisclosureSessionData>;

/**
 * Middleware configuration
 */
export interface IAIDisclosureMiddlewareConfig extends Partial<IAIDisclosureConfig> {
  /**
   * Skip disclosure for these commands (e.g., /start already has its own disclosure)
   * @default ['/start']
   */
  skipCommands?: string[];

  /**
   * Skip disclosure for callback queries with these prefixes
   * @default []
   */
  skipCallbackPrefixes?: string[];

  /**
   * Whether to log disclosure events
   * @default true
   */
  enableLogging?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_DISCLOSURE_MIDDLEWARE_CONFIG: IAIDisclosureMiddlewareConfig = {
  skipCommands: ['/start'], // /start has its own onboarding disclosure
  skipCallbackPrefixes: [],
  enableLogging: true,
};

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/**
 * Create AI disclosure middleware
 *
 * @param config - Optional middleware configuration
 * @returns Grammy middleware function
 *
 * @example
 * ```typescript
 * // In bot setup
 * bot.use(session({ initial: () => ({ lastAiDisclosureAt: undefined }) }));
 * bot.use(createAIDisclosureMiddleware());
 * ```
 */
export function createAIDisclosureMiddleware<C extends AIDisclosureContext<Context>>(
  config: IAIDisclosureMiddlewareConfig = {}
): MiddlewareFn<C> {
  const mergedConfig = { ...DEFAULT_DISCLOSURE_MIDDLEWARE_CONFIG, ...config };
  const service = createAIDisclosureService(config);

  return async (ctx, next) => {
    // Skip if no message/callback (e.g., inline queries, edits)
    if (!ctx.message && !ctx.callbackQuery) {
      return next();
    }

    // Skip for specified commands
    if (ctx.message?.text) {
      const command = ctx.message.text.split(' ')[0].toLowerCase();
      if (mergedConfig.skipCommands?.includes(command)) {
        return next();
      }
    }

    // Skip for specified callback prefixes
    if (ctx.callbackQuery?.data) {
      const callbackData = ctx.callbackQuery.data;
      const shouldSkip = mergedConfig.skipCallbackPrefixes?.some(
        prefix => callbackData.startsWith(prefix)
      );
      if (shouldSkip) {
        return next();
      }
    }

    // Get session data
    const session = (ctx as AIDisclosureContext<Context>).session;
    if (!session) {
      // No session available, skip disclosure check
      return next();
    }

    // Determine user language
    const language = session.preferences?.language || 'ru';

    // Parse lastAiDisclosureAt (may be string from storage)
    let lastDisclosureAt: Date | null = null;
    if (session.lastAiDisclosureAt) {
      lastDisclosureAt = session.lastAiDisclosureAt instanceof Date
        ? session.lastAiDisclosureAt
        : new Date(session.lastAiDisclosureAt);
    }

    // Check if disclosure is needed
    const checkResult = service.checkDisclosure(lastDisclosureAt, language);

    if (checkResult.shouldDisclose && checkResult.message) {
      // Get user and chat IDs for logging
      const userId = ctx.from?.id?.toString() || 'unknown';
      const chatId = ctx.chat?.id?.toString() || 'unknown';

      // Send disclosure message
      try {
        await ctx.reply(checkResult.message, { parse_mode: 'HTML' });

        // Update session with new disclosure timestamp
        session.lastAiDisclosureAt = new Date();

        // Record event for audit trail
        if (mergedConfig.enableLogging) {
          service.recordDisclosure(
            userId,
            chatId,
            checkResult.reason === 'initial' ? 'initial' : 'periodic',
            language
          );
        }

        if (mergedConfig.enableLogging) {
          console.log(`[AIDisclosure] Sent ${checkResult.reason} disclosure to user ${userId}`);
        }
      } catch (error) {
        // Log error but don't block message processing
        console.error('[AIDisclosure] Failed to send disclosure:', error);
      }
    }

    // Continue with normal message processing
    return next();
  };
}

/**
 * Get the AI disclosure service instance used by middleware
 * (for testing and manual disclosure triggering)
 */
export function getAIDisclosureService(): AIDisclosureService {
  return createAIDisclosureService();
}
