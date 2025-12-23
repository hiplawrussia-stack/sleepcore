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

// ==================== Reply Keyboard (Thumb-Zone UX) ====================
export {
  ReplyKeyboardService,
  replyKeyboard,
} from './ReplyKeyboardService';

export type {
  IReplyButton,
  IKeyboardLayout,
  IKeyboardContext,
} from './ReplyKeyboardService';

// ==================== Streak Counter (Forgiveness-First) ====================
export {
  StreakService,
  streakService,
} from './StreakService';

export type {
  IStreakData,
  IStreakMilestone,
  IStreakUpdateResult,
  IStreakConfig,
  IDailyActivity,
} from './StreakService';

// ==================== Progress Visualization ====================
export {
  ProgressVisualizationService,
  progressVisualization,
} from './ProgressVisualizationService';

export type {
  IProgressBarConfig,
  ITherapyProgress,
  IProgressSummary,
  ProgressBarStyle,
} from './ProgressVisualizationService';

// ==================== Emoji Slider (Wysa-Style Mood Tracking) ====================
export {
  EmojiSliderService,
  emojiSlider,
} from './EmojiSliderService';

export type {
  MoodLevel,
  SleepQualityLevel,
  IMoodScaleItem,
  ISleepScaleItem,
  IMoodFactor,
  IMoodEntry,
  ISleepEntry,
  IMoodHistory,
  IMoodAnalysis,
} from './EmojiSliderService';
