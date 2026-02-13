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
import { createServer, type Server } from 'http';
import { VKBotAdapter } from './adapters/VKBotAdapter';
import type { VKBotConfig, ISleepCoreAPI, ICommand } from './platform/types';

// Import SleepCore API and commands from main bot
// These will be resolved via workspace linking
import { sleepCore } from '../../src/SleepCoreAPI';

// Type assertion helper for commands that use Grammy Context
// TODO: Phase 3 - Update commands to use platform-independent ISleepCoreContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asCommand = (cmd: any): ICommand => cmd as ICommand;

// Core commands
import { StartCommand } from '../../src/bot/commands/StartCommand';
import { HelpCommand } from '../../src/bot/commands/HelpCommand';
import { DiaryCommand } from '../../src/bot/commands/DiaryCommand';
import { TherapyCommand } from '../../src/bot/commands/TherapyCommand';
import { TodayCommand } from '../../src/bot/commands/TodayCommand';

// Gamification commands
import { BadgeCommand } from '../../src/bot/commands/BadgeCommand';
import { QuestCommand } from '../../src/bot/commands/QuestCommand';
import { EvolutionCommand } from '../../src/bot/commands/EvolutionCommand';
import { ProgressCommand } from '../../src/bot/commands/ProgressCommand';

// Therapy commands
import { RelaxCommand } from '../../src/bot/commands/RelaxCommand';
import { MindfulCommand } from '../../src/bot/commands/MindfulCommand';
import { SmartTipsCommand } from '../../src/bot/commands/SmartTipsCommand';
import { RecallCommand } from '../../src/bot/commands/RecallCommand';
import { RehearsalCommand } from '../../src/bot/commands/RehearsalCommand';

// User commands
import { ProfileCommand } from '../../src/bot/commands/ProfileCommand';
import { ChronotypeCommand } from '../../src/bot/commands/ChronotypeCommand';

// Safety commands (CRITICAL - never disable)
import { SosCommand } from '../../src/bot/commands/SosCommand';
import { SafetyCommand } from '../../src/bot/commands/SafetyCommand';
import { AEReportCommand } from '../../src/bot/commands/AEReportCommand';

// AI/ML commands
import { PredictCommand } from '../../src/bot/commands/PredictCommand';
import { TwinCommand } from '../../src/bot/commands/TwinCommand';
import { WhatIfCommand } from '../../src/bot/commands/WhatIfCommand';
import { InsightsCommand } from '../../src/bot/commands/InsightsCommand';
import { ExplainCommand } from '../../src/bot/commands/ExplainCommand';

// Admin commands
import { AdminCommand } from '../../src/bot/commands/AdminCommand';

/**
 * VK Bot application
 */
class VKBotApp {
  private adapter: VKBotAdapter;
  private healthServer: Server | null = null;
  private readonly healthPort = parseInt(process.env.HEALTH_PORT || '3002', 10);

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
    // Type assertion: SleepCoreAPI implements ISleepCoreAPI methods
    this.adapter = new VKBotAdapter(config, sleepCore as unknown as ISleepCoreAPI);

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
   *
   * Command count: 25 (matching Telegram bot)
   * CRITICAL: Safety commands (SOS, Safety, AEReport) must ALWAYS be registered
   */
  private registerCommands(): void {
    // ==================== Core Commands (5) ====================
    // TODO: Phase 3 - Update commands to use platform-independent ISleepCoreContext
    this.adapter.register(asCommand(new StartCommand()));
    this.adapter.register(asCommand(new HelpCommand()));
    this.adapter.register(asCommand(new DiaryCommand()));
    this.adapter.register(asCommand(new TherapyCommand()));
    this.adapter.register(asCommand(new TodayCommand()));

    // ==================== Gamification Commands (4) ====================
    this.adapter.register(asCommand(new BadgeCommand()));
    this.adapter.register(asCommand(new QuestCommand()));
    this.adapter.register(asCommand(new EvolutionCommand()));
    this.adapter.register(asCommand(new ProgressCommand()));

    // ==================== Therapy Commands (5) ====================
    this.adapter.register(asCommand(new RelaxCommand()));
    this.adapter.register(asCommand(new MindfulCommand()));
    this.adapter.register(asCommand(new SmartTipsCommand()));
    this.adapter.register(asCommand(new RecallCommand()));
    this.adapter.register(asCommand(new RehearsalCommand()));

    // ==================== User Commands (2) ====================
    this.adapter.register(asCommand(new ProfileCommand()));
    this.adapter.register(asCommand(new ChronotypeCommand()));

    // ==================== AI/ML Commands (5) ====================
    this.adapter.register(asCommand(new PredictCommand()));
    this.adapter.register(asCommand(new TwinCommand()));
    this.adapter.register(asCommand(new WhatIfCommand()));
    this.adapter.register(asCommand(new InsightsCommand()));
    this.adapter.register(asCommand(new ExplainCommand()));

    // ==================== Safety Commands (3) - CRITICAL ====================
    // These commands MUST always be registered - crisis detection depends on them
    this.adapter.register(asCommand(new SosCommand()));
    this.adapter.register(asCommand(new SafetyCommand()));
    this.adapter.register(asCommand(new AEReportCommand()));

    // ==================== Admin Commands (1) ====================
    this.adapter.register(asCommand(new AdminCommand()));

    console.log('[VK Bot] Registered commands:', this.adapter['commands'].size);

    // Verify critical commands are registered
    this.verifyCriticalCommands();
  }

  /**
   * Verify that safety-critical commands are registered
   * CRITICAL: This is a safety check - do not remove
   */
  private verifyCriticalCommands(): void {
    const criticalCommands = ['sos', 'safety', 'aereport'];
    const registered = this.adapter['commands'];

    for (const cmd of criticalCommands) {
      if (!registered.has(cmd)) {
        console.error(`[VK Bot] CRITICAL: Safety command '${cmd}' not registered!`);
        throw new Error(`Safety command '${cmd}' must be registered`);
      }
    }

    console.log('[VK Bot] Safety commands verified: sos, safety, aereport');
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    console.log('[VK Bot] Initializing SleepCore VK Bot...');
    console.log(`[VK Bot] Group ID: ${this.adapter.groupId}`);

    // Start health check server for Docker/Kubernetes
    this.startHealthServer();

    await this.adapter.start();

    // Handle graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Start HTTP health check server
   * Required for Docker HEALTHCHECK and orchestration platforms
   */
  private startHealthServer(): void {
    this.healthServer = createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'vk-bot',
          timestamp: new Date().toISOString(),
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.healthServer.listen(this.healthPort, () => {
      console.log(`[VK Bot] Health server listening on port ${this.healthPort}`);
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`[VK Bot] Received ${signal}, shutting down...`);

      // Close health server
      if (this.healthServer) {
        this.healthServer.close();
      }

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
