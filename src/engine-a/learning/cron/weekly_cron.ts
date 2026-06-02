/**
 * Weekly Learning Consolidation Cron Job
 * Scheduled to run every Sunday at 10:00 AM
 * Implements Week 1-4 consolidation cycle
 */

import { SupportExtractor } from '../extractors/support_extractor';
import { CodeExtractor } from '../extractors/code_extractor';
import { AutomationExtractor } from '../extractors/automation_extractor';
import { BusinessExtractor } from '../extractors/business_extractor';
import { WeeklyConsolidator } from '../consolidators/weekly_consolidator';
import { LocalJsonStore } from '../stores/local_json_store';
import { LearningRecord } from '../schemas/learning_record';

export interface CronConfig {
  org_id: string;
  store_path: string;
  enable_claude_review_week_4?: boolean;
}

export class WeeklyConsolidationCron {
  config: CronConfig;
  store: LocalJsonStore;
  extractors: {
    support: SupportExtractor;
    code: CodeExtractor;
    automation: AutomationExtractor;
    business: BusinessExtractor;
  };
  consolidator: WeeklyConsolidator;

  constructor(config: CronConfig) {
    this.config = config;
    this.store = new LocalJsonStore({
      base_path: config.store_path,
      org_id: config.org_id,
      create_backups: true,
    });

    this.extractors = {
      support: new SupportExtractor(),
      code: new CodeExtractor(),
      automation: new AutomationExtractor(),
      business: new BusinessExtractor(),
    };

    this.consolidator = new WeeklyConsolidator();
  }

