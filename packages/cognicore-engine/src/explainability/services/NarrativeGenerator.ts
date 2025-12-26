/**
 * Narrative Generator
 * ===================
 * Phase 5.2: Human-Centered XAI Natural Language Explanations
 *
 * Generates narrative explanations that tell a story about the AI's decision,
 * making complex explanations accessible to lay users.
 *
 * Research basis:
 * - HCXAI Framework - Human-Centered Explainable AI
 * - TIFU Framework - Transparency and Interpretability For Understandability
 * - Miller (2019) - Explanation in Artificial Intelligence
 * - Narrative psychology in health communication
 *
 * Key features:
 * - Multiple narrative structures (journey, comparison, cause-effect, recommendation)
 * - Age-adaptive language (child/teen/adult)
 * - Cognitive style adaptation (visual/analytical/intuitive/sequential)
 * - Readability optimization (Flesch-Kincaid)
 * - Russian language support
 *
 * (c) BF "Drugoy Put", 2025
 */

import { randomUUID } from 'crypto';
import {
  INarrativeExplanation,
  INarrativeGenerator,
  IExplanationResponse,
  NarrativeStructure,
  CognitiveStyle,
  READABILITY_TARGETS,
} from '../interfaces/IExplainability';

// ============================================================================
// NARRATIVE TEMPLATES
// ============================================================================

/**
 * Templates for different narrative structures in Russian
 */
