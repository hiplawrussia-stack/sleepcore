/**
 * @fileoverview GraphRAG Types
 * @module research/graphrag/types
 * @description Типы для Knowledge Graph и GraphRAG
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { ResearchCategory, ConfidenceLevel } from '../types';

// ============================================================================
// Node Types
// ============================================================================

/**
 * Base node in knowledge graph
 */
export interface IGraphNode {
  /** Unique node ID */
  id: string;

  /** Node type */
  type: NodeType;

  /** Display label */
  label: string;

  /** Node properties */
  properties: Record<string, unknown>;

  /** Embedding vector (for semantic search) */
  embedding?: number[];

  /** When created */
  createdAt: Date;

  /** When last updated */
  updatedAt: Date;
}

/**
 * Node types in the graph
 */
export enum NodeType {
  // Research entities
  PAPER = 'paper',
  AUTHOR = 'author',
  INSTITUTION = 'institution',
  JOURNAL = 'journal',

  // Concepts
  CONCEPT = 'concept',
  THERAPY = 'therapy',
  CONDITION = 'condition',
  BIOMARKER = 'biomarker',
  DRUG = 'drug',

  // Business entities
  COMPANY = 'company',
  PRODUCT = 'product',
  CLINICAL_TRIAL = 'clinical_trial',

  // Meta
  CATEGORY = 'category',
  TREND = 'trend',
  COMMUNITY = 'community',
}

/**
 * Paper node
 */
export interface IPaperNode extends IGraphNode {
  type: NodeType.PAPER;
  properties: {
    title: string;
    abstract: string;
    doi?: string;
    url: string;
    publishedAt: Date;
    citationCount: number;
    source: string;
    relevanceScore: number;
    categories: ResearchCategory[];
  };
}

/**
 * Concept node (extracted from papers)
 */
export interface IConceptNode extends IGraphNode {
  type: NodeType.CONCEPT;
  properties: {
    name: string;
    definition?: string;
    meshId?: string;
    snomedId?: string;
    frequency: number; // How often mentioned
    importance: number; // Calculated importance score
  };
}

/**
 * Author node
 */
export interface IAuthorNode extends IGraphNode {
  type: NodeType.AUTHOR;
  properties: {
    name: string;
    orcid?: string;
    affiliations: string[];
    hIndex?: number;
    paperCount: number;
  };
}

/**
 * Community node (cluster of related nodes)
 */
export interface ICommunityNode extends IGraphNode {
  type: NodeType.COMMUNITY;
  properties: {
    name: string;
    description: string;
    summary: string; // AI-generated summary
    memberCount: number;
    level: number; // Hierarchy level (0 = top)
    keywords: string[];
    representativeNodes: string[]; // IDs of key nodes
  };
}

// ============================================================================
// Edge Types
// ============================================================================

/**
 * Edge in knowledge graph
 */
export interface IGraphEdge {
  /** Unique edge ID */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Edge type */
  type: EdgeType;

  /** Edge weight (0-1) */
  weight: number;

  /** Edge properties */
  properties: Record<string, unknown>;

  /** When created */
  createdAt: Date;
}

/**
 * Edge types
 */
export enum EdgeType {
  // Paper relationships
  CITES = 'cites',
  CITED_BY = 'cited_by',
  SIMILAR_TO = 'similar_to',
  RELATED_TO = 'related_to',

  // Author relationships
  AUTHORED = 'authored',
  COLLABORATED_WITH = 'collaborated_with',
  AFFILIATED_WITH = 'affiliated_with',

  // Concept relationships
  MENTIONS = 'mentions',
  TREATS = 'treats',
  CAUSES = 'causes',
  ASSOCIATED_WITH = 'associated_with',
  IS_A = 'is_a',
  PART_OF = 'part_of',

  // Business relationships
  DEVELOPED_BY = 'developed_by',
  COMPETES_WITH = 'competes_with',
  ACQUIRED_BY = 'acquired_by',

  // Community relationships
  BELONGS_TO = 'belongs_to',
  CONTAINS = 'contains',
}

// ============================================================================
// Graph Structure
// ============================================================================

/**
 * Knowledge Graph
 */
export interface IKnowledgeGraph {
  /** Graph ID */
  id: string;

  /** Graph name */
  name: string;

  /** All nodes */
  nodes: Map<string, IGraphNode>;

  /** All edges */
  edges: Map<string, IGraphEdge>;

  /** Node index by type */
  nodesByType: Map<NodeType, Set<string>>;

  /** Adjacency list (outgoing edges) */
  adjacency: Map<string, Set<string>>;

  /** Reverse adjacency (incoming edges) */
  reverseAdjacency: Map<string, Set<string>>;

  /** Communities (hierarchical) */
  communities: ICommunityNode[];

  /** Graph statistics */
  stats: IGraphStats;

  /** When created */
  createdAt: Date;

  /** When last updated */
  updatedAt: Date;
}

/**
 * Graph statistics
 */
export interface IGraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeCountByType: Record<NodeType, number>;
  edgeCountByType: Record<EdgeType, number>;
  avgDegree: number;
  density: number;
  communityCount: number;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * GraphRAG query
 */
export interface IGraphQuery {
  /** Natural language query */
  query: string;

  /** Query type */
  type: QueryType;

  /** Starting nodes (optional) */
  startNodes?: string[];

  /** Max hops for traversal */
  maxHops?: number;

  /** Min edge weight */
  minWeight?: number;

  /** Node type filter */
  nodeTypes?: NodeType[];

  /** Edge type filter */
  edgeTypes?: EdgeType[];

  /** Use community summaries */
  useCommunities?: boolean;

  /** Max results */
  limit?: number;

  /** Include generated context in result */
  includeContext?: boolean;
}

/**
 * Query types
 */
export enum QueryType {
  // Local queries (specific entity)
  LOCAL = 'local',

  // Global queries (broad themes)
  GLOBAL = 'global',

  // Path queries (connections between entities)
  PATH = 'path',

  // Neighborhood queries (related entities)
  NEIGHBORHOOD = 'neighborhood',

  // Community queries (thematic clusters)
  COMMUNITY = 'community',
}

/**
 * GraphRAG query result
 */
export interface IGraphQueryResult {
  /** Query that was executed */
  query: IGraphQuery;

  /** Retrieved nodes */
  nodes: IGraphNode[];

  /** Retrieved edges */
  edges: IGraphEdge[];

  /** Relevant communities */
  communities: ICommunityNode[];

  /** Generated context for LLM */
  context?: string;

  /** Path for path queries (node IDs) */
  path?: string[];

  /** Confidence in results */
  confidence: ConfidenceLevel;

  /** Explanation of retrieval */
  explanation: string;

  /** Query execution time (ms) */
  executionTimeMs: number;
}

// ============================================================================
// Extraction Types
// ============================================================================

/**
 * Entity extraction result
 */
export interface IExtractedEntity {
  /** Entity text */
  text: string;

  /** Entity type */
  type: NodeType;

  /** Start position in source */
  start: number;

  /** End position in source */
  end: number;

  /** Confidence (0-1) */
  confidence: number;

  /** Normalized form */
  normalized?: string;

  /** External IDs (MeSH, SNOMED, etc.) */
  externalIds?: Record<string, string>;
}

/**
 * Relation extraction result
 */
export interface IExtractedRelation {
  /** Source entity */
  source: IExtractedEntity;

  /** Target entity */
  target: IExtractedEntity;

  /** Relation type */
  type: EdgeType;

  /** Confidence (0-1) */
  confidence: number;

  /** Evidence text */
  evidence: string;
}
