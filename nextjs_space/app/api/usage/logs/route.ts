/**
 * Usage Logs API Route
 * Returns paginated raw log records
 * Reference: Section 25 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/usage/logs
 * Returns paginated usage log records
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: records per page (default: 50, max: 100)
 *   - model: filter by model name (optional)
 *   - startDate: filter by start date (ISO string, optional)
 *   - endDate: filter by end date (ISO string, optional)
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

    // Get query params
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const model = searchParams.get('model');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('usage_logs')
      .select('id, model, endpoint, prompt_tokens, completion_tokens, total_tokens, cost, status_code, duration_ms, error_message, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (model) {
      query = query.eq('model', model);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('Error fetching usage logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch usage logs' }, { status: 500 });
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/usage/logs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