const NARRATIVE_TEMPLATES_RU: Record<NarrativeStructure, Record<'child' | 'teen' | 'adult', {
  opening: string[];
  body: string[];
  conclusion: string[];
  callToAction: string[];
}>> = {
  journey: {
    child: {
      opening: [
        '🌟 Давай посмотрим, как мы пришли к этому!',
        '🚀 Вот история твоего путешествия!',
        '✨ Расскажу тебе, что произошло!',
      ],
      body: [
        'Ты начал с {initial_state}. Потом {key_change}. И теперь {current_state}!',
        'Помнишь, когда было {initial_state}? {key_change} помогло! Теперь {current_state}.',
      ],
      conclusion: [
        'Ты молодец! 🎉',
        'Так держать! 💪',
        'Отлично получается! ⭐',
      ],
      callToAction: [
        'Попробуй {action}!',
        'Давай сделаем {action}!',
      ],
    },
    teen: {
      opening: [
        '📊 Вот как складывается картина...',
        '💡 Смотри, что получается...',
        '🎯 Разберём по шагам...',
      ],
      body: [
        'Начиналось с {initial_state}. {key_change} изменило ситуацию. Сейчас {current_state}.',
        'От {initial_state} через {key_change} ты дошёл до {current_state}.',
      ],
      conclusion: [
        'В целом, движение в правильном направлении.',
        'Есть прогресс, и это главное.',
        'Ситуация под контролем.',
      ],
      callToAction: [
        'Следующий шаг — {action}.',
        'Рекомендую попробовать {action}.',
      ],
    },
    adult: {
      opening: [
        '📈 Анализ вашего пути:',
        '🔍 Рассмотрим динамику изменений:',
        '📋 Обзор прогресса:',
      ],
      body: [
        'Исходное состояние: {initial_state}. Ключевые изменения: {key_change}. Текущий статус: {current_state}.',
        'Вы прошли путь от {initial_state}, через {key_change}, к {current_state}.',
      ],
      conclusion: [
        'Данные показывают положительную динамику.',
        'Наблюдается устойчивый прогресс.',
        'Текущая траектория соответствует целям.',
      ],
      callToAction: [
        'Рекомендуемое действие: {action}.',
        'Для дальнейшего прогресса предлагается: {action}.',
      ],
    },
  },

  comparison: {
    child: {
      opening: [
        '🔍 А ты знал, что другие тоже так делают?',
        '👥 Смотри, как у других ребят!',
      ],
      body: [
        'Многие, как и ты, чувствовали {feeling}. {technique} помогло им. Тебе тоже поможет!',
      ],
      conclusion: [
        'Ты не один! 🤝',
        'Многие справились, и ты справишься! 💪',
      ],
      callToAction: [
        'Попробуй то, что помогло другим!',
      ],
    },
    teen: {
      opening: [
        '📊 Сравнение с похожими случаями...',
        '🔄 Посмотрим, как справляются другие...',
      ],
      body: [
        'В похожих ситуациях ({feeling}) {technique} показала хорошие результаты. {stats}',
      ],
      conclusion: [
        'Метод проверен и работает.',
        'Статистика на твоей стороне.',
      ],
      callToAction: [
        'Стоит попробовать этот подход.',
      ],
    },
    adult: {
      opening: [
        '📈 Сравнительный анализ:',
        '🔬 Данные по аналогичным случаям:',
      ],
      body: [
        'В выборке пользователей со схожими параметрами ({feeling}) применение {technique} показало {stats}.',
      ],
      conclusion: [
        'Эффективность метода подтверждена данными.',
        'Результаты статистически значимы.',
      ],
      callToAction: [
        'На основании данных рекомендуется применить описанный подход.',
      ],
    },
  },

  'cause-effect': {
    child: {
      opening: [
        '🔗 Знаешь почему так получилось?',
        '❓ Давай разберёмся, от чего это зависит!',
      ],
      body: [
        'Когда {cause}, то {effect}. Это как {analogy}!',
        '{cause} приводит к {effect}. Понимаешь?',
      ],
      conclusion: [
        'Теперь ты знаешь, как это работает! 🧠',
        'Вот такая цепочка! ⛓️',
      ],
      callToAction: [
        'Чтобы изменить {effect}, попробуй {action}!',
      ],
    },
    teen: {
      opening: [
        '🔬 Причинно-следственная связь:',
        '⚡ Вот что на что влияет:',
      ],
      body: [
        '{cause} → {effect}. Механизм: {mechanism}.',
        'Связь: {cause} напрямую влияет на {effect}.',
      ],
      conclusion: [
        'Понимание причин помогает управлять следствиями.',
        'Зная механизм, можно влиять на результат.',
      ],
      callToAction: [
        'Воздействуй на {cause}, чтобы изменить {effect}.',
      ],
    },
    adult: {
      opening: [
        '🔍 Каузальный анализ:',
        '📊 Причинно-следственные связи:',
      ],
      body: [
        'Установлена связь: {cause} → {effect}. Механизм воздействия: {mechanism}. Сила связи: {strength}.',
      ],
      conclusion: [
        'Каузальный анализ выявил ключевые точки воздействия.',
        'Интервенция на уровне причин обеспечит устойчивый эффект.',
      ],
      callToAction: [
        'Рекомендуется воздействовать на {cause} для изменения {effect}.',
      ],
    },
  },

  recommendation: {
    child: {
      opening: [
        '🎁 У меня есть для тебя идея!',
        '💡 Знаю, что тебе поможет!',
        '🌈 Вот что я придумал для тебя!',
      ],
      body: [
        'Я вижу, что {observation}. Поэтому советую {recommendation}!',
        'Раз {observation}, давай попробуем {recommendation}!',
      ],
      conclusion: [
        'Это должно помочь! 🎯',
        'Уверен, тебе понравится! ❤️',
      ],
      callToAction: [
        'Готов попробовать? {action}!',
        'Начнём прямо сейчас? {action}!',
      ],
    },
    teen: {
      opening: [
        '💡 Вот моя рекомендация:',
        '🎯 Что я предлагаю:',
      ],
      body: [
        'Учитывая {observation}, оптимальный вариант — {recommendation}. Почему: {reasoning}.',
      ],
      conclusion: [
        'Этот подход работает для твоей ситуации.',
        'Рекомендация учитывает твои особенности.',
      ],
      callToAction: [
        'Попробуй: {action}.',
      ],
    },
    adult: {
      opening: [
        '📋 Персонализированная рекомендация:',
        '🎯 На основании анализа:',
      ],
      body: [
        'Анализ показал: {observation}. Рекомендуется: {recommendation}. Обоснование: {reasoning}. Ожидаемый эффект: {expected_effect}.',
      ],
      conclusion: [
        'Рекомендация основана на ваших данных и лучших практиках.',
        'Персонализация учитывает индивидуальные факторы.',
      ],
      callToAction: [
        'Рекомендуемое действие: {action}.',
      ],
    },
  },
};

