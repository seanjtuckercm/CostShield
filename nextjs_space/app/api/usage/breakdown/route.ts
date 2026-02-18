/**
 * Cost Breakdown API Route
 * Returns cost breakdown by model for pie chart
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/usage/breakdown
 * Returns cost breakdown by model
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

    // Get usage logs grouped by model
    const { data: logs, error: logsError } = await supabase
      .from('usage_logs')
      .select('model, cost')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (logsError) {
      console.error('Error fetching breakdown:', logsError);
      return NextResponse.json({ error: 'Failed to fetch cost breakdown' }, { status: 500 });
    }

    // Group by model and sum costs
    const modelMap = new Map<string, number>();
    logs?.forEach((log) => {
      const model = log.model;
      const existing = modelMap.get(model) || 0;
      modelMap.set(model, existing + Number(log.cost || 0));
    });

    // Convert to array and sort by cost descending
    const breakdown = Array.from(modelMap.entries())
      .map(([model, cost]) => ({
        model,
        cost: Number(cost.toFixed(6)),
      }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({ breakdown });
  } catch (error: any) {
    console.error('Error in GET /api/usage/breakdown:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
