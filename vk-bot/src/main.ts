/**
 * VK Bot Entry Point
 * ==================
 * Main entry point for SleepCore VK Bot.
 *
 * Initializes:
 * - vk-io VK instance
 * - VK Bot Adapter
 * - Command registration
 * - Session management
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot
 */

import 'dotenv/config';
import { VKBotAdapter } from './adapters/VKBotAdapter';
import type { VKBotConfig } from './platform/types';

// Import SleepCore API and commands from main bot
// These will be resolved via workspace linking
import { sleepCore } from '../../src/SleepCoreAPI';
import { StartCommand } from '../../src/bot/commands/StartCommand';
import { HelpCommand } from '../../src/bot/commands/HelpCommand';
import { DiaryCommand } from '../../src/bot/commands/DiaryCommand';
import { TherapyCommand } from '../../src/bot/commands/TherapyCommand';
import { TodayCommand } from '../../src/bot/commands/TodayCommand';
import { BadgeCommand } from '../../src/bot/commands/BadgeCommand';
import { QuestCommand } from '../../src/bot/commands/QuestCommand';
import { EvolutionCommand } from '../../src/bot/commands/EvolutionCommand';
import { ProgressCommand } from '../../src/bot/commands/ProgressCommand';
import { RelaxCommand } from '../../src/bot/commands/RelaxCommand';
import { MindfulCommand } from '../../src/bot/commands/MindfulCommand';
import { TipsCommand } from '../../src/bot/commands/TipsCommand';
import { ProfileCommand } from '../../src/bot/commands/ProfileCommand';
import { SOSCommand } from '../../src/bot/commands/SOSCommand';

/**
 * VK Bot application
 */
class VKBotApp {
  private adapter: VKBotAdapter;

  constructor() {
    // Validate environment variables
    this.validateEnv();

    // Create config from environment
    const config: VKBotConfig = {
      token: process.env.VK_BOT_TOKEN!,
      groupId: parseInt(process.env.VK_GROUP_ID!, 10),
      apiVersion: process.env.VK_API_VERSION || '5.199',
      adminUserIds: this.parseAdminIds(process.env.ADMIN_VK_USER_IDS),
    };

    // Initialize adapter
    this.adapter = new VKBotAdapter(config, sleepCore);

    // Register all commands
    this.registerCommands();
  }

  /**
   * Validate required environment variables
   */
  private validateEnv(): void {
    const required = ['VK_BOT_TOKEN', 'VK_GROUP_ID'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Parse admin user IDs from comma-separated string
   */
  private parseAdminIds(idsString?: string): number[] {
    if (!idsString) return [];
    return idsString
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }

  /**
   * Register all bot commands
   */
  private registerCommands(): void {
    // Core commands
    this.adapter.register(new StartCommand());
    this.adapter.register(new HelpCommand());
    this.adapter.register(new DiaryCommand());
    this.adapter.register(new TherapyCommand());
    this.adapter.register(new TodayCommand());

    // Gamification commands
    this.adapter.register(new BadgeCommand());
    this.adapter.register(new QuestCommand());
    this.adapter.register(new EvolutionCommand());
    this.adapter.register(new ProgressCommand());

    // Therapy commands
    this.adapter.register(new RelaxCommand());
    this.adapter.register(new MindfulCommand());
    this.adapter.register(new TipsCommand());

    // User commands
    this.adapter.register(new ProfileCommand());

    // Safety commands
    this.adapter.register(new SOSCommand());

    console.log('[VK Bot] Registered commands:', this.adapter['commands'].size);
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    console.log('[VK Bot] Initializing SleepCore VK Bot...');
    console.log(`[VK Bot] Group ID: ${this.adapter.groupId}`);

    await this.adapter.start();

    // Handle graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`[VK Bot] Received ${signal}, shutting down...`);
      await this.adapter.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

// Start the bot
const app = new VKBotApp();
app.start().catch((error) => {
  console.error('[VK Bot] Fatal error:', error);
  process.exit(1);
});
