"use strict";
/**
 * 🔄 MESSAGE PROCESSING PIPELINE - INTERFACES
 * ============================================
 * Phase 5.2: Message Processing Pipeline Architecture
 *
 * Research Foundation (2025):
 * - JITAI (Just-in-Time Adaptive Interventions) patterns
 * - NLP Pipeline Architecture (Intent → Entity → Sentiment → Response)
 * - Layered Safety Systems for Mental Health Chatbots
 * - Age-Adaptive Response Generation (CHI 2025)
 * - CBT-based Chatbot Clinical Efficacy (JMIR 2025)
 *
 * Architecture Patterns:
 * - Pipeline Pattern with composable stages
 * - Strategy Pattern for response generation
 * - Observer Pattern for event emission
 * - Factory Pattern for intervention creation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PIPELINE_CONFIG = void 0;
/**
 * Default pipeline configuration
 */
exports.DEFAULT_PIPELINE_CONFIG = {
    enableNlpAnalysis: true,
    enableRiskDetection: true,
    enableInterventions: true,
    defaultLanguage: 'ru',
    therapeuticDelay: 500,
    maxResponseLength: 4000,
    enableAgeDetection: true,
    debug: false,
};
//# sourceMappingURL=IMessagePipeline.js.map