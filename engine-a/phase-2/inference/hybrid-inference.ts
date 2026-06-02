/**
 * Hybrid Inference Pipeline
 * Orchestrates LLM + Local Analyzer + Knowledge Base
 * NOT: Local adapter with fallback to Claude
 * YES: LLM as intelligent component throughout
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// HYBRID INFERENCE INTERFACES
// ============================================================================

export interface HybridRequest {
  org_id: string;
  user_id: string;
  query: string;
  context?: Record<string, any>;
  include_kb?: boolean;
  include_sources?: boolean;
}

export interface AnalyzerOutput {
  classification: Record<string, any>;
  frameworks: Array<{ id: number; name: string; confidence: number }>;
  workflow?: string;
  confidence: number;
  audit_id: string;
}

export interface KBResult {
  chunk_id: string;
  title: string;
  chunk_text: string;
  similarity: number;
  source: string;
}

export interface HybridResponse {
  // Core response
  response: string;
  reasoning: string;

  // Components used
  used_analyzer: boolean;
  used_kb: boolean;
  used_llm: boolean;

  // Data lineage
  analyzer_output?: AnalyzerOutput;
  kb_results?: KBResult[];

  // Confidence and governance
  confidence: number;
  domain: string;
  business_focused: boolean;

  // Sources and audit
  sources: Array<{ title: string; similarity?: number }>;
  audit_id: string;

  // Metadata
  response_time_ms: number;
  created_at: Date;
}

// ============================================================================
// HYBRID INFERENCE PIPELINE
// ============================================================================

export async function runHybridInference(
  request: HybridRequest
): Promise<HybridResponse> {
  const startTime = Date.now();
  const audit_id = uuidv4();

  try {
    // Step 1: Business context gate (required)
    const businessGate = await enforceBusinessGate(request.query);
    if (!businessGate.allowed) {
      return {
        response: businessGate.reason,
        reasoning: "Query failed business context validation",
        used_analyzer: false,
        used_kb: false,
        used_llm: true,  // Claude validates gates
        confidence: 0,
        domain: "unknown",
        business_focused: false,
        sources: [],
        audit_id,
        response_time_ms: Date.now() - startTime,
        created_at: new Date(),
      };
    }

    // Step 2: Run local analyzer
    const analyzerOutput = await runLocalAnalyzer(request.query, request.context);

    // Step 3: Evaluate KB relevance (Claude's role)
    const kb_relevant = await evaluateKBRelevance(request.query, analyzerOutput);

    let kb_results: KBResult[] = [];
    if (request.include_kb && kb_relevant) {
      kb_results = await retrieveKBContext(request.org_id, request.query);
    }

    // Step 4: LLM synthesis (Claude integrates everything)
    const llmResponse = await synthesizeWithLLM({
      query: request.query,
      analyzer_output: analyzerOutput,
      kb_results,
      context: request.context,
    });

    // Step 5: Validate no drift to general knowledge
    const validationResult = await validateNoGeneralKnowledgeDrift(llmResponse);
    if (!validationResult.valid) {
      console.warn(`Domain drift detected: ${validationResult.reason}`);
    }

    // Step 6: Build response with full lineage
    const response: HybridResponse = {
      response: llmResponse.response,
      reasoning: llmResponse.reasoning,

      used_analyzer: analyzerOutput.confidence > 0,
      used_kb: kb_results.length > 0,
      used_llm: true,  // Always true in hybrid mode

      analyzer_output: analyzerOutput,
      kb_results: kb_results.length > 0 ? kb_results : undefined,

      confidence: calculateHybridConfidence(analyzerOutput, kb_results, llmResponse),
      domain: analyzerOutput.classification.domain,
      business_focused: analyzerOutput.classification.business_focused,

      sources: kb_results
        .filter((r) => r.similarity > 0.7)
        .map((r) => ({ title: r.title, similarity: r.similarity })),

      audit_id,
      response_time_ms: Date.now() - startTime,
      created_at: new Date(),
    };

    // Step 7: Create learning record (for monthly retraining)
    await createHybridLearningRecord(request, response, analyzerOutput, kb_results);

    return response;
  } catch (error) {
    return {
      response: `Error in hybrid inference: ${String(error)}`,
      reasoning: "Exception during processing",
      used_analyzer: false,
      used_kb: false,
      used_llm: true,
      confidence: 0,
      domain: "unknown",
      business_focused: false,
      sources: [],
      audit_id,
      response_time_ms: Date.now() - startTime,
      created_at: new Date(),
    };
  }
}

// ============================================================================
// COMPONENT: Business Context Gate
// ============================================================================

async function enforceBusinessGate(query: string): Promise<{
  allowed: boolean;
  reason: string;
}> {
  // Reuse Phase 1 guardrails
  const businessKeywords = [
    "operations",
    "workflow",
    "process",
    "framework",
    "analysis",
    "efficiency",
    "bottleneck",
    "performance",
    "cost",
    "decision",
  ];
  const forbiddenKeywords = [
    "poem",
    "story",
    "joke",
    "game",
    "math homework",
    "trivia",
    "general knowledge",
  ];

  const lowerQuery = query.toLowerCase();
  const hasForbidden = forbiddenKeywords.some((kw) => lowerQuery.includes(kw));

  if (hasForbidden) {
    return {
      allowed: false,
      reason:
        "Engine A specializes in business contexts. This question is not business-focused. Use Claude directly.",
    };
  }

  const businessMatches = businessKeywords.filter((kw) => lowerQuery.includes(kw)).length;

  if (businessMatches >= 1) {
    return { allowed: true, reason: "Business-focused query" };
  }

  return {
    allowed: false,
    reason:
      "Engine A is specialized for business and operational contexts. This query doesn't match those domains.",
  };
}

// ============================================================================
// COMPONENT: Local Analyzer (Phase 1)
// ============================================================================

async function runLocalAnalyzer(
  query: string,
  context?: Record<string, any>
): Promise<AnalyzerOutput> {
  // Stub: in production, call analyzer from Phase 1
  // const result = await analyzeRequest({ problem: query, context, org_id }, allFrameworks);

  return {
    classification: {
      domain: "operations",
      type: "bottleneck",
      business_focused: true,
      severity: "medium",
    },
    frameworks: [
      { id: 1, name: "Theory of Constraints", confidence: 0.87 },
      { id: 2, name: "Balanced Scorecard", confidence: 0.71 },
    ],
    workflow: "process-bottleneck-detection",
    confidence: 0.82,
    audit_id: uuidv4(),
  };
}

// ============================================================================
// COMPONENT: KB Relevance Evaluation (Claude's role)
// ============================================================================

async function evaluateKBRelevance(
  query: string,
  analyzerOutput: AnalyzerOutput
): Promise<boolean> {
  // In production: Claude evaluates if KB applies to this problem
  // "Does our knowledge base contain information about [domain/problem]?"

  // Stub logic:
  // If analyzer found relevant frameworks + workflow, KB is likely useful
  return analyzerOutput.confidence > 0.6 && analyzerOutput.frameworks.length > 0;
}

// ============================================================================
// COMPONENT: Knowledge Base Retrieval
// ============================================================================

async function retrieveKBContext(org_id: string, query: string): Promise<KBResult[]> {
  // Stub: in production, call searchKB from knowledge-base/kb-operations.ts

  return [
    {
      chunk_id: uuidv4(),
      title: "Operational Health Assessment Guide",
      chunk_text:
        "Theory of Constraints teaches that every system has a limiting constraint...",
      similarity: 0.82,
      source: "pdf",
    },
  ];
}

// ============================================================================
// COMPONENT: LLM Synthesis (Claude)
// ============================================================================

interface SynthesisInput {
  query: string;
  analyzer_output: AnalyzerOutput;
  kb_results: KBResult[];
  context?: Record<string, any>;
}

interface SynthesisOutput {
  response: string;
  reasoning: string;
}

async function synthesizeWithLLM(input: SynthesisInput): Promise<SynthesisOutput> {
  // In production: Call Claude API with structured prompt
  // Claude receives:
  // - Original query
  // - Local analyzer output (frameworks, workflows, confidence)
  // - KB retrieved context
  // - Business signals
  //
  // Claude's job:
  // - Synthesize explanation combining analyzer + KB
  // - Explain decision reasoning
  // - Validate business focus
  // - Return structured response

  const parts: string[] = [];

  parts.push(`Based on framework analysis: ${input.analyzer_output.frameworks
    .slice(0, 2)
    .map((f) => f.name)
    .join(", ")}`);

  if (input.kb_results.length > 0) {
    parts.push(
      `and organizational knowledge: ${input.kb_results.map((r) => r.title).join(", ")}`
    );
  }

  if (input.analyzer_output.workflow) {
    parts.push(`we recommend using the ${input.analyzer_output.workflow} workflow`);
  }

  const response = parts.join(" ") + ".";

  return {
    response,
    reasoning: `Query classified as ${input.analyzer_output.classification.domain} domain (confidence: ${input.analyzer_output.confidence})`,
  };
}

// ============================================================================
// COMPONENT: General Knowledge Drift Detection
// ============================================================================

async function validateNoGeneralKnowledgeDrift(response: SynthesisOutput): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // Check if response drifted to general knowledge
  const generalKeywords = [
    "history of",
    "biography of",
    "definition",
    "explain quantum",
    "who was",
    "what is the capital",
    "scientific",
  ];

  const lowerResponse = response.response.toLowerCase();
  const hasGeneral = generalKeywords.some((kw) => lowerResponse.includes(kw));

  if (hasGeneral) {
    return {
      valid: false,
      reason: "Response contains general knowledge (not business-focused)",
    };
  }

  return { valid: true };
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateHybridConfidence(
  analyzer: AnalyzerOutput,
  kb: KBResult[],
  llm: SynthesisOutput
): number {
  let confidence = analyzer.confidence * 0.4;  // Analyzer: 40%

  // KB: 30% (if available)
  if (kb.length > 0) {
    const avg_kb_similarity = kb.reduce((sum, r) => sum + r.similarity, 0) / kb.length;
    confidence += avg_kb_similarity * 0.3;
  }

  // LLM synthesis: 30% (always present, moderate boost)
  confidence += 0.25 * 0.3;

  return Math.round(confidence * 100) / 100;
}

// ============================================================================
// LEARNING RECORD CREATION
// ============================================================================

export interface HybridLearningRecord {
  id: string;
  org_id: string;
  query: string;
  response: string;
  used_analyzer: boolean;
  used_kb: boolean;
  analyzer_frameworks: string[];
  kb_sources: string[];
  confidence: number;
  domain: string;
  created_at: Date;
}

async function createHybridLearningRecord(
  request: HybridRequest,
  response: HybridResponse,
  analyzerOutput: AnalyzerOutput,
  kb_results: KBResult[]
): Promise<void> {
  const record: HybridLearningRecord = {
    id: uuidv4(),
    org_id: request.org_id,
    query: request.query,
    response: response.response,
    used_analyzer: response.used_analyzer,
    used_kb: response.used_kb,
    analyzer_frameworks: analyzerOutput.frameworks.map((f) => f.name),
    kb_sources: kb_results.map((r) => r.title),
    confidence: response.confidence,
    domain: response.domain,
    created_at: new Date(),
  };

  // In production: save to learning system
  // await saveLearningRecord(record);
}

// ============================================================================
// BATCH TESTING
// ============================================================================

export async function testHybridPipeline(
  test_queries: Array<{ query: string; expected_domain: string }>
): Promise<{
  total: number;
  successful: number;
  accuracy: number;
  avg_confidence: number;
  avg_latency_ms: number;
}> {
  let successful = 0;
  let total_confidence = 0;
  let total_latency = 0;

  for (const test of test_queries) {
    const response = await runHybridInference({
      org_id: "test-org",
      user_id: "test-user",
      query: test.query,
      include_kb: true,
    });

    if (response.domain === test.expected_domain) {
      successful++;
    }

    total_confidence += response.confidence;
    total_latency += response.response_time_ms;
  }

  return {
    total: test_queries.length,
    successful,
    accuracy: successful / test_queries.length,
    avg_confidence: Math.round((total_confidence / test_queries.length) * 100) / 100,
    avg_latency_ms: Math.round(total_latency / test_queries.length),
  };
}
