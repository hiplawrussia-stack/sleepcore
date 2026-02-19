/**
 * /link Command - Wearable Device Linking
 * ========================================
 * Links Android Companion App with user's Telegram account
 * for Health Connect integration (Samsung Galaxy Watch, etc.)
 *
 * Features:
 * - Download APK directly in Telegram (file_id caching for efficiency)
 * - Generate link codes (RFC 8628 Device Authorization)
 * - View linked devices with sync status
 * - Unlink devices with confirmation dialog
 *
 * UX Design (based on 2025-2026 research):
 * - NN/Group: One step per screen, clear visual feedback
 * - Signal/Microsoft: Device list with explicit "Unlink" action
 * - Telegram UX: Always include "Back" button, use emojis
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
 * APK version for display
 */
const APK_VERSION = '1.1.0';

/**
 * APK download URL (served via API)
 * File is too large (66MB) for Telegram Bot API direct upload (50MB limit)
 */
const APK_DOWNLOAD_URL = 'https://api.sleepcore.ru/download/android';

/**
 * Device info from API
 */
interface IDeviceInfo {
  id: number;
  deviceId: string;
  deviceType: string;
  deviceName: string | null;
  lastSyncAt: string | null;
  isActive: boolean;
}

/**
 * /link Command Implementation
 */
export class LinkCommand implements IConversationCommand {
  readonly name = 'link';
  readonly description = 'Подключить часы/фитнес-трекер';
  readonly aliases = ['connect', 'wearable', 'watch'];
  readonly requiresSession = false;
  readonly steps = ['download', 'generate', 'devices', 'unlink', 'confirm_unlink'];

