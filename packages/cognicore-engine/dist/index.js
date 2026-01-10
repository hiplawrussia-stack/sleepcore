'use strict';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/state/interfaces/IEmotionalState.ts
var DEFAULT_EMOTION_VAD = {
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
  neutral: { valence: 0, arousal: 0, dominance: 0.5 },
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
  hopelessness: { valence: -0.95, arousal: -0.2, dominance: 0.05 },
  // extreme despair, crisis indicator
  relief: { valence: 0.6, arousal: -0.2, dominance: 0.6 },
  // tension release
  apathy: { valence: -0.2, arousal: -0.7, dominance: 0.2 },
  // low energy, low interest
  resentment: { valence: -0.5, arousal: 0.3, dominance: 0.3 }
  // bitterness, unfairness
};
var EMOTION_THERAPY_MAPPING = {
  anxiety: ["breathing", "grounding", "cognitive_restructuring"],
  stress: ["relaxation", "time_management", "mindfulness"],
  sadness: ["behavioral_activation", "gratitude", "social_connection"],
  anger: ["anger_management", "assertiveness", "physical_release"],
  fear: ["exposure_gradual", "safety_planning", "cognitive_defusion"],
  frustration: ["problem_solving", "acceptance", "reframing"],
  loneliness: ["social_skills", "connection_activities", "self_compassion"],
  overwhelm: ["prioritization", "breaking_down", "support_seeking"],
  guilt: ["values_clarification", "amends", "self_forgiveness"],
  shame: ["self_compassion", "normalization", "vulnerability_work"],
  despair: ["crisis_hotline", "safety_planning", "hope_building"],
  numbness: ["sensory_grounding", "emotion_identification", "gentle_activation"],
  boredom: ["engagement_activities", "value_exploration", "novelty_seeking"],
  confusion: ["clarification", "journaling", "external_perspective"],
  joy: ["savoring", "gratitude", "sharing"],
  excitement: ["channeling", "grounding", "planning"],
  contentment: ["mindfulness", "appreciation", "maintenance"],
  calm: ["awareness", "body_scan", "present_moment"],
  hope: ["goal_setting", "visualization", "small_steps"],
  pride: ["celebration", "sharing", "building"],
  gratitude: ["expression", "journaling", "paying_forward"],
  love: ["expression", "quality_time", "appreciation"],
  trust: ["vulnerability", "reciprocity", "boundaries"],
  curiosity: ["exploration", "learning", "questioning"],
  awe: ["nature", "art", "reflection"],
  anticipation: ["planning", "grounding", "patience"],
  surprise: ["processing", "integration", "adaptation"],
  irritation: ["pause", "perspective", "communication"],
  envy: ["gratitude", "self_focus", "inspiration"],
  jealousy: ["security_building", "communication", "self_worth"],
  disgust: ["values_clarification", "boundaries", "processing"],
  neutral: ["check_in", "awareness", "exploration"],
  // Crisis-related emotions (Phase 6.2)
  hopelessness: ["crisis_hotline", "safety_planning", "immediate_support", "professional_referral"],
  relief: ["integration", "gratitude", "prevention_planning", "self_care"],
  apathy: ["behavioral_activation", "gentle_engagement", "meaning_exploration", "professional_assessment"],
  resentment: ["anger_processing", "forgiveness_work", "boundary_setting", "perspective_taking"]
};

