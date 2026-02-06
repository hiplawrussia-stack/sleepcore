/**
 * CognitiveRestructuringEngine - Cognitive Restructuring Implementation
 * ======================================================================
 * Implements cognitive therapy techniques based on Beck (1979) and
 * Morin's cognitive model of insomnia.
 *
 * Enhanced with emotional component following Beck's CBT model:
 * Situation → Automatic Thought → Emotion → Behavior
 *
 * Targets dysfunctional beliefs about sleep using:
 * - Socratic questioning
 * - Behavioral experiments
 * - Evidence review
 * - Decatastrophizing
 * - Probability estimation
 *
 * Common dysfunctional beliefs addressed:
 * - "I need 8 hours or I can't function"
 * - "Missing sleep will damage my health"
 * - "I have no control over my sleep"
 * - "I must stay in bed to catch up on sleep"
 *
 * Scientific basis for emotional component:
 * - Beck (1976) Cognitive Therapy and the Emotional Disorders
 * - Harvey (2002) Cognitive model of insomnia
 * - JAMA Network Open (2025) Emotional processing in dCBT-I
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  ICognitiveRestructuringEngine,
  IDysfunctionalBelief,
  ICognitiveImprovementResult,
  ICognitiveProgressReport,
  ICognitiveProgressRow,
  SleepRelatedEmotion,
} from '../interfaces/ICBTIComponents';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * Common dysfunctional belief patterns with detection keywords
 */
const BELIEF_PATTERNS = {
  expectations: {
    keywords: ['8 часов', 'нужно спать', 'должен спать', 'не высплюсь', 'минимум', 'обязательно'],
    beliefs: [
      'Мне нужно спать 8 часов, иначе я не смогу нормально функционировать',
      'Если я не высплюсь, завтра будет ужасный день',
      'Нормальные люди засыпают сразу, а я — нет',
    ],
  },
  consequences: {
    keywords: ['здоровье', 'заболею', 'умру', 'разрушит', 'катастрофа', 'невозможно'],
    beliefs: [
      'Недостаток сна разрушает моё здоровье',
      'Если я не высплюсь, я не смогу работать вообще',
      'Бессонница приведёт к серьёзным заболеваниям',
    ],
  },
  control: {
    keywords: ['не могу', 'не получается', 'бесполезно', 'ничего не помогает', 'сломался'],
    beliefs: [
      'Я не контролирую свой сон',
      'Мой сон сломан и это нельзя исправить',
      'Что бы я ни делал, это не поможет',
    ],
  },
  medication: {
    keywords: ['таблетки', 'снотворное', 'препараты', 'без лекарств'],
    beliefs: [
      'Без снотворного я не смогу уснуть',
      'Мне нужны таблетки чтобы нормально спать',
      'Естественный сон для меня невозможен',
    ],
  },
  causes: {
    keywords: ['стресс', 'работа', 'гены', 'наследственность', 'характер'],
    beliefs: [
      'Моя бессонница — это моя судьба',
      'У меня генетическая предрасположенность к плохому сну',
      'Пока есть стресс, я не смогу нормально спать',
    ],
  },
};

/**
 * Socratic questions templates by belief category
 */
