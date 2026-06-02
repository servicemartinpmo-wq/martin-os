/**
 * Synthetic Data Generator
 * Uses Gemini API to create variations of training examples
 * Multiplies training data 1.5-2x for better model generalization
 * Weeks 5-12: ~$90 Gemini budget for synthetic data
 */

import { TrainingExample, AdapterDomain } from './base_adapter';

export interface GenerationPrompt {
  domain: AdapterDomain;
  original_example: TrainingExample;
  variation_type: 'rephrase' | 'edge_case' | 'language_variant' | 'complexity_variation';
  additional_context?: string;
}

export interface GenerationResult {
  original: TrainingExample;
  variations: TrainingExample[];
  total_cost_cents: number;
}

export class SyntheticDataGenerator {
  api_key: string;
  total_cost_cents: number = 0;

  constructor(api_key: string) {
    this.api_key = api_key;
  }

  /**
   * Generate variations for a single training example
   */
  async generateVariations(
    example: TrainingExample,
    count: number = 3
  ): Promise<GenerationResult> {
    const variations: TrainingExample[] = [];

    // In real implementation, call Gemini API
    // For now, placeholder that shows structure

    const prompts: GenerationPrompt[] = [
      {
        domain: example.domain,
        original_example: example,
        variation_type: 'rephrase',
        additional_context: 'Rephrase with different wording but same meaning',
      },
      {
        domain: example.domain,
        original_example: example,
        variation_type: 'edge_case',
        additional_context: 'Create an edge case variation',
      },
      {
        domain: example.domain,
        original_example: example,
        variation_type: 'complexity_variation',
        additional_context: 'Create a more complex variation',
      },
    ];

    for (const prompt of prompts.slice(0, count)) {
      const variation = await this.generateSingleVariation(prompt);
      variations.push(variation);
    }

    // Calculate cost: Gemini pricing ~$0.00001 per input token, $0.00003 per output token
    // Estimate: 200 input tokens, 300 output tokens per variation
    const estimatedCost = count * ((200 * 0.00001 + 300 * 0.00003) * 100); // Convert to cents
    this.total_cost_cents += estimatedCost;

    return {
      original: example,
      variations,
      total_cost_cents: estimatedCost,
    };
  }

  /**
   * Generate variations for a batch of examples
   */
  async generateBatch(
    examples: TrainingExample[],
    variations_per_example: number = 1.5 // 150% data augmentation
  ): Promise<TrainingExample[]> {
    const allVariations: TrainingExample[] = [];

    // Process in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < examples.length; i += batchSize) {
      const batch = examples.slice(i, i + batchSize);

      const variationPromises = batch.map(ex =>
        this.generateVariations(ex, Math.ceil(variations_per_example))
      );

      const results = await Promise.all(variationPromises);

      for (const result of results) {
        allVariations.push(...result.variations);
      }
    }

    console.log(
      `Generated ${allVariations.length} synthetic examples from ${examples.length} real examples (${((allVariations.length / examples.length) * 100).toFixed(1)}% expansion)`
    );

    return allVariations;
  }

  /**
   * Generate a single variation
   * In real implementation, this calls Gemini API
   */
  private async generateSingleVariation(prompt: GenerationPrompt): Promise<TrainingExample> {
    // Placeholder implementation
    // Real implementation would:
    // 1. Call Gemini API with specific prompt for the domain
    // 2. Parse the response
    // 3. Return a new TrainingExample

    // For now, return a mock variation
    return {
      input: `[SYNTHETIC] ${prompt.original_example.input}`,
      output: prompt.original_example.output,
      domain: prompt.domain,
      source: 'synthetic',
      confidence: 0.9,
      tags: [
        ...(prompt.original_example.tags || []),
        `variation_${prompt.variation_type}`,
      ],
    };
  }

  /**
   * Get total cost of generation
   */
  getTotalCost(): number {
    return this.total_cost_cents;
  }

  /**
   * Get cost breakdown by domain
   */
  generateDomainTemplates(): Record<string, string> {
    return {
      support: `You are a support triage AI. Given a support ticket, create 3 variations:
1. Same problem, different wording
2. Edge case: customer is angry or confused
3. Multilingual: problem stated in simpler English

Format each as:
INPUT: [variation]
OUTPUT: [triage result - category, priority, handler]`,

      code: `You are a code review AI. Given a code problem, create 3 variations:
1. Same bug, different language or framework
2. More complex version of the same bug
3. Simplified version with same core issue

Format each as:
INPUT: [variation]
OUTPUT: [fix recommendation]`,

      automation: `You are a workflow automation AI. Given a workflow, create 3 variations:
1. Same workflow with different systems
2. More complex version with more integrations
3. Similar workflow pattern but different domain

Format each as:
INPUT: [workflow description]
OUTPUT: [workflow steps]`,

      business: `You are a business intelligence AI. Given a decision, create 3 variations:
1. Same decision, different context
2. Edge case: conflicting constraints
3. Different scale: team → company level

Format each as:
INPUT: [business problem]
OUTPUT: [recommendation]`,
    };
  }
}

/**
 * Data augmentation strategies by domain
 */
export const AUGMENTATION_STRATEGIES: Record<AdapterDomain, {
  primary_strategy: 'rephrase' | 'edge_case' | 'complexity';
  secondary_strategies: string[];
  target_expansion_ratio: number;
}> = {
  support: {
    primary_strategy: 'rephrase',
    secondary_strategies: ['edge_case', 'language_variant'],
    target_expansion_ratio: 1.5,
  },
  code: {
    primary_strategy: 'complexity',
    secondary_strategies: ['rephrase', 'edge_case'],
    target_expansion_ratio: 2.0,
  },
  automation: {
    primary_strategy: 'complexity',
    secondary_strategies: ['rephrase', 'edge_case'],
    target_expansion_ratio: 1.5,
  },
  business: {
    primary_strategy: 'rephrase',
    secondary_strategies: ['edge_case'],
    target_expansion_ratio: 1.0,
  },
};
