/**
 * Соня - Virtual Sleep Expert Persona
 * ====================================
 * Character-based engagement system inspired by Sleepio's "The Prof".
 *
 * Research basis:
 * - Sleepio's "The Prof" reduces dropout from 33-49% to 12-20% (PMC 7999422)
 * - Character described as "smart but not condescending, enthusiastic but not overly optimistic"
 * - Animated character with consistent personality increases trust
 * - Personification improves therapeutic alliance in digital interventions
 *
 * Соня characteristics:
 * - Warm, supportive sleep expert
 * - Uses gentle humor
 * - Evidence-based but accessible language
 * - Adapts tone to user's emotional state (sentiment-aware)
 * - Russian-speaking with cultural sensitivity
 *
 * @packageDocumentation
 * @module @sleepcore/bot/persona
 */

import type { TimeOfDay } from '../commands/registry';

// ==================== Types ====================

/**
 * User emotional state for adaptive responses
 * Based on emotion-aware UI research (Grocito 2025)
 */
export type EmotionalState =
  | 'neutral'
  | 'positive'
  | 'tired'
  | 'frustrated'
  | 'anxious'
  | 'hopeful'
  | 'discouraged';

/**
 * Therapy context for personalized messages
 */
export interface ITherapyContext {
  /** Current therapy week (0-8) */
  week: number;
  /** User's sleep efficiency trend */
  sleepEfficiencyTrend: 'improving' | 'stable' | 'declining';
  /** Days since last diary entry */
  daysSinceLastDiary: number;
  /** User's detected emotional state */
  emotionalState: EmotionalState;
  /** Time of day */
  timeOfDay: TimeOfDay;
  /** User's name */
  userName?: string;
}

/**
 * Persona message with optional emoji and formatting
 */
export interface IPersonaMessage {
  /** Main message text */
  text: string;
  /** Emoji prefix */
  emoji: string;
  /** Whether message is from Соня directly */
  isFromSonya: boolean;
  /** Encouragement level (0-1) */
  encouragementLevel: number;
}

// ==================== Sonya's Personality Traits ====================

/**
 * Соня's core personality traits
 * Based on Sleepio's Prof: "smart but not condescending"
 */
const PERSONALITY = {
  /** Name */
  name: 'Соня',

  /** Emoji representation */
  emoji: '🦉',

  /** Core traits */
  traits: {
    warmth: 0.8,        // High warmth
    expertise: 0.9,     // High expertise
    humor: 0.5,         // Moderate humor
    directness: 0.7,    // Fairly direct
    encouragement: 0.8, // High encouragement
  },

  /** Voice characteristics */
  voice: {
    formality: 'informal-professional', // Like a friendly expert
    pronoun: 'ты',                      // Informal Russian "you"
    signature: '🦉 Соня',               // Message signature
  },
} as const;

// ==================== Time-Based Greetings ====================

/**
 * Greetings by time of day
 */
const GREETINGS: Record<TimeOfDay, string[]> = {
  morning: [
    'Доброе утро! ☀️',
    'С добрым утром! 🌅',
    'Утро доброе! Как спалось? 🌤️',
    'Привет! Новый день — новые возможности! 🌻',
  ],
  day: [
    'Привет! 👋',
    'Добрый день! ☀️',
    'Рада тебя видеть! 😊',
    'Как дела? 💙',
  ],
  evening: [
    'Добрый вечер! 🌆',
    'Вечер добрый! 🌙',
    'Привет! Как прошёл день? 🌇',
    'Рада тебя видеть вечером! 💜',
  ],
  night: [
    'Доброй ночи... 🌙',
    'Ещё не спишь? 🦉',
    'Ночь — время для отдыха 🌌',
    'Привет, полуночник! 🌠',
  ],
};

// ==================== Emotional Responses ====================

/**
 * Empathetic responses based on detected emotional state
 * Research: emotion-aware UI increases retention by 35% (Grocito)
 */
