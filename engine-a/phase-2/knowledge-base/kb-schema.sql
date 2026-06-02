/**
 * Knowledge Base System Schema
 * Vector DB with pgvector for semantic search
 * Org-isolated, per-document classification
 */

-- ============================================================================
-- KNOWLEDGE BASE DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Document metadata
  title VARCHAR(500) NOT NULL,
  source VARCHAR(100) NOT NULL,  -- pdf, markdown, slack, github, confluence, custom
  classification VARCHAR(50) NOT NULL,  -- public, internal, sensitive

  -- Content
  content TEXT NOT NULL,
  content_hash VARCHAR(64),  -- For deduplication

  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- active, archived, deleted

  -- Metrics
  chunk_count INT DEFAULT 0,
  retrieval_count INT DEFAULT 0,
  avg_relevance DECIMAL(3,2),

  INDEX idx_org_source (org_id, source),
  INDEX idx_org_status (org_id, status),
  INDEX idx_created (created_at DESC)
);

-- ============================================================================
-- KNOWLEDGE BASE CHUNKS (Embeddings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_sequence INT NOT NULL,  -- Order in document
  chunk_text TEXT NOT NULL,
  chunk_tokens INT NOT NULL,

  -- Embedding (pgvector)
  embedding vector(1536),  -- OpenAI text-embedding-3-small

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- {section, subsection, page, etc.}

  -- Quality
  quality_score INT DEFAULT 0,  -- 0-100

  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_org_document (org_id, document_id),
  INDEX idx_embedding (embedding vector_cosine_ops)
);

-- ============================================================================
-- KNOWLEDGE BASE RETRIEVALS (Learning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_retrievals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Query
  query TEXT NOT NULL,
  query_embedding vector(1536),

  -- Results
  retrieved_chunks UUID[],  -- Chunk IDs
  relevance_scores DECIMAL[],  -- Similarity scores
  top_k INT DEFAULT 5,

  -- Feedback
  user_feedback VARCHAR(50),  -- helpful, not_helpful, partially_helpful
  user_id VARCHAR(255),

  -- Context
  source_domain VARCHAR(100),  -- which system triggered retrieval
  used_in_response BOOLEAN DEFAULT FALSE,

  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  response_time_ms INT,

  INDEX idx_org_created (org_id, created_at),
  INDEX idx_feedback (org_id, user_feedback)
);

-- ============================================================================
-- KNOWLEDGE BASE INGESTION STATUS
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Job metadata
  source_type VARCHAR(100) NOT NULL,  -- pdf, github, confluence, slack, etc.
  source_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
  progress_percent INT DEFAULT 0,

  -- Results
  documents_created INT DEFAULT 0,
  chunks_created INT DEFAULT 0,
  total_tokens INT DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,

  INDEX idx_org_status (org_id, status)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Semantic search in KB
CREATE OR REPLACE FUNCTION search_kb_semantic(
  p_org_id UUID,
  p_query_embedding vector,
  p_top_k INT DEFAULT 5,
  p_min_similarity DECIMAL DEFAULT 0.5
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  title VARCHAR,
  chunk_text TEXT,
  similarity DECIMAL,
  classification VARCHAR,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kd.title,
    kc.chunk_text,
    (1 - (kc.embedding <=> p_query_embedding))::DECIMAL,
    kd.classification,
    kc.metadata
  FROM kb_chunks kc
  JOIN kb_documents kd ON kc.document_id = kd.id
  WHERE kc.org_id = p_org_id
    AND kd.status = 'active'
    AND (1 - (kc.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY kc.embedding <=> p_query_embedding
  LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql;

-- Get KB statistics
CREATE OR REPLACE FUNCTION get_kb_stats(p_org_id UUID) RETURNS TABLE (
  total_documents INT,
  total_chunks INT,
  total_tokens INT,
  avg_retrieval_count DECIMAL,
  most_retrieved_document VARCHAR,
  avg_chunk_quality DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT kd.id)::INT,
    COUNT(DISTINCT kc.id)::INT,
    COALESCE(SUM(kc.chunk_tokens), 0)::INT,
    ROUND(AVG(kd.retrieval_count)::DECIMAL, 2),
    (SELECT kd2.title FROM kb_documents kd2
     WHERE kd2.org_id = p_org_id
     ORDER BY kd2.retrieval_count DESC LIMIT 1)::VARCHAR,
    ROUND(AVG(kc.quality_score)::DECIMAL, 2)
  FROM kb_documents kd
  LEFT JOIN kb_chunks kc ON kd.id = kc.document_id
  WHERE kd.org_id = p_org_id AND kd.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW-LEVEL SECURITY (Org Isolation)
-- ============================================================================

ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_retrievals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Phase 2: Stub policies (actual enforcement via app layer)
-- Phase 3: Add real RLS with auth.uid() → org_id mapping

CREATE POLICY "kb_documents_org_isolation" ON kb_documents
  FOR ALL USING (TRUE);  -- Phase 3: USING (org_id = current_setting('app.org_id'))

CREATE POLICY "kb_chunks_org_isolation" ON kb_chunks
  FOR ALL USING (TRUE);

CREATE POLICY "kb_retrievals_org_isolation" ON kb_retrievals
  FOR ALL USING (TRUE);

CREATE POLICY "kb_ingestion_jobs_org_isolation" ON kb_ingestion_jobs
  FOR ALL USING (TRUE);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_kb_chunks_embedding ON kb_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_kb_retrievals_response_time ON kb_retrievals(org_id, response_time_ms);
CREATE INDEX idx_kb_documents_retrieval_count ON kb_documents(org_id, retrieval_count DESC);
