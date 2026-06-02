/**
 * Phase 1 Learning Consolidation
 * Weekly and monthly pattern extraction from learning records
 * Foundation for Phase 2 retraining pipeline
 */

// ============================================================================
// CONSOLIDATION INTERFACES
// ============================================================================

export interface LearningRecordSample {
  id: string;
  org_id: string;
  created_at: Date;
  input: string;
  action_taken: string;
  output: Record<string, any>;
  engine_a_asset_candidates: {
    framework?: string;
    workflow?: string;
  };
  scores: {
    confidence: number;
    risk: number;
    business_impact: number;
  };
  reusable_pattern: boolean;
  accepted?: boolean;
  quality_score: number;
}

export interface FrameworkStat {
  framework: string;
  usage_count: number;
  avg_confidence: number;
  success_rate: number;
  top_patterns: string[];
  avg_execution_time?: number;
}

export interface WorkflowStat {
  workflow: string;
  executions: number;
  avg_execution_time: number;
  success_rate: number;
  avg_confidence: number;
}

export interface DomainDistribution {
  operations: number;
  technical: number;
  support: number;
  business: number;
  unknown: number;
}

export interface WeeklyConsolidation {
  week_start: Date;
  week_end: Date;
  total_records: number;
  business_focused_records: number;
  framework_stats: FrameworkStat[];
  workflow_stats: WorkflowStat[];
  domain_distribution: DomainDistribution;
  insights: string[];
  metrics: {
    avg_confidence: number;
    success_rate: number;
    business_focus_rate: number;
  };
}

export interface MonthlyConsolidation {
  month: Date;
  total_records: number;
  avg_confidence: number;
  success_rate: number;
  top_frameworks: Array<{ framework: string; usage_count: number; success_rate: number }>;
  top_workflows: Array<{ workflow: string; executions: number; success_rate: number }>;
  trends: {
    confidence_trend: "improving" | "stable" | "declining";
    success_trend: "improving" | "stable" | "declining";
    volume_trend: "increasing" | "stable" | "decreasing";
  };
  high_quality_records: number;
  retraining_candidates: number;
  monthly_insights: string[];
}

// ============================================================================
// WEEKLY CONSOLIDATION
// ============================================================================

