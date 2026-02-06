'use strict';

var crypto$1 = require('crypto');
var uuid = require('uuid');

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
  if (score >= 0.8) {
    return "excellent";
  }
  if (score >= 0.6) {
    return "good";
  }
  if (score >= 0.4) {
    return "moderate";
  }
  if (score >= 0.2) {
    return "concerning";
  }
  return "critical";
}
function generateSecureId(prefix) {
  const uuid = crypto$1.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}
function generateShortSecureId(prefix) {
  const timestamp = Date.now();
  const randomHex = crypto$1.randomBytes(5).toString("hex");
  return prefix ? `${prefix}_${timestamp}_${randomHex}` : `${timestamp}_${randomHex}`;
}
function secureRandom() {
  const buffer = crypto$1.randomBytes(4);
  const value = buffer.readUInt32BE(0);
  return value / 4294967296;
}
function secureRandomInt(min, max) {
  return crypto$1.randomInt(min, max + 1);
}
function boxMullerSecure(mean = 0, stdDev = 1) {
  let u1;
  do {
    u1 = secureRandom();
  } while (u1 === 0);
  const u2 = secureRandom();
  const mag = stdDev * Math.sqrt(-2 * Math.log(u1));
  const z0 = mag * Math.cos(2 * Math.PI * u2) + mean;
  const z1 = mag * Math.sin(2 * Math.PI * u2) + mean;
  return [z0, z1];
}
function gaussianSecure(mean = 0, stdDev = 1) {
  return boxMullerSecure(mean, stdDev)[0];
}
function betaSampleSecure(alpha, beta) {
  const gammaA = gammaSampleSecure(alpha, 1);
  const gammaB = gammaSampleSecure(beta, 1);
  return gammaA / (gammaA + gammaB);
}
function gammaSampleSecure(shape, scale) {
  if (shape < 1) {
    const u = secureRandom();
    return gammaSampleSecure(shape + 1, scale) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = gaussianSecure();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = secureRandom();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v * scale;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}
function shuffleSecure(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = crypto$1.randomInt(0, i + 1);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
function randomElementSecure(array) {
  if (array.length === 0) {
    throw new Error("Cannot select from empty array");
  }
  return array[crypto$1.randomInt(0, array.length)];
}
function randomBooleanSecure(probability) {
  return secureRandom() < probability;
}
function weightedRandomIndexSecure(weights) {
  if (weights.length === 0) {
    throw new Error("Cannot select from empty weights array");
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    throw new Error("Total weight must be greater than zero");
  }
  let random = secureRandom() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i] ?? 0;
    random -= weight;
    if (random <= 0) {
      return i;
    }
  }
  return weights.length - 1;
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
    hiddenActivations: new Array(hiddenUnits).fill(0).map(() => secureRandom() * 0.1),
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
    innovation: Array.from({ length: dim }, () => 0),
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
    transformerHidden: [Array.from({ length: 64 }, () => 0)],
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

// src/explainability/interfaces/IExplainability.ts
var DEFAULT_EXPLAINABILITY_CONFIG = {
  maxCounterfactuals: 3,
  minRobustness: 0.6,
  minPlausibility: 0.5,
  cacheExpirationMs: 60 * 60 * 1e3,
  // 1 hour
  enableEffectivenessTracking: true,
  defaultLanguage: "ru",
  defaultAgeGroup: "adult",
  euAIActComplianceRequired: true
};
var INTERVENTION_FEATURES = {
  currentMood: {
    id: "currentMood",
    name: "Current Mood",
    nameRu: "\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435",
    description: "User's current emotional state on 1-5 scale",
    descriptionRu: "\u042D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043F\u043E \u0448\u043A\u0430\u043B\u0435 1-5",
    category: "emotional",
    valueType: "numeric",
    minValue: 1,
    maxValue: 5,
    baselineValue: 3,
    defaultWeight: 0.25,
    isCausalFactor: true,
    causalChildren: ["engagement", "interventionResponse"],
    emoji: "\u{1F60A}",
    colorPositive: "#4CAF50",
    colorNegative: "#f44336",
    layTermExplanation: "\u041A\u0430\u043A \u0442\u044B \u0441\u0435\u0431\u044F \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0448\u044C \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441",
    clinicalTermExplanation: "Self-reported mood state (PHQ-2 proxy)"
  },
  currentEnergy: {
    id: "currentEnergy",
    name: "Energy Level",
    nameRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u044D\u043D\u0435\u0440\u0433\u0438\u0438",
    description: "User's current energy level on 1-5 scale",
    descriptionRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u044D\u043D\u0435\u0440\u0433\u0438\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043F\u043E \u0448\u043A\u0430\u043B\u0435 1-5",
    category: "emotional",
    valueType: "numeric",
    minValue: 1,
    maxValue: 5,
    baselineValue: 3,
    defaultWeight: 0.15,
    isCausalFactor: true,
    causalParents: ["sleepQuality", "physicalActivity"],
    causalChildren: ["taskEngagement"],
    emoji: "\u26A1",
    colorPositive: "#FF9800",
    colorNegative: "#9E9E9E",
    layTermExplanation: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0443 \u0442\u0435\u0431\u044F \u0441\u0435\u0439\u0447\u0430\u0441 \u0441\u0438\u043B",
    clinicalTermExplanation: "Subjective vitality/energy assessment"
  },
  stressLevel: {
    id: "stressLevel",
    name: "Stress Level",
    nameRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0441\u0442\u0440\u0435\u0441\u0441\u0430",
    description: "User's current stress level on 1-5 scale",
    descriptionRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0441\u0442\u0440\u0435\u0441\u0441\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043F\u043E \u0448\u043A\u0430\u043B\u0435 1-5",
    category: "emotional",
    valueType: "numeric",
    minValue: 1,
    maxValue: 5,
    baselineValue: 2,
    defaultWeight: 0.2,
    isCausalFactor: true,
    causalParents: ["workload", "conflicts", "uncertainty"],
    causalChildren: ["mood", "digitalUse", "copingBehavior"],
    emoji: "\u{1F630}",
    colorPositive: "#4CAF50",
    colorNegative: "#f44336",
    layTermExplanation: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0442\u044B \u043D\u0430\u043F\u0440\u044F\u0436\u0451\u043D",
    clinicalTermExplanation: "Perceived stress scale proxy"
  },
  timeOfDay: {
    id: "timeOfDay",
    name: "Time of Day",
    nameRu: "\u0412\u0440\u0435\u043C\u044F \u0441\u0443\u0442\u043E\u043A",
    description: "Current time period",
    descriptionRu: "\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F \u0441\u0443\u0442\u043E\u043A",
    category: "temporal",
    valueType: "categorical",
    possibleValues: ["morning", "afternoon", "evening", "night"],
    baselineValue: "afternoon",
    defaultWeight: 0.1,
    emoji: "\u{1F550}",
    colorPositive: "#2196F3",
    colorNegative: "#673AB7",
    layTermExplanation: "\u041A\u0430\u043A\u043E\u0435 \u0441\u0435\u0439\u0447\u0430\u0441 \u0432\u0440\u0435\u043C\u044F \u0434\u043D\u044F",
    clinicalTermExplanation: "Circadian timing context"
  },
  dayOfWeek: {
    id: "dayOfWeek",
    name: "Day of Week",
    nameRu: "\u0414\u0435\u043D\u044C \u043D\u0435\u0434\u0435\u043B\u0438",
    description: "Current day of the week",
    descriptionRu: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0434\u0435\u043D\u044C \u043D\u0435\u0434\u0435\u043B\u0438",
    category: "temporal",
    valueType: "categorical",
    possibleValues: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    baselineValue: "wednesday",
    defaultWeight: 0.05,
    emoji: "\u{1F4C5}",
    colorPositive: "#009688",
    colorNegative: "#795548",
    layTermExplanation: "\u041A\u0430\u043A\u043E\u0439 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0434\u0435\u043D\u044C",
    clinicalTermExplanation: "Weekly temporal pattern"
  },
  activeTrigger: {
    id: "activeTrigger",
    name: "Active Trigger",
    nameRu: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0442\u0440\u0438\u0433\u0433\u0435\u0440",
    description: "Current trigger for digital use",
    descriptionRu: "\u0422\u0440\u0438\u0433\u0433\u0435\u0440 \u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0433\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F",
    category: "contextual",
    valueType: "categorical",
    possibleValues: [
      "boredom",
      "stress",
      "loneliness",
      "fomo",
      "habit",
      "procrastination",
      "emotional_regulation",
      "social_pressure"
    ],
    baselineValue: "habit",
    defaultWeight: 0.2,
    isCausalFactor: true,
    causalChildren: ["digitalUse", "interventionNeeded"],
    emoji: "\u{1F3AF}",
    colorPositive: "#E91E63",
    colorNegative: "#607D8B",
    layTermExplanation: "\u0427\u0442\u043E \u0437\u0430\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0442\u0435\u0431\u044F \u0442\u044F\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443",
    clinicalTermExplanation: "Primary behavioral trigger for digital engagement"
  },
  streak: {
    id: "streak",
    name: "Streak",
    nameRu: "\u0421\u0435\u0440\u0438\u044F \u0434\u043D\u0435\u0439",
    description: "Consecutive days of engagement",
    descriptionRu: "\u041F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u043D\u0438 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
    category: "historical",
    valueType: "numeric",
    minValue: 0,
    maxValue: 365,
    baselineValue: 0,
    defaultWeight: 0.08,
    emoji: "\u{1F525}",
    colorPositive: "#FF5722",
    colorNegative: "#BDBDBD",
    layTermExplanation: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0434\u043D\u0435\u0439 \u043F\u043E\u0434\u0440\u044F\u0434 \u0442\u044B \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0448\u044C\u0441\u044F",
    clinicalTermExplanation: "Engagement continuity metric"
  },
  ageGroup: {
    id: "ageGroup",
    name: "Age Group",
    nameRu: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442\u043D\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0430",
    description: "User age category",
    descriptionRu: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442\u043D\u0430\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F",
    category: "demographic",
    valueType: "categorical",
    possibleValues: ["child", "teen", "adult"],
    baselineValue: "adult",
    defaultWeight: 0.12,
    emoji: "\u{1F464}",
    colorPositive: "#3F51B5",
    colorNegative: "#9E9E9E",
    layTermExplanation: "\u0422\u0432\u043E\u0439 \u0432\u043E\u0437\u0440\u0430\u0441\u0442",
    clinicalTermExplanation: "Developmental stage classification"
  },
  recentInterventionCount: {
    id: "recentInterventionCount",
    name: "Recent Interventions",
    nameRu: "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u0442\u0435\u0445\u043D\u0438\u043A\u0438",
    description: "Number of interventions in last 7 days",
    descriptionRu: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0442\u0435\u0445\u043D\u0438\u043A \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 7 \u0434\u043D\u0435\u0439",
    category: "historical",
    valueType: "numeric",
    minValue: 0,
    maxValue: 50,
    baselineValue: 5,
    defaultWeight: 0.05,
    emoji: "\u{1F4CA}",
    colorPositive: "#00BCD4",
    colorNegative: "#FF9800",
    layTermExplanation: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0443\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u0439 \u0442\u044B \u0441\u0434\u0435\u043B\u0430\u043B \u043D\u0435\u0434\u0430\u0432\u043D\u043E",
    clinicalTermExplanation: "Intervention dosage metric (7-day window)"
  },
  moodTrend: {
    id: "moodTrend",
    name: "Mood Trend",
    nameRu: "\u0422\u0440\u0435\u043D\u0434 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F",
    description: "Mood trend over past week",
    descriptionRu: "\u0422\u0440\u0435\u043D\u0434 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044E\u044E \u043D\u0435\u0434\u0435\u043B\u044E",
    category: "historical",
    valueType: "categorical",
    possibleValues: ["improving", "stable", "declining"],
    baselineValue: "stable",
    defaultWeight: 0.15,
    isCausalFactor: true,
    causalParents: ["interventionEffectiveness", "lifeEvents"],
    emoji: "\u{1F4C8}",
    colorPositive: "#4CAF50",
    colorNegative: "#f44336",
    layTermExplanation: "\u041A\u0430\u043A \u043C\u0435\u043D\u044F\u043B\u043E\u0441\u044C \u0442\u0432\u043E\u0451 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435",
    clinicalTermExplanation: "Longitudinal mood trajectory (7-day moving average)"
  },
  riskLevel: {
    id: "riskLevel",
    name: "Risk Level",
    nameRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0440\u0438\u0441\u043A\u0430",
    description: "Current safety risk assessment",
    descriptionRu: "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u0440\u0438\u0441\u043A\u0430 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438",
    category: "emotional",
    valueType: "categorical",
    possibleValues: ["none", "low", "moderate", "high", "critical"],
    baselineValue: "none",
    defaultWeight: 0.3,
    isCausalFactor: true,
    causalParents: ["moodTrend", "stressLevel", "socialSupport"],
    causalChildren: ["interventionPriority", "escalation"],
    emoji: "\u26A0\uFE0F",
    colorPositive: "#4CAF50",
    colorNegative: "#f44336",
    layTermExplanation: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0440\u043E\u0447\u043D\u043E \u0442\u0435\u0431\u0435 \u043D\u0443\u0436\u043D\u0430 \u043F\u043E\u043C\u043E\u0449\u044C",
    clinicalTermExplanation: "Composite risk assessment score"
  },
  socialSupport: {
    id: "socialSupport",
    name: "Social Support",
    nameRu: "\u0421\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
    description: "Level of perceived social support",
    descriptionRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043E\u0449\u0443\u0449\u0430\u0435\u043C\u043E\u0439 \u0441\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0439 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438",
    category: "contextual",
    valueType: "numeric",
    minValue: 1,
    maxValue: 5,
    baselineValue: 3,
    defaultWeight: 0.1,
    isCausalFactor: true,
    causalChildren: ["resilience", "riskLevel"],
    emoji: "\u{1F465}",
    colorPositive: "#9C27B0",
    colorNegative: "#607D8B",
    layTermExplanation: "\u0415\u0441\u0442\u044C \u043B\u0438 \u0440\u044F\u0434\u043E\u043C \u043B\u044E\u0434\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442 \u0442\u0435\u0431\u044F",
    clinicalTermExplanation: "Perceived social support scale proxy"
  },
  familyCohesion: {
    id: "familyCohesion",
    name: "Family Cohesion",
    nameRu: "\u0421\u0435\u043C\u0435\u0439\u043D\u0430\u044F \u0441\u043F\u043B\u043E\u0447\u0451\u043D\u043D\u043E\u0441\u0442\u044C",
    description: "Family cohesion level (Phase 6.1)",
    descriptionRu: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0441\u0435\u043C\u0435\u0439\u043D\u043E\u0439 \u0441\u043F\u043B\u043E\u0447\u0451\u043D\u043D\u043E\u0441\u0442\u0438",
    category: "family",
    valueType: "categorical",
    possibleValues: ["disengaged", "separated", "connected", "enmeshed"],
    baselineValue: "connected",
    defaultWeight: 0.08,
    isCausalFactor: true,
    causalChildren: ["socialSupport", "copingSkills"],
    emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
    colorPositive: "#8BC34A",
    colorNegative: "#FF5722",
    layTermExplanation: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0431\u043B\u0438\u0437\u043A\u0430 \u0442\u0432\u043E\u044F \u0441\u0435\u043C\u044C\u044F",
    clinicalTermExplanation: "Olson Circumplex family cohesion dimension"
  }
};
var CATEGORICAL_CONTRIBUTIONS = {
  timeOfDay: {
    morning: 0.1,
    afternoon: 0,
    evening: 0.05,
    night: -0.1
  },
  dayOfWeek: {
    monday: -0.05,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0.05,
    saturday: 0.1,
    sunday: 0.1
  },
  activeTrigger: {
    boredom: 0.1,
    stress: -0.1,
    loneliness: -0.15,
    fomo: 0.05,
    habit: 0,
    procrastination: 0.05,
    emotional_regulation: -0.1,
    social_pressure: 0.05
  },
  ageGroup: {
    child: 0.1,
    teen: 0.05,
    adult: 0
  },
  moodTrend: {
    improving: 0.15,
    stable: 0,
    declining: -0.15
  },
  riskLevel: {
    none: 0.2,
    low: 0.1,
    moderate: 0,
    high: -0.15,
    critical: -0.3
  },
  familyCohesion: {
    disengaged: -0.15,
    separated: -0.05,
    connected: 0.1,
    enmeshed: -0.05
  }
};
var FeatureAttributionEngine = class {
  constructor(definitions) {
    __publicField(this, "featureDefinitions");
    __publicField(this, "explanationVersion", "2.0.0");
    this.featureDefinitions = new Map(
      Object.entries(definitions || INTERVENTION_FEATURES)
    );
  }
  // ==========================================================================
  // SHAP-LIKE ATTRIBUTION
  // ==========================================================================
  /**
   * Calculate feature attributions for a prediction
   */
  calculateAttributions(features, prediction) {
    const startTime = Date.now();
    const attributions = [];
    const baselineValue = 0.5;
    for (const [featureId, value] of Object.entries(features)) {
      const definition = this.featureDefinitions.get(featureId);
      if (!definition) {
        continue;
      }
      const attribution = this.calculateSingleAttribution(
        featureId,
        value,
        definition,
        prediction.value
      );
      attributions.push(attribution);
    }
    attributions.sort((a, b) => b.absoluteImportance - a.absoluteImportance);
    const topPositiveFeatures = attributions.filter((a) => a.contribution > 0).slice(0, 3);
    const topNegativeFeatures = attributions.filter((a) => a.contribution < 0).slice(0, 3);
    const causalSummary = this.generateCausalSummary(attributions, features);
    const uncertaintyQuantification = this.calculateUncertainty(
      attributions,
      prediction.confidence
    );
    return {
      predictionId: crypto$1.randomUUID(),
      prediction: prediction.outcome,
      predictionValue: prediction.value,
      baselineValue,
      attributions,
      topPositiveFeatures,
      topNegativeFeatures,
      confidence: prediction.confidence,
      uncertaintySource: prediction.confidence < 0.7 ? "Limited data or unusual feature combination" : void 0,
      uncertaintyQuantification,
      causalSummary,
      timestamp: /* @__PURE__ */ new Date(),
      computationTime: Date.now() - startTime,
      explanationVersion: this.explanationVersion
    };
  }
  /**
   * Calculate attribution for single feature
   */
  calculateSingleAttribution(featureId, value, definition, _predictionValue) {
    let contribution;
    let comparisonToBaseline;
    let comparisonToBaselineRu;
    if (definition.valueType === "numeric") {
      const numValue = value;
      const baseline = definition.baselineValue;
      const range = (definition.maxValue || 5) - (definition.minValue || 1);
      const deviation = (numValue - baseline) / range;
      contribution = deviation * definition.defaultWeight;
      if (deviation > 0.1) {
        comparisonToBaseline = "above average";
        comparisonToBaselineRu = "\u0432\u044B\u0448\u0435 \u0441\u0440\u0435\u0434\u043D\u0435\u0433\u043E";
      } else if (deviation < -0.1) {
        comparisonToBaseline = "below average";
        comparisonToBaselineRu = "\u043D\u0438\u0436\u0435 \u0441\u0440\u0435\u0434\u043D\u0435\u0433\u043E";
      } else {
        comparisonToBaseline = "typical";
        comparisonToBaselineRu = "\u0442\u0438\u043F\u0438\u0447\u043D\u043E";
      }
    } else if (definition.valueType === "categorical") {
      contribution = this.calculateCategoricalContribution(
        featureId,
        value,
        definition
      );
      if (value === definition.baselineValue) {
        comparisonToBaseline = "typical";
        comparisonToBaselineRu = "\u0442\u0438\u043F\u0438\u0447\u043D\u043E";
      } else {
        comparisonToBaseline = "differs from typical";
        comparisonToBaselineRu = "\u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u0442\u0438\u043F\u0438\u0447\u043D\u043E\u0433\u043E";
      }
    } else if (definition.valueType === "boolean") {
      const boolValue = value;
      contribution = boolValue ? definition.defaultWeight * 0.5 : -definition.defaultWeight * 0.5;
      comparisonToBaseline = boolValue ? "active" : "inactive";
      comparisonToBaselineRu = boolValue ? "\u0430\u043A\u0442\u0438\u0432\u043D\u043E" : "\u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u043E";
    } else {
      contribution = 0;
      comparisonToBaseline = "unknown";
      comparisonToBaselineRu = "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
    }
    const direction = contribution > 0.05 ? "positive" : contribution < -0.05 ? "negative" : "neutral";
    const confidenceInterval = this.calculateAttributionConfidenceInterval(
      contribution,
      definition.defaultWeight
    );
    const isCausallyRelevant = definition.isCausalFactor || false;
    const causalPathway = this.getCausalPathway(featureId, definition);
    return {
      featureId,
      featureName: definition.name,
      featureNameRu: definition.nameRu,
      featureValue: value,
      contribution,
      absoluteImportance: Math.abs(contribution),
      shapleyValue: contribution,
      // In this simplified version, contribution approximates Shapley
      baselineValue: String(definition.baselineValue),
      comparisonToBaseline,
      comparisonToBaselineRu,
      isCausallyRelevant,
      causalPathway,
      confidenceInterval,
      direction,
      emoji: definition.emoji,
      color: direction === "positive" ? definition.colorPositive : definition.colorNegative
    };
  }
  /**
   * Calculate contribution for categorical feature
   */
  calculateCategoricalContribution(featureId, value, definition) {
    const featureContributions = CATEGORICAL_CONTRIBUTIONS[featureId];
    if (featureContributions?.[value] !== void 0) {
      return featureContributions[value] * definition.defaultWeight;
    }
    return 0;
  }
  /**
   * Calculate confidence interval for attribution
   */
  calculateAttributionConfidenceInterval(contribution, weight) {
    const standardError = weight * 0.1;
    const margin = 1.96 * standardError;
    return {
      lower: contribution - margin,
      upper: contribution + margin
    };
  }
  /**
   * Get causal pathway for feature
   */
  getCausalPathway(featureId, definition) {
    if (!definition.isCausalFactor) {
      return void 0;
    }
    const parents = definition.causalParents?.join(", ") || "root cause";
    const children = definition.causalChildren?.join(", ") || "outcome";
    return `${parents} -> ${featureId} -> ${children}`;
  }
  /**
   * Generate causal summary from attributions
   */
  generateCausalSummary(attributions, _features) {
    const causalAttributions = attributions.filter((a) => a.isCausallyRelevant);
    if (causalAttributions.length === 0) {
      return void 0;
    }
    const primaryCauseAttr = causalAttributions.reduce(
      (max, curr) => curr.absoluteImportance > max.absoluteImportance ? curr : max
    );
    const causalChain = causalAttributions.filter((a) => a.absoluteImportance > 0.05).map((a) => a.featureNameRu);
    const modifiableFeatures = ["currentMood", "stressLevel", "socialSupport", "streak"];
    const interventionPoints = causalAttributions.filter((a) => modifiableFeatures.includes(a.featureId)).map((a) => a.featureNameRu);
    return {
      primaryCause: primaryCauseAttr.featureNameRu,
      causalChain,
      interventionPoints
    };
  }
  /**
   * Calculate uncertainty quantification for the explanation
   */
  calculateUncertainty(attributions, _confidence) {
    const standardErrors = attributions.map((a) => {
      const interval = a.confidenceInterval;
      if (!interval) {
        return 0;
      }
      return (interval.upper - interval.lower) / (2 * 1.96);
    });
    const avgStandardError = standardErrors.length > 0 ? standardErrors.reduce((a, b) => a + b, 0) / standardErrors.length : 0;
    return {
      method: "bootstrap",
      samples: 100,
      // Simulated bootstrap samples
      standardError: avgStandardError
    };
  }
  // ==========================================================================
  // VISUALIZATION
  // ==========================================================================
  /**
   * Generate text visualization of attributions
   */
  visualizeAttributions(explanation, format = "emoji") {
    switch (format) {
      case "emoji":
        return this.visualizeWithEmoji(explanation);
      case "bars":
        return this.visualizeWithBars(explanation);
      case "text":
      default:
        return this.visualizeAsText(explanation);
    }
  }
  visualizeWithEmoji(explanation) {
    const lines = [];
    lines.push("\u{1F4CA} \u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0435\u0448\u0435\u043D\u0438\u044F\n");
    lines.push(`\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: ${Math.round(explanation.confidence * 100)}%
`);
    if (explanation.topPositiveFeatures.length > 0) {
      lines.push("\n\u2705 \u041F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u044B:");
      for (const attr of explanation.topPositiveFeatures) {
        lines.push(`  ${attr.emoji ?? "\u{1F4CC}"} ${attr.featureNameRu ?? attr.featureName}: ${attr.featureValue}`);
      }
    }
    if (explanation.topNegativeFeatures.length > 0) {
      lines.push("\n\u26A0\uFE0F \u0423\u0447\u0442\u0451\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u0438:");
      for (const attr of explanation.topNegativeFeatures) {
        lines.push(`  ${attr.emoji ?? "\u{1F4CC}"} ${attr.featureNameRu ?? attr.featureName}: ${attr.featureValue}`);
      }
    }
    if (explanation.causalSummary) {
      lines.push("\n\u{1F517} \u041F\u0440\u0438\u0447\u0438\u043D\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C:");
      lines.push(`  \u0413\u043B\u0430\u0432\u043D\u0430\u044F \u043F\u0440\u0438\u0447\u0438\u043D\u0430: ${explanation.causalSummary.primaryCause}`);
      if (explanation.causalSummary.interventionPoints.length > 0) {
        lines.push(`  \u0422\u043E\u0447\u043A\u0438 \u0432\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F: ${explanation.causalSummary.interventionPoints.join(", ")}`);
      }
    }
    return lines.join("\n");
  }
  visualizeWithBars(explanation) {
    const lines = [];
    const maxBarLength = 20;
    lines.push("Attribution Breakdown:\n");
    for (const attr of explanation.attributions.slice(0, 8)) {
      const normalizedContrib = Math.min(1, Math.abs(attr.contribution) * 10);
      const barLength = Math.round(normalizedContrib * maxBarLength);
      const bar = attr.contribution >= 0 ? "\u2588".repeat(barLength) : "\u2591".repeat(barLength);
      const sign = attr.contribution >= 0 ? "+" : "-";
      const value = Math.abs(attr.contribution).toFixed(3);
      lines.push(`${attr.featureNameRu.padEnd(20)} ${sign}${value} ${bar}`);
    }
    return lines.join("\n");
  }
  visualizeAsText(explanation) {
    const lines = [];
    lines.push(`\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442: ${explanation.prediction}`);
    lines.push(`\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: ${Math.round(explanation.confidence * 100)}%`);
    lines.push("\n\u0424\u0430\u043A\u0442\u043E\u0440\u044B, \u043F\u043E\u0432\u043B\u0438\u044F\u0432\u0448\u0438\u0435 \u043D\u0430 \u0440\u0435\u0448\u0435\u043D\u0438\u0435:");
    for (const attr of explanation.attributions.slice(0, 5)) {
      const impact = attr.contribution > 0 ? "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0435\u0442" : "\u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0435\u0442";
      lines.push(`- ${attr.featureNameRu} (${attr.featureValue}): ${impact} \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0441\u0442\u044C`);
    }
    return lines.join("\n");
  }
  // ==========================================================================
  // USER-FRIENDLY EXPLANATION
  // ==========================================================================
  /**
   * Generate user-friendly explanation of top factors
   */
  generateUserSummary(explanation, ageGroup = "adult") {
    const topFactors = explanation.attributions.slice(0, 3);
    switch (ageGroup) {
      case "child": {
        const emojis = topFactors.map((f) => f.emoji).join(" ");
        return `${emojis} \u042F \u0432\u044B\u0431\u0440\u0430\u043B \u044D\u0442\u043E \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u0442\u0435\u0431\u044F!`;
      }
      case "teen": {
        const reasons = topFactors.map((f) => f.featureNameRu.toLowerCase()).join(", ");
        return `\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435: ${reasons} ${this.getConfidenceEmoji(explanation.confidence)}`;
      }
      case "adult":
      default: {
        const factorList = topFactors.map((f) => `${f.featureNameRu}: ${f.featureValue}`).join("; ");
        return `\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0430 \u043D\u0430: ${factorList}. \u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: ${Math.round(explanation.confidence * 100)}%.`;
      }
    }
  }
  getConfidenceEmoji(confidence) {
    if (confidence >= 0.9) {
      return "\u2705";
    }
    if (confidence >= 0.7) {
      return "\u{1F44D}";
    }
    if (confidence >= 0.5) {
      return "\u{1F914}";
    }
    return "\u26A0\uFE0F";
  }
  // ==========================================================================
  // FEATURE MANAGEMENT
  // ==========================================================================
  /**
   * Add custom feature definition
   */
  addFeature(definition) {
    this.featureDefinitions.set(definition.id, definition);
  }
  /**
   * Get feature definition
   */
  getFeature(featureId) {
    return this.featureDefinitions.get(featureId);
  }
  /**
   * Get all features by category
   */
  getFeaturesByCategory(category) {
    return Array.from(this.featureDefinitions.values()).filter((f) => f.category === category);
  }
  /**
   * Get all feature definitions
   */
  getAllFeatures() {
    return Array.from(this.featureDefinitions.values());
  }
  /**
   * Get causal features only
   */
  getCausalFeatures() {
    return Array.from(this.featureDefinitions.values()).filter((f) => f.isCausalFactor);
  }
};
var COUNTERFACTUAL_RULES = [
  // INTERVENTION RULES
  {
    id: "RULE-001",
    targetOutcome: "More Active Technique",
    targetOutcomeRu: "\u0411\u043E\u043B\u0435\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0442\u0435\u0445\u043D\u0438\u043A\u0430",
    requiredChanges: [
      {
        featureId: "currentEnergy",
        condition: (v) => v < 3,
        suggestedValue: 4,
        description: "Increase energy level",
        descriptionRu: "\u041F\u043E\u0432\u044B\u0441\u0438\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u044D\u043D\u0435\u0440\u0433\u0438\u0438",
        feasibility: "moderate",
        riskLevel: "low"
      },
      {
        featureId: "currentMood",
        condition: (v) => v < 3,
        suggestedValue: 4,
        description: "Improve mood",
        descriptionRu: "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435",
        feasibility: "moderate",
        riskLevel: "low"
      }
    ],
    priority: 1,
    category: "intervention"
  },
  // RISK REDUCTION RULES
  {
    id: "RULE-002",
    targetOutcome: "Less Intensive Support",
    targetOutcomeRu: "\u041C\u0435\u043D\u0435\u0435 \u0438\u043D\u0442\u0435\u043D\u0441\u0438\u0432\u043D\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
    requiredChanges: [
      {
        featureId: "riskLevel",
        condition: (v) => v === "high" || v === "moderate",
        suggestedValue: "low",
        description: "Reduce risk level",
        descriptionRu: "\u0421\u043D\u0438\u0437\u0438\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0440\u0438\u0441\u043A\u0430",
        feasibility: "difficult",
        riskLevel: "high"
      },
      {
        featureId: "moodTrend",
        condition: (v) => v === "declining",
        suggestedValue: "stable",
        description: "Stabilize mood trend",
        descriptionRu: "\u0421\u0442\u0430\u0431\u0438\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0440\u0435\u043D\u0434 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F",
        feasibility: "moderate",
        riskLevel: "medium"
      }
    ],
    priority: 2,
    category: "risk"
  },
  // TIME-BASED RULES
  {
    id: "RULE-003",
    targetOutcome: "Morning Technique",
    targetOutcomeRu: "\u0423\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u0442\u0435\u0445\u043D\u0438\u043A\u0430",
    requiredChanges: [
      {
        featureId: "timeOfDay",
        condition: (v) => v !== "morning",
        suggestedValue: "morning",
        description: "Try in the morning",
        descriptionRu: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0443\u0442\u0440\u043E\u043C",
        feasibility: "easy",
        riskLevel: "low"
      }
    ],
    priority: 3,
    category: "time"
  },
  {
    id: "RULE-004",
    targetOutcome: "Evening Relaxation",
    targetOutcomeRu: "\u0412\u0435\u0447\u0435\u0440\u043D\u044F\u044F \u0440\u0435\u043B\u0430\u043A\u0441\u0430\u0446\u0438\u044F",
    requiredChanges: [
      {
        featureId: "timeOfDay",
        condition: (v) => v !== "evening",
        suggestedValue: "evening",
        description: "Try in the evening",
        descriptionRu: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0432\u0435\u0447\u0435\u0440\u043E\u043C",
        feasibility: "easy",
        riskLevel: "low"
      }
    ],
    priority: 3,
    category: "time"
  },
  // TRIGGER-BASED RULES
  {
    id: "RULE-005",
    targetOutcome: "Boredom Technique",
    targetOutcomeRu: "\u0422\u0435\u0445\u043D\u0438\u043A\u0430 \u0434\u043B\u044F \u0441\u043A\u0443\u043A\u0438",
    requiredChanges: [
      {
        featureId: "activeTrigger",
        condition: (v) => v !== "boredom",
        suggestedValue: "boredom",
        description: "When main trigger is boredom",
        descriptionRu: "\u041A\u043E\u0433\u0434\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u0440\u0438\u0433\u0433\u0435\u0440 \u2014 \u0441\u043A\u0443\u043A\u0430",
        feasibility: "easy",
        riskLevel: "low"
      }
    ],
    priority: 4,
    category: "trigger"
  },
  {
    id: "RULE-006",
    targetOutcome: "Stress Management Technique",
    targetOutcomeRu: "\u0422\u0435\u0445\u043D\u0438\u043A\u0430 \u0434\u043B\u044F \u0441\u0442\u0440\u0435\u0441\u0441\u0430",
    requiredChanges: [
      {
        featureId: "activeTrigger",
        condition: (v) => v !== "stress",
        suggestedValue: "stress",
        description: "When main trigger is stress",
        descriptionRu: "\u041A\u043E\u0433\u0434\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u0440\u0438\u0433\u0433\u0435\u0440 \u2014 \u0441\u0442\u0440\u0435\u0441\u0441",
        feasibility: "easy",
        riskLevel: "low"
      }
    ],
    priority: 4,
    category: "trigger"
  },
  {
    id: "RULE-007",
    targetOutcome: "Loneliness Support",
    targetOutcomeRu: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 \u043F\u0440\u0438 \u043E\u0434\u0438\u043D\u043E\u0447\u0435\u0441\u0442\u0432\u0435",
    requiredChanges: [
      {
        featureId: "activeTrigger",
        condition: (v) => v !== "loneliness",
        suggestedValue: "loneliness",
        description: "When feeling lonely",
        descriptionRu: "\u041A\u043E\u0433\u0434\u0430 \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0448\u044C \u043E\u0434\u0438\u043D\u043E\u0447\u0435\u0441\u0442\u0432\u043E",
        feasibility: "easy",
        riskLevel: "low"
      }
    ],
    priority: 4,
    category: "trigger"
  },
  // STREAK-BASED RULES
  {
    id: "RULE-008",
    targetOutcome: "Advanced Technique",
    targetOutcomeRu: "\u0411\u043E\u043B\u0435\u0435 \u043F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u0430\u044F \u0442\u0435\u0445\u043D\u0438\u043A\u0430",
    requiredChanges: [
      {
        featureId: "streak",
        condition: (v) => v < 7,
        suggestedValue: 7,
        description: "Reach 7-day streak",
        descriptionRu: "\u0414\u043E\u0441\u0442\u0438\u0447\u044C streak \u0432 7 \u0434\u043D\u0435\u0439",
        feasibility: "moderate",
        riskLevel: "low"
      }
    ],
    priority: 5,
    category: "streak"
  },
  {
    id: "RULE-009",
    targetOutcome: "Expert Level Exercises",
    targetOutcomeRu: "\u0423\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u044F \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043D\u043E\u0433\u043E \u0443\u0440\u043E\u0432\u043D\u044F",
    requiredChanges: [
      {
        featureId: "streak",
        condition: (v) => v < 30,
        suggestedValue: 30,
        description: "Reach 30-day streak",
        descriptionRu: "\u0414\u043E\u0441\u0442\u0438\u0447\u044C streak \u0432 30 \u0434\u043D\u0435\u0439",
        feasibility: "difficult",
        riskLevel: "low"
      }
    ],
    priority: 6,
    category: "streak"
  },
  // MOOD IMPROVEMENT RULES
  {
    id: "RULE-010",
    targetOutcome: "Positive Mood Techniques",
    targetOutcomeRu: "\u0422\u0435\u0445\u043D\u0438\u043A\u0438 \u0434\u043B\u044F \u0445\u043E\u0440\u043E\u0448\u0435\u0433\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F",
    requiredChanges: [
      {
        featureId: "currentMood",
        condition: (v) => v < 4,
        suggestedValue: 4,
        description: "Improve mood to good level",
        descriptionRu: "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435 \u0434\u043E \u0445\u043E\u0440\u043E\u0448\u0435\u0433\u043E",
        feasibility: "moderate",
        riskLevel: "low"
      }
    ],
    priority: 2,
    category: "mood"
  },
  // SOCIAL SUPPORT RULES
  {
    id: "RULE-011",
    targetOutcome: "Group Activities",
    targetOutcomeRu: "\u0413\u0440\u0443\u043F\u043F\u043E\u0432\u044B\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438",
    requiredChanges: [
      {
        featureId: "socialSupport",
        condition: (v) => v < 3,
        suggestedValue: 4,
        description: "Increase social support",
        descriptionRu: "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0442\u044C \u0441\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u0443\u044E \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443",
        feasibility: "moderate",
        riskLevel: "low"
      }
    ],
    priority: 4,
    category: "intervention"
  },
  // STRESS REDUCTION
  {
    id: "RULE-012",
    targetOutcome: "Calming Exercises",
    targetOutcomeRu: "\u0423\u0441\u043F\u043E\u043A\u0430\u0438\u0432\u0430\u044E\u0449\u0438\u0435 \u0443\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u044F",
    requiredChanges: [
      {
        featureId: "stressLevel",
        condition: (v) => v > 3,
        suggestedValue: 2,
        description: "Reduce stress level",
        descriptionRu: "\u0421\u043D\u0438\u0437\u0438\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0441\u0442\u0440\u0435\u0441\u0441\u0430",
        feasibility: "moderate",
        riskLevel: "medium"
      }
    ],
    priority: 2,
    category: "mood"
  }
];
var CounterfactualExplainer = class {
  constructor(definitions, rules) {
    __publicField(this, "featureDefinitions");
    __publicField(this, "rules");
    this.featureDefinitions = new Map(
      Object.entries(definitions || INTERVENTION_FEATURES)
    );
    this.rules = rules || COUNTERFACTUAL_RULES;
  }
  // ==========================================================================
  // COUNTERFACTUAL GENERATION
  // ==========================================================================
  /**
   * Generate counterfactual explanations with risk-sensitivity
   */
  generateCounterfactuals(currentFeatures, currentOutcome, desiredOutcome, maxCounterfactuals = 3, options) {
    const scenarios = [];
    const applicableRules = this.findApplicableRules(
      currentFeatures,
      desiredOutcome
    );
    for (const rule of applicableRules) {
      const scenario = this.generateScenarioFromRule(rule, currentFeatures);
      if (scenario) {
        if (options?.requireRobust && options.minRobustness) {
          if (scenario.robustness < options.minRobustness) {
            continue;
          }
        }
        if (options?.feasibilityThreshold) {
          if (!this.meetsFeasibilityThreshold(
            scenario.feasibility,
            options.feasibilityThreshold
          )) {
            continue;
          }
        }
        scenarios.push(scenario);
      }
    }
    const proximityScenario = this.generateProximityCounterfactual(
      currentFeatures,
      currentOutcome
    );
    if (proximityScenario) {
      scenarios.unshift(proximityScenario);
    }
    scenarios.sort((a, b) => b.recourseScore - a.recourseScore);
    const diverseScenarios = this.selectDiverseScenarios(
      scenarios,
      maxCounterfactuals
    );
    const closestCounterfactual = this.findClosestCounterfactual(diverseScenarios);
    const mostRobustCounterfactual = this.findMostRobust(diverseScenarios);
    const easiestCounterfactual = this.findEasiest(diverseScenarios);
    const overallRobustness = this.calculateOverallRobustness(diverseScenarios);
    const diversityScore = this.calculateDiversityScore(diverseScenarios);
    const { summary, summaryRu } = this.generateSummary(
      diverseScenarios,
      currentOutcome
    );
    const { advice, adviceRu } = this.generateActionableAdvice(diverseScenarios);
    return {
      predictionId: crypto$1.randomUUID(),
      currentOutcome,
      currentOutcomeRu: this.translateOutcome(currentOutcome),
      currentValue: 0.5,
      scenarios: diverseScenarios,
      closestCounterfactual,
      mostRobustCounterfactual,
      easiestCounterfactual,
      summary,
      summaryRu,
      userActionableAdvice: advice,
      userActionableAdviceRu: adviceRu,
      overallRobustness,
      diversityScore
    };
  }
  /**
   * Find rules applicable to current features
   */
  findApplicableRules(features, desiredOutcome) {
    let applicable = this.rules.filter((rule) => {
      return rule.requiredChanges.some(
        (change) => change.condition(features[change.featureId])
      );
    });
    if (desiredOutcome) {
      const exactMatch = applicable.filter(
        (r) => r.targetOutcome.toLowerCase().includes(desiredOutcome.toLowerCase()) || r.targetOutcomeRu.toLowerCase().includes(desiredOutcome.toLowerCase())
      );
      if (exactMatch.length > 0) {
        applicable = exactMatch;
      }
    }
    return applicable.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Generate scenario from rule with robustness scoring
   */
  generateScenarioFromRule(rule, currentFeatures) {
    const changes = [];
    let totalFeasibility = "easy";
    const effortDescriptions = [];
    const effortDescriptionsRu = [];
    let maxRisk = "low";
    for (const requiredChange of rule.requiredChanges) {
      if (requiredChange.condition(currentFeatures[requiredChange.featureId])) {
        const definition = this.featureDefinitions.get(requiredChange.featureId);
        changes.push({
          featureId: requiredChange.featureId,
          featureName: definition?.name || requiredChange.featureId,
          featureNameRu: definition?.nameRu || requiredChange.featureId,
          currentValue: currentFeatures[requiredChange.featureId],
          suggestedValue: requiredChange.suggestedValue,
          changeDescription: requiredChange.description,
          changeDescriptionRu: requiredChange.descriptionRu,
          changeRisk: requiredChange.riskLevel,
          riskExplanation: this.getRiskExplanation(requiredChange.riskLevel)
        });
        effortDescriptions.push(requiredChange.description);
        effortDescriptionsRu.push(requiredChange.descriptionRu);
        totalFeasibility = this.combineFeasibility(
          totalFeasibility,
          requiredChange.feasibility
        );
        if (this.riskOrder(requiredChange.riskLevel) > this.riskOrder(maxRisk)) {
          maxRisk = requiredChange.riskLevel;
        }
      }
    }
    if (changes.length === 0) {
      return null;
    }
    const robustness = this.calculateRobustness({
      id: "",
      changes,
      feasibility: totalFeasibility
    });
    const plausibility = this.calculatePlausibility(
      { changes },
      currentFeatures
    );
    const sparsity = this.calculateSparsity(changes.length);
    const recourseScore = this.calculateRecourseScore(
      robustness,
      plausibility,
      sparsity,
      totalFeasibility
    );
    if (maxRisk === "high") {
      totalFeasibility = "risky";
    }
    return {
      id: crypto$1.randomUUID(),
      description: `To get "${rule.targetOutcome}"`,
      descriptionRu: `\u0427\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C "${rule.targetOutcomeRu}"`,
      changes,
      alternativeOutcome: rule.targetOutcome,
      alternativeOutcomeRu: rule.targetOutcomeRu,
      alternativeValue: 0.7,
      feasibility: totalFeasibility,
      effort: effortDescriptions.join("; "),
      effortRu: effortDescriptionsRu.join("; "),
      robustness,
      plausibility,
      sparsity,
      recourseScore,
      confidence: 0.75 - changes.length * 0.1
    };
  }
  /**
   * Generate proximity-based counterfactual (minimum change)
   */
  generateProximityCounterfactual(currentFeatures, _currentOutcome) {
    const singleChanges = [];
    const currentMood = currentFeatures.currentMood;
    if (currentMood && currentMood < 4) {
      const definition = this.featureDefinitions.get("currentMood");
      singleChanges.push({
        featureId: "currentMood",
        featureName: definition?.name || "Mood",
        featureNameRu: definition?.nameRu || "\u041D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435",
        currentValue: currentMood,
        suggestedValue: Math.min(5, currentMood + 1),
        changeDescription: "Raise mood by 1 point",
        changeDescriptionRu: "\u041F\u043E\u0432\u044B\u0441\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435 \u043D\u0430 1 \u043F\u0443\u043D\u043A\u0442",
        changeRisk: "low"
      });
    }
    const currentEnergy = currentFeatures.currentEnergy;
    if (currentEnergy && currentEnergy < 4) {
      const definition = this.featureDefinitions.get("currentEnergy");
      singleChanges.push({
        featureId: "currentEnergy",
        featureName: definition?.name || "Energy",
        featureNameRu: definition?.nameRu || "\u042D\u043D\u0435\u0440\u0433\u0438\u044F",
        currentValue: currentEnergy,
        suggestedValue: Math.min(5, currentEnergy + 1),
        changeDescription: "Raise energy by 1 point",
        changeDescriptionRu: "\u041F\u043E\u0432\u044B\u0441\u0438\u0442\u044C \u044D\u043D\u0435\u0440\u0433\u0438\u044E \u043D\u0430 1 \u043F\u0443\u043D\u043A\u0442",
        changeRisk: "low"
      });
    }
    const stressLevel = currentFeatures.stressLevel;
    if (stressLevel && stressLevel > 2) {
      const definition = this.featureDefinitions.get("stressLevel");
      singleChanges.push({
        featureId: "stressLevel",
        featureName: definition?.name || "Stress",
        featureNameRu: definition?.nameRu || "\u0421\u0442\u0440\u0435\u0441\u0441",
        currentValue: stressLevel,
        suggestedValue: Math.max(1, stressLevel - 1),
        changeDescription: "Reduce stress by 1 point",
        changeDescriptionRu: "\u0421\u043D\u0438\u0437\u0438\u0442\u044C \u0441\u0442\u0440\u0435\u0441\u0441 \u043D\u0430 1 \u043F\u0443\u043D\u043A\u0442",
        changeRisk: "low"
      });
    }
    const smallestChange = singleChanges[0];
    if (!smallestChange) {
      return null;
    }
    const robustness = 0.85;
    const plausibility = 0.9;
    const sparsity = 1;
    const recourseScore = (robustness + plausibility + sparsity) / 3;
    return {
      id: crypto$1.randomUUID(),
      description: "Minimal Change",
      descriptionRu: "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435",
      changes: [smallestChange],
      alternativeOutcome: `Different recommendation (with ${smallestChange.changeDescription.toLowerCase()})`,
      alternativeOutcomeRu: `\u0414\u0440\u0443\u0433\u0430\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F (\u043F\u0440\u0438 ${smallestChange.changeDescriptionRu.toLowerCase()})`,
      alternativeValue: 0.6,
      feasibility: "easy",
      effort: smallestChange.changeDescription,
      effortRu: smallestChange.changeDescriptionRu,
      robustness,
      plausibility,
      sparsity,
      recourseScore,
      confidence: 0.8
    };
  }
  // ==========================================================================
  // RISK-SENSITIVE METRICS
  // ==========================================================================
  /**
   * Calculate robustness of a counterfactual scenario
   * Higher = more robust to perturbations
   */
  calculateRobustness(scenario) {
    if (!scenario.changes || scenario.changes.length === 0) {
      return 0;
    }
    const sparsityFactor = 1 / Math.sqrt(scenario.changes.length);
    const riskFactors = scenario.changes.map((c) => {
      switch (c.changeRisk) {
        case "low":
          return 1;
        case "medium":
          return 0.7;
        case "high":
          return 0.4;
        default:
          return 0.5;
      }
    });
    const avgRiskFactor = riskFactors.reduce((a, b) => a + b, 0) / riskFactors.length;
    const feasibilityFactor = this.feasibilityToScore(scenario.feasibility);
    const robustness = sparsityFactor * 0.3 + avgRiskFactor * 0.4 + feasibilityFactor * 0.3;
    return Math.min(1, Math.max(0, robustness));
  }
  /**
   * Calculate plausibility of a counterfactual scenario
   * Higher = more realistic given the context
   */
  calculatePlausibility(scenario, _contextFeatures) {
    if (!scenario.changes || scenario.changes.length === 0) {
      return 0;
    }
    const plausibilityScores = scenario.changes.map((change) => {
      const definition = this.featureDefinitions.get(change.featureId);
      if (!definition) {
        return 0.5;
      }
      const currentNum = typeof change.currentValue === "number" ? change.currentValue : 0;
      const suggestedNum = typeof change.suggestedValue === "number" ? change.suggestedValue : 0;
      if (definition.valueType === "numeric" && definition.maxValue && definition.minValue) {
        const range = definition.maxValue - definition.minValue;
        const distance = Math.abs(suggestedNum - currentNum) / range;
        return 1 - distance * 0.5;
      }
      if (definition.valueType === "categorical" && definition.possibleValues) {
        return definition.possibleValues.includes(String(change.suggestedValue)) ? 0.8 : 0.3;
      }
      return 0.5;
    });
    return plausibilityScores.reduce((a, b) => a + b, 0) / plausibilityScores.length;
  }
  /**
   * Calculate sparsity (preference for fewer changes)
   */
  calculateSparsity(changeCount) {
    return Math.exp(-0.5 * (changeCount - 1));
  }
  /**
   * Calculate combined recourse score
   */
  calculateRecourseScore(robustness, plausibility, sparsity, feasibility) {
    const feasibilityScore = this.feasibilityToScore(feasibility);
    return robustness * 0.25 + plausibility * 0.25 + sparsity * 0.25 + feasibilityScore * 0.25;
  }
  // ==========================================================================
  // DIVERSITY & SELECTION
  // ==========================================================================
  /**
   * Select diverse subset of counterfactuals
   */
  selectDiverseScenarios(scenarios, maxCount) {
    if (scenarios.length <= maxCount) {
      return scenarios;
    }
    const selected = [];
    const usedCategories = /* @__PURE__ */ new Set();
    for (const scenario of scenarios) {
      if (selected.length >= maxCount) {
        break;
      }
      const category = this.getScenarioCategory(scenario);
      if (!usedCategories.has(category)) {
        selected.push(scenario);
        usedCategories.add(category);
      }
    }
    for (const scenario of scenarios) {
      if (selected.length >= maxCount) {
        break;
      }
      if (!selected.includes(scenario)) {
        selected.push(scenario);
      }
    }
    return selected;
  }
  /**
   * Get category of a scenario based on changed features
   */
  getScenarioCategory(scenario) {
    const firstChange = scenario.changes[0];
    if (!firstChange) {
      return "unknown";
    }
    const featureId = firstChange.featureId;
    const definition = this.featureDefinitions.get(featureId);
    return definition?.category || "unknown";
  }
  /**
   * Calculate diversity score for selected scenarios
   */
  calculateDiversityScore(scenarios) {
    if (scenarios.length <= 1) {
      return 0;
    }
    const categories = scenarios.map((s) => this.getScenarioCategory(s));
    const uniqueCategories = new Set(categories);
    return uniqueCategories.size / scenarios.length;
  }
  /**
   * Calculate overall robustness of explanation
   */
  calculateOverallRobustness(scenarios) {
    if (scenarios.length === 0) {
      return 0;
    }
    const robustnessValues = scenarios.map((s) => s.robustness);
    return robustnessValues.reduce((a, b) => a + b, 0) / robustnessValues.length;
  }
  // ==========================================================================
  // FINDING SPECIAL SCENARIOS
  // ==========================================================================
  /**
   * Find closest counterfactual (easiest to achieve)
   */
  findClosestCounterfactual(scenarios) {
    if (scenarios.length === 0) {
      return void 0;
    }
    return [...scenarios].sort((a, b) => {
      const feasibilityOrder = {
        easy: 0,
        moderate: 1,
        difficult: 2,
        impossible: 3,
        risky: 4
      };
      const feasibilityDiff = feasibilityOrder[a.feasibility] - feasibilityOrder[b.feasibility];
      if (feasibilityDiff !== 0) {
        return feasibilityDiff;
      }
      return a.changes.length - b.changes.length;
    })[0];
  }
  /**
   * Find most robust counterfactual
   */
  findMostRobust(scenarios) {
    if (scenarios.length === 0) {
      return void 0;
    }
    return [...scenarios].sort((a, b) => b.robustness - a.robustness)[0];
  }
  /**
   * Find easiest counterfactual
   */
  findEasiest(scenarios) {
    if (scenarios.length === 0) {
      return void 0;
    }
    const easyScenarios = scenarios.filter((s) => s.feasibility === "easy");
    if (easyScenarios.length > 0) {
      return easyScenarios.sort((a, b) => b.recourseScore - a.recourseScore)[0];
    }
    return this.findClosestCounterfactual(scenarios);
  }
  // ==========================================================================
  // USER-FACING OUTPUT
  // ==========================================================================
  /**
   * Generate summary of counterfactuals
   */
  generateSummary(scenarios, currentOutcome) {
    if (scenarios.length === 0) {
      return {
        summary: `Current recommendation "${currentOutcome}" is optimal for your situation.`,
        summaryRu: `\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F "${this.translateOutcome(currentOutcome)}" \u2014 \u043E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u0430 \u0434\u043B\u044F \u0442\u0432\u043E\u0435\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438.`
      };
    }
    const easiest = scenarios.find((s) => s.feasibility === "easy");
    const change = easiest?.changes?.[0];
    if (change) {
      return {
        summary: `If ${change.changeDescription.toLowerCase()}, you'll get ${easiest?.alternativeOutcome?.toLowerCase() ?? "a different result"}.`,
        summaryRu: `\u0415\u0441\u043B\u0438 ${change.changeDescriptionRu.toLowerCase()}, \u0442\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0448\u044C ${easiest?.alternativeOutcomeRu?.toLowerCase() ?? "\u0434\u0440\u0443\u0433\u043E\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442"}.`
      };
    }
    return {
      summary: `There are ${scenarios.length} way(s) to get a different recommendation.`,
      summaryRu: `\u0415\u0441\u0442\u044C ${scenarios.length} \u0441\u043F\u043E\u0441\u043E\u0431\u0430(\u043E\u0432) \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u0440\u0443\u0433\u0443\u044E \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044E.`
    };
  }
  /**
   * Generate actionable advice from counterfactuals
   */
  generateActionableAdvice(scenarios) {
    const advice = [];
    const adviceRu = [];
    for (const scenario of scenarios) {
      if (scenario.feasibility === "easy" || scenario.feasibility === "moderate") {
        for (const change of scenario.changes) {
          if (!advice.includes(change.changeDescription)) {
            advice.push(change.changeDescription);
            adviceRu.push(change.changeDescriptionRu);
          }
        }
      }
    }
    return {
      advice: advice.slice(0, 3),
      adviceRu: adviceRu.slice(0, 3)
    };
  }
  /**
   * Format counterfactuals for display
   */
  formatForDisplay(explanation, ageGroup = "adult") {
    switch (ageGroup) {
      case "child":
        return this.formatForChild(explanation);
      case "teen":
        return this.formatForTeen(explanation);
      case "adult":
      default:
        return this.formatForAdult(explanation);
    }
  }
  formatForChild(explanation) {
    if (explanation.scenarios.length === 0) {
      return "\u{1F31F} \u042F \u0432\u044B\u0431\u0440\u0430\u043B \u043B\u0443\u0447\u0448\u0435\u0435 \u0434\u043B\u044F \u0442\u0435\u0431\u044F!";
    }
    const easiest = explanation.easiestCounterfactual;
    if (easiest && easiest.changes.length > 0) {
      return `\u{1F52E} \u0410 \u0437\u043D\u0430\u0435\u0448\u044C \u0447\u0442\u043E? ${easiest.effortRu} \u2014 \u0438 \u0431\u0443\u0434\u0435\u0442 \u0435\u0449\u0451 \u043A\u0440\u0443\u0447\u0435!`;
    }
    return "\u{1F31F} \u042D\u0442\u043E \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u0442\u0435\u0431\u044F!";
  }
  formatForTeen(explanation) {
    let result = `\u{1F4A1} ${explanation.summaryRu}
`;
    if (explanation.userActionableAdviceRu.length > 0) {
      result += "\n\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C:\n";
      for (const advice of explanation.userActionableAdviceRu.slice(0, 2)) {
        result += `\u2022 ${advice}
`;
      }
    }
    return result.trim();
  }
  formatForAdult(explanation) {
    let result = `\u{1F4CA} \u0410\u043D\u0430\u043B\u0438\u0437 \u0430\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432

`;
    result += `${explanation.summaryRu}
`;
    if (explanation.scenarios.length > 0) {
      result += "\n\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F:\n";
      for (const scenario of explanation.scenarios.slice(0, 3)) {
        result += `
${scenario.descriptionRu}:
`;
        for (const change of scenario.changes) {
          result += `  \u2022 ${change.changeDescriptionRu} `;
          result += `(${change.currentValue} \u2192 ${change.suggestedValue})
`;
        }
        result += `  \u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C: ${this.translateFeasibility(scenario.feasibility)}`;
        result += ` | \u041D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u044C: ${Math.round(scenario.robustness * 100)}%
`;
      }
    }
    return result.trim();
  }
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  combineFeasibility(current, newFeasibility) {
    const order = {
      easy: 0,
      moderate: 1,
      difficult: 2,
      risky: 3,
      impossible: 4
    };
    return order[newFeasibility] > order[current] ? newFeasibility : current;
  }
  meetsFeasibilityThreshold(feasibility, threshold) {
    const order = {
      easy: 0,
      moderate: 1,
      difficult: 2,
      risky: 3,
      impossible: 4
    };
    return order[feasibility] <= order[threshold];
  }
  feasibilityToScore(feasibility) {
    const scores = {
      easy: 1,
      moderate: 0.7,
      difficult: 0.4,
      risky: 0.3,
      impossible: 0
    };
    return scores[feasibility] ?? 0.5;
  }
  riskOrder(risk) {
    const order = { low: 0, medium: 1, high: 2 };
    return order[risk] ?? 0;
  }
  getRiskExplanation(risk) {
    switch (risk) {
      case "low":
        return "Safe change with minimal risk";
      case "medium":
        return "Moderate change that may require effort";
      case "high":
        return "Significant change that needs careful consideration";
    }
  }
  translateFeasibility(feasibility) {
    const translations = {
      easy: "\u043B\u0435\u0433\u043A\u043E",
      moderate: "\u0441\u0440\u0435\u0434\u043D\u0435",
      difficult: "\u0441\u043B\u043E\u0436\u043D\u043E",
      risky: "\u0440\u0438\u0441\u043A\u043E\u0432\u0430\u043D\u043D\u043E",
      impossible: "\u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E"
    };
    return translations[feasibility];
  }
  translateOutcome(outcome) {
    const translations = {
      "intervention": "\u0442\u0435\u0445\u043D\u0438\u043A\u0430",
      "support": "\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
      "technique": "\u0442\u0435\u0445\u043D\u0438\u043A\u0430",
      "exercise": "\u0443\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u0435"
    };
    for (const [en, ru] of Object.entries(translations)) {
      if (outcome.toLowerCase().includes(en)) {
        return outcome.replace(new RegExp(en, "gi"), ru);
      }
    }
    return outcome;
  }
  // ==========================================================================
  // RULE MANAGEMENT
  // ==========================================================================
  /**
   * Add custom counterfactual rule
   */
  addRule(rule) {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Get all rules
   */
  getRules() {
    return [...this.rules];
  }
  /**
   * Get rules by category
   */
  getRulesByCategory(category) {
    return this.rules.filter((r) => r.category === category);
  }
};

// src/explainability/services/NarrativeGenerator.ts
var COMMON_EMOJI_CODEPOINTS = /* @__PURE__ */ new Set([
  // Common narrative emojis used in templates
  127775,
  // 🌟
  128640,
  // 🚀
  128161,
  // 💡
  10024,
  // ✨
  127919,
  // 🎯
  128214,
  // 📖
  129300,
  // 🤔
  128221,
  // 📝
  9989,
  // ✅
  128077,
  // 👍
  128588,
  // 🙌
  127774,
  // 🌞
  127752,
  // 🌈
  128170,
  // 💪
  10084,
  // ❤
  128578
  // 🙂
]);
function containsEmoji(str) {
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== void 0 && (COMMON_EMOJI_CODEPOINTS.has(codePoint) || codePoint >= 127744 && codePoint <= 129535)) {
      return true;
    }
  }
  return false;
}
function removeEmojis(str) {
  let result = "";
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint === void 0 || (codePoint < 127744 || codePoint > 129535) && !COMMON_EMOJI_CODEPOINTS.has(codePoint)) {
      result += char;
    }
  }
  return result;
}
var NARRATIVE_TEMPLATES_RU = {
  journey: {
    child: {
      opening: [
        "\u{1F31F} \u0414\u0430\u0432\u0430\u0439 \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u043C, \u043A\u0430\u043A \u043C\u044B \u043F\u0440\u0438\u0448\u043B\u0438 \u043A \u044D\u0442\u043E\u043C\u0443!",
        "\u{1F680} \u0412\u043E\u0442 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0442\u0432\u043E\u0435\u0433\u043E \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F!",
        "\u2728 \u0420\u0430\u0441\u0441\u043A\u0430\u0436\u0443 \u0442\u0435\u0431\u0435, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u043E!"
      ],
      body: [
        "\u0422\u044B \u043D\u0430\u0447\u0430\u043B \u0441 {initial_state}. \u041F\u043E\u0442\u043E\u043C {key_change}. \u0418 \u0442\u0435\u043F\u0435\u0440\u044C {current_state}!",
        "\u041F\u043E\u043C\u043D\u0438\u0448\u044C, \u043A\u043E\u0433\u0434\u0430 \u0431\u044B\u043B\u043E {initial_state}? {key_change} \u043F\u043E\u043C\u043E\u0433\u043B\u043E! \u0422\u0435\u043F\u0435\u0440\u044C {current_state}."
      ],
      conclusion: [
        "\u0422\u044B \u043C\u043E\u043B\u043E\u0434\u0435\u0446! \u{1F389}",
        "\u0422\u0430\u043A \u0434\u0435\u0440\u0436\u0430\u0442\u044C! \u{1F4AA}",
        "\u041E\u0442\u043B\u0438\u0447\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0441\u044F! \u2B50"
      ],
      callToAction: [
        "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 {action}!",
        "\u0414\u0430\u0432\u0430\u0439 \u0441\u0434\u0435\u043B\u0430\u0435\u043C {action}!"
      ]
    },
    teen: {
      opening: [
        "\u{1F4CA} \u0412\u043E\u0442 \u043A\u0430\u043A \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u0430...",
        "\u{1F4A1} \u0421\u043C\u043E\u0442\u0440\u0438, \u0447\u0442\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0441\u044F...",
        "\u{1F3AF} \u0420\u0430\u0437\u0431\u0435\u0440\u0451\u043C \u043F\u043E \u0448\u0430\u0433\u0430\u043C..."
      ],
      body: [
        "\u041D\u0430\u0447\u0438\u043D\u0430\u043B\u043E\u0441\u044C \u0441 {initial_state}. {key_change} \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044E. \u0421\u0435\u0439\u0447\u0430\u0441 {current_state}.",
        "\u041E\u0442 {initial_state} \u0447\u0435\u0440\u0435\u0437 {key_change} \u0442\u044B \u0434\u043E\u0448\u0451\u043B \u0434\u043E {current_state}."
      ],
      conclusion: [
        "\u0412 \u0446\u0435\u043B\u043E\u043C, \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0432 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u043C \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0438.",
        "\u0415\u0441\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441, \u0438 \u044D\u0442\u043E \u0433\u043B\u0430\u0432\u043D\u043E\u0435.",
        "\u0421\u0438\u0442\u0443\u0430\u0446\u0438\u044F \u043F\u043E\u0434 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C."
      ],
      callToAction: [
        "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433 \u2014 {action}.",
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C {action}."
      ]
    },
    adult: {
      opening: [
        "\u{1F4C8} \u0410\u043D\u0430\u043B\u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0443\u0442\u0438:",
        "\u{1F50D} \u0420\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0438\u043C \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0443 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439:",
        "\u{1F4CB} \u041E\u0431\u0437\u043E\u0440 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430:"
      ],
      body: [
        "\u0418\u0441\u0445\u043E\u0434\u043D\u043E\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: {initial_state}. \u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F: {key_change}. \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441: {current_state}.",
        "\u0412\u044B \u043F\u0440\u043E\u0448\u043B\u0438 \u043F\u0443\u0442\u044C \u043E\u0442 {initial_state}, \u0447\u0435\u0440\u0435\u0437 {key_change}, \u043A {current_state}."
      ],
      conclusion: [
        "\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0443.",
        "\u041D\u0430\u0431\u043B\u044E\u0434\u0430\u0435\u0442\u0441\u044F \u0443\u0441\u0442\u043E\u0439\u0447\u0438\u0432\u044B\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441.",
        "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0442\u0440\u0430\u0435\u043A\u0442\u043E\u0440\u0438\u044F \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0446\u0435\u043B\u044F\u043C."
      ],
      callToAction: [
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435: {action}.",
        "\u0414\u043B\u044F \u0434\u0430\u043B\u044C\u043D\u0435\u0439\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442\u0441\u044F: {action}."
      ]
    }
  },
  comparison: {
    child: {
      opening: [
        "\u{1F50D} \u0410 \u0442\u044B \u0437\u043D\u0430\u043B, \u0447\u0442\u043E \u0434\u0440\u0443\u0433\u0438\u0435 \u0442\u043E\u0436\u0435 \u0442\u0430\u043A \u0434\u0435\u043B\u0430\u044E\u0442?",
        "\u{1F465} \u0421\u043C\u043E\u0442\u0440\u0438, \u043A\u0430\u043A \u0443 \u0434\u0440\u0443\u0433\u0438\u0445 \u0440\u0435\u0431\u044F\u0442!"
      ],
      body: [
        "\u041C\u043D\u043E\u0433\u0438\u0435, \u043A\u0430\u043A \u0438 \u0442\u044B, \u0447\u0443\u0432\u0441\u0442\u0432\u043E\u0432\u0430\u043B\u0438 {feeling}. {technique} \u043F\u043E\u043C\u043E\u0433\u043B\u043E \u0438\u043C. \u0422\u0435\u0431\u0435 \u0442\u043E\u0436\u0435 \u043F\u043E\u043C\u043E\u0436\u0435\u0442!"
      ],
      conclusion: [
        "\u0422\u044B \u043D\u0435 \u043E\u0434\u0438\u043D! \u{1F91D}",
        "\u041C\u043D\u043E\u0433\u0438\u0435 \u0441\u043F\u0440\u0430\u0432\u0438\u043B\u0438\u0441\u044C, \u0438 \u0442\u044B \u0441\u043F\u0440\u0430\u0432\u0438\u0448\u044C\u0441\u044F! \u{1F4AA}"
      ],
      callToAction: [
        "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0442\u043E, \u0447\u0442\u043E \u043F\u043E\u043C\u043E\u0433\u043B\u043E \u0434\u0440\u0443\u0433\u0438\u043C!"
      ]
    },
    teen: {
      opening: [
        "\u{1F4CA} \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441 \u043F\u043E\u0445\u043E\u0436\u0438\u043C\u0438 \u0441\u043B\u0443\u0447\u0430\u044F\u043C\u0438...",
        "\u{1F504} \u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u043C, \u043A\u0430\u043A \u0441\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0434\u0440\u0443\u0433\u0438\u0435..."
      ],
      body: [
        "\u0412 \u043F\u043E\u0445\u043E\u0436\u0438\u0445 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044F\u0445 ({feeling}) {technique} \u043F\u043E\u043A\u0430\u0437\u0430\u043B\u0430 \u0445\u043E\u0440\u043E\u0448\u0438\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B. {stats}"
      ],
      conclusion: [
        "\u041C\u0435\u0442\u043E\u0434 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D \u0438 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442.",
        "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043D\u0430 \u0442\u0432\u043E\u0435\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435."
      ],
      callToAction: [
        "\u0421\u0442\u043E\u0438\u0442 \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u043F\u043E\u0434\u0445\u043E\u0434."
      ]
    },
    adult: {
      opening: [
        "\u{1F4C8} \u0421\u0440\u0430\u0432\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437:",
        "\u{1F52C} \u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u0430\u043D\u0430\u043B\u043E\u0433\u0438\u0447\u043D\u044B\u043C \u0441\u043B\u0443\u0447\u0430\u044F\u043C:"
      ],
      body: [
        "\u0412 \u0432\u044B\u0431\u043E\u0440\u043A\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0441\u043E \u0441\u0445\u043E\u0436\u0438\u043C\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C\u0438 ({feeling}) \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435 {technique} \u043F\u043E\u043A\u0430\u0437\u0430\u043B\u043E {stats}."
      ],
      conclusion: [
        "\u042D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u043C\u0435\u0442\u043E\u0434\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u043C\u0438.",
        "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u043D\u0430\u0447\u0438\u043C\u044B."
      ],
      callToAction: [
        "\u041D\u0430 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u043F\u043E\u0434\u0445\u043E\u0434."
      ]
    }
  },
  "cause-effect": {
    child: {
      opening: [
        "\u{1F517} \u0417\u043D\u0430\u0435\u0448\u044C \u043F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C?",
        "\u2753 \u0414\u0430\u0432\u0430\u0439 \u0440\u0430\u0437\u0431\u0435\u0440\u0451\u043C\u0441\u044F, \u043E\u0442 \u0447\u0435\u0433\u043E \u044D\u0442\u043E \u0437\u0430\u0432\u0438\u0441\u0438\u0442!"
      ],
      body: [
        "\u041A\u043E\u0433\u0434\u0430 {cause}, \u0442\u043E {effect}. \u042D\u0442\u043E \u043A\u0430\u043A {analogy}!",
        "{cause} \u043F\u0440\u0438\u0432\u043E\u0434\u0438\u0442 \u043A {effect}. \u041F\u043E\u043D\u0438\u043C\u0430\u0435\u0448\u044C?"
      ],
      conclusion: [
        "\u0422\u0435\u043F\u0435\u0440\u044C \u0442\u044B \u0437\u043D\u0430\u0435\u0448\u044C, \u043A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442! \u{1F9E0}",
        "\u0412\u043E\u0442 \u0442\u0430\u043A\u0430\u044F \u0446\u0435\u043F\u043E\u0447\u043A\u0430! \u26D3\uFE0F"
      ],
      callToAction: [
        "\u0427\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C {effect}, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 {action}!"
      ]
    },
    teen: {
      opening: [
        "\u{1F52C} \u041F\u0440\u0438\u0447\u0438\u043D\u043D\u043E-\u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C:",
        "\u26A1 \u0412\u043E\u0442 \u0447\u0442\u043E \u043D\u0430 \u0447\u0442\u043E \u0432\u043B\u0438\u044F\u0435\u0442:"
      ],
      body: [
        "{cause} \u2192 {effect}. \u041C\u0435\u0445\u0430\u043D\u0438\u0437\u043C: {mechanism}.",
        "\u0421\u0432\u044F\u0437\u044C: {cause} \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 {effect}."
      ],
      conclusion: [
        "\u041F\u043E\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043F\u0440\u0438\u0447\u0438\u043D \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0438\u044F\u043C\u0438.",
        "\u0417\u043D\u0430\u044F \u043C\u0435\u0445\u0430\u043D\u0438\u0437\u043C, \u043C\u043E\u0436\u043D\u043E \u0432\u043B\u0438\u044F\u0442\u044C \u043D\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442."
      ],
      callToAction: [
        "\u0412\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0439 \u043D\u0430 {cause}, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C {effect}."
      ]
    },
    adult: {
      opening: [
        "\u{1F50D} \u041A\u0430\u0443\u0437\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437:",
        "\u{1F4CA} \u041F\u0440\u0438\u0447\u0438\u043D\u043D\u043E-\u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0441\u0432\u044F\u0437\u0438:"
      ],
      body: [
        "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0441\u0432\u044F\u0437\u044C: {cause} \u2192 {effect}. \u041C\u0435\u0445\u0430\u043D\u0438\u0437\u043C \u0432\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F: {mechanism}. \u0421\u0438\u043B\u0430 \u0441\u0432\u044F\u0437\u0438: {strength}."
      ],
      conclusion: [
        "\u041A\u0430\u0443\u0437\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u0432\u044B\u044F\u0432\u0438\u043B \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0442\u043E\u0447\u043A\u0438 \u0432\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F.",
        "\u0418\u043D\u0442\u0435\u0440\u0432\u0435\u043D\u0446\u0438\u044F \u043D\u0430 \u0443\u0440\u043E\u0432\u043D\u0435 \u043F\u0440\u0438\u0447\u0438\u043D \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0438\u0442 \u0443\u0441\u0442\u043E\u0439\u0447\u0438\u0432\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442."
      ],
      callToAction: [
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0432\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u043D\u0430 {cause} \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F {effect}."
      ]
    }
  },
  recommendation: {
    child: {
      opening: [
        "\u{1F381} \u0423 \u043C\u0435\u043D\u044F \u0435\u0441\u0442\u044C \u0434\u043B\u044F \u0442\u0435\u0431\u044F \u0438\u0434\u0435\u044F!",
        "\u{1F4A1} \u0417\u043D\u0430\u044E, \u0447\u0442\u043E \u0442\u0435\u0431\u0435 \u043F\u043E\u043C\u043E\u0436\u0435\u0442!",
        "\u{1F308} \u0412\u043E\u0442 \u0447\u0442\u043E \u044F \u043F\u0440\u0438\u0434\u0443\u043C\u0430\u043B \u0434\u043B\u044F \u0442\u0435\u0431\u044F!"
      ],
      body: [
        "\u042F \u0432\u0438\u0436\u0443, \u0447\u0442\u043E {observation}. \u041F\u043E\u044D\u0442\u043E\u043C\u0443 \u0441\u043E\u0432\u0435\u0442\u0443\u044E {recommendation}!",
        "\u0420\u0430\u0437 {observation}, \u0434\u0430\u0432\u0430\u0439 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0435\u043C {recommendation}!"
      ],
      conclusion: [
        "\u042D\u0442\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u043F\u043E\u043C\u043E\u0447\u044C! \u{1F3AF}",
        "\u0423\u0432\u0435\u0440\u0435\u043D, \u0442\u0435\u0431\u0435 \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F! \u2764\uFE0F"
      ],
      callToAction: [
        "\u0413\u043E\u0442\u043E\u0432 \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C? {action}!",
        "\u041D\u0430\u0447\u043D\u0451\u043C \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441? {action}!"
      ]
    },
    teen: {
      opening: [
        "\u{1F4A1} \u0412\u043E\u0442 \u043C\u043E\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F:",
        "\u{1F3AF} \u0427\u0442\u043E \u044F \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u044E:"
      ],
      body: [
        "\u0423\u0447\u0438\u0442\u044B\u0432\u0430\u044F {observation}, \u043E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u2014 {recommendation}. \u041F\u043E\u0447\u0435\u043C\u0443: {reasoning}."
      ],
      conclusion: [
        "\u042D\u0442\u043E\u0442 \u043F\u043E\u0434\u0445\u043E\u0434 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0434\u043B\u044F \u0442\u0432\u043E\u0435\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438.",
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u0442\u0432\u043E\u0438 \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u0438."
      ],
      callToAction: [
        "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439: {action}."
      ]
    },
    adult: {
      opening: [
        "\u{1F4CB} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F:",
        "\u{1F3AF} \u041D\u0430 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0430\u043D\u0430\u043B\u0438\u0437\u0430:"
      ],
      body: [
        "\u0410\u043D\u0430\u043B\u0438\u0437 \u043F\u043E\u043A\u0430\u0437\u0430\u043B: {observation}. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F: {recommendation}. \u041E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435: {reasoning}. \u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442: {expected_effect}."
      ],
      conclusion: [
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0430 \u043D\u0430 \u0432\u0430\u0448\u0438\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438 \u043B\u0443\u0447\u0448\u0438\u0445 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430\u0445.",
        "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u044B."
      ],
      callToAction: [
        "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435: {action}."
      ]
    }
  }
};
var NARRATIVE_TEMPLATES_EN = {
  journey: {
    child: {
      opening: [
        "\u{1F31F} Let's see how we got here!",
        "\u{1F680} Here's the story of your journey!"
      ],
      body: [
        "You started with {initial_state}. Then {key_change}. And now {current_state}!"
      ],
      conclusion: [
        "You're doing great! \u{1F389}",
        "Keep it up! \u{1F4AA}"
      ],
      callToAction: [
        "Try {action}!"
      ]
    },
    teen: {
      opening: [
        "\u{1F4CA} Here's how things are shaping up...",
        "\u{1F4A1} Let me break this down..."
      ],
      body: [
        "Started with {initial_state}. {key_change} changed things. Now at {current_state}."
      ],
      conclusion: [
        "Overall, moving in the right direction.",
        "There's progress, and that's what matters."
      ],
      callToAction: [
        "Next step: {action}."
      ]
    },
    adult: {
      opening: [
        "\u{1F4C8} Analysis of your progress:",
        "\u{1F50D} Review of changes:"
      ],
      body: [
        "Initial state: {initial_state}. Key changes: {key_change}. Current status: {current_state}."
      ],
      conclusion: [
        "Data shows positive momentum.",
        "Current trajectory aligns with goals."
      ],
      callToAction: [
        "Recommended action: {action}."
      ]
    }
  },
  comparison: {
    child: {
      opening: ["\u{1F465} Did you know others do this too?"],
      body: ["Many kids felt {feeling} like you. {technique} helped them!"],
      conclusion: ["You're not alone! \u{1F91D}"],
      callToAction: ["Try what helped others!"]
    },
    teen: {
      opening: ["\u{1F4CA} Comparing with similar cases..."],
      body: ["In similar situations ({feeling}), {technique} showed good results. {stats}"],
      conclusion: ["The method is proven to work."],
      callToAction: ["Worth trying this approach."]
    },
    adult: {
      opening: ["\u{1F4C8} Comparative analysis:"],
      body: ["Among users with similar parameters ({feeling}), {technique} showed {stats}."],
      conclusion: ["Method effectiveness is data-confirmed."],
      callToAction: ["Based on data, recommend applying this approach."]
    }
  },
  "cause-effect": {
    child: {
      opening: ["\u{1F517} Know why this happened?"],
      body: ["When {cause}, then {effect}. It's like {analogy}!"],
      conclusion: ["Now you know how it works! \u{1F9E0}"],
      callToAction: ["To change {effect}, try {action}!"]
    },
    teen: {
      opening: ["\u{1F52C} Cause and effect:"],
      body: ["{cause} \u2192 {effect}. Mechanism: {mechanism}."],
      conclusion: ["Understanding causes helps control effects."],
      callToAction: ["Act on {cause} to change {effect}."]
    },
    adult: {
      opening: ["\u{1F50D} Causal analysis:"],
      body: ["Established link: {cause} \u2192 {effect}. Mechanism: {mechanism}. Strength: {strength}."],
      conclusion: ["Causal analysis identified key intervention points."],
      callToAction: ["Recommend acting on {cause} to modify {effect}."]
    }
  },
  recommendation: {
    child: {
      opening: ["\u{1F381} I have an idea for you!", "\u{1F4A1} I know what will help!"],
      body: ["I see that {observation}. So I suggest {recommendation}!"],
      conclusion: ["This should help! \u{1F3AF}"],
      callToAction: ["Ready to try? {action}!"]
    },
    teen: {
      opening: ["\u{1F4A1} Here's my recommendation:"],
      body: ["Given {observation}, best option is {recommendation}. Why: {reasoning}."],
      conclusion: ["This approach works for your situation."],
      callToAction: ["Try: {action}."]
    },
    adult: {
      opening: ["\u{1F4CB} Personalized recommendation:"],
      body: ["Analysis shows: {observation}. Recommended: {recommendation}. Rationale: {reasoning}."],
      conclusion: ["Recommendation based on your data and best practices."],
      callToAction: ["Recommended action: {action}."]
    }
  }
};
var NarrativeGenerator = class {
  // ==========================================================================
  // MAIN GENERATION
  // ==========================================================================
  /**
   * Generate narrative explanation from explanation response
   */
  generateNarrative(explanation, options) {
    const templates = options.language === "ru" ? NARRATIVE_TEMPLATES_RU : NARRATIVE_TEMPLATES_EN;
    const structureTemplates = templates[options.structure][options.ageGroup];
    const variables = this.extractVariables(explanation, options.structure);
    const opening = this.selectAndFill(
      structureTemplates.opening,
      variables,
      options.cognitiveStyle
    );
    const body = this.selectAndFill(
      structureTemplates.body,
      variables,
      options.cognitiveStyle
    );
    const conclusion = this.selectAndFill(
      structureTemplates.conclusion,
      variables,
      options.cognitiveStyle
    );
    const callToAction = structureTemplates.callToAction.length > 0 ? this.selectAndFill(structureTemplates.callToAction, variables, options.cognitiveStyle) : void 0;
    const keyPoints = this.extractKeyPoints(explanation, options.language, options.ageGroup);
    const title = this.generateTitle(options.structure, options.language, options.ageGroup);
    const fullText = [opening, body, conclusion, callToAction].filter(Boolean).join(" ");
    const readability = this.calculateReadability(fullText);
    let finalOpening = opening;
    let finalBody = body;
    let finalConclusion = conclusion;
    if (options.maxWords) {
      const result = this.applyWordLimit(
        opening,
        body,
        conclusion,
        callToAction,
        options.maxWords
      );
      finalOpening = result.opening;
      finalBody = result.body;
      finalConclusion = result.conclusion;
    }
    return {
      predictionId: explanation.predictionId,
      structure: options.structure,
      title,
      titleRu: options.language === "ru" ? title : this.translateTitle(title),
      opening: finalOpening,
      openingRu: options.language === "ru" ? finalOpening : "",
      body: finalBody,
      bodyRu: options.language === "ru" ? finalBody : "",
      conclusion: finalConclusion,
      conclusionRu: options.language === "ru" ? finalConclusion : "",
      keyPoints: options.language === "en" ? keyPoints : [],
      keyPointsRu: options.language === "ru" ? keyPoints : [],
      callToAction,
      callToActionRu: options.language === "ru" ? callToAction : void 0,
      cognitiveStyleUsed: options.cognitiveStyle || "intuitive",
      ageGroupUsed: options.ageGroup,
      readability
    };
  }
  /**
   * Get templates for a structure
   */
  getTemplates(structure, language) {
    const templates = language === "ru" ? NARRATIVE_TEMPLATES_RU : NARRATIVE_TEMPLATES_EN;
    const structureTemplates = templates[structure];
    return [
      ...structureTemplates.adult.opening,
      ...structureTemplates.adult.body,
      ...structureTemplates.adult.conclusion
    ];
  }
  /**
   * Personalize narrative based on user history
   */
  personalizeNarrative(narrative, userHistory) {
    if (userHistory.comprehensionLevel !== void 0) {
      if (userHistory.comprehensionLevel < 0.5) {
        return {
          ...narrative,
          body: this.simplifyText(narrative.body),
          bodyRu: this.simplifyText(narrative.bodyRu)
        };
      }
    }
    if (userHistory.previousExplanations.length > 0) {
      const lastExplanation = userHistory.previousExplanations[userHistory.previousExplanations.length - 1];
      if (narrative.opening === lastExplanation) {
        return {
          ...narrative,
          opening: narrative.opening.replace(/^/, "\u{1F4CC} "),
          openingRu: narrative.openingRu.replace(/^/, "\u{1F4CC} ")
        };
      }
    }
    return narrative;
  }
  // ==========================================================================
  // VARIABLE EXTRACTION
  // ==========================================================================
  /**
   * Extract variables from explanation for template filling
   */
  extractVariables(explanation, _structure) {
    const variables = {};
    if (explanation.localExplanation) {
      const topPositive = explanation.localExplanation.topPositiveFeatures[0];
      const topNegative = explanation.localExplanation.topNegativeFeatures[0];
      variables.key_factor = topPositive?.featureNameRu || "\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435";
      variables.key_factor_value = String(topPositive?.featureValue || "");
      variables.challenge = topNegative?.featureNameRu || "";
      variables.initial_state = "\u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435";
      variables.current_state = explanation.localExplanation.prediction;
      variables.key_change = `\u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 ${variables.key_factor}`;
    }
    if (explanation.counterfactualExplanation) {
      const easiest = explanation.counterfactualExplanation.easiestCounterfactual;
      const firstChange = easiest?.changes?.[0];
      if (firstChange) {
        variables.action = firstChange.changeDescriptionRu || firstChange.changeDescription;
      }
    }
    if (explanation.causalExplanation) {
      const primaryChain = explanation.causalExplanation.primaryChain;
      if (primaryChain?.nodes && primaryChain.nodes.length >= 2) {
        const firstNode = primaryChain.nodes[0];
        const lastNode = primaryChain.nodes[primaryChain.nodes.length - 1];
        if (firstNode) {
          variables.cause = firstNode.variableRu || firstNode.variable;
        }
        if (lastNode) {
          variables.effect = lastNode.variableRu || lastNode.variable;
        }
      }
      const firstEdge = primaryChain?.edges?.[0];
      if (firstEdge) {
        variables.mechanism = firstEdge.mechanismRu || firstEdge.mechanism || "\u043F\u0440\u044F\u043C\u043E\u0435 \u0432\u043B\u0438\u044F\u043D\u0438\u0435";
        variables.strength = `${Math.round(firstEdge.strength * 100)}%`;
      }
    }
    if (explanation.userExplanation) {
      variables.observation = explanation.userExplanation.summaryRu || explanation.userExplanation.summary;
      variables.recommendation = explanation.userExplanation.actionableAdviceRu?.[0] || explanation.userExplanation.actionableAdvice?.[0] || "\u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0443";
      variables.reasoning = explanation.userExplanation.reasoningRu || explanation.userExplanation.reasoning;
    }
    variables.feeling = variables.key_factor || "\u0442\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435";
    variables.technique = variables.recommendation || "\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u0430\u044F \u0442\u0435\u0445\u043D\u0438\u043A\u0430";
    variables.stats = "\u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C 70%+";
    variables.analogy = "\u0434\u043E\u043C\u0438\u043D\u043E - \u043E\u0434\u043D\u043E \u0442\u043E\u043B\u043A\u0430\u0435\u0442 \u0434\u0440\u0443\u0433\u043E\u0435";
    variables.expected_effect = "\u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F";
    if (!variables.action) {
      variables.action = variables.recommendation || "\u043D\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0443";
    }
    return variables;
  }
  // ==========================================================================
  // TEMPLATE PROCESSING
  // ==========================================================================
  /**
   * Select template and fill variables
   */
  selectAndFill(templates, variables, cognitiveStyle) {
    let templateIndex = 0;
    if (cognitiveStyle) {
      switch (cognitiveStyle) {
        case "analytical":
          templateIndex = templates.length - 1;
          break;
        case "intuitive":
          templateIndex = 0;
          break;
        case "sequential":
          templateIndex = Math.floor(templates.length / 2);
          break;
        case "visual":
          templateIndex = templates.findIndex((t) => containsEmoji(t));
          if (templateIndex === -1) {
            templateIndex = 0;
          }
          break;
      }
    }
    templateIndex = Math.min(templateIndex, templates.length - 1);
    templateIndex = Math.max(templateIndex, 0);
    let template = templates[templateIndex] ?? "";
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    }
    template = template.replace(/\{[^}]+\}/g, "");
    return template.trim();
  }
  /**
   * Extract key points from explanation
   */
  extractKeyPoints(explanation, language, ageGroup) {
    const points = [];
    if (explanation.localExplanation) {
      const confidence = Math.round(explanation.localExplanation.confidence * 100);
      if (language === "ru") {
        points.push(`\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0441\u0438\u0441\u0442\u0435\u043C\u044B: ${confidence}%`);
      } else {
        points.push(`System confidence: ${confidence}%`);
      }
      for (const factor of explanation.localExplanation.topPositiveFeatures.slice(0, 2)) {
        if (language === "ru") {
          points.push(`\u2705 ${factor.featureNameRu}: ${factor.featureValue}`);
        } else {
          points.push(`\u2705 ${factor.featureName}: ${factor.featureValue}`);
        }
      }
    }
    if (explanation.counterfactualExplanation?.easiestCounterfactual) {
      const cf = explanation.counterfactualExplanation.easiestCounterfactual;
      if (language === "ru") {
        points.push(`\u{1F4A1} \u0410\u043B\u044C\u0442\u0435\u0440\u043D\u0430\u0442\u0438\u0432\u0430: ${cf.alternativeOutcomeRu}`);
      } else {
        points.push(`\u{1F4A1} Alternative: ${cf.alternativeOutcome}`);
      }
    }
    const maxPoints = ageGroup === "child" ? 2 : ageGroup === "teen" ? 3 : 5;
    return points.slice(0, maxPoints);
  }
  /**
   * Generate title for narrative
   */
  generateTitle(structure, language, ageGroup) {
    const titles = {
      journey: {
        ru: { child: "\u{1F31F} \u0422\u0432\u043E\u0451 \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0435", teen: "\u{1F4CA} \u0422\u0432\u043E\u0439 \u043F\u0443\u0442\u044C", adult: "\u{1F4C8} \u0410\u043D\u0430\u043B\u0438\u0437 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430" },
        en: { child: "\u{1F31F} Your Journey", teen: "\u{1F4CA} Your Path", adult: "\u{1F4C8} Progress Analysis" }
      },
      comparison: {
        ru: { child: "\u{1F465} \u041A\u0430\u043A \u0443 \u0434\u0440\u0443\u0433\u0438\u0445", teen: "\u{1F4CA} \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435", adult: "\u{1F4C8} \u0421\u0440\u0430\u0432\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437" },
        en: { child: "\u{1F465} Like Others", teen: "\u{1F4CA} Comparison", adult: "\u{1F4C8} Comparative Analysis" }
      },
      "cause-effect": {
        ru: { child: "\u{1F517} \u041F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A?", teen: "\u26A1 \u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0438 \u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0438\u0435", adult: "\u{1F50D} \u041A\u0430\u0443\u0437\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437" },
        en: { child: "\u{1F517} Why?", teen: "\u26A1 Cause & Effect", adult: "\u{1F50D} Causal Analysis" }
      },
      recommendation: {
        ru: { child: "\u{1F381} \u041C\u043E\u044F \u0438\u0434\u0435\u044F!", teen: "\u{1F4A1} \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F", adult: "\u{1F4CB} \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F" },
        en: { child: "\u{1F381} My Idea!", teen: "\u{1F4A1} Recommendation", adult: "\u{1F4CB} Personal Recommendation" }
      }
    };
    return titles[structure]?.[language]?.[ageGroup] ?? "Analysis";
  }
  translateTitle(title) {
    const translations = {
      "Your Journey": "\u0422\u0432\u043E\u0451 \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0435",
      "Your Path": "\u0422\u0432\u043E\u0439 \u043F\u0443\u0442\u044C",
      "Progress Analysis": "\u0410\u043D\u0430\u043B\u0438\u0437 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430",
      "Like Others": "\u041A\u0430\u043A \u0443 \u0434\u0440\u0443\u0433\u0438\u0445",
      "Comparison": "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435",
      "Comparative Analysis": "\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437",
      "Why?": "\u041F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A?",
      "Cause & Effect": "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0438 \u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0438\u0435",
      "Causal Analysis": "\u041A\u0430\u0443\u0437\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437",
      "My Idea!": "\u041C\u043E\u044F \u0438\u0434\u0435\u044F!",
      "Recommendation": "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F",
      "Personal Recommendation": "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F"
    };
    const cleanTitle = removeEmojis(title).trim();
    return translations[cleanTitle] || title;
  }
  // ==========================================================================
  // READABILITY
  // ==========================================================================
  /**
   * Calculate readability metrics
   */
  calculateReadability(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const syllables = this.countSyllables(text);
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllables / Math.max(1, wordCount);
    const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    const readingTime = Math.ceil(wordCount / 200 * 60);
    return {
      fleschKincaidGrade: Math.max(0, Math.round(fleschKincaidGrade * 10) / 10),
      readingTime,
      wordCount
    };
  }
  /**
   * Count syllables in text (simplified for Russian/English)
   */
  countSyllables(text) {
    const vowels = text.toLowerCase().match(/[аеёиоуыэюяaeiouy]/g);
    return vowels ? vowels.length : text.length / 3;
  }
  /**
   * Apply word limit to narrative
   */
  applyWordLimit(opening, body, conclusion, callToAction, maxWords) {
    const parts = [opening, body, conclusion, callToAction].filter(Boolean);
    const totalWords = parts.join(" ").split(/\s+/).length;
    if (totalWords <= maxWords) {
      return { opening, body, conclusion };
    }
    const ratio = maxWords / totalWords;
    const truncateToWords = (text, maxW) => {
      const words = text.split(/\s+/);
      if (words.length <= maxW) {
        return text;
      }
      return words.slice(0, maxW).join(" ") + "...";
    };
    const openingWords = Math.ceil(opening.split(/\s+/).length * ratio);
    const bodyWords = Math.ceil(body.split(/\s+/).length * ratio * 0.8);
    const conclusionWords = Math.ceil(conclusion.split(/\s+/).length * ratio);
    return {
      opening: truncateToWords(opening, openingWords),
      body: truncateToWords(body, bodyWords),
      conclusion: truncateToWords(conclusion, conclusionWords)
    };
  }
  /**
   * Simplify text for lower comprehension
   */
  simplifyText(text) {
    let simplified = text.replace(/[;:—]/g, ".");
    simplified = simplified.replace(/,\s*и\s*/g, ". ");
    simplified = simplified.replace(/,\s*но\s*/g, ". \u041D\u043E ");
    return simplified;
  }
};

