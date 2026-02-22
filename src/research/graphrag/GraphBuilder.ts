/**
 * @fileoverview Knowledge Graph Builder
 * @module research/graphrag/GraphBuilder
 * @description Построение Knowledge Graph из research результатов
 *
 * Функции:
 * - Извлечение сущностей из текста
 * - Построение связей между сущностями
 * - Создание узлов papers, concepts, authors
 * - Интеграция с MeSH терминологией
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { IResearchResult, ResearchCategory } from '../types';
import { KnowledgeGraph } from './KnowledgeGraph';
import {
  IGraphNode,
  IGraphEdge,
  IPaperNode,
  IConceptNode,
  IAuthorNode,
  NodeType,
  EdgeType,
  IExtractedEntity,
  IExtractedRelation,
} from './types';

/**
 * Entity extraction patterns for sleep research domain
 */
const ENTITY_PATTERNS = {
  // Therapies
  therapies: [
    { pattern: /\bCBT-?I\b/gi, normalized: 'CBT-I', type: NodeType.THERAPY },
    { pattern: /\bcognitive behavioral therapy for insomnia\b/gi, normalized: 'CBT-I', type: NodeType.THERAPY },
    { pattern: /\bsleep restriction\b/gi, normalized: 'Sleep Restriction Therapy', type: NodeType.THERAPY },
    { pattern: /\bstimulus control\b/gi, normalized: 'Stimulus Control', type: NodeType.THERAPY },
    { pattern: /\bACT-?I\b/gi, normalized: 'ACT-I', type: NodeType.THERAPY },
    { pattern: /\bMBT-?I\b/gi, normalized: 'MBT-I', type: NodeType.THERAPY },
    { pattern: /\bmindfulness\b/gi, normalized: 'Mindfulness', type: NodeType.THERAPY },
    { pattern: /\brelaxation therapy\b/gi, normalized: 'Relaxation Therapy', type: NodeType.THERAPY },
    { pattern: /\bsleep hygiene\b/gi, normalized: 'Sleep Hygiene', type: NodeType.THERAPY },
  ],

  // Conditions
  conditions: [
    { pattern: /\binsomnia\b/gi, normalized: 'Insomnia', type: NodeType.CONDITION },
    { pattern: /\bchronic insomnia\b/gi, normalized: 'Chronic Insomnia', type: NodeType.CONDITION },
    { pattern: /\bsleep disorder\b/gi, normalized: 'Sleep Disorder', type: NodeType.CONDITION },
    { pattern: /\bsleep apnea\b/gi, normalized: 'Sleep Apnea', type: NodeType.CONDITION },
    { pattern: /\bcircadian rhythm disorder\b/gi, normalized: 'Circadian Rhythm Disorder', type: NodeType.CONDITION },
    { pattern: /\bhyperarousal\b/gi, normalized: 'Hyperarousal', type: NodeType.CONDITION },
    { pattern: /\bsleep onset latency\b/gi, normalized: 'Sleep Onset Latency', type: NodeType.CONCEPT },
    { pattern: /\bwake after sleep onset\b/gi, normalized: 'WASO', type: NodeType.CONCEPT },
  ],

  // Biomarkers & Metrics
  biomarkers: [
    { pattern: /\bISI\b/g, normalized: 'Insomnia Severity Index', type: NodeType.BIOMARKER },
    { pattern: /\bPSQI\b/g, normalized: 'Pittsburgh Sleep Quality Index', type: NodeType.BIOMARKER },
    { pattern: /\bsleep efficiency\b/gi, normalized: 'Sleep Efficiency', type: NodeType.BIOMARKER },
    { pattern: /\bHRV\b/g, normalized: 'Heart Rate Variability', type: NodeType.BIOMARKER },
    { pattern: /\bpolysomnography\b/gi, normalized: 'Polysomnography', type: NodeType.BIOMARKER },
    { pattern: /\bactigraphy\b/gi, normalized: 'Actigraphy', type: NodeType.BIOMARKER },
    { pattern: /\bEEG\b/g, normalized: 'EEG', type: NodeType.BIOMARKER },
  ],

  // Drugs
  drugs: [
    { pattern: /\bmelatonin\b/gi, normalized: 'Melatonin', type: NodeType.DRUG },
    { pattern: /\bzolpidem\b/gi, normalized: 'Zolpidem', type: NodeType.DRUG },
    { pattern: /\beszopiclone\b/gi, normalized: 'Eszopiclone', type: NodeType.DRUG },
    { pattern: /\bramelteon\b/gi, normalized: 'Ramelteon', type: NodeType.DRUG },
    { pattern: /\bsuvorexant\b/gi, normalized: 'Suvorexant', type: NodeType.DRUG },
    { pattern: /\blemborexant\b/gi, normalized: 'Lemborexant', type: NodeType.DRUG },
    { pattern: /\bdoxepin\b/gi, normalized: 'Doxepin', type: NodeType.DRUG },
  ],

  // Concepts
  concepts: [
    { pattern: /\bdigital therapeutic\b/gi, normalized: 'Digital Therapeutic', type: NodeType.CONCEPT },
    { pattern: /\bDTx\b/g, normalized: 'Digital Therapeutic', type: NodeType.CONCEPT },
    { pattern: /\bmHealth\b/gi, normalized: 'mHealth', type: NodeType.CONCEPT },
    { pattern: /\bmachine learning\b/gi, normalized: 'Machine Learning', type: NodeType.CONCEPT },
    { pattern: /\bdeep learning\b/gi, normalized: 'Deep Learning', type: NodeType.CONCEPT },
    { pattern: /\bartificial intelligence\b/gi, normalized: 'Artificial Intelligence', type: NodeType.CONCEPT },
    { pattern: /\bpersonalized medicine\b/gi, normalized: 'Personalized Medicine', type: NodeType.CONCEPT },
    { pattern: /\bwearable\b/gi, normalized: 'Wearable Device', type: NodeType.CONCEPT },
    { pattern: /\brandomized controlled trial\b/gi, normalized: 'RCT', type: NodeType.CONCEPT },
    { pattern: /\bmeta-analysis\b/gi, normalized: 'Meta-analysis', type: NodeType.CONCEPT },
  ],

  // Companies
  companies: [
    { pattern: /\bBig Health\b/gi, normalized: 'Big Health', type: NodeType.COMPANY },
    { pattern: /\bSleepio\b/gi, normalized: 'Sleepio', type: NodeType.PRODUCT },
    { pattern: /\bPear Therapeutics\b/gi, normalized: 'Pear Therapeutics', type: NodeType.COMPANY },
    { pattern: /\bSomryst\b/gi, normalized: 'Somryst', type: NodeType.PRODUCT },
    { pattern: /\bNox Health\b/gi, normalized: 'Nox Health', type: NodeType.COMPANY },
    { pattern: /\bSleepScore\b/gi, normalized: 'SleepScore Labs', type: NodeType.COMPANY },
    { pattern: /\bFitbit\b/gi, normalized: 'Fitbit', type: NodeType.COMPANY },
    { pattern: /\bOura\b/gi, normalized: 'Oura', type: NodeType.COMPANY },
  ],
};

