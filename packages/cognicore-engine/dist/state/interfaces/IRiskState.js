"use strict";
/**
 * 🚨 RISK STATE INTERFACE
 * =======================
 * Comprehensive risk assessment compatible with CrisisPipeline
 * Multi-layer risk tracking with early warning system
 *
 * Scientific Foundation:
 * - Columbia Suicide Severity Rating Scale (C-SSRS)
 * - Risk-Need-Responsivity Model (Andrews & Bonta)
 * - Safety Planning Intervention (Stanley & Brown)
 * - Dynamic Risk Assessment (Douglas & Skeem)
 *
 * Integration:
 * - Compatible with existing CrisisPipeline
 * - Aligned with CrisisRiskLevel from src project
 * - Supports fail-safe design principles
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_THRESHOLDS = exports.CRISIS_RESPONSE_PROTOCOLS = exports.RISK_PATTERNS = void 0;
/**
 * Risk keywords and patterns (Russian)
 * Aligned with existing CrisisPipeline
 */
exports.RISK_PATTERNS = {
    suicidal_ideation: {
        keywords: ['суицид', 'покончить', 'убить себя', 'не хочу жить', 'нет смысла жить'],
        phrases: ['хочу умереть', 'лучше бы меня не было', 'всем будет лучше без меня', 'больше не могу так'],
        severity: 1.0,
        requiresImmediateAction: true
    },
    self_harm: {
        keywords: ['порезать', 'причинить боль', 'царапать', 'бить себя'],
        phrases: ['хочу сделать себе больно', 'заслуживаю боли', 'чувствую только когда'],
        severity: 0.9,
        requiresImmediateAction: true
    },
    emotional_crisis: {
        keywords: ['невыносимо', 'не могу больше', 'истерика', 'паника'],
        phrases: ['всё рушится', 'не справляюсь', 'на грани', 'сойду с ума'],
        severity: 0.7,
        requiresImmediateAction: false
    },
    substance_use: {
        keywords: ['напиться', 'наркотики', 'таблетки', 'забыться'],
        phrases: ['хочу напиться', 'нужно что-то принять', 'только так могу'],
        severity: 0.6,
        requiresImmediateAction: false
    },
    social_isolation: {
        keywords: ['одинок', 'никто не понимает', 'никому не нужен'],
        phrases: ['я совсем один', 'не с кем поговорить', 'никто не поймёт'],
        severity: 0.5,
        requiresImmediateAction: false
    },
    digital_addiction: {
        keywords: ['не могу оторваться', 'часами сижу', 'зависим'],
        phrases: ['играю всё время', 'не могу перестать', 'жизнь только в сети'],
        severity: 0.4,
        requiresImmediateAction: false
    },
    behavioral: {
        keywords: ['рискованно', 'опасно', 'безрассудно'],
        phrases: ['мне всё равно что будет', 'пусть случится что угодно'],
        severity: 0.6,
        requiresImmediateAction: false
    },
    relational: {
        keywords: ['бросил', 'предал', 'ненавижу'],
        phrases: ['никому не доверяю', 'все против меня', 'никто не любит'],
        severity: 0.5,
        requiresImmediateAction: false
    },
    academic_crisis: {
        keywords: ['провал', 'исключат', 'отчислят', 'завалил'],
        phrases: ['не справлюсь с учёбой', 'всё провалил', 'родители убьют'],
        severity: 0.5,
        requiresImmediateAction: false
    },
    family_crisis: {
        keywords: ['развод', 'выгоняют', 'бьют', 'насилие'],
        phrases: ['дома невозможно', 'хочу сбежать', 'некуда идти'],
        severity: 0.7,
        requiresImmediateAction: false
    }
};
/**
 * Crisis response protocols by risk level
 */
exports.CRISIS_RESPONSE_PROTOCOLS = {
    none: {
        immediateActions: ['Continue normal interaction'],
        resourcesProvide: [],
        escalationRequired: false,
        followUpTimeframe: 'none',
        documentationRequired: false
    },
    low: {
        immediateActions: [
            'Validate feelings',
            'Offer support options',
            'Check coping resources'
        ],
        resourcesProvide: ['General support information'],
        escalationRequired: false,
        followUpTimeframe: '48h',
        documentationRequired: false
    },
    medium: {
        immediateActions: [
            'Express concern and care',
            'Assess safety directly',
            'Review coping strategies',
            'Discuss support network'
        ],
        resourcesProvide: ['Crisis hotline', 'Support chat'],
        escalationRequired: false,
        followUpTimeframe: '24h',
        documentationRequired: true
    },
    high: {
        immediateActions: [
            'Direct safety assessment',
            'Safety planning',
            'Means restriction discussion',
            'Connect with support person',
            'Provide crisis contacts'
        ],
        resourcesProvide: ['24/7 Hotline: 8-800-2000-122', 'Emergency contacts'],
        escalationRequired: true,
        followUpTimeframe: '12h',
        documentationRequired: true
    },
    critical: {
        immediateActions: [
            'IMMEDIATE crisis response',
            'Keep user engaged',
            'Connect to emergency services',
            'Do not end conversation',
            'Continuous safety monitoring'
        ],
        resourcesProvide: [
            'Emergency: 112',
            'Crisis hotline: 8-800-2000-122',
            'МЧС психологи: 8-499-216-50-50'
        ],
        escalationRequired: true,
        followUpTimeframe: 'continuous',
        documentationRequired: true
    }
};
/**
 * Risk score thresholds (aligned with CrisisPipeline)
 */
exports.RISK_THRESHOLDS = {
    none: 0,
    low: 0.2,
    medium: 0.4,
    high: 0.7,
    critical: 0.85
};
//# sourceMappingURL=IRiskState.js.map