/**
 * Templates in English
 */
const NARRATIVE_TEMPLATES_EN: Record<NarrativeStructure, Record<'child' | 'teen' | 'adult', {
  opening: string[];
  body: string[];
  conclusion: string[];
  callToAction: string[];
}>> = {
  journey: {
    child: {
      opening: [
        "🌟 Let's see how we got here!",
        '🚀 Here\'s the story of your journey!',
      ],
      body: [
        'You started with {initial_state}. Then {key_change}. And now {current_state}!',
      ],
      conclusion: [
        'You\'re doing great! 🎉',
        'Keep it up! 💪',
      ],
      callToAction: [
        'Try {action}!',
      ],
    },
    teen: {
      opening: [
        '📊 Here\'s how things are shaping up...',
        '💡 Let me break this down...',
      ],
      body: [
        'Started with {initial_state}. {key_change} changed things. Now at {current_state}.',
      ],
      conclusion: [
        'Overall, moving in the right direction.',
        'There\'s progress, and that\'s what matters.',
      ],
      callToAction: [
        'Next step: {action}.',
      ],
    },
    adult: {
      opening: [
        '📈 Analysis of your progress:',
        '🔍 Review of changes:',
      ],
      body: [
        'Initial state: {initial_state}. Key changes: {key_change}. Current status: {current_state}.',
      ],
      conclusion: [
        'Data shows positive momentum.',
        'Current trajectory aligns with goals.',
      ],
      callToAction: [
        'Recommended action: {action}.',
      ],
    },
  },

  comparison: {
    child: {
      opening: ['👥 Did you know others do this too?'],
      body: ['Many kids felt {feeling} like you. {technique} helped them!'],
      conclusion: ["You're not alone! 🤝"],
      callToAction: ['Try what helped others!'],
    },
    teen: {
      opening: ['📊 Comparing with similar cases...'],
      body: ['In similar situations ({feeling}), {technique} showed good results. {stats}'],
      conclusion: ['The method is proven to work.'],
      callToAction: ['Worth trying this approach.'],
    },
    adult: {
      opening: ['📈 Comparative analysis:'],
      body: ['Among users with similar parameters ({feeling}), {technique} showed {stats}.'],
      conclusion: ['Method effectiveness is data-confirmed.'],
      callToAction: ['Based on data, recommend applying this approach.'],
    },
  },

  'cause-effect': {
    child: {
      opening: ['🔗 Know why this happened?'],
      body: ['When {cause}, then {effect}. It\'s like {analogy}!'],
      conclusion: ['Now you know how it works! 🧠'],
      callToAction: ['To change {effect}, try {action}!'],
    },
    teen: {
      opening: ['🔬 Cause and effect:'],
      body: ['{cause} → {effect}. Mechanism: {mechanism}.'],
      conclusion: ['Understanding causes helps control effects.'],
      callToAction: ['Act on {cause} to change {effect}.'],
    },
    adult: {
      opening: ['🔍 Causal analysis:'],
      body: ['Established link: {cause} → {effect}. Mechanism: {mechanism}. Strength: {strength}.'],
      conclusion: ['Causal analysis identified key intervention points.'],
      callToAction: ['Recommend acting on {cause} to modify {effect}.'],
    },
  },

  recommendation: {
    child: {
      opening: ['🎁 I have an idea for you!', '💡 I know what will help!'],
      body: ['I see that {observation}. So I suggest {recommendation}!'],
      conclusion: ['This should help! 🎯'],
      callToAction: ['Ready to try? {action}!'],
    },
    teen: {
      opening: ['💡 Here\'s my recommendation:'],
      body: ['Given {observation}, best option is {recommendation}. Why: {reasoning}.'],
      conclusion: ['This approach works for your situation.'],
      callToAction: ['Try: {action}.'],
    },
    adult: {
      opening: ['📋 Personalized recommendation:'],
      body: ['Analysis shows: {observation}. Recommended: {recommendation}. Rationale: {reasoning}.'],
      conclusion: ['Recommendation based on your data and best practices.'],
      callToAction: ['Recommended action: {action}.'],
    },
  },
};

