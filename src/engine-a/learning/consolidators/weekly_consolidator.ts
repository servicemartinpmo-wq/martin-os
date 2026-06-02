/**
 * Weekly Consolidation
 * Organizes learning records by domain, calculates statistics, identifies patterns
 * Runs every Sunday at 10am
 */

import { LearningRecord, LearningDomain } from '../schemas/learning_record';
import { DomainStatistics } from '../schemas/domain_schemas';

export interface WeeklyConsolidationResult {
  consolidation_date: Date;
  week_number: number;
  period_start: Date;
  period_end: Date;

  total_records: number;
  records_by_domain: Record<LearningDomain, number>;

  domain_statistics: Record<LearningDomain, DomainStatistics>;

  overall_statistics: {
    avg_quality_score: number;
    reusable_count: number;
    reusable_rate: number;
    avg_latency_ms: number;
    total_cost_cents: number;
  };

  patterns_identified: WeeklyPattern[];

  alerts: ConsolidationAlert[];
}

export interface WeeklyPattern {
  domain: LearningDomain;
  pattern: string;
  frequency: number;
  quality_avg: number;
  tags: string[];
  recommendations: string[];
}

export interface ConsolidationAlert {
  type: 'quality_issue' | 'data_gap' | 'pattern_opportunity' | 'anomaly';
  domain: LearningDomain;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  action_item?: string;
}

export class WeeklyConsolidator {
  /**
   * Run weekly consolidation on all learning records from past week
   */
  async consolidateWeek(records: LearningRecord[], org_id: string): Promise<WeeklyConsolidationResult> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const weekNumber = this.getWeekNumber(now);

    // Organize records by domain
    const recordsByDomain = this.organizeByDomain(records);

    // Calculate domain statistics
    const domainStats: Record<LearningDomain, DomainStatistics> = {} as any;
    let totalQualityScore = 0;
    let totalReusable = 0;
    let totalLatency = 0;
    let totalCost = 0;

    for (const domain of ['support', 'code', 'automation', 'business'] as LearningDomain[]) {
      const domainRecords = recordsByDomain[domain] || [];
      domainStats[domain] = this.calculateDomainStatistics(domain, domainRecords);

      totalQualityScore += domainStats[domain].avg_quality_score * domainRecords.length;
      totalReusable += domainStats[domain].reusable_count;
      totalLatency += domainStats[domain].avg_latency_ms * domainRecords.length;
      totalCost += domainStats[domain].total_cost_cents;
    }

    const totalRecords = records.length;
    const overallStats = {
      avg_quality_score: totalRecords > 0 ? totalQualityScore / totalRecords : 0,
      reusable_count: totalReusable,
      reusable_rate: totalRecords > 0 ? totalReusable / totalRecords : 0,
      avg_latency_ms: totalRecords > 0 ? totalLatency / totalRecords : 0,
      total_cost_cents: totalCost,
    };

    // Identify patterns
    const patterns = this.identifyPatterns(recordsByDomain, domainStats);

    // Generate alerts
    const alerts = this.generateAlerts(recordsByDomain, domainStats, patterns);

