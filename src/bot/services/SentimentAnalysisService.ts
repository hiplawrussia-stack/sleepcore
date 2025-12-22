/**
 * Sentiment Analysis Service
 * ==========================
 * Emotion-aware text analysis for adaptive UI responses.
 *
 * Research basis (2025):
 * - Emotion-aware UI increases retention by 35% (Grocito)
 * - State-of-art models achieve 92% accuracy (Medium 2025)
 * - Woebot uses rule-based CBT patterns (PMC studies)
 * - Sarcasm and mixed emotions remain difficult (~15% error rate)
 *
 * Implementation:
 * - Rule-based keyword matching (like Woebot)
 * - Emoji sentiment detection
 * - Punctuation intensity analysis
 * - Time-of-day context weighting
 * - Russian language support
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { EmotionalState } from '../persona';
import type { TimeOfDay } from '../commands/registry';

// ==================== Types ====================

/**
 * Sentiment analysis result
 */
export interface ISentimentResult {
  /** Primary detected emotion */
  primaryEmotion: EmotionalState;
  /** Confidence score (0-1) */
  confidence: number;
  /** Secondary emotions detected */
  secondaryEmotions: EmotionalState[];
  /** Sentiment valence (-1 to 1) */
  valence: number;
  /** Arousal/intensity level (0-1) */
  arousal: number;
  /** Keywords that triggered detection */
  triggerKeywords: string[];
  /** Is this a crisis/urgent message? */
  isCrisis: boolean;
}

/**
 * Analysis context
 */
export interface IAnalysisContext {
  timeOfDay: TimeOfDay;
  daysSinceLastInteraction: number;
  previousEmotion?: EmotionalState;
  therapyWeek: number;
}

// ==================== Keyword Dictionaries ====================

/**
 * Russian keywords by emotional state
 * Based on CBT-I common expressions and sleep-related vocabulary
 */
const EMOTION_KEYWORDS: Record<EmotionalState, string[]> = {
  positive: [
    // Positive words
    'хорошо', 'отлично', 'супер', 'класс', 'здорово', 'прекрасно',
    'замечательно', 'великолепно', 'чудесно', 'рад', 'рада', 'счастлив',
    'доволен', 'довольна', 'ура', 'йес', 'да!', 'получилось', 'удалось',
    'выспался', 'выспалась', 'спал хорошо', 'спала хорошо', 'бодрый',
    'бодрая', 'энергия', 'сила', 'лучше', 'улучшение', 'прогресс',
  ],

  tired: [
    // Fatigue words
    'устал', 'устала', 'усталость', 'измотан', 'измотана', 'разбит',
    'разбита', 'вымотан', 'вымотана', 'сил нет', 'нет сил', 'еле',
    'сонный', 'сонная', 'хочу спать', 'засыпаю', 'клонит в сон',
    'недосып', 'не выспался', 'не выспалась', 'мало спал', 'мало спала',
    'разбитый', 'разбитая', 'тяжело', 'лень', 'апатия',
  ],

  frustrated: [
    // Frustration words
    'раздражен', 'раздражена', 'раздражает', 'бесит', 'злит', 'злюсь',
    'надоело', 'достало', 'хватит', 'не работает', 'не помогает',
    'бесполезно', 'зря', 'впустую', 'разочарован', 'разочарована',
    'не понимаю', 'почему', 'опять', 'снова', 'сколько можно',
    'ненавижу', 'терпеть не могу', 'блин', 'черт', 'жесть',
  ],

  anxious: [
    // Anxiety words
    'тревога', 'тревожно', 'беспокоюсь', 'волнуюсь', 'переживаю',
    'страшно', 'боюсь', 'паника', 'нервничаю', 'нервы', 'стресс',
    'напряжен', 'напряжена', 'не могу расслабиться', 'мысли крутятся',
    'не могу уснуть', 'лежу и думаю', 'голова не отключается',
    'сердце', 'дыхание', 'потею', 'дрожу', 'тошнит',
  ],

  hopeful: [
    // Hope words
    'надеюсь', 'надежда', 'верю', 'получится', 'справлюсь', 'смогу',
    'попробую', 'буду стараться', 'хочу', 'мотивация', 'цель',
    'план', 'решил', 'решила', 'начинаю', 'пробую', 'эксперимент',
    'интересно', 'любопытно', 'может быть', 'вдруг', 'посмотрим',
  ],

  discouraged: [
    // Discouragement words
    'не могу', 'не получается', 'бессмысленно', 'безнадежно', 'сдаюсь',
    'хочу бросить', 'зачем', 'смысл', 'толку', 'ничего не меняется',
    'всё так же', 'хуже', 'ухудшение', 'откат', 'провал', 'неудача',
    'плохо', 'ужасно', 'кошмар', 'депрессия', 'грустно', 'печально',
    'одиноко', 'никто не понимает', 'устал от всего',
  ],

  neutral: [
    // Neutral/informational
    'ок', 'окей', 'понял', 'поняла', 'ясно', 'хорошо', 'ладно',
    'да', 'нет', 'может', 'наверное', 'возможно', 'думаю',
    'вопрос', 'как', 'что', 'когда', 'сколько', 'информация',
  ],
};

