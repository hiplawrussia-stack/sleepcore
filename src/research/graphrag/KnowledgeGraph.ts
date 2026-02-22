/**
 * @fileoverview Knowledge Graph Implementation
 * @module research/graphrag/KnowledgeGraph
 * @description In-memory Knowledge Graph для research данных
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import {
  IKnowledgeGraph,
  IGraphNode,
  IGraphEdge,
  IGraphStats,
  ICommunityNode,
  NodeType,
  EdgeType,
} from './types';

/**
 * Knowledge Graph
 *
 * In-memory graph database for research entities and relationships.
 * Supports:
 * - Node/edge CRUD operations
 * - Graph traversal
 * - Community detection
 * - Similarity search
 */
export class KnowledgeGraph implements IKnowledgeGraph {
  id: string;
  name: string;
  nodes: Map<string, IGraphNode>;
  edges: Map<string, IGraphEdge>;
  nodesByType: Map<NodeType, Set<string>>;
  adjacency: Map<string, Set<string>>;
  reverseAdjacency: Map<string, Set<string>>;
  communities: ICommunityNode[];
  stats: IGraphStats;
  createdAt: Date;
  updatedAt: Date;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.nodes = new Map();
    this.edges = new Map();
    this.nodesByType = new Map();
    this.adjacency = new Map();
    this.reverseAdjacency = new Map();
    this.communities = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Initialize type maps
    for (const type of Object.values(NodeType)) {
      this.nodesByType.set(type, new Set());
    }

