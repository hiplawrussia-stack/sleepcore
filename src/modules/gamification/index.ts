/**
 * Gamification Module
 * ===================
 *
 * Unified gamification system for SleepCore.
 *
 * Usage:
 * ```typescript
 * import { GamificationEngine, type IGamificationEngine } from './modules/gamification';
 *
 * const engine = new GamificationEngine(gamificationRepository);
 *
 * // Record user action
 * const result = await engine.recordAction(userId, 'diary_entry');
 *
 * // Get player profile
 * const profile = await engine.getPlayerProfile(userId);
 *
 * // Subscribe to events
 * engine.on('level:up', (data) => {
 *   console.log('User leveled up!', data);
 * });
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/modules/gamification
 */

export { GamificationEngine } from './GamificationEngine';

export type {
  IGamificationEngine,
  IGamificationResult,
  IPlayerProfile,
  IStreakInfo,
  IStreakUpdate,
  IActiveQuestInfo,
  GamificationAction,
  GamificationEventType,
  IXPEarnedEvent,
  ILevelUpEvent,
  IQuestEvent,
  IAchievementEvent,
  IStreakEvent,
  IEvolutionEvent,
} from './IGamificationEngine';
