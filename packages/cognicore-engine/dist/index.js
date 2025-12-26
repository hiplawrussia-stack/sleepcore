"use strict";
/**
 * @cognicore/engine
 * =================
 * World's First Universal POMDP-based Cognitive State Engine
 * for Digital Therapeutics (DTx)
 *
 * @packageDocumentation
 * @module @cognicore/engine
 *
 * БФ "Другой путь" | CogniCore Engine v1.0 | 2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComponentStatus = exports.INDEX_THRESHOLDS = exports.WELLBEING_WEIGHTS = exports.DISTORTION_INTERVENTIONS = exports.DISTORTION_PATTERNS = exports.EMOTION_THERAPY_MAPPING = exports.DEFAULT_EMOTION_VAD = exports.COGNICORE_VERSION = void 0;
// =============================================================================
// VERSION INFO
// =============================================================================
exports.COGNICORE_VERSION = {
    version: '1.0.0-alpha.1',
    name: '@cognicore/engine',
    description: 'POMDP-based Cognitive State Engine for Digital Therapeutics',
    buildDate: '2025-12-20',
};
var IEmotionalState_1 = require("./state/interfaces/IEmotionalState");
Object.defineProperty(exports, "DEFAULT_EMOTION_VAD", { enumerable: true, get: function () { return IEmotionalState_1.DEFAULT_EMOTION_VAD; } });
Object.defineProperty(exports, "EMOTION_THERAPY_MAPPING", { enumerable: true, get: function () { return IEmotionalState_1.EMOTION_THERAPY_MAPPING; } });
var ICognitiveState_1 = require("./state/interfaces/ICognitiveState");
Object.defineProperty(exports, "DISTORTION_PATTERNS", { enumerable: true, get: function () { return ICognitiveState_1.DISTORTION_PATTERNS; } });
Object.defineProperty(exports, "DISTORTION_INTERVENTIONS", { enumerable: true, get: function () { return ICognitiveState_1.DISTORTION_INTERVENTIONS; } });
var IStateVector_1 = require("./state/interfaces/IStateVector");
Object.defineProperty(exports, "WELLBEING_WEIGHTS", { enumerable: true, get: function () { return IStateVector_1.WELLBEING_WEIGHTS; } });
Object.defineProperty(exports, "INDEX_THRESHOLDS", { enumerable: true, get: function () { return IStateVector_1.INDEX_THRESHOLDS; } });
Object.defineProperty(exports, "getComponentStatus", { enumerable: true, get: function () { return IStateVector_1.getComponentStatus; } });
//# sourceMappingURL=index.js.map