    return {
      consolidation_date: now,
      week_number: weekNumber,
      period_start: weekStart,
      period_end: now,

      total_records: totalRecords,
      records_by_domain: Object.fromEntries(
        Object.entries(recordsByDomain).map(([domain, recs]) => [domain, recs.length])
      ) as Record<LearningDomain, number>,

      domain_statistics: domainStats,

      overall_statistics: overallStats,

      patterns_identified: patterns,

      alerts,
    };
  }

  /**
   * Organize records by domain
   */
  private organizeByDomain(records: LearningRecord[]): Record<LearningDomain, LearningRecord[]> {
    const organized = {
      support: [] as LearningRecord[],
      code: [] as LearningRecord[],
      automation: [] as LearningRecord[],
      business: [] as LearningRecord[],
    };

    for (const record of records) {
      organized[record.domain].push(record);
    }

    return organized;
  }

  /**
   * Calculate statistics for a domain
   */
  private calculateDomainStatistics(domain: LearningDomain, records: LearningRecord[]): DomainStatistics {
    if (records.length === 0) {
      return {
        domain,
        record_count: 0,
        avg_quality_score: 0,
        reusable_count: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        total_cost_cents: 0,
        top_patterns: [],
        quality_distribution: { high: 0, medium: 0, low: 0 },
      };
    }

    const qualityScores = records.map(r => r.quality_score);
    const reusableCount = records.filter(r => r.reusable).length;
    const acceptedCount = records.filter(r => r.accepted).length;
    const totalLatency = records.reduce((sum, r) => sum + r.latency_ms, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost_cents, 0);

    // Quality distribution
    const qualityDist = {
      high: records.filter(r => r.quality_score >= 80).length,
      medium: records.filter(r => r.quality_score >= 60 && r.quality_score < 80).length,
      low: records.filter(r => r.quality_score < 60).length,
    };

    // Top patterns from tags
    const tagFrequency: Record<string, number> = {};
    for (const record of records) {
      for (const tag of record.tags) {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      }
    }

    const topPatterns = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);

    return {
      domain,
      record_count: records.length,
      avg_quality_score: qualityScores.reduce((a, b) => a + b, 0) / records.length,
      reusable_count: reusableCount,
      success_rate: acceptedCount / records.length,
      avg_latency_ms: totalLatency / records.length,
      total_cost_cents: totalCost,
      top_patterns: topPatterns,
      quality_distribution: qualityDist,
    };
  }

  /**
   * Identify patterns across records
   */
  private identifyPatterns(
    recordsByDomain: Record<LearningDomain, LearningRecord[]>,
    stats: Record<LearningDomain, DomainStatistics>
  ): WeeklyPattern[] {
    const patterns: WeeklyPattern[] = [];

    for (const domain of ['support', 'code', 'automation', 'business'] as LearningDomain[]) {
      const records = recordsByDomain[domain];
      if (records.length === 0) continue;

      const tagFrequency: Record<string, number[]> = {};

      // Collect quality scores by tag
      for (const record of records) {
        for (const tag of record.tags) {
          if (!tagFrequency[tag]) tagFrequency[tag] = [];
          tagFrequency[tag].push(record.quality_score);
        }
      }

      // Create patterns for top tags
      const topTags = Object.entries(tagFrequency)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3);

      for (const [tag, scores] of topTags) {
        const avgQuality = scores.reduce((a, b) => a + b, 0) / scores.length;
        const frequency = scores.length;

        patterns.push({
          domain,
          pattern: tag,
          frequency,
          quality_avg: avgQuality,
          tags: [domain, tag],
          recommendations: this.generatePatternRecommendations(domain, tag, avgQuality, frequency),
        });
      }
    }

    // Sort by frequency
    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate recommendations for a pattern
   */
  private generatePatternRecommendations(
    domain: LearningDomain,
    pattern: string,
    quality: number,
    frequency: number
  ): string[] {
    const recommendations: string[] = [];

    // High quality, high frequency = leverage
    if (quality >= 80 && frequency >= 5) {
      recommendations.push(`High-value pattern: Create template for "${pattern}"`);
      recommendations.push(`Consider training adapter to recognize "${pattern}"`);
    }

    // Low quality, high frequency = investigate
    if (quality < 60 && frequency >= 5) {
      recommendations.push(`Problem pattern: "${pattern}" has low quality despite frequency`);
      recommendations.push(`Review and improve handling of "${pattern}"`);
    }

    // Emerging pattern
    if (frequency >= 3 && frequency <= 5) {
      recommendations.push(`Emerging pattern: "${pattern}" is increasing in frequency`);
    }

    // Low frequency, high quality = document
    if (quality >= 80 && frequency <= 3) {
      recommendations.push(`Valuable but rare: Document "${pattern}" for future reference`);
    }

    return recommendations;
  }

  /**
   * Generate consolidation alerts
   */
  private generateAlerts(
    recordsByDomain: Record<LearningDomain, LearningRecord[]>,
    stats: Record<LearningDomain, DomainStatistics>,
    patterns: WeeklyPattern[]
  ): ConsolidationAlert[] {
    const alerts: ConsolidationAlert[] = [];

    // Check for data gaps
    for (const domain of ['support', 'code', 'automation', 'business'] as LearningDomain[]) {
      const domainRecords = recordsByDomain[domain];

      if (domainRecords.length === 0) {
        alerts.push({
          type: 'data_gap',
          domain,
          message: `No records extracted for ${domain} domain this week`,
          severity: 'warning',
          action_item: `Check ${domain} data sources and extraction setup`,
        });
      } else if (stats[domain].record_count < 10) {
        alerts.push({
          type: 'data_gap',
          domain,
          message: `Low record volume for ${domain}: ${stats[domain].record_count} records`,
          severity: 'info',
          action_item: `Consider expanding data sources for ${domain}`,
        });
      }

      // Quality issues
      if (stats[domain].avg_quality_score < 60) {
        alerts.push({
          type: 'quality_issue',
          domain,
          message: `Low average quality for ${domain}: ${stats[domain].avg_quality_score.toFixed(1)}/100`,
          severity: 'critical',
          action_item: `Review and improve ${domain} extraction and scoring logic`,
        });
      } else if (stats[domain].avg_quality_score < 70) {
        alerts.push({
          type: 'quality_issue',
          domain,
          message: `Medium quality for ${domain}: ${stats[domain].avg_quality_score.toFixed(1)}/100`,
          severity: 'warning',
          action_item: `Evaluate quality scoring for ${domain}`,
        });
      }

      // Success rate
      if (stats[domain].success_rate < 0.7) {
        alerts.push({
          type: 'quality_issue',
          domain,
          message: `Low success rate for ${domain}: ${(stats[domain].success_rate * 100).toFixed(1)}%`,
          severity: 'warning',
          action_item: `Investigate failed records in ${domain}`,
        });
      }
    }

    // High-value pattern opportunities
    const highValuePatterns = patterns.filter(p => p.quality_avg >= 80 && p.frequency >= 5);
    if (highValuePatterns.length > 0) {
      alerts.push({
        type: 'pattern_opportunity',
        domain: highValuePatterns[0].domain,
        message: `${highValuePatterns.length} high-value patterns identified`,
        severity: 'info',
        action_item: `Consider creating templates or training data from these patterns`,
      });
    }

    return alerts;
  }

  /**
   * Calculate week number of year
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
