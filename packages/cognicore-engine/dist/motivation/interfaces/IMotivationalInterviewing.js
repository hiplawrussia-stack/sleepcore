"use strict";
/**
 * MOTIVATIONAL INTERVIEWING TECHNIQUES INTERFACE
 * ================================================
 * OARS + MITI 4.2 Behavior Codes for AI-MI System
 *
 * Scientific Foundation:
 * - MITI 4.2 Coding Manual (Moyers et al., 2014)
 * - OARS Framework (Miller & Rollnick, 2013)
 * - AI-MI Best Practices (JMIR 2025 Scoping Review)
 * - LLM Chain-of-Thought for MI (arXiv:2505.17380)
 *
 * Key Innovation:
 * - Computational implementation of MI therapist behaviors
 * - Real-time response generation following MI principles
 * - Fidelity tracking using MITI 4.2 global scores
 *
 * BФ "Другой путь" | CogniCore Phase 4.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MITI_THRESHOLDS = exports.DISCORD_RESPONSE_STRATEGIES = exports.SUMMARY_TEMPLATES = exports.REFLECTION_TEMPLATES = exports.AFFIRMATION_TEMPLATES = exports.OPEN_QUESTION_TEMPLATES = void 0;
// ============================================================
// TEMPLATE LIBRARIES
// ============================================================
/**
 * Open question templates for evoking change talk
 */
exports.OPEN_QUESTION_TEMPLATES = [
    // Desire (D)
    {
        id: 'oq_desire_1',
        category: 'goals',
        template: 'What would you like to be different about {behavior}?',
        templateRu: 'Что бы вы хотели изменить в {behavior}?',
        placeholders: ['behavior'],
        targetChangeTalk: ['desire'],
        appropriateStages: ['explore_ambivalence', 'evoke_change_talk'],
        examples: ['What would you like to be different about your phone usage?'],
        examplesRu: ['Что бы вы хотели изменить в использовании телефона?']
    },
    {
        id: 'oq_desire_2',
        category: 'values',
        template: 'How would you like things to be?',
        templateRu: 'Как бы вам хотелось, чтобы всё было?',
        placeholders: [],
        targetChangeTalk: ['desire'],
        appropriateStages: ['explore_ambivalence', 'evoke_change_talk'],
        examples: ['How would you like things to be?'],
        examplesRu: ['Как бы вам хотелось, чтобы всё было?']
    },
    // Ability (A)
    {
        id: 'oq_ability_1',
        category: 'resources',
        template: 'What strengths do you have that could help with {goal}?',
        templateRu: 'Какие ваши сильные стороны могли бы помочь с {goal}?',
        placeholders: ['goal'],
        targetChangeTalk: ['ability'],
        appropriateStages: ['support_self_efficacy', 'strengthen_commitment'],
        examples: ['What strengths do you have that could help with reducing screen time?'],
        examplesRu: ['Какие ваши сильные стороны могли бы помочь с уменьшением экранного времени?']
    },
    {
        id: 'oq_ability_2',
        category: 'confidence',
        template: 'When have you successfully made a change like this before?',
        templateRu: 'Когда вам раньше удавалось сделать подобное изменение?',
        placeholders: [],
        targetChangeTalk: ['ability'],
        appropriateStages: ['support_self_efficacy'],
        examples: ['When have you successfully made a change like this before?'],
        examplesRu: ['Когда вам раньше удавалось сделать подобное изменение?']
    },
    // Reasons (R)
    {
        id: 'oq_reasons_1',
        category: 'values',
        template: 'What are the most important reasons you would want to {goal}?',
        templateRu: 'Какие самые важные причины, по которым вы хотели бы {goal}?',
        placeholders: ['goal'],
        targetChangeTalk: ['reasons'],
        appropriateStages: ['develop_discrepancy', 'explore_ambivalence'],
        examples: ['What are the most important reasons you would want to spend less time gaming?'],
        examplesRu: ['Какие самые важные причины, по которым вы хотели бы меньше играть?']
    },
    {
        id: 'oq_reasons_2',
        category: 'values',
        template: 'How does {behavior} connect to what matters most to you?',
        templateRu: 'Как {behavior} связано с тем, что для вас важнее всего?',
        placeholders: ['behavior'],
        targetChangeTalk: ['reasons'],
        appropriateStages: ['develop_discrepancy'],
        examples: ['How does your social media use connect to what matters most to you?'],
        examplesRu: ['Как использование соцсетей связано с тем, что для вас важнее всего?']
    },
    // Need (N)
    {
        id: 'oq_need_1',
        category: 'importance',
        template: 'How urgent is it for you to make this change?',
        templateRu: 'Насколько срочно для вас сделать это изменение?',
        placeholders: [],
        targetChangeTalk: ['need'],
        appropriateStages: ['explore_ambivalence', 'strengthen_commitment'],
        examples: ['How urgent is it for you to make this change?'],
        examplesRu: ['Насколько срочно для вас сделать это изменение?']
    },
    {
        id: 'oq_need_2',
        category: 'importance',
        template: 'What would happen if things stayed the same?',
        templateRu: 'Что произойдёт, если всё останется по-прежнему?',
        placeholders: [],
        targetChangeTalk: ['need'],
        appropriateStages: ['develop_discrepancy'],
        examples: ['What would happen if things stayed the same?'],
        examplesRu: ['Что произойдёт, если всё останется по-прежнему?']
    },
    // Commitment (C)
    {
        id: 'oq_commitment_1',
        category: 'next_steps',
        template: 'What are you willing to try?',
        templateRu: 'Что вы готовы попробовать?',
        placeholders: [],
        targetChangeTalk: ['commitment', 'activation'],
        appropriateStages: ['strengthen_commitment', 'action_planning'],
        examples: ['What are you willing to try?'],
        examplesRu: ['Что вы готовы попробовать?']
    },
    // Activation (A)
    {
        id: 'oq_activation_1',
        category: 'next_steps',
        template: 'What would be a good first step?',
        templateRu: 'Какой был бы хороший первый шаг?',
        placeholders: [],
        targetChangeTalk: ['activation', 'taking_steps'],
        appropriateStages: ['action_planning'],
        examples: ['What would be a good first step?'],
        examplesRu: ['Какой был бы хороший первый шаг?']
    },
    // Taking Steps (T)
    {
        id: 'oq_taking_steps_1',
        category: 'next_steps',
        template: 'What have you already tried that worked, even a little?',
        templateRu: 'Что вы уже пробовали, что сработало хотя бы немного?',
        placeholders: [],
        targetChangeTalk: ['taking_steps'],
        appropriateStages: ['support_self_efficacy', 'action_planning'],
        examples: ['What have you already tried that worked, even a little?'],
        examplesRu: ['Что вы уже пробовали, что сработало хотя бы немного?']
    }
];
/**
 * Affirmation templates
 */
