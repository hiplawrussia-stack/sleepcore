/**
 * @fileoverview MCP Server for Research Agent
 * @module research/mcp/server
 * @description Model Context Protocol server для интеграции с Claude
 *
 * MCP (Model Context Protocol) — открытый стандарт Anthropic для
 * подключения AI к внешним инструментам и источникам данных.
 *
 * Этот сервер предоставляет:
 * - Поиск научных публикаций
 * - Анализ цитирований
 * - Детекция прорывов
 * - Мониторинг конкурентов
 *
 * @see https://modelcontextprotocol.io/
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { InsomniaResearchAgent } from '../agents/InsomniaResearchAgent';
import {
  ResearchSource,
  ResearchCategory,
  IResearchQuery,
  DEFAULT_RESEARCH_CONFIG,
} from '../types';

// ============================================================================
// MCP Protocol Types (based on MCP spec)
// ============================================================================

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// ============================================================================
// MCP Server Implementation
// ============================================================================

/**
 * MCP Server for SleepCore Research Agent
 *
 * Exposes research capabilities via Model Context Protocol:
 * - Tools: search, analyze, detect breakthroughs
 * - Resources: cached results, reports
 * - Prompts: research templates
 */
export class ResearchMCPServer {
  private agent: InsomniaResearchAgent;
  private serverInfo = {
    name: 'sleepcore-research',
    version: '1.0.0',
    description: 'SleepCore Insomnia Research Agent MCP Server',
  };

  constructor(agent?: InsomniaResearchAgent) {
    this.agent = agent || new InsomniaResearchAgent(DEFAULT_RESEARCH_CONFIG);
  }