export function consolidateWeekly(records: LearningRecordSample[]): WeeklyConsolidation {
  if (records.length === 0) {
    return {
      week_start: new Date(),
      week_end: new Date(),
      total_records: 0,
      business_focused_records: 0,
      framework_stats: [],
      workflow_stats: [],
      domain_distribution: { operations: 0, technical: 0, support: 0, business: 0, unknown: 0 },
      insights: ["No records for period"],
      metrics: { avg_confidence: 0, success_rate: 0, business_focus_rate: 0 },
    };
  }

  // Get date range from records
  const sortedByDate = records.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const week_start = sortedByDate[0].created_at;
  const week_end = sortedByDate[sortedByDate.length - 1].created_at;

  // Calculate framework statistics
  const byFramework = new Map<string, LearningRecordSample[]>();
  records.forEach((r) => {
    if (r.engine_a_asset_candidates.framework) {
      const key = r.engine_a_asset_candidates.framework;
      if (!byFramework.has(key)) byFramework.set(key, []);
      byFramework.get(key)!.push(r);
    }
  });

  const framework_stats: FrameworkStat[] = Array.from(byFramework.entries())
    .map(([framework, recs]) => ({
      framework,
      usage_count: recs.length,
      avg_confidence: recs.reduce((sum, r) => sum + r.scores.confidence, 0) / recs.length,
      success_rate: recs.filter((r) => r.accepted).length / recs.length,
      top_patterns: extractTopPatterns(recs, 3),
      avg_execution_time: recs
        .filter((r) => r.output.execution_time_ms)
        .reduce((sum, r) => sum + (r.output.execution_time_ms || 0), 0) / recs.length,
    }))
    .sort((a, b) => b.usage_count - a.usage_count);

  // Calculate workflow statistics
  const byWorkflow = new Map<string, LearningRecordSample[]>();
  records.forEach((r) => {
    if (r.engine_a_asset_candidates.workflow) {
      const key = r.engine_a_asset_candidates.workflow;
      if (!byWorkflow.has(key)) byWorkflow.set(key, []);
      byWorkflow.get(key)!.push(r);
    }
  });

  const workflow_stats: WorkflowStat[] = Array.from(byWorkflow.entries())
    .map(([workflow, recs]) => ({
      workflow,
      executions: recs.length,
      avg_execution_time: recs
        .filter((r) => r.output.execution_time_ms)
        .reduce((sum, r) => sum + (r.output.execution_time_ms || 0), 0) / recs.length,
      success_rate: recs.filter((r) => r.accepted).length / recs.length,
      avg_confidence: recs.reduce((sum, r) => sum + r.scores.confidence, 0) / recs.length,
    }))
    .sort((a, b) => b.executions - a.executions);

  // Domain distribution
  const domain_distribution: DomainDistribution = {
    operations: 0,
    technical: 0,
    support: 0,
    business: 0,
    unknown: 0,
  };

  // (Would parse from input or output in real implementation)
  // For now, estimate from action_taken
  records.forEach((r) => {
    if (r.action_taken.includes("operations") || r.action_taken.includes("workflow")) {
      domain_distribution.operations++;
    } else if (r.action_taken.includes("technical") || r.action_taken.includes("code")) {
      domain_distribution.technical++;
    } else if (r.action_taken.includes("support")) {
      domain_distribution.support++;
    } else if (r.action_taken.includes("business") || r.action_taken.includes("strategy")) {
      domain_distribution.business++;
    } else {
      domain_distribution.unknown++;
    }
  });

  // Calculate metrics
  const avg_confidence = records.reduce((sum, r) => sum + r.scores.confidence, 0) / records.length;
  const success_rate = records.filter((r) => r.accepted).length / records.length;
  const business_focused_records = records.filter((r) => r.scores.business_impact > 0.5).length;

  // Generate insights
  const insights = generateWeeklyInsights(
    framework_stats,
    workflow_stats,
    avg_confidence,
    success_rate
  );

  return {
    week_start,
    week_end,
    total_records: records.length,
    business_focused_records,
    framework_stats,
    workflow_stats,
    domain_distribution,
    insights,
    metrics: {
      avg_confidence,
      success_rate,
      business_focus_rate: business_focused_records / records.length,
    },
  };
}

function extractTopPatterns(records: LearningRecordSample[], limit: number): string[] {
  const patterns = new Map<string, number>();

  records.forEach((r) => {
    // Extract keywords from input
    const keywords = r.input.toLowerCase().split(/\s+/).slice(0, 10);
    keywords.forEach((kw) => {
      if (kw.length > 3) {
        patterns.set(kw, (patterns.get(kw) || 0) + 1);
      }
    });
  });

  return Array.from(patterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pattern]) => pattern);
}

function generateWeeklyInsights(
  frameworks: FrameworkStat[],
  workflows: WorkflowStat[],
  avg_confidence: number,
  success_rate: number
): string[] {
  const insights: string[] = [];

  // Top framework insight
  if (frameworks.length > 0) {
    const top = frameworks[0];
    insights.push(
      `🎯 Most used framework: ${top.framework} (${top.usage_count} times, ${(top.success_rate * 100).toFixed(0)}% success)`
    );
  }

  // Confidence insight
  if (avg_confidence > 0.85) {
    insights.push("✅ High confidence in framework selection (>0.85)");
  } else if (avg_confidence < 0.6) {
    insights.push("⚠️  Low confidence in framework selection (<0.60) - need more context");
  }

  // Success insight
  if (success_rate > 0.9) {
    insights.push("✅ High user acceptance rate (>90%)");
  } else if (success_rate < 0.7) {
    insights.push("⚠️  Lower acceptance rate (<70%) - review framework relevance");
  }

  // Workflow insight
  if (workflows.length > 0) {
    const topWorkflow = workflows[0];
    insights.push(
      `📊 Most executed workflow: ${topWorkflow.workflow} (${topWorkflow.executions} times)`
    );
  }

  return insights;
}

