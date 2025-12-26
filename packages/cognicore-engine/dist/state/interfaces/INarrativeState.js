"use strict";
/**
 * 📖 NARRATIVE STATE INTERFACE
 * ============================
 * Personal Story Arc Tracking - WORLD-FIRST Innovation
 * Человек как герой собственной истории изменений
 *
 * Scientific Foundation:
 * - Transtheoretical Model of Change (Prochaska & DiClemente, 1983)
 * - Narrative Identity Theory (McAdams, 2001)
 * - Hero's Journey (Campbell, 1949)
 * - Narrative Therapy (White & Epston, 1990)
 *
 * Unique Innovation:
 * - Tracking personal transformation journey
 * - Role evolution (victim → survivor → hero)
 * - Breakthrough/setback momentum
 * - Story arc prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_TRANSITIONS = exports.ROLE_CHARACTERISTICS = exports.STAGE_CHARACTERISTICS = void 0;
/**
 * Stage characteristics and indicators
 */
exports.STAGE_CHARACTERISTICS = {
    precontemplation: {
        description: 'Не осознаёт проблему или не готов к изменениям',
        typicalDuration: { min: 30, max: 180 },
        indicators: [
            'Отрицание проблемы',
            'Защитные реакции',
            'Внешняя атрибуция',
            'Нежелание обсуждать тему'
        ],
        languagePatterns: [
            'у меня нет проблем',
            'всё нормально',
            'это не моё дело',
            'другие преувеличивают'
        ],
        therapeuticFocus: [
            'Повышение осознанности',
            'Мотивационное интервью',
            'Информирование без давления'
        ],
        movingForward: [
            'Признание небольших трудностей',
            'Интерес к информации',
            'Снижение защит'
        ],
        riskOfStagnation: [
            'Социальная изоляция',
            'Отсутствие внешней обратной связи',
            'Подкрепление проблемного поведения'
        ]
    },
    contemplation: {
        description: 'Осознаёт проблему, рассматривает возможность изменений',
        typicalDuration: { min: 30, max: 120 },
        indicators: [
            'Амбивалентность',
            'Взвешивание за и против',
            'Интерес к опыту других',
            'Самоанализ'
        ],
        languagePatterns: [
            'может быть',
            'не уверен',
            'с одной стороны... с другой',
            'думаю об этом'
        ],
        therapeuticFocus: [
            'Решение амбивалентности',
            'Усиление мотивации',
            'Работа с ценностями'
        ],
        movingForward: [
            'Снижение амбивалентности',
            'Формирование намерения',
            'Поиск ресурсов'
        ],
        riskOfStagnation: [
            'Хроническое размышление',
            'Страх изменений',
            'Отсутствие поддержки'
        ]
    },
    preparation: {
        description: 'Готов к действию, планирует изменения',
        typicalDuration: { min: 7, max: 30 },
        indicators: [
            'Конкретное планирование',
            'Поиск ресурсов',
            'Маленькие шаги',
            'Публичные обязательства'
        ],
        languagePatterns: [
            'собираюсь',
            'планирую',
            'на следующей неделе',
            'нужно найти'
        ],
        therapeuticFocus: [
            'Конкретизация плана',
            'Устранение барьеров',
            'Мобилизация ресурсов'
        ],
        movingForward: [
            'Первые конкретные шаги',
            'Поддержка окружения',
            'Ясный план'
        ],
        riskOfStagnation: [
            'Перфекционизм в планировании',
            'Откладывание',
            'Отсутствие конкретности'
        ]
    },
    action: {
        description: 'Активно меняет поведение',
        typicalDuration: { min: 90, max: 180 },
        indicators: [
            'Видимые изменения поведения',
            'Преодоление трудностей',
            'Активное использование стратегий',
            'Энтузиазм'
        ],
        languagePatterns: [
            'я делаю',
            'получается',
            'сложно, но',
            'сегодня я'
        ],
        therapeuticFocus: [
            'Поддержка изменений',
            'Предотвращение рецидива',
            'Укрепление новых привычек'
        ],
        movingForward: [
            'Стабильность изменений',
            'Снижение усилий',
            'Автоматизация'
        ],
        riskOfStagnation: [
            'Выгорание',
            'Нереалистичные ожидания',
            'Отсутствие поддержки'
        ]
    },
    maintenance: {
        description: 'Поддерживает изменения, предотвращает возврат',
        typicalDuration: { min: 180, max: 730 },
        indicators: [
            'Стабильное новое поведение',
            'Уверенность',
            'Снижение соблазнов',
            'Интеграция в жизнь'
        ],
        languagePatterns: [
            'привык',
            'теперь это моё',
            'уже не представляю иначе',
            'помогает мне'
        ],
        therapeuticFocus: [
            'Профилактика рецидива',
            'Углубление изменений',
            'Расширение на другие области'
        ],
        movingForward: [
            'Помощь другим',
            'Новые цели',
            'Глубокая трансформация'
        ],
        riskOfStagnation: [
            'Самоуспокоенность',
            'Стресс',
            'Жизненные кризисы'
        ]
    },
    relapse: {
        description: 'Возврат к прежнему поведению',
        typicalDuration: { min: 7, max: 90 },
        indicators: [
            'Возврат старых паттернов',
            'Разочарование',
            'Самокритика',
            'Избегание'
        ],
        languagePatterns: [
            'сорвался',
            'не получилось',
            'бесполезно',
            'снова'
        ],
        therapeuticFocus: [
            'Нормализация',
            'Анализ без осуждения',
            'Быстрое возвращение к действию'
        ],
        movingForward: [
            'Принятие как части процесса',
            'Анализ триггеров',
            'Возобновление действий'
        ],
        riskOfStagnation: [
            'Стыд и самообвинение',
            'Отказ от попыток',
            'Потеря надежды'
        ]
    }
};
/**
 * Role characteristics
 */
