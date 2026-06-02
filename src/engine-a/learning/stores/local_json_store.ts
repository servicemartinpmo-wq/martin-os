/**
 * Local JSON Store
 * Stores learning records and consolidation results in local JSON files
 * Primary storage for Week 1-4 before database setup
 */

import fs from 'fs/promises';
import path from 'path';
import { LearningRecord, LearningRecordBatch, LearningDomain } from '../schemas/learning_record';
import { WeeklyConsolidationResult } from '../consolidators/weekly_consolidator';

export interface StoreConfig {
  base_path: string;
  org_id: string;
  create_backups: boolean;
}

export class LocalJsonStore {
  config: StoreConfig;
  records_path: string;
  consolidations_path: string;

  constructor(config: StoreConfig) {
    this.config = config;
    this.records_path = path.join(config.base_path, 'learning_records');
    this.consolidations_path = path.join(config.base_path, 'consolidations');
  }

  /**
   * Initialize store directory structure
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.records_path, { recursive: true });
    await fs.mkdir(this.consolidations_path, { recursive: true });
  }

  /**
   * Save learning records batch
   */
  async saveBatch(batch: LearningRecordBatch): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${batch.domain}-${timestamp}.jsonl`;
    const filepath = path.join(this.records_path, filename);

    // Write as JSONL (one record per line)
    const lines = batch.records.map(r => JSON.stringify(r)).join('\n');
    await fs.writeFile(filepath, lines + '\n', 'utf-8');
  }

  /**
   * Load all records for a domain
   */
  async loadRecordsByDomain(domain: LearningDomain): Promise<LearningRecord[]> {
    const files = await fs.readdir(this.records_path);
    const domainFiles = files.filter(f => f.startsWith(domain));

    const records: LearningRecord[] = [];

    for (const file of domainFiles) {
      const filepath = path.join(this.records_path, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (line.trim()) {
          records.push(JSON.parse(line));
        }
      }
    }

    return records;
  }

  /**
   * Load all records
   */
  async loadAllRecords(): Promise<LearningRecord[]> {
    const domains: LearningDomain[] = ['support', 'code', 'automation', 'business'];
    const allRecords: LearningRecord[] = [];

    for (const domain of domains) {
      const records = await this.loadRecordsByDomain(domain);
      allRecords.push(...records);
    }

    return allRecords;
  }

  /**
   * Load records from specific date range
   */
  async loadRecordsByDateRange(startDate: Date, endDate: Date): Promise<LearningRecord[]> {
    const allRecords = await this.loadAllRecords();
    return allRecords.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  /**
   * Save weekly consolidation result
   */
  async saveConsolidationResult(result: WeeklyConsolidationResult): Promise<void> {
    const filename = `week-${result.week_number}-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.consolidations_path, filename);

    await fs.writeFile(filepath, JSON.stringify(result, null, 2), 'utf-8');
  }

  /**
   * Load latest consolidation result
   */
  async loadLatestConsolidation(): Promise<WeeklyConsolidationResult | null> {
    const files = await fs.readdir(this.consolidations_path);

    if (files.length === 0) {
      return null;
    }

    // Sort by timestamp descending
    const sorted = files.sort().reverse();
    const filepath = path.join(this.consolidations_path, sorted[0]);

    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get statistics summary
   */
  async getStatistics(): Promise<{
    total_records: number;
    records_by_domain: Record<LearningDomain, number>;
    latest_consolidation: WeeklyConsolidationResult | null;
    oldest_record_date: Date | null;
    newest_record_date: Date | null;
  }> {
    const records = await this.loadAllRecords();

    const recordsByDomain: Record<LearningDomain, number> = {
      support: 0,
      code: 0,
      automation: 0,
      business: 0,
    };

    for (const record of records) {
      recordsByDomain[record.domain]++;
    }

    const dates = records.map(r => new Date(r.timestamp));
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    const latestConsolidation = await this.loadLatestConsolidation();

    return {
      total_records: records.length,
      records_by_domain: recordsByDomain,
      latest_consolidation: latestConsolidation,
      oldest_record_date: oldestDate,
      newest_record_date: newestDate,
    };
  }

  /**
   * Export records as CSV for review
   */
  async exportToCsv(domain?: LearningDomain): Promise<string> {
    const records = domain
      ? await this.loadRecordsByDomain(domain)
      : await this.loadAllRecords();

    if (records.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'id',
      'timestamp',
      'domain',
      'input',
      'action',
      'output',
      'accepted',
      'quality_score',
      'reusable',
      'tags',
      'latency_ms',
      'cost_cents',
    ];

    const rows = records.map(r => [
      r.id,
      r.timestamp,
      r.domain,
      `"${(r.input || '').replace(/"/g, '""')}"`,
      `"${(r.action || '').replace(/"/g, '""')}"`,
      `"${(r.output || '').replace(/"/g, '""')}"`,
      r.accepted,
      r.quality_score,
      r.reusable,
      `"${r.tags.join(';')}"`,
      r.latency_ms,
      r.cost_cents,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
  }

  /**
   * Clean up old records (optional maintenance)
   */
  async deleteOldRecords(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const records = await this.loadAllRecords();
    const recordsToKeep = records.filter(r => new Date(r.timestamp) > cutoffDate);

    // Clear directory
    const files = await fs.readdir(this.records_path);
    for (const file of files) {
      await fs.unlink(path.join(this.records_path, file));
    }

    // Re-save records to keep
    const batches: Record<LearningDomain, LearningRecord[]> = {
      support: [],
      code: [],
      automation: [],
      business: [],
    };

    for (const record of recordsToKeep) {
      batches[record.domain].push(record);
    }

    for (const domain of ['support', 'code', 'automation', 'business'] as LearningDomain[]) {
      if (batches[domain].length > 0) {
        await this.saveBatch({
          records: batches[domain],
          domain,
          extracted_at: new Date(),
          total_count: batches[domain].length,
          quality_score_avg: batches[domain].reduce((sum, r) => sum + r.quality_score, 0) / batches[domain].length,
          reusable_count: batches[domain].filter(r => r.reusable).length,
        });
      }
    }

    return records.length - recordsToKeep.length;
  }
}
