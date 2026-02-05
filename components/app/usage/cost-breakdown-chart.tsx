/**
 * Cost Breakdown Chart Component
 * Pie chart showing cost distribution by model
 * Reference: Section 25 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CostBreakdownChartProps {
  data: Array<{ model: string; cost: number }>;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  // Format cost for tooltip
  const formatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  // Calculate percentage
  const total = data.reduce((sum, item) => sum + item.cost, 0);
  const dataWithPercentage = data.map((item) => ({
    ...item,
    percentage: total > 0 ? ((item.cost / total) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithPercentage}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.model}: ${entry.percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="cost"
          >
            {dataWithPercentage.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | undefined) => formatCost(value || 0)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
