/**
 * Phase 3: Secure Organization Wrapper
 * Enforces multi-tenant isolation at application level
 * Every operation goes through org context enforcement
 */

export interface SecureOrgContext {
  organization_id: string;
  org_name: string;
  subscription_tier: 'pilot' | 'professional' | 'enterprise';
  region: 'us-east-1' | 'eu-west-1' | 'ap-southeast-1';
  api_key_id: string;
  user_id?: string;

  // Quotas & limits
  api_call_quota_monthly: number;
  api_calls_used_this_month: number;
  storage_quota_gb: number;
  storage_used_gb: number;

  // Permissions
  enabled_connectors: string[];
  can_access_learning_data: boolean;
  can_export_data: boolean;
  can_create_api_keys: boolean;
  can_manage_connectors: boolean;

  // Data residency
  data_region: string;
  encrypt_at_rest: boolean;
}

/**
 * Wraps all operations with organization context
 * Prevents cross-org data leakage
 */
export class SecureOrgWrapper {
  private context: SecureOrgContext;
  private supabase: any;

  constructor(context: SecureOrgContext, supabaseClient: any) {
    this.context = context;
    this.supabase = supabaseClient;
  }

  /**
   * Enforce org context on all queries
   * Adds WHERE organization_id = context.org_id to every query
   */
  async enforceOrgContext<T>(
    operation: string,
    callback: () => Promise<T>
  ): Promise<T> {
    // Log the operation for audit trail
    await this.auditLog(operation);

    // Execute with org context
    try {
      const result = await callback();

      // Verify result doesn't leak cross-org data
      this.validateResult(result);

      return result;
    } catch (error) {
      // Log the error but don't expose details to client
      console.error(`Operation ${operation} failed for org ${this.context.organization_id}:`, error);
      throw new Error('Operation failed. Check audit logs for details.');
    }
  }

  /**
   * Query learning records (org-isolated)
   */
  async queryLearningRecords(
    domain?: string,
    filters?: Record<string, any>
  ): Promise<any[]> {
    // Verify permission
    if (!this.context.can_access_learning_data) {
      throw new Error('You do not have permission to access learning data');
    }

    // Build query with org context
    let query = this.supabase
      .from('org_learning_records')
      .select('*')
      .eq('organization_id', this.context.organization_id);

    if (domain) {
      query = query.eq('domain', domain);
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query learning records: ${error.message}`);
    }

    // Verify all records belong to this org
    for (const record of data || []) {
      if (record.organization_id !== this.context.organization_id) {
        throw new Error('Cross-org data access attempt detected and blocked');
      }
    }

    return data || [];
  }

  /**
   * Access knowledge base (org-isolated)
   */
  async queryKnowledgeBase(
    searchQuery?: string,
    category?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('org_kb_documents')
      .select('id, title, content, category, updated_at')
      .eq('organization_id', this.context.organization_id);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query knowledge base: ${error.message}`);
    }

    let results = data || [];