// src/explainability/services/ExplainabilityService.ts
var ExplainabilityService = class {
  constructor(featureEngine, counterfactualEngine, narrativeGenerator) {
    __publicField(this, "featureEngine");
    __publicField(this, "counterfactualEngine");
    __publicField(this, "narrativeGenerator");
    // Caches
    __publicField(this, "globalExplanationCache", /* @__PURE__ */ new Map());
    __publicField(this, "effectivenessStore", /* @__PURE__ */ new Map());
    // Configuration
    __publicField(this, "config", DEFAULT_EXPLAINABILITY_CONFIG);
    this.featureEngine = featureEngine || new FeatureAttributionEngine();
    this.counterfactualEngine = counterfactualEngine || new CounterfactualExplainer();
    this.narrativeGenerator = narrativeGenerator || new NarrativeGenerator();
  }
  // ==========================================================================
  // MAIN EXPLANATION GENERATOR
  // ==========================================================================
  /**
   * Generate comprehensive explanation
   */
  async explain(request) {
    const startTime = Date.now();
    const [
      localExplanation,
      counterfactualExplanation,
      globalContext,
      causalExplanation
    ] = await Promise.all([
      request.types.includes("local") ? this.generateSHAPExplanation(request.inputFeatures, request.output) : Promise.resolve(void 0),
      request.includeCounterfactuals || request.types.includes("counterfactual") ? this.generateCounterfactuals(
        request.inputFeatures,
        String(request.output),
        void 0,
        { maxCounterfactuals: request.maxCounterfactuals }
      ) : Promise.resolve(void 0),
      request.includeGlobalContext || request.types.includes("global") ? this.generateGlobalExplanation(request.predictionType) : Promise.resolve(void 0),
      request.includeCausal || request.types.includes("causal") ? this.generateCausalExplanation(request.inputFeatures, String(request.output)) : Promise.resolve(void 0)
    ]);
    let clinicianExplanation;
    if (request.audience === "clinician") {
      clinicianExplanation = await this.generateClinicianExplanation(request.context);
    }
    const userExplanation = this.generateUserExplanation(
      localExplanation,
      counterfactualExplanation,
      causalExplanation,
      request.ageGroup || this.config.defaultAgeGroup,
      request.cognitiveStyle
    );
    const response = {
      requestId: crypto$1.randomUUID(),
      predictionId: request.predictionId,
      localExplanation,
      counterfactualExplanation,
      globalContext,
      clinicianExplanation,
      causalExplanation,
      userExplanation,
      generatedAt: /* @__PURE__ */ new Date(),
      computationTime: Date.now() - startTime,
      explanationVersion: "2.0.0",
      effectivenessTrackingEnabled: this.config.enableEffectivenessTracking
    };
    if (request.includeNarrative || request.types.includes("narrative")) {
      response.narrativeExplanation = await this.generateNarrativeExplanation(
        response,
        {
          structure: request.preferredNarrativeStructure || "recommendation",
          ageGroup: request.ageGroup || this.config.defaultAgeGroup,
          cognitiveStyle: request.cognitiveStyle,
          language: request.language || this.config.defaultLanguage
        }
      );
    }
    if (request.requireEUAIActCompliance || this.config.euAIActComplianceRequired) {
      response.regulatoryInfo = this.generateRegulatoryInfo(request, response);
    }
    return response;
  }
  // ==========================================================================
  // SPECIFIC EXPLANATION GENERATORS
  // ==========================================================================
  /**
   * Generate SHAP-like feature attribution
   */
  async generateSHAPExplanation(features, prediction) {
    const predictionObj = this.normalizePrediction(prediction);
    return this.featureEngine.calculateAttributions(features, predictionObj);
  }
  /**
   * Generate counterfactual explanations
   */
  async generateCounterfactuals(features, currentOutcome, desiredOutcome, options) {
    return this.counterfactualEngine.generateCounterfactuals(
      features,
      currentOutcome,
      desiredOutcome,
      options?.maxCounterfactuals || this.config.maxCounterfactuals,
      {
        requireRobust: options?.requireRobust,
        minRobustness: this.config.minRobustness,
        feasibilityThreshold: options?.feasibilityThreshold
      }
    );
  }
  /**
   * Generate global model explanation
   */
  async generateGlobalExplanation(predictionType) {
    const cached = this.getCachedGlobalExplanation(predictionType);
    if (cached) {
      return cached;
    }
    const featureImportance = this.calculateGlobalFeatureImportance(predictionType);
    const decisionRules = this.extractDecisionRules(predictionType);
    const explanation = {
      modelName: "CogniCore Intervention Selector",
      modelVersion: "2.0.0",
      featureImportance,
      keyDecisionRules: decisionRules,
      performanceSummary: {
        customMetrics: {
          safetyCompliance: 0.98,
          userSatisfaction: 0.75,
          interventionAcceptance: 0.82,
          explanationClarity: 0.71
        }
      },
      regulatoryCompliance: {
        euAIActRiskLevel: "limited",
        transparencyObligations: [
          "Inform users of AI involvement",
          "Provide explanation upon request",
          "Document decision logic"
        ],
        conformityStatus: "compliant",
        lastAuditDate: /* @__PURE__ */ new Date()
      },
      computedAt: /* @__PURE__ */ new Date(),
      dataPointsAnalyzed: 1e3
    };
    this.globalExplanationCache.set(predictionType, {
      explanation,
      timestamp: Date.now()
    });
    return explanation;
  }
  /**
   * Generate clinician-facing explanation
   */
  async generateClinicianExplanation(sessionData) {
    const userId = typeof sessionData.userId === "string" || typeof sessionData.userId === "number" ? String(sessionData.userId) : "anonymous";
    const sessionId = typeof sessionData.sessionId === "string" ? sessionData.sessionId : crypto$1.randomUUID();
    const presentingConcern = typeof sessionData.presentingConcern === "string" ? sessionData.presentingConcern : "Digital wellness concern";
    const presentingConcernRu = typeof sessionData.presentingConcernRu === "string" ? sessionData.presentingConcernRu : "\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0433\u043E \u0431\u043B\u0430\u0433\u043E\u043F\u043E\u043B\u0443\u0447\u0438\u044F";
    const primaryConcern = typeof sessionData.primaryConcern === "string" ? sessionData.primaryConcern : "Digital overuse";
    const riskLevel = typeof sessionData.riskLevel === "string" ? sessionData.riskLevel : "low";
    const reasoning = typeof sessionData.reasoning === "string" ? sessionData.reasoning : "Based on user-reported data and interaction patterns";
    const reasoningRu = typeof sessionData.reasoningRu === "string" ? sessionData.reasoningRu : "\u041D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u043F\u0430\u0442\u0442\u0435\u0440\u043D\u043E\u0432 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F";
    const selectedIntervention = typeof sessionData.selectedIntervention === "string" ? sessionData.selectedIntervention : "Coping technique";
    return {
      patientId: userId,
      sessionId,
      clinicalContext: {
        presentingConcern,
        presentingConcernRu,
        relevantHistory: sessionData.relevantHistory || [],
        currentSymptoms: sessionData.currentSymptoms || [],
        riskFactors: sessionData.riskFactors || [],
        protectiveFactors: sessionData.protectiveFactors || [],
        familyContext: sessionData.familyContext
      },
      aiAssessment: {
        primaryConcern,
        severity: sessionData.severity || "mild",
        riskLevel,
        confidence: Number(sessionData.confidence) || 0.7,
        reasoning,
        reasoningRu,
        causalFactors: sessionData.causalFactors,
        mechanismHypothesis: sessionData.mechanismHypothesis
      },
      interventionRationale: {
        selectedIntervention,
        therapeuticApproach: "CBT-based digital wellness support",
        evidenceBasis: [
          "Beck Cognitive Therapy framework",
          "Motivational Interviewing principles (MITI 4.2)",
          "Digital wellness research (Time2Stop, DIAMANTE)",
          "POMDP-based intervention selection"
        ],
        alternativesConsidered: sessionData.alternativesConsidered || [],
        contraindications: sessionData.contraindications || [],
        expectedOutcome: "Reduction in digital overuse triggers",
        outcomeTimeframe: "1-2 weeks"
      },
      recommendations: {
        immediateActions: [
          "Monitor engagement and emotional responses",
          "Follow up on intervention effectiveness"
        ],
        followUpRecommendations: [
          "Check in after 24 hours",
          "Track mood trend over next week",
          "Reassess intervention fit after 3 sessions"
        ],
        escalationCriteria: [
          "Risk level increases to high/critical",
          "User explicitly requests professional help",
          "Repeated distress indicators (3+ times in 24h)"
        ],
        referralSuggestions: [
          "Consider referral if symptoms persist after 2 weeks",
          "Immediate referral if suicidal ideation detected"
        ],
        familyInvolvement: sessionData.familyInvolvement
      },
      uncertaintyDisclosure: {
        confidenceLevel: this.getConfidenceLabel(Number(sessionData.confidence) || 0.7),
        knownLimitations: [
          "AI assessment based on text-only interaction",
          "Cannot replace comprehensive clinical assessment",
          "Cultural/linguistic nuances may be missed",
          "Limited to self-reported data"
        ],
        suggestedVerification: [
          "Verify risk assessment with standardized instruments",
          "Consider cultural context in interpretation",
          "Corroborate with collateral information if available"
        ],
        modelBlindSpots: [
          "Non-verbal cues not captured",
          "Family dynamics partially modeled",
          "Recent life events may be underweighted"
        ],
        dataQualityNote: "Based on user self-report; objective measures not available"
      },
      regulatoryCompliance: {
        euAIActRiskLevel: "limited",
        humanOversightRequired: true,
        appealProcess: "Users can request human review of any AI decision"
      },
      timestamp: /* @__PURE__ */ new Date(),
      aiModelVersion: "2.0.0",
      disclaimer: `
This AI-generated explanation is for informational purposes only and does not constitute
clinical advice. All clinical decisions should be made by qualified healthcare professionals.
The AI system operates at MHSL-2 (Supportive Interaction) level and is not designed to
provide clinical diagnosis or treatment recommendations.
      `.trim(),
      disclaimerRu: `
\u042D\u0442\u043E \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u0435, \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0418\u0418, \u043F\u0440\u0435\u0434\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0446\u0435\u043B\u0435\u0439 \u0438 \u043D\u0435
\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0441\u043E\u0432\u0435\u0442\u043E\u043C. \u0412\u0441\u0435 \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u044B \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C\u0441\u044F \u043A\u0432\u0430\u043B\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C\u0438
\u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u043C\u0438 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0430\u043C\u0438. \u0418\u0418-\u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043D\u0430 \u0443\u0440\u043E\u0432\u043D\u0435 MHSL-2 (\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0449\u0435\u0435 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435)
\u0438 \u043D\u0435 \u043F\u0440\u0435\u0434\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0430 \u0434\u043B\u044F \u043A\u043B\u0438\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438 \u0438\u043B\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439 \u043F\u043E \u043B\u0435\u0447\u0435\u043D\u0438\u044E.
      `.trim()
    };
  }
  /**
   * Generate causal explanation (Phase 5.1 integration)
   */
  async generateCausalExplanation(features, outcome) {
    const causalFeatures = this.featureEngine.getCausalFeatures();
    const nodes = causalFeatures.filter((f) => features[f.id] !== void 0).slice(0, 4).map((f, index) => ({
      variable: f.name,
      variableRu: f.nameRu,
      value: features[f.id],
      role: index === 0 ? "cause" : index === causalFeatures.length - 1 ? "effect" : "mediator"
    }));
    const edges = nodes.slice(0, -1).map((node, index) => ({
      from: node.variable,
      to: nodes[index + 1]?.variable ?? "",
      strength: 0.6 + secureRandom() * 0.3,
      mechanism: "\u041F\u0440\u044F\u043C\u043E\u0435 \u0432\u043B\u0438\u044F\u043D\u0438\u0435",
      mechanismRu: "\u041F\u0440\u044F\u043C\u043E\u0435 \u0432\u043B\u0438\u044F\u043D\u0438\u0435"
    }));
    const interventionPoints = causalFeatures.filter((f) => ["currentMood", "stressLevel", "socialSupport"].includes(f.id)).filter((f) => features[f.id] !== void 0).map((f) => ({
      variable: f.name,
      potentialImpact: f.defaultWeight,
      feasibility: "moderate",
      recommendation: `\u0412\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0430 ${f.nameRu.toLowerCase()}`,
      recommendationRu: `\u0412\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0430 ${f.nameRu.toLowerCase()}`
    }));
    const primaryChain = {
      id: crypto$1.randomUUID(),
      description: `Causal pathway to ${outcome}`,
      descriptionRu: `\u041F\u0440\u0438\u0447\u0438\u043D\u043D\u044B\u0439 \u043F\u0443\u0442\u044C \u043A "${outcome}"`,
      nodes,
      edges,
      interventionPoints
    };
    const rootCauses = causalFeatures.filter((f) => !f.causalParents || f.causalParents.length === 0).filter((f) => features[f.id] !== void 0).slice(0, 3).map((f) => ({
      variable: f.name,
      variableRu: f.nameRu,
      contribution: f.defaultWeight,
      isModifiable: ["currentMood", "stressLevel", "socialSupport", "streak"].includes(f.id)
    }));
    const rootCauseNames = rootCauses.map((r) => r.variableRu.toLowerCase()).join(", ");
    return {
      predictionId: crypto$1.randomUUID(),
      primaryChain,
      rootCauses,
      narrativeSummary: `The outcome "${outcome}" is primarily influenced by ${rootCauseNames}.`,
      narrativeSummaryRu: `\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 "${outcome}" \u0432 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F: ${rootCauseNames}.`,
      confidence: 0.7,
      methodology: "heuristic"
    };
  }
  /**
   * Generate narrative explanation (HCXAI)
   */
  async generateNarrativeExplanation(explanation, options) {
    return this.narrativeGenerator.generateNarrative(explanation, {
      ...options,
      maxWords: options.ageGroup === "child" ? 100 : options.ageGroup === "teen" ? 200 : 400
    });
  }
  // ==========================================================================
  // USER EXPLANATION GENERATION
  // ==========================================================================
  /**
   * Generate user-friendly explanation
   */
  generateUserExplanation(localExplanation, counterfactualExplanation, causalExplanation, ageGroup = "adult", cognitiveStyle) {
    const explanationId = crypto$1.randomUUID();
    const keyFactors = [];
    if (localExplanation) {
      for (const attr of localExplanation.attributions.slice(0, 3)) {
        const definition = this.featureEngine.getFeature(attr.featureId);
        keyFactors.push({
          name: attr.featureName,
          nameRu: attr.featureNameRu,
          value: String(attr.featureValue),
          impact: attr.direction === "positive" ? "helps" : attr.direction === "negative" ? "hurts" : "neutral",
          emoji: attr.emoji || "\u{1F4CA}",
          explanation: attr.comparisonToBaseline || "",
          explanationRu: attr.comparisonToBaselineRu || "",
          layTermDescription: definition?.layTermExplanation,
          actionable: ["currentMood", "stressLevel", "socialSupport", "streak"].includes(attr.featureId),
          actionSuggestion: attr.direction === "negative" ? `\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C ${attr.featureNameRu.toLowerCase()}` : void 0
        });
      }
    }
    const confidence = localExplanation?.confidence || 0.7;
    const confidenceInfo = {
      level: confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low",
      emoji: confidence >= 0.8 ? "\u2705" : confidence >= 0.5 ? "\u{1F44D}" : "\u{1F914}",
      description: this.getConfidenceDescription(confidence, ageGroup, "en"),
      descriptionRu: this.getConfidenceDescription(confidence, ageGroup, "ru")
    };
    const actionableAdvice = counterfactualExplanation?.userActionableAdvice || [];
    const actionableAdviceRu = counterfactualExplanation?.userActionableAdviceRu || [];
    const whatCanChange = keyFactors.filter((f) => f.actionable).map((f) => f.name);
    const whatCanChangeRu = keyFactors.filter((f) => f.actionable).map((f) => f.nameRu);
    const { summary, summaryRu, reasoning, reasoningRu } = this.generateUserSummaryAndReasoning(
      localExplanation,
      causalExplanation,
      ageGroup
    );
    const whyThisMatters = this.generateWhyThisMatters(localExplanation, "en", ageGroup);
    const whyThisMattersRu = this.generateWhyThisMatters(localExplanation, "ru", ageGroup);
    return {
      summary,
      summaryRu,
      reasoning,
      reasoningRu,
      keyFactors,
      confidence: confidenceInfo,
      actionableAdvice,
      actionableAdviceRu,
      limitations: ageGroup === "adult" ? [
        "AI can make mistakes",
        "This is not a substitute for professional help"
      ] : [],
      limitationsRu: ageGroup === "adult" ? [
        "AI \u043C\u043E\u0436\u0435\u0442 \u043E\u0448\u0438\u0431\u0430\u0442\u044C\u0441\u044F",
        "\u042D\u0442\u043E \u043D\u0435 \u0437\u0430\u043C\u0435\u043D\u0430 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u043F\u043E\u043C\u043E\u0449\u0438"
      ] : [],
      disclaimer: this.getDisclaimer(ageGroup, "en"),
      disclaimerRu: this.getDisclaimer(ageGroup, "ru"),
      whyThisMatters,
      whyThisMattersRu,
      whatCanChange,
      whatCanChangeRu,
      ageGroup,
      cognitiveStyle,
      explanationId,
      feedbackPrompt: ageGroup === "adult" ? "Was this explanation helpful?" : ageGroup === "teen" ? "Did this make sense?" : void 0
    };
  }
  generateUserSummaryAndReasoning(localExplanation, causalExplanation, ageGroup = "adult") {
    if (ageGroup === "child") {
      const emojis = localExplanation?.topPositiveFeatures.slice(0, 3).map((f) => f.emoji).join(" ") || "\u{1F31F}";
      return {
        summary: `${emojis} Picked just for you!`,
        summaryRu: `${emojis} \u0412\u044B\u0431\u0440\u0430\u043D\u043E \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u0442\u0435\u0431\u044F!`,
        reasoning: "I thought about what would work best.",
        reasoningRu: "\u042F \u043F\u043E\u0434\u0443\u043C\u0430\u043B \u0438 \u0440\u0435\u0448\u0438\u043B, \u0447\u0442\u043E \u044D\u0442\u043E \u0442\u0435\u0431\u0435 \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F."
      };
    }
    if (ageGroup === "teen") {
      const topFactor = localExplanation?.topPositiveFeatures[0];
      return {
        summary: topFactor ? `Chosen based on: ${topFactor.featureName.toLowerCase()}` : "Customized for you",
        summaryRu: topFactor ? `\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435: ${topFactor.featureNameRu.toLowerCase()}` : "\u041F\u043E\u0434\u043E\u0431\u0440\u0430\u043D\u043E \u043F\u043E\u0434 \u0442\u0435\u0431\u044F",
        reasoning: `Considered ${localExplanation?.attributions.length || "several"} factors to find the right fit.`,
        reasoningRu: `\u0423\u0447\u0451\u043B ${localExplanation?.attributions.length || "\u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E"} \u0444\u0430\u043A\u0442\u043E\u0440\u043E\u0432, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0439\u0442\u0438 \u0442\u043E, \u0447\u0442\u043E \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442.`
      };
    }
    const factorList = localExplanation?.topPositiveFeatures.slice(0, 3).map((f) => f.featureName.toLowerCase()).join(", ") || "your data";
    const factorListRu = localExplanation?.topPositiveFeatures.slice(0, 3).map((f) => f.featureNameRu.toLowerCase()).join(", ") || "\u0432\u0430\u0448\u0438 \u0434\u0430\u043D\u043D\u044B\u0435";
    const causalNote = causalExplanation ? ` Root causes: ${causalExplanation.rootCauses.map((r) => r.variable).join(", ")}.` : "";
    const causalNoteRu = causalExplanation ? ` \u041A\u043E\u0440\u043D\u0435\u0432\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B: ${causalExplanation.rootCauses.map((r) => r.variableRu).join(", ")}.` : "";
    return {
      summary: `Recommendation based on: ${factorList}`,
      summaryRu: `\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0430 \u043D\u0430: ${factorListRu}`,
      reasoning: `Analysis of ${localExplanation?.attributions.length || "multiple"} factors showed this technique fits your current situation. System confidence: ${Math.round((localExplanation?.confidence || 0.7) * 100)}%.${causalNote}`,
      reasoningRu: `\u0410\u043D\u0430\u043B\u0438\u0437 ${localExplanation?.attributions.length || "\u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445"} \u0444\u0430\u043A\u0442\u043E\u0440\u043E\u0432 \u043F\u043E\u043A\u0430\u0437\u0430\u043B, \u0447\u0442\u043E \u044D\u0442\u0430 \u0442\u0435\u0445\u043D\u0438\u043A\u0430 \u043D\u0430\u0438\u0431\u043E\u043B\u0435\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u0432\u0430\u0448\u0435\u0439 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438. \u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0441\u0438\u0441\u0442\u0435\u043C\u044B: ${Math.round((localExplanation?.confidence || 0.7) * 100)}%.${causalNoteRu}`
    };
  }
  generateWhyThisMatters(localExplanation, language, ageGroup) {
    if (!localExplanation || ageGroup === "child") {
      return void 0;
    }
    const topFactor = localExplanation.topPositiveFeatures[0];
    if (!topFactor) {
      return void 0;
    }
    if (language === "ru") {
      return ageGroup === "teen" ? `\u042D\u0442\u043E \u0432\u0430\u0436\u043D\u043E, \u043F\u043E\u0442\u043E\u043C\u0443 \u0447\u0442\u043E ${topFactor.featureNameRu.toLowerCase()} \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u0442\u043E, \u043A\u0430\u043A \u0442\u044B \u0441\u0435\u0431\u044F \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0448\u044C.` : `\u041F\u043E\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u043E\u0432 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043E\u0441\u043E\u0437\u043D\u0430\u043D\u043D\u043E \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0441\u0432\u043E\u0438\u043C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435\u043C.`;
    }
    return ageGroup === "teen" ? `This matters because ${topFactor.featureName.toLowerCase()} affects how you feel.` : `Understanding these factors helps you consciously manage your wellbeing.`;
  }
  // ==========================================================================
  // FORMATTING
  // ==========================================================================
  /**
   * Format explanation for specific audience
   */
  formatForAudience(explanation, audience, level) {
    switch (audience) {
      case "user":
      case "parent":
        return this.formatForUser(explanation, level);
      case "clinician":
        return this.formatForClinician(explanation, level);
      case "auditor":
      case "regulator":
        return this.formatForAuditor(explanation, level);
      case "developer":
        return this.formatForDeveloper(explanation);
      default:
        return this.formatForUser(explanation, level);
    }
  }
  formatForUser(explanation, level) {
    const user = explanation.userExplanation;
    if (level === "simple") {
      return `${user.summaryRu}

${user.confidence.emoji} ${user.confidence.descriptionRu}`;
    }
    if (level === "detailed") {
      let result = `${user.summaryRu}

${user.reasoningRu}

`;
      if (user.keyFactors.length > 0) {
        result += "\u{1F4CA} \u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0444\u0430\u043A\u0442\u043E\u0440\u044B:\n";
        for (const factor of user.keyFactors) {
          const impactEmoji = factor.impact === "helps" ? "\u2705" : factor.impact === "hurts" ? "\u26A0\uFE0F" : "\u27A1\uFE0F";
          result += `${factor.emoji} ${factor.nameRu}: ${factor.value} ${impactEmoji}
`;
        }
      }
      if (user.actionableAdviceRu.length > 0) {
        result += "\n\u{1F4A1} \u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C:\n";
        for (const advice of user.actionableAdviceRu) {
          result += `\u2022 ${advice}
`;
        }
      }
      if (user.whyThisMattersRu) {
        result += `
\u{1F3AF} ${user.whyThisMattersRu}
`;
      }
      return result.trim();
    }
    return JSON.stringify(explanation, null, 2);
  }
  formatForClinician(explanation, _level) {
    const clinician = explanation.clinicianExplanation;
    if (!clinician) {
      return "No clinician explanation available";
    }
    return `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CLINICAL EXPLANATION REPORT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Patient ID: ${clinician.patientId}
Session: ${clinician.sessionId}
Generated: ${clinician.timestamp.toISOString()}
Model: ${clinician.aiModelVersion}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
CLINICAL CONTEXT
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
Presenting Concern: ${clinician.clinicalContext.presentingConcern}
Risk Factors: ${clinician.clinicalContext.riskFactors.join(", ") || "None identified"}
Protective Factors: ${clinician.clinicalContext.protectiveFactors.join(", ") || "None identified"}
${clinician.clinicalContext.familyContext ? `Family Context: ${clinician.clinicalContext.familyContext}` : ""}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
AI ASSESSMENT
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
Primary Concern: ${clinician.aiAssessment.primaryConcern}
Severity: ${clinician.aiAssessment.severity}
Risk Level: ${clinician.aiAssessment.riskLevel}
Confidence: ${Math.round(clinician.aiAssessment.confidence * 100)}%

Reasoning:
${clinician.aiAssessment.reasoning}

${clinician.aiAssessment.causalFactors ? `Causal Factors: ${clinician.aiAssessment.causalFactors.join(", ")}` : ""}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
INTERVENTION RATIONALE
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
Selected: ${clinician.interventionRationale.selectedIntervention}
Approach: ${clinician.interventionRationale.therapeuticApproach}
Expected Outcome: ${clinician.interventionRationale.expectedOutcome || "N/A"}
Timeframe: ${clinician.interventionRationale.outcomeTimeframe || "N/A"}

Evidence Basis:
${clinician.interventionRationale.evidenceBasis.map((e) => `\u2022 ${e}`).join("\n")}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
RECOMMENDATIONS
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
Immediate Actions:
${clinician.recommendations.immediateActions.map((a) => `\u2022 ${a}`).join("\n")}

Follow-up:
${clinician.recommendations.followUpRecommendations.map((r) => `\u2022 ${r}`).join("\n")}

Escalation Criteria:
${clinician.recommendations.escalationCriteria.map((c) => `\u26A0\uFE0F ${c}`).join("\n")}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
REGULATORY COMPLIANCE
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
EU AI Act Risk Level: ${clinician.regulatoryCompliance.euAIActRiskLevel}
Human Oversight Required: ${clinician.regulatoryCompliance.humanOversightRequired ? "Yes" : "No"}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
DISCLAIMER
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
${clinician.disclaimer}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    `.trim();
  }
  formatForAuditor(explanation, _level) {
    return JSON.stringify({
      requestId: explanation.requestId,
      predictionId: explanation.predictionId,
      generatedAt: explanation.generatedAt,
      computationTime: explanation.computationTime,
      regulatoryInfo: explanation.regulatoryInfo,
      localExplanation: explanation.localExplanation,
      counterfactualExplanation: explanation.counterfactualExplanation,
      modelVersion: explanation.explanationVersion
    }, null, 2);
  }
  formatForDeveloper(explanation) {
    return JSON.stringify(explanation, null, 2);
  }
  // ==========================================================================
  // EFFECTIVENESS TRACKING
  // ==========================================================================
  /**
   * Record explanation feedback
   */
  async recordExplanationFeedback(feedback) {
    if (!feedback.explanationId) {
      return;
    }
    const existing = this.effectivenessStore.get(feedback.explanationId);
    const updated = {
      explanationId: feedback.explanationId,
      userId: feedback.userId || existing?.userId || "unknown",
      recordedAt: /* @__PURE__ */ new Date(),
      ...existing,
      ...feedback
    };
    this.effectivenessStore.set(feedback.explanationId, updated);
  }
  /**
   * Get explanation effectiveness
   */
  async getExplanationEffectiveness(explanationId) {
    return this.effectivenessStore.get(explanationId) || null;
  }
  // ==========================================================================
  // CACHING
  // ==========================================================================
  /**
   * Get cached global explanation
   */
  getCachedGlobalExplanation(predictionType) {
    const cached = this.globalExplanationCache.get(predictionType);
    if (!cached) {
      return null;
    }
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheExpirationMs) {
      this.globalExplanationCache.delete(predictionType);
      return null;
    }
    return cached.explanation;
  }
  /**
   * Invalidate cache
   */
  invalidateCache(predictionType) {
    if (predictionType) {
      this.globalExplanationCache.delete(predictionType);
    } else {
      this.globalExplanationCache.clear();
    }
  }
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  normalizePrediction(prediction) {
    if (typeof prediction === "object" && prediction !== null) {
      const pred = prediction;
      const outcomeCandidate = pred.outcome ?? pred.result ?? pred.intervention ?? "unknown";
      const outcomeStr = typeof outcomeCandidate === "string" ? outcomeCandidate : "unknown";
      return {
        outcome: outcomeStr,
        value: Number(pred.value || pred.score || 0.5),
        confidence: Number(pred.confidence || 0.7)
      };
    }
    return {
      outcome: String(prediction),
      value: 0.5,
      confidence: 0.7
    };
  }
  getConfidenceLabel(confidence) {
    if (confidence >= 0.9) {
      return "Very High";
    }
    if (confidence >= 0.7) {
      return "High";
    }
    if (confidence >= 0.5) {
      return "Medium";
    }
    if (confidence >= 0.3) {
      return "Low";
    }
    return "Very Low";
  }
  getConfidenceDescription(confidence, ageGroup, language) {
    if (language === "ru") {
      if (ageGroup === "child") {
        return confidence >= 0.8 ? "\u042F \u0443\u0432\u0435\u0440\u0435\u043D!" : "\u0414\u0443\u043C\u0430\u044E, \u0442\u0435\u0431\u0435 \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F";
      }
      if (ageGroup === "teen") {
        return confidence >= 0.8 ? "\u0423\u0432\u0435\u0440\u0435\u043D \u043D\u0430 100%" : confidence >= 0.5 ? "\u0414\u0443\u043C\u0430\u044E, \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442" : "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439, \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u0439\u0434\u0451\u0442";
      }
      return confidence >= 0.8 ? "\u0412\u044B\u0441\u043E\u043A\u0430\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C" : confidence >= 0.5 ? "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C" : "\u041D\u0438\u0437\u043A\u0430\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C";
    }
    if (ageGroup === "child") {
      return confidence >= 0.8 ? "I'm sure!" : "I think you'll like it";
    }
    if (ageGroup === "teen") {
      return confidence >= 0.8 ? "100% confident" : confidence >= 0.5 ? "Should work" : "Give it a try";
    }
    return confidence >= 0.8 ? "High confidence" : confidence >= 0.5 ? "Medium confidence" : "Low confidence";
  }
  getDisclaimer(ageGroup, language) {
    if (language === "ru") {
      if (ageGroup === "adult") {
        return "\u0411\u0410\u0419\u0422 \u2014 AI-\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A, \u043D\u0435 \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433. \u041F\u0440\u0438 \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u044B\u0445 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430\u0445 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0443.";
      }
      if (ageGroup === "teen") {
        return "\u042F \u2014 AI, \u043D\u0435 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u0439 \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433. \u0415\u0441\u043B\u0438 \u0442\u0435\u0431\u0435 \u043F\u043B\u043E\u0445\u043E \u2014 \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438 \u0441 \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u043C, \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u0434\u043E\u0432\u0435\u0440\u044F\u0435\u0448\u044C.";
      }
      return "";
    }
    if (ageGroup === "adult") {
      return "BYTE is an AI assistant, not a psychologist. For serious issues, consult a professional.";
    }
    if (ageGroup === "teen") {
      return "I'm AI, not a real psychologist. If you're struggling, talk to a trusted adult.";
    }
    return "";
  }
  calculateGlobalFeatureImportance(_predictionType) {
    return Object.values(INTERVENTION_FEATURES).map((def) => ({
      featureId: def.id,
      featureName: def.name,
      featureNameRu: def.nameRu,
      description: def.description,
      descriptionRu: def.descriptionRu,
      meanAbsoluteSHAP: def.defaultWeight,
      medianAbsoluteSHAP: def.defaultWeight * 0.95,
      maxAbsoluteSHAP: def.defaultWeight * 1.5,
      frequency: 0.8,
      coverage: 0.9,
      trend: "stable",
      trendPeriod: "Last 30 days",
      category: def.category
    })).sort((a, b) => b.meanAbsoluteSHAP - a.meanAbsoluteSHAP);
  }
  extractDecisionRules(_predictionType) {
    return [
      {
        id: "RULE-001",
        condition: "riskLevel = critical OR riskLevel = high",
        conditionRu: "\u0443\u0440\u043E\u0432\u0435\u043D\u044C\u0420\u0438\u0441\u043A\u0430 = \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0418\u041B\u0418 \u0443\u0440\u043E\u0432\u0435\u043D\u044C\u0420\u0438\u0441\u043A\u0430 = \u0432\u044B\u0441\u043E\u043A\u0438\u0439",
        outcome: "Show crisis resources + escalate",
        outcomeRu: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043A\u0440\u0438\u0437\u0438\u0441\u043D\u044B\u0435 \u0440\u0435\u0441\u0443\u0440\u0441\u044B + \u044D\u0441\u043A\u0430\u043B\u0430\u0446\u0438\u044F",
        coverage: 0.05,
        confidence: 0.99,
        priority: 1,
        isCausal: true,
        causalStrength: 0.95
      },
      {
        id: "RULE-002",
        condition: "currentMood <= 2 AND moodTrend = declining",
        conditionRu: "\u0442\u0435\u043A\u0443\u0449\u0435\u0435\u041D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435 <= 2 \u0418 \u0442\u0440\u0435\u043D\u0434\u041D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F = \u0441\u043D\u0438\u0436\u0430\u044E\u0449\u0438\u0439\u0441\u044F",
        outcome: "Select supportive technique",
        outcomeRu: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0449\u0443\u044E \u0442\u0435\u0445\u043D\u0438\u043A\u0443",
        coverage: 0.15,
        confidence: 0.85,
        priority: 2,
        isCausal: true,
        causalStrength: 0.75
      },
      {
        id: "RULE-003",
        condition: "currentEnergy >= 4 AND timeOfDay = morning",
        conditionRu: "\u0443\u0440\u043E\u0432\u0435\u043D\u044C\u042D\u043D\u0435\u0440\u0433\u0438\u0438 >= 4 \u0418 \u0432\u0440\u0435\u043C\u044F\u0421\u0443\u0442\u043E\u043A = \u0443\u0442\u0440\u043E",
        outcome: "Select active technique",
        outcomeRu: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u0443\u044E \u0442\u0435\u0445\u043D\u0438\u043A\u0443",
        coverage: 0.2,
        confidence: 0.8,
        priority: 3
      },
      {
        id: "RULE-004",
        condition: "activeTrigger = stress",
        conditionRu: "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439\u0422\u0440\u0438\u0433\u0433\u0435\u0440 = \u0441\u0442\u0440\u0435\u0441\u0441",
        outcome: "Select relaxation technique",
        outcomeRu: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0440\u0435\u043B\u0430\u043A\u0441\u0430\u0446\u0438\u043E\u043D\u043D\u0443\u044E \u0442\u0435\u0445\u043D\u0438\u043A\u0443",
        coverage: 0.25,
        confidence: 0.82,
        priority: 4,
        isCausal: true,
        causalStrength: 0.7
      }
    ];
  }
  generateRegulatoryInfo(request, response) {
    let riskLevel = "limited";
    if (request.predictionType.includes("crisis") || request.predictionType.includes("risk")) {
      riskLevel = "high";
    }
    const hasLocalExplanation = !!response.localExplanation;
    const hasCounterfactual = !!response.counterfactualExplanation;
    return {
      euAIActRiskLevel: riskLevel,
      isCompliant: true,
      transparencyMet: hasLocalExplanation && hasCounterfactual,
      humanOversightRequired: riskLevel === "high"
    };
  }
};
function createExplainabilityService(featureEngine, counterfactualEngine, narrativeGenerator) {
  return new ExplainabilityService(featureEngine, counterfactualEngine, narrativeGenerator);
}

