/**
 * @fileoverview Community Detection for Knowledge Graph
 * @module research/graphrag/CommunityDetector
 * @description Обнаружение сообществ (кластеров) в графе знаний
 *
 * Реализует алгоритм Leiden для иерархической кластеризации,
 * как в Microsoft GraphRAG.
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { KnowledgeGraph } from './KnowledgeGraph';
import {
  IGraphNode,
  ICommunityNode,
  NodeType,
} from './types';

/**
 * Community detection result
 */
interface ICommunityResult {
  /** Community ID */
  id: string;

  /** Member node IDs */
  members: string[];

  /** Community label */
  label: string;

  /** Modularity score */
  modularity: number;

  /** Level in hierarchy */
  level: number;

  /** Parent community ID */
  parentId?: string;
}

/**
 * Community Detector
 *
 * Detects hierarchical communities in the knowledge graph using
 * a simplified Leiden-like algorithm.
 *
 * Used for:
 * - Global queries (summarizing themes)
 * - Finding research fronts
 * - Grouping related papers/concepts
 */
export class CommunityDetector {
  private graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  /**
   * Detect communities at multiple levels
   */
  detectCommunities(maxLevels: number = 3): ICommunityNode[] {
    console.log('[CommunityDetector] Starting community detection...');

    const allCommunities: ICommunityNode[] = [];

    // Level 0: Fine-grained communities
    let currentLevel = this.detectLevel0Communities();
    allCommunities.push(...currentLevel);

    // Higher levels: Merge communities
    for (let level = 1; level < maxLevels; level++) {
      if (currentLevel.length <= 1) break;

      const nextLevel = this.mergeCommunities(currentLevel, level);
      if (nextLevel.length === currentLevel.length) break;

      allCommunities.push(...nextLevel);
      currentLevel = nextLevel;
    }

    // Update graph with communities
    this.graph.communities = allCommunities;
    this.graph.calculateStats();

    console.log(`[CommunityDetector] Detected ${allCommunities.length} communities`);

    return allCommunities;
  }

  /**
   * Detect level 0 (fine-grained) communities
   * Uses label propagation algorithm
   */
  private detectLevel0Communities(): ICommunityNode[] {
    const nodes = Array.from(this.graph.nodes.values());
    const communities = new Map<string, Set<string>>();
    const nodeLabels = new Map<string, string>();

    // Initialize: each node is its own community
    for (const node of nodes) {
      nodeLabels.set(node.id, node.id);
    }

    // Label propagation iterations
    const maxIterations = 10;
    let changed = true;
    let iteration = 0;

    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;

      // Shuffle nodes for random order
      const shuffled = [...nodes].sort(() => Math.random() - 0.5);

      for (const node of shuffled) {
        const neighbors = this.graph.getNeighbors(node.id);
        if (neighbors.length === 0) continue;

        // Count neighbor labels
        const labelCounts = new Map<string, number>();
        for (const neighbor of neighbors) {
          const label = nodeLabels.get(neighbor.id)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        // Find most common label
        let maxCount = 0;
        let bestLabel = nodeLabels.get(node.id)!;
        for (const [label, count] of Array.from(labelCounts.entries())) {
          if (count > maxCount) {
            maxCount = count;
            bestLabel = label;
          }
        }

        // Update if changed
        if (bestLabel !== nodeLabels.get(node.id)) {
          nodeLabels.set(node.id, bestLabel);
          changed = true;
        }
      }
    }

    // Group nodes by label
    for (const [nodeId, label] of Array.from(nodeLabels.entries())) {
      if (!communities.has(label)) {
        communities.set(label, new Set());
      }
      communities.get(label)!.add(nodeId);
    }

    // Filter small communities (merge into "misc")
    const minCommunitySize = 2;
    const largeCommunities: ICommunityNode[] = [];
    const miscMembers: string[] = [];

    let communityIndex = 0;
    for (const [_, members] of Array.from(communities.entries())) {
      if (members.size >= minCommunitySize) {
        const community = this.createCommunityNode(
          Array.from(members),
          0,
          communityIndex++
        );
        largeCommunities.push(community);
      } else {
        miscMembers.push(...Array.from(members));
      }
    }

    // Add misc community if needed
    if (miscMembers.length >= minCommunitySize) {
      const miscCommunity = this.createCommunityNode(miscMembers, 0, communityIndex);
      miscCommunity.label = 'Miscellaneous';
      miscCommunity.properties.name = 'Miscellaneous';
      largeCommunities.push(miscCommunity);
    }

    return largeCommunities;
  }

