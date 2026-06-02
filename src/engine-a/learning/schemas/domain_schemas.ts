/**
 * Domain-specific schemas extending LearningRecord
 */

import { LearningRecord } from './learning_record';

// Support domain: Help desk cases, tickets, resolutions
export interface SupportLearningRecord extends LearningRecord {
  domain: 'support';
  support_specific: {
    ticket_id: string;
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    customer_type: string;
    resolution_time_minutes: number;
    similar_cases_count: number;
    success_signal: 'resolution' | 'escalation' | 'timeout';
  };
}

// Code domain: Debugging, refactoring, feature implementation
export interface CodeLearningRecord extends LearningRecord {
  domain: 'code';
  code_specific: {
    problem_type: 'bug' | 'feature' | 'refactor' | 'optimization' | 'architecture';
    language: string;
    file_count: number;
    lines_changed: number;
    test_coverage_before: number;
    test_coverage_after: number;
    complexity_score: number;
    related_issues: string[];
    success_signal: 'tests_pass' | 'deployed' | 'merged' | 'rejected';
  };
}

// Automation domain: Workflow creation, integration, execution
export interface AutomationLearningRecord extends LearningRecord {
  domain: 'automation';
  automation_specific: {
    workflow_type: string;
    integration_count: number;
    trigger_type: string;
    action_count: number;
    execution_success_rate: number;
    execution_time_seconds: number;
    reusability_score: number;
    template_match: boolean;
    success_signal: 'automated' | 'manual_review' | 'failed' | 'scheduled';
  };
}

// Business domain: Decisions, priorities, strategy, operations
export interface BusinessLearningRecord extends LearningRecord {
  domain: 'business';
  business_specific: {
    decision_type: 'strategy' | 'priority' | 'resource' | 'process' | 'metric';
    affected_teams: string[];
    impact_scope: 'individual' | 'team' | 'department' | 'organization';
    estimated_impact: string;
    confidence_before: number;
    confidence_after: number;
    implementation_timeline: string;
    success_signal: 'approved' | 'executed' | 'rejected' | 'deferred';
  };
}

// Union type for any domain-specific record
export type DomainSpecificRecord =
  | SupportLearningRecord
  | CodeLearningRecord
  | AutomationLearningRecord
  | BusinessLearningRecord;

// Statistics collected per domain
export interface DomainStatistics {
  domain: string;
  record_count: number;
  avg_quality_score: number;
  reusable_count: number;
  success_rate: number;
  avg_latency_ms: number;
  total_cost_cents: number;
  top_patterns: string[];
  quality_distribution: {
    high: number;    // 80-100
    medium: number;  // 60-79
    low: number;     // <60
  };
}
