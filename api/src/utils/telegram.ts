/**
 * Telegram Utilities
 * ==================
 * initData validation and parsing utilities.
 * Based on Telegram Bot API documentation.
 */

import { createHmac } from 'crypto';
import type { TelegramInitData, TelegramUser, ValidatedUser } from '../types/index.js';

/**
 * Validate Telegram Mini App initData
 * Uses HMAC-SHA256 with "WebAppData" as key
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400 // 24 hours default
): { valid: boolean; user?: ValidatedUser; error?: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return { valid: false, error: 'Missing hash parameter' };
    }

    // Remove hash from params for verification
    params.delete('hash');

    // Get auth_date and validate freshness
    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      return { valid: false, error: 'Missing auth_date parameter' };
    }

    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now - authDate > maxAgeSeconds) {
      return { valid: false, error: 'Init data expired' };
    }

    // Sort params alphabetically and create data-check-string
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key: HMAC-SHA256("WebAppData", botToken)
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash: HMAC-SHA256(secretKey, dataCheckString)
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false, error: 'Invalid hash' };
    }

    // Parse user data
    const userJson = params.get('user');
    if (!userJson) {
      return { valid: false, error: 'Missing user data' };
    }

    const telegramUser: TelegramUser = JSON.parse(userJson);

    const user: ValidatedUser = {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
      isPremium: telegramUser.is_premium ?? false,
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
 * Parse initData without validation (for testing)
 */
export function parseInitData(initData: string): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initData);

    const userJson = params.get('user');
    const user = userJson ? JSON.parse(userJson) : undefined;

    return {
      query_id: params.get('query_id') ?? undefined,
      user,
      auth_date: parseInt(params.get('auth_date') ?? '0', 10),
      hash: params.get('hash') ?? '',
      start_param: params.get('start_param') ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Generate mock initData for development/testing
 */
export function generateMockInitData(
  user: Partial<TelegramUser>,
  botToken: string
): string {
  const now = Math.floor(Date.now() / 1000);

  const telegramUser: TelegramUser = {
    id: user.id ?? 123456789,
    first_name: user.first_name ?? 'Test',
    last_name: user.last_name,
    username: user.username ?? 'testuser',
    language_code: user.language_code ?? 'ru',
    is_premium: user.is_premium ?? false,
  };

  const params = new URLSearchParams();
  params.set('user', JSON.stringify(telegramUser));
  params.set('auth_date', now.toString());
  params.set('query_id', 'test_query_id');

  // Sort and create data-check-string
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Create hash
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);

  return params.toString();
}
