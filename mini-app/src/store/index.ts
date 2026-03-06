/**
 * Store Module
 * ============
 * Exports all Zustand stores.
 *
 * NOTE: userStore was removed - use TanStack Query hooks instead:
 * - useUserProfile() for profile data
 * - useBreathingStats() for breathing stats
 * - useLogSession() for logging sessions
 */

export { useAuthStore } from './authStore';
export { useSyncStore } from './syncStore';
