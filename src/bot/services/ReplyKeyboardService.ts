/**
 * Reply Keyboard Service
 * ======================
 * Context-aware persistent reply keyboard for thumb-zone UX.
 *
 * Research basis (2025):
 * - 75% users interact with phones using only thumb (Steven Hoober)
 * - Bottom navigation in "natural zone" improves engagement
 * - Reply keyboard visible constantly, reduces friction
 * - 3-5 buttons optimal (Material Design, Apple HIG)
 * - Context switching increases relevance (JITAI pattern)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import { Keyboard } from 'grammy';
import type { TimeOfDay } from '../commands/registry';

// ==================== Types ====================

/**
 * Reply keyboard button configuration
 */
export interface IReplyButton {
  /** Button text with emoji */
  text: string;
  /** Command to execute (without /) */
  command: string;
}

/**
 * Keyboard layout by context
 */
export interface IKeyboardLayout {
  /** Time of day this layout is for */
  timeOfDay: TimeOfDay;
  /** Primary buttons (always visible, max 3) */
  primaryButtons: IReplyButton[];
  /** Description for logging */
  description: string;
}

/**
 * User context for keyboard generation
 */
export interface IKeyboardContext {
  /** Current time of day */
  timeOfDay: TimeOfDay;
  /** Has pending diary entry? */
  hasPendingDiary?: boolean;
  /** Is in crisis/vulnerable state? */
  isVulnerable?: boolean;
  /** Current therapy week */
  therapyWeek?: number;
  /** Has completed onboarding? */
  hasCompletedOnboarding?: boolean;
}

// ==================== Keyboard Layouts ====================

/**
 * Morning keyboard (6:00-12:00)
 * Focus: Diary (morning review), Today's plan, Menu
 */
const MORNING_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'morning',
  description: 'Morning: Diary + Today + Menu',
  primaryButtons: [
    { text: '📓 Дневник', command: 'diary' },
    { text: '📅 Сегодня', command: 'today' },
    { text: '📊 Меню', command: 'menu' },
  ],
};

/**
 * Day keyboard (12:00-18:00)
 * Focus: Mindfulness, Progress check, Menu
 */
const DAY_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'day',
  description: 'Day: Mindful + Progress + Menu',
  primaryButtons: [
    { text: '🧠 Осознанность', command: 'mindful' },
    { text: '📈 Прогресс', command: 'progress' },
    { text: '📊 Меню', command: 'menu' },
  ],
};

/**
 * Evening keyboard (18:00-22:00)
 * Focus: Relaxation (pre-sleep), Diary prep, Menu
 */
const EVENING_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'evening',
  description: 'Evening: Relax + Diary + Menu',
  primaryButtons: [
    { text: '🧘 Релаксация', command: 'relax' },
    { text: '📓 Дневник', command: 'diary' },
    { text: '📊 Меню', command: 'menu' },
  ],
};

/**
 * Night keyboard (22:00-6:00)
 * Focus: SOS (crisis support), Relaxation, Menu
 * Research: Night usage often indicates sleep problems
 */
const NIGHT_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'night',
  description: 'Night: SOS + Relax + Menu',
  primaryButtons: [
    { text: '🆘 Помощь', command: 'sos' },
    { text: '🧘 Релаксация', command: 'relax' },
    { text: '📊 Меню', command: 'menu' },
  ],
};

/**
 * Vulnerable state keyboard (JITAI pattern)
 * Shown when user is in crisis or low sleep efficiency
 */
const VULNERABLE_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'night', // Default, but used in any time
  description: 'Vulnerable: SOS + Relax + Help',
  primaryButtons: [
    { text: '🆘 Срочная помощь', command: 'sos' },
    { text: '🧘 Успокоиться', command: 'relax' },
    { text: '❓ Справка', command: 'help' },
  ],
};

/**
 * Onboarding keyboard (before completing ISI)
 */
const ONBOARDING_LAYOUT: IKeyboardLayout = {
  timeOfDay: 'day',
  description: 'Onboarding: Start + Help + Menu',
  primaryButtons: [
    { text: '🚀 Начать', command: 'start' },
    { text: '❓ Справка', command: 'help' },
    { text: '📊 Меню', command: 'menu' },
  ],
};