const SOCRATIC_QUESTIONS: Record<string, string[]> = {
  expectations: [
    'Какие доказательства того, что вам нужно именно 8 часов сна?',
    'Были ли случаи, когда вы спали меньше, но всё равно справлялись с днём?',
    'Откуда взялось это убеждение про 8 часов?',
    'Как вы думаете, все ли люди нуждаются в одинаковом количестве сна?',
    'Что самое худшее, что случилось, когда вы не выспались?',
  ],
  consequences: [
    'Насколько вероятно, что одна бессонная ночь серьёзно повредит вашему здоровью?',
    'Были ли у вас бессонные ночи раньше? Что происходило потом?',
    'Знаете ли вы людей, которые иногда плохо спят, но остаются здоровыми?',
    'Что говорит наука о последствиях случайных нарушений сна?',
    'Как ваше тело обычно восстанавливается после плохой ночи?',
  ],
  control: [
    'Есть ли хоть что-то в вашем сне, что вы можете контролировать?',
    'Бывали ли периоды, когда вы спали лучше? Что тогда было по-другому?',
    'Если бы вы совсем не контролировали сон, почему иногда вы спите хорошо?',
    'Какие конкретные действия вы уже пробовали?',
    'Что бы вы посоветовали другу с такой же проблемой?',
  ],
  medication: [
    'Спали ли вы когда-нибудь хорошо без лекарств?',
    'Что происходит с вашим сном, когда вы не принимаете снотворное?',
    'Какие ещё способы улучшить сон вы пробовали?',
    'Знаете ли вы о побочных эффектах длительного приёма снотворных?',
    'Как вы представляете себе жизнь без зависимости от препаратов?',
  ],
  causes: [
    'Всегда ли у вас были проблемы со сном?',
    'Если бессонница генетическая, почему она началась именно сейчас?',
    'Знаете ли вы людей со стрессом, которые при этом хорошо спят?',
    'Что изменилось в вашей жизни, когда начались проблемы со сном?',
    'Если причина в генах, почему некоторые ночи лучше других?',
  ],
};

/**
 * Alternative balanced thoughts by category
 */
const ALTERNATIVE_THOUGHTS: Record<string, string[]> = {
  expectations: [
    'Потребность во сне индивидуальна. Некоторым людям достаточно 6-7 часов.',
    'Одна плохая ночь не определяет качество следующего дня. Тело адаптируется.',
    'Моё тело само знает, сколько сна ему нужно, и компенсирует дефицит.',
  ],
  consequences: [
    'Кратковременное недосыпание неприятно, но не опасно для здоровья.',
    'После плохой ночи я могу функционировать, хоть и не на максимуме.',
    'Тело обладает удивительной способностью к восстановлению.',
  ],
  control: [
    'Я не могу контролировать момент засыпания, но могу создать условия для сна.',
    'Мой сон реагирует на мои действия, значит, у меня есть влияние.',
    'Даже небольшие изменения в поведении могут улучшить сон.',
  ],
  medication: [
    'Снотворное — временная помощь, а не единственное решение.',
    'Мой мозг способен производить естественные химические вещества для сна.',
    'Многие люди преодолевают бессонницу без лекарств с помощью CBT-I.',
  ],
  causes: [
    'Стресс влияет на сон, но это влияние можно уменьшить.',
    'Бессонница — это выученная привычка, которую можно переучить.',
    'Даже если есть предрасположенность, поведение играет ключевую роль.',
  ],
};

/**
 * Mapping of belief categories to typical emotions
 *
 * Based on:
 * - Harvey (2002) cognitive model of insomnia
 * - Pre-Sleep Arousal Scale (PSAS) cognitive subscale
 * - Network analysis of insomnia-anxiety-depression symptoms (Nature 2025)
 *
 * @see https://www.nature.com/articles/s41598-025-09746-w
 */
const CATEGORY_EMOTION_MAP: Record<IDysfunctionalBelief['category'], SleepRelatedEmotion> = {
  expectations: 'anxiety',       // Anxiety about not meeting sleep requirements
  consequences: 'fear',          // Fear of catastrophic outcomes
  control: 'hopelessness',       // Helplessness about inability to control sleep
  medication: 'anxiety',         // Anxiety about dependence
  causes: 'frustration',         // Frustration about unchangeable factors
};

/**
 * Keywords that indicate specific emotions in user text
 *
 * Based on PSAS cognitive subscale and clinical CBT practice
 */