  /**
   * Handle incoming MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);

        case 'tools/list':
          return this.handleToolsList(request);

        case 'tools/call':
          return this.handleToolsCall(request);

        case 'resources/list':
          return this.handleResourcesList(request);

        case 'resources/read':
          return this.handleResourcesRead(request);

        case 'prompts/list':
          return this.handlePromptsList(request);

        case 'prompts/get':
          return this.handlePromptsGet(request);

        default:
          return this.errorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResponse(request.id, -32603, `Internal error: ${message}`);
    }
  }

  // ============================================================================
  // Protocol Handlers
  // ============================================================================

  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: this.serverInfo,
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    };
  }

  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: this.getToolDefinitions(),
      },
    };
  }

  private async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as { name: string; arguments?: Record<string, unknown> };
    const toolName = params?.name;
    const args = params?.arguments || {};

    const result = await this.executeTool(toolName, args);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      },
    };
  }

  private handleResourcesList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        resources: this.getResourceDefinitions(),
      },
    };
  }

  private async handleResourcesRead(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as { uri: string };
    const uri = params?.uri;

    const content = await this.readResource(uri);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2),
          },
        ],
      },
    };
  }

  private handlePromptsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        prompts: this.getPromptDefinitions(),
      },
    };
  }

  private async handlePromptsGet(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as { name: string; arguments?: Record<string, string> };
    const promptName = params?.name;
    const args = params?.arguments || {};

    const prompt = this.getPrompt(promptName, args);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      },
    };
  }

  // ============================================================================
  // Tool Definitions
  // ============================================================================

  private getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'search_research',
        description: 'Search for scientific publications about insomnia and sleep disorders. Returns relevant papers from PubMed, Semantic Scholar, OpenAlex, and arXiv.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (e.g., "CBT-I digital therapeutic efficacy")',
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'Sources to search: pubmed, semantic_scholar, openalex, arxiv, clinical_trials',
            },
            days_back: {
              type: 'number',
              description: 'How many days back to search (default: 30)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results per source (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_agentic',
        description: 'Advanced agentic search with automatic query refinement. Uses multi-step reasoning to iteratively improve results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Initial search query',
            },
            max_iterations: {
              type: 'number',
              description: 'Maximum search iterations (default: 3)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze_citations',
        description: 'Analyze citation patterns to find highly cited and emerging papers in insomnia research.',
        inputSchema: {
          type: 'object',
          properties: {
            days_back: {
              type: 'number',
              description: 'Analysis period in days (default: 90)',
            },
          },
        },
      },
      {
        name: 'detect_breakthroughs',
        description: 'Detect breakthrough research in insomnia treatment and digital therapeutics.',
        inputSchema: {
          type: 'object',
          properties: {
            min_impact_score: {
              type: 'number',
              description: 'Minimum impact score (1-10, default: 6)',
            },
            limit: {
              type: 'number',
              description: 'Maximum breakthroughs to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'analyze_trends',
        description: 'Analyze research trends in sleep medicine and digital therapeutics.',
        inputSchema: {
          type: 'object',
          properties: {
            days_back: {
              type: 'number',
              description: 'Analysis period (default: 30)',
            },
          },
        },
      },
      {
        name: 'monitor_competitors',
        description: 'Monitor competitor activity (Big Health, Pear Therapeutics, etc.) in digital sleep therapeutics.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_clinical_trials',
        description: 'Search for clinical trials related to insomnia treatment.',
        inputSchema: {
          type: 'object',
          properties: {
            condition: {
              type: 'string',
              description: 'Condition to search (default: insomnia)',
            },
            intervention: {
              type: 'string',
              description: 'Intervention type (e.g., "CBT-I", "digital therapeutic")',
            },
          },
        },
      },
      {
        name: 'find_similar_papers',
        description: 'Find papers similar to a given paper using Semantic Scholar.',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Semantic Scholar paper ID or DOI',
            },
            limit: {
              type: 'number',
              description: 'Maximum similar papers (default: 10)',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'get_citation_network',
        description: 'Get citation network (citations and references) for a paper.',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Paper ID to analyze',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'generate_report',
        description: 'Generate a weekly research report with breakthroughs, trends, and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['json', 'markdown'],
              description: 'Output format (default: markdown)',
            },
          },
        },
      },
      {
        name: 'get_agent_status',
        description: 'Get current status of the research agent including enabled sources and cache statistics.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // GraphRAG Tools (NEW 2025-2026)
      {
        name: 'graph_initialize',
        description: 'Initialize the GraphRAG knowledge graph from stored research results. Run this before using other graph queries.',
        inputSchema: {
          type: 'object',
          properties: {
            days_back: {
              type: 'number',
              description: 'How many days of data to include (default: 90)',
            },
          },
        },
      },
      {
        name: 'graph_local_search',
        description: 'Local search - find specific entities (papers, concepts, therapies) and their direct relationships in the knowledge graph.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Entity or topic to search for (e.g., "CBT-I", "melatonin", "sleep restriction")',
            },
            max_hops: {
              type: 'number',
              description: 'Maximum relationship hops to traverse (default: 2)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'graph_global_search',
        description: 'Global search - get high-level themes and summaries across research communities. Best for broad questions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'High-level question (e.g., "What are the main approaches to treating insomnia?")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'graph_find_path',
        description: 'Find connections between two entities in the knowledge graph.',
        inputSchema: {
          type: 'object',
          properties: {
            entity1: {
              type: 'string',
              description: 'First entity (e.g., "CBT-I")',
            },
            entity2: {
              type: 'string',
              description: 'Second entity (e.g., "depression")',
            },
          },
          required: ['entity1', 'entity2'],
        },
      },
      {
        name: 'graph_explore',
        description: 'Explore the neighborhood of an entity in the knowledge graph.',
        inputSchema: {
          type: 'object',
          properties: {
            entity: {
              type: 'string',
              description: 'Entity to explore (e.g., "insomnia")',
            },
            radius: {
              type: 'number',
              description: 'Exploration radius in hops (default: 2)',
            },
          },
          required: ['entity'],
        },
      },
      {
        name: 'graph_communities',
        description: 'Get research communities detected in the knowledge graph. Communities represent clusters of related concepts.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum communities to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'graph_hubs',
        description: 'Get hub nodes (most connected entities) in the knowledge graph. Hubs are key concepts that connect many papers.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum hubs to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'graph_stats',
        description: 'Get statistics about the knowledge graph including node/edge counts and node types.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  // ============================================================================
  // Tool Execution
  // ============================================================================

  private async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_research':
        return this.toolSearchResearch(args);

      case 'search_agentic':
        return this.toolSearchAgentic(args);

      case 'analyze_citations':
        return this.toolAnalyzeCitations(args);

      case 'detect_breakthroughs':
        return this.toolDetectBreakthroughs(args);

      case 'analyze_trends':
        return this.toolAnalyzeTrends(args);

      case 'monitor_competitors':
        return this.toolMonitorCompetitors();

      case 'search_clinical_trials':
        return this.toolSearchClinicalTrials(args);

      case 'find_similar_papers':
        return this.toolFindSimilarPapers(args);

      case 'get_citation_network':
        return this.toolGetCitationNetwork(args);

      case 'generate_report':
        return this.toolGenerateReport(args);

      case 'get_agent_status':
        return this.toolGetAgentStatus();

      // GraphRAG Tools
      case 'graph_initialize':
        return this.toolGraphInitialize(args);

      case 'graph_local_search':
        return this.toolGraphLocalSearch(args);

      case 'graph_global_search':
        return this.toolGraphGlobalSearch(args);

      case 'graph_find_path':
        return this.toolGraphFindPath(args);

      case 'graph_explore':
        return this.toolGraphExplore(args);

      case 'graph_communities':
        return this.toolGraphCommunities(args);

      case 'graph_hubs':
        return this.toolGraphHubs(args);

      case 'graph_stats':
        return this.toolGraphStats();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async toolSearchResearch(args: Record<string, unknown>) {
    const query = String(args.query || 'insomnia treatment');
    const daysBack = Number(args.days_back) || 30;
    const maxResults = Number(args.max_results) || 20;

    const sourcesArg = args.sources as string[] | undefined;
    const sources = sourcesArg?.map(s => s as ResearchSource) || [
      ResearchSource.PUBMED,
      ResearchSource.SEMANTIC_SCHOLAR,
      ResearchSource.OPENALEX,
    ];

    const now = new Date();
    const fromDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const researchQuery: IResearchQuery = {
      topic: query,
      sources,
      dateRange: { from: fromDate, to: now },
      keywords: query.split(' ').filter(w => w.length > 2),
      maxResultsPerSource: maxResults,
    };

    const results = await this.agent.search(researchQuery);

    return {
      total: results.length,
      query: query,
      sources: sources,
      results: results.slice(0, 20).map(r => ({
        title: r.title,
        summary: r.summary.slice(0, 300),
        source: r.source,
        url: r.url,
        relevanceScore: r.relevanceScore,
        publishedAt: r.publishedAt.toISOString(),
        categories: r.categories,
      })),
    };
  }

  private async toolSearchAgentic(args: Record<string, unknown>) {
    const query = String(args.query || 'insomnia digital therapeutic');

    const now = new Date();
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const researchQuery: IResearchQuery = {
      topic: query,
      sources: [
        ResearchSource.PUBMED,
        ResearchSource.SEMANTIC_SCHOLAR,
        ResearchSource.OPENALEX,
      ],
      dateRange: { from: fromDate, to: now },
      keywords: query.split(' ').filter(w => w.length > 2),
      maxResultsPerSource: 30,
    };

    const result = await this.agent.searchAgentic(researchQuery);

    return {
      iterations: result.iterations.length,
      totalResults: result.totalUnique,
      searchPath: result.searchPath,
      completenessConfidence: result.completenessConfidence,
      keyFindings: result.keyFindings,
      suggestedFurtherResearch: result.suggestedFurtherResearch,
      topResults: result.results.slice(0, 10).map(r => ({
        title: r.title,
        source: r.source,
        relevanceScore: r.relevanceScore,
        url: r.url,
      })),
    };
  }

  private async toolAnalyzeCitations(args: Record<string, unknown>) {
    const daysBack = Number(args.days_back) || 90;

    const analysis = await this.agent.analyzeCitations(daysBack);

    return {
      fieldStats: analysis.fieldStats,
      topCited: analysis.topCited.slice(0, 5).map(r => ({
        title: r.title,
        citations: (r.metadata as Record<string, unknown>)?.citationCount || 0,
        url: r.url,
      })),
      emerging: analysis.emerging.slice(0, 5).map(r => ({
        title: r.title,
        citations: (r.metadata as Record<string, unknown>)?.citationCount || 0,
        velocity: 'high',
        url: r.url,
      })),
      researchFronts: analysis.fronts.slice(0, 5).map(f => ({
        name: f.name,
        paperCount: f.paperCount,
        averageCitations: f.averageCitations,
        isEmerging: f.isEmerging,
      })),
    };
  }

  private async toolDetectBreakthroughs(args: Record<string, unknown>) {
    const minImpact = Number(args.min_impact_score) || 6;
    const limit = Number(args.limit) || 10;

    const breakthroughs = await this.agent.getTopBreakthroughs(limit * 2);

    const filtered = breakthroughs
      .filter(b => b.impactScore >= minImpact)
      .slice(0, limit);

    return {
      total: filtered.length,
      breakthroughs: filtered.map(b => ({
        title: b.title,
        category: b.category,
        impactScore: b.impactScore,
        whyBreakthrough: b.whyBreakthrough,
        timeToAdoption: b.timeToAdoption,
        sleepCoreApplicability: b.sleepCoreApplicability,
        actionItems: b.actionItems.slice(0, 3),
      })),
    };
  }

  private async toolAnalyzeTrends(args: Record<string, unknown>) {
    const daysBack = Number(args.days_back) || 30;

    const analysis = await this.agent.analyze(daysBack);

    return {
      totalTrends: analysis.trends.length,
      trends: analysis.trends.map(t => ({
        name: t.name,
        strength: t.strength,
        maturity: t.maturity,
        mentionCount: t.mentionCount,
        sleepCoreRelevance: t.sleepCoreRelevance,
        keyPlayers: t.keyPlayers.slice(0, 3),
      })),
      recommendations: analysis.recommendations.slice(0, 5),
    };
  }

  private async toolMonitorCompetitors() {
    const updates = await this.agent.monitorCompetitors();

    return {
      total: updates.length,
      updates: updates.map(u => ({
        company: u.company,
        product: u.product,
        type: u.updateType,
        description: u.description.slice(0, 200),
        date: u.date.toISOString(),
        impact: u.impactAssessment,
      })),
    };
  }

  private async toolSearchClinicalTrials(args: Record<string, unknown>) {
    const topic = args.condition || args.intervention
      ? `${args.condition || 'insomnia'} ${args.intervention || ''}`
      : undefined;

    const trials = await this.agent.searchClinicalTrials(topic as string | undefined);

    return {
      total: trials.length,
      trials: trials.slice(0, 10).map(t => ({
        nctId: t.nctId,
        title: t.title,
        status: t.status,
        phase: t.phase,
        intervention: t.intervention,
        sampleSize: t.sampleSize,
        sponsor: t.sponsor,
        url: t.url,
      })),
    };
  }

  private async toolFindSimilarPapers(args: Record<string, unknown>) {
    const paperId = String(args.paper_id);
    const limit = Number(args.limit) || 10;

    const similar = await this.agent.findSimilarPapers(paperId, limit);

    return {
      paperId,
      total: similar.length,
      similarPapers: similar.map(r => ({
        title: r.title,
        source: r.source,
        relevanceScore: r.relevanceScore,
        url: r.url,
        categories: r.categories,
      })),
    };
  }

  private async toolGetCitationNetwork(args: Record<string, unknown>) {
    const paperId = String(args.paper_id);

    const network = await this.agent.getCitationNetwork(paperId);

    return {
      paper: network.paper ? {
        title: network.paper.title,
        url: network.paper.url,
      } : null,
      citations: network.citations.slice(0, 10).map(r => ({
        title: r.title,
        url: r.url,
      })),
      references: network.references.slice(0, 10).map(r => ({
        title: r.title,
        url: r.url,
      })),
      totalCitations: network.citations.length,
      totalReferences: network.references.length,
    };
  }

  private async toolGenerateReport(args: Record<string, unknown>) {
    const format = String(args.format || 'markdown');

    const report = await this.agent.generateWeeklyReport();

    if (format === 'markdown') {
      return {
        format: 'markdown',
        content: report.executiveSummary,
        period: {
          from: report.period.from.toISOString(),
          to: report.period.to.toISOString(),
        },
        stats: report.statistics,
      };
    }

    return {
      format: 'json',
      report: {
        id: report.id,
        generatedAt: report.generatedAt.toISOString(),
        period: {
          from: report.period.from.toISOString(),
          to: report.period.to.toISOString(),
        },
        type: report.type,
        statistics: report.statistics,
        breakthroughsCount: report.breakthroughs.length,
        trendsCount: report.trends.length,
        recommendationsCount: report.recommendations.length,
      },
    };
  }

  private async toolGetAgentStatus() {
    const status = this.agent.getStatus();
    const cacheStats = this.agent.getCacheStats();
    const stats = await this.agent.getStats();

    return {
      isRunning: status.isRunning,
      lastRunAt: status.lastRunAt?.toISOString() || null,
      enabledSources: status.enabledSources,
      monitoredKeywords: status.monitoredKeywords,
      monitoredCompetitors: status.monitoredCompetitors,
      repository: {
        totalResults: stats.totalResults,
        bySource: stats.bySource,
      },
      cache: {
        entries: cacheStats.totalEntries,
        hitRate: `${Math.round(cacheStats.hitRate * 100)}%`,
        memoryMB: cacheStats.estimatedMemoryMB,
      },
    };
  }

  // ============================================================================
  // GraphRAG Tool Implementations
  // ============================================================================

  private async toolGraphInitialize(args: Record<string, unknown>) {
    const daysBack = Number(args.days_back) || 90;

    const stats = await this.agent.initializeGraph(daysBack);

    return {
      success: true,
      message: `Knowledge graph initialized with ${stats.nodeCount} nodes, ${stats.edgeCount} edges, ${stats.communityCount} communities`,
      stats,
    };
  }

  private async toolGraphLocalSearch(args: Record<string, unknown>) {
    const query = String(args.query);
    const maxHops = Number(args.max_hops) || 2;

    const result = await this.agent.graphLocalSearch(query, maxHops);

    return {
      query,
      nodes: result.nodes.slice(0, 20).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      edges: result.edges.slice(0, 30).map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
      context: result.context?.slice(0, 500),
      confidence: result.confidence,
    };
  }

  private async toolGraphGlobalSearch(args: Record<string, unknown>) {
    const query = String(args.query);

    const result = await this.agent.graphGlobalSearch(query);

    return {
      query,
      communities: (result.communities || []).slice(0, 10).map(c => ({
        label: c.label,
        summary: c.properties.summary,
        memberCount: c.properties.memberCount,
        keywords: c.properties.keywords.slice(0, 5),
      })),
      context: result.context?.slice(0, 1000),
      confidence: result.confidence,
    };
  }

  private async toolGraphFindPath(args: Record<string, unknown>) {
    const entity1 = String(args.entity1);
    const entity2 = String(args.entity2);

    const result = await this.agent.graphFindPath(entity1, entity2);

    return {
      from: entity1,
      to: entity2,
      pathFound: result.path !== undefined && result.path.length > 0,
      path: result.path || [],
      pathNodes: result.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      context: result.context?.slice(0, 500),
    };
  }

  private async toolGraphExplore(args: Record<string, unknown>) {
    const entity = String(args.entity);
    const radius = Number(args.radius) || 2;

    const result = await this.agent.graphExploreNeighborhood(entity, radius);

    return {
      entity,
      radius,
      nodes: result.nodes.slice(0, 30).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      edges: result.edges.slice(0, 50).map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
      context: result.context?.slice(0, 500),
    };
  }

  private async toolGraphCommunities(args: Record<string, unknown>) {
    const limit = Number(args.limit) || 10;

    const communities = this.agent.getGraphCommunities().slice(0, limit);

    return {
      total: communities.length,
      communities: communities.map(c => ({
        id: c.id,
        label: c.label,
        memberCount: c.memberCount,
        level: c.level,
        keywords: c.keywords.slice(0, 5),
      })),
    };
  }

  private async toolGraphHubs(args: Record<string, unknown>) {
    const limit = Number(args.limit) || 10;

    const hubs = this.agent.getGraphHubs(limit);

    return {
      total: hubs.length,
      hubs: hubs.map(h => ({
        id: h.id,
        label: h.label,
        type: h.type,
        connections: h.degree,
      })),
    };
  }

  private async toolGraphStats() {
    const stats = this.agent.getGraphStats();

    return {
      initialized: stats.initialized,
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      communityCount: stats.communityCount,
      nodesByType: stats.nodesByType,
    };
  }

  // ============================================================================
  // Resource Definitions
  // ============================================================================

  private getResourceDefinitions(): MCPResourceDefinition[] {
    return [
      {
        uri: 'research://stats',
        name: 'Research Statistics',
        description: 'Current statistics of the research repository',
        mimeType: 'application/json',
      },
      {
        uri: 'research://cache',
        name: 'Cache Statistics',
        description: 'Current cache performance statistics',
        mimeType: 'application/json',
      },
      {
        uri: 'research://sources',
        name: 'Available Sources',
        description: 'List of available research sources and their status',
        mimeType: 'application/json',
      },
      // GraphRAG Resources
      {
        uri: 'research://graph/stats',
        name: 'Knowledge Graph Statistics',
        description: 'Statistics about the GraphRAG knowledge graph',
        mimeType: 'application/json',
      },
      {
        uri: 'research://graph/communities',
        name: 'Research Communities',
        description: 'Detected communities in the knowledge graph',
        mimeType: 'application/json',
      },
      {
        uri: 'research://graph/hubs',
        name: 'Knowledge Hubs',
        description: 'Most connected entities in the knowledge graph',
        mimeType: 'application/json',
      },
    ];
  }

  private async readResource(uri: string): Promise<unknown> {
    switch (uri) {
      case 'research://stats':
        return this.agent.getStats();

      case 'research://cache':
        return this.agent.getCacheStats();

      case 'research://sources': {
        const health = await this.agent.checkSourceHealth();
        const result: Record<string, boolean> = {};
        for (const [source, available] of Array.from(health.entries())) {
          result[source] = available;
        }
        return result;
      }

      // GraphRAG Resources
      case 'research://graph/stats':
        return this.agent.getGraphStats();

      case 'research://graph/communities':
        return this.agent.getGraphCommunities();

      case 'research://graph/hubs':
        return this.agent.getGraphHubs(20);

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  // ============================================================================
  // Prompt Definitions
  // ============================================================================

  private getPromptDefinitions() {
    return [
      {
        name: 'research_summary',
        description: 'Generate a research summary prompt for a topic',
        arguments: [
          {
            name: 'topic',
            description: 'Research topic',
            required: true,
          },
        ],
      },
      {
        name: 'breakthrough_analysis',
        description: 'Generate a prompt for analyzing a research breakthrough',
        arguments: [
          {
            name: 'title',
            description: 'Breakthrough title or description',
            required: true,
          },
        ],
      },
      {
        name: 'competitor_report',
        description: 'Generate a prompt for competitor analysis',
        arguments: [
          {
            name: 'company',
            description: 'Company name',
            required: true,
          },
        ],
      },
      {
        name: 'knowledge_exploration',
        description: 'Generate a prompt for exploring the knowledge graph',
        arguments: [
          {
            name: 'concept',
            description: 'Central concept to explore',
            required: true,
          },
        ],
      },
    ];
  }

  private getPrompt(name: string, args: Record<string, string>): string {
    switch (name) {
      case 'research_summary':
        return `Please provide a comprehensive research summary on the topic: "${args.topic}"

Use the search_research and analyze_trends tools to gather information about:
1. Recent publications (last 30 days)
2. Key findings and breakthroughs
3. Current research trends
4. Implications for SleepCore digital therapeutic

Format the response as a structured report with sections for each area.`;

      case 'breakthrough_analysis':
        return `Analyze the following research breakthrough and its implications:

"${args.title}"

Please use the detect_breakthroughs and analyze_citations tools to:
1. Find related research
2. Assess the impact and novelty
3. Identify potential applications for digital sleep therapeutics
4. Recommend action items for SleepCore development

Provide a detailed analysis with confidence levels for each finding.`;

      case 'competitor_report':
        return `Generate a competitive intelligence report for: ${args.company}

Use the monitor_competitors tool to gather:
1. Recent product updates
2. Funding and partnerships
3. Regulatory submissions
4. Clinical trial activity
5. Market positioning

Provide strategic recommendations for SleepCore in response to competitor activities.`;

      case 'knowledge_exploration':
        return `Explore the knowledge graph around the concept: "${args.concept}"

Please use the GraphRAG tools in this order:
1. graph_initialize - Initialize the knowledge graph if not already done
2. graph_local_search - Find entities related to "${args.concept}"
3. graph_explore - Explore the neighborhood of the concept
4. graph_communities - See which research communities this concept belongs to
5. graph_hubs - Find the most influential concepts connected to it

Synthesize the findings into:
1. Key related concepts and their relationships
2. Research communities where this concept appears
3. Emerging trends and directions
4. Potential research gaps or opportunities

Use confidence levels to indicate certainty of findings.`;

      default:
        return `Unknown prompt: ${name}`;
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private errorResponse(id: string | number, code: number, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export { MCPRequest, MCPResponse, MCPToolDefinition, MCPResourceDefinition };