// ============================================================================
// MONTHLY CONSOLIDATION
// ============================================================================

export function consolidateMonthly(weekly: WeeklyConsolidation[]): MonthlyConsolidation {
  if (weekly.length === 0) {
    return {
      month: new Date(),
      total_records: 0,
      avg_confidence: 0,
      success_rate: 0,
      top_frameworks: [],
      top_workflows: [],
      trends: { confidence_trend: "stable", success_trend: "stable", volume_trend: "stable" },
      high_quality_records: 0,
      retraining_candidates: 0,
      monthly_insights: ["No data for period"],
    };
  }

  // Aggregate all records from all weeks
  const total_records = weekly.reduce((sum, w) => sum + w.total_records, 0);
  const totalConfidence = weekly.reduce((sum, w) => sum + w.metrics.avg_confidence * w.total_records, 0);
  const avg_confidence = total_records > 0 ? totalConfidence / total_records : 0;

  const totalSuccesses = weekly.reduce(
    (sum, w) => sum + (w.metrics.success_rate * w.total_records),
    0
  );
  const success_rate = total_records > 0 ? totalSuccesses / total_records : 0;

  // Aggregate framework stats
  const frameworkMap = new Map<string, FrameworkStat>();
  weekly.forEach((w) => {
    w.framework_stats.forEach((f) => {
      if (!frameworkMap.has(f.framework)) {
        frameworkMap.set(f.framework, { ...f, usage_count: 0, avg_confidence: 0, success_rate: 0 });
      } else {
        const existing = frameworkMap.get(f.framework)!;
        existing.usage_count += f.usage_count;
        existing.avg_confidence = (existing.avg_confidence + f.avg_confidence) / 2;
        existing.success_rate = (existing.success_rate + f.success_rate) / 2;
      }
    });
  });

  const top_frameworks = Array.from(frameworkMap.values())
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5)
    .map((f) => ({
      framework: f.framework,
      usage_count: f.usage_count,
      success_rate: f.success_rate,
    }));

  // Aggregate workflow stats
  const workflowMap = new Map<string, WorkflowStat>();
  weekly.forEach((w) => {
    w.workflow_stats.forEach((wf) => {
      if (!workflowMap.has(wf.workflow)) {
        workflowMap.set(wf.workflow, { ...wf, executions: 0 });
      } else {
        const existing = workflowMap.get(wf.workflow)!;
        existing.executions += wf.executions;
      }
    });
  });

  const top_workflows = Array.from(workflowMap.values())
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5)
    .map((w) => ({
      workflow: w.workflow,
      executions: w.executions,
      success_rate: w.success_rate,
    }));

  // Calculate trends (compare first and last week)
  const firstWeek = weekly[0];
  const lastWeek = weekly[weekly.length - 1];

  const confidence_trend: "improving" | "stable" | "declining" =
    lastWeek.metrics.avg_confidence > firstWeek.metrics.avg_confidence + 0.05
      ? "improving"
      : lastWeek.metrics.avg_confidence < firstWeek.metrics.avg_confidence - 0.05
        ? "declining"
        : "stable";

  const success_trend: "improving" | "stable" | "declining" =
    lastWeek.metrics.success_rate > firstWeek.metrics.success_rate + 0.05
      ? "improving"
      : lastWeek.metrics.success_rate < firstWeek.metrics.success_rate - 0.05
        ? "declining"
        : "stable";

  const volume_trend: "increasing" | "stable" | "decreasing" =
    lastWeek.total_records > firstWeek.total_records * 1.1
      ? "increasing"
      : lastWeek.total_records < firstWeek.total_records * 0.9
        ? "decreasing"
        : "stable";

  // Estimate high-quality records and retraining candidates
  const high_quality_records = Math.round(total_records * (success_rate > 0.8 ? 0.8 : success_rate));
  const retraining_candidates = Math.round(high_quality_records * 0.6);

  // Generate monthly insights
  const monthly_insights = generateMonthlyInsights(
    top_frameworks,
    top_workflows,
    avg_confidence,
    success_rate,
    { confidence_trend, success_trend, volume_trend }
  );

  return {
    month: new Date(),
    total_records,
    avg_confidence,
    success_rate,
    top_frameworks,
    top_workflows,
    trends: { confidence_trend, success_trend, volume_trend },
    high_quality_records,
    retraining_candidates,
    monthly_insights,
  };
}

