"use strict";
/**
 * METACOGNITIVE STATE INTERFACE
 * ==============================
 * Wells' Metacognitive Therapy (MCT) Model Implementation
 *
 * Scientific Foundation (2024-2025 Research):
 * - S-REF Model (Wells & Matthews, 1994, 1996)
 * - Metacognitive Therapy (Wells, 2009)
 * - MCQ-30 Questionnaire (Wells & Cartwright-Hatton, 2004)
 * - CAS-1R Assessment (Wells, 2009)
 * - MCT Meta-Analysis (Normann & Morina, 2018; December 2024 update)
 *
 * Key Innovation:
 * - Digital implementation of MCQ-30 subscales
 * - Real-time CAS detection
 * - Metacognitive belief tracking
 * - Integration with existing CogniCore State Vector
 *
 * Evidence Base (2024):
 * - MCT effect size d = 1.28 for anxiety/depression (Thingbak et al., 2024)
 * - MCT superior to CBT: Hedges' g = 0.69 at post-treatment
 * - 21 MCT studies + 28 MCTraining studies meta-analyzed
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAS_SEVERITY_THRESHOLDS = exports.MCQ30_CLINICAL_CUTOFFS = exports.UNCONTROLLABILITY_PATTERNS = exports.POSITIVE_WORRY_BELIEF_PATTERNS = exports.RUMINATION_PATTERNS = exports.WORRY_PATTERNS = exports.MCQ30_ITEMS = void 0;
// ============================================================
// MCQ-30 ITEMS (Full Questionnaire)
// ============================================================
/**
 * Complete MCQ-30 Items
 * Based on Wells & Cartwright-Hatton (2004)
 */
