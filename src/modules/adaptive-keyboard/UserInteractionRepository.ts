/**
 * UserInteractionRepository - Tracks User Interactions for Adaptive UI
 * =====================================================================
 *
 * Records user interactions with commands and buttons to enable
 * personalized keyboard adaptation based on usage patterns.
 *
 * Research basis:
 * - Context-Aware Recommender Systems (CARS): track behavior patterns
 * - Personalization increases retention 25-40% (Global Wellness Institute)
 * - Ignored commands should be deprioritized (Adaptive UI best practices)
 *
 * @packageDocumentation
 * @module @sleepcore/modules/adaptive-keyboard
 */

import type { TimeOfDay } from '../../bot/commands/registry';

/**
 * User interaction record
 */
export interface IUserInteraction {
  id?: number;
  userId: string;
  command: string;
  timestamp: Date;
  wasClicked: boolean;
  timeOfDay: TimeOfDay;
  dayOfWeek: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated interaction stats for a command
 */
export interface ICommandStats {
  command: string;
  totalShown: number;
  totalClicked: number;
  clickRate: number;
  lastShown: Date | null;
  lastClicked: Date | null;
  peakTimeOfDay: TimeOfDay | null;
}

/**
 * User context built from interaction history
 */
export interface IUserBehaviorContext {
  userId: string;
  lastCommands: string[];
  ignoredCommands: Map<string, number>;
  frequentCommands: string[];
  timeOfDay: TimeOfDay;
  dayOfWeek: number;
  totalInteractions: number;
  averageSessionCommands: number;
  daysActive: number;
}

/**
 * In-memory storage for user interactions
 * (Can be replaced with SQLite repository for persistence)
 */
export class UserInteractionRepository {
  private interactions: Map<string, IUserInteraction[]> = new Map();
  private readonly maxInteractionsPerUser = 500;
  private readonly maxAgeDays = 30;

