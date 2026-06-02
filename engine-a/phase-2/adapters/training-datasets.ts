/**
 * Training Datasets
 * Prepare and format learning records for adapter training
 */

import { LearningRecord, TrainingExample } from "../learning/schemas/LearningRecord";
import * as fs from "fs";

// ============================================================================
// SUPPORT TRIAGE ADAPTER TRAINING
// ============================================================================

export function createSupportTrainingData(records: LearningRecord[]): TrainingExample[] {
  return records
    .filter((r) => r.domain === "support" && r.reusable && r.accepted && r.quality_score >= 60)
    .map((r) => ({
      input: `Support case: ${r.input}\nContext: ${JSON.stringify(r.context)}`,
      output: {
        category: r.context.category || "unknown",
        priority: r.context.severity || "medium",
        suggested_handler: r.action,
        confidence: r.quality_score / 100,
      },
    }));
}

export function generateSyntheticSupportVariations(
  example: TrainingExample
): TrainingExample[] {
  // Simulate generating 3 variations of the same support case
  const baseOutput = example.output as any;
  const variations: TrainingExample[] = [];

  // Variation 1: Different wording, same issue
  const input1 = example.input.replace(/Support case: /, "Support issue: ").replace(/Context/, "Background");
  variations.push({
    input: input1,
    output: baseOutput,
  });

  // Variation 2: Different severity
  variations.push({
    input: example.input.replace(/severity: \w+/, 'severity: "high"'),
    output: { ...baseOutput, priority: "high" },
  });

  // Variation 3: Different but related issue
  variations.push({
    input: example.input.replace(/case: /, "issue: ").replace(/deployment|integration|connection/, "authentication"),
    output: { ...baseOutput, category: "authentication" },
  });

  return variations;
}

// ============================================================================
// CODE FIX ADAPTER TRAINING
// ============================================================================

export function createCodeTrainingData(records: LearningRecord[]): TrainingExample[] {
  return records
    .filter((r) => r.domain === "code" && r.reusable && r.accepted && r.quality_score >= 60)
    .map((r) => ({
      input: `Error: ${r.input}\nLanguage: ${r.context.language}\nFunctions: ${r.context.functions_changed?.join(", ") || "unknown"}`,
      output: {
        fix: r.output,
        explanation: r.action,
        language: r.context.language || "unknown",
        tested: (r.context.test_pass_rate || 0) > 0.8,
        confidence: r.quality_score / 100,
      },
    }));
}

export function generateSyntheticCodeVariations(example: TrainingExample): TrainingExample[] {
  const baseOutput = example.output as any;
  const variations: TrainingExample[] = [];

  // Variation 1: Different language, similar fix
  const languages = ["javascript", "python", "typescript", "go", "rust"];
  const currentLang = baseOutput.language;
  const otherLang = languages.find((l) => l !== currentLang) || "python";

  variations.push({
    input: example.input.replace(
      new RegExp(`Language: ${currentLang}`, "i"),
      `Language: ${otherLang}`
    ),
    output: { ...baseOutput, language: otherLang },
  });

  // Variation 2: Similar error, different context
  const errorKeywords = ["infinite loop", "null pointer", "race condition", "memory leak"];
  const currentError = example.input.split("\n")[0];
  const otherError = errorKeywords.find((e) => !currentError.includes(e)) || "type error";

  variations.push({
    input: example.input.replace(currentError, `Error: ${otherError} in ${baseOutput.language}`),
    output: { ...baseOutput, confidence: baseOutput.confidence - 0.1 },
  });

  // Variation 3: Same issue, different fix approach
  variations.push({
    input: example.input + "\nConstraint: avoid external dependencies",
    output: {
      ...baseOutput,
      explanation: `${baseOutput.explanation} (alternative approach without dependencies)`,
    },
  });

  return variations;
}

// ============================================================================
// WORKFLOW ROUTER ADAPTER TRAINING
// ============================================================================

export function createWorkflowRouterTrainingData(records: LearningRecord[]): TrainingExample[] {
  return records
    .filter((r) => r.domain === "automation" && r.reusable && r.accepted && r.quality_score >= 60)
    .map((r) => ({
      input: `Automation request: ${r.input}\nIntegrations needed: ${r.context.integrations?.join(", ") || "none"}`,
      output: {
        workflow_type: r.context.trigger_type || "unknown",
        action_count: r.context.action_count || 1,
        estimated_duration_minutes: Math.ceil((r.latency_ms || 0) / 60000),
        confidence: r.quality_score / 100,
        required_integrations: r.context.integrations || [],
      },
    }));
}

export function generateSyntheticWorkflowVariations(
  example: TrainingExample
): TrainingExample[] {
  const baseOutput = example.output as any;
  const variations: TrainingExample[] = [];

  // Variation 1: Different trigger same workflow
  const triggers = ["scheduled", "manual", "event", "threshold"];
  const currentTrigger = baseOutput.workflow_type;
  const otherTrigger = triggers.find((t) => t !== currentTrigger) || "manual";

  variations.push({
    input: example.input.replace(currentTrigger, otherTrigger),
    output: { ...baseOutput, workflow_type: otherTrigger },
  });

  // Variation 2: More complex workflow
  variations.push({
    input: example.input + "\nWith approval step",
    output: { ...baseOutput, action_count: baseOutput.action_count + 1 },
  });

  // Variation 3: Fewer integrations
  const integrations = baseOutput.required_integrations || [];
  if (integrations.length > 1) {
    variations.push({
      input: example.input.replace(integrations.join(", "), integrations[0]),
      output: {
        ...baseOutput,
        required_integrations: [integrations[0]],
      },
    });
  }

  return variations;
}

