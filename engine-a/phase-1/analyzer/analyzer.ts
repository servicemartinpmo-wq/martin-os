/**
 * Lightweight Analyzer
 * POST /engine-a/analyze endpoint
 * Classifies problem → selects frameworks → routes to workflow
 * No LLM calls, pure structured analysis
 */

import { v4 as uuidv4 } from "uuid";
import { selectBestFrameworks, OperationalFramework } from "../framework/framework-operationalization";
import { PRIORITY_WORKFLOWS, OperationalWorkflow } from "../workflows/workflow-operationalization";
import { enforceBusinessContextGate } from "../guardrails/business-guardrails";

// ============================================================================
// ANALYZER REQUEST/RESPONSE
// ============================================================================

export interface AnalyzerRequest {
  problem: string;
  context: Record<string, any>;
  org_id: string;
}

export interface FrameworkResult {
  id: number;
  name: string;
  confidence: number;
}

export interface AnalyzerResponse {
  result: {
    classification: ProblemClassification;
    frameworks: FrameworkResult[];
    workflow: string | null;
    recommendations: string[];
  };
  confidence: number;
  audit_id: string;
  error?: string;
}

export interface ProblemClassification {
  domain: string;
  type: string;
  business_focused: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  allowed_domains: string[];
}

export interface LearningRecord {
  id: string;
  date: Date;
  source_app: string;
  source_type: string;
  org_context: {
    org_id: string;
  };
  input: string;
  action_taken: string;
  output: any;
  engine_a_asset_candidates: {
    framework?: string;
    workflow?: string;
  };
  scores: {
    confidence: number;
    risk: number;
    business_impact: number;
  };
}

// ============================================================================
// PROBLEM CLASSIFICATION
// ============================================================================

