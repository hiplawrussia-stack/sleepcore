/**
 * SleepCore Telegram Bot - Main Entry Point
 * ==========================================
 * Production-ready Telegram bot for CBT-I digital therapeutic.
 *
 * Architecture based on 2025 research:
 * - Grammy Framework (grammy.dev) with session plugin
 * - Daily interactions correlate with 78% vs 52% engagement (JMIR 2025)
 * - Push notifications increase adherence (P<.001) (Frontiers 2025)
 * - CBT-I chatbots achieve 34-42% PHQ-9 reduction (PMC 2025)
 * - Woebot-style rule-based architecture with scripted therapeutic content
 *
 * Features:
 * - Session persistence (Memory/SQLite)
 * - Command handling with SleepCoreAPI integration
 * - Callback query processing
 * - Proactive check-in reminders (node-cron)
 * - Graceful shutdown
 * - Health monitoring
 *
 * @packageDocumentation
 * @module @sleepcore/app/main
 */

import { Bot, Context, session, SessionFlavor, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { hydrate, HydrateFlavor } from '@grammyjs/hydrate';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { SleepCoreAPI, sleepCore } from './SleepCoreAPI';
import {
  createCommandHandler,
  startCommand,
  diaryCommand,
  todayCommand,
  relaxCommand,
  mindfulCommand,
  progressCommand,
  sosCommand,
  helpCommand,
  rehearsalCommand,
  recallCommand,
  // Sprint 3: Gamification & Evolution Commands
  questCommand,
  badgeCommand,
  evolutionCommand,
  type ICommandResult,
  // Context-Aware Architecture
  initializeCommandRegistry,
  getCommandRegistry,
  createContextAwareMenuService,
} from './bot/commands';

// Sprint 3: Voice & Gamification Modules
import {
  createWhisperService,
  createVoiceDiaryHandler,
  questService,
  badgeService,
  sonyaEvolutionService,
  adaptiveKeyboardService,
  type IKeyboardCommand,
} from './modules';
import { createBotConfigFromEnv, type BotConfigOutput } from './bot/config/BotConfig';
import {
  createProactiveNotificationService,
  replyKeyboard,
  streakService,
  progressVisualization,
  emojiSlider,
  hubMenu,
  onboardingTracker,
  dailyGreeting,
  yearInPixels,
  type IStreakData,
  type IMoodHistory,
  type MoodLevel,
  type SleepQualityLevel,
} from './bot/services';
import { VERSION, BUILD_DATE } from './index';

// Database imports
import {
  initializeDatabase,
  createGrammySessionAdapter,
  type IDatabaseConnection,
  type GrammySessionAdapter,
} from './infrastructure/database';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Bot session data structure
 * Persisted per-user for therapy continuity
 */
interface SessionData {
  /** SleepCore user ID */
  userId: string;

  /** User's display name */
  userName?: string;

  /** Current conversation step (for multi-step flows) */
  currentStep?: string;

  /** User preferences */
  preferences: {
    language: 'ru' | 'en';
    notifications: boolean;
    notificationTime?: string;
    chronotype?: string;
  };

  /** Therapy state cache */
  therapyState?: {
    hasActiveSession: boolean;
    currentWeek: number;
    lastDiaryDate?: string;
    lastAssessmentDate?: string;
    hasCompletedOnboarding?: boolean;
  };

  /** ISI assessment data */
  isiData?: {
    answers: number[];
    currentQuestion: number;
    step: string;
  };

  /** Streak and progress data (forgiveness-first design) */
  streakData?: IStreakData;

  /** Mood history (Wysa-style emoji slider) */
  moodHistory?: IMoodHistory;

  /** Pending mood/sleep check for two-step flow */
  pendingMoodCheck?: {
    type: 'mood' | 'sleep';
    level: MoodLevel | SleepQualityLevel;
    context: 'morning' | 'evening' | 'check-in' | 'manual';
    selectedFactors: string[];
  };

  /** Onboarding progress tracking (funnel analytics) */
  onboardingProgress?: {
    startedAt: Date;
    completedSteps: string[];
    isCompleted: boolean;
  };

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** First activity today (for daily greeting) */
  lastGreetingDate?: string;
}

/**
 * Grammy context with session and hydrate flavors
 */
type MyContext = Context & SessionFlavor<SessionData> & HydrateFlavor<Context>;

/**
 * Extended context with SleepCore API
 */
interface SleepCoreContext extends MyContext {
  readonly userId: string;
  readonly chatId: number;
  readonly displayName: string;
  readonly languageCode: string;
  readonly sleepCore: SleepCoreAPI;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Load environment variables
dotenv.config();

/** Bot configuration from environment */
let botConfig: BotConfigOutput;

try {
  botConfig = createBotConfigFromEnv();
} catch (error) {
  console.error('❌ Configuration error:', error);
  process.exit(1);
}

// ============================================================================
// SESSION INITIALIZATION
// ============================================================================

/**
 * Create initial session data for new users
 */
function createInitialSession(): SessionData {
  return {
    userId: '',
    preferences: {
      language: 'ru',
      notifications: true,
      notificationTime: '21:00',
    },
    lastActivityAt: new Date(),
  };
}

// ============================================================================
// CONTEXT EXTENSION
// ============================================================================

/**
 * Extend Grammy context with SleepCore properties
 * Creates a context compatible with command interfaces
 */
function extendContext(ctx: MyContext, api: SleepCoreAPI): SleepCoreContext {
  const extended = ctx as SleepCoreContext;

  // Define SleepCore properties
  Object.defineProperty(extended, 'userId', {
    get: () => ctx.from?.id.toString() || '',
    enumerable: true,
  });
  Object.defineProperty(extended, 'chatId', {
    get: () => ctx.chat?.id || 0,
    enumerable: true,
  });
  Object.defineProperty(extended, 'displayName', {
    get: () => ctx.from?.first_name || 'User',
    enumerable: true,
  });
  Object.defineProperty(extended, 'languageCode', {
    get: () => ctx.from?.language_code || 'ru',
    enumerable: true,
  });
  Object.defineProperty(extended, 'sleepCore', {
    get: () => api,
    enumerable: true,
  });

  return extended;
}

// ============================================================================
// BOT SETUP
// ============================================================================

/** Bot creation options */
interface CreateBotOptions {
  /** Optional SQLite session storage adapter */
  sessionStorage?: GrammySessionAdapter<SessionData>;
}

/** Create and configure bot instance */
function createBot(config: BotConfigOutput, options?: CreateBotOptions): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.token);

  // 1. Configure auto-retry for rate limits (429 errors)
  bot.api.config.use(autoRetry({
    maxRetryAttempts: config.errorHandler?.maxRetries || 3,
    maxDelaySeconds: 60,
  }));

  // 2. Use hydration for message editing shortcuts
  bot.use(hydrate());

  // 3. Configure session middleware with optional SQLite storage
  bot.use(session({
    initial: createInitialSession,
    getSessionKey: (ctx) => ctx.from?.id.toString(),
    // Use SQLite storage if provided, otherwise fall back to memory
    storage: options?.sessionStorage,
  }));

  return bot;
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Build Grammy InlineKeyboard from ICommandResult keyboard
 */
function buildKeyboard(buttons: { text: string; callbackData?: string; url?: string }[][]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const row of buttons) {
    for (const btn of row) {
      if (btn.url) {
        kb.url(btn.text, btn.url);
      } else {
        kb.text(btn.text, btn.callbackData || 'noop');
      }
    }
    kb.row();
  }
  return kb;
}

