/**
 * VK Utilities
 * ============
 * VK Mini Apps launch params validation and parsing.
 * Based on VK Mini Apps documentation.
 *
 * @see https://dev.vk.com/mini-apps/development/launch-params
 */

import { createHmac } from 'crypto';

/**
 * VK user data from launch params
 */
export interface VKUser {
  id: number;
  first_name: string;
  last_name?: string;
  photo_100?: string;
  photo_200?: string;
}

/**
 * Validated VK user
 */
export interface ValidatedVKUser {
  vkId: number;
  firstName: string;
  lastName?: string;
  languageCode: string;
}

/**
 * VK launch params structure
 */
export interface VKLaunchParams {
  vk_user_id: number;
  vk_app_id: number;
  vk_is_app_user: number;
  vk_are_notifications_enabled: number;
  vk_language: string;
  vk_ref: string;
  vk_access_token_settings: string;
  vk_group_id?: number;
  vk_viewer_group_role?: string;
  vk_platform: string;
  vk_is_favorite: number;
  vk_ts: number;
  sign: string;
}

/**
 * Validate VK Mini App launch params
 * Uses HMAC-SHA256 with VK app secret
 *
 * @param launchParams - URL query string from launch
 * @param secretKey - VK app secret key
 * @param maxAgeSeconds - Maximum age of launch params (default 24h)
 */
export function validateVKLaunchParams(
  launchParams: string,
  secretKey: string,
  maxAgeSeconds = 86400
): { valid: boolean; user?: ValidatedVKUser; error?: string } {
  try {
    const params = new URLSearchParams(launchParams);

    // Extract sign
    const sign = params.get('sign');
    if (!sign) {
      return { valid: false, error: 'Missing sign parameter' };
    }

    // Check vk_ts (timestamp) for freshness
    const vkTs = params.get('vk_ts');
    if (!vkTs) {
      return { valid: false, error: 'Missing vk_ts parameter' };
    }

    const timestamp = parseInt(vkTs, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now - timestamp > maxAgeSeconds) {
      return { valid: false, error: 'Launch params expired' };
    }

    // Collect all vk_* params for signature verification
    const vkParams: [string, string][] = [];
    for (const [key, value] of params.entries()) {
      if (key.startsWith('vk_')) {
        vkParams.push([key, value]);
      }
    }

    // Sort by key name
    vkParams.sort((a, b) => a[0].localeCompare(b[0]));

    // Create query string for signing
    const queryString = vkParams
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // Calculate signature: base64url(HMAC-SHA256(queryString, secretKey))
    const calculatedSign = createHmac('sha256', secretKey)
      .update(queryString)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (calculatedSign !== sign) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Extract user data
    const vkUserId = params.get('vk_user_id');
    if (!vkUserId) {
      return { valid: false, error: 'Missing vk_user_id' };
    }

    const user: ValidatedVKUser = {
      vkId: parseInt(vkUserId, 10),
      firstName: 'VK User', // Will be fetched from VK API if needed
      languageCode: params.get('vk_language') || 'ru',
    };

    return { valid: true, user };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Parse VK launch params without validation (for testing)
 */
export function parseVKLaunchParams(
  launchParams: string
): Partial<VKLaunchParams> | null {
  try {
    const params = new URLSearchParams(launchParams);
    const result: Partial<VKLaunchParams> = {};

    // Parse all vk_* params
    for (const [key, value] of params.entries()) {
      if (key.startsWith('vk_') || key === 'sign') {
        // Convert numeric fields
        if (
          ['vk_user_id', 'vk_app_id', 'vk_ts', 'vk_group_id'].includes(key)
        ) {
          (result as Record<string, unknown>)[key] = parseInt(value, 10);
        } else if (
          ['vk_is_app_user', 'vk_are_notifications_enabled', 'vk_is_favorite'].includes(
            key
          )
        ) {
          (result as Record<string, unknown>)[key] = parseInt(value, 10);
        } else {
          (result as Record<string, unknown>)[key] = value;
        }
      }
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Generate mock VK launch params for development/testing
 */
export function generateMockVKLaunchParams(
  userId: number,
  secretKey: string,
  options: {
    appId?: number;
    language?: string;
    platform?: string;
  } = {}
): string {
  const now = Math.floor(Date.now() / 1000);

  const params = new URLSearchParams();
  params.set('vk_user_id', String(userId));
  params.set('vk_app_id', String(options.appId || 12345678));
  params.set('vk_is_app_user', '1');
  params.set('vk_are_notifications_enabled', '0');
  params.set('vk_language', options.language || 'ru');
  params.set('vk_ref', 'other');
  params.set('vk_access_token_settings', '');
  params.set('vk_platform', options.platform || 'mobile_android');
  params.set('vk_is_favorite', '0');
  params.set('vk_ts', String(now));

  // Collect vk_* params for signing
  const vkParams: [string, string][] = [];
  for (const [key, value] of params.entries()) {
    if (key.startsWith('vk_')) {
      vkParams.push([key, value]);
    }
  }

  // Sort and create query string
  vkParams.sort((a, b) => a[0].localeCompare(b[0]));
  const queryString = vkParams
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Calculate signature
  const sign = createHmac('sha256', secretKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  params.set('sign', sign);

  return params.toString();
}