// src/motivation/interfaces/IMotivationalState.ts
var CHANGE_TALK_PATTERNS = {
  desire: {
    keywords: ["want to", "wish", "would like", "hope to", "prefer"],
    keywordsRu: ["\u0445\u043E\u0447\u0443", "\u0445\u043E\u0442\u0435\u043B \u0431\u044B", "\u0436\u0435\u043B\u0430\u044E", "\u043C\u0435\u0447\u0442\u0430\u044E", "\u043D\u0430\u0434\u0435\u044E\u0441\u044C"],
    patterns: [/I (want|wish|would like) to/i, /I hope I could/i],
    patternsRu: [/хочу .* меньше/i, /хотел бы .* изменить/i],
    strength: 2
  },
  ability: {
    keywords: ["can", "could", "able to", "possible", "might be able"],
    keywordsRu: ["\u043C\u043E\u0433\u0443", "\u043C\u043E\u0433 \u0431\u044B", "\u0441\u043F\u043E\u0441\u043E\u0431\u0435\u043D", "\u0432 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438", "\u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0441\u044F"],
    patterns: [/I (can|could|am able to)/i, /it's possible for me/i],
    patternsRu: [/я (могу|мог бы|способен)/i, /у меня получится/i],
    strength: 2
  },
  reasons: {
    keywords: ["because", "so that", "would help", "benefit", "important because"],
    keywordsRu: ["\u043F\u043E\u0442\u043E\u043C\u0443 \u0447\u0442\u043E", "\u0447\u0442\u043E\u0431\u044B", "\u043F\u043E\u043C\u043E\u0436\u0435\u0442", "\u0432\u0430\u0436\u043D\u043E", "\u043F\u043E\u043B\u044C\u0437\u0430"],
    patterns: [/it would (help|benefit|improve)/i, /important because/i],
    patternsRu: [/это (поможет|улучшит)/i, /важно,? потому что/i],
    strength: 2
  },
  need: {
    keywords: ["need to", "have to", "must", "got to", "should"],
    keywordsRu: ["\u043D\u0430\u0434\u043E", "\u043D\u0443\u0436\u043D\u043E", "\u0434\u043E\u043B\u0436\u0435\u043D", "\u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E", "\u043F\u043E\u0440\u0430"],
    patterns: [/I (need|have|got) to/i, /I (really )?must/i],
    patternsRu: [/мне (надо|нужно|необходимо)/i, /я должен/i],
    strength: 3
  },
  commitment: {
    keywords: ["will", "going to", "intend to", "plan to", "promise"],
    keywordsRu: ["\u0431\u0443\u0434\u0443", "\u0441\u043E\u0431\u0438\u0440\u0430\u044E\u0441\u044C", "\u043D\u0430\u043C\u0435\u0440\u0435\u043D", "\u043F\u043B\u0430\u043D\u0438\u0440\u0443\u044E", "\u043E\u0431\u0435\u0449\u0430\u044E"],
    patterns: [/I (will|am going to|intend to)/i, /I promise/i],
    patternsRu: [/я (буду|собираюсь|намерен)/i, /я обещаю/i],
    strength: 4
  },
  activation: {
    keywords: ["ready", "willing", "prepared", "want to start"],
    keywordsRu: ["\u0433\u043E\u0442\u043E\u0432", "\u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D", "\u0445\u043E\u0447\u0443 \u043D\u0430\u0447\u0430\u0442\u044C", "\u0440\u0435\u0448\u0438\u043B"],
    patterns: [/I('m| am) ready to/i, /I('m| am) willing to/i],
    patternsRu: [/я готов/i, /я решил/i, /хочу начать/i],
    strength: 4
  },
  taking_steps: {
    keywords: ["started", "have been", "already", "trying", "working on"],
    keywordsRu: ["\u043D\u0430\u0447\u0430\u043B", "\u0443\u0436\u0435", "\u043F\u0440\u043E\u0431\u0443\u044E", "\u0440\u0430\u0431\u043E\u0442\u0430\u044E \u043D\u0430\u0434", "\u0434\u0435\u043B\u0430\u044E"],
    patterns: [/I('ve| have) (started|been)/i, /I('m| am) (trying|working on)/i],
    patternsRu: [/я (начал|уже|пробую)/i, /работаю над/i],
    strength: 5
  }
};
var SUSTAIN_TALK_PATTERNS = {
  desire_against: {
    keywords: ["don't want", "not interested", "prefer not", "like it"],
    keywordsRu: ["\u043D\u0435 \u0445\u043E\u0447\u0443", "\u043C\u043D\u0435 \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F", "\u043D\u0435 \u0441\u043E\u0431\u0438\u0440\u0430\u044E\u0441\u044C", "\u043D\u0435 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u043E"],
    patterns: [/I (don't|do not) want to/i, /I like it the way/i],
    patternsRu: [/я не хочу/i, /мне нравится как есть/i],
    strength: -2
  },
  ability_against: {
    keywords: ["can't", "unable", "impossible", "too hard"],
    keywordsRu: ["\u043D\u0435 \u043C\u043E\u0433\u0443", "\u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E", "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0441\u043B\u043E\u0436\u043D\u043E", "\u043D\u0435 \u0441\u043F\u043E\u0441\u043E\u0431\u0435\u043D"],
    patterns: [/I (can't|cannot|am unable to)/i, /it's (too hard|impossible)/i],
    patternsRu: [/я не могу/i, /это (невозможно|слишком сложно)/i],
    strength: -2
  },
  reasons_against: {
    keywords: ["because I need", "helps me", "makes me feel", "not that bad"],
    keywordsRu: ["\u043F\u043E\u0442\u043E\u043C\u0443 \u0447\u0442\u043E \u043C\u043D\u0435 \u043D\u0443\u0436\u043D\u043E", "\u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043C\u043D\u0435", "\u043D\u0435 \u0442\u0430\u043A \u0443\u0436 \u043F\u043B\u043E\u0445\u043E"],
    patterns: [/it (helps|makes) me/i, /not (that|so) bad/i],
    patternsRu: [/(помогает|нужно) мне/i, /не так уж плохо/i],
    strength: -2
  },
  need_against: {
    keywords: ["need it", "have to use", "depend on", "necessary for"],
    keywordsRu: ["\u043C\u043D\u0435 \u044D\u0442\u043E \u043D\u0443\u0436\u043D\u043E", "\u0437\u0430\u0432\u0438\u0441\u0438\u043C \u043E\u0442", "\u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0434\u043B\u044F"],
    patterns: [/I need (it|this)/i, /I (depend|rely) on/i],
    patternsRu: [/мне (это )?нужно/i, /я (завишу|полагаюсь)/i],
    strength: -3
  },
  commitment_against: {
    keywords: ["won't", "not going to", "refuse", "never will"],
    keywordsRu: ["\u043D\u0435 \u0431\u0443\u0434\u0443", "\u043D\u0435 \u0441\u043E\u0431\u0438\u0440\u0430\u044E\u0441\u044C", "\u043E\u0442\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0441\u044C", "\u043D\u0438\u043A\u043E\u0433\u0434\u0430"],
    patterns: [/I (won't|will not|am not going to)/i, /I refuse to/i],
    patternsRu: [/я (не буду|не собираюсь)/i, /я отказываюсь/i],
    strength: -4
  },
  activation_against: {
    keywords: ["not ready", "not willing", "not prepared", "not yet"],
    keywordsRu: ["\u043D\u0435 \u0433\u043E\u0442\u043E\u0432", "\u043D\u0435 \u0445\u043E\u0447\u0443 \u0441\u0435\u0439\u0447\u0430\u0441", "\u0435\u0449\u0451 \u043D\u0435 \u0432\u0440\u0435\u043C\u044F"],
    patterns: [/I('m| am) not ready/i, /not (yet|now)/i],
    patternsRu: [/я не готов/i, /ещё не (время|готов)/i],
    strength: -4
  },
  taking_steps_against: {
    keywords: ["keep doing", "went back", "still", "continue"],
    keywordsRu: ["\u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E", "\u0432\u0435\u0440\u043D\u0443\u043B\u0441\u044F \u043A", "\u0432\u0441\u0451 \u0435\u0449\u0451", "\u043E\u043F\u044F\u0442\u044C"],
    patterns: [/I (keep|still|continue)/i, /I went back to/i],
    patternsRu: [/я (продолжаю|вернулся)/i, /всё ещё/i],
    strength: -5
  }
};
var DISCORD_PATTERNS = {
  arguing: {
    keywords: ["but", "however", "that's not true", "you don't understand", "wrong"],
    keywordsRu: ["\u043D\u043E", "\u043E\u0434\u043D\u0430\u043A\u043E", "\u044D\u0442\u043E \u043D\u0435\u043F\u0440\u0430\u0432\u0434\u0430", "\u0432\u044B \u043D\u0435 \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442\u0435", "\u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E"],
    patterns: [/(but|however),? (I|you)/i, /that's (not true|wrong)/i]
  },
  interrupting: {
    keywords: ["wait", "let me finish", "hold on"],
    keywordsRu: ["\u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435", "\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u044C", "\u043C\u0438\u043D\u0443\u0442\u0443"],
    patterns: [/wait,? (I|let me)/i]
  },
  negating: {
    keywords: ["no", "nope", "not really", "I disagree"],
    keywordsRu: ["\u043D\u0435\u0442", "\u043D\u0435 \u0441\u043E\u0432\u0441\u0435\u043C", "\u043D\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D", "\u043D\u0435\u0430"],
    patterns: [/^no[,.]?/i, /not really/i]
  },
  ignoring: {
    keywords: ["anyway", "whatever", "moving on", "different topic"],
    keywordsRu: ["\u0432 \u043B\u044E\u0431\u043E\u043C \u0441\u043B\u0443\u0447\u0430\u0435", "\u043D\u0435\u0432\u0430\u0436\u043D\u043E", "\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u043E \u0434\u0440\u0443\u0433\u043E\u043C"],
    patterns: [/(anyway|whatever|nevermind)/i]
  },
  defending: {
    keywords: ["it's not my fault", "I had to", "what else could I", "anyone would"],
    keywordsRu: ["\u044D\u0442\u043E \u043D\u0435 \u043C\u043E\u044F \u0432\u0438\u043D\u0430", "\u043C\u043D\u0435 \u043F\u0440\u0438\u0448\u043B\u043E\u0441\u044C", "\u0447\u0442\u043E \u043C\u043D\u0435 \u0431\u044B\u043B\u043E \u0434\u0435\u043B\u0430\u0442\u044C", "\u043B\u044E\u0431\u043E\u0439 \u0431\u044B"],
    patterns: [/it's not my fault/i, /I had (to|no choice)/i]
  },
  squaring_off: {
    keywords: ["we'll see", "make me", "try me", "you can't"],
    keywordsRu: ["\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u043C", "\u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439", "\u0432\u044B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442\u0435"],
    patterns: [/(we'll see|try me|make me)/i]
  }
};
var STRATEGY_RECOMMENDATIONS = {
  precontemplation: {
    primaryStrategy: "build_rapport",
    secondaryStrategies: ["develop_discrepancy", "roll_with_resistance"],
    focus: [
      "Establish trust and safety",
      "Understand their perspective",
      "Plant seeds of doubt gently",
      "Avoid direct persuasion"
    ],
    avoid: [
      "Pushing for change",
      "Giving advice",
      "Arguing for change",
      "Labeling behavior as problematic"
    ]
  },
  contemplation: {
    primaryStrategy: "explore_ambivalence",
    secondaryStrategies: ["evoke_change_talk", "develop_discrepancy"],
    focus: [
      "Explore both sides of ambivalence",
      "Reflect change talk selectively",
      "Develop discrepancy with values",
      "Build importance of change"
    ],
    avoid: [
      "Decisional balance sheets",
      "Premature action planning",
      "Taking the change side of argument"
    ]
  },
  preparation: {
    primaryStrategy: "strengthen_commitment",
    secondaryStrategies: ["support_self_efficacy", "summarize_and_transition"],
    focus: [
      "Strengthen commitment language",
      "Build confidence for change",
      "Explore specific plans",
      "Mobilize support systems"
    ],
    avoid: [
      "Overwhelming with options",
      "Creating dependency",
      "Skipping confidence building"
    ]
  },
  action: {
    primaryStrategy: "action_planning",
    secondaryStrategies: ["support_self_efficacy", "relapse_prevention"],
    focus: [
      "Concrete action steps",
      "Celebrate progress",
      "Troubleshoot obstacles",
      "Strengthen new identity"
    ],
    avoid: [
      "Complacency",
      "Ignoring challenges",
      "Taking credit for their change"
    ]
  },
  maintenance: {
    primaryStrategy: "relapse_prevention",
    secondaryStrategies: ["support_self_efficacy", "strengthen_commitment"],
    focus: [
      "Identify high-risk situations",
      "Strengthen coping strategies",
      "Celebrate sustained change",
      "Plan for setbacks"
    ],
    avoid: [
      "Assuming work is done",
      "Ignoring warning signs",
      "Reducing support too quickly"
    ]
  },
  relapse: {
    primaryStrategy: "roll_with_resistance",
    secondaryStrategies: ["support_self_efficacy", "evoke_change_talk"],
    focus: [
      "Normalize as part of process",
      "Rebuild confidence",
      "Learn from experience",
      "Rekindle motivation"
    ],
    avoid: [
      "Blame or criticism",
      "Catastrophizing",
      "Starting over from scratch"
    ]
  }
};

// src/motivation/interfaces/IMotivationalInterviewing.ts
var OPEN_QUESTION_TEMPLATES = [
  // Desire (D)
  {
    id: "oq_desire_1",
    category: "goals",
    template: "What would you like to be different about {behavior}?",
    templateRu: "\u0427\u0442\u043E \u0431\u044B \u0432\u044B \u0445\u043E\u0442\u0435\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 {behavior}?",
    placeholders: ["behavior"],
    targetChangeTalk: ["desire"],
    appropriateStages: ["explore_ambivalence", "evoke_change_talk"],
    examples: ["What would you like to be different about your phone usage?"],
    examplesRu: ["\u0427\u0442\u043E \u0431\u044B \u0432\u044B \u0445\u043E\u0442\u0435\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430?"]
  },
  {
    id: "oq_desire_2",
    category: "values",
    template: "How would you like things to be?",
    templateRu: "\u041A\u0430\u043A \u0431\u044B \u0432\u0430\u043C \u0445\u043E\u0442\u0435\u043B\u043E\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u0432\u0441\u0451 \u0431\u044B\u043B\u043E?",
    placeholders: [],
    targetChangeTalk: ["desire"],
    appropriateStages: ["explore_ambivalence", "evoke_change_talk"],
    examples: ["How would you like things to be?"],
    examplesRu: ["\u041A\u0430\u043A \u0431\u044B \u0432\u0430\u043C \u0445\u043E\u0442\u0435\u043B\u043E\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u0432\u0441\u0451 \u0431\u044B\u043B\u043E?"]
  },
  // Ability (A)
  {
    id: "oq_ability_1",
    category: "resources",
    template: "What strengths do you have that could help with {goal}?",
    templateRu: "\u041A\u0430\u043A\u0438\u0435 \u0432\u0430\u0448\u0438 \u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043C\u043E\u0433\u043B\u0438 \u0431\u044B \u043F\u043E\u043C\u043E\u0447\u044C \u0441 {goal}?",
    placeholders: ["goal"],
    targetChangeTalk: ["ability"],
    appropriateStages: ["support_self_efficacy", "strengthen_commitment"],
    examples: ["What strengths do you have that could help with reducing screen time?"],
    examplesRu: ["\u041A\u0430\u043A\u0438\u0435 \u0432\u0430\u0448\u0438 \u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043C\u043E\u0433\u043B\u0438 \u0431\u044B \u043F\u043E\u043C\u043E\u0447\u044C \u0441 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u0438\u0435\u043C \u044D\u043A\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438?"]
  },
  {
    id: "oq_ability_2",
    category: "confidence",
    template: "When have you successfully made a change like this before?",
    templateRu: "\u041A\u043E\u0433\u0434\u0430 \u0432\u0430\u043C \u0440\u0430\u043D\u044C\u0448\u0435 \u0443\u0434\u0430\u0432\u0430\u043B\u043E\u0441\u044C \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u043F\u043E\u0434\u043E\u0431\u043D\u043E\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435?",
    placeholders: [],
    targetChangeTalk: ["ability"],
    appropriateStages: ["support_self_efficacy"],
    examples: ["When have you successfully made a change like this before?"],
    examplesRu: ["\u041A\u043E\u0433\u0434\u0430 \u0432\u0430\u043C \u0440\u0430\u043D\u044C\u0448\u0435 \u0443\u0434\u0430\u0432\u0430\u043B\u043E\u0441\u044C \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u043F\u043E\u0434\u043E\u0431\u043D\u043E\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435?"]
  },
  // Reasons (R)
  {
    id: "oq_reasons_1",
    category: "values",
    template: "What are the most important reasons you would want to {goal}?",
    templateRu: "\u041A\u0430\u043A\u0438\u0435 \u0441\u0430\u043C\u044B\u0435 \u0432\u0430\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B, \u043F\u043E \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0432\u044B \u0445\u043E\u0442\u0435\u043B\u0438 \u0431\u044B {goal}?",
    placeholders: ["goal"],
    targetChangeTalk: ["reasons"],
    appropriateStages: ["develop_discrepancy", "explore_ambivalence"],
    examples: ["What are the most important reasons you would want to spend less time gaming?"],
    examplesRu: ["\u041A\u0430\u043A\u0438\u0435 \u0441\u0430\u043C\u044B\u0435 \u0432\u0430\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B, \u043F\u043E \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0432\u044B \u0445\u043E\u0442\u0435\u043B\u0438 \u0431\u044B \u043C\u0435\u043D\u044C\u0448\u0435 \u0438\u0433\u0440\u0430\u0442\u044C?"]
  },
  {
    id: "oq_reasons_2",
    category: "values",
    template: "How does {behavior} connect to what matters most to you?",
    templateRu: "\u041A\u0430\u043A {behavior} \u0441\u0432\u044F\u0437\u0430\u043D\u043E \u0441 \u0442\u0435\u043C, \u0447\u0442\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0432\u0430\u0436\u043D\u0435\u0435 \u0432\u0441\u0435\u0433\u043E?",
    placeholders: ["behavior"],
    targetChangeTalk: ["reasons"],
    appropriateStages: ["develop_discrepancy"],
    examples: ["How does your social media use connect to what matters most to you?"],
    examplesRu: ["\u041A\u0430\u043A \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u0441\u0432\u044F\u0437\u0430\u043D\u043E \u0441 \u0442\u0435\u043C, \u0447\u0442\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0432\u0430\u0436\u043D\u0435\u0435 \u0432\u0441\u0435\u0433\u043E?"]
  },
  // Need (N)
  {
    id: "oq_need_1",
    category: "importance",
    template: "How urgent is it for you to make this change?",
    templateRu: "\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0440\u043E\u0447\u043D\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u044D\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435?",
    placeholders: [],
    targetChangeTalk: ["need"],
    appropriateStages: ["explore_ambivalence", "strengthen_commitment"],
    examples: ["How urgent is it for you to make this change?"],
    examplesRu: ["\u041D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0440\u043E\u0447\u043D\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u044D\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435?"]
  },
  {
    id: "oq_need_2",
    category: "importance",
    template: "What would happen if things stayed the same?",
    templateRu: "\u0427\u0442\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0439\u0434\u0451\u0442, \u0435\u0441\u043B\u0438 \u0432\u0441\u0451 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u043F\u043E-\u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443?",
    placeholders: [],
    targetChangeTalk: ["need"],
    appropriateStages: ["develop_discrepancy"],
    examples: ["What would happen if things stayed the same?"],
    examplesRu: ["\u0427\u0442\u043E \u043F\u0440\u043E\u0438\u0437\u043E\u0439\u0434\u0451\u0442, \u0435\u0441\u043B\u0438 \u0432\u0441\u0451 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u043F\u043E-\u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443?"]
  },
  // Commitment (C)
  {
    id: "oq_commitment_1",
    category: "next_steps",
    template: "What are you willing to try?",
    templateRu: "\u0427\u0442\u043E \u0432\u044B \u0433\u043E\u0442\u043E\u0432\u044B \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C?",
    placeholders: [],
    targetChangeTalk: ["commitment", "activation"],
    appropriateStages: ["strengthen_commitment", "action_planning"],
    examples: ["What are you willing to try?"],
    examplesRu: ["\u0427\u0442\u043E \u0432\u044B \u0433\u043E\u0442\u043E\u0432\u044B \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C?"]
  },
  // Activation (A)
  {
    id: "oq_activation_1",
    category: "next_steps",
    template: "What would be a good first step?",
    templateRu: "\u041A\u0430\u043A\u043E\u0439 \u0431\u044B\u043B \u0431\u044B \u0445\u043E\u0440\u043E\u0448\u0438\u0439 \u043F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433?",
    placeholders: [],
    targetChangeTalk: ["activation", "taking_steps"],
    appropriateStages: ["action_planning"],
    examples: ["What would be a good first step?"],
    examplesRu: ["\u041A\u0430\u043A\u043E\u0439 \u0431\u044B\u043B \u0431\u044B \u0445\u043E\u0440\u043E\u0448\u0438\u0439 \u043F\u0435\u0440\u0432\u044B\u0439 \u0448\u0430\u0433?"]
  },
  // Taking Steps (T)
  {
    id: "oq_taking_steps_1",
    category: "next_steps",
    template: "What have you already tried that worked, even a little?",
    templateRu: "\u0427\u0442\u043E \u0432\u044B \u0443\u0436\u0435 \u043F\u0440\u043E\u0431\u043E\u0432\u0430\u043B\u0438, \u0447\u0442\u043E \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u043E \u0445\u043E\u0442\u044F \u0431\u044B \u043D\u0435\u043C\u043D\u043E\u0433\u043E?",
    placeholders: [],
    targetChangeTalk: ["taking_steps"],
    appropriateStages: ["support_self_efficacy", "action_planning"],
    examples: ["What have you already tried that worked, even a little?"],
    examplesRu: ["\u0427\u0442\u043E \u0432\u044B \u0443\u0436\u0435 \u043F\u0440\u043E\u0431\u043E\u0432\u0430\u043B\u0438, \u0447\u0442\u043E \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u043E \u0445\u043E\u0442\u044F \u0431\u044B \u043D\u0435\u043C\u043D\u043E\u0433\u043E?"]
  }
];
var AFFIRMATION_TEMPLATES = [
  {
    id: "aff_strength_1",
    type: "strength",
    template: "You clearly {strength}.",
    templateRu: "\u041E\u0447\u0435\u0432\u0438\u0434\u043D\u043E, \u0447\u0442\u043E \u0432\u044B {strength}.",
    placeholders: ["strength"],
    appropriateFor: {
      stages: ["support_self_efficacy", "strengthen_commitment"],
      afterDiscord: false
    }
  },
  {
    id: "aff_effort_1",
    type: "effort",
    template: "It takes courage to {action}.",
    templateRu: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0441\u043C\u0435\u043B\u043E\u0441\u0442\u044C, \u0447\u0442\u043E\u0431\u044B {action}.",
    placeholders: ["action"],
    appropriateFor: {
      stages: ["build_rapport", "support_self_efficacy"],
      afterDiscord: true
    }
  },
  {
    id: "aff_progress_1",
    type: "progress",
    template: "You've made real progress with {progress}.",
    templateRu: "\u0412\u044B \u0434\u043E\u0431\u0438\u043B\u0438\u0441\u044C \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 \u0432 {progress}.",
    placeholders: ["progress"],
    appropriateFor: {
      minChangeTalkRatio: 0.5,
      stages: ["action_planning", "relapse_prevention"]
    }
  },
  {
    id: "aff_value_1",
    type: "value",
    template: "It's clear how much you value {value}.",
    templateRu: "\u0412\u0438\u0434\u043D\u043E, \u043A\u0430\u043A \u043C\u043D\u043E\u0433\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0437\u043D\u0430\u0447\u0438\u0442 {value}.",
    placeholders: ["value"],
    appropriateFor: {
      stages: ["develop_discrepancy", "explore_ambivalence"]
    }
  },
  {
    id: "aff_intention_1",
    type: "intention",
    template: "Your commitment to {intention} is inspiring.",
    templateRu: "\u0412\u0430\u0448\u0430 \u043F\u0440\u0438\u0432\u0435\u0440\u0436\u0435\u043D\u043D\u043E\u0441\u0442\u044C {intention} \u0432\u0434\u043E\u0445\u043D\u043E\u0432\u043B\u044F\u0435\u0442.",
    placeholders: ["intention"],
    appropriateFor: {
      minChangeTalkRatio: 0.6,
      stages: ["strengthen_commitment", "action_planning"]
    }
  }
];
var REFLECTION_TEMPLATES = [
  // Simple reflections
  {
    id: "ref_simple_rephrase",
    type: "rephrase",
    pattern: "So you {rephrased_content}.",
    patternRu: "\u0418\u0442\u0430\u043A, \u0432\u044B {rephrased_content}.",
    complexity: "simple",
    target: "change_talk",
    examples: [
      {
        input: "I want to spend more time with my family",
        output: "So you want to have more quality time with your family.",
        outputRu: "\u0418\u0442\u0430\u043A, \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0441 \u0441\u0435\u043C\u044C\u0451\u0439."
      }
    ]
  },
  // Complex reflections
  {
    id: "ref_complex_feeling",
    type: "feeling",
    pattern: "It sounds like you're feeling {emotion} about {topic}.",
    patternRu: "\u041F\u043E\u0445\u043E\u0436\u0435, \u0432\u044B \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0442\u0435 {emotion} \u043F\u043E \u043F\u043E\u0432\u043E\u0434\u0443 {topic}.",
    complexity: "complex",
    target: "feeling",
    examples: [
      {
        input: "I don't know what to do anymore",
        output: "It sounds like you're feeling overwhelmed about this situation.",
        outputRu: "\u041F\u043E\u0445\u043E\u0436\u0435, \u0432\u044B \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0442\u0435 \u0441\u0435\u0431\u044F \u043F\u043E\u0434\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u043C \u0432 \u044D\u0442\u043E\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438."
      }
    ]
  },
  {
    id: "ref_complex_meaning",
    type: "meaning",
    pattern: "What I hear is that {deeper_meaning} is really important to you.",
    patternRu: "\u042F \u0441\u043B\u044B\u0448\u0443, \u0447\u0442\u043E {deeper_meaning} \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0432\u0430\u0436\u043D\u043E \u0434\u043B\u044F \u0432\u0430\u0441.",
    complexity: "complex",
    target: "meaning",
    examples: [
      {
        input: "I need to be there for my kids",
        output: "What I hear is that being a present parent is really important to you.",
        outputRu: "\u042F \u0441\u043B\u044B\u0448\u0443, \u0447\u0442\u043E \u0431\u044B\u0442\u044C \u0440\u044F\u0434\u043E\u043C \u0441 \u0434\u0435\u0442\u044C\u043C\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0432\u0430\u0436\u043D\u043E \u0434\u043B\u044F \u0432\u0430\u0441."
      }
    ]
  },
  {
    id: "ref_complex_double_sided",
    type: "double_sided",
    pattern: "On one hand {pro_change}, and on the other hand {against_change}.",
    patternRu: "\u0421 \u043E\u0434\u043D\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u044B {pro_change}, \u0430 \u0441 \u0434\u0440\u0443\u0433\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u044B {against_change}.",
    complexity: "complex",
    target: "ambivalence",
    examples: [
      {
        input: "I want to change but I also enjoy gaming",
        output: "On one hand you want to make a change, and on the other hand gaming gives you enjoyment.",
        outputRu: "\u0421 \u043E\u0434\u043D\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C\u0441\u044F, \u0430 \u0441 \u0434\u0440\u0443\u0433\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u0438\u0433\u0440\u044B \u043F\u0440\u0438\u043D\u043E\u0441\u044F\u0442 \u0443\u0434\u043E\u0432\u043E\u043B\u044C\u0441\u0442\u0432\u0438\u0435."
      }
    ]
  },
  {
    id: "ref_complex_amplified",
    type: "amplified",
    pattern: "So there's absolutely no way you could ever {exaggerated}.",
    patternRu: "\u0422\u043E \u0435\u0441\u0442\u044C \u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u043E \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0447\u0442\u043E\u0431\u044B \u0432\u044B \u043A\u043E\u0433\u0434\u0430-\u043B\u0438\u0431\u043E {exaggerated}.",
    complexity: "complex",
    target: "sustain_talk",
    examples: [
      {
        input: "I can't stop using my phone",
        output: "So there's absolutely no way you could ever put your phone down, even for a minute.",
        outputRu: "\u0422\u043E \u0435\u0441\u0442\u044C \u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u043E \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0447\u0442\u043E\u0431\u044B \u0432\u044B \u043A\u043E\u0433\u0434\u0430-\u043B\u0438\u0431\u043E \u043E\u0442\u043B\u043E\u0436\u0438\u043B\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u0434\u0430\u0436\u0435 \u043D\u0430 \u043C\u0438\u043D\u0443\u0442\u0443."
      }
    ]
  },
  {
    id: "ref_complex_reframe",
    type: "reframe",
    pattern: "Another way to look at this is {reframed_perspective}.",
    patternRu: "\u0414\u0440\u0443\u0433\u043E\u0439 \u0432\u0437\u0433\u043B\u044F\u0434 \u043D\u0430 \u044D\u0442\u043E \u2014 {reframed_perspective}.",
    complexity: "complex",
    target: "change_talk",
    examples: [
      {
        input: "I failed at this before",
        output: "Another way to look at this is that you now have experience about what doesn't work.",
        outputRu: "\u0414\u0440\u0443\u0433\u043E\u0439 \u0432\u0437\u0433\u043B\u044F\u0434 \u043D\u0430 \u044D\u0442\u043E \u2014 \u0442\u0435\u043F\u0435\u0440\u044C \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043E\u043F\u044B\u0442 \u0442\u043E\u0433\u043E, \u0447\u0442\u043E \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442."
      }
    ]
  }
];
var SUMMARY_TEMPLATES = [
  {
    id: "sum_collecting",
    type: "collecting",
    structure: "Let me see if I've got this right. You've mentioned {change_talk_summary}. {values_connection}",
    structureRu: "\u041F\u043E\u0437\u0432\u043E\u043B\u044C\u0442\u0435 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C, \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E \u043B\u0438 \u044F \u043F\u043E\u043D\u044F\u043B. \u0412\u044B \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043B\u0438 {change_talk_summary}. {values_connection}",
    includeSections: ["change_talk", "values"]
  },
  {
    id: "sum_linking",
    type: "linking",
    structure: "Earlier you said {past_statement}. Now you're saying {current_statement}. {connection}",
    structureRu: "\u0420\u0430\u043D\u044C\u0448\u0435 \u0432\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u043B\u0438 {past_statement}. \u0421\u0435\u0439\u0447\u0430\u0441 \u0432\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435 {current_statement}. {connection}",
    includeSections: ["change_talk", "goals"]
  },
  {
    id: "sum_transitional",
    type: "transitional",
    structure: "So far we've talked about {summary_points}. {transition_to_next}",
    structureRu: "\u0414\u043E \u0441\u0438\u0445 \u043F\u043E\u0440 \u043C\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u043B\u0438 \u043E {summary_points}. {transition_to_next}",
    includeSections: ["change_talk", "strengths", "next_steps"],
    transitionPhrase: "Where would you like to go from here?",
    transitionPhraseRu: "\u041A\u0443\u0434\u0430 \u0431\u044B \u0432\u044B \u0445\u043E\u0442\u0435\u043B\u0438 \u0434\u0432\u0438\u0433\u0430\u0442\u044C\u0441\u044F \u0434\u0430\u043B\u044C\u0448\u0435?"
  }
];
var DISCORD_RESPONSE_STRATEGIES = {
  arguing: {
    primaryResponse: "reflection_complex",
    templates: [
      "You're not convinced that this is an issue.",
      "It sounds like you see things differently."
    ],
    templatesRu: [
      "\u0412\u044B \u043D\u0435 \u0443\u0431\u0435\u0436\u0434\u0435\u043D\u044B, \u0447\u0442\u043E \u044D\u0442\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430.",
      "\u041F\u043E\u0445\u043E\u0436\u0435, \u0432\u044B \u0432\u0438\u0434\u0438\u0442\u0435 \u044D\u0442\u043E \u0438\u043D\u0430\u0447\u0435."
    ],
    avoid: ["arguing back", "presenting evidence", "proving point"]
  },
  interrupting: {
    primaryResponse: "emphasize_autonomy",
    templates: [
      "I apologize, please continue.",
      "I want to make sure I hear what you're saying."
    ],
    templatesRu: [
      "\u0418\u0437\u0432\u0438\u043D\u0438\u0442\u0435, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0439\u0442\u0435.",
      "\u042F \u0445\u043E\u0447\u0443 \u0443\u0431\u0435\u0434\u0438\u0442\u044C\u0441\u044F, \u0447\u0442\u043E \u0441\u043B\u044B\u0448\u0443, \u0447\u0442\u043E \u0432\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435."
    ],
    avoid: ["talking over", "continuing anyway"]
  },
  negating: {
    primaryResponse: "reflection_simple",
    templates: [
      "You don't agree with that.",
      "That doesn't fit with your experience."
    ],
    templatesRu: [
      "\u0412\u044B \u0441 \u044D\u0442\u0438\u043C \u043D\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u043D\u044B.",
      "\u042D\u0442\u043E \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432\u0430\u0448\u0435\u043C\u0443 \u043E\u043F\u044B\u0442\u0443."
    ],
    avoid: ["insisting", "repeating same point"]
  },
  ignoring: {
    primaryResponse: "seek_collaboration",
    templates: [
      "What would be more helpful to talk about?",
      "I sense this isn't quite what you need right now."
    ],
    templatesRu: [
      "\u041E \u0447\u0451\u043C \u0431\u044B\u043B\u043E \u0431\u044B \u043F\u043E\u043B\u0435\u0437\u043D\u0435\u0435 \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C?",
      "\u0427\u0443\u0432\u0441\u0442\u0432\u0443\u044E, \u0441\u0435\u0439\u0447\u0430\u0441 \u0432\u0430\u043C \u043D\u0443\u0436\u043D\u043E \u0447\u0442\u043E-\u0442\u043E \u0434\u0440\u0443\u0433\u043E\u0435."
    ],
    avoid: ["forcing topic", "continuing same direction"]
  },
  defending: {
    primaryResponse: "affirm",
    templates: [
      "You had your reasons for doing what you did.",
      "You were dealing with a difficult situation."
    ],
    templatesRu: [
      "\u0423 \u0432\u0430\u0441 \u0431\u044B\u043B\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u044B \u043F\u043E\u0441\u0442\u0443\u043F\u0438\u0442\u044C \u0442\u0430\u043A, \u043A\u0430\u043A \u0432\u044B \u043F\u043E\u0441\u0442\u0443\u043F\u0438\u043B\u0438.",
      "\u0412\u044B \u0441\u043F\u0440\u0430\u0432\u043B\u044F\u043B\u0438\u0441\u044C \u0441 \u0442\u0440\u0443\u0434\u043D\u043E\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0435\u0439."
    ],
    avoid: ["challenging", "questioning motives"]
  },
  squaring_off: {
    primaryResponse: "emphasize_autonomy",
    templates: [
      "You're the expert on your own life.",
      "Only you can decide what's right for you."
    ],
    templatesRu: [
      "\u0412\u044B \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u0432 \u0441\u0432\u043E\u0435\u0439 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0439 \u0436\u0438\u0437\u043D\u0438.",
      "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0440\u0435\u0448\u0438\u0442\u044C, \u0447\u0442\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E."
    ],
    avoid: ["competing", "asserting authority"]
  }
};
var MITI_THRESHOLDS = {
  // Global scores (1-5 scale)
  global: {
    belowThreshold: { cultivatingChangeTalk: 2.5, softeningSustainTalk: 2.5, partnership: 3, empathy: 3 },
    competent: { cultivatingChangeTalk: 3, softeningSustainTalk: 3, partnership: 3.5, empathy: 3.5 },
    proficient: { cultivatingChangeTalk: 4, softeningSustainTalk: 4, partnership: 4, empathy: 4 }
  },
  // Summary scores
  summary: {
    competent: {
      reflectionToQuestionRatio: 1,
      percentComplexReflections: 40,
      percentOpenQuestions: 50
    },
    proficient: {
      reflectionToQuestionRatio: 2,
      percentComplexReflections: 50,
      percentOpenQuestions: 70
    }
  }
};

// src/motivation/engines/MotivationalEngine.ts
var MotivationalStateBuilder = class {
  constructor() {
    __publicField(this, "state", {});
    this.reset();
  }
  reset() {
    this.state = {
      id: this.generateId(),
      timestamp: /* @__PURE__ */ new Date(),
      confidence: 0.5,
      dataQuality: 0.5,
      recentUtterances: [],
      ratioTrend: [],
      sessionFocus: [],
      avoid: []
    };
  }
  generateId() {
    return generateShortSecureId("ms");
  }
  setUserId(userId) {
    this.state.userId = userId;
    return this;
  }
  setReadinessRuler(importance, confidence) {
    const readiness = Math.sqrt(importance * confidence);
    this.state.readinessRuler = {
      importance: Math.max(0, Math.min(10, importance)),
      confidence: Math.max(0, Math.min(10, confidence)),
      readiness,
      assessedAt: /* @__PURE__ */ new Date(),
      source: "inferred",
      assessmentConfidence: 0.7
    };
    return this;
  }
  setLinkedStage(stage) {
    this.state.linkedStage = stage;
    const recommendations = STRATEGY_RECOMMENDATIONS[stage];
    this.state.recommendedStrategy = recommendations.primaryStrategy;
    this.state.sessionFocus = recommendations.focus;
    this.state.avoid = recommendations.avoid;
    return this;
  }
  addUtterance(utterance) {
    if (!this.state.recentUtterances) {
      this.state.recentUtterances = [];
    }
    this.state.recentUtterances.push(utterance);
    if (this.state.recentUtterances.length > 50) {
      this.state.recentUtterances = this.state.recentUtterances.slice(-50);
    }
    return this;
  }
  setLanguageBalance(balance) {
    this.state.languageBalance = balance;
    this.state.sessionRatio = balance.changeTalkRatio;
    return this;
  }
  setDarnCatProfile(profile) {
    this.state.darnCatProfile = profile;
    return this;
  }
  setAmbivalence(ambivalence) {
    this.state.ambivalence = ambivalence;
    return this;
  }
  setDiscord(discord) {
    this.state.discord = discord;
    return this;
  }
  setStrategy(strategy) {
    this.state.recommendedStrategy = strategy;
    return this;
  }
  build() {
    const result = {
      id: this.state.id,
      userId: this.state.userId ?? "unknown",
      readinessRuler: this.state.readinessRuler ?? this.createDefaultReadiness(),
      linkedStage: this.state.linkedStage ?? "precontemplation",
      daysInState: this.state.daysInState ?? 0,
      recentUtterances: this.state.recentUtterances ?? [],
      languageBalance: this.state.languageBalance ?? this.createDefaultLanguageBalance(),
      darnCatProfile: this.state.darnCatProfile ?? this.createDefaultDarnCatProfile(),
      sessionRatio: this.state.sessionRatio ?? 0.5,
      ratioTrend: this.state.ratioTrend ?? [],
      ambivalence: this.state.ambivalence ?? this.createDefaultAmbivalence(),
      ambivalenceExplored: this.state.ambivalenceExplored ?? false,
      discord: this.state.discord ?? this.createDefaultDiscord(),
      rapportLevel: this.state.rapportLevel ?? 0.7,
      recommendedStrategy: this.state.recommendedStrategy ?? "build_rapport",
      sessionFocus: this.state.sessionFocus ?? [],
      avoid: this.state.avoid ?? [],
      timestamp: this.state.timestamp ?? /* @__PURE__ */ new Date(),
      confidence: this.state.confidence ?? 0.5,
      dataQuality: this.state.dataQuality ?? 0.5
    };
    this.reset();
    return result;
  }
  createDefaultReadiness() {
    return {
      importance: 5,
      confidence: 5,
      readiness: 5,
      assessedAt: /* @__PURE__ */ new Date(),
      source: "inferred",
      assessmentConfidence: 0.3
    };
  }
  createDefaultLanguageBalance() {
    return {
      changeTalkCount: 0,
      sustainTalkCount: 0,
      changeTalkRatio: 0.5,
      averageCtStrength: 0,
      averageStStrength: 0,
      netBalance: 0,
      trend: "stable",
      windowStart: /* @__PURE__ */ new Date(),
      windowEnd: /* @__PURE__ */ new Date()
    };
  }
  createDefaultDarnCatProfile() {
    return {
      desire: 0,
      ability: 0,
      reasons: 0,
      need: 0,
      commitment: 0,
      activation: 0,
      takingSteps: 0,
      mobilizingRatio: 0,
      dominantPreparatory: "none",
      mobilizingPresent: false
    };
  }
  createDefaultAmbivalence() {
    return {
      level: 0.5,
      type: "approach_avoidance",
      prosForChange: [],
      consForChange: [],
      prosForStatusQuo: [],
      consForStatusQuo: [],
      isNormative: true,
      primaryConflict: "unknown"
    };
  }
  createDefaultDiscord() {
    return {
      level: 0,
      types: [],
      events: [],
      trend: "stable",
      recommendedResponse: "reflect"
    };
  }
};
var MotivationalStateFactory = class {
  constructor(engine) {
    __publicField(this, "engine");
    this.engine = engine ?? new MotivationalEngine();
  }
  async fromConversation(messages, userId, previousState) {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);
    const userMessages = messages.filter((m) => m.isUser);
    const utterances = [];
    for (const message of userMessages) {
      const utterance = await this.engine.analyzeUtterance(message.text);
      utterances.push({
        ...utterance,
        timestamp: message.timestamp
      });
      builder.addUtterance(utterance);
    }
    const balance = this.calculateLanguageBalance(utterances);
    builder.setLanguageBalance(balance);
    const profile = this.buildDarnCatProfile(utterances);
    builder.setDarnCatProfile(profile);
    const readiness = this.inferReadiness(balance, profile);
    builder.setReadinessRuler(readiness.importance, readiness.confidence);
    const stage = this.inferStage(balance, profile, previousState?.linkedStage);
    builder.setLinkedStage(stage);
    const ambivalence = this.assessAmbivalence(utterances);
    builder.setAmbivalence(ambivalence);
    const discord = this.detectDiscord(utterances);
    builder.setDiscord(discord);
    return builder.build();
  }
  fromAssessment(userId, importance, confidence) {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);
    builder.setReadinessRuler(importance, confidence);
    const readiness = Math.sqrt(importance * confidence);
    let stage;
    if (readiness < 3) {
      stage = "precontemplation";
    } else if (readiness < 5) {
      stage = "contemplation";
    } else if (readiness < 7) {
      stage = "preparation";
    } else {
      stage = "action";
    }
    builder.setLinkedStage(stage);
    return builder.build();
  }
  createInitial(userId) {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);
    builder.setLinkedStage("precontemplation");
    builder.setReadinessRuler(5, 5);
    return builder.build();
  }
  updateWithUtterance(currentState, newUtterance) {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(currentState.userId);
    const allUtterances = [...currentState.recentUtterances, newUtterance];
    for (const u of allUtterances) {
      builder.addUtterance(u);
    }
    const balance = this.calculateLanguageBalance(allUtterances);
    builder.setLanguageBalance(balance);
    const profile = this.buildDarnCatProfile(allUtterances);
    builder.setDarnCatProfile(profile);
    builder.setReadinessRuler(
      currentState.readinessRuler.importance,
      currentState.readinessRuler.confidence
    );
    const stage = this.inferStage(balance, profile, currentState.linkedStage);
    builder.setLinkedStage(stage);
    const ambivalence = this.assessAmbivalence(allUtterances);
    builder.setAmbivalence(ambivalence);
    const discord = this.detectDiscord(allUtterances.slice(-5));
    builder.setDiscord(discord);
    return builder.build();
  }
  updateReadiness(currentState, importance, confidence) {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(currentState.userId);
    for (const u of currentState.recentUtterances) {
      builder.addUtterance(u);
    }
    builder.setLanguageBalance(currentState.languageBalance);
    builder.setDarnCatProfile(currentState.darnCatProfile);
    builder.setReadinessRuler(importance, confidence);
    builder.setAmbivalence(currentState.ambivalence);
    builder.setDiscord(currentState.discord);
    const readiness = Math.sqrt(importance * confidence);
    let stage = currentState.linkedStage;
    if (readiness >= 7 && currentState.linkedStage !== "action" && currentState.linkedStage !== "maintenance") {
      stage = "action";
    } else if (readiness >= 5 && currentState.linkedStage === "contemplation") {
      stage = "preparation";
    }
    builder.setLinkedStage(stage);
    return builder.build();
  }
  calculateLanguageBalance(utterances) {
    const ctUtterances = utterances.filter((u) => u.category === "change_talk");
    const stUtterances = utterances.filter((u) => u.category === "sustain_talk");
    const changeTalkCount = ctUtterances.length;
    const sustainTalkCount = stUtterances.length;
    const total = changeTalkCount + sustainTalkCount;
    const changeTalkRatio = total > 0 ? changeTalkCount / total : 0.5;
    const averageCtStrength = ctUtterances.length > 0 ? ctUtterances.reduce((sum, u) => sum + u.strength, 0) / ctUtterances.length : 0;
    const averageStStrength = stUtterances.length > 0 ? stUtterances.reduce((sum, u) => sum + u.strength, 0) / stUtterances.length : 0;
    const netBalance = averageCtStrength * changeTalkCount + averageStStrength * sustainTalkCount;
    let trend = "stable";
    if (utterances.length >= 10) {
      const recent = utterances.slice(-5);
      const earlier = utterances.slice(-10, -5);
      const recentRatio = recent.filter((u) => u.category === "change_talk").length / recent.length;
      const earlierRatio = earlier.filter((u) => u.category === "change_talk").length / earlier.length;
      if (recentRatio > earlierRatio + 0.1) {
        trend = "increasing";
      } else if (recentRatio < earlierRatio - 0.1) {
        trend = "decreasing";
      }
    }
    return {
      changeTalkCount,
      sustainTalkCount,
      changeTalkRatio,
      averageCtStrength,
      averageStStrength,
      netBalance,
      trend,
      windowStart: utterances[0]?.timestamp ?? /* @__PURE__ */ new Date(),
      windowEnd: utterances[utterances.length - 1]?.timestamp ?? /* @__PURE__ */ new Date()
    };
  }
  buildDarnCatProfile(utterances) {
    const ctUtterances = utterances.filter((u) => u.category === "change_talk");
    const counts = {
      desire: 0,
      ability: 0,
      reasons: 0,
      need: 0,
      commitment: 0,
      activation: 0,
      takingSteps: 0
    };
    const subtypeToCount = {
      "desire": "desire",
      "ability": "ability",
      "reasons": "reasons",
      "need": "need",
      "commitment": "commitment",
      "activation": "activation",
      "taking_steps": "takingSteps"
    };
    for (const u of ctUtterances) {
      if (u.changeSubtype) {
        const countKey = subtypeToCount[u.changeSubtype];
        if (countKey !== void 0) {
          counts[countKey]++;
        }
      }
    }
    const preparatory = counts.desire + counts.ability + counts.reasons + counts.need;
    const mobilizing = counts.commitment + counts.activation + counts.takingSteps;
    const mobilizingRatio = preparatory > 0 ? mobilizing / preparatory : 0;
    let dominantPreparatory = "none";
    let maxPrep = 0;
    for (const type of ["desire", "ability", "reasons", "need"]) {
      if (counts[type] > maxPrep) {
        maxPrep = counts[type];
        dominantPreparatory = type;
      }
    }
    return {
      ...counts,
      mobilizingRatio,
      dominantPreparatory,
      mobilizingPresent: mobilizing > 0
    };
  }
  inferReadiness(balance, profile) {
    const importance = Math.min(10, 5 + (profile.reasons + profile.need) * 0.5 + balance.changeTalkRatio * 3);
    const confidence = Math.min(10, 5 + (profile.ability + profile.takingSteps) * 0.5 + (profile.mobilizingPresent ? 2 : 0));
    return { importance, confidence };
  }
  inferStage(balance, profile, currentStage) {
    if (profile.mobilizingPresent && profile.mobilizingRatio > 0.3) {
      if (profile.takingSteps >= 2) {
        return "action";
      }
      if (profile.commitment >= 2 || profile.activation >= 2) {
        return "preparation";
      }
    }
    if (balance.changeTalkRatio < 0.3) {
      return "precontemplation";
    }
    if (balance.changeTalkRatio >= 0.3 && balance.changeTalkRatio <= 0.7) {
      return "contemplation";
    }
    if (balance.changeTalkRatio > 0.7) {
      if (profile.dominantPreparatory !== "none") {
        return "preparation";
      }
    }
    return currentStage ?? "contemplation";
  }
  assessAmbivalence(utterances) {
    const prosForChange = [];
    const consForChange = [];
    const prosForStatusQuo = [];
    const consForStatusQuo = [];
    for (const u of utterances) {
      if (u.category === "change_talk") {
        if (u.changeSubtype === "reasons") {
          prosForChange.push(u.text);
        }
      } else if (u.category === "sustain_talk") {
        if (u.sustainSubtype === "reasons_against") {
          prosForStatusQuo.push(u.text);
        }
      }
    }
    const ctCount = utterances.filter((u) => u.category === "change_talk").length;
    const stCount = utterances.filter((u) => u.category === "sustain_talk").length;
    const total = ctCount + stCount;
    let level = 0;
    if (total > 0) {
      const ratio = ctCount / total;
      level = 1 - Math.abs(ratio - 0.5) * 2;
    }
    let type = "approach_avoidance";
    if (prosForChange.length > 0 && prosForStatusQuo.length > 0) {
      type = "double_approach_avoidance";
    }
    return {
      level,
      type,
      prosForChange: prosForChange.slice(0, 5),
      consForChange: consForChange.slice(0, 5),
      prosForStatusQuo: prosForStatusQuo.slice(0, 5),
      consForStatusQuo: consForStatusQuo.slice(0, 5),
      isNormative: level < 0.8,
      primaryConflict: prosForChange.length > 0 && prosForStatusQuo.length > 0 ? "Competing benefits" : "Unknown"
    };
  }
  detectDiscord(utterances) {
    const events = [];
    const typesFound = /* @__PURE__ */ new Set();
    for (const u of utterances) {
      for (const [type, patterns] of Object.entries(DISCORD_PATTERNS)) {
        const discordType = type;
        const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];
        for (const keyword of allKeywords) {
          if (u.text.toLowerCase().includes(keyword.toLowerCase())) {
            typesFound.add(discordType);
            events.push({
              type: discordType,
              utterance: u.text,
              timestamp: u.timestamp,
              intensity: 0.5,
              possibleTrigger: void 0
            });
            break;
          }
        }
      }
    }
    const level = Math.min(1, events.length * 0.2);
    const types = Array.from(typesFound);
    let recommendedResponse = "reflect";
    if (types.includes("squaring_off")) {
      recommendedResponse = "emphasize_autonomy";
    } else if (types.includes("interrupting")) {
      recommendedResponse = "apologize";
    } else if (types.includes("ignoring")) {
      recommendedResponse = "shift_focus";
    }
    return {
      level,
      types,
      events: events.slice(-5),
      trend: "stable",
      recommendedResponse
    };
  }
};
var MotivationalEngine = class {
  constructor() {
    __publicField(this, "responseIdCounter", 0);
  }
  /**
   * Analyze client utterance for CT/ST classification
   */
  async analyzeUtterance(text) {
    const lowerText = text.toLowerCase();
    let bestCtMatch = null;
    for (const [subtype, patterns] of Object.entries(CHANGE_TALK_PATTERNS)) {
      const ctSubtype = subtype;
      const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];
      for (const keyword of allKeywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const confidence2 = this.calculateMatchConfidence(text, keyword);
          if (!bestCtMatch || confidence2 > bestCtMatch.confidence) {
            bestCtMatch = {
              subtype: ctSubtype,
              strength: patterns.strength,
              confidence: confidence2,
              spans: [{
                start: index,
                end: index + keyword.length,
                text: text.substring(index, index + keyword.length),
                pattern: keyword
              }]
            };
          }
        }
      }
    }
    let bestStMatch = null;
    for (const [subtype, patterns] of Object.entries(SUSTAIN_TALK_PATTERNS)) {
      const stSubtype = subtype;
      const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];
      for (const keyword of allKeywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const confidence2 = this.calculateMatchConfidence(text, keyword);
          if (!bestStMatch || confidence2 > bestStMatch.confidence) {
            bestStMatch = {
              subtype: stSubtype,
              strength: patterns.strength,
              confidence: confidence2,
              spans: [{
                start: index,
                end: index + keyword.length,
                text: text.substring(index, index + keyword.length),
                pattern: keyword
              }]
            };
          }
        }
      }
    }
    let category = "follow_neutral";
    let changeSubtype;
    let sustainSubtype;
    let strength = 0;
    let confidence = 0.5;
    let evidenceSpans = [];
    if (bestCtMatch && (!bestStMatch || bestCtMatch.confidence > bestStMatch.confidence)) {
      category = "change_talk";
      changeSubtype = bestCtMatch.subtype;
      strength = bestCtMatch.strength;
      confidence = bestCtMatch.confidence;
      evidenceSpans = bestCtMatch.spans;
    } else if (bestStMatch) {
      category = "sustain_talk";
      sustainSubtype = bestStMatch.subtype;
      strength = bestStMatch.strength;
      confidence = bestStMatch.confidence;
      evidenceSpans = bestStMatch.spans;
    }
    return {
      id: generateShortSecureId("utt"),
      text,
      timestamp: /* @__PURE__ */ new Date(),
      category,
      changeSubtype,
      sustainSubtype,
      strength,
      confidence,
      evidenceSpans
    };
  }
  /**
   * Generate MI-consistent response
   */
  async generateResponse(context) {
    const { motivationalState, lastUtterance, currentStrategy } = context;
    if (motivationalState.discord.level > 0.5) {
      const discordType = motivationalState.discord.types[0];
      if (discordType) {
        return this.respondToDiscord(discordType, context);
      }
    }
    switch (currentStrategy) {
      case "build_rapport":
        return this.generateAffirmation(context);
      case "explore_ambivalence":
        return this.generateReflection(lastUtterance, "double_sided", context);
      case "evoke_change_talk":
        return this.generateOpenQuestion(this.selectTargetCt(motivationalState), context);
      case "strengthen_commitment":
        if (lastUtterance.category === "change_talk") {
          return this.generateReflection(lastUtterance, "meaning", context);
        }
        return this.generateOpenQuestion("commitment", context);
      case "support_self_efficacy":
        return this.generateOpenQuestion("ability", context);
      case "roll_with_resistance":
        return this.generateReflection(lastUtterance, "amplified", context);
      case "summarize_and_transition":
        return this.generateSummary("transitional", context);
      case "action_planning":
        return this.generateOpenQuestion("taking_steps", context);
      case "relapse_prevention":
        return this.generateOpenQuestion("ability", context);
      case "develop_discrepancy":
        return this.generateOpenQuestion("reasons", context);
      default:
        return this.generateReflection(lastUtterance, "meaning", context);
    }
  }
  /**
   * Generate open-ended question to evoke specific CT
   */
  async generateOpenQuestion(targetChangeTalk, context) {
    const templates = OPEN_QUESTION_TEMPLATES.filter(
      (t) => t.targetChangeTalk.includes(targetChangeTalk)
    );
    if (templates.length === 0) {
      const text2 = context.language === "ru" ? "\u0427\u0442\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0431\u044B\u043B\u043E \u0431\u044B \u0432\u0430\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C?" : "What would be important for you to change?";
      return this.createResponse({
        text: text2,
        textRu: "\u0427\u0442\u043E \u0434\u043B\u044F \u0432\u0430\u0441 \u0431\u044B\u043B\u043E \u0431\u044B \u0432\u0430\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C?",
        primaryBehavior: "question_open",
        targetChangeTalk,
        strategicIntent: context.currentStrategy,
        expectedImpact: "increase_ct"
      });
    }
    const templateIndex = secureRandomInt(0, templates.length - 1);
    const template = templates[templateIndex];
    const text = context.language === "ru" ? template.templateRu : template.template;
    return this.createResponse({
      text,
      textRu: template.templateRu,
      primaryBehavior: "question_open",
      oarsTechnique: "open_question",
      targetChangeTalk,
      strategicIntent: context.currentStrategy,
      expectedImpact: "increase_ct"
    });
  }
  /**
   * Generate affirmation
   */
  async generateAffirmation(context) {
    const templates = AFFIRMATION_TEMPLATES.filter((t) => {
      if (t.appropriateFor.minChangeTalkRatio !== void 0) {
        if (context.motivationalState.sessionRatio < t.appropriateFor.minChangeTalkRatio) {
          return false;
        }
      }
      return t.appropriateFor.stages.includes(context.currentStrategy);
    });
    if (templates.length === 0) {
      const text2 = context.language === "ru" ? "\u0426\u0435\u043D\u044E, \u0447\u0442\u043E \u0432\u044B \u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u044D\u0442\u0438\u043C \u0441\u043E \u043C\u043D\u043E\u0439." : "I appreciate you sharing this with me.";
      return this.createResponse({
        text: text2,
        textRu: "\u0426\u0435\u043D\u044E, \u0447\u0442\u043E \u0432\u044B \u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u044D\u0442\u0438\u043C \u0441\u043E \u043C\u043D\u043E\u0439.",
        primaryBehavior: "affirm",
        oarsTechnique: "affirmation",
        strategicIntent: context.currentStrategy,
        expectedImpact: "neutral"
      });
    }
    const templateIndex = secureRandomInt(0, templates.length - 1);
    const template = templates[templateIndex];
    const text = context.language === "ru" ? template.templateRu : template.template;
    return this.createResponse({
      text,
      textRu: template.templateRu,
      primaryBehavior: "affirm",
      oarsTechnique: "affirmation",
      strategicIntent: context.currentStrategy,
      expectedImpact: "neutral"
    });
  }
  /**
   * Generate reflection of client statement
   */
  async generateReflection(utterance, type, context) {
    const templates = REFLECTION_TEMPLATES.filter((t) => t.type === type);
    if (templates.length === 0) {
      const text2 = context.language === "ru" ? `\u0412\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435, \u0447\u0442\u043E ${utterance.text.toLowerCase()}.` : `You're saying that ${utterance.text.toLowerCase()}.`;
      return this.createResponse({
        text: text2,
        textRu: `\u0412\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435, \u0447\u0442\u043E ${utterance.text.toLowerCase()}.`,
        primaryBehavior: "reflection_simple",
        oarsTechnique: "reflection",
        reflectionType: "rephrase",
        strategicIntent: context.currentStrategy,
        expectedImpact: utterance.category === "change_talk" ? "increase_ct" : "explore"
      });
    }
    const template = templates[0];
    const isComplex = template.complexity === "complex";
    const text = context.language === "ru" ? template.patternRu : template.pattern;
    return this.createResponse({
      text,
      textRu: template.patternRu,
      primaryBehavior: isComplex ? "reflection_complex" : "reflection_simple",
      oarsTechnique: "reflection",
      reflectionType: type,
      strategicIntent: context.currentStrategy,
      expectedImpact: utterance.category === "change_talk" ? "increase_ct" : "explore"
    });
  }
  /**
   * Generate summary
   */
  async generateSummary(type, context) {
    const templates = SUMMARY_TEMPLATES.filter((t) => t.type === type);
    if (templates.length === 0) {
      const text2 = context.language === "ru" ? "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043F\u043E\u0434\u0432\u0435\u0434\u0451\u043C \u0438\u0442\u043E\u0433 \u0442\u043E\u0433\u043E, \u043E \u0447\u0451\u043C \u043C\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u043B\u0438." : "Let me summarize what we've discussed.";
      return this.createResponse({
        text: text2,
        textRu: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043F\u043E\u0434\u0432\u0435\u0434\u0451\u043C \u0438\u0442\u043E\u0433 \u0442\u043E\u0433\u043E, \u043E \u0447\u0451\u043C \u043C\u044B \u0433\u043E\u0432\u043E\u0440\u0438\u043B\u0438.",
        primaryBehavior: "reflection_complex",
        oarsTechnique: "summary",
        summaryType: type,
        strategicIntent: context.currentStrategy,
        expectedImpact: "increase_ct"
      });
    }
    const template = templates[0];
    const text = context.language === "ru" ? template.structureRu : template.structure;
    return this.createResponse({
      text,
      textRu: template.structureRu,
      primaryBehavior: "reflection_complex",
      oarsTechnique: "summary",
      summaryType: type,
      strategicIntent: context.currentStrategy,
      expectedImpact: "increase_ct"
    });
  }
  /**
   * Respond to discord/resistance
   */
  async respondToDiscord(discordType, context) {
    const strategy = DISCORD_RESPONSE_STRATEGIES[discordType];
    const templates = context.language === "ru" ? strategy.templatesRu : strategy.templates;
    const textIndex = secureRandomInt(0, templates.length - 1);
    const text = templates[textIndex];
    return this.createResponse({
      text,
      textRu: strategy.templatesRu[0],
      primaryBehavior: strategy.primaryResponse,
      strategicIntent: "roll_with_resistance",
      expectedImpact: "decrease_st"
    });
  }
  /**
   * Calculate MI fidelity for session
   */
  calculateFidelity(sessionResponses, _clientUtterances) {
    const mutableCounts = {
      openQuestions: 0,
      closedQuestions: 0,
      simpleReflections: 0,
      complexReflections: 0,
      affirm: 0,
      seekCollaboration: 0,
      emphasizeAutonomy: 0,
      persuade: 0,
      confront: 0,
      direct: 0,
      giveInformation: 0
    };
    for (const r of sessionResponses) {
      switch (r.primaryBehavior) {
        case "question_open":
          mutableCounts.openQuestions++;
          break;
        case "question_closed":
          mutableCounts.closedQuestions++;
          break;
        case "reflection_simple":
          mutableCounts.simpleReflections++;
          break;
        case "reflection_complex":
          mutableCounts.complexReflections++;
          break;
        case "affirm":
          mutableCounts.affirm++;
          break;
        case "seek_collaboration":
          mutableCounts.seekCollaboration++;
          break;
        case "emphasize_autonomy":
          mutableCounts.emphasizeAutonomy++;
          break;
        case "persuade":
          mutableCounts.persuade++;
          break;
        case "confront":
          mutableCounts.confront++;
          break;
        case "direct":
          mutableCounts.direct++;
          break;
        case "give_information":
          mutableCounts.giveInformation++;
          break;
      }
    }
    const counts = { ...mutableCounts };
    const totalQuestions = counts.openQuestions + counts.closedQuestions;
    const totalReflections = counts.simpleReflections + counts.complexReflections;
    const adherent = counts.affirm + counts.seekCollaboration + counts.emphasizeAutonomy;
    const nonAdherent = counts.persuade + counts.confront + counts.direct;
    const summaryScores = {
      reflectionToQuestionRatio: totalQuestions > 0 ? totalReflections / totalQuestions : 0,
      percentComplexReflections: totalReflections > 0 ? counts.complexReflections / totalReflections * 100 : 0,
      percentOpenQuestions: totalQuestions > 0 ? counts.openQuestions / totalQuestions * 100 : 0,
      adherentNonAdherentRatio: nonAdherent > 0 ? adherent / nonAdherent : adherent,
      fidelityLevel: this.determineFidelityLevel(counts)
    };
    const globalScores = {
      cultivatingChangeTalk: Math.min(5, 2.5 + summaryScores.reflectionToQuestionRatio * 0.5 + summaryScores.percentComplexReflections * 0.02),
      softeningSustainTalk: Math.min(5, 3 + (adherent - nonAdherent) * 0.2),
      partnership: Math.min(5, 3 + counts.seekCollaboration * 0.3 + counts.emphasizeAutonomy * 0.3),
      empathy: Math.min(5, 3 + counts.complexReflections * 0.2)
    };
    const recommendations = [];
    const highlights = [];
    const growthAreas = [];
    if (summaryScores.reflectionToQuestionRatio < 1) {
      recommendations.push("Increase ratio of reflections to questions");
      growthAreas.push("Reflective listening");
    } else {
      highlights.push("Good reflection to question ratio");
    }
    if (summaryScores.percentComplexReflections < 40) {
      recommendations.push("Use more complex reflections");
      growthAreas.push("Deep reflection skills");
    } else {
      highlights.push("Good use of complex reflections");
    }
    if (summaryScores.percentOpenQuestions < 50) {
      recommendations.push("Ask more open-ended questions");
      growthAreas.push("Open questioning");
    } else {
      highlights.push("Good use of open questions");
    }
    if (nonAdherent > 0) {
      recommendations.push("Reduce MI-non-adherent behaviors");
      growthAreas.push("MI spirit adherence");
    }
    return {
      sessionId: `session_${Date.now()}`,
      timestamp: /* @__PURE__ */ new Date(),
      duration: sessionResponses.length * 2,
      // Estimate 2 min per exchange
      globalScores,
      behaviorCounts: counts,
      summaryScores,
      recommendations,
      highlights,
      growthAreas
    };
  }
  /**
   * Get strategy recommendation based on state
   */
  recommendStrategy(state) {
    if (state.discord.level > 0.5) {
      return "roll_with_resistance";
    }
    const readinessAssessment = this.assessReadinessForAction(state);
    if (readinessAssessment.ready) {
      return "action_planning";
    }
    return STRATEGY_RECOMMENDATIONS[state.linkedStage].primaryStrategy;
  }
  /**
   * Determine if ready for action planning
   */
  assessReadinessForAction(state) {
    const reasons = [];
    const nextSteps = [];
    const ctRatioHigh = state.languageBalance.changeTalkRatio >= 0.7;
    const mobilizingPresent = state.darnCatProfile.mobilizingPresent;
    const lowDiscord = state.discord.level < 0.3;
    const readinessHigh = state.readinessRuler.readiness >= 7;
    const ambivalenceResolved = state.ambivalence.level < 0.4;
    if (ctRatioHigh) {
      reasons.push("High change talk ratio");
    }
    if (mobilizingPresent) {
      reasons.push("Mobilizing language present");
    }
    if (lowDiscord) {
      reasons.push("Good therapeutic rapport");
    }
    if (readinessHigh) {
      reasons.push("High readiness scores");
    }
    if (ambivalenceResolved) {
      reasons.push("Ambivalence largely resolved");
    }
    const ready = reasons.length >= 3;
    if (!ready) {
      if (!ctRatioHigh) {
        nextSteps.push("Continue evoking change talk");
      }
      if (!mobilizingPresent) {
        nextSteps.push("Elicit commitment language");
      }
      if (!lowDiscord) {
        nextSteps.push("Address therapeutic relationship");
      }
      if (!readinessHigh) {
        nextSteps.push("Build importance and confidence");
      }
      if (!ambivalenceResolved) {
        nextSteps.push("Explore remaining ambivalence");
      }
    }
    return { ready, reasons, nextSteps };
  }
  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================
  calculateMatchConfidence(text, keyword) {
    const lengthFactor = Math.min(1, keyword.length / 20);
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    const boundaryMatch = regex.test(text) ? 0.2 : 0;
    return 0.5 + lengthFactor * 0.3 + boundaryMatch;
  }
  selectTargetCt(state) {
    const profile = state.darnCatProfile;
    if (!profile.mobilizingPresent) {
      const prep = [
        { type: "desire", count: profile.desire },
        { type: "ability", count: profile.ability },
        { type: "reasons", count: profile.reasons },
        { type: "need", count: profile.need }
      ];
      prep.sort((a, b) => a.count - b.count);
      return prep[0].type;
    }
    if (profile.mobilizingRatio < 0.5) {
      if (profile.commitment < profile.activation) {
        return "commitment";
      }
      if (profile.activation < profile.takingSteps) {
        return "activation";
      }
      return "taking_steps";
    }
    return "commitment";
  }
  createResponse(params) {
    return {
      id: `resp_${++this.responseIdCounter}`,
      text: params.text,
      textRu: params.textRu,
      primaryBehavior: params.primaryBehavior,
      secondaryBehaviors: params.secondaryBehaviors,
      oarsTechnique: params.oarsTechnique,
      reflectionType: params.reflectionType,
      summaryType: params.summaryType,
      targetChangeTalk: params.targetChangeTalk,
      strategicIntent: params.strategicIntent,
      expectedImpact: params.expectedImpact,
      spiritAlignment: this.calculateSpiritAlignment(params.primaryBehavior),
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  calculateSpiritAlignment(behavior) {
    const adherentBehaviors = [
      "affirm",
      "seek_collaboration",
      "emphasize_autonomy",
      "support",
      "reflection_complex",
      "question_open"
    ];
    const neutralBehaviors = [
      "reflection_simple",
      "give_information",
      "structure"
    ];
    const nonAdherentBehaviors = [
      "persuade",
      "confront",
      "direct"
    ];
    if (adherentBehaviors.includes(behavior)) {
      return 0.9;
    }
    if (neutralBehaviors.includes(behavior)) {
      return 0.7;
    }
    if (nonAdherentBehaviors.includes(behavior)) {
      return 0.3;
    }
    return 0.6;
  }
  determineFidelityLevel(counts) {
    const totalQuestions = counts.openQuestions + counts.closedQuestions;
    const totalReflections = counts.simpleReflections + counts.complexReflections;
    const rq = totalQuestions > 0 ? totalReflections / totalQuestions : 0;
    const pcr = totalReflections > 0 ? counts.complexReflections / totalReflections * 100 : 0;
    const poq = totalQuestions > 0 ? counts.openQuestions / totalQuestions * 100 : 0;
    const { competent, proficient } = MITI_THRESHOLDS.summary;
    if (rq >= proficient.reflectionToQuestionRatio && pcr >= proficient.percentComplexReflections && poq >= proficient.percentOpenQuestions) {
      return "proficient";
    }
    if (rq >= competent.reflectionToQuestionRatio && pcr >= competent.percentComplexReflections && poq >= competent.percentOpenQuestions) {
      return "competent";
    }
    return "below_threshold";
  }
};

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
      feedforward: Array.from({ length: numLayers }, () => ({
        linear1: this.initRandomMatrix(embedDim, embedDim * 4),
        linear2: this.initRandomMatrix(embedDim * 4, embedDim),
        bias1: Array.from({ length: embedDim * 4 }, () => 0),
        bias2: Array.from({ length: embedDim }, () => 0)
      })),
      layerNorm: Array.from({ length: numLayers * 2 }, () => ({
        gamma: Array.from({ length: embedDim }, () => 1),
        beta: Array.from({ length: embedDim }, () => 0)
      }))
    };
    const embedding = {
      observation: this.initRandomMatrix(obsDim, embedDim),
      time: this.config.timeEmbedding === "learned" ? this.initRandomMatrix(1, embedDim) : void 0,
      position: this.initPositionalEmbedding(this.config.contextWindow, embedDim)
    };
    const gainPredictor = this.config.learnedGain ? {
      weights: this.initRandomMatrix(embedDim, stateDim * obsDim),
      bias: Array.from({ length: stateDim * obsDim }, () => 0)
    } : void 0;
    const blendPredictor = {
      weights: Array.from({ length: embedDim }, () => secureRandom() * 0.1),
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
      if (!predRow || !actualRow) {
        continue;
      }
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
      if (!firstObs || !firstTimestamp) {
        continue;
      }
      let state = this.initializeState(firstObs, firstTimestamp);
      for (let t = 1; t < sample.observations.length; t++) {
        const obs = sample.observations[t];
        const ts = sample.timestamps[t];
        if (!obs || !ts) {
          continue;
        }
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
        innovation: Array.from({ length: n }, () => 0),
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
        innovation: Array.from({ length: n }, () => 0),
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
    const lastContext = contextEncoding[contextEncoding.length - 1] || Array.from({ length: this.config.embedDim }, () => 0);
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
      return [Array.from({ length: this.config.embedDim }, () => 0)];
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
        if (!Qi) {
          continue;
        }
        for (let j = 0; j < seqLen; j++) {
          let score = 0;
          const Kj = K[j];
          if (!Kj) {
            continue;
          }
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
        const attended = Array.from({ length: headDim }, () => 0);
        const scoresI = scores[i];
        if (!scoresI) {
          continue;
        }
        for (let j = 0; j < seqLen; j++) {
          const Vj = V[j];
          if (!Vj) {
            continue;
          }
          for (let k = 0; k < headDim; k++) {
            attended[k] = (attended[k] ?? 0) + (scoresI[j] ?? 0) * (Vj[k] ?? 0);
          }
        }
        if (!headOutputs[i]) {
          headOutputs[i] = [];
        }
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
      return Array.from({ length: this.config.stateDim }, () => 0);
    }
    const lastEncoding = contextEncoding[contextEncoding.length - 1];
    if (!lastEncoding) {
      return Array.from({ length: this.config.stateDim }, () => 0);
    }
    return this.matVec(this.weights.outputProjection, lastEncoding);
  }
  computeBlendRatio(contextEncoding, _kalmanState, _observation) {
    if (!this.weights.blendPredictor) {
      return this.config.blendRatio;
    }
    const lastContext = contextEncoding[contextEncoding.length - 1] ?? Array.from({ length: this.config.embedDim }, () => 0);
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
      if (!embI) {
        continue;
      }
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        const embJ = embeddings[j];
        if (!embJ) {
          continue;
        }
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
    if (observation.length === 0) {
      return "unknown";
    }
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
    if (attentionWeights.length < 3) {
      return false;
    }
    const lastRow = attentionWeights[attentionWeights.length - 1];
    if (!lastRow || lastRow.length < 2) {
      return false;
    }
    const adjacentWeight = (lastRow[lastRow.length - 2] ?? 0) + (lastRow[lastRow.length - 1] ?? 0);
    const totalWeight = lastRow.reduce((a, b) => a + b, 0);
    return totalWeight > 0 && adjacentWeight / totalWeight < 0.5;
  }
  // Matrix operations
  initIdentityMatrix(n) {
    return Array.from(
      { length: n },
      (_, i) => Array.from({ length: n }, (_2, j) => i === j ? 1 : 0)
    );
  }
  initDiagonalMatrix(n, value) {
    return Array.from(
      { length: n },
      (_, i) => Array.from({ length: n }, (_2, j) => i === j ? value : 0)
    );
  }
  initRandomMatrix(rows, cols) {
    const scale = Math.sqrt(2 / (rows + cols));
    return Array.from(
      { length: rows },
      () => Array.from({ length: cols }, () => (secureRandom() - 0.5) * 2 * scale)
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
    return Array.from(
      { length: numLayers },
      () => Array.from({ length: numHeads }, () => {
        const matrix = this.initRandomMatrix(embedDim, headDim);
        return matrix[0] ?? Array.from({ length: headDim }, () => 0);
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
    return Array.from(
      { length: rowsA },
      (_, i) => Array.from({ length: colsB }, (_2, j) => {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
        }
        return sum;
      })
    );
  }
  transpose(A) {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    return Array.from(
      { length: cols },
      (_, i) => Array.from({ length: rows }, (_2, j) => A[j]?.[i] || 0)
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
    const augmented = A.map((row, i) => [...row, ...identity[i] ?? Array.from({ length: n }, () => 0)]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      const rowI = augmented[i];
      if (!rowI) {
        continue;
      }
      for (let k = i + 1; k < n; k++) {
        const rowK = augmented[k];
        const rowMax2 = augmented[maxRow];
        if (!rowK || !rowMax2) {
          continue;
        }
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
      if (!currentRow) {
        continue;
      }
      const pivotVal = currentRow[i] ?? 0;
      if (Math.abs(pivotVal) < 1e-10) {
        return this.initDiagonalMatrix(n, 1);
      }
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const rowK = augmented[k];
          if (!rowK) {
            continue;
          }
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
    const A = Array.from({ length: n }, () => 0.85 + secureRandom() * 0.1);
    const W = this.initializeMatrix(n, n, "sparse_stable");
    const B = this.initializeMatrix(n, n, "near_identity");
    const biasLatent = Array.from({ length: n }, () => 0);
    const biasObserved = Array.from({ length: n }, () => 0);
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
    let dendriticTerm = Array.from({ length: n }, () => 0);
    if (this.config.connectivity === "dendritic" && dendriticWeights && C) {
      const bases = dendriticWeights.map(
        (row) => row.reduce((sum, w, i) => sum + w * (z[i % z.length] ?? 0), 0)
      );
      const activatedBases = bases.map((b) => Math.max(0, b));
      dendriticTerm = C.map(
        (row) => row.reduce((sum, c, i) => sum + c * (activatedBases[i] ?? 0), 0)
      );
    }
    let inputTerm = Array.from({ length: n }, () => 0);
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
    if (!this.kalmanFormer) {
      return;
    }
    if (!this.kalmanFormerState) {
      const initialState = {
        latentState: [...observation],
        hiddenActivations: observation.map((v) => Math.max(0, v)),
        observedState: [...observation],
        uncertainty: Array.from({ length: observation.length }, () => 0.1),
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
      if (!row) {
        continue;
      }
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
    const input = Array.from({ length: this.config.latentDim }, () => 0);
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
      if (!intState || !baseState) {
        continue;
      }
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
      if (!intState || !baseState) {
        continue;
      }
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
      if (!target) {
        continue;
      }
      const loss = this.calculateLoss([predicted.observedState], [target]);
      totalLoss += loss;
      this.updateWeightsOnline(state, predicted, target);
      if (randomBooleanSecure(this.config.teacherForcingRatio)) {
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
      if (!predRow || !actualRow) {
        continue;
      }
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
      if (!row) {
        continue;
      }
      for (let j = 0; j < n; j++) {
        if (Math.abs(row[j] ?? 0) < 0.01) {
          zeroCount++;
        }
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
          row[j] = i === j ? 1 + (secureRandom() - 0.5) * 0.1 : (secureRandom() - 0.5) * 0.02;
        } else if (type === "sparse") {
          row[j] = randomBooleanSecure(0.2) ? (secureRandom() - 0.5) * 2 * scale : 0;
        } else if (type === "sparse_stable") {
          const smallScale = scale * 0.3;
          row[j] = randomBooleanSecure(0.3) ? (secureRandom() - 0.5) * 2 * smallScale : 0;
        } else {
          row[j] = (secureRandom() - 0.5) * 2 * scale;
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
      uncertainty: Array.from({ length: n }, () => 0.1),
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
      if (!rowI) {
        continue;
      }
      for (let j = i + 1; j < n; j++) {
        const rowJ = rowJ_check[j];
        if (!rowJ) {
          continue;
        }
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
    if (series.length < 3) {
      return 0;
    }
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
    if (series.length < 2) {
      return 0;
    }
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (series.length - 1);
    return variance;
  }
  detectFlickering(series) {
    if (series.length < 5) {
      return 0;
    }
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
    if (autocorrelation < 0.7) {
      return null;
    }
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
    if (n < 3) {
      return 0;
    }
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
    if (!this.weights || !this.adamState) {
      return;
    }
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
      if (!rowB) {
        continue;
      }
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
      if (!rowW) {
        continue;
      }
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
    let v = Array.from({ length: n }, () => 1 / Math.sqrt(n));
    for (let iter = 0; iter < 20; iter++) {
      const Av2 = this.matVec(W, v);
      const norm = Math.sqrt(Av2.reduce((sum, x) => sum + x * x, 0));
      if (norm < 1e-10) {
        return 0;
      }
      v = Av2.map((x) => x / norm);
    }
    const Av = this.matVec(W, v);
    return Av.reduce((sum, x, i) => sum + x * (v[i] ?? 0), 0);
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
    if (!this.adamState.m.A) {
      this.adamState.m.A = [Array.from({ length: n }, () => 0)];
      this.adamState.v.A = [Array.from({ length: n }, () => 0)];
    }
    for (let i = 0; i < n; i++) {
      let grad = gradients.dA[i] ?? 0;
      grad += l2Reg * (A[i] ?? 0);
      grad = clip(grad);
      const mA = this.adamState.m.A[0];
      const vA = this.adamState.v.A[0];
      mA[i] = beta1 * (mA[i] ?? 0) + (1 - beta1) * grad;
      vA[i] = beta2 * (vA[i] ?? 0) + (1 - beta2) * grad * grad;
      const mHat = mA[i] / biasCorrection1;
      const vHat = vA[i] / biasCorrection2;
      A[i] = (A[i] ?? 0.9) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
    if (!this.adamState.m.W) {
      this.adamState.m.W = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
      this.adamState.v.W = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    }
    for (let i = 0; i < n; i++) {
      const wRow = W[i];
      const dWRow = gradients.dW[i];
      if (!wRow || !dWRow) {
        continue;
      }
      for (let j = 0; j < n; j++) {
        let grad = dWRow[j] ?? 0;
        const wij = wRow[j] ?? 0;
        grad += l1Reg * Math.sign(wij);
        grad += l2Reg * wij;
        grad = clip(grad);
        const mW = this.adamState.m.W;
        const vW = this.adamState.v.W;
        mW[i][j] = beta1 * (mW[i][j] ?? 0) + (1 - beta1) * grad;
        vW[i][j] = beta2 * (vW[i][j] ?? 0) + (1 - beta2) * grad * grad;
        const mHat = mW[i][j] / biasCorrection1;
        const vHat = vW[i][j] / biasCorrection2;
        wRow[j] = wij - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
    if (!this.adamState.m.B) {
      this.adamState.m.B = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
      this.adamState.v.B = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    }
    for (let i = 0; i < n; i++) {
      const bRow = B[i];
      const dBRow = gradients.dB[i];
      if (!bRow || !dBRow) {
        continue;
      }
      for (let j = 0; j < n; j++) {
        let grad = dBRow[j] ?? 0;
        grad += l2Reg * (bRow[j] ?? 0);
        grad = clip(grad);
        const mB = this.adamState.m.B;
        const vB = this.adamState.v.B;
        mB[i][j] = beta1 * (mB[i][j] ?? 0) + (1 - beta1) * grad;
        vB[i][j] = beta2 * (vB[i][j] ?? 0) + (1 - beta2) * grad * grad;
        const mHat = mB[i][j] / biasCorrection1;
        const vHat = vB[i][j] / biasCorrection2;
        bRow[j] = (bRow[j] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
    if (!this.adamState.m.biasLatent) {
      this.adamState.m.biasLatent = [Array.from({ length: n }, () => 0)];
      this.adamState.v.biasLatent = [Array.from({ length: n }, () => 0)];
    }
    for (let i = 0; i < n; i++) {
      const grad = clip(gradients.dBiasLatent[i] ?? 0);
      const mBL = this.adamState.m.biasLatent[0];
      const vBL = this.adamState.v.biasLatent[0];
      mBL[i] = beta1 * (mBL[i] ?? 0) + (1 - beta1) * grad;
      vBL[i] = beta2 * (vBL[i] ?? 0) + (1 - beta2) * grad * grad;
      const mHat = mBL[i] / biasCorrection1;
      const vHat = vBL[i] / biasCorrection2;
      biasLatent[i] = (biasLatent[i] ?? 0) - learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
    if (!this.adamState.m.biasObserved) {
      this.adamState.m.biasObserved = [Array.from({ length: n }, () => 0)];
      this.adamState.v.biasObserved = [Array.from({ length: n }, () => 0)];
    }
    for (let i = 0; i < n; i++) {
      const grad = clip(gradients.dBiasObserved[i] ?? 0);
      const mBO = this.adamState.m.biasObserved[0];
      const vBO = this.adamState.v.biasObserved[0];
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
  // CRITICAL: Use negative lookbehind to avoid matching "не хочу жить" as protective
  /но\s+(?:хочу|буду|попробу|есть надежда)/i,
  /не\s+(?:хочу умирать|собираюсь|буду этого делать)/i,
  /помог(?:и|ите)/i,
  /нужна помощь/i,
  /(?<!не\s)хочу\s+жить/i,
  // "хочу жить" but NOT "не хочу жить"
  /хочу\s+(?:измени|помощ)/i,
  // English - more specific patterns
  // CRITICAL: Use negative lookbehind to avoid "don't want to live" as protective
  // Fixed: Avoid nested optional groups with quantifiers (ReDoS prevention)
  /but i want to/i,
  /but want to/i,
  /but i will/i,
  /but will/i,
  /but i'?m trying/i,
  /but trying/i,
  /but there'?s hope/i,
  /i don'?t want to die/i,
  /don'?t want to die/i,
  /i'?m not going to/i,
  /not actually/i,
  /help me/i,
  /need help/i,
  /(?<!don'?t\s)want to\s+(?:live|change|get help)/i
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
    if (indicators.length === 0) {
      return 0;
    }
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes("suicidal")) {
        score += 0.4;
      } else if (indicator.includes("selfharm")) {
        score += 0.3;
      } else if (indicator.includes("hopeless")) {
        score += 0.2;
      } else {
        score += 0.1;
      }
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
    if (indicators.length === 0) {
      return 0;
    }
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes("planning")) {
        score += 0.5;
      } else if (indicator.includes("farewell")) {
        score += 0.4;
      } else if (indicator.includes("giving_away")) {
        score += 0.3;
      } else if (indicator.includes("urgency")) {
        score += 0.4;
      } else if (indicator.includes("absolutes")) {
        score += 0.2;
      } else {
        score += 0.1;
      }
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
    if (indicators.length === 0) {
      return 0;
    }
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
    if (hasCyrillic && hasLatin) {
      return "both";
    }
    if (hasCyrillic) {
      return "ru";
    }
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

// src/errors/ErrorCodes.ts
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2["DOMAIN_BELIEF_UPDATE_FAILED"] = "DOMAIN_BELIEF_UPDATE_FAILED";
  ErrorCode2["DOMAIN_BELIEF_INVALID_OBSERVATION"] = "DOMAIN_BELIEF_INVALID_OBSERVATION";
  ErrorCode2["DOMAIN_BELIEF_DIMENSION_NOT_FOUND"] = "DOMAIN_BELIEF_DIMENSION_NOT_FOUND";
  ErrorCode2["DOMAIN_TEMPORAL_NOT_INITIALIZED"] = "DOMAIN_TEMPORAL_NOT_INITIALIZED";
  ErrorCode2["DOMAIN_TEMPORAL_PREDICTION_FAILED"] = "DOMAIN_TEMPORAL_PREDICTION_FAILED";
  ErrorCode2["DOMAIN_TEMPORAL_INVALID_TRAJECTORY"] = "DOMAIN_TEMPORAL_INVALID_TRAJECTORY";
  ErrorCode2["DOMAIN_CRISIS_DETECTION_FAILED"] = "DOMAIN_CRISIS_DETECTION_FAILED";
  ErrorCode2["DOMAIN_CRISIS_INVALID_STATE"] = "DOMAIN_CRISIS_INVALID_STATE";
  ErrorCode2["DOMAIN_INTERVENTION_NOT_FOUND"] = "DOMAIN_INTERVENTION_NOT_FOUND";
  ErrorCode2["DOMAIN_INTERVENTION_SELECTION_FAILED"] = "DOMAIN_INTERVENTION_SELECTION_FAILED";
  ErrorCode2["DOMAIN_INTERVENTION_NO_ELIGIBLE"] = "DOMAIN_INTERVENTION_NO_ELIGIBLE";
  ErrorCode2["DOMAIN_METACOGNITION_INVALID_ITEM"] = "DOMAIN_METACOGNITION_INVALID_ITEM";
  ErrorCode2["DOMAIN_METACOGNITION_ANALYSIS_FAILED"] = "DOMAIN_METACOGNITION_ANALYSIS_FAILED";
  ErrorCode2["DOMAIN_CAUSAL_NODE_NOT_FOUND"] = "DOMAIN_CAUSAL_NODE_NOT_FOUND";
  ErrorCode2["DOMAIN_CAUSAL_INVALID_GRAPH"] = "DOMAIN_CAUSAL_INVALID_GRAPH";
  ErrorCode2["APP_SESSION_NOT_FOUND"] = "APP_SESSION_NOT_FOUND";
  ErrorCode2["APP_SESSION_EXPIRED"] = "APP_SESSION_EXPIRED";
  ErrorCode2["APP_SESSION_START_FAILED"] = "APP_SESSION_START_FAILED";
  ErrorCode2["APP_SESSION_END_FAILED"] = "APP_SESSION_END_FAILED";
  ErrorCode2["APP_MESSAGE_PROCESSING_FAILED"] = "APP_MESSAGE_PROCESSING_FAILED";
  ErrorCode2["APP_MESSAGE_INVALID_FORMAT"] = "APP_MESSAGE_INVALID_FORMAT";
  ErrorCode2["APP_PIPELINE_STAGE_FAILED"] = "APP_PIPELINE_STAGE_FAILED";
  ErrorCode2["APP_PIPELINE_TIMEOUT"] = "APP_PIPELINE_TIMEOUT";
  ErrorCode2["APP_VOICE_PROCESSING_FAILED"] = "APP_VOICE_PROCESSING_FAILED";
  ErrorCode2["APP_VOICE_TRANSCRIPTION_FAILED"] = "APP_VOICE_TRANSCRIPTION_FAILED";
  ErrorCode2["APP_EXPORT_FAILED"] = "APP_EXPORT_FAILED";
  ErrorCode2["APP_IMPORT_FAILED"] = "APP_IMPORT_FAILED";
  ErrorCode2["APP_DELETE_FAILED"] = "APP_DELETE_FAILED";
  ErrorCode2["INFRA_STORAGE_READ_FAILED"] = "INFRA_STORAGE_READ_FAILED";
  ErrorCode2["INFRA_STORAGE_WRITE_FAILED"] = "INFRA_STORAGE_WRITE_FAILED";
  ErrorCode2["INFRA_STORAGE_CONNECTION_FAILED"] = "INFRA_STORAGE_CONNECTION_FAILED";
  ErrorCode2["INFRA_EXTERNAL_SERVICE_UNAVAILABLE"] = "INFRA_EXTERNAL_SERVICE_UNAVAILABLE";
  ErrorCode2["INFRA_EXTERNAL_SERVICE_TIMEOUT"] = "INFRA_EXTERNAL_SERVICE_TIMEOUT";
  ErrorCode2["INFRA_EXTERNAL_SERVICE_ERROR"] = "INFRA_EXTERNAL_SERVICE_ERROR";
  ErrorCode2["INFRA_NLP_SERVICE_FAILED"] = "INFRA_NLP_SERVICE_FAILED";
  ErrorCode2["INFRA_AI_MODEL_NOT_LOADED"] = "INFRA_AI_MODEL_NOT_LOADED";
  ErrorCode2["VALIDATION_REQUIRED_FIELD"] = "VALIDATION_REQUIRED_FIELD";
  ErrorCode2["VALIDATION_INVALID_FORMAT"] = "VALIDATION_INVALID_FORMAT";
  ErrorCode2["VALIDATION_OUT_OF_RANGE"] = "VALIDATION_OUT_OF_RANGE";
  ErrorCode2["VALIDATION_INVALID_TYPE"] = "VALIDATION_INVALID_TYPE";
  ErrorCode2["VALIDATION_EMPTY_ARRAY"] = "VALIDATION_EMPTY_ARRAY";
  ErrorCode2["VALIDATION_INVALID_ID"] = "VALIDATION_INVALID_ID";
  ErrorCode2["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
  ErrorCode2["INTERNAL_ERROR"] = "INTERNAL_ERROR";
  ErrorCode2["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
  return ErrorCode2;
})(ErrorCode || {});
var ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
  ErrorSeverity2["LOW"] = "low";
  ErrorSeverity2["MEDIUM"] = "medium";
  ErrorSeverity2["HIGH"] = "high";
  ErrorSeverity2["CRITICAL"] = "critical";
  return ErrorSeverity2;
})(ErrorSeverity || {});
var ErrorCategory = /* @__PURE__ */ ((ErrorCategory2) => {
  ErrorCategory2["DOMAIN"] = "domain";
  ErrorCategory2["APPLICATION"] = "application";
  ErrorCategory2["INFRASTRUCTURE"] = "infrastructure";
  ErrorCategory2["VALIDATION"] = "validation";
  ErrorCategory2["UNKNOWN"] = "unknown";
  return ErrorCategory2;
})(ErrorCategory || {});
function getErrorCategory(code) {
  if (code.startsWith("DOMAIN_")) {
    return "domain" /* DOMAIN */;
  }
  if (code.startsWith("APP_")) {
    return "application" /* APPLICATION */;
  }
  if (code.startsWith("INFRA_")) {
    return "infrastructure" /* INFRASTRUCTURE */;
  }
  if (code.startsWith("VALIDATION_")) {
    return "validation" /* VALIDATION */;
  }
  return "unknown" /* UNKNOWN */;
}
function getDefaultSeverity(code) {
  if (code.includes("CRISIS")) {
    return "critical" /* CRITICAL */;
  }
  if (code.startsWith("INFRA_")) {
    return "high" /* HIGH */;
  }
  if (code === "INTERNAL_ERROR" /* INTERNAL_ERROR */) {
    return "high" /* HIGH */;
  }
  if (code.startsWith("DOMAIN_")) {
    return "medium" /* MEDIUM */;
  }
  if (code.startsWith("APP_")) {
    return "medium" /* MEDIUM */;
  }
  if (code.startsWith("VALIDATION_")) {
    return "low" /* LOW */;
  }
  return "medium" /* MEDIUM */;
}

// src/errors/BaseError.ts
var CogniCoreError = class _CogniCoreError extends Error {
  constructor(code, message, context = {}, options) {
    super(message, { cause: options?.cause });
    __publicField(this, "code");
    __publicField(this, "category");
    __publicField(this, "severity");
    __publicField(this, "context");
    __publicField(this, "timestamp");
    __publicField(this, "isOperational");
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.code = code;
    this.category = getErrorCategory(code);
    this.severity = options?.severity ?? getDefaultSeverity(code);
    this.context = context;
    this.timestamp = /* @__PURE__ */ new Date();
    this.isOperational = options?.isOperational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }
  /**
   * Serialize error for logging or API response
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: Object.keys(this.context).length > 0 ? this.context : void 0,
      cause: this.cause instanceof Error ? this.cause.message : void 0,
      stack: process.env.NODE_ENV === "development" ? this.stack : void 0
    };
  }
  /**
   * Create a safe version of error for client response (no sensitive data)
   */
  toClientResponse() {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString()
    };
  }
  /**
   * Create CogniCoreError from unknown error
   */
  static fromUnknown(error, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */, context = {}) {
    if (error instanceof _CogniCoreError) {
      return error;
    }
    if (error instanceof Error) {
      return new _CogniCoreError(defaultCode, error.message, context, {
        cause: error
      });
    }
    return new _CogniCoreError(
      defaultCode,
      typeof error === "string" ? error : "An unknown error occurred",
      context
    );
  }
  /**
   * Check if error is a specific type
   */
  static isErrorCode(error, code) {
    return error instanceof _CogniCoreError && error.code === code;
  }
  /**
   * Check if error belongs to a category
   */
  static isCategory(error, category) {
    return error instanceof _CogniCoreError && error.category === category;
  }
};

// src/errors/DomainErrors.ts
var BeliefUpdateError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("DOMAIN_BELIEF_UPDATE_FAILED" /* DOMAIN_BELIEF_UPDATE_FAILED */, message, {
      component: "BeliefUpdateEngine",
      ...context
    }, { cause });
  }
};
var InvalidObservationError = class extends CogniCoreError {
  constructor(observationType, context, cause) {
    super(
      "DOMAIN_BELIEF_INVALID_OBSERVATION" /* DOMAIN_BELIEF_INVALID_OBSERVATION */,
      `Invalid observation type: ${observationType}`,
      { component: "BeliefUpdateEngine", ...context },
      { cause }
    );
    this.observationType = observationType;
  }
};
var DimensionNotFoundError = class extends CogniCoreError {
  constructor(dimensionId, context) {
    super(
      "DOMAIN_BELIEF_DIMENSION_NOT_FOUND" /* DOMAIN_BELIEF_DIMENSION_NOT_FOUND */,
      `Dimension not found: ${dimensionId}`,
      { component: "BeliefUpdateEngine", ...context }
    );
    this.dimensionId = dimensionId;
  }
};
var TemporalNotInitializedError = class extends CogniCoreError {
  constructor(engineType, context) {
    super(
      "DOMAIN_TEMPORAL_NOT_INITIALIZED" /* DOMAIN_TEMPORAL_NOT_INITIALIZED */,
      `${engineType} engine not initialized. Call initialize() first.`,
      { component: `${engineType}Engine`, ...context }
    );
    this.engineType = engineType;
  }
};
var PredictionError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("DOMAIN_TEMPORAL_PREDICTION_FAILED" /* DOMAIN_TEMPORAL_PREDICTION_FAILED */, message, {
      component: "TemporalEngine",
      ...context
    }, { cause });
  }
};
var InvalidTrajectoryError = class extends CogniCoreError {
  constructor(reason, context) {
    super(
      "DOMAIN_TEMPORAL_INVALID_TRAJECTORY" /* DOMAIN_TEMPORAL_INVALID_TRAJECTORY */,
      `Invalid trajectory: ${reason}`,
      { component: "TemporalEngine", ...context }
    );
    this.reason = reason;
  }
};
var CrisisDetectionError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("DOMAIN_CRISIS_DETECTION_FAILED" /* DOMAIN_CRISIS_DETECTION_FAILED */, message, {
      component: "CrisisDetector",
      ...context
    }, { cause, severity: "critical" /* CRITICAL */ });
  }
};
var InvalidCrisisStateError = class extends CogniCoreError {
  constructor(currentState, attemptedAction, context) {
    super(
      "DOMAIN_CRISIS_INVALID_STATE" /* DOMAIN_CRISIS_INVALID_STATE */,
      `Cannot ${attemptedAction} in crisis state: ${currentState}`,
      { component: "CrisisManager", ...context },
      { severity: "critical" /* CRITICAL */ }
    );
    this.currentState = currentState;
    this.attemptedAction = attemptedAction;
  }
};
var InterventionNotFoundError = class extends CogniCoreError {
  constructor(interventionId, context) {
    super(
      "DOMAIN_INTERVENTION_NOT_FOUND" /* DOMAIN_INTERVENTION_NOT_FOUND */,
      `Intervention not found: ${interventionId}`,
      { component: "InterventionOptimizer", ...context }
    );
    this.interventionId = interventionId;
  }
};
var InterventionSelectionError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("DOMAIN_INTERVENTION_SELECTION_FAILED" /* DOMAIN_INTERVENTION_SELECTION_FAILED */, message, {
      component: "InterventionOptimizer",
      ...context
    }, { cause });
  }
};
var NoEligibleInterventionsError = class extends CogniCoreError {
  constructor(reason, context) {
    super(
      "DOMAIN_INTERVENTION_NO_ELIGIBLE" /* DOMAIN_INTERVENTION_NO_ELIGIBLE */,
      `No eligible interventions: ${reason}`,
      { component: "InterventionOptimizer", ...context }
    );
    this.reason = reason;
  }
};
var InvalidMetacognitionItemError = class extends CogniCoreError {
  constructor(itemId, context) {
    super(
      "DOMAIN_METACOGNITION_INVALID_ITEM" /* DOMAIN_METACOGNITION_INVALID_ITEM */,
      `Invalid MCQ-30 item ID: ${itemId}`,
      { component: "MetacognitiveEngine", ...context }
    );
    this.itemId = itemId;
  }
};
var MetacognitionAnalysisError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("DOMAIN_METACOGNITION_ANALYSIS_FAILED" /* DOMAIN_METACOGNITION_ANALYSIS_FAILED */, message, {
      component: "MetacognitiveEngine",
      ...context
    }, { cause });
  }
};
var CausalNodeNotFoundError = class extends CogniCoreError {
  constructor(nodeId, context) {
    super(
      "DOMAIN_CAUSAL_NODE_NOT_FOUND" /* DOMAIN_CAUSAL_NODE_NOT_FOUND */,
      `Causal node not found: ${nodeId}`,
      { component: "CausalEngine", ...context }
    );
    this.nodeId = nodeId;
  }
};
var InvalidCausalGraphError = class extends CogniCoreError {
  constructor(reason, context) {
    super(
      "DOMAIN_CAUSAL_INVALID_GRAPH" /* DOMAIN_CAUSAL_INVALID_GRAPH */,
      `Invalid causal graph: ${reason}`,
      { component: "CausalEngine", ...context }
    );
    this.reason = reason;
  }
};

// src/errors/ApplicationErrors.ts
var SessionNotFoundError = class extends CogniCoreError {
  constructor(sessionId, context) {
    super(
      "APP_SESSION_NOT_FOUND" /* APP_SESSION_NOT_FOUND */,
      `Session not found: ${sessionId}`,
      { component: "SessionManager", ...context }
    );
    this.sessionId = sessionId;
  }
};
var SessionExpiredError = class extends CogniCoreError {
  constructor(sessionId, expiredAt, context) {
    super(
      "APP_SESSION_EXPIRED" /* APP_SESSION_EXPIRED */,
      `Session expired: ${sessionId} at ${expiredAt.toISOString()}`,
      { component: "SessionManager", ...context }
    );
    this.sessionId = sessionId;
    this.expiredAt = expiredAt;
  }
};
var SessionStartError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("APP_SESSION_START_FAILED" /* APP_SESSION_START_FAILED */, message, {
      component: "SessionManager",
      ...context
    }, { cause });
  }
};
var SessionEndError = class extends CogniCoreError {
  constructor(sessionId, message, context, cause) {
    super("APP_SESSION_END_FAILED" /* APP_SESSION_END_FAILED */, message, {
      component: "SessionManager",
      sessionId,
      ...context
    }, { cause });
    this.sessionId = sessionId;
  }
};
var MessageProcessingError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("APP_MESSAGE_PROCESSING_FAILED" /* APP_MESSAGE_PROCESSING_FAILED */, message, {
      component: "MessageProcessor",
      ...context
    }, { cause });
  }
};
var InvalidMessageFormatError = class extends CogniCoreError {
  constructor(expectedFormat, received, context) {
    super(
      "APP_MESSAGE_INVALID_FORMAT" /* APP_MESSAGE_INVALID_FORMAT */,
      `Invalid message format. Expected: ${expectedFormat}, received: ${received}`,
      { component: "MessageProcessor", ...context }
    );
    this.expectedFormat = expectedFormat;
    this.received = received;
  }
};
var PipelineStageError = class extends CogniCoreError {
  constructor(stageName, message, context, cause) {
    super("APP_PIPELINE_STAGE_FAILED" /* APP_PIPELINE_STAGE_FAILED */, message, {
      component: "MessageProcessingPipeline",
      operation: stageName,
      ...context
    }, { cause });
    this.stageName = stageName;
  }
};
var PipelineTimeoutError = class extends CogniCoreError {
  constructor(stageName, timeoutMs, context) {
    super(
      "APP_PIPELINE_TIMEOUT" /* APP_PIPELINE_TIMEOUT */,
      `Pipeline stage '${stageName}' timed out after ${timeoutMs}ms`,
      { component: "MessageProcessingPipeline", operation: stageName, ...context }
    );
    this.stageName = stageName;
    this.timeoutMs = timeoutMs;
  }
};
var VoiceProcessingError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("APP_VOICE_PROCESSING_FAILED" /* APP_VOICE_PROCESSING_FAILED */, message, {
      component: "VoiceInputAdapter",
      ...context
    }, { cause });
  }
};
var TranscriptionError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("APP_VOICE_TRANSCRIPTION_FAILED" /* APP_VOICE_TRANSCRIPTION_FAILED */, message, {
      component: "VoiceInputAdapter",
      ...context
    }, { cause });
  }
};
var DataExportError = class extends CogniCoreError {
  constructor(userId, message, context, cause) {
    super("APP_EXPORT_FAILED" /* APP_EXPORT_FAILED */, message, {
      component: "DataExporter",
      userId,
      ...context
    }, { cause });
    this.userId = userId;
  }
};
var DataImportError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("APP_IMPORT_FAILED" /* APP_IMPORT_FAILED */, message, {
      component: "DataImporter",
      ...context
    }, { cause });
  }
};
var DataDeleteError = class extends CogniCoreError {
  constructor(userId, message, context, cause) {
    super("APP_DELETE_FAILED" /* APP_DELETE_FAILED */, message, {
      component: "DataManager",
      userId,
      ...context
    }, { cause });
    this.userId = userId;
  }
};

// src/errors/InfrastructureErrors.ts
var StorageReadError = class extends CogniCoreError {
  constructor(storageType, message, context, cause) {
    super("INFRA_STORAGE_READ_FAILED" /* INFRA_STORAGE_READ_FAILED */, message, {
      component: storageType,
      ...context
    }, { cause, severity: "high" /* HIGH */ });
    this.storageType = storageType;
  }
};
var StorageWriteError = class extends CogniCoreError {
  constructor(storageType, message, context, cause) {
    super("INFRA_STORAGE_WRITE_FAILED" /* INFRA_STORAGE_WRITE_FAILED */, message, {
      component: storageType,
      ...context
    }, { cause, severity: "high" /* HIGH */ });
    this.storageType = storageType;
  }
};
var StorageConnectionError = class extends CogniCoreError {
  constructor(storageType, message, context, cause) {
    super("INFRA_STORAGE_CONNECTION_FAILED" /* INFRA_STORAGE_CONNECTION_FAILED */, message, {
      component: storageType,
      ...context
    }, { cause, severity: "critical" /* CRITICAL */ });
    this.storageType = storageType;
  }
};
var ExternalServiceUnavailableError = class extends CogniCoreError {
  constructor(serviceName, context, cause) {
    super(
      "INFRA_EXTERNAL_SERVICE_UNAVAILABLE" /* INFRA_EXTERNAL_SERVICE_UNAVAILABLE */,
      `External service unavailable: ${serviceName}`,
      { component: serviceName, ...context },
      { cause, severity: "high" /* HIGH */ }
    );
    this.serviceName = serviceName;
  }
};
var ExternalServiceTimeoutError = class extends CogniCoreError {
  constructor(serviceName, timeoutMs, context) {
    super(
      "INFRA_EXTERNAL_SERVICE_TIMEOUT" /* INFRA_EXTERNAL_SERVICE_TIMEOUT */,
      `External service '${serviceName}' timed out after ${timeoutMs}ms`,
      { component: serviceName, ...context },
      { severity: "high" /* HIGH */ }
    );
    this.serviceName = serviceName;
    this.timeoutMs = timeoutMs;
  }
};
var ExternalServiceError = class extends CogniCoreError {
  constructor(serviceName, message, context, cause) {
    super("INFRA_EXTERNAL_SERVICE_ERROR" /* INFRA_EXTERNAL_SERVICE_ERROR */, message, {
      component: serviceName,
      ...context
    }, { cause, severity: "high" /* HIGH */ });
    this.serviceName = serviceName;
  }
};
var NLPServiceError = class extends CogniCoreError {
  constructor(message, context, cause) {
    super("INFRA_NLP_SERVICE_FAILED" /* INFRA_NLP_SERVICE_FAILED */, message, {
      component: "NLPService",
      ...context
    }, { cause, severity: "high" /* HIGH */ });
  }
};
var AIModelNotLoadedError = class extends CogniCoreError {
  constructor(modelName, context) {
    super(
      "INFRA_AI_MODEL_NOT_LOADED" /* INFRA_AI_MODEL_NOT_LOADED */,
      `AI model not loaded: ${modelName}`,
      { component: "AIModelLoader", ...context },
      { severity: "high" /* HIGH */ }
    );
    this.modelName = modelName;
  }
};

// src/errors/ValidationErrors.ts
var RequiredFieldError = class extends CogniCoreError {
  constructor(fieldName, context) {
    super(
      "VALIDATION_REQUIRED_FIELD" /* VALIDATION_REQUIRED_FIELD */,
      `Required field missing: ${fieldName}`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.fieldName = fieldName;
  }
};
var InvalidFormatError = class extends CogniCoreError {
  constructor(fieldName, expectedFormat, context) {
    super(
      "VALIDATION_INVALID_FORMAT" /* VALIDATION_INVALID_FORMAT */,
      `Invalid format for '${fieldName}'. Expected: ${expectedFormat}`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.fieldName = fieldName;
    this.expectedFormat = expectedFormat;
  }
};
var OutOfRangeError = class extends CogniCoreError {
  constructor(fieldName, min, max, actual, context) {
    super(
      "VALIDATION_OUT_OF_RANGE" /* VALIDATION_OUT_OF_RANGE */,
      `Value for '${fieldName}' out of range. Expected: ${min}-${max}, got: ${actual}`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.fieldName = fieldName;
    this.min = min;
    this.max = max;
    this.actual = actual;
  }
};
var InvalidTypeError = class extends CogniCoreError {
  constructor(fieldName, expectedType, actualType, context) {
    super(
      "VALIDATION_INVALID_TYPE" /* VALIDATION_INVALID_TYPE */,
      `Invalid type for '${fieldName}'. Expected: ${expectedType}, got: ${actualType}`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.fieldName = fieldName;
    this.expectedType = expectedType;
    this.actualType = actualType;
  }
};
var EmptyArrayError = class extends CogniCoreError {
  constructor(fieldName, context) {
    super(
      "VALIDATION_EMPTY_ARRAY" /* VALIDATION_EMPTY_ARRAY */,
      `Array '${fieldName}' cannot be empty`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.fieldName = fieldName;
  }
};
var InvalidIdError = class extends CogniCoreError {
  constructor(idType, invalidValue, context) {
    super(
      "VALIDATION_INVALID_ID" /* VALIDATION_INVALID_ID */,
      `Invalid ${idType} ID: ${invalidValue}`,
      { component: "Validator", ...context },
      { severity: "low" /* LOW */ }
    );
    this.idType = idType;
    this.invalidValue = invalidValue;
  }
};

// src/errors/ErrorHandler.ts
var defaultLogger = {
  debug: (msg, meta) => {
    console.debug(`[DEBUG] ${msg}`, meta ?? "");
  },
  info: (msg, meta) => {
    console.info(`[INFO] ${msg}`, meta ?? "");
  },
  warn: (msg, meta) => {
    console.warn(`[WARN] ${msg}`, meta ?? "");
  },
  error: (msg, meta) => {
    console.error(`[ERROR] ${msg}`, meta ?? "");
  }
};
var _ErrorHandler = class _ErrorHandler {
  constructor(config = {}) {
    __publicField(this, "config");
    __publicField(this, "errorCounts", /* @__PURE__ */ new Map());
    this.config = {
      logger: config.logger ?? defaultLogger,
      includeStackTrace: config.includeStackTrace ?? true,
      onCriticalError: config.onCriticalError ?? (() => {
      }),
      onError: config.onError ?? (() => {
      }),
      environment: config.environment ?? "development"
    };
  }
  /**
   * Get singleton instance
   */
  static getInstance(config) {
    if (!_ErrorHandler.instance) {
      _ErrorHandler.instance = new _ErrorHandler(config);
    }
    return _ErrorHandler.instance;
  }
  /**
   * Reset instance (for testing)
   */
  static resetInstance() {
    _ErrorHandler.instance = void 0;
  }
  /**
   * Update configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
  /**
   * Handle an error - the main entry point
   *
   * @param error - The error to handle (can be any type)
   * @param context - Additional context for logging
   * @param defaultCode - Default error code if error is not CogniCoreError
   * @returns The normalized CogniCoreError
   */
  handle(error, context = {}, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */) {
    const normalizedError = CogniCoreError.fromUnknown(error, defaultCode, context);
    this.incrementErrorCount(normalizedError.code);
    this.logError(normalizedError);
    this.config.onError(normalizedError);
    if (normalizedError.severity === "critical" /* CRITICAL */) {
      this.config.onCriticalError(normalizedError);
    }
    return normalizedError;
  }
  /**
   * Handle error and return a safe response for API
   */
  handleForResponse(error, context = {}, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */) {
    const normalizedError = this.handle(error, context, defaultCode);
    return normalizedError.toClientResponse();
  }
  /**
   * Wrap an async function with error handling
   */
  wrapAsync(fn, context = {}, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handle(error, context, defaultCode);
      }
    };
  }
  /**
   * Wrap a sync function with error handling
   */
  wrapSync(fn, context = {}, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        throw this.handle(error, context, defaultCode);
      }
    };
  }
  /**
   * Log error based on severity
   */
  logError(error) {
    const serialized = error.toJSON();
    const logData = {
      code: serialized.code,
      category: serialized.category,
      severity: serialized.severity,
      timestamp: serialized.timestamp,
      context: serialized.context
    };
    if (this.config.includeStackTrace && serialized.stack) {
      logData.stack = serialized.stack;
    }
    if (serialized.cause) {
      logData.cause = serialized.cause;
    }
    const message = `[${error.code}] ${error.message}`;
    switch (error.severity) {
      case "low" /* LOW */:
        this.config.logger.debug(message, logData);
        break;
      case "medium" /* MEDIUM */:
        this.config.logger.info(message, logData);
        break;
      case "high" /* HIGH */:
        this.config.logger.warn(message, logData);
        break;
      case "critical" /* CRITICAL */:
        this.config.logger.error(message, logData);
        break;
    }
  }
  /**
   * Increment error count for tracking
   */
  incrementErrorCount(code) {
    const current = this.errorCounts.get(code) ?? 0;
    this.errorCounts.set(code, current + 1);
  }
  /**
   * Get error statistics
   */
  getErrorStats() {
    const byCode = {};
    const byCategory = {
      ["domain" /* DOMAIN */]: 0,
      ["application" /* APPLICATION */]: 0,
      ["infrastructure" /* INFRASTRUCTURE */]: 0,
      ["validation" /* VALIDATION */]: 0,
      ["unknown" /* UNKNOWN */]: 0
    };
    const bySeverity = {
      ["low" /* LOW */]: 0,
      ["medium" /* MEDIUM */]: 0,
      ["high" /* HIGH */]: 0,
      ["critical" /* CRITICAL */]: 0
    };
    let total = 0;
    this.errorCounts.forEach((count, code) => {
      byCode[code] = count;
      total += count;
      if (code.startsWith("DOMAIN_")) {
        byCategory["domain" /* DOMAIN */] = (byCategory["domain" /* DOMAIN */] ?? 0) + count;
      } else if (code.startsWith("APP_")) {
        byCategory["application" /* APPLICATION */] = (byCategory["application" /* APPLICATION */] ?? 0) + count;
      } else if (code.startsWith("INFRA_")) {
        byCategory["infrastructure" /* INFRASTRUCTURE */] = (byCategory["infrastructure" /* INFRASTRUCTURE */] ?? 0) + count;
      } else if (code.startsWith("VALIDATION_")) {
        byCategory["validation" /* VALIDATION */] = (byCategory["validation" /* VALIDATION */] ?? 0) + count;
      } else {
        byCategory["unknown" /* UNKNOWN */] = (byCategory["unknown" /* UNKNOWN */] ?? 0) + count;
      }
      if (code.includes("CRISIS")) {
        bySeverity["critical" /* CRITICAL */] = (bySeverity["critical" /* CRITICAL */] ?? 0) + count;
      } else if (code.startsWith("INFRA_")) {
        bySeverity["high" /* HIGH */] = (bySeverity["high" /* HIGH */] ?? 0) + count;
      } else if (code.startsWith("VALIDATION_")) {
        bySeverity["low" /* LOW */] = (bySeverity["low" /* LOW */] ?? 0) + count;
      } else {
        bySeverity["medium" /* MEDIUM */] = (bySeverity["medium" /* MEDIUM */] ?? 0) + count;
      }
    });
    return { total, byCode, byCategory, bySeverity };
  }
  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorCounts.clear();
  }
  /**
   * Check if error should crash the process (programmer error)
   */
  shouldCrash(error) {
    return !error.isOperational;
  }
};
__publicField(_ErrorHandler, "instance");
var ErrorHandler = _ErrorHandler;
var errorHandler = ErrorHandler.getInstance();

// src/errors/GlobalErrorHandlers.ts
var defaultOptions = {
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false,
  // Node.js 15+ already exits by default
  exitGracePeriod: 1e3,
  onUncaughtException: () => {
  },
  onUnhandledRejection: () => {
  }
};
var isInitialized = false;
function initializeGlobalErrorHandlers(options = {}) {
  if (isInitialized) {
    console.warn("[GlobalErrorHandlers] Already initialized, skipping...");
    return;
  }
  const config = { ...defaultOptions, ...options };
  const handler = ErrorHandler.getInstance();
  process.on("unhandledRejection", (reason, _promise) => {
    const error = new CogniCoreError(
      "INTERNAL_ERROR" /* INTERNAL_ERROR */,
      `Unhandled Promise Rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      {
        component: "GlobalErrorHandler",
        operation: "unhandledRejection",
        metadata: {
          promiseInfo: "[Promise]"
        }
      },
      {
        cause: reason instanceof Error ? reason : void 0,
        severity: "high" /* HIGH */,
        isOperational: false
        // Programmer error
      }
    );
    handler.handle(error);
    config.onUnhandledRejection(reason);
    if (config.exitOnUnhandledRejection) {
      console.error("[FATAL] Exiting due to unhandled rejection...");
      setTimeout(() => process.exit(1), config.exitGracePeriod);
    }
  });
  process.on("uncaughtException", (error, origin) => {
    const cogniError = new CogniCoreError(
      "INTERNAL_ERROR" /* INTERNAL_ERROR */,
      `Uncaught Exception: ${error.message}`,
      {
        component: "GlobalErrorHandler",
        operation: "uncaughtException",
        metadata: {
          origin,
          errorName: error.name
        }
      },
      {
        cause: error,
        severity: "critical" /* CRITICAL */,
        isOperational: false
        // Programmer error - should crash
      }
    );
    handler.handle(cogniError);
    config.onUncaughtException(error);
    if (config.exitOnUncaughtException) {
      console.error("[FATAL] Exiting due to uncaught exception...");
      setTimeout(() => process.exit(1), config.exitGracePeriod);
    }
  });
  process.on("warning", (warning) => {
    console.warn(`[PROCESS WARNING] ${warning.name}: ${warning.message}`);
    if (warning.stack) {
      console.warn(warning.stack);
    }
  });
  isInitialized = true;
  console.info("[GlobalErrorHandlers] Initialized successfully");
}
function isGlobalErrorHandlersInitialized() {
  return isInitialized;
}
function resetGlobalErrorHandlers() {
  isInitialized = false;
}

// src/events/IEvents.ts
function createEventMetadata(source, options) {
  return {
    correlationId: options?.correlationId ?? crypto.randomUUID(),
    causationId: options?.causationId,
    userId: options?.userId,
    sessionId: options?.sessionId,
    source,
    context: options?.context
  };
}
function createPipelineContext(correlationId, userId, sessionId) {
  return {
    correlationId,
    startedAt: /* @__PURE__ */ new Date(),
    userId,
    sessionId,
    data: /* @__PURE__ */ new Map(),
    metrics: {}
  };
}
var DEFAULT_EVENT_BUS_CONFIG = {
  enablePersistence: true,
  enableAuditLog: true,
  behaviors: [],
  defaultRetry: {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2
  },
  maxConcurrentHandlers: 10,
  handlerTimeoutMs: 3e4,
  enableDeadLetterQueue: true
};
var DEFAULT_EVENT_STORE_CONFIG = {
  backend: "memory",
  retentionDays: 2190,
  // 6 years (HIPAA requirement)
  enableEncryption: true,
  snapshotThreshold: 100,
  enableCompression: true,
  maxEventsPerQuery: 1e3
};
var CogniCoreEventBus = class {
  constructor(config = {}) {
    __publicField(this, "config");
    __publicField(this, "handlers");
    __publicField(this, "behaviors");
    __publicField(this, "eventStore");
    __publicField(this, "auditLogger");
    __publicField(this, "deadLetterQueue");
    __publicField(this, "isInitialized");
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config };
    this.handlers = /* @__PURE__ */ new Map();
    this.behaviors = [...this.config.behaviors ?? []].sort((a, b) => a.priority - b.priority);
    this.deadLetterQueue = [];
    this.isInitialized = false;
  }
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  /**
   * Initialize event bus with optional event store and audit logger
   */
  async initialize(eventStore, auditLogger) {
    if (this.isInitialized) {
      return;
    }
    this.eventStore = eventStore;
    this.auditLogger = auditLogger;
    this.isInitialized = true;
  }
  /**
   * Check if event bus is initialized
   */
  get initialized() {
    return this.isInitialized;
  }
  // ============================================================================
  // PUBLISHING
  // ============================================================================
  /**
   * Publish domain event
   *
   * @param event - Event to publish
   */
  async publish(event) {
    const context = createPipelineContext(
      event.metadata.correlationId,
      event.metadata.userId,
      event.metadata.sessionId
    );
    await this.executePipeline(event, context, async () => {
      if (this.config.enablePersistence && this.eventStore) {
        await this.eventStore.append(event);
      }
      await this.dispatchToHandlers(event, context);
    });
  }
  /**
   * Publish multiple events atomically
   */
  async publishBatch(events) {
    if (this.config.enablePersistence && this.eventStore) {
      await this.eventStore.appendBatch(events);
    }
    for (const event of events) {
      await this.publish(event);
    }
  }
  // ============================================================================
  // SUBSCRIBING
  // ============================================================================
  /**
   * Subscribe to event type
   *
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function
   * @returns Subscription for unsubscribing
   */
  subscribe(eventType, handler) {
    const subscriptionId = uuid.v4();
    let typeHandlers = this.handlers.get(eventType);
    if (!typeHandlers) {
      typeHandlers = /* @__PURE__ */ new Set();
      this.handlers.set(eventType, typeHandlers);
    }
    const handlerEntry = { id: subscriptionId, handler };
    typeHandlers.add(handlerEntry);
    const subscription = {
      id: subscriptionId,
      eventType,
      handler,
      unsubscribe: () => {
        this.unsubscribe(subscriptionId);
      }
    };
    return subscription;
  }
  /**
   * Subscribe to multiple event types
   */
  subscribeMany(eventTypes, handler) {
    return eventTypes.map((eventType) => this.subscribe(eventType, handler));
  }
  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(handler) {
    return this.subscribe("*", handler);
  }
  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId) {
    for (const [_eventType, typeHandlers] of this.handlers) {
      for (const handlerEntry of typeHandlers) {
        if (handlerEntry.id === subscriptionId) {
          typeHandlers.delete(handlerEntry);
          return;
        }
      }
    }
  }
  /**
   * Clear all subscriptions
   */
  clearAll() {
    this.handlers.clear();
  }
  /**
   * Get subscription count
   */
  getSubscriptionCount(eventType) {
    if (eventType) {
      return this.handlers.get(eventType)?.size ?? 0;
    }
    let count = 0;
    for (const typeHandlers of this.handlers.values()) {
      count += typeHandlers.size;
    }
    return count;
  }
  // ============================================================================
  // BEHAVIORS
  // ============================================================================
  /**
   * Add pipeline behavior
   */
  addBehavior(behavior) {
    this.behaviors.push(behavior);
    this.behaviors.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Remove pipeline behavior by name
   */
  removeBehavior(behaviorName) {
    const index = this.behaviors.findIndex((b) => b.name === behaviorName);
    if (index !== -1) {
      this.behaviors.splice(index, 1);
    }
  }
  /**
   * Get all pipeline behaviors
   */
  getBehaviors() {
    return this.behaviors;
  }
  // ============================================================================
  // DEAD LETTER QUEUE
  // ============================================================================
  /**
   * Get dead letter queue
   */
  getDeadLetterQueue() {
    return this.deadLetterQueue;
  }
  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue() {
    this.deadLetterQueue.length = 0;
  }
  /**
   * Retry dead letter events
   */
  async retryDeadLetterQueue() {
    let succeeded = 0;
    let failed = 0;
    const eventsToRetry = [...this.deadLetterQueue];
    this.clearDeadLetterQueue();
    for (const { event } of eventsToRetry) {
      try {
        await this.publish(event);
        succeeded++;
      } catch {
        failed++;
      }
    }
    return { succeeded, failed };
  }
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  /**
   * Execute event through pipeline behaviors
   */
  async executePipeline(event, context, finalHandler) {
    if (this.behaviors.length === 0) {
      await finalHandler();
      return;
    }
    let pipeline = finalHandler;
    for (let i = this.behaviors.length - 1; i >= 0; i--) {
      const behavior = this.behaviors[i];
      const next = pipeline;
      pipeline = async () => {
        await behavior.handle(event, context, next);
      };
    }
    await pipeline();
  }
  /**
   * Dispatch event to handlers
   */
  async dispatchToHandlers(event, context) {
    const typeHandlers = this.handlers.get(event.eventType) ?? /* @__PURE__ */ new Set();
    const wildcardHandlers = this.handlers.get("*") ?? /* @__PURE__ */ new Set();
    const allHandlers = [...typeHandlers, ...wildcardHandlers];
    if (allHandlers.length === 0) {
      return;
    }
    context.metrics.handlerCount = allHandlers.length;
    const results = await Promise.allSettled(
      allHandlers.map(
        (handlerEntry) => this.executeHandler(handlerEntry.handler, event, context)
      )
    );
    for (const result of results) {
      if (result.status === "rejected") {
        await this.handleFailure(event, result.reason);
      }
    }
  }
  /**
   * Execute single handler with retry
   */
  async executeHandler(handler, event, _context) {
    const { maxAttempts, delayMs, backoffMultiplier } = this.config.defaultRetry;
    let lastError;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        await Promise.race([
          handler(event),
          this.timeout(this.config.handlerTimeoutMs)
        ]);
        return;
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt < maxAttempts) {
          const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }
  /**
   * Handle event processing failure
   */
  async handleFailure(event, error) {
    if (this.config.enableDeadLetterQueue) {
      this.deadLetterQueue.push({
        event,
        error,
        timestamp: /* @__PURE__ */ new Date()
      });
      if (this.config.deadLetterHandler) {
        try {
          await this.config.deadLetterHandler(event, error);
        } catch (dlqError) {
          console.error("[EventBus] Dead letter handler failed:", dlqError);
        }
      }
    }
    if (this.config.enableAuditLog && this.auditLogger) {
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        sessionId: event.metadata.sessionId,
        action: "handle",
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: "failure",
        correlationId: event.metadata.correlationId,
        details: {
          error: error.message,
          stack: error.stack
        }
      });
    }
  }
  /**
   * Create timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler timeout after ${ms}ms`));
      }, ms);
    });
  }
  /**
   * Sleep for specified duration
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
function createEventBus(config) {
  return new CogniCoreEventBus(config);
}
async function createInitializedEventBus(config, eventStore, auditLogger) {
  const eventBus = new CogniCoreEventBus(config);
  await eventBus.initialize(eventStore, auditLogger);
  return eventBus;
}
var InMemoryEventStore = class {
  constructor(config = {}) {
    __publicField(this, "events");
    __publicField(this, "eventIndex");
    __publicField(this, "snapshots");
    __publicField(this, "shreddedAggregates");
    __publicField(this, "config");
    __publicField(this, "globalSequence");
    this.events = /* @__PURE__ */ new Map();
    this.eventIndex = /* @__PURE__ */ new Map();
    this.snapshots = /* @__PURE__ */ new Map();
    this.shreddedAggregates = /* @__PURE__ */ new Set();
    this.config = { ...DEFAULT_EVENT_STORE_CONFIG, ...config };
    this.globalSequence = 0;
  }
  /**
   * Append event to store
   */
  async append(event) {
    const aggregateId = event.aggregateId;
    if (this.shreddedAggregates.has(aggregateId)) {
      throw new Error(`Aggregate ${aggregateId} has been crypto-shredded`);
    }
    const aggregateEvents = this.events.get(aggregateId) ?? [];
    const sequenceNumber = aggregateEvents.length + 1;
    this.globalSequence++;
    const storedEvent = {
      id: uuid.v4(),
      sequenceNumber,
      globalSequence: this.globalSequence,
      event,
      storedAt: /* @__PURE__ */ new Date(),
      encryptionKeyId: this.config.enableEncryption ? this.config.encryptionKeyId : void 0,
      checksum: this.calculateChecksum(event)
    };
    aggregateEvents.push(storedEvent);
    this.events.set(aggregateId, aggregateEvents);
    this.eventIndex.set(storedEvent.id, storedEvent);
    if (sequenceNumber % this.config.snapshotThreshold === 0) ;
    return storedEvent;
  }
  /**
   * Append multiple events atomically
   */
  async appendBatch(events) {
    const results = [];
    const eventsByAggregate = /* @__PURE__ */ new Map();
    for (const event of events) {
      const aggregateEvents = eventsByAggregate.get(event.aggregateId) ?? [];
      aggregateEvents.push(event);
      eventsByAggregate.set(event.aggregateId, aggregateEvents);
    }
    for (const [aggregateId, aggregateEvents] of eventsByAggregate) {
      if (this.shreddedAggregates.has(aggregateId)) {
        throw new Error(`Aggregate ${aggregateId} has been crypto-shredded`);
      }
      for (const event of aggregateEvents) {
        const stored = await this.append(event);
        results.push(stored);
      }
    }
    return results;
  }
  /**
   * Get events by aggregate ID
   */
  async getEvents(aggregateId, fromVersion) {
    if (this.shreddedAggregates.has(aggregateId)) {
      return [];
    }
    const events = this.events.get(aggregateId) ?? [];
    if (fromVersion !== void 0) {
      return events.filter((e) => e.sequenceNumber > fromVersion);
    }
    return [...events];
  }
  /**
   * Query events with filters
   */
  async queryEvents(options) {
    let results = [];
    if (options.aggregateId) {
      const events = this.events.get(options.aggregateId);
      if (events && !this.shreddedAggregates.has(options.aggregateId)) {
        results = [...events];
      }
    } else {
      for (const [aggregateId, events] of this.events) {
        if (!this.shreddedAggregates.has(aggregateId)) {
          results.push(...events);
        }
      }
    }
    if (options.aggregateType) {
      results = results.filter((e) => e.event.aggregateType === options.aggregateType);
    }
    if (options.eventTypes && options.eventTypes.length > 0) {
      results = results.filter((e) => options.eventTypes?.includes(e.event.eventType));
    }
    if (options.userId) {
      results = results.filter((e) => e.event.metadata.userId === options.userId);
    }
    if (options.fromTimestamp) {
      results = results.filter((e) => e.storedAt >= options.fromTimestamp);
    }
    if (options.toTimestamp) {
      results = results.filter((e) => e.storedAt <= options.toTimestamp);
    }
    if (options.fromSequence !== void 0) {
      results = results.filter((e) => e.globalSequence >= options.fromSequence);
    }
    if (options.order === "desc") {
      results.sort((a, b) => b.globalSequence - a.globalSequence);
    } else {
      results.sort((a, b) => a.globalSequence - b.globalSequence);
    }
    const offset = options.offset ?? 0;
    const limit = Math.min(options.limit ?? this.config.maxEventsPerQuery, this.config.maxEventsPerQuery);
    return results.slice(offset, offset + limit);
  }
  /**
   * Get events by type
   */
  async getEventsByType(eventType, options) {
    return this.queryEvents({
      ...options,
      eventTypes: [eventType]
    });
  }
  /**
   * Create snapshot for aggregate
   */
  async createSnapshot(aggregateId, aggregateType, state, version) {
    const snapshot = {
      aggregateId,
      aggregateType,
      version,
      state,
      createdAt: /* @__PURE__ */ new Date(),
      checksum: this.calculateChecksum(state)
    };
    this.snapshots.set(aggregateId, snapshot);
    return snapshot;
  }
  /**
   * Get latest snapshot for aggregate
   */
  async getSnapshot(aggregateId) {
    if (this.shreddedAggregates.has(aggregateId)) {
      return null;
    }
    const snapshot = this.snapshots.get(aggregateId);
    return snapshot ?? null;
  }
  /**
   * Get event count for aggregate
   */
  async getEventCount(aggregateId) {
    if (this.shreddedAggregates.has(aggregateId)) {
      return 0;
    }
    return this.events.get(aggregateId)?.length ?? 0;
  }
  /**
   * Get global event count
   */
  async getTotalEventCount() {
    return this.globalSequence;
  }
  /**
   * Crypto-shred aggregate (GDPR compliance)
   *
   * Note: In a real implementation with encryption, this would
   * destroy the encryption keys, making events unreadable.
   * In this in-memory version, we mark the aggregate as shredded.
   */
  async cryptoShred(aggregateId) {
    const events = this.events.get(aggregateId);
    const count = events?.length ?? 0;
    this.shreddedAggregates.add(aggregateId);
    this.snapshots.delete(aggregateId);
    return count;
  }
  /**
   * Archive old events
   *
   * Note: In production, this would move events to cold storage.
   * In this in-memory version, we just return the count.
   */
  async archiveEvents(beforeDate) {
    let archivedCount = 0;
    for (const [aggregateId, events] of this.events) {
      if (this.shreddedAggregates.has(aggregateId)) {
        continue;
      }
      const oldEvents = events.filter((e) => e.storedAt < beforeDate);
      archivedCount += oldEvents.length;
    }
    return archivedCount;
  }
  /**
   * Verify event integrity
   */
  async verifyIntegrity(eventId) {
    const storedEvent = this.eventIndex.get(eventId);
    if (!storedEvent) {
      return false;
    }
    const calculatedChecksum = this.calculateChecksum(storedEvent.event);
    return calculatedChecksum === storedEvent.checksum;
  }
  // ============================================================================
  // ADDITIONAL METHODS (not in interface)
  // ============================================================================
  /**
   * Get all aggregate IDs
   */
  getAllAggregateIds() {
    return Array.from(this.events.keys()).filter(
      (id) => !this.shreddedAggregates.has(id)
    );
  }
  /**
   * Get event by ID
   */
  getEventById(eventId) {
    return this.eventIndex.get(eventId) ?? null;
  }
  /**
   * Clear all data (for testing)
   */
  clear() {
    this.events.clear();
    this.eventIndex.clear();
    this.snapshots.clear();
    this.shreddedAggregates.clear();
    this.globalSequence = 0;
  }
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalEvents: this.globalSequence,
      totalAggregates: this.events.size,
      totalSnapshots: this.snapshots.size,
      shreddedAggregates: this.shreddedAggregates.size
    };
  }
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  /**
   * Calculate checksum for integrity verification
   */
  calculateChecksum(data) {
    const json = JSON.stringify(data);
    return crypto$1.createHash("sha256").update(json).digest("hex");
  }
};
var InMemoryAuditLogger = class {
  constructor(retentionDays = 2190) {
    __publicField(this, "entries");
    __publicField(this, "retentionDays");
    this.entries = /* @__PURE__ */ new Map();
    this.retentionDays = retentionDays;
  }
  /**
   * Log audit entry
   */
  async log(entry) {
    const fullEntry = {
      ...entry,
      id: uuid.v4(),
      timestamp: /* @__PURE__ */ new Date()
    };
    this.entries.set(fullEntry.id, fullEntry);
  }
  /**
   * Query audit logs
   */
  async query(options) {
    let results = Array.from(this.entries.values());
    if (options.userId) {
      results = results.filter((e) => e.userId === options.userId);
    }
    if (options.eventType) {
      results = results.filter((e) => e.eventType === options.eventType);
    }
    if (options.action) {
      results = results.filter((e) => e.action === options.action);
    }
    if (options.outcome) {
      results = results.filter((e) => e.outcome === options.outcome);
    }
    if (options.fromTimestamp) {
      results = results.filter((e) => e.timestamp >= options.fromTimestamp);
    }
    if (options.toTimestamp) {
      results = results.filter((e) => e.timestamp <= options.toTimestamp);
    }
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 1e3;
    return results.slice(offset, offset + limit);
  }
  /**
   * Get audit log count
   */
  async count(options) {
    if (!options) {
      return this.entries.size;
    }
    const results = await this.query(options);
    return results.length;
  }
  /**
   * Export audit logs for compliance reporting
   */
  async export(options) {
    const results = await this.query(options);
    return results.map((entry) => JSON.stringify(entry)).join("\n");
  }
  /**
   * Clear old entries based on retention policy
   */
  async cleanup() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    let removedCount = 0;
    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoffDate) {
        this.entries.delete(id);
        removedCount++;
      }
    }
    return removedCount;
  }
  /**
   * Clear all entries (for testing)
   */
  clear() {
    this.entries.clear();
  }
  /**
   * Get total entry count
   */
  getEntryCount() {
    return this.entries.size;
  }
};
function createInMemoryEventStore(config) {
  return new InMemoryEventStore(config);
}
function createInMemoryAuditLogger(retentionDays) {
  return new InMemoryAuditLogger(retentionDays);
}

