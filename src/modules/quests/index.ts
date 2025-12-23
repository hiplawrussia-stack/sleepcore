/**
 * Quests Module
 * =============
 *
 * Gamification system with quests and badges for sleep health improvement.
 * Based on research: 40-60% higher DAU with streak+milestone combinations.
 *
 * @packageDocumentation
 * @module @sleepcore/modules/quests
 */

export {
  QuestService,
  questService,
  DEFAULT_QUESTS,
  type IQuest,
  type IActiveQuest,
  type IQuestProgress,
  type IProgressEntry,
  type IQuestReward,
  type IQuestCompletionResult,
  type QuestCategory,
  type QuestDifficulty,
  type QuestProgressType,
  type QuestStatus,
} from './QuestService';

export {
  BadgeService,
  badgeService,
  DEFAULT_BADGES,
  type IBadge,
  type IUserBadge,
  type IBadgeCriteria,
  type IBadgeReward,
  type IBadgeAwardResult,
  type BadgeCategory,
  type BadgeRarity,
} from './BadgeService';
