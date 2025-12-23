/**
 * Daily Greeting Service
 * =======================
 * Personalized daily greetings with integrated mood check.
 *
 * Research basis (2025):
 * - Woebot/Wysa: daily check-ins with pre-filled answers (Healthline)
 * - Evening check-in window: 5-10 PM (PMC Study)
 * - Morning check-in upon waking (NIMH HealthRhythms)
 * - Circadian rhythm disturbances precede mood episodes
 * - Personalization based on historical patterns increases engagement
 *
 * Flow:
 * 1. Personalized greeting with name + time of day
 * 2. Quick mood check: "How are you feeling today?"
 * 3. Emoji slider or quick buttons (1-5 scale)
 * 4. Contextual response based on mood + streak
 * 5. Suggest next action (diary, exercises, etc.)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import { InlineKeyboard } from 'grammy';

// ==================== Types ====================

/**
 * Time of day categories
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Greeting context for personalization
 */
export interface IGreetingContext {
  userName?: string;
  timeOfDay: TimeOfDay;
  currentStreak: number;
  lastMoodLevel?: number; // 1-5
  hasPendingDiary: boolean;
  daysSinceLastActivity: number;
  isFirstTimeToday: boolean;
  weekDay: number; // 0-6 (Sunday-Saturday)
}

/**
 * Generated greeting result
 */
export interface IDailyGreeting {
  message: string;
  keyboard: InlineKeyboard;
  includesMoodCheck: boolean;
  suggestedAction?: string;
}

/**
 * Mood check prompt style
 */
export type MoodPromptStyle = 'emoji_row' | 'detailed' | 'minimal';

// ==================== Constants ====================

/**
 * Morning greetings (6:00 - 11:59)
 */
const MORNING_GREETINGS = [
  'Доброе утро',
  'С добрым утром',
  'Привет! Начинаем новый день',
  'Утро доброе',
  'Солнечного утра',
];

/**
 * Afternoon greetings (12:00 - 16:59)
 */
const AFTERNOON_GREETINGS = [
  'Добрый день',
  'Привет',
  'Как дела?',
  'Хорошего дня',
];

/**
 * Evening greetings (17:00 - 21:59)
 */
const EVENING_GREETINGS = [
  'Добрый вечер',
  'Привет! Как прошел день?',
  'Вечер добрый',
  'Хорошего вечера',
];

/**
 * Night greetings (22:00 - 5:59)
 */
const NIGHT_GREETINGS = [
  'Доброй ночи',
  'Привет! Еще не спишь?',
  'Время отдыхать',
  'Готовимся ко сну?',
];

/**
 * Mood check prompts
 */
const MOOD_PROMPTS = {
  morning: [
    'Как ты себя чувствуешь сегодня?',
    'Как настроение с утра?',
    'Как самочувствие?',
  ],
  afternoon: [
    'Как настроение?',
    'Как себя чувствуешь?',
    'Как день проходит?',
  ],
  evening: [
    'Как прошел день?',
    'Как настроение к вечеру?',
    'Как ты сегодня?',
  ],
  night: [
    'Как прошел день?',
    'Готов ко сну?',
    'Как самочувствие?',
  ],
};

/**
 * Streak motivational messages
 */
const STREAK_MESSAGES: Record<string, string> = {
  '0': '',
  '1': '🔥 Отличное начало!',
  '3': '🔥 3 дня подряд! Молодец!',
  '7': '🔥 Неделя! Супер!',
  '14': '🌟 2 недели! Ты молодец!',
  '30': '🏆 Месяц! Невероятно!',
};

/**
 * Mood-based action suggestions
 */
const MOOD_SUGGESTIONS: Record<number, string[]> = {
  1: ['расслабляющие упражнения', 'дыхательные практики', 'связаться с поддержкой'],
  2: ['короткую релаксацию', 'записать мысли в дневник', 'прогулку'],
  3: ['дневник сна', 'челленджи на сегодня', 'упражнения'],
  4: ['дневник сна', 'челлендж дня', 'советы'],
  5: ['сохранить настроение в дневнике', 'челлендж дня', 'помочь другим'],
};

/**
 * Weekday names (Russian)
 */
const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];

// ==================== Helper Functions ====================

/**
 * Get current time of day
 */
function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();

  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/**
 * Get current Moscow hour
 */
