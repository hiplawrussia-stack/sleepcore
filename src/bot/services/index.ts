/**
 * Bot Services Module
 * ===================
 * Exports for bot-related services.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ==================== Proactive Notifications ====================
export {
  ProactiveNotificationService,
  createProactiveNotificationService,
} from './ProactiveNotificationService';

export type {
  INotificationPreferences,
  IUserNotificationData,
  INotificationJob,
} from './ProactiveNotificationService';

// ==================== Sentiment Analysis (Emotion-Aware UI) ====================
export {
  SentimentAnalysisService,
  sentimentAnalysis,
} from './SentimentAnalysisService';

export type { ISentimentResult, IAnalysisContext } from './SentimentAnalysisService';
