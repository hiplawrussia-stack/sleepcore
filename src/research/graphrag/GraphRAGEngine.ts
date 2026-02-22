/**
 * @fileoverview GraphRAG Query Engine
 * @module research/graphrag/GraphRAGEngine
 * @description Движок GraphRAG для семантического поиска по графу знаний
 *
 * Реализует паттерны Microsoft GraphRAG:
 * - Local queries: поиск по конкретным сущностям
 * - Global queries: обзор через community summaries
 * - Path queries: нахождение связей между сущностями
 *
 * @see https://microsoft.github.io/graphrag/
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { KnowledgeGraph } from './KnowledgeGraph';
import { GraphBuilder } from './GraphBuilder';
import { CommunityDetector } from './CommunityDetector';
import {
  IGraphNode,
  IGraphEdge,
  ICommunityNode,
  IGraphQuery,
  IGraphQueryResult,
  QueryType,
  NodeType,
} from './types';
import { IResearchResult, ConfidenceLevel } from '../types';

/**
 * GraphRAG Engine Configuration
 */
interface IGraphRAGConfig {
  /** Maximum nodes in local query */
  maxLocalNodes: number;

  /** Maximum hops for traversal */
  maxHops: number;

  /** Minimum edge weight */
  minEdgeWeight: number;

  /** Use community summaries for global queries */
  useCommunities: boolean;

  /** Community detection levels */
  communityLevels: number;
}

const DEFAULT_CONFIG: IGraphRAGConfig = {
  maxLocalNodes: 50,
  maxHops: 3,
  minEdgeWeight: 0.1,
  useCommunities: true,
  communityLevels: 3,
};

/**
 * GraphRAG Query Engine
 *
 * Implements graph-based retrieval augmented generation:
 *
 * 1. Local Queries:
 *    - Start from matched entities
 *    - Traverse neighborhood
 *    - Return relevant subgraph
 *
 * 2. Global Queries:
 *    - Use community summaries
 *    - Provide high-level overview
 *    - Good for "what is X about?" questions
 *
 * 3. Path Queries:
 *    - Find connections between entities
 *    - Explain relationships
 */
export class GraphRAGEngine {
  private graph: KnowledgeGraph;
  private builder: GraphBuilder;
  private communityDetector: CommunityDetector;
  private config: IGraphRAGConfig;
  private initialized: boolean = false;

  constructor(config: Partial<IGraphRAGConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.builder = new GraphBuilder();
    this.graph = this.builder.getGraph();
    this.communityDetector = new CommunityDetector(this.graph);
  }

  /**
   * Initialize graph from research results
   */
  initialize(results: IResearchResult[]): void {
    console.log('[GraphRAG] Initializing from', results.length, 'results...');

    this.graph = this.builder.buildFromResults(results);
    this.communityDetector = new CommunityDetector(this.graph);

    if (this.config.useCommunities) {
      this.communityDetector.detectCommunities(this.config.communityLevels);
    }

    this.initialized = true;

    console.log('[GraphRAG] Initialized:', {
      nodes: this.graph.nodes.size,
      edges: this.graph.edges.size,
      communities: this.graph.communities.length,
    });
  }

  /**
   * Add more results to existing graph
   */
  addResults(results: IResearchResult[]): void {
    this.builder.addResults(results);

    if (this.config.useCommunities) {
      this.communityDetector.detectCommunities(this.config.communityLevels);
    }
  }

