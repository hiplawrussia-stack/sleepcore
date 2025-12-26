/**
 * MI RESPONSE GENERATOR
 * ======================
 * AI-powered response generation with MI fidelity constraints
 *
 * Scientific Foundation:
 * - AI-Augmented LLMs for MI (arXiv:2505.17380)
 * - Chain-of-Thought prompting for therapist responses
 * - MITI 4.2 adherence validation
 *
 * Key Features:
 * - Template-based response generation
 * - LLM integration with MI constraints
 * - Response validation and reframing
 * - Bilingual support (RU/EN)
 *
 * БФ "Другой путь" | CogniCore Phase 4.1
 */

import type {
  IMIResponseGenerator,
  MIResponseContext,
  MIGenerationConstraints,
  MITIBehaviorCode,
  OpenQuestionTemplate,
  AffirmationTemplate,
  ReflectionTemplate,
  SummaryTemplate
} from '../interfaces/IMotivationalInterviewing';

import type { ChangeTaskSubtype } from '../interfaces/IMotivationalState';

// ============================================================
// MI RESPONSE GENERATOR IMPLEMENTATION
// ============================================================

export class MIResponseGenerator implements IMIResponseGenerator {
  private readonly miKeyPhrases = {
    adherent: {
      ru: [
        'я слышу', 'похоже', 'вы чувствуете', 'что для вас важно',
        'как вы думаете', 'расскажите больше', 'это звучит',
        'вы упоминали', 'если я правильно понял'
      ],
      en: [
        'I hear', 'it sounds like', 'you feel', "what's important to you",
        'what do you think', 'tell me more', 'that sounds',
        'you mentioned', 'if I understand correctly'
      ]
    },
    nonAdherent: {
      ru: [
        'вы должны', 'вам нужно', 'вам следует', 'почему бы вам не',
        'я думаю, что вы', 'но', 'однако', 'на самом деле'
      ],
      en: [
        'you should', 'you need to', 'you must', "why don't you",
        'I think you', 'but', 'however', 'actually'
      ]
    }
  };

  private readonly autonomySupportPhrases = {
    ru: [
      'Только вы можете решить',
      'Это ваш выбор',
      'Вы лучше всех знаете',
      'Что бы вы хотели попробовать?',
      'Это зависит от вас'
    ],
    en: [
      'Only you can decide',
      "It's your choice",
      'You know best',
      'What would you like to try?',
      "It's up to you"
    ]
  };

  /**
   * Generate response using templates
   */
  async generateFromTemplate(
    template: OpenQuestionTemplate | AffirmationTemplate | ReflectionTemplate | SummaryTemplate,
    context: MIResponseContext
  ): Promise<string> {
    const lang = context.language;

    // Handle different template types
    if ('targetChangeTalk' in template) {
      // OpenQuestionTemplate
      return this.fillOpenQuestionTemplate(template as OpenQuestionTemplate, context);
    } else if ('appropriateFor' in template) {
      // AffirmationTemplate
      return this.fillAffirmationTemplate(template as AffirmationTemplate, context);
    } else if ('complexity' in template) {
      // ReflectionTemplate
      return this.fillReflectionTemplate(template as ReflectionTemplate, context);
    } else if ('includeSections' in template) {
      // SummaryTemplate
      return this.fillSummaryTemplate(template as SummaryTemplate, context);
    }

    // Fallback
    return lang === 'ru'
      ? 'Расскажите мне больше об этом.'
      : 'Tell me more about that.';
  }

  /**
   * Generate response using LLM with MI constraints
   */
  async generateWithLLM(
    prompt: string,
    context: MIResponseContext,
    constraints: MIGenerationConstraints
  ): Promise<string> {
    // Build MI-compliant system prompt
    const systemPrompt = this.buildMISystemPrompt(constraints, context);

    // Build user prompt with context
    const userPrompt = this.buildUserPrompt(prompt, context);

    // In production, this would call the LLM API
    // For now, return a template-based response as fallback
    const fallbackResponse = await this.generateFallbackResponse(context, constraints);

    // Validate and potentially reframe
    const validation = this.validateMIAdherence(fallbackResponse, context);
    if (!validation.isAdherent) {
      return this.reframeToMIAdherent(fallbackResponse, context);
    }

    return fallbackResponse;
  }