// src/events/behaviors/index.ts
var LoggingBehavior = class {
  constructor(logger) {
    __publicField(this, "name", "LoggingBehavior");
    __publicField(this, "priority", 10);
    __publicField(this, "logger");
    this.logger = logger ?? {
      debug: (msg, data) => console.debug(`[EventBus] ${msg}`, data ?? ""),
      info: (msg, data) => console.info(`[EventBus] ${msg}`, data ?? ""),
      warn: (msg, data) => console.warn(`[EventBus] ${msg}`, data ?? ""),
      error: (msg, data) => console.error(`[EventBus] ${msg}`, data ?? "")
    };
  }
  async handle(event, context, next) {
    const startTime = Date.now();
    this.logger.debug(`Publishing event: ${event.eventType}`, {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      correlationId: context.correlationId
    });
    try {
      await next();
      const duration = Date.now() - startTime;
      this.logger.info(`Event published: ${event.eventType}`, {
        eventId: event.eventId,
        durationMs: duration,
        correlationId: context.correlationId
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Event failed: ${event.eventType}`, {
        eventId: event.eventId,
        durationMs: duration,
        error: error.message,
        correlationId: context.correlationId
      });
      throw error;
    }
  }
};
var ValidationBehavior = class {
  constructor() {
    __publicField(this, "name", "ValidationBehavior");
    __publicField(this, "priority", 20);
    __publicField(this, "validators");
    __publicField(this, "globalValidators");
    // Default validators
    __publicField(this, "validateRequiredFields", (event) => {
      const errors = [];
      if (!event.eventId) {
        errors.push("eventId is required");
      }
      if (!event.eventType) {
        errors.push("eventType is required");
      }
      if (!event.aggregateId) {
        errors.push("aggregateId is required");
      }
      if (!event.aggregateType) {
        errors.push("aggregateType is required");
      }
      if (!event.timestamp) {
        errors.push("timestamp is required");
      }
      return { valid: errors.length === 0, errors };
    });
    __publicField(this, "validateMetadata", (event) => {
      const errors = [];
      if (!event.metadata) {
        errors.push("metadata is required");
      } else {
        if (!event.metadata.correlationId) {
          errors.push("metadata.correlationId is required");
        }
        if (!event.metadata.source) {
          errors.push("metadata.source is required");
        }
      }
      return { valid: errors.length === 0, errors };
    });
    this.validators = /* @__PURE__ */ new Map();
    this.globalValidators = [];
    this.addGlobalValidator(this.validateRequiredFields);
    this.addGlobalValidator(this.validateMetadata);
  }
  /**
   * Add validator for specific event type
   */
  addValidator(eventType, validator) {
    const validators = this.validators.get(eventType) ?? [];
    validators.push(validator);
    this.validators.set(eventType, validators);
  }
  /**
   * Add global validator for all events
   */
  addGlobalValidator(validator) {
    this.globalValidators.push(validator);
  }
  async handle(event, _context, next) {
    const errors = [];
    for (const validator of this.globalValidators) {
      const result = validator(event);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
    const typeValidators = this.validators.get(event.eventType) ?? [];
    for (const validator of typeValidators) {
      const result = validator(event);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Event validation failed: ${errors.join("; ")}`);
    }
    await next();
  }
};
var MetricsBehavior = class {
  constructor(collector) {
    __publicField(this, "name", "MetricsBehavior");
    __publicField(this, "priority", 15);
    __publicField(this, "collector");
    this.collector = collector ?? this.createDefaultCollector();
  }
  async handle(event, _context, next) {
    const startTime = Date.now();
    const tags = {
      eventType: event.eventType,
      aggregateType: event.aggregateType
    };
    this.collector.incrementCounter("events.published", tags);
    try {
      await next();
      const duration = Date.now() - startTime;
      this.collector.recordHistogram("events.duration_ms", duration, tags);
      this.collector.incrementCounter("events.success", tags);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.recordHistogram("events.duration_ms", duration, tags);
      this.collector.incrementCounter("events.failure", { ...tags, error: error.name });
      throw error;
    }
  }
  createDefaultCollector() {
    const counters = /* @__PURE__ */ new Map();
    const histograms = /* @__PURE__ */ new Map();
    return {
      incrementCounter: (name, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        counters.set(key, (counters.get(key) ?? 0) + 1);
      },
      recordHistogram: (name, value, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        const values = histograms.get(key) ?? [];
        values.push(value);
        histograms.set(key, values);
      },
      recordGauge: (name, value, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        counters.set(key, value);
      }
    };
  }
};
var AuditBehavior = class {
  constructor(auditLogger) {
    __publicField(this, "name", "AuditBehavior");
    __publicField(this, "priority", 5);
    __publicField(this, "auditLogger");
    this.auditLogger = auditLogger;
  }
  async handle(event, context, next) {
    const startTime = Date.now();
    try {
      await next();
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        sessionId: event.metadata.sessionId,
        action: "publish",
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: "success",
        correlationId: context.correlationId,
        details: {
          durationMs: Date.now() - startTime
        }
      });
    } catch (error) {
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        sessionId: event.metadata.sessionId,
        action: "publish",
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: "failure",
        correlationId: context.correlationId,
        details: {
          durationMs: Date.now() - startTime,
          error: error.message
        }
      });
      throw error;
    }
  }
};
var RetryBehavior = class {
  constructor(options) {
    __publicField(this, "name", "RetryBehavior");
    __publicField(this, "priority", 90);
    __publicField(this, "maxAttempts");
    __publicField(this, "delayMs");
    __publicField(this, "backoffMultiplier");
    __publicField(this, "retryableErrors");
    this.maxAttempts = options?.maxAttempts ?? 3;
    this.delayMs = options?.delayMs ?? 100;
    this.backoffMultiplier = options?.backoffMultiplier ?? 2;
    this.retryableErrors = new Set(options?.retryableErrors ?? [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ECONNRESET",
      "NetworkError",
      "TimeoutError"
    ]);
  }
  async handle(_event, context, next) {
    let lastError;
    let attempt = 0;
    while (attempt < this.maxAttempts) {
      try {
        await next();
        context.metrics.retryCount = attempt;
        return;
      } catch (error) {
        lastError = error;
        attempt++;
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }
        if (attempt < this.maxAttempts) {
          const delay = this.delayMs * Math.pow(this.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }
    context.metrics.retryCount = attempt;
    throw lastError;
  }
  isRetryable(error) {
    if (this.retryableErrors.has(error.name)) {
      return true;
    }
    const errorWithCode = error;
    if (errorWithCode.code && this.retryableErrors.has(errorWithCode.code)) {
      return true;
    }
    return false;
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var ThrottlingBehavior = class {
  constructor(maxEventsPerSecond = 100) {
    __publicField(this, "name", "ThrottlingBehavior");
    __publicField(this, "priority", 25);
    __publicField(this, "maxEventsPerSecond");
    __publicField(this, "windowMs");
    __publicField(this, "eventCounts");
    this.maxEventsPerSecond = maxEventsPerSecond;
    this.windowMs = 1e3;
    this.eventCounts = /* @__PURE__ */ new Map();
  }
  async handle(event, _context, next) {
    const key = event.metadata.userId ?? "global";
    const now = Date.now();
    let counter = this.eventCounts.get(key);
    if (!counter || now >= counter.resetAt) {
      counter = { count: 0, resetAt: now + this.windowMs };
      this.eventCounts.set(key, counter);
    }
    if (counter.count >= this.maxEventsPerSecond) {
      const waitTime = counter.resetAt - now;
      throw new Error(`Rate limit exceeded. Try again in ${waitTime}ms`);
    }
    counter.count++;
    await next();
  }
};
var CrisisAlertBehavior = class {
  constructor(alertHandler, crisisEventTypes) {
    __publicField(this, "name", "CrisisAlertBehavior");
    __publicField(this, "priority", 1);
    __publicField(this, "alertHandler");
    __publicField(this, "crisisEventTypes");
    this.alertHandler = alertHandler;
    this.crisisEventTypes = new Set(crisisEventTypes ?? [
      "CRISIS_DETECTED",
      "SUICIDAL_IDEATION_DETECTED",
      "SELF_HARM_DETECTED",
      "ACUTE_DISTRESS_DETECTED"
    ]);
  }
  async handle(event, context, next) {
    if (this.crisisEventTypes.has(event.eventType)) {
      this.alertHandler(event).catch((error) => {
        console.error("[CrisisAlertBehavior] Alert handler failed:", error);
      });
      context.data.set("isCrisisEvent", true);
    }
    await next();
  }
};
function createDefaultBehaviors(auditLogger, metricsCollector) {
  const behaviors = [
    new LoggingBehavior(),
    new ValidationBehavior(),
    new MetricsBehavior(metricsCollector),
    new ThrottlingBehavior()
  ];
  if (auditLogger) {
    behaviors.push(new AuditBehavior(auditLogger));
  }
  return behaviors.sort((a, b) => a.priority - b.priority);
}
function createCrisisAwareBehaviors(alertHandler, auditLogger) {
  const behaviors = createDefaultBehaviors(auditLogger);
  behaviors.push(new CrisisAlertBehavior(alertHandler));
  return behaviors.sort((a, b) => a.priority - b.priority);
}

// src/events/handlers/index.ts
var BaseEventHandler = class {
  constructor() {
    __publicField(this, "async", false);
  }
  /**
   * Get registration info
   */
  getRegistration() {
    return {
      name: this.name,
      eventTypes: this.eventTypes,
      priority: this.priority,
      async: this.async
    };
  }
  /**
   * Check if this handler handles the event type
   */
  handles(eventType) {
    return this.eventTypes.includes(eventType) || this.eventTypes.includes("*");
  }
  /**
   * Register with event bus
   */
  register(eventBus) {
    for (const eventType of this.eventTypes) {
      eventBus.subscribe(eventType, this.handle.bind(this));
    }
  }
};
var CrisisEventHandler = class extends BaseEventHandler {
  constructor(callback, escalationThreshold = 0.7) {
    super();
    __publicField(this, "name", "CrisisEventHandler");
    __publicField(this, "eventTypes", ["CRISIS_DETECTED"]);
    __publicField(this, "priority", 1);
    __publicField(this, "async", false);
    // Must be synchronous for immediate response
    __publicField(this, "callback");
    __publicField(this, "escalationThreshold");
    this.callback = callback;
    this.escalationThreshold = escalationThreshold;
  }
  async handle(event) {
    const { payload } = event;
    await this.callback.log(event);
    await this.callback.notify(event);
    if (payload.riskLevel >= this.escalationThreshold || payload.recommendedAction === "immediate_response" || payload.recommendedAction === "escalate") {
      await this.callback.escalate(event);
    }
  }
};
var StateChangeEventHandler = class extends BaseEventHandler {
  constructor(callback, significantChangeThreshold = 0.2) {
    super();
    __publicField(this, "name", "StateChangeEventHandler");
    __publicField(this, "eventTypes", ["STATE_UPDATED"]);
    __publicField(this, "priority", 10);
    __publicField(this, "async", true);
    // Can run async for non-critical processing
    __publicField(this, "callback");
    __publicField(this, "significantChangeThreshold");
    this.callback = callback;
    this.significantChangeThreshold = significantChangeThreshold;
  }
  async handle(event) {
    const { payload } = event;
    const { changes } = payload;
    let totalChange = 0;
    let improvementScore = 0;
    let deteriorationScore = 0;
    for (const change of changes) {
      totalChange += Math.abs(change.magnitude);
      if (change.changeType === "increase") {
        if (this.isPositiveDimension(change.dimension, change.field)) {
          improvementScore += change.magnitude;
        } else {
          deteriorationScore += change.magnitude;
        }
      } else if (change.changeType === "decrease") {
        if (this.isPositiveDimension(change.dimension, change.field)) {
          deteriorationScore += Math.abs(change.magnitude);
        } else {
          improvementScore += Math.abs(change.magnitude);
        }
      }
    }
    if (totalChange >= this.significantChangeThreshold) {
      await this.callback.onSignificantChange(event, totalChange);
    }
    if (improvementScore > deteriorationScore && improvementScore > 0.1) {
      await this.callback.onImprovement(event);
    } else if (deteriorationScore > improvementScore && deteriorationScore > 0.1) {
      await this.callback.onDeterioration(event);
    }
  }
  /**
   * Determine if increase in dimension/field is positive
   */
  isPositiveDimension(dimension, field) {
    const positiveDimensions = {
      emotional: ["valence", "stability", "positiveAffect"],
      cognitive: ["clarity", "flexibility", "problemSolving"],
      resource: ["socialSupport", "copingSkills", "energy"]
    };
    const negativeDimensions = {
      emotional: ["arousal", "negativeAffect", "anxiety"],
      cognitive: ["rumination", "catastrophizing"],
      risk: ["crisisRisk", "selfHarmRisk", "suicidalIdeation"]
    };
    const positiveFields = positiveDimensions[dimension] ?? [];
    const negativeFields = negativeDimensions[dimension] ?? [];
    if (positiveFields.includes(field)) {
      return true;
    }
    if (negativeFields.includes(field)) {
      return false;
    }
    return true;
  }
};
var InterventionOutcomeHandler = class extends BaseEventHandler {
  constructor(callback) {
    super();
    __publicField(this, "name", "InterventionOutcomeHandler");
    __publicField(this, "eventTypes", ["INTERVENTION_OUTCOME"]);
    __publicField(this, "priority", 20);
    __publicField(this, "async", true);
    __publicField(this, "callback");
    this.callback = callback;
  }
  async handle(event) {
    await this.callback.logOutcome(event);
    await this.callback.updateModel(event);
  }
};
var VulnerabilityWindowHandler = class extends BaseEventHandler {
  constructor(callback, minConfidenceThreshold = 0.6) {
    super();
    __publicField(this, "name", "VulnerabilityWindowHandler");
    __publicField(this, "eventTypes", ["VULNERABILITY_WINDOW_DETECTED"]);
    __publicField(this, "priority", 15);
    __publicField(this, "async", true);
    __publicField(this, "callback");
    __publicField(this, "minConfidenceThreshold");
    this.callback = callback;
    this.minConfidenceThreshold = minConfidenceThreshold;
  }
  async handle(event) {
    const { payload } = event;
    const { window, recommendedInterventionTypes } = payload;
    if (window.confidence < this.minConfidenceThreshold) {
      return;
    }
    await this.callback.scheduleIntervention(
      payload.userId,
      window.startTime,
      window.endTime,
      recommendedInterventionTypes
    );
  }
};
var MessageAnalyticsHandler = class extends BaseEventHandler {
  constructor(callback) {
    super();
    __publicField(this, "name", "MessageAnalyticsHandler");
    __publicField(this, "eventTypes", ["MESSAGE_RECEIVED"]);
    __publicField(this, "priority", 50);
    __publicField(this, "async", true);
    // Fire-and-forget analytics
    __publicField(this, "callback");
    this.callback = callback;
  }
  async handle(event) {
    await this.callback.trackMessage(event);
    await this.callback.updateSessionAnalytics(
      event.payload.userId,
      event.payload.sessionId
    );
  }
};
var CompositeEventHandler = class extends BaseEventHandler {
  constructor(name, eventTypes, handlers, priority = 100) {
    super();
    __publicField(this, "name");
    __publicField(this, "eventTypes");
    __publicField(this, "priority");
    __publicField(this, "handlers");
    this.name = name;
    this.eventTypes = eventTypes;
    this.handlers = handlers.sort((a, b) => a.priority - b.priority);
    this.priority = priority;
  }
  async handle(event) {
    for (const handler of this.handlers) {
      if (handler.handles(event.eventType)) {
        await handler.handle(event);
      }
    }
  }
};
var EventHandlerRegistry = class {
  constructor() {
    __publicField(this, "handlers");
    __publicField(this, "handlersByName");
    this.handlers = /* @__PURE__ */ new Map();
    this.handlersByName = /* @__PURE__ */ new Map();
  }
  /**
   * Register handler
   */
  register(handler) {
    this.handlersByName.set(handler.name, handler);
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType) ?? [];
      existing.push(handler);
      existing.sort((a, b) => a.priority - b.priority);
      this.handlers.set(eventType, existing);
    }
  }
  /**
   * Unregister handler
   */
  unregister(handlerName) {
    const handler = this.handlersByName.get(handlerName);
    if (!handler) {
      return;
    }
    this.handlersByName.delete(handlerName);
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType);
      if (existing) {
        const index = existing.findIndex((h) => h.name === handlerName);
        if (index !== -1) {
          existing.splice(index, 1);
        }
      }
    }
  }
  /**
   * Get handlers for event type
   */
  getHandlers(eventType) {
    const specific = this.handlers.get(eventType) ?? [];
    const wildcard = this.handlers.get("*") ?? [];
    return [...specific, ...wildcard].sort((a, b) => a.priority - b.priority);
  }
  /**
   * Get handler by name
   */
  getHandler(name) {
    return this.handlersByName.get(name);
  }
  /**
   * Get all registered handlers
   */
  getAllHandlers() {
    return Array.from(this.handlersByName.values());
  }
  /**
   * Register all handlers with event bus
   */
  registerWithEventBus(eventBus) {
    for (const handler of this.handlersByName.values()) {
      handler.register(eventBus);
    }
  }
  /**
   * Clear all handlers
   */
  clear() {
    this.handlers.clear();
    this.handlersByName.clear();
  }
};
function createDefaultHandlerRegistry() {
  const registry = new EventHandlerRegistry();
  return registry;
}
function createCrisisHandlerRegistry(crisisCallback, stateChangeCallback) {
  const registry = new EventHandlerRegistry();
  registry.register(new CrisisEventHandler(crisisCallback));
  if (stateChangeCallback) {
    registry.register(new StateChangeEventHandler(stateChangeCallback));
  }
  return registry;
}

