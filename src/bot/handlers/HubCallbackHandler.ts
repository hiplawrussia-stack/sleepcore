/**
 * Hub Callback Handler
 * ====================
 * Handles 'hub:*' callbacks for hub menu navigation.
 *
 * Callbacks:
 * - hub:back - Return to main hub menu
 * - hub:mood - Show mood check from hub
 * - hub:sleep - Show sleep check from hub
 * - hub:mood_week - Show mood week visualization
 * - hub:settings - Show settings from hub
 * - hub:section:* - Expand section
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/HubCallbackHandler
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
  getMoodCheckPrompt(context: string): string;
  createMoodKeyboard(prefix: string): InlineKeyboard;
  getSleepCheckPrompt(): string;
  createSleepKeyboard(prefix: string): InlineKeyboard;
  getMoodWeekVisualization(history: IMoodHistory): string;
  analyzeMoodHistory(history: IMoodHistory, days: number): {
    averageMood: number;
    insights: string[];
  };
}

interface IHubMenu {
  generateCompactHubMessage(name?: string): string;
  buildHubKeyboard(): InlineKeyboard;
  generateSectionMessage(sectionId: string): string;
  buildSectionExpandedKeyboard(sectionId: string): InlineKeyboard;
}

/**
 * Hub callback handler
 */
export class HubCallbackHandler extends BaseCallbackHandler {
  readonly command = 'hub';

  private emojiSlider: IEmojiSlider;
  private hubMenu: IHubMenu;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.emojiSlider = deps.emojiSlider as IEmojiSlider;
    this.hubMenu = deps.hubMenu as IHubMenu;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    const session = ctx.session as {
      moodHistory?: IMoodHistory;
      preferences: {
        notifications: boolean;
        notificationTime?: string;
      };
    };

    switch (action) {
      case 'back':
        return this.handleBack(context);

      case 'mood':
        return this.handleMood(context);

      case 'sleep':
        return this.handleSleep(context);

      case 'mood_week':
        return this.handleMoodWeek(context, session);

      case 'settings':
        return this.handleSettings(context, session);

      default:
        // Check if it's a section expand
        if (action.startsWith('section:')) {
          return this.handleSection(context, action);
        }
        return this.handled();
    }
  }

  private async handleBack(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx } = context;
    const message = this.hubMenu.generateCompactHubMessage(ctx.from?.first_name);
    const keyboard = this.hubMenu.buildHubKeyboard();

    await this.editMessageText(context, message, keyboard);
    return this.handled();
  }

  private async handleMood(context: IHandlerContext): Promise<ICallbackResult> {
    const moodPrompt = this.emojiSlider.getMoodCheckPrompt('check-in');
    const moodKeyboard = this.emojiSlider.createMoodKeyboard('mood');

    await this.editMessageText(context, moodPrompt, moodKeyboard);
    return this.handled();
  }

  private async handleSleep(context: IHandlerContext): Promise<ICallbackResult> {
    const sleepPrompt = this.emojiSlider.getSleepCheckPrompt();
    const sleepKeyboard = this.emojiSlider.createSleepKeyboard('sleep');

    await this.editMessageText(context, sleepPrompt, sleepKeyboard);
    return this.handled();
  }

  private async handleMoodWeek(
    context: IHandlerContext,
    session: { moodHistory?: IMoodHistory }
  ): Promise<ICallbackResult> {
    if (!session.moodHistory) {
      session.moodHistory = this.emojiSlider.createInitialHistory();
    }

    const weekViz = this.emojiSlider.getMoodWeekVisualization(session.moodHistory);
    const analysis = this.emojiSlider.analyzeMoodHistory(session.moodHistory, 7);

    let weekMessage = `📊 *Неделя настроения*\n\n`;
    weekMessage += `${weekViz}\n`;
    weekMessage += `Пн  Вт  Ср  Чт  Пт  Сб  Вс\n\n`;
    weekMessage += `📈 Среднее: ${analysis.averageMood.toFixed(1)}/5\n`;

    if (analysis.insights.length > 0) {
      weekMessage += `\n${analysis.insights[0]}`;
    }

    const backKeyboard = new InlineKeyboard().text('◀️ Назад в меню', 'hub:back');

    await this.editMessageText(context, weekMessage, backKeyboard);
    return this.handled();
  }

  private async handleSettings(
    context: IHandlerContext,
    session: { preferences: { notifications: boolean; notificationTime?: string } }
  ): Promise<ICallbackResult> {
    const settingsMessage =
      '⚙️ *Настройки*\n\n' +
      `🔔 Уведомления: ${session.preferences.notifications ? 'Вкл' : 'Выкл'}\n` +
      `⏰ Время: ${session.preferences.notificationTime || '21:00'}\n` +
      `🌍 Язык: Русский`;

    const settingsKeyboard = new InlineKeyboard()
      .text(session.preferences.notifications ? '🔕 Выкл уведомления' : '🔔 Вкл уведомления', 'settings:toggle')
      .row()
      .text('◀️ Назад в меню', 'hub:back');

    await this.editMessageText(context, settingsMessage, settingsKeyboard);
    return this.handled();
  }

  private async handleSection(context: IHandlerContext, action: string): Promise<ICallbackResult> {
    const sectionId = action.replace('section:', '');
    const sectionMessage = this.hubMenu.generateSectionMessage(sectionId);
    const sectionKeyboard = this.hubMenu.buildSectionExpandedKeyboard(sectionId);

    await this.editMessageText(context, sectionMessage, sectionKeyboard);
    return this.handled();
  }
}