// ============================================================================
// NARRATIVE GENERATOR
// ============================================================================

/**
 * Narrative Generator
 *
 * Creates human-friendly narrative explanations based on HCXAI principles.
 */
export class NarrativeGenerator implements INarrativeGenerator {
  // ==========================================================================
  // MAIN GENERATION
  // ==========================================================================

  /**
   * Generate narrative explanation from explanation response
   */
  generateNarrative(
    explanation: IExplanationResponse,
    options: {
      structure: NarrativeStructure;
      ageGroup: 'child' | 'teen' | 'adult';
      cognitiveStyle?: CognitiveStyle;
      language: 'en' | 'ru';
      maxWords?: number;
    }
  ): INarrativeExplanation {
    const templates = options.language === 'ru'
      ? NARRATIVE_TEMPLATES_RU
      : NARRATIVE_TEMPLATES_EN;

    const structureTemplates = templates[options.structure][options.ageGroup];

    // Extract variables from explanation
    const variables = this.extractVariables(explanation, options.structure);

    // Generate narrative parts
    const opening = this.selectAndFill(
      structureTemplates.opening,
      variables,
      options.cognitiveStyle
    );

    const body = this.selectAndFill(
      structureTemplates.body,
      variables,
      options.cognitiveStyle
    );

    const conclusion = this.selectAndFill(
      structureTemplates.conclusion,
      variables,
      options.cognitiveStyle
    );

    const callToAction = structureTemplates.callToAction.length > 0
      ? this.selectAndFill(structureTemplates.callToAction, variables, options.cognitiveStyle)
      : undefined;

    // Generate key points
    const keyPoints = this.extractKeyPoints(explanation, options.language, options.ageGroup);

    // Generate title
    const title = this.generateTitle(options.structure, options.language, options.ageGroup);

    // Calculate readability
    const fullText = [opening, body, conclusion, callToAction].filter(Boolean).join(' ');
    const readability = this.calculateReadability(fullText);

    // Apply word limit if specified
    let finalOpening = opening;
    let finalBody = body;
    let finalConclusion = conclusion;

    if (options.maxWords) {
      const result = this.applyWordLimit(
        opening, body, conclusion, callToAction,
        options.maxWords
      );
      finalOpening = result.opening;
      finalBody = result.body;
      finalConclusion = result.conclusion;
    }

    return {
      predictionId: explanation.predictionId,
      structure: options.structure,

      title,
      titleRu: options.language === 'ru' ? title : this.translateTitle(title),
      opening: finalOpening,
      openingRu: options.language === 'ru' ? finalOpening : '',
      body: finalBody,
      bodyRu: options.language === 'ru' ? finalBody : '',
      conclusion: finalConclusion,
      conclusionRu: options.language === 'ru' ? finalConclusion : '',

      keyPoints: options.language === 'en' ? keyPoints : [],
      keyPointsRu: options.language === 'ru' ? keyPoints : [],

      callToAction,
      callToActionRu: options.language === 'ru' ? callToAction : undefined,

      cognitiveStyleUsed: options.cognitiveStyle || 'intuitive',
      ageGroupUsed: options.ageGroup,

      readability,
    };
  }

  /**
   * Get templates for a structure
   */
  getTemplates(
    structure: NarrativeStructure,
    language: 'en' | 'ru'
  ): string[] {
    const templates = language === 'ru'
      ? NARRATIVE_TEMPLATES_RU
      : NARRATIVE_TEMPLATES_EN;

    const structureTemplates = templates[structure];

    return [
      ...structureTemplates.adult.opening,
      ...structureTemplates.adult.body,
      ...structureTemplates.adult.conclusion,
    ];
  }