/**
 * Knowledge Graph Builder
 */
export class GraphBuilder {
  private graph: KnowledgeGraph;
  private conceptCounts: Map<string, number> = new Map();

  constructor(graphId: string = 'sleepcore-research', graphName: string = 'SleepCore Research Graph') {
    this.graph = new KnowledgeGraph(graphId, graphName);
  }

  /**
   * Build graph from research results
   */
  buildFromResults(results: IResearchResult[]): KnowledgeGraph {
    console.log(`[GraphBuilder] Building graph from ${results.length} results...`);

    for (const result of results) {
      // Add paper node
      const paperNode = this.createPaperNode(result);
      this.graph.addNode(paperNode);

      // Extract entities from title and summary
      const text = `${result.title} ${result.summary}`;
      const entities = this.extractEntities(text);

      // Add entity nodes and edges
      for (const entity of entities) {
        const entityNode = this.getOrCreateEntityNode(entity);

        // Add MENTIONS edge
        const mentionsEdge = this.createEdge(
          paperNode.id,
          entityNode.id,
          EdgeType.MENTIONS,
          entity.confidence
        );
        this.graph.addEdge(mentionsEdge);
      }

      // Add author nodes
      if (result.authors) {
        for (const authorName of result.authors) {
          const authorNode = this.getOrCreateAuthorNode(authorName);

          const authoredEdge = this.createEdge(
            authorNode.id,
            paperNode.id,
            EdgeType.AUTHORED,
            1.0
          );
          this.graph.addEdge(authoredEdge);
        }
      }

      // Add category nodes
      for (const category of result.categories) {
        const categoryNode = this.getOrCreateCategoryNode(category);

        const belongsToEdge = this.createEdge(
          paperNode.id,
          categoryNode.id,
          EdgeType.BELONGS_TO,
          1.0
        );
        this.graph.addEdge(belongsToEdge);
      }

      // Extract relations
      const relations = this.extractRelations(text, entities);
      for (const relation of relations) {
        const sourceNode = this.getOrCreateEntityNode(relation.source);
        const targetNode = this.getOrCreateEntityNode(relation.target);

        const relationEdge = this.createEdge(
          sourceNode.id,
          targetNode.id,
          relation.type,
          relation.confidence
        );
        this.graph.addEdge(relationEdge);
      }
    }

    // Add similar paper edges based on shared concepts
    this.addSimilarityEdges();

    // Update concept importance scores
    this.updateConceptImportance();

    console.log(`[GraphBuilder] Graph built: ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edges`);

    return this.graph;
  }

