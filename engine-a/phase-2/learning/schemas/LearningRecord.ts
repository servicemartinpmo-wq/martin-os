/**
 * LearningRecord Schema
 * Captures structured learning from app tasks
 * Phase 3-ready format for training adapters
 */

export interface LearningRecord {
  id: string;
  timestamp: Date;

  // Classification
  domain: "support" | "code" | "automation" | "business";

  // What happened
  input: string;                      // User request/problem description
  context: Record<string, any>;       // Org, user, state, metadata
  action: string;                     // What system/human did
  output: string;                     // Result/solution

  // Quality signals
  accepted: boolean;                  // Human approved this result
  feedback?: string;                  // Correction if rejected
  latency_ms: number;                 // How fast (milliseconds)
  cost_cents: number;                 // Cost if Claude used

  // Learning signals
  tags: string[];                     // Pattern tags (error type, category, etc)
  quality_score: number;              // 0-100 manual quality score
  reusable: boolean;                  // Can this train an adapter?

  // Metadata
  notes: string;                      // Your context/observations
  created_at: Date;
}

export interface WeeklyConsolidation {
  week: number;
  date: Date;
  total_records: number;

  by_domain: {
    support: DomainStats;
    code: DomainStats;
    automation: DomainStats;
    business: DomainStats;
  };

  insights: string[];                 // Key learnings this week
  next_focus: string;                 // What to focus on next
  ready_for_training: LearningRecord[];  // Records good enough for adapter training
}

export interface DomainStats {
  count: number;
  avg_quality: number;
  patterns: Array<{
    pattern: string;
    frequency: number;
    avg_quality: number;
  }>;
  improvement_areas: string[];
}

export interface TrainingDataset {
  id: string;
  org_id: string;
  adapter_type: "support_triage" | "code_fix" | "workflow_router" | "business_intelligence";

  training_records_count: number;
  synthetic_variations_count: number;

  created_at: Date;
  version: string;
}

export interface TrainingExample {
  input: string;
  output: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AdapterEvaluation {
  adapter_type: string;
  accuracy: number;              // % correct predictions
  latency_p50: number;           // Median latency (ms)
  latency_p95: number;           // 95th percentile latency (ms)
  cost_per_request: number;      // Dollars per request

  test_cases_passed: number;
  test_cases_total: number;

  error_rate: number;            // % requests that errored
  fallback_rate: number;         // % requests that fell back to Claude

  timestamp: Date;
}

export interface ProductionMetrics {
  adapter_type: string;

  daily_requests: number;
  local_requests: number;        // Handled by adapter
  fallback_requests: number;     // Fell back to Claude
  local_rate: number;            // % handled locally

  accuracy: number;              // Of local requests
  latency_p50: number;
  latency_p95: number;

  cost_per_request: number;
  daily_cost: number;

  user_satisfaction: number;     // 1-5 rating
  error_count: number;

  date: Date;
}

// Database schema types
export interface DatabaseLearningRecord extends LearningRecord {
  org_id: string;
}

export interface DatabaseTrainingDataset extends TrainingDataset {
  training_jsonl: string;        // Path to JSONL file
  eval_set_size: number;
  eval_set: LearningRecord[];
}
