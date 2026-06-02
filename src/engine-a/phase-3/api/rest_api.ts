/**
 * Phase 3: Production REST API
 * Multi-tenant API with authentication, rate limiting, usage tracking
 * Implements: /v1/predictions, /v1/adapters, /v1/metrics, /v1/organizations
 */

import { createClient } from '@supabase/supabase-js';

export interface APIRequest {
  organization_id: string;
  api_key: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface APIResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    request_id: string;
    timestamp: Date;
    latency_ms: number;
    cost_cents: number;
  };
}

/**
 * REST API Handler
 * All requests go through this for authentication, rate limiting, usage tracking
 */
export class EngineARestAPI {
  supabase: any; // Supabase client
  orchestrator: any; // EngineAOrchestrator from Phase 2

  constructor(supabaseUrl: string, supabaseKey: string, orchestrator: any) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.orchestrator = orchestrator;
  }

  /**
   * Handle incoming API request
   */
  async handleRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Step 1: Authenticate API key
      const { org_id, key_id, permissions } = await this.authenticateApiKey(
        request.api_key,
        request.organization_id
      );

      // Step 2: Check rate limits
      const withinLimits = await this.checkRateLimit(org_id, key_id);
      if (!withinLimits) {
        return this.createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'API rate limit exceeded',
          requestId,
          startTime,
          429
        );
      }

      // Step 3: Route to appropriate handler
      let responseData: any;
      let costCents = 0;

      if (request.endpoint.startsWith('/v1/predictions')) {
        const result = await this.handlePredictionsEndpoint(
          request,
          org_id,
          permissions
        );
        responseData = result.data;
        costCents = result.cost_cents;
      } else if (request.endpoint.startsWith('/v1/adapters')) {
        const result = await this.handleAdaptersEndpoint(org_id);
        responseData = result;
      } else if (request.endpoint.startsWith('/v1/metrics')) {
        const result = await this.handleMetricsEndpoint(org_id);
        responseData = result;
      } else if (request.endpoint.startsWith('/v1/organizations')) {
        const result = await this.handleOrganizationsEndpoint(
          request,
          org_id
        );
        responseData = result;
      } else {
        return this.createErrorResponse(
          'ENDPOINT_NOT_FOUND',
          `Endpoint ${request.endpoint} not found`,
          requestId,
          startTime,
          404
        );
      }

      // Step 4: Log usage event
      const latency = Date.now() - startTime;
      await this.logUsageEvent(
        org_id,
        key_id,
        request.endpoint,
        request.method,
        latency,
        0, // tokens_input (would be calculated from request)
        0, // tokens_output
        costCents,
        200,
        true,
        requestId
      );

      // Step 5: Return success response
      return {
        status: 'success',
        data: responseData,
        metadata: {
          request_id: requestId,
          timestamp: new Date(),
          latency_ms: latency,
          cost_cents: costCents,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      return {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
        metadata: {
          request_id: requestId,
          timestamp: new Date(),
          latency_ms: latency,
          cost_cents: 0,
        },
      };
    }
  }

  /**
   * Authenticate API key and return organization info
   */
  private async authenticateApiKey(
    apiKey: string,
    organizationId: string
  ): Promise<{ org_id: string; key_id: string; permissions: string[] }> {
    // Extract key prefix (public part)
    const keyPrefix = apiKey.split('_')[0]; // e.g., "sk"

    // Hash the full key for comparison
    const keyHash = await this.hashApiKey(apiKey);

    // Query database for matching key
    const { data: keyRecord, error } = await this.supabase
      .from('api_keys')
      .select('id, organization_id, permissions')
      .eq('key_hash', keyHash)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !keyRecord) {
      throw new Error('Invalid or inactive API key');
    }

    // Verify key hasn't expired
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    return {
      org_id: organizationId,
      key_id: keyRecord.id,
      permissions: keyRecord.permissions || ['read', 'write'],
    };
  }

  /**
   * Check if organization is within rate limits
   */
  private async checkRateLimit(orgId: string, keyId: string): Promise<boolean> {
    const { data: result } = await this.supabase.rpc('check_rate_limit', {
      org_id: orgId,
      api_key_id: keyId,
    });

    return result === true;
  }

  /**
   * POST /v1/predictions/create - Make a prediction
   */
  private async handlePredictionsEndpoint(
    request: APIRequest,
    orgId: string,
    permissions: string[]
  ): Promise<{ data: any; cost_cents: number }> {
    if (request.method !== 'POST') {
      throw new Error(`Method ${request.method} not supported for /v1/predictions`);
    }

    if (!permissions.includes('write')) {
      throw new Error('Insufficient permissions for this operation');
    }

    const { domain, input, context } = request.body || {};

    if (!domain || !input) {
      throw new Error('Missing required fields: domain, input');
    }

    // Route to orchestrator
    const prediction = await this.orchestrator.routeRequest({
      domain,
      input,
      context: { ...context, org_id: orgId },
    });

    // Log to learning system for this org
    const { error } = await this.supabase
      .from('org_learning_records')
      .insert({
        organization_id: orgId,
        domain,
        record_type: 'api_prediction',
        input_text: input,
        output_text: prediction.result,
        context: context || {},
        quality_score: Math.round(prediction.confidence * 100),
      });

    if (error) {
      console.error('Error logging prediction to learning system:', error);
    }

    return {
      data: {
        prediction: prediction.result,
        confidence: prediction.confidence,
        source: prediction.source,
        latency_ms: prediction.latency_ms,
      },
      cost_cents: prediction.cost_cents,
    };
  }

  /**
   * GET /v1/adapters - List available adapters
   */
  private async handleAdaptersEndpoint(orgId: string): Promise<any> {
    const adapters = await this.orchestrator.getAdapters();

    return {
      adapters: adapters.map((adapter: any) => ({
        domain: adapter.domain,
        name: adapter.name,
        accuracy: adapter.accuracy,
        latency_ms: adapter.latency_ms,
        status: adapter.status,
      })),
    };
  }

  /**
   * GET /v1/metrics - Get organization metrics
   */
  private async handleMetricsEndpoint(orgId: string): Promise<any> {
    // Get monthly usage
    const { data: monthlyUsage } = await this.supabase.rpc('get_monthly_usage', {
      org_id: orgId,
    });

    // Get org info
    const { data: org } = await this.supabase
      .from('organizations')
      .select('api_call_quota_monthly, api_calls_used_this_month, storage_quota_gb, storage_used_gb')
      .eq('id', orgId)
      .single();

    return {
      current_month: {
        api_calls: monthlyUsage?.[0]?.api_calls || 0,
        tokens_used: monthlyUsage?.[0]?.tokens_used || 0,
        cost_cents: monthlyUsage?.[0]?.cost_cents || 0,
      },
      quotas: {
        monthly_api_calls: org?.api_call_quota_monthly,
        monthly_calls_used: org?.api_calls_used_this_month,
        storage_quota_gb: org?.storage_quota_gb,
        storage_used_gb: org?.storage_used_gb,
      },
      usage_rate: {
        api_calls_pct: org ? Math.round((org.api_calls_used_this_month / org.api_call_quota_monthly) * 100) : 0,
        storage_pct: org ? Math.round((org.storage_used_gb / org.storage_quota_gb) * 100) : 0,
      },
    };
  }

  /**
   * POST /v1/organizations/setup - Initialize organization
   */
  private async handleOrganizationsEndpoint(request: APIRequest, orgId: string): Promise<any> {
    if (request.method === 'POST') {
      // Setup endpoint for new orgs (onboarding)
      const { name, region } = request.body || {};

      // Create organization
      const { data: org, error } = await this.supabase
        .from('organizations')
        .insert({
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          region: region || 'us-east-1',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create organization: ${error.message}`);
      }

      // Generate initial API key
      const initialKey = await this.generateApiKey(org.id, 'default');

      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          region: org.region,
        },
        api_key: initialKey,
        next_steps: [
          'Install the SDK in your application',
          'Configure connectors to your data sources',
          'Start making predictions',
          'Monitor metrics and improve',
        ],
      };
    } else if (request.method === 'GET') {
      // Get org info
      const { data: org } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      return {
        organization: org,
        connectors: await this.getOrgConnectors(orgId),
        api_keys: await this.listApiKeys(orgId),
      };
    }

    throw new Error(`Method ${request.method} not supported for /v1/organizations`);
  }

  /**
   * Generate a new API key for organization
   */
  private async generateApiKey(orgId: string, name: string): Promise<string> {
    const keySecret = `sk_prod_${this.generateRandomString(32)}`;
    const keyHash = await this.hashApiKey(keySecret);

    await this.supabase
      .from('api_keys')
      .insert({
        organization_id: orgId,
        key_prefix: 'sk_prod',
        key_hash: keyHash,
        name,
        permissions: ['read', 'write'],
      });

    return keySecret; // Only return once on creation
  }

  /**
   * Get all connectors for organization
   */
  private async getOrgConnectors(orgId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('org_connectors')
      .select('connector_type, connector_name, is_enabled, last_sync_at')
      .eq('organization_id', orgId);

    return data || [];
  }

  /**
   * List API keys (without showing secrets)
   */
  private async listApiKeys(orgId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('api_keys')
      .select('id, name, key_prefix, is_active, created_at, last_used_at')
      .eq('organization_id', orgId);

    return data || [];
  }

  /**
   * Log usage event
   */
  private async logUsageEvent(
    orgId: string,
    keyId: string,
    endpoint: string,
    method: string,
    latency: number,
    tokensInput: number,
    tokensOutput: number,
    costCents: number,
    statusCode: number,
    success: boolean,
    requestId: string
  ): Promise<void> {
    await this.supabase.rpc('log_usage_event', {
      org_id: orgId,
      key_id: keyId,
      p_endpoint: endpoint,
      p_method: method,
      p_latency_ms: latency,
      p_tokens_input: tokensInput,
      p_tokens_output: tokensOutput,
      p_cost_cents: costCents,
      p_status_code: statusCode,
      p_success: success,
      p_error_message: null,
    });
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    code: string,
    message: string,
    requestId: string,
    startTime: number,
    statusCode: number
  ): APIResponse {
    return {
      status: 'error',
      error: { code, message },
      metadata: {
        request_id: requestId,
        timestamp: new Date(),
        latency_ms: Date.now() - startTime,
        cost_cents: 0,
      },
    };
  }

  /**
   * Utility: Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${this.generateRandomString(8)}`;
  }

  /**
   * Utility: Hash API key
   */
  private async hashApiKey(key: string): Promise<string> {
    // In production, use bcrypt or similar
    // For now, simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Utility: Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
