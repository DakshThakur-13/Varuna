/**
 * GraphRAG Types for Varuna
 * Hybrid Search: Keyword + Semantic + Graph Traversal
 * 
 * This enables relationship-aware retrieval:
 * "Bus Crash" → "Mass Casualty" → "Trauma Center" → "Dr. Smith (Trauma Surgeon)"
 */

// Node types in the medical knowledge graph
export type NodeType = 
  | 'emergency_type'      // Building fire, Car crash, etc.
  | 'protocol'            // Emergency response protocols
  | 'resource'            // Equipment, supplies, beds
  | 'staff'               // Doctors, nurses, specialists
  | 'department'          // ER, ICU, Trauma Center
  | 'procedure'           // Medical procedures
  | 'condition'           // Medical conditions
  | 'medication'          // Drugs and treatments
  | 'symptom'             // Patient symptoms
  | 'equipment'           // Medical equipment
  | 'supply';             // Medical supplies (exact match critical)

// Relationship types between nodes
export type RelationType =
  | 'REQUIRES'            // Protocol REQUIRES Resource
  | 'ACTIVATES'           // Emergency ACTIVATES Protocol
  | 'TREATS'              // Procedure TREATS Condition
  | 'INDICATES'           // Symptom INDICATES Condition
  | 'SPECIALIZES_IN'      // Staff SPECIALIZES_IN Procedure
  | 'LOCATED_IN'          // Resource LOCATED_IN Department
  | 'PART_OF'             // SubProtocol PART_OF Protocol
  | 'CONTRAINDICATED'     // Medication CONTRAINDICATED Condition
  | 'ALTERNATIVE_TO'      // Resource ALTERNATIVE_TO Resource
  | 'ESCALATES_TO'        // Protocol ESCALATES_TO Protocol
  | 'USES'                // Procedure USES Equipment
  | 'ALERTS'              // Emergency ALERTS Staff
  | 'SUPPLIES';           // Department SUPPLIES Resource

// A node in the knowledge graph
export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  // For exact keyword matching (e.g., "O-Negative Blood", "Burn Kit")
  keywords: string[];
  // Semantic embedding for similarity search
  embedding?: number[];
  // Node-specific properties
  properties: Record<string, unknown>;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  // Importance score for ranking
  importance: number;
  // Is this a critical/exact-match item?
  exactMatchRequired: boolean;
}

// An edge/relationship in the knowledge graph
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  // Relationship strength (0-1)
  weight: number;
  // Contextual properties
  properties: Record<string, unknown>;
  // Is this relationship bidirectional?
  bidirectional: boolean;
}

// The complete knowledge graph
export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  // Adjacency list for fast traversal
  adjacencyList: Map<string, string[]>;
  // Reverse adjacency for incoming edges
  reverseAdjacencyList: Map<string, string[]>;
}

// Search query types
export interface HybridSearchQuery {
  text: string;
  // Force exact match for critical terms (supplies, medications)
  exactMatchTerms?: string[];
  // Context for semantic search
  context?: string;
  // Node types to include
  nodeTypes?: NodeType[];
  // Max hops for graph traversal
  maxHops?: number;
  // Minimum relevance score (0-1)
  minRelevance?: number;
  // Maximum results
  limit?: number;
}

// Individual search result with explanation
export interface SearchResult {
  node: GraphNode;
  // Combined relevance score
  score: number;
  // How was this found?
  matchType: 'exact' | 'semantic' | 'graph' | 'hybrid';
  // Explanation of why this result is relevant
  explanation: string;
  // Path from query to this node (for graph matches)
  graphPath?: GraphNode[];
  // Relationship context
  relationships?: {
    edge: GraphEdge;
    relatedNode: GraphNode;
  }[];
}

// Aggregated search response
export interface HybridSearchResponse {
  query: HybridSearchQuery;
  results: SearchResult[];
  // Discovered entity relationships
  entityGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  // Search statistics
  stats: {
    exactMatches: number;
    semanticMatches: number;
    graphMatches: number;
    totalTime: number;
  };
}

// RAG Context for AI prompts
export interface RAGContext {
  // Retrieved knowledge
  knowledge: SearchResult[];
  // Formatted context string for prompts
  contextString: string;
  // Entity relationships discovered
  relationships: string[];
  // Confidence in context relevance
  confidence: number;
}

// Emergency scenario with graph relationships
export interface GraphEmergencyScenario {
  emergencyType: string;
  // Direct protocol activations
  protocols: string[];
  // Required resources (exact match)
  requiredResources: string[];
  // Alerted staff roles
  alertedStaff: string[];
  // Department activations
  departments: string[];
  // Related conditions to expect
  expectedConditions: string[];
  // Full relationship graph for this scenario
  relationshipGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

// Embedding configuration
export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  provider: 'local' | 'openai' | 'huggingface';
}

// Graph traversal options
export interface TraversalOptions {
  startNodeId: string;
  relationTypes?: RelationType[];
  maxDepth: number;
  direction: 'outgoing' | 'incoming' | 'both';
  // Stop condition
  stopAt?: (node: GraphNode, depth: number) => boolean;
}

// Traversal result
export interface TraversalResult {
  visitedNodes: GraphNode[];
  paths: GraphNode[][];
  edges: GraphEdge[];
}
