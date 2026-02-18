/**
 * Usage Chart Component
 * Line chart showing daily spend over time
 * Reference: Section 25 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UsageChartProps {
  data: Array<{ date: string; cost: number }>;
  period?: '7d' | '30d';
}

export function UsageChart({ data, period = '30d' }: UsageChartProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format cost for tooltip
  const formatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-xs"
            stroke="#6B7280"
          />
          <YAxis
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            className="text-xs"
            stroke="#6B7280"
          />
          <Tooltip
            formatter={(value: number | undefined) => formatCost(value || 0)}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 3 }}
            name="Daily Spend"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