    this.stats = this.calculateStats();
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  /**
   * Add a node to the graph
   */
  addNode(node: IGraphNode): void {
    this.nodes.set(node.id, node);
    this.nodesByType.get(node.type)?.add(node.id);

    // Initialize adjacency
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
    if (!this.reverseAdjacency.has(node.id)) {
      this.reverseAdjacency.set(node.id, new Set());
    }

    this.updatedAt = new Date();
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): IGraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: NodeType): IGraphNode[] {
    const ids = this.nodesByType.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.nodes.get(id))
      .filter((n): n is IGraphNode => n !== undefined);
  }

  /**
   * Update a node
   */
  updateNode(id: string, updates: Partial<IGraphNode>): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    Object.assign(node, updates, { updatedAt: new Date() });
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove a node and its edges
   */
  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove edges
    const outgoing = this.adjacency.get(id) || new Set();
    const incoming = this.reverseAdjacency.get(id) || new Set();

    for (const targetId of Array.from(outgoing)) {
      this.removeEdgeByNodes(id, targetId);
    }
    for (const sourceId of Array.from(incoming)) {
      this.removeEdgeByNodes(sourceId, id);
    }

    // Remove node
    this.nodes.delete(id);
    this.nodesByType.get(node.type)?.delete(id);
    this.adjacency.delete(id);
    this.reverseAdjacency.delete(id);

    this.updatedAt = new Date();
    return true;
  }

  /**
   * Check if node exists
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  // ============================================================================
  // Edge Operations
  // ============================================================================

  /**
   * Add an edge to the graph
   */
  addEdge(edge: IGraphEdge): void {
    // Validate nodes exist
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error(`Cannot add edge: source or target node not found`);
    }

    this.edges.set(edge.id, edge);
    this.adjacency.get(edge.source)?.add(edge.target);
    this.reverseAdjacency.get(edge.target)?.add(edge.source);

    this.updatedAt = new Date();
  }

  /**
   * Get an edge by ID
   */
  getEdge(id: string): IGraphEdge | undefined {
    return this.edges.get(id);
  }

  /**
   * Get edges between two nodes
   */
  getEdgesBetween(sourceId: string, targetId: string): IGraphEdge[] {
    return Array.from(this.edges.values()).filter(
      e => e.source === sourceId && e.target === targetId
    );
  }

  /**
   * Get all outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): IGraphEdge[] {
    return Array.from(this.edges.values()).filter(e => e.source === nodeId);
  }

  /**
   * Get all incoming edges to a node
   */
  getIncomingEdges(nodeId: string): IGraphEdge[] {
    return Array.from(this.edges.values()).filter(e => e.target === nodeId);
  }

  /**
   * Remove an edge by ID
   */
  removeEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.edges.delete(id);
    this.adjacency.get(edge.source)?.delete(edge.target);
    this.reverseAdjacency.get(edge.target)?.delete(edge.source);

    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove edge by source and target
   */
  private removeEdgeByNodes(sourceId: string, targetId: string): void {
    const edgesToRemove = this.getEdgesBetween(sourceId, targetId);
    for (const edge of edgesToRemove) {
      this.removeEdge(edge.id);
    }
  }

  // ============================================================================
  // Traversal Operations
  // ============================================================================

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string, direction: 'out' | 'in' | 'both' = 'both'): IGraphNode[] {
    const neighborIds = new Set<string>();

    if (direction === 'out' || direction === 'both') {
      const outgoing = this.adjacency.get(nodeId);
      if (outgoing) {
        for (const id of Array.from(outgoing)) {
          neighborIds.add(id);
        }
      }
    }

    if (direction === 'in' || direction === 'both') {
      const incoming = this.reverseAdjacency.get(nodeId);
      if (incoming) {
        for (const id of Array.from(incoming)) {
          neighborIds.add(id);
        }
      }
    }

    return Array.from(neighborIds)
      .map(id => this.nodes.get(id))
      .filter((n): n is IGraphNode => n !== undefined);
  }

  /**
   * BFS traversal from a starting node
   */
  bfs(
    startId: string,
    maxDepth: number = 3,
    nodeFilter?: (node: IGraphNode) => boolean,
    edgeFilter?: (edge: IGraphEdge) => boolean
  ): { nodes: IGraphNode[]; edges: IGraphEdge[] } {
    const visited = new Set<string>();
    const resultNodes: IGraphNode[] = [];
    const resultEdges: IGraphEdge[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;
      if (nodeFilter && !nodeFilter(node)) continue;

      resultNodes.push(node);

      // Get outgoing edges
      const edges = this.getOutgoingEdges(id);
      for (const edge of edges) {
        if (edgeFilter && !edgeFilter(edge)) continue;

        resultEdges.push(edge);

        if (!visited.has(edge.target)) {
          queue.push({ id: edge.target, depth: depth + 1 });
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(sourceId: string, targetId: string, maxDepth: number = 5): string[] | null {
    if (sourceId === targetId) return [sourceId];

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [
      { id: sourceId, path: [sourceId] },
    ];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (path.length > maxDepth) continue;
      if (visited.has(id)) continue;
      visited.add(id);

      const neighbors = this.adjacency.get(id);
      if (!neighbors) continue;

      for (const neighborId of Array.from(neighbors)) {
        if (neighborId === targetId) {
          return [...path, neighborId];
        }

        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null;
  }

  /**
   * Get subgraph around a node
   */
  getSubgraph(
    centerNodeId: string,
    radius: number = 2
  ): { nodes: IGraphNode[]; edges: IGraphEdge[] } {
    return this.bfs(centerNodeId, radius);
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Search nodes by label
   */
  searchByLabel(query: string, types?: NodeType[]): IGraphNode[] {
    const queryLower = query.toLowerCase();
    const results: IGraphNode[] = [];

    for (const node of Array.from(this.nodes.values())) {
      if (types && !types.includes(node.type)) continue;

      if (node.label.toLowerCase().includes(queryLower)) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * Search nodes by property
   */
  searchByProperty(
    key: string,
    value: unknown,
    types?: NodeType[]
  ): IGraphNode[] {
    const results: IGraphNode[] = [];

    for (const node of Array.from(this.nodes.values())) {
      if (types && !types.includes(node.type)) continue;

      if (node.properties[key] === value) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * Find similar nodes (by shared neighbors)
   */
  findSimilarNodes(nodeId: string, limit: number = 10): Array<{ node: IGraphNode; similarity: number }> {
    const sourceNeighbors = new Set(
      this.getNeighbors(nodeId).map(n => n.id)
    );

    if (sourceNeighbors.size === 0) return [];

    const similarities: Array<{ node: IGraphNode; similarity: number }> = [];

    for (const [id, node] of Array.from(this.nodes.entries())) {
      if (id === nodeId) continue;

      const targetNeighbors = new Set(
        this.getNeighbors(id).map(n => n.id)
      );

      // Jaccard similarity
      const intersection = new Set(
        Array.from(sourceNeighbors).filter(x => targetNeighbors.has(x))
      );
      const union = new Set([...Array.from(sourceNeighbors), ...Array.from(targetNeighbors)]);

      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      if (similarity > 0) {
        similarities.push({ node, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Calculate graph statistics
   */
  calculateStats(): IGraphStats {
    const nodeCountByType: Record<NodeType, number> = {} as Record<NodeType, number>;
    const edgeCountByType: Record<EdgeType, number> = {} as Record<EdgeType, number>;

    // Count nodes by type
    for (const type of Object.values(NodeType)) {
      nodeCountByType[type] = this.nodesByType.get(type)?.size || 0;
    }

    // Count edges by type
    for (const type of Object.values(EdgeType)) {
      edgeCountByType[type] = 0;
    }
    for (const edge of Array.from(this.edges.values())) {
      edgeCountByType[edge.type] = (edgeCountByType[edge.type] || 0) + 1;
    }

    // Calculate average degree
    let totalDegree = 0;
    for (const [_, neighbors] of Array.from(this.adjacency.entries())) {
      totalDegree += neighbors.size;
    }
    const avgDegree = this.nodes.size > 0 ? totalDegree / this.nodes.size : 0;

    // Calculate density
    const maxEdges = this.nodes.size * (this.nodes.size - 1);
    const density = maxEdges > 0 ? this.edges.size / maxEdges : 0;

    this.stats = {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodeCountByType,
      edgeCountByType,
      avgDegree,
      density,
      communityCount: this.communities.length,
    };

    return this.stats;
  }

  /**
   * Get node degree
   */
  getDegree(nodeId: string): { in: number; out: number; total: number } {
    const inDegree = this.reverseAdjacency.get(nodeId)?.size || 0;
    const outDegree = this.adjacency.get(nodeId)?.size || 0;
    return {
      in: inDegree,
      out: outDegree,
      total: inDegree + outDegree,
    };
  }

  /**
   * Get highest degree nodes
   */
  getHubs(limit: number = 10): Array<{ node: IGraphNode; degree: number }> {
    const degrees: Array<{ node: IGraphNode; degree: number }> = [];

    for (const node of Array.from(this.nodes.values())) {
      const degree = this.getDegree(node.id);
      degrees.push({ node, degree: degree.total });
    }

    return degrees
      .sort((a, b) => b.degree - a.degree)
      .slice(0, limit);
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Export graph to JSON
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      communities: this.communities,
      stats: this.calculateStats(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Import graph from JSON
   */
  static fromJSON(data: {
    id: string;
    name: string;
    nodes: IGraphNode[];
    edges: IGraphEdge[];
    communities?: ICommunityNode[];
  }): KnowledgeGraph {
    const graph = new KnowledgeGraph(data.id, data.name);

    for (const node of data.nodes) {
      graph.addNode(node);
    }

    for (const edge of data.edges) {
      graph.addEdge(edge);
    }

    if (data.communities) {
      graph.communities = data.communities;
    }

    graph.calculateStats();
    return graph;
  }
}
