/**
 * @fileoverview GraphRAG Module Index
 * @module research/graphrag
 * @description Graph-based Retrieval Augmented Generation
 *
 * Implements Microsoft GraphRAG pattern for improved
 * search and reasoning over research knowledge.
 *
 * @see https://microsoft.github.io/graphrag/
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

// Types
export * from './types';

// Core components
export { KnowledgeGraph } from './KnowledgeGraph';
export { GraphBuilder } from './GraphBuilder';
export { CommunityDetector } from './CommunityDetector';
export { GraphRAGEngine } from './GraphRAGEngine';
