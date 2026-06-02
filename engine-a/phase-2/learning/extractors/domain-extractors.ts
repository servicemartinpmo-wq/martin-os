/**
 * Domain Extractors
 * Extract learning records from each app domain
 */

import { LearningRecord } from "../schemas/LearningRecord";
import { v4 as uuidv4 } from "uuid";

// Helper: Estimate Claude API cost
function estimateClaudeCost(text: string): number {
  // Rough estimate: ~1400 tokens per 1000 chars
  // ~$0.003 per 1k input tokens (Claude 3 pricing)
  const tokens = Math.ceil(text.length / 0.7 / 1000);
  return tokens * 0.003;
}

// ============================================================================
// SUPPORT DOMAIN EXTRACTOR
// ============================================================================

export interface SupportCase {
  id: string;
  created_at: Date;
  summary: string;
  description: string;
  resolution_summary: string;
  resolution_text: string;
  status: "open" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  tags: string[];
  user_id: string;
  resolution_type: string;
  resolution_time_minutes: number;
}

export async function extractSupportCases(
  supportCases: SupportCase[],
  limit: number = 200
): Promise<LearningRecord[]> {
  const resolved = supportCases.filter((c) => c.status === "resolved").slice(0, limit);

  return resolved.map((case_) => ({
    id: `support-${case_.id}`,
    timestamp: case_.created_at,
    domain: "support" as const,

    // What happened
    input: case_.summary, // "Can't deploy code"
    context: {
      user_id: case_.user_id,
      severity: case_.severity,
      category: case_.category,
      tags: case_.tags,
      description: case_.description,
    },

    action: case_.resolution_type, // "Guided user through logs"
    output: case_.resolution_summary,

    // Quality signals
    accepted: case_.status === "resolved",
    latency_ms: case_.resolution_time_minutes * 60000,
    cost_cents: estimateClaudeCost(case_.resolution_text) * 100,

    // Learning signals
    tags: [case_.category, ...case_.tags],
    quality_score: 0, // Will be scored manually
    reusable: true,

    notes: `Severity: ${case_.severity}`,
    created_at: case_.created_at,
  }));
}

// ============================================================================
// CODE DOMAIN EXTRACTOR
// ============================================================================

export interface CodeSession {
  id: string;
  created_at: Date;
  description: string;
  duration_minutes: number;
  ai_text_generated: string;
  files_changed: CodeFile[];
  tests_run: CodeTest[];
}

export interface CodeFile {
  path: string;
  language: string;
  diff: string;
  lines_added: number;
  lines_removed: number;
}

export interface CodeTest {
  name: string;
  passed: boolean;
  is_new: boolean;
  error?: string;
}

function detectLanguage(files: CodeFile[]): string {
  const languages = files.map((f) => f.language);
  const counts = languages.reduce(
    (acc, lang) => ({ ...acc, [lang]: (acc[lang] || 0) + 1 }),
    {} as Record<string, number>
  );
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || "unknown";
}

function extractFunctions(files: CodeFile[]): string[] {
  const functions: string[] = [];
  files.forEach((file) => {
    // Simplified: extract function names from diff
    const funcPattern = /^\+.*function\s+(\w+)/gm;
    let match;
    while ((match = funcPattern.exec(file.diff)) !== null) {
      functions.push(match[1]);
    }
  });
  return functions;
}

export async function extractCodeSessions(
  codeSessions: CodeSession[],
  limit: number = 150
): Promise<LearningRecord[]> {
  return codeSessions.slice(0, limit).map((session) => {
    const files = session.files_changed;
    const tests = session.tests_run;
    const passedTests = tests.filter((t) => t.passed).length;
    const testPassRate = tests.length > 0 ? passedTests / tests.length : 0;

    return {
      id: `code-${session.id}`,
      timestamp: session.created_at,
      domain: "code" as const,

      input: session.description, // "Fix infinite loop in auth"
      context: {
        language: detectLanguage(files),
        file_count: files.length,
        functions_changed: extractFunctions(files),
        tests_added: tests.filter((t) => t.is_new).length,
        test_pass_rate: testPassRate,
        lines_added: files.reduce((sum, f) => sum + f.lines_added, 0),
        lines_removed: files.reduce((sum, f) => sum + f.lines_removed, 0),
      },

      action: "Code workspace + manual edits",
      output: files.map((f) => f.diff).join("\n").substring(0, 1000), // Truncate

      accepted: tests.length > 0 && testPassRate > 0.8,
      latency_ms: session.duration_minutes * 60000,
      cost_cents: estimateClaudeCost(session.ai_text_generated) * 100,

      tags: [detectLanguage(files), tests.length > 2 ? "tested" : "untested"],
      quality_score: 0,
      reusable: tests.length > 2, // Only reusable if tested

      notes: `Tests: ${passedTests}/${tests.length} passing`,
      created_at: session.created_at,
    };
  });
}

