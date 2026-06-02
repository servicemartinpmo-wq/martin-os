/**
 * Monthly Retraining Pipeline
 * Automatic monthly adapter improvement based on production feedback
 */

import { LearningRecord } from "../learning/schemas/LearningRecord";
import { createDatasetPackage, summarizeDataset } from "../adapters/training-datasets";
import { AdapterEvaluation } from "../learning/schemas/LearningRecord";

// ============================================================================
// RETRAINING PIPELINE
// ============================================================================

export interface RetrainingJob {
  month: Date;
  adapter_type: "support_triage" | "code_fix" | "workflow_router" | "business_intelligence";

  feedback_collected: number;
  misses_identified: number;
  new_training_records: number;

  previous_accuracy: number;
  new_accuracy?: number;
  accuracy_improvement?: number;

  status: "pending" | "training" | "evaluating" | "deployed" | "failed";
  deployed_at?: Date;
}

export async function conductMonthlyRetraining(
  allRecords: LearningRecord[],
  previousEvaluations: Map<string, AdapterEvaluation>
): Promise<RetrainingJob[]> {
  const adapters = ["support_triage", "code_fix", "workflow_router", "business_intelligence"];
  const jobs: RetrainingJob[] = [];

  for (const adapter of adapters) {
    const job = await retrainAdapter(
      adapter as any,
      allRecords,
      previousEvaluations.get(adapter)
    );
    jobs.push(job);
  }

  return jobs;
}