/**
 * Crisis keywords that require immediate attention
 */
const CRISIS_KEYWORDS = [
  'суицид', 'самоубийство', 'покончить', 'не хочу жить', 'конец',
  'умереть', 'смерть', 'убить себя', 'порезы', 'таблетки выпить',
  'прыгнуть', 'повеситься', 'больше не могу', 'невыносимо',
];

/**
 * Emoji sentiment mapping
 */
const EMOJI_SENTIMENT: Record<string, { emotion: EmotionalState; weight: number }> = {
  // Positive
  '😊': { emotion: 'positive', weight: 0.7 },
  '😄': { emotion: 'positive', weight: 0.8 },
  '🙂': { emotion: 'positive', weight: 0.5 },
  '❤️': { emotion: 'positive', weight: 0.7 },
  '💪': { emotion: 'hopeful', weight: 0.6 },
  '✨': { emotion: 'positive', weight: 0.6 },
  '🎉': { emotion: 'positive', weight: 0.8 },
  '👍': { emotion: 'positive', weight: 0.5 },

  // Tired
  '😴': { emotion: 'tired', weight: 0.9 },
  '🥱': { emotion: 'tired', weight: 0.8 },
  '😪': { emotion: 'tired', weight: 0.7 },
  '💤': { emotion: 'tired', weight: 0.6 },

  // Frustrated
  '😤': { emotion: 'frustrated', weight: 0.8 },
  '😡': { emotion: 'frustrated', weight: 0.9 },
  '🤬': { emotion: 'frustrated', weight: 0.95 },
  '😠': { emotion: 'frustrated', weight: 0.7 },

  // Anxious
  '😰': { emotion: 'anxious', weight: 0.8 },
  '😨': { emotion: 'anxious', weight: 0.7 },
  '😱': { emotion: 'anxious', weight: 0.9 },
  '🥺': { emotion: 'anxious', weight: 0.5 },

  // Discouraged
  '😢': { emotion: 'discouraged', weight: 0.7 },
  '😭': { emotion: 'discouraged', weight: 0.9 },
  '😞': { emotion: 'discouraged', weight: 0.6 },
  '😔': { emotion: 'discouraged', weight: 0.6 },
  '💔': { emotion: 'discouraged', weight: 0.7 },
};

// ==================== Sentiment Analysis Service ====================

/**
 * Sentiment Analysis Service
 * Rule-based emotion detection for Russian text
 */
export class SentimentAnalysisService {
  /**
   * Analyze text sentiment
   */
  analyze(text: string, context?: Partial<IAnalysisContext>): ISentimentResult {
    const normalizedText = text.toLowerCase().trim();

    // Check for crisis first
    const isCrisis = this.detectCrisis(normalizedText);
    if (isCrisis) {
      return this.createCrisisResult(normalizedText);
    }

    // Analyze keywords
    const keywordScores = this.analyzeKeywords(normalizedText);

    // Analyze emojis
    const emojiScores = this.analyzeEmojis(text);

    // Analyze punctuation intensity
    const intensity = this.analyzeIntensity(text);

    // Combine scores
    const combinedScores = this.combineScores(keywordScores, emojiScores, intensity);

    // Apply context weighting
    const contextWeighted = this.applyContextWeighting(combinedScores, context);

    // Determine primary emotion
    const sortedEmotions = Object.entries(contextWeighted)
      .sort(([, a], [, b]) => b - a);

    const primaryEmotion = (sortedEmotions[0]?.[0] || 'neutral') as EmotionalState;
    const confidence = sortedEmotions[0]?.[1] || 0.5;

    // Get secondary emotions (score > 0.3)
    const secondaryEmotions = sortedEmotions
      .slice(1)
      .filter(([, score]) => score > 0.3)
      .map(([emotion]) => emotion as EmotionalState);

    // Calculate valence and arousal
    const valence = this.calculateValence(primaryEmotion, confidence);
    const arousal = this.calculateArousal(primaryEmotion, intensity);

    // Collect trigger keywords
    const triggerKeywords = this.findTriggerKeywords(normalizedText, primaryEmotion);

    return {
      primaryEmotion,
      confidence: Math.min(confidence, 1),
      secondaryEmotions,
      valence,
      arousal,
      triggerKeywords,
      isCrisis: false,
    };
  }

  /**
   * Quick emotion check without full analysis
   */
  quickCheck(text: string): EmotionalState {
    return this.analyze(text).primaryEmotion;
  }

