/**
 * Test Proxy Connection Endpoint
 * Simple endpoint to verify CostShield API key and proxy connectivity
 * Returns 200 OK if valid API key is provided
 */

export const dynamic = 'force-dynamic'; // This route uses headers, must be dynamic

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "
    const keyHash = hashApiKey(apiKey);

    const supabase = getAdminSupabaseClient();
    const { data: apiKeyRecord, error } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (error || !apiKeyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!apiKeyRecord.is_active) {
      return NextResponse.json(
        { error: 'API key is inactive' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Connection Successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Test proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
