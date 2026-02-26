/**
 * Storage Cleanup Utilities
 * =========================
 * Centralized cleanup for all user data on logout.
 *
 * Security Requirements:
 * - OWASP: "Clean the localStorage after logout"
 * - HIPAA: PHI must be "rendered unreadable" when no longer needed
 * - CWE-922: Prevent insecure storage of sensitive information
 *
 * P1-3: Complete encrypted storage cleanup on logout.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 * @see https://cwe.mitre.org/data/definitions/922.html
 * @module @sleepcore/mini-app/utils
 */

import { clearAuthStorage, AUTH_STORAGE_KEY } from '@/store/authStore';
import { clearSyncStorage, SYNC_STORAGE_KEY } from '@/store/syncStore';

/** All known storage keys used by the application */
export const ALL_STORAGE_KEYS = [
  AUTH_STORAGE_KEY,
  SYNC_STORAGE_KEY,
  'sleepcore_refresh_token', // Legacy key from older versions
] as const;

/**
 * Result of storage cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  clearedKeys: string[];
  errors: string[];
}

/**
 * Clear all user-related storage on logout
 *
 * This function ensures complete cleanup of:
 * 1. Auth store (user PII)
 * 2. Sync store (pending session data)
 * 3. Legacy storage keys
 *
 * OWASP: localStorage must be explicitly cleared on logout
 * HIPAA: PHI must be rendered unreadable when session ends
 *
 * @returns CleanupResult with details of what was cleared
 */
export function clearAllUserStorage(): CleanupResult {
  const result: CleanupResult = {
    success: true,
    clearedKeys: [],
    errors: [],
  };

  // Clear auth store
  try {
    clearAuthStorage();
    result.clearedKeys.push(AUTH_STORAGE_KEY);
  } catch (error) {
    result.success = false;
    result.errors.push(`Auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Clear sync store
  try {
    clearSyncStorage();
    result.clearedKeys.push(SYNC_STORAGE_KEY);
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Clear legacy keys
  try {
    localStorage.removeItem('sleepcore_refresh_token');
    result.clearedKeys.push('sleepcore_refresh_token');
  } catch (error) {
    // Legacy key cleanup failure is not critical
    console.warn('[StorageCleanup] Failed to remove legacy key:', error);
  }

  // Log result
  if (result.success) {
    console.log('[StorageCleanup] All user storage cleared:', result.clearedKeys);
  } else {
    console.error('[StorageCleanup] Partial cleanup, errors:', result.errors);
  }

  return result;
}

/**
 * Verify that all user storage has been cleared
 *
 * Use this for testing and audit purposes to confirm
 * that logout cleanup was successful.
 *
 * @returns true if all known storage keys are empty
 */
export function verifyStorageCleared(): boolean {
  for (const key of ALL_STORAGE_KEYS) {
    if (localStorage.getItem(key) !== null) {
      console.warn(`[StorageCleanup] Key not cleared: ${key}`);
      return false;
    }
  }
  return true;
}

/**
 * Get list of user storage keys that currently have data
 *
 * Useful for debugging and verifying cleanup.
 *
 * @returns Array of storage keys that contain data
 */
export function getActiveStorageKeys(): string[] {
  return ALL_STORAGE_KEYS.filter((key) => localStorage.getItem(key) !== null);
}