// src/state/interfaces/ICognitiveState.ts
var DISTORTION_PATTERNS = {
  all_or_nothing: {
    keywords: ["\u0432\u0441\u0435\u0433\u0434\u0430", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430", "\u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E", "\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u043E", "\u0442\u043E\u043B\u044C\u043A\u043E", "\u0432\u0441\u0451 \u0438\u043B\u0438 \u043D\u0438\u0447\u0435\u0433\u043E"],
    phrases: ["\u0432\u0441\u0451 \u043F\u043B\u043E\u0445\u043E", "\u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0441\u044F", "\u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043F\u043E\u0439\u043C\u0451\u0442"],
    description: "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u043E\u0435 \u043C\u044B\u0448\u043B\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043E\u0442\u0442\u0435\u043D\u043A\u043E\u0432",
    correction: '\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043D\u0430\u0439\u0442\u0438 \u043E\u0442\u0442\u0435\u043D\u043A\u0438 \u0441\u0435\u0440\u043E\u0433\u043E. \u0427\u0442\u043E \u043C\u0435\u0436\u0434\u0443 "\u0432\u0441\u0435\u0433\u0434\u0430" \u0438 "\u043D\u0438\u043A\u043E\u0433\u0434\u0430"?'
  },
  overgeneralization: {
    keywords: ["\u0432\u0441\u0435\u0433\u0434\u0430", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430", "\u0432\u0441\u0435", "\u043A\u0430\u0436\u0434\u044B\u0439 \u0440\u0430\u0437"],
    phrases: ["\u0441\u043E \u043C\u043D\u043E\u0439 \u0442\u0430\u043A \u0432\u0441\u0435\u0433\u0434\u0430", "\u0443 \u043C\u0435\u043D\u044F \u043D\u0438\u043A\u043E\u0433\u0434\u0430", "\u0432\u0441\u0435 \u043F\u0440\u043E\u0442\u0438\u0432 \u043C\u0435\u043D\u044F"],
    description: "\u041E\u0434\u0438\u043D \u0441\u043B\u0443\u0447\u0430\u0439 = \u0432\u0435\u0447\u043D\u0430\u044F \u0437\u0430\u043A\u043E\u043D\u043E\u043C\u0435\u0440\u043D\u043E\u0441\u0442\u044C",
    correction: "\u042D\u0442\u043E \u043E\u0434\u0438\u043D \u0441\u043B\u0443\u0447\u0430\u0439 \u0438\u043B\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0437\u0430\u043A\u043E\u043D\u043E\u043C\u0435\u0440\u043D\u043E\u0441\u0442\u044C? \u0411\u044B\u043B\u0438 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F?"
  },
  mental_filter: {
    keywords: ["\u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043B\u043E\u0445\u043E\u0435", "\u043E\u043F\u044F\u0442\u044C", "\u0441\u043D\u043E\u0432\u0430"],
    phrases: ["\u0432\u0438\u0436\u0443 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043B\u043E\u0445\u043E\u0435", "\u0437\u0430\u043C\u0435\u0447\u0430\u044E \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0435\u0433\u0430\u0442\u0438\u0432"],
    description: "\u0424\u043E\u043A\u0443\u0441 \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u0435",
    correction: "\u0427\u0442\u043E \u0445\u043E\u0440\u043E\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u043E \u0441\u0435\u0433\u043E\u0434\u043D\u044F? \u0414\u0430\u0436\u0435 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435."
  },
  disqualifying_positive: {
    keywords: ["\u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F", "\u044D\u0442\u043E \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u043E\u0441\u0442\u044C", "\u043F\u043E\u0432\u0435\u0437\u043B\u043E", "\u043F\u0440\u043E\u0441\u0442\u043E"],
    phrases: ["\u044D\u0442\u043E \u043D\u0435 \u0432 \u0441\u0447\u0451\u0442", "\u043F\u0440\u043E\u0441\u0442\u043E \u043F\u043E\u0432\u0435\u0437\u043B\u043E", "\u043B\u044E\u0431\u043E\u0439 \u0431\u044B \u0441\u043F\u0440\u0430\u0432\u0438\u043B\u0441\u044F"],
    description: "\u041E\u0431\u0435\u0441\u0446\u0435\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u043E\u043F\u044B\u0442\u0430",
    correction: '\u041F\u043E\u0447\u0435\u043C\u0443 \u0445\u043E\u0440\u043E\u0448\u0435\u0435 "\u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F"? \u041A\u0442\u043E \u0440\u0435\u0448\u0438\u043B \u044D\u0442\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430?'
  },
  jumping_to_conclusions: {
    keywords: ["\u0442\u043E\u0447\u043D\u043E", "\u043D\u0430\u0432\u0435\u0440\u043D\u044F\u043A\u0430", "\u0441\u043A\u043E\u0440\u0435\u0435 \u0432\u0441\u0435\u0433\u043E"],
    phrases: ["\u043E\u043D \u0434\u0443\u043C\u0430\u0435\u0442 \u0447\u0442\u043E", "\u043E\u043D\u0430 \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u043C\u0435\u043D\u044F", "\u044D\u0442\u043E \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F"],
    description: "\u0412\u044B\u0432\u043E\u0434\u044B \u0431\u0435\u0437 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u044B\u0445 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0439",
    correction: "\u041A\u0430\u043A\u0438\u0435 \u0444\u0430\u043A\u0442\u044B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044E\u0442 \u044D\u0442\u0443 \u043C\u044B\u0441\u043B\u044C? \u0415\u0441\u0442\u044C \u0434\u0440\u0443\u0433\u0438\u0435 \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F?"
  },
  magnification: {
    keywords: ["\u043A\u0430\u0442\u0430\u0441\u0442\u0440\u043E\u0444\u0430", "\u0443\u0436\u0430\u0441", "\u043A\u043E\u0448\u043C\u0430\u0440", "\u043A\u043E\u043D\u0435\u0446"],
    phrases: ["\u044D\u0442\u043E \u043A\u043E\u043D\u0435\u0446", "\u0432\u0441\u0451 \u043F\u0440\u043E\u043F\u0430\u043B\u043E", "\u0436\u0438\u0437\u043D\u044C \u0440\u0430\u0437\u0440\u0443\u0448\u0435\u043D\u0430"],
    description: "\u041F\u0440\u0435\u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E",
    correction: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0432\u0430\u0436\u043D\u043E \u0447\u0435\u0440\u0435\u0437 \u0433\u043E\u0434? \u0427\u0435\u0440\u0435\u0437 5 \u043B\u0435\u0442?"
  },
  minimization: {
    keywords: ["\u0432\u0441\u0435\u0433\u043E \u043B\u0438\u0448\u044C", "\u043F\u043E\u0434\u0443\u043C\u0430\u0435\u0448\u044C", "\u0435\u0440\u0443\u043D\u0434\u0430"],
    phrases: ["\u043D\u0438\u0447\u0435\u0433\u043E \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0433\u043E", "\u043C\u043E\u0433\u043B\u043E \u0431\u044B\u0442\u044C \u0445\u0443\u0436\u0435"],
    description: "\u041F\u0440\u0435\u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u0438\u0435 \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E\u0433\u043E",
    correction: "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044C, \u0447\u0442\u043E \u0434\u0440\u0443\u0433 \u044D\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u043B. \u041A\u0430\u043A \u0431\u044B \u0442\u044B \u043E\u0446\u0435\u043D\u0438\u043B \u0435\u0433\u043E \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435?"
  },
  emotional_reasoning: {
    keywords: ["\u0447\u0443\u0432\u0441\u0442\u0432\u0443\u044E", "\u043E\u0449\u0443\u0449\u0430\u044E", "\u043C\u043D\u0435 \u043A\u0430\u0436\u0435\u0442\u0441\u044F"],
    phrases: ["\u0447\u0443\u0432\u0441\u0442\u0432\u0443\u044E \u0441\u0435\u0431\u044F \u0433\u043B\u0443\u043F\u044B\u043C - \u0437\u043D\u0430\u0447\u0438\u0442 \u044F \u0433\u043B\u0443\u043F\u044B\u0439", "\u043C\u043D\u0435 \u043F\u043B\u043E\u0445\u043E - \u0437\u043D\u0430\u0447\u0438\u0442 \u0432\u0441\u0451 \u043F\u043B\u043E\u0445\u043E"],
    description: "\u042D\u043C\u043E\u0446\u0438\u0438 = \u0444\u0430\u043A\u0442\u044B",
    correction: "\u0427\u0443\u0432\u0441\u0442\u0432\u0430 \u0432\u0430\u0436\u043D\u044B, \u043D\u043E \u043E\u043D\u0438 \u043D\u0435 \u0432\u0441\u0435\u0433\u0434\u0430 \u043E\u0442\u0440\u0430\u0436\u0430\u044E\u0442 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C. \u041A\u0430\u043A\u0438\u0435 \u0444\u0430\u043A\u0442\u044B?"
  },
  should_statements: {
    keywords: ["\u0434\u043E\u043B\u0436\u0435\u043D", "\u043E\u0431\u044F\u0437\u0430\u043D", "\u043D\u0430\u0434\u043E", "\u0441\u043B\u0435\u0434\u0443\u0435\u0442"],
    phrases: ["\u044F \u0434\u043E\u043B\u0436\u0435\u043D", "\u043C\u043D\u0435 \u0441\u043B\u0435\u0434\u0443\u0435\u0442", "\u043D\u0443\u0436\u043D\u043E \u0431\u044B\u043B\u043E"],
    description: "\u0416\u0451\u0441\u0442\u043A\u0438\u0435 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u043A \u0441\u0435\u0431\u0435/\u0434\u0440\u0443\u0433\u0438\u043C",
    correction: '\u041A\u0442\u043E \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B \u044D\u0442\u043E "\u0434\u043E\u043B\u0436\u0435\u043D"? \u0427\u0442\u043E \u0431\u0443\u0434\u0435\u0442, \u0435\u0441\u043B\u0438 \u043F\u043E-\u0434\u0440\u0443\u0433\u043E\u043C\u0443?'
  },
  labeling: {
    keywords: ["\u043D\u0435\u0443\u0434\u0430\u0447\u043D\u0438\u043A", "\u0442\u0443\u043F\u043E\u0439", "\u0431\u0435\u0441\u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0439", "\u043D\u0438\u043A\u0447\u0451\u043C\u043D\u044B\u0439"],
    phrases: ["\u044F - \u043D\u0435\u0443\u0434\u0430\u0447\u043D\u0438\u043A", "\u044F \u0442\u0443\u043F\u043E\u0439", "\u044F \u0431\u0435\u0441\u043F\u043E\u043B\u0435\u0437\u0435\u043D"],
    description: "\u0413\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u044F\u0440\u043B\u044B\u043A\u0438",
    correction: "\u0422\u044B = \u043E\u0434\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435? \u0418\u043B\u0438 \u0442\u044B \u0431\u043E\u043B\u044C\u0448\u0435, \u0447\u0435\u043C \u043E\u0434\u043D\u0430 \u043E\u0448\u0438\u0431\u043A\u0430?"
  },
  personalization: {
    keywords: ["\u0438\u0437-\u0437\u0430 \u043C\u0435\u043D\u044F", "\u043C\u043E\u044F \u0432\u0438\u043D\u0430", "\u044F \u0432\u0438\u043D\u043E\u0432\u0430\u0442"],
    phrases: ["\u044D\u0442\u043E \u0432\u0441\u0451 \u0438\u0437-\u0437\u0430 \u043C\u0435\u043D\u044F", "\u0435\u0441\u043B\u0438 \u0431\u044B \u044F", "\u043C\u043E\u044F \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C"],
    description: "\u0412\u0441\u0451 - \u043C\u043E\u044F \u0432\u0438\u043D\u0430",
    correction: "\u041A\u0430\u043A\u0438\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u044B \u043D\u0435 \u0437\u0430\u0432\u0438\u0441\u0435\u043B\u0438 \u043E\u0442 \u0442\u0435\u0431\u044F? \u0427\u0442\u043E \u0431\u044B\u043B\u043E \u0432\u043D\u0435 \u0442\u0432\u043E\u0435\u0433\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F?"
  },
  blame: {
    keywords: ["\u0438\u0437-\u0437\u0430 \u043D\u0435\u0433\u043E", "\u043E\u043D\u0438 \u0432\u0438\u043D\u043E\u0432\u0430\u0442\u044B", "\u0438\u0445 \u0432\u0438\u043D\u0430"],
    phrases: ["\u044D\u0442\u043E \u0432\u0441\u0451 \u0438\u0437-\u0437\u0430 \u043D\u0438\u0445", "\u043E\u043D\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u043B\u0438"],
    description: "\u0412\u0441\u0451 - \u0432\u0438\u043D\u0430 \u0434\u0440\u0443\u0433\u0438\u0445",
    correction: "\u0427\u0442\u043E \u0442\u044B \u043C\u043E\u0436\u0435\u0448\u044C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432 \u044D\u0442\u043E\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438?"
  },
  comparison: {
    keywords: ["\u043B\u0443\u0447\u0448\u0435 \u043C\u0435\u043D\u044F", "\u0445\u0443\u0436\u0435 \u0447\u0435\u043C", "\u043A\u0430\u043A \u0443 \u0434\u0440\u0443\u0433\u0438\u0445"],
    phrases: ["\u0443 \u0432\u0441\u0435\u0445 \u043B\u0443\u0447\u0448\u0435", "\u044F \u0445\u0443\u0436\u0435 \u0434\u0440\u0443\u0433\u0438\u0445", "\u043F\u043E\u0447\u0435\u043C\u0443 \u0443 \u043D\u0438\u0445"],
    description: "\u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E\u0435 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438",
    correction: '\u0422\u044B \u0432\u0438\u0434\u0438\u0448\u044C \u0442\u043E\u043B\u044C\u043A\u043E "\u0432\u0438\u0442\u0440\u0438\u043D\u0443" \u0434\u0440\u0443\u0433\u0438\u0445. \u0427\u0442\u043E \u0442\u044B \u043D\u0435 \u0437\u043D\u0430\u0435\u0448\u044C \u043E \u0438\u0445 \u0436\u0438\u0437\u043D\u0438?'
  },
  fomo: {
    keywords: ["\u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E", "\u0443\u043F\u0443\u0441\u043A\u0430\u044E", "\u0431\u0435\u0437 \u043C\u0435\u043D\u044F"],
    phrases: ["\u0432\u0441\u0435 \u0432\u0435\u0441\u0435\u043B\u044F\u0442\u0441\u044F \u0431\u0435\u0437 \u043C\u0435\u043D\u044F", "\u044F \u0447\u0442\u043E-\u0442\u043E \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E"],
    description: "\u0421\u0442\u0440\u0430\u0445 \u0443\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0447\u0442\u043E-\u0442\u043E \u0432\u0430\u0436\u043D\u043E\u0435",
    correction: "\u0427\u0442\u043E \u0432\u0430\u0436\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0417\u0414\u0415\u0421\u042C \u0438 \u0421\u0415\u0419\u0427\u0410\u0421 \u0432 \u0442\u0432\u043E\u0435\u0439 \u0436\u0438\u0437\u043D\u0438?"
  },
  imposter_syndrome: {
    keywords: ["\u043D\u0435 \u0437\u0430\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u044E", "\u043E\u0431\u043C\u0430\u043D", "\u0440\u0430\u0437\u043E\u0431\u043B\u0430\u0447\u0430\u0442"],
    phrases: ["\u0441\u043A\u043E\u0440\u043E \u043F\u043E\u0439\u043C\u0443\u0442 \u0447\u0442\u043E \u044F", "\u043D\u0435 \u0437\u0430\u0441\u043B\u0443\u0436\u0438\u043B", "\u043F\u0440\u0438\u0442\u0432\u043E\u0440\u044F\u044E\u0441\u044C"],
    description: "\u041E\u0449\u0443\u0449\u0435\u043D\u0438\u0435 \u0441\u0435\u0431\u044F \u043E\u0431\u043C\u0430\u043D\u0449\u0438\u043A\u043E\u043C",
    correction: "\u041A\u0430\u043A\u0438\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044E\u0442 \u0442\u0432\u043E\u044E \u043A\u043E\u043C\u043F\u0435\u0442\u0435\u043D\u0442\u043D\u043E\u0441\u0442\u044C?"
  },
  perfectionism: {
    keywords: ["\u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E", "\u0431\u0435\u0437\u0443\u043F\u0440\u0435\u0447\u043D\u043E", "\u043D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E"],
    phrases: ["\u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E", "\u043D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E", "\u043C\u043E\u0433\u043B\u043E \u0431\u044B\u0442\u044C \u043B\u0443\u0447\u0448\u0435"],
    description: "\u041D\u0438\u0447\u0442\u043E \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E",
    correction: '\u0427\u0442\u043E \u0437\u043D\u0430\u0447\u0438\u0442 "\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E"? \u041A\u0442\u043E \u0443\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442?'
  },
  mind_reading: {
    keywords: ["\u043E\u043D \u0434\u0443\u043C\u0430\u0435\u0442", "\u043E\u043D\u0430 \u0441\u0447\u0438\u0442\u0430\u0435\u0442", "\u043E\u043D\u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u044B"],
    phrases: ["\u0437\u043D\u0430\u044E \u0447\u0442\u043E \u0434\u0443\u043C\u0430\u044E\u0442", "\u0443\u0432\u0435\u0440\u0435\u043D \u0447\u0442\u043E \u0441\u0447\u0438\u0442\u0430\u0435\u0442"],
    description: "\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0432 \u043C\u044B\u0441\u043B\u044F\u0445 \u0434\u0440\u0443\u0433\u0438\u0445",
    correction: "\u041E\u0442\u043A\u0443\u0434\u0430 \u0442\u044B \u0437\u043D\u0430\u0435\u0448\u044C \u0438\u0445 \u043C\u044B\u0441\u043B\u0438? \u0422\u044B \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u043B?"
  },
  fortune_telling: {
    keywords: ["\u0442\u043E\u0447\u043D\u043E \u0431\u0443\u0434\u0435\u0442", "\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0441\u043B\u0443\u0447\u0438\u0442\u0441\u044F", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435"],
    phrases: ["\u044D\u0442\u043E \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F \u043F\u043B\u043E\u0445\u043E", "\u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0439\u0434\u0435\u0442"],
    description: "\u041F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0435 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0431\u0443\u0434\u0443\u0449\u0435\u0433\u043E",
    correction: '\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437 \u0442\u0432\u043E\u0438 "\u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u044F" \u0441\u0431\u044B\u0432\u0430\u043B\u0438\u0441\u044C? \u0410 \u043D\u0435 \u0441\u0431\u044B\u0432\u0430\u043B\u0438\u0441\u044C?'
  },
  filtering: {
    keywords: ["\u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E", "\u0438\u043C\u0435\u043D\u043D\u043E \u044D\u0442\u043E"],
    phrases: ["\u0437\u0430\u043F\u043E\u043C\u043D\u0438\u043B \u0442\u043E\u043B\u044C\u043A\u043E", "\u0437\u0430\u043C\u0435\u0442\u0438\u043B \u0442\u043E\u043B\u044C\u043A\u043E"],
    description: "\u0418\u0437\u0431\u0438\u0440\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435",
    correction: "\u0427\u0442\u043E \u0435\u0449\u0451 \u0431\u044B\u043B\u043E \u0432 \u044D\u0442\u043E\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438? \u0427\u0442\u043E \u0442\u044B \u043D\u0435 \u0437\u0430\u043C\u0435\u0442\u0438\u043B?"
  },
  splitting: {
    keywords: ["\u0438\u0434\u0435\u0430\u043B\u044C\u043D\u044B\u0439", "\u0443\u0436\u0430\u0441\u043D\u044B\u0439", "\u043B\u0443\u0447\u0448\u0438\u0439", "\u0445\u0443\u0434\u0448\u0438\u0439"],
    phrases: ["\u043E\u043D \u0438\u0434\u0435\u0430\u043B\u0435\u043D", "\u043E\u043D\u0430 \u0443\u0436\u0430\u0441\u043D\u0430", "\u0441\u0430\u043C\u044B\u0439 \u043B\u0443\u0447\u0448\u0438\u0439"],
    description: "\u041A\u0440\u0430\u0439\u043D\u043E\u0441\u0442\u0438 \u0432 \u043E\u0446\u0435\u043D\u043A\u0435 \u043B\u044E\u0434\u0435\u0439",
    correction: "\u041B\u044E\u0434\u0438 = \u0441\u043C\u0435\u0441\u044C \u043A\u0430\u0447\u0435\u0441\u0442\u0432. \u041A\u0430\u043A\u0438\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u0442\u044B \u043D\u0435 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0448\u044C?"
  },
  control_fallacy: {
    keywords: ["\u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C", "\u043D\u0435 \u043C\u043E\u0433\u0443 \u043F\u043E\u0432\u043B\u0438\u044F\u0442\u044C", "\u0432\u0441\u0451 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u043C\u0435\u043D\u044F"],
    phrases: ["\u044F \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043C\u043E\u0433\u0443 \u0441\u0434\u0435\u043B\u0430\u0442\u044C", "\u0432\u0441\u0451 \u0432 \u043C\u043E\u0438\u0445 \u0440\u0443\u043A\u0430\u0445"],
    description: "\u0418\u043B\u043B\u044E\u0437\u0438\u044F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F \u0438\u043B\u0438 \u0431\u0435\u0441\u043F\u043E\u043C\u043E\u0449\u043D\u043E\u0441\u0442\u0438",
    correction: "\u0427\u0442\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0432 \u0442\u0432\u043E\u0451\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435? \u0427\u0442\u043E \u043D\u0435\u0442?"
  },
  // Aliases (Phase 6 - type compatibility)
  black_and_white: {
    keywords: ["\u0432\u0441\u0435\u0433\u0434\u0430", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430", "\u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E", "\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u043E", "\u0442\u043E\u043B\u044C\u043A\u043E", "\u0432\u0441\u0451 \u0438\u043B\u0438 \u043D\u0438\u0447\u0435\u0433\u043E"],
    phrases: ["\u0432\u0441\u0451 \u043F\u043B\u043E\u0445\u043E", "\u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0441\u044F", "\u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043F\u043E\u0439\u043C\u0451\u0442"],
    description: "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u043E\u0435 \u043C\u044B\u0448\u043B\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043E\u0442\u0442\u0435\u043D\u043A\u043E\u0432 (\u0430\u043B\u0438\u0430\u0441 all_or_nothing)",
    correction: '\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043D\u0430\u0439\u0442\u0438 \u043E\u0442\u0442\u0435\u043D\u043A\u0438 \u0441\u0435\u0440\u043E\u0433\u043E. \u0427\u0442\u043E \u043C\u0435\u0436\u0434\u0443 "\u0432\u0441\u0435\u0433\u0434\u0430" \u0438 "\u043D\u0438\u043A\u043E\u0433\u0434\u0430"?'
  },
  catastrophizing: {
    keywords: ["\u043A\u0430\u0442\u0430\u0441\u0442\u0440\u043E\u0444\u0430", "\u0443\u0436\u0430\u0441", "\u043A\u043E\u0448\u043C\u0430\u0440", "\u043A\u043E\u043D\u0435\u0446"],
    phrases: ["\u044D\u0442\u043E \u043A\u043E\u043D\u0435\u0446", "\u0432\u0441\u0451 \u043F\u0440\u043E\u043F\u0430\u043B\u043E", "\u0436\u0438\u0437\u043D\u044C \u0440\u0430\u0437\u0440\u0443\u0448\u0435\u043D\u0430"],
    description: "\u041F\u0440\u0435\u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E (\u0430\u043B\u0438\u0430\u0441 magnification)",
    correction: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0432\u0430\u0436\u043D\u043E \u0447\u0435\u0440\u0435\u0437 \u0433\u043E\u0434? \u0427\u0435\u0440\u0435\u0437 5 \u043B\u0435\u0442?"
  }
};
var DISTORTION_INTERVENTIONS = {
  all_or_nothing: {
    technique: "\u041A\u043E\u043D\u0442\u0438\u043D\u0443\u0443\u043C \u043C\u044B\u0448\u043B\u0435\u043D\u0438\u044F",
    description: "\u041F\u043E\u0438\u0441\u043A \u043E\u0442\u0442\u0435\u043D\u043A\u043E\u0432 \u043C\u0435\u0436\u0434\u0443 \u043A\u0440\u0430\u0439\u043D\u043E\u0441\u0442\u044F\u043C\u0438",
    steps: [
      "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u043A\u0440\u0430\u0439\u043D\u0438\u0435 \u0442\u043E\u0447\u043A\u0438 (0% \u0438 100%)",
      "\u041D\u0430\u0439\u0434\u0438 \u0442\u043E\u0447\u043A\u0443 \u043F\u043E\u0441\u0435\u0440\u0435\u0434\u0438\u043D\u0435 (50%)",
      "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438, \u0433\u0434\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0440\u0435\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044F",
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u043D\u044E\u0430\u043D\u0441\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0440\u0430\u043D\u044C\u0448\u0435 \u043D\u0435 \u0437\u0430\u043C\u0435\u0447\u0430\u043B"
    ],
    durationMinutes: 5
  },
  overgeneralization: {
    technique: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0439",
    description: "\u041F\u043E\u0438\u0441\u043A \u0441\u043B\u0443\u0447\u0430\u0435\u0432, \u043A\u043E\u0433\u0434\u0430 \u0431\u044B\u043B\u043E \u043F\u043E-\u0434\u0440\u0443\u0433\u043E\u043C\u0443",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0441\u0432\u043E\u0451 \u043E\u0431\u043E\u0431\u0449\u0435\u043D\u0438\u0435",
      "\u0412\u0441\u043F\u043E\u043C\u043D\u0438 \u0445\u043E\u0442\u044F \u0431\u044B 3 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
      "\u041F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u0443\u0439 \u043C\u044B\u0441\u043B\u044C \u0431\u043E\u043B\u0435\u0435 \u0442\u043E\u0447\u043D\u043E",
      "\u0417\u0430\u043C\u0435\u0442\u044C, \u043A\u0430\u043A \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0449\u0443\u0449\u0435\u043D\u0438\u0435"
    ],
    durationMinutes: 5
  },
  mental_filter: {
    technique: "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0444\u043E\u043A\u0443\u0441\u0430",
    description: "\u041D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E\u0433\u043E",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0435, \u043D\u0430 \u0447\u0451\u043C \u0441\u0444\u043E\u043A\u0443\u0441\u0438\u0440\u043E\u0432\u0430\u043D",
      "\u041D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E \u043D\u0430\u0439\u0434\u0438 3 \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u044B\u0445 \u0444\u0430\u043A\u0442\u0430",
      "\u041D\u0430\u0439\u0434\u0438 \u0445\u043E\u0442\u044F \u0431\u044B 1 \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u044B\u0439 \u043C\u043E\u043C\u0435\u043D\u0442",
      "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0438 \u043D\u0430 \u043F\u043E\u043B\u043D\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u0443"
    ],
    durationMinutes: 5
  },
  disqualifying_positive: {
    technique: "\u0412\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u044F \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439",
    description: "\u041F\u0440\u0438\u0437\u043D\u0430\u043D\u0438\u0435 \u0441\u0432\u043E\u0438\u0445 \u0437\u0430\u0441\u043B\u0443\u0433",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043E\u0431\u0435\u0441\u0446\u0435\u043D\u0438\u0432\u0430\u0435\u0448\u044C",
      "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044C, \u0447\u0442\u043E \u044D\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u043B \u0434\u0440\u0443\u0433",
      "\u041A\u0430\u043A \u0431\u044B \u0442\u044B \u043E\u0446\u0435\u043D\u0438\u043B \u0415\u0413\u041E \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435?",
      "\u041F\u0440\u0438\u043C\u0435\u043D\u0438 \u0442\u043E\u0442 \u0436\u0435 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442 \u043A \u0441\u0435\u0431\u0435"
    ],
    durationMinutes: 5
  },
  jumping_to_conclusions: {
    technique: "\u0421\u0431\u043E\u0440 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432",
    description: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0444\u0430\u043A\u0442\u0430\u043C\u0438",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0441\u0432\u043E\u0439 \u0432\u044B\u0432\u043E\u0434",
      "\u041A\u0430\u043A\u0438\u0435 \u0444\u0430\u043A\u0442\u044B \u0417\u0410 \u044D\u0442\u043E\u0442 \u0432\u044B\u0432\u043E\u0434?",
      "\u041A\u0430\u043A\u0438\u0435 \u0444\u0430\u043A\u0442\u044B \u041F\u0420\u041E\u0422\u0418\u0412?",
      "\u041A\u0430\u043A\u0438\u0435 \u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B?"
    ],
    durationMinutes: 7
  },
  magnification: {
    technique: "\u041C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
    description: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0430",
    steps: [
      "\u041E\u0446\u0435\u043D\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443 \u043F\u043E \u0448\u043A\u0430\u043B\u0435 1-10 \u0441\u0435\u0439\u0447\u0430\u0441",
      "\u041A\u0430\u043A \u043E\u0446\u0435\u043D\u0438\u0448\u044C \u0447\u0435\u0440\u0435\u0437 \u043D\u0435\u0434\u0435\u043B\u044E?",
      "\u0427\u0435\u0440\u0435\u0437 \u043C\u0435\u0441\u044F\u0446?",
      "\u0427\u0435\u0440\u0435\u0437 \u0433\u043E\u0434?",
      "\u0427\u0442\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0441\u044F?"
    ],
    durationMinutes: 5
  },
  minimization: {
    technique: "\u041F\u0440\u0438\u0437\u043D\u0430\u043D\u0438\u0435 \u0437\u043D\u0430\u0447\u0438\u043C\u043E\u0441\u0442\u0438",
    description: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0432\u043A\u043B\u0430\u0434\u0430",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0442\u043E, \u0447\u0442\u043E \u043F\u0440\u0435\u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0435\u0448\u044C",
      "\u041A\u0430\u043A\u0438\u0435 \u0443\u0441\u0438\u043B\u0438\u044F \u043F\u043E\u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043B\u0438\u0441\u044C?",
      "\u041A\u0430\u043A\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u0438 \u0442\u044B \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u043B?",
      "\u0427\u0442\u043E \u044D\u0442\u043E \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u043E \u0442\u0435\u0431\u0435?"
    ],
    durationMinutes: 5
  },
  emotional_reasoning: {
    technique: "\u0420\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0447\u0443\u0432\u0441\u0442\u0432 \u0438 \u0444\u0430\u043A\u0442\u043E\u0432",
    description: "\u0420\u0430\u0437\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u044D\u043C\u043E\u0446\u0438\u0439 \u0438 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438",
    steps: [
      '\u0417\u0430\u043F\u0438\u0448\u0438: "\u042F \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u044E..."',
      '\u0417\u0430\u043F\u0438\u0448\u0438: "\u0424\u0430\u043A\u0442\u044B \u0433\u043E\u0432\u043E\u0440\u044F\u0442..."',
      "\u0421\u0440\u0430\u0432\u043D\u0438 \u044D\u0442\u0438 \u0434\u0432\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F",
      "\u0427\u0442\u043E \u0431\u043E\u043B\u0435\u0435 \u0442\u043E\u0447\u043D\u043E \u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C?"
    ],
    durationMinutes: 5
  },
  should_statements: {
    technique: "\u0413\u0438\u0431\u043A\u0438\u0435 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u044F",
    description: '\u0417\u0430\u043C\u0435\u043D\u0430 "\u0434\u043E\u043B\u0436\u0435\u043D" \u043D\u0430 "\u0445\u043E\u0442\u0435\u043B \u0431\u044B"',
    steps: [
      '\u0417\u0430\u043F\u0438\u0448\u0438 \u0441\u0432\u043E\u0451 "\u0434\u043E\u043B\u0436\u0435\u043D"',
      '\u0417\u0430\u043C\u0435\u043D\u0438 \u043D\u0430 "\u0431\u044B\u043B\u043E \u0431\u044B \u0445\u043E\u0440\u043E\u0448\u043E, \u0435\u0441\u043B\u0438..."',
      '\u0418\u043B\u0438 \u043D\u0430 "\u044F \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0451\u043B \u0431\u044B..."',
      "\u041A\u0430\u043A \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0449\u0443\u0449\u0435\u043D\u0438\u0435?"
    ],
    durationMinutes: 3
  },
  labeling: {
    technique: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0432\u043C\u0435\u0441\u0442\u043E \u044F\u0440\u043B\u044B\u043A\u0430",
    description: "\u041A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u044F\u0440\u043B\u044B\u043A, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0448\u044C",
      "\u041E\u043F\u0438\u0448\u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u043F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u044F\u0440\u043B\u044B\u043A\u0430",
      "\u0422\u044B = \u0441\u0443\u043C\u043C\u0430 \u0432\u0441\u0435\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439, \u043D\u0435 \u043E\u0434\u043D\u043E\u0433\u043E",
      "\u041A\u0430\u043A\u0438\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043B\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u043C\u0435\u0440\u044B \u0435\u0441\u0442\u044C?"
    ],
    durationMinutes: 5
  },
  personalization: {
    technique: "\u0410\u043D\u0430\u043B\u0438\u0437 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438",
    description: "\u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u043E\u0432 \u0432\u043B\u0438\u044F\u043D\u0438\u044F",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044E",
      "\u041F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438 \u0412\u0421\u0415 \u0444\u0430\u043A\u0442\u043E\u0440\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u0432\u043B\u0438\u044F\u043B\u0438",
      "\u041A\u0430\u043A\u043E\u0439 % \u0442\u0432\u043E\u0435\u0433\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0432\u043B\u0438\u044F\u043D\u0438\u044F?",
      "\u0427\u0442\u043E \u0431\u044B\u043B\u043E \u0432\u043D\u0435 \u0442\u0432\u043E\u0435\u0433\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F?"
    ],
    durationMinutes: 5
  },
  blame: {
    technique: "\u041A\u0440\u0443\u0433 \u0432\u043B\u0438\u044F\u043D\u0438\u044F",
    description: "\u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0442\u043E\u043C, \u0447\u0442\u043E \u043C\u043E\u0436\u0435\u0448\u044C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    steps: [
      "\u0427\u0442\u043E \u0442\u044B \u043C\u043E\u0436\u0435\u0448\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438?",
      "\u0427\u0442\u043E \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0434\u0440\u0443\u0433\u0438\u0445?",
      "\u0421\u0444\u043E\u043A\u0443\u0441\u0438\u0440\u0443\u0439\u0441\u044F \u043D\u0430 \u0441\u0432\u043E\u0451\u043C \u043A\u0440\u0443\u0433\u0435 \u0432\u043B\u0438\u044F\u043D\u0438\u044F",
      "\u041A\u0430\u043A\u043E\u0439 \u043F\u0435\u0440\u0432\u044B\u0439 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439 \u0448\u0430\u0433?"
    ],
    durationMinutes: 5
  },
  comparison: {
    technique: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441 \u0441\u043E\u0431\u043E\u0439",
    description: "\u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u043B\u0438\u0447\u043D\u043E\u043C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0435",
    steps: [
      "\u0421\u0440\u0430\u0432\u043D\u0438 \u0441\u0435\u0431\u044F \u0441\u0435\u0439\u0447\u0430\u0441 \u0441 \u0441\u043E\u0431\u043E\u0439 \u0433\u043E\u0434 \u043D\u0430\u0437\u0430\u0434",
      "\u041A\u0430\u043A\u043E\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0442\u044B \u0441\u0434\u0435\u043B\u0430\u043B?",
      "\u0423 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u0432\u043E\u0439 \u043F\u0443\u0442\u044C, \u0443 \u0442\u0435\u0431\u044F \u0441\u0432\u043E\u0439",
      "\u0427\u0442\u043E \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0432 \u0442\u0432\u043E\u0451\u043C \u043F\u0443\u0442\u0438?"
    ],
    durationMinutes: 5
  },
  fomo: {
    technique: "JOMO - Joy of Missing Out",
    description: "\u0420\u0430\u0434\u043E\u0441\u0442\u044C \u043E\u0442 \u0442\u043E\u0433\u043E, \u0447\u0442\u043E \u0435\u0441\u0442\u044C",
    steps: [
      "\u0427\u0442\u043E \u0445\u043E\u0440\u043E\u0448\u0435\u0433\u043E \u0432 \u0442\u0432\u043E\u0435\u0439 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438?",
      "\u0427\u0442\u043E \u0442\u044B \u041F\u041E\u041B\u0423\u0427\u0410\u0415\u0428\u042C, \u043D\u0435 \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u044F?",
      "\u0412\u0440\u0435\u043C\u044F, \u044D\u043D\u0435\u0440\u0433\u0438\u044E, \u0441\u043F\u043E\u043A\u043E\u0439\u0441\u0442\u0432\u0438\u0435?",
      "\u0427\u0442\u043E \u0432\u0430\u0436\u043D\u043E\u0433\u043E \u0442\u044B \u043C\u043E\u0436\u0435\u0448\u044C \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441?"
    ],
    durationMinutes: 5
  },
  imposter_syndrome: {
    technique: "\u0424\u0430\u0439\u043B \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439",
    description: "\u0421\u0431\u043E\u0440 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432 \u043A\u043E\u043C\u043F\u0435\u0442\u0435\u043D\u0442\u043D\u043E\u0441\u0442\u0438",
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 5 \u0441\u0432\u043E\u0438\u0445 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439",
      "\u041A\u0430\u043A\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u0438 \u043E\u043D\u0438 \u0434\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0438\u0440\u0443\u044E\u0442?",
      "\u0427\u0442\u043E \u0433\u043E\u0432\u043E\u0440\u0438\u043B\u0438 \u043E \u0442\u0435\u0431\u0435 \u0434\u0440\u0443\u0433\u0438\u0435?",
      "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u044D\u0442\u043E\u0442 \u0441\u043F\u0438\u0441\u043E\u043A \u0438 \u043F\u0435\u0440\u0435\u0447\u0438\u0442\u044B\u0432\u0430\u0439"
    ],
    durationMinutes: 10
  },
  perfectionism: {
    technique: "\u0414\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E",
    description: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0440\u0435\u0430\u043B\u0438\u0441\u0442\u0438\u0447\u043D\u043E\u0433\u043E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u0430",
    steps: [
      '\u0427\u0442\u043E \u0437\u043D\u0430\u0447\u0438\u0442 "\u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E" \u0434\u043B\u044F \u0442\u0435\u0431\u044F?',
      '\u0427\u0442\u043E \u0437\u043D\u0430\u0447\u0438\u0442 "\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E"?',
      "\u041A\u0430\u043A\u043E\u0432\u0430 \u0446\u0435\u043D\u0430 \u0438\u0434\u0435\u0430\u043B\u0438\u0437\u043C\u0430?",
      '\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 "\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0445\u043E\u0440\u043E\u0448\u043E" \u043E\u0434\u0438\u043D \u0440\u0430\u0437'
    ],
    durationMinutes: 5
  },
  mind_reading: {
    technique: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438",
    description: "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u043C\u0435\u0441\u0442\u043E \u0443\u0433\u0430\u0434\u044B\u0432\u0430\u0442\u044C",
    steps: [
      "\u0427\u0442\u043E \u0442\u044B \u0434\u0443\u043C\u0430\u0435\u0448\u044C \u043E \u043C\u044B\u0441\u043B\u044F\u0445 \u0434\u0440\u0443\u0433\u043E\u0433\u043E?",
      "\u041A\u0430\u043A\u0438\u0435 \u0435\u0441\u0442\u044C \u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F?",
      "\u041C\u043E\u0436\u0435\u0448\u044C \u043B\u0438 \u0442\u044B \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E?",
      "\u0427\u0442\u043E \u0441\u0430\u043C\u043E\u0435 \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0435 \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u0435?"
    ],
    durationMinutes: 5
  },
  fortune_telling: {
    technique: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0439",
    description: '\u0410\u043D\u0430\u043B\u0438\u0437 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 "\u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0439"',
    steps: [
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u0441\u0432\u043E\u0451 \u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0435",
      "\u0412\u0441\u043F\u043E\u043C\u043D\u0438 3 \u0441\u043B\u0443\u0447\u0430\u044F, \u043A\u043E\u0433\u0434\u0430 \u0442\u044B \u043E\u0448\u0438\u0431\u0430\u043B\u0441\u044F",
      "\u041A\u0430\u043A\u043E\u0439 % \u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0439 \u0441\u0431\u044B\u0432\u0430\u043B\u0441\u044F?",
      "\u041A\u0430\u043A\u043E\u0439 \u043D\u0430\u0438\u0431\u043E\u043B\u0435\u0435 \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u044B\u0439 \u0438\u0441\u0445\u043E\u0434?"
    ],
    durationMinutes: 5
  },
  filtering: {
    technique: "\u041F\u043E\u043B\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u0430",
    description: "\u041D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0441\u0431\u043E\u0440 \u0432\u0441\u0435\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438",
    steps: [
      "\u0427\u0442\u043E \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0442\u044B \u0437\u0430\u043C\u0435\u0442\u0438\u043B?",
      "\u0427\u0442\u043E \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0431\u044B\u043B\u043E?",
      "\u0427\u0442\u043E \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0431\u044B\u043B\u043E?",
      "\u041A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043F\u043E\u043B\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u0430?"
    ],
    durationMinutes: 5
  },
  splitting: {
    technique: "\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F",
    description: "\u0412\u0438\u0434\u0435\u043D\u0438\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0446\u0435\u043B\u0438\u043A\u043E\u043C",
    steps: [
      "3 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430",
      "3 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430",
      "\u041B\u044E\u0434\u0438 = \u0441\u043B\u043E\u0436\u043D\u044B\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0430",
      "\u041A\u0430\u043A \u044D\u0442\u043E \u043C\u0435\u043D\u044F\u0435\u0442 \u0442\u0432\u043E\u0451 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0435?"
    ],
    durationMinutes: 5
  },
  control_fallacy: {
    technique: "\u041A\u0440\u0443\u0433\u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F",
    description: "\u0420\u0430\u0437\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0437\u043E\u043D \u0432\u043B\u0438\u044F\u043D\u0438\u044F",
    steps: [
      "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 3 \u043A\u0440\u0443\u0433\u0430: \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C, \u0432\u043B\u0438\u044F\u043D\u0438\u0435, \u0432\u043D\u0435 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F",
      "\u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u0444\u0430\u043A\u0442\u043E\u0440\u044B \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438 \u043F\u043E \u043A\u0440\u0443\u0433\u0430\u043C",
      "\u0421\u0444\u043E\u043A\u0443\u0441\u0438\u0440\u0443\u0439\u0441\u044F \u043D\u0430 \u043F\u0435\u0440\u0432\u043E\u043C \u043A\u0440\u0443\u0433\u0435",
      "\u041F\u0440\u0438\u043C\u0438 \u0442\u043E, \u0447\u0442\u043E \u0432 \u0442\u0440\u0435\u0442\u044C\u0435\u043C \u043A\u0440\u0443\u0433\u0435"
    ],
    durationMinutes: 7
  },
  // Aliases (Phase 6 - type compatibility)
  black_and_white: {
    technique: "\u041A\u043E\u043D\u0442\u0438\u043D\u0443\u0443\u043C \u043C\u044B\u0448\u043B\u0435\u043D\u0438\u044F",
    description: "\u041F\u043E\u0438\u0441\u043A \u043E\u0442\u0442\u0435\u043D\u043A\u043E\u0432 \u043C\u0435\u0436\u0434\u0443 \u043A\u0440\u0430\u0439\u043D\u043E\u0441\u0442\u044F\u043C\u0438 (\u0430\u043B\u0438\u0430\u0441 all_or_nothing)",
    steps: [
      "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u043A\u0440\u0430\u0439\u043D\u0438\u0435 \u0442\u043E\u0447\u043A\u0438 (0% \u0438 100%)",
      "\u041D\u0430\u0439\u0434\u0438 \u0442\u043E\u0447\u043A\u0443 \u043F\u043E\u0441\u0435\u0440\u0435\u0434\u0438\u043D\u0435 (50%)",
      "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438, \u0433\u0434\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0440\u0435\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044F",
      "\u0417\u0430\u043F\u0438\u0448\u0438 \u043D\u044E\u0430\u043D\u0441\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0440\u0430\u043D\u044C\u0448\u0435 \u043D\u0435 \u0437\u0430\u043C\u0435\u0447\u0430\u043B"
    ],
    durationMinutes: 5
  },
  catastrophizing: {
    technique: "\u041C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
    description: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0430 (\u0430\u043B\u0438\u0430\u0441 magnification)",
    steps: [
      "\u041E\u0446\u0435\u043D\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443 \u043F\u043E \u0448\u043A\u0430\u043B\u0435 1-10 \u0441\u0435\u0439\u0447\u0430\u0441",
      "\u041A\u0430\u043A \u043E\u0446\u0435\u043D\u0438\u0448\u044C \u0447\u0435\u0440\u0435\u0437 \u043D\u0435\u0434\u0435\u043B\u044E?",
      "\u0427\u0435\u0440\u0435\u0437 \u043C\u0435\u0441\u044F\u0446?",
      "\u0427\u0435\u0440\u0435\u0437 \u0433\u043E\u0434?",
      "\u0427\u0442\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0441\u044F?"
    ],
    durationMinutes: 5
  }
};

// src/state/interfaces/IStateVector.ts
var WELLBEING_WEIGHTS = {
  emotional: {
    valence: 0.25,
    arousal: 0.1,
    dominance: 0.15
  },
  cognitive: {
    coreBeliefs: 0.15,
    distortionAbsence: 0.1
  },
  narrative: {
    stageProgress: 0.05,
    roleGrowth: 0.05
  },
  risk: {
    safetyInverse: 0.05
    // Higher safety = higher wellbeing
  },
  resources: {
    perma: 0.1
  }
};
var INDEX_THRESHOLDS = {
  wellbeing: {
    critical: 20,
    low: 40,
    moderate: 60,
    good: 80,
    excellent: 95
  },
  stability: {
    volatile: 20,
    unstable: 40,
    moderate: 60,
    stable: 80,
    veryStable: 95
  },
  urgency: {
    none: 20,
    low: 40,
    moderate: 60,
    high: 80,
    critical: 95
  }
};
function getComponentStatus(score) {
  if (score >= 0.8) return "excellent";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "moderate";
  if (score >= 0.2) return "concerning";
  return "critical";
}

