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
 * - Sentry error tracking (HIPAA-compliant)
 *
 * @packageDocumentation
 * @module @sleepcore/app/main
 */

// CRITICAL: Sentry instrumentation MUST be imported FIRST
// This enables auto-instrumentation for all subsequent imports
import './infrastructure/monitoring/instrument';

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
  // Phase 7: Structured CBT-I Sessions
  therapyCommand,
  // Phase 8: Advanced AI Commands (Integration Sprint Feb 2026)
  chronotypeCommand,
  profileCommand,
  adminCommand,
  aeReportCommand,
  whatIfCommand,
  predictCommand,
  insightsCommand,
  explainCommand,
  safetyCommand,
  twinCommand,
  smartTipsCommand,
  linkCommand,
  type ICommandResult,
  type ISleepCoreContext,
  type IConversationCommand,
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
  createRateLimitMiddleware,
  stopRateLimiter,
  createSecurityMiddleware,
  securityAuditLog,
  createAIDisclosureMiddleware,
} from './bot/middleware';
import {
  createProactiveNotificationService,
  createISISchedulingService,
  replyKeyboard,
  streakService,
  progressVisualization,
  emojiSlider,
  hubMenu,
  onboardingTracker,
  dailyGreeting,
  yearInPixels,
  // Phase 1.4 Safety: Crisis Detection & Escalation
  crisisDetectionService,
  crisisEscalationService,
  adaptivePersonaService,
  proactiveIntelligenceService,
  // Phase 9: Service persistence singletons
  sleepPredictionService,
  digitalTwinService,
  worryPostponementService,
  detachedMindfulnessService,
  attService,
  mcq30AssessmentService,
  voiceBiomarkerService,
  arousalAssessmentService,
  cognitiveProgressReportService,
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
  UserRepository,
  SleepDiaryRepository,
  AssessmentRepository,
  TherapySessionRepository,
  GamificationRepository,
  VoiceDiaryRepository,
  createAutomatedBackupScheduler,
  // ICH E6(R3) / 21 CFR Part 11 compliant audit logging
  AuditService,
  type IDatabaseConnection,
  type GrammySessionAdapter,
  type ISleepDiaryEntryEntity,
  type IAssessmentEntity,
  type ITherapySessionEntity,
  // Phase 9: Service persistence repositories
  SafetyPlanRepository,
  ISIScheduleRepository,
  DigitalTwinRepository,
  OnboardingRepository,
  ServiceStateRepository,
  NotificationUserRepository,
  MCTRepository,
  MCQ30Repository,
} from './infrastructure/database';

// Monitoring imports (Sentry)
import { sentryService } from './infrastructure/monitoring';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Bot session data structure
 * Persisted per-user for therapy continuity
 */
interface SessionData {
  /** SleepCore user ID (Telegram ID as string) */
  userId: string;

  /** Database user ID (primary key from users table) */
  dbUserId?: number;

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

