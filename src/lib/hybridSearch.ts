/**
 * Hybrid Search Engine for Varuna
 * 
 * Combines three search strategies:
 * 1. KEYWORD SEARCH - Exact match for critical items (supplies, medications)
 * 2. SEMANTIC SEARCH - Vector similarity for conceptual queries
 * 3. GRAPH TRAVERSAL - Relationship-aware retrieval
 * 
 * Example: "Bus crash with multiple casualties"
 * → Keyword: matches "Mass Vehicle Accident"
 * → Semantic: finds related trauma concepts
 * → Graph: Bus Crash → Trauma Protocol → Trauma Surgeon → Trauma Center
 */

import {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  HybridSearchQuery,
  SearchResult,
  HybridSearchResponse,
  RAGContext,
  TraversalOptions,
  TraversalResult,
  RelationType,
  NodeType,
} from '@/types/graphrag';
import { getMedicalKnowledgeGraph } from './knowledgeGraph';

// ============================================
// HYBRID SEARCH ENGINE
// ============================================
export class HybridSearchEngine {
  private graph: KnowledgeGraph;
  private keywordIndex: Map<string, Set<string>>; // keyword → node IDs
  private exactMatchCache: Map<string, GraphNode>;

  constructor() {
    this.graph = getMedicalKnowledgeGraph();
    this.keywordIndex = new Map();
    this.exactMatchCache = new Map();
    this.buildKeywordIndex();
  }

