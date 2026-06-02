/**
 * Phase 3: Billing & Metering Engine
 * Tracks usage, calculates costs, manages quotas, generates invoices
 */

export interface PricingTier {
  name: 'pilot' | 'professional' | 'enterprise';
  monthly_base_cost: number;
  api_call_limit: number;
  storage_limit_gb: number;
  active_connectors_limit: number;
  sla_uptime: number;
  features: string[];
  unit_costs: {
    api_call_overages_per_1000: number;
    storage_gb_overages: number;
    additional_connector: number;
  };
}

/**
 * Pricing tiers for different subscription levels
 */
export const PRICING_TIERS: Record<string, PricingTier> = {
  pilot: {
    name: 'pilot',
    monthly_base_cost: 50000, // $500/month in cents
    api_call_limit: 100000, // 100k calls/month
    storage_limit_gb: 100,
    active_connectors_limit: 3,
    sla_uptime: 95.0, // 95% SLA
    features: [
      'Basic analytics',
      'Weekly reports',
      'Email support',
      '3 connectors',
      'Single user',
    ],
    unit_costs: {
      api_call_overages_per_1000: 50, // $0.50 per 1000 calls
      storage_gb_overages: 100, // $1.00 per GB
      additional_connector: 5000, // $50 per additional connector
    },
  },

  professional: {
    name: 'professional',
    monthly_base_cost: 99900, // $999/month in cents
    api_call_limit: 1000000, // 1M calls/month
    storage_limit_gb: 500,
    active_connectors_limit: 5,
    sla_uptime: 99.5, // 99.5% SLA
    features: [
      'Advanced analytics',
      'Daily reports',
      'Slack integration',
      'API access',
      '5 connectors',
      'Team management',
      'Custom webhooks',
    ],
    unit_costs: {
      api_call_overages_per_1000: 30, // $0.30 per 1000 calls (discounted)
      storage_gb_overages: 50, // $0.50 per GB
      additional_connector: 3000, // $30 per additional connector
    },
  },

  enterprise: {
    name: 'enterprise',
    monthly_base_cost: 500000, // $5000/month minimum in cents
    api_call_limit: Infinity,
    storage_limit_gb: Infinity,
    active_connectors_limit: Infinity,
    sla_uptime: 99.99, // 99.99% SLA
    features: [
      'Unlimited everything',
      'Real-time analytics',
      'Dedicated support',
      'Custom integrations',
      'Private deployment',
      'Compliance certifications',
      'Quarterly reviews',
      'Custom SLA',
    ],
    unit_costs: {
      api_call_overages_per_1000: 0, // No overage charges
      storage_gb_overages: 0,
      additional_connector: 0,
    },
  },
};

/**
 * Billing engine for calculating costs and managing quotas
 */
export class BillingEngine {
  supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Calculate monthly bill for an organization
   */
  async calculateMonthlyBill(orgId: string): Promise<{
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    breakdown: any;
  }> {
    // Get org subscription tier
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', orgId)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    const tier = PRICING_TIERS[org.subscription_tier];

    // Get usage for this month
    const { data: usage } = await this.supabase.rpc('get_monthly_usage', {
      org_id: orgId,
    });

    const monthlyUsage = usage?.[0] || {
      api_calls: 0,
      tokens_used: 0,
      cost_cents: 0,
    };

    // Calculate base cost
    let subtotal = tier.monthly_base_cost;

    // Calculate overage costs
    const apiCallOverages = Math.max(0, monthlyUsage.api_calls - tier.api_call_limit);
    const apiCallOverageCost =
      (apiCallOverages / 1000) * tier.unit_costs.api_call_overages_per_1000;

    // Get storage usage
    const { data: orgData } = await this.supabase
      .from('organizations')
      .select('storage_used_gb')
      .eq('id', orgId)
      .single();

    const storageOverages = Math.max(0, (orgData?.storage_used_gb || 0) - tier.storage_limit_gb);
    const storageOverageCost = storageOverages * tier.unit_costs.storage_gb_overages;

    // Count active connectors
    const { data: connectors } = await this.supabase
      .from('org_connectors')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_enabled', true);

    const connectorOverages = Math.max(
      0,
      (connectors?.length || 0) - tier.active_connectors_limit
    );
    const connectorOverageCost = connectorOverages * tier.unit_costs.additional_connector;

    // Calculate total
    subtotal =
      tier.monthly_base_cost +
      Math.round(apiCallOverageCost) +
      Math.round(storageOverageCost) +
      Math.round(connectorOverageCost);

    // Add tax (assume 10% for now)
    const taxCents = Math.round(subtotal * 0.1);
    const totalCents = subtotal + taxCents;

    return {
      subtotal_cents: subtotal,
      tax_cents: taxCents,
      total_cents: totalCents,
      breakdown: {
        base_cost_cents: tier.monthly_base_cost,
        api_call_overages_cents: Math.round(apiCallOverageCost),
        storage_overages_cents: Math.round(storageOverageCost),
        connector_overages_cents: Math.round(connectorOverageCost),
        tax_cents: taxCents,
        usage: {
          api_calls: monthlyUsage.api_calls,
          api_call_limit: tier.api_call_limit,
          storage_gb: orgData?.storage_used_gb || 0,
          storage_limit_gb: tier.storage_limit_gb,
          active_connectors: connectors?.length || 0,
        },
      },
    };
  }