async function retrainAdapter(
  adapterType: "support_triage" | "code_fix" | "workflow_router" | "business_intelligence",
  allRecords: LearningRecord[],
  previousEval?: AdapterEvaluation
): Promise<RetrainingJob> {
  const job: RetrainingJob = {
    month: new Date(),
    adapter_type: adapterType,
    feedback_collected: 0,
    misses_identified: 0,
    new_training_records: 0,
    previous_accuracy: previousEval?.accuracy || 0,
    status: "pending",
  };

  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Retraining: ${adapterType}`);
    console.log(`${"=".repeat(70)}`);

    // Step 1: Collect feedback from past month
    console.log(`\n[1/5] Collecting feedback...`);
    const feedback = collectFeedback(allRecords, adapterType);
    job.feedback_collected = feedback.length;
    console.log(`  ✓ ${feedback.length} feedback records collected`);

    // Step 2: Identify misses
    console.log(`[2/5] Identifying misses...`);
    const misses = feedback.filter((r) => !r.accepted);
    job.misses_identified = misses.length;
    console.log(`  ✓ ${misses.length} misses identified`);

    // Step 3: Build new training dataset
    console.log(`[3/5] Building training dataset...`);
    const domainRecords = filterRecordsByDomain(allRecords, adapterType);
    const newRecords = [...domainRecords, ...misses];
    job.new_training_records = newRecords.length;

    const dataset = createDatasetPackage(newRecords, adapterType);
    console.log(`  ✓ ${dataset.dataset_size.total} training examples created`);
    console.log(summarizeDataset(dataset));

    // Step 4: Evaluate (Simulated)
    console.log(`[4/5] Evaluating adapter...`);
    const evaluation = await simulateEvaluation(adapterType, dataset);
    job.new_accuracy = evaluation.accuracy;
    job.accuracy_improvement = job.new_accuracy - job.previous_accuracy;
    console.log(`  ✓ New accuracy: ${job.new_accuracy}% (was ${job.previous_accuracy}%)`);

    if (job.accuracy_improvement > 0) {
      console.log(`  ✓ +${job.accuracy_improvement.toFixed(1)}% improvement! 🎉`);
    } else if (job.accuracy_improvement === 0) {
      console.log(`  ⚠️  No change (may need more data or different approach)`);
    } else {
      console.log(
        `  ❌ Accuracy decreased (${job.accuracy_improvement.toFixed(1)}%). NOT deploying.`
      );
      job.status = "failed";
      return job;
    }

    // Step 5: Deploy
    console.log(`[5/5] Deploying new adapter version...`);
    job.status = "deployed";
    job.deployed_at = new Date();
    console.log(`  ✓ ${adapterType} deployed with ${job.new_accuracy}% accuracy`);

    return job;
  } catch (error) {
    console.error(`  ❌ Retraining failed:`, error);
    job.status = "failed";
    return job;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function collectFeedback(records: LearningRecord[], adapterType: string): LearningRecord[] {
  // Filter to records from the past month that are marked for feedback
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const domain = mapAdapterToDomain(adapterType);

  return records.filter(
    (r) => r.domain === domain && r.created_at >= oneMonthAgo && r.feedback !== undefined
  );
}

function filterRecordsByDomain(
  records: LearningRecord[],
  adapterType: string
): LearningRecord[] {
  const domain = mapAdapterToDomain(adapterType);
  return records.filter(
    (r) => r.domain === domain && r.reusable && r.accepted && r.quality_score >= 60
  );
}

function mapAdapterToDomain(adapterType: string): string {
  switch (adapterType) {
    case "support_triage":
      return "support";
    case "code_fix":
      return "code";
    case "workflow_router":
      return "automation";
    case "business_intelligence":
      return "business";
    default:
      return "unknown";
  }
}

async function simulateEvaluation(
  adapterType: string,
  dataset: any
): Promise<AdapterEvaluation> {
  // Week 9-12: Replace this with actual fine-tuning and evaluation

  // Simulated improvements based on dataset size
  const baseAccuracy = {
    support_triage: 85,
    code_fix: 82,
    workflow_router: 88,
    business_intelligence: 80,
  };

  const base = baseAccuracy[adapterType as keyof typeof baseAccuracy] || 80;

  // More training data = higher accuracy (diminishing returns)
  const trainingBoost = Math.min(10, Math.log(dataset.dataset_size.total) / 2);

  return {
    adapter_type: adapterType,
    accuracy: Math.min(95, base + trainingBoost),
    latency_p50: 500,
    latency_p95: 2000,
    cost_per_request: 0.001,
    test_cases_passed: Math.floor((dataset.eval_set.length * (base + trainingBoost)) / 100),
    test_cases_total: dataset.eval_set.length,
    error_rate: Math.max(0, 5 - trainingBoost),
    fallback_rate: Math.max(0, 20 - trainingBoost),
    timestamp: new Date(),
  };
}

// ============================================================================
// SCHEDULED RETRAINING (Monthly, automated)
// ============================================================================

export async function scheduleMonthlyRetraining(allRecords: LearningRecord[]) {
  const now = new Date();

  // Check if today is the 1st of the month
  if (now.getDate() === 1) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🤖 MONTHLY RETRAINING CYCLE STARTED (${now.toLocaleDateString()})`);
    console.log(`${"=".repeat(70)}`);

    const previousEvals = new Map<string, AdapterEvaluation>();
    // In production, load previous evals from database

    const jobs = await conductMonthlyRetraining(allRecords, previousEvals);

    const summary = {
      month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      total_jobs: jobs.length,
      successful: jobs.filter((j) => j.status === "deployed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      total_improvements: jobs
        .filter((j) => j.accuracy_improvement && j.accuracy_improvement > 0)
        .reduce((sum, j) => sum + (j.accuracy_improvement || 0), 0),
      jobs,
    };

    printRetrainingReport(summary);

    return summary;
  }
}

function printRetrainingReport(summary: any) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`MONTHLY RETRAINING REPORT`);
  console.log(`${"=".repeat(70)}`);
  console.log(`
Month: ${summary.month}
Jobs: ${summary.successful}/${summary.total_jobs} successful
Failed: ${summary.failed}

Improvements:
${summary.jobs
  .map(
    (j: RetrainingJob) =>
      `  ${j.adapter_type}:
    Previous: ${j.previous_accuracy}%
    New: ${j.new_accuracy}%
    Change: ${j.accuracy_improvement ? (j.accuracy_improvement > 0 ? "+" : "") + j.accuracy_improvement.toFixed(1) + "%" : "N/A"}
    Status: ${j.status}`
  )
  .join("\n")}

Total improvement: +${summary.total_improvements.toFixed(1)}%

Next retraining: ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
`);
}

// ============================================================================
// EXPORT FOR SCHEDULING
// ============================================================================

export function getNextRetrainingDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function daysUntilRetraining(): number {
  const next = getNextRetrainingDate();
  const now = new Date();
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