// ============================================================================
// AUTOMATION DOMAIN EXTRACTOR
// ============================================================================

export interface AutomationRun {
  id: string;
  created_at: Date;
  trigger_description: string;
  trigger_type: string;
  status: "completed" | "failed" | "pending";
  duration_ms: number;
  steps: AutomationStep[];
}

export interface AutomationStep {
  action: string;
  service: string;
  input: string;
  output: string;
}

export async function extractAutomationRuns(
  runs: AutomationRun[],
  limit: number = 200
): Promise<LearningRecord[]> {
  return runs.slice(0, limit).map((run) => ({
    id: `automation-${run.id}`,
    timestamp: run.created_at,
    domain: "automation" as const,

    input: run.trigger_description, // "Every Monday, summarize week"
    context: {
      trigger_type: run.trigger_type,
      action_count: run.steps.length,
      integrations: run.steps.map((s) => s.service),
      status: run.status,
    },

    action: `${run.steps.length} steps automated`,
    output: run.steps
      .map((s) => `${s.action}: ${s.input} → ${s.output}`)
      .join("\n")
      .substring(0, 1000),

    accepted: run.status === "completed",
    latency_ms: run.duration_ms,
    cost_cents: 0, // Automations don't cost extra

    tags: [run.trigger_type, ...run.steps.map((s) => s.service)],
    quality_score: 0,
    reusable: run.steps.length >= 2,

    notes: `${run.steps.length} step workflow`,
    created_at: run.created_at,
  }));
}

// ============================================================================
// BUSINESS DOMAIN EXTRACTOR
// ============================================================================

export interface BusinessOKR {
  id: string;
  created_at: Date;
  objective: string;
  period: string;
  owner_id: string;
  completed_at?: Date;
  key_results?: KeyResult[];
}

export interface KeyResult {
  key_result: string;
  target_value: string;
}

export async function extractBusinessRecords(
  okrs: BusinessOKR[],
  limit: number = 50
): Promise<LearningRecord[]> {
  return okrs.slice(0, limit).map((okr) => ({
    id: `business-${okr.id}`,
    timestamp: okr.created_at,
    domain: "business" as const,

    input: okr.objective, // "Become top 3 provider"
    context: {
      period: okr.period,
      key_results_count: okr.key_results?.length || 0,
      owner: okr.owner_id,
    },

    action: "Set OKR",
    output: (okr.key_results || [])
      .map((kr) => `${kr.key_result}: ${kr.target_value}`)
      .join("\n"),

    accepted: !!okr.completed_at,
    latency_ms: 0,
    cost_cents: 0,

    tags: ["okr", okr.period],
    quality_score: 0,
    reusable: true,

    notes: `Owner: ${okr.owner_id}`,
    created_at: okr.created_at,
  }));
}

// ============================================================================
// UNIFIED EXTRACTOR
// ============================================================================

export interface AllDomainData {
  support: SupportCase[];
  code: CodeSession[];
  automation: AutomationRun[];
  business: BusinessOKR[];
}

export async function extractAllDomains(data: AllDomainData): Promise<LearningRecord[]> {
  const records = await Promise.all([
    extractSupportCases(data.support, 200),
    extractCodeSessions(data.code, 150),
    extractAutomationRuns(data.automation, 200),
    extractBusinessRecords(data.business, 50),
  ]);

  return records.flat();
}

// ============================================================================
// SCORING UTILITIES
// ============================================================================

export interface ScoredRecord extends LearningRecord {
  quality_score: number;
}

export function scoreRecords(
  records: LearningRecord[],
  minQuality: number = 60
): { scored: ScoredRecord[]; passed: ScoredRecord[] } {
  // In production, this would have a UI for manual scoring
  // For now, auto-score based on signals:

  const scored: ScoredRecord[] = records.map((record) => {
    let score = 50; // Base score

    // Acceptance bonus
    if (record.accepted) score += 20;

    // Clarity bonus
    if (record.input.length > 20) score += 5;

    // Cost efficiency bonus (lower cost = better)
    if (record.cost_cents < 5) score += 10;

    // Speed bonus
    if (record.latency_ms < 5000) score += 10;

    // Domain-specific bonuses
    if (record.domain === "code" && record.context?.test_pass_rate > 0.8) score += 15;
    if (record.domain === "automation" && record.context?.action_count > 2) score += 10;
    if (record.domain === "support" && record.context?.severity === "critical") score += 10;

    return { ...record, quality_score: Math.min(100, score) };
  });

  const passed = scored.filter((r) => r.quality_score >= minQuality);

  return { scored, passed };
}
