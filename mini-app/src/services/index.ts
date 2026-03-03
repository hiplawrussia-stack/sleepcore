/**
 * Services Index
 * ==============
 * Central export for all SleepCore Mini App services.
 *
 * @module @sleepcore/mini-app/services
 */

// Core Telegram services
export { telegram } from './telegram';
export type { TelegramService, TelegramUser, ThemeParams } from './telegram';

// Haptic feedback
export { haptics } from './haptics';
export type { HapticsService, HapticStyle, NotificationType, BreathingPhaseConfig } from './haptics';

// Audio feedback for breathing
export { audio } from './audio';
export type { AudioService, AudioPreferences, ToneType } from './audio';

// Feature flags
export {
  getFeatureFlags,
  getFeatureFlagsSnapshot,
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeature,
  Feature,
} from './featureFlags';

// Storage services (Bot API 9.0+)
export { deviceStorage } from './deviceStorage';
export type {
  DeviceStorageService,
  StoredBreathingPattern,
  UserPreferences,
  OfflineQueueItem,
} from './deviceStorage';

export { secureStorage, SECURE_KEYS } from './secureStorage';
export type { SecureStorageService } from './secureStorage';

// Payments (Telegram Stars)
export { payments, PRODUCTS } from './payments';
export type {
  PaymentsService,
  Product,
  ProductId,
  InvoiceStatus,
  PaymentCallback,
} from './payments';

// Sentry (error tracking)
export { initSentry } from './sentry';