const EMOTION_KEYWORDS: Record<SleepRelatedEmotion, string[]> = {
  anxiety: ['тревога', 'волнуюсь', 'беспокоюсь', 'переживаю', 'нервничаю', 'страшно'],
  frustration: ['разочарован', 'устал', 'надоело', 'раздражает', 'бесит', 'достало'],
  hopelessness: ['безнадёжно', 'бесполезно', 'никогда', 'невозможно', 'сдаюсь', 'отчаяние'],
  fear: ['боюсь', 'страх', 'ужас', 'пугает', 'опасаюсь'],
  anger: ['злюсь', 'злость', 'гнев', 'бешусь', 'ненавижу', 'ярость'],
  worry: ['думаю', 'мысли', 'не могу перестать', 'кручу', 'зациклился', 'руминация'],
};

/**
 * Emotion intensity modifiers based on language intensity
 */
const INTENSITY_MODIFIERS: { keywords: string[]; modifier: number }[] = [
  { keywords: ['очень', 'сильно', 'ужасно', 'невыносимо', 'крайне'], modifier: 0.2 },
  { keywords: ['немного', 'слегка', 'чуть-чуть', 'иногда'], modifier: -0.2 },
];

/**
 * Cognitive Restructuring Engine
 */
export class CognitiveRestructuringEngine implements ICognitiveRestructuringEngine {
  /**
   * Identify dysfunctional beliefs from user text
   *
   * Enhanced with emotion detection following Beck's CBT model
   */
  identifyBeliefs(userText: string, sleepState: ISleepState): IDysfunctionalBelief[] {
    const beliefs: IDysfunctionalBelief[] = [];
    const lowerText = userText.toLowerCase();

    for (const [category, pattern] of Object.entries(BELIEF_PATTERNS)) {
      const matchingKeywords = pattern.keywords.filter((kw) =>
        lowerText.includes(kw.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        // Found matching category, identify specific belief
        const intensity = Math.min(0.5 + matchingKeywords.length * 0.15, 1);

        // Check cognitive state for existing beliefs
        const existingBeliefStrength = this.getExistingBeliefStrength(sleepState, category);

        // Detect emotion from text or infer from category
        const typedCategory = category as IDysfunctionalBelief['category'];
        const detectedEmotion = this.detectEmotionFromText(lowerText, typedCategory);
        const emotionIntensity = this.calculateEmotionIntensity(lowerText, intensity);

        beliefs.push({
          id: `belief_${category}_${Date.now()}`,
          category: typedCategory,
          belief: this.extractBestMatchingBelief(lowerText, pattern.beliefs),
          intensity: Math.max(intensity, existingBeliefStrength),
          frequency: 0.5, // Default, would need history for accurate value
          evidenceFor: [],
          evidenceAgainst: [],
          alternativeThought: '',
          isActive: true,
          // New emotional fields
          emotion: detectedEmotion,
          emotionIntensity: emotionIntensity,
        });
      }
    }

    return beliefs;
  }

  /**
   * Generate Socratic questions for a belief
   */
  generateSocraticQuestions(belief: IDysfunctionalBelief): string[] {
    const categoryQuestions = SOCRATIC_QUESTIONS[belief.category] || [];

    // Select 3-4 questions based on belief intensity
    const numQuestions = belief.intensity > 0.7 ? 4 : 3;
    const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, numQuestions);
  }

  /**
   * Generate alternative balanced thought
   */
  generateAlternativeThought(
    belief: IDysfunctionalBelief,
    evidence: { for: string[]; against: string[] }
  ): string {
    const categoryAlternatives = ALTERNATIVE_THOUGHTS[belief.category] || [];

    // If we have evidence against, use it to personalize
    if (evidence.against.length > 0) {
      // Combine the user's own counter-evidence with a template
      const template = categoryAlternatives[Math.floor(Math.random() * categoryAlternatives.length)];
      const userEvidence = evidence.against[0];

      return `${template} Вы сами заметили: "${userEvidence}"`;
    }

    // Otherwise, return a general alternative
    return categoryAlternatives[Math.floor(Math.random() * categoryAlternatives.length)];
  }