exports.MCQ30_ITEMS = [
    // Factor 1: Positive Beliefs about Worry
    { id: 1, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to avoid problems in the future', textRu: 'Беспокойство помогает мне избежать проблем в будущем', reversed: false },
    { id: 7, subscale: 'positiveWorryBeliefs', textEn: 'I need to worry in order to remain organised', textRu: 'Мне нужно беспокоиться, чтобы оставаться организованным', reversed: false },
    { id: 10, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to get things sorted out in my mind', textRu: 'Беспокойство помогает мне разобраться в мыслях', reversed: false },
    { id: 19, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me cope', textRu: 'Беспокойство помогает мне справляться', reversed: false },
    { id: 23, subscale: 'positiveWorryBeliefs', textEn: 'Worrying helps me to solve problems', textRu: 'Беспокойство помогает мне решать проблемы', reversed: false },
    { id: 28, subscale: 'positiveWorryBeliefs', textEn: 'I need to worry in order to work well', textRu: 'Мне нужно беспокоиться, чтобы хорошо работать', reversed: false },
    // Factor 2: Negative Beliefs about Uncontrollability and Danger
    { id: 2, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying is dangerous for me', textRu: 'Моё беспокойство опасно для меня', reversed: false },
    { id: 4, subscale: 'negativeUncontrollabilityDanger', textEn: 'I could make myself sick with worrying', textRu: 'Я могу заболеть от беспокойства', reversed: false },
    { id: 9, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying thoughts persist, no matter how I try to stop them', textRu: 'Мои тревожные мысли сохраняются, как бы я ни пытался их остановить', reversed: false },
    { id: 11, subscale: 'negativeUncontrollabilityDanger', textEn: 'I cannot ignore my worrying thoughts', textRu: 'Я не могу игнорировать свои тревожные мысли', reversed: false },
    { id: 15, subscale: 'negativeUncontrollabilityDanger', textEn: 'My worrying could make me go mad', textRu: 'Моё беспокойство может свести меня с ума', reversed: false },
    { id: 21, subscale: 'negativeUncontrollabilityDanger', textEn: 'When I start worrying I cannot stop', textRu: 'Когда я начинаю беспокоиться, я не могу остановиться', reversed: false },
    // Factor 3: Cognitive Confidence
    { id: 8, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for words and names', textRu: 'У меня мало уверенности в своей памяти на слова и имена', reversed: false },
    { id: 14, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for places', textRu: 'У меня мало уверенности в своей памяти на места', reversed: false },
    { id: 17, subscale: 'cognitiveConfidence', textEn: 'I have a poor memory', textRu: 'У меня плохая память', reversed: false },
    { id: 24, subscale: 'cognitiveConfidence', textEn: 'I have little confidence in my memory for actions', textRu: 'У меня мало уверенности в своей памяти на действия', reversed: false },
    { id: 26, subscale: 'cognitiveConfidence', textEn: 'I do not trust my memory', textRu: 'Я не доверяю своей памяти', reversed: false },
    { id: 29, subscale: 'cognitiveConfidence', textEn: 'My memory can mislead me at times', textRu: 'Моя память иногда может вводить меня в заблуждение', reversed: false },
    // Factor 4: Need to Control Thoughts
    { id: 6, subscale: 'needToControlThoughts', textEn: 'Not being able to control my thoughts is a sign of weakness', textRu: 'Неспособность контролировать мысли — признак слабости', reversed: false },
    { id: 13, subscale: 'needToControlThoughts', textEn: 'I should be in control of my thoughts all of the time', textRu: 'Я должен всегда контролировать свои мысли', reversed: false },
    { id: 20, subscale: 'needToControlThoughts', textEn: 'It is bad to think certain thoughts', textRu: 'Плохо думать определённые мысли', reversed: false },
    { id: 22, subscale: 'needToControlThoughts', textEn: 'I will be punished for not controlling certain thoughts', textRu: 'Меня накажут за то, что я не контролирую определённые мысли', reversed: false },
    { id: 25, subscale: 'needToControlThoughts', textEn: 'It is bad to have certain thoughts', textRu: 'Плохо иметь определённые мысли', reversed: false },
    { id: 27, subscale: 'needToControlThoughts', textEn: 'If I could not control my thoughts I would not be able to function', textRu: 'Если бы я не мог контролировать свои мысли, я бы не смог функционировать', reversed: false },
    // Factor 5: Cognitive Self-Consciousness
    { id: 3, subscale: 'cognitiveSelfConsciousness', textEn: 'I think a lot about my thoughts', textRu: 'Я много думаю о своих мыслях', reversed: false },
    { id: 5, subscale: 'cognitiveSelfConsciousness', textEn: 'I am aware of the way my mind works when I am thinking through a problem', textRu: 'Я осознаю, как работает мой ум, когда я обдумываю проблему', reversed: false },
    { id: 12, subscale: 'cognitiveSelfConsciousness', textEn: 'I monitor my thoughts', textRu: 'Я слежу за своими мыслями', reversed: false },
    { id: 16, subscale: 'cognitiveSelfConsciousness', textEn: 'I pay close attention to the way my mind works', textRu: 'Я внимательно слежу за тем, как работает мой ум', reversed: false },
    { id: 18, subscale: 'cognitiveSelfConsciousness', textEn: 'I constantly examine my thoughts', textRu: 'Я постоянно анализирую свои мысли', reversed: false },
    { id: 30, subscale: 'cognitiveSelfConsciousness', textEn: 'I am constantly aware of my thinking', textRu: 'Я постоянно осознаю своё мышление', reversed: false }
];
// ============================================================
// CAS DETECTION PATTERNS
// ============================================================
/**
 * Patterns for detecting worry in text
 */
exports.WORRY_PATTERNS = {
    keywords: {
        en: ['what if', 'might', 'could happen', 'worried about', "can't stop thinking", 'keep thinking about', 'anxious about', 'concerned that', 'afraid that', 'fear that'],
        ru: ['а что если', 'может случиться', 'беспокоюсь о', 'не могу перестать думать', 'постоянно думаю о', 'тревожусь', 'боюсь что', 'переживаю']
    },
    futureOrientation: {
        en: ['will', 'going to', 'tomorrow', 'next', 'future', 'later', 'soon'],
        ru: ['будет', 'завтра', 'потом', 'скоро', 'в будущем', 'когда-нибудь']
    }
};
/**
 * Patterns for detecting rumination in text
 */
exports.RUMINATION_PATTERNS = {
    keywords: {
        en: ['should have', 'could have', 'why did I', 'why didn\'t I', 'if only', 'keep going over', 'can\'t let go', 'keep replaying', 'regret'],
        ru: ['надо было', 'зачем я', 'почему я не', 'если бы только', 'не могу забыть', 'всё время вспоминаю', 'жалею', 'прокручиваю в голове']
    },
    pastOrientation: {
        en: ['yesterday', 'last', 'before', 'used to', 'back when', 'remember when'],
        ru: ['вчера', 'раньше', 'когда-то', 'помню как', 'тогда']
    }
};
/**
 * Patterns for detecting positive worry beliefs
 */
exports.POSITIVE_WORRY_BELIEF_PATTERNS = {
    en: ['worry helps', 'worrying keeps me', 'need to worry', 'have to think about', 'better to be prepared', 'being careful', 'can\'t relax until'],
    ru: ['беспокойство помогает', 'нужно беспокоиться', 'лучше подготовиться', 'не могу расслабиться пока']
};
/**
 * Patterns for detecting uncontrollability beliefs
 */
exports.UNCONTROLLABILITY_PATTERNS = {
    en: ['can\'t stop', 'can\'t control', 'takes over', 'overwhelming', 'won\'t go away', 'stuck in my head', 'going crazy', 'losing my mind'],
    ru: ['не могу остановить', 'не могу контролировать', 'захлёстывает', 'не уходит', 'застряло в голове', 'схожу с ума']
};
// ============================================================
// CLINICAL THRESHOLDS
// ============================================================
/**
 * MCQ-30 Clinical Cutoffs
 * Based on normative data
 */
exports.MCQ30_CLINICAL_CUTOFFS = {
    positiveWorryBeliefs: 12, // Above = clinically significant
    negativeUncontrollabilityDanger: 14,
    cognitiveConfidence: 13,
    needToControlThoughts: 12,
    cognitiveSelfConsciousness: 16,
    totalScore: 65 // Above = elevated metacognitive dysfunction
};
/**
 * CAS severity thresholds
 */
exports.CAS_SEVERITY_THRESHOLDS = {
    mild: 0.3,
    moderate: 0.5,
    severe: 0.7,
    critical: 0.85
};
//# sourceMappingURL=IMetacognitiveState.js.map