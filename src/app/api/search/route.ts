/**
 * Hybrid Search API Endpoint
 * 
 * POST /api/search
 * 
 * Provides GraphRAG-powered search for the Varuna system.
 * Combines keyword, semantic, and graph traversal search.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  hybridSearch,
  getRAGContext,
  findExactSupply,
  getEmergencyResources,
  getHybridSearchEngine,
} from '@/lib/hybridSearch';
import { HybridSearchQuery, NodeType } from '@/types/graphrag';

// Types for API requests
interface SearchRequest {
  query: string;
  mode?: 'hybrid' | 'exact' | 'emergency' | 'rag';
  exactMatchTerms?: string[];
  nodeTypes?: NodeType[];
  maxHops?: number;
  minRelevance?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    switch (body.mode) {
      case 'exact': {
        // Exact match for supplies/medications
        const result = findExactSupply(body.query);
        return NextResponse.json({
          success: true,
          mode: 'exact',
          result,
          executionTime: Date.now() - startTime,
        });
      }

      case 'emergency': {
        // Full emergency scenario search
        const resources = getEmergencyResources(body.query);
        return NextResponse.json({
          success: true,
          mode: 'emergency',
          emergencyType: body.query,
          resources: {
            protocols: resources.protocols.map(r => ({
              name: r.node.name,
              score: r.score,
              properties: r.node.properties,
            })),
            supplies: resources.supplies.map(r => ({
              name: r.node.name,
              score: r.score,
              exactMatch: r.node.exactMatchRequired,
              properties: r.node.properties,
            })),
            equipment: resources.equipment.map(r => ({
              name: r.node.name,
              score: r.score,
              properties: r.node.properties,
            })),
            staff: resources.staff.map(r => ({
              name: r.node.name,
              score: r.score,
              properties: r.node.properties,
            })),
            departments: resources.departments.map(r => ({
              name: r.node.name,
              score: r.score,
              properties: r.node.properties,
            })),
            conditions: resources.conditions.map(r => ({
              name: r.node.name,
              score: r.score,
              properties: r.node.properties,
            })),
          },
          executionTime: Date.now() - startTime,
        });
      }

      case 'rag': {
        // Get RAG context for AI prompts
        const context = getRAGContext(body.query);
        return NextResponse.json({
          success: true,
          mode: 'rag',
          context: {
            contextString: context.contextString,
            relationships: context.relationships,
            confidence: context.confidence,
            knowledgeCount: context.knowledge.length,
          },
          executionTime: Date.now() - startTime,
        });
      }

      case 'hybrid':
      default: {
        // Full hybrid search
        const searchQuery: HybridSearchQuery = {
          text: body.query,
          exactMatchTerms: body.exactMatchTerms,
          nodeTypes: body.nodeTypes,
          maxHops: body.maxHops || 2,
          minRelevance: body.minRelevance || 0.2,
          limit: body.limit || 20,
        };

        const response = hybridSearch(body.query, searchQuery);

        return NextResponse.json({
          success: true,
          mode: 'hybrid',
          results: response.results.map(r => ({
            id: r.node.id,
            name: r.node.name,
            type: r.node.type,
            score: r.score,
            matchType: r.matchType,
            explanation: r.explanation,
            exactMatchRequired: r.node.exactMatchRequired,
            properties: r.node.properties,
            graphPath: r.graphPath?.map(n => n.name),
          })),
          entityGraph: {
            nodeCount: response.entityGraph.nodes.length,
            edgeCount: response.entityGraph.edges.length,
            nodes: response.entityGraph.nodes.map(n => ({
              id: n.id,
              name: n.name,
              type: n.type,
            })),
            edges: response.entityGraph.edges.map(e => ({
              source: e.sourceId,
              target: e.targetId,
              type: e.type,
              weight: e.weight,
            })),
          },
          stats: response.stats,
          executionTime: Date.now() - startTime,
        });
      }
    }
  } catch (error) {
    console.error('Hybrid Search API Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick searches and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') || 'stats';

    if (mode === 'stats') {
      const engine = getHybridSearchEngine();
      const stats = engine.getStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Quick hybrid search
    const response = hybridSearch(query, {
      limit: 10,
      minRelevance: 0.3,
    });

    return NextResponse.json({
      success: true,
      query,
      results: response.results.map(r => ({
        name: r.node.name,
        type: r.node.type,
        score: r.score,
        matchType: r.matchType,
      })),
      stats: response.stats,
    });
  } catch (error) {
    console.error('Hybrid Search GET Error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