  /**
   * Merge communities into higher level
   */
  private mergeCommunities(
    communities: ICommunityNode[],
    level: number
  ): ICommunityNode[] {
    if (communities.length <= 2) return communities;

    // Calculate community similarity based on shared edges
    const similarityMatrix: number[][] = [];

    for (let i = 0; i < communities.length; i++) {
      similarityMatrix[i] = [];
      for (let j = 0; j < communities.length; j++) {
        if (i === j) {
          similarityMatrix[i][j] = 0;
        } else {
          similarityMatrix[i][j] = this.calculateCommunitySimilarity(
            communities[i],
            communities[j]
          );
        }
      }
    }

    // Greedy merge: merge most similar pairs
    const merged: ICommunityNode[] = [];
    const used = new Set<number>();
    const threshold = 0.1;

    for (let i = 0; i < communities.length; i++) {
      if (used.has(i)) continue;

      // Find most similar community
      let bestJ = -1;
      let bestSimilarity = threshold;

      for (let j = i + 1; j < communities.length; j++) {
        if (used.has(j)) continue;
        if (similarityMatrix[i][j] > bestSimilarity) {
          bestSimilarity = similarityMatrix[i][j];
          bestJ = j;
        }
      }

      if (bestJ >= 0) {
        // Merge i and bestJ
        used.add(i);
        used.add(bestJ);

        const allMembers = [
          ...communities[i].properties.representativeNodes,
          ...communities[bestJ].properties.representativeNodes,
        ];

        // Get all actual member nodes
        const memberNodes: string[] = [];
        for (const nodeId of allMembers) {
          const node = this.graph.getNode(nodeId);
          if (node) memberNodes.push(nodeId);
        }

        const mergedCommunity = this.createCommunityNode(
          memberNodes,
          level,
          merged.length
        );
        mergedCommunity.properties.description =
          `Merged: ${communities[i].label} + ${communities[bestJ].label}`;

        merged.push(mergedCommunity);
      } else {
        // Keep as is
        used.add(i);
        const copy = { ...communities[i] };
        copy.id = `community:L${level}:${merged.length}`;
        copy.properties = {
          ...copy.properties,
          level,
        };
        merged.push(copy);
      }
    }

    return merged;
  }

  /**
   * Calculate similarity between two communities
   */
  private calculateCommunitySimilarity(
    c1: ICommunityNode,
    c2: ICommunityNode
  ): number {
    const members1 = new Set(c1.properties.representativeNodes);
    const members2 = new Set(c2.properties.representativeNodes);

    let crossEdges = 0;
    let totalEdges = 0;

    // Count edges from c1 to c2
    for (const nodeId of Array.from(members1)) {
      const outgoing = this.graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        totalEdges++;
        if (members2.has(edge.target)) {
          crossEdges++;
        }
      }
    }

    // Count edges from c2 to c1
    for (const nodeId of Array.from(members2)) {
      const outgoing = this.graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        totalEdges++;
        if (members1.has(edge.target)) {
          crossEdges++;
        }
      }
    }

    return totalEdges > 0 ? crossEdges / totalEdges : 0;
  }

  /**
   * Create community node
   */
  private createCommunityNode(
    memberIds: string[],
    level: number,
    index: number
  ): ICommunityNode {
    // Get member nodes
    const members = memberIds
      .map(id => this.graph.getNode(id))
      .filter((n): n is IGraphNode => n !== undefined);

    // Generate label from most common keywords
    const keywords = this.extractCommunityKeywords(members);
    const label = keywords.slice(0, 3).join(', ') || `Community ${index + 1}`;

    // Generate summary
    const summary = this.generateCommunitySummary(members, keywords);

    // Find representative nodes (highest degree)
    const representatives = members
      .map(m => ({ id: m.id, degree: this.graph.getDegree(m.id).total }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5)
      .map(r => r.id);

    return {
      id: `community:L${level}:${index}`,
      type: NodeType.COMMUNITY,
      label,
      properties: {
        name: label,
        description: `Level ${level} community with ${members.length} members`,
        summary,
        memberCount: members.length,
        level,
        keywords,
        representativeNodes: representatives,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Extract keywords from community members
   */
  private extractCommunityKeywords(members: IGraphNode[]): string[] {
    const keywordCounts = new Map<string, number>();

    for (const member of members) {
      // Use label as keyword
      const label = member.label.toLowerCase();
      keywordCounts.set(label, (keywordCounts.get(label) || 0) + 1);

      // For papers, also use categories
      if (member.type === NodeType.PAPER) {
        const props = member.properties as { categories?: string[] };
        if (props.categories) {
          for (const cat of props.categories) {
            keywordCounts.set(cat, (keywordCounts.get(cat) || 0) + 1);
          }
        }
      }
    }

    // Sort by frequency
    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);
  }

  /**
   * Generate summary for community
   */
  private generateCommunitySummary(members: IGraphNode[], keywords: string[]): string {
    // Count node types
    const typeCounts = new Map<NodeType, number>();
    for (const member of members) {
      typeCounts.set(member.type, (typeCounts.get(member.type) || 0) + 1);
    }

    const parts: string[] = [];

    // Describe composition
    const paperCount = typeCounts.get(NodeType.PAPER) || 0;
    const conceptCount = (typeCounts.get(NodeType.CONCEPT) || 0) +
                         (typeCounts.get(NodeType.THERAPY) || 0) +
                         (typeCounts.get(NodeType.CONDITION) || 0);

    if (paperCount > 0) {
      parts.push(`${paperCount} research papers`);
    }
    if (conceptCount > 0) {
      parts.push(`${conceptCount} concepts`);
    }

    // Main themes
    if (keywords.length > 0) {
      parts.push(`focusing on ${keywords.slice(0, 3).join(', ')}`);
    }

    return parts.join(' ') || 'Research community';
  }

  /**
   * Get community for a node
   */
  getCommunityForNode(nodeId: string): ICommunityNode | undefined {
    for (const community of this.graph.communities) {
      if (community.properties.representativeNodes.includes(nodeId)) {
        return community;
      }
    }
    return undefined;
  }

  /**
   * Get communities at specific level
   */
  getCommunitiesAtLevel(level: number): ICommunityNode[] {
    return this.graph.communities.filter(c => c.properties.level === level);
  }
}
