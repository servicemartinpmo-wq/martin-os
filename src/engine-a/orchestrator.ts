/**
 * Engine A Orchestrator
 * Routes requests to local adapters with fallback to Claude
 * Implements hybrid inference for Weeks 13-16 production deployment
 */

import { AdapterDomain } from './learning/training/base_adapter';
import { PredictionResult, BaseAdapter } from './learning/training/base_adapter';

export interface OrchestrationRequest {
  domain: 'support' | 'code' | 'automation' | 'business';
  input: string;
  context: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  timeout_ms?: number;
}

export interface OrchestrationResponse {
  source: 'local' | 'claude_fallback' | 'error';
  result: PredictionResult | string;
  confidence: number;
  latency_ms: number;
  cost_cents: number;
  adapter_version?: string;
  fallback_reason?: string;
}

export interface OrchestratorMetrics {
  total_requests: number;
  local_handled: number;
  local_rate: number;
  claude_fallback: number;
  fallback_rate: number;
  average_confidence: number;
  total_cost_cents: number;
  average_latency_ms: number;
}

export class EngineAOrchestrator {
  adapters: Map<AdapterDomain, BaseAdapter>;
  metrics: OrchestratorMetrics;
  confidence_threshold: number = 0.80; // Fallback if confidence < 80%
  fallback_enabled: boolean = true;

  constructor() {
    this.adapters = new Map();
    this.metrics = {
      total_requests: 0,
      local_handled: 0,
      local_rate: 0,
      claude_fallback: 0,
      fallback_rate: 0,
      average_confidence: 0,
      total_cost_cents: 0,
      average_latency_ms: 0,
    };
  }

  /**
   * Register an adapter for a domain
   */
  registerAdapter(domain: AdapterDomain, adapter: BaseAdapter): void {
    this.adapters.set(domain, adapter);
    console.log(`Registered ${domain} adapter: ${adapter.config.model_name}`);
  }

  /**
   * Main orchestration method
   * Routes request to local adapter or Claude fallback
   */
  async routeRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Get local adapter for domain
      const adapter = this.adapters.get(request.domain);

      if (!adapter) {
        return this.createFallbackResponse(
          request,
          'No adapter registered for domain',
          startTime
        );
      }

      // Step 2: Try local adapter prediction
      const prediction = await adapter.predict(request.input);

      // Step 3: Check confidence
      if (prediction.confidence < this.confidence_threshold && this.fallback_enabled) {
        return this.createFallbackResponse(
          request,
          `Low confidence: ${(prediction.confidence * 100).toFixed(1)}% < ${(this.confidence_threshold * 100).toFixed(0)}%`,
          startTime,
          prediction
        );
      }

      // Step 4: Local prediction accepted
      const latency = Date.now() - startTime;
      this.updateMetrics(true, prediction.confidence, prediction.latency_ms, prediction.confidence === 1 ? 0 : 1);