exports.ROLE_CHARACTERISTICS = {
    victim: {
        description: 'Ощущает себя жертвой обстоятельств',
        languagePatterns: ['со мной это случилось', 'я не могу', 'они сделали мне', 'это несправедливо'],
        typicalEmotions: ['helplessness', 'anger', 'sadness', 'resentment'],
        growthDirection: 'survivor',
        therapeuticApproach: 'Validation + empowerment'
    },
    survivor: {
        description: 'Справляется, выживает, держится',
        languagePatterns: ['справляюсь', 'держусь', 'переживу', 'терплю'],
        typicalEmotions: ['resilience', 'fatigue', 'determination', 'hope'],
        growthDirection: 'explorer',
        therapeuticApproach: 'Recognize strength + build agency'
    },
    explorer: {
        description: 'Ищет новые пути, экспериментирует',
        languagePatterns: ['пробую', 'интересно', 'может быть', 'хочу узнать'],
        typicalEmotions: ['curiosity', 'uncertainty', 'excitement', 'openness'],
        growthDirection: 'hero',
        therapeuticApproach: 'Support exploration + celebrate attempts'
    },
    hero: {
        description: 'Берёт ответственность, преодолевает',
        languagePatterns: ['я решил', 'я делаю', 'у меня получится', 'я выбираю'],
        typicalEmotions: ['empowerment', 'confidence', 'determination', 'pride'],
        growthDirection: 'mentor',
        therapeuticApproach: 'Strengthen identity + prepare for challenges'
    },
    mentor: {
        description: 'Помогает другим на основе своего опыта',
        languagePatterns: ['я понимаю', 'могу помочь', 'знаю как', 'расскажу'],
        typicalEmotions: ['wisdom', 'compassion', 'fulfillment', 'generativity'],
        growthDirection: 'mentor', // Peak role
        therapeuticApproach: 'Support generativity + maintain growth'
    }
};
/**
 * Stage transition probabilities (empirical data)
 */
exports.STAGE_TRANSITIONS = {
    precontemplation: {
        precontemplation: 0.7,
        contemplation: 0.25,
        preparation: 0.03,
        action: 0.01,
        maintenance: 0.01,
        relapse: 0.0
    },
    contemplation: {
        precontemplation: 0.1,
        contemplation: 0.5,
        preparation: 0.3,
        action: 0.08,
        maintenance: 0.01,
        relapse: 0.01
    },
    preparation: {
        precontemplation: 0.05,
        contemplation: 0.15,
        preparation: 0.3,
        action: 0.45,
        maintenance: 0.03,
        relapse: 0.02
    },
    action: {
        precontemplation: 0.05,
        contemplation: 0.1,
        preparation: 0.1,
        action: 0.35,
        maintenance: 0.25,
        relapse: 0.15
    },
    maintenance: {
        precontemplation: 0.02,
        contemplation: 0.03,
        preparation: 0.05,
        action: 0.1,
        maintenance: 0.65,
        relapse: 0.15
    },
    relapse: {
        precontemplation: 0.15,
        contemplation: 0.35,
        preparation: 0.25,
        action: 0.15,
        maintenance: 0.05,
        relapse: 0.05
    }
};
//# sourceMappingURL=INarrativeState.js.map