-- Engine A Learning System Database Schema
-- Migration 001: Core learning infrastructure

-- Learning Records Table
CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Classification
  domain VARCHAR(50) NOT NULL CHECK (domain IN ('support', 'code', 'automation', 'business')),

  -- Content
  input TEXT NOT NULL,
  context JSONB,
  action TEXT NOT NULL,
  output TEXT NOT NULL,

  -- Quality signals
  accepted BOOLEAN,
  feedback TEXT,
  latency_ms INTEGER,
  cost_cents DECIMAL(10,2),

  -- Learning signals
  tags TEXT[],
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  reusable BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_learning_records_org_id ON learning_records(org_id);
CREATE INDEX idx_learning_records_domain ON learning_records(domain);
CREATE INDEX idx_learning_records_created_at ON learning_records(created_at);
CREATE INDEX idx_learning_records_quality ON learning_records(quality_score);

-- Weekly Consolidations Table
CREATE TABLE weekly_consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  week INTEGER NOT NULL,
  consolidation_date DATE NOT NULL,
  total_records INTEGER,

  -- Stats by domain (stored as JSONB)
  domain_stats JSONB,

  insights TEXT[],
  next_focus TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_weekly_consolidations_org_id ON weekly_consolidations(org_id);
CREATE INDEX idx_weekly_consolidations_week ON weekly_consolidations(week);

-- Training Datasets Table
CREATE TABLE training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  adapter_type VARCHAR(50) NOT NULL CHECK (adapter_type IN
    ('support_triage', 'code_fix', 'workflow_router', 'business_intelligence')),

  version VARCHAR(50) NOT NULL,
  training_records_count INTEGER,
  synthetic_variations_count INTEGER,
  eval_set_size INTEGER,

  training_jsonl_path TEXT,
  eval_set_jsonl_path TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_datasets_org_id ON training_datasets(org_id);
CREATE INDEX idx_training_datasets_adapter ON training_datasets(adapter_type);

-- Adapter Evaluations Table
CREATE TABLE adapter_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  adapter_type VARCHAR(50) NOT NULL,
  dataset_version VARCHAR(50) NOT NULL,

  accuracy DECIMAL(5,2),
  latency_p50 INTEGER,
  latency_p95 INTEGER,
  cost_per_request DECIMAL(10,6),

  test_cases_passed INTEGER,
  test_cases_total INTEGER,

  error_rate DECIMAL(5,2),
  fallback_rate DECIMAL(5,2),

  evaluation_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_adapter_evaluations_adapter ON adapter_evaluations(adapter_type);
CREATE INDEX idx_adapter_evaluations_created_at ON adapter_evaluations(created_at);

-- Production Metrics Table
CREATE TABLE production_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  adapter_type VARCHAR(50) NOT NULL,

  daily_requests INTEGER,
  local_requests INTEGER,
  fallback_requests INTEGER,
  local_rate DECIMAL(5,2),

  accuracy DECIMAL(5,2),
  latency_p50 INTEGER,
  latency_p95 INTEGER,

  cost_per_request DECIMAL(10,6),
  daily_cost DECIMAL(10,2),

  user_satisfaction DECIMAL(3,2),
  error_count INTEGER,

  metric_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_production_metrics_org_id ON production_metrics(org_id);
CREATE INDEX idx_production_metrics_adapter ON production_metrics(adapter_type);
CREATE INDEX idx_production_metrics_date ON production_metrics(metric_date);

-- Request Feedback Table (for user feedback on adapter outputs)
CREATE TABLE request_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  original_request_id UUID REFERENCES learning_records(id),
  adapter_type VARCHAR(50),

  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_text TEXT,
  was_correct BOOLEAN,
  corrections JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_request_feedback_org_id ON request_feedback(org_id);
CREATE INDEX idx_request_feedback_adapter ON request_feedback(adapter_type);

-- Row Level Security
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE adapter_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies (org isolation)
-- Note: Simplified; adapt to your actual auth context
CREATE POLICY learning_records_org_isolation ON learning_records
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY weekly_consolidations_org_isolation ON weekly_consolidations
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY training_datasets_org_isolation ON training_datasets
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY production_metrics_org_isolation ON production_metrics
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY request_feedback_org_isolation ON request_feedback
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Helper functions

-- Calculate weekly stats from records
CREATE FUNCTION calculate_domain_stats(
  p_records JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- This would be implemented with actual aggregation logic
  -- For now, structure is defined
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Framework selection logic (stub)
CREATE FUNCTION select_best_framework(
  p_domain VARCHAR,
  p_problem_type VARCHAR,
  p_available_evidence JSONB
) RETURNS TABLE (
  framework_name VARCHAR,
  matching_confidence NUMERIC,
  required_evidence TEXT[]
) AS $$
BEGIN
  -- Stub: would query frameworks table and apply matching logic
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Monthly retraining candidate selection
CREATE FUNCTION get_retraining_candidates(
  p_adapter_type VARCHAR,
  p_min_quality_score INTEGER DEFAULT 60
) RETURNS SETOF learning_records AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM learning_records
  WHERE domain SIMILAR TO
    CASE p_adapter_type
      WHEN 'support_triage' THEN 'support'
      WHEN 'code_fix' THEN 'code'
      WHEN 'workflow_router' THEN 'automation'
      WHEN 'business_intelligence' THEN 'business'
      ELSE domain
    END
    AND quality_score >= p_min_quality_score
    AND reusable = true
    AND accepted = true
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
