/**
 * Hooks Module
 * ============
 * Exports all React hooks.
 */

// Telegram
export { useTelegram } from './useTelegram';
export { useHaptics } from './useHaptics';

// Authentication
export { useAuth } from './useAuth';

// Data hooks (TanStack Query)
export { useUserProfile } from './useUserProfile';
export {
  useBreathing,
  useBreathingStats,
  useBreathingHistory,
  useLogSession,
} from './useBreathing';
export {
  useEvolution,
  useQuests,
  useBadges,
  useGamification,
} from './useEvolution';

// Sync
export { useSync } from './useSync';
