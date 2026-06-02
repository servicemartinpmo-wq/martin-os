/**
 * Knowledge Base Operations
 * Ingestion, embedding, retrieval, RAG synthesis
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// KNOWLEDGE BASE INTERFACES
// ============================================================================

export interface KBDocument {
  id: string;
  org_id: string;
  title: string;
  source: "pdf" | "markdown" | "slack" | "github" | "confluence" | "custom";
  classification: "public" | "internal" | "sensitive";
  content: string;
  content_hash: string;
  created_at: Date;
  created_by: string;
  status: "active" | "archived" | "deleted";
  chunk_count: number;
  retrieval_count: number;
}

export interface KBChunk {
  id: string;
  org_id: string;
  document_id: string;
  chunk_sequence: number;
  chunk_text: string;
  chunk_tokens: number;
  embedding: number[];  // Vector from OpenAI or local
  metadata: Record<string, any>;
  quality_score: number;
  created_at: Date;
}

export interface KBRetrievalResult {
  chunk_id: string;
  document_id: string;
  title: string;
  chunk_text: string;
  similarity: number;
  classification: string;
  metadata: Record<string, any>;
}

export interface KBSearchQuery {
  org_id: string;
  query: string;
  top_k?: number;
  min_similarity?: number;
  classification_filter?: string[];
}

export interface RAGContext {
  query: string;
  retrieved_chunks: KBRetrievalResult[];
  context_text: string;
  sources: string[];
}

// ============================================================================
// DOCUMENT INGESTION
// ============================================================================

export async function ingestDocument(
  org_id: string,
  title: string,
  source: KBDocument["source"],
  classification: KBDocument["classification"],
  content: string,
  created_by: string
): Promise<{
  document: KBDocument;
  chunks: KBChunk[];
  total_tokens: number;
}> {
  const document_id = uuidv4();
  const content_hash = hashContent(content);

  // Create document record
  const document: KBDocument = {
    id: document_id,
    org_id,
    title,
    source,
    classification,
    content,
    content_hash,
    created_at: new Date(),
    created_by,
    status: "active",
    chunk_count: 0,
    retrieval_count: 0,
  };

  // Chunk the content
  const chunks = chunkContent(content, document_id, org_id);

  // Generate embeddings for each chunk
  const chunksWithEmbeddings = await Promise.all(
    chunks.map(async (chunk) => ({
      ...chunk,
      embedding: await generateEmbedding(chunk.chunk_text),
      quality_score: assessChunkQuality(chunk.chunk_text),
    }))
  );

  // Update document with chunk count
  document.chunk_count = chunksWithEmbeddings.length;

  // In production: save to database
  // await saveDocument(document);
  // await saveChunks(chunksWithEmbeddings);

  const total_tokens = chunksWithEmbeddings.reduce((sum, c) => sum + c.chunk_tokens, 0);

  return {
    document,
    chunks: chunksWithEmbeddings,
    total_tokens,
  };
}

function chunkContent(
  content: string,
  document_id: string,
  org_id: string,
  chunk_size: number = 500,
  overlap: number = 100
): KBChunk[] {
  const chunks: KBChunk[] = [];
  const tokens = content.split(/\s+/);
  let current_chunk = [];
  let chunk_sequence = 0;

  for (let i = 0; i < tokens.length; i++) {
    current_chunk.push(tokens[i]);

    if (current_chunk.length >= chunk_size) {
      const chunk_text = current_chunk.join(" ");
      chunks.push({
        id: uuidv4(),
        org_id,
        document_id,
        chunk_sequence: chunk_sequence++,
        chunk_text,
        chunk_tokens: current_chunk.length,
        embedding: [],  // Will be filled by generateEmbedding
        metadata: { start_token: i - current_chunk.length, end_token: i },
        quality_score: 0,
        created_at: new Date(),
      });

      // Overlap: keep last 'overlap' tokens
      current_chunk = current_chunk.slice(-overlap);
    }
  }

  // Final chunk
  if (current_chunk.length > 0) {
    chunks.push({
      id: uuidv4(),
      org_id,
      document_id,
      chunk_sequence: chunk_sequence++,
      chunk_text: current_chunk.join(" "),
      chunk_tokens: current_chunk.length,
      embedding: [],
      metadata: { final_chunk: true },
      quality_score: 0,
      created_at: new Date(),
    });
  }

  return chunks;
}

function assessChunkQuality(chunk_text: string): number {
  let score = 50;  // Base score

  // Prefer longer, more substantive chunks
  const words = chunk_text.split(/\s+/).length;
  if (words > 200) score += 20;
  else if (words > 100) score += 10;
  else if (words < 20) score -= 20;

  // Penalize chunks that look like metadata/headers
  if (chunk_text.match(/^#+\s|^---+$/gm)) score -= 10;

  // Reward chunks with technical terms
  if (chunk_text.match(/\b(framework|workflow|process|metric|analysis|recommendation)\b/gi)) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

async function generateEmbedding(text: string): Promise<number[]> {
  // In production: call OpenAI text-embedding-3-small
  // const embedding = await openai.embeddings.create({
  //   input: text,
  //   model: "text-embedding-3-small",
  // });
  // return embedding.data[0].embedding;

  // Stub: return random embedding for development
  const embedding: number[] = [];
  for (let i = 0; i < 1536; i++) {
    embedding.push(Math.random() - 0.5);
  }
  return embedding;
}

function hashContent(content: string): string {
  // In production: use crypto.createHash
  // return crypto.createHash("sha256").update(content).digest("hex");
  return content.substring(0, 64);
}

// ============================================================================
// SEMANTIC SEARCH & RETRIEVAL
// ============================================================================

export async function searchKB(query: KBSearchQuery): Promise<KBRetrievalResult[]> {
  // Generate embedding for query
  const query_embedding = await generateEmbedding(query.query);

  // In production: call database function
  // const results = await db.rpc('search_kb_semantic', {
  //   p_org_id: query.org_id,
  //   p_query_embedding: query_embedding,
  //   p_top_k: query.top_k || 5,
  //   p_min_similarity: query.min_similarity || 0.5,
  // });

  // Stub: return mock results
  const mockResults: KBRetrievalResult[] = [
    {
      chunk_id: uuidv4(),
      document_id: uuidv4(),
      title: "Example Document",
      chunk_text:
        "This is relevant content about the query topic. It contains information that helps answer the user's question.",
      similarity: 0.87,
      classification: "internal",
      metadata: { section: "Best Practices" },
    },
  ];

  return mockResults;
}

// ============================================================================
// RAG SYNTHESIS
// ============================================================================

export interface RAGSynthesisRequest {
  org_id: string;
  query: string;
  analyzer_result?: Record<string, any>;  // From Phase 1 analyzer
  top_k?: number;
  include_sources?: boolean;
}

export interface RAGSynthesisResult {
  response: string;
  sources: Array<{ title: string; section: string; similarity: number }>;
  kb_used: boolean;
  kb_confidence: number;
  reasoning: string;
}

export async function synthesizeWithRAG(
  request: RAGSynthesisRequest
): Promise<RAGSynthesisResult> {
  // Step 1: Retrieve relevant KB chunks
  const kb_results = await searchKB({
    org_id: request.org_id,
    query: request.query,
    top_k: request.top_k || 5,
  });

  // Step 2: Determine if KB is relevant to this query
  const kb_relevant = determineKBRelevance(request.query, kb_results);

  if (!kb_relevant) {
    return {
      response:
        "Knowledge base not applicable to this query. Using framework-based analysis.",
      sources: [],
      kb_used: false,
      kb_confidence: 0,
      reasoning: "Query falls outside indexed knowledge base scope.",
    };
  }

  // Step 3: Build context from KB
  const context_text = kb_results.map((r) => `${r.title}: ${r.chunk_text}`).join("\n\n");

  // Step 4: In production, Claude synthesizes with:
  // - KB context
  // - Analyzer result (if available)
  // - Business signals
  // This is where hybrid inference happens

  const response = synthesizeResponse(
    request.query,
    context_text,
    kb_results,
    request.analyzer_result
  );

  const sources = kb_results
    .filter((r) => r.similarity > 0.7)
    .map((r) => ({
      title: r.title,
      section: r.metadata.section || "General",
      similarity: r.similarity,
    }));

  return {
    response,
    sources,
    kb_used: kb_relevant,
    kb_confidence: calculateKBConfidence(kb_results),
    reasoning: `Synthesized from ${kb_results.length} KB chunks with avg similarity ${(
      kb_results.reduce((sum, r) => sum + r.similarity, 0) / kb_results.length
    ).toFixed(2)}`,
  };
}

function determineKBRelevance(query: string, results: KBRetrievalResult[]): boolean {
  if (results.length === 0) return false;

  // Check if top result has reasonable similarity
  const top_similarity = results[0]?.similarity || 0;
  if (top_similarity < 0.6) return false;

  // Check if query is business-focused
  const businessKeywords = [
    "operations",
    "workflow",
    "process",
    "framework",
    "analysis",
    "improvement",
  ];
  const matches = businessKeywords.filter((kw) => query.toLowerCase().includes(kw)).length;

  return matches >= 1 && top_similarity >= 0.65;
}

function calculateKBConfidence(results: KBRetrievalResult[]): number {
  if (results.length === 0) return 0;

  const avg_similarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

  // Confidence increases with both quantity and quality of results
  const quantity_factor = Math.min(results.length / 5, 1.0);  // Max at 5 results
  const quality_factor = avg_similarity;

  return Math.round((quantity_factor * 0.4 + quality_factor * 0.6) * 100) / 100;
}

function synthesizeResponse(
  query: string,
  context_text: string,
  kb_results: KBRetrievalResult[],
  analyzer_result?: Record<string, any>
): string {
  const parts: string[] = [];

  // Build synthesized response
  if (analyzer_result?.frameworks && analyzer_result.frameworks.length > 0) {
    parts.push(
      `Based on framework analysis (${analyzer_result.frameworks
        .slice(0, 2)
        .map((f: any) => f.name)
        .join(", ")}), `
    );
  }

  if (context_text.length > 0) {
    parts.push(
      `and our knowledge base on this topic: ${context_text.substring(0, 200)}...`
    );
  }

  if (analyzer_result?.recommendations) {
    parts.push(`\n\nRecommended approach: ${analyzer_result.recommendations[0] || ""}`);
  }

  parts.push(
    `\n\nSources: ${kb_results.map((r) => r.title).join(", ")}`
  );

  return parts.join(" ");
}

// ============================================================================
// KB STATISTICS
// ============================================================================

export interface KBStats {
  total_documents: number;
  total_chunks: number;
  total_tokens: number;
  avg_retrieval_count: number;
  most_retrieved_document: string;
  avg_chunk_quality: number;
}

export async function getKBStats(org_id: string): Promise<KBStats> {
  // In production: call database function
  // const stats = await db.rpc('get_kb_stats', { p_org_id: org_id });

  // Stub
  return {
    total_documents: 42,
    total_chunks: 1250,
    total_tokens: 450000,
    avg_retrieval_count: 23,
    most_retrieved_document: "Best Practices Guide",
    avg_chunk_quality: 72,
  };
}

// ============================================================================
// KB INGESTION JOB TRACKING
// ============================================================================

export interface IngestionJob {
  id: string;
  org_id: string;
  source_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress_percent: number;
  documents_created: number;
  chunks_created: number;
  total_tokens: number;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
}

export async function createIngestionJob(
  org_id: string,
  source_type: string
): Promise<IngestionJob> {
  const job: IngestionJob = {
    id: uuidv4(),
    org_id,
    source_type,
    status: "pending",
    progress_percent: 0,
    documents_created: 0,
    chunks_created: 0,
    total_tokens: 0,
  };

  // In production: save to database
  // await db.from('kb_ingestion_jobs').insert(job);

  return job;
}
