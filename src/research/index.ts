/**
 * @fileoverview SleepCore Research Module
 * @module research
 *
 * @description
 * AI-powered research agent for monitoring insomnia research,
 * detecting breakthroughs, analyzing trends, and tracking competitors.
 *
 * ## Features
 * - Scientific publication monitoring (PubMed, arXiv, Semantic Scholar, OpenAlex)
 * - Clinical trials tracking (ClinicalTrials.gov)
 * - Competitor intelligence (Big Health, Pear, etc.)
 * - Breakthrough detection
 * - Trend analysis
 * - Citation network analysis (NEW 2025)
 * - Agentic search with query refinement (NEW 2025)
 * - Parallel search with caching (NEW 2025)
 * - GraphRAG knowledge graph queries (NEW 2025-2026)
 * - Automated report generation
 *
 * ## Usage
 * ```typescript
 * import { InsomniaResearchAgent } from './research';
 *
 * const agent = new InsomniaResearchAgent({
 *   enabledSources: [
 *     ResearchSource.PUBMED,
 *     ResearchSource.SEMANTIC_SCHOLAR,
 *     ResearchSource.OPENALEX,
 *   ],
 *   minRelevanceScore: 50,
 * });
 *
 * // Run full research cycle
 * const results = await agent.run();
 *
 * // NEW 2025: Agentic search with auto-refinement
 * const agenticResult = await agent.searchAgentic(query);
 *
 * // NEW 2025: Parallel search with caching
 * const parallelResult = await agent.searchParallel(query);
 *
 * // NEW 2025: Citation analysis
 * const citations = await agent.analyzeCitations(90);
 *
 * // Generate weekly report
 * const report = await agent.generateWeeklyReport();
 *
 * // Get breakthroughs
 * const breakthroughs = await agent.getTopBreakthroughs(10);
 *
 * // Monitor competitors
 * const updates = await agent.monitorCompetitors();
 *
 * // NEW 2025-2026: GraphRAG knowledge graph queries
 * await agent.initializeGraph(90); // Initialize with 90 days of data
 * const localResult = await agent.graphLocalSearch('CBT-I', 2);
 * const globalResult = await agent.graphGlobalSearch('What are the main insomnia treatments?');
 * const path = await agent.graphFindPath('CBT-I', 'depression');
 * const communities = agent.getGraphCommunities();
 * const hubs = agent.getGraphHubs(10);
 * ```
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

// Types
export * from './types';

// Sources
export {
  IResearchSource,
  BaseResearchSource,
  PubMedSource,
  ClinicalTrialsSource,
  ArxivSource,
  CompetitorSource,
  SemanticScholarSource,
  OpenAlexSource,
} from './sources';

// Analyzers
export {
  BreakthroughDetector,
  TrendAnalyzer,
  QueryExpander,
  CitationAnalyzer,
  queryExpander,
  citationAnalyzer,
} from './analyzers';
export type {
  IExpandedQuery,
  ICitationMetrics,
  IResearchFront,
  ICitationAnalysis,
} from './analyzers';

// Strategies (NEW 2025)
export { AgenticSearchStrategy } from './strategies';
export type { IAgenticSearchResult } from './strategies';

// Cache (NEW 2025)
export { ResultCache, resultCache } from './cache';
export type { ICacheStats } from './cache';

// Executors (NEW 2025)
export { ParallelSearchExecutor } from './executors';
export type { IParallelSearchResult } from './executors';

// Storage
export {
  ResearchRepository,
} from './storage';

// Reports
export {
  ReportGenerator,
} from './reports';

// Agents
export {
  InsomniaResearchAgent,
} from './agents';

// MCP Server (NEW 2025)
export {
  ResearchMCPServer,
  MCPStdioTransport,
  MCPHTTPTransport,
  runStdioServer,
  runHTTPServer,
} from './mcp';
export type { MCPRequest, MCPResponse, MCPToolDefinition, MCPResourceDefinition } from './mcp';

// GraphRAG (NEW 2025-2026)
export {
  KnowledgeGraph,
  GraphBuilder,
  CommunityDetector,
  GraphRAGEngine,
  NodeType,
  EdgeType,
  QueryType,
} from './graphrag';
export type {
  IKnowledgeGraph,
  IGraphNode,
  IGraphEdge,
  IGraphStats,
  ICommunityNode,
  IGraphQuery,
  IGraphQueryResult,
} from './graphrag';
