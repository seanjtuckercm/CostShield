/**
 * Pricing Calculator Component
 * Developer-focused cost estimation tool
 */

'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Calculator } from 'lucide-react';

export function PricingCalculator() {
  const [requests, setRequests] = useState([50000]);
  
  const requestCount = requests?.[0] ?? 0;

  const getTier = (count: number) => {
    if (count <= 10000) return { name: 'Free', price: 0, included: 10000 };
    if (count <= 100000) return { name: 'Starter', price: 15, included: 100000 };
    if (count <= 500000) return { name: 'Professional', price: 49, included: 500000 };
    return { name: 'Enterprise', price: 299, included: 1000000 };
  };

  const tier = getTier(requestCount);
  const costPerRequest = tier?.included ? (tier?.price / tier?.included) : 0;

  return (
    <div className="card-terminal">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="h-4 w-4 text-dev-accent" />
        <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">Cost Calculator</span>
      </div>

      <div className="space-y-6">
        {/* Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dev-muted">Monthly requests</span>
            <span className="font-mono text-dev-accent">
              {requestCount?.toLocaleString() ?? '0'}
            </span>
          </div>
          <Slider
            value={requests}
            onValueChange={setRequests}
            max={600000}
            step={10000}
            min={10000}
            className="[&_[role=slider]]:bg-dev-accent [&_[role=slider]]:border-dev-accent [&_.bg-primary]:bg-dev-accent"
          />
          <div className="flex justify-between text-xs text-dev-muted font-mono">
            <span>10K</span>
            <span>100K</span>
            <span>500K</span>
            <span>600K+</span>
          </div>
        </div>

        {/* Result */}
        <div className="pt-4 border-t border-dev-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dev-muted">Recommended tier</span>
            <span className="font-mono text-dev-text font-semibold">{tier?.name ?? 'Free'}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-dev-muted">Monthly cost</span>
            <span className="font-mono text-dev-accent text-2xl">${tier?.price ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dev-muted">Cost per request</span>
            <span className="font-mono text-dev-muted text-sm">
              ${costPerRequest?.toFixed(6) ?? '0.000000'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