  /**
   * Main cron job execution
   * Called every Sunday at 10:00 AM
   */
  async run(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Starting weekly consolidation...`);

    try {
      // Initialize store if needed
      await this.store.initialize();

      // Step 1: Extract records from all domains
      console.log('Extracting records from all domains...');
      const [supportRecords, codeRecords, automationRecords, businessRecords] = await Promise.all([
        this.extractors.support.extractCases(this.config.org_id),
        this.extractors.code.extractSessions(this.config.org_id),
        this.extractors.automation.extractRuns(this.config.org_id),
        this.extractors.business.extractDecisions(this.config.org_id),
      ]);

      // Save batches
      await Promise.all([
        this.store.saveBatch({
          records: supportRecords,
          domain: 'support',
          extracted_at: new Date(),
          total_count: supportRecords.length,
          quality_score_avg: supportRecords.length > 0
            ? supportRecords.reduce((sum, r) => sum + r.quality_score, 0) / supportRecords.length
            : 0,
          reusable_count: supportRecords.filter(r => r.reusable).length,
        }),
        this.store.saveBatch({
          records: codeRecords,
          domain: 'code',
          extracted_at: new Date(),
          total_count: codeRecords.length,
          quality_score_avg: codeRecords.length > 0
            ? codeRecords.reduce((sum, r) => sum + r.quality_score, 0) / codeRecords.length
            : 0,
          reusable_count: codeRecords.filter(r => r.reusable).length,
        }),
        this.store.saveBatch({
          records: automationRecords,
          domain: 'automation',
          extracted_at: new Date(),
          total_count: automationRecords.length,
          quality_score_avg: automationRecords.length > 0
            ? automationRecords.reduce((sum, r) => sum + r.quality_score, 0) / automationRecords.length
            : 0,
          reusable_count: automationRecords.filter(r => r.reusable).length,
        }),
        this.store.saveBatch({
          records: businessRecords,
          domain: 'business',
          extracted_at: new Date(),
          total_count: businessRecords.length,
          quality_score_avg: businessRecords.length > 0
            ? businessRecords.reduce((sum, r) => sum + r.quality_score, 0) / businessRecords.length
            : 0,
          reusable_count: businessRecords.filter(r => r.reusable).length,
        }),
      ]);

      console.log(
        `Extracted records: support=${supportRecords.length}, code=${codeRecords.length}, automation=${automationRecords.length}, business=${businessRecords.length}`
      );

      // Step 2: Consolidate weekly data
      console.log('Running consolidation analysis...');
      const allRecords = [
        ...supportRecords,
        ...codeRecords,
        ...automationRecords,
        ...businessRecords,
      ];

      const consolidationResult = await this.consolidator.consolidateWeek(allRecords, this.config.org_id);

      // Save consolidation result
      await this.store.saveConsolidationResult(consolidationResult);

      console.log(`Consolidation complete: ${consolidationResult.total_records} records, week ${consolidationResult.week_number}`);
      console.log(`Alerts: ${consolidationResult.alerts.length}, Patterns: ${consolidationResult.patterns_identified.length}`);

      // Step 3: Generate human-readable report
      const report = this.generateReport(consolidationResult);
      console.log('\n' + report);

      // Step 4: Week 4 special: Claude review (if enabled)
      if (this.isWeek4() && this.config.enable_claude_review_week_4) {
        console.log('\n[WEEK 4] Running Claude review of consolidation...');
        const claudeReview = await this.getClaudeReview(consolidationResult);
        console.log(claudeReview);
      }
    } catch (error) {
      console.error('Error in weekly consolidation cron:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable report
   */
  private generateReport(consolidationResult: any): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push(`WEEKLY CONSOLIDATION REPORT - Week ${consolidationResult.week_number}`);
    lines.push(`Date: ${consolidationResult.consolidation_date}`);
    lines.push('='.repeat(60));

    lines.push(`\nTOTAL RECORDS: ${consolidationResult.total_records}`);
    lines.push('By Domain:');
    for (const [domain, count] of Object.entries(consolidationResult.records_by_domain)) {
      lines.push(`  ${domain}: ${count}`);
    }

    lines.push(`\nOVERALL STATISTICS:`);
    const stats = consolidationResult.overall_statistics;
    lines.push(`  Avg Quality Score: ${stats.avg_quality_score.toFixed(1)}/100`);
    lines.push(`  Reusable: ${stats.reusable_count} (${(stats.reusable_rate * 100).toFixed(1)}%)`);
    lines.push(`  Avg Latency: ${stats.avg_latency_ms.toFixed(0)}ms`);
    lines.push(`  Total Cost: $${(stats.total_cost_cents / 100).toFixed(2)}`);

    lines.push(`\nDOMAIN STATISTICS:`);
    for (const [domain, domainStats] of Object.entries(consolidationResult.domain_statistics)) {
      if ((domainStats as any).record_count === 0) continue;
      lines.push(`\n  ${domain.toUpperCase()}:`);
      lines.push(`    Records: ${(domainStats as any).record_count}`);
      lines.push(`    Avg Quality: ${(domainStats as any).avg_quality_score.toFixed(1)}/100`);
      lines.push(`    Success Rate: ${((domainStats as any).success_rate * 100).toFixed(1)}%`);
      lines.push(`    Top Patterns: ${(domainStats as any).top_patterns.slice(0, 3).join(', ')}`);
      lines.push(`    Quality Distribution: High=${(domainStats as any).quality_distribution.high}, Medium=${(domainStats as any).quality_distribution.medium}, Low=${(domainStats as any).quality_distribution.low}`);
    }

    lines.push(`\nPATTERNS IDENTIFIED: ${consolidationResult.patterns_identified.length}`);
    for (const pattern of consolidationResult.patterns_identified.slice(0, 5)) {
      lines.push(`  - ${pattern.pattern} (${pattern.domain}): ${pattern.frequency}x, quality ${pattern.quality_avg.toFixed(1)}`);
      for (const rec of pattern.recommendations) {
        lines.push(`    → ${rec}`);
      }
    }

    lines.push(`\nALERTS: ${consolidationResult.alerts.length}`);
    for (const alert of consolidationResult.alerts) {
      const severityEmoji =
        alert.severity === 'critical' ? '🔴' :
        alert.severity === 'warning' ? '🟡' :
        '🔵';
      lines.push(`  ${severityEmoji} [${alert.type}] ${alert.domain}: ${alert.message}`);
      if (alert.action_item) {
        lines.push(`     ACTION: ${alert.action_item}`);
      }
    }

    lines.push('\n' + '='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Check if this is week 4 of the consolidation cycle
   */
  private isWeek4(): boolean {
    // Week 4 is specific phase of the build plan
    // In real implementation, this would track actual progress
    return false; // Placeholder
  }

  /**
   * Get Claude review of consolidation (Week 4 feature)
   * Placeholder for future Claude API integration
   */
  private async getClaudeReview(consolidationResult: any): Promise<string> {
    // Week 4: Call Claude API to review consolidation results
    // Validate patterns, suggest improvements, give GO/NO-GO decision
    return 'Claude review would be called here in Week 4';
  }
}

/**
 * Create and schedule cron job
 * Usage:
 *   const cron = new WeeklyConsolidationCron({ org_id: 'org_123', store_path: './data/learning' });
 *   // Schedule to run every Sunday at 10:00 AM using cron scheduler
 *   // Example with node-cron:
 *   // schedule('0 10 * * 0', () => cron.run());
 */
export async function setupWeeklyConsolidationCron(config: CronConfig): Promise<WeeklyConsolidationCron> {
  const cron = new WeeklyConsolidationCron(config);
  console.log('Weekly consolidation cron initialized');
  return cron;
}