// src/belief/BeliefStateAdapter.ts
var DIMENSION_MAPPING = {
  0: "valence",
  1: "arousal",
  2: "dominance",
  3: "risk",
  4: "resources"
};
var DIMENSION_INDEX = {
  valence: 0,
  arousal: 1,
  dominance: 2,
  risk: 3,
  resources: 4
};
function beliefStateToObservation(belief) {
  const valence = belief.emotional.valence.posterior.mean;
  const arousal = belief.emotional.arousal.posterior.mean;
  const dominance = belief.emotional.dominance.posterior.mean;
  const risk = belief.risk.overallRisk.posterior.mean;
  const resources = (belief.resources.energy.posterior.mean + belief.resources.copingCapacity.posterior.mean + belief.resources.socialSupport.posterior.mean) / 3;
  return [valence, arousal, dominance, risk, resources];
}
function beliefStateToUncertainty(belief) {
  return [
    belief.emotional.valence.posterior.variance,
    belief.emotional.arousal.posterior.variance,
    belief.emotional.dominance.posterior.variance,
    belief.risk.overallRisk.posterior.variance,
    (belief.resources.energy.posterior.variance + belief.resources.copingCapacity.posterior.variance + belief.resources.socialSupport.posterior.variance) / 3
  ];
}
function beliefStateToPLRNNState(belief, hiddenUnits = 16) {
  const observation = beliefStateToObservation(belief);
  const uncertainty = beliefStateToUncertainty(belief);
  return {
    latentState: observation,
    // Use observation as initial latent state
    hiddenActivations: new Array(hiddenUnits).fill(0).map(() => Math.random() * 0.1),
    observedState: observation,
    uncertainty,
    timestamp: belief.timestamp,
    timestep: 0
  };
}
function plrnnStateToBeliefUpdate(plrnnState) {
  const obs = plrnnState.observedState;
  const unc = plrnnState.uncertainty;
  return {
    valence: { mean: obs[0] ?? 0, variance: unc[0] ?? 0.1 },
    arousal: { mean: obs[1] ?? 0, variance: unc[1] ?? 0.1 },
    dominance: { mean: obs[2] ?? 0.5, variance: unc[2] ?? 0.1 },
    risk: { mean: obs[3] ?? 0.1, variance: unc[3] ?? 0.1 },
    resources: { mean: obs[4] ?? 0.5, variance: unc[4] ?? 0.1 }
  };
}
function beliefStateToKalmanFormerState(belief, _contextWindow = 24) {
  const observation = beliefStateToObservation(belief);
  const uncertainty = beliefStateToUncertainty(belief);
  const dim = observation.length;
  const covariance = uncertainty.map(
    (v, i) => uncertainty.map((_, j) => i === j ? v : 0)
  );
  const kalmanState = {
    // Current estimates
    stateEstimate: observation,
    errorCovariance: covariance,
    // Predicted values (same as current for initial state)
    predictedState: observation,
    predictedCovariance: covariance,
    // Innovation (zero for initial state)
    innovation: new Array(dim).fill(0),
    innovationCovariance: covariance,
    // Kalman gain (identity-like for initial)
    kalmanGain: new Array(dim).fill(0).map(
      (_, i) => new Array(dim).fill(0).map((_2, j) => i === j ? 0.5 : 0)
    ),
    // 2025 Diagnostics
    normalized_innovation_squared: 0,
    isOutlier: false,
    adaptedQ: null,
    adaptedR: null,
    // Metadata
    timestep: 0,
    timestamp: belief.timestamp
  };
  return {
    kalmanState,
    transformerHidden: [new Array(64).fill(0)],
    // Placeholder for transformer hidden
    observationHistory: [{
      observation,
      timestamp: belief.timestamp
    }],
    currentBlendRatio: 0.5,
    confidence: belief.meta.overallConfidence,
    timestamp: belief.timestamp
  };
}
function kalmanFormerStateToBeliefUpdate(kfState) {
  const state = kfState.kalmanState.stateEstimate;
  const cov = kfState.kalmanState.errorCovariance;
  return {
    valence: { mean: state[0] ?? 0, variance: cov[0]?.[0] ?? 0.1 },
    arousal: { mean: state[1] ?? 0, variance: cov[1]?.[1] ?? 0.1 },
    dominance: { mean: state[2] ?? 0.5, variance: cov[2]?.[2] ?? 0.1 },
    risk: { mean: state[3] ?? 0.1, variance: cov[3]?.[3] ?? 0.1 },
    resources: { mean: state[4] ?? 0.5, variance: cov[4]?.[4] ?? 0.1 }
  };
}
function mergeHybridPredictions(plrnnPred, kfPred, horizon = "medium", confidence = 0.5) {
  let plrnnWeight;
  let kfWeight;
  let hoursAhead;
  switch (horizon) {
    case "short":
      plrnnWeight = 0.3;
      kfWeight = 0.7;
      hoursAhead = 4;
      break;
    case "long":
      plrnnWeight = 0.8;
      kfWeight = 0.2;
      hoursAhead = 48;
      break;
    case "medium":
    default:
      plrnnWeight = 0.5;
      kfWeight = 0.5;
      hoursAhead = 12;
  }
  let trajectory = [];
  let finalPrediction = [];
  if (plrnnPred && kfPred) {
    const plrnnFinal = plrnnPred.meanPrediction;
    const kfFinal = kfPred.blendedPrediction;
    finalPrediction = plrnnFinal.map(
      (p, i) => p * plrnnWeight + (kfFinal[i] ?? 0) * kfWeight
    );
    trajectory = plrnnPred.trajectory.map((state, idx) => {
      const plrnnObs = state.observedState;
      const kfObs = kfPred.trajectory?.[idx]?.kalmanState.stateEstimate ?? plrnnObs;
      return plrnnObs.map((p, i) => p * plrnnWeight + (kfObs[i] ?? 0) * kfWeight);
    });
  } else if (plrnnPred) {
    finalPrediction = plrnnPred.meanPrediction;
    trajectory = plrnnPred.trajectory.map((s) => s.observedState);
  } else if (kfPred) {
    finalPrediction = kfPred.blendedPrediction;
    trajectory = kfPred.trajectory?.map((s) => s.kalmanState.stateEstimate) ?? [finalPrediction];
  }
  const credibleIntervals = [{
    lower: plrnnPred?.confidenceInterval.lower ?? finalPrediction.map((v) => v - 0.2),
    upper: plrnnPred?.confidenceInterval.upper ?? finalPrediction.map((v) => v + 0.2),
    level: 0.95
  }];
  let primaryEngine;
  if (horizon === "long" || !kfPred && plrnnPred) {
    primaryEngine = "plrnn";
  } else if (horizon === "short" || !plrnnPred && kfPred) {
    primaryEngine = "kalmanformer";
  } else {
    primaryEngine = "plrnn";
  }
  return {
    plrnnPrediction: plrnnPred,
    kalmanFormerPrediction: kfPred,
    blendedPrediction: {
      trajectory,
      credibleIntervals,
      finalPrediction
    },
    earlyWarningSignals: plrnnPred?.earlyWarningSignals ?? [],
    attention: kfPred?.attention,
    horizon,
    hoursAhead,
    confidence,
    primaryEngine
  };
}
var BeliefStateAdapter = class {
  constructor(engines) {
    __publicField(this, "plrnnEngine");
    __publicField(this, "kalmanFormerEngine");
    this.plrnnEngine = engines?.plrnn;
    this.kalmanFormerEngine = engines?.kalmanFormer;
  }
  /**
   * Set PLRNN engine
   */
  setPLRNNEngine(engine) {
    this.plrnnEngine = engine;
  }
  /**
   * Set KalmanFormer engine
   */
  setKalmanFormerEngine(engine) {
    this.kalmanFormerEngine = engine;
  }
  /**
   * Hybrid prediction using Phase 1 engines
   * ROADMAP task 1.1.3 deliverable
   */
  predictHybrid(belief, horizon = "medium") {
    const plrnnState = beliefStateToPLRNNState(belief);
    const kfState = beliefStateToKalmanFormerState(belief);
    const hoursMap = { short: 4, medium: 12, long: 48 };
    const hours = hoursMap[horizon];
    let plrnnPred;
    let kfPred;
    if (this.plrnnEngine) {
      plrnnPred = this.plrnnEngine.predict(plrnnState, hours);
    }
    if (this.kalmanFormerEngine) {
      kfPred = this.kalmanFormerEngine.predict(kfState, hours);
    }
    return mergeHybridPredictions(
      plrnnPred,
      kfPred,
      horizon,
      belief.meta.overallConfidence
    );
  }
  /**
   * Extract causal network from current belief and PLRNN weights
   */
  extractCausalNetwork(_belief) {
    if (!this.plrnnEngine) {
      return null;
    }
    return this.plrnnEngine.extractCausalNetwork();
  }
  /**
   * Simulate intervention effect on belief state
   */
  simulateIntervention(belief, target, intervention, magnitude) {
    if (!this.plrnnEngine) {
      return null;
    }
    const plrnnState = beliefStateToPLRNNState(belief);
    return this.plrnnEngine.simulateIntervention(
      plrnnState,
      target,
      intervention,
      magnitude
    );
  }
  /**
   * Get attention explanation for current state
   */
  explainPrediction(belief) {
    if (!this.kalmanFormerEngine) {
      return null;
    }
    const kfState = beliefStateToKalmanFormerState(belief);
    return this.kalmanFormerEngine.explain(kfState);
  }
  /**
   * Convert belief to observation vector
   */
  toObservation(belief) {
    return beliefStateToObservation(belief);
  }
  /**
   * Convert belief to PLRNN state
   */
  toPLRNNState(belief, hiddenUnits) {
    return beliefStateToPLRNNState(belief, hiddenUnits);
  }
  /**
   * Convert belief to KalmanFormer state
   */
  toKalmanFormerState(belief, contextWindow) {
    return beliefStateToKalmanFormerState(belief, contextWindow);
  }
};
function createBeliefStateAdapter(engines) {
  return new BeliefStateAdapter(engines);
}

// src/temporal/interfaces/IPLRNNEngine.ts
var DEFAULT_PLRNN_CONFIG = {
  latentDim: 5,
  // VAD (3) + risk (1) + resources (1)
  hiddenUnits: 16,
  connectivity: "dendritic",
  dendriticBases: 8,
  learningRate: 1e-3,
  teacherForcingRatio: 0.5,
  l1Regularization: 0.01,
  gradientClip: 1,
  predictionHorizon: 12,
  // 12 hours ahead
  dt: 1
  // 1 hour time steps
};

// src/temporal/interfaces/IKalmanFormer.ts
var DEFAULT_KALMANFORMER_CONFIG = {
  stateDim: 5,
  // VAD + risk + resources
  obsDim: 5,
  embedDim: 64,
  numHeads: 4,
  numLayers: 2,
  contextWindow: 24,
  // 24 historical observations
  dropout: 0.1,
  blendRatio: 0.5,
  // Equal weight initially
  learnedGain: true,
  temperature: 1,
  timeEmbedding: "sinusoidal",
  maxTimeGap: 48
  // 48 hours max interpolation
};

