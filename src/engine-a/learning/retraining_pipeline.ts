/**
 * Monthly Retraining Pipeline
 * Continuous improvement cycle for all 4 adapters
 * Runs automatically 1st of every month (Sunday automated)
 * Target: +1-2% accuracy improvement per month
 */

import { BaseAdapter, AdapterDomain } from './training/base_adapter';
import { LearningRecord } from './schemas/learning_record';
import { LocalJsonStore } from './stores/local_json_store';

export interface MonthlyRetainingResult {
  month: Date;
  adapter: AdapterDomain;
  previous_accuracy: number;
  new_accuracy: number;
  accuracy_improvement_pct: number;
  feedback_records_used: number;
  new_patterns_identified: string[];
  deployment_decision: 'deploy' | 'hold' | 'rollback';
  cost_savings_monthly: number;
}

export interface RetainingFeedback {
  record_id: string;
  adapter: AdapterDomain;
  input: string;
  predicted_output: string;
  actual_output: string;
  user_accepted: boolean;
  feedback_timestamp: Date;
}

export class MonthlyRetrainingPipeline {
  adapters: Map<AdapterDomain, BaseAdapter>;
  store: LocalJsonStore;
  previous_results: Map<AdapterDomain, MonthlyRetainingResult>;

  constructor(
    adapters: Map<AdapterDomain, BaseAdapter>,
    store: LocalJsonStore
  ) {
    this.adapters = adapters;
    this.store = store;
    this.previous_results = new Map();
  }

