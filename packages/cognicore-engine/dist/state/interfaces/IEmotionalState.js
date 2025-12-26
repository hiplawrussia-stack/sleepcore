"use strict";
/**
 * 🎭 EMOTIONAL STATE INTERFACE
 * ============================
 * World-class emotion representation using VAD (Valence-Arousal-Dominance) model
 * Combined with discrete emotion taxonomy for comprehensive state tracking
 *
 * Scientific Foundation:
 * - Russell's Circumplex Model (1980)
 * - Mehrabian & Russell VAD Model (1974)
 * - Plutchik's Wheel of Emotions (1980)
 * - Barrett's Theory of Constructed Emotion (2017)
 *
 * Integration Points:
 * - Compatible with existing EnhancedEmotionalRecognitionService (40+ emotions)
 * - Crisis detection compatible (CrisisPipeline integration)
 * - Age-adaptive recommendations support
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTION_THERAPY_MAPPING = exports.DEFAULT_EMOTION_VAD = void 0;
/**
 * Default VAD mappings for common emotions
 * Based on Mehrabian & Russell research + ANEW database
 */
exports.DEFAULT_EMOTION_VAD = {
    // High valence, varied arousal
    joy: { valence: 0.8, arousal: 0.6, dominance: 0.6 },
    excitement: { valence: 0.8, arousal: 0.9, dominance: 0.7 },
    contentment: { valence: 0.7, arousal: 0.2, dominance: 0.6 },
    calm: { valence: 0.5, arousal: -0.3, dominance: 0.5 },
    hope: { valence: 0.6, arousal: 0.3, dominance: 0.5 },
    pride: { valence: 0.7, arousal: 0.4, dominance: 0.8 },
    gratitude: { valence: 0.8, arousal: 0.3, dominance: 0.5 },
    love: { valence: 0.9, arousal: 0.5, dominance: 0.5 },
    trust: { valence: 0.6, arousal: 0.1, dominance: 0.5 },
    curiosity: { valence: 0.5, arousal: 0.6, dominance: 0.5 },
    awe: { valence: 0.7, arousal: 0.5, dominance: 0.3 },
    anticipation: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
    surprise: { valence: 0.3, arousal: 0.8, dominance: 0.3 },
    // Neutral
    neutral: { valence: 0.0, arousal: 0.0, dominance: 0.5 },
    boredom: { valence: -0.2, arousal: -0.5, dominance: 0.3 },
    confusion: { valence: -0.2, arousal: 0.4, dominance: 0.2 },
    // Low valence, varied arousal
    sadness: { valence: -0.7, arousal: -0.3, dominance: 0.2 },
    loneliness: { valence: -0.6, arousal: -0.2, dominance: 0.2 },
    despair: { valence: -0.9, arousal: -0.1, dominance: 0.1 },
    guilt: { valence: -0.6, arousal: 0.2, dominance: 0.2 },
    shame: { valence: -0.7, arousal: 0.3, dominance: 0.1 },
    numbness: { valence: -0.3, arousal: -0.6, dominance: 0.2 },
    // Negative + high arousal
    anger: { valence: -0.6, arousal: 0.8, dominance: 0.7 },
    irritation: { valence: -0.4, arousal: 0.5, dominance: 0.5 },
    frustration: { valence: -0.5, arousal: 0.6, dominance: 0.3 },
    fear: { valence: -0.7, arousal: 0.7, dominance: 0.1 },
    anxiety: { valence: -0.5, arousal: 0.6, dominance: 0.2 },
    stress: { valence: -0.5, arousal: 0.7, dominance: 0.3 },
    overwhelm: { valence: -0.6, arousal: 0.8, dominance: 0.1 },
    disgust: { valence: -0.6, arousal: 0.4, dominance: 0.5 },
    envy: { valence: -0.5, arousal: 0.4, dominance: 0.3 },
    jealousy: { valence: -0.6, arousal: 0.6, dominance: 0.3 },
    // Crisis-related emotions (Phase 6.2)
    hopelessness: { valence: -0.95, arousal: -0.2, dominance: 0.05 }, // extreme despair, crisis indicator
    relief: { valence: 0.6, arousal: -0.2, dominance: 0.6 }, // tension release
    apathy: { valence: -0.2, arousal: -0.7, dominance: 0.2 }, // low energy, low interest
    resentment: { valence: -0.5, arousal: 0.3, dominance: 0.3 }, // bitterness, unfairness
};
/**
 * Emotion to therapy approach mapping
 * Used for intervention selection
 */
exports.EMOTION_THERAPY_MAPPING = {
    anxiety: ['breathing', 'grounding', 'cognitive_restructuring'],
    stress: ['relaxation', 'time_management', 'mindfulness'],
    sadness: ['behavioral_activation', 'gratitude', 'social_connection'],
    anger: ['anger_management', 'assertiveness', 'physical_release'],
    fear: ['exposure_gradual', 'safety_planning', 'cognitive_defusion'],
    frustration: ['problem_solving', 'acceptance', 'reframing'],
    loneliness: ['social_skills', 'connection_activities', 'self_compassion'],
    overwhelm: ['prioritization', 'breaking_down', 'support_seeking'],
    guilt: ['values_clarification', 'amends', 'self_forgiveness'],
    shame: ['self_compassion', 'normalization', 'vulnerability_work'],
    despair: ['crisis_hotline', 'safety_planning', 'hope_building'],
    numbness: ['sensory_grounding', 'emotion_identification', 'gentle_activation'],
    boredom: ['engagement_activities', 'value_exploration', 'novelty_seeking'],
    confusion: ['clarification', 'journaling', 'external_perspective'],
    joy: ['savoring', 'gratitude', 'sharing'],
    excitement: ['channeling', 'grounding', 'planning'],
    contentment: ['mindfulness', 'appreciation', 'maintenance'],
    calm: ['awareness', 'body_scan', 'present_moment'],
    hope: ['goal_setting', 'visualization', 'small_steps'],
    pride: ['celebration', 'sharing', 'building'],
    gratitude: ['expression', 'journaling', 'paying_forward'],
    love: ['expression', 'quality_time', 'appreciation'],
    trust: ['vulnerability', 'reciprocity', 'boundaries'],
    curiosity: ['exploration', 'learning', 'questioning'],
    awe: ['nature', 'art', 'reflection'],
    anticipation: ['planning', 'grounding', 'patience'],
    surprise: ['processing', 'integration', 'adaptation'],
    irritation: ['pause', 'perspective', 'communication'],
    envy: ['gratitude', 'self_focus', 'inspiration'],
    jealousy: ['security_building', 'communication', 'self_worth'],
    disgust: ['values_clarification', 'boundaries', 'processing'],
    neutral: ['check_in', 'awareness', 'exploration'],
    // Crisis-related emotions (Phase 6.2)
    hopelessness: ['crisis_hotline', 'safety_planning', 'immediate_support', 'professional_referral'],
    relief: ['integration', 'gratitude', 'prevention_planning', 'self_care'],
    apathy: ['behavioral_activation', 'gentle_engagement', 'meaning_exploration', 'professional_assessment'],
    resentment: ['anger_processing', 'forgiveness_work', 'boundary_setting', 'perspective_taking'],
};
//# sourceMappingURL=IEmotionalState.js.map