/**
 * Send command result to user
 * Uses legacy Markdown parse_mode for *bold* and _italic_ formatting
 */
async function sendResult(ctx: MyContext, result: ICommandResult): Promise<void> {
  if (!result.success && result.error) {
    await ctx.reply(`❌ ${result.error}`);
    return;
  }

  const text = result.message || '';
  const keyboard = result.keyboard ? buildKeyboard(result.keyboard) : undefined;

  try {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('[SendResult] Markdown error:', error);
    // Fallback: send without formatting
    try {
      await ctx.reply(text, { reply_markup: keyboard });
    } catch (fallbackError) {
      console.error('[SendResult] Fallback error:', fallbackError);
    }
  }
}

/**
 * Get context-aware reply keyboard for user
 * Research: Reply keyboard in thumb-zone improves engagement (Steven Hoober 75% study)
 */
function getReplyKeyboard(ctx: MyContext): ReturnType<typeof replyKeyboard.generate> {
  return replyKeyboard.generate({
    timeOfDay: replyKeyboard.getTimeOfDay(),
    isVulnerable: false, // TODO: integrate with JITAI vulnerable state detection
    hasCompletedOnboarding: ctx.session.therapyState?.hasCompletedOnboarding ?? false,
  });
}

/**
 * Send result with context-aware reply keyboard
 *
 * Strategy: Reply keyboard is persistent, so we set it once per session.
 * If message has inline buttons, we send inline keyboard (reply keyboard persists).
 * If no inline buttons, we send with reply keyboard to refresh it.
 */
async function sendResultWithKeyboard(ctx: MyContext, result: ICommandResult): Promise<void> {
  if (!result.success && result.error) {
    await ctx.reply(`❌ ${result.error}`, {
      reply_markup: getReplyKeyboard(ctx),
    });
    return;
  }

  const text = result.message || '';
  const inlineKb = result.keyboard ? buildKeyboard(result.keyboard) : undefined;
  const replyKb = getReplyKeyboard(ctx);

  try {
    if (inlineKb) {
      // Has inline keyboard - send message with inline buttons
      // Reply keyboard persists from before, but if this is first message, set it first
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: inlineKb,
      });
    } else {
      // No inline keyboard - send with reply keyboard
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: replyKb,
      });
    }
  } catch (error) {
    console.error('[SendResult] Markdown error:', error);
    try {
      await ctx.reply(text, { reply_markup: replyKb });
    } catch (fallbackError) {
      console.error('[SendResult] Fallback error:', fallbackError);
    }
  }
}

/**
 * Initialize reply keyboard for user session
 * Called once at the start to ensure persistent keyboard is set
 */
async function initReplyKeyboard(ctx: MyContext): Promise<void> {
  const replyKb = getReplyKeyboard(ctx);
  const timeOfDay = replyKeyboard.getTimeOfDay();
  const greeting = timeOfDay === 'morning' ? '🌅' :
                   timeOfDay === 'day' ? '☀️' :
                   timeOfDay === 'evening' ? '🌆' : '🌙';

  await ctx.reply(`${greeting} Быстрые действия доступны внизу`, {
    reply_markup: replyKb,
  });
}

/**
 * Setup command handlers
 */
