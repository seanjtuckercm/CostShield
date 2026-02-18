/**
 * Cost Calculator for OpenAI API requests
 * Implements cost calculation using model pricing table
 * Reference: Section 7.2 of COSTSHIELD_CLOUD_REQUIREMENTS.md
 */

import { createClient } from '@supabase/supabase-js';

export interface ModelPricing {
  model_name: string;
  provider: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

/**
 * Calculate cost for a request based on tokens and model
 */
export async function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<number> {
  // Get pricing from database
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: pricing, error } = await supabase
    .from('model_pricing')
    .select('input_price_per_million, output_price_per_million')
    .eq('model_name', model)
    .eq('provider', 'openai')
    .eq('is_active', true)
    .single();

  if (error || !pricing) {
    // Fallback to hardcoded pricing if database lookup fails
    console.warn(`Pricing not found for model ${model}, using fallback pricing`);
    return calculateCostFallback(model, inputTokens, outputTokens);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input_price_per_million;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_price_per_million;
  
  const totalCost = inputCost + outputCost;
  
  // Round to 6 decimal places (as per database schema)
  return Number(totalCost.toFixed(6));
}

/**
 * Fallback pricing if database lookup fails
 * Pricing per 1M tokens (USD) as of 2026
 */
function calculateCostFallback(model: string, inputTokens: number, outputTokens: number): number {
  const PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': {
      input: 2.50,
      output: 10.00,
    },
    'gpt-4o-mini': {
      input: 0.15,
      output: 0.60,
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00,
    },
    'gpt-4': {
      input: 30.00,
      output: 60.00,
    },
    'gpt-3.5-turbo': {
      input: 0.50,
      output: 1.50,
    },
    'text-embedding-3-small': {
      input: 0.02,
      output: 0.00,
    },
    'text-embedding-3-large': {
      input: 0.13,
      output: 0.00,
    },
  };

  const pricing = PRICING[model];
  
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  const totalCost = inputCost + outputCost;
  
  return Number(totalCost.toFixed(6));
}

/**
 * Estimate cost before making the request
 * Uses max_tokens to estimate worst-case cost
 */
export async function estimateCost(
  model: string,
  inputTokens: number,
  maxTokens: number,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<number> {
  // Estimate output tokens as max_tokens (worst case)
  return calculateCost(model, inputTokens, maxTokens, supabaseUrl, supabaseAnonKey);
}