  /**
   * Execute the command - show link options
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args === 'status' || args === 'devices') {
      return this.showDevices(ctx);
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
      case 'download':
        return this.sendApk(ctx);
      case 'generate':
        return this.generateLinkCode(ctx);
      case 'devices':
        return this.showDevices(ctx);
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
    const parts = callbackData.split(':');
    const action = parts[1];
    const deviceId = parts[2]; // For unlink actions

    switch (action) {
      case 'download':
        return this.sendApk(ctx);
      case 'generate':
        return this.generateLinkCode(ctx);
      case 'devices':
        return this.showDevices(ctx);
      case 'menu':
        return this.showLinkMenu(ctx);
      case 'unlink':
        return this.confirmUnlink(ctx, deviceId);
      case 'confirm_unlink':
        return this.unlinkDevice(ctx, deviceId);
      case 'cancel_unlink':
        return this.showDevices(ctx);
      default:
        return this.showLinkMenu(ctx);
    }
  }

  // ==================== Views ====================

  /**
   * Show main link menu
   * UX: Clear options, emoji for friendliness (Telegram UX best practices)
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
      [{ text: '📥 Скачать приложение', callbackData: 'link:download' }],
      [{ text: '🔗 Получить код привязки', callbackData: 'link:generate' }],
      [{ text: '📱 Мои устройства', callbackData: 'link:devices' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show APK download instructions with link
   * APK is served via API (66MB exceeds Telegram Bot API 50MB limit)
   */
  private async sendApk(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
*SleepCore Companion* v${APK_VERSION}

📱 Приложение для синхронизации данных сна с умных часов.

${formatter.divider()}

📥 *Скачать:*
[SleepCore-Companion.apk](${APK_DOWNLOAD_URL})

${formatter.divider()}

*Установка:*
1. Нажмите на ссылку выше
2. Скачайте файл (66 МБ)
3. Откройте → Установить
4. Разрешите установку из неизвестных источников

${formatter.tip('После установки вернитесь сюда и нажмите "Получить код привязки"')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🔗 Получить код привязки', callbackData: 'link:generate' }],
      [{ text: '◀️ Назад', callbackData: 'link:menu' }],
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

1. Откройте *SleepCore Companion* на телефоне

2. Введите код: \`${linkCode}\`

3. Разрешите доступ к Health Connect

${formatter.warning(`Код действителен ${expiresMinutes} минут`)}

${formatter.tip('После привязки данные будут синхронизироваться автоматически каждые 15 минут')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📥 Скачать приложение', callbackData: 'link:download' }],
        [{ text: '🔄 Новый код', callbackData: 'link:generate' }],
        [{ text: '📱 Мои устройства', callbackData: 'link:devices' }],
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
   * Show connected devices
   * UX: Device list with status, explicit unlink action (Signal pattern)
   */
  private async showDevices(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const telegramId = parseInt(ctx.userId, 10);

      // Fetch devices from API
      const response = await fetch(`${API_URL}/api/wearable/devices?telegramId=${telegramId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      const result = await response.json() as {
        success: boolean;
        data?: { devices: IDeviceInfo[] };
        error?: string;
      };

      const devices = result.data?.devices || [];

      if (devices.length === 0) {
        // No devices linked
        const message = `
*Подключённые устройства*

${formatter.divider()}

${formatter.info('Нет подключённых устройств')}

Подключите ваши часы или фитнес-трекер для автоматической синхронизации данных сна.

${formatter.divider()}

*Как подключить:*
1. Скачайте SleepCore Companion
2. Получите код привязки
3. Введите код в приложении

${formatter.tip('После подключения данные появятся здесь автоматически')}
        `.trim();

        const keyboard: IInlineButton[][] = [
          [{ text: '📥 Скачать приложение', callbackData: 'link:download' }],
          [{ text: '🔗 Подключить устройство', callbackData: 'link:generate' }],
          [{ text: '◀️ Назад', callbackData: 'link:menu' }],
        ];

        return { success: true, message, keyboard };
      }

      // Build devices list
      let devicesText = '';
      const unlinkButtons: IInlineButton[][] = [];

      for (const device of devices) {
        const lastSync = device.lastSyncAt
          ? this.formatLastSync(new Date(device.lastSyncAt))
          : 'Никогда';

        const statusEmoji = device.isActive ? '🟢' : '🔴';
        const deviceName = device.deviceName || device.deviceType || 'Android Companion';

        devicesText += `
${statusEmoji} *${deviceName}*
   Последняя синхронизация: ${lastSync}
`;

        // Add unlink button for each device
        unlinkButtons.push([
          { text: `🗑 Отвязать ${deviceName}`, callbackData: `link:unlink:${device.deviceId}` }
        ]);
      }

      const message = `
*Подключённые устройства*

${formatter.divider()}
${devicesText.trim()}
${formatter.divider()}

${formatter.tip('Синхронизация происходит автоматически каждые 15 минут')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        ...unlinkButtons,
        [{ text: '🔗 Подключить ещё', callbackData: 'link:generate' }],
        [{ text: '◀️ Назад', callbackData: 'link:menu' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      console.error('[LinkCommand] Error fetching devices:', error);

      return {
        success: false,
        error: `
${formatter.error('Не удалось загрузить список устройств')}

Попробуйте позже.
        `.trim(),
        keyboard: [
          [{ text: '🔄 Повторить', callbackData: 'link:devices' }],
          [{ text: '◀️ Назад', callbackData: 'link:menu' }],
        ],
      };
    }
  }

  /**
   * Show unlink confirmation dialog
   * UX: Confirmation before destructive action (NN/Group, Signal pattern)
   */
  private async confirmUnlink(ctx: ISleepCoreContext, deviceId: string): Promise<ICommandResult> {
    const message = `
*Отвязать устройство?*

${formatter.divider()}

${formatter.warning('Вы уверены, что хотите отвязать это устройство?')}

После отвязки:
• Синхронизация данных прекратится
• История данных сохранится
• Можно подключить устройство снова

${formatter.divider()}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🗑 Да, отвязать', callbackData: `link:confirm_unlink:${deviceId}` }],
      [{ text: '❌ Отмена', callbackData: 'link:cancel_unlink' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Unlink device
   */
  private async unlinkDevice(ctx: ISleepCoreContext, deviceId: string): Promise<ICommandResult> {
    try {
      const telegramId = parseInt(ctx.userId, 10);

      const response = await fetch(`${API_URL}/api/wearable/device/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          deviceId,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorJson.error || 'Failed to unlink device');
      }

      const message = `
✅ *Устройство отвязано*

${formatter.divider()}

Устройство успешно отвязано от вашего аккаунта.

${formatter.tip('Вы можете подключить его снова в любой момент')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🔗 Подключить устройство', callbackData: 'link:generate' }],
        [{ text: '📱 Мои устройства', callbackData: 'link:devices' }],
        [{ text: '◀️ Назад', callbackData: 'link:menu' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      console.error('[LinkCommand] Error unlinking device:', error);

      return {
        success: false,
        error: `
${formatter.error('Не удалось отвязать устройство')}

Попробуйте позже.
        `.trim(),
        keyboard: [
          [{ text: '🔄 Повторить', callbackData: `link:unlink:${deviceId}` }],
          [{ text: '◀️ Назад', callbackData: 'link:devices' }],
        ],
      };
    }
  }

  // ==================== Helpers ====================

  /**
   * Format last sync time in human-readable format
   */
  private formatLastSync(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  }
}

// Export singleton
export const linkCommand = new LinkCommand();