function setupCommands(bot: Bot<MyContext>, api: SleepCoreAPI): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const commandHandler = createCommandHandler(api);

  // /start command - Welcome + ISI assessment
  bot.command('start', async (ctx) => {
    console.log('[Command] /start received from', ctx.from?.id);
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.userId = sleepCoreCtx.userId;
    ctx.session.lastActivityAt = new Date();
    ctx.session.userName = ctx.from?.first_name;

    // Initialize streak data if not present
    if (!ctx.session.streakData) {
      ctx.session.streakData = streakService.createInitialData();
    }

    // Record activity and update streak
    const streakResult = streakService.recordActivity(ctx.session.streakData, 'interaction');

    // === Onboarding Tracking (Funnel Analytics) ===
    // Track: welcome_viewed step
    onboardingTracker.startOnboarding(sleepCoreCtx.userId);
    onboardingTracker.completeStep(sleepCoreCtx.userId, 'welcome_viewed');

    // Initialize session onboarding progress
    if (!ctx.session.onboardingProgress) {
      ctx.session.onboardingProgress = {
        startedAt: new Date(),
        completedSteps: ['welcome_viewed'],
        isCompleted: false,
      };
    }

    // Start SleepCore session
    api.startSession(sleepCoreCtx.userId);

    // Initialize reply keyboard first (persistent bottom navigation)
    await initReplyKeyboard(ctx);

    // Execute command
    const result = await startCommand.execute(sleepCoreCtx as any);
    await sendResultWithKeyboard(ctx, result);

    // Show streak milestone if achieved
    if (streakResult.newMilestone) {
      const celebration = progressVisualization.createMilestoneCelebration(streakResult.newMilestone);
      await ctx.reply(celebration, { parse_mode: 'Markdown' });
    }

    ctx.session.therapyState = { hasActiveSession: true, currentWeek: 0 };
  });

  // /diary command - Sleep diary entry
  bot.command(['diary', 'дневник'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Initialize streak data if not present
    if (!ctx.session.streakData) {
      ctx.session.streakData = streakService.createInitialData();
    }

    // Record diary activity (counts more than regular interaction)
    const streakResult = streakService.recordActivity(ctx.session.streakData, 'diary');

    // === Onboarding Tracking: first diary entry ===
    if (ctx.session.onboardingProgress && !ctx.session.onboardingProgress.completedSteps.includes('first_diary_entry')) {
      onboardingTracker.completeStep(sleepCoreCtx.userId, 'first_diary_entry');
      ctx.session.onboardingProgress.completedSteps.push('first_diary_entry');
    }

    const result = await diaryCommand.execute(sleepCoreCtx as any);
    await sendResultWithKeyboard(ctx, result);

    // Show streak update
    if (streakResult.newMilestone) {
      const celebration = progressVisualization.createMilestoneCelebration(streakResult.newMilestone);
      await ctx.reply(celebration, { parse_mode: 'Markdown' });
    } else if (streakResult.currentStreak > 0) {
      await ctx.reply(streakResult.message, { parse_mode: 'Markdown' });
    }
  });

  // /today command - Daily intervention
  bot.command(['today', 'сегодня'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await todayCommand.execute(sleepCoreCtx as any);
    await sendResultWithKeyboard(ctx, result);
  });

  // /relax command - Relaxation techniques
  bot.command(['relax', 'расслабление'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await relaxCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /mindful command - MBT-I/ACT-I practices
  bot.command(['mindful', 'осознанность'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await mindfulCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /progress command - Weekly progress report with streak visualization
  bot.command(['progress', 'прогресс'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Initialize streak data if not present
    if (!ctx.session.streakData) {
      ctx.session.streakData = streakService.createInitialData();
    }

    // Build therapy progress data
    const therapyProgress = ctx.session.therapyState ? {
      currentWeek: ctx.session.therapyState.currentWeek || 1,
      totalWeeks: 8, // CBT-I standard 8-week program
      completedModules: [],
    } : undefined;

    // Generate full progress summary
    const progressSummary = progressVisualization.createFullProgressSummary(
      ctx.session.streakData,
      therapyProgress,
      ctx.from?.first_name
    );

    await ctx.reply(progressSummary, {
      parse_mode: 'Markdown',
      reply_markup: getReplyKeyboard(ctx),
    });
  });

  // /sos command - Crisis intervention
  bot.command(['sos', 'помощь', 'emergency', 'crisis'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await sosCommand.execute(sleepCoreCtx as any);
    await sendResultWithKeyboard(ctx, result);
  });

  // /help command - Hub Model: shows all commands grouped by section
  bot.command(['help', 'справка'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    // Use hub menu help message with all commands listed
    const helpMessage = hubMenu.generateHelpMessage();
    const menuButton = new InlineKeyboard().text('📱 Открыть меню', 'hub:back');

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: menuButton,
    });
  });

  // /rehearsal command - Evening mental rehearsal (Smart Memory Window)
  bot.command(['rehearsal', 'репетиция', 'вечер', 'memory'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await rehearsalCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /recall command - Morning memory quiz (Testing Effect)
  bot.command(['recall', 'тест', 'утро', 'quiz', 'память'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await recallCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // ==================== Sprint 3: Gamification Commands ====================

  // /quest command - Quest management
  bot.command(['quest', 'quests', 'задания', 'квесты'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for evolution
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');

    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await questCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /badges command - Badge collection
  bot.command(['badges', 'badge', 'бейджи', 'достижения'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for evolution
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');

    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await badgeCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /sonya command - Sonya evolution
  bot.command(['sonya', 'evolution', 'соня', 'эволюция'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for evolution
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');

    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await evolutionCommand.execute(sleepCoreCtx as any, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /settings command - User preferences
  bot.command(['settings', 'настройки'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();
    await ctx.reply(
      '⚙️ *Настройки*\n\n' +
      `🔔 Уведомления: ${ctx.session.preferences.notifications ? 'Вкл' : 'Выкл'}\n` +
      `⏰ Время напоминания: ${ctx.session.preferences.notificationTime || 'Не задано'}\n` +
      `🌍 Язык: ${ctx.session.preferences.language === 'ru' ? 'Русский' : 'English'}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: ctx.session.preferences.notifications ? '🔕 Выкл' : '🔔 Вкл', callback_data: 'settings:toggle' }],
            [{ text: '⏰ Время', callback_data: 'settings:time' }],
          ],
        },
      }
    );
  });

  // /mood command - Wysa-style emoji mood check
  bot.command(['mood', 'настроение'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    // Initialize mood history if not present
    if (!ctx.session.moodHistory) {
      ctx.session.moodHistory = emojiSlider.createInitialHistory();
    }

    // Determine context based on time
    const hour = new Date().getHours();
    const moodContext: 'morning' | 'evening' | 'check-in' =
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 18 && hour < 23 ? 'evening' : 'check-in';

    const prompt = emojiSlider.getMoodCheckPrompt(moodContext);
    const keyboard = emojiSlider.createMoodKeyboard('mood');

    await ctx.reply(prompt, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // /sleep command - Wysa-style sleep quality check
  bot.command(['sleep', 'сон'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    // Initialize mood history if not present
    if (!ctx.session.moodHistory) {
      ctx.session.moodHistory = emojiSlider.createInitialHistory();
    }

    const prompt = emojiSlider.getSleepCheckPrompt();
    const keyboard = emojiSlider.createSleepKeyboard('sleep');

    await ctx.reply(prompt, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // /mood_week command - Week mood visualization
  bot.command(['mood_week', 'неделя'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    if (!ctx.session.moodHistory) {
      ctx.session.moodHistory = emojiSlider.createInitialHistory();
    }

    const weekViz = emojiSlider.getMoodWeekVisualization(ctx.session.moodHistory);
    const analysis = emojiSlider.analyzeMoodHistory(ctx.session.moodHistory, 7);

    let message = `📊 *Неделя настроения*\n\n`;
    message += `${weekViz}\n`;
    message += `Пн  Вт  Ср  Чт  Пт  Сб  Вс\n\n`;

    message += `📈 Среднее настроение: ${analysis.averageMood.toFixed(1)}/5\n`;
    message += `😴 Среднее качество сна: ${analysis.averageSleep.toFixed(1)}/5\n`;

    if (analysis.moodTrend !== 'unknown') {
      const trendEmoji = analysis.moodTrend === 'improving' ? '📈' :
                         analysis.moodTrend === 'declining' ? '📉' : '➡️';
      const trendText = analysis.moodTrend === 'improving' ? 'улучшается' :
                        analysis.moodTrend === 'declining' ? 'снижается' : 'стабильное';
      message += `${trendEmoji} Тренд: ${trendText}\n`;
    }

    if (analysis.insights.length > 0) {
      message += `\n───────────────\n\n`;
      message += analysis.insights.join('\n');
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: getReplyKeyboard(ctx),
    });
  });

  // /pixels command - Year in Pixels (Daylio-style visualization)
  bot.command(['pixels', 'пиксели', 'year'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    if (!ctx.session.moodHistory) {
      ctx.session.moodHistory = emojiSlider.createInitialHistory();
    }

    // Show current month view by default
    const { message, keyboard } = yearInPixels.generateCurrentMonthView(ctx.session.moodHistory);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });
}

// ============================================================================
// CALLBACK QUERY HANDLERS
// ============================================================================

/**
 * Setup callback query handlers
 */
function setupCallbacks(bot: Bot<MyContext>, api: SleepCoreAPI): void {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    ctx.session.lastActivityAt = new Date();

    const [command, action] = data.split(':');
    const sleepCoreCtx = extendContext(ctx, api);

    // Sprint 3: Record command click for adaptive keyboard
    if (['menu', 'quest', 'badge', 'sonya', 'diary', 'relax', 'mindful', 'progress'].includes(command)) {
      adaptiveKeyboardService.recordCommandClick(sleepCoreCtx.userId, command).catch(() => {});
    }

    try {
      let result: ICommandResult | null = null;

      switch (command) {
        // Context-Aware menu navigation
        case 'menu':
          switch (action) {
            case 'start':
              result = await startCommand.execute(sleepCoreCtx as any);
              break;
            case 'diary':
              result = await diaryCommand.execute(sleepCoreCtx as any);
              break;
            case 'today':
              result = await todayCommand.execute(sleepCoreCtx as any);
              break;
            case 'relax':
              result = await relaxCommand.execute(sleepCoreCtx as any);
              break;
            case 'mindful':
              result = await mindfulCommand.execute(sleepCoreCtx as any);
              break;
            case 'progress':
              result = await progressCommand.execute(sleepCoreCtx as any);
              break;
            case 'sos':
              result = await sosCommand.execute(sleepCoreCtx as any);
              break;
            case 'help':
              result = await helpCommand.execute(sleepCoreCtx as any);
              break;
            case 'rehearsal':
              result = await rehearsalCommand.execute(sleepCoreCtx as any);
              break;
            case 'recall':
              result = await recallCommand.execute(sleepCoreCtx as any);
              break;
            // Sprint 3: Gamification menu shortcuts
            case 'quest':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await questCommand.execute(sleepCoreCtx as any);
              break;
            case 'badges':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await badgeCommand.execute(sleepCoreCtx as any);
              break;
            case 'sonya':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await evolutionCommand.execute(sleepCoreCtx as any);
              break;
            default:
              await ctx.answerCallbackQuery({ text: 'OK' });
              return;
          }
          break;

        case 'start':
          if ('handleCallback' in startCommand) {
            // Get ISI data from session or initialize
            const isiData = ctx.session.isiData || { answers: [], currentQuestion: 0, step: 'welcome' };

            result = await (startCommand as any).handleCallback(sleepCoreCtx, data, {
              isiAnswers: isiData.answers,
              step: isiData.step,
            });

            // Update session with result metadata
            if (result?.metadata) {
              const meta = result.metadata as Record<string, unknown>;
              ctx.session.isiData = {
                answers: (meta.isiAnswers as number[]) || isiData.answers,
                currentQuestion: (meta.currentQuestion as number) || isiData.currentQuestion,
                step: (meta.step as string) || isiData.step,
              };

              // Check for onboarding completion
              if (result.metadata.onboardingCompleted) {
                ctx.session.therapyState = {
                  ...ctx.session.therapyState,
                  hasActiveSession: true,
                  currentWeek: 0,
                  hasCompletedOnboarding: true,
                };
              }
            }
          }
          break;

        case 'diary':
          if ('handleCallback' in diaryCommand) {
            result = await (diaryCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        case 'relax':
          result = await relaxCommand.execute(sleepCoreCtx as any, action);
          break;

        case 'mindful':
          result = await mindfulCommand.execute(sleepCoreCtx as any, action);
          break;

        case 'settings':
          if (action === 'toggle') {
            ctx.session.preferences.notifications = !ctx.session.preferences.notifications;
            await ctx.answerCallbackQuery({
              text: ctx.session.preferences.notifications ? '🔔 Вкл' : '🔕 Выкл',
            });
          }
          return;

        case 'today':
          await ctx.answerCallbackQuery({ text: action === 'done' ? '✅ Отлично!' : '👍' });
          return;

        // Mood selection (Wysa-style emoji slider)
        case 'mood': {
          const moodLevel = parseInt(action) as MoodLevel;
          if (moodLevel >= 1 && moodLevel <= 5) {
            // Initialize mood history if not present
            if (!ctx.session.moodHistory) {
              ctx.session.moodHistory = emojiSlider.createInitialHistory();
            }

            // Determine context
            const hour = new Date().getHours();
            const moodContext: 'morning' | 'evening' | 'check-in' =
              hour >= 5 && hour < 12 ? 'morning' :
              hour >= 18 && hour < 23 ? 'evening' : 'check-in';

            // Save pending mood check for factor selection
            ctx.session.pendingMoodCheck = {
              type: 'mood',
              level: moodLevel,
              context: moodContext,
              selectedFactors: [],
            };

            // Show factor selection
            const moodItem = emojiSlider.getMoodItem(moodLevel);
            const factorPrompt = `${moodItem.emoji} *${moodItem.label}*\n\n${emojiSlider.getFactorPrompt('mood')}`;
            const factorKeyboard = emojiSlider.createCompactFactorKeyboard('mood', [], 'mfactor');

            await ctx.editMessageText(factorPrompt, {
              parse_mode: 'Markdown',
              reply_markup: factorKeyboard,
            });
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // Sleep quality selection
        case 'sleep': {
          const sleepLevel = parseInt(action) as SleepQualityLevel;
          if (sleepLevel >= 1 && sleepLevel <= 5) {
            // Initialize mood history if not present
            if (!ctx.session.moodHistory) {
              ctx.session.moodHistory = emojiSlider.createInitialHistory();
            }

            // Save pending sleep check for factor selection
            ctx.session.pendingMoodCheck = {
              type: 'sleep',
              level: sleepLevel,
              context: 'morning',
              selectedFactors: [],
            };

            // Show factor selection
            const sleepItem = emojiSlider.getSleepItem(sleepLevel);
            const factorPrompt = `${sleepItem.emoji} *${sleepItem.label}*\n\n${emojiSlider.getFactorPrompt('sleep')}`;
            const factorKeyboard = emojiSlider.createCompactFactorKeyboard('sleep', [], 'sfactor');

            await ctx.editMessageText(factorPrompt, {
              parse_mode: 'Markdown',
              reply_markup: factorKeyboard,
            });
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // Mood factor selection (multi-select)
        case 'mfactor': {
          if (!ctx.session.pendingMoodCheck || ctx.session.pendingMoodCheck.type !== 'mood') {
            await ctx.answerCallbackQuery({ text: 'Сессия устарела' });
            return;
          }

          if (action === 'done') {
            // Save mood entry
            const pending = ctx.session.pendingMoodCheck;
            emojiSlider.recordMood(
              ctx.session.moodHistory!,
              pending.level as MoodLevel,
              pending.selectedFactors,
              pending.context
            );

            // Generate response
            const response = emojiSlider.formatMoodResponse(
              pending.level as MoodLevel,
              pending.selectedFactors
            );

            // Clear pending
            ctx.session.pendingMoodCheck = undefined;

            await ctx.editMessageText(response, { parse_mode: 'Markdown' });
            await ctx.answerCallbackQuery({ text: '✅ Записано!' });
          } else {
            // Toggle factor selection
            const factors = ctx.session.pendingMoodCheck.selectedFactors;
            const idx = factors.indexOf(action);
            if (idx >= 0) {
              factors.splice(idx, 1);
            } else {
              factors.push(action);
            }

            // Update keyboard
            const moodItem = emojiSlider.getMoodItem(ctx.session.pendingMoodCheck.level as MoodLevel);
            const factorPrompt = `${moodItem.emoji} *${moodItem.label}*\n\n${emojiSlider.getFactorPrompt('mood')}`;
            const factorKeyboard = emojiSlider.createCompactFactorKeyboard('mood', factors, 'mfactor');

            await ctx.editMessageText(factorPrompt, {
              parse_mode: 'Markdown',
              reply_markup: factorKeyboard,
            });
            await ctx.answerCallbackQuery();
          }
          return;
        }

        // Sleep factor selection (multi-select)
        case 'sfactor': {
          if (!ctx.session.pendingMoodCheck || ctx.session.pendingMoodCheck.type !== 'sleep') {
            await ctx.answerCallbackQuery({ text: 'Сессия устарела' });
            return;
          }

          if (action === 'done') {
            // Save sleep entry
            const pending = ctx.session.pendingMoodCheck;
            emojiSlider.recordSleep(
              ctx.session.moodHistory!,
              pending.level as SleepQualityLevel,
              pending.selectedFactors
            );

            // Generate response
            const response = emojiSlider.formatSleepResponse(
              pending.level as SleepQualityLevel,
              pending.selectedFactors
            );

            // Clear pending
            ctx.session.pendingMoodCheck = undefined;

            await ctx.editMessageText(response, { parse_mode: 'Markdown' });
            await ctx.answerCallbackQuery({ text: '✅ Записано!' });
          } else {
            // Toggle factor selection
            const factors = ctx.session.pendingMoodCheck.selectedFactors;
            const idx = factors.indexOf(action);
            if (idx >= 0) {
              factors.splice(idx, 1);
            } else {
              factors.push(action);
            }

            // Update keyboard
            const sleepItem = emojiSlider.getSleepItem(ctx.session.pendingMoodCheck.level as SleepQualityLevel);
            const factorPrompt = `${sleepItem.emoji} *${sleepItem.label}*\n\n${emojiSlider.getFactorPrompt('sleep')}`;
            const factorKeyboard = emojiSlider.createCompactFactorKeyboard('sleep', factors, 'sfactor');

            await ctx.editMessageText(factorPrompt, {
              parse_mode: 'Markdown',
              reply_markup: factorKeyboard,
            });
            await ctx.answerCallbackQuery();
          }
          return;
        }

        // Hub Model navigation callbacks
        case 'hub': {
          switch (action) {
            case 'back': {
              // Return to main hub menu
              const message = hubMenu.generateCompactHubMessage(ctx.from?.first_name);
              const keyboard = hubMenu.buildHubKeyboard();
              await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard,
              });
              await ctx.answerCallbackQuery();
              return;
            }

            case 'mood': {
              // Show mood check from hub
              const moodPrompt = emojiSlider.getMoodCheckPrompt('check-in');
              const moodKeyboard = emojiSlider.createMoodKeyboard('mood');
              await ctx.editMessageText(moodPrompt, {
                parse_mode: 'Markdown',
                reply_markup: moodKeyboard,
              });
              await ctx.answerCallbackQuery();
              return;
            }

            case 'sleep': {
              // Show sleep check from hub
              const sleepPrompt = emojiSlider.getSleepCheckPrompt();
              const sleepKeyboard = emojiSlider.createSleepKeyboard('sleep');
              await ctx.editMessageText(sleepPrompt, {
                parse_mode: 'Markdown',
                reply_markup: sleepKeyboard,
              });
              await ctx.answerCallbackQuery();
              return;
            }

            case 'mood_week': {
              // Show mood week from hub
              if (!ctx.session.moodHistory) {
                ctx.session.moodHistory = emojiSlider.createInitialHistory();
              }
              const weekViz = emojiSlider.getMoodWeekVisualization(ctx.session.moodHistory);
              const analysis = emojiSlider.analyzeMoodHistory(ctx.session.moodHistory, 7);

              let weekMessage = `📊 *Неделя настроения*\n\n`;
              weekMessage += `${weekViz}\n`;
              weekMessage += `Пн  Вт  Ср  Чт  Пт  Сб  Вс\n\n`;
              weekMessage += `📈 Среднее: ${analysis.averageMood.toFixed(1)}/5\n`;

              if (analysis.insights.length > 0) {
                weekMessage += `\n${analysis.insights[0]}`;
              }

              const backKeyboard = new InlineKeyboard().text('◀️ Назад в меню', 'hub:back');
              await ctx.editMessageText(weekMessage, {
                parse_mode: 'Markdown',
                reply_markup: backKeyboard,
              });
              await ctx.answerCallbackQuery();
              return;
            }

            case 'settings': {
              // Show settings from hub
              const settingsMessage =
                '⚙️ *Настройки*\n\n' +
                `🔔 Уведомления: ${ctx.session.preferences.notifications ? 'Вкл' : 'Выкл'}\n` +
                `⏰ Время: ${ctx.session.preferences.notificationTime || '21:00'}\n` +
                `🌍 Язык: Русский`;

              const settingsKeyboard = new InlineKeyboard()
                .text(ctx.session.preferences.notifications ? '🔕 Выкл уведомления' : '🔔 Вкл уведомления', 'settings:toggle')
                .row()
                .text('◀️ Назад в меню', 'hub:back');

              await ctx.editMessageText(settingsMessage, {
                parse_mode: 'Markdown',
                reply_markup: settingsKeyboard,
              });
              await ctx.answerCallbackQuery();
              return;
            }

            default: {
              // Check if it's a section expand
              if (action.startsWith('section:')) {
                const sectionId = action.replace('section:', '');
                const sectionMessage = hubMenu.generateSectionMessage(sectionId);
                const sectionKeyboard = hubMenu.buildSectionExpandedKeyboard(sectionId);

                await ctx.editMessageText(sectionMessage, {
                  parse_mode: 'Markdown',
                  reply_markup: sectionKeyboard,
                });
                await ctx.answerCallbackQuery();
                return;
              }
            }
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // Daily greeting mood check callbacks (mood-integrated notifications)
        case 'greeting': {
          if (action.startsWith('mood:')) {
            const moodLevel = parseInt(action.replace('mood:', ''), 10);

            // Initialize mood history if not present
            if (!ctx.session.moodHistory) {
              ctx.session.moodHistory = emojiSlider.createInitialHistory();
            }

            // Record quick mood from greeting (simplified - no factors)
            emojiSlider.recordMood(
              ctx.session.moodHistory!,
              moodLevel as MoodLevel,
              [] // No factors for quick greeting mood
            );

            // === Onboarding Tracking: first mood check ===
            if (ctx.session.onboardingProgress && !ctx.session.onboardingProgress.completedSteps.includes('first_mood_check')) {
              onboardingTracker.completeStep(sleepCoreCtx.userId, 'first_mood_check');
              ctx.session.onboardingProgress.completedSteps.push('first_mood_check');
            }

            // Generate contextual response based on mood
            const response = dailyGreeting.generateMoodResponse(moodLevel, ctx.from?.first_name);
            const suggestions = dailyGreeting.getMoodSuggestions(moodLevel);

            // Build follow-up keyboard based on mood
            const followupKeyboard = new InlineKeyboard();

            if (moodLevel <= 2) {
              // Low mood - offer support
              followupKeyboard
                .text('🧘 Расслабление', 'cmd:relax')
                .text('🆘 Помощь', 'cmd:sos')
                .row();
            } else {
              // Normal/good mood - offer activities
              followupKeyboard
                .text('📓 Дневник', 'cmd:diary')
                .text('🎯 Челленджи', 'cmd:challenges')
                .row();
            }
            followupKeyboard.text('📱 Меню', 'hub:back');

            await ctx.editMessageText(response, {
              parse_mode: 'Markdown',
              reply_markup: followupKeyboard,
            });
            await ctx.answerCallbackQuery({ text: 'Записано!' });
            return;
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // cmd: callback - execute commands from inline buttons
        case 'cmd': {
          switch (action) {
            case 'diary': {
              const diaryResult = await diaryCommand.execute(sleepCoreCtx as any);
              if (diaryResult.message) {
                const kb = diaryResult.keyboard ? buildKeyboard(diaryResult.keyboard) : undefined;
                await ctx.editMessageText(diaryResult.message, {
                  parse_mode: 'Markdown',
                  reply_markup: kb,
                });
              }
              await ctx.answerCallbackQuery();
              return;
            }
            case 'relax': {
              const relaxResult = await relaxCommand.execute(sleepCoreCtx as any);
              if (relaxResult.message) {
                const kb = relaxResult.keyboard ? buildKeyboard(relaxResult.keyboard) : undefined;
                await ctx.editMessageText(relaxResult.message, {
                  parse_mode: 'Markdown',
                  reply_markup: kb,
                });
              }
              await ctx.answerCallbackQuery();
              return;
            }
            case 'sos': {
              const sosResult = await sosCommand.execute(sleepCoreCtx as any);
              if (sosResult.message) {
                const kb = sosResult.keyboard ? buildKeyboard(sosResult.keyboard) : undefined;
                await ctx.editMessageText(sosResult.message, {
                  parse_mode: 'Markdown',
                  reply_markup: kb,
                });
              }
              await ctx.answerCallbackQuery();
              return;
            }
            case 'challenges': {
              // TODO: implement challenges command callback
              await ctx.answerCallbackQuery({ text: 'Челленджи скоро!' });
              return;
            }
          }
          await ctx.answerCallbackQuery();
          return;
        }

        // Year in Pixels navigation callbacks
        case 'pixels': {
          // Initialize mood history if not present
          if (!ctx.session.moodHistory) {
            ctx.session.moodHistory = emojiSlider.createInitialHistory();
          }

          // Parse action: month:YYYY:MM, year:YYYY, quarter:YYYY:Q, stats
          if (action === 'stats') {
            const statsMessage = yearInPixels.generateStatsSummary(ctx.session.moodHistory);
            const backKeyboard = new InlineKeyboard()
              .text('📅 Месяц', `pixels:month:${new Date().getFullYear()}:${new Date().getMonth()}`)
              .text('📊 Год', `pixels:year:${new Date().getFullYear()}`)
              .row()
              .text('📱 Меню', 'hub:back');

            await ctx.editMessageText(statsMessage, {
              parse_mode: 'Markdown',
              reply_markup: backKeyboard,
            });
            await ctx.answerCallbackQuery();
            return;
          }

          if (action.startsWith('month:')) {
            const [, yearStr, monthStr] = action.split(':');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);

            const { message, keyboard } = yearInPixels.generateMonthView(
              ctx.session.moodHistory,
              year,
              month
            );

            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
            await ctx.answerCallbackQuery();
            return;
          }

          if (action.startsWith('year:')) {
            const yearStr = action.replace('year:', '');
            const year = parseInt(yearStr, 10);

            const { message, keyboard } = yearInPixels.generateYearGrid(
              ctx.session.moodHistory,
              year
            );

            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
            await ctx.answerCallbackQuery();
            return;
          }

          if (action.startsWith('quarter:')) {
            const [, yearStr, quarterStr] = action.split(':');
            const year = parseInt(yearStr, 10);
            const quarter = parseInt(quarterStr, 10);

            const { message, keyboard } = yearInPixels.generateQuarterView(
              ctx.session.moodHistory,
              year,
              quarter
            );

            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
            await ctx.answerCallbackQuery();
            return;
          }

          await ctx.answerCallbackQuery();
          return;
        }

        case 'rehearsal':
          if ('handleCallback' in rehearsalCommand) {
            result = await (rehearsalCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        case 'recall':
          if ('handleCallback' in recallCommand) {
            result = await (recallCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        // ==================== Sprint 3: Gamification Callbacks ====================

        case 'quest':
          // Quest system callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          if ('handleCallback' in questCommand) {
            result = await (questCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        case 'badge':
          // Badge system callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          if ('handleCallback' in badgeCommand) {
            result = await (badgeCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        case 'sonya':
          // Sonya evolution callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          if ('handleCallback' in evolutionCommand) {
            result = await (evolutionCommand as any).handleCallback(sleepCoreCtx, data, {});
          }
          break;

        case 'voice':
          // Voice diary callbacks
          if (action === 'stats') {
            // Show voice diary statistics
            const voiceStats = {
              totalEntries: 0, // TODO: Get from database
              totalMinutes: 0,
              avgDuration: 0,
              mostCommonEmotion: 'neutral',
            };

            const statsMessage =
              `🎤 *Статистика голосового дневника*\n\n` +
              `📝 Записей: ${voiceStats.totalEntries}\n` +
              `⏱ Всего минут: ${voiceStats.totalMinutes}\n` +
              `📊 Ср. длительность: ${voiceStats.avgDuration}с\n\n` +
              `_Голосовой дневник помогает выразить эмоции,\n` +
              `которые сложно описать словами._`;

            await ctx.editMessageText(statsMessage, {
              parse_mode: 'Markdown',
              reply_markup: new InlineKeyboard()
                .text('📓 Новая запись', 'diary:new')
                .text('◀️ Назад', 'hub:back'),
            });
            await ctx.answerCallbackQuery();
            return;
          }
          break;

        default:
          await ctx.answerCallbackQuery({ text: 'OK' });
          return;
      }

      if (result && result.message) {
        const keyboard = result.keyboard ? buildKeyboard(result.keyboard) : undefined;

        try {
          await ctx.editMessageText(result.message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        } catch (error) {
          if (!(error instanceof GrammyError && error.description.includes('not modified'))) {
            await ctx.reply(result.message, { parse_mode: 'Markdown', reply_markup: keyboard });
          }
        }
      }

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Callback error:', error);
      await ctx.answerCallbackQuery({ text: 'Ошибка. Попробуйте позже.' });
    }
  });
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Setup text message handlers
 */
function setupMessages(bot: Bot<MyContext>, api: SleepCoreAPI): void {
  // Initialize context-aware services
  const registry = getCommandRegistry();
  const menuService = createContextAwareMenuService(registry);

  // /menu command - Hub Model central navigation
  // Research: Hub-and-spoke pattern reduces cognitive load (IxDF, NN Group)
  bot.command(['menu', 'меню'], async (ctx) => {
    ctx.session.lastActivityAt = new Date();

    // Generate hub menu with sections
    const message = hubMenu.generateCompactHubMessage(ctx.from?.first_name);
    const keyboard = hubMenu.buildHubKeyboard();

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    ctx.session.lastActivityAt = new Date();

    // Time format for settings
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      ctx.session.preferences.notificationTime = text;
      await ctx.reply(`✅ Время установлено: ${text}`, {
        reply_markup: getReplyKeyboard(ctx),
      });
      return;
    }

    // Check if this is a reply keyboard button press
    const buttonCommand = replyKeyboard.parseButtonToCommand(text);
    if (buttonCommand) {
      console.log(`[ReplyKeyboard] Button pressed: ${text} -> /${buttonCommand}`);
      const sleepCoreCtx = extendContext(ctx, api);

      let result: ICommandResult | null = null;

      // Execute corresponding command
      switch (buttonCommand) {
        case 'diary':
          result = await diaryCommand.execute(sleepCoreCtx as any);
          break;
        case 'today':
          result = await todayCommand.execute(sleepCoreCtx as any);
          break;
        case 'relax':
          result = await relaxCommand.execute(sleepCoreCtx as any);
          break;
        case 'mindful':
          result = await mindfulCommand.execute(sleepCoreCtx as any);
          break;
        case 'progress':
          result = await progressCommand.execute(sleepCoreCtx as any);
          break;
        case 'sos':
          result = await sosCommand.execute(sleepCoreCtx as any);
          break;
        case 'help':
          result = await helpCommand.execute(sleepCoreCtx as any);
          break;
        case 'start':
          result = await startCommand.execute(sleepCoreCtx as any);
          break;
        case 'menu':
          // Show context-aware menu
          const menuContext = menuService.buildContext({
            therapyWeek: ctx.session.therapyState?.currentWeek,
            lastDiaryDate: ctx.session.therapyState?.lastDiaryDate,
            lastActivityAt: ctx.session.lastActivityAt,
            hasCompletedOnboarding: ctx.session.therapyState?.hasCompletedOnboarding,
          });
          const menuLayout = menuService.generateMainMenu(menuContext, ctx.from?.first_name);
          const menuMessage = menuService.formatMenuMessage(menuLayout);
          const menuKeyboard = menuService.buildMenuKeyboard(menuLayout);

          const inlineKb = new InlineKeyboard();
          for (const row of menuKeyboard) {
            for (const btn of row) {
              inlineKb.text(btn.text, btn.callbackData || 'noop');
            }
            inlineKb.row();
          }

          await ctx.reply(menuMessage, {
            parse_mode: 'Markdown',
            reply_markup: inlineKb,
          });
          return;
        default:
          break;
      }

      if (result) {
        await sendResultWithKeyboard(ctx, result);
        return;
      }
    }

    // Context-aware default response with dynamic menu
    const context = menuService.buildContext({
      therapyWeek: ctx.session.therapyState?.currentWeek,
      lastDiaryDate: ctx.session.therapyState?.lastDiaryDate,
      lastActivityAt: ctx.session.lastActivityAt,
      hasCompletedOnboarding: ctx.session.therapyState?.hasCompletedOnboarding,
    });

    const layout = menuService.generateMainMenu(context, ctx.from?.first_name);
    const message = menuService.formatMenuMessage(layout);
    const keyboard = menuService.buildMenuKeyboard(layout);

    const inlineKeyboard = new InlineKeyboard();
    for (const row of keyboard) {
      for (const btn of row) {
        inlineKeyboard.text(btn.text, btn.callbackData || 'noop');
      }
      inlineKeyboard.row();
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard,
    });
  });
}

// ============================================================================
// VOICE MESSAGE HANDLERS (Sprint 3)
// ============================================================================

/**
 * Setup voice message handlers
 * Research: Fabla App shows "speech carries information we don't always consciously recognize"
 */
function setupVoiceHandlers(bot: Bot<MyContext>, api: SleepCoreAPI): void {
  // Check if Whisper API is configured
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Voice] Whisper disabled: OPENAI_API_KEY not configured');

    // Fallback handler: inform user that voice is not available
    bot.on('message:voice', async (ctx) => {
      await ctx.reply(
        '🎤 Голосовой дневник временно недоступен.\n\n' +
        'Ты можешь записать свои мысли текстом используя /diary',
        { reply_markup: getReplyKeyboard(ctx) }
      );
    });
    return;
  }

  // Initialize voice services
  const whisperService = createWhisperService(openaiApiKey);
  const voiceDiaryHandler = createVoiceDiaryHandler(whisperService);

  console.log('[Voice] Whisper voice diary handler initialized');

  // Voice message handler
  bot.on('message:voice', async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for gamification
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'voice');
    badgeService.checkAndAward(sleepCoreCtx.userId, 'voice_diary');

    const voice = ctx.message.voice;
    console.log(`[Voice] Received from ${ctx.from?.id}, duration: ${voice.duration}s`);

    // Show typing indicator
    await ctx.replyWithChatAction('typing');

    try {
      // Get file URL from Telegram
      const file = await ctx.api.getFile(voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${botConfig.token}/${file.file_path}`;

      // Process voice message
      const result = await voiceDiaryHandler.processVoiceMessage(
        sleepCoreCtx.userId,
        {
          fileId: voice.file_id,
          fileUniqueId: voice.file_unique_id,
          duration: voice.duration,
          mimeType: voice.mime_type,
          fileSize: voice.file_size,
        },
        fileUrl
      );

      // Format and send response
      const responseMessage = voiceDiaryHandler.formatResponseMessage(result);

      // Build keyboard with follow-up actions
      const keyboard = new InlineKeyboard()
        .text('📓 Ещё запись', 'diary:new')
        .text('📊 Прогресс', 'menu:progress')
        .row()
        .text('🎤 Статистика голоса', 'voice:stats');

      await ctx.reply(responseMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      // Check for quest completion
      if (result.success) {
        await questService.checkQuestProgress(sleepCoreCtx.userId, 'voice_diary', 1);

        // Award XP for voice entry
        sonyaEvolutionService.addXP(sleepCoreCtx.userId, 15); // Voice = 15 XP
      }
    } catch (error) {
      console.error('[Voice] Processing error:', error);
      await ctx.reply(
        '😔 Не удалось обработать голосовое сообщение.\n' +
        'Попробуй ещё раз или запиши мысли текстом /diary',
        { reply_markup: getReplyKeyboard(ctx) }
      );
    }
  });

  // Voice note callback handler (for voice:stats, etc.)
  // Note: Main callback handler in setupCallbacks will route voice: prefix here
}

// NOTE: Proactive reminders are now handled by ProactiveNotificationService
// See src/bot/services/ProactiveNotificationService.ts

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Setup error handler
 */
function setupErrors(bot: Bot<MyContext>): void {
  bot.catch((err) => {
    const { ctx, error } = err;
    console.error(`[Error] Update ${ctx.update.update_id}:`, error);

    if (error instanceof GrammyError) {
      if (error.error_code === 403) {
        console.log(`User ${ctx.from?.id} blocked bot`);
      } else if (error.error_code === 429) {
        console.warn('Rate limit:', error.parameters?.retry_after);
      }
    } else if (error instanceof HttpError) {
      console.error('HTTP error:', error);
    }
  });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Start health check server
 */
function startHealth(port: number): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const http = require('http');

  http.createServer((req: { url: string }, res: { writeHead: (code: number, headers?: object) => void; end: (data?: string) => void }) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: VERSION,
        buildDate: BUILD_DATE,
        uptime: process.uptime(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(port, () => console.log(`[Health] Port ${port}`));
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🌙 SleepCore DTx - CBT-I Digital Therapeutic 🌙       ║
║                                                           ║
║     Version: ${VERSION.padEnd(43)}║
║     Build:   ${BUILD_DATE.padEnd(43)}║
║     Mode:    ${(process.env.NODE_ENV || 'development').padEnd(43)}║
╚═══════════════════════════════════════════════════════════╝
  `);

  // --- SQLite Database Initialization ---
  const dbPath = process.env.DATABASE_PATH || "./data/sleepcore.db";

  // Ensure data directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[DB] Created directory: ${dbDir}`);
  }

  let db: IDatabaseConnection | null = null;
  let sessionAdapter: GrammySessionAdapter<SessionData> | null = null;

  try {
    db = await initializeDatabase(dbPath);
    console.log(`[DB] SQLite initialized: ${dbPath}`);

    // Create Grammy session adapter with SQLite storage
    sessionAdapter = createGrammySessionAdapter<SessionData>(db, {
      ttlSeconds: 60 * 60 * 24 * 30, // 30 days session TTL for GDPR
      autoCleanup: true,
      cleanupIntervalSeconds: 3600, // Cleanup every hour
    });
    console.log("[DB] Grammy session adapter ready");
  } catch (error) {
    console.warn("[DB] SQLite init failed, falling back to memory sessions:", error);
    // Continue with in-memory sessions (sessionAdapter remains null)
  }

  // --- Create Bot ---
  const bot = createBot(botConfig, {
    sessionStorage: sessionAdapter || undefined,
  });
  const api = sleepCore;

  // --- Initialize Context-Aware Architecture ---
  initializeCommandRegistry();
  const registry = getCommandRegistry();
  const menuService = createContextAwareMenuService(registry);

  // --- Initialize Adaptive Keyboard with Sprint 3 Commands ---
  const sprint3Commands: IKeyboardCommand[] = [
    { name: 'quest', label: 'Квесты', icon: '🎯', callbackData: 'menu:quest', category: 'secondary' },
    { name: 'badges', label: 'Бейджи', icon: '🏆', callbackData: 'menu:badges', category: 'secondary' },
    { name: 'sonya', label: 'Соня', icon: '🦉', callbackData: 'menu:sonya', category: 'secondary' },
  ];

  for (const cmd of sprint3Commands) {
    adaptiveKeyboardService.addCommand(cmd);
  }
  console.log('[AdaptiveKeyboard] Sprint 3 commands registered');

  // --- Initialize Proactive Notification Service ---
  const notificationService = createProactiveNotificationService(bot as any, menuService);

  // Setup handlers
  setupCommands(bot, api);
  setupCallbacks(bot, api);
  setupMessages(bot, api);
  setupVoiceHandlers(bot, api); // Sprint 3: Voice diary
  setupErrors(bot);

  // Production: Start proactive notifications
  if (process.env.NODE_ENV === 'production') {
    notificationService.start();
    console.log('[Notifications] Proactive notification service started');
  }

  // Health check
  startHealth(parseInt(process.env.HEALTH_PORT || '3001', 10));

  // Register commands with BotFather (Hub Model: 5-6 core commands only)
  // Research: 3-5 commands optimal (Miller's Law, Material Design, NN Group)
  // All other commands accessible via /menu (Hub-and-Spoke pattern)
  try {
    const hubModelCommands = [
      { command: 'start', description: '🚀 Начать работу с ботом' },
      { command: 'menu', description: '📱 Все функции (главное меню)' },
      { command: 'diary', description: '📓 Дневник сна' },
      { command: 'mood', description: '💭 Проверка настроения' },
      { command: 'sos', description: '🆘 Экстренная помощь' },
      { command: 'help', description: '❓ Справка и все команды' },
    ];
    await bot.api.setMyCommands(hubModelCommands);
    console.log(`[Bot] Hub Model: ${hubModelCommands.length} core commands registered`);
  } catch (error) {
    console.warn('[Bot] Command registration failed:', error);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    // Stop proactive notifications
    notificationService.stop();
    console.log("[Notifications] Service stopped");

    // Stop session adapter cleanup timer
    if (sessionAdapter) {
      sessionAdapter.stop();
      console.log("[DB] Session adapter stopped");
    }

    // Close database connection
    if (db) {
      await db.close();
      console.log("[DB] Database closed");
    }

    console.log(`\n[Bot] ${signal} - shutting down...`);
    await bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start polling
  console.log('[Bot] Starting...');
  await bot.start({
    drop_pending_updates: botConfig.polling?.dropPendingUpdates || false,
    onStart: (info) => {
      console.log(`[Bot] @${info.username} ready`);
      console.log(`[Bot] Session storage: ${sessionAdapter ? "SQLite" : "Memory"}`);
    },
  });
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});

export { main, createBot, extendContext };
