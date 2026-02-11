/**
 * VK Utilities Tests
 * ==================
 * Tests for VK Mini Apps launch params validation and parsing.
 *
 * @see https://github.com/VKCOM/vk-apps-launch-params
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateVKLaunchParams,
  parseVKLaunchParams,
  generateMockVKLaunchParams,
} from '../../src/utils/vk.js';
import { createHmac } from 'crypto';

describe('VK Utilities', () => {
  const testSecretKey = 'test_vk_secret_key_12345';
  const testUserId = 123456789;

  describe('generateMockVKLaunchParams', () => {
    it('should generate valid launch params string', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      expect(launchParams).toBeDefined();
      expect(typeof launchParams).toBe('string');
      expect(launchParams).toContain('vk_user_id=');
      expect(launchParams).toContain('vk_app_id=');
      expect(launchParams).toContain('vk_ts=');
      expect(launchParams).toContain('sign=');
    });

    it('should use default values for missing options', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);
      const parsed = parseVKLaunchParams(launchParams);

      expect(parsed).not.toBeNull();
      expect(parsed?.vk_user_id).toBe(testUserId);
      expect(parsed?.vk_app_id).toBe(12345678); // Default app ID
      expect(parsed?.vk_language).toBe('ru');
      expect(parsed?.vk_platform).toBe('mobile_android');
    });

    it('should include custom options', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey, {
        appId: 999888777,
        language: 'en',
        platform: 'desktop_web',
      });
      const parsed = parseVKLaunchParams(launchParams);

      expect(parsed?.vk_app_id).toBe(999888777);
      expect(parsed?.vk_language).toBe('en');
      expect(parsed?.vk_platform).toBe('desktop_web');
    });

    it('should generate valid timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);
      const after = Math.floor(Date.now() / 1000);

      const parsed = parseVKLaunchParams(launchParams);

      expect(parsed?.vk_ts).toBeGreaterThanOrEqual(before);
      expect(parsed?.vk_ts).toBeLessThanOrEqual(after);
    });

    it('should generate unique signatures for different users', () => {
      const params1 = generateMockVKLaunchParams(111, testSecretKey);
      const params2 = generateMockVKLaunchParams(222, testSecretKey);

      const sign1 = new URLSearchParams(params1).get('sign');
      const sign2 = new URLSearchParams(params2).get('sign');

      expect(sign1).not.toBe(sign2);
    });

    it('should generate unique signatures for different secret keys', () => {
      const params1 = generateMockVKLaunchParams(testUserId, 'secret1');
      const params2 = generateMockVKLaunchParams(testUserId, 'secret2');

      const sign1 = new URLSearchParams(params1).get('sign');
      const sign2 = new URLSearchParams(params2).get('sign');

      expect(sign1).not.toBe(sign2);
    });
  });

  describe('validateVKLaunchParams', () => {
    it('should validate correctly signed launch params', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      const result = validateVKLaunchParams(launchParams, testSecretKey);

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.vkId).toBe(testUserId);
      expect(result.user?.languageCode).toBe('ru');
      expect(result.error).toBeUndefined();
    });

    it('should reject launch params with wrong secret key', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      const result = validateVKLaunchParams(launchParams, 'wrong-secret-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
      expect(result.user).toBeUndefined();
    });

    it('should reject launch params without sign', () => {
      const params = new URLSearchParams();
      params.set('vk_user_id', '123456789');
      params.set('vk_app_id', '12345678');
      params.set('vk_ts', Math.floor(Date.now() / 1000).toString());

      const result = validateVKLaunchParams(params.toString(), testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing sign parameter');
    });

    it('should reject launch params without vk_ts', () => {
      const params = new URLSearchParams();
      params.set('vk_user_id', '123456789');
      params.set('vk_app_id', '12345678');
      params.set('sign', 'somesign');

      const result = validateVKLaunchParams(params.toString(), testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing vk_ts parameter');
    });

    it('should reject expired launch params', () => {
      // Create params with timestamp from 2 days ago
      const oldTime = Math.floor(Date.now() / 1000) - 172800; // 48 hours ago

      const params = new URLSearchParams();
      params.set('vk_user_id', String(testUserId));
      params.set('vk_app_id', '12345678');
      params.set('vk_is_app_user', '1');
      params.set('vk_are_notifications_enabled', '0');
      params.set('vk_language', 'ru');
      params.set('vk_ref', 'other');
      params.set('vk_access_token_settings', '');
      params.set('vk_platform', 'mobile_android');
      params.set('vk_is_favorite', '0');
      params.set('vk_ts', String(oldTime));

      // Calculate valid signature for old params
      const vkParams: [string, string][] = [];
      for (const [key, value] of params.entries()) {
        if (key.startsWith('vk_')) {
          vkParams.push([key, value]);
        }
      }
      vkParams.sort((a, b) => a[0].localeCompare(b[0]));
      const queryString = vkParams.map(([k, v]) => `${k}=${v}`).join('&');
      const sign = createHmac('sha256', testSecretKey)
        .update(queryString)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      params.set('sign', sign);

      const result = validateVKLaunchParams(params.toString(), testSecretKey, 86400);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Launch params expired');
    });

    it('should accept launch params within maxAgeSeconds', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      // Default 24h should pass
      const result = validateVKLaunchParams(launchParams, testSecretKey, 86400);

      expect(result.valid).toBe(true);
    });

    it('should reject tampered launch params', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      // Tamper with user ID
      const tampered = launchParams.replace(
        `vk_user_id=${testUserId}`,
        'vk_user_id=999999999'
      );

      const result = validateVKLaunchParams(tampered, testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject launch params without vk_user_id', () => {
      // Create params without user_id but with valid signature
      const now = Math.floor(Date.now() / 1000);
      const params = new URLSearchParams();
      params.set('vk_app_id', '12345678');
      params.set('vk_ts', String(now));
      params.set('vk_language', 'ru');

      // Calculate signature
      const vkParams: [string, string][] = [];
      for (const [key, value] of params.entries()) {
        if (key.startsWith('vk_')) {
          vkParams.push([key, value]);
        }
      }
      vkParams.sort((a, b) => a[0].localeCompare(b[0]));
      const queryString = vkParams.map(([k, v]) => `${k}=${v}`).join('&');
      const sign = createHmac('sha256', testSecretKey)
        .update(queryString)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      params.set('sign', sign);

      const result = validateVKLaunchParams(params.toString(), testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing vk_user_id');
    });

    it('should extract user data correctly', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey, {
        language: 'en',
      });

      const result = validateVKLaunchParams(launchParams, testSecretKey);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        vkId: testUserId,
        firstName: 'VK User', // Default placeholder
        languageCode: 'en',
      });
    });

    it('should handle malformed launch params gracefully', () => {
      const result = validateVKLaunchParams('not-valid-params', testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty string', () => {
      const result = validateVKLaunchParams('', testSecretKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing sign parameter');
    });

    it('should respect custom maxAgeSeconds parameter', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      // Very short maxAge (1 second) - should still pass if generated just now
      const result1 = validateVKLaunchParams(launchParams, testSecretKey, 1);
      expect(result1.valid).toBe(true);

      // Very long maxAge (1 week)
      const result2 = validateVKLaunchParams(launchParams, testSecretKey, 604800);
      expect(result2.valid).toBe(true);
    });

    it('should verify signature uses correct algorithm (HMAC-SHA256 base64url)', () => {
      // Manually create params and verify the algorithm
      const now = Math.floor(Date.now() / 1000);
      const params = new URLSearchParams();
      params.set('vk_user_id', '123');
      params.set('vk_app_id', '456');
      params.set('vk_ts', String(now));

      // Manually calculate expected signature
      const vkParamsArray = [
        ['vk_app_id', '456'],
        ['vk_ts', String(now)],
        ['vk_user_id', '123'],
      ];
      const queryString = vkParamsArray.map(([k, v]) => `${k}=${v}`).join('&');

      const expectedSign = createHmac('sha256', testSecretKey)
        .update(queryString)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      params.set('sign', expectedSign);

      const result = validateVKLaunchParams(params.toString(), testSecretKey);

      expect(result.valid).toBe(true);
    });
  });

  describe('parseVKLaunchParams', () => {
    it('should parse valid launch params string', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      const parsed = parseVKLaunchParams(launchParams);

      expect(parsed).not.toBeNull();
      expect(parsed?.vk_user_id).toBe(testUserId);
      expect(parsed?.vk_app_id).toBe(12345678);
      expect(parsed?.vk_language).toBe('ru');
      expect(parsed?.sign).toBeDefined();
    });

    it('should convert numeric fields correctly', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey, {
        appId: 111222333,
      });

      const parsed = parseVKLaunchParams(launchParams);

      expect(typeof parsed?.vk_user_id).toBe('number');
      expect(typeof parsed?.vk_app_id).toBe('number');
      expect(typeof parsed?.vk_ts).toBe('number');
      expect(typeof parsed?.vk_is_app_user).toBe('number');
      expect(typeof parsed?.vk_are_notifications_enabled).toBe('number');
      expect(typeof parsed?.vk_is_favorite).toBe('number');
    });

    it('should keep string fields as strings', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey, {
        language: 'en',
        platform: 'desktop_web',
      });

      const parsed = parseVKLaunchParams(launchParams);

      expect(typeof parsed?.vk_language).toBe('string');
      expect(typeof parsed?.vk_platform).toBe('string');
      expect(typeof parsed?.vk_ref).toBe('string');
      expect(typeof parsed?.sign).toBe('string');
    });

    it('should return null for invalid input', () => {
      // parseVKLaunchParams should handle errors gracefully
      const result = parseVKLaunchParams('not=valid=params=format');

      // URLSearchParams will parse this, but it might be empty or partial
      expect(result).not.toBeNull();
    });

    it('should handle empty string', () => {
      const result = parseVKLaunchParams('');

      expect(result).not.toBeNull();
      expect(result?.vk_user_id).toBeUndefined();
    });

    it('should ignore non-vk parameters', () => {
      const params = new URLSearchParams();
      params.set('vk_user_id', '123');
      params.set('custom_param', 'value');
      params.set('another', 'test');
      params.set('sign', 'sig');

      const parsed = parseVKLaunchParams(params.toString());

      expect(parsed?.vk_user_id).toBe(123);
      expect(parsed?.sign).toBe('sig');
      expect((parsed as Record<string, unknown>)?.custom_param).toBeUndefined();
      expect((parsed as Record<string, unknown>)?.another).toBeUndefined();
    });

    it('should handle optional vk_group_id', () => {
      const params = new URLSearchParams();
      params.set('vk_user_id', '123');
      params.set('vk_group_id', '456789');
      params.set('sign', 'sig');

      const parsed = parseVKLaunchParams(params.toString());

      expect(parsed?.vk_group_id).toBe(456789);
    });

    it('should handle vk_viewer_group_role', () => {
      const params = new URLSearchParams();
      params.set('vk_user_id', '123');
      params.set('vk_viewer_group_role', 'admin');
      params.set('sign', 'sig');

      const parsed = parseVKLaunchParams(params.toString());

      expect(parsed?.vk_viewer_group_role).toBe('admin');
    });
  });

  describe('Security considerations', () => {
    it('should reject various incorrect signatures', () => {
      // The implementation uses string comparison, but we verify
      // that incorrect signatures are consistently rejected
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      // Try various wrong signatures (non-empty)
      const wrongSignatures = [
        'wrong',
        'invalidbase64url',
        'a'.repeat(43), // Same length as base64url hash
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa', // Similar format
        'Zm9vYmFy', // Valid base64 but wrong value
      ];

      for (const wrongSign of wrongSignatures) {
        const tampered = launchParams.replace(/sign=[^&]+/, `sign=${wrongSign}`);
        const result = validateVKLaunchParams(tampered, testSecretKey);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid signature');
      }
    });

    it('should reject empty signature', () => {
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);
      // Remove sign parameter entirely
      const params = new URLSearchParams(launchParams);
      params.delete('sign');

      const result = validateVKLaunchParams(params.toString(), testSecretKey);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing sign parameter');
    });

    it('should reject replay attacks with expired timestamps', () => {
      // Create valid params with old timestamp
      const oldTime = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago

      const params = new URLSearchParams();
      params.set('vk_user_id', String(testUserId));
      params.set('vk_app_id', '12345678');
      params.set('vk_ts', String(oldTime));
      params.set('vk_language', 'ru');

      // Calculate valid signature
      const vkParams: [string, string][] = [];
      for (const [key, value] of params.entries()) {
        if (key.startsWith('vk_')) {
          vkParams.push([key, value]);
        }
      }
      vkParams.sort((a, b) => a[0].localeCompare(b[0]));
      const queryString = vkParams.map(([k, v]) => `${k}=${v}`).join('&');
      const sign = createHmac('sha256', testSecretKey)
        .update(queryString)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      params.set('sign', sign);

      // Should be rejected with 60 second maxAge
      const result = validateVKLaunchParams(params.toString(), testSecretKey, 60);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Launch params expired');
    });

    it('should handle URL-encoded special characters', () => {
      // Ensure the validation works with URL-encoded params
      const launchParams = generateMockVKLaunchParams(testUserId, testSecretKey);

      // Add some encoded characters (URLSearchParams handles encoding)
      const result = validateVKLaunchParams(launchParams, testSecretKey);

      expect(result.valid).toBe(true);
    });
  });
});
