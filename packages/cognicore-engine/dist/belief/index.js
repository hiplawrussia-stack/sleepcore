"use strict";
/**
 * 🧠 BELIEF MODULE
 * =================
 * Bayesian Belief Update Engine - POMDP State Management
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
// Interfaces
__exportStar(require("./IBeliefUpdate"), exports);
// Implementation
// DEPRECATED: BeliefUpdateEngine needs refactoring for new ICognitiveState interface (Phase 6)
// BeliefUpdateEngine.ts has 7 TypeScript errors due to interface mismatch
// Tests for BeliefUpdateEngine are skipped pending interface reconciliation
// export { BeliefUpdateEngine, createBeliefUpdateEngine } from './BeliefUpdateEngine';
//# sourceMappingURL=index.js.map