/**
 * Map of all layouts by time of day
 */
const LAYOUTS_BY_TIME: Record<TimeOfDay, IKeyboardLayout> = {
  morning: MORNING_LAYOUT,
  day: DAY_LAYOUT,
  evening: EVENING_LAYOUT,
  night: NIGHT_LAYOUT,
};

// ==================== Service ====================

/**
 * Reply Keyboard Service
 * Generates context-aware persistent reply keyboards
 */
export class ReplyKeyboardService {
  /**
   * Get current time of day (Moscow timezone)
   */
  getTimeOfDay(): TimeOfDay {
    const now = new Date();
    // Moscow is UTC+3
    const moscowOffset = 3 * 60;
    const localOffset = now.getTimezoneOffset();
    const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60000);
    const hour = moscowTime.getHours();

    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get appropriate layout based on context
   */
  getLayout(context: IKeyboardContext): IKeyboardLayout {
    // Priority 1: Vulnerable state (JITAI)
    if (context.isVulnerable) {
      return VULNERABLE_LAYOUT;
    }

    // Priority 2: Onboarding not completed
    if (!context.hasCompletedOnboarding) {
      return ONBOARDING_LAYOUT;
    }

    // Priority 3: Time-based layout
    return LAYOUTS_BY_TIME[context.timeOfDay];
  }

  /**
   * Build Grammy Keyboard from layout
   */
  buildKeyboard(layout: IKeyboardLayout): Keyboard {
    const keyboard = new Keyboard();

    // Add all primary buttons in a single row
    for (const button of layout.primaryButtons) {
      keyboard.text(button.text);
    }

    // Configure keyboard options
    keyboard
      .resized()      // Smaller keyboard, less intrusive
      .persistent();  // Always visible

    return keyboard;
  }

  /**
   * Generate context-aware reply keyboard
   * Main entry point for the service
   */
  generate(context: Partial<IKeyboardContext> = {}): Keyboard {
    const fullContext: IKeyboardContext = {
      timeOfDay: context.timeOfDay || this.getTimeOfDay(),
      hasPendingDiary: context.hasPendingDiary,
      isVulnerable: context.isVulnerable,
      therapyWeek: context.therapyWeek,
      hasCompletedOnboarding: context.hasCompletedOnboarding ?? true,
    };

    const layout = this.getLayout(fullContext);
    return this.buildKeyboard(layout);
  }

  /**
   * Generate keyboard for specific time of day
   * Useful for testing or forcing a specific layout
   */
  generateForTime(timeOfDay: TimeOfDay): Keyboard {
    const layout = LAYOUTS_BY_TIME[timeOfDay];
    return this.buildKeyboard(layout);
  }

  /**
   * Get current layout description (for logging)
   */
  getCurrentLayoutDescription(context: Partial<IKeyboardContext> = {}): string {
    const fullContext: IKeyboardContext = {
      timeOfDay: context.timeOfDay || this.getTimeOfDay(),
      isVulnerable: context.isVulnerable,
      hasCompletedOnboarding: context.hasCompletedOnboarding ?? true,
    };

    const layout = this.getLayout(fullContext);
    return layout.description;
  }

  /**
   * Parse button text to command
   * Used when user clicks a reply keyboard button
   */
  parseButtonToCommand(buttonText: string): string | null {
    // Check all layouts for matching button
    const allLayouts = [
      MORNING_LAYOUT,
      DAY_LAYOUT,
      EVENING_LAYOUT,
      NIGHT_LAYOUT,
      VULNERABLE_LAYOUT,
      ONBOARDING_LAYOUT,
    ];

    for (const layout of allLayouts) {
      for (const button of layout.primaryButtons) {
        if (button.text === buttonText) {
          return button.command;
        }
      }
    }

    return null;
  }

  /**
   * Check if text is a reply keyboard button
   */
  isReplyKeyboardButton(text: string): boolean {
    return this.parseButtonToCommand(text) !== null;
  }
}

// ==================== Singleton Export ====================

export const replyKeyboard = new ReplyKeyboardService();

export default replyKeyboard;