  /**
   * Design a behavioral experiment to test a belief
   */
  designExperiment(belief: IDysfunctionalBelief): {
    hypothesis: string;
    experiment: string;
    predictedOutcome: string;
    actualOutcome?: string;
  } {
    switch (belief.category) {
      case 'expectations':
        return {
          hypothesis: 'Если я посплю меньше 8 часов, я не смогу функционировать завтра.',
          experiment:
            'На этой неделе отметьте, как вы функционируете в дни после разного количества сна (6, 7, 8 часов).',
          predictedOutcome:
            'Запишите, что вы ожидаете: "После 6 часов сна я буду функционировать на ___%"',
        };

      case 'consequences':
        return {
          hypothesis: 'Плохой сон обязательно приведёт к плохому дню.',
          experiment:
            'После следующей плохой ночи оцените свой день по 10-балльной шкале. Сравните с днями после хорошего сна.',
          predictedOutcome: 'Ожидаемая оценка дня после плохой ночи: ___/10',
        };

      case 'control':
        return {
          hypothesis: 'Я не могу повлиять на свой сон.',
          experiment:
            'Выберите одно небольшое изменение (например, тусклый свет за час до сна) и применяйте 3 дня. Отметьте любые изменения.',
          predictedOutcome:
            'Ожидаемый эффект: "Это изменение повлияет/не повлияет на мой сон потому что..."',
        };

      case 'medication':
        return {
          hypothesis: 'Без снотворного я не смогу уснуть.',
          experiment:
            'С согласия врача, попробуйте одну ночь без препарата (или с половиной дозы). Запишите результат.',
          predictedOutcome:
            'Ожидание: "Без лекарства я буду бодрствовать ___часов / не усну вообще"',
        };

      case 'causes':
        return {
          hypothesis: 'Моя бессонница вызвана неизменяемыми факторами.',
          experiment:
            'Ведите дневник 2 недели, отмечая уровень стресса и качество сна. Ищите закономерности.',
          predictedOutcome:
            'Ожидание: "Связь между стрессом и сном: прямая/нет связи/обратная"',
        };

      default:
        return {
          hypothesis: belief.belief,
          experiment: 'Проверьте это убеждение, записывая реальные результаты.',
          predictedOutcome: 'Что вы ожидаете произойдёт?',
        };
    }
  }

  /**
   * Calculate cognitive improvement over time
   *
   * Enhanced with emotional improvement metrics
   */
  calculateImprovement(beliefHistory: IDysfunctionalBelief[][]): ICognitiveImprovementResult {
    if (beliefHistory.length < 2) {
      return {
        dbasReduction: 0,
        topImprovedBeliefs: [],
        emotionalImprovement: {
          avgEmotionReduction: 0,
          improvedEmotions: [],
        },
      };
    }

    const firstWeek = beliefHistory[0];
    const lastWeek = beliefHistory[beliefHistory.length - 1];

    // Calculate overall belief intensity reduction
    const avgIntensityFirst =
      firstWeek.reduce((sum, b) => sum + b.intensity, 0) / (firstWeek.length || 1);
    const avgIntensityLast =
      lastWeek.reduce((sum, b) => sum + b.intensity, 0) / (lastWeek.length || 1);

    const dbasReduction = avgIntensityFirst - avgIntensityLast;

    // Find beliefs with most improvement
    const improvements: { belief: string; reduction: number }[] = [];

    for (const oldBelief of firstWeek) {
      const newBelief = lastWeek.find(
        (b) => b.category === oldBelief.category && b.belief === oldBelief.belief
      );
      if (newBelief) {
        const reduction = oldBelief.intensity - newBelief.intensity;
        if (reduction > 0) {
          improvements.push({ belief: oldBelief.belief, reduction });
        }
      }
    }

    improvements.sort((a, b) => b.reduction - a.reduction);
    const topImprovedBeliefs = improvements.slice(0, 3).map((i) => i.belief);

    // Calculate emotional improvement
    const emotionalImprovement = this.calculateEmotionalImprovement(firstWeek, lastWeek);

    return {
      dbasReduction,
      topImprovedBeliefs,
      emotionalImprovement,
    };
  }