function classifyProblem(input: string): ProblemClassification {
  const lowerInput = input.toLowerCase();

  // Determine domain
  let domain = "unknown";
  if (
    lowerInput.includes("workflow") ||
    lowerInput.includes("process") ||
    lowerInput.includes("bottleneck") ||
    lowerInput.includes("efficiency")
  ) {
    domain = "operations";
  } else if (
    lowerInput.includes("bug") ||
    lowerInput.includes("error") ||
    lowerInput.includes("deploy") ||
    lowerInput.includes("code")
  ) {
    domain = "technical";
  } else if (lowerInput.includes("support") || lowerInput.includes("customer")) {
    domain = "support";
  } else if (
    lowerInput.includes("revenue") ||
    lowerInput.includes("cost") ||
    lowerInput.includes("strategy") ||
    lowerInput.includes("decision")
  ) {
    domain = "business";
  }

  // Determine problem type
  let type = "general";
  if (lowerInput.includes("bottleneck") || lowerInput.includes("constraint")) {
    type = "bottleneck";
  } else if (lowerInput.includes("root cause") || lowerInput.includes("why")) {
    type = "diagnosis";
  } else if (lowerInput.includes("priorit")) {
    type = "prioritization";
  } else if (lowerInput.includes("risk")) {
    type = "risk";
  } else if (lowerInput.includes("health") || lowerInput.includes("assess")) {
    type = "assessment";
  }

  // Determine severity
  let severity: "low" | "medium" | "high" | "critical" = "medium";
  if (
    lowerInput.includes("critical") ||
    lowerInput.includes("urgent") ||
    lowerInput.includes("blocked")
  ) {
    severity = "critical";
  } else if (
    lowerInput.includes("high") ||
    lowerInput.includes("significant") ||
    lowerInput.includes("major")
  ) {
    severity = "high";
  } else if (lowerInput.includes("low") || lowerInput.includes("minor")) {
    severity = "low";
  }

  // Check business focus (will be enforced by gate)
  const businessFocused =
    domain !== "unknown" ||
    lowerInput.includes("business") ||
    lowerInput.includes("operation") ||
    lowerInput.includes("workflow");

  return {
    domain,
    type,
    business_focused: businessFocused,
    severity,
    allowed_domains: ["operations", "technical", "support", "business", "diagnostics"],
  };
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

function calculateConfidence(
  frameworks: any[],
  classification: ProblemClassification
): number {
  if (frameworks.length === 0) return 0;

  const avgFrameworkConfidence =
    frameworks.reduce((sum, f) => sum + f.matching_confidence, 0) / frameworks.length;

  // Boost confidence if domain is well-known
  let domainBoost = 1.0;
  if (classification.domain !== "unknown") {
    domainBoost = 1.1;
  }

  // Reduce confidence if low evidence fit
  let evidenceAdjustment = 1.0;
  const avgEvidenceFit =
    frameworks.reduce((sum, f) => sum + f.evidence_fit, 0) / frameworks.length;
  if (avgEvidenceFit < 50) {
    evidenceAdjustment = 0.8;
  }

  const confidence = Math.min(1.0, (avgFrameworkConfidence / 100) * domainBoost * evidenceAdjustment);
  return Math.round(confidence * 100) / 100;
}

function assessRisk(classification: ProblemClassification): number {
  const severityScores: Record<string, number> = {
    low: 0.2,
    medium: 0.5,
    high: 0.75,
    critical: 0.95,
  };

  return severityScores[classification.severity || "medium"] || 0.5;
}

function mapBusinessImpact(classification: ProblemClassification): number {
  const domainImpact: Record<string, number> = {
    operations: 0.9,
    business: 0.95,
    support: 0.7,
    technical: 0.6,
    unknown: 0.3,
  };

  return domainImpact[classification.domain] || 0.3;
}

// ============================================================================
// WORKFLOW SELECTION
// ============================================================================

function selectWorkflowForFrameworks(
  frameworks: OperationalFramework[],
  classification: ProblemClassification
): OperationalWorkflow | null {
  // Match workflows by domain and type
  const candidates = PRIORITY_WORKFLOWS.filter((w) => w.domain === classification.domain);

  if (candidates.length === 0) {
    return null;
  }

  // Rank by relevance to problem type
  const ranked = candidates.sort((a, b) => {
    const aMatch =
      a.description.toLowerCase().includes(classification.type.toLowerCase()) ? 1 : 0;
    const bMatch =
      b.description.toLowerCase().includes(classification.type.toLowerCase()) ? 1 : 0;
    return bMatch - aMatch;
  });

  return ranked[0] || null;
}

// ============================================================================
// MAIN ANALYZER FUNCTION
// ============================================================================

export async function analyzeRequest(
  request: AnalyzerRequest,
  allFrameworks: OperationalFramework[]
): Promise<AnalyzerResponse> {
  const auditId = uuidv4();

  try {
    // Step 1: Validate business context
    const gateResult = enforceBusinessContextGate(request.problem);
    if (!gateResult.allowed) {
      return {
        result: {
          classification: {
            domain: "unknown",
            type: "rejected",
            business_focused: false,
            allowed_domains: [],
          },
          frameworks: [],
          workflow: null,
          recommendations: [gateResult.reason],
        },
        confidence: 0,
        audit_id: auditId,
        error: gateResult.reason,
      };
    }

    // Step 2: Classify problem
    const classification = classifyProblem(request.problem);

    // Step 3: Retrieve relevant frameworks
    const frameworkMatches = selectBestFrameworks(
      {
        domain: classification.domain,
        problem_type: classification.type,
        available_evidence: {
          has_metrics: request.context.has_metrics !== false,
          has_workflow_data: request.context.has_workflow_data !== false,
          has_financial_data: request.context.has_financial_data !== false,
          has_user_data: request.context.has_user_data !== false,
          evidence_quality: request.context.evidence_quality || "medium",
        },
      },
      allFrameworks,
      3
    );

    const frameworks: FrameworkResult[] = frameworkMatches.map((match) => ({
      id: match.framework.id,
      name: match.framework.name,
      confidence: Math.round(match.matching_confidence),
    }));

    // Step 4: Select applicable workflow
    const workflow = selectWorkflowForFrameworks(
      frameworkMatches.map((m) => m.framework),
      classification
    );

    // Step 5: Score confidence and risk
    const confidence = calculateConfidence(frameworkMatches, classification);
    const risk = assessRisk(classification);
    const businessImpact = mapBusinessImpact(classification);

    // Step 6: Generate recommendations
    const recommendations: string[] = [];

    if (confidence >= 0.85) {
      recommendations.push(`High confidence in ${framework?.name || "approach"}`);
      if (workflow) {
        recommendations.push(`Proceed with ${workflow.name} workflow`);
      }
    } else if (confidence >= 0.6) {
      recommendations.push("Moderate confidence - verify with additional context");
      if (frameworks.length > 0) {
        recommendations.push(`Consider multiple frameworks: ${frameworks.map((f) => f.name).join(", ")}`);
      }
    } else {
      recommendations.push("Low confidence - insufficient evidence or unclear problem scope");
      recommendations.push("Provide more context or consult domain expert");
    }

    if (risk > 0.7) {
      recommendations.push(`⚠️  High risk detected: ${classification.severity} severity`);
    }

    // Step 7: Create learning record
    const learningRecord: LearningRecord = {
      id: auditId,
      date: new Date(),
      source_app: "engine-a-analyzer",
      source_type: "analyzer_request",
      org_context: { org_id: request.org_id },
      input: request.problem,
      action_taken: "framework_matching",
      output: {
        classification,
        frameworks: frameworks.map((f) => f.name),
        workflow: workflow?.workflow_id || null,
      },
      engine_a_asset_candidates: {
        framework: frameworks[0]?.name,
        workflow: workflow?.workflow_id,
      },
      scores: {
        confidence,
        risk,
        business_impact: businessImpact,
      },
    };

    // In production, save to database
    // await saveLearningRecord(learningRecord);

    // Step 8: Return result with audit trail
    return {
      result: {
        classification,
        frameworks,
        workflow: workflow?.workflow_id || null,
        recommendations,
      },
      confidence,
      audit_id: auditId,
    };
  } catch (error) {
    return {
      result: {
        classification: {
          domain: "unknown",
          type: "error",
          business_focused: false,
          allowed_domains: [],
        },
        frameworks: [],
        workflow: null,
        recommendations: [],
      },
      confidence: 0,
      audit_id: auditId,
      error: `Analyzer error: ${String(error)}`,
    };
  }
}

// ============================================================================
// BATCH TESTING
// ============================================================================

export async function testAnalyzerOnProblems(
  problems: Array<{ problem: string; expected_domain?: string }>,
  allFrameworks: OperationalFramework[]
): Promise<{
  total: number;
  correct: number;
  accuracy: number;
  results: Array<{
    problem: string;
    classified_as: string;
    expected: string;
    correct: boolean;
    confidence: number;
  }>;
}> {
  const results = [];
  let correct = 0;

  for (const test of problems) {
    const response = await analyzeRequest(
      {
        problem: test.problem,
        context: { evidence_quality: "medium" },
        org_id: "test-org",
      },
      allFrameworks
    );

    const classified = response.result.classification.domain;
    const expected = test.expected_domain || classified;
    const isCorrect = classified === expected;

    if (isCorrect) correct++;

    results.push({
      problem: test.problem.substring(0, 80),
      classified_as: classified,
      expected,
      correct: isCorrect,
      confidence: response.confidence,
    });
  }

  return {
    total: problems.length,
    correct,
    accuracy: correct / problems.length,
    results,
  };
}