  /**
   * Personalize narrative based on user history
   */
  personalizeNarrative(
    narrative: INarrativeExplanation,
    userHistory: {
      previousExplanations: string[];
      preferredStyle?: CognitiveStyle;
      comprehensionLevel?: number;
    }
  ): INarrativeExplanation {
    // Adjust complexity based on comprehension level
    if (userHistory.comprehensionLevel !== undefined) {
      if (userHistory.comprehensionLevel < 0.5) {
        // Simplify for lower comprehension
        return {
          ...narrative,
          body: this.simplifyText(narrative.body),
          bodyRu: this.simplifyText(narrative.bodyRu),
        };
      }
    }

    // Avoid repetition from previous explanations
    if (userHistory.previousExplanations.length > 0) {
      const lastExplanation = userHistory.previousExplanations[userHistory.previousExplanations.length - 1];

      // If opening is similar to last, use alternative
      if (narrative.opening === lastExplanation) {
        // Add variation marker
        return {
          ...narrative,
          opening: narrative.opening.replace(/^/, '📌 '),
          openingRu: narrative.openingRu.replace(/^/, '📌 '),
        };
      }
    }

    return narrative;
  }

  // ==========================================================================
  // VARIABLE EXTRACTION
  // ==========================================================================

  /**
   * Extract variables from explanation for template filling
   */
  private extractVariables(
    explanation: IExplanationResponse,
    structure: NarrativeStructure
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    // From local explanation (SHAP)
    if (explanation.localExplanation) {
      const topPositive = explanation.localExplanation.topPositiveFeatures[0];
      const topNegative = explanation.localExplanation.topNegativeFeatures[0];

      variables['key_factor'] = topPositive?.featureNameRu || 'настроение';
      variables['key_factor_value'] = String(topPositive?.featureValue || '');
      variables['challenge'] = topNegative?.featureNameRu || '';

      // Initial state (baseline)
      variables['initial_state'] = 'нейтральное состояние';
      variables['current_state'] = explanation.localExplanation.prediction;
      variables['key_change'] = `изменение ${variables['key_factor']}`;
    }

    // From counterfactual explanation
    if (explanation.counterfactualExplanation) {
      const easiest = explanation.counterfactualExplanation.easiestCounterfactual;
      if (easiest && easiest.changes.length > 0) {
        variables['action'] = easiest.changes[0].changeDescriptionRu || easiest.changes[0].changeDescription;
      }
    }

    // From causal explanation
    if (explanation.causalExplanation) {
      const primaryChain = explanation.causalExplanation.primaryChain;
      if (primaryChain.nodes.length >= 2) {
        variables['cause'] = primaryChain.nodes[0].variableRu || primaryChain.nodes[0].variable;
        variables['effect'] = primaryChain.nodes[primaryChain.nodes.length - 1].variableRu ||
          primaryChain.nodes[primaryChain.nodes.length - 1].variable;
      }

      if (primaryChain.edges.length > 0) {
        variables['mechanism'] = primaryChain.edges[0].mechanismRu ||
          primaryChain.edges[0].mechanism ||
          'прямое влияние';
        variables['strength'] = `${Math.round(primaryChain.edges[0].strength * 100)}%`;
      }
    }

    // From user explanation
    if (explanation.userExplanation) {
      variables['observation'] = explanation.userExplanation.summaryRu || explanation.userExplanation.summary;
      variables['recommendation'] = explanation.userExplanation.actionableAdviceRu?.[0] ||
        explanation.userExplanation.actionableAdvice?.[0] ||
        'продолжить практику';
      variables['reasoning'] = explanation.userExplanation.reasoningRu || explanation.userExplanation.reasoning;
    }

    // Defaults
    variables['feeling'] = variables['key_factor'] || 'текущее состояние';
    variables['technique'] = variables['recommendation'] || 'рекомендуемая техника';
    variables['stats'] = 'эффективность 70%+';
    variables['analogy'] = 'домино - одно толкает другое';
    variables['expected_effect'] = 'улучшение состояния';

    // Ensure action is set
    if (!variables['action']) {
      variables['action'] = variables['recommendation'] || 'начать практику';
    }

    return variables;
  }

