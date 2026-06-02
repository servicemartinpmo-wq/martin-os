/**
 * Automation Domain Extractor
 * Extracts workflow creation and automation run records
 * Target: 200+ high-quality automation records (score 60+)
 */

import { DomainExtractorConfig, DEFAULT_EXTRACTOR_CONFIG } from '../schemas/learning_record';
import { AutomationLearningRecord } from '../schemas/domain_schemas';

interface AutomationRun {
  workflow_id: string;
  run_id: string;
  timestamp: Date;
  name: string;
  description: string;
  workflow_type: string;
  trigger_type: string;
  integrations: string[];
  actions: string[];
  execution_start: Date;
  execution_end: Date;
  execution_status: 'success' | 'failure' | 'partial';
  success_count: number;
  failure_count: number;
  data_processed: number;
  error_message?: string;
  template_used: boolean;
  templates_similar: string[];
  created_by: string;
}

interface AutomationScoringCriteria {
  usefulness: number;
  clarity: number;
  completeness: number;
  technical_depth: number;
}

export class AutomationExtractor {
  config: DomainExtractorConfig;

  constructor(config?: Partial<DomainExtractorConfig>) {
    this.config = {
      ...DEFAULT_EXTRACTOR_CONFIG.automation,
      ...config,
    };
  }

  /**
   * Extract automation runs from workflow engines (Week 3 implementation)
   */
  async extractRuns(org_id: string): Promise<AutomationLearningRecord[]> {
    // Week 3: Connect to Zapier, Make.com, or internal workflow engine
    const runs = await this.fetchAutomationRuns(org_id);

    // Score each run
    const scoredRuns = runs
      .map(run => ({
        run,
        score: this.scoreRun(run),
      }))
      .filter(({ score }) => score >= this.config.min_quality_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.max_records);

    // Convert to LearningRecords
    return scoredRuns.map(({ run, score }) =>
      this.runToRecord(run, score, org_id),
    );
  }

  /**
   * Mock implementation: Week 3 will add real workflow engine connectors
   */
  private async fetchAutomationRuns(org_id: string): Promise<AutomationRun[]> {
    // Placeholder for Week 3 connector implementation
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.config.look_back_days);

    // In Week 3, this will query: Zapier API, Make API, or internal database
    return [];
  }

  /**
   * Score an automation run on multiple dimensions
   */
  private scoreRun(run: AutomationRun): number {
    const criteria = this.calculateScoringCriteria(run);

    const weights = this.config.scoring_weights;
    return (
      criteria.usefulness * weights.usefulness +
      criteria.clarity * weights.clarity +
      criteria.completeness * weights.completeness +
      criteria.technical_depth * weights.technical_depth
    );
  }

  /**
   * Calculate individual scoring dimensions
   */
  private calculateScoringCriteria(run: AutomationRun): AutomationScoringCriteria {
    return {
      usefulness: this.scoreUsefulness(run),
      clarity: this.scoreClarity(run),
      completeness: this.scoreCompleteness(run),
      technical_depth: this.scoreTechnicalDepth(run),
    };
  }

  /**
   * Usefulness: Is this workflow reusable or a common pattern?
   */
  private scoreUsefulness(run: AutomationRun): number {
    let score = 50;

    // Successful execution is a strong signal
    if (run.execution_status === 'success') score += 25;
    else if (run.execution_status === 'partial') score += 10;
    else score -= 15;

    // Template usage indicates a known pattern
    if (run.template_used) score += 15;

    // Multiple similar templates indicate a reusable pattern
    if (run.templates_similar && run.templates_similar.length > 0) score += 10;

    // Data volume indicates real use
    if (run.data_processed > 100) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Clarity: Is the workflow well-documented?
   */
  private scoreClarity(run: AutomationRun): number {
    let score = 50;

    // Name and description length
    if (run.name && run.name.length > 20) score += 10;
    if (run.description && run.description.length > 100) score += 15;
    else if (!run.description) score -= 10;

    // Workflow type clarity
    if (run.workflow_type && run.workflow_type.length > 0) score += 10;

    // Integration count indicates clarity (too many might be confusing)
    const integration_count = run.integrations?.length || 0;
    if (integration_count > 0 && integration_count <= 5) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Completeness: Do we have all workflow details?
   */
  private scoreCompleteness(run: AutomationRun): number {
    let score = 50;

    // Have execution times
    if (run.execution_start && run.execution_end) score += 15;

    // Have integrations
    if (run.integrations && run.integrations.length > 0) score += 10;

    // Have actions
    if (run.actions && run.actions.length > 0) score += 10;

    // Have status and counts
    if (run.success_count >= 0 && run.failure_count >= 0) score += 10;

    // Have description
    if (run.description && run.description.length > 50) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Technical Depth: How complex is the automation?
   */
  private scoreTechnicalDepth(run: AutomationRun): number {
    let score = 40;

    // Integration count indicates complexity
    const integration_count = run.integrations?.length || 0;
    if (integration_count > 5) score += 30;
    else if (integration_count > 2) score += 15;
    else if (integration_count > 0) score += 8;

    // Action count indicates complexity
    const action_count = run.actions?.length || 0;
    if (action_count > 10) score += 20;
    else if (action_count > 5) score += 10;

    // Data volume processed
    if (run.data_processed > 1000) score += 10;

    // Workflow type
    const complex_types = ['multi_step', 'conditional', 'scheduled', 'webhook', 'batch'];
    if (complex_types.includes(run.workflow_type?.toLowerCase() || '')) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Convert an automation run to a LearningRecord
   */
  private runToRecord(run: AutomationRun, quality_score: number, org_id: string): AutomationLearningRecord {
    const execution_time_seconds = Math.round((run.execution_end.getTime() - run.execution_start.getTime()) / 1000);
    const success_rate = run.success_count + run.failure_count > 0
      ? run.success_count / (run.success_count + run.failure_count)
      : 1;

    return {
      id: `automation-${run.run_id}`,
      timestamp: run.execution_end,
      domain: 'automation',
      org_id,

      input: run.name,
      context: {
        workflow_type: run.workflow_type,
        trigger_type: run.trigger_type,
        integrations: run.integrations,
      },
      action: `Executed workflow: ${run.name}`,
      output: `Processed ${run.data_processed} items, success: ${run.success_count}, failures: ${run.failure_count}`,

      accepted: run.execution_status === 'success',
      latency_ms: execution_time_seconds * 1000,
      cost_cents: 0, // Will be calculated from integration usage

      tags: [
        run.workflow_type,
        run.trigger_type,
        ...run.integrations.slice(0, 3),
      ],
      quality_score,
      reusable: quality_score >= 70,
      notes: `Automation run: ${run.name} (${run.workflow_type})`,

      source_system: 'automation_engine',

      automation_specific: {
        workflow_type: run.workflow_type,
        integration_count: run.integrations?.length || 0,
        trigger_type: run.trigger_type,
        action_count: run.actions?.length || 0,
        execution_success_rate: success_rate,
        execution_time_seconds,
        reusability_score: quality_score * 0.8,
        template_match: run.template_used,
        success_signal:
          run.execution_status === 'success' ? 'automated' :
          run.execution_status === 'partial' ? 'manual_review' :
          'failed',
      },
    };
  }
}