  /**
   * Generate monthly invoice
   */
  async generateMonthlyInvoice(orgId: string): Promise<string> {
    // Get billing info
    const bill = await this.calculateMonthlyBill(orgId);

    // Get org info
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    // Create invoice record
    const invoiceNumber = this.generateInvoiceNumber();
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

    const lineItems = [
      {
        description: `${PRICING_TIERS[org.subscription_tier].name} Subscription`,
        quantity: 1,
        unit_price_cents: PRICING_TIERS[org.subscription_tier].monthly_base_cost,
        amount_cents: PRICING_TIERS[org.subscription_tier].monthly_base_cost,
      },
    ];

    if (bill.breakdown.api_call_overages_cents > 0) {
      lineItems.push({
        description: `API Call Overages (${bill.breakdown.usage.api_calls - PRICING_TIERS[org.subscription_tier].api_call_limit} calls over limit)`,
        quantity: 1,
        unit_price_cents: bill.breakdown.api_call_overages_cents,
        amount_cents: bill.breakdown.api_call_overages_cents,
      });
    }

    if (bill.breakdown.storage_overages_cents > 0) {
      lineItems.push({
        description: `Storage Overages (${(bill.breakdown.usage.storage_gb - PRICING_TIERS[org.subscription_tier].storage_limit_gb).toFixed(1)} GB over limit)`,
        quantity: 1,
        unit_price_cents: bill.breakdown.storage_overages_cents,
        amount_cents: bill.breakdown.storage_overages_cents,
      });
    }

    lineItems.push({
      description: 'Tax (estimated)',
      quantity: 1,
      unit_price_cents: bill.tax_cents,
      amount_cents: bill.tax_cents,
    });

    const { data: invoice } = await this.supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        invoice_number: invoiceNumber,
        status: 'sent',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        subtotal_cents: bill.subtotal_cents,
        tax_cents: bill.tax_cents,
        total_cents: bill.total_cents,
        line_items: lineItems,
        due_date: dueDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    return invoice.invoice_number;
  }

  /**
   * Check if organization has exceeded quotas
   */
  async checkQuotaExceeded(orgId: string): Promise<{
    api_calls: boolean;
    storage: boolean;
    connectors: boolean;
    overall_exceeded: boolean;
  }> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select(
        'subscription_tier, api_call_quota_monthly, api_calls_used_this_month, storage_quota_gb, storage_used_gb'
      )
      .eq('id', orgId)
      .single();

    const tier = PRICING_TIERS[org.subscription_tier];

    // Check API call quota
    const apiCallsExceeded = org.api_calls_used_this_month >= org.api_call_quota_monthly;

    // Check storage quota
    const storageExceeded = org.storage_used_gb >= org.storage_quota_gb;

    // Check connector limit
    const { data: connectors } = await this.supabase
      .from('org_connectors')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_enabled', true);

    const connectorsExceeded = (connectors?.length || 0) >= tier.active_connectors_limit;

    return {
      api_calls: apiCallsExceeded,
      storage: storageExceeded,
      connectors: connectorsExceeded,
      overall_exceeded: apiCallsExceeded || storageExceeded || connectorsExceeded,
    };
  }

  /**
   * Get billing history for organization
   */
  async getBillingHistory(orgId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('period_end', { ascending: false })
      .limit(12); // Last 12 months

    if (error) {
      throw new Error(`Failed to get billing history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get usage analytics for organization
   */
  async getUsageAnalytics(
    orgId: string,
    days: number = 30
  ): Promise<{
    daily_api_calls: any[];
    daily_costs: any[];
    daily_storage: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: dailyUsage, error } = await this.supabase
      .from('usage_events')
      .select('created_at, status_code, cost_cents')
      .eq('organization_id', orgId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get usage analytics: ${error.message}`);
    }

    // Aggregate by day
    const dailyStats: Record<string, any> = {};

    for (const event of dailyUsage || []) {
      const date = new Date(event.created_at).toISOString().split('T')[0];

      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          api_calls: 0,
          cost_cents: 0,
        };
      }

      dailyStats[date].api_calls++;
      dailyStats[date].cost_cents += event.cost_cents || 0;
    }

    const sortedStats = Object.values(dailyStats).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      daily_api_calls: sortedStats.map((s: any) => ({
        date: s.date,
        calls: s.api_calls,
      })),
      daily_costs: sortedStats.map((s: any) => ({
        date: s.date,
        cost_cents: s.cost_cents,
      })),
      daily_storage: [], // Would need additional tracking
    };
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `INV-${year}${month}-${randomSuffix}`;
  }
}
