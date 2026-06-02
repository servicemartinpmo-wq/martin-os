/**
 * Base Adapter Interface
 * Foundation for all 4 specialized adapters (Support, Code, Automation, Business)
 * Implements training, evaluation, and deployment lifecycle
 */

export type AdapterDomain = 'support' | 'code' | 'automation' | 'business';

export interface AdapterConfig {
  domain: AdapterDomain;
  model_type: 'llama_2_7b' | 'mistral_7b' | 'neural_net';
  model_name: string;
  batch_size: number;
  learning_rate: number;
  epochs: number;
  warmup_steps: number;
}

export interface TrainingExample {
  input: string;
  output: string;
  domain: AdapterDomain;
  confidence?: number;
  source: 'production' | 'synthetic' | 'feedback';
  tags?: string[];
}

export interface TrainingDataset {
  domain: AdapterDomain;
  real_examples: TrainingExample[];
  synthetic_examples: TrainingExample[];
  total_count: number;
  created_at: Date;
}

export interface AdapterMetrics {
  accuracy: number;         // 0-100%
  precision: number;        // 0-100%
  recall: number;          // 0-100%
  f1_score: number;        // 0-100%
  latency_p50_ms: number;  // Median latency
  latency_p95_ms: number;  // 95th percentile latency
  inference_cost_cents: number;
}

export interface EvaluationResult {
  adapter: AdapterDomain;
  version: string;
  metrics: AdapterMetrics;
  holdout_test_size: number;
  passed: boolean;          // true if meets success criteria
  comparison?: {
    previous_version?: {
      accuracy: number;
      version: string;
    };
    improvement_pct?: number;
    claude_baseline_accuracy?: number;
    vs_claude_delta?: number;
  };
  failures?: {
    example: TrainingExample;
    predicted: string;
    confidence: number;
  }[];
  created_at: Date;
}

export interface AdapterVersion {
  adapter: AdapterDomain;
  version: string;
  model_path: string;
  config: AdapterConfig;
  training_date: Date;
  evaluation_result: EvaluationResult;
  status: 'training' | 'evaluating' | 'passed' | 'failed' | 'deployed';
  deployed_at?: Date;
  deployment_stage?: 'staging' | 'production';
}

export interface PredictionResult {
  input: string;
  output: string;
  confidence: number;  // 0-1
  tokens_used: number;
  latency_ms: number;
  model_version: string;
}

/**
 * Base class for all adapters
 */
export class BaseAdapter {
  config: AdapterConfig;
  dataset?: TrainingDataset;
  currentVersion?: AdapterVersion;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * Load training data from learning records
   */
  async loadTrainingData(examples: TrainingExample[]): Promise<TrainingDataset> {
    const realExamples = examples.filter(e => e.source === 'production');
    const syntheticExamples = examples.filter(e => e.source === 'synthetic');

    this.dataset = {
      domain: this.config.domain,
      real_examples: realExamples,
      synthetic_examples: syntheticExamples,
      total_count: examples.length,
      created_at: new Date(),
    };

    return this.dataset;
  }

  /**
   * Train the adapter (to be implemented by specific adapters)
   */
  async train(): Promise<AdapterVersion> {
    throw new Error('train() must be implemented by subclass');
  }

  /**
   * Evaluate the trained adapter
   */
  async evaluate(testSet: TrainingExample[]): Promise<EvaluationResult> {
    throw new Error('evaluate() must be implemented by subclass');
  }

  /**
   * Make a prediction
   */
  async predict(input: string): Promise<PredictionResult> {
    throw new Error('predict() must be implemented by subclass');
  }

  /**
   * Deploy to production
   */
  async deployToProduction(): Promise<void> {
    if (!this.currentVersion || this.currentVersion.status !== 'passed') {
      throw new Error('Cannot deploy: version not evaluated and passed');
    }

    this.currentVersion.status = 'deployed';
    this.currentVersion.deployment_stage = 'production';
    this.currentVersion.deployed_at = new Date();
  }

  /**
   * Deploy to staging for testing
   */
  async deployToStaging(): Promise<void> {
    if (!this.currentVersion || this.currentVersion.status !== 'passed') {
      throw new Error('Cannot deploy to staging: version not evaluated and passed');
    }

    this.currentVersion.status = 'deployed';
    this.currentVersion.deployment_stage = 'staging';
    this.currentVersion.deployed_at = new Date();
  }

  /**
   * Rollback to previous version
   */
  async rollback(previousVersion: AdapterVersion): Promise<void> {
    this.currentVersion = previousVersion;
    this.currentVersion.status = 'deployed';
  }
}

/**
 * Success criteria for each adapter
 */
export const ADAPTER_SUCCESS_CRITERIA: Record<AdapterDomain, {
  accuracy: number;
  latency_ms: number;
  cost_per_request_cents: number;
}> = {
  support: {
    accuracy: 85,
    latency_ms: 500,
    cost_per_request_cents: 0.01,
  },
  code: {
    accuracy: 82,
    latency_ms: 1000,
    cost_per_request_cents: 0.02,
  },
  automation: {
    accuracy: 88,
    latency_ms: 300,
    cost_per_request_cents: 0.015,
  },
  business: {
    accuracy: 80,
    latency_ms: 2000,
    cost_per_request_cents: 0.02,
  },
};

/**
 * Data volume targets for each adapter
 */
export const ADAPTER_DATA_TARGETS: Record<AdapterDomain, {
  real_examples: number;
  synthetic_multiplier: number;
  total_target: number;
}> = {
  support: {
    real_examples: 200,
    synthetic_multiplier: 1.5,
    total_target: 500,
  },
  code: {
    real_examples: 150,
    synthetic_multiplier: 2,
    total_target: 450,
  },
  automation: {
    real_examples: 200,
    synthetic_multiplier: 1.5,
    total_target: 500,
  },
  business: {
    real_examples: 150,
    synthetic_multiplier: 1,
    total_target: 300,
  },
};
