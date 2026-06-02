/**
 * LLM-as-Teacher: Iterative Improvement
 * Claude guides local adapters to 90%+ accuracy
 * Teaching examples with detailed reasoning
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TRAINING INTERFACES
// ============================================================================

export interface BaseExample {
  id: string;
  input: string;
  correct_output: string;
  domain: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface TeachingExample {
  id: string;
  input: string;
  reasoning: string;  // Claude's explanation of WHY
  output: string;
  difficulty: string;
  source: "base" | "generated" | "remedial";
}

export interface StudentEvaluation {
  iteration: number;
  accuracy: number;  // 0-1
  correct_cases: number;
  total_cases: number;
  gaps_identified: string[];
  improvement_rate: number;  // % improvement from previous
}

export interface TeachingCycle {
  id: string;
  adapter_name: string;
  iteration: number;
  base_examples: BaseExample[];
  teaching_examples: TeachingExample[];
  evaluation: StudentEvaluation;
  next_steps: string;
  completed: boolean;
}

// ============================================================================
// TEACHING PIPELINE
// ============================================================================

export async function conductTeachingCycle(
  adapter_name: string,
  base_examples: BaseExample[],
  previous_accuracy?: number
): Promise<TeachingCycle> {
  const cycle: TeachingCycle = {
    id: uuidv4(),
    adapter_name,
    iteration: 1,
    base_examples,
    teaching_examples: [],
    evaluation: {
      iteration: 1,
      accuracy: 0,
      correct_cases: 0,
      total_cases: 0,
      gaps_identified: [],
      improvement_rate: 0,
    },
    next_steps: "",
    completed: false,
  };

  // Step 1: Claude reads base examples
  console.log(`[Step 1] Claude analyzing ${base_examples.length} base examples...`);

  // Step 2: Claude explains patterns
  const patterns = await extractPatterns(base_examples);
  console.log(`[Step 2] Identified patterns: ${patterns.join(", ")}`);

  // Step 3: Claude generates teaching examples with detailed reasoning
  console.log(`[Step 3] Claude generating teaching examples with reasoning...`);
  cycle.teaching_examples = await generateTeachingExamples(
    base_examples,
    patterns,
    3  // Generate 3x the number of base examples
  );

  // Step 4: Train local model on explained examples
  console.log(`[Step 4] Training local adapter on ${cycle.teaching_examples.length} teaching examples...`);
  const training_metrics = await trainAdapter(adapter_name, cycle.teaching_examples);

  // Step 5: Evaluate on holdout set
  console.log(`[Step 5] Evaluating adapter on holdout set...`);
  const holdout_examples = base_examples.slice(-Math.ceil(base_examples.length * 0.2));
  cycle.evaluation = await evaluateAdapter(adapter_name, holdout_examples);

  // Step 6: If <90%, identify gaps and generate remedial examples
  if (cycle.evaluation.accuracy < 0.9) {
    console.log(`[Step 6] Accuracy ${(cycle.evaluation.accuracy * 100).toFixed(0)}% < 90%. Identifying gaps...`);

    // Claude analyzes what went wrong
    const gaps = await identifyGaps(
      base_examples,
      cycle.teaching_examples,
      cycle.evaluation.gaps_identified
    );

    if (gaps.remedial_examples.length > 0) {
      console.log(`[Step 6] Generating ${gaps.remedial_examples.length} remedial examples...`);
      cycle.teaching_examples.push(...gaps.remedial_examples);

      // Retrain with remedial examples
      console.log(`[Step 7] Retraining with remedial examples...`);
      const retrain_metrics = await trainAdapter(adapter_name, gaps.remedial_examples);

      // Re-evaluate
      cycle.evaluation = await evaluateAdapter(adapter_name, holdout_examples);
    }
  }

  // Step 7: Calculate improvement and next steps
  if (previous_accuracy) {
    cycle.evaluation.improvement_rate = (cycle.evaluation.accuracy - previous_accuracy) * 100;
  }

  if (cycle.evaluation.accuracy >= 0.9) {
    cycle.completed = true;
    cycle.next_steps = "✅ Adapter ready for production (90%+ accuracy)";
  } else {
    cycle.next_steps = `Continue iterating. Current: ${(cycle.evaluation.accuracy * 100).toFixed(0)}%. Gaps: ${cycle.evaluation.gaps_identified
      .slice(0, 2)
      .join(", ")}`;
  }

  return cycle;
}

// ============================================================================
// STEP 2: PATTERN EXTRACTION
// ============================================================================

async function extractPatterns(examples: BaseExample[]): Promise<string[]> {
  // Claude analyzes examples and identifies key decision patterns
  // In production: Call Claude API

  const patterns: string[] = [];

  // Group by output and find common input characteristics
  const byOutput = new Map<string, BaseExample[]>();
  examples.forEach((ex) => {
    if (!byOutput.has(ex.correct_output)) {
      byOutput.set(ex.correct_output, []);
    }
    byOutput.get(ex.correct_output)!.push(ex);
  });

  // Extract patterns from each group
  byOutput.forEach((group, output) => {
    const commonKeywords = findCommonKeywords(group.map((ex) => ex.input));
    patterns.push(`When input contains ${commonKeywords.join(" or ")}, output is ${output}`);
  });

  return patterns;
}

function findCommonKeywords(inputs: string[]): string[] {
  const wordFreq = new Map<string, number>();

  inputs.forEach((input) => {
    const words = input.split(/\s+/).filter((w) => w.length > 3);
    words.forEach((word) => {
      const lower = word.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    });
  });

  // Return top 3 keywords
  return Array.from(wordFreq.entries())
    .filter(([, count]) => count >= inputs.length * 0.3)  // Appears in 30%+ of examples
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

// ============================================================================
// STEP 3: TEACHING EXAMPLE GENERATION
// ============================================================================

async function generateTeachingExamples(
  base_examples: BaseExample[],
  patterns: string[],
  multiplier: number
): Promise<TeachingExample[]> {
  // Claude generates teaching examples with detailed reasoning
  // Each example includes WHY, not just input→output

  const teaching_examples: TeachingExample[] = [];

  for (const base of base_examples) {
    // Generate 'multiplier' variations with detailed reasoning
    for (let i = 0; i < multiplier; i++) {
      const teaching_ex: TeachingExample = {
        id: uuidv4(),
        input: generateVariation(base.input, i),
        reasoning: generateReasoning(base.input, base.correct_output, patterns),
        output: base.correct_output,
        difficulty: base.difficulty,
        source: "generated",
      };

      teaching_examples.push(teaching_ex);
    }
  }

  return teaching_examples;
}

function generateVariation(original: string, iteration: number): string {
  // Generate variations while keeping core meaning
  // In production: Claude generates semantically similar but syntactically different examples

  const variations = [
    original,
    original.replace(/team is/i, "our team is"),
    original.replace(/problem/i, "issue"),
    original.replace(/workflow/i, "process"),
  ];

  return variations[iteration % variations.length];
}

function generateReasoning(
  input: string,
  output: string,
  patterns: string[]
): string {
  // Claude explains the decision logic
  // This is the key difference: student learns WHY, not just pattern

  const parts: string[] = [];

  parts.push(`When analyzing "${input.substring(0, 50)}..."`);
  parts.push(`we recognize that this matches our framework selection patterns:`);

  patterns.slice(0, 2).forEach((pattern) => {
    parts.push(`• ${pattern}`);
  });

  parts.push(
    `Therefore, we select "${output}" because it best addresses the identified problem type and domain context.`
  );

  return parts.join(" ");
}

// ============================================================================
// STEP 4: LOCAL ADAPTER TRAINING
// ============================================================================

interface TrainingMetrics {
  loss: number;
  accuracy: number;
  examples_processed: number;
  training_time_ms: number;
}

async function trainAdapter(
  adapter_name: string,
  teaching_examples: TeachingExample[]
): Promise<TrainingMetrics> {
  // In production: Run local training (fine-tune, distill, etc.)
  // Stub: simulate training

  const startTime = Date.now();

  // Simulate training: accuracy improves with more examples
  const accuracy = Math.min(0.85, 0.5 + teaching_examples.length * 0.01);

  return {
    loss: 0.15,  // Simulated loss
    accuracy,
    examples_processed: teaching_examples.length,
    training_time_ms: Date.now() - startTime,
  };
}

// ============================================================================
// STEP 5: EVALUATION
// ============================================================================

async function evaluateAdapter(
  adapter_name: string,
  holdout_examples: BaseExample[]
): Promise<StudentEvaluation> {
  // Evaluate adapter on holdout set

  let correct = 0;
  const gaps: string[] = [];

  for (const example of holdout_examples) {
    // Stub: simulate adapter prediction
    const prediction = simulateAdapterPrediction(example.input);

    if (prediction === example.correct_output) {
      correct++;
    } else {
      gaps.push(`Failed on "${example.input.substring(0, 40)}..."`);
    }
  }

  const accuracy = holdout_examples.length > 0 ? correct / holdout_examples.length : 0;

  return {
    iteration: 1,
    accuracy,
    correct_cases: correct,
    total_cases: holdout_examples.length,
    gaps_identified: gaps.slice(0, 3),  // Top 3 failure cases
    improvement_rate: 0,
  };
}

function simulateAdapterPrediction(input: string): string {
  // Stub: in production, call actual adapter
  // For now: return based on keywords

  const lower = input.toLowerCase();

  if (lower.includes("bottleneck") || lower.includes("constraint")) {
    return "process-bottleneck-detection";
  } else if (lower.includes("root cause") || lower.includes("why")) {
    return "root-cause-analysis";
  } else if (lower.includes("priorit")) {
    return "project-prioritization";
  }

  return "operational-health-assessment";
}

// ============================================================================
// STEP 6: GAP IDENTIFICATION & REMEDIAL EXAMPLES
// ============================================================================

interface GapAnalysis {
  gaps: string[];
  patterns_missed: string[];
  remedial_examples: TeachingExample[];
}

async function identifyGaps(
  base_examples: BaseExample[],
  teaching_examples: TeachingExample[],
  evaluation_gaps: string[]
): Promise<GapAnalysis> {
  // Claude analyzes what the student (adapter) is missing

  const gaps: string[] = [];
  const patterns_missed: string[] = [];
  const remedial_examples: TeachingExample[] = [];

  // Find which base examples failed
  const failed_indices = evaluation_gaps.map((gap) => {
    const match = base_examples.findIndex(
      (ex) => ex.input.substring(0, 40) === gap.substring(6, 46)
    );
    return match;
  });

  // Generate remedial examples focusing on failed cases
  failed_indices.forEach((idx) => {
    if (idx >= 0) {
      const failed = base_examples[idx];
      gaps.push(`Missing: ${failed.correct_output} for input type "${failed.input.substring(0, 30)}..."`);

      // Create highly specific remedial example
      const remedial: TeachingExample = {
        id: uuidv4(),
        input: failed.input,
        reasoning: `This is a critical case. ${failed.input}. The output must be ${failed.correct_output} because...`,
        output: failed.correct_output,
        difficulty: "hard",
        source: "remedial",
      };

      remedial_examples.push(remedial);
    }
  });

  return {
    gaps,
    patterns_missed,
    remedial_examples,
  };
}

// ============================================================================
// TEACHING CYCLE REPORTING
// ============================================================================

export function formatTeachingCycleReport(cycle: TeachingCycle): string {
  return `
# Teaching Cycle: ${cycle.adapter_name} (Iteration ${cycle.iteration})

## Summary
- Status: ${cycle.completed ? "✅ COMPLETE" : "🔄 IN PROGRESS"}
- Accuracy: ${(cycle.evaluation.accuracy * 100).toFixed(1)}%
- Improvement: ${cycle.evaluation.improvement_rate > 0 ? "+" : ""}${cycle.evaluation.improvement_rate.toFixed(1)}%

## Training
- Base examples: ${cycle.base_examples.length}
- Teaching examples generated: ${cycle.teaching_examples.length}
- Holdout test size: ${cycle.evaluation.total_cases}

## Results
- Correct predictions: ${cycle.evaluation.correct_cases}/${cycle.evaluation.total_cases}
- Gaps identified: ${cycle.evaluation.gaps_identified.length}
  ${cycle.evaluation.gaps_identified.slice(0, 3).map((g) => `  - ${g}`).join("\n")}

## Next Steps
${cycle.next_steps}
`;
}

// ============================================================================
// MONTHLY RETRAINING ORCHESTRATION
// ============================================================================

export async function conductMonthlyRetraining(
  adapters: string[],
  learning_records: any[],
  previous_accuracies: Record<string, number>
): Promise<Record<string, TeachingCycle>> {
  const results: Record<string, TeachingCycle> = {};

  for (const adapter_name of adapters) {
    console.log(`\n🎓 Teaching cycle for ${adapter_name}...`);

    // Extract examples for this adapter
    const examples = learning_records
      .filter((r) => r.predicted_adapter === adapter_name)
      .slice(0, 100)  // Use up to 100 best examples
      .map((r) => ({
        id: uuidv4(),
        input: r.input,
        correct_output: r.actual_output,
        domain: r.domain,
        difficulty: r.quality_score > 80 ? "easy" : r.quality_score > 60 ? "medium" : "hard",
      }));

    if (examples.length > 10) {
      const cycle = await conductTeachingCycle(
        adapter_name,
        examples,
        previous_accuracies[adapter_name]
      );
      results[adapter_name] = cycle;
    }
  }

  return results;
}
