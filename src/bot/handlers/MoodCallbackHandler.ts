/**
 * Mood Callback Handler
 * =====================
 * Handles mood-related callbacks (Wysa-style emoji slider).
 *
 * Callbacks:
 * - mood:1-5 - Mood level selection
 * - sleep:1-5 - Sleep quality selection
 * - mfactor:* - Mood factor multi-select
 * - sfactor:* - Sleep factor multi-select
 * - greeting:mood:* - Daily greeting mood check
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/MoodCallbackHandler
 */

import { InlineKeyboard } from 'grammy';
import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';

// Types for mood/sleep
type MoodLevel = 1 | 2 | 3 | 4 | 5;
type SleepQualityLevel = 1 | 2 | 3 | 4 | 5;

interface IMoodHistory {
  entries: Array<{
    date: string;
    mood?: number;
    sleep?: number;
    factors: string[];
  }>;
}

interface IPendingMoodCheck {
  type: 'mood' | 'sleep';
  level: number;
  context: 'morning' | 'evening' | 'check-in';
  selectedFactors: string[];
}

interface IEmojiSlider {
  createInitialHistory(): IMoodHistory;
  getMoodItem(level: MoodLevel): { emoji: string; label: string };
  getSleepItem(level: SleepQualityLevel): { emoji: string; label: string };
  getFactorPrompt(type: 'mood' | 'sleep'): string;
  createCompactFactorKeyboard(type: 'mood' | 'sleep', selected: string[], prefix: string): InlineKeyboard;
  createMoodKeyboard(prefix: string): InlineKeyboard;
  createSleepKeyboard(prefix: string): InlineKeyboard;
  getMoodCheckPrompt(context: string): string;
  getSleepCheckPrompt(): string;
  recordMood(history: IMoodHistory, level: MoodLevel, factors: string[], context?: string): void;
  recordSleep(history: IMoodHistory, level: SleepQualityLevel, factors: string[]): void;
  formatMoodResponse(level: MoodLevel, factors: string[]): string;
  formatSleepResponse(level: SleepQualityLevel, factors: string[]): string;
}

interface IDailyGreeting {
  generateMoodResponse(level: number, name?: string): string;
  getMoodSuggestions(level: number): string[];
}

interface IOnboardingTracker {
  completeStep(userId: string, step: string): void;
}

/**
 * Mood callback handler
 * Handles mood, sleep, mfactor, sfactor, greeting callbacks
 */
export class MoodCallbackHandler extends BaseCallbackHandler {
  readonly command = 'mood';

  private emojiSlider: IEmojiSlider;
  private dailyGreeting: IDailyGreeting;
  private onboardingTracker: IOnboardingTracker;

