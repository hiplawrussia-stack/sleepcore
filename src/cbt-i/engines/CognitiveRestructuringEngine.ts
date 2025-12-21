/**
 * CognitiveRestructuringEngine - Cognitive Restructuring Implementation
 * ======================================================================
 * Implements cognitive therapy techniques based on Beck (1979) and
 * Morin's cognitive model of insomnia.
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
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  ICognitiveRestructuringEngine,
  IDysfunctionalBelief,
  ICognitiveSession,
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
 * Cognitive Restructuring Engine
 */
export class CognitiveRestructuringEngine implements ICognitiveRestructuringEngine {
  /**
   * Identify dysfunctional beliefs from user text
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

        beliefs.push({
          id: `belief_${category}_${Date.now()}`,
          category: category as IDysfunctionalBelief['category'],
          belief: this.extractBestMatchingBelief(lowerText, pattern.beliefs),
          intensity: Math.max(intensity, existingBeliefStrength),
          frequency: 0.5, // Default, would need history for accurate value
          evidenceFor: [],
          evidenceAgainst: [],
          alternativeThought: '',
          isActive: true,
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
   */
  calculateImprovement(beliefHistory: IDysfunctionalBelief[][]): {
    dbasReduction: number;
    topImprovedBeliefs: string[];
  } {
    if (beliefHistory.length < 2) {
      return { dbasReduction: 0, topImprovedBeliefs: [] };
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

    return { dbasReduction, topImprovedBeliefs };
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
}