  /**
   * Record a new interaction
   */
  async recordInteraction(
    userId: string,
    command: string,
    wasClicked: boolean,
    context: {
      timeOfDay: TimeOfDay;
      dayOfWeek: number;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<IUserInteraction> {
    const interaction: IUserInteraction = {
      id: Date.now(),
      userId,
      command,
      timestamp: new Date(),
      wasClicked,
      timeOfDay: context.timeOfDay,
      dayOfWeek: context.dayOfWeek,
      sessionId: context.sessionId,
      metadata: context.metadata,
    };

    const userInteractions = this.interactions.get(userId) || [];
    userInteractions.push(interaction);

    // Cleanup old interactions
    this.cleanupOldInteractions(userInteractions);

    // Limit max interactions per user
    if (userInteractions.length > this.maxInteractionsPerUser) {
      userInteractions.splice(0, userInteractions.length - this.maxInteractionsPerUser);
    }

    this.interactions.set(userId, userInteractions);

    return interaction;
  }

  /**
   * Record that a command was shown to user
   */
  async recordCommandShown(
    userId: string,
    command: string,
    context: {
      timeOfDay: TimeOfDay;
      dayOfWeek: number;
      sessionId?: string;
    }
  ): Promise<void> {
    await this.recordInteraction(userId, command, false, context);
  }

  /**
   * Record that a command was clicked by user
   */
  async recordCommandClicked(
    userId: string,
    command: string,
    context: {
      timeOfDay: TimeOfDay;
      dayOfWeek: number;
      sessionId?: string;
    }
  ): Promise<void> {
    // Mark the last "shown" interaction as clicked
    const userInteractions = this.interactions.get(userId) || [];

    // Find the most recent shown (not clicked) interaction for this command
    for (let i = userInteractions.length - 1; i >= 0; i--) {
      const interaction = userInteractions[i];
      if (interaction.command === command && !interaction.wasClicked) {
        interaction.wasClicked = true;
        return;
      }
    }

    // If no matching shown interaction, record a new clicked one
    await this.recordInteraction(userId, command, true, context);
  }

  /**
   * Get recent interactions for a user
   */
  async getRecentInteractions(userId: string, limit: number = 50): Promise<IUserInteraction[]> {
    const userInteractions = this.interactions.get(userId) || [];
    return userInteractions.slice(-limit).reverse();
  }

  /**
   * Get command statistics for a user
   */
  async getCommandStats(userId: string, command: string): Promise<ICommandStats> {
    const userInteractions = this.interactions.get(userId) || [];
    const commandInteractions = userInteractions.filter((i) => i.command === command);

    const totalShown = commandInteractions.length;
    const totalClicked = commandInteractions.filter((i) => i.wasClicked).length;
    const clickRate = totalShown > 0 ? totalClicked / totalShown : 0;

    // Find last shown/clicked
    const lastShownInteraction = commandInteractions[commandInteractions.length - 1];
    const lastClickedInteraction = [...commandInteractions]
      .reverse()
      .find((i) => i.wasClicked);

    // Find peak time of day
    const timeOfDayCounts: Record<TimeOfDay, number> = {
      morning: 0,
      day: 0,
      evening: 0,
      night: 0,
    };

    for (const interaction of commandInteractions.filter((i) => i.wasClicked)) {
      timeOfDayCounts[interaction.timeOfDay]++;
    }

    const peakTimeOfDay = (Object.entries(timeOfDayCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as TimeOfDay) || null;

    return {
      command,
      totalShown,
      totalClicked,
      clickRate,
      lastShown: lastShownInteraction?.timestamp || null,
      lastClicked: lastClickedInteraction?.timestamp || null,
      peakTimeOfDay: totalClicked > 0 ? peakTimeOfDay : null,
    };
  }

  /**
   * Get all command stats for a user
   */
  async getAllCommandStats(userId: string): Promise<ICommandStats[]> {
    const userInteractions = this.interactions.get(userId) || [];

    // Get unique commands
    const commands = [...new Set(userInteractions.map((i) => i.command))];

    const stats: ICommandStats[] = [];
    for (const command of commands) {
      stats.push(await this.getCommandStats(userId, command));
    }

    return stats.sort((a, b) => b.clickRate - a.clickRate);
  }

  /**
   * Calculate ignored commands (shown but rarely clicked)
   */
  async getIgnoredCommands(
    userId: string,
    minShown: number = 3,
    maxClickRate: number = 0.2
  ): Promise<Map<string, number>> {
    const stats = await this.getAllCommandStats(userId);
    const ignored = new Map<string, number>();

    for (const stat of stats) {
      if (stat.totalShown >= minShown && stat.clickRate <= maxClickRate) {
        ignored.set(stat.command, stat.totalShown - stat.totalClicked);
      }
    }

    return ignored;
  }

  /**
   * Get frequently used commands
   */
  async getFrequentCommands(
    userId: string,
    minClicks: number = 3,
    limit: number = 5
  ): Promise<string[]> {
    const stats = await this.getAllCommandStats(userId);

    return stats
      .filter((s) => s.totalClicked >= minClicks)
      .sort((a, b) => b.totalClicked - a.totalClicked)
      .slice(0, limit)
      .map((s) => s.command);
  }

  /**
   * Build user behavior context from interaction history
   */
  async buildBehaviorContext(
    userId: string,
    currentTimeOfDay: TimeOfDay,
    currentDayOfWeek: number
  ): Promise<IUserBehaviorContext> {
    const interactions = await this.getRecentInteractions(userId, 100);
    const ignoredCommands = await this.getIgnoredCommands(userId);
    const frequentCommands = await this.getFrequentCommands(userId);

    // Calculate average session commands
    const sessions = new Map<string, number>();
    for (const interaction of interactions) {
      if (interaction.sessionId) {
        const count = sessions.get(interaction.sessionId) || 0;
        sessions.set(interaction.sessionId, count + 1);
      }
    }

    const sessionCounts = [...sessions.values()];
    const averageSessionCommands =
      sessionCounts.length > 0
        ? sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length
        : 0;

    // Calculate days active
    const uniqueDays = new Set(
      interactions.map((i) => i.timestamp.toISOString().split('T')[0])
    );

    return {
      userId,
      lastCommands: interactions.slice(0, 5).map((i) => i.command),
      ignoredCommands,
      frequentCommands,
      timeOfDay: currentTimeOfDay,
      dayOfWeek: currentDayOfWeek,
      totalInteractions: interactions.length,
      averageSessionCommands,
      daysActive: uniqueDays.size,
    };
  }

  /**
   * Get current streak (consecutive days with interactions)
   */
  async getCurrentStreak(userId: string): Promise<number> {
    const interactions = this.interactions.get(userId) || [];
    if (interactions.length === 0) return 0;

    // Get unique days sorted descending
    const uniqueDays = [...new Set(
      interactions.map((i) => i.timestamp.toISOString().split('T')[0])
    )].sort().reverse();

    if (uniqueDays.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let currentDate = today;

    for (const day of uniqueDays) {
      if (day === currentDate) {
        streak++;
        // Move to previous day
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 1);
        currentDate = date.toISOString().split('T')[0];
      } else if (day < currentDate) {
        // Gap in days, streak broken
        break;
      }
    }

    return streak;
  }

  /**
   * Get latest ISI score (if stored in metadata)
   */
  async getLatestISIScore(userId: string): Promise<number | null> {
    const interactions = await this.getRecentInteractions(userId, 100);

    for (const interaction of interactions) {
      if (interaction.metadata?.isiScore !== undefined) {
        return interaction.metadata.isiScore as number;
      }
    }

    return null;
  }

  /**
   * Clean up old interactions (older than maxAgeDays)
   */
  private cleanupOldInteractions(interactions: IUserInteraction[]): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxAgeDays);

    // Remove in place
    let i = 0;
    while (i < interactions.length) {
      if (interactions[i].timestamp < cutoffDate) {
        interactions.splice(i, 1);
      } else {
        i++;
      }
    }
  }

  /**
   * Clear all interactions for a user (GDPR compliance)
   */
  async clearUserData(userId: string): Promise<void> {
    this.interactions.delete(userId);
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<IUserInteraction[]> {
    return this.interactions.get(userId) || [];
  }
}

// Singleton instance
export const userInteractionRepository = new UserInteractionRepository();
