/**
 * /link Command - Wearable Device Linking
 * ========================================
 * Links Android Companion App with user's Telegram account
 * for Health Connect integration (Samsung Galaxy Watch, etc.)
 *
 * Flow:
 * 1. User runs /link in Telegram
 * 2. Bot generates 6-char code via API
 * 3. User enters code in Android Companion App
 * 4. App gets JWT token and starts syncing Health Connect data
 *
 * Data synced:
 * - Sleep sessions (stages, duration, quality)
 * - HRV (RMSSD) for hyperarousal assessment
 * - Heart rate during sleep
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';

/**
 * API URL for wearable endpoints
 */
const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * /link Command Implementation
 */
export class LinkCommand implements IConversationCommand {
  readonly name = 'link';
  readonly description = 'Подключить часы/фитнес-трекер';
  readonly aliases = ['connect', 'wearable', 'watch'];
  readonly requiresSession = false;
  readonly steps = ['generate', 'status'];

  /**
   * Execute the command - show link options
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args === 'status') {
      return this.showDeviceStatus(ctx);
    }
    return this.showLinkMenu(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step) {
      case 'generate':
        return this.generateLinkCode(ctx);
      case 'status':
        return this.showDeviceStatus(ctx);
      default:
        return this.showLinkMenu(ctx);
    }
  }

  /**
   * Handle callback query
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const [, action] = callbackData.split(':');

    switch (action) {
      case 'generate':
        return this.generateLinkCode(ctx);
      case 'status':
        return this.showDeviceStatus(ctx);
      case 'menu':
        return this.showLinkMenu(ctx);
      default:
        return this.showLinkMenu(ctx);
    }
  }

  // ==================== Views ====================

  /**
   * Show main link menu
   */
  private async showLinkMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
*Подключение носимого устройства*

Подключите ваши умные часы или фитнес-трекер к SleepCore для автоматической синхронизации данных сна.

${formatter.divider()}

*Поддерживаемые устройства:*
• Samsung Galaxy Watch (4, 5, 6, 7)
• Google Pixel Watch
• Fitbit (Sense, Versa, Charge)
• OnePlus Watch
• Xiaomi Mi Band (через Health Connect)

${formatter.divider()}

*Что синхронизируется:*
• Стадии сна (лёгкий, глубокий, REM)
• Продолжительность и качество
• HRV (для оценки напряжённости)
• Пульс во время сна

${formatter.tip('Требуется Android 9+ с Health Connect')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔗 Получить код привязки', callbackData: 'link:generate' }],
      [{ text: '📱 Статус устройств', callbackData: 'link:status' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Generate a link code for the Android app
   */
  private async generateLinkCode(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const telegramId = parseInt(ctx.userId, 10);

      // Call API to generate link code
      const response = await fetch(`${API_URL}/api/wearable/link/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          firstName: ctx.displayName || 'User',
          lastName: undefined,
          username: undefined,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorJson.error || 'API request failed');
      }

      const result = await response.json() as {
        success: boolean;
        data?: { linkCode: string; expiresInSeconds: number };
        error?: string;
      };

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate link code');
      }

      const { linkCode, expiresInSeconds } = result.data;
      const expiresMinutes = Math.floor(expiresInSeconds / 60);

      const message = `
*Код привязки устройства*

${formatter.divider()}

\`${linkCode}\`

${formatter.divider()}

*Инструкция:*

1. Установите *SleepCore Companion* на телефон
   _Скачать: sleepcore.ru/app_

2. Откройте приложение

3. Введите код: \`${linkCode}\`

4. Разрешите доступ к Health Connect

${formatter.warning(`Код действителен ${expiresMinutes} минут`)}

${formatter.tip('После привязки данные будут синхронизироваться автоматически каждые 15 минут')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🔄 Новый код', callbackData: 'link:generate' }],
        [{ text: '📱 Статус устройств', callbackData: 'link:status' }],
        [{ text: '◀️ Назад', callbackData: 'link:menu' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      console.error('Link code generation error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if API is unavailable
      if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: `
${formatter.error('Сервис временно недоступен')}

Не удалось связаться с сервером. Попробуйте позже.
          `.trim(),
          keyboard: [
            [{ text: '🔄 Повторить', callbackData: 'link:generate' }],
            [{ text: '◀️ Назад', callbackData: 'link:menu' }],
          ],
        };
      }

      return {
        success: false,
        error: `Не удалось сгенерировать код: ${errorMessage}`,
        keyboard: [
          [{ text: '🔄 Повторить', callbackData: 'link:generate' }],
          [{ text: '◀️ Назад', callbackData: 'link:menu' }],
        ],
      };
    }
  }

  /**
   * Show connected device status
   */
  private async showDeviceStatus(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      // For now, show a placeholder since we need device token
      // In production, this would query the API for linked devices
      const message = `
*Подключённые устройства*

${formatter.divider()}

${formatter.info('Нет подключённых устройств')}

Используйте кнопку ниже чтобы подключить ваши часы или фитнес-трекер.

${formatter.divider()}

*Как проверить:*
1. Откройте SleepCore Companion на телефоне
2. Проверьте статус синхронизации
3. Последняя синхронизация отображается в приложении

${formatter.tip('После подключения устройства данные появятся здесь автоматически')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🔗 Подключить устройство', callbackData: 'link:generate' }],
        [{ text: '◀️ Назад', callbackData: 'link:menu' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return {
        success: false,
        error: 'Не удалось получить статус устройств',
        keyboard: [
          [{ text: '◀️ Назад', callbackData: 'link:menu' }],
        ],
      };
    }
  }
}

// Export singleton
export const linkCommand = new LinkCommand();
