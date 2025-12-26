"use strict";
/**
 * 🪞 DEEP COGNITIVE MIRROR - INTERFACES
 * ======================================
 * Cognitive Pattern Analysis & Therapeutic Insight System
 *
 * Scientific Foundation (2024-2025 Research):
 * - ABCD Model (Ellis/Beck): Activating event → Belief → Consequence → Disputation
 * - Burns' Cognitive Distortion Taxonomy (15 categories)
 * - nBERT for emotion recognition in psychotherapy (MDPI, 2025)
 * - Cognitive Pathway Extraction from social media (arXiv, 2024)
 * - Socrates 2.0 Multi-agent Socratic dialogue (JMIR, 2024)
 * - Therapeutic reflection generation (npj Digital Medicine, 2025)
 *
 * Core Functions:
 * 1. Cognitive Pattern Recognition - detect thinking patterns
 * 2. Distortion Detection - identify 15+ cognitive distortions
 * 3. Thought-Emotion Linkage - ABCD model analysis
 * 4. Therapeutic Insight Generation - personalized reflections
 * 5. Cognitive Restructuring Support - alternative thought generation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTION_KEYWORDS = exports.DISTORTION_KEYWORDS = exports.DISTORTION_DEFINITIONS = exports.DEFAULT_MIRROR_CONFIG = void 0;
exports.DEFAULT_MIRROR_CONFIG = {
    distortionConfidenceThreshold: 0.6,
    patternMinFrequency: 3,
    insightConfidenceThreshold: 0.7,
    maxChainsPerSession: 50,
    enableRealTimeAnalysis: true,
    analysisDepth: 'moderate',
    adaptToUserStyle: true,
    useHistoricalPatterns: true,
    languageStyle: 'conversational',
    enableCrisisDetection: true,
    flagHighRiskThoughts: true,
    escalationThreshold: 0.8,
};
exports.DISTORTION_DEFINITIONS = {
    'all_or_nothing': {
        type: 'all_or_nothing',
        name: 'All-or-Nothing Thinking',
        nameRu: 'Чёрно-белое мышление',
        description: 'Viewing situations in only two categories instead of on a continuum',
        descriptionRu: 'Восприятие ситуаций только в двух крайних категориях',
        examples: [
            'If I\'m not perfect, I\'m a failure',
            'Either they love me completely or hate me',
        ],
        challengingQuestions: [
            'Is there any middle ground here?',
            'Can something be partially true?',
        ],
        relatedDistortions: ['catastrophizing', 'labeling'],
    },
    'catastrophizing': {
        type: 'catastrophizing',
        name: 'Catastrophizing',
        nameRu: 'Катастрофизация',
        description: 'Predicting the worst possible outcome without considering more likely scenarios',
        descriptionRu: 'Предсказание наихудшего исхода без учёта более вероятных сценариев',
        examples: [
            'If I fail this test, my life is ruined',
            'This headache must be a brain tumor',
        ],
        challengingQuestions: [
            'What is the most likely outcome?',
            'Have I survived similar situations before?',
        ],
        relatedDistortions: ['fortune_telling', 'magnification'],
    },
    'mind_reading': {
        type: 'mind_reading',
        name: 'Mind Reading',
        nameRu: 'Чтение мыслей',
        description: 'Assuming you know what others are thinking without evidence',
        descriptionRu: 'Уверенность в знании мыслей других без доказательств',
        examples: [
            'They think I\'m stupid',
            'She\'s judging me right now',
        ],
        challengingQuestions: [
            'What evidence do I have for this?',
            'Could there be other explanations?',
        ],
        relatedDistortions: ['personalization', 'fortune_telling'],
    },
    'fortune_telling': {
        type: 'fortune_telling',
        name: 'Fortune Telling',
        nameRu: 'Предсказание будущего',
        description: 'Predicting the future negatively without evidence',
        descriptionRu: 'Негативное предсказание будущего без доказательств',
        examples: [
            'I know I\'ll fail the interview',
            'This relationship will definitely end badly',
        ],
        challengingQuestions: [
            'Can I really predict the future?',
            'What would I tell a friend in this situation?',
        ],
        relatedDistortions: ['catastrophizing', 'mind_reading'],
    },
    'emotional_reasoning': {
        type: 'emotional_reasoning',
        name: 'Emotional Reasoning',
        nameRu: 'Эмоциональное обоснование',
        description: 'Believing something is true because you feel it strongly',
        descriptionRu: 'Вера в истинность чего-то из-за сильных чувств',
        examples: [
            'I feel anxious, so something bad must be about to happen',
            'I feel guilty, so I must have done something wrong',
        ],
        challengingQuestions: [
            'Are feelings always accurate reflections of reality?',
            'What are the facts vs. my feelings?',
        ],
        relatedDistortions: ['catastrophizing', 'mind_reading'],
    },
    'should_statements': {
        type: 'should_statements',
        name: 'Should Statements',
        nameRu: 'Долженствования',
        description: 'Using "should," "must," or "ought" as rigid rules',
        descriptionRu: 'Использование "должен", "обязан" как жёстких правил',
        examples: [
            'I should always be productive',
            'They should have known better',
        ],
        challengingQuestions: [
            'Is this a preference or an absolute rule?',
            'What happens if I change "should" to "I would prefer"?',
        ],
        relatedDistortions: ['all_or_nothing', 'personalization'],
    },
    'labeling': {
        type: 'labeling',
        name: 'Labeling',
        nameRu: 'Навешивание ярлыков',
        description: 'Attaching a global negative label to yourself or others',
        descriptionRu: 'Присваивание глобального негативного ярлыка себе или другим',
        examples: [
            'I\'m such a loser',
            'He\'s a complete jerk',
        ],
        challengingQuestions: [
            'Does one action define the whole person?',
            'What evidence contradicts this label?',
        ],
        relatedDistortions: ['all_or_nothing', 'overgeneralization'],
    },
    'personalization': {
        type: 'personalization',
        name: 'Personalization',
        nameRu: 'Персонализация',
        description: 'Blaming yourself for events outside your control',
        descriptionRu: 'Обвинение себя за события вне вашего контроля',
        examples: [
            'My child failed because I\'m a bad parent',
            'If I had been there, this wouldn\'t have happened',
        ],
        challengingQuestions: [
            'What other factors contributed?',
            'Would I blame someone else in the same situation?',
        ],
        relatedDistortions: ['should_statements', 'emotional_reasoning'],
    },
    'magnification': {
        type: 'magnification',
        name: 'Magnification',
        nameRu: 'Преувеличение',
        description: 'Exaggerating the importance of negative events',
        descriptionRu: 'Преувеличение важности негативных событий',
        examples: [
            'This mistake will ruin everything',
            'Everyone noticed my error',
        ],
        challengingQuestions: [
            'How important will this be in a year?',
            'Am I blowing this out of proportion?',
        ],
        relatedDistortions: ['catastrophizing', 'all_or_nothing'],
    },
    'minimization': {
        type: 'minimization',
        name: 'Minimization',
        nameRu: 'Преуменьшение',
        description: 'Downplaying positive events or qualities',
        descriptionRu: 'Преуменьшение позитивных событий или качеств',
        examples: [
            'Anyone could have done that',
            'It was just luck, not my ability',
        ],
        challengingQuestions: [
            'Would I minimize someone else\'s achievement?',
            'What does this accomplishment actually show?',
        ],
        relatedDistortions: ['disqualifying_positive', 'mental_filter'],
    },
    'mental_filter': {
        type: 'mental_filter',
        name: 'Mental Filter',
        nameRu: 'Ментальный фильтр',
        description: 'Focusing exclusively on negative details while ignoring positives',
        descriptionRu: 'Концентрация только на негативных деталях, игнорируя позитивные',
        examples: [
            'The presentation was terrible because I stumbled once',
            'My day was ruined by that one comment',
        ],
        challengingQuestions: [
            'What positive aspects am I overlooking?',
            'Would others see it the same way?',
        ],
        relatedDistortions: ['disqualifying_positive', 'all_or_nothing'],
    },
    'disqualifying_positive': {
        type: 'disqualifying_positive',
        name: 'Disqualifying the Positive',
        nameRu: 'Обесценивание позитива',
        description: 'Rejecting positive experiences as if they don\'t count',
        descriptionRu: 'Отвержение позитивного опыта, как будто он не имеет значения',
        examples: [
            'They\'re just being nice, they don\'t really mean it',
            'That compliment doesn\'t count',
        ],
        challengingQuestions: [
            'Why would this positive not count?',
            'What if I accepted this as genuine?',
        ],
        relatedDistortions: ['mental_filter', 'minimization'],
    },
    'overgeneralization': {
        type: 'overgeneralization',
        name: 'Overgeneralization',
        nameRu: 'Сверхобобщение',
        description: 'Drawing broad conclusions from a single event',
        descriptionRu: 'Делать широкие выводы из единичного события',
        examples: [
            'I always fail at everything',
            'Nobody ever listens to me',
        ],
        challengingQuestions: [
            'Is "always" or "never" really accurate?',
            'Can I think of exceptions?',
        ],
        relatedDistortions: ['all_or_nothing', 'labeling'],
    },
    'black_and_white': {
        type: 'black_and_white',
        name: 'Black and White Thinking',
        nameRu: 'Дихотомическое мышление',
        description: 'Seeing things in absolute terms with no middle ground',
        descriptionRu: 'Восприятие в абсолютных терминах без средней позиции',
        examples: [
            'You\'re either with me or against me',
            'If it\'s not perfect, it\'s worthless',
        ],
        challengingQuestions: [
            'Where might the middle ground be?',
            'Can both things be partially true?',
        ],
        relatedDistortions: ['all_or_nothing', 'catastrophizing'],
    },
};
// ============================================================
// KEYWORD DICTIONARIES FOR DETECTION
// ============================================================
/**
 * Keywords and patterns for distortion detection
 * Used by rule-based detection layer
 */