exports.AFFIRMATION_TEMPLATES = [
    {
        id: 'aff_strength_1',
        type: 'strength',
        template: 'You clearly {strength}.',
        templateRu: 'Очевидно, что вы {strength}.',
        placeholders: ['strength'],
        appropriateFor: {
            stages: ['support_self_efficacy', 'strengthen_commitment'],
            afterDiscord: false
        }
    },
    {
        id: 'aff_effort_1',
        type: 'effort',
        template: 'It takes courage to {action}.',
        templateRu: 'Требуется смелость, чтобы {action}.',
        placeholders: ['action'],
        appropriateFor: {
            stages: ['build_rapport', 'support_self_efficacy'],
            afterDiscord: true
        }
    },
    {
        id: 'aff_progress_1',
        type: 'progress',
        template: 'You\'ve made real progress with {progress}.',
        templateRu: 'Вы добились реального прогресса в {progress}.',
        placeholders: ['progress'],
        appropriateFor: {
            minChangeTalkRatio: 0.5,
            stages: ['action_planning', 'relapse_prevention']
        }
    },
    {
        id: 'aff_value_1',
        type: 'value',
        template: 'It\'s clear how much you value {value}.',
        templateRu: 'Видно, как много для вас значит {value}.',
        placeholders: ['value'],
        appropriateFor: {
            stages: ['develop_discrepancy', 'explore_ambivalence']
        }
    },
    {
        id: 'aff_intention_1',
        type: 'intention',
        template: 'Your commitment to {intention} is inspiring.',
        templateRu: 'Ваша приверженность {intention} вдохновляет.',
        placeholders: ['intention'],
        appropriateFor: {
            minChangeTalkRatio: 0.6,
            stages: ['strengthen_commitment', 'action_planning']
        }
    }
];
/**
 * Reflection pattern templates
 */