  /** ISI assessment data (ePRO compliant with item-level timestamps) */
  isiData?: {
    answers: number[];
    /** Timestamps for each answer (ISO 8601 format) - ePRO audit trail */
    answeredAt: string[];
    currentQuestion: number;
    step: string;
    /** Assessment start time */
    startedAt?: string;
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

  /**
   * Last AI disclosure timestamp (NY Law / CA SB-243 compliance)
   * Disclosure required at start + every 3 hours
   */
  lastAiDisclosureAt?: Date;
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

  // 4. AI Disclosure middleware (NY Law / CA SB-243 compliance)
  // Mandatory notification every 3 hours that user is interacting with AI
  bot.use(createAIDisclosureMiddleware({
    skipCommands: ['/start'], // /start has integrated onboarding disclosure
    enableLogging: true,
  }));

  // 5. Rate limiting middleware (OWASP 2025 best practice)
  // Prevents command flooding and protects database from abuse
  bot.use(createRateLimitMiddleware());

  // 6. Security middleware (OWASP 2025)
  // - Session binding verification
  // - Input sanitization
  // - Security event logging
  bot.use(createSecurityMiddleware());

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
async function _sendResult(ctx: MyContext, result: ICommandResult): Promise<void> {
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
 * Options for setting up commands
 */
interface SetupCommandsOptions {
  userRepository?: UserRepository;
  auditService?: AuditService;
}

/**
 * Setup command handlers
 */
function setupCommands(bot: Bot<MyContext>, api: SleepCoreAPI, options: SetupCommandsOptions = {}): void {
  const _commandHandler = createCommandHandler(api);
  const { userRepository, auditService } = options;

  // /start command - Welcome + ISI assessment
  bot.command('start', async (ctx) => {
    console.log('[Command] /start received from', ctx.from?.id);
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.userId = sleepCoreCtx.userId;
    ctx.session.lastActivityAt = new Date();
    ctx.session.userName = ctx.from?.first_name;

    // === Database User Creation (Session Persistence) ===
    // Research: GDPR requires audit trail of user consent
    if (userRepository) {
      try {
        // Check if user already exists
        let dbUser = await userRepository.findByExternalId(sleepCoreCtx.userId);

        if (!dbUser) {
          // Create new user in database
          // Per GDPR/ФЗ-152/21 CFR Part 11: consent must be EXPLICIT after reading terms
          dbUser = await userRepository.insert({
            externalId: sleepCoreCtx.userId,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
            timezone: 'Europe/Moscow', // Default timezone, can be updated later
            locale: ctx.from?.language_code || 'ru',
            consentGiven: false, // Explicit consent required via consent dialog
            consentDate: undefined,
          });
          console.log(`[Database] Created user: ${dbUser.id} (external: ${sleepCoreCtx.userId}) - awaiting explicit consent`);
          // ICH E6(R3) Audit: Log user creation
          if (auditService && dbUser.id) {
            await auditService.logCreate('user', dbUser.id, { externalId: sleepCoreCtx.userId });
          }
        } else {
          // Update last activity
          await userRepository.updateLastActivity(dbUser.id!);
          console.log(`[Database] User exists: ${dbUser.id}, updated last activity`);
          // ICH E6(R3) Audit: Log user login/session start
          if (auditService && dbUser.id) {
            await auditService.logAuth('LOGIN', dbUser.id);
          }
        }

        // Store database user ID in session for linking
        ctx.session.dbUserId = dbUser.id;
      } catch (error) {
        console.error('[Database] User creation failed:', error);
        // Continue without database - graceful degradation
      }
    }

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
    const result = await startCommand.execute(sleepCoreCtx as ISleepCoreContext);
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

    const result = await diaryCommand.execute(sleepCoreCtx as ISleepCoreContext);
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
    const result = await todayCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /relax command - Relaxation techniques
  bot.command(['relax', 'расслабление'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await relaxCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /mindful command - MBT-I/ACT-I practices
  bot.command(['mindful', 'осознанность'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await mindfulCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /progress command - Weekly progress report with streak visualization
  bot.command(['progress', 'прогресс'], async (ctx) => {
    const _sleepCoreCtx = extendContext(ctx, api);
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
    const result = await sosCommand.execute(sleepCoreCtx as ISleepCoreContext);
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
    const result = await rehearsalCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /recall command - Morning memory quiz (Testing Effect)
  bot.command(['recall', 'тест', 'утро', 'quiz', 'память'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await recallCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
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
    const result = await questCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /badges command - Badge collection
  bot.command(['badges', 'badge', 'бейджи', 'достижения'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for evolution
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');

    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await badgeCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /sonya command - Sonya evolution
  bot.command(['sonya', 'evolution', 'соня', 'эволюция'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();

    // Record interaction for evolution
    sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');

    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await evolutionCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
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

  // ============================================================================
  // PHASE 8: ADVANCED AI COMMANDS (Integration Sprint Feb 2026)
  // Wiring previously orphan commands to complete command→engine integration
  // ============================================================================

  // /chronotype command - Circadian rhythm assessment (MEQ, MCTQ)
  bot.command(['chronotype', 'хронотип', 'mctq', 'meq'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await chronotypeCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /profile command - User profile and statistics
  bot.command(['profile', 'профиль', 'статистика'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await profileCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /admin command - Clinical pilot monitoring dashboard (admin only)
  bot.command(['admin', 'dashboard', 'monitor'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await adminCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /ae_report command - Adverse event reporting
  bot.command(['ae_report', 'ae', 'побочный', 'adverse'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await aeReportCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /whatif command - Counterfactual analysis (Digital Twin)
  bot.command(['whatif', 'чтоесли', 'scenario'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await whatIfCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /predict command - Sleep predictions
  bot.command(['predict', 'прогноз', 'prediction'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await predictCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /insights command - Causal insights and analysis
  bot.command(['insights', 'инсайты', 'анализ'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await insightsCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /explain command - Explainability for AI decisions
  bot.command(['explain', 'объясни', 'почему'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await explainCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /safety command - Safety status and crisis detection
  bot.command(['safety', 'безопасность', 'кризис'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await safetyCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /twin command - Digital Twin status
  bot.command(['twin', 'близнец', 'digitaltwin'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await twinCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /tips command - Smart personalized tips
  bot.command(['tips', 'советы', 'smarttips'], async (ctx) => {
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await smartTipsCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });

  // /therapy command - Direct access to CBT-I therapy sessions
  bot.command(['therapy', 'терапия', 'cbt', 'cbti'], async (ctx) => {
    console.log('[Command] /therapy received from', ctx.from?.id);
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const result = await therapyCommand.execute(sleepCoreCtx as ISleepCoreContext);
    await sendResultWithKeyboard(ctx, result);
  });

  // /link command - Wearable device linking (Galaxy Watch, Health Connect)
  bot.command(['link', 'connect', 'wearable', 'watch', 'часы'], async (ctx) => {
    console.log('[Command] /link received from', ctx.from?.id);
    const sleepCoreCtx = extendContext(ctx, api);
    ctx.session.lastActivityAt = new Date();
    const args = ctx.message?.text?.split(' ').slice(1).join(' ');
    const result = await linkCommand.execute(sleepCoreCtx as ISleepCoreContext, args);
    await sendResultWithKeyboard(ctx, result);
  });
}

// ============================================================================
// CALLBACK QUERY HANDLERS
// ============================================================================

/**
 * Options for setting up callbacks
 */
interface SetupCallbacksOptions {
  userRepository?: UserRepository;
  sleepDiaryRepository?: SleepDiaryRepository;
  assessmentRepository?: AssessmentRepository;
  therapySessionRepository?: TherapySessionRepository;
  gamificationRepository?: GamificationRepository;
  auditService?: AuditService;
}

/**
 * Setup callback query handlers
 */
function setupCallbacks(bot: Bot<MyContext>, api: SleepCoreAPI, options: SetupCallbacksOptions = {}): void {
  const { userRepository, sleepDiaryRepository, assessmentRepository, therapySessionRepository, gamificationRepository, auditService } = options;

  // Helper: Ensure gamification session is active (ethical engagement tracking)
  // Creates or continues a session for wellbeing monitoring
  async function ensureGamificationSession(dbUserId: number | undefined): Promise<void> {
    if (!gamificationRepository || !dbUserId) return;
    try {
      const currentSession = await gamificationRepository.getCurrentSession(dbUserId);
      if (!currentSession) {
        await gamificationRepository.startSession(dbUserId);
      }
    } catch (error) {
      console.error('[Gamification] Failed to ensure session:', error);
    }
  }

  // Helper: Persist XP gain to database (with level-up detection)
  // Reserved for future use when more XP events are added to callbacks
  // Uses XPSource types: 'daily_check_in' | 'emotion_log' | 'challenge_complete' | 'quest_complete' |
  // 'streak_bonus' | 'first_action' | 'helping_others' | 'crisis_overcome' | 'milestone_reached' |
  // 'ai_interaction' | 'sleep_diary' | 'assessment_complete'
  async function _persistXPGain(
    dbUserId: number | undefined,
    amount: number,
    source: 'daily_check_in' | 'sleep_diary' | 'quest_complete' | 'streak_bonus' | 'ai_interaction' | 'assessment_complete'
  ): Promise<{ leveledUp: boolean; newLevel?: number } | null> {
    if (!gamificationRepository || !dbUserId) return null;
    try {
      const result = await gamificationRepository.addXP(dbUserId, amount, source);
      if (result.leveledUp) {
        console.log(`[Gamification] User ${dbUserId} leveled up to ${result.newLevel}!`);
      }
      return { leveledUp: result.leveledUp, newLevel: result.newLevel };
    } catch (error) {
      console.error('[Gamification] Failed to persist XP:', error);
      return null;
    }
  }

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // =========================================================================
    // SECURITY: Callback Query Validation (OWASP 2025)
    // Validate callback data format and content before processing
    // =========================================================================
    if (!data || typeof data !== 'string' || data.length > 64) {
      await ctx.answerCallbackQuery({ text: 'Invalid action' });
      return;
    }

    // Whitelist of allowed command prefixes
    const ALLOWED_COMMANDS = [
      'menu', 'start', 'diary', 'quest', 'badge', 'sos', 'hub', 'isi',
      'therapy', 'relax', 'mindful', 'progress', 'evolution', 'onboard',
      'noop', 'streak', 'checkin', 'sleep_quality', 'mood', 'cogtest',
      'admin', 'insight', 'explain', 'predict', 'safety', 'twin',
      'chronotype', 'profile', 'ae_report', 'whatif', 'smart_tips',
      'mcq30', 'arousal', 'dm', 'worry', 'att', 'voice', 'link'
    ];

    const [command, action] = data.split(':');

    if (!command || !ALLOWED_COMMANDS.includes(command)) {
      console.warn(`[Security] Unknown callback command: ${command} from user ${ctx.from?.id}`);
      await ctx.answerCallbackQuery({ text: 'Unknown action' });
      return;
    }

    ctx.session.lastActivityAt = new Date();
    const sleepCoreCtx = extendContext(ctx, api);

    // =========================================================================
    // SAFETY: Crisis State Monitoring for Callbacks (Phase 1.4)
    // Even without text input, track users with active crisis state
    // Research: SAMHSA 2025 - maintain awareness without blocking
    // =========================================================================
    try {
      const userId = ctx.from?.id.toString() || '';
      const recentEvents = crisisDetectionService.getUserEvents(userId);

      // Check for HIGH/CRITICAL severity in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const activeCrisis = recentEvents.find(
        e => (e.severity === 'high' || e.severity === 'critical') && e.timestamp >= oneHourAgo
      );

      if (activeCrisis) {
        // Audit log: user with active crisis is navigating via callbacks
        console.log(`[CRISIS] User ${userId} with active crisis (severity=${activeCrisis.severity}) using callback: ${command}:${action}`);

        // Security audit log for crisis escalation (SAMHSA 2025)
        securityAuditLog.log({
          type: 'crisis_escalation',
          userId,
          chatId: ctx.chat?.id.toString() || '',
          details: `Crisis escalation: severity=${activeCrisis.severity}, trigger=callback_${command}:${action}`,
          severity: activeCrisis.severity === 'critical' ? 'critical' : 'warning',
          metadata: { crisisType: activeCrisis.crisisType, command, action },
        });

        // P0-1 FIX: Escalate to admins - crisis detection ALWAYS triggers escalation (IEC 62304 §7.1)
        // Research: SAMHSA 2025 - maintain awareness AND ensure professional oversight
        await crisisEscalationService.escalate(activeCrisis);

        // IMPORTANT: Don't block - per SAMHSA research, blocking increases distress
      }
    } catch (crisisError) {
      // Crisis monitoring should NEVER block callback processing
      console.error('[CRISIS] State monitoring error (non-fatal):', crisisError);
    }

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
              result = await startCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'diary':
              result = await diaryCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'today':
              result = await todayCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'relax':
              result = await relaxCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'mindful':
              result = await mindfulCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'progress':
              result = await progressCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'sos':
              result = await sosCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'help':
              result = await helpCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'rehearsal':
              result = await rehearsalCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'recall':
              result = await recallCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            // Sprint 3: Gamification menu shortcuts
            case 'quest':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await questCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'badges':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await badgeCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            case 'sonya':
              sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'command');
              result = await evolutionCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            // Phase 7: Structured CBT-I Sessions
            case 'therapy':
              result = await therapyCommand.execute(sleepCoreCtx as ISleepCoreContext);
              break;
            default:
              await ctx.answerCallbackQuery({ text: 'OK' });
              return;
          }
          break;

        case 'start':
          if ('handleCallback' in startCommand) {
            // Get ISI data from session or initialize (ePRO compliant with timestamps)
            const isiData = ctx.session.isiData || {
              answers: [],
              answeredAt: [],
              currentQuestion: 0,
              step: 'welcome',
              startedAt: undefined,
            };

            result = await (startCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {
              isiAnswers: isiData.answers,
              step: isiData.step,
            });

            // Update session with result metadata
            if (result?.metadata) {
              const meta = result.metadata as Record<string, unknown>;
              const newAnswers = (meta.isiAnswers as number[]) || isiData.answers;
              const newQuestion = (meta.currentQuestion as number) || isiData.currentQuestion;
              const newStep = (meta.step as string) || isiData.step;

              // Track timestamps for each answer (ePRO best practice)
              const answeredAt = [...isiData.answeredAt];
              if (newAnswers.length > isiData.answers.length) {
                // New answer was recorded - add timestamp
                answeredAt.push(new Date().toISOString());
              }

              // Track assessment start time
              const startedAt = isiData.startedAt ||
                (newStep.startsWith('isi_q') ? new Date().toISOString() : undefined);

              ctx.session.isiData = {
                answers: newAnswers,
                answeredAt,
                currentQuestion: newQuestion,
                step: newStep,
                startedAt,
              };

              // === Database Persistence for ISI Assessment ===
              // Save when ISI assessment is completed (step === 'isi_result')
              if (meta.step === 'isi_result' && assessmentRepository) {
                try {
                  const isiScore = meta.isiScore as number;
                  const severity = meta.severity as string;
                  const answers = newAnswers;

                  // Determine severity label for database
                  let severityLabel: string;
                  if (isiScore <= 7) severityLabel = 'none';
                  else if (isiScore <= 14) severityLabel = 'subthreshold';
                  else if (isiScore <= 21) severityLabel = 'moderate';
                  else severityLabel = 'severe';

                  // ePRO compliant response format with item-level timestamps
                  const itemResponses = answers.map((value, index) => ({
                    item: index + 1,
                    value,
                    answeredAt: ctx.session.isiData?.answeredAt[index] || null,
                  }));

                  const assessmentEntity: Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'> = {
                    userId: sleepCoreCtx.userId,
                    type: 'isi',
                    score: isiScore,
                    severity: severityLabel,
                    category: severity,
                    // ePRO format: item-level responses with timestamps
                    responsesJson: JSON.stringify({
                      items: itemResponses,
                      startedAt: ctx.session.isiData?.startedAt,
                      completedAt: new Date().toISOString(),
                      totalDurationMs: ctx.session.isiData?.startedAt
                        ? Date.now() - new Date(ctx.session.isiData.startedAt).getTime()
                        : null,
                    }),
                    interpretation: `ISI Score: ${isiScore}/28 - ${severityLabel}`,
                    assessedAt: new Date(),
                    deletedAt: null,
                  };

                  const savedAssessment = await assessmentRepository.insert(assessmentEntity);
                  console.log(`[Database] ISI assessment saved for user ${sleepCoreCtx.userId}, score: ${isiScore}`);
                  // ICH E6(R3) Audit: Log assessment completion
                  if (auditService && savedAssessment?.id) {
                    await auditService.logCreate('assessment', savedAssessment.id, {
                      type: 'isi',
                      score: isiScore,
                      severity: severityLabel,
                    }, { userId: ctx.session.dbUserId });
                  }

                  // Clear ISI session data after successful save
                  ctx.session.isiData = undefined;
                } catch (error) {
                  console.error('[Database] Failed to save ISI assessment:', error);
                }
              }

              // === Database Persistence for Explicit Consent ===
              // Per GDPR/ФЗ-152/21 CFR Part 11: record explicit consent with audit trail
              if (meta.consentGiven === true && meta.step === 'consent_accepted' && userRepository) {
                try {
                  if (ctx.session.dbUserId) {
                    await userRepository.recordConsent(ctx.session.dbUserId);
                    console.log(`[Consent] User ${ctx.session.dbUserId} explicit consent recorded at ${meta.consentTimestamp}`);
                    // ICH E6(R3) Audit: Log consent event
                    if (auditService) {
                      await auditService.logConsent(ctx.session.dbUserId, true, {
                        metadata: { timestamp: meta.consentTimestamp },
                      });
                    }
                  }
                } catch (error) {
                  console.error('[Consent] Failed to record consent:', error);
                }
              }

              // Check for onboarding completion
              if (result.metadata.onboardingCompleted) {
                ctx.session.therapyState = {
                  ...ctx.session.therapyState,
                  hasActiveSession: true,
                  currentWeek: 0,
                  hasCompletedOnboarding: true,
                };

                // === Create Initial Therapy Session ===
                if (therapySessionRepository) {
                  try {
                    const therapySession: Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'> = {
                      userId: sleepCoreCtx.userId,
                      sessionType: 'cbti',
                      week: 0,
                      component: 'onboarding',
                      status: 'completed',
                      adherence: 100,
                      homeworkCompleted: true,
                      notesJson: JSON.stringify({ isiCompleted: true }),
                      scheduledAt: new Date(),
                      completedAt: new Date(),
                      deletedAt: null,
                    };

                    const savedSession = await therapySessionRepository.insert(therapySession);
                    console.log(`[Database] Initial therapy session created for user ${sleepCoreCtx.userId}`);
                    // ICH E6(R3) Audit: Log therapy session creation
                    if (auditService && savedSession?.id) {
                      await auditService.logCreate('therapy_session', savedSession.id, {
                        sessionType: 'cbti',
                        week: 0,
                        component: 'onboarding',
                      }, { userId: ctx.session.dbUserId });
                    }
                  } catch (error) {
                    console.error('[Database] Failed to create therapy session:', error);
                  }
                }
              }
            }
          }
          break;

        case 'diary':
          if ('handleCallback' in diaryCommand) {
            result = await (diaryCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});

            // === Database Persistence for Sleep Diary ===
            // Save to database when diary entry is completed (marked as 'saved' in metadata)
            if (result?.metadata?.saved && sleepDiaryRepository) {
              try {
                const diaryData = result.metadata as {
                  date: string;
                  bedtimeHour: number;
                  bedtimeMinute: number;
                  waketimeHour: number;
                  waketimeMinute: number;
                  sleepQuality: number;
                };

                // Calculate metrics
                const bedtime = `${diaryData.bedtimeHour.toString().padStart(2, '0')}:${diaryData.bedtimeMinute.toString().padStart(2, '0')}`;
                const wakeTime = `${diaryData.waketimeHour.toString().padStart(2, '0')}:${diaryData.waketimeMinute.toString().padStart(2, '0')}`;

                // Calculate duration (handling midnight crossing)
                let hours = diaryData.waketimeHour - diaryData.bedtimeHour;
                if (hours < 0) hours += 24;
                const minutes = diaryData.waketimeMinute - diaryData.bedtimeMinute;
                const timeInBed = hours * 60 + minutes;

                // Estimate sleep metrics (simplified - would come from detailed entry)
                const sleepOnsetLatency = 15; // Default estimate
                const wakeAfterSleepOnset = Math.round(timeInBed * 0.1);
                const totalSleepTime = timeInBed - sleepOnsetLatency - wakeAfterSleepOnset;
                const sleepEfficiency = Math.round((totalSleepTime / timeInBed) * 100);

                const diaryEntity: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
                  userId: sleepCoreCtx.userId,
                  date: diaryData.date,
                  bedtime,
                  lightsOffTime: bedtime,
                  sleepOnsetLatency,
                  wakeTime,
                  outOfBedTime: wakeTime,
                  nightAwakenings: 1,
                  wakeAfterSleepOnset,
                  totalSleepTime,
                  timeInBed,
                  sleepEfficiency,
                  sleepQuality: diaryData.sleepQuality,
                  morningMood: diaryData.sleepQuality,
                  deletedAt: null,
                };

                await sleepDiaryRepository.upsert(diaryEntity);
                console.log(`[Database] Diary entry saved for user ${sleepCoreCtx.userId}, date: ${diaryData.date}`);
                // ICH E6(R3) Audit: Log sleep diary entry creation
                if (auditService && ctx.session.dbUserId) {
                  await auditService.logCreate('sleep_diary', ctx.session.dbUserId, {
                    date: diaryData.date,
                    sleepEfficiency,
                  }, { userId: ctx.session.dbUserId });
                }

                // Update session cache
                ctx.session.therapyState = {
                  ...ctx.session.therapyState,
                  hasActiveSession: true,
                  lastDiaryDate: diaryData.date,
                  currentWeek: ctx.session.therapyState?.currentWeek || 0,
                };
              } catch (error) {
                console.error('[Database] Failed to save diary entry:', error);
                // Graceful degradation: don't fail the user's experience
              }
            }
          }
          break;

        // === Phase 7: Structured CBT-I Therapy Sessions ===
        case 'therapy':
          if ('handleCallback' in therapyCommand) {
            result = await (therapyCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});

            // Update therapy progress in session state
            if (result?.metadata?.weekNumber !== undefined) {
              ctx.session.therapyState = {
                ...ctx.session.therapyState,
                hasActiveSession: true,
                currentWeek: result.metadata.weekNumber as number,
              };
            }
          }
          break;

        case 'chronotype':
          if ('handleCallback' in chronotypeCommand) {
            result = await (chronotypeCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        // Wearable device linking (Galaxy Watch, Health Connect)
        case 'link':
          if ('handleCallback' in linkCommand) {
            result = await (linkCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        case 'relax':
          result = await relaxCommand.execute(sleepCoreCtx as ISleepCoreContext, action);
          break;

        case 'mindful':
          result = await mindfulCommand.execute(sleepCoreCtx as ISleepCoreContext, action);
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
            const _suggestions = dailyGreeting.getMoodSuggestions(moodLevel);

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
              const diaryResult = await diaryCommand.execute(sleepCoreCtx as ISleepCoreContext);
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
              const relaxResult = await relaxCommand.execute(sleepCoreCtx as ISleepCoreContext);
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
              const sosResult = await sosCommand.execute(sleepCoreCtx as ISleepCoreContext);
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
            case 'therapy': {
              const therapyResult = await therapyCommand.execute(sleepCoreCtx as ISleepCoreContext);
              if (therapyResult.message) {
                const kb = therapyResult.keyboard ? buildKeyboard(therapyResult.keyboard) : undefined;
                await ctx.editMessageText(therapyResult.message, {
                  parse_mode: 'Markdown',
                  reply_markup: kb,
                });
              }
              await ctx.answerCallbackQuery();
              return;
            }
            case 'challenges': {
              // Challenges feature - planned for Phase 8
              // Research (2025-2026): gamification shows small-moderate effect (Hedges g=-0.27)
              // Most effective components: progress tracking (80%), points (56%), rewards (50%)
              // Focus on CBT-I aligned challenges: sleep hygiene, consistency, relaxation
              const challengesPreview = `🎯 *Челленджи (скоро)*

Мы работаем над системой челленджей, которые помогут закрепить полезные привычки сна:

*Планируемые челленджи:*
• 🌙 "7 дней режима" — ложиться в одно время
• 📵 "Цифровой детокс" — без экранов за час до сна
• 🧘 "Неделя релаксации" — ежедневные практики
• ☕ "Без кофеина после 14:00"

_Следите за обновлениями!_`;

              await ctx.editMessageText(challengesPreview, {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard()
                  .text('◀️ Назад', 'menu:main'),
              });
              await ctx.answerCallbackQuery();
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
            result = await (rehearsalCommand as unknown as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        case 'recall':
          if ('handleCallback' in recallCommand) {
            result = await (recallCommand as unknown as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        // ==================== Sprint 3: Gamification Callbacks ====================

        case 'quest':
          // Quest system callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          // Ensure session is active for ethical engagement tracking
          ensureGamificationSession(ctx.session.dbUserId).catch(() => {});
          if ('handleCallback' in questCommand) {
            result = await (questCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        case 'badge':
          // Badge system callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          // Ensure session is active for ethical engagement tracking
          ensureGamificationSession(ctx.session.dbUserId).catch(() => {});
          if ('handleCallback' in badgeCommand) {
            result = await (badgeCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
          }
          break;

        case 'sonya':
          // Sonya evolution callbacks
          sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
          // Ensure session is active for ethical engagement tracking
          ensureGamificationSession(ctx.session.dbUserId).catch(() => {});
          if ('handleCallback' in evolutionCommand) {
            result = await (evolutionCommand as IConversationCommand).handleCallback(sleepCoreCtx as ISleepCoreContext, data, {});
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

    // =========================================================================
    // SAFETY FIRST: Crisis Detection (Phase 1.4)
    // Research: Woebot model - show resources, don't block user interaction
    // NLP detection achieves 92-97% accuracy (JMIR 2025)
    // =========================================================================
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id.toString() || '';

      const crisisResponse = crisisDetectionService.analyzeMessage(text, userId, chatId);

      if (crisisResponse.shouldInterrupt) {
        // Log crisis event for audit
        console.log(`[CRISIS] Detected severity=${crisisResponse.severity} for user=${userId}`);

        // Security audit log for crisis detection (SAMHSA 2025)
        securityAuditLog.log({
          type: 'crisis_escalation',
          userId,
          chatId,
          details: `Crisis detected: severity=${crisisResponse.severity}, type=${crisisResponse.event?.crisisType || 'unknown'}`,
          severity: crisisResponse.severity === 'critical' ? 'critical' : 'warning',
          metadata: { severity: crisisResponse.severity, messageLength: text.length },
        });

        // Send crisis response with resources (Woebot pattern: empathetic + actionable)
        await ctx.reply(crisisResponse.message, { parse_mode: 'HTML' });

        // Escalate to admins for HIGH/CRITICAL severity
        if (crisisResponse.event) {
          await crisisEscalationService.escalate(crisisResponse.event);
        }

        // IMPORTANT: Don't return - allow user to continue using bot
        // Research shows blocking increases distress (SAMHSA 2025)
      }
    } catch (crisisError) {
      // Crisis detection should NEVER block normal operation
      console.error('[CRISIS] Detection error (non-fatal):', crisisError);
    }

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
          result = await diaryCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'today':
          result = await todayCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'relax':
          result = await relaxCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'mindful':
          result = await mindfulCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'progress':
          result = await progressCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'sos':
          result = await sosCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'help':
          result = await helpCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'start':
          result = await startCommand.execute(sleepCoreCtx as ISleepCoreContext);
          break;
        case 'menu': {
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
        }
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
 * Options for setting up voice handlers
 */
interface SetupVoiceHandlersOptions {
  gamificationRepository?: GamificationRepository;
  voiceDiaryRepository?: VoiceDiaryRepository;
  auditService?: AuditService;
}

/**
 * Setup voice message handlers
 * Research: Fabla App shows "speech carries information we don't always consciously recognize"
 */
function setupVoiceHandlers(bot: Bot<MyContext>, api: SleepCoreAPI, options: SetupVoiceHandlersOptions = {}): void {
  const { gamificationRepository, voiceDiaryRepository, auditService } = options;
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
      if (result.success && result.entry) {
        await questService.checkQuestProgress(sleepCoreCtx.userId, 'voice_diary', 1);

        // Award XP for voice entry (in-memory)
        sonyaEvolutionService.addXP(sleepCoreCtx.userId, 15); // Voice = 15 XP

        // Persist voice diary entry to database (HIPAA compliant)
        // Research (2025): ePRO requires item-level timestamps and audit trails
        if (voiceDiaryRepository && ctx.session.dbUserId) {
          try {
            const savedVoiceEntry = await voiceDiaryRepository.insert({
              userId: ctx.session.dbUserId,
              transcriptionText: result.entry.text,
              transcriptionConfidence: result.entry.transcriptionConfidence,
              transcriptionLanguage: result.entry.metadata?.language || 'ru',
              voiceDuration: result.entry.voiceDuration,
              emotion: result.entry.emotion,
              emotionIntensity: result.entry.emotionIntensity,
              telegramFileId: result.entry.metadata?.fileId,
              fileSize: result.entry.metadata?.fileSize,
              recordedAt: result.entry.createdAt,
              transcribedAt: new Date(),
            });
            console.log(`[Voice] Entry persisted for user ${ctx.session.dbUserId}`);
            // ICH E6(R3) Audit: Log voice diary entry (PHI data)
            if (auditService && savedVoiceEntry?.id) {
              await auditService.logCreate('voice_diary', savedVoiceEntry.id, {
                emotion: result.entry.emotion,
                voiceDuration: result.entry.voiceDuration,
              }, { userId: ctx.session.dbUserId });
            }
          } catch (err) {
            console.error('[Voice] Persistence failed:', err);
            // Don't fail the user interaction - voice was processed successfully
          }
        }

        // Persist XP to database (ethical gamification)
        // Note: Uses GamificationRepository from voice handler options
        if (gamificationRepository && ctx.session.dbUserId) {
          try {
            // Award XP for voice diary (counts as sleep_diary entry)
            const xpResult = await gamificationRepository.addXP(ctx.session.dbUserId, 15, 'sleep_diary');
            if (xpResult.leveledUp) {
              console.log(`[Gamification] User ${ctx.session.dbUserId} leveled up to ${xpResult.newLevel} via voice diary!`);
            }
            // Audit: Log gamification XP award
            if (auditService) {
              await auditService.logUpdate('gamification', ctx.session.dbUserId, {
                xpAwarded: 15,
                source: 'voice_diary',
                leveledUp: xpResult.leveledUp,
              }, { userId: ctx.session.dbUserId });
            }
          } catch (err) {
            console.error('[Gamification] Voice XP persistence failed:', err);
          }
        }
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
 * Setup error handler with Sentry integration
 * Research (2025): Centralized error handling improves observability
 */
function setupErrors(bot: Bot<MyContext>): void {
  bot.catch((err) => {
    const { ctx, error: rawError } = err;
    const updateId = ctx.update.update_id;
    const userId = ctx.from?.id?.toString();

    // Normalize error to Error type for Sentry
    const error: Error = rawError instanceof Error
      ? rawError
      : new Error(String(rawError));

    console.error(`[Error] Update ${updateId}:`, error);

    // Determine error category and severity for Sentry
    let category: 'telegram_api' | 'external_api' | 'business_logic' | 'unknown' = 'unknown';
    let severity: 'error' | 'warning' = 'error';

    if (rawError instanceof GrammyError) {
      category = 'telegram_api';

      if (rawError.error_code === 403) {
        // User blocked bot - not a real error
        console.log(`User ${userId} blocked bot`);
        severity = 'warning';
      } else if (rawError.error_code === 429) {
        // Rate limit - handled by auto-retry
        console.warn('Rate limit:', rawError.parameters?.retry_after);
        severity = 'warning';
      }
    } else if (rawError instanceof HttpError) {
      category = 'external_api';
      console.error('HTTP error:', error);
    }

    // Report to Sentry with anonymized user context
    sentryService.captureError(error, {
      category,
      tags: {
        update_id: updateId.toString(),
        error_type: error.name || 'UnknownError',
        ...(rawError instanceof GrammyError && { grammy_error_code: rawError.error_code.toString() }),
      },
      user: userId
        ? {
            anonymousId: sentryService.anonymizeUserId(userId),
          }
        : undefined,
      extra: {
        // Don't include full context - may contain PHI
        update_type: Object.keys(ctx.update).filter((k) => k !== 'update_id')[0],
      },
    }, severity);
  });

  // Global process error handlers for uncaught exceptions
  // Research (2025): Allow crash but report first, use PM2/Forever for restart
  process.on('uncaughtException', (error) => {
    console.error('[Fatal] Uncaught exception:', error);
    sentryService.captureError(error, {
      category: 'unknown',
      tags: { fatal: 'true', type: 'uncaughtException' },
    }, 'fatal');

    // Flush Sentry and exit
    sentryService.flush(2000).finally(() => {
      process.exit(1);
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[Fatal] Unhandled rejection:', reason);
    const error = reason instanceof Error ? reason : new Error(String(reason));
    sentryService.captureError(error, {
      category: 'unknown',
      tags: { fatal: 'true', type: 'unhandledRejection' },
    }, 'fatal');

    // Flush Sentry and exit
    sentryService.flush(2000).finally(() => {
      process.exit(1);
    });
  });
}

// ============================================================================
// HEALTH CHECK (IEC 62304 / IEC 60601 Compliant)
// ============================================================================

/**
 * Startup health check result
 */
interface IStartupHealthCheck {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    critical: boolean;
    durationMs?: number;
  }>;
  totalDurationMs: number;
}

/**
 * Global health state for runtime checks
 */
const healthState: {
  startupAt: Date;
  startupChecks: IStartupHealthCheck | null;
  databaseHealthy: boolean;
  lastDatabaseCheck: Date | null;
} = {
  startupAt: new Date(),
  startupChecks: null,
  databaseHealthy: false,
  lastDatabaseCheck: null,
};

/**
 * Perform startup health checks per IEC 62304/60601
 * PEMS self-test requirements for medical device software
 */
async function performStartupHealthChecks(): Promise<IStartupHealthCheck> {
  const startTime = Date.now();
  const checks: IStartupHealthCheck['checks'] = [];

  console.log('[Startup] Beginning IEC 62304 compliant health checks...');

  // Check 1: Required environment variables (CRITICAL)
  const checkEnvStart = Date.now();
  const requiredEnvVars = ['BOT_TOKEN'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required: ${missingVars.join(', ')}`,
      critical: true,
      durationMs: Date.now() - checkEnvStart,
    });
  } else {
    checks.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables present',
      critical: true,
      durationMs: Date.now() - checkEnvStart,
    });
  }

  // Check 2: OpenAI API key (CRITICAL for voice/LLM features)
  const checkOpenAIStart = Date.now();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  checks.push({
    name: 'OpenAI API Key',
    status: hasOpenAI ? 'pass' : 'warn',
    message: hasOpenAI ? 'OpenAI API key configured' : 'OpenAI API key not configured - voice/LLM features disabled',
    critical: false,
    durationMs: Date.now() - checkOpenAIStart,
  });

  // Check 3: Admin configuration for crisis escalation (CRITICAL for safety)
  // Per ISO 14971: risk controls (crisis escalation) cannot be bypassed
  // Per FDA DHAC Nov 2025: crisis escalation mandatory for AI mental health devices
  // Per IEC 62304 Team-NB FAQ: Class C units must claim critical resources at startup
  const checkAdminStart = Date.now();
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];
  const isProduction = process.env.NODE_ENV === 'production';
  const invalidAdminIds = adminIds.filter(id => !/^\d+$/.test(id));
  if (adminIds.length === 0) {
    checks.push({
      name: 'Crisis Escalation Admins',
      status: isProduction ? 'fail' : 'warn',
      message: isProduction
        ? 'ADMIN_USER_IDS not configured - crisis escalation blocked (required in production per ISO 14971)'
        : 'No ADMIN_USER_IDS configured - crisis escalation notifications disabled (non-blocking in dev)',
      critical: isProduction,
      durationMs: Date.now() - checkAdminStart,
    });
  } else if (invalidAdminIds.length > 0) {
    checks.push({
      name: 'Crisis Escalation Admins',
      status: 'fail',
      message: `Invalid ADMIN_USER_IDS format: ${invalidAdminIds.join(', ')} (must be numeric Telegram user IDs)`,
      critical: true,
      durationMs: Date.now() - checkAdminStart,
    });
  } else {
    checks.push({
      name: 'Crisis Escalation Admins',
      status: 'pass',
      message: `${adminIds.length} admin(s) configured for crisis notifications`,
      critical: true,
      durationMs: Date.now() - checkAdminStart,
    });
  }

  // Check 4: Data directory writability (CRITICAL)
  const checkDataDirStart = Date.now();
  const dataDir = process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : './data';
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const testFile = path.join(dataDir, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.push({
      name: 'Data Directory',
      status: 'pass',
      message: `Data directory writable: ${dataDir}`,
      critical: true,
      durationMs: Date.now() - checkDataDirStart,
    });
  } catch (error) {
    checks.push({
      name: 'Data Directory',
      status: 'fail',
      message: `Data directory not writable: ${dataDir} - ${error}`,
      critical: true,
      durationMs: Date.now() - checkDataDirStart,
    });
  }

  // Check 5: Crisis detector initialization (CRITICAL for safety)
  const checkCrisisStart = Date.now();
  try {
    // Import and verify crisis detector is functional using dist (compiled) path
    const { CrisisDetector } = await import('../packages/cognicore-engine/dist/index.js');
    const testDetector = new CrisisDetector();
    const testResult = testDetector.detect('test message');
    if (testResult && typeof testResult.severity !== 'undefined') {
      checks.push({
        name: 'Crisis Detector',
        status: 'pass',
        message: 'Crisis detection module initialized and functional',
        critical: true,
        durationMs: Date.now() - checkCrisisStart,
      });
    } else {
      throw new Error('Invalid response from crisis detector');
    }
  } catch (error) {
    checks.push({
      name: 'Crisis Detector',
      status: 'fail',
      message: `Crisis detector initialization failed: ${error}`,
      critical: true,
      durationMs: Date.now() - checkCrisisStart,
    });
  }

  // Check 6: Encryption key round-trip test (CRITICAL for HIPAA/GDPR)
  // Per HIPAA 2026: encryption is mandatory (not addressable)
  // Per OWASP A02:2021: silent cryptographic failure = critical vulnerability
  const checkEncryptionStart = Date.now();
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;
  if (encryptionKey) {
    try {
      const { EncryptionService } = await import('./infrastructure/database/security/EncryptionService');
      const testService = new EncryptionService({
        masterKey: encryptionKey,
        useKeyDerivation: false,
      });
      const testPlaintext = 'sleepcore-startup-integrity-check';
      const encrypted = testService.encrypt(testPlaintext);
      const decrypted = testService.decrypt(encrypted);
      if (decrypted !== testPlaintext) {
        throw new Error('Round-trip mismatch: decrypted text does not match original');
      }
      checks.push({
        name: 'Encryption Key Integrity',
        status: 'pass',
        message: 'AES-256-GCM round-trip test passed',
        critical: true,
        durationMs: Date.now() - checkEncryptionStart,
      });
    } catch (error) {
      checks.push({
        name: 'Encryption Key Integrity',
        status: 'fail',
        message: `Encryption round-trip failed (fail-closed per HIPAA 2026): ${error}`,
        critical: true,
        durationMs: Date.now() - checkEncryptionStart,
      });
    }
  } else {
    checks.push({
      name: 'Encryption Key Integrity',
      status: isProduction ? 'fail' : 'warn',
      message: isProduction
        ? 'ENCRYPTION_MASTER_KEY not set — PHI encryption impossible (required in production per HIPAA)'
        : 'ENCRYPTION_MASTER_KEY not set — PHI encryption disabled in dev mode',
      critical: isProduction,
      durationMs: Date.now() - checkEncryptionStart,
    });
  }

  // Calculate results
  const totalDurationMs = Date.now() - startTime;
  const criticalFailures = checks.filter(c => c.critical && c.status === 'fail');
  const passed = criticalFailures.length === 0;

  // Log results
  console.log('[Startup] Health check results:');
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    const level = check.critical ? 'CRITICAL' : 'optional';
    console.log(`  ${icon} [${level}] ${check.name}: ${check.message} (${check.durationMs}ms)`);
  }
  console.log(`[Startup] Health checks completed in ${totalDurationMs}ms - ${passed ? 'PASSED' : 'FAILED'}`);

  const result = { passed, checks, totalDurationMs };
  healthState.startupChecks = result;

  return result;
}

/**
 * Start health check server with detailed status
 * Per IEC 62304: Runtime monitoring and diagnostics
 */
function startHealth(port: number, db?: IDatabaseConnection | null): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const http = require('http');

  http.createServer(async (req: { url: string }, res: { writeHead: (code: number, headers?: object) => void; end: (data?: string) => void }) => {
    if (req.url === '/health') {
      // Basic health check
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: VERSION,
        buildDate: BUILD_DATE,
        uptime: process.uptime(),
      }));
    } else if (req.url === '/health/detailed') {
      // Detailed health check (IEC 62304 compliant)
      let dbStatus = 'unknown';
      let dbLatencyMs: number | null = null;

      if (db) {
        try {
          const healthResult = await db.healthCheck();
          dbStatus = healthResult.connected ? 'connected' : 'disconnected';
          dbLatencyMs = healthResult.latencyMs;
          healthState.databaseHealthy = healthResult.connected;
          healthState.lastDatabaseCheck = new Date();
        } catch {
          dbStatus = 'error';
          healthState.databaseHealthy = false;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: healthState.databaseHealthy ? 'healthy' : 'degraded',
        version: VERSION,
        buildDate: BUILD_DATE,
        uptime: process.uptime(),
        startupAt: healthState.startupAt.toISOString(),
        startupChecks: healthState.startupChecks,
        runtime: {
          database: {
            status: dbStatus,
            latencyMs: dbLatencyMs,
            lastCheck: healthState.lastDatabaseCheck?.toISOString(),
          },
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      }));
    } else if (req.url === '/health/ready') {
      // Readiness probe for Kubernetes
      const ready = healthState.startupChecks?.passed && healthState.databaseHealthy;
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ready }));
    } else if (req.url === '/health/live') {
      // Liveness probe for Kubernetes
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ alive: true }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(port, () => console.log(`[Health] Server listening on port ${port} (/health, /health/detailed, /health/ready, /health/live)`));
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

  // --- IEC 62304 Startup Health Checks ---
  // PEMS self-test per IEC 60601-1 for medical device software
  const healthChecks = await performStartupHealthChecks();
  if (!healthChecks.passed) {
    console.error('[Startup] FATAL: Critical health checks failed - cannot start bot safely');
    process.exit(1);
  }
  healthState.databaseHealthy = true; // Initial assumption, will be verified below

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
    // CRITICAL: Database is REQUIRED for healthcare data (HIPAA/152-FZ compliance)
    // Fail-fast prevents silent data loss (consent, PHI, therapy progress)
    console.error("[DB] FATAL: SQLite initialization failed:", error);
    console.error("[DB] Cannot start bot without persistent storage - informed consent and PHI data would be lost");
    process.exit(1);
  }

  // --- Initialize Repositories (Session Persistence) ---
  let userRepository: UserRepository | undefined;
  let sleepDiaryRepository: SleepDiaryRepository | undefined;
  let assessmentRepository: AssessmentRepository | undefined;
  let therapySessionRepository: TherapySessionRepository | undefined;
  let gamificationRepository: GamificationRepository | undefined;
  let voiceDiaryRepository: VoiceDiaryRepository | undefined;
  let auditService: AuditService | undefined;
  if (db) {
    userRepository = new UserRepository(db);
    sleepDiaryRepository = new SleepDiaryRepository(db);
    assessmentRepository = new AssessmentRepository(db);
    therapySessionRepository = new TherapySessionRepository(db);
    gamificationRepository = new GamificationRepository(db);
    voiceDiaryRepository = new VoiceDiaryRepository(db);
    // ICH E6(R3) / 21 CFR Part 11: Immutable audit trail for clinical compliance
    auditService = new AuditService(db, {
      enabled: true,
      logPhiAccess: true,
      captureOldValues: true,
      captureNewValues: true,
      retentionDays: 2190, // 6 years (HIPAA requirement)
    });
    console.log("[DB] Repositories initialized: User, SleepDiary, Assessment, TherapySession, Gamification, VoiceDiary, AuditService");
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
  const notificationService = createProactiveNotificationService(bot as unknown as Bot<Context>, menuService);

  // --- Initialize ISI Scheduling Service (Phase 7: CBT-I Session Integration) ---
  const isiSchedulingService = createISISchedulingService(bot as unknown as Bot<Context>);

  // --- Wire service hooks into SleepCoreAPI (January 2026 audit fix) ---
  // Enables commands to call enrollISISchedule() and registerForNotifications()
  // via ctx.sleepCore without direct dependency on bot services
  api.setISISchedulingHook((userId, chatId, userName, baselineISI) => {
    isiSchedulingService.enrollUser(userId, chatId, userName, baselineISI);
  });
  api.setNotificationHook((userId, chatId, userName) => {
    notificationService.registerUser({
      userId,
      chatId,
      userName,
      preferences: {
        enabled: true,
        morningTime: '08:00',
        eveningTime: '20:00',
        timezone: 'Europe/Moscow',
      },
      context: {},
    });
  });
  // --- Wire database connection into SleepCoreAPI (Phase 5d) ---
  // Enables AdminCommand and other features that require database access
  if (db) {
    api.setDatabase(db);
    console.log('[Database] SleepCoreAPI database connection wired');
  }

  console.log('[ServiceHooks] ISI scheduling and notification hooks wired to SleepCoreAPI');

  // --- Phase 9: Service persistence wiring ---
  // FDA 21 CFR Part 11 / HIPAA: Persist clinical data to DB (write-through + hydration)
  if (db) {
    const safetyPlanRepo = new SafetyPlanRepository(db);
    const isiScheduleRepo = new ISIScheduleRepository(db);
    const digitalTwinRepo = new DigitalTwinRepository(db);
    const onboardingRepo = new OnboardingRepository(db);
    const serviceStateRepo = new ServiceStateRepository(db);
    const notificationUserRepo = new NotificationUserRepository(db);
    const mctRepo = new MCTRepository(db);
    const mcq30Repo = new MCQ30Repository(db);

    // CRITICAL: Safety plans and clinical scheduling
    await crisisEscalationService.setRepository(safetyPlanRepo);
    await isiSchedulingService.setRepository(isiScheduleRepo);

    // HIGH: Clinical state
    await digitalTwinService.setRepository(digitalTwinRepo);
    await onboardingTracker.setRepository(onboardingRepo);
    await sleepPredictionService.setStateRepository(serviceStateRepo);

    // MEDIUM: Engagement and notifications
    await notificationService.setRepository(notificationUserRepo);
    await proactiveIntelligenceService.setRepository(serviceStateRepo);
    await adaptivePersonaService.setRepository(serviceStateRepo);

    // LOW: MCT therapy + voice biomarkers
    await worryPostponementService.setRepository(mctRepo);
    await detachedMindfulnessService.setRepository(mctRepo);
    await attService.setRepository(mctRepo, serviceStateRepo);
    await mcq30AssessmentService.setRepository(mcq30Repo);
    await voiceBiomarkerService.setRepository(serviceStateRepo);

    // MEDIUM: Arousal and cognitive progress tracking (Wave 2 services)
    await arousalAssessmentService.setRepository(serviceStateRepo);
    await cognitiveProgressReportService.setRepository(serviceStateRepo);

    console.log('[DB] All service repositories wired — data persistence enabled');
  }

  // --- Initialize Crisis Escalation Service (Phase 1.4 Safety) ---
  // CRITICAL: Must call setBot() to enable admin notifications
  crisisEscalationService.setBot(bot as unknown as Bot<Context>);

  // Configure admin user IDs from environment (comma-separated)
  // ISO 14971: Crisis escalation is a safety-critical risk control
  // IEC 62304 Team-NB FAQ: Class C units must claim critical resources at startup
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];
  const invalidIds = adminUserIds.filter(id => !/^\d+$/.test(id));
  if (invalidIds.length > 0) {
    console.error(`[CrisisEscalation] FATAL: Invalid ADMIN_USER_IDS format: ${invalidIds.join(', ')} (must be numeric Telegram user IDs)`);
    process.exit(1);
  } else if (adminUserIds.length > 0) {
    crisisEscalationService.updateConfig({ adminUserIds });
    console.log(`[CrisisEscalation] Configured with ${adminUserIds.length} admin(s) for emergency notifications`);
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[CrisisEscalation] FATAL: No ADMIN_USER_IDS in production — crisis escalation risk control missing');
    process.exit(1);
  } else {
    console.warn('[CrisisEscalation] WARNING: No ADMIN_USER_IDS configured — crisis escalation disabled in dev mode');
  }

  // --- Sprint 1 CogniCore: PLRNN-based Sleep Prediction Service ---
  // Uses PLRNNEngine for 7-day trajectory prediction and Early Warning Signals
  console.log('[PLRNN] Sleep Prediction Service initialized (CogniCore Engine 2.0)');
  // Note: sleepPredictionService is a singleton, already initialized on import
  // It will be used by ProgressCommand for 7-day predictions and TodayCommand for Early Warning Signals

  // Setup handlers
  setupCommands(bot, api, { userRepository, auditService });
  setupCallbacks(bot, api, { userRepository, sleepDiaryRepository, assessmentRepository, therapySessionRepository, gamificationRepository, auditService });
  setupMessages(bot, api);
  setupVoiceHandlers(bot, api, { gamificationRepository, voiceDiaryRepository, auditService }); // Sprint 3: Voice diary + persistence + audit
  setupErrors(bot);

  // Start notification and scheduling services
  // NOTIFICATIONS_ENABLED env var allows testing in development
  const enableNotifications = process.env.NODE_ENV === 'production' || process.env.NOTIFICATIONS_ENABLED === 'true';
  if (enableNotifications) {
    notificationService.start();
    console.log('[Notifications] Proactive notification service started');

    // Start ISI biweekly assessment scheduling (dCBT-I protocol)
    isiSchedulingService.start();
    console.log('[ISI Schedule] Biweekly assessment service started');

    // Start automated backup scheduler (2025 best practices: GFS retention)
    if (db && process.env.BACKUP_ENABLED !== 'false') {
      const backupScheduler = createAutomatedBackupScheduler({
        backup: {
          backupDir: process.env.BACKUP_DIR || './data/backups',
          encrypt: process.env.BACKUP_ENCRYPT !== 'false',
          encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
        },
        schedule: {
          runOnStart: process.env.BACKUP_RUN_ON_START === 'true',
        },
        health: {
          onBackupComplete: (result, type) => {
            if (result.success) {
              console.log(`[Backup] ${type} backup completed: ${result.metadata?.backupPath}`);
            } else {
              console.error(`[Backup] ${type} backup FAILED: ${result.error}`);
            }
          },
          onHealthAlert: (alert) => {
            console.warn(`[Backup] ALERT: ${alert.type} - ${alert.message}`);
          },
        },
        verbose: process.env.BACKUP_VERBOSE === 'true',
      });

      backupScheduler.start(db).then(() => {
        console.log('[Backup] Automated backup scheduler started (GFS retention)');
      }).catch((err) => {
        console.error('[Backup] Failed to start scheduler:', err);
      });
    }
  }

  // Health check
  startHealth(parseInt(process.env.HEALTH_PORT || '3001', 10), db);

  // Register commands with BotFather (Hub Model: 5-6 core commands only)
  // Research: 3-5 commands optimal (Miller's Law, Material Design, NN Group)
  // All other commands accessible via /menu (Hub-and-Spoke pattern)
  try {
    const hubModelCommands = [
      { command: 'start', description: '🚀 Начать работу с ботом' },
      { command: 'menu', description: '📱 Все функции (главное меню)' },
      { command: 'diary', description: '📓 Дневник сна' },
      { command: 'therapy', description: '🧠 Терапевтические сессии КПТ-И' },
      { command: 'sos', description: '🆘 Экстренная помощь' },
      { command: 'help', description: '❓ Справка и все команды' },
    ];
    await bot.api.setMyCommands(hubModelCommands);
    console.log(`[Bot] Hub Model: ${hubModelCommands.length} core commands registered`);
  } catch (error) {
    console.warn('[Bot] Command registration failed:', error);
  }

  // Graceful shutdown with timeout protection
  // 2025/2026 Best Practice: Prevent double-shutdown and force exit on timeout
  let isShuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds max for graceful shutdown

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log(`[Bot] ${signal} - already shutting down, ignoring...`);
      return;
    }
    isShuttingDown = true;

    console.log(`\n[Bot] ${signal} - shutting down gracefully (timeout: ${SHUTDOWN_TIMEOUT_MS}ms)...`);

    // Force exit after timeout
    const forceExitTimer = setTimeout(() => {
      console.error('[Bot] Graceful shutdown timeout exceeded, forcing exit...');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      // Stop bot first to stop receiving new updates
      console.log("[Bot] Stopping polling...");
      await bot.stop();
      console.log("[Bot] Polling stopped");

      // Stop proactive notifications
      notificationService.stop();
      console.log("[Notifications] Service stopped");

      // Stop ISI scheduling service
      isiSchedulingService.stop();
      console.log("[ISI Schedule] Service stopped");

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

      // Stop rate limiter cleanup timer
      stopRateLimiter();
      console.log("[RateLimiter] Service stopped");

      // Flush Sentry events before exit (2025 best practice)
      await sentryService.flush(2000);
      console.log("[Sentry] Events flushed");

      clearTimeout(forceExitTimer);
      console.log("[Bot] Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error('[Bot] Error during shutdown:', error);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start polling
  console.log('[Bot] Starting...');

  // 2025/2026 Best Practice: Clear any existing webhook/polling state before starting
  // This prevents 409 Conflict errors when container restarts
  // Research: grammY docs, Telegram Bot API best practices
  const isProd = process.env.NODE_ENV === 'production';
  const shouldDropUpdates = botConfig.polling?.dropPendingUpdates ?? isProd;

  console.log(`[Bot] Clearing previous session state (drop_pending_updates: ${shouldDropUpdates})...`);
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: shouldDropUpdates });
    console.log('[Bot] Previous session state cleared');
  } catch (clearError) {
    console.warn('[Bot] Could not clear previous session (non-fatal):', clearError);
  }

  // Small delay to ensure Telegram's side has processed the cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  await bot.start({
    drop_pending_updates: shouldDropUpdates,
    onStart: (info) => {
      console.log(`[Bot] @${info.username} ready`);
      console.log(`[Bot] Session storage: ${sessionAdapter ? "SQLite" : "Memory"}`);
      console.log(`[Bot] Sentry monitoring: ${sentryService.isActive() ? "Active" : "Disabled"}`);
    },
  });
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});

export { main, createBot, extendContext };
