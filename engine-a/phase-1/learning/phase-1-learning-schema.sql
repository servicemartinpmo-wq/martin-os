/**
 * Phase 1 Learning System Schema
 * Capture 100+ learning records per month from Engine A usage
 * Foundation for Phase 2 monthly consolidation and retraining
 */

-- ============================================================================
-- LEARNING RECORDS TABLE (Core)
-- ============================================================================

CREATE TABLE IF NOT EXISTS phase1_learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  org_id VARCHAR(255) NOT NULL,
  source_app VARCHAR(100) NOT NULL,  -- engine-a-analyzer, workflow-execution, etc.
  source_type VARCHAR(100) NOT NULL, -- analyzer_request, workflow_run, etc.

  -- Input/Output
  input TEXT NOT NULL,
  action_taken VARCHAR(200) NOT NULL,
  output JSONB NOT NULL,

  -- Engine A Assets Used
  engine_a_asset_candidates JSONB NOT NULL,  -- {framework?, workflow?}

  -- Scoring
  scores JSONB NOT NULL,  -- {confidence, risk, business_impact}

  -- Reusability Signal
  reusable_pattern BOOLEAN DEFAULT FALSE,
  accepted BOOLEAN DEFAULT NULL,  -- User feedback
  quality_score INT DEFAULT 0,    -- 0-100

  -- Audit Trail
  audit_context JSONB,

  INDEX idx_org_created (org_id, created_at),
  INDEX idx_framework (engine_a_asset_candidates->>'framework'),
  INDEX idx_workflow (engine_a_asset_candidates->>'workflow'),
  INDEX idx_reusable (reusable_pattern, accepted)
);

-- ============================================================================
-- WEEKLY CONSOLIDATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS phase1_weekly_consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  org_id VARCHAR(255) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Statistics
  total_records INT NOT NULL,
  business_focused_records INT NOT NULL,

  -- Framework Analytics
  framework_stats JSONB NOT NULL,  -- [{framework, usage_count, avg_confidence, success_rate, top_patterns}]

  -- Workflow Analytics
  workflow_stats JSONB NOT NULL,   -- [{workflow, executions, avg_execution_time, success_rate}]

  -- Domain Analysis
  domain_distribution JSONB NOT NULL,  -- {operations, technical, support, business}

  -- Insights
  insights TEXT[],  -- ["Framework X most used with 95% success", ...]

  INDEX idx_org_week (org_id, week_start)
);

-- ============================================================================
-- MONTHLY CONSOLIDATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS phase1_monthly_consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  org_id VARCHAR(255) NOT NULL,
  month DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Aggregates
  total_records INT NOT NULL,
  avg_confidence NUMERIC(3,2) NOT NULL,
  success_rate NUMERIC(3,2) NOT NULL,

  -- Top Performers
  top_frameworks JSONB NOT NULL,  -- [{framework, usage_count, success_rate}]
  top_workflows JSONB NOT NULL,   -- [{workflow, executions, success_rate}]

  -- Trends
  trends JSONB NOT NULL,  -- {confidence_trend, success_trend, volume_trend}

  -- Training Signal
  high_quality_records INT NOT NULL,  -- Records with score >= 60
  retraining_candidates INT NOT NULL, -- Patterns ready for training

  -- Insights
  monthly_insights TEXT[],  -- Key learnings from month

  INDEX idx_org_month (org_id, month)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get high-quality learning records for training
CREATE OR REPLACE FUNCTION get_training_candidates(
  p_org_id VARCHAR(255),
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  id UUID,
  framework VARCHAR,
  workflow VARCHAR,
  input TEXT,
  output JSONB,
  quality_score INT,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id,
    (lr.engine_a_asset_candidates->>'framework')::VARCHAR,
    (lr.engine_a_asset_candidates->>'workflow')::VARCHAR,
    lr.input,
    lr.output,
    lr.quality_score,
    (lr.scores->>'confidence')::NUMERIC
  FROM phase1_learning_records lr
  WHERE lr.org_id = p_org_id
    AND lr.created_at >= p_start_date::TIMESTAMP
    AND lr.created_at < (p_end_date + INTERVAL '1 day')::TIMESTAMP
    AND lr.quality_score >= 60
    AND lr.accepted = TRUE
    AND lr.reusable_pattern = TRUE
  ORDER BY lr.quality_score DESC, lr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate framework statistics for a period
CREATE OR REPLACE FUNCTION calculate_framework_stats(
  p_org_id VARCHAR(255),
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  framework VARCHAR,
  usage_count INT,
  avg_confidence NUMERIC,
  success_rate NUMERIC,
  avg_execution_time INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (lr.engine_a_asset_candidates->>'framework')::VARCHAR,
    COUNT(*)::INT,
    ROUND(AVG((lr.scores->>'confidence')::NUMERIC), 2),
    ROUND(SUM(CASE WHEN lr.accepted THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 2),
    ROUND(AVG((lr.output->'execution_time_ms')::INT))::INT
  FROM phase1_learning_records lr
  WHERE lr.org_id = p_org_id
    AND lr.created_at >= p_start_date::TIMESTAMP
    AND lr.created_at < (p_end_date + INTERVAL '1 day')::TIMESTAMP
    AND lr.engine_a_asset_candidates->>'framework' IS NOT NULL
  GROUP BY (lr.engine_a_asset_candidates->>'framework')
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate workflow statistics for a period
CREATE OR REPLACE FUNCTION calculate_workflow_stats(
  p_org_id VARCHAR(255),
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  workflow VARCHAR,
  execution_count INT,
  avg_execution_time INT,
  success_rate NUMERIC,
  avg_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (lr.engine_a_asset_candidates->>'workflow')::VARCHAR,
    COUNT(*)::INT,
    ROUND(AVG((lr.output->'execution_time_ms')::INT))::INT,
    ROUND(SUM(CASE WHEN lr.accepted THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 2),
    ROUND(AVG((lr.scores->>'confidence')::NUMERIC), 2)
  FROM phase1_learning_records lr
  WHERE lr.org_id = p_org_id
    AND lr.created_at >= p_start_date::TIMESTAMP
    AND lr.created_at < (p_end_date + INTERVAL '1 day')::TIMESTAMP
    AND lr.engine_a_asset_candidates->>'workflow' IS NOT NULL
  GROUP BY (lr.engine_a_asset_candidates->>'workflow')
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW-LEVEL SECURITY (Phase 1: org isolation)
-- ============================================================================

ALTER TABLE phase1_learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase1_weekly_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase1_monthly_consolidations ENABLE ROW LEVEL SECURITY;

-- Phase 1 stub: in Phase 3, add actual RLS policies with auth.uid()
-- For now, policies are permissive to allow development
CREATE POLICY "learning_records_org_isolation" ON phase1_learning_records
  FOR ALL USING (TRUE);  -- Phase 3: USING (org_id = current_setting('app.org_id'))

CREATE POLICY "weekly_consolidations_org_isolation" ON phase1_weekly_consolidations
  FOR ALL USING (TRUE);

CREATE POLICY "monthly_consolidations_org_isolation" ON phase1_monthly_consolidations
  FOR ALL USING (TRUE);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_learning_records_quality ON phase1_learning_records(quality_score DESC) WHERE reusable_pattern = TRUE;
CREATE INDEX idx_learning_records_accepted ON phase1_learning_records(accepted) WHERE accepted = TRUE;
CREATE INDEX idx_learning_records_org_source ON phase1_learning_records(org_id, source_app);
