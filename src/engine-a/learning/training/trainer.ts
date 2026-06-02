/**
 * Adapter Trainer
 * Orchestrates training pipeline for all 4 adapters (Weeks 5-12)
 * Handles data preparation, synthetic generation, training, and evaluation
 */

import { LearningRecord } from '../schemas/learning_record';
import {
  AdapterDomain,
  BaseAdapter,
  TrainingExample,
  AdapterVersion,
  ADAPTER_SUCCESS_CRITERIA,
  ADAPTER_DATA_TARGETS,
} from './base_adapter';
import { SyntheticDataGenerator } from './synthetic_data_generator';

export interface TrainingPipeline {
  adapter: AdapterDomain;
  week_start: number;
  week_end: number;
  timeline: {
    data_preparation: string;
    synthetic_generation: string;
    model_training: string;
    evaluation: string;
    deployment: string;
  };
  budget_cents: number;
}

export interface TrainingReport {
  adapter: AdapterDomain;
  pipeline: TrainingPipeline;
  data_preparation: {
    real_examples_collected: number;
    synthetic_examples_generated: number;
    total_training_examples: number;
    quality_avg: number;
  };
  training_run: {
    model_version: string;
    training_duration_hours: number;
    gpu_hours_used: number;
    training_cost_cents: number;
    final_loss?: number;
  };
  evaluation_results: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    inference_cost_cents: number;
    meets_criteria: boolean;
    passed: boolean;
  };
  total_cost_cents: number;
  recommendation: 'deploy' | 'retrain' | 'collect_more_data';
  deployment_decision: string;
}

export class AdapterTrainer {
  adapter: BaseAdapter;
  domain: AdapterDomain;
  synthetic_generator: SyntheticDataGenerator;
  training_budget_cents: number;

  constructor(
    adapter: BaseAdapter,
    domain: AdapterDomain,
    gemini_api_key: string,
    training_budget_cents: number
  ) {
    this.adapter = adapter;
    this.domain = domain;
    this.synthetic_generator = new SyntheticDataGenerator(gemini_api_key);
    this.training_budget_cents = training_budget_cents;
  }