const EMOTIONAL_RESPONSES: Record<EmotionalState, string[]> = {
  neutral: [
    'Отлично, давай продолжим!',
    'Хорошо, двигаемся дальше.',
    'Готов продолжить?',
  ],
  positive: [
    'Здорово! Твой настрой вдохновляет! 🌟',
    'Отличное настроение — это половина успеха! ✨',
    'Рада видеть тебя в хорошем расположении духа! 😊',
  ],
  tired: [
    'Понимаю, усталость — это тяжело. Давай сделаем что-то простое. 💙',
    'Когда устал, даже маленький шаг — это победа. 🌱',
    'Отдых тоже часть терапии. Не будем торопиться. 🐢',
  ],
  frustrated: [
    'Я слышу твоё разочарование. Это нормально — путь к лучшему сну не всегда прямой. 💪',
    'Фрустрация — знак того, что тебе небезразлично. Это хорошо! 🌈',
    'Сложные моменты бывают у всех. Давай разберёмся вместе. 🤝',
  ],
  anxious: [
    'Тревога перед сном — частый спутник инсомнии. Ты не один(а). 🤗',
    'Давай сначала успокоимся. Глубокий вдох... 🧘',
    'Беспокойство уходит, когда мы работаем над ним. Шаг за шагом. 🌊',
  ],
  hopeful: [
    'Люблю этот настрой! Надежда — мощный мотиватор. 🌟',
    'Твоя вера в успех — уже часть решения! ✨',
    'С таким настроем всё получится! 💫',
  ],
  discouraged: [
    'Понимаю, что сейчас непросто. Но каждый маленький шаг важен. 🌱',
    'Знаешь, 78% людей с инсомнией улучшают сон с КПТ-И. Ты справишься! 📊',
    'Даже когда кажется, что прогресса нет — он есть. Мозг перестраивается постепенно. 🧠',
  ],
};

// ==================== Therapy Phase Messages ====================

/**
 * Encouragement messages by therapy week
 */
const WEEK_MESSAGES: Record<number, string[]> = {
  0: [
    'Добро пожаловать! Первый шаг — самый важный. 🎯',
    'Рада, что ты здесь. Вместе мы улучшим твой сон! 🌙',
  ],
  1: [
    'Первая неделя — время адаптации. Ты молодец, что начал(а)! 💪',
    'Дневник сна — твой главный инструмент сейчас. Продолжай! 📔',
  ],
  2: [
    'Две недели! Уже видим паттерны в твоём сне. 📊',
    'Ты набираешь обороты. Продолжай в том же духе! 🚀',
  ],
  3: [
    'Три недели — переломный момент. Многие начинают чувствовать улучшения. 🌟',
    'Половина пути! Твоя настойчивость впечатляет. 💯',
  ],
  4: [
    'Четыре недели! Исследования показывают: эффект КПТ-И начинает проявляться. 📈',
    'Ты уже ветеран! Скоро заметишь серьёзные изменения. 🏆',
  ],
  5: [
    'Пять недель упорной работы. Ты — звезда! ⭐',
    'Финишная прямая! Закрепляем результаты. 🎯',
  ],
  6: [
    'Шесть недель — полный курс КПТ-И! Невероятно! 🎉',
    'Ты прошёл(а) весь путь. Это заслуживает уважения! 🏅',
  ],
  7: [
    'Теперь ты эксперт по своему сну. Поддерживай достигнутое! 🌙',
    'Фаза поддержки. Твои новые привычки становятся второй натурой. 💎',
  ],
  8: [
    'Восемь недель! Ты — пример для подражания. 🌟',
    'Выпускник SleepCore! Сон больше не проблема. 🎓',
  ],
};

// ==================== Sonya Persona Class ====================

/**
 * Соня - Virtual Sleep Expert
 * Provides personalized, emotionally-aware therapeutic messages
 */