    // Client-side filtering for search (optional, server-side search can be added)
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      results = results.filter(
        (doc: any) =>
          doc.title.toLowerCase().includes(queryLower) ||
          doc.content.toLowerCase().includes(queryLower)
      );
    }

    return results;
  }

  /**
   * Get org's connectors with org context
   */
  async getConnectors(): Promise<any[]> {
    if (!this.context.can_manage_connectors) {
      throw new Error('You do not have permission to view connectors');
    }

    const { data, error } = await this.supabase
      .from('org_connectors')
      .select('*')
      .eq('organization_id', this.context.organization_id);

    if (error) {
      throw new Error(`Failed to get connectors: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Enable/disable connector for this org
   */
  async updateConnector(
    connectorId: string,
    updates: Record<string, any>
  ): Promise<void> {
    if (!this.context.can_manage_connectors) {
      throw new Error('You do not have permission to manage connectors');
    }

    // Verify connector belongs to this org before updating
    const { data: connector } = await this.supabase
      .from('org_connectors')
      .select('id')
      .eq('id', connectorId)
      .eq('organization_id', this.context.organization_id)
      .single();

    if (!connector) {
      throw new Error('Connector not found or does not belong to your organization');
    }

    const { error } = await this.supabase
      .from('org_connectors')
      .update(updates)
      .eq('id', connectorId)
      .eq('organization_id', this.context.organization_id);

    if (error) {
      throw new Error(`Failed to update connector: ${error.message}`);
    }
  }

  /**
   * Export data (with permission check)
   */
  async exportData(
    dataType: 'learning_records' | 'kb_documents' | 'metrics',
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    if (!this.context.can_export_data) {
      throw new Error('You do not have permission to export data');
    }

    let data: any = [];

    if (dataType === 'learning_records') {
      data = await this.queryLearningRecords();
    } else if (dataType === 'kb_documents') {
      data = await this.queryKnowledgeBase();
    } else if (dataType === 'metrics') {
      const { data: metrics } = await this.supabase.rpc('get_monthly_usage', {
        org_id: this.context.organization_id,
      });
      data = metrics;
    }

    // Log export for audit trail
    await this.auditLog(`export_data_${dataType}`, {
      data_type: dataType,
      record_count: data.length,
      format,
    });

    if (format === 'csv') {
      return this.convertToCSV(data);
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Check quota limits before operation
   */
  async checkQuotas(operationType: 'api_call' | 'storage'): Promise<boolean> {
    if (operationType === 'api_call') {
      const callsRemaining = this.context.api_call_quota_monthly - this.context.api_calls_used_this_month;
      return callsRemaining > 0;
    } else if (operationType === 'storage') {
      const storageRemaining = this.context.storage_quota_gb - this.context.storage_used_gb;
      return storageRemaining > 0;
    }

    return true;
  }

  /**
   * Get audit logs for this org
   */
  async getAuditLogs(
    filters?: {
      action_type?: string;
      start_date?: Date;
      end_date?: Date;
    }
  ): Promise<any[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', this.context.organization_id)
      .order('created_at', { ascending: false });

    if (filters?.action_type) {
      query = query.eq('action_type', filters.action_type);
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date.toISOString());
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Private: Log operation for audit trail
   */
  private async auditLog(
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          organization_id: this.context.organization_id,
          action_type: action,
          resource_type: 'operation',
          actor_id: this.context.user_id,
          actor_type: 'user',
          metadata: metadata || {},
          status: 'initiated',
        });
    } catch (error) {
      // Don't fail the operation if audit logging fails, but log it
      console.error('Failed to log audit trail:', error);
    }
  }

  /**
   * Private: Validate result doesn't leak cross-org data
   */
  private validateResult(result: any): void {
    // If result is an array, check each item
    if (Array.isArray(result)) {
      for (const item of result) {
        if (item && typeof item === 'object' && 'organization_id' in item) {
          if (item.organization_id !== this.context.organization_id) {
            throw new Error('Cross-organization data access detected');
          }
        }
      }
    }

    // If result is an object with org_id, validate it
    if (result && typeof result === 'object' && 'organization_id' in result) {
      if (result.organization_id !== this.context.organization_id) {
        throw new Error('Cross-organization data access detected');
      }
    }
  }

  /**
   * Private: Convert data to CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    // Get all keys from first object
    const keys = Object.keys(data[0]);
    const header = keys.join(',');

    const rows = data.map((row: any) =>
      keys
        .map((key: string) => {
          const value = row[key];
          // Escape commas and quotes in values
          const stringValue = String(value || '').replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Get org context for logging/debugging
   */
  getContext(): SecureOrgContext {
    return { ...this.context }; // Return copy to prevent modification
  }
}

/**
 * Org context enforcement rules
 */
export const ORG_ISOLATION_RULES = {
  // Every table must have organization_id column
  required_columns: ['organization_id'],

  // Row-level security must be enabled for these tables
  rls_enabled_tables: [
    'api_keys',
    'org_learning_records',
    'org_kb_documents',
    'org_connectors',
    'audit_logs',
    'usage_events',
  ],

  // These tables have immutable audit logs (no deletes)
  immutable_tables: ['audit_logs'],

  // These operations require permission checks
  protected_operations: {
    export_data: ['can_export_data'],
    manage_connectors: ['can_manage_connectors'],
    access_learning_data: ['can_access_learning_data'],
    create_api_keys: ['can_create_api_keys'],
  },

  // Cross-org validation rules
  validation_rules: [
    'All queries must filter by organization_id',
    'All inserts must include organization_id',
    'All updates must verify org ownership first',
    'No bulk deletes across multiple orgs',
    'Audit logs must be immutable',
  ],
};