  /**
   * Validate response for MI adherence
   */
  validateMIAdherence(
    response: string,
    context: MIResponseContext
  ): {
    isAdherent: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const lang = context.language;
    const lowerResponse = response.toLowerCase();
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0.7; // Base score

    // Check for MI-adherent phrases (positive)
    const adherentPhrases = this.miKeyPhrases.adherent[lang];
    for (const phrase of adherentPhrases) {
      if (lowerResponse.includes(phrase.toLowerCase())) {
        score += 0.05;
      }
    }

    // Check for MI-non-adherent phrases (negative)
    const nonAdherentPhrases = this.miKeyPhrases.nonAdherent[lang];
    for (const phrase of nonAdherentPhrases) {
      if (lowerResponse.includes(phrase.toLowerCase())) {
        score -= 0.1;
        issues.push(lang === 'ru'
          ? `Избегайте фразы "${phrase}" - она может быть воспринята как директивная`
          : `Avoid the phrase "${phrase}" - it may come across as directive`);
        suggestions.push(lang === 'ru'
          ? 'Используйте более рефлексивный язык'
          : 'Use more reflective language');
      }
    }

    // Check for questions (should have some)
    const hasQuestion = response.includes('?');
    if (!hasQuestion && context.currentStrategy !== 'summarize_and_transition') {
      suggestions.push(lang === 'ru'
        ? 'Рассмотрите возможность добавить открытый вопрос'
        : 'Consider adding an open-ended question');
    }

    // Check response length (not too long)
    if (response.length > 500) {
      score -= 0.1;
      issues.push(lang === 'ru'
        ? 'Ответ слишком длинный'
        : 'Response is too long');
      suggestions.push(lang === 'ru'
        ? 'Сделайте ответ более кратким'
        : 'Make the response more concise');
    }

    // Check for autonomy support
    const autonomyPhrases = this.autonomySupportPhrases[lang];
    const hasAutonomySupport = autonomyPhrases.some(p =>
      lowerResponse.includes(p.toLowerCase())
    );
    if (hasAutonomySupport) {
      score += 0.1;
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score));