  // Additional commands this handler responds to
  private additionalCommands = ['sleep', 'mfactor', 'sfactor', 'greeting'];

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.emojiSlider = deps.emojiSlider as IEmojiSlider;
    this.dailyGreeting = deps.dailyGreeting as IDailyGreeting;
    this.onboardingTracker = deps.onboardingTracker as IOnboardingTracker;
  }

  canHandle(data: { command: string }): boolean {
    return data.command === this.command || this.additionalCommands.includes(data.command);
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { callbackData } = context;
    const { command } = callbackData;

    switch (command) {
      case 'mood':
        return this.handleMood(context);
      case 'sleep':
        return this.handleSleep(context);
      case 'mfactor':
        return this.handleMoodFactor(context);
      case 'sfactor':
        return this.handleSleepFactor(context);
      case 'greeting':
        return this.handleGreeting(context);
      default:
        return this.notHandled();
    }
  }

  private async handleMood(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const moodLevel = parseInt(action) as MoodLevel;
    if (moodLevel < 1 || moodLevel > 5) {
      return this.notHandled();
    }

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      pendingMoodCheck?: IPendingMoodCheck;
    };

    // Initialize mood history if not present
    if (!session.moodHistory) {
      session.moodHistory = this.emojiSlider.createInitialHistory();
    }

    // Determine context
    const hour = new Date().getHours();
    const moodContext: 'morning' | 'evening' | 'check-in' =
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 18 && hour < 23 ? 'evening' : 'check-in';

    // Save pending mood check for factor selection
    session.pendingMoodCheck = {
      type: 'mood',
      level: moodLevel,
      context: moodContext,
      selectedFactors: [],
    };

    // Show factor selection
    const moodItem = this.emojiSlider.getMoodItem(moodLevel);
    const factorPrompt = `${moodItem.emoji} *${moodItem.label}*\n\n${this.emojiSlider.getFactorPrompt('mood')}`;
    const factorKeyboard = this.emojiSlider.createCompactFactorKeyboard('mood', [], 'mfactor');

    await this.editMessageText(context, factorPrompt, factorKeyboard);
    return this.handled();
  }

  private async handleSleep(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const sleepLevel = parseInt(action) as SleepQualityLevel;
    if (sleepLevel < 1 || sleepLevel > 5) {
      return this.notHandled();
    }

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      pendingMoodCheck?: IPendingMoodCheck;
    };

    // Initialize mood history if not present
    if (!session.moodHistory) {
      session.moodHistory = this.emojiSlider.createInitialHistory();
    }

    // Save pending sleep check for factor selection
    session.pendingMoodCheck = {
      type: 'sleep',
      level: sleepLevel,
      context: 'morning',
      selectedFactors: [],
    };

    // Show factor selection
    const sleepItem = this.emojiSlider.getSleepItem(sleepLevel);
    const factorPrompt = `${sleepItem.emoji} *${sleepItem.label}*\n\n${this.emojiSlider.getFactorPrompt('sleep')}`;
    const factorKeyboard = this.emojiSlider.createCompactFactorKeyboard('sleep', [], 'sfactor');

    await this.editMessageText(context, factorPrompt, factorKeyboard);
    return this.handled();
  }

  private async handleMoodFactor(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      pendingMoodCheck?: IPendingMoodCheck;
    };

    if (!session.pendingMoodCheck || session.pendingMoodCheck.type !== 'mood') {
      return this.handledWithMessage('Сессия устарела');
    }

    if (action === 'done') {
      // Save mood entry
      const pending = session.pendingMoodCheck;
      this.emojiSlider.recordMood(
        session.moodHistory!,
        pending.level as MoodLevel,
        pending.selectedFactors,
        pending.context
      );

      // Generate response
      const response = this.emojiSlider.formatMoodResponse(
        pending.level as MoodLevel,
        pending.selectedFactors
      );

      // Clear pending
      session.pendingMoodCheck = undefined;

      await this.editMessageText(context, response);
      return this.handledWithMessage('✅ Записано!');
    }

    // Toggle factor selection
    const factors = session.pendingMoodCheck.selectedFactors;
    const idx = factors.indexOf(action);
    if (idx >= 0) {
      factors.splice(idx, 1);
    } else {
      factors.push(action);
    }

    // Update keyboard
    const moodItem = this.emojiSlider.getMoodItem(session.pendingMoodCheck.level as MoodLevel);
    const factorPrompt = `${moodItem.emoji} *${moodItem.label}*\n\n${this.emojiSlider.getFactorPrompt('mood')}`;
    const factorKeyboard = this.emojiSlider.createCompactFactorKeyboard('mood', factors, 'mfactor');

    await this.editMessageText(context, factorPrompt, factorKeyboard);
    return this.handled();
  }

  private async handleSleepFactor(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      pendingMoodCheck?: IPendingMoodCheck;
    };

    if (!session.pendingMoodCheck || session.pendingMoodCheck.type !== 'sleep') {
      return this.handledWithMessage('Сессия устарела');
    }

    if (action === 'done') {
      // Save sleep entry
      const pending = session.pendingMoodCheck;
      this.emojiSlider.recordSleep(
        session.moodHistory!,
        pending.level as SleepQualityLevel,
        pending.selectedFactors
      );

      // Generate response
      const response = this.emojiSlider.formatSleepResponse(
        pending.level as SleepQualityLevel,
        pending.selectedFactors
      );

      // Clear pending
      session.pendingMoodCheck = undefined;

      await this.editMessageText(context, response);
      return this.handledWithMessage('✅ Записано!');
    }

    // Toggle factor selection
    const factors = session.pendingMoodCheck.selectedFactors;
    const idx = factors.indexOf(action);
    if (idx >= 0) {
      factors.splice(idx, 1);
    } else {
      factors.push(action);
    }

    // Update keyboard
    const sleepItem = this.emojiSlider.getSleepItem(session.pendingMoodCheck.level as SleepQualityLevel);
    const factorPrompt = `${sleepItem.emoji} *${sleepItem.label}*\n\n${this.emojiSlider.getFactorPrompt('sleep')}`;
    const factorKeyboard = this.emojiSlider.createCompactFactorKeyboard('sleep', factors, 'sfactor');

    await this.editMessageText(context, factorPrompt, factorKeyboard);
    return this.handled();
  }

  private async handleGreeting(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, sleepCoreCtx, callbackData } = context;
    const { action } = callbackData;

    if (!action.startsWith('mood:')) {
      return this.notHandled();
    }

    const moodLevel = parseInt(action.replace('mood:', ''), 10);

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      onboardingProgress?: {
        completedSteps: string[];
      };
    };

    // Initialize mood history if not present
    if (!session.moodHistory) {
      session.moodHistory = this.emojiSlider.createInitialHistory();
    }

    // Record quick mood from greeting (simplified - no factors)
    this.emojiSlider.recordMood(
      session.moodHistory,
      moodLevel as MoodLevel,
      [] // No factors for quick greeting mood
    );

    // Onboarding tracking: first mood check
    if (session.onboardingProgress && !session.onboardingProgress.completedSteps.includes('first_mood_check')) {
      this.onboardingTracker.completeStep(sleepCoreCtx.userId, 'first_mood_check');
      session.onboardingProgress.completedSteps.push('first_mood_check');
    }

    // Generate contextual response based on mood
    const response = this.dailyGreeting.generateMoodResponse(moodLevel, ctx.from?.first_name);

    // Build follow-up keyboard based on mood
    const followupKeyboard = new InlineKeyboard();

    if (moodLevel <= 2) {
      // Low mood - offer support
      followupKeyboard
        .text('🧘 Расслабление', 'cmd:relax')
        .text('🆘 Помощь', 'cmd:sos')
        .row();
    } else {
      // Normal/good mood - offer activities
      followupKeyboard
        .text('📓 Дневник', 'cmd:diary')
        .text('🎯 Челленджи', 'cmd:challenges')
        .row();
    }
    followupKeyboard.text('📱 Меню', 'hub:back');

    await this.editMessageText(context, response, followupKeyboard);
    return this.handledWithMessage('Записано!');
  }
}
