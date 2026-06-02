/**
 * Framework Intelligence Layer Operationalization
 * Transform Phase 0 framework database into executable intelligence layer
 */

// ============================================================================
// FRAMEWORK SCHEMA (OPERATIONAL)
// ============================================================================

export interface OperationalFramework {
  id: number;
  name: string;
  description?: string;

  // Classification
  domain: string;                       // operations, strategy, finance, etc.
  category: string;                    // signal, diagnosis, advisory, scoring, etc.
  confidence_score?: number;           // 0-100 (source quality)

  // Operationalization
  use_case: string;                    // What problem does it solve?
  input_signals: string[];             // What indicators suggest using this?
  recommended_when: string;            // Conditions where it applies
  avoid_when?: string;                 // Conditions where it shouldn't apply
  required_evidence: string[];         // What data is needed?
  output_type: OutputType;             // diagnosis | recommendation | score | alert | report | workflow

  // Relationships
  domain_tags: string[];               // Multi-domain tags
  related_frameworks: number[];        // Links to other framework IDs
  related_workflows?: string[];        // Which workflows use this
  related_functions?: string[];        // Which functions support this

  // Enterprise
  phase_3_relevance?: string;          // How this scales to enterprise
  connector_needed?: string;           // Which system integration needed
  wrapper_relevance?: string;          // How org wrapper affects this
}

export type OutputType = "diagnosis" | "recommendation" | "score" | "alert" | "report" | "workflow";

// ============================================================================
// FRAMEWORK SELECTION LOGIC
// ============================================================================

export interface ProblemContext {
  domain: string;                      // operations, code, support, strategy, etc.
  problem_type: string;                // bottleneck, quality, decision, risk, etc.
  available_evidence: {
    has_metrics: boolean;
    has_workflow_data: boolean;
    has_financial_data: boolean;
    has_user_data: boolean;
    evidence_quality: "low" | "medium" | "high";
  };
}

export interface FrameworkMatch {
  framework: OperationalFramework;
  matching_confidence: number;         // 0-100
  evidence_fit: number;                // 0-100 (how much evidence available)
  reasoning: string;
}

/**
 * Select best frameworks for a problem
 * Returns top 3 matches ranked by confidence
 */
export function selectBestFrameworks(
  context: ProblemContext,
  allFrameworks: OperationalFramework[],
  limit: number = 3
): FrameworkMatch[] {
  const matches: FrameworkMatch[] = [];

  for (const framework of allFrameworks) {
    // Calculate domain match (0-100)
    const domainMatch = calculateDomainMatch(framework, context.domain);
    if (domainMatch < 20) continue; // Skip if domain doesn't match

    // Calculate problem type match (0-100)
    const typeMatch = calculateTypeMatch(framework, context.problem_type);
    if (typeMatch < 20) continue;

    // Calculate evidence fit (0-100)
    const evidenceFit = calculateEvidenceFit(framework, context.available_evidence);

    // Overall confidence
    const confidence = 0.4 * domainMatch + 0.3 * typeMatch + 0.3 * (framework.confidence_score || 70);

    matches.push({
      framework,
      matching_confidence: confidence,
      evidence_fit: evidenceFit,
      reasoning: generateReasoningString(framework, confidence, evidenceFit),
    });
  }

  // Sort by confidence and return top matches
  return matches.sort((a, b) => b.matching_confidence - a.matching_confidence).slice(0, limit);
}

function calculateDomainMatch(framework: OperationalFramework, contextDomain: string): number {
  // Exact domain match = 100
  if (framework.domain === contextDomain) return 100;

  // Tag match
  if (framework.domain_tags.includes(contextDomain)) return 75;

  // Partial match
  if (framework.domain.toLowerCase().includes(contextDomain.toLowerCase())) return 50;

  return 0;
}

function calculateTypeMatch(framework: OperationalFramework, problemType: string): number {
  // Check if problem type matches recommended_when
  const matches = framework.recommended_when.toLowerCase().includes(problemType.toLowerCase());
  if (matches) return 85;

  // Check in use_case
  if (framework.use_case.toLowerCase().includes(problemType.toLowerCase())) return 70;

  // Check in category
  if (framework.category.toLowerCase().includes(problemType.toLowerCase())) return 60;

  return 0;
}

function calculateEvidenceFit(
  framework: OperationalFramework,
  evidence: ProblemContext["available_evidence"]
): number {
  let fit = 0;
  let checkCount = 0;

  // Score based on required evidence availability
  for (const req of framework.required_evidence) {
    checkCount++;

    if (req.includes("metric") && evidence.has_metrics) fit += 20;
    else if (req.includes("workflow") && evidence.has_workflow_data) fit += 20;
    else if (req.includes("financial") && evidence.has_financial_data) fit += 20;
    else if (req.includes("user") && evidence.has_user_data) fit += 20;
    else if (evidence.evidence_quality === "high") fit += 15;
    else if (evidence.evidence_quality === "medium") fit += 10;
  }

  // Normalize to 0-100
  if (checkCount === 0) return 50; // No specific evidence required
  return Math.min(100, fit * (100 / (checkCount * 20)));
}

function generateReasoningString(
  framework: OperationalFramework,
  confidence: number,
  evidenceFit: number
): string {
  const pieces: string[] = [];

  pieces.push(`${framework.name} matches this problem type`);

  if (confidence >= 80) {
    pieces.push("with high confidence");
  } else if (confidence >= 60) {
    pieces.push("with moderate confidence");
  } else {
    pieces.push("with lower confidence");
  }

  if (evidenceFit >= 80) {
    pieces.push(", sufficient evidence available");
  } else if (evidenceFit >= 60) {
    pieces.push(", some evidence needed");
  } else {
    pieces.push(", more evidence recommended");
  }

  return pieces.join(" ") + ". " + framework.use_case;
}