    return {
      isAdherent: score >= 0.6 && issues.length === 0,
      score,
      issues,
      suggestions
    };
  }

  /**
   * Reframe non-adherent response
   */
  async reframeToMIAdherent(
    response: string,
    context: MIResponseContext
  ): Promise<string> {
    const lang = context.language;

    // Replace non-adherent phrases with adherent alternatives
    let reframed = response;

    const replacements: Record<string, Record<'ru' | 'en', { from: string; to: string }[]>> = {
      directive: {
        ru: [
          { from: 'вы должны', to: 'возможно, вы могли бы рассмотреть' },
          { from: 'вам нужно', to: 'что вы думаете о том, чтобы' },
          { from: 'вам следует', to: 'как вам идея' },
          { from: 'почему бы вам не', to: 'что если' }
        ],
        en: [
          { from: 'you should', to: 'you might consider' },
          { from: 'you need to', to: 'what do you think about' },
          { from: 'you must', to: 'one option could be' },
          { from: "why don't you", to: 'what if' }
        ]
      },
      confrontational: {
        ru: [
          { from: 'но', to: 'и в то же время' },
          { from: 'однако', to: 'при этом' },
          { from: 'на самом деле', to: 'интересно, что' }
        ],
        en: [
          { from: 'but', to: 'and at the same time' },
          { from: 'however', to: 'meanwhile' },
          { from: 'actually', to: "it's interesting that" }
        ]
      }
    };

    for (const category of Object.values(replacements)) {
      const langReplacements = category[lang];
      for (const { from, to } of langReplacements) {
        const regex = new RegExp(from, 'gi');
        reframed = reframed.replace(regex, to);
      }
    }

    // Add reflective opening if missing
    const hasReflectiveOpening = this.miKeyPhrases.adherent[lang].some(
      phrase => reframed.toLowerCase().startsWith(phrase.toLowerCase())
    );

    if (!hasReflectiveOpening && context.lastUtterance) {
      const reflectiveOpening = lang === 'ru'
        ? 'Я слышу, что '
        : 'I hear that ';
      reframed = reflectiveOpening + reframed.charAt(0).toLowerCase() + reframed.slice(1);
    }

    return reframed;
  }

  // ============================================================
  // PRIVATE TEMPLATE FILLING METHODS
  // ============================================================

  private fillOpenQuestionTemplate(
    template: OpenQuestionTemplate,
    context: MIResponseContext
  ): string {
    const lang = context.language;
    let text = lang === 'ru' ? template.templateRu : template.template;

    // Fill placeholders
    for (const placeholder of template.placeholders) {
      const value = this.getPlaceholderValue(placeholder, context);
      text = text.replace(`{${placeholder}}`, value);
    }

    return text;
  }

  private fillAffirmationTemplate(
    template: AffirmationTemplate,
    context: MIResponseContext
  ): string {
    const lang = context.language;
    let text = lang === 'ru' ? template.templateRu : template.template;

    // Fill placeholders
    for (const placeholder of template.placeholders) {
      const value = this.getPlaceholderValue(placeholder, context);
      text = text.replace(`{${placeholder}}`, value);
    }

    return text;
  }

  private fillReflectionTemplate(
    template: ReflectionTemplate,
    context: MIResponseContext
  ): string {
    const lang = context.language;
    const text = lang === 'ru' ? template.patternRu : template.pattern;

    // For reflections, we need to extract content from the last utterance
    if (!context.lastUtterance) {
      return lang === 'ru'
        ? 'Расскажите мне больше.'
        : 'Tell me more.';
    }

    // Simple placeholder filling based on reflection type
    const utteranceText = context.lastUtterance.text;

    switch (template.type) {
      case 'rephrase':
        return text.replace('{rephrased_content}', this.rephrase(utteranceText, lang));

      case 'feeling':
        return text
          .replace('{emotion}', this.inferEmotion(utteranceText, lang))
          .replace('{topic}', this.extractTopic(utteranceText, lang));

      case 'meaning':
        return text.replace('{deeper_meaning}', this.inferMeaning(utteranceText, lang));

      case 'double_sided':
        return text
          .replace('{pro_change}', context.motivationalState.ambivalence.prosForChange[0] || (lang === 'ru' ? 'вы хотите изменений' : 'you want change'))
          .replace('{against_change}', context.motivationalState.ambivalence.prosForStatusQuo[0] || (lang === 'ru' ? 'есть то, что вас сдерживает' : 'something is holding you back'));

      case 'amplified':
        return text.replace('{exaggerated}', this.amplify(utteranceText, lang));

      case 'reframe':
        return text.replace('{reframed_perspective}', this.reframe(utteranceText, lang));

      default:
        return lang === 'ru'
          ? `То есть ${utteranceText.toLowerCase()}.`
          : `So ${utteranceText.toLowerCase()}.`;
    }
  }

  private fillSummaryTemplate(
    template: SummaryTemplate,
    context: MIResponseContext
  ): string {
    const lang = context.language;
    let text = lang === 'ru' ? template.structureRu : template.structure;

    // Build summary sections
    const sections: Record<string, string> = {};

    if (template.includeSections.includes('change_talk')) {
      const ctUtterances = context.motivationalState.recentUtterances
        .filter(u => u.category === 'change_talk')
        .slice(-3)
        .map(u => u.text);

      sections['change_talk_summary'] = ctUtterances.length > 0
        ? ctUtterances.join('; ')
        : (lang === 'ru' ? 'некоторые мысли об изменениях' : 'some thoughts about change');
    }

    if (template.includeSections.includes('values')) {
      sections['values_connection'] = context.userValues?.length
        ? (lang === 'ru'
          ? `Это связано с тем, что для вас важно: ${context.userValues[0]}.`
          : `This connects to what matters to you: ${context.userValues[0]}.`)
        : '';
    }

    // Fill in sections
    for (const [key, value] of Object.entries(sections)) {
      text = text.replace(`{${key}}`, value);
    }

    // Add transition phrase if present
    if (template.transitionPhrase) {
      const transition = lang === 'ru' ? template.transitionPhraseRu : template.transitionPhrase;
      text = `${text} ${transition}`;
    }

    return text;
  }

  private getPlaceholderValue(placeholder: string, context: MIResponseContext): string {
    const lang = context.language;

    switch (placeholder) {
      case 'behavior':
        return context.targetBehavior || (lang === 'ru' ? 'это' : 'this');

      case 'goal':
        return context.userGoals?.[0] || (lang === 'ru' ? 'достичь этого' : 'achieve this');

      case 'strength':
        return lang === 'ru' ? 'заботитесь о себе' : 'care about yourself';

      case 'action':
        return lang === 'ru' ? 'быть здесь' : 'be here';

      case 'progress':
        return lang === 'ru' ? 'вашими усилиями' : 'your efforts';

      case 'value':
        return context.userValues?.[0] || (lang === 'ru' ? 'это' : 'this');

      case 'intention':
        return lang === 'ru' ? 'изменениям' : 'change';

      default:
        return lang === 'ru' ? 'это' : 'this';
    }
  }

  // ============================================================
  // LANGUAGE PROCESSING HELPERS
  // ============================================================

  private rephrase(text: string, lang: 'ru' | 'en'): string {
    // Simple rephrasing - in production, would use NLP
    return text.toLowerCase()
      .replace(/^я /, lang === 'ru' ? 'вы ' : 'you ')
      .replace(/^i /, 'you ');
  }

  private inferEmotion(text: string, lang: 'ru' | 'en'): string {
    const lowerText = text.toLowerCase();

    const emotionMap = {
      ru: {
        'устал': 'усталость',
        'злюсь': 'раздражение',
        'боюсь': 'беспокойство',
        'рад': 'радость',
        'грустно': 'грусть',
        'стресс': 'напряжение'
      },
      en: {
        'tired': 'exhausted',
        'angry': 'frustrated',
        'afraid': 'worried',
        'happy': 'joy',
        'sad': 'sadness',
        'stressed': 'tension'
      }
    };

    for (const [keyword, emotion] of Object.entries(emotionMap[lang])) {
      if (lowerText.includes(keyword)) {
        return emotion;
      }
    }

    return lang === 'ru' ? 'это важно для вас' : 'this matters to you';
  }

  private extractTopic(text: string, lang: 'ru' | 'en'): string {
    // Simple topic extraction - in production, would use NLP
    const words = text.split(' ').filter(w => w.length > 4);
    return words.slice(0, 3).join(' ') || (lang === 'ru' ? 'этом' : 'this');
  }

  private inferMeaning(text: string, lang: 'ru' | 'en'): string {
    // Infer deeper meaning - in production, would use NLP/LLM
    const lowerText = text.toLowerCase();

    if (lowerText.includes(lang === 'ru' ? 'семья' : 'family') ||
        lowerText.includes(lang === 'ru' ? 'дети' : 'kids')) {
      return lang === 'ru' ? 'быть хорошим родителем' : 'being a good parent';
    }

    if (lowerText.includes(lang === 'ru' ? 'работа' : 'work') ||
        lowerText.includes(lang === 'ru' ? 'карьера' : 'career')) {
      return lang === 'ru' ? 'профессиональный успех' : 'professional success';
    }

    if (lowerText.includes(lang === 'ru' ? 'здоровье' : 'health')) {
      return lang === 'ru' ? 'забота о себе' : 'taking care of yourself';
    }

    return lang === 'ru' ? 'то, что действительно важно' : 'what really matters';
  }

  private amplify(text: string, lang: 'ru' | 'en'): string {
    // Amplified reflection for sustain talk
    const lowerText = text.toLowerCase();

    if (lowerText.includes(lang === 'ru' ? 'не могу' : "can't")) {
      return lang === 'ru'
        ? 'совершенно невозможно что-либо изменить'
        : "it's absolutely impossible to change anything";
    }

    if (lowerText.includes(lang === 'ru' ? 'никогда' : 'never')) {
      return lang === 'ru'
        ? 'это навсегда останется таким'
        : "it will stay this way forever";
    }

    return lang === 'ru'
      ? 'изменить что-либо в этой ситуации'
      : 'change anything about this situation';
  }

  private reframe(text: string, lang: 'ru' | 'en'): string {
    // Reframing perspective
    const lowerText = text.toLowerCase();

    if (lowerText.includes(lang === 'ru' ? 'провал' : 'fail') ||
        lowerText.includes(lang === 'ru' ? 'неудача' : 'failure')) {
      return lang === 'ru'
        ? 'это был опыт, который научил вас чему-то важному'
        : "it was an experience that taught you something valuable";
    }

    if (lowerText.includes(lang === 'ru' ? 'проблема' : 'problem')) {
      return lang === 'ru'
        ? 'это возможность для роста'
        : "it's an opportunity for growth";
    }

    return lang === 'ru'
      ? 'в этом есть скрытая сила'
      : "there's hidden strength in this";
  }

  // ============================================================
  // FALLBACK AND SYSTEM PROMPT BUILDERS
  // ============================================================

  private buildMISystemPrompt(
    constraints: MIGenerationConstraints,
    context: MIResponseContext
  ): string {
    const lang = constraints.language;

    return lang === 'ru' ? `
Ты — эмпатичный собеседник, использующий принципы мотивационного интервьюирования (MI).

ПРАВИЛА:
1. НИКОГДА не используй директивный язык ("должны", "нужно", "следует")
2. ВСЕГДА отражай чувства и смыслы
3. ВСЕГДА поддерживай автономию пользователя
4. Используй открытые вопросы
5. Делай комплексные рефлексии

ИЗБЕГАЙ: ${constraints.avoidPhrases.join(', ')}

РАЗРЕШЕНО: ${constraints.allowedBehaviors.join(', ')}
ЗАПРЕЩЕНО: ${constraints.forbiddenBehaviors.join(', ')}

Максимальная длина ответа: ${constraints.maxLength} символов.
` : `
You are an empathic conversationalist using Motivational Interviewing (MI) principles.

RULES:
1. NEVER use directive language ("should", "need to", "must")
2. ALWAYS reflect feelings and meanings
3. ALWAYS support user autonomy
4. Use open-ended questions
5. Make complex reflections

AVOID: ${constraints.avoidPhrases.join(', ')}

ALLOWED: ${constraints.allowedBehaviors.join(', ')}
FORBIDDEN: ${constraints.forbiddenBehaviors.join(', ')}

Maximum response length: ${constraints.maxLength} characters.
`;
  }

  private buildUserPrompt(prompt: string, context: MIResponseContext): string {
    const lang = context.language;
    const state = context.motivationalState;

    return lang === 'ru' ? `
Контекст:
- Стадия изменений: ${state.linkedStage}
- Соотношение CT/ST: ${(state.languageBalance.changeTalkRatio * 100).toFixed(0)}%
- Уровень раппорта: ${(state.rapportLevel * 100).toFixed(0)}%
- Стратегия: ${state.recommendedStrategy}

Последнее сообщение пользователя: "${context.lastUtterance?.text || ''}"

Задача: ${prompt}
` : `
Context:
- Change stage: ${state.linkedStage}
- CT/ST ratio: ${(state.languageBalance.changeTalkRatio * 100).toFixed(0)}%
- Rapport level: ${(state.rapportLevel * 100).toFixed(0)}%
- Strategy: ${state.recommendedStrategy}

Last user message: "${context.lastUtterance?.text || ''}"

Task: ${prompt}
`;
  }

  private async generateFallbackResponse(
    context: MIResponseContext,
    constraints: MIGenerationConstraints
  ): Promise<string> {
    const lang = constraints.language;
    const state = context.motivationalState;

    // Generate based on strategy
    switch (state.recommendedStrategy) {
      case 'build_rapport':
        return lang === 'ru'
          ? 'Спасибо, что поделились этим со мной. Расскажите, что для вас сейчас важнее всего?'
          : 'Thank you for sharing that with me. What matters most to you right now?';

      case 'evoke_change_talk':
        if (constraints.targetChangeTalk) {
          return this.getTargetedQuestion(constraints.targetChangeTalk, lang);
        }
        return lang === 'ru'
          ? 'Что бы вы хотели изменить в этой ситуации?'
          : 'What would you like to change about this situation?';

      case 'explore_ambivalence':
        return lang === 'ru'
          ? 'С одной стороны, вы видите причины для изменений, а с другой — есть то, что вас сдерживает. Расскажите об этом подробнее.'
          : "On one hand, you see reasons for change, and on the other, something is holding you back. Tell me more about that.";

      case 'strengthen_commitment':
        return lang === 'ru'
          ? 'Вы упоминали о желании измениться. Что поможет вам сделать следующий шаг?'
          : "You've mentioned wanting to change. What would help you take the next step?";

      case 'support_self_efficacy':
        return lang === 'ru'
          ? 'Вы уже справлялись с трудными ситуациями раньше. Какие ваши сильные стороны могут помочь сейчас?'
          : "You've handled difficult situations before. What strengths of yours could help now?";

      case 'roll_with_resistance':
        return lang === 'ru'
          ? 'Я слышу, что это непросто. Вы лучше всех знаете свою ситуацию. Что было бы полезно обсудить?'
          : "I hear that this isn't easy. You know your situation best. What would be helpful to discuss?";

      default:
        return lang === 'ru'
          ? 'Расскажите мне больше о том, что вы чувствуете.'
          : 'Tell me more about how you feel.';
    }
  }

  private getTargetedQuestion(target: ChangeTaskSubtype, lang: 'ru' | 'en'): string {
    const questions: Record<ChangeTaskSubtype, { ru: string; en: string }> = {
      desire: {
        ru: 'Что бы вы хотели, чтобы было по-другому?',
        en: 'What would you like to be different?'
      },
      ability: {
        ru: 'Какие у вас есть ресурсы для этого?',
        en: 'What resources do you have for this?'
      },
      reasons: {
        ru: 'Почему для вас это важно?',
        en: 'Why is this important to you?'
      },
      need: {
        ru: 'Насколько срочно для вас это изменение?',
        en: 'How urgent is this change for you?'
      },
      commitment: {
        ru: 'Что вы готовы попробовать?',
        en: 'What are you willing to try?'
      },
      activation: {
        ru: 'Что поможет вам начать?',
        en: 'What would help you get started?'
      },
      taking_steps: {
        ru: 'Какой первый шаг вы могли бы сделать?',
        en: 'What first step could you take?'
      }
    };

    return questions[target][lang];
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default MIResponseGenerator;
