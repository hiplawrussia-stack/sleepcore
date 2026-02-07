/**
 * Pixels Callback Handler
 * =======================
 * Handles 'pixels:*' callbacks for Year in Pixels visualization.
 *
 * Callbacks:
 * - pixels:stats - Show statistics summary
 * - pixels:month:YYYY:MM - Show month view
 * - pixels:year:YYYY - Show year grid
 * - pixels:quarter:YYYY:Q - Show quarter view
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/PixelsCallbackHandler
 */

import { InlineKeyboard } from 'grammy';
import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';

interface IMoodHistory {
  entries: Array<{
    date: string;
    mood?: number;
    sleep?: number;
    factors: string[];
  }>;
}

interface IEmojiSlider {
  createInitialHistory(): IMoodHistory;
}

interface IYearInPixels {
  generateStatsSummary(history: IMoodHistory): string;
  generateMonthView(history: IMoodHistory, year: number, month: number): {
    message: string;
    keyboard: InlineKeyboard;
  };
  generateYearGrid(history: IMoodHistory, year: number): {
    message: string;
    keyboard: InlineKeyboard;
  };
  generateQuarterView(history: IMoodHistory, year: number, quarter: number): {
    message: string;
    keyboard: InlineKeyboard;
  };
}

/**
 * Pixels callback handler
 * Year in Pixels visualization navigation
 */
export class PixelsCallbackHandler extends BaseCallbackHandler {
  readonly command = 'pixels';

  private emojiSlider: IEmojiSlider;
  private yearInPixels: IYearInPixels;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.emojiSlider = deps.emojiSlider as IEmojiSlider;
    this.yearInPixels = deps.yearInPixels as IYearInPixels;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const session = ctx.session as { moodHistory?: IMoodHistory };

    // Initialize mood history if not present
    if (!session.moodHistory) {
      session.moodHistory = this.emojiSlider.createInitialHistory();
    }

    if (action === 'stats') {
      return this.handleStats(context, session.moodHistory);
    }

    if (action.startsWith('month:')) {
      return this.handleMonth(context, action, session.moodHistory);
    }

    if (action.startsWith('year:')) {
      return this.handleYear(context, action, session.moodHistory);
    }

    if (action.startsWith('quarter:')) {
      return this.handleQuarter(context, action, session.moodHistory);
    }

    return this.handled();
  }

  private async handleStats(
    context: IHandlerContext,
    moodHistory: IMoodHistory
  ): Promise<ICallbackResult> {
    const statsMessage = this.yearInPixels.generateStatsSummary(moodHistory);

    const now = new Date();
    const backKeyboard = new InlineKeyboard()
      .text('📅 Месяц', `pixels:month:${now.getFullYear()}:${now.getMonth()}`)
      .text('📊 Год', `pixels:year:${now.getFullYear()}`)
      .row()
      .text('📱 Меню', 'hub:back');

    await this.editMessageText(context, statsMessage, backKeyboard);
    return this.handled();
  }

  private async handleMonth(
    context: IHandlerContext,
    action: string,
    moodHistory: IMoodHistory
  ): Promise<ICallbackResult> {
    const [, yearStr, monthStr] = action.split(':');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const { message, keyboard } = this.yearInPixels.generateMonthView(
      moodHistory,
      year,
      month
    );

    await this.editMessageText(context, message, keyboard);
    return this.handled();
  }

  private async handleYear(
    context: IHandlerContext,
    action: string,
    moodHistory: IMoodHistory
  ): Promise<ICallbackResult> {
    const yearStr = action.replace('year:', '');
    const year = parseInt(yearStr, 10);

    const { message, keyboard } = this.yearInPixels.generateYearGrid(
      moodHistory,
      year
    );

    await this.editMessageText(context, message, keyboard);
    return this.handled();
  }

  private async handleQuarter(
    context: IHandlerContext,
    action: string,
    moodHistory: IMoodHistory
  ): Promise<ICallbackResult> {
    const [, yearStr, quarterStr] = action.split(':');
    const year = parseInt(yearStr, 10);
    const quarter = parseInt(quarterStr, 10);

    const { message, keyboard } = this.yearInPixels.generateQuarterView(
      moodHistory,
      year,
      quarter
    );

    await this.editMessageText(context, message, keyboard);
    return this.handled();
  }
}