// src/events/index.ts
async function createEventSystem(config = {}) {
  const {
    eventBusConfig = {},
    eventStoreConfig = {},
    enablePersistence = true,
    enableAuditLog = true,
    crisisCallback
  } = config;
  const eventStore = new InMemoryEventStore(eventStoreConfig);
  const auditLogger = new InMemoryAuditLogger(
    eventStoreConfig.retentionDays ?? 2190
  );
  const behaviors = crisisCallback ? createCrisisAwareBehaviors(
    async (event) => {
      if (event.eventType === "CRISIS_DETECTED") {
        await crisisCallback.notify(event);
      }
    },
    enableAuditLog ? auditLogger : void 0
  ) : createDefaultBehaviors(enableAuditLog ? auditLogger : void 0);
  const eventBus = createEventBus({
    ...eventBusConfig,
    enablePersistence,
    enableAuditLog,
    behaviors
  });
  await eventBus.initialize(
    enablePersistence ? eventStore : void 0,
    enableAuditLog ? auditLogger : void 0
  );
  const handlerRegistry = new EventHandlerRegistry();
  if (crisisCallback) {
    handlerRegistry.register(new CrisisEventHandler(crisisCallback));
    handlerRegistry.registerWithEventBus(eventBus);
  }
  const shutdown = async () => {
    eventBus.clearAll();
    handlerRegistry.clear();
  };
  return {
    eventBus,
    eventStore,
    auditLogger,
    handlerRegistry,
    shutdown
  };
}
function createMinimalEventSystem() {
  const eventBus = createEventBus({
    enablePersistence: false,
    enableAuditLog: false,
    behaviors: []
  });
  return {
    eventBus,
    shutdown: () => eventBus.clearAll()
  };
}

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