exports.REFLECTION_TEMPLATES = [
    // Simple reflections
    {
        id: 'ref_simple_rephrase',
        type: 'rephrase',
        pattern: 'So you {rephrased_content}.',
        patternRu: 'Итак, вы {rephrased_content}.',
        complexity: 'simple',
        target: 'change_talk',
        examples: [
            {
                input: 'I want to spend more time with my family',
                output: 'So you want to have more quality time with your family.',
                outputRu: 'Итак, вы хотите проводить больше времени с семьёй.'
            }
        ]
    },
    // Complex reflections
    {
        id: 'ref_complex_feeling',
        type: 'feeling',
        pattern: 'It sounds like you\'re feeling {emotion} about {topic}.',
        patternRu: 'Похоже, вы чувствуете {emotion} по поводу {topic}.',
        complexity: 'complex',
        target: 'feeling',
        examples: [
            {
                input: 'I don\'t know what to do anymore',
                output: 'It sounds like you\'re feeling overwhelmed about this situation.',
                outputRu: 'Похоже, вы чувствуете себя подавленным в этой ситуации.'
            }
        ]
    },
    {
        id: 'ref_complex_meaning',
        type: 'meaning',
        pattern: 'What I hear is that {deeper_meaning} is really important to you.',
        patternRu: 'Я слышу, что {deeper_meaning} действительно важно для вас.',
        complexity: 'complex',
        target: 'meaning',
        examples: [
            {
                input: 'I need to be there for my kids',
                output: 'What I hear is that being a present parent is really important to you.',
                outputRu: 'Я слышу, что быть рядом с детьми действительно важно для вас.'
            }
        ]
    },
    {
        id: 'ref_complex_double_sided',
        type: 'double_sided',
        pattern: 'On one hand {pro_change}, and on the other hand {against_change}.',
        patternRu: 'С одной стороны {pro_change}, а с другой стороны {against_change}.',
        complexity: 'complex',
        target: 'ambivalence',
        examples: [
            {
                input: 'I want to change but I also enjoy gaming',
                output: 'On one hand you want to make a change, and on the other hand gaming gives you enjoyment.',
                outputRu: 'С одной стороны вы хотите измениться, а с другой стороны игры приносят удовольствие.'
            }
        ]
    },
    {
        id: 'ref_complex_amplified',
        type: 'amplified',
        pattern: 'So there\'s absolutely no way you could ever {exaggerated}.',
        patternRu: 'То есть совершенно невозможно, чтобы вы когда-либо {exaggerated}.',
        complexity: 'complex',
        target: 'sustain_talk',
        examples: [
            {
                input: 'I can\'t stop using my phone',
                output: 'So there\'s absolutely no way you could ever put your phone down, even for a minute.',
                outputRu: 'То есть совершенно невозможно, чтобы вы когда-либо отложили телефон, даже на минуту.'
            }
        ]
    },
    {
        id: 'ref_complex_reframe',
        type: 'reframe',
        pattern: 'Another way to look at this is {reframed_perspective}.',
        patternRu: 'Другой взгляд на это — {reframed_perspective}.',
        complexity: 'complex',
        target: 'change_talk',
        examples: [
            {
                input: 'I failed at this before',
                output: 'Another way to look at this is that you now have experience about what doesn\'t work.',
                outputRu: 'Другой взгляд на это — теперь у вас есть опыт того, что не работает.'
            }
        ]
    }
];
/**
 * Summary templates
 */