  /**
   * Add results to existing graph
   */
  addResults(results: IResearchResult[]): void {
    for (const result of results) {
      if (this.graph.hasNode(`paper:${result.id}`)) continue;

      const paperNode = this.createPaperNode(result);
      this.graph.addNode(paperNode);

      const text = `${result.title} ${result.summary}`;
      const entities = this.extractEntities(text);

      for (const entity of entities) {
        const entityNode = this.getOrCreateEntityNode(entity);
        const mentionsEdge = this.createEdge(
          paperNode.id,
          entityNode.id,
          EdgeType.MENTIONS,
          entity.confidence
        );
        this.graph.addEdge(mentionsEdge);
      }
    }
  }

  /**
   * Extract entities from text
   */
  extractEntities(text: string): IExtractedEntity[] {
    const entities: IExtractedEntity[] = [];
    const seen = new Set<string>();

    for (const category of Object.values(ENTITY_PATTERNS)) {
      for (const { pattern, normalized, type } of category) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);

        while ((match = regex.exec(text)) !== null) {
          const key = `${type}:${normalized}`;
          if (seen.has(key)) continue;
          seen.add(key);

          entities.push({
            text: match[0],
            type,
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.9,
            normalized,
          });

          // Track frequency
          this.conceptCounts.set(key, (this.conceptCounts.get(key) || 0) + 1);
        }
      }
    }

    return entities;
  }

  /**
   * Extract relations from text
   */
  extractRelations(text: string, entities: IExtractedEntity[]): IExtractedRelation[] {
    const relations: IExtractedRelation[] = [];

    // Simple co-occurrence based relation extraction
    // Entities in same sentence are considered related

    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      const sentenceEntities = entities.filter(
        e => sentence.toLowerCase().includes(e.normalized?.toLowerCase() || e.text.toLowerCase())
      );

      // Create ASSOCIATED_WITH relations between co-occurring entities
      for (let i = 0; i < sentenceEntities.length; i++) {
        for (let j = i + 1; j < sentenceEntities.length; j++) {
          const source = sentenceEntities[i];
          const target = sentenceEntities[j];

          // Determine relation type based on entity types
          let relationType = EdgeType.ASSOCIATED_WITH;

          if (source.type === NodeType.THERAPY && target.type === NodeType.CONDITION) {
            relationType = EdgeType.TREATS;
          } else if (source.type === NodeType.DRUG && target.type === NodeType.CONDITION) {
            relationType = EdgeType.TREATS;
          }

          relations.push({
            source,
            target,
            type: relationType,
            confidence: 0.7,
            evidence: sentence.trim(),
          });
        }
      }
    }

    return relations;
  }

  /**
   * Create paper node from research result
   */
  private createPaperNode(result: IResearchResult): IPaperNode {
    const metadata = result.metadata as Record<string, unknown> || {};

    return {
      id: `paper:${result.id}`,
      type: NodeType.PAPER,
      label: result.title,
      properties: {
        title: result.title,
        abstract: result.summary,
        doi: metadata.doi as string | undefined,
        url: result.url,
        publishedAt: result.publishedAt,
        citationCount: (metadata.citationCount as number) || 0,
        source: result.source,
        relevanceScore: result.relevanceScore,
        categories: result.categories,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get or create entity node
   */
  private getOrCreateEntityNode(entity: IExtractedEntity): IGraphNode {
    const id = `${entity.type}:${entity.normalized || entity.text}`;

    let node = this.graph.getNode(id);
    if (node) return node;

    node = {
      id,
      type: entity.type,
      label: entity.normalized || entity.text,
      properties: {
        name: entity.normalized || entity.text,
        frequency: this.conceptCounts.get(id) || 1,
        importance: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.graph.addNode(node);
    return node;
  }

  /**
   * Get or create author node
   */
  private getOrCreateAuthorNode(name: string): IAuthorNode {
    const id = `author:${name.toLowerCase().replace(/\s+/g, '-')}`;

    let node = this.graph.getNode(id) as IAuthorNode | undefined;
    if (node) {
      node.properties.paperCount++;
      return node;
    }

    node = {
      id,
      type: NodeType.AUTHOR,
      label: name,
      properties: {
        name,
        affiliations: [],
        paperCount: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.graph.addNode(node);
    return node;
  }

  /**
   * Get or create category node
   */
  private getOrCreateCategoryNode(category: ResearchCategory): IGraphNode {
    const id = `category:${category}`;

    let node = this.graph.getNode(id);
    if (node) return node;

    node = {
      id,
      type: NodeType.CATEGORY,
      label: category,
      properties: {
        name: category,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.graph.addNode(node);
    return node;
  }

  /**
   * Create edge
   */
  private createEdge(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    weight: number
  ): IGraphEdge {
    const id = `${sourceId}-${type}-${targetId}`;

    return {
      id,
      source: sourceId,
      target: targetId,
      type,
      weight,
      properties: {},
      createdAt: new Date(),
    };
  }

  /**
   * Add similarity edges between papers with shared concepts
   */
  private addSimilarityEdges(): void {
    const papers = this.graph.getNodesByType(NodeType.PAPER);

    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const paper1 = papers[i];
        const paper2 = papers[j];

        // Get shared concepts
        const concepts1 = new Set(
          this.graph.getNeighbors(paper1.id, 'out')
            .filter(n => n.type !== NodeType.CATEGORY && n.type !== NodeType.AUTHOR)
            .map(n => n.id)
        );

        const concepts2 = new Set(
          this.graph.getNeighbors(paper2.id, 'out')
            .filter(n => n.type !== NodeType.CATEGORY && n.type !== NodeType.AUTHOR)
            .map(n => n.id)
        );

        const intersection = new Set(
          Array.from(concepts1).filter(x => concepts2.has(x))
        );

        const union = new Set([...Array.from(concepts1), ...Array.from(concepts2)]);

        const similarity = union.size > 0 ? intersection.size / union.size : 0;

        // Add edge if similarity is high enough
        if (similarity >= 0.3) {
          const similarEdge = this.createEdge(
            paper1.id,
            paper2.id,
            EdgeType.SIMILAR_TO,
            similarity
          );
          this.graph.addEdge(similarEdge);
        }
      }
    }
  }

  /**
   * Update concept importance based on frequency and connections
   */
  private updateConceptImportance(): void {
    const conceptTypes = [
      NodeType.CONCEPT,
      NodeType.THERAPY,
      NodeType.CONDITION,
      NodeType.BIOMARKER,
      NodeType.DRUG,
    ];

    for (const type of conceptTypes) {
      const concepts = this.graph.getNodesByType(type);

      for (const concept of concepts) {
        const degree = this.graph.getDegree(concept.id);
        const frequency = (concept.properties as { frequency: number }).frequency || 1;

        // Importance = log(frequency) * degree
        const importance = Math.log(frequency + 1) * (degree.total + 1);

        this.graph.updateNode(concept.id, {
          properties: {
            ...concept.properties,
            importance,
          },
        });
      }
    }
  }

  /**
   * Get the built graph
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }
}