export class SonyaPersona {
  private random(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get Sonya's name
   */
  get name(): string {
    return PERSONALITY.name;
  }

  /**
   * Get Sonya's emoji
   */
  get emoji(): string {
    return PERSONALITY.emoji;
  }

  /**
   * Generate greeting based on time and context
   */
  greet(context: Partial<ITherapyContext>): IPersonaMessage {
    const timeOfDay = context.timeOfDay || 'day';
    const greeting = this.random(GREETINGS[timeOfDay]);
    const userName = context.userName;

    let text = greeting;
    if (userName) {
      // Insert name naturally
      if (text.includes('!')) {
        text = text.replace('!', `, ${userName}!`);
      } else {
        text = `${text}, ${userName}`;
      }
    }

    return {
      text,
      emoji: PERSONALITY.emoji,
      isFromSonya: true,
      encouragementLevel: PERSONALITY.traits.encouragement,
    };
  }

  /**
   * Generate empathetic response based on emotional state
   * Research: emotion-aware responses increase retention 35%
   */
  respondToEmotion(state: EmotionalState): IPersonaMessage {
    const response = this.random(EMOTIONAL_RESPONSES[state]);

    return {
      text: response,
      emoji: this.getEmotionEmoji(state),
      isFromSonya: true,
      encouragementLevel: this.getEncouragementForEmotion(state),
    };
  }

  /**
   * Generate week-specific encouragement
   */
  encourageByWeek(week: number): IPersonaMessage {
    const clampedWeek = Math.min(Math.max(week, 0), 8);
    const messages = WEEK_MESSAGES[clampedWeek] || WEEK_MESSAGES[8];
    const text = this.random(messages);

    return {
      text,
      emoji: PERSONALITY.emoji,
      isFromSonya: true,
      encouragementLevel: 0.8,
    };
  }

  /**
   * Generate personalized message combining all context
   */
  generateMessage(context: ITherapyContext): string {
    const greeting = this.greet(context);
    const emotionResponse = this.respondToEmotion(context.emotionalState);
    const weekMessage = this.encourageByWeek(context.week);

    // Combine messages naturally
    let message = `${PERSONALITY.emoji} *${PERSONALITY.name}*\n\n`;
    message += `${greeting.text}\n\n`;

    // Add emotional response if not neutral
    if (context.emotionalState !== 'neutral') {
      message += `${emotionResponse.text}\n\n`;
    }

    // Add week encouragement periodically (not every message)
    if (context.daysSinceLastDiary >= 1 || context.week === 0) {
      message += `_${weekMessage.text}_`;
    }

    return message;
  }

  /**
   * Format message with Sonya's signature
   */
  sign(message: string): string {
    return `${message}\n\n— ${PERSONALITY.voice.signature}`;
  }

  /**
   * Wrap any message as from Sonya
   */
  say(text: string): string {
    return `${PERSONALITY.emoji} *${PERSONALITY.name}:* ${text}`;
  }

  /**
   * Generate tip with Sonya's voice
   */
  tip(text: string): string {
    return `${PERSONALITY.emoji} _Совет от Сони:_ ${text}`;
  }

  /**
   * Generate encouragement after completing task
   */
  celebrate(achievement: string): string {
    const celebrations = [
      `🎉 Отлично! ${achievement}`,
      `✨ Молодец! ${achievement}`,
      `🌟 Супер! ${achievement}`,
      `💪 Так держать! ${achievement}`,
    ];
    return `${PERSONALITY.emoji} ${this.random(celebrations)}`;
  }

  /**
   * Generate gentle reminder
   */
  remind(task: string): string {
    const reminders = [
      `Не забудь: ${task} 📝`,
      `Напоминаю: ${task} ⏰`,
      `Когда будет минутка: ${task} 💙`,
    ];
    return `${PERSONALITY.emoji} _${this.random(reminders)}_`;
  }

  /**
   * Get emoji for emotional state
   */
  private getEmotionEmoji(state: EmotionalState): string {
    const emojis: Record<EmotionalState, string> = {
      neutral: '💙',
      positive: '🌟',
      tired: '🌙',
      frustrated: '💪',
      anxious: '🤗',
      hopeful: '✨',
      discouraged: '🌱',
    };
    return emojis[state];
  }

  /**
   * Get encouragement level for emotional state
   */
  private getEncouragementForEmotion(state: EmotionalState): number {
    const levels: Record<EmotionalState, number> = {
      neutral: 0.5,
      positive: 0.7,
      tired: 0.6,
      frustrated: 0.9,
      anxious: 0.8,
      hopeful: 0.6,
      discouraged: 0.95,
    };
    return levels[state];
  }
}

// ==================== Singleton Export ====================

/**
 * Global Sonya persona instance
 */
export const sonya = new SonyaPersona();

export default sonya;