// src/temporal/engines/KalmanFormerEngine.ts
var STATE_DIMENSIONS = ["valence", "arousal", "dominance", "risk", "resources"];
var KalmanFormerEngine = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "weights", null);
    __publicField(this, "initialized", false);
    this.config = { ...DEFAULT_KALMANFORMER_CONFIG, ...config };
  }
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  initialize(config) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    const { stateDim, obsDim, embedDim, numHeads, numLayers } = this.config;
    const kalman = {
      stateTransition: this.initIdentityMatrix(stateDim),
      observationMatrix: this.initIdentityMatrix(obsDim),
      processNoise: this.initDiagonalMatrix(stateDim, 0.01),
      measurementNoise: this.initDiagonalMatrix(obsDim, 0.1)
    };
    const headDim = embedDim / numHeads;
    const transformer = {
      queryWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      keyWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      valueWeights: this.initTransformerWeights(numLayers, numHeads, embedDim, headDim),
      outputProjection: this.initRandomMatrix(embedDim, embedDim),
      feedforward: Array(numLayers).fill(null).map(() => ({
        linear1: this.initRandomMatrix(embedDim, embedDim * 4),
        linear2: this.initRandomMatrix(embedDim * 4, embedDim),
        bias1: new Array(embedDim * 4).fill(0),
        bias2: new Array(embedDim).fill(0)
      })),
      layerNorm: Array(numLayers * 2).fill(null).map(() => ({
        gamma: new Array(embedDim).fill(1),
        beta: new Array(embedDim).fill(0)
      }))
    };
    const embedding = {
      observation: this.initRandomMatrix(obsDim, embedDim),
      time: this.config.timeEmbedding === "learned" ? this.initRandomMatrix(1, embedDim) : void 0,
      position: this.initPositionalEmbedding(this.config.contextWindow, embedDim)
    };
    const gainPredictor = this.config.learnedGain ? {
      weights: this.initRandomMatrix(embedDim, stateDim * obsDim),
      bias: new Array(stateDim * obsDim).fill(0)
    } : void 0;
    const blendPredictor = {
      weights: new Array(embedDim).fill(0).map(() => Math.random() * 0.1),
      bias: 0.5
      // Start with equal blend
    };
    this.weights = {
      kalman,
      transformer,
      embedding,
      gainPredictor,
      blendPredictor,
      outputProjection: this.initRandomMatrix(embedDim, stateDim),
      meta: {
        trainedAt: /* @__PURE__ */ new Date(),
        trainingSamples: 0,
        validationLoss: Infinity,
        config: this.config
      }
    };
    this.initialized = true;
  }
  loadWeights(weights) {
    this.weights = weights;
    this.config = weights.meta.config;
    this.initialized = true;
  }
  getWeights() {
    if (!this.weights) {
      throw new Error("KalmanFormer not initialized");
    }
    return this.weights;
  }
  // ============================================================================
  // UPDATE (FILTER STEP)
  // ============================================================================
  update(state, observation, timestamp) {
    if (!this.weights || !this.initialized) {
      throw new Error("KalmanFormer not initialized");
    }
    const newHistory = [...state.observationHistory];
    newHistory.push({
      observation: [...observation],
      timestamp,
      embedding: this.embedObservation(observation, timestamp, newHistory.length)
    });
    while (newHistory.length > this.config.contextWindow) {
      newHistory.shift();
    }
    const kalmanPredicted = this.kalmanPredict(state.kalmanState);
    const contextEncoding = this.encodeContext(newHistory);
    let kalmanGain;
    if (this.config.learnedGain && this.weights.gainPredictor) {
      kalmanGain = this.predictKalmanGain(contextEncoding);
    } else {
      kalmanGain = this.computeStandardKalmanGain(kalmanPredicted);
    }
    const kalmanUpdated = this.kalmanUpdate(
      kalmanPredicted,
      observation,
      kalmanGain
    );
    const transformerPrediction = this.transformerPredict(newHistory, contextEncoding);
    const blendRatio = this.computeBlendRatio(
      contextEncoding,
      state.kalmanState,
      observation
    );
    const blendedState = this.blendPredictions(
      kalmanUpdated.stateEstimate,
      transformerPrediction,
      blendRatio
    );
    const newKalmanState = {
      ...kalmanUpdated,
      stateEstimate: blendedState
    };
    return {
      kalmanState: newKalmanState,
      transformerHidden: contextEncoding,
      observationHistory: newHistory,
      learnedGain: kalmanGain,
      currentBlendRatio: blendRatio,
      confidence: this.computeConfidence(kalmanUpdated, transformerPrediction, observation),
      timestamp
    };
  }
  // ============================================================================
  // PREDICTION
  // ============================================================================
  predict(state, horizon) {
    if (!this.weights || !this.initialized) {
      throw new Error("KalmanFormer not initialized");
    }
    const trajectory = [state];
    let currentState = state;
    for (let t = 0; t < horizon; t++) {
      const kalmanPred = this.kalmanPredict(currentState.kalmanState);
      const contextEncoding = this.encodeContext(currentState.observationHistory);
      const transformerPred = this.transformerPredict(
        currentState.observationHistory,
        contextEncoding
      );
      const blendedPred = this.blendPredictions(
        kalmanPred.stateEstimate,
        transformerPred,
        currentState.currentBlendRatio
      );
      const nextTimestamp = new Date(
        currentState.timestamp.getTime() + this.config.maxTimeGap / horizon * 36e5
      );
      const nextState = {
        kalmanState: {
          ...kalmanPred,
          stateEstimate: blendedPred
        },
        transformerHidden: contextEncoding,
        observationHistory: [
          ...currentState.observationHistory.slice(-this.config.contextWindow + 1),
          {
            observation: blendedPred,
            timestamp: nextTimestamp,
            embedding: this.embedObservation(blendedPred, nextTimestamp, currentState.observationHistory.length)
          }
        ],
        learnedGain: currentState.learnedGain,
        currentBlendRatio: currentState.currentBlendRatio,
        confidence: currentState.confidence * 0.95,
        // Decay confidence
        timestamp: nextTimestamp
      };
      trajectory.push(nextState);
      currentState = nextState;
    }
    const finalState = trajectory[trajectory.length - 1];
    const uncertainty = finalState.kalmanState.errorCovariance.map(
      (row) => Math.sqrt(row.reduce((max, v) => Math.max(max, v), 0))
    );
    const lower = finalState.kalmanState.stateEstimate.map(
      (v, i) => v - 1.96 * (uncertainty[i] ?? 0.1)
    );
    const upper = finalState.kalmanState.stateEstimate.map(
      (v, i) => v + 1.96 * (uncertainty[i] ?? 0.1)
    );
    const attention = this.explain(finalState);
    return {
      stateEstimate: finalState.kalmanState.stateEstimate,
      covariance: finalState.kalmanState.errorCovariance,
      kalmanContribution: this.kalmanPredict(state.kalmanState).stateEstimate,
      transformerContribution: this.transformerPredict(
        state.observationHistory,
        this.encodeContext(state.observationHistory)
      ),
      blendedPrediction: finalState.kalmanState.stateEstimate,
      confidenceInterval: { lower, upper, level: 0.95 },
      attention,
      horizon,
      trajectory
    };
  }
  // ============================================================================
  // ATTENTION & EXPLAINABILITY
  // ============================================================================
  explain(state) {
    if (!this.weights) {
      throw new Error("KalmanFormer not initialized");
    }
    const history = state.observationHistory;
    if (history.length === 0) {
      return {
        selfAttention: [],
        topInfluentialObservations: [],
        temporalPattern: "uniform"
      };
    }
    const embeddings = history.map((h) => h.embedding || this.embedObservation(
      h.observation,
      h.timestamp,
      0
    ));
    const attentionWeights = this.computeAttentionWeights(embeddings);
    const influenceScores = history.map((h, i) => {
      const totalWeight = attentionWeights[attentionWeights.length - 1]?.[i] || 0;
      return { index: i, timestamp: h.timestamp, weight: totalWeight };
    });
    const topInfluential = influenceScores.sort((a, b) => b.weight - a.weight).slice(0, 5).map((obs) => ({
      ...obs,
      dimension: this.findMostInfluentialDimension(history[obs.index]?.observation ?? [])
    }));
    const recentWeights = influenceScores.slice(-5);
    const earlyWeights = influenceScores.slice(0, 5);
    const recentAvg = recentWeights.reduce((s, w) => s + w.weight, 0) / recentWeights.length;
    const earlyAvg = earlyWeights.reduce((s, w) => s + w.weight, 0) / (earlyWeights.length || 1);
    let temporalPattern;
    if (recentAvg > earlyAvg * 1.5) {
      temporalPattern = "recency_bias";
    } else if (this.detectPatternMatching(attentionWeights)) {
      temporalPattern = "pattern_matching";
    } else {
      temporalPattern = "uniform";
    }
    return {
      selfAttention: [attentionWeights],
      topInfluentialObservations: topInfluential,
      temporalPattern
    };
  }
  // ============================================================================
  // BLEND RATIO ADAPTATION
  // ============================================================================
  adaptBlendRatio(predictions, actuals) {
    if (predictions.length !== actuals.length || predictions.length === 0) {
      return this.config.blendRatio;
    }
    let totalError = 0;
    for (let t = 0; t < predictions.length; t++) {
      const predRow = predictions[t];
      const actualRow = actuals[t];
      if (!predRow || !actualRow) continue;
      for (let i = 0; i < predRow.length; i++) {
        totalError += Math.pow((predRow[i] ?? 0) - (actualRow[i] ?? 0), 2);
      }
    }
    const firstPred = predictions[0];
    const avgError = Math.sqrt(totalError / (predictions.length * (firstPred?.length ?? 1)));
    const errorThreshold = 0.5;
    let newRatio = this.config.blendRatio;
    if (avgError > errorThreshold) {
      newRatio = Math.min(0.8, newRatio + 0.1);
    } else if (avgError < errorThreshold * 0.5) {
      newRatio = Math.max(0.2, newRatio - 0.1);
    }
    return newRatio;
  }
  // ============================================================================
  // TRAINING
  // ============================================================================
  train(samples) {
    if (!this.weights) {
      this.initialize();
    }
    let totalLoss = 0;
    let kalmanLoss = 0;
    let transformerLoss = 0;
    for (const sample of samples) {
      const firstObs = sample.observations[0];
      const firstTimestamp = sample.timestamps[0];
      if (!firstObs || !firstTimestamp) continue;
      let state = this.initializeState(firstObs, firstTimestamp);
      for (let t = 1; t < sample.observations.length; t++) {
        const obs = sample.observations[t];
        const ts = sample.timestamps[t];
        if (!obs || !ts) continue;
        state = this.update(state, obs, ts);
        const target = sample.groundTruth?.[t];
        if (target) {
          const kalmanPred = state.kalmanState.stateEstimate;
          const transformerPred = this.transformerPredict(
            state.observationHistory,
            state.transformerHidden
          );
          const kLoss = kalmanPred.reduce((sum, p, i) => sum + Math.pow(p - (target[i] ?? 0), 2), 0);
          const tLoss = transformerPred.reduce((sum, p, i) => sum + Math.pow(p - (target[i] ?? 0), 2), 0);
          kalmanLoss += kLoss;
          transformerLoss += tLoss;
          totalLoss += kLoss * (1 - state.currentBlendRatio) + tLoss * state.currentBlendRatio;
        }
      }
    }
    const count = samples.reduce((sum, s) => sum + s.observations.length - 1, 0);
    this.weights.meta.trainingSamples += samples.length;
    this.weights.meta.trainedAt = /* @__PURE__ */ new Date();
    this.weights.meta.validationLoss = totalLoss / count;
    return {
      loss: totalLoss / count,
      kalmanLoss: kalmanLoss / count,
      transformerLoss: transformerLoss / count,
      epochs: 1
    };
  }
  // ============================================================================
  // INTEROPERABILITY
  // ============================================================================
  toPLRNNState(state) {
    return {
      latentState: [...state.kalmanState.stateEstimate],
      hiddenActivations: state.transformerHidden[0] || [],
      observedState: [...state.kalmanState.stateEstimate],
      uncertainty: state.kalmanState.errorCovariance.map(
        (row) => Math.sqrt(row.reduce((max, v) => Math.max(max, Math.abs(v)), 0))
      ),
      timestamp: state.timestamp,
      timestep: state.observationHistory.length
    };
  }
  fromPLRNNState(plrnnState) {
    const n = plrnnState.latentState.length;
    return {
      kalmanState: {
        stateEstimate: [...plrnnState.observedState],
        errorCovariance: this.initDiagonalMatrix(n, 0.1),
        predictedState: [...plrnnState.latentState],
        predictedCovariance: this.initDiagonalMatrix(n, 0.1),
        innovation: new Array(n).fill(0),
        innovationCovariance: this.initDiagonalMatrix(n, 0.1),
        kalmanGain: this.initIdentityMatrix(n),
        normalized_innovation_squared: 0,
        isOutlier: false,
        adaptedQ: null,
        adaptedR: null,
        timestep: plrnnState.timestep,
        timestamp: plrnnState.timestamp
      },
      transformerHidden: [plrnnState.hiddenActivations],
      observationHistory: [{
        observation: [...plrnnState.observedState],
        timestamp: plrnnState.timestamp
      }],
      currentBlendRatio: this.config.blendRatio,
      confidence: 1 - plrnnState.uncertainty.reduce((a, b) => a + b, 0) / n,
      timestamp: plrnnState.timestamp
    };
  }
  getComplexityMetrics() {
    if (!this.weights) {
      return { totalParameters: 0, kalmanParameters: 0, transformerParameters: 0, effectiveContextLength: 0 };
    }
    const { stateDim, embedDim, numHeads, numLayers } = this.config;
    const kalmanParameters = 4 * stateDim * stateDim;
    const headDim = embedDim / numHeads;
    const qkvPerLayer = 3 * numHeads * embedDim * headDim;
    const ffnPerLayer = 2 * embedDim * embedDim * 4;
    const transformerParameters = numLayers * (qkvPerLayer + ffnPerLayer + 4 * embedDim);
    const embeddingParams = this.config.obsDim * embedDim + this.config.contextWindow * embedDim;
    return {
      totalParameters: kalmanParameters + transformerParameters + embeddingParams,
      kalmanParameters,
      transformerParameters,
      effectiveContextLength: this.config.contextWindow
    };
  }
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  initializeState(observation, timestamp) {
    const n = observation.length;
    return {
      kalmanState: {
        stateEstimate: [...observation],
        errorCovariance: this.initDiagonalMatrix(n, 0.1),
        predictedState: [...observation],
        predictedCovariance: this.initDiagonalMatrix(n, 0.1),
        innovation: new Array(n).fill(0),
        innovationCovariance: this.initDiagonalMatrix(n, 0.1),
        kalmanGain: this.initIdentityMatrix(n),
        normalized_innovation_squared: 0,
        isOutlier: false,
        adaptedQ: null,
        adaptedR: null,
        timestep: 0,
        timestamp
      },
      transformerHidden: [],
      observationHistory: [{
        observation: [...observation],
        timestamp,
        embedding: this.embedObservation(observation, timestamp, 0)
      }],
      currentBlendRatio: this.config.blendRatio,
      confidence: 0.5,
      timestamp
    };
  }
  kalmanPredict(state) {
    const A = this.weights.kalman.stateTransition;
    const Q = this.weights.kalman.processNoise;
    const predictedState = this.matVec(A, state.stateEstimate);
    const AP = this.matMul(A, state.errorCovariance);
    const APAt = this.matMul(AP, this.transpose(A));
    const predictedCovariance = this.matAdd(APAt, Q);
    return {
      ...state,
      predictedState,
      predictedCovariance,
      timestep: state.timestep + 1,
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  kalmanUpdate(predicted, observation, gain) {
    const H = this.weights.kalman.observationMatrix;
    const Hx = this.matVec(H, predicted.predictedState);
    const innovation = observation.map((z, i) => z - (Hx[i] ?? 0));
    const Ky = this.matVec(gain, innovation);
    const stateEstimate = predicted.predictedState.map((x, i) => x + (Ky[i] ?? 0));
    const n = stateEstimate.length;
    const KH = this.matMul(gain, H);
    const IminusKH = this.matSub(this.initIdentityMatrix(n), KH);
    const errorCovariance = this.matMul(IminusKH, predicted.predictedCovariance);
    return {
      ...predicted,
      stateEstimate,
      errorCovariance,
      innovation,
      kalmanGain: gain
    };
  }
  computeStandardKalmanGain(predicted) {
    const H = this.weights.kalman.observationMatrix;
    const R = this.weights.kalman.measurementNoise;
    const P = predicted.predictedCovariance;
    const HP = this.matMul(H, P);
    const HPHt = this.matMul(HP, this.transpose(H));
    const S = this.matAdd(HPHt, R);
    const PHt = this.matMul(P, this.transpose(H));
    const Sinv = this.matInverse(S);
    return this.matMul(PHt, Sinv);
  }
  predictKalmanGain(contextEncoding) {
    if (!this.weights.gainPredictor) {
      throw new Error("Gain predictor not initialized");
    }
    const lastContext = contextEncoding[contextEncoding.length - 1] || new Array(this.config.embedDim).fill(0);
    const gainVector = this.matVec(
      [this.weights.gainPredictor.weights.map((row) => row[0] || 0)],
      lastContext
    );
    const n = this.config.stateDim;
    const m = this.config.obsDim;
    const gain = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        const idx = i * m + j;
        row[j] = this.sigmoid(gainVector[idx] ?? 0);
      }
      gain[i] = row;
    }
    return gain;
  }
  embedObservation(observation, timestamp, position) {
    const { embedDim } = this.config;
    const obsMatrix = this.weights.embedding.observation;
    let embedding = this.matVec(obsMatrix, observation);
    if (this.weights.embedding.position) {
      const posEmb = this.weights.embedding.position[position % this.weights.embedding.position.length];
      if (posEmb) {
        embedding = embedding.map((v, i) => v + (posEmb[i] ?? 0));
      }
    }
    if (this.config.timeEmbedding === "sinusoidal") {
      const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
      const dayOfWeek = timestamp.getDay();
      for (let i = 0; i < embedDim; i += 2) {
        const freq = Math.pow(1e4, i / embedDim);
        const currVal = embedding[i] ?? 0;
        embedding[i] = currVal + Math.sin(hour * 2 * Math.PI / 24 / freq);
        if (i + 1 < embedDim) {
          const nextVal = embedding[i + 1] ?? 0;
          embedding[i + 1] = nextVal + Math.cos(dayOfWeek * 2 * Math.PI / 7 / freq);
        }
      }
    }
    return embedding;
  }
  encodeContext(history) {
    if (history.length === 0) {
      return [new Array(this.config.embedDim).fill(0)];
    }
    const embeddings = history.map(
      (h, i) => h.embedding || this.embedObservation(h.observation, h.timestamp, i)
    );
    let output = embeddings;
    const { numLayers } = this.config;
    for (let layer = 0; layer < numLayers; layer++) {
      const attended = this.multiHeadAttention(output, layer);
      output = this.addAndNorm(output, attended, layer * 2);
      const ffOutput = this.feedForward(output, layer);
      output = this.addAndNorm(output, ffOutput, layer * 2 + 1);
    }
    return output;
  }
  multiHeadAttention(input, _layer) {
    const { numHeads, embedDim } = this.config;
    const headDim = embedDim / numHeads;
    const seqLen = input.length;
    const headOutputs = [];
    for (let h = 0; h < numHeads; h++) {
      const Q = input.map((emb) => emb.slice(h * headDim, (h + 1) * headDim));
      const K = input.map((emb) => emb.slice(h * headDim, (h + 1) * headDim));
      const V = input.map((emb) => emb.slice(h * headDim, (h + 1) * headDim));
      const scores = [];
      for (let i = 0; i < seqLen; i++) {
        const scoreRow = [];
        const Qi = Q[i];
        if (!Qi) continue;
        for (let j = 0; j < seqLen; j++) {
          let score = 0;
          const Kj = K[j];
          if (!Kj) continue;
          for (let k = 0; k < headDim; k++) {
            score += (Qi[k] ?? 0) * (Kj[k] ?? 0);
          }
          scoreRow[j] = score / Math.sqrt(headDim) / this.config.temperature;
        }
        const maxScore = Math.max(...scoreRow);
        const expScores = scoreRow.map((s) => Math.exp(s - maxScore));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        scores[i] = expScores.map((e) => e / sumExp);
      }
      for (let i = 0; i < seqLen; i++) {
        const attended = new Array(headDim).fill(0);
        const scoresI = scores[i];
        if (!scoresI) continue;
        for (let j = 0; j < seqLen; j++) {
          const Vj = V[j];
          if (!Vj) continue;
          for (let k = 0; k < headDim; k++) {
            attended[k] += (scoresI[j] ?? 0) * (Vj[k] ?? 0);
          }
        }
        if (!headOutputs[i]) headOutputs[i] = [];
        headOutputs[i].push(...attended);
      }
    }
    return headOutputs;
  }
  feedForward(input, layer) {
    const ff = this.weights.transformer.feedforward[layer];
    if (!ff) {
      return input;
    }
    return input.map((emb) => {
      let hidden = this.matVec([ff.linear1.map((row) => row[0] ?? 0)], emb);
      hidden = hidden.map((v, i) => Math.max(0, v + (ff.bias1[i] ?? 0)));
      let output = this.matVec([ff.linear2.map((row) => row[0] ?? 0)], hidden);
      output = output.map((v, i) => v + (ff.bias2[i] ?? 0));
      return output;
    });
  }
  addAndNorm(residual, output, layerNormIdx) {
    const ln = this.weights.transformer.layerNorm[layerNormIdx];
    if (!ln) {
      return residual;
    }
    return residual.map((res, i) => {
      const added = res.map((r, j) => r + (output[i]?.[j] ?? 0));
      const mean = added.reduce((a, b) => a + b, 0) / added.length;
      const variance = added.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / added.length;
      const std = Math.sqrt(variance + 1e-5);
      return added.map(
        (v, j) => (v - mean) / std * (ln.gamma[j] ?? 1) + (ln.beta[j] ?? 0)
      );
    });
  }
  transformerPredict(_history, contextEncoding) {
    if (contextEncoding.length === 0) {
      return new Array(this.config.stateDim).fill(0);
    }
    const lastEncoding = contextEncoding[contextEncoding.length - 1];
    if (!lastEncoding) {
      return new Array(this.config.stateDim).fill(0);
    }
    return this.matVec(this.weights.outputProjection, lastEncoding);
  }
  computeBlendRatio(contextEncoding, _kalmanState, _observation) {
    if (!this.weights.blendPredictor) {
      return this.config.blendRatio;
    }
    const lastContext = contextEncoding[contextEncoding.length - 1] ?? new Array(this.config.embedDim).fill(0);
    const logit = lastContext.reduce(
      (sum, v, i) => sum + v * (this.weights.blendPredictor.weights[i] ?? 0),
      0
    ) + this.weights.blendPredictor.bias;
    return this.sigmoid(logit);
  }
  blendPredictions(kalman, transformer, ratio) {
    return kalman.map(
      (k, i) => (1 - ratio) * k + ratio * (transformer[i] || k)
    );
  }
  computeConfidence(kalmanState, transformerPred, _observation) {
    const agreement = kalmanState.stateEstimate.reduce((sum, k, i) => {
      const t = transformerPred[i] || k;
      return sum + Math.exp(-Math.pow(k - t, 2));
    }, 0) / kalmanState.stateEstimate.length;
    const innovationMag = Math.sqrt(
      kalmanState.innovation.reduce((sum, v) => sum + v * v, 0)
    );
    const innovationConfidence = Math.exp(-innovationMag);
    return (agreement + innovationConfidence) / 2;
  }
  computeAttentionWeights(embeddings) {
    const seqLen = embeddings.length;
    const { embedDim } = this.config;
    const weights = [];
    for (let i = 0; i < seqLen; i++) {
      const weightRow = [];
      const embI = embeddings[i];
      if (!embI) continue;
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        const embJ = embeddings[j];
        if (!embJ) continue;
        for (let k = 0; k < embedDim; k++) {
          score += (embI[k] ?? 0) * (embJ[k] ?? 0);
        }
        weightRow[j] = score / Math.sqrt(embedDim);
      }
      const maxScore = Math.max(...weightRow);
      const expScores = weightRow.map((s) => Math.exp(s - maxScore));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      weights[i] = expScores.map((e) => e / sumExp);
    }
    return weights;
  }
  findMostInfluentialDimension(observation) {
    if (observation.length === 0) return "unknown";
    let maxIdx = 0;
    let maxVal = Math.abs(observation[0] ?? 0);
    for (let i = 1; i < observation.length; i++) {
      const absVal = Math.abs(observation[i] ?? 0);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxIdx = i;
      }
    }
    return STATE_DIMENSIONS[maxIdx] ?? `dim_${maxIdx}`;
  }
  detectPatternMatching(attentionWeights) {
    if (attentionWeights.length < 3) return false;
    const lastRow = attentionWeights[attentionWeights.length - 1];
    if (!lastRow || lastRow.length < 2) return false;
    const adjacentWeight = (lastRow[lastRow.length - 2] ?? 0) + (lastRow[lastRow.length - 1] ?? 0);
    const totalWeight = lastRow.reduce((a, b) => a + b, 0);
    return totalWeight > 0 && adjacentWeight / totalWeight < 0.5;
  }
  // Matrix operations
  initIdentityMatrix(n) {
    return Array(n).fill(null).map(
      (_, i) => Array(n).fill(0).map((_2, j) => i === j ? 1 : 0)
    );
  }
  initDiagonalMatrix(n, value) {
    return Array(n).fill(null).map(
      (_, i) => Array(n).fill(0).map((_2, j) => i === j ? value : 0)
    );
  }
  initRandomMatrix(rows, cols) {
    const scale = Math.sqrt(2 / (rows + cols));
    return Array(rows).fill(null).map(
      () => Array(cols).fill(0).map(() => (Math.random() - 0.5) * 2 * scale)
    );
  }
  initPositionalEmbedding(maxLen, embedDim) {
    const pe = [];
    for (let pos = 0; pos < maxLen; pos++) {
      const row = [];
      for (let i = 0; i < embedDim; i++) {
        const angle = pos / Math.pow(1e4, 2 * Math.floor(i / 2) / embedDim);
        row[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      }
      pe[pos] = row;
    }
    return pe;
  }
  initTransformerWeights(numLayers, numHeads, embedDim, headDim) {
    return Array(numLayers).fill(null).map(
      () => Array(numHeads).fill(null).map(() => {
        const matrix = this.initRandomMatrix(embedDim, headDim);
        return matrix[0] ?? new Array(headDim).fill(0);
      })
    );
  }
  matVec(A, v) {
    return A.map((row) => row.reduce((sum, val, j) => sum + val * (v[j] || 0), 0));
  }
  matMul(A, B) {
    const rowsA = A.length;
    const colsB = B[0]?.length || 0;
    const colsA = A[0]?.length || 0;
    return Array(rowsA).fill(null).map(
      (_, i) => Array(colsB).fill(0).map(
        (_2, j) => Array(colsA).fill(0).reduce(
          (sum, _3, k) => sum + (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0),
          0
        )
      )
    );
  }
  transpose(A) {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    return Array(cols).fill(null).map(
      (_, i) => Array(rows).fill(0).map((_2, j) => A[j]?.[i] || 0)
    );
  }
  matAdd(A, B) {
    return A.map((row, i) => row.map((val, j) => val + (B[i]?.[j] || 0)));
  }
  matSub(A, B) {
    return A.map((row, i) => row.map((val, j) => val - (B[i]?.[j] || 0)));
  }
  matInverse(A) {
    const n = A.length;
    const identity = this.initIdentityMatrix(n);
    const augmented = A.map((row, i) => [...row, ...identity[i] ?? Array(n).fill(0)]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      const rowI = augmented[i];
      if (!rowI) continue;
      for (let k = i + 1; k < n; k++) {
        const rowK = augmented[k];
        const rowMax2 = augmented[maxRow];
        if (!rowK || !rowMax2) continue;
        if (Math.abs(rowK[i] ?? 0) > Math.abs(rowMax2[i] ?? 0)) {
          maxRow = k;
        }
      }
      const rowMax = augmented[maxRow];
      if (rowMax) {
        augmented[i] = rowMax;
        augmented[maxRow] = rowI;
      }
      const currentRow = augmented[i];
      if (!currentRow) continue;
      const pivotVal = currentRow[i] ?? 0;
      if (Math.abs(pivotVal) < 1e-10) {
        return this.initDiagonalMatrix(n, 1);
      }
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const rowK = augmented[k];
          if (!rowK) continue;
          const factor = (rowK[i] ?? 0) / pivotVal;
          for (let j = 0; j < 2 * n; j++) {
            rowK[j] = (rowK[j] ?? 0) - factor * (currentRow[j] ?? 0);
          }
        }
      }
      const pivot = currentRow[i] ?? 1;
      for (let j = 0; j < 2 * n; j++) {
        currentRow[j] = (currentRow[j] ?? 0) / pivot;
      }
    }
    return augmented.map((row) => row.slice(n));
  }
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
};
function createKalmanFormerEngine(config) {
  const engine = new KalmanFormerEngine(config);
  engine.initialize(config);
  return engine;
}