exports.SUMMARY_TEMPLATES = [
    {
        id: 'sum_collecting',
        type: 'collecting',
        structure: 'Let me see if I\'ve got this right. You\'ve mentioned {change_talk_summary}. {values_connection}',
        structureRu: 'Позвольте уточнить, правильно ли я понял. Вы упоминали {change_talk_summary}. {values_connection}',
        includeSections: ['change_talk', 'values']
    },
    {
        id: 'sum_linking',
        type: 'linking',
        structure: 'Earlier you said {past_statement}. Now you\'re saying {current_statement}. {connection}',
        structureRu: 'Раньше вы говорили {past_statement}. Сейчас вы говорите {current_statement}. {connection}',
        includeSections: ['change_talk', 'goals']
    },
    {
        id: 'sum_transitional',
        type: 'transitional',
        structure: 'So far we\'ve talked about {summary_points}. {transition_to_next}',
        structureRu: 'До сих пор мы говорили о {summary_points}. {transition_to_next}',
        includeSections: ['change_talk', 'strengths', 'next_steps'],
        transitionPhrase: 'Where would you like to go from here?',
        transitionPhraseRu: 'Куда бы вы хотели двигаться дальше?'
    }
];
/**
 * Discord response strategies
 */
exports.DISCORD_RESPONSE_STRATEGIES = {
    arguing: {
        primaryResponse: 'reflection_complex',
        templates: [
            'You\'re not convinced that this is an issue.',
            'It sounds like you see things differently.'
        ],
        templatesRu: [
            'Вы не убеждены, что это проблема.',
            'Похоже, вы видите это иначе.'
        ],
        avoid: ['arguing back', 'presenting evidence', 'proving point']
    },
    interrupting: {
        primaryResponse: 'emphasize_autonomy',
        templates: [
            'I apologize, please continue.',
            'I want to make sure I hear what you\'re saying.'
        ],
        templatesRu: [
            'Извините, пожалуйста, продолжайте.',
            'Я хочу убедиться, что слышу, что вы говорите.'
        ],
        avoid: ['talking over', 'continuing anyway']
    },
    negating: {
        primaryResponse: 'reflection_simple',
        templates: [
            'You don\'t agree with that.',
            'That doesn\'t fit with your experience.'
        ],
        templatesRu: [
            'Вы с этим не согласны.',
            'Это не соответствует вашему опыту.'
        ],
        avoid: ['insisting', 'repeating same point']
    },
    ignoring: {
        primaryResponse: 'seek_collaboration',
        templates: [
            'What would be more helpful to talk about?',
            'I sense this isn\'t quite what you need right now.'
        ],
        templatesRu: [
            'О чём было бы полезнее поговорить?',
            'Чувствую, сейчас вам нужно что-то другое.'
        ],
        avoid: ['forcing topic', 'continuing same direction']
    },
    defending: {
        primaryResponse: 'affirm',
        templates: [
            'You had your reasons for doing what you did.',
            'You were dealing with a difficult situation.'
        ],
        templatesRu: [
            'У вас были причины поступить так, как вы поступили.',
            'Вы справлялись с трудной ситуацией.'
        ],
        avoid: ['challenging', 'questioning motives']
    },
    squaring_off: {
        primaryResponse: 'emphasize_autonomy',
        templates: [
            'You\'re the expert on your own life.',
            'Only you can decide what\'s right for you.'
        ],
        templatesRu: [
            'Вы эксперт в своей собственной жизни.',
            'Только вы можете решить, что для вас правильно.'
        ],
        avoid: ['competing', 'asserting authority']
    }
};
// ============================================================
// MITI 4.2 THRESHOLDS
// ============================================================
/**
 * MITI 4.2 competency thresholds
 */
exports.MITI_THRESHOLDS = {
    // Global scores (1-5 scale)
    global: {
        belowThreshold: { cultivatingChangeTalk: 2.5, softeningSustainTalk: 2.5, partnership: 3.0, empathy: 3.0 },
        competent: { cultivatingChangeTalk: 3.0, softeningSustainTalk: 3.0, partnership: 3.5, empathy: 3.5 },
        proficient: { cultivatingChangeTalk: 4.0, softeningSustainTalk: 4.0, partnership: 4.0, empathy: 4.0 }
    },
    // Summary scores
    summary: {
        competent: {
            reflectionToQuestionRatio: 1.0,
            percentComplexReflections: 40,
            percentOpenQuestions: 50
        },
        proficient: {
            reflectionToQuestionRatio: 2.0,
            percentComplexReflections: 50,
            percentOpenQuestions: 70
        }
    }
};
//# sourceMappingURL=IMotivationalInterviewing.js.map