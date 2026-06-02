/**
 * Business Domain Extractor
 * Extracts business decisions, priorities, and strategic actions
 * Target: 150+ high-quality business records (score 60+)
 */

import { DomainExtractorConfig, DEFAULT_EXTRACTOR_CONFIG } from '../schemas/learning_record';
import { BusinessLearningRecord } from '../schemas/domain_schemas';

interface BusinessDecision {
  decision_id: string;
  timestamp: Date;
  title: string;
  description: string;
  decision_type: 'strategy' | 'priority' | 'resource' | 'process' | 'metric';
  affected_teams: string[];
  impact_scope: 'individual' | 'team' | 'department' | 'organization';
  business_impact: string;
  confidence_before: number;
  confidence_after: number;
  implementation_timeline: string;
  decision_status: 'approved' | 'executed' | 'rejected' | 'deferred';
  maker: string;
  stakeholders: string[];
  data_sources: string[];
  outcomes?: string;
  follow_up_decisions: string[];
}

interface BusinessScoringCriteria {
  usefulness: number;
  clarity: number;
  completeness: number;
  technical_depth: number;
}

export class BusinessExtractor {
  config: DomainExtractorConfig;

  constructor(config?: Partial<DomainExtractorConfig>) {
    this.config = {
      ...DEFAULT_EXTRACTOR_CONFIG.business,
      ...config,
    };
  }

  /**
   * Extract business decisions from decision logs, project docs, and notes (Week 4 implementation)
   */
  async extractDecisions(org_id: string): Promise<BusinessLearningRecord[]> {
    // Week 4: Connect to Notion, Confluence, or internal decision log
    const decisions = await this.fetchBusinessDecisions(org_id);

    // Score each decision
    const scoredDecisions = decisions
      .map(decision => ({
        decision,
        score: this.scoreDecision(decision),
      }))
      .filter(({ score }) => score >= this.config.min_quality_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.max_records);

    // Convert to LearningRecords
    return scoredDecisions.map(({ decision, score }) =>
      this.decisionToRecord(decision, score, org_id),
    );
  }

  /**
   * Mock implementation: Week 4 will add real business system connectors
   */
  private async fetchBusinessDecisions(org_id: string): Promise<BusinessDecision[]> {
    // Placeholder for Week 4 connector implementation
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.config.look_back_days);

    // In Week 4, this will query: Notion API, Confluence API, or internal database
    return [];
  }

  /**
   * Score a business decision on multiple dimensions
   */
  private scoreDecision(decision: BusinessDecision): number {
    const criteria = this.calculateScoringCriteria(decision);

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
  private calculateScoringCriteria(decision: BusinessDecision): BusinessScoringCriteria {
    return {
      usefulness: this.scoreUsefulness(decision),
      clarity: this.scoreClarity(decision),
      completeness: this.scoreCompleteness(decision),
      technical_depth: this.scoreTechnicalDepth(decision),
    };
  }

  /**
   * Usefulness: Is this a decision pattern others might encounter?
   */
  private scoreUsefulness(decision: BusinessDecision): number {
    let score = 50;

    // Executed decisions are most useful
    if (decision.decision_status === 'executed') score += 25;
    else if (decision.decision_status === 'approved') score += 15;
    else if (decision.decision_status === 'rejected') score += 5;
    else score -= 10;

    // Organization-wide impact is more useful
    if (decision.impact_scope === 'organization') score += 20;
    else if (decision.impact_scope === 'department') score += 10;

    // Multiple stakeholders indicate important decision
    if (decision.stakeholders && decision.stakeholders.length > 2) score += 10;

    // Confidence gain indicates good decision
    const confidence_gain = decision.confidence_after - decision.confidence_before;
    if (confidence_gain > 20) score += 15;
    else if (confidence_gain < -10) score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Clarity: Is the decision well-documented?
   */
  private scoreClarity(decision: BusinessDecision): number {
    let score = 50;

    // Title length
    if (decision.title && decision.title.length > 20) score += 10;

    // Description length indicates detail
    const descriptionLength = decision.description?.length || 0;
    if (descriptionLength > 500) score += 20;
    else if (descriptionLength > 200) score += 10;
    else score -= 10;

    // Business impact articulation
    if (decision.business_impact && decision.business_impact.length > 50) score += 10;

    // Data sources indicate evidence-based
    if (decision.data_sources && decision.data_sources.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Completeness: Do we have all decision context?
   */
  private scoreCompleteness(decision: BusinessDecision): number {
    let score = 50;

    // Have affected teams
    if (decision.affected_teams && decision.affected_teams.length > 0) score += 10;

    // Have stakeholders
    if (decision.stakeholders && decision.stakeholders.length > 0) score += 10;

    // Have confidence scores
    if (decision.confidence_before >= 0 && decision.confidence_after >= 0) score += 10;

    // Have timeline
    if (decision.implementation_timeline && decision.implementation_timeline.length > 0) score += 10;

    // Have outcomes (if decision is executed)
    if (decision.decision_status === 'executed' && decision.outcomes && decision.outcomes.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Technical Depth: How sophisticated is the analysis?
   */
  private scoreTechnicalDepth(decision: BusinessDecision): number {
    let score = 40;

    // Decision type sophistication
    const sophisticatedTypes = ['strategy', 'process'];
    if (sophisticatedTypes.includes(decision.decision_type)) score += 20;

    // Data sources indicate research depth
    if (decision.data_sources && decision.data_sources.length > 2) score += 20;
    else if (decision.data_sources && decision.data_sources.length > 0) score += 10;

    // Multiple stakeholders indicate complexity
    const stakeholder_count = decision.stakeholders?.length || 0;
    if (stakeholder_count > 5) score += 15;
    else if (stakeholder_count > 2) score += 8;

    // Follow-up decisions indicate ripple effects (complex)
    if (decision.follow_up_decisions && decision.follow_up_decisions.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Convert a business decision to a LearningRecord
   */
  private decisionToRecord(decision: BusinessDecision, quality_score: number, org_id: string): BusinessLearningRecord {
    return {
      id: `business-${decision.decision_id}`,
      timestamp: decision.timestamp,
      domain: 'business',
      org_id,

      input: decision.title,
      context: {
        decision_type: decision.decision_type,
        data_sources: decision.data_sources,
        stakeholders: decision.stakeholders,
      },
      action: `Made business decision: ${decision.decision_type}`,
      output: decision.business_impact,

      accepted: decision.decision_status === 'approved' || decision.decision_status === 'executed',
      latency_ms: 0, // Business decisions don't have direct latency
      cost_cents: 0,

      tags: [
        decision.decision_type,
        decision.impact_scope,
        ...decision.affected_teams.slice(0, 2),
      ],
      quality_score,
      reusable: quality_score >= 70,
      notes: `Business decision: ${decision.title} (${decision.decision_type})`,

      source_system: 'business_operations',

      business_specific: {
        decision_type: decision.decision_type,
        affected_teams: decision.affected_teams,
        impact_scope: decision.impact_scope,
        estimated_impact: decision.business_impact,
        confidence_before: decision.confidence_before,
        confidence_after: decision.confidence_after,
        implementation_timeline: decision.implementation_timeline,
        success_signal:
          decision.decision_status === 'approved' ? 'approved' :
          decision.decision_status === 'executed' ? 'executed' :
          decision.decision_status === 'rejected' ? 'rejected' :
          'deferred',
      },
    };
  }
}
