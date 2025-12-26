"use strict";
/**
 * 🪞 MIRROR MODULE
 * =================
 * Deep Cognitive Mirror - Pattern Analysis & Insight Generation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeepCognitiveMirror = exports.DeepCognitiveMirror = void 0;
// Interfaces
__exportStar(require("./IDeepCognitiveMirror"), exports);
// Implementation
var DeepCognitiveMirror_1 = require("./DeepCognitiveMirror");
Object.defineProperty(exports, "DeepCognitiveMirror", { enumerable: true, get: function () { return DeepCognitiveMirror_1.DeepCognitiveMirror; } });
Object.defineProperty(exports, "createDeepCognitiveMirror", { enumerable: true, get: function () { return DeepCognitiveMirror_1.createDeepCognitiveMirror; } });
//# sourceMappingURL=index.js.map