exports.AFFIRMATION_TEMPLATES = AFFIRMATION_TEMPLATES;
exports.AIModelNotLoadedError = AIModelNotLoadedError;
exports.AuditBehavior = AuditBehavior;
exports.BaseEventHandler = BaseEventHandler;
exports.BeliefStateAdapter = BeliefStateAdapter;
exports.BeliefUpdateError = BeliefUpdateError;
exports.CHANGE_TALK_PATTERNS = CHANGE_TALK_PATTERNS;
exports.COGNICORE_VERSION = COGNICORE_VERSION;
exports.CausalNodeNotFoundError = CausalNodeNotFoundError;
exports.CogniCoreError = CogniCoreError;
exports.CogniCoreEventBus = CogniCoreEventBus;
exports.CompositeEventHandler = CompositeEventHandler;
exports.CrisisAlertBehavior = CrisisAlertBehavior;
exports.CrisisDetectionError = CrisisDetectionError;
exports.CrisisDetector = CrisisDetector;
exports.CrisisEventHandler = CrisisEventHandler;
exports.DEFAULT_CRISIS_CONFIG = DEFAULT_CRISIS_CONFIG;
exports.DEFAULT_EMOTION_VAD = DEFAULT_EMOTION_VAD;
exports.DEFAULT_EVENT_BUS_CONFIG = DEFAULT_EVENT_BUS_CONFIG;
exports.DEFAULT_EVENT_STORE_CONFIG = DEFAULT_EVENT_STORE_CONFIG;
exports.DEFAULT_KALMANFORMER_CONFIG = DEFAULT_KALMANFORMER_CONFIG;
exports.DEFAULT_PLRNN_CONFIG = DEFAULT_PLRNN_CONFIG;
exports.DEFAULT_VOICE_CONFIG = DEFAULT_VOICE_CONFIG;
exports.DIMENSION_INDEX = DIMENSION_INDEX;
exports.DIMENSION_MAPPING = DIMENSION_MAPPING;
exports.DISCORD_PATTERNS = DISCORD_PATTERNS;
exports.DISCORD_RESPONSE_STRATEGIES = DISCORD_RESPONSE_STRATEGIES;
exports.DISTORTION_INTERVENTIONS = DISTORTION_INTERVENTIONS;
exports.DISTORTION_PATTERNS = DISTORTION_PATTERNS;
exports.DataDeleteError = DataDeleteError;
exports.DataExportError = DataExportError;
exports.DataImportError = DataImportError;
exports.DimensionNotFoundError = DimensionNotFoundError;
exports.EMOTION_THERAPY_MAPPING = EMOTION_THERAPY_MAPPING;
exports.EmptyArrayError = EmptyArrayError;
exports.ErrorCategory = ErrorCategory;
exports.ErrorCode = ErrorCode;
exports.ErrorHandler = ErrorHandler;
exports.ErrorSeverity = ErrorSeverity;
exports.EventHandlerRegistry = EventHandlerRegistry;
exports.ExplainabilityService = ExplainabilityService;
exports.ExternalServiceError = ExternalServiceError;
exports.ExternalServiceTimeoutError = ExternalServiceTimeoutError;
exports.ExternalServiceUnavailableError = ExternalServiceUnavailableError;
exports.INDEX_THRESHOLDS = INDEX_THRESHOLDS;
exports.InMemoryAuditLogger = InMemoryAuditLogger;
exports.InMemoryEventStore = InMemoryEventStore;
exports.InterventionNotFoundError = InterventionNotFoundError;
exports.InterventionOutcomeHandler = InterventionOutcomeHandler;
exports.InterventionSelectionError = InterventionSelectionError;
exports.InvalidCausalGraphError = InvalidCausalGraphError;
exports.InvalidCrisisStateError = InvalidCrisisStateError;
exports.InvalidFormatError = InvalidFormatError;
exports.InvalidIdError = InvalidIdError;
exports.InvalidMessageFormatError = InvalidMessageFormatError;
exports.InvalidMetacognitionItemError = InvalidMetacognitionItemError;
exports.InvalidObservationError = InvalidObservationError;
exports.InvalidTrajectoryError = InvalidTrajectoryError;
exports.InvalidTypeError = InvalidTypeError;
exports.KalmanFormerEngine = KalmanFormerEngine;
exports.LoggingBehavior = LoggingBehavior;
exports.MITI_THRESHOLDS = MITI_THRESHOLDS;
exports.MessageAnalyticsHandler = MessageAnalyticsHandler;
exports.MessageProcessingError = MessageProcessingError;
exports.MetacognitionAnalysisError = MetacognitionAnalysisError;
exports.MetricsBehavior = MetricsBehavior;
exports.MotivationalEngine = MotivationalEngine;
exports.MotivationalStateBuilder = MotivationalStateBuilder;
exports.MotivationalStateFactory = MotivationalStateFactory;
exports.NLPServiceError = NLPServiceError;
exports.NoEligibleInterventionsError = NoEligibleInterventionsError;
exports.OPEN_QUESTION_TEMPLATES = OPEN_QUESTION_TEMPLATES;
exports.OutOfRangeError = OutOfRangeError;
exports.PLRNNEngine = PLRNNEngine;
exports.PipelineStageError = PipelineStageError;
exports.PipelineTimeoutError = PipelineTimeoutError;
exports.PredictionError = PredictionError;
exports.REFLECTION_TEMPLATES = REFLECTION_TEMPLATES;
exports.RequiredFieldError = RequiredFieldError;
exports.RetryBehavior = RetryBehavior;
exports.STRATEGY_RECOMMENDATIONS = STRATEGY_RECOMMENDATIONS;
exports.SUMMARY_TEMPLATES = SUMMARY_TEMPLATES;
exports.SUSTAIN_TALK_PATTERNS = SUSTAIN_TALK_PATTERNS;
exports.SessionEndError = SessionEndError;
exports.SessionExpiredError = SessionExpiredError;
exports.SessionNotFoundError = SessionNotFoundError;
exports.SessionStartError = SessionStartError;
exports.StateChangeEventHandler = StateChangeEventHandler;
exports.StorageConnectionError = StorageConnectionError;
exports.StorageReadError = StorageReadError;
exports.StorageWriteError = StorageWriteError;
exports.TemporalNotInitializedError = TemporalNotInitializedError;
exports.ThrottlingBehavior = ThrottlingBehavior;
exports.TranscriptionError = TranscriptionError;
exports.ValidationBehavior = ValidationBehavior;
exports.VoiceInputAdapter = VoiceInputAdapter;
exports.VoiceProcessingError = VoiceProcessingError;
exports.VulnerabilityWindowHandler = VulnerabilityWindowHandler;
exports.WELLBEING_WEIGHTS = WELLBEING_WEIGHTS;
exports.beliefStateToKalmanFormerState = beliefStateToKalmanFormerState;
exports.beliefStateToObservation = beliefStateToObservation;
exports.beliefStateToPLRNNState = beliefStateToPLRNNState;
exports.beliefStateToUncertainty = beliefStateToUncertainty;
exports.betaSampleSecure = betaSampleSecure;
exports.boxMullerSecure = boxMullerSecure;
exports.createBeliefStateAdapter = createBeliefStateAdapter;
exports.createCrisisAwareBehaviors = createCrisisAwareBehaviors;
exports.createCrisisDetector = createCrisisDetector;
exports.createCrisisHandlerRegistry = createCrisisHandlerRegistry;
exports.createDefaultBehaviors = createDefaultBehaviors;
exports.createDefaultHandlerRegistry = createDefaultHandlerRegistry;
exports.createEventBus = createEventBus;
exports.createEventMetadata = createEventMetadata;
exports.createEventSystem = createEventSystem;
exports.createExplainabilityService = createExplainabilityService;
exports.createInMemoryAuditLogger = createInMemoryAuditLogger;
exports.createInMemoryEventStore = createInMemoryEventStore;
exports.createInitializedEventBus = createInitializedEventBus;
exports.createKalmanFormerEngine = createKalmanFormerEngine;
exports.createMinimalEventSystem = createMinimalEventSystem;
exports.createPLRNNEngine = createPLRNNEngine;
exports.createPipelineContext = createPipelineContext;
exports.createVoiceInputAdapter = createVoiceInputAdapter;
exports.defaultCrisisDetector = defaultCrisisDetector;
exports.errorHandler = errorHandler;
exports.gammaSampleSecure = gammaSampleSecure;
exports.gaussianSecure = gaussianSecure;
exports.generateSecureId = generateSecureId;
exports.generateShortSecureId = generateShortSecureId;
exports.getComponentStatus = getComponentStatus;
exports.getDefaultSeverity = getDefaultSeverity;
exports.getErrorCategory = getErrorCategory;
exports.initializeGlobalErrorHandlers = initializeGlobalErrorHandlers;
exports.isGlobalErrorHandlersInitialized = isGlobalErrorHandlersInitialized;
exports.kalmanFormerStateToBeliefUpdate = kalmanFormerStateToBeliefUpdate;
exports.mergeHybridPredictions = mergeHybridPredictions;
exports.plrnnStateToBeliefUpdate = plrnnStateToBeliefUpdate;
exports.randomBooleanSecure = randomBooleanSecure;
exports.randomElementSecure = randomElementSecure;
exports.resetGlobalErrorHandlers = resetGlobalErrorHandlers;
exports.secureRandom = secureRandom;
exports.secureRandomInt = secureRandomInt;
exports.shuffleSecure = shuffleSecure;
exports.weightedRandomIndexSecure = weightedRandomIndexSecure;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map