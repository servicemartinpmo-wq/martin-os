/**
 * Learning Record Schema for Engine A Phase 2
 * Captures work across 4 domains: support, code, automation, business
 */

export type LearningDomain = 'support' | 'code' | 'automation' | 'business';

export interface LearningRecord {
  id: string;
  timestamp: Date;
  domain: LearningDomain;

  // What happened
  input: string;           // User request/problem
  context: Record<string, any>;
  action: string;          // What system/human did
  output: string;          // Result

  // Quality signals
  accepted: boolean;       // Human approved
  feedback?: string;       // Correction if rejected
  latency_ms: number;
  cost_cents: number;

  // Learning signals
  tags: string[];
  quality_score: number;   // 0-100
  reusable: boolean;
  notes: string;

  // Metadata
  source_system?: string;  // Where this record came from
  user_id?: string;
  org_id: string;
}

export interface LearningRecordBatch {
  records: LearningRecord[];
  domain: LearningDomain;
  extracted_at: Date;
  total_count: number;
  quality_score_avg: number;
  reusable_count: number;
}

export interface DomainExtractorConfig {
  domain: LearningDomain;
  look_back_days: number;
  min_quality_score: number;  // e.g., 60
  max_records: number;
  scoring_weights: {
    usefulness: number;
    clarity: number;
    completeness: number;
    technical_depth: number;
  };
}

export const DEFAULT_EXTRACTOR_CONFIG: Record<LearningDomain, DomainExtractorConfig> = {
  support: {
    domain: 'support',
    look_back_days: 365,
    min_quality_score: 60,
    max_records: 250,
    scoring_weights: {
      usefulness: 0.4,
      clarity: 0.2,
      completeness: 0.2,
      technical_depth: 0.2,
    },
  },
  code: {
    domain: 'code',
    look_back_days: 180,
    min_quality_score: 60,
    max_records: 200,
    scoring_weights: {
      usefulness: 0.35,
      clarity: 0.25,
      completeness: 0.2,
      technical_depth: 0.2,
    },
  },
  automation: {
    domain: 'automation',
    look_back_days: 180,
    min_quality_score: 60,
    max_records: 250,
    scoring_weights: {
      usefulness: 0.4,
      clarity: 0.15,
      completeness: 0.15,
      technical_depth: 0.3,
    },
  },
  business: {
    domain: 'business',
    look_back_days: 365,
    min_quality_score: 60,
    max_records: 150,
    scoring_weights: {
      usefulness: 0.45,
      clarity: 0.25,
      completeness: 0.15,
      technical_depth: 0.15,
    },
  },
};