  /**
   * Detect crisis keywords
   */
  private detectCrisis(text: string): boolean {
    return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));
  }

  /**
   * Create crisis result
   */
  private createCrisisResult(text: string): ISentimentResult {
    const triggerKeywords = CRISIS_KEYWORDS.filter((kw) => text.includes(kw));

    return {
      primaryEmotion: 'discouraged',
      confidence: 1.0,
      secondaryEmotions: ['anxious'],
      valence: -1.0,
      arousal: 1.0,
      triggerKeywords,
      isCrisis: true,
    };
  }

  /**
   * Analyze keyword-based emotions
   */
  private analyzeKeywords(text: string): Record<EmotionalState, number> {
    const scores: Record<EmotionalState, number> = {
      neutral: 0.3, // Base neutral score
      positive: 0,
      tired: 0,
      frustrated: 0,
      anxious: 0,
      hopeful: 0,
      discouraged: 0,
    };

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          scores[emotion as EmotionalState] += 0.2;
        }
      }
    }

    return scores;
  }

  /**
   * Analyze emoji-based emotions
   */
  private analyzeEmojis(text: string): Record<EmotionalState, number> {
    const scores: Record<EmotionalState, number> = {
      neutral: 0,
      positive: 0,
      tired: 0,
      frustrated: 0,
      anxious: 0,
      hopeful: 0,
      discouraged: 0,
    };

    for (const [emoji, data] of Object.entries(EMOJI_SENTIMENT)) {
      if (text.includes(emoji)) {
        scores[data.emotion] += data.weight;
      }
    }

    return scores;
  }

  /**
   * Analyze punctuation intensity
   */
  private analyzeIntensity(text: string): number {
    let intensity = 0;

    // Multiple exclamation marks
    const exclamations = (text.match(/!+/g) || []).join('').length;
    intensity += Math.min(exclamations * 0.1, 0.3);

    // Multiple question marks
    const questions = (text.match(/\?+/g) || []).join('').length;
    intensity += Math.min(questions * 0.05, 0.15);

    // CAPS detection (Russian and Latin)
    const capsRatio = (text.match(/[A-ZА-ЯЁ]/g) || []).length / Math.max(text.length, 1);
    if (capsRatio > 0.5 && text.length > 5) {
      intensity += 0.3;
    }

    // Ellipsis (often indicates uncertainty/sadness in Russian)
    if (text.includes('...')) {
      intensity += 0.1;
    }

    return Math.min(intensity, 1);
  }

  /**
   * Combine different score sources
   */
  private combineScores(
    keywords: Record<EmotionalState, number>,
    emojis: Record<EmotionalState, number>,
    intensity: number
  ): Record<EmotionalState, number> {
    const combined: Record<EmotionalState, number> = {
      neutral: 0,
      positive: 0,
      tired: 0,
      frustrated: 0,
      anxious: 0,
      hopeful: 0,
      discouraged: 0,
    };

    for (const emotion of Object.keys(combined) as EmotionalState[]) {
      // Weight: keywords 60%, emojis 30%, intensity boost 10%
      const keywordScore = keywords[emotion] || 0;
      const emojiScore = emojis[emotion] || 0;

      combined[emotion] = keywordScore * 0.6 + emojiScore * 0.3;

      // Intensity boosts negative emotions
      if (['frustrated', 'anxious', 'discouraged'].includes(emotion)) {
        combined[emotion] += intensity * 0.1;
      }
    }

    return combined;
  }

  /**
   * Apply context weighting
   */
  private applyContextWeighting(
    scores: Record<EmotionalState, number>,
    context?: Partial<IAnalysisContext>
  ): Record<EmotionalState, number> {
    if (!context) return scores;

    const weighted = { ...scores };

    // Time of day affects baseline
    if (context.timeOfDay === 'night') {
      weighted.tired += 0.1;
      weighted.anxious += 0.05;
    } else if (context.timeOfDay === 'morning') {
      weighted.tired += 0.05;
    }

    // Long absence suggests potential disengagement
    if (context.daysSinceLastInteraction && context.daysSinceLastInteraction > 7) {
      weighted.discouraged += 0.1;
    }

    // Early therapy weeks: more anxiety expected
    if (context.therapyWeek !== undefined && context.therapyWeek < 2) {
      weighted.anxious += 0.05;
    }

    return weighted;
  }

  /**
   * Calculate emotional valence (-1 to 1)
   */
  private calculateValence(emotion: EmotionalState, confidence: number): number {
    const valenceMap: Record<EmotionalState, number> = {
      positive: 0.8,
      hopeful: 0.5,
      neutral: 0,
      tired: -0.3,
      frustrated: -0.6,
      anxious: -0.5,
      discouraged: -0.8,
    };

    return valenceMap[emotion] * confidence;
  }

  /**
   * Calculate arousal level (0-1)
   */
  private calculateArousal(emotion: EmotionalState, intensity: number): number {
    const arousalMap: Record<EmotionalState, number> = {
      positive: 0.6,
      hopeful: 0.5,
      neutral: 0.3,
      tired: 0.2,
      frustrated: 0.8,
      anxious: 0.9,
      discouraged: 0.4,
    };

    return Math.min(arousalMap[emotion] + intensity * 0.2, 1);
  }

  /**
   * Find keywords that triggered detection
   */
  private findTriggerKeywords(text: string, emotion: EmotionalState): string[] {
    const keywords = EMOTION_KEYWORDS[emotion] || [];
    return keywords.filter((kw) => text.includes(kw)).slice(0, 5);
  }
}

// ==================== Singleton Export ====================

export const sentimentAnalysis = new SentimentAnalysisService();

export default sentimentAnalysis;