// src/temporal/engines/PLRNNEngine.ts
var STATE_DIMENSIONS2 = ["valence", "arousal", "dominance", "risk", "resources"];
var PLRNNEngine = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "weights", null);
    __publicField(this, "initialized", false);
    // Training state
    __publicField(this, "trainingHistory", []);
    __publicField(this, "adamState", null);
    // KalmanFormer integration for hybrid predictions
    // Per roadmap: Kalman for short-term, PLRNN for long-term
    __publicField(this, "kalmanFormer", null);
    __publicField(this, "kalmanFormerState", null);
    this.config = { ...DEFAULT_PLRNN_CONFIG, ...config };
  }
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  initialize(config) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    const n = this.config.latentDim;
    const A = Array(n).fill(0).map(() => 0.85 + Math.random() * 0.1);
    const W = this.initializeMatrix(n, n, "sparse_stable");
    const B = this.initializeMatrix(n, n, "near_identity");
    const biasLatent = Array(n).fill(0).map(() => 0);
    const biasObserved = Array(n).fill(0).map(() => 0);
    let dendriticWeights;
    let C;
    if (this.config.connectivity === "dendritic" && this.config.dendriticBases) {
      const d = this.config.dendriticBases;
      dendriticWeights = this.initializeMatrix(n, d, "normal");
      C = this.initializeMatrix(n, d, "normal");
    }
    this.weights = {
      A,
      W,
      B,
      C,
      biasLatent,
      biasObserved,
      dendriticWeights,
      meta: {
        trainedAt: /* @__PURE__ */ new Date(),
        trainingSamples: 0,
        validationLoss: Infinity,
        config: this.config
      }
    };
    this.adamState = {
      m: {},
      v: {},
      t: 0
    };
    const kalmanConfig = {
      stateDim: n,
      obsDim: n,
      embedDim: Math.max(32, n * 8),
      // Scale with state dimension
      numHeads: 4,
      numLayers: 2,
      contextWindow: 24,
      blendRatio: 0.3,
      // Favor Kalman for stability in short-term
      learnedGain: true
    };
    this.kalmanFormer = new KalmanFormerEngine(kalmanConfig);
    this.kalmanFormer.initialize(kalmanConfig);
    this.initialized = true;
  }
  loadWeights(weights) {
    this.weights = JSON.parse(JSON.stringify(weights));
    if (weights.meta?.config) {
      this.config = weights.meta.config;
    }
    this.initialized = true;
  }
  getWeights() {
    if (!this.weights) {
      throw new Error("PLRNN not initialized. Call initialize() first.");
    }
    return JSON.parse(JSON.stringify(this.weights));
  }
  // ============================================================================
  // FORWARD PASS
  // ============================================================================
  /**
   * Forward pass: compute next state
   *
   * z_{t+1} = A * z_t + W * φ(z_t) + C * s_t + b_z
   * x_t = B * z_t + b_x
   *
   * where φ(z) = max(z, 0) (ReLU for piecewise-linear dynamics)
   */
  forward(state, input) {
    if (!this.weights || !this.initialized) {
      throw new Error("PLRNN not initialized");
    }
    const { A, W, B, C, biasLatent, biasObserved, dendriticWeights } = this.weights;
    const z = state.latentState;
    const n = z.length;
    const phiZ = z.map((v) => Math.max(0, v));
    const Az = z.map((zi, i) => (A[i] ?? 0.9) * zi);
    const WphiZ = this.matVec(W, phiZ);
    let dendriticTerm = Array(n).fill(0);
    if (this.config.connectivity === "dendritic" && dendriticWeights && C) {
      const bases = dendriticWeights.map(
        (row) => row.reduce((sum, w, i) => sum + w * (z[i % z.length] ?? 0), 0)
      );
      const activatedBases = bases.map((b) => Math.max(0, b));
      dendriticTerm = C.map(
        (row) => row.reduce((sum, c, i) => sum + c * (activatedBases[i] ?? 0), 0)
      );
    }
    let inputTerm = Array(n).fill(0);
    if (input && C) {
      inputTerm = C.map(
        (row) => row.reduce((sum, c, i) => sum + c * (input[i] || 0), 0)
      );
    }
    const stateClamp = 10;
    const zNext = Az.map((azi, i) => {
      const val = azi + (WphiZ[i] ?? 0) + (dendriticTerm[i] ?? 0) + (inputTerm[i] ?? 0) + (biasLatent[i] ?? 0);
      return Math.max(-stateClamp, Math.min(stateClamp, Number.isFinite(val) ? val : 0));
    });
    const xNext = this.matVec(B, zNext).map((v, i) => {
      const val = v + (biasObserved[i] ?? 0);
      return Math.max(-stateClamp, Math.min(stateClamp, Number.isFinite(val) ? val : 0));
    });
    const uncertainty = this.computeUncertainty(zNext, state.uncertainty);
    const hiddenActivations = phiZ;
    return {
      latentState: zNext,
      hiddenActivations,
      observedState: xNext,
      uncertainty,
      timestamp: new Date(state.timestamp.getTime() + this.config.dt * 36e5),
      timestep: state.timestep + 1
    };
  }
  // ============================================================================
  // PREDICTION
  // ============================================================================
  predict(currentState, horizon, input) {
    const trajectory = [currentState];
    let state = currentState;
    for (let t = 0; t < horizon; t++) {
      const inputT = input ? input[t] : void 0;
      state = this.forward(state, inputT);
      trajectory.push(state);
    }
    const finalState = trajectory[trajectory.length - 1];
    const meanPrediction = finalState.observedState;
    const uncertaintyScale = 1.96;
    const lower = meanPrediction.map(
      (m, i) => m - uncertaintyScale * Math.sqrt(finalState.uncertainty[i] ?? 0.1)
    );
    const upper = meanPrediction.map(
      (m, i) => m + uncertaintyScale * Math.sqrt(finalState.uncertainty[i] ?? 0.1)
    );
    const variance = trajectory.map((s) => s.uncertainty);
    const earlyWarningSignals = this.detectEarlyWarnings(trajectory, Math.min(5, trajectory.length));
    return {
      trajectory,
      meanPrediction,
      confidenceInterval: {
        lower,
        upper,
        level: 0.95
      },
      variance,
      earlyWarningSignals,
      horizon
    };
  }
  hybridPredict(currentState, horizon) {
    const horizonMap = {
      short: 3,
      // 3 steps - KalmanFormer optimal
      medium: 12,
      // 12 steps - blended approach
      long: 48
      // 48 steps - full PLRNN nonlinear
    };
    const steps = horizonMap[horizon];
    if (horizon === "short" && this.kalmanFormer) {
      if (!this.kalmanFormerState) {
        this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(currentState);
      }
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        currentState.observedState,
        currentState.timestamp
      );
      const kalmanPrediction = this.kalmanFormer.predict(this.kalmanFormerState, steps);
      const trajectory = kalmanPrediction.trajectory?.map(
        (s) => this.kalmanFormer.toPLRNNState(s)
      ) ?? [currentState];
      const variance = trajectory.map(
        () => kalmanPrediction.covariance.map((row, i) => row[i] ?? 0.1)
      );
      return {
        trajectory,
        meanPrediction: kalmanPrediction.blendedPrediction,
        confidenceInterval: kalmanPrediction.confidenceInterval,
        variance,
        earlyWarningSignals: this.detectEarlyWarnings(trajectory, Math.min(3, trajectory.length)),
        horizon: steps
      };
    } else if (horizon === "medium" && this.kalmanFormer) {
      const plrnnPrediction = this.predict(currentState, steps);
      if (!this.kalmanFormerState) {
        this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(currentState);
      }
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        currentState.observedState,
        currentState.timestamp
      );
      const kalmanPrediction = this.kalmanFormer.predict(this.kalmanFormerState, steps);
      const blendedMean = plrnnPrediction.meanPrediction.map((plrnnVal, i) => {
        const kalmanVal = kalmanPrediction.blendedPrediction[i] ?? plrnnVal;
        const kalmanWeight = 0.5;
        return kalmanWeight * kalmanVal + (1 - kalmanWeight) * plrnnVal;
      });
      const lower = plrnnPrediction.confidenceInterval.lower.map((plrnnLower, i) => {
        const kalmanLower = kalmanPrediction.confidenceInterval.lower[i] ?? plrnnLower;
        return Math.min(plrnnLower, kalmanLower);
      });
      const upper = plrnnPrediction.confidenceInterval.upper.map((plrnnUpper, i) => {
        const kalmanUpper = kalmanPrediction.confidenceInterval.upper[i] ?? plrnnUpper;
        return Math.max(plrnnUpper, kalmanUpper);
      });
      return {
        trajectory: plrnnPrediction.trajectory,
        meanPrediction: blendedMean,
        confidenceInterval: { lower, upper, level: 0.95 },
        variance: plrnnPrediction.variance,
        earlyWarningSignals: plrnnPrediction.earlyWarningSignals,
        horizon: steps
      };
    } else {
      return this.predict(currentState, steps);
    }
  }
  /**
   * Update KalmanFormer state with new observation
   * Call this after each observation to maintain state synchronization
   */
  updateKalmanFormerState(observation, timestamp) {
    if (!this.kalmanFormer) return;
    if (!this.kalmanFormerState) {
      const initialState = {
        latentState: [...observation],
        hiddenActivations: observation.map((v) => Math.max(0, v)),
        observedState: [...observation],
        uncertainty: Array(observation.length).fill(0.1),
        timestamp,
        timestep: 0
      };
      this.kalmanFormerState = this.kalmanFormer.fromPLRNNState(initialState);
    } else {
      this.kalmanFormerState = this.kalmanFormer.update(
        this.kalmanFormerState,
        observation,
        timestamp
      );
    }
  }
  /**
   * Get the current KalmanFormer state (for debugging/analysis)
   */
  getKalmanFormerState() {
    return this.kalmanFormerState;
  }
  // ============================================================================
  // CAUSAL NETWORK EXTRACTION
  // ============================================================================
  extractCausalNetwork() {
    if (!this.weights) {
      throw new Error("PLRNN not initialized");
    }
    const { A, W } = this.weights;
    const n = this.config.latentDim;
    const nodes = STATE_DIMENSIONS2.slice(0, n).map((label, i) => ({
      id: `node_${i}`,
      label,
      selfWeight: A[i] ?? 0.9,
      centrality: this.calculateCentrality(W, i),
      value: 0
      // Will be updated with actual state
    }));
    const edges = [];
    const significanceThreshold = 0.1;
    for (let i = 0; i < n; i++) {
      const row = W[i];
      if (!row) continue;
      for (let j = 0; j < n; j++) {
        const weight = row[j] ?? 0;
        if (i !== j && Math.abs(weight) > significanceThreshold) {
          edges.push({
            source: `node_${j}`,
            target: `node_${i}`,
            weight,
            lag: this.config.dt,
            significance: this.computeEdgeSignificance(weight, n)
          });
        }
      }
    }
    const density = edges.length / (n * (n - 1));
    const centralNode = nodes.reduce(
      (max, node) => node.centrality > max.centrality ? node : max
    ).label;
    const feedbackLoops = this.detectFeedbackLoops(W, n);
    return {
      nodes,
      edges,
      metrics: {
        density,
        centralNode,
        feedbackLoops
      }
    };
  }
  // ============================================================================
  // INTERVENTION SIMULATION
  // ============================================================================
  simulateIntervention(currentState, target, intervention, magnitude) {
    if (!this.weights) {
      throw new Error("PLRNN not initialized");
    }
    const targetIdx = STATE_DIMENSIONS2.indexOf(target);
    if (targetIdx === -1) {
      throw new Error(`Unknown target dimension: ${target}`);
    }
    const input = Array(this.config.latentDim).fill(0);
    switch (intervention) {
      case "increase":
        input[targetIdx] = magnitude;
        break;
      case "decrease":
        input[targetIdx] = -magnitude;
        break;
      case "stabilize":
        input[targetIdx] = -(currentState.latentState[targetIdx] ?? 0) * 0.5;
        break;
    }
    const horizon = 24;
    const baselineTrajectory = this.predict(currentState, horizon);
    const interventionTrajectory = this.predict(currentState, horizon, Array(horizon).fill(input));
    const effects = /* @__PURE__ */ new Map();
    const n = this.config.latentDim;
    for (let i = 0; i < n; i++) {
      const baseline = baselineTrajectory.meanPrediction[i] ?? 0;
      const intervened = interventionTrajectory.meanPrediction[i] ?? 0;
      const effect = intervened - baseline;
      const dimLabel = STATE_DIMENSIONS2[i] ?? `dim_${i}`;
      effects.set(dimLabel, effect);
    }
    let maxEffect = 0;
    let timeToPeak = 0;
    for (let t = 0; t < horizon; t++) {
      const intState = interventionTrajectory.trajectory[t];
      const baseState = baselineTrajectory.trajectory[t];
      if (!intState || !baseState) continue;
      const effect = Math.abs(
        (intState.observedState[targetIdx] ?? 0) - (baseState.observedState[targetIdx] ?? 0)
      );
      if (effect > maxEffect) {
        maxEffect = effect;
        timeToPeak = t * this.config.dt;
      }
    }
    const sideEffects = [];
    effects.forEach((effect, dimension) => {
      if (dimension !== target && Math.abs(effect) > 0.1) {
        sideEffects.push({ dimension, effect });
      }
    });
    let duration = horizon;
    for (let t = Math.floor(timeToPeak / this.config.dt); t < horizon; t++) {
      const intState = interventionTrajectory.trajectory[t];
      const baseState = baselineTrajectory.trajectory[t];
      if (!intState || !baseState) continue;
      const effect = Math.abs(
        (intState.observedState[targetIdx] ?? 0) - (baseState.observedState[targetIdx] ?? 0)
      );
      if (effect < maxEffect * 0.1) {
        duration = t * this.config.dt;
        break;
      }
    }
    const finalVariance = interventionTrajectory.variance[horizon - 1];
    const confidence = 1 - (finalVariance?.[targetIdx] ?? 0.5);
    return {
      target: { dimension: target, intervention, magnitude },
      response: {
        effects,
        timeToPeak,
        duration,
        sideEffects
      },
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }
  // ============================================================================
  // EARLY WARNING SIGNALS
  // ============================================================================
  detectEarlyWarnings(stateHistory, windowSize) {
    if (stateHistory.length < windowSize * 2) {
      return [];
    }
    const signals = [];
    const n = this.config.latentDim;
    const earlyWindow = stateHistory.slice(0, windowSize);
    const lateWindow = stateHistory.slice(-windowSize);
    for (let dim = 0; dim < n; dim++) {
      const dimLabel = STATE_DIMENSIONS2[dim] ?? `dim_${dim}`;
      const earlyAC = this.calculateAutocorrelation(
        earlyWindow.map((s) => s.latentState[dim] ?? 0)
      );
      const lateAC = this.calculateAutocorrelation(
        lateWindow.map((s) => s.latentState[dim] ?? 0)
      );
      if (lateAC > earlyAC + 0.1 && lateAC > 0.5) {
        signals.push({
          type: "autocorrelation",
          dimension: dimLabel,
          strength: (lateAC - earlyAC) / (1 - earlyAC),
          estimatedTimeToTransition: this.estimateTransitionTime(lateAC),
          confidence: Math.min(1, stateHistory.length / 50),
          recommendation: `\u041F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u0430\u044F \u0430\u0432\u0442\u043E\u043A\u043E\u0440\u0440\u0435\u043B\u044F\u0446\u0438\u044F \u0432 ${dimLabel} \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043D\u0430 \u043F\u0440\u0438\u0431\u043B\u0438\u0436\u0435\u043D\u0438\u0435 \u043A \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044E. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0438\u043D\u0442\u0435\u0440\u0432\u0435\u043D\u0446\u0438\u044F.`
        });
      }
      const earlyVar = this.calculateVariance(
        earlyWindow.map((s) => s.latentState[dim] ?? 0)
      );
      const lateVar = this.calculateVariance(
        lateWindow.map((s) => s.latentState[dim] ?? 0)
      );
      if (lateVar > earlyVar * 1.5) {
        signals.push({
          type: "variance",
          dimension: dimLabel,
          strength: (lateVar - earlyVar) / earlyVar,
          estimatedTimeToTransition: null,
          confidence: Math.min(1, stateHistory.length / 50),
          recommendation: `\u0423\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u0432\u0430\u0440\u0438\u0430\u0431\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438 ${dimLabel}. \u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u043C\u0435\u043D\u0435\u0435 \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u044B\u043C.`
        });
      }
      const flickering = this.detectFlickering(
        lateWindow.map((s) => s.latentState[dim] ?? 0)
      );
      if (flickering > 0.3) {
        signals.push({
          type: "flickering",
          dimension: dimLabel,
          strength: flickering,
          estimatedTimeToTransition: 12,
          // hours
          confidence: 0.6,
          recommendation: `\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E "\u043C\u0435\u0440\u0446\u0430\u043D\u0438\u0435" \u0432 ${dimLabel} - \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0441\u043A\u043E\u0440\u043E\u0433\u043E \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430 \u043C\u0435\u0436\u0434\u0443 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F\u043C\u0438.`
        });
      }
    }
    if (this.weights) {
      const connectivity = this.calculateNetworkConnectivity(stateHistory);
      if (connectivity.late > connectivity.early * 1.3) {
        signals.push({
          type: "connectivity",
          dimension: "network",
          strength: (connectivity.late - connectivity.early) / connectivity.early,
          estimatedTimeToTransition: null,
          confidence: 0.7,
          recommendation: "\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0441\u0432\u044F\u0437\u0435\u0439 \u043C\u0435\u0436\u0434\u0443 \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u043C\u0438 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F\u043C\u0438. \u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0431\u043E\u043B\u0435\u0435 \u0443\u044F\u0437\u0432\u0438\u043C\u043E\u0439 \u043A \u043A\u0430\u0441\u043A\u0430\u0434\u043D\u044B\u043C \u044D\u0444\u0444\u0435\u043A\u0442\u0430\u043C."
        });
      }
    }
    return signals;
  }
  // ============================================================================
  // TRAINING
  // ============================================================================
  trainOnline(sample) {
    if (!this.weights || !this.adamState) {
      this.initialize();
    }
    const startTime = Date.now();
    const { observations, timestamps: _timestamps } = sample;
    if (observations.length < 2) {
      return {
        loss: Infinity,
        validationLoss: Infinity,
        epochs: 0,
        trainingTime: 0,
        converged: false,
        weights: this.weights
      };
    }
    let totalLoss = 0;
    const firstObs = observations[0];
    if (!firstObs) {
      return {
        loss: Infinity,
        validationLoss: Infinity,
        epochs: 0,
        trainingTime: 0,
        converged: false,
        weights: this.weights
      };
    }
    let state = this.initializeState(firstObs);
    for (let t = 0; t < observations.length - 1; t++) {
      const predicted = this.forward(state);
      const target = observations[t + 1];
      if (!target) continue;
      const loss = this.calculateLoss([predicted.observedState], [target]);
      totalLoss += loss;
      this.updateWeightsOnline(state, predicted, target);
      if (Math.random() < this.config.teacherForcingRatio) {
        state = this.initializeState(target);
        state.timestep = predicted.timestep;
      } else {
        state = predicted;
      }
    }
    const avgLoss = totalLoss / (observations.length - 1);
    this.trainingHistory.push(avgLoss);
    this.weights.meta.trainingSamples++;
    this.weights.meta.trainedAt = /* @__PURE__ */ new Date();
    return {
      loss: avgLoss,
      validationLoss: avgLoss,
      epochs: 1,
      trainingTime: Date.now() - startTime,
      converged: avgLoss < 0.1,
      weights: this.weights
    };
  }
  trainBatch(samples) {
    const startTime = Date.now();
    let totalLoss = 0;
    for (const sample of samples) {
      const result = this.trainOnline(sample);
      totalLoss += result.loss;
    }
    const avgLoss = totalLoss / samples.length;
    const converged = avgLoss < 0.05;
    if (converged) {
      this.weights.meta.validationLoss = avgLoss;
    }
    return {
      loss: avgLoss,
      validationLoss: avgLoss,
      epochs: samples.length,
      trainingTime: Date.now() - startTime,
      converged,
      weights: this.weights
    };
  }
  calculateLoss(predicted, actual) {
    let loss = 0;
    let count = 0;
    for (let t = 0; t < predicted.length; t++) {
      const predRow = predicted[t];
      const actualRow = actual[t];
      if (!predRow || !actualRow) continue;
      for (let i = 0; i < predRow.length; i++) {
        const diff = (predRow[i] ?? 0) - (actualRow[i] ?? 0);
        loss += diff * diff;
        count++;
      }
    }
    return count > 0 ? loss / count : 0;
  }
  getComplexityMetrics() {
    if (!this.weights) {
      return { effectiveDimensionality: 0, sparsity: 0, lyapunovExponent: 0 };
    }
    const { W } = this.weights;
    const n = W.length;
    let zeroCount = 0;
    let totalCount = 0;
    for (let i = 0; i < n; i++) {
      const row = W[i];
      if (!row) continue;
      for (let j = 0; j < n; j++) {
        if (Math.abs(row[j] ?? 0) < 0.01) zeroCount++;
        totalCount++;
      }
    }
    const sparsity = totalCount > 0 ? zeroCount / totalCount : 0;
    const effectiveDimensionality = n * (1 - sparsity);
    const maxEigenvalue = this.approximateMaxEigenvalue(W);
    const lyapunovExponent = Math.log(Math.abs(maxEigenvalue));
    return {
      effectiveDimensionality,
      sparsity,
      lyapunovExponent
    };
  }
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  initializeMatrix(rows, cols, type) {
    const matrix = [];
    const scale = Math.sqrt(2 / (rows + cols));
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        if (type === "identity") {
          row[j] = i === j ? 1 : 0;
        } else if (type === "near_identity") {
          row[j] = i === j ? 1 + (Math.random() - 0.5) * 0.1 : (Math.random() - 0.5) * 0.02;
        } else if (type === "sparse") {
          row[j] = Math.random() < 0.2 ? (Math.random() - 0.5) * 2 * scale : 0;
        } else if (type === "sparse_stable") {
          const smallScale = scale * 0.3;
          row[j] = Math.random() < 0.3 ? (Math.random() - 0.5) * 2 * smallScale : 0;
        } else {
          row[j] = (Math.random() - 0.5) * 2 * scale;
        }
      }
      matrix[i] = row;
    }
    return matrix;
  }
  matVec(A, v) {
    return A.map((row) => row.reduce((sum, val, j) => sum + val * (v[j] ?? 0), 0));
  }
  initializeState(observation) {
    const n = this.config.latentDim;
    const obs = observation.slice(0, n);
    while (obs.length < n) {
      obs.push(0);
    }
    return {
      latentState: [...obs],
      hiddenActivations: obs.map((v) => Math.max(0, v)),
      observedState: [...obs],
      uncertainty: Array(n).fill(0.1),
      timestamp: /* @__PURE__ */ new Date(),
      timestep: 0
    };
  }
  computeUncertainty(zNext, prevUncertainty) {
    const growthRate = 0.05;
    const maxUncertainty = 1;
    return prevUncertainty.map((u, i) => {
      const stateDeviation = Math.abs(zNext[i] ?? 0) > 2 ? 0.1 : 0;
      const newU = u * (1 + growthRate) + stateDeviation;
      return Math.min(maxUncertainty, newU);
    });
  }
  calculateCentrality(W, nodeIdx) {
    const nodeRow = W[nodeIdx];
    const outStrength = nodeRow ? nodeRow.reduce((sum, w) => sum + Math.abs(w), 0) : 0;
    let inStrength = 0;
    for (let i = 0; i < W.length; i++) {
      const row = W[i];
      if (row) {
        inStrength += Math.abs(row[nodeIdx] ?? 0);
      }
    }
    return (outStrength + inStrength) / (2 * W.length);
  }
  computeEdgeSignificance(weight, n) {
    const expectedWeight = 1 / n;
    return Math.min(1, Math.abs(weight) / expectedWeight);
  }
  detectFeedbackLoops(W, n) {
    const loops = [];
    const threshold = 0.1;
    for (let i = 0; i < n; i++) {
      const rowI = W[i];
      const rowJ_check = W;
      if (!rowI) continue;
      for (let j = i + 1; j < n; j++) {
        const rowJ = rowJ_check[j];
        if (!rowJ) continue;
        const wij = rowI[j] ?? 0;
        const wji = rowJ[i] ?? 0;
        if (Math.abs(wij) > threshold && Math.abs(wji) > threshold) {
          const dimI = STATE_DIMENSIONS2[i] ?? `dim_${i}`;
          const dimJ = STATE_DIMENSIONS2[j] ?? `dim_${j}`;
          loops.push([dimI, dimJ]);
        }
      }
    }
    return loops;
  }
  calculateAutocorrelation(series) {
    if (series.length < 3) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    let numerator = 0;
    let denominator = 0;
    for (let t = 0; t < series.length - 1; t++) {
      const vt = series[t] ?? 0;
      const vt1 = series[t + 1] ?? 0;
      numerator += (vt - mean) * (vt1 - mean);
    }
    for (let t = 0; t < series.length; t++) {
      const vt = series[t] ?? 0;
      denominator += (vt - mean) ** 2;
    }
    return denominator > 0 ? numerator / denominator : 0;
  }
  calculateVariance(series) {
    if (series.length < 2) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (series.length - 1);
    return variance;
  }
  detectFlickering(series) {
    if (series.length < 5) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    let crossings = 0;
    for (let t = 1; t < series.length; t++) {
      const prev = series[t - 1] ?? 0;
      const curr = series[t] ?? 0;
      if (prev < mean && curr >= mean || prev >= mean && curr < mean) {
        crossings++;
      }
    }
    const expectedCrossings = (series.length - 1) / 2;
    const flickering = crossings / expectedCrossings;
    return Math.max(0, flickering - 1);
  }
  estimateTransitionTime(autocorrelation) {
    if (autocorrelation < 0.7) return null;
    const timeScale = 1 / (1 - autocorrelation);
    return Math.min(48, timeScale * this.config.dt);
  }
  calculateNetworkConnectivity(stateHistory) {
    const midpoint = Math.floor(stateHistory.length / 2);
    const calculateCorrelationMatrix = (states) => {
      const n = this.config.latentDim;
      let totalCorr = 0;
      let count = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const seriesI = states.map((s) => s.latentState[i] ?? 0);
          const seriesJ = states.map((s) => s.latentState[j] ?? 0);
          const corr = this.calculateCorrelation(seriesI, seriesJ);
          totalCorr += Math.abs(corr);
          count++;
        }
      }
      return count > 0 ? totalCorr / count : 0;
    };
    return {
      early: calculateCorrelationMatrix(stateHistory.slice(0, midpoint)),
      late: calculateCorrelationMatrix(stateHistory.slice(midpoint))
    };
  }
  calculateCorrelation(x, y) {
    const n = x.length;
    if (n < 3) return 0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    for (let i = 0; i < n; i++) {
      const dx = (x[i] ?? 0) - meanX;
      const dy = (y[i] ?? 0) - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    const denom = Math.sqrt(denomX * denomY);
    return denom > 0 ? numerator / denom : 0;
  }
  updateWeightsOnline(prevState, predicted, target) {
    if (!this.weights || !this.adamState) return;
    const { A, W, B, biasLatent, biasObserved } = this.weights;
    const lr = this.config.learningRate;
    const clip = this.config.gradientClip;
    const l1 = this.config.l1Regularization;
    const outputError = predicted.observedState.map((p, i) => (target[i] ?? 0) - p);
    const latentError = this.matVec(
      B.map((row) => [...row]),
      // Transpose approximation for square matrix
      outputError
    );
    for (let i = 0; i < B.length; i++) {
      const rowB = B[i];
      if (!rowB) continue;
      const errI = outputError[i] ?? 0;
      for (let j = 0; j < rowB.length; j++) {
        let grad = -errI * (predicted.latentState[j] ?? 0);
        grad = Math.max(-clip, Math.min(clip, grad));
        const currentB = rowB[j] ?? 0;
        rowB[j] = currentB - lr * grad;
      }
      const currentBiasObs = biasObserved[i];
      if (currentBiasObs !== void 0) {
        biasObserved[i] = currentBiasObs - lr * Math.max(-clip, Math.min(clip, -errI));
      }
    }
    for (let i = 0; i < A.length; i++) {
      const latErr = latentError[i] ?? 0;
      const prevLatent = prevState.latentState[i] ?? 0;
      let grad = -latErr * prevLatent;
      grad = Math.max(-clip, Math.min(clip, grad));
      const currentA = A[i];
      if (currentA !== void 0) {
        A[i] = currentA - lr * grad;
      }
    }
    const phiZ = prevState.latentState.map((v) => Math.max(0, v));
    for (let i = 0; i < W.length; i++) {
      const rowW = W[i];
      if (!rowW) continue;
      const latErr = latentError[i] ?? 0;
      for (let j = 0; j < rowW.length; j++) {
        const phi = phiZ[j] ?? 0;
        const wij = rowW[j] ?? 0;
        let grad = -latErr * phi;
        grad += l1 * Math.sign(wij);
        grad = Math.max(-clip, Math.min(clip, grad));
        rowW[j] = wij - lr * grad;
      }
      const currentBiasLat = biasLatent[i];
      if (currentBiasLat !== void 0) {
        biasLatent[i] = currentBiasLat - lr * Math.max(-clip, Math.min(clip, -latErr));
      }
    }
  }
  approximateMaxEigenvalue(W) {
    const n = W.length;
    let v = Array(n).fill(1 / Math.sqrt(n));
    for (let iter = 0; iter < 20; iter++) {
      const Av2 = this.matVec(W, v);
      const norm = Math.sqrt(Av2.reduce((sum, x) => sum + x * x, 0));
      if (norm < 1e-10) return 0;
      v = Av2.map((x) => x / norm);
    }
    const Av = this.matVec(W, v);
    return Av.reduce((sum, x, i) => sum + x * v[i], 0);
  }
  // ============================================================================
  // BPTT SUPPORT METHODS (for PLRNNTrainer)
  // ============================================================================
  /**
   * Get latent dimension
   */
  getLatentDim() {
    return this.config.latentDim;
  }
  /**
   * Get config
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Compute gradients for a single timestep (for BPTT)
   * Returns gradients for A, W, B, biasLatent, biasObserved
   */
  computeStepGradients(prevState, currentState, target, outputError) {
    if (!this.weights) {
      throw new Error("PLRNNEngine not initialized");
    }
    const { W, B } = this.weights;
    const n = this.config.latentDim;
    const obsError = outputError ?? currentState.observedState.map(
      (pred, i) => pred - (target[i] ?? 0)
    );
    const dB = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row[j] = (obsError[i] ?? 0) * (currentState.latentState[j] ?? 0);
      }
      dB[i] = row;
    }
    const dBiasObserved = [...obsError];
    const latentError = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const bRow = B[i];
        if (bRow) {
          sum += (bRow[j] ?? 0) * (obsError[i] ?? 0);
        }
      }
      latentError[j] = sum;
    }
    const phiZ = prevState.latentState.map((v) => Math.max(0, v));
    const phiDerivative = prevState.latentState.map((v) => v > 0 ? 1 : 0);
    const dA = [];
    for (let i = 0; i < n; i++) {
      dA[i] = (latentError[i] ?? 0) * (prevState.latentState[i] ?? 0);
    }
    const dW = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row[j] = (latentError[i] ?? 0) * (phiZ[j] ?? 0);
      }
      dW[i] = row;
    }
    const dBiasLatent = [...latentError];
    const wTransposeError = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const wRow = W[i];
        if (wRow) {
          sum += (wRow[j] ?? 0) * (latentError[i] ?? 0);
        }
      }
      wTransposeError[j] = sum * (phiDerivative[j] ?? 0);
    }
    const propagatedError = latentError.map((ae, i) => {
      const aVal = this.weights.A[i] ?? 0.9;
      return aVal * ae + (wTransposeError[i] ?? 0);
    });
    return {
      dA,
      dW,
      dB,
      dBiasLatent,
      dBiasObserved,
      latentError: propagatedError
    };
  }
  /**
   * Apply accumulated gradients using Adam optimizer
   */
  applyGradients(gradients, learningRate, l1Reg = 0.01, l2Reg = 1e-4, gradClip = 1) {
    if (!this.weights) {
      throw new Error("PLRNNEngine not initialized");
    }
    const { A, W, B, biasLatent, biasObserved } = this.weights;
    const n = this.config.latentDim;
    if (!this.adamState) {
      this.adamState = {
        m: {},
        v: {},
        t: 0
      };
    }
    this.adamState.t += 1;
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;
    const t = this.adamState.t;
    const biasCorrection1 = 1 - Math.pow(beta1, t);
    const biasCorrection2 = 1 - Math.pow(beta2, t);
    const clip = (g) => Math.max(-gradClip, Math.min(gradClip, g));
    if (!this.adamState.m["A"]) {
      this.adamState.m["A"] = [Array(n).fill(0)];
      this.adamState.v["A"] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = gradients.dA[i] ?? 0;
      grad += l2Reg * (A[i] ?? 0);
      grad = clip(grad);
      const mA = this.adamState.m["A"][0];
      const vA = this.adamState.v["A"][0];
      mA[i] = beta1 * (mA[i] ?? 0) + (1 - beta1) * grad;
      vA[i] = beta2 * (vA[i] ?? 0) + (1 - beta2) * grad * grad;
      const mHat = mA[i] / biasCorrection1;
      const vHat = vA[i] / biasCorrection2;
      A[i] = (A[i] ?? 0.9) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
    if (!this.adamState.m["W"]) {
      this.adamState.m["W"] = Array(n).fill(null).map(() => Array(n).fill(0));
      this.adamState.v["W"] = Array(n).fill(null).map(() => Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      const wRow = W[i];
      const dWRow = gradients.dW[i];
      if (!wRow || !dWRow) continue;
      for (let j = 0; j < n; j++) {
        let grad = dWRow[j] ?? 0;
        const wij = wRow[j] ?? 0;
        grad += l1Reg * Math.sign(wij);
        grad += l2Reg * wij;
        grad = clip(grad);
        const mW = this.adamState.m["W"];
        const vW = this.adamState.v["W"];
        mW[i][j] = beta1 * (mW[i][j] ?? 0) + (1 - beta1) * grad;
        vW[i][j] = beta2 * (vW[i][j] ?? 0) + (1 - beta2) * grad * grad;
        const mHat = mW[i][j] / biasCorrection1;
        const vHat = vW[i][j] / biasCorrection2;
        wRow[j] = wij - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
    if (!this.adamState.m["B"]) {
      this.adamState.m["B"] = Array(n).fill(null).map(() => Array(n).fill(0));
      this.adamState.v["B"] = Array(n).fill(null).map(() => Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      const bRow = B[i];
      const dBRow = gradients.dB[i];
      if (!bRow || !dBRow) continue;
      for (let j = 0; j < n; j++) {
        let grad = dBRow[j] ?? 0;
        grad += l2Reg * (bRow[j] ?? 0);
        grad = clip(grad);
        const mB = this.adamState.m["B"];
        const vB = this.adamState.v["B"];
        mB[i][j] = beta1 * (mB[i][j] ?? 0) + (1 - beta1) * grad;
        vB[i][j] = beta2 * (vB[i][j] ?? 0) + (1 - beta2) * grad * grad;
        const mHat = mB[i][j] / biasCorrection1;
        const vHat = vB[i][j] / biasCorrection2;
        bRow[j] = (bRow[j] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
    if (!this.adamState.m["biasLatent"]) {
      this.adamState.m["biasLatent"] = [Array(n).fill(0)];
      this.adamState.v["biasLatent"] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = clip(gradients.dBiasLatent[i] ?? 0);
      const mBL = this.adamState.m["biasLatent"][0];
      const vBL = this.adamState.v["biasLatent"][0];
      mBL[i] = beta1 * (mBL[i] ?? 0) + (1 - beta1) * grad;
      vBL[i] = beta2 * (vBL[i] ?? 0) + (1 - beta2) * grad * grad;
      const mHat = mBL[i] / biasCorrection1;
      const vHat = vBL[i] / biasCorrection2;
      biasLatent[i] = (biasLatent[i] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
    if (!this.adamState.m["biasObserved"]) {
      this.adamState.m["biasObserved"] = [Array(n).fill(0)];
      this.adamState.v["biasObserved"] = [Array(n).fill(0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = clip(gradients.dBiasObserved[i] ?? 0);
      const mBO = this.adamState.m["biasObserved"][0];
      const vBO = this.adamState.v["biasObserved"][0];
      mBO[i] = beta1 * (mBO[i] ?? 0) + (1 - beta1) * grad;
      vBO[i] = beta2 * (vBO[i] ?? 0) + (1 - beta2) * grad * grad;
      const mHat = mBO[i] / biasCorrection1;
      const vHat = vBO[i] / biasCorrection2;
      biasObserved[i] = (biasObserved[i] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
  }
  /**
   * Reset Adam optimizer state (for new training run)
   */
  resetAdamState() {
    this.adamState = null;
  }
  /**
   * Create a state from observation values
   */
  createState(observation, timestamp) {
    const state = this.initializeState(observation);
    if (timestamp) {
      state.timestamp = timestamp;
    }
    return state;
  }
};
function createPLRNNEngine(config) {
  const engine = new PLRNNEngine(config);
  engine.initialize(config);
  return engine;
}

// src/voice/interfaces/IVoiceAdapter.ts
var DEFAULT_VOICE_CONFIG = {
  sampleRate: 16e3,
  frameSizeMs: 25,
  hopSizeMs: 10,
  numMfcc: 13,
  minF0: 75,
  // Human voice range
  maxF0: 500,
  enableWhisper: true,
  fusionStrategy: "late",
  fusionWeights: [0.6, 0.4],
  // Text slightly more important
  realtime: false,
  realtimeBufferSize: 100,
  language: "ru"
};

// src/voice/VoiceInputAdapter.ts
var RISK_KEYWORDS = {
  suicidal: ["\u0441\u0443\u0438\u0446\u0438\u0434", "\u043F\u043E\u043A\u043E\u043D\u0447\u0438\u0442\u044C", "\u0443\u0431\u0438\u0442\u044C \u0441\u0435\u0431\u044F", "\u043D\u0435 \u0445\u043E\u0447\u0443 \u0436\u0438\u0442\u044C", "\u043A\u043E\u043D\u0435\u0446", "\u0443\u0439\u0442\u0438 \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430"],
  self_harm: ["\u043F\u043E\u0440\u0435\u0437\u044B", "\u043F\u043E\u0440\u0435\u0437\u0430\u0442\u044C", "\u043F\u0440\u0438\u0447\u0438\u043D\u0438\u0442\u044C \u0431\u043E\u043B\u044C", "\u043D\u0430\u0432\u0440\u0435\u0434\u0438\u0442\u044C \u0441\u0435\u0431\u0435"],
  crisis: ["\u043D\u0435 \u043C\u043E\u0433\u0443 \u0431\u043E\u043B\u044C\u0448\u0435", "\u043D\u0435\u0432\u044B\u043D\u043E\u0441\u0438\u043C\u043E", "\u043D\u0435\u0442 \u0441\u0438\u043B", "\u0431\u0435\u0437\u043D\u0430\u0434\u0435\u0436\u043D\u043E", "\u043E\u0442\u0447\u0430\u044F\u043D\u0438\u0435"],
  substance: ["\u0432\u044B\u043F\u0438\u0442\u044C", "\u043D\u0430\u043F\u0438\u0442\u044C\u0441\u044F", "\u0443\u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u044C", "\u0434\u043E\u0437\u0430", "\u0442\u0430\u0431\u043B\u0435\u0442\u043A\u0438"]
};
var DISTORTION_PATTERNS2 = [
  { type: "catastrophizing", patterns: ["\u0443\u0436\u0430\u0441\u043D\u043E", "\u043A\u043E\u0448\u043C\u0430\u0440", "\u043A\u043E\u043D\u0435\u0446 \u0441\u0432\u0435\u0442\u0430", "\u0432\u0441\u0435 \u043F\u0440\u043E\u043F\u0430\u043B\u043E"] },
  { type: "black_and_white", patterns: ["\u0432\u0441\u0435\u0433\u0434\u0430", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430", "\u0432\u0441\u0435", "\u043D\u0438\u043A\u0442\u043E", "\u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E"] },
  { type: "mind_reading", patterns: ["\u043E\u043D\u0438 \u0434\u0443\u043C\u0430\u044E\u0442", "\u0432\u0441\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442", "\u043D\u0430\u0432\u0435\u0440\u043D\u044F\u043A\u0430 \u0434\u0443\u043C\u0430\u0435\u0442"] },
  { type: "fortune_telling", patterns: ["\u0442\u043E\u0447\u043D\u043E \u0431\u0443\u0434\u0435\u0442", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0441\u044F", "\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u043F\u0440\u043E\u0432\u0430\u043B\u044E\u0441\u044C"] },
  { type: "should_statements", patterns: ["\u0434\u043E\u043B\u0436\u0435\u043D", "\u043E\u0431\u044F\u0437\u0430\u043D", "\u043D\u0430\u0434\u043E \u0431\u044B\u043B\u043E"] }
];
var VoiceInputAdapter = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "initialized", false);
    // Real-time processing state
    __publicField(this, "realtimeBuffer", []);
    __publicField(this, "realtimeEstimate", null);
    // Processing counter
    __publicField(this, "processingCounter", 0);
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize(config) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    if (this.config.sampleRate < 8e3 || this.config.sampleRate > 48e3) {
      throw new Error("Sample rate must be between 8000 and 48000 Hz");
    }
    this.initialized = true;
  }
  // ============================================================================
  // MAIN PROCESSING
  // ============================================================================
  async processAudio(audioBuffer, sampleRate) {
    if (!this.initialized) {
      await this.initialize();
    }
    const sr = sampleRate || this.config.sampleRate;
    const processingId = `voice_${Date.now()}_${++this.processingCounter}`;
    const resampled = sr !== this.config.sampleRate ? this.resample(audioBuffer, sr, this.config.sampleRate) : audioBuffer;
    const acousticFeatures = this.extractAcousticFeatures(resampled);
    const prosodyFeatures = this.extractProsodyFeatures(resampled, acousticFeatures);
    const voiceEmotion = this.mapToEmotion(acousticFeatures, prosodyFeatures);
    const quality = {
      audioQuality: acousticFeatures.quality.signalQuality,
      featureReliability: this.calculateFeatureReliability(acousticFeatures),
      overallConfidence: voiceEmotion.vad.confidence
    };
    return {
      id: processingId,
      timestamp: /* @__PURE__ */ new Date(),
      duration: resampled.length / this.config.sampleRate,
      acousticFeatures,
      prosodyFeatures,
      voiceEmotion,
      quality
    };
  }
  async processFile(_filePath) {
    throw new Error("File processing not implemented. Use processAudio with audio buffer.");
  }
  async processWithTranscription(audioBuffer, existingTranscript) {
    const result = await this.processAudio(audioBuffer);
    let textAnalysis;
    if (existingTranscript) {
      textAnalysis = this.analyzeText(existingTranscript);
    } else if (this.config.enableWhisper) {
      textAnalysis = await this.transcribe(audioBuffer);
    } else {
      return result;
    }
    const fusion = this.fuseModalities(result.voiceEmotion, textAnalysis);
    return {
      ...result,
      textAnalysis,
      fusion
    };
  }
  // ============================================================================
  // ACOUSTIC FEATURE EXTRACTION
  // ============================================================================
  extractAcousticFeatures(audioBuffer) {
    const sr = this.config.sampleRate;
    const frameSamples = Math.floor(this.config.frameSizeMs * sr / 1e3);
    const hopSamples = Math.floor(this.config.hopSizeMs * sr / 1e3);
    const preemphasized = this.preEmphasis(audioBuffer, 0.97);
    const frames = this.frameSignal(preemphasized, frameSamples, hopSamples);
    const windowedFrames = frames.map((frame) => this.hammingWindow(frame));
    const pitchContour = this.extractPitch(windowedFrames, sr);
    const pitchStats = this.calculatePitchStats(pitchContour);
    const energyContour = windowedFrames.map(
      (frame) => 10 * Math.log10(frame.reduce((sum, s) => sum + s * s, 0) / frame.length + 1e-10)
    );
    const energyStats = this.calculateStats(energyContour);
    const mfccs = this.extractMFCCs(windowedFrames, sr);
    const firstFrame = mfccs[0];
    const mfccMean = firstFrame ? firstFrame.map(
      (_, i) => mfccs.reduce((sum, frame) => sum + (frame[i] ?? 0), 0) / mfccs.length
    ) : [];
    const mfccStd = firstFrame ? firstFrame.map((_, i) => {
      const mean = mfccMean[i] ?? 0;
      return Math.sqrt(
        mfccs.reduce((sum, frame) => sum + Math.pow((frame[i] ?? 0) - mean, 2), 0) / mfccs.length
      );
    }) : [];
    const voiceQuality = this.calculateVoiceQuality(windowedFrames, pitchContour, sr);
    const temporal = this.calculateTemporalFeatures(audioBuffer, frames, pitchContour, sr);
    const spectral = this.calculateSpectralFeatures(windowedFrames, sr, mfccMean, mfccStd);
    const quality = this.assessAudioQuality(audioBuffer, energyContour);
    return {
      pitch: {
        ...pitchStats,
        contour: pitchContour
      },
      voiceQuality,
      temporal,
      spectral,
      energy: {
        ...energyStats,
        contour: energyContour
      },
      quality
    };
  }
  // ============================================================================
  // PROSODY EXTRACTION
  // ============================================================================
  extractProsodyFeatures(audioBuffer, acousticFeatures) {
    const features = acousticFeatures || this.extractAcousticFeatures(audioBuffer);
    const pitchPattern = this.analyzePitchPattern(features.pitch);
    const rhythmPattern = this.analyzeRhythmPattern(features);
    const stressPatterns = [];
    const intonationType = this.determineIntonationType(features.pitch);
    const emotionalIndicators = {
      arousalLevel: this.calculateArousalFromProsody(features),
      expressiveness: features.pitch.stdF0 / (features.pitch.meanF0 || 1),
      energyLevel: (features.energy.meanEnergy + 60) / 60,
      // Normalize dB
      tremorIndicator: features.voiceQuality.jitterLocal / 5
      // Normalize
    };
    const pausePatterns = {
      hesitationMarkers: this.countHesitationMarkers(features),
      filledPauses: 0,
      // Would need transcription
      cognitiveLoadIndicator: features.temporal.meanPauseDuration / 0.5
    };
    return {
      pitchPattern,
      rhythmPattern,
      stressPatterns,
      intonationType,
      emotionalIndicators,
      pausePatterns
    };
  }
  // ============================================================================
  // EMOTION MAPPING
  // ============================================================================
  mapToEmotion(acoustic, prosody) {
    const emotionProbabilities = this.calculateEmotionProbabilities(acoustic, prosody);
    let primaryEmotion = "neutral";
    let maxProb = 0;
    emotionProbabilities.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryEmotion = emotion;
      }
    });
    const vad = this.calculateVAD(acoustic, prosody);
    const depressionIndicators = this.calculateDepressionIndicators(acoustic, prosody);
    const anxietyIndicators = this.calculateAnxietyIndicators(acoustic, prosody);
    const stressIndicators = this.calculateStressIndicators(acoustic, prosody);
    return {
      primaryEmotion,
      emotionProbabilities,
      vad,
      depressionIndicators,
      anxietyIndicators,
      stressIndicators
    };
  }
  // ============================================================================
  // MULTIMODAL FUSION
  // ============================================================================
  fuseModalities(voiceEmotion, textAnalysis) {
    const [textWeight, voiceWeight] = this.config.fusionWeights;
    const textVAD = this.textSentimentToVAD(textAnalysis.sentiment, textAnalysis.textEmotions);
    const voiceVAD = voiceEmotion.vad;
    const fusedVAD = {
      valence: textWeight * textVAD.valence + voiceWeight * voiceVAD.valence,
      arousal: textWeight * textVAD.arousal + voiceWeight * voiceVAD.arousal,
      dominance: textWeight * textVAD.dominance + voiceWeight * voiceVAD.dominance,
      confidence: Math.min(textAnalysis.confidence, voiceVAD.confidence)
    };
    const fusedEmotions = /* @__PURE__ */ new Map();
    const allEmotions = /* @__PURE__ */ new Set([
      ...voiceEmotion.emotionProbabilities.keys(),
      ...textAnalysis.textEmotions.keys()
    ]);
    allEmotions.forEach((emotion) => {
      const voiceProb = voiceEmotion.emotionProbabilities.get(emotion) || 0;
      const textProb = textAnalysis.textEmotions.get(emotion) || 0;
      fusedEmotions.set(emotion, textWeight * textProb + voiceWeight * voiceProb);
    });
    let primaryEmotion = "neutral";
    let maxProb = 0;
    fusedEmotions.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryEmotion = emotion;
      }
    });
    const voicePrimary = voiceEmotion.primaryEmotion;
    const textPrimary = this.getTextPrimaryEmotion(textAnalysis);
    const agreement = this.calculateModalityAgreement(voiceEmotion, textAnalysis);
    let discrepancy;
    if (agreement < 0.5 && voicePrimary !== textPrimary) {
      discrepancy = this.analyzeDiscrepancy(voicePrimary, textPrimary, voiceEmotion, textAnalysis);
    }
    const recommendations = this.generateRecommendations(
      fusedVAD,
      voiceEmotion,
      textAnalysis,
      discrepancy
    );
    return {
      vad: fusedVAD,
      emotionProbabilities: fusedEmotions,
      primaryEmotion,
      contributions: { text: textWeight, voice: voiceWeight },
      modalityAgreement: agreement,
      discrepancy,
      confidence: fusedVAD.confidence,
      recommendations
    };
  }
  // ============================================================================
  // TRANSCRIPTION
  // ============================================================================
  async transcribe(_audioBuffer) {
    if (!this.config.enableWhisper) {
      throw new Error("Whisper transcription not enabled");
    }
    console.warn("Whisper API integration requires external service. Returning placeholder.");
    return {
      text: "[Transcription requires Whisper API integration]",
      language: this.config.language,
      wordCount: 0,
      sentiment: 0,
      keyPhrases: [],
      textEmotions: /* @__PURE__ */ new Map([["neutral", 1]]),
      cognitiveDistortions: [],
      riskKeywords: [],
      confidence: 0.1
    };
  }
  analyzeText(text) {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    const sentiment = this.calculateSimpleSentiment(text);
    const textEmotions = this.detectTextEmotions(text);
    const cognitiveDistortions = this.detectCognitiveDistortions(text);
    const riskKeywords = this.detectRiskKeywords(text);
    const keyPhrases = words.filter((w) => w.length > 6).slice(0, 5);
    return {
      text,
      language: this.config.language,
      wordCount: words.length,
      sentiment,
      keyPhrases,
      textEmotions,
      cognitiveDistortions,
      riskKeywords,
      confidence: 0.7
    };
  }
  // ============================================================================
  // REAL-TIME PROCESSING
  // ============================================================================
  addRealtimeChunk(chunk) {
    this.realtimeBuffer.push(chunk);
    while (this.realtimeBuffer.length > this.config.realtimeBufferSize) {
      this.realtimeBuffer.shift();
    }
    if (this.realtimeBuffer.length >= 10) {
      const combined = this.combineBuffers(this.realtimeBuffer);
      const acoustic = this.extractAcousticFeatures(combined);
      const prosody = this.extractProsodyFeatures(combined, acoustic);
      this.realtimeEstimate = this.mapToEmotion(acoustic, prosody);
    }
  }
  getRealtimeEstimate() {
    return this.realtimeEstimate;
  }
  // ============================================================================
  // CONVERSION
  // ============================================================================
  toStateObservation(result) {
    const fusion = result.fusion;
    const voice = result.voiceEmotion;
    const vad = fusion?.vad || voice.vad;
    return [
      vad.valence,
      // -1 to 1
      vad.arousal,
      // -1 to 1
      vad.dominance,
      // 0 to 1
      1 - voice.depressionIndicators.score,
      // Invert for risk dimension
      1 - voice.stressIndicators.score
      // Invert for resources dimension
    ];
  }
  getConfig() {
    return { ...this.config };
  }
  adaptFusionWeights(predictions, actuals) {
    if (predictions.length !== actuals.length || predictions.length < 5) {
      return;
    }
    let textError = 0;
    let voiceError = 0;
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const actual = actuals[i];
      if (!pred || !actual) continue;
      const vadError = Math.sqrt(
        Math.pow(pred.vad.valence - actual.vad.valence, 2) + Math.pow(pred.vad.arousal - actual.vad.arousal, 2) + Math.pow(pred.vad.dominance - actual.vad.dominance, 2)
      );
      textError += vadError * pred.contributions.text;
      voiceError += vadError * pred.contributions.voice;
    }
    const totalError = textError + voiceError;
    if (totalError > 0) {
      const textPerformance = 1 - textError / totalError;
      const voicePerformance = 1 - voiceError / totalError;
      const alpha = 0.1;
      const currentTextWeight = this.config.fusionWeights[0] ?? 0.5;
      const currentVoiceWeight = this.config.fusionWeights[1] ?? 0.5;
      this.config.fusionWeights[0] = currentTextWeight * (1 - alpha) + textPerformance * alpha;
      this.config.fusionWeights[1] = currentVoiceWeight * (1 - alpha) + voicePerformance * alpha;
      const sum = (this.config.fusionWeights[0] ?? 0.5) + (this.config.fusionWeights[1] ?? 0.5);
      this.config.fusionWeights[0] = (this.config.fusionWeights[0] ?? 0.5) / sum;
      this.config.fusionWeights[1] = (this.config.fusionWeights[1] ?? 0.5) / sum;
    }
  }
  // ============================================================================
  // PRIVATE HELPERS: Signal Processing
  // ============================================================================
  preEmphasis(signal, coef) {
    const result = new Float32Array(signal.length);
    result[0] = signal[0] ?? 0;
    for (let i = 1; i < signal.length; i++) {
      result[i] = (signal[i] ?? 0) - coef * (signal[i - 1] ?? 0);
    }
    return result;
  }
  frameSignal(signal, frameSize, hopSize) {
    const frames = [];
    for (let i = 0; i + frameSize <= signal.length; i += hopSize) {
      frames.push(signal.slice(i, i + frameSize));
    }
    return frames;
  }
  hammingWindow(frame) {
    const N = frame.length;
    const result = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
      result[i] = (frame[i] ?? 0) * window;
    }
    return result;
  }
  extractPitch(frames, sampleRate) {
    const minLag = Math.floor(sampleRate / this.config.maxF0);
    const maxLag = Math.floor(sampleRate / this.config.minF0);
    return frames.map((frame) => {
      let maxCorr = 0;
      let bestLag = 0;
      for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
        let corr = 0;
        for (let i = 0; i < frame.length - lag; i++) {
          corr += (frame[i] ?? 0) * (frame[i + lag] ?? 0);
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }
      if (maxCorr > 0.3 * frame.reduce((sum, s) => sum + s * s, 0) && bestLag > 0) {
        return sampleRate / bestLag;
      }
      return 0;
    });
  }
  extractMFCCs(frames, sampleRate) {
    const numFilters = 26;
    const numCoeffs = this.config.numMfcc;
    return frames.map((frame) => {
      const fft = this.simpleFFT(frame);
      const powerSpectrum = fft.map((c) => c * c);
      const melEnergies = this.melFilterbank(powerSpectrum, sampleRate, numFilters);
      const logMelEnergies = melEnergies.map((e) => Math.log(e + 1e-10));
      const mfccs = this.dct(logMelEnergies, numCoeffs);
      return mfccs;
    });
  }
  simpleFFT(frame) {
    const N = frame.length;
    const result = [];
    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = 2 * Math.PI * k * n / N;
        const sample = frame[n] ?? 0;
        real += sample * Math.cos(angle);
        imag -= sample * Math.sin(angle);
      }
      result.push(Math.sqrt(real * real + imag * imag));
    }
    return result;
  }
  melFilterbank(spectrum, sampleRate, numFilters) {
    const melEnergies = [];
    const fMax = sampleRate / 2;
    const melMax = 2595 * Math.log10(1 + fMax / 700);
    for (let i = 0; i < numFilters; i++) {
      const melLow = melMax * i / (numFilters + 1);
      const melHigh = melMax * (i + 2) / (numFilters + 1);
      const melCenter = melMax * (i + 1) / (numFilters + 1);
      const fLow = 700 * (Math.pow(10, melLow / 2595) - 1);
      const fCenter = 700 * (Math.pow(10, melCenter / 2595) - 1);
      const fHigh = 700 * (Math.pow(10, melHigh / 2595) - 1);
      const binLow = Math.floor(fLow / fMax * spectrum.length);
      const binCenter = Math.floor(fCenter / fMax * spectrum.length);
      const binHigh = Math.floor(fHigh / fMax * spectrum.length);
      let energy = 0;
      for (let k = binLow; k < binHigh && k < spectrum.length; k++) {
        const weight = k < binCenter ? (k - binLow) / (binCenter - binLow) : (binHigh - k) / (binHigh - binCenter);
        energy += (spectrum[k] ?? 0) * Math.max(0, weight);
      }
      melEnergies.push(energy);
    }
    return melEnergies;
  }
  dct(input, numCoeffs) {
    const N = input.length;
    const result = [];
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let n = 0; n < N; n++) {
        sum += (input[n] ?? 0) * Math.cos(Math.PI * k * (n + 0.5) / N);
      }
      result.push(sum * Math.sqrt(2 / N));
    }
    return result;
  }
  resample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    const ratio = toRate / fromRate;
    const newLength = Math.floor(buffer.length * ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const frac = srcIndex - srcIndexFloor;
      if (srcIndexFloor + 1 < buffer.length) {
        result[i] = (buffer[srcIndexFloor] ?? 0) * (1 - frac) + (buffer[srcIndexFloor + 1] ?? 0) * frac;
      } else {
        result[i] = buffer[srcIndexFloor] ?? 0;
      }
    }
    return result;
  }
  combineBuffers(buffers) {
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  }
  // ============================================================================
  // PRIVATE HELPERS: Statistics & Analysis
  // ============================================================================
  calculatePitchStats(pitchContour) {
    const voiced = pitchContour.filter((f) => f > 0);
    if (voiced.length === 0) {
      return { meanF0: 0, stdF0: 0, minF0: 0, maxF0: 0, rangeF0: 0, voicedRatio: 0 };
    }
    const meanF0 = voiced.reduce((a, b) => a + b, 0) / voiced.length;
    const stdF0 = Math.sqrt(
      voiced.reduce((sum, f) => sum + Math.pow(f - meanF0, 2), 0) / voiced.length
    );
    const minF0 = Math.min(...voiced);
    const maxF0 = Math.max(...voiced);
    return {
      meanF0,
      stdF0,
      minF0,
      maxF0,
      rangeF0: maxF0 - minF0,
      voicedRatio: voiced.length / pitchContour.length
    };
  }
  calculateStats(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    const range = Math.max(...values) - Math.min(...values);
    return { meanEnergy: mean, stdEnergy: std, rangeEnergy: range };
  }
  calculateVoiceQuality(frames, pitchContour, _sampleRate) {
    const voicedFrames = frames.filter((_, i) => (pitchContour[i] ?? 0) > 0);
    if (voicedFrames.length < 3) {
      return { jitterLocal: 0, shimmerLocal: 0, hnr: 0, nhr: 0 };
    }
    const voicedPitches = pitchContour.filter((f) => f > 0);
    let jitterSum = 0;
    for (let i = 1; i < voicedPitches.length; i++) {
      const curr = voicedPitches[i] ?? 0;
      const prev = voicedPitches[i - 1] ?? 0;
      jitterSum += Math.abs(curr - prev);
    }
    const jitterLocal = jitterSum / (voicedPitches.length - 1) / (voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length) * 100;
    const amplitudes = voicedFrames.map(
      (frame) => Math.sqrt(frame.reduce((sum, s) => sum + s * s, 0) / frame.length)
    );
    let shimmerSum = 0;
    for (let i = 1; i < amplitudes.length; i++) {
      const curr = amplitudes[i] ?? 0;
      const prev = amplitudes[i - 1] ?? 0;
      shimmerSum += Math.abs(curr - prev);
    }
    const shimmerLocal = shimmerSum / (amplitudes.length - 1) / (amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length) * 100;
    const hnr = 20 * Math.log10(1 / (jitterLocal / 100 + shimmerLocal / 100 + 0.01));
    const nhr = 1 / (Math.pow(10, hnr / 20) + 1);
    return {
      jitterLocal: Math.min(10, jitterLocal),
      shimmerLocal: Math.min(20, shimmerLocal),
      hnr: Math.max(-20, Math.min(30, hnr)),
      nhr
    };
  }
  calculateTemporalFeatures(audioBuffer, _frames, pitchContour, sampleRate) {
    const duration = audioBuffer.length / sampleRate;
    const voicedFrames = pitchContour.filter((f) => f > 0).length;
    const totalFrames = pitchContour.length;
    let pauseCount = 0;
    let pauseDuration = 0;
    let inPause = (pitchContour[0] ?? 0) === 0;
    for (let i = 1; i < pitchContour.length; i++) {
      const pitch = pitchContour[i] ?? 0;
      if (pitch === 0 && !inPause) {
        inPause = true;
        pauseCount++;
      } else if (pitch > 0 && inPause) {
        inPause = false;
      }
      if (pitch === 0) {
        pauseDuration += this.config.hopSizeMs / 1e3;
      }
    }
    const speakingTime = voicedFrames / totalFrames * duration;
    const speechRate = 3;
    const articulationRate = speechRate / (speakingTime / duration);
    return {
      speechRate,
      articulationRate,
      duration,
      speakingTime,
      pauseDuration,
      pauseCount,
      meanPauseDuration: pauseCount > 0 ? pauseDuration / pauseCount : 0
    };
  }
  calculateSpectralFeatures(frames, sampleRate, mfccMean, mfccStd) {
    let totalCentroid = 0;
    let totalFlux = 0;
    let prevSpectrum = null;
    for (const frame of frames) {
      const spectrum = this.simpleFFT(frame);
      const total = spectrum.reduce((a, b) => a + b, 0) + 1e-10;
      let centroid = 0;
      for (let i = 0; i < spectrum.length; i++) {
        const freq = i * sampleRate / (2 * spectrum.length);
        centroid += freq * (spectrum[i] ?? 0) / total;
      }
      totalCentroid += centroid;
      if (prevSpectrum) {
        let flux = 0;
        for (let i = 0; i < spectrum.length; i++) {
          flux += Math.pow((spectrum[i] ?? 0) - (prevSpectrum[i] ?? 0), 2);
        }
        totalFlux += Math.sqrt(flux);
      }
      prevSpectrum = spectrum;
    }
    const spectralCentroid = totalCentroid / frames.length;
    const spectralFlux = totalFlux / (frames.length - 1);
    const spectralRolloff = spectralCentroid * 2;
    return {
      mfccMean,
      mfccStd,
      spectralCentroid,
      spectralFlux,
      spectralRolloff
    };
  }
  assessAudioQuality(audioBuffer, energyContour) {
    const maxEnergy = Math.max(...energyContour);
    const minEnergy = Math.min(...energyContour);
    const dynamicRange = maxEnergy - minEnergy;
    let clippedSamples = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      if (Math.abs(audioBuffer[i] ?? 0) > 0.99) {
        clippedSamples++;
      }
    }
    const clippingRatio = clippedSamples / audioBuffer.length;
    const silentFrames = energyContour.filter((e) => e < -40).length;
    const silenceRatio = silentFrames / energyContour.length;
    const signalQuality = Math.max(0, Math.min(
      1,
      dynamicRange / 60 * (1 - clippingRatio) * (1 - silenceRatio * 0.5)
    ));
    return {
      signalQuality,
      noiseLevel: minEnergy,
      clippingRatio,
      silenceRatio
    };
  }
  calculateFeatureReliability(features) {
    const pitchReliability = features.pitch.voicedRatio;
    const signalQuality = features.quality.signalQuality;
    const energyRange = Math.min(1, features.energy.rangeEnergy / 30);
    return (pitchReliability + signalQuality + energyRange) / 3;
  }
  // ============================================================================
  // PRIVATE HELPERS: Prosody Analysis
  // ============================================================================
  analyzePitchPattern(pitch) {
    const cv = pitch.stdF0 / (pitch.meanF0 || 1);
    if (cv < 0.1) return "monotone";
    if (cv > 0.3) return "varied";
    const contour = pitch.contour.filter((f) => f > 0);
    if (contour.length < 5) return "monotone";
    const firstHalf = contour.slice(0, contour.length / 2);
    const secondHalf = contour.slice(contour.length / 2);
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (secondMean > firstMean * 1.1) return "rising";
    if (secondMean < firstMean * 0.9) return "falling";
    return "varied";
  }
  analyzeRhythmPattern(features) {
    const pauseVariability = features.temporal.meanPauseDuration > 0 ? features.temporal.pauseDuration / features.temporal.pauseCount / features.temporal.meanPauseDuration : 1;
    if (pauseVariability > 1.5) return "irregular";
    if (features.temporal.pauseCount / features.temporal.duration > 0.5) return "hesitant";
    if (features.temporal.speechRate > 5) return "rushed";
    return "regular";
  }
  determineIntonationType(pitch) {
    const contour = pitch.contour.filter((f) => f > 0);
    if (contour.length < 3) return "neutral";
    const lastThird = contour.slice(-Math.floor(contour.length / 3));
    const lastMean = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    const overallMean = pitch.meanF0;
    if (lastMean > overallMean * 1.2) return "interrogative";
    if (lastMean < overallMean * 0.8) return "declarative";
    if (pitch.rangeF0 > pitch.meanF0 * 0.5) return "exclamatory";
    return "neutral";
  }
  calculateArousalFromProsody(features) {
    const pitchNorm = Math.min(1, features.pitch.meanF0 / 200);
    const rateNorm = Math.min(1, features.temporal.speechRate / 5);
    const energyNorm = Math.min(1, (features.energy.meanEnergy + 40) / 40);
    const variabilityNorm = Math.min(1, features.pitch.stdF0 / 50);
    return (pitchNorm * 0.3 + rateNorm * 0.3 + energyNorm * 0.2 + variabilityNorm * 0.2) * 2 - 1;
  }
  countHesitationMarkers(features) {
    return Math.min(10, features.temporal.pauseCount);
  }
  // ============================================================================
  // PRIVATE HELPERS: Emotion Mapping
  // ============================================================================
  calculateEmotionProbabilities(acoustic, prosody) {
    const emotions = /* @__PURE__ */ new Map();
    const arousal = prosody.emotionalIndicators.arousalLevel;
    const valence = this.estimateValenceFromAcoustic(acoustic);
    if (arousal > 0.3 && valence > 0.3) {
      emotions.set("joy", 0.6);
      emotions.set("excitement", 0.3);
    } else if (arousal > 0.3 && valence < -0.3) {
      emotions.set("anger", 0.4);
      emotions.set("anxiety", 0.4);
    } else if (arousal < -0.3 && valence < -0.3) {
      emotions.set("sadness", 0.6);
      emotions.set("depression", 0.3);
    } else if (arousal < -0.3 && valence > 0.3) {
      emotions.set("calm", 0.6);
      emotions.set("contentment", 0.3);
    } else {
      emotions.set("neutral", 0.8);
    }
    if (acoustic.voiceQuality.jitterLocal > 2 || acoustic.voiceQuality.shimmerLocal > 5) {
      const stressProb = emotions.get("anxiety") || 0;
      emotions.set("stress", stressProb + 0.2);
    }
    const total = Array.from(emotions.values()).reduce((a, b) => a + b, 0);
    emotions.forEach((v, k) => emotions.set(k, v / total));
    return emotions;
  }
  estimateValenceFromAcoustic(acoustic) {
    const hnrNorm = Math.min(1, Math.max(-1, acoustic.voiceQuality.hnr / 20));
    const centroidNorm = Math.min(1, acoustic.spectral.spectralCentroid / 2e3);
    return (hnrNorm * 0.6 + centroidNorm * 0.4) * 2 - 1;
  }
  calculateVAD(acoustic, prosody) {
    const arousal = prosody.emotionalIndicators.arousalLevel;
    const valence = this.estimateValenceFromAcoustic(acoustic);
    const dominance = Math.min(1, Math.max(
      0,
      0.5 + (acoustic.energy.meanEnergy + 30) / 60 * 0.3 + prosody.emotionalIndicators.expressiveness * 0.2
    ));
    const confidence = acoustic.quality.signalQuality * acoustic.pitch.voicedRatio;
    return { valence, arousal, dominance, confidence };
  }
  calculateDepressionIndicators(acoustic, _prosody) {
    const pitchCV = acoustic.pitch.stdF0 / (acoustic.pitch.meanF0 || 1);
    const flatAffect = Math.max(0, 1 - pitchCV / 0.2);
    const psychomotorRetardation = Math.max(0, 1 - acoustic.temporal.speechRate / 3);
    const lowEnergy = Math.max(0, 1 - (acoustic.energy.meanEnergy + 40) / 40);
    const score = flatAffect * 0.4 + psychomotorRetardation * 0.3 + lowEnergy * 0.3;
    const confidence = acoustic.quality.signalQuality * 0.8;
    return { flatAffect, psychomotorRetardation, lowEnergy, score, confidence };
  }
  calculateAnxietyIndicators(acoustic, prosody) {
    const highPitch = Math.min(1, acoustic.pitch.meanF0 / 250);
    const fastSpeech = Math.min(1, acoustic.temporal.speechRate / 5);
    const tremor = Math.min(1, acoustic.voiceQuality.jitterLocal / 3);
    const hesitation = Math.min(1, prosody.pausePatterns.hesitationMarkers / 10);
    const score = highPitch * 0.25 + fastSpeech * 0.25 + tremor * 0.25 + hesitation * 0.25;
    const confidence = acoustic.quality.signalQuality * 0.8;
    return { highPitch, fastSpeech, tremor, hesitation, score, confidence };
  }
  calculateStressIndicators(acoustic, prosody) {
    const voiceInstability = Math.min(1, (acoustic.voiceQuality.jitterLocal + acoustic.voiceQuality.shimmerLocal) / 10);
    const reducedClarity = Math.max(0, 1 - (acoustic.voiceQuality.hnr + 10) / 30);
    const breathingIrregularity = Math.min(1, prosody.pausePatterns.cognitiveLoadIndicator);
    const score = voiceInstability * 0.4 + reducedClarity * 0.3 + breathingIrregularity * 0.3;
    const confidence = acoustic.quality.signalQuality * 0.8;
    return { voiceInstability, reducedClarity, breathingIrregularity, score, confidence };
  }
  // ============================================================================
  // PRIVATE HELPERS: Text Analysis
  // ============================================================================
  calculateSimpleSentiment(text) {
    const positiveWords = ["\u0445\u043E\u0440\u043E\u0448\u043E", "\u043E\u0442\u043B\u0438\u0447\u043D\u043E", "\u0440\u0430\u0434", "\u0441\u0447\u0430\u0441\u0442\u043B\u0438\u0432", "\u043B\u044E\u0431\u043B\u044E", "\u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F", "\u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E", "\u0441\u0443\u043F\u0435\u0440"];
    const negativeWords = ["\u043F\u043B\u043E\u0445\u043E", "\u0443\u0436\u0430\u0441\u043D\u043E", "\u0433\u0440\u0443\u0441\u0442\u043D\u043E", "\u0437\u043B\u043E\u0439", "\u043D\u0435\u043D\u0430\u0432\u0438\u0436\u0443", "\u0441\u0442\u0440\u0430\u0448\u043D\u043E", "\u0431\u043E\u043B\u044C\u043D\u043E", "\u0442\u044F\u0436\u0435\u043B\u043E"];
    const lower = text.toLowerCase();
    let score = 0;
    positiveWords.forEach((w) => {
      if (lower.includes(w)) score += 0.2;
    });
    negativeWords.forEach((w) => {
      if (lower.includes(w)) score -= 0.2;
    });
    return Math.max(-1, Math.min(1, score));
  }
  detectTextEmotions(text) {
    const emotions = /* @__PURE__ */ new Map();
    const lower = text.toLowerCase();
    const emotionKeywords = {
      joy: ["\u0440\u0430\u0434", "\u0441\u0447\u0430\u0441\u0442\u043B\u0438\u0432", "\u0432\u0435\u0441\u0435\u043B\u043E", "\u0445\u043E\u0440\u043E\u0448\u043E"],
      sadness: ["\u0433\u0440\u0443\u0441\u0442\u043D\u043E", "\u043F\u0435\u0447\u0430\u043B\u044C\u043D\u043E", "\u0442\u043E\u0441\u043A\u0430", "\u043E\u0434\u0438\u043D\u043E\u043A\u043E"],
      anger: ["\u0437\u043B\u043E\u0441\u0442\u044C", "\u0431\u0435\u0448\u0435\u043D\u0441\u0442\u0432\u043E", "\u0440\u0430\u0437\u0434\u0440\u0430\u0436\u0435\u043D", "\u043D\u0435\u043D\u0430\u0432\u0438\u0436\u0443"],
      fear: ["\u0441\u0442\u0440\u0430\u0445", "\u0431\u043E\u044E\u0441\u044C", "\u0442\u0440\u0435\u0432\u043E\u0433\u0430", "\u043F\u0430\u043D\u0438\u043A\u0430"],
      anxiety: ["\u0431\u0435\u0441\u043F\u043E\u043A\u043E\u0439\u0441\u0442\u0432\u043E", "\u0432\u043E\u043B\u043D\u0443\u044E\u0441\u044C", "\u043D\u0435\u0440\u0432\u043D\u0438\u0447\u0430\u044E"],
      neutral: []
    };
    let total = 0;
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      let count = 0;
      keywords.forEach((kw) => {
        if (lower.includes(kw)) count++;
      });
      if (count > 0) {
        emotions.set(emotion, count);
        total += count;
      }
    });
    if (total > 0) {
      emotions.forEach((v, k) => emotions.set(k, v / total));
    } else {
      emotions.set("neutral", 1);
    }
    return emotions;
  }
  detectCognitiveDistortions(text) {
    const lower = text.toLowerCase();
    const distortions = [];
    DISTORTION_PATTERNS2.forEach(({ type, patterns }) => {
      patterns.forEach((pattern) => {
        if (lower.includes(pattern)) {
          distortions.push({
            type,
            phrase: pattern,
            confidence: 0.7
          });
        }
      });
    });
    return distortions;
  }
  detectRiskKeywords(text) {
    const lower = text.toLowerCase();
    const risks = [];
    Object.entries(RISK_KEYWORDS).forEach(([category, keywords]) => {
      keywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          risks.push({
            keyword,
            category,
            severity: category === "suicidal" ? 1 : category === "self_harm" ? 0.8 : 0.5
          });
        }
      });
    });
    return risks;
  }
  textSentimentToVAD(sentiment, emotions) {
    const valence = sentiment;
    let arousal = 0;
    if (emotions.has("anger")) arousal += emotions.get("anger") * 0.8;
    if (emotions.has("fear")) arousal += emotions.get("fear") * 0.6;
    if (emotions.has("joy")) arousal += emotions.get("joy") * 0.4;
    if (emotions.has("sadness")) arousal -= emotions.get("sadness") * 0.4;
    let dominance = 0.5;
    if (emotions.has("anger")) dominance += emotions.get("anger") * 0.3;
    if (emotions.has("fear")) dominance -= emotions.get("fear") * 0.3;
    return {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(-1, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance))
    };
  }
  getTextPrimaryEmotion(textAnalysis) {
    let primary = "neutral";
    let maxProb = 0;
    textAnalysis.textEmotions.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primary = emotion;
      }
    });
    return primary;
  }
  calculateModalityAgreement(voice, text) {
    const voicePrimary = voice.primaryEmotion;
    const textPrimary = this.getTextPrimaryEmotion(text);
    if (voicePrimary === textPrimary) return 1;
    const voiceValence = voice.vad.valence;
    const textValence = text.sentiment;
    const valenceDiff = Math.abs(voiceValence - textValence);
    return Math.max(0, 1 - valenceDiff);
  }
  analyzeDiscrepancy(voicePrimary, textPrimary, voice, text) {
    const voiceValence = voice.vad.valence;
    const textValence = text.sentiment;
    if (textValence > 0 && voiceValence < -0.3) {
      return {
        type: "suppression",
        textEmotion: textPrimary,
        voiceEmotion: voicePrimary,
        interpretation: "\u0413\u043E\u043B\u043E\u0441 \u0432\u044B\u0440\u0430\u0436\u0430\u0435\u0442 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u044D\u043C\u043E\u0446\u0438\u0438, \u0441\u043A\u0440\u044B\u0432\u0430\u0435\u043C\u044B\u0435 \u0432 \u0441\u043B\u043E\u0432\u0430\u0445. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043F\u043E\u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u044D\u043C\u043E\u0446\u0438\u0439."
      };
    }
    if (textValence < 0 && voiceValence > 0.3) {
      return {
        type: "masking",
        textEmotion: textPrimary,
        voiceEmotion: voicePrimary,
        interpretation: "\u041F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u044B\u0439 \u0442\u043E\u043D \u0433\u043E\u043B\u043E\u0441\u0430 \u043C\u0430\u0441\u043A\u0438\u0440\u0443\u0435\u0442 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435."
      };
    }
    if (textValence < 0 && voiceValence < 0) {
      const voiceIntensity = Math.abs(voiceValence);
      const textIntensity = Math.abs(textValence);
      if (voiceIntensity > textIntensity * 1.5) {
        return {
          type: "amplification",
          textEmotion: textPrimary,
          voiceEmotion: voicePrimary,
          interpretation: "\u0413\u043E\u043B\u043E\u0441 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u0431\u043E\u043B\u0435\u0435 \u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u043D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u044D\u043C\u043E\u0446\u0438\u0438, \u0447\u0435\u043C \u0441\u043B\u043E\u0432\u0430."
        };
      }
    }
    return {
      type: "none",
      textEmotion: textPrimary,
      voiceEmotion: voicePrimary,
      interpretation: "\u041C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u044B."
    };
  }
  generateRecommendations(vad, voice, text, discrepancy) {
    const recommendations = [];
    if (text.riskKeywords.length > 0) {
      const severity = Math.max(...text.riskKeywords.map((r) => r.severity));
      if (severity >= 0.8) {
        recommendations.push("\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: \u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440\u044B \u0432\u044B\u0441\u043E\u043A\u043E\u0433\u043E \u0440\u0438\u0441\u043A\u0430. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043D\u0435\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438.");
      } else {
        recommendations.push("\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440\u044B \u0440\u0438\u0441\u043A\u0430. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430.");
      }
    }
    if (voice.depressionIndicators.score > 0.6) {
      recommendations.push("\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0431\u0438\u043E\u043C\u0430\u0440\u043A\u0435\u0440\u044B \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u043D\u0430 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u044B \u0434\u0435\u043F\u0440\u0435\u0441\u0441\u0438\u0438. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043E\u0446\u0435\u043D\u043A\u0430 PHQ-9.");
    }
    if (voice.anxietyIndicators.score > 0.6) {
      recommendations.push("\u0412\u044B\u044F\u0432\u043B\u0435\u043D\u044B \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0438 \u043F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u043E\u0439 \u0442\u0440\u0435\u0432\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0432 \u0433\u043E\u043B\u043E\u0441\u0435. \u0420\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u0442\u0435\u0445\u043D\u0438\u043A\u0438 \u0440\u0435\u043B\u0430\u043A\u0441\u0430\u0446\u0438\u0438.");
    }
    if (discrepancy && discrepancy.type !== "none") {
      recommendations.push(`\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u0440\u0435\u0447\u044C\u044E \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u043C (${discrepancy.type}). ${discrepancy.interpretation}`);
    }
    if (text.cognitiveDistortions.length > 0) {
      const types = [...new Set(text.cognitiveDistortions.map((d) => d.type))];
      recommendations.push(`\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u043A\u043E\u0433\u043D\u0438\u0442\u0438\u0432\u043D\u044B\u0435 \u0438\u0441\u043A\u0430\u0436\u0435\u043D\u0438\u044F: ${types.join(", ")}. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u041A\u041F\u0422-\u0442\u0435\u0445\u043D\u0438\u043A\u0430\u043C\u0438.`);
    }
    if (vad.valence > 0.5 && voice.stressIndicators.score < 0.3) {
      recommendations.push("\u041E\u0431\u0449\u0435\u0435 \u044D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0435 \u0438 \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E\u0435.");
    }
    return recommendations;
  }
};
function createVoiceInputAdapter(config) {
  return new VoiceInputAdapter(config);
}

