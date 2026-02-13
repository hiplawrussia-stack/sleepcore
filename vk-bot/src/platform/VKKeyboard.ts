/**
 * VK Keyboard Converter
 * =====================
 * Converts SleepCore IInlineButton format to VK keyboard format.
 *
 * Grammy → VK mapping:
 * - InlineKeyboard → Keyboard.builder() with inline: true
 * - callbackData → payload (JSON string)
 * - url → open_link action
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/platform
 */

import { Keyboard, type KeyboardBuilder } from 'vk-io';
import type { IInlineButton, IReplyButton, VKKeyboard, VKKeyboardButton, VKCallbackPayload } from './types';

/**
 * Convert SleepCore inline buttons to VK inline keyboard
 *
 * @param buttons - SleepCore button matrix
 * @returns VK Keyboard builder
 */
export function convertToVKInlineKeyboard(
  buttons: IInlineButton[][]
): KeyboardBuilder {
  const keyboard = Keyboard.builder().inline();

  for (const row of buttons) {
    for (const button of row) {
      if (button.url) {
        // URL button
        keyboard.urlButton({
          label: truncateLabel(button.text),
          url: button.url,
        });
      } else if (button.callbackData) {
        // Callback button
        const payload = parseCallbackData(button.callbackData);
        keyboard.callbackButton({
          label: truncateLabel(button.text),
          payload: payload,
          color: Keyboard.PRIMARY_COLOR,
        });
      } else {
        // Text button (fallback)
        keyboard.textButton({
          label: truncateLabel(button.text),
          color: Keyboard.SECONDARY_COLOR,
        });
      }
    }
    keyboard.row();
  }

  return keyboard;
}

/**
 * Convert SleepCore reply buttons to VK reply keyboard
 *
 * @param buttons - SleepCore reply button matrix
 * @param oneTime - Whether keyboard should hide after use
 * @returns VK Keyboard builder
 */
export function convertToVKReplyKeyboard(
  buttons: IReplyButton[][],
  oneTime = false
): KeyboardBuilder {
  const keyboard = Keyboard.builder().oneTime(oneTime);

  for (const row of buttons) {
    for (const button of row) {
      if (button.requestContact) {
        // VK doesn't support contact request - use text fallback
        keyboard.textButton({
          label: truncateLabel(button.text),
          color: Keyboard.POSITIVE_COLOR,
        });
      } else if (button.requestLocation) {
        // Location button
        keyboard.locationRequestButton({
          payload: { action: 'location' },
        });
      } else {
        keyboard.textButton({
          label: truncateLabel(button.text),
          color: Keyboard.SECONDARY_COLOR,
        });
      }
    }
    keyboard.row();
  }

  return keyboard;
}

/**
 * Create empty keyboard (remove keyboard)
 */
export function createEmptyKeyboard(): KeyboardBuilder {
  return Keyboard.builder();
}

/**
 * Parse callback data string to VK payload format
 * Format: 'command:action' or 'command:action:data'
 *
 * @param callbackData - SleepCore callback string
 * @returns VK payload object
 */
export function parseCallbackData(callbackData: string): VKCallbackPayload {
  const parts = callbackData.split(':');
  const [command, action, ...rest] = parts;

  const payload: VKCallbackPayload = {
    command: command || '',
    action: action || '',
  };

  // If there's additional data, include it
  if (rest.length > 0) {
    payload.data = { value: rest.join(':') };
  }

  return payload;
}

/**
 * Serialize VK payload to callback data string
 * Reverse of parseCallbackData
 *
 * @param payload - VK callback payload
 * @returns SleepCore callback string
 */
export function serializePayload(payload: VKCallbackPayload): string {
  let result = `${payload.command}:${payload.action}`;
  if (payload.data?.value) {
    result += `:${payload.data.value}`;
  }
  return result;
}

/**
 * Truncate button label to VK max length (40 chars)
 *
 * @param label - Original label text
 * @returns Truncated label
 */
function truncateLabel(label: string): string {
  const maxLength = 40;
  if (label.length <= maxLength) {
    return label;
  }
  return label.substring(0, maxLength - 1) + '…';
}

/**
 * Convert VK keyboard JSON to object
 * Used for debugging and testing
 *
 * @param keyboard - VK KeyboardBuilder
 * @returns VK Keyboard object
 */
export function keyboardToObject(keyboard: KeyboardBuilder): VKKeyboard {
  // Get keyboard JSON string and parse it
  const json = keyboard.toString();
  return JSON.parse(json) as VKKeyboard;
}

/**
 * Validate keyboard structure
 * VK limits: max 10 buttons per row, max 6 rows
 *
 * @param buttons - Button matrix to validate
 * @returns Validation result
 */
export function validateKeyboard(
  buttons: IInlineButton[][]
): { valid: boolean; error?: string } {
  const maxRows = 6;
  const maxButtonsPerRow = 10;
  const maxTotalButtons = 40;

  if (buttons.length > maxRows) {
    return {
      valid: false,
      error: `Too many rows: ${buttons.length}. Max: ${maxRows}`,
    };
  }

  let totalButtons = 0;

  for (let i = 0; i < buttons.length; i++) {
    const row = buttons[i];
    if (row.length > maxButtonsPerRow) {
      return {
        valid: false,
        error: `Row ${i + 1} has too many buttons: ${row.length}. Max: ${maxButtonsPerRow}`,
      };
    }
    totalButtons += row.length;
  }

  if (totalButtons > maxTotalButtons) {
    return {
      valid: false,
      error: `Too many total buttons: ${totalButtons}. Max: ${maxTotalButtons}`,
    };
  }

  return { valid: true };
}