  /**
   * Generate structured progress report for cognitive restructuring
   *
   * Produces a table-format report showing:
   * - Belief → Emotion → Category → Alternative Thought
   * - Intensity changes over time
   */
  generateCognitiveProgressReport(
    beliefHistory: IDysfunctionalBelief[][],
    userId: string = 'unknown'
  ): ICognitiveProgressReport {
    const rows: ICognitiveProgressRow[] = [];

    // Group beliefs by id to track changes
    const beliefGroups = new Map<string, IDysfunctionalBelief[]>();

    for (const weekBeliefs of beliefHistory) {
      for (const belief of weekBeliefs) {
        const key = `${belief.category}_${belief.belief}`;
        if (!beliefGroups.has(key)) {
          beliefGroups.set(key, []);
        }
        beliefGroups.get(key)!.push(belief);
      }
    }

    // Create rows for each belief tracked
    for (const [_key, beliefs] of beliefGroups) {
      const firstBelief = beliefs[0];
      const lastBelief = beliefs[beliefs.length - 1];

      const emotion = firstBelief.emotion ?? this.inferEmotionFromBelief(firstBelief);
      const emotionBefore = firstBelief.emotionIntensity ?? firstBelief.intensity;
      const emotionAfter = lastBelief.emotionIntensityAfter ?? lastBelief.emotionIntensity ?? emotionBefore * 0.7;

      const beliefReduction = firstBelief.intensity - lastBelief.intensity;

      rows.push({
        date: new Date().toISOString().split('T')[0],
        belief: firstBelief.belief,
        category: firstBelief.category,
        emotion,
        emotionIntensityBefore: Math.round(emotionBefore * 100),
        emotionIntensityAfter: Math.round(emotionAfter * 100),
        beliefIntensityBefore: Math.round(firstBelief.intensity * 100),
        beliefIntensityAfter: Math.round(lastBelief.intensity * 100),
        alternativeThought: lastBelief.alternativeThought || '',
        restructuringSuccess: beliefReduction > 0.2,
      });
    }

    // Calculate summary statistics
    const successfulRestructurings = rows.filter((r) => r.restructuringSuccess).length;
    const avgBeliefReduction =
      rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.beliefIntensityBefore - r.beliefIntensityAfter), 0) / rows.length
        : 0;
    const avgEmotionReduction =
      rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.emotionIntensityBefore - r.emotionIntensityAfter), 0) / rows.length
        : 0;

    // Find dominant emotion and category
    const emotionCounts = new Map<SleepRelatedEmotion, number>();
    const categoryCounts = new Map<IDysfunctionalBelief['category'], number>();

    for (const row of rows) {
      emotionCounts.set(row.emotion, (emotionCounts.get(row.emotion) || 0) + 1);
      categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1);
    }

    const dominantEmotion = this.findMostCommon(emotionCounts) ?? 'anxiety';
    const dominantCategory = this.findMostCommon(categoryCounts) ?? 'expectations';

    // Determine period
    const periodStart = beliefHistory.length > 0 ? new Date().toISOString().split('T')[0] : '';
    const periodEnd = new Date().toISOString().split('T')[0];

    return {
      generatedAt: new Date().toISOString(),
      userId,
      periodStart,
      periodEnd,
      rows,
      summary: {
        totalBeliefs: rows.length,
        successfulRestructurings,
        successRate: rows.length > 0 ? Math.round((successfulRestructurings / rows.length) * 100) : 0,
        avgBeliefReduction: Math.round(avgBeliefReduction),
        avgEmotionReduction: Math.round(avgEmotionReduction),
        dominantEmotion,
        dominantCategory,
      },
      toMarkdownTable: () => this.formatReportAsMarkdown(rows, {
        totalBeliefs: rows.length,
        successfulRestructurings,
        successRate: rows.length > 0 ? Math.round((successfulRestructurings / rows.length) * 100) : 0,
        avgBeliefReduction: Math.round(avgBeliefReduction),
        avgEmotionReduction: Math.round(avgEmotionReduction),
        dominantEmotion,
        dominantCategory,
      }),
    };
  }

  /**
   * Infer emotion from belief category and content
   * Used when emotion is not explicitly provided
   */
  inferEmotionFromBelief(belief: IDysfunctionalBelief): SleepRelatedEmotion {
    // First check if emotion keywords are in the belief text
    const lowerBelief = belief.belief.toLowerCase();

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerBelief.includes(keyword)) {
          return emotion as SleepRelatedEmotion;
        }
      }
    }

    // Fall back to category-based inference
    return CATEGORY_EMOTION_MAP[belief.category];
  }

  /**
   * Extract the belief that best matches the user's text
   */
  private extractBestMatchingBelief(text: string, possibleBeliefs: string[]): string {
    // Simple matching: return the first belief that shares keywords with text
    for (const belief of possibleBeliefs) {
      const beliefWords = belief.toLowerCase().split(/\s+/);
      const matchCount = beliefWords.filter((word) =>
        word.length > 3 && text.includes(word)
      ).length;

      if (matchCount >= 2) {
        return belief;
      }
    }

    // Default to first belief in category
    return possibleBeliefs[0];
  }

  /**
   * Get existing belief strength from sleep state cognitions
   */
  private getExistingBeliefStrength(sleepState: ISleepState, category: string): number {
    const cognitions = sleepState.cognitions;

    switch (category) {
      case 'expectations':
        return cognitions.beliefs.unrealisticExpectations ? 0.7 : 0.3;
      case 'consequences':
        return cognitions.beliefs.catastrophizing ? 0.8 : 0.3;
      case 'control':
        return cognitions.beliefs.helplessness ? 0.75 : 0.3;
      default:
        return 0.5;
    }
  }

  /**
   * Detect emotion from user text or infer from category
   *
   * Uses keyword matching based on PSAS cognitive subscale
   */
  private detectEmotionFromText(
    text: string,
    category: IDysfunctionalBelief['category']
  ): SleepRelatedEmotion {
    // Check for explicit emotion keywords
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return emotion as SleepRelatedEmotion;
        }
      }
    }

    // Fall back to category-based inference
    return CATEGORY_EMOTION_MAP[category];
  }

  /**
   * Calculate emotion intensity from text and belief intensity
   *
   * Uses intensity modifiers (очень, сильно, немного, etc.)
   * Based on clinical thought record practice (0-100 scale normalized to 0-1)
   */
  private calculateEmotionIntensity(text: string, beliefIntensity: number): number {
    let intensity = beliefIntensity;

    // Apply modifiers based on language intensity
    for (const { keywords, modifier } of INTENSITY_MODIFIERS) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          intensity += modifier;
          break; // Only apply one modifier per group
        }
      }
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, intensity));
  }

  /**
   * Calculate emotional improvement between two time periods
   */
  private calculateEmotionalImprovement(
    firstWeek: IDysfunctionalBelief[],
    lastWeek: IDysfunctionalBelief[]
  ): { avgEmotionReduction: number; improvedEmotions: SleepRelatedEmotion[] } {
    // Group by emotion type and calculate reduction
    const emotionReductions = new Map<SleepRelatedEmotion, { first: number; last: number; count: number }>();

    // Process first week
    for (const belief of firstWeek) {
      const emotion = belief.emotion ?? this.inferEmotionFromBelief(belief);
      const intensity = belief.emotionIntensity ?? belief.intensity;

      const existing = emotionReductions.get(emotion) || { first: 0, last: 0, count: 0 };
      existing.first += intensity;
      existing.count++;
      emotionReductions.set(emotion, existing);
    }

    // Process last week
    for (const belief of lastWeek) {
      const emotion = belief.emotion ?? this.inferEmotionFromBelief(belief);
      const intensity = belief.emotionIntensityAfter ?? belief.emotionIntensity ?? belief.intensity;

      const existing = emotionReductions.get(emotion);
      if (existing) {
        existing.last += intensity;
      }
    }

    // Calculate improvements
    let totalReduction = 0;
    let totalCount = 0;
    const improvedEmotions: SleepRelatedEmotion[] = [];

    for (const [emotion, data] of emotionReductions) {
      if (data.count > 0) {
        const avgFirst = data.first / data.count;
        const avgLast = data.last / data.count;
        const reduction = avgFirst - avgLast;

        totalReduction += reduction;
        totalCount++;

        if (reduction > 0.1) {
          improvedEmotions.push(emotion);
        }
      }
    }

    return {
      avgEmotionReduction: totalCount > 0 ? totalReduction / totalCount : 0,
      improvedEmotions,
    };
  }

  /**
   * Find most common element in a map of counts
   */
  private findMostCommon<T>(counts: Map<T, number>): T | undefined {
    let maxCount = 0;
    let mostCommon: T | undefined;

    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }

  /**
   * Format cognitive progress report as markdown table
   *
   * Inspired by ChatCBT summary table format
   */
  private formatReportAsMarkdown(
    rows: ICognitiveProgressRow[],
    summary: ICognitiveProgressReport['summary']
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('## Отчёт о когнитивном прогрессе');
    lines.push('');

    // Summary section
    lines.push('### Сводка');
    lines.push(`- **Всего убеждений:** ${summary.totalBeliefs}`);
    lines.push(`- **Успешных реструктуризаций:** ${summary.successfulRestructurings} (${summary.successRate}%)`);
    lines.push(`- **Среднее снижение убеждений:** ${summary.avgBeliefReduction}%`);
    lines.push(`- **Среднее снижение эмоций:** ${summary.avgEmotionReduction}%`);
    lines.push(`- **Преобладающая эмоция:** ${this.getEmotionLabel(summary.dominantEmotion)}`);
    lines.push(`- **Преобладающая категория:** ${this.getCategoryLabel(summary.dominantCategory)}`);
    lines.push('');

    // Table
    if (rows.length > 0) {
      lines.push('### Детализация');
      lines.push('');
      lines.push('| Убеждение | Эмоция | До | После | Альтернативная мысль | Успех |');
      lines.push('|-----------|--------|-----|-------|---------------------|-------|');

      for (const row of rows) {
        const emotionLabel = this.getEmotionLabel(row.emotion);
        const success = row.restructuringSuccess ? '✓' : '—';
        const beliefShort = row.belief.length > 40 ? row.belief.substring(0, 37) + '...' : row.belief;
        const altShort = row.alternativeThought.length > 30
          ? row.alternativeThought.substring(0, 27) + '...'
          : row.alternativeThought || '—';

        lines.push(
          `| ${beliefShort} | ${emotionLabel} | ${row.emotionIntensityBefore}% | ${row.emotionIntensityAfter}% | ${altShort} | ${success} |`
        );
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('*Формат отчёта основан на Beck (1976) и ChatCBT summary table*');

    return lines.join('\n');
  }

  /**
   * Get Russian label for emotion
   */
  private getEmotionLabel(emotion: SleepRelatedEmotion): string {
    const labels: Record<SleepRelatedEmotion, string> = {
      anxiety: 'Тревога',
      frustration: 'Разочарование',
      hopelessness: 'Безнадёжность',
      fear: 'Страх',
      anger: 'Гнев',
      worry: 'Беспокойство',
    };
    return labels[emotion];
  }

  /**
   * Get Russian label for category
   */
  private getCategoryLabel(category: IDysfunctionalBelief['category']): string {
    const labels: Record<IDysfunctionalBelief['category'], string> = {
      expectations: 'Ожидания от сна',
      consequences: 'Последствия',
      control: 'Контроль',
      medication: 'Медикаменты',
      causes: 'Причины',
    };
    return labels[category];
  }
}