// src/crisis/CrisisDetector.ts
var CRITICAL_KEYWORDS = {
  // Suicidal ideation - Russian
  ru_suicidal: [
    "\u0441\u0443\u0438\u0446\u0438\u0434",
    "\u0441\u0430\u043C\u043E\u0443\u0431\u0438\u0439\u0441\u0442\u0432",
    "\u043F\u043E\u043A\u043E\u043D\u0447\u0438\u0442\u044C \u0441 \u0441\u043E\u0431\u043E\u0439",
    "\u043F\u043E\u043A\u043E\u043D\u0447\u0443 \u0441 \u0441\u043E\u0431\u043E\u0439",
    "\u0443\u0431\u0438\u0442\u044C \u0441\u0435\u0431\u044F",
    "\u0443\u0431\u044C\u044E \u0441\u0435\u0431\u044F",
    "\u0445\u043E\u0447\u0443 \u0443\u043C\u0435\u0440\u0435\u0442\u044C",
    "\u0445\u043E\u0447\u0443 \u0441\u0434\u043E\u0445\u043D\u0443\u0442\u044C",
    "\u0443\u043C\u0435\u0440\u0435\u0442\u044C",
    "\u0441\u0434\u043E\u0445\u043D\u0443\u0442\u044C",
    // standalone for mixed language detection
    "\u043D\u0435 \u0445\u043E\u0447\u0443 \u0436\u0438\u0442\u044C",
    "\u043D\u0435 \u0445\u043E\u0447\u0443 \u0431\u043E\u043B\u044C\u0448\u0435 \u0436\u0438\u0442\u044C",
    "\u0443\u0441\u0442\u0430\u043B \u0436\u0438\u0442\u044C",
    "\u0443\u0441\u0442\u0430\u043B\u0430 \u0436\u0438\u0442\u044C",
    "\u043B\u0443\u0447\u0448\u0435 \u0431\u044B \u044F \u0443\u043C\u0435\u0440",
    "\u043B\u0443\u0447\u0448\u0435 \u0431\u044B \u044F \u0443\u043C\u0435\u0440\u043B\u0430",
    "\u043B\u0443\u0447\u0448\u0435 \u0431\u044B \u043C\u0435\u043D\u044F \u043D\u0435 \u0431\u044B\u043B\u043E",
    "\u043F\u043E\u0432\u0435\u0441\u0438\u0442\u044C\u0441\u044F",
    "\u043F\u043E\u0432\u0435\u0448\u0443\u0441\u044C",
    "\u0432\u0441\u043A\u0440\u044B\u0442\u044C \u0432\u0435\u043D\u044B",
    "\u0432\u0441\u043A\u0440\u043E\u044E \u0432\u0435\u043D\u044B",
    "\u043F\u0440\u044B\u0433\u043D\u0443 \u0441",
    "\u0441\u043F\u0440\u044B\u0433\u043D\u0443 \u0441",
    "\u043D\u0430\u0433\u043B\u043E\u0442\u0430\u044E\u0441\u044C \u0442\u0430\u0431\u043B\u0435\u0442\u043E\u043A",
    "\u0442\u0430\u0431\u043B\u0435\u0442\u043A\u0438 \u0432\u044B\u043F\u044C\u044E",
    "\u0436\u0438\u0437\u043D\u044C \u043D\u0435 \u0438\u043C\u0435\u0435\u0442 \u0441\u043C\u044B\u0441\u043B\u0430",
    "\u0437\u0430\u0447\u0435\u043C \u0436\u0438\u0442\u044C",
    "\u043D\u0435\u0437\u0430\u0447\u0435\u043C \u0436\u0438\u0442\u044C",
    "\u0432\u0441\u0435\u043C \u0431\u0443\u0434\u0435\u0442 \u043B\u0443\u0447\u0448\u0435 \u0431\u0435\u0437 \u043C\u0435\u043D\u044F",
    "\u043D\u0438\u043A\u043E\u043C\u0443 \u043D\u0435 \u043D\u0443\u0436\u0435\u043D",
    "\u043D\u0438\u043A\u043E\u043C\u0443 \u043D\u0435 \u043D\u0443\u0436\u043D\u0430",
    "\u043A\u043E\u043D\u0435\u0446 \u0432\u0441\u0435\u043C\u0443",
    "\u0445\u043E\u0447\u0443 \u0438\u0441\u0447\u0435\u0437\u043D\u0443\u0442\u044C",
    "\u0445\u043E\u0447\u0443 \u043F\u0440\u043E\u043F\u0430\u0441\u0442\u044C"
  ],
  // Suicidal ideation - English
  en_suicidal: [
    "suicide",
    "kill myself",
    "end my life",
    "end it all",
    "want to die",
    "wanna die",
    "wish i was dead",
    "wish i were dead",
    "don't want to live",
    "do not want to live",
    "tired of living",
    "better off dead",
    "better if i was gone",
    "world without me",
    "hang myself",
    "slit my wrists",
    "overdose",
    "jump off",
    "no reason to live",
    "life is meaningless",
    "pointless to live",
    "everyone would be better",
    "nobody needs me",
    "no one cares",
    "disappear forever",
    "cease to exist"
  ],
  // Self-harm - Russian
  ru_selfharm: [
    "\u043F\u043E\u0440\u0435\u0437\u0430\u0442\u044C \u0441\u0435\u0431\u044F",
    "\u043F\u043E\u0440\u0435\u0436\u0443 \u0441\u0435\u0431\u044F",
    "\u0440\u0435\u0436\u0443 \u0441\u0435\u0431\u044F",
    "\u0440\u0435\u0436\u0443\u0441\u044C",
    "\u0432\u0440\u0435\u0434 \u0441\u0435\u0431\u0435",
    "\u043D\u0430\u0432\u0440\u0435\u0434\u0438\u0442\u044C \u0441\u0435\u0431\u0435",
    "\u043F\u0440\u0438\u0447\u0438\u043D\u0438\u0442\u044C \u0431\u043E\u043B\u044C \u0441\u0435\u0431\u0435",
    "\u0431\u044C\u044E \u0441\u0435\u0431\u044F",
    "\u0443\u0434\u0430\u0440\u044E \u0441\u0435\u0431\u044F",
    "\u0446\u0430\u0440\u0430\u043F\u0430\u044E \u0441\u0435\u0431\u044F",
    "\u0441\u0435\u043B\u0444\u0445\u0430\u0440\u043C",
    "\u0441\u0430\u043C\u043E\u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0438"
  ],
  // Self-harm - English
  en_selfharm: [
    "cut myself",
    "cutting myself",
    "hurt myself",
    "hurting myself",
    "harm myself",
    "harming myself",
    "self-harm",
    "selfharm",
    "self harm",
    "self-injury",
    "self injury",
    "burn myself",
    "punch myself",
    "hit myself"
  ],
  // Hopelessness indicators - Russian
  ru_hopeless: [
    "\u0431\u0435\u0437\u043D\u0430\u0434\u0451\u0436\u043D\u043E",
    "\u0431\u0435\u0437\u043D\u0430\u0434\u0435\u0436\u043D\u043E",
    "\u043D\u0435\u0442 \u043D\u0430\u0434\u0435\u0436\u0434\u044B",
    "\u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0441\u044F",
    "\u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0441\u0442\u0430\u043D\u0435\u0442 \u043B\u0443\u0447\u0448\u0435",
    "\u0432\u0441\u0435\u0433\u0434\u0430 \u0431\u0443\u0434\u0435\u0442 \u043F\u043B\u043E\u0445\u043E",
    "\u0432\u044B\u0445\u043E\u0434\u0430 \u043D\u0435\u0442",
    "\u043D\u0435\u0442 \u0432\u044B\u0445\u043E\u0434\u0430",
    "\u0442\u0443\u043F\u0438\u043A",
    "\u0432 \u043B\u043E\u0432\u0443\u0448\u043A\u0435",
    "\u0437\u0430\u0441\u0442\u0440\u044F\u043B \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430",
    "\u0431\u0435\u0441\u0441\u043C\u044B\u0441\u043B\u0435\u043D\u043D\u043E \u0432\u0441\u0451",
    "\u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u043E\u043C\u043E\u0436\u0435\u0442"
  ],
  // Hopelessness indicators - English
  en_hopeless: [
    "hopeless",
    "no hope",
    "nothing will change",
    "nothing will ever change",
    "never get better",
    "always be like this",
    "no way out",
    "trapped forever",
    "stuck forever",
    "pointless",
    "nothing helps",
    "can't go on"
  ]
};
var CONTEXT_PATTERNS = {
  // Planning language
  planning: [
    /план.*(?:убить|умереть|покончить|суицид)/i,
    /готов(?:а|лю)?.*(?:умереть|уйти|покончить)/i,
    /решил(?:а)?.*(?:убить|покончить|уйти)/i,
    /plan.*(?:kill|die|end|suicide)/i,
    /ready to.*(?:die|end|go)/i,
    /decided to.*(?:kill|end|die)/i,
    /going to.*(?:kill myself|end it)/i
  ],
  // Farewell language
  farewell: [
    /прощ(?:ай|айте).*(?:всем?|навсегда)/i,
    /последн(?:ий|яя|ее).*(?:раз|сообщение|письмо)/i,
    /goodbye.*(?:forever|everyone|all)/i,
    /this is.*(?:goodbye|the end|my last)/i,
    /final.*(?:message|goodbye|words)/i
  ],
  // Giving away possessions
  giving_away: [
    /отда(?:м|ю).*(?:вещи|всё|деньги)/i,
    /раздам.*(?:вещи|всё)/i,
    /giving away.*(?:stuff|things|everything)/i,
    /want you to have/i
  ],
  // Time pressure
  urgency: [
    /сегодня.*(?:ночью?|вечером|конец)/i,
    /(?:это|вот).*конец/i,
    /tonight.*(?:end|over|die)/i,
    /this is.*(?:it|the end)/i,
    /won'?t.*(?:see|be here).*(?:tomorrow|morning)/i
  ],
  // Absolute negative statements
  absolutes: [
    /никогда.*(?:не буд|не стан|не измен)/i,
    /всегда.*(?:плохо|одинок|страда)/i,
    /никто.*(?:не поможет|не понима|не люб)/i,
    /never.*(?:get better|change|be happy)/i,
    /always.*(?:alone|suffering|miserable)/i,
    /nobody.*(?:cares|understands|loves)/i,
    /everyone.*(?:hates|against|better without)/i
  ]
};
var PROTECTIVE_FACTORS = [
  // Russian - more specific patterns to avoid false positives
  /но\s+(?:хочу|буду|попробу|есть надежда)/i,
  /не\s+(?:хочу умирать|собираюсь|буду этого делать)/i,
  /помог(?:и|ите)/i,
  /нужна помощь/i,
  /хочу\s+жить/i,
  // must be "хочу жить" directly, not separated
  /хочу\s+(?:измени|помощ)/i,
  // English - more specific patterns
  /but\s+(?:i\s+)?(?:want to|will|trying|there's hope)/i,
  /(?:i\s+)?don'?t\s+(?:want to die|going to|actually)/i,
  /help me/i,
  /need help/i,
  /want to\s+(?:live|change|get help)/i
];
var DEFAULT_CRISIS_CONFIG = {
  enableLayer1: true,
  enableLayer2: true,
  enableLayer3: true,
  sensitivityLevel: "high",
  language: "auto"
};
var CrisisDetector = class {
  constructor(config = {}) {
    __publicField(this, "config");
    this.config = { ...DEFAULT_CRISIS_CONFIG, ...config };
  }
  /**
   * Main detection method - analyzes text for crisis indicators
   * This should be called BEFORE any cognitive analysis
   */
  detect(rawText, stateRiskData) {
    const startTime = Date.now();
    const normalizedText = this.normalizeText(rawText);
    const detectedLanguage = this.detectLanguage(normalizedText);
    const layer1 = this.config.enableLayer1 ? this.runLayer1RawTextScan(normalizedText, detectedLanguage) : this.emptyLayerResult();
    const layer2 = this.config.enableLayer2 ? this.runLayer2PatternAnalysis(normalizedText) : this.emptyLayerResult();
    const layer3 = this.config.enableLayer3 && stateRiskData ? this.runLayer3StateAnalysis(stateRiskData) : this.emptyLayerResult();
    const hasProtectiveFactors = this.checkProtectiveFactors(normalizedText);
    const result = this.aggregateResults(layer1, layer2, layer3, hasProtectiveFactors);
    return {
      ...result,
      layer1RawText: layer1,
      layer2Pattern: layer2,
      layer3State: layer3,
      detectedAt: /* @__PURE__ */ new Date(),
      processingTimeMs: Date.now() - startTime
    };
  }
  /**
   * Quick check - returns true if ANY crisis indicator found
   * Use for immediate bypass decisions
   */
  quickCheck(rawText) {
    const normalizedText = this.normalizeText(rawText);
    const language = this.detectLanguage(normalizedText);
    const keywords = language === "ru" ? [...CRITICAL_KEYWORDS.ru_suicidal, ...CRITICAL_KEYWORDS.ru_selfharm] : language === "en" ? [...CRITICAL_KEYWORDS.en_suicidal, ...CRITICAL_KEYWORDS.en_selfharm] : [
      ...CRITICAL_KEYWORDS.ru_suicidal,
      ...CRITICAL_KEYWORDS.ru_selfharm,
      ...CRITICAL_KEYWORDS.en_suicidal,
      ...CRITICAL_KEYWORDS.en_selfharm
    ];
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  // ==========================================================================
  // LAYER 1: Raw Text Keyword Scanning
  // ==========================================================================
  runLayer1RawTextScan(text, language) {
    const indicators = [];
    const matchedPatterns = [];
    const keywordSets = this.getKeywordSets(language);
    for (const [category, keywords] of Object.entries(keywordSets)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          indicators.push(`keyword_${category}`);
          matchedPatterns.push(keyword);
        }
      }
    }
    const confidence = this.calculateLayer1Confidence(indicators);
    return {
      triggered: indicators.length > 0,
      confidence,
      indicators: [...new Set(indicators)],
      matchedPatterns: [...new Set(matchedPatterns)]
    };
  }
  getKeywordSets(language) {
    if (language === "ru") {
      return {
        suicidal: CRITICAL_KEYWORDS.ru_suicidal,
        selfharm: CRITICAL_KEYWORDS.ru_selfharm,
        hopeless: CRITICAL_KEYWORDS.ru_hopeless
      };
    } else if (language === "en") {
      return {
        suicidal: CRITICAL_KEYWORDS.en_suicidal,
        selfharm: CRITICAL_KEYWORDS.en_selfharm,
        hopeless: CRITICAL_KEYWORDS.en_hopeless
      };
    } else {
      return {
        suicidal: [...CRITICAL_KEYWORDS.ru_suicidal, ...CRITICAL_KEYWORDS.en_suicidal],
        selfharm: [...CRITICAL_KEYWORDS.ru_selfharm, ...CRITICAL_KEYWORDS.en_selfharm],
        hopeless: [...CRITICAL_KEYWORDS.ru_hopeless, ...CRITICAL_KEYWORDS.en_hopeless]
      };
    }
  }
  calculateLayer1Confidence(indicators) {
    if (indicators.length === 0) return 0;
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes("suicidal")) score += 0.4;
      else if (indicator.includes("selfharm")) score += 0.3;
      else if (indicator.includes("hopeless")) score += 0.2;
      else score += 0.1;
    }
    return Math.min(1, score);
  }
  // ==========================================================================
  // LAYER 2: Pattern & Context Analysis
  // ==========================================================================
  runLayer2PatternAnalysis(text) {
    const indicators = [];
    const matchedPatterns = [];
    for (const [category, patterns] of Object.entries(CONTEXT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          indicators.push(`pattern_${category}`);
          const match = text.match(pattern);
          if (match) {
            matchedPatterns.push(match[0]);
          }
        }
      }
    }
    const confidence = this.calculateLayer2Confidence(indicators);
    return {
      triggered: indicators.length > 0,
      confidence,
      indicators: [...new Set(indicators)],
      matchedPatterns
    };
  }
  calculateLayer2Confidence(indicators) {
    if (indicators.length === 0) return 0;
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes("planning")) score += 0.5;
      else if (indicator.includes("farewell")) score += 0.4;
      else if (indicator.includes("giving_away")) score += 0.3;
      else if (indicator.includes("urgency")) score += 0.4;
      else if (indicator.includes("absolutes")) score += 0.2;
      else score += 0.1;
    }
    return Math.min(1, score);
  }
  // ==========================================================================
  // LAYER 3: State-Based Risk Analysis
  // ==========================================================================
  runLayer3StateAnalysis(stateRisk) {
    const indicators = [];
    const matchedPatterns = [];
    if (stateRisk.overallRiskLevel >= 0.7) {
      indicators.push("state_high_overall_risk");
      matchedPatterns.push(`risk_level=${stateRisk.overallRiskLevel.toFixed(2)}`);
    }
    if (stateRisk.suicidalIdeation > 0.5) {
      indicators.push("state_suicidal_ideation");
      matchedPatterns.push(`suicidal_ideation=${stateRisk.suicidalIdeation.toFixed(2)}`);
    }
    if (stateRisk.selfHarmRisk > 0.5) {
      indicators.push("state_self_harm_risk");
      matchedPatterns.push(`self_harm_risk=${stateRisk.selfHarmRisk.toFixed(2)}`);
    }
    if (stateRisk.emotionalValence < -0.7) {
      indicators.push("state_severe_negative_affect");
      matchedPatterns.push(`valence=${stateRisk.emotionalValence.toFixed(2)}`);
    }
    if (stateRisk.recentTrend === "declining") {
      indicators.push("state_declining_trend");
      matchedPatterns.push("trend=declining");
    }
    const confidence = this.calculateLayer3Confidence(stateRisk, indicators);
    return {
      triggered: indicators.length > 0,
      confidence,
      indicators,
      matchedPatterns
    };
  }
  calculateLayer3Confidence(stateRisk, indicators) {
    if (indicators.length === 0) return 0;
    const riskScore = stateRisk.overallRiskLevel * 0.3 + stateRisk.suicidalIdeation * 0.4 + stateRisk.selfHarmRisk * 0.3;
    return Math.min(1, riskScore);
  }
  // ==========================================================================
  // PROTECTIVE FACTORS
  // ==========================================================================
  checkProtectiveFactors(text) {
    for (const pattern of PROTECTIVE_FACTORS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }
  // ==========================================================================
  // RESULT AGGREGATION
  // ==========================================================================
  aggregateResults(layer1, layer2, layer3, hasProtectiveFactors) {
    const allIndicators = [
      ...layer1.indicators,
      ...layer2.indicators,
      ...layer3.indicators
    ];
    const anyTriggered = layer1.triggered || layer2.triggered || layer3.triggered;
    const combinedConfidence = this.calculateCombinedConfidence(layer1, layer2, layer3, hasProtectiveFactors);
    const severity = this.determineSeverity(layer1, layer2, layer3, combinedConfidence, hasProtectiveFactors);
    const crisisType = this.determineCrisisType(allIndicators);
    const { recommendedAction, urgency } = this.determineResponse(severity, crisisType);
    const primaryIndicator = this.findPrimaryIndicator(layer1, layer2, layer3);
    return {
      isCrisis: anyTriggered && severity !== "none" && severity !== "low",
      severity,
      crisisType,
      confidence: combinedConfidence,
      allIndicators,
      primaryIndicator,
      recommendedAction,
      urgency
    };
  }
  calculateCombinedConfidence(layer1, layer2, layer3, hasProtectiveFactors) {
    const base = layer1.confidence * 0.5 + layer2.confidence * 0.3 + layer3.confidence * 0.2;
    const adjusted = hasProtectiveFactors ? base * 0.85 : base;
    return Math.min(1, adjusted);
  }
  determineSeverity(layer1, layer2, layer3, confidence, hasProtectiveFactors) {
    if (layer1.indicators.includes("keyword_suicidal") && layer2.indicators.includes("pattern_planning")) {
      return "critical";
    }
    if (confidence > 0.8 && layer1.triggered && layer2.triggered) {
      return hasProtectiveFactors ? "high" : "critical";
    }
    if (layer1.indicators.includes("keyword_suicidal")) {
      return hasProtectiveFactors ? "moderate" : "high";
    }
    if (layer2.indicators.includes("pattern_farewell") || layer2.indicators.includes("pattern_urgency")) {
      return "high";
    }
    if (layer1.indicators.includes("keyword_selfharm")) {
      return hasProtectiveFactors ? "low" : "moderate";
    }
    if (layer3.indicators.includes("state_suicidal_ideation") || layer3.indicators.includes("state_high_overall_risk")) {
      return "moderate";
    }
    if (layer1.indicators.includes("keyword_hopeless") && !layer1.indicators.includes("keyword_suicidal")) {
      return "low";
    }
    if (layer2.triggered && layer2.indicators.length === 1 && layer2.indicators[0] === "pattern_absolutes") {
      return "low";
    }
    if (!layer1.triggered && !layer2.triggered && !layer3.triggered) {
      return "none";
    }
    return "low";
  }
  determineCrisisType(indicators) {
    const hasSuicidalKeyword = indicators.some((i) => i.includes("suicidal"));
    const hasPlanning = indicators.some((i) => i.includes("planning"));
    if (hasSuicidalKeyword && hasPlanning) {
      return "suicidal_intent";
    }
    if (hasSuicidalKeyword) {
      return "suicidal_ideation";
    }
    if (indicators.some((i) => i.includes("selfharm") || i.includes("self_harm"))) {
      return "self_harm";
    }
    if (indicators.some((i) => i.includes("hopeless") || i.includes("absolutes"))) {
      return "acute_distress";
    }
    if (indicators.some((i) => i.includes("urgency"))) {
      return "panic_attack";
    }
    return "unknown";
  }
  determineResponse(severity, _crisisType) {
    switch (severity) {
      case "critical":
        return { recommendedAction: "emergency_escalation", urgency: "immediate" };
      case "high":
        return { recommendedAction: "crisis_protocol", urgency: "urgent" };
      case "moderate":
        return { recommendedAction: "supportive_response", urgency: "soon" };
      case "low":
        return { recommendedAction: "monitor", urgency: "routine" };
      case "none":
      default:
        return { recommendedAction: "none", urgency: "routine" };
    }
  }
  findPrimaryIndicator(layer1, layer2, layer3) {
    const allIndicators = [...layer1.indicators, ...layer2.indicators, ...layer3.indicators];
    if (allIndicators.some((i) => i.includes("suicidal"))) {
      return allIndicators.find((i) => i.includes("suicidal")) || null;
    }
    if (allIndicators.some((i) => i.includes("planning"))) {
      return allIndicators.find((i) => i.includes("planning")) || null;
    }
    if (allIndicators.some((i) => i.includes("selfharm") || i.includes("self_harm"))) {
      return allIndicators.find((i) => i.includes("selfharm") || i.includes("self_harm")) || null;
    }
    return allIndicators[0] || null;
  }
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  normalizeText(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }
  detectLanguage(text) {
    if (this.config.language !== "auto") {
      return this.config.language === "ru" ? "ru" : "en";
    }
    const cyrillicPattern = /[а-яё]/i;
    const latinPattern = /[a-z]/i;
    const hasCyrillic = cyrillicPattern.test(text);
    const hasLatin = latinPattern.test(text);
    if (hasCyrillic && hasLatin) return "both";
    if (hasCyrillic) return "ru";
    return "en";
  }
  emptyLayerResult() {
    return {
      triggered: false,
      confidence: 0,
      indicators: [],
      matchedPatterns: []
    };
  }
  /**
   * Get crisis resources for user
   */
  getCrisisResources(language = "ru") {
    if (language === "ru") {
      return [
        "\u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0434\u043E\u0432\u0435\u0440\u0438\u044F: 8-800-2000-122 (\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E)",
        "\u0426\u0435\u043D\u0442\u0440 \u044D\u043A\u0441\u0442\u0440\u0435\u043D\u043D\u043E\u0439 \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043F\u043E\u043C\u043E\u0449\u0438 \u041C\u0427\u0421: 8-499-216-50-50",
        "\u0414\u0435\u0442\u0441\u043A\u0438\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0434\u043E\u0432\u0435\u0440\u0438\u044F: 8-800-2000-122",
        "\u041F\u043E\u043C\u043E\u0449\u044C \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u043C: 051 (\u0441 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E 8-495-051)"
      ];
    }
    return [
      "National Suicide Prevention Lifeline: 988",
      "Crisis Text Line: Text HOME to 741741",
      "International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/"
    ];
  }
};
function createCrisisDetector(config) {
  return new CrisisDetector(config);
}
var defaultCrisisDetector = createCrisisDetector();

