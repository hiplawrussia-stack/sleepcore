/**
 * VK Keyboard Converter Unit Tests
 * =================================
 * Tests for the VK keyboard conversion utilities.
 *
 * Test Coverage:
 * - convertToVKInlineKeyboard
 * - convertToVKReplyKeyboard
 * - createEmptyKeyboard
 * - parseCallbackData
 * - serializePayload
 * - keyboardToObject
 * - validateKeyboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertToVKInlineKeyboard,
  convertToVKReplyKeyboard,
  createEmptyKeyboard,
  parseCallbackData,
  serializePayload,
  keyboardToObject,
  validateKeyboard,
} from '../../src/platform/VKKeyboard';
import type { IInlineButton, IReplyButton } from '../../../src/bot/commands/interfaces/ICommand';
import type { VKCallbackPayload, VKKeyboard } from '../../src/platform/types';

describe('VK Keyboard Converter', () => {
  describe('parseCallbackData', () => {
    it('should parse simple command:action format', () => {
      const result = parseCallbackData('therapy:start');

      expect(result).toEqual({
        command: 'therapy',
        action: 'start',
      });
    });

    it('should parse command:action:data format', () => {
      const result = parseCallbackData('breathing:select:box-breathing');

      expect(result).toEqual({
        command: 'breathing',
        action: 'select',
        data: { value: 'box-breathing' },
      });
    });

    it('should parse command:action with multiple colons in data', () => {
      const result = parseCallbackData('diary:entry:2024:01:15');

      expect(result).toEqual({
        command: 'diary',
        action: 'entry',
        data: { value: '2024:01:15' },
      });
    });

    it('should handle empty command', () => {
      const result = parseCallbackData(':action');

      expect(result).toEqual({
        command: '',
        action: 'action',
      });
    });

    it('should handle empty action', () => {
      const result = parseCallbackData('command:');

      expect(result).toEqual({
        command: 'command',
        action: '',
      });
    });

    it('should handle single value (command only)', () => {
      const result = parseCallbackData('start');

      expect(result).toEqual({
        command: 'start',
        action: '',
      });
    });

    it('should handle empty string', () => {
      const result = parseCallbackData('');

      expect(result).toEqual({
        command: '',
        action: '',
      });
    });
  });

  describe('serializePayload', () => {
    it('should serialize simple payload', () => {
      const payload: VKCallbackPayload = {
        command: 'therapy',
        action: 'start',
      };

      const result = serializePayload(payload);

      expect(result).toBe('therapy:start');
    });

    it('should serialize payload with data', () => {
      const payload: VKCallbackPayload = {
        command: 'breathing',
        action: 'select',
        data: { value: 'box-breathing' },
      };

      const result = serializePayload(payload);

      expect(result).toBe('breathing:select:box-breathing');
    });

    it('should serialize payload with complex data value', () => {
      const payload: VKCallbackPayload = {
        command: 'diary',
        action: 'entry',
        data: { value: '2024:01:15' },
      };

      const result = serializePayload(payload);

      expect(result).toBe('diary:entry:2024:01:15');
    });

    it('should ignore data without value property', () => {
      const payload: VKCallbackPayload = {
        command: 'test',
        action: 'action',
        data: { other: 'ignored' } as any,
      };

      const result = serializePayload(payload);

      expect(result).toBe('test:action');
    });
  });

  describe('parseCallbackData and serializePayload roundtrip', () => {
    const testCases = [
      'therapy:start',
      'breathing:select:box',
      'diary:entry:2024:01:15',
      'quest:complete',
    ];

    for (const callbackData of testCases) {
      it(`should roundtrip '${callbackData}'`, () => {
        const payload = parseCallbackData(callbackData);
        const serialized = serializePayload(payload);

        expect(serialized).toBe(callbackData);
      });
    }
  });

  describe('validateKeyboard', () => {
    it('should accept valid keyboard', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Button 1', callbackData: 'action:1' }],
        [{ text: 'Button 2', callbackData: 'action:2' }],
      ];

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept empty keyboard', () => {
      const buttons: IInlineButton[][] = [];

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(true);
    });

    it('should accept maximum allowed rows (6)', () => {
      const buttons: IInlineButton[][] = Array(6).fill([
        { text: 'Button', callbackData: 'action' },
      ]);

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(true);
    });

    it('should reject too many rows (>6)', () => {
      const buttons: IInlineButton[][] = Array(7).fill([
        { text: 'Button', callbackData: 'action' },
      ]);

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many rows: 7');
      expect(result.error).toContain('Max: 6');
    });

    it('should accept maximum buttons per row (10)', () => {
      const buttons: IInlineButton[][] = [
        Array(10).fill({ text: 'B', callbackData: 'a' }),
      ];

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(true);
    });

    it('should reject too many buttons in a row (>10)', () => {
      const buttons: IInlineButton[][] = [
        Array(11).fill({ text: 'B', callbackData: 'a' }),
      ];

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row 1 has too many buttons: 11');
      expect(result.error).toContain('Max: 10');
    });

    it('should report correct row number for invalid row', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'OK', callbackData: 'a' }],
        [{ text: 'OK', callbackData: 'a' }],
        Array(11).fill({ text: 'B', callbackData: 'a' }), // Row 3
      ];

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row 3');
    });

    it('should accept maximum total buttons (40)', () => {
      // 4 rows x 10 buttons = 40
      const buttons: IInlineButton[][] = Array(4).fill(
        Array(10).fill({ text: 'B', callbackData: 'a' })
      );

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(true);
    });

    it('should reject too many total buttons (>40)', () => {
      // 5 rows x 10 buttons = 50
      const buttons: IInlineButton[][] = Array(5).fill(
        Array(10).fill({ text: 'B', callbackData: 'a' })
      );

      const result = validateKeyboard(buttons);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many total buttons: 50');
      expect(result.error).toContain('Max: 40');
    });
  });

  describe('convertToVKInlineKeyboard', () => {
    it('should create inline keyboard from callback buttons', () => {
      const buttons: IInlineButton[][] = [
        [
          { text: 'Start', callbackData: 'therapy:start' },
          { text: 'Help', callbackData: 'help:show' },
        ],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      expect(obj.inline).toBe(true);
      expect(obj.buttons).toBeDefined();
      expect(obj.buttons.length).toBeGreaterThan(0);
    });

    it('should create inline keyboard from URL buttons', () => {
      const buttons: IInlineButton[][] = [
        [
          { text: 'Open Web', url: 'https://example.com' },
        ],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      expect(obj.inline).toBe(true);
      // URL buttons should have open_link action type
      const urlButton = obj.buttons.flat().find(
        (b) => b.action.type === 'open_link'
      );
      expect(urlButton).toBeDefined();
      expect(urlButton?.action.link).toBe('https://example.com');
    });

    it('should create text buttons for buttons without callback or url', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Just Text' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      expect(obj.inline).toBe(true);
      const textButton = obj.buttons.flat().find(
        (b) => b.action.type === 'text'
      );
      expect(textButton).toBeDefined();
    });

    it('should handle empty button array', () => {
      const buttons: IInlineButton[][] = [];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      expect(obj.inline).toBe(true);
      expect(obj.buttons).toBeDefined();
    });

    it('should truncate long button labels', () => {
      const longText = 'A'.repeat(50); // 50 chars, max is 40
      const buttons: IInlineButton[][] = [
        [{ text: longText, callbackData: 'test:truncate' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const button = obj.buttons.flat()[0];
      // Label should be truncated to 40 chars with ellipsis
      expect(button.action.label!.length).toBe(40);
      expect(button.action.label!.endsWith('…')).toBe(true);
    });

    it('should preserve labels under max length', () => {
      const shortText = 'Short Label';
      const buttons: IInlineButton[][] = [
        [{ text: shortText, callbackData: 'test:short' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const button = obj.buttons.flat()[0];
      expect(button.action.label).toBe(shortText);
    });

    it('should handle mixed button types', () => {
      const buttons: IInlineButton[][] = [
        [
          { text: 'Callback', callbackData: 'action:callback' },
          { text: 'Link', url: 'https://example.com' },
          { text: 'Plain' },
        ],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const flatButtons = obj.buttons.flat();
      expect(flatButtons.length).toBe(3);

      const types = flatButtons.map((b) => b.action.type);
      expect(types).toContain('callback');
      expect(types).toContain('open_link');
      expect(types).toContain('text');
    });

    it('should include payload for callback buttons', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Start', callbackData: 'therapy:start:extra' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const callbackButton = obj.buttons.flat().find(
        (b) => b.action.type === 'callback'
      );
      expect(callbackButton).toBeDefined();
      expect(callbackButton?.action.payload).toBeDefined();

      // Parse payload JSON
      const payload = JSON.parse(callbackButton!.action.payload!);
      expect(payload.command).toBe('therapy');
      expect(payload.action).toBe('start');
      expect(payload.data?.value).toBe('extra');
    });
  });

  describe('convertToVKReplyKeyboard', () => {
    it('should create reply keyboard from text buttons', () => {
      const buttons: IReplyButton[][] = [
        [{ text: 'Option 1' }, { text: 'Option 2' }],
      ];

      const keyboard = convertToVKReplyKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      // Reply keyboard should not be inline
      expect(obj.inline).toBeFalsy();
      expect(obj.buttons.length).toBeGreaterThan(0);
    });

    it('should create one-time keyboard when specified', () => {
      const buttons: IReplyButton[][] = [
        [{ text: 'Choose' }],
      ];

      const keyboard = convertToVKReplyKeyboard(buttons, true);
      const obj = keyboardToObject(keyboard);

      expect(obj.one_time).toBe(true);
    });

    it('should create persistent keyboard by default', () => {
      const buttons: IReplyButton[][] = [
        [{ text: 'Persistent' }],
      ];

      const keyboard = convertToVKReplyKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      expect(obj.one_time).toBe(false);
    });

    it('should handle location request button', () => {
      const buttons: IReplyButton[][] = [
        [{ text: 'Share Location', requestLocation: true }],
      ];

      const keyboard = convertToVKReplyKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      // VK has special location_request button
      const locationButton = obj.buttons.flat().find(
        (b) => b.action.type === 'location'
      );
      expect(locationButton).toBeDefined();
    });

    it('should fallback to text for contact request (VK limitation)', () => {
      const buttons: IReplyButton[][] = [
        [{ text: 'Share Contact', requestContact: true }],
      ];

      const keyboard = convertToVKReplyKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      // VK doesn't support contact request - should be text button
      const textButton = obj.buttons.flat().find(
        (b) => b.action.type === 'text'
      );
      expect(textButton).toBeDefined();
      expect(textButton?.action.label).toBe('Share Contact');
    });
  });

  describe('createEmptyKeyboard', () => {
    it('should create an empty keyboard builder', () => {
      const keyboard = createEmptyKeyboard();
      const obj = keyboardToObject(keyboard);

      expect(obj.buttons).toBeDefined();
      expect(obj.buttons.length).toBe(0);
    });
  });

  describe('keyboardToObject', () => {
    it('should convert keyboard builder to VKKeyboard object', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Test', callbackData: 'test:action' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      // VK keyboard JSON structure - check for buttons array
      expect(obj).toHaveProperty('buttons');
      expect(Array.isArray(obj.buttons)).toBe(true);
      // Inline keyboard should have inline property
      expect(obj.inline).toBe(true);
    });
  });

  describe('Edge cases and security', () => {
    it('should handle special characters in button text', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Test <script>alert("xss")</script>', callbackData: 'test:xss' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      // Text should be preserved (VK handles escaping)
      const button = obj.buttons.flat()[0];
      expect(button.action.label).toContain('<script>');
    });

    it('should handle unicode characters in button text', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Начать терапию 🌙', callbackData: 'therapy:start' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const button = obj.buttons.flat()[0];
      expect(button.action.label).toBe('Начать терапию 🌙');
    });

    it('should handle special characters in callback data', () => {
      const buttons: IInlineButton[][] = [
        [{ text: 'Test', callbackData: 'test:action:data=value&foo=bar' }],
      ];

      const keyboard = convertToVKInlineKeyboard(buttons);
      const obj = keyboardToObject(keyboard);

      const callbackButton = obj.buttons.flat().find(
        (b) => b.action.type === 'callback'
      );
      const payload = JSON.parse(callbackButton!.action.payload!);

      expect(payload.data.value).toBe('data=value&foo=bar');
    });

    it('should handle empty rows', () => {
      const buttons: IInlineButton[][] = [
        [], // Empty row
        [{ text: 'Button', callbackData: 'action' }],
      ];

      // Should not throw
      expect(() => convertToVKInlineKeyboard(buttons)).not.toThrow();
    });
  });
});