  /**
   * Execute GraphRAG query
   */
  async query(query: IGraphQuery): Promise<IGraphQueryResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return this.emptyResult(query, 'Graph not initialized', startTime);
    }

    let result: IGraphQueryResult;

    switch (query.type) {
      case QueryType.LOCAL:
        result = await this.executeLocalQuery(query);
        break;

      case QueryType.GLOBAL:
        result = await this.executeGlobalQuery(query);
        break;

      case QueryType.PATH:
        result = await this.executePathQuery(query);
        break;

      case QueryType.NEIGHBORHOOD:
        result = await this.executeNeighborhoodQuery(query);
        break;

      case QueryType.COMMUNITY:
        result = await this.executeCommunityQuery(query);
        break;

      default:
        result = await this.executeLocalQuery(query);
    }

    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Local query - find specific entities and their context
   */
  private async executeLocalQuery(query: IGraphQuery): Promise<IGraphQueryResult> {
    // Search for matching nodes
    const matchingNodes = this.searchNodes(query.query, query.nodeTypes);

    if (matchingNodes.length === 0) {
      return this.emptyResult(query, 'No matching entities found', Date.now());
    }

    // Expand from matching nodes
    const allNodes = new Map<string, IGraphNode>();
    const allEdges = new Map<string, IGraphEdge>();

    for (const startNode of matchingNodes.slice(0, 5)) {
      const subgraph = this.graph.bfs(
        startNode.id,
        query.maxHops || this.config.maxHops,
        query.nodeTypes ? (n) => query.nodeTypes!.includes(n.type) : undefined,
        query.minWeight ? (e) => e.weight >= query.minWeight! : undefined
      );

      for (const node of subgraph.nodes) {
        allNodes.set(node.id, node);
      }
      for (const edge of subgraph.edges) {
        allEdges.set(edge.id, edge);
      }
    }

    const nodes = Array.from(allNodes.values()).slice(0, query.limit || this.config.maxLocalNodes);
    const edges = Array.from(allEdges.values());

    // Generate context
    const context = this.generateLocalContext(query.query, nodes, edges);

    // Find relevant communities
    const communities = this.findRelevantCommunities(nodes);

    return {
      query,
      nodes,
      edges,
      communities,
      context,
      confidence: nodes.length > 5 ? ConfidenceLevel.HIGH : ConfidenceLevel.MEDIUM,
      explanation: `Found ${nodes.length} related entities for "${query.query}"`,
      executionTimeMs: 0,
    };
  }

  /**
   * Global query - use community summaries for overview
   */
  private async executeGlobalQuery(query: IGraphQuery): Promise<IGraphQueryResult> {
    // For global queries, use top-level communities
    const topCommunities = this.graph.communities
      .filter(c => c.properties.level === this.config.communityLevels - 1)
      .slice(0, 10);

    if (topCommunities.length === 0) {
      // Fall back to level 0
      const level0 = this.graph.communities
        .filter(c => c.properties.level === 0)
        .slice(0, 10);

      if (level0.length === 0) {
        return this.emptyResult(query, 'No communities found', Date.now());
      }
    }

    // Get representative nodes from communities
    const nodes: IGraphNode[] = [];
    for (const community of topCommunities) {
      for (const nodeId of community.properties.representativeNodes) {
        const node = this.graph.getNode(nodeId);
        if (node) nodes.push(node);
      }
    }

    // Generate global context from community summaries
    const context = this.generateGlobalContext(query.query, topCommunities);

    return {
      query,
      nodes: nodes.slice(0, query.limit || 20),
      edges: [],
      communities: topCommunities,
      context,
      confidence: ConfidenceLevel.MEDIUM,
      explanation: `Overview based on ${topCommunities.length} research communities`,
      executionTimeMs: 0,
    };
  }

  /**
   * Path query - find connections between entities
   */
  private async executePathQuery(query: IGraphQuery): Promise<IGraphQueryResult> {
    // Parse query to find two entities
    const entities = this.extractEntitiesFromQuery(query.query);

    if (entities.length < 2) {
      return this.emptyResult(
        query,
        'Path query requires two entities. Found: ' + entities.join(', '),
        Date.now()
      );
    }

    // Find nodes for each entity
    const sourceNodes = this.searchNodes(entities[0]);
    const targetNodes = this.searchNodes(entities[1]);

    if (sourceNodes.length === 0 || targetNodes.length === 0) {
      return this.emptyResult(query, 'Could not find both entities in graph', Date.now());
    }

    // Find path
    const path = this.graph.findPath(
      sourceNodes[0].id,
      targetNodes[0].id,
      query.maxHops || 5
    );

    if (!path) {
      return this.emptyResult(
        query,
        `No path found between "${entities[0]}" and "${entities[1]}"`,
        Date.now()
      );
    }

    // Get nodes and edges along path
    const nodes: IGraphNode[] = [];
    const edges: IGraphEdge[] = [];

    for (let i = 0; i < path.length; i++) {
      const node = this.graph.getNode(path[i]);
      if (node) nodes.push(node);

      if (i < path.length - 1) {
        const pathEdges = this.graph.getEdgesBetween(path[i], path[i + 1]);
        edges.push(...pathEdges);
      }
    }

    // Generate path context
    const context = this.generatePathContext(entities[0], entities[1], nodes, edges);

    return {
      query,
      nodes,
      edges,
      communities: [],
      path,
      context,
      confidence: ConfidenceLevel.HIGH,
      explanation: `Found path of length ${path.length - 1} between "${entities[0]}" and "${entities[1]}"`,
      executionTimeMs: 0,
    };
  }

  /**
   * Neighborhood query - get context around an entity
   */
  private async executeNeighborhoodQuery(query: IGraphQuery): Promise<IGraphQueryResult> {
    const startNodeId = query.startNodes?.[0];

    let startNode: IGraphNode | undefined;
    if (startNodeId) {
      startNode = this.graph.getNode(startNodeId);
    } else {
      const matches = this.searchNodes(query.query);
      startNode = matches[0];
    }

    if (!startNode) {
      return this.emptyResult(query, 'Starting entity not found', Date.now());
    }

    const subgraph = this.graph.getSubgraph(
      startNode.id,
      query.maxHops || 2
    );

    const context = this.generateNeighborhoodContext(startNode, subgraph.nodes, subgraph.edges);

    return {
      query,
      nodes: subgraph.nodes.slice(0, query.limit || 30),
      edges: subgraph.edges,
      communities: this.findRelevantCommunities(subgraph.nodes),
      context,
      confidence: ConfidenceLevel.HIGH,
      explanation: `Found ${subgraph.nodes.length} entities in neighborhood of "${startNode.label}"`,
      executionTimeMs: 0,
    };
  }

  /**
   * Community query - explore a specific community
   */
  private async executeCommunityQuery(query: IGraphQuery): Promise<IGraphQueryResult> {
    // Find matching community
    const communities = this.graph.communities.filter(c =>
      c.label.toLowerCase().includes(query.query.toLowerCase()) ||
      c.properties.keywords.some((k: string) =>
        k.toLowerCase().includes(query.query.toLowerCase())
      )
    );

    if (communities.length === 0) {
      return this.emptyResult(query, 'No matching community found', Date.now());
    }

    const community = communities[0];

    // Get community members
    const nodes: IGraphNode[] = [];
    for (const nodeId of community.properties.representativeNodes) {
      const node = this.graph.getNode(nodeId);
      if (node) nodes.push(node);
    }

    // Get internal edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = Array.from(this.graph.edges.values()).filter(
      e => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const context = this.generateCommunityContext(community, nodes);

    return {
      query,
      nodes,
      edges,
      communities: [community],
      context,
      confidence: ConfidenceLevel.HIGH,
      explanation: `Community "${community.label}" with ${community.properties.memberCount} members`,
      executionTimeMs: 0,
    };
  }

  // ============================================================================
  // Search Helpers
  // ============================================================================

  /**
   * Search nodes by text query
   */
  private searchNodes(query: string, types?: NodeType[]): IGraphNode[] {
    const queryLower = query.toLowerCase();
    const results: Array<{ node: IGraphNode; score: number }> = [];

    for (const node of Array.from(this.graph.nodes.values())) {
      if (types && !types.includes(node.type)) continue;

      let score = 0;

      // Exact match
      if (node.label.toLowerCase() === queryLower) {
        score = 100;
      }
      // Starts with
      else if (node.label.toLowerCase().startsWith(queryLower)) {
        score = 80;
      }
      // Contains
      else if (node.label.toLowerCase().includes(queryLower)) {
        score = 60;
      }
      // Check properties
      else {
        const props = JSON.stringify(node.properties).toLowerCase();
        if (props.includes(queryLower)) {
          score = 40;
        }
      }

      if (score > 0) {
        results.push({ node, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map(r => r.node);
  }

  /**
   * Extract entity names from natural language query
   */
  private extractEntitiesFromQuery(query: string): string[] {
    // Simple heuristic: look for quoted strings or known patterns
    const quoted = query.match(/"([^"]+)"/g);
    if (quoted && quoted.length >= 2) {
      return quoted.map(q => q.replace(/"/g, ''));
    }

    // Look for "between X and Y" pattern
    const betweenMatch = query.match(/between\s+(.+?)\s+and\s+(.+?)(?:\s|$)/i);
    if (betweenMatch) {
      return [betweenMatch[1].trim(), betweenMatch[2].trim()];
    }

    // Look for "from X to Y" pattern
    const fromToMatch = query.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
      return [fromToMatch[1].trim(), fromToMatch[2].trim()];
    }

    // Split by common connectors
    const parts = query.split(/\s+(?:and|to|with|vs\.?|versus)\s+/i);
    if (parts.length >= 2) {
      return parts.slice(0, 2).map(p => p.trim());
    }

    return [query];
  }

  /**
   * Find communities relevant to given nodes
   */
  private findRelevantCommunities(nodes: IGraphNode[]): ICommunityNode[] {
    const nodeIds = new Set(nodes.map(n => n.id));
    const relevantCommunities: ICommunityNode[] = [];

    for (const community of this.graph.communities) {
      const overlap = community.properties.representativeNodes.filter(
        (id: string) => nodeIds.has(id)
      );

      if (overlap.length > 0) {
        relevantCommunities.push(community);
      }
    }

    return relevantCommunities;
  }

  // ============================================================================
  // Context Generation
  // ============================================================================

  /**
   * Generate context for local query
   */
  private generateLocalContext(
    query: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[]
  ): string {
    const lines: string[] = [];

    lines.push(`## Search Results for: "${query}"\n`);

    // Group by type
    const byType = new Map<NodeType, IGraphNode[]>();
    for (const node of nodes) {
      if (!byType.has(node.type)) {
        byType.set(node.type, []);
      }
      byType.get(node.type)!.push(node);
    }

    // Papers
    const papers = byType.get(NodeType.PAPER) || [];
    if (papers.length > 0) {
      lines.push(`### Research Papers (${papers.length})\n`);
      for (const paper of papers.slice(0, 5)) {
        const props = paper.properties as { title: string; citationCount: number };
        lines.push(`- **${props.title}** (${props.citationCount} citations)`);
      }
    }

    // Concepts
    const concepts = [
      ...(byType.get(NodeType.CONCEPT) || []),
      ...(byType.get(NodeType.THERAPY) || []),
      ...(byType.get(NodeType.CONDITION) || []),
    ];
    if (concepts.length > 0) {
      lines.push(`\n### Related Concepts (${concepts.length})\n`);
      for (const concept of concepts.slice(0, 10)) {
        lines.push(`- ${concept.label}`);
      }
    }

    // Key relationships
    if (edges.length > 0) {
      lines.push(`\n### Key Relationships (${edges.length})\n`);
      for (const edge of edges.slice(0, 10)) {
        const source = this.graph.getNode(edge.source);
        const target = this.graph.getNode(edge.target);
        if (source && target) {
          lines.push(`- ${source.label} → ${edge.type} → ${target.label}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate context for global query
   */
  private generateGlobalContext(
    query: string,
    communities: ICommunityNode[]
  ): string {
    const lines: string[] = [];

    lines.push(`## Overview: "${query}"\n`);
    lines.push(`Based on analysis of ${this.graph.nodes.size} entities in ${communities.length} research communities.\n`);

    lines.push(`### Research Themes\n`);
    for (const community of communities) {
      lines.push(`#### ${community.label}`);
      lines.push(`${community.properties.summary}`);
      lines.push(`- Members: ${community.properties.memberCount}`);
      lines.push(`- Keywords: ${community.properties.keywords.slice(0, 5).join(', ')}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate context for path query
   */
  private generatePathContext(
    source: string,
    target: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[]
  ): string {
    const lines: string[] = [];

    lines.push(`## Connection Path: "${source}" → "${target}"\n`);
    lines.push(`Path length: ${edges.length} hops\n`);

    lines.push(`### Path\n`);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const prefix = i === 0 ? '🟢' : i === nodes.length - 1 ? '🔴' : '⚪';
      lines.push(`${prefix} **${node.label}** (${node.type})`);

      if (i < edges.length) {
        lines.push(`   ↓ ${edges[i].type}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate context for neighborhood query
   */
  private generateNeighborhoodContext(
    center: IGraphNode,
    nodes: IGraphNode[],
    edges: IGraphEdge[]
  ): string {
    const lines: string[] = [];

    lines.push(`## Neighborhood of: "${center.label}"\n`);

    // Direct connections
    const directNeighbors = this.graph.getNeighbors(center.id);
    lines.push(`### Direct Connections (${directNeighbors.length})\n`);

    for (const neighbor of directNeighbors.slice(0, 10)) {
      const edge = edges.find(
        e => (e.source === center.id && e.target === neighbor.id) ||
             (e.target === center.id && e.source === neighbor.id)
      );
      const relation = edge ? edge.type : 'related to';
      lines.push(`- ${neighbor.label} (${relation})`);
    }

    return lines.join('\n');
  }

  /**
   * Generate context for community query
   */
  private generateCommunityContext(
    community: ICommunityNode,
    nodes: IGraphNode[]
  ): string {
    const lines: string[] = [];

    lines.push(`## Community: ${community.label}\n`);
    lines.push(`${community.properties.summary}\n`);

    lines.push(`### Statistics`);
    lines.push(`- Total members: ${community.properties.memberCount}`);
    lines.push(`- Hierarchy level: ${community.properties.level}`);
    lines.push(`- Keywords: ${community.properties.keywords.join(', ')}\n`);

    lines.push(`### Key Entities\n`);
    for (const node of nodes.slice(0, 10)) {
      lines.push(`- **${node.label}** (${node.type})`);
    }

    return lines.join('\n');
  }

  /**
   * Create empty result
   */
  private emptyResult(
    query: IGraphQuery,
    explanation: string,
    startTime: number
  ): IGraphQueryResult {
    return {
      query,
      nodes: [],
      edges: [],
      communities: [],
      context: `No results: ${explanation}`,
      confidence: ConfidenceLevel.LOW,
      explanation,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Accessors
  // ============================================================================

  /**
   * Get the knowledge graph
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    communityCount: number;
    nodesByType: Record<string, number>;
  } {
    const stats = this.graph.calculateStats();
    return {
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      communityCount: stats.communityCount,
      nodesByType: stats.nodeCountByType as unknown as Record<string, number>,
    };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all communities
   */
  getCommunities(): ICommunityNode[] {
    return this.graph.communities;
  }

  /**
   * Find similar nodes using graph similarity
   */
  findSimilar(nodeId: string, limit: number = 10): Array<{
    id: string;
    label: string;
    type: string;
    similarity: number;
  }> {
    const similar = this.graph.findSimilarNodes(nodeId, limit);
    return similar.map(s => ({
      id: s.node.id,
      label: s.node.label,
      type: s.node.type,
      similarity: s.similarity,
    }));
  }

  /**
   * Get hub nodes (most connected)
   */
  getHubs(limit: number = 10): Array<{
    id: string;
    label: string;
    type: string;
    degree: number;
  }> {
    const hubs = this.graph.getHubs(limit);
    return hubs.map(h => ({
      id: h.node.id,
      label: h.node.label,
      type: h.node.type,
      degree: h.degree,
    }));
  }

  /**
   * Export graph to JSON
   */
  exportGraph(): object {
    return this.graph.toJSON();
  }
}