// src/index.ts
var COGNICORE_VERSION = {
  version: "2.0.0-alpha.1",
  name: "@cognicore/engine",
  description: "POMDP-based Cognitive State Engine for Digital Therapeutics with Nonlinear Dynamics",
  buildDate: "2025-12-28",
  phase: "Phase 1 - Nonlinear Core",
  features: [
    "PLRNN for nonlinear psychological dynamics",
    "KalmanFormer hybrid architecture",
    "Voice biomarker analysis",
    "Multimodal fusion (text + voice)",
    "Early warning signal detection"
  ]
};

exports.BeliefStateAdapter = BeliefStateAdapter;
exports.COGNICORE_VERSION = COGNICORE_VERSION;
exports.CrisisDetector = CrisisDetector;
exports.DEFAULT_CRISIS_CONFIG = DEFAULT_CRISIS_CONFIG;
exports.DEFAULT_EMOTION_VAD = DEFAULT_EMOTION_VAD;
exports.DEFAULT_KALMANFORMER_CONFIG = DEFAULT_KALMANFORMER_CONFIG;
exports.DEFAULT_PLRNN_CONFIG = DEFAULT_PLRNN_CONFIG;
exports.DEFAULT_VOICE_CONFIG = DEFAULT_VOICE_CONFIG;
exports.DIMENSION_INDEX = DIMENSION_INDEX;
exports.DIMENSION_MAPPING = DIMENSION_MAPPING;
exports.DISTORTION_INTERVENTIONS = DISTORTION_INTERVENTIONS;
exports.DISTORTION_PATTERNS = DISTORTION_PATTERNS;
exports.EMOTION_THERAPY_MAPPING = EMOTION_THERAPY_MAPPING;
exports.INDEX_THRESHOLDS = INDEX_THRESHOLDS;
exports.KalmanFormerEngine = KalmanFormerEngine;
exports.PLRNNEngine = PLRNNEngine;
exports.VoiceInputAdapter = VoiceInputAdapter;
exports.WELLBEING_WEIGHTS = WELLBEING_WEIGHTS;
exports.beliefStateToKalmanFormerState = beliefStateToKalmanFormerState;
exports.beliefStateToObservation = beliefStateToObservation;
exports.beliefStateToPLRNNState = beliefStateToPLRNNState;
exports.beliefStateToUncertainty = beliefStateToUncertainty;
exports.createBeliefStateAdapter = createBeliefStateAdapter;
exports.createCrisisDetector = createCrisisDetector;
exports.createKalmanFormerEngine = createKalmanFormerEngine;
exports.createPLRNNEngine = createPLRNNEngine;
exports.createVoiceInputAdapter = createVoiceInputAdapter;
exports.defaultCrisisDetector = defaultCrisisDetector;
exports.getComponentStatus = getComponentStatus;
exports.kalmanFormerStateToBeliefUpdate = kalmanFormerStateToBeliefUpdate;
exports.mergeHybridPredictions = mergeHybridPredictions;
exports.plrnnStateToBeliefUpdate = plrnnStateToBeliefUpdate;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map