function getMoscowHour(): number {
  const now = new Date();
  const moscowOffset = 3 * 60; // UTC+3
  const localOffset = now.getTimezoneOffset();
  const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60 * 1000);
  return moscowTime.getHours();
}

/**
 * Get random item from array
 */
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get streak message
 */
function getStreakMessage(streak: number): string {
  if (streak >= 30) return STREAK_MESSAGES['30'];
  if (streak >= 14) return STREAK_MESSAGES['14'];
  if (streak >= 7) return STREAK_MESSAGES['7'];
  if (streak >= 3) return STREAK_MESSAGES['3'];
  if (streak >= 1) return STREAK_MESSAGES['1'];
  return '';
}

// ==================== Service Implementation ====================

/**
 * Daily Greeting Service
 *
 * Generates personalized daily greetings with integrated mood check.
 * Supports context-aware messaging based on time, streak, and history.
 *
 * @example
 * ```typescript
 * const greeting = dailyGreeting.generate({
 *   userName: 'Анна',
 *   timeOfDay: 'morning',
 *   currentStreak: 5,
 *   hasPendingDiary: true,
 *   daysSinceLastActivity: 0,
 *   isFirstTimeToday: true,
 *   weekDay: 1,
 * });
 *
 * await ctx.reply(greeting.message, { reply_markup: greeting.keyboard });
 * ```
 */
export class DailyGreetingService {
  /**
   * Generate personalized daily greeting with mood check
   */
  generate(context: IGreetingContext): IDailyGreeting {
    const {
      userName,
      timeOfDay,
      currentStreak,
      lastMoodLevel,
      hasPendingDiary,
      daysSinceLastActivity,
      isFirstTimeToday,
      weekDay,
    } = context;

    // Build greeting message
    let message = this.buildGreetingMessage(userName, timeOfDay, weekDay);

    // Add streak info if relevant
    const streakMsg = getStreakMessage(currentStreak);
    if (streakMsg && isFirstTimeToday) {
      message += `\n\n${streakMsg}`;
    }

    // Add re-engagement message if returning after absence
    if (daysSinceLastActivity >= 3 && daysSinceLastActivity < 7) {
      message += '\n\nРады тебя видеть снова! Давай продолжим.';
    } else if (daysSinceLastActivity >= 7) {
      message += '\n\nС возвращением! Мы скучали.';
    }

    // Add mood check prompt
    const moodPrompt = randomFrom(MOOD_PROMPTS[timeOfDay]);
    message += `\n\n*${moodPrompt}*`;

    // Build keyboard with mood options + suggested actions
    const keyboard = this.buildMoodKeyboard(context);

    return {
      message,
      keyboard,
      includesMoodCheck: true,
      suggestedAction: hasPendingDiary ? 'diary' : 'mood_week',
    };
  }

  /**
   * Generate simple greeting without mood check
   */
  generateSimple(userName?: string, timeOfDay?: TimeOfDay): string {
    const tod = timeOfDay ?? getTimeOfDay(getMoscowHour());
    const greetings = this.getGreetingsForTime(tod);
    const greeting = randomFrom(greetings);

    if (userName) {
      return `${greeting}, ${userName}! `;
    }
    return `${greeting}! `;
  }

  /**
   * Generate morning notification message
   * Designed for proactive push notifications
   */
  generateMorningNotification(
    userName?: string,
    streak?: number,
    hasPendingDiary?: boolean
  ): { message: string; keyboard: InlineKeyboard } {
    const greeting = this.generateSimple(userName, 'morning');

    let message = `${greeting}\n\nКак ты себя чувствуешь сегодня?`;

    // Add streak if present
    if (streak && streak > 0) {
      const streakMsg = getStreakMessage(streak);
      if (streakMsg) {
        message = `${greeting}${streakMsg}\n\nКак ты себя чувствуешь сегодня?`;
      }
    }

    // Build compact mood keyboard
    const keyboard = new InlineKeyboard()
      .text('😢', 'greeting:mood:1')
      .text('😕', 'greeting:mood:2')
      .text('😐', 'greeting:mood:3')
      .text('🙂', 'greeting:mood:4')
      .text('😊', 'greeting:mood:5')
      .row();

    // Add action buttons based on context
    if (hasPendingDiary) {
      keyboard.text('📓 Дневник сна', 'cmd:diary');
    } else {
      keyboard.text('📈 Моя неделя', 'hub:mood_week');
    }

    return { message, keyboard };
  }

