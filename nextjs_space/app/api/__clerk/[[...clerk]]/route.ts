import { NextRequest, NextResponse } from 'next/server';

const CLERK_FRONTEND_API = 'https://frontend-api.clerk.dev';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  
  // Remove /__clerk prefix to get the actual Clerk API path
  const clerkPath = url.pathname.replace(/^\/api\/__clerk/, '');
  
  // Build the target URL
  const targetUrl = `${CLERK_FRONTEND_API}${clerkPath}${url.search}`;
  
  // Get client IP
  const forwardedFor = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
  
  // Clone headers and add required Clerk proxy headers
  const headers = new Headers(req.headers);
  headers.set('Clerk-Proxy-Url', `${process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev'}/__clerk`);
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');
  headers.set('X-Forwarded-For', forwardedFor);
  
  // Remove host header to avoid conflicts
  headers.delete('host');
  
  try {
    // Forward the request to Clerk
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
    });
    
    // Clone response headers
    const responseHeaders = new Headers(response.headers);
    
    // Return the response from Clerk
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Clerk proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Clerk' },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
