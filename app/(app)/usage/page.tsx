/**
 * Usage Analytics Page
 * Full analytics dashboard with charts and request logs
 * Reference: Section 25 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UsageChart } from '@/components/app/usage/usage-chart';
import { CostBreakdownChart } from '@/components/app/usage/cost-breakdown-chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UsageSummary {
  totalSpend: number;
  totalRequests: number;
  totalTokens: number;
  averageCostPerRequest: number;
}

interface TimeSeriesPoint {
  date: string;
  cost: number;
}

interface CostBreakdown {
  model: string;
  cost: number;
}

interface UsageLog {
  id: string;
  model: string;
  endpoint: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  status_code: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modelFilter, setModelFilter] = useState('');

  useEffect(() => {
    fetchUsageData();
  }, [period]);

  useEffect(() => {
    fetchLogs();
  }, [page, modelFilter]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      // Fetch summary and time series
      const usageResponse = await fetch(`/api/usage?period=${period}`);
      if (!usageResponse.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const usageData = await usageResponse.json();
      setSummary(usageData.summary);
      setTimeSeries(usageData.timeSeries);

      // Fetch breakdown
      const breakdownResponse = await fetch(`/api/usage/breakdown?period=${period}`);
      if (!breakdownResponse.ok) {
        throw new Error('Failed to fetch cost breakdown');
      }
      const breakdownData = await breakdownResponse.json();
      setBreakdown(breakdownData.breakdown);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (modelFilter) {
        params.append('model', modelFilter);
      }

      const response = await fetch(`/api/usage/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage logs');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(2)}K`;
    }
    return tokens.toString();
  };

  if (loading && !summary) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 text-gray-500">Loading usage data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage Analytics</h1>
        <p className="text-gray-600 mt-2">
          Track your API usage, costs, and request history
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center space-x-4">
        <Label>Period:</Label>
        <Button
          variant={period === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('7d')}
        >
          7 Days
        </Button>
        <Button
          variant={period === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('30d')}
        >
          30 Days
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCost(summary.totalSpend) : '$0.00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalRequests.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatTokens(summary.totalTokens) : '0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Avg Cost/Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCost(summary.averageCostPerRequest) : '$0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend</CardTitle>
            <CardDescription>Cost over time</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeries.length > 0 ? (
              <UsageChart data={timeSeries} period={period} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>Distribution of spending</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdown.length > 0 ? (
              <CostBreakdownChart data={breakdown} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request History</CardTitle>
              <CardDescription>Detailed log of all API requests</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Filter by model..."
                value={modelFilter}
                onChange={(e) => {
                  setModelFilter(e.target.value);
                  setPage(1);
                }}
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 mb-4">
              {error}
            </div>
          )}
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No usage logs yet. Start making requests to see them here.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Timestamp</TableHead>
                      <TableHead className="min-w-[120px]">Model</TableHead>
                      <TableHead className="min-w-[100px]">Endpoint</TableHead>
                      <TableHead className="min-w-[120px]">Tokens</TableHead>
                      <TableHead className="min-w-[80px]">Cost</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">{log.model}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{log.endpoint}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatTokens(log.total_tokens)}
                          <span className="text-gray-500 ml-1 hidden sm:inline">
                            ({formatTokens(log.prompt_tokens)}/{formatTokens(log.completion_tokens)})
                          </span>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{formatCost(log.cost)}</TableCell>
                        <TableCell>
                        <Badge
                          variant={
                            log.status_code >= 200 && log.status_code < 300
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