  // ==========================================================================
  // TEMPLATE PROCESSING
  // ==========================================================================

  /**
   * Select template and fill variables
   */
  private selectAndFill(
    templates: string[],
    variables: Record<string, string>,
    cognitiveStyle?: CognitiveStyle
  ): string {
    // Select template based on cognitive style
    let templateIndex = 0;

    if (cognitiveStyle) {
      switch (cognitiveStyle) {
        case 'analytical':
          // Prefer longer, more detailed templates
          templateIndex = templates.length - 1;
          break;
        case 'intuitive':
          // Prefer shorter templates
          templateIndex = 0;
          break;
        case 'sequential':
          // Prefer middle templates (balanced)
          templateIndex = Math.floor(templates.length / 2);
          break;
        case 'visual':
          // Prefer templates with emojis
          templateIndex = templates.findIndex(t => /[\u{1F300}-\u{1F9FF}]/u.test(t));
          if (templateIndex === -1) templateIndex = 0;
          break;
      }
    }

    // Ensure valid index
    templateIndex = Math.min(templateIndex, templates.length - 1);
    templateIndex = Math.max(templateIndex, 0);

    let template = templates[templateIndex];

    // Fill variables
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }

    // Clean up unfilled variables
    template = template.replace(/\{[^}]+\}/g, '');

    return template.trim();
  }

  /**
   * Extract key points from explanation
   */
  private extractKeyPoints(
    explanation: IExplanationResponse,
    language: 'en' | 'ru',
    ageGroup: 'child' | 'teen' | 'adult'
  ): string[] {
    const points: string[] = [];

    // From SHAP explanation
    if (explanation.localExplanation) {
      const confidence = Math.round(explanation.localExplanation.confidence * 100);
      if (language === 'ru') {
        points.push(`Уверенность системы: ${confidence}%`);
      } else {
        points.push(`System confidence: ${confidence}%`);
      }

      // Top factors
      for (const factor of explanation.localExplanation.topPositiveFeatures.slice(0, 2)) {
        if (language === 'ru') {
          points.push(`✅ ${factor.featureNameRu}: ${factor.featureValue}`);
        } else {
          points.push(`✅ ${factor.featureName}: ${factor.featureValue}`);
        }
      }
    }

    // From counterfactual
    if (explanation.counterfactualExplanation?.easiestCounterfactual) {
      const cf = explanation.counterfactualExplanation.easiestCounterfactual;
      if (language === 'ru') {
        points.push(`💡 Альтернатива: ${cf.alternativeOutcomeRu}`);
      } else {
        points.push(`💡 Alternative: ${cf.alternativeOutcome}`);
      }
    }

    // Limit based on age group
    const maxPoints = ageGroup === 'child' ? 2 : ageGroup === 'teen' ? 3 : 5;

    return points.slice(0, maxPoints);
  }

  /**
   * Generate title for narrative
   */
  private generateTitle(
    structure: NarrativeStructure,
    language: 'en' | 'ru',
    ageGroup: 'child' | 'teen' | 'adult'
  ): string {
    const titles: Record<NarrativeStructure, Record<string, Record<string, string>>> = {
      journey: {
        ru: { child: '🌟 Твоё путешествие', teen: '📊 Твой путь', adult: '📈 Анализ прогресса' },
        en: { child: '🌟 Your Journey', teen: '📊 Your Path', adult: '📈 Progress Analysis' },
      },
      comparison: {
        ru: { child: '👥 Как у других', teen: '📊 Сравнение', adult: '📈 Сравнительный анализ' },
        en: { child: '👥 Like Others', teen: '📊 Comparison', adult: '📈 Comparative Analysis' },
      },
      'cause-effect': {
        ru: { child: '🔗 Почему так?', teen: '⚡ Причина и следствие', adult: '🔍 Каузальный анализ' },
        en: { child: '🔗 Why?', teen: '⚡ Cause & Effect', adult: '🔍 Causal Analysis' },
      },
      recommendation: {
        ru: { child: '🎁 Моя идея!', teen: '💡 Рекомендация', adult: '📋 Персональная рекомендация' },
        en: { child: '🎁 My Idea!', teen: '💡 Recommendation', adult: '📋 Personal Recommendation' },
      },
    };

    return titles[structure][language][ageGroup];
  }

  private translateTitle(title: string): string {
    // Simple title translation
    const translations: Record<string, string> = {
      'Your Journey': 'Твоё путешествие',
      'Your Path': 'Твой путь',
      'Progress Analysis': 'Анализ прогресса',
      'Like Others': 'Как у других',
      'Comparison': 'Сравнение',
      'Comparative Analysis': 'Сравнительный анализ',
      'Why?': 'Почему так?',
      'Cause & Effect': 'Причина и следствие',
      'Causal Analysis': 'Каузальный анализ',
      'My Idea!': 'Моя идея!',
      'Recommendation': 'Рекомендация',
      'Personal Recommendation': 'Персональная рекомендация',
    };

    // Remove emojis for lookup
    const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

    return translations[cleanTitle] || title;
  }

  // ==========================================================================
  // READABILITY
  // ==========================================================================

  /**
   * Calculate readability metrics
   */
  private calculateReadability(text: string): INarrativeExplanation['readability'] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = this.countSyllables(text);

    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllables / Math.max(1, wordCount);

    // Flesch-Kincaid Grade Level formula
    const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    // Estimated reading time (200 WPM for Russian/English)
    const readingTime = Math.ceil(wordCount / 200 * 60); // seconds

    return {
      fleschKincaidGrade: Math.max(0, Math.round(fleschKincaidGrade * 10) / 10),
      readingTime,
      wordCount,
    };
  }

  /**
   * Count syllables in text (simplified for Russian/English)
   */
  private countSyllables(text: string): number {
    // Simplified: count vowels as syllable approximation
    const vowels = text.toLowerCase().match(/[аеёиоуыэюяaeiouy]/g);
    return vowels ? vowels.length : text.length / 3;
  }

  /**
   * Apply word limit to narrative
   */
  private applyWordLimit(
    opening: string,
    body: string,
    conclusion: string,
    callToAction: string | undefined,
    maxWords: number
  ): { opening: string; body: string; conclusion: string } {
    const parts = [opening, body, conclusion, callToAction].filter(Boolean) as string[];
    const totalWords = parts.join(' ').split(/\s+/).length;

    if (totalWords <= maxWords) {
      return { opening, body, conclusion };
    }

    // Prioritize: opening > body > conclusion
    // Truncate body first, then conclusion
    const ratio = maxWords / totalWords;

    const truncateToWords = (text: string, maxW: number): string => {
      const words = text.split(/\s+/);
      if (words.length <= maxW) return text;
      return words.slice(0, maxW).join(' ') + '...';
    };

    const openingWords = Math.ceil(opening.split(/\s+/).length * ratio);
    const bodyWords = Math.ceil(body.split(/\s+/).length * ratio * 0.8); // More aggressive on body
    const conclusionWords = Math.ceil(conclusion.split(/\s+/).length * ratio);

    return {
      opening: truncateToWords(opening, openingWords),
      body: truncateToWords(body, bodyWords),
      conclusion: truncateToWords(conclusion, conclusionWords),
    };
  }

  /**
   * Simplify text for lower comprehension
   */
  private simplifyText(text: string): string {
    // Remove complex punctuation
    let simplified = text.replace(/[;:—]/g, '.');

    // Shorten sentences
    simplified = simplified.replace(/,\s*и\s*/g, '. ');
    simplified = simplified.replace(/,\s*но\s*/g, '. Но ');

    return simplified;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create Narrative Generator instance
 */
export function createNarrativeGenerator(): NarrativeGenerator {
  return new NarrativeGenerator();
}