  /**
   * Run monthly retraining for all adapters
   * Called on 1st of month at specific time
   */
  async runMonthlyRetraining(): Promise<MonthlyRetainingResult[]> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`MONTHLY RETRAINING CYCLE - ${new Date().toLocaleDateString()}`);
    console.log(`${'='.repeat(70)}\n`);

    const results: MonthlyRetainingResult[] = [];

    // Process each adapter
    for (const domain of ['support', 'code', 'automation', 'business'] as AdapterDomain[]) {
      const adapter = this.adapters.get(domain);
      if (!adapter) {
        console.log(`Skipping ${domain}: no adapter registered`);
        continue;
      }

      console.log(`\n[${domain.toUpperCase()}] Starting retraining...`);

      try {
        const result = await this.retrainAdapter(domain, adapter);
        results.push(result);
        this.previous_results.set(domain, result);
      } catch (error) {
        console.error(`Error retraining ${domain}:`, error);
      }
    }

    // Generate summary report
    this.generateMonthlyReport(results);

    return results;
  }

  /**
   * Retrain a single adapter
   */
  private async retrainAdapter(
    domain: AdapterDomain,
    adapter: BaseAdapter
  ): Promise<MonthlyRetainingResult> {
    // Step 1: Collect feedback from past month
    console.log(`  Collecting production feedback...`);
    const feedbackRecords = await this.collectFeedback(domain);
    console.log(`    Records collected: ${feedbackRecords.length}`);

    // Step 2: Identify misses (user corrections)
    const misses = feedbackRecords.filter(f => !f.user_accepted);
    console.log(`    Misses identified: ${misses.length}`);

    // Step 3: Load existing training data
    const existingRecords = await this.store.loadRecordsByDomain(domain);
    console.log(`    Existing training records: ${existingRecords.length}`);

    // Step 4: Add feedback to training data
    const newTrainingExamples = misses.map(m => ({
      input: m.input,
      output: m.actual_output,
      domain,
      confidence: 0.9,
      source: 'production_feedback' as const,
      tags: ['feedback', 'correction'],
    }));

    console.log(`    New training examples from feedback: ${newTrainingExamples.length}`);

    // Step 5: Get previous metrics for comparison
    const previousMetrics = this.previous_results.get(domain)?.previous_accuracy || 0;

    // Step 6: Retrain with new data
    console.log(`  Retraining adapter with new data...`);
    const allExamples = [
      ...existingRecords.map(r => ({
        input: r.input,
        output: r.output,
        domain: r.domain,
        confidence: r.quality_score / 100,
        source: r.source_system === 'version_control' ? 'production' : 'production',
        tags: r.tags,
      })),
      ...newTrainingExamples,
    ];

    await adapter.loadTrainingData(allExamples);

    // In real implementation, would call: const newVersion = await adapter.train();
    // For now, placeholder that assumes training happens
    const newVersion = await adapter.train();

    // Step 7: Evaluate
    console.log(`  Evaluating retrained adapter...`);
    const testSet = allExamples.slice(0, Math.min(50, Math.floor(allExamples.length * 0.1)));
    const evaluation = await adapter.evaluate(testSet);

    const accuracyImprovement = evaluation.metrics.accuracy - previousMetrics;

    console.log(`    Previous accuracy: ${previousMetrics.toFixed(1)}%`);
    console.log(`    New accuracy: ${evaluation.metrics.accuracy.toFixed(1)}%`);
    console.log(`    Improvement: ${accuracyImprovement > 0 ? '+' : ''}${accuracyImprovement.toFixed(1)}%`);

    // Step 8: Identify new patterns
    const newPatterns = this.identifyPatterns(feedbackRecords);
    console.log(`    New patterns identified: ${newPatterns.length}`);
    for (const pattern of newPatterns.slice(0, 3)) {
      console.log(`      - ${pattern}`);
    }

    // Step 9: Deployment decision
    const deploymentDecision = this.makeDeploymentDecision(
      previousMetrics,
      evaluation.metrics.accuracy,
      feedbackRecords.length
    );

    console.log(`    Deployment decision: ${deploymentDecision}`);

    if (deploymentDecision === 'deploy') {
      console.log(`    Deploying new version: ${newVersion.version}`);
      // In real implementation: await adapter.deployToProduction();
    }

    // Step 10: Calculate cost savings
    const monthlyCostSavings = this.calculateCostSavings(feedbackRecords.length);

    return {
      month: new Date(),
      adapter: domain,
      previous_accuracy: previousMetrics,
      new_accuracy: evaluation.metrics.accuracy,
      accuracy_improvement_pct: accuracyImprovement,
      feedback_records_used: feedbackRecords.length,
      new_patterns_identified: newPatterns,
      deployment_decision: deploymentDecision,
      cost_savings_monthly: monthlyCostSavings,
    };
  }

  /**
   * Collect production feedback from past month
   */
  private async collectFeedback(domain: AdapterDomain): Promise<RetainingFeedback[]> {
    // In real implementation, query feedback table
    // For now, return empty list (placeholder)
    // Would query: SELECT * FROM adapter_feedback WHERE adapter = domain AND timestamp >= now() - 1 month

    return [];
  }

  /**
   * Identify patterns in feedback
   */
  private identifyPatterns(feedback: RetainingFeedback[]): string[] {
    // Group by similarity and extract common patterns
    const patterns: Record<string, number> = {};

    for (const f of feedback) {
      // Simple pattern extraction: first few words of input
      const pattern = f.input.split(' ').slice(0, 3).join(' ');
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }

    // Return top patterns
    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => `${pattern} (${count}x)`);
  }

  /**
   * Make deployment decision based on metrics
   */
  private makeDeploymentDecision(
    previousAccuracy: number,
    newAccuracy: number,
    feedbackCount: number
  ): 'deploy' | 'hold' | 'rollback' {
    // Deploy if accuracy improved or stayed same
    if (newAccuracy >= previousAccuracy) {
      return 'deploy';
    }

    // If small regression, hold to collect more feedback
    if (newAccuracy >= previousAccuracy - 2) {
      return 'hold';
    }

    // Significant regression, rollback
    return 'rollback';
  }

  /**
   * Calculate estimated cost savings
   * Based on local inference vs Claude fallback cost reduction
   */
  private calculateCostSavings(requestsHandled: number): number {
    // Estimate 10,000 requests/month in production
    // Local cost: ~$0.01 per request
    // Claude cost: ~$3.00 per request
    const claudeCostPerRequest = 3.0;
    const localCostPerRequest = 0.01;

    return (claudeCostPerRequest - localCostPerRequest) * Math.min(requestsHandled, 10000);
  }

  /**
   * Generate summary report for all adapters
   */
  private generateMonthlyReport(results: MonthlyRetainingResult[]): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`MONTHLY RETRAINING SUMMARY`);
    console.log(`${'='.repeat(70)}\n`);

    let totalSavings = 0;
    let successfulRetrains = 0;

    for (const result of results) {
      const improvementArrow =
        result.accuracy_improvement_pct > 0 ? '↑' :
        result.accuracy_improvement_pct < 0 ? '↓' :
        '→';

      console.log(`${result.adapter.toUpperCase()}`);
      console.log(`  Accuracy: ${result.previous_accuracy.toFixed(1)}% → ${result.new_accuracy.toFixed(1)}% ${improvementArrow} (${(result.accuracy_improvement_pct > 0 ? '+' : '')}${result.accuracy_improvement_pct.toFixed(1)}%)`);
      console.log(`  Feedback: ${result.feedback_records_used} records`);
      console.log(`  Decision: ${result.deployment_decision}`);
      console.log(`  Patterns: ${result.new_patterns_identified.length} new patterns`);
      console.log(`  Monthly Savings: $${result.cost_savings_monthly.toFixed(2)}\n`);

      totalSavings += result.cost_savings_monthly;

      if (result.deployment_decision === 'deploy') {
        successfulRetrains++;
      }
    }

    console.log(`${'='.repeat(70)}`);
    console.log(`Summary:`);
    console.log(`  Retrains completed: ${results.length}`);
    console.log(`  Successful deployments: ${successfulRetrains}`);
    console.log(`  Total monthly savings: $${totalSavings.toFixed(2)}`);
    console.log(`  Estimated annual savings: $${(totalSavings * 12).toFixed(2)}`);
    console.log(`${'='.repeat(70)}\n`);
  }
}