function generateMonthlyInsights(
  topFrameworks: Array<{ framework: string; usage_count: number; success_rate: number }>,
  topWorkflows: Array<{ workflow: string; executions: number; success_rate: number }>,
  avg_confidence: number,
  success_rate: number,
  trends: any
): string[] {
  const insights: string[] = [];

  if (topFrameworks.length > 0) {
    insights.push(
      `📈 Top frameworks: ${topFrameworks
        .slice(0, 3)
        .map((f) => `${f.framework} (${f.usage_count}×)`)
        .join(", ")}`
    );
  }

  if (topWorkflows.length > 0) {
    insights.push(
      `⚙️  Most executed: ${topWorkflows[0].workflow} (${topWorkflows[0].executions} times)`
    );
  }

  insights.push(`📊 Monthly stats: ${avg_confidence.toFixed(2)} avg confidence, ${(success_rate * 100).toFixed(0)}% success rate`);

  if (trends.confidence_trend === "improving") {
    insights.push("✨ Confidence is improving - framework selection getting better");
  } else if (trends.confidence_trend === "declining") {
    insights.push("⚠️  Confidence declining - may need framework updates");
  }

  if (trends.volume_trend === "increasing") {
    insights.push("📈 Usage increasing - Engine A gaining adoption");
  }

  return insights;
}

// ============================================================================
// CONSOLIDATION REPORT FORMATTING
// ============================================================================

export function formatWeeklyReport(consolidation: WeeklyConsolidation): string {
  return `
## Weekly Consolidation: ${consolidation.week_start.toDateString()} - ${consolidation.week_end.toDateString()}

**Summary:**
- Total Records: ${consolidation.total_records}
- Business Focused: ${consolidation.business_focused_records} (${(consolidation.metrics.business_focus_rate * 100).toFixed(0)}%)
- Avg Confidence: ${consolidation.metrics.avg_confidence.toFixed(2)}
- Success Rate: ${(consolidation.metrics.success_rate * 100).toFixed(0)}%

**Top Frameworks:**
${consolidation.framework_stats
  .slice(0, 5)
  .map((f) => `- ${f.framework}: ${f.usage_count}× (${(f.success_rate * 100).toFixed(0)}% success)`)
  .join("\n")}

**Top Workflows:**
${consolidation.workflow_stats
  .slice(0, 5)
  .map((w) => `- ${w.workflow}: ${w.executions}× (${(w.success_rate * 100).toFixed(0)}% success)`)
  .join("\n")}

**Insights:**
${consolidation.insights.map((i) => `- ${i}`).join("\n")}
`;
}

export function formatMonthlyReport(consolidation: MonthlyConsolidation): string {
  return `
## Monthly Consolidation: ${consolidation.month.toDateString()}

**Summary:**
- Total Records: ${consolidation.total_records}
- Avg Confidence: ${consolidation.avg_confidence.toFixed(2)}
- Success Rate: ${(consolidation.success_rate * 100).toFixed(0)}%
- High Quality Records: ${consolidation.high_quality_records}
- Retraining Candidates: ${consolidation.retraining_candidates}

**Top Frameworks (Month):**
${consolidation.top_frameworks
  .map((f) => `- ${f.framework}: ${f.usage_count}× (${(f.success_rate * 100).toFixed(0)}% success)`)
  .join("\n")}

**Top Workflows (Month):**
${consolidation.top_workflows
  .map((w) => `- ${w.workflow}: ${w.executions}× (${(w.success_rate * 100).toFixed(0)}% success)`)
  .join("\n")}

**Trends:**
- Confidence: ${consolidation.trends.confidence_trend}
- Success: ${consolidation.trends.success_trend}
- Volume: ${consolidation.trends.volume_trend}

**Insights:**
${consolidation.monthly_insights.map((i) => `- ${i}`).join("\n")}
`;
}
