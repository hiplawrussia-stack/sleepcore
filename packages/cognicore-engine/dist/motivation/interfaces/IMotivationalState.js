"use strict";
/**
 * 🎯 MOTIVATIONAL STATE INTERFACE
 * ================================
 * World-First Integration of MI Theory with Computational Models
 *
 * Scientific Foundation (2024-2025 Research):
 * - Motivational Interviewing (Miller & Rollnick, 2013)
 * - MITI 4.2 Coding System (Moyers et al., 2014)
 * - MISC 2.5 Client Language Coding (CASAA)
 * - DARN-CAT Framework for Change Talk
 * - AI-Augmented MI (arXiv:2505.17380, 2025)
 * - BiMISC Dataset (ACL 2024)
 * - LLM MI Scoping Review (JMIR 2025)
 *
 * Key Innovation:
 * - Real-time Change Talk / Sustain Talk detection
 * - DARN-CAT classification for motivation assessment
 * - Readiness Ruler digital implementation
 * - MI-consistent response selection
 * - Integration with existing INarrativeState.stage
 *
 * БФ "Другой путь" | CogniCore Phase 4.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRATEGY_RECOMMENDATIONS = exports.DISCORD_PATTERNS = exports.SUSTAIN_TALK_PATTERNS = exports.CHANGE_TALK_PATTERNS = void 0;
// ============================================================
// KEYWORDS AND PATTERNS (RUSSIAN + ENGLISH)
// ============================================================
/**
 * Change Talk detection patterns
 * Based on MISC 2.5 coding manual + Russian adaptations
 */