      return {
        source: 'local',
        result: prediction,
        confidence: prediction.confidence,
        latency_ms: latency,
        cost_cents: 0.01, // Local inference cost
        adapter_version: adapter.currentVersion?.version,
      };
    } catch (error) {
      console.error(`Orchestration error for ${request.domain}:`, error);
      return this.createFallbackResponse(
        request,
        `Adapter error: ${(error as Error).message}`,
        startTime
      );
    }
  }

  /**
   * Create fallback response (calls Claude)
   */
  private createFallbackResponse(
    request: OrchestrationRequest,
    fallbackReason: string,
    startTime: number,
    partialPrediction?: PredictionResult
  ): OrchestrationResponse {
    const latency = Date.now() - startTime;

    // In real implementation, this would call Claude API
    // For now, return placeholder
    const claudeResponse = `Claude would handle: ${request.input}`;

    this.updateMetrics(false, 0.95, latency, 3.0); // Estimate Claude cost

    return {
      source: 'claude_fallback',
      result: claudeResponse,
      confidence: 0.95, // Claude fallback confidence
      latency_ms: latency,
      cost_cents: 3.0, // Estimate Claude inference cost
      fallback_reason: fallbackReason,
    };
  }

  /**
   * Update metrics after each request
   */
  private updateMetrics(
    isLocal: boolean,
    confidence: number,
    latency: number,
    cost: number
  ): void {
    this.metrics.total_requests++;

    if (isLocal) {
      this.metrics.local_handled++;
    } else {
      this.metrics.claude_fallback++;
    }

    this.metrics.local_rate = this.metrics.local_handled / this.metrics.total_requests;
    this.metrics.fallback_rate = this.metrics.claude_fallback / this.metrics.total_requests;

    // Update running averages
    const totalConfidence = this.metrics.average_confidence * (this.metrics.total_requests - 1);
    this.metrics.average_confidence = (totalConfidence + confidence) / this.metrics.total_requests;

    const totalLatency = this.metrics.average_latency_ms * (this.metrics.total_requests - 1);
    this.metrics.average_latency_ms = (totalLatency + latency) / this.metrics.total_requests;

    this.metrics.total_cost_cents += cost;
  }

  /**
   * Get current metrics
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics summary for reporting
   */
  getMetricsSummary(): string {
    const m = this.metrics;
    return `
Orchestrator Metrics:
  Total Requests: ${m.total_requests}
  Local Handled: ${m.local_handled} (${(m.local_rate * 100).toFixed(1)}%)
  Claude Fallback: ${m.claude_fallback} (${(m.fallback_rate * 100).toFixed(1)}%)
  Avg Confidence: ${(m.average_confidence * 100).toFixed(1)}%
  Avg Latency: ${m.average_latency_ms.toFixed(0)}ms
  Total Cost: $${(m.total_cost_cents / 100).toFixed(2)}
  Estimated Monthly Savings: $${(28000 - (m.total_cost_cents / 100 * (m.total_requests / 30))).toFixed(0)} (vs $28,000 Claude budget)
    `.trim();
  }

  /**
   * Reset metrics (for testing or weekly rollover)
   */
  resetMetrics(): void {
    this.metrics = {
      total_requests: 0,
      local_handled: 0,
      local_rate: 0,
      claude_fallback: 0,
      fallback_rate: 0,
      average_confidence: 0,
      total_cost_cents: 0,
      average_latency_ms: 0,
    };
  }

  /**
   * Enable/disable fallback (for testing)
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallback_enabled = enabled;
  }

  /**
   * Set confidence threshold for fallback
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    this.confidence_threshold = threshold;
  }

  /**
   * Health check: verify all adapters are ready
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    adapters: Record<string, boolean>;
    message: string;
  }> {
    const adapterStatus: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [domain, adapter] of this.adapters) {
      try {
        // Simple test prediction
        const testResult = await adapter.predict('test input');
        adapterStatus[domain] = testResult.confidence > 0;
        if (testResult.confidence === 0) allHealthy = false;
      } catch (error) {
        adapterStatus[domain] = false;
        allHealthy = false;
      }
    }

    const status =
      allHealthy ? 'healthy' :
      Object.values(adapterStatus).some(v => v) ? 'degraded' :
      'unhealthy';

    return {
      status,
      adapters: adapterStatus,
      message:
        status === 'healthy' ? 'All adapters operational' :
        status === 'degraded' ? 'Some adapters offline, using fallback' :
        'All adapters offline, using Claude fallback only',
    };
  }
}

/**
 * Staged rollout helper
 */
export interface RolloutStage {
  stage_number: number;
  traffic_percentage: number;
  duration_days: number;
  canary_enabled: boolean;
}

export const PRODUCTION_ROLLOUT_STAGES: RolloutStage[] = [
  { stage_number: 1, traffic_percentage: 10, duration_days: 1, canary_enabled: true },
  { stage_number: 2, traffic_percentage: 25, duration_days: 1, canary_enabled: true },
  { stage_number: 3, traffic_percentage: 50, duration_days: 1, canary_enabled: true },
  { stage_number: 4, traffic_percentage: 75, duration_days: 1, canary_enabled: true },
  { stage_number: 5, traffic_percentage: 100, duration_days: 0, canary_enabled: false },
];