  /**
   * Build inverted index for fast keyword lookup
   */
  private buildKeywordIndex(): void {
    this.graph.nodes.forEach((node, nodeId) => {
      // Index all keywords
      node.keywords.forEach(keyword => {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!this.keywordIndex.has(normalizedKeyword)) {
          this.keywordIndex.set(normalizedKeyword, new Set());
        }
        this.keywordIndex.get(normalizedKeyword)!.add(nodeId);
      });

      // Cache exact match nodes
      if (node.exactMatchRequired) {
        this.exactMatchCache.set(node.name.toLowerCase(), node);
      }
    });
  }

  /**
   * KEYWORD SEARCH
   * Fast exact and partial matching for critical items
   */
  private keywordSearch(query: string, exactTerms?: string[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const matchedNodeIds = new Set<string>();

    // First check exact match terms (e.g., "O-Negative Blood")
    if (exactTerms) {
      exactTerms.forEach(term => {
        const normalizedTerm = term.toLowerCase();
        const exactNode = this.exactMatchCache.get(normalizedTerm);
        if (exactNode) {
          matchedNodeIds.add(exactNode.id);
          results.push({
            node: exactNode,
            score: 1.0,
            matchType: 'exact',
            explanation: `Exact match for critical item: "${term}"`,
          });
        }
      });
    }

    // Search by individual keywords
    queryTerms.forEach(term => {
      if (term.length < 2) return;

      // Direct keyword match
      const directMatches = this.keywordIndex.get(term);
      if (directMatches) {
        directMatches.forEach(nodeId => {
          if (!matchedNodeIds.has(nodeId)) {
            const node = this.graph.nodes.get(nodeId);
            if (node) {
              matchedNodeIds.add(nodeId);
              const isExactMatch = node.exactMatchRequired;
              results.push({
                node,
                score: isExactMatch ? 0.95 : 0.8,
                matchType: isExactMatch ? 'exact' : 'semantic',
                explanation: `Keyword match: "${term}" in ${node.type}`,
              });
            }
          }
        });
      }

      // Partial match for longer queries
      this.keywordIndex.forEach((nodeIds, keyword) => {
        if (keyword.includes(term) && keyword !== term) {
          nodeIds.forEach(nodeId => {
            if (!matchedNodeIds.has(nodeId)) {
              const node = this.graph.nodes.get(nodeId);
              if (node) {
                matchedNodeIds.add(nodeId);
                results.push({
                  node,
                  score: 0.6,
                  matchType: 'semantic',
                  explanation: `Partial keyword match: "${term}" in "${keyword}"`,
                });
              }
            }
          });
        }
      });
    });

    return results;
  }

  /**
   * SEMANTIC SEARCH
   * Uses cosine similarity on embeddings (simulated for now)
   * In production, integrate with actual embedding service
   */
  private semanticSearch(query: string, nodeTypes?: NodeType[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Semantic keywords mapping for medical context
    const semanticMappings: Record<string, string[]> = {
      'crash': ['accident', 'collision', 'trauma', 'injury', 'vehicle'],
      'fire': ['burn', 'smoke', 'flames', 'thermal'],
      'blood': ['hemorrhage', 'bleeding', 'transfusion', 'plasma'],
      'breathing': ['respiratory', 'airway', 'ventilation', 'oxygen'],
      'heart': ['cardiac', 'cardiovascular', 'defibrillator'],
      'surgery': ['surgical', 'operating', 'procedure', 'operation'],
      'injury': ['trauma', 'wound', 'damage', 'hurt'],
      'emergency': ['critical', 'urgent', 'immediate', 'acute'],
      'doctor': ['physician', 'surgeon', 'specialist', 'clinician'],
      'pain': ['analgesic', 'morphine', 'fentanyl', 'sedation'],
    };

    // Expand query with semantic synonyms
    const expandedTerms = new Set<string>();
    queryLower.split(/\s+/).forEach(term => {
      expandedTerms.add(term);
      Object.entries(semanticMappings).forEach(([key, synonyms]) => {
        if (term.includes(key) || key.includes(term)) {
          synonyms.forEach(syn => expandedTerms.add(syn));
        }
        synonyms.forEach(syn => {
          if (term.includes(syn) || syn.includes(term)) {
            expandedTerms.add(key);
          }
        });
      });
    });

    // Search nodes with expanded terms
    const matchedNodeIds = new Set<string>();
    this.graph.nodes.forEach((node, nodeId) => {
      // Filter by node types if specified
      if (nodeTypes && !nodeTypes.includes(node.type)) return;

      let score = 0;
      const matchedKeywords: string[] = [];

      node.keywords.forEach(keyword => {
        expandedTerms.forEach(term => {
          if (keyword.includes(term)) {
            score += 0.3;
            matchedKeywords.push(term);
          }
        });
      });

      // Normalize score
      score = Math.min(score, 0.75);

      if (score > 0 && !matchedNodeIds.has(nodeId)) {
        matchedNodeIds.add(nodeId);
        results.push({
          node,
          score,
          matchType: 'semantic',
          explanation: `Semantic match via: ${[...new Set(matchedKeywords)].join(', ')}`,
        });
      }
    });

    return results;
  }

  /**
   * GRAPH TRAVERSAL
   * Find related nodes by traversing relationships
   */
  private graphTraversal(startNodeIds: string[], maxHops: number = 2): SearchResult[] {
    const results: SearchResult[] = [];
    const visited = new Set<string>(startNodeIds);
    const pathMap = new Map<string, GraphNode[]>();

    // BFS traversal
    let currentLevel = [...startNodeIds];
    let depth = 0;

    while (currentLevel.length > 0 && depth < maxHops) {
      const nextLevel: string[] = [];
      depth++;

      currentLevel.forEach(nodeId => {
        const neighbors = this.graph.adjacencyList.get(nodeId) || [];
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextLevel.push(neighborId);

            const node = this.graph.nodes.get(neighborId);
            if (node) {
              // Build path
              const parentPath = pathMap.get(nodeId) || [];
              const parentNode = this.graph.nodes.get(nodeId);
              pathMap.set(neighborId, [...parentPath, parentNode!]);

              // Score decreases with depth
              const score = 0.7 - (depth * 0.15);

              results.push({
                node,
                score: Math.max(score, 0.2),
                matchType: 'graph',
                explanation: `${depth}-hop relationship from initial matches`,
                graphPath: [...(pathMap.get(neighborId) || []), node],
              });
            }
          }
        });
      });

      currentLevel = nextLevel;
    }

    return results;
  }

  /**
   * Get edge between two nodes
   */
  private getEdgeBetween(sourceId: string, targetId: string): GraphEdge | undefined {
    return this.graph.edges.find(
      e => (e.sourceId === sourceId && e.targetId === targetId) ||
           (e.bidirectional && e.sourceId === targetId && e.targetId === sourceId)
    );
  }

  /**
   * Get relationships for a node
   */
  private getNodeRelationships(nodeId: string): { edge: GraphEdge; relatedNode: GraphNode }[] {
    const relationships: { edge: GraphEdge; relatedNode: GraphNode }[] = [];

    this.graph.edges.forEach(edge => {
      if (edge.sourceId === nodeId) {
        const relatedNode = this.graph.nodes.get(edge.targetId);
        if (relatedNode) {
          relationships.push({ edge, relatedNode });
        }
      }
      if (edge.targetId === nodeId || edge.bidirectional) {
        const relatedNode = this.graph.nodes.get(edge.sourceId);
        if (relatedNode && edge.targetId === nodeId) {
          relationships.push({ edge, relatedNode });
        }
      }
    });

    return relationships;
  }

  /**
   * MAIN HYBRID SEARCH
   * Combines all three search strategies
   */
  public search(query: HybridSearchQuery): HybridSearchResponse {
    const startTime = Date.now();
    const allResults: Map<string, SearchResult> = new Map();

    // 1. KEYWORD SEARCH (highest priority for exact matches)
    const keywordResults = this.keywordSearch(query.text, query.exactMatchTerms);
    keywordResults.forEach(result => {
      allResults.set(result.node.id, result);
    });

    // 2. SEMANTIC SEARCH
    const semanticResults = this.semanticSearch(query.text, query.nodeTypes);
    semanticResults.forEach(result => {
      const existing = allResults.get(result.node.id);
      if (!existing || existing.score < result.score) {
        allResults.set(result.node.id, result);
      }
    });

    // 3. GRAPH TRAVERSAL (from matched nodes)
    const initialNodeIds = [...allResults.keys()];
    if (initialNodeIds.length > 0) {
      const graphResults = this.graphTraversal(
        initialNodeIds.slice(0, 5), // Start from top 5 matches
        query.maxHops || 2
      );
      graphResults.forEach(result => {
        const existing = allResults.get(result.node.id);
        if (!existing) {
          // Add relationships
          result.relationships = this.getNodeRelationships(result.node.id);
          allResults.set(result.node.id, result);
        } else if (result.graphPath) {
          // Enhance existing result with graph path
          existing.graphPath = result.graphPath;
          existing.matchType = 'hybrid';
          existing.score = Math.min(existing.score + 0.1, 1.0);
        }
      });
    }

    // Convert to array and sort by score
    let results = [...allResults.values()];

    // Apply minimum relevance filter
    if (query.minRelevance) {
      results = results.filter(r => r.score >= query.minRelevance!);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Build entity graph from results
    const entityNodes = results.map(r => r.node);
    const entityNodeIds = new Set(entityNodes.map(n => n.id));
    const entityEdges = this.graph.edges.filter(
      e => entityNodeIds.has(e.sourceId) && entityNodeIds.has(e.targetId)
    );

    // Calculate statistics
    const stats = {
      exactMatches: results.filter(r => r.matchType === 'exact').length,
      semanticMatches: results.filter(r => r.matchType === 'semantic').length,
      graphMatches: results.filter(r => r.matchType === 'graph').length,
      totalTime: Date.now() - startTime,
    };

    return {
      query,
      results,
      entityGraph: {
        nodes: entityNodes,
        edges: entityEdges,
      },
      stats,
    };
  }

  /**
   * Search for emergency scenario and get full relationship graph
   */
  public searchEmergencyScenario(emergencyType: string): HybridSearchResponse {
    return this.search({
      text: emergencyType,
      nodeTypes: ['emergency_type', 'protocol', 'staff', 'department', 'supply', 'equipment'],
      maxHops: 3,
      minRelevance: 0.2,
      limit: 50,
    });
  }

  /**
   * Find exact supply by name (no hallucination)
   */
  public findExactSupply(supplyName: string): SearchResult | null {
    const normalizedName = supplyName.toLowerCase().trim();
    const node = this.exactMatchCache.get(normalizedName);
    
    if (node) {
      return {
        node,
        score: 1.0,
        matchType: 'exact',
        explanation: `Exact supply match: "${node.name}"`,
        relationships: this.getNodeRelationships(node.id),
      };
    }

    // Try keyword search as fallback
    const results = this.keywordSearch(supplyName);
    const supplyResults = results.filter(r => 
      r.node.type === 'supply' || r.node.type === 'medication'
    );

    return supplyResults.length > 0 ? supplyResults[0] : null;
  }

  /**
   * Get resources required for a protocol
   */
  public getProtocolResources(protocolName: string): {
    supplies: GraphNode[];
    equipment: GraphNode[];
    staff: GraphNode[];
    departments: GraphNode[];
  } {
    const result = {
      supplies: [] as GraphNode[],
      equipment: [] as GraphNode[],
      staff: [] as GraphNode[],
      departments: [] as GraphNode[],
    };

    // Find protocol node
    let protocolNode: GraphNode | undefined;
    this.graph.nodes.forEach(node => {
      if (node.type === 'protocol' && 
          node.name.toLowerCase().includes(protocolName.toLowerCase())) {
        protocolNode = node;
      }
    });

    if (!protocolNode) return result;

    // Get all connected nodes
    const neighbors = this.graph.adjacencyList.get(protocolNode.id) || [];
    neighbors.forEach(neighborId => {
      const node = this.graph.nodes.get(neighborId);
      if (node) {
        switch (node.type) {
          case 'supply':
            result.supplies.push(node);
            break;
          case 'equipment':
            result.equipment.push(node);
            break;
          case 'staff':
            result.staff.push(node);
            break;
          case 'department':
            result.departments.push(node);
            break;
        }
      }
    });

    return result;
  }

  /**
   * Generate RAG context for AI prompts
   */
  public generateRAGContext(query: string, maxTokens: number = 2000): RAGContext {
    const searchResponse = this.search({
      text: query,
      maxHops: 2,
      minRelevance: 0.3,
      limit: 20,
    });

    // Build context string
    const contextParts: string[] = [];
    const relationships: string[] = [];
    let estimatedTokens = 0;

    // Add matched nodes
    for (const result of searchResponse.results) {
      if (estimatedTokens > maxTokens) break;

      const nodeContext = `[${result.node.type.toUpperCase()}] ${result.node.name}`;
      const props = Object.entries(result.node.properties)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      
      const entry = props ? `${nodeContext} (${props})` : nodeContext;
      contextParts.push(entry);
      estimatedTokens += entry.length / 4;

      // Add relationships
      if (result.relationships) {
        result.relationships.slice(0, 3).forEach(({ edge, relatedNode }) => {
          const rel = `${result.node.name} ${edge.type} ${relatedNode.name}`;
          if (!relationships.includes(rel)) {
            relationships.push(rel);
          }
        });
      }
    }

    // Build final context string
    const contextString = `
## Medical Knowledge Context

### Relevant Entities:
${contextParts.map(p => `- ${p}`).join('\n')}

### Key Relationships:
${relationships.map(r => `- ${r}`).join('\n')}

### Important Notes:
- For supplies and medications, use EXACT names as listed above
- Do not substitute or hallucinate supply names
- Follow protocol requirements strictly
`.trim();

    return {
      knowledge: searchResponse.results,
      contextString,
      relationships,
      confidence: searchResponse.results.length > 0 
        ? searchResponse.results[0].score 
        : 0,
    };
  }

  /**
   * Traverse graph with custom options
   */
  public traverse(options: TraversalOptions): TraversalResult {
    const visitedNodes: GraphNode[] = [];
    const paths: GraphNode[][] = [];
    const edges: GraphEdge[] = [];
    const visited = new Set<string>();

    const startNode = this.graph.nodes.get(options.startNodeId);
    if (!startNode) {
      return { visitedNodes, paths, edges };
    }

    // BFS with path tracking
    const queue: { nodeId: string; path: GraphNode[]; depth: number }[] = [
      { nodeId: options.startNodeId, path: [startNode], depth: 0 }
    ];
    visited.add(options.startNodeId);
    visitedNodes.push(startNode);

    while (queue.length > 0) {
      const { nodeId, path, depth } = queue.shift()!;
      
      if (depth >= options.maxDepth) continue;

      // Get neighbors based on direction
      let neighborIds: string[] = [];
      if (options.direction === 'outgoing' || options.direction === 'both') {
        neighborIds.push(...(this.graph.adjacencyList.get(nodeId) || []));
      }
      if (options.direction === 'incoming' || options.direction === 'both') {
        neighborIds.push(...(this.graph.reverseAdjacencyList.get(nodeId) || []));
      }

      for (const neighborId of neighborIds) {
        if (visited.has(neighborId)) continue;

        const neighborNode = this.graph.nodes.get(neighborId);
        if (!neighborNode) continue;

        // Check relation type filter
        if (options.relationTypes) {
          const edge = this.getEdgeBetween(nodeId, neighborId);
          if (!edge || !options.relationTypes.includes(edge.type)) continue;
        }

        // Check stop condition
        if (options.stopAt && options.stopAt(neighborNode, depth + 1)) {
          paths.push([...path, neighborNode]);
          continue;
        }

        visited.add(neighborId);
        visitedNodes.push(neighborNode);
        
        const newPath = [...path, neighborNode];
        paths.push(newPath);
        queue.push({ nodeId: neighborId, path: newPath, depth: depth + 1 });

        // Collect edges
        const edge = this.getEdgeBetween(nodeId, neighborId);
        if (edge) edges.push(edge);
      }
    }

    return { visitedNodes, paths, edges };
  }

  /**
   * Get all nodes of a specific type
   */
  public getNodesByType(type: NodeType): GraphNode[] {
    const nodes: GraphNode[] = [];
    this.graph.nodes.forEach(node => {
      if (node.type === type) nodes.push(node);
    });
    return nodes;
  }

  /**
   * Get node by ID
   */
  public getNode(id: string): GraphNode | undefined {
    return this.graph.nodes.get(id);
  }

  /**
   * Get graph statistics
   */
  public getStats(): {
    totalNodes: number;
    totalEdges: number;
    exactMatchNodes: number;
    nodesByType: Record<string, number>;
  } {
    let exactMatchNodes = 0;
    const nodesByType: Record<string, number> = {};

    this.graph.nodes.forEach(node => {
      if (node.exactMatchRequired) exactMatchNodes++;
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });

    return {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.length,
      exactMatchNodes,
      nodesByType,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================
let searchEngineInstance: HybridSearchEngine | null = null;

export function getHybridSearchEngine(): HybridSearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new HybridSearchEngine();
  }
  return searchEngineInstance;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick search function
 */
export function hybridSearch(query: string, options?: Partial<HybridSearchQuery>): HybridSearchResponse {
  const engine = getHybridSearchEngine();
  return engine.search({
    text: query,
    ...options,
  });
}

/**
 * Get RAG context for a query
 */
export function getRAGContext(query: string): RAGContext {
  const engine = getHybridSearchEngine();
  return engine.generateRAGContext(query);
}

/**
 * Find exact supply (prevents hallucination)
 */
export function findExactSupply(name: string): SearchResult | null {
  const engine = getHybridSearchEngine();
  return engine.findExactSupply(name);
}

/**
 * Get all resources for an emergency type
 */
export function getEmergencyResources(emergencyType: string) {
  const engine = getHybridSearchEngine();
  const response = engine.searchEmergencyScenario(emergencyType);
  
  return {
    protocols: response.results.filter(r => r.node.type === 'protocol'),
    supplies: response.results.filter(r => r.node.type === 'supply'),
    equipment: response.results.filter(r => r.node.type === 'equipment'),
    staff: response.results.filter(r => r.node.type === 'staff'),
    departments: response.results.filter(r => r.node.type === 'department'),
    conditions: response.results.filter(r => r.node.type === 'condition'),
  };
}