// ============================================================================
// BUSINESS INTELLIGENCE ADAPTER TRAINING
// ============================================================================

export function createBusinessIntelligenceTrainingData(records: LearningRecord[]): TrainingExample[] {
  return records
    .filter((r) => r.domain === "business" && r.reusable && r.accepted && r.quality_score >= 60)
    .map((r) => ({
      input: `Business question: ${r.input}\nPeriod: ${r.context.period}`,
      output: {
        insight_type: "strategic" as const,
        key_results: r.context.key_results_count || 0,
        reasoning: r.action,
        confidence: r.quality_score / 100,
      },
    }));
}

export function generateSyntheticBusinessVariations(
  example: TrainingExample
): TrainingExample[] {
  const baseOutput = example.output as any;
  const variations: TrainingExample[] = [];

  // Variation 1: Different period
  const periods = ["quarter", "month", "week", "year"];
  const currentPeriod = example.input.match(/Period: (\w+)/)?.[1] || "quarter";
  const otherPeriod = periods.find((p) => p !== currentPeriod) || "month";

  variations.push({
    input: example.input.replace(`Period: ${currentPeriod}`, `Period: ${otherPeriod}`),
    output: baseOutput,
  });

  // Variation 2: More key results
  variations.push({
    input: example.input + "\nWith 5 key results",
    output: { ...baseOutput, key_results: Math.max(5, baseOutput.key_results) },
  });

  // Variation 3: Different insight type
  const insightTypes = ["operational", "financial", "strategic"];
  const otherType = insightTypes.find((t) => t !== "strategic") || "operational";

  variations.push({
    input: example.input.replace("Business question", `${otherType.charAt(0).toUpperCase() + otherType.slice(1)} question`),
    output: { ...baseOutput, insight_type: otherType },
  });

  return variations;
}

// ============================================================================
// UNIFIED DATASET GENERATION
// ============================================================================

export interface DatasetPackage {
  adapter_type: "support_triage" | "code_fix" | "workflow_router" | "business_intelligence";
  training_data: TrainingExample[];
  synthetic_data: TrainingExample[];
  eval_set: TrainingExample[];
  dataset_size: {
    training: number;
    synthetic: number;
    total: number;
  };
}

export function createDatasetPackage(
  records: LearningRecord[],
  adapterType: DatasetPackage["adapter_type"]
): DatasetPackage {
  let baseData: TrainingExample[] = [];
  let synthetic: TrainingExample[] = [];
  let syntheticGenerator: (ex: TrainingExample) => TrainingExample[];

  switch (adapterType) {
    case "support_triage":
      baseData = createSupportTrainingData(records);
      syntheticGenerator = generateSyntheticSupportVariations;
      break;
    case "code_fix":
      baseData = createCodeTrainingData(records);
      syntheticGenerator = generateSyntheticCodeVariations;
      break;
    case "workflow_router":
      baseData = createWorkflowRouterTrainingData(records);
      syntheticGenerator = generateSyntheticWorkflowVariations;
      break;
    case "business_intelligence":
      baseData = createBusinessIntelligenceTrainingData(records);
      syntheticGenerator = generateSyntheticBusinessVariations;
      break;
  }

  // Generate synthetic variations
  baseData.forEach((example) => {
    synthetic.push(...syntheticGenerator(example));
  });

  // Split into training (70%) and eval (30%)
  const combined = [...baseData, ...synthetic];
  const evalSize = Math.ceil(combined.length * 0.3);
  const evalSet = combined.slice(0, evalSize);
  const trainingSet = combined.slice(evalSize);

  return {
    adapter_type: adapterType,
    training_data: trainingSet,
    synthetic_data: synthetic,
    eval_set: evalSet,
    dataset_size: {
      training: trainingSet.length,
      synthetic: synthetic.length,
      total: combined.length,
    },
  };
}

// ============================================================================
// FILE EXPORT
// ============================================================================

export function exportDatasetAsJSONL(dataset: DatasetPackage, outputPath: string): void {
  const jsonlLines = [...dataset.training_data, ...dataset.synthetic_data].map((example) =>
    JSON.stringify(example)
  );

  fs.writeFileSync(outputPath, jsonlLines.join("\n"));
}

export function exportEvalSetAsJSON(dataset: DatasetPackage, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(dataset.eval_set, null, 2));
}

// ============================================================================
// DATASET SUMMARY
// ============================================================================

export function summarizeDataset(dataset: DatasetPackage): string {
  return `
Dataset: ${dataset.adapter_type}
${"=".repeat(60)}

Size:
  Training examples: ${dataset.dataset_size.training}
  Synthetic variations: ${dataset.dataset_size.synthetic}
  Total: ${dataset.dataset_size.total}
  Eval set: ${dataset.eval_set.length}

Distribution:
  Training: ${((dataset.dataset_size.training / dataset.dataset_size.total) * 100).toFixed(1)}%
  Synthetic: ${((dataset.dataset_size.synthetic / dataset.dataset_size.total) * 100).toFixed(1)}%

Status:
  Ready for training: ${dataset.dataset_size.total >= 200 ? "✅ YES" : `❌ NO (need ${200 - dataset.dataset_size.total} more)`}
  Ready for eval: ${dataset.eval_set.length >= 50 ? "✅ YES" : `⚠️  Limited (${dataset.eval_set.length} examples)`}
`;
}
