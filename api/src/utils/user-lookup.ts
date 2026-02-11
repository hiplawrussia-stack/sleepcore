/**
 * User Lookup Utilities
 * =====================
 * Shared utilities for finding users by authentication payload.
 * Supports both Telegram and VK authentication providers.
 */

import { eq } from 'drizzle-orm';
import { getDatabase, users, type User } from '../db/index.js';
import type { JWTPayload } from '../types/index.js';

/**
 * Find user by authentication payload (supports both TG and VK)
 *
 * @param authUser - JWT payload with telegramId or vkId
 * @returns User record or undefined if not found
 */
export async function findUserByAuthPayload(
  authUser: JWTPayload
): Promise<User | undefined> {
  const db = getDatabase();

  // Try telegramId first (for TG users)
  if (authUser.telegramId) {
    return db.query.users.findFirst({
      where: eq(users.telegramId, authUser.telegramId),
    });
  }

  // Try vkId (for VK users)
  if (authUser.vkId) {
    return db.query.users.findFirst({
      where: eq(users.vkId, authUser.vkId),
    });
  }

  return undefined;
}

/**
 * Find user by authentication payload with custom database instance
 *
 * @param db - Database instance
 * @param authUser - JWT payload with telegramId or vkId
 * @returns User record or undefined if not found
 */
export async function findUserByAuthPayloadWithDb(
  db: ReturnType<typeof getDatabase>,
  authUser: JWTPayload
): Promise<User | undefined> {
  // Try telegramId first (for TG users)
  if (authUser.telegramId) {
    return db.query.users.findFirst({
      where: eq(users.telegramId, authUser.telegramId),
    });
  }

  // Try vkId (for VK users)
  if (authUser.vkId) {
    return db.query.users.findFirst({
      where: eq(users.vkId, authUser.vkId),
    });
  }

  return undefined;
}

/**
 * Get user ID from auth payload for rate limiting and logging
 *
 * @param authUser - JWT payload
 * @returns String identifier like "tg:123456" or "vk:789012"
 */
export function getAuthIdentifier(authUser: JWTPayload): string {
  if (authUser.telegramId) {
    return `tg:${authUser.telegramId}`;
  }
  if (authUser.vkId) {
    return `vk:${authUser.vkId}`;
  }
  return 'unknown';
}
