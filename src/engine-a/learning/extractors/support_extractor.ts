/**
 * Support Domain Extractor
 * Extracts and scores support cases from help desk systems
 * Target: 200+ high-quality cases (score 60+)
 */

import { LearningRecord, DomainExtractorConfig, DEFAULT_EXTRACTOR_CONFIG } from '../schemas/learning_record';
import { SupportLearningRecord } from '../schemas/domain_schemas';

interface SupportCase {
  ticket_id: string;
  created_at: Date;
  resolved_at?: Date;
  summary: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  customer_type: string;
  resolution: string;
  resolution_quality: 'resolved' | 'escalated' | 'timeout';
  customer_satisfaction?: number;
  tags: string[];
}

interface ScoringCriteria {
  usefulness: number;      // 0-100: How generalizable is this?
  clarity: number;         // 0-100: How well-documented?
  completeness: number;    // 0-100: Do we have full input/output?
  technical_depth: number; // 0-100: How technical?
}

export class SupportExtractor {
  config: DomainExtractorConfig;

  constructor(config?: Partial<DomainExtractorConfig>) {
    this.config = {
      ...DEFAULT_EXTRACTOR_CONFIG.support,
      ...config,
    };
  }

  /**
   * Extract cases from a mock support desk (Week 2 implementation will connect to real systems)
   */
  async extractCases(org_id: string): Promise<SupportLearningRecord[]> {
    // Week 2: Connect to Zendesk, Freshdesk, or Intercom
    const cases = await this.fetchSupportCases(org_id);

    // Score each case
    const scoredCases = cases
      .map(supportCase => ({
        case: supportCase,
        score: this.scoreCase(supportCase),
      }))
      .filter(({ score }) => score >= this.config.min_quality_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.max_records);

    // Convert to LearningRecords
    return scoredCases.map(({ case: supportCase, score }) =>
      this.caseToRecord(supportCase, score, org_id),
    );
  }

  /**
   * Mock implementation: Week 2 will add real connectors
   */
  private async fetchSupportCases(org_id: string): Promise<SupportCase[]> {
    // Placeholder for Week 2 connector implementation
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.config.look_back_days);

    // In Week 2, this will query: Zendesk, Freshdesk, Intercom, or custom database
    return [];
  }

  /**
   * Score a support case on multiple dimensions
   */
  private scoreCase(supportCase: SupportCase): number {
    const criteria = this.calculateScoringCriteria(supportCase);

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
  private calculateScoringCriteria(supportCase: SupportCase): ScoringCriteria {
    return {
      usefulness: this.scoreUsefulness(supportCase),
      clarity: this.scoreClarity(supportCase),
      completeness: this.scoreCompleteness(supportCase),
      technical_depth: this.scoreTechnicalDepth(supportCase),
    };
  }

  /**
   * Usefulness: Is this a pattern others might encounter?
   */
  private scoreUsefulness(supportCase: SupportCase): number {
    let score = 50;

    // Higher priority issues are more useful
    if (supportCase.priority === 'critical') score += 20;
    else if (supportCase.priority === 'high') score += 10;

    // Successful resolutions more useful than escalations
    if (supportCase.resolution_quality === 'resolved') score += 20;
    else if (supportCase.resolution_quality === 'escalated') score -= 10;

    // Customer satisfaction signal
    if (supportCase.customer_satisfaction && supportCase.customer_satisfaction >= 4) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Clarity: Is the problem well-documented?
   */
  private scoreClarity(supportCase: SupportCase): number {
    let score = 50;

    // Length of description indicates detail
    const descriptionLength = (supportCase.description || '').length;
    if (descriptionLength > 500) score += 25;
    else if (descriptionLength > 200) score += 15;
    else score -= 20;

    // Clear categorization
    if (supportCase.category && supportCase.category.length > 0) score += 10;

    // Good tags indicate clarity
    if (supportCase.tags && supportCase.tags.length >= 2) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Completeness: Do we have input and output?
   */
  private scoreCompleteness(supportCase: SupportCase): number {
    let score = 50;

    // Have summary
    if (supportCase.summary && supportCase.summary.length > 20) score += 15;

    // Have description
    if (supportCase.description && supportCase.description.length > 100) score += 15;

    // Have resolution
    if (supportCase.resolution && supportCase.resolution.length > 50) score += 20;

    // Have timestamps
    if (supportCase.resolved_at) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Technical Depth: Does this require specialized knowledge?
   */
  private scoreTechnicalDepth(supportCase: SupportCase): number {
    let score = 40;

    const technicalKeywords = [
      'api',
      'database',
      'integration',
      'error',
      'bug',
      'debug',
      'code',
      'deployment',
      'performance',
      'security',
    ];

    const text = `${supportCase.summary} ${supportCase.description} ${supportCase.resolution}`.toLowerCase();
    const keywordCount = technicalKeywords.filter(kw => text.includes(kw)).length;

    score += Math.min(40, keywordCount * 5);

    // Category signals technical depth
    const technicalCategories = ['integration', 'api', 'database', 'architecture', 'performance'];
    if (technicalCategories.includes(supportCase.category?.toLowerCase() || '')) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Convert a support case to a LearningRecord
   */
  private caseToRecord(supportCase: SupportCase, quality_score: number, org_id: string): SupportLearningRecord {
    const resolved_at = supportCase.resolved_at || new Date();
    const created_at = supportCase.created_at;

    return {
      id: `support-${supportCase.ticket_id}`,
      timestamp: resolved_at,
      domain: 'support',
      org_id,

      input: supportCase.summary,
      context: {
        category: supportCase.category,
        priority: supportCase.priority,
        customer_type: supportCase.customer_type,
      },
      action: `Handled support case: ${supportCase.category}`,
      output: supportCase.resolution,

      accepted: supportCase.resolution_quality === 'resolved',
      latency_ms: Math.max(0, resolved_at.getTime() - created_at.getTime()),
      cost_cents: 0, // Will be calculated from LLM usage in real implementation

      tags: supportCase.tags,
      quality_score,
      reusable: quality_score >= 70,
      notes: `Support case ${supportCase.ticket_id}: ${supportCase.category}`,

      source_system: 'support_desk',

      support_specific: {
        ticket_id: supportCase.ticket_id,
        category: supportCase.category,
        priority: supportCase.priority,
        customer_type: supportCase.customer_type,
        resolution_time_minutes: Math.round(supportCase.resolved_at ? (supportCase.resolved_at.getTime() - supportCase.created_at.getTime()) / (1000 * 60) : 0),
        similar_cases_count: 0, // Will be calculated in consolidation
        success_signal: supportCase.resolution_quality === 'resolved' ? 'resolution' : supportCase.resolution_quality === 'escalated' ? 'escalation' : 'timeout',
      },
    };
  }
}