  /**
   * Generate evening notification message
   */
  generateEveningNotification(
    userName?: string,
    hasPendingDiary?: boolean
  ): { message: string; keyboard: InlineKeyboard } {
    const greeting = this.generateSimple(userName, 'evening');

    let message = `${greeting}\n\nКак прошел твой день?`;

    if (hasPendingDiary) {
      message += '\n\nНе забудь заполнить дневник сна!';
    }

    // Compact mood check
    const keyboard = new InlineKeyboard()
      .text('😢', 'greeting:mood:1')
      .text('😕', 'greeting:mood:2')
      .text('😐', 'greeting:mood:3')
      .text('🙂', 'greeting:mood:4')
      .text('😊', 'greeting:mood:5')
      .row()
      .text('📓 Заполнить дневник', 'cmd:diary')
      .row()
      .text('📱 Меню', 'hub:back');

    return { message, keyboard };
  }

  /**
   * Generate response based on mood level selected
   */
  generateMoodResponse(moodLevel: number, userName?: string): string {
    const name = userName ? `, ${userName}` : '';

    switch (moodLevel) {
      case 1:
        return `Понимаю${name}, что сейчас тяжело. Я здесь, чтобы помочь.\n\n` +
          'Может, попробуем расслабляющее упражнение?';

      case 2:
        return `Бывают такие дни${name}. Давай попробуем что-то сделать вместе.\n\n` +
          'Может, записать мысли или сделать пару глубоких вдохов?';

      case 3:
        return `Нормально — тоже хорошо${name}!\n\n` +
          'Может, сегодня попробуем что-то новое?';

      case 4:
        return `Отлично${name}! Приятно это слышать.\n\n` +
          'Готов продолжать работу над сном?';

      case 5:
        return `Замечательно${name}! Рад за тебя!\n\n` +
          'Сохраним это настроение в дневнике?';

      default:
        return 'Спасибо, что поделился.';
    }
  }

  /**
   * Get suggestions based on mood level
   */
  getMoodSuggestions(moodLevel: number): string[] {
    return MOOD_SUGGESTIONS[moodLevel] || MOOD_SUGGESTIONS[3];
  }

  /**
   * Get current time of day
   */
  getCurrentTimeOfDay(): TimeOfDay {
    return getTimeOfDay(getMoscowHour());
  }

  /**
   * Build greeting message
   */
  private buildGreetingMessage(
    userName: string | undefined,
    timeOfDay: TimeOfDay,
    weekDay: number
  ): string {
    const greetings = this.getGreetingsForTime(timeOfDay);
    const greeting = randomFrom(greetings);

    let message = userName ? `${greeting}, *${userName}*!` : `${greeting}!`;

    // Add weekday context for Mondays and Fridays
    if (weekDay === 1) {
      message += ' Начинаем новую неделю!';
    } else if (weekDay === 5) {
      message += ' Скоро выходные!';
    }

    return message;
  }

  /**
   * Get greetings for time of day
   */
  private getGreetingsForTime(timeOfDay: TimeOfDay): readonly string[] {
    switch (timeOfDay) {
      case 'morning':
        return MORNING_GREETINGS;
      case 'afternoon':
        return AFTERNOON_GREETINGS;
      case 'evening':
        return EVENING_GREETINGS;
      case 'night':
        return NIGHT_GREETINGS;
    }
  }

  /**
   * Build mood check keyboard with context-aware actions
   */
  private buildMoodKeyboard(context: IGreetingContext): InlineKeyboard {
    const kb = new InlineKeyboard();

    // Row 1: Mood emoji slider (5 options)
    kb.text('😢', 'greeting:mood:1')
      .text('😕', 'greeting:mood:2')
      .text('😐', 'greeting:mood:3')
      .text('🙂', 'greeting:mood:4')
      .text('😊', 'greeting:mood:5')
      .row();

    // Row 2: Primary actions based on context
    if (context.hasPendingDiary) {
      kb.text('📓 Дневник сна', 'cmd:diary')
        .text('📈 Неделя', 'hub:mood_week')
        .row();
    } else {
      kb.text('📈 Моя неделя', 'hub:mood_week')
        .text('🎯 Челленджи', 'cmd:challenges')
        .row();
    }

    // Row 3: Menu access
    kb.text('📱 Меню', 'hub:back');

    return kb;
  }
}

// ==================== Singleton Export ====================

/** Shared instance */
export const dailyGreeting = new DailyGreetingService();

export default DailyGreetingService;