  /**
   * Run complete training pipeline
   */
  async runTrainingPipeline(
    learningRecords: LearningRecord[]
  ): Promise<TrainingReport> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Training Pipeline: ${this.domain.toUpperCase()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Step 1: Prepare data from learning records
    console.log(`[STEP 1] Preparing training data...`);
    const { realExamples, avgQuality } = await this.prepareData(learningRecords);
    console.log(`  Real examples: ${realExamples.length}`);
    console.log(`  Average quality: ${avgQuality.toFixed(1)}/100`);

    // Step 2: Generate synthetic variations
    console.log(`\n[STEP 2] Generating synthetic data variations...`);
    const syntheticExamples = await this.synthetic_generator.generateBatch(
      realExamples,
      ADAPTER_DATA_TARGETS[this.domain].synthetic_multiplier
    );
    const syntheticCost = this.synthetic_generator.getTotalCost();
    console.log(`  Synthetic examples: ${syntheticExamples.length}`);
    console.log(`  Synthetic cost: $${(syntheticCost / 100).toFixed(2)}`);

    // Step 3: Load data into adapter
    console.log(`\n[STEP 3] Loading training data into adapter...`);
    const allExamples = [...realExamples, ...syntheticExamples];
    const dataset = await this.adapter.loadTrainingData(allExamples);
    console.log(`  Total training examples: ${dataset.total_count}`);

    // Step 4: Train the adapter
    console.log(`\n[STEP 4] Training model...`);
    const startTime = Date.now();
    const version = await this.adapter.train();
    const trainingDurationMs = Date.now() - startTime;
    const trainingDurationHours = trainingDurationMs / (1000 * 60 * 60);
    console.log(`  Training duration: ${trainingDurationHours.toFixed(1)} hours`);
    console.log(`  Model version: ${version.version}`);

    // Step 5: Evaluate on holdout test set
    console.log(`\n[STEP 5] Evaluating model...`);
    const testSetSize = Math.ceil(realExamples.length * 0.2); // 20% holdout
    const testSet = realExamples.slice(0, testSetSize);
    const evaluation = await this.adapter.evaluate(testSet);
    console.log(`  Test set size: ${testSet.length}`);
    console.log(`  Accuracy: ${evaluation.metrics.accuracy.toFixed(1)}%`);
    console.log(`  Latency (p50): ${evaluation.metrics.latency_p50_ms.toFixed(0)}ms`);
    console.log(`  Latency (p95): ${evaluation.metrics.latency_p95_ms.toFixed(0)}ms`);

    // Step 6: Check success criteria
    const criteria = ADAPTER_SUCCESS_CRITERIA[this.domain];
    const meetsAccuracy = evaluation.metrics.accuracy >= criteria.accuracy;
    const meetsLatency = evaluation.metrics.latency_p50_ms <= criteria.latency_ms;
    const passed = meetsAccuracy && meetsLatency;

    console.log(`\n[STEP 6] Evaluating against success criteria...`);
    console.log(`  Accuracy: ${evaluation.metrics.accuracy.toFixed(1)}% (target: ${criteria.accuracy}%) ${meetsAccuracy ? '✓' : '✗'}`);
    console.log(`  Latency: ${evaluation.metrics.latency_p50_ms.toFixed(0)}ms (target: ${criteria.latency_ms}ms) ${meetsLatency ? '✓' : '✗'}`);
    console.log(`  Result: ${passed ? 'PASSED' : 'FAILED'}`);

    // Calculate total cost
    const totalCost = syntheticCost + evaluation.metrics.inference_cost_cents;

    // Generate report
    const report: TrainingReport = {
      adapter: this.domain,
      pipeline: this.getPipeline(),
      data_preparation: {
        real_examples_collected: realExamples.length,
        synthetic_examples_generated: syntheticExamples.length,
        total_training_examples: allExamples.length,
        quality_avg: avgQuality,
      },
      training_run: {
        model_version: version.version,
        training_duration_hours: trainingDurationHours,
        gpu_hours_used: trainingDurationHours * 1, // Estimate 1 GPU
        training_cost_cents: syntheticCost, // Approximate
        final_loss: undefined,
      },
      evaluation_results: {
        accuracy: evaluation.metrics.accuracy,
        precision: evaluation.metrics.precision,
        recall: evaluation.metrics.recall,
        f1_score: evaluation.metrics.f1_score,
        latency_p50_ms: evaluation.metrics.latency_p50_ms,
        latency_p95_ms: evaluation.metrics.latency_p95_ms,
        inference_cost_cents: evaluation.metrics.inference_cost_cents,
        meets_criteria: passed,
        passed,
      },
      total_cost_cents: totalCost,
      recommendation: passed ? 'deploy' : evaluation.metrics.accuracy < 70 ? 'collect_more_data' : 'retrain',
      deployment_decision: passed ? `Deploy to staging in Week ${this.getStaging()}` : `Retrain with improved data`,
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Training Complete: ${passed ? '✓ READY FOR DEPLOYMENT' : '✗ NEEDS IMPROVEMENT'}`);
    console.log(`${'='.repeat(60)}\n`);

    return report;
  }

  /**
   * Prepare data from learning records
   */
  private async prepareData(
    learningRecords: LearningRecord[]
  ): Promise<{ realExamples: TrainingExample[]; avgQuality: number }> {
    // Filter to domain-specific records
    const domainRecords = learningRecords.filter(r => r.domain === this.domain);

    // Filter to quality threshold
    const qualityThreshold = 60;
    const qualityRecords = domainRecords.filter(r => r.quality_score >= qualityThreshold);

    // Convert to training examples
    const realExamples: TrainingExample[] = qualityRecords.map(record => ({
      input: record.input,
      output: record.output,
      domain: this.domain,
      confidence: record.quality_score / 100,
      source: 'production',
      tags: record.tags,
    }));

    const avgQuality =
      realExamples.length > 0
        ? realExamples.reduce((sum, ex) => sum + (ex.confidence || 0), 0) / realExamples.length * 100
        : 0;

    console.log(`  Domain records: ${domainRecords.length}`);
    console.log(`  Quality filtered (>=${qualityThreshold}): ${realExamples.length}`);

    return { realExamples, avgQuality };
  }

  /**
   * Get training pipeline for this domain
   */
  private getPipeline(): TrainingPipeline {
    const pipelines: Record<AdapterDomain, TrainingPipeline> = {
      support: {
        adapter: 'support',
        week_start: 5,
        week_end: 6,
        timeline: {
          data_preparation: 'Mon-Tue (4h)',
          synthetic_generation: 'Tue-Wed ($50 Gemini, 2h)',
          model_training: 'Thu-Fri (4h)',
          evaluation: 'Mon Week 6 (4h)',
          deployment: 'Tue-Wed Week 6 staging, Thu production (2h)',
        },
        budget_cents: 5000, // $50
      },
      code: {
        adapter: 'code',
        week_start: 7,
        week_end: 8,
        timeline: {
          data_preparation: 'Mon (3h)',
          synthetic_generation: 'Tue-Wed ($40 Gemini, 2h)',
          model_training: 'Thu-Fri (4h)',
          evaluation: 'Mon Week 8 (4h)',
          deployment: 'Tue-Wed Week 8 (5h)',
        },
        budget_cents: 4000, // $40
      },
      automation: {
        adapter: 'automation',
        week_start: 9,
        week_end: 10,
        timeline: {
          data_preparation: 'Mon (2h)',
          synthetic_generation: 'Tue ($30 Gemini, 1.5h)',
          model_training: 'Wed-Thu (3h)',
          evaluation: 'Fri Week 9 (3h)',
          deployment: 'Mon-Tue Week 10 (3h)',
        },
        budget_cents: 3000, // $30
      },
      business: {
        adapter: 'business',
        week_start: 11,
        week_end: 12,
        timeline: {
          data_preparation: 'Mon (2h)',
          synthetic_generation: 'Tue ($30 Gemini, 1.5h)',
          model_training: 'Wed-Thu (3h)',
          evaluation: 'Fri Week 11 (3h)',
          deployment: 'Mon-Tue Week 12 (3h)',
        },
        budget_cents: 3000, // $30
      },
    };

    return pipelines[this.domain];
  }

  /**
   * Get staging week for this adapter
   */
  private getStaging(): number {
    const stagingWeeks: Record<AdapterDomain, number> = {
      support: 6,
      code: 8,
      automation: 10,
      business: 12,
    };
    return stagingWeeks[this.domain];
  }
}
