/**
 * Budget Progress Component
 * Visual progress gauge showing budget spent vs remaining
 * Reference: Section 22 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BudgetProgressProps {
  spent: number;
  limit: number;
  periodType?: string;
  budgetName?: string;
}

export function BudgetProgress({ spent, limit, periodType = 'monthly', budgetName }: BudgetProgressProps) {
  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  // Color logic: Green (<70%), Yellow (70-90%), Red (>90%)
  const getColorClass = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Status</CardTitle>
        <CardDescription>
          {budgetName || 'Default Budget'} ({periodType})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Large Spent vs Remaining Display */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600">Spent</span>
            <span className={`text-3xl font-bold ${getTextColor()}`}>
              ${spent.toFixed(2)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600">Remaining</span>
            <span className={`text-2xl font-semibold ${remaining >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-3"
          />
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${getColorClass()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Budget */}
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Budget</span>
            <span className="font-semibold">${limit.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
