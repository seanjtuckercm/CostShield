/**
 * Budget Progress Component
 * Terminal-style budget tracking display
 */

import { Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface BudgetProgressProps {
  spent: number;
  limit: number;
  periodType?: string;
  budgetName?: string;
}

export function BudgetProgress({ spent, limit, periodType = 'monthly', budgetName }: BudgetProgressProps) {
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - spent, 0);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const getStatusColor = () => {
    if (isCritical) return 'text-red-500';
    if (isWarning) return 'text-yellow-500';
    return 'text-dev-accent';
  };

  const getBarColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-dev-accent';
  };

  if (limit === 0) {
    return (
      <div className="card-terminal">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-dev-muted" />
            <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">Budget</span>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-dev-muted text-sm">
            No budget configured. Using default $1.00 limit.
          </p>
          <Link 
            href="/billing"
            className="inline-flex items-center gap-2 text-sm text-dev-accent hover:underline font-mono"
          >
            Configure budget →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-terminal">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${getStatusColor()}`} />
          <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">
            {budgetName ?? `${periodType} budget`}
          </span>
        </div>
        {(isWarning || isCritical) && (
          <AlertTriangle className={`h-4 w-4 ${getStatusColor()}`} />
        )}
      </div>

      <div className="space-y-4">
        {/* Spend vs Limit */}
        <div className="flex items-baseline gap-2">
          <span className={`stat-value ${getStatusColor()}`}>
            ${spent?.toFixed(2) ?? '0.00'}
          </span>
          <span className="text-dev-muted font-mono text-sm">
            / ${limit?.toFixed(2) ?? '0.00'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-dev-bg rounded-sm overflow-hidden">
            <div 
              className={`h-full ${getBarColor()} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-dev-muted">{percentage?.toFixed(1) ?? '0.0'}% used</span>
            <span className="text-dev-muted">${remaining?.toFixed(2) ?? '0.00'} remaining</span>
          </div>
        </div>

        {/* Status Message */}
        {isCritical && (
          <div className="flex items-center gap-2 text-xs text-red-500 font-mono bg-red-500/10 px-3 py-2 rounded-sm">
            <span>⚠</span>
            <span>Budget nearly exhausted. Requests may be blocked soon.</span>
          </div>
        )}
        {isWarning && !isCritical && (
          <div className="flex items-center gap-2 text-xs text-yellow-500 font-mono bg-yellow-500/10 px-3 py-2 rounded-sm">
            <span>!</span>
            <span>Approaching budget limit. Consider increasing your budget.</span>
          </div>
        )}
      </div>
    </div>
  );
}