exports.DISTORTION_KEYWORDS = {
    'all_or_nothing': {
        keywords: ['always', 'never', 'completely', 'totally', 'perfect', 'ruined', 'failure'],
        keywordsRu: ['всегда', 'никогда', 'полностью', 'абсолютно', 'идеально', 'провал'],
        patterns: [/nothing .* right/i, /everything .* wrong/i, /either .* or/i],
    },
    'catastrophizing': {
        keywords: ['terrible', 'horrible', 'disaster', 'worst', 'end of the world', 'unbearable'],
        keywordsRu: ['ужасно', 'кошмар', 'катастрофа', 'конец света', 'невыносимо'],
        patterns: [/what if .* worst/i, /going to .* terrible/i],
    },
    'mind_reading': {
        keywords: ['they think', 'she thinks', 'he thinks', 'everyone thinks', 'judging me'],
        keywordsRu: ['они думают', 'она думает', 'он думает', 'все думают', 'осуждают'],
        patterns: [/I know (they|she|he) (thinks?|feels?)/i],
    },
    'fortune_telling': {
        keywords: ['will definitely', 'going to fail', 'will never', 'bound to', 'doomed'],
        keywordsRu: ['точно будет', 'провалюсь', 'никогда не', 'обречён'],
        patterns: [/I (will|am going to) (fail|lose|mess up)/i],
    },
    'emotional_reasoning': {
        keywords: ['feel like', 'feels like', 'I feel therefore', 'because I feel'],
        keywordsRu: ['чувствую что', 'ощущаю что', 'раз я чувствую'],
        patterns: [/I feel .* so .* must be/i],
    },
    'should_statements': {
        keywords: ['should', 'must', 'ought to', 'have to', 'supposed to'],
        keywordsRu: ['должен', 'обязан', 'надо', 'следует'],
        patterns: [/I (should|must|have to)/i, /(they|she|he) (should|shouldn't)/i],
    },
    'labeling': {
        keywords: ['I am a', 'he is a', 'she is a', 'loser', 'idiot', 'stupid', 'worthless'],
        keywordsRu: ['я - ', 'он - ', 'она - ', 'неудачник', 'идиот', 'тупой', 'никчёмный'],
        patterns: [/I('m| am) (such )?a (loser|failure|idiot)/i],
    },
    'personalization': {
        keywords: ['my fault', 'because of me', 'I caused', 'I made them'],
        keywordsRu: ['моя вина', 'из-за меня', 'я виноват', 'я заставил'],
        patterns: [/it('s| is) (all )?(my|your) fault/i],
    },
    'magnification': {
        keywords: ['huge', 'enormous', 'devastating', 'ruined', 'destroyed'],
        keywordsRu: ['огромный', 'разрушительный', 'уничтожено', 'всё пропало'],
        patterns: [/this (changes|ruins|destroys) everything/i],
    },
    'minimization': {
        keywords: ['just luck', 'anyone could', 'doesn\'t count', 'no big deal', 'just'],
        keywordsRu: ['просто повезло', 'любой мог бы', 'не считается', 'ерунда'],
        patterns: [/it('s| is) (just|only|nothing)/i],
    },
    'mental_filter': {
        keywords: ['only negative', 'only bad', 'ruined by', 'all I see'],
        keywordsRu: ['только плохое', 'всё испортил', 'вижу только'],
        patterns: [/the (one|only) (thing|part) (that|which)/i],
    },
    'disqualifying_positive': {
        keywords: ['doesn\'t count', 'but', 'yeah but', 'only saying that', 'just being nice'],
        keywordsRu: ['не считается', 'но', 'да но', 'просто из вежливости'],
        patterns: [/(they'?re|she's|he's) just (being nice|saying that)/i],
    },
    'overgeneralization': {
        keywords: ['always', 'never', 'everyone', 'no one', 'all', 'nothing'],
        keywordsRu: ['всегда', 'никогда', 'все', 'никто', 'ничего'],
        patterns: [/(I|you) (always|never)/i, /(everyone|nobody|nothing) (ever|always)/i],
    },
    'black_and_white': {
        keywords: ['either', 'or', 'completely', 'totally', 'all or nothing'],
        keywordsRu: ['либо', 'или', 'полностью', 'совершенно', 'всё или ничего'],
        patterns: [/either .* or/i, /(you're|it's) (either|all)/i],
    },
};
/**
 * Emotion-related keywords for consequence detection
 */
exports.EMOTION_KEYWORDS = {
    'joy': { keywords: ['happy', 'glad', 'delighted', 'thrilled'], keywordsRu: ['счастлив', 'рад', 'доволен'] },
    'sadness': { keywords: ['sad', 'down', 'depressed', 'blue', 'unhappy'], keywordsRu: ['грустно', 'печально', 'тоска'] },
    'anger': { keywords: ['angry', 'furious', 'mad', 'annoyed', 'frustrated'], keywordsRu: ['злой', 'разозлён', 'раздражён'] },
    'fear': { keywords: ['scared', 'afraid', 'terrified', 'anxious', 'worried'], keywordsRu: ['страшно', 'боюсь', 'тревожно'] },
    'disgust': { keywords: ['disgusted', 'repulsed', 'grossed out'], keywordsRu: ['отвратительно', 'противно'] },
    'surprise': { keywords: ['surprised', 'shocked', 'amazed', 'astonished'], keywordsRu: ['удивлён', 'шокирован'] },
    'trust': { keywords: ['trust', 'believe', 'faith', 'confident'], keywordsRu: ['доверяю', 'верю', 'уверен'] },
    'anticipation': { keywords: ['expecting', 'looking forward', 'excited about'], keywordsRu: ['жду', 'предвкушаю'] },
    'anxiety': { keywords: ['anxious', 'worried', 'nervous', 'stressed', 'panicked'], keywordsRu: ['тревога', 'волнуюсь', 'нервничаю'] },
    'shame': { keywords: ['ashamed', 'embarrassed', 'humiliated'], keywordsRu: ['стыдно', 'позор'] },
    'guilt': { keywords: ['guilty', 'regret', 'remorse'], keywordsRu: ['виноват', 'сожалею'] },
    'loneliness': { keywords: ['lonely', 'alone', 'isolated', 'abandoned'], keywordsRu: ['одиноко', 'один', 'покинут'] },
    'hopelessness': { keywords: ['hopeless', 'pointless', 'no hope', 'give up'], keywordsRu: ['безнадёжно', 'бессмысленно'] },
    'confusion': { keywords: ['confused', 'lost', 'don\'t understand'], keywordsRu: ['растерян', 'не понимаю'] },
    'frustration': { keywords: ['frustrated', 'stuck', 'can\'t', 'impossible'], keywordsRu: ['разочарован', 'застрял'] },
    'overwhelm': { keywords: ['overwhelmed', 'too much', 'can\'t cope'], keywordsRu: ['перегружен', 'слишком много'] },
    'resentment': { keywords: ['resent', 'bitter', 'unfair'], keywordsRu: ['обижен', 'несправедливо'] },
    'jealousy': { keywords: ['jealous', 'envious'], keywordsRu: ['завидую', 'ревную'] },
    'love': { keywords: ['love', 'adore', 'care deeply'], keywordsRu: ['люблю', 'обожаю'] },
    'gratitude': { keywords: ['grateful', 'thankful', 'appreciate'], keywordsRu: ['благодарен', 'признателен'] },
    'pride': { keywords: ['proud', 'accomplished'], keywordsRu: ['горжусь', 'достижение'] },
    'contentment': { keywords: ['content', 'satisfied', 'at peace'], keywordsRu: ['доволен', 'умиротворён'] },
    'hope': { keywords: ['hope', 'hopeful', 'optimistic'], keywordsRu: ['надеюсь', 'оптимистичен'] },
    'relief': { keywords: ['relieved', 'phew', 'weight off'], keywordsRu: ['облегчение', 'отпустило'] },
    'curiosity': { keywords: ['curious', 'interested', 'wonder'], keywordsRu: ['интересно', 'любопытно'] },
    'excitement': { keywords: ['excited', 'thrilled', 'can\'t wait'], keywordsRu: ['взволнован', 'восторг'] },
    'boredom': { keywords: ['bored', 'dull', 'nothing to do'], keywordsRu: ['скучно', 'нечего делать'] },
    'apathy': { keywords: ['don\'t care', 'whatever', 'numb'], keywordsRu: ['всё равно', 'безразлично'] },
    // 'determination' and 'vulnerability' removed - not in EmotionType (Phase 6)
    'neutral': { keywords: ['okay', 'fine', 'alright'], keywordsRu: ['нормально', 'ок'] },
};
//# sourceMappingURL=IDeepCognitiveMirror.js.map