exports.CHANGE_TALK_PATTERNS = {
    desire: {
        keywords: ['want to', 'wish', 'would like', 'hope to', 'prefer'],
        keywordsRu: ['хочу', 'хотел бы', 'желаю', 'мечтаю', 'надеюсь'],
        patterns: [/I (want|wish|would like) to/i, /I hope I could/i],
        patternsRu: [/хочу .* меньше/i, /хотел бы .* изменить/i],
        strength: 2
    },
    ability: {
        keywords: ['can', 'could', 'able to', 'possible', 'might be able'],
        keywordsRu: ['могу', 'мог бы', 'способен', 'в состоянии', 'получится'],
        patterns: [/I (can|could|am able to)/i, /it's possible for me/i],
        patternsRu: [/я (могу|мог бы|способен)/i, /у меня получится/i],
        strength: 2
    },
    reasons: {
        keywords: ['because', 'so that', 'would help', 'benefit', 'important because'],
        keywordsRu: ['потому что', 'чтобы', 'поможет', 'важно', 'польза'],
        patterns: [/it would (help|benefit|improve)/i, /important because/i],
        patternsRu: [/это (поможет|улучшит)/i, /важно,? потому что/i],
        strength: 2
    },
    need: {
        keywords: ['need to', 'have to', 'must', 'got to', 'should'],
        keywordsRu: ['надо', 'нужно', 'должен', 'необходимо', 'пора'],
        patterns: [/I (need|have|got) to/i, /I (really )?must/i],
        patternsRu: [/мне (надо|нужно|необходимо)/i, /я должен/i],
        strength: 3
    },
    commitment: {
        keywords: ['will', 'going to', 'intend to', 'plan to', 'promise'],
        keywordsRu: ['буду', 'собираюсь', 'намерен', 'планирую', 'обещаю'],
        patterns: [/I (will|am going to|intend to)/i, /I promise/i],
        patternsRu: [/я (буду|собираюсь|намерен)/i, /я обещаю/i],
        strength: 4
    },
    activation: {
        keywords: ['ready', 'willing', 'prepared', 'want to start'],
        keywordsRu: ['готов', 'согласен', 'хочу начать', 'решил'],
        patterns: [/I('m| am) ready to/i, /I('m| am) willing to/i],
        patternsRu: [/я готов/i, /я решил/i, /хочу начать/i],
        strength: 4
    },
    taking_steps: {
        keywords: ['started', 'have been', 'already', 'trying', 'working on'],
        keywordsRu: ['начал', 'уже', 'пробую', 'работаю над', 'делаю'],
        patterns: [/I('ve| have) (started|been)/i, /I('m| am) (trying|working on)/i],
        patternsRu: [/я (начал|уже|пробую)/i, /работаю над/i],
        strength: 5
    }
};
/**
 * Sustain Talk detection patterns
 */
exports.SUSTAIN_TALK_PATTERNS = {
    desire_against: {
        keywords: ["don't want", "not interested", "prefer not", "like it"],
        keywordsRu: ['не хочу', 'мне нравится', 'не собираюсь', 'не интересно'],
        patterns: [/I (don't|do not) want to/i, /I like it the way/i],
        patternsRu: [/я не хочу/i, /мне нравится как есть/i],
        strength: -2
    },
    ability_against: {
        keywords: ["can't", "unable", "impossible", "too hard"],
        keywordsRu: ['не могу', 'невозможно', 'слишком сложно', 'не способен'],
        patterns: [/I (can't|cannot|am unable to)/i, /it's (too hard|impossible)/i],
        patternsRu: [/я не могу/i, /это (невозможно|слишком сложно)/i],
        strength: -2
    },
    reasons_against: {
        keywords: ['because I need', 'helps me', 'makes me feel', 'not that bad'],
        keywordsRu: ['потому что мне нужно', 'помогает мне', 'не так уж плохо'],
        patterns: [/it (helps|makes) me/i, /not (that|so) bad/i],
        patternsRu: [/(помогает|нужно) мне/i, /не так уж плохо/i],
        strength: -2
    },
    need_against: {
        keywords: ['need it', 'have to use', 'depend on', 'necessary for'],
        keywordsRu: ['мне это нужно', 'зависим от', 'необходимо для'],
        patterns: [/I need (it|this)/i, /I (depend|rely) on/i],
        patternsRu: [/мне (это )?нужно/i, /я (завишу|полагаюсь)/i],
        strength: -3
    },
    commitment_against: {
        keywords: ["won't", "not going to", "refuse", "never will"],
        keywordsRu: ['не буду', 'не собираюсь', 'отказываюсь', 'никогда'],
        patterns: [/I (won't|will not|am not going to)/i, /I refuse to/i],
        patternsRu: [/я (не буду|не собираюсь)/i, /я отказываюсь/i],
        strength: -4
    },
    activation_against: {
        keywords: ['not ready', 'not willing', 'not prepared', 'not yet'],
        keywordsRu: ['не готов', 'не хочу сейчас', 'ещё не время'],
        patterns: [/I('m| am) not ready/i, /not (yet|now)/i],
        patternsRu: [/я не готов/i, /ещё не (время|готов)/i],
        strength: -4
    },
    taking_steps_against: {
        keywords: ['keep doing', 'went back', 'still', 'continue'],
        keywordsRu: ['продолжаю', 'вернулся к', 'всё ещё', 'опять'],
        patterns: [/I (keep|still|continue)/i, /I went back to/i],
        patternsRu: [/я (продолжаю|вернулся)/i, /всё ещё/i],
        strength: -5
    }
};
/**
 * Discord/Resistance patterns
 */
exports.DISCORD_PATTERNS = {
    arguing: {
        keywords: ['but', 'however', "that's not true", 'you don\'t understand', 'wrong'],
        keywordsRu: ['но', 'однако', 'это неправда', 'вы не понимаете', 'неправильно'],
        patterns: [/(but|however),? (I|you)/i, /that's (not true|wrong)/i]
    },
    interrupting: {
        keywords: ['wait', 'let me finish', 'hold on'],
        keywordsRu: ['подождите', 'дайте закончить', 'минуту'],
        patterns: [/wait,? (I|let me)/i]
    },
    negating: {
        keywords: ['no', 'nope', 'not really', 'I disagree'],
        keywordsRu: ['нет', 'не совсем', 'не согласен', 'неа'],
        patterns: [/^no[,.]?/i, /not really/i]
    },
    ignoring: {
        keywords: ['anyway', 'whatever', 'moving on', 'different topic'],
        keywordsRu: ['в любом случае', 'неважно', 'давайте о другом'],
        patterns: [/(anyway|whatever|nevermind)/i]
    },
    defending: {
        keywords: ["it's not my fault", "I had to", "what else could I", "anyone would"],
        keywordsRu: ['это не моя вина', 'мне пришлось', 'что мне было делать', 'любой бы'],
        patterns: [/it's not my fault/i, /I had (to|no choice)/i]
    },
    squaring_off: {
        keywords: ['we\'ll see', 'make me', 'try me', 'you can\'t'],
        keywordsRu: ['посмотрим', 'попробуй', 'вы не можете'],
        patterns: [/(we'll see|try me|make me)/i]
    }
};
/**
 * Strategy recommendations based on state
 */
exports.STRATEGY_RECOMMENDATIONS = {
    precontemplation: {
        primaryStrategy: 'build_rapport',
        secondaryStrategies: ['develop_discrepancy', 'roll_with_resistance'],
        focus: [
            'Establish trust and safety',
            'Understand their perspective',
            'Plant seeds of doubt gently',
            'Avoid direct persuasion'
        ],
        avoid: [
            'Pushing for change',
            'Giving advice',
            'Arguing for change',
            'Labeling behavior as problematic'
        ]
    },
    contemplation: {
        primaryStrategy: 'explore_ambivalence',
        secondaryStrategies: ['evoke_change_talk', 'develop_discrepancy'],
        focus: [
            'Explore both sides of ambivalence',
            'Reflect change talk selectively',
            'Develop discrepancy with values',
            'Build importance of change'
        ],
        avoid: [
            'Decisional balance sheets',
            'Premature action planning',
            'Taking the change side of argument'
        ]
    },
    preparation: {
        primaryStrategy: 'strengthen_commitment',
        secondaryStrategies: ['support_self_efficacy', 'summarize_and_transition'],
        focus: [
            'Strengthen commitment language',
            'Build confidence for change',
            'Explore specific plans',
            'Mobilize support systems'
        ],
        avoid: [
            'Overwhelming with options',
            'Creating dependency',
            'Skipping confidence building'
        ]
    },
    action: {
        primaryStrategy: 'action_planning',
        secondaryStrategies: ['support_self_efficacy', 'relapse_prevention'],
        focus: [
            'Concrete action steps',
            'Celebrate progress',
            'Troubleshoot obstacles',
            'Strengthen new identity'
        ],
        avoid: [
            'Complacency',
            'Ignoring challenges',
            'Taking credit for their change'
        ]
    },
    maintenance: {
        primaryStrategy: 'relapse_prevention',
        secondaryStrategies: ['support_self_efficacy', 'strengthen_commitment'],
        focus: [
            'Identify high-risk situations',
            'Strengthen coping strategies',
            'Celebrate sustained change',
            'Plan for setbacks'
        ],
        avoid: [
            'Assuming work is done',
            'Ignoring warning signs',
            'Reducing support too quickly'
        ]
    },
    relapse: {
        primaryStrategy: 'roll_with_resistance',
        secondaryStrategies: ['support_self_efficacy', 'evoke_change_talk'],
        focus: [
            'Normalize as part of process',
            'Rebuild confidence',
            'Learn from experience',
            'Rekindle motivation'
        ],
        avoid: [
            'Blame or criticism',
            'Catastrophizing',
            'Starting over from scratch'
        ]
    }
};
//# sourceMappingURL=IMotivationalState.js.map