// ============================================================================
// FRAMEWORK-TO-WORKFLOW MAPPING
// ============================================================================

export interface WorkflowCandidate {
  workflow_id: string;
  workflow_name: string;
  framework_ids: number[];
  trigger_condition: string;
  execution_steps: string[];
  output_format: string;
  success_criteria: string[];
}

/**
 * Get workflows that should run for a given framework
 */
export function getWorkflowsForFrameworks(
  frameworks: OperationalFramework[],
  workflowMap: Map<number, WorkflowCandidate[]>
): WorkflowCandidate[] {
  const workflows = new Set<WorkflowCandidate>();

  for (const framework of frameworks) {
    const candidates = workflowMap.get(framework.id) || [];
    candidates.forEach((w) => workflows.add(w));
  }

  return Array.from(workflows);
}

// ============================================================================
// FRAMEWORK CLEANUP UTILITIES
// ============================================================================

/**
 * Validate framework data for completeness
 */
export function validateFramework(framework: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!framework.id) errors.push("Missing id");
  if (!framework.name) errors.push("Missing name");
  if (!framework.domain) errors.push("Missing domain");
  if (!framework.category) errors.push("Missing category");

  // Recommended fields
  if (!framework.use_case) warnings.push("Missing use_case");
  if (!framework.recommended_when) warnings.push("Missing recommended_when");
  if (!framework.required_evidence || framework.required_evidence.length === 0)
    warnings.push("Missing required_evidence");
  if (!framework.output_type) warnings.push("Missing output_type");

  // Data quality checks
  if (framework.confidence_score && (framework.confidence_score < 0 || framework.confidence_score > 100))
    errors.push("confidence_score must be 0-100");

  if (framework.related_frameworks) {
    if (!Array.isArray(framework.related_frameworks))
      errors.push("related_frameworks must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find and merge duplicate frameworks
 */
export function findDuplicates(
  frameworks: OperationalFramework[]
): Array<{
  name: string;
  frameworks: OperationalFramework[];
  recommended_action: string;
}> {
  const byName = new Map<string, OperationalFramework[]>();

  // Group by normalized name
  for (const framework of frameworks) {
    const normalized = framework.name.toLowerCase().trim();
    if (!byName.has(normalized)) {
      byName.set(normalized, []);
    }
    byName.get(normalized)!.push(framework);
  }

  // Return groups with duplicates
  return Array.from(byName.entries())
    .filter(([, group]) => group.length > 1)
    .map(([name, group]) => ({
      name,
      frameworks: group,
      recommended_action: `Merge ${group.length} frameworks into single entry with combined tags`,
    }));
}

/**
 * Generate framework reference documentation
 */
export function generateFrameworkReference(framework: OperationalFramework): string {
  return `
## ${framework.name}

**Domain:** ${framework.domain}
**Category:** ${framework.category}
**Confidence:** ${framework.confidence_score || "N/A"}%

### Use Case
${framework.use_case}

### When to Use
${framework.recommended_when}

${framework.avoid_when ? `### When NOT to Use\n${framework.avoid_when}\n` : ""}

### Required Evidence
${framework.required_evidence.map((e) => `- ${e}`).join("\n")}

### Output Type
${framework.output_type}

${framework.related_frameworks && framework.related_frameworks.length > 0 ? `### Related Frameworks\n${framework.related_frameworks.join(", ")}\n` : ""}

${framework.related_workflows && framework.related_workflows.length > 0 ? `### Related Workflows\n${framework.related_workflows.join(", ")}\n` : ""}

${framework.phase_3_relevance ? `### Phase 3 Relevance\n${framework.phase_3_relevance}\n` : ""}
`;
}

// ============================================================================
// BATCH OPERATIONALIZATION
// ============================================================================

export async function operationalizeFrameworkDatabase(
  rawFrameworks: any[]
): Promise<{
  operational: OperationalFramework[];
  duplicates: Array<any>;
  errors: Array<{ framework: any; issues: string[] }>;
  statistics: {
    total_input: number;
    valid_output: number;
    duplicates_found: number;
    errors_found: number;
  };
}> {
  const operational: OperationalFramework[] = [];
  const errors: Array<{ framework: any; issues: string[] }> = [];

  // Validate and clean
  for (const raw of rawFrameworks) {
    const validation = validateFramework(raw);

    if (validation.valid) {
      // Add default values for missing fields
      const framework: OperationalFramework = {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        domain: raw.domain || "general",
        category: raw.category || "advisory",
        confidence_score: raw.confidence_score,
        use_case: raw.use_case || "",
        input_signals: raw.input_signals || [],
        recommended_when: raw.recommended_when || "",
        avoid_when: raw.avoid_when,
        required_evidence: raw.required_evidence || [],
        output_type: raw.output_type || "advisory",
        domain_tags: raw.domain_tags || [],
        related_frameworks: raw.related_frameworks || [],
        related_workflows: raw.related_workflows || [],
        related_functions: raw.related_functions || [],
        phase_3_relevance: raw.phase_3_relevance,
        connector_needed: raw.connector_needed,
        wrapper_relevance: raw.wrapper_relevance,
      };

      operational.push(framework);
    } else {
      errors.push({
        framework: raw,
        issues: [...validation.errors, ...validation.warnings],
      });
    }
  }

  // Find duplicates
  const duplicates = findDuplicates(operational);

  return {
    operational,
    duplicates,
    errors,
    statistics: {
      total_input: rawFrameworks.length,
      valid_output: operational.length,
      duplicates_found: duplicates.length,
      errors_found: errors.length,
    },
  };
}
