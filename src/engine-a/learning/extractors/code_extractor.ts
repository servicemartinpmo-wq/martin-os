/**
 * Code Domain Extractor
 * Extracts code sessions, fixes, and refactoring from version control
 * Target: 150+ high-quality code sessions (score 60+)
 */

import { DomainExtractorConfig, DEFAULT_EXTRACTOR_CONFIG } from '../schemas/learning_record';
import { CodeLearningRecord } from '../schemas/domain_schemas';

interface CodeSession {
  commit_sha: string;
  timestamp: Date;
  message: string;
  description: string;
  author: string;
  problem_type: 'bug' | 'feature' | 'refactor' | 'optimization' | 'architecture';
  language: string;
  files_changed: string[];
  lines_added: number;
  lines_deleted: number;
  test_coverage_before: number;
  test_coverage_after: number;
  complexity_score: number;
  related_issues: string[];
  ci_status: 'passed' | 'failed' | 'skipped';
}

interface CodeScoringCriteria {
  usefulness: number;
  clarity: number;
  completeness: number;
  technical_depth: number;
}

export class CodeExtractor {
  config: DomainExtractorConfig;

  constructor(config?: Partial<DomainExtractorConfig>) {
    this.config = {
      ...DEFAULT_EXTRACTOR_CONFIG.code,
      ...config,
    };
  }

  /**
   * Extract code sessions from version control (Week 3 implementation)
   */
  async extractSessions(org_id: string): Promise<CodeLearningRecord[]> {
    // Week 3: Connect to GitHub, GitLab, or Bitbucket
    const sessions = await this.fetchCodeSessions(org_id);

    // Score each session
    const scoredSessions = sessions
      .map(session => ({
        session,
        score: this.scoreSession(session),
      }))
      .filter(({ score }) => score >= this.config.min_quality_score)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.max_records);

    // Convert to LearningRecords
    return scoredSessions.map(({ session, score }) =>
      this.sessionToRecord(session, score, org_id),
    );
  }

  /**
   * Mock implementation: Week 3 will add real Git connectors
   */
  private async fetchCodeSessions(org_id: string): Promise<CodeSession[]> {
    // Placeholder for Week 3 connector implementation
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.config.look_back_days);

    // In Week 3, this will query: GitHub API, GitLab API, or git log locally
    return [];
  }

  /**
   * Score a code session on multiple dimensions
   */
  private scoreSession(session: CodeSession): number {
    const criteria = this.calculateScoringCriteria(session);

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
  private calculateScoringCriteria(session: CodeSession): CodeScoringCriteria {
    return {
      usefulness: this.scoreUsefulness(session),
      clarity: this.scoreClarity(session),
      completeness: this.scoreCompleteness(session),
      technical_depth: this.scoreTechnicalDepth(session),
    };
  }

  /**
   * Usefulness: Is this a pattern others might encounter?
   */
  private scoreUsefulness(session: CodeSession): number {
    let score = 50;

    // Bug fixes are most useful
    if (session.problem_type === 'bug') score += 25;
    else if (session.problem_type === 'refactor') score += 15;
    else if (session.problem_type === 'feature') score += 10;

    // Successful CI is signal of quality
    if (session.ci_status === 'passed') score += 20;
    else if (session.ci_status === 'failed') score -= 15;

    // Test coverage improvement
    const coverage_gain = session.test_coverage_after - session.test_coverage_before;
    if (coverage_gain > 5) score += 15;
    else if (coverage_gain < 0) score -= 10;

    // Related issues indicate it solves a known problem
    if (session.related_issues && session.related_issues.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Clarity: Is the change well-documented?
   */
  private scoreClarity(session: CodeSession): number {
    let score = 50;

    // Commit message length
    const messageLength = session.message.length;
    if (messageLength > 50) score += 15;
    if (session.description && session.description.length > 200) score += 15;
    else if (!session.description) score -= 10;

    // Changes in multiple files can indicate refactoring clarity
    const file_count = session.files_changed?.length || 0;
    if (file_count > 0 && file_count <= 5) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Completeness: Do we have all change details?
   */
  private scoreCompleteness(session: CodeSession): number {
    let score = 50;

    // Have message
    if (session.message && session.message.length > 20) score += 10;

    // Have description
    if (session.description && session.description.length > 100) score += 15;

    // Have test coverage data
    if (session.test_coverage_before >= 0 && session.test_coverage_after >= 0) score += 15;

    // Have files changed
    if (session.files_changed && session.files_changed.length > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Technical Depth: How complex is the change?
   */
  private scoreTechnicalDepth(session: CodeSession): number {
    let score = 40;

    // Complexity score directly indicates depth
    if (session.complexity_score > 7) score += 35;
    else if (session.complexity_score > 4) score += 20;
    else if (session.complexity_score > 0) score += 10;

    // Multiple files changed indicates complexity
    const file_count = session.files_changed?.length || 0;
    if (file_count > 5) score += 15;
    else if (file_count > 2) score += 10;

    // Large changes indicate depth
    const total_changes = session.lines_added + session.lines_deleted;
    if (total_changes > 500) score += 10;
    else if (total_changes > 100) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Convert a code session to a LearningRecord
   */
  private sessionToRecord(session: CodeSession, quality_score: number, org_id: string): CodeLearningRecord {
    return {
      id: `code-${session.commit_sha.substring(0, 7)}`,
      timestamp: session.timestamp,
      domain: 'code',
      org_id,

      input: session.message,
      context: {
        problem_type: session.problem_type,
        language: session.language,
        related_issues: session.related_issues,
      },
      action: `Fixed/implemented: ${session.message}`,
      output: `${session.lines_added} lines added, ${session.lines_deleted} lines deleted`,

      accepted: session.ci_status === 'passed',
      latency_ms: 0, // Code changes don't have direct latency
      cost_cents: 0, // Will be calculated from LLM usage if applicable

      tags: [
        session.problem_type,
        session.language,
        ...session.related_issues.slice(0, 3),
      ],
      quality_score,
      reusable: quality_score >= 70,
      notes: `Code change: ${session.commit_sha.substring(0, 7)} (${session.problem_type})`,

      source_system: 'version_control',

      code_specific: {
        problem_type: session.problem_type,
        language: session.language,
        file_count: session.files_changed?.length || 0,
        lines_changed: session.lines_added + session.lines_deleted,
        test_coverage_before: session.test_coverage_before,
        test_coverage_after: session.test_coverage_after,
        complexity_score: session.complexity_score,
        related_issues: session.related_issues,
        success_signal: session.ci_status === 'passed' ? 'tests_pass' : session.ci_status === 'failed' ? 'rejected' : 'deployed',
      },
    };
  }
}
