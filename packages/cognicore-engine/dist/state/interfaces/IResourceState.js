"use strict";
/**
 * 💪 RESOURCE STATE INTERFACE
 * ===========================
 * PERMA Model of Wellbeing + Coping Resources
 * Comprehensive assessment of available resources
 *
 * Scientific Foundation:
 * - PERMA Model (Seligman, 2011)
 * - Coping Theory (Lazarus & Folkman, 1984)
 * - Conservation of Resources Theory (Hobfoll, 1989)
 * - Positive Psychology Framework
 *
 * Components:
 * - P: Positive Emotion
 * - E: Engagement
 * - R: Relationships
 * - M: Meaning
 * - A: Accomplishment
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMA_ENHANCEMENT = exports.COPING_RECOMMENDATIONS = exports.PERMA_ASSESSMENT_QUESTIONS = void 0;
/**
 * PERMA assessment questions (for self-report)
 */
exports.PERMA_ASSESSMENT_QUESTIONS = {
    positiveEmotion: {
        questions: [
            'Как часто вы чувствуете себя счастливым?',
            'Как часто вы испытываете радость в повседневной жизни?',
            'Насколько вы удовлетворены своей жизнью в целом?'
        ],
        scale: { min: 0, max: 10, labels: { min: 'Никогда', max: 'Постоянно' } }
    },
    engagement: {
        questions: [
            'Как часто вы полностью поглощены тем, что делаете?',
            'Есть ли у вас занятия, в которых вы теряете счёт времени?',
            'Как часто вы чувствуете себя "в потоке"?'
        ],
        scale: { min: 0, max: 10, labels: { min: 'Никогда', max: 'Очень часто' } }
    },
    relationships: {
        questions: [
            'Чувствуете ли вы близость с другими людьми?',
            'Есть ли люди, которые вас поддерживают?',
            'Насколько удовлетворены вы своими отношениями?'
        ],
        scale: { min: 0, max: 10, labels: { min: 'Совсем нет', max: 'Полностью' } }
    },
    meaning: {
        questions: [
            'Ощущаете ли вы смысл в том, что делаете?',
            'Чувствуете ли вы, что ваша жизнь имеет цель?',
            'Есть ли что-то более важное, чем вы сами?'
        ],
        scale: { min: 0, max: 10, labels: { min: 'Нет смысла', max: 'Глубокий смысл' } }
    },
    accomplishment: {
        questions: [
            'Достигаете ли вы своих целей?',
            'Чувствуете ли вы себя компетентным?',
            'Гордитесь ли вы своими достижениями?'
        ],
        scale: { min: 0, max: 10, labels: { min: 'Никогда', max: 'Постоянно' } }
    }
};
/**
 * Coping strategy recommendations based on context
 */
exports.COPING_RECOMMENDATIONS = {
    acute_stress: {
        situation: 'Острый стресс (только что произошло)',
        recommendedStrategies: ['relaxation', 'emotional_expression', 'social_support', 'distraction'],
        avoidStrategies: ['problem_solving', 'planning', 'substance_use']
    },
    chronic_stress: {
        situation: 'Хронический стресс (длится давно)',
        recommendedStrategies: ['problem_solving', 'planning', 'reappraisal', 'physical_activity'],
        avoidStrategies: ['denial', 'behavioral_disengagement', 'substance_use']
    },
    relationship_conflict: {
        situation: 'Конфликт в отношениях',
        recommendedStrategies: ['emotional_expression', 'social_support', 'reappraisal', 'acceptance'],
        avoidStrategies: ['denial', 'substance_use', 'behavioral_disengagement']
    },
    loss_grief: {
        situation: 'Потеря / Горе',
        recommendedStrategies: ['emotional_expression', 'emotional_support', 'benefit_finding', 'acceptance'],
        avoidStrategies: ['denial', 'substance_use', 'distraction']
    },
    anxiety_worry: {
        situation: 'Тревога / Беспокойство',
        recommendedStrategies: ['relaxation', 'reappraisal', 'problem_solving', 'physical_activity'],
        avoidStrategies: ['behavioral_disengagement', 'substance_use', 'denial']
    },
    low_motivation: {
        situation: 'Низкая мотивация / Апатия',
        recommendedStrategies: ['values_clarification', 'physical_activity', 'social_support', 'creative_expression'],
        avoidStrategies: ['behavioral_disengagement', 'denial', 'distraction']
    },
    overwhelm: {
        situation: 'Перегрузка / Выгорание',
        recommendedStrategies: ['planning', 'relaxation', 'social_support', 'acceptance'],
        avoidStrategies: ['problem_solving', 'information_seeking', 'substance_use']
    }
};
/**
 * PERMA dimension enhancement strategies
 */
exports.PERMA_ENHANCEMENT = {
    positiveEmotion: {
        lowScoreActions: [
            'Ведение дневника благодарности',
            'Планирование приятных активностей',
            'Практика савoring (смакования)',
            'Медитация любящей доброты'
        ],
        maintenanceActions: [
            'Регулярное выражение благодарности',
            'Баланс позитивных и негативных эмоций',
            'Осознанное наслаждение моментами'
        ],
        relatedActivities: ['прогулки на природе', 'музыка', 'общение с друзьями', 'хобби']
    },
    engagement: {
        lowScoreActions: [
            'Найти или вспомнить увлечение',
            'Определить свои сильные стороны',
            'Практика осознанного присутствия',
            'Постепенное усложнение задач'
        ],
        maintenanceActions: [
            'Регулярное время для хобби',
            'Баланс сложности и навыков',
            'Устранение отвлечений'
        ],
        relatedActivities: ['творчество', 'спорт', 'обучение', 'игры требующие концентрации']
    },
    relationships: {
        lowScoreActions: [
            'Активное выслушивание',
            'Инициирование контактов',
            'Работа над коммуникацией',
            'Построение доверия'
        ],
        maintenanceActions: [
            'Регулярное качественное время',
            'Выражение признательности',
            'Разрешение конфликтов'
        ],
        relatedActivities: ['совместные активности', 'помощь другим', 'группы по интересам']
    },
    meaning: {
        lowScoreActions: [
            'Прояснение ценностей',
            'Исследование целей',
            'Волонтёрство',
            'Связь действий с ценностями'
        ],
        maintenanceActions: [
            'Регулярная рефлексия о ценностях',
            'Вклад в что-то большее',
            'Нахождение смысла в трудностях'
        ],
        relatedActivities: ['помощь другим', 'творчество', 'духовные практики', 'менторство']
    },
    accomplishment: {
        lowScoreActions: [
            'Постановка маленьких целей',
            'Празднование маленьких побед',
            'Развитие навыков',
            'Отслеживание прогресса'
        ],
        maintenanceActions: [
            'Регулярные цели и отслеживание',
            'Баланс процесса и результата',
            'Признание своих усилий'
        ],
        relatedActivities: ['обучение', 'проекты', 'спорт', 'профессиональное развитие']
    }
};
//# sourceMappingURL=IResourceState.js.map