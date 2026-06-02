/**
 * Learning Consolidation
 * Weekly and monthly analysis of learning records
 */

import { LearningRecord, WeeklyConsolidation, DomainStats } from "../schemas/LearningRecord";

// ============================================================================
// PATTERN EXTRACTION
// ============================================================================

export interface Pattern {
  pattern: string;
  frequency: number;
  avg_quality: number;
  examples: LearningRecord[];
}

function extractPatterns(records: LearningRecord[], maxPatterns: number = 10): Pattern[] {
  // Group by tags
  const byTag = new Map<string, LearningRecord[]>();

  records.forEach((record) => {
    record.tags.forEach((tag) => {
      if (!byTag.has(tag)) {
        byTag.set(tag, []);
      }
      byTag.get(tag)!.push(record);
    });
  });

  // Convert to patterns
  const patterns: Pattern[] = Array.from(byTag.entries())
    .map(([tag, recordsWithTag]) => ({
      pattern: tag,
      frequency: recordsWithTag.length,
      avg_quality: recordsWithTag.reduce((sum, r) => sum + r.quality_score, 0) / recordsWithTag.length,
      examples: recordsWithTag.slice(0, 3),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, maxPatterns);

  return patterns;
}

// ============================================================================
// DOMAIN STATISTICS
// ============================================================================

function calculateDomainStats(domainRecords: LearningRecord[]): DomainStats {
  if (domainRecords.length === 0) {
    return {
      count: 0,
      avg_quality: 0,
      patterns: [],
      improvement_areas: [],
    };
  }

  const avgQuality = domainRecords.reduce((sum, r) => sum + r.quality_score, 0) / domainRecords.length;
  const patterns = extractPatterns(domainRecords, 5);

  // Identify improvement areas
  const improvementAreas: string[] = [];

  // Low quality patterns
  const lowQuality = patterns.filter((p) => p.avg_quality < 65);
  if (lowQuality.length > 0) {
    improvementAreas.push(`${lowQuality.map((p) => p.pattern).join(", ")} have low quality scores`);
  }

  // High latency issues
  const highLatency = domainRecords.filter((r) => r.latency_ms > 10000);
  if (highLatency.length > 0) {
    improvementAreas.push(`${highLatency.length} records have high latency (>10s)`);
  }

  // High cost (support/code domains)
  if (["support", "code"].includes(domainRecords[0]?.domain)) {
    const expensiveRecords = domainRecords.filter((r) => r.cost_cents > 10);
    if (expensiveRecords.length > 0) {
      improvementAreas.push(`${expensiveRecords.length} Claude API calls cost >$0.10`);
    }
  }

  // Rejection issues
  const rejections = domainRecords.filter((r) => !r.accepted);
  if (rejections.length > 0 && rejections.length > domainRecords.length * 0.2) {
    improvementAreas.push(`${rejections.length} records were rejected (quality issue)`);
  }

  return {
    count: domainRecords.length,
    avg_quality: avgQuality,
    patterns,
    improvement_areas,
  };
}

// ============================================================================
// WEEKLY CONSOLIDATION
// ============================================================================

export async function consolidateWeek(
  weekNumber: number,
  allRecords: LearningRecord[]
): Promise<WeeklyConsolidation> {
  const byDomain = {
    support: allRecords.filter((r) => r.domain === "support"),
    code: allRecords.filter((r) => r.domain === "code"),
    automation: allRecords.filter((r) => r.domain === "automation"),
    business: allRecords.filter((r) => r.domain === "business"),
  };

  const domainStats = {
    support: calculateDomainStats(byDomain.support),
    code: calculateDomainStats(byDomain.code),
    automation: calculateDomainStats(byDomain.automation),
    business: calculateDomainStats(byDomain.business),
  };

  // Identify ready-for-training records
  const readyForTraining = allRecords.filter(
    (r) => r.reusable && r.accepted && r.quality_score >= 60
  );

  // Generate insights
  const insights = generateWeeklyInsights(domainStats, readyForTraining);

  // Determine next focus
  const nextFocus = determineNextFocus(domainStats);

  return {
    week: weekNumber,
    date: new Date(),
    total_records: allRecords.length,
    by_domain: domainStats,
    insights,
    next_focus: nextFocus,
    ready_for_training: readyForTraining,
  };
}

function generateWeeklyInsights(
  domainStats: Record<string, DomainStats>,
  readyForTraining: LearningRecord[]
): string[] {
  const insights: string[] = [];

  // Top performing domain
  const domains = Object.entries(domainStats);
  const topDomain = domains.sort(([, a], [, b]) => b.avg_quality - a.avg_quality)[0];
  if (topDomain && topDomain[1].count > 0) {
    insights.push(`${topDomain[0]}: avg quality ${topDomain[1].avg_quality.toFixed(1)}, ${topDomain[1].count} records`);
  }

  // Training readiness
  if (readyForTraining.length > 100) {
    insights.push(`✅ ${readyForTraining.length} records ready for adapter training`);
  } else if (readyForTraining.length > 50) {
    insights.push(`⚠️  ${readyForTraining.length} records ready (target: 100+)`);
  } else {
    insights.push(`❌ Only ${readyForTraining.length} records ready (need 100+)`);
  }

  // Common patterns
  const allPatterns: Pattern[] = [];
  Object.values(domainStats).forEach((stat) => {
    allPatterns.push(...stat.patterns);
  });

  const topPatterns = allPatterns.sort((a, b) => b.frequency - a.frequency).slice(0, 3);
  if (topPatterns.length > 0) {
    insights.push(`Top patterns: ${topPatterns.map((p) => `${p.pattern} (${p.frequency}x)`).join(", ")}`);
  }

  return insights;
}

function determineNextFocus(domainStats: Record<string, DomainStats>): string {
  // Find domain with lowest quality
  const byQuality = Object.entries(domainStats).filter(([, stat]) => stat.count > 0);

  if (byQuality.length === 0) return "Continue collecting records across all domains";

  const worstDomain = byQuality.sort(([, a], [, b]) => a.avg_quality - b.avg_quality)[0];

  if (worstDomain[1].avg_quality < 65) {
    return `Focus on improving ${worstDomain[0]} domain quality (currently ${worstDomain[1].avg_quality.toFixed(1)})`;
  }

  if (byQuality.some(([, stat]) => stat.count < 20)) {
    const lowCount = byQuality
      .filter(([, stat]) => stat.count < 20)
      .map(([domain]) => domain);
    return `Collect more ${lowCount.join(", ")} records`;
  }

  return "Continue balanced collection across all domains";
}

// ============================================================================
// MONTHLY CONSOLIDATION
// ============================================================================

export interface MonthlyConsolidation {
  month: Date;
  total_records: number;
  weeks: WeeklyConsolidation[];

  insights: string[];
  frameworks_to_train: string[];
  adapters_ready: boolean;
  next_phase: string;
}

export async function consolidateMonth(
  weeklyConsolidations: WeeklyConsolidation[]
): Promise<MonthlyConsolidation> {
  const totalRecords = weeklyConsolidations.reduce((sum, w) => sum + w.total_records, 0);
  const readyForTraining = weeklyConsolidations.flatMap((w) => w.ready_for_training);

  // Aggregate stats
  const aggregatedStats = {
    support: { count: 0, quality: 0 },
    code: { count: 0, quality: 0 },
    automation: { count: 0, quality: 0 },
    business: { count: 0, quality: 0 },
  };

  weeklyConsolidations.forEach((week) => {
    Object.entries(week.by_domain).forEach(([domain, stat]) => {
      aggregatedStats[domain as keyof typeof aggregatedStats].count += stat.count;
      aggregatedStats[domain as keyof typeof aggregatedStats].quality += stat.avg_quality;
    });
  });

  // Average quality per domain
  const avgQualityByDomain = Object.entries(aggregatedStats).reduce(
    (acc, [domain, stat]) => ({
      ...acc,
      [domain]: stat.count > 0 ? (stat.quality / weeklyConsolidations.length).toFixed(1) : "N/A",
    }),
    {} as Record<string, string>
  );

  // Determine adapter readiness
  const adaptersReady = readyForTraining.length >= 400; // ~200 original + 200 synthetic

  // Generate insights
  const insights: string[] = [
    `Total records: ${totalRecords}`,
    `Training-ready: ${readyForTraining.length}`,
    `Quality: support=${avgQualityByDomain.support}, code=${avgQualityByDomain.code}, automation=${avgQualityByDomain.automation}, business=${avgQualityByDomain.business}`,
  ];

  if (adaptersReady) {
    insights.push("✅ Ready to train adapters (Week 5)");
  } else {
    insights.push(`⚠️  Need ${400 - readyForTraining.length} more training-ready records`);
  }

  // Framework suggestions
  const allPatterns: Pattern[] = [];
  weeklyConsolidations.forEach((week) => {
    Object.values(week.by_domain).forEach((stat) => {
      allPatterns.push(...stat.patterns);
    });
  });

  const topPatterns = allPatterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const frameworksToTrain = topPatterns.map((p) => p.pattern);

  const nextPhase = adaptersReady
    ? "PHASE 2 READY: Begin adapter training (Week 5)"
    : "PHASE 1 CONTINUE: More records needed";

  return {
    month: new Date(),
    total_records: totalRecords,
    weeks: weeklyConsolidations,
    insights,
    frameworks_to_train: frameworksToTrain,
    adapters_ready: adaptersReady,
    next_phase: nextPhase,
  };
}

// ============================================================================
// FORMATTERS FOR REPORTING
// ============================================================================

export function formatWeeklyReport(consolidation: WeeklyConsolidation): string {
  return `
Week ${consolidation.week} Learning Consolidation (${consolidation.date.toLocaleDateString()})
${"=".repeat(70)}

SUMMARY
  Total Records: ${consolidation.total_records}
  Ready for Training: ${consolidation.ready_for_training.length}

BY DOMAIN
  Support:      ${consolidation.by_domain.support.count} records, avg quality ${consolidation.by_domain.support.avg_quality.toFixed(1)}
  Code:         ${consolidation.by_domain.code.count} records, avg quality ${consolidation.by_domain.code.avg_quality.toFixed(1)}
  Automation:   ${consolidation.by_domain.automation.count} records, avg quality ${consolidation.by_domain.automation.avg_quality.toFixed(1)}
  Business:     ${consolidation.by_domain.business.count} records, avg quality ${consolidation.by_domain.business.avg_quality.toFixed(1)}

TOP PATTERNS
${consolidation.by_domain.support.patterns
  .slice(0, 3)
  .map((p) => `  - ${p.pattern} (${p.frequency}x, quality ${p.avg_quality.toFixed(1)})`)
  .join("\n")}

INSIGHTS
${consolidation.insights.map((i) => `  • ${i}`).join("\n")}

NEXT FOCUS
  ${consolidation.next_focus}
`;
}

export function formatMonthlyReport(consolidation: MonthlyConsolidation): string {
  return `
Monthly Learning Consolidation (${consolidation.month.toLocaleDateString("en-US", { month: "long", year: "numeric" })})
${"=".repeat(70)}

SUMMARY
  Total Records: ${consolidation.total_records}
  Training-Ready: ${consolidation.frameworks_to_train.length > 0 ? "YES" : "NOT YET"}

INSIGHTS
${consolidation.insights.map((i) => `  • ${i}`).join("\n")}

TOP FRAMEWORKS FOR TRAINING
${consolidation.frameworks_to_train.map((f) => `  • ${f}`).join("\n")}

NEXT PHASE
  ${consolidation.next_phase}
`;
}
