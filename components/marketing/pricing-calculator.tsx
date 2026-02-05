/**
 * Budget Calculator Widget
 * Interactive calculator for estimating costs
 * Reference: Section 5.2 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Model pricing (per million tokens)
const MODEL_PRICING: { [key: string]: { input: number; output: number } } = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

function getRecommendedTier(requests: number): string {
  if (requests <= 10000) return 'Free';
  if (requests <= 100000) return 'Starter';
  if (requests <= 500000) return 'Pro';
  return 'Enterprise';
}

function getTierPrice(tier: string): number {
  const prices: { [key: string]: number } = {
    Free: 0,
    Starter: 15,
    Pro: 49,
    Enterprise: 299,
  };
  return prices[tier] || 0;
}

export function PricingCalculator() {
  const [monthlyRequests, setMonthlyRequests] = useState([50000]);
  const [avgTokens, setAvgTokens] = useState([1000]);
  const [model, setModel] = useState('gpt-4o');

  const requests = monthlyRequests[0];
  const tokens = avgTokens[0];
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];

  // Calculate OpenAI cost
  // Assume 50/50 split between input and output tokens
  const inputTokens = (requests * tokens) / 2;
  const outputTokens = (requests * tokens) / 2;
  const openaiCost = (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;

  // Get recommended tier
  const recommendedTier = getRecommendedTier(requests);
  const costshieldCost = getTierPrice(recommendedTier);

  // Calculate potential savings (30% optimization potential)
  const potentialSavings = openaiCost * 0.3;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculate Your Costs</CardTitle>
        <CardDescription>Estimate your monthly cost based on expected usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Requests Slider */}
        <div className="space-y-2">
          <Label>How many API requests per month?</Label>
          <Slider
            min={1000}
            max={1000000}
            step={1000}
            value={monthlyRequests}
            onValueChange={setMonthlyRequests}
            className="mt-2"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>1K</span>
            <span className="font-medium">{requests.toLocaleString()} requests/month</span>
            <span>1M</span>
          </div>
        </div>

        {/* Average Tokens Slider */}
        <div className="space-y-2">
          <Label>Average tokens per request?</Label>
          <Slider
            min={100}
            max={10000}
            step={100}
            value={avgTokens}
            onValueChange={setAvgTokens}
            className="mt-2"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>100</span>
            <span className="font-medium">{tokens.toLocaleString()} tokens/request</span>
            <span>10K</span>
          </div>
        </div>

        {/* Model Selector */}
        <div className="space-y-2">
          <Label>Which model do you primarily use?</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Estimated OpenAI Cost</p>
            <p className="text-2xl font-bold">${openaiCost.toFixed(2)}/mo</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">CostShield Subscription</p>
            <p className="text-xl font-semibold">
              ${costshieldCost}/mo ({recommendedTier})
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-3xl font-bold text-green-600">
              ${(openaiCost + costshieldCost).toFixed(2)}/mo
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ${openaiCost.toFixed(2)} OpenAI + ${costshieldCost} CostShield
            </p>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">
              💡 CostShield could save you up to ${potentialSavings.toFixed(2)}/mo (30% savings) through optimization insights.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
