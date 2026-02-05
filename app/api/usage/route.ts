/**
 * Usage Analytics API Route
 * Aggregates usage data from usage_logs table
 * Reference: Section 25 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/usage
 * Returns aggregated usage statistics and time series data
 * Query params:
 *   - period: '7d' | '30d' (default: '30d')
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get period from query params
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const days = period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate statistics
    const { data: stats, error: statsError } = await supabase
      .from('usage_logs')
      .select('cost, prompt_tokens, completion_tokens, total_tokens')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (statsError) {
      console.error('Error fetching usage stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch usage statistics' }, { status: 500 });
    }

    // Calculate totals
    const totalSpend = stats?.reduce((sum, log) => sum + Number(log.cost || 0), 0) || 0;
    const totalRequests = stats?.length || 0;
    const totalTokens = stats?.reduce((sum, log) => sum + Number(log.total_tokens || 0), 0) || 0;
    const averageCostPerRequest = totalRequests > 0 ? totalSpend / totalRequests : 0;

    // Get daily time series data
    const { data: dailyData, error: dailyError } = await supabase
      .from('usage_logs')
      .select('created_at, cost')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (dailyError) {
      console.error('Error fetching daily data:', dailyError);
      return NextResponse.json({ error: 'Failed to fetch daily data' }, { status: 500 });
    }

    // Group by date
    const dailyMap = new Map<string, number>();
    dailyData?.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || 0;
      dailyMap.set(date, existing + Number(log.cost || 0));
    });

    // Convert to array format for chart
    const timeSeries = Array.from(dailyMap.entries())
      .map(([date, cost]) => ({
        date,
        cost: Number(cost.toFixed(6)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fill in missing dates with 0
    const filledTimeSeries = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = timeSeries.find((ts) => ts.date === dateStr);
      filledTimeSeries.push({
        date: dateStr,
        cost: existing?.cost || 0,
      });
    }

    return NextResponse.json({
      summary: {
        totalSpend: Number(totalSpend.toFixed(6)),
        totalRequests,
        totalTokens,
        averageCostPerRequest: Number(averageCostPerRequest.toFixed(6)),
      },
      timeSeries: filledTimeSeries,
    });
  } catch (error: any) {
    console.error('Error in GET /api/usage:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
