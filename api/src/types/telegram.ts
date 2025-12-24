/**
 * Telegram Types
 * ==============
 * Types for Telegram Mini App authentication and user data.
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
}

export interface ValidatedUser {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium: boolean;
}

export interface JWTPayload {
  telegramId: number;
  firstName: string;
  username?: string;
  iat: number;
  exp: number;
  jti: string;
}
