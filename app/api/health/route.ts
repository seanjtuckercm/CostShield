/**
 * Health Check Endpoint
 * Simple endpoint to verify API is running
 * Used for monitoring and launch verification
 */

export const dynamic = 'force-dynamic'; // Health check should always be dynamic

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CostShield Cloud',
    version: '1.0.